import { useState } from "react";
import { toast } from "sonner";
import { supabaseClient } from "@/utility/supabaseClient";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AdminCrudDialog } from "../../components/AdminCrudSheet";
import { useAdminTranslation } from "../../i18n";
import { getErrorMessage } from "./utils";

export function CreateGroupSheet({
  open,
  onOpenChange,
  onCreated,
  createdBy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  createdBy: string;
}) {
  const { tAdmin } = useAdminTranslation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setName("");
    setDescription("");
    setAvatarUrl("");
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error(tAdmin("people.errors.groupNameRequired"));
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabaseClient.from("groups").insert({
        name: name.trim(),
        description: description.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        created_by: createdBy,
      });
      if (error) throw error;
      toast.success(tAdmin("people.success.groupCreated"));
      reset();
      onOpenChange(false);
      onCreated();
    } catch (err: unknown) {
      toast.error(tAdmin("common.errorWithMessage", { message: getErrorMessage(err, tAdmin("people.errors.groupNameRequired")) }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminCrudDialog
      open={open}
      onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}
      title={tAdmin("people.createGroupTitle")}
      description={tAdmin("people.createGroupDescription")}
      isSubmitting={submitting}
      submitLabel={tAdmin("people.createGroupSubmit")}
      onSubmit={handleSubmit}
      contentClassName="sm:max-w-[640px]"
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="new-group-name">{tAdmin("people.groupName")} *</Label>
            <Input
              id="new-group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={tAdmin("people.createGroupNamePlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-group-avatar">Avatar URL</Label>
            <Input
              id="new-group-avatar"
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="new-group-desc">{tAdmin("people.groupDescription")}</Label>
            <Textarea
              id="new-group-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={tAdmin("people.groupDescriptionPlaceholder")}
              rows={3}
            />
          </div>
        </div>
      </div>
    </AdminCrudDialog>
  );
}
