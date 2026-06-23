# @fairpay/agent-sdk

TypeScript SDK for the FairPay Agent API. Provides type-safe access to expense management, group operations, and preview/commit workflows.

## Installation

```bash
npm install @fairpay/agent-sdk
```

## Quick Start

```typescript
import { FairPayAgentClient } from '@fairpay/agent-sdk'

// Create a client
const client = new FairPayAgentClient({
  supabaseUrl: 'https://your-project.supabase.co',
  getToken: async () => {
    // Return the current user's session token
    return await getCurrentUserToken()
  }
})

// List user's groups
const groupsResponse = await client.getGroups()
const group = groupsResponse.groups[0]

// Get group members
const membersResponse = await client.getGroupMembers(group.id)
const payer = membersResponse.members[0]

// Check for duplicates (optional)
const duplicates = await client.checkDuplicates({
  group_id: group.id,
  description: 'Dinner',
  amount: 300000,
  payer_member_id: payer.member_id,
  expense_date: '2026-06-23'
})

// Create a preview
const preview = await client.previewExpense({
  group_id: group.id,
  description: 'Dinner',
  amount: 300000,
  currency: 'VND',
  category: 'Food & Drink',
  expense_date: '2026-06-23',
  payer_member_id: payer.member_id,
  split_method: 'equal',
  participants: membersResponse.members.map(m => ({
    member_id: m.member_id
  }))
})

// Wait for operation to complete (optional polling)
let operation = await client.pollOperation(preview.operation_id)
while (operation.status === 'pending') {
  await new Promise(r => setTimeout(r, 1000))
  operation = await client.pollOperation(preview.operation_id)
}

// Confirm (requires human confirmation in UI)
const confirmation = await client.confirmPreview(preview.preview_id, {
  preview_hash: preview.preview_hash
})

// Commit (requires idempotency key)
const result = await client.commitExpense(
  {
    preview_id: preview.preview_id,
    preview_hash: preview.preview_hash,
    confirmation_id: confirmation.confirmation_id
  },
  'unique-idempotency-key-uuid'
)

console.log(`Expense created: ${result.expense_id}`)
```

## API Reference

### `FairPayAgentClient`

#### Constructor

```typescript
const client = new FairPayAgentClient({
  supabaseUrl: string
  getToken: () => Promise<string | null>
})
```

#### Read Methods (exposed to AI agents)

- **`getMe(): Promise<AgentMe>`**
  Returns current user profile.

- **`getGroups(): Promise<AgentGroupsResponse>`**
  Lists all groups the user belongs to.

- **`getGroupMembers(groupId: string): Promise<AgentGroupMembersResponse>`**
  Lists all members of a group.

- **`checkDuplicates(request: AgentDuplicateCheckRequest): Promise<AgentDuplicateCheckResponse>`**
  Checks for potential duplicate expenses within a time window.

- **`previewExpense(request: AgentPreviewRequest): Promise<AgentPreviewResponse>`**
  Creates an expense preview with calculated splits. Does not commit the expense.

- **`pollOperation(operationId: string): Promise<AgentOperationResponse>`**
  Polls the status of an asynchronous operation.

#### UI-Only Methods (NOT in AI model tools)

- **`confirmPreview(previewId: string, request: AgentConfirmRequest): Promise<AgentConfirmResponse>`**
  Confirms a preview after human verification. Must be called before `commitExpense`.

- **`commitExpense(request: AgentCommitRequest, idempotencyKey: string): Promise<AgentCommitResponse>`**
  Commits a confirmed preview as a final expense. Requires idempotency key to prevent duplicate submissions.

## Types

### Core Types

```typescript
type SplitMethod = 'equal' | 'exact' | 'fixed_then_equal_remainder'
type OperationStatus = 'pending' | 'previewed' | 'confirmed' | 'committed' | 'failed' | 'expired'
type MemberRole = 'admin' | 'member'
type DuplicateMatchType = 'strong' | 'likely'
type ExpenseCategory = 
  | 'Food & Drink' | 'Transportation' | 'Accommodation' | 'Entertainment'
  | 'Shopping' | 'Utilities' | 'Healthcare' | 'Education' | 'Other'
```

### Request/Response Types

- `AgentGroupSummary` — Group metadata with member count and user role
- `AgentGroupMember` — Individual member profile with user ID and email
- `AgentDuplicateCheckRequest/Response` — Duplicate matching request and results
- `AgentPreviewRequest/Response` — Expense preview with calculated splits
- `AgentConfirmRequest/Response` — Confirmation handshake
- `AgentCommitRequest/Response` — Final expense submission
- `AgentOperationResponse` — Status envelope for async operations

## Error Handling

```typescript
import { FairPayApiError, RateLimitError, isAgentApiError } from '@fairpay/agent-sdk'

try {
  await client.getGroups()
} catch (err) {
  if (err instanceof RateLimitError) {
    console.log(`Rate limited. Retry after ${err.retryAfterSeconds}s`)
    await new Promise(r => setTimeout(r, err.retryAfterSeconds * 1000))
  } else if (err instanceof FairPayApiError) {
    console.error(`API error: ${err.code} — ${err.message}`)
    if (err.details) {
      console.error('Details:', err.details)
    }
  } else {
    throw err
  }
}

// Or use the type guard:
if (isAgentApiError(someValue)) {
  console.error(`Error code: ${someValue.error.code}`)
}
```

## Workflow

### Agent Workflow (AI-driven)

1. **Read** — Use `getGroups()` and `getGroupMembers()` to gather context
2. **Check** — Call `checkDuplicates()` to warn about similar expenses
3. **Preview** — Call `previewExpense()` with proposed splits (no commit)
4. **Poll** — Monitor `pollOperation()` to track async processing
5. **Return** — Respond to the user with preview details

The agent **never calls `confirmPreview()` or `commitExpense()`**. These are reserved for human UI confirmation.

### UI Workflow (Human confirmation)

1. Display the preview to the user
2. User approves → call `confirmPreview()`
3. Confirmation succeeds → call `commitExpense()` with idempotency key
4. Display confirmation to user

## Important Notes

- **Human Confirmation Required**: The AI agent can preview expenses but cannot commit them. All commits must be explicitly confirmed by a human user.
- **Idempotency Keys**: Each `commitExpense()` call requires a unique idempotency key (UUID v4 recommended) to prevent duplicate submissions.
- **Token Lifecycle**: The `getToken()` callback is invoked before each API request. Ensure it returns a fresh, valid session token.
- **Rate Limiting**: Watch for `RateLimitError` and respect the `Retry-After` header.

## License

MIT
