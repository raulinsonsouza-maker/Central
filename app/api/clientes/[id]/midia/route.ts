import { NextRequest, NextResponse } from "next/server";
import { findFatosByClienteAndPeriod } from "@/lib/repositories/fatosMidiaRepository";
import { findClienteById } from "@/lib/repositories/clientesRepository";
import { outcomeCountForFato } from "@/lib/metrics/fatoMidiaOutcome";
import { isFlorien, isDor, isGranarolo } from "@/lib/clientProfiles";
import { startOfWeek, endOfWeek, getISOWeek, getYear } from "date-fns";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const canal = request.nextUrl.searchParams.get("canal") ?? "geral";
  const agrupamento = request.nextUrl.searchParams.get("agrupamento") ?? "semanal";
  const periodo = request.nextUrl.searchParams.get("periodo") ?? "90";
  const dataInicioParam = request.nextUrl.searchParams.get("dataInicio");
  const dataFimParam = request.nextUrl.searchParams.get("dataFim");
  const dias = Math.min(365, Math.max(7, parseInt(periodo, 10) || 90));
  const dataFim = new Date();
  const dataInicio = new Date();
  dataInicio.setDate(dataInicio.getDate() - dias);

  const parseDateOnly = (value: string) => {
    const [y, m, d] = value.split("-").map(Number);
    if (!y || !m || !d) return null;
    const parsed = new Date(y, m - 1, d);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  if (dataInicioParam && dataFimParam) {
    const parsedInicio = parseDateOnly(dataInicioParam);
    const parsedFim = parseDateOnly(dataFimParam);
    if (parsedInicio && parsedFim && parsedInicio <= parsedFim) {
      dataInicio.setTime(parsedInicio.getTime());
      dataFim.setTime(parsedFim.getTime());
      dataFim.setHours(23, 59, 59, 999);
    }
  }

  const cliente = await findClienteById(id);
  if (!cliente) {
    return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  }

  const canalFilter = canal === "geral" ? undefined : canal.toUpperCase();
  const fatos = await findFatosByClienteAndPeriod(
    id,
    dataInicio,
    dataFim,
    canalFilter
  );

  // For profile-visit clients, use profileVisits as the primary outcome metric
  const usesProfileVisits = isFlorien(cliente);
  const isComprasCliente = isDor(cliente) || isGranarolo(cliente);
  const getLeads = (f: (typeof fatos)[number]) =>
    usesProfileVisits && f.canal !== "GOOGLE"
      ? ((f as { profileVisits?: number }).profileVisits ?? 0)
      : outcomeCountForFato(f.canal, f.leads, f.conversoes, undefined, isComprasCliente && f.canal !== "GOOGLE");

  if (agrupamento === "semanal") {
    const byWeek = new Map<
      string,
      {
        periodo: string;
        investimento: number;
        leads: number;
        conversas: number;
        impressoes: number;
        cliques: number;
        inicio: Date;
      }
    >();
    for (const f of fatos) {
      const d = new Date(f.data);
      const inicio = startOfWeek(d, { weekStartsOn: 1 });
      const fim = endOfWeek(d, { weekStartsOn: 1 });
      const key = `${getYear(inicio)}-W${getISOWeek(inicio)}`;
      const label = `${inicio.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}-${fim.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`;
      const existing = byWeek.get(key);
      const inv = Number(f.investimento);
      const conversas = (f as { messagingConversationsStarted?: number }).messagingConversationsStarted ?? 0;
      const leads = getLeads(f);
      const imp = f.impressoes;
      const clk = f.cliques;
      if (existing) {
        existing.investimento += inv;
        existing.leads += leads;
        existing.conversas += conversas;
        existing.impressoes += imp;
        existing.cliques += clk;
      } else {
        byWeek.set(key, {
          periodo: label,
          investimento: inv,
          leads,
          conversas,
          impressoes: imp,
          cliques: clk,
          inicio,
        });
      }
    }
    const series = Array.from(byWeek.entries())
      .map(([k, v]) => ({ key: k, ...v }))
      .sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
    return NextResponse.json({
      clienteId: id,
      canal,
      agrupamento: "semanal",
      series,
      diario: fatos.map((f) => {
        const fConversas = (f as { messagingConversationsStarted?: number }).messagingConversationsStarted ?? 0;
        return {
          data: f.data,
          investimento: Number(f.investimento),
          leads: getLeads(f),
          conversas: fConversas,
          impressoes: f.impressoes,
          cliques: f.cliques,
        };
      }),
    });
  }

  return NextResponse.json({
    clienteId: id,
    canal,
    agrupamento: "diario",
    diario: fatos.map((f) => ({
      data: f.data,
      investimento: Number(f.investimento),
      leads: getLeads(f),
      impressoes: f.impressoes,
      cliques: f.cliques,
    })),
  });
}
