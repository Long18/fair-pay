import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useUserSettings } from '../hooks/use-user-settings';
import { DisplaySettingsForm, NotificationSettingsForm, PrivacySettingsForm } from '../components';
import { SettingsIcon, BellIcon, LockIcon, RotateCcwIcon } from "@/components/ui/icons";
import { useTranslation } from 'react-i18next';
import { ReminderSettingsComponent } from '@/components/settings/reminder-settings';
import { useOnboarding } from '@/modules/onboarding';
import { useHaptics } from '@/hooks/use-haptics';
import { ReferralCard, ReferralStats } from '@/modules/referrals';
import { usePushNotification } from '@/modules/notifications/hooks/use-push-notification';

export function SettingsPage() {
  const { settings, isLoading, isUpdating, saveSettings } = useUserSettings();
  const { t } = useTranslation();
  const { restart } = useOnboarding();
  const { tap } = useHaptics();
  const { state: pushState, subscribe: pushSubscribe, unsubscribe: pushUnsubscribe } = usePushNotification();

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">{t('settings.title')}</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          {t('settings.subtitle')}
        </p>
      </div>

      <Tabs defaultValue="display" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-3 sm:max-w-md">
          <TabsTrigger value="display" className="flex items-center gap-1.5 text-xs sm:text-sm sm:gap-2">
            <SettingsIcon className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">{t('settings.display')}</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-1.5 text-xs sm:text-sm sm:gap-2">
            <BellIcon className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">{t('settings.notifications')}</span>
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-1.5 text-xs sm:text-sm sm:gap-2">
            <LockIcon className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">{t('settings.privacy')}</span>
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
    </div>
  );
}
