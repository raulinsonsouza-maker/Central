/**
 * Métrica principal de “resultado” no dashboard.
 * No Google Ads as conversões da API eram gravadas em `conversoes` com `leads` zerado;
 * usamos o maior dos dois para compatibilidade com dados antigos e com sync corrigido.
 */
export function outcomeCountForFato(canal: string, leads: number, conversoes: number): number {
  if (canal === "GOOGLE") {
    return Math.max(leads, conversoes);
  }
  return leads;
}
