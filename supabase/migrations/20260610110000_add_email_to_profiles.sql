-- Add email column to profiles table
-- This is needed to display user emails in the admin panel

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email TEXT;

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Update existing profiles with email from auth.users
-- This will be done via a separate query after the migration