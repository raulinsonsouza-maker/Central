import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { findClienteById } from "@/lib/repositories/clientesRepository";
import { getISOWeek, getYear } from "date-fns";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const semana = request.nextUrl.searchParams.get("semana");
  const ano = request.nextUrl.searchParams.get("ano");
  const anoNum = ano ? parseInt(ano, 10) : getYear(new Date());
  const semanaNum = semana ? parseInt(semana, 10) : getISOWeek(new Date());

  const cliente = await findClienteById(id);
  if (!cliente) {
    return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  }

  const pautas = await prisma.pautaReuniao.findMany({
    where: { clienteId: id, ano: anoNum, semanaIso: semanaNum },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(pautas);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cliente = await findClienteById(id);
  if (!cliente) {
    return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  }
  let body: { titulo?: string; descricao?: string; semanaIso?: number; ano?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const titulo = body.titulo?.trim();
  if (!titulo) {
    return NextResponse.json({ error: "titulo é obrigatório" }, { status: 400 });
  }
  const ano = body.ano ?? getYear(new Date());
  const semanaIso = body.semanaIso ?? getISOWeek(new Date());
  const pauta = await prisma.pautaReuniao.create({
    data: {
      clienteId: id,
      ano,
      semanaIso,
      titulo,
      descricao: body.descricao?.trim() ?? null,
      status: "ABERTA",
    },
  });
  return NextResponse.json(pauta);
}
