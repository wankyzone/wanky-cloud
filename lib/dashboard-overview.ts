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

function databaseError(): DashboardOverviewError {
  return {
    ok: false,
    status: 500,
    code: "dashboard_overview_load_failed",
    message: "Unable to load dashboard overview.",
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

  if (accountError) return databaseError();
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
      return error ? null : count;
    }),
  );
  const deploymentCountsQuery = Promise.all(
    deploymentStatuses.map(async (status) => {
      const { count, error } = await client
        .from("deployments")
        .select("id", { count: "exact", head: true })
        .in("account_id", accountIds)
        .eq("status", status);
      return error ? null : count;
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

  if (
    !applicationCounts.every((count): count is number => count !== null) ||
    !deploymentCounts.every((count): count is number => count !== null) ||
    applicationsError ||
    deploymentsError
  ) {
    return databaseError();
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

    if (relatedApplicationsError) return databaseError();
    for (const application of relatedApplications ?? []) {
      applicationNames.set(application.id, application.name);
    }
    if (applicationIds.some((id) => !applicationNames.has(id))) return databaseError();
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
    return databaseError();
  }
  const applicationCount = applicationCounts.reduce((sum, count) => sum + count, 0);
  const deploymentCount = deploymentCounts.reduce((sum, count) => sum + count, 0);

  return {
    ok: true,
    data: {
      summary: {
        accountCount: authorizedAccounts.length,
        applicationCount,
        activeApplications: applicationCounts[0],
        suspendedApplications: applicationCounts[1],
        archivedApplications: applicationCounts[2],
        deploymentCount,
        activeDeployments: deploymentCounts.slice(0, 4).reduce((sum, count) => sum + count, 0),
        readyDeployments: deploymentCounts[4],
        failedDeployments: deploymentCounts[5],
        cancelledDeployments: deploymentCounts[6],
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
