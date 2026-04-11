import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { dddToEstado } from "@/lib/utils/dddToEstado";

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1K3RjX3a8MsItZ7KJB5Ns1z8cLKBTiO-OCAVR6cuzP9Y/export?format=csv";

const INOUT_CLIENTE_ID = "cmntcyl3m0001qv2p40rs5xmz";

function isAuthorized(request: NextRequest): boolean {
  const secret = request.nextUrl.searchParams.get("secret");
  if (secret === "inout2026") return true;
  const token = request.headers.get("x-admin-token");
  const expected = process.env.ADMIN_SECRET;
  if (!expected) return true;
  return token === expected;
}

function parseDate(raw: string): Date | null {
  if (!raw) return null;
  const parts = raw.trim().split("/");
  if (parts.length === 3) {
    const month = parseInt(parts[0], 10);
    const day = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;
    if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
      return new Date(year, month - 1, day);
    }
  }
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function normalizeSegmento(raw: string): string | null {
  if (!raw) return null;
  const map: Record<string, string> = {
    "corretor_autônomo": "Corretores",
    "corretor_autonomo": "Corretores",
    "imobiliária": "Imobiliárias",
    "imobiliaria": "Imobiliárias",
    "incorporadora": "Incorporadoras",
    "construtora": "Construtoras",
    "ainda_não_faturo_nada": "Ainda não faturo nada",
  };
  const key = raw.trim().toLowerCase();
  return map[key] ?? raw;
}

function parseCSV(text: string): { rows: Record<string, string>[]; headers: string[] } {
  // Strip UTF-8 BOM if present
  const clean = text.replace(/^\uFEFF/, "");
  // Normalize Windows line endings
  const normalized = clean.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return { rows: [], headers: [] };
  const headers = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = (values[j] ?? "").trim();
    }
    rows.push(row);
  }
  return { rows, headers };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

async function processRows(rows: Record<string, string>[]) {
  let created = 0;
  let updated = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const leadId = row["id"]?.trim();
    if (!leadId) { failed++; continue; }

    const rawDate = row["created_time"]?.trim();
    const createdTime = parseDate(rawDate);
    if (!createdTime) {
      errors.push(`id=${leadId}: data inválida '${rawDate}'`);
      failed++;
      continue;
    }

    const phone = row["phone_number"]?.trim() || null;
    const estado = dddToEstado(phone);
    const platform = row["platform"]?.trim() || null;
    const normalizedPlatform = platform === "fb" ? "Facebook" : platform === "ig" ? "Instagram" : platform;
    const tipoEmpresaRaw = row["qual_é_o_segmento_da_sua_empresa?"]?.trim() ?? null;
    const tipoEmpresa = normalizeSegmento(tipoEmpresaRaw ?? "");
    const faixaFaturamento = row["qual_sua_atual_faixa_de_faturamento?"]?.trim() || null;

    const rawFieldData = {
      website: row["qual_o_site_da_sua_empresa?_"]?.trim() || null,
      adId: row["ad_id"]?.trim() || null,
      adName: row["ad_name"]?.trim() || null,
      adsetId: row["adset_id"]?.trim() || null,
      adsetName: row["adset_name"]?.trim() || null,
      isOrganic: row["is_organic"]?.trim() === "true",
      originalSegmento: tipoEmpresaRaw,
    };

    try {
      const existing = await prisma.metaLeadIndividual.findUnique({
        where: { clienteId_metaLeadId: { clienteId: INOUT_CLIENTE_ID, metaLeadId: leadId } },
        select: { id: true },
      });

      const data = {
        createdTime,
        campaignId: row["campaign_id"]?.trim() || null,
        campaignName: row["campaign_name"]?.trim() || null,
        adId: row["ad_id"]?.trim() || null,
        adName: row["ad_name"]?.trim() || null,
        adsetId: row["adset_id"]?.trim() || null,
        adsetName: row["adset_name"]?.trim() || null,
        formId: row["form_id"]?.trim() || null,
        formName: row["form_name"]?.trim() || null,
        fullName: row["full_name"]?.trim() || null,
        nomeEmpresa: row["company_name"]?.trim() || null,
        telefone: phone,
        emailLead: row["email"]?.trim() || null,
        tipoEmpresa,
        faixaFaturamento,
        estado,
        platform: normalizedPlatform,
        statusCrm: row["lead_status"]?.trim() || null,
        rawFieldData,
      };

      if (existing) {
        await prisma.metaLeadIndividual.update({
          where: { clienteId_metaLeadId: { clienteId: INOUT_CLIENTE_ID, metaLeadId: leadId } },
          data,
        });
        updated++;
      } else {
        await prisma.metaLeadIndividual.create({
          data: { clienteId: INOUT_CLIENTE_ID, metaLeadId: leadId, ...data },
        });
        created++;
      }
    } catch (e) {
      errors.push(`id=${leadId}: ${e instanceof Error ? e.message : String(e)}`);
      failed++;
    }
  }

  return { created, updated, failed, total: rows.length, errors: errors.slice(0, 20) };
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const contentType = request.headers.get("content-type") ?? "";

    // If uploading a file via multipart/form-data
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
      }
      const csv = await file.text();
      const { rows, headers } = parseCSV(csv);
      console.log(`[import-leads-csv] upload: ${rows.length} linhas | colunas: ${headers.join(", ")}`);
      if (rows.length === 0) {
        return NextResponse.json({
          error: "Arquivo CSV vazio ou sem linhas válidas.",
          colunasDetectadas: headers,
        }, { status: 400 });
      }
      const result = await processRows(rows);
      return NextResponse.json({ ok: true, source: "upload", colunasDetectadas: headers, ...result });
    }

    // Fallback: fetch from Google Sheets URL
    const res = await fetch(SHEET_CSV_URL);
    if (!res.ok) {
      return NextResponse.json(
        { error: `Falha ao baixar CSV da planilha: ${res.status}` },
        { status: 502 }
      );
    }
    const csv = await res.text();
    const { rows, headers } = parseCSV(csv);
    console.log(`[import-leads-csv] sheets: ${rows.length} linhas | colunas: ${headers.join(", ")}`);
    const result = await processRows(rows);
    return NextResponse.json({ ok: true, source: "sheets", colunasDetectadas: headers, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
