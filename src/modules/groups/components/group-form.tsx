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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { MemberCombobox, type Member } from "@/components/ui/member-combobox";
import { GroupFormValues } from "../types";
import { XIcon } from "@/components/ui/icons";

const groupSchema = z.object({
  name: z.string().min(1, "Group name is required").max(100, "Name is too long"),
  description: z.string().max(500, "Description is too long").optional(),
  simplify_debts: z.boolean().optional(),
  member_ids: z.array(z.string().uuid()).optional(),
});

interface GroupFormProps {
  onSubmit: (values: GroupFormValues) => void;
  defaultValues?: Partial<GroupFormValues>;
  isLoading?: boolean;
  availableMembers?: Member[];
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Group Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Weekend Trip" {...field} />
              </FormControl>
              <FormDescription>
                A short name to identify this group.
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
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Optional description of the group..."
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Add more details about what this group is for.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="simplify_debts"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Simplify Debts</FormLabel>
                <FormDescription>
                  Automatically minimize the number of transactions needed to settle all debts.
                  For example, if A owes B $20 and B owes C $20, the system will suggest A pays C directly.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <Separator />

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="members" className="border-none">
            <AccordionTrigger className="text-sm font-medium py-2">
              Add Members ({selectedMemberIds.length} selected)
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <FormDescription>
                Select friends to add to this group. You can add more members later.
              </FormDescription>

              {availableMembers.length > 0 ? (
                <>
                  <MemberCombobox
                    members={availableMembers}
                    selectedIds={selectedMemberIds}
                    onSelect={handleAddMember}
                    placeholder="Search and add members..."
                    emptyMessage="All friends are already added"
                    currentUserId={currentUserId}
                  />

                  {selectedMembers.length > 0 && (
                    <div className="space-y-2">
                      <FormLabel className="text-sm">Selected Members</FormLabel>
                      <div className="flex flex-wrap gap-2">
                        {selectedMembers.map((member) => (
                          <Badge
                            key={member.id}
                            variant="secondary"
                            className="flex items-center gap-1 px-2 py-1"
                          >
                            <span>{member.full_name}</span>
                            {member.id === currentUserId && (
                              <span className="text-xs text-muted-foreground">(You)</span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(member.id)}
                              className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                              aria-label={`Remove ${member.full_name}`}
                            >
                              <XIcon className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No friends available. Add friends first to create a group.
                </p>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
          {isLoading ? "Saving..." : "Save Group"}
        </Button>
      </form>
    </Form>
  );
};
