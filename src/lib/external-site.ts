/**
 * Nudges an externally hosted dealership site to rebuild.
 *
 * A site generated at build time — Astro, Hugo, a Next export — reads the
 * inventory feed once, when it is built. Publishing a car in the CRM would
 * otherwise leave it invisible until somebody redeployed by hand. A Netlify
 * build hook is a URL that starts a deploy when it receives a POST, so calling
 * it here closes the loop.
 *
 * Sites that fetch the feed from the browser need none of this and should
 * simply leave NETLIFY_BUILD_HOOK_URL unset.
 */
export async function triggerExternalSiteRebuild(reason: string): Promise<void> {
  const hook = process.env.NETLIFY_BUILD_HOOK_URL?.trim();
  if (!hook) return;

  // A build hook is a credential: anyone holding the URL can spend the
  // account's build minutes. Refusing anything that is not an https Netlify
  // hook keeps a mistyped or injected value from turning every vehicle save
  // into an outbound request to somewhere unintended.
  let target: URL;
  try {
    target = new URL(hook);
  } catch {
    console.warn("[site-externo] NETLIFY_BUILD_HOOK_URL não é uma URL válida");
    return;
  }

  if (target.protocol !== "https:" || target.hostname !== "api.netlify.com") {
    console.warn(
      "[site-externo] hook ignorado: esperado https://api.netlify.com/…",
    );
    return;
  }

  try {
    // Netlify caps a hook body at a trigger title; anything larger is dropped.
    const response = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trigger_title: `Mypremium — ${reason}` }),
      // A hung request must not hold a serverless invocation open.
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      console.warn(
        `[site-externo] Netlify respondeu ${response.status} ao build hook`,
      );
    }
  } catch (error) {
    // Never surface this. The vehicle was saved; the external site being slow
    // to catch up is not a reason to tell someone their car failed to publish.
    console.warn(
      "[site-externo] não foi possível acionar o rebuild:",
      error instanceof Error ? error.message : error,
    );
  }
}
