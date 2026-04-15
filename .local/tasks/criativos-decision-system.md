# Criativos META — Sistema de Decisão

## What & Why

Substituir a tela atual de análise individual de criativos por um sistema de decisão focado em ação. O objetivo é que o usuário entre na tela, identifique o que escalar/pausar em menos de 30 segundos, sem precisar interpretar dados individuais.

Hoje a tela é um "explorador de criativo único". O que precisa ser é um "painel de decisão do conjunto".

## Done looks like

A tela de Criativos META exibe, de cima para baixo, na mesma viewport sem scroll forçado:

1. **Barra de resumo** — uma linha única: Spend total · CTR médio · CPC médio · Melhor criativo (nome + CTR)

2. **Decision Bar** — três contadores coloridos com destaque visual: 🟢 N Escalar / 🟡 N Otimizar / 🔴 N Pausar, seguido de um único insight contextual (ex: "40% da verba está em criativos de baixa performance")

3. **Tabela de criativos** — cada criativo em uma linha com colunas: Nome · Spend · CTR · CPC · Score (0–2) · Status (badge colorido) · Alertas inline (máx 2, ex: "CTR baixo" "CPC alto"). Ordenada por Score decrescente. Linha com hover. Clique abre modal.

4. **Barra de distribuição de verba** — uma barra horizontal proporcional ao spend de cada criativo, cor = status (verde/amarelo/vermelho). Altura compacta (~48px).

5. **Bloco de Ações** — três linhas sem texto explicativo: Escalar: [nomes] · Pausar: [nomes] · Ajuste: Redistribuir verba para top performers.

6. **Modal de criativo** (ao clicar na linha da tabela) — overlay lateral ou centralizado com: preview do anúncio (CriativoPreview), métricas completas (spend, CTR, CPC, CPM, impressões, cliques), texto do anúncio. Botão de fechar. O modal NÃO aparece inline na tabela.

## Out of scope

- Alterações na sincronização de dados da Meta API
- Alterações nas outras seções da página (Geral, Google, Pauta)
- A aba "Análise de dados" dentro do canal META (só a aba Criativos muda)
- Salvar ações (escalar/pausar) no sistema — é apenas visual/consultivo

## Tasks

1. **Score + Status + Alertas** — Implementar função que, dado o array `sorted` com totais agregados, calcula para cada criativo: score (0–2 baseado em CTR normalizado 60% + CPC inverso normalizado 40%), status (ESCALAR/OTIMIZAR/PAUSAR por threshold), e alertas inline (CTR baixo, CPC alto, Verba concentrada, Pouca verba — máx 2 por item).

   Thresholds de status: score ≥ 1.4 → ESCALAR (verde), score ≥ 0.8 → OTIMIZAR (amarelo), score < 0.8 → PAUSAR (vermelho).
   
   Thresholds de alertas: CTR < 75% da média → "CTR baixo"; CPC > 140% da média → "CPC alto"; spendShare > 45% → "Verba concentrada"; spendShare < 5% → "Pouca verba".

2. **Remover layout atual** — Remover completamente do `return` de `MetaCriativosGrid`: os estados `selectedId` e `useFallbackPreview` (ambos migram para o modal), o preview central (col-span-6), o painel de análise direito (col-span-3), e a biblioteca lateral de cards (col-span-3). Manter apenas os dados computados (`sorted`, `totalSpend`, `totalImpressions`, `totalClicks`, `averageCtr`, `topCtr`). Manter o componente `CriativoPreview` no arquivo pois será usado no modal.

3. **Novo layout principal** — Construir o novo `return` de `MetaCriativosGrid` com os 5 blocos em sequência vertical: barra de resumo, decision bar, tabela de criativos (com rows clicáveis), barra de distribuição de verba, bloco de ações. Todo o layout deve caber na viewport sem scroll gigante. Sem colunas laterais.

4. **Modal de criativo** — Implementar modal (overlay com backdrop blur) que abre ao clicar em qualquer linha da tabela. Exibe `CriativoPreview` + métricas completas + texto do anúncio. Estado controlado por `modalAdId: string | null`. Botão de fechar no canto. ESC também fecha.

## Relevant files

- `app/clientes/[id]/page.tsx:1406-1992`
