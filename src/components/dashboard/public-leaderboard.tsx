import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LeaderboardUser } from "@/hooks/use-sample-leaderboard";

interface PublicLeaderboardProps {
  users: LeaderboardUser[];
  title: string;
  type: "debtors" | "creditors";
}

export const PublicLeaderboard = ({ users, title, type }: PublicLeaderboardProps) => {
  const { t } = useTranslation();

  const formatAmount = (amount: number) => {
    const absAmount = Math.abs(amount);
    return new Intl.NumberFormat("vi-VN").format(absAmount);
  };

  const getBadgeEmoji = (badge?: "gold" | "silver" | "bronze") => {
    switch (badge) {
      case "gold":
        return "🥇";
      case "silver":
        return "🥈";
      case "bronze":
        return "🥉";
      default:
        return null;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
          {type === "debtors" ? "📉" : "📈"}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-elevated transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex items-center justify-center w-8 text-lg font-bold text-muted-foreground">
                  {getBadgeEmoji(user.badge) || `#${user.rank}`}
                </div>
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-avatar-fallback text-avatar-fallback-foreground">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {type === "debtors" ? t("dashboard.owes") : t("dashboard.isOwed")}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p
                  className={`text-sm font-bold ${
                    type === "debtors" ? "text-semantic-negative" : "text-semantic-positive"
                  }`}
                >
                  ₫{formatAmount(user.balance)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
