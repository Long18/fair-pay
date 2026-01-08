import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MemberCombobox, type Member } from "@/components/ui/member-combobox";
import { GroupFormValues } from "../types";
import {
  XIcon,
  UsersIcon,
  FileTextIcon,
  SparklesIcon,
  HelpCircleIcon,
  UserPlusIcon,
  Users2Icon
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";

const groupSchema = z.object({
  name: z.string().min(1, "Group name is required").max(100, "Name is too long"),
  description: z.string().max(500, "Description is too long").optional(),
  simplify_debts: z.boolean().optional(),
  member_ids: z.array(z.string().uuid()).optional(),
});

interface ExtendedMember extends Member {
  avatar_url?: string | null;
}

interface GroupFormProps {
  onSubmit: (values: GroupFormValues) => void;
  defaultValues?: Partial<GroupFormValues>;
  isLoading?: boolean;
  availableMembers?: ExtendedMember[];
  currentUserId?: string;
}

export const GroupForm = ({
  onSubmit,
  defaultValues,
  isLoading,
  availableMembers = [],
  currentUserId,
}: GroupFormProps) => {
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(
    defaultValues?.member_ids || []
  );

  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      description: defaultValues?.description || "",
      simplify_debts: defaultValues?.simplify_debts || false,
      member_ids: defaultValues?.member_ids || [],
    },
  });

  const nameValue = form.watch("name");
  const descriptionValue = form.watch("description");

  useEffect(() => {
    form.setValue("member_ids", selectedMemberIds);
  }, [selectedMemberIds, form]);

  const handleAddMember = (memberId: string) => {
    if (!selectedMemberIds.includes(memberId)) {
      setSelectedMemberIds([...selectedMemberIds, memberId]);
    }
  };

  const handleRemoveMember = (memberId: string) => {
    setSelectedMemberIds(selectedMemberIds.filter((id) => id !== memberId));
  };

  const selectedMembers = availableMembers.filter((m) =>
    selectedMemberIds.includes(m.id)
  );

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";
  };

  return (
    <TooltipProvider>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information Section */}
          <Card className="border-2">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <FileTextIcon className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Basic Information</CardTitle>
              </div>
              <CardDescription>
                Provide a name and optional description for your group
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-base font-semibold flex items-center gap-2">
                        <Users2Icon className="h-4 w-4" />
                        Group Name
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <span className="text-xs text-muted-foreground">
                        {nameValue?.length || 0}/100
                      </span>
                    </div>
                    <FormControl>
                      <Input
                        placeholder="e.g., Weekend Trip, Roommates, Family"
                        className="h-11"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Choose a memorable name that everyone will recognize
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-base font-semibold flex items-center gap-2">
                        <FileTextIcon className="h-4 w-4" />
                        Description
                      </FormLabel>
                      <span className="text-xs text-muted-foreground">
                        {descriptionValue?.length || 0}/500
                      </span>
                    </div>
                    <FormControl>
                      <Textarea
                        placeholder="Optional: Add details about the group's purpose, activities, or any special notes..."
                        className="resize-none min-h-[100px]"
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Help others understand what this group is for
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Settings Section */}
          <Card className="border-2">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <SparklesIcon className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Group Settings</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="simplify_debts"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-lg border-2 p-5 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 hover:from-primary/10 hover:via-primary/15 hover:to-primary/10 transition-colors">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <FormLabel className="text-base font-semibold cursor-pointer">
                            Simplify Debts
                          </FormLabel>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircleIcon className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="font-semibold mb-1">What is debt simplification?</p>
                              <p className="text-xs">
                                Automatically minimizes the number of transactions needed to settle all debts.
                                For example, if A owes B $20 and B owes C $20, the system will suggest A pays C directly ($20) instead of two separate transactions.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <FormDescription className="text-sm leading-relaxed">
                          Automatically minimize the number of transactions needed to settle all debts.
                          This makes settling up faster and more efficient.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="shrink-0"
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Members Section */}
          <Card className="border-2">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UsersIcon className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Group Members</CardTitle>
                </div>
                {selectedMemberIds.length > 0 && (
                  <Badge variant="secondary" className="text-sm font-medium px-3 py-1">
                    {selectedMemberIds.length} {selectedMemberIds.length === 1 ? 'member' : 'members'}
                  </Badge>
                )}
              </div>
              <CardDescription>
                Add friends to your group. You can add more members later.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {availableMembers.length > 0 ? (
                <>
                  <div className="space-y-2">
                    <FormLabel className="text-sm font-medium flex items-center gap-2">
                      <UserPlusIcon className="h-4 w-4" />
                      Add Members
                    </FormLabel>
                    <MemberCombobox
                      members={availableMembers}
                      selectedIds={selectedMemberIds}
                      onSelect={handleAddMember}
                      placeholder="Search and add members..."
                      emptyMessage="All friends are already added"
                      currentUserId={currentUserId}
                    />
                  </div>

                  {selectedMembers.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <FormLabel className="text-sm font-medium">Selected Members</FormLabel>
                      <div className="flex flex-wrap gap-2.5">
                        {selectedMembers.map((member) => (
                          <Badge
                            key={member.id}
                            variant="secondary"
                            className={cn(
                              "flex items-center gap-2 px-3 py-2 h-auto",
                              "bg-secondary/80 hover:bg-secondary border",
                              "transition-all duration-200"
                            )}
                          >
                            <Avatar className="h-5 w-5 shrink-0">
                              <AvatarImage
                                src={member.avatar_url || undefined}
                                alt={member.full_name}
                              />
                              <AvatarFallback className="text-[10px] font-medium">
                                {getInitials(member.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">{member.full_name}</span>
                            {member.id === currentUserId && (
                              <span className="text-xs text-muted-foreground font-normal">(You)</span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(member.id)}
                              className="ml-1 hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
                              aria-label={`Remove ${member.full_name}`}
                            >
                              <XIcon className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 border-2 border-dashed rounded-lg bg-muted/30">
                  <UsersIcon className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    No friends available
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Add friends first to create a group
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto sm:min-w-[140px] h-11 text-base font-semibold"
              size="lg"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Saving...
                </>
              ) : (
                "Save Group"
              )}
            </Button>
            <p className="text-xs text-muted-foreground self-center sm:self-auto">
              You'll be automatically added as an admin
            </p>
          </div>
        </form>
      </Form>
    </TooltipProvider>
  );
};
