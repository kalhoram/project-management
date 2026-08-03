import { apiRequest } from "@/lib/api/client"
import type { Plan, Invoice, Payment } from "@/lib/types"
import type { SubscriptionResponse } from "@/lib/api/types"

export async function getPlans(): Promise<Plan[]> {
  return apiRequest<Plan[]>("/billing/plans")
}

export async function getPlan(planId: string): Promise<Plan> {
  return apiRequest<Plan>(`/billing/plans/${planId}`)
}

export async function getInvoices(workspaceId: string): Promise<Invoice[]> {
  return apiRequest<Invoice[]>(`/workspaces/${workspaceId}/billing/invoices`)
}

export async function getPayments(_workspaceId?: string): Promise<Payment[]> {
  return apiRequest<Payment[]>("/admin/payments")
}

export async function getSubscription(workspaceId: string): Promise<SubscriptionResponse> {
  return apiRequest<SubscriptionResponse>(`/workspaces/${workspaceId}/billing/subscription`)
}
