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
import { ChevronLeft, ChevronRight, Megaphone } from 'lucide-react'
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  ConfettiCannons,
  type ConfettiCannonsHandle,
} from '@/components/confetti-cannons'
import { RichContent } from '@/components/rich-content'
import { Button } from '@/components/ui/button'
import { getAnnouncementKey, useNotifications } from '@/hooks/use-notifications'
import { getAnnouncementColorClass } from '@/lib/colors'
import { MOTION_TRANSITION } from '@/lib/motion'
import { formatDateTimeObject } from '@/lib/time'
import { cn } from '@/lib/utils'
import { useNotificationStore } from '@/stores/notification-store'

interface PopupItem {
  key: string
  kind: 'notice' | 'announcement'
  content: string
  extra?: string
  type?: string
  publishDate?: string
}

const slideVariants: Variants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction >= 0 ? 48 : -48,
    filter: 'blur(2px)',
  }),
  center: { opacity: 1, x: 0, filter: 'blur(0px)' },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction >= 0 ? -48 : 48,
    filter: 'blur(2px)',
  }),
}

function AnnouncementDot({ type }: { type?: string }) {
  return (
    <span
      className={cn(
        'mt-1.5 inline-block size-2 shrink-0 rounded-full',
        getAnnouncementColorClass(type)
      )}
    />
  )
}

/**
 * 公告弹窗：登录后进入后台时，如有未读公告（Notice + Announcements）直接弹出。
 * 支持"我知道了"（全部标记已读）与"今日不再提醒"（当天不再弹出，红点保留），
 * 多条未读公告可左右切换浏览。已读状态持久化在 notification-store（localStorage）。
 */
export function AnnouncementPopup() {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  const { notice, loading, unreadNoticeCount, unreadAnnouncementItems } =
    useNotifications()
  const markNoticeRead = useNotificationStore((s) => s.markNoticeRead)
  const markAnnouncementsRead = useNotificationStore(
    (s) => s.markAnnouncementsRead
  )
  const setClosedUntilDate = useNotificationStore((s) => s.setClosedUntilDate)
  const isNoticeClosed = useNotificationStore((s) => s.isNoticeClosed)

  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState(0)
  const shownRef = useRef(false)
  const confettiRef = useRef<ConfettiCannonsHandle | null>(null)

  const items = useMemo<PopupItem[]>(() => {
    const list: PopupItem[] = []
    if (unreadNoticeCount > 0 && notice) {
      list.push({ key: 'notice', kind: 'notice', content: notice })
    }
    for (const item of unreadAnnouncementItems) {
      list.push({
        key: getAnnouncementKey(item),
        kind: 'announcement',
        content: typeof item.content === 'string' ? item.content : '',
        extra:
          typeof item.extra === 'string' && item.extra ? item.extra : undefined,
        type: typeof item.type === 'string' ? item.type : undefined,
        publishDate:
          typeof item.publishDate === 'string' ? item.publishDate : undefined,
      })
    }
    return list
  }, [notice, unreadNoticeCount, unreadAnnouncementItems])

  // 每次进入后台最多自动弹出一次；"今日不再提醒"的当天不弹
  useEffect(() => {
    if (shownRef.current || loading || items.length === 0) return
    if (isNoticeClosed()) return
    shownRef.current = true
    setIndex(0)
    setDirection(0)
    setOpen(true)
  }, [loading, items.length, isNoticeClosed])

  const hasCelebration = useMemo(
    () =>
      unreadAnnouncementItems.some(
        (item: Record<string, unknown>) => item.type === 'success'
      ),
    [unreadAnnouncementItems]
  )

  useEffect(() => {
    if (!open || reduceMotion || !hasCelebration) return
    const timer = window.setTimeout(() => confettiRef.current?.fire(), 500)
    return () => window.clearTimeout(timer)
  }, [open, reduceMotion, hasCelebration])

  const safeIndex = items.length ? Math.min(index, items.length - 1) : 0
  const current = items[safeIndex]

  const goTo = useCallback((next: number, dir: number) => {
    setDirection(dir)
    setIndex(next)
  }, [])

  const goPrev = useCallback(() => {
    if (items.length === 0) return
    goTo((safeIndex - 1 + items.length) % items.length, -1)
  }, [items.length, safeIndex, goTo])

  const goNext = useCallback(() => {
    if (items.length === 0) return
    goTo((safeIndex + 1) % items.length, 1)
  }, [items.length, safeIndex, goTo])

  const handleAcknowledge = useCallback(() => {
    if (notice && unreadNoticeCount > 0) {
      markNoticeRead(notice)
    }
    const keys = unreadAnnouncementItems.map((item) => getAnnouncementKey(item))
    if (keys.length > 0) {
      markAnnouncementsRead(keys)
    }
    setOpen(false)
  }, [
    notice,
    unreadNoticeCount,
    unreadAnnouncementItems,
    markNoticeRead,
    markAnnouncementsRead,
  ])

  const handleRemindLater = useCallback(() => {
    setClosedUntilDate(new Date().toDateString())
    setOpen(false)
  }, [setClosedUntilDate])

  // 键盘操作：Esc 关闭（不标已读），左右方向键切换公告
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
      } else if (e.key === 'ArrowLeft') {
        goPrev()
      } else if (e.key === 'ArrowRight') {
        goNext()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, goPrev, goNext])

  return (
    <>
      <ConfettiCannons autoFireOnMount={false} handleRef={confettiRef} />
      <AnimatePresence>
        {open && current ? (
          <motion.div
            key='announcement-popup-overlay'
            className='fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={
              reduceMotion ? MOTION_TRANSITION.none : MOTION_TRANSITION.default
            }
            onClick={(e) => {
              if (e.target === e.currentTarget) setOpen(false)
            }}
          >
            <motion.div
              role='dialog'
              aria-modal='true'
              aria-label={t('New Announcement')}
              className='bg-background relative flex max-h-[min(92vh,56rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border shadow-2xl'
              initial={
                reduceMotion
                  ? false
                  : { opacity: 0, scale: 0.85, y: 40, filter: 'blur(8px)' }
              }
              animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
              exit={{
                opacity: 0,
                scale: 0.92,
                y: 24,
                filter: 'blur(4px)',
                transition: MOTION_TRANSITION.fast,
              }}
              transition={MOTION_TRANSITION.spring}
            >
              {/* 顶部渐变横幅 + 脉冲喇叭 */}
              <div className='from-primary/15 via-primary/5 relative shrink-0 overflow-hidden bg-gradient-to-br to-transparent px-5 pt-5 pb-4'>
                <div
                  aria-hidden='true'
                  className='bg-primary/10 pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full blur-2xl'
                />
                <div className='relative flex items-center gap-3'>
                  <div className='relative shrink-0'>
                    {!reduceMotion && (
                      <span
                        aria-hidden='true'
                        className='bg-primary/40 absolute inset-0 animate-ping rounded-full'
                      />
                    )}
                    <div className='bg-primary text-primary-foreground relative flex size-10 items-center justify-center rounded-full'>
                      <Megaphone className='size-5' />
                    </div>
                  </div>
                  <div className='min-w-0 flex-1'>
                    <h2 className='text-base leading-6 font-semibold'>
                      {t('New Announcement')}
                    </h2>
                    <p className='text-muted-foreground mt-0.5 text-xs'>
                      {t('{{count}} unread announcements', {
                        count: items.length,
                      })}
                    </p>
                  </div>
                  <span className='bg-primary/10 text-primary shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums'>
                    {safeIndex + 1} / {items.length}
                  </span>
                </div>
              </div>

              {/* 公告正文：多条时左右滑动切换；flex-1 + 原生滚动保证长内容可滚动 */}
              <div className='min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-5'>
                <AnimatePresence mode='wait' custom={direction} initial={false}>
                  <motion.div
                    key={current.key}
                    custom={direction}
                    variants={reduceMotion ? undefined : slideVariants}
                    initial='enter'
                    animate='center'
                    exit='exit'
                    transition={
                      reduceMotion
                        ? MOTION_TRANSITION.none
                        : MOTION_TRANSITION.default
                    }
                    className='py-4'
                  >
                    {current.kind === 'announcement' ? (
                      <div className='mb-3 flex items-start gap-2.5'>
                        <AnnouncementDot type={current.type} />
                        {current.publishDate ? (
                          <span className='text-muted-foreground text-xs'>
                            {formatDateTimeObject(
                              new Date(current.publishDate)
                            )}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                    <div className='text-sm'>
                      <RichContent breaks content={current.content} />
                    </div>
                    {current.extra ? (
                      <div className='text-muted-foreground mt-3 text-xs'>
                        <RichContent breaks content={current.extra} />
                      </div>
                    ) : null}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* 底部：切换导航 + 操作按钮 */}
              <div className='flex shrink-0 flex-wrap items-center justify-between gap-2 border-t px-5 py-3'>
                {items.length > 1 ? (
                  <div className='flex items-center gap-1.5'>
                    <Button
                      variant='outline'
                      size='icon'
                      className='size-7'
                      onClick={goPrev}
                      aria-label={t('Previous')}
                    >
                      <ChevronLeft className='size-4' />
                    </Button>
                    <div className='flex items-center gap-1.5 px-1'>
                      {items.map((item, i) => (
                        <button
                          key={item.key}
                          type='button'
                          onClick={() => goTo(i, i >= safeIndex ? 1 : -1)}
                          aria-label={`${t('New Announcement')} ${i + 1}`}
                          className={cn(
                            'h-1.5 rounded-full transition-all',
                            i === safeIndex
                              ? 'bg-primary w-5'
                              : 'bg-muted-foreground/40 hover:bg-muted-foreground/70 w-1.5'
                          )}
                        />
                      ))}
                    </div>
                    <Button
                      variant='outline'
                      size='icon'
                      className='size-7'
                      onClick={goNext}
                      aria-label={t('Next')}
                    >
                      <ChevronRight className='size-4' />
                    </Button>
                  </div>
                ) : (
                  <span />
                )}
                <div className='flex items-center gap-2'>
                  <Button variant='ghost' size='sm' onClick={handleRemindLater}>
                    {t("Don't remind me today")}
                  </Button>
                  <Button size='sm' onClick={handleAcknowledge}>
                    {t('I understand')}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}
