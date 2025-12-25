-- Migration: Notifications System
-- Created: 2025-12-25
-- Description: Add notifications table with RLS policies for real-time user notifications

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'expense_added',
        'expense_updated',
        'expense_deleted',
        'payment_recorded',
        'friend_request',
        'friend_accepted',
        'added_to_group'
    )),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    related_id UUID,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = FALSE;

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
    ON public.notifications
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
    ON public.notifications
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
    ON public.notifications
    FOR DELETE
    USING (auth.uid() = user_id);

-- System can insert notifications (via triggers or functions)
CREATE POLICY "System can insert notifications"
    ON public.notifications
    FOR INSERT
    WITH CHECK (true);

-- Helper function to create notifications
CREATE OR REPLACE FUNCTION public.create_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_link TEXT DEFAULT NULL,
    p_related_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, link, related_id)
    VALUES (p_user_id, p_type, p_title, p_message, p_link, p_related_id)
    RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify group members when expense is added
CREATE OR REPLACE FUNCTION public.notify_expense_added()
RETURNS TRIGGER AS $$
DECLARE
    v_member RECORD;
    v_payer_name TEXT;
    v_group_name TEXT;
BEGIN
    -- Get payer name
    SELECT full_name INTO v_payer_name
    FROM public.profiles
    WHERE id = NEW.paid_by_user_id;

    -- Get group name if group expense
    IF NEW.group_id IS NOT NULL THEN
        SELECT name INTO v_group_name
        FROM public.groups
        WHERE id = NEW.group_id;

        -- Notify all group members except the payer
        FOR v_member IN
            SELECT gm.user_id
            FROM public.group_members gm
            WHERE gm.group_id = NEW.group_id
            AND gm.user_id != NEW.paid_by_user_id
        LOOP
            PERFORM public.create_notification(
                v_member.user_id,
                'expense_added',
                'New Expense',
                v_payer_name || ' added "' || NEW.description || '" to ' || v_group_name,
                '/expenses/show/' || NEW.id,
                NEW.id
            );
        END LOOP;
    END IF;

    -- TODO: Handle friendship expense notifications

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for expense added notifications
CREATE TRIGGER trigger_notify_expense_added
AFTER INSERT ON public.expenses
FOR EACH ROW
WHEN (NEW.is_payment = FALSE)
EXECUTE FUNCTION public.notify_expense_added();

-- Function to notify when payment is recorded
CREATE OR REPLACE FUNCTION public.notify_payment_recorded()
RETURNS TRIGGER AS $$
DECLARE
    v_payer_name TEXT;
    v_group_name TEXT;
BEGIN
    -- Get payer name
    SELECT full_name INTO v_payer_name
    FROM public.profiles
    WHERE id = NEW.from_user_id;

    -- Notify the recipient
    IF NEW.group_id IS NOT NULL THEN
        SELECT name INTO v_group_name
        FROM public.groups
        WHERE id = NEW.group_id;

        PERFORM public.create_notification(
            NEW.to_user_id,
            'payment_recorded',
            'Payment Recorded',
            v_payer_name || ' paid you ' || NEW.amount || ' ' || NEW.currency || ' in ' || v_group_name,
            '/groups/show/' || NEW.group_id,
            NEW.id
        );
    ELSIF NEW.friendship_id IS NOT NULL THEN
        PERFORM public.create_notification(
            NEW.to_user_id,
            'payment_recorded',
            'Payment Recorded',
            v_payer_name || ' paid you ' || NEW.amount || ' ' || NEW.currency,
            '/friends/show/' || NEW.friendship_id,
            NEW.id
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for payment recorded notifications
CREATE TRIGGER trigger_notify_payment_recorded
AFTER INSERT ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.notify_payment_recorded();

-- Function to notify when friend request is sent
CREATE OR REPLACE FUNCTION public.notify_friend_request()
RETURNS TRIGGER AS $$
DECLARE
    v_requester_name TEXT;
    v_recipient_id UUID;
BEGIN
    -- Only notify on pending status (new request)
    IF NEW.status = 'pending' THEN
        -- Get requester name
        SELECT full_name INTO v_requester_name
        FROM public.profiles
        WHERE id = NEW.created_by;

        -- Determine recipient (the user who is NOT the requester)
        IF NEW.user_a_id = NEW.created_by THEN
            v_recipient_id := NEW.user_b_id;
        ELSE
            v_recipient_id := NEW.user_a_id;
        END IF;

        PERFORM public.create_notification(
            v_recipient_id,
            'friend_request',
            'Friend Request',
            v_requester_name || ' sent you a friend request',
            '/friends',
            NEW.id
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for friend request notifications
CREATE TRIGGER trigger_notify_friend_request
AFTER INSERT ON public.friendships
FOR EACH ROW
EXECUTE FUNCTION public.notify_friend_request();

-- Function to notify when friend request is accepted
CREATE OR REPLACE FUNCTION public.notify_friend_accepted()
RETURNS TRIGGER AS $$
DECLARE
    v_accepter_name TEXT;
    v_requester_id UUID;
BEGIN
    -- Only notify when status changes from pending to accepted
    IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
        -- Get accepter name (the person who updated the status)
        SELECT full_name INTO v_accepter_name
        FROM public.profiles
        WHERE id = auth.uid();

        -- Determine original requester
        IF NEW.user_a_id = NEW.created_by THEN
            v_requester_id := NEW.user_a_id;
        ELSE
            v_requester_id := NEW.user_b_id;
        END IF;

        PERFORM public.create_notification(
            v_requester_id,
            'friend_accepted',
            'Friend Request Accepted',
            v_accepter_name || ' accepted your friend request',
            '/friends/show/' || NEW.id,
            NEW.id
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for friend accepted notifications
CREATE TRIGGER trigger_notify_friend_accepted
AFTER UPDATE ON public.friendships
FOR EACH ROW
EXECUTE FUNCTION public.notify_friend_accepted();

-- Function to notify when user is added to group
CREATE OR REPLACE FUNCTION public.notify_added_to_group()
RETURNS TRIGGER AS $$
DECLARE
    v_group_name TEXT;
    v_adder_name TEXT;
BEGIN
    -- Get group name
    SELECT name INTO v_group_name
    FROM public.groups
    WHERE id = NEW.group_id;

    -- Get adder name (the creator of the group or current user)
    SELECT full_name INTO v_adder_name
    FROM public.profiles
    WHERE id = COALESCE(auth.uid(), NEW.user_id);

    -- Don't notify the user who created the group (they added themselves)
    IF NEW.user_id != (SELECT created_by FROM public.groups WHERE id = NEW.group_id) THEN
        PERFORM public.create_notification(
            NEW.user_id,
            'added_to_group',
            'Added to Group',
            'You were added to "' || v_group_name || '"',
            '/groups/show/' || NEW.group_id,
            NEW.group_id
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for added to group notifications
CREATE TRIGGER trigger_notify_added_to_group
AFTER INSERT ON public.group_members
FOR EACH ROW
EXECUTE FUNCTION public.notify_added_to_group();

-- Grant execute permissions on helper function
GRANT EXECUTE ON FUNCTION public.create_notification TO authenticated;

-- Comments for documentation
COMMENT ON TABLE public.notifications IS 'User notifications for expense, payment, and friend activities';
COMMENT ON FUNCTION public.create_notification IS 'Helper function to create a new notification';
COMMENT ON FUNCTION public.notify_expense_added IS 'Trigger function to notify group members when an expense is added';
COMMENT ON FUNCTION public.notify_payment_recorded IS 'Trigger function to notify users when a payment is recorded';
COMMENT ON FUNCTION public.notify_friend_request IS 'Trigger function to notify users when they receive a friend request';
COMMENT ON FUNCTION public.notify_friend_accepted IS 'Trigger function to notify users when their friend request is accepted';
COMMENT ON FUNCTION public.notify_added_to_group IS 'Trigger function to notify users when they are added to a group';
