import { useMemo, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import {
  MailIcon,
  CalendarIcon,
  UsersIcon,
  UserIcon,
  BriefcaseIcon,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { formatDateShort } from "@/lib/locale-utils";
import type { Profile } from "../types";
import { useOnboardingProgress } from "@/modules/onboarding";
import { ReferralCard, ReferralStats } from "@/modules/referrals";

const COMPLETION_KEYS = ["profile", "friend", "group", "expense", "settle"] as const;

interface ProfileAboutSidebarProps {
  profile: Profile;
  isOwnProfile: boolean;
  groupsCount: number;
  friendsCount: number;
  className?: string;
}

export function ProfileAboutSidebar({
  profile,
  isOwnProfile,
  groupsCount,
  friendsCount,
  className,
}: ProfileAboutSidebarProps) {
  const { t } = useTranslation();
  const { steps, isCompleted, isLoading } = useOnboardingProgress();

  const completionPercent = useMemo(() => {
    if (!isOwnProfile) return null;
    if (isCompleted) return 100;
    const done = COMPLETION_KEYS.filter((k) => steps[k]).length;
    return Math.round((done / COMPLETION_KEYS.length) * 100);
  }, [isOwnProfile, isCompleted, steps]);

  return (
    <aside
      className={cn(
        "space-y-3 md:sticky md:top-20 md:max-h-[calc(100dvh-6rem)] md:overflow-y-auto md:overscroll-contain",
        className,
      )}
    >
      {isOwnProfile && completionPercent !== null && completionPercent < 100 && (
        <Card className="rounded-xl border border-border/60 shadow-sm">
          <CardHeader className="py-3 pb-2">
            <CardTitle className="text-sm font-semibold">
              {t("profile.completeYourProfile", "Complete your profile")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pb-3 pt-0">
            {isLoading ? (
              <Skeleton className="h-2 w-full" />
            ) : (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t("profile.profileProgress", "Progress")}
                  </span>
                  <span className="font-medium text-primary">{completionPercent}%</span>
                </div>
                <Progress value={completionPercent} className="h-2" />
              </>
            )}
          </CardContent>
        </Card>
      )}

      {isOwnProfile && (
        <div className="space-y-3 md:space-y-0">
          <ReferralCard className="rounded-xl border border-border/60 shadow-none md:rounded-b-none" />
          <ReferralStats className="md:rounded-t-none md:border-t-0" />
        </div>
      )}

      <Card className="rounded-xl border border-border/60 shadow-sm">
        <CardHeader className="py-3 pb-2">
          <CardTitle className="text-sm font-semibold">
            {t("profile.about", "About")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pb-4 pt-0">
          <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("profile.general", "General")}
            </p>
            <AboutRow
              icon={<UserIcon size={16} />}
              label={profile.full_name}
            />
            <AboutRow
              icon={<BriefcaseIcon size={16} />}
              label={t("profile.fairPayMember", "FairPay member")}
            />
            <AboutRow
              icon={<CalendarIcon size={16} />}
              label={t("profile.joined", {
                date: formatDateShort(profile.created_at),
                defaultValue: `Joined ${formatDateShort(profile.created_at)}`,
              })}
            />
          </div>

          <div className="space-y-2 border-t border-border/50 pt-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("profile.contacts", "Contacts")}
            </p>
            {profile.email ? (
              <AboutRow icon={<MailIcon size={16} />} label={profile.email} />
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("profile.noContactInfo", "No contact info shared")}
              </p>
            )}
          </div>

          <div className="space-y-2 border-t border-border/50 pt-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("profile.stats", "Stats")}
            </p>
            <AboutRow
              icon={<UsersIcon size={16} />}
              label={t("profile.memberOfGroups", {
                count: groupsCount,
                defaultValue: `Member of ${groupsCount} groups`,
              })}
            />
            <AboutRow
              icon={<UserIcon size={16} />}
              label={t("profile.friendsCount", {
                count: friendsCount,
                defaultValue: `${friendsCount} friends`,
              })}
            />
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}

function AboutRow({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-start gap-2.5 text-sm leading-snug">
      <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
      <span className="min-w-0 break-words">{label}</span>
    </div>
  );
}
