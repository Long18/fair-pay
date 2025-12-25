import { useState } from "react";
import { useCreate, useList, useGetIdentity } from "@refinedev/core";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UserPlus } from "lucide-react";
import { Profile } from "@/modules/profile/types";
import { toast } from "sonner";

const addFriendSchema = z.object({
  searchTerm: z.string().min(1, "Please enter a name or email to search"),
});

export const AddFriendModal = () => {
  const [open, setOpen] = useState(false);
  const { data: identity } = useGetIdentity<Profile>();
  const createMutation = useCreate();

  const form = useForm({
    resolver: zodResolver(addFriendSchema),
    defaultValues: {
      searchTerm: "",
    },
  });

  // Find user by name (contains search)
  const { query: profilesQuery } = useList<Profile>({
    resource: "profiles",
    filters: [
      {
        field: "full_name",
        operator: "contains",
        value: form.watch("searchTerm"),
      },
    ],
    pagination: {
      pageSize: 10,
    },
    queryOptions: {
      enabled: false, // Don't auto-fetch
    },
  });

  const handleSubmit = async (_formData: { searchTerm: string }) => {
    if (!identity?.id) {
      toast.error("You must be logged in to add friends");
      return;
    }

    // Search for user by name
    const result = await profilesQuery.refetch();
    const users = result.data?.data || [];

    if (users.length === 0) {
      toast.error("No users found with that name");
      return;
    }

    // If multiple results, use first one (could enhance with selection UI)
    const targetUser = users[0];

    if (targetUser.id === identity.id) {
      toast.error("You cannot add yourself as a friend");
      return;
    }

    // Create friendship with ordered user IDs
    const userA = identity.id < targetUser.id ? identity.id : targetUser.id;
    const userB = identity.id < targetUser.id ? targetUser.id : identity.id;

    createMutation.mutate(
      {
        resource: "friendships",
        values: {
          user_a: userA,
          user_b: userB,
          status: "pending",
          created_by: identity.id,
        },
      },
      {
        onSuccess: () => {
          toast.success(`Friend request sent to ${targetUser.full_name}`);
          setOpen(false);
          form.reset();
        },
        onError: (error: any) => {
          if (error.message?.includes("duplicate")) {
            toast.error("Friend request already exists");
          } else {
            toast.error(`Failed to send request: ${error.message}`);
          }
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg">
          <UserPlus className="mr-2 h-5 w-5" />
          Add Friend
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Friend</DialogTitle>
          <DialogDescription>
            Search for a user by name to send them a friend request.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="searchTerm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Search by Name</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Enter friend's name"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    We'll find users matching this name
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                Send Request
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
