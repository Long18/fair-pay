import { useState, useMemo, useEffect, useCallback } from "react";
import { useGetIdentity } from "@refinedev/core";
import { toast } from "sonner";

import { supabaseClient } from "@/utility/supabaseClient";
import { ExpenseForm } from "@/modules/expenses/components/expense-form";
import { ExpenseFormValues } from "@/modules/expenses/types";
import { type AttachmentFile } from "@/modules/expenses/components/attachment-upload";
import { useAttachments } from "@/modules/expenses/hooks/use-attachments";
import { useCreateRecurringExpense } from "@/modules/expenses/hooks/use-recurring-expenses";
import { Profile } from "@/modules/profile/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2Icon, UsersIcon, UserIcon } from "@/components/ui/icons";
import { useHaptics } from "@/hooks/use-haptics";
import { useAdminTranslation } from "../i18n";

interface GroupOption {
  id: string;
  name: string;
}

interface FriendshipOption {
  id: string;
  user_a: string;
  user_b: string;
  user_a_name: string;
  user_b_name: string;
}

interface MemberOption {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface AdminCreateExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AdminCreateExpenseDialog({
  open,
  onOpenChange,
  onSuccess,
}: AdminCreateExpenseDialogProps) {
  const { tAdmin } = useAdminTranslation();
  const { data: identity } = useGetIdentity<Profile>();
  const { tap, success } = useHaptics();

  const [contextType, setContextType] = useState<"group" | "friend">("group");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [selectedFriendshipId, setSelectedFriendshipId] = useState<string>("");

  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [friendships, setFriendships] = useState<FriendshipOption[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [loadingContext, setLoadingContext] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const { uploadAttachments } = useAttachments();
  const { createRecurring } = useCreateRecurringExpense();

  // Load groups and friendships when dialog opens
  useEffect(() => {
    if (!open) {
      setContextType("group");
      setSelectedGroupId("");
      setSelectedFriendshipId("");
      setMembers([]);
      setAttachments([]);
      return;
    }

    Promise.all([
      supabaseClient.from("groups").select("id, name").order("name"),
      supabaseClient
        .from("friendships")
        .select(
          "id, user_a, user_b, user_a_profile:profiles!user_a(full_name), user_b_profile:profiles!user_b(full_name)"
        )
        .eq("status", "accepted")
        .order("created_at", { ascending: false }),
    ]).then(([groupsRes, friendshipsRes]) => {
      if (groupsRes.data) setGroups(groupsRes.data);
      if (friendshipsRes.data) {
        setFriendships(
          friendshipsRes.data.map((f: any) => ({
            id: f.id,
            user_a: f.user_a,
            user_b: f.user_b,
            user_a_name: f.user_a_profile?.full_name ?? tAdmin("common.unknown"),
            user_b_name: f.user_b_profile?.full_name ?? tAdmin("common.unknown"),
          }))
        );
      }
    });
  }, [open, tAdmin]);

  // Load members when context changes
  useEffect(() => {
    if (contextType === "group" && selectedGroupId) {
      setLoadingContext(true);
      supabaseClient
        .from("group_members")
        .select("*, profiles!user_id(id, full_name, avatar_url)")
        .eq("group_id", selectedGroupId)
        .then(({ data, error }) => {
          if (!error && data) {
            setMembers(
              data.map((m: any) => ({
                id: m.profiles.id,
                full_name: m.profiles.full_name,
                avatar_url: m.profiles.avatar_url || null,
              }))
            );
          }
          setLoadingContext(false);
        });
    } else if (contextType === "friend" && selectedFriendshipId) {
      const friendship = friendships.find(
        (f) => f.id === selectedFriendshipId
      );
      if (friendship) {
        setLoadingContext(true);
        supabaseClient
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", [friendship.user_a, friendship.user_b])
          .then(({ data, error }) => {
            if (!error && data) {
              setMembers(
                data.map((p: any) => ({
                  id: p.id,
                  full_name: p.full_name,
                  avatar_url: p.avatar_url || null,
                }))
              );
            }
            setLoadingContext(false);
          });
      }
    } else {
      setMembers([]);
    }
  }, [contextType, selectedGroupId, selectedFriendshipId, friendships]);

  const contextReady =
    (contextType === "group" && selectedGroupId && members.length > 0) ||
    (contextType === "friend" && selectedFriendshipId && members.length > 0);

  // Use first member as default payer (admin can change in form)
  const defaultPaidBy = members[0]?.id ?? "";

  const handleSubmit = useCallback(
    async (values: ExpenseFormValues) => {
      if (!identity?.id) return;
      setIsSubmitting(true);

      try {
        const { splits, is_recurring, recurring, split_method, is_loan, ...expenseData } = values;

        const expensePayload = {
          ...expenseData,
          context_type: contextType,
          group_id: contextType === "group" ? selectedGroupId : null,
          friendship_id: contextType === "friend" ? selectedFriendshipId : null,
          created_by: identity.id,
        };

        const { data: expense, error: expenseError } = await supabaseClient
          .from("expenses")
          .insert(expensePayload)
          .select("id")
          .single();

        if (expenseError || !expense) {
          throw new Error(expenseError?.message ?? "Failed to create expense");
        }

        // Create splits (same logic as Client)
        const validSplits = splits.filter(
          (s) => (s.user_id || s.pending_email) && s.computed_amount != null
        );

        if (validSplits.length === 0) {
          throw new Error("No valid splits to create");
        }

        const splitPromises = validSplits.map((split) => {
          const isPayer =
            !!split.user_id && split.user_id === values.paid_by_user_id;
          return supabaseClient.from("expense_splits").insert({
            expense_id: expense.id,
            user_id: split.user_id || null,
            pending_email: split.pending_email || null,
            split_method: values.split_method,
            split_value: split.split_value ?? null,
            computed_amount: split.computed_amount,
            is_settled: isPayer,
            is_claimed: !split.pending_email,
            settled_amount: isPayer ? split.computed_amount : 0,
            settled_at: isPayer ? new Date().toISOString() : null,
          });
        });

        const splitResults = await Promise.all(splitPromises);
        const splitErrors = splitResults.filter((r) => r.error);
        if (splitErrors.length > 0) {
          throw new Error(
            `Failed to create ${splitErrors.length} split(s): ${splitErrors[0].error?.message}`
          );
        }

        // Upload attachments if any (same as Client)
        if (attachments.length > 0 && identity?.id) {
          const files = attachments.map((a) => a.file);
          await uploadAttachments(files, expense.id, identity.id);
        }

        // Create recurring expense if requested (same as Client)
        if (is_recurring && recurring) {
          try {
            const ctxType = contextType;
            const ctxId = selectedGroupId || selectedFriendshipId;
            await createRecurring(expense.id, recurring, ctxType, ctxId);
            toast.success(tAdmin("transactions.expenses.createdWithRecurring"));
          } catch {
            toast.error(tAdmin("transactions.expenses.recurringCreateFailed"));
          }
        } else {
          toast.success(tAdmin("transactions.expenses.created"));
        }

        success();
        onOpenChange(false);
        onSuccess();
      } catch (err: any) {
        toast.error(tAdmin("common.errorWithMessage", { message: err.message ?? tAdmin("transactions.expenses.create") }));
      } finally {
        setIsSubmitting(false);
      }
    },
    [identity, contextType, selectedGroupId, selectedFriendshipId, attachments, uploadAttachments, createRecurring, onOpenChange, onSuccess, tAdmin]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px] max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle>{tAdmin("transactions.expenses.createAdminTitle")}</DialogTitle>
          <DialogDescription>
            {tAdmin("transactions.expenses.createAdminDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Context Selection - Admin-only: pick group or friendship */}
          <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs">
                Admin
              </Badge>
              <span className="text-sm font-medium">{tAdmin("transactions.expenses.chooseContext")}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  tap();
                  setContextType("group");
                  setSelectedFriendshipId("");
                  setMembers([]);
                }}
                className={`flex items-center gap-2 rounded-lg border-2 p-3 text-sm font-medium transition-colors ${
                  contextType === "group"
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:bg-accent"
                }`}
              >
                <UsersIcon className="h-4 w-4" />
                {tAdmin("context.group")}
              </button>
              <button
                type="button"
                onClick={() => {
                  tap();
                  setContextType("friend");
                  setSelectedGroupId("");
                  setMembers([]);
                }}
                className={`flex items-center gap-2 rounded-lg border-2 p-3 text-sm font-medium transition-colors ${
                  contextType === "friend"
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:bg-accent"
                }`}
              >
                <UserIcon className="h-4 w-4" />
                {tAdmin("context.friends")}
              </button>
            </div>

            {contextType === "group" ? (
              <div className="space-y-2">
                <Label>{tAdmin("people.selectGroup")}</Label>
                <Select value={selectedGroupId} onValueChange={(v) => { tap(); setSelectedGroupId(v); }}>
                  <SelectTrigger>
                    <SelectValue placeholder={tAdmin("people.selectGroupPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>{tAdmin("transactions.expenses.selectFriendship")}</Label>
                <Select
                  value={selectedFriendshipId}
                  onValueChange={(v) => { tap(); setSelectedFriendshipId(v); }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={tAdmin("transactions.expenses.selectFriendshipPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {friendships.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.user_a_name} ↔ {f.user_b_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {loadingContext && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2Icon className="h-4 w-4 animate-spin" />
                {tAdmin("transactions.expenses.loadingMembers")}
              </div>
            )}
          </div>

          {/* Expense Form - same as Client */}
          {contextReady && defaultPaidBy ? (
            <ExpenseForm
              groupId={contextType === "group" ? selectedGroupId : undefined}
              members={members}
              currentUserId={defaultPaidBy}
              onSubmit={handleSubmit}
              isLoading={isSubmitting}
              attachments={attachments}
              onAttachmentsChange={setAttachments}
            />
          ) : (
            !loadingContext && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {tAdmin("transactions.expenses.selectContextHint")}
              </div>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
