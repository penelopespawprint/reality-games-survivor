-- Fix handle_new_user trigger to handle errors gracefully
-- This prevents "Database error saving new user" by handling edge cases

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  global_league_id UUID;
BEGIN
  -- Insert user, handle conflicts gracefully
  -- Primary conflict is on id (from auth.users), but we also handle email conflicts
  INSERT INTO public.users (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    display_name = COALESCE(EXCLUDED.display_name, users.display_name);

  -- Get global league ID (only if it exists)
  SELECT id INTO global_league_id 
  FROM public.leagues 
  WHERE is_global = true 
  LIMIT 1;

  -- Only try to add to global league if it exists AND user isn't already a member
  IF global_league_id IS NOT NULL THEN
    INSERT INTO public.league_members (league_id, user_id)
    VALUES (global_league_id, NEW.id)
    ON CONFLICT (league_id, user_id) DO NOTHING; -- Ignore if user is already a member
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Handle unique constraint violations (email or league_members)
    -- Log but don't fail - user may have been created partially
    RAISE WARNING 'Unique violation in handle_new_user for user % (email: %): %', NEW.id, NEW.email, SQLERRM;
    RETURN NEW;
  WHEN others THEN
    -- Log any other error but don't fail the auth user creation
    -- This ensures Supabase auth succeeds even if our trigger has issues
    RAISE WARNING 'Error in handle_new_user for user % (email: %): %', NEW.id, NEW.email, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
