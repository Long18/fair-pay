import { DataCard } from "@/components/ui/data-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useTableSort, SortConfig } from "@/hooks/use-table-sort";
import { useTablePagination } from "@/hooks/use-table-pagination";

import { MoreVerticalIcon, ArrowUpIcon, ArrowDownIcon } from "@/components/ui/icons";
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
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
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
    <DataCard className="border-gray-200">
      <DataCard.Header
        className="flex flex-row items-center justify-between pb-3"
        title={
          <div>
            <div className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <span className="text-red-500">▶</span>
              {title}
            </div>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>
        }
        badge={
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVerticalIcon className="h-4 w-4 text-gray-500" />
          </Button>
        }
      />
      <DataCard.Content>
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-200">
              <TableHead
                className="text-xs font-medium text-gray-600 cursor-pointer hover:text-gray-900"
                onClick={() => setSortKey("date")}
              >
                Date{getSortIcon("date")}
              </TableHead>
              <TableHead
                className="text-xs font-medium text-gray-600 cursor-pointer hover:text-gray-900"
                onClick={() => setSortKey("title")}
              >
                Title{getSortIcon("title")}
              </TableHead>
              <TableHead
                className="text-xs font-medium text-gray-600 text-right cursor-pointer hover:text-gray-900"
                onClick={() => setSortKey("sum")}
              >
                Sum{getSortIcon("sum")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-sm text-gray-500 py-8">
                  No payments yet
                </TableCell>
              </TableRow>
            ) : (
              <>
                {paginatedData.map((payment) => (
                  <TableRow
                    key={payment.id}
                    className={`border-b border-gray-100 hover:bg-gray-50 ${
                      payment.highlighted ? "bg-red-50" : ""
                    }`}
                  >
                    <TableCell className="py-3">
                      <div className="flex items-center gap-2">
                        {payment.highlighted && (
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                        )}
                        <span className="text-sm text-gray-700">{payment.date}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-sm text-gray-900">{payment.title}</TableCell>
                    <TableCell className="py-3 text-sm font-medium text-gray-900 text-right">
                      {formatCurrency(payment.sum)} {currency}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2 border-gray-300">
                  <TableCell colSpan={2} className="py-3 text-sm font-semibold text-gray-900">
                    Total value:
                  </TableCell>
                  <TableCell className="py-3 text-sm font-bold text-gray-900 text-right">
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
          <div className="text-sm text-gray-600">
            Showing {startIndex}-{endIndex} of {totalItems}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={prevPage}
              disabled={!canPrevPage}
            >
              Previous
            </Button>
            <div className="flex items-center px-4 text-sm text-gray-700">
              Page {page + 1} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={nextPage}
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
