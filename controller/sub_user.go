package controller

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/operation_setting"

	"github.com/gin-gonic/gin"
)

const subUserNoteMax = 500

// 子用户说明：虚拟子用户 = is_sub_user=true 的令牌（同一行数据），
// 停用/删除/改名天然与令牌双向一致；员工调用在消费日志里以令牌名（=子用户名）呈现。

func GetAllSubUsers(c *gin.Context) {
	userId := c.GetInt("id")
	pageInfo := common.GetPageQuery(c)
	tokens, err := model.GetUserSubUsers(userId, pageInfo.GetStartIdx(), pageInfo.GetPageSize())
	if err != nil {
		common.ApiError(c, err)
		return
	}
	total, _ := model.CountUserSubUsers(userId)
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(buildMaskedTokenResponses(tokens))
	common.ApiSuccess(c, pageInfo)
}

func SearchSubUsers(c *gin.Context) {
	userId := c.GetInt("id")
	keyword := c.Query("keyword")
	subGroupId, _ := strconv.Atoi(c.Query("sub_group_id"))

	pageInfo := common.GetPageQuery(c)
	tokens, total, err := model.SearchUserSubUsers(userId, keyword, subGroupId, pageInfo.GetStartIdx(), pageInfo.GetPageSize())
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(buildMaskedTokenResponses(tokens))
	common.ApiSuccess(c, pageInfo)
}

// validateSubUserRequest 校验子用户请求中的名称长度/额度/备注/子用户分组，失败时已写响应并返回 false。
func validateSubUserRequest(c *gin.Context, token *model.Token, userId int) bool {
	if utf8.RuneCountInString(token.Name) > 50 {
		common.ApiErrorI18n(c, i18n.MsgTokenNameTooLong)
		return false
	}
	if !token.UnlimitedQuota {
		if token.RemainQuota < 0 {
			common.ApiErrorI18n(c, i18n.MsgTokenQuotaNegative)
			return false
		}
		maxQuotaValue := maxTokenQuota()
		if token.RemainQuota > maxQuotaValue {
			common.ApiErrorI18n(c, i18n.MsgTokenQuotaExceedMax, map[string]any{"Max": maxQuotaValue})
			return false
		}
	}
	if utf8.RuneCountInString(token.SubNote) > subUserNoteMax {
		common.ApiError(c, fmt.Errorf("备注长度不能超过%d字符", subUserNoteMax))
		return false
	}
	if token.SubGroupId != 0 {
		belongs, err := model.SubUserGroupBelongsTo(userId, token.SubGroupId)
		if err != nil {
			common.ApiError(c, err)
			return false
		}
		if !belongs {
			common.ApiError(c, fmt.Errorf("子用户分组不存在"))
			return false
		}
	}
	return true
}

// checkSubUserNameUnique 校验同一名下子用户名称唯一；excludeTokenId 为改名时的自身排除。
func checkSubUserNameUnique(c *gin.Context, userId int, name string, excludeTokenId int) bool {
	exists, err := model.SubUserNameExists(userId, name, excludeTokenId)
	if err != nil {
		common.ApiError(c, err)
		return false
	}
	if exists {
		common.ApiError(c, fmt.Errorf("子用户名称已存在"))
		return false
	}
	return true
}

func AddSubUser(c *gin.Context) {
	userId := c.GetInt("id")
	request := tokenRequest{}
	if err := c.ShouldBindJSON(&request); err != nil {
		common.ApiError(c, err)
		return
	}
	token := request.Token
	token.Name = trimSubUserName(token.Name)
	if token.Name == "" {
		common.ApiError(c, fmt.Errorf("子用户名称不能为空"))
		return
	}
	if !validateSubUserRequest(c, &token, userId) {
		return
	}
	if !checkSubUserNameUnique(c, userId, token.Name, 0) {
		return
	}
	// 子用户计入令牌数量上限，防止借子用户绕过 MaxUserTokens
	maxTokens := operation_setting.GetMaxUserTokens()
	count, err := model.CountUserTokens(userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if int(count) >= maxTokens {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": fmt.Sprintf("已达到最大令牌数量限制 (%d)", maxTokens),
		})
		return
	}
	// 分组/auto 组校验与 AddToken 保持一致
	if token.Group == "auto" {
		if !setTokenAutoGroups(c, &token, request.AutoGroups.Groups) {
			return
		}
	} else {
		token.CrossGroupRetry = false
		_ = token.SetAutoGroups(nil)
	}
	key, err := common.GenerateKey()
	if err != nil {
		common.ApiErrorI18n(c, i18n.MsgTokenGenerateFailed)
		common.SysLog("failed to generate sub user token key: " + err.Error())
		return
	}
	cleanToken := model.Token{
		UserId:             userId,
		Name:               token.Name,
		Key:                key,
		CreatedTime:        common.GetTimestamp(),
		AccessedTime:       common.GetTimestamp(),
		ExpiredTime:        token.ExpiredTime,
		RemainQuota:        token.RemainQuota,
		UnlimitedQuota:     token.UnlimitedQuota,
		ModelLimitsEnabled: token.ModelLimitsEnabled,
		ModelLimits:        token.ModelLimits,
		AllowIps:           token.AllowIps,
		Group:              token.Group,
		CrossGroupRetry:    token.CrossGroupRetry,
		AutoGroups:         token.AutoGroups,
		IsSubUser:          true,
		SubNote:            token.SubNote,
		SubGroupId:         token.SubGroupId,
	}
	if err := cleanToken.Insert(); err != nil {
		common.ApiError(c, err)
		return
	}
	params := tokenAuditParams(c)
	params["id"], params["name"] = cleanToken.Id, cleanToken.Name
	common.SetContextKey(c, constant.ContextKeyTokenAuditSucceeded, true)
	// 明文 key 仅创建响应返回一次，之后列表只显示掩码（揭示走 POST /api/token/:id/key）
	common.ApiSuccess(c, gin.H{
		"token": buildMaskedTokenResponse(&cleanToken),
		"key":   cleanToken.GetFullKey(),
	})
}

func trimSubUserName(name string) string {
	// 名称两端空白会影响日志检索与唯一性判断，统一去除
	return strings.TrimSpace(name)
}

func UpdateSubUser(c *gin.Context) {
	userId := c.GetInt("id")
	statusOnly := c.Query("status_only")
	request := tokenRequest{}
	if err := c.ShouldBindJSON(&request); err != nil {
		common.ApiError(c, err)
		return
	}
	token := request.Token
	token.Name = trimSubUserName(token.Name)
	subUser, err := model.GetSubUserById(token.Id, userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	params := tokenAuditParams(c)
	params["id"] = subUser.Id
	if !validateSubUserRequest(c, &token, userId) {
		return
	}
	if !checkSubUserNameUnique(c, userId, token.Name, subUser.Id) {
		return
	}
	previous := *subUser
	if token.Status == common.TokenStatusEnabled {
		if subUser.Status == common.TokenStatusExpired && subUser.ExpiredTime <= common.GetTimestamp() && subUser.ExpiredTime != -1 {
			common.ApiErrorI18n(c, i18n.MsgTokenExpiredCannotEnable)
			return
		}
		if subUser.Status == common.TokenStatusExhausted && subUser.RemainQuota <= 0 && !subUser.UnlimitedQuota {
			common.ApiErrorI18n(c, i18n.MsgTokenExhaustedCannotEable)
			return
		}
	}
	if statusOnly != "" {
		subUser.Status = token.Status
		if err := subUser.SelectUpdate(); err != nil {
			common.ApiError(c, err)
			return
		}
		params["name"] = subUser.Name
		params["from"], params["to"] = previous.Status, subUser.Status
		common.SetContextKey(c, constant.ContextKeyTokenAuditSucceeded, true)
		common.ApiSuccess(c, gin.H{"data": buildMaskedTokenResponse(subUser)})
		return
	}
	subUser.Name = token.Name
	subUser.ExpiredTime = token.ExpiredTime
	subUser.RemainQuota = token.RemainQuota
	subUser.UnlimitedQuota = token.UnlimitedQuota
	subUser.ModelLimitsEnabled = token.ModelLimitsEnabled
	subUser.ModelLimits = token.ModelLimits
	subUser.AllowIps = token.AllowIps
	subUser.Group = token.Group
	subUser.CrossGroupRetry = token.CrossGroupRetry
	if token.Group != "auto" {
		subUser.CrossGroupRetry = false
		_ = subUser.SetAutoGroups(nil)
	} else if request.AutoGroups.Set {
		if !setTokenAutoGroups(c, subUser, request.AutoGroups.Groups) {
			return
		}
	}
	subUser.SubNote = token.SubNote
	subUser.SubGroupId = token.SubGroupId
	if err := subUser.UpdateSubUserFields(); err != nil {
		common.ApiError(c, err)
		return
	}
	params["name"] = subUser.Name
	changedFields := []string{}
	for _, field := range []struct {
		name    string
		changed bool
	}{
		{"name", previous.Name != subUser.Name},
		{"expired_time", previous.ExpiredTime != subUser.ExpiredTime},
		{"remain_quota", previous.RemainQuota != subUser.RemainQuota},
		{"unlimited_quota", previous.UnlimitedQuota != subUser.UnlimitedQuota},
		{"model_limits_enabled", previous.ModelLimitsEnabled != subUser.ModelLimitsEnabled},
		{"model_limits", previous.ModelLimits != subUser.ModelLimits},
		{"allow_ips", (previous.AllowIps == nil) != (subUser.AllowIps == nil) ||
			(previous.AllowIps != nil && subUser.AllowIps != nil && *previous.AllowIps != *subUser.AllowIps)},
		{"group", previous.Group != subUser.Group},
		{"cross_group_retry", previous.CrossGroupRetry != subUser.CrossGroupRetry},
		{"auto_groups", previous.AutoGroups != subUser.AutoGroups},
		{"sub_note", previous.SubNote != subUser.SubNote},
		{"sub_group_id", previous.SubGroupId != subUser.SubGroupId},
	} {
		if field.changed {
			changedFields = append(changedFields, field.name)
		}
	}
	params["changed_fields"] = changedFields
	common.SetContextKey(c, constant.ContextKeyTokenAuditSucceeded, true)
	common.ApiSuccess(c, gin.H{"data": buildMaskedTokenResponse(subUser)})
}

func DeleteSubUser(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	userId := c.GetInt("id")
	subUser, err := model.GetSubUserById(id, userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	params := tokenAuditParams(c)
	params["id"], params["name"] = subUser.Id, subUser.Name
	if err := subUser.Delete(); err != nil {
		common.ApiError(c, err)
		return
	}
	common.SetContextKey(c, constant.ContextKeyTokenAuditSucceeded, true)
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

type subUserGroupRequest struct {
	Id   int    `json:"id"`
	Name string `json:"name"`
}

func GetSubUserGroups(c *gin.Context) {
	userId := c.GetInt("id")
	groups, err := model.GetUserSubUserGroups(userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, groups)
}

func AddSubUserGroup(c *gin.Context) {
	userId := c.GetInt("id")
	request := subUserGroupRequest{}
	if err := c.ShouldBindJSON(&request); err != nil {
		common.ApiError(c, err)
		return
	}
	exists, err := model.SubUserGroupExists(userId, trimSubUserGroupName(request.Name), 0)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if exists {
		common.ApiError(c, fmt.Errorf("分组名称已存在"))
		return
	}
	group, err := model.CreateSubUserGroup(userId, request.Name)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.SetContextKey(c, constant.ContextKeyTokenAuditSucceeded, true)
	common.ApiSuccess(c, group)
}

func trimSubUserGroupName(name string) string {
	return strings.TrimSpace(name)
}

func UpdateSubUserGroup(c *gin.Context) {
	userId := c.GetInt("id")
	request := subUserGroupRequest{}
	if err := c.ShouldBindJSON(&request); err != nil {
		common.ApiError(c, err)
		return
	}
	if request.Id <= 0 {
		common.ApiError(c, fmt.Errorf("分组不存在"))
		return
	}
	exists, err := model.SubUserGroupExists(userId, trimSubUserGroupName(request.Name), request.Id)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if exists {
		common.ApiError(c, fmt.Errorf("分组名称已存在"))
		return
	}
	if err := model.RenameSubUserGroup(userId, request.Id, request.Name); err != nil {
		common.ApiError(c, err)
		return
	}
	common.SetContextKey(c, constant.ContextKeyTokenAuditSucceeded, true)
	c.JSON(http.StatusOK, gin.H{"success": true, "message": ""})
}

func DeleteSubUserGroup(c *gin.Context) {
	userId := c.GetInt("id")
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		common.ApiError(c, fmt.Errorf("分组不存在"))
		return
	}
	if err := model.DeleteSubUserGroup(userId, id); err != nil {
		common.ApiError(c, err)
		return
	}
	common.SetContextKey(c, constant.ContextKeyTokenAuditSucceeded, true)
	c.JSON(http.StatusOK, gin.H{"success": true, "message": ""})
}
