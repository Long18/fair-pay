import { useState } from 'react';
import { useOne, useGetIdentity, useNotification } from '@refinedev/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useInstantUpdate } from '@/hooks/use-instant-mutation';
import { Profile } from '@/modules/profile/types';
import { supabaseClient } from '@/utility/supabaseClient';
import { UserEmail, UserSettings, UserSettingsFormValues } from '../types';

export function useUserSettings() {
  const { data: identity } = useGetIdentity<Profile>();
  const { open: notify } = useNotification();
  const queryClient = useQueryClient();

  const { query } = useOne<UserSettings>({
    resource: 'user_settings',
    id: identity?.id || '',
    meta: { idColumnName: 'user_id' },
    queryOptions: {
      enabled: !!identity?.id,
    },
  });

  const { mutate: updateSettings } = useInstantUpdate();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEmailUpdating, setIsEmailUpdating] = useState(false);

  const settings = query.data?.data;
  const userEmailsQueryKey = ['settings', 'user-emails', identity?.id];

  const userEmailsQuery = useQuery<UserEmail[]>({
    queryKey: userEmailsQueryKey,
    enabled: !!identity?.id,
    queryFn: async () => {
      if (!identity?.id) return [];

      const { data, error } = await supabaseClient
        .from('user_emails')
        .select('*')
        .eq('user_id', identity.id)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data ?? []) as UserEmail[];
    },
  });

  const invalidateUserEmails = async () => {
    await queryClient.invalidateQueries({ queryKey: userEmailsQueryKey });
  };

  const saveSettings = async (values: Partial<UserSettingsFormValues>): Promise<void> => {
    if (!identity?.id) {
      notify?.({
        type: 'error',
        message: 'Không thể cập nhật cài đặt: Người dùng chưa đăng nhập',
      });
      return;
    }

    setIsUpdating(true);
    return new Promise((resolve, reject) => {
      updateSettings(
        {
          resource: 'user_settings',
          id: identity.id,
          meta: { idColumnName: 'user_id', undoConfig: { enabled: false } },
          values: {
            ...values,
            updated_at: new Date().toISOString(),
          },
        },
        {
          onSuccess: () => {
            notify?.({
              type: 'success',
              message: 'Cài đặt đã được lưu thành công',
            });
            setIsUpdating(false);
            resolve();
          },
          onError: (error) => {
            notify?.({
              type: 'error',
              message: `Lỗi khi lưu cài đặt: ${error.message}`,
            });
            setIsUpdating(false);
            reject(error);
          },
        }
      );
    });
  };

  const addEmail = async (email: string): Promise<void> => {
    if (!identity?.id) {
      notify?.({
        type: 'error',
        message: 'Không thể thêm email: Người dùng chưa đăng nhập',
      });
      return;
    }

    setIsEmailUpdating(true);
    try {
      const { error } = await supabaseClient.rpc('add_user_email', {
        p_email: email,
        p_user_id: identity.id,
        p_make_primary: false,
      });
      if (error) throw error;
      notify?.({ type: 'success', message: 'Email đã được thêm' });
      await invalidateUserEmails();
    } catch (error) {
      notify?.({
        type: 'error',
        message: `Lỗi khi thêm email: ${error instanceof Error ? error.message : 'Không rõ lỗi'}`,
      });
      throw error;
    } finally {
      setIsEmailUpdating(false);
    }
  };

  const setPrimaryEmail = async (emailId: string): Promise<void> => {
    setIsEmailUpdating(true);
    try {
      const { error } = await supabaseClient.rpc('set_primary_user_email', {
        p_email_id: emailId,
      });
      if (error) throw error;
      notify?.({ type: 'success', message: 'Email chính đã được cập nhật' });
      await invalidateUserEmails();
    } catch (error) {
      notify?.({
        type: 'error',
        message: `Lỗi khi đổi email chính: ${error instanceof Error ? error.message : 'Không rõ lỗi'}`,
      });
      throw error;
    } finally {
      setIsEmailUpdating(false);
    }
  };

  const removeEmail = async (emailId: string): Promise<void> => {
    setIsEmailUpdating(true);
    try {
      const { error } = await supabaseClient.rpc('remove_user_email', {
        p_email_id: emailId,
      });
      if (error) throw error;
      notify?.({ type: 'success', message: 'Email đã được xóa' });
      await invalidateUserEmails();
    } catch (error) {
      notify?.({
        type: 'error',
        message: `Lỗi khi xóa email: ${error instanceof Error ? error.message : 'Không rõ lỗi'}`,
      });
      throw error;
    } finally {
      setIsEmailUpdating(false);
    }
  };

  return {
    settings,
    isLoading: query.isLoading,
    isUpdating,
    saveSettings,
    userEmails: userEmailsQuery.data ?? [],
    isEmailLoading: userEmailsQuery.isLoading,
    isEmailUpdating,
    addEmail,
    setPrimaryEmail,
    removeEmail,
  };
}
