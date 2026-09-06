package controller

import (
	"net/http"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

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

	pageInfo := common.GetPageQuery(c)
	commissions, total, err := model.GetPromotionCommissions(userId, pageInfo)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	totalQuota, count, err := model.GetPromotionCommissionSummary(userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
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
			"items":                  pageInfo.Items,
			"total":                  pageInfo.Total,
			"page":                   pageInfo.Page,
			"page_size":              pageInfo.PageSize,
		},
	})
}
