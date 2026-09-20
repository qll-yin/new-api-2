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
import { useEffect } from 'react'

import { SITE_URL } from '@/lib/constants'
import { useSystemConfigStore } from '@/stores/system-config-store'

/**
 * SEO：为当前页面设置独立的 document.title 与 canonical 链接。
 *
 * 启动时的 `initSystemBranding()` 会把 title 设为系统名（首页即默认值），
 * 公开内容页挂载本 hook 后覆盖为「页面名 · 系统名」，卸载时还原，
 * 同时保证品牌信息后台刷新晚于页面挂载时标题仍正确。
 *
 * @param pageTitle 已翻译的页面标题；不传则不动（首页保持系统名）
 */
export function useDocumentTitle(pageTitle?: string) {
  const systemName = useSystemConfigStore((state) => state.config.systemName)

  useEffect(() => {
    if (!pageTitle) return
    document.title = `${pageTitle} · ${systemName}`
    return () => {
      document.title = systemName
    }
  }, [pageTitle, systemName])

  useEffect(() => {
    if (!pageTitle) return
    const canonical = document.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]'
    )
    if (!canonical) return
    canonical.href = `${SITE_URL}${window.location.pathname}`
    return () => {
      canonical.href = `${SITE_URL}/`
    }
  }, [pageTitle])
}
