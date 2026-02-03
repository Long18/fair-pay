import { useMemo, useState } from "react";
import type { ReactNode } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Profile } from "@/modules/profile/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { CheckIcon, ChevronsUpDownIcon, UserPlusIcon } from "@/components/ui/icons";
const addFriendSchema = z.object({
  userId: z.string().min(1, "Please select a user"),
});

type AddFriendModalProps = {
  trigger?: ReactNode;
};

export const AddFriendModal = ({ trigger }: AddFriendModalProps) => {
  const [open, setOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: identity } = useGetIdentity<Profile>();
  const createMutation = useCreate();

  const form = useForm({
    resolver: zodResolver(addFriendSchema),
    defaultValues: {
      userId: "",
    },
  });

  // Get existing friendships to exclude
  const { query: friendshipsQuery } = useList({
    resource: "friendships",
    pagination: { mode: "off" },
    queryOptions: {
      enabled: !!identity?.id,
    },
  });

  const existingFriendIds = useMemo(() => {
    if (!identity?.id || !friendshipsQuery.data?.data) return new Set<string>();
    const friendships: any[] = friendshipsQuery.data.data;
    const friendIds = new Set<string>();
    friendships.forEach((f) => {
      if (f.user_a === identity.id) friendIds.add(f.user_b);
      if (f.user_b === identity.id) friendIds.add(f.user_a);
    });
    return friendIds;
  }, [friendshipsQuery.data, identity?.id]);

  // Find users by name (auto-fetch when search value changes)
  const { query: profilesQuery } = useList<Profile>({
    resource: "profiles",
    filters: searchValue
      ? [
          {
            field: "full_name",
            operator: "contains",
            value: searchValue,
          },
        ]
      : [],
    pagination: {
      pageSize: 10,
    },
    queryOptions: {
      enabled: popoverOpen && searchValue.length >= 1,
    },
  });

  const availableUsers = useMemo(() => {
    const users = profilesQuery.data?.data || [];
    return users.filter(
      (user) => user.id !== identity?.id && !existingFriendIds.has(user.id)
    );
  }, [profilesQuery.data, identity?.id, existingFriendIds]);

  const userId = form.watch("userId");
  const selectedUser = useMemo(() => {
    if (!userId) return null;
    // Try to find in available users first
    const found = availableUsers.find((u) => u.id === userId);
    if (found) return found;
    // If not in available users, try to fetch from profiles
    // This handles case when user was selected but list refreshed
    return profilesQuery.data?.data?.find((u) => u.id === userId) || null;
  }, [userId, availableUsers, profilesQuery.data]);

  const handleSelectUser = (userId: string) => {
    form.setValue("userId", userId);
    setPopoverOpen(false);
    setSearchValue("");
  };

  const handleSubmit = async (formData: { userId: string }) => {
    if (!identity?.id) {
      toast.error("You must be logged in to add friends");
      return;
    }

    const targetUser = availableUsers.find((u) => u.id === formData.userId);
    if (!targetUser) {
      toast.error("Please select a valid user");
      return;
    }

    // Create friendship with ordered user IDs
    const userA = identity.id < targetUser.id ? identity.id : targetUser.id;
    const userB = identity.id < targetUser.id ? targetUser.id : identity.id;

    setIsSubmitting(true);
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
          setSearchValue("");
          friendshipsQuery.refetch();
          setIsSubmitting(false);
        },
        onError: (error: any) => {
          if (error.message?.includes("duplicate")) {
            toast.error("Friend request already exists");
          } else {
            toast.error(`Failed to send request: ${error.message}`);
          }
          setIsSubmitting(false);
        },
      }
    );
  };

  const handleDialogOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      form.reset();
      setSearchValue("");
      setPopoverOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="lg" className="w-full sm:w-auto">
            <UserPlusIcon className="mr-2 h-5 w-5" />
            Add Friend
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md w-[calc(100vw-2rem)] sm:w-full">
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
              name="userId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Search for Friend</FormLabel>
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
                          {selectedUser ? (
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <Avatar className="h-5 w-5 shrink-0">
                                <AvatarImage src={selectedUser.avatar_url || undefined} alt={selectedUser.full_name} />
                                <AvatarFallback className="text-xs">
                                  {selectedUser.full_name
                                    ?.split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .toUpperCase() || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="truncate">{selectedUser.full_name}</span>
                            </div>
                          ) : (
                            <span>Search by name...</span>
                          )}
                          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                      <Command>
                        <CommandInput
                          placeholder="Type to search users..."
                          value={searchValue}
                          onValueChange={setSearchValue}
                        />
                        <CommandList>
                          <CommandEmpty>
                            {searchValue.length === 0
                              ? "Type to search users..."
                              : "No users found"}
                          </CommandEmpty>
                          <CommandGroup>
                            {availableUsers.map((user) => (
                              <CommandItem
                                key={user.id}
                                value={user.id}
                                onSelect={() => handleSelectUser(user.id)}
                                keywords={user.full_name?.split(" ") || []}
                              >
                                <div className="flex items-center gap-2 w-full min-w-0">
                                  <Avatar className="h-6 w-6 shrink-0">
                                    <AvatarImage src={user.avatar_url || undefined} alt={user.full_name} />
                                    <AvatarFallback className="text-xs">
                                      {user.full_name
                                        ?.split(" ")
                                        .map((n) => n[0])
                                        .join("")
                                        .toUpperCase() || "?"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="flex-1 truncate min-w-0">{user.full_name}</span>
                                  <CheckIcon
                                    className={cn(
                                      "h-4 w-4 shrink-0",
                                      field.value === user.id
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
                    Start typing to search for users by name
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
                disabled={!form.watch("userId") || isSubmitting}
              >
                {isSubmitting ? "Sending..." : "Send Request"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
