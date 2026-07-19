import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CopyIcon, ShareIcon } from "@/components/ui/icons";
import { useMyReferralCode } from "../hooks/use-referral";
import { useExperiment } from "@/modules/experiments";

export function ReferralCard() {
  const { t } = useTranslation();
  const { data: code, isLoading } = useMyReferralCode();
  const [copying, setCopying] = useState(false);
  const variant = useExperiment("onboarding_invite_copy");

  const referralLink = code
    ? `${window.location.origin}/share/invite?code=${code}`
    : "";

  const handleCopy = async () => {
    if (!referralLink) return;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(referralLink);
      toast.success(t("referrals.copied", "Link copied!"));
    } catch {
      toast.error(t("common.error", "Error"));
    } finally {
      setCopying(false);
    }
  };

  const handleZalo = () => {
    if (!referralLink) return;
    window.open(
      `https://zalo.me/app/social/story/index.html?url=${encodeURIComponent(referralLink)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleFacebook = () => {
    if (!referralLink) return;
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShareIcon className="h-4 w-4 text-muted-foreground" />
          {variant === "treatment"
            ? t("experiments.inviteCopyTreatment", "Chia tiền cùng bạn ngay")
            : t("referrals.title", "Invite Friends")}
        </CardTitle>
        <CardDescription>
          {t("referrals.shareMessage", "Join me on FairPay — the easiest way to split expenses!")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t("referrals.yourCode", "Your referral code")}
          </p>
          {isLoading ? (
            <div className="h-8 w-32 animate-pulse rounded bg-muted" />
          ) : (
            <Badge variant="secondary" className="font-mono text-base px-3 py-1">
              {code ?? "—"}
            </Badge>
          )}
        </div>

        {referralLink ? (
          <div className="rounded-lg border bg-muted/30 px-3 py-2">
            <p className="break-all font-mono text-[11px] text-muted-foreground">
              {referralLink}
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleCopy()}
            disabled={copying || !code}
            className="gap-2"
          >
            <CopyIcon className="h-3.5 w-3.5" />
            {copying ? "…" : t("referrals.copyLink", "Copy link")}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleZalo}
            disabled={!code}
          >
            Zalo
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleFacebook}
            disabled={!code}
          >
            Facebook
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
