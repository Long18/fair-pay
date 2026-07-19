import { useState, useEffect } from "react";
import { toast } from "sonner";

import { supabaseClient } from "@/utility/supabaseClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ChevronsUpDownIcon, CheckIcon } from "@/components/ui/icons";
import { AdminCrudDialog } from "../../components/AdminCrudSheet";
import { useHaptics } from "@/hooks/use-haptics";
import { formatDate } from "@/lib/locale-utils";
import { useAdminTranslation } from "../../i18n";
import { DetailItem } from "./shared-ui";
import { formatFriendshipName, relationOne } from "./helpers";
import type {
  FriendshipOption,
  FriendshipOptionRecord,
  PaymentFormPayload,
  PaymentRow,
} from "./types";

function UserSingleCombobox({
  value,
  onChange,
  users,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (id: string) => void;
  users: Array<{ id: string; full_name: string }>;
  placeholder: string;
  disabled?: boolean;
}) {
  const { tAdmin } = useAdminTranslation();
  const [open, setOpen] = useState(false);
  const selected = users.find((u) => u.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled}
        >
          {selected
            ? <span className="truncate">{selected.full_name}</span>
            : <span className="text-muted-foreground truncate">{placeholder}</span>}
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={tAdmin("transactions.payments.searchUsers")} />
          <CommandList>
            <CommandEmpty>{tAdmin("transactions.payments.noUsersFound")}</CommandEmpty>
            <CommandGroup>
              {users.map((user) => (
                <CommandItem
                  key={user.id}
                  value={user.full_name}
                  onSelect={() => { onChange(user.id); setOpen(false); }}
                  className="cursor-pointer"
                >
                  <CheckIcon className={cn("mr-2 h-4 w-4 shrink-0", value === user.id ? "opacity-100" : "opacity-0")} />
                  {user.full_name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Create Payment Dialog ───────────────────────────────────────────

export function CreatePaymentDialog({
  open, onOpenChange, onSubmit, isCreating,
}: {
  open: boolean; onOpenChange: (open: boolean) => void;
  onSubmit: (data: PaymentFormPayload) => void;
  isCreating: boolean;
}) {
  const { tAdmin } = useAdminTranslation();
  const [contextType, setContextType] = useState<"group" | "friend">("group");
  const [fromUser, setFromUser] = useState("");
  const [toUser, setToUser] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("VND");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [groupId, setGroupId] = useState<string>("");
  const [friendshipId, setFriendshipId] = useState<string>("");
  const [note, setNote] = useState("");
  const [profilesList, setProfilesList] = useState<Array<{ id: string; full_name: string }>>([]);
  const [groupsList, setGroupsList] = useState<Array<{ id: string; name: string }>>([]);
  const [friendshipsList, setFriendshipsList] = useState<FriendshipOption[]>([]);
  const { tap } = useHaptics();

  useEffect(() => {
    if (!open) return;
    Promise.all([
      supabaseClient.from("profiles").select("id, full_name").order("full_name"),
      supabaseClient.from("groups").select("id, name").order("name"),
      supabaseClient
        .from("friendships")
        .select("id, user_a, user_b, user_a_profile:profiles!user_a(full_name), user_b_profile:profiles!user_b(full_name)")
        .eq("status", "accepted")
        .order("created_at", { ascending: false }),
    ]).then(([profilesRes, groupsRes, friendshipsRes]) => {
      if (profilesRes.data) setProfilesList(profilesRes.data);
      if (groupsRes.data) setGroupsList(groupsRes.data);
      if (friendshipsRes.data) {
        const friendshipRows = friendshipsRes.data as unknown as FriendshipOptionRecord[];
        setFriendshipsList(friendshipRows.map((friendship) => ({
          id: friendship.id,
          user_a: friendship.user_a,
          user_b: friendship.user_b,
          user_a_name: relationOne(friendship.user_a_profile)?.full_name ?? tAdmin("people.userA"),
          user_b_name: relationOne(friendship.user_b_profile)?.full_name ?? tAdmin("people.userB"),
        })));
      }
    });
  }, [open, tAdmin]);

  const handleSubmit = () => {
    const missingContext = contextType === "group" ? !groupId : !friendshipId;
    if (!fromUser || !toUser || !amount || !paymentDate || missingContext) {
      toast.error(tAdmin("transactions.payments.requiredFields"));
      return;
    }
    if (fromUser === toUser) {
      toast.error(tAdmin("transactions.payments.sameUserError"));
      return;
    }
    tap();
    onSubmit({
      context_type: contextType,
      from_user: fromUser,
      to_user: toUser,
      amount: Number(amount),
      currency,
      payment_date: paymentDate,
      group_id: contextType === "group" ? groupId : null,
      friendship_id: contextType === "friend" ? friendshipId : null,
      note,
    });
  };

  return (
    <AdminCrudDialog
      open={open}
      onOpenChange={onOpenChange}
      title={tAdmin("transactions.payments.createTitle")}
      description={tAdmin("transactions.payments.createDescription")}
      isSubmitting={isCreating}
      submitLabel={tAdmin("transactions.payments.create")}
      onSubmit={handleSubmit}
      contentClassName="sm:max-w-[640px]"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3">
          <button
            type="button"
            onClick={() => { tap(); setContextType("group"); setFriendshipId(""); }}
            className={cn(
              "flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors",
              contextType === "group" ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent",
            )}
          >
            {tAdmin("context.group")}
          </button>
          <button
            type="button"
            onClick={() => { tap(); setContextType("friend"); setGroupId(""); }}
            className={cn(
              "flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors",
              contextType === "friend" ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent",
            )}
          >
            {tAdmin("context.friends")}
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{contextType === "group" ? tAdmin("common.group") : tAdmin("common.friendship")}</Label>
            {contextType === "group" ? (
              <Select value={groupId} onValueChange={(v) => { tap(); setGroupId(v); }}>
                <SelectTrigger><SelectValue placeholder={tAdmin("transactions.expenses.allGroups")} /></SelectTrigger>
                <SelectContent>
                  {groupsList.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Select value={friendshipId} onValueChange={(v) => { tap(); setFriendshipId(v); }}>
                <SelectTrigger><SelectValue placeholder={tAdmin("people.selectUser")} /></SelectTrigger>
                <SelectContent>
                  {friendshipsList.map((friendship) => (
                    <SelectItem key={friendship.id} value={friendship.id}>
                      {formatFriendshipName(friendship)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-2">
            <Label>{tAdmin("transactions.payments.paymentDate")}</Label>
            <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{tAdmin("transactions.payments.fromUser")}</Label>
            <UserSingleCombobox
              value={fromUser}
              onChange={(v) => { tap(); setFromUser(v); }}
              users={profilesList}
              placeholder={tAdmin("transactions.payments.selectSender")}
            />
          </div>
          <div className="space-y-2">
            <Label>{tAdmin("transactions.payments.toUser")}</Label>
            <UserSingleCombobox
              value={toUser}
              onChange={(v) => { tap(); setToUser(v); }}
              users={profilesList}
              placeholder={tAdmin("transactions.payments.selectReceiver")}
            />
          </div>
          <div className="space-y-2"><Label>{tAdmin("common.amount")}</Label><Input type="number" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div className="space-y-2">
            <Label>{tAdmin("transactions.payments.currency")}</Label>
            <Select value={currency} onValueChange={(v) => { tap(); setCurrency(v); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="VND">VND</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2"><Label>{tAdmin("transactions.payments.noteOptional")}</Label><Input placeholder={tAdmin("transactions.payments.notePlaceholder")} value={note} onChange={(e) => setNote(e.target.value)} /></div>
        </div>
      </div>
    </AdminCrudDialog>
  );
}

// ─── Edit Payment Dialog ────────────────────────────────────────────

export function EditPaymentDialog({
  payment, open, onOpenChange, onSubmit, isUpdating,
}: {
  payment: PaymentRow | null; open: boolean; onOpenChange: (open: boolean) => void;
  onSubmit: (data: PaymentFormPayload) => void;
  isUpdating: boolean;
}) {
  const { tAdmin } = useAdminTranslation();
  const initialContextType = payment?.context_type === "friend" ? "friend" : "group";
  const [contextType, setContextType] = useState<"group" | "friend">(initialContextType);
  const [fromUser, setFromUser] = useState(payment?.from_user_id ?? "");
  const [toUser, setToUser] = useState(payment?.to_user_id ?? "");
  const [amount, setAmount] = useState(payment ? String(payment.amount) : "");
  const [currency, setCurrency] = useState(payment?.currency || "VND");
  const [paymentDate, setPaymentDate] = useState(() => payment?.payment_date?.split("T")[0] ?? "");
  const [groupId, setGroupId] = useState(payment?.group_id ?? "");
  const [friendshipId, setFriendshipId] = useState(payment?.friendship_id ?? "");
  const [note, setNote] = useState(payment?.note ?? "");
  const [profilesList, setProfilesList] = useState<Array<{ id: string; full_name: string }>>([]);
  const [groupsList, setGroupsList] = useState<Array<{ id: string; name: string }>>([]);
  const [friendshipsList, setFriendshipsList] = useState<FriendshipOption[]>([]);
  const { tap } = useHaptics();

  useEffect(() => {
    if (!open) return;
    Promise.all([
      supabaseClient.from("profiles").select("id, full_name").order("full_name"),
      supabaseClient.from("groups").select("id, name").order("name"),
      supabaseClient
        .from("friendships")
        .select("id, user_a, user_b, user_a_profile:profiles!user_a(full_name), user_b_profile:profiles!user_b(full_name)")
        .eq("status", "accepted")
        .order("created_at", { ascending: false }),
    ]).then(([profilesRes, groupsRes, friendshipsRes]) => {
      if (profilesRes.data) setProfilesList(profilesRes.data);
      if (groupsRes.data) setGroupsList(groupsRes.data);
      if (friendshipsRes.data) {
        const friendshipRows = friendshipsRes.data as unknown as FriendshipOptionRecord[];
        setFriendshipsList(friendshipRows.map((friendship) => ({
          id: friendship.id,
          user_a: friendship.user_a,
          user_b: friendship.user_b,
          user_a_name: relationOne(friendship.user_a_profile)?.full_name ?? tAdmin("people.userA"),
          user_b_name: relationOne(friendship.user_b_profile)?.full_name ?? tAdmin("people.userB"),
        })));
      }
    });
  }, [open, tAdmin]);

  if (!payment) return null;

  const handleSubmit = () => {
    const missingContext = contextType === "group" ? !groupId : !friendshipId;
    if (!fromUser || !toUser || !amount || !paymentDate || missingContext) {
      toast.error(tAdmin("transactions.payments.requiredFields"));
      return;
    }
    if (fromUser === toUser) {
      toast.error(tAdmin("transactions.payments.sameUserError"));
      return;
    }
    tap();
    onSubmit({
      context_type: contextType,
      from_user: fromUser,
      to_user: toUser,
      amount: Number(amount),
      currency,
      payment_date: paymentDate,
      group_id: contextType === "group" ? groupId : null,
      friendship_id: contextType === "friend" ? friendshipId : null,
      note,
    });
  };

  return (
    <AdminCrudDialog
      open={open}
      onOpenChange={onOpenChange}
      title={tAdmin("transactions.payments.editTitle")}
      description={tAdmin("transactions.payments.editDescriptionForUsers", {
        from: payment.from_user_name,
        to: payment.to_user_name,
      })}
      isSubmitting={isUpdating}
      submitLabel={tAdmin("common.save")}
      contentClassName="sm:max-w-[640px]"
      onSubmit={handleSubmit}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3">
          <button
            type="button"
            onClick={() => { tap(); setContextType("group"); setFriendshipId(""); }}
            className={cn(
              "flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors",
              contextType === "group" ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent",
            )}
          >
            {tAdmin("context.group")}
          </button>
          <button
            type="button"
            onClick={() => { tap(); setContextType("friend"); setGroupId(""); }}
            className={cn(
              "flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors",
              contextType === "friend" ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent",
            )}
          >
            {tAdmin("context.friends")}
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{contextType === "group" ? tAdmin("common.group") : tAdmin("common.friendship")}</Label>
            {contextType === "group" ? (
              <Select value={groupId} onValueChange={(v) => { tap(); setGroupId(v); }}>
                <SelectTrigger><SelectValue placeholder={tAdmin("transactions.expenses.allGroups")} /></SelectTrigger>
                <SelectContent>
                  {groupsList.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Select value={friendshipId} onValueChange={(v) => { tap(); setFriendshipId(v); }}>
                <SelectTrigger><SelectValue placeholder={tAdmin("common.friendship")} /></SelectTrigger>
                <SelectContent>
                  {friendshipsList.map((friendship) => (
                    <SelectItem key={friendship.id} value={friendship.id}>
                      {formatFriendshipName(friendship)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-2"><Label>{tAdmin("transactions.payments.paymentDate")}</Label><Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} /></div>
          <div className="space-y-2">
            <Label>{tAdmin("transactions.payments.fromUser")}</Label>
            <UserSingleCombobox value={fromUser} onChange={(v) => { tap(); setFromUser(v); }} users={profilesList} placeholder={tAdmin("transactions.payments.selectSender")} />
          </div>
          <div className="space-y-2">
            <Label>{tAdmin("transactions.payments.toUser")}</Label>
            <UserSingleCombobox value={toUser} onChange={(v) => { tap(); setToUser(v); }} users={profilesList} placeholder={tAdmin("transactions.payments.selectReceiver")} />
          </div>
          <div className="space-y-2"><Label>{tAdmin("common.amount")}</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div className="space-y-2">
            <Label>{tAdmin("transactions.payments.currency")}</Label>
            <Select value={currency} onValueChange={(v) => { tap(); setCurrency(v); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="VND">VND</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2"><Label>{tAdmin("transactions.payments.note")}</Label><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={tAdmin("transactions.payments.notePlaceholder")} /></div>
        </div>
        <div className="grid gap-3 rounded-lg border bg-muted/20 p-3 text-sm sm:grid-cols-2">
          <DetailItem label="ID" value={<span className="font-mono text-xs">{payment.id}</span>} />
          <DetailItem label={tAdmin("common.createdAt")} value={formatDate(payment.created_at)} />
        </div>
      </div>
    </AdminCrudDialog>
  );
}
