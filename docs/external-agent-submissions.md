# External Agent Submissions

Use the FairPay domain endpoint for ChatGPT and other external agents. The route is a Vercel rewrite to the existing FairPay external-agent Edge Function, so agents never need to see or store the Supabase URL.

```text
POST https://long-pay.vercel.app/api/external-agent-submissions
Content-Type: application/json
```

No API key, Supabase key, OAuth token, or `Authorization` header is required.

External agents submit proposed expenses only. FairPay resolves group members and creates the real expense only after a signed-in user approves the proposal in one of two queues:

- **Client confirmations**: proposals submitted for the signed-in user's email.
- **Admin approvals**: proposals for groups administered by the signed-in user.

## Request Shape

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
    {
      "email": "user@example.com"
    },
    {
      "display_name": "Anh Tâm"
    },
    {
      "display_name": "Thuần"
    }
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

## ChatGPT Instruction Template

```text
You submit FairPay expense proposals by POSTing JSON to:
https://long-pay.vercel.app/api/external-agent-submissions

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

## Examples

User says:

```text
Hôm nay anh Tâm mua cà phê tôi trả tiền hết 50k
```

If the group context is known from conversation or GPT instructions, submit:

```json
{
  "target_email": "user@example.com",
  "group_name": "Core",
  "source": "chatgpt",
  "description": "Cà phê",
  "amount": 50000,
  "currency": "VND",
  "category": "Food & Drink",
  "payer": {
    "email": "user@example.com"
  },
  "split_method": "equal",
  "participants": [
    {
      "email": "user@example.com"
    },
    {
      "display_name": "Anh Tâm"
    }
  ]
}
```

User says:

```text
Hôm nay nhóm Core đi ăn tối hết 600k
```

If participants are not clear, ask who joined. If the user confirms the whole group should be included, ask them to name the participants or use the authenticated in-app FairPay assistant.

User says:

```text
Hôm nay nhóm Core có Anh Tâm, Tôi và Thuần đi massage hết 500k
```

Submit only those participants:

```json
{
  "target_email": "user@example.com",
  "group_name": "Core",
  "source": "chatgpt",
  "description": "Massage",
  "amount": 500000,
  "currency": "VND",
  "category": "Other",
  "payer": {
    "email": "user@example.com"
  },
  "split_method": "equal",
  "participants": [
    {
      "display_name": "Anh Tâm"
    },
    {
      "email": "user@example.com"
    },
    {
      "display_name": "Thuần"
    }
  ]
}
```

## Curl Smoke Test

```bash
curl -X POST "https://long-pay.vercel.app/api/external-agent-submissions" \
  -H "Content-Type: application/json" \
  -d '{
    "target_email": "user@example.com",
    "group_name": "Core",
    "source": "chatgpt",
    "description": "Coffee",
    "amount": 50000,
    "currency": "VND",
    "payer": {
      "email": "user@example.com"
    },
    "split_method": "equal",
    "participants": [
      {
        "email": "user@example.com"
      },
      {
        "display_name": "Anh Tâm"
      }
    ]
  }'
```
