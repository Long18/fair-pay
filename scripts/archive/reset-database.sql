-- Reset and Seed Database with Fresh Test Data
-- This SQL script clears all test data and creates fresh template data

-- Step 1: Clear all test data (in correct order to respect foreign keys)
DELETE FROM expense_splits WHERE TRUE;
DELETE FROM payments WHERE TRUE;
DELETE FROM expenses WHERE TRUE;
DELETE FROM group_members WHERE TRUE;
DELETE FROM friendships WHERE TRUE;
DELETE FROM groups WHERE TRUE;

-- Note: We keep profiles/users as they come from auth

SELECT 'Test data cleared successfully' AS status;
