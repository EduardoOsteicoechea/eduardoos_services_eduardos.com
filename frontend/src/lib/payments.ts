/**
 * Subscription catalog + payment intents (cookie CSRF via api.ts).
 */

import { apiRequest, getMe } from "./api";
import { mustLog } from "./dev-log";

export type BillingPeriod = "monthly" | "yearly";

export type SubscriptionService = {
  id: string;
  label: string;
  description: string;
  monthlyUsd: number;
  icon: string;
};

const SERVICE_ICONS: Record<string, string> = {
  pamphlet: "description",
  homescool: "school",
  scrib: "edit_note",
  ereport: "assignment",
  evoice: "record_voice_over",
  api: "key",
};

/** Fallback catalog when API is unreachable (matches backend ServiceCatalog). */
export const SUBSCRIPTION_SERVICES_FALLBACK: SubscriptionService[] = [
  {
    id: "pamphlet",
    label: "Pamphlet",
    description: "Cloud pamphlet editor and print export.",
    monthlyUsd: 1,
    icon: "description",
  },
  {
    id: "homescool",
    label: "Homescool",
    description: "Homescool learning surface.",
    monthlyUsd: 1,
    icon: "school",
  },
  {
    id: "scrib",
    label: "Scrib",
    description: "Layered US Letter manuscript sheets with cloud books.",
    monthlyUsd: 1,
    icon: "edit_note",
  },
  {
    id: "ereport",
    label: "eReport",
    description: "Issue tracker reports (.ereport) with cloud storage and sharing.",
    monthlyUsd: 1,
    icon: "assignment",
  },
  {
    id: "evoice",
    label: "eVoice",
    description: "Text-to-audio projects (docs → MP3) with cloud storage under evoice/.",
    monthlyUsd: 1,
    icon: "record_voice_over",
  },
  {
    id: "api",
    label: "API",
    description: "Create API keys and call product APIs from external apps.",
    monthlyUsd: 3,
    icon: "key",
  },
];

export const EVOICE_ALLOWLIST_EMAILS = [
  "eliasosteic@gmail.com",
  "laleskavf.2una@gmail.com",
] as const;

export function isEvoiceAllowlisted(email?: string | null): boolean {
  const e = (email ?? "").trim().toLowerCase();
  return EVOICE_ALLOWLIST_EMAILS.some((a) => a === e);
}

export type PaymentIntentResponse = {
  intent_id: string;
  email: string;
  plan_id: string;
  product_name: string;
  hosted_button_id: string;
  currency: string;
  amount: string;
  services?: string[];
  billing_period?: BillingPeriod;
  paypal_checkout_mode?: "xclick" | "hosted";
  paypal_checkout_url?: string;
  paypal_business?: string;
  created_at?: string;
};

export type PaymentStatusResponse = {
  intent_id: string;
  email: string;
  plan_id: string;
  status: string;
  amount?: string;
  currency?: string;
};

export type EntitlementRecord = {
  service_id: string;
  service_label: string;
  billing_period: BillingPeriod;
  valid_from: string;
  valid_until: string;
};

export const PAYPAL_BUTTON_IMAGE =
  "https://www.paypalobjects.com/en_US/i/btn/btn_buynowCC_LG.gif";
export const PAYPAL_FORM_ACTION = "https://www.paypal.com/cgi-bin/webscr";

export function paypalHostedButtonIdFallback(): string {
  const fromEnv = (import.meta.env.PUBLIC_PAYPAL_HOSTED_BUTTON_ID as string | undefined) ?? "";
  return fromEnv.trim();
}

export function monthlyPriceFor(
  serviceId: string,
  catalog: SubscriptionService[] = SUBSCRIPTION_SERVICES_FALLBACK,
): number {
  return catalog.find((s) => s.id === serviceId)?.monthlyUsd ?? 0;
}

export function quoteSubscription(
  serviceIds: string[],
  billingPeriod: BillingPeriod,
  catalog: SubscriptionService[] = SUBSCRIPTION_SERVICES_FALLBACK,
): number {
  const monthly = serviceIds.reduce((sum, id) => sum + monthlyPriceFor(id, catalog), 0);
  return billingPeriod === "yearly" ? monthly * 10 : monthly;
}

export function entitlementActive(row: EntitlementRecord, now = Date.now()): boolean {
  if (!row.valid_until) return true;
  const until = Date.parse(row.valid_until);
  return Number.isFinite(until) ? until >= now : true;
}

function normalizeCatalog(raw: unknown): SubscriptionService[] {
  if (!raw || typeof raw !== "object") return SUBSCRIPTION_SERVICES_FALLBACK;
  const list = (raw as { services?: unknown[]; catalog?: unknown[] }).services
    ?? (raw as { catalog?: unknown[] }).catalog
    ?? (Array.isArray(raw) ? raw : null);
  if (!Array.isArray(list) || list.length === 0) return SUBSCRIPTION_SERVICES_FALLBACK;
  return list.map((item) => {
    const row = item as Record<string, unknown>;
    const id = String(row.id ?? row.ID ?? "");
    return {
      id,
      label: String(row.label ?? row.Label ?? id),
      description: String(row.description ?? row.Description ?? ""),
      monthlyUsd: Number(row.monthlyUsd ?? row.monthly_usd ?? row.MonthlyUSD ?? 0),
      icon: SERVICE_ICONS[id] || "payments",
    };
  }).filter((s) => s.id);
}

export async function fetchSubscriptionCatalog(): Promise<SubscriptionService[]> {
  const { status, data } = await apiRequest<Record<string, unknown>>("/subscriptions/catalog");
  if (mustLog) {
    console.log("[payments] catalog", { status });
  }
  if (status < 200 || status >= 300) return SUBSCRIPTION_SERVICES_FALLBACK;
  return normalizeCatalog(data);
}

export async function createSubscriptionIntent(
  email: string,
  serviceIds: string[],
  billingPeriod: BillingPeriod,
): Promise<{ data: PaymentIntentResponse | null; error?: string; requestId?: string }> {
  const { status, data, requestId } = await apiRequest<PaymentIntentResponse>("/payments/intents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      services: serviceIds,
      billing_period: billingPeriod,
    }),
  });
  if (mustLog) {
    console.log("[payments] intent", { status, requestId, intentId: data.intent_id });
  }
  if (status < 200 || status >= 300 || !data.intent_id) {
    return { data: null, error: data.message || "Could not create payment intent.", requestId };
  }
  return { data, requestId };
}

export async function getPaymentStatus(intentId: string): Promise<PaymentStatusResponse | null> {
  const { status, data } = await apiRequest<PaymentStatusResponse>(
    `/payments/status/${encodeURIComponent(intentId)}`,
  );
  if (status < 200 || status >= 300) return null;
  return data;
}

export async function fetchMyEntitlements(): Promise<EntitlementRecord[]> {
  const { status, data } = await apiRequest<{ entitlements?: EntitlementRecord[] }>(
    "/subscriptions/entitlements",
  );
  if (status < 200 || status >= 300) return [];
  return data.entitlements ?? [];
}

export async function sessionEmail(): Promise<string> {
  const me = await getMe();
  return (me.data.email || "").trim();
}
