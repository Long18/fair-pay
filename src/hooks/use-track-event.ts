// src/hooks/use-track-event.ts
import { useCallback } from 'react';
import { useGetIdentity } from '@refinedev/core';
import { trackEvent, type TrackEventOptions } from '@/lib/analytics/track';
import { setUserDisplay } from '@/lib/analytics/user-display';
import type { Profile } from '@/modules/profile/types';

// Derive role display info from profile data
function getRoleInfo(_profile: Profile | null | undefined): {
  role: string;
  badge: string;
  label: string;
} {
  // Default role - the project uses role from group_members context
  // At global level, treat as 'member' unless otherwise known
  return {
    role: 'member',
    badge: 'member',
    label: 'Member',
  };
}

export function useTrackEvent() {
  const { data: identity } = useGetIdentity<Profile>();

  const track = useCallback(
    (options: TrackEventOptions | string, extraProps?: Record<string, unknown>) => {
      // Always sync user display metadata before tracking
      if (identity?.id) {
        const roleInfo = getRoleInfo(identity);
        setUserDisplay({
          user_id: identity.id,
          user_display_name: identity.full_name || identity.email || 'Unknown',
          user_avatar_url: identity.avatar_url || null,
          user_role: roleInfo.role,
          user_role_badge: roleInfo.badge,
          user_role_label: roleInfo.label,
        });
      }
      trackEvent(options, extraProps);
    },
    [identity]
  );

  return { track };
}
