# Phase 4: Member Management Simplification

**Status:** Pending
**Priority:** Medium
**Estimated Time:** 8-10 hours
**Dependencies:** Phase 2 (Group Detail Redesign)

---

## Overview

Simplify member management operations: viewing, adding, removing members with clearer UI and inline interactions.

---

## Current Issues

**Problems:**
- Member list paginated (10/page) - hard to see full picture
- Add member requires separate modal
- Role indicators unclear (admin vs member)
- Remove button hidden, requires confirmation dialog
- No search/filter for large groups

---

## Solution Components

### 1. Remove Pagination (Show All Members)

**Current:** 10 members per page with pagination controls
**New:** Show all members, use virtual scrolling if > 50

```tsx
// Remove pagination logic from show.tsx
// OLD (lines 56-57, 144-156):
const [currentMemberPage, setCurrentMemberPage] = useState(1);
const memberPageSize = 10;
// ... pagination metadata ...

// NEW: Just show all
const members = allMembers; // No slicing
```

**Virtual Scrolling (if needed):**
```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

// Only if allMembers.length > 50
const parentRef = useRef<HTMLDivElement>(null);

const rowVirtualizer = useVirtualizer({
  count: allMembers.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 80, // Estimated row height
  overscan: 5,
});
```

---

### 2. Inline Add Member (No Modal)

**Current:** AddMemberModal dialog with complex state
**New:** Inline form at bottom of member list

```tsx
{/* Inline Add Member Form */}
{isAdmin && (
  <Card className="border-2 border-dashed">
    <CardContent className="pt-6">
      <form onSubmit={handleAddMember} className="space-y-4">
        <div className="flex items-center gap-2">
          <PlusIcon className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Add Member</h3>
        </div>

        {/* Friend Selector */}
        <MemberCombobox
          value={selectedFriendId}
          onValueChange={setSelectedFriendId}
          placeholder="Search friends..."
          friends={availableFriends}
        />

        {/* Role Selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Role:</label>
          <div className="flex gap-2">
            <Badge
              variant={selectedRole === 'member' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedRole('member')}
            >
              Member
            </Badge>
            <Badge
              variant={selectedRole === 'admin' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedRole('admin')}
            >
              Admin
            </Badge>
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={!selectedFriendId || isAdding}
            className="flex-1"
          >
            {isAdding ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Adding...
              </>
            ) : (
              <>
                <PlusIcon className="h-4 w-4 mr-2" />
                Add to Group
              </>
            )}
          </Button>
          {selectedFriendId && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSelectedFriendId('');
                setSelectedRole('member');
              }}
            >
              Cancel
            </Button>
          )}
        </div>
      </form>
    </CardContent>
  </Card>
)}
```

**Keep Modal as Option:** For mobile, can use bottom sheet instead of inline form

---

### 3. Clear Role Indicators

**Current:** Small badge with role text
**New:** Visual distinction + clearer labels

```tsx
{/* Member Card with Clear Role */}
<div className="flex items-center justify-between p-4 border-2 rounded-lg hover:bg-accent/50 transition-colors">
  <div className="flex items-center gap-3 flex-1">
    {/* Avatar with Role Ring */}
    <div className="relative">
      <Avatar className={cn(
        "h-12 w-12",
        member.role === 'admin' && "ring-2 ring-primary ring-offset-2"
      )}>
        <AvatarImage src={member.profile.avatar_url} />
        <AvatarFallback>{getInitials(member.profile.full_name)}</AvatarFallback>
      </Avatar>
      {member.role === 'admin' && (
        <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-primary text-primary-foreground">
          <StarIcon className="h-3 w-3" />
        </div>
      )}
    </div>

    {/* Name + Role */}
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <p className="font-semibold truncate">{member.profile.full_name}</p>
        {member.user_id === identity?.id && (
          <Badge variant="secondary" className="text-xs">You</Badge>
        )}
      </div>
      <div className="flex items-center gap-2 mt-1">
        <Badge
          variant={member.role === 'admin' ? 'default' : 'outline'}
          className="text-xs"
        >
          {member.role === 'admin' ? '👑 Admin' : 'Member'}
        </Badge>
        {member.user_id === group.created_by && (
          <Badge variant="outline" className="text-xs">
            Creator
          </Badge>
        )}
      </div>
    </div>
  </div>

  {/* Actions */}
  {isAdmin && member.user_id !== identity?.id && (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreVerticalIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {/* Toggle Admin Role */}
        <DropdownMenuItem onClick={() => handleToggleRole(member.id, member.role)}>
          {member.role === 'admin' ? (
            <>
              <UserIcon className="h-4 w-4 mr-2" />
              Make Member
            </>
          ) : (
            <>
              <StarIcon className="h-4 w-4 mr-2" />
              Make Admin
            </>
          )}
        </DropdownMenuItem>

        {/* Remove Member */}
        <DropdownMenuItem
          onClick={() => handleRemoveMember(member.id)}
          className="text-destructive"
        >
          <Trash2Icon className="h-4 w-4 mr-2" />
          Remove from Group
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )}
</div>
```

---

### 4. Member Search & Filter

**Add search bar above member list for groups with 10+ members**

```tsx
{allMembers.length >= 10 && (
  <div className="mb-4">
    <div className="relative">
      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Search members..."
        value={memberSearch}
        onChange={(e) => setMemberSearch(e.target.value)}
        className="pl-9"
      />
    </div>
  </div>
)}

{/* Filter members based on search */}
const filteredMembers = useMemo(() => {
  if (!memberSearch) return allMembers;

  const query = memberSearch.toLowerCase();
  return allMembers.filter(m =>
    m.profiles?.full_name?.toLowerCase().includes(query) ||
    m.profiles?.email?.toLowerCase().includes(query)
  );
}, [allMembers, memberSearch]);
```

---

### 5. Member Role Toggle (Admin Only)

**Allow admins to promote/demote members without removing them**

```tsx
const handleToggleRole = async (memberId: string, currentRole: string) => {
  const newRole = currentRole === 'admin' ? 'member' : 'admin';

  try {
    await supabaseClient
      .from('group_members')
      .update({ role: newRole })
      .eq('id', memberId);

    toast.success(`Member ${newRole === 'admin' ? 'promoted to' : 'demoted to'} ${newRole}`);
    membersQuery.refetch();
  } catch (error) {
    toast.error(`Failed to update role: ${error.message}`);
  }
};
```

---

### 6. Member Stats Display

**Show member contribution stats**

```tsx
{/* Member Stats */}
<div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
  <div className="flex items-center gap-1">
    <ReceiptIcon className="h-3 w-3" />
    <span>{member.expense_count || 0} expenses</span>
  </div>
  <div className="flex items-center gap-1">
    <BanknoteIcon className="h-3 w-3" />
    <span>
      {formatNumber(member.total_paid || 0)} ₫ paid
    </span>
  </div>
  <div className="flex items-center gap-1">
    <CalendarIcon className="h-3 w-3" />
    <span>
      Joined {formatDate(member.created_at, { relative: true })}
    </span>
  </div>
</div>
```

**Calculate Stats:**
```tsx
const memberStats = useMemo(() => {
  return allMembers.map(member => {
    const memberExpenses = expenses.filter(e => {
      const splits = e.expense_splits || [];
      return splits.some((s: any) => s.user_id === member.user_id);
    });

    const totalPaid = expenses
      .filter(e => e.paid_by_user_id === member.user_id)
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      ...member,
      expense_count: memberExpenses.length,
      total_paid: totalPaid,
    };
  });
}, [allMembers, expenses]);
```

---

### 7. Bulk Operations (Advanced)

**For admins: Remove multiple members at once**

```tsx
{isAdmin && allMembers.length > 3 && (
  <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-muted">
    <div className="flex items-center gap-2">
      <Checkbox
        checked={selectedMembers.length === allMembers.length}
        onCheckedChange={handleSelectAll}
      />
      <span className="text-sm font-medium">
        {selectedMembers.length > 0
          ? `${selectedMembers.length} selected`
          : 'Select members'
        }
      </span>
    </div>

    {selectedMembers.length > 0 && (
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedMembers([])}
        >
          Clear
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleBulkRemove}
        >
          <Trash2Icon className="h-4 w-4 mr-2" />
          Remove Selected
        </Button>
      </div>
    )}
  </div>
)}
```

---

## File Changes

### Modified Files

1. **`/src/modules/groups/pages/show.tsx`**
   - Remove pagination state
   - Add member search state
   - Add inline add member form
   - Remove AddMemberModal usage

2. **`/src/modules/groups/components/member-list.tsx`**
   - Remove pagination prop requirement
   - Add search highlighting
   - Add role toggle actions
   - Add member stats display
   - Add virtual scrolling support

3. **`/src/modules/groups/components/add-member-modal.tsx`**
   - Convert to inline form component
   - Keep modal version for mobile (bottom sheet)

### New Files

1. **`/src/modules/groups/components/member-card.tsx`**
   - Reusable member card with stats
   - Role indicators
   - Action menu

---

## Success Criteria

- [ ] All members visible (no pagination)
- [ ] Virtual scrolling works for 50+ members
- [ ] Inline add member form functional
- [ ] Member search filters real-time
- [ ] Role toggle works (admin/member)
- [ ] Member stats display correctly
- [ ] Remove member requires single confirmation
- [ ] Mobile: Bottom sheet for add member
- [ ] Performance: No lag with 100+ members

---

## Testing Checklist

1. **Small Group (< 10 members):** Inline form, no search
2. **Medium Group (10-50 members):** Search visible, all members shown
3. **Large Group (50+ members):** Virtual scrolling, search essential
4. **Role Toggle:** Promote/demote members, verify permissions
5. **Add Member:** Inline form works, validation correct
6. **Remove Member:** Single confirmation, success toast
7. **Member Stats:** Expense count, total paid accurate
8. **Mobile:** Bottom sheet works, touch targets adequate

---

## Dependencies

**From Phase 2:**
- Group detail page structure
- Members section placement

**New:**
- @tanstack/react-virtual (for large lists)
- Member combobox component
- Role toggle mutation

---

## Next Phase

Phase 5: Settlement Flow Enhancement (streamline debt settlement)
