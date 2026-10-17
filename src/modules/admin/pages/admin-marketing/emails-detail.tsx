import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ActivityIcon, MailIcon } from "@/components/ui/icons";
import { formatNumber } from "@/lib/locale-utils";
import { AdminDetailSheet } from "../../components/AdminDetailSheet";
import { AdminMetricCard } from "../../components/AdminMetricCard";
import { useAdminTranslation } from "../../i18n";
import type { SentEmail, UserEmailGroup } from "./types";

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

function UserEmailHistory({ user }: { user: UserEmailGroup }) {
  const { tAdmin } = useAdminTranslation();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <AdminMetricCard
          variant="compact"
          icon={MailIcon}
          label={tAdmin("layout.insights.marketing.totalEmails")}
          value={formatNumber(user.emails.length)}
        />
        <AdminMetricCard
          variant="compact"
          icon={ActivityIcon}
          label={tAdmin("layout.insights.marketing.lastSentLabel")}
          value={new Date(user.lastSent).toLocaleDateString()}
        />
      </div>
      <div>
        <SectionLabel>{tAdmin("layout.insights.marketing.emailHistory")}</SectionLabel>
        <div className="divide-y rounded-md border">
          {user.emails.map((email, i) => (
            <motion.div
              key={email.id}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i, 12) * 0.02 }}
              className="flex items-center gap-3 px-3 py-2"
            >
              <Badge variant="secondary" className="shrink-0 font-mono text-xs">{email.type}</Badge>
              <div className="flex-1" />
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {new Date(email.email_sent_at).toLocaleString(undefined, {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TypeRecipients({ emails, count }: { emails: SentEmail[]; count: number }) {
  const { tAdmin } = useAdminTranslation();
  return (
    <div className="space-y-4">
      <AdminMetricCard
        variant="compact"
        icon={MailIcon}
        label={tAdmin("layout.insights.marketing.totalSent")}
        value={formatNumber(count)}
      />
      <div>
        <SectionLabel>{tAdmin("layout.insights.marketing.recipients")}</SectionLabel>
        <div className="divide-y rounded-md border">
          {emails.map((email, i) => {
            const initials = (email.full_name ?? email.user_id).charAt(0).toUpperCase();
            return (
              <motion.div
                key={email.id}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i, 12) * 0.02 }}
                className="flex items-center gap-2.5 px-3 py-2"
              >
                <Avatar className="h-6 w-6 shrink-0">
                  {email.avatar_url && <AvatarImage src={email.avatar_url} />}
                  <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                </Avatar>
                <p className="min-w-0 flex-1 truncate text-sm font-medium">{email.full_name ?? email.user_id}</p>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {new Date(email.email_sent_at).toLocaleDateString(undefined, {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function EmailDrilldownSheet({
  selectedUser,
  selectedType,
  sentEmails,
  typeCount,
  onClose,
}: {
  selectedUser: UserEmailGroup | null;
  selectedType: string | null;
  sentEmails: SentEmail[] | undefined;
  typeCount: number;
  onClose: () => void;
}) {
  const { tAdmin } = useAdminTranslation();
  const open = selectedUser !== null || selectedType !== null;

  const title = selectedUser ? (
    <span className="flex min-w-0 items-center gap-2">
      <Avatar className="h-6 w-6 shrink-0">
        {selectedUser.avatar_url && <AvatarImage src={selectedUser.avatar_url} />}
        <AvatarFallback className="text-[10px]">{(selectedUser.full_name ?? "?").charAt(0)}</AvatarFallback>
      </Avatar>
      <span className="truncate">{selectedUser.full_name ?? selectedUser.user_id}</span>
    </span>
  ) : selectedType ? (
    <span className="truncate font-mono">{selectedType}</span>
  ) : (
    tAdmin("marketing.recentEmailsTitle")
  );

  const description = selectedUser
    ? tAdmin("layout.insights.marketing.allEmailsTo", {
        name: selectedUser.full_name ?? selectedUser.user_id,
      })
    : selectedType
      ? tAdmin("layout.insights.marketing.emailsOfType", { count: typeCount, type: selectedType })
      : undefined;

  return (
    <AdminDetailSheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={title}
      description={description}
      size="md"
    >
      {selectedUser ? (
        <UserEmailHistory user={selectedUser} />
      ) : selectedType ? (
        <TypeRecipients
          emails={sentEmails?.filter((e) => e.type === selectedType) ?? []}
          count={typeCount}
        />
      ) : null}
    </AdminDetailSheet>
  );
}
