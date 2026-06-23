// Canonical Zod contracts for the Agent API v1.
// These schemas are the source of truth for both server validation and
// (transitively) the frontend client TypeScript types.
//
// Strict objects reject unknown fields. Money is integer VND.

import { z } from 'https://esm.sh/zod@3.23.8'

// -----------------------------------------------------------------------------
// Common primitives
// -----------------------------------------------------------------------------

export const Uuid = z.string().uuid()
export const Sha256Hex = z.string().regex(/^[0-9a-f]{64}$/, 'Expected a SHA-256 hex digest')

export const IntegerVnd = z
  .number()
  .int('Amount must be an integer (VND has no decimals)')
  .nonnegative('Amount must be non-negative')
  .max(9_999_999_999, 'Amount exceeds database limit')

export const PositiveIntegerVnd = IntegerVnd.refine((n) => n > 0, {
  message: 'Amount must be positive',
})

export const Currency = z.literal('VND')

export const DateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
  .refine((value) => {
    const [year, month, day] = value.split('-').map(Number)
    const date = new Date(Date.UTC(year, month - 1, day))
    return date.getUTCFullYear() === year
      && date.getUTCMonth() === month - 1
      && date.getUTCDate() === day
  }, 'Date must be a real calendar date')

export const SplitMethod = z.enum(['equal', 'exact', 'fixed_then_equal_remainder'])

// -----------------------------------------------------------------------------
// Read endpoints
// -----------------------------------------------------------------------------

export const MeResponse = z.object({
  user: z.object({
    id: Uuid,
    email: z.string().email(),
    full_name: z.string(),
    avatar_url: z.string().nullable(),
  }),
})

export const GroupSummary = z.object({
  id: Uuid,
  name: z.string(),
  description: z.string().nullable(),
  is_archived: z.boolean(),
  member_count: z.number().int().nonnegative(),
  member_role: z.enum(['admin', 'member']),
})

export const GroupsResponse = z.object({
  groups: z.array(GroupSummary),
})

export const GroupMember = z.object({
  member_id: Uuid,    // group_members.id
  user_id: Uuid,      // profiles.id (registered users only in Phase 1A)
  role: z.enum(['admin', 'member']),
  full_name: z.string(),
  email: z.string().email().nullable(),
  avatar_url: z.string().nullable(),
})

export const GroupMembersResponse = z.object({
  group_id: Uuid,
  members: z.array(GroupMember),
})

// -----------------------------------------------------------------------------
// Duplicate check
// -----------------------------------------------------------------------------

export const DuplicateCheckRequest = z
  .object({
    group_id: Uuid,
    description: z.string().trim().min(1).max(200),
    amount: PositiveIntegerVnd,
    payer_member_id: Uuid,
    expense_date: DateString.optional(),
    window_hours: z.number().int().positive().max(168).optional(),
  })
  .strict()

export const DuplicateCheckMatch = z.object({
  expense_id: Uuid,
  match_type: z.enum(['strong', 'likely']),
  reason: z.string(),
  description: z.string(),
  amount: IntegerVnd,
  expense_date: DateString,
  created_at: z.string(),
})

export const DuplicateCheckResponse = z.object({
  matches: z.array(DuplicateCheckMatch),
})

// -----------------------------------------------------------------------------
// Preview
// -----------------------------------------------------------------------------

const PreviewParticipant = z
  .object({
    member_id: Uuid,
    amount: PositiveIntegerVnd.optional(),       // 'exact' uses this
    fixed_amount: PositiveIntegerVnd.optional(), // 'fixed_then_equal_remainder' uses this
  })
  .strict()

export const PreviewRequest = z
  .object({
    group_id: Uuid,
    description: z.string().trim().min(1).max(200),
    amount: PositiveIntegerVnd,
    currency: Currency.default('VND'),
    category: z.enum([
      'Food & Drink', 'Transportation', 'Accommodation', 'Entertainment',
      'Shopping', 'Utilities', 'Healthcare', 'Education', 'Other',
    ]).optional(),
    expense_date: DateString.optional(),
    comment: z.string().max(1000).nullable().optional(),
    payer_member_id: Uuid,
    split_method: SplitMethod,
    participants: z.array(PreviewParticipant).min(1).max(100),
  })
  .strict()
  .superRefine((value, ctx) => {
    const ids = value.participants.map((participant) => participant.member_id)
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['participants'], message: 'Duplicate member_id is not allowed' })
    }

    const hasAmount = value.participants.some((participant) => participant.amount !== undefined)
    const hasFixed = value.participants.some((participant) => participant.fixed_amount !== undefined)
    if (value.split_method === 'equal' && (hasAmount || hasFixed)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['participants'], message: 'Equal split does not accept amount or fixed_amount' })
    }
    if (value.split_method === 'exact' && (hasFixed || value.participants.some((participant) => participant.amount === undefined))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['participants'], message: 'Exact split requires amount only for every participant' })
    }
    if (value.split_method === 'fixed_then_equal_remainder') {
      const fixedCount = value.participants.filter((participant) => participant.fixed_amount !== undefined).length
      if (hasAmount || fixedCount === 0 || fixedCount === value.participants.length) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['participants'], message: 'Fixed-then-equal requires at least one fixed and one remainder participant, and does not accept amount' })
      }
    }
  })

export const PreviewSplit = z.object({
  member_id: Uuid,
  user_id: Uuid,
  full_name: z.string(),
  amount: PositiveIntegerVnd,
})

export const PreviewResponse = z.object({
  preview_id: Uuid,
  preview_hash: Sha256Hex,
  operation_id: Uuid,
  expires_at: z.string(),
  preview: z.object({
    group_id: Uuid,
    group_name: z.string(),
    description: z.string(),
    amount: IntegerVnd,
    currency: Currency,
    category: z.string().nullable(),
    expense_date: DateString,
    comment: z.string().nullable(),
    payer: z.object({
      member_id: Uuid,
      user_id: Uuid,
      full_name: z.string(),
    }),
    requested_split_method: SplitMethod,
    splits: z.array(PreviewSplit),
    total_check: IntegerVnd, // sum of splits, must equal amount
  }),
  duplicate_warnings: z.array(DuplicateCheckMatch),
})

// -----------------------------------------------------------------------------
// Confirm
// -----------------------------------------------------------------------------

export const ConfirmRequest = z
  .object({
    preview_hash: Sha256Hex,
  })
  .strict()

export const ConfirmResponse = z.object({
  confirmation_id: Uuid,
  preview_id: Uuid,
  preview_hash: Sha256Hex,
  expires_at: z.string(),
})

// -----------------------------------------------------------------------------
// Commit
// -----------------------------------------------------------------------------

// STRICT — only these fields are allowed; unknown keys are rejected.
export const CommitRequest = z
  .object({
    preview_id: Uuid,
    preview_hash: Sha256Hex,
    confirmation_id: Uuid,
  })
  .strict()

export const CommitResponse = z.object({
  success: z.literal(true),
  expense_id: Uuid,
  preview_id: Uuid,
  operation_id: Uuid,
  total_amount: IntegerVnd,
  currency: Currency,
  splits_count: z.number().int().positive(),
})

// -----------------------------------------------------------------------------
// Operation status
// -----------------------------------------------------------------------------

export const OperationStatus = z.enum([
  'pending',
  'previewed',
  'confirmed',
  'committed',
  'failed',
  'expired',
])

export const OperationResponse = z.object({
  operation_id: Uuid,
  preview_id: Uuid.nullable(),
  status: OperationStatus,
  result: z.unknown().nullable(),
  error: z.unknown().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

// -----------------------------------------------------------------------------
// Error envelope
// -----------------------------------------------------------------------------

export const ErrorResponse = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
})

// -----------------------------------------------------------------------------
// Type exports
// -----------------------------------------------------------------------------

export type TMeResponse = z.infer<typeof MeResponse>
export type TGroupsResponse = z.infer<typeof GroupsResponse>
export type TGroupMembersResponse = z.infer<typeof GroupMembersResponse>
export type TDuplicateCheckRequest = z.infer<typeof DuplicateCheckRequest>
export type TDuplicateCheckResponse = z.infer<typeof DuplicateCheckResponse>
export type TPreviewRequest = z.infer<typeof PreviewRequest>
export type TPreviewResponse = z.infer<typeof PreviewResponse>
export type TConfirmRequest = z.infer<typeof ConfirmRequest>
export type TConfirmResponse = z.infer<typeof ConfirmResponse>
export type TCommitRequest = z.infer<typeof CommitRequest>
export type TCommitResponse = z.infer<typeof CommitResponse>
export type TOperationResponse = z.infer<typeof OperationResponse>
export type TErrorResponse = z.infer<typeof ErrorResponse>
