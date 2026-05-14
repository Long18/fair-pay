/**
 * Cache configuration for different resources (React Query v5 — uses gcTime, not cacheTime)
 *
 * staleTime: how long before data is considered stale and eligible for background refetch
 * gcTime:    how long unused cache entries stay in memory before garbage collection
 *
 * Strategy:
 * - Profiles: 30 min stale / 1 hr GC (user data changes infrequently)
 * - Groups: 10 min stale / 30 min GC (group metadata changes occasionally)
 * - Expenses: 2 min stale / 5 min GC (frequently changing transactional data)
 * - Payments: 2 min stale / 5 min GC (frequently changing transactional data)
 * - Notifications: 30 sec stale / 2 min GC (real-time data)
 * - Leaderboard: 15 min stale / 30 min GC (aggregated data, can be stale)
 * - Admin: 5 min stale / 15 min GC (admin views, moderate freshness needed)
 */
export const CACHE_CONFIG = {
  profiles: {
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  },
  groups: {
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  },
  expenses: {
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  },
  payments: {
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  },
  notifications: {
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
  },
  leaderboard: {
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  },
  friendships: {
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  },
  balance: {
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  },
  admin: {
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  },
} as const;

export type CacheConfig = typeof CACHE_CONFIG;
export type ResourceType = keyof CacheConfig;
