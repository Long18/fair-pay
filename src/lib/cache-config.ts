/**
 * Cache configuration for different resources
 * Defines how long each resource type should be cached
 *
 * Caching Strategy:
 * - Profiles: 30 min (user data changes infrequently)
 * - Groups: 10 min (group metadata changes occasionally)
 * - Expenses: 2 min (frequently changing transactional data)
 * - Payments: 2 min (frequently changing transactional data)
 * - Notifications: 30 sec (real-time data)
 * - Leaderboard: 15 min (aggregated data, can be stale)
 */
export const CACHE_CONFIG = {
  profiles: {
    staleTime: 30 * 60 * 1000, // 30 minutes
    cacheTime: 60 * 60 * 1000, // 1 hour
  },
  groups: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  },
  expenses: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
  },
  payments: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
  },
  notifications: {
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 2 * 60 * 1000, // 2 minutes
  },
  leaderboard: {
    staleTime: 15 * 60 * 1000, // 15 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  },
  friendships: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 15 * 60 * 1000, // 15 minutes
  },
  balance: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
  },
} as const;

export type CacheConfig = typeof CACHE_CONFIG;
export type ResourceType = keyof CacheConfig;
