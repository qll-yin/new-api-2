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
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Megaphone } from 'lucide-react'

import { CopyButton } from '@/components/copy-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import type { PromotionInfoData } from './types'

export function Promotion() {
  const { t } = useTranslation()
  const [info, setInfo] = useState<PromotionInfoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const pageSize = 10

  const loadInfo = useCallback(
    async (targetPage: number) => {
      try {
        setLoading(true)
        const res = await getPromotionInfo(targetPage, pageSize)
        if (res.success && res.data) {
          setInfo(res.data)
        }
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    loadInfo(page)
  }, [loadInfo, page])

  const affiliateLink = info?.aff_code
    ? `${window.location.origin}/sign-up?aff=${info.aff_code}`
    : ''

  const totalPages = info ? Math.max(1, Math.ceil(info.total / pageSize)) : 1

  return (
    <div className='container mx-auto space-y-4 p-4'>
      <div className='flex items-center gap-2.5'>
        <IconBadge tone='chart-3'>
          <Megaphone />
        </IconBadge>
        <div>
          <h1 className='text-lg font-semibold'>{t('Promotion Campaign')}</h1>
          <p className='text-muted-foreground text-xs'>
            {t(
              'Invite friends with your link. When they recharge, you earn a commission credited directly to your balance.'
            )}
          </p>
        </div>
      </div>

      {loading && !info ? (
        <Card>
          <CardContent className='space-y-3 p-4'>
            <Skeleton className='h-8 w-full' />
            <Skeleton className='h-24 w-full' />
          </CardContent>
        </Card>
      ) : info ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2 text-sm'>
                {t('Campaign Status')}
                {info.enabled ? (
                  <Badge variant='default'>{t('Active')}</Badge>
                ) : (
                  <Badge variant='secondary'>{t('Not started')}</Badge>
                )}
              </CardTitle>
              <CardDescription>
                {info.enabled
                  ? t(
                      'Commission rate: {{rate}}%. Earn commission when invitees complete online payments.',
                      { rate: info.rate }
                    )
                  : t(
                      'The promotion campaign is currently disabled. Existing commission records are kept.'
                    )}
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div>
                <p className='text-muted-foreground mb-1.5 text-xs'>
                  {t('Your Referral Link')}
                </p>
                <div className='flex items-center gap-2'>
                  <Input readOnly value={affiliateLink} className='font-mono text-xs' />
                  <CopyButton value={affiliateLink} />
                  <Button variant='outline' size='sm' asChild>
                    <a href='/wallet'>{t('Wallet')}</a>
                  </Button>
                </div>
              </div>
              <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
                <div className='rounded-lg border p-3'>
                  <p className='text-muted-foreground text-xs'>
                    {t('Total Commission')}
                  </p>
                  <p className='mt-1 text-sm font-semibold'>
                    {formatQuota(Number(info.total_commission_quota))}
                  </p>
                </div>
                <div className='rounded-lg border p-3'>
                  <p className='text-muted-foreground text-xs'>
                    {t('Commission Records')}
                  </p>
                  <p className='mt-1 text-sm font-semibold'>{info.commission_count}</p>
                </div>
                <div className='rounded-lg border p-3'>
                  <p className='text-muted-foreground text-xs'>
                    {t('Invited Users')}
                  </p>
                  <p className='mt-1 text-sm font-semibold'>{info.aff_count}</p>
                </div>
                <div className='rounded-lg border p-3'>
                  <p className='text-muted-foreground text-xs'>
                    {t('Total Earned')}
                  </p>
                  <p className='mt-1 text-sm font-semibold'>
                    {formatQuota(Number(info.aff_history_quota))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className='text-sm'>
                {t('Commission Records')}
              </CardTitle>
              <CardDescription>
                {t('Commission history from invitee recharges')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {info.items.length === 0 ? (
                <p className='text-muted-foreground py-6 text-center text-sm'>
                  {t('No commission records yet')}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('Time')}</TableHead>
                      <TableHead>{t('Recharge Amount')}</TableHead>
                      <TableHead>{t('Commission')}</TableHead>
                      <TableHead>{t('Order No.')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {info.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className='text-xs'>
                          {formatTimestamp(item.create_time)}
                        </TableCell>
                        <TableCell className='text-xs'>
                          ${item.recharge_amount.toFixed(2)}
                        </TableCell>
                        <TableCell className='text-xs font-medium text-emerald-600'>
                          +{formatQuota(item.commission_quota)}
                        </TableCell>
                        <TableCell className='font-mono text-xs'>
                          {item.trade_no}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {totalPages > 1 && (
                <div className='mt-3 flex items-center justify-end gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    {t('Previous')}
                  </Button>
                  <span className='text-muted-foreground text-xs'>
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant='outline'
                    size='sm'
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    {t('Next')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
