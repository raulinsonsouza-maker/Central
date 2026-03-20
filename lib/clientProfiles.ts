export const HOTEL_FAZENDA_SAO_JOAO_SLUG = "hotel-fazenda-sao-joao";
export const TERTULIA_SLUG = "tertulia";
export const VARELLA_MOTOS_SLUG = "varella-motos";

type ClientIdentity = {
  nome?: string | null;
  slug?: string | null;
};

function normalizeText(value?: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function isHotelFazendaSaoJoao(client?: ClientIdentity | null) {
  if (!client) return false;

  const slug = normalizeText(client.slug);
  const nome = normalizeText(client.nome);

  return (
    slug === HOTEL_FAZENDA_SAO_JOAO_SLUG ||
    nome === "hotel fazenda sao joao" ||
    nome === "resort fazenda sao joao"
  );
}

export function isTertulia(client?: ClientIdentity | null) {
  if (!client) return false;

  const slug = normalizeText(client.slug);
  const nome = normalizeText(client.nome);

  return slug === TERTULIA_SLUG || nome === "tertulia";
}

export function isVarellaMotos(client?: ClientIdentity | null) {
  if (!client) return false;

  const slug = normalizeText(client.slug);
  const nome = normalizeText(client.nome);

  return slug === VARELLA_MOTOS_SLUG || nome === "varella motos";
}
