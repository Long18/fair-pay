import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useStaggerAnimation } from "@/hooks/ui/use-stagger-animation";
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
import { AdminCrudSheet } from "../components/AdminCrudSheet";
import { AdminPageHeader } from "../components/AdminPageHeader";
import {
  AdminMobileCard,
  AdminMobileCards,
} from "../components/AdminMobileCards";
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
import { useHaptics } from "@/hooks/use-haptics";
import type { ReactionType } from "@/modules/expenses/types/comments";
import { useAdminTranslation } from "../i18n";


// ─── Types ──────────────────────────────────────────────────────────

interface ReactionFormData {
  code: string;
  emoji: string;
  emoji_mart_id: string;
  image_url: string;
  media_type: "emoji" | "image" | "gif";
  label: string;
  is_active: boolean;
}

const EMPTY_FORM: ReactionFormData = {
  code: "",
  emoji: "",
  emoji_mart_id: "",
  image_url: "",
  media_type: "emoji",
  label: "",
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
  const { tAdmin } = useAdminTranslation();
  return useMutation({
    mutationFn: async ({ id, form, maxSortOrder }: { id?: string; form: ReactionFormData; maxSortOrder: number }) => {
      const payload: Record<string, unknown> = {
        code: form.code.trim(),
        emoji: form.media_type === "emoji" ? form.emoji.trim() : null,
        emoji_mart_id: form.emoji_mart_id.trim() || null,
        image_url: form.media_type !== "emoji" ? form.image_url.trim() : null,
        media_type: form.media_type,
        label: form.label.trim(),
        is_active: form.is_active,
      };
      if (id) {
        const { error } = await supabaseClient.from("reaction_types").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        // Auto-assign sort_order for new items
        payload.sort_order = maxSortOrder + 1;
        const { error } = await supabaseClient.from("reaction_types").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "reaction-types"] });
      toast.success(tAdmin("reactions.saved"));
    },
    onError: (err: Error) => {
      toast.error(tAdmin("common.errorWithMessage", { message: err.message }));
    },
  });
}

function useDeleteReaction() {
  const qc = useQueryClient();
  const { tAdmin } = useAdminTranslation();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabaseClient.from("reaction_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "reaction-types"] });
      toast.success(tAdmin("reactions.deleted"));
    },
    onError: (err: Error) => {
      toast.error(tAdmin("common.errorWithMessage", { message: err.message }));
    },
  });
}

function useToggleActive() {
  const qc = useQueryClient();
  const { tAdmin } = useAdminTranslation();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabaseClient.from("reaction_types").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "reaction-types"] });
    },
    onError: (err: Error) => {
      toast.error(tAdmin("common.errorWithMessage", { message: err.message }));
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem: ReactionType | null;
  onSave: (form: ReactionFormData, id?: string) => void;
  isSaving: boolean;
}) {
  const { tAdmin } = useAdminTranslation();
  const [form, setForm] = useState<ReactionFormData>(EMPTY_FORM);
  const { tap } = useHaptics();

  const resetForm = useCallback(() => {
    if (editItem) {
      setForm({
        code: editItem.code,
        emoji: editItem.emoji || "",
        emoji_mart_id: editItem.emoji_mart_id || "",
        image_url: editItem.image_url || "",
        media_type: editItem.media_type,
        label: editItem.label,
        is_active: editItem.is_active,
      });
    } else {
      setForm({ ...EMPTY_FORM });
    }
  }, [editItem]);

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
    <AdminCrudSheet
      open={open}
      onOpenChange={handleOpenChange}
      title={editItem ? tAdmin("reactions.editTitle") : tAdmin("reactions.createTitle")}
      description={editItem ? tAdmin("reactions.editDescription") : tAdmin("reactions.createDescription")}
      isSubmitting={isSaving}
      submitLabel={editItem ? tAdmin("reactions.updateSubmit") : tAdmin("reactions.createSubmit")}
      onSubmit={() => { tap(); handleSubmit(); }}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="code">{tAdmin("reactions.codeUnique")}</Label>
            <Input
              id="code"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              placeholder={tAdmin("reactions.codePlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="label">{tAdmin("reactions.label")}</Label>
            <Input
              id="label"
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              placeholder={tAdmin("reactions.labelPlaceholder")}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>{tAdmin("reactions.mediaType")}</Label>
          <Select
            value={form.media_type}
            onValueChange={(v) => { tap(); setForm((f) => ({ ...f, media_type: v as ReactionFormData["media_type"] })); }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="emoji">{tAdmin("reactions.mediaEmoji")}</SelectItem>
              <SelectItem value="image">{tAdmin("reactions.mediaImage")}</SelectItem>
              <SelectItem value="gif">{tAdmin("reactions.mediaGif")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {form.media_type === "emoji" ? (
          <div className="space-y-2">
            <Label htmlFor="emoji">{tAdmin("reactions.emoji")}</Label>
            <Input
              id="emoji"
              value={form.emoji}
              onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))}
              placeholder={tAdmin("reactions.emojiPlaceholder")}
            />
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="image_url">
              {tAdmin("reactions.imageUrl", {
                type: form.media_type === "gif"
                  ? tAdmin("reactions.mediaGif")
                  : tAdmin("reactions.mediaImage"),
              })}
            </Label>
            <Input
              id="image_url"
              value={form.image_url}
              onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
              placeholder={tAdmin("reactions.imageUrlPlaceholder")}
            />
            {form.image_url && (
              <img src={form.image_url} alt={tAdmin("reactions.previewAlt")} className="h-10 w-10 object-contain rounded border" />
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="emoji_mart_id">{tAdmin("reactions.emojiMartId")}</Label>
          <Input
            id="emoji_mart_id"
            value={form.emoji_mart_id}
            onChange={(e) => setForm((f) => ({ ...f, emoji_mart_id: e.target.value }))}
            placeholder={tAdmin("reactions.emojiMartPlaceholder")}
          />
          <p className="text-[11px] text-muted-foreground">{tAdmin("reactions.emojiMartHelp")}</p>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="is_active"
            checked={form.is_active}
            onCheckedChange={(v) => { tap(); setForm((f) => ({ ...f, is_active: v })); }}
          />
          <Label htmlFor="is_active">{tAdmin("reactions.active")}</Label>
        </div>
      </div>
    </AdminCrudSheet>
  );
}


// ─── Main Component ─────────────────────────────────────────────────

export function AdminReactions() {
  const { tAdmin } = useAdminTranslation();
  const { data: items, isLoading, refetch, isFetching } = useReactionTypesList();
  const upsertMutation = useUpsertReaction();
  const deleteMutation = useDeleteReaction();
  const toggleMutation = useToggleActive();
  const { tap, success, warning } = useHaptics();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<ReactionType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ReactionType | null>(null);

  const maxSortOrder = useMemo(
    () => (items ?? []).reduce((max, i) => Math.max(max, i.sort_order), 0),
    [items],
  );

  const handleAdd = useCallback(() => {
    tap();
    setEditItem(null);
    setDialogOpen(true);
  }, [tap]);

  const handleEdit = useCallback((item: ReactionType) => {
    tap();
    setEditItem(item);
    setDialogOpen(true);
  }, [tap]);

  const handleSave = useCallback((form: ReactionFormData, id?: string) => {
    upsertMutation.mutate({ id, form, maxSortOrder }, {
      onSuccess: () => { success(); setDialogOpen(false); },
    });
  }, [upsertMutation, maxSortOrder, success]);

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    warning();
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  }, [deleteTarget, deleteMutation, warning]);

  const handleToggle = useCallback((id: string, is_active: boolean) => {
    tap();
    toggleMutation.mutate({ id, is_active });
  }, [toggleMutation, tap]);

  const { containerVariants, rowVariants, animationKey } = useStaggerAnimation(items ?? []);

  const mediaTypeBadge = (item: ReactionType) => (
    <Badge
      className={
        item.media_type === "emoji"
          ? "bg-[var(--status-info-bg)] text-[var(--status-info-foreground)] border-[var(--status-info-border)]"
          : item.media_type === "gif"
            ? "bg-[var(--status-success-bg)] text-[var(--status-success-foreground)] border-[var(--status-success-border)]"
            : "bg-[var(--status-warning-bg)] text-[var(--status-warning-foreground)] border-[var(--status-warning-border)]"
      }
    >
      {item.media_type}
    </Badge>
  );

  const rowActions = (item: ReactionType) => (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => handleEdit(item)}
        aria-label={`${tAdmin("common.edit")} ${item.label}`}
      >
        <PencilIcon className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive"
        onClick={() => { tap(); setDeleteTarget(item); }}
        aria-label={`${tAdmin("common.delete")} ${item.label}`}
      >
        <Trash2Icon className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={tAdmin("reactions.title")}
        description={tAdmin("reactions.subtitle")}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { tap(); refetch(); }} disabled={isFetching}>
              <RefreshCwIcon className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              {tAdmin("common.refresh")}
            </Button>
            <Button size="sm" onClick={handleAdd}>
              <PlusIcon className="mr-2 h-4 w-4" />
              {tAdmin("reactions.create")}
            </Button>
          </div>
        }
      />

      {/* Main Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>{tAdmin("reactions.cardTitle")}</CardTitle>
          <CardDescription>{tAdmin("reactions.cardDescription")}</CardDescription>
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
                <EmptyTitle>{tAdmin("reactions.emptyTitle")}</EmptyTitle>
                <EmptyDescription>{tAdmin("reactions.emptyDescription")}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}

          {!isLoading && items && items.length > 0 && (
            <>
              {/* Mobile cards */}
              <div className="md:hidden">
                <AdminMobileCards
                  items={items}
                  getKey={(item) => item.id}
                  renderItem={(item) => (
                    <AdminMobileCard
                      title={item.label}
                      description={item.code}
                      leading={<ReactionPreview item={item} />}
                      badges={mediaTypeBadge(item)}
                      meta={[
                        { label: tAdmin("reactions.order"), value: item.sort_order },
                        {
                          label: tAdmin("common.status"),
                          value: (
                            <Switch
                              checked={item.is_active}
                              onCheckedChange={(v) => handleToggle(item.id, v)}
                              aria-label={`${tAdmin("reactions.active")} ${item.label}`}
                            />
                          ),
                        },
                      ]}
                      actions={rowActions(item)}
                    />
                  )}
                />
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto rounded-md border">
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  key={animationKey}
                >
                  <Table containerClassName="overflow-visible">
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-[60px]">{tAdmin("reactions.order")}</TableHead>
                        <TableHead className="w-[60px]">{tAdmin("reactions.preview")}</TableHead>
                        <TableHead className="w-[120px]">{tAdmin("reactions.code")}</TableHead>
                        <TableHead>{tAdmin("reactions.label")}</TableHead>
                        <TableHead className="w-[90px]">{tAdmin("common.type")}</TableHead>
                        <TableHead className="w-[90px]">{tAdmin("common.status")}</TableHead>
                        <TableHead className="sticky right-0 z-10 w-[100px] bg-background text-right">{tAdmin("common.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, index) => (
                        <motion.tr
                          key={item.id}
                          variants={rowVariants}
                          custom={index}
                          className="hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors"
                        >
                          <TableCell className="text-sm text-muted-foreground tabular-nums">{item.sort_order}</TableCell>
                          <TableCell><ReactionPreview item={item} /></TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-xs">{item.code}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{item.label}</TableCell>
                          <TableCell>{mediaTypeBadge(item)}</TableCell>
                          <TableCell>
                            <Switch
                              checked={item.is_active}
                              onCheckedChange={(v) => handleToggle(item.id, v)}
                              aria-label={`${tAdmin("reactions.active")} ${item.label}`}
                            />
                          </TableCell>
                          <TableCell className="sticky right-0 z-10 bg-background text-right">
                            {rowActions(item)}
                          </TableCell>
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                </motion.div>
              </div>
            </>
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
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tAdmin("reactions.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tAdmin("reactions.deleteDescription", { label: deleteTarget?.label ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tAdmin("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteMutation.isPending && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
              {tAdmin("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
