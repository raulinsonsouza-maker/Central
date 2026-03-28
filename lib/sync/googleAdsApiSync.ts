import {
  fetchCampaignMetrics,
  fetchAdCreatives,
  fetchBeginCheckoutConversions,
  fetchPurchaseConversions,
} from "@/lib/googleAds/googleAdsClient";
import {
  aggregateCampaignRowsByDate,
  mapAdCreativeRowToPayload,
} from "@/lib/mappers/googleAdsToDomain";
import { upsertFatoMidia } from "@/lib/repositories/fatosMidiaRepository";
import { upsertGoogleAdsCriativo } from "@/lib/repositories/googleAdsCriativosRepository";
import { findAllClientes } from "@/lib/repositories/clientesRepository";
import { prisma } from "@/lib/db";

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Retorna data de 90 dias atrás para cobrir "últimos 90 dias" do dashboard. */
function getDefaultDateFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 90);
  return formatDate(d);
}

export interface GoogleAdsSyncOptions {
  dateFrom?: string;
  dateTo?: string;
  customerId?: string;
}

export interface GoogleAdsSyncResult {
  daysProcessed: number;
  error?: string;
}

/**
 * Sync Google Ads campaign data into FatoMidiaDiario (canal "GOOGLE").
 * Uses default date range from 2026-01-01 to today unless overridden.
 */
export async function syncGoogleAdsCliente(
  clienteId: string,
  options?: GoogleAdsSyncOptions
): Promise<GoogleAdsSyncResult> {
  const conta = await prisma.conta.findFirst({
    where: { clienteId, plataforma: "GOOGLE_ADS" },
  });

  const customerId = options?.customerId ?? conta?.accountIdPlataforma;
  if (!customerId) {
    return { daysProcessed: 0, error: "Sem conta Google Ads configurada (Conta com plataforma GOOGLE_ADS)" };
  }

  const today = formatDate(new Date());
  const dateFrom = options?.dateFrom ?? getDefaultDateFrom();
  const dateTo = options?.dateTo ?? today;

  try {
    const [campaignRows, creativeRows, checkoutByDate, purchaseByDate] = await Promise.all([
      fetchCampaignMetrics(customerId, dateFrom, dateTo, {
        loginCustomerId: conta?.googleAdsLoginCustomerId,
      }),
      fetchAdCreatives(customerId, dateFrom, dateTo, {
        loginCustomerId: conta?.googleAdsLoginCustomerId,
      }),
      fetchBeginCheckoutConversions(customerId, dateFrom, dateTo, {
        loginCustomerId: conta?.googleAdsLoginCustomerId,
      }),
      fetchPurchaseConversions(customerId, dateFrom, dateTo, {
        loginCustomerId: conta?.googleAdsLoginCustomerId,
      }),
    ]);

    const byDate = aggregateCampaignRowsByDate(campaignRows);
    for (const [, payload] of byDate) {
      const dateKey = payload.data.toISOString().slice(0, 10);
      const checkoutIniciado = checkoutByDate.get(dateKey) ?? 0;
      const conv = Math.round(payload.conversoes);
      const purchaseData = purchaseByDate.get(dateKey);
      const purchases = purchaseData ? Math.round(purchaseData.count) : 0;
      const purchaseValue = purchaseData?.value ?? 0;

      await upsertFatoMidia(clienteId, payload.data, "GOOGLE", {
        impressoes: payload.impressoes,
        cliques: payload.cliques,
        leads: conv,
        conversoes: conv,
        purchases,
        investimento: payload.investimento,
        websitePurchasesConversionValue: purchaseValue,
        alcance: payload.alcance,
        checkoutIniciado: Math.round(checkoutIniciado),
        contaId: conta?.id ?? undefined,
      });
    }

    for (const row of creativeRows) {
      const payload = mapAdCreativeRowToPayload(row);
      await upsertGoogleAdsCriativo(clienteId, {
        ...payload,
        contaId: conta?.id ?? undefined,
      });
    }

    return { daysProcessed: byDate.size };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { daysProcessed: 0, error: message };
  }
}

export interface GoogleAdsSyncAllResult {
  clienteId: string;
  daysProcessed: number;
  error?: string;
}

/**
 * Sync Google Ads for all active clients with Conta GOOGLE_ADS.
 */
export async function syncGoogleAdsTodosClientes(): Promise<GoogleAdsSyncAllResult[]> {
  const clientes = await findAllClientes(true);
  const today = formatDate(new Date());
  const results: GoogleAdsSyncAllResult[] = [];

  for (const cliente of clientes) {
    const result = await syncGoogleAdsCliente(cliente.id, {
      dateFrom: getDefaultDateFrom(),
      dateTo: today,
    });
    results.push({
      clienteId: cliente.id,
      daysProcessed: result.daysProcessed,
      error: result.error,
    });
  }

  return results;
}
