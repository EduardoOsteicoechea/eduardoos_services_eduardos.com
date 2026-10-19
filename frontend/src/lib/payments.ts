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
  epam: "description",
  articles: "article",
  homescool: "school",
  scrib: "edit_note",
  ereport: "assignment",
  "ereport-connector": "cable",
  evoice: "record_voice_over",
  emusic: "library_music",
  eoproject: "architecture",
  api: "key",
};

/** Fallback catalog when API is unreachable (matches backend ServiceCatalog). */
export const SUBSCRIPTION_SERVICES_FALLBACK: SubscriptionService[] = [
  {
    id: "epam",
    label: "EPAM",
    description: "Cloud EPAM editor, .epam documents, and print export.",
    monthlyUsd: 1,
    icon: "description",
  },
  {
    id: "articles",
    label: "Articles",
    description: "Eligible pamphlets appear in the admin Articles queue; the site admin controls public visibility.",
    monthlyUsd: 1,
    icon: "article",
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
    id: "ereport-connector",
    label: "eReport Connector",
    description: "Use the eReport site connector (website registration binding, quick issue modal, and embed).",
    monthlyUsd: 1,
    icon: "cable",
  },
  {
    id: "evoice",
    label: "eVoice",
    description: "Text-to-audio projects (docs → MP3) with cloud storage under evoice/.",
    monthlyUsd: 1,
    icon: "record_voice_over",
  },
  {
    id: "emusic",
    label: "eMusic",
    description: "Curated music library with section playlists.",
    monthlyUsd: 1,
    icon: "library_music",
  },
  {
    id: "eoproject",
    label: "eoProject",
    description: "Construction project stages, photos, and IFC versions.",
    monthlyUsd: 1,
    icon: "architecture",
  },
  {
    id: "api",
    label: "API",
    description: "Create API keys and call product APIs from external apps.",
    monthlyUsd: 3,
    icon: "key",
  },
];

/** Longer copy for the subscription service info modal (FE enrichment). */
export const SUBSCRIPTION_SERVICE_DETAILS: Record<string, string> = {
  epam:
    "EPAM is the cloud pamphlet editor. Create and edit .epam documents, densify content into print columns, preview PDF layout, and export for print. Your documents stay in your account on eduardoos.com.",
  articles:
    "Articles connects eligible EPAM pamphlets to the public Articles queue. When you publish from the editor, the site admin can approve and surface the piece on /articles. Subscription unlocks the queue path; public visibility remains admin-controlled.",
  homescool:
    "Homescool is the learning workspace for study materials and curriculum sheets. Open the Homeschool hub, browse cycles and days, preview Letter study PDFs, and work with Homescool entitlements for teacher or student flows.",
  scrib:
    "Scrib is a layered US Letter manuscript surface. Keep cloud books and sheets, edit layered content, and export or share manuscript work from your account.",
  ereport:
    "eReport is the issue-tracker product. Create organizations and reports, track items with statuses, attach images, share invites, and keep report data in your cloud workspace.",
  "ereport-connector":
    "eReport Connector binds a website registration report for site feedback. Use the connector hub, quick-issue modal, and embed flows so visitors can file issues into your registered eReport without opening the full workspace.",
  evoice:
    "eVoice turns documents into spoken audio. Create text-to-audio projects, generate MP3 output, and keep project files under your eVoice cloud storage.",
  emusic:
    "eMusic is a curated music library with synchronized lyrics and admin playlists. Subscribe to listen to Salmo 1, Salmo 2, Dreamer, Learner, and saved playlists on eduardoos.com.",
  eoproject:
    "eoProject tracks construction project stages, site photos, and IFC model versions. Organize project progress and share selected project views from your account.",
  api:
    "API access lets you create eos_live_… keys and call product endpoints from external apps and Cursor connectors (EPAM, eReport, Homescool, and related routes). Keys stay owner-scoped; admin tools manage key lifecycle.",
};

export function subscriptionServiceDetails(service: SubscriptionService): string {
  return SUBSCRIPTION_SERVICE_DETAILS[service.id]?.trim() || service.description;
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
  message?: string;
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

/** Thin wrappers so ServiceGate can import access helpers from payments. */
export { checkServiceAccess } from "./serviceAccess";
export type { ServiceAccessResult } from "./serviceAccess";

export function hasServiceAccess(
  serviceId: string,
  entitlements: EntitlementRecord[],
): boolean {
  return entitlements.some(
    (row) => row.service_id === serviceId && entitlementActive(row),
  );
}
