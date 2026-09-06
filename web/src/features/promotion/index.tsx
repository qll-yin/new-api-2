/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { useQuery } from '@tanstack/react-query'
import { motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Copy, History, ListOrdered, Users, Zap } from 'lucide-react'

import { CompactDateTimeRangePicker } from '@/components/compact-date-time-range-picker'
import { ConfettiCannons } from '@/components/confetti-cannons'
import { CopyButton } from '@/components/copy-button'
import { FloatingMascot } from '@/components/floating-mascot'
import { SectionPageLayout } from '@/components/layout'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { IconBadge } from '@/components/ui/icon-badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatQuota, formatTimestamp } from '@/lib/format'

import { getPromotionInfo } from './api'
import type { PromotionInfoData, PromotionSearchParams } from './types'

const PAGE_SIZE = 10

function StatCell(props: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className='bg-background/60 flex items-center justify-between gap-2 rounded-lg border p-3'>
      <div className='min-w-0'>
        <p className='text-muted-foreground truncate text-xs'>{props.label}</p>
        <p className='mt-0.5 truncate text-lg leading-6 font-semibold tabular-nums'>
          {props.value}
        </p>
      </div>
      {props.icon ? (
        <div className='text-muted-foreground shrink-0 opacity-70'>
          {props.icon}
        </div>
      ) : null}
    </div>
  )
}

export function Promotion() {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  const confettiRef = useRef<React.ComponentRef<typeof ConfettiCannons> | null>(
    null
  )
  const firedRef = useRef(false)
  const { copyToClipboard } = useCopyToClipboard()

  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [appliedKeyword, setAppliedKeyword] = useState('')
  const [range, setRange] = useState<{ start?: Date; end?: Date }>({})

  const search: PromotionSearchParams = {
    keyword: appliedKeyword || undefined,
    start_timestamp: range.start
      ? String(Math.floor(range.start.getTime() / 1000))
      : undefined,
    end_timestamp: range.end
      ? String(Math.floor(range.end.getTime() / 1000))
      : undefined,
  }
  const hasFilter =
    !!search.keyword || !!search.start_timestamp || !!search.end_timestamp

  const { data: info, isLoading } = useQuery({
    queryKey: [
      'promotion',
      page,
      search.keyword ?? '',
      search.start_timestamp ?? '',
      search.end_timestamp ?? '',
    ],
    queryFn: async () => {
      // getPromotionInfo 返回完整响应体，这里拆包出 data 供页面直接使用
      const res = await getPromotionInfo(page, PAGE_SIZE, search)
      if (!res.success || !res.data) {
        throw new Error(res.message || t('Failed to load'))
      }
      return res.data
    },
    placeholderData: (previous) => previous,
  })
  const items = info?.items ?? []

  useEffect(() => {
    // 入场礼炮：仅在活动开启且首次进入时放一发
    if (firedRef.current) return
    if (info?.enabled) {
      firedRef.current = true
      if (!reduceMotion) {
        window.setTimeout(() => confettiRef.current?.fire(), 350)
      }
    }
  }, [info?.enabled, reduceMotion])

  const affiliateLink = info?.aff_code
    ? `${window.location.origin}/sign-up?aff=${info.aff_code}`
    : ''

  const totalPages = info ? Math.max(1, Math.ceil(info.total / PAGE_SIZE)) : 1

  const handleReset = useCallback(() => {
    setKeyword('')
    setAppliedKeyword('')
    setRange({})
    setPage(1)
  }, [])

  const handleApply = useCallback(() => {
    setAppliedKeyword(keyword.trim())
    setPage(1)
  }, [keyword])

  const summary = {
    rateDisplay: `${info?.rate ?? 0}%`,
    totalCommission: formatQuota(Number(info?.total_commission_quota ?? 0)),
    filteredCommission: formatQuota(Number(info?.filtered_quota ?? 0)),
    lastCommission: formatQuota(Number(info?.last_commission_quota ?? 0)),
    invited: String(info?.aff_count ?? 0),
    commissionCount: String(info?.commission_count ?? 0),
    memberQuota: formatQuota(Number(info?.aff_history_quota ?? 0)),
  }

  return (
    <SectionPageLayout>
      <SectionPageLayout.Title>{t('Promotion Campaign')}</SectionPageLayout.Title>
      <SectionPageLayout.Content>
        {/* 入场彩纸礼炮：屏幕两侧对射 */}
        <ConfettiCannons autoFireOnMount={false} handleRef={confettiRef} />

        <div className='relative mx-auto flex w-full max-w-7xl flex-col gap-4'>
          {/* 漂浮的卡通脸装饰 */}
          {!reduceMotion && info?.enabled && (
            <>
              <FloatingMascot
                delay={0.4}
                className='pointer-events-none absolute top-2 right-2 z-10 hidden h-20 w-20 lg:block'
              />
              <FloatingMascot
                delay={1.1}
                className='pointer-events-none absolute bottom-40 left-1 z-10 hidden h-14 w-14 xl:block'
              />
            </>
          )}

          {/* 专属推广官小卡(左下角，仅桌面端) */}
          {info?.enabled && (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.5, ease: 'easeOut' }}
              className='fixed bottom-4 left-4 z-40 hidden w-52 xl:block'
            >
              <Card
                data-card-hover='false'
                className='border-primary/20 relative overflow-hidden bg-gradient-to-b from-primary/10 to-transparent py-0 shadow-lg'
              >
                <CardContent className='space-y-2 p-3'>
                  <div className='flex items-center gap-2'>
                    <FloatingMascot
                      delay={0.2}
                      className='h-9 w-9 shrink-0'
                    />
                    <p className='text-sm font-semibold'>
                      {t('Your exclusive promotion ambassador')}
                    </p>
                  </div>
                  <p className='text-muted-foreground text-xs leading-5'>
                    {t(
                      'Friends join through your referral link and every top-up of theirs earns you proportional commission — unlimited, valid forever!'
                    )}
                  </p>
                  <Button
                    size='sm'
                    className='h-8 w-full gap-1.5'
                    onClick={() => {
                      if (affiliateLink) {
                        copyToClipboard(affiliateLink)
                      }
                      confettiRef.current?.fire()
                    }}
                  >
                    <Copy className='size-3.5' />
                    {t('Copy link and start')}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* 专属推广链接卡 */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          >
            <Card
              data-card-hover='false'
              className='relative overflow-hidden border-primary/20 py-0'
            >
              {/* 背景光斑装饰 */}
              <div
                aria-hidden='true'
                className='pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5'
              />
              <div
                aria-hidden='true'
                className='bg-primary/10 pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full blur-3xl'
              />
              <CardContent className='relative grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,1.1fr)] lg:items-center'>
                <div>
                  <h2 className='text-base font-semibold sm:text-lg'>
                    {t('Your exclusive referral link is ready')}
                  </h2>
                  <p className='text-muted-foreground mt-1.5 text-xs leading-5 sm:text-sm'>
                    {t(
                      'Share your link with friends! When they join and consume quota, you earn commission proportional to every top-up, credited to your balance automatically.'
                    )}
                  </p>
                  <div className='mt-3 flex flex-wrap gap-1.5'>
                    <Badge variant='secondary' className='gap-1'>
                      <Zap className='size-3 text-amber-500' />
                      {t('Commission auto-credited')}
                    </Badge>
                    <Badge variant='secondary' className='gap-1'>
                      <Users className='text-primary size-3' />
                      {t('Exclusive invite link')}
                    </Badge>
                    <Badge variant='secondary' className='gap-1'>
                      <History className='size-3 text-emerald-500' />
                      {t('Valid forever')}
                    </Badge>
                  </div>
                </div>
                <div className='min-w-0'>
                  <div className='text-muted-foreground mb-1.5 flex items-center justify-between text-xs'>
                    <span>{t('Referral link')}</span>
                    <span className='text-[11px]'>
                      {t('Share anytime')}
                    </span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Input
                      readOnly
                      value={affiliateLink}
                      className='bg-background/70 h-10 min-w-0 flex-1 font-mono text-xs'
                    />
                    <CopyButton
                      value={affiliateLink}
                      variant='default'
                      size='sm'
                      className='h-10 px-4'
                      tooltip={t('Copy link')}
                      successTooltip={t('Copied')}
                      aria-label={t('Copy link')}
                    >
                      <span className='ml-1 inline-flex items-center gap-1'>
                        <Copy className='size-3.5' />
                        {t('Copy')}
                      </span>
                    </CopyButton>
                  </div>
                  {isLoading || !info ? null : !info.enabled ? (
                    <p className='text-muted-foreground mt-2 text-xs'>
                      {t(
                        'The promotion campaign is currently disabled. Existing commission records are kept.'
                      )}
                    </p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* 推广分成统计卡 */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08, ease: 'easeOut' }}
          >
            <Card data-card-hover='false' className='py-0'>
              <CardContent className='p-4 sm:p-5'>
                <div className='flex items-center justify-between gap-2'>
                  <div className='flex items-center gap-2.5'>
                    <IconBadge tone='chart-3'>
                      <ListOrdered />
                    </IconBadge>
                    <div>
                      <h3 className='text-sm font-semibold'>
                        {t('Promotion Commission')}
                      </h3>
                      <p className='text-muted-foreground text-xs'>
                        {t('Commission credited to balance automatically')}
                      </p>
                    </div>
                  </div>
                  <Badge variant='outline' className='gap-1'>
                    <Zap className='size-3 text-amber-500' />
                    {t('Auto-credited to wallet')}
                  </Badge>
                </div>

                {isLoading && !info ? (
                  <div className='mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className='h-16 rounded-lg' />
                    ))}
                  </div>
                ) : (
                  <div className='mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
                    <div className='bg-muted/40 relative overflow-hidden rounded-lg border p-3 sm:col-span-2'>
                      <div
                        aria-hidden='true'
                        className='bg-primary/8 pointer-events-none absolute -right-6 -bottom-8 h-24 w-24 rounded-full blur-2xl'
                      />
                      <p className='text-muted-foreground text-xs'>
                        {t('Total commission')}
                      </p>
                      <p className='text-primary mt-1 text-2xl font-bold tabular-nums'>
                        {summary.totalCommission}
                      </p>
                      <div className='mt-2 grid grid-cols-2 gap-2'>
                        <div>
                          <p className='text-muted-foreground text-[11px]'>
                            {t('Members earned quota')}
                          </p>
                          <p className='text-sm font-semibold tabular-nums'>
                            {summary.memberQuota}
                          </p>
                        </div>
                        <div>
                          <p className='text-muted-foreground text-[11px]'>
                            {t('Latest commission')}
                          </p>
                          <p className='text-sm font-semibold tabular-nums'>
                            {summary.lastCommission}
                          </p>
                        </div>
                      </div>
                    </div>
                    <StatCell
                      label={t('Commission rate')}
                      value={summary.rateDisplay}
                      icon={<ListOrdered className='size-4' />}
                    />
                    <StatCell
                      label={t('This period commission')}
                      value={summary.filteredCommission}
                      icon={<History className='size-4' />}
                    />
                    <StatCell
                      label={t('Invited friends')}
                      value={summary.invited}
                      icon={<Users className='size-4' />}
                    />
                    <StatCell
                      label={t('Successful commissions')}
                      value={summary.commissionCount}
                      icon={<Zap className='size-4' />}
                    />
                  </div>
                )}

                {/* 筛选行 */}
                <div className='mt-4 grid gap-2 sm:grid-cols-[160px_minmax(220px,1fr)_160px_auto_auto] sm:items-center'>
                  <Input
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleApply()
                    }}
                    placeholder={t('Search by invitee username or ID')}
                    className='h-9'
                  />
                  <CompactDateTimeRangePicker
                    start={range.start}
                    end={range.end}
                    onChange={({ start, end }) => {
                      setRange({ start, end })
                      setPage(1)
                    }}
                    className='h-9'
                  />
                  <Button size='sm' className='h-9' onClick={handleApply}>
                    {t('Search')}
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    className='h-9'
                    onClick={handleReset}
                  >
                    {t('Reset')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* 分成明细 */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.16, ease: 'easeOut' }}
          >
            <Card data-card-hover='false' className='py-0'>
              <CardContent className='p-4 sm:p-5'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <History className='text-muted-foreground size-4' />
                    <h3 className='text-sm font-semibold'>
                      {t('Promotion commission details')}
                    </h3>
                  </div>
                  <span className='text-muted-foreground text-xs tabular-nums'>
                    {info?.total ?? 0}
                  </span>
                </div>

                {isLoading && !info ? (
                  <div className='mt-3 space-y-2'>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className='h-10 w-full' />
                    ))}
                  </div>
                ) : items.length === 0 ? (
                  <p className='text-muted-foreground py-8 text-center text-sm'>
                    {t('No commission records yet')}
                  </p>
                ) : (
                  <div className='mt-3 overflow-x-auto'>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('User')}</TableHead>
                          <TableHead>{t('Member consumption')}</TableHead>
                          <TableHead>{t('Commission / rate')}</TableHead>
                          <TableHead>{t('Time')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className='text-xs'>
                              {item.invitee_name
                                ? `${item.invitee_name} (#${item.invitee_id})`
                                : `#${item.invitee_id}`}
                            </TableCell>
                            <TableCell className='text-xs tabular-nums'>
                              ${item.recharge_amount.toFixed(2)}
                            </TableCell>
                            <TableCell className='text-emerald-600 text-xs font-medium tabular-nums'>
                              +{formatQuota(item.commission_quota)}
                              {item.recharge_amount > 0 && info.rate > 0
                                ? ` (${info.rate}%)`
                                : ''}
                            </TableCell>
                            <TableCell className='text-xs'>
                              {formatTimestamp(item.create_time)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {info && totalPages > 1 ? (
                  <div className='mt-3 flex items-center justify-between'>
                    <span className='text-muted-foreground text-xs tabular-nums'>
                      {page} / {totalPages}
                    </span>
                    <div className='flex items-center gap-2'>
                      <Button
                        variant='outline'
                        size='sm'
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        {t('Previous')}
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        {t('Next')}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
