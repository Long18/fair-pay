import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserSettings } from '../hooks/use-user-settings';
import { DisplaySettingsForm, NotificationSettingsForm, PrivacySettingsForm } from '../components';
import { Settings, Bell, Shield } from 'lucide-react';

export function SettingsPage() {
  const { settings, isLoading, isUpdating, saveSettings } = useUserSettings();

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
        <h1 className="text-3xl font-bold">Cài đặt</h1>
        <p className="text-muted-foreground">
          Quản lý tùy chọn và sở thích của bạn
        </p>
      </div>

      <Tabs defaultValue="display" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="display" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Hiển thị</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Thông báo</span>
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Riêng tư</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="display">
          <Card>
            <CardHeader>
              <CardTitle>Tùy chọn hiển thị</CardTitle>
              <CardDescription>
                Tùy chỉnh giao diện và định dạng dữ liệu
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

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Tùy chọn thông báo</CardTitle>
              <CardDescription>
                Chọn loại thông báo bạn muốn nhận
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
        </TabsContent>

        <TabsContent value="privacy">
          <Card>
            <CardHeader>
              <CardTitle>Cài đặt riêng tư</CardTitle>
              <CardDescription>
                Kiểm soát ai có thể xem và tương tác với bạn
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
    </div>
  );
}

