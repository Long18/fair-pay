import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LeaderboardUser } from "@/hooks/use-sample-leaderboard";

interface PublicLeaderboardProps {
  users: LeaderboardUser[];
  title: string;
  type: "debtors" | "creditors";
}

export const PublicLeaderboard = ({ users, title, type }: PublicLeaderboardProps) => {
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
    <Card className="border-[#F2F2F2]">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-[#333] flex items-center gap-2">
          {type === "debtors" ? "📉" : "📈"}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#F9F9F9] transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex items-center justify-center w-8 text-lg font-bold text-[#828282]">
                  {getBadgeEmoji(user.badge) || `#${user.rank}`}
                </div>
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-[#FFA14E] text-white">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#333] truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-[#828282]">
                    {type === "debtors" ? "Owes" : "Is owed"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p
                  className={`text-sm font-bold ${
                    type === "debtors" ? "text-[#EB5757]" : "text-[#6FCF97]"
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
