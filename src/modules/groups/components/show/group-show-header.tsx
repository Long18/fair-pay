import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeftIcon,
  PencilIcon,
  Trash2Icon,
  PlusIcon,
  UsersIcon,
  CalendarIcon,
  CheckCircle2Icon,
  ArchiveIcon,
  ArchiveRestoreIcon,
  MoreVerticalIcon,
} from "@/components/ui/icons";
import { formatDate } from "@/lib/locale-utils";
import {
  firstPaintHeroInitial,
  firstPaintHeroTransition,
  useFirstPaintNavigation,
  useReducedMotion,
} from "@/lib/motion";
import { useHaptics } from "@/hooks/use-haptics";
import { useTrackEvent } from "@/hooks/use-track-event";
import { cn } from "@/lib/utils";
import type { Group } from "../../types";

export type GroupShowMemberPreview = {
  id: string;
  full_name: string;
  avatar_url?: string | null;
};

type GroupShowHeaderProps = {
  group: Group;
  membersList: GroupShowMemberPreview[];
  memberCount: number;
  isArchived: boolean;
  canManage: boolean;
  isAdmin: boolean;
  isCreator: boolean;
  unsettledCount: number;
  shareTrigger: React.ReactNode;
  onBack: () => void;
  onAddExpense: () => void;
  onSettleAll: () => void;
  onEdit: () => void;
  onAddMember: () => void;
  onArchiveToggle: () => void;
  onDelete: () => void;
};

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
  );
}

export function GroupShowHeader({
  group,
  membersList,
  memberCount,
  isArchived,
  canManage,
  isAdmin,
  isCreator,
  unsettledCount,
  shareTrigger,
  onBack,
  onAddExpense,
  onSettleAll,
  onEdit,
  onAddMember,
  onArchiveToggle,
  onDelete,
}: GroupShowHeaderProps) {
  const { t } = useTranslation();
  const { tap, warning } = useHaptics();
  const { track } = useTrackEvent();
  const reducedMotion = useReducedMotion();
  const firstPaint = useFirstPaintNavigation();

  const showAddExpense = !isArchived || canManage;
  const showSettleAll = isAdmin && unsettledCount > 0 && (!isArchived || canManage);
  const showMoreMenu = canManage;
  const showPrimaryActions = showAddExpense || showSettleAll;
  const showSecondaryCluster = Boolean(shareTrigger) || showMoreMenu;

  return (
    <>
      <div className="md:hidden">
        <Button variant="ghost" onClick={onBack} className="-ml-2 rounded-lg">
          <ArrowLeftIcon size={16} className="mr-2" />
          {t("common.back", "Back")}
        </Button>
      </div>

      <motion.div
        initial={
          firstPaint
            ? firstPaintHeroInitial(reducedMotion)
            : reducedMotion
              ? false
              : { opacity: 0, y: 12 }
        }
        animate={{ opacity: 1, y: 0 }}
        transition={
          firstPaint
            ? firstPaintHeroTransition(reducedMotion)
            : { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }
        }
      >
        <Card className="rounded-xl border border-border/60 bg-card shadow-none">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <div className="relative shrink-0">
                <Avatar className="h-20 w-20 border border-border/60 sm:h-[5.5rem] sm:w-[5.5rem]">
                  <AvatarImage src={group.avatar_url || undefined} alt={group.name} />
                  <AvatarFallback className="bg-muted text-xl sm:text-2xl">
                    {getInitials(group.name)}
                  </AvatarFallback>
                </Avatar>
                {isArchived ? (
                  <div className="absolute -bottom-0.5 -right-0.5 rounded-full border border-border/60 bg-card p-1">
                    <ArchiveIcon className="h-3.5 w-3.5 text-amber-700" aria-hidden />
                  </div>
                ) : null}
              </div>

              <div className="min-w-0 flex-1 text-center sm:text-left">
                <div className="mb-1 flex flex-col items-center gap-2 sm:flex-row sm:flex-wrap sm:items-start">
                  <h1
                    className="text-xl font-semibold tracking-tight line-clamp-2 sm:text-2xl sm:line-clamp-1"
                    title={group.name}
                  >
                    {group.name}
                  </h1>
                  <div className="flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
                    {isArchived ? (
                      <Badge variant="secondary" className="rounded-full text-xs">
                        {t("groups.status.archived", "Archived")}
                      </Badge>
                    ) : null}
                    <Badge variant="secondary" className="gap-1 rounded-full text-xs">
                      <UsersIcon className="h-3 w-3" aria-hidden />
                      {t("groups.membersCount", "{{count}} members", { count: memberCount })}
                    </Badge>
                  </div>
                </div>

                {group.description ? (
                  <p
                    className="mb-2 text-sm text-muted-foreground line-clamp-2 sm:line-clamp-3"
                    title={group.description}
                  >
                    {group.description}
                  </p>
                ) : null}

                <p className="mb-3 text-xs text-muted-foreground">
                  <CalendarIcon className="mr-1 inline h-3 w-3" aria-hidden />
                  {t("groups.createdOn", "Created")}{" "}
                  {formatDate(group.created_at, { year: "numeric", month: "short", day: "numeric" })}
                </p>

                {membersList.length > 0 ? (
                  <div className="mb-4 flex flex-col items-center gap-2 sm:flex-row sm:items-center">
                    <div className="flex items-center">
                      {membersList.slice(0, 5).map((member) => (
                        <Avatar
                          key={member.id}
                          className="-ml-2 h-8 w-8 border border-background first:ml-0"
                        >
                          <AvatarImage src={member.avatar_url || undefined} alt={member.full_name} />
                          <AvatarFallback className="text-[10px]">
                            {getInitials(member.full_name)}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {membersList.length > 5 ? (
                        <div className="-ml-2 flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-muted">
                          <span className="text-[10px] font-medium">+{membersList.length - 5}</span>
                        </div>
                      ) : null}
                    </div>
                    <span className="max-w-[min(100%,18rem)] truncate text-xs text-muted-foreground">
                      {membersList
                        .slice(0, 3)
                        .map((m) => m.full_name.split(" ")[0])
                        .join(", ")}
                      {membersList.length > 3 ? ` +${membersList.length - 3}` : ""}
                    </span>
                  </div>
                ) : null}

                {(showPrimaryActions || showSecondaryCluster) && (
                  <div
                    className={cn(
                      "flex w-full flex-col gap-2",
                      showPrimaryActions && showSecondaryCluster
                        ? "sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                        : "sm:items-start"
                    )}
                  >
                    {showPrimaryActions ? (
                      <div
                        className={cn(
                          "flex w-full gap-2",
                          showAddExpense && showSettleAll
                            ? "grid grid-cols-1 min-[420px]:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] sm:flex sm:w-auto"
                            : "flex-col min-[420px]:flex-row sm:w-auto"
                        )}
                      >
                        {showAddExpense ? (
                          <Button
                            onClick={onAddExpense}
                            className="min-h-9 w-full gap-1.5 sm:w-auto"
                          >
                            <PlusIcon size={16} />
                            {t("expenses.addExpense", "Add Expense")}
                          </Button>
                        ) : null}
                        {showSettleAll ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="min-h-9 w-full gap-1.5 font-normal text-muted-foreground hover:text-foreground sm:w-auto"
                            onClick={onSettleAll}
                          >
                            <CheckCircle2Icon size={16} className="opacity-80" aria-hidden />
                            {t("groups.settleAll", "Settle All")}
                            <span className="tabular-nums text-foreground/90">({unsettledCount})</span>
                          </Button>
                        ) : null}
                      </div>
                    ) : null}

                    {showSecondaryCluster ? (
                      <div
                        className={cn(
                          "flex w-full items-center",
                          showPrimaryActions ? "justify-end sm:ml-auto sm:w-auto" : "justify-center sm:justify-start"
                        )}
                      >
                        <div
                          className="inline-flex items-center overflow-hidden rounded-lg border border-border/60 bg-muted/15 shadow-none"
                          role="group"
                        >
                          {shareTrigger}
                          {showMoreMenu ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={cn(
                                    "min-h-9 min-w-9 shrink-0 rounded-none",
                                    shareTrigger ? "border-l border-border/60" : undefined
                                  )}
                                >
                                  <MoreVerticalIcon size={16} />
                                  <span className="sr-only">{t("groups.actions", "Actions")}</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {isAdmin ? (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      tap();
                                      track({ eventName: "group_edit_clicked", groupId: group.id });
                                      onEdit();
                                    }}
                                  >
                                    <PencilIcon className="mr-2 h-4 w-4" />
                                    {t("groups.editGroup", "Edit Group")}
                                  </DropdownMenuItem>
                                ) : null}
                                {isAdmin && (!isArchived || canManage) ? (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      tap();
                                      track({ eventName: "group_member_invite_clicked", groupId: group.id });
                                      onAddMember();
                                    }}
                                  >
                                    <PlusIcon className="mr-2 h-4 w-4" />
                                    {t("groups.addMember", "Add Member")}
                                  </DropdownMenuItem>
                                ) : null}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    tap();
                                    onArchiveToggle();
                                  }}
                                >
                                  {isArchived ? (
                                    <>
                                      <ArchiveRestoreIcon className="mr-2 h-4 w-4" />
                                      {t("groups.restore", "Restore Group")}
                                    </>
                                  ) : (
                                    <>
                                      <ArchiveIcon className="mr-2 h-4 w-4" />
                                      {t("groups.archive", "Archive Group")}
                                    </>
                                  )}
                                </DropdownMenuItem>
                                {isCreator ? (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => {
                                        warning();
                                        onDelete();
                                      }}
                                      className="text-destructive"
                                    >
                                      <Trash2Icon className="mr-2 h-4 w-4" />
                                      {t("groups.deleteGroup", "Delete Group")}
                                    </DropdownMenuItem>
                                  </>
                                ) : null}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </>
  );
}
