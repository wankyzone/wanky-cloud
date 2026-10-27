"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { authenticatedFetch } from "@/lib/api-client";

type DashboardOverview = {
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

const cardClass = "rounded-xl border border-border bg-surface p-5";

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function readableStatus(value: string): string {
  return value.replaceAll("_", " ");
}

function deploymentStatusClass(status: string): string {
  if (status === "ready") return "border-brand/40 bg-brand-soft text-brand";
  if (status === "failed" || status === "cancelled") {
    return "border-danger-border bg-danger-surface text-danger-text";
  }
  if (["queued", "building", "image_ready", "deploying"].includes(status)) {
    return "border-warning-border bg-warning-surface text-warning-text";
  }
  return "border-border bg-surface-raised text-muted";
}

function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <article className={cardClass}>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-3 text-3xl font-semibold tabular-nums">{value}</p>
      <p className="mt-2 text-xs text-muted">{detail}</p>
    </article>
  );
}

export default function DashboardPage() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    void authenticatedFetch("/api/dashboard/overview")
      .then(async (response) => {
        const body = await response.json() as DashboardOverview & { error?: string };
        if (!response.ok) throw new Error(body.error ?? "Unable to load dashboard overview.");
        return body;
      })
      .then((data) => {
        if (active) {
          setOverview(data);
          setError(null);
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : "Unable to load dashboard overview.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [retry]);

  if (loading) {
    return (
      <section aria-busy="true" aria-label="Loading dashboard overview">
        <p role="status" className="text-sm text-muted">Loading your workspace…</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className={`${cardClass} h-32 animate-pulse`} />
          ))}
        </div>
      </section>
    );
  }

  if (error || !overview) {
    return (
      <section className="max-w-2xl rounded-xl border border-danger-border bg-danger-surface p-6">
        <h2 className="font-semibold text-danger-text">Dashboard overview unavailable</h2>
        <p role="alert" className="mt-2 text-sm leading-6 text-danger-text">
          {error ?? "Unable to load dashboard overview."}
        </p>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            setError(null);
            setRetry((value) => value + 1);
          }}
          className="mt-5 min-h-10 rounded-lg border border-danger-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-brand hover:text-brand"
        >
          Retry
        </button>
      </section>
    );
  }

  const { summary, recentApplications, recentDeployments } = overview;
  const noAccounts = summary.accountCount === 0;
  const noApplications = summary.applicationCount === 0;

  if (noAccounts) {
    return (
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Workspace overview</p>
            <h2 className="mt-2 text-2xl font-semibold">Welcome to Wanky Cloud</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Set up your hosting account to start organizing applications.
            </p>
          </div>
        </header>
        <section className={`${cardClass} mt-8 max-w-2xl border-dashed`}>
          <h3 className="text-lg font-semibold">Create your first hosting account</h3>
          <p className="mt-2 text-sm leading-6 text-muted">
            Accounts let you organize applications and manage access with your team.
          </p>
          <Link
            href="/dashboard/apps/new"
            className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-brand-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-button-hover"
          >
            Set up account
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Workspace overview</p>
          <h2 className="mt-2 text-2xl font-semibold">Welcome to Wanky Cloud</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            A live view of applications and deployment activity across your {summary.accountCount === 1 ? "authorized account" : "authorized accounts"}.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href="#recent-deployments"
            className="inline-flex min-h-11 items-center rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:border-brand hover:text-brand"
          >
            View deployments
          </a>
          <Link
            href="/dashboard/apps"
            className="inline-flex min-h-11 items-center rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:border-brand hover:text-brand"
          >
            View applications
          </Link>
          <Link
            href="/dashboard/apps/new"
            className="inline-flex min-h-11 items-center rounded-lg bg-brand-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-button-hover"
          >
            Create application
          </Link>
        </div>
      </header>

      <section aria-label="Workspace summaries" className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Applications" value={summary.applicationCount} detail={`${summary.activeApplications} active`} />
        <StatCard label="Deployments" value={summary.deploymentCount} detail={`${summary.readyDeployments} ready`} />
        <StatCard label="In progress" value={summary.activeDeployments} detail="Queued, building, or deploying" />
        <StatCard label="Needs attention" value={summary.failedDeployments} detail={`${summary.cancelledDeployments} cancelled`} />
      </section>

      {noApplications ? (
        <section className={`${cardClass} mt-6 border-dashed`}>
          <h3 className="text-lg font-semibold">No applications yet</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Create an application record to get started. An active hosting plan is required, and the isolated build and runtime pipeline is not connected yet.
          </p>
          <Link
            href="/dashboard/apps/new"
            className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-brand-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-button-hover"
          >
            Create your first application
          </Link>
        </section>
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section aria-labelledby="recent-applications-heading" className={cardClass}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 id="recent-applications-heading" className="font-semibold">Recent applications</h3>
                <p className="mt-1 text-sm text-muted">Latest application records across your accounts</p>
              </div>
              <Link href="/dashboard/apps" className="text-sm font-medium text-brand transition-colors hover:text-brand-hover">
                All applications
              </Link>
            </div>

            <ul className="mt-5 divide-y divide-border">
              {recentApplications.map((application) => (
                <li key={application.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{application.name}</p>
                    <p className="mt-1 truncate text-sm text-muted">
                      {application.accountName} · {application.framework}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="rounded-full border border-border bg-surface-raised px-2.5 py-1 text-xs capitalize text-muted">
                      {readableStatus(application.status)}
                    </span>
                    <p className="mt-2 text-xs text-muted">{formatDate(application.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section id="recent-deployments" aria-labelledby="recent-deployments-heading" className={cardClass}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 id="recent-deployments-heading" className="font-semibold">Recent deployments</h3>
                <p className="mt-1 text-sm text-muted">Latest recorded deployment status changes</p>
              </div>
              <Link href="/dashboard/apps" className="text-sm font-medium text-brand transition-colors hover:text-brand-hover">
                Applications
              </Link>
            </div>

            {recentDeployments.length === 0 ? (
              <div className="mt-5 rounded-lg border border-dashed border-border bg-background p-4">
                <p className="text-sm font-medium">No deployment records yet</p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Deployment history will appear here when deployment records exist. The build and runtime pipeline is not connected yet.
                </p>
              </div>
            ) : (
              <ul className="mt-5 space-y-3">
                {recentDeployments.map((deployment) => (
                  <li key={deployment.id} className="rounded-lg border border-border bg-background p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{deployment.applicationName}</p>
                        <p className="mt-1 text-xs text-muted">Created {formatDate(deployment.createdAt)}</p>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-xs capitalize ${deploymentStatusClass(deployment.status)}`}>
                        {readableStatus(deployment.status)}
                      </span>
                    </div>
                    {(deployment.startedAt || deployment.finishedAt || deployment.failureCode) && (
                      <p className="mt-3 text-xs leading-5 text-muted">
                        {deployment.startedAt && <>Started {formatDate(deployment.startedAt)}</>}
                        {deployment.startedAt && deployment.finishedAt && " · "}
                        {deployment.finishedAt && <>Finished {formatDate(deployment.finishedAt)}</>}
                        {deployment.failureCode && <> · {readableStatus(deployment.failureCode)}</>}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
