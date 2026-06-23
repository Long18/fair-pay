// Pure policies for Phase 1A: actor must be a member, group must be active,
// payer and participants must be current members, currency must be VND.

export type PolicyError =
  | { code: 'NOT_GROUP_MEMBER'; message: string }
  | { code: 'GROUP_ARCHIVED'; message: string }
  | { code: 'CURRENCY_NOT_VND'; message: string }
  | { code: 'PAYER_NOT_IN_GROUP'; message: string }
  | { code: 'PARTICIPANT_NOT_IN_GROUP'; message: string; participant: string }
  | { code: 'PENDING_EMAIL_NOT_ALLOWED'; message: string }

export class PolicyViolation extends Error {
  readonly code: PolicyError['code']
  readonly details?: Record<string, unknown>
  constructor(err: PolicyError) {
    super(err.message)
    this.code = err.code
    this.details = err as unknown as Record<string, unknown>
    this.name = 'PolicyViolation'
  }
}

export function assertVnd(currency: string | undefined): void {
  if (currency && currency.toUpperCase() !== 'VND') {
    throw new PolicyViolation({
      code: 'CURRENCY_NOT_VND',
      message: 'Phase 1A only supports VND currency',
    })
  }
}

export function assertGroupActive(group: { is_archived: boolean }): void {
  if (group.is_archived) {
    throw new PolicyViolation({
      code: 'GROUP_ARCHIVED',
      message: 'Group is archived; agent expense creation is disabled',
    })
  }
}

export function assertActorIsGroupMember(
  actorId: string,
  members: ReadonlyArray<{ user_id: string }>
): void {
  if (!members.some((m) => m.user_id === actorId)) {
    throw new PolicyViolation({
      code: 'NOT_GROUP_MEMBER',
      message: 'Actor is not a member of this group',
    })
  }
}

export function assertNoPendingEmailParticipants(
  participants: ReadonlyArray<{ user_id: string | null }>
): void {
  if (participants.some((p) => !p.user_id)) {
    throw new PolicyViolation({
      code: 'PENDING_EMAIL_NOT_ALLOWED',
      message: 'Phase 1A does not support pending-email participants',
    })
  }
}

export function assertPayerIsCurrentMember(
  payerMemberId: string,
  members: ReadonlyArray<{ id: string }>
): void {
  if (!members.some((m) => m.id === payerMemberId)) {
    throw new PolicyViolation({
      code: 'PAYER_NOT_IN_GROUP',
      message: 'Payer is not a current member of this group',
    })
  }
}

export function assertAllParticipantsAreCurrentMembers(
  participantMemberIds: readonly string[],
  members: ReadonlyArray<{ id: string }>
): void {
  const memberSet = new Set(members.map((m) => m.id))
  for (const pid of participantMemberIds) {
    if (!memberSet.has(pid)) {
      throw new PolicyViolation({
        code: 'PARTICIPANT_NOT_IN_GROUP',
        message: `Participant member_id ${pid} is not a current group member`,
        participant: pid,
      })
    }
  }
}
