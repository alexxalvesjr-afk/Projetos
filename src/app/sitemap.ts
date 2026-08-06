import type { MetadataRoute } from "next";

/**
 * Este domínio hospeda apenas o CRM, que é privado por inteiro.
 *
 * O site público da revenda mora fora daqui e publica o próprio sitemap; listar
 * URLs deste domínio só gastaria orçamento de rastreamento em páginas que
 * redirecionam para a tela de login. Um sitemap vazio é a resposta honesta, e
 * mantê-lo (em vez de apagar o arquivo) evita um 404 para quem já o indexou.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [];
}
