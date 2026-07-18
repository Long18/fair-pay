import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2Icon } from "@/components/ui/icons";
import { supabaseClient } from "@/utility/supabaseClient";
import { useAdminTranslation } from "../i18n";

export type PostCreateUserRef = {
  id: string;
  full_name: string;
};

type PostCreateConnectionsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: PostCreateUserRef | null;
  createdBy: string;
  onDone: () => void;
};

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === "string" && msg) return msg;
  }
  return fallback;
}

export function PostCreateConnectionsDialog({
  open,
  onOpenChange,
  user,
  createdBy,
  onDone,
}: PostCreateConnectionsDialogProps) {
  const { tAdmin } = useAdminTranslation();
  const [step, setStep] = useState<"prompt" | "select">("prompt");
  const [friendSearch, setFriendSearch] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const { data: profiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ["admin", "post-create-profiles"],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("profiles")
        .select("id, full_name")
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; full_name: string }>;
    },
    enabled: open && step === "select",
    staleTime: 60_000,
  });

  const { data: groups = [], isLoading: loadingGroups } = useQuery({
    queryKey: ["admin", "post-create-groups"],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("groups")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string }>;
    },
    enabled: open && step === "select",
    staleTime: 60_000,
  });

  const friendOptions = useMemo(() => {
    const q = friendSearch.trim().toLowerCase();
    return profiles.filter(
      (p) =>
        p.id !== user?.id &&
        (!q || p.full_name.toLowerCase().includes(q)),
    );
  }, [friendSearch, profiles, user?.id]);

  const groupOptions = useMemo(() => {
    const q = groupSearch.trim().toLowerCase();
    return groups.filter((g) => !q || g.name.toLowerCase().includes(q));
  }, [groupSearch, groups]);

  const reset = () => {
    setStep("prompt");
    setFriendSearch("");
    setGroupSearch("");
    setSelectedFriendIds([]);
    setSelectedGroupIds([]);
    setSubmitting(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      reset();
      onDone();
    }
    onOpenChange(next);
  };

  const handleSkip = () => {
    handleOpenChange(false);
  };

  const toggleFriend = (id: string) => {
    setSelectedFriendIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleGroup = (id: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleConfirm = async () => {
    if (!user) return;
    if (selectedFriendIds.length === 0 && selectedGroupIds.length === 0) {
      toast.error(tAdmin("people.errors.selectConnectionOrSkip"));
      return;
    }

    setSubmitting(true);
    try {
      for (const friendId of selectedFriendIds) {
        const userA = user.id < friendId ? user.id : friendId;
        const userB = user.id < friendId ? friendId : user.id;
        const { data: existing, error: checkError } = await supabaseClient
          .from("friendships")
          .select("id")
          .eq("user_a", userA)
          .eq("user_b", userB)
          .maybeSingle();
        if (checkError) throw checkError;
        if (existing) continue;

        const { error } = await supabaseClient.from("friendships").insert({
          user_a: userA,
          user_b: userB,
          status: "accepted",
          created_by: createdBy || user.id,
        });
        if (error && error.code !== "23505") throw error;
      }

      for (const groupId of selectedGroupIds) {
        // role defaults to 'member' in DB; RLS rejects forged admin inserts
        const { error } = await supabaseClient.from("group_members").insert({
          group_id: groupId,
          user_id: user.id,
        });
        if (error && error.code !== "23505") throw error;
      }

      toast.success(
        tAdmin("people.success.connectionsAdded", { name: user.full_name }),
      );
      handleOpenChange(false);
    } catch (err: unknown) {
      toast.error(
        tAdmin("common.errorWithMessage", {
          message: getErrorMessage(err, tAdmin("people.errors.addConnectionsFailed")),
        }),
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  const selectedFriendIdSet = new Set(selectedFriendIds);
  const selectedGroupIdSet = new Set(selectedGroupIds);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] flex-col gap-0 p-0 sm:max-w-[560px]">
        <DialogHeader className="shrink-0 border-b px-6 pb-4 pt-6">
          <DialogTitle>
            {step === "prompt"
              ? tAdmin("people.postCreateConnectionsTitle")
              : tAdmin("people.postCreateSelectTitle")}
          </DialogTitle>
          <DialogDescription>
            {step === "prompt"
              ? tAdmin("people.postCreateConnectionsDescription", { name: user.full_name })
              : tAdmin("people.postCreateSelectDescription", { name: user.full_name })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          {step === "prompt" ? (
            <p className="text-sm text-muted-foreground">
              {tAdmin("people.postCreateConnectionsHint")}
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <Label>{tAdmin("people.friends")}</Label>
                <Input
                  value={friendSearch}
                  onChange={(e) => setFriendSearch(e.target.value)}
                  placeholder={tAdmin("people.searchFriendsPlaceholder")}
                />
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
                  {loadingProfiles ? (
                    <div className="flex justify-center py-4">
                      <Loader2Icon className="h-4 w-4 animate-spin" />
                    </div>
                  ) : friendOptions.length === 0 ? (
                    <p className="px-1 py-2 text-sm text-muted-foreground">
                      {tAdmin("common.noData")}
                    </p>
                  ) : (
                    friendOptions.map((profile) => {
                      const checked = selectedFriendIdSet.has(profile.id);
                      return (
                        <label
                          key={profile.id}
                          className="flex cursor-pointer items-center gap-2 rounded px-1 py-1.5 hover:bg-muted/60"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleFriend(profile.id)}
                          />
                          <span className="truncate text-sm">{profile.full_name}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>{tAdmin("people.groups")}</Label>
                <Input
                  value={groupSearch}
                  onChange={(e) => setGroupSearch(e.target.value)}
                  placeholder={tAdmin("people.searchGroupsPlaceholder")}
                />
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
                  {loadingGroups ? (
                    <div className="flex justify-center py-4">
                      <Loader2Icon className="h-4 w-4 animate-spin" />
                    </div>
                  ) : groupOptions.length === 0 ? (
                    <p className="px-1 py-2 text-sm text-muted-foreground">
                      {tAdmin("common.noData")}
                    </p>
                  ) : (
                    groupOptions.map((group) => {
                      const checked = selectedGroupIdSet.has(group.id);
                      return (
                        <label
                          key={group.id}
                          className="flex cursor-pointer items-center gap-2 rounded px-1 py-1.5 hover:bg-muted/60"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleGroup(group.id)}
                          />
                          <span className="truncate text-sm">{group.name}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="shrink-0 flex-row justify-end gap-2 border-t px-6 py-4">
          {step === "prompt" ? (
            <>
              <Button
                variant="outline"
                className="cursor-pointer"
                onClick={handleSkip}
                disabled={submitting}
              >
                {tAdmin("people.postCreateSkip")}
              </Button>
              <Button
                className="cursor-pointer"
                onClick={() => setStep("select")}
                disabled={submitting}
              >
                {tAdmin("people.postCreateAddNow")}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                className="cursor-pointer"
                onClick={handleSkip}
                disabled={submitting}
              >
                {tAdmin("people.postCreateSkip")}
              </Button>
              <Button
                className="cursor-pointer"
                onClick={() => void handleConfirm()}
                disabled={submitting}
              >
                {submitting && (
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                )}
                {tAdmin("people.postCreateConfirm")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
