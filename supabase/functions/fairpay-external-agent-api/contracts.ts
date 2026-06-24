// Public contracts for no-key external agent submissions.
// Keep this dependency-free so the public Edge Function cannot fail on remote imports.

type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: { issues: Array<{ path: Array<string | number>; message: string }> } }

type ActorRef = {
  email?: string
  display_name?: string
}

type Participant = ActorRef & {
  amount?: number
  fixed_amount?: number
}

type ExternalAgentSubmission = {
  target_email: string
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

function issue(path: Array<string | number>, message: string) {
  return { path, message }
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
  return text.length > 0 && text.length <= max ? text : undefined
}

function parseAmount(value: unknown): number | undefined {
  return Number.isInteger(value) && value > 0 && value <= 9_999_999_999 ? value : undefined
}

function validDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

function parseActor(value: unknown, path: string, issues: Array<{ path: Array<string | number>; message: string }>): ActorRef | null {
  if (!isObject(value)) {
    issues.push(issue([path], 'Actor must be an object'))
    return null
  }
  const allowed = new Set(['email', 'display_name'])
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) issues.push(issue([path, key], 'Unknown field'))
  }
  const email = value.email === undefined ? undefined : normalizeEmail(value.email)
  const displayName = value.display_name === undefined ? undefined : normalizeText(value.display_name, 200)
  if (value.email !== undefined && !email) issues.push(issue([path, 'email'], 'Invalid email'))
  if (value.display_name !== undefined && !displayName) {
    issues.push(issue([path, 'display_name'], 'Invalid display_name'))
  }
  if (!email && !displayName) issues.push(issue([path], 'Either email or display_name is required'))
  return { ...(email ? { email } : {}), ...(displayName ? { display_name: displayName } : {}) }
}

export const ExternalAgentSubmissionRequest = {
  safeParse(input: unknown): ParseResult<ExternalAgentSubmission> {
    const issues: Array<{ path: Array<string | number>; message: string }> = []
    if (!isObject(input)) {
      return { success: false, error: { issues: [issue([], 'Request body must be an object')] } }
    }

    const allowed = new Set([
      'target_email',
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

    const groupId = input.group_id === undefined ? undefined : String(input.group_id).trim()
    if (groupId && !UUID_RE.test(groupId)) issues.push(issue(['group_id'], 'Invalid group_id'))
    const groupName = input.group_name === undefined ? undefined : normalizeText(input.group_name, 200)
    if (!groupId && !groupName) issues.push(issue(['group_id'], 'Either group_id or group_name is required'))

    const source = input.source === undefined ? undefined : normalizeText(input.source, 100)
    const description = normalizeText(input.description, 200)
    if (!description) issues.push(issue(['description'], 'Invalid description'))
    const amount = parseAmount(input.amount)
    if (!amount) issues.push(issue(['amount'], 'Invalid integer VND amount'))
    const currency = input.currency === undefined ? 'VND' : input.currency
    if (currency !== 'VND') issues.push(issue(['currency'], 'Only VND is supported'))
    const category = input.category === undefined ? undefined : String(input.category)
    if (category && !CATEGORIES.has(category)) issues.push(issue(['category'], 'Invalid category'))
    const expenseDate = input.expense_date === undefined ? undefined : String(input.expense_date)
    if (expenseDate && !validDate(expenseDate)) issues.push(issue(['expense_date'], 'Invalid expense_date'))
    const comment =
      input.comment === undefined || input.comment === null ? input.comment : normalizeText(input.comment, 1000)
    if (input.comment !== undefined && input.comment !== null && !comment) {
      issues.push(issue(['comment'], 'Invalid comment'))
    }

    const payer = parseActor(input.payer, 'payer', issues)
    const splitMethod = input.split_method
    if (!['equal', 'exact', 'fixed_then_equal_remainder'].includes(String(splitMethod))) {
      issues.push(issue(['split_method'], 'Invalid split_method'))
    }

    const participants: Participant[] = []
    if (!Array.isArray(input.participants) || input.participants.length === 0 || input.participants.length > 100) {
      issues.push(issue(['participants'], 'participants must contain 1 to 100 entries'))
    } else {
      input.participants.forEach((raw, index) => {
        const actor = parseActor(raw, `participants.${index}`, issues)
        if (!isObject(raw) || !actor) return
        const amountValue = raw.amount === undefined ? undefined : parseAmount(raw.amount)
        const fixedAmount = raw.fixed_amount === undefined ? undefined : parseAmount(raw.fixed_amount)
        if (raw.amount !== undefined && !amountValue) issues.push(issue(['participants', index, 'amount'], 'Invalid amount'))
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

    const identities = participants.map((participant) =>
      participant.email ? `email:${participant.email}` : `name:${participant.display_name?.toLowerCase()}`,
    )
    if (new Set(identities).size !== identities.length) {
      issues.push(issue(['participants'], 'Duplicate participant identity is not allowed'))
    }

    const hasAmount = participants.some((participant) => participant.amount !== undefined)
    const hasFixedAmount = participants.some((participant) => participant.fixed_amount !== undefined)
    if (splitMethod === 'equal' && (hasAmount || hasFixedAmount)) {
      issues.push(issue(['participants'], 'Equal split does not accept amount or fixed_amount'))
    }
    if (splitMethod === 'exact' && (hasFixedAmount || participants.some((participant) => participant.amount === undefined))) {
      issues.push(issue(['participants'], 'Exact split requires amount for every participant'))
    }
    if (splitMethod === 'fixed_then_equal_remainder' && hasAmount) {
      issues.push(issue(['participants'], 'Fixed remainder split uses fixed_amount, not amount'))
    }

    if (issues.length > 0 || !targetEmail || !description || !amount || !payer) {
      return { success: false, error: { issues } }
    }

    return {
      success: true,
      data: {
        target_email: targetEmail,
        ...(groupId ? { group_id: groupId } : {}),
        ...(groupName ? { group_name: groupName } : {}),
        ...(source ? { source } : {}),
        description,
        amount,
        currency: 'VND',
        ...(category ? { category } : {}),
        ...(expenseDate ? { expense_date: expenseDate } : {}),
        ...(comment !== undefined ? { comment } : {}),
        payer,
        split_method: splitMethod as ExternalAgentSubmission['split_method'],
        participants,
      },
    }
  },
}
