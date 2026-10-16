import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

const isNative = Capacitor.isNativePlatform();

/**
 * Normaliza y extrae videos a partir de la estructura JSON de YouTubei
 */
function parseYouTubeiResponse(data) {
  const map = new Map();

  function addVideo(id, title, author, duration, views, thumb) {
    if (!id || !title || map.has(id)) return;
    map.set(id, {
      id,
      title: title.trim(),
      author: author || 'YouTube',
      duration: duration || '',
      views: views || '',
      thumb: thumb || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      url: `https://www.youtube.com/watch?v=${id}`,
      type: 'youtube',
    });
  }

  function walk(obj) {
    if (!obj || typeof obj !== 'object') return;
    const vr =
      obj.videoRenderer ||
      obj.compactVideoRenderer ||
      obj.gridVideoRenderer ||
      (obj.videoId && obj.title ? obj : null);

    if (vr && vr.videoId) {
      const title =
        vr.title?.runs?.[0]?.text ||
        vr.title?.simpleText ||
        vr.headline?.simpleText ||
        '';
      const author =
        vr.ownerText?.runs?.[0]?.text ||
        vr.shortBylineText?.runs?.[0]?.text ||
        '';
      const duration = vr.lengthText?.simpleText || '';
      const views =
        vr.shortViewCountText?.simpleText ||
        vr.viewCountText?.simpleText ||
        '';
      const thumb =
        vr.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
        `https://i.ytimg.com/vi/${vr.videoId}/hqdefault.jpg`;
      addVideo(vr.videoId, title, author, duration, views, thumb);
    }
    for (const k in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) {
        walk(obj[k]);
      }
    }
  }

  walk(data);
  return Array.from(map.values()).slice(0, 35);
}

/**
 * Busca videos de YouTube utilizando la API directa (nativa o proxy)
 */
export async function searchYouTubeVideos(query) {
  if (!query || !query.trim()) return [];
  const q = query.trim();

  // 1. En la APK nativa, usar CapacitorHttp directamente sin restricciones CORS
  if (isNative) {
    try {
      const response = await CapacitorHttp.post({
        url: 'https://www.youtube.com/youtubei/v1/search?prettyPrint=false',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
          'Accept-Language': 'es-419,es;q=0.9,en;q=0.8',
        },
        data: {
          context: {
            client: {
              clientName: 'WEB',
              clientVersion: '2.20240101.00.00',
              hl: 'es-419',
              gl: 'MX',
            },
          },
          query: q,
        },
      });

      const data =
        typeof response.data === 'string'
          ? JSON.parse(response.data)
          : response.data;
      const videos = parseYouTubeiResponse(data);
      if (videos.length > 0) return videos;
    } catch (err) {
      console.warn('Native YouTube search error:', err);
    }
  }

  // 2. En entorno web (Vite dev) o fallback
  try {
    const res = await fetch(`/api/yt-search?q=${encodeURIComponent(q)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.videos && data.videos.length > 0) {
        return data.videos;
      }
    }
  } catch (_) {
    // Vite middleware no disponible en producción estática
  }

  // 3. Fallback directo si fetch nativo o de proxy no devolvió nada
  try {
    const res = await fetch('https://www.youtube.com/youtubei/v1/search?prettyPrint=false', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'WEB',
            clientVersion: '2.20240101.00.00',
            hl: 'es-419',
            gl: 'MX',
          },
        },
        query: q,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      return parseYouTubeiResponse(data);
    }
  } catch (e) {
    console.warn('Fallback YouTube search failed:', e);
  }

  return [];
}

/**
 * Parseador de resultados de búsqueda DuckDuckGo HTML
 */
function parseDuckDuckGoHtml(html) {
  const results = [];
  const blockRe =
    /<a[^>]+class="result__a"[^>]+href="\/\/duckduckgo\.com\/l\/\?uddg=([^"&]+)[^"]*"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__url"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;

  let m;
  while ((m = blockRe.exec(html)) !== null && results.length < 20) {
    try {
      const decodedUrl = decodeURIComponent(m[1]);
      const titleRaw = m[2].replace(/<[^>]+>/g, '').trim();
      const snippetRaw = m[4].replace(/<[^>]+>/g, '').trim();
      const isYT =
        decodedUrl.includes('youtube.com/watch') ||
        decodedUrl.includes('youtu.be/');
      let domain = '';
      try {
        domain = new URL(decodedUrl).hostname.replace('www.', '');
      } catch (_) {}

      if (!results.some((r) => r.url === decodedUrl)) {
        results.push({
          title: titleRaw || domain,
          snippet: snippetRaw,
          url: decodedUrl,
          domain,
          isYT,
          type: isYT ? 'youtube' : 'direct',
        });
      }
    } catch (_) {}
  }

  if (results.length === 0) {
    const re = /href="\/\/duckduckgo\.com\/l\/\?uddg=([^&"]+)/g;
    let m2;
    while ((m2 = re.exec(html)) !== null && results.length < 20) {
      try {
        const decodedUrl = decodeURIComponent(m2[1]);
        const isYT =
          decodedUrl.includes('youtube.com/watch') ||
          decodedUrl.includes('youtu.be/');
        let domain = '';
        try {
          domain = new URL(decodedUrl).hostname.replace('www.', '');
        } catch (_) {}
        if (!results.some((r) => r.url === decodedUrl)) {
          results.push({
            title: domain || decodedUrl,
            snippet: '',
            url: decodedUrl,
            domain,
            isYT,
            type: isYT ? 'youtube' : 'direct',
          });
        }
      } catch (_) {}
    }
  }

  return results;
}

/**
 * Busca en la Web (DuckDuckGo) en la APK o navegador
 */
export async function searchWeb(query) {
  if (!query || !query.trim()) return [];
  const q = query.trim();

  // 1. En APK nativa, usar CapacitorHttp
  if (isNative) {
    try {
      const response = await CapacitorHttp.get({
        url: `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
          'Accept-Language': 'es-419,es;q=0.9,en;q=0.8',
        },
      });
      const html = typeof response.data === 'string' ? response.data : '';
      if (html) {
        const results = parseDuckDuckGoHtml(html);
        if (results.length > 0) return results;
      }
    } catch (err) {
      console.warn('Native web search error:', err);
    }
  }

  // 2. En entorno web (Vite dev)
  try {
    const res = await fetch(`/api/web-search?q=${encodeURIComponent(q)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        return data.results;
      }
    }
  } catch (_) {}

  // 3. Fallback directo
  try {
    const res = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`
    );
    if (res.ok) {
      const html = await res.text();
      return parseDuckDuckGoHtml(html);
    }
  } catch (e) {
    console.warn('Fallback web search failed:', e);
  }

  return [];
}

/**
 * Genera el script inyectado para detectar videos y capturar clics de navegación
 */
function getInjectedScript() {
  return `
<script>
(function(){
  function notify(type, data) {
    try { window.parent.postMessage(Object.assign({ type: type }, data), '*'); } catch(e) {}
  }

  function intercept(url) {
    if (!url) return;
    try {
      var abs = new URL(url, document.baseURI).href;
      notify('BROWSE_NAVIGATE', { url: abs });
    } catch(e) {}
    return false;
  }

  // Intercept link clicks
  document.addEventListener('click', function(e) {
    var el = e.target.closest('a');
    if (!el) return;
    var href = el.getAttribute('href') || '';
    if (href.startsWith('javascript:') || href.startsWith('#')) return;
    e.preventDefault();
    intercept(el.href || href);
  }, true);

  // Intercept form submits (e.g. search boxes)
  document.addEventListener('submit', function(e) {
    e.preventDefault();
    var form = e.target;
    var action = form.action || document.location.href;
    var data = new URLSearchParams(new FormData(form)).toString();
    var url = form.method && form.method.toLowerCase() === 'post' ? action : action + (action.includes('?') ? '&' : '?') + data;
    intercept(url);
  }, true);

  // Detect videos on page (HTML5 <video>, <source>, m3u8 streams, iframes)
  function scanMedia() {
    var vids = document.querySelectorAll('video, iframe[src*="youtube.com"], iframe[src*="youtu.be"]');
    vids.forEach(function(v) {
      var src = v.currentSrc || v.src || (v.querySelector('source') ? v.querySelector('source').src : '');
      if (src && !src.startsWith('blob:') && !src.startsWith('data:')) {
        notify('VIDEO_DETECTED', { url: src, title: document.title });
      }
    });

    var sources = document.querySelectorAll('source[src]');
    sources.forEach(function(s) {
      if (s.src) {
        notify('VIDEO_DETECTED', { url: s.src, title: document.title });
      }
    });

    try {
      if (window.servers && Array.isArray(window.servers)) {
        for (var i = 0; i < window.servers.length; i++) {
          var s = window.servers[i];
          if (s && s.remote) {
            try {
              var dec = atob(s.remote.trim());
              if (dec && dec.startsWith('http')) {
                notify('ANIME_SERVER_FOUND', { server: s.server, url: dec });
              }
            } catch(_) {}
          }
        }
      }
    } catch(_) {}
  }

  window.addEventListener('DOMContentLoaded', scanMedia);
  window.addEventListener('load', scanMedia);
  setInterval(scanMedia, 2000);
})();
<\/script>
`;
}

/**
 * Carga y prepara el HTML de una página para mostrar en iframe con srcDoc
 */
export async function fetchWebPageHtml(targetUrl) {
  let url = targetUrl.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }

  let html = '';
  let origin = '';
  try {
    origin = new URL(url).origin;
  } catch (_) {}

  // 1. En APK nativa, usar CapacitorHttp
  if (isNative) {
    try {
      const response = await CapacitorHttp.get({
        url,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-419,es;q=0.9,en;q=0.8',
        },
      });
      html = typeof response.data === 'string' ? response.data : '';
    } catch (err) {
      console.warn('Native fetch page error:', err);
    }
  }

  // 2. Si no es nativo o falló, intentar proxy Vite
  if (!html) {
    try {
      const res = await fetch(`/api/browse?url=${encodeURIComponent(url)}`);
      if (res.ok) {
        html = await res.text();
      }
    } catch (_) {}
  }

  if (!html) {
    throw new Error(
      'No se pudo conectar a la página. Puede estar bloqueada o requerir navegador externo.'
    );
  }

  // Limpiar etiquetas de seguridad que impiden renderizado en iframe
  html = html
    .replace(
      /<meta[^>]+http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi,
      ''
    )
    .replace(/<meta[^>]+http-equiv=["']?X-Frame-Options["']?[^>]*>/gi, '');

  // Insertar <base href> para resolver rutas relativas
  if (origin) {
    if (html.includes('<head>')) {
      html = html.replace('<head>', `<head><base href="${origin}/">`);
    } else if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/<head[^>]*>/i, `$&<base href="${origin}/">`);
    } else {
      html = `<base href="${origin}/">` + html;
    }
  }

  // Inyectar el script interceptor
  const script = getInjectedScript();
  if (html.includes('</body>')) {
    html = html.replace('</body>', script + '</body>');
  } else {
    html += script;
  }

  return { html, url };
}

/**
 * Abre una URL en el navegador externo del sistema (Chrome / Navegador predeterminado)
 */
export async function openInSystemBrowser(url) {
  if (!url) return;
  let target = url.trim();
  if (!target.startsWith('http://') && !target.startsWith('https://')) {
    target = `https://${target}`;
  }

  try {
    if (isNative) {
      await Browser.open({ url: target });
    } else {
      window.open(target, '_blank', 'noopener,noreferrer');
    }
  } catch (e) {
    window.open(target, '_blank', 'noopener,noreferrer');
  }
}
