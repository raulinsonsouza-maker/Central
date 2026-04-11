import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { dddToEstado } from "@/lib/utils/dddToEstado";

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1K3RjX3a8MsItZ7KJB5Ns1z8cLKBTiO-OCAVR6cuzP9Y/export?format=csv";

const INOUT_CLIENTE_ID = "cmntcyl3m0001qv2p40rs5xmz";

function parseDate(raw: string): Date | null {
  if (!raw) return null;
  // Format: "4/11/26" = M/D/YY  or "4/11/2026" = M/D/YYYY
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
  // fallback ISO
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

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? "";
    }
    rows.push(row);
  }
  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
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

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  if (secret !== "inout2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await fetch(SHEET_CSV_URL);
    if (!res.ok) {
      return NextResponse.json(
        { error: `Falha ao baixar CSV: ${res.status}` },
        { status: 502 }
      );
    }

    const csv = await res.text();
    const rows = parseCSV(csv);

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
        errors.push(`id=${leadId}: invalid date '${rawDate}'`);
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

        if (existing) {
          await prisma.metaLeadIndividual.update({
            where: { clienteId_metaLeadId: { clienteId: INOUT_CLIENTE_ID, metaLeadId: leadId } },
            data: {
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
            },
          });
          updated++;
        } else {
          await prisma.metaLeadIndividual.create({
            data: {
              clienteId: INOUT_CLIENTE_ID,
              metaLeadId: leadId,
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
            },
          });
          created++;
        }
      } catch (e) {
        errors.push(`id=${leadId}: ${e instanceof Error ? e.message : String(e)}`);
        failed++;
      }
    }

    return NextResponse.json({
      ok: true,
      total: rows.length,
      created,
      updated,
      failed,
      errors: errors.slice(0, 20),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
