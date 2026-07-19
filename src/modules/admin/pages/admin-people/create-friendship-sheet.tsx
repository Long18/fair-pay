import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { getErrorMessage } from "./utils";
import { UserSingleCombobox } from "./user-single-combobox";

export function CreateFriendshipSheet({
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
  const [userA, setUserA] = useState("");
  const [userB, setUserB] = useState("");
  const [status, setStatus] = useState<"pending" | "accepted" | "rejected">("accepted");
  const [submitting, setSubmitting] = useState(false);

  const { data: profiles } = useQuery({
    queryKey: ["admin", "profiles-for-friendship"],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("profiles")
        .select("id, full_name")
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; full_name: string }>;
    },
    enabled: open,
    staleTime: 60_000,
  });

  const reset = () => {
    setUserA("");
    setUserB("");
    setStatus("accepted");
  };

  const handleSubmit = async () => {
    if (!userA || !userB) {
      toast.error(tAdmin("people.errors.selectBothUsers"));
      return;
    }
    if (userA === userB) {
      toast.error(tAdmin("people.errors.usersMustDiffer"));
      return;
    }
    setSubmitting(true);
    try {
      const { data: existing, error: checkError } = await supabaseClient
        .from("friendships")
        .select("id")
        .or(`and(user_a.eq.${userA},user_b.eq.${userB}),and(user_a.eq.${userB},user_b.eq.${userA})`);
      if (checkError) throw checkError;
      if (existing && existing.length > 0) {
        toast.error(tAdmin("people.errors.friendshipExists"));
        return;
      }
      const { error } = await supabaseClient.from("friendships").insert({
        user_a: userA < userB ? userA : userB,
        user_b: userA < userB ? userB : userA,
        status,
        created_by: createdBy,
      });
      if (error) throw error;
      toast.success(tAdmin("people.success.friendshipCreated"));
      reset();
      onOpenChange(false);
      onCreated();
    } catch (err: unknown) {
      toast.error(tAdmin("common.errorWithMessage", { message: getErrorMessage(err, tAdmin("people.errors.friendshipExists")) }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminCrudDialog
      open={open}
      onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}
      title={tAdmin("people.createFriendshipTitle")}
      description={tAdmin("people.createFriendshipDescription")}
      isSubmitting={submitting}
      submitLabel={tAdmin("people.createFriendshipSubmit")}
      onSubmit={handleSubmit}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{tAdmin("people.userA")} *</Label>
          <UserSingleCombobox
            value={userA}
            onChange={setUserA}
            users={profiles ?? []}
            placeholder={tAdmin("people.selectUser")}
          />
        </div>
        <div className="space-y-2">
          <Label>{tAdmin("people.userB")} *</Label>
          <UserSingleCombobox
            value={userB}
            onChange={setUserB}
            users={(profiles ?? []).filter((u) => u.id !== userA)}
            placeholder={tAdmin("people.selectUser")}
          />
        </div>
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
      </div>
    </AdminCrudDialog>
  );
}
