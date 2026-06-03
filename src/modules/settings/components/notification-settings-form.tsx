import { useState } from 'react';
import { useForm } from '@refinedev/react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { UserEmail, UserSettings } from '../types';
import { BellIcon, CheckIcon, Loader2Icon, MailIcon, PlusIcon, Trash2Icon } from "@/components/ui/icons";
import { useTranslation } from 'react-i18next';
import { useHaptics } from '@/hooks/use-haptics';

const notificationSettingsSchema = z.object({
  notifications_enabled: z.boolean(),
  email_notifications: z.boolean(),
  notify_on_expense_added: z.boolean(),
  notify_on_payment_received: z.boolean(),
  notify_on_friend_request: z.boolean(),
  notify_on_group_invite: z.boolean(),
});

interface NotificationSettingsFormProps {
  settings?: UserSettings;
  onSave: (values: any) => Promise<void>;
  isUpdating: boolean;
  userEmails?: UserEmail[];
  isEmailUpdating?: boolean;
  onAddEmail?: (email: string) => Promise<void>;
  onSetPrimaryEmail?: (emailId: string) => Promise<void>;
  onRemoveEmail?: (emailId: string) => Promise<void>;
}

export function NotificationSettingsForm({
  settings,
  onSave,
  isUpdating,
  userEmails = [],
  isEmailUpdating = false,
  onAddEmail,
  onSetPrimaryEmail,
  onRemoveEmail,
}: NotificationSettingsFormProps) {
  const { t } = useTranslation();
  const { tap, success } = useHaptics();
  const [newEmail, setNewEmail] = useState("");
  const [emailActionId, setEmailActionId] = useState<string | null>(null);
  const form = useForm({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: {
      notifications_enabled: settings?.notifications_enabled ?? true,
      email_notifications: settings?.email_notifications ?? true,
      notify_on_expense_added: settings?.notify_on_expense_added ?? true,
      notify_on_payment_received: settings?.notify_on_payment_received ?? true,
      notify_on_friend_request: settings?.notify_on_friend_request ?? true,
      notify_on_group_invite: settings?.notify_on_group_invite ?? true,
    },
  });

  const notificationsEnabled = form.watch('notifications_enabled');

  const handleSubmit = async (values: z.infer<typeof notificationSettingsSchema>) => {
    await onSave(values);
    success();
  };

  const handleAddEmail = async () => {
    const email = newEmail.trim();
    if (!email || !onAddEmail) return;
    tap();
    setEmailActionId("new");
    try {
      await onAddEmail(email);
      setNewEmail("");
      success();
    } finally {
      setEmailActionId(null);
    }
  };

  const handleSetPrimaryEmail = async (emailId: string) => {
    if (!onSetPrimaryEmail) return;
    tap();
    setEmailActionId(emailId);
    try {
      await onSetPrimaryEmail(emailId);
      success();
    } finally {
      setEmailActionId(null);
    }
  };

  const handleRemoveEmail = async (emailId: string) => {
    if (!onRemoveEmail) return;
    tap();
    setEmailActionId(emailId);
    try {
      await onRemoveEmail(emailId);
      success();
    } finally {
      setEmailActionId(null);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="notifications_enabled"
          render={({ field }) => (
              <FormItem className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-0.5">
                <FormLabel className="flex items-center gap-2 text-base">
                  <BellIcon className="h-4 w-4 text-primary" aria-hidden="true" />
                  {t('settings.enableNotifications')}
                </FormLabel>
                <FormDescription>
                  {t('settings.enableNotificationsDescription')}
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <FormField
            control={form.control}
            name="email_notifications"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-0.5">
                  <FormLabel className="flex items-center gap-2 text-base">
                    <MailIcon className="h-4 w-4 text-primary" aria-hidden="true" />
                    {t('settings.emailNotifications')}
                  </FormLabel>
                  <FormDescription>
                    {t('settings.emailNotificationsDescription')}
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={(v) => { tap(); field.onChange(v); }}
                    disabled={!notificationsEnabled}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <div className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
            <div className="space-y-0.5">
              <FormLabel className="flex items-center gap-2 text-base">
                <MailIcon className="h-4 w-4 text-primary" aria-hidden="true" />
                {t('settings.emailAddresses')}
              </FormLabel>
              <FormDescription>{t('settings.emailAddressesDescription')}</FormDescription>
            </div>

            <div className="space-y-2">
              {userEmails.length ? (
                userEmails.map((email) => (
                  <div
                    key={email.id}
                    className="flex flex-col gap-2 rounded-lg border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="break-all text-sm font-medium" translate="no">
                          {email.email}
                        </span>
                        {email.is_primary ? (
                          <Badge variant="secondary" className="shrink-0">
                            {t('settings.primaryEmail')}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {!email.is_primary ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleSetPrimaryEmail(email.id)}
                          disabled={isEmailUpdating}
                          title={t('settings.makePrimaryEmail')}
                        >
                          {emailActionId === email.id && isEmailUpdating ? (
                            <Loader2Icon className="h-4 w-4 animate-spin" aria-hidden="true" />
                          ) : (
                            <CheckIcon className="h-4 w-4" aria-hidden="true" />
                          )}
                          <span className="sr-only">{t('settings.makePrimaryEmail')}</span>
                        </Button>
                      ) : null}
                      {!email.is_primary ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveEmail(email.id)}
                          disabled={isEmailUpdating}
                          title={t('settings.removeEmail')}
                        >
                          <Trash2Icon className="h-4 w-4" aria-hidden="true" />
                          <span className="sr-only">{t('settings.removeEmail')}</span>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                  {t('settings.noEmailAddresses')}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="email"
                value={newEmail}
                onChange={(event) => setNewEmail(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void handleAddEmail();
                  }
                }}
                placeholder={t('settings.addEmailPlaceholder')}
                disabled={isEmailUpdating}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddEmail}
                disabled={isEmailUpdating || !newEmail.trim()}
              >
                {emailActionId === "new" && isEmailUpdating ? (
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <PlusIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                )}
                {t('settings.addEmail')}
              </Button>
            </div>
          </div>

          <FormField
            control={form.control}
            name="notify_on_expense_added"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    {t('settings.newExpenseNotifications')}
                  </FormLabel>
                  <FormDescription>
                    {t('settings.newExpenseNotificationsDescription')}
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={(v) => { tap(); field.onChange(v); }}
                    disabled={!notificationsEnabled}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notify_on_payment_received"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    {t('settings.paymentReceivedNotifications')}
                  </FormLabel>
                  <FormDescription>
                    {t('settings.paymentReceivedNotificationsDescription')}
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={(v) => { tap(); field.onChange(v); }}
                    disabled={!notificationsEnabled}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notify_on_friend_request"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    {t('settings.friendRequestNotifications')}
                  </FormLabel>
                  <FormDescription>
                    {t('settings.friendRequestNotificationsDescription')}
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={(v) => { tap(); field.onChange(v); }}
                    disabled={!notificationsEnabled}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notify_on_group_invite"
            render={({ field }) => (
              <FormItem className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    {t('settings.groupInviteNotifications')}
                  </FormLabel>
                  <FormDescription>
                    {t('settings.groupInviteNotificationsDescription')}
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={(v) => { tap(); field.onChange(v); }}
                    disabled={!notificationsEnabled}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" className="cursor-pointer" disabled={isUpdating}>
          {isUpdating && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
          {t('settings.saveSettings')}
        </Button>
      </form>
    </Form>
  );
}
