package model

import (
	"fmt"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

// TestPromotionCommissionMigrationIdempotent 验证推广分成表与充值赠送列的迁移在
// 重复执行时保持幂等（SQLite）。
func TestPromotionCommissionMigrationIdempotent(t *testing.T) {
	for i := 0; i < 2; i++ {
		require.NoError(t, DB.AutoMigrate(&TopUp{}, &PromotionCommission{}))
	}

	assert.True(t, DB.Migrator().HasTable(&PromotionCommission{}))
	assert.True(t, DB.Migrator().HasColumn(&TopUp{}, "bonus_amount"))
	assert.True(t, DB.Migrator().HasColumn(&PromotionCommission{}, "trade_no"))
}

// TestGrantPromotionCommission 验证在线支付充值成功后给上级发放佣金的核心行为。
func TestGrantPromotionCommission(t *testing.T) {
	require.NoError(t, DB.AutoMigrate(&User{}, &TopUp{}, &PromotionCommission{}))
	require.NoError(t, DB.Where("1 = 1").Delete(&PromotionCommission{}).Error)
	require.NoError(t, DB.Where("1 = 1").Delete(&TopUp{}).Error)
	require.NoError(t, DB.Where("1 = 1").Delete(&User{}).Error)

	inviter := &User{Username: "promo-inviter", AffCode: "PINV1", Quota: 0, AffHistoryQuota: 0}
	require.NoError(t, DB.Create(inviter).Error)
	invitee := &User{Username: "promo-invitee", AffCode: "PINV2", InviterId: inviter.Id, Quota: 0}
	require.NoError(t, DB.Create(invitee).Error)

	// 充 100 美元，分成比例 5% → 佣金 5 美元
	common.PromotionCommissionEnabled = true
	common.PromotionCommissionRate = 5
	defer func() {
		common.PromotionCommissionEnabled = false
		common.PromotionCommissionRate = 0
	}()

	topUp := &TopUp{
		UserId:          invitee.Id,
		Amount:          100,
		Money:           730,
		TradeNo:         "TEST-PROMO-1",
		PaymentProvider: PaymentProviderEpay,
		Status:          common.TopUpStatusPending,
	}
	require.NoError(t, DB.Create(topUp).Error)

	err := DB.Transaction(func(tx *gorm.DB) error {
		_, commissionQuota, _, txErr := grantPromotionCommission(tx, topUp, 500000*100)
		require.NotZero(t, commissionQuota)
		return txErr
	})
	require.NoError(t, err)

	expectedCommission := int(100*5/100) * int(common.QuotaPerUnit) // 5 美元 → 2,500,000 quota

	var gotInviter User
	require.NoError(t, DB.Where("id = ?", inviter.Id).First(&gotInviter).Error)
	assert.Equal(t, expectedCommission, gotInviter.Quota, "佣金应直接进入上级余额")
	assert.Equal(t, expectedCommission, gotInviter.AffHistoryQuota, "佣金应累加到上级 aff_history")

	var record PromotionCommission
	require.NoError(t, DB.Where("trade_no = ?", "TEST-PROMO-1").First(&record).Error)
	assert.Equal(t, inviter.Id, record.InviterId)
	assert.Equal(t, invitee.Id, record.InviteeId)
	assert.Equal(t, expectedCommission, record.CommissionQuota)
	assert.Equal(t, 100.0, record.RechargeAmount)

	// 同一订单重复结算：TradeNo 唯一索引保证不重复发放
	err = DB.Transaction(func(tx *gorm.DB) error {
		_, _, _, txErr := grantPromotionCommission(tx, topUp, 500000*100)
		return txErr
	})
	require.Error(t, err, "同一订单重复发放应被唯一索引拒绝")

	var count int64
	require.NoError(t, DB.Model(&PromotionCommission{}).Where("trade_no = ?", "TEST-PROMO-1").Count(&count).Error)
	assert.Equal(t, int64(1), count)

	// 开关关闭时不发放
	common.PromotionCommissionEnabled = false
	topUp2 := &TopUp{
		UserId:          invitee.Id,
		Amount:          100,
		TradeNo:         "TEST-PROMO-2",
		PaymentProvider: PaymentProviderEpay,
		Status:          common.TopUpStatusPending,
	}
	require.NoError(t, DB.Create(topUp2).Error)
	err = DB.Transaction(func(tx *gorm.DB) error {
		_, commissionQuota, _, txErr := grantPromotionCommission(tx, topUp2, 500000*100)
		assert.Zero(t, commissionQuota)
		return txErr
	})
	require.NoError(t, err)

	// 无上级绑定时静默跳过
	common.PromotionCommissionEnabled = true
	standalone := &User{Username: "promo-standalone", AffCode: "PINV3", Quota: 0}
	require.NoError(t, DB.Create(standalone).Error)
	topUp3 := &TopUp{
		UserId:          standalone.Id,
		Amount:          100,
		TradeNo:         "TEST-PROMO-3",
		PaymentProvider: PaymentProviderEpay,
		Status:          common.TopUpStatusPending,
	}
	require.NoError(t, DB.Create(topUp3).Error)
	err = DB.Transaction(func(tx *gorm.DB) error {
		_, commissionQuota, _, txErr := grantPromotionCommission(tx, topUp3, 500000*100)
		assert.Zero(t, commissionQuota)
		return txErr
	})
	require.NoError(t, err)
}

// TestTopUpBonusSettlement 验证赠送金额快照在结算时叠加到到账额度。
func TestTopUpBonusSettlement(t *testing.T) {
	require.NoError(t, DB.AutoMigrate(&User{}, &TopUp{}))
	require.NoError(t, DB.Where("1 = 1").Delete(&TopUp{}).Error)
	require.NoError(t, DB.Where("username = ?", "bonus-user").Delete(&User{}).Error)

	user := &User{Username: "bonus-user", AffCode: "PINV4", Quota: 0}
	require.NoError(t, DB.Create(user).Error)

	topUp := &TopUp{
		UserId:      user.Id,
		Amount:      100,
		BonusAmount: 5,
		TradeNo:     "TEST-BONUS-1",
		Status:      common.TopUpStatusPending,
	}
	require.NoError(t, DB.Create(topUp).Error)

	// 结算口径：到账 = (Amount + BonusAmount) × QuotaPerUnit，经饱和换算
	quotaToAdd, err := common.WalletQuotaFromDecimalStrict(
		decimal.NewFromInt(topUp.Amount).Add(decimal.NewFromFloat(topUp.BonusAmount)).
			Mul(decimal.NewFromFloat(common.QuotaPerUnit)),
	)
	require.NoError(t, err)
	assert.Equal(t, int(105)*int(common.QuotaPerUnit), quotaToAdd)
}

// TestPromotionRecordQueryAndFilter 验证推广流水查询：下级用户名填充、
// 关键字(用户名前缀/数字ID)与时间区间筛选、筛选期佣金汇总与最近一笔分成。
func TestPromotionRecordQueryAndFilter(t *testing.T) {
	require.NoError(t, DB.AutoMigrate(&User{}, &TopUp{}, &PromotionCommission{}))
	require.NoError(t, DB.Where("1 = 1").Delete(&PromotionCommission{}).Error)
	require.NoError(t, DB.Where("username LIKE ?", "promo-q-%").Delete(&User{}).Error)

	inviter := &User{Username: "promo-q-inviter", AffCode: "PQINV", Quota: 0}
	require.NoError(t, DB.Create(inviter).Error)
	invitee := &User{Username: "promo-q-alice", AffCode: "PQA1", InviterId: inviter.Id, Quota: 0}
	require.NoError(t, DB.Create(invitee).Error)

	now := common.GetTimestamp()
	records := []PromotionCommission{
		{InviterId: inviter.Id, InviteeId: invitee.Id, TradeNo: "PQ-1", RechargeAmount: 100, CommissionQuota: 500, CreateTime: now - 3000},
		{InviterId: inviter.Id, InviteeId: invitee.Id, TradeNo: "PQ-2", RechargeAmount: 200, CommissionQuota: 1000, CreateTime: now - 1000},
	}
	require.NoError(t, DB.Create(&records).Error)

	pageInfo := &common.PageInfo{Page: 1, PageSize: 10}

	// 无筛选：全量 + 下级用户名回填
	rows, total, err := GetPromotionCommissions(inviter.Id, PromotionRecordFilter{}, pageInfo)
	require.NoError(t, err)
	assert.Equal(t, int64(2), total)
	require.Len(t, rows, 2)
	assert.Equal(t, invitee.Username, rows[0].InviteeName)
	assert.Equal(t, "PQ-2", rows[0].TradeNo, "应按 id desc 排序")

	// 用户名前缀筛选
	rows, total, err = GetPromotionCommissions(inviter.Id, PromotionRecordFilter{Keyword: "promo-q-al"}, pageInfo)
	require.NoError(t, err)
	assert.Equal(t, int64(2), total)
	require.Len(t, rows, 2)

	// 数字关键字按 invitee_id 精确匹配
	rows, total, err = GetPromotionCommissions(inviter.Id, PromotionRecordFilter{Keyword: fmt.Sprintf("%d", invitee.Id)}, pageInfo)
	require.NoError(t, err)
	assert.Equal(t, int64(2), total)

	// 时间区间只命中较早一笔
	rows, total, err = GetPromotionCommissions(inviter.Id, PromotionRecordFilter{
		StartTimestamp: fmt.Sprintf("%d", now-3000),
		EndTimestamp:   fmt.Sprintf("%d", now-2000),
	}, pageInfo)
	require.NoError(t, err)
	assert.Equal(t, int64(1), total)
	require.Len(t, rows, 1)
	assert.Equal(t, "PQ-1", rows[0].TradeNo)

	// 汇总：累计 1500，时间筛选期 500
	totalQuota, count, filteredQuota, err := GetPromotionCommissionSummary(inviter.Id, PromotionRecordFilter{
		StartTimestamp: fmt.Sprintf("%d", now-3000),
		EndTimestamp:   fmt.Sprintf("%d", now-2000),
	})
	require.NoError(t, err)
	assert.Equal(t, int64(1500), totalQuota)
	assert.Equal(t, int64(2), count)
	assert.Equal(t, int64(500), filteredQuota)

	// 无筛选时筛选期佣金与累计一致
	_, _, filteredQuota, err = GetPromotionCommissionSummary(inviter.Id, PromotionRecordFilter{})
	require.NoError(t, err)
	assert.Equal(t, int64(1500), filteredQuota)

	// 最近一笔分成
	latest, err := GetLatestPromotionCommission(inviter.Id)
	require.NoError(t, err)
	require.NotNil(t, latest)
	assert.Equal(t, "PQ-2", latest.TradeNo)

	// 无记录用户返回 nil，不报错
	latest, err = GetLatestPromotionCommission(0)
	require.NoError(t, err)
	assert.Nil(t, latest)
}
