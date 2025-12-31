import { useOne, useUpdate, useGetIdentity, useGo, useList } from "@refinedev/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ProfileForm } from "../components/profile-form";
import { Profile, ProfileFormValues } from "../types";
import { toast } from "sonner";
import React, { useState, useMemo } from "react";
import { supabaseClient } from "@/utility/supabaseClient";
import { ArrowLeftIcon, CameraIcon, Loader2Icon, BanknoteIcon, HistoryIcon, UsersIcon, UserIcon, RepeatIcon } from "@/components/ui/icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "react-i18next";
import { useAggregatedDebts } from "@/hooks/use-aggregated-debts";
import { usePaginatedActivities } from "@/hooks/use-paginated-activities";
import { BalanceTable } from "@/components/dashboard/BalanceTable";
import { ActivityTable } from "@/components/dashboard/ActivityTable";
import { formatCurrency } from "@/lib/utils";

export const ProfileEdit = () => {
  const { data: identity } = useGetIdentity<Profile>();
  const go = useGo();
  const { t } = useTranslation();
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [changePasswordDialogOpen, setChangePasswordDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  // Fetch user's debts and activities
  const { data: debts = [], isLoading: debtsLoading } = useAggregatedDebts({
    includeHistory: showHistory
  });
  const {
    items: activities,
    metadata: activitiesMetadata,
    setPage: setActivitiesPage,
    isLoading: activitiesLoading
  } = usePaginatedActivities({ pageSize: 10 });

  // Fetch user's groups
  const { data: groupMembersData, isLoading: groupsLoading } = useList({
    resource: "group_members",
    filters: [
      {
        field: "user_id",
        operator: "eq",
        value: identity?.id,
      },
    ],
    meta: {
      select: "*, groups!group_id(id, name, created_at, avatar_url)",
    },
    pagination: {
      mode: "off",
    },
    queryOptions: {
      enabled: !!identity?.id,
    },
  });

  const myGroups = (groupMembersData?.data || []).map((gm: any) => ({
    id: gm.groups?.id,
    name: gm.groups?.name,
    created_at: gm.groups?.created_at,
    avatar_url: gm.groups?.avatar_url,
  })).filter(g => g.id);

  // Fetch user's friends using custom query
  // Since friendships table uses user_a and user_b, we need to query both directions
  const [myFriends, setMyFriends] = useState<Array<{id: string, full_name: string, avatar_url: string}>>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);

  // Fetch friendships on mount or when identity changes
  React.useEffect(() => {
    if (!identity?.id) return;

    setFriendsLoading(true);

    // Query friendships where current user is either user_a or user_b
    supabaseClient
      .from('friendships')
      .select(`
        id,
        user_a,
        user_b,
        status,
        user_a_profile:profiles!friendships_user_a_fkey(id, full_name, avatar_url),
        user_b_profile:profiles!friendships_user_b_fkey(id, full_name, avatar_url)
      `)
      .or(`user_a.eq.${identity.id},user_b.eq.${identity.id}`)
      .eq('status', 'accepted')
      .then(({ data, error }) => {
        if (error) {
          console.error('Error fetching friendships:', error);
          setMyFriends([]);
        } else {
          // Extract the OTHER user's profile (not the current user)
          const friends = (data || []).map((f: any) => {
            // If current user is user_a, return user_b's profile, and vice versa
            const friendProfile = f.user_a === identity.id ? f.user_b_profile : f.user_a_profile;
            return {
              id: friendProfile?.id || '',
              full_name: friendProfile?.full_name || '',
              avatar_url: friendProfile?.avatar_url || '',
            };
          }).filter(f => f.id);

          setMyFriends(friends);
        }
        setFriendsLoading(false);
      });
  }, [identity?.id]);

  const { query: profileQuery } = useOne({
    resource: "profiles",
    id: identity?.id || "",
    queryOptions: {
      enabled: !!identity?.id,
    },
    meta: {
      select: "*",
    },
  });

  const { mutate: updateProfile, isLoading: isUpdating } = useUpdate();

  const { data: profileData, isLoading: profileLoading, isError: profileError } = profileQuery;
  const profile = profileData?.data as Profile | undefined;

  // Debug logging
  React.useEffect(() => {
    console.log('ProfileEdit Debug:', {
      hasIdentity: !!identity?.id,
      identityId: identity?.id,
      profileLoading,
      profileError,
      hasProfileData: !!profileData,
      hasProfile: !!profile,
      profileData,
    });
  }, [identity?.id, profileLoading, profileError, profileData, profile]);

  // Calculate balance summary - MUST be before early return to avoid conditional hooks
  const balanceSummary = useMemo(() => {
    const totalOwedToMe = debts
      .filter(d => !d.i_owe_them)
      .reduce((sum, d) => sum + Number(d.amount), 0);
    const totalIOwe = debts
      .filter(d => d.i_owe_them)
      .reduce((sum, d) => sum + Number(d.amount), 0);
    const netBalance = totalOwedToMe - totalIOwe;

    return {
      netBalance,
      totalOwedToMe,
      totalIOwe,
    };
  }, [debts]);

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

      setAvatarUrl(publicUrl);

      // Update profile immediately
      updateProfile(
        {
          resource: "profiles",
          id: identity.id,
          values: { avatar_url: publicUrl },
        },
        {
          onSuccess: () => {
            toast.success(t('profile.avatarUploaded', 'Avatar uploaded successfully'));
            profileQuery.refetch();
          },
          onError: (error: any) => {
            toast.error(t('profile.avatarUploadError', 'Failed to upload avatar'));
          },
        }
      );
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error(t('profile.avatarUploadError', 'Failed to upload avatar'));
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSubmit = (values: ProfileFormValues) => {
    if (!profile?.id) {
      toast.error("Profile not found");
      return;
    }

    updateProfile(
      {
        resource: "profiles",
        id: profile.id,
        values: {
          ...values,
          avatar_url: avatarUrl || values.avatar_url,
        },
      },
      {
        onSuccess: () => {
          toast.success("Profile updated successfully");
          go({ to: "/" });
        },
        onError: (error: any) => {
          toast.error(`Failed to update profile: ${error.message}`);
        },
      }
    );
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
      setPasswordForm({ newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(t('profile.passwordChangeError', `Failed to change password: ${error.message}`));
    } finally {
      setIsSaving(false);
    }
  };

  if (!identity?.id) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading user identity...</p>
        </div>
      </div>
    );
  }

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">Profile not found</p>
          <Button onClick={() => go({ to: "/" })}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  const currentAvatarUrl = avatarUrl || profile.avatar_url;

  // Format balances for BalanceTable component
  const balances = debts.map(d => ({
    counterparty_id: d.counterparty_id,
    counterparty_name: d.counterparty_name,
    counterparty_avatar_url: d.counterparty_avatar_url,
    amount: d.amount,
    i_owe_them: d.i_owe_them,
    total_amount: d.total_amount,
    settled_amount: d.settled_amount,
    remaining_amount: d.remaining_amount,
    transaction_count: d.transaction_count,
    last_transaction_date: d.last_transaction_date,
  }));

  return (
    <div className="space-y-6 p-4 md:p-6 min-h-screen">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => go({ to: "/" })}
          className="h-9 w-9"
        >
          <ArrowLeftIcon className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{t('profile.editProfile', 'Edit Profile')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('profile.editProfileDescription', 'Update your profile information')}
          </p>
        </div>
      </div>

      <Card className="max-w-2xl mx-auto overflow-visible">
        <CardHeader>
          <div className="flex flex-col items-center gap-4">
            {/* Avatar Upload */}
            <div className="relative group">
              <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-background shadow-lg">
                <AvatarImage src={currentAvatarUrl || undefined} />
                <AvatarFallback className="text-2xl md:text-3xl font-bold bg-gradient-to-br from-primary/20 to-primary/10">
                  {profile.full_name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2) || "U"}
                </AvatarFallback>
              </Avatar>
              <label
                htmlFor="avatar-upload"
                className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                {isUploadingAvatar ? (
                  <Loader2Icon className="h-6 w-6 md:h-8 md:w-8 text-white animate-spin" />
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <CameraIcon className="h-6 w-6 md:h-8 md:w-8 text-white" />
                    <span className="text-xs text-white font-medium hidden md:block">
                      {t('profile.changePhoto', 'Change Photo')}
                    </span>
                  </div>
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
        </CardHeader>
        <CardContent>
          <ProfileForm
            onSubmit={handleSubmit}
            defaultValues={{
              full_name: profile.full_name,
              avatar_url: currentAvatarUrl || "",
              email: identity.email || "",
            }}
            isLoading={isUpdating}
            onChangePassword={() => setChangePasswordDialogOpen(true)}
          />
        </CardContent>
      </Card>

      {/* Balance Summary Card */}
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl font-bold tracking-tight">
            {t('profile.balanceSummary', 'Balance Summary')}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Net Balance */}
          <div className="p-4 rounded-lg border bg-card">
            <p className="text-sm text-muted-foreground mb-1">
              {t('profile.netBalance', 'Net Balance')}
            </p>
            <p className={`text-2xl font-bold ${
              balanceSummary.netBalance > 0 ? 'text-green-600' :
              balanceSummary.netBalance < 0 ? 'text-red-600' :
              'text-muted-foreground'
            }`}>
              ₫{formatCurrency(Math.abs(balanceSummary.netBalance))}
            </p>
            {balanceSummary.netBalance !== 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {balanceSummary.netBalance > 0
                  ? t('profile.youAreOwed', 'You are owed')
                  : t('profile.youOwe', 'You owe')}
              </p>
            )}
          </div>

          {/* Owed to You */}
          <div className="p-4 rounded-lg border bg-card">
            <p className="text-sm text-muted-foreground mb-1">
              {t('profile.owedToYou', 'Owed to You')}
            </p>
            <p className="text-2xl font-bold text-green-600">
              ₫{formatCurrency(balanceSummary.totalOwedToMe)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {debts.filter(d => !d.i_owe_them).length} {t('profile.people', 'people')}
            </p>
          </div>

          {/* You Owe */}
          <div className="p-4 rounded-lg border bg-card">
            <p className="text-sm text-muted-foreground mb-1">
              {t('profile.youOwe', 'You Owe')}
            </p>
            <p className="text-2xl font-bold text-red-600">
              ₫{formatCurrency(balanceSummary.totalIOwe)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {debts.filter(d => d.i_owe_them).length} {t('profile.people', 'people')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Activity, Recurring, Groups, Friends */}
      <Tabs defaultValue="activity" className="space-y-4 max-w-2xl mx-auto">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="activity">
            <HistoryIcon className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">{t('profile.recentActivity', 'Activity')}</span>
            <span className="sm:hidden">{t('profile.activity', 'Activity')}</span>
          </TabsTrigger>
          <TabsTrigger value="recurring">
            <RepeatIcon className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">{t('recurring.title', 'Recurring')}</span>
            <span className="sm:hidden">{t('recurring.short', 'Recurring')}</span>
          </TabsTrigger>
          <TabsTrigger value="groups">
            <UsersIcon className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">{t('groups.title', 'Groups')}</span>
            <span className="sm:hidden">{t('groups.short', 'Groups')}</span>
          </TabsTrigger>
          <TabsTrigger value="friends">
            <UserIcon className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">{t('friends.title', 'Friends')}</span>
            <span className="sm:hidden">{t('friends.short', 'Friends')}</span>
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
              {activitiesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ActivityTable
                  activities={activities}
                  metadata={activitiesMetadata}
                  onPageChange={setActivitiesPage}
                  disabled={false}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recurring Tab */}
        <TabsContent value="recurring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>{t('recurring.myRecurring', 'Recurring Debts')}</span>
                <Badge variant="secondary">{balances.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {debtsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : balances.length === 0 ? (
                <div className="text-center py-8">
                  <RepeatIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">
                    {t('recurring.noRecurring', 'No recurring debts')}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {t('recurring.description', 'Recurring debts are ongoing balances with people you transact with regularly')}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {balances.map((balance) => (
                    <div
                      key={balance.counterparty_id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => go({ to: `/profile/${balance.counterparty_id}` })}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={balance.counterparty_avatar_url || undefined} />
                          <AvatarFallback className="text-sm">
                            {balance.counterparty_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">{balance.counterparty_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={balance.i_owe_them ? "destructive" : "default"} className="text-xs">
                              {balance.i_owe_them ? t('dashboard.youOwe', 'You owe') : t('dashboard.userOwesYou', 'Owes you')}
                            </Badge>
                            {showHistory && balance.transaction_count && (
                              <span className="text-xs text-muted-foreground">
                                {balance.transaction_count} {t('recurring.transactions', 'transactions')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${
                          balance.i_owe_them ? 'text-red-600' : 'text-green-600'
                        }`}>
                          ₫{formatCurrency(Number(balance.amount))}
                        </p>
                        {showHistory && balance.settled_amount && Number(balance.settled_amount) > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {t('recurring.settled', 'Settled')}: ₫{formatCurrency(Number(balance.settled_amount))}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Groups Tab */}
        <TabsContent value="groups" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>{t('groups.myGroups', 'My Groups')}</span>
                <Badge variant="secondary">{myGroups.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {groupsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : myGroups.length === 0 ? (
                <div className="text-center py-8">
                  <UsersIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">
                    {t('groups.noGroups', 'No groups yet')}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => go({ to: "/groups/create" })}
                  >
                    {t('groups.createFirst', 'Create your first group')}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {myGroups.map((group) => (
                    <div
                      key={group.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => go({ to: `/groups/${group.id}` })}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <UsersIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{group.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {t('groups.member', 'Member')}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        {t('common.view', 'View')}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Friends Tab */}
        <TabsContent value="friends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>{t('friends.myFriends', 'My Friends')}</span>
                <Badge variant="secondary">{myFriends.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {friendsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : myFriends.length === 0 ? (
                <div className="text-center py-8">
                  <UserIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">
                    {t('friends.noFriends', 'No friends yet')}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {t('friends.addFriendsHint', 'Add friends to split expenses')}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {myFriends.map((friend) => (
                    <div
                      key={friend.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => go({ to: `/profile/${friend.id}` })}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={friend.avatar_url || undefined} />
                          <AvatarFallback className="text-sm">
                            {friend.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{friend.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {t('friends.friend', 'Friend')}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        {t('common.view', 'View')}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
                setPasswordForm({ newPassword: "", confirmPassword: "" });
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
    </div>
  );
};
