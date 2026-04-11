"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  ComposedChart,
  Cell,
} from "recharts";
import { Users, Target, TrendingUp, BarChart3, RefreshCw, AlertTriangle, Megaphone, ShieldAlert, Info } from "lucide-react";
import { ESTADO_LABELS } from "@/lib/utils/dddToEstado";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";

const BRAZIL_TOPO_URL = "https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson";

const TIPO_COLORS: Record<string, string> = {
  "Imobiliárias": "#ef4444",
  "Corretores": "#f97316",
  "Construtoras": "#eab308",
  "Incorporadoras": "#22c55e",
  "Não informado": "#6b7280",
};

function getColor(tipo: string, index: number): string {
  const palette = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280"];
  return TIPO_COLORS[tipo] ?? palette[index % palette.length];
}

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

const FAIXA_MAP: Record<string, string> = {
  "ainda_não_faturo_nada": "Ainda não faturo",
  "ainda não faturo nada": "Ainda não faturo",
  "até_r$50.000/mês": "Até R$ 50k/mês",
  "de_r$50.000/mês_a_r$75.000/mês": "R$ 50k–75k/mês",
  "de_r$75.000/mês_a_r$100.000/mês": "R$ 75k–100k/mês",
  "de_r$100.000/mês_a_r$300.000/mês": "R$ 100k–300k/mês",
  "de_r$300.000/mês_a_r$500.000/mês": "R$ 300k–500k/mês",
  "de_r$500.000/mês_a_r$1.000.000/mês": "R$ 500k–1M/mês",
  "acima_de_r$1.000.000/mês": "Acima de R$ 1M/mês",
};

function formatFaixa(raw: string | null | undefined): string {
  if (!raw) return "—";
  const key = raw.toLowerCase().trim();
  if (FAIXA_MAP[key]) return FAIXA_MAP[key];
  return raw.replace(/_/g, " ").replace(/\br\$/gi, "R$").replace(/\/mes/g, "/mês");
}

function KpiCard({
  title,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  title: string;
  value: string;
  sub: string;
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
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">{title}</p>
          <p className={`mt-1 text-2xl font-extrabold tabular-nums leading-none ${accent ? "text-[var(--primary)]" : "text-[var(--foreground)]"}`}>
            {value}
          </p>
          <p className="mt-1.5 text-[11px] text-[var(--muted-foreground)]">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function fmt(n: number) {
  return n.toLocaleString("pt-BR");
}

function fmtCurrency(n: number) {
  return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface LeadScoringData {
  dataInicio: string;
  dataFim: string;
  kpis: {
    totalLeads: number;
    campanhasDistintas: number;
    statusCrmCount: number;
    totalInvestimento: number;
    cplMedio: number | null;
  };
  periodoSeries: Array<{
    periodo: string;
    total: number;
    tipos: Record<string, number>;
  }>;
  tiposDistribuicao: Array<{ tipo: string; total: number }>;
  estadosDistribuicao: Array<{ estado: string; total: number }>;
  faturamentoDistribuicao: Array<{ faixa: string; total: number }>;
  platformDistribuicao?: Array<{ platform: string; total: number }>;
  campanhasRanking: Array<{
    campaignId: string;
    campaignName: string | null;
    leads: number;
    participacao: number;
    investimentoAtribuidoEst: number | null;
  }>;
  leads: Array<{
    id: string;
    createdTime: string;
    fullName: string | null;
    nomeEmpresa: string | null;
    tipoEmpresa: string | null;
    faixaFaturamento: string | null;
    estado: string | null;
    campaignName: string | null;
    adName: string | null;
    adsetName: string | null;
    formName: string | null;
    platform: string | null;
    statusCrm: string | null;
    emailLead: string | null;
    telefone: string | null;
  }>;
  leadsTruncated: boolean;
  totalFilteredCount: number;
  agrupamento: string;
  activeFilters?: {
    tipoEmpresa: string | null;
    estado: string | null;
    platform: string | null;
    faixaFaturamento: string | null;
  };
}

const UF_TO_NAME: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia",
  CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás",
  MA: "Maranhão", MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais",
  PA: "Pará", PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí",
  RJ: "Rio de Janeiro", RN: "Rio Grande do Norte", RS: "Rio Grande do Sul",
  RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina", SP: "São Paulo",
  SE: "Sergipe", TO: "Tocantins",
};

function BrazilMap({
  estadosDistribuicao,
  estadoFilter,
  onEstadoClick,
}: {
  estadosDistribuicao: Array<{ estado: string; total: number }>;
  estadoFilter: string | null;
  onEstadoClick: (uf: string) => void;
}) {
  const maxCount = estadosDistribuicao[0]?.total ?? 1;
  const countMap = React.useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of estadosDistribuicao) m[e.estado] = e.total;
    return m;
  }, [estadosDistribuicao]);

  function getIntensity(uf: string) {
    const count = countMap[uf] ?? 0;
    return maxCount > 0 ? count / maxCount : 0;
  }

  function getGeoUF(geo: { properties: Record<string, string> }): string {
    return geo.properties.sigla ?? geo.properties.UF ?? geo.properties.abbrev ?? "";
  }

  function getFillColor(uf: string) {
    const intensity = getIntensity(uf);
    if (intensity === 0) return "var(--border)";
    const alpha = 0.15 + intensity * 0.85;
    return `rgba(249, 115, 22, ${alpha})`;
  }

  return (
    <div className="relative">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ center: [-54, -15], scale: 680 }}
        style={{ width: "100%", height: "240px" }}
      >
        <Geographies geography={BRAZIL_TOPO_URL}>
          {({ geographies }: { geographies: Array<{ rsmKey: string; properties: Record<string, string> }> }) =>
            geographies.map((geo) => {
              const uf = getGeoUF(geo);
              const isActive = estadoFilter === uf;
              const count = countMap[uf] ?? 0;
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  onClick={() => uf && onEstadoClick(uf)}
                  data-tooltip-content={`${UF_TO_NAME[uf] ?? uf}${count > 0 ? ` — ${count} lead${count !== 1 ? "s" : ""}` : ""}`}
                  style={{
                    default: {
                      fill: isActive ? "#f97316" : getFillColor(uf),
                      stroke: "var(--background)",
                      strokeWidth: 0.5,
                      outline: "none",
                      cursor: "pointer",
                      transition: "fill 0.15s",
                    },
                    hover: {
                      fill: isActive ? "#ea6c0a" : count > 0 ? "#f97316cc" : "rgba(249,115,22,0.2)",
                      stroke: "var(--background)",
                      strokeWidth: 0.5,
                      outline: "none",
                      cursor: "pointer",
                    },
                    pressed: { fill: "#ea6c0a", outline: "none" },
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>
      <div className="mt-2 flex items-center justify-center gap-2">
        <div className="h-2 w-24 rounded-full" style={{ background: "linear-gradient(to right, rgba(249,115,22,0.15), rgba(249,115,22,1))" }} />
        <span className="text-[10px] text-[var(--muted-foreground)]">Intensidade de leads por UF</span>
      </div>
    </div>
  );
}

interface Props {
  clienteId: string;
  dateFilter: {
    dataInicio?: string;
    dataFim?: string;
    periodo?: string;
    label: string;
  };
}

export function LeadScoringPanel({ clienteId, dateFilter }: Props) {
  const [agrupamento, setAgrupamento] = React.useState<"mensal" | "semanal">("mensal");
  const [tipoFilter, setTipoFilter] = React.useState<string | null>(null);
  const [estadoFilter, setEstadoFilter] = React.useState<string | null>(null);
  const [platformFilter, setPlatformFilter] = React.useState<string | null>(null);
  const [faixaFilter, setFaixaFilter] = React.useState<string | null>(null);
  const [syncing, setSyncing] = React.useState(false);
  const [syncMsg, setSyncMsg] = React.useState<string | null>(null);
  const [syncErrType, setSyncErrType] = React.useState<"account_access" | "permission" | "generic" | null>(null);

  const hasAnyFilter = !!(tipoFilter || estadoFilter || platformFilter || faixaFilter);

  function clearAllFilters() {
    setTipoFilter(null);
    setEstadoFilter(null);
    setPlatformFilter(null);
    setFaixaFilter(null);
  }

  const params = new URLSearchParams({ agrupamento });
  if (dateFilter.dataInicio) params.set("dataInicio", dateFilter.dataInicio);
  if (dateFilter.dataFim) params.set("dataFim", dateFilter.dataFim);
  if (dateFilter.periodo) params.set("periodo", dateFilter.periodo);
  if (tipoFilter) params.set("tipoEmpresa", tipoFilter);
  if (estadoFilter) params.set("estado", estadoFilter);
  if (platformFilter) params.set("platform", platformFilter);
  if (faixaFilter) params.set("faixaFaturamento", faixaFilter);

  const { data, isLoading, error, refetch } = useQuery<LeadScoringData>({
    queryKey: ["lead-scoring", clienteId, dateFilter.dataInicio, dateFilter.dataFim, agrupamento, tipoFilter, estadoFilter, platformFilter, faixaFilter],
    queryFn: async () => {
      const res = await fetch(`/api/clientes/${clienteId}/lead-scoring?${params.toString()}`);
      if (!res.ok) throw new Error("Falha ao carregar dados de leads");
      return res.json();
    },
  });

  const allTipos = React.useMemo(() => {
    if (!data) return [];
    return data.tiposDistribuicao.map((t) => t.tipo);
  }, [data]);

  const chartData = React.useMemo(() => {
    if (!data) return [];
    return data.periodoSeries.map((s) => {
      const entry: Record<string, string | number> = { periodo: s.periodo };
      for (const tipo of allTipos) {
        entry[tipo] = s.tipos[tipo] ?? 0;
      }
      entry["Total"] = s.total;
      return entry;
    });
  }, [data, allTipos]);

  const totalEstados = data?.estadosDistribuicao.reduce((s, e) => s + e.total, 0) ?? 0;
  const maxEstadoCount = data?.estadosDistribuicao[0]?.total ?? 1;
  const avgLeadsPorMes = data && data.periodoSeries.length > 0
    ? data.kpis.totalLeads / data.periodoSeries.length
    : 0;

  async function handleSync() {
    setSyncing(true);
    setSyncMsg(null);
    setSyncErrType(null);
    try {
      const res = await fetch(`/api/clientes/${clienteId}/sync-leads`, {
        method: "POST",
      });
      const body = await res.json().catch(() => ({}));
      if (body.ok) {
        const forms = body.formsFound ?? 0;
        const created = body.leadsCreated ?? 0;
        const processed = body.leadsProcessed ?? 0;
        if (forms === 0) {
          setSyncMsg("Nenhum formulário de lead encontrado nesta conta.");
        } else {
          setSyncMsg(`${forms} formulário(s) · ${processed} leads processados · ${created} novos`);
        }
        refetch();
      } else {
        const errMsg: string = body.error ?? "Falha na sincronização";
        const isAccountAccess = body.accountNotAccessible === true ||
          errMsg.includes("não está acessível") ||
          errMsg.includes("ACCOUNT_NOT_ACCESSIBLE");
        const isPermErr = !isAccountAccess && (
          errMsg.includes("leads_retrieval") ||
          errMsg.includes("ads_management") ||
          errMsg.includes("Permissão")
        );
        if (isAccountAccess) {
          setSyncErrType("account_access");
          setSyncMsg(errMsg);
        } else if (isPermErr) {
          setSyncErrType("permission");
          setSyncMsg("Token sem permissão leads_retrieval. Configure o acesso no Meta Business Manager.");
        } else {
          setSyncErrType("generic");
          setSyncMsg(`Erro: ${errMsg}`);
        }
      }
    } catch {
      setSyncErrType("generic");
      setSyncMsg("Erro de conexão na sincronização.");
    } finally {
      setSyncing(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[96px] animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--card)]" />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-[2rem] border border-[var(--border)] bg-[var(--card)]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        {syncErrType === "account_access" && syncMsg ? (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-50 p-5 dark:bg-amber-950/20">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="min-w-0">
                <p className="font-semibold text-amber-800 dark:text-amber-300">
                  Conta de anúncios não acessível pelo token
                </p>
                <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">{syncMsg}</p>
                <div className="mt-3 rounded-xl border border-amber-300/50 bg-white/60 p-3 dark:bg-amber-950/30">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                    <Info className="h-3.5 w-3.5" /> Como corrigir
                  </p>
                  <ol className="mt-2 space-y-1 pl-4 text-xs text-amber-700 dark:text-amber-400 list-decimal">
                    <li>Acesse <strong>business.facebook.com</strong> com a conta do administrador</li>
                    <li>Vá em <strong>Configurações do Negócio → Contas de Anúncios</strong></li>
                    <li>Encontre a conta do cliente e clique em <strong>Adicionar Pessoas</strong></li>
                    <li>Adicione o usuário do token com função <strong>Anunciante</strong> ou superior</li>
                    <li>Clique em <strong>Sincronizar</strong> novamente após configurar o acesso</li>
                  </ol>
                </div>
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl border border-amber-400/50 bg-white/80 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-white dark:bg-amber-950/30 dark:text-amber-300 dark:hover:bg-amber-950/50 disabled:opacity-60"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
                  {syncing ? "Verificando…" : "Tentar novamente"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-6 py-16 text-center">
            <AlertTriangle className="h-8 w-8 text-[var(--muted-foreground)]" />
            <p className="text-sm font-medium text-[var(--foreground)]">Dados de leads indisponíveis</p>
            <p className="max-w-sm text-xs text-[var(--muted-foreground)]">
              {syncMsg ?? (error instanceof Error ? error.message : "Erro ao carregar dados de leads")}
            </p>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--primary-foreground)] transition hover:opacity-90 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Sincronizando…" : "Sincronizar Leads"}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Header with sync button ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-1 h-8 w-1 shrink-0 rounded-full bg-[var(--primary)]" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">Meta Lead Gen</p>
            <h2 className="text-xl font-extrabold tracking-tight text-[var(--foreground)]">Lead Scoring</h2>
            <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
              {data.dataInicio} → {data.dataFim} · {dateFilter.label}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {syncMsg && syncErrType !== "account_access" && (
            <span className={`rounded-lg border px-3 py-1.5 text-xs ${syncErrType === "generic" || syncErrType === "permission" ? "border-amber-500/30 bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400" : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)]"}`}>
              {syncMsg}
            </span>
          )}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--foreground)] transition hover:bg-[var(--muted)] disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Sincronizando…" : "Sincronizar"}
          </button>
        </div>
      </div>

      {/* ── Account access error banner ── */}
      {syncErrType === "account_access" && syncMsg && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-50 p-5 dark:bg-amber-950/20">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="min-w-0">
              <p className="font-semibold text-amber-800 dark:text-amber-300">
                Conta de anúncios não acessível pelo token
              </p>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
                {syncMsg}
              </p>
              <div className="mt-3 rounded-xl border border-amber-300/50 bg-white/60 p-3 dark:bg-amber-950/30">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                  <Info className="h-3.5 w-3.5" /> Como corrigir
                </p>
                <ol className="mt-2 space-y-1 pl-4 text-xs text-amber-700 dark:text-amber-400 list-decimal">
                  <li>Acesse <strong>business.facebook.com</strong> com a conta do administrador do Business Manager</li>
                  <li>Vá em <strong>Configurações do Negócio → Contas de Anúncios</strong></li>
                  <li>Encontre a conta do cliente (Miguel Imóveis) e clique em <strong>Adicionar Pessoas</strong></li>
                  <li>Adicione o usuário <strong>Raul Souza</strong> com a função <strong>Anunciante</strong> ou superior</li>
                  <li>Clique em <strong>Sincronizar</strong> novamente após configurar o acesso</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Barra de filtros ativos ── */}
      {hasAnyFilter && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary)]/5 px-4 py-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--primary)]">Filtros ativos</span>
          <div className="flex flex-1 flex-wrap gap-1.5">
            {tipoFilter && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--primary)]/30 bg-[var(--primary)]/10 px-2.5 py-0.5 text-[11px] font-medium text-[var(--primary)]">
                Tipo: {tipoFilter} <button onClick={() => setTipoFilter(null)} className="opacity-60 hover:opacity-100">✕</button>
              </span>
            )}
            {estadoFilter && (
              <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-medium text-blue-400">
                Estado: {estadoFilter} <button onClick={() => setEstadoFilter(null)} className="opacity-60 hover:opacity-100">✕</button>
              </span>
            )}
            {platformFilter && (
              <span className="inline-flex items-center gap-1 rounded-full border border-pink-500/30 bg-pink-500/10 px-2.5 py-0.5 text-[11px] font-medium text-pink-400">
                Plataforma: {platformFilter} <button onClick={() => setPlatformFilter(null)} className="opacity-60 hover:opacity-100">✕</button>
              </span>
            )}
            {faixaFilter && (
              <span className="inline-flex items-center gap-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-0.5 text-[11px] font-medium text-yellow-400">
                Faturamento: {formatFaixa(faixaFilter)} <button onClick={() => setFaixaFilter(null)} className="opacity-60 hover:opacity-100">✕</button>
              </span>
            )}
          </div>
          <button
            onClick={clearAllFilters}
            className="shrink-0 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-[11px] font-semibold text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
          >
            Limpar tudo
          </button>
        </div>
      )}

      {/* ── KPIs ── */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total de Leads"
          value={fmt(data.kpis.totalLeads)}
          sub={hasAnyFilter ? "Com filtros aplicados" : "No período selecionado"}
          icon={Users}
        />
        <KpiCard
          title="Campanhas Distintas"
          value={fmt(data.kpis.campanhasDistintas)}
          sub="Campanhas que geraram leads"
          icon={BarChart3}
        />
        <KpiCard
          title="CPL Médio"
          value={data.kpis.cplMedio != null ? fmtCurrency(data.kpis.cplMedio) : "—"}
          sub="Custo por lead no período"
          icon={Target}
          accent
        />
        <KpiCard
          title="Status no CRM"
          value={fmt(data.kpis.statusCrmCount)}
          sub="Leads com status CRM registrado"
          icon={TrendingUp}
        />
      </section>

      {/* ── Evolução de Leads + Cards por tipo ── */}
      <Card className="overflow-hidden rounded-2xl border-[var(--border)]">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-[var(--foreground)]">Evolução de Leads</h3>
              <p className="text-xs text-[var(--muted-foreground)]">
                Volume por tipo de empresa ({agrupamento === "mensal" ? "mês" : "semana"})
              </p>
            </div>
            <div className="flex items-center gap-2">
              {tipoFilter !== null && (
                <button
                  onClick={() => setTipoFilter(null)}
                  className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/50 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
                >
                  Limpar ✕
                </button>
              )}
              <div className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--muted)]/30 p-1">
                {(["mensal", "semanal"] as const).map((a) => (
                  <button
                    key={a}
                    onClick={() => setAgrupamento(a)}
                    className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition-all ${
                      agrupamento === a
                        ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                        : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {a === "mensal" ? "Mês" : "Semana"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>

        {/* Tipo cards — clicáveis para filtrar */}
        {data.tiposDistribuicao.length > 0 && (() => {
          const totalTipos = data.tiposDistribuicao.reduce((s, t) => s + t.total, 0);
          return (
            <div className="grid grid-cols-2 gap-3 px-6 pb-5 sm:grid-cols-4">
              {data.tiposDistribuicao.map((t, i) => {
                const color = getColor(t.tipo, i);
                const pct = totalTipos > 0 ? Math.round((t.total / totalTipos) * 100) : 0;
                const isActive = tipoFilter === t.tipo;
                return (
                  <button
                    key={t.tipo}
                    onClick={() => setTipoFilter(isActive ? null : t.tipo)}
                    className={`group relative overflow-hidden rounded-xl border p-3.5 text-left transition-all ${
                      isActive
                        ? "shadow-md"
                        : "border-[var(--border)] bg-[var(--muted)]/20 hover:bg-[var(--muted)]/40"
                    }`}
                    style={isActive ? { backgroundColor: `${color}18`, borderColor: `${color}55` } : {}}
                  >
                    <div
                      className="pointer-events-none absolute -right-3 -top-3 h-16 w-16 rounded-full opacity-0 blur-2xl transition-opacity group-hover:opacity-40"
                      style={{ backgroundColor: color }}
                    />
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-[10px] font-bold tabular-nums" style={{ color }}>{pct}%</span>
                    </div>
                    <p className="text-xl font-black tabular-nums leading-none text-[var(--foreground)]">
                      {fmt(t.total)}
                    </p>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                      {t.tipo}
                    </p>
                    <div className="mt-2 h-0.5 overflow-hidden rounded-full bg-[var(--border)]">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })()}

        <CardContent className="pt-0">
          {chartData.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-[var(--muted-foreground)]">
              Nenhum dado de lead para o período selecionado
            </div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />
                  <XAxis dataKey="periodo" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip {...tooltipStyle} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ paddingTop: 12, fontSize: 12 }} />
                  {allTipos.map((tipo, i) => (
                    <Bar
                      key={tipo}
                      dataKey={tipo}
                      stackId="stack"
                      fill={getColor(tipo, i)}
                      radius={i === allTipos.length - 1 ? [4, 4, 0, 0] : undefined}
                      opacity={tipoFilter === null || tipoFilter === tipo ? 1 : 0.25}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>


      {/* ── Seção Leads por Estado (com mapa Brasil) ── */}
      {data.estadosDistribuicao.length > 0 && (
        <section>
          <div className="mb-4 flex items-start gap-3">
            <div className="mt-1 h-6 w-1 shrink-0 rounded-full bg-[var(--primary)]" />
            <div>
              <h3 className="text-base font-bold text-[var(--foreground)]">Leads por Estado</h3>
              <p className="text-xs text-[var(--muted-foreground)]">Derivado do DDD do telefone informado no formulário · clique no estado para filtrar</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            {/* Mapa do Brasil + Ranking */}
            <Card className="overflow-hidden rounded-2xl border-[var(--border)]">
              <CardContent className="p-4">
                <BrazilMap
                  estadosDistribuicao={data.estadosDistribuicao}
                  estadoFilter={estadoFilter}
                  onEstadoClick={(uf) => setEstadoFilter(estadoFilter === uf ? null : uf)}
                />
                <div className="mt-4 space-y-1.5">
                  {data.estadosDistribuicao.slice(0, 10).map((e, i) => {
                    const pct = totalEstados > 0 ? (e.total / totalEstados) * 100 : 0;
                    const barWidth = maxEstadoCount > 0 ? (e.total / maxEstadoCount) * 100 : 0;
                    const isActive = estadoFilter === e.estado;
                    return (
                      <button
                        key={e.estado}
                        onClick={() => setEstadoFilter(isActive ? null : e.estado)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${
                          isActive
                            ? "bg-[var(--primary)]/10 border border-[var(--primary)]/30"
                            : "hover:bg-white/[0.03]"
                        }`}
                      >
                        <span className="w-4 shrink-0 text-center text-[10px] font-bold text-[var(--muted-foreground)]">
                          {i + 1}
                        </span>
                        <span className="w-8 shrink-0 text-xs font-black text-[var(--foreground)]">{e.estado}</span>
                        <div className="flex-1">
                          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
                            <div
                              className="h-full rounded-full bg-[var(--primary)]"
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                          <span className="mt-0.5 block text-[10px] text-[var(--muted-foreground)]">
                            {ESTADO_LABELS[e.estado] ?? e.estado}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="block text-sm font-bold text-[var(--foreground)]">{fmt(e.total)}</span>
                          <span className="text-[10px] text-[var(--muted-foreground)]">{pct.toFixed(1)}%</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Monthly breakdown with avg line */}
            <Card className="overflow-hidden rounded-2xl border-[var(--border)]">
              <CardHeader className="pb-1 pt-4">
                <h4 className="text-sm font-bold text-[var(--foreground)]">
                  Leads por {agrupamento === "mensal" ? "mês" : "semana"}
                </h4>
                {estadoFilter && (
                  <p className="text-xs text-[var(--primary)]">Filtrado: {estadoFilter}</p>
                )}
              </CardHeader>
              <CardContent>
                {chartData.length === 0 ? (
                  <div className="flex h-40 items-center justify-center text-xs text-[var(--muted-foreground)]">Sem dados</div>
                ) : (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData.map((d) => ({ ...d, Média: Math.round(avgLeadsPorMes) }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />
                        <XAxis dataKey="periodo" stroke="var(--muted-foreground)" fontSize={9} tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--muted-foreground)" fontSize={9} tickLine={false} axisLine={false} />
                        <Tooltip {...tooltipStyle} />
                        <Bar dataKey="Total" fill="var(--primary)" radius={[4, 4, 0, 0]} opacity={0.7} />
                        <Line
                          type="monotone"
                          dataKey="Média"
                          stroke="#fbbf24"
                          strokeWidth={2}
                          dot={false}
                          strokeDasharray="4 2"
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* ── Campanhas Ranking ── */}
      {data.campanhasRanking && data.campanhasRanking.length > 0 && (
        <section>
          <div className="mb-4 flex items-start gap-3">
            <div className="mt-1 h-6 w-1 shrink-0 rounded-full bg-[var(--primary)]" />
            <div>
              <h3 className="text-base font-bold text-[var(--foreground)]">Leads por Campanha</h3>
              <p className="text-xs text-[var(--muted-foreground)]">Distribuição de leads por campanha com CPL estimado</p>
            </div>
          </div>
          <Card className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(20,21,26,0.98),rgba(12,12,16,1))]">
            <CardContent className="px-3 pb-4 pt-4 sm:px-5">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px] border-separate [border-spacing:0_6px]">
                  <thead>
                    <tr>
                      <th className="px-4 pb-1 text-left text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">Campanha</th>
                      <th className="px-4 pb-1 text-right text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">Leads</th>
                      <th className="px-4 pb-1 text-right text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">Participação</th>
                      <th className="px-4 pb-1 text-right text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">Invest. Est.*</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.campanhasRanking.map((c) => (
                      <tr key={c.campaignId} className="group">
                        <td className="rounded-l-2xl bg-white/[0.03] px-4 py-3 transition-colors group-hover:bg-white/[0.05]">
                          <div className="flex items-center gap-2">
                            <Megaphone className="h-3.5 w-3.5 shrink-0 text-[var(--primary)]" />
                            <span className="max-w-[240px] truncate text-xs font-medium text-[var(--foreground)]">
                              {c.campaignName ?? c.campaignId}
                            </span>
                          </div>
                        </td>
                        <td className="bg-white/[0.03] px-4 py-3 text-right transition-colors group-hover:bg-white/[0.05]">
                          <span className="text-sm font-bold text-[var(--primary)]">{fmt(c.leads)}</span>
                        </td>
                        <td className="bg-white/[0.03] px-4 py-3 text-right transition-colors group-hover:bg-white/[0.05]">
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[var(--border)]">
                              <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${c.participacao}%` }} />
                            </div>
                            <span className="text-xs text-[var(--muted-foreground)]">{c.participacao.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="rounded-r-2xl bg-white/[0.03] px-4 py-3 text-right transition-colors group-hover:bg-white/[0.05]">
                          <span className="text-xs text-[var(--muted-foreground)]">
                            {c.investimentoAtribuidoEst != null ? fmtCurrency(c.investimentoAtribuidoEst) : "—"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          <p className="mt-2 text-[10px] text-[var(--muted-foreground)]">
            * Investimento estimado: distribuição proporcional do total investido no canal META com base na parcela de leads por campanha. O Meta Ads API não expõe custo por campanha neste endpoint.
          </p>
        </section>
      )}

      {/* ── Distribuição (todos os gráficos são filtros) ── */}
      {(data.tiposDistribuicao.length > 0 || data.faturamentoDistribuicao.length > 0 || (data.platformDistribuicao && data.platformDistribuicao.length > 0)) && (
        <section>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="mt-1 h-6 w-1 shrink-0 rounded-full bg-[var(--primary)]" />
              <div>
                <h3 className="text-base font-bold text-[var(--foreground)]">Distribuição</h3>
                <p className="text-xs text-[var(--muted-foreground)]">Clique em qualquer barra ou card para filtrar os leads</p>
              </div>
            </div>
          </div>

          {/* Platform — botões clicáveis */}
          {data.platformDistribuicao && data.platformDistribuicao.length > 0 && (() => {
            const total = data.platformDistribuicao.reduce((s, p) => s + p.total, 0);
            const PLAT_COLORS: Record<string, string> = {
              "Instagram": "#e1306c",
              "Facebook": "#1877f2",
              "Não informado": "#6b7280",
            };
            return (
              <div className="mb-6">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">Plataforma</p>
                <div className="flex flex-wrap gap-3">
                  {data.platformDistribuicao.map((p) => {
                    const pct = total > 0 ? Math.round((p.total / total) * 100) : 0;
                    const color = PLAT_COLORS[p.platform] ?? "#6b7280";
                    const isActive = platformFilter === p.platform;
                    return (
                      <button
                        key={p.platform}
                        onClick={() => setPlatformFilter(isActive ? null : p.platform)}
                        className={`group relative flex items-center gap-3 overflow-hidden rounded-xl border px-4 py-3 text-left transition-all ${
                          isActive
                            ? "shadow-md"
                            : "border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)]/30"
                        }`}
                        style={isActive ? { backgroundColor: `${color}18`, borderColor: `${color}55` } : {}}
                      >
                        <div
                          className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-0 blur-2xl transition-opacity group-hover:opacity-30"
                          style={{ backgroundColor: color }}
                        />
                        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                        <div>
                          <p className="text-sm font-bold text-[var(--foreground)]">{p.platform}</p>
                          <p className="text-[11px] text-[var(--muted-foreground)]">{p.total.toLocaleString("pt-BR")} leads · {pct}%</p>
                        </div>
                        {isActive && (
                          <span className="ml-2 text-[10px] font-bold" style={{ color }}>✓ Ativo</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Tipos — barras clicáveis */}
            {data.tiposDistribuicao.length > 0 && (
              <Card className="overflow-hidden rounded-2xl border-[var(--border)]">
                <CardHeader className="pb-2 pt-4">
                  <h4 className="text-sm font-bold text-[var(--foreground)]">Por Tipo de Empresa</h4>
                  <p className="text-[11px] text-[var(--muted-foreground)]">Clique na barra para filtrar</p>
                </CardHeader>
                <CardContent>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.tiposDistribuicao}
                        layout="vertical"
                        margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
                        onClick={(e) => {
                          if (e?.activePayload?.[0]) {
                            const tipo = e.activePayload[0].payload?.tipo as string;
                            if (tipo) setTipoFilter(tipoFilter === tipo ? null : tipo);
                          }
                        }}
                        style={{ cursor: "pointer" }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} horizontal={false} />
                        <XAxis type="number" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis
                          type="category"
                          dataKey="tipo"
                          stroke="var(--muted-foreground)"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          width={90}
                        />
                        <Tooltip {...tooltipStyle} />
                        <Bar dataKey="total" name="Leads" radius={[0, 4, 4, 0]}>
                          {data.tiposDistribuicao.map((entry, index) => {
                            const isActive = tipoFilter === null || tipoFilter === entry.tipo;
                            return (
                              <Cell
                                key={`cell-tipo-${index}`}
                                fill={getColor(entry.tipo, index)}
                                opacity={isActive ? 0.9 : 0.25}
                              />
                            );
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Faturamento — barras clicáveis */}
            {data.faturamentoDistribuicao.length > 0 && (
              <Card className="overflow-hidden rounded-2xl border-[var(--border)]">
                <CardHeader className="pb-2 pt-4">
                  <h4 className="text-sm font-bold text-[var(--foreground)]">Por Faixa de Faturamento</h4>
                  <p className="text-[11px] text-[var(--muted-foreground)]">Clique na barra para filtrar</p>
                </CardHeader>
                <CardContent>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.faturamentoDistribuicao.map((f) => ({ ...f, faixaLabel: formatFaixa(f.faixa) }))}
                        layout="vertical"
                        margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
                        onClick={(e) => {
                          if (e?.activePayload?.[0]) {
                            const rawFaixa = e.activePayload[0].payload?.faixa as string;
                            if (rawFaixa) setFaixaFilter(faixaFilter === rawFaixa ? null : rawFaixa);
                          }
                        }}
                        style={{ cursor: "pointer" }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} horizontal={false} />
                        <XAxis type="number" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis
                          type="category"
                          dataKey="faixaLabel"
                          stroke="var(--muted-foreground)"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          width={120}
                        />
                        <Tooltip
                          {...tooltipStyle}
                          formatter={(val: number, _: string, props: { payload?: { faixaLabel?: string } }) => [val, props.payload?.faixaLabel ?? ""]}
                        />
                        <Bar dataKey="total" name="Leads" radius={[0, 4, 4, 0]}>
                          {data.faturamentoDistribuicao.map((entry, index) => {
                            const isActive = faixaFilter === null || faixaFilter === entry.faixa;
                            return (
                              <Cell
                                key={`cell-fat-${index}`}
                                fill="#f97316"
                                opacity={isActive ? 0.85 : 0.2}
                              />
                            );
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      )}

      {/* ── Lista de Leads Individuais ── */}
      <section>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-1 h-6 w-1 shrink-0 rounded-full bg-[var(--primary)]" />
            <div>
              <h3 className="text-base font-bold text-[var(--foreground)]">Leads Individuais</h3>
              <p className="text-xs text-[var(--muted-foreground)]">
                {data.totalFilteredCount.toLocaleString("pt-BR")} lead{data.totalFilteredCount !== 1 ? "s" : ""}
                {hasAnyFilter ? " filtrados" : " no período"}
              </p>
            </div>
          </div>
          {hasAnyFilter && (
            <div className="flex flex-wrap items-center gap-1.5">
              {tipoFilter && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--primary)]/30 bg-[var(--primary)]/10 px-2.5 py-1 text-[11px] font-medium text-[var(--primary)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
                  Tipo: {tipoFilter}
                  <button onClick={() => setTipoFilter(null)} className="opacity-60 hover:opacity-100">✕</button>
                </span>
              )}
              {estadoFilter && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-[11px] font-medium text-blue-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                  Estado: {estadoFilter}
                  <button onClick={() => setEstadoFilter(null)} className="opacity-60 hover:opacity-100">✕</button>
                </span>
              )}
              {platformFilter && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-pink-500/30 bg-pink-500/10 px-2.5 py-1 text-[11px] font-medium text-pink-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-pink-400" />
                  Plataforma: {platformFilter}
                  <button onClick={() => setPlatformFilter(null)} className="opacity-60 hover:opacity-100">✕</button>
                </span>
              )}
              {faixaFilter && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-1 text-[11px] font-medium text-yellow-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
                  Faturamento: {formatFaixa(faixaFilter)}
                  <button onClick={() => setFaixaFilter(null)} className="opacity-60 hover:opacity-100">✕</button>
                </span>
              )}
              {[tipoFilter, estadoFilter, platformFilter, faixaFilter].filter(Boolean).length > 1 && (
                <button
                  onClick={clearAllFilters}
                  className="rounded-full border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-[11px] font-semibold text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
                >
                  Limpar tudo
                </button>
              )}
            </div>
          )}
        </div>

        {data.leads.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-6 py-12 text-center">
            <Users className="h-8 w-8 text-[var(--muted-foreground)]" />
            <p className="text-sm font-medium text-[var(--foreground)]">Nenhum lead encontrado</p>
            <p className="text-xs text-[var(--muted-foreground)]">
              Ajuste os filtros ou sincronize os leads via botão acima.
            </p>
          </div>
        ) : (
          <Card className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(20,21,26,0.98),rgba(12,12,16,1))] shadow-[0_24px_80px_rgba(0,0,0,0.38)]">
            <CardContent className="px-3 pb-4 pt-4 sm:px-5">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-separate [border-spacing:0_6px]">
                  <thead>
                    <tr>
                      <th className="px-4 pb-1 text-left text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
                        Data
                      </th>
                      <th className="px-4 pb-1 text-left text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
                        Nome / Empresa
                      </th>
                      <th className="px-4 pb-1 text-left text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
                        Tipo
                      </th>
                      <th className="px-4 pb-1 text-left text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
                        Faturamento
                      </th>
                      <th className="px-4 pb-1 text-left text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
                        Est.
                      </th>
                      <th className="px-4 pb-1 text-left text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
                        Plat.
                      </th>
                      <th className="px-4 pb-1 text-left text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
                        Campanha
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.leads.map((lead) => {
                      const dt = new Date(lead.createdTime);
                      const dateStr = dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
                      const PLAT_DOT: Record<string, string> = { Instagram: "#e1306c", Facebook: "#1877f2" };
                      const platColor = lead.platform ? (PLAT_DOT[lead.platform] ?? "#6b7280") : "#6b7280";
                      return (
                        <tr key={lead.id} className="group">
                          <td className="rounded-l-2xl bg-white/[0.03] px-4 py-3 transition-colors group-hover:bg-white/[0.05]">
                            <p className="whitespace-nowrap text-xs font-semibold text-[var(--foreground)]">{dateStr}</p>
                          </td>
                          <td className="bg-white/[0.03] px-4 py-3 transition-colors group-hover:bg-white/[0.05]">
                            <p className="max-w-[160px] truncate text-xs font-semibold text-[var(--foreground)]">
                              {lead.fullName ?? lead.nomeEmpresa ?? "—"}
                            </p>
                            {lead.fullName && lead.nomeEmpresa && (
                              <p className="max-w-[160px] truncate text-[11px] text-[var(--muted-foreground)]">{lead.nomeEmpresa}</p>
                            )}
                          </td>
                          <td className="bg-white/[0.03] px-4 py-3 transition-colors group-hover:bg-white/[0.05]">
                            <span className="text-xs text-[var(--muted-foreground)]">{lead.tipoEmpresa ?? "—"}</span>
                          </td>
                          <td className="bg-white/[0.03] px-4 py-3 transition-colors group-hover:bg-white/[0.05]">
                            <span className="max-w-[140px] truncate text-xs text-[var(--muted-foreground)]">
                              {formatFaixa(lead.faixaFaturamento)}
                            </span>
                          </td>
                          <td className="bg-white/[0.03] px-4 py-3 transition-colors group-hover:bg-white/[0.05]">
                            <span className="text-xs font-semibold text-[var(--foreground)]">
                              {lead.estado ?? "—"}
                            </span>
                          </td>
                          <td className="bg-white/[0.03] px-4 py-3 transition-colors group-hover:bg-white/[0.05]">
                            {lead.platform ? (
                              <span className="inline-flex items-center gap-1.5">
                                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: platColor }} />
                                <span className="text-xs text-[var(--muted-foreground)]">{lead.platform}</span>
                              </span>
                            ) : (
                              <span className="text-xs text-[var(--muted-foreground)]">—</span>
                            )}
                          </td>
                          <td className="rounded-r-2xl bg-white/[0.03] px-4 py-3 transition-colors group-hover:bg-white/[0.05]">
                            <p className="max-w-[160px] truncate text-xs text-[var(--muted-foreground)]">
                              {lead.campaignName ?? lead.formName ?? "—"}
                            </p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {data.leadsTruncated && (
          <p className="mt-3 text-center text-[11px] text-[var(--muted-foreground)]">
            Exibindo 500 de {data.totalFilteredCount.toLocaleString("pt-BR")} leads. Use os filtros de tipo, estado, plataforma ou faturamento para refinar.
          </p>
        )}
      </section>
    </div>
  );
}
