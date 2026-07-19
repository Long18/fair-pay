import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/locale-utils";
import type { AdminUserRow } from "../../types";
import { AdminCrudDialog } from "../../components/AdminCrudSheet";
import { useAdminTranslation } from "../../i18n";
import { DetailItem } from "./detail-helpers";

export function EditUserDialog({
  user,
  open,
  onOpenChange,
  onSubmit,
  isUpdating,
  isSelf,
}: {
  user: AdminUserRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    full_name: string;
    primary_email_id: string | null;
    avatar_url: string | null;
    role: "admin" | "moderator" | "user";
    journey_tracking_ignored: boolean;
  }) => void;
  isUpdating: boolean;
  isSelf: boolean;
}) {
  const { tAdmin } = useAdminTranslation();
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [primaryEmailId, setPrimaryEmailId] = useState(
    () => user?.emails?.find((email) => email.is_primary)?.id ?? null,
  );
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url ?? "");
  const [role, setRole] = useState<"admin" | "moderator" | "user">(user?.role ?? "user");
  const [journeyTracking, setJourneyTracking] = useState<"tracked" | "ignored">(
    user?.journey_tracking_ignored ? "ignored" : "tracked",
  );

  if (!user) return null;

  return (
    <AdminCrudDialog
      open={open}
      onOpenChange={onOpenChange}
      title={tAdmin("people.editUserTitle")}
      description={tAdmin("people.editUserDescription", { name: user.full_name })}
      isSubmitting={isUpdating}
      submitLabel={tAdmin("common.save")}
      contentClassName="sm:max-w-[640px]"
      onSubmit={() => onSubmit({
        full_name: fullName.trim(),
        primary_email_id: primaryEmailId,
        avatar_url: avatarUrl.trim() || null,
        role,
        journey_tracking_ignored: journeyTracking === "ignored",
      })}
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="edit-user-name">{tAdmin("people.fullName")}</Label>
            <Input id="edit-user-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-user-email">{tAdmin("people.primaryEmail")}</Label>
            {user.emails?.length ? (
              <Select value={primaryEmailId ?? undefined} onValueChange={setPrimaryEmailId}>
                <SelectTrigger id="edit-user-email">
                  <SelectValue placeholder={tAdmin("people.selectPrimaryEmail")} />
                </SelectTrigger>
                <SelectContent>
                  {user.emails.map((userEmail) => (
                    <SelectItem key={userEmail.id} value={userEmail.id}>
                      {userEmail.email}{userEmail.is_primary ? ` (${tAdmin("people.currentPrimaryEmail")})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="rounded-md border bg-muted/20 p-3 text-sm">
                <p className="text-muted-foreground">{tAdmin("people.noEmailAddresses")}</p>
                <p className="mt-1 break-all font-medium" translate="no">{user.email}</p>
              </div>
            )}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="edit-user-avatar">Avatar URL</Label>
            <Input id="edit-user-avatar" type="url" placeholder="https://..." value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-user-role">{tAdmin("common.role")}</Label>
            <Select value={role} onValueChange={(v) => setRole(v as typeof role)} disabled={isSelf}>
              <SelectTrigger id="edit-user-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">{tAdmin("common.user")}</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-user-journey">{tAdmin("people.journeyTracking")}</Label>
            <Select value={journeyTracking} onValueChange={(v) => setJourneyTracking(v as typeof journeyTracking)}>
              <SelectTrigger id="edit-user-journey">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tracked">{tAdmin("status.tracked")}</SelectItem>
                <SelectItem value="ignored">{tAdmin("status.ignored")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-3 rounded-lg border bg-muted/20 p-3 text-sm sm:grid-cols-2">
          <DetailItem label="ID" value={<span className="font-mono text-xs">{user.id}</span>} />
          <DetailItem label={tAdmin("common.createdAt")} value={formatDate(user.created_at)} />
        </div>
      </div>
    </AdminCrudDialog>
  );
}
