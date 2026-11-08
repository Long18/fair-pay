/**
 * Per-user MoMo receive settings (manual QR; stored in user_settings.momo_info).
 */

import { useState, useEffect, useCallback } from 'react';
import { useGetIdentity } from '@refinedev/core';
import { Profile } from '@/modules/profile/types';
import { supabaseClient } from '@/utility/supabaseClient';
import { MomoInfo } from '@/types/user-settings';
import { resolveDevMomoInfo } from '@/lib/bank/dev-preview-bank-settings';
import { isUserSettingsMomoInfoColumnMissing } from '@/lib/supabase/postgrest-errors';

export type MomoSettingsErrorCode = 'schema_not_ready' | 'generic';

interface UseMomoInfoSettingsReturn {
  momoInfo: MomoInfo | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  errorCode: MomoSettingsErrorCode | null;
  saveMomoInfo: (info: MomoInfo) => Promise<void>;
  clearMomoInfo: () => Promise<void>;
  isConfigured: boolean;
}

function classifyMomoSettingsError(err: unknown): MomoSettingsErrorCode {
  return isUserSettingsMomoInfoColumnMissing(err) ? 'schema_not_ready' : 'generic';
}

export function useMomoInfoSettings(): UseMomoInfoSettingsReturn {
  const { data: identity } = useGetIdentity<Profile>();
  const [momoInfo, setMomoInfo] = useState<MomoInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<MomoSettingsErrorCode | null>(null);

  const loadSettings = useCallback(async () => {
    if (!identity?.id) return;

    setIsLoading(true);
    setError(null);
    setErrorCode(null);
    try {
      const { data, error: fetchError } = await supabaseClient
        .from('user_settings')
        .select('momo_info')
        .eq('user_id', identity.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      const raw = (data?.momo_info as MomoInfo | null) ?? null;
      setMomoInfo(resolveDevMomoInfo(raw));
    } catch (err) {
      console.error('Error loading MoMo settings:', err);
      const code = classifyMomoSettingsError(err);
      setErrorCode(code);
      setError(
        code === 'schema_not_ready'
          ? 'MoMo settings database schema is not ready'
          : 'Failed to load MoMo settings'
      );
    } finally {
      setIsLoading(false);
    }
  }, [identity?.id]);

  const saveMomoInfo = useCallback(async (info: MomoInfo) => {
    if (!identity?.id) {
      setError('User not authenticated');
      return;
    }

    setIsSaving(true);
    setError(null);
    setErrorCode(null);
    try {
      const { error: upsertError } = await supabaseClient
        .from('user_settings')
        .upsert(
          {
            user_id: identity.id,
            momo_info: info,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (upsertError) throw upsertError;

      setMomoInfo(info);
    } catch (err) {
      console.error('Error saving MoMo settings:', err);
      const code = classifyMomoSettingsError(err);
      setErrorCode(code);
      setError(
        code === 'schema_not_ready'
          ? 'MoMo settings database schema is not ready'
          : 'Failed to save MoMo settings'
      );
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [identity?.id]);

  const clearMomoInfo = useCallback(async () => {
    if (!identity?.id) return;

    setIsSaving(true);
    setError(null);
    setErrorCode(null);
    try {
      const { error: updateError } = await supabaseClient
        .from('user_settings')
        .update({
          momo_info: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', identity.id);

      if (updateError) throw updateError;

      setMomoInfo(null);
    } catch (err) {
      console.error('Error clearing MoMo settings:', err);
      const code = classifyMomoSettingsError(err);
      setErrorCode(code);
      setError(
        code === 'schema_not_ready'
          ? 'MoMo settings database schema is not ready'
          : 'Failed to clear MoMo settings'
      );
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [identity?.id]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const isConfigured = Boolean(momoInfo?.accountName?.trim() && momoInfo?.phone?.trim());

  return {
    momoInfo,
    isLoading,
    isSaving,
    error,
    errorCode,
    saveMomoInfo,
    clearMomoInfo,
    isConfigured,
  };
}

export async function uploadMomoQrImage(userId: string, file: File): Promise<string> {
  const fileExt = file.name.split('.').pop() || 'png';
  const filePath = `${userId}/momo-qr-${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabaseClient.storage
    .from('payment-settings')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabaseClient.storage.from('payment-settings').getPublicUrl(filePath);
  return data.publicUrl;
}

export function usePayeeMomoInfo(userId: string | undefined) {
  const [momoInfo, setMomoInfo] = useState<MomoInfo | null>(null);
  const [isLoading, setIsLoading] = useState(() => Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setMomoInfo(null);
      setIsLoading(false);
      return;
    }

    const fetchPayeeMomo = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await supabaseClient
          .from('user_settings')
          .select('momo_info')
          .eq('user_id', userId)
          .maybeSingle();

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError;
        }

        const raw = (data?.momo_info as MomoInfo | null) ?? null;
        setMomoInfo(resolveDevMomoInfo(raw));
      } catch (err) {
        console.error('Error fetching payee MoMo settings:', err);
        setError('Failed to load payee MoMo info');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPayeeMomo();
  }, [userId]);

  const isConfigured = Boolean(
    momoInfo?.accountName?.trim() && momoInfo?.phone?.trim()
  );

  return {
    momoInfo,
    isLoading,
    error,
    isConfigured,
  };
}
