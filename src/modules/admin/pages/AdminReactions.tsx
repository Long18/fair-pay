import { useState, useCallback, useMemo, type FormEvent, type KeyboardEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseClient } from "@/utility/supabaseClient";
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
import { AdminDetailSheet } from "../components/AdminDetailSheet";
import { AdminPageHeader } from "../components/AdminPageHeader";
import { AdminTableScroll } from "../components/AdminTableScroll";
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
import { cn } from "@/lib/utils";
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


// ─── Preview Components ─────────────────────────────────────────────

function ReactionPreview({ item }: { item: ReactionType }) {
  if (item.media_type === "emoji" && item.emoji) {
    return <span className="text-xl leading-none">{item.emoji}</span>;
  }
  if (item.image_url) {
    return <img src={item.image_url} alt={item.label} className="h-6 w-6 object-contain rounded" />;
  }
  return <span className="text-muted-foreground text-xs">—</span>;
}

function FormMedia({ form, className }: { form: ReactionFormData; className: string }) {
  const { tAdmin } = useAdminTranslation();
  if (form.media_type === "emoji") {
    return form.emoji.trim() ? <span className="leading-none">{form.emoji}</span> : null;
  }
  return form.image_url.trim()
    ? <img src={form.image_url} alt={tAdmin("reactions.previewAlt")} className={cn("object-contain", className)} />
    : null;
}

function ReactionLivePreview({ form }: { form: ReactionFormData }) {
  const { tAdmin } = useAdminTranslation();
  const hasMedia = form.media_type === "emoji" ? !!form.emoji.trim() : !!form.image_url.trim();

  return (
    <section aria-label={tAdmin("layout.transactions.livePreview")} className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium text-muted-foreground">{tAdmin("layout.transactions.livePreview")}</h3>
        {!form.is_active ? <Badge variant="outline" className="text-[10px]">{tAdmin("status.inactive")}</Badge> : null}
      </div>
      <div className={cn("flex items-center gap-3 rounded-lg border bg-muted/30 p-3", !form.is_active && "opacity-60")}>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border bg-background text-3xl">
          {hasMedia ? <FormMedia form={form} className="h-9 w-9" /> : <SmilePlusIcon className="h-5 w-5 text-muted-foreground" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{form.label.trim() || "—"}</p>
          <p className="truncate font-mono text-xs text-muted-foreground">{form.code.trim() || "—"}</p>
        </div>
        {hasMedia ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-sm">
            <FormMedia form={form} className="h-4 w-4" />
            <span className="text-xs font-medium tabular-nums text-primary">3</span>
          </span>
        ) : null}
      </div>
      <p className="text-[11px] text-muted-foreground">
        {hasMedia ? tAdmin("layout.transactions.livePreviewHint") : tAdmin("layout.transactions.previewEmpty")}
      </p>
    </section>
  );
}

// ─── Form Sheet ─────────────────────────────────────────────────────

function toFormData(item: ReactionType | null): ReactionFormData {
  if (!item) return { ...EMPTY_FORM };
  return {
    code: item.code,
    emoji: item.emoji || "",
    emoji_mart_id: item.emoji_mart_id || "",
    image_url: item.image_url || "",
    media_type: item.media_type,
    label: item.label,
    is_active: item.is_active,
  };
}

const REACTION_FORM_ID = "admin-reaction-form";

/** Remount (via `key`) whenever the edited item changes so the form starts from that item. */
function ReactionFormSheet({
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
  const [form, setForm] = useState<ReactionFormData>(() => toFormData(editItem));
  const { tap } = useHaptics();

  const isValid = form.code.trim() && form.label.trim() && (
    form.media_type === "emoji" ? form.emoji.trim() : form.image_url.trim()
  );

  const handleSubmit = useCallback((event?: FormEvent) => {
    event?.preventDefault();
    tap();
    if (!isValid || isSaving) return;
    onSave(form, editItem?.id);
  }, [form, editItem, isValid, isSaving, onSave, tap]);

  return (
    <AdminDetailSheet
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title={editItem ? tAdmin("reactions.editTitle") : tAdmin("reactions.createTitle")}
      description={editItem ? tAdmin("reactions.editDescription") : tAdmin("reactions.createDescription")}
      footer={
        <>
          <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => onOpenChange(false)} disabled={isSaving}>
            {tAdmin("common.cancel")}
          </Button>
          <Button type="submit" form={REACTION_FORM_ID} size="sm" className="cursor-pointer" disabled={isSaving}>
            {isSaving && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
            {editItem ? tAdmin("reactions.updateSubmit") : tAdmin("reactions.createSubmit")}
          </Button>
        </>
      }
    >
      <form id={REACTION_FORM_ID} onSubmit={handleSubmit} className="space-y-4">
        <ReactionLivePreview form={form} />

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="code">{tAdmin("reactions.codeUnique")}</Label>
            <Input
              id="code"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              placeholder={tAdmin("reactions.codePlaceholder")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="label">{tAdmin("reactions.label")}</Label>
            <Input
              id="label"
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              placeholder={tAdmin("reactions.labelPlaceholder")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="media_type">{tAdmin("reactions.mediaType")}</Label>
            <Select
              value={form.media_type}
              onValueChange={(v) => { tap(); setForm((f) => ({ ...f, media_type: v as ReactionFormData["media_type"] })); }}
            >
              <SelectTrigger id="media_type" className="w-full">
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
            <div className="space-y-1.5">
              <Label htmlFor="emoji">{tAdmin("reactions.emoji")}</Label>
              <Input
                id="emoji"
                value={form.emoji}
                onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))}
                placeholder={tAdmin("reactions.emojiPlaceholder")}
              />
            </div>
          ) : (
            <div className="space-y-1.5">
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
            </div>
          )}

          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="emoji_mart_id">{tAdmin("reactions.emojiMartId")}</Label>
            <Input
              id="emoji_mart_id"
              value={form.emoji_mart_id}
              onChange={(e) => setForm((f) => ({ ...f, emoji_mart_id: e.target.value }))}
              placeholder={tAdmin("reactions.emojiMartPlaceholder")}
            />
            <p className="text-[11px] text-muted-foreground">{tAdmin("reactions.emojiMartHelp")}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="is_active"
            checked={form.is_active}
            onCheckedChange={(v) => { tap(); setForm((f) => ({ ...f, is_active: v })); }}
          />
          <Label htmlFor="is_active">{tAdmin("reactions.active")}</Label>
        </div>
      </form>
    </AdminDetailSheet>
  );
}


// ─── Main Component ─────────────────────────────────────────────────

/** Navbar + header row + page padding at 1440x900. */
const REACTIONS_TABLE_OFFSET = "10rem";

const MEDIA_BADGE_CLASS: Record<ReactionType["media_type"], string> = {
  emoji: "bg-[var(--status-info-bg)] text-[var(--status-info-foreground)] border-[var(--status-info-border)]",
  gif: "bg-[var(--status-success-bg)] text-[var(--status-success-foreground)] border-[var(--status-success-border)]",
  image: "bg-[var(--status-warning-bg)] text-[var(--status-warning-foreground)] border-[var(--status-warning-border)]",
};

const MEDIA_LABEL_KEY: Record<ReactionType["media_type"], string> = {
  emoji: "reactions.mediaEmoji",
  gif: "reactions.mediaGif",
  image: "reactions.mediaImage",
};

function stopRowEvent(event: { stopPropagation: () => void }) {
  event.stopPropagation();
}

export function AdminReactions() {
  const { tAdmin } = useAdminTranslation();
  const { data: items, isLoading, refetch, isFetching } = useReactionTypesList();
  const upsertMutation = useUpsertReaction();
  const deleteMutation = useDeleteReaction();
  const toggleMutation = useToggleActive();
  const { tap, success, warning } = useHaptics();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<ReactionType | null>(null);
  const [formSession, setFormSession] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<ReactionType | null>(null);

  const maxSortOrder = useMemo(
    () => (items ?? []).reduce((max, i) => Math.max(max, i.sort_order), 0),
    [items],
  );
  const activeCount = useMemo(() => (items ?? []).filter((i) => i.is_active).length, [items]);

  const handleAdd = useCallback(() => {
    tap();
    setEditItem(null);
    setFormSession((n) => n + 1);
    setDialogOpen(true);
  }, [tap]);

  const handleEdit = useCallback((item: ReactionType) => {
    tap();
    setEditItem(item);
    setFormSession((n) => n + 1);
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

  const handleRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, item: ReactionType) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleEdit(item);
    }
  };

  const mediaTypeBadge = (item: ReactionType) => (
    <Badge className={MEDIA_BADGE_CLASS[item.media_type]}>
      {tAdmin(MEDIA_LABEL_KEY[item.media_type])}
    </Badge>
  );

  const rowActions = (item: ReactionType) => (
    <div className="flex items-center justify-end gap-0.5">
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => handleEdit(item)}
        aria-label={`${tAdmin("common.edit")} ${item.label}`}
      >
        <PencilIcon className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-destructive"
        onClick={() => { tap(); setDeleteTarget(item); }}
        aria-label={`${tAdmin("common.delete")} ${item.label}`}
      >
        <Trash2Icon className="h-4 w-4" />
      </Button>
    </div>
  );

  const hasItems = !isLoading && !!items && items.length > 0;

  return (
    <div className="flex flex-col gap-3">
      <AdminPageHeader
        title={tAdmin("reactions.title")}
        description={tAdmin("reactions.subtitle")}
        actions={
          <>
            {hasItems ? (
              <div className="hidden items-center gap-1.5 lg:flex">
                <Badge variant="secondary" className="font-normal tabular-nums">
                  {tAdmin("layout.transactions.reactionsTotal", { count: items.length })}
                </Badge>
                <Badge variant="outline" className="font-normal tabular-nums">
                  {tAdmin("layout.transactions.reactionsActive", { count: activeCount })}
                </Badge>
              </div>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              onClick={() => { tap(); refetch(); }}
              disabled={isFetching}
              aria-label={tAdmin("common.refresh")}
            >
              <RefreshCwIcon className={cn("h-4 w-4 sm:mr-2", isFetching && "animate-spin")} />
              <span className="hidden sm:inline">{tAdmin("common.refresh")}</span>
            </Button>
            <Button size="sm" onClick={handleAdd}>
              <PlusIcon className="mr-2 h-4 w-4" />
              {tAdmin("reactions.create")}
            </Button>
          </>
        }
      />

      {isLoading && (
        <div className="flex min-h-[200px] items-center justify-center rounded-md border">
          <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && (!items || items.length === 0) && (
        <Empty className="min-h-[200px] rounded-md border">
          <EmptyMedia variant="icon">
            <SmilePlusIcon className="h-6 w-6" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>{tAdmin("reactions.emptyTitle")}</EmptyTitle>
            <EmptyDescription>{tAdmin("reactions.emptyDescription")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {hasItems && (
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
          <AdminTableScroll offset={REACTIONS_TABLE_OFFSET} className="hidden md:block">
            <Table containerClassName="overflow-visible">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-9 w-[60px] text-xs text-muted-foreground">{tAdmin("reactions.order")}</TableHead>
                  <TableHead className="h-9 w-[60px] text-xs text-muted-foreground">{tAdmin("reactions.preview")}</TableHead>
                  <TableHead className="h-9 w-[160px] text-xs text-muted-foreground">{tAdmin("reactions.code")}</TableHead>
                  <TableHead className="h-9 text-xs text-muted-foreground">{tAdmin("reactions.label")}</TableHead>
                  <TableHead className="h-9 w-[90px] text-xs text-muted-foreground">{tAdmin("common.type")}</TableHead>
                  <TableHead className="h-9 w-[80px] text-xs text-muted-foreground">{tAdmin("common.status")}</TableHead>
                  <TableHead className="sticky right-0 z-10 h-9 w-[84px] bg-background text-right text-xs text-muted-foreground">{tAdmin("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const isEditing = dialogOpen && editItem?.id === item.id;
                  return (
                    <TableRow
                      key={item.id}
                      tabIndex={0}
                      aria-selected={isEditing}
                      data-state={isEditing ? "selected" : undefined}
                      onClick={() => handleEdit(item)}
                      onKeyDown={(event) => handleRowKeyDown(event, item)}
                      className={cn(
                        "group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                        !item.is_active && "text-muted-foreground"
                      )}
                    >
                      <TableCell className="py-1.5 text-sm text-muted-foreground tabular-nums">{item.sort_order}</TableCell>
                      <TableCell className="py-1.5"><ReactionPreview item={item} /></TableCell>
                      <TableCell className="py-1.5">
                        <Badge variant="outline" className="font-mono text-xs">{item.code}</Badge>
                      </TableCell>
                      <TableCell className="py-1.5 text-sm">{item.label}</TableCell>
                      <TableCell className="py-1.5">{mediaTypeBadge(item)}</TableCell>
                      <TableCell className="py-1.5" onClick={stopRowEvent} onKeyDown={stopRowEvent}>
                        <Switch
                          checked={item.is_active}
                          onCheckedChange={(v) => handleToggle(item.id, v)}
                          aria-label={`${tAdmin("reactions.active")} ${item.label}`}
                        />
                      </TableCell>
                      <TableCell
                        className="sticky right-0 z-[1] bg-background py-1.5 text-right group-hover:bg-[color-mix(in_oklab,var(--muted)_50%,var(--background))] group-data-[state=selected]:bg-muted"
                        onClick={stopRowEvent}
                        onKeyDown={stopRowEvent}
                      >
                        {rowActions(item)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </AdminTableScroll>
        </>
      )}

      <ReactionFormSheet
        key={`${editItem?.id ?? "new"}-${formSession}`}
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
