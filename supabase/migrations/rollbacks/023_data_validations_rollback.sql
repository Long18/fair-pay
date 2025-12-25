-- Rollback: 023_data_validations.sql
-- Removes all data validation triggers and functions

BEGIN;

-- ========================================
-- Part 1: Drop All Validation Triggers
-- ========================================

DROP TRIGGER IF EXISTS trigger_validate_expense_amount ON expenses;
DROP TRIGGER IF EXISTS trigger_validate_payment_amount ON payments;
DROP TRIGGER IF EXISTS trigger_validate_expense_currency ON expenses;
DROP TRIGGER IF EXISTS trigger_validate_payment_currency ON payments;
DROP TRIGGER IF EXISTS trigger_validate_expense_date ON expenses;
DROP TRIGGER IF EXISTS trigger_validate_payment_date ON payments;
DROP TRIGGER IF EXISTS trigger_validate_expense_context ON expenses;
DROP TRIGGER IF EXISTS trigger_validate_expense_description ON expenses;
DROP TRIGGER IF EXISTS trigger_validate_split_method ON expense_splits;
DROP TRIGGER IF EXISTS trigger_prevent_self_payment ON payments;

-- Drop commented-out trigger (if it was uncommented)
DROP TRIGGER IF EXISTS trigger_validate_expense_splits ON expense_splits;

-- ========================================
-- Part 2: Drop All Validation Functions
-- ========================================

DROP FUNCTION IF EXISTS validate_expense_amount();
DROP FUNCTION IF EXISTS validate_payment_amount();
DROP FUNCTION IF EXISTS validate_expense_splits();
DROP FUNCTION IF EXISTS validate_currency_code();
DROP FUNCTION IF EXISTS validate_date_not_future();
DROP FUNCTION IF EXISTS validate_expense_context();
DROP FUNCTION IF EXISTS validate_description();
DROP FUNCTION IF EXISTS validate_split_method();
DROP FUNCTION IF EXISTS prevent_self_payment();

COMMIT;

-- Note: After rollback, the following validations will NO LONGER be enforced:
-- - Expense/payment amount limits
-- - Currency code validation
-- - Date range validation
-- - Context consistency checks
-- - Description requirements
-- - Split method validation
-- - Self-payment prevention
--
-- The application must handle these validations on the frontend only
