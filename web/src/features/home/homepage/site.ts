/**
 * 7Code 首页主题：全站链接 / 开关配置
 * 所有按钮、导航的跳转地址集中在这里，改这个文件即可全站生效。
 *
 * - 站内链接写相对路径（如 '/dashboard'），走 SPA 内部跳转，不会整页刷新
 * - 也可以写完整 URL（如 'https://other.example.com'），将作为外部链接新窗口打开
 */
export const homepageSiteConfig = {
  links: {
    /** 「开始使用」/「进入控制台」按钮 */
    console: '/dashboard',
    /** 「登录」按钮 */
    login: '/sign-in',
    /** 「查看价格」按钮 */
    pricing: '/pricing',
    /** 按量付费卡片按钮 */
    recharge: '/wallet',
    /** 订阅会员卡片按钮（当前为禁用态，启用后填写链接） */
    member: '#',
    /** 企业定制卡片按钮 */
    business: '#',
  },

  /** 生视频演示卡片的视频地址（相对路径跟随本站部署，也可写完整 URL 走外部托管） */
  videos: {
    demoUrl: '/videos/homepage/video-1.mp4',
  },

  /** 接口示例里展示的 base_url */
  apiBaseUrl: '/v1',
}
