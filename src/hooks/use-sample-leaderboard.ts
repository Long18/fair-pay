export interface LeaderboardUser {
  id: string;
  name: string;
  avatar_url: string | null;
  balance: number;
  rank: number;
  badge?: "gold" | "silver" | "bronze";
}

export interface PublicStats {
  total_users: number;
  total_groups: number;
  total_transactions: number;
  total_amount_tracked: number;
}

export const useSampleLeaderboard = () => {
  const topDebtors: LeaderboardUser[] = [
    {
      id: "1",
      name: "Alex Johnson",
      avatar_url: null,
      balance: -2450000,
      rank: 1,
      badge: "gold",
    },
    {
      id: "2",
      name: "Sarah Chen",
      avatar_url: null,
      balance: -1890000,
      rank: 2,
      badge: "silver",
    },
    {
      id: "3",
      name: "Mike Wilson",
      avatar_url: null,
      balance: -1560000,
      rank: 3,
      badge: "bronze",
    },
    {
      id: "4",
      name: "Emma Davis",
      avatar_url: null,
      balance: -1230000,
      rank: 4,
    },
    {
      id: "5",
      name: "James Brown",
      avatar_url: null,
      balance: -980000,
      rank: 5,
    },
  ];

  const topCreditors: LeaderboardUser[] = [
    {
      id: "6",
      name: "Lisa Anderson",
      avatar_url: null,
      balance: 3200000,
      rank: 1,
      badge: "gold",
    },
    {
      id: "7",
      name: "David Kim",
      avatar_url: null,
      balance: 2750000,
      rank: 2,
      badge: "silver",
    },
    {
      id: "8",
      name: "Rachel Green",
      avatar_url: null,
      balance: 2100000,
      rank: 3,
      badge: "bronze",
    },
    {
      id: "9",
      name: "Tom Martinez",
      avatar_url: null,
      balance: 1650000,
      rank: 4,
    },
    {
      id: "10",
      name: "Nina Patel",
      avatar_url: null,
      balance: 1420000,
      rank: 5,
    },
  ];

  const stats: PublicStats = {
    total_users: 1247,
    total_groups: 342,
    total_transactions: 8956,
    total_amount_tracked: 125000000,
  };

  return {
    topDebtors,
    topCreditors,
    stats,
  };
};
