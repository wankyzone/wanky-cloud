export type DeploymentStatus =
  | "queued"
  | "building"
  | "image_ready"
  | "deploying"
  | "ready"
  | "failed"
  | "cancelled";

export type DeploymentRecord = {
  id: string;
  accountId: string;
  applicationId: string;
  idempotencyKey: string;
  requestHash: string;
  status: DeploymentStatus;
};

export type DeploymentRequest = Pick<
  DeploymentRecord,
  "accountId" | "applicationId" | "idempotencyKey" | "requestHash"
>;

export type IdempotentDeploymentResult =
  | { kind: "created" }
  | { kind: "existing"; deployment: DeploymentRecord }
  | { kind: "conflict"; deployment: DeploymentRecord };

const transitions: Record<DeploymentStatus, readonly DeploymentStatus[]> = {
  queued: ["building", "failed", "cancelled"],
  building: ["image_ready", "failed", "cancelled"],
  image_ready: ["deploying", "failed", "cancelled"],
  deploying: ["ready", "failed"],
  ready: [],
  failed: [],
  cancelled: [],
};

export function canTransitionDeployment(
  current: DeploymentStatus,
  next: DeploymentStatus,
): boolean {
  return transitions[current].includes(next);
}

export function transitionDeployment(
  deployment: DeploymentRecord,
  next: DeploymentStatus,
): DeploymentRecord {
  if (!canTransitionDeployment(deployment.status, next)) {
    throw new Error(`Invalid deployment transition: ${deployment.status} -> ${next}`);
  }

  return { ...deployment, status: next };
}

export function resolveIdempotentDeployment(
  deployments: readonly DeploymentRecord[],
  request: DeploymentRequest,
): IdempotentDeploymentResult {
  const existing = deployments.find(
    (deployment) =>
      deployment.accountId === request.accountId &&
      deployment.applicationId === request.applicationId &&
      deployment.idempotencyKey === request.idempotencyKey,
  );

  if (!existing) return { kind: "created" };
  return existing.requestHash === request.requestHash
    ? { kind: "existing", deployment: existing }
    : { kind: "conflict", deployment: existing };
}
