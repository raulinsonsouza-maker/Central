import type { MetaInsightRow } from "@/lib/meta/metaClient";

function parseNum(val: string | undefined): number {
  if (val === undefined || val === null || val === "") return 0;
  const n = parseFloat(String(val).trim().replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function sumActionByType(
  actions: Array<{ action_type: string; value: string }> | undefined,
  type: string
): number {
  if (!actions?.length) return 0;
  return actions
    .filter((a) => (a.action_type || "").toLowerCase().includes(type.toLowerCase()))
    .reduce((sum, a) => sum + parseNum(a.value), 0);
}

function sumActionValueByType(
  actionValues: Array<{ action_type: string; value: string }> | undefined,
  type: string
): number {
  if (!actionValues?.length) return 0;
  return actionValues
    .filter((a) => (a.action_type || "").toLowerCase().includes(type.toLowerCase()))
    .reduce((sum, a) => sum + parseNum(a.value), 0);
}

export interface MetaInsightPayload {
  data: Date;
  impressoes: number;
  cliques: number;
  leads: number;
  conversoes: number;
  onFacebookLeads: number;
  websiteLeads: number;
  messagingConversationsStarted: number;
  contacts: number;
  purchases: number;
  investimento: number;
  cpl: number | null;
  costPerPurchase: number | null;
  websitePurchaseRoas: number | null;
  websitePurchasesConversionValue: number;
  alcance: number;
  checkoutIniciado: number;
}

/**
 * Map a single Meta insight row (daily) to the payload expected by upsertFatoMidia.
 */
export function mapMetaInsightToFatoPayload(row: MetaInsightRow): MetaInsightPayload {
  const spend = parseNum(row.spend);
  const impressions = parseNum(row.impressions);
  const clicks = parseNum(row.clicks);
  const actions = row.actions ?? [];
  const actionValues = row.action_values ?? [];

  const leadCount = sumActionByType(actions, "lead");
  const purchaseCount =
    sumActionByType(actions, "purchase") || sumActionByType(actions, "omni_purchase");
  const purchaseValue =
    sumActionValueByType(actionValues, "purchase") ||
    sumActionValueByType(actionValues, "omni_purchase");

  const onFacebookLeads = sumActionByType(actions, "on_fb");
  const websiteLeads = sumActionByType(actions, "website");
  const messagingConversationsStarted = sumActionByType(actions, "messaging_conversation");
  const contacts = sumActionByType(actions, "contact");
  const checkoutIniciado = sumActionByType(actions, "initiate_checkout");

  const leads = leadCount || websiteLeads || onFacebookLeads;
  const cpl = leads > 0 ? spend / leads : null;
  const costPerPurchase = purchaseCount > 0 ? spend / purchaseCount : null;
  const websitePurchaseRoas = spend > 0 && purchaseValue > 0 ? purchaseValue / spend : null;

  const dateStr = row.date_start ?? row.date_stop;
  const data = dateStr ? new Date(dateStr + "T12:00:00Z") : new Date();

  const alcance = parseNum(row.reach);

  return {
    data,
    impressoes: impressions,
    cliques: clicks,
    leads,
    conversoes: purchaseCount,
    onFacebookLeads: onFacebookLeads || (leadCount && !websiteLeads ? leadCount : 0),
    websiteLeads: websiteLeads || 0,
    messagingConversationsStarted: messagingConversationsStarted || 0,
    contacts: contacts || 0,
    purchases: purchaseCount,
    investimento: spend,
    cpl,
    costPerPurchase,
    websitePurchaseRoas,
    websitePurchasesConversionValue: purchaseValue,
    alcance,
    checkoutIniciado,
  };
}
