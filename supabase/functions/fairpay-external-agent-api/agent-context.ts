// AgentContextService — canonical capability/onboarding document for external
// agents (ChatGPT, custom LLM tools, etc.). Returned by:
//   GET /v1/agent-context           (Edge function direct)
//   GET /api/external-agent/context (Vercel rewrite)
//
// Also reachable as the discovery payload when an empty/probe POST is sent to
// /api/external-agent-submissions (the agent's first call).
//
// Keep this file dependency-free — the public Edge Function must not fail on
// remote imports.

export const FAIRPAY_BASE_URL = 'https://long-pay.vercel.app'
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

export interface AgentContextDocument {
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
  examples: Record<string, { description: string; body: unknown }>
  common_errors: Record<string, string>
  agent_instructions: string[]
  network_diagnostics: {
    expected_host: string
    troubleshoot: string[]
    error_classification: Record<string, string>
  }
  notes: string[]
}

// AgentContextService.
// Single source of truth for the discovery blob. Build once per request — the
// document is small and request-cheap to materialize.
export const AgentContextService = {
  build(): AgentContextDocument {
    return {
      service: 'FairPay',
      version: 'v1',
      base_url: FAIRPAY_BASE_URL,
      purpose:
        'Submit, preview, and confirm shared expense proposals for FairPay groups. ' +
        'External agents (e.g. ChatGPT) can submit proposals without an API key; ' +
        'real expenses are only created after a signed-in FairPay user approves.',
      required_flow: [
        '1. GET /api/external-agent/context — read this document and any updated rules.',
        '2. Identify the authenticated FairPay user (target_email) from your conversation context.',
        '3. Identify the group (group_name preferred; group_id if you happen to have it).',
        '4. Resolve participants by email when known; otherwise by display_name. Never invent IDs.',
        '5. Build the normalized proposal body (integer VND amounts, equal/exact/fixed split rules).',
        '6. POST the proposal to /api/external-agent-submissions.',
        '7. Stop. The signed-in user (or a group admin) approves the proposal in the FairPay UI before any expense is created.',
      ],
      available_apis: {
        context: `GET ${FAIRPAY_BASE_URL}${EXTERNAL_AGENT_CONTEXT_PATH}`,
        health: `GET ${FAIRPAY_BASE_URL}${FAIRPAY_HEALTH_PATH}`,
        submit_proposal: `POST ${FAIRPAY_BASE_URL}${EXTERNAL_AGENT_SUBMIT_PATH}`,
      },
      request_shape: {
        target_email: 'string (required) — FairPay account email that should review the proposal.',
        group_id: 'string UUID (optional) — supply if you already have a stable group ID.',
        group_name: 'string (required if group_id missing) — human-readable group name, e.g. "Core".',
        source: 'string (optional) — your agent identifier, e.g. "chatgpt".',
        description: 'string (required, 1–200 chars).',
        amount: 'integer (required) — VND, no decimals. Convert "50k" → 50000, "600 nghìn" → 600000.',
        currency: '"VND" (required).',
        category: `string (optional) — one of: ${SUPPORTED_CATEGORIES.join(', ')}.`,
        expense_date: 'string (optional) — YYYY-MM-DD. Defaults to today on the server.',
        comment: 'string | null (optional, ≤ 1000 chars).',
        payer: '{ email?: string, display_name?: string } — at least one of email/display_name is required.',
        split_method: `"${SPLIT_METHODS.join('" | "')}".`,
        participants:
          'Array<{ email?: string, display_name?: string, amount?: integer, fixed_amount?: integer }> ' +
          'with 1–100 entries. Each participant must have email or display_name.',
      },
      validation_rules: {
        amount: 'Positive integer ≤ 9_999_999_999.',
        currency: 'Only "VND" is accepted.',
        participant_uniqueness:
          'No duplicate participants. Identity is email (lowercase) when present, else display_name (case-insensitive).',
        unknown_fields: 'Unknown top-level fields are rejected.',
        request_size: 'Request body must be ≤ 32 KB.',
      },
      split_method_rules: {
        equal: 'Do not include amount or fixed_amount on participants.',
        exact: 'Every participant must include a positive integer amount. Sum must equal the total amount.',
        fixed_then_equal_remainder:
          'Some participants have fixed_amount; the remainder is split equally among the rest. Do not use amount.',
      },
      categories: SUPPORTED_CATEGORIES,
      resolution_note:
        'Do NOT call any member or group lookup endpoint. The no-key intake is proposal-only. ' +
        'FairPay resolves names and emails into stable group_member IDs at approval time. ' +
        'If a name is genuinely ambiguous, ask the user a follow-up question instead of guessing.',
      examples: {
        single_person: {
          description: 'Two-person split where the target user paid.',
          body: {
            target_email: 'user@example.com',
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
          description: 'Equal split across several named participants.',
          body: {
            target_email: 'user@example.com',
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
        group_subset: {
          description: 'Specific subset of group members for a one-off expense.',
          body: {
            target_email: 'user@example.com',
            group_name: 'Core',
            source: 'chatgpt',
            description: 'Massage',
            amount: 500000,
            currency: 'VND',
            category: 'Other',
            payer: { email: 'user@example.com' },
            split_method: 'equal',
            participants: [
              { display_name: 'Anh Tâm' },
              { email: 'user@example.com' },
              { display_name: 'Thuần' },
            ],
          },
        },
        exact_split: {
          description: 'Exact amounts per person; sum must equal the total.',
          body: {
            target_email: 'user@example.com',
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
      common_errors: {
        VALIDATION_ERROR:
          'Body failed schema validation. Inspect details[] for per-field issues, then re-submit.',
        INVALID_JSON: 'Body is missing or not valid JSON. Set Content-Type: application/json.',
        REQUEST_TOO_LARGE: 'Body exceeds 32 KB. Trim comment / participants and retry.',
        RATE_LIMIT_EXCEEDED: 'Too many submissions; wait ~60s before retrying.',
        PENDING_LIMIT_EXCEEDED:
          'The target user already has too many pending proposals. Wait for approval/rejection before sending more.',
        SUBMISSION_FAILED: 'Generic submission failure. Inspect message for the underlying reason.',
        AMBIGUOUS_PARTICIPANT:
          'A name matched multiple group members at approval time. Ask the user to disambiguate (email preferred).',
        FAIRPAY_HOST_UNRESOLVED:
          'Network/DNS issue reaching long-pay.vercel.app. This is a transport error, not a FairPay validation error.',
      },
      agent_instructions: [
        'Never ask the user for an API key — there is none on this endpoint.',
        'Never call Supabase URLs directly. Use https://long-pay.vercel.app exclusively.',
        'Never call any member, group, or user lookup endpoint from the no-key surface.',
        'Convert "k"/"nghìn" → integer VND (50k → 50000, 600 nghìn → 600000).',
        'Detect group cues like "nhóm Core" → group_name: "Core".',
        'Prefer email over display_name when the user mentions one explicitly.',
        'If the payer is unclear, ask before submitting. Do not guess.',
        'If exact participants are unclear, ask before submitting. Do not include the entire group automatically.',
        'Submit proposals only — do not attempt to bypass FairPay confirmation rules.',
      ],
      network_diagnostics: {
        expected_host: 'long-pay.vercel.app',
        troubleshoot: [
          'Verify DNS resolution: `dig long-pay.vercel.app +short` should return Vercel A records.',
          'Verify outbound HTTPS (port 443) is allowed from your environment.',
          'Verify the URL has no stray whitespace, trailing slash artifacts, or split tokens.',
          'Verify any FAIRPAY_BASE_URL / PUBLIC_APP_URL / VERCEL_URL env var is normalized to https://long-pay.vercel.app with no trailing slash.',
        ],
        error_classification: {
          'curl: (6) Could not resolve host':
            'DNS failure. Treat as FAIRPAY_HOST_UNRESOLVED, not as a validation error.',
          'getaddrinfo ENOTFOUND': 'Same DNS failure surface from Node fetch. FAIRPAY_HOST_UNRESOLVED.',
          'EAI_AGAIN': 'Transient DNS failure. Retry after a short backoff.',
          'ECONNREFUSED / ETIMEDOUT': 'Reachability issue. FAIRPAY_HOST_UNRESOLVED-class transport error.',
        },
      },
      notes: [
        'Always resolve names to stable IDs only after a signed-in user approves the proposal in the FairPay UI.',
        'Do not duplicate transaction parsing/validation across handlers — call the shared FairPay services.',
        'Do not bypass the preview → confirm → commit flow that protects authenticated agent writes.',
      ],
    }
  },
}

