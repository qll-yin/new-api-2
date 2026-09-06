package model

import (
	"errors"
	"fmt"
	"strconv"

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
	InviteeName     string  `json:"invitee_name" gorm:"-"` // 下级用户名（查询后批量填充，不入库）
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

// PromotionRecordFilter 推广流水的筛选条件：下级用户（ID 或用户名前缀）与兑换时间区间。
type PromotionRecordFilter struct {
	Keyword        string
	StartTimestamp string
	EndTimestamp   string
}

func applyPromotionRecordFilter(tx *gorm.DB, inviterId int, filter PromotionRecordFilter) *gorm.DB {
	query := tx.Where("inviter_id = ?", inviterId)
	if filter.Keyword != "" {
		if id, err := strconv.Atoi(filter.Keyword); err == nil {
			query = query.Where("invitee_id = ?", id)
		} else {
			query = query.Where(
				"invitee_id IN (?)",
				DB.Model(&User{}).Select("id").Where("username LIKE ?", filter.Keyword+"%"),
			)
		}
	}
	if filter.StartTimestamp != "" || filter.EndTimestamp != "" {
		if start, err := strconv.ParseInt(filter.StartTimestamp, 10, 64); err == nil && start > 0 {
			query = query.Where("create_time >= ?", start)
		}
		if end, err := strconv.ParseInt(filter.EndTimestamp, 10, 64); err == nil && end > 0 {
			query = query.Where("create_time <= ?", end)
		}
	}
	return query
}

// fillInviteeNames 批量查询下级用户名并填充到流水中。
func fillInviteeNames(commissions []*PromotionCommission) {
	if len(commissions) == 0 {
		return
	}
	ids := make([]int, 0, len(commissions))
	seen := make(map[int]bool, len(commissions))
	for _, item := range commissions {
		if item.InviteeId > 0 && !seen[item.InviteeId] {
			seen[item.InviteeId] = true
			ids = append(ids, item.InviteeId)
		}
	}
	if len(ids) == 0 {
		return
	}
	var users []User
	if err := DB.Select("id", "username").Where("id IN ?", ids).Find(&users).Error; err != nil {
		return
	}
	names := make(map[int]string, len(users))
	for _, u := range users {
		names[u.Id] = u.Username
	}
	for _, item := range commissions {
		item.InviteeName = names[item.InviteeId]
	}
}

func GetPromotionCommissions(inviterId int, filter PromotionRecordFilter, pageInfo *common.PageInfo) (commissions []*PromotionCommission, total int64, err error) {
	query := applyPromotionRecordFilter(DB.Model(&PromotionCommission{}), inviterId, filter)
	if err = query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err = query.Order("id desc").Limit(pageInfo.GetPageSize()).Offset(pageInfo.GetStartIdx()).Find(&commissions).Error
	if err != nil {
		return nil, 0, err
	}
	fillInviteeNames(commissions)
	return commissions, total, nil
}

// GetPromotionCommissionSummary 返回上级的累计佣金、分成笔数与筛选期佣金合计。
// 无筛选条件时筛选期佣金与累计值一致。
func GetPromotionCommissionSummary(inviterId int, filter PromotionRecordFilter) (totalQuota int64, count int64, filteredQuota int64, err error) {
	var summary struct {
		TotalQuota int64 `gorm:"column:total_quota"`
		Count      int64 `gorm:"column:count"`
	}
	err = DB.Model(&PromotionCommission{}).
		Select("COALESCE(SUM(commission_quota), 0) as total_quota, COUNT(*) as count").
		Where("inviter_id = ?", inviterId).
		Scan(&summary).Error
	if err != nil {
		return 0, 0, 0, err
	}
	totalQuota, count = summary.TotalQuota, summary.Count

	hasFilter := filter.Keyword != "" || filter.StartTimestamp != "" || filter.EndTimestamp != ""
	if !hasFilter {
		return totalQuota, count, totalQuota, nil
	}
	filteredQuery := applyPromotionRecordFilter(DB.Model(&PromotionCommission{}), inviterId, filter)
	err = filteredQuery.Select("COALESCE(SUM(commission_quota), 0)").Scan(&filteredQuota).Error
	return totalQuota, count, filteredQuota, err
}

// GetLatestPromotionCommission 返回上级最近一笔分成记录（无记录时返回 nil）。
func GetLatestPromotionCommission(inviterId int) (*PromotionCommission, error) {
	var latest PromotionCommission
	err := DB.Where("inviter_id = ?", inviterId).Order("id desc").First(&latest).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &latest, nil
}
