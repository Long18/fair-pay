import {
  ReceiptIcon,
  CreditCardIcon,
  BellIcon,
} from "@/components/ui/icons";
import { AdminNotifications } from "@/modules/admin/sub-pages/AdminNotifications";
import { AdminPageHeader } from "@/modules/admin/components/AdminPageHeader";
import { AdminTabs, AdminTabsContent } from "@/modules/admin/components/AdminTabs";
import { useAdminTabParam } from "@/modules/admin/hooks/use-admin-tab-param";
import { useAdminTranslation } from "../i18n";
import { useAdminAccess } from "../hooks/use-admin-access";
import { ExpensesTab } from "./admin-transactions/expenses-tab";
import { PaymentsTab } from "./admin-transactions/payments-tab";

const TRANSACTION_TABS_FULL = ["expenses", "payments", "notifications"] as const;
const TRANSACTION_TABS_MOD = ["expenses", "payments"] as const;

export function AdminTransactions() {
  const { tAdmin } = useAdminTranslation();
  const { isModerator } = useAdminAccess();
  const validTabs = isModerator ? TRANSACTION_TABS_MOD : TRANSACTION_TABS_FULL;
  const [activeTab, setActiveTab] = useAdminTabParam("expenses", validTabs);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={tAdmin("transactions.title")}
        description={tAdmin("transactions.subtitle")}
      />
      <AdminTabs
        value={activeTab}
        onValueChange={setActiveTab}
        listClassName={isModerator ? "sm:grid-cols-2" : "sm:grid-cols-3"}
        items={[
          {
            value: "expenses",
            label: tAdmin("transactions.expensesTab"),
            icon: ReceiptIcon,
          },
          {
            value: "payments",
            label: tAdmin("transactions.paymentsTab"),
            icon: CreditCardIcon,
          },
          {
            value: "notifications",
            label: tAdmin("transactions.notificationsTab"),
            icon: BellIcon,
            enabled: !isModerator,
          },
        ]}
      >
        <AdminTabsContent value="expenses" className="mt-4">
          <ExpensesTab moderatorMode={isModerator} />
        </AdminTabsContent>
        <AdminTabsContent value="payments" className="mt-4">
          <PaymentsTab moderatorMode={isModerator} />
        </AdminTabsContent>
        {!isModerator ? (
          <AdminTabsContent value="notifications" className="mt-4">
            <AdminNotifications />
          </AdminTabsContent>
        ) : null}
      </AdminTabs>
    </div>
  );
}
