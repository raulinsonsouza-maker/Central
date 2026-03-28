"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { AlertTriangle, TrendingUp, Search, Zap, Target, Eye } from "lucide-react";

export interface KeywordAnalysis {
  text: string;
  matchType: string;
  campaignName: string;
  adGroupName: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  cpl: number;
  ctr: number;
  avgCpc: number;
  decision: "escalar" | "otimizar" | "pausar" | "revisar" | "neutro";
}

export interface GoogleKeywordsResponse {
  keywords: KeywordAnalysis[];
  totals: {
    impressions: number;
    clicks: number;
    cost: number;
    conversions: number;
    cpl: number;
    ctr: number;
  };
  dateFrom: string;
  dateTo: string;
  error?: string;
}

interface Props {
  data: GoogleKeywordsResponse;
  formatCurrency: (v: number) => string;
  isLoading?: boolean;
}

const DECISION_CONFIG = {
  escalar: { label: "Escalar", dot: "bg-green-500", color: "text-green-500", badge: "bg-green-500/10 text-green-500 border-green-500/20" },
  otimizar: { label: "Otimizar", dot: "bg-amber-500", color: "text-amber-500", badge: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  pausar: { label: "Pausar", dot: "bg-red-500", color: "text-red-500", badge: "bg-red-500/10 text-red-500 border-red-500/20" },
  revisar: { label: "Revisar", dot: "bg-blue-400", color: "text-blue-400", badge: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  neutro: { label: "Neutro", dot: "bg-[var(--muted-foreground)]", color: "text-[var(--muted-foreground)]", badge: "bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]" },
};

const tooltipStyle = {
  contentStyle: {
    backgroundColor: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "10px",
    color: "var(--foreground)",
    boxShadow: "0 8px 24px rgba(0,0,0,.35)",
    padding: "10px 14px",
    fontSize: 12,
  },
  labelStyle: { color: "var(--foreground)", fontWeight: 600, marginBottom: 4 },
};

function fmt(n: number, decimals = 0) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function GoogleKeywordsPanel({ data, formatCurrency, isLoading }: Props) {
  const [filterDecision, setFilterDecision] = React.useState<string>("todos");
  const [sortBy, setSortBy] = React.useState<"impressions" | "clicks" | "cost" | "conversions" | "cpl" | "ctr">("conversions");
  const [sortDir, setSortDir] = React.useState<"desc" | "asc">("desc");

  const { keywords, totals } = data;

  const countEscalar = keywords.filter((k) => k.decision === "escalar").length;
  const countOtimizar = keywords.filter((k) => k.decision === "otimizar").length;
  const countPausar = keywords.filter((k) => k.decision === "pausar").length;
  const countRevisar = keywords.filter((k) => k.decision === "revisar").length;

  // Top 5 performers for chart
  const topPerformers = [...keywords]
    .filter((k) => k.clicks > 0)
    .sort((a, b) => b.conversions - a.conversions || b.clicks - a.clicks)
    .slice(0, 6);

  const filtered = React.useMemo(() => {
    let list = filterDecision === "todos" ? keywords : keywords.filter((k) => k.decision === filterDecision);
    list = [...list].sort((a, b) => {
      const diff = (a[sortBy] as number) - (b[sortBy] as number);
      return sortDir === "desc" ? -diff : diff;
    });
    return list;
  }, [keywords, filterDecision, sortBy, sortDir]);

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortBy(col); setSortDir("desc"); }
  }

  // Strategic insights
  const topKw = keywords.find((k) => k.conversions > 0);
  const worstKw = keywords.filter((k) => k.decision === "pausar")[0];
  const revisionKw = keywords.filter((k) => k.decision === "revisar")[0];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--card)]" />
        ))}
      </div>
    );
  }

  if (data.error && keywords.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-6 py-16 text-center">
        <AlertTriangle className="h-8 w-8 text-[var(--muted-foreground)]" />
        <p className="text-sm font-medium text-[var(--foreground)]">Palavras-chave indisponíveis</p>
        <p className="max-w-sm text-xs text-[var(--muted-foreground)]">{data.error}</p>
      </div>
    );
  }

  if (keywords.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-6 py-16 text-center">
        <Search className="h-8 w-8 text-[var(--muted-foreground)]" />
        <p className="text-sm font-medium text-[var(--foreground)]">Nenhuma palavra-chave encontrada</p>
        <p className="text-xs text-[var(--muted-foreground)]">Não há dados de keywords para o período selecionado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Section header ── */}
      <div className="flex items-start gap-3">
        <div className="mt-1 h-8 w-1 shrink-0 rounded-full bg-[var(--primary)]" />
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">Google Ads</p>
          <h2 className="text-xl font-extrabold tracking-tight text-[var(--foreground)]">Análise de Palavras-chave</h2>
          <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
            {keywords.length} termo{keywords.length !== 1 ? "s" : ""} encontrado{keywords.length !== 1 ? "s" : ""} · {data.dateFrom} → {data.dateTo}
          </p>
        </div>
      </div>

      {/* ── KPI tiles ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Impressões", value: fmt(totals.impressions), accent: false },
          { label: "Cliques", value: fmt(totals.clicks), accent: false },
          { label: "CTR Médio", value: `${fmt(totals.ctr, 2)}%`, accent: false },
          { label: "Investimento", value: formatCurrency(totals.cost), accent: false },
          { label: "Conversões", value: fmt(totals.conversions, 1), accent: true },
          { label: "CPL Médio", value: totals.cpl > 0 ? formatCurrency(totals.cpl) : "—", accent: true },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 transition-all hover:border-[color-mix(in_srgb,var(--primary)_20%,var(--border))]"
          >
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[var(--primary)] opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-[0.05]" />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">{kpi.label}</p>
            <p className={`mt-1.5 text-xl font-extrabold tabular-nums leading-none ${kpi.accent ? "text-[var(--primary)]" : "text-[var(--foreground)]"}`}>
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Decision strip ── */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <div className="grid grid-cols-2 divide-x divide-y divide-[var(--border)] sm:grid-cols-4 sm:divide-y-0">
          {([
            { count: countEscalar, label: "Escalar", dot: "bg-green-500", color: "text-green-500" },
            { count: countOtimizar, label: "Otimizar", dot: "bg-amber-500", color: "text-amber-500" },
            { count: countRevisar, label: "Revisar", dot: "bg-blue-400", color: "text-blue-400" },
            { count: countPausar, label: "Pausar", dot: "bg-red-500", color: "text-red-500" },
          ] as const).map((s) => (
            <button
              key={s.label}
              onClick={() => setFilterDecision((v) => v === s.label.toLowerCase() ? "todos" : s.label.toLowerCase())}
              className={`flex flex-col items-center gap-1 px-5 py-4 transition-all hover:bg-[var(--muted)]/40 ${filterDecision === s.label.toLowerCase() ? "bg-[var(--muted)]/60" : ""}`}
            >
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
                <span className={`text-3xl font-black tabular-nums leading-none ${s.color}`}>{s.count}</span>
              </div>
              <span className={`text-[11px] font-semibold ${s.color}`}>{s.label}</span>
            </button>
          ))}
        </div>
        <div className="border-t border-[var(--border)] px-5 py-2.5">
          <p className="text-center text-[11px] text-[var(--muted-foreground)]">
            {filterDecision !== "todos"
              ? `Mostrando apenas: ${filterDecision} · ${filtered.length} termo${filtered.length !== 1 ? "s" : ""}`
              : "Clique em uma categoria para filtrar a tabela abaixo"}
          </p>
        </div>
      </div>

      {/* ── Insights + Chart row ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Insights */}
        <div className="space-y-3">
          {topKw && (
            <div className="flex gap-3 rounded-2xl border border-green-500/20 bg-green-500/5 p-4">
              <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
              <div>
                <p className="text-xs font-bold text-green-500 uppercase tracking-wide">Top performer</p>
                <p className="mt-1 text-sm text-[var(--foreground)]">
                  <strong>&ldquo;{topKw.text}&rdquo;</strong> ({topKw.matchType}) gerou{" "}
                  <strong>{fmt(topKw.conversions, 1)} conversão{topKw.conversions !== 1 ? "ões" : ""}</strong> com CPL de{" "}
                  <strong className="text-green-500">{formatCurrency(topKw.cpl)}</strong>.
                  {countEscalar > 0 && ` Considere aumentar o orçamento desta campanha.`}
                </p>
              </div>
            </div>
          )}

          {worstKw && (
            <div className="flex gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
              <Target className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <div>
                <p className="text-xs font-bold text-red-500 uppercase tracking-wide">Desperdício detectado</p>
                <p className="mt-1 text-sm text-[var(--foreground)]">
                  <strong>&ldquo;{worstKw.text}&rdquo;</strong> ({worstKw.matchType}) gerou{" "}
                  <strong>{fmt(worstKw.clicks)} cliques</strong> e custou{" "}
                  <strong className="text-red-400">{formatCurrency(worstKw.cost)}</strong> sem nenhuma conversão.
                  Considere pausar ou adicionar como palavra-chave negativa.
                </p>
              </div>
            </div>
          )}

          {revisionKw && (
            <div className="flex gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
              <Eye className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
              <div>
                <p className="text-xs font-bold text-blue-400 uppercase tracking-wide">Baixa taxa de cliques</p>
                <p className="mt-1 text-sm text-[var(--foreground)]">
                  <strong>&ldquo;{revisionKw.text}&rdquo;</strong> tem{" "}
                  <strong>{fmt(revisionKw.impressions)} impressões</strong> com CTR de apenas{" "}
                  <strong className="text-blue-400">{fmt(revisionKw.ctr, 2)}%</strong>.
                  Revise o anúncio ou o lance para melhorar a relevância.
                </p>
              </div>
            </div>
          )}

          {!topKw && !worstKw && !revisionKw && (
            <div className="flex gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
              <Zap className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
              <p className="text-sm text-[var(--muted-foreground)]">
                Dados insuficientes para gerar insights automáticos. Amplie o período ou aguarde mais dados.
              </p>
            </div>
          )}
        </div>

        {/* Bar chart — top por cliques */}
        {topPerformers.length > 0 && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
              Top keywords — cliques e conversões
            </p>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart
                data={topPerformers}
                layout="vertical"
                margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
              >
                <XAxis type="number" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="text"
                  width={120}
                  tick={{ fontSize: 10, fill: "var(--foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 18) + "…" : v}
                />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(value: number, name: string) => [
                    name === "clicks" ? fmt(value) : fmt(value, 1),
                    name === "clicks" ? "Cliques" : "Conversões",
                  ]}
                />
                <Bar dataKey="clicks" name="clicks" radius={[0, 4, 4, 0]}>
                  {topPerformers.map((k) => (
                    <Cell key={k.text} fill={k.decision === "escalar" ? "#22c55e" : k.decision === "pausar" ? "#ef4444" : "var(--primary)"} fillOpacity={0.7} />
                  ))}
                </Bar>
                <Bar dataKey="conversions" name="conversions" radius={[0, 4, 4, 0]}>
                  {topPerformers.map((k) => (
                    <Cell key={k.text} fill={k.decision === "escalar" ? "#22c55e" : k.decision === "pausar" ? "#ef4444" : "var(--primary)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── Keywords table ── */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        {/* Table header */}
        <div className="flex items-center gap-2.5 border-b border-[var(--border)] px-4 py-3">
          <div className="h-4 w-0.5 rounded-full bg-[var(--primary)]" />
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--foreground)]">
            Detalhamento de palavras-chave
          </span>
          {filterDecision !== "todos" && (
            <button
              onClick={() => setFilterDecision("todos")}
              className="ml-auto rounded-full border border-[var(--border)] px-2.5 py-0.5 text-[10px] text-[var(--muted-foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
            >
              Limpar filtro
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-separate [border-spacing:0]">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--muted)]/20">
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                  Palavra-chave / Tipo
                </th>
                <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                  Campanha
                </th>
                {(["impressions", "clicks", "ctr", "cost", "conversions", "cpl"] as const).map((col) => {
                  const labels: Record<string, string> = {
                    impressions: "Impr.", clicks: "Cliques", ctr: "CTR",
                    cost: "Custo", conversions: "Conv.", cpl: "Custo/Conv.",
                  };
                  const active = sortBy === col;
                  return (
                    <th
                      key={col}
                      onClick={() => toggleSort(col)}
                      className={`cursor-pointer select-none px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.2em] transition-colors ${active ? "text-[var(--primary)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}
                    >
                      {labels[col]} {active ? (sortDir === "desc" ? "↓" : "↑") : ""}
                    </th>
                  );
                })}
                <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                  Decisão
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((kw, i) => {
                const cfg = DECISION_CONFIG[kw.decision];
                const isLast = i === filtered.length - 1;
                return (
                  <tr
                    key={`${kw.text}-${kw.matchType}-${i}`}
                    className={`group transition-colors hover:bg-[var(--muted)]/20 ${!isLast ? "border-b border-[var(--border)]/60" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[var(--foreground)]">{kw.text}</p>
                      <p className="text-[10px] text-[var(--muted-foreground)]">Correspondência {kw.matchType}</p>
                    </td>
                    <td className="max-w-[180px] px-3 py-3">
                      <p className="truncate text-xs text-[var(--muted-foreground)]">{kw.campaignName}</p>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-sm text-[var(--foreground)]">
                      {fmt(kw.impressions)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-sm text-[var(--foreground)]">
                      {fmt(kw.clicks)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-sm text-[var(--foreground)]">
                      {fmt(kw.ctr, 2)}%
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-sm text-[var(--foreground)]">
                      {formatCurrency(kw.cost)}
                    </td>
                    <td className={`px-3 py-3 text-right tabular-nums text-sm font-bold ${kw.conversions > 0 ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"}`}>
                      {fmt(kw.conversions, 1)}
                    </td>
                    <td className={`px-3 py-3 text-right tabular-nums text-sm ${kw.cpl > 0 ? "font-semibold text-green-500" : "text-[var(--muted-foreground)]"}`}>
                      {kw.cpl > 0 ? formatCurrency(kw.cpl) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${cfg.badge}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {/* Totals row */}
              <tr className="border-t-2 border-[var(--border)] bg-[var(--muted)]/30">
                <td className="px-4 py-3 text-sm font-bold text-[var(--foreground)]">Total</td>
                <td className="px-3 py-3" />
                <td className="px-3 py-3 text-right tabular-nums text-sm font-bold text-[var(--foreground)]">
                  {fmt(totals.impressions)}
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-sm font-bold text-[var(--foreground)]">
                  {fmt(totals.clicks)}
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-sm font-bold text-[var(--foreground)]">
                  {fmt(totals.ctr, 2)}%
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-sm font-bold text-[var(--foreground)]">
                  {formatCurrency(totals.cost)}
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-sm font-bold text-[var(--primary)]">
                  {fmt(totals.conversions, 1)}
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-sm font-bold text-green-500">
                  {totals.cpl > 0 ? formatCurrency(totals.cpl) : "—"}
                </td>
                <td className="px-4 py-3" />
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
