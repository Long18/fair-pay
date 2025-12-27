import { useState, useEffect } from "react";
import { useOne, useList, useDelete, useGo, useGetIdentity } from "@refinedev/core";
import { useParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { Expense, ExpenseSplit, Attachment } from "../types";
import { AttachmentList } from "../components/attachment-list";
import { CategoryIcon } from "../components/category-icon";
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
import { formatDate, formatNumber } from "@/lib/locale-utils";
import { supabaseClient } from "@/utility/supabaseClient";
import { useTranslation } from "react-i18next";

export const ExpenseShow = () => {
  const { id } = useParams<{ id: string }>();
  const go = useGo();
  const { t } = useTranslation();
  const { data: identity } = useGetIdentity<Profile>();
  const [splits, setSplits] = useState<any[]>([]);
  const [isLoadingSplits, setIsLoadingSplits] = useState(true);

  const { query: expenseQuery } = useOne<Expense>({
    resource: "expenses",
    id: id!,
    meta: {
      select: "*, profiles!paid_by_user_id(id, full_name, avatar_url)",
    },
  });

  // Fetch splits using RPC function to bypass RLS for public viewing
  useEffect(() => {
    if (!id) return;

    setIsLoadingSplits(true);
    Promise.resolve(
      supabaseClient
        .rpc("get_expense_splits_public", { p_expense_id: id })
        .then(({ data, error }: { data: any; error: any }) => {
          if (error) {
            console.error("Error fetching splits:", error);
            setSplits([]);
          } else {
            // Transform data to match expected format
            const transformedSplits = (data || []).map((split: any) => ({
              id: split.id,
              expense_id: split.expense_id,
              user_id: split.user_id,
              split_method: split.split_method,
              split_value: split.split_value,
              computed_amount: split.computed_amount,
              created_at: split.created_at,
              profiles: {
                id: split.user_id,
                full_name: split.user_full_name,
                avatar_url: split.user_avatar_url,
              },
            }));
            setSplits(transformedSplits);
          }
        })
    ).finally(() => setIsLoadingSplits(false));
  }, [id]);

  const { query: attachmentsQuery } = useList<Attachment>({
    resource: "attachments",
    filters: [
      {
        field: "expense_id",
        operator: "eq",
        value: id,
      },
    ],
  });

  const deleteMutation = useDelete();

  const { data: expenseData, isLoading: isLoadingExpense } = expenseQuery;
  const { data: attachmentsData } = attachmentsQuery;

  const expense: any = expenseData?.data;
  const attachments: Attachment[] = attachmentsData?.data || [];
  const [displayAttachments, setDisplayAttachments] = useState<Attachment[]>(attachments);

  const canEdit = expense?.created_by === identity?.id;

  // Sync displayAttachments with fetched attachments
  useEffect(() => {
    setDisplayAttachments(attachments);
  }, [attachments]);

  const handleAttachmentDelete = (attachmentId: string) => {
    setDisplayAttachments(prev => prev.filter(a => a.id !== attachmentId));
  };

  const handleDelete = () => {
    if (!expense?.id) return;

    deleteMutation.mutate(
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
                    <CategoryIcon category={expense.category} size="md" showLabel />
                  )}
                </div>
                <p className="text-muted-foreground">
                  {formatDate(expense.expense_date, {
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
                        >
                          Delete
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
                <p className="text-sm text-muted-foreground">{t('expenses.paidBy')}</p>
                <p className="font-medium">{expense.profiles?.full_name || t('expenses.unknown')}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">{t('expenses.total')} {t('expenses.amount').toLowerCase()}</p>
                <p className="text-2xl font-bold">
                  {formatNumber(expense.amount)} {expense.currency}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('expenses.splitDetails')}</CardTitle>
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
                        {split.profiles?.full_name || t('expenses.unknown')}
                        {split.user_id === identity?.id && (
                          <span className="text-xs text-muted-foreground ml-2">
                            ({t('dashboard.youOwe').split(' ')[0]})
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {split.split_method} {t('expenses.split')}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">
                      {formatNumber(split.computed_amount)} {expense.currency}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Attachments */}
        {displayAttachments.length > 0 && (
          <AttachmentList
            attachments={displayAttachments}
            canDelete={canEdit}
            onDelete={handleAttachmentDelete}
          />
        )}
      </div>
    </div>
  );
};
