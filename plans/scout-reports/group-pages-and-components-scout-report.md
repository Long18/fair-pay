# Scout Report: Group List & Detail Pages Components

**Generated**: 2026-01-15
**Task**: Find all files related to group list and group detail pages, components, and UI elements
**Status**: Complete

---

## Summary

Found **15 core group-related files** across the codebase:
- 4 group pages (list, show, create, edit)
- 4 group components (form, member-list, add-member-modal, table-columns)
- 3 dashboard components (groups-table, group-balance-card, profile-groups-list)
- 1 types file
- 1 index/exports file

---

## Core Group Module Files

### Group Pages (src/modules/groups/pages/)

| File | Purpose | Key Features |
|------|---------|--------------|
| `/src/modules/groups/pages/list.tsx` | Group list view | DataTable with columns, empty state, create button |
| `/src/modules/groups/pages/show.tsx` | Group detail view | Tabbed interface (expenses, balances, recurring, members), debt simplification, settle all |
| `/src/modules/groups/pages/create.tsx` | Group creation | Form wrapper, member selection, Supabase insert |
| `/src/modules/groups/pages/edit.tsx` | Group editing | Form wrapper, update mutation, navigation |

### Group Components (src/modules/groups/components/)

| File | Purpose | Key Features |
|------|---------|--------------|
| `/src/modules/groups/components/group-form.tsx` | Form component | Name, description, simplify_debts toggle, member selection, validation |
| `/src/modules/groups/components/member-list.tsx` | Members display | Avatar, role badge, remove button, pagination controls |
| `/src/modules/groups/components/add-member-modal.tsx` | Add member dialog | Friend combobox, validation, mutation |
| `/src/modules/groups/components/group-table-columns.tsx` | Table columns definition | Name, description, created date, action buttons |

### Group Types (src/modules/groups/)

| File | Purpose | Exports |
|------|---------|---------|
| `/src/modules/groups/types.ts` | TypeScript types | Group, GroupMember, GroupWithMembers, GroupFormValues, AddMemberFormValues |
| `/src/modules/groups/index.ts` | Module exports | All pages, form, member-list, and types |

---

## Dashboard & Profile Components

### Dashboard Components (src/components/dashboard/)

| File | Purpose | Key Features |
|------|---------|--------------|
| `/src/components/dashboard/groups-table.tsx` | Dashboard groups table | Group name, members, balance, activity, view button |
| `/src/components/dashboard/group-balance-card.tsx` | Group balance card | Balance status, color coding, top debtors list |
| `/src/components/dashboard/activity-time-period-group.tsx` | Activity grouping helper | Time-based grouping for activities |

### Profile Components (src/modules/profile/components/)

| File | Purpose | Key Features |
|------|---------|--------------|
| `/src/modules/profile/components/profile-groups-list.tsx` | Profile groups list | Animated list, empty state, create button |

---

## Component Architecture Overview

```
Group Pages
├── GroupList (list.tsx)
│   └── DataTable + useGroupColumns
├── GroupShow (show.tsx)
│   ├── Tabs (Expenses, Balances, Recurring, Members)
│   ├── MemberList (with pagination)
│   ├── AddMemberModal
│   ├── SimplifiedDebtsToggle
│   ├── SimplifiedBalanceView
│   └── PaymentList
├── GroupCreate (create.tsx)
│   └── GroupForm
└── GroupEdit (edit.tsx)
    └── GroupForm

Supporting Components
├── GroupForm (group-form.tsx)
│   ├── Basic Info Section
│   ├── Group Settings Section
│   └── Members Section
├── MemberList (member-list.tsx)
│   └── PaginationControls
├── AddMemberModal (add-member-modal.tsx)
│   └── MemberCombobox
└── useGroupColumns (group-table-columns.tsx)
    └── Column definitions

Dashboard Components
├── GroupsTable (groups-table.tsx)
│   └── Table format display
└── GroupBalanceCard (group-balance-card.tsx)
    └── DataCard with balance info

Profile Components
└── ProfileGroupsList (profile-groups-list.tsx)
    └── Animated list view
```

---

## File Dependencies & Relationships

### Imports from Group Module
- **GroupList** imports: DataTable, EmptyState, Button, useGroupColumns, Group
- **GroupShow** imports: MemberList, AddMemberModal, ExpenseList, RecurringExpenseList, PaymentList, SimplifiedBalanceView, SimplifiedDebtsToggle, SettleAllDialog
- **GroupCreate** imports: GroupForm, useList (friendships), useCreate
- **GroupEdit** imports: GroupForm, useOne, useUpdate
- **GroupForm** imports: MemberCombobox, various UI components
- **MemberList** imports: Avatar, Badge, PaginationControls
- **AddMemberModal** imports: useCreate, useList (friendships, group_members), MemberCombobox

### External Dependencies
- **Refine**: useTable, useOne, useList, useCreate, useUpdate, useDelete, useGo, useGetIdentity
- **UI Components**: Card, Tabs, Button, Dialog, Form, Input, Textarea, Switch, Badge, Avatar
- **Icons**: PlusIcon, UsersIcon, EyeIcon, PencilIcon, Trash2Icon, etc.
- **Utilities**: formatDate, formatNumber, toast, cn

---

## Key Routes

- `/groups` → GroupList
- `/groups/create` → GroupCreate
- `/groups/show/:id` → GroupShow
- `/groups/edit/:id` → GroupEdit

---

## Database Resources

- **groups** - Main group table
- **group_members** - Group membership table
- **expenses** - Related expenses
- **payments** - Related payments (for settlement)
- **friendships** - For member selection

---

## Key Features Identified

1. **Group Management**: Create, read, update, delete groups
2. **Member Management**: Add/remove members, assign roles (admin/member), pagination
3. **Expense Tracking**: View group expenses through ExpenseList component
4. **Balance Calculation**: Real-time balance updates with SimplifiedBalanceView
5. **Debt Simplification**: Min-Cost Max-Flow algorithm for optimized settlement
6. **Settlement**: Settle All button for bulk debt settlement
7. **Recurring Expenses**: Support for recurring group expenses
8. **Search & Filtering**: Member search in add-member modal
9. **Pagination**: Member list pagination with controls
10. **Responsive Design**: Mobile-friendly layouts throughout

---

## Unresolved Questions

None - all relevant files identified and documented.

