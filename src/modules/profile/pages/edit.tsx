import { useEffect } from "react";
import { useGetIdentity, useGo } from "@refinedev/core";
import { LoadingBeam } from "@/components/ui/loading-beam";
import { PageContainer } from "@/components/ui/page-container";
import { useTranslation } from "react-i18next";

/** Legacy `/profile/edit` route — opens unified profile in edit mode. */
export const ProfileEdit = () => {
  const go = useGo();
  const { t } = useTranslation();
  const { data: identity, isLoading } = useGetIdentity<{ id: string }>();

  useEffect(() => {
    if (!identity?.id) return;
    go({
      to: `/profile/${identity.id}?edit=true`,
      type: "replace",
    });
  }, [go, identity?.id]);

  return (
    <PageContainer padding="none" variant="narrow">
      <LoadingBeam text={t("profile.loading", "Loading profile…")} />
    </PageContainer>
  );
};
