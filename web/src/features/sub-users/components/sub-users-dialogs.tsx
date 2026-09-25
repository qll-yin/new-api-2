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
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { Dialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'

import { SubUsersDeleteDialog } from './sub-users-delete-dialog'
import { SubUsersGroupManager } from './sub-users-group-manager'
import { SubUsersMutateDrawer } from './sub-users-mutate-drawer'
import { useSubUsers } from './sub-users-provider'

export function SubUsersDialogs() {
  const { t } = useTranslation()
  const { open, setOpen, currentRow, createdKey } = useSubUsers()

  return (
    <>
      <SubUsersMutateDrawer
        open={open === 'create' || open === 'update'}
        onOpenChange={(isOpen) => !isOpen && setOpen(null)}
        currentRow={open === 'update' ? currentRow || undefined : undefined}
      />
      <SubUsersDeleteDialog />

      <Dialog
        open={open === 'groups'}
        onOpenChange={(isOpen) => !isOpen && setOpen(null)}
        title={t('Sub-user Groups')}
        description={t(
          'Create groups to organize your sub-users, e.g. by team or seniority.'
        )}
        contentClassName='max-w-lg'
        contentHeight='auto'
        footer={
          <Button variant='outline' onClick={() => setOpen(null)}>
            {t('Close')}
          </Button>
        }
      >
        <SubUsersGroupManager
          open={open === 'groups'}
          onOpenChange={(isOpen) => !isOpen && setOpen(null)}
        />
      </Dialog>

      <Dialog
        open={open === 'created-key'}
        onOpenChange={(isOpen) => !isOpen && setOpen(null)}
        title={t('Sub-user created')}
        description={t(
          'Copy the token key below and give it to this sub-user. You can view and copy it again anytime from the list.'
        )}
        contentClassName='max-w-xl'
        contentHeight='auto'
        footer={
          <Button onClick={() => setOpen(null)}>{t('Done')}</Button>
        }
      >
        <div className='space-y-3'>
          <div className='bg-muted/50 flex items-center gap-2 rounded-md border px-3 py-2'>
            <code className='min-w-0 flex-1 truncate font-mono text-xs select-text'>
              {createdKey}
            </code>
            <CopyButton value={createdKey} size='sm' />
          </div>
          <p className='text-muted-foreground text-xs'>
            {t('Sub-user name')}:{' '}
            <span className='text-foreground font-medium'>
              {currentRow?.name}
            </span>
          </p>
        </div>
      </Dialog>
    </>
  )
}
