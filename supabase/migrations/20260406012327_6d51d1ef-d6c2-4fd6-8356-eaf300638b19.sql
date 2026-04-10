
-- Rate limiting table for edge functions
CREATE TABLE public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  action_type text NOT NULL,
  count integer NOT NULL DEFAULT 1,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  blocked_until timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_rate_limits_lookup ON public.rate_limits (identifier, action_type, expires_at);

-- Auto-cleanup: delete expired records
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.rate_limits WHERE expires_at < now();
$$;

-- Rate check function: returns true if rate limit exceeded
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _identifier text,
  _action_type text,
  _max_requests integer,
  _window_seconds integer,
  _block_seconds integer DEFAULT 300
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _now timestamptz := now();
  _window_start timestamptz := _now - (_window_seconds || ' seconds')::interval;
  _current_count integer;
  _blocked_until timestamptz;
  _result jsonb;
BEGIN
  -- Cleanup old records first
  DELETE FROM public.rate_limits 
  WHERE identifier = _identifier 
    AND action_type = _action_type 
    AND expires_at < _now;

  -- Check if currently blocked
  SELECT rl.blocked_until INTO _blocked_until
  FROM public.rate_limits rl
  WHERE rl.identifier = _identifier 
    AND rl.action_type = _action_type
    AND rl.blocked_until IS NOT NULL 
    AND rl.blocked_until > _now
  LIMIT 1;

  IF _blocked_until IS NOT NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'blocked_until', _blocked_until,
      'retry_after', EXTRACT(EPOCH FROM (_blocked_until - _now))::integer
    );
  END IF;

  -- Count requests in window
  SELECT COALESCE(SUM(rl.count), 0) INTO _current_count
  FROM public.rate_limits rl
  WHERE rl.identifier = _identifier 
    AND rl.action_type = _action_type
    AND rl.window_start >= _window_start;

  IF _current_count >= _max_requests THEN
    -- Block the identifier
    INSERT INTO public.rate_limits (identifier, action_type, count, window_start, expires_at, blocked_until)
    VALUES (_identifier, _action_type, 0, _now, _now + (_block_seconds || ' seconds')::interval, _now + (_block_seconds || ' seconds')::interval);

    RETURN jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'blocked_until', _now + (_block_seconds || ' seconds')::interval,
      'retry_after', _block_seconds
    );
  END IF;

  -- Record this request
  INSERT INTO public.rate_limits (identifier, action_type, count, window_start, expires_at)
  VALUES (_identifier, _action_type, 1, _now, _now + (_window_seconds || ' seconds')::interval);

  RETURN jsonb_build_object(
    'allowed', true,
    'remaining', _max_requests - _current_count - 1,
    'blocked_until', null,
    'retry_after', 0
  );
END;
$$;

-- RLS: No direct access from client, only via security definer functions
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
