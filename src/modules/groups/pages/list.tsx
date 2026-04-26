import { useCallback, useEffect, useMemo, useState } from 'react';
import { useGo, useList, useGetIdentity } from '@refinedev/core';
import { useHaptics } from '@/hooks/use-haptics';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PaginationControls, PaginationMetadata } from '@/components/ui/pagination-controls';
import { GroupCard, BalanceSummary, GroupMemberPreview } from '../components/group-card';
import { EmptyGroupsState } from '../components/empty-groups-state';
import { Group } from '../types';
import { Profile } from '@/modules/profile/types';
import { calculateBalances } from '@/modules/payments/hooks/use-balance-calculation';
import { useJoinRequests } from '../hooks/use-join-request';
import { supabaseClient } from '@/utility/supabaseClient';
import { useQuery } from '@tanstack/react-query';
import { Clock3Icon, Loader2Icon, LogInIcon, PlusIcon, SearchIcon } from '@/components/ui/icons';
import { useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';

type FilterType = 'all' | 'active' | 'settled' | 'admin' | 'archived' | 'discover';
type SortType = 'recent' | 'oldest' | 'name' | 'balance';

export const GroupListContent = () => {
  const { t } = useTranslation();
  const { data: identity } = useGetIdentity<Profile>();
  const { tap } = useHaptics();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('recent');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 9;
  const joinPromptGroupId = searchParams.get('joinGroupId');

  // Fetch ALL groups with member counts via RPC
  const { data: allGroupsData, isLoading: isLoadingAllGroups } = useQuery({
    queryKey: ['all-groups-with-counts'],
    queryFn: async () => {
      const { data, error } = await supabaseClient.rpc('get_all_groups_with_member_counts');
      if (error) throw error;
      return data as Array<Group & { member_count: number }>;
    },
    staleTime: 2 * 60 * 1000,
  });

  // Fetch groups where user IS a member (with full member details)
  const { query: myGroupsQuery } = useList<Group>({
    resource: 'groups',
    pagination: { mode: 'off' },
    meta: {
      select: '*, group_members(*, profiles!user_id(*))',
    },
  });

  // Fetch all expenses for balance calculation
  const { query: expensesQuery } = useList({
    resource: 'expenses',
    pagination: { mode: 'off' },
    meta: {
      select: 'id, group_id, amount, paid_by_user_id, expense_splits(*)',
    },
    queryOptions: {
      staleTime: 2 * 60 * 1000,
    },
  });

  // Fetch all payments for balance calculation
  const { query: paymentsQuery } = useList({
    resource: 'payments',
    pagination: { mode: 'off' },
    meta: {
      select: 'id, group_id, amount, from_user, to_user',
    },
    queryOptions: {
      staleTime: 2 * 60 * 1000,
    },
  });

  // Join request hook
  const {
    getRequestStatus,
    requestJoin,
    requestingGroupId,
  } = useJoinRequests();

  const allGroups = allGroupsData || [];
  const myGroups = myGroupsQuery.data?.data || [];
  const expenses = expensesQuery.data?.data || [];
  const payments = paymentsQuery.data?.data || [];
  const isLoadingMyGroups = myGroupsQuery.isLoading;
  const isLoadingExpenses = expensesQuery.isLoading;
  const isLoadingPayments = paymentsQuery.isLoading;

  // Build a Set of group IDs the user is a member of
  const myGroupIds = useMemo(() => {
    const ids = new Set<string>();
    myGroups.forEach((g: any) => {
      const members = g.group_members || [];
      if (members.some((m: any) => m.user_id === identity?.id)) {
        ids.add(g.id);
      }
    });
    return ids;
  }, [myGroups, identity?.id]);

  // Build a map of my groups with full member data
  const myGroupsMap = useMemo(() => {
    const map = new Map<string, any>();
    myGroups.forEach((g: any) => {
      map.set(g.id, g);
    });
    return map;
  }, [myGroups]);

  // Calculate balance summaries for each group (only for member groups)
  const balanceSummaries = useMemo(() => {
    if (!identity?.id) return {};

    const summaries: Record<string, BalanceSummary> = {};

    myGroups.forEach((group: any) => {
      const groupMembers = group.group_members || [];
      const groupExpenses = expenses.filter((e: any) => e.group_id === group.id);
      const groupPayments = payments.filter((p: any) => p.group_id === group.id);

      const membersList = groupMembers.map((m: any) => ({
        id: m.user_id,
        full_name: m.profiles?.full_name || 'Unknown',
        avatar_url: m.profiles?.avatar_url,
      }));

      const balances = calculateBalances(
        groupExpenses as any,
        groupPayments as any,
        membersList
      );

      const myBalance = balances.find((b) => b.user_id === identity.id);

      let you_owe = 0;
      let owed_to_you = 0;

      if (myBalance) {
        if (myBalance.balance < 0) {
          you_owe = Math.abs(myBalance.balance);
          owed_to_you = 0;
        } else if (myBalance.balance > 0) {
          you_owe = 0;
          owed_to_you = myBalance.balance;
        }
      }

      summaries[group.id] = {
        you_owe,
        owed_to_you,
        net_balance: owed_to_you - you_owe,
      };
    });

    return summaries;
  }, [myGroups, expenses, payments, identity?.id]);

  // Transform all groups for display
  const groupsWithData = useMemo(() => {
    return allGroups.map((group) => {
      const isMember = myGroupIds.has(group.id);
      const myGroupData = myGroupsMap.get(group.id);
      const groupMembers = isMember ? (myGroupData?.group_members || []) : [];

      const members: GroupMemberPreview[] = groupMembers.map((m: any) => ({
        id: m.user_id,
        name: m.profiles?.full_name || 'Unknown',
        avatar_url: m.profiles?.avatar_url,
      }));

      return {
        id: group.id,
        name: group.name,
        description: group.description,
        avatar_url: group.avatar_url ?? null,
        created_at: group.created_at,
        created_by: group.created_by,
        is_archived: group.is_archived ?? false,
        member_count: group.member_count,
        members,
        groupMembers,
        isMember,
      };
    });
  }, [allGroups, myGroupIds, myGroupsMap]);

  const promptedGroup = useMemo(
    () => groupsWithData.find((group) => group.id === joinPromptGroupId),
    [groupsWithData, joinPromptGroupId]
  );
  const promptedJoinRequestStatus =
    promptedGroup && !promptedGroup.isMember ? getRequestStatus(promptedGroup.id) : null;
  const isJoinPromptRequesting =
    !!promptedGroup && requestingGroupId === promptedGroup.id;
  const shouldShowJoinPrompt =
    !!joinPromptGroupId && !isLoadingAllGroups && !isLoadingMyGroups && !!promptedGroup && !promptedGroup.isMember;

  const closeJoinPrompt = useCallback(() => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', 'groups');
    nextParams.delete('joinGroupId');
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleRequestJoinFromPrompt = useCallback(async () => {
    if (!promptedGroup) return;

    tap();
    await requestJoin(promptedGroup.id);
    closeJoinPrompt();
  }, [closeJoinPrompt, promptedGroup, requestJoin, tap]);

  useEffect(() => {
    if (!joinPromptGroupId || isLoadingAllGroups || isLoadingMyGroups) return;
    if (!promptedGroup || promptedGroup.isMember) {
      closeJoinPrompt();
    }
  }, [closeJoinPrompt, isLoadingAllGroups, isLoadingMyGroups, joinPromptGroupId, promptedGroup]);

  // Filter and sort groups
  const filteredGroups = useMemo(() => {
    let filtered = [...groupsWithData];

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (g) =>
          g.name.toLowerCase().includes(query) ||
          g.description?.toLowerCase().includes(query)
      );
    }

    // Filter
    if (filterType === 'discover') {
      filtered = filtered.filter((g) => !g.isMember && !g.is_archived);
    } else if (filterType === 'active') {
      filtered = filtered.filter((g) => {
        if (!g.isMember) return false;
        const summary = balanceSummaries[g.id];
        return !g.is_archived && summary && (summary.you_owe > 0 || summary.owed_to_you > 0);
      });
    } else if (filterType === 'settled') {
      filtered = filtered.filter((g) => {
        if (!g.isMember) return false;
        const summary = balanceSummaries[g.id];
        return !g.is_archived && summary && summary.you_owe === 0 && summary.owed_to_you === 0;
      });
    } else if (filterType === 'admin') {
      filtered = filtered.filter((g) =>
        g.groupMembers.some(
          (m: any) => m.user_id === identity?.id && m.role === 'admin'
        )
      );
    } else if (filterType === 'archived') {
      filtered = filtered.filter((g) => g.is_archived && g.isMember);
    } else {
      // 'all' - show member groups + non-member non-archived groups
      filtered = filtered.filter((g) => {
        // Always show non-archived groups
        if (!g.is_archived) return true;
        // For archived, only show if user is admin or creator
        if (!g.isMember) return false;
        const isGroupAdmin = g.groupMembers.some(
          (m: any) => m.user_id === identity?.id && m.role === 'admin'
        );
        const isGroupCreator = g.created_by === identity?.id;
        return isGroupAdmin || isGroupCreator;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      // Always put member groups first (except in discover mode)
      if (filterType !== 'discover') {
        if (a.isMember && !b.isMember) return -1;
        if (!a.isMember && b.isMember) return 1;
      }

      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'recent':
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        case 'oldest':
          return (
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        case 'balance':
          const aBalance = Math.abs(balanceSummaries[a.id]?.net_balance || 0);
          const bBalance = Math.abs(balanceSummaries[b.id]?.net_balance || 0);
          return bBalance - aBalance;
        default:
          return 0;
      }
    });

    return filtered;
  }, [groupsWithData, searchQuery, filterType, sortBy, balanceSummaries, identity?.id]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterType, sortBy]);

  const totalItems = filteredGroups.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  useEffect(() => {
    if (safePage !== currentPage) {
      setCurrentPage(safePage);
    }
  }, [safePage, currentPage]);

  const paginatedGroups = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredGroups.slice(start, start + pageSize);
  }, [filteredGroups, safePage]);

  const paginationMetadata: PaginationMetadata = {
    totalItems,
    totalPages,
    currentPage: safePage,
    pageSize,
  };

  const isLoading = isLoadingAllGroups || isLoadingMyGroups || isLoadingExpenses || isLoadingPayments;
  const hasGroups = allGroups.length > 0;

  return (
    <div className="space-y-6">
      {/* Search & Filters */}
      {hasGroups && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select
            value={filterType}
            onValueChange={(v) => { tap(); setFilterType(v as FilterType); }}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Groups</SelectItem>
              <SelectItem value="discover">Discover</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="settled">Settled</SelectItem>
              <SelectItem value="admin">I'm Admin</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={sortBy}
            onValueChange={(v) => { tap(); setSortBy(v as SortType); }}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="balance">Balance</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-64 rounded-lg bg-muted animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Groups Grid */}
      {!isLoading && filteredGroups.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedGroups.map((group) => {
              const isGroupAdmin = group.groupMembers.some(
                (m: any) => m.user_id === identity?.id && m.role === 'admin'
              );
              const isGroupCreator = group.created_by === identity?.id;
              return (
                <GroupCard
                  key={group.id}
                  group={group}
                  balanceSummary={balanceSummaries[group.id]}
                  isLoading={isLoading}
                  canManage={isGroupAdmin || isGroupCreator}
                  isMember={group.isMember}
                  joinRequestStatus={!group.isMember ? getRequestStatus(group.id) : null}
                  onRequestJoin={requestJoin}
                  isRequestingJoin={requestingGroupId === group.id}
                />
              );
            })}
          </div>
          <PaginationControls
            metadata={paginationMetadata}
            onPageChange={setCurrentPage}
            className="pt-2"
          />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredGroups.length === 0 && (
        <EmptyGroupsState hasGroups={hasGroups} />
      )}

      <Dialog
        open={shouldShowJoinPrompt}
        onOpenChange={(open) => {
          if (!open) closeJoinPrompt();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary sm:mx-0">
              {promptedJoinRequestStatus === 'pending' ? (
                <Clock3Icon className="h-5 w-5" aria-hidden="true" />
              ) : (
                <LogInIcon className="h-5 w-5" aria-hidden="true" />
              )}
            </div>
            <DialogTitle>
              {t('groups.joinPrompt.title', 'Bạn chưa là thành viên')}
            </DialogTitle>
            <DialogDescription className="text-pretty">
              {t(
                'groups.joinPrompt.descriptionPrefix',
                'FairPay đã đưa bạn về danh sách nhóm vì thông tin chi tiết chỉ dành cho thành viên.'
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground" aria-live="polite">
            {promptedJoinRequestStatus === 'pending' ? (
              <p>
                {t(
                  'groups.joinPrompt.pending',
                  'Yêu cầu tham gia nhóm này của bạn đang chờ quản trị viên duyệt.'
                )}
              </p>
            ) : (
              <p>
                {t('groups.joinPrompt.questionPrefix', 'Bạn có muốn gửi yêu cầu tham gia')}{' '}
                <span className="font-medium text-foreground" translate="no">
                  {promptedGroup?.name || t('groups.joinPrompt.thisGroup', 'nhóm này')}
                </span>
                ?
              </p>
            )}
          </div>

          <DialogFooter>
            {promptedJoinRequestStatus === 'pending' ? (
              <Button type="button" onClick={closeJoinPrompt}>
                {t('common.ok', 'Đã hiểu')}
              </Button>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={closeJoinPrompt}>
                  {t('groups.joinPrompt.later', 'Để sau')}
                </Button>
                <Button
                  type="button"
                  onClick={handleRequestJoinFromPrompt}
                  disabled={isJoinPromptRequesting}
                >
                  {isJoinPromptRequesting ? (
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <LogInIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                  )}
                  {promptedJoinRequestStatus === 'rejected'
                    ? t('groups.joinPrompt.requestAgain', 'Gửi yêu cầu lại')
                    : t('groups.joinPrompt.requestJoin', 'Gửi yêu cầu tham gia')}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export const GroupList = () => {
  const go = useGo();
  const { tap } = useHaptics();

  return (
    <div className="container py-8 max-w-7xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Groups</h1>
            <p className="text-muted-foreground mt-1">
              Manage your expense groups
            </p>
          </div>
          <Button onClick={() => { tap(); go({ to: '/groups/create' }); }} size="lg">
            <PlusIcon className="h-4 w-4 mr-2" />
            New Group
          </Button>
        </div>

        <GroupListContent />
      </div>
    </div>
  );
};
