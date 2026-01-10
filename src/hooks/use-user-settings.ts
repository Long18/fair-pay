/**
 * useUserSettings Hook
 * 
 * Fetches user settings by user_id. Used by banking payment components
 * to retrieve payee's banking information for payment dialogs.
 * 
 * @param userId - The user ID to fetch settings for (defaults to current user)
 * @returns User settings data, loading state, and error state
 */

import { useQuery } from '@tanstack/react-query';
import { useGetIdentity } from '@refinedev/core';
import { supabaseClient } from '@/utility/supabaseClient';
import { UserSettings } from '@/types/user-settings';
import { Profile } from '@/modules/profile/types';

export function useUserSettings(userId?: string) {
  const { data: identity } = useGetIdentity<Profile>();
  
  // Use provided userId or fall back to current user's ID
  const targetUserId = userId || identity?.id;

  const query = useQuery({
    queryKey: ['user_settings', targetUserId],
    queryFn: async () => {
      if (!targetUserId) {
        throw new Error('User ID is required');
      }

      const { data, error } = await supabaseClient
        .from('user_settings')
        .select('*')
        .eq('user_id', targetUserId)
        .single();

      if (error) {
        // If no settings found, return null (user hasn't configured settings yet)
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data as UserSettings;
    },
    enabled: !!targetUserId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1, // Only retry once on failure
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
