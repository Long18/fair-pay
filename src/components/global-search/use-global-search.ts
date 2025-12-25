import { useState, useEffect, useCallback } from "react";
import { useGetIdentity, useList } from "@refinedev/core";
import { Profile } from "@/modules/profile/types";
import { Expense } from "@/modules/expenses/types";
import { Group } from "@/modules/groups/types";
import { Friendship } from "@/modules/friends/types";
import { SearchResult } from "./types";

const RECENT_SEARCHES_KEY = "fairpay_recent_searches";
const MAX_RECENT_SEARCHES = 5;

export const useGlobalSearch = (query: string) => {
  const { data: identity } = useGetIdentity<Profile>();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const { query: expensesQuery } = useList<Expense>({
    resource: "expenses",
    filters: query
      ? [
          {
            field: "description",
            operator: "contains",
            value: query,
          },
        ]
      : [],
    pagination: {
      pageSize: 10,
    },
    meta: {
      select: "*, profiles:paid_by_user_id(full_name)",
    },
    queryOptions: {
      enabled: !!query && query.length >= 2,
    },
  });

  const { query: groupsQuery } = useList<Group>({
    resource: "groups",
    filters: query
      ? [
          {
            field: "name",
            operator: "contains",
            value: query,
          },
        ]
      : [],
    pagination: {
      pageSize: 10,
    },
    queryOptions: {
      enabled: !!query && query.length >= 2,
    },
  });

  const { query: friendshipsQuery } = useList<Friendship>({
    resource: "friendships",
    filters: query
      ? [
          {
            field: "status",
            operator: "eq",
            value: "accepted",
          },
        ]
      : [],
    pagination: {
      pageSize: 10,
    },
    meta: {
      select: "*, user_a_profile:user_a_id(id, full_name), user_b_profile:user_b_id(id, full_name)",
    },
    queryOptions: {
      enabled: !!query && query.length >= 2,
    },
  });

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to load recent searches", e);
      }
    }
  }, []);

  // Process search results
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    const isLoading =
      expensesQuery.isLoading ||
      groupsQuery.isLoading ||
      friendshipsQuery.isLoading;

    setIsSearching(isLoading);

    const expenses = expensesQuery.data?.data || [];
    const groups = groupsQuery.data?.data || [];
    const friendships = friendshipsQuery.data?.data || [];

    const expenseResults: SearchResult[] = expenses.map((expense: any) => ({
      id: expense.id,
      type: "expense" as const,
      title: expense.description,
      subtitle: `Paid by ${expense.profiles?.full_name || "Unknown"} • ${new Date(expense.expense_date).toLocaleDateString("vi-VN")}`,
      link: `/expenses/show/${expense.id}`,
      metadata: {
        amount: expense.amount,
        currency: expense.currency,
        category: expense.category,
        date: expense.expense_date,
      },
    }));

    const groupResults: SearchResult[] = groups.map((group: any) => ({
      id: group.id,
      type: "group" as const,
      title: group.name,
      subtitle: group.description || "No description",
      link: `/groups/show/${group.id}`,
    }));

    // Filter friends by name matching query
    const friendResults: SearchResult[] = friendships
      .map((friendship: any) => {
        const isUserA = friendship.user_a_id === identity?.id;
        const friendProfile = isUserA
          ? friendship.user_b_profile
          : friendship.user_a_profile;

        if (
          friendProfile?.full_name
            ?.toLowerCase()
            .includes(query.toLowerCase())
        ) {
          return {
            id: friendship.id,
            type: "friend" as const,
            title: friendProfile.full_name,
            subtitle: "Friend",
            link: `/friends/show/${friendship.id}`,
          };
        }
        return null;
      })
      .filter(Boolean) as SearchResult[];

    setResults([...expenseResults, ...groupResults, ...friendResults]);
  }, [
    query,
    expensesQuery.data,
    groupsQuery.data,
    friendshipsQuery.data,
    expensesQuery.isLoading,
    groupsQuery.isLoading,
    friendshipsQuery.isLoading,
    identity,
  ]);

  const addToRecentSearches = useCallback((search: string) => {
    if (!search || search.length < 2) return;

    setRecentSearches((prev) => {
      const updated = [search, ...prev.filter((s) => s !== search)].slice(
        0,
        MAX_RECENT_SEARCHES
      );
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  }, []);

  return {
    results,
    isSearching,
    recentSearches,
    addToRecentSearches,
    clearRecentSearches,
  };
};
