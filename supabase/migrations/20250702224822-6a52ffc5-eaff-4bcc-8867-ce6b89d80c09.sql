-- Add new fields to the expenses table
ALTER TABLE public.expenses 
ADD COLUMN claim_paid BOOLEAN DEFAULT FALSE,
ADD COLUMN claim_note TEXT;