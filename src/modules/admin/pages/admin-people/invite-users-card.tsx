import { useMemo, useState, useCallback } from "react";
import { toast } from "sonner";
import { useHaptics } from "@/hooks/use-haptics";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Loader2Icon, MailIcon, SendIcon } from "@/components/ui/icons";
import {
  buildInviteEmailPreview,
  normalizeInviteEmails,
  type InviteEmailPreviewInput,
} from "@/modules/admin/email/invite-email";
import { useRenderedEmail } from "@/modules/admin/email/use-rendered-email";
import { useAdminTranslation } from "../../i18n";
import { sendInviteEmails } from "./utils";

export function InviteUsersCard({
  inviterName,
}: {
  inviterName?: string | null;
}) {
  const { tAdmin } = useAdminTranslation();
  const { tap, success, warning } = useHaptics();
  const [emailInput, setEmailInput] = useState("");
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  const inviteEmails = useMemo(() => normalizeInviteEmails(emailInput), [emailInput]);
  const invitePreviewInput = useMemo<InviteEmailPreviewInput>(
    () => ({ emails: [], inviterName, appUrl: window.location.origin }),
    [inviterName],
  );
  const invitePreview = useRenderedEmail(invitePreviewInput, buildInviteEmailPreview);
  const invalidEmailCount = useMemo(() => {
    if (!emailInput.trim()) return 0;
    const rawItems = emailInput.split(/[\s,;]+/).filter(Boolean);
    return Math.max(rawItems.length - inviteEmails.length, 0);
  }, [emailInput, inviteEmails.length]);

  const handleSendInvite = useCallback(async () => {
    if (!inviteEmails.length) {
      warning();
      toast.error(tAdmin("people.errors.validEmailRequired"));
      return;
    }

    tap();
    setIsSendingInvite(true);
    try {
      const result = await sendInviteEmails(inviteEmails, inviterName || undefined);
      success();
      toast.success(result.message || tAdmin("people.success.inviteSent", { count: result.sent ?? inviteEmails.length }));
      setEmailInput("");
    } catch (error) {
      warning();
      const message = error instanceof Error && error.message === "admin-session-missing"
        ? tAdmin("people.errors.adminSessionMissing")
        : error instanceof Error ? error.message : tAdmin("people.errors.inviteFailed");
      toast.error(message);
    } finally {
      setIsSendingInvite(false);
    }
  }, [inviteEmails, inviterName, success, tAdmin, tap, warning]);

  return (
    <Card className="gap-0 overflow-hidden rounded-xl border py-0 shadow-sm">
      <CardHeader className="flex flex-row items-center gap-2.5 border-b bg-muted/30 px-4 py-3">
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background text-primary">
          <MailIcon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <CardTitle className="text-base">{tAdmin("people.inviteTitle")}</CardTitle>
          <CardDescription className="line-clamp-1 text-xs">
            {tAdmin("people.inviteDescription")}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid gap-0 p-0 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-3 border-b bg-muted/10 p-3 lg:border-b-0 lg:border-r">
          <div className="space-y-1.5">
            <Label htmlFor="invite-emails">{tAdmin("people.inviteRecipients")}</Label>
            <Textarea
              id="invite-emails"
              value={emailInput}
              onChange={(event) => setEmailInput(event.target.value)}
              placeholder="friend@example.com, teammate@example.com"
              className="min-h-28 resize-none rounded-lg font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {tAdmin("people.inviteHelp")}
            </p>
          </div>

          <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto rounded-lg border bg-background p-2.5">
            {inviteEmails.length ? (
              inviteEmails.map((email) => (
                <Badge key={email} variant="outline" className="max-w-full rounded-md font-normal">
                  {email}
                </Badge>
              ))
            ) : (
              <Badge variant="outline" className="font-normal text-muted-foreground">
                {tAdmin("people.noValidEmails")}
              </Badge>
            )}
          </div>

          {invalidEmailCount > 0 && (
            <p className="text-xs text-[var(--status-warning-foreground)]">
              {tAdmin("people.invalidEmailCount", { count: invalidEmailCount })}
            </p>
          )}

          <Button
            className="w-full cursor-pointer"
            onClick={handleSendInvite}
            disabled={isSendingInvite || inviteEmails.length === 0}
          >
            {isSendingInvite ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : <SendIcon className="mr-2 h-4 w-4" />}
            {tAdmin("people.sendInvites")}
          </Button>
        </div>

        <div className="min-w-0 bg-slate-100 dark:bg-slate-950/40">
          <div className="space-y-1.5 border-b bg-background px-4 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{invitePreview?.subject ?? "…"}</p>
                <p className="truncate text-xs text-muted-foreground">{invitePreview?.previewText ?? ""}</p>
              </div>
              <Badge variant="outline" className="shrink-0">
                {tAdmin("common.preview")}
              </Badge>
            </div>
            <div className="grid grid-cols-[56px_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-xs">
              <span className="text-muted-foreground">{tAdmin("common.from")}</span>
              <span className="truncate">{tAdmin("people.emailSender")}</span>
              <span className="text-muted-foreground">{tAdmin("common.to")}</span>
              <span className="truncate">{inviteEmails.length ? inviteEmails.join(", ") : "email@example.com"}</span>
            </div>
          </div>
          <div className="h-[420px] p-3 lg:h-[calc(100dvh-var(--admin-nav-h)-15rem)] lg:min-h-[360px]">
            <div className="mx-auto h-full max-w-[640px] overflow-hidden rounded-2xl border bg-white shadow-xl ring-1 ring-slate-900/5">
              <div className="flex h-9 items-center justify-between border-b bg-slate-50 px-3">
                <div className="flex items-center gap-1.5" aria-hidden="true">
                  {/* Decorative window-chrome dots (not semantic status colors) */}
                  {/* eslint-disable-next-line no-restricted-syntax -- decorative preview chrome */}
                  <span className="size-2.5 rounded-full bg-red-400" />
                  <span className="size-2.5 rounded-full bg-amber-400" />
                  <span className="size-2.5 rounded-full bg-emerald-400" />
                </div>
                <MailIcon className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              </div>
              <iframe
                title={tAdmin("layout.people.invitePreviewFrame")}
                srcDoc={invitePreview?.html ?? ""}
                sandbox=""
                className="h-[calc(100%-2.25rem)] w-full bg-white"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
