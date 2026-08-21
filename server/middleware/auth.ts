import { createHash } from 'node:crypto'
import {
  defineEventHandler,
  getCookie,
  getRequestURL,
  setResponseHeader,
  setResponseStatus,
} from 'h3'

export const SITE_AUTH_COOKIE = 'site-auth'

/**
 * Hash a plaintext password to derive the cookie value. We never store the
 * password itself in the cookie; rotating NUXT_SITE_PASSWORD invalidates all
 * existing sessions for free.
 */
export function hashSitePassword(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex')
}

/**
 * Paths the gate must let through regardless of cookie state:
 * - the unlock endpoint itself (chicken-and-egg)
 * - Nuxt build assets (served once the SPA shell loads, after unlock)
 * - favicon (browsers fetch it implicitly on every page)
 * - robots.txt (must stay public so crawlers can read the Disallow)
 */
function isExempt(pathname: string): boolean {
  return (
    pathname === '/api/auth'
    || pathname.startsWith('/_nuxt/')
    || pathname === '/favicon.ico'
    || pathname === '/robots.txt'
  )
}

/**
 * Inline unlock page served when an unauthenticated user requests an HTML
 * route. Self-contained (no Vue, no Nuxt routing) so we don't need to ship a
 * separate page or worry about asset loading order.
 *
 * Styled as a private-event page, NOT a login: a bare input[type=password] on
 * a days-old .website domain got us classified as credential phishing by
 * Proofpoint URL Defense. Visible "code d'invitation" text field instead.
 */
const UNLOCK_HTML = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<meta name="description" content="Expérience privée créée pour les 20 ans de FLAA : cinq questions, puis l'image d'une maison qui vous ressemble." />
<meta name="theme-color" content="#8b5cf6" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="tamaison" />
<meta property="og:title" content="tamaison — les 20 ans de FLAA" />
<meta property="og:description" content="Expérience privée sur invitation : cinq questions, puis l'image d'une maison qui vous ressemble." />
<meta property="og:url" content="https://flaa20ans.website/" />
<link rel="icon" href="/favicon.ico" sizes="32x32" />
<title>tamaison — les 20 ans de FLAA</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh;
    display: grid; place-items: center;
    background: #0a0a0a; color: #f5f5f5;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  }
  .card {
    width: min(400px, 90vw);
    padding: 36px 32px 24px;
    background: #141414;
    border: 1px solid #262626;
    border-radius: 16px;
    box-shadow: 0 12px 40px rgba(0,0,0,0.4);
  }
  .brand {
    font-size: 22px; font-weight: 700; letter-spacing: -0.02em;
    margin-bottom: 18px;
  }
  .brand span {
    background: linear-gradient(135deg, #8b5cf6, #d946ef);
    -webkit-background-clip: text; background-clip: text; color: transparent;
  }
  h1 { margin: 0 0 6px; font-size: 17px; font-weight: 600; letter-spacing: -0.01em; }
  p  { margin: 0 0 22px; font-size: 13px; color: #a3a3a3; line-height: 1.5; }
  p em { color: #d4d4d4; font-style: italic; }
  form { display: flex; flex-direction: column; gap: 8px; }
  label { font-size: 12px; font-weight: 500; color: #d4d4d4; }
  input {
    width: 100%; padding: 11px 13px;
    background: #0a0a0a; color: #f5f5f5;
    border: 1px solid #2e2e2e; border-radius: 8px;
    font: inherit; font-size: 14px; outline: none;
    transition: border-color 0.15s;
  }
  input:focus { border-color: #8b5cf6; }
  button {
    padding: 11px 13px; font: inherit; font-size: 14px; font-weight: 500;
    background: #f5f5f5; color: #0a0a0a;
    border: 0; border-radius: 8px; cursor: pointer;
    transition: background 0.15s;
  }
  button:hover { background: #e5e5e5; }
  button:disabled { opacity: 0.5; cursor: not-allowed; }
  .err { color: #f87171; font-size: 12px; min-height: 16px; margin-top: 2px; }
  footer {
    margin-top: 22px; padding-top: 16px;
    border-top: 1px solid #262626;
    font-size: 11px; color: #737373;
  }
</style>
</head>
<body>
<main class="card">
  <div class="brand">ta<span>maison</span></div>
  <h1>Une expérience privée pour les 20 ans de FLAA</h1>
  <p><em>« Dis-moi qui tu es, je construis ta maison. »</em> Cinq questions, puis l'image d'une maison qui vous ressemble — réservée aux invités de la soirée.</p>
  <form id="f">
    <label for="c">Code d'invitation</label>
    <input id="c" type="text" name="code" placeholder="Code reçu avec votre invitation" autocapitalize="none" autocorrect="off" spellcheck="false" autofocus required />
    <div class="err" id="e"></div>
    <button id="b" type="submit">Entrer</button>
  </form>
  <footer>© 2026 FLAA · Événement privé sur invitation</footer>
</main>
<script>
  const f = document.getElementById('f');
  const c = document.getElementById('c');
  const e = document.getElementById('e');
  const b = document.getElementById('b');
  f.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    e.textContent = '';
    b.disabled = true;
    try {
      const r = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: c.value }),
      });
      if (r.ok) { window.location.reload(); return; }
      e.textContent = 'Code incorrect.';
    } catch (_) {
      e.textContent = 'Erreur réseau. Réessayez.';
    } finally {
      b.disabled = false;
      c.select();
    }
  });
</script>
</body>
</html>
`

export default defineEventHandler((event) => {
  // Keep every response out of search indexes, whatever the gate decides below.
  setResponseHeader(event, 'X-Robots-Tag', 'noindex, nofollow')

  const config = useRuntimeConfig(event)
  const sitePassword = config.sitePassword

  if (!sitePassword) return

  const { pathname } = getRequestURL(event)
  if (isExempt(pathname)) return

  const cookie = getCookie(event, SITE_AUTH_COOKIE)
  if (cookie === hashSitePassword(sitePassword)) return

  if (pathname.startsWith('/api/')) {
    setResponseStatus(event, 401)
    setResponseHeader(event, 'Content-Type', 'application/json')
    return { error: { code: 'UNAUTHORIZED', message: 'Site is password-protected' } }
  }

  // Serve the gate with 200, NOT 401: reputation crawlers (Sophos Intelix,
  // Proofpoint) read a 401 on a days-old .website domain as an empty/parked
  // site and flag it malicious. 200 + real event content lets them see a
  // legitimate page. No protected content leaks — this only ever returns the
  // gate HTML; the real app stays behind the cookie check above.
  setResponseHeader(event, 'Content-Type', 'text/html; charset=utf-8')
  return UNLOCK_HTML
})
