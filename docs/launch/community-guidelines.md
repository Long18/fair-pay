# FairPay Agent API — Community Guidelines

## Getting Help

| Channel | Use for |
|---------|---------|
| [GitHub Issues](https://github.com/fairpay/fairpay/issues) | Bug reports, confirmed problems |
| [GitHub Discussions](https://github.com/fairpay/fairpay/discussions) | Questions, ideas, show-and-tell |
| Email: api-support@fairpay.dev | Enterprise or sensitive questions |

Response times: Critical bugs within 24h, feature requests within 7 days.

---

## Filing a Bug Report

Include the following — reports missing these details will be asked for them before being investigated:

```
**Endpoint**: POST /v1/expenses/preview
**SDK version** (if applicable): @fairpay/agent-sdk@1.0.0
**Request body** (redact any tokens or personal data):
{
  "group_id": "...",
  ...
}
**Response received**:
{
  "error": { "code": "MEMBER_NOT_FOUND", "message": "..." }
}
**Expected behavior**: Preview should be created
**Steps to reproduce**: ...
```

Do **not** include:
- JWT tokens or API keys
- Real user emails or personal data
- Production preview_ids or operation_ids (use staging if possible)

---

## Filing a Feature Request

Help us understand your use case:

```
**Use case**: I'm building an agent that processes restaurant receipts...
**What I need**: Ability to attach a receipt image URL to an expense...
**Current workaround**: Storing URL in the `comment` field, but it's not queryable...
**Priority**: High / Medium / Low
```

We prioritize based on: number of requesters, implementation complexity, strategic fit.

---

## Reporting Security Vulnerabilities

**Do NOT open a public issue for security vulnerabilities.**

Email: security@fairpay.dev

Include:
- Description of the vulnerability
- Steps to reproduce (in a test/staging environment)
- Potential impact

We will:
- Acknowledge within 24 hours
- Provide a timeline within 72 hours
- Credit you in the security advisory (unless you prefer anonymity)

---

## Show-and-Tell

Built something with the FairPay Agent API? Share it in GitHub Discussions under the **Show and Tell** category. We love seeing what the community creates and may feature it in our docs.

---

## Code of Conduct

- Be respectful and constructive
- No spam or self-promotion unrelated to FairPay
- Help others when you can — this is a community, not just a support queue
- Assume good intent; ask for clarification before assuming malice
- Violations may result in removal from the community
