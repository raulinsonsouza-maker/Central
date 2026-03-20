import { NextRequest, NextResponse } from "next/server";
import { syncClienteCanais } from "@/lib/sync/syncClienteCanais";

/**
 * Sincroniza os canais configurados deste cliente para o banco.
 * Pode ser chamado pela UI (botão "Sync").
 * Opcional: proteger com header x-admin-token ou x-cron-token em produção.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const result = await syncClienteCanais(id);
    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          sync: result,
          error:
          result.googleAds?.error ||
          result.meta?.error ||
          result.analytics?.error ||
          "Falha na sincronização",
        },
        { status: 400 }
      );
    }
    return NextResponse.json({
      ok: true,
      sync: result,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
