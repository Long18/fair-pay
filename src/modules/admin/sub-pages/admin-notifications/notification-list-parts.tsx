import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyMedia,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { BellIcon } from "@/components/ui/icons";
import { UserAvatar } from "@/components/user-display";
import { formatDate } from "@/lib/locale-utils";
import {
  AdminMobileCard,
  AdminMobileCards,
  AdminMobilePagination,
} from "../../components/AdminMobileCards";
import { useAdminTranslation } from "../../i18n";
import { ReadStatusBadge, TypeBadge } from "./badges";
import { RowActions } from "./row-actions";
import type { NotificationRow } from "./types";

export function NotificationsEmptyState({
  hasActiveFilters,
  onClearFilters,
}: {
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}) {
  const { tAdmin } = useAdminTranslation();

  return (
    <Empty className="min-h-[200px] rounded-md border">
      <EmptyMedia variant="icon">
        <BellIcon className="h-6 w-6" />
      </EmptyMedia>
      <EmptyHeader>
        <EmptyTitle>{tAdmin("notifications.noResultsTitle")}</EmptyTitle>
        <EmptyDescription>
          {hasActiveFilters
            ? tAdmin("notifications.noResultsFiltered")
            : tAdmin("notifications.noResultsEmpty")}
        </EmptyDescription>
      </EmptyHeader>
      {hasActiveFilters && (
        <EmptyContent>
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            {tAdmin("common.clearFilters")}
          </Button>
        </EmptyContent>
      )}
    </Empty>
  );
}

export function NotificationMobileList({
  items,
  currentPage,
  pageCount,
  onPageChange,
  onOpen,
  onEdit,
  onDelete,
}: {
  items: NotificationRow[];
  currentPage: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  onOpen: (notification: NotificationRow) => void;
  onEdit: (notification: NotificationRow) => void;
  onDelete: (notification: NotificationRow) => void;
}) {
  const { tAdmin } = useAdminTranslation();

  return (
    <div className="space-y-3 md:hidden">
      <AdminMobileCards
        items={items}
        getKey={(notification) => notification.id}
        renderItem={(notification) => (
          <AdminMobileCard
            title={notification.title || notification.message}
            description={notification.user_name}
            leading={
              <UserAvatar
                user={{
                  full_name: notification.user_name,
                  avatar_url: notification.user_avatar,
                }}
                size="md"
              />
            }
            badges={
              <>
                <TypeBadge type={notification.type} />
                <ReadStatusBadge isRead={notification.is_read} />
              </>
            }
            meta={[
              {
                label: tAdmin("common.createdAt"),
                value: formatDate(notification.created_at),
              },
            ]}
            actions={
              <RowActions
                onEdit={() => onEdit(notification)}
                onDelete={() => onDelete(notification)}
              />
            }
            onClick={() => onOpen(notification)}
            ariaLabel={notification.title || notification.message}
          />
        )}
      />
      {items.length > 0 && (
        <AdminMobilePagination
          summary={tAdmin("common.pageCount", { page: currentPage, total: pageCount })}
          previousLabel={tAdmin("common.previous")}
          nextLabel={tAdmin("common.next")}
          canPrevious={currentPage > 1}
          canNext={currentPage < pageCount}
          onPrevious={() => onPageChange(currentPage - 1)}
          onNext={() => onPageChange(currentPage + 1)}
        />
      )}
    </div>
  );
}
