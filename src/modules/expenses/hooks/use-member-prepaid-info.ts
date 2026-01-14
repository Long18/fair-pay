import { useQuery } from '@tanstack/react-query';
import { supabaseClient } from '@/utility/supabaseClient';
import type { MemberPrepaidInfo } from '../types/prepaid';

/**
 * Hook to fetch comprehensive prepaid info for all members in a recurring expense
 * @param recurringExpenseId - The recurring expense ID
 * @returns Query result with member prepaid info array
 */
export function useMemberPrepaidInfo(recurringExpenseId: string) {
  return useQuery({
    queryKey: ['member_prepaid_info', recurringExpenseId],
    queryFn: async () => {
      const { data, error } = await supabaseClient.rpc(
        'get_all_members_prepaid_info',
        { p_recurring_expense_id: recurringExpenseId }
      );

      if (error) {
        console.error('Error fetching member prepaid info:', error);
        throw error;
      }

      return (data || []) as MemberPrepaidInfo[];
    },
    enabled: !!recurringExpenseId,
    staleTime: 30000, // 30 seconds
  });
}
