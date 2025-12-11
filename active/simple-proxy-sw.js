// Lightweight service worker proxy for /active/simple-proxy?url=<encoded>
const FORBIDDEN_HEADERS = [
  "cross-origin-embedder-policy",
  "cross-origin-opener-policy",
  "cross-origin-resource-policy",
  "content-security-policy",
  "content-security-policy-report-only",
  "expect-ct",
  "feature-policy",
  "origin-isolation",
  "strict-transport-security",
  "upgrade-insecure-requests",
  "x-content-type-options",
  "x-download-options",
  "x-frame-options",
  "x-permitted-cross-domain-policies",
  "x-powered-by",
  "x-xss-protection",
];

function stripHeaders(headers) {
  const out = new Headers();
  for (const [k, v] of headers.entries()) {
    const kl = k.toLowerCase();
    if (!FORBIDDEN_HEADERS.includes(kl)) out.set(k, v);
  }
  return out;
}

async function handleProxyRequest(request) {
  try {
    const urlObj = new URL(request.url);
    const target = urlObj.searchParams.get('url');
    if (!target) return new Response('Missing url parameter', { status: 400 });

    // Fetch the remote resource
    const remoteResp = await fetch(target, { redirect: 'follow' });

    // Build response headers, stripping frame/CSP headers
    const headers = stripHeaders(remoteResp.headers);

    const contentType = remoteResp.headers.get('content-type') || '';

    if (contentType.includes('text/html')) {
      // Inject a <base> tag so relative resources resolve to the original site.
      let text = await remoteResp.text();
      try {
        const turl = new URL(target);
        const baseDir = turl.origin + (turl.pathname.endsWith('/') ? turl.pathname : turl.pathname.replace(/\/[^/]*$/, '/') );
        const baseTag = `<base href="${baseDir}">`;
        // Prefer to inject right after <head ...>
        const headOpen = text.search(/<head(?:\s[^>]*)?>/i);
        if (headOpen !== -1) {
          const insertPos = text.indexOf('>', headOpen) + 1;
          text = text.slice(0, insertPos) + baseTag + text.slice(insertPos);
        } else {
          // Fallback: put the base at the start
          text = baseTag + text;
        }
      } catch (e) {
        // ignore base injection errors
      }
      return new Response(text, { status: remoteResp.status, statusText: remoteResp.statusText, headers });
    }

    // For non-HTML resources stream the body back but still strip headers
    const body = remoteResp.body;
    return new Response(body, { status: remoteResp.status, statusText: remoteResp.statusText, headers });
  } catch (err) {
    return new Response('Proxy error: ' + String(err), { status: 502 });
  }
}

self.addEventListener('install', (e) => e.waitUntil(self.skipWaiting()));
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const reqUrl = new URL(event.request.url);
  if (reqUrl.pathname === '/active/simple-proxy' || reqUrl.pathname === '/active/simple-proxy/') {
    event.respondWith(handleProxyRequest(event.request));
  }
});
