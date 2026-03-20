# Sync diário (planilhas → base) e atualização dos dashboards

Este documento descreve a rotina de sincronização diária às **07:00 horário de Brasília (America/Sao_Paulo)**, que atualiza os dados das planilhas Google Sheets no banco e mantém os dashboards atualizados todos os dias.

## Decisão de host

A aplicação pode rodar em dois cenários:

| Host | Como o cron é disparado |
|------|-------------------------|
| **Vercel** | Cron configurado no próprio projeto via `vercel.json`. A Vercel chama a URL do deployment (GET) no horário agendado. **Recomendado** se o deploy já for na Vercel. |
| **VPS / VM / Docker / outro** | Cron externo (crontab do SO, GitHub Actions ou outro agendador) faz POST (ou GET) na URL do endpoint em produção. Ver [Caminho B](#caminho-b-deploy-fora-da-vercel) abaixo. |

O repositório já inclui configuração para **Vercel**; para outros hosts, use a documentação e o script opcional descritos no Caminho B.

---

## Horário e timezone

- **Horário:** 07:00 (uma vez ao dia).
- **Timezone:** America/Sao_Paulo (Brasília, BRT).
- **Expressão cron (UTC):** `0 10 * * *` (10:00 UTC = 07:00 BRT).

---

## Caminho A — Deploy na Vercel

### Configuração no repositório

O arquivo **`vercel.json`** na raiz já define o Cron Job:

- **Path:** `/api/sync/google-sheets`
- **Schedule:** `0 10 * * *` (07:00 BRT)

A rota aceita **GET** (usado pela Vercel ao disparar o cron) e **POST** (para chamadas manuais ou crons externos). A autenticação é feita por:

- Header `Authorization: Bearer <token>` (a Vercel envia `CRON_SECRET` assim)
- Header `x-cron-token: <token>`
- Query `?token=<token>`

Todos são validados contra a variável de ambiente **`SYNC_CRON_TOKEN`**.

### Variáveis de ambiente na Vercel

1. **SYNC_CRON_TOKEN** (obrigatório em produção)
   - Gere um valor seguro, por exemplo: `openssl rand -hex 32`
   - Adicione em **Project Settings → Environment Variables** para Production (e Preview se quiser testar cron em preview).
   - **CRON_SECRET:** defina com o **mesmo valor** de `SYNC_CRON_TOKEN`. A Vercel envia esse valor no header `Authorization: Bearer` ao chamar o cron; a API compara com `SYNC_CRON_TOKEN`.

2. Confirme também: **GOOGLE_CLIENT_EMAIL**, **GOOGLE_PRIVATE_KEY**, **DATABASE_URL**.

Após o deploy, o cron passa a rodar automaticamente todos os dias às 07:00 BRT.

---

## Caminho B — Deploy fora da Vercel (VPS, Docker, etc.)

### Endpoint

- **URL:** `POST https://<seu-dominio>/api/sync/google-sheets` ou `GET https://<seu-dominio>/api/sync/google-sheets`
- **Autenticação:** envie o token em um dos formatos:
  - Header: `x-cron-token: SEU_SYNC_CRON_TOKEN`
  - Header: `Authorization: Bearer SEU_SYNC_CRON_TOKEN`
  - Query: `?token=SEU_SYNC_CRON_TOKEN`

### Exemplo de chamada (curl)

```bash
# Sync de todos os clientes
curl -X POST "https://seu-dominio.com/api/sync/google-sheets" \
  -H "x-cron-token: SEU_SYNC_CRON_TOKEN"

# Sync de um cliente específico
curl -X POST "https://seu-dominio.com/api/sync/google-sheets" \
  -H "x-cron-token: SEU_SYNC_CRON_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"clienteId": "id-do-cliente"}'
```

### Crontab (07:00 BRT)

Ajuste o fuso do servidor (ou use a hora UTC equivalente). Para servidor em UTC:

- 07:00 BRT = 10:00 UTC → `0 10 * * *`

Exemplo (substitua `SEU_TOKEN` e a URL):

```cron
0 10 * * * curl -s -X POST "https://seu-dominio.com/api/sync/google-sheets" -H "x-cron-token: SEU_TOKEN" > /dev/null 2>&1
```

Ou use o script incluído no repositório (lê o token de variável de ambiente):

```cron
0 10 * * * /caminho/para/scripts/run-sync.sh
```

### Script opcional: `scripts/run-sync.sh`

O script `scripts/run-sync.sh` faz o POST usando a variável de ambiente `SYNC_CRON_TOKEN` e `SYNC_URL` (ou um default). Útil para crontab ou execução manual em servidores. Ver comentários no próprio script.

---

## Configurar SYNC_CRON_TOKEN em produção

1. Gere um token forte (ex.: `openssl rand -hex 32`).
2. Guarde em cofre de segredos (1Password, variáveis do host, etc.); **não** commite no repositório.
3. No painel do host (Vercel, servidor, etc.):
   - Defina **SYNC_CRON_TOKEN** com esse valor.
   - Na Vercel, defina também **CRON_SECRET** com o mesmo valor (para o cron automático enviar o Bearer correto).

---

## Testar o endpoint (staging/produção)

### Teste de sucesso (sync de todos os clientes)

```bash
curl -X POST "https://seu-dominio.com/api/sync/google-sheets" \
  -H "x-cron-token: SEU_SYNC_CRON_TOKEN" \
  -w "\n%{http_code}\n"
```

Esperado: HTTP 200 e body com `"ok": true` e `results`.

### Teste de falha (não autorizado)

```bash
curl -X POST "https://seu-dominio.com/api/sync/google-sheets" \
  -w "\n%{http_code}\n"
```

Esperado: HTTP 401 e body com `"error": "Unauthorized"`.

### Após ativar o cron

No primeiro dia, confira os logs (Vercel Dashboard → Logs, ou logs do servidor) para confirmar que o job rodou no horário esperado e sem erro.

---

## Operação (ops)

### Onde ver os logs

- **Vercel:** Dashboard do projeto → **Logs**. Filtre por path `/api/sync/google-sheets` ou por horário próximo de 07:00 BRT (10:00 UTC).
- **Outro host:** Logs do servidor (stdout/stderr do processo que atende a API) ou do agendador (crontab logs, etc.).

### Como reexecutar o sync manualmente

1. **Pela aplicação:** em **Administração** > **Clientes**, use o botão **Sincronizar** do cliente desejado (sync apenas daquele cliente).
2. **Pela API (todos os clientes):**
   ```bash
   curl -X POST "https://seu-dominio.com/api/sync/google-sheets" \
     -H "x-cron-token: SEU_SYNC_CRON_TOKEN"
   ```
3. **Pela API (um cliente):**
   ```bash
   curl -X POST "https://seu-dominio.com/api/sync/google-sheets" \
     -H "x-cron-token: SEU_SYNC_CRON_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"clienteId": "id-do-cliente"}'
   ```

### Resumo para a equipe

- **O quê:** Sync diário das planilhas Google Sheets para o Postgres; os dashboards leem do banco, então ficam atualizados após cada sync.
- **Quando:** Todos os dias às **07:00 horário de Brasília**.
- **Onde configurar:** `vercel.json` (Vercel) ou crontab/script (outro host); variável **SYNC_CRON_TOKEN** (e **CRON_SECRET** na Vercel) em produção.
