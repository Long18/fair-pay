import { useState } from 'react';
import { useOne, useUpdate, useGetIdentity, useNotification } from '@refinedev/core';
import { Profile } from '@/modules/profile/types';
import { UserSettings, UserSettingsFormValues } from '../types';

export function useUserSettings() {
  const { data: identity } = useGetIdentity<Profile>();
  const { open: notify } = useNotification();

  const { query } = useOne<UserSettings>({
    resource: 'user_settings',
    id: identity?.id || '',
    meta: { idColumnName: 'user_id' },
    queryOptions: {
      enabled: !!identity?.id,
    },
  });

  const { mutate: updateSettings } = useUpdate<UserSettings>();
  const [isUpdating, setIsUpdating] = useState(false);

  const settings = query.data?.data;

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
          meta: { idColumnName: 'user_id' },
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

  return {
    settings,
    isLoading: query.isLoading,
    isUpdating,
    saveSettings,
  };
}

