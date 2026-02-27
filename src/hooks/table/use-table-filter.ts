import { useState, useMemo, useCallback } from "react";

/**
 * Filter Schema
 *
 * Defines how to filter data based on field values.
 * Supports multiple filter types: exact, contains, range, custom.
 */
export type FilterSchema<T> = {
  [K in keyof T]?: {
    type: "exact" | "contains" | "range" | "custom";
    filterFn?: (value: T[K], filterValue: any) => boolean;
  };
};

/**
 * Filter Values
 *
 * Current filter state for each field.
 */
export type FilterValues<T> = Partial<{
  [K in keyof T]: any;
}>;

/**
 * useTableFilter Hook
 *
 * Generic hook for managing table filter state and applying filters to data.
 *
 * @template T - Type of data items in the table
 * @param data - Array of data to filter
 * @param schema - Filter schema defining how each field should be filtered
 *
 * @returns {object} Filter state and actions
 * @returns {FilterValues<T>} filters - Current filter values
 * @returns {function} setFilter - Set a filter for a specific field
 * @returns {function} clearFilters - Clear all filters
 * @returns {function} clearFilter - Clear a specific filter
 * @returns {T[]} filteredData - Data after applying all filters
 *
 * @example
 * interface Expense {
 *   id: string
 *   amount: number
 *   description: string
 *   status: "paid" | "unpaid"
 *   date: Date
 * }
 *
 * const schema: FilterSchema<Expense> = {
 *   status: { type: "exact" },
 *   description: { type: "contains" },
 *   amount: {
 *     type: "custom",
 *     filterFn: (value, range) => value >= range.min && value <= range.max
 *   }
 * }
 *
 * const { filters, setFilter, clearFilters, filteredData } =
 *   useTableFilter(expenses, schema)
 *
 * setFilter("status", "paid")
 * setFilter("description", "coffee")
 * setFilter("amount", { min: 10, max: 50 })
 */
export function useTableFilter<T>(
  data: T[],
  schema: FilterSchema<T> = {}
) {
  const [filters, setFilters] = useState<FilterValues<T>>({});

  // Set filter for specific field
  const setFilter = useCallback(<K extends keyof T>(
    field: K,
    value: any
  ) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  // Clear specific filter
  const clearFilter = useCallback(<K extends keyof T>(field: K) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[field];
      return newFilters;
    });
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  // Apply filters to data
  const filteredData = useMemo(() => {
    // If no filters, return original data
    if (Object.keys(filters).length === 0) {
      return data;
    }

    return data.filter(item => {
      // Check if item passes all filters
      return Object.entries(filters).every(([field, filterValue]) => {
        const key = field as keyof T;
        const itemValue = item[key];
        const fieldSchema = schema[key];

        // No filter value or schema, skip this filter
        if (filterValue === undefined || filterValue === null || filterValue === "") {
          return true;
        }

        // No schema for this field, use exact match by default
        if (!fieldSchema) {
          return itemValue === filterValue;
        }

        // Apply filter based on type
        switch (fieldSchema.type) {
          case "exact":
            return itemValue === filterValue;

          case "contains":
            // Case-insensitive string contains
            if (typeof itemValue === "string" && typeof filterValue === "string") {
              return itemValue.toLowerCase().includes(filterValue.toLowerCase());
            }
            return false;

          case "range":
            // Numeric range filter
            if (typeof itemValue === "number") {
              const { min, max } = filterValue as { min?: number; max?: number };
              const matchesMin = min === undefined || itemValue >= min;
              const matchesMax = max === undefined || itemValue <= max;
              return matchesMin && matchesMax;
            }
            return false;

          case "custom":
            // Custom filter function
            if (fieldSchema.filterFn) {
              return fieldSchema.filterFn(itemValue, filterValue);
            }
            return true;

          default:
            return true;
        }
      });
    });
  }, [data, filters, schema]);

  // Check if any filters are active
  const hasActiveFilters = Object.keys(filters).length > 0;

  return {
    filters,
    setFilter,
    clearFilter,
    clearFilters,
    filteredData,
    hasActiveFilters,
  };
}
