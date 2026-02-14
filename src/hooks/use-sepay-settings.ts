/**
 * SePay Settings Hook
 *
 * Manages user's SePay Payment Gateway configuration.
 * Stores sepay_config in user_settings table.
 */

import { useState, useEffect, useCallback } from 'react';
import { useGetIdentity } from '@refinedev/core';
import { Profile } from '@/modules/profile/types';
import { supabaseClient } from '@/utility/supabaseClient';
import { SepayConfig } from '@/types/user-settings';

interface UseSepaySettingsReturn {
  sepayConfig: SepayConfig | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  saveSepayConfig: (config: SepayConfig) => Promise<void>;
  clearSepayConfig: () => Promise<void>;
  isConfigured: boolean;
}

export function useSepaySettings(): UseSepaySettingsReturn {
  const { data: identity } = useGetIdentity<Profile>();
  const [sepayConfig, setSepayConfig] = useState<SepayConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    if (!identity?.id) return;

    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabaseClient
        .from('user_settings')
        .select('sepay_config')
        .eq('user_id', identity.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      setSepayConfig(data?.sepay_config || null);
    } catch (err) {
      console.error('Error loading SePay settings:', err);
      setError('Failed to load SePay settings');
    } finally {
      setIsLoading(false);
    }
  }, [identity?.id]);

  const saveSepayConfig = useCallback(async (config: SepayConfig) => {
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
          sepay_config: config,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (upsertError) throw upsertError;

      setSepayConfig(config);
    } catch (err) {
      console.error('Error saving SePay settings:', err);
      setError('Failed to save SePay settings');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [identity?.id]);

  const clearSepayConfig = useCallback(async () => {
    if (!identity?.id) return;

    setIsSaving(true);
    setError(null);
    try {
      const { error: updateError } = await supabaseClient
        .from('user_settings')
        .update({
          sepay_config: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', identity.id);

      if (updateError) throw updateError;

      setSepayConfig(null);
    } catch (err) {
      console.error('Error clearing SePay settings:', err);
      setError('Failed to clear SePay settings');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [identity?.id]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const isConfigured = Boolean(
    sepayConfig?.merchant_id &&
    sepayConfig?.secret_key &&
    sepayConfig?.environment
  );

  return {
    sepayConfig,
    isLoading,
    isSaving,
    error,
    saveSepayConfig,
    clearSepayConfig,
    isConfigured,
  };
}

/**
 * Hook to check if a payee has SePay configured.
 */
export function usePayeeSepaySettings(userId: string | undefined) {
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setIsConfigured(false);
      return;
    }

    const check = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabaseClient
          .from('user_settings')
          .select('sepay_config')
          .eq('user_id', userId)
          .single();

        if (error || !data?.sepay_config) {
          setIsConfigured(false);
          return;
        }

        const config = data.sepay_config as { merchant_id?: string; secret_key?: string };
        setIsConfigured(Boolean(config.merchant_id && config.secret_key));
      } catch {
        setIsConfigured(false);
      } finally {
        setIsLoading(false);
      }
    };

    check();
  }, [userId]);

  return { isConfigured, isLoading };
}
