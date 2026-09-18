import { ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { faqs } from '../data'

export default function Faq() {
  const { t } = useTranslation('homepage')
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section
      id='homepage-faq'
      className='relative mx-auto max-w-3xl px-6 py-20'
    >
      <div className='mb-10 text-center'>
        <p className='text-xs font-semibold tracking-[0.3em] text-[var(--hp-ice)] uppercase'>
          FAQ
        </p>
        <h2 className='mt-3 text-3xl font-bold text-[var(--hp-frost)] sm:text-4xl'>
          {t('Frequently asked questions')}
        </h2>
      </div>

      <div className='space-y-3'>
        {faqs.map((f, i) => {
          const isOpen = open === i
          return (
            <div
              key={f.q}
              className={`hp-glass overflow-hidden rounded-2xl transition-colors ${
                isOpen ? 'border-[var(--hp-ice)]/40' : ''
              }`}
            >
              <button
                type='button'
                onClick={() => setOpen(isOpen ? null : i)}
                className='flex w-full items-center justify-between px-5 py-4 text-left'
              >
                <span className='font-medium text-[var(--hp-text)]'>
                  {t(f.q)}
                </span>
                <ChevronDown
                  size={18}
                  className={`shrink-0 text-[var(--hp-muted)] transition-transform duration-300 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                  >
                    <p className='px-5 pb-5 text-sm leading-relaxed text-[var(--hp-muted)]'>
                      {t(f.a)}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </section>
  )
}
