export type AppRole = "admin" | "moderator" | "user";

export interface AdminCapabilities {
  canEnterAdmin: boolean;
  canViewOverview: boolean;
  canViewPeople: boolean;
  canEditPeopleBasics: boolean;
  canManagePeople: boolean;
  canViewTransactions: boolean;
  canManageOwnTransactions: boolean;
  canDeleteTransactions: boolean;
  canViewGroups: boolean;
  canManageGroups: boolean;
  canManageReactions: boolean;
  canViewTracking: boolean;
  canViewAuditLogs: boolean;
  canUseDevtool: boolean;
  canViewGrowth: boolean;
  canViewRetention: boolean;
  canModerateContent: boolean;
  /** DevTool page: full tools for admins, moderation-only surface for moderators */
  canAccessDevTool: boolean;
}

const USER_CAPABILITIES: AdminCapabilities = {
  canEnterAdmin: false,
  canViewOverview: false,
  canViewPeople: false,
  canEditPeopleBasics: false,
  canManagePeople: false,
  canViewTransactions: false,
  canManageOwnTransactions: false,
  canDeleteTransactions: false,
  canViewGroups: false,
  canManageGroups: false,
  canManageReactions: false,
  canViewTracking: false,
  canViewAuditLogs: false,
  canUseDevtool: false,
  canViewGrowth: false,
  canViewRetention: false,
  canModerateContent: false,
  canAccessDevTool: false,
};

const MODERATOR_CAPABILITIES: AdminCapabilities = {
  canEnterAdmin: true,
  canViewOverview: true,
  canViewPeople: true,
  canEditPeopleBasics: true,
  canManagePeople: false,
  canViewTransactions: true,
  canManageOwnTransactions: true,
  canDeleteTransactions: false,
  canViewGroups: true,
  canManageGroups: false,
  canManageReactions: true,
  canViewTracking: false,
  canViewAuditLogs: false,
  canUseDevtool: false,
  canViewGrowth: false,
  canViewRetention: false,
  canModerateContent: true,
  canAccessDevTool: true,
};

const ADMIN_CAPABILITIES: AdminCapabilities = {
  canEnterAdmin: true,
  canViewOverview: true,
  canViewPeople: true,
  canEditPeopleBasics: true,
  canManagePeople: true,
  canViewTransactions: true,
  canManageOwnTransactions: true,
  canDeleteTransactions: true,
  canViewGroups: true,
  canManageGroups: true,
  canManageReactions: true,
  canViewTracking: true,
  canViewAuditLogs: true,
  canUseDevtool: true,
  canViewGrowth: true,
  canViewRetention: true,
  canModerateContent: true,
  canAccessDevTool: true,
};

export function normalizeAppRole(role: string | null | undefined): AppRole {
  return role === "admin" || role === "moderator" ? role : "user";
}

export function getAdminCapabilities(role: string | null | undefined): AdminCapabilities {
  switch (normalizeAppRole(role)) {
    case "admin":
      return ADMIN_CAPABILITIES;
    case "moderator":
      return MODERATOR_CAPABILITIES;
    default:
      return USER_CAPABILITIES;
  }
}
