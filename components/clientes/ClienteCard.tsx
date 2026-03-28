"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowUpRight,
  BarChart3,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

export interface ClienteCardData {
  id: string;
  nome: string;
  slug: string;
  logoUrl: string | null;
  segmento: string | null;
  segmentoCor?: string | null;
  totalLeads: number;
  conversao: number;
  ativo?: boolean;
  hasGoogleConta?: boolean;
  hasMetaConta?: boolean;
}

function getStatusConfig(
  conversao: number,
  totalLeads: number
): { label: string; bg: string; dot: string } | null {
  if (totalLeads === 0 && conversao === 0) return null;
  if (conversao < 0.5)
    return { label: "Crítico", bg: "var(--badge-critical)", dot: "#ef4444" };
  if (conversao < 2)
    return {
      label: "Performance",
      bg: "var(--badge-performance)",
      dot: "#f97316",
    };
  return { label: "Digital", bg: "var(--badge-digital)", dot: "#0ea5e9" };
}

export function ClienteCard({ cliente }: { cliente: ClienteCardData }) {
  const semDados = cliente.totalLeads === 0 && cliente.conversao === 0;

  const statusConfig = getStatusConfig(cliente.conversao, cliente.totalLeads);
  const displayBadge = cliente.segmento?.trim()
    ? { label: cliente.segmento.trim(), bg: cliente.segmentoCor ?? "var(--badge-digital)", dot: "rgba(255,255,255,0.6)" }
    : semDados
      ? { label: "Sem dados", bg: "var(--muted)", dot: "var(--muted-foreground)" }
      : statusConfig;

  const initials = cliente.nome
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <Link href={`/clientes/${cliente.id}`} className="block group">
      <Card className="card-hover relative h-full overflow-hidden rounded-2xl border-[var(--border)]">
        {/* Glow accent on hover */}
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[var(--primary)] opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-[0.06]" />

        <CardContent className="flex h-full flex-col gap-5 p-6">
          {/* Top row: avatar + badge + icon */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--muted)] to-[var(--border)] text-sm font-bold text-[var(--muted-foreground)]">
                {initials}
              </div>
              {displayBadge && (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white"
                  style={{ backgroundColor: displayBadge.bg }}
                >
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: "rgba(255,255,255,0.6)" }}
                  />
                  {displayBadge.label}
                </span>
              )}
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] transition-all group-hover:bg-[var(--primary)]/10 group-hover:text-[var(--primary)]">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>

          {/* Client name */}
          <div>
            <h3 className="text-lg font-bold leading-tight text-[var(--foreground)]">
              {cliente.nome}
            </h3>
            <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
              {semDados ? "Aguardando sincronização de dados" : "Unidade de negócio"}
            </p>
          </div>

          {/* Metrics or waiting state */}
          <div className="mt-auto">
            {semDados ? (
              <div className="flex items-center gap-3 rounded-xl bg-[var(--muted)]/50 px-4 py-3">
                <Users className="h-5 w-5 text-[var(--muted-foreground)]" />
                <p className="text-xs font-medium text-[var(--muted-foreground)]">
                  Aguardando sincronização de dados
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[var(--muted)]/50 px-4 py-3">
                  <div className="mb-1 flex items-center gap-1.5">
                    <Zap className="h-3 w-3 text-[var(--muted-foreground)]" />
                    <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                      Leads
                    </p>
                  </div>
                  <p className="text-xl font-bold tabular-nums text-[var(--foreground)]">
                    {cliente.totalLeads.toLocaleString("pt-BR")}
                  </p>
                </div>
                <div className="rounded-xl bg-[var(--muted)]/50 px-4 py-3">
                  <div className="mb-1 flex items-center gap-1.5">
                    <TrendingUp className="h-3 w-3 text-[var(--primary)]" />
                    <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                      Conversão
                    </p>
                  </div>
                  <p className="text-xl font-bold tabular-nums text-[var(--primary)]">
                    {cliente.conversao > 100 ? "100%+" : `${cliente.conversao}%`}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
            <div className="flex items-center gap-1.5">
              <BarChart3 className="h-3 w-3 text-[var(--muted-foreground)]" />
              <span className="text-[10px] font-medium text-[var(--muted-foreground)]">
                {semDados ? "Sem dados" : "Ativo"}
              </span>
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] transition-colors group-hover:text-[var(--primary)]">
              Ver diagnóstico →
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
