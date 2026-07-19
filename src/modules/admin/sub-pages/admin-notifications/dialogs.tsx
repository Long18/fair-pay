import { useState, useEffect } from "react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangleIcon, Loader2Icon } from "@/components/ui/icons";
import { supabaseClient } from "@/utility/supabaseClient";
import { useHaptics } from "@/hooks/use-haptics";
import { useAdminTranslation } from "../../i18n";
import { NOTIFICATION_TYPES } from "./constants";
import type { NotificationRow } from "./types";

export function DeleteNotificationDialog({
  notification,
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
}: {
  notification: NotificationRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  const { tAdmin } = useAdminTranslation();

  if (!notification) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangleIcon className="h-5 w-5 text-destructive" />
            <AlertDialogTitle>{tAdmin("notifications.deleteTitle")}</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            {tAdmin("notifications.deleteDescription", {
              message: notification.message.slice(0, 60),
              name: notification.user_name,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>{tAdmin("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isDeleting}
          >
            {isDeleting ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : null}
            {tAdmin("common.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function CreateNotificationDialog({
  open,
  onOpenChange,
  onSubmit,
  isCreating,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { user_id: string; type: string; title: string; message: string }) => void;
  isCreating: boolean;
}) {
  const [userId, setUserId] = useState("");
  const [type, setType] = useState("settlement_reminder");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const { tap } = useHaptics();
  const { tAdmin } = useAdminTranslation();

  const [profiles, setProfiles] = useState<Array<{ id: string; full_name: string }>>([]);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    supabaseClient
      .from("profiles")
      .select("id, full_name")
      .order("full_name")
      .then(({ data }) => {
        if (!cancelled && data) setProfiles(data);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleSubmit = () => {
    if (!userId || !title || !message) {
      toast.error(tAdmin("notifications.requiredFields"));
      return;
    }
    onSubmit({ user_id: userId, type, title, message });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{tAdmin("notifications.createTitle")}</DialogTitle>
          <DialogDescription>
            {tAdmin("notifications.createDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="notif-user">{tAdmin("notifications.recipient")}</Label>
            <Select value={userId} onValueChange={(v) => { tap(); setUserId(v); }}>
              <SelectTrigger id="notif-user">
                <SelectValue placeholder={tAdmin("people.selectUser")} />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notif-type">{tAdmin("notifications.notificationType")}</Label>
            <Select value={type} onValueChange={(v) => { tap(); setType(v); }}>
              <SelectTrigger id="notif-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NOTIFICATION_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {tAdmin(`notifications.types.${t}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notif-title">{tAdmin("common.title")}</Label>
            <Input
              id="notif-title"
              placeholder={tAdmin("notifications.titlePlaceholder")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notif-message">{tAdmin("common.content")}</Label>
            <Textarea
              id="notif-message"
              placeholder={tAdmin("notifications.messagePlaceholder")}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => { tap(); onOpenChange(false); }} disabled={isCreating}>
            {tAdmin("common.cancel")}
          </Button>
          <Button onClick={() => { tap(); handleSubmit(); }} disabled={isCreating || !userId || !title || !message}>
            {isCreating ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : null}
            {tAdmin("notifications.send")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditNotificationForm({
  notification,
  open,
  onOpenChange,
  onSubmit,
  isUpdating,
}: {
  notification: NotificationRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { type: string; title: string; message: string }) => void;
  isUpdating: boolean;
}) {
  const [type, setType] = useState(notification.type);
  const [title, setTitle] = useState(notification.title);
  const [message, setMessage] = useState(notification.message);
  const { tap } = useHaptics();
  const { tAdmin } = useAdminTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{tAdmin("notifications.editTitle")}</DialogTitle>
          <DialogDescription>
            {tAdmin("notifications.editDescription", { name: notification.user_name })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="edit-notif-type">{tAdmin("notifications.notificationType")}</Label>
            <Select value={type} onValueChange={(v) => { tap(); setType(v); }}>
              <SelectTrigger id="edit-notif-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NOTIFICATION_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {tAdmin(`notifications.types.${t}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-notif-title">{tAdmin("common.title")}</Label>
            <Input
              id="edit-notif-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-notif-message">{tAdmin("common.content")}</Label>
            <Textarea
              id="edit-notif-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => { tap(); onOpenChange(false); }} disabled={isUpdating}>
            {tAdmin("common.cancel")}
          </Button>
          <Button
            onClick={() => { tap(); onSubmit({ type, title, message }); }}
            disabled={isUpdating || !title || !message}
          >
            {isUpdating ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : null}
            {tAdmin("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EditNotificationDialog({
  notification,
  open,
  onOpenChange,
  onSubmit,
  isUpdating,
}: {
  notification: NotificationRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { type: string; title: string; message: string }) => void;
  isUpdating: boolean;
}) {
  if (!notification) return null;

  return (
    <EditNotificationForm
      key={notification.id}
      notification={notification}
      open={open}
      onOpenChange={onOpenChange}
      onSubmit={onSubmit}
      isUpdating={isUpdating}
    />
  );
}
