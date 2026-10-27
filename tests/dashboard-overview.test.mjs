import assert from "node:assert/strict";
import { test } from "node:test";

import { getDashboardOverview } from "../lib/dashboard-overview.ts";

const authorizedAccountId = "account-authorized";
const secondAuthorizedAccountId = "account-also-authorized";
const otherAccountId = "account-not-authorized";

function createOverviewClient({ accounts, applications, deployments, relatedApplications }) {
  const calls = [];
  const authorizedAccountIds = accounts.map((account) => account.id);

  function queryFor(table) {
    const query = {
      filters: [],
      select(columns, options) {
        this.columns = columns;
        this.options = options;
        return this;
      },
      order(column, options) {
        this.orderBy = [column, options];
        return this;
      },
      limit(value) {
        this.limitValue = value;
        return this;
      },
      in(column, values) {
        this.filters.push(["in", column, values]);
        return this;
      },
      eq(column, value) {
        this.filters.push(["eq", column, value]);
        return this;
      },
      then(resolve, reject) {
        calls.push({
          table,
          columns: this.columns,
          options: this.options,
          limit: this.limitValue,
          filters: this.filters,
        });

        let result;
        if (table === "customer_accounts") {
          result = { data: accounts, count: accounts.length, error: null };
        } else if (table === "applications" && this.options?.head) {
          const status = this.filters.find(([kind, column]) => kind === "eq" && column === "status")?.[2];
          const count = applications.filter((application) =>
            authorizedAccountIds.includes(application.account_id) && application.status === status,
          ).length;
          result = { data: null, count, error: null };
        } else if (table === "applications" && this.columns === "id, name") {
          const ids = this.filters.find(([kind, column]) => kind === "in" && column === "id")?.[2] ?? [];
          result = {
            data: relatedApplications.filter((application) => ids.includes(application.id)),
            error: null,
          };
        } else if (table === "applications") {
          const accountIds = this.filters.find(([kind, column]) => kind === "in" && column === "account_id")?.[2] ?? [];
          result = {
            data: applications
              .filter((application) => accountIds.includes(application.account_id))
              .slice(0, this.limitValue),
            error: null,
          };
        } else if (table === "deployments" && this.options?.head) {
          const status = this.filters.find(([kind, column]) => kind === "eq" && column === "status")?.[2];
          const count = deployments.filter((deployment) =>
            authorizedAccountIds.includes(deployment.account_id) && deployment.status === status,
          ).length;
          result = { data: null, count, error: null };
        } else {
          const accountIds = this.filters.find(([kind, column]) => kind === "in" && column === "account_id")?.[2] ?? [];
          result = {
            data: deployments
              .filter((deployment) => accountIds.includes(deployment.account_id))
              .slice(0, this.limitValue),
            error: null,
          };
        }

        return Promise.resolve(result).then(resolve, reject);
      },
    };
    return query;
  }

  return {
    client: { from: queryFor },
    calls,
  };
}

test("aggregates authorized account activity into bounded safe dashboard data", async () => {
  const { client, calls } = createOverviewClient({
    accounts: [
      { id: authorizedAccountId, name: "Authorized account", created_at: "2026-01-01", secret: "hidden" },
      { id: secondAuthorizedAccountId, name: "Second authorized account", created_at: "2026-02-01" },
    ],
    applications: [
      {
        id: "app-1",
        account_id: authorizedAccountId,
        name: "Website",
        framework: "nextjs",
        status: "active",
        created_at: "2026-10-26T10:00:00Z",
        api_token: "must-not-leak",
      },
      {
        id: "app-2",
        account_id: secondAuthorizedAccountId,
        name: "Internal tool",
        framework: "nextjs",
        status: "suspended",
        created_at: "2026-10-25T10:00:00Z",
      },
      {
        id: "app-outside",
        account_id: otherAccountId,
        name: "Outside app",
        framework: "nextjs",
        status: "active",
        created_at: "2026-10-26T11:00:00Z",
      },
    ],
    deployments: [
      {
        id: "deploy-1",
        account_id: authorizedAccountId,
        application_id: "app-1",
        status: "ready",
        created_at: "2026-10-26T12:00:00Z",
        started_at: "2026-10-26T12:01:00Z",
        finished_at: "2026-10-26T12:03:00Z",
        failure_code: null,
        source_revision: { access_token: "must-not-leak" },
        runtime_resource_ref: "internal-resource",
      },
      {
        id: "deploy-2",
        account_id: secondAuthorizedAccountId,
        application_id: "app-2",
        status: "building",
        created_at: "2026-10-26T11:00:00Z",
        started_at: "2026-10-26T11:01:00Z",
        finished_at: null,
        failure_code: null,
      },
      {
        id: "deploy-3",
        account_id: authorizedAccountId,
        application_id: "app-1",
        status: "failed",
        created_at: "2026-10-26T10:00:00Z",
        started_at: "2026-10-26T10:01:00Z",
        finished_at: "2026-10-26T10:03:00Z",
        failure_code: "build_failed",
      },
      {
        id: "deploy-outside",
        account_id: otherAccountId,
        application_id: "app-outside",
        status: "failed",
        created_at: "2026-10-26T13:00:00Z",
        started_at: null,
        finished_at: "2026-10-26T13:01:00Z",
        failure_code: "build_failed",
      },
    ],
    relatedApplications: [
      { id: "app-1", name: "Website", api_token: "must-not-leak" },
      { id: "app-2", name: "Internal tool" },
    ],
  });

  const result = await getDashboardOverview(client);
  assert.equal(result.ok, true);
  assert.deepEqual(result.data.summary, {
    accountCount: 2,
    applicationCount: 2,
    activeApplications: 1,
    suspendedApplications: 1,
    archivedApplications: 0,
    deploymentCount: 3,
    activeDeployments: 1,
    readyDeployments: 1,
    failedDeployments: 1,
    cancelledDeployments: 0,
  });
  assert.deepEqual(result.data.recentApplications.map(({ id, accountId, accountName }) => ({
    id,
    accountId,
    accountName,
  })), [
    { id: "app-1", accountId: authorizedAccountId, accountName: "Authorized account" },
    { id: "app-2", accountId: secondAuthorizedAccountId, accountName: "Second authorized account" },
  ]);
  assert.deepEqual(result.data.recentDeployments.map(({ id, applicationName, status }) => ({
    id,
    applicationName,
    status,
  })), [
    { id: "deploy-1", applicationName: "Website", status: "ready" },
    { id: "deploy-2", applicationName: "Internal tool", status: "building" },
    { id: "deploy-3", applicationName: "Website", status: "failed" },
  ]);

  for (const call of calls.filter((entry) => ["applications", "deployments"].includes(entry.table))) {
    assert.ok(call.filters.some(([kind, column, values]) =>
      kind === "in" && column === "account_id"
        && JSON.stringify(values) === JSON.stringify([authorizedAccountId, secondAuthorizedAccountId]),
    ));
  }
  assert.equal(calls.find((call) => call.table === "customer_accounts").limit, 101);
  assert.equal(calls.find((call) => call.table === "applications" && !call.options?.head).limit, 5);
  assert.equal(calls.find((call) => call.table === "deployments" && !call.options?.head).limit, 8);
  assert.equal(calls.filter((call) => call.table === "deployments" && !call.options?.head).length, 1);
  assert.ok(calls.filter((call) => call.options?.head).every((call) => call.limit === undefined));
  assert.equal(JSON.stringify(result.data).includes("must-not-leak"), false);
  assert.equal(JSON.stringify(result.data).includes("internal-resource"), false);
});

test("returns a useful empty overview without querying outside account scope", async () => {
  const { client, calls } = createOverviewClient({
    accounts: [],
    applications: [],
    deployments: [],
    relatedApplications: [],
  });

  const result = await getDashboardOverview(client);
  assert.equal(result.ok, true);
  assert.equal(result.data.summary.accountCount, 0);
  assert.equal(result.data.summary.applicationCount, 0);
  assert.deepEqual(result.data.recentApplications, []);
  assert.deepEqual(result.data.recentDeployments, []);
  assert.deepEqual(calls.map((call) => call.table), ["customer_accounts"]);
});

test("fails explicitly rather than returning misleading summaries for oversized account scopes", async () => {
  const { client, calls } = createOverviewClient({
    accounts: Array.from({ length: 101 }, (_, index) => ({ id: `account-${index}`, name: `Account ${index}` })),
    applications: [],
    deployments: [],
    relatedApplications: [],
  });

  const result = await getDashboardOverview(client);
  assert.deepEqual(result, {
    ok: false,
    status: 422,
    code: "dashboard_account_scope_too_large",
    message: "The dashboard overview cannot load more than 100 authorized accounts at once.",
  });
  assert.deepEqual(calls.map((call) => call.table), ["customer_accounts"]);
});
