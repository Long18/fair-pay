import { useOne, useGo, useGetIdentity } from "@refinedev/core";
import { useParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Profile } from "../types";
import { supabaseClient } from "@/utility/supabaseClient";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BalanceTable } from "@/components/dashboard/BalanceTable";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  HistoryIcon,
  UserIcon,
  BanknoteIcon,
  Loader2Icon,
  ActivityIcon
} from "@/components/ui/icons";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Import new components
import { ProfileHeader } from "../components/profile-header";
import { ProfileBalanceSummary } from "../components/profile-balance-summary";
import { ProfileActivityFeed } from "../components/profile-activity-feed";
import { ProfileAvatarUpload } from "../components/profile-avatar-upload";
import { ProfileMobileNavigation } from "../components/profile-mobile-navigation";
import { ProfileForm } from "../components/profile-form";

interface DebtSummary {
  counterparty_id: string;
  counterparty_name: string;
  counterparty_avatar_url?: string;
  amount: number;
  currency: string;
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
  const [activityPage, setActivityPage] = useState(1);
  const [hasMoreActivities, setHasMoreActivities] = useState(true);
  const [editForm, setEditForm] = useState({
    full_name: "",
    avatar_url: "",
    email: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const isOwnProfile = identity?.id === id;
  const profileId = id || identity?.id;

  const { query: profileQuery } = useOne<Profile>({
    resource: "profiles",
    id: profileId,
  });

  const { data: profileData, isLoading: isLoadingProfile } = profileQuery;
  const profile = profileData?.data;

  // Fetch debts
  const fetchDebts = async (includeHistory = false) => {
    if (!profileId) return;

    setIsLoadingDebts(true);
    try {
      const functionName = includeHistory
        ? "get_user_balances_with_history"
        : "get_user_balances";

      const { data, error } = await supabaseClient
        .rpc(functionName, { p_user_id: profileId });

      if (error) throw error;

      setDebts(data || []);
    } catch (error) {
      console.error("Error fetching debts:", error);
      toast.error(t('profile.errorLoadingDebts', 'Failed to load balances'));
    } finally {
      setIsLoadingDebts(false);
    }
  };

  // Fetch activities with pagination
  const fetchActivities = async (page = 1, append = false) => {
    if (!profileId) return;

    if (!append) setIsLoadingActivities(true);

    try {
      const limit = 10;
      const offset = (page - 1) * limit;

      const { data, error } = await supabaseClient
        .rpc('get_user_activities', {
          p_user_id: profileId,
          p_limit: limit,
          p_offset: offset
        });

      if (error) throw error;

      if (append) {
        setActivities(prev => [...prev, ...(data || [])]);
      } else {
        setActivities(data || []);
      }

      setHasMoreActivities((data || []).length === limit);
    } catch (error) {
      console.error("Error fetching activities:", error);
      toast.error(t('profile.errorLoadingActivities', 'Failed to load activities'));
    } finally {
      setIsLoadingActivities(false);
    }
  };

  useEffect(() => {
    fetchDebts(showHistory);
  }, [profileId, showHistory]);

  useEffect(() => {
    fetchActivities(1, false);
  }, [profileId]);

  // Initialize edit form when profile loads
  useEffect(() => {
    if (profile && isOwnProfile) {
      setEditForm({
        full_name: profile.full_name || "",
        avatar_url: profile.avatar_url || "",
        email: profile.email || "",
      });
    }
  }, [profile, isOwnProfile]);

  // Handle avatar upload
  const handleAvatarUpload = async (file: File) => {
    if (!profile?.id) return;

    setIsUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}/${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabaseClient.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabaseClient.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      setEditForm(prev => ({ ...prev, avatar_url: publicUrl }));
      profileQuery.refetch();

      return publicUrl;
    } catch (error) {
      console.error('Avatar upload error:', error);
      throw error;
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Handle save profile
  const handleSaveProfile = async (values: any) => {
    if (!profile?.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabaseClient
        .from('profiles')
        .update({ full_name: values.full_name })
        .eq('id', profile.id);

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

    try {
      const { error } = await supabaseClient.auth.updateUser({
        password: passwordForm.newPassword,
      });

      if (error) throw error;

      toast.success(t('profile.passwordChanged', 'Password changed successfully'));
      setChangePasswordDialogOpen(false);
      setPasswordForm({ newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(t('profile.passwordChangeError', `Failed to change password: ${error.message}`));
    }
  };

  // Handle share profile
  const handleShareProfile = async () => {
    const profileUrl = `${window.location.origin}/profile/${profileId}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: profile?.full_name || 'Profile',
          text: t('profile.checkOutProfile', `Check out ${profile?.full_name}'s profile on FairPay`),
          url: profileUrl,
        });
      } else {
        await navigator.clipboard.writeText(profileUrl);
        toast.success(t('profile.linkCopied', 'Profile link copied to clipboard'));
      }
    } catch (error) {
      console.error('Error sharing profile:', error);
      toast.error(t('profile.shareError', 'Failed to share profile'));
    }
  };

  // Handle settle all
  const handleSettleAll = async () => {
    if (!profileId || !identity?.id) return;

    setIsSettling(true);
    try {
      // Implementation would go here
      toast.success(t('profile.allDebtsSettled', 'All debts marked as settled'));
      setSettleDialogOpen(false);
      fetchDebts(showHistory);
    } catch (error) {
      console.error('Error settling debts:', error);
      toast.error(t('profile.settleError', 'Failed to settle debts'));
    } finally {
      setIsSettling(false);
    }
  };

  // Handle load more activities
  const handleLoadMoreActivities = () => {
    const nextPage = activityPage + 1;
    setActivityPage(nextPage);
    fetchActivities(nextPage, true);
  };

  if (isLoadingProfile) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <Loader2Icon size={32} className="animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="rounded-xl">
          <CardContent className="p-8 text-center">
            <UserIcon size={48} className="mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">{t('profile.profileNotFound', 'Profile not found')}</p>
            <Button
              onClick={() => go({ to: "/dashboard" })}
              className="mt-4 rounded-lg"
            >
              <ArrowLeftIcon size={16} className="mr-2" />
              {t('common.backToDashboard', 'Back to Dashboard')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const netBalance = debts.reduce((sum, d) => {
    return sum + (d.i_owe_them ? -Math.abs(d.amount) : Math.abs(d.amount));
  }, 0);

  return (
    <>
      <div className="container mx-auto px-4 py-4 sm:py-8 max-w-4xl pb-20 sm:pb-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          {/* Desktop Back Button */}
          <div className="hidden sm:block">
            <Button
              variant="ghost"
              onClick={() => go({ to: "/" })}
              className="rounded-lg"
            >
              <ArrowLeftIcon size={16} className="mr-2" />
              {t('common.back', 'Back')}
            </Button>
          </div>

          {/* Profile Header */}
          <Card className="rounded-xl overflow-hidden">
            <ProfileHeader
              profile={profile}
              isOwnProfile={isOwnProfile}
              onEditClick={() => setEditDialogOpen(true)}
              onAvatarClick={() => document.getElementById('avatar-input')?.click()}
              onShareClick={handleShareProfile}
              isUploadingAvatar={isUploadingAvatar}
            />
          </Card>

          {/* Balance Summary */}
          <ProfileBalanceSummary
            debts={debts}
          />

          {/* Tabs for Activities and Balances */}
          <Tabs defaultValue="activity" className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-lg">
              <TabsTrigger value="activity" className="rounded-lg">
                <ActivityIcon size={16} className="mr-2" />
                {t('profile.recentActivity', 'Activity')}
              </TabsTrigger>
              <TabsTrigger value="balances" className="rounded-lg">
                <BanknoteIcon size={16} className="mr-2" />
                {t('profile.balances', 'Balances')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="activity" className="mt-4">
              <Card className="rounded-xl">
                <CardHeader>
                  <CardTitle>{t('profile.recentActivity', 'Recent Activity')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ProfileActivityFeed
                    activities={activities}
                    isLoading={isLoadingActivities}
                    onLoadMore={handleLoadMoreActivities}
                    hasMore={hasMoreActivities}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="balances" className="mt-4">
              <Card className="rounded-xl">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{t('profile.balanceDetails', 'Balance Details')}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="show-history" className="text-sm">
                        <HistoryIcon size={16} className="inline mr-1" />
                        {t('profile.showHistory', 'History')}
                      </Label>
                      <Switch
                        id="show-history"
                        checked={showHistory}
                        onCheckedChange={setShowHistory}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingDebts ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2Icon size={24} className="animate-spin text-muted-foreground" />
                    </div>
                  ) : debts.length === 0 ? (
                    <div className="text-center py-8">
                      <BanknoteIcon size={48} className="mx-auto mb-4 text-muted-foreground/50" />
                      <p className="text-muted-foreground">
                        {showHistory
                          ? t('profile.noHistoryFound', 'No transaction history found')
                          : t('profile.noOutstandingBalance', 'No outstanding balances')}
                      </p>
                    </div>
                  ) : (
                    <BalanceTable
                      balances={debts}
                      showHistory={showHistory}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      {/* Mobile Navigation */}
      <ProfileMobileNavigation
        isOwnProfile={isOwnProfile}
        onEditClick={() => setEditDialogOpen(true)}
        onShareClick={handleShareProfile}
        onSettleClick={() => setSettleDialogOpen(true)}
        showSettle={netBalance !== 0 && !isOwnProfile}
      />

      {/* Edit Profile Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('profile.editProfile', 'Edit Profile')}</DialogTitle>
            <DialogDescription>
              {t('profile.editProfileDescription', 'Update your profile information')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Avatar Upload */}
            <div className="flex justify-center">
              <ProfileAvatarUpload
                currentAvatarUrl={editForm.avatar_url}
                fullName={editForm.full_name}
                onUpload={handleAvatarUpload}
                size="lg"
              />
            </div>

            {/* Hidden file input */}
            <input
              id="avatar-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAvatarUpload(file);
              }}
            />

            {/* Profile Form */}
            <ProfileForm
              onSubmit={handleSaveProfile}
              defaultValues={editForm}
              isLoading={isSaving}
              onChangePassword={() => {
                setEditDialogOpen(false);
                setChangePasswordDialogOpen(true);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={changePasswordDialogOpen} onOpenChange={setChangePasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('profile.changePassword', 'Change Password')}</DialogTitle>
            <DialogDescription>
              {t('profile.changePasswordDescription', 'Enter your new password below')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new_password">{t('profile.newPassword', 'New Password')}</Label>
              <Input
                id="new_password"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                placeholder={t('profile.enterNewPassword', 'Enter new password')}
              />
            </div>
            <div>
              <Label htmlFor="confirm_password">{t('profile.confirmPassword', 'Confirm Password')}</Label>
              <Input
                id="confirm_password"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder={t('profile.confirmNewPassword', 'Confirm new password')}
              />
            </div>
            {passwordForm.newPassword && passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
              <p className="text-sm text-destructive">
                {t('profile.passwordMismatch', 'Passwords do not match')}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setChangePasswordDialogOpen(false);
                setPasswordForm({ newPassword: "", confirmPassword: "" });
              }}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={!passwordForm.newPassword || !passwordForm.confirmPassword || passwordForm.newPassword !== passwordForm.confirmPassword}
            >
              {t('profile.updatePassword', 'Update Password')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settle All Dialog */}
      <AlertDialog open={settleDialogOpen} onOpenChange={setSettleDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('profile.settleAllTitle', 'Settle All Debts')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('profile.settleAllDescription', {
                name: profile.full_name,
                defaultValue: `Are you sure you want to mark all debts with ${profile.full_name} as paid?`,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleSettleAll} disabled={isSettling}>
              {isSettling ? (
                <>
                  <Loader2Icon size={16} className="mr-2 animate-spin" />
                  {t('common.settling', 'Settling...')}
                </>
              ) : (
                t('profile.confirmSettle', 'Yes, Settle All')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
