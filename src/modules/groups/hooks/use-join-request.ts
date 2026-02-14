import { useState, useCallback } from 'react';
import { useGetIdentity, useCreate, useList, useDelete } from '@refinedev/core';
import { supabaseClient } from '@/utility/supabaseClient';
import { Profile } from '@/modules/profile/types';
import { toast } from 'sonner';

export interface JoinRequest {
  id: string;
  group_id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  message?: string;
  created_at: string;
}

export function useJoinRequests() {
  const { data: identity } = useGetIdentity<Profile>();
  const [requestingGroupId, setRequestingGroupId] = useState<string | null>(null);

  // Fetch user's own join requests
  const { query: requestsQuery } = useList<JoinRequest>({
    resource: 'group_join_requests',
    pagination: { mode: 'off' },
    filters: [
      { field: 'user_id', operator: 'eq', value: identity?.id },
    ],
    queryOptions: { enabled: !!identity?.id },
    meta: { select: 'id, group_id, status, created_at' },
  });

  const joinRequests = requestsQuery.data?.data || [];

  // Get request status for a specific group
  const getRequestStatus = useCallback(
    (groupId: string): 'pending' | 'approved' | 'rejected' | null => {
      const request = joinRequests.find(
        (r) => r.group_id === groupId
      );
      // Prioritize pending over rejected (user may have re-requested)
      const pending = joinRequests.find(
        (r) => r.group_id === groupId && r.status === 'pending'
      );
      if (pending) return 'pending';
      return request?.status ?? null;
    },
    [joinRequests]
  );

  // Send a join request
  const requestJoin = useCallback(
    async (groupId: string) => {
      if (!identity?.id) return;
      setRequestingGroupId(groupId);
      try {
        const { error } = await supabaseClient
          .from('group_join_requests')
          .insert({
            group_id: groupId,
            user_id: identity.id,
            status: 'pending',
          });

        if (error) {
          if (error.code === '23505') {
            toast.info('You already have a pending request for this group');
          } else {
            throw error;
          }
        } else {
          toast.success('Join request sent! The group admin will review it.');
          requestsQuery.refetch();
        }
      } catch (err: any) {
        toast.error(`Failed to send join request: ${err.message}`);
      } finally {
        setRequestingGroupId(null);
      }
    },
    [identity?.id, requestsQuery]
  );

  // Cancel a pending request
  const cancelRequest = useCallback(
    async (groupId: string) => {
      const request = joinRequests.find(
        (r) => r.group_id === groupId && r.status === 'pending'
      );
      if (!request) return;

      try {
        const { error } = await supabaseClient
          .from('group_join_requests')
          .delete()
          .eq('id', request.id);

        if (error) throw error;
        toast.success('Join request cancelled');
        requestsQuery.refetch();
      } catch (err: any) {
        toast.error(`Failed to cancel request: ${err.message}`);
      }
    },
    [joinRequests, requestsQuery]
  );

  return {
    joinRequests,
    getRequestStatus,
    requestJoin,
    cancelRequest,
    requestingGroupId,
    isLoading: requestsQuery.isLoading,
  };
}

// Hook for group admins to manage join requests
export function useGroupJoinRequests(groupId?: string) {
  const { query: requestsQuery } = useList<JoinRequest & { profiles?: Profile }>({
    resource: 'group_join_requests',
    pagination: { mode: 'off' },
    filters: [
      { field: 'group_id', operator: 'eq', value: groupId },
      { field: 'status', operator: 'eq', value: 'pending' },
    ],
    queryOptions: { enabled: !!groupId },
    meta: { select: '*, profiles!user_id(id, full_name, avatar_url, email)' },
  });

  const pendingRequests = requestsQuery.data?.data || [];

  const approveRequest = useCallback(
    async (requestId: string) => {
      try {
        const { error } = await supabaseClient.rpc('approve_join_request', {
          p_request_id: requestId,
        });
        if (error) throw error;
        toast.success('Join request approved');
        requestsQuery.refetch();
      } catch (err: any) {
        toast.error(`Failed to approve: ${err.message}`);
      }
    },
    [requestsQuery]
  );

  const rejectRequest = useCallback(
    async (requestId: string) => {
      try {
        const { error } = await supabaseClient.rpc('reject_join_request', {
          p_request_id: requestId,
        });
        if (error) throw error;
        toast.success('Join request declined');
        requestsQuery.refetch();
      } catch (err: any) {
        toast.error(`Failed to decline: ${err.message}`);
      }
    },
    [requestsQuery]
  );

  return {
    pendingRequests,
    approveRequest,
    rejectRequest,
    isLoading: requestsQuery.isLoading,
    refetch: requestsQuery.refetch,
  };
}
