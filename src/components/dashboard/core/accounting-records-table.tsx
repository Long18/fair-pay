import { DataCard } from "@/components/ui/data-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { useTableSort, SortConfig } from "@/hooks/use-table-sort";
import { useTablePagination } from "@/hooks/use-table-pagination";

import { MoreVerticalIcon, SearchIcon, XIcon, ArrowUpIcon, ArrowDownIcon } from "@/components/ui/icons";
interface AccountingRecord {
  id: string;
  operationDate: string;
  accountingDate: string;
  interestDate: string;
  protocolDate: string;
  documentNumber: string;
  operation: string;
  register: string;
  dt: number;
  ct: number;
  currency: string;
}

interface AccountingRecordsTableProps {
  records: AccountingRecord[];
}

export const AccountingRecordsTable = ({ records }: AccountingRecordsTableProps) => {
  const [searchTerm, setSearchTerm] = useState("");

  // Filter records based on search term
  const filteredRecords = useMemo(
    () =>
      records.filter((record) =>
        Object.values(record).some((value) =>
          value.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
      ),
    [records, searchTerm]
  );

  // Sort configuration for date columns
  const sortConfig: SortConfig<AccountingRecord> = {
    dt: (a, b, direction) => {
      const diff = a.dt - b.dt;
      return direction === "asc" ? diff : -diff;
    },
    ct: (a, b, direction) => {
      const diff = a.ct - b.ct;
      return direction === "asc" ? diff : -diff;
    },
  };

  // Apply sorting
  const { sortedData, sortKey, sortDirection, setSortKey } = useTableSort(
    filteredRecords,
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getSortIcon = (column: keyof AccountingRecord) => {
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
          <div className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <span className="text-red-500">▶</span>
            Accounting records
          </div>
        }
        badge={
          <div className="flex items-center gap-2">
            <div className="relative">
              <SearchIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="FV/2343/123/12"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-8 h-8 w-48 text-sm border-gray-300"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-0 top-1/2 transform -translate-y-1/2 h-8 w-8"
                >
                  <XIcon className="h-3 w-3 text-gray-400" />
                </Button>
              )}
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVerticalIcon className="h-4 w-4 text-gray-500" />
            </Button>
          </div>
        }
      />
      <DataCard.Content>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-gray-200">
                <TableHead
                  className="text-xs font-medium text-gray-600 whitespace-nowrap cursor-pointer hover:text-gray-900"
                  onClick={() => setSortKey("operationDate")}
                >
                  Operation date{getSortIcon("operationDate")}
                </TableHead>
                <TableHead
                  className="text-xs font-medium text-gray-600 whitespace-nowrap cursor-pointer hover:text-gray-900"
                  onClick={() => setSortKey("accountingDate")}
                >
                  Accounting date{getSortIcon("accountingDate")}
                </TableHead>
                <TableHead
                  className="text-xs font-medium text-gray-600 whitespace-nowrap cursor-pointer hover:text-gray-900"
                  onClick={() => setSortKey("interestDate")}
                >
                  Interest date{getSortIcon("interestDate")}
                </TableHead>
                <TableHead
                  className="text-xs font-medium text-gray-600 whitespace-nowrap cursor-pointer hover:text-gray-900"
                  onClick={() => setSortKey("protocolDate")}
                >
                  Protocol date{getSortIcon("protocolDate")}
                </TableHead>
                <TableHead
                  className="text-xs font-medium text-gray-600 whitespace-nowrap cursor-pointer hover:text-gray-900"
                  onClick={() => setSortKey("documentNumber")}
                >
                  Document no.{getSortIcon("documentNumber")}
                </TableHead>
                <TableHead
                  className="text-xs font-medium text-gray-600 cursor-pointer hover:text-gray-900"
                  onClick={() => setSortKey("operation")}
                >
                  Operation{getSortIcon("operation")}
                </TableHead>
                <TableHead
                  className="text-xs font-medium text-gray-600 cursor-pointer hover:text-gray-900"
                  onClick={() => setSortKey("register")}
                >
                  Register{getSortIcon("register")}
                </TableHead>
                <TableHead
                  className="text-xs font-medium text-gray-600 text-right cursor-pointer hover:text-gray-900"
                  onClick={() => setSortKey("dt")}
                >
                  Dt{getSortIcon("dt")}
                </TableHead>
                <TableHead
                  className="text-xs font-medium text-gray-600 text-right cursor-pointer hover:text-gray-900"
                  onClick={() => setSortKey("ct")}
                >
                  Ct{getSortIcon("ct")}
                </TableHead>
                <TableHead
                  className="text-xs font-medium text-gray-600 cursor-pointer hover:text-gray-900"
                  onClick={() => setSortKey("currency")}
                >
                  Currency{getSortIcon("currency")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-sm text-gray-500 py-8">
                    {searchTerm ? "No records found" : "No accounting records"}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((record) => (
                  <TableRow
                    key={record.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <TableCell className="py-3 text-sm text-gray-700 whitespace-nowrap">{record.operationDate}</TableCell>
                    <TableCell className="py-3 text-sm text-gray-700 whitespace-nowrap">{record.accountingDate}</TableCell>
                    <TableCell className="py-3 text-sm text-gray-700 whitespace-nowrap">{record.interestDate}</TableCell>
                    <TableCell className="py-3 text-sm text-gray-700 whitespace-nowrap">{record.protocolDate}</TableCell>
                    <TableCell className="py-3 text-sm text-gray-700 whitespace-nowrap">{record.documentNumber}</TableCell>
                    <TableCell className="py-3 text-sm text-gray-900">{record.operation}</TableCell>
                    <TableCell className="py-3 text-sm text-gray-900">{record.register}</TableCell>
                    <TableCell className="py-3 text-sm font-medium text-gray-900 text-right">
                      {formatCurrency(record.dt)}
                    </TableCell>
                    <TableCell className="py-3 text-sm font-medium text-gray-900 text-right">
                      {formatCurrency(record.ct)}
                    </TableCell>
                    <TableCell className="py-3 text-sm text-gray-700">{record.currency}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
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
