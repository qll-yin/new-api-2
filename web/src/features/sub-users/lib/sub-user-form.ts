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
import type { TFunction } from 'i18next'
import { z } from 'zod'

import { DEFAULT_GROUP } from '@/features/keys/constants'
import { parseQuotaFromDollars, quotaUnitsToDollars } from '@/lib/format'

import { UNGROUPED_SUB_GROUP_ID } from '../constants'
import type { SubUser, SubUserFormData } from '../types'

// ============================================================================
// Form Schema（字段与 API 密钥表单对齐，另加子用户分组与备注）
// ============================================================================

export function getSubUserFormSchema(t: TFunction, maxAutoGroups = 5) {
  const autoGroupLimit =
    Number.isInteger(maxAutoGroups) && maxAutoGroups > 0 ? maxAutoGroups : 5

  return z
    .object({
      name: z.string().min(1, t('Please enter a name')),
      remain_quota_dollars: z.number().optional(),
      expired_time: z.date().optional(),
      unlimited_quota: z.boolean(),
      model_limits: z.array(z.string()),
      allow_ips: z.string().optional(),
      group: z.string().optional(),
      auto_groups_mode: z.enum(['inherit', 'custom']),
      auto_groups: z.array(z.string()),
      cross_group_retry: z.boolean().optional(),
      sub_group_id: z.number(),
      sub_note: z.string().max(500, t('Note is too long (max 500 characters)')),
    })
    .superRefine((data, ctx) => {
      if (data.group === 'auto') {
        if (
          data.auto_groups_mode === 'custom' &&
          data.auto_groups.length === 0
        ) {
          ctx.addIssue({
            code: 'custom',
            path: ['auto_groups'],
            message: t(
              'Select at least one Auto group or restore global Auto.'
            ),
          })
        }

        if (data.auto_groups.length > autoGroupLimit) {
          ctx.addIssue({
            code: 'custom',
            path: ['auto_groups'],
            message: t('Select at most {{max}} Auto groups', {
              max: autoGroupLimit,
            }),
          })
        }

        if (new Set(data.auto_groups).size !== data.auto_groups.length) {
          ctx.addIssue({
            code: 'custom',
            path: ['auto_groups'],
            message: t('Auto groups must not contain duplicates'),
          })
        }
      }

      if (data.unlimited_quota) {
        return
      }

      if (
        data.remain_quota_dollars === undefined ||
        data.remain_quota_dollars < 0
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['remain_quota_dollars'],
          message: t('Quota must be zero or greater'),
        })
      }
    })
}

export type SubUserFormValues = z.infer<
  ReturnType<typeof getSubUserFormSchema>
>

// ============================================================================
// Form Defaults
// ============================================================================

export const SUB_USER_FORM_DEFAULT_VALUES: SubUserFormValues = {
  name: '',
  remain_quota_dollars: 10,
  expired_time: undefined,
  unlimited_quota: true,
  model_limits: [],
  allow_ips: '',
  group: DEFAULT_GROUP,
  auto_groups_mode: 'inherit',
  auto_groups: [],
  cross_group_retry: true,
  sub_group_id: UNGROUPED_SUB_GROUP_ID,
  sub_note: '',
}

export function getSubUserFormDefaultValues(
  defaultUseAutoGroup: boolean
): SubUserFormValues {
  return {
    ...SUB_USER_FORM_DEFAULT_VALUES,
    group: defaultUseAutoGroup ? 'auto' : DEFAULT_GROUP,
    auto_groups_mode: 'inherit',
    auto_groups: [],
    cross_group_retry: defaultUseAutoGroup,
  }
}

// ============================================================================
// Form Data Transformation
// ============================================================================

/** Transform form data to API payload */
export function transformSubUserFormToPayload(
  data: SubUserFormValues
): SubUserFormData {
  return {
    name: data.name,
    remain_quota: data.unlimited_quota
      ? 0
      : parseQuotaFromDollars(data.remain_quota_dollars || 0),
    expired_time: data.expired_time
      ? Math.floor(data.expired_time.getTime() / 1000)
      : -1,
    unlimited_quota: data.unlimited_quota,
    model_limits_enabled: data.model_limits.length > 0,
    model_limits: data.model_limits.join(','),
    allow_ips: data.allow_ips || '',
    group: data.group || '',
    auto_groups:
      data.group === 'auto' && data.auto_groups_mode === 'custom'
        ? data.auto_groups
        : [],
    cross_group_retry: data.group === 'auto' ? !!data.cross_group_retry : false,
    sub_note: data.sub_note || '',
    sub_group_id: data.sub_group_id || UNGROUPED_SUB_GROUP_ID,
  }
}

/** Transform sub-user data to form defaults */
export function transformSubUserToFormDefaults(
  subUser: SubUser,
  availableAutoGroups: string[] = [],
  maxAutoGroups = 5
): SubUserFormValues {
  const availableSet = new Set(availableAutoGroups)
  const storedAutoGroups = subUser.auto_groups ?? []
  const autoGroups = storedAutoGroups
    .filter((group) => availableSet.has(group))
    .slice(0, Math.max(0, maxAutoGroups))
  const autoGroupsMode = storedAutoGroups.length > 0 ? 'custom' : 'inherit'

  return {
    name: subUser.name,
    remain_quota_dollars: subUser.unlimited_quota
      ? 0
      : quotaUnitsToDollars(subUser.remain_quota),
    expired_time:
      subUser.expired_time > 0
        ? new Date(subUser.expired_time * 1000)
        : undefined,
    unlimited_quota: subUser.unlimited_quota,
    model_limits: subUser.model_limits
      ? subUser.model_limits.split(',').filter(Boolean)
      : [],
    allow_ips: subUser.allow_ips || '',
    group: subUser.group || DEFAULT_GROUP,
    auto_groups_mode: autoGroupsMode,
    auto_groups: autoGroups,
    cross_group_retry: !!subUser.cross_group_retry,
    sub_group_id: subUser.sub_group_id ?? UNGROUPED_SUB_GROUP_ID,
    sub_note: subUser.sub_note || '',
  }
}
