-- Ultra-resilient triggers to ensure auth.users insertion NEVER rolls back
-- This wraps the ENTIRE handle_new_user function in an exception block

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $function$
DECLARE
  global_league_id UUID;
BEGIN
  BEGIN
    -- 1. Insert/Update the public.users record
    INSERT INTO public.users (id, email, display_name)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(
        NEW.raw_user_meta_data->>'display_name', 
        split_part(NEW.email, '@', 1),
        'Survivor Player' -- Ultimate fallback
      )
    )
    ON CONFLICT (id) DO UPDATE
    SET 
      email = EXCLUDED.email,
      display_name = COALESCE(EXCLUDED.display_name, users.display_name);

    -- 2. Attempt to add to global league
    BEGIN
      SELECT id INTO global_league_id FROM public.leagues WHERE is_global = true LIMIT 1;
      IF global_league_id IS NOT NULL THEN
        INSERT INTO public.league_members (league_id, user_id)
        VALUES (global_league_id, NEW.id)
        ON CONFLICT DO NOTHING;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to add user to global league in trigger: %', SQLERRM;
    END;

  EXCEPTION WHEN OTHERS THEN
    -- This catch-all ensures the AUTH USER creation succeeds even if the PUBLIC USER creation fails
    -- The user can then be "repaired" via the upsert in ProfileSetup.tsx
    RAISE WARNING 'CRITICAL: handle_new_user trigger failed for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$function$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also wrap the notification preferences trigger just in case
CREATE OR REPLACE FUNCTION public.create_notification_preferences_for_new_user()
RETURNS TRIGGER AS $function$
BEGIN
  BEGIN
    INSERT INTO public.notification_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to create notification preferences in trigger: %', SQLERRM;
  END;
  RETURN NEW;
END;
$function$ LANGUAGE plpgsql SECURITY DEFINER;
