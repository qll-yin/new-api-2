import { useTranslation } from 'react-i18next'

import { BrandIcon } from '../brand-icons'
import models from '../models.json'

function BrandChip({ name, icon, tag }: (typeof models.models)[number]) {
  return (
    <div className='hp-glass hp-shine mx-3 flex shrink-0 items-center gap-3 rounded-2xl px-6 py-4 transition hover:border-[var(--hp-ice)]/40 hover:shadow-[var(--hp-ice)]/15 hover:shadow-lg'>
      <span className='flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--hp-chip-icon-bg)]'>
        <BrandIcon name={icon} size={18} />
      </span>
      <div className='whitespace-nowrap'>
        <div className='text-sm font-semibold text-[var(--hp-text)]'>
          {name}
        </div>
        <div className='text-[11px] text-[var(--hp-faint)]'>{tag}</div>
      </div>
    </div>
  )
}

export default function BrandMarquee() {
  const { t } = useTranslation('homepage')
  const half = Math.ceil(models.models.length / 2)
  // 跑马灯需要首尾相接：每个条目复制一份，copy 作为唯一 key 的一部分
  const row1 = models.models.slice(0, half).flatMap((m) => [
    { ...m, key: `${m.name}-0` },
    { ...m, key: `${m.name}-1` },
  ])
  const row2 = models.models.slice(half).flatMap((m) => [
    { ...m, key: `${m.name}-0` },
    { ...m, key: `${m.name}-1` },
  ])

  return (
    <section id='homepage-models' className='relative py-20'>
      <div className='mx-auto mb-10 max-w-7xl px-6 text-center'>
        <p className='text-xs font-semibold tracking-[0.3em] text-[var(--hp-ice)] uppercase'>
          {t('Models')}
        </p>
        <h2 className='mt-3 text-3xl font-bold text-[var(--hp-frost)] sm:text-4xl'>
          {t('120+ mainstream models, more arriving continuously')}
        </h2>
        <p className='mx-auto mt-4 max-w-xl text-sm text-[var(--hp-muted)]'>
          {t(
            'Chat, image, and video fully covered, new models land first here'
          )}
        </p>
      </div>

      <div className='hp-marquee-paused relative space-y-5'>
        {/* 边缘渐隐 */}
        <div className='pointer-events-none absolute inset-y-0 left-0 z-10 w-32 bg-gradient-to-r from-[var(--hp-bg)] to-transparent' />
        <div className='pointer-events-none absolute inset-y-0 right-0 z-10 w-32 bg-gradient-to-l from-[var(--hp-bg)] to-transparent' />

        <div className='flex overflow-hidden'>
          <div
            className='hp-animate-marquee-left flex'
            style={{ '--marquee-duration': '46s' } as React.CSSProperties}
          >
            {row1.map(({ key: _key, ...b }) => (
              <BrandChip key={_key} {...b} />
            ))}
          </div>
        </div>
        <div className='flex overflow-hidden'>
          <div
            className='hp-animate-marquee-right flex'
            style={{ '--marquee-duration': '52s' } as React.CSSProperties}
          >
            {row2.map(({ key: _key, ...b }) => (
              <BrandChip key={_key} {...b} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
