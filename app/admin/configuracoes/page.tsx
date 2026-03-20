"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2, KeyRound, Shield } from "lucide-react";

function getHeaders(token?: string, includeJson = false): HeadersInit {
  const headers: HeadersInit = {};
  if (includeJson) headers["Content-Type"] = "application/json";
  if (token) headers["x-admin-token"] = token;
  return headers;
}

async function fetchIntegrationsConfig(token?: string) {
  const res = await fetch("/api/admin/config/integracoes", {
    headers: getHeaders(token),
  });
  if (res.status === 401) throw new Error("Unauthorized");
  if (!res.ok) throw new Error("Falha ao carregar configurações");
  return res.json() as Promise<{
    metaAdAccountId: string;
    hasMetaAccessToken: boolean;
    hasGoogleDeveloperToken: boolean;
    hasGoogleRefreshToken: boolean;
  }>;
}

async function updateIntegrationsConfigApi(
  body: {
    metaAccessToken?: string;
    metaAdAccountId?: string;
    googleDeveloperToken?: string;
    googleRefreshToken?: string;
  },
  token?: string
) {
  const res = await fetch("/api/admin/config/integracoes", {
    method: "PATCH",
    headers: getHeaders(token, true),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || res.statusText);
  }
  return data as {
    metaAdAccountId: string;
    hasMetaAccessToken: boolean;
    hasGoogleDeveloperToken: boolean;
    hasGoogleRefreshToken: boolean;
  };
}

export default function AdminIntegrationsConfigPage() {
  const [adminToken, setAdminToken] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [metaAccessToken, setMetaAccessToken] = useState("");
  const [metaAdAccountId, setMetaAdAccountId] = useState("");
  const [googleDeveloperToken, setGoogleDeveloperToken] = useState("");
  const [googleRefreshToken, setGoogleRefreshToken] = useState("");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin", "config", "integracoes", adminToken],
    queryFn: () => fetchIntegrationsConfig(adminToken || undefined),
    enabled: !!adminToken,
  });

  const mutation = useMutation({
    mutationFn: (body: {
      metaAccessToken?: string;
      metaAdAccountId?: string;
      googleDeveloperToken?: string;
      googleRefreshToken?: string;
    }) => updateIntegrationsConfigApi(body, adminToken || undefined),
    onSuccess: () => {
      setFormError("");
      setFormSuccess("Configurações atualizadas com sucesso.");
      setMetaAccessToken("");
      setGoogleDeveloperToken("");
      setGoogleRefreshToken("");
    },
    onError: (e: Error) => {
      setFormError(e.message);
      setFormSuccess("");
    },
  });

  const unauthorized = error instanceof Error && error.message === "Unauthorized";

  if (!adminToken || unauthorized) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-sm overflow-hidden rounded-2xl border-[var(--border)]">
          <div className="flex flex-col items-center gap-3 bg-gradient-to-b from-[var(--primary)]/5 to-transparent px-6 pt-8 pb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
              <Shield className="h-7 w-7" />
            </div>
            <h2 className="text-lg font-bold text-[var(--foreground)]">Configurações protegidas</h2>
            <p className="text-center text-xs text-[var(--muted-foreground)]">
              Informe o token de administração para gerenciar as credenciais de API.
            </p>
          </div>
          <CardContent className="px-6 pb-6">
            <div className="space-y-4">
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <input
                  type="password"
                  placeholder="Token de acesso"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] py-2.5 pl-10 pr-4 text-sm transition-colors focus:border-[var(--primary)]/40 focus:outline-none"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && setAdminToken(tokenInput)}
                />
              </div>
              <button
                className="w-full rounded-xl bg-[var(--primary)] py-2.5 text-sm font-semibold text-[var(--primary-foreground)] transition hover:opacity-90"
                onClick={() => setAdminToken(tokenInput)}
              >
                Entrar
              </button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="space-y-8 pb-12">
      <section className="space-y-3">
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--foreground)] sm:text-3xl">
          Configurações de integrações
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Gerencie os tokens de API utilizados para sincronizar dados do Meta Ads e Google Ads.
        </p>
      </section>

      {formError && (
        <div className="flex items-center gap-3 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 px-5 py-3 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--accent)]" />
          <span className="text-[var(--accent)]">{formError}</span>
        </div>
      )}
      {formSuccess && (
        <div className="flex items-center gap-3 rounded-xl border border-[var(--success)]/30 bg-[var(--success)]/5 px-5 py-3 text-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--success)]" />
          <span className="text-[var(--success)]">{formSuccess}</span>
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl border-[var(--border)]">
          <CardHeader>
            <CardTitle className="text-base">Meta Ads</CardTitle>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              Token de acesso e conta padrão utilizados na sincronização da API de Marketing do Meta.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Token de acesso (Meta)
              </label>
              <input
                type="password"
                value={metaAccessToken}
                onChange={(e) => setMetaAccessToken(e.target.value)}
                placeholder={data?.hasMetaAccessToken ? "••••••••••••••••••••" : "Cole o token de acesso do Meta"}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm transition-colors focus:border-[var(--primary)]/40 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                Por segurança, o valor atual não é exibido. Preencha apenas se quiser atualizar.
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                ID da conta padrão (Meta Ads)
              </label>
              <input
                value={metaAdAccountId}
                onChange={(e) => setMetaAdAccountId(e.target.value)}
                placeholder={data?.metaAdAccountId || "act_123456789012345"}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm transition-colors focus:border-[var(--primary)]/40 focus:outline-none"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-[var(--border)]">
          <CardHeader>
            <CardTitle className="text-base">Google Ads</CardTitle>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              Tokens utilizados para autenticar a API do Google Ads. Os IDs de cliente continuam sendo configurados por
              cliente.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Developer token
              </label>
              <input
                type="password"
                value={googleDeveloperToken}
                onChange={(e) => setGoogleDeveloperToken(e.target.value)}
                placeholder={data?.hasGoogleDeveloperToken ? "••••••••••••••••••••" : "Cole o developer token do Google Ads"}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm transition-colors focus:border-[var(--primary)]/40 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                Por segurança, o valor atual não é exibido. Preencha apenas se quiser atualizar.
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Refresh token
              </label>
              <input
                type="password"
                value={googleRefreshToken}
                onChange={(e) => setGoogleRefreshToken(e.target.value)}
                placeholder={data?.hasGoogleRefreshToken ? "••••••••••••••••••••" : "Cole o refresh token do Google Ads"}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm transition-colors focus:border-[var(--primary)]/40 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                Este token é utilizado junto do client ID e client secret configurados via variáveis de ambiente.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="flex justify-end">
        <button
          disabled={mutation.isPending || isLoading}
          onClick={() => {
            const body: {
              metaAccessToken?: string;
              metaAdAccountId?: string;
              googleDeveloperToken?: string;
              googleRefreshToken?: string;
            } = {};

            if (metaAccessToken.trim()) body.metaAccessToken = metaAccessToken.trim();
            if (metaAdAccountId.trim()) body.metaAdAccountId = metaAdAccountId.trim();
            if (googleDeveloperToken.trim()) body.googleDeveloperToken = googleDeveloperToken.trim();
            if (googleRefreshToken.trim()) body.googleRefreshToken = googleRefreshToken.trim();

            if (Object.keys(body).length === 0) {
              setFormError("Preencha ao menos um campo para atualizar.");
              setFormSuccess("");
              return;
            }

            setFormError("");
            mutation.mutate(body);
          }}
          className="rounded-xl bg-[var(--primary)] px-6 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] transition hover:opacity-90 disabled:opacity-50"
        >
          {mutation.isPending ? "Salvando..." : "Salvar alterações"}
        </button>
      </section>
    </main>
  );
}

