import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getIntegrationsConfig } from "@/lib/config/integrations";
import { fetchAccountBalance } from "@/lib/meta/metaClient";
import { fetchAccountBudget } from "@/lib/googleAds/googleAdsClient";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const canal = request.nextUrl.searchParams.get("canal") as "meta" | "google" | null;

  if (!canal || !["meta", "google"].includes(canal)) {
    return NextResponse.json({ saldo: null, motivo: "Canal inválido" }, { status: 400 });
  }

  const plataforma = canal === "meta" ? "META" : "GOOGLE";

  const conta = await prisma.conta.findFirst({
    where: { clienteId: id, plataforma },
  });

  if (!conta?.accountIdPlataforma) {
    return NextResponse.json({ saldo: null, motivo: "Conta não configurada" });
  }

  const config = await getIntegrationsConfig();

  if (canal === "meta") {
    const token = config.metaAccessToken;
    if (!token) {
      return NextResponse.json({ saldo: null, motivo: "Token Meta não configurado" });
    }
    try {
      const balance = await fetchAccountBalance(conta.accountIdPlataforma, token);
      return NextResponse.json({
        saldo: balance.balance,
        moeda: balance.currency,
        spendCap: balance.spendCap,
      });
    } catch (e) {
      return NextResponse.json({
        saldo: null,
        motivo: e instanceof Error ? e.message : "Erro ao buscar saldo Meta",
      });
    }
  }

  if (canal === "google") {
    try {
      const budget = await fetchAccountBudget(
        conta.accountIdPlataforma,
        conta.googleAdsLoginCustomerId
      );
      if (!budget) {
        return NextResponse.json({ saldo: null, motivo: "Sem budget configurado" });
      }
      return NextResponse.json({
        saldo: budget.remaining,
        totalAprovado: budget.approvedSpendingLimit,
        utilizado: budget.amountServed,
        moeda: budget.currency,
      });
    } catch (e) {
      return NextResponse.json({
        saldo: null,
        motivo: e instanceof Error ? e.message : "Erro ao buscar saldo Google",
      });
    }
  }
}
