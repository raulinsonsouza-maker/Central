/**
 * Métrica principal de "resultado" no dashboard.
 *
 * Usa o MAIOR entre leads e conversoes para capturar corretamente:
 * - Clientes de geração de leads: leads > 0, conversoes = 0  → retorna leads
 * - Clientes de e-commerce (Meta): leads = 0, conversoes = purchases → retorna conversoes
 * - Google Ads: leads = 0, conversoes = primary conversions → retorna conversoes
 *
 * O parâmetro `conversas` (messagingConversationsStarted) é usado como
 * fallback quando leads e conversoes são ambos zero (clientes de WhatsApp/Messenger).
 */
export function outcomeCountForFato(
  _canal: string,
  leads: number,
  conversoes: number,
  conversas?: number
): number {
  const primary = Math.max(leads, conversoes);
  if (primary > 0) return primary;
  return conversas ?? 0;
}
