import { useOne, useGo, useGetIdentity } from "@refinedev/core";
import { useParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Profile } from "../types";
import { supabaseClient } from "@/utility/supabaseClient";
import { useEffect, useState } from "react";
import { formatCurrency, formatDateShort } from "@/lib/locale-utils";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BalanceTable } from "@/components/dashboard/BalanceTable";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  HistoryIcon,
  UserIcon,
  BanknoteIcon,
  CameraIcon,
  Loader2Icon
} from "@/components/ui/icons";

interface DebtSummary {
  counterparty_id: string;
  counterparty_name: string;
  counterparty_avatar_url?: string;
  amount: number;
  i_owe_them: boolean;
  total_amount?: number;
  settled_amount?: number;
  remaining_amount?: number;
  transaction_count?: number;
  last_transaction_date?: string;
}

interface ActivityItem {
  id: string;
  type: "expense" | "payment";
  description: string;
  total_amount: number;
  user_share: number;
  currency: string;
  date: string;
  group_name?: string;
  paid_by_name?: string;
  is_lender: boolean;
  is_borrower: boolean;
  is_payment: boolean;
  comment?: string;
}

export const ProfileShow = () => {
  const { id } = useParams<{ id: string }>();
  const go = useGo();
  const { t } = useTranslation();
  const { data: identity } = useGetIdentity<Profile>();
  const [debts, setDebts] = useState<DebtSummary[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoadingDebts, setIsLoadingDebts] = useState(true);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [settleDialogOpen, setSettleDialogOpen] = useState(false);
  const [changePasswordDialogOpen, setChangePasswordDialogOpen] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: "",
    avatar_url: "",
    email: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const { query: profileQuery } = useOne<Profile>({
    resource: "profiles",
    id: id!,
  });

  const { data: profileData, isLoading: isLoadingProfile } = profileQuery;
  const profile = profileData?.data;

  const isOwnProfile = identity?.id === id;
  const canSettle = isOwnProfile;

  // Calculate net balance
  const netBalance = debts.reduce((sum, debt) => {
    return sum + (debt.i_owe_them ? -Number(debt.amount) : Number(debt.amount));
  }, 0);

  const totalOwedToMe = debts
    .filter(d => !d.i_owe_them)
    .reduce((sum, d) => sum + Number(d.amount), 0);

  const totalIOwe = debts
    .filter(d => d.i_owe_them)
    .reduce((sum, d) => sum + Number(d.amount), 0);

  // Refetch debts
  const refetchDebts = () => {
    if (!identity?.id) return;
    setIsLoadingDebts(true);
    const functionName = showHistory ? "get_user_debts_history" : "get_user_debts_aggregated";
    Promise.resolve(
      supabaseClient
        .rpc(functionName, { p_user_id: identity.id }) // Use current user's ID, not profile ID
        .then(({ data, error }: { data: any; error: any }) => {
          if (error) {
            console.error("Error fetching debts:", error);
            setDebts([]);
          } else {
            setDebts(data || []);
          }
        })
    ).finally(() => setIsLoadingDebts(false));
  };

  // Refetch activities
  const refetchActivities = () => {
    if (!id) return;
    setIsLoadingActivities(true);
    Promise.resolve(
      supabaseClient
        .rpc("get_user_activities", { p_user_id: id, p_limit: 20 })
        .then(({ data, error }: { data: any; error: any }) => {
          if (error) {
            console.error("Error fetching user activities:", error);
            toast.error(t('profile.errorLoadingActivities', `Failed to load activities: ${error.message || 'Unknown error'}`));
            setActivities([]);
            return;
          }
          const activities: ActivityItem[] = (data || []).map((item: any) => ({
            id: item.id,
            type: "expense" as const,
            description: item.description,
            total_amount: item.total_amount,
            user_share: item.user_share,
            currency: item.currency || "VND",
            date: item.date,
            group_name: item.group_name,
            paid_by_name: item.paid_by_name,
            is_lender: item.is_lender,
            is_borrower: item.is_borrower,
            is_payment: item.is_payment || false,  // Use value from database, not hardcoded false
            comment: item.comment || undefined,
          }));
          setActivities(activities);
        })
    ).finally(() => setIsLoadingActivities(false));
  };

  // Handle settle all debts
  const handleSettleAll = async () => {
    if (!identity?.id) return;

    setIsSettling(true);
    try {
      const debtToSettle = debts.find(d => !d.i_owe_them);
      if (!debtToSettle) return;

      const { error } = await supabaseClient.rpc('settle_all_debts_with_person', {
        p_counterparty_id: debtToSettle.counterparty_id,
      });

      if (error) throw error;

      toast.success(t('dashboard.settleSuccess', {
        name: debtToSettle.counterparty_name,
        amount: formatCurrency(debtToSettle.amount),
        defaultValue: `Successfully settled with ${debtToSettle.counterparty_name}`,
      }));

      refetchDebts();
      refetchActivities();
      setSettleDialogOpen(false);
    } catch (error: any) {
      console.error('Error settling debt:', error);
      toast.error(t('dashboard.settleError', {
        defaultValue: `Failed to settle debt: ${error.message}`,
      }));
    } finally {
      setIsSettling(false);
    }
  };

  useEffect(() => {
    refetchDebts();
  }, [identity?.id, showHistory]); // Changed dependency from id to identity.id

  useEffect(() => {
    refetchActivities();
  }, [id]);

  // Initialize edit form when profile loads
  useEffect(() => {
    if (profile && identity) {
      setEditForm({
        full_name: profile.full_name || "",
        avatar_url: profile.avatar_url || "",
        email: identity.email || "",
      });
    }
  }, [profile, identity]);

  // Handle avatar upload
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !identity?.id) return;

    setIsUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${identity.id}/${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabaseClient.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabaseClient.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setEditForm(prev => ({ ...prev, avatar_url: publicUrl }));
      toast.success(t('profile.avatarUploaded', 'Avatar uploaded successfully'));
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error(t('profile.avatarUploadError', 'Failed to upload avatar'));
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Handle save profile
  const handleSaveProfile = async () => {
    if (!identity?.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabaseClient
        .from('profiles')
        .update({
          full_name: editForm.full_name,
          avatar_url: editForm.avatar_url,
        })
        .eq('id', identity.id);

      if (error) throw error;

      toast.success(t('profile.profileUpdated', 'Profile updated successfully'));
      setEditDialogOpen(false);
      profileQuery.refetch();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(t('profile.profileUpdateError', 'Failed to update profile'));
    } finally {
      setIsSaving(false);
    }
  };

  // Handle change password
  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error(t('profile.passwordMismatch', 'Passwords do not match'));
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error(t('profile.passwordTooShort', 'Password must be at least 6 characters'));
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabaseClient.auth.updateUser({
        password: passwordForm.newPassword,
      });

      if (error) throw error;

      toast.success(t('profile.passwordChanged', 'Password changed successfully'));
      setChangePasswordDialogOpen(false);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(t('profile.passwordChangeError', `Failed to change password: ${error.message}`));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">{t('profile.loadingProfile')}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">{t('profile.profileNotFound')}</p>
      </div>
    );
  }

  // Filter debts to show only this person's debt
  const thisPersonDebt = debts.find(d => d.counterparty_id === id);

  // Format balances for BalanceTable component (only this person)
  const balances = thisPersonDebt ? [{
    counterparty_id: thisPersonDebt.counterparty_id,
    counterparty_name: thisPersonDebt.counterparty_name,
    counterparty_avatar_url: thisPersonDebt.counterparty_avatar_url,
    amount: thisPersonDebt.amount,
    i_owe_them: thisPersonDebt.i_owe_them,
    total_amount: thisPersonDebt.total_amount,
    settled_amount: thisPersonDebt.settled_amount,
    remaining_amount: thisPersonDebt.remaining_amount,
    transaction_count: thisPersonDebt.transaction_count,
    last_transaction_date: thisPersonDebt.last_transaction_date,
  }] : [];

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Minimalist Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => go({ to: "/" })}
            className="h-9 w-9"
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-background shadow-md">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="text-lg font-semibold bg-gradient-to-br from-primary/20 to-primary/10">
                {profile.full_name
                  ?.split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2) || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{profile.full_name}</h1>
              <p className="text-sm text-muted-foreground">
                {t('profile.memberSince', { date: formatDateShort(profile.created_at) })}
              </p>
            </div>
          </div>
        </div>
        {isOwnProfile && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditDialogOpen(true)}
          >
            <UserIcon className="h-4 w-4 mr-2" />
            {t('profile.edit', 'Edit')}
          </Button>
        )}
      </div>

      {/* Balance Summary Card */}
      <Card className="border-2">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground mb-1">{t('profile.netBalance', 'Net Balance')}</p>
              <p className={`text-2xl font-bold ${netBalance > 0 ? 'text-green-600' : netBalance < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                {formatCurrency(Math.abs(netBalance), "VND")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {netBalance > 0 ? t('profile.owesYou', 'owes you') : netBalance < 0 ? t('profile.youOwe', 'you owe') : t('profile.settled', 'settled')}
              </p>
            </div>
            <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-950/20">
              <p className="text-sm text-muted-foreground mb-1">{t('profile.owedToYou', 'Owed to You')}</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(totalOwedToMe, "VND")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {debts.filter(d => !d.i_owe_them).length} {t('profile.debts', 'debts')}
              </p>
            </div>
            <div className="text-center p-4 rounded-lg bg-red-50 dark:bg-red-950/20">
              <p className="text-sm text-muted-foreground mb-1">{t('profile.youOweTotal', 'You Owe')}</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {formatCurrency(totalIOwe, "VND")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {debts.filter(d => d.i_owe_them).length} {t('profile.debts', 'debts')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Organization */}
      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="activity">
            <HistoryIcon className="h-4 w-4 mr-2" />
            {t('profile.recentActivity', 'Activity')}
          </TabsTrigger>
          <TabsTrigger value="balances">
            <BanknoteIcon className="h-4 w-4 mr-2" />
            {t('profile.balanceHistory', 'Balance History')}
          </TabsTrigger>
        </TabsList>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {t('profile.recentActivity', 'Recent Activity')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingActivities ? (
                <p className="text-muted-foreground text-center py-8">{t('profile.loadingActivities')}</p>
              ) : activities.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">{t('profile.noRecentActivity')}</p>
              ) : (
                <div className="space-y-3">
                  {activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="p-4 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => {
                        go({
                          to: activity.type === "expense"
                            ? `/expenses/show/${activity.id}`
                            : `/payments/show/${activity.id}`,
                        });
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{activity.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {activity.group_name && (
                              <span className="text-xs text-muted-foreground truncate">
                                {activity.group_name}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatDateShort(activity.date)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 ml-4">
                          <Badge
                            variant={activity.is_borrower ? "destructive" : "default"}
                            className={
                              activity.is_borrower
                                ? "bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-300"
                                : activity.is_payment
                                ? "bg-muted text-muted-foreground"
                                : "bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-300"
                            }
                          >
                            {activity.is_payment
                              ? t('expenses.paid', 'Paid')
                              : activity.is_borrower
                              ? t('profile.owes')
                              : t('profile.paid')}
                          </Badge>
                          <p className={`text-base font-bold ${
                            activity.is_borrower ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                          }`}>
                            {formatCurrency(activity.user_share, activity.currency)}
                          </p>
                        </div>
                      </div>
                      {activity.comment && (
                        <div className="mt-3 pt-3 border-t border-border/50">
                          <div className="text-xs text-muted-foreground mb-1">{t('expenses.comment', 'Comment')}</div>
                          <p className="text-sm text-foreground/80 line-clamp-2">
                            {activity.comment.replace(/[#*_`\[\]()]/g, '').trim()}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Balance History Tab */}
        <TabsContent value="balances" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="show-history"
                checked={showHistory}
                onCheckedChange={setShowHistory}
              />
              <Label htmlFor="show-history" className="text-sm cursor-pointer">
                {t('dashboard.showAllTransactions', 'Show settled transactions')}
              </Label>
            </div>
            {canSettle && totalOwedToMe > 0 && (
              <Button
                variant="default"
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => setSettleDialogOpen(true)}
              >
                <CheckCircle2Icon className="h-4 w-4 mr-2" />
                {t('dashboard.settleAll', 'Settle All')}
              </Button>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {t('profile.balanceWithPerson', `Balance with ${profile.full_name}`)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingDebts ? (
                <p className="text-muted-foreground text-center py-8">{t('profile.loadingDebts')}</p>
              ) : balances.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {t('profile.noBalanceWithPerson', 'No outstanding balance with this person')}
                  </p>
                  {showHistory && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {t('profile.noHistoryEither', 'No transaction history found')}
                    </p>
                  )}
                </div>
              ) : (
                <BalanceTable
                  balances={balances}
                  showHistory={showHistory}
                  disabled={false}
                  pageSize={5}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Profile Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('profile.editProfile', 'Edit Profile')}</DialogTitle>
            <DialogDescription>
              {t('profile.editProfileDescription', 'Update your profile information')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Avatar Upload */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                <Avatar className="h-24 w-24 border-2 border-background shadow-lg">
                  <AvatarImage src={editForm.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary/20 to-primary/10">
                    {editForm.full_name
                      ?.split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2) || "U"}
                  </AvatarFallback>
                </Avatar>
                <label
                  htmlFor="avatar-upload"
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  {isUploadingAvatar ? (
                    <Loader2Icon className="h-6 w-6 text-white animate-spin" />
                  ) : (
                    <CameraIcon className="h-6 w-6 text-white" />
                  )}
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={isUploadingAvatar}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {t('profile.clickToUpload', 'Click avatar to upload new photo')}
              </p>
            </div>

            {/* Email (Read-only) */}
            <div className="space-y-2">
              <Label htmlFor="email">{t('profile.email', 'Email')}</Label>
              <Input
                id="email"
                type="email"
                value={editForm.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                {t('profile.emailReadOnly', 'Email cannot be changed')}
              </p>
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="full_name">{t('profile.fullName', 'Full Name')}</Label>
              <Input
                id="full_name"
                type="text"
                value={editForm.full_name}
                onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder={t('profile.enterFullName', 'Enter your full name')}
              />
            </div>

            {/* Change Password Button */}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setEditDialogOpen(false);
                setChangePasswordDialogOpen(true);
              }}
            >
              {t('profile.changePassword', 'Change Password')}
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={isSaving}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button onClick={handleSaveProfile} disabled={isSaving || !editForm.full_name}>
              {isSaving ? (
                <>
                  <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                  {t('common.saving', 'Saving...')}
                </>
              ) : (
                t('common.save', 'Save')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={changePasswordDialogOpen} onOpenChange={setChangePasswordDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{t('profile.changePassword', 'Change Password')}</DialogTitle>
            <DialogDescription>
              {t('profile.changePasswordDescription', 'Enter your new password below')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="new_password">{t('profile.newPassword', 'New Password')}</Label>
              <Input
                id="new_password"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                placeholder={t('profile.enterNewPassword', 'Enter new password')}
              />
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirm_password">{t('profile.confirmPassword', 'Confirm Password')}</Label>
              <Input
                id="confirm_password"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder={t('profile.confirmNewPassword', 'Confirm new password')}
              />
            </div>

            {passwordForm.newPassword && passwordForm.confirmPassword &&
             passwordForm.newPassword !== passwordForm.confirmPassword && (
              <p className="text-sm text-red-600">
                {t('profile.passwordMismatch', 'Passwords do not match')}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setChangePasswordDialogOpen(false);
                setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
              }}
              disabled={isSaving}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={
                isSaving ||
                !passwordForm.newPassword ||
                !passwordForm.confirmPassword ||
                passwordForm.newPassword !== passwordForm.confirmPassword
              }
            >
              {isSaving ? (
                <>
                  <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                  {t('common.saving', 'Saving...')}
                </>
              ) : (
                t('profile.updatePassword', 'Update Password')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settle All Dialog */}
      <AlertDialog open={settleDialogOpen} onOpenChange={setSettleDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('dashboard.settleAllTitle', 'Settle All Debts')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('dashboard.settleAllDescription', {
                name: profile.full_name,
                amount: formatCurrency(totalOwedToMe),
                defaultValue: `Are you sure you want to mark all debts with ${profile.full_name} as paid?`,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSettling}>
              {t('common.cancel', 'Cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSettleAll}
              disabled={isSettling}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSettling ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  {t('dashboard.settling', 'Settling...')}
                </>
              ) : (
                <>
                  <CheckCircle2Icon className="h-4 w-4 mr-2" />
                  {t('dashboard.confirmSettle', 'Confirm')}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
