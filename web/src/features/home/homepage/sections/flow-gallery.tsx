import { Play, Image as ImageIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { galleryItems, type GalleryItem } from '../data'

function GalleryCard({ src, label, typeKey, ratio }: GalleryItem) {
  const { t } = useTranslation('homepage')
  const isVideo = typeKey === 'video'
  return (
    <div
      className={`hp-shine group relative mx-3 w-64 shrink-0 overflow-hidden rounded-2xl border border-[var(--hp-line)] bg-[var(--hp-card)] ${ratio} transition-all duration-500 hover:-translate-y-2 hover:border-[var(--hp-ice)]/50 hover:shadow-[var(--hp-ice)]/20 hover:shadow-2xl`}
    >
      <img
        src={src}
        alt={label}
        loading='lazy'
        className='absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110'
      />
      <div className='absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent opacity-80 transition-opacity group-hover:opacity-100' />
      <div className='absolute right-3 bottom-3 left-3 flex items-center justify-between'>
        <div>
          <div className='text-sm font-semibold text-white'>{label}</div>
          <div className='text-[11px] text-slate-300/80'>via 7Code AI</div>
        </div>
        <span
          className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] ${
            isVideo
              ? 'bg-[var(--hp-ice)]/20 text-[var(--hp-frost)]'
              : 'bg-[var(--hp-moon)]/20 text-[var(--hp-moon)]'
          }`}
        >
          {isVideo ? <Play size={10} /> : <ImageIcon size={10} />}
          {isVideo ? t('Video') : t('Image')}
        </span>
      </div>
    </div>
  )
}

export default function FlowGallery() {
  const { t } = useTranslation('homepage')
  // 跑马灯需要首尾相接：整组条目复制一份（组内不复读，避免相邻出现两个同款），
  // key 由数据 + 副本号唯一确定，动画位移 -50% 恰好等于一组宽度，无缝循环。
  // 两行都放全部作品（第二行轮转半组排序），保证同图在屏内的重复间距大于视口宽度
  const all = [...galleryItems.slice(5), ...galleryItems.slice(0, 5)]
  const row1 = [
    ...galleryItems.map((it) => ({ ...it, key: `${it.label}-a` })),
    ...galleryItems.map((it) => ({ ...it, key: `${it.label}-b` })),
  ]
  const row2 = [
    ...all.map((it) => ({ ...it, key: `${it.label}-a` })),
    ...all.map((it) => ({ ...it, key: `${it.label}-b` })),
  ]

  return (
    <section id='homepage-gallery' className='relative overflow-hidden py-20'>
      <div className='mx-auto mb-10 max-w-7xl px-6 text-center'>
        <p className='text-xs font-semibold tracking-[0.3em] text-[var(--hp-ice)] uppercase'>
          {t('Gallery')}
        </p>
        <h2 className='mt-3 text-3xl font-bold text-[var(--hp-frost)] sm:text-4xl'>
          {t('Flowing inspiration generated with 7Code AI')}
        </h2>
        <p className='mx-auto mt-4 max-w-xl text-sm text-[var(--hp-muted)]'>
          {t(
            'All works below were generated through the platform API, hover for details'
          )}
        </p>
      </div>

      <div className='hp-marquee-paused space-y-6'>
        <div className='pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[var(--hp-bg)] to-transparent' />
        <div className='pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[var(--hp-bg)] to-transparent' />

        <div className='flex overflow-hidden'>
          <div
            className='hp-animate-marquee-left flex'
            style={{ '--marquee-duration': '60s' } as React.CSSProperties}
          >
            {row1.map(({ key: _key, ...it }) => (
              <GalleryCard key={_key} {...it} />
            ))}
          </div>
        </div>
        <div className='flex overflow-hidden'>
          <div
            className='hp-animate-marquee-right flex'
            style={{ '--marquee-duration': '68s' } as React.CSSProperties}
          >
            {row2.map(({ key: _key, ...it }) => (
              <GalleryCard key={_key} {...it} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
