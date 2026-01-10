-- Insert test data for demonstration
-- This will help test the unpaid debts functionality

-- First, create auth users (required for profiles)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, instance_id, aud, role) VALUES
('11111111-1111-1111-1111-111111111111', 'long@example.com', '$2a$10$PuMT1bLXa1tC1Ii8nZ7W8.Fh1mtToeJdXxqHFFA9EFqPqHdLqLcXi', NOW(), NOW(), NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
('22222222-2222-2222-2222-222222222222', 'tuyen@example.com', '$2a$10$PuMT1bLXa1tC1Ii8nZ7W8.Fh1mtToeJdXxqHFFA9EFqPqHdLqLcXi', NOW(), NOW(), NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
('33333333-3333-3333-3333-333333333333', 'nguyen@example.com', '$2a$10$PuMT1bLXa1tC1Ii8nZ7W8.Fh1mtToeJdXxqHFFA9EFqPqHdLqLcXi', NOW(), NOW(), NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
('44444444-4444-4444-4444-444444444444', 'tran@example.com', '$2a$10$PuMT1bLXa1tC1Ii8nZ7W8.Fh1mtToeJdXxqHFFA9EFqPqHdLqLcXi', NOW(), NOW(), NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

-- Insert test profiles
INSERT INTO profiles (id, full_name, email, avatar_url) VALUES
('11111111-1111-1111-1111-111111111111', 'Lê Nguyễn Thành Long', 'long@example.com', NULL),
('22222222-2222-2222-2222-222222222222', 'Trần Thị Kim Tuyến', 'tuyen@example.com', NULL),
('33333333-3333-3333-3333-333333333333', 'Nguyễn Văn A', 'nguyen@example.com', NULL),
('44444444-4444-4444-4444-444444444444', 'Trần Văn B', 'tran@example.com', NULL)
ON CONFLICT (id) DO NOTHING;

-- Create friendships
INSERT INTO friendships (id, user_a, user_b, status, created_by, created_at) VALUES
('f1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'accepted', '11111111-1111-1111-1111-111111111111', NOW()),
('f2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'accepted', '11111111-1111-1111-1111-111111111111', NOW()),
('f3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'accepted', '11111111-1111-1111-1111-111111111111', NOW())
ON CONFLICT (id) DO NOTHING;

-- Create test expenses with some settled and some not settled
-- Expense 1: Long paid 300,000 for dinner with Tuyen (not settled)
INSERT INTO expenses (id, description, amount, currency, paid_by_user_id, created_by, context_type, friendship_id, expense_date, created_at) VALUES
('e1111111-1111-1111-1111-111111111111', 'Dinner at restaurant', 300000, 'VND', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'friend', 'f1111111-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '5 days', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_splits (id, expense_id, user_id, split_method, split_value, computed_amount, is_settled, settled_amount, settled_at) VALUES
('f1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'equal', NULL, 150000, false, 0, NULL),
('f1111112-1111-1111-1111-111111111112', 'e1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'equal', NULL, 150000, true, 150000, NOW())
ON CONFLICT (id) DO NOTHING;

-- Expense 2: Tuyen paid 200,000 for coffee with Long (not settled)
INSERT INTO expenses (id, description, amount, currency, paid_by_user_id, created_by, context_type, friendship_id, expense_date, created_at) VALUES
('e2222222-2222-2222-2222-222222222222', 'Coffee shop', 200000, 'VND', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'friend', 'f1111111-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '3 days', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_splits (id, expense_id, user_id, split_method, split_value, computed_amount, is_settled, settled_amount, settled_at) VALUES
('f2222221-2222-2222-2222-222222222221', 'e2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'equal', NULL, 100000, false, 0, NULL),
('f2222222-2222-2222-2222-222222222222', 'e2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'equal', NULL, 100000, true, 100000, NOW())
ON CONFLICT (id) DO NOTHING;

-- Expense 3: Long paid 500,000 for shopping with Nguyen (already settled)
INSERT INTO expenses (id, description, amount, currency, paid_by_user_id, created_by, context_type, friendship_id, expense_date, created_at) VALUES
('e3333333-3333-3333-3333-333333333333', 'Shopping', 500000, 'VND', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'friend', 'f2222222-2222-2222-2222-222222222222', CURRENT_DATE - INTERVAL '10 days', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_splits (id, expense_id, user_id, split_method, split_value, computed_amount, is_settled, settled_amount, settled_at) VALUES
('f3333331-3333-3333-3333-333333333331', 'e3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'equal', NULL, 250000, true, 250000, NOW() - INTERVAL '2 days'),
('f3333332-3333-3333-3333-333333333332', 'e3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'equal', NULL, 250000, true, 250000, NOW() - INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;

-- Expense 4: Tran paid 400,000 for lunch with Long (not settled)
INSERT INTO expenses (id, description, amount, currency, paid_by_user_id, created_by, context_type, friendship_id, expense_date, created_at) VALUES
('e4444444-4444-4444-4444-444444444444', 'Lunch meeting', 400000, 'VND', '44444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 'friend', 'f3333333-3333-3333-3333-333333333333', CURRENT_DATE - INTERVAL '1 days', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_splits (id, expense_id, user_id, split_method, split_value, computed_amount, is_settled, settled_amount, settled_at) VALUES
('f4444441-4444-4444-4444-444444444441', 'e4444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'equal', NULL, 200000, false, 0, NULL),
('f4444442-4444-4444-4444-444444444442', 'e4444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 'equal', NULL, 200000, true, 200000, NOW())
ON CONFLICT (id) DO NOTHING;

-- Summary of unpaid debts after this data:
-- Long owes Tuyen: 100,000 VND (from coffee)
-- Tuyen owes Long: 150,000 VND (from dinner)
-- Net: Long is owed 50,000 VND by Tuyen

-- Long owes Tran: 200,000 VND (from lunch)
-- Net: Long owes Tran 200,000 VND

-- The settled expense with Nguyen should NOT appear in unpaid debts