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

const VIDEO_DOMAINS = [
  'streamwish', 'sfastwish', 'awish', 'wishembed', 'dwish',
  'mega.nz', 'mega.co.nz',
  'vidhide', 'vidhidevip', 'vidhidepro',
  'voe.sx', 'voe-unblock',
  'bysekoze.com', 'filemoon',
  'mixdrop', 'mixdrop.top', 'mixdrop.co',
  'mp4upload.com',
  'streamtape.com', 'streamtape.to',
  'doodstream', 'dood.', 'dsvplay', 'ds2play',
  'ok.ru', 'odnoklassniki',
  'yourupload.com',
  'fembed', 'feurl',
  '1fichier.com',
  'jkplayer', 'jkanime.net/jk.php', 'jkanime.net/jkplayer',
  'desu-stream', 'desu.', 'solidfiles',
  'sendvid', 'vidguard', 'vgfplay',
  'uqload', 'upstream', 'streamlare', 'netu'
];

/**
 * Determina si una URL pertenece a un servidor de video / embed conocido
 */
export function isVideoServerUrl(url = '') {
  if (!url || typeof url !== 'string') return false;
  const lower = url.toLowerCase();
  if (VIDEO_DOMAINS.some(d => lower.includes(d))) return true;
  if (
    lower.includes('/embed/') ||
    lower.includes('/e/') ||
    lower.includes('embed.html') ||
    lower.includes('embed-') ||
    lower.includes('videoembed')
  ) {
    return true;
  }
  return false;
}

/**
 * Determina si una URL apunta directamente a un archivo de video multimedia
 */
export function isDirectVideoUrl(url = '') {
  if (!url || typeof url !== 'string') return false;
  const clean = url.split('?')[0].split('#')[0].toLowerCase();
  return (
    clean.endsWith('.mp4') ||
    clean.endsWith('.webm') ||
    clean.endsWith('.ogg') ||
    clean.endsWith('.mov') ||
    clean.includes('.m3u8')
  );
}

/**
 * Resuelve una URL de video o reproductor a su stream directo (.m3u8 / .mp4) si es posible
 */
export async function resolveMediaStream(mediaUrl) {
  if (!mediaUrl) return { url: mediaUrl, type: 'embed' };

  if (isDirectVideoUrl(mediaUrl)) {
    return { url: mediaUrl, type: 'direct' };
  }

  // Resolver JKPlayer (Desu / Magi de JKAnime) para extraer el stream HLS .m3u8 directo
  if (mediaUrl.includes('jkanime.net/jkplayer/')) {
    try {
      let html = '';
      if (isNative) {
        const res = await CapacitorHttp.get({
          url: mediaUrl,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
            Referer: 'https://jkanime.net/',
          },
        });
        html = typeof res.data === 'string' ? res.data : '';
      } else {
        const res = await fetch(`/api/browse?url=${encodeURIComponent(mediaUrl)}`);
        if (res.ok) html = await res.text();
      }

      if (html) {
        const m3u8Match = html.match(/(https:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*)/);
        if (m3u8Match && m3u8Match[1]) {
          return { url: m3u8Match[1], type: 'direct' };
        }
      }
    } catch (e) {
      console.warn('Error al extraer stream m3u8 de jkplayer:', e);
    }
  }

  return { url: mediaUrl, type: 'embed' };
}

/**
 * Obtiene el nombre legible de un servidor de video a partir de su URL
 */
export function getServerNameFromUrl(url = '') {
  if (!url || typeof url !== 'string') return 'Servidor';
  const lower = url.toLowerCase();
  if (lower.includes('streamwish') || lower.includes('sfastwish') || lower.includes('awish') || lower.includes('dwish')) return 'Streamwish';
  if (lower.includes('mega.nz') || lower.includes('mega.co')) return 'Mega';
  if (lower.includes('vidhide')) return 'Vidhide';
  if (lower.includes('voe.sx')) return 'VOE';
  if (lower.includes('filemoon') || lower.includes('bysekoze')) return 'Filemoon';
  if (lower.includes('mixdrop')) return 'Mixdrop';
  if (lower.includes('mp4upload')) return 'Mp4upload';
  if (lower.includes('streamtape')) return 'Streamtape';
  if (lower.includes('dood') || lower.includes('dsvplay')) return 'Doodstream';
  if (lower.includes('ok.ru')) return 'Okru';
  if (lower.includes('yourupload')) return 'YourUpload';
  if (lower.includes('1fichier')) return '1Fichier';
  if (lower.includes('fembed') || lower.includes('feurl')) return 'Fembed';
  if (lower.includes('jkplayer')) return 'JKAnime (Nativo)';
  try {
    const host = new URL(url).hostname.replace('www.', '').split('.')[0];
    return host ? host.charAt(0).toUpperCase() + host.slice(1) : 'Servidor';
  } catch (_) {
    return 'Servidor';
  }
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

  var videoDomains = [
    'streamwish', 'sfastwish', 'awish', 'wishembed', 'dwish',
    'mega.nz', 'mega.co.nz',
    'vidhide', 'vidhidevip', 'vidhidepro',
    'voe.sx', 'voe-unblock',
    'bysekoze.com', 'filemoon',
    'mixdrop', 'mixdrop.top', 'mixdrop.co',
    'mp4upload.com',
    'streamtape.com', 'streamtape.to',
    'doodstream', 'dood.', 'dsvplay', 'ds2play',
    'ok.ru', 'odnoklassniki',
    'yourupload.com',
    'fembed', 'feurl',
    '1fichier.com',
    'jkplayer', 'jkanime.net/jk.php', 'jkanime.net/jkplayer',
    'desu-stream', 'desu.', 'solidfiles',
    'sendvid', 'vidguard', 'vgfplay',
    'uqload', 'upstream', 'streamlare', 'netu'
  ];

  function isVideoUrl(url) {
    if (!url || typeof url !== 'string') return false;
    var lower = url.toLowerCase();
    for (var i = 0; i < videoDomains.length; i++) {
      if (lower.indexOf(videoDomains[i]) !== -1) return true;
    }
    if (lower.indexOf('/embed/') !== -1 || lower.indexOf('/e/') !== -1 || lower.indexOf('embed.html') !== -1 || lower.indexOf('embed-') !== -1 || lower.indexOf('.m3u8') !== -1) {
      return true;
    }
    var clean = lower.split('?')[0].split('#')[0];
    if (clean.endsWith('.mp4') || clean.endsWith('.webm') || clean.endsWith('.ogg')) return true;
    return false;
  }

  function getServerName(url, def) {
    if (!url) return def || 'Servidor';
    var lower = url.toLowerCase();
    for (var i = 0; i < videoDomains.length; i++) {
      if (lower.indexOf(videoDomains[i]) !== -1) {
        var d = videoDomains[i].split('.')[0];
        return d.charAt(0).toUpperCase() + d.slice(1);
      }
    }
    return def || 'Servidor';
  }

  function intercept(url) {
    if (!url) return;
    try {
      var abs = new URL(url, document.baseURI).href;
      if (isVideoUrl(abs)) {
        notify('SERVER_SELECTED', { url: abs, server: getServerName(abs), title: document.title });
        return false;
      }
      notify('BROWSE_NAVIGATE', { url: abs });
    } catch(e) {}
    return false;
  }

  // Interceptar clics en enlaces y en botones/pestañas de servidores
  document.addEventListener('click', function(e) {
    var el = e.target.closest('a, button, [data-server], [data-video], [data-src], .servers, .server-item, .CapiTnv li, [onclick*="server"]');
    if (!el) return;

    var rawHref = el.getAttribute('href') || '';
    var dataSrc = el.getAttribute('data-src') || el.getAttribute('data-video') || el.getAttribute('data-url') || '';
    var testUrl = dataSrc || el.href || rawHref;

    // Verificar si es un botón de servidor conocido en jkanime, animeflv, etc.
    if (el.classList && (el.classList.contains('servers') || el.classList.contains('btn-show') || el.classList.contains('server-item') || el.closest('.bg-servers, #collapseServers, .CapiTnv'))) {
      var sName = el.textContent.trim() || 'Servidor';
      var dataId = el.getAttribute('data-id');

      // JKAnime window.video (reproductores nativos directos como Desu y Magi)
      if (dataId !== null && window.video && window.video[dataId]) {
        var vHtml = window.video[dataId];
        var matchSrc = vHtml.match(/src=["']([^"']+)["']/);
        if (matchSrc && matchSrc[1]) {
          var srcUrl = matchSrc[1];
          if (srcUrl.indexOf('/') === 0) srcUrl = location.origin + srcUrl;
          e.preventDefault();
          e.stopPropagation();
          notify('SERVER_SELECTED', { url: srcUrl, server: sName, title: document.title });
          return false;
        }
      }

      // JKAnime window.servers (servidores de respaldo como Mega, Streamwish, etc.)
      if (dataId !== null && window.servers && window.servers[dataId] && window.servers[dataId].remote) {
        try {
          var dec = atob(window.servers[dataId].remote.trim());
          if (dec && dec.indexOf('http') === 0) {
            e.preventDefault();
            e.stopPropagation();
            notify('SERVER_SELECTED', { url: dec, server: window.servers[dataId].server || sName, title: document.title });
            return false;
          }
        } catch(_) {}
      }
    }

    if (testUrl && isVideoUrl(testUrl)) {
      e.preventDefault();
      e.stopPropagation();
      var absUrl = testUrl;
      try { absUrl = new URL(testUrl, document.baseURI).href; } catch(_) {}
      notify('SERVER_SELECTED', { url: absUrl, server: getServerName(absUrl, el.textContent.trim()), title: document.title });
      return false;
    }

    if (rawHref.startsWith('javascript:') || rawHref.startsWith('#')) return;
    if (el.tagName === 'A' && el.href) {
      e.preventDefault();
      intercept(el.href);
    }
  }, true);

  // Interceptar envío de formularios
  document.addEventListener('submit', function(e) {
    e.preventDefault();
    var form = e.target;
    var action = form.action || document.location.href;
    var data = new URLSearchParams(new FormData(form)).toString();
    var url = form.method && form.method.toLowerCase() === 'post' ? action : action + (action.includes('?') ? '&' : '?') + data;
    intercept(url);
  }, true);

  // Escanear medios, servidores de anime y iframes con reproductores
  function scanMedia() {
    // 1. Tags <video> directos
    var vids = document.querySelectorAll('video');
    vids.forEach(function(v) {
      var src = v.currentSrc || v.src || (v.querySelector('source') ? v.querySelector('source').src : '');
      if (src && !src.startsWith('blob:') && !src.startsWith('data:')) {
        notify('VIDEO_DETECTED', { url: src, title: document.title });
      }
    });

    // 2. Tags <source>
    var sources = document.querySelectorAll('source[src]');
    sources.forEach(function(s) {
      if (s.src) {
        notify('VIDEO_DETECTED', { url: s.src, title: document.title });
      }
    });

    // 3. Tags <iframe> que contienen reproductores o servidores
    var iframes = document.querySelectorAll('iframe[src]');
    iframes.forEach(function(f) {
      var fSrc = f.src || '';
      if (fSrc && isVideoUrl(fSrc)) {
        notify('ANIME_SERVER_FOUND', { server: getServerName(fSrc), url: fSrc });
      }
    });

    // 4. window.servers (JKAnime)
    try {
      if (window.servers && Array.isArray(window.servers)) {
        for (var i = 0; i < window.servers.length; i++) {
          var s = window.servers[i];
          if (s && s.remote) {
            try {
              var dec = atob(s.remote.trim());
              if (dec && dec.indexOf('http') === 0) {
                notify('ANIME_SERVER_FOUND', { server: s.server, url: dec });
              }
            } catch(_) {}
          }
        }
      }
    } catch(_) {}

    // 5. window.video (JKAnime con iframes)
    try {
      if (window.video && Array.isArray(window.video)) {
        for (var k = 0; k < window.video.length; k++) {
          var item = window.video[k];
          if (typeof item === 'string') {
            var m = item.match(/src=["']([^"']+)["']/);
            if (m && m[1]) {
              var full = m[1];
              if (full.indexOf('/') === 0) full = location.origin + full;
              var btnEl = document.querySelector('.bg-servers a[data-id="' + k + '"]');
              var sLabel = btnEl ? btnEl.textContent.trim() : ('Opción ' + (k + 1));
              notify('ANIME_SERVER_FOUND', { server: sLabel, url: full });
            }
          }
        }
      }
    } catch(_) {}

    // 6. window.videos (AnimeFLV)
    try {
      if (window.videos && typeof window.videos === 'object') {
        for (var lang in window.videos) {
          var list = window.videos[lang];
          if (Array.isArray(list)) {
            for (var mIdx = 0; mIdx < list.length; mIdx++) {
              var vObj = list[mIdx];
              var c = vObj.code || vObj.url;
              if (c) {
                var mSrc = c.match(/src=["']([^"']+)["']/);
                var resolved = mSrc ? mSrc[1] : c;
                if (resolved.indexOf('//') === 0) resolved = 'https:' + resolved;
                notify('ANIME_SERVER_FOUND', { server: vObj.title || vObj.server || 'Servidor', url: resolved });
              }
            }
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
