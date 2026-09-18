import { Link } from '@tanstack/react-router'
import { Check, Zap } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { pricingTiers } from '../data'
import { configLinkProps } from '../lib/link'
import Reveal from '../lib/reveal'
import { homepageSiteConfig } from '../site'

// 每档套餐对应的跳转链接（配置在 site.ts）
const CTA_LINKS: Record<string, string> = {
  payg: homepageSiteConfig.links.recharge,
  member: homepageSiteConfig.links.member,
  business: homepageSiteConfig.links.business,
}

export default function Pricing() {
  const { t } = useTranslation('homepage')
  return (
    <section
      id='homepage-pricing'
      className='relative mx-auto max-w-6xl px-6 py-20'
    >
      <Reveal className='mb-12 text-center'>
        <p className='text-xs font-semibold tracking-[0.3em] text-[var(--hp-ice)] uppercase'>
          {t('Pricing')}
        </p>
        <h2 className='mt-3 text-3xl font-bold text-[var(--hp-frost)] sm:text-4xl'>
          {t('Flexible billing, transparent control')}
        </h2>
      </Reveal>

      <div className='grid gap-6 md:grid-cols-3'>
        {pricingTiers.map((p, i) => (
          <Reveal key={p.name} delay={i * 0.1}>
            <div
              className={`hp-glass relative h-full rounded-3xl p-7 transition-transform duration-300 hover:-translate-y-2 ${
                p.highlight
                  ? 'border-[var(--hp-ice)]/50 shadow-[var(--hp-ice)]/15 shadow-2xl'
                  : 'hover:border-white/25'
              }`}
            >
              {p.highlight && (
                <span className='absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-[var(--hp-royal)] px-3 py-1 text-[11px] font-semibold text-white'>
                  <Zap size={11} /> {t('Most popular')}
                </span>
              )}
              <h3 className='text-lg font-bold text-[var(--hp-frost)]'>
                {t(p.nameKey)}
              </h3>
              <div className='mt-2 text-2xl font-extrabold text-[var(--hp-frost)]'>
                {t(p.priceKey)}
              </div>
              <p className='mt-1 text-sm text-[var(--hp-muted)]'>
                {t(p.descKey)}
              </p>
              <ul className='mt-6 space-y-3'>
                {p.featureKeys.map((f) => (
                  <li
                    key={f}
                    className='flex items-start gap-2.5 text-sm text-[var(--hp-text)]'
                  >
                    <Check
                      size={16}
                      className='mt-0.5 shrink-0 text-emerald-400'
                    />
                    {t(f)}
                  </li>
                ))}
              </ul>
              {p.disabled ? (
                <span
                  aria-disabled
                  className='mt-7 block cursor-not-allowed rounded-full border border-white/10 bg-white/5 py-3 text-center text-sm font-semibold text-[var(--hp-faint)] select-none'
                >
                  {t(p.ctaKey)}
                </span>
              ) : (
                <Link
                  {...configLinkProps(CTA_LINKS[p.name] ?? '#')}
                  className={`mt-7 block rounded-full py-3 text-center text-sm font-semibold transition ${
                    p.highlight
                      ? 'hp-shine bg-[var(--hp-royal)] text-white shadow-[var(--hp-royal)]/30 shadow-lg hover:bg-[var(--hp-royal-deep)]'
                      : 'border border-white/15 text-[var(--hp-muted)] hover:border-white/35 hover:text-[var(--hp-frost)]'
                  }`}
                >
                  {t(p.ctaKey)}
                </Link>
              )}
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
