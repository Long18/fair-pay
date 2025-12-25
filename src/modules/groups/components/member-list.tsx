import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { GroupMember } from "../types";
import { Profile } from "@/modules/profile/types";
import { Button } from "@/components/ui/button";
import { Trash2, UserPlus } from "lucide-react";

interface MemberListProps {
  members: (GroupMember & { profile?: Profile })[];
  currentUserId: string;
  isAdmin: boolean;
  onRemoveMember?: (memberId: string) => void;
  onAddMember?: () => void;
  isLoading?: boolean;
}

export const MemberList = ({
  members,
  currentUserId,
  isAdmin,
  onRemoveMember,
  onAddMember,
  isLoading,
}: MemberListProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Members ({members.length})</CardTitle>
          {isAdmin && onAddMember && (
            <Button onClick={onAddMember} size="sm">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>
                    {member.profile?.full_name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">
                    {member.profile?.full_name || "Unknown User"}
                    {member.user_id === currentUserId && (
                      <span className="text-xs text-muted-foreground ml-2">
                        (You)
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Joined{" "}
                    {new Date(member.joined_at).toLocaleDateString("vi-VN")}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={member.role === "admin" ? "default" : "secondary"}>
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
      </CardContent>
    </Card>
  );
};
