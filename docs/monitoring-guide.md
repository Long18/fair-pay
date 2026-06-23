# FairPay Agent API — Monitoring & Iteration Guide

## Key Metrics to Watch

### Health Metrics
| Metric | Target | Alert if |
|--------|--------|----------|
| Request success rate | > 99% | < 97% |
| P95 response latency | < 2s | > 5s |
| Error rate by code | Baseline | Spike > 2× baseline |
| Rate limit hits (429) | < 1% | > 5% |

### Business Metrics
- **Daily active agent users** — unique JWTs calling the API each day
- **Previews created per day** — volume indicator
- **Preview → Committed conversion rate** — target 70%+; a drop means users aren't confirming
- **Average time from preview to commit** — how quickly users confirm in FairPay UI
- **Most common split methods** — equal / exact / fixed_then_equal_remainder distribution
- **Average expense amount** — sanity check for outliers

### Abuse Signals
- Users hitting rate limits (429) repeatedly in short windows
- Unusual patterns: same description + same amount + same group within minutes
- High preview creation with zero confirmations (abandoned flows)
- Burst traffic from a single IP or user

---

## Admin Dashboard Usage

The **Admin Agent Operations** page (`/admin/agent-operations`) provides:
- Filterable list of all operations (status, user, date range, full-text search)
- Metrics panel: total ops, committed, failed, completion rate, P95 commit time
- Per-operation detail view (safe fields only — no sensitive data exposed)

### What to Look For

| Observation | Likely Cause | Action |
|-------------|-------------|--------|
| Spike in `failed` operations | Bad request format, member_id mismatch | Check `error_code` distribution in detail view |
| Drop in `completion_rate` | Users not confirming; UX issue in FairPay UI | Review UX flow, check preview TTL |
| High P95 commit time | Confirm/commit flow latency in FairPay UI | Profile UI confirmation handler |
| Many `expired` operations | Preview TTL (10 min) too short, or users confused | Improve "confirm now" prompts in UI |
| Repeated `RATE_LIMIT_EXCEEDED` | Agent calling too aggressively | Contact the developer; share rate limit docs |

---

## Iteration Playbook

### Week 1–2: Stabilization
- Fix documentation gaps reported by early integrators
- Tune rate limit thresholds based on actual usage patterns (current: 10/min)
- Improve error messages for the most common mistakes:
  - `member_id` from `profiles.id` instead of `group_members.id`
  - `total_amount` as float instead of integer VND
  - Missing `payer_member_id` in preview request

### Month 1: Feature Request Triage
Collect requests via GitHub Issues/Discussions and prioritize by frequency:
- **Webhooks** — notify agent when user confirms instead of polling (high demand expected)
- **Longer preview TTL** — 10 minutes may be too short for async agents
- **Batch preview creation** — create multiple previews in one request
- **Read-only expense history** — list committed expenses for a group
- **Template support** — recurring expense templates

### Month 2–3: Enhancements
- Ship webhook support for operation status changes (eliminates polling)
- Evaluate Phase 2B (Trust Model): allow confirmed agents to call confirm/commit directly
- Add `GET /v1/groups/{id}/expenses` (read-only history endpoint) if demanded
- Consider longer preview TTL (30 min) based on usage data

### Quarterly: API Health Review
- Deprecate endpoints/fields with < 1% usage after 6-month notice
- Run security audit on new usage patterns observed
- Update rate limits based on 90-day traffic trends
- Publish public roadmap update on GitHub Discussions

---

## Incident Response

### Severity Levels

| Level | Condition | Response Time | Owner |
|-------|-----------|--------------|-------|
| P0 — Critical | API fully down or data corruption | 1 hour | On-call engineer |
| P1 — High | Endpoint returning 5xx for all users | 4 hours | On-call engineer |
| P2 — Medium | Degraded performance, partial failures | 24 hours | Primary maintainer |
| P3 — Low | Cosmetic issues, doc errors | 7 days | Any team member |

### Response Steps
1. **Acknowledge** — post to status page and GitHub Discussions
2. **Assess blast radius** — which agents/users are affected?
3. **Mitigate** — rollback function deployment, disable endpoint, or raise rate limits
4. **Root cause** — check Supabase Edge Function logs, error table in DB
5. **Post-mortem** — document in `docs/incidents/YYYY-MM-DD.md`
6. **Communicate resolution** — update status page, close GitHub issue

---

## Supabase Cron Jobs

| Job | Function | Frequency | Monitored by |
|-----|----------|-----------|-------------|
| Expire stale previews | `expire_agent_previews()` | Every 5 min | Supabase Cron dashboard |

**Alert if:**
- `expire_agent_previews()` hasn't run in > 15 minutes
- Backlog of `previewed` operations with `preview_expires_at` in the past grows > 100 rows

Run this query to check the backlog:
```sql
SELECT COUNT(*)
FROM public.agent_operations ao
JOIN public.agent_previews ap ON ap.id = ao.preview_id
WHERE ao.status = 'previewed'
  AND ap.expires_at < now()
  AND ap.is_consumed = false;
```

---

## Useful Queries for Ops

### Completion rate last 7 days
```sql
SELECT
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE status = 'committed') AS committed,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'committed') / NULLIF(COUNT(*), 0), 1) AS completion_rate
FROM public.agent_operations
WHERE created_at >= now() - interval '7 days';
```

### Top error codes last 24h
```sql
SELECT
  error->>'code' AS error_code,
  COUNT(*) AS occurrences
FROM public.agent_operations
WHERE status = 'failed'
  AND created_at >= now() - interval '24 hours'
GROUP BY 1
ORDER BY 2 DESC
LIMIT 20;
```

### Active preview backlog
```sql
SELECT COUNT(*)
FROM public.agent_previews
WHERE NOT is_consumed
  AND expires_at > now();
```
