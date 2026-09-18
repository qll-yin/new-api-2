/**
 * 7Code 首页主题：文案数据
 * 画廊条目、统计数字、定价卡、FAQ 等内容集中在这里，改这个文件即可全站生效。
 * 文案已接入 i18n（homepage 命名空间）：带 Key 后缀的字段是语言字典里的 key，
 * 新增条目时需同步在 7 个语言文件的 homepage 字典里补 key。
 */

/** 画廊条目：图片路径与类型标签（类型 key 用于图标与颜色） */
export interface GalleryItem {
  src: string
  label: string
  typeKey: 'video' | 'image'
  ratio: string
}

export const galleryItems: GalleryItem[] = [
  {
    src: '/images/homepage/gallery-01.webp',
    label: 'Seedance 2.5',
    typeKey: 'video',
    ratio: 'aspect-[3/4]',
  },
  {
    src: '/images/homepage/gallery-02.webp',
    label: 'Midjourney v7',
    typeKey: 'image',
    ratio: 'aspect-square',
  },
  {
    src: '/images/homepage/gallery-03.webp',
    label: 'Kling 2.1',
    typeKey: 'video',
    ratio: 'aspect-video',
  },
  {
    src: '/images/homepage/gallery-04.webp',
    label: 'Flux.2 Pro',
    typeKey: 'image',
    ratio: 'aspect-[3/4]',
  },
  {
    src: '/images/homepage/gallery-05.webp',
    label: 'GPT Image 2.0',
    typeKey: 'image',
    ratio: 'aspect-video',
  },
  {
    src: '/images/homepage/gallery-06.webp',
    label: 'Jimeng Video',
    typeKey: 'video',
    ratio: 'aspect-square',
  },
  {
    src: '/images/homepage/gallery-07.webp',
    label: 'Sora 2',
    typeKey: 'video',
    ratio: 'aspect-[3/4]',
  },
  {
    src: '/images/homepage/gallery-08.webp',
    label: 'Stable Diffusion',
    typeKey: 'image',
    ratio: 'aspect-video',
  },
  {
    src: '/images/homepage/gallery-09.webp',
    label: 'Hunyuan Image',
    typeKey: 'image',
    ratio: 'aspect-square',
  },
  {
    src: '/images/homepage/gallery-10.webp',
    label: 'Runway Gen-4',
    typeKey: 'video',
    ratio: 'aspect-[3/4]',
  },
]

export const capabilityImage = '/images/homepage/gallery-11.webp'

export interface StatItem {
  /**
   * 数字展示的 i18n key（key 本身含数字，如 '3800W+'；
   * 各语言可换成 '38M+' 等等，动画会解析翻译值开头的数字） */
  displayKey: string
  labelKey: string
}

export const stats: StatItem[] = [
  { displayKey: '120+', labelKey: 'Models integrated' },
  { displayKey: '3800W+', labelKey: 'Daily tokens' },
  { displayKey: '99.9%', labelKey: 'Service uptime' },
  { displayKey: '45ms', labelKey: 'Avg first-token latency' },
]

export type PricingTier = {
  /** 站内档位标识（用于查 CTA 链接，不展示） */
  name: 'payg' | 'member' | 'business'
  nameKey: string
  priceKey: string
  descKey: string
  featureKeys: string[]
  ctaKey: string
  highlight?: boolean
  disabled?: boolean
}

export const pricingTiers: PricingTier[] = [
  {
    name: 'payg',
    nameKey: 'Pay-as-you-go',
    priceKey: 'Top up and use',
    descKey: 'For individual developers, pay only for what you use',
    featureKeys: [
      'All models available',
      'OpenAI-compatible API',
      'Balance never expires',
      'Unlimited concurrency',
    ],
    ctaKey: 'Top up now',
    highlight: false,
  },
  {
    name: 'member',
    nameKey: 'Membership',
    priceKey: '¥99 / month',
    descKey: 'For heavy users, lower overall discounts',
    featureKeys: [
      'All models available',
      'At least 10% off all models',
      'Priority queue',
      'Dedicated support channel',
      'Free credits every month',
    ],
    ctaKey: 'Coming soon',
    highlight: true,
    disabled: true,
  },
  {
    name: 'business',
    nameKey: 'Enterprise',
    priceKey: 'Contact us',
    descKey: 'For teams and platforms, dedicated channels',
    featureKeys: [
      'Dedicated gateway and keys',
      'SLA guarantee',
      'Billing terms and invoicing',
      'Private deployment optional',
    ],
    ctaKey: 'Business inquiry',
    highlight: false,
  },
]

export interface FaqItem {
  q: string
  a: string
}

export const faqs: FaqItem[] = [
  {
    q: 'What is 7Code AI',
    a: '7Code AI is a unified LLM API gateway that aggregates chat, image, video, and audio capabilities from Claude, ChatGPT, Grok, Seedance, and mainstream Chinese models behind one OpenAI-compatible interface. Register and get one Key to call every model',
  },
  {
    q: 'Is the API OpenAI-compatible',
    a: 'Fully compatible. Chat uses /v1/chat/completions, image generation uses /v1/images/generations, and video uses /v1/videos. Just point your base_url at 7Code AI and existing code migrates with almost zero changes',
  },
  {
    q: 'Which models are supported',
    a: 'Mainstream models at home and abroad are continuously integrated: Claude, GPT, Grok, Gemini, DeepSeek, Kimi, Qwen, Doubao, plus Seedance, Kling, Jimeng, Midjourney, Flux and other image and video models. See the console model list for the latest lineup',
  },
  {
    q: 'How does billing work',
    a: 'You are billed by actual usage, aligned with official rates and discounted. The console shows per-key consumption details, logs, and balance in real time, with both pay-as-you-go top-ups and memberships supported',
  },
  {
    q: 'How are stability and concurrency guaranteed',
    a: 'Concurrency is unlimited site-wide, with multi-upstream automatic failover so a single point of failure never affects availability. Members enjoy priority queues and more stable high-volume performance, and enterprises can purchase dedicated gateways with SLA guarantees',
  },
]
