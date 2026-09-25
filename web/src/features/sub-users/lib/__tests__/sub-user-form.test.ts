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
import { describe, expect, test } from 'vitest'

import {
  getSubUserFormDefaultValues,
  getSubUserFormSchema,
  transformSubUserFormToPayload,
  transformSubUserToFormDefaults,
} from '../sub-user-form'
import type { SubUser } from '../../types'

const t = ((key: string, options?: Record<string, unknown>) => {
  if (options?.max !== undefined) {
    return key.replace('{{max}}', String(options.max))
  }
  return key
}) as TFunction

const baseSubUser: SubUser = {
  id: 1,
  name: '张三',
  key: 'sk-test',
  status: 1,
  remain_quota: 5_000_000,
  used_quota: 1_000_000,
  unlimited_quota: false,
  expired_time: -1,
  created_time: 1,
  accessed_time: 0,
  group: 'auto',
  auto_groups: ['default', 'vip'],
  cross_group_retry: true,
  model_limits_enabled: true,
  model_limits: 'gpt-4o,gpt-4o-mini',
  allow_ips: '10.0.0.1\n192.168.0.0/24',
  is_sub_user: true,
  sub_note: '员工使用，额度 1000',
  sub_group_id: 3,
}

describe('Sub-user form schema', () => {
  test('rejects custom auto groups beyond the configured limit', () => {
    const schema = getSubUserFormSchema(t, 2)
    const result = schema.safeParse({
      name: '张三',
      remain_quota_dollars: 10,
      expired_time: undefined,
      unlimited_quota: false,
      model_limits: [],
      allow_ips: '',
      group: 'auto',
      auto_groups_mode: 'custom',
      auto_groups: ['a', 'b', 'c'],
      cross_group_retry: true,
      sub_group_id: 0,
      sub_note: '',
    })
    expect(result.success).toBe(false)
  })

  test('requires quota when unlimited quota is off', () => {
    const schema = getSubUserFormSchema(t, 5)
    const result = schema.safeParse({
      name: '张三',
      remain_quota_dollars: undefined,
      expired_time: undefined,
      unlimited_quota: false,
      model_limits: [],
      allow_ips: '',
      group: 'default',
      auto_groups_mode: 'inherit',
      auto_groups: [],
      cross_group_retry: false,
      sub_group_id: 0,
      sub_note: '',
    })
    expect(result.success).toBe(false)
  })
})

describe('Sub-user form payload mapping', () => {
  test('maps dollars to quota units and normalizes advanced fields', () => {
    const values = getSubUserFormDefaultValues(false)
    const payload = transformSubUserFormToPayload({
      ...values,
      name: '张三',
      unlimited_quota: false,
      remain_quota_dollars: 10,
      expired_time: new Date(1700000000 * 1000),
      model_limits: ['gpt-4o', 'gpt-4o-mini'],
      group: 'auto',
      auto_groups_mode: 'custom',
      auto_groups: ['default', 'vip'],
      cross_group_retry: true,
      sub_group_id: 3,
      sub_note: '员工使用，额度 1000',
    })

    expect(payload.remain_quota).toBe(5_000_000)
    expect(payload.expired_time).toBe(1700000000)
    expect(payload.model_limits_enabled).toBe(true)
    expect(payload.model_limits).toBe('gpt-4o,gpt-4o-mini')
    expect(payload.auto_groups).toEqual(['default', 'vip'])
    expect(payload.cross_group_retry).toBe(true)
    expect(payload.sub_group_id).toBe(3)
    expect(payload.sub_note).toBe('员工使用，额度 1000')
  })

  test('clears auto groups and retry when the group is not auto', () => {
    const values = getSubUserFormDefaultValues(true)
    const payload = transformSubUserFormToPayload({
      ...values,
      group: 'default',
      auto_groups_mode: 'custom',
      auto_groups: ['vip'],
      cross_group_retry: true,
      sub_group_id: 0,
    })
    expect(payload.auto_groups).toEqual([])
    expect(payload.cross_group_retry).toBe(false)
    expect(payload.sub_group_id).toBe(0)
  })
})

describe('Sub-user form defaults from row data', () => {
  test('round-trips quota, expiry, model limits and sub fields', () => {
    const defaults = transformSubUserToFormDefaults(baseSubUser, [
      'default',
      'vip',
      'other',
    ])
    expect(defaults.remain_quota_dollars).toBe(10)
    expect(defaults.expired_time).toBeUndefined()
    expect(defaults.model_limits).toEqual(['gpt-4o', 'gpt-4o-mini'])
    expect(defaults.auto_groups_mode).toBe('custom')
    expect(defaults.auto_groups).toEqual(['default', 'vip'])
    expect(defaults.cross_group_retry).toBe(true)
    expect(defaults.sub_group_id).toBe(3)
    expect(defaults.sub_note).toBe('员工使用，额度 1000')
  })

  test('keeps a fixed expiry date', () => {
    const defaults = transformSubUserToFormDefaults({
      ...baseSubUser,
      expired_time: 1700000000,
      unlimited_quota: false,
    })
    expect(defaults.expired_time).toEqual(new Date(1700000000 * 1000))
    expect(defaults.remain_quota_dollars).toBe(10)
  })
})
