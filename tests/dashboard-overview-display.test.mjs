import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getDeploymentSuccessRate,
  getRecentActivity,
} from "../lib/dashboard-overview-display.ts";

const emptySummary = {
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
};

test("does not present a missing completed-deployment sample as zero percent", () => {
  assert.deepEqual(getDeploymentSuccessRate(emptySummary), {
    value: "—",
    detail: "No completed deployment records",
  });
});

test("calculates the recorded success rate from ready and failed records only", () => {
  assert.deepEqual(getDeploymentSuccessRate({
    ...emptySummary,
    readyDeployments: 3,
    failedDeployments: 1,
    cancelledDeployments: 2,
  }), {
    value: "75%",
    detail: "3 ready of 4 completed records",
  });
});

test("combines account-scoped saved records by timestamp and bounds activity", () => {
  const activity = getRecentActivity({
    recentApplications: [{
      id: "app-1",
      accountName: "Production account",
      name: "Website",
      framework: "nextjs",
      createdAt: "2026-10-25T10:00:00Z",
    }],
    recentDeployments: Array.from({ length: 9 }, (_, index) => ({
      id: `deployment-${index}`,
      applicationName: "Website",
      status: index === 0 ? "failed" : "ready",
      createdAt: `2026-10-26T${String(9 + index).padStart(2, "0")}:00:00Z`,
    })),
  });

  assert.equal(activity.length, 8);
  assert.equal(activity[0].id, "deployment-deployment-8");
  assert.equal(activity[0].kind, "deployment");
  assert.equal(activity[0].status, "ready");
  assert.equal(activity.some((item) => item.id === "application-app-1"), false);
});

test("places records without usable timestamps after dated activity", () => {
  const activity = getRecentActivity({
    recentApplications: [{
      id: "app-undated",
      accountName: "Account",
      name: "Undated app",
      framework: "nextjs",
      createdAt: "not-a-date",
    }],
    recentDeployments: [{
      id: "deployment-dated",
      applicationName: "Website",
      status: "ready",
      createdAt: "2026-10-26T10:00:00Z",
    }],
  });

  assert.deepEqual(activity.map((item) => item.id), [
    "deployment-deployment-dated",
    "application-app-undated",
  ]);
});
