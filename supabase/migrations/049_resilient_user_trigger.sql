-- Re-create the handle_new_user function to be more resilient
-- This ensures that even if league joining fails, the user creation succeeds.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $function$
DECLARE
  global_league_id UUID;
BEGIN
  -- 1. Insert/Update the public.users record
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

  -- 2. Attempt to add to global league (wrapped in a block to prevent failure)
  BEGIN
    SELECT id INTO global_league_id FROM public.leagues WHERE is_global = true LIMIT 1;
    IF global_league_id IS NOT NULL THEN
      INSERT INTO public.league_members (league_id, user_id)
      VALUES (global_league_id, NEW.id)
      ON CONFLICT DO NOTHING;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail the transaction
    RAISE WARNING 'Failed to add user to global league: %', SQLERRM;
  END;

  RETURN NEW;
END;
$function$ LANGUAGE plpgsql SECURITY DEFINER;
