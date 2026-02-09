import { useEffect, useMemo, useState } from 'react';
import { useGo, useList, useGetIdentity } from '@refinedev/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Group, GroupMember } from '../types';
import { Profile } from '@/modules/profile/types';
import { calculateBalances } from '@/modules/payments/hooks/use-balance-calculation';
import { PlusIcon, SearchIcon } from '@/components/ui/icons';

type FilterType = 'all' | 'active' | 'settled' | 'admin' | 'archived';
type SortType = 'recent' | 'oldest' | 'name' | 'balance';

export const GroupListContent = () => {
  const { data: identity } = useGetIdentity<Profile>();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('recent');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 9;

  // Fetch groups with members
  const { query: groupsQuery } = useList<Group>({
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

  const groups = groupsQuery.data?.data || [];
  const expenses = expensesQuery.data?.data || [];
  const payments = paymentsQuery.data?.data || [];
  const isLoadingGroups = groupsQuery.isLoading;
  const isLoadingExpenses = expensesQuery.isLoading;
  const isLoadingPayments = paymentsQuery.isLoading;

  // Calculate balance summaries for each group
  const balanceSummaries = useMemo(() => {
    if (!identity?.id) return {};

    const summaries: Record<string, BalanceSummary> = {};

    groups.forEach((group: any) => {
      const groupMembers = group.group_members || [];
      const groupExpenses = expenses.filter((e: any) => e.group_id === group.id);
      const groupPayments = payments.filter((p: any) => p.group_id === group.id);

      // Build member list for balance calculation
      const membersList = groupMembers.map((m: any) => ({
        id: m.user_id,
        full_name: m.profiles?.full_name || 'Unknown',
        avatar_url: m.profiles?.avatar_url,
      }));

      // Calculate balances (cast to any for flexibility with API data)
      const balances = calculateBalances(
        groupExpenses as any,
        groupPayments as any,
        membersList
      );

      // Find current user's balance
      const myBalance = balances.find((b) => b.user_id === identity.id);

      // Calculate "you owe" and "owed to you" from current user's perspective
      let you_owe = 0;
      let owed_to_you = 0;

      balances.forEach((balance) => {
        if (balance.user_id === identity.id) return;

        // If their balance is positive (they're owed money) and my balance is negative
        // then I owe them money
        if (balance.balance > 0 && myBalance && myBalance.balance < 0) {
          you_owe += Math.min(Math.abs(myBalance.balance), balance.balance);
        }
        // If their balance is negative (they owe money) and my balance is positive
        // then they owe me money
        if (balance.balance < 0 && myBalance && myBalance.balance > 0) {
          owed_to_you += Math.min(myBalance.balance, Math.abs(balance.balance));
        }
      });

      // Simplified: use absolute balance for summary
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
  }, [groups, expenses, payments, identity?.id]);

  // Transform groups for display
  const groupsWithData = useMemo(() => {
    return groups.map((group: any) => {
      const groupMembers = group.group_members || [];

      const members: GroupMemberPreview[] = groupMembers.map((m: any) => ({
        id: m.user_id,
        name: m.profiles?.full_name || 'Unknown',
        avatar_url: m.profiles?.avatar_url,
      }));

      return {
        id: group.id,
        name: group.name,
        description: group.description,
        created_at: group.created_at,
        created_by: group.created_by,
        is_archived: group.is_archived ?? false,
        member_count: groupMembers.length,
        members,
        groupMembers, // Keep full data for filtering
      };
    });
  }, [groups]);

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
    if (filterType === 'active') {
      filtered = filtered.filter((g) => {
        const summary = balanceSummaries[g.id];
        return !g.is_archived && summary && (summary.you_owe > 0 || summary.owed_to_you > 0);
      });
    } else if (filterType === 'settled') {
      filtered = filtered.filter((g) => {
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
      filtered = filtered.filter((g) => g.is_archived);
    } else {
      // 'all' - hide archived groups only for non-admin members
      filtered = filtered.filter((g) => {
        if (!g.is_archived) return true;
        // Show archived groups if user is admin or creator
        const isGroupAdmin = g.groupMembers.some(
          (m: any) => m.user_id === identity?.id && m.role === 'admin'
        );
        const isGroupCreator = g.created_by === identity?.id;
        return isGroupAdmin || isGroupCreator;
      });
    }

    // Sort
    filtered.sort((a, b) => {
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

  const isLoading = isLoadingGroups || isLoadingExpenses || isLoadingPayments;
  const hasGroups = groups.length > 0;

  return (
    <div className="space-y-6">
      {/* Search & Filters - Only show if has groups */}
      {hasGroups && (
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
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

          {/* Filter Dropdown */}
          <Select
            value={filterType}
            onValueChange={(v) => setFilterType(v as FilterType)}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Groups</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="settled">Settled</SelectItem>
              <SelectItem value="admin">I'm Admin</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort Dropdown */}
          <Select
            value={sortBy}
            onValueChange={(v) => setSortBy(v as SortType)}
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
    </div>
  );
};

export const GroupList = () => {
  const go = useGo();

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
          <Button onClick={() => go({ to: '/groups/create' })} size="lg">
            <PlusIcon className="h-4 w-4 mr-2" />
            New Group
          </Button>
        </div>

        <GroupListContent />
      </div>
    </div>
  );
};
