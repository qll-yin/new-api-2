package model

import (
	"errors"
	"strings"
	"unicode/utf8"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
)

// SubUserGroup 子用户分组：由普通用户自建，用于归类自己名下的子用户（子用户即
// is_sub_user=true 的令牌，见 model/token.go）。分组删除时成员回到未分组。
type SubUserGroup struct {
	Id          int    `json:"id"`
	UserId      int    `json:"user_id" gorm:"index"`
	Name        string `json:"name" gorm:"type:varchar(50)"`
	CreatedTime int64  `json:"created_time" gorm:"bigint"`
}

const subUserGroupNameMax = 50

func normalizeSubUserGroupName(name string) string {
	return strings.TrimSpace(name)
}

func validateSubUserGroupName(name string) error {
	if name == "" {
		return errors.New("分组名称不能为空")
	}
	if utf8.RuneCountInString(name) > subUserGroupNameMax {
		return errors.New("分组名称长度不能超过50字符")
	}
	return nil
}

// SubUserGroupStat 分组及其名下子用户数量（不含已删除）。
type SubUserGroupStat struct {
	SubUserGroup
	TokenCount int `json:"token_count"`
}

func GetUserSubUserGroups(userId int) ([]SubUserGroupStat, error) {
	var groups []SubUserGroup
	if err := DB.Where("user_id = ?", userId).Order("id asc").Find(&groups).Error; err != nil {
		return nil, err
	}
	type groupCountRow struct {
		SubGroupId int
		Count      int64
	}
	var rows []groupCountRow
	if err := DB.Model(&Token{}).
		Select("sub_group_id", "COUNT(*) as count").
		Where("user_id = ? AND is_sub_user = ?", userId, true).
		Group("sub_group_id").
		Scan(&rows).Error; err != nil {
		return nil, err
	}
	counts := make(map[int]int, len(rows))
	for _, row := range rows {
		counts[row.SubGroupId] = int(row.Count)
	}
	stats := make([]SubUserGroupStat, 0, len(groups))
	for _, group := range groups {
		stats = append(stats, SubUserGroupStat{SubUserGroup: group, TokenCount: counts[group.Id]})
	}
	return stats, nil
}

func SubUserGroupExists(userId int, name string, excludeGroupId int) (bool, error) {
	query := DB.Model(&SubUserGroup{}).Where("user_id = ? AND name = ?", userId, name)
	if excludeGroupId > 0 {
		query = query.Where("id <> ?", excludeGroupId)
	}
	var count int64
	err := query.Count(&count).Error
	return count > 0, err
}

// SubUserGroupBelongsTo 校验分组属于该用户，创建/更新子用户时防止挂到他人分组。
func SubUserGroupBelongsTo(userId int, groupId int) (bool, error) {
	if groupId <= 0 {
		return false, nil
	}
	var count int64
	err := DB.Model(&SubUserGroup{}).Where("user_id = ? AND id = ?", userId, groupId).Count(&count).Error
	return count > 0, err
}

func CreateSubUserGroup(userId int, name string) (*SubUserGroup, error) {
	name = normalizeSubUserGroupName(name)
	if err := validateSubUserGroupName(name); err != nil {
		return nil, err
	}
	exists, err := SubUserGroupExists(userId, name, 0)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, errors.New("分组名称已存在")
	}
	group := &SubUserGroup{
		UserId:      userId,
		Name:        name,
		CreatedTime: common.GetTimestamp(),
	}
	err = DB.Create(group).Error
	return group, err
}

func RenameSubUserGroup(userId int, groupId int, name string) error {
	name = normalizeSubUserGroupName(name)
	if err := validateSubUserGroupName(name); err != nil {
		return err
	}
	exists, err := SubUserGroupExists(userId, name, groupId)
	if err != nil {
		return err
	}
	if exists {
		return errors.New("分组名称已存在")
	}
	res := DB.Model(&SubUserGroup{}).
		Where("user_id = ? AND id = ?", userId, groupId).
		Update("name", name)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return errors.New("分组不存在")
	}
	return nil
}

// DeleteSubUserGroup 删除分组并把名下子用户移回未分组（sub_group_id=0）。
// sub_group_id 不参与转发链路，无需失效令牌缓存。
func DeleteSubUserGroup(userId int, groupId int) error {
	if groupId <= 0 {
		return errors.New("分组不存在")
	}
	return DB.Transaction(func(tx *gorm.DB) error {
		res := tx.Where("user_id = ? AND id = ?", userId, groupId).Delete(&SubUserGroup{})
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			return errors.New("分组不存在")
		}
		return tx.Model(&Token{}).
			Where("user_id = ? AND sub_group_id = ? AND is_sub_user = ?", userId, groupId, true).
			Update("sub_group_id", 0).Error
	})
}

func GetUserSubUsers(userId int, startIdx int, num int) ([]*Token, error) {
	var tokens []*Token
	err := DB.Where("user_id = ? AND is_sub_user = ?", userId, true).
		Order("id desc").Limit(num).Offset(startIdx).Find(&tokens).Error
	return tokens, err
}

func CountUserSubUsers(userId int) (int64, error) {
	var total int64
	err := DB.Model(&Token{}).Where("user_id = ? AND is_sub_user = ?", userId, true).Count(&total).Error
	return total, err
}

// GetSubUserById 按 id 读取当前用户的子用户令牌；is_sub_user 条件保证
// 普通 API 令牌无法通过子用户接口操作。
func GetSubUserById(id int, userId int) (*Token, error) {
	if id == 0 || userId == 0 {
		return nil, errors.New("id 或 userId 为空！")
	}
	token := &Token{}
	err := DB.Where("id = ? AND user_id = ? AND is_sub_user = ?", id, userId, true).First(token).Error
	return token, err
}

func SearchUserSubUsers(userId int, keyword string, subGroupId int, offset int, limit int) (tokens []*Token, total int64, err error) {
	if limit <= 0 || limit > searchHardLimit {
		limit = searchHardLimit
	}
	if offset < 0 {
		offset = 0
	}
	baseQuery := DB.Model(&Token{}).Where("user_id = ? AND is_sub_user = ?", userId, true)
	if keyword != "" {
		keywordPattern, err := sanitizeLikePattern(keyword)
		if err != nil {
			return nil, 0, err
		}
		baseQuery = baseQuery.Where("name LIKE ? ESCAPE '!'", keywordPattern)
	}
	if subGroupId > 0 {
		baseQuery = baseQuery.Where("sub_group_id = ?", subGroupId)
	}
	if err = baseQuery.Count(&total).Error; err != nil {
		common.SysError("failed to count search sub users: " + err.Error())
		return nil, 0, errors.New("搜索子用户失败")
	}
	if err = baseQuery.Order("id desc").Offset(offset).Limit(limit).Find(&tokens).Error; err != nil {
		common.SysError("failed to search sub users: " + err.Error())
		return nil, 0, errors.New("搜索子用户失败")
	}
	return tokens, total, nil
}

// SubUserNameExists 校验同一用户名下是否已存在同名子用户（改名时排除自身）。
func SubUserNameExists(userId int, name string, excludeTokenId int) (bool, error) {
	query := DB.Model(&Token{}).Where("user_id = ? AND name = ? AND is_sub_user = ?", userId, name, true)
	if excludeTokenId > 0 {
		query = query.Where("id <> ?", excludeTokenId)
	}
	var count int64
	err := query.Count(&count).Error
	return count > 0, err
}

// UpdateSubUserFields 更新子用户令牌的业务字段。独立于 Token.Update：
// 普通 API 令牌的编辑路径不受子用户字段影响。状态变更走 SelectUpdate。
func (token *Token) UpdateSubUserFields() (err error) {
	if cacheErr := invalidateTokenCacheForMutation(token.Key); cacheErr != nil {
		common.SysLog("failed to invalidate token cache before sub user update: " + cacheErr.Error())
	}
	return DB.Model(token).Select("name", "expired_time", "remain_quota", "unlimited_quota",
		"model_limits_enabled", "model_limits", "allow_ips", "group", "cross_group_retry", "auto_groups",
		"sub_note", "sub_group_id").Updates(token).Error
}
