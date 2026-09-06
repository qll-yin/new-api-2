package model

import (
	"errors"
	"fmt"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

// PromotionCommission 推广分成流水：下级用户在线支付充值成功后，按比例给上级的佣金记录。
// 佣金直接进入上级钱包余额（不走 aff_quota 待划转），同时累加 aff_history 作为累计收益统计。
type PromotionCommission struct {
	Id              int     `json:"id"`
	InviterId       int     `json:"inviter_id" gorm:"index;column:inviter_id"`
	InviteeId       int     `json:"invitee_id" gorm:"index;column:invitee_id"`
	TradeNo         string  `json:"trade_no" gorm:"type:varchar(255);uniqueIndex"`
	RechargeAmount  float64 `json:"recharge_amount"`  // 下级本次充值金额（美元/分组调整后美元）
	RechargeQuota   int     `json:"recharge_quota"`   // 下级本次到账额度（quota）
	CommissionQuota int     `json:"commission_quota"` // 上级获得的佣金（quota）
	CreateTime      int64   `json:"create_time"`
}

// grantPromotionCommission 在充值事务内为上级发放推广分成佣金。
// 仅处理在线支付订单（排除订阅的 Amount==0 记账行）；开关关闭、无上级或佣金为 0 时静默跳过。
// 幂等性依赖 TradeNo 唯一索引 + 订单状态在事务内的 pending→success 短路。
// 返回上级 ID、佣金额度与充值基数（未发放时为 0）。事务内不得写全局日志表（会与事务
// 连接争抢连接导致 SQLite 单连接自锁），日志与缓存同步由调用方在事务提交后完成。
func grantPromotionCommission(tx *gorm.DB, topUp *TopUp, rechargeQuota int) (inviterId int, commissionQuota int, base float64, err error) {
	if !common.PromotionCommissionEnabled || common.PromotionCommissionRate <= 0 {
		return 0, 0, 0, nil
	}
	if topUp.Amount == 0 {
		return 0, 0, 0, nil
	}

	// 充值基数：Stripe 订单到账基数是 Money（分组调整后美元），其他网关是 Amount。
	var baseDecimal decimal.Decimal
	if topUp.PaymentProvider == PaymentProviderStripe {
		baseDecimal = decimal.NewFromFloat(topUp.Money)
	} else {
		baseDecimal = decimal.NewFromInt(topUp.Amount)
	}

	commissionQuota, clamp := common.QuotaFromDecimalChecked(
		baseDecimal.Mul(decimal.NewFromFloat(common.PromotionCommissionRate / 100)).Mul(decimal.NewFromFloat(common.QuotaPerUnit)),
	)
	if clamp != nil {
		common.SysError(fmt.Sprintf("promotion commission clamped for trade_no=%s: %s", topUp.TradeNo, clamp.Error()))
	}
	if commissionQuota <= 0 {
		return 0, 0, 0, nil
	}

	var invitee User
	if err := tx.Select("id", "inviter_id").Where("id = ?", topUp.UserId).First(&invitee).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return 0, 0, 0, nil
		}
		return 0, 0, 0, err
	}
	if invitee.InviterId == 0 {
		return 0, 0, 0, nil
	}
	inviterId = invitee.InviterId

	// 上级钱包容量护栏：佣金挤不进去时放弃发放并记录，不阻塞充值事务。
	var inviter User
	if err := tx.Select("id", "quota").Where("id = ?", inviterId).First(&inviter).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return 0, 0, 0, nil
		}
		return 0, 0, 0, err
	}
	if inviter.Quota > common.MaxWalletQuota-commissionQuota {
		common.SysError(fmt.Sprintf("promotion commission skipped (inviter wallet full) trade_no=%s inviter_id=%d commission=%d", topUp.TradeNo, inviterId, commissionQuota))
		return 0, 0, 0, nil
	}

	commission := &PromotionCommission{
		InviterId:       inviterId,
		InviteeId:       topUp.UserId,
		TradeNo:         topUp.TradeNo,
		RechargeAmount:  baseDecimal.InexactFloat64(),
		RechargeQuota:   rechargeQuota,
		CommissionQuota: commissionQuota,
		CreateTime:      common.GetTimestamp(),
	}
	if err := tx.Create(commission).Error; err != nil {
		return 0, 0, 0, err
	}

	// 佣金直接进余额，同时累加 aff_history（累计收益统计）
	result := tx.Model(&User{}).Where("id = ?", inviterId).Updates(map[string]interface{}{
		"quota":       gorm.Expr("quota + ?", commissionQuota),
		"aff_history": gorm.Expr("aff_history + ?", commissionQuota),
	})
	if result.Error != nil {
		return 0, 0, 0, result.Error
	}
	if result.RowsAffected == 0 {
		return 0, 0, 0, gorm.ErrRecordNotFound
	}

	return inviterId, commissionQuota, baseDecimal.InexactFloat64(), nil
}

// recordPromotionCommissionLog 在充值事务提交后为上级写佣金日志。
func recordPromotionCommissionLog(inviterId int, rechargeAmount float64, commissionQuota int, tradeNo string) {
	RecordLog(inviterId, LogTypeSystem, fmt.Sprintf("推广分成：下级用户充值 %.2f，获得佣金 %s（订单号 %s）", rechargeAmount, logger.LogQuota(commissionQuota), tradeNo))
}

func GetPromotionCommissions(inviterId int, pageInfo *common.PageInfo) (commissions []*PromotionCommission, total int64, err error) {
	tx := DB.Model(&PromotionCommission{}).Where("inviter_id = ?", inviterId)
	if err = tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err = tx.Order("id desc").Limit(pageInfo.GetPageSize()).Offset(pageInfo.GetStartIdx()).Find(&commissions).Error
	return commissions, total, err
}

// GetPromotionCommissionSummary 返回上级的累计佣金与分成笔数。
func GetPromotionCommissionSummary(inviterId int) (totalQuota int64, count int64, err error) {
	var summary struct {
		TotalQuota int64 `gorm:"column:total_quota"`
		Count      int64 `gorm:"column:count"`
	}
	err = DB.Model(&PromotionCommission{}).
		Select("COALESCE(SUM(commission_quota), 0) as total_quota, COUNT(*) as count").
		Where("inviter_id = ?", inviterId).
		Scan(&summary).Error
	return summary.TotalQuota, summary.Count, err
}
