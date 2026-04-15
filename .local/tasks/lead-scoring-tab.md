# Aba Lead Scoring com API Meta

## What & Why
Adicionar uma nova aba "Lead Scoring" ao dashboard do cliente (após a aba Google), que busca leads individuais dos formulários nativos do Meta via API, armazena no banco de dados e exibe análises visuais cruzadas com dados de custo e campanha.

Atualmente a análise de leads era feita via upload manual de CSV em uma ferramenta separada. O objetivo é integrar isso ao dashboard existente, consumindo os dados diretamente da Meta Lead Gen API, eliminando o processo manual.

## Done looks like
- Nova aba "Lead Scoring" aparece após "Google" no dashboard de cada cliente
- Os leads individuais são sincronizados da API do Meta (formulários nativos / Lead Gen Forms) e salvos no banco
- A aba exibe:
  - KPIs no topo: total de leads no período, campanhas distintas, status no CRM
  - Filtro de período (data início → fim) com toggle Mês/Semana
  - Cards de filtro por tipo de empresa (Imobiliárias, Corretores, Construtoras, Incorporadoras)
  - Gráfico de barras empilhadas com evolução de volume de leads por mês/semana, colorido por tipo de empresa
  - Tabela de indicadores mês a mês (Leads Totais, por tipo de empresa)
  - Seção "Leads por estado": mapa do Brasil com intensidade por estado baseado no DDD do telefone, ranking lateral de UFs, gráfico mensal com linha de média
  - Seção "Distribuição": gráfico de barras horizontais por tipo de empresa e por faixa de faturamento declarada
  - Lista de leads individuais com: data/hora, nome da empresa, faixa de faturamento — com filtros ativos do mapa/gráficos aplicados
- Dados de custo por lead (CPL) e campanha de origem são cruzados com os leads individuais usando dados já existentes em `FatoMidiaDiario`
- Um botão/endpoint de sincronização manual de leads é disponibilizado no admin

## Out of scope
- Dados de lead scoring automático por pontuação numérica (score calculado por IA ou regras)
- Integração com CRM externo (apenas exibe status "completo no CRM" se já vier do form)
- Edição manual de leads
- Envio de notificações por lead recebido

## Tasks
1. **Extensão da Meta API Client** — Adicionar funções em `lib/meta/metaClient.ts` para: (a) buscar formulários de lead gen de uma conta (`/{account_id}/leadgen_forms`), (b) buscar leads individuais de um formulário (`/{form_id}/leads`) com campos como `created_time`, `field_data` (nome da empresa, telefone, faixa de faturamento, tipo de empresa, e-mail).

2. **Novo modelo de banco de dados** — Adicionar modelo `MetaLeadIndividual` ao schema Prisma com campos: `clienteId`, `contaId`, `metaLeadId` (ID único do Meta), `formId`, `formName`, `campaignId`, `campaignName`, `createdTime`, `nomeEmpresa`, `telefone`, `estado` (derivado do DDD), `tipoEmpresa`, `faixaFaturamento`, `emailLead`, `statusCrm`. Gerar e aplicar a migration.

3. **Serviço de sincronização de leads individuais** — Criar `lib/sync/metaLeadsSync.ts` que: lista os formulários ativos da conta Meta do cliente, busca leads de cada formulário com paginação, deriva estado brasileiro a partir do DDD do telefone, evita duplicação por `metaLeadId`, e salva no banco. Adicionar endpoint de API em `app/api/admin/sync-leads/route.ts` para disparar a sync manualmente por cliente.

4. **Endpoint de dados do Lead Scoring** — Criar `app/api/clientes/[id]/lead-scoring/route.ts` que retorna: leads individuais filtrados por período, agrupamentos por tipo de empresa/estado/faixa de faturamento, totais por mês/semana, e CPL/investimento por campanha cruzado com `FatoMidiaDiario`.

5. **Componente LeadScoringPanel** — Criar `components/clientes/LeadScoringPanel.tsx` com todas as seções visuais: KPIs, filtro de período, cards de tipo de empresa (clicáveis para filtrar), gráfico de barras empilhadas (Recharts), tabela mês a mês, mapa do Brasil com intensidade de calor por estado (usando `react-simple-maps`), ranking de UFs, gráfico de leads por mês, gráficos de distribuição horizontais, e lista de leads com colunas data, empresa e faixa de faturamento. Os filtros do mapa e dos gráficos afetam a lista de leads.

6. **Integração da aba no dashboard** — Adicionar a opção "Lead Scoring" à navegação de abas em `app/clientes/[id]/page.tsx` após o canal "Google", renderizando o `LeadScoringPanel` quando selecionada. A aba deve aparecer para todos os clientes que possuem conta Meta configurada.

7. **Sincronização no admin** — Expor o gatilho de sync de leads individuais na página de admin do cliente (`app/admin/clientes/page.tsx` ou equivalente), com feedback visual de progresso/conclusão.

## Relevant files
- `lib/meta/metaClient.ts`
- `lib/sync/metaApiSync.ts`
- `lib/mappers/metaToDomain.ts`
- `prisma/schema.prisma`
- `app/clientes/[id]/page.tsx`
- `components/clientes/DefaultPanel.tsx`
- `components/clientes/GoogleKeywordsPanel.tsx`
- `lib/clientProfiles.ts`
- `app/api/clientes/[id]/imoveis/route.ts`
