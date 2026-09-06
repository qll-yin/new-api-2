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
import { Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Share2, Users, Percent, Wallet } from 'lucide-react'

import { CopyButton } from '@/components/copy-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { IconBadge } from '@/components/ui/icon-badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { formatQuota } from '@/lib/format'

import type { UserWalletData } from '../types'

interface AffiliateRewardsCardProps {
  user: UserWalletData | null
  affiliateLink: string
  onTransfer: () => void
  complianceConfirmed?: boolean
  loading?: boolean
  /** 推广活动状态(来自 /api/status)，隐藏未开启时的分成卡与彩蛋入口 */
  campaignEnabled?: boolean
  campaignRate?: number
}

export function AffiliateRewardsCard({
  user,
  affiliateLink,
  onTransfer,
  complianceConfirmed = true,
  loading,
  campaignEnabled,
  campaignRate,
}: AffiliateRewardsCardProps) {
  const { t } = useTranslation()
  if (loading) {
    return (
      <Card data-card-hover='false' className='bg-muted/20 py-0'>
        <CardContent className='grid gap-4 p-3 sm:p-4 lg:grid-cols-[minmax(220px,1fr)_minmax(220px,0.72fr)_minmax(320px,1.15fr)] lg:items-center'>
          <div>
            <Skeleton className='h-5 w-32' />
            <Skeleton className='mt-2 h-4 w-48' />
          </div>
          <Skeleton className='h-14 rounded-lg' />
          <Skeleton className='h-10 rounded-lg' />
        </CardContent>
      </Card>
    )
  }

  const hasRewards = (user?.aff_quota ?? 0) > 0

  return (
    <div className='flex flex-col gap-4'>
      {/* 推广小彩蛋 banner:引导用户去推广活动页 */}
      {campaignEnabled !== false && (
        <Card
          data-card-hover='false'
          className='border-primary/20 relative overflow-hidden bg-gradient-to-r from-primary/10 via-primary/5 to-transparent py-0'
        >
          <div
            aria-hidden='true'
            className='bg-primary/10 pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full blur-2xl'
          />
          <CardContent className='relative flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:p-4'>
            <div className='flex items-center gap-3'>
              <IconBadge tone='chart-3'>
                <Sparkles />
              </IconBadge>
              <div className='min-w-0'>
                <p className='text-muted-foreground flex items-center gap-1 text-[11px] font-medium'>
                  <Sparkles className='text-primary size-3' />
                  {t('Promotion bonus')}
                </p>
                <p className='text-sm font-semibold'>
                  {t('Want extra quota?')}
                </p>
                <p className='text-muted-foreground mt-0.5 text-xs'>
                  {t(
                    'Turn a genuine recommendation into extra quota — your exclusive link and commission rewards are waiting there.'
                  )}
                </p>
                <p className='text-primary mt-1 text-xs font-medium'>
                  {t(
                    'Promotion commission goes straight into your wallet — effortless.'
                  )}
                </p>
              </div>
            </div>
            <Button
              render={
                <Link to='/promotion' className='shrink-0' />
              }
              className='gap-1.5'
            >
              {t('Go check it out')}
              <ArrowRight className='size-4' />
            </Button>
          </CardContent>
        </Card>
      )}

      <Card data-card-hover='false' className='bg-muted/20 py-0'>
        <CardContent className='grid gap-3 p-3 sm:gap-4 sm:p-4 lg:grid-cols-[minmax(200px,1fr)_minmax(340px,1.4fr)] lg:items-center'>
          <div className='flex min-w-0 items-center gap-2.5'>
            <IconBadge tone='chart-3'>
              <Share2 />
            </IconBadge>
            <div className='min-w-0'>
              <div className='flex items-center gap-2'>
                <h3 className='truncate text-sm font-semibold'>
                  {t('Promotion Commission')}
                </h3>
                {campaignEnabled ? (
                  <Badge variant='outline' className='gap-1 border-emerald-500/40 text-emerald-600'>
                    <Wallet className='size-3' />
                    {t('Auto-credited')}
                  </Badge>
                ) : null}
              </div>
              <p className='text-muted-foreground line-clamp-2 text-xs'>
                {t(
                  'Every qualifying promotion commission is credited to your wallet balance automatically.'
                )}
              </p>
              <Link
                to='/promotion'
                className='text-primary text-xs hover:underline'
              >
                {t('View campaign details')}
              </Link>
            </div>
          </div>

          <div className='flex flex-col gap-3'>
            <div className='grid grid-cols-3 gap-2'>
              {[
                {
                  label: t('Total commission'),
                  value: formatQuota(user?.aff_history_quota ?? 0),
                  icon: <Share2 className='size-3.5' />,
                },
                {
                  label: t('Commission rate'),
                  value:
                    campaignRate !== undefined && campaignRate > 0
                      ? `${campaignRate}%`
                      : '-',
                  icon: <Percent className='size-3.5' />,
                },
                {
                  label: t('Invited friends'),
                  value: String(user?.aff_count ?? 0),
                  icon: <Users className='size-3.5' />,
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className='bg-background/60 rounded-lg border p-2.5'
                >
                  <div className='text-muted-foreground flex items-center gap-1 text-[10px] font-medium tracking-wider uppercase'>
                    {stat.icon}
                    <span className='truncate'>{stat.label}</span>
                  </div>
                  <div className='mt-1 truncate text-sm font-semibold tabular-nums'>
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
            <div className='flex items-center gap-2'>
              <Input
                value={affiliateLink}
                readOnly
                className='border-muted bg-background/70 h-9 min-w-0 flex-1 font-mono text-xs'
              />
              <CopyButton
                value={affiliateLink}
                variant='outline'
                className='bg-background size-9 shrink-0'
                iconClassName='size-4'
                tooltip={t('Copy referral link')}
                aria-label={t('Copy referral link')}
              />
              {hasRewards && (
                <Button
                  onClick={onTransfer}
                  disabled={!complianceConfirmed}
                  className='h-9 shrink-0 px-3'
                  size='sm'
                >
                  {t('Transfer to Balance')}
                </Button>
              )}
            </div>
            {!complianceConfirmed ? (
              <p className='text-muted-foreground text-xs'>
                {t(
                  'Referral reward transfer is disabled until the administrator confirms compliance terms.'
                )}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
