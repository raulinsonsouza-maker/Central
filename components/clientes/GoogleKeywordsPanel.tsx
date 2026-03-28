"use client";

import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AlertTriangle, Search, KeyRound, TrendingUp, MousePointerClick, Eye, Wallet, Percent } from "lucide-react";

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
  escalar:  { label: "Escalar",  dot: "bg-green-500",                    color: "text-green-500",                    badge: "bg-green-500/10  text-green-500  border-green-500/20"  },
  otimizar: { label: "Otimizar", dot: "bg-amber-500",                    color: "text-amber-500",                    badge: "bg-amber-500/10  text-amber-500  border-amber-500/20"  },
  pausar:   { label: "Pausar",   dot: "bg-red-500",                      color: "text-red-500",                      badge: "bg-red-500/10    text-red-500    border-red-500/20"    },
  revisar:  { label: "Revisar",  dot: "bg-blue-400",                     color: "text-blue-400",                     badge: "bg-blue-500/10   text-blue-400   border-blue-500/20"   },
  neutro:   { label: "Neutro",   dot: "bg-[var(--muted-foreground)]",    color: "text-[var(--muted-foreground)]",    badge: "bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]" },
};

function fmt(n: number, decimals = 0) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function KpiTile({
  label,
  value,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  accent?: boolean;
}) {
  return (
    <Card className="group relative overflow-hidden rounded-2xl border-[var(--border)] transition-all hover:border-[color-mix(in_srgb,var(--primary)_20%,var(--border))]">
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[var(--primary)] opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-[0.05]" />
      <CardContent className="flex items-start gap-4 p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">{label}</p>
          <p className={`mt-1 text-2xl font-extrabold tabular-nums leading-none ${accent ? "text-[var(--primary)]" : "text-[var(--foreground)]"}`}>
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function GoogleKeywordsPanel({ data, formatCurrency, isLoading }: Props) {
  const [filterDecision, setFilterDecision] = React.useState<string>("todos");
  const [sortBy, setSortBy] = React.useState<"impressions" | "clicks" | "cost" | "conversions" | "cpl" | "ctr">("conversions");
  const [sortDir, setSortDir] = React.useState<"desc" | "asc">("desc");

  const { keywords, totals } = data;

  const countEscalar  = keywords.filter((k) => k.decision === "escalar").length;
  const countOtimizar = keywords.filter((k) => k.decision === "otimizar").length;
  const countPausar   = keywords.filter((k) => k.decision === "pausar").length;
  const countRevisar  = keywords.filter((k) => k.decision === "revisar").length;

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

  /* ── Loading skeleton ── */
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-[2rem] border border-[var(--border)] bg-[var(--card)]" />
        ))}
      </div>
    );
  }

  /* ── Error / empty states ── */
  if (data.error && keywords.length === 0) {
    return (
      <Card className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(20,21,26,0.98),rgba(12,12,16,1))] shadow-[0_24px_80px_rgba(0,0,0,0.38)]">
        <CardContent className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <AlertTriangle className="h-8 w-8 text-[var(--muted-foreground)]" />
          <p className="text-sm font-medium text-[var(--foreground)]">Palavras-chave indisponíveis</p>
          <p className="max-w-sm text-xs text-[var(--muted-foreground)]">{data.error}</p>
        </CardContent>
      </Card>
    );
  }

  if (keywords.length === 0) {
    return (
      <Card className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(20,21,26,0.98),rgba(12,12,16,1))] shadow-[0_24px_80px_rgba(0,0,0,0.38)]">
        <CardContent className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <Search className="h-8 w-8 text-[var(--muted-foreground)]" />
          <p className="text-sm font-medium text-[var(--foreground)]">Nenhuma palavra-chave encontrada</p>
          <p className="text-xs text-[var(--muted-foreground)]">Não há dados de keywords para o período selecionado.</p>
        </CardContent>
      </Card>
    );
  }

  /* ── Main render ── */
  const cols: { key: typeof sortBy; label: string }[] = [
    { key: "impressions", label: "Impr." },
    { key: "clicks",      label: "Cliques" },
    { key: "ctr",         label: "CTR" },
    { key: "cost",        label: "Custo" },
    { key: "conversions", label: "Conv." },
    { key: "cpl",         label: "Custo/Conv." },
  ];

  return (
    <div className="space-y-6">

      {/* ══ Main card ══ */}
      <Card className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(20,21,26,0.98),rgba(12,12,16,1))] shadow-[0_24px_80px_rgba(0,0,0,0.38)]">

        {/* ── Header ── */}
        <CardHeader className="border-b border-[var(--border)]/60 px-6 pb-5 pt-6 sm:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--accent),var(--primary))] text-white shadow-[0_12px_30px_rgba(220,38,38,0.25)]">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight text-[var(--foreground)] sm:text-2xl">
                  Análise Google Ads
                  <span className="ml-2 bg-[linear-gradient(90deg,var(--accent),var(--primary))] bg-clip-text text-transparent">
                    Palavras-chave
                  </span>
                </h3>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  Performance por termo no período selecionado — somente keywords com impressões.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[var(--border)] bg-white/[0.02] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                {keywords.length} termo{keywords.length !== 1 ? "s" : ""}
              </span>
              {data.dateFrom && (
                <span className="rounded-full border border-[var(--primary)]/25 bg-[var(--primary)]/12 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--foreground)]">
                  {data.dateFrom} → {data.dateTo}
                </span>
              )}
            </div>
          </div>
        </CardHeader>

        {/* ── KPI row ── */}
        <CardContent className="border-b border-[var(--border)]/60 px-6 py-5 sm:px-8">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <KpiTile label="Impressões"   value={fmt(totals.impressions)}                                      icon={Eye}              />
            <KpiTile label="Cliques"      value={fmt(totals.clicks)}                                           icon={MousePointerClick} />
            <KpiTile label="CTR Médio"    value={`${fmt(totals.ctr, 2)}%`}                                     icon={Percent}          />
            <KpiTile label="Investimento" value={formatCurrency(totals.cost)}                                  icon={Wallet}           />
            <KpiTile label="Conversões"   value={fmt(totals.conversions, 1)}                                   icon={TrendingUp}       accent />
            <KpiTile label="CPL Médio"    value={totals.cpl > 0 ? formatCurrency(totals.cpl) : "—"}           icon={TrendingUp}       accent />
          </div>
        </CardContent>

        {/* ── Decision strip ── */}
        <CardContent className="border-b border-[var(--border)]/60 px-0 py-0">
          <div className="grid grid-cols-2 sm:grid-cols-4">
            {([
              { count: countEscalar,  label: "Escalar",  dot: "bg-green-500", color: "text-green-500" },
              { count: countOtimizar, label: "Otimizar", dot: "bg-amber-500", color: "text-amber-500" },
              { count: countRevisar,  label: "Revisar",  dot: "bg-blue-400",  color: "text-blue-400"  },
              { count: countPausar,   label: "Pausar",   dot: "bg-red-500",   color: "text-red-500"   },
            ] as const).map((s, idx) => (
              <button
                key={s.label}
                onClick={() => setFilterDecision((v) => v === s.label.toLowerCase() ? "todos" : s.label.toLowerCase())}
                className={`flex flex-col items-center gap-1.5 border-[var(--border)]/40 py-4 transition-all hover:bg-white/[0.03]
                  ${idx > 0 ? "border-l" : ""}
                  ${filterDecision === s.label.toLowerCase() ? "bg-white/[0.05]" : ""}
                `}
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
                  <span className={`text-3xl font-black tabular-nums leading-none ${s.color}`}>{s.count}</span>
                </div>
                <span className={`text-[11px] font-semibold uppercase tracking-wider ${s.color}`}>{s.label}</span>
              </button>
            ))}
          </div>
          <div className="border-t border-[var(--border)]/40 px-6 py-2">
            <p className="text-center text-[11px] text-[var(--muted-foreground)]">
              {filterDecision !== "todos"
                ? `Mostrando: ${filterDecision} · ${filtered.length} termo${filtered.length !== 1 ? "s" : ""} · `
                : "Clique em uma categoria para filtrar · "}
              {filterDecision !== "todos" && (
                <button
                  onClick={() => setFilterDecision("todos")}
                  className="underline underline-offset-2 hover:text-[var(--foreground)]"
                >
                  limpar
                </button>
              )}
            </p>
          </div>
        </CardContent>

        {/* ── Table ── */}
        <CardContent className="px-3 pb-4 pt-4 sm:px-5 sm:pb-5">
          {/* Sub-header */}
          <div className="mb-3 flex items-center gap-2 px-1">
            <span className="h-3 w-[2px] rounded-full bg-[linear-gradient(180deg,var(--accent),var(--primary))]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
              Detalhamento de palavras-chave
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-separate [border-spacing:0_10px]">
              <thead>
                <tr>
                  <th className="w-[200px] px-4 text-left text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
                    Palavra-chave / Tipo
                  </th>
                  <th className="px-3 text-left text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
                    Campanha
                  </th>
                  {cols.map(({ key, label }) => {
                    const active = sortBy === key;
                    return (
                      <th
                        key={key}
                        onClick={() => toggleSort(key)}
                        className={`cursor-pointer select-none px-4 text-right text-[10px] font-semibold uppercase tracking-[0.2em] transition-colors
                          ${active ? "text-[var(--primary)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}
                      >
                        {label} {active ? (sortDir === "desc" ? "↓" : "↑") : ""}
                      </th>
                    );
                  })}
                  <th className="px-4 text-right text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
                    Decisão
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((kw, i) => {
                  const cfg = DECISION_CONFIG[kw.decision];
                  const isEven = i % 2 === 0;
                  const cellBg = isEven ? "bg-white/[0.03]" : "bg-white/[0.015]";
                  return (
                    <tr key={`${kw.text}-${kw.matchType}-${i}`} className="group">
                      {/* First col — rounded left */}
                      <td className={`rounded-l-2xl px-4 py-4 ${cellBg}`}>
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--foreground)]">{kw.text}</p>
                        <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">Corresp. {kw.matchType}</p>
                      </td>
                      <td className={`max-w-[160px] px-3 py-4 ${cellBg}`}>
                        <p className="truncate text-xs text-[var(--muted-foreground)]">{kw.campaignName}</p>
                      </td>
                      <td className={`px-4 py-4 text-right tabular-nums ${cellBg}`}>
                        <span className="text-sm font-bold text-[var(--foreground)]">{fmt(kw.impressions)}</span>
                      </td>
                      <td className={`px-4 py-4 text-right tabular-nums ${cellBg}`}>
                        <span className="text-sm font-bold text-[var(--foreground)]">{fmt(kw.clicks)}</span>
                      </td>
                      <td className={`px-4 py-4 text-right tabular-nums ${cellBg}`}>
                        <span className="text-sm font-bold text-[var(--foreground)]">{fmt(kw.ctr, 2)}%</span>
                      </td>
                      <td className={`px-4 py-4 text-right tabular-nums ${cellBg}`}>
                        <span className="text-sm font-bold text-[var(--foreground)]">{formatCurrency(kw.cost)}</span>
                      </td>
                      <td className={`px-4 py-4 text-right tabular-nums ${cellBg}`}>
                        <span className={`text-sm font-bold ${kw.conversions > 0 ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"}`}>
                          {fmt(kw.conversions, 1)}
                        </span>
                      </td>
                      <td className={`px-4 py-4 text-right tabular-nums ${cellBg}`}>
                        <span className={`text-sm font-semibold ${kw.cpl > 0 ? "text-green-500" : "text-[var(--muted-foreground)]"}`}>
                          {kw.cpl > 0 ? formatCurrency(kw.cpl) : "—"}
                        </span>
                      </td>
                      {/* Last col — rounded right */}
                      <td className={`rounded-r-2xl px-4 py-4 text-right ${cellBg}`}>
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${cfg.badge}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {/* Totals row */}
                <tr>
                  <td className="rounded-l-2xl bg-white/[0.05] px-4 py-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--foreground)]">Total</p>
                  </td>
                  <td className="bg-white/[0.05] px-3 py-4" />
                  <td className="bg-white/[0.05] px-4 py-4 text-right tabular-nums">
                    <span className="text-sm font-black text-[var(--foreground)]">{fmt(totals.impressions)}</span>
                  </td>
                  <td className="bg-white/[0.05] px-4 py-4 text-right tabular-nums">
                    <span className="text-sm font-black text-[var(--foreground)]">{fmt(totals.clicks)}</span>
                  </td>
                  <td className="bg-white/[0.05] px-4 py-4 text-right tabular-nums">
                    <span className="text-sm font-black text-[var(--foreground)]">{fmt(totals.ctr, 2)}%</span>
                  </td>
                  <td className="bg-white/[0.05] px-4 py-4 text-right tabular-nums">
                    <span className="text-sm font-black text-[var(--foreground)]">{formatCurrency(totals.cost)}</span>
                  </td>
                  <td className="bg-white/[0.05] px-4 py-4 text-right tabular-nums">
                    <span className="text-sm font-black text-[var(--primary)]">{fmt(totals.conversions, 1)}</span>
                  </td>
                  <td className="bg-white/[0.05] px-4 py-4 text-right tabular-nums">
                    <span className="text-sm font-black text-green-500">{totals.cpl > 0 ? formatCurrency(totals.cpl) : "—"}</span>
                  </td>
                  <td className="rounded-r-2xl bg-white/[0.05] px-4 py-4" />
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
