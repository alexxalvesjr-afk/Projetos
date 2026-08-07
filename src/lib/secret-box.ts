import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

/**
 * Cifra os tokens de anúncio antes de gravá-los.
 *
 * Um token de conta de anúncios é dinheiro: quem o tem pode ler o histórico de
 * verba e, dependendo do escopo, gastá-la. Guardá-lo em texto puro faria de um
 * dump do banco — um backup esquecido, um `SELECT` de suporte — uma entrega de
 * chaves. AES-256-GCM porque autentica além de cifrar: um valor adulterado
 * falha na abertura em vez de virar lixo silencioso.
 *
 * A chave sai de AUTH_SECRET, que toda instalação já tem. Trocar AUTH_SECRET
 * invalida as conexões salvas — e é o comportamento correto: um segredo trocado
 * porque vazou não pode continuar abrindo o que foi guardado com ele.
 */
function key(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "AUTH_SECRET não configurada — não é possível guardar credenciais.",
    );
  }
  // AUTH_SECRET é texto de tamanho livre; o SHA-256 o normaliza nos 32 bytes
  // que o AES-256 exige.
  return createHash("sha256").update(secret).digest();
}

const VERSION = "v1";

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [
    VERSION,
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    enc.toString("base64url"),
  ].join(".");
}

/**
 * Devolve `null` em vez de estourar quando o valor não abre.
 *
 * O chamador sempre tem uma saída melhor do que uma exceção: pedir que o
 * lojista conecte a conta de novo. Uma tela de erro 500 por causa de um token
 * antigo seria pior do que um botão "Conectar".
 */
export function decryptSecret(payload: string): string | null {
  try {
    const [version, iv, tag, data] = payload.split(".");
    if (version !== VERSION || !iv || !tag || !data) return null;

    const decipher = createDecipheriv(
      "aes-256-gcm",
      key(),
      Buffer.from(iv, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tag, "base64url"));

    return Buffer.concat([
      decipher.update(Buffer.from(data, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}
