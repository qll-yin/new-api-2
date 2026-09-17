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
import { getRouteApi } from '@tanstack/react-router'
import { ListOrdered, Users, Zap } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CompactDateTimeRangePicker } from '@/components/compact-date-time-range-picker'
import { CopyButton } from '@/components/copy-button'
import { SectionPageLayout } from '@/components/layout'
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

import { getAllPromotionRecords } from './api'

const route = getRouteApi('/_authenticated/promotion/records')

const DEFAULT_PAGE_SIZE = 10

function StatCell(props: {
  label: string
  value: string
  icon?: React.ReactNode
}) {
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

/**
 * 推广分成管理员视图：查看全部用户的分成明细，支持按推广人（上级）筛选。
 */
export function AdminPromotionRecords() {
  const { t } = useTranslation()
  const search = route.useSearch()
  const navigate = route.useNavigate()

  const page = search.page ?? 1
  const pageSize = search.pageSize ?? DEFAULT_PAGE_SIZE

  const [usernameInput, setUsernameInput] = useState(search.username ?? '')
  const [keywordInput, setKeywordInput] = useState(search.keyword ?? '')
  const [range, setRange] = useState<{ start?: Date; end?: Date }>(() => ({
    start: search.start_timestamp
      ? new Date(Number(search.start_timestamp) * 1000)
      : undefined,
    end: search.end_timestamp
      ? new Date(Number(search.end_timestamp) * 1000)
      : undefined,
  }))

  const applyFilters = (nextRange: { start?: Date; end?: Date }) => {
    navigate({
      search: (prev) => ({
        ...prev,
        page: 1,
        username: usernameInput.trim() || undefined,
        keyword: keywordInput.trim() || undefined,
        start_timestamp: nextRange.start
          ? String(Math.floor(nextRange.start.getTime() / 1000))
          : undefined,
        end_timestamp: nextRange.end
          ? String(Math.floor(nextRange.end.getTime() / 1000))
          : undefined,
      }),
    })
  }

  const handleReset = () => {
    setUsernameInput('')
    setKeywordInput('')
    setRange({})
    navigate({
      search: (prev) => ({
        ...prev,
        page: 1,
        username: undefined,
        keyword: undefined,
        start_timestamp: undefined,
        end_timestamp: undefined,
      }),
    })
  }

  const { data: info, isLoading } = useQuery({
    queryKey: [
      'promotion-admin',
      page,
      pageSize,
      search.username ?? '',
      search.keyword ?? '',
      search.start_timestamp ?? '',
      search.end_timestamp ?? '',
    ],
    queryFn: async () => {
      const res = await getAllPromotionRecords(page, pageSize, {
        username: search.username || undefined,
        keyword: search.keyword || undefined,
        start_timestamp: search.start_timestamp || undefined,
        end_timestamp: search.end_timestamp || undefined,
      })
      if (!res.success || !res.data) {
        throw new Error(res.message || t('Failed to load'))
      }
      return res.data
    },
    placeholderData: (previous) => previous,
  })
  const items = info?.items ?? []
  const summary = info?.summary
  const showSkeleton = isLoading && !info

  const totalPages = info ? Math.max(1, Math.ceil(info.total / pageSize)) : 1

  return (
    <SectionPageLayout>
      <SectionPageLayout.Title>
        {t('Promotion Management')}
      </SectionPageLayout.Title>
      <SectionPageLayout.Content>
        <div className='mx-auto flex w-full max-w-7xl flex-col gap-4'>
          {/* 全站汇总 */}
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
                      {t("All users' promotion commission records")}
                    </p>
                  </div>
                </div>
                <Badge variant='outline' className='gap-1'>
                  <Zap className='size-3 text-amber-500' />
                  {t('Auto-credited to wallet')}
                </Badge>
              </div>

              {isLoading && !info ? (
                <div className='mt-4 grid gap-3 sm:grid-cols-3'>
                  <Skeleton className='h-16 rounded-lg' />
                  <Skeleton className='h-16 rounded-lg' />
                  <Skeleton className='h-16 rounded-lg' />
                </div>
              ) : (
                <div className='mt-4 grid gap-3 sm:grid-cols-3'>
                  <div className='bg-muted/40 relative overflow-hidden rounded-lg border p-3'>
                    <p className='text-muted-foreground text-xs'>
                      {t('Total commission')}
                    </p>
                    <p className='text-primary mt-1 text-2xl font-bold tabular-nums'>
                      {formatQuota(
                        Number(summary?.total_commission_quota ?? 0)
                      )}
                    </p>
                  </div>
                  <StatCell
                    label={t('Successful commissions')}
                    value={String(summary?.commission_count ?? 0)}
                    icon={<Zap className='size-4' />}
                  />
                  <StatCell
                    label={t('This period commission')}
                    value={formatQuota(Number(summary?.filtered_quota ?? 0))}
                    icon={<ListOrdered className='size-4' />}
                  />
                </div>
              )}

              {/* 筛选行：推广人 / 下级 / 时间区间 */}
              <div className='mt-4 grid gap-2 sm:grid-cols-[minmax(160px,1fr)_minmax(160px,1fr)_minmax(220px,1fr)_auto_auto] sm:items-center'>
                <Input
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') applyFilters(range)
                  }}
                  placeholder={t('Filter by inviter username or ID')}
                  className='h-9'
                />
                <Input
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') applyFilters(range)
                  }}
                  placeholder={t('Search by invitee username or ID')}
                  className='h-9'
                />
                <CompactDateTimeRangePicker
                  start={range.start}
                  end={range.end}
                  onChange={({ start, end }) => {
                    setRange({ start, end })
                    applyFilters({ start, end })
                  }}
                  className='h-9'
                />
                <Button
                  size='sm'
                  className='h-9'
                  onClick={() => applyFilters(range)}
                >
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

          {/* 全员分成明细 */}
          <Card data-card-hover='false' className='py-0'>
            <CardContent className='p-4 sm:p-5'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <Users className='text-muted-foreground size-4' />
                  <h3 className='text-sm font-semibold'>
                    {t('Promotion commission details')}
                  </h3>
                </div>
                <span className='text-muted-foreground text-xs tabular-nums'>
                  {info?.total ?? 0}
                </span>
              </div>

              {showSkeleton ? (
                <div className='mt-3 space-y-2'>
                  <Skeleton className='h-10 w-full' />
                  <Skeleton className='h-10 w-full' />
                  <Skeleton className='h-10 w-full' />
                </div>
              ) : null}

              {!showSkeleton && items.length === 0 ? (
                <p className='text-muted-foreground py-8 text-center text-sm'>
                  {t('No commission records yet')}
                </p>
              ) : null}

              {!showSkeleton && items.length > 0 ? (
                <div className='mt-3 overflow-x-auto'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('Inviter')}</TableHead>
                        <TableHead>{t('Invitee')}</TableHead>
                        <TableHead>{t('Trade No')}</TableHead>
                        <TableHead>{t('Recharge Amount')}</TableHead>
                        <TableHead>{t('Commission')}</TableHead>
                        <TableHead>{t('Time')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className='text-xs'>
                            {item.inviter_name
                              ? `${item.inviter_name} (#${item.inviter_id})`
                              : `#${item.inviter_id}`}
                          </TableCell>
                          <TableCell className='text-xs'>
                            {item.invitee_name
                              ? `${item.invitee_name} (#${item.invitee_id})`
                              : `#${item.invitee_id}`}
                          </TableCell>
                          <TableCell className='max-w-[180px]'>
                            <div className='flex items-center gap-1'>
                              <span
                                className='text-muted-foreground font-mono text-xs'
                                title={item.trade_no}
                              >
                                {item.trade_no}
                              </span>
                              <CopyButton
                                value={item.trade_no}
                                variant='ghost'
                                size='icon'
                                className='size-6'
                                aria-label={t('Copy')}
                              />
                            </div>
                          </TableCell>
                          <TableCell className='text-xs tabular-nums'>
                            ${item.recharge_amount.toFixed(2)}
                          </TableCell>
                          <TableCell className='text-xs font-medium text-emerald-600 tabular-nums'>
                            +{formatQuota(item.commission_quota)}
                          </TableCell>
                          <TableCell className='text-xs'>
                            {formatTimestamp(item.create_time)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : null}

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
                      onClick={() =>
                        navigate({
                          search: (prev) => ({
                            ...prev,
                            page: Math.max(1, page - 1),
                          }),
                        })
                      }
                    >
                      {t('Previous')}
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      disabled={page >= totalPages}
                      onClick={() =>
                        navigate({
                          search: (prev) => ({
                            ...prev,
                            page: page + 1,
                          }),
                        })
                      }
                    >
                      {t('Next')}
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
