import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseClient } from "@/utility/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
} from "@/components/ui/empty";
import {
  SmilePlusIcon,
  PencilIcon,
  Trash2Icon,
  PlusIcon,
  Loader2Icon,
  RefreshCwIcon,
} from "@/components/ui/icons";
import { toast } from "sonner";
import type { ReactionType } from "@/modules/expenses/types/comments";


// ─── Types ──────────────────────────────────────────────────────────

interface ReactionFormData {
  code: string;
  emoji: string;
  image_url: string;
  media_type: "emoji" | "image" | "gif";
  label: string;
  sort_order: number;
  is_active: boolean;
}

const EMPTY_FORM: ReactionFormData = {
  code: "",
  emoji: "",
  image_url: "",
  media_type: "emoji",
  label: "",
  sort_order: 0,
  is_active: true,
};

// ─── Hooks ──────────────────────────────────────────────────────────

function useReactionTypesList() {
  return useQuery<ReactionType[]>({
    queryKey: ["admin", "reaction-types"],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("reaction_types")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as ReactionType[];
    },
    staleTime: 15_000,
  });
}

function useUpsertReaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, form }: { id?: string; form: ReactionFormData }) => {
      const payload = {
        code: form.code.trim(),
        emoji: form.media_type === "emoji" ? form.emoji.trim() : null,
        image_url: form.media_type !== "emoji" ? form.image_url.trim() : null,
        media_type: form.media_type,
        label: form.label.trim(),
        sort_order: form.sort_order,
        is_active: form.is_active,
      };
      if (id) {
        const { error } = await supabaseClient.from("reaction_types").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabaseClient.from("reaction_types").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "reaction-types"] });
      toast.success("Đã lưu reaction type");
    },
    onError: (err: Error) => {
      toast.error(`Lỗi: ${err.message}`);
    },
  });
}

function useDeleteReaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabaseClient.from("reaction_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "reaction-types"] });
      toast.success("Đã xóa reaction type");
    },
    onError: (err: Error) => {
      toast.error(`Lỗi: ${err.message}`);
    },
  });
}

function useToggleActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabaseClient.from("reaction_types").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "reaction-types"] });
    },
    onError: (err: Error) => {
      toast.error(`Lỗi: ${err.message}`);
    },
  });
}


// ─── Preview Component ──────────────────────────────────────────────

function ReactionPreview({ item }: { item: ReactionType }) {
  if (item.media_type === "emoji" && item.emoji) {
    return <span className="text-2xl">{item.emoji}</span>;
  }
  if (item.image_url) {
    return <img src={item.image_url} alt={item.label} className="h-7 w-7 object-contain rounded" />;
  }
  return <span className="text-muted-foreground text-xs">—</span>;
}

// ─── Form Dialog ────────────────────────────────────────────────────

function ReactionFormDialog({
  open,
  onOpenChange,
  editItem,
  onSave,
  isSaving,
  maxSortOrder,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem: ReactionType | null;
  onSave: (form: ReactionFormData, id?: string) => void;
  isSaving: boolean;
  maxSortOrder: number;
}) {
  const [form, setForm] = useState<ReactionFormData>(EMPTY_FORM);

  const resetForm = useCallback(() => {
    if (editItem) {
      setForm({
        code: editItem.code,
        emoji: editItem.emoji || "",
        image_url: editItem.image_url || "",
        media_type: editItem.media_type,
        label: editItem.label,
        sort_order: editItem.sort_order,
        is_active: editItem.is_active,
      });
    } else {
      setForm({ ...EMPTY_FORM, sort_order: maxSortOrder + 1 });
    }
  }, [editItem, maxSortOrder]);

  const handleOpenChange = useCallback((v: boolean) => {
    if (v) resetForm();
    onOpenChange(v);
  }, [onOpenChange, resetForm]);

  // Reset when editItem changes while open
  useMemo(() => {
    if (open) resetForm();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editItem]);

  const isValid = form.code.trim() && form.label.trim() && (
    form.media_type === "emoji" ? form.emoji.trim() : form.image_url.trim()
  );

  const handleSubmit = useCallback(() => {
    if (!isValid || isSaving) return;
    onSave(form, editItem?.id);
  }, [form, editItem, isValid, isSaving, onSave]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editItem ? "Chỉnh sửa Reaction" : "Thêm Reaction mới"}</DialogTitle>
          <DialogDescription>
            {editItem ? "Cập nhật thông tin reaction type" : "Tạo một reaction type mới cho hệ thống"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code (unique)</Label>
              <Input
                id="code"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="thumbs_up"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="Thumbs Up"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Loại media</Label>
            <Select
              value={form.media_type}
              onValueChange={(v) => setForm((f) => ({ ...f, media_type: v as ReactionFormData["media_type"] }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="emoji">Emoji</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="gif">GIF</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.media_type === "emoji" ? (
            <div className="space-y-2">
              <Label htmlFor="emoji">Emoji</Label>
              <Input
                id="emoji"
                value={form.emoji}
                onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))}
                placeholder="👍"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="image_url">URL ({form.media_type === "gif" ? "GIF" : "Image"})</Label>
              <Input
                id="image_url"
                value={form.image_url}
                onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                placeholder="https://..."
              />
              {form.image_url && (
                <img src={form.image_url} alt="Preview" className="h-10 w-10 object-contain rounded border" />
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sort_order">Thứ tự</Label>
              <Input
                id="sort_order"
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="flex items-end gap-2 pb-1">
              <Switch
                id="is_active"
                checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
              <Label htmlFor="is_active">Kích hoạt</Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button onClick={handleSubmit} disabled={!isValid || isSaving}>
            {isSaving && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
            {editItem ? "Cập nhật" : "Tạo mới"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


// ─── Main Component ─────────────────────────────────────────────────

export function AdminReactions() {
  const { data: items, isLoading, refetch, isFetching } = useReactionTypesList();
  const upsertMutation = useUpsertReaction();
  const deleteMutation = useDeleteReaction();
  const toggleMutation = useToggleActive();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<ReactionType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ReactionType | null>(null);

  const maxSortOrder = useMemo(
    () => (items ?? []).reduce((max, i) => Math.max(max, i.sort_order), 0),
    [items],
  );

  const handleAdd = useCallback(() => {
    setEditItem(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((item: ReactionType) => {
    setEditItem(item);
    setDialogOpen(true);
  }, []);

  const handleSave = useCallback((form: ReactionFormData, id?: string) => {
    upsertMutation.mutate({ id, form }, {
      onSuccess: () => setDialogOpen(false),
    });
  }, [upsertMutation]);

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  }, [deleteTarget, deleteMutation]);

  const handleToggle = useCallback((id: string, is_active: boolean) => {
    toggleMutation.mutate({ id, is_active });
  }, [toggleMutation]);

  const activeCount = useMemo(() => (items ?? []).filter((i) => i.is_active).length, [items]);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Tổng reactions</div>
          <div className="text-xl font-semibold mt-1">{items?.length ?? 0}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Đang hoạt động</div>
          <div className="text-xl font-semibold mt-1 text-emerald-600 dark:text-emerald-400">{activeCount}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Đã tắt</div>
          <div className="text-xl font-semibold mt-1 text-red-600 dark:text-red-400">{(items?.length ?? 0) - activeCount}</div>
        </Card>
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Quản lý Reactions</CardTitle>
            <CardDescription>Thêm, sửa, xóa emoji và icon cho hệ thống reaction</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCwIcon className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              Làm mới
            </Button>
            <Button size="sm" onClick={handleAdd}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Thêm mới
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && (!items || items.length === 0) && (
            <Empty className="min-h-[300px]">
              <EmptyMedia variant="icon">
                <SmilePlusIcon className="h-6 w-6" />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>Chưa có reaction nào</EmptyTitle>
                <EmptyDescription>Thêm reaction type đầu tiên cho hệ thống</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}

          {!isLoading && items && items.length > 0 && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[60px]">Thứ tự</TableHead>
                    <TableHead className="w-[60px]">Preview</TableHead>
                    <TableHead className="w-[120px]">Code</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead className="w-[90px]">Loại</TableHead>
                    <TableHead className="w-[90px]">Trạng thái</TableHead>
                    <TableHead className="w-[100px] text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id} className="group">
                      <TableCell className="text-sm text-muted-foreground tabular-nums">{item.sort_order}</TableCell>
                      <TableCell><ReactionPreview item={item} /></TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">{item.code}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{item.label}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            item.media_type === "emoji"
                              ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800"
                              : item.media_type === "gif"
                                ? "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-400 dark:border-violet-800"
                                : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800"
                          }
                        >
                          {item.media_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={item.is_active}
                          onCheckedChange={(v) => handleToggle(item.id, v)}
                          aria-label={`Toggle ${item.label}`}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(item)} aria-label={`Edit ${item.label}`}>
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget(item)} aria-label={`Delete ${item.label}`}>
                            <Trash2Icon className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <ReactionFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editItem={editItem}
        onSave={handleSave}
        isSaving={upsertMutation.isPending}
        maxSortOrder={maxSortOrder}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa reaction type?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa &quot;{deleteTarget?.label}&quot;? Thao tác này không thể hoàn tác.
              Các reaction đã sử dụng sẽ bị xóa theo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteMutation.isPending && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
