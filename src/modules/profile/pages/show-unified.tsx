import { useOne, useGo, useGetIdentity, useList, useUpdate } from "@refinedev/core";
import { useParams, useSearchParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Profile } from "../types";
import { supabaseClient } from "@/utility/supabaseClient";
import { useEffect, useState, useMemo, useCallback } from "react";
import { isAdmin } from "@/lib/rbac";
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
  ActivityIcon,
  UsersIcon,
  PencilIcon,
  PlusIcon,
} from "@/components/ui/icons";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDateShort } from "@/lib/locale-utils";
import { useAggregatedDebts } from "@/hooks/use-aggregated-debts";

// Import new components
import { ProfileHeader } from "../components/profile-header";
import { ProfileBalanceSummary } from "../components/profile-balance-summary";
import { ProfileActivityFeed } from "../components/profile-activity-feed";
import { ProfileAvatarUpload } from "../components/profile-avatar-upload";
import { ProfileMobileNavigation } from "../components/profile-mobile-navigation";
import { ProfileForm } from "../components/profile-form";
import { ProfileGroupsList } from "../components/profile-groups-list";
import { ProfileFriendsList } from "../components/profile-friends-list";
import { SwipeableTabs } from "../components/swipeable-tabs";
import { PullToRefresh } from "../components/pull-to-refresh";
import { EmptyActivities, EmptyBalances } from "../components/profile-empty-states";

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

export const ProfileShowUnified = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const go = useGo();
  const { t } = useTranslation();
  const { data: identity } = useGetIdentity<Profile>();

  // State management
  const [debts, setDebts] = useState<DebtSummary[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoadingDebts, setIsLoadingDebts] = useState(true);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [settleDialogOpen, setSettleDialogOpen] = useState(false);
  const [changePasswordDialogOpen, setChangePasswordDialogOpen] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [activityPage, setActivityPage] = useState(1);
  const [hasMoreActivities, setHasMoreActivities] = useState(true);
  const [activeTab, setActiveTab] = useState("activity");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Edit mode support
  const isEditMode = searchParams.get("edit") === "true";
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  
  const setEditMode = (enabled: boolean) => {
    if (enabled) {
      searchParams.set("edit", "true");
      setSearchParams(searchParams);
    } else {
      // Use history-based navigation to go back
      window.history.back();
    }
  };

  const handleCancelEdit = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedDialog(true);
    } else {
      setEditMode(false);
    }
  };

  const confirmCancelEdit = () => {
    setHasUnsavedChanges(false);
    setShowUnsavedDialog(false);
    setEditMode(false);
  };

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
  const [isUserAdmin, setIsUserAdmin] = useState(false);

  // Check admin status
  useEffect(() => {
    const checkAdmin = async () => {
      if (identity?.id) {
        const adminStatus = await isAdmin();
        setIsUserAdmin(adminStatus);
      }
    };
    checkAdmin();
  }, [identity?.id]);

  // Profile query
  const { query: profileQuery } = useOne<Profile>({
    resource: "profiles",
    id: profileId,
  });

  const { data: profileData, isLoading: isLoadingProfile } = profileQuery;
  const profile = profileData?.data;

  // Groups and Friends data
  const [myGroups, setMyGroups] = useState<Array<{id: string, name: string, created_at: string, avatar_url?: string}>>([]);
  const [myFriends, setMyFriends] = useState<Array<{id: string, full_name: string, avatar_url?: string, email?: string}>>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [friendsLoading, setFriendsLoading] = useState(false);

  // Fetch groups
  const { query: groupMembersQuery } = useList({
    resource: "group_members",
    filters: [
      {
        field: "user_id",
        operator: "eq",
        value: profileId,
      },
    ],
    meta: {
      select: "*, groups!group_id(id, name, created_at, avatar_url)",
    },
    pagination: {
      mode: "off",
    },
    queryOptions: {
      enabled: !!profileId,
    },
  });

  useEffect(() => {
    const groupMembersData = groupMembersQuery.data;
    if (groupMembersData) {
      const groups = (groupMembersData.data || []).map((gm: any) => ({
        id: gm.groups?.id,
        name: gm.groups?.name,
        created_at: gm.groups?.created_at,
        avatar_url: gm.groups?.avatar_url,
      })).filter((g: any) => g.id);
      setMyGroups(groups);
    }
  }, [groupMembersQuery.data]);

  // Fetch friends
  useEffect(() => {
    if (!profileId) return;

    setFriendsLoading(true);
    supabaseClient
      .from('friendships')
      .select(`
        id,
        user_a,
        user_b,
        status,
        user_a_profile:profiles!friendships_user_a_fkey(id, full_name, avatar_url, email),
        user_b_profile:profiles!friendships_user_b_fkey(id, full_name, avatar_url, email)
      `)
      .or(`user_a.eq.${profileId},user_b.eq.${profileId}`)
      .eq('status', 'accepted')
      .then(({ data, error }) => {
        if (error) {
          console.error('Error fetching friendships:', error);
          setMyFriends([]);
        } else {
          const friends = (data || []).map((f: any) => {
            const friendProfile = f.user_a === profileId ? f.user_b_profile : f.user_a_profile;
            return {
              id: friendProfile?.id || '',
              full_name: friendProfile?.full_name || '',
              avatar_url: friendProfile?.avatar_url || '',
              email: friendProfile?.email || '',
            };
          }).filter(f => f.id);
          setMyFriends(friends);
        }
        setFriendsLoading(false);
      });
  }, [profileId]);

  // Fetch debts
  const fetchDebts = useCallback(async (includeHistory = false) => {
    if (!profileId) return;

    setIsLoadingDebts(true);
    try {
      // Fetch debts based on authentication
      if (!identity?.id) {
        // For unauthenticated users, use public endpoint
        const { data, error } = await supabaseClient
          .rpc("get_user_debts_public");

        if (error) throw error;

        const publicDebts = (data || []).map((debt: any) => ({
          ...debt,
          currency: debt.currency || "VND",
          // Use remaining_amount if available, otherwise use amount
          amount: debt.remaining_amount !== undefined ? debt.remaining_amount : debt.amount
        }));

        setDebts(publicDebts);
      } else {
        // For authenticated users
        const functionName = includeHistory
          ? "get_user_debts_history"
          : "get_user_debts_aggregated";

        const { data, error } = await supabaseClient
          .rpc(functionName, { p_user_id: profileId });

        if (error) throw error;

        // Process debts: use remaining_amount (unpaid) as the primary amount to display
        const debtsWithCurrency = (data || []).map((debt: any) => {
          // For non-history mode, use remaining_amount if available (shows unpaid amount)
          // For history mode, keep all fields but prioritize remaining_amount for display
          const displayAmount = includeHistory
            ? (debt.remaining_amount !== undefined ? debt.remaining_amount : debt.amount)
            : (debt.remaining_amount !== undefined ? debt.remaining_amount : debt.amount);

          return {
            ...debt,
            currency: debt.currency || "VND",
            // Update amount to show remaining (unpaid) amount
            amount: displayAmount
          };
        });

        setDebts(debtsWithCurrency);
      }
    } catch (error) {
      console.error("Error fetching debts:", error);
      toast.error(t('profile.errorLoadingDebts', 'Failed to load balances'));
    } finally {
      setIsLoadingDebts(false);
    }
  }, [profileId, isUserAdmin, isOwnProfile, identity?.id, t]);

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

      // Process activities - show all activities without privacy restrictions
      const processedActivities = data || [];

      if (append) {
        setActivities(prev => [...prev, ...processedActivities]);
      } else {
        setActivities(processedActivities);
      }

      setHasMoreActivities(processedActivities.length === limit);
    } catch (error) {
      console.error("Error fetching activities:", error);
      toast.error(t('profile.errorLoadingActivities', 'Failed to load activities'));
    } finally {
      setIsLoadingActivities(false);
    }
  };

  // Refresh all data
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchDebts(showHistory),
        fetchActivities(1, false),
        profileQuery.refetch(),
      ]);
      toast.success(t('common.refreshed', 'Data refreshed'));
    } catch (error) {
      console.error('Error refreshing:', error);
      toast.error(t('common.refreshError', 'Failed to refresh'));
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchDebts, showHistory, profileQuery, t]);

  useEffect(() => {
    fetchDebts(showHistory);
  }, [fetchDebts, showHistory]);

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
      setHasUnsavedChanges(false);
      setEditMode(false);
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

  // Tab configuration
  const tabs = ["activity", "balances"];
  if (isOwnProfile) {
    tabs.push("groups", "friends");
  }

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
              onClick={() => go({ to: "/" })}
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

  // Calculate net balance - use remaining_amount (unpaid) for calculations
  // Only include unsettled debts when showHistory is false
  const netBalance = debts
    .filter(d => {
      // When showHistory is false, filter out fully settled debts
      if (!showHistory) {
        // Use remaining_amount if available, otherwise use amount
        const remainingAmount = Number(d.remaining_amount !== undefined ? d.remaining_amount : d.amount || 0);
        return remainingAmount !== 0;
      }
      // When showHistory is true, include all debts but use remaining_amount
      return true;
    })
    .reduce((sum, d) => {
      // Use remaining_amount (unpaid) for calculation, fallback to amount
      const amountToUse = d.remaining_amount !== undefined ? d.remaining_amount : d.amount;
      return sum + (d.i_owe_them ? -Math.abs(amountToUse) : Math.abs(amountToUse));
    }, 0);

  return (
    <>
      <PullToRefresh onRefresh={handleRefresh} disabled={!isOwnProfile || isEditMode}>
        <div className="container mx-auto px-4 py-4 sm:py-8 max-w-4xl pb-20 sm:pb-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Desktop Back Button */}
            <div className="hidden sm:flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={() => go({ to: "/" })}
                className="rounded-lg"
              >
                <ArrowLeftIcon size={16} className="mr-2" />
                {t('common.back', 'Back')}
              </Button>

              {isOwnProfile && !isEditMode && (
                <Button
                  onClick={() => setEditMode(true)}
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                >
                  <PencilIcon size={16} className="mr-2" />
                  {t('profile.edit', 'Edit Profile')}
                </Button>
              )}
            </div>

            {/* Profile Header */}
            <Card className="rounded-xl overflow-hidden">
              <AnimatePresence mode="wait">
                {isEditMode ? (
                  <motion.div
                    key="edit-mode"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, type: "spring", stiffness: 100, damping: 15 }}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold">{t('profile.editProfile', 'Edit Profile')}</h2>
                        <Button
                          onClick={handleCancelEdit}
                          variant="ghost"
                          size="sm"
                        >
                          {t('common.cancel', 'Cancel')}
                        </Button>
                      </div>

                      <div className="space-y-6">
                        <div className="flex justify-center">
                          <ProfileAvatarUpload
                            currentAvatarUrl={editForm.avatar_url}
                            fullName={editForm.full_name}
                            onUpload={handleAvatarUpload}
                            size="lg"
                          />
                        </div>

                        <ProfileForm
                          onSubmit={handleSaveProfile}
                          defaultValues={editForm}
                          isLoading={isSaving}
                          onChangePassword={() => setChangePasswordDialogOpen(true)}
                        />
                      </div>
                    </CardContent>
                  </motion.div>
                ) : (
                  <motion.div
                    key="view-mode"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, type: "spring", stiffness: 100, damping: 15 }}
                  >
                    <ProfileHeader
                      profile={profile}
                      isOwnProfile={isOwnProfile}
                      onEditClick={() => setEditMode(true)}
                      onAvatarClick={() => document.getElementById('avatar-input')?.click()}
                      onShareClick={handleShareProfile}
                      isUploadingAvatar={isUploadingAvatar}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>

            {/* Balance Summary - Only show in view mode */}
            <AnimatePresence>
              {!isEditMode && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  <ProfileBalanceSummary
                    debts={debts}
                    showHistory={showHistory}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tabs for Activities, Balances, Groups, Friends */}
            <AnimatePresence>
              {!isEditMode && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, type: "spring", stiffness: 100, damping: 15 }}
                  className="w-full"
                >
                  <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="w-full"
                  >
                <TabsList className="grid w-full rounded-lg" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
                  <TabsTrigger value="activity" className="rounded-lg">
                    <ActivityIcon size={16} className="mr-2" />
                    <span className="hidden sm:inline">{t('profile.activity', 'Activity')}</span>
                    <span className="sm:hidden">{t('profile.activity', 'Activity')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="balances" className="rounded-lg">
                    <BanknoteIcon size={16} className="mr-2" />
                    <span className="hidden sm:inline">{t('profile.balances', 'Balances')}</span>
                    <span className="sm:hidden">{t('profile.balances', 'Balances')}</span>
                  </TabsTrigger>
                  {isOwnProfile && (
                    <>
                      <TabsTrigger value="groups" className="rounded-lg">
                        <UsersIcon size={16} className="mr-2 sm:mr-0 lg:mr-2" />
                        <span className="hidden lg:inline">{t('profile.groups', 'Groups')}</span>
                      </TabsTrigger>
                      <TabsTrigger value="friends" className="rounded-lg">
                        <UserIcon size={16} className="mr-2 sm:mr-0 lg:mr-2" />
                        <span className="hidden lg:inline">{t('profile.friends', 'Friends')}</span>
                      </TabsTrigger>
                    </>
                  )}
                </TabsList>

                <SwipeableTabs
                  tabs={tabs}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  className="mt-4"
                >
                  {/* Activity Tab */}
                  <TabsContent value="activity" className="mt-0">
                    <Card className="rounded-xl">
                      <CardHeader>
                        <CardTitle>{t('profile.recentActivity', 'Recent Activity')}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {activities.length === 0 && !isLoadingActivities ? (
                          <EmptyActivities />
                        ) : (
                          <ProfileActivityFeed
                            activities={activities}
                            isLoading={isLoadingActivities}
                            onLoadMore={handleLoadMoreActivities}
                            hasMore={hasMoreActivities}
                          />
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Balances Tab */}
                  <TabsContent value="balances" className="mt-0">
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
                          <EmptyBalances />
                        ) : (
                          <BalanceTable
                            balances={debts}
                            showHistory={showHistory}
                          />
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Groups Tab */}
                  {isOwnProfile && (
                    <TabsContent value="groups" className="mt-0">
                      <Card className="rounded-xl">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle>{t('profile.myGroups', 'My Groups')}</CardTitle>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => go({ to: "/groups/create" })}
                              className="rounded-lg"
                            >
                              <PlusIcon size={16} className="mr-2" />
                              {t('common.create', 'Create')}
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <ProfileGroupsList
                            groups={myGroups}
                            isLoading={groupsLoading || groupMembersQuery.isLoading}
                          />
                        </CardContent>
                      </Card>
                    </TabsContent>
                  )}

                  {/* Friends Tab */}
                  {isOwnProfile && (
                    <TabsContent value="friends" className="mt-0">
                      <Card className="rounded-xl">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle>{t('profile.myFriends', 'My Friends')}</CardTitle>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => go({ to: "/friends" })}
                              className="rounded-lg"
                            >
                              <PlusIcon size={16} className="mr-2" />
                              {t('common.add', 'Add')}
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <ProfileFriendsList
                            friends={myFriends}
                            isLoading={friendsLoading}
                          />
                        </CardContent>
                      </Card>
                    </TabsContent>
                  )}
                </SwipeableTabs>
                  </Tabs>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </PullToRefresh>

      {/* Mobile Navigation - Hide in edit mode */}
      {!isEditMode && (
        <ProfileMobileNavigation
          isOwnProfile={isOwnProfile}
          onEditClick={() => setEditMode(true)}
          onShareClick={handleShareProfile}
          onSettleClick={() => setSettleDialogOpen(true)}
          showSettle={netBalance !== 0 && !isOwnProfile}
        />
      )}

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

      {/* Unsaved Changes Dialog */}
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('profile.unsavedChanges', 'Unsaved Changes')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('profile.unsavedChangesDescription', 'You have unsaved changes. Are you sure you want to leave without saving?')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.stayOnPage', 'Stay on Page')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancelEdit} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.discardChanges', 'Discard Changes')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
