"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { authenticatedFetch } from "@/lib/api-client";

type Account = { id: string; name: string };
type Application = {
  id: string;
  name: string;
  framework: string;
  status: string;
  created_at: string;
};

export default function ApplicationsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    void authenticatedFetch("/api/accounts")
      .then(async (accountsResponse) => {
        if (!accountsResponse.ok) throw new Error("Unable to load your accounts.");
        const accountsData = (await accountsResponse.json()) as { accounts: Account[] };
        const nextAccounts = accountsData.accounts ?? [];
        if (nextAccounts.length === 0) return { accounts: nextAccounts, applications: [] };

        const response = await authenticatedFetch(
          `/api/apps?accountId=${encodeURIComponent(nextAccounts[0].id)}`,
        );
        if (!response.ok) throw new Error("Unable to load applications.");
        const data = (await response.json()) as { applications: Application[] };
        return { accounts: nextAccounts, applications: data.applications ?? [] };
      })
      .then((data) => {
        if (!active) return;
        setAccounts(data.accounts);
        setApplications(data.applications);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Unable to load applications.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [retry]);

  if (loading) {
    return <p role="status" className="text-sm text-muted">Loading applications…</p>;
  }

  if (error) {
    return (
      <section className="max-w-2xl rounded-xl border border-danger-border bg-danger-surface p-6">
        <h2 className="font-semibold text-danger-text">Applications could not be loaded</h2>
        <p className="mt-2 text-sm text-danger-text">{error}</p>
        <button className="mt-4 rounded-lg border border-border px-4 py-2 text-sm hover:border-brand" onClick={() => {
          setError(null);
          setLoading(true);
          setRetry((value) => value + 1);
        }}>
          Retry
        </button>
      </section>
    );
  }

  if (accounts.length === 0) {
    return (
      <section className="max-w-2xl rounded-xl border border-border bg-surface p-6">
        <h2 className="text-xl font-semibold">Create your hosting account</h2>
        <p className="mt-2 text-sm text-muted">
          An account is required before you can create applications. Hosting plans and deployment infrastructure are not configured yet.
        </p>
        <Link href="/dashboard/apps/new" className="mt-5 inline-flex rounded-lg bg-brand-button px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-button-hover">
          Set up account
        </Link>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Applications</h2>
          <p className="mt-1 text-sm text-muted">Manage your hosted websites and services.</p>
        </div>
        <Link href="/dashboard/apps/new" className="rounded-lg bg-brand-button px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-button-hover">
          New application
        </Link>
      </div>

      {applications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-8">
          <h3 className="text-lg font-semibold">No applications yet</h3>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Create an application record to get started. A hosting plan is required. Repository builds and AWS deployments are not available until the real deployment pipeline is connected.
          </p>
          <Link href="/dashboard/apps/new" className="mt-5 inline-flex rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:border-brand hover:text-brand">
            Create application
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {applications.map((application) => (
            <li key={application.id} className="rounded-xl border border-border bg-surface p-5">
              <h3 className="font-semibold">{application.name}</h3>
              <p className="mt-1 text-sm text-muted">{application.framework} · {application.status}</p>
              <p className="mt-4 text-xs text-muted">
                Created {new Date(application.created_at).toLocaleDateString()}
              </p>
              <p className="mt-4 rounded-md bg-warning-surface px-3 py-2 text-xs text-warning-text">
                Hosting pipeline not connected
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
