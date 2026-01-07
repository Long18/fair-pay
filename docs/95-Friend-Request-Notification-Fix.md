# Friend Request Notification Fix

## Date: 2026-01-07

## Problem Analysis

Users reported that when they send a friend request, the recipient doesn't receive any notification and must manually navigate to the Friends page to see pending requests.

### Root Causes

1. **Missing Database Trigger**: No trigger existed to automatically create notifications when a friend request is inserted into the `friendships` table
2. **Missing Column**: The `notifications` table was missing the `related_id` column needed to link notifications to their related entities (friendships, expenses, etc.)

## Solution Details

### 1. Database Schema Update

Added `related_id` column to the `notifications` table to link notifications to their source entities:

```sql
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS related_id UUID;
```

### 2. Notification Trigger Implementation

Created a PostgreSQL function and trigger to automatically create notifications when friend requests are sent:

```sql
CREATE OR REPLACE FUNCTION notify_friend_request()
RETURNS TRIGGER AS $$
DECLARE
  v_recipient_id UUID;
  v_requester_id UUID;
  v_requester_name TEXT;
  v_notify_enabled BOOLEAN;
BEGIN
  -- Only create notification for pending friend requests
  IF NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;

  -- Determine recipient (the user who did NOT create the request)
  v_requester_id := NEW.created_by;

  IF NEW.user_a = v_requester_id THEN
    v_recipient_id := NEW.user_b;
  ELSE
    v_recipient_id := NEW.user_a;
  END IF;

  -- Get requester's full name
  SELECT full_name INTO v_requester_name
  FROM profiles
  WHERE id = v_requester_id;

  -- Check if recipient has notifications enabled
  SELECT COALESCE(notify_on_friend_request, TRUE) INTO v_notify_enabled
  FROM user_settings
  WHERE user_id = v_recipient_id;

  -- Create notification if enabled
  IF v_notify_enabled != FALSE THEN
    INSERT INTO notifications (
      user_id, type, title, message, link, related_id, is_read
    ) VALUES (
      v_recipient_id,
      'friend_request',
      v_requester_name || ' sent you a friend request',
      'Accept or reject this request on the Friends page',
      '/friends',
      NEW.id,
      FALSE
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_friend_request
  AFTER INSERT ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION notify_friend_request();
```

## Files Changed

1. **supabase/migrations/20260107175703_friend_request_notifications.sql** - New migration file
2. **supabase/baseline.sql** - Updated to include the related_id column and notification trigger

## Testing Checklist

- [ ] Friend request creates notification for recipient
- [ ] Notification appears in header NotificationPanel
- [ ] Notification respects user's `notify_on_friend_request` setting
- [ ] Clicking notification navigates to /friends page
- [ ] Notification is marked as read when clicked
- [ ] Test passes: `tests/database/notifications.test.ts`

## Production Deployment

### Step 1: Apply Migration to Production

```bash
# Connect to production Supabase
npx supabase db push --db-url "postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres"

# Or via Supabase Dashboard:
# 1. Go to SQL Editor in Supabase Dashboard
# 2. Run the migration SQL from 20260107175703_friend_request_notifications.sql
```

### Step 2: Verify in Production

1. Create a friend request between two users
2. Check that recipient receives notification
3. Verify notification appears in UI
4. Test clicking notification navigates to Friends page

## Prevention Strategies

1. **Test Coverage**: Ensure all database triggers have corresponding tests
2. **Schema Validation**: Check that all required columns exist before using them in triggers
3. **Documentation**: Document all notification types and their trigger conditions
4. **Migration Testing**: Always test migrations locally before deploying to production

## Additional Notes

- The `related_id` column can be used for other notification types to link to their source entities
- The trigger respects user notification preferences from the `user_settings` table
- The notification includes the requester's full name for a better user experience
