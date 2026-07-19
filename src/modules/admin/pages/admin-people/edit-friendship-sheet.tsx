import { useState } from "react";
import { toast } from "sonner";
import { supabaseClient } from "@/utility/supabaseClient";
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
import type { FriendshipRow } from "./types";
import { getErrorMessage } from "./utils";

export function EditFriendshipSheet({
  friendship,
  open,
  onOpenChange,
  onUpdated,
}: {
  friendship: FriendshipRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}) {
  const { tAdmin } = useAdminTranslation();
  const [status, setStatus] = useState<"pending" | "accepted" | "rejected">(friendship?.status ?? "accepted");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!friendship) return;
    setSubmitting(true);
    try {
      const { error } = await supabaseClient
        .from("friendships")
        .update({ status })
        .eq("id", friendship.id);
      if (error) throw error;
      toast.success(tAdmin("people.success.friendshipUpdated"));
      onOpenChange(false);
      onUpdated();
    } catch (err: unknown) {
      toast.error(tAdmin("common.errorWithMessage", { message: getErrorMessage(err, tAdmin("people.errors.acceptFriendshipFailed")) }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminCrudDialog
      open={open}
      onOpenChange={onOpenChange}
      title={tAdmin("people.editFriendshipTitle")}
      description={friendship ? `${friendship.user_a_name} ↔ ${friendship.user_b_name}` : undefined}
      isSubmitting={submitting}
      submitLabel={tAdmin("common.save")}
      onSubmit={handleSubmit}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{tAdmin("common.status")}</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="accepted">{tAdmin("status.accepted")}</SelectItem>
              <SelectItem value="pending">{tAdmin("status.pending")}</SelectItem>
              <SelectItem value="rejected">{tAdmin("status.rejected")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground">
          {tAdmin("people.cannotChangeUsersAfterCreate")}
        </p>
      </div>
    </AdminCrudDialog>
  );
}
