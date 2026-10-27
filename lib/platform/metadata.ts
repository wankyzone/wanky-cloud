export type SafeSourceRevision =
  | {
      provider: "github";
      repositoryId: string;
      commitSha: string;
    }
  | { provider: "upload" };

export type SafeDeploymentEventMetadata = {
  phase?: "source" | "build" | "publish" | "deploy" | "health" | "cleanup";
  code?: string;
  retryable?: boolean;
  attempt?: number;
};

const sourceRevisionKeys = ["provider", "repository_id", "commit_sha", "upload_ref"];
const eventMetadataKeys = ["phase", "code", "retryable", "attempt"];
const eventCodes = [
  "source_unavailable",
  "build_failed",
  "publish_failed",
  "deploy_failed",
  "health_check_failed",
  "cleanup_failed",
  "invalid_configuration",
  "cancelled",
];

export function projectSafeFailureCode(value: unknown): string | null {
  return typeof value === "string" && eventCodes.includes(value) ? value : null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}

export function parseSafeSourceRevision(value: unknown): SafeSourceRevision | null {
  if (!isPlainObject(value) || !hasOnlyKeys(value, sourceRevisionKeys)) return null;
  if (!sourceRevisionKeys.every((key) => Object.hasOwn(value, key))) return null;

  if (value.provider === "github") {
    if (
      typeof value.repository_id !== "string" ||
      !/^[1-9][0-9]{0,19}$/.test(value.repository_id) ||
      typeof value.commit_sha !== "string" ||
      !/^[a-f0-9]{40,64}$/i.test(value.commit_sha) ||
      value.upload_ref !== null
    ) {
      return null;
    }

    return {
      provider: "github",
      repositoryId: value.repository_id,
      commitSha: value.commit_sha,
    };
  }

  if (
    value.provider === "upload" &&
    value.repository_id === null &&
    value.commit_sha === null &&
    typeof value.upload_ref === "string" &&
    /^uploads\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value.upload_ref)
  ) {
    return { provider: "upload" };
  }

  return null;
}

export function parseSafeDeploymentEventMetadata(
  value: unknown,
): SafeDeploymentEventMetadata | null {
  if (!isPlainObject(value) || !hasOnlyKeys(value, eventMetadataKeys)) return null;

  const result: SafeDeploymentEventMetadata = {};
  if (Object.hasOwn(value, "phase")) {
    if (
      value.phase !== "source" &&
      value.phase !== "build" &&
      value.phase !== "publish" &&
      value.phase !== "deploy" &&
      value.phase !== "health" &&
      value.phase !== "cleanup"
    ) {
      return null;
    }
    result.phase = value.phase;
  }
  if (Object.hasOwn(value, "code")) {
    if (typeof value.code !== "string" || !eventCodes.includes(value.code)) return null;
    result.code = value.code;
  }
  if (Object.hasOwn(value, "retryable")) {
    if (typeof value.retryable !== "boolean") return null;
    result.retryable = value.retryable;
  }
  if (Object.hasOwn(value, "attempt")) {
    if (
      typeof value.attempt !== "number" ||
      !Number.isSafeInteger(value.attempt) ||
      value.attempt < 1 ||
      value.attempt > 100
    ) {
      return null;
    }
    result.attempt = value.attempt;
  }

  return result;
}

export function projectDeploymentEvent(value: unknown) {
  if (!isPlainObject(value)) return null;
  const metadata = parseSafeDeploymentEventMetadata(value.metadata);
  const eventId =
    typeof value.id === "string" && /^\d{1,19}$/.test(value.id)
      ? value.id
      : Number.isSafeInteger(value.id)
        ? String(value.id)
        : null;
  const sequenceNumber = value.sequence_number;
  if (
    !metadata ||
    eventId === null ||
    typeof value.deployment_id !== "string" ||
    typeof sequenceNumber !== "number" ||
    !Number.isSafeInteger(sequenceNumber) ||
    typeof value.event_type !== "string" ||
    value.event_type !== "status_changed" ||
    typeof value.created_at !== "string"
  ) {
    return null;
  }

  const statuses = ["queued", "building", "image_ready", "deploying", "ready", "failed", "cancelled"];
  const fromStatus = value.from_status;
  const toStatus = value.to_status;
  if (
    (fromStatus !== null && !statuses.includes(String(fromStatus))) ||
    !statuses.includes(String(toStatus))
  ) {
    return null;
  }

  return {
    id: eventId,
    deploymentId: value.deployment_id,
    sequenceNumber: sequenceNumber as number,
    eventType: "status_changed" as const,
    fromStatus,
    toStatus,
    metadata,
    createdAt: value.created_at,
  };
}
