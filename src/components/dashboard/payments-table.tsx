import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

import { MoreVerticalIcon } from "@/components/ui/icons";
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

  const totalValue = payments.reduce((sum, payment) => sum + payment.sum, 0);

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <span className="text-red-500">▶</span>
            {title}
          </CardTitle>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVerticalIcon className="h-4 w-4 text-gray-500" />
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-200">
              <TableHead className="text-xs font-medium text-gray-600">Date</TableHead>
              <TableHead className="text-xs font-medium text-gray-600">Title</TableHead>
              <TableHead className="text-xs font-medium text-gray-600 text-right">Sum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-sm text-gray-500 py-8">
                  No payments yet
                </TableCell>
              </TableRow>
            ) : (
              <>
                {payments.map((payment) => (
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
      </CardContent>
    </Card>
  );
};
