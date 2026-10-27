"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { authenticatedFetch } from "@/lib/api-client";

type Account = { id: string; name: string };

export default function NewApplicationPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountName, setAccountName] = useState("");
  const [applicationName, setApplicationName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    void authenticatedFetch("/api/accounts")
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load your account.");
        const data = (await response.json()) as { accounts: Account[] };
        if (active) {
          setAccounts(data.accounts ?? []);
          setLoadError(null);
        }
      })
      .catch((cause: unknown) => {
        if (active) setLoadError(cause instanceof Error ? cause.message : "Unable to load your account.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadAttempt]);

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await authenticatedFetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: accountName }),
      });
      const data = (await response.json()) as { account?: Account; error?: string };
      if (!response.ok || !data.account) throw new Error(data.error ?? "Unable to create account.");
      setAccounts([data.account]);
      setSuccess("Account created. Select a hosting plan before creating an application.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create account.");
    } finally {
      setSaving(false);
    }
  }

  async function createApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accounts[0]) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await authenticatedFetch("/api/apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: accounts[0].id, name: applicationName }),
      });
      const data = (await response.json()) as { application?: { id: string }; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to create application.");
      if (!data.application) throw new Error("The server returned an invalid application response.");
      setSuccess("Application record created. Source connection and deployment are not available yet.");
      setApplicationName("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create application.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p role="status" className="text-sm text-muted">Loading account…</p>;

  return (
    <section className="max-w-2xl">
      <Link href="/dashboard/apps" className="text-sm text-muted transition-colors hover:text-brand">← Applications</Link>
      <h2 className="mt-4 text-2xl font-semibold">New application</h2>
      <p className="mt-1 text-sm text-muted">
        This foundation records your account and application. It does not build or deploy customer code.
      </p>

      {loadError && (
        <div className="mt-5 rounded-lg border border-danger-border bg-danger-surface p-4">
          <p role="alert" className="text-sm text-danger-text">{loadError}</p>
          <button
            onClick={() => {
              setLoading(true);
              setLoadAttempt((attempt) => attempt + 1);
            }}
            className="mt-3 rounded-lg border border-border px-4 py-2 text-sm hover:border-brand"
          >
            Retry loading account
          </button>
        </div>
      )}
      {error && <p role="alert" className="mt-5 rounded-lg border border-danger-border bg-danger-surface p-3 text-sm text-danger-text">{error}</p>}
      {success && <p role="status" className="mt-5 rounded-lg border border-brand/40 bg-brand-soft p-3 text-sm text-brand">{success}</p>}

      {!loadError && accounts.length === 0 ? (
        <form onSubmit={createAccount} className="mt-6 space-y-4 rounded-xl border border-border bg-surface p-6">
          <h3 className="font-semibold">Create an account</h3>
          <label className="block text-sm font-medium">
            Account name
            <input required minLength={2} maxLength={80} value={accountName} onChange={(event) => setAccountName(event.target.value)} className="mt-2 block w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground" />
          </label>
          <button disabled={saving} className="rounded-lg bg-brand-button px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-button-hover disabled:opacity-50">
            {saving ? "Creating…" : "Create account"}
          </button>
        </form>
      ) : !loadError ? (
        <form onSubmit={createApplication} className="mt-6 space-y-4 rounded-xl border border-border bg-surface p-6">
          <h3 className="font-semibold">Application details</h3>
          <p className="text-sm text-muted">Account: {accounts[0].name}</p>
          <label className="block text-sm font-medium">
            Application name
            <input required minLength={2} maxLength={80} value={applicationName} onChange={(event) => setApplicationName(event.target.value)} className="mt-2 block w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground" />
          </label>
          <p className="text-sm text-warning-text">
            A hosting plan must be assigned before an application can be created. Plan selection is not configured yet.
          </p>
          <button disabled={saving} className="rounded-lg bg-brand-button px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-button-hover disabled:opacity-50">
            {saving ? "Creating…" : "Create application"}
          </button>
        </form>
      ) : null}
    </section>
  );
}
