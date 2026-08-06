/**
 * Endereço do site público da revenda.
 *
 * O site oficial da loja é feito e hospedado fora deste CRM (hoje, na Netlify).
 * O CRM não serve mais vitrine própria: ele é a fonte do estoque, e o site lê
 * esse estoque pelo feed público em /api/publico/veiculos.
 *
 * Por isso todo botão de "ver no site" precisa apontar para lá, e não para uma
 * página deste domínio — abrir uma vitrine paralela mostraria ao lojista algo
 * que o cliente dele nunca vê.
 *
 * Configure em NEXT_PUBLIC_SITE_URL. O padrão é o site atual da Mypremium, para
 * que a instalação funcione sem depender de alguém lembrar de preencher isso.
 */
const FALLBACK = "https://cosmic-tarsier-ef085b.netlify.app";

export function dealerSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configured) return FALLBACK;

  // Um valor digitado errado não pode virar um href quebrado no topo da tela.
  try {
    const url = new URL(configured);
    if (url.protocol !== "https:" && url.protocol !== "http:") return FALLBACK;
    return configured.replace(/\/+$/, "");
  } catch {
    return FALLBACK;
  }
}

/**
 * Endereço de um veículo no site da revenda.
 *
 * O site externo monta as próprias URLs a partir do feed, então o CRM não sabe
 * (nem deve inventar) o caminho de cada anúncio. Levar até a seção de estoque é
 * o mais longe que dá para ir sem chutar uma rota que talvez não exista.
 */
export function dealerSiteStockUrl(): string {
  return `${dealerSiteUrl()}/#estoque`;
}
