"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ClienteCard, type ClienteCardData } from "@/components/clientes/ClienteCard";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight, Plus, Users, TrendingUp, Zap, Search, LayoutList, LayoutGrid, ArrowUpRight } from "lucide-react";

async function fetchClientes(): Promise<ClienteCardData[]> {
  const res = await fetch("/api/clientes");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as { error?: string }).error ?? "Falha ao carregar clientes";
    throw new Error(msg);
  }
  return data as ClienteCardData[];
}

function normalizeForSearch(text: string): string {
  return (text ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function CentralClientesPage() {
  const [viewMode, setViewMode] = React.useState<"lista" | "card">("lista");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [segmentFilter, setSegmentFilter] = React.useState<string>("todos");

  const {
    data: clientes,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["clientes"],
    queryFn: fetchClientes,
  });

  const activeClientes = React.useMemo(() => {
    if (!clientes) return [];
    const onlyActive = clientes.filter((c) => c.ativo ?? true);
    return [...onlyActive].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [clientes]);

  const segmentOptions = React.useMemo(() => {
    const labels = new Set<string>();
    for (const c of activeClientes) {
      const label = (c.segmento ?? "").trim();
      if (label) labels.add(label);
    }
    return Array.from(labels).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [activeClientes]);

  const filteredClientes = React.useMemo(() => {
    if (!activeClientes) return [];
    let base = activeClientes;
    if (segmentFilter !== "todos") {
      base = base.filter((c) => (c.segmento ?? "").trim() === segmentFilter);
    }
    if (!searchQuery.trim()) return base;
    const q = normalizeForSearch(searchQuery);
    return base.filter((c) => normalizeForSearch(c.nome).includes(q));
  }, [activeClientes, searchQuery, segmentFilter]);

  const clientesComDados = activeClientes.filter((c) => c.totalLeads > 0 || c.conversao > 0);
  const totalLeadsAll = clientesComDados.reduce((sum, c) => sum + c.totalLeads, 0);
  const avgConversao =
    clientesComDados.length > 0
      ? Math.round(
          (clientesComDados.reduce((sum, c) => sum + c.conversao, 0) / clientesComDados.length) * 100
        ) / 100
      : 0;

  const summaryItems = [
    {
      label: "Clientes ativos",
      value: activeClientes.length.toString(),
      icon: Users,
      accent: false,
    },
    {
      label: "Leads acumulados",
      value: totalLeadsAll.toLocaleString("pt-BR"),
      icon: Zap,
      accent: false,
    },
    {
      label: "Conversão média",
      value: `${avgConversao}%`,
      icon: TrendingUp,
      accent: true,
    },
  ];

  return (
    <main className="space-y-8">
      {/* Hero section */}
      <section className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--card)] via-[var(--card)] to-[#1a1510] px-8 py-10 sm:px-10 sm:py-12">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[var(--primary)] opacity-[0.04] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-[var(--primary)] opacity-[0.03] blur-3xl" />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--primary)]">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
              Consultoria estratégica
            </p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              <span className="text-[var(--foreground)]">Central de </span>
              <span className="bg-gradient-to-r from-[var(--primary)] to-[#ff9a40] bg-clip-text text-transparent">
                Clientes
              </span>
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-[var(--muted-foreground)]">
              Hub consolidado de performance dos clientes ativos. Escolha um cliente para analisar funil,
              investimento e resultados em profundidade.
            </p>
          </div>

          <div className="flex items-center gap-3" />
        </div>
      </section>

      {/* Summary KPIs */}
      {!isLoading && clientes && (
        <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {summaryItems.map((item) => (
            <div
              key={item.label}
              className="group flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-4 transition-colors hover:border-[var(--border)] hover:bg-[var(--card-hover)]"
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  item.accent
                    ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                    : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                }`}
              >
                <item.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                  {item.label}
                </p>
                <p
                  className={`text-xl font-bold tabular-nums ${
                    item.accent
                      ? "text-[var(--primary)]"
                      : "text-[var(--foreground)]"
                  }`}
                >
                  {item.value}
                </p>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Search + view toggle + segment filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            type="text"
            placeholder="Pesquisar por nome do cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] py-2.5 pl-10 pr-4 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)]/40 focus:outline-none"
          />
        </div>
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          {segmentOptions.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                Segmento
              </span>
              <select
                value={segmentFilter}
                onChange={(e) => setSegmentFilter(e.target.value)}
                className="min-w-[140px] rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs font-medium text-[var(--foreground)] focus:border-[var(--primary)]/40 focus:outline-none"
              >
                <option value="todos">Todos os segmentos</option>
                {segmentOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--card)] p-1">
            <button
              onClick={() => setViewMode("lista")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all ${
                viewMode === "lista"
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-md shadow-[var(--primary)]/20"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <LayoutList className="h-4 w-4" />
              Lista
            </button>
            <button
              onClick={() => setViewMode("card")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all ${
                viewMode === "card"
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-md shadow-[var(--primary)]/20"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              Card
            </button>
          </div>
        </div>
      </div>

      {/* Grid label */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--border)]" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
          Clientes ativos{" "}
          {(searchQuery || segmentFilter !== "todos") &&
            `(${filteredClientes.length} resultado${filteredClientes.length !== 1 ? "s" : ""})`}
        </span>
        <div className="h-px flex-1 bg-[var(--border)]" />
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-52 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--card)]"
            />
          ))}
        </div>
      )}

      {error && !clientes && (
        <div className="flex items-center gap-3 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 px-5 py-4 text-sm text-[var(--accent)]">
          <span className="font-medium">Erro ao carregar clientes.</span>
          <span className="text-[var(--muted-foreground)]">
            Tente novamente em alguns instantes.
          </span>
        </div>
      )}

      {/* List view */}
      {clientes && viewMode === "lista" && (
        <div className="space-y-2">
          {filteredClientes.length === 0 ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-6 py-12 text-center text-sm text-[var(--muted-foreground)]">
              {searchQuery ? "Nenhum cliente encontrado para essa busca." : "Nenhum cliente cadastrado."}
            </div>
          ) : (
            filteredClientes.map((c) => {
              const semDados = c.totalLeads === 0 && c.conversao === 0;
              const initials = c.nome.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
              const displayBadge = semDados ? "Sem dados" : null;
              return (
                <Link
                  key={c.id}
                  href={`/clientes/${c.id}`}
                  className="group flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-4 transition-all hover:border-[var(--primary)]/30 hover:bg-[var(--card-hover)]"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--muted)] to-[var(--border)] text-sm font-bold text-[var(--muted-foreground)]">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[var(--foreground)]">{c.nome}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {c.segmento?.trim() || (semDados ? "Aguardando sincronização de dados" : "Sem segmento")}
                    </p>
                  </div>
                  {displayBadge && (
                    <span className="shrink-0 rounded-full bg-[var(--muted)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                      {displayBadge}
                    </span>
                  )}
                  {!semDados && (
                    <>
                      <div className="hidden shrink-0 text-right sm:block">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">Leads</p>
                        <p className="font-bold tabular-nums text-[var(--foreground)]">{c.totalLeads.toLocaleString("pt-BR")}</p>
                      </div>
                      <div className="hidden shrink-0 text-right sm:block">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">Conversão</p>
                        <p className="font-bold tabular-nums text-[var(--primary)]">{c.conversao > 100 ? "100%+" : `${c.conversao}%`}</p>
                      </div>
                    </>
                  )}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--muted-foreground)] transition-all group-hover:bg-[var(--primary)]/10 group-hover:text-[var(--primary)]">
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                </Link>
              );
            })
          )}
          <Link
            href="/admin/clientes"
            className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border)] bg-transparent py-6 text-sm font-medium text-[var(--muted-foreground)] transition-all hover:border-[var(--primary)]/40 hover:bg-[var(--card)] hover:text-[var(--primary)]"
          >
            <Plus className="h-4 w-4" />
            Novo cliente
          </Link>
        </div>
      )}

      {/* Cards grid */}
      {clientes && viewMode === "card" && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredClientes.length === 0 ? (
            <div className="col-span-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-6 py-12 text-center text-sm text-[var(--muted-foreground)]">
              {searchQuery ? "Nenhum cliente encontrado para essa busca." : "Nenhum cliente cadastrado."}
            </div>
          ) : (
            filteredClientes.map((c) => <ClienteCard key={c.id} cliente={c} />)
          )}

          {/* Add new client card */}
          <Link href="/admin/clientes" className="block">
            <Card className="card-hover group flex h-full cursor-pointer flex-col items-center justify-center rounded-2xl border-dashed border-[var(--border)] bg-transparent transition-all hover:border-[var(--primary)]/40 hover:bg-[var(--card)]">
              <CardContent className="flex flex-col items-center gap-4 py-12">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)] transition-all group-hover:border-[var(--primary)]/40 group-hover:bg-[var(--primary)]/10 group-hover:text-[var(--primary)]">
                  <Plus className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    Novo cliente
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    Adicionar unidade de negócio
                  </p>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)] transition-colors group-hover:text-[var(--primary)]">
                  <span>Cadastrar</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}
    </main>
  );
}
