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
import { UserSettings } from '../types';
import { Loader2Icon } from "@/components/ui/icons";
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
}

export function NotificationSettingsForm({ settings, onSave, isUpdating }: NotificationSettingsFormProps) {
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
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="notifications_enabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">
                  Bật thông báo
                </FormLabel>
                <FormDescription>
                  Nhận thông báo trong ứng dụng về hoạt động của bạn
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
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    Thông báo qua email
                  </FormLabel>
                  <FormDescription>
                    Nhận thông báo qua email về hoạt động quan trọng
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={!notificationsEnabled}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notify_on_expense_added"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    Chi tiêu mới
                  </FormLabel>
                  <FormDescription>
                    Thông báo khi có chi tiêu mới trong nhóm của bạn
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
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
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    Thanh toán nhận được
                  </FormLabel>
                  <FormDescription>
                    Thông báo khi ai đó thanh toán cho bạn
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
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
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    Lời mời kết bạn
                  </FormLabel>
                  <FormDescription>
                    Thông báo khi có người gửi lời mời kết bạn
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
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
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    Lời mời vào nhóm
                  </FormLabel>
                  <FormDescription>
                    Thông báo khi được mời vào nhóm mới
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={!notificationsEnabled}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={isUpdating}>
          {isUpdating && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
          Lưu cài đặt
        </Button>
      </form>
    </Form>
  );
}

