import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { useStatus } from '@/hooks/use-status'

import { configLinkProps } from '../lib/link'
import { homepageSiteConfig } from '../site'

/**
 * 7Code 风格页脚：品牌 + 站内导航 + 版权行。
 * 链接走 new-api 站内路由；用户协议/隐私政策跟随后台开关显示；
 * New API 项目署名行保留（AGPL 归属要求，不可移除）。
 */
export default function SiteFooter() {
  const { t } = useTranslation()
  const { status } = useStatus()
  const currentYear = new Date().getFullYear()
  const pricingProps = configLinkProps(homepageSiteConfig.links.pricing)

  const navItemClass =
    'text-[var(--hp-muted)] transition hover:text-[var(--hp-frost)]'

  return (
    <footer className='border-t border-[var(--hp-line)] py-12'>
      <div className='mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 px-6 sm:flex-row'>
        <div className='flex items-center gap-2.5'>
          <img
            src='/images/homepage/logo.svg'
            alt='7Code AI'
            className='h-7 w-7'
          />
          <span className='text-lg font-bold text-[var(--hp-frost)]'>
            7Code <span className='hp-text-gradient'>AI</span>
          </span>
        </div>

        <nav className='flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-sm'>
          <Link {...pricingProps} className={navItemClass}>
            {t('Model Square')}
          </Link>
          <a href='#homepage-faq' className={navItemClass}>
            {t('FAQ')}
          </a>
          {status?.user_agreement_enabled && (
            <Link to='/user-agreement' className={navItemClass}>
              {t('User Agreement')}
            </Link>
          )}
          {status?.privacy_policy_enabled && (
            <Link to='/privacy-policy' className={navItemClass}>
              {t('Privacy Policy')}
            </Link>
          )}
        </nav>

        <div className='text-center text-xs text-[var(--hp-faint)] sm:text-right'>
          <div>© {currentYear} 7Code AI. All rights reserved.</div>
        </div>
      </div>
    </footer>
  )
}
