import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetIdentity } from "@refinedev/core";
import { useTranslation } from "react-i18next";
import { Profile } from "@/modules/profile/types";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

export function DashboardHero() {
  const { data: identity } = useGetIdentity<Profile>();
  const { t } = useTranslation();
  const firstName = identity?.full_name?.split(" ")[0] || "there";

  return (
    <ScrollReveal direction="up" delay={0.1}>
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-4">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          {t('dashboard.welcomeBack')}, {firstName}
        </h2>
        <p className="text-muted-foreground mt-1 text-base">
          {t('dashboard.balanceOverviewFor')} <span className="font-medium text-foreground">{t('dashboard.thisMonth')}</span>.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground hidden md:inline-block">
          {t('dashboard.viewContext')}
        </span>
        <Select defaultValue="all">
          <SelectTrigger className="w-[180px] bg-background shadow-sm">
            <SelectValue placeholder={t('dashboard.viewContext')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('dashboard.allContexts')}</SelectItem>
            <SelectItem value="personal">{t('dashboard.personal')}</SelectItem>
            <SelectItem value="work">{t('dashboard.workTrip')}</SelectItem>
            <SelectItem value="friends">{t('friends.title')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
    </ScrollReveal>
  );
}
