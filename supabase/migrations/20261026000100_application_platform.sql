CREATE TABLE public.customer_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 80),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.account_members (
  account_id uuid NOT NULL REFERENCES public.customer_accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, user_id)
);
CREATE INDEX account_members_user_idx ON public.account_members (user_id, account_id);

CREATE TABLE public.creation_rate_limits (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('account', 'application')),
  window_started_at timestamptz NOT NULL,
  request_count integer NOT NULL CHECK (request_count >= 1),
  PRIMARY KEY (user_id, action)
);

CREATE TABLE public.hosting_plans (
  id text PRIMARY KEY CHECK (id ~ '^[a-z][a-z0-9_-]{1,39}$'),
  name text NOT NULL,
  active boolean NOT NULL DEFAULT false,
  currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  price_minor bigint NOT NULL CHECK (price_minor >= 0),
  billing_interval text NOT NULL CHECK (billing_interval IN ('month', 'year')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.plan_entitlements (
  plan_id text NOT NULL REFERENCES public.hosting_plans(id) ON DELETE CASCADE,
  entitlement_key text NOT NULL CHECK (length(btrim(entitlement_key)) BETWEEN 1 AND 80),
  limit_value numeric NOT NULL CHECK (limit_value >= 0),
  CONSTRAINT plan_entitlements_count_quota_check CHECK (
    entitlement_key NOT IN ('applications.max', 'deployments.concurrent.max')
    OR (limit_value = trunc(limit_value) AND limit_value <= 1000000000)
  ),
  PRIMARY KEY (plan_id, entitlement_key)
);

CREATE TABLE public.account_plan_assignments (
  account_id uuid PRIMARY KEY REFERENCES public.customer_accounts(id) ON DELETE CASCADE,
  plan_id text NOT NULL REFERENCES public.hosting_plans(id),
  status text NOT NULL CHECK (status IN ('active', 'past_due', 'cancelled', 'expired')),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR ends_at > starts_at)
);
CREATE INDEX account_plan_assignments_plan_idx
  ON public.account_plan_assignments (plan_id, status);

CREATE TABLE public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.customer_accounts(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 80),
  framework text NOT NULL CHECK (framework IN ('nextjs')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, id)
);
CREATE INDEX applications_account_created_idx
  ON public.applications (account_id, created_at DESC);

CREATE TABLE public.deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  application_id uuid NOT NULL,
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  idempotency_key text NOT NULL CHECK (length(btrim(idempotency_key)) BETWEEN 8 AND 128),
  request_hash text NOT NULL CHECK (request_hash ~ '^[a-f0-9]{64}$'),
  source_revision jsonb NOT NULL CHECK (
    jsonb_typeof(source_revision) = 'object'
    AND source_revision ?& ARRAY['provider', 'repository_id', 'commit_sha', 'upload_ref']::text[]
    AND source_revision - ARRAY['provider', 'repository_id', 'commit_sha', 'upload_ref']::text[] = '{}'::jsonb
    AND (
      (
        source_revision->>'provider' = 'github'
        AND jsonb_typeof(source_revision->'repository_id') = 'string'
        AND source_revision->>'repository_id' ~ '^[1-9][0-9]{0,19}$'
        AND jsonb_typeof(source_revision->'commit_sha') = 'string'
        AND source_revision->>'commit_sha' ~ '^[A-Fa-f0-9]{40,64}$'
        AND jsonb_typeof(source_revision->'upload_ref') = 'null'
      )
      OR (
        source_revision->>'provider' = 'upload'
        AND jsonb_typeof(source_revision->'repository_id') = 'null'
        AND jsonb_typeof(source_revision->'commit_sha') = 'null'
        AND jsonb_typeof(source_revision->'upload_ref') = 'string'
        AND source_revision->>'upload_ref' ~ '^uploads/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      )
    )
  ),
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'building', 'image_ready', 'deploying', 'ready', 'failed', 'cancelled')),
  image_digest text,
  runtime_resource_ref text,
  deployment_url text,
  failure_code text CHECK (
    failure_code IS NULL OR failure_code IN (
      'source_unavailable', 'build_failed', 'publish_failed', 'deploy_failed',
      'health_check_failed', 'cleanup_failed', 'invalid_configuration', 'cancelled'
    )
  ),
  cleanup_status text NOT NULL DEFAULT 'not_required'
    CHECK (cleanup_status IN ('not_required', 'pending', 'in_progress', 'complete', 'failed')),
  cleanup_attempted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz,
  UNIQUE (account_id, application_id, idempotency_key),
  FOREIGN KEY (account_id, application_id)
    REFERENCES public.applications (account_id, id),
  CHECK (image_digest IS NULL OR image_digest ~ '^sha256:[a-f0-9]{64}$'),
  CHECK (
    (status IN ('ready', 'failed', 'cancelled') AND finished_at IS NOT NULL)
    OR (status NOT IN ('ready', 'failed', 'cancelled') AND finished_at IS NULL)
  )
);
CREATE INDEX deployments_application_created_idx
  ON public.deployments (account_id, application_id, created_at DESC);
CREATE INDEX deployments_work_queue_idx
  ON public.deployments (status, created_at)
  WHERE status IN ('queued', 'building', 'image_ready', 'deploying');
CREATE INDEX deployments_cleanup_queue_idx
  ON public.deployments (cleanup_status, cleanup_attempted_at)
  WHERE cleanup_status IN ('pending', 'in_progress', 'failed');

CREATE TABLE public.deployment_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  deployment_id uuid NOT NULL REFERENCES public.deployments(id),
  sequence_number integer NOT NULL CHECK (sequence_number > 0),
  event_type text NOT NULL CHECK (event_type = 'status_changed'),
  from_status text CHECK (
    from_status IS NULL OR from_status IN ('queued', 'building', 'image_ready', 'deploying', 'ready', 'failed', 'cancelled')
  ),
  to_status text NOT NULL CHECK (
    to_status IN ('queued', 'building', 'image_ready', 'deploying', 'ready', 'failed', 'cancelled')
  ),
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT deployment_events_metadata_check CHECK (
    jsonb_typeof(metadata) = 'object'
    AND metadata - ARRAY['phase', 'code', 'retryable', 'attempt']::text[] = '{}'::jsonb
    AND (
      NOT (metadata ? 'phase')
      OR (
        jsonb_typeof(metadata->'phase') = 'string'
        AND metadata->>'phase' IN ('source', 'build', 'publish', 'deploy', 'health', 'cleanup')
      )
    )
    AND (
      NOT (metadata ? 'code')
      OR (
        jsonb_typeof(metadata->'code') = 'string'
        AND metadata->>'code' IN (
          'source_unavailable', 'build_failed', 'publish_failed', 'deploy_failed',
          'health_check_failed', 'cleanup_failed', 'invalid_configuration', 'cancelled'
        )
      )
    )
    AND (
      NOT (metadata ? 'retryable')
      OR jsonb_typeof(metadata->'retryable') = 'boolean'
    )
    AND (
      NOT (metadata ? 'attempt')
      OR (
        jsonb_typeof(metadata->'attempt') = 'number'
        AND metadata->>'attempt' ~ '^([1-9]|[1-9][0-9]|100)$'
      )
    )
  ),
  UNIQUE (deployment_id, sequence_number)
);
CREATE INDEX deployment_events_deployment_created_idx
  ON public.deployment_events (deployment_id, created_at);

CREATE FUNCTION public.check_creation_rate_limit(p_action text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  user_id_value uuid := auth.uid();
  action_limit integer;
  action_window interval := interval '1 hour';
  current_time_value timestamptz := clock_timestamp();
  resulting_count integer;
BEGIN
  IF user_id_value IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'Authentication required';
  END IF;

  action_limit := CASE p_action
    WHEN 'account' THEN 5
    WHEN 'application' THEN 20
    ELSE NULL
  END;
  IF action_limit IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Unsupported creation action';
  END IF;

  INSERT INTO public.creation_rate_limits AS rate_limit (
    user_id, action, window_started_at, request_count
  ) VALUES (
    user_id_value, p_action, current_time_value, 1
  )
  ON CONFLICT (user_id, action) DO UPDATE
  SET window_started_at = CASE
        WHEN rate_limit.window_started_at <= current_time_value - action_window
          THEN current_time_value
        ELSE rate_limit.window_started_at
      END,
      request_count = CASE
        WHEN rate_limit.window_started_at <= current_time_value - action_window
          THEN 1
        ELSE least(rate_limit.request_count + 1, action_limit + 1)
      END
  RETURNING request_count INTO resulting_count;

  RETURN resulting_count <= action_limit;
END;
$function$;
REVOKE ALL ON FUNCTION public.check_creation_rate_limit(text) FROM PUBLIC, anon;

CREATE FUNCTION public.current_account_role(p_account_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
  SELECT member.role
  FROM public.account_members AS member
  WHERE member.account_id = p_account_id
    AND member.user_id = auth.uid()
$function$;

CREATE FUNCTION public.has_account_role(p_account_id uuid, p_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
  SELECT coalesce(public.current_account_role(p_account_id) = ANY (p_roles), false)
$function$;

CREATE FUNCTION public.create_customer_account(p_name text)
RETURNS TABLE (allowed boolean, account_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  account_id_value uuid;
  user_id_value uuid := auth.uid();
BEGIN
  IF user_id_value IS NULL OR p_name IS NULL
    OR length(btrim(p_name)) NOT BETWEEN 2 AND 80 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid account name or user';
  END IF;

  IF NOT public.check_creation_rate_limit('account') THEN
    RETURN QUERY SELECT false, NULL::uuid;
    RETURN;
  END IF;

  INSERT INTO public.customer_accounts (name, created_by)
  VALUES (btrim(p_name), user_id_value)
  RETURNING id INTO account_id_value;

  INSERT INTO public.account_members (account_id, user_id, role)
  VALUES (account_id_value, user_id_value, 'owner');

  RETURN QUERY SELECT true, account_id_value;
END;
$function$;
REVOKE ALL ON FUNCTION public.create_customer_account(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_customer_account(text) TO authenticated;

CREATE FUNCTION public.enforce_application_plan_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  assigned_plan text;
  maximum_applications numeric;
  current_applications bigint;
BEGIN
  SELECT assignment.plan_id INTO assigned_plan
  FROM public.account_plan_assignments AS assignment
  JOIN public.hosting_plans AS plan
    ON plan.id = assignment.plan_id AND plan.active
  WHERE assignment.account_id = NEW.account_id
    AND assignment.status = 'active'
    AND (assignment.ends_at IS NULL OR assignment.ends_at > now())
  FOR UPDATE OF assignment;

  IF assigned_plan IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'An active hosting plan is required';
  END IF;

  SELECT entitlement.limit_value INTO maximum_applications
  FROM public.plan_entitlements AS entitlement
  WHERE entitlement.plan_id = assigned_plan
    AND entitlement.entitlement_key = 'applications.max';

  IF maximum_applications IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Application quota is not configured for the active plan';
  END IF;

  SELECT count(*) INTO current_applications
  FROM public.applications
  WHERE account_id = NEW.account_id;

  IF current_applications >= maximum_applications THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Application quota reached';
  END IF;

  RETURN NEW;
END;
$function$;
CREATE TRIGGER applications_enforce_plan_quota
  BEFORE INSERT ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.enforce_application_plan_quota();

CREATE FUNCTION public.create_customer_application(p_account_id uuid, p_name text)
RETURNS TABLE (allowed boolean, reason text, application_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  account_role text;
  created_application_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'Authentication required';
  END IF;
  IF p_account_id IS NULL OR p_name IS NULL
    OR length(btrim(p_name)) NOT BETWEEN 2 AND 80 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid application input';
  END IF;

  account_role := public.current_account_role(p_account_id);
  IF account_role IS NULL OR account_role NOT IN ('owner', 'admin', 'editor') THEN
    RETURN QUERY SELECT false, 'forbidden'::text, NULL::uuid;
    RETURN;
  END IF;

  IF NOT public.check_creation_rate_limit('application') THEN
    RETURN QUERY SELECT false, 'rate_limited'::text, NULL::uuid;
    RETURN;
  END IF;

  INSERT INTO public.applications (account_id, name, framework, status)
  VALUES (p_account_id, btrim(p_name), 'nextjs', 'active')
  RETURNING id INTO created_application_id;

  RETURN QUERY SELECT true, NULL::text, created_application_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.create_customer_application(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_customer_application(uuid, text) TO authenticated;

CREATE FUNCTION public.enforce_deployment_plan_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  assigned_plan text;
  maximum_concurrent_deployments numeric;
  active_deployments bigint;
BEGIN
  SELECT assignment.plan_id INTO assigned_plan
  FROM public.account_plan_assignments AS assignment
  JOIN public.hosting_plans AS plan
    ON plan.id = assignment.plan_id AND plan.active
  WHERE assignment.account_id = NEW.account_id
    AND assignment.status = 'active'
    AND (assignment.ends_at IS NULL OR assignment.ends_at > now())
  FOR UPDATE OF assignment;

  IF assigned_plan IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'An active hosting plan is required';
  END IF;

  SELECT entitlement.limit_value INTO maximum_concurrent_deployments
  FROM public.plan_entitlements AS entitlement
  WHERE entitlement.plan_id = assigned_plan
    AND entitlement.entitlement_key = 'deployments.concurrent.max';

  IF maximum_concurrent_deployments IS NULL
    OR maximum_concurrent_deployments <> trunc(maximum_concurrent_deployments) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Deployment quota is not configured for the active plan';
  END IF;

  SELECT count(*) INTO active_deployments
  FROM public.deployments AS deployment
  WHERE deployment.account_id = NEW.account_id
    AND deployment.status IN ('queued', 'building', 'image_ready', 'deploying');

  IF active_deployments >= maximum_concurrent_deployments THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Concurrent deployment quota reached';
  END IF;

  RETURN NEW;
END;
$function$;
CREATE TRIGGER deployments_enforce_plan_quota
  BEFORE INSERT ON public.deployments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_deployment_plan_quota();

CREATE FUNCTION public.enforce_deployment_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  valid_transition boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'queued' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Deployment must start queued';
    END IF;
    NEW.started_at := NULL;
    NEW.finished_at := NULL;
  ELSE
    IF NEW.account_id <> OLD.account_id
      OR NEW.application_id <> OLD.application_id
      OR NEW.idempotency_key <> OLD.idempotency_key
      OR NEW.request_hash <> OLD.request_hash THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Deployment identity is immutable';
    END IF;

    valid_transition := CASE OLD.status
      WHEN 'queued' THEN NEW.status IN ('building', 'failed', 'cancelled')
      WHEN 'building' THEN NEW.status IN ('image_ready', 'failed', 'cancelled')
      WHEN 'image_ready' THEN NEW.status IN ('deploying', 'failed', 'cancelled')
      WHEN 'deploying' THEN NEW.status IN ('ready', 'failed')
      ELSE false
    END;

    IF NEW.status <> OLD.status AND NOT valid_transition THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid deployment state transition';
    END IF;
    IF NEW.status = OLD.status THEN
      RETURN NEW;
    END IF;

    IF NEW.status IN ('building', 'deploying') AND NEW.started_at IS NULL THEN
      NEW.started_at := now();
    END IF;
    IF NEW.status IN ('ready', 'failed', 'cancelled') THEN
      NEW.finished_at := now();
    ELSE
      NEW.finished_at := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE FUNCTION public.record_deployment_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  event_number integer;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  SELECT coalesce(max(event.sequence_number), 0) + 1
    INTO event_number
  FROM public.deployment_events AS event
  WHERE event.deployment_id = NEW.id;

  INSERT INTO public.deployment_events (
    deployment_id, sequence_number, event_type, from_status, to_status,
    actor_user_id, metadata
  ) VALUES (
    NEW.id, event_number, 'status_changed',
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
    NEW.status, auth.uid(), '{}'::jsonb
  );

  RETURN NEW;
END;
$function$;
CREATE TRIGGER deployments_validate_transitions
  BEFORE INSERT OR UPDATE ON public.deployments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_deployment_transition();
CREATE TRIGGER deployments_record_events
  AFTER INSERT OR UPDATE ON public.deployments
  FOR EACH ROW EXECUTE FUNCTION public.record_deployment_event();

ALTER TABLE public.customer_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creation_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hosting_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_plan_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployment_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.customer_accounts, public.account_members, public.creation_rate_limits,
  public.hosting_plans, public.plan_entitlements, public.account_plan_assignments,
  public.applications, public.deployments, public.deployment_events
  FROM PUBLIC, anon, authenticated, service_role;

CREATE POLICY customer_accounts_member_read ON public.customer_accounts
  FOR SELECT TO authenticated
  USING (public.current_account_role(id) IS NOT NULL);

CREATE POLICY account_members_same_account_read ON public.account_members
  FOR SELECT TO authenticated
  USING (public.current_account_role(account_id) IS NOT NULL);

CREATE POLICY hosting_plans_active_read ON public.hosting_plans
  FOR SELECT TO authenticated USING (active);

CREATE POLICY plan_entitlements_active_read ON public.plan_entitlements
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.hosting_plans AS plan
    WHERE plan.id = plan_entitlements.plan_id AND plan.active
  ));

CREATE POLICY account_plan_billing_read ON public.account_plan_assignments
  FOR SELECT TO authenticated
  USING (public.has_account_role(account_id, ARRAY['owner', 'admin']));

CREATE POLICY applications_member_read ON public.applications
  FOR SELECT TO authenticated
  USING (public.current_account_role(account_id) IS NOT NULL);

CREATE POLICY applications_editor_update ON public.applications
  FOR UPDATE TO authenticated
  USING (public.has_account_role(account_id, ARRAY['owner', 'admin', 'editor']))
  WITH CHECK (public.has_account_role(account_id, ARRAY['owner', 'admin', 'editor']));

CREATE POLICY applications_admin_delete ON public.applications
  FOR DELETE TO authenticated
  USING (public.has_account_role(account_id, ARRAY['owner', 'admin']));

CREATE POLICY deployments_member_read ON public.deployments
  FOR SELECT TO authenticated
  USING (public.current_account_role(account_id) IS NOT NULL);

CREATE POLICY deployment_events_member_read ON public.deployment_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.deployments AS deployment
    WHERE deployment.id = deployment_id
      AND public.current_account_role(deployment.account_id) IS NOT NULL
  ));

GRANT SELECT ON public.customer_accounts, public.account_members,
  public.hosting_plans, public.plan_entitlements, public.account_plan_assignments,
  public.applications, public.deployments, public.deployment_events TO authenticated;
GRANT UPDATE (name, framework, status, updated_at) ON public.applications TO authenticated;
GRANT SELECT ON public.customer_accounts, public.account_members,
  public.hosting_plans, public.plan_entitlements, public.account_plan_assignments,
  public.applications, public.deployments, public.deployment_events TO service_role;
GRANT UPDATE ON public.applications TO service_role;
GRANT INSERT, UPDATE ON public.deployments TO service_role;
GRANT EXECUTE ON FUNCTION public.current_account_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_account_role(uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_customer_account(text) TO authenticated;
REVOKE ALL ON FUNCTION public.current_account_role(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_account_role(uuid, text[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_customer_account(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.check_creation_rate_limit(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_customer_application(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.enforce_application_plan_quota() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_deployment_plan_quota() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_deployment_transition() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_deployment_event() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_customer_account(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_customer_application(uuid, text) TO authenticated;
