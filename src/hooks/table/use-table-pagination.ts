import { useState, useMemo, useCallback, useEffect } from "react";

/**
 * useTablePagination Hook
 *
 * Generic hook for managing table pagination state and paginating data.
 *
 * @template T - Type of data items in the table
 * @param data - Array of data to paginate
 * @param defaultPageSize - Number of items per page (default: 10)
 *
 * @returns {object} Pagination state and actions
 * @returns {number} page - Current page (0-indexed)
 * @returns {number} pageSize - Number of items per page
 * @returns {number} totalPages - Total number of pages
 * @returns {number} totalItems - Total number of items
 * @returns {function} setPage - Set current page (with bounds validation)
 * @returns {function} setPageSize - Set page size (resets to page 0)
 * @returns {function} nextPage - Go to next page
 * @returns {function} prevPage - Go to previous page
 * @returns {function} firstPage - Go to first page
 * @returns {function} lastPage - Go to last page
 * @returns {boolean} canNextPage - Whether next page exists
 * @returns {boolean} canPrevPage - Whether previous page exists
 * @returns {T[]} paginatedData - Data for current page
 * @returns {number} startIndex - Start index of current page items
 * @returns {number} endIndex - End index of current page items
 *
 * @example
 * interface Expense {
 *   id: string
 *   amount: number
 *   description: string
 * }
 *
 * const {
 *   page,
 *   pageSize,
 *   totalPages,
 *   setPage,
 *   nextPage,
 *   prevPage,
 *   paginatedData,
 *   canNextPage,
 *   canPrevPage
 * } = useTablePagination(expenses, 20)
 *
 * // Render pagination controls
 * <button onClick={prevPage} disabled={!canPrevPage}>Previous</button>
 * <span>Page {page + 1} of {totalPages}</span>
 * <button onClick={nextPage} disabled={!canNextPage}>Next</button>
 */
export function useTablePagination<T>(
  data: T[],
  defaultPageSize: number = 10
) {
  const [page, setPageState] = useState(0);
  const [pageSize, setPageSizeState] = useState(defaultPageSize);

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.ceil(data.length / pageSize) || 1; // At least 1 page
  }, [data.length, pageSize]);

  // Total items
  const totalItems = data.length;

  // Reset page to 0 if current page is out of bounds
  useEffect(() => {
    if (page >= totalPages && totalPages > 0) {
      setPageState(Math.max(0, totalPages - 1));
    }
  }, [page, totalPages]);

  // Set page with bounds validation
  const setPage = useCallback((newPage: number) => {
    setPageState(() => {
      // Clamp between 0 and totalPages - 1
      const clampedPage = Math.max(0, Math.min(newPage, totalPages - 1));
      return clampedPage;
    });
  }, [totalPages]);

  // Set page size (resets to page 0)
  const setPageSize = useCallback((newPageSize: number) => {
    setPageSizeState(Math.max(1, newPageSize)); // At least 1 item per page
    setPageState(0); // Reset to first page
  }, []);

  // Navigation functions
  const nextPage = useCallback(() => {
    setPage(page + 1);
  }, [page, setPage]);

  const prevPage = useCallback(() => {
    setPage(page - 1);
  }, [page, setPage]);

  const firstPage = useCallback(() => {
    setPage(0);
  }, [setPage]);

  const lastPage = useCallback(() => {
    setPage(totalPages - 1);
  }, [totalPages, setPage]);

  // Can navigate flags
  const canNextPage = page < totalPages - 1;
  const canPrevPage = page > 0;

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = page * pageSize;
    const endIndex = startIndex + pageSize;
    return data.slice(startIndex, endIndex);
  }, [data, page, pageSize]);

  // Start and end indices for display (1-indexed for UI)
  const startIndex = page * pageSize + 1;
  const endIndex = Math.min((page + 1) * pageSize, totalItems);

  return {
    // State
    page,
    pageSize,
    totalPages,
    totalItems,

    // Actions
    setPage,
    setPageSize,
    nextPage,
    prevPage,
    firstPage,
    lastPage,

    // Flags
    canNextPage,
    canPrevPage,

    // Data
    paginatedData,

    // Display indices
    startIndex,
    endIndex,
  };
}
