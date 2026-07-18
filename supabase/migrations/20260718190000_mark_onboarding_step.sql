-- Race-safe onboarding step merge via atomic jsonb update.
CREATE OR REPLACE FUNCTION public.mark_onboarding_step(p_step text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_steps jsonb;
  v_completed boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT COALESCE(onboarding_steps, '{}'::jsonb) || jsonb_build_object(p_step, true)
  INTO v_steps
  FROM public.profiles
  WHERE id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  v_completed :=
    COALESCE((v_steps->>'profile')::boolean, false)
    AND COALESCE((v_steps->>'friend')::boolean, false)
    AND COALESCE((v_steps->>'group')::boolean, false)
    AND COALESCE((v_steps->>'expense')::boolean, false)
    AND COALESCE((v_steps->>'settle')::boolean, false);

  UPDATE public.profiles
  SET
    onboarding_steps = v_steps,
    onboarding_completed = CASE
      WHEN v_completed THEN true
      ELSE onboarding_completed
    END
  WHERE id = v_uid
  RETURNING onboarding_completed INTO v_completed;

  RETURN jsonb_build_object(
    'steps', v_steps,
    'completed', v_completed
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_onboarding_step(text) TO authenticated;
