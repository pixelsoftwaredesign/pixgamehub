// Cloudflare Pages Function — proxy /api/* to the Railway backend.
const BACKEND = 'https://pixgamehub-production.up.railway.app';

export async function onRequest({ request }) {
    const url = new URL(request.url);
    const target = new URL(url.pathname + url.search, BACKEND);
    const headers = new Headers(request.headers);
    for (const h of ['host', 'cf-connecting-ip', 'cf-ipcountry', 'cf-ray', 'cf-visitor', 'cdn-loop']) {
        headers.delete(h);
    }
    const init = { method: request.method, headers, redirect: 'manual' };
    if (!['GET', 'HEAD'].includes(request.method)) init.body = request.body;
    const resp = await fetch(target, init);
    const responseHeaders = new Headers(resp.headers);
    responseHeaders.delete('content-length');
    return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers: responseHeaders });
}
