import { delay } from "@/lib/utils"
import { mockPlans, mockInvoices, mockPayments } from "@/lib/mock/data"
import type { Plan, Invoice, Payment } from "@/lib/types"

const LATENCY = 300

export async function getPlans(): Promise<Plan[]> {
  await delay(LATENCY)
  return mockPlans.filter((p) => p.status === "active")
}

export async function getPlan(planId: string): Promise<Plan> {
  await delay(LATENCY)
  const plan = mockPlans.find((p) => p.id === planId)
  if (!plan) throw new Error("Plan not found")
  return plan
}

export async function getInvoices(workspaceId: string): Promise<Invoice[]> {
  await delay(LATENCY)
  return mockInvoices.filter((i) => i.workspaceId === workspaceId)
}

export async function getPayments(workspaceId?: string): Promise<Payment[]> {
  await delay(LATENCY)
  if (!workspaceId) return mockPayments
  return mockPayments.filter((p) => p.workspaceId === workspaceId)
}

export async function getSubscription(workspaceId: string) {
  await delay(LATENCY)
  const plan = mockPlans.find((p) => p.id === "plan-pro")!
  return {
    workspaceId,
    plan,
    renewalDate: "2026-08-01",
    status: "active" as const,
    usage: {
      members: 12,
      projects: 8,
      storageGb: 24,
    },
  }
}
