/**
 * Bank Settings Hook
 *
 * Manages user's bank account settings for VietQR payments.
 * Stores bank_info in user_settings table.
 */

import { useState, useEffect, useCallback } from 'react';
import { useGetIdentity } from '@refinedev/core';
import { Profile } from '@/modules/profile/types';
import { supabaseClient } from '@/utility/supabaseClient';
import { BankInfo, UserSettings } from '@/types/user-settings';

interface UseBankSettingsReturn {
  bankInfo: BankInfo | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  saveBankInfo: (info: BankInfo) => Promise<void>;
  clearBankInfo: () => Promise<void>;
  isConfigured: boolean;
}

export function useBankSettings(): UseBankSettingsReturn {
  const { data: identity } = useGetIdentity<Profile>();
  const [bankInfo, setBankInfo] = useState<BankInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load bank settings
  const loadSettings = useCallback(async () => {
    if (!identity?.id) return;

    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabaseClient
        .from('user_settings')
        .select('bank_info')
        .eq('user_id', identity.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      setBankInfo(data?.bank_info || null);
    } catch (err) {
      console.error('Error loading bank settings:', err);
      setError('Failed to load bank settings');
    } finally {
      setIsLoading(false);
    }
  }, [identity?.id]);

  // Save bank settings
  const saveBankInfo = useCallback(async (info: BankInfo) => {
    if (!identity?.id) {
      setError('User not authenticated');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const { error: upsertError } = await supabaseClient
        .from('user_settings')
        .upsert({
          user_id: identity.id,
          bank_info: info,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (upsertError) throw upsertError;

      setBankInfo(info);
    } catch (err) {
      console.error('Error saving bank settings:', err);
      setError('Failed to save bank settings');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [identity?.id]);

  // Clear bank settings
  const clearBankInfo = useCallback(async () => {
    if (!identity?.id) return;

    setIsSaving(true);
    setError(null);
    try {
      const { error: updateError } = await supabaseClient
        .from('user_settings')
        .update({
          bank_info: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', identity.id);

      if (updateError) throw updateError;

      setBankInfo(null);
    } catch (err) {
      console.error('Error clearing bank settings:', err);
      setError('Failed to clear bank settings');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [identity?.id]);

  // Load on mount and when identity changes
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const isConfigured = Boolean(
    bankInfo?.bank &&
    bankInfo?.account &&
    bankInfo?.accountName
  );

  return {
    bankInfo,
    isLoading,
    isSaving,
    error,
    saveBankInfo,
    clearBankInfo,
    isConfigured,
  };
}

/**
 * Hook to fetch another user's bank settings (for payment)
 */
export function usePayeeBankSettings(userId: string | undefined) {
  const [bankInfo, setBankInfo] = useState<BankInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setBankInfo(null);
      return;
    }

    const fetchPayeeBankInfo = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await supabaseClient
          .from('user_settings')
          .select('bank_info')
          .eq('user_id', userId)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError;
        }

        setBankInfo(data?.bank_info || null);
      } catch (err) {
        console.error('Error fetching payee bank settings:', err);
        setError('Failed to load payee bank info');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPayeeBankInfo();
  }, [userId]);

  const isConfigured = Boolean(
    bankInfo?.bank &&
    bankInfo?.account &&
    bankInfo?.accountName
  );

  return {
    bankInfo,
    isLoading,
    error,
    isConfigured,
  };
}
