import { useTheme } from '@/context/theme-provider'

import './homepage.css'

import BrandMarquee from './sections/brand-marquee'
import Capabilities from './sections/capabilities'
import Faq from './sections/faq'
import FlowGallery from './sections/flow-gallery'
import Hero from './sections/hero'
import Pricing from './sections/pricing'
import SiteFooter from './sections/site-footer'
import StatsBand from './sections/stats-band'

/**
 * 7Code 首页主题。
 * 不带自己的导航：直接渲染在 new-api 的 PublicLayout 里，
 * 顶栏（消息通知、语言切换、登录）由宿主布局提供，页脚用主题自带的
 * 7Code 风格 SiteFooter（保留 New API 项目署名行）。
 * 配色跟随站内明暗模式：.dark 时使用原版暗色变量，否则使用亮色版。
 */
export function HomepageTheme() {
  const { resolvedTheme } = useTheme()
  return (
    <div className={`hp-theme ${resolvedTheme === 'dark' ? 'dark-theme' : ''}`}>
      <Hero />
      <BrandMarquee />
      <FlowGallery />
      <Capabilities />
      <StatsBand />
      <Pricing />
      <Faq />
      <SiteFooter />
    </div>
  )
}
