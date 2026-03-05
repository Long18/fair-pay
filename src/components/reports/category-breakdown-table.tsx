import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TopCategory } from "@/hooks/analytics/use-top-categories";
import { formatNumber } from "@/lib/locale-utils";
import { getCategoryMeta } from "@/modules/expenses";
import { useState } from "react";
import { ArrowUpIcon, ArrowDownIcon } from "@/components/ui/icons";
import { useHaptics } from "@/hooks/use-haptics";

interface CategoryBreakdownTableProps {
  data: TopCategory[];
  isLoading?: boolean;
  title?: string;
}

type SortField = "category" | "total_amount" | "expense_count" | "percentage";
type SortDirection = "asc" | "desc";

export function CategoryBreakdownTable({
  data,
  isLoading = false,
  title = "Category Breakdown",
}: CategoryBreakdownTableProps) {
  const [sortField, setSortField] = useState<SortField>("total_amount");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const { tap } = useHaptics();

  const handleSort = (field: SortField) => {
    tap();
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedData = [...data].sort((a, b) => {
    let aValue: number | string = a[sortField];
    let bValue: number | string = b[sortField];

    if (sortField === "category") {
      const aMeta = getCategoryMeta(a.category);
      const bMeta = getCategoryMeta(b.category);
      aValue = aMeta?.name || a.category;
      bValue = bMeta?.name || b.category;
    }

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortDirection === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return sortDirection === "asc"
      ? (aValue as number) - (bValue as number)
      : (bValue as number) - (aValue as number);
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ArrowUpIcon className="h-4 w-4 inline ml-1" />
    ) : (
      <ArrowDownIcon className="h-4 w-4 inline ml-1" />
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 text-xs sm:text-sm"
                  onClick={() => handleSort("category")}
                >
                  Category <SortIcon field="category" />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 text-right text-xs sm:text-sm"
                  onClick={() => handleSort("total_amount")}
                >
                  Amount <SortIcon field="total_amount" />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 text-right text-xs sm:text-sm"
                  onClick={() => handleSort("expense_count")}
                >
                  Count <SortIcon field="expense_count" />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 text-right text-xs sm:text-sm"
                  onClick={() => handleSort("percentage")}
                >
                  % <SortIcon field="percentage" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((category) => {
                const categoryMeta = getCategoryMeta(category.category);
                return (
                  <TableRow key={category.category}>
                    <TableCell className="text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-3 h-3 rounded-full flex-shrink-0 ${categoryMeta?.bgColor || "bg-muted-foreground"}`}
                        />
                        <span className="font-medium truncate">
                          {categoryMeta?.name || category.category}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium text-xs sm:text-sm">
                      {formatNumber(category.total_amount)} ₫
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-xs sm:text-sm">
                      {category.expense_count}
                    </TableCell>
                    <TableCell className="text-right text-xs sm:text-sm">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        {category.percentage.toFixed(1)}%
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
