import { useGo } from "@refinedev/core";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Bell } from "lucide-react";
import { useNotifications } from "../hooks/use-notifications";
import { NotificationItem } from "../components/notification-item";

export const NotificationList = () => {
  const go = useGo();
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  return (
    <div className="container max-w-4xl py-8">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4"
        onClick={() => go({ to: "/" })}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-muted-foreground mt-2">
                You have {unreadCount} unread notification{unreadCount > 1 ? "s" : ""}
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={markAllAsRead}
            >
              Mark all as read
            </Button>
          )}
        </div>

        {/* Notifications */}
        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-sm text-muted-foreground">Loading...</div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <Bell className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-foreground mb-2">
                No notifications yet
              </p>
              <p className="text-sm text-muted-foreground text-center">
                You're all caught up! Notifications about expenses, payments, and friends will appear here.
              </p>
            </div>
          ) : (
            <div>
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
