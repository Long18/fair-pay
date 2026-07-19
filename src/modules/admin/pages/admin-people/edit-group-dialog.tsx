import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/locale-utils";
import { AdminCrudDialog } from "../../components/AdminCrudSheet";
import { useAdminTranslation } from "../../i18n";
import type { GroupRow } from "./types";
import { DetailItem } from "./detail-helpers";

export function EditGroupDialog({
  group,
  open,
  onOpenChange,
  onConfirm,
  isUpdating,
}: {
  group: GroupRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: { name: string; description: string; avatar_url: string | null }) => void;
  isUpdating: boolean;
}) {
  const { tAdmin } = useAdminTranslation();
  const [name, setName] = useState(group?.name ?? "");
  const [description, setDescription] = useState(group?.description ?? "");
  const [avatarUrl, setAvatarUrl] = useState(group?.avatar_url ?? "");

  if (!group) return null;

  return (
    <AdminCrudDialog
      open={open}
      onOpenChange={onOpenChange}
      title={tAdmin("people.editGroupTitle")}
      description={tAdmin("people.editGroupDescription", { name: group.name })}
      isSubmitting={isUpdating}
      submitLabel={tAdmin("common.save")}
      contentClassName="sm:max-w-[640px]"
      onSubmit={() => onConfirm({
        name: name.trim(),
        description: description.trim(),
        avatar_url: avatarUrl.trim() || null,
      })}
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="group-name">{tAdmin("people.groupName")}</Label>
            <Input id="group-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={tAdmin("people.groupNamePlaceholder")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="group-avatar">Avatar URL</Label>
            <Input id="group-avatar" type="url" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="group-description">{tAdmin("people.groupDescription")}</Label>
            <Textarea id="group-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={tAdmin("people.groupDescriptionPlaceholder")} rows={3} />
          </div>
        </div>
        <div className="grid gap-3 rounded-lg border bg-muted/20 p-3 text-sm sm:grid-cols-2">
          <DetailItem label="ID" value={<span className="font-mono text-xs">{group.id}</span>} />
          <DetailItem label={tAdmin("common.createdAt")} value={formatDate(group.created_at)} />
        </div>
      </div>
    </AdminCrudDialog>
  );
}
