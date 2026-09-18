import { PartyPopper, ExternalLink } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

/** 连续点击判定窗口：窗口内的点击次数累计，超时重新计数 */
const CLICK_WINDOW_MS = 2500
/** 触发彩蛋需要的连续点击次数 */
const REQUIRED_CLICKS = 5
/** 弹窗展示到自动跳转的延迟 */
const JUMP_DELAY_MS = 1200

/**
 * 首页彩蛋：快速连续点击 5 次后弹窗提示，并在新标签页打开配置的 URL。
 * - url 为空时整体关闭（不监听任何事件）
 * - 链接/按钮等交互元素上的点击不计数，避免干扰正常操作
 * - 延迟跳转若被浏览器弹窗拦截，卡片降级为「立即前往」按钮（用户手势必开）
 */
export function HomeEasterEgg({ url }: { url: string }) {
  const { t } = useTranslation('homepage')
  const [open, setOpen] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const clickTimes = useRef<number[]>([])
  const jumpTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const urlRef = useRef(url)
  urlRef.current = url

  const clearTimer = useCallback(() => {
    if (jumpTimer.current) {
      clearTimeout(jumpTimer.current)
      jumpTimer.current = null
    }
  }, [])

  const openEgg = useCallback(() => {
    setOpen(true)
    setBlocked(false)
    // 延迟跳转：浏览器用户激活窗口一般 ≥ 5s，1.2s 内调用不被拦截；
    // 万一被拦截，卡片自动降级为手动按钮
    jumpTimer.current = setTimeout(() => {
      const win = window.open(urlRef.current, '_blank', 'noopener,noreferrer')
      if (!win) setBlocked(true)
    }, JUMP_DELAY_MS)
  }, [])

  const handleDismiss = useCallback(() => {
    clearTimer()
    setOpen(false)
  }, [clearTimer])

  useEffect(() => {
    if (!url) return

    const isInteractive = (el: EventTarget | null): boolean => {
      if (!(el instanceof Element)) return false
      return !!el.closest('a, button, input, textarea, select, [role="button"]')
    }

    const onClick = (e: MouseEvent) => {
      if (isInteractive(e.target)) return
      const now = Date.now()
      const times = clickTimes.current
      times.push(now)
      // 只保留时间窗口内的点击
      while (times.length > 0 && now - times[0] > CLICK_WINDOW_MS) {
        times.shift()
      }
      if (times.length >= REQUIRED_CLICKS) {
        times.length = 0
        openEgg()
      }
    }

    document.addEventListener('click', onClick)
    return () => {
      document.removeEventListener('click', onClick)
    }
  }, [url, openEgg])

  useEffect(
    () => () => {
      clearTimer()
    },
    [clearTimer]
  )

  if (!url) return null

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key='easter-egg-overlay'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className='fixed inset-0 z-[110] flex items-center justify-center bg-black/45 backdrop-blur-sm'
          onClick={handleDismiss}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 24, filter: 'blur(6px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.9, y: 12, filter: 'blur(4px)' }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            className='relative mx-4 flex max-w-sm flex-col items-center gap-4 rounded-2xl bg-white/10 p-8 text-center shadow-2xl ring-1 ring-white/20 backdrop-blur-xl'
            onClick={(e) => e.stopPropagation()}
          >
            <span className='relative flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-400 to-blue-600 text-white shadow-lg shadow-indigo-500/40'>
              <PartyPopper size={26} />
              <span className='absolute inset-0 -z-10 animate-ping rounded-2xl bg-indigo-400/50' />
            </span>

            <div className='space-y-1.5'>
              <div className='text-lg font-semibold text-white'>
                🎉 {t('Congratulations, you found the secret page')}
              </div>
              <div className='text-sm text-white/80'>
                {t('Opening in a new tab')}…
              </div>
            </div>

            {blocked && (
              <Button
                size='sm'
                className='gap-1.5'
                onClick={() =>
                  window.open(urlRef.current, '_blank', 'noopener,noreferrer')
                }
              >
                <ExternalLink size={14} />
                {t('Go now')}
              </Button>
            )}

            {/* 跳转进度条 */}
            <motion.div
              className='h-1 w-full overflow-hidden rounded-full bg-white/20'
              initial={false}
            >
              <motion.div
                className='h-full rounded-full bg-gradient-to-r from-indigo-400 to-blue-500'
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: JUMP_DELAY_MS / 1000, ease: 'linear' }}
              />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
