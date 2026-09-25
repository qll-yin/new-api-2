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
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { handleServerError } from '@/lib/handle-server-error'

import {
  createSubUserGroup,
  deleteSubUserGroup,
  getSubUserGroups,
  renameSubUserGroup,
} from '../api'
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../constants'

/** 子用户分组管理：建组/重命名/删除（删除时成员迁回未分组）。 */
export function SubUsersGroupManager(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [newName, setNewName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [deletingGroup, setDeletingGroup] = useState<{
    id: number
    name: string
    count: number
  } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['sub-user-groups'],
    queryFn: async () => {
      const res = await getSubUserGroups()
      if (!res.success) {
        throw handleServerError(res, t(ERROR_MESSAGES.GROUP_LOAD_FAILED))
      }
      return res.data ?? []
    },
    enabled: props.open,
    staleTime: 0,
  })

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['sub-user-groups'] })

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name) return
    setIsCreating(true)
    try {
      const res = await createSubUserGroup(name)
      if (res.success) {
        toast.success(t(SUCCESS_MESSAGES.GROUP_CREATED))
        setNewName('')
        await invalidate()
      } else {
        handleServerError(res, t(ERROR_MESSAGES.GROUP_CREATE_FAILED))
      }
    } catch (error) {
      handleServerError(error, t(ERROR_MESSAGES.GROUP_CREATE_FAILED))
    } finally {
      setIsCreating(false)
    }
  }

  const startRename = (id: number, name: string) => {
    setEditingId(id)
    setEditingName(name)
  }

  const handleRename = async () => {
    if (editingId == null) return
    const name = editingName.trim()
    if (!name) return
    setRenaming(true)
    try {
      const res = await renameSubUserGroup({ id: editingId, name })
      if (res.success) {
        toast.success(t(SUCCESS_MESSAGES.GROUP_UPDATED))
        setEditingId(null)
        await invalidate()
      } else {
        handleServerError(res, t(ERROR_MESSAGES.GROUP_UPDATE_FAILED))
      }
    } catch (error) {
      handleServerError(error, t(ERROR_MESSAGES.GROUP_UPDATE_FAILED))
    } finally {
      setRenaming(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingGroup) return
    setIsDeleting(true)
    try {
      const res = await deleteSubUserGroup(deletingGroup.id)
      if (res.success) {
        toast.success(t(SUCCESS_MESSAGES.GROUP_DELETED))
        setDeletingGroup(null)
        await invalidate()
      } else {
        handleServerError(res, t(ERROR_MESSAGES.GROUP_DELETE_FAILED))
      }
    } catch (error) {
      handleServerError(error, t(ERROR_MESSAGES.GROUP_DELETE_FAILED))
    } finally {
      setIsDeleting(false)
    }
  }

  const groups = data ?? []

  let groupListContent: ReactNode
  if (isLoading) {
    groupListContent = (
      <div className='text-muted-foreground py-6 text-center text-sm'>
        {t('Loading...')}
      </div>
    )
  } else if (groups.length === 0) {
    groupListContent = (
      <div className='text-muted-foreground py-6 text-center text-sm'>
        {t(
          'No sub-user groups yet. Create a group to organize your sub-users.'
        )}
      </div>
    )
  } else {
    groupListContent = (
      <div className='space-y-2'>
        {groups.map((group) => (
          <div
            key={group.id}
            className='flex items-center justify-between gap-2 rounded-md border px-3 py-2'
          >
            {editingId === group.id ? (
              <div className='flex min-w-0 flex-1 items-center gap-2'>
                <Input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleRename()
                    }
                  }}
                  autoFocus
                />
                <Button
                  type='button'
                  variant='ghost'
                  size='icon-sm'
                  onClick={handleRename}
                  disabled={renaming}
                  aria-label={t('Save changes')}
                >
                  {renaming ? (
                    <Loader2 className='h-4 w-4 animate-spin' />
                  ) : (
                    <Check className='h-4 w-4' />
                  )}
                </Button>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon-sm'
                  onClick={() => setEditingId(null)}
                  aria-label={t('Cancel')}
                >
                  <X className='h-4 w-4' />
                </Button>
              </div>
            ) : (
              <>
                <div className='flex min-w-0 items-center gap-2'>
                  <span className='truncate text-sm font-medium'>
                    {group.name}
                  </span>
                  <span className='text-muted-foreground shrink-0 text-xs'>
                    {t('{{count}} sub-users', {
                      count: group.token_count,
                    })}
                  </span>
                </div>
                <div className='flex shrink-0 items-center gap-1'>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon-sm'
                    onClick={() => startRename(group.id, group.name)}
                    aria-label={t('Rename')}
                  >
                    <Pencil className='h-4 w-4' />
                  </Button>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon-sm'
                    className='text-destructive hover:text-destructive'
                    onClick={() =>
                      setDeletingGroup({
                        id: group.id,
                        name: group.name,
                        count: group.token_count,
                      })
                    }
                    aria-label={t('Delete')}
                  >
                    <Trash2 className='h-4 w-4' />
                  </Button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      <div className='space-y-4'>
        <div className='flex gap-2'>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('Enter a group name')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleCreate()
              }
            }}
          />
          <Button
            type='button'
            size='sm'
            onClick={handleCreate}
            disabled={isCreating || !newName.trim()}
          >
            {isCreating ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              <Plus className='h-4 w-4' />
            )}
            {t('Add group')}
          </Button>
        </div>

        {groupListContent}
      </div>

      <ConfirmDialog
        open={deletingGroup != null}
        onOpenChange={(open) => !open && setDeletingGroup(null)}
        title={t('Delete sub-user group')}
        desc={t(
          'Delete group "{{name}}"? Its {{count}} sub-users will be moved to "Ungrouped".',
          { name: deletingGroup?.name ?? '', count: deletingGroup?.count ?? 0 }
        )}
        cancelBtnText={t('Cancel')}
        confirmText={isDeleting ? t('Deleting...') : t('Delete')}
        destructive
        isLoading={isDeleting}
        handleConfirm={handleDelete}
      />
    </>
  )
}
