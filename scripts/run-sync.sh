#!/usr/bin/env bash
# Dispara o sync de planilhas (todos os clientes) via POST no endpoint de produção.
# Uso: SYNC_CRON_TOKEN=xxx SYNC_URL=https://seu-dominio.com ./scripts/run-sync.sh
# Ou no crontab (07:00 BRT = 10:00 UTC): 0 10 * * * SYNC_CRON_TOKEN=xxx SYNC_URL=https://... /caminho/scripts/run-sync.sh

set -e

SYNC_URL="${SYNC_URL:-http://localhost:3000}"
TOKEN="${SYNC_CRON_TOKEN:-}"

if [ -z "$TOKEN" ]; then
  echo "Erro: defina SYNC_CRON_TOKEN no ambiente." >&2
  exit 1
fi

curl -s -X POST "${SYNC_URL}/api/sync/google-sheets" \
  -H "x-cron-token: ${TOKEN}" \
  -H "Content-Type: application/json" \
  -w "\nHTTP %{http_code}\n"
