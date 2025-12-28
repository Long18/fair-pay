-- Enable realtime for expenses and expense_splits tables
-- This allows the frontend to receive real-time updates when debts change

-- Enable realtime on expenses table
ALTER PUBLICATION supabase_realtime ADD TABLE expenses;

-- Enable realtime on expense_splits table
ALTER PUBLICATION supabase_realtime ADD TABLE expense_splits;

-- Add comment
COMMENT ON TABLE expenses IS 'Expense records with realtime enabled for debt updates';
COMMENT ON TABLE expense_splits IS 'Expense split records with realtime enabled for debt calculations';
