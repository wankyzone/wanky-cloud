import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_ACCOUNTS = 100;
const RECENT_APPLICATION_LIMIT = 5;
const RECENT_DEPLOYMENT_LIMIT = 8;

const applicationStatuses = ["active", "suspended", "archived"] as const;
const deploymentStatuses = [
  "queued",
  "building",
  "image_ready",
  "deploying",
  "ready",
  "failed",
  "cancelled",
] as const;

type DashboardOverviewError = {
  ok: false;
  status: number;
  code: string;
  message: string;
  diagnostic?: {
    operation: string;
    errorCode: string;
  };
};

type DashboardOverviewSuccess = {
  ok: true;
  data: {
    summary: {
      accountCount: number;
      applicationCount: number;
      activeApplications: number;
      suspendedApplications: number;
      archivedApplications: number;
      deploymentCount: number;
      activeDeployments: number;
      readyDeployments: number;
      failedDeployments: number;
      cancelledDeployments: number;
    };
    recentApplications: Array<{
      id: string;
      accountId: string;
      accountName: string;
      name: string;
      framework: string;
      status: string;
      createdAt: string;
    }>;
    recentDeployments: Array<{
      id: string;
      applicationId: string;
      applicationName: string;
      status: string;
      createdAt: string;
      startedAt: string | null;
      finishedAt: string | null;
      failureCode: string | null;
    }>;
  };
};

type DashboardOverviewResult = DashboardOverviewError | DashboardOverviewSuccess;

function sanitizedErrorCode(code: unknown): string {
  if (typeof code !== "string") return "unknown";
  const normalized = code.toUpperCase();
  return /^[A-Z0-9]{5}$/.test(normalized) || /^PGRST\d{3}$/.test(normalized)
    ? normalized
    : "unknown";
}

function databaseError(operation: string, errorCode?: unknown): DashboardOverviewError {
  return {
    ok: false,
    status: 500,
    code: "dashboard_overview_load_failed",
    message: "Unable to load dashboard overview.",
    diagnostic: {
      operation,
      errorCode: sanitizedErrorCode(errorCode),
    },
  };
}

export async function getDashboardOverview(
  client: SupabaseClient,
): Promise<DashboardOverviewResult> {
  const { data: accounts, count: accountCount, error: accountError } = await client
    .from("customer_accounts")
    .select("id, name", { count: "exact" })
    .order("created_at", { ascending: true })
    .limit(MAX_ACCOUNTS + 1);

  if (accountError) return databaseError("accounts.read", accountError.code);
  if ((accountCount ?? accounts?.length ?? 0) > MAX_ACCOUNTS) {
    return {
      ok: false,
      status: 422,
      code: "dashboard_account_scope_too_large",
      message: "The dashboard overview cannot load more than 100 authorized accounts at once.",
    };
  }

  const authorizedAccounts = accounts ?? [];
  const accountIds = authorizedAccounts.map((account) => account.id);
  if (accountIds.length === 0) {
    return {
      ok: true,
      data: {
        summary: {
          accountCount: 0,
          applicationCount: 0,
          activeApplications: 0,
          suspendedApplications: 0,
          archivedApplications: 0,
          deploymentCount: 0,
          activeDeployments: 0,
          readyDeployments: 0,
          failedDeployments: 0,
          cancelledDeployments: 0,
        },
        recentApplications: [],
        recentDeployments: [],
      },
    };
  }

  const applicationCountsQuery = Promise.all(
    applicationStatuses.map(async (status) => {
      const { count, error } = await client
        .from("applications")
        .select("id", { count: "exact", head: true })
        .in("account_id", accountIds)
        .eq("status", status);
      return {
        count: error ? null : count,
        errorCode: error?.code,
        status,
      };
    }),
  );
  const deploymentCountsQuery = Promise.all(
    deploymentStatuses.map(async (status) => {
      const { count, error } = await client
        .from("deployments")
        .select("id", { count: "exact", head: true })
        .in("account_id", accountIds)
        .eq("status", status);
      return {
        count: error ? null : count,
        errorCode: error?.code,
        status,
      };
    }),
  );
  const recentApplicationsQuery = client
    .from("applications")
    .select("id, account_id, name, framework, status, created_at")
    .in("account_id", accountIds)
    .order("created_at", { ascending: false })
    .limit(RECENT_APPLICATION_LIMIT);
  const recentDeploymentsQuery = client
    .from("deployments")
    .select("id, application_id, status, created_at, started_at, finished_at, failure_code")
    .in("account_id", accountIds)
    .order("created_at", { ascending: false })
    .limit(RECENT_DEPLOYMENT_LIMIT);

  const [
    applicationCounts,
    deploymentCounts,
    { data: recentApplications, error: applicationsError },
    { data: recentDeployments, error: deploymentsError },
  ] = await Promise.all([
    applicationCountsQuery,
    deploymentCountsQuery,
    recentApplicationsQuery,
    recentDeploymentsQuery,
  ]);

  const failedApplicationCount = applicationCounts.find((result) => result.count === null);
  if (failedApplicationCount) {
    return databaseError(
      `applications.count.${failedApplicationCount.status}`,
      failedApplicationCount.errorCode,
    );
  }
  const failedDeploymentCount = deploymentCounts.find((result) => result.count === null);
  if (failedDeploymentCount) {
    return databaseError(
      `deployments.count.${failedDeploymentCount.status}`,
      failedDeploymentCount.errorCode,
    );
  }
  if (applicationsError) return databaseError("applications.recent", applicationsError.code);
  if (deploymentsError) return databaseError("deployments.recent", deploymentsError.code);

  const applicationCountValues = applicationCounts.map((result) => result.count);
  const deploymentCountValues = deploymentCounts.map((result) => result.count);
  if (!applicationCountValues.every((count): count is number => count !== null)) {
    return databaseError("applications.count.unknown");
  }
  if (!deploymentCountValues.every((count): count is number => count !== null)) {
    return databaseError("deployments.count.unknown");
  }

  const applicationRows = recentApplications ?? [];
  const deploymentRows = recentDeployments ?? [];
  const applicationIds = [...new Set(deploymentRows.map((deployment) => deployment.application_id))];
  const applicationNames = new Map<string, string>();

  if (applicationIds.length > 0) {
    const { data: relatedApplications, error: relatedApplicationsError } = await client
      .from("applications")
      .select("id, name")
      .in("account_id", accountIds)
      .in("id", applicationIds);

    if (relatedApplicationsError) {
      return databaseError("applications.related_names", relatedApplicationsError.code);
    }
    for (const application of relatedApplications ?? []) {
      applicationNames.set(application.id, application.name);
    }
    if (applicationIds.some((id) => !applicationNames.has(id))) {
      return databaseError("projection.deployment_application_name");
    }
  }

  const accountNames = new Map(authorizedAccounts.map((account) => [account.id, account.name]));
  const projectedApplications = applicationRows.map((application) => {
    const accountName = accountNames.get(application.account_id);
    if (!accountName) return null;
    return {
      id: application.id,
      accountId: application.account_id,
      accountName,
      name: application.name,
      framework: application.framework,
      status: application.status,
      createdAt: application.created_at,
    };
  });
  const projectedDeployments = deploymentRows.map((deployment) => {
    const applicationName = applicationNames.get(deployment.application_id);
    if (!applicationName) return null;
    return {
      id: deployment.id,
      applicationId: deployment.application_id,
      applicationName,
      status: deployment.status,
      createdAt: deployment.created_at,
      startedAt: deployment.started_at,
      finishedAt: deployment.finished_at,
      failureCode: deployment.failure_code,
    };
  });

  if (projectedApplications.some((application) => application === null)
    || projectedDeployments.some((deployment) => deployment === null)) {
    return databaseError(
      projectedApplications.some((application) => application === null)
        ? "projection.application_account_name"
        : "projection.deployment_application_name",
    );
  }
  const applicationCount = applicationCountValues.reduce((sum, count) => sum + count, 0);
  const deploymentCount = deploymentCountValues.reduce((sum, count) => sum + count, 0);

  return {
    ok: true,
    data: {
      summary: {
        accountCount: authorizedAccounts.length,
        applicationCount,
        activeApplications: applicationCountValues[0],
        suspendedApplications: applicationCountValues[1],
        archivedApplications: applicationCountValues[2],
        deploymentCount,
        activeDeployments: deploymentCountValues.slice(0, 4).reduce((sum, count) => sum + count, 0),
        readyDeployments: deploymentCountValues[4],
        failedDeployments: deploymentCountValues[5],
        cancelledDeployments: deploymentCountValues[6],
      },
      recentApplications: projectedApplications.filter(
        (application): application is NonNullable<typeof application> => application !== null,
      ),
      recentDeployments: projectedDeployments.filter(
        (deployment): deployment is NonNullable<typeof deployment> => deployment !== null,
      ),
    },
  };
}
