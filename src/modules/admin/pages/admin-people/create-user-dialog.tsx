import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AdminCrudDialog } from "../../components/AdminCrudSheet";
import { useAdminTranslation } from "../../i18n";
import type { CreateUserFormValues } from "./types";

export function CreateUserDialog({
  open,
  onOpenChange,
  onSubmit,
  isCreating,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateUserFormValues) => void;
  isCreating: boolean;
}) {
  const { tAdmin } = useAdminTranslation();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [role, setRole] = useState<"admin" | "moderator" | "user">("user");

  const handleSubmit = () => {
    if (!fullName.trim() || !email.trim()) {
      toast.error(tAdmin("people.errors.requiredFields"));
      return;
    }
    onSubmit({ full_name: fullName.trim(), email: email.trim(), role, avatar_url: avatarUrl.trim() || undefined });
  };

  return (
    <AdminCrudDialog
      open={open}
      onOpenChange={onOpenChange}
      title={tAdmin("people.createUserTitle")}
      description={tAdmin("people.createUserDescription")}
      isSubmitting={isCreating}
      submitLabel={tAdmin("people.createUserSubmit")}
      onSubmit={handleSubmit}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="user-name">{tAdmin("people.fullName")}</Label>
          <Input id="user-name" placeholder={tAdmin("people.fullNamePlaceholder")} value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="user-email">Email</Label>
          <Input id="user-email" type="email" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="user-avatar">Avatar URL</Label>
          <Input id="user-avatar" type="url" placeholder="https://..." value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="user-role">{tAdmin("common.role")}</Label>
          <Select value={role} onValueChange={(value) => setRole(value as typeof role)}>
            <SelectTrigger id="user-role"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="user">{tAdmin("common.user")}</SelectItem>
              <SelectItem value="moderator">Moderator</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </AdminCrudDialog>
  );
}
