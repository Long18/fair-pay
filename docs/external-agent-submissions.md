# External Agent Submissions

Use the FairPay domain endpoint for ChatGPT and other external agents. The route is a Vercel rewrite to the FairPay external-agent Edge Function, so agents never need to see or store the Supabase URL.

No API key, Supabase key, OAuth token, or `Authorization` header is required on any of the endpoints below.

---

## Agent Context / Capability Discovery

Before submitting, agents should fetch the machine-readable capability document to understand available APIs, the required flow, request shape, examples, and common errors:

```http
GET https://long-pay.vercel.app/api/external-agent/context
```

The response is a structured JSON document (`AgentContextDocument`) maintained by `AgentContextService` in `supabase/functions/fairpay-external-agent-api/agent-context.ts`. All agent-facing instructions, examples, validation rules, and DNS diagnostic guidance live there as the single source of truth.

Every response from FairPay external-agent endpoints includes a top-level `trace_id` (UUID v4) for end-to-end debugging. Include it when reporting issues.

Example response shape:

```json
{
  "trace_id": "b2f2f823-65d5-447f-972f-7f39f09ab97e",
  "service": "FairPay",
  "version": "v1",
  "base_url": "https://long-pay.vercel.app",
  "purpose": "...",
  "required_flow": ["1. GET /api/external-agent/context", "2. Identify actor ...", "..."],
  "available_apis": {
    "context": "GET https://long-pay.vercel.app/api/external-agent/context",
    "health": "GET https://long-pay.vercel.app/api/health",
    "submit_proposal": "POST https://long-pay.vercel.app/api/external-agent-submissions"
  },
  "request_shape": { ... },
  "validation_rules": { ... },
  "split_method_rules": { ... },
  "categories": ["Food & Drink", "..."],
  "examples": { "single_person": { ... }, "multiple_people": { ... }, "group_subset": { ... }, "exact_split": { ... } },
  "common_errors": { ... },
  "agent_instructions": [ "Never ask the user for an API key.", "..." ],
  "network_diagnostics": { "expected_host": "long-pay.vercel.app", "troubleshoot": ["..."], "error_classification": { ... } }
}
```

---

## Submit a Proposal

External agents submit proposed expenses only. FairPay resolves group members and creates the real expense only after a signed-in user approves the proposal in one of two queues:

- **Client confirmations**: proposals submitted for the signed-in user's email.
- **Admin approvals**: proposals for groups administered by the signed-in user.

```text
POST https://long-pay.vercel.app/api/external-agent-submissions
Content-Type: application/json
```

### Probe / Discovery Mode

If an agent sends an empty body or a bare `{}`, the API returns the full capability document (same as `GET /api/external-agent/context`) instead of a validation error. Use this to self-orient without a separate GET call:

```bash
curl -X POST https://long-pay.vercel.app/api/external-agent-submissions \
  -H "Content-Type: application/json" -d '{}'
# → 200 with the AgentContextDocument + trace_id
```

### Request Shape

```json
{
  "target_email": "user@example.com",
  "group_name": "Core",
  "source": "chatgpt",
  "description": "Dinner",
  "amount": 600000,
  "currency": "VND",
  "category": "Food & Drink",
  "expense_date": "2026-06-24",
  "comment": "Submitted by ChatGPT",
  "payer": {
    "email": "user@example.com"
  },
  "split_method": "equal",
  "participants": [
    { "email": "user@example.com" },
    { "display_name": "Anh Tâm" },
    { "display_name": "Thuần" }
  ]
}
```

Rules:

- `target_email` is the FairPay user who should see the proposal.
- Use `group_name` when the user mentions a group, such as `Core`.
- Prefer emails when known; otherwise use `display_name`.
- Amount is integer VND: `50k` becomes `50000`, `600k` becomes `600000`.
- Do not call any member lookup endpoint. FairPay resolves names and emails during approval.
- If the user gives exact participants, include only those participants.
- If payer is unclear, ask who paid before submitting.
- If group is unclear, ask for group context before submitting.

---

## ChatGPT Instruction Template

```text
You submit FairPay expense proposals by POSTing JSON to:
https://long-pay.vercel.app/api/external-agent-submissions

To understand available APIs and the required flow, first call:
GET https://long-pay.vercel.app/api/external-agent/context

The user's FairPay email is: <set target_email here>.

Never ask for an API key. Never use Supabase URLs. Never call public member or group lookup APIs.

Parse Vietnamese natural language into a pending FairPay expense proposal:
- Convert k/nghìn to integer VND.
- Detect group names such as "nhóm Core" and send group_name: "Core".
- Detect participants by name.
- If the user says "có A, B, C", include only A, B, C.
- If the user says "tôi trả tiền", payer is the target_email user.
- If another person paid, set payer.display_name to that name.
- If exact participants are unclear, ask a follow-up question instead of guessing.
- If group context is unclear, ask a follow-up question before submitting.

Submit only proposals. FairPay users/admins approve inside the website before any real expense is created.
```

---

## Examples

**Two-person split:**

```json
{
  "target_email": "user@example.com",
  "group_name": "Core",
  "source": "chatgpt",
  "description": "Cà phê",
  "amount": 50000,
  "currency": "VND",
  "category": "Food & Drink",
  "payer": { "email": "user@example.com" },
  "split_method": "equal",
  "participants": [
    { "email": "user@example.com" },
    { "display_name": "Anh Tâm" }
  ]
}
```

**Specific group subset:**

```json
{
  "target_email": "user@example.com",
  "group_name": "Core",
  "source": "chatgpt",
  "description": "Massage",
  "amount": 500000,
  "currency": "VND",
  "category": "Other",
  "payer": { "email": "user@example.com" },
  "split_method": "equal",
  "participants": [
    { "display_name": "Anh Tâm" },
    { "email": "user@example.com" },
    { "display_name": "Thuần" }
  ]
}
```

---

## DNS / Network Troubleshooting

If you see `curl: (6) Could not resolve host: long-pay.vercel.app`:

This is a **transport error**, not a FairPay validation error. The FairPay API is not involved — your agent's environment cannot reach the host.

Diagnostic steps:

1. Verify DNS: `dig long-pay.vercel.app +short` should return Vercel A records.
2. Confirm HTTPS (port 443) outbound is allowed from your environment.
3. Check for stray whitespace or newlines in any `FAIRPAY_BASE_URL` / `PUBLIC_APP_URL` / `VERCEL_URL` env var — normalize it to `https://long-pay.vercel.app` with no trailing slash.
4. Test a basic HTTPS request: `curl -I https://long-pay.vercel.app/api/health`.

Error codes returned by the API for transport-class failures:

| Code | Meaning |
|------|---------|
| `FAIRPAY_HOST_UNRESOLVED` | DNS or connectivity failure reaching the Supabase backend. This is a transport error, not a validation error. |
| `BASE_URL_INVALID` | `SUPABASE_URL` env var on the server is malformed. Redeploy with a valid URL. |

---

## Curl Smoke Tests

```bash
# Check domain is reachable
curl -i https://long-pay.vercel.app/api/health
# → 200 {"status":"ok","service":"FairPay"}

# Fetch capability document (includes trace_id)
curl https://long-pay.vercel.app/api/external-agent/context
# → {"trace_id":"...","service":"FairPay","version":"v1",...}

# Probe mode — empty POST returns the same capability document
curl -X POST https://long-pay.vercel.app/api/external-agent-submissions \
  -H "Content-Type: application/json" -d '{}'
# → {"trace_id":"...","service":"FairPay","version":"v1",...}

# Submit a proposal (response includes trace_id for debugging)
curl -X POST "https://long-pay.vercel.app/api/external-agent-submissions" \
  -H "Content-Type: application/json" \
  -d '{
    "target_email": "user@example.com",
    "group_name": "Core",
    "source": "chatgpt",
    "description": "Coffee",
    "amount": 50000,
    "currency": "VND",
    "payer": { "email": "user@example.com" },
    "split_method": "equal",
    "participants": [
      { "email": "user@example.com" },
      { "display_name": "Anh Tâm" }
    ]
  }'
# → {"trace_id":"...","status":"pending","submission_id":"...","message":"Submission queued for FairPay approval"}
```
