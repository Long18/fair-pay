import { useState } from "react";
import { useGo } from "@refinedev/core";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EXPENSE_CATEGORIES } from "@/modules/expenses/lib/categories";
import { formatNumber } from "@/lib/locale-utils";
import { PlusIcon, TrashIcon } from "@/components/ui/icons";
import {
  templateToCreateQuery,
  useExpenseCategories,
  useExpenseTemplates,
} from "@/modules/expenses/hooks/use-expense-categories-templates";

export function CategoriesTemplatesSection() {
  const { t } = useTranslation();
  const go = useGo();
  const {
    categories,
    createCategory,
    deleteCategory,
    isLoading: categoriesLoading,
  } = useExpenseCategories();
  const {
    templates,
    createTemplate,
    deleteTemplate,
    isLoading: templatesLoading,
  } = useExpenseTemplates();

  const [newCategory, setNewCategory] = useState("");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0] ?? "Other");
  const [busy, setBusy] = useState(false);

  const customCategories = categories.filter((c) => c.user_id != null);

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    setBusy(true);
    try {
      await createCategory(newCategory.trim());
      setNewCategory("");
      toast.success(t("templates.categoryCreated", "Category created"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("templates.categoryError", "Failed"));
    } finally {
      setBusy(false);
    }
  };

  const handleAddTemplate = async () => {
    const parsed = Number(amount.replace(/,/g, ""));
    if (!title.trim() || !Number.isFinite(parsed) || parsed < 0) {
      toast.error(t("templates.invalid", "Enter title and amount"));
      return;
    }
    setBusy(true);
    try {
      await createTemplate({ title: title.trim(), amount: parsed, category });
      setTitle("");
      setAmount("");
      toast.success(t("templates.created", "Template created"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("templates.createError", "Failed"));
    } finally {
      setBusy(false);
    }
  };

  const handleUseTemplate = (template: { title: string; amount: number; category: string }) => {
    const qs = templateToCreateQuery(template);
    go({ to: `/expenses/create?${qs}` });
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("templates.categoriesTitle", "Custom categories")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              className="h-9"
              placeholder={t("templates.categoryPlaceholder", "Category name")}
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            />
            <Button size="sm" className="h-9 shrink-0 gap-1" onClick={handleAddCategory} disabled={busy}>
              <PlusIcon className="h-4 w-4" />
              {t("common.add", "Add")}
            </Button>
          </div>
          {categoriesLoading ? (
            <p className="text-xs text-muted-foreground">{t("common.loading", "Loading…")}</p>
          ) : customCategories.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {t("templates.noCustomCategories", "No custom categories yet. System defaults still apply.")}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {customCategories.map((cat) => (
                <li key={cat.id} className="flex items-center justify-between text-sm gap-2">
                  <span className="truncate">{cat.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={async () => {
                      try {
                        await deleteCategory(cat.id);
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Failed");
                      }
                    }}
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("templates.title", "Expense templates")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="space-y-1 sm:col-span-3">
              <Label className="text-xs">{t("templates.templateTitle", "Title")}</Label>
              <Input className="h-9" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("templates.amount", "Amount")}</Label>
              <Input
                type="number"
                min={0}
                className="h-9"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">{t("templates.category", "Category")}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                  {customCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button size="sm" className="gap-1.5" onClick={handleAddTemplate} disabled={busy}>
            <PlusIcon className="h-4 w-4" />
            {t("templates.save", "Save template")}
          </Button>

          {templatesLoading ? (
            <p className="text-xs text-muted-foreground">{t("common.loading", "Loading…")}</p>
          ) : templates.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {t("templates.empty", "Save frequent expenses as templates.")}
            </p>
          ) : (
            <ul className="space-y-2">
              {templates.map((tpl) => (
                <li
                  key={tpl.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{tpl.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {tpl.category} · {formatNumber(tpl.amount)} ₫
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleUseTemplate(tpl)}>
                      {t("templates.use", "Use")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={async () => {
                        try {
                          await deleteTemplate(tpl.id);
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : "Failed");
                        }
                      }}
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
