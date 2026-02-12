import { useForm } from '@refinedev/react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { UserSettings, PROFILE_VISIBILITY_OPTIONS, ProfileVisibility } from '../types';
import { Loader2Icon } from "@/components/ui/icons";
import { useTranslation } from 'react-i18next';

const privacySettingsSchema = z.object({
  allow_friend_requests: z.boolean(),
  allow_group_invites: z.boolean(),
  profile_visibility: z.enum(['public', 'friends', 'private']),
});

interface PrivacySettingsFormProps {
  settings?: UserSettings;
  onSave: (values: any) => Promise<void>;
  isUpdating: boolean;
}

export function PrivacySettingsForm({ settings, onSave, isUpdating }: PrivacySettingsFormProps) {
  const { t } = useTranslation();
  const form = useForm({
    resolver: zodResolver(privacySettingsSchema),
    defaultValues: {
      allow_friend_requests: settings?.allow_friend_requests ?? true,
      allow_group_invites: settings?.allow_group_invites ?? true,
      profile_visibility: (settings?.profile_visibility || 'friends') as ProfileVisibility,
    },
  });

  const handleSubmit = async (values: z.infer<typeof privacySettingsSchema>) => {
    await onSave(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="allow_friend_requests"
          render={({ field }) => (
            <FormItem className="flex flex-col gap-3 rounded-lg border p-3 sm:p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-0.5">
                <FormLabel className="text-base">
                  {t('settings.allowFriendRequests')}
                </FormLabel>
                <FormDescription>
                  {t('settings.allowFriendRequestsDescription')}
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

        <FormField
          control={form.control}
          name="allow_group_invites"
          render={({ field }) => (
            <FormItem className="flex flex-col gap-3 rounded-lg border p-3 sm:p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-0.5">
                <FormLabel className="text-base">
                  {t('settings.allowGroupInvites')}
                </FormLabel>
                <FormDescription>
                  {t('settings.allowGroupInvitesDescription')}
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

        <FormField
          control={form.control}
          name="profile_visibility"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>{t('settings.profileVisibility')}</FormLabel>
              <FormDescription>
                {t('settings.profileVisibilityDescription')}
              </FormDescription>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  {PROFILE_VISIBILITY_OPTIONS.map((option) => (
                    <FormItem key={option.value} className="flex items-center space-x-3 space-y-0 rounded-lg border p-3 sm:p-4">
                      <FormControl>
                        <RadioGroupItem value={option.value} />
                      </FormControl>
                      <div className="flex-1 min-w-0">
                        <FormLabel className="font-normal cursor-pointer">
                          {option.label}
                        </FormLabel>
                        <p className="text-sm text-muted-foreground">
                          {option.description}
                        </p>
                      </div>
                    </FormItem>
                  ))}
                </RadioGroup>
              </FormControl>
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isUpdating}>
          {isUpdating && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
          {t('settings.saveSettings')}
        </Button>
      </form>
    </Form>
  );
}

