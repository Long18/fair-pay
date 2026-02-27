import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

import { MoreVerticalIcon } from "@/components/ui/icons";
interface Document {
  id: string;
  type: string;
  number: string;
  issueDate: string;
  currentValue: number;
  status?: "active" | "pending" | "settled";
}

interface DocumentsTableProps {
  documents: Document[];
  currency?: string;
}

export const DocumentsTable = ({ documents, currency = "USD" }: DocumentsTableProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "active":
        return "bg-red-100 text-red-700";
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "settled":
        return "bg-gray-100 text-gray-700";
      default:
        return "";
    }
  };

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <span className="text-red-500">▶</span>
          Debt documents
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVerticalIcon className="h-4 w-4 text-gray-500" />
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-200">
              <TableHead className="text-xs font-medium text-gray-600">Type</TableHead>
              <TableHead className="text-xs font-medium text-gray-600">Number</TableHead>
              <TableHead className="text-xs font-medium text-gray-600">Issue date</TableHead>
              <TableHead className="text-xs font-medium text-gray-600 text-right">Current value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-gray-500 py-8">
                  No debt documents
                </TableCell>
              </TableRow>
            ) : (
              documents.map((doc) => (
                <TableRow
                  key={doc.id}
                  className={`border-b border-gray-100 hover:bg-gray-50 ${
                    doc.status === "active" ? "bg-red-50" : ""
                  }`}
                >
                  <TableCell className="py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        doc.status === "active" ? "bg-red-500" :
                        doc.status === "pending" ? "bg-yellow-500" :
                        "bg-gray-400"
                      }`} />
                      <span className="text-sm text-gray-900">{doc.type}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 text-sm text-gray-700">{doc.number}</TableCell>
                  <TableCell className="py-3 text-sm text-gray-700">{doc.issueDate}</TableCell>
                  <TableCell className="py-3 text-sm font-medium text-gray-900 text-right">
                    {formatCurrency(doc.currentValue)} {currency}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
