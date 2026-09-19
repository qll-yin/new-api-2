import { Link } from '@tanstack/react-router'
import { ArrowRight, Terminal as TerminalIcon, Boxes } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import AuroraBackground from '../lib/aurora-background'
import { configLinkProps } from '../lib/link'
import Terminal from '../lib/terminal'
import VideosApiCard from '../lib/videos-api-card'
import { homepageSiteConfig } from '../site'

const WORDS = [
  'Claude',
  'ChatGPT',
  'Grok',
  'Seedance',
  '可灵',
  'DeepSeek',
  '通义千问',
]

function TypingWord() {
  const reduce = useReducedMotion()
  const [wi, setWi] = useState(0)
  const [ci, setCi] = useState(0)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (reduce) return
    const word = WORDS[wi]
    const timer = setTimeout(
      () => {
        if (!deleting) {
          if (ci < word.length) setCi(ci + 1)
          else setDeleting(true)
        } else {
          if (ci > 0) setCi(ci - 1)
          else {
            setDeleting(false)
            setWi((wi + 1) % WORDS.length)
          }
        }
      },
      deleting ? 70 : 150
    )
    return () => clearTimeout(timer)
  }, [ci, deleting, wi, reduce])

  return (
    <span className='hp-text-gradient'>
      {reduce ? WORDS[0] : WORDS[wi].slice(0, ci)}
      {!reduce && (
        <span
          className='font-normal'
          style={{ animation: 'hp-caret-blink 1s step-end infinite' }}
        >
          |
        </span>
      )}
    </span>
  )
}

export default function Hero() {
  const { t } = useTranslation('homepage')
  const consoleProps = configLinkProps(homepageSiteConfig.links.console)
  const pricingProps = configLinkProps(homepageSiteConfig.links.pricing)

  return (
    <section className='relative flex min-h-screen flex-col justify-center overflow-hidden pt-24 pb-20 lg:pt-28'>
      <AuroraBackground />

      <div className='relative mx-auto w-full max-w-7xl px-6'>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className='mx-auto max-w-4xl text-center'
        >
          <div className='mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--hp-ice)]/25 bg-[var(--hp-ice)]/10 px-4 py-1.5 text-xs text-[var(--hp-frost)]'>
            <span className='h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--hp-ice)]' />
            {t('Just launched: Seedance, Sora 2, Kling 2.1 integrated')}
          </div>

          <h1 className='text-4xl leading-tight font-extrabold tracking-tight text-[var(--hp-frost)] sm:text-6xl lg:text-7xl'>
            {t('One key to connect them all')}
            <br />
            <TypingWord />
          </h1>

          <p className='mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[var(--hp-muted)] sm:text-lg'>
            {t(
              '7Code AI aggregates top chat models like Claude, ChatGPT, and Grok, image and video engines like Seedance, Kling, and Midjourney, plus audio from Suno and ElevenLabs. OpenAI-compatible, migrate with zero code changes'
            )}
          </p>

          <div className='mt-9 flex flex-wrap items-center justify-center gap-4'>
            <Link
              {...consoleProps}
              className='hp-shine group inline-flex items-center gap-2 rounded-full bg-[var(--hp-royal)] px-7 py-3.5 text-sm font-semibold text-white shadow-[var(--hp-royal)]/30 shadow-xl transition hover:bg-[var(--hp-royal-deep)] hover:shadow-[var(--hp-royal)]/50'
            >
              {t('Get started')}
              <ArrowRight
                size={16}
                className='transition-transform group-hover:translate-x-1'
              />
            </Link>
            <Link
              {...pricingProps}
              className='hp-glass inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-[var(--hp-muted)] transition hover:border-[var(--hp-ice)]/40 hover:text-[var(--hp-frost)]'
            >
              {t('View pricing')}
            </Link>
          </div>
        </motion.div>

        {/* 终端 + 接口卡 */}
        <div className='mt-16 grid gap-6 lg:grid-cols-5'>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25, ease: 'easeOut' }}
            className='lg:col-span-3'
          >
            <div className='mb-3 flex items-center gap-2 text-xs text-[var(--hp-faint)]'>
              <TerminalIcon size={14} />
              {t('Live chat API demo')}
            </div>
            <Terminal baseUrl={homepageSiteConfig.apiBaseUrl} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
            className='flex flex-col gap-6 lg:col-span-2'
          >
            <div className='mb-0 flex items-center gap-2 text-xs text-[var(--hp-faint)] lg:mt-0 lg:mb-3'>
              <Boxes size={14} />
              {t('Video generation API example')}
            </div>
            <VideosApiCard />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
