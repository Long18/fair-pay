# Debt Settlement Analysis and Restoration Scripts

## Overview

These scripts help analyze and restore debt states after the `settle_all_debts_with_person` function was deployed with incorrect logic that affected multiple users.

## Scripts

### 1. `analyze_settle_all_impact.sql`
**Purpose**: Comprehensive analysis of all users affected by the settle_all function in the last 2 hours.

**What it does**:
- Finds all `settle_all_with_person` operations
- Identifies all manual settlements in the same timeframe  
- Lists recently settled splits
- Shows current debt states for all users
- Checks audit trail for settle_all operations
- Provides summary of affected users
- Specifically checks the 3 users mentioned in the original issue

**Usage**:
```bash
# Execute in Supabase SQL Editor or via CLI
supabase db reset --linked
psql -h your-db-host -U postgres -d postgres -f scripts/analyze_settle_all_impact.sql
```

### 2. `restore_debt_states.sql`
**Purpose**: Revert incorrect settlements and restore proper debt states.

**What it does**:
- Creates backup of current settlement state
- Identifies splits that need to be reverted
- Provides template for reverting incorrect settlements
- Includes verification queries
- Logs restoration operation in audit trail

**IMPORTANT**: This script contains templates that must be customized based on analysis results. Do not run as-is.

**Usage**:
1. Run analysis script first
2. Customize the restoration script based on analysis results
3. Uncomment and modify the restoration queries
4. Execute the customized script

### 3. `verify_restoration.sql`
**Purpose**: Verify that debt states have been correctly restored.

**What it does**:
- Checks current debt states for specific users
- Compares expected vs actual debt amounts
- Verifies no remaining incorrect settlement events
- Checks for data inconsistencies
- Provides overall system health check

**Usage**:
```bash
# Run after restoration script
psql -h your-db-host -U postgres -d postgres -f scripts/verify_restoration.sql
```

## Expected Debt States

Based on the original issue, these users should have the following debt states:

- **Vũ Hoàng Mai**: 95,000đ debt
- **Phạm Phúc Thịnh**: 5,000đ debt  
- **Dương Lê Công Thuần**: 418,531đ debt (currently showing 48,000đ)

## Workflow

1. **Analysis Phase**:
   ```bash
   # Run comprehensive analysis
   psql -f scripts/analyze_settle_all_impact.sql
   ```

2. **Restoration Phase**:
   ```bash
   # Customize restoration script based on analysis
   # Edit scripts/restore_debt_states.sql
   # Uncomment and modify the restoration queries
   psql -f scripts/restore_debt_states.sql
   ```

3. **Verification Phase**:
   ```bash
   # Verify restoration was successful
   psql -f scripts/verify_restoration.sql
   ```

## Safety Notes

- Always run analysis first to understand the scope of impact
- Create database backup before running restoration script
- Test restoration script on a copy of production data first
- The restoration script is intentionally templated to prevent accidental execution
- All operations are logged in the audit_trail table

## Database Function Fix

The original issue was caused by a syntax error in the `settle_all_debts_with_person` function. The function used incorrect delimiters:

```sql
-- Incorrect (missing $$)
AS $
-- Should be
AS $$

-- Incorrect (missing $$)  
$;
-- Should be
$$;
```

This has been fixed in the migration file: `supabase/migrations/20260112070000_create_settle_all_debts_with_person_function.sql`

## Contact

If you need assistance with these scripts or encounter issues during restoration, please refer to the database functions reference in the project memories or consult the development team.