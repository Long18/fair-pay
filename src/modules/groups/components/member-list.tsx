import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { GroupMember } from "../types";
import { Profile } from "@/modules/profile/types";
import { Button } from "@/components/ui/button";
import { MemberCard } from "./member-card";
import { PaginationControls, PaginationMetadata } from "@/components/ui/pagination-controls";
import { SearchIcon, UserPlusIcon, UsersIcon } from "@/components/ui/icons";
import { useHaptics } from "@/hooks/use-haptics";

interface MemberStats {
  expense_count: number;
  total_paid: number;
}

interface MemberListProps {
  members: (GroupMember & { profile?: Profile })[];
  currentUserId: string;
  creatorId?: string;
  isAdmin: boolean;
  onRemoveMember?: (memberId: string) => void;
  onToggleRole?: (memberId: string, currentRole: string) => void;
  onAddMember?: () => void;
  isLoading?: boolean;
  paginationMetadata?: PaginationMetadata;
  onPageChange?: (page: number) => void;
  showPagination?: boolean;
  showStats?: boolean;
  memberStats?: Record<string, MemberStats>;
  showHeader?: boolean;
  /** Group context — passed to MemberCard so each member's group affiliation popover excludes the current group. */
  currentGroupId?: string;
}

export const MemberList = ({
  members,
  currentUserId,
  creatorId,
  isAdmin,
  onRemoveMember,
  onToggleRole,
  onAddMember,
  isLoading,
  paginationMetadata,
  onPageChange,
  showPagination = true,
  showStats = false,
  memberStats,
  showHeader = true,
  currentGroupId,
}: MemberListProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const { tap } = useHaptics();

  // Filter members based on search
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;

    const query = searchQuery.toLowerCase();
    return members.filter(
      (m) =>
        m.profile?.full_name?.toLowerCase().includes(query) ||
        m.profile?.email?.toLowerCase().includes(query)
    );
  }, [members, searchQuery]);

  // Sort: admins first, then by name
  const sortedMembers = useMemo(() => {
    return [...filteredMembers].sort((a, b) => {
      // Current user first
      if (a.user_id === currentUserId) return -1;
      if (b.user_id === currentUserId) return 1;

      // Admins before members
      if (a.role === "admin" && b.role !== "admin") return -1;
      if (a.role !== "admin" && b.role === "admin") return 1;

      // Alphabetical by name
      return (a.profile?.full_name || "").localeCompare(
        b.profile?.full_name || ""
      );
    });
  }, [filteredMembers, currentUserId]);

  const content = (
    <>
      {/* Search (show for 8+ members) */}
      {members.length >= 8 && (
        <div className="mb-4">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      )}

      {/* Member List */}
      <div className="space-y-2">
        {sortedMembers.map((member) => (
          <MemberCard
            key={member.id}
            member={member}
            currentUserId={currentUserId}
            creatorId={creatorId}
            isAdmin={isAdmin}
            stats={memberStats?.[member.user_id]}
            onRemoveMember={onRemoveMember}
            onToggleRole={onToggleRole}
            isLoading={isLoading}
            showStats={showStats}
            currentGroupId={currentGroupId}
          />
        ))}

        {/* No Results */}
        {sortedMembers.length === 0 && searchQuery && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No members found matching "{searchQuery}"</p>
            <Button
              variant="link"
              size="sm"
              onClick={() => { tap(); setSearchQuery(""); }}
              className="mt-2"
            >
              Clear search
            </Button>
          </div>
        )}

        {/* Empty State */}
        {members.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <UsersIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No members yet</p>
          </div>
        )}
      </div>

      {/* Pagination (legacy support) */}
      {showPagination &&
        paginationMetadata &&
        onPageChange &&
        paginationMetadata.totalPages > 1 && (
          <div className="mt-4 pt-4 border-t">
            <PaginationControls
              metadata={paginationMetadata}
              onPageChange={onPageChange}
            />
          </div>
        )}
    </>
  );

  if (!showHeader) {
    return content;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <UsersIcon className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg sm:text-xl">Members</CardTitle>
            <Badge variant="secondary">
              {paginationMetadata?.totalItems ?? members.length}
            </Badge>
          </div>
          {isAdmin && onAddMember && (
            <Button onClick={() => { tap(); onAddMember?.(); }} size="sm" className="w-full sm:w-auto">
              <UserPlusIcon className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
};
