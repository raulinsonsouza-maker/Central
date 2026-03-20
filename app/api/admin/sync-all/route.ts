import { NextRequest, NextResponse } from "next/server";
import { syncMetaTodosClientes } from "@/lib/sync/metaApiSync";
import { syncGoogleAdsTodosClientes } from "@/lib/sync/googleAdsApiSync";

function isAdminAuthorized(request: NextRequest): boolean {
  const token = request.headers.get("x-admin-token") ?? request.nextUrl.searchParams.get("token");
  const expected = process.env.ADMIN_SECRET;
  if (!expected) return true;
  return token === expected;
}

/**
 * Sincroniza Meta API e Google Ads API para todos os clientes.
 * Protegido por token de admin. Usado pelo botão "Atualizar todos" no painel de administração.
 */
export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const metaResults = await syncMetaTodosClientes();
    const googleAdsResults = await syncGoogleAdsTodosClientes();
    return NextResponse.json({ ok: true, metaResults, googleAdsResults });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
