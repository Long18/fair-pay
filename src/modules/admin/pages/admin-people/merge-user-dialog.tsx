import { useMemo, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2Icon } from "@/components/ui/icons";
import { matchesSearchFields } from "@/lib/search-utils";
import type { AdminUserRow } from "../../types";
import { useAdminTranslation } from "../../i18n";
import { UserSingleCombobox } from "./user-single-combobox";

export function MergeUserDialog({
  initialSourceUser,
  users,
  open,
  onOpenChange,
  onConfirm,
  isMerging,
  identityId,
}: {
  initialSourceUser: AdminUserRow | null;
  users: AdminUserRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (targetUserId: string, sourceUserIds: string[]) => void;
  isMerging: boolean;
  identityId?: string;
}) {
  const { tAdmin } = useAdminTranslation();
  const [targetUserId, setTargetUserId] = useState("");
  const [sourceUserIds, setSourceUserIds] = useState<string[]>([]);
  const [sourceSearch, setSourceSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    // Reset form when dialog opens / source user changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional dialog reset on open
    setTargetUserId("");
    setSourceSearch("");
    setSourceUserIds(initialSourceUser?.id ? [initialSourceUser.id] : []);
  }, [open, initialSourceUser?.id]);

  const excludedFromTarget = useMemo(
    () => new Set([...sourceUserIds, identityId].filter(Boolean) as string[]),
    [identityId, sourceUserIds],
  );

  const targetUsers = useMemo(
    () => users.filter((user) => !excludedFromTarget.has(user.id)),
    [excludedFromTarget, users],
  );

  const sourceOptions = useMemo(() => {
    return users.filter((user) => {
      if (user.id === targetUserId || user.id === identityId) return false;
      return matchesSearchFields(sourceSearch, user.full_name, user.email);
    });
  }, [identityId, sourceSearch, targetUserId, users]);

  const sourceUserIdSet = useMemo(() => new Set(sourceUserIds), [sourceUserIds]);

  const selectedSources = useMemo(
    () => users.filter((user) => sourceUserIdSet.has(user.id)),
    [sourceUserIdSet, users],
  );

  const toggleSource = (id: string) => {
    setSourceUserIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  if (!initialSourceUser && sourceUserIds.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{tAdmin("people.mergeProfileTitle")}</DialogTitle>
          <DialogDescription>
            {tAdmin("people.mergeProfilesDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{tAdmin("people.mergeSources")}</Label>
            <Input
              value={sourceSearch}
              onChange={(e) => setSourceSearch(e.target.value)}
              placeholder={tAdmin("people.searchMergeSources")}
              disabled={isMerging}
            />
            <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border p-2">
              {sourceOptions.length === 0 ? (
                <p className="px-1 py-2 text-sm text-muted-foreground">{tAdmin("common.noData")}</p>
              ) : (
                sourceOptions.map((user) => {
                  const checked = sourceUserIdSet.has(user.id);
                  return (
                    <label
                      key={user.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-1 py-1.5 hover:bg-muted/60"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleSource(user.id)}
                        disabled={isMerging}
                      />
                      <span className="min-w-0 flex-1 truncate text-sm">{user.full_name}</span>
                      <span className="truncate text-xs text-muted-foreground" translate="no">{user.email}</span>
                    </label>
                  );
                })
              )}
            </div>
            {selectedSources.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                {tAdmin("people.mergeSourcesSelected", { count: selectedSources.length })}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>{tAdmin("people.mergeTarget")}</Label>
            <UserSingleCombobox
              value={targetUserId}
              onChange={setTargetUserId}
              users={targetUsers}
              placeholder={tAdmin("people.selectMergeTarget")}
              disabled={isMerging || targetUsers.length === 0}
            />
          </div>

          <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {tAdmin("people.mergeProfilesWarning")}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isMerging}>
            {tAdmin("common.cancel")}
          </Button>
          <Button
            onClick={() => onConfirm(targetUserId, sourceUserIds)}
            disabled={isMerging || !targetUserId || sourceUserIds.length === 0}
          >
            {isMerging ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : null}
            {tAdmin("people.mergeProfileSubmit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
