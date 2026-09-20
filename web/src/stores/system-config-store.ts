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
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { DEFAULT_SYSTEM_NAME, DEFAULT_LOGO } from '@/lib/constants'

export type CurrencyDisplayType = 'USD' | 'CNY' | 'TOKENS' | 'CUSTOM'

export interface CurrencyConfig {
  /** Whether to render quota values as currency instead of raw units */
  displayInCurrency: boolean
  /** Currency presentation strategy configured by the admin */
  quotaDisplayType: CurrencyDisplayType
  /** Number of quota units that equal one USD */
  quotaPerUnit: number
  /** Exchange rate from USD to the configured local currency */
  usdExchangeRate: number
  /** Custom currency symbol configured by the admin (used when type === CUSTOM) */
  customCurrencySymbol: string
  /** Exchange rate from USD to the custom currency (used when type === CUSTOM) */
  customCurrencyExchangeRate: number
}

export const MAX_CUSTOM_NAV_LINKS = 10

/** 顶部导航自定义链接（管理员在系统设置中配置，可带角标 tag）。 */
export interface CustomNavConfigLink {
  title: string
  url: string
  tag?: string
}

/** Parse the `custom_nav_links` status payload, dropping unusable entries. */
export function parseCustomNavLinks(value: unknown): CustomNavConfigLink[] {
  if (!Array.isArray(value)) return []
  const result: CustomNavConfigLink[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const record = item as Record<string, unknown>
    const title = typeof record.title === 'string' ? record.title.trim() : ''
    const url = typeof record.url === 'string' ? record.url.trim() : ''
    if (!title || !url) continue
    const tag = typeof record.tag === 'string' ? record.tag.trim() : ''
    result.push(tag ? { title, url, tag } : { title, url })
    if (result.length >= MAX_CUSTOM_NAV_LINKS) break
  }
  return result
}

export interface SystemConfig {
  systemName: string
  logo: string
  footerHtml?: string
  demoSiteEnabled?: boolean
  displayTokenStatEnabled?: boolean
  /** 默认首页主题（未配置自定义首页内容时生效） */
  homePageTheme: string
  /** 首页彩蛋跳转地址（留空关闭） */
  homePageEasterEggUrl: string
  /** 首页顶部活动通知栏开关（独立于系统公告） */
  topNoticeBarEnabled: boolean
  /** 首页顶部活动通知栏内容（每行一条，滚动展示） */
  topNoticeBarText: string
  /** 顶部导航自定义链接（管理员配置，可带角标 tag） */
  customNavLinks: CustomNavConfigLink[]
  currency: CurrencyConfig
}

export const DEFAULT_CURRENCY_CONFIG: CurrencyConfig = {
  displayInCurrency: true,
  quotaDisplayType: 'USD',
  quotaPerUnit: 500000,
  usdExchangeRate: 1,
  customCurrencySymbol: '¤',
  customCurrencyExchangeRate: 1,
}

interface SystemConfigState {
  config: SystemConfig
  loading: boolean
  loadedLogoUrl: string
  setConfig: (config: Partial<SystemConfig>) => void
  setLoadedLogoUrl: (url: string) => void
  setLoading: (loading: boolean) => void
}

/**
 * System configuration store with automatic persistence
 * Manages system name, logo, footer HTML and loading states
 */
export const useSystemConfigStore = create<SystemConfigState>()(
  persist(
    (set) => ({
      config: {
        systemName: DEFAULT_SYSTEM_NAME,
        logo: DEFAULT_LOGO,
        homePageTheme: 'classic',
        homePageEasterEggUrl: '',
        topNoticeBarEnabled: false,
        topNoticeBarText: '',
        customNavLinks: [],
        currency: { ...DEFAULT_CURRENCY_CONFIG },
      },
      loading: true,
      loadedLogoUrl: DEFAULT_LOGO,
      setConfig: (newConfig) =>
        set((state) => ({
          config: {
            ...state.config,
            ...newConfig,
            currency: {
              ...state.config.currency,
              ...(newConfig.currency ?? {}),
            },
          },
        })),
      setLoadedLogoUrl: (url) => set({ loadedLogoUrl: url }),
      setLoading: (loading) => set({ loading }),
    }),
    {
      name: 'system-config-storage',
      partialize: (state) => ({
        config: state.config,
        loadedLogoUrl: state.loadedLogoUrl,
      }),
    }
  )
)

// Selector helpers for convenience
export const getSystemName = () =>
  useSystemConfigStore.getState().config.systemName

export const getLogo = () => useSystemConfigStore.getState().config.logo

export const getFooterHtml = () =>
  useSystemConfigStore.getState().config.footerHtml
