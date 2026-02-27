import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from '@/utility/supabaseClient';
import { DonationSettings } from '@/types/donation';

const DONATION_SETTINGS_KEY = ['donation-settings'];

export function useDonationSettings() {
  return useQuery({
    queryKey: DONATION_SETTINGS_KEY,
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from('donation_settings')
        .select('*')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data as DonationSettings;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateDonationSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<DonationSettings>) => {
      const { data: existingSettings } = await supabaseClient
        .from('donation_settings')
        .select('id')
        .single();

      if (existingSettings) {
        const { data, error } = await supabaseClient
          .from('donation_settings')
          .update(settings)
          .eq('id', existingSettings.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabaseClient
          .from('donation_settings')
          .insert(settings)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DONATION_SETTINGS_KEY });
    },
  });
}

export async function uploadDonationImage(
  file: File,
  type: 'avatar' | 'qr-code'
): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${type}-${Date.now()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabaseClient.storage
    .from('donation-images')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabaseClient.storage
    .from('donation-images')
    .getPublicUrl(filePath);

  return data.publicUrl;
}
