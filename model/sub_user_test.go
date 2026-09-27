package model

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func createTestSubUserFixture(t *testing.T) {
	t.Helper()
	// Token 是软删除且 key 唯一索引不含 deleted_at，软删行仍占用 key，必须硬删清场
	require.NoError(t, DB.Unscoped().Where("1 = 1").Delete(&Token{}).Error)
	require.NoError(t, DB.Unscoped().Where("1 = 1").Delete(&SubUserGroup{}).Error)
}

func TestSubUserGroupCrud(t *testing.T) {
	createTestSubUserFixture(t)

	group, err := CreateSubUserGroup(7, " 研发组 ")
	require.NoError(t, err)
	assert.Equal(t, "研发组", group.Name)

	// 同名分组拒绝
	_, err = CreateSubUserGroup(7, "研发组")
	require.Error(t, err)

	// 空名 / 超长名拒绝
	_, err = CreateSubUserGroup(7, "  ")
	require.Error(t, err)
	_, err = CreateSubUserGroup(7, string(make([]rune, 51)))
	require.Error(t, err)

	// 重命名 + 同名排除自身
	require.NoError(t, RenameSubUserGroup(7, group.Id, "市场组"))
	exists, err := SubUserGroupExists(7, "市场组", group.Id)
	require.NoError(t, err)
	assert.False(t, exists)
	exists, err = SubUserGroupExists(7, "市场组", 0)
	require.NoError(t, err)
	assert.True(t, exists)

	// 他人无法看到/操作
	belongs, err := SubUserGroupBelongsTo(8, group.Id)
	require.NoError(t, err)
	assert.False(t, belongs)
	require.Error(t, RenameSubUserGroup(8, group.Id, "hack"))

	// 删除分组：成员迁回未分组
	sub := &Token{UserId: 7, Name: "张三", Key: "subkey-1", IsSubUser: true, SubGroupId: group.Id}
	require.NoError(t, sub.Insert())
	require.NoError(t, DeleteSubUserGroup(7, group.Id))
	require.Error(t, DeleteSubUserGroup(7, group.Id))
	var moved Token
	require.NoError(t, DB.First(&moved, "id = ?", sub.Id).Error)
	assert.Equal(t, 0, moved.SubGroupId)
}

func TestSubUserQueries(t *testing.T) {
	createTestSubUserFixture(t)

	normal := &Token{UserId: 7, Name: "my-key", Key: "plain-key-1"}
	require.NoError(t, normal.Insert())
	sub1 := &Token{UserId: 7, Name: "张三", Key: "subkey-1", IsSubUser: true, SubNote: "员工使用"}
	require.NoError(t, sub1.Insert())
	sub2 := &Token{UserId: 7, Name: "李四", Key: "subkey-2", IsSubUser: true}
	require.NoError(t, sub2.Insert())
	other := &Token{UserId: 8, Name: "别人", Key: "subkey-3", IsSubUser: true}
	require.NoError(t, other.Insert())

	// keys 列表只看到普通令牌；子用户列表只看到子用户
	apiTokens, err := GetUserApiTokens(7, 0, 10)
	require.NoError(t, err)
	assert.Len(t, apiTokens, 1)
	assert.Equal(t, "my-key", apiTokens[0].Name)

	subs, err := GetUserSubUsers(7, 0, 10)
	require.NoError(t, err)
	assert.Len(t, subs, 2)

	apiCount, err := CountUserApiTokens(7)
	require.NoError(t, err)
	assert.EqualValues(t, 1, apiCount)
	subCount, err := CountUserSubUsers(7)
	require.NoError(t, err)
	assert.EqualValues(t, 2, subCount)
	// 上限校验用包含子用户的总数
	allCount, err := CountUserTokens(7)
	require.NoError(t, err)
	assert.EqualValues(t, 3, allCount)

	// GetSubUserById 拒绝普通令牌与他人令牌
	_, err = GetSubUserById(normal.Id, 7)
	require.Error(t, err)
	_, err = GetSubUserById(sub1.Id, 8)
	require.Error(t, err)
	got, err := GetSubUserById(sub1.Id, 7)
	require.NoError(t, err)
	assert.Equal(t, "张三", got.Name)

	// 关键字与分组过滤
	subs, total, err := SearchUserSubUsers(7, "张%", 0, 0, 10)
	require.NoError(t, err)
	assert.EqualValues(t, 1, total)
	assert.Equal(t, "张三", subs[0].Name)

	group, err := CreateSubUserGroup(7, "研发组")
	require.NoError(t, err)
	sub2.SubGroupId = group.Id
	require.NoError(t, DB.Model(sub2).Update("sub_group_id", group.Id).Error)
	subs, total, err = SearchUserSubUsers(7, "", group.Id, 0, 10)
	require.NoError(t, err)
	assert.EqualValues(t, 1, total)
	assert.Equal(t, "李四", subs[0].Name)

	// 名称唯一（改名排除自身）
	exists, err := SubUserNameExists(7, "张三", 0)
	require.NoError(t, err)
	assert.True(t, exists)
	exists, err = SubUserNameExists(7, "张三", sub1.Id)
	require.NoError(t, err)
	assert.False(t, exists)
	exists, err = SubUserNameExists(7, "别人", 0)
	require.NoError(t, err)
	assert.False(t, exists)
}

// 升级兼容：AutoMigrate 给存量 tokens 行新加的 is_sub_user 列是 NULL，
// NULL = false 不成立，曾导致「API 密钥」页把升级前的旧令牌全部隐藏。
func TestLegacyTokenNullSubUserFlag(t *testing.T) {
	createTestSubUserFixture(t)

	// 模拟升级前的存量令牌行（不经 GORM 插入，is_sub_user 保持 NULL）
	require.NoError(t, DB.Exec(
		"INSERT INTO tokens (user_id, name, "+commonKeyCol+", status) VALUES (7, 'legacy-key', 'legacy-key-1', 1)",
	).Error)

	// 子用户查询不能命中 NULL 行
	subs, err := GetUserSubUsers(7, 0, 10)
	require.NoError(t, err)
	assert.Empty(t, subs)
	subCount, err := CountUserSubUsers(7)
	require.NoError(t, err)
	assert.EqualValues(t, 0, subCount)

	// 「API 密钥」页三个入口必须照常看到旧令牌
	apiTokens, err := GetUserApiTokens(7, 0, 10)
	require.NoError(t, err)
	require.Len(t, apiTokens, 1)
	assert.Equal(t, "legacy-key", apiTokens[0].Name)

	apiCount, err := CountUserApiTokens(7)
	require.NoError(t, err)
	assert.EqualValues(t, 1, apiCount)

	found, total, err := SearchUserTokens(7, "legacy-key", "", 0, 10)
	require.NoError(t, err)
	assert.EqualValues(t, 1, total)
	require.Len(t, found, 1)

	// 上限校验统计的令牌总数包含 NULL 行
	allCount, err := CountUserTokens(7)
	require.NoError(t, err)
	assert.EqualValues(t, 1, allCount)

	// 启动回填把 NULL 归位为 false，重复执行幂等，回填后 keys 页仍可见
	require.NoError(t, InitializeTokenSubUserFlags())
	require.NoError(t, InitializeTokenSubUserFlags())
	var legacy Token
	require.NoError(t, DB.Where("name = ?", "legacy-key").First(&legacy).Error)
	assert.False(t, legacy.IsSubUser)
	assert.Empty(t, legacy.SubNote)
	assert.Equal(t, 0, legacy.SubGroupId)
	apiTokens, err = GetUserApiTokens(7, 0, 10)
	require.NoError(t, err)
	assert.Len(t, apiTokens, 1)
}

func TestUpdateSubUserFields(t *testing.T) {
	createTestSubUserFixture(t)

	sub := &Token{UserId: 7, Name: "张三", Key: "subkey-1", IsSubUser: true, Status: common.TokenStatusEnabled}
	require.NoError(t, sub.Insert())

	sub.Name = "张三丰"
	sub.SubNote = "员工使用，额度 1000"
	sub.RemainQuota = 500000
	sub.UnlimitedQuota = false
	require.NoError(t, sub.UpdateSubUserFields())

	var reloaded Token
	require.NoError(t, DB.First(&reloaded, "id = ?", sub.Id).Error)
	assert.Equal(t, "张三丰", reloaded.Name)
	assert.Equal(t, "员工使用，额度 1000", reloaded.SubNote)
	assert.Equal(t, 500000, reloaded.RemainQuota)
	// 状态不在更新白名单，保持不变
	assert.Equal(t, common.TokenStatusEnabled, reloaded.Status)

	// 停用走 SelectUpdate，与令牌停用语义一致
	reloaded.Status = common.TokenStatusDisabled
	require.NoError(t, reloaded.SelectUpdate())
	var afterStatus Token
	require.NoError(t, DB.First(&afterStatus, "id = ?", sub.Id).Error)
	assert.Equal(t, common.TokenStatusDisabled, afterStatus.Status)
}
