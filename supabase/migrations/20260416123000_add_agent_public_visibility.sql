-- Add a flag to control whether a profile/agent is shown on the public agents page
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS show_on_public_page boolean NOT NULL DEFAULT false;
