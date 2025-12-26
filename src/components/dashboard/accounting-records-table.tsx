import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreVertical, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

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

  const filteredRecords = records.filter((record) =>
    Object.values(record).some((value) =>
      value.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <span className="text-red-500">▶</span>
          Accounting records
        </CardTitle>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
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
                <X className="h-3 w-3 text-gray-400" />
              </Button>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4 text-gray-500" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-gray-200">
                <TableHead className="text-xs font-medium text-gray-600 whitespace-nowrap">Operation date</TableHead>
                <TableHead className="text-xs font-medium text-gray-600 whitespace-nowrap">Accounting date</TableHead>
                <TableHead className="text-xs font-medium text-gray-600 whitespace-nowrap">Interest date</TableHead>
                <TableHead className="text-xs font-medium text-gray-600 whitespace-nowrap">Protocol date</TableHead>
                <TableHead className="text-xs font-medium text-gray-600 whitespace-nowrap">Document no.</TableHead>
                <TableHead className="text-xs font-medium text-gray-600">Operation</TableHead>
                <TableHead className="text-xs font-medium text-gray-600">Register</TableHead>
                <TableHead className="text-xs font-medium text-gray-600 text-right">Dt</TableHead>
                <TableHead className="text-xs font-medium text-gray-600 text-right">Ct</TableHead>
                <TableHead className="text-xs font-medium text-gray-600">Currency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-sm text-gray-500 py-8">
                    {searchTerm ? "No records found" : "No accounting records"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((record) => (
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
        {filteredRecords.length > 5 && (
          <div className="mt-4 flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              className="text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-full"
            >
              Show more
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
