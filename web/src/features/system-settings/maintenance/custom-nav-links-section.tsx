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
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import * as z from 'zod'

import { StaticDataTable } from '@/components/data-table/static/static-data-table'
import { StaticRowActions } from '@/components/data-table/static/static-row-actions'
import { Dialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { handleServerError } from '@/lib/handle-server-error'

import { SettingsSection } from '../components/settings-section'
import { useUpdateOption } from '../hooks/use-update-option'

type CustomNavLink = {
  title: string
  url: string
  tag?: string
}

type CustomNavLinksSectionProps = {
  data: string
}

const customNavLinkSchema = z.object({
  title: z.string().min(1, 'Title is required').max(30),
  url: z
    .string()
    .min(1, 'URL is required')
    .max(500)
    .refine(
      (value) =>
        value.startsWith('/') ||
        /^https?:\/\//.test(value) ||
        /^[\w.-]+(\.[\w-]+)+/.test(value),
      'Enter a site path starting with / or an absolute URL'
    ),
  tag: z.string().max(10).optional(),
})

type CustomNavLinkFormValues = z.infer<typeof customNavLinkSchema>

const CUSTOM_NAV_LINK_FORM_ID = 'custom-nav-link-form'

export function CustomNavLinksSection({ data }: CustomNavLinksSectionProps) {
  const { t } = useTranslation()
  const updateOption = useUpdateOption()
  const [links, setLinks] = useState<CustomNavLink[]>([])
  const [hasChanges, setHasChanges] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  const form = useForm<CustomNavLinkFormValues>({
    resolver: zodResolver(customNavLinkSchema),
    defaultValues: { title: '', url: '', tag: '' },
  })

  useEffect(() => {
    try {
      const parsed = JSON.parse(data || '[]')
      if (Array.isArray(parsed)) {
        setLinks(
          parsed.filter(
            (item): item is CustomNavLink =>
              !!item && typeof item.title === 'string' && typeof item.url === 'string'
          )
        )
      }
    } catch {
      setLinks([])
    }
  }, [data])

  const handleAdd = () => {
    setEditingIndex(null)
    form.reset({ title: '', url: '', tag: '' })
    setShowDialog(true)
  }

  const handleEdit = (index: number) => {
    setEditingIndex(index)
    form.reset({
      title: links[index]?.title ?? '',
      url: links[index]?.url ?? '',
      tag: links[index]?.tag ?? '',
    })
    setShowDialog(true)
  }

  const handleDelete = (index: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== index))
    setHasChanges(true)
    toast.success(t('Link removed. Click "Save Settings" to apply.'))
  }

  const handleSubmitForm = (values: CustomNavLinkFormValues) => {
    const normalized: CustomNavLink = {
      title: values.title.trim(),
      url: values.url.trim(),
      tag: values.tag?.trim() || undefined,
    }
    if (editingIndex !== null) {
      setLinks((prev) =>
        prev.map((item, i) => (i === editingIndex ? normalized : item))
      )
    } else {
      setLinks((prev) => [...prev, normalized])
    }
    setHasChanges(true)
    setShowDialog(false)
  }

  const handleSaveAll = async () => {
    try {
      await updateOption.mutateAsync({
        key: 'console_setting.custom_nav_links',
        value: JSON.stringify(
          links.map((link) =>
            link.tag ? { ...link, tag: link.tag } : { title: link.title, url: link.url }
          )
        ),
      })
      setHasChanges(false)
      toast.success(t('Custom navigation links saved successfully'))
    } catch (error) {
      handleServerError(error, t('Failed to save custom navigation links'))
    }
  }

  return (
    <SettingsSection title={t('Custom navigation links')}>
      <div className='space-y-4'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <p className='text-muted-foreground max-w-2xl text-sm'>
            {t(
              'Add custom entries to the public top navigation, e.g. a link to your own canvas app. A URL starting with / opens as a site route; anything else opens in a new tab. The tag shows a glowing badge next to the link text, e.g. NEW.'
            )}
          </p>
          <div className='flex flex-wrap items-center gap-2'>
            <Button onClick={handleAdd} size='sm' disabled={links.length >= 10}>
              <Plus className='mr-2 h-4 w-4' />
              {t('Add link')}
            </Button>
            <Button
              onClick={handleSaveAll}
              size='sm'
              variant='secondary'
              disabled={!hasChanges || updateOption.isPending}
            >
              <Save className='mr-2 h-4 w-4' />
              {updateOption.isPending ? t('Saving...') : t('Save Settings')}
            </Button>
          </div>
        </div>

        <StaticDataTable
          data={links}
          getRowKey={(link) => `${link.title}:${link.url}`}
          emptyContent={t('No custom links yet. Click "Add link" to create one.')}
          columns={[
            {
              id: 'title',
              header: t('Title'),
              cell: (link) => link.title,
            },
            {
              id: 'url',
              header: t('URL'),
              cellClassName: 'text-muted-foreground max-w-xs truncate',
              cell: (link) => link.url,
            },
            {
              id: 'tag',
              header: t('Tag'),
              cell: (link) =>
                link.tag ? (
                  <Badge variant='default'>{link.tag}</Badge>
                ) : (
                  '-'
                ),
            },
            {
              id: 'actions',
              header: t('Actions'),
              cell: (link) => {
                const index = links.indexOf(link)
                return (
                  <StaticRowActions
                    editLabel={t('Edit')}
                    deleteLabel={t('Delete')}
                    menuLabel={t('Open menu')}
                    onEdit={() => handleEdit(index)}
                    onDelete={() => handleDelete(index)}
                  />
                )
              },
            },
          ]}
        />
      </div>

      <Dialog
        open={showDialog}
        onOpenChange={setShowDialog}
        title={editingIndex !== null ? t('Edit link') : t('Add link')}
        description={t('Configure a custom top navigation entry')}
        contentClassName='max-w-xl'
        contentHeight='auto'
        bodyClassName='space-y-4'
        footer={
          <>
            <Button
              type='button'
              variant='outline'
              onClick={() => setShowDialog(false)}
            >
              {t('Cancel')}
            </Button>
            <Button type='submit' form={CUSTOM_NAV_LINK_FORM_ID}>
              {editingIndex !== null ? t('Update') : t('Add')}
            </Button>
          </>
        }
      >
        <Form {...form}>
          <form
            id={CUSTOM_NAV_LINK_FORM_ID}
            onSubmit={form.handleSubmit(handleSubmitForm)}
            className='space-y-4'
          >
            <FormField
              control={form.control}
              name='title'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Title')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('Canvas')} {...field} />
                  </FormControl>
                  <FormDescription>
                    {t('Text shown in the top navigation (max 30 characters).')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='url'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('URL')}</FormLabel>
                  <FormControl>
                    <Input placeholder='/canvas' {...field} />
                  </FormControl>
                  <FormDescription>
                    {t(
                      'Site path starting with / (e.g. /canvas) or an absolute URL (e.g. https://app.example.com).'
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='tag'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Tag (Optional)')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('NEW')} {...field} />
                  </FormControl>
                  <FormDescription>
                    {t(
                      'Short badge shown at the top-right of the link with a glow effect (max 10 characters), e.g. NEW.'
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </Dialog>
    </SettingsSection>
  )
}
