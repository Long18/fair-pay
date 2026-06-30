import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useGetIdentity } from "@refinedev/core";
import { toast } from "sonner";
import { supabaseClient } from "@/utility/supabaseClient";

// Typed shim for RPC calls not yet reflected in the generated Database schema.
// .bind() preserves the supabaseClient `this` context that the rpc method requires.
// Using `unknown` (not `any`) keeps downstream callers explicit about shapes.
const rpc = supabaseClient.rpc.bind(supabaseClient) as unknown as (
  fn: string,
  args?: Record<string, unknown>
) => PromiseLike<{ data: unknown; error: Error | null }>;
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InboxIcon, CheckCircleIcon, XIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { FloatingActionStack, FloatingPill } from "@/components/ui/floating-stack";

type SubmissionPayload = {
  description: string;
  amount: number;
  currency?: "VND";
  category?: string;
  expense_date?: string;
  comment?: string | null;
  split_method: "equal" | "exact" | "fixed_then_equal_remainder";
  payer: { email?: string; display_name?: string };
  participants: Array<{
    email?: string;
    display_name?: string;
    amount?: number;
    fixed_amount?: number;
  }>;
};

type ExternalAgentSubmission = {
  submission_id: string;
  target_email: string;
  group_id: string | null;
  group_name: string | null;
  source: string;
  status: string;
  payload: SubmissionPayload;
  visibility: "target_email" | "group_admin";
  duplicate_warnings: unknown[];
  created_at: string;
  expires_at: string;
};

const formatVnd = (amount: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);

async function listSubmissions(): Promise<ExternalAgentSubmission[]> {
  const { data, error } = await rpc("list_external_agent_submissions");
  if (error) throw error;
  return (data ?? []) as ExternalAgentSubmission[];
}

async function approveSubmission(submissionId: string) {
  const { data, error } = await rpc("approve_external_agent_submission", {
    p_submission_id: submissionId,
  });
  if (error) throw error;
  return data as { expense_id: string; splits_count: number };
}

async function rejectSubmission(submissionId: string, reason?: string) {
  const { data, error } = await rpc("reject_external_agent_submission", {
    p_submission_id: submissionId,
    p_reason: reason ?? "Rejected in FairPay",
  });
  if (error) throw error;
  return data as { submission_id: string; status: string };
}

function actorLabel(actor: { email?: string; display_name?: string }) {
  return actor.display_name || actor.email || "Unresolved";
}

const approvalErrorMessages: Record<string, string> = {
  GROUP_UNRESOLVED: "FairPay could not find a matching group for the target email. Ask the agent to resubmit with the exact group name.",
  GROUP_AMBIGUOUS: "More than one matching group was found. Ask the agent to resubmit with a clearer group name.",
  GROUP_NOT_ACCESSIBLE: "This account cannot approve the proposal for that group. Confirm the target email and group membership.",
  SUBMISSION_NOT_ACCESSIBLE: "This submission is not visible to your FairPay account.",
  SUBMISSION_NOT_FOUND: "This submission no longer exists.",
  SUBMISSION_NOT_PENDING: "This submission was already handled.",
  SUBMISSION_EXPIRED: "This submission expired. Ask the agent to submit it again.",
  PAYER_UNRESOLVED: "FairPay could not match the payer to a current group member. Ask the agent to use the payer email.",
  PAYER_AMBIGUOUS: "The payer matched multiple members. Ask the agent to use the exact email.",
  PARTICIPANT_UNRESOLVED: "FairPay could not match one participant to a current group member. Ask the agent to use participant emails.",
  PARTICIPANT_AMBIGUOUS: "A participant matched multiple group members. Ask the agent to use exact emails.",
  PARTICIPANT_NOT_IN_GROUP: "One participant is not a current member of this group. Ask them to join the group or remove them.",
  NOT_GROUP_MEMBER: "The target FairPay user is not a current member of this group.",
  NEEDS_CLARIFICATION: "The agent must confirm the user email, group-vs-personal type, and group before submitting.",
  UNSUPPORTED_PERSONAL_TRANSACTION: "Personal/1-on-1 agent-created transactions are not supported yet.",
  NO_PARTICIPANTS: "No valid participants were found for this submission.",
  DUPLICATE_PARTICIPANT: "The same participant appears more than once.",
  SPLIT_SUM_MISMATCH: "The participant split amounts do not add up to the expense amount.",
  DUPLICATE_EXPENSE: "FairPay found a likely duplicate expense.",
};

function submissionErrorMessage(error: unknown, fallback: string) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof error.message === "string"
      ? error.message
      : String(error || fallback);

  return approvalErrorMessages[message] ?? message;
}

export function ExternalAgentSubmissionInbox() {
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Only run for authenticated users — unauthenticated visitors would get 401s.
  const { data: identity } = useGetIdentity();
  const isAuthenticated = !!identity;

  // Live updates: subscribe to new external agent submissions so the inbox
  // appears without requiring the user to refocus the tab or manually refresh.
  useEffect(() => {
    if (!isAuthenticated) return;

    const channel = supabaseClient
      .channel("inbox:external-agent-submissions-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "external_agent_submissions" },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["external-agent-submissions"] });
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [isAuthenticated, queryClient]);

  const { data = [], isLoading } = useQuery({
    queryKey: ["external-agent-submissions"],
    queryFn: listSubmissions,
    enabled: isAuthenticated,   // never fires for unauthenticated visitors
    refetchInterval: 30_000,    // fallback poll for realtime misses
    refetchOnWindowFocus: true,
  });

  const submissions = useMemo(
    () => data.filter((submission) => submission.status === "pending"),
    [data],
  );
  const clientSubmissions = useMemo(
    () => submissions.filter((submission) => submission.visibility === "target_email"),
    [submissions],
  );
  const adminSubmissions = useMemo(
    () => submissions.filter((submission) => submission.visibility === "group_admin"),
    [submissions],
  );

  const approve = useMutation({
    mutationFn: approveSubmission,
    onSuccess: () => {
      toast.success("Agent submission approved and expense created");
      void queryClient.invalidateQueries({ queryKey: ["external-agent-submissions"] });
      void queryClient.invalidateQueries({ queryKey: ["expenses"] });
      void queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
    onError: (error) => {
      toast.error(submissionErrorMessage(error, "Failed to approve submission"));
    },
    onSettled: () => setActiveId(null),
  });

  const reject = useMutation({
    mutationFn: (submissionId: string) => rejectSubmission(submissionId),
    onSuccess: () => {
      toast.success("Agent submission rejected");
      void queryClient.invalidateQueries({ queryKey: ["external-agent-submissions"] });
    },
    onError: (error) => {
      toast.error(submissionErrorMessage(error, "Failed to reject submission"));
    },
    onSettled: () => setActiveId(null),
  });

  const pendingCount = submissions.length;
  const open = !dismissed && !isLoading && pendingCount > 0;
  const showLauncher = dismissed && !isLoading && pendingCount > 0;

  return (
    <>
      {showLauncher && (
        <FloatingActionStack
          side="right"
          trigger={
            <FloatingPill
              icon={<InboxIcon className="h-4 w-4" />}
              label="Agent submissions"
              badge={pendingCount}
              onClick={() => setDismissed(false)}
              ariaLabel={`Review ${pendingCount} pending agent submissions`}
            />
          }
        />
      )}

      <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && setDismissed(true)}>
        <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <InboxIcon size={18} />
            Agent submissions pending approval
          </DialogTitle>
          <DialogDescription>
            External agents can only queue proposals. Review and approve inside FairPay before any
            expense is created.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border bg-muted/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Client confirmations</p>
              <Badge variant={clientSubmissions.length > 0 ? "default" : "secondary"}>
                {clientSubmissions.length}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Proposals submitted for your email. Approving creates the expense as your in-app
              decision.
            </p>
          </div>
          <div className="rounded-lg border bg-muted/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Admin approvals</p>
              <Badge variant={adminSubmissions.length > 0 ? "default" : "secondary"}>
                {adminSubmissions.length}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Group-admin queue for submissions involving groups you administer.
            </p>
          </div>
        </div>

        <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
          {submissions.map((submission) => {
            const payload = submission.payload;
            const busy = activeId === submission.submission_id;
            return (
              <div
                key={submission.submission_id}
                className={cn(
                  "rounded-lg border bg-card p-4 text-sm shadow-sm",
                  busy && "opacity-70",
                )}
              >
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{payload.description}</h3>
                    <p className="text-xs text-muted-foreground">
                      {submission.group_name || submission.group_id || "Group pending resolution"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline">{submission.source}</Badge>
                    <Badge variant="secondary">
                      {submission.visibility === "group_admin" ? "Group admin" : "Your email"}
                    </Badge>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-md bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="font-medium">{formatVnd(payload.amount)}</p>
                  </div>
                  <div className="rounded-md bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Paid by</p>
                    <p className="font-medium">{actorLabel(payload.payer)}</p>
                  </div>
                  <div className="rounded-md bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="font-medium">{payload.expense_date || "Today on approval"}</p>
                  </div>
                  <div className="rounded-md bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Split</p>
                    <p className="font-medium">{payload.split_method.replace(/_/g, " ")}</p>
                  </div>
                </div>

                <div className="mt-3">
                  <p className="mb-1 text-xs text-muted-foreground">Participants to resolve</p>
                  <div className="space-y-1">
                    {payload.participants.map((participant, index) => (
                      <div
                        key={`${participant.email ?? participant.display_name}-${index}`}
                        className="flex justify-between gap-3 text-xs"
                      >
                        <span>{actorLabel(participant)}</span>
                        <span className="text-muted-foreground">
                          {participant.amount
                            ? formatVnd(participant.amount)
                            : participant.fixed_amount
                            ? `${formatVnd(participant.fixed_amount)} fixed`
                            : "auto"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {submission.duplicate_warnings.length > 0 && (
                  <div className="mt-3 rounded-md bg-yellow-50 p-2 text-xs text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
                    {submission.duplicate_warnings.length} potential duplicate warning(s)
                  </div>
                )}

                {payload.comment && (
                  <p className="mt-3 text-xs italic text-muted-foreground">
                    &ldquo;{payload.comment}&rdquo;
                  </p>
                )}

                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => {
                      setActiveId(submission.submission_id);
                      reject.mutate(submission.submission_id);
                    }}
                  >
                    <XIcon size={14} />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => {
                      setActiveId(submission.submission_id);
                      approve.mutate(submission.submission_id);
                    }}
                  >
                    <CheckCircleIcon size={14} />
                    Approve
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setDismissed(true)}>
            View later
          </Button>
        </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ExternalAgentSubmissionInbox;
