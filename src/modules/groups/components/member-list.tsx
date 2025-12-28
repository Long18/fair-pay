import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { GroupMember } from "../types";
import { Profile } from "@/modules/profile/types";
import { Button } from "@/components/ui/button";
import { Trash2, UserPlus } from "lucide-react";
import { formatDateShort } from "@/lib/locale-utils";
import { PaginationControls, PaginationMetadata } from "@/components/ui/pagination-controls";

interface MemberListProps {
  members: (GroupMember & { profile?: Profile })[];
  currentUserId: string;
  isAdmin: boolean;
  onRemoveMember?: (memberId: string) => void;
  onAddMember?: () => void;
  isLoading?: boolean;
  paginationMetadata?: PaginationMetadata;
  onPageChange?: (page: number) => void;
}

export const MemberList = ({
  members,
  currentUserId,
  isAdmin,
  onRemoveMember,
  onAddMember,
  isLoading,
  paginationMetadata,
  onPageChange,
}: MemberListProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="text-lg sm:text-xl">
            Members ({paginationMetadata?.totalItems ?? members.length})
          </CardTitle>
          {isAdmin && onAddMember && (
            <Button onClick={onAddMember} size="sm" className="w-full sm:w-auto">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 sm:space-y-4">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 border rounded-lg gap-2"
            >
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <Avatar className="h-8 w-8 sm:h-10 sm:w-10 shrink-0">
                  <AvatarImage src={member.profile?.avatar_url || undefined} alt={member.profile?.full_name} />
                  <AvatarFallback className="text-xs sm:text-sm">
                    {member.profile?.full_name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm sm:text-base truncate">
                    {member.profile?.full_name || "Unknown User"}
                    {member.user_id === currentUserId && (
                      <span className="text-xs text-muted-foreground ml-2">
                        (You)
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Joined{" "}
                    {formatDateShort(member.joined_at)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                <Badge variant={member.role === "admin" ? "default" : "secondary"} className="text-xs">
                  {member.role}
                </Badge>
                {isAdmin &&
                  onRemoveMember &&
                  member.user_id !== currentUserId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveMember(member.id)}
                      disabled={isLoading}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
              </div>
            </div>
          ))}
          {members.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No members yet
            </div>
          )}
        </div>
        {paginationMetadata && onPageChange && paginationMetadata.totalPages > 1 && (
          <div className="mt-4 pt-4 border-t">
            <PaginationControls
              metadata={paginationMetadata}
              onPageChange={onPageChange}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
