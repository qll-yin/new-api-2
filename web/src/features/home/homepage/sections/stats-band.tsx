import { useInView, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { stats } from '../data'

/** 数字滚动：解析展示 key 翻译值开头的数字（如 '3800W+' → 3800），滚动后接回后缀 */
function useCountUp(display: string, start: boolean): string {
  const reduce = useReducedMotion()
  const match = /^[0-9][0-9.,]*/.exec(display)
  const numberPart = match?.[0] ?? ''
  const target = numberPart ? Number(numberPart.replaceAll(',', '')) : null
  const [value, setValue] = useState(target ?? 0)

  useEffect(() => {
    if (target === null) return
    if (!start) {
      setValue(0)
      return
    }
    if (reduce) {
      setValue(target)
      return
    }
    const duration = 1600
    const t0 = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min((t - t0) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(target * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [start, target, reduce])

  if (target === null) return display
  const decimals = numberPart.includes('.')
    ? numberPart.split('.').length - 1
    : 0
  const rendered =
    start || reduce ? value.toFixed(decimals) : (0).toFixed(decimals)
  return display.replace(numberPart, rendered)
}

function StatItemView({
  displayKey,
  labelKey,
  start,
}: {
  displayKey: string
  labelKey: string
  start: boolean
}) {
  const { t } = useTranslation('homepage')
  const display = useCountUp(t(displayKey), start)
  return (
    <div className='text-center'>
      <span className='text-4xl font-extrabold text-[var(--hp-frost)] sm:text-5xl'>
        {display}
      </span>
      <div className='mt-2 text-sm text-[var(--hp-muted)]'>{t(labelKey)}</div>
    </div>
  )
}

export default function StatsBand() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <section className='relative py-14'>
      <div
        ref={ref}
        className='mx-auto grid max-w-5xl grid-cols-2 gap-y-10 rounded-3xl border border-[var(--hp-line)] bg-white/[0.02] px-8 py-10 sm:grid-cols-4'
      >
        {stats.map((s) => (
          <StatItemView
            key={s.labelKey}
            displayKey={s.displayKey}
            labelKey={s.labelKey}
            start={inView}
          />
        ))}
      </div>
    </section>
  )
}
