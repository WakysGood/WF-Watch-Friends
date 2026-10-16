import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

function videoSearchProxyPlugin() {
  return {
    name: 'video-search-proxy',
    configureServer(server) {
      // 1. YouTube Search (Youtubei internal API + HTML scraping fallback for 30+ results)
      server.middlewares.use('/api/yt-search', async (req, res) => {
        try {
          const url = new URL(req.url, 'http://localhost');
          const query = url.searchParams.get('q') || '';
          if (!query) {
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ videos: [] }));
          }

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
            const vr = obj.videoRenderer || obj.compactVideoRenderer || (obj.videoId && obj.title ? obj : null);
            if (vr && vr.videoId) {
              const title = vr.title?.runs?.[0]?.text || vr.title?.simpleText || vr.headline?.simpleText || '';
              const author = vr.ownerText?.runs?.[0]?.text || vr.shortBylineText?.runs?.[0]?.text || '';
              const duration = vr.lengthText?.simpleText || '';
              const views = vr.shortViewCountText?.simpleText || vr.viewCountText?.simpleText || '';
              const thumb = vr.thumbnail?.thumbnails?.slice(-1)[0]?.url || `https://i.ytimg.com/vi/${vr.videoId}/hqdefault.jpg`;
              addVideo(vr.videoId, title, author, duration, views, thumb);
            }
            for (const k in obj) {
              if (Object.prototype.hasOwnProperty.call(obj, k)) walk(obj[k]);
            }
          }

          // Parallel fetch: Youtubei Internal API + HTML scrape with video filter
          const [apiRes, htmlRes] = await Promise.all([
            fetch('https://www.youtube.com/youtubei/v1/search?prettyPrint=false', {
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
                query,
              }),
            }).then((r) => r.json()).catch(() => ({})),
            fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%253D%253D`, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'es-419,es;q=0.9,en;q=0.8',
              },
            }).then((r) => r.text()).catch(() => ''),
          ]);

          walk(apiRes);

          if (htmlRes) {
            const match = htmlRes.match(/var ytInitialData = ({.*?});<\/script>/);
            if (match) {
              try {
                walk(JSON.parse(match[1]));
              } catch (_) {}
            }
          }

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ videos: Array.from(map.values()).slice(0, 35) }));
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message, videos: [] }));
        }
      });

      // 2. YouTube Trending / Feed Inicial
      server.middlewares.use('/api/yt-trending', async (req, res) => {
        try {
          const response = await fetch(`https://www.youtube.com/feed/trending`, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept-Language': 'es-419,es;q=0.9,en;q=0.8',
            },
          });

          const html = await response.text();
          const match = html.match(/var ytInitialData = ({.*?});<\/script>/);
          const map = new Map();

          function walkTrending(obj) {
            if (!obj || typeof obj !== 'object') return;
            const vr = obj.videoRenderer || obj.compactVideoRenderer || (obj.videoId && obj.title ? obj : null);
            if (vr && vr.videoId) {
              const title = vr.title?.runs?.[0]?.text || vr.title?.simpleText || '';
              const author = vr.ownerText?.runs?.[0]?.text || vr.shortBylineText?.runs?.[0]?.text || '';
              const duration = vr.lengthText?.simpleText || '';
              const views = vr.shortViewCountText?.simpleText || '';
              const thumb = vr.thumbnail?.thumbnails?.slice(-1)[0]?.url || `https://i.ytimg.com/vi/${vr.videoId}/hqdefault.jpg`;
              if (title && !map.has(vr.videoId)) {
                map.set(vr.videoId, {
                  id: vr.videoId,
                  url: `https://www.youtube.com/watch?v=${vr.videoId}`,
                  title,
                  author,
                  duration,
                  views,
                  thumb,
                  type: 'youtube',
                });
              }
            }
            for (const k in obj) {
              if (Object.prototype.hasOwnProperty.call(obj, k)) walkTrending(obj[k]);
            }
          }

          if (match) {
            try {
              walkTrending(JSON.parse(match[1]));
            } catch (_) {}
          }

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ videos: Array.from(map.values()).slice(0, 30) }));
        } catch (err) {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ videos: [] }));
        }
      });

      // 3. Google / Web Search – returns proper title+snippet cards
      server.middlewares.use('/api/web-search', async (req, res) => {
        try {
          const url = new URL(req.url, 'http://localhost');
          const query = url.searchParams.get('q') || '';
          if (!query) {
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ results: [] }));
          }

          const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept-Language': 'es-419,es;q=0.9,en;q=0.8',
            }
          });

          const html = await response.text();
          const results = [];

          // Parse result blocks: each .result__body contains title, URL, snippet
          const blockRe = /<a[^>]+class="result__a"[^>]+href="\/\/duckduckgo\.com\/l\/\?uddg=([^"&]+)[^"]*"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__url"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
          let m;
          while ((m = blockRe.exec(html)) !== null && results.length < 20) {
            const decodedUrl = decodeURIComponent(m[1]);
            const titleRaw = m[2].replace(/<[^>]+>/g, '').trim();
            const snippetRaw = m[4].replace(/<[^>]+>/g, '').trim();
            const isYT = decodedUrl.includes('youtube.com/watch') || decodedUrl.includes('youtu.be/');
            let domain = '';
            try { domain = new URL(decodedUrl).hostname.replace('www.', ''); } catch(e) {}
            if (!results.some(r => r.url === decodedUrl)) {
              results.push({
                title: titleRaw || domain,
                snippet: snippetRaw,
                url: decodedUrl,
                domain,
                isYT,
                type: isYT ? 'youtube' : 'direct',
              });
            }
          }

          // Fallback: simple URL extraction if regex above matched nothing
          if (results.length === 0) {
            const re = /href="\/\/duckduckgo\.com\/l\/\?uddg=([^&"]+)/g;
            let m2;
            while ((m2 = re.exec(html)) !== null && results.length < 20) {
              const decodedUrl = decodeURIComponent(m2[1]);
              const isYT = decodedUrl.includes('youtube.com/watch') || decodedUrl.includes('youtu.be/');
              let domain = '';
              try { domain = new URL(decodedUrl).hostname.replace('www.', ''); } catch(e) {}
              if (!results.some(r => r.url === decodedUrl)) {
                results.push({ title: domain || decodedUrl, snippet: '', url: decodedUrl, domain, isYT, type: isYT ? 'youtube' : 'direct' });
              }
            }
          }

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ results }));
        } catch (err) {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ results: [] }));
        }
      });

      // 4. Web Page Proxy – fetches any URL and returns HTML with absolute URLs
      //    so it can be rendered inside an iframe via srcdoc (true browser experience)
      server.middlewares.use('/api/browse', async (req, res) => {
        try {
          const urlObj = new URL(req.url, 'http://localhost');
          const target = urlObj.searchParams.get('url') || '';
          if (!target) {
            res.statusCode = 400;
            return res.end('Missing url param');
          }

          const targetUrl = target.startsWith('http') ? target : `https://${target}`;
          const parsed = new URL(targetUrl);
          const origin = parsed.origin;

          const pageRes = await fetch(targetUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'es-419,es;q=0.9,en;q=0.8',
              'Accept-Encoding': 'gzip, deflate',
            },
            redirect: 'follow',
          });

          const contentType = pageRes.headers.get('content-type') || 'text/html';
          if (!contentType.includes('text/html')) {
            // For non-HTML resources pipe through directly
            res.setHeader('Content-Type', contentType);
            const buf = await pageRes.arrayBuffer();
            return res.end(Buffer.from(buf));
          }

          let html = await pageRes.text();

          // Strip restrictive Content-Security-Policy & X-Frame-Options meta tags
          html = html
            .replace(/<meta[^>]+http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi, '')
            .replace(/<meta[^>]+http-equiv=["']?X-Frame-Options["']?[^>]*>/gi, '');

          // Rewrite relative URLs to absolute so assets load from origin
          html = html
            .replace(/(href|src|action)="\//g, `$1="${origin}/`)
            .replace(/(href|src|action)='\/([^'])/g, `$1='${origin}/$2`)
            // Inject a <base> tag to handle remaining relative links
            .replace('<head>', `<head><base href="${origin}/">`);

          // Fix jkanime & similar anime player domains so iframes route through the browse proxy
          html = html.replace(/video_data\s*=\s*video_data\.replace\([^;]+\);/g, '/* keep absolute */');
          html = html.replace(/src="https:\/\/jkanime\.net\/jkplayer\//g, 'src="/api/browse?url=https://jkanime.net/jkplayer/');

          // Inject intercept script: catches link clicks, form submits, and detects videos
          const interceptScript = `
<script>
(function(){
  function notify(type, data) {
    try { window.parent.postMessage({ type: type, ...data }, '*'); } catch(e) {}
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
    // 1. Direct <video> tags
    var vids = document.querySelectorAll('video, iframe[src*="youtube.com"], iframe[src*="youtu.be"]');
    vids.forEach(function(v) {
      var src = v.currentSrc || v.src || (v.querySelector('source') ? v.querySelector('source').src : '');
      if (src && !src.startsWith('blob:') && !src.startsWith('data:')) {
        notify('VIDEO_DETECTED', { url: src, title: document.title });
      }
    });

    // 2. <source> tags with m3u8 or mp4
    var sources = document.querySelectorAll('source[src]');
    sources.forEach(function(s) {
      if (s.src) {
        notify('VIDEO_DETECTED', { url: s.src, title: document.title });
      }
    });

    // 3. Anime / embed servers in window (e.g. jkanime servers array)
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
<\/script>`;

          html = html.replace('</body>', interceptScript + '</body>');
          if (!html.includes('</body>')) html += interceptScript;

          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.setHeader('X-Frame-Options', 'ALLOWALL');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(html);
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'text/html');
          res.end(`<html><body style="font-family:sans-serif;padding:40px;background:#0f172a;color:#94a3b8">
            <h2 style="color:#ef4444">No se pudo cargar la página</h2>
            <p>${err.message}</p>
            <p style="font-size:0.8em">${err.stack || ''}</p>
          </body></html>`);
        }
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), videoSearchProxyPlugin()],
})

