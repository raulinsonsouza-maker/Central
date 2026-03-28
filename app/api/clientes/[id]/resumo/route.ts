import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { findClienteById } from "@/lib/repositories/clientesRepository";
import { outcomeCountForFato } from "@/lib/metrics/fatoMidiaOutcome";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const canal = request.nextUrl.searchParams.get("canal") ?? "geral";
  const periodo = request.nextUrl.searchParams.get("periodo") ?? "30"; // dias
  const dataInicioParam = request.nextUrl.searchParams.get("dataInicio");
  const dataFimParam = request.nextUrl.searchParams.get("dataFim");

  const diasFallback = Math.min(365, Math.max(7, parseInt(periodo, 10) || 30));
  const dataFim = new Date();
  const dataInicio = new Date();
  dataInicio.setDate(dataInicio.getDate() - diasFallback);

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

  const rows = await prisma.fatoMidiaDiario.findMany({
    where: {
      clienteId: id,
      data: { gte: dataInicio, lte: dataFim },
      ...(canal !== "geral" ? { canal: canal.toUpperCase() } : {}),
    },
    select: {
      canal: true,
      leads: true,
      conversoes: true,
      investimento: true,
      impressoes: true,
      cliques: true,
      messagingConversationsStarted: true,
    },
  });

  let totalInvestimento = 0;
  let totalLeads = 0;
  let totalImpressoes = 0;
  let totalCliques = 0;
  let totalConversas = 0;
  for (const r of rows) {
    totalInvestimento += Number(r.investimento);
    totalLeads += outcomeCountForFato(r.canal, r.leads, r.conversoes);
    totalImpressoes += r.impressoes;
    totalCliques += r.cliques;
    totalConversas += r.messagingConversationsStarted ?? 0;
  }
  const cpl = totalLeads > 0 ? totalInvestimento / totalLeads : 0;
  const cpm = totalImpressoes > 0 ? (totalInvestimento / totalImpressoes) * 1000 : 0;
  const custoPorConversa = totalConversas > 0 ? totalInvestimento / totalConversas : 0;
  const diasSelecionados = Math.max(
    1,
    Math.floor((dataFim.getTime() - dataInicio.getTime()) / (24 * 60 * 60 * 1000)) + 1
  );

  return NextResponse.json({
    clienteId: id,
    periodo: `${diasSelecionados} dias`,
    investimento: Math.round(totalInvestimento * 100) / 100,
    leads: totalLeads,
    impressoes: totalImpressoes,
    cliques: totalCliques,
    cpl: Math.round(cpl * 100) / 100,
    cpm: Math.round(cpm * 100) / 100,
    messagingConversationsStarted: totalConversas,
    custoPorConversa: Math.round(custoPorConversa * 100) / 100,
  });
}
