import { useGetIdentity } from "@refinedev/core";
import { useQuery } from "@tanstack/react-query";
import { supabaseClient } from "@/utility/supabaseClient";
import { Profile } from "@/modules/profile/types";

export interface ExpenseCategoryRow {
  id: string;
  user_id: string | null;
  name: string;
  icon: string | null;
}

export interface ExpenseTemplateRow {
  id: string;
  user_id: string;
  title: string;
  amount: number;
  category: string;
  split_hint: Record<string, unknown> | null;
}

export function useExpenseCategories() {
  const query = useQuery({
    queryKey: ["expense_categories"],
    queryFn: async (): Promise<ExpenseCategoryRow[]> => {
      const { data, error } = await supabaseClient
        .from("expense_categories")
        .select("id, user_id, name, icon")
        .order("name");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const createCategory = async (name: string, icon?: string) => {
    const { data: auth } = await supabaseClient.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) throw new Error("Not signed in");
    const { error } = await supabaseClient.from("expense_categories").insert({
      user_id: userId,
      name: name.trim(),
      icon: icon ?? null,
    });
    if (error) throw new Error(error.message);
    await query.refetch();
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabaseClient
      .from("expense_categories")
      .delete()
      .eq("id", id)
      .not("user_id", "is", null);
    if (error) throw new Error(error.message);
    await query.refetch();
  };

  return {
    categories: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
    createCategory,
    deleteCategory,
  };
}

export function useExpenseTemplates() {
  const { data: identity } = useGetIdentity<Profile>();
  const userId = identity?.id;

  const query = useQuery({
    queryKey: ["expense_templates", userId],
    enabled: !!userId,
    queryFn: async (): Promise<ExpenseTemplateRow[]> => {
      if (!userId) return [];
      const { data, error } = await supabaseClient
        .from("expense_templates")
        .select("id, user_id, title, amount, category, split_hint")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []).map((row) => ({
        ...row,
        amount: Number(row.amount),
        split_hint: (row.split_hint as Record<string, unknown> | null) ?? null,
      }));
    },
  });

  const createTemplate = async (input: {
    title: string;
    amount: number;
    category: string;
  }) => {
    if (!userId) throw new Error("Not signed in");
    const { error } = await supabaseClient.from("expense_templates").insert({
      user_id: userId,
      title: input.title.trim(),
      amount: input.amount,
      category: input.category.trim(),
    });
    if (error) throw new Error(error.message);
    await query.refetch();
  };

  const deleteTemplate = async (id: string) => {
    const { error } = await supabaseClient.from("expense_templates").delete().eq("id", id);
    if (error) throw new Error(error.message);
    await query.refetch();
  };

  return {
    templates: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
    createTemplate,
    deleteTemplate,
  };
}

/** Build create-expense query string from a template (caller picks group/friend path). */
export function templateToCreateQuery(template: {
  title: string;
  amount: number;
  category: string;
}): string {
  const params = new URLSearchParams({
    description: template.title,
    amount: String(template.amount),
    category: template.category,
  });
  return params.toString();
}
