# Group List & Detail Pages - Scout Report Summary

## Search Completed Successfully

Found **14 group-related files** across the FairPay codebase that handle group list, detail, and management functionality.

---

## Files Found

### Group Pages (4 files)
1. **list.tsx** - Group list page with DataTable
2. **show.tsx** - Group detail page with tabs (expenses, balances, members, recurring)
3. **create.tsx** - Group creation with member selection
4. **edit.tsx** - Group editing page

### Group Components (4 files)
5. **group-form.tsx** - Reusable form for create/edit with 3 sections (info, settings, members)
6. **member-list.tsx** - Member display with pagination and remove functionality
7. **add-member-modal.tsx** - Dialog for adding members with friend search
8. **group-table-columns.tsx** - Table column definitions for group list

### Group Module Files (2 files)
9. **types.ts** - TypeScript interfaces (Group, GroupMember, GroupFormValues, etc.)
10. **index.ts** - Module barrel exports

### Dashboard Components (3 files)
11. **groups-table.tsx** - Dashboard summary table of groups
12. **group-balance-card.tsx** - Dashboard balance card with top debtors
13. **activity-time-period-group.tsx** - Activity grouping utility

### Profile Components (1 file)
14. **profile-groups-list.tsx** - Animated groups list in profile view

---

## Key Features Identified

**Group Management**
- Create, read, update, delete groups
- Edit group name, description, settings
- Delete group (creator only)

**Member Management**
- Add members from friends list
- Remove members (admin only)
- Assign roles (admin/member)
- Paginated member list (10 per page)
- Search members by name

**Expense Tracking**
- View group expenses in tabbed interface
- View recurring expenses
- Track expense splits
- Attachment support

**Balance & Settlement**
- Real-time balance calculation
- Simplified debt optimization (Min-Cost Max-Flow)
- Color-coded balance status
- Settle All button for bulk settlement
- Payment history view

**Responsive Design**
- Mobile-first approach with Tailwind CSS
- Responsive breakpoints (sm, lg)
- Adaptive layouts for different screen sizes

---

## Component Hierarchy

```
GroupList (page)
├── DataTable
│   └── useGroupColumns
│       ├── Name column
│       ├── Description column
│       ├── Created date column
│       └── Actions column (View, Edit)

GroupShow (page)
├── Header Card
├── Tabs
│   ├── Expenses Tab → ExpenseList
│   ├── Balances Tab → SimplifiedBalanceView + PaymentList
│   ├── Recurring Tab → RecurringExpenseList
│   └── Members Tab
│       ├── AddMemberModal
│       └── MemberList

GroupCreate (page)
└── GroupForm
    ├── Basic Info Section
    ├── Settings Section
    └── Members Section

GroupEdit (page)
└── GroupForm

Dashboard Components
├── GroupsTable
└── GroupBalanceCard

Profile Components
└── ProfileGroupsList
```

---

## Data Flow

**Fetching Groups:**
- useTable: Fetches groups resource
- useOne: Fetches single group details
- useList: Fetches group members, expenses, payments

**Mutations:**
- useCreate: Create group + members
- useUpdate: Update group
- useDelete: Delete group + members

**Related Data:**
- ExpenseList: Fetches group expenses
- PaymentList: Fetches group payments
- useBalanceCalculation: Calculates balances from expenses/payments
- useSimplifiedDebts: Server-side debt simplification

---

## Dependencies Summary

**UI Library**: shadcn/ui (Card, Button, Dialog, Tabs, Table, Form, Avatar, Badge)

**Framework**: Refine v5 (useGo, useTable, useOne, useList, useCreate, useUpdate, useDelete, useGetIdentity)

**Form Handling**: react-hook-form + zod validation

**Icons**: Feather-style icons from @/components/ui/icons

**Animations**: Framer Motion (in profile groups list)

**Localization**: react-i18next

**Notifications**: sonner (toast)

---

## Routes Mapped

```
/groups                    → GroupList
/groups/create             → GroupCreate
/groups/show/:id           → GroupShow
/groups/edit/:id           → GroupEdit
/groups/:id/expenses/create → Create expense for group
```

---

## Database Resources Used

- **groups** table - Core group data
- **group_members** table - Membership with roles
- **expenses** table - Group expenses
- **expense_splits** table - Split amounts
- **payments** table - Settlement payments
- **profiles** table - User profile data (joined via members)
- **friendships** table - For member selection in creation

---

## Quick File Reference

All absolute paths ready to use:

```
Core Module:
/Users/long.lnt/Desktop/Projects/FairPay/src/modules/groups/pages/list.tsx
/Users/long.lnt/Desktop/Projects/FairPay/src/modules/groups/pages/show.tsx
/Users/long.lnt/Desktop/Projects/FairPay/src/modules/groups/pages/create.tsx
/Users/long.lnt/Desktop/Projects/FairPay/src/modules/groups/pages/edit.tsx
/Users/long.lnt/Desktop/Projects/FairPay/src/modules/groups/components/group-form.tsx
/Users/long.lnt/Desktop/Projects/FairPay/src/modules/groups/components/member-list.tsx
/Users/long.lnt/Desktop/Projects/FairPay/src/modules/groups/components/add-member-modal.tsx
/Users/long.lnt/Desktop/Projects/FairPay/src/modules/groups/components/group-table-columns.tsx
/Users/long.lnt/Desktop/Projects/FairPay/src/modules/groups/types.ts
/Users/long.lnt/Desktop/Projects/FairPay/src/modules/groups/index.ts

Dashboard:
/Users/long.lnt/Desktop/Projects/FairPay/src/components/dashboard/groups-table.tsx
/Users/long.lnt/Desktop/Projects/FairPay/src/components/dashboard/group-balance-card.tsx
/Users/long.lnt/Desktop/Projects/FairPay/src/components/dashboard/activity-time-period-group.tsx

Profile:
/Users/long.lnt/Desktop/Projects/FairPay/src/modules/profile/components/profile-groups-list.tsx
```

---

## Key Takeaways

1. **Complete Group Module** - Fully functional group management system
2. **Well Structured** - Clear separation of pages, components, and types
3. **Responsive** - Mobile-friendly design throughout
4. **Feature Rich** - Advanced features like debt simplification and bulk settlement
5. **Integrated** - Seamless integration with expenses, payments, and friends modules
6. **Type Safe** - Full TypeScript support with Zod validation

---

**Report Generated**: 2026-01-15
**Total Files**: 14
**Status**: Complete - All files identified and documented
