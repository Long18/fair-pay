# Phase 6: Group List Enhancement

**Status:** Pending
**Priority:** Medium
**Estimated Time:** 8-10 hours
**Dependencies:** Phase 1 (Design System)

---

## Overview

Transform group list from table layout to card-based design with balance preview and quick actions.

---

## Current Issues (list.tsx)

**Problems:**
- Table layout (DataTable) hard to scan on mobile
- No balance preview - need to click into group
- No quick actions from list view
- Empty state basic, not engaging
- No filtering/sorting options

**Current Structure:**
```tsx
// 57 lines total
<DataTable
  columns={useGroupColumns()}
  data={groups}
/>
```

---

## Solution: Card-Based Layout

### New Layout Structure

```
┌─────────────────────────────────────────┐
│ Groups                    [+ New Group] │
├─────────────────────────────────────────┤
│ [Search] [Filter: All ▾] [Sort: Name ▾]│
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ 🏷️ Group Name                       │ │
│ │ 4 members • Created 2 weeks ago     │ │
│ │ ──────────────────────────────────  │ │
│ │ You owe: 150,000 ₫                  │ │
│ │ Owed to you: 80,000 ₫               │ │
│ │ [View Details] [Add Expense]        │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ 🏷️ Another Group                    │ │
│ │ ...                                 │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## Implementation Details

### 1. Replace DataTable with Card Grid

```tsx
// Remove DataTable import and usage
// Add card-based layout

<div className="space-y-6">
  {/* Header */}
  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
    <div>
      <h1 className="text-3xl font-bold">Groups</h1>
      <p className="text-muted-foreground mt-1">
        Manage your expense groups
      </p>
    </div>
    <Button
      onClick={() => go({ to: '/groups/create' })}
      size="lg"
    >
      <PlusIcon className="h-4 w-4 mr-2" />
      New Group
    </Button>
  </div>

  {/* Search & Filters */}
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
    <Select value={filterType} onValueChange={setFilterType}>
      <SelectTrigger className="w-full sm:w-40">
        <SelectValue placeholder="Filter" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Groups</SelectItem>
        <SelectItem value="active">Active</SelectItem>
        <SelectItem value="settled">Settled</SelectItem>
        <SelectItem value="admin">I'm Admin</SelectItem>
      </SelectContent>
    </Select>

    {/* Sort Dropdown */}
    <Select value={sortBy} onValueChange={setSortBy}>
      <SelectTrigger className="w-full sm:w-40">
        <SelectValue placeholder="Sort" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="name">Name</SelectItem>
        <SelectItem value="recent">Most Recent</SelectItem>
        <SelectItem value="oldest">Oldest</SelectItem>
        <SelectItem value="balance">Balance</SelectItem>
      </SelectContent>
    </Select>
  </div>

  {/* Groups Grid */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {filteredGroups.map(group => (
      <GroupCard key={group.id} group={group} />
    ))}
  </div>

  {/* Empty State */}
  {filteredGroups.length === 0 && (
    <EmptyGroupsState hasGroups={groups.length > 0} />
  )}
</div>
```

---

### 2. GroupCard Component

**New File:** `/src/modules/groups/components/group-card.tsx`

```tsx
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatNumber, formatDate } from '@/lib/locale-utils';
import { useGo } from '@refinedev/core';
import {
  Users2Icon,
  PlusIcon,
  EyeIcon,
  CalendarIcon,
  ArrowRightIcon,
} from '@/components/ui/icons';
import { cn } from '@/lib/utils';

interface GroupCardProps {
  group: {
    id: string;
    name: string;
    description?: string;
    created_at: string;
    member_count: number;
    members: any[];
    balance_summary: {
      you_owe: number;
      owed_to_you: number;
      net_balance: number;
    };
  };
}

export function GroupCard({ group }: GroupCardProps) {
  const go = useGo();
  const { you_owe, owed_to_you, net_balance } = group.balance_summary;
  const isSettled = you_owe === 0 && owed_to_you === 0;

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/50">
      <CardHeader className="pb-3">
        {/* Group Icon + Name */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <Users2Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg truncate">
                {group.name}
              </h3>
              {group.description && (
                <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                  {group.description}
                </p>
              )}
            </div>
          </div>

          {/* Status Badge */}
          {isSettled && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              ✓ Settled
            </Badge>
          )}
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
          <div className="flex items-center gap-1">
            <UsersIcon className="h-3 w-3" />
            <span>{group.member_count} {group.member_count === 1 ? 'member' : 'members'}</span>
          </div>
          <div className="flex items-center gap-1">
            <CalendarIcon className="h-3 w-3" />
            <span>{formatDate(group.created_at, { relative: true })}</span>
          </div>
        </div>

        {/* Member Avatars */}
        <div className="flex items-center gap-1 mt-3">
          {group.members.slice(0, 4).map((member, index) => (
            <Avatar key={member.id} className="h-8 w-8 border-2 border-background -ml-2 first:ml-0">
              <AvatarImage src={member.avatar_url} />
              <AvatarFallback className="text-xs">
                {member.name[0]}
              </AvatarFallback>
            </Avatar>
          ))}
          {group.member_count > 4 && (
            <div className="h-8 w-8 rounded-full bg-muted border-2 border-background -ml-2 flex items-center justify-center">
              <span className="text-xs font-medium">+{group.member_count - 4}</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Balance Summary */}
        {!isSettled && (
          <div className="p-3 rounded-lg bg-accent space-y-2">
            {you_owe > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-red-600 font-medium">YOU OWE</span>
                <span className="text-sm font-bold text-red-600">
                  {formatNumber(you_owe)} ₫
                </span>
              </div>
            )}
            {owed_to_you > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-green-600 font-medium">OWES YOU</span>
                <span className="text-sm font-bold text-green-600">
                  {formatNumber(owed_to_you)} ₫
                </span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onClick={() => go({ to: `/groups/show/${group.id}` })}
          >
            <EyeIcon className="h-4 w-4 mr-2" />
            View Details
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => go({ to: `/groups/${group.id}/expenses/create` })}
          >
            <PlusIcon className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### 3. Balance Summary Calculation

**Add RPC function to get group balance summaries**

```sql
-- supabase/migrations/YYYYMMDD_group_balance_summaries.sql
CREATE OR REPLACE FUNCTION get_group_balance_summary(
  p_group_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_you_owe DECIMAL(12,2);
  v_owed_to_you DECIMAL(12,2);
  v_net_balance DECIMAL(12,2);
BEGIN
  -- Calculate what user owes
  SELECT COALESCE(SUM(
    CASE
      WHEN es.user_id = p_user_id
        AND e.paid_by_user_id != p_user_id
      THEN es.computed_amount - COALESCE(es.settled_amount, 0)
      ELSE 0
    END
  ), 0)
  INTO v_you_owe
  FROM expenses e
  JOIN expense_splits es ON e.id = es.expense_id
  WHERE e.group_id = p_group_id
    AND NOT es.is_settled;

  -- Calculate what is owed to user
  SELECT COALESCE(SUM(
    CASE
      WHEN e.paid_by_user_id = p_user_id
        AND es.user_id != p_user_id
      THEN es.computed_amount - COALESCE(es.settled_amount, 0)
      ELSE 0
    END
  ), 0)
  INTO v_owed_to_you
  FROM expenses e
  JOIN expense_splits es ON e.id = es.expense_id
  WHERE e.group_id = p_group_id
    AND NOT es.is_settled;

  v_net_balance := v_owed_to_you - v_you_owe;

  RETURN jsonb_build_object(
    'you_owe', v_you_owe,
    'owed_to_you', v_owed_to_you,
    'net_balance', v_net_balance
  );
END;
$$;
```

**Frontend Hook:**
```tsx
// /src/hooks/use-group-balance-summaries.ts
import { useGetIdentity } from '@refinedev/core';
import { useQuery } from '@tanstack/react-query';
import { supabaseClient } from '@/utility/supabaseClient';

export function useGroupBalanceSummaries(groupIds: string[]) {
  const { data: identity } = useGetIdentity();

  return useQuery({
    queryKey: ['group_balance_summaries', groupIds, identity?.id],
    queryFn: async () => {
      if (!identity?.id) return {};

      const summaries: Record<string, any> = {};

      await Promise.all(
        groupIds.map(async (groupId) => {
          const { data } = await supabaseClient.rpc('get_group_balance_summary', {
            p_group_id: groupId,
            p_user_id: identity.id,
          });
          summaries[groupId] = data;
        })
      );

      return summaries;
    },
    enabled: !!identity?.id && groupIds.length > 0,
  });
}
```

---

### 4. Enhanced Empty State

```tsx
// /src/modules/groups/components/empty-groups-state.tsx
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusIcon } from '@/components/ui/icons';
import { useGo } from '@refinedev/core';

interface EmptyGroupsStateProps {
  hasGroups: boolean; // true if search returned no results
}

export function EmptyGroupsState({ hasGroups }: EmptyGroupsStateProps) {
  const go = useGo();

  if (hasGroups) {
    // Search/filter returned no results
    return (
      <Card className="border-2 border-dashed">
        <CardContent className="py-16 text-center">
          <div className="space-y-4">
            <div className="text-6xl">🔍</div>
            <div>
              <p className="font-semibold text-lg">No groups found</p>
              <p className="text-muted-foreground mt-1">
                Try adjusting your search or filter criteria
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No groups at all
  return (
    <Card className="border-2 border-dashed">
      <CardContent className="py-20 text-center">
        <div className="space-y-6 max-w-md mx-auto">
          <div className="text-7xl">👥</div>
          <div>
            <h3 className="font-bold text-2xl mb-2">Create Your First Group</h3>
            <p className="text-muted-foreground">
              Groups help you split expenses with friends, roommates, or travel companions.
              Start by creating a group and adding members.
            </p>
          </div>
          <div className="space-y-3">
            <Button
              size="lg"
              onClick={() => go({ to: '/groups/create' })}
              className="w-full sm:w-auto"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Your First Group
            </Button>
            <div className="text-xs text-muted-foreground">
              <p>💡 Pro tip: Add friends first to quickly create groups</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### 5. Search & Filter Logic

```tsx
const [searchQuery, setSearchQuery] = useState('');
const [filterType, setFilterType] = useState<'all' | 'active' | 'settled' | 'admin'>('all');
const [sortBy, setSortBy] = useState<'name' | 'recent' | 'oldest' | 'balance'>('recent');

const filteredGroups = useMemo(() => {
  let filtered = groups;

  // Search
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(g =>
      g.name.toLowerCase().includes(query) ||
      g.description?.toLowerCase().includes(query)
    );
  }

  // Filter
  if (filterType === 'active') {
    filtered = filtered.filter(g => {
      const summary = balanceSummaries[g.id];
      return summary && (summary.you_owe > 0 || summary.owed_to_you > 0);
    });
  } else if (filterType === 'settled') {
    filtered = filtered.filter(g => {
      const summary = balanceSummaries[g.id];
      return summary && summary.you_owe === 0 && summary.owed_to_you === 0;
    });
  } else if (filterType === 'admin') {
    filtered = filtered.filter(g =>
      g.members.some(m => m.user_id === identity?.id && m.role === 'admin')
    );
  }

  // Sort
  filtered.sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'recent':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'balance':
        const aBalance = Math.abs(balanceSummaries[a.id]?.net_balance || 0);
        const bBalance = Math.abs(balanceSummaries[b.id]?.net_balance || 0);
        return bBalance - aBalance;
      default:
        return 0;
    }
  });

  return filtered;
}, [groups, searchQuery, filterType, sortBy, balanceSummaries, identity]);
```

---

## File Changes

### Modified Files

1. **`/src/modules/groups/pages/list.tsx`**
   - Remove DataTable
   - Add card grid layout
   - Add search/filter/sort
   - Add balance summaries query

### New Files

1. **`/src/modules/groups/components/group-card.tsx`** - Reusable group card
2. **`/src/modules/groups/components/empty-groups-state.tsx`** - Enhanced empty state
3. **`/src/hooks/use-group-balance-summaries.ts`** - Balance summaries hook
4. **`supabase/migrations/YYYYMMDD_group_balance_summaries.sql`** - RPC function

---

## Success Criteria

- [ ] Card-based layout replaces table
- [ ] Balance preview shows on each card
- [ ] Search filters groups in real-time
- [ ] Filter by active/settled/admin works
- [ ] Sort by name/date/balance works
- [ ] Empty state engaging and actionable
- [ ] Quick actions (View, Add Expense) functional
- [ ] Mobile: Cards stack vertically, touch-friendly
- [ ] Performance: No lag with 50+ groups

---

## Testing Checklist

1. **Card Display:** All info visible, avatars displayed
2. **Balance Preview:** Numbers match detail page
3. **Search:** Type query, cards filter instantly
4. **Filter Active:** Only shows groups with debts
5. **Filter Settled:** Only shows balanced groups
6. **Filter Admin:** Only shows groups where user is admin
7. **Sort Name:** Alphabetical order
8. **Sort Recent/Oldest:** Date order correct
9. **Sort Balance:** Largest debts first
10. **Empty State:** Shows when no groups, provides CTA

---

## Dependencies

**From Phase 1:**
- Card components
- Badge components

**New:**
- useGroupBalanceSummaries hook
- RPC function for balance calculation

---

## Next Phase

Phase 7: Mobile Optimization (touch targets, gestures, performance)
