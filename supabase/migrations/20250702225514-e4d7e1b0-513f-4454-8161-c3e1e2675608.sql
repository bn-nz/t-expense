-- Enable realtime for expenses table
ALTER TABLE public.expenses REPLICA IDENTITY FULL;

-- Add the table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;