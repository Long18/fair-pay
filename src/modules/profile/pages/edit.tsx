import { useOne, useUpdate } from "@refinedev/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileForm } from "../components/profile-form";
import { Profile, ProfileFormValues } from "../types";
import { toast } from "sonner";
import { useEffect } from "react";

export const ProfileEdit = () => {
  const { query: identityQuery } = useOne({
    resource: "profiles",
    id: "", // Will be set by useOne automatically from auth context
    meta: {
      select: "*",
    },
  });

  const updateMutation = useUpdate();

  const { data: identity } = identityQuery;
  const profile = identity?.data as Profile | undefined;

  const handleSubmit = (values: ProfileFormValues) => {
    if (!profile?.id) {
      toast.error("Profile not found");
      return;
    }

    updateMutation.mutate(
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

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-8">
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
