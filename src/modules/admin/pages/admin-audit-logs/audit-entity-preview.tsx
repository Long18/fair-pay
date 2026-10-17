import {
  createContext,
  useContext,
  useMemo,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { supabaseClient } from "@/utility/supabaseClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2Icon } from "@/components/ui/icons";
import { UserAvatar } from "@/components/user-display";
import { formatCurrency, formatDate } from "@/lib/locale-utils";
import { getCategoryMeta } from "@/modules/expenses/lib/categories";
import { cn } from "@/lib/utils";
import { useAdminTranslation } from "../../i18n";
import { AuditEntityDetailActions } from "./audit-entity-detail-actions";

export type AuditPreviewTarget =
  | { kind: "user"; id: string }
  | { kind: "group"; id: string }
  | { kind: "expense"; id: string };

type AuditEntityPreviewApi = {
  openUser: (id: string) => void;
  openGroup: (id: string) => void;
  openExpense: (id: string) => void;
};

const AuditEntityPreviewContext = createContext<AuditEntityPreviewApi | null>(null);

export function AuditEntityPreviewRoot({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<AuditPreviewTarget | null>(null);

  const api = useMemo<AuditEntityPreviewApi>(
    () => ({
      openUser: (id) => setTarget({ kind: "user", id }),
      openGroup: (id) => setTarget({ kind: "group", id }),
      openExpense: (id) => setTarget({ kind: "expense", id }),
    }),
    [],
  );

  return (
    <AuditEntityPreviewContext.Provider value={api}>
      {children}
      <AuditEntityPreviewModal target={target} onClose={() => setTarget(null)} />
    </AuditEntityPreviewContext.Provider>
  );
}

export function useAuditEntityPreview(): AuditEntityPreviewApi {
  const ctx = useContext(AuditEntityPreviewContext);
  if (!ctx) {
    throw new Error("useAuditEntityPreview must be used within AuditEntityPreviewRoot");
  }
  return ctx;
}

export function useOptionalAuditEntityPreview(): AuditEntityPreviewApi | null {
  return useContext(AuditEntityPreviewContext);
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

async function fetchUserPreview(id: string) {
  const [profileRes, emailRes] = await Promise.all([
    supabaseClient.from("profiles").select("id, full_name, avatar_url, created_at").eq("id", id).maybeSingle(),
    supabaseClient
      .from("user_emails")
      .select("email, is_primary")
      .eq("user_id", id)
      .order("is_primary", { ascending: false })
      .limit(3),
  ]);
  if (profileRes.error) throw profileRes.error;
  const primary = emailRes.data?.find((e) => e.is_primary)?.email ?? emailRes.data?.[0]?.email ?? null;
  return { profile: profileRes.data, email: primary };
}

async function fetchGroupPreview(id: string) {
  const [groupRes, countRes] = await Promise.all([
    supabaseClient
      .from("groups")
      .select("id, name, description, avatar_url, created_at")
      .eq("id", id)
      .maybeSingle(),
    supabaseClient
      .from("group_members")
      .select("id", { count: "exact", head: true })
      .eq("group_id", id),
  ]);
  if (groupRes.error) throw groupRes.error;
  return { group: groupRes.data, memberCount: countRes.count ?? null };
}

async function fetchExpensePreview(id: string) {
  const { data, error } = await supabaseClient
    .from("expenses")
    .select(
      "id, description, amount, currency, category, expense_date, context_type, group_id, created_at, profiles!expenses_paid_by_user_id_fkey(full_name), groups(name)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function AuditEntityPreviewModal({
  target,
  onClose,
}: {
  target: AuditPreviewTarget | null;
  onClose: () => void;
}) {
  const { tAdmin } = useAdminTranslation();
  const open = Boolean(target);

  const userQuery = useQuery({
    queryKey: ["audit-preview-user", target?.kind === "user" ? target.id : null],
    enabled: open && target?.kind === "user",
    queryFn: () => fetchUserPreview(target!.id),
  });

  const groupQuery = useQuery({
    queryKey: ["audit-preview-group", target?.kind === "group" ? target.id : null],
    enabled: open && target?.kind === "group",
    queryFn: () => fetchGroupPreview(target!.id),
  });

  const expenseQuery = useQuery({
    queryKey: ["audit-preview-expense", target?.kind === "expense" ? target.id : null],
    enabled: open && target?.kind === "expense",
    queryFn: () => fetchExpensePreview(target!.id),
  });

  const loading =
    (target?.kind === "user" && userQuery.isLoading) ||
    (target?.kind === "group" && groupQuery.isLoading) ||
    (target?.kind === "expense" && expenseQuery.isLoading);

  const notFound =
    !loading &&
    ((target?.kind === "user" && userQuery.isSuccess && !userQuery.data?.profile) ||
      (target?.kind === "group" && groupQuery.isSuccess && !groupQuery.data?.group) ||
      (target?.kind === "expense" && expenseQuery.isSuccess && !expenseQuery.data));

  const title = (() => {
    if (!target) return "";
    if (target.kind === "user") {
      return userQuery.data?.profile?.full_name ?? tAdmin("auditLogs.unknownUser");
    }
    if (target.kind === "group") {
      return groupQuery.data?.group?.name ?? tAdmin("auditLogs.unknownGroup");
    }
    return expenseQuery.data?.description ?? tAdmin("auditLogs.previewExpense");
  })();

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="truncate pr-6">{title}</DialogTitle>
          <DialogDescription className="sr-only">{tAdmin("auditLogs.previewClickHint")}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : null}

        {!loading && target?.kind === "user" && userQuery.data?.profile ? (
          <div className="flex items-center gap-3">
            <UserAvatar
              size="md"
              user={{
                full_name: userQuery.data.profile.full_name ?? "?",
                avatar_url: userQuery.data.profile.avatar_url,
              }}
            />
            <div className="min-w-0">
              <p className="font-medium truncate">{userQuery.data.profile.full_name}</p>
              {userQuery.data.email ? (
                <p className="text-sm text-muted-foreground truncate">{userQuery.data.email}</p>
              ) : null}
              <p className="text-xs text-muted-foreground mt-1">
                {formatDate(userQuery.data.profile.created_at)}
              </p>
            </div>
          </div>
        ) : null}

        {!loading && target?.kind === "group" && groupQuery.data?.group ? (
          <div className="flex items-start gap-3">
            <Avatar className="size-12">
              <AvatarImage src={groupQuery.data.group.avatar_url ?? undefined} alt={groupQuery.data.group.name} />
              <AvatarFallback>{initials(groupQuery.data.group.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-medium">{groupQuery.data.group.name}</p>
              {groupQuery.data.group.description ? (
                <p className="text-sm text-muted-foreground line-clamp-2">{groupQuery.data.group.description}</p>
              ) : null}
              {groupQuery.data.memberCount != null ? (
                <p className="text-xs text-muted-foreground mt-1">
                  {tAdmin("auditLogs.previewMemberCount", { count: groupQuery.data.memberCount })}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {!loading && target?.kind === "expense" && expenseQuery.data ? (
          (() => {
            const exp = expenseQuery.data;
            const cat = getCategoryMeta(exp.category);
            const CatIcon = cat.icon;
            const payer = (exp.profiles as { full_name?: string } | null)?.full_name;
            const groupName = (exp.groups as { name?: string } | null)?.name;
            return (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={cn("inline-flex size-9 items-center justify-center rounded-lg", cat.bgColor)}>
                    <CatIcon size={18} className={cat.color} aria-hidden />
                  </span>
                  <div>
                    <p className="text-lg font-semibold tabular-nums">
                      {formatCurrency(exp.amount ?? 0, exp.currency ?? undefined)}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(exp.expense_date)}</p>
                  </div>
                </div>
                {payer ? (
                  <p className="text-sm text-muted-foreground">
                    {tAdmin("transactions.expenses.payer")}: {payer}
                  </p>
                ) : null}
                {groupName ? (
                  <p className="text-sm text-muted-foreground">
                    {tAdmin("common.group")}: {groupName}
                  </p>
                ) : null}
              </div>
            );
          })()
        ) : null}

        {notFound ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {tAdmin("auditLogs.previewNotFound")}
          </p>
        ) : null}

        {target ? (
          <DialogFooter className="sm:justify-start">
            <AuditEntityDetailActions
              target={target}
              onNavigate={onClose}
              className="w-full border-t border-border/60 mt-2"
            />
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function openAuditPreview(preview: AuditEntityPreviewApi, target: AuditPreviewTarget) {
  if (target.kind === "user") preview.openUser(target.id);
  else if (target.kind === "group") preview.openGroup(target.id);
  else preview.openExpense(target.id);
}

export function auditPreviewClickProps(
  preview: AuditEntityPreviewApi | null,
  target: AuditPreviewTarget,
): {
  role?: "button";
  tabIndex?: number;
  onClick?: (e: MouseEvent) => void;
  onKeyDown?: (e: KeyboardEvent) => void;
  className?: string;
} {
  if (!preview) return {};
  const open = () => openAuditPreview(preview, target);
  return {
    role: "button",
    tabIndex: 0,
    className: undefined,
    onClick: (e) => {
      e.stopPropagation();
      open();
    },
    onKeyDown: (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        open();
      }
    },
  };
}
