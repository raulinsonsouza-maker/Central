"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DefaultPanel } from "@/components/clientes/DefaultPanel";
import { AnalyticsGA4Section } from "@/components/clientes/AnalyticsGA4Section";
import { HotelFazendaSaoJoaoPanel } from "@/components/clientes/HotelFazendaSaoJoaoPanel";
import { TertuliaPanel } from "@/components/clientes/TertuliaPanel";
import { VarellaMotosPanel } from "@/components/clientes/VarellaMotosPanel";
import { isHotelFazendaSaoJoao, isTertulia, isVarellaMotos } from "@/lib/clientProfiles";
import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  PieChart,
  Pie,
  Cell,
  LabelList,
} from "recharts";
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, SlidersHorizontal, BarChart3, Play, TrendingUp, X } from "lucide-react";
import { upgradeFbCdnImageUrl } from "@/lib/utils";

/* ─── data fetchers (unchanged) ─── */

async function fetchCliente(id: string) {
  const res = await fetch(`/api/clientes/${id}`);
  if (!res.ok) throw new Error("Cliente não encontrado");
  return res.json();
}

type DateFilter = {
  periodo: string;
  dataInicio?: string;
  dataFim?: string;
};

function buildQueryParams(filter: DateFilter) {
  const params = new URLSearchParams();
  params.set("periodo", filter.periodo);
  if (filter.dataInicio) params.set("dataInicio", filter.dataInicio);
  if (filter.dataFim) params.set("dataFim", filter.dataFim);
  return params.toString();
}

async function fetchResumo(id: string, canal: "geral" | "meta" | "google", filter: DateFilter) {
  const params = new URLSearchParams(buildQueryParams(filter));
  params.set("canal", canal);
  const res = await fetch(`/api/clientes/${id}/resumo?${params.toString()}`);
  if (!res.ok) throw new Error("Falha ao carregar resumo");
  return res.json();
}

async function fetchMidia(id: string, canal: string, filter: DateFilter) {
  const params = buildQueryParams(filter);
  const res = await fetch(
    `/api/clientes/${id}/midia?canal=${canal}&agrupamento=semanal&${params}`
  );
  if (!res.ok) throw new Error("Falha ao carregar mídia");
  return res.json();
}

async function fetchFinanceiro(id: string, canal: "geral" | "meta" | "google") {
  const res = await fetch(`/api/clientes/${id}/financeiro?canal=${canal}`);
  if (!res.ok) throw new Error("Falha ao carregar financeiro");
  return res.json();
}

async function fetchPainelEspecial(
  id: string,
  canal: "geral" | "meta" | "google",
  filter: DateFilter
) {
  const params = new URLSearchParams(buildQueryParams(filter));
  params.set("canal", canal);
  const res = await fetch(`/api/clientes/${id}/painel-especial?${params.toString()}`);
  if (!res.ok) throw new Error("Falha ao carregar painel especial");
  return res.json();
}

async function fetchPainelTertulia(
  id: string,
  canal: "geral" | "meta" | "google",
  filter: DateFilter
) {
  const params = new URLSearchParams(buildQueryParams(filter));
  params.set("canal", canal);
  const res = await fetch(`/api/clientes/${id}/painel-tertulia?${params.toString()}`);
  if (!res.ok) throw new Error("Falha ao carregar painel da Tertúlia");
  return res.json();
}

async function fetchPainelVarella(
  id: string,
  canal: "geral" | "meta" | "google",
  filter: DateFilter
) {
  const params = new URLSearchParams(buildQueryParams(filter));
  params.set("canal", canal);
  const res = await fetch(`/api/clientes/${id}/painel-varella?${params.toString()}`);
  if (!res.ok) throw new Error("Falha ao carregar painel da Varella Motos");
  return res.json();
}

async function fetchMetaAds(clienteId: string, filter: DateFilter, live = false) {
  const params = new URLSearchParams(buildQueryParams(filter));
  params.set("clienteId", clienteId);
  if (live) params.set("live", "1");
  const res = await fetch(`/api/meta/ads?${params.toString()}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (body as { error?: string }).error ?? "Falha ao carregar anúncios";
    throw new Error(msg);
  }
  return body;
}

async function fetchGoogleAdsCriativos(
  clienteId: string,
  periodo?: string,
  ordenarPor?: string
) {
  const params = new URLSearchParams();
  if (periodo) params.set("periodo", periodo);
  if (ordenarPor) params.set("ordenarPor", ordenarPor);
  const res = await fetch(
    `/api/clientes/${clienteId}/criativos-google?${params.toString()}`
  );
  if (!res.ok) throw new Error("Falha ao carregar criativos Google");
  return res.json();
}

async function fetchAnalytics(id: string, filter: DateFilter) {
  const params = buildQueryParams(filter);
  const res = await fetch(`/api/clientes/${id}/analytics?${params}`);
  if (!res.ok) throw new Error("Falha ao carregar analytics");
  return res.json();
}

/* ─── date helpers (unchanged) ─── */

type PresetPeriodo =
  | "hoje"
  | "ontem"
  | "7d"
  | "14d"
  | "30d"
  | "60d"
  | "90d"
  | "180d"
  | "365d"
  | "mesAtual"
  | "mesAnterior"
  | "trimestreAtual"
  | "semestreAtual"
  | "ytd"
  | "custom";

function toDateInputValue(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fromDateInputValue(value?: string) {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  const parsed = new Date(y, m - 1, d);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDatePt(value?: string) {
  const date = fromDateInputValue(value);
  if (!date) return "—";
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildMonthGrid(monthDate: Date) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const startWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const cells: Array<Date | null> = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function dateDiffInDays(start: Date, end: Date) {
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.floor(ms / (24 * 60 * 60 * 1000)) + 1);
}

function getDateFilterFromPreset(
  preset: PresetPeriodo,
  customInicio?: string,
  customFim?: string
): DateFilter & { label: string } {
  const hoje = new Date();
  const fim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const inicio = new Date(fim);

  const make = (start: Date, end: Date, label: string): DateFilter & { label: string } => ({
    periodo: String(dateDiffInDays(start, end)),
    dataInicio: toDateInputValue(start),
    dataFim: toDateInputValue(end),
    label,
  });

  if (preset === "custom" && customInicio && customFim) {
    const [y1, m1, d1] = customInicio.split("-").map(Number);
    const [y2, m2, d2] = customFim.split("-").map(Number);
    if (y1 && m1 && d1 && y2 && m2 && d2) {
      const start = new Date(y1, m1 - 1, d1);
      const end = new Date(y2, m2 - 1, d2);
      if (start <= end) {
        return {
          ...make(start, end, "Personalizado"),
          label: `${formatDatePt(customInicio)} - ${formatDatePt(customFim)}`,
        };
      }
    }
  }

  switch (preset) {
    case "hoje": {
      return make(fim, fim, "Hoje");
    }
    case "ontem": {
      const ontem = new Date(fim);
      ontem.setDate(fim.getDate() - 1);
      return make(ontem, ontem, "Ontem");
    }
    case "7d":
    case "14d":
    case "30d":
    case "60d":
    case "90d":
    case "180d":
    case "365d": {
      const dias = parseInt(preset.replace("d", ""), 10);
      inicio.setDate(fim.getDate() - (dias - 1));
      return make(inicio, fim, `Últimos ${dias} dias`);
    }
    case "mesAtual": {
      const start = new Date(fim.getFullYear(), fim.getMonth(), 1);
      return make(start, fim, "Mês atual");
    }
    case "mesAnterior": {
      const start = new Date(fim.getFullYear(), fim.getMonth() - 1, 1);
      const end = new Date(fim.getFullYear(), fim.getMonth(), 0);
      return make(start, end, "Mês anterior");
    }
    case "trimestreAtual": {
      const quarterStartMonth = Math.floor(fim.getMonth() / 3) * 3;
      const start = new Date(fim.getFullYear(), quarterStartMonth, 1);
      return make(start, fim, "Trimestre atual");
    }
    case "semestreAtual": {
      const semesterStartMonth = fim.getMonth() < 6 ? 0 : 6;
      const start = new Date(fim.getFullYear(), semesterStartMonth, 1);
      return make(start, fim, "Semestre atual");
    }
    case "ytd": {
      const start = new Date(fim.getFullYear(), 0, 1);
      return make(start, fim, "Ano atual (YTD)");
    }
    default: {
      inicio.setDate(fim.getDate() - 89);
      return make(inicio, fim, "Últimos 90 dias");
    }
  }
}

/* ─── shared tooltip style ─── */

const tooltipStyle = {
  contentStyle: {
    backgroundColor: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "10px",
    color: "var(--foreground)",
    boxShadow: "0 8px 24px rgba(0,0,0,.35)",
    padding: "10px 14px",
  },
  labelStyle: { color: "var(--foreground)", fontWeight: 600, marginBottom: 4 },
  itemStyle: { color: "var(--foreground)", fontSize: 13 },
};

/* ─── section header helper ─── */

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h2 className="text-lg font-bold tracking-tight text-[var(--foreground)]">{title}</h2>
      {subtitle ? <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{subtitle}</p> : null}
    </div>
  );
}

/* ─── main page ─── */

export default function ClienteDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [canal, setCanal] = React.useState<"geral" | "meta" | "google">("geral");
  const [subView, setSubView] = React.useState<"dados" | "criativos">("dados");
  const [presetPeriodo, setPresetPeriodo] = React.useState<PresetPeriodo>("90d");
  const [customInicio, setCustomInicio] = React.useState("");
  const [customFim, setCustomFim] = React.useState("");
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [visibleMonth, setVisibleMonth] = React.useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth() - 1, 1);
  });
  const filterRef = React.useRef<HTMLDivElement | null>(null);

  const dateFilter = React.useMemo(
    () => getDateFilterFromPreset(presetPeriodo, customInicio, customFim),
    [presetPeriodo, customInicio, customFim]
  );

  React.useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!filterOpen) return;
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [filterOpen]);

  React.useEffect(() => {
    const end = fromDateInputValue(dateFilter.dataFim);
    if (end) {
      setVisibleMonth(new Date(end.getFullYear(), end.getMonth() - 1, 1));
    }
  }, [dateFilter.dataFim]);

  const leftMonth = visibleMonth;
  const rightMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
  const startSelected = fromDateInputValue(customInicio);
  const endSelected = fromDateInputValue(customFim);

  const topRangeLabel =
    presetPeriodo === "custom" && customInicio && customFim
      ? `Personalizado: ${formatDatePt(customInicio)} a ${formatDatePt(customFim)}`
      : `${dateFilter.label}: ${formatDatePt(dateFilter.dataInicio)} a ${formatDatePt(dateFilter.dataFim)}`;

  const handleDayClick = (day: Date) => {
    const clicked = toDateInputValue(day);
    if (!startSelected || (startSelected && endSelected)) {
      setPresetPeriodo("custom");
      setCustomInicio(clicked);
      setCustomFim("");
      return;
    }
    if (day < startSelected) {
      setPresetPeriodo("custom");
      setCustomInicio(clicked);
      setCustomFim(toDateInputValue(startSelected));
      return;
    }
    setPresetPeriodo("custom");
    setCustomFim(clicked);
  };

  const isInRange = (day: Date) => {
    if (!startSelected || !endSelected) return false;
    return day >= startSelected && day <= endSelected;
  };

  const { data: cliente } = useQuery({
    queryKey: ["cliente", id],
    queryFn: () => fetchCliente(id),
  });
  const { data: resumo } = useQuery({
    queryKey: ["resumo", id, canal, dateFilter.periodo, dateFilter.dataInicio, dateFilter.dataFim],
    queryFn: () => fetchResumo(id, canal as "geral" | "meta" | "google", dateFilter),
    enabled: !!id,
  });
  const { data: midia } = useQuery({
    queryKey: ["midia", id, canal, dateFilter.periodo, dateFilter.dataInicio, dateFilter.dataFim],
    queryFn: () => fetchMidia(id, canal as string, dateFilter),
    enabled: !!id,
  });

  const { data: financeiro } = useQuery({
    queryKey: ["financeiro", id, canal],
    queryFn: () => fetchFinanceiro(id, canal as "geral" | "meta" | "google"),
    enabled: !!id,
  });
  const { data: metaAdsData, isLoading: metaAdsLoading, error: metaAdsError } = useQuery({
    queryKey: ["meta-ads", id, dateFilter.periodo, dateFilter.dataInicio, dateFilter.dataFim],
    queryFn: () => fetchMetaAds(id, dateFilter, true),
    enabled: !!id && canal === "meta",
  });
  const { data: googleCriativosData, isLoading: googleCriativosLoading } = useQuery({
    queryKey: ["google-criativos", id, dateFilter.periodo],
    queryFn: () =>
      fetchGoogleAdsCriativos(id, dateFilter.periodo, "impressoes"),
    enabled: !!id && canal === "google",
  });
  const isHotelPanel = isHotelFazendaSaoJoao(cliente) && canal !== "google";
  const isTertuliaPanel = isTertulia(cliente) && canal !== "google";
  const isVarellaPanel = isVarellaMotos(cliente);
  const isSpecialPanel = isHotelPanel || isTertuliaPanel || isVarellaPanel;
  const { data: painelEspecial } = useQuery({
    queryKey: ["painel-especial", id, canal, dateFilter.periodo, dateFilter.dataInicio, dateFilter.dataFim],
    queryFn: () => fetchPainelEspecial(id, canal as "geral" | "meta" | "google", dateFilter),
    enabled: !!id && isHotelPanel,
  });
  const { data: painelTertulia } = useQuery({
    queryKey: ["painel-tertulia", id, canal, dateFilter.periodo, dateFilter.dataInicio, dateFilter.dataFim],
    queryFn: () => fetchPainelTertulia(id, canal as "geral" | "meta" | "google", dateFilter),
    enabled: !!id && isTertuliaPanel,
  });
  const { data: painelVarella } = useQuery({
    queryKey: ["painel-varella", id, canal, dateFilter.periodo, dateFilter.dataInicio, dateFilter.dataFim],
    queryFn: () => fetchPainelVarella(id, canal as "geral" | "meta" | "google", dateFilter),
    enabled: !!id && isVarellaPanel,
  });

  const { data: analytics } = useQuery({
    queryKey: ["analytics", id, dateFilter.periodo, dateFilter.dataInicio, dateFilter.dataFim],
    queryFn: () => fetchAnalytics(id, dateFilter),
    enabled: !!id && (canal === "geral" || subView === "dados"),
  });

  const series = midia?.series ?? [];
  const latestFiveSeries = series.slice(-5);
  const chartConversionKey = canal === "google" ? "Conversões" : "Leads";
  const chartData = series.map((s: { periodo: string; investimento: number; leads: number }) => {
    const inv = Math.round(s.investimento * 100) / 100;
    const conv = s.leads;
    return {
      periodo: s.periodo,
      Investimento: inv,
      [chartConversionKey]: conv,
      CPL: conv > 0 ? Math.round((s.investimento / conv) * 100) / 100 : 0,
    };
  });

  const canalLabels: Record<string, string> = {
    geral: "Geral",
    google: "Google",
    meta: "META",
  };

  type MetricTrend = "higher" | "lower" | "neutral";
  type MetricRow = { investimento: number; leads: number; impressoes: number; cliques: number };

  const metricDefinitions = React.useMemo(() => {
    const conversionLabel = canal === "google" ? "CONVERSÕES" : "LEADS";
    const conversionDesc =
      canal === "google"
        ? "Total de conversões atribuídas (alinhado ao relatório de campanhas do Google Ads)."
        : "Conversões atribuídas ao período.";
    const taxaDesc =
      canal === "google"
        ? "Conversões em relação aos cliques (taxa de conversão aproximada)."
        : "Percentual de leads sobre cliques.";
    const custoPorResultadoLabel = canal === "google" ? "CUSTO / CONV." : "CPL";
    const custoPorResultadoDesc =
      canal === "google"
        ? "Investimento ÷ conversões da semana (equivalente ao custo por conversão do Google)."
        : "Custo médio por lead da semana.";
    return [
      {
        label: "INVESTIMENTO",
        description: "Valor investido em mídia na semana.",
        trend: "neutral" as MetricTrend,
        value: (s: MetricRow) => s.investimento,
        format: (value: number) => formatCurrency(value),
      },
      {
        label: "IMPRESSÕES",
        description: "Volume total de entregas dos anúncios.",
        trend: "higher" as MetricTrend,
        value: (s: MetricRow) => s.impressoes,
        format: (value: number) => formatInteger(value),
      },
      {
        label: "CLIQUES",
        description:
          canal === "google"
            ? "Cliques nos anúncios (no Google Ads, “interações” pode incluir outros tipos)."
            : "Interações geradas pelos anúncios.",
        trend: "higher" as MetricTrend,
        value: (s: MetricRow) => s.cliques,
        format: (value: number) => formatInteger(value),
      },
      {
        label: "CTR (%)",
        description: "Taxa de clique sobre impressões.",
        trend: "higher" as MetricTrend,
        value: (s: MetricRow) => (s.impressoes > 0 ? (s.cliques / s.impressoes) * 100 : 0),
        format: (value: number) => formatPercentage(value),
      },
      {
        label: conversionLabel,
        description: conversionDesc,
        trend: "higher" as MetricTrend,
        value: (s: MetricRow) => s.leads,
        format: (value: number) => formatInteger(value),
      },
      {
        label: "TAXA CONV.",
        description: taxaDesc,
        trend: "higher" as MetricTrend,
        value: (s: MetricRow) => (s.cliques > 0 ? (s.leads / s.cliques) * 100 : 0),
        format: (value: number) => formatPercentage(value),
      },
      {
        label: "CPC",
        description: "Custo médio por clique gerado.",
        trend: "lower" as MetricTrend,
        value: (s: MetricRow) => (s.cliques > 0 ? s.investimento / s.cliques : 0),
        format: (value: number) => formatCurrency(value),
      },
      {
        label: custoPorResultadoLabel,
        description: custoPorResultadoDesc,
        trend: "lower" as MetricTrend,
        value: (s: MetricRow) => (s.leads > 0 ? s.investimento / s.leads : 0),
        format: (value: number) => formatCurrency(value),
      },
    ];
  }, [canal]);

function formatCurrency(value: number) {
  return `R$ ${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatInteger(value: number) {
  return value.toLocaleString("pt-BR");
}

function formatPercentage(value: number) {
  return `${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}%`;
}

  return (
    <main className="space-y-8 pb-12">
      {/* ── Breadcrumb + Title + Channel tabs ── */}
      <section className="space-y-5">
        <Link
          href="/clientes"
          className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Central de clientes
        </Link>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--primary)]">
              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
              Check-in estratégico
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[var(--foreground)] sm:text-3xl">
              {cliente?.nome ?? "…"}
            </h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Monitoramento de performance do projeto
            </p>
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--card)] p-1">
            {(["geral", "meta", "google"] as const).map((c) => (
              <button
                key={c}
                onClick={() => {
                  setCanal(c);
                  setSubView("dados");
                }}
                className={`rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all ${
                  canal === c
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-md shadow-[var(--primary)]/20"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {c === "geral" ? "Geral" : c === "meta" ? "META" : "Google"}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Date filter + sub-aba Criativos / Análise de dados (Meta/Google) ── */}
      <div className="flex flex-wrap items-center justify-end gap-3" ref={filterRef}>
        <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] p-1">
          <button
            onClick={() => setFilterOpen((v) => !v)}
            className="inline-flex items-center gap-2.5 rounded-lg px-4 py-2 text-xs transition-all hover:bg-[var(--muted)]/60 sm:text-sm"
          >
            <CalendarDays className="h-4 w-4 shrink-0 text-[var(--primary)]" />
            <span className="min-w-0 truncate text-[var(--foreground)] max-w-[200px] md:max-w-[320px]">
              {topRangeLabel}
            </span>
            <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-[var(--muted-foreground)]" />
          </button>

          {(canal === "meta" || canal === "google") && (
            <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--background)]/60 p-1">
              {(["dados", "criativos"] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => setSubView(view)}
                  className={`rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-all ${
                    subView === view
                      ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-md shadow-[var(--primary)]/20"
                      : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]/60 hover:text-[var(--foreground)]"
                  }`}
                >
                  {view === "dados" ? "Análise de dados" : `Criativos ${canal === "meta" ? "META" : "Google"}`}
                </button>
              ))}
            </div>
          )}
        </div>

        {filterOpen && (
          <div className="absolute right-4 top-28 z-40 w-[min(920px,100%-2rem)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl shadow-black/40">
            <div className="grid md:grid-cols-[260px_1fr]">
              {/* Presets sidebar */}
              <div className="border-b border-[var(--border)] p-4 md:border-b-0 md:border-r">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                  Períodos predefinidos
                </p>
                <div className="space-y-0.5">
                  {[
                    ["hoje", "Hoje"],
                    ["ontem", "Ontem"],
                    ["7d", "Últimos 7 dias"],
                    ["14d", "Últimos 14 dias"],
                    ["30d", "Últimos 30 dias"],
                    ["60d", "Últimos 60 dias"],
                    ["90d", "Últimos 90 dias"],
                    ["mesAtual", "Este mês"],
                    ["mesAnterior", "Mês passado"],
                    ["trimestreAtual", "Este trimestre"],
                    ["ytd", "Ano atual (YTD)"],
                    ["custom", "Personalizado"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-all ${
                        presetPeriodo === value
                          ? "bg-[var(--primary)]/10 font-medium text-[var(--primary)]"
                          : "text-[var(--foreground)] hover:bg-[var(--muted)]/60"
                      }`}
                      onClick={() => setPresetPeriodo(value as PresetPeriodo)}
                    >
                      <span>{label}</span>
                      <span
                        className={`h-2 w-2 rounded-full transition-all ${
                          presetPeriodo === value
                            ? "bg-[var(--primary)] shadow-sm shadow-[var(--primary)]/40"
                            : "bg-[var(--border)]"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Calendar */}
              <div className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <button
                    onClick={() =>
                      setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <p className="text-xs font-medium text-[var(--muted-foreground)]">
                    {formatDatePt(customInicio)} {customFim ? `a ${formatDatePt(customFim)}` : ""}
                  </p>
                  <button
                    onClick={() =>
                      setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                  {[leftMonth, rightMonth].map((monthDate) => {
                    const grid = buildMonthGrid(monthDate);
                    return (
                      <div
                        key={`${monthDate.getFullYear()}-${monthDate.getMonth()}`}
                        className="rounded-xl border border-[var(--border)] p-3"
                      >
                        <p className="mb-2 text-sm font-semibold capitalize text-[var(--foreground)]">
                          {monthDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                        </p>
                        <div className="mb-1.5 grid grid-cols-7 text-center text-[10px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                          {["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"].map((d) => (
                            <span key={d}>{d}</span>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 gap-0.5">
                          {grid.map((day, idx) => {
                            if (!day) return <span key={idx} className="h-8" />;
                            const selectedStart = !!startSelected && isSameDay(day, startSelected);
                            const selectedEnd = !!endSelected && isSameDay(day, endSelected);
                            const inRange = isInRange(day);
                            return (
                              <button
                                key={toDateInputValue(day)}
                                onClick={() => handleDayClick(day)}
                                className={`h-8 rounded-md text-xs font-medium transition-all ${
                                  selectedStart || selectedEnd
                                    ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm shadow-[var(--primary)]/30"
                                    : inRange
                                      ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                                      : "text-[var(--foreground)] hover:bg-[var(--muted)]/60"
                                }`}
                              >
                                {day.getDate()}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={customInicio}
                      onChange={(e) => {
                        setPresetPeriodo("custom");
                        setCustomInicio(e.target.value);
                      }}
                      className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm"
                    />
                    <input
                      type="date"
                      value={customFim}
                      onChange={(e) => {
                        setPresetPeriodo("custom");
                        setCustomFim(e.target.value);
                      }}
                      className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFilterOpen(false)}
                      className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--muted-foreground)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => setFilterOpen(false)}
                      className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] transition hover:opacity-90"
                    >
                      Atualizar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Criativos / Anúncios (Meta) ── */}
      {canal === "meta" && subView === "criativos" && (
        <div className="space-y-8">
          <Card className="overflow-hidden rounded-2xl border-[var(--border)]">
            <CardHeader className="pb-2">
              <SectionHeader title="Criativos META" />
            </CardHeader>
            <CardContent>
              {metaAdsLoading ? (
                <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">Carregando anúncios META…</p>
              ) : metaAdsError ? (
                <p className="py-8 text-center text-sm text-[var(--accent)]">
                  {metaAdsError instanceof Error ? metaAdsError.message : "Erro ao carregar anúncios META."}
                </p>
              ) : metaAdsData?.data?.length ? (
                <MetaCriativosGrid
                  ads={metaAdsData.data}
                  formatCurrency={formatCurrency}
                  periodLabel={dateFilter.label}
                />
              ) : (
                <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
                  Nenhum anúncio META ativo encontrado.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Criativos / Anúncios (Google Ads) ── */}
      {canal === "google" && subView === "criativos" && (
        <div className="space-y-8">
          <Card className="overflow-hidden rounded-2xl border-[var(--border)]">
            <CardHeader className="pb-2">
              <SectionHeader
                title="Criativos Google Ads"
                subtitle="Anúncios que mais performam (headlines, descrição, impressões, cliques, investimento)"
              />
            </CardHeader>
            <CardContent>
              {googleCriativosLoading ? (
                <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">Carregando criativos Google…</p>
              ) : googleCriativosData?.criativos?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)]">
                        <th className="pb-3 pr-2 font-semibold text-[var(--muted-foreground)]">Campanha / Grupo</th>
                        <th className="pb-3 pr-2 font-semibold text-[var(--muted-foreground)]">Headline 1</th>
                        <th className="pb-3 pr-2 font-semibold text-[var(--muted-foreground)]">Headline 2</th>
                        <th className="pb-3 pr-2 font-semibold text-[var(--muted-foreground)]">Descrição</th>
                        <th className="pb-3 pr-2 font-semibold text-[var(--muted-foreground)]">Investimento</th>
                        <th className="pb-3 pr-2 font-semibold text-[var(--muted-foreground)]">Impressões</th>
                        <th className="pb-3 pr-2 font-semibold text-[var(--muted-foreground)]">Cliques</th>
                        <th className="pb-3 font-semibold text-[var(--muted-foreground)]">CTR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {googleCriativosData.criativos.map((c: { adResourceName: string; campaignName?: string; adGroupName?: string; headline1?: string; headline2?: string; description?: string; investimento: number; impressoes: number; cliques: number; ctr: number }) => (
                        <tr key={c.adResourceName} className="border-b border-[var(--border)]/70">
                          <td className="py-3 pr-2 text-[var(--foreground)]">
                            <span className="font-medium">{c.campaignName || "—"}</span>
                            {c.adGroupName && (
                              <span className="block text-xs text-[var(--muted-foreground)]">{c.adGroupName}</span>
                            )}
                          </td>
                          <td className="max-w-[160px] py-3 pr-2 text-[var(--muted-foreground)]">
                            <span className="line-clamp-2">{c.headline1 || "—"}</span>
                          </td>
                          <td className="max-w-[160px] py-3 pr-2 text-[var(--muted-foreground)]">
                            <span className="line-clamp-2">{c.headline2 || "—"}</span>
                          </td>
                          <td className="max-w-[200px] py-3 pr-2 text-[var(--muted-foreground)]">
                            <span className="line-clamp-2">{c.description || "—"}</span>
                          </td>
                          <td className="py-3 pr-2 tabular-nums">{formatCurrency(c.investimento)}</td>
                          <td className="py-3 pr-2 tabular-nums">{c.impressoes.toLocaleString("pt-BR")}</td>
                          <td className="py-3 pr-2 tabular-nums">{c.cliques.toLocaleString("pt-BR")}</td>
                          <td className="py-3 tabular-nums">{c.ctr.toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
                  Nenhum criativo Google Ads encontrado. Configure a conta GOOGLE_ADS e execute a sincronização.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Default panel (KPIs, chart, weekly table, financial) ── */}
      {(canal === "geral" || subView === "dados") && !isSpecialPanel && resumo && (
        <DefaultPanel
          resumo={resumo}
          chartData={chartData}
          chartConversionKey={chartConversionKey}
          latestFiveSeries={latestFiveSeries}
          metricDefinitions={metricDefinitions}
          dateFilter={dateFilter}
          canal={canal}
          canalLabels={canalLabels}
          financeiro={financeiro ?? undefined}
          formatCurrency={formatCurrency}
        />
      )}

      {(canal === "geral" || subView === "dados") && isHotelPanel && painelEspecial && (
        <HotelFazendaSaoJoaoPanel
          data={painelEspecial}
          canalLabel={canal === "geral" ? "geral" : canal === "meta" ? "meta" : "google"}
        />
      )}

      {(canal === "geral" || subView === "dados") && isTertuliaPanel && painelTertulia && (
        <TertuliaPanel
          data={painelTertulia}
          canalLabel={canal === "geral" ? "geral" : canal === "meta" ? "meta" : "google"}
        />
      )}

      {(canal === "geral" || subView === "dados") && isVarellaPanel && painelVarella && (
        <VarellaMotosPanel
          data={painelVarella}
          canalLabel={canal === "geral" ? "geral" : canal === "meta" ? "meta" : "google"}
        />
      )}

      {/* ── Comportamento GA4 (todos os painéis quando configurado) ── */}
      {(canal === "geral" || subView === "dados") && analytics?.hasAnalytics && (
        <AnalyticsGA4Section data={analytics} />
      )}

      {/* ── Financial tracking (para painéis customizados) ── */}
      {(canal === "geral" || subView === "dados") && isSpecialPanel && financeiro && financeiro.meses && (
        <Card className="overflow-hidden rounded-2xl border-[var(--border)]">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <SectionHeader
                title="Acompanhamento financeiro · Plano x Real"
                subtitle="Status de investimento no ano atual (planejado versus realizado em todos os canais)"
              />
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 px-3 py-1.5 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--muted-foreground)]/60" />
                  <span className="text-[var(--muted-foreground)]">Orçado</span>
                  <strong className="text-[var(--foreground)]">
                    R${" "}
                    {Number(financeiro.totalPlanejado ?? 0).toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </strong>
                </div>
                <div className="inline-flex items-center gap-2 rounded-lg border border-[var(--primary)]/20 bg-[var(--primary)]/5 px-3 py-1.5 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--primary)]" />
                  <span className="text-[var(--muted-foreground)]">Realizado</span>
                  <strong className="text-[var(--primary)]">
                    R${" "}
                    {Number(financeiro.totalRealizado ?? 0).toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </strong>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={financeiro.meses.map(
                    (m: { ano: number; mes: number; planejadoTotal: number; realizadoTotal: number }) => ({
                      mes: new Date(m.ano, m.mes - 1, 1)
                        .toLocaleString("pt-BR", { month: "short" })
                        .toUpperCase(),
                      Orcado: m.planejadoTotal,
                      Realizado: m.realizadoTotal,
                    })
                  )}
                >
                  <defs>
                    <linearGradient id="finBarGradSpecial" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--muted-foreground)" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="var(--muted)" stopOpacity={0.6} />
                    </linearGradient>
                    <linearGradient id="finRealGradSpecial" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />
                  <XAxis
                    dataKey="mes"
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => formatCurrency(Number(value))}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      formatCurrency(Number(value)),
                      name,
                    ]}
                    {...tooltipStyle}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ paddingTop: 12, fontSize: 12 }}
                  />
                  <Bar dataKey="Orcado" fill="url(#finBarGradSpecial)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Realizado" fill="url(#finRealGradSpecial)" radius={[6, 6, 0, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Pauta da semana (geral only) ── */}
      {id && canal === "geral" && <PautaDaSemana clienteId={id} />}

      {/* ── Empty state ── */}
      {id && (canal === "geral" || subView === "dados") && resumo && resumo.leads === 0 && Number(resumo.investimento) === 0 && (
        <Card className="overflow-hidden rounded-2xl border-[var(--border)]">
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--muted)]">
              <BarChart3 className="h-6 w-6 text-[var(--muted-foreground)]" />
            </div>
            <p className="mb-1 text-sm font-medium text-[var(--foreground)]">
              Nenhum dado de mídia ainda
            </p>
            <p className="mx-auto max-w-md text-sm text-[var(--muted-foreground)]">
              A sincronização é feita na <strong className="text-[var(--foreground)]">Administração</strong>:
              configure as credenciais do Google Sheets e clique em{" "}
              <strong className="text-[var(--foreground)]">Sincronizar</strong>.
            </p>
            <Link
              href="/admin/clientes"
              className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)]/10 px-4 py-2 text-sm font-medium text-[var(--primary)] transition hover:bg-[var(--primary)]/20"
            >
              Ir para Administração
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>
      )}
    </main>
  );
}

/* ─── Meta Criativos Grid ─── */

type MetaAdCreative = {
  id?: string;
  thumbnail_url?: string;
  image_url?: string;
  image_url_full?: string;
  video_id?: string;
  video_source_url?: string;
  video_picture_url?: string;
  video_embed_html?: string;
  body?: string;
  title?: string;
};

type MetaAdItem = {
  id: string;
  name: string;
  adcreatives?: { data: MetaAdCreative[] };
  insights?: { data: Array<{ spend?: string; impressions?: string; clicks?: string; ctr?: string; cpc?: string }> };
};

type MetaCriativoSortedItem = {
  ad: MetaAdItem;
  creative: MetaAdCreative | undefined;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  mediaType: string;
  primaryText: string;
};

const metaCriativosTooltipStyle = {
  contentStyle: {
    backgroundColor: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "10px",
    color: "var(--foreground)",
    boxShadow: "0 8px 24px rgba(0,0,0,.35)",
    padding: "10px 14px",
  },
  labelStyle: { color: "var(--foreground)", fontWeight: 600, marginBottom: 4 },
  itemStyle: { color: "var(--foreground)", fontSize: 13 },
};

function MetaCriativosComparisonPanel({
  selected,
  sorted,
  averageCtr,
  totalSpend,
  formatCurrency,
  maxCtr,
}: {
  selected: MetaCriativoSortedItem;
  sorted: MetaCriativoSortedItem[];
  averageCtr: number;
  totalSpend: number;
  formatCurrency: (v: number) => string;
  maxCtr: number;
}) {
  const spendShare = totalSpend > 0 ? (selected.spend / totalSpend) * 100 : 0;
  const ctrRank = [...sorted].sort((a, b) => b.ctr - a.ctr).findIndex((item) => item.ad.id === selected.ad.id) + 1;
  const isAbove = selected.ctr >= averageCtr;
  const isFarBelow = selected.ctr < averageCtr * 0.7;
  const isTop = ctrRank === 1;
  const isHighShare = spendShare >= 25;
  const ctrDiff = selected.ctr - averageCtr;

  let statusLabel = "Na média";
  let statusClasses = "text-[var(--muted-foreground)] bg-[var(--muted)]/20 border-[var(--border)]";
  if (isTop && sorted.length > 1) {
    statusLabel = "Top performer";
    statusClasses = "text-amber-500 bg-amber-500/10 border-amber-500/30";
  } else if (isAbove) {
    statusLabel = "Acima da média";
    statusClasses = "text-green-500 bg-green-500/10 border-green-500/30";
  } else if (isFarBelow) {
    statusLabel = "Baixo desempenho";
    statusClasses = "text-red-500 bg-red-500/10 border-red-500/30";
  }

  let insight = "";
  if (isTop && isHighShare) insight = `Melhor CTR com ${spendShare.toFixed(0)}% do orçamento. Excelente alocação — continue investindo.`;
  else if (isTop && !isHighShare) insight = `Melhor CTR do conjunto, mas recebe apenas ${spendShare.toFixed(0)}% da verba. Considere aumentar o investimento.`;
  else if (isAbove && isHighShare) insight = `CTR acima da média com boa participação no orçamento. Conjunto bem alocado.`;
  else if (isAbove && !isHighShare) insight = `CTR acima da média. Tem espaço para receber mais investimento e escalar resultados.`;
  else if (isFarBelow && isHighShare) insight = `CTR baixo com ${spendShare.toFixed(0)}% do orçamento. Redistribua a verba para criativos mais eficientes.`;
  else if (isFarBelow) insight = `CTR abaixo do esperado. Revise o criativo ou o público antes de aumentar o investimento.`;
  else insight = `Performance dentro da média. Monitore por mais tempo para uma análise conclusiva.`;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)]/70 p-5 space-y-4">
      <div className="flex min-h-[28px] items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-1 w-1 shrink-0 rounded-full bg-[var(--primary)]" />
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">Posição no conjunto</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusClasses}`}>
          {statusLabel}
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <div className="mb-1.5 flex justify-between text-[10px]">
            <span className="text-[var(--muted-foreground)]">CTR — #{ctrRank} de {sorted.length}</span>
            <span className={`font-semibold tabular-nums ${isAbove ? "text-green-500" : isFarBelow ? "text-red-500" : "text-amber-500"}`}>
              {selected.ctr.toFixed(2)}%
              {ctrDiff !== 0 && (
                <span className="ml-1 font-normal opacity-70">
                  ({ctrDiff > 0 ? "+" : ""}{ctrDiff.toFixed(2)}%)
                </span>
              )}
            </span>
          </div>
          <div className="relative h-2 overflow-hidden rounded-full bg-[var(--muted)]/40">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-[var(--muted-foreground)]/25"
              style={{ width: `${Math.min(100, (averageCtr / Math.max(maxCtr, 0.01)) * 100)}%` }}
            />
            <div
              className={`absolute inset-y-0 left-0 rounded-full transition-all ${isAbove ? "bg-green-500" : isFarBelow ? "bg-red-500" : "bg-amber-500"}`}
              style={{ width: `${Math.min(100, (selected.ctr / Math.max(maxCtr, 0.01)) * 100)}%` }}
            />
          </div>
          <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">Média do conjunto: {averageCtr.toFixed(2)}%</p>
        </div>

        <div>
          <div className="mb-1.5 flex justify-between text-[10px]">
            <span className="text-[var(--muted-foreground)]">Share de orçamento</span>
            <span className="font-semibold tabular-nums text-[var(--foreground)]">{spendShare.toFixed(1)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--muted)]/40">
            <div
              className="h-full rounded-full bg-[var(--primary)] transition-all"
              style={{ width: `${Math.min(100, spendShare)}%` }}
            />
          </div>
          <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">
            {formatCurrency(selected.spend)} de {formatCurrency(totalSpend)}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--primary)]">Insight</p>
        <p className="text-xs leading-[1.6] text-[var(--muted-foreground)]">{insight}</p>
      </div>
    </div>
  );
}

function MetaCriativosRankingChart({
  sorted,
  selectedId,
}: {
  sorted: MetaCriativoSortedItem[];
  selectedId: string;
}) {
  const ctrRanking = React.useMemo(
    () =>
      [...sorted]
        .sort((a, b) => b.ctr - a.ctr)
        .slice(0, 8)
        .map((item) => ({
          name: item.ad.name.length > 20 ? item.ad.name.slice(0, 18) + "…" : item.ad.name,
          fullName: item.ad.name,
          ctr: item.ctr,
          spend: item.spend,
          isSelected: item.ad.id === selectedId,
        })),
    [sorted, selectedId]
  );

  if (ctrRanking.length === 0) return null;

  const RANKING_COLORS = [
    "#0ea5e9", // sky
    "#22c55e", // green
    "#eab308", // amber
    "#a855f7", // violet
    "#ec4899", // pink
    "#14b8a6", // teal
    "#f97316", // orange
  ];

  const maxCtr = Math.max(...ctrRanking.map((d) => d.ctr), 0.01);
  const domainMax = Math.ceil(maxCtr * 1.15);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)]/70 p-5">
      <div className="flex min-h-[28px] items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-1 w-1 shrink-0 rounded-full bg-[var(--primary)]" />
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
            Ranking de eficiência
          </p>
        </div>
        <span className="text-[10px] text-[var(--muted-foreground)]">CTR por criativo</span>
      </div>
      <div className="mt-4 h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={ctrRanking}
            layout="vertical"
            margin={{ top: 4, right: 44, bottom: 4, left: 4 }}
            barCategoryGap="20%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.3} horizontal={false} />
            <XAxis
              type="number"
              stroke="var(--muted-foreground)"
              fontSize={10}
              tickFormatter={(v) => `${v}%`}
              domain={[0, domainMax]}
              tick={{ fill: "var(--muted-foreground)" }}
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke="var(--muted-foreground)"
              fontSize={10}
              width={90}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--foreground)" }}
            />
            <Tooltip
              formatter={(value: number) => [value.toFixed(2) + "%", "CTR"]}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ""}
              {...metaCriativosTooltipStyle}
            />
            <Bar dataKey="ctr" radius={[0, 5, 5, 0]} maxBarSize={18}>
              <LabelList
                dataKey="ctr"
                position="right"
                formatter={(v: number) => `${v.toFixed(2)}%`}
                fill="var(--muted-foreground)"
                fontSize={10}
              />
              {ctrRanking.map((entry, index) => (
                <Cell
                  key={entry.fullName}
                  fill={entry.isSelected ? "var(--primary)" : RANKING_COLORS[index % RANKING_COLORS.length]}
                  opacity={entry.isSelected ? 1 : 0.65}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function MetaCriativosSpendDistribution({
  sorted,
  selectedId,
  formatCurrency,
}: {
  sorted: MetaCriativoSortedItem[];
  selectedId: string;
  formatCurrency: (v: number) => string;
}) {
  const pieData = React.useMemo(
    () =>
      sorted.map((item) => ({
        name: item.ad.name.length > 18 ? item.ad.name.slice(0, 16) + "…" : item.ad.name,
        fullName: item.ad.name,
        value: item.spend,
        isSelected: item.ad.id === selectedId,
      })),
    [sorted, selectedId]
  );

  if (pieData.length === 0 || pieData.every((d) => d.value === 0)) return null;

  const COLORS = [
    "color-mix(in srgb, var(--muted-foreground) 80%, transparent)",
    "color-mix(in srgb, var(--muted-foreground) 65%, transparent)",
    "color-mix(in srgb, var(--muted-foreground) 50%, transparent)",
    "color-mix(in srgb, var(--muted-foreground) 35%, transparent)",
    "color-mix(in srgb, var(--muted-foreground) 25%, transparent)",
    "color-mix(in srgb, var(--muted-foreground) 15%, transparent)",
    "color-mix(in srgb, var(--muted-foreground) 10%, transparent)",
    "var(--border)",
  ];

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-[var(--border)] bg-[var(--background)]/70 p-5">
      <div className="flex min-h-[28px] shrink-0 items-center gap-2">
        <div className="h-1 w-1 shrink-0 rounded-full bg-[var(--primary)]" />
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
          Distribuição do investimento
        </p>
      </div>
      <div className="mt-5 min-h-[200px] flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={84}
              paddingAngle={2}
              label={({ percent }) => (percent >= 0.07 ? `${(percent * 100).toFixed(0)}%` : "")}
              labelLine={false}
            >
              {pieData.map((entry, index) => (
                <Cell
                  key={entry.name}
                  fill={entry.isSelected ? "var(--primary)" : COLORS[index % COLORS.length]}
                  stroke={entry.isSelected ? "var(--primary)" : "transparent"}
                  strokeWidth={entry.isSelected ? 2 : 0}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ""}
              {...metaCriativosTooltipStyle}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function CriativoPreview({
  creative,
  creativeId,
  adId,
  alt,
  mode,
  priority = false,
  adFormat = "MOBILE_FEED_STANDARD",
  useFallback = false,
}: {
  creative: MetaAdCreative | undefined;
  creativeId?: string;
  adId?: string;
  alt: string;
  mode: "featured" | "card";
  priority?: boolean;
  adFormat?: "MOBILE_FEED_STANDARD";
  useFallback?: boolean;
}) {
  const [imgError, setImgError] = React.useState(false);
  const [previewIframeBody, setPreviewIframeBody] = React.useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [previewFailed, setPreviewFailed] = React.useState(false);
  const [metaPreview, setMetaPreview] = React.useState<{ src: string; w: number; h: number } | null>(null);

  const previewId = creativeId ?? adId;
  const shouldFetchMetaPreview = mode === "featured" && previewId && !useFallback;

  React.useEffect(() => {
    if (!shouldFetchMetaPreview) {
      setPreviewIframeBody(null);
      setMetaPreview(null);
      setPreviewFailed(false);
      return;
    }
    setPreviewLoading(true);
    setPreviewFailed(false);
    const params = new URLSearchParams({ adFormat });
    if (creativeId) params.set("creativeId", creativeId);
    else if (adId) params.set("adId", adId);
    fetch(`/api/meta/preview?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Preview indisponível");
        return res.json();
      })
      .then((data: { body?: string }) => {
        if (data?.body) setPreviewIframeBody(data.body);
        else setPreviewFailed(true);
      })
      .catch(() => setPreviewFailed(true))
      .finally(() => setPreviewLoading(false));
  }, [shouldFetchMetaPreview, adFormat, creativeId, adId]);

  React.useEffect(() => {
    if (mode !== "featured" || useFallback || !previewIframeBody || previewFailed) return;
    try {
      const doc = new DOMParser().parseFromString(previewIframeBody, "text/html");
      const iframe = doc.querySelector("iframe");
      const src = iframe?.getAttribute("src") ?? "";
      const w = parseInt(iframe?.getAttribute("width") ?? "0", 10) || 274;
      const h = parseInt(iframe?.getAttribute("height") ?? "0", 10) || 213;
      if (src) setMetaPreview({ src, w, h });
      else setMetaPreview(null);
    } catch {
      setMetaPreview(null);
    }
  }, [mode, useFallback, previewIframeBody, previewFailed]);

  const isVideo = !!(creative?.video_source_url || creative?.video_embed_html || creative?.video_id);
  const rawImgUrl =
    creative?.image_url_full ||
    creative?.image_url ||
    creative?.video_picture_url ||
    creative?.thumbnail_url;
  const imgUrl = upgradeFbCdnImageUrl(rawImgUrl) || rawImgUrl;
  const rawPosterUrl = creative?.video_picture_url || creative?.thumbnail_url;
  const posterUrl = upgradeFbCdnImageUrl(rawPosterUrl) || rawPosterUrl;
  const containerClass =
    mode === "featured"
      ? "flex items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--muted)]/20"
      : "flex h-56 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--muted)]/10 p-3";

  const Placeholder = ({ message = "Preview indisponível" }: { message?: string }) => (
    <div className={`${containerClass} flex-col gap-2 text-center text-[var(--muted-foreground)]`}>
      <BarChart3 className="h-8 w-8 opacity-50" />
      <span className="text-xs">{message}</span>
    </div>
  );

  if (mode === "featured" && !useFallback && metaPreview && !previewFailed) {
    const scale = 360 / metaPreview.w;
    const iframeH = Math.round(metaPreview.h / scale) + 210;
    const displayH = Math.round(iframeH * scale);
    return (
      <div
        className="mx-auto overflow-hidden rounded-2xl border-[8px] border-[#2c2c2e] bg-[#2c2c2e] shadow-xl"
        style={{ width: 360, height: displayH }}
      >
        <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: metaPreview.w, height: iframeH }}>
          <iframe
            title="Prévia do anúncio (Meta)"
            src={metaPreview.src}
            scrolling="no"
            style={{ border: "none", display: "block", width: metaPreview.w, height: iframeH }}
          />
        </div>
      </div>
    );
  }

  if (mode === "featured" && !useFallback && previewLoading) {
    return (
      <div className={`${containerClass} flex-col gap-2`}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
        <span className="text-xs text-[var(--muted-foreground)]">Carregando prévia do Meta…</span>
      </div>
    );
  }

  if (mode === "featured" && isVideo && creative?.video_source_url) {
    return (
      <div className="mx-auto w-full max-w-[360px] overflow-hidden rounded-2xl border-[8px] border-[#2c2c2e] bg-[#2c2c2e] shadow-xl">
        <video
          src={creative.video_source_url}
          controls
          playsInline
          preload="metadata"
          poster={posterUrl}
          className="h-auto w-full object-contain"
          style={{ maxHeight: "70vh" }}
        >
          Seu navegador não suporta vídeo.
        </video>
      </div>
    );
  }

  if (mode === "featured" && isVideo && creative?.video_embed_html) {
    return (
      <div className={`${containerClass} overflow-hidden bg-black`}>
        <div className="aspect-video w-full max-w-2xl" dangerouslySetInnerHTML={{ __html: creative.video_embed_html }} />
      </div>
    );
  }

  if ((imgUrl || posterUrl) && !imgError) {
    const mediaUrl = imgUrl || posterUrl;
    if (mediaUrl) {
      return mode === "featured" ? (
        <div className="relative mx-auto w-full max-w-[360px] overflow-hidden rounded-2xl border-[8px] border-[#2c2c2e] bg-[#2c2c2e] shadow-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mediaUrl}
            alt={alt}
            loading={priority ? "eager" : "lazy"}
            referrerPolicy="no-referrer"
            className="h-auto w-full object-contain"
            style={{ maxHeight: "70vh" }}
            onError={() => setImgError(true)}
          />
          {isVideo && (
            <div className="pointer-events-none absolute bottom-2 left-2 right-2 flex justify-center">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-black/70 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-white/90">
                <Play className="h-3 w-3 fill-current" />
                {creative?.video_source_url || creative?.video_embed_html ? "Vídeo com player" : "Thumbnail"}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className={`relative overflow-hidden ${containerClass}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mediaUrl}
            alt={alt}
            loading={priority ? "eager" : "lazy"}
            referrerPolicy="no-referrer"
            className="max-h-[72vh] h-full w-full rounded-xl object-contain"
            onError={() => setImgError(true)}
          />
          {isVideo && (
            <div className="pointer-events-none absolute bottom-2 left-2 right-2 flex justify-center">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-black/70 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-white/90">
                <Play className="h-3 w-3 fill-current" />
                {creative?.video_source_url || creative?.video_embed_html ? "Vídeo com player" : "Thumbnail"}
              </span>
            </div>
          )}
        </div>
      );
    }
  }

  if (isVideo && creative?.video_source_url) {
    return (
      <div className={`relative overflow-hidden ${containerClass}`}>
        <video src={creative.video_source_url} preload="metadata" muted playsInline className="h-full w-full object-contain" />
        <div className="pointer-events-none absolute bottom-2 left-2 right-2 flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-black/70 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-white/90">
            <Play className="h-3 w-3 fill-current" />
            Vídeo
          </span>
        </div>
      </div>
    );
  }

  if (isVideo) return <Placeholder message="Vídeo sem thumbnail disponível" />;
  return <Placeholder />;
}

function MetaCriativosGrid({
  ads,
  formatCurrency,
  periodLabel,
}: {
  ads: MetaAdItem[];
  formatCurrency: (v: number) => string;
  periodLabel: string;
}) {
  const sorted = React.useMemo(() => {
    return ads
      .map((ad) => {
        const creative = ad.adcreatives?.data?.[0];
        const insight = ad.insights?.data?.[0];
        const spend = insight?.spend ? parseFloat(insight.spend) : 0;
        const impressions = insight?.impressions ? parseInt(insight.impressions, 10) : 0;
        const clicks = insight?.clicks ? parseInt(insight.clicks, 10) : 0;
        const ctr = insight?.ctr ? parseFloat(insight.ctr) : impressions > 0 ? (clicks / impressions) * 100 : 0;
        const cpcFromApi = insight?.cpc ? parseFloat(insight.cpc) : 0;
        const cpc = clicks > 0 ? spend / clicks : cpcFromApi;
        const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
        const mediaType = creative?.video_source_url || creative?.video_embed_html || creative?.video_id ? "video" : "image";
        const actions = insight?.actions ?? [];
        const leads =
          parseInt(
            (actions.find((a) => a.action_type === "lead") ??
              actions.find((a) => a.action_type === "onsite_conversion.lead_grouped"))?.value ?? "0",
            10
          ) || 0;
        return {
          ad,
          creative,
          spend,
          impressions,
          clicks,
          ctr,
          cpc,
          cpm,
          leads,
          mediaType,
          primaryText: creative?.body || creative?.title || "",
        };
      })
      .sort((a, b) => {
        if (b.spend !== a.spend) return b.spend - a.spend;
        if (b.clicks !== a.clicks) return b.clicks - a.clicks;
        return b.impressions - a.impressions;
      });
  }, [ads]);

  const [modalAdId, setModalAdId] = React.useState<string | null>(null);
  const [modalFallback, setModalFallback] = React.useState(false);

  React.useEffect(() => {
    setModalFallback(false);
  }, [modalAdId]);

  React.useEffect(() => {
    if (!modalAdId) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setModalAdId(null); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [modalAdId]);

  const topCtr = React.useMemo(
    () =>
      [...sorted].sort((a, b) => {
        if (b.ctr !== a.ctr) return b.ctr - a.ctr;
        return b.clicks - a.clicks;
      })[0],
    [sorted]
  );
  const totalSpend = sorted.reduce((acc, item) => acc + item.spend, 0);
  const totalImpressions = sorted.reduce((acc, item) => acc + item.impressions, 0);
  const totalClicks = sorted.reduce((acc, item) => acc + item.clicks, 0);
  const averageCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const averageCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;

  const previewFormat = "MOBILE_FEED_STANDARD" as const;

  if (!sorted.length) {
    return <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">Nenhum criativo encontrado.</p>;
  }

  // Score computation
  const maxCtr = Math.max(...sorted.map((d) => d.ctr), 0.001);
  const minCtr = Math.min(...sorted.map((d) => d.ctr));
  const ctrRange = maxCtr - minCtr || 1;
  const cpcValues = sorted.filter((d) => d.cpc > 0).map((d) => d.cpc);
  const maxCpc = cpcValues.length ? Math.max(...cpcValues) : 1;
  const minCpc = cpcValues.length ? Math.min(...cpcValues) : 0;
  const cpcRange = maxCpc - minCpc || 1;
  const isOne = sorted.length === 1;
  const scoredItems = sorted.map((item) => {
    const ctrScore = isOne ? 1 : (item.ctr - minCtr) / ctrRange;
    const cpcScore = item.cpc > 0 && !isOne ? (maxCpc - item.cpc) / cpcRange : 0.5;
    const score = Math.min(2, parseFloat((ctrScore * 1.2 + cpcScore * 0.8).toFixed(2)));
    const spShare = totalSpend > 0 ? (item.spend / totalSpend) * 100 : 0;
    const status: "ESCALAR" | "OTIMIZAR" | "PAUSAR" =
      score >= 1.4 ? "ESCALAR" : score >= 0.8 ? "OTIMIZAR" : "PAUSAR";
    const alerts: string[] = [];
    if (item.ctr < averageCtr * 0.75) alerts.push("CTR baixo");
    if (averageCpc > 0 && item.cpc > averageCpc * 1.4) alerts.push("CPC alto");
    if (spShare > 45) alerts.push("Verba concentrada");
    else if (spShare < 5) alerts.push("Pouca verba");
    return { ...item, score, status, alerts: alerts.slice(0, 2), spShare };
  }).sort((a, b) => b.score - a.score);

  const countEscalar = scoredItems.filter((i) => i.status === "ESCALAR").length;
  const countOtimizar = scoredItems.filter((i) => i.status === "OTIMIZAR").length;
  const countPausar = scoredItems.filter((i) => i.status === "PAUSAR").length;
  const pausarSpend = scoredItems.filter((i) => i.status === "PAUSAR").reduce((acc, i) => acc + i.spend, 0);
  const pctPausar = totalSpend > 0 ? Math.round((pausarSpend / totalSpend) * 100) : 0;

  const decisionInsight =
    pctPausar > 30 ? `${pctPausar}% da verba está em criativos de baixa performance.`
    : countEscalar === 0 ? `Nenhum criativo com performance forte. Considere novos testes.`
    : countEscalar >= sorted.length * 0.5 ? `Conjunto saudável — mais da metade dos criativos está escalável.`
    : `Foque o orçamento nos ${countEscalar} criativo${countEscalar > 1 ? "s" : ""} com maior score.`;

  const escalarNames = scoredItems.filter((i) => i.status === "ESCALAR").map((i) => i.ad.name);
  const pausarNames = scoredItems.filter((i) => i.status === "PAUSAR").map((i) => i.ad.name);
  const modalItem = modalAdId ? scoredItems.find((i) => i.ad.id === modalAdId) ?? null : null;

  const statusConfig = {
    ESCALAR: { label: "Escalar", color: "text-green-500", bg: "bg-green-500/10", border: "border-green-500/30", bar: "bg-green-500" },
    OTIMIZAR: { label: "Otimizar", color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/30", bar: "bg-amber-500" },
    PAUSAR: { label: "Pausar", color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/30", bar: "bg-red-500" },
  };

  return (
    <div className="space-y-5">

      {/* 1. Barra de resumo */}
      <div className="mx-auto max-w-[1280px] px-6">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 py-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[var(--muted-foreground)]">Investimento</span>
            <span className="text-xs font-bold text-[var(--foreground)]">{formatCurrency(totalSpend)}</span>
          </div>
          <div className="h-3.5 w-px bg-[var(--border)]" />
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[var(--muted-foreground)]">CTR médio</span>
            <span className="text-xs font-bold text-[var(--foreground)]">{averageCtr.toFixed(2)}%</span>
          </div>
          <div className="h-3.5 w-px bg-[var(--border)]" />
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[var(--muted-foreground)]">CPC médio</span>
            <span className="text-xs font-bold text-[var(--foreground)]">{averageCpc > 0 ? formatCurrency(averageCpc) : "—"}</span>
          </div>
          <div className="h-3.5 w-px bg-[var(--border)]" />
          <div className="ml-auto flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-[var(--primary)]" />
            <span className="text-xs text-[var(--muted-foreground)]">Melhor:</span>
            <span className="text-xs font-bold text-[var(--primary)]">{topCtr?.ctr.toFixed(2)}%</span>
            <span className="hidden text-xs text-[var(--muted-foreground)] xl:inline">· {topCtr?.ad.name}</span>
          </div>
        </div>
      </div>

      {/* 2. Decision Bar */}
      <div className="mx-auto max-w-[1280px] px-6">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-6 py-5">
          <div className="flex flex-wrap items-center justify-center gap-5">
            {([
              { count: countEscalar, label: "Escalar", dot: "bg-green-500", color: "text-green-500", bg: "bg-green-500/8 border-green-500/20" },
              { count: countOtimizar, label: "Otimizar", dot: "bg-amber-500", color: "text-amber-500", bg: "bg-amber-500/8 border-amber-500/20" },
              { count: countPausar, label: "Pausar", dot: "bg-red-500", color: "text-red-500", bg: "bg-red-500/8 border-red-500/20" },
            ] as const).map((s) => (
              <div key={s.label} className={`flex items-center gap-3 rounded-xl border px-6 py-3 ${s.bg}`}>
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${s.dot}`} />
                <span className={`text-3xl font-black tabular-nums leading-none ${s.color}`}>{s.count}</span>
                <span className={`text-sm font-semibold ${s.color}`}>{s.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-[var(--muted-foreground)]">{decisionInsight}</p>
        </div>
      </div>

      {/* 3. Tabela de criativos */}
      <div className="mx-auto max-w-[1280px] px-6">
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--muted)]/10">
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10px] text-[var(--muted-foreground)]">Nome</th>
                <th className="px-4 py-3 text-right font-semibold uppercase tracking-wider text-[10px] text-[var(--muted-foreground)]">Investimento</th>
                <th className="px-4 py-3 text-right font-semibold uppercase tracking-wider text-[10px] text-[var(--muted-foreground)]">Leads</th>
                <th className="px-4 py-3 text-right font-semibold uppercase tracking-wider text-[10px] text-[var(--muted-foreground)]">CTR</th>
                <th className="px-4 py-3 text-right font-semibold uppercase tracking-wider text-[10px] text-[var(--muted-foreground)]">CPC</th>
                <th className="px-4 py-3 text-right font-semibold uppercase tracking-wider text-[10px] text-[var(--muted-foreground)]">Score</th>
                <th className="px-4 py-3 text-center font-semibold uppercase tracking-wider text-[10px] text-[var(--muted-foreground)]">Status</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[10px] text-[var(--muted-foreground)]">Alertas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]/40">
              {scoredItems.map((item) => {
                const cfg = statusConfig[item.status];
                const rawUrl = item.creative?.image_url_full || item.creative?.image_url || item.creative?.video_picture_url || item.creative?.thumbnail_url;
                const thumbUrl = rawUrl ? upgradeFbCdnImageUrl(rawUrl) || rawUrl : null;
                return (
                  <tr
                    key={item.ad.id}
                    className="cursor-pointer transition-colors hover:bg-[var(--muted)]/15"
                    onClick={() => setModalAdId(item.ad.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-[var(--muted)]/30">
                          {thumbUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={thumbUrl} alt={item.ad.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <BarChart3 className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                            </div>
                          )}
                        </div>
                        <span className="max-w-[180px] truncate font-medium text-[var(--foreground)]">{item.ad.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-[var(--foreground)]">{formatCurrency(item.spend)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-[var(--foreground)]">
                      {item.leads > 0 ? item.leads.toLocaleString("pt-BR") : <span className="text-[var(--muted-foreground)]/40">—</span>}
                    </td>
                    <td className={`px-4 py-3 text-right tabular-nums font-semibold ${item.ctr >= averageCtr ? "text-green-500" : "text-red-400"}`}>{item.ctr.toFixed(2)}%</td>
                    <td className="px-4 py-3 text-right tabular-nums text-[var(--foreground)]">{item.clicks > 0 ? formatCurrency(item.cpc) : "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`tabular-nums font-bold ${cfg.color}`}>{item.score.toFixed(1)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {item.alerts.length === 0 ? (
                          <span className="text-[var(--muted-foreground)]/40">—</span>
                        ) : item.alerts.map((a) => (
                          <span key={a} className="inline-flex items-center rounded border border-[var(--border)] bg-[var(--muted)]/30 px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted-foreground)]">
                            {a}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Distribuição de verba */}
      <div className="mx-auto max-w-[1280px] px-6">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 py-4">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Distribuição de verba</p>
          <div className="space-y-2.5">
            {[...scoredItems].sort((a, b) => b.spend - a.spend).map((item) => {
              const cfg = statusConfig[item.status];
              return (
                <div
                  key={item.ad.id}
                  className="flex cursor-pointer items-center gap-3 group"
                  onClick={() => setModalAdId(item.ad.id)}
                >
                  <span className="w-32 shrink-0 truncate text-[10px] text-[var(--muted-foreground)] group-hover:text-[var(--foreground)] transition-colors" title={item.ad.name}>
                    {item.ad.name}
                  </span>
                  <div className="relative flex-1 h-5 overflow-hidden rounded bg-[var(--muted)]/20">
                    <div
                      className={`h-full rounded transition-all ${cfg.bar} opacity-80 group-hover:opacity-100`}
                      style={{ width: `${item.spShare}%` }}
                    />
                  </div>
                  <span className="w-20 shrink-0 text-right text-[10px] tabular-nums text-[var(--foreground)]">{formatCurrency(item.spend)}</span>
                  <span className="w-8 shrink-0 text-right text-[10px] tabular-nums text-[var(--muted-foreground)]">{item.spShare.toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. Ações recomendadas */}
      {(escalarNames.length > 0 || pausarNames.length > 0) && (
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 py-4">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Ações recomendadas</p>
            <div className="space-y-1.5">
              {escalarNames.length > 0 && (
                <p className="text-xs">
                  <span className="font-semibold text-green-500">Escalar: </span>
                  <span className="text-[var(--foreground)]">{escalarNames.join(", ")}</span>
                </p>
              )}
              {pausarNames.length > 0 && (
                <p className="text-xs">
                  <span className="font-semibold text-red-500">Pausar: </span>
                  <span className="text-[var(--foreground)]">{pausarNames.join(", ")}</span>
                </p>
              )}
              {pausarNames.length > 0 && escalarNames.length > 0 && (
                <p className="text-xs">
                  <span className="font-semibold text-[var(--muted-foreground)]">Ajuste: </span>
                  <span className="text-[var(--muted-foreground)]">Redistribuir verba dos criativos pausados para os top performers</span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de criativo */}
      {modalItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setModalAdId(null); }}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
        >
          <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-5 py-4">
              <div>
                <p className="font-bold text-[var(--foreground)]">{modalItem.ad.name}</p>
                <p className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">
                  {modalItem.mediaType === "video" ? "Vídeo" : "Imagem"} · Score {modalItem.score.toFixed(1)}{modalItem.leads > 0 ? ` · ${modalItem.leads} leads` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusConfig[modalItem.status].color} ${statusConfig[modalItem.status].bg} ${statusConfig[modalItem.status].border}`}>
                  {statusConfig[modalItem.status].label}
                </span>
                <button
                  type="button"
                  onClick={() => setModalAdId(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
                  aria-label="Fechar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 gap-6 overflow-y-auto p-5">
              <div className="shrink-0">
                {modalFallback && (
                  <p className="mb-2 text-center text-[10px] text-[var(--muted-foreground)]">
                    Mídia alternativa.{" "}
                    <button type="button" onClick={() => setModalFallback(false)} className="font-medium text-[var(--primary)] underline underline-offset-2">
                      Prévia Meta
                    </button>
                  </p>
                )}
                <CriativoPreview
                  creative={modalItem.creative}
                  creativeId={modalItem.creative?.id}
                  adId={modalItem.ad.id}
                  alt={modalItem.ad.name}
                  mode="featured"
                  priority
                  adFormat={previewFormat}
                  useFallback={modalFallback}
                />
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-4">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Investimento", value: formatCurrency(modalItem.spend), hi: false },
                    { label: "CTR", value: `${modalItem.ctr.toFixed(2)}%`, hi: false },
                    { label: "CPC", value: modalItem.clicks > 0 ? formatCurrency(modalItem.cpc) : "—", hi: false },
                    { label: "Impressões", value: modalItem.impressions.toLocaleString("pt-BR"), hi: false },
                    { label: "CPM", value: modalItem.impressions > 0 ? formatCurrency((modalItem.spend / modalItem.impressions) * 1000) : "—", hi: false },
                    { label: "Cliques", value: modalItem.clicks.toLocaleString("pt-BR"), hi: false },
                  ].map((m) => (
                    <div key={m.label} className="rounded-xl border border-[var(--border)] bg-[var(--background)]/60 p-3 text-center">
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">{m.label}</p>
                      <p className={`mt-1 text-sm font-bold tabular-nums ${m.hi ? "text-[var(--primary)]" : "text-[var(--foreground)]"}`}>{m.value}</p>
                    </div>
                  ))}
                </div>
                {modalItem.primaryText && (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/60 p-4">
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Texto do anúncio</p>
                    <p className="text-sm leading-relaxed text-[var(--foreground)]">{modalItem.primaryText}</p>
                  </div>
                )}
                {modalItem.alerts.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {modalItem.alerts.map((a) => (
                      <span key={a} className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 px-3 py-1.5 text-xs font-medium text-[var(--muted-foreground)]">
                        {a}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

/* ─── Pauta da Semana (unchanged logic) ─── */

function PautaDaSemana({ clienteId }: { clienteId: string }) {
  const [titulo, setTitulo] = React.useState("");
  const queryClient = useQueryClient();
  const { data: pautas } = useQuery({
    queryKey: ["pautas", clienteId],
    queryFn: () =>
      fetch(`/api/clientes/${clienteId}/pautas`).then((r) => (r.ok ? r.json() : [])),
  });
  const addMutation = useMutation({
    mutationFn: (body: { titulo: string }) =>
      fetch(`/api/clientes/${clienteId}/pautas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pautas", clienteId] });
      setTitulo("");
    },
  });

  return (
    <Card className="overflow-hidden rounded-2xl border-[var(--border)]">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-8 w-1 rounded-full bg-[var(--primary)]" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
              Check-in estratégico
            </p>
            <CardTitle className="mt-0">Pauta da Semana</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Adicionar novo assunto para o check-in..."
            className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm transition-colors focus:border-[var(--primary)]/40 focus:outline-none"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && titulo.trim()) addMutation.mutate({ titulo: titulo.trim() });
            }}
          />
          <button
            onClick={() => titulo.trim() && addMutation.mutate({ titulo: titulo.trim() })}
            disabled={!titulo.trim() || addMutation.isPending}
            className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-[var(--primary-foreground)] transition hover:opacity-90 disabled:opacity-50"
          >
            {addMutation.isPending ? "…" : "+ Novo item"}
          </button>
        </div>
        {Array.isArray(pautas) && pautas.length > 0 && (
          <ul className="space-y-2">
            {pautas.map((p: { id: string; titulo: string; status: string }) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--muted)]/20 px-4 py-3 text-sm transition-colors hover:bg-[var(--muted)]/40"
              >
                <span className="text-[var(--foreground)]">{p.titulo}</span>
                <span className="rounded-md bg-[var(--muted)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                  {p.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
