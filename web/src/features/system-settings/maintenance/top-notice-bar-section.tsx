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
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import * as z from 'zod'

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

import {
  SettingsForm,
  SettingsSwitchContent,
  SettingsSwitchItem,
} from '../components/settings-form-layout'
import { SettingsPageFormActions } from '../components/settings-page-context'
import { SettingsSection } from '../components/settings-section'
import { useUpdateOption } from '../hooks/use-update-option'

const TOP_NOTICE_BAR_TEXT_MAX = 2000

const topNoticeBarSchema = z.object({
  enabled: z.boolean(),
  text: z.string().max(TOP_NOTICE_BAR_TEXT_MAX),
})

type TopNoticeBarFormValues = z.infer<typeof topNoticeBarSchema>

type TopNoticeBarSectionProps = {
  enabled: boolean
  text: string
}

export function TopNoticeBarSection({ enabled, text }: TopNoticeBarSectionProps) {
  const { t } = useTranslation()
  const updateOption = useUpdateOption()
  const formDefaults = useMemo(() => ({ enabled, text }), [enabled, text])

  const form = useForm<TopNoticeBarFormValues>({
    resolver: zodResolver(topNoticeBarSchema),
    defaultValues: formDefaults,
  })

  useEffect(() => {
    form.reset(formDefaults)
  }, [formDefaults, form])

  const onSubmit = async (values: TopNoticeBarFormValues) => {
    if (values.enabled === enabled && values.text === text) {
      return
    }
    if (values.enabled !== enabled) {
      await updateOption.mutateAsync({
        key: 'console_setting.top_notice_bar_enabled',
        value: values.enabled,
      })
    }
    if (values.text !== text) {
      await updateOption.mutateAsync({
        key: 'console_setting.top_notice_bar_text',
        value: values.text,
      })
    }
  }

  const resetToDefault = () => {
    form.reset({ enabled: false, text: '' })
  }

  return (
    <SettingsSection title={t('Top notice bar')}>
      <Form {...form}>
        <SettingsForm onSubmit={form.handleSubmit(onSubmit)}>
          <SettingsPageFormActions
            onSave={form.handleSubmit(onSubmit)}
            onReset={resetToDefault}
            isSaving={updateOption.isPending}
            resetLabel='Reset to default'
            saveLabel='Save notice bar'
          />
          <FormField
            control={form.control}
            name='enabled'
            render={({ field }) => (
              <SettingsSwitchItem>
                <SettingsSwitchContent>
                  <FormLabel>{t('Enable top notice bar')}</FormLabel>
                  <FormDescription>
                    {t(
                      'Show a scrolling activity banner at the very top of the homepage. Independent from system announcements.'
                    )}
                  </FormDescription>
                </SettingsSwitchContent>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </SettingsSwitchItem>
            )}
          />
          <FormField
            control={form.control}
            name='text'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Notice bar content')}</FormLabel>
                <FormControl>
                  <Textarea
                    rows={5}
                    disabled={!form.watch('enabled')}
                    placeholder={t(
                      'One notice per line, e.g. Limited-time recharge bonus!'
                    )}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  {t(
                    'Each line is a separate notice; they scroll continuously across the top bar. Max 2000 characters.'
                  )}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </SettingsForm>
      </Form>
    </SettingsSection>
  )
}
