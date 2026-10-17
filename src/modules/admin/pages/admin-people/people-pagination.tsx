import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { AdminMobilePagination } from "../../components/AdminMobileCards";
import { useAdminTranslation } from "../../i18n";
import { PEOPLE_PAGE_SIZES } from "./utils";

interface PeoplePaginationProps {
  /** 1-based */
  page: number;
  pageCount: number;
  pageSize: number;
  total?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function PeoplePagination({
  page,
  pageCount,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: PeoplePaginationProps) {
  const { tAdmin } = useAdminTranslation();
  const safePageCount = Math.max(pageCount, 1);
  const canPrevious = page > 1;
  const canNext = page < safePageCount;
  const summary = tAdmin("common.pageCount", { page, total: safePageCount });

  return (
    <>
      <div className="hidden items-center justify-between gap-3 text-sm md:flex">
        <p className="text-muted-foreground tabular-nums">
          {typeof total === "number" ? tAdmin("layout.shell.resultsCount", { count: total }) : null}
        </p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{tAdmin("layout.shell.rowsPerPage")}</span>
            <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
              <SelectTrigger size="sm" className="h-8 w-[4.5rem]" aria-label={tAdmin("layout.shell.rowsPerPage")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="top">
                {PEOPLE_PAGE_SIZES.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <span className="tabular-nums text-muted-foreground">{summary}</span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(page - 1)}
              disabled={!canPrevious}
              aria-label={tAdmin("common.previous")}
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(page + 1)}
              disabled={!canNext}
              aria-label={tAdmin("common.next")}
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      <div className="md:hidden">
        <AdminMobilePagination
          summary={summary}
          previousLabel={tAdmin("common.previous")}
          nextLabel={tAdmin("common.next")}
          canPrevious={canPrevious}
          canNext={canNext}
          onPrevious={() => onPageChange(page - 1)}
          onNext={() => onPageChange(page + 1)}
        />
      </div>
    </>
  );
}
