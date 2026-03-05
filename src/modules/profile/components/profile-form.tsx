import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useHaptics } from "@/hooks/use-haptics";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ProfileFormValues } from "../types";
import { useTranslation } from "react-i18next";

const profileSchema = z.object({
  full_name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  avatar_url: z.string().optional().or(z.literal("")),
  email: z.string().email().optional(),
});

interface ProfileFormProps {
  onSubmit: (values: ProfileFormValues) => void;
  defaultValues?: Partial<ProfileFormValues>;
  isLoading?: boolean;
  onChangePassword?: () => void;
}

export const ProfileForm = ({
  onSubmit,
  defaultValues,
  isLoading,
  onChangePassword,
}: ProfileFormProps) => {
  const { t } = useTranslation();
  const { tap } = useHaptics();
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: defaultValues?.full_name || "",
      avatar_url: defaultValues?.avatar_url || "",
      email: defaultValues?.email || "",
    },
  });

  // Reset form when defaultValues change (e.g., when profile data loads)
  useEffect(() => {
    if (defaultValues) {
      form.reset({
        full_name: defaultValues.full_name || "",
        avatar_url: defaultValues.avatar_url || "",
        email: defaultValues.email || "",
      });
    }
  }, [defaultValues, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Email (Read-only) */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('profile.email', 'Email')}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  disabled
                  className="bg-muted cursor-not-allowed"
                />
              </FormControl>
              <FormDescription>
                {t('profile.emailReadOnly', 'Email cannot be changed')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Full Name */}
        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('profile.fullName', 'Full Name')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('profile.enterFullName', 'Enter your name')}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {t('profile.fullNameDescription', 'This is how your name will appear to other users.')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Avatar URL (Hidden - managed by upload) */}
        <input type="hidden" {...form.register("avatar_url")} />

        {/* Change Password Button */}
        {onChangePassword && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => { tap(); onChangePassword?.(); }}
          >
            {t('profile.changePassword', 'Change Password')}
          </Button>
        )}

        {/* Submit Button */}
        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? t('common.saving', 'Saving...') : t('common.save', 'Save Profile')}
          </Button>
        </div>
      </form>
    </Form>
  );
};
