# Recurring Expenses Scheduler

Recurring expenses are scheduled to run daily at `00:05` in `Asia/Ho_Chi_Minh`.

## Required database settings

Run these statements in the Supabase SQL editor before applying the scheduler in production:

```sql
ALTER DATABASE postgres
  SET app.supabase_url = 'https://YOUR_PROJECT.supabase.co';

ALTER DATABASE postgres
  SET app.service_role_key = 'YOUR_SERVICE_ROLE_KEY';
```

## Required extensions

The scheduler migration expects both `pg_cron` and `pg_net` to be available.

If they are missing, the migration leaves a `NOTICE` and skips schedule registration.

## Scheduled job

- Job name: `process-recurring-expenses-daily-vn`
- Cron expression: `5 17 * * *`
- Effective local time: `00:05 GMT+7` on the next calendar day

The UTC schedule is intentional because `17:05 UTC` equals `00:05` in Vietnam.

## Verification

After migration:

```sql
SELECT jobid, jobname, schedule, command
FROM cron.job
WHERE jobname = 'process-recurring-expenses-daily-vn';
```

To trigger the same flow manually from SQL:

```sql
SELECT public.invoke_process_recurring_expenses();
```
