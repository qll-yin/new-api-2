/** 判断配置链接是否为内部相对路径（站内 SPA 跳转） */
export function isInternalPath(href: string): boolean {
  return href.startsWith('/') && !href.startsWith('//')
}

/** 内部链接用 TanStack Link，外部链接用普通 a 标签新窗口打开 */
export function configLinkProps(
  href: string
): { to: string } | { href: string; target: string; rel: string } {
  if (isInternalPath(href)) return { to: href }
  return { href, target: '_blank', rel: 'noopener noreferrer' }
}
