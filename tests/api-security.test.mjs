import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";

import {
  parseAccountCreationInput,
  parseApplicationCreationInput,
  parseServerId,
  readJsonBody,
} from "../lib/api-validation.ts";
import { canManageApplications, getAccountRole } from "../lib/account-access.ts";
import {
  countOwnedServers,
  deleteOwnedServer,
  getActiveSubscription,
  getOwnedBalance,
  listOwnedServers,
} from "../lib/owned-data.ts";
import { authenticateRequest } from "../lib/supabase-server.ts";
import {
  parsePaystackPurchase,
  parsePaystackReference,
  verifyPaystackSignature,
} from "../lib/paystack-security.ts";
import {
  resolveIdempotentDeployment,
  transitionDeployment,
} from "../lib/platform/deployment.ts";
import { deploymentPipelineUnavailable } from "../lib/platform/deployment-gate.ts";
import {
  parseSafeDeploymentEventMetadata,
  parseSafeSourceRevision,
  projectDeploymentEvent,
  projectSafeFailureCode,
} from "../lib/platform/metadata.ts";

function createQueryClient() {
  const calls = [];
  const query = {
    from(table) {
      calls.push(["from", table]);
      return this;
    },
    select(columns) {
      calls.push(["select", columns]);
      return this;
    },
    delete() {
      calls.push(["delete"]);
      return this;
    },
    eq(column, value) {
      calls.push(["eq", column, value]);
      return this;
    },
    order(column, options) {
      calls.push(["order", column, options]);
      return this;
    },
    maybeSingle() {
      calls.push(["maybeSingle"]);
      return Promise.resolve({ data: null, error: null });
    },
  };
  return { client: { from: query.from.bind(query) }, calls };
}

test("rejects missing and malformed bearer authorization", async () => {
  const requestWithoutToken = new Request("https://example.test/api", { method: "GET" });
  const missing = await authenticateRequest(requestWithoutToken, () => {
    throw new Error("client factory must not run");
  });
  assert.equal(missing.ok, false);
  assert.equal(missing.response.status, 401);
  assert.deepEqual(await missing.response.json(), {
    error: "Authentication required.",
    code: "unauthorized",
  });

  const malformed = await authenticateRequest(
    new Request("https://example.test/api", {
      headers: { Authorization: "Basic token" },
    }),
    () => {
      throw new Error("client factory must not run");
    },
  );
  assert.equal(malformed.ok, false);
  assert.equal(malformed.response.status, 401);
});

test("validates the token and binds database requests to that bearer token", async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "public-test-key";
  let suppliedOptions;
  let suppliedToken;
  const user = { id: "user-1" };

  const result = await authenticateRequest(
    new Request("https://example.test/api", {
      headers: { Authorization: "Bearer access-token" },
    }),
    (url, key, options) => {
      suppliedOptions = options;
      assert.equal(url, process.env.NEXT_PUBLIC_SUPABASE_URL);
      assert.equal(key, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      return {
        auth: {
          getUser: async (token) => {
            suppliedToken = token;
            return { data: { user }, error: null };
          },
        },
      };
    },
  );

  assert.equal(result.ok, true);
  assert.equal(result.user, user);
  assert.equal(suppliedToken, "access-token");
  assert.equal(suppliedOptions.global.headers.Authorization, "Bearer access-token");
  assert.equal(suppliedOptions.auth.persistSession, false);
});

test("returns a non-success configuration response when required Supabase env is missing", async () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  try {
    const result = await authenticateRequest(
      new Request("https://example.test/api", {
        headers: { Authorization: "Bearer access-token" },
      }),
      () => {
        throw new Error("client factory must not run");
      },
    );
    assert.equal(result.ok, false);
    assert.equal(result.response.status, 500);
    assert.deepEqual(await result.response.json(), {
      error: "Service configuration is incomplete.",
      code: "server_misconfigured",
    });
  } finally {
    if (originalUrl !== undefined) process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    if (originalKey !== undefined) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey;
  }
});

test("rejects remote Supabase URLs that would send bearer tokens over plaintext HTTP", async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://remote.example.test";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "public-test-key";

  const result = await authenticateRequest(
    new Request("https://example.test/api", {
      headers: { Authorization: "Bearer access-token" },
    }),
    () => {
      throw new Error("client factory must not run");
    },
  );

  assert.equal(result.ok, false);
  assert.equal(result.response.status, 500);
  assert.deepEqual(await result.response.json(), {
    error: "Service configuration is invalid.",
    code: "server_misconfigured",
  });
});

test("rejects invalid server IDs", () => {
  assert.equal(parseServerId(undefined), null);
  assert.equal(parseServerId(42), null);
  assert.equal(parseServerId("  "), null);
  assert.equal(parseServerId("x".repeat(129)), null);
  assert.equal(parseServerId(" srv-123 "), "srv-123");
});

test("bounds JSON bodies by declared and streamed size and rejects malformed requests", async () => {
  const tooLargeByHeader = await readJsonBody(new Request("https://example.test/api", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "content-length": "1025",
    },
    body: "{}",
  }));
  assert.deepEqual(tooLargeByHeader, {
    ok: false,
    status: 413,
    code: "body_too_large",
    message: "Request body is too large.",
  });

  const streamedBody = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("x".repeat(1025)));
      controller.close();
    },
  });
  const tooLargeWhileReading = await readJsonBody(new Request("https://example.test/api", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: streamedBody,
    duplex: "half",
  }));
  assert.equal(tooLargeWhileReading.ok, false);
  assert.equal(tooLargeWhileReading.status, 413);

  const malformed = await readJsonBody(new Request("https://example.test/api", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{",
  }));
  assert.equal(malformed.ok, false);
  assert.equal(malformed.status, 400);

  const wrongContentType = await readJsonBody(new Request("https://example.test/api", {
    method: "POST",
    headers: { "content-type": "text/plain" },
    body: "{}",
  }));
  assert.equal(wrongContentType.ok, false);
  assert.equal(wrongContentType.status, 400);
});

test("accepts only exact account and application creation fields", () => {
  assert.deepEqual(parseAccountCreationInput({ name: " Acme " }), { name: "Acme" });
  assert.equal(parseAccountCreationInput({ name: "Acme", accountId: "forged" }), null);
  assert.equal(parseAccountCreationInput({ name: "x".repeat(81) }), null);

  assert.deepEqual(
    parseApplicationCreationInput({
      accountId: "123e4567-e89b-42d3-a456-426614174000",
      name: " Site ",
    }),
    { accountId: "123e4567-e89b-42d3-a456-426614174000", name: "Site" },
  );
  assert.equal(
    parseApplicationCreationInput({ accountId: "not-a-uuid", name: "Site" }),
    null,
  );
  assert.equal(
    parseApplicationCreationInput({
      accountId: "123e4567-e89b-42d3-a456-426614174000",
      name: "Site",
      userId: "forged",
    }),
    null,
  );
});

test("validates and projects only safe source revision and deployment event metadata", () => {
  const githubRevision = {
    provider: "github",
    repository_id: "12345",
    commit_sha: "a".repeat(40),
    upload_ref: null,
  };
  assert.deepEqual(parseSafeSourceRevision(githubRevision), {
    provider: "github",
    repositoryId: "12345",
    commitSha: "a".repeat(40),
  });
  assert.equal(parseSafeSourceRevision({ ...githubRevision, access_token: "secret" }), null);

  const uploadRevision = {
    provider: "upload",
    repository_id: null,
    commit_sha: null,
    upload_ref: "uploads/123e4567-e89b-42d3-a456-426614174000/123e4567-e89b-42d3-a456-426614174001",
  };
  assert.deepEqual(parseSafeSourceRevision(uploadRevision), { provider: "upload" });

  assert.deepEqual(parseSafeDeploymentEventMetadata({
    phase: "build",
    code: "build_failed",
    retryable: true,
    attempt: 2,
  }), {
    phase: "build",
    code: "build_failed",
    retryable: true,
    attempt: 2,
  });
  assert.equal(
    parseSafeDeploymentEventMetadata({ phase: "build", access_token: "secret" }),
    null,
  );
  assert.equal(parseSafeDeploymentEventMetadata({ code: "provider said secret" }), null);

  const projected = projectDeploymentEvent({
    id: 1,
    deployment_id: "123e4567-e89b-42d3-a456-426614174000",
    sequence_number: 1,
    event_type: "status_changed",
    from_status: null,
    to_status: "queued",
    metadata: { phase: "source" },
    created_at: "2026-10-26T00:00:00.000Z",
    message: "sensitive provider response",
    authorization: "secret",
  });
  assert.deepEqual(Object.keys(projected).sort(), [
    "createdAt",
    "deploymentId",
    "eventType",
    "fromStatus",
    "id",
    "metadata",
    "sequenceNumber",
    "toStatus",
  ]);
  assert.equal("message" in projected, false);
  assert.equal("authorization" in projected, false);
  assert.equal(projectSafeFailureCode("provider returned a token"), null);
});

test("deployment requests remain unavailable until the real pipeline is connected", async () => {
  const response = deploymentPipelineUnavailable();
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error: "Deployments are unavailable until the isolated build and runtime pipeline is connected.",
    code: "deployment_pipeline_unavailable",
  });
});

test("scopes server list and deletion queries to the authenticated owner", () => {
  const listing = createQueryClient();
  listOwnedServers(listing.client, "user-1");
  assert.ok(listing.calls.some(([method, column, value]) => method === "eq" && column === "user_id" && value === "user-1"));

  const deletion = createQueryClient();
  deleteOwnedServer(deletion.client, "user-1", "srv-123");
  assert.ok(deletion.calls.some(([method, column, value]) => method === "eq" && column === "id" && value === "srv-123"));
  assert.ok(deletion.calls.some(([method, column, value]) => method === "eq" && column === "user_id" && value === "user-1"));
});

test("scopes balance lookup to the authenticated profile ID", () => {
  const balance = createQueryClient();
  getOwnedBalance(balance.client, "user-1");
  assert.ok(balance.calls.some(([method, column, value]) => method === "eq" && column === "id" && value === "user-1"));
});

test("scopes subscription and server quota checks to the authenticated user", () => {
  const subscription = createQueryClient();
  getActiveSubscription(subscription.client, "user-1");
  assert.ok(subscription.calls.some(([method, column, value]) => method === "eq" && column === "user_id" && value === "user-1"));
  assert.ok(subscription.calls.some(([method, column, value]) => method === "eq" && column === "status" && value === "active"));

  const quota = createQueryClient();
  countOwnedServers(quota.client, "user-1");
  assert.ok(quota.calls.some(([method, column, value]) => method === "eq" && column === "user_id" && value === "user-1"));
});

test("uses server-controlled wallet and plan amounts and rejects manipulated fields", () => {
  assert.deepEqual(parsePaystackPurchase({ type: "wallet" }), {
    type: "wallet",
    amountKobo: 500000,
  });
  assert.deepEqual(parsePaystackPurchase({ type: "subscription", planId: "pro" }), {
    type: "subscription",
    planId: "pro",
    amountKobo: 1500000,
  });
  assert.equal(parsePaystackPurchase({ type: "wallet", amount: 1 }), null);
  assert.equal(parsePaystackPurchase({ type: "subscription", planId: "pro", amount: 1 }), null);
  assert.equal(parsePaystackPurchase({ type: "subscription", planId: "unknown" }), null);
});

test("accepts only well-formed transaction references", () => {
  assert.equal(parsePaystackReference("transaction_123456"), "transaction_123456");
  assert.equal(parsePaystackReference(""), null);
  assert.equal(parsePaystackReference("short"), null);
  assert.equal(parsePaystackReference("reference with spaces"), null);
  assert.equal(parsePaystackReference(123), null);
});

test("verifies webhook HMAC over the exact raw body and rejects invalid signatures", () => {
  const rawBody = '{"event":"charge.success","data":{"reference":"ref_12345678"}}';
  const secret = "test-secret";
  const signature = createHmac("sha512", secret).update(rawBody).digest("hex");

  assert.equal(verifyPaystackSignature(rawBody, signature, secret), true);
  assert.equal(verifyPaystackSignature(`${rawBody} `, signature, secret), false);
  assert.equal(verifyPaystackSignature(rawBody, "invalid", secret), false);
  assert.equal(verifyPaystackSignature(rawBody, signature, undefined), false);
});

test("account membership lookup is scoped to both the requested account and signed-in user", async () => {
  const calls = [];
  const query = {
    select(columns) {
      calls.push(["select", columns]);
      return this;
    },
    eq(column, value) {
      calls.push(["eq", column, value]);
      return this;
    },
    maybeSingle() {
      return Promise.resolve({ data: null, error: null });
    },
  };
  const client = { from: (table) => {
    calls.push(["from", table]);
    return query;
  } };

  const { data, error } = await getAccountRole(client, "account-b", "user-a");
  assert.equal(data, null);
  assert.equal(error, null);
  assert.deepEqual(calls, [
    ["from", "account_members"],
    ["select", "role"],
    ["eq", "account_id", "account-b"],
    ["eq", "user_id", "user-a"],
  ]);
  assert.equal(canManageApplications(undefined), false);
  assert.equal(canManageApplications("viewer"), false);
  assert.equal(canManageApplications("editor"), true);
});

test("allows valid deployment lifecycle transitions and rejects invalid transitions", () => {
  const deployment = {
    id: "deployment-1",
    accountId: "account-1",
    applicationId: "application-1",
    idempotencyKey: "request-0001",
    requestHash: "a".repeat(64),
    status: "queued",
  };

  assert.equal(transitionDeployment(deployment, "building").status, "building");
  assert.equal(transitionDeployment(
    transitionDeployment(deployment, "building"),
    "image_ready",
  ).status, "image_ready");
  assert.throws(
    () => transitionDeployment(deployment, "ready"),
    /Invalid deployment transition/,
  );
  assert.throws(
    () => transitionDeployment({ ...deployment, status: "ready" }, "building"),
    /Invalid deployment transition/,
  );
});

test("deployment request idempotency returns the same request and rejects key reuse with changed input", () => {
  const deployment = {
    id: "deployment-1",
    accountId: "account-1",
    applicationId: "application-1",
    idempotencyKey: "request-0001",
    requestHash: "a".repeat(64),
    status: "queued",
  };
  const request = {
    accountId: "account-1",
    applicationId: "application-1",
    idempotencyKey: "request-0001",
    requestHash: "a".repeat(64),
  };

  assert.deepEqual(resolveIdempotentDeployment([deployment], request), {
    kind: "existing",
    deployment,
  });
  assert.equal(resolveIdempotentDeployment([], request).kind, "created");
  assert.equal(resolveIdempotentDeployment([deployment], {
    ...request,
    requestHash: "b".repeat(64),
  }).kind, "conflict");
  assert.equal(resolveIdempotentDeployment([deployment], {
    ...request,
    accountId: "account-2",
  }).kind, "created");
});