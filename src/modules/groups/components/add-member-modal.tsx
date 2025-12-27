import { useState, useMemo } from "react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Check, ChevronsUpDown, UserPlus } from "lucide-react";
import { Profile } from "@/modules/profile/types";
import { Friendship } from "@/modules/friends/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const addMemberSchema = z.object({
  userId: z.string().min(1, "Please select a friend"),
});

interface AddMemberModalProps {
  groupId: string;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const AddMemberModal = ({
  groupId,
  onSuccess,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: AddMemberModalProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const { data: identity } = useGetIdentity<Profile>();
  const createMutation = useCreate();

  const form = useForm({
    resolver: zodResolver(addMemberSchema),
    defaultValues: {
      userId: "",
    },
  });

  // Get existing group members to exclude
  const { query: membersQuery } = useList({
    resource: "group_members",
    filters: [{ field: "group_id", operator: "eq", value: groupId }],
    pagination: { mode: "off" },
  });

  const existingMemberIds = useMemo(() => {
    const members = membersQuery.data?.data || [];
    return new Set(members.map((m: any) => m.user_id));
  }, [membersQuery.data]);

  // Get accepted friendships only
  const { query: friendshipsQuery } = useList<Friendship>({
    resource: "friendships",
    filters: [{ field: "status", operator: "eq", value: "accepted" }],
    meta: {
      select: "*, user_a_profile:profiles!user_a(id, full_name, avatar_url), user_b_profile:profiles!user_b(id, full_name, avatar_url)",
    },
    pagination: { mode: "off" },
    queryOptions: {
      enabled: !!identity?.id,
    },
  });

  // Extract friends from friendships
  const friends = useMemo(() => {
    if (!identity?.id || !friendshipsQuery.data?.data) return [];
    const friendships: any[] = friendshipsQuery.data.data;
    return friendships
      .map((f) => {
        const isUserA = f.user_a === identity.id;
        const friendProfile = isUserA ? f.user_b_profile : f.user_a_profile;
        return friendProfile
          ? {
              id: friendProfile.id,
              full_name: friendProfile.full_name || "Unknown",
              avatar_url: friendProfile.avatar_url,
            }
          : null;
      })
      .filter((f): f is Profile => f !== null);
  }, [friendshipsQuery.data, identity?.id]);

  // Filter out existing members and apply search
  const availableFriends = useMemo(() => {
    return friends.filter(
      (friend) =>
        !existingMemberIds.has(friend.id) &&
        (!searchValue ||
          friend.full_name?.toLowerCase().includes(searchValue.toLowerCase()))
    );
  }, [friends, existingMemberIds, searchValue]);

  const userId = form.watch("userId");
  const selectedFriend = useMemo(() => {
    if (!userId) return null;
    return availableFriends.find((f) => f.id === userId) || null;
  }, [userId, availableFriends]);

  const handleSelectFriend = (friendId: string) => {
    form.setValue("userId", friendId);
    setPopoverOpen(false);
    setSearchValue("");
  };

  const handleDialogOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      form.reset();
      setSearchValue("");
      setPopoverOpen(false);
    }
  };

  const handleSubmit = async (formData: { userId: string }) => {
    if (!identity?.id) {
      toast.error("You must be logged in to add members");
      return;
    }

    const targetFriend = availableFriends.find((f) => f.id === formData.userId);
    if (!targetFriend) {
      toast.error("Please select a valid friend");
      return;
    }

    createMutation.mutate(
      {
        resource: "group_members",
        values: {
          group_id: groupId,
          user_id: formData.userId,
          role: "member",
        },
      },
      {
        onSuccess: () => {
          toast.success(`${targetFriend.full_name} added to group`);
          setOpen(false);
          form.reset();
          setSearchValue("");
          membersQuery.refetch();
          friendshipsQuery.refetch();
          onSuccess?.();
        },
        onError: (error: any) => {
          if (error.message?.includes("duplicate") || error.message?.includes("unique")) {
            toast.error("This user is already a member of the group");
          } else {
            toast.error(`Failed to add member: ${error.message}`);
          }
        },
      }
    );
  };

  const dialogContent = (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Add Member to Group</DialogTitle>
        <DialogDescription>
          Select a friend to add to this group. Only accepted friends are shown.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="userId"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Select Friend</FormLabel>
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "w-full justify-between",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {selectedFriend ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-xs">
                                {selectedFriend.full_name
                                  ?.split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <span>{selectedFriend.full_name}</span>
                          </div>
                        ) : (
                          <span>Search friends...</span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[var(--radix-popover-trigger-width)] p-0"
                    align="start"
                  >
                    <Command>
                      <CommandInput
                        placeholder="Type to search friends..."
                        value={searchValue}
                        onValueChange={setSearchValue}
                      />
                      <CommandList>
                        <CommandEmpty>
                          {searchValue.length === 0
                            ? "Type to search friends..."
                            : availableFriends.length === 0 && friends.length > 0
                            ? "All friends are already in this group"
                            : "No friends found"}
                        </CommandEmpty>
                        <CommandGroup>
                          {availableFriends.map((friend) => (
                            <CommandItem
                              key={friend.id}
                              value={friend.id}
                              onSelect={() => handleSelectFriend(friend.id)}
                              keywords={friend.full_name?.split(" ") || []}
                            >
                              <div className="flex items-center gap-2 w-full">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-xs">
                                    {friend.full_name
                                      ?.split(" ")
                                      .map((n) => n[0])
                                      .join("")
                                      .toUpperCase() || "?"}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="flex-1">{friend.full_name}</span>
                                <Check
                                  className={cn(
                                    "h-4 w-4",
                                    field.value === friend.id
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  Only accepted friends can be added to groups
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                form.reset();
                setSearchValue("");
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={!form.watch("userId") || createMutation.isPending}
            >
              {createMutation.isPending ? "Adding..." : "Add Member"}
            </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  );

  // If controlled mode (open prop provided), don't render DialogTrigger
  if (controlledOpen !== undefined) {
    return (
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        {dialogContent}
      </Dialog>
    );
  }

  // Uncontrolled mode: render with DialogTrigger
  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Member
          </Button>
        )}
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
};
