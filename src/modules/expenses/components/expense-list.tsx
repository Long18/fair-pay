import { useList, useGo } from "@refinedev/core";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { ExpenseWithSplits } from "../types";

interface ExpenseListProps {
  groupId: string;
}

export const ExpenseList = ({ groupId }: ExpenseListProps) => {
  const go = useGo();

  const { data, isLoading } = useList<ExpenseWithSplits>({
    resource: "expenses",
    filters: [
      {
        field: "group_id",
        operator: "eq",
        value: groupId,
      },
    ],
    meta: {
      select: "*, profiles:paid_by_user_id(id, full_name, avatar_url)",
    },
    sorters: [
      {
        field: "expense_date",
        order: "desc",
      },
    ],
  });

  const expenses = data?.data || [];

  if (isLoading) {
    return <div className="text-center py-8">Loading expenses...</div>;
  }

  if (expenses.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No expenses yet. Create your first expense to get started!
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {expenses.map((expense: any) => (
        <Card key={expense.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    {expense.profiles?.full_name
                      ?.split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{expense.description}</h4>
                    {expense.category && (
                      <Badge variant="secondary" className="text-xs">
                        {expense.category}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Paid by {expense.profiles?.full_name || "Unknown"} •{" "}
                    {new Date(expense.expense_date).toLocaleDateString("vi-VN")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="font-bold text-lg">
                    {expense.amount.toLocaleString("vi-VN")} ₫
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => go({ to: `/expenses/show/${expense.id}` })}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
