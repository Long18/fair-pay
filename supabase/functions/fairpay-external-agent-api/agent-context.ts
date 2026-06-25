// AgentContextService — canonical capability/onboarding document.
// Returned by:
//   GET /v1/agent-context (Edge function direct)
//   GET /api/external-agent/context (Vercel rewrite)
//   POST /api/external-agent-submissions with empty/probe body.

const FAIRPAY_BASE_URL = 'https://long-pay.vercel.app'

export const FAIRPAY_HEALTH_PATH = '/api/health'
export const EXTERNAL_AGENT_SUBMIT_PATH = '/api/external-agent-submissions'
export const EXTERNAL_AGENT_CONTEXT_PATH = '/api/external-agent/context'

const SUPPORTED_CATEGORIES = [
  'Food & Drink',
  'Transportation',
  'Accommodation',
  'Entertainment',
  'Shopping',
  'Utilities',
  'Healthcare',
  'Education',
  'Other',
] as const

const SPLIT_METHODS = ['equal', 'exact', 'fixed_then_equal_remainder'] as const

type AgentContextDocument = {
  service: 'FairPay'
  version: 'v1'
  base_url: string
  purpose: string
  required_flow: string[]
  available_apis: Record<string, string>
  request_shape: Record<string, string>
  validation_rules: Record<string, string>
  split_method_rules: Record<string, string>
  categories: readonly string[]
  resolution_note: string
  examples: Record<string, { description: string; body: Record<string, unknown> }>
  errors: Record<string, string>
  agent_instructions: string[]
  network_diagnostics: Record<string, unknown>
  maintainer_notes: string[]
}

export class AgentContextService {
  build(): AgentContextDocument {
    return {
      service: 'FairPay',
      version: 'v1',
      base_url: FAIRPAY_BASE_URL,
      purpose:
        'Submit shared expense proposals for FairPay groups. External agents can submit proposals without an API key; real expenses are created only after a signed-in FairPay user approves.',
      required_flow: [
        '1. GET /api/external-agent/context — read this capability document.',
        '2. Identify the FairPay user from conversation context, then explicitly ask them to confirm their name/email.',
        '3. Ask whether the expense is for a FairPay group or a personal/1-on-1 transaction.',
        '4. If it is personal/1-on-1, stop: external agents cannot submit personal transactions yet.',
        '5. For group expenses, identify the group (group_name preferred; group_id if already known).',
        '6. Resolve participants by email when known; otherwise by display_name. Never invent IDs.',
        '7. Build a normalized proposal body with integer VND amounts and valid split rules.',
        '8. POST the proposal to /api/external-agent-submissions only after actor + group confirmation.',
        '9. Stop. The signed-in user approves the proposal in the FairPay UI before any expense is created.',
      ],
      available_apis: {
        context: `GET ${FAIRPAY_BASE_URL}${EXTERNAL_AGENT_CONTEXT_PATH}`,
        health: `GET ${FAIRPAY_BASE_URL}${FAIRPAY_HEALTH_PATH}`,
        submit_proposal: `POST ${FAIRPAY_BASE_URL}${EXTERNAL_AGENT_SUBMIT_PATH}`,
      },
      request_shape: {
        target_email: 'string (required) — FairPay account email that should review the proposal.',
        target_name: 'string (optional) — display name the user confirmed, when available.',
        actor_confirmed: 'true (required) — set only after asking the user to confirm their FairPay name/email.',
        transaction_type: '"group" (required). If the user says "personal" or "1-on-1", do not submit.',
        group_id: 'string UUID (optional) — supply only if already known.',
        group_name: 'string (required if group_id is missing) — human-readable group name, e.g. "Core".',
        source: 'string (optional) — e.g. "chatgpt".',
        description: 'string (required, max 200).',
        amount: 'integer (required) — VND, no decimals. Convert "50k" → 50000, "600 nghìn" → 600000.',
        currency: '"VND" (required).',
        category: `"${SUPPORTED_CATEGORIES.join('" | "')}" (optional).`,
        expense_date: 'YYYY-MM-DD (optional).',
        comment: 'string|null (optional, max 1000).',
        payer: 'ActorRef (required) — { email?: string, display_name?: string }.',
        split_method: `"${SPLIT_METHODS.join('" | "')}" (required).`,
        participants:
          'Array<ActorRef & { amount?: integer, fixed_amount?: integer }> (required, 1-100 entries). Each participant must have email or display_name.',
      },
      validation_rules: {
        actor_confirmation:
          'Always ask "Bạn có phải là <name/email> không?" before setting actor_confirmed=true.',
        transaction_type:
          'Always ask whether this is group or personal. Only group submissions are accepted in v1.',
        group_required: 'Group submissions require group_id or group_name.',
        amount: 'Positive integer ≤ 9_999_999_999.',
        currency: 'Only "VND" is accepted.',
        participant_uniqueness:
          'No duplicate participants. Identity is email when present, otherwise normalized display_name.',
        unknown_fields: 'Unknown top-level fields are rejected.',
        request_size: 'Request body must be ≤ 32 KB.',
      },
      split_method_rules: {
        equal: 'Do not include amount or fixed_amount on participants.',
        exact: 'Every participant must include a positive integer amount. Sum must equal the total amount.',
        fixed_then_equal_remainder:
          'Participants with a fixed amount use fixed_amount. Remaining amount is split equally across others. Use fixed_amount, not amount.',
      },
      categories: SUPPORTED_CATEGORIES,
      resolution_note:
        'Do NOT call any member, group, or user lookup endpoint from the no-key surface. FairPay resolves names and emails into stable group_member IDs at approval time. Before submitting, ask the user to confirm actor name/email, group-vs-personal type, and the group name. If a name is genuinely ambiguous, ask a user follow-up question before submitting.',
      examples: {
        two_person_split: {
          description: 'Two-person group expense where the target user paid.',
          body: {
            target_email: 'user@example.com',
            target_name: 'Nguyen Van A',
            actor_confirmed: true,
            transaction_type: 'group',
            group_name: 'Core',
            source: 'chatgpt',
            description: 'Cà phê',
            amount: 50000,
            currency: 'VND',
            category: 'Food & Drink',
            payer: { email: 'user@example.com' },
            split_method: 'equal',
            participants: [{ email: 'user@example.com' }, { display_name: 'Anh Tâm' }],
          },
        },
        multiple_people: {
          description: 'Group expense split equally across multiple people.',
          body: {
            target_email: 'user@example.com',
            actor_confirmed: true,
            transaction_type: 'group',
            group_name: 'Core',
            source: 'chatgpt',
            description: 'Dinner',
            amount: 600000,
            currency: 'VND',
            category: 'Food & Drink',
            payer: { email: 'user@example.com' },
            split_method: 'equal',
            participants: [
              { email: 'user@example.com' },
              { display_name: 'Anh Tâm' },
              { display_name: 'Thuần' },
            ],
          },
        },
        exact_split: {
          description: 'Exact group split; participant amounts sum to total.',
          body: {
            target_email: 'user@example.com',
            actor_confirmed: true,
            transaction_type: 'group',
            group_name: 'Core',
            source: 'chatgpt',
            description: 'Grocery split',
            amount: 300000,
            currency: 'VND',
            payer: { email: 'user@example.com' },
            split_method: 'exact',
            participants: [
              { email: 'user@example.com', amount: 100000 },
              { display_name: 'Anh Tâm', amount: 200000 },
            ],
          },
        },
      },
      errors: {
        NEEDS_CLARIFICATION:
          'The user must confirm actor email/name, group-vs-personal type, or group before submission.',
        UNSUPPORTED_PERSONAL_TRANSACTION:
          'Personal/1-on-1 agent-created transactions are not supported yet. Do not submit; ask the user to use FairPay manually or choose a group.',
        VALIDATION_ERROR: 'Body failed schema validation. Inspect details and fix the proposal.',
        INVALID_JSON: 'Body is missing or not valid JSON. Set Content-Type: application/json.',
        REQUEST_TOO_LARGE: 'Body exceeds 32 KB. Trim comment/participants and retry.',
        RATE_LIMIT_EXCEEDED: 'Too many submissions; wait about 60 seconds before retrying.',
        PENDING_LIMIT_EXCEEDED:
          'The target user already has too many pending proposals. Wait for approval/rejection before sending more.',
        SUBMISSION_FAILED: 'Generic submission failure. Inspect message for the underlying reason.',
        AMBIGUOUS_PARTICIPANT:
          'A name matched multiple group members at approval time. Ask the user for email or exact member name and resubmit.',
        FAIRPAY_HOST_UNRESOLVED:
          'Network/DNS issue reaching long-pay.vercel.app. This is a transport error, not a FairPay validation error.',
      },
      agent_instructions: [
        'Never ask the user for an API key — there is none on this endpoint.',
        'Never call Supabase URLs directly. Use https://long-pay.vercel.app exclusively.',
        'Never call any member, group, or user lookup endpoint from the no-key surface.',
        'Always ask: "Bạn có phải là <name/email> không?" before setting actor_confirmed=true.',
        'Always ask whether the transaction is group or personal before submitting.',
        'If transaction is personal/1-on-1, explain it is not supported by the agent yet and do not call submit.',
        'Prefer email over display_name when the user mentions one explicitly.',
        'If a participant or group name is ambiguous, ask a follow-up question instead of guessing.',
        'Submit only proposals; do not tell the user that an expense was created.',
      ],
      network_diagnostics: {
        expected_host: 'long-pay.vercel.app',
        health_check: `${FAIRPAY_BASE_URL}${FAIRPAY_HEALTH_PATH}`,
        context_check: `${FAIRPAY_BASE_URL}${EXTERNAL_AGENT_CONTEXT_PATH}`,
      },
      maintainer_notes: [
        'Keep this document aligned with docs/openapi-external-agent-chatgpt.yaml and public/.well-known/openai.yaml.',
        'External no-key intake must never expose account, group, or member lookup APIs.',
        'Do not bypass the FairPay approval flow for external agent submissions.',
      ],
    }
  }
}

export default AgentContextService
