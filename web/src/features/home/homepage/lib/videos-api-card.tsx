import { Clapperboard, Copy, Check } from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const BODY = [
  ['{', 'text-[var(--hp-code-muted)]'],
  ['  "model": "seedance-1-5-pro",', 'text-[var(--hp-code-text)]'],
  ['  "prompt": "赛博朋克城市夜景，霓虹雨滴，镜头缓慢推进",', 'text-frost'],
  ['  "seconds": 8,', 'text-[var(--hp-code-text)]'],
  ['  "size": "1280x720"', 'text-[var(--hp-code-text)]'],
  ['}', 'text-[var(--hp-code-muted)]'],
] as const

/**
 * /v1/videos OpenAI 兼容接口卡片：悬停上浮发光
 */
export default function VideosApiCard() {
  const { t } = useTranslation('homepage')
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    const text = `POST /v1/videos\n${BODY.map(([l]) => l).join('\n')}`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* 剪贴板不可用时静默忽略 */
    }
  }

  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className='hp-glass hp-glow-border relative rounded-2xl p-5 shadow-xl shadow-black/40'
    >
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2 text-sm font-semibold text-[var(--hp-frost)]'>
          <span className='flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--hp-ice)]/15 text-[var(--hp-ice)]'>
            <Clapperboard size={16} />
          </span>
          {t('Video generation')}
          <span className='rounded-full border border-[var(--hp-ice)]/40 bg-[var(--hp-ice)]/10 px-2 py-0.5 text-[10px] font-normal text-[var(--hp-frost)]'>
            OpenAI
          </span>
        </div>
        <button
          type='button'
          onClick={copy}
          className='flex items-center gap-1 rounded-md border border-[var(--hp-line)] px-2 py-1 text-xs text-[var(--hp-muted)] transition hover:border-[var(--hp-moon)] hover:text-[var(--hp-frost)]'
        >
          {copied ? (
            <Check size={13} className='text-emerald-400' />
          ) : (
            <Copy size={13} />
          )}
          {copied ? t('Copied') : t('Copy')}
        </button>
      </div>

      <div className='mt-4 space-y-1 rounded-xl bg-[var(--hp-code-bg)] p-4 font-mono text-[12.5px] leading-relaxed'>
        <div>
          <span className='font-bold text-[var(--hp-ice)]'>POST</span>{' '}
          <span className='text-[var(--hp-code-text)]'>/v1/videos</span>
          <span className='ml-2 text-[var(--hp-code-muted)]'>
            {t('One-line video access')}
          </span>
        </div>
        {BODY.map(([line, color]) => (
          <div
            key={line}
            className={
              color === 'text-frost' ? 'text-[var(--hp-frost)]' : color
            }
          >
            {line}
          </div>
        ))}
      </div>

      <div className='mt-3 flex items-center gap-2 text-xs text-[var(--hp-muted)]'>
        <span className='h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400' />
        {t('Returns a task ID, poll or use a webhook to get the mp4 URL')}
      </div>
    </motion.div>
  )
}
