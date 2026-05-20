import { ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { usePlan } from "../hooks/use-plan";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link } from "react-router";

interface PaywallGateProps {
  feature: string;
  children: ReactNode;
  blocked?: boolean; // pass true when limit is hit
}

export function PaywallGate({ children, blocked = false }: PaywallGateProps) {
  const { isPro } = usePlan();
  const { t } = useTranslation();
  const [open, setOpen] = useState(blocked && !isPro);

  if (!blocked || isPro) return <>{children}</>;

  return (
    <>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("billing.paywallTitle", "Nâng cấp lên Pro")}</DialogTitle>
            <DialogDescription>
              {t("billing.paywallDescription", "Bạn đã đạt giới hạn của gói Free. Nâng cấp để tiếp tục sử dụng tính năng này.")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              {t("billing.paywallDismiss", "Để sau")}
            </Button>
            <Button className="flex-1" asChild>
              <Link to="/pricing">{t("billing.paywallUpgrade", "Xem gói Pro")}</Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
