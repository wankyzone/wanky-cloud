"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { authenticatedFetch } from "@/lib/api-client";
import {
  getDeploymentSuccessRate,
  getRecentActivity,
  type DashboardOverviewSummary,
} from "@/lib/dashboard-overview-display";

type DashboardOverview = {
  summary: DashboardOverviewSummary;
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

const cardClass = "rounded-xl border border-border bg-surface p-5 shadow-[0_12px_36px_-28px_rgba(0,0,0,0.9)]";

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function readableStatus(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
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
  tone = "default",
}: {
  label: string;
  value: string | number;
  detail: string;
  tone?: "default" | "unavailable";
}) {
  return (
    <article className={`${cardClass} min-h-36`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted">{label}</p>
        <span
          aria-hidden="true"
          className={`size-2 rounded-full ${tone === "unavailable" ? "bg-muted/70" : "bg-brand"}`}
        />
      </div>
      <p className={`mt-4 text-3xl font-semibold tracking-tight tabular-nums ${tone === "unavailable" ? "text-muted" : "text-foreground"}`}>
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-muted">{detail}</p>
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
  const successRate = getDeploymentSuccessRate(summary);
  const activity = getRecentActivity({ recentApplications, recentDeployments });

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Workspace overview</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Your infrastructure, at a glance.</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Saved account, application, and deployment records within your authorized workspace.
          </p>
        </div>
        <nav aria-label="Overview actions" className="flex flex-wrap gap-2">
          <a
            href="#recent-deployments"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium transition-colors hover:border-brand/60 hover:text-brand"
          >
            Recent activity
          </a>
          <Link
            href="/dashboard/apps"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium transition-colors hover:border-brand/60 hover:text-brand"
          >
            Applications
          </Link>
          <Link
            href="/dashboard/apps/new"
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-button-hover"
          >
            {noAccounts ? "Set up account" : "New application"}
          </Link>
        </nav>
      </header>

      <section aria-label="Operational summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Applications"
          value={summary.applicationCount}
          detail={`${summary.activeApplications} active · ${summary.suspendedApplications} suspended`}
        />
        <StatCard
          label="Deployment records"
          value={summary.deploymentCount}
          detail={`${summary.readyDeployments} ready · ${summary.failedDeployments} failed`}
        />
        <StatCard
          label="Recorded success rate"
          value={successRate.value}
          detail={`${successRate.detail} · excludes cancelled`}
          tone={successRate.value === "—" ? "unavailable" : "default"}
        />
        <StatCard
          label="Platform health"
          value="Not monitored"
          detail="Runtime health telemetry is not connected"
          tone="unavailable"
        />
      </section>

      <section aria-labelledby="resource-map-heading" className={`${cardClass} overflow-hidden`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Resource map</p>
            <h3 id="resource-map-heading" className="mt-1 text-lg font-semibold">Workspace structure</h3>
          </div>
          <p className="text-xs leading-5 text-muted">Saved relationships only · not live infrastructure telemetry</p>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-stretch">
          <ResourceNode
            step="01"
            label="Authorized accounts"
            count={summary.accountCount}
            empty="No authorized accounts found"
            description="Your account scope"
          />
          <ResourceConnector />
          <ResourceNode
            step="02"
            label="Applications"
            count={summary.applicationCount}
            empty="No application records"
            description="Organized within your accounts"
          />
          <ResourceConnector />
          <ResourceNode
            step="03"
            label="Deployment records"
            count={summary.deploymentCount}
            empty="No deployment records"
            description="Stored lifecycle records"
          />
        </div>

        <div className="mt-4 flex flex-col gap-2 rounded-lg border border-warning-border/70 bg-warning-surface/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-warning-text">Build and runtime pipeline not connected</p>
            <p className="mt-1 text-xs leading-5 text-muted">
              Deployment execution and live service health are unavailable; no infrastructure is represented as running.
            </p>
          </div>
          <Link href="/dashboard/apps" className="shrink-0 text-sm font-medium text-brand transition-colors hover:text-brand-hover">
            Manage application records
          </Link>
        </div>
      </section>

      {noApplications ? (
        <section className={`${cardClass} border-dashed`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Getting started</p>
              <h3 className="mt-1 text-lg font-semibold">
                {noAccounts ? "Create your first hosting account" : "No applications yet"}
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                {noAccounts
                  ? "Accounts organize applications and provide a place to manage team access."
                  : "Create an application record to get started. An active hosting plan is required; build and runtime execution is not connected."}
              </p>
            </div>
          <Link
            href="/dashboard/apps/new"
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-brand-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-button-hover"
          >
              {noAccounts ? "Set up account" : "Create application"}
          </Link>
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <section id="recent-deployments" aria-labelledby="recent-activity-heading" className={cardClass}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Workspace feed</p>
              <h3 id="recent-activity-heading" className="mt-1 text-lg font-semibold">Recent activity</h3>
              <p className="mt-1 text-sm text-muted">Latest saved application and deployment records</p>
            </div>
            <Link href="/dashboard/apps" className="text-sm font-medium text-brand transition-colors hover:text-brand-hover">
              View applications
            </Link>
          </div>

          {activity.length === 0 ? (
            <div className="mt-5 rounded-lg border border-dashed border-border bg-background px-4 py-6 text-center">
              <p className="text-sm font-medium">{noAccounts ? "No workspace activity yet" : "No activity records yet"}</p>
              <p className="mt-1 text-sm leading-6 text-muted">
                New account, application, and deployment records will appear here when they are saved.
              </p>
            </div>
          ) : (
            <ol className="mt-4 divide-y divide-border">
              {activity.map((item) => (
                <li key={item.id} className="flex min-w-0 gap-3 py-4 first:pt-2 last:pb-1">
                  <span
                    aria-hidden="true"
                    className={`mt-1.5 size-2 shrink-0 rounded-full ${item.kind === "deployment" && item.status === "failed" ? "bg-danger-text" : "bg-brand"}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                      <p className="truncate text-sm font-medium">
                        {item.title}
                      </p>
                      <time className="shrink-0 text-xs text-muted" dateTime={item.createdAt}>
                        {formatDate(item.createdAt)}
                      </time>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                      {item.kind === "application" ? (
                        <span className="truncate">{item.detail}</span>
                      ) : (
                        <>
                          <span>{item.detail}</span>
                          {item.status && (
                            <span className={`rounded-full border px-2 py-0.5 capitalize ${deploymentStatusClass(item.status)}`}>
                              {readableStatus(item.status)}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section aria-labelledby="alerts-heading" className={cardClass}>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Signals</p>
          <h3 id="alerts-heading" className="mt-1 text-lg font-semibold">Needs attention</h3>
          <p className="mt-1 text-sm text-muted">Based on recorded deployment statuses</p>

          <div className={`mt-5 rounded-lg border p-4 ${summary.failedDeployments > 0 ? "border-danger-border bg-danger-surface" : "border-border bg-background"}`}>
            <p className={`text-2xl font-semibold tabular-nums ${summary.failedDeployments > 0 ? "text-danger-text" : "text-foreground"}`}>
              {summary.failedDeployments}
            </p>
            <p className="mt-1 text-sm font-medium">
              {summary.failedDeployments === 1 ? "Failed deployment record" : "Failed deployment records"}
            </p>
            <p className="mt-2 text-xs leading-5 text-muted">
              {summary.failedDeployments > 0
                ? "Review the recorded failures in your application deployment history."
                : "No failed deployment records were returned for your authorized accounts."}
            </p>
          </div>

          <div className="mt-3 rounded-lg border border-border bg-background p-4">
            <p className="text-sm font-medium text-muted">Live alerts</p>
            <p className="mt-1 text-xs leading-5 text-muted">
              Alerting and runtime health monitoring are not connected. This view does not confirm service health.
            </p>
          </div>
          <Link
            href="/dashboard/apps"
            className="mt-4 inline-flex min-h-10 items-center text-sm font-medium text-brand transition-colors hover:text-brand-hover"
          >
            Open applications <span aria-hidden="true" className="ml-1">→</span>
          </Link>
        </section>
      </div>
    </div>
  );
}

function ResourceNode({
  step,
  label,
  count,
  empty,
  description,
}: {
  step: string;
  label: string;
  count: number;
  empty: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{step}</p>
        <span aria-hidden="true" className="mt-1 size-2 rounded-full bg-brand/80" />
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums">{count}</p>
      <h4 className="mt-1 text-sm font-medium">{label}</h4>
      <p className="mt-1 text-xs leading-5 text-muted">{count === 0 ? empty : description}</p>
    </div>
  );
}

function ResourceConnector() {
  return (
    <div aria-hidden="true" className="hidden items-center justify-center text-brand/70 md:flex">
      <span className="text-lg">→</span>
    </div>
  );
}
