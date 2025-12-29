-- Make notification preferences creation resilient
CREATE OR REPLACE FUNCTION public.create_notification_preferences_for_new_user()
RETURNS TRIGGER AS $function$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't block user creation
  RAISE WARNING 'Failed to create notification preferences for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$function$ LANGUAGE plpgsql SECURITY DEFINER;
