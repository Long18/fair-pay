import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MailIcon } from "@/components/ui/icons";
import { getInitials, getSelectedRecipientEmails } from "./helpers";
import type { AdminT, DebtReminderRow, GroupBreakdownRow } from "./types";

export function RecipientIdentity({
  row,
  compact = false,
  showEmail = true,
  emailLabel,
  placeholderLabel,
}: {
  row: DebtReminderRow;
  compact?: boolean;
  showEmail?: boolean;
  emailLabel?: string;
  placeholderLabel: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar className={compact ? "size-8" : "size-10"}>
        <AvatarImage src={row.avatar_url ?? undefined} alt={row.full_name} />
        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
          {getInitials(row.full_name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="truncate font-medium">{row.full_name}</span>
          {!row.has_auth_account ? (
            <Badge variant="secondary">{placeholderLabel}</Badge>
          ) : null}
        </div>
        {showEmail ? (
          <p className="truncate text-xs text-muted-foreground" translate="no">
            {emailLabel ?? row.email}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function RecipientEmailPicker({
  row,
  selectedEmails,
  onChange,
  disabled,
  tAdmin,
}: {
  row: DebtReminderRow;
  selectedEmails: string[];
  onChange: (emails: string[]) => void;
  disabled: boolean;
  tAdmin: AdminT;
}) {
  const selected = selectedEmails.length ? selectedEmails : getSelectedRecipientEmails(row, {});
  const selectedLabel = selected.length === 1
    ? selected[0]
    : tAdmin("devtool.selectedRecipientEmails", { count: selected.length });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="max-w-[220px] justify-start gap-2"
          disabled={disabled}
        >
          <MailIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate" translate="no">{selectedLabel}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>{tAdmin("devtool.chooseRecipientEmails")}</DropdownMenuLabel>
        {row.emails.map((email) => {
          const checked = selected.some((value) => value.toLowerCase() === email.email.toLowerCase());
          return (
            <DropdownMenuCheckboxItem
              key={email.id}
              checked={checked}
              onSelect={(event) => event.preventDefault()}
              onCheckedChange={(nextChecked) => {
                if (nextChecked) {
                  onChange(Array.from(new Set([...selected, email.email])));
                  return;
                }

                const next = selected.filter((value) => value.toLowerCase() !== email.email.toLowerCase());
                if (next.length) onChange(next);
              }}
            >
              <div className="min-w-0">
                <p className="truncate text-sm" translate="no">{email.email}</p>
                {email.is_primary ? (
                  <p className="text-xs text-muted-foreground">{tAdmin("devtool.primaryEmail")}</p>
                ) : null}
              </div>
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function GroupIdentity({
  group,
}: {
  group: GroupBreakdownRow;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Avatar className="size-8">
        <AvatarImage src={group.group_avatar_url ?? undefined} alt={group.group_name} />
        <AvatarFallback className="bg-indigo-100 text-[11px] font-semibold text-indigo-700">
          {getInitials(group.group_name)}
        </AvatarFallback>
      </Avatar>
      <p className="min-w-0 truncate text-sm font-medium leading-5">
        {group.group_name}
      </p>
    </div>
  );
}
