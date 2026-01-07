import { useState, useEffect, useCallback } from 'react';
import { useGetIdentity } from '@refinedev/core';
import { Profile } from '@/modules/profile/types';
import { supabaseClient } from '@/utility/supabaseClient';
import { MomoSettings } from '@/lib/momo/types';

export function useMomoSettings() {
    const { data: identity } = useGetIdentity<Profile>();
    const [settings, setSettings] = useState<MomoSettings | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    // Check admin by email (consistent with header and donation widget)
    const isAdmin = identity?.email === import.meta.env.VITE_ADMIN_EMAIL;

    // Load MoMo settings
    const loadSettings = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabaseClient
                .from('momo_settings')
                .select('*')
                .single();

            if (!error && data) {
                setSettings(data);
            }
        } catch (error) {
            console.error('Error loading MoMo settings:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Update MoMo settings (admin only)
    const updateSettings = useCallback(async (updates: Partial<MomoSettings>) => {
        if (!isAdmin) {
            throw new Error('Only admins can update MoMo settings');
        }

        const { data, error } = await supabaseClient
            .from('momo_settings')
            .update({
                ...updates,
                updated_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        if (data) {
            setSettings(data);
        }

        return data;
    }, [isAdmin]);

    // Initial load
    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    return {
        settings,
        isLoading,
        isAdmin,
        updateSettings,
        loadSettings,
    };
}
