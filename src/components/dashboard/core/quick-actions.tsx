import { useGo } from "@refinedev/core";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { PlusIcon, UsersIcon } from "@/components/ui/icons";
import { useHaptics } from "@/hooks/use-haptics";
export const QuickActions = () => {
  const { t } = useTranslation();
  const go = useGo();
  const { tap } = useHaptics();

  return (
    <div className="flex gap-3">
      <Button
        size="lg"
        onClick={() => { tap(); go({ to: "/groups/create" }); }}
        className="flex-1"
      >
        <UsersIcon className="mr-2 h-5 w-5" />
        {t('dashboard.newGroup')}
      </Button>
      <Button
        size="lg"
        onClick={() => { tap(); go({ to: "/groups" }); }}
        variant="outline"
        className="flex-1"
      >
        <PlusIcon className="mr-2 h-5 w-5" />
        {t('dashboard.addExpense')}
      </Button>
    </div>
  );
};
