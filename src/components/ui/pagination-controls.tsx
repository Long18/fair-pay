import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useHaptics } from "@/hooks/use-haptics";

import { ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon } from "@/components/ui/icons";
export interface PaginationMetadata {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

interface PaginationControlsProps {
  metadata: PaginationMetadata;
  onPageChange: (page: number) => void;
  showFirstLast?: boolean;
  maxVisiblePages?: number;
  className?: string;
}

export function PaginationControls({
  metadata,
  onPageChange,
  showFirstLast = true,
  maxVisiblePages = 5,
  className = "",
}: PaginationControlsProps) {
  const { t } = useTranslation();
  const { tap } = useHaptics();
  const { currentPage, totalPages } = metadata;

  // Calculate visible page numbers
  const getVisiblePages = () => {
    const pages: (number | "ellipsis")[] = [];

    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      const startPage = Math.max(2, currentPage - 1);
      const endPage = Math.min(totalPages - 1, currentPage + 1);

      // Add ellipsis after first page if needed
      if (startPage > 2) {
        pages.push("ellipsis");
      }

      // Add pages around current page
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      // Add ellipsis before last page if needed
      if (endPage < totalPages - 1) {
        pages.push("ellipsis");
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const visiblePages = getVisiblePages();
  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className={`flex items-center justify-between gap-2 ${className}`}>
      {/* Info text */}
      <div className="text-sm text-muted-foreground">
        {t('pagination.showing', {
          start: (currentPage - 1) * metadata.pageSize + 1,
          end: Math.min(currentPage * metadata.pageSize, metadata.totalItems),
          total: metadata.totalItems,
          defaultValue: `Showing ${(currentPage - 1) * metadata.pageSize + 1}-${Math.min(currentPage * metadata.pageSize, metadata.totalItems)} of ${metadata.totalItems}`,
        })}
      </div>

      {/* Pagination controls */}
      <div className="flex items-center gap-1">
        {/* First page button */}
        {showFirstLast && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => { tap(); onPageChange(1); }}
            disabled={isFirstPage}
            className="h-9 w-9"
            aria-label={t('pagination.firstPage', 'First page')}
          >
            <ChevronsLeftIcon className="h-4 w-4" />
          </Button>
        )}

        {/* Previous page button */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => { tap(); onPageChange(currentPage - 1); }}
          disabled={isFirstPage}
          className="h-9 w-9"
          aria-label={t('pagination.previousPage', 'Previous page')}
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </Button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {visiblePages.map((page, index) =>
            page === "ellipsis" ? (
              <span
                key={`ellipsis-${index}`}
                className="px-2 text-muted-foreground"
              >
                …
              </span>
            ) : (
              <Button
                key={page}
                variant={page === currentPage ? "default" : "outline"}
                size="icon"
                onClick={() => { tap(); onPageChange(page); }}
                className="h-9 w-9"
                aria-label={t('pagination.pageNumber', { page, defaultValue: `Page ${page}` })}
                aria-current={page === currentPage ? "page" : undefined}
              >
                {page}
              </Button>
            )
          )}
        </div>

        {/* Next page button */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => { tap(); onPageChange(currentPage + 1); }}
          disabled={isLastPage}
          className="h-9 w-9"
          aria-label={t('pagination.nextPage', 'Next page')}
        >
          <ChevronRightIcon className="h-4 w-4" />
        </Button>

        {/* Last page button */}
        {showFirstLast && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => { tap(); onPageChange(totalPages); }}
            disabled={isLastPage}
            className="h-9 w-9"
            aria-label={t('pagination.lastPage', 'Last page')}
          >
            <ChevronsRightIcon className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
