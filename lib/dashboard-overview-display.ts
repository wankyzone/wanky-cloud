export type DashboardOverviewSummary = {
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

export type RecentActivityInput = {
  recentApplications: Array<{
    id: string;
    accountName: string;
    name: string;
    framework: string;
    createdAt: string;
  }>;
  recentDeployments: Array<{
    id: string;
    applicationName: string;
    status: string;
    createdAt: string;
  }>;
};

export type RecentActivityItem = {
  id: string;
  kind: "application" | "deployment";
  title: string;
  detail: string;
  status?: string;
  createdAt: string;
};

export function getDeploymentSuccessRate(summary: DashboardOverviewSummary): {
  value: string;
  detail: string;
} {
  const completed = summary.readyDeployments + summary.failedDeployments;
  if (completed === 0) {
    return {
      value: "—",
      detail: "No completed deployment records",
    };
  }

  const percentage = Math.round((summary.readyDeployments / completed) * 100);
  return {
    value: `${percentage}%`,
    detail: `${summary.readyDeployments} ready of ${completed} completed records`,
  };
}

export function getRecentActivity(data: RecentActivityInput): RecentActivityItem[] {
  const applications: RecentActivityItem[] = data.recentApplications.map((application) => ({
    id: `application-${application.id}`,
    kind: "application",
    title: "Application record added",
    detail: `${application.name} · ${application.accountName} · ${application.framework}`,
    createdAt: application.createdAt,
  }));
  const deployments: RecentActivityItem[] = data.recentDeployments.map((deployment) => ({
    id: `deployment-${deployment.id}`,
    kind: "deployment",
    title: deployment.applicationName,
    detail: "Recorded deployment",
    status: deployment.status,
    createdAt: deployment.createdAt,
  }));

  return [...applications, ...deployments]
    .sort((left, right) => {
      const leftTime = Date.parse(left.createdAt);
      const rightTime = Date.parse(right.createdAt);
      if (Number.isNaN(leftTime)) return Number.isNaN(rightTime) ? 0 : 1;
      if (Number.isNaN(rightTime)) return -1;
      return rightTime - leftTime;
    })
    .slice(0, 8);
}
