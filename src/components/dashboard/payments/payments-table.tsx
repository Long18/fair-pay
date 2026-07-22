import { DataCard } from "@/components/ui/data-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useTableSort, SortConfig } from "@/hooks/table/use-table-sort";
import { useTablePagination } from "@/hooks/table/use-table-pagination";
import { useHaptics } from "@/hooks/use-haptics";
import { MoreVerticalIcon, ArrowUpIcon, ArrowDownIcon } from "@/components/ui/icons";

const decimalFormatter = new Intl.NumberFormat('en-US', {
  style: 'decimal',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

interface Payment {
  id: string;
  date: string;
  title: string;
  sum: number;
  highlighted?: boolean;
}

interface PaymentsTableProps {
  payments: Payment[];
  currency?: string;
  title?: string;
  subtitle?: string;
}

export const PaymentsTable = ({
  payments,
  currency = "USD",
  title = "Payments",
  subtitle,
}: PaymentsTableProps) => {
  const { tap } = useHaptics();
  const formatCurrency = (value: number) => {
    return decimalFormatter.format(value);
  };

  // Sort configuration
  const sortConfig: SortConfig<Payment> = {
    sum: (a, b, direction) => {
      const diff = a.sum - b.sum;
      return direction === "asc" ? diff : -diff;
    },
  };

  // Apply sorting
  const { sortedData, sortKey, sortDirection, setSortKey } = useTableSort(
    payments,
    sortConfig
  );
  const handleSort = (key: keyof Payment) => { tap(); setSortKey(key); };

  // Apply pagination
  const {
    paginatedData,
    page,
    totalPages,
    canNextPage,
    canPrevPage,
    nextPage,
    prevPage,
    startIndex,
    endIndex,
    totalItems,
  } = useTablePagination(sortedData, 10);

  const totalValue = payments.reduce((sum, payment) => sum + payment.sum, 0);

  const getSortIcon = (column: keyof Payment) => {
    if (sortKey !== column) return null;
    return sortDirection === "asc" ? (
      <ArrowUpIcon className="h-3 w-3 inline ml-1" />
    ) : (
      <ArrowDownIcon className="h-3 w-3 inline ml-1" />
    );
  };

  return (
    <DataCard className="border-border">
      <DataCard.Header
        className="flex flex-row items-center justify-between pb-3"
        title={
          <div>
            <div className="text-base font-semibold text-foreground flex items-center gap-2">
              <span className="text-red-500">▶</span>
              {title}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
        }
        badge={
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVerticalIcon className="h-4 w-4 text-muted-foreground" />
          </Button>
        }
      />
      <DataCard.Content>
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border">
              <TableHead
                className="text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                onClick={() => handleSort("date")}
              >
                Date{getSortIcon("date")}
              </TableHead>
              <TableHead
                className="text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                onClick={() => handleSort("title")}
              >
                Title{getSortIcon("title")}
              </TableHead>
              <TableHead
                className="text-xs font-medium text-muted-foreground text-right cursor-pointer hover:text-foreground"
                onClick={() => handleSort("sum")}
              >
                Sum{getSortIcon("sum")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-8">
                  No payments yet
                </TableCell>
              </TableRow>
            ) : (
              <>
                {paginatedData.map((payment) => (
                  <TableRow
                    key={payment.id}
                    className={`border-b border-border hover:bg-muted ${
                      payment.highlighted ? "bg-red-50" : ""
                    }`}
                  >
                    <TableCell className="py-3">
                      <div className="flex items-center gap-2">
                        {payment.highlighted && (
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                        )}
                        <span className="text-sm text-muted-foreground">{payment.date}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-sm text-foreground">{payment.title}</TableCell>
                    <TableCell className="py-3 text-sm font-medium text-foreground text-right">
                      {formatCurrency(payment.sum)} {currency}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2 border-border">
                  <TableCell colSpan={2} className="py-3 text-sm font-semibold text-foreground">
                    Total value:
                  </TableCell>
                  <TableCell className="py-3 text-sm font-bold text-foreground text-right">
                    {formatCurrency(totalValue)} {currency}
                  </TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </DataCard.Content>
      {totalPages > 1 && (
        <DataCard.Footer align="between">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex}-{endIndex} of {totalItems}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { tap(); prevPage(); }}
              disabled={!canPrevPage}
            >
              Previous
            </Button>
            <div className="flex items-center px-4 text-sm text-muted-foreground">
              Page {page + 1} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { tap(); nextPage(); }}
              disabled={!canNextPage}
            >
              Next
            </Button>
          </div>
        </DataCard.Footer>
      )}
    </DataCard>
  );
};
