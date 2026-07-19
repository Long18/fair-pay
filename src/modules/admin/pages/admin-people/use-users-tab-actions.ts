import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabaseClient } from "@/utility/supabaseClient";
import type { AdminUserRow } from "../../types";
import { useAdminTranslation } from "../../i18n";
import type { CreateUserFormValues } from "./types";
import { getErrorMessage } from "./utils";
import type { PostCreateUserRef } from "../../components/PostCreateConnectionsDialog";

type UseUsersTabActionsParams = {
  identityId: string | undefined;
  selectedUser: AdminUserRow | null;
  setSelectedUser: Dispatch<SetStateAction<AdminUserRow | null>>;
  setDetailOpen: Dispatch<SetStateAction<boolean>>;
  editUser: AdminUserRow | null;
  setEditUser: Dispatch<SetStateAction<AdminUserRow | null>>;
  setEditDialogOpen: Dispatch<SetStateAction<boolean>>;
  deleteUser: AdminUserRow | null;
  setDeleteUser: Dispatch<SetStateAction<AdminUserRow | null>>;
  setDeleteDialogOpen: Dispatch<SetStateAction<boolean>>;
  setCreateDialogOpen: Dispatch<SetStateAction<boolean>>;
  setMergeSourceUser: Dispatch<SetStateAction<AdminUserRow | null>>;
  setMergeDialogOpen: Dispatch<SetStateAction<boolean>>;
  setPostCreateUser: Dispatch<SetStateAction<PostCreateUserRef | null>>;
  setPostCreateOpen: Dispatch<SetStateAction<boolean>>;
};

export function useUsersTabActions({
  identityId,
  selectedUser,
  setSelectedUser,
  setDetailOpen,
  editUser,
  setEditUser,
  setEditDialogOpen,
  deleteUser,
  setDeleteUser,
  setDeleteDialogOpen,
  setCreateDialogOpen,
  setMergeSourceUser,
  setMergeDialogOpen,
  setPostCreateUser,
  setPostCreateOpen,
}: UseUsersTabActionsParams) {
  const { tAdmin } = useAdminTranslation();
  const queryClient = useQueryClient();

  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [isAddingEmail, setIsAddingEmail] = useState(false);
  const [settingPrimaryEmailId, setSettingPrimaryEmailId] = useState<string | null>(null);
  const [removingEmailId, setRemovingEmailId] = useState<string | null>(null);

  const handleToggleJourneyTracking = useCallback(async (user: AdminUserRow) => {
    try {
      const nextIgnored = !user.journey_tracking_ignored;
      const { error } = await supabaseClient.rpc("admin_set_user_tracking_ignore", {
        p_user_id: user.id,
        p_ignore: nextIgnored,
        p_reason: nextIgnored ? "Ignored by admin from Admin People" : null,
      });
      if (error) throw error;

      toast.success(
        nextIgnored
          ? tAdmin("people.success.trackingIgnored", { name: user.full_name })
          : tAdmin("people.success.trackingResumed", { name: user.full_name }),
      );

      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "users", user.id] });

      if (selectedUser?.id === user.id) {
        setSelectedUser({ ...user, journey_tracking_ignored: nextIgnored });
      }
    } catch (error) {
      toast.error(tAdmin("common.errorWithMessage", { message: error instanceof Error ? error.message : tAdmin("people.errors.updateTrackingFailed") }));
    }
  }, [queryClient, selectedUser, setSelectedUser, tAdmin]);

  const handleToggleRole = useCallback((user: AdminUserRow) => {
    if (identityId === user.id) { toast.warning(tAdmin("people.errors.selfRoleChange")); return; }
    const newRole = user.role === "admin" ? "user" : "admin";
    (async () => {
      try {
        const { error } = await supabaseClient.rpc("admin_update_user_role", {
          p_user_id: user.id,
          p_new_role: newRole,
        });
        if (error) throw error;
        toast.success(tAdmin("people.success.roleChanged", {
          action: newRole === "admin" ? tAdmin("people.rolePromotedAction") : tAdmin("people.roleDemotedAction"),
          name: user.full_name,
        }));
        queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      } catch (error) {
        toast.error(tAdmin("common.errorWithMessage", { message: error instanceof Error ? error.message : tAdmin("people.errors.changeRoleFailed") }));
      }
    })();
  }, [identityId, queryClient, tAdmin]);

  const handleDeleteUser = useCallback(async () => {
    if (!deleteUser) return;
    setIsDeleting(true);
    try {
      const { error } = await supabaseClient.from("profiles").delete().eq("id", deleteUser.id);
      if (error) throw error;
      toast.success(tAdmin("people.success.userDeleted", { name: deleteUser.full_name }));
      setDeleteDialogOpen(false); setDeleteUser(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    } catch (err: unknown) {
      toast.error(tAdmin("common.errorWithMessage", { message: getErrorMessage(err, tAdmin("people.errors.deleteUserFailed")) }));
    } finally { setIsDeleting(false); }
  }, [deleteUser, queryClient, setDeleteDialogOpen, setDeleteUser, tAdmin]);

  const handleCreateUser = useCallback(async (data: CreateUserFormValues) => {
    setIsCreating(true);
    try {
      const { data: createdRows, error } = await supabaseClient.rpc("admin_create_profile", {
        p_full_name: data.full_name,
        p_email: data.email,
        p_role: data.role,
        p_avatar_url: data.avatar_url ?? null,
      });
      if (error) throw error;

      const created = Array.isArray(createdRows) ? createdRows[0] : null;
      toast.success(tAdmin("people.success.userCreated", { name: data.full_name }));
      setCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });

      if (created?.id) {
        setPostCreateUser({ id: created.id, full_name: created.full_name || data.full_name });
        setPostCreateOpen(true);
      }
    } catch (err: unknown) {
      toast.error(tAdmin("common.errorWithMessage", { message: getErrorMessage(err, tAdmin("people.errors.createUserFailed")) }));
    } finally { setIsCreating(false); }
  }, [queryClient, setCreateDialogOpen, setPostCreateOpen, setPostCreateUser, tAdmin]);

  const handleMergeUser = useCallback(async (targetUserId: string, sourceUserIds: string[]) => {
    const sources = sourceUserIds.filter((id) => id && id !== targetUserId);
    if (!targetUserId || sources.length === 0) return;
    setIsMerging(true);
    try {
      let mergedCount = 0;
      let noopCount = 0;
      for (const sourceId of sources) {
        const { data: mergeResult, error } = await supabaseClient.rpc("admin_merge_profiles", {
          p_source_user_id: sourceId,
          p_target_user_id: targetUserId,
        });
        if (error) throw error;
        const isNoop =
          mergeResult != null &&
          typeof mergeResult === "object" &&
          !Array.isArray(mergeResult) &&
          (mergeResult as { noop?: boolean }).noop === true;
        if (isNoop) noopCount += 1;
        else mergedCount += 1;
      }

      toast.success(
        tAdmin("people.success.usersMerged", {
          merged: mergedCount,
          noop: noopCount,
        }),
      );
      setMergeDialogOpen(false);
      setMergeSourceUser(null);
      if (selectedUser && sources.includes(selectedUser.id)) {
        setDetailOpen(false);
        setSelectedUser(null);
      }
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    } catch (err: unknown) {
      toast.error(tAdmin("common.errorWithMessage", { message: getErrorMessage(err, tAdmin("people.errors.mergeUserFailed")) }));
    } finally {
      setIsMerging(false);
    }
  }, [queryClient, selectedUser, setDetailOpen, setMergeDialogOpen, setMergeSourceUser, setSelectedUser, tAdmin]);

  const handleEditUser = useCallback(async (data: {
    full_name: string;
    primary_email_id: string | null;
    avatar_url: string | null;
    role: "admin" | "moderator" | "user";
    journey_tracking_ignored: boolean;
  }) => {
    if (!editUser) return;
    setIsUpdating(true);
    try {
      const { error } = await supabaseClient
        .from("profiles")
        .update({
          full_name: data.full_name,
          avatar_url: data.avatar_url,
        })
        .eq("id", editUser.id);
      if (error) throw error;

      const currentPrimaryEmailId = editUser.emails?.find((email) => email.is_primary)?.id ?? null;
      if (data.primary_email_id && data.primary_email_id !== currentPrimaryEmailId) {
        const { error: primaryEmailError } = await supabaseClient.rpc("set_primary_user_email", {
          p_email_id: data.primary_email_id,
        });
        if (primaryEmailError) throw primaryEmailError;
      }

      if (identityId !== editUser.id && data.role !== editUser.role) {
        const { error: roleError } = await supabaseClient.rpc("admin_update_user_role", {
          p_user_id: editUser.id,
          p_new_role: data.role,
        });
        if (roleError) throw roleError;
      }

      if (data.journey_tracking_ignored !== editUser.journey_tracking_ignored) {
        const { error: trackingError } = await supabaseClient.rpc("admin_set_user_tracking_ignore", {
          p_user_id: editUser.id,
          p_ignore: data.journey_tracking_ignored,
          p_reason: data.journey_tracking_ignored ? "Ignored by admin from Admin People edit dialog" : null,
        });
        if (trackingError) throw trackingError;
      }

      toast.success(tAdmin("people.success.userUpdated", { name: data.full_name }));
      setEditDialogOpen(false); setEditUser(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    } catch (err: unknown) {
      toast.error(tAdmin("common.errorWithMessage", { message: getErrorMessage(err, tAdmin("people.errors.updateUserFailed")) }));
    } finally { setIsUpdating(false); }
  }, [editUser, identityId, queryClient, setEditDialogOpen, setEditUser, tAdmin]);

  const updateAdminUserInCache = useCallback((userId: string, updater: (user: AdminUserRow) => AdminUserRow) => {
    const applyUpdate = (user: AdminUserRow | null) => (user?.id === userId ? updater(user) : user);

    setSelectedUser((current) => applyUpdate(current));
    setEditUser((current) => applyUpdate(current));
    queryClient.setQueryData<AdminUserRow[]>(["admin", "users"], (current) =>
      current?.map((user) => (user.id === userId ? updater(user) : user)),
    );
  }, [queryClient, setEditUser, setSelectedUser]);

  const handleSetPrimaryEmail = useCallback(async (user: AdminUserRow, emailId: string) => {
    setSettingPrimaryEmailId(emailId);
    try {
      const { error } = await supabaseClient.rpc("set_primary_user_email", {
        p_email_id: emailId,
      });
      if (error) throw error;

      const primaryEmail = user.emails?.find((email) => email.id === emailId);
      updateAdminUserInCache(user.id, (current) => ({
        ...current,
        email: primaryEmail?.email ?? current.email,
        emails: current.emails?.map((email) => ({
          ...email,
          is_primary: email.id === emailId,
        })),
      }));
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success(tAdmin("people.success.primaryEmailUpdated", { email: primaryEmail?.email ?? user.email }));
    } catch (err: unknown) {
      toast.error(tAdmin("common.errorWithMessage", {
        message: getErrorMessage(err, tAdmin("people.errors.updatePrimaryEmailFailed")),
      }));
    } finally {
      setSettingPrimaryEmailId(null);
    }
  }, [queryClient, tAdmin, updateAdminUserInCache]);

  const handleAddEmail = useCallback(async (user: AdminUserRow, email: string, makePrimary: boolean) => {
    setIsAddingEmail(true);
    try {
      const { data, error } = await supabaseClient.rpc("add_user_email", {
        p_email: email,
        p_user_id: user.id,
        p_make_primary: makePrimary,
      });
      if (error) throw error;
      if (!data) throw new Error("No email row returned");

      const addedEmail = data as NonNullable<AdminUserRow["emails"]>[number] & { normalized_email?: string };
      updateAdminUserInCache(user.id, (current) => {
        const nextEmail = {
          id: addedEmail.id,
          email: addedEmail.email,
          is_primary: addedEmail.is_primary || !(current.emails ?? []).some((entry) => entry.is_primary),
          receives_notifications: addedEmail.receives_notifications,
          is_verified: addedEmail.is_verified,
          source: addedEmail.source ?? "user",
        };
        const otherEmails = (current.emails ?? []).filter((entry) => entry.id !== nextEmail.id);
        const emails = nextEmail.is_primary
          ? otherEmails.map((entry) => ({ ...entry, is_primary: false })).concat(nextEmail)
          : otherEmails.concat(nextEmail);
        const primary = emails.find((entry) => entry.is_primary) ?? nextEmail;
        return {
          ...current,
          email: primary.email,
          emails,
        };
      });
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success(tAdmin("people.success.emailAdded", { email: addedEmail.email }));
    } catch (err: unknown) {
      toast.error(tAdmin("common.errorWithMessage", {
        message: getErrorMessage(err, tAdmin("people.errors.addEmailFailed")),
      }));
      throw err;
    } finally {
      setIsAddingEmail(false);
    }
  }, [queryClient, tAdmin, updateAdminUserInCache]);

  const handleRemoveEmail = useCallback(async (user: AdminUserRow, emailId: string) => {
    setRemovingEmailId(emailId);
    try {
      const { error } = await supabaseClient.rpc("remove_user_email", {
        p_email_id: emailId,
      });
      if (error) throw error;

      updateAdminUserInCache(user.id, (current) => {
        const emails = (current.emails ?? []).filter((entry) => entry.id !== emailId);
        const primary = emails.find((entry) => entry.is_primary);
        return {
          ...current,
          email: primary?.email ?? current.email,
          emails,
        };
      });
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      const removedEmail = user.emails?.find((entry) => entry.id === emailId);
      toast.success(tAdmin("people.success.emailRemoved", { email: removedEmail?.email ?? tAdmin("common.unknown") }));
    } catch (err: unknown) {
      toast.error(tAdmin("common.errorWithMessage", {
        message: getErrorMessage(err, tAdmin("people.errors.removeEmailFailed")),
      }));
      throw err;
    } finally {
      setRemovingEmailId(null);
    }
  }, [queryClient, tAdmin, updateAdminUserInCache]);

  return {
    isDeleting,
    isCreating,
    isUpdating,
    isMerging,
    isAddingEmail,
    settingPrimaryEmailId,
    removingEmailId,
    handleToggleJourneyTracking,
    handleToggleRole,
    handleDeleteUser,
    handleCreateUser,
    handleMergeUser,
    handleEditUser,
    handleSetPrimaryEmail,
    handleAddEmail,
    handleRemoveEmail,
  };
}
