import {
  MessageSquare,
  Image as ImageIcon,
  Clapperboard,
  Plug,
  AudioLines,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { capabilityImage } from '../data'
import Reveal from '../lib/reveal'
import TiltCard from '../lib/tilt-card'
import { homepageSiteConfig } from '../site'

const CHAT_DEMO_KEYS = [
  { role: 'user', textKey: 'Explain API gateways in one sentence' },
  {
    role: 'bot',
    textKey:
      'Merge many model providers into one address and one key, you just call it',
  },
  { role: 'user', textKey: 'Does it support video generation' },
  {
    role: 'bot',
    textKey: 'Yes, /v1/videos already covers Seedance, Kling, Sora and more',
  },
]

function ChatDemo() {
  const { t } = useTranslation('homepage')
  return (
    <div className='mt-4 h-44 space-y-2.5 overflow-hidden rounded-xl bg-black/30 [mask-image:linear-gradient(to_bottom,transparent,#000_12%,#000_88%,transparent)] p-3.5'>
      <div className='space-y-2.5'>
        {CHAT_DEMO_KEYS.map((m) => (
          <div
            key={m.textKey}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                m.role === 'user'
                  ? 'rounded-br-sm bg-gradient-to-r from-[var(--hp-ice)]/40 to-[var(--hp-steel)]/80 text-white'
                  : 'rounded-bl-sm border border-white/10 bg-white/5 text-slate-200'
              }`}
            >
              {t(m.textKey)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AudioDemo() {
  const { t } = useTranslation('homepage')
  // 均衡器柱条：高度错落 + 动画延迟错开，模拟播放中的音频
  const bars = [
    0.5, 0.8, 0.35, 0.95, 0.6, 1, 0.45, 0.75, 0.55, 0.9, 0.4, 0.7, 0.85, 0.5,
    0.65, 0.3,
  ]
  return (
    <div className='mt-4 flex h-44 flex-col justify-between rounded-xl bg-black/30 p-4'>
      <div className='flex h-14 items-center justify-center gap-1.5'>
        {bars.map((h, i) => (
          <span
            key={`${bars.slice(0, i + 1).filter((v) => v === h).length}-${h}`}
            className='w-1.5 origin-center rounded-full bg-gradient-to-t from-[var(--hp-royal)] to-[var(--hp-ice)]'
            style={{
              height: `${h * 100}%`,
              animation: `hp-eq-bounce ${0.9 + (i % 5) * 0.17}s ease-in-out ${i * 0.07}s infinite`,
            }}
          />
        ))}
      </div>
      <div className='flex items-center justify-between text-xs'>
        <span className='truncate text-slate-300'>
          🎵 {t('A jazz tune about code')}
        </span>
        <span className='ml-3 shrink-0 font-mono text-slate-500'>02:47</span>
      </div>
    </div>
  )
}

export default function Capabilities() {
  const { t } = useTranslation('homepage')
  return (
    <section
      id='homepage-capabilities'
      className='relative mx-auto max-w-7xl px-6 py-20'
    >
      <Reveal className='mb-12 text-center'>
        <p className='text-xs font-semibold tracking-[0.3em] text-[var(--hp-ice)] uppercase'>
          {t('Capabilities')}
        </p>
        <h2 className='mt-3 text-3xl font-bold text-[var(--hp-frost)] sm:text-4xl'>
          {t('Four capabilities, one interface')}
        </h2>
      </Reveal>

      <div className='grid gap-6 md:grid-cols-2 xl:grid-cols-4'>
        {/* 对话 */}
        <Reveal delay={0}>
          <TiltCard className='hp-glass hp-glow-border h-full rounded-3xl p-6'>
            <span className='flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--hp-ice)]/15 text-[var(--hp-ice)]'>
              <MessageSquare size={20} />
            </span>
            <h3 className='mt-4 text-lg font-bold text-[var(--hp-frost)]'>
              {t('Chat models')}
            </h3>
            <p className='mt-1.5 text-sm text-[var(--hp-muted)]'>
              {t(
                'Full Claude, GPT, Grok, and DeepSeek lines with streaming output and smart routing to the fastest available upstream'
              )}
            </p>
            <ChatDemo />
          </TiltCard>
        </Reveal>

        {/* 生图 */}
        <Reveal delay={0.1}>
          <TiltCard className='hp-glass hp-glow-border h-full overflow-hidden rounded-3xl'>
            <div className='group relative h-40 overflow-hidden'>
              <img
                src={capabilityImage}
                alt={t('Image generation')}
                className='h-full w-full object-cover transition-transform duration-700 group-hover:scale-110'
              />
              <div className='absolute inset-0 bg-gradient-to-t from-[var(--hp-card)] to-transparent' />
            </div>
            <div className='pt-3 pb-6'>
              <div className='px-6'>
                <span className='flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--hp-moon)]/15 text-[var(--hp-moon)]'>
                  <ImageIcon size={20} />
                </span>
                <h3 className='mt-4 text-lg font-bold text-[var(--hp-frost)]'>
                  {t('Image generation')}
                </h3>
                <p className='mt-1.5 text-sm text-[var(--hp-muted)]'>
                  {t(
                    'GPT-Image, Nano Banana, Grok and more, unified billing, text-to-image and image-to-image'
                  )}
                </p>
              </div>
            </div>
          </TiltCard>
        </Reveal>

        {/* 生视频 */}
        <Reveal delay={0.2}>
          <TiltCard className='hp-glass hp-glow-border h-full overflow-hidden rounded-3xl'>
            <div className='group relative h-40 overflow-hidden'>
              {/* 视频未就绪时自动显示动画占位层，不破版 */}
              <video
                className='h-full w-full object-cover'
                src={homepageSiteConfig.videos.demoUrl}
                muted
                loop
                playsInline
                onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                onMouseLeave={(e) => e.currentTarget.pause()}
              />
              <div
                className='absolute inset-0 -z-10'
                style={{
                  background:
                    'linear-gradient(120deg, #0d0f1a, #1a1f3a, #2c3159, #0d0f1a)',
                  backgroundSize: '300% 300%',
                  animation: 'hp-gradient-x 8s ease infinite',
                }}
              />
              <div className='absolute inset-0 bg-gradient-to-t from-[var(--hp-card)] to-transparent' />
            </div>
            <div className='pt-3 pb-6'>
              <div className='px-6'>
                <span className='flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--hp-ice)]/15 text-[var(--hp-ice)]'>
                  <Clapperboard size={20} />
                </span>
                <h3 className='mt-4 text-lg font-bold text-[var(--hp-frost)]'>
                  {t('Video generation')}
                </h3>
                <p className='mt-1.5 text-sm text-[var(--hp-muted)]'>
                  {t(
                    'Seedance, Hailuo, Jimeng, Sora with async tasks and webhook callbacks, hover to preview'
                  )}
                </p>
              </div>
            </div>
          </TiltCard>
        </Reveal>

        {/* 音频 */}
        <Reveal delay={0.3}>
          <TiltCard className='hp-glass hp-glow-border h-full rounded-3xl p-6'>
            <span className='flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--hp-ice)]/15 text-[var(--hp-ice)]'>
              <AudioLines size={20} />
            </span>
            <h3 className='mt-4 text-lg font-bold text-[var(--hp-frost)]'>
              {t('Audio generation')}
            </h3>
            <p className='mt-1.5 text-sm text-[var(--hp-muted)]'>
              {t(
                'Suno and Udio music creation, ElevenLabs speech synthesis and cloning, TTS and dubbing in one place'
              )}
            </p>
            <AudioDemo />
          </TiltCard>
        </Reveal>
      </div>

      {/* 统一接入横条 */}
      <Reveal delay={0.15}>
        <div className='hp-glass mt-6 flex flex-col items-center justify-between gap-5 rounded-3xl p-6 sm:flex-row sm:p-8'>
          <div className='flex items-center gap-4'>
            <span className='flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--hp-moon)]/15 text-[var(--hp-moon)]'>
              <Plug size={22} />
            </span>
            <div>
              <h3 className='text-lg font-bold text-[var(--hp-frost)]'>
                {t('Fully OpenAI compatible')}
              </h3>
              <p className='mt-1 text-sm text-[var(--hp-muted)]'>
                {t(
                  'Just swap the base URL and key, existing SDKs, frameworks, and apps migrate with zero changes'
                )}
              </p>
            </div>
          </div>
          <code className='w-full rounded-xl bg-black/40 px-4 py-3 font-mono text-xs text-[var(--hp-frost)] sm:w-auto'>
            base_url ={' '}
            <span className='text-white'>
              &quot;{homepageSiteConfig.apiBaseUrl}&quot;
            </span>
          </code>
        </div>
      </Reveal>
    </section>
  )
}
