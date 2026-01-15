# Group-Related Files - Detailed List

## Quick Reference

### Core Group Module (src/modules/groups/)
1. `/src/modules/groups/pages/list.tsx` - Group list page
2. `/src/modules/groups/pages/show.tsx` - Group detail/show page
3. `/src/modules/groups/pages/create.tsx` - Group creation page
4. `/src/modules/groups/pages/edit.tsx` - Group edit page
5. `/src/modules/groups/components/group-form.tsx` - Reusable group form
6. `/src/modules/groups/components/member-list.tsx` - Members list component
7. `/src/modules/groups/components/add-member-modal.tsx` - Add member dialog
8. `/src/modules/groups/components/group-table-columns.tsx` - Table column definitions
9. `/src/modules/groups/types.ts` - TypeScript type definitions
10. `/src/modules/groups/index.ts` - Module exports

### Dashboard Components (src/components/dashboard/)
11. `/src/components/dashboard/groups-table.tsx` - Groups table for dashboard
12. `/src/components/dashboard/group-balance-card.tsx` - Group balance card component
13. `/src/components/dashboard/activity-time-period-group.tsx` - Activity time grouping utility

### Profile Components (src/modules/profile/components/)
14. `/src/modules/profile/components/profile-groups-list.tsx` - Groups list in profile view

---

## File Details

### 1. /src/modules/groups/pages/list.tsx
**Purpose**: Group list page - displays all groups user belongs to
**Key Components**: 
- DataTable (with pagination, sorting)
- EmptyState (when no groups)
- Create Group button
**Exports**: GroupList (page component)
**Dependencies**: useGo, useTable, useGroupColumns, Group type

---

### 2. /src/modules/groups/pages/show.tsx
**Purpose**: Group detail/show page - displays group info and sub-views
**Key Features**:
- Group header with info (name, description, dates)
- Tabbed interface: Expenses, Balances, Recurring, Members
- Member management (add, remove, pagination)
- Balance calculation with debt simplification toggle
- Settle all debts functionality
- Delete group (for creator)
- Edit group (for admin)
**Exports**: GroupShow (page component)
**Dependencies**: useOne, useList, useDelete, ExpenseList, RecurringExpenseList, PaymentList, SimplifiedBalanceView, SimplifiedDebtsToggle, MemberList, AddMemberModal, SettleAllDialog

---

### 3. /src/modules/groups/pages/create.tsx
**Purpose**: Group creation page
**Key Features**:
- GroupForm wrapper
- Fetch available friends from friendships
- Create group mutation
- Add group members (bulk insert via Supabase)
- Navigation to group detail on success
**Exports**: GroupCreate (page component)
**Dependencies**: useCreate, useList, useGetIdentity, GroupForm, Friendship type, Profile type

---

### 4. /src/modules/groups/pages/edit.tsx
**Purpose**: Group edit page - update group info
**Key Features**:
- GroupForm wrapper with prefilled values
- Update mutation
- Back button
- Loading state
**Exports**: GroupEdit (page component)
**Dependencies**: useOne, useUpdate, useGo, GroupForm, Group type

---

### 5. /src/modules/groups/components/group-form.tsx
**Purpose**: Reusable form component for group creation and editing
**Form Sections**:
1. Basic Information
   - Group Name (required, max 100 chars)
   - Description (optional, max 500 chars)
2. Group Settings
   - Simplify Debts toggle (with tooltip)
3. Group Members
   - MemberCombobox for member selection
   - Selected members display with remove buttons
   - Badge showing member count
**Exports**: GroupForm
**Validation**: Zod schema (groupSchema)
**Dependencies**: zodResolver, useForm, MemberCombobox, various UI components

---

### 6. /src/modules/groups/components/member-list.tsx
**Purpose**: Display and manage group members
**Features**:
- Member avatar and info
- Role badge (admin/member)
- Remove member button (for admin)
- Pagination controls
- Empty state
**Exports**: MemberList
**Props**: members, currentUserId, isAdmin, callbacks (onRemoveMember, onAddMember), pagination metadata
**Dependencies**: Avatar, Badge, Button, PaginationControls

---

### 7. /src/modules/groups/components/add-member-modal.tsx
**Purpose**: Dialog for adding members to group
**Features**:
- MemberCombobox with search
- Filter out existing members
- Only show accepted friendships
- Form validation
- Success/error toasts
**Exports**: AddMemberModal
**Props**: groupId, onSuccess callback, controlled open state
**Dependencies**: useCreate, useList, MemberCombobox, Dialog, Form components

---

### 8. /src/modules/groups/components/group-table-columns.tsx
**Purpose**: Define table columns for group list table
**Columns**:
1. Name - displays group name
2. Description - truncated group description
3. Created - formatted creation date
4. Actions - view and edit buttons
**Exports**: useGroupColumns hook
**Dependencies**: useTranslation, useGo, formatDate utility

---

### 9. /src/modules/groups/types.ts
**Purpose**: TypeScript type definitions for group module
**Exports**:
```typescript
export interface Group {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  simplify_debts: boolean;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
}

export interface GroupWithMembers extends Group {
  members?: GroupMember[];
  member_count?: number;
}

export interface GroupFormValues {
  name: string;
  description?: string;
  simplify_debts?: boolean;
  member_ids?: string[];
}

export interface AddMemberFormValues {
  user_id: string;
  role: 'admin' | 'member';
}
```

---

### 10. /src/modules/groups/index.ts
**Purpose**: Module barrel exports
**Exports**:
- GroupList (page)
- GroupCreate (page)
- GroupEdit (page)
- GroupShow (page)
- GroupForm (component)
- MemberList (component)
- Group, GroupMember, GroupWithMembers, GroupFormValues types

---

### 11. /src/components/dashboard/groups-table.tsx
**Purpose**: Groups table for dashboard
**Features**:
- Summary table of user's groups
- Balance display (color-coded: green positive, red negative)
- Member count
- Last activity timestamp
- View button to navigate to group
- Loading skeleton
- Empty state
**Exports**: GroupsTable
**Props**: groups array, isLoading flag

---

### 12. /src/components/dashboard/group-balance-card.tsx
**Purpose**: Group balance card for dashboard
**Features**:
- Group name and member count
- Balance status (you owe / you are owed / settled)
- Color-coded status
- Top debtors list (up to 3)
- Total group debt display
- Clickable card to navigate to group
**Exports**: GroupBalanceCard
**Props**: group (GroupBalance type), currency
**Dependencies**: DataCard, Avatar, Badge, useGo, formatCurrency

---

### 13. /src/components/dashboard/activity-time-period-group.tsx
**Purpose**: Activity time period grouping utility
**Use**: Grouping activities by time periods in dashboard
**Exports**: ActivityTimePeriodGroup component

---

### 14. /src/modules/profile/components/profile-groups-list.tsx
**Purpose**: Groups list display in user profile
**Features**:
- Animated list with Framer Motion
- Loading skeleton
- Empty state (EmptyGroups)
- Click to navigate to group
- Create new group button
- Group avatars with fallback
**Exports**: ProfileGroupsList
**Props**: groups array, isLoading flag, className
**Dependencies**: motion (Framer Motion), Avatar, Card, Skeleton, useGo

---

## Integration Points

### With Other Modules
- **Expenses Module**: GroupShow imports ExpenseList, RecurringExpenseList
- **Payments Module**: GroupShow imports PaymentList, SimplifiedBalanceView, useBalanceCalculation
- **Friends Module**: GroupCreate, AddMemberModal fetch from friendships
- **Profile Module**: ProfileGroupsList, group-balance-card in dashboard
- **Bulk Operations**: GroupShow uses SettleAllDialog, useSettleAllGroupDebts

### With UI Components
- **Card**: Common layout wrapper
- **Tabs**: In GroupShow for navigation
- **Table**: In GroupList and GroupsTable
- **Dialog**: In AddMemberModal
- **Form**: In GroupForm
- **Avatar**: For member displays
- **Badge**: For member roles and status
- **Button**: Throughout
- **Icons**: From @/components/ui/icons

### With Hooks
- **Refine**: useGo, useTable, useOne, useList, useCreate, useUpdate, useDelete, useGetIdentity
- **React**: useState, useEffect, useMemo, useParams
- **Custom**: useGroupColumns, useSimplifiedDebts, useSettleAllGroupDebts, useBalanceCalculation

---

## Route Configuration

Assuming standard Refine routing:
```
/groups              -> GroupList
/groups/create       -> GroupCreate
/groups/show/:id     -> GroupShow
/groups/edit/:id     -> GroupEdit
/groups/:id/expenses/create -> Expense creation for group
```

---

## Database Tables Referenced

1. **groups** - Core group data
2. **group_members** - Group membership and roles
3. **expenses** - Group expenses
4. **expense_splits** - Split amounts
5. **payments** - Settlement payments
6. **profiles** - User profiles (joined via members)
7. **friendships** - For member selection

---

## Styling & Design

- **UI Framework**: shadcn/ui (Radix UI + Tailwind CSS)
- **Responsive**: Mobile-first with sm: breakpoints
- **Colors**: Primary, destructive, secondary variants
- **Animations**: Framer Motion in ProfileGroupsList
- **Icons**: Feather-style from @/components/ui/icons

