import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState, useEffect, useRef } from "react";
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
  Users2Icon,
  CameraIcon,
  Loader2Icon,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabaseClient } from "@/utility/supabaseClient";

const groupSchema = z.object({
  name: z.string().min(1, "Group name is required").max(100, "Name is too long"),
  description: z.string().max(500, "Description is too long").optional(),
  simplify_debts: z.boolean().optional(),
  member_ids: z.array(z.string().uuid()).optional(),
  avatar_url: z.string().optional(),
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
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    defaultValues?.avatar_url || null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      description: defaultValues?.description || "",
      simplify_debts: defaultValues?.simplify_debts || false,
      member_ids: defaultValues?.member_ids || [],
      avatar_url: defaultValues?.avatar_url || "",
    },
  });

  const nameValue = form.watch("name");

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

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);

    setIsUploadingAvatar(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `groups/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabaseClient.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabaseClient.storage
        .from("avatars")
        .getPublicUrl(filePath);

      form.setValue("avatar_url", publicUrl);
      setAvatarPreview(publicUrl);
      toast.success("Avatar uploaded");
    } catch (error) {
      console.error("Group avatar upload error:", error);
      toast.error("Failed to upload avatar");
      setAvatarPreview(defaultValues?.avatar_url || null);
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <TooltipProvider>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Avatar + Name Section */}
          <Card className="border-2">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <FileTextIcon className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Basic Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Group Avatar */}
              <div className="flex justify-center">
                <div className="relative">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    disabled={isUploadingAvatar}
                  />
                  <Avatar
                    className={cn(
                      "h-20 w-20 cursor-pointer border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors",
                      isUploadingAvatar && "opacity-50"
                    )}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <AvatarImage src={avatarPreview || undefined} />
                    <AvatarFallback className="text-lg bg-primary/5 text-primary">
                      {nameValue ? getInitials(nameValue) : <Users2Icon className="h-8 w-8 text-muted-foreground" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 rounded-full bg-primary text-primary-foreground p-1.5 shadow-sm">
                    {isUploadingAvatar ? (
                      <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CameraIcon className="h-3.5 w-3.5" />
                    )}
                  </div>
                </div>
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="font-semibold">
                        Group Name <span className="text-destructive">*</span>
                      </FormLabel>
                      <span className="text-xs text-muted-foreground">
                        {nameValue?.length || 0}/100
                      </span>
                    </div>
                    <FormControl>
                      <Input placeholder="e.g., Weekend Trip, Roommates" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="What's this group for?"
                        className="resize-none min-h-[80px]"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Settings */}
          <Card className="border-2">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <SparklesIcon className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Settings</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="simplify_debts"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between gap-4 rounded-lg border p-4 bg-accent/30">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <FormLabel className="font-semibold cursor-pointer">
                            Simplify Debts
                          </FormLabel>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircleIcon className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-xs">
                                Minimizes transactions needed to settle debts.
                                E.g., if A owes B and B owes C the same amount,
                                A pays C directly instead.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <FormDescription className="text-xs">
                          Reduce the number of payments needed to settle up
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Members */}
          <Card className="border-2">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UsersIcon className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Members</CardTitle>
                </div>
                {selectedMemberIds.length > 0 && (
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    {selectedMemberIds.length} {selectedMemberIds.length === 1 ? "member" : "members"}
                  </Badge>
                )}
              </div>
              <CardDescription>
                Add friends to your group. You can add more later.
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
                    <div className="flex flex-wrap gap-2 pt-2">
                      {selectedMembers.map((member) => (
                        <Badge
                          key={member.id}
                          variant="secondary"
                          className="flex items-center gap-2 px-3 py-2 h-auto"
                        >
                          <Avatar className="h-5 w-5 shrink-0">
                            <AvatarImage src={member.avatar_url || undefined} alt={member.full_name} />
                            <AvatarFallback className="text-[10px]">
                              {getInitials(member.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{member.full_name}</span>
                          {member.id === currentUserId && (
                            <span className="text-xs text-muted-foreground">(You)</span>
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
                  )}
                </>
              ) : (
                <div className="text-center py-6 border-2 border-dashed rounded-lg bg-muted/30">
                  <UsersIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                  <p className="text-sm text-muted-foreground">No friends available</p>
                  <p className="text-xs text-muted-foreground">Add friends first to create a group</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              type="submit"
              disabled={isLoading || isUploadingAvatar}
              className="min-w-[120px]"
            >
              {isLoading ? (
                <>
                  <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Group"
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              You'll be automatically added as an admin
            </p>
          </div>
        </form>
      </Form>
    </TooltipProvider>
  );
};
