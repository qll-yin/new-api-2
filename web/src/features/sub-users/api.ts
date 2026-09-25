/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { api } from '@/lib/api'

import type {
  ApiResponse,
  CreateSubUserResponse,
  GetSubUsersParams,
  GetSubUsersResponse,
  SearchSubUsersParams,
  SubUser,
  SubUserFormData,
  SubUserGroup,
  SubUserGroupStat,
} from './types'

// ============================================================================
// Sub-User Management（虚拟子用户 = is_sub_user=true 的令牌）
// ============================================================================

// Get paginated sub-users list
export async function getSubUsers(
  params: GetSubUsersParams = {}
): Promise<GetSubUsersResponse> {
  const { p = 1, size = 10 } = params
  const res = await api.get(`/api/sub_user/?p=${p}&size=${size}`)
  return res.data
}

// Search sub-users by keyword or sub-user group (with pagination)
export async function searchSubUsers(
  params: SearchSubUsersParams
): Promise<GetSubUsersResponse> {
  const { keyword = '', sub_group_id, p, size } = params
  const queryParams = new URLSearchParams()
  if (keyword) queryParams.set('keyword', keyword)
  if (sub_group_id) queryParams.set('sub_group_id', String(sub_group_id))
  if (p != null) queryParams.set('p', String(p))
  if (size != null) queryParams.set('size', String(size))
  const res = await api.get(`/api/sub_user/search?${queryParams.toString()}`)
  return res.data
}

// Create a new sub-user（响应一次性返回明文 key）
export async function createSubUser(
  data: SubUserFormData
): Promise<ApiResponse<CreateSubUserResponse>> {
  const res = await api.post('/api/sub_user/', data)
  return res.data
}

// Update an existing sub-user
export async function updateSubUser(
  data: SubUserFormData & { id: number }
): Promise<ApiResponse<SubUser>> {
  const res = await api.put('/api/sub_user/', data)
  return res.data
}

// Update sub-user status (enable/disable)，与令牌状态双向一致
export async function updateSubUserStatus(
  id: number,
  status: number
): Promise<ApiResponse<SubUser>> {
  const res = await api.put('/api/sub_user/?status_only=true', { id, status })
  return res.data
}

// Delete a sub-user（同时删除其绑定令牌）
export async function deleteSubUser(id: number): Promise<ApiResponse> {
  const res = await api.delete(`/api/sub_user/${id}/`)
  return res.data
}

// ============================================================================
// Sub-User Groups
// ============================================================================

// Get sub-user groups with member counts
export async function getSubUserGroups(): Promise<
  ApiResponse<SubUserGroupStat[]>
> {
  const res = await api.get('/api/sub_user/groups')
  return res.data
}

// Create a sub-user group
export async function createSubUserGroup(
  name: string
): Promise<ApiResponse<SubUserGroup>> {
  const res = await api.post('/api/sub_user/group', { name })
  return res.data
}

// Rename a sub-user group
export async function renameSubUserGroup(params: {
  id: number
  name: string
}): Promise<ApiResponse> {
  const res = await api.put('/api/sub_user/group', params)
  return res.data
}

// Delete a sub-user group（成员迁回未分组）
export async function deleteSubUserGroup(id: number): Promise<ApiResponse> {
  const res = await api.delete(`/api/sub_user/group/${id}/`)
  return res.data
}
