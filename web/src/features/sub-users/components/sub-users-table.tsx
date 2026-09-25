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
import type { Table as TanstackTable } from '@tanstack/react-table'
import { UsersRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  DISABLED_ROW_DESKTOP,
  DISABLED_ROW_MOBILE,
  DataTablePage,
  useDataTable,
} from '@/components/data-table'
import { StatusBadge } from '@/components/status-badge'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { useTableUrlState } from '@/hooks/use-table-url-state'
import { ApiKeyQuotaCell } from '@/features/keys/components/api-key-quota-cell'
import { ApiKeyGroupCell } from '@/features/keys/components/api-key-group-cell'
import {
  ModelLimitsCell,
  IpRestrictionsCell,
} from '@/features/keys/components/api-keys-cells'
import {
  API_KEY_STATUSES,
  API_KEY_STATUS_OPTIONS,
} from '@/features/keys/constants'
import { createServerError } from '@/lib/server-error-message'
import { cn } from '@/lib/utils'

import { getSubUserGroups, getSubUsers, searchSubUsers } from '../api'
import {
  ERROR_MESSAGES,
  SUB_USER_STATUS,
  UNGROUPED_SUB_GROUP_ID,
} from '../constants'
import type { SubUser } from '../types'
import { SubUserKeyCell } from './sub-user-key-cell'
import { useSubUsersColumns } from './sub-users-columns'
import { SubUsersRowActions } from './sub-users-row-actions'
import { useSubUsers } from './sub-users-provider'

const route = getRouteApi('/_authenticated/sub-users/')
const SUB_USERS_COLUMN_VISIBILITY_STORAGE_KEY = 'sub-users:column-visibility'
const SUB_USERS_MOBILE_SKELETON_IDS = Array.from(
  { length: 5 },
  (_, index) => `sub-user-mobile-skeleton-${index + 1}`
)

function isDisabledSubUserRow(subUser: SubUser) {
  return subUser.status !== SUB_USER_STATUS.ENABLED
}

function SubUsersMobileSkeleton() {
  return (
    <div className='min-w-0 space-y-3'>
      {SUB_USERS_MOBILE_SKELETON_IDS.map((id) => (
        <div
          key={id}
          className='border-border/60 bg-card space-y-2 rounded-xl border p-3.5'
        >
          <div className='flex items-center justify-between'>
            <Skeleton className='h-4 w-32' />
            <Skeleton className='h-5 w-16 rounded-md' />
          </div>
          <div className='flex items-center justify-between gap-3'>
            <Skeleton className='h-7 w-44' />
            <Skeleton className='h-8 w-16' />
          </div>
          <Skeleton className='h-3 w-28' />
        </div>
      ))}
    </div>
  )
}

function SubUsersMobileList({
  table,
  isLoading,
  now,
}: {
  table: TanstackTable<SubUser>
  isLoading: boolean
  now: number
}) {
  const { t } = useTranslation()
  const rows = table.getRowModel().rows

  if (isLoading) return <SubUsersMobileSkeleton />

  if (!rows.length) {
    return (
      <div className='rounded-lg border p-8'>
        <Empty className='border-none p-0'>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <UsersRound className='size-6' />
            </EmptyMedia>
            <EmptyTitle>{t('No Sub-users Found')}</EmptyTitle>
            <EmptyDescription>
              {t(
                'No sub-users yet. Create a sub-user for each team member to track their usage.'
              )}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  return (
    <div className='min-w-0 space-y-3'>
      {rows.map((row) => {
        const subUser = row.original
        const statusConfig = API_KEY_STATUSES[subUser.status]

        return (
          <div
            key={row.id}
            className={cn(
              'border-border/60 bg-card min-w-0 space-y-2 rounded-xl border p-3.5 text-xs leading-4',
              isDisabledSubUserRow(subUser) && DISABLED_ROW_MOBILE
            )}
          >
            <div className='flex items-start justify-between gap-3'>
              <div className='min-w-0'>
                <div className='text-sm leading-5 font-semibold break-words'>
                  {subUser.name}
                </div>
              </div>
              {statusConfig && (
                <StatusBadge
                  label={t(statusConfig.label)}
                  variant={statusConfig.variant}
                  copyable={false}
                  className='shrink-0 px-0 text-xs font-normal'
                />
              )}
            </div>

            <div className='flex min-w-0 items-center justify-between gap-2'>
              <div className='min-w-0 flex-1 [&_button:first-child]:max-w-full [&_button:first-child]:truncate [&_button:first-child]:px-0'>
                <SubUserKeyCell subUser={subUser} />
              </div>
              <SubUsersRowActions row={row} />
            </div>

            <div className='min-w-0 space-y-3 py-1'>
              <ApiKeyGroupCell
                group={subUser.group ?? ''}
                crossGroupRetry={subUser.cross_group_retry}
                shouldReduceMotion={false}
              />
              <ApiKeyQuotaCell apiKey={subUser} now={now} variant='card' />
            </div>

            <div className='flex flex-wrap items-center gap-x-5 gap-y-1'>
              <ModelLimitsCell apiKey={subUser} detailsTrigger='click' />
              <IpRestrictionsCell apiKey={subUser} detailsTrigger='click' />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function SubUsersTable() {
  const { t } = useTranslation()
  const { refreshTrigger } = useSubUsers()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now())
    }, 30_000)

    return () => window.clearInterval(intervalId)
  }, [])

  const {
    globalFilter,
    onGlobalFilterChange,
    columnFilters,
    onColumnFiltersChange,
    pagination,
    onPaginationChange,
    ensurePageInRange,
  } = useTableUrlState({
    search: route.useSearch(),
    navigate: route.useNavigate(),
    pagination: { defaultPage: 1, defaultPageSize: 20 },
    globalFilter: { enabled: true, key: 'filter' },
    columnFilters: [
      { columnId: 'status', searchKey: 'status', type: 'array' },
      { columnId: 'sub_group_id', searchKey: 'subGroup', type: 'array' },
    ],
  })

  const subGroupFilter = useMemo(() => {
    const filter = columnFilters.find((f) => f.id === 'sub_group_id')
    const value = filter?.value
    if (Array.isArray(value) && value.length > 0) return String(value[0])
    return ''
  }, [columnFilters])
  const shouldSearch = Boolean(globalFilter?.trim() || subGroupFilter)

  // 子用户分组（列表列名映射 + 筛选项）
  const { data: subGroups } = useQuery({
    queryKey: ['sub-user-groups'],
    queryFn: async () => {
      const res = await getSubUserGroups()
      if (!res.success) {
        throw createServerError(res, t(ERROR_MESSAGES.GROUP_LOAD_FAILED))
      }
      return res.data ?? []
    },
    staleTime: 0,
  })
  const groupNameById = useMemo(() => {
    const map: Record<number, string> = {}
    for (const group of subGroups ?? []) {
      if (group.id !== UNGROUPED_SUB_GROUP_ID) map[group.id] = group.name
    }
    return map
  }, [subGroups])
  const subGroupOptions = useMemo(
    () => [
      {
        label: t('Ungrouped'),
        value: String(UNGROUPED_SUB_GROUP_ID),
      },
      ...(subGroups ?? [])
        .filter((g) => g.id !== UNGROUPED_SUB_GROUP_ID)
        .map((g) => ({ label: g.name, value: String(g.id) })),
    ],
    [subGroups, t]
  )

  const columns = useSubUsersColumns({ now, groupNameById })

  // Fetch data with React Query
  // eslint-disable-next-line @tanstack/query/exhaustive-deps
  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      'sub-users',
      pagination.pageIndex + 1,
      pagination.pageSize,
      globalFilter,
      subGroupFilter,
      refreshTrigger,
    ],
    queryFn: async () => {
      const result = shouldSearch
        ? await searchSubUsers({
            keyword: globalFilter,
            sub_group_id: subGroupFilter ? Number(subGroupFilter) : undefined,
            p: pagination.pageIndex + 1,
            size: pagination.pageSize,
          })
        : await getSubUsers({
            p: pagination.pageIndex + 1,
            size: pagination.pageSize,
          })

      if (!result.success) {
        throw createServerError(
          result,
          t(
            shouldSearch
              ? ERROR_MESSAGES.SEARCH_FAILED
              : ERROR_MESSAGES.LOAD_FAILED
          )
        )
      }

      return {
        items: result.data?.items || [],
        total: result.data?.total || 0,
      }
    },
    placeholderData: (previousData) => previousData,
  })

  const subUsers = data?.items || []

  const { table } = useDataTable({
    data: subUsers,
    columns,
    columnFilters,
    columnVisibilityStorageKey: SUB_USERS_COLUMN_VISIBILITY_STORAGE_KEY,
    globalFilter,
    pagination,
    globalFilterFn: () => true,
    onPaginationChange,
    onGlobalFilterChange,
    onColumnFiltersChange,
    manualPagination: true,
    totalCount: data?.total || 0,
    ensurePageInRange,
  })

  return (
    <DataTablePage
      table={table}
      columns={columns}
      isLoading={isLoading}
      isFetching={isFetching}
      emptyTitle={t('No Sub-users Found')}
      emptyDescription={t(
        'No sub-users yet. Create a sub-user for each team member to track their usage.'
      )}
      skeletonKeyPrefix='sub-users-skeleton'
      applyHeaderSize
      toolbarProps={{
        searchPlaceholder: t('Filter by name...'),
        searchDebounceMs: 500,
        filters: [
          {
            columnId: 'status',
            title: t('Status'),
            options: API_KEY_STATUS_OPTIONS,
            singleSelect: true,
          },
          {
            columnId: 'sub_group_id',
            title: t('Sub-user Group'),
            options: subGroupOptions,
            singleSelect: true,
          },
        ],
      }}
      mobile={
        <SubUsersMobileList table={table} isLoading={isLoading} now={now} />
      }
      getRowClassName={(row) =>
        isDisabledSubUserRow(row.original) ? DISABLED_ROW_DESKTOP : undefined
      }
    />
  )
}
