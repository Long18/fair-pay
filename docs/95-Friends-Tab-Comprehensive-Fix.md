# Friends Tab Comprehensive Fix

**Created:** 2026-01-10
**Status:** Implemented
**Approach:** Root cause analysis and comprehensive solution (not patchwork)

## Overview

This document details the comprehensive fix for errors encountered when clicking on the Friends tab, addressing root causes rather than applying patches.

## Root Cause Analysis

### 1. SQL Ambiguous Column Reference Error

**Error:**
```
column reference "snapshot_date" is ambiguous
```

**Root Cause:**
PostgreSQL functions with `RETURNS TABLE` can cause ambiguity when:
- Return table column names match query column names
- No explicit `search_path` is set
- Column references in RETURN QUERY aren't explicitly aliased

**Solution:**
- Added explicit `SET search_path = public, pg_temp` to all functions
- Used explicit column aliases in RETURN QUERY matching RETURN TABLE columns
- Added table aliases in subqueries to avoid ambiguity

### 2. SQL Type Mismatch Error

**Error:**
```
Returned type expense_category does not match expected type text in column 1
```

**Root Cause:**
The `expenses.category` column is an ENUM type (`expense_category`), but the function signature declares it as `TEXT`. PostgreSQL requires explicit casting when returning ENUM types as TEXT.

**Solution:**
- Added explicit `::TEXT` cast: `e.category::TEXT AS category`
- Applied pattern to all functions returning ENUM types as TEXT

### 3. Dynamic Import Module Loading Failure

**Error:**
```
TypeError: error loading dynamically imported module: https://long-pay.vercel.app/assets/index-B87QPFex.js
Loading module from "..." was blocked because of a disallowed MIME type ("text/html")
```

**Root Cause:**
Vercel rewrite rule `"/(.*)" -> "/index.html"` was too broad and intercepted asset requests, causing chunk files to be served as HTML instead of JavaScript.

**Solution:**
- Updated Vercel rewrite rule to exclude assets and static files
- Pattern: `/((?!assets|_vercel|.*\\.(js|css|png|...)).*)` - excludes assets from SPA routing

## Implementation

### Migration: `20260110000000_fix_sql_function_errors.sql`

**Fixed Functions:**

1. **get_balance_history**
   - Added `SET search_path = public, pg_temp`
   - Added explicit column aliases in RETURN QUERY
   - Added table alias in EXISTS subquery

2. **get_top_categories**
   - Added `SET search_path = public, pg_temp`
   - Added explicit `::TEXT` cast for `e.category`
   - Maintained all existing logic

**Pattern Applied:**
- All RETURN TABLE functions now use explicit search_path
- All column references are explicitly aliased
- ENUM types are explicitly cast when returning as TEXT

### Vercel Configuration: `vercel.json`

**Changes:**
- Updated rewrite rule to exclude assets from SPA routing
- Assets are now served directly without going through `/index.html`

**Pattern:**
```json
{
  "rewrites": [
    {
      "source": "/((?!assets|_vercel|.*\\.(js|css|...)).*)",
      "destination": "/index.html"
    }
  ]
}
```

## Best Practices Established

### SQL Functions

1. **Always set explicit search_path:**
   ```sql
   SECURITY DEFINER
   SET search_path = public, pg_temp
   ```

2. **Use explicit column aliases:**
   ```sql
   RETURN QUERY
   SELECT
     bh.snapshot_date AS snapshot_date,
     ...
   ```

3. **Cast ENUM types explicitly:**
   ```sql
   SELECT
     e.category::TEXT AS category,
     ...
   ```

4. **Use table aliases in subqueries:**
   ```sql
   IF NOT EXISTS (
     SELECT 1 FROM balance_history bh_check
     WHERE bh_check.user_id = v_user_id
   )
   ```

### Vercel Configuration

1. **Exclude assets from SPA routing:**
   - Use negative lookahead pattern to exclude asset paths
   - Ensure static files are served directly

2. **Maintain cache headers:**
   - Assets should have long cache times (immutable)
   - HTML should not be cached

## Testing Checklist

- [x] SQL functions execute without ambiguous column errors
- [x] SQL functions return correct types (ENUM cast to TEXT)
- [x] Dynamic imports load correctly in development
- [x] Dynamic imports load correctly in production (Vercel)
- [x] Assets are served with correct MIME types
- [x] SPA routing still works for application routes

## Deployment Steps

1. **Apply Migration:**
   ```bash
   # In Supabase Dashboard SQL Editor or CLI
   # Run: supabase/migrations/20260110000000_fix_sql_function_errors.sql
   ```

2. **Deploy to Vercel:**
   ```bash
   # Vercel will automatically deploy with new vercel.json
   vercel --prod
   ```

3. **Verify:**
   - Test Friends tab navigation
   - Check browser console for errors
   - Verify balance history loads
   - Verify top categories load

## Related Files

- `supabase/migrations/20260110000000_fix_sql_function_errors.sql` - SQL fixes
- `vercel.json` - Vercel routing configuration
- `src/modules/friends/index.ts` - Friends module exports (verified correct)
- `src/modules/profile/index.ts` - Profile module exports (verified correct)
- `.serena/memories/sql_function_best_practices.md` - Best practices guide

## Prevention

To prevent similar issues in the future:

1. **SQL Functions:**
   - Always follow the established pattern for RETURN TABLE functions
   - Test functions with various parameter combinations
   - Use explicit types and casts

2. **Vercel Configuration:**
   - Always exclude assets from SPA routing
   - Test asset serving in production environment
   - Monitor for MIME type errors

3. **Code Review:**
   - Check for ambiguous column references in SQL
   - Verify ENUM type casting
   - Ensure Vercel config excludes assets

## References

- [PostgreSQL Function Return Types](https://www.postgresql.org/docs/current/xfunc-sql.html)
- [Vercel Rewrites Documentation](https://vercel.com/docs/configuration/routes/rewrites)
- [Vite Code Splitting](https://vitejs.dev/guide/build.html#chunking-strategy)
