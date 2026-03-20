import { fetchDailyReport, fetchChannelReport } from "@/lib/analytics/ga4Client";
import {
  upsertFatoAnalyticsDiario,
  upsertFatoAnalyticsPorCanal,
} from "@/lib/repositories/fatoAnalyticsRepository";
import { findAllClientes } from "@/lib/repositories/clientesRepository";
import { prisma } from "@/lib/db";

const DEFAULT_DATE_FROM = "2026-01-01";

function formatDateYyyyMmDd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseGa4Date(dateStr: string): Date {
  const y = parseInt(dateStr.slice(0, 4), 10);
  const m = parseInt(dateStr.slice(4, 6), 10) - 1;
  const d = parseInt(dateStr.slice(6, 8), 10);
  return new Date(y, m, d);
}

export interface AnalyticsSyncOptions {
  dateFrom?: string;
  dateTo?: string;
  propertyId?: string;
}

export interface AnalyticsSyncResult {
  daysProcessed: number;
  error?: string;
}

/**
 * Sync GA4 data into FatoAnalyticsDiario and FatoAnalyticsPorCanal.
 */
export async function syncAnalyticsCliente(
  clienteId: string,
  options?: AnalyticsSyncOptions
): Promise<AnalyticsSyncResult> {
  const conta = await prisma.conta.findFirst({
    where: { clienteId, plataforma: "GOOGLE_ANALYTICS" },
  });

  const propertyId = options?.propertyId ?? conta?.accountIdPlataforma;
  if (!propertyId) {
    return {
      daysProcessed: 0,
      error: "Sem conta Google Analytics configurada (Conta com plataforma GOOGLE_ANALYTICS)",
    };
  }

  const today = formatDateYyyyMmDd(new Date());
  const dateFrom = options?.dateFrom ?? DEFAULT_DATE_FROM;
  const dateTo = options?.dateTo ?? today;

  try {
    const [dailyRows, channelRows] = await Promise.all([
      fetchDailyReport(propertyId, dateFrom, dateTo),
      fetchChannelReport(propertyId, dateFrom, dateTo),
    ]);

    for (const row of dailyRows) {
      const data = parseGa4Date(row.date);
      await upsertFatoAnalyticsDiario(clienteId, data, {
        sessions: row.sessions,
        activeUsers: row.activeUsers,
        engagedSessions: row.engagedSessions,
        engagementRate: row.engagementRate,
        bounceRate: row.bounceRate,
        averageSessionDuration: row.averageSessionDuration,
        newUsers: row.newUsers,
        screenPageViews: row.screenPageViews,
        contaId: conta?.id ?? undefined,
      });
    }

    for (const row of channelRows) {
      const data = parseGa4Date(row.date);
      await upsertFatoAnalyticsPorCanal(clienteId, data, row.canal, {
        sessions: row.sessions,
        activeUsers: row.activeUsers,
      });
    }

    return { daysProcessed: dailyRows.length };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { daysProcessed: 0, error: message };
  }
}

export interface AnalyticsSyncAllResult {
  clienteId: string;
  daysProcessed: number;
  error?: string;
}

/**
 * Sync GA4 for all active clients with Conta GOOGLE_ANALYTICS.
 */
export async function syncAnalyticsTodosClientes(): Promise<AnalyticsSyncAllResult[]> {
  const clientes = await findAllClientes(true);
  const today = formatDateYyyyMmDd(new Date());
  const results: AnalyticsSyncAllResult[] = [];

  for (const cliente of clientes) {
    const result = await syncAnalyticsCliente(cliente.id, {
      dateFrom: DEFAULT_DATE_FROM,
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
