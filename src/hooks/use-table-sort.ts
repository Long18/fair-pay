import { useState, useMemo, useCallback, useEffect } from "react";

/**
 * Sort Direction
 */
export type SortDirection = "asc" | "desc" | null;

/**
 * Custom Sort Function
 *
 * Allows custom sorting logic for complex fields.
 */
export type SortFn<T> = (a: T, b: T, direction: "asc" | "desc") => number;

/**
 * Sort Config
 *
 * Optional configuration for custom sort behavior per field.
 */
export type SortConfig<T> = Partial<{
  [K in keyof T]: SortFn<T>;
}>;

/**
 * useTableSort Hook
 *
 * Generic hook for managing table sort state and sorting data.
 *
 * @template T - Type of data items in the table
 * @param data - Array of data to sort
 * @param config - Optional custom sort functions for specific fields
 * @param defaultSortKey - Optional default sort field
 * @param defaultSortDirection - Optional default sort direction
 *
 * @returns {object} Sort state and actions
 * @returns {keyof T | null} sortKey - Current sort field
 * @returns {SortDirection} sortDirection - Current sort direction
 * @returns {function} setSortKey - Set sort field (toggles direction on re-click)
 * @returns {function} setSortDirection - Manually set sort direction
 * @returns {function} clearSort - Clear all sorting
 * @returns {T[]} sortedData - Data after applying sort
 *
 * @example
 * interface Expense {
 *   id: string
 *   amount: number
 *   description: string
 *   date: Date
 * }
 *
 * const config: SortConfig<Expense> = {
 *   date: (a, b, direction) => {
 *     const diff = a.date.getTime() - b.date.getTime()
 *     return direction === "asc" ? diff : -diff
 *   }
 * }
 *
 * const { sortKey, sortDirection, setSortKey, sortedData } =
 *   useTableSort(expenses, config, "date", "desc")
 *
 * // Click column header to toggle sort
 * <th onClick={() => setSortKey("amount")}>Amount</th>
 */
export function useTableSort<T>(
  data: T[],
  config: SortConfig<T> = {},
  defaultSortKey: keyof T | null = null,
  defaultSortDirection: SortDirection = "asc"
) {
  const [sortKey, setSortKeyState] = useState<keyof T | null>(defaultSortKey);
  const [sortDirection, setSortDirectionState] = useState<SortDirection>(
    defaultSortKey ? defaultSortDirection : null
  );

  // Set sort key (toggle direction on re-click)
  const setSortKey = useCallback((key: keyof T) => {
    setSortKeyState(prevKey => {
      // If same key, toggle direction
      if (prevKey === key) {
        setSortDirectionState(prevDirection => {
          if (prevDirection === "asc") return "desc";
          if (prevDirection === "desc") return null; // Third click clears sort
          return "asc"; // First click
        });

        // Check if we need to clear the key (will be handled by state callback)
        // We need to defer this check until the state update is complete
        return key; // Return key first, will be cleared in next update if needed
      } else {
        // Different key, set to asc
        setSortDirectionState("asc");
        return key;
      }
    });
  }, []);

  // Clear sort key when direction becomes null
  useEffect(() => {
    if (sortDirection === null && sortKey !== null) {
      setSortKeyState(null);
    }
  }, [sortDirection, sortKey]);

  // Manually set sort direction
  const setSortDirection = useCallback((direction: SortDirection) => {
    setSortDirectionState(direction);
  }, []);

  // Clear sort
  const clearSort = useCallback(() => {
    setSortKeyState(null);
    setSortDirectionState(null);
  }, []);

  // Sort data
  const sortedData = useMemo(() => {
    // No sorting if sortKey or sortDirection is null
    if (!sortKey || !sortDirection) {
      return data;
    }

    // Create copy to avoid mutating original array
    const sorted = [...data];

    // Check if custom sort function exists
    const customSortFn = config[sortKey];

    if (customSortFn) {
      // Use custom sort function
      return sorted.sort((a, b) => customSortFn(a, b, sortDirection));
    }

    // Default sort implementation
    return sorted.sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];

      // Handle null/undefined
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortDirection === "asc" ? 1 : -1;
      if (bValue == null) return sortDirection === "asc" ? -1 : 1;

      // Number comparison
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      // String comparison (case-insensitive)
      if (typeof aValue === "string" && typeof bValue === "string") {
        const comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase());
        return sortDirection === "asc" ? comparison : -comparison;
      }

      // Boolean comparison
      if (typeof aValue === "boolean" && typeof bValue === "boolean") {
        const aNum = aValue ? 1 : 0;
        const bNum = bValue ? 1 : 0;
        return sortDirection === "asc" ? aNum - bNum : bNum - aNum;
      }

      // Date comparison
      if (aValue instanceof Date && bValue instanceof Date) {
        const diff = aValue.getTime() - bValue.getTime();
        return sortDirection === "asc" ? diff : -diff;
      }

      // Fallback: convert to string and compare
      const aStr = String(aValue);
      const bStr = String(bValue);
      const comparison = aStr.localeCompare(bStr);
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [data, sortKey, sortDirection, config]);

  return {
    sortKey,
    sortDirection,
    setSortKey,
    setSortDirection,
    clearSort,
    sortedData,
  };
}
