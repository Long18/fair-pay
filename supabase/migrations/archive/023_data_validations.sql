-- Migration: Data Validation Functions and Triggers
-- Description: Add validation rules to ensure data integrity at database level
-- Date: 2025-12-26
-- Dependencies: 022_soft_deletes.sql

BEGIN;

-- ========================================
-- Part 1: Expense Amount Validation
-- ========================================

-- Function to validate expense amount
CREATE OR REPLACE FUNCTION validate_expense_amount()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if amount is positive
  IF NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Expense amount must be positive, got: %', NEW.amount;
  END IF;

  -- Check if amount is reasonable (not too large)
  IF NEW.amount > 999999999.99 THEN
    RAISE EXCEPTION 'Expense amount too large (maximum 999,999,999.99), got: %', NEW.amount;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for expense amount validation
DROP TRIGGER IF EXISTS trigger_validate_expense_amount ON expenses;
CREATE TRIGGER trigger_validate_expense_amount
  BEFORE INSERT OR UPDATE OF amount ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION validate_expense_amount();

-- ========================================
-- Part 2: Payment Amount Validation
-- ========================================

-- Function to validate payment amount
CREATE OR REPLACE FUNCTION validate_payment_amount()
RETURNS TRIGGER AS $$
DECLARE
  v_current_debt DECIMAL(12, 2);
BEGIN
  -- Check if amount is positive
  IF NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be positive, got: %', NEW.amount;
  END IF;

  -- Check if amount is reasonable
  IF NEW.amount > 999999999.99 THEN
    RAISE EXCEPTION 'Payment amount too large (maximum 999,999,999.99), got: %', NEW.amount;
  END IF;

  -- Calculate current debt (simplified check)
  -- Note: This is a soft warning, we allow overpayment for flexibility
  IF NEW.group_id IS NOT NULL THEN
    SELECT COALESCE(SUM(es.computed_amount), 0)
    INTO v_current_debt
    FROM expense_splits es
    JOIN expenses e ON e.id = es.expense_id
    WHERE es.user_id = NEW.from_user
      AND e.paid_by_user_id = NEW.to_user
      AND e.group_id = NEW.group_id
      AND e.deleted_at IS NULL;

    -- Warn if payment exceeds debt by more than 10%
    IF NEW.amount > (v_current_debt * 1.1) THEN
      RAISE NOTICE 'Payment amount (%) may exceed current debt (%) in group',
        NEW.amount, v_current_debt;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for payment amount validation
DROP TRIGGER IF EXISTS trigger_validate_payment_amount ON payments;
CREATE TRIGGER trigger_validate_payment_amount
  BEFORE INSERT OR UPDATE OF amount ON payments
  FOR EACH ROW
  EXECUTE FUNCTION validate_payment_amount();

-- ========================================
-- Part 3: Expense Splits Validation
-- ========================================

-- Function to validate expense splits sum
CREATE OR REPLACE FUNCTION validate_expense_splits()
RETURNS TRIGGER AS $$
DECLARE
  v_expense_amount DECIMAL(12, 2);
  v_total_splits DECIMAL(12, 2);
  v_difference DECIMAL(12, 2);
  v_tolerance DECIMAL(12, 2) := 0.01; -- Allow 1 cent difference for rounding
BEGIN
  -- Get the expense amount
  SELECT amount INTO v_expense_amount
  FROM expenses
  WHERE id = NEW.expense_id;

  IF v_expense_amount IS NULL THEN
    RAISE EXCEPTION 'Expense not found for split validation';
  END IF;

  -- Calculate total of all splits for this expense
  SELECT COALESCE(SUM(computed_amount), 0) INTO v_total_splits
  FROM expense_splits
  WHERE expense_id = NEW.expense_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID); -- Exclude current row if updating

  -- Add current split
  v_total_splits := v_total_splits + NEW.computed_amount;

  -- Calculate difference
  v_difference := ABS(v_total_splits - v_expense_amount);

  -- Check if total matches expense amount (within tolerance)
  IF v_difference > v_tolerance THEN
    RAISE EXCEPTION 'Sum of splits (%) does not match expense amount (%), difference: %',
      v_total_splits, v_expense_amount, v_difference
    USING HINT = 'Adjust split amounts to match expense total within ±0.01';
  END IF;

  -- Validate computed_amount is not negative
  IF NEW.computed_amount < 0 THEN
    RAISE EXCEPTION 'Split computed_amount cannot be negative, got: %', NEW.computed_amount;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for expense splits validation (commented out by default)
-- Uncomment when ready to enforce strict validation
-- DROP TRIGGER IF EXISTS trigger_validate_expense_splits ON expense_splits;
-- CREATE TRIGGER trigger_validate_expense_splits
--   AFTER INSERT OR UPDATE OF computed_amount ON expense_splits
--   FOR EACH ROW
--   EXECUTE FUNCTION validate_expense_splits();

COMMENT ON FUNCTION validate_expense_splits IS
  'Validates that expense splits sum to expense amount (±0.01 tolerance). Trigger is commented out by default.';

-- ========================================
-- Part 4: Currency Code Validation
-- ========================================

-- Function to validate currency codes
CREATE OR REPLACE FUNCTION validate_currency_code()
RETURNS TRIGGER AS $$
DECLARE
  v_valid_currencies TEXT[] := ARRAY['VND', 'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'KRW', 'THB', 'SGD'];
BEGIN
  -- Check if currency is in allowed list
  IF NEW.currency IS NOT NULL AND NOT (NEW.currency = ANY(v_valid_currencies)) THEN
    RAISE EXCEPTION 'Invalid currency code: %. Allowed currencies: %',
      NEW.currency, array_to_string(v_valid_currencies, ', ')
    USING HINT = 'Use standard ISO 4217 currency codes';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for currency validation
DROP TRIGGER IF EXISTS trigger_validate_expense_currency ON expenses;
CREATE TRIGGER trigger_validate_expense_currency
  BEFORE INSERT OR UPDATE OF currency ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION validate_currency_code();

DROP TRIGGER IF EXISTS trigger_validate_payment_currency ON payments;
CREATE TRIGGER trigger_validate_payment_currency
  BEFORE INSERT OR UPDATE OF currency ON payments
  FOR EACH ROW
  EXECUTE FUNCTION validate_currency_code();

-- ========================================
-- Part 5: Date Validation
-- ========================================

-- Function to validate dates are not too far in future
CREATE OR REPLACE FUNCTION validate_date_not_future()
RETURNS TRIGGER AS $$
DECLARE
  v_max_future_days INTEGER := 365; -- Allow 1 year into future
  v_date DATE;
BEGIN
  -- Get the date to validate (different column names in different tables)
  IF TG_TABLE_NAME = 'expenses' THEN
    v_date := NEW.expense_date;
  ELSIF TG_TABLE_NAME = 'payments' THEN
    v_date := NEW.payment_date;
  ELSE
    RETURN NEW; -- No validation for other tables
  END IF;

  -- Check if date is too far in future
  IF v_date > (CURRENT_DATE + v_max_future_days) THEN
    RAISE EXCEPTION 'Date cannot be more than % days in the future, got: %',
      v_max_future_days, v_date
    USING HINT = 'Check if date is entered correctly';
  END IF;

  -- Warn if date is very old (more than 5 years ago)
  IF v_date < (CURRENT_DATE - 1825) THEN -- 5 years
    RAISE WARNING 'Date is more than 5 years in the past: %. Is this correct?', v_date;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for date validation
DROP TRIGGER IF EXISTS trigger_validate_expense_date ON expenses;
CREATE TRIGGER trigger_validate_expense_date
  BEFORE INSERT OR UPDATE OF expense_date ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION validate_date_not_future();

DROP TRIGGER IF EXISTS trigger_validate_payment_date ON payments;
CREATE TRIGGER trigger_validate_payment_date
  BEFORE INSERT OR UPDATE OF payment_date ON payments
  FOR EACH ROW
  EXECUTE FUNCTION validate_date_not_future();

-- ========================================
-- Part 6: Context Validation (Group vs Friend)
-- ========================================

-- Function to validate context consistency
CREATE OR REPLACE FUNCTION validate_expense_context()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate context_type matches the provided IDs
  IF NEW.context_type = 'group' THEN
    IF NEW.group_id IS NULL THEN
      RAISE EXCEPTION 'Group expense must have a group_id';
    END IF;
    IF NEW.friendship_id IS NOT NULL THEN
      RAISE EXCEPTION 'Group expense cannot have a friendship_id';
    END IF;
  ELSIF NEW.context_type = 'friend' THEN
    IF NEW.friendship_id IS NULL THEN
      RAISE EXCEPTION 'Friend expense must have a friendship_id';
    END IF;
    IF NEW.group_id IS NOT NULL THEN
      RAISE EXCEPTION 'Friend expense cannot have a group_id';
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid context_type: %. Must be "group" or "friend"', NEW.context_type;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for context validation
DROP TRIGGER IF EXISTS trigger_validate_expense_context ON expenses;
CREATE TRIGGER trigger_validate_expense_context
  BEFORE INSERT OR UPDATE OF context_type, group_id, friendship_id ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION validate_expense_context();

-- ========================================
-- Part 7: Description Validation
-- ========================================

-- Function to validate description is not empty or whitespace
CREATE OR REPLACE FUNCTION validate_description()
RETURNS TRIGGER AS $$
BEGIN
  -- Trim whitespace and check if empty
  NEW.description := TRIM(NEW.description);

  IF LENGTH(NEW.description) = 0 THEN
    RAISE EXCEPTION 'Description cannot be empty or whitespace only';
  END IF;

  -- Check minimum length
  IF LENGTH(NEW.description) < 2 THEN
    RAISE EXCEPTION 'Description too short (minimum 2 characters), got: "%"', NEW.description;
  END IF;

  -- Check maximum length
  IF LENGTH(NEW.description) > 500 THEN
    RAISE EXCEPTION 'Description too long (maximum 500 characters), got % characters',
      LENGTH(NEW.description);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for description validation
DROP TRIGGER IF EXISTS trigger_validate_expense_description ON expenses;
CREATE TRIGGER trigger_validate_expense_description
  BEFORE INSERT OR UPDATE OF description ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION validate_description();

-- ========================================
-- Part 8: Split Method Validation
-- ========================================

-- Function to validate split method and value consistency
CREATE OR REPLACE FUNCTION validate_split_method()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate split_method is one of allowed values
  IF NEW.split_method NOT IN ('equal', 'exact', 'percentage') THEN
    RAISE EXCEPTION 'Invalid split_method: %. Must be "equal", "exact", or "percentage"',
      NEW.split_method;
  END IF;

  -- Validate split_value is provided when needed
  IF NEW.split_method IN ('exact', 'percentage') THEN
    IF NEW.split_value IS NULL THEN
      RAISE EXCEPTION 'split_value is required for split_method: %', NEW.split_method;
    END IF;

    -- Validate percentage is 0-100
    IF NEW.split_method = 'percentage' THEN
      IF NEW.split_value < 0 OR NEW.split_value > 100 THEN
        RAISE EXCEPTION 'Percentage split_value must be between 0 and 100, got: %',
          NEW.split_value;
      END IF;
    END IF;

    -- Validate exact amount is positive
    IF NEW.split_method = 'exact' THEN
      IF NEW.split_value < 0 THEN
        RAISE EXCEPTION 'Exact split_value cannot be negative, got: %', NEW.split_value;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for split method validation
DROP TRIGGER IF EXISTS trigger_validate_split_method ON expense_splits;
CREATE TRIGGER trigger_validate_split_method
  BEFORE INSERT OR UPDATE OF split_method, split_value ON expense_splits
  FOR EACH ROW
  EXECUTE FUNCTION validate_split_method();

-- ========================================
-- Part 9: Prevent Self-Payment
-- ========================================

-- Function to prevent users from paying themselves
CREATE OR REPLACE FUNCTION prevent_self_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.from_user = NEW.to_user THEN
    RAISE EXCEPTION 'Cannot create payment from user to themselves (user_id: %)', NEW.from_user;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent self-payment
DROP TRIGGER IF EXISTS trigger_prevent_self_payment ON payments;
CREATE TRIGGER trigger_prevent_self_payment
  BEFORE INSERT OR UPDATE OF from_user, to_user ON payments
  FOR EACH ROW
  EXECUTE FUNCTION prevent_self_payment();

-- ========================================
-- Part 10: Comments for Documentation
-- ========================================

COMMENT ON FUNCTION validate_expense_amount IS
  'Validates expense amount is positive and within reasonable limits (0.01 - 999,999,999.99)';

COMMENT ON FUNCTION validate_payment_amount IS
  'Validates payment amount is positive and warns if exceeds current debt';

COMMENT ON FUNCTION validate_currency_code IS
  'Validates currency code is one of supported currencies (VND, USD, EUR, etc.)';

COMMENT ON FUNCTION validate_date_not_future IS
  'Validates dates are not too far in future (max 1 year) and warns if too old (>5 years)';

COMMENT ON FUNCTION validate_expense_context IS
  'Validates expense context_type matches provided group_id or friendship_id';

COMMENT ON FUNCTION validate_description IS
  'Validates description is not empty, has minimum 2 chars, maximum 500 chars';

COMMENT ON FUNCTION validate_split_method IS
  'Validates split_method is valid and split_value is provided when required';

COMMENT ON FUNCTION prevent_self_payment IS
  'Prevents users from creating payments to themselves';

COMMIT;

-- ========================================
-- Validation Summary
-- ========================================

-- Active Validations:
-- ✅ Expense amount: 0.01 - 999,999,999.99
-- ✅ Payment amount: 0.01 - 999,999,999.99 (with debt check warning)
-- ✅ Currency codes: VND, USD, EUR, GBP, JPY, CNY, KRW, THB, SGD
-- ✅ Dates: Not more than 1 year in future, warning if >5 years old
-- ✅ Expense context: Must match group_id or friendship_id
-- ✅ Description: 2-500 characters, not empty
-- ✅ Split method: Must be equal/exact/percentage with valid split_value
-- ✅ Self-payment: Prevented

-- Optional Validations (commented out):
-- ⚠️ Expense splits sum: Can be enabled when ready for strict enforcement
