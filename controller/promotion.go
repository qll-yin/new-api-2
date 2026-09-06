package controller

import (
	"net/http"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

// lastCommissionValue 提取最近一笔分成的佣金额度，无记录时返回 0。
func lastCommissionValue(last *model.PromotionCommission) int {
	if last == nil {
		return 0
	}
	return last.CommissionQuota
}

// GetPromotionInfo 返回当前用户的推广活动数据：分成开关与比例、推广码、佣金汇总与流水分页。
func GetPromotionInfo(c *gin.Context) {
	userId := c.GetInt("id")

	user, err := model.GetUserById(userId, true)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if user.AffCode == "" {
		user.AffCode = common.GetRandomString(4)
		if err := user.Update(false); err != nil {
			common.ApiError(c, err)
			return
		}
	}

	filter := model.PromotionRecordFilter{
		Keyword:        c.Query("keyword"),
		StartTimestamp: c.Query("start_timestamp"),
		EndTimestamp:   c.Query("end_timestamp"),
	}

	pageInfo := common.GetPageQuery(c)
	commissions, total, err := model.GetPromotionCommissions(userId, filter, pageInfo)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	totalQuota, count, filteredQuota, err := model.GetPromotionCommissionSummary(userId, filter)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	lastCommission, err := model.GetLatestPromotionCommission(userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	if commissions == nil {
		commissions = []*model.PromotionCommission{}
	}
	pageInfo.SetItems(commissions)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"enabled":                common.PromotionCommissionEnabled,
			"rate":                   common.PromotionCommissionRate,
			"aff_code":               user.AffCode,
			"aff_count":              user.AffCount,
			"aff_history_quota":      user.AffHistoryQuota,
			"aff_pending_quota":      user.AffQuota,
			"total_commission_quota": totalQuota,
			"commission_count":       count,
			"filtered_quota":         filteredQuota,
			"last_commission_quota":  lastCommissionValue(lastCommission),
			"items":                  pageInfo.Items,
			"total":                  pageInfo.Total,
			"page":                   pageInfo.Page,
			"page_size":              pageInfo.PageSize,
		},
	})
}
