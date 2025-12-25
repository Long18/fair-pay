import { useOne, useUpdate, useGetIdentity } from "@refinedev/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileForm } from "../components/profile-form";
import { Profile, ProfileFormValues } from "../types";
import { toast } from "sonner";

export const ProfileEdit = () => {
  const { data: identity } = useGetIdentity<Profile>();

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

  const { mutate: updateProfile } = useUpdate();

  const { data: profileData } = profileQuery;
  const profile = profileData?.data as Profile | undefined;

  const handleSubmit = (values: ProfileFormValues) => {
    if (!profile?.id) {
      toast.error("Profile not found");
      return;
    }

    updateProfile(
      {
        resource: "profiles",
        id: profile.id,
        values,
      },
      {
        onSuccess: () => {
          toast.success("Profile updated successfully");
        },
        onError: (error: any) => {
          toast.error(`Failed to update profile: ${error.message}`);
        },
      }
    );
  };

  if (!identity?.id || !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-8 bg-background min-h-screen">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback>
                {profile.full_name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>Edit Profile</CardTitle>
              <p className="text-sm text-muted-foreground">
                Update your profile information
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ProfileForm
            onSubmit={handleSubmit}
            defaultValues={{
              full_name: profile.full_name,
              avatar_url: profile.avatar_url || "",
            }}
            isLoading={false}
          />
        </CardContent>
      </Card>
    </div>
  );
};
