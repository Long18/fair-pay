import { useEffect, useMemo, useState } from "react";
import { useGo, useGetIdentity, useList } from "@refinedev/core";
import { useInstantCreate } from "@/hooks/use-instant-mutation";
import { ResponsiveDialog } from "@/components/refine-ui/responsive-dialog";
import { GroupForm } from "../components/group-form";
import { GroupFormValues } from "../types";
import { Profile } from "@/modules/profile/types";
import { Friendship } from "@/modules/friends/types";
import { toast } from "sonner";
import { supabaseClient } from "@/utility/supabaseClient";
import { journeyTracking } from "@/lib/journey-tracking";

export const GroupCreate = () => {
  const go = useGo();
  const createMutation = useInstantCreate();
  const { data: identity } = useGetIdentity<Profile>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    journeyTracking.trackFormView("group-create", "details");
  }, []);

  // Fetch all user's friends
  const { query: allFriendsQuery } = useList<Friendship>({
    resource: "friendships",
    filters: [
      {
        field: "status",
        operator: "eq",
        value: "accepted",
      },
    ],
    meta: {
      select: "*, user_a_profile:profiles!user_a(id, full_name, avatar_url), user_b_profile:profiles!user_b(id, full_name, avatar_url)",
    },
    pagination: {
      mode: "off",
    },
    queryOptions: {
      enabled: !!identity?.id,
    },
  });

  // Extract all friends from friendships
  const availableMembers = useMemo(() => {
    if (!allFriendsQuery.data?.data || !identity?.id) return [];

    return allFriendsQuery.data.data.map((friendship: any) => {
      const isUserA = friendship.user_a === identity.id;
      const friendProfile = isUserA ? friendship.user_b_profile : friendship.user_a_profile;
      const friendId = isUserA ? friendship.user_b : friendship.user_a;

      return {
        id: friendId,
        full_name: friendProfile?.full_name || "Friend",
        avatar_url: friendProfile?.avatar_url || null,
      };
    });
  }, [allFriendsQuery.data, identity]);

  const handleSubmit = async (values: GroupFormValues) => {
    if (!identity?.id) {
      toast.error("User identity not found. Please try logging in again.");
      return;
    }

    setIsSubmitting(true);
    const { member_ids, ...groupData } = values;
    journeyTracking.trackEvent({
      event_name: "form_submit",
      event_category: "group",
      page_path: window.location.pathname,
      target_type: "form",
      target_key: "group:create:submit",
      flow_name: "group-create",
      step_name: "details",
      properties: {
        member_count: member_ids?.length ?? 0,
      },
    });

    createMutation.mutate(
      {
        resource: "groups",
        values: {
          ...groupData,
          created_by: identity.id,
        },
      },
      {
        onSuccess: async (data) => {
          const groupId = data.data.id as string;

          // Create group members (creator is automatically added as admin by trigger)
          if (member_ids && member_ids.length > 0) {
            const memberPromises = member_ids.map((userId) =>
              supabaseClient.from("group_members").insert({
                group_id: groupId,
                user_id: userId,
                role: "member",
              })
            );

            try {
              await Promise.all(memberPromises);
            } catch (error: any) {
              console.error("Failed to add some members:", error);
              // Continue even if some members fail (e.g., duplicates)
            }
          }

          toast.success("Group created successfully");
          journeyTracking.trackEvent({
            event_name: "form_success",
            event_category: "group",
            page_path: window.location.pathname,
            target_type: "form",
            target_key: "group:create:submit",
            flow_name: "group-create",
            step_name: "details",
            properties: {
              entity_id: groupId,
              entity_type: "group",
              entity_path: `/groups/show/${groupId}`,
              member_count: member_ids?.length ?? 0,
            },
          });
          go({ to: `/groups/show/${groupId}` });
        },
        onError: (error) => {
          journeyTracking.trackEvent({
            event_name: "form_error",
            event_category: "group",
            page_path: window.location.pathname,
            target_type: "form",
            target_key: "group:create:submit",
            flow_name: "group-create",
            step_name: "details",
            properties: {
              reason: "server_error",
            },
          });
          toast.error(`Failed to create group: ${error.message}`);
          setIsSubmitting(false);
        },
      }
    );
  };

  const handleClose = () => {
    go({ to: "/groups" });
  };

  return (
    <ResponsiveDialog
      open={true}
      onOpenChange={handleClose}
      title="Create New Group"
      description="Create a group to share expenses with friends"
      className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
    >
      <div className="space-y-6 py-4">
        <GroupForm
          onSubmit={handleSubmit}
          isLoading={isSubmitting}
          availableMembers={availableMembers}
          currentUserId={identity?.id}
        />
      </div>
    </ResponsiveDialog>
  );
};
