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
 */
function isExempt(pathname: string): boolean {
  return (
    pathname === '/api/auth'
    || pathname.startsWith('/_nuxt/')
    || pathname === '/favicon.ico'
  )
}

/**
 * Inline unlock page served when an unauthenticated user requests an HTML
 * route. Self-contained (no Vue, no Nuxt routing) so we don't need to ship a
 * separate page or worry about asset loading order.
 */
const UNLOCK_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>Homestaging — Locked</title>
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
    width: min(360px, 90vw);
    padding: 32px 28px;
    background: #141414;
    border: 1px solid #262626;
    border-radius: 16px;
    box-shadow: 0 12px 40px rgba(0,0,0,0.4);
  }
  h1 { margin: 0 0 6px; font-size: 18px; font-weight: 600; letter-spacing: -0.01em; }
  p  { margin: 0 0 22px; font-size: 13px; color: #a3a3a3; line-height: 1.5; }
  form { display: flex; flex-direction: column; gap: 10px; }
  input {
    width: 100%; padding: 11px 13px;
    background: #0a0a0a; color: #f5f5f5;
    border: 1px solid #2e2e2e; border-radius: 8px;
    font: inherit; font-size: 14px; outline: none;
    transition: border-color 0.15s;
  }
  input:focus { border-color: #525252; }
  button {
    padding: 11px 13px; font: inherit; font-size: 14px; font-weight: 500;
    background: #f5f5f5; color: #0a0a0a;
    border: 0; border-radius: 8px; cursor: pointer;
    transition: background 0.15s;
  }
  button:hover { background: #e5e5e5; }
  button:disabled { opacity: 0.5; cursor: not-allowed; }
  .err { color: #f87171; font-size: 12px; min-height: 16px; margin-top: 2px; }
</style>
</head>
<body>
<main class="card">
  <h1>Private build</h1>
  <p>This Homestaging POC is shared privately. Enter the password to continue.</p>
  <form id="f" autocomplete="off">
    <input id="p" type="password" name="password" placeholder="Password" autofocus required />
    <div class="err" id="e"></div>
    <button id="b" type="submit">Unlock</button>
  </form>
</main>
<script>
  const f = document.getElementById('f');
  const p = document.getElementById('p');
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
        body: JSON.stringify({ password: p.value }),
      });
      if (r.ok) { window.location.reload(); return; }
      e.textContent = 'Wrong password.';
    } catch (_) {
      e.textContent = 'Network error. Try again.';
    } finally {
      b.disabled = false;
      p.select();
    }
  });
</script>
</body>
</html>
`

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const sitePassword = config.sitePassword

  if (!sitePassword) return

  const { pathname } = getRequestURL(event)
  if (isExempt(pathname)) return

  const cookie = getCookie(event, SITE_AUTH_COOKIE)
  if (cookie === hashSitePassword(sitePassword)) return

  setResponseStatus(event, 401)

  if (pathname.startsWith('/api/')) {
    setResponseHeader(event, 'Content-Type', 'application/json')
    return { error: { code: 'UNAUTHORIZED', message: 'Site is password-protected' } }
  }

  setResponseHeader(event, 'Content-Type', 'text/html; charset=utf-8')
  return UNLOCK_HTML
})
