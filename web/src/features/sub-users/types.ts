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
import { z } from 'zod'

import { apiKeySchema } from '@/features/keys/types'

// ============================================================================
// Sub-User Schema & Types
// ============================================================================

/** 子用户 = is_sub_user=true 的令牌，字段是 ApiKey 的超集 */
export const subUserSchema = apiKeySchema.extend({
  is_sub_user: z.boolean().optional().default(true),
  sub_note: z.string().nullish().default(''),
  sub_group_id: z.number().nullish().default(0),
})

export type SubUser = z.infer<typeof subUserSchema>

// ============================================================================
// Sub-User Group Types
// ============================================================================

export interface SubUserGroup {
  id: number
  name: string
  created_time: number
}

export interface SubUserGroupStat extends SubUserGroup {
  token_count: number
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
}

export interface GetSubUsersParams {
  p?: number
  size?: number
}

export interface GetSubUsersResponse {
  success: boolean
  message?: string
  data?: {
    items: SubUser[]
    total: number
    page: number
    page_size: number
  }
}

export interface SearchSubUsersParams {
  keyword?: string
  sub_group_id?: number
  p?: number
  size?: number
}

export interface SubUserFormData {
  name: string
  remain_quota: number
  expired_time: number
  unlimited_quota: boolean
  model_limits_enabled: boolean
  model_limits: string
  allow_ips: string
  group: string
  auto_groups: string[]
  cross_group_retry: boolean
  sub_note: string
  sub_group_id: number
}

export interface CreateSubUserResponse {
  token: SubUser
  /** 明文 key 仅创建响应返回一次（不含 sk- 前缀） */
  key: string
}

// ============================================================================
// Dialog Types
// ============================================================================

export type SubUsersDialogType =
  | 'create'
  | 'update'
  | 'delete'
  | 'groups'
  | 'created-key'
