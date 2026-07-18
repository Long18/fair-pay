// Public contracts for no-key external agent submissions.
// This file intentionally avoids external imports so the Edge Function can
// validate probe/submission payloads even when remote registries are down.

type IssueCode =
  | 'VALIDATION_ERROR'
  | 'NEEDS_CLARIFICATION'
  | 'UNSUPPORTED_PERSONAL_TRANSACTION'

type Issue = {
  path: Array<string | number>
  message: string
  code?: IssueCode
}

type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: { issues: Issue[] } }

type ActorRef = {
  email?: string
  display_name?: string
}

type Participant = ActorRef & {
  amount?: number
  fixed_amount?: number
}

type TransactionType = 'group' | 'personal'

type ExternalAgentSubmission = {
  target_email: string
  target_name?: string
  actor_confirmed: true
  transaction_type: 'group'
  group_id?: string
  group_name?: string
  source?: string
  description: string
  amount: number
  currency: 'VND'
  category?: string
  expense_date?: string
  comment?: string | null
  payer: ActorRef
  split_method: 'equal' | 'exact' | 'fixed_then_equal_remainder'
  participants: Participant[]
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const CATEGORIES = new Set([
  'Food & Drink',
  'Transportation',
  'Accommodation',
  'Entertainment',
  'Shopping',
  'Utilities',
  'Healthcare',
  'Education',
  'Other',
])

function issue(path: Array<string | number>, message: string, code: IssueCode = 'VALIDATION_ERROR'): Issue {
  return { path, message, code }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeEmail(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const email = value.trim().toLowerCase()
  return EMAIL_RE.test(email) ? email : undefined
}

function normalizeText(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined
  const text = value.trim()
  if (!text || text.length > max) return undefined
  return text
}

function parseAmount(value: unknown): number | undefined {
  return typeof value === 'number'
    && Number.isInteger(value)
    && value > 0
    && value <= 9_999_999_999
    ? value
    : undefined
}

function isRealDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
}

function parseActor(
  value: unknown,
  path: string,
  issues: Issue[],
  extraAllowedKeys: readonly string[] = [],
): ActorRef | null {
  if (!isObject(value)) {
    issues.push(issue([path], 'Actor must be an object'))
    return null
  }

  // Participants may also carry amount / fixed_amount; payer must not.
  const allowed = new Set(['email', 'display_name', ...extraAllowedKeys])
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) issues.push(issue([path, key], 'Unknown field'))
  }

  const email = value.email === undefined ? undefined : normalizeEmail(value.email)
  const displayName = value.display_name === undefined ? undefined : normalizeText(value.display_name, 200)

  if (value.email !== undefined && !email) issues.push(issue([path, 'email'], 'Invalid email'))
  if (value.display_name !== undefined && !displayName) issues.push(issue([path, 'display_name'], 'Invalid display_name'))
  if (!email && !displayName) {
    issues.push(issue([path], 'Provide email or display_name'))
    return null
  }

  return {
    ...(email ? { email } : {}),
    ...(displayName ? { display_name: displayName } : {}),
  }
}

function parseTransactionType(value: unknown, issues: Issue[]): TransactionType | undefined {
  if (value === undefined) {
    issues.push(issue(
      ['transaction_type'],
      'Ask whether this is a group transaction or personal transaction before submitting.',
      'NEEDS_CLARIFICATION',
    ))
    return undefined
  }
  if (value === 'personal') {
    issues.push(issue(
      ['transaction_type'],
      'Personal/1-on-1 agent-created transactions are not supported yet. Ask the user to use FairPay manually or choose a group.',
      'UNSUPPORTED_PERSONAL_TRANSACTION',
    ))
    return 'personal'
  }
  if (value !== 'group') {
    issues.push(issue(['transaction_type'], 'transaction_type must be "group" or "personal"'))
    return undefined
  }
  return 'group'
}

export const ExternalAgentSubmissionRequest = {
  safeParse(input: unknown): ParseResult<ExternalAgentSubmission> {
    const issues: Issue[] = []

    if (!isObject(input)) {
      return { success: false, error: { issues: [issue([], 'Body must be an object')] } }
    }

    const allowed = new Set([
      'target_email',
      'target_name',
      'actor_confirmed',
      'transaction_type',
      'group_id',
      'group_name',
      'source',
      'description',
      'amount',
      'currency',
      'category',
      'expense_date',
      'comment',
      'payer',
      'split_method',
      'participants',
    ])

    for (const key of Object.keys(input)) {
      if (!allowed.has(key)) issues.push(issue([key], 'Unknown field'))
    }

    const targetEmail = normalizeEmail(input.target_email)
    if (!targetEmail) issues.push(issue(['target_email'], 'Invalid target_email'))

    const targetName = normalizeText(input.target_name, 200)
    if (input.target_name !== undefined && !targetName) {
      issues.push(issue(['target_name'], 'Invalid target_name'))
    }

    if (input.actor_confirmed !== true) {
      issues.push(issue(
        ['actor_confirmed'],
        'Ask the user to confirm their FairPay name/email before submitting. For example: "Bạn có phải là người này/email này không?"',
        'NEEDS_CLARIFICATION',
      ))
    }

    const transactionType = parseTransactionType(input.transaction_type, issues)

    const groupId = input.group_id === undefined ? undefined : normalizeText(input.group_id, 64)
    if (groupId && !UUID_RE.test(groupId)) issues.push(issue(['group_id'], 'Invalid group_id'))

    const groupName = normalizeText(input.group_name, 200)
    if (input.group_name !== undefined && !groupName) issues.push(issue(['group_name'], 'Invalid group_name'))
    if (transactionType === 'group' && !groupId && !groupName) {
      issues.push(issue(
        ['group_id'],
        'Ask which FairPay group this expense belongs to before submitting.',
        'NEEDS_CLARIFICATION',
      ))
    }

    const source = normalizeText(input.source, 100)
    const description = normalizeText(input.description, 200)
    if (!description) issues.push(issue(['description'], 'Description is required'))

    const amount = parseAmount(input.amount)
    if (!amount) issues.push(issue(['amount'], 'Invalid integer VND amount'))

    const currency = input.currency
    if (currency !== 'VND') issues.push(issue(['currency'], 'Only VND is supported'))

    const category = input.category
    if (category !== undefined && (typeof category !== 'string' || !CATEGORIES.has(category))) {
      issues.push(issue(['category'], 'Unsupported category'))
    }

    const expenseDate = input.expense_date
    if (expenseDate !== undefined && (typeof expenseDate !== 'string' || !isRealDate(expenseDate))) {
      issues.push(issue(['expense_date'], 'expense_date must be YYYY-MM-DD'))
    }

    const comment = input.comment
    if (comment !== undefined && comment !== null && (typeof comment !== 'string' || comment.length > 1000)) {
      issues.push(issue(['comment'], 'Invalid comment'))
    }

    const payer = parseActor(input.payer, 'payer', issues)

    const splitMethod = input.split_method
    if (!['equal', 'exact', 'fixed_then_equal_remainder'].includes(String(splitMethod))) {
      issues.push(issue(['split_method'], 'Unsupported split_method'))
    }

    const participants: Participant[] = []
    if (!Array.isArray(input.participants) || input.participants.length < 1 || input.participants.length > 100) {
      issues.push(issue(['participants'], 'participants must contain 1 to 100 entries'))
    } else {
      input.participants.forEach((raw, index) => {
        const actor = parseActor(raw, `participants.${index}`, issues, ['amount', 'fixed_amount'])
        if (!isObject(raw) || !actor) return

        const amountValue = raw.amount === undefined ? undefined : parseAmount(raw.amount)
        const fixedAmount = raw.fixed_amount === undefined ? undefined : parseAmount(raw.fixed_amount)

        if (raw.amount !== undefined && !amountValue) {
          issues.push(issue(['participants', index, 'amount'], 'Invalid amount'))
        }
        if (raw.fixed_amount !== undefined && !fixedAmount) {
          issues.push(issue(['participants', index, 'fixed_amount'], 'Invalid fixed_amount'))
        }

        participants.push({
          ...actor,
          ...(amountValue ? { amount: amountValue } : {}),
          ...(fixedAmount ? { fixed_amount: fixedAmount } : {}),
        })
      })
    }

    const identities = participants.map((participant) => (
      participant.email ? `email:${participant.email}` : `name:${participant.display_name?.toLowerCase()}`
    ))
    if (new Set(identities).size !== identities.length) {
      issues.push(issue(['participants'], 'Duplicate participant identity is not allowed'))
    }

    const hasAmount = participants.some((participant) => participant.amount !== undefined)
    const hasFixedAmount = participants.some((participant) => participant.fixed_amount !== undefined)
    if (splitMethod === 'equal' && (hasAmount || hasFixedAmount)) {
      issues.push(issue(['participants'], 'Equal split does not accept amount or fixed_amount'))
    }

    if (splitMethod === 'exact') {
      if (hasFixedAmount || participants.some((participant) => participant.amount === undefined)) {
        issues.push(issue(['participants'], 'Exact split requires amount for every participant'))
      } else if (amount !== undefined) {
        const participantSum = participants.reduce((sum, participant) => sum + (participant.amount ?? 0), 0)
        if (participantSum !== amount) {
          issues.push(issue(
            ['participants'],
            `Sum of participant amounts (${participantSum}) must equal total amount (${amount})`,
          ))
        }
      }
    }

    if (splitMethod === 'fixed_then_equal_remainder' && hasAmount) {
      issues.push(issue(['participants'], 'Fixed remainder split uses fixed_amount, not amount'))
    }

    if (issues.length > 0 || !targetEmail || transactionType !== 'group' || !description || !amount || !payer) {
      return { success: false, error: { issues } }
    }

    return {
      success: true,
      data: {
        target_email: targetEmail,
        ...(targetName ? { target_name: targetName } : {}),
        actor_confirmed: true,
        transaction_type: 'group',
        ...(groupId ? { group_id: groupId } : {}),
        ...(groupName ? { group_name: groupName } : {}),
        ...(source ? { source } : {}),
        description,
        amount,
        currency: 'VND',
        ...(category ? { category } : {}),
        ...(expenseDate ? { expense_date: expenseDate } : {}),
        ...(comment !== undefined ? { comment: comment as string | null } : {}),
        payer,
        split_method: splitMethod as ExternalAgentSubmission['split_method'],
        participants,
      },
    }
  },
}
