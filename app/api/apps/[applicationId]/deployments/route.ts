import { canManageApplications, getAccountRole } from "@/lib/account-access";
import { apiError, authenticateRequest } from "@/lib/supabase-server";
import { deploymentPipelineUnavailable } from "@/lib/platform/deployment-gate";
import {
  parseSafeSourceRevision,
  projectDeploymentEvent,
  projectSafeFailureCode,
} from "@/lib/platform/metadata";

const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  request: Request,
  context: { params: Promise<{ applicationId: string }> },
) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) return auth.response;

  const { applicationId } = await context.params;
  if (!idPattern.test(applicationId)) {
    return apiError(400, "invalid_application_id", "A valid application ID is required.");
  }

  const { data: application, error: applicationError } = await auth.client
    .from("applications")
    .select("id, account_id")
    .eq("id", applicationId)
    .maybeSingle();
  if (applicationError) return apiError(500, "authorization_failed", "Unable to verify application access.");
  if (!application) return apiError(404, "application_not_found", "Application not found.");

  const { data: membership, error: membershipError } = await getAccountRole(
    auth.client,
    application.account_id,
    auth.user.id,
  );
  if (membershipError) return apiError(500, "authorization_failed", "Unable to verify account access.");
  if (!membership) return apiError(403, "account_access_denied", "Account access denied.");

  const { data, error } = await auth.client
    .from("deployments")
    .select("id, application_id, status, source_revision, created_at, started_at, finished_at, failure_code")
    .eq("account_id", application.account_id)
    .eq("application_id", applicationId)
    .order("created_at", { ascending: false })
    .limit(51);

  if (error) return apiError(500, "deployments_load_failed", "Unable to load deployment history.");
  const hasMoreDeployments = (data?.length ?? 0) > 50;
  const deployments = (data ?? []).slice(0, 50);
  if (deployments.length === 0) return Response.json({ deployments: [] });

  const { data: eventRows, error: eventError } = await auth.client
    .from("deployment_events")
    .select("id, deployment_id, sequence_number, event_type, from_status, to_status, metadata, created_at")
    .in("deployment_id", deployments.map((deployment) => deployment.id))
    .order("sequence_number", { ascending: false })
    .limit(501);

  if (eventError) return apiError(500, "deployments_load_failed", "Unable to load deployment history.");
  const eventsTruncated = (eventRows?.length ?? 0) > 500;
  const projectedEvents = (eventRows ?? []).slice(0, 500).map(projectDeploymentEvent);
  if (projectedEvents.some((event) => event === null)) {
    return apiError(500, "deployments_load_failed", "Unable to load deployment history.");
  }
  const safeEvents = projectedEvents.filter(
    (event): event is NonNullable<typeof event> => event !== null,
  );

  return Response.json({
    deployments: deployments.map((deployment) => ({
      id: deployment.id,
      applicationId: deployment.application_id,
      status: deployment.status,
      sourceRevision: parseSafeSourceRevision(deployment.source_revision),
      createdAt: deployment.created_at,
      startedAt: deployment.started_at,
      finishedAt: deployment.finished_at,
      failureCode: projectSafeFailureCode(deployment.failure_code),
      events: safeEvents
        .filter((event) => event?.deploymentId === deployment.id)
        .map((event) => ({
          id: event.id,
          sequenceNumber: event.sequenceNumber,
          eventType: event.eventType,
          fromStatus: event.fromStatus,
          toStatus: event.toStatus,
          metadata: event.metadata,
          createdAt: event.createdAt,
        }))
        .sort((left, right) => left.sequenceNumber - right.sequenceNumber),
    })),
    hasMoreDeployments,
    eventsTruncated,
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ applicationId: string }> },
) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) return auth.response;

  const { applicationId } = await context.params;
  if (!idPattern.test(applicationId)) {
    return apiError(400, "invalid_application_id", "A valid application ID is required.");
  }

  const { data: application, error: applicationError } = await auth.client
    .from("applications")
    .select("id, account_id")
    .eq("id", applicationId)
    .maybeSingle();
  if (applicationError) return apiError(500, "authorization_failed", "Unable to verify application access.");
  if (!application) return apiError(404, "application_not_found", "Application not found.");

  const { data: membership, error: membershipError } = await getAccountRole(
    auth.client,
    application.account_id,
    auth.user.id,
  );
  if (membershipError) return apiError(500, "authorization_failed", "Unable to verify account access.");
  if (!membership) return apiError(403, "account_access_denied", "Account access denied.");
  if (!canManageApplications(membership.role)) {
    return apiError(403, "deployment_forbidden", "You do not have permission to deploy this application.");
  }

  return deploymentPipelineUnavailable();
}
