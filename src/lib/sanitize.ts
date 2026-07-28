/**
 * Output-side hardening.
 *
 * Prisma parameterises every query, so SQL injection is handled at the driver
 * level, and React escapes text nodes, so XSS is handled at render time. What
 * remains are the places where user text leaves those guarantees: rich-text
 * bodies, values interpolated into URLs/CSV, and file names. Those are covered
 * here.
 */

const ALLOWED_TAGS = new Set([
  "p", "br", "strong", "b", "em", "i", "u", "s", "ul", "ol", "li",
  "h2", "h3", "h4", "blockquote", "a", "span",
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "title", "target", "rel"]),
  span: new Set([]),
};

/**
 * Conservative HTML allow-list for CMS bodies. Anything not explicitly allowed
 * is dropped, including all event handlers and `javascript:` URLs.
 */
export function sanitizeHtml(input: string): string {
  if (!input) return "";

  let output = input
    // Remove whole dangerous elements including their content.
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object[\s\S]*?<\/object>/gi, "")
    .replace(/<embed[\s\S]*?>/gi, "")
    // Strip inline event handlers and javascript: URLs.
    .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*(["']?)\s*javascript:[^"'>\s]*/gi, '$1=$2#');

  // Drop any tag outside the allow-list, keeping its inner text.
  output = output.replace(
    /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g,
    (match, rawTag: string) => {
      const tag = rawTag.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) return "";

      if (match.startsWith("</")) return `</${tag}>`;

      const allowed = ALLOWED_ATTRS[tag];
      if (!allowed || allowed.size === 0) return `<${tag}>`;

      const attrs: string[] = [];
      const attrPattern = /([a-zA-Z-]+)\s*=\s*"([^"]*)"/g;
      let attr: RegExpExecArray | null;
      while ((attr = attrPattern.exec(match)) !== null) {
        const [, name, value] = attr;
        if (allowed.has(name.toLowerCase())) {
          attrs.push(`${name.toLowerCase()}="${escapeHtml(value)}"`);
        }
      }

      // External links must never hand the opener to the destination.
      if (tag === "a") attrs.push('rel="noopener noreferrer nofollow"');

      return `<${tag}${attrs.length ? " " + attrs.join(" ") : ""}>`;
    },
  );

  return output.trim();
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Collapses whitespace and trims — applied to every free-text field. */
export function normaliseText(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

/**
 * Neutralises CSV formula injection. A cell beginning with =, +, -, @ or a
 * control character is executed by Excel/Sheets on open unless prefixed.
 */
export function sanitizeCsvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  const dangerous = /^[=+\-@\t\r]/.test(text);
  const escaped = text.replace(/"/g, '""');
  return `"${dangerous ? "'" + escaped : escaped}"`;
}

/** Prevents path traversal and control characters in generated file names. */
export function safeFileName(name: string): string {
  return name
    .replace(/[/\\?%*:|"<>\x00-\x1f]/g, "-")
    .replace(/\.{2,}/g, ".")
    .slice(0, 120);
}

/**
 * Only permits http(s) URLs, so a stored `javascript:` or `data:` URL can never
 * reach an `href`.
 */
export function safeExternalUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/** Keys stripped from audit-log snapshots before persistence. */
const REDACTED_KEYS = new Set([
  "password", "passwordhash", "confirmpassword", "currentpassword",
  "newpassword", "token", "secret", "accesstoken", "refreshtoken",
  "apikey", "authorization",
]);

/** Recursively replaces sensitive values with `[redacted]`. */
export function redact<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;

  if (Array.isArray(value)) {
    return value.map((item) => redact(item)) as unknown as T;
  }

  const output: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    output[key] = REDACTED_KEYS.has(key.toLowerCase())
      ? "[redacted]"
      : redact(val);
  }
  return output as T;
}
