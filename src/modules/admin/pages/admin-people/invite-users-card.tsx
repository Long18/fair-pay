import { useMemo, useState, useCallback } from "react";
import { toast } from "sonner";
import { useHaptics } from "@/hooks/use-haptics";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Loader2Icon, MailIcon, SendIcon } from "@/components/ui/icons";
import { buildInviteEmailPreview, normalizeInviteEmails } from "@/modules/admin/email/invite-email";
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
  const invitePreview = useMemo(
    () => buildInviteEmailPreview({
      emails: inviteEmails,
      inviterName,
      appUrl: window.location.origin,
    }),
    [inviteEmails, inviterName],
  );
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
    <Card className="overflow-hidden rounded-xl border shadow-sm">
      <CardHeader className="border-b bg-muted/30">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex size-9 items-center justify-center rounded-lg border bg-background text-primary">
                <MailIcon className="h-4 w-4" />
              </span>
              <CardTitle>{tAdmin("people.inviteTitle")}</CardTitle>
            </div>
            <CardDescription>
              {tAdmin("people.inviteDescription")}
            </CardDescription>
          </div>
          <Badge variant="secondary" className="w-fit">
            {tAdmin("common.preview")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-0 p-0 lg:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-4 border-b bg-muted/10 p-4 lg:border-b-0 lg:border-r">
          <div className="space-y-2">
            <Label htmlFor="invite-emails">{tAdmin("people.inviteRecipients")}</Label>
            <Textarea
              id="invite-emails"
              value={emailInput}
              onChange={(event) => setEmailInput(event.target.value)}
              placeholder="friend@example.com, teammate@example.com"
              className="min-h-32 resize-none rounded-xl font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {tAdmin("people.inviteHelp")}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 rounded-xl border bg-background p-3">
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
          <div className="flex items-center justify-between gap-3 border-b bg-background px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{invitePreview.subject}</p>
              <p className="truncate text-xs text-muted-foreground">{invitePreview.previewText}</p>
            </div>
            <Badge variant="outline" className="shrink-0">
              {tAdmin("common.preview")}
            </Badge>
          </div>
          <div className="grid gap-3 border-b bg-background px-4 py-3 text-sm sm:grid-cols-[72px_minmax(0,1fr)]">
            <span className="text-muted-foreground">{tAdmin("common.from")}</span>
            <span className="truncate">{tAdmin("people.emailSender")}</span>
            <span className="text-muted-foreground">{tAdmin("common.to")}</span>
            <span className="truncate">{inviteEmails.length ? inviteEmails.join(", ") : "email@example.com"}</span>
          </div>
          <div className="h-[460px] p-3">
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
                title="FairPay invite email preview"
                srcDoc={invitePreview.html}
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
