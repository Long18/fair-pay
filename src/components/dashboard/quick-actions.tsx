import { useGo } from "@refinedev/core";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";

export const QuickActions = () => {
  const { t } = useTranslation();
  const go = useGo();

  return (
    <div className="flex gap-3">
      <Button
        size="lg"
        onClick={() => go({ to: "/groups/create" })}
        className="flex-1"
      >
        <Users className="mr-2 h-5 w-5" />
        {t('dashboard.newGroup')}
      </Button>
      <Button
        size="lg"
        onClick={() => go({ to: "/groups" })}
        variant="outline"
        className="flex-1"
      >
        <Plus className="mr-2 h-5 w-5" />
        {t('dashboard.addExpense')}
      </Button>
    </div>
  );
};
