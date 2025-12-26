-- Rollback Migration: Remove Auto-Create Friendships for Group Members
-- Purpose: Rollback the automatic friendship creation feature
-- Date: 2025-12-27
-- Rolls back: 006_auto_friend_group_members.sql

-- Remove the trigger
DROP TRIGGER IF EXISTS trigger_auto_create_friendships ON group_members;

-- Remove the function
DROP FUNCTION IF EXISTS auto_create_friendships_from_group();

-- Note: This does NOT remove friendships that were already created
-- If you need to clean up auto-created friendships, you would need to:
-- 1. Identify friendships created by the trigger (created_by matches a group member)
-- 2. Manually delete them if needed
-- However, this is typically not recommended as users may have come to rely on these friendships
