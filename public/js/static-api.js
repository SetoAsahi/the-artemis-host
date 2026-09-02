(() => {
  const API_BASE = 'https://usqsewecifxrxixprqxa.supabase.co/functions/v1/artemis-host-api';
  const TOKEN_KEY = 'artemis_host_admin_session_v1';
  const nativeFetch = window.fetch.bind(window);

  const jsonResponse = (data, status = 200) => new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });

  function mapApi(path, method, bodyText) {
    if (path === '/api/site') return { action: 'site' };
    if (path === '/api/reservations') return { action: 'reservation' };
    if (path === '/api/recruit') return { action: 'recruit' };
    if (path === '/api/admin/me') return { action: 'me', admin: true };
    if (path === '/api/admin/login') return { action: 'login', login: true };
    if (path === '/api/admin/data') return { action: 'admin-data', admin: true };
    if (path === '/api/admin/site') return { action: 'save-site', admin: true };
    if (path === '/api/admin/upload') return { action: 'upload', admin: true };

    let m = path.match(/^\/api\/admin\/reservations\/([^/]+)$/);
    if (m) return {
      action: method === 'DELETE' ? 'reservation-delete' : 'reservation-status',
      admin: true,
      id: decodeURIComponent(m[1]),
      bodyText
    };

    m = path.match(/^\/api\/admin\/recruits\/([^/]+)$/);
    if (m) return {
      action: method === 'DELETE' ? 'recruit-delete' : 'recruit-status',
      admin: true,
      id: decodeURIComponent(m[1]),
      bodyText
    };

    return null;
  }

  window.fetch = async function(input, init = {}) {
    const rawUrl = typeof input === 'string' ? input : input?.url;
    if (!rawUrl) return nativeFetch(input, init);

    let url;
    try { url = new URL(rawUrl, location.origin); }
    catch { return nativeFetch(input, init); }

    if (url.origin !== location.origin || !url.pathname.startsWith('/api/')) {
      return nativeFetch(input, init);
    }

    const method = String(init.method || (typeof input !== 'string' && input?.method) || 'GET').toUpperCase();
    const originalBody = init.body;
    const bodyText = typeof originalBody === 'string' ? originalBody : '';

    if (url.pathname === '/api/admin/logout') {
      localStorage.removeItem(TOKEN_KEY);
      return jsonResponse({ ok: true });
    }

    const mapped = mapApi(url.pathname, method, bodyText);
    if (!mapped) return jsonResponse({ error: 'Not found' }, 404);

    const headers = new Headers(init.headers || {});
    if (!headers.has('Content-Type') && method !== 'GET') headers.set('Content-Type', 'application/json');

    const token = localStorage.getItem(TOKEN_KEY);
    if (mapped.admin && token) headers.set('Authorization', `Bearer ${token}`);

    let body = originalBody;
    if (mapped.id) {
      let parsed = {};
      try { parsed = bodyText ? JSON.parse(bodyText) : {}; } catch {}
      parsed.id = mapped.id;
      body = JSON.stringify(parsed);
    }

    const endpoint = `${API_BASE}?action=${encodeURIComponent(mapped.action)}`;
    const response = await nativeFetch(endpoint, {
      ...init,
      method,
      headers,
      body: method === 'GET' || method === 'HEAD' ? undefined : body,
      cache: mapped.action === 'site' ? 'no-store' : init.cache
    });

    if (mapped.login && response.ok) {
      try {
        const data = await response.clone().json();
        if (data?.token) localStorage.setItem(TOKEN_KEY, data.token);
      } catch {}
    }

    if (mapped.admin && response.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
    }

    return response;
  };
})();
