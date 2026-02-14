-- Fix infinite recursion in sepay_payment_orders RLS
-- The admin policy references user_roles which has its own recursive RLS policy.
-- The existing payer/payee SELECT policy already covers normal access.
-- Drop the problematic admin policy.

DROP POLICY IF EXISTS "Admin full access to payment orders" ON sepay_payment_orders;

-- Also drop the potentially conflicting user_settings policy we added
-- (it may conflict with existing policies on user_settings)
DROP POLICY IF EXISTS "Users can view payee sepay config" ON user_settings;
