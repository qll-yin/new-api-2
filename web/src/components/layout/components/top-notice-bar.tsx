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
import { useEffect, useMemo, useRef, useState } from 'react'
import { Megaphone } from 'lucide-react'

// 条目分隔符：拷贝组首尾相接时同样以它收尾，保证无缝循环
const NOTICE_SEPARATOR = '\u00A0\u00A0✦\u00A0\u00A0'

/**
 * 首页顶部活动通知栏（独立于系统公告，内容在后台「站点与品牌」配置）。
 * 固定在视口最顶部（z 序高于公共头部），高度 35px，文字持续横向滚动；
 * 每行一条活动，多条时以分隔符相连成一条连续滚动的跑马灯。
 */
export function TopNoticeBar({ text }: { text: string }) {
  const items = useMemo(
    () =>
      text
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
    [text]
  )
  const containerRef = useRef<HTMLDivElement>(null)
  const stripRef = useRef<HTMLSpanElement>(null)
  const [copiesPerGroup, setCopiesPerGroup] = useState(2)

  const strip = items.join(NOTICE_SEPARATOR) + NOTICE_SEPARATOR
  // 滚动时长随内容长度增长，限制在合理区间以保证可读速度
  const duration = Math.min(60, Math.max(12, Math.round(strip.length * 0.35)))

  // 无缝循环要求滚动内容恰好等分为两组；文案较短时单份宽度铺不满容器，
  // 电脑端会出现"只显示一部分"的情况，因此按容器宽度自适应拷贝份数。
  useEffect(() => {
    const container = containerRef.current
    const stripEl = stripRef.current
    if (!container || !stripEl) return
    const update = () => {
      const stripWidth = stripEl.getBoundingClientRect().width
      if (stripWidth <= 0) return
      setCopiesPerGroup(
        Math.max(1, Math.ceil(container.clientWidth / stripWidth))
      )
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(container)
    return () => observer.disconnect()
  }, [strip])

  if (items.length === 0) return null

  const stripSpan = (keyPrefix: string, hidden = false) =>
    Array.from({ length: hidden ? copiesPerGroup : copiesPerGroup - 1 }, (_, i) => (
      <span
        key={`${keyPrefix}${i}`}
        aria-hidden={hidden || undefined}
        className='text-xs whitespace-pre'
      >
        {strip}
      </span>
    ))

  return (
    <div className='bg-primary text-primary-foreground fixed inset-x-0 top-0 z-[60] h-[35px] overflow-hidden border-b border-white/10 shadow-sm'>
      <div className='mx-auto flex h-full max-w-7xl items-center gap-2.5 px-4'>
        <Megaphone className='size-3.5 shrink-0' aria-hidden='true' />
        <div
          ref={containerRef}
          className='top-notice-marquee-mask relative min-w-0 flex-1 overflow-hidden'
        >
          <div
            className='top-notice-marquee flex w-max items-center'
            style={{ animationDuration: `${duration}s` }}
          >
            <span ref={stripRef} className='text-xs whitespace-pre'>
              {strip}
            </span>
            {stripSpan('a-')}
            {stripSpan('b-', true)}
          </div>
        </div>
      </div>
    </div>
  )
}
