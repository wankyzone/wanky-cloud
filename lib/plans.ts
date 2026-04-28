// lib/plans.ts

export type PlanId = "starter" | "pro" | "business";

export const PLANS: Record<
  PlanId,
  {
    name: string;
    cpu: string;
    ram: string;
    disk: string;
    price: number; // in naira
    maxServers: number;
  }
> = {
  starter: {
    name: "Starter",
    cpu: "1 vCPU",
    ram: "1 GB",
    disk: "25 GB SSD",
    price: 5000,
    maxServers: 1,
  },
  pro: {
    name: "Pro",
    cpu: "2 vCPU",
    ram: "4 GB",
    disk: "80 GB SSD",
    price: 15000,
    maxServers: 3,
  },
  business: {
    name: "Business",
    cpu: "4 vCPU",
    ram: "8 GB",
    disk: "160 GB SSD",
    price: 50000,
    maxServers: 10,
  },
};

// optional helper (for UI mapping)
export const PLAN_LIST = Object.entries(PLANS).map(([id, plan]) => ({
  id,
  ...plan,
}));