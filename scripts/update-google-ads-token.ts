/**
 * Atualiza o refresh token do Google Ads no SystemConfig (banco de dados).
 * Uso: npx tsx scripts/update-google-ads-token.ts
 */
import { updateIntegrationsConfig } from "@/lib/config/integrations";

const REFRESH_TOKEN =
  "1//04pX70CqsOeeHCgYIARAAGAQSNwF-L9IrsBHY1QLcKchMM5PEPEIX0kE0ngx0HFzSW1zPB_zu4W1m2jbO06gB8RGgw559YESK4ZI";

async function main() {
  await updateIntegrationsConfig({ googleRefreshToken: REFRESH_TOKEN });
  console.log("✓ Refresh token do Google Ads atualizado no banco de dados.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
