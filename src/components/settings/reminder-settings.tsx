import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BellIcon, MailIcon, CalendarIcon, CheckCircle2Icon, InfoIcon } from "@/components/ui/icons";
import { useNotification } from "@refinedev/core";
import { useHaptics } from "@/hooks/use-haptics";

interface ReminderSettings {
  emailReminders: boolean;
  email: string;
  reminderDays: number;
  dailyDigest: boolean;
  weeklyDigest: boolean;
  calendarSync: boolean;
  calendarType: "google" | "apple" | "outlook";
}

const DEFAULT_SETTINGS: ReminderSettings = {
  emailReminders: false,
  email: "",
  reminderDays: 3,
  dailyDigest: false,
  weeklyDigest: true,
  calendarSync: false,
  calendarType: "google",
};

export function ReminderSettingsComponent() {
  const { t } = useTranslation();
  const { open: notify } = useNotification();
  const { tap, success } = useHaptics();
  const [settings, setSettings] = useState<ReminderSettings>(() => {
    const saved = localStorage.getItem("recurring-reminder-settings");
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const updateSetting = <K extends keyof ReminderSettings>(
    key: K,
    value: ReminderSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    success();
    setIsSaving(true);

    // Save to localStorage (in production, this would be an API call)
    localStorage.setItem("recurring-reminder-settings", JSON.stringify(settings));

    setTimeout(() => {
      setIsSaving(false);
      setHasChanges(false);
      notify?.({
        type: "success",
        message: t("settings.saved", "Settings saved"),
        description: t("settings.savedDescription", "Your reminder preferences have been updated"),
      });
    }, 500);
  };

  const handleTestEmail = () => {
    tap();
    notify?.({
      type: "success",
      message: t("settings.testEmailSent", "Test email sent"),
      description: t(
        "settings.testEmailDescription",
        `A test reminder has been sent to ${settings.email}`
      ),
    });
  };

  return (
    <div className="space-y-6">
      {/* Email Reminders Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MailIcon className="h-5 w-5 text-primary" />
            <CardTitle>{t("settings.emailReminders", "Email Reminders")}</CardTitle>
          </div>
          <CardDescription>
            {t(
              "settings.emailDescription",
              "Get notified before recurring expenses are due"
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Enable Email Reminders */}
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label htmlFor="email-reminders" className="text-base">
                {t("settings.enableEmailReminders", "Enable email reminders")}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t("settings.enableEmailDescription", "Receive emails before expenses are due")}
              </p>
            </div>
            <Switch
              id="email-reminders"
              checked={settings.emailReminders}
              onCheckedChange={(checked) => updateSetting("emailReminders", checked)}
            />
          </div>

          {settings.emailReminders && (
            <>
              {/* Email Address */}
              <div className="space-y-2">
                <Label htmlFor="email">
                  {t("settings.emailAddress", "Email address")}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={settings.email}
                    onChange={(e) => updateSetting("email", e.target.value)}
                  />
                  <Button
                    variant="outline"
                    onClick={handleTestEmail}
                    disabled={!settings.email}
                  >
                    {t("settings.test", "Test")}
                  </Button>
                </div>
              </div>

              {/* Reminder Days */}
              <div className="space-y-2">
                <Label htmlFor="reminder-days">
                  {t("settings.reminderDays", "Send reminder")}
                </Label>
                <Select
                  value={settings.reminderDays.toString()}
                  onValueChange={(value) => updateSetting("reminderDays", parseInt(value))}
                >
                  <SelectTrigger id="reminder-days">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">
                      {t("settings.1dayBefore", "1 day before")}
                    </SelectItem>
                    <SelectItem value="3">
                      {t("settings.3daysBefore", "3 days before")}
                    </SelectItem>
                    <SelectItem value="7">
                      {t("settings.1weekBefore", "1 week before")}
                    </SelectItem>
                    <SelectItem value="14">
                      {t("settings.2weeksBefore", "2 weeks before")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Daily Digest */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-x-2">
                <div className="space-y-0.5">
                  <Label htmlFor="daily-digest" className="text-sm font-medium">
                    {t("settings.dailyDigest", "Daily digest")}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.dailyDigestDescription", "Summary of expenses due today")}
                  </p>
                </div>
                <Switch
                  id="daily-digest"
                  checked={settings.dailyDigest}
                  onCheckedChange={(checked) => updateSetting("dailyDigest", checked)}
                />
              </div>

              {/* Weekly Digest */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-x-2">
                <div className="space-y-0.5">
                  <Label htmlFor="weekly-digest" className="text-sm font-medium">
                    {t("settings.weeklyDigest", "Weekly digest")}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.weeklyDigestDescription", "Summary of expenses due this week")}
                  </p>
                </div>
                <Switch
                  id="weekly-digest"
                  checked={settings.weeklyDigest}
                  onCheckedChange={(checked) => updateSetting("weeklyDigest", checked)}
                />
              </div>

              <Alert>
                <InfoIcon className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {t(
                    "settings.emailInfo",
                    "Emails are sent at 9:00 AM in your timezone. You can unsubscribe at any time."
                  )}
                </AlertDescription>
              </Alert>
            </>
          )}
        </CardContent>
      </Card>

      {/* Calendar Sync Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            <CardTitle>{t("settings.calendarSync", "Calendar Sync")}</CardTitle>
          </div>
          <CardDescription>
            {t(
              "settings.calendarDescription",
              "Add recurring expenses to your calendar automatically"
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Enable Calendar Sync */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-x-2">
            <div className="space-y-0.5">
              <Label htmlFor="calendar-sync" className="text-base">
                {t("settings.enableCalendarSync", "Enable calendar sync")}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t(
                  "settings.enableCalendarDescription",
                  "Sync recurring expenses to your calendar"
                )}
              </p>
            </div>
            <Switch
              id="calendar-sync"
              checked={settings.calendarSync}
              onCheckedChange={(checked) => updateSetting("calendarSync", checked)}
            />
          </div>

          {settings.calendarSync && (
            <>
              {/* Calendar Type */}
              <div className="space-y-2">
                <Label htmlFor="calendar-type">
                  {t("settings.calendarType", "Calendar type")}
                </Label>
                <Select
                  value={settings.calendarType}
                  onValueChange={(value: any) => updateSetting("calendarType", value)}
                >
                  <SelectTrigger id="calendar-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="google">Google Calendar</SelectItem>
                    <SelectItem value="apple">Apple Calendar</SelectItem>
                    <SelectItem value="outlook">Outlook Calendar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sync Status */}
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2Icon className="h-5 w-5 text-green-500" />
                    <span className="text-sm font-medium">
                      {t("settings.syncActive", "Sync Active")}
                    </span>
                  </div>
                  <Badge variant="default">
                    {t("settings.connected", "Connected")}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t(
                    "settings.syncDescription",
                    "Your recurring expenses will appear as calendar events"
                  )}
                </p>
              </div>

              <Alert>
                <InfoIcon className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {t(
                    "settings.calendarInfo",
                    "Calendar events are created 24 hours before each expense is due. You can customize event details in your calendar app."
                  )}
                </AlertDescription>
              </Alert>
            </>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end gap-2 sticky bottom-4">
          <Button variant="outline" onClick={() => { tap(); window.location.reload(); }}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? t("common.saving", "Saving...") : t("common.save", "Save Changes")}
          </Button>
        </div>
      )}
    </div>
  );
}
