import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { PageContainer } from '@/components/ui/page-container';
import { PageContent } from '@/components/ui/page-content';
import { PageHeader } from '@/components/ui/page-header';
import { useUserSettings } from '../hooks/use-user-settings';
import { DisplaySettingsForm, NotificationSettingsForm, PrivacySettingsForm } from '../components';
import { SettingsIcon, BellIcon, LockIcon, RotateCcwIcon } from "@/components/ui/icons";
import { useTranslation } from 'react-i18next';
import { ReminderSettingsComponent } from '@/components/settings/reminder-settings';
import { useOnboarding } from '@/modules/onboarding';
import { useHaptics } from '@/hooks/use-haptics';
import { ReferralCard, ReferralStats } from '@/modules/referrals';
import { usePushNotification } from '@/modules/notifications/hooks/use-push-notification';
import { journeyTracking } from '@/lib/journey-tracking';
import { StaggerChildren } from '@/lib/motion';

export function SettingsPage() {
  const {
    settings,
    isLoading,
    isUpdating,
    saveSettings,
    userEmails,
    isEmailUpdating,
    addEmail,
    setPrimaryEmail,
    removeEmail,
  } = useUserSettings();
  const { t } = useTranslation();
  const { restart } = useOnboarding();
  const { tap } = useHaptics();
  const { state: pushState, subscribe: pushSubscribe, unsubscribe: pushUnsubscribe } = usePushNotification();

  useEffect(() => {
    journeyTracking.trackEvent({
      event_name: "settings_opened",
      event_category: "settings",
      page_path: window.location.pathname,
      flow_name: "settings",
      step_name: "open",
    });
  }, []);

  if (isLoading) {
    return (
      <PageContainer padding="none" variant="narrow">
        <PageContent>
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-[500px] w-full" />
        </PageContent>
      </PageContainer>
    );
  }

  return (
    <PageContainer padding="none" variant="narrow">
      <PageContent>
      <StaggerChildren className="flex flex-col gap-6">
      <div>
      <PageHeader
        title={t('settings.title')}
        description={t('settings.subtitle')}
      />
      </div>

      <Tabs defaultValue="display" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-3 gap-1 sm:max-w-md">
          <TabsTrigger value="display" className="flex min-h-11 flex-col items-center gap-0.5 px-1 text-[10px] sm:flex-row sm:gap-2 sm:text-sm">
            <SettingsIcon className="h-4 w-4 shrink-0" />
            <span className="leading-tight">{t('settings.display')}</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex min-h-11 flex-col items-center gap-0.5 px-1 text-[10px] sm:flex-row sm:gap-2 sm:text-sm">
            <BellIcon className="h-4 w-4 shrink-0" />
            <span className="leading-tight">{t('settings.notifications')}</span>
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex min-h-11 flex-col items-center gap-0.5 px-1 text-[10px] sm:flex-row sm:gap-2 sm:text-sm">
            <LockIcon className="h-4 w-4 shrink-0" />
            <span className="leading-tight">{t('settings.privacy')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="display">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.displayOptions')}</CardTitle>
              <CardDescription>
                {t('settings.displayOptionsDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DisplaySettingsForm
                settings={settings}
                onSave={saveSettings}
                isUpdating={isUpdating}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.notificationOptions')}</CardTitle>
              <CardDescription>
                {t('settings.notificationOptionsDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NotificationSettingsForm
                settings={settings}
                onSave={saveSettings}
                isUpdating={isUpdating}
                userEmails={userEmails}
                isEmailUpdating={isEmailUpdating}
                onAddEmail={addEmail}
                onSetPrimaryEmail={setPrimaryEmail}
                onRemoveEmail={removeEmail}
              />
            </CardContent>
          </Card>

          <ReminderSettingsComponent />

          <Card>
            <CardHeader>
              <CardTitle>{t('notifications.push.title')}</CardTitle>
              <CardDescription>{t('notifications.push.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">
                  {pushState === 'subscribed'
                    ? t('notifications.push.enabled')
                    : pushState === 'denied'
                    ? t('notifications.push.denied')
                    : pushState === 'unsupported'
                    ? t('notifications.push.unsupported')
                    : t('notifications.push.enable')}
                </span>
                {pushState !== 'unsupported' && pushState !== 'denied' && (
                  <Switch
                    checked={pushState === 'subscribed'}
                    disabled={pushState === 'requesting'}
                    onCheckedChange={(checked) => {
                      tap();
                      if (checked) {
                        pushSubscribe();
                      } else {
                        pushUnsubscribe();
                      }
                    }}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.privacySettings')}</CardTitle>
              <CardDescription>
                {t('settings.privacySettingsDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PrivacySettingsForm
                settings={settings}
                onSave={saveSettings}
                isUpdating={isUpdating}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>{t("onboarding.actions.restart", "Restart Tutorial")}</CardTitle>
          <CardDescription>
            {t("settings.restartTutorialDescription", "Replay the guided tour to revisit FairPay's features.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={() => {
              tap();
              restart();
            }}
          >
            <RotateCcwIcon className="h-4 w-4" />
            {t("onboarding.actions.restart", "Restart Tutorial")}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">{t("referrals.title", "Mời bạn bè")}</h2>
        </div>
        <ReferralCard />
        <ReferralStats />
      </div>
      </StaggerChildren>
      </PageContent>
    </PageContainer>
  );
}
