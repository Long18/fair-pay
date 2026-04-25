import { useMemo, useState, useCallback, useEffect } from "react";
import { useGetIdentity, useGo } from "@refinedev/core";
import { useInstantUpdate, useInstantDelete } from "@/hooks/use-instant-mutation";
import { useHaptics } from "@/hooks/use-haptics";
import { useTable } from "@refinedev/react-table";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { toast } from "sonner";

import { AnimatedList } from "@/components/ui/animated-list";
import { AnimatedRow } from "@/components/ui/animated-row";
import { supabaseClient } from "@/utility/supabaseClient";
import { DataTable } from "@/components/refine-ui/data-table/data-table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Empty,
  EmptyMedia,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import {
  SearchIcon,
  UsersIcon,
  GroupIcon,
  HeartHandshakeIcon,
  MoreHorizontalIcon,
  FilterIcon,
  AlertTriangleIcon,
  Loader2Icon,
  ActivityIcon,
  UserPlusIcon,
  UserMinusIcon,
  PencilIcon,
  PlusIcon,
  ChevronDownIcon,
  ArchiveIcon,
  ArchiveRestoreIcon,
  StarIcon,
  MailIcon,
  SendIcon,
} from "@/components/ui/icons";
import { formatDate, formatNumber } from "@/lib/locale-utils";
import { buildInviteEmailPreview, normalizeInviteEmails } from "@/modules/admin/email/invite-email";
import type { Profile } from "@/modules/profile/types";
import type { AdminUserRow } from "../types";

// ─── Shared Types ───────────────────────────────────────────────────

interface GroupRow {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  created_by: string;
  creator_name: string;
  creator_avatar: string | null;
  member_count: number;
  total_expenses: number;
  is_archived: boolean;
  created_at: string;
}

interface FriendshipRow {
  id: string;
  user_a_id: string;
  user_a_name: string;
  user_a_avatar: string | null;
  user_b_id: string;
  user_b_name: string;
  user_b_avatar: string | null;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
}

interface InviteEmailResponse {
  success: boolean;
  sent?: number;
  failed?: number;
  errors?: string[];
  message?: string;
  error?: string;
}

async function sendInviteEmails(emails: string[], inviterName?: string): Promise<InviteEmailResponse> {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error("Không tìm thấy phiên đăng nhập admin");
  }

  const response = await fetch("/api/admin/email/send-invite", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.session.access_token}`,
    },
    body: JSON.stringify({
      emails,
      inviter_name: inviterName,
    }),
  });

  const raw = await response.text();
  const payload = raw ? (JSON.parse(raw) as InviteEmailResponse) : { success: response.ok };

  if (!response.ok || payload.success === false) {
    throw new Error(payload.error || payload.message || `HTTP ${response.status}`);
  }

  return payload;
}

// ─── Debounce Hook ──────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ─── User Detail Dialog (replaces Sheet) ────────────────────────────

function UserDetailDialog({
  user,
  open,
  onOpenChange,
  onEdit,
  onToggleRole,
  onToggleJourneyTracking,
  onDelete,
  onViewJourney,
  isSelf,
}: {
  user: AdminUserRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onToggleRole: () => void;
  onToggleJourneyTracking: () => void;
  onDelete: () => void;
  onViewJourney: () => void;
  isSelf: boolean;
}) {
  const [groups, setGroups] = useState<Array<{ id: string; name: string; role: string }>>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  // Add to group state
  const [addGroupOpen, setAddGroupOpen] = useState(false);
  const [allGroups, setAllGroups] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [addingToGroup, setAddingToGroup] = useState(false);
  const [removingGroupId, setRemovingGroupId] = useState<string | null>(null);

  const fetchGroups = useCallback(() => {
    if (!user) return;
    setLoadingGroups(true);
    supabaseClient
      .from("group_members")
      .select("role, groups!group_members_group_id_fkey(id, name)")
      .eq("user_id", user.id)
      .then(({ data, error }) => {
        if (!error && data) {
          setGroups(
            data.map((m: any) => ({
              id: m.groups?.id ?? "",
              name: m.groups?.name ?? "Không rõ",
              role: m.role ?? "member",
            })),
          );
        }
        setLoadingGroups(false);
      });
  }, [user?.id]);

  useEffect(() => {
    if (!user || !open) {
      setGroups([]);
      return;
    }
    fetchGroups();
  }, [user?.id, open, fetchGroups]);

  // Fetch all groups when add dialog opens
  useEffect(() => {
    if (!addGroupOpen) return;
    supabaseClient
      .from("groups")
      .select("id, name")
      .order("name")
      .then(({ data }) => {
        if (data) setAllGroups(data);
      });
  }, [addGroupOpen]);

  const availableGroups = useMemo(() => {
    const memberGroupIds = new Set(groups.map((g) => g.id));
    return allGroups.filter((g) => !memberGroupIds.has(g.id));
  }, [allGroups, groups]);

  const handleAddToGroup = useCallback(async () => {
    if (!user || !selectedGroupId) return;
    setAddingToGroup(true);
    try {
      const { error } = await supabaseClient
        .from("group_members")
        .insert({ group_id: selectedGroupId, user_id: user.id, role: "member" });
      if (error) {
        if (error.code === "23505") {
          toast.error("Người dùng đã là thành viên của nhóm");
        } else {
          throw error;
        }
      } else {
        toast.success("Đã thêm vào nhóm");
        setAddGroupOpen(false);
        setSelectedGroupId("");
        fetchGroups();
      }
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message}`);
    } finally {
      setAddingToGroup(false);
    }
  }, [user, selectedGroupId, fetchGroups]);

  const handleRemoveFromGroup = useCallback(async (groupId: string) => {
    if (!user) return;
    setRemovingGroupId(groupId);
    try {
      const { error } = await supabaseClient
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", user.id);
      if (error) throw error;
      toast.success("Đã xóa khỏi nhóm");
      fetchGroups();
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message}`);
    } finally {
      setRemovingGroupId(null);
    }
  }, [user, fetchGroups]);

  if (!user) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={user.avatar_url ?? undefined} alt={user.full_name} />
                <AvatarFallback>{user.full_name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle>{user.full_name}</DialogTitle>
                <DialogDescription>{user.email}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="profile" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="w-full">
              <TabsTrigger value="profile" className="flex-1">Hồ sơ</TabsTrigger>
              <TabsTrigger value="groups" className="flex-1">Nhóm ({groups.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="mt-4 space-y-4 overflow-y-auto flex-1">
              <div className="space-y-3">
                <DetailRow label="Email" value={user.email} />
                <DetailRow
                  label="Vai trò"
                  value={
                    <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                      {user.role === "admin" ? "Admin" : "User"}
                    </Badge>
                  }
                />
                <DetailRow
                  label="Journey tracking"
                  value={
                    <Badge variant={user.journey_tracking_ignored ? "outline" : "secondary"}>
                      {user.journey_tracking_ignored ? "Ignored" : "Tracked"}
                    </Badge>
                  }
                />
                <DetailRow label="Ngày tạo" value={formatDate(user.created_at)} />
                <DetailRow label="ID" value={<span className="text-xs font-mono">{user.id}</span>} />
              </div>

              {/* Actions inside modal */}
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                <Button size="sm" variant="outline" onClick={onViewJourney}>
                  <ActivityIcon className="mr-2 h-4 w-4" />
                  View journey
                </Button>
                <Button size="sm" variant="outline" onClick={onToggleJourneyTracking}>
                  {user.journey_tracking_ignored ? "Resume tracking" : "Ignore tracking"}
                </Button>
                <Button size="sm" variant="outline" onClick={onEdit}>
                  <PencilIcon className="mr-2 h-4 w-4" />
                  Chỉnh sửa
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onToggleRole}
                  disabled={isSelf}
                >
                  {user.role === "admin" ? "Hạ cấp thành User" : "Nâng cấp thành Admin"}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={onDelete}
                  disabled={isSelf}
                >
                  Xóa người dùng
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="groups" className="mt-4 overflow-y-auto flex-1">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">{groups.length} nhóm</span>
                <Button size="sm" variant="outline" onClick={() => setAddGroupOpen(true)}>
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Thêm vào nhóm
                </Button>
              </div>
              {loadingGroups ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2Icon className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : groups.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Chưa tham gia nhóm nào
                </p>
              ) : (
                <div className="space-y-2">
                  {groups.map((g) => (
                    <div key={g.id} className="flex items-center justify-between rounded-lg border p-3">
                      <span className="text-sm font-medium">{g.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant={g.role === "admin" ? "default" : "secondary"} className="text-xs">
                          {g.role === "admin" ? "Admin" : "Member"}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveFromGroup(g.id)}
                          disabled={removingGroupId === g.id}
                        >
                          {removingGroupId === g.id ? (
                            <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <UserMinusIcon className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Add to Group Dialog */}
      <Dialog open={addGroupOpen} onOpenChange={setAddGroupOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Thêm vào nhóm</DialogTitle>
            <DialogDescription>
              Thêm &ldquo;{user.full_name}&rdquo; vào một nhóm
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            <Label>Chọn nhóm</Label>
            <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn nhóm..." />
              </SelectTrigger>
              <SelectContent>
                {availableGroups.length === 0 ? (
                  <SelectItem value="__none" disabled>Không còn nhóm nào</SelectItem>
                ) : (
                  availableGroups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setAddGroupOpen(false)} disabled={addingToGroup}>Hủy</Button>
            <Button onClick={handleAddToGroup} disabled={addingToGroup || !selectedGroupId}>
              {addingToGroup ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : null}
              Thêm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

// ─── Group Detail Dialog (replaces Sheet) ───────────────────────────

function GroupDetailDialog({
  group,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onArchiveToggle,
}: {
  group: GroupRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onArchiveToggle?: () => void;
}) {
  const [members, setMembers] = useState<Array<{ id: string; full_name: string; avatar_url: string | null; role: string }>>([]);
  const [expenses, setExpenses] = useState<Array<{ id: string; description: string; amount: number; expense_date: string; paid_by_name: string }>>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingExpenses, setLoadingExpenses] = useState(false);

  // Add member state
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [allProfiles, setAllProfiles] = useState<Array<{ id: string; full_name: string; avatar_url: string | null }>>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [togglingRoleId, setTogglingRoleId] = useState<string | null>(null);

  const fetchMembers = useCallback(() => {
    if (!group) return;
    setLoadingMembers(true);
    supabaseClient
      .from("group_members")
      .select("role, profiles!group_members_user_id_fkey(id, full_name, avatar_url)")
      .eq("group_id", group.id)
      .then(({ data, error }) => {
        if (!error && data) {
          setMembers(
            data.map((m: any) => ({
              id: m.profiles?.id ?? "",
              full_name: m.profiles?.full_name ?? "Không rõ",
              avatar_url: m.profiles?.avatar_url ?? null,
              role: m.role ?? "member",
            })),
          );
        }
        setLoadingMembers(false);
      });
  }, [group?.id]);

  useEffect(() => {
    if (!group || !open) {
      setMembers([]);
      setExpenses([]);
      return;
    }

    fetchMembers();

    setLoadingExpenses(true);
    supabaseClient
      .from("expenses")
      .select("id, description, amount, expense_date, profiles!expenses_paid_by_user_id_fkey(full_name)")
      .eq("group_id", group.id)
      .order("expense_date", { ascending: false })
      .limit(10)
      .then(({ data, error }) => {
        if (!error && data) {
          setExpenses(
            data.map((e: any) => ({
              id: e.id,
              description: e.description ?? "",
              amount: e.amount ?? 0,
              expense_date: e.expense_date,
              paid_by_name: e.profiles?.full_name ?? "Không rõ",
            })),
          );
        }
        setLoadingExpenses(false);
      });
  }, [group?.id, open, fetchMembers]);

  useEffect(() => {
    if (!addMemberOpen) return;
    supabaseClient
      .from("profiles")
      .select("id, full_name, avatar_url")
      .order("full_name")
      .then(({ data }) => {
        if (data) setAllProfiles(data);
      });
  }, [addMemberOpen]);

  const availableProfiles = useMemo(() => {
    const memberIds = new Set(members.map((m) => m.id));
    return allProfiles.filter((p) => !memberIds.has(p.id));
  }, [allProfiles, members]);

  const handleAddMember = useCallback(async () => {
    if (!group || !selectedUserId) return;
    setAddingMember(true);
    try {
      const { error } = await supabaseClient
        .from("group_members")
        .insert({ group_id: group.id, user_id: selectedUserId, role: "member" });
      if (error) {
        if (error.code === "23505") {
          toast.error("Người dùng đã là thành viên của nhóm");
        } else {
          throw error;
        }
      } else {
        toast.success("Đã thêm thành viên vào nhóm");
        setAddMemberOpen(false);
        setSelectedUserId("");
        fetchMembers();
      }
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message}`);
    } finally {
      setAddingMember(false);
    }
  }, [group, selectedUserId, fetchMembers]);

  const handleRemoveMember = useCallback(async (userId: string) => {
    if (!group) return;
    setRemovingMemberId(userId);
    try {
      const { error } = await supabaseClient
        .from("group_members")
        .delete()
        .eq("group_id", group.id)
        .eq("user_id", userId);
      if (error) throw error;
      toast.success("Đã xóa thành viên khỏi nhóm");
      fetchMembers();
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message}`);
    } finally {
      setRemovingMemberId(null);
    }
  }, [group, fetchMembers]);

  const handleToggleRole = useCallback(async (userId: string, currentRole: string) => {
    if (!group) return;
    setTogglingRoleId(userId);
    const newRole = currentRole === "admin" ? "member" : "admin";
    try {
      const { error } = await supabaseClient
        .from("group_members")
        .update({ role: newRole })
        .eq("group_id", group.id)
        .eq("user_id", userId);
      if (error) throw error;
      toast.success(newRole === "admin" ? "Đã nâng cấp thành Admin" : "Đã hạ cấp thành Member");
      fetchMembers();
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message}`);
    } finally {
      setTogglingRoleId(null);
    }
  }, [group, fetchMembers]);

  if (!group) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={group.avatar_url ?? undefined} alt={group.name} />
                <AvatarFallback className="text-sm font-semibold bg-primary/10 text-primary">
                  {group.name?.[0]?.toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <DialogTitle className="truncate">{group.name}</DialogTitle>
                  {group.is_archived && (
                    <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800 text-xs shrink-0">
                      Archived
                    </Badge>
                  )}
                </div>
                <DialogDescription>
                  Tạo bởi {group.creator_name} · {formatDate(group.created_at)}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="members" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="w-full">
              <TabsTrigger value="members" className="flex-1">Thành viên ({members.length})</TabsTrigger>
              <TabsTrigger value="expenses" className="flex-1">Chi phí</TabsTrigger>
            </TabsList>

            <TabsContent value="members" className="mt-4 overflow-y-auto flex-1">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">{members.length} thành viên</span>
                <Button size="sm" variant="outline" onClick={() => setAddMemberOpen(true)}>
                  <UserPlusIcon className="mr-2 h-4 w-4" />
                  Thêm
                </Button>
              </div>
              {loadingMembers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2Icon className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : members.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Không có thành viên</p>
              ) : (
                <div className="space-y-2">
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 rounded-lg border p-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={m.avatar_url ?? undefined} alt={m.full_name} />
                        <AvatarFallback className="text-xs">{m.full_name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.full_name}</p>
                      </div>
                      <Badge variant={m.role === "admin" ? "default" : "secondary"} className="text-xs">
                        {m.role === "admin" ? "Admin" : "Member"}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground"
                            disabled={removingMemberId === m.id || togglingRoleId === m.id}
                          >
                            {(removingMemberId === m.id || togglingRoleId === m.id) ? (
                              <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <MoreHorizontalIcon className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleToggleRole(m.id, m.role)}>
                            <StarIcon className="mr-2 h-4 w-4" />
                            {m.role === "admin" ? "Hạ cấp thành Member" : "Nâng cấp thành Admin"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleRemoveMember(m.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <UserMinusIcon className="mr-2 h-4 w-4" />
                            Xóa khỏi nhóm
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="expenses" className="mt-4 overflow-y-auto flex-1">
              <div className="space-y-3">
                <DetailRow label="Tổng chi phí" value={formatNumber(group.total_expenses)} />
                {loadingExpenses ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2Icon className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : expenses.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Chưa có chi phí nào</p>
                ) : (
                  <div className="space-y-2">
                    {expenses.map((e) => (
                      <div key={e.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{e.description}</p>
                          <p className="text-xs text-muted-foreground">{e.paid_by_name} · {formatDate(e.expense_date)}</p>
                        </div>
                        <span className="text-sm font-mono tabular-nums ml-3">{formatNumber(e.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Actions inside modal */}
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <Button size="sm" variant="outline" onClick={onEdit}>
              <PencilIcon className="mr-2 h-4 w-4" />
              Chỉnh sửa nhóm
            </Button>
            {onArchiveToggle && (
              <Button size="sm" variant="outline" onClick={onArchiveToggle}>
                {group.is_archived ? (
                  <><ArchiveRestoreIcon className="mr-2 h-4 w-4" />Khôi phục</>
                ) : (
                  <><ArchiveIcon className="mr-2 h-4 w-4" />Lưu trữ</>
                )}
              </Button>
            )}
            <Button size="sm" variant="destructive" onClick={onDelete}>
              Xóa nhóm
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Thêm thành viên</DialogTitle>
            <DialogDescription>Thêm người dùng vào nhóm &ldquo;{group.name}&rdquo;</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            <Label>Chọn người dùng</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn người dùng..." />
              </SelectTrigger>
              <SelectContent>
                {availableProfiles.length === 0 ? (
                  <SelectItem value="__none" disabled>Không còn người dùng nào</SelectItem>
                ) : (
                  availableProfiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setAddMemberOpen(false)} disabled={addingMember}>Hủy</Button>
            <Button onClick={handleAddMember} disabled={addingMember || !selectedUserId}>
              {addingMember ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : null}
              Thêm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Shared Confirmation Dialogs ────────────────────────────────────

function DeleteConfirmDialog({
  title,
  description,
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
}: {
  title: string;
  description: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangleIcon className="h-5 w-5 text-destructive" />
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={(e) => { e.preventDefault(); onConfirm(); }}
            disabled={isDeleting}
          >
            {isDeleting ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : null}
            Xóa
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Create User Dialog ──────────────────────────────────────────────

function CreateUserDialog({
  open,
  onOpenChange,
  onSubmit,
  isCreating,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { full_name: string; email: string; role: string }) => void;
  isCreating: boolean;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");

  useEffect(() => {
    if (!open) { setFullName(""); setEmail(""); setRole("user"); }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tạo người dùng mới</DialogTitle>
          <DialogDescription>Thêm hồ sơ người dùng mới vào hệ thống</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="user-name">Họ tên</Label>
            <Input id="user-name" placeholder="Nhập họ tên..." value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-email">Email</Label>
            <Input id="user-email" type="email" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-role">Vai trò</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="user-role"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>Hủy</Button>
          <Button onClick={() => { if (!fullName || !email) { toast.error("Vui lòng điền đầy đủ thông tin"); return; } onSubmit({ full_name: fullName, email, role }); }} disabled={isCreating || !fullName || !email}>
            {isCreating ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : null}
            Tạo người dùng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit User Dialog ───────────────────────────────────────────────

function EditUserDialog({
  user,
  open,
  onOpenChange,
  onSubmit,
  isUpdating,
}: {
  user: AdminUserRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { full_name: string; email: string }) => void;
  isUpdating: boolean;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (user && open) { setFullName(user.full_name); setEmail(user.email); }
  }, [user, open]);

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa hồ sơ</DialogTitle>
          <DialogDescription>Cập nhật thông tin người dùng &ldquo;{user.full_name}&rdquo;</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="edit-user-name">Họ tên</Label>
            <Input id="edit-user-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-user-email">Email</Label>
            <Input id="edit-user-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdating}>Hủy</Button>
          <Button onClick={() => onSubmit({ full_name: fullName, email })} disabled={isUpdating || !fullName || !email}>
            {isUpdating ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : null}
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Group Name Dialog ─────────────────────────────────────────

function EditGroupDialog({
  group,
  open,
  onOpenChange,
  onConfirm,
  isUpdating,
}: {
  group: GroupRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: { name: string; description: string }) => void;
  isUpdating: boolean;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (group && open) {
      setName(group.name);
      setDescription(group.description ?? "");
    }
  }, [group, open]);

  if (!group) return null;

  const hasChanges = name.trim() !== group.name || description.trim() !== (group.description ?? "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={group.avatar_url ?? undefined} alt={group.name} />
              <AvatarFallback className="text-sm bg-primary/10 text-primary">
                {group.name?.[0]?.toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle>Chỉnh sửa nhóm</DialogTitle>
              <DialogDescription>Cập nhật thông tin nhóm &ldquo;{group.name}&rdquo;</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="group-name">Tên nhóm</Label>
            <Input id="group-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nhập tên nhóm..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="group-description">Mô tả</Label>
            <Input id="group-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Mô tả nhóm (tùy chọn)..." />
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdating}>Hủy</Button>
          <Button onClick={() => onConfirm({ name: name.trim(), description: description.trim() })} disabled={isUpdating || !name.trim() || !hasChanges}>
            {isUpdating ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : null}
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Friendship Status Badge ────────────────────────────────────────

const FRIENDSHIP_STATUS = {
  accepted: { label: "Đã chấp nhận", className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800" },
  pending: { label: "Chờ xử lý", className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800" },
  rejected: { label: "Từ chối", className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800" },
} as const;

function FriendshipStatusBadge({ status }: { status: keyof typeof FRIENDSHIP_STATUS }) {
  const config = FRIENDSHIP_STATUS[status];
  return <Badge className={config.className}>{config.label}</Badge>;
}

// ─── New Registration Card ──────────────────────────────────────────

function NewRegistrationCard({
  user,
  onViewDetail,
}: {
  user: AdminUserRow;
  onViewDetail: () => void;
}) {
  const daysSinceRegistration = Math.floor(
    (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24),
  );

  return (
    <div
      className="flex items-center gap-3 rounded-lg border p-4 cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={onViewDetail}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onViewDetail(); }}
    >
      <Avatar className="h-10 w-10">
        <AvatarImage src={user.avatar_url ?? undefined} alt={user.full_name} />
        <AvatarFallback>{user.full_name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{user.full_name}</p>
        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs text-muted-foreground">{formatDate(user.created_at)}</p>
        <Badge
          variant="secondary"
          className={
            daysSinceRegistration <= 1
              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800 text-xs mt-1"
              : daysSinceRegistration <= 7
                ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800 text-xs mt-1"
                : "text-xs mt-1"
          }
        >
          {daysSinceRegistration === 0
            ? "Hôm nay"
            : daysSinceRegistration === 1
              ? "Hôm qua"
              : `${daysSinceRegistration} ngày trước`}
        </Badge>
      </div>
    </div>
  );
}

function InviteUsersCard({
  inviterName,
}: {
  inviterName?: string | null;
}) {
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
      toast.error("Nhập ít nhất một email hợp lệ");
      return;
    }

    tap();
    setIsSendingInvite(true);
    try {
      const result = await sendInviteEmails(inviteEmails, inviterName || undefined);
      success();
      toast.success(result.message || `Đã gửi ${result.sent ?? inviteEmails.length} email mời`);
      setEmailInput("");
    } catch (error) {
      warning();
      toast.error(error instanceof Error ? error.message : "Không gửi được email mời");
    } finally {
      setIsSendingInvite(false);
    }
  }, [inviteEmails, inviterName, success, tap, warning]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-muted/20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <MailIcon className="h-4 w-4 text-primary" />
              <CardTitle>Mời người dùng qua email</CardTitle>
            </div>
            <CardDescription>
              Nhập email để preview và gửi lời mời bằng hệ thống email hiện có của FairPay.
            </CardDescription>
          </div>
          <Badge variant="secondary" className="w-fit">
            Gmail-style preview
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-0 p-0 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-4 border-b p-4 lg:border-b-0 lg:border-r">
          <div className="space-y-2">
            <Label htmlFor="invite-emails">Email người nhận</Label>
            <Textarea
              id="invite-emails"
              value={emailInput}
              onChange={(event) => setEmailInput(event.target.value)}
              placeholder="friend@example.com, teammate@example.com"
              className="min-h-28 resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Có thể nhập nhiều email, phân tách bằng dấu phẩy, khoảng trắng hoặc xuống dòng.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {inviteEmails.length ? (
              inviteEmails.map((email) => (
                <Badge key={email} variant="outline" className="font-normal">
                  {email}
                </Badge>
              ))
            ) : (
              <Badge variant="outline" className="font-normal text-muted-foreground">
                Chưa có email hợp lệ
              </Badge>
            )}
          </div>

          {invalidEmailCount > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Bỏ qua {invalidEmailCount} email chưa đúng định dạng.
            </p>
          )}

          <Button
            className="w-full"
            onClick={handleSendInvite}
            disabled={isSendingInvite || inviteEmails.length === 0}
          >
            {isSendingInvite ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : <SendIcon className="mr-2 h-4 w-4" />}
            Gửi lời mời
          </Button>
        </div>

        <div className="min-w-0 bg-background">
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{invitePreview.subject}</p>
              <p className="truncate text-xs text-muted-foreground">{invitePreview.previewText}</p>
            </div>
            <Badge variant="outline" className="shrink-0">
              Preview
            </Badge>
          </div>
          <div className="grid gap-3 border-b px-4 py-3 text-sm sm:grid-cols-[72px_minmax(0,1fr)]">
            <span className="text-muted-foreground">From</span>
            <span className="truncate">FairPay &lt;email hiện có&gt;</span>
            <span className="text-muted-foreground">To</span>
            <span className="truncate">{inviteEmails.length ? inviteEmails.join(", ") : "email@example.com"}</span>
          </div>
          <div className="h-[420px] bg-muted/30 p-3">
            <iframe
              title="FairPay invite email preview"
              srcDoc={invitePreview.html}
              sandbox=""
              className="h-full w-full rounded-lg border bg-white shadow-sm"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


// ═══════════════════════════════════════════════════════════════════
// ─── USERS TAB ──────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

function UsersTab() {
  const { tap, warning } = useHaptics();
  const { data: identity } = useGetIdentity<Profile>();
  const go = useGo();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  // Detail dialog
  const [selectedUser, setSelectedUser] = useState<AdminUserRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Delete
  const [deleteUser, setDeleteUser] = useState<AdminUserRow | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Create
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Edit
  const [editUser, setEditUser] = useState<AdminUserRow | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // New registrations (7 days)
  const NEW_REG_DAYS = 7;

  // Fetch Users
  const { data: usersData, isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const { data, error } = await supabaseClient.rpc("get_admin_users");
      if (error) throw error;
      return (data ?? []) as AdminUserRow[];
    },
    staleTime: 30_000,
  });

  // New Registrations
  const newRegistrations = useMemo(() => {
    if (!usersData) return [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - NEW_REG_DAYS);
    return usersData
      .filter((u) => new Date(u.created_at) >= cutoff)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [usersData]);

  // Client-side filtering
  const filteredData = useMemo(() => {
    let result = usersData ?? [];
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter((u) => u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
    }
    if (roleFilter !== "all") {
      result = result.filter((u) => u.role === roleFilter);
    }
    return result;
  }, [usersData, debouncedSearch, roleFilter]);

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
          ? `Đã ignore tracking cho ${user.full_name}`
          : `Đã bật lại tracking cho ${user.full_name}`,
      );

      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "users", user.id] });

      if (selectedUser?.id === user.id) {
        setSelectedUser({ ...user, journey_tracking_ignored: nextIgnored });
      }
    } catch (error) {
      toast.error(`Lỗi: ${error instanceof Error ? error.message : "Không thể cập nhật journey tracking"}`);
    }
  }, [queryClient, selectedUser]);

  // Columns
  const columns = useMemo<ColumnDef<AdminUserRow>[]>(() => [
    {
      id: "avatar", header: "", accessorKey: "avatar_url", size: 50, enableSorting: false,
      cell: ({ row }) => (
        <Avatar className="h-8 w-8">
          <AvatarImage src={row.original.avatar_url ?? undefined} alt={row.original.full_name} />
          <AvatarFallback className="text-xs">{row.original.full_name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
        </Avatar>
      ),
    },
    { id: "full_name", header: "Tên", accessorKey: "full_name", size: 180 },
    { id: "email", header: "Email", accessorKey: "email", size: 220 },
    {
      id: "role", header: "Vai trò", accessorFn: (row) => row.role, size: 100,
      cell: ({ row }) => (
        <Badge variant={row.original.role === "admin" ? "default" : "secondary"}>
          {row.original.role === "admin" ? "Admin" : "User"}
        </Badge>
      ),
    },
    {
      id: "journey_tracking_ignored", header: "Journey", accessorFn: (row) => row.journey_tracking_ignored, size: 120,
      cell: ({ row }) => (
        <Badge variant={row.original.journey_tracking_ignored ? "outline" : "secondary"}>
          {row.original.journey_tracking_ignored ? "Ignored" : "Tracked"}
        </Badge>
      ),
    },
    {
      id: "created_at", header: "Ngày tạo", accessorKey: "created_at", size: 160,
      cell: ({ getValue }) => {
        const dateStr = getValue() as string;
        const daysSince = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
        const isNew = daysSince <= NEW_REG_DAYS;
        return (
          <div className="flex items-center gap-1.5">
            <span>{formatDate(dateStr)}</span>
            {isNew && (
              <Badge
                variant="secondary"
                className={
                  daysSince <= 1
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800 text-[10px] leading-none px-1.5 py-0.5"
                    : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800 text-[10px] leading-none px-1.5 py-0.5"
                }
              >
                {daysSince === 0 ? "Hôm nay" : daysSince === 1 ? "Hôm qua" : "Mới"}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      id: "actions", header: "", size: 50, enableSorting: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontalIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { tap(); setSelectedUser(row.original); setDetailOpen(true); }}>
              Xem chi tiết
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { tap(); go({ to: `/admin/people/${row.original.id}/journey` }); }}>
              <ActivityIcon className="mr-2 h-4 w-4" />
              View journey
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { tap(); void handleToggleJourneyTracking(row.original); }}>
              {row.original.journey_tracking_ignored ? "Resume tracking" : "Ignore tracking"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { tap(); setEditUser(row.original); setEditDialogOpen(true); }}>
              <PencilIcon className="mr-2 h-4 w-4" />
              Chỉnh sửa
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { warning(); setDeleteUser(row.original); setDeleteDialogOpen(true); }} disabled={identity?.id === row.original.id} className="text-destructive">
              {identity?.id === row.original.id ? "Không thể xóa chính mình" : "Xóa người dùng"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [go, identity?.id, tap, warning, handleToggleJourneyTracking]);

  const [sorting, setSorting] = useState<SortingState>([{ id: "created_at", desc: true }]);

  const reactTable = useReactTable({
    data: filteredData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  // Handlers
  const handleToggleRole = useCallback((user: AdminUserRow) => {
    if (identity?.id === user.id) { toast.warning("Không thể thay đổi vai trò của chính mình"); return; }
    const newRole = user.role === "admin" ? "user" : "admin";
    (async () => {
      try {
        const { data, error } = await supabaseClient.rpc("admin_update_user_role", {
          p_user_id: user.id,
          p_new_role: newRole,
        });
        if (error) throw error;
        toast.success(`Đã ${newRole === "admin" ? "nâng cấp" : "hạ cấp"} vai trò của ${user.full_name}`);
        queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      } catch (error) {
        toast.error(`Lỗi: ${error instanceof Error ? error.message : "Không thể thay đổi vai trò"}`);
      }
    })();
  }, [identity?.id, queryClient]);

  const handleDeleteUser = useCallback(async () => {
    if (!deleteUser) return;
    setIsDeleting(true);
    try {
      const { error } = await supabaseClient.from("profiles").delete().eq("id", deleteUser.id);
      if (error) throw error;
      toast.success(`Đã xóa người dùng "${deleteUser.full_name}"`);
      setDeleteDialogOpen(false); setDeleteUser(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message ?? "Không thể xóa người dùng"}`);
    } finally { setIsDeleting(false); }
  }, [deleteUser, queryClient]);

  const handleCreateUser = useCallback(async (data: { full_name: string; email: string; role: string }) => {
    setIsCreating(true);
    try {
      const { error } = await supabaseClient.from("profiles").insert({ full_name: data.full_name, email: data.email });
      if (error) throw error;
      if (data.role === "admin") {
        const { data: newProfile } = await supabaseClient.from("profiles").select("id").eq("email", data.email).single();
        if (newProfile) await supabaseClient.from("user_roles").upsert({ user_id: newProfile.id, role: "admin" });
      }
      toast.success(`Đã tạo người dùng "${data.full_name}"`);
      setCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message ?? "Không thể tạo người dùng"}`);
    } finally { setIsCreating(false); }
  }, [queryClient]);

  const handleEditUser = useCallback(async (data: { full_name: string; email: string }) => {
    if (!editUser) return;
    setIsUpdating(true);
    try {
      const { error } = await supabaseClient.from("profiles").update({ full_name: data.full_name, email: data.email }).eq("id", editUser.id);
      if (error) throw error;
      toast.success(`Đã cập nhật hồ sơ "${data.full_name}"`);
      setEditDialogOpen(false); setEditUser(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message ?? "Không thể cập nhật hồ sơ"}`);
    } finally { setIsUpdating(false); }
  }, [editUser, queryClient]);

  const clearFilters = useCallback(() => { setSearch(""); setRoleFilter("all"); }, []);
  const hasActiveFilters = search !== "" || roleFilter !== "all";
  const isEmptyResult = !isLoading && reactTable.getRowModel().rows.length === 0;

  return (
    <>
      <div className="space-y-4">
        {/* ── New Registrations Collapsible ──────────────────────── */}
        {!isLoading && newRegistrations.length > 0 && (
          <Collapsible defaultOpen>
            <Card>
              <CardHeader className="pb-3">
                <CollapsibleTrigger className="flex w-full items-center justify-between [&[data-state=open]>svg]:rotate-180">
                  <div className="flex items-center gap-2">
                    <UserPlusIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <CardTitle className="text-base">Đăng ký mới</CardTitle>
                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800 text-xs">
                      {newRegistrations.length}
                    </Badge>
                  </div>
                  <ChevronDownIcon className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
                </CollapsibleTrigger>
                <CardDescription>Người dùng đăng ký trong {NEW_REG_DAYS} ngày qua</CardDescription>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <AnimatedList items={newRegistrations}>
                    {newRegistrations.map((user, index) => (
                      <AnimatedRow key={user.id} index={index}>
                        <NewRegistrationCard
                          user={user}
                          onViewDetail={() => {
                            setSelectedUser(user);
                            setDetailOpen(true);
                          }}
                        />
                      </AnimatedRow>
                    ))}
                  </AnimatedList>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        {/* ── Users Table ────────────────────────────────────────── */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle>Quản lý người dùng</CardTitle>
              <CardDescription>Xem và quản lý tất cả người dùng trong hệ thống</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => { tap(); setCreateDialogOpen(true); }}>
                <PlusIcon className="mr-2 h-4 w-4" />
                Tạo người dùng
              </Button>
              <Button variant="outline" size="sm" onClick={() => { tap(); setShowFilters((v) => !v); }}>
                <FilterIcon className="mr-2 h-4 w-4" />
                Bộ lọc
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative max-w-sm">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Tìm kiếm theo tên hoặc email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            {showFilters && (
              <div className="flex items-center gap-3 flex-wrap">
                <Select value={roleFilter} onValueChange={(v) => { tap(); setRoleFilter(v); }}>
                  <SelectTrigger className="w-[150px]"><SelectValue placeholder="Vai trò" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả vai trò</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
                {hasActiveFilters && <Button variant="ghost" size="sm" onClick={clearFilters}>Xóa bộ lọc</Button>}
              </div>
            )}

            {isEmptyResult && hasActiveFilters ? (
              <Empty className="min-h-[400px]">
                <EmptyMedia variant="icon"><UsersIcon className="h-6 w-6" /></EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle>Không tìm thấy người dùng</EmptyTitle>
                  <EmptyDescription>Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</EmptyDescription>
                </EmptyHeader>
                <EmptyContent><Button variant="outline" onClick={clearFilters}>Xóa bộ lọc</Button></EmptyContent>
              </Empty>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    {reactTable.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id} style={{ width: header.getSize() }}>
                            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">Đang tải...</TableCell></TableRow>
                    ) : reactTable.getRowModel().rows.length ? (
                      reactTable.getRowModel().rows.map((row) => (
                        <TableRow key={row.original?.id ?? row.id}>
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id} style={{ width: cell.column.getSize() }}>
                              <div className="truncate">{flexRender(cell.column.columnDef.cell, cell.getContext())}</div>
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">Không có dữ liệu</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {!isLoading && reactTable.getRowModel().rows.length > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Trang {reactTable.getState().pagination.pageIndex + 1} / {reactTable.getPageCount()}</p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => reactTable.previousPage()} disabled={!reactTable.getCanPreviousPage()}>Trước</Button>
                  <Button variant="outline" size="sm" onClick={() => reactTable.nextPage()} disabled={!reactTable.getCanNextPage()}>Sau</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <UserDetailDialog
        user={selectedUser}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onViewJourney={() => {
          if (!selectedUser) return;
          tap();
          setDetailOpen(false);
          go({ to: `/admin/people/${selectedUser.id}/journey` });
        }}
        onToggleJourneyTracking={() => {
          if (!selectedUser) return;
          void handleToggleJourneyTracking(selectedUser);
        }}
        onEdit={() => { setDetailOpen(false); setEditUser(selectedUser); setEditDialogOpen(true); }}
        onToggleRole={() => { if (selectedUser) handleToggleRole(selectedUser); }}
        onDelete={() => { setDetailOpen(false); setDeleteUser(selectedUser); setDeleteDialogOpen(true); }}
        isSelf={identity?.id === selectedUser?.id}
      />
      <DeleteConfirmDialog
        title="Xác nhận xóa người dùng"
        description={`Bạn có chắc chắn muốn xóa người dùng "${deleteUser?.full_name ?? ""}" (${deleteUser?.email ?? ""})? Tất cả dữ liệu liên quan sẽ bị xóa theo. Hành động này không thể hoàn tác.`}
        open={deleteDialogOpen}
        onOpenChange={(o) => { if (!o && !isDeleting) { setDeleteDialogOpen(false); setDeleteUser(null); } }}
        onConfirm={handleDeleteUser}
        isDeleting={isDeleting}
      />
      <CreateUserDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} onSubmit={handleCreateUser} isCreating={isCreating} />
      <EditUserDialog user={editUser} open={editDialogOpen} onOpenChange={(o) => { if (!o && !isUpdating) { setEditDialogOpen(false); setEditUser(null); } }} onSubmit={handleEditUser} isUpdating={isUpdating} />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ─── GROUPS TAB ─────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

function GroupsTab() {
  const { tap, warning } = useHaptics();
  const deleteMutation = useInstantDelete();
  const updateMutation = useInstantUpdate();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  // Detail dialog
  const [selectedGroup, setSelectedGroup] = useState<GroupRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Delete
  const [deleteGroup, setDeleteGroup] = useState<GroupRow | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit
  const [editGroup, setEditGroup] = useState<GroupRow | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Archive
  const [isArchiving, setIsArchiving] = useState(false);

  const filters = useMemo(() => {
    const f: Array<{ field: string; operator: string; value: unknown }> = [];
    if (debouncedSearch) f.push({ field: "name", operator: "contains", value: debouncedSearch });
    return f;
  }, [debouncedSearch]);

  const columns = useMemo<ColumnDef<GroupRow>[]>(() => [
    {
      id: "name", header: "Tên nhóm", accessorKey: "name", size: 220,
      cell: ({ row }) => (
        <div className="flex items-center gap-2.5">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={row.original.avatar_url ?? undefined} alt={row.original.name} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {row.original.name?.[0]?.toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium truncate">{row.original.name}</span>
              {row.original.is_archived && (
                <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800 text-[10px] px-1.5 py-0">
                  Archived
                </Badge>
              )}
            </div>
            {row.original.description && (
              <p className="text-xs text-muted-foreground truncate max-w-[180px]">{row.original.description}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      id: "creator", header: "Người tạo", accessorKey: "creator_name", size: 160, enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarImage src={row.original.creator_avatar ?? undefined} alt={row.original.creator_name} />
            <AvatarFallback className="text-xs">{row.original.creator_name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
          </Avatar>
          <span className="text-sm">{row.original.creator_name}</span>
        </div>
      ),
    },
    {
      id: "member_count", header: "Thành viên", accessorKey: "member_count", size: 90,
      cell: ({ getValue }) => <Badge variant="secondary">{getValue() as number}</Badge>,
    },
    {
      id: "total_expenses", header: () => <div className="text-right">Tổng chi phí</div>, accessorKey: "total_expenses", size: 130,
      cell: ({ getValue }) => <div className="text-right font-mono tabular-nums">{formatNumber(getValue() as number)}</div>,
    },
    {
      id: "created_at", header: "Ngày tạo", accessorKey: "created_at", size: 110,
      cell: ({ getValue }) => formatDate(getValue() as string),
    },
    {
      id: "actions", header: "", size: 50, enableSorting: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontalIcon className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { tap(); setSelectedGroup(row.original); setDetailOpen(true); }}>Xem chi tiết</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { tap(); setEditGroup(row.original); setEditDialogOpen(true); }}>
              <PencilIcon className="mr-2 h-4 w-4" />Chỉnh sửa nhóm
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleArchiveToggle(row.original)}>
              {row.original.is_archived ? (
                <><ArchiveRestoreIcon className="mr-2 h-4 w-4" />Khôi phục</>
              ) : (
                <><ArchiveIcon className="mr-2 h-4 w-4" />Lưu trữ</>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { warning(); setDeleteGroup(row.original); setDeleteDialogOpen(true); }} className="text-destructive">Xóa nhóm</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], []);

  const table = useTable<GroupRow>({
    columns,
    refineCoreProps: {
      resource: "groups",
      meta: { select: "*, profiles!groups_created_by_fkey(full_name, avatar_url), group_members(count)" },
      pagination: { pageSize: 10 },
      filters: { permanent: filters as any },
      sorters: { initial: [{ field: "created_at", order: "desc" }] },
      queryOptions: {
        select: (data) => ({
          ...data,
          data: data.data.map((group: any) => ({
            id: group.id,
            name: group.name ?? "",
            description: group.description ?? null,
            avatar_url: group.avatar_url ?? null,
            created_by: group.created_by ?? "",
            creator_name: group.profiles?.full_name ?? "Không rõ",
            creator_avatar: group.profiles?.avatar_url ?? null,
            member_count: group.group_members?.[0]?.count ?? 0,
            total_expenses: group.total_expenses ?? 0,
            is_archived: group.is_archived ?? false,
            created_at: group.created_at,
          })),
        }),
      },
    },
  });

  const handleDelete = useCallback(() => {
    if (!deleteGroup) return;
    setIsDeleting(true);
    deleteMutation.mutate(
      { resource: "groups", id: deleteGroup.id },
      {
        onSuccess: () => { toast.success(`Đã xóa nhóm "${deleteGroup.name}"`); setDeleteDialogOpen(false); setDeleteGroup(null); setIsDeleting(false); table.refineCore.tableQuery.refetch(); },
        onError: (error) => { toast.error(`Lỗi: ${error.message}`); setIsDeleting(false); },
      },
    );
  }, [deleteGroup, deleteMutation, table.refineCore.tableQuery]);

  const handleEdit = useCallback((data: { name: string; description: string }) => {
    if (!editGroup || !data.name) return;
    setIsUpdating(true);
    updateMutation.mutate(
      { resource: "groups", id: editGroup.id, values: { name: data.name, description: data.description || null } },
      {
        onSuccess: () => { toast.success(`Đã cập nhật nhóm "${data.name}"`); setEditDialogOpen(false); setEditGroup(null); setIsUpdating(false); table.refineCore.tableQuery.refetch(); },
        onError: (error) => { toast.error(`Lỗi: ${error.message}`); setIsUpdating(false); },
      },
    );
  }, [editGroup, updateMutation, table.refineCore.tableQuery]);

  const handleArchiveToggle = useCallback((group: GroupRow) => {
    setIsArchiving(true);
    const newArchived = !group.is_archived;
    updateMutation.mutate(
      {
        resource: "groups",
        id: group.id,
        values: {
          is_archived: newArchived,
          archived_at: newArchived ? new Date().toISOString() : null,
          archived_by: null,
        },
      },
      {
        onSuccess: () => {
          toast.success(newArchived ? `Đã lưu trữ nhóm "${group.name}"` : `Đã khôi phục nhóm "${group.name}"`);
          setIsArchiving(false);
          table.refineCore.tableQuery.refetch();
          // Also refresh detail dialog if open
          if (detailOpen && selectedGroup?.id === group.id) {
            setSelectedGroup({ ...group, is_archived: newArchived });
          }
        },
        onError: (error) => { toast.error(`Lỗi: ${error.message}`); setIsArchiving(false); },
      },
    );
  }, [updateMutation, table.refineCore.tableQuery, detailOpen, selectedGroup]);

  const clearFilters = useCallback(() => setSearch(""), []);
  const hasActiveFilters = search !== "";
  const isEmptyResult = !table.refineCore.tableQuery.isLoading && table.reactTable.getRowModel().rows.length === 0;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Quản lý nhóm</CardTitle>
            <CardDescription>Xem và quản lý tất cả nhóm trong hệ thống</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-sm">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Tìm kiếm theo tên nhóm..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          {isEmptyResult && hasActiveFilters ? (
            <Empty className="min-h-[400px]">
              <EmptyMedia variant="icon"><GroupIcon className="h-6 w-6" /></EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>Không tìm thấy nhóm</EmptyTitle>
                <EmptyDescription>Thử thay đổi từ khóa tìm kiếm</EmptyDescription>
              </EmptyHeader>
              <EmptyContent><Button variant="outline" onClick={clearFilters}>Xóa bộ lọc</Button></EmptyContent>
            </Empty>
          ) : (
            <DataTable table={table} />
          )}
        </CardContent>
      </Card>

      <GroupDetailDialog
        group={selectedGroup}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={() => { setDetailOpen(false); setEditGroup(selectedGroup); setEditDialogOpen(true); }}
        onDelete={() => { setDetailOpen(false); setDeleteGroup(selectedGroup); setDeleteDialogOpen(true); }}
        onArchiveToggle={() => { if (selectedGroup) handleArchiveToggle(selectedGroup); }}
      />
      <DeleteConfirmDialog
        title="Xác nhận xóa nhóm"
        description={`Bạn có chắc chắn muốn xóa nhóm "${deleteGroup?.name ?? ""}"? Hành động này không thể hoàn tác.`}
        open={deleteDialogOpen}
        onOpenChange={(o) => { if (!o && !isDeleting) { setDeleteDialogOpen(false); setDeleteGroup(null); } }}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
      <EditGroupDialog group={editGroup} open={editDialogOpen} onOpenChange={(o) => { if (!o && !isUpdating) { setEditDialogOpen(false); setEditGroup(null); } }} onConfirm={handleEdit} isUpdating={isUpdating} />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ─── FRIENDSHIPS TAB ────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

function FriendshipsTab() {
  const { tap, warning } = useHaptics();
  const deleteMutation = useInstantDelete();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [deleteFriendship, setDeleteFriendship] = useState<FriendshipRow | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const filters = useMemo(() => {
    const f: Array<{ field: string; operator: string; value: unknown }> = [];
    if (statusFilter !== "all") f.push({ field: "status", operator: "eq", value: statusFilter });
    return f;
  }, [statusFilter]);

  const columns = useMemo<ColumnDef<FriendshipRow>[]>(() => [
    {
      id: "user_a", header: "Người dùng A", accessorKey: "user_a_name", size: 200, enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarImage src={row.original.user_a_avatar ?? undefined} alt={row.original.user_a_name} />
            <AvatarFallback className="text-xs">{row.original.user_a_name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
          </Avatar>
          <span className="text-sm">{row.original.user_a_name}</span>
        </div>
      ),
    },
    {
      id: "user_b", header: "Người dùng B", accessorKey: "user_b_name", size: 200, enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarImage src={row.original.user_b_avatar ?? undefined} alt={row.original.user_b_name} />
            <AvatarFallback className="text-xs">{row.original.user_b_name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
          </Avatar>
          <span className="text-sm">{row.original.user_b_name}</span>
        </div>
      ),
    },
    {
      id: "status", header: "Trạng thái", accessorKey: "status", size: 140,
      cell: ({ getValue }) => <FriendshipStatusBadge status={getValue() as keyof typeof FRIENDSHIP_STATUS} />,
    },
    {
      id: "created_at", header: "Ngày tạo", accessorKey: "created_at", size: 120,
      cell: ({ getValue }) => formatDate(getValue() as string),
    },
    {
      id: "actions", header: "", size: 50, enableSorting: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontalIcon className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {row.original.status === "pending" && (
              <DropdownMenuItem onClick={() => { tap(); handleAccept(row.original); }}>Chấp nhận kết bạn</DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { warning(); setDeleteFriendship(row.original); setDeleteDialogOpen(true); }} className="text-destructive">Xóa tình bạn</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], []);

  const table = useTable<FriendshipRow>({
    columns,
    refineCoreProps: {
      resource: "friendships",
      meta: { select: "*, user_a_profile:profiles!friendships_user_a_fkey(full_name, avatar_url), user_b_profile:profiles!friendships_user_b_fkey(full_name, avatar_url)" },
      pagination: { pageSize: 10 },
      filters: { permanent: filters as any },
      sorters: { initial: [{ field: "created_at", order: "desc" }] },
      queryOptions: {
        select: (data) => ({
          ...data,
          data: data.data.map((f: any) => ({
            id: f.id,
            user_a_id: f.user_a,
            user_a_name: f.user_a_profile?.full_name ?? "Không rõ",
            user_a_avatar: f.user_a_profile?.avatar_url ?? null,
            user_b_id: f.user_b,
            user_b_name: f.user_b_profile?.full_name ?? "Không rõ",
            user_b_avatar: f.user_b_profile?.avatar_url ?? null,
            status: f.status,
            created_at: f.created_at,
          })),
        }),
      },
    },
  });

  const handleDelete = useCallback(() => {
    if (!deleteFriendship) return;
    setIsDeleting(true);
    deleteMutation.mutate(
      { resource: "friendships", id: deleteFriendship.id },
      {
        onSuccess: () => { toast.success(`Đã xóa tình bạn giữa "${deleteFriendship.user_a_name}" và "${deleteFriendship.user_b_name}"`); setDeleteDialogOpen(false); setDeleteFriendship(null); setIsDeleting(false); table.refineCore.tableQuery.refetch(); },
        onError: (error) => { toast.error(`Lỗi: ${error.message}`); setIsDeleting(false); },
      },
    );
  }, [deleteFriendship, deleteMutation, table.refineCore.tableQuery]);

  const handleAccept = useCallback(async (friendship: FriendshipRow) => {
    try {
      const { error } = await supabaseClient.rpc("admin_accept_friendship", { p_friendship_id: friendship.id });
      if (error) throw error;
      toast.success(`Đã chấp nhận kết bạn giữa "${friendship.user_a_name}" và "${friendship.user_b_name}"`);
      table.refineCore.tableQuery.refetch();
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message ?? "Không thể chấp nhận kết bạn"}`);
    }
  }, [table.refineCore.tableQuery]);

  const clearFilters = useCallback(() => { setSearch(""); setStatusFilter("all"); }, []);
  const hasActiveFilters = search !== "" || statusFilter !== "all";
  const isEmptyResult = !table.refineCore.tableQuery.isLoading && table.reactTable.getRowModel().rows.length === 0;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Quản lý tình bạn</CardTitle>
            <CardDescription>Xem và quản lý tất cả kết nối bạn bè trong hệ thống</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative max-w-sm flex-1">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Tìm kiếm theo tên người dùng..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { tap(); setStatusFilter(v); }}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="pending">Chờ xử lý</SelectItem>
                <SelectItem value="accepted">Đã chấp nhận</SelectItem>
                <SelectItem value="rejected">Từ chối</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && <Button variant="ghost" size="sm" onClick={clearFilters}>Xóa bộ lọc</Button>}
          </div>
          {isEmptyResult && hasActiveFilters ? (
            <Empty className="min-h-[400px]">
              <EmptyMedia variant="icon"><HeartHandshakeIcon className="h-6 w-6" /></EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>Không tìm thấy tình bạn</EmptyTitle>
                <EmptyDescription>Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</EmptyDescription>
              </EmptyHeader>
              <EmptyContent><Button variant="outline" onClick={clearFilters}>Xóa bộ lọc</Button></EmptyContent>
            </Empty>
          ) : (
            <DataTable table={table} />
          )}
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        title="Xác nhận xóa tình bạn"
        description={`Bạn có chắc chắn muốn xóa tình bạn giữa "${deleteFriendship?.user_a_name ?? ""}" và "${deleteFriendship?.user_b_name ?? ""}"? Hành động này không thể hoàn tác.`}
        open={deleteDialogOpen}
        onOpenChange={(o) => { if (!o && !isDeleting) { setDeleteDialogOpen(false); setDeleteFriendship(null); } }}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
    </>
  );
}

function InviteFriendsTab() {
  const { data: identity } = useGetIdentity<Profile>();

  return <InviteUsersCard inviterName={identity?.full_name || identity?.email} />;
}

// ═══════════════════════════════════════════════════════════════════
// ─── MAIN COMPONENT ─────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

export function AdminPeople() {
  const { tap } = useHaptics();
  return (
    <div className="space-y-6">
      <Tabs defaultValue="users" onValueChange={() => tap()}>
        <TabsList>
          <TabsTrigger value="users" className="gap-2">
            <UsersIcon className="h-4 w-4" />
            Người dùng
          </TabsTrigger>
          <TabsTrigger value="groups" className="gap-2">
            <GroupIcon className="h-4 w-4" />
            Nhóm
          </TabsTrigger>
          <TabsTrigger value="friendships" className="gap-2">
            <HeartHandshakeIcon className="h-4 w-4" />
            Tình bạn
          </TabsTrigger>
          <TabsTrigger value="invite" className="gap-2">
            <MailIcon className="h-4 w-4" />
            Mời bạn bè
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <UsersTab />
        </TabsContent>
        <TabsContent value="groups" className="mt-4">
          <GroupsTab />
        </TabsContent>
        <TabsContent value="friendships" className="mt-4">
          <FriendshipsTab />
        </TabsContent>
        <TabsContent value="invite" className="mt-4">
          <InviteFriendsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
