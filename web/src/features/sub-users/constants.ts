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
import { API_KEY_STATUS } from '@/features/keys/constants'

// ============================================================================
// Sub-User Status（与令牌状态一致：1 启用 / 2 停用 / 3 过期 / 4 耗尽）
// ============================================================================

export const SUB_USER_STATUS = API_KEY_STATUS

// ============================================================================
// Default Values
// ============================================================================

/** 子用户分组的"未分组"固定 Id */
export const UNGROUPED_SUB_GROUP_ID = 0

// ============================================================================
// Error Messages (i18n keys: use t(ERROR_MESSAGES.xxx) when displaying)
// ============================================================================

export const ERROR_MESSAGES = {
  UNEXPECTED: 'An unexpected error occurred',
  LOAD_FAILED: 'Failed to load sub-users',
  SEARCH_FAILED: 'Failed to search sub-users',
  CREATE_FAILED: 'Failed to create sub-user',
  UPDATE_FAILED: 'Failed to update sub-user',
  DELETE_FAILED: 'Failed to delete sub-user',
  STATUS_UPDATE_FAILED: 'Failed to update sub-user status',
  GROUP_LOAD_FAILED: 'Failed to load sub-user groups',
  GROUP_CREATE_FAILED: 'Failed to create sub-user group',
  GROUP_UPDATE_FAILED: 'Failed to update sub-user group',
  GROUP_DELETE_FAILED: 'Failed to delete sub-user group',
} as const

// ============================================================================
// Success Messages (i18n keys: use t(SUCCESS_MESSAGES.xxx) when displaying)
// ============================================================================

export const SUCCESS_MESSAGES = {
  SUB_USER_CREATED: 'Sub-user created successfully',
  SUB_USER_UPDATED: 'Sub-user updated successfully',
  SUB_USER_DELETED: 'Sub-user deleted successfully',
  SUB_USER_ENABLED: 'Sub-user enabled successfully',
  SUB_USER_DISABLED: 'Sub-user disabled successfully',
  GROUP_CREATED: 'Sub-user group created successfully',
  GROUP_UPDATED: 'Sub-user group updated successfully',
  GROUP_DELETED: 'Sub-user group deleted successfully',
} as const
