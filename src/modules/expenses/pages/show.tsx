import { useOne, useList, useDelete, useGo, useGetIdentity } from "@refinedev/core";
import { useParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { Expense, ExpenseSplit } from "../types";
import { Profile } from "@/modules/profile/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const ExpenseShow = () => {
  const { id } = useParams<{ id: string }>();
  const go = useGo();
  const { data: identity } = useGetIdentity<Profile>();

  const { data: expenseData, isLoading: isLoadingExpense } = useOne<Expense>({
    resource: "expenses",
    id: id!,
    meta: {
      select: "*, profiles:paid_by_user_id(id, full_name, avatar_url)",
    },
  });

  const { data: splitsData, isLoading: isLoadingSplits } = useList<ExpenseSplit>({
    resource: "expense_splits",
    filters: [
      {
        field: "expense_id",
        operator: "eq",
        value: id,
      },
    ],
    meta: {
      select: "*, profiles:user_id(id, full_name, avatar_url)",
    },
  });

  const { mutate: deleteExpense, isLoading: isDeletingExpense } = useDelete();

  const expense: any = expenseData?.data;
  const splits: any[] = splitsData?.data || [];

  const canEdit = expense?.created_by === identity?.id;

  const handleDelete = () => {
    if (!expense?.id) return;

    deleteExpense(
      {
        resource: "expenses",
        id: expense.id,
      },
      {
        onSuccess: () => {
          toast.success("Expense deleted successfully");
          go({ to: `/groups/show/${expense.group_id}` });
        },
        onError: (error) => {
          toast.error(`Failed to delete expense: ${error.message}`);
        },
      }
    );
  };

  if (isLoadingExpense || isLoadingSplits || !expense) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading expense...</p>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4"
        onClick={() => go({ to: `/groups/show/${expense.group_id}` })}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Group
      </Button>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-3xl">{expense.description}</CardTitle>
                  {expense.category && (
                    <Badge variant="secondary">{expense.category}</Badge>
                  )}
                </div>
                <p className="text-muted-foreground">
                  {new Date(expense.expense_date).toLocaleDateString("vi-VN", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              {canEdit && (
                <div className="flex gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Expense?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete
                          this expense and all associated splits.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          disabled={isDeletingExpense}
                        >
                          {isDeletingExpense ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <Avatar className="h-12 w-12">
                <AvatarFallback>
                  {expense.profiles?.full_name
                    ?.split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Paid by</p>
                <p className="font-medium">{expense.profiles?.full_name || "Unknown"}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total amount</p>
                <p className="text-2xl font-bold">
                  {expense.amount.toLocaleString("vi-VN")} {expense.currency}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Split Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {splits.map((split: any) => (
                <div
                  key={split.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {split.profiles?.full_name
                          ?.split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {split.profiles?.full_name || "Unknown User"}
                        {split.user_id === identity?.id && (
                          <span className="text-xs text-muted-foreground ml-2">
                            (You)
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {split.split_method} split
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">
                      {split.computed_amount.toLocaleString("vi-VN")} {expense.currency}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
