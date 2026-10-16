import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Globe,
  PlaySquare,
  Play,
  Plus,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Home,
  Flame,
  Music,
  Gamepad2,
  Clapperboard,
  CheckCircle2,
  Radio,
  ExternalLink,
  Film,
} from 'lucide-react';

const YT_CATEGORIES = [
  { label: 'Tendencias', query: 'tendencias videos 2026', icon: Flame },
  { label: 'Música', query: 'canciones populares musica 2026', icon: Music },
  { label: 'Gaming', query: 'gameplay videojuegos trailers', icon: Gamepad2 },
  { label: 'Películas', query: 'trailers peliculas oficiales hd', icon: Clapperboard },
  { label: 'En Vivo', query: 'directo streaming en vivo', icon: Radio },
];

export function MediaSelectorModal({
  isOpen,
  onClose,
  onSelectMedia,
  onAddToPlaylist,
  playlistCount = 0,
}) {
  const [activeApp, setActiveApp] = useState('youtube'); // 'youtube' | 'google'

  // ── YouTube App state ────────────────────────────────────────────
  const [ytSearchInput, setYtSearchInput] = useState('');
  const [ytVideos, setYtVideos] = useState([]);
  const [ytLoading, setYtLoading] = useState(false);
  const [ytActiveCategory, setYtActiveCategory] = useState('Tendencias');

  // ── Google / Web Browser state ───────────────────────────────────
  const [addressInput, setAddressInput] = useState('');
  const [currentUrl, setCurrentUrl] = useState('');
  const [iframeSrc, setIframeSrc] = useState('');
  const [browserLoading, setBrowserLoading] = useState(false);
  const [navHistory, setNavHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [detectedVideo, setDetectedVideo] = useState(null);
  const [animeServers, setAnimeServers] = useState([]);

  // Resultados de búsqueda web tipo Google
  const [webSearchResults, setWebSearchResults] = useState([]);
  const [searchingWeb, setSearchingWeb] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Cargar videos iniciales de YouTube al abrir
  const fetchYouTubeVideos = async (query) => {
    setYtLoading(true);
    try {
      const res = await fetch(`/api/yt-search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setYtVideos(data.videos || []);
    } catch (e) {
      console.warn('YT fetch error:', e);
      setYtVideos([]);
    } finally {
      setYtLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchYouTubeVideos('tendencias musica gaming trailers');
    }
  }, [isOpen]);

  // Escuchar mensajes del script inyectado en el iframe (navegación y videos detectados)
  useEffect(() => {
    const handler = (e) => {
      if (!e.data) return;
      if (e.data.type === 'BROWSE_NAVIGATE' && e.data.url) {
        navigateToUrl(e.data.url, true);
      }
      if (e.data.type === 'VIDEO_DETECTED' && e.data.url) {
        const isYT = isYouTubeUrl(e.data.url);
        setDetectedVideo({
          url: e.data.url,
          title: e.data.title || 'Video detectado',
          type: isYT ? 'youtube' : 'direct',
        });
      }
      if (e.data.type === 'ANIME_SERVER_FOUND' && e.data.url) {
        setAnimeServers((prev) => {
          if (prev.some((s) => s.url === e.data.url)) return prev;
          return [...prev, { server: e.data.server, url: e.data.url }];
        });
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  });

  if (!isOpen) return null;

  // ── Helpers de Detección de Video ─────────────────────────────────

  const isYouTubeUrl = (url = '') =>
    url.includes('youtube.com/watch') || url.includes('youtu.be/');

  const extractYtId = (url = '') => {
    try {
      const u = new URL(url);
      return u.searchParams.get('v') || u.pathname.split('/').pop();
    } catch (_) {
      return null;
    }
  };

  // ── Navegación Web ───────────────────────────────────────────────

  // Navegar a una página web real (dentro del iframe)
  const navigateToUrl = (targetUrl, pushHistory = true) => {
    if (!targetUrl) return;
    let url = targetUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }

    setAddressInput(url);
    setCurrentUrl(url);
    setWebSearchResults([]); // ocultar resultados de búsqueda para mostrar la página
    setAnimeServers([]);

    if (pushHistory) {
      setNavHistory((prev) => {
        const slice = prev.slice(0, historyIndex + 1);
        const next = [...slice, url];
        setHistoryIndex(next.length - 1);
        return next;
      });
    }

    // Si es un enlace directo de YouTube, detectarlo de inmediato
    if (isYouTubeUrl(url)) {
      const vid = extractYtId(url);
      setDetectedVideo({
        url: vid ? `https://www.youtube.com/watch?v=${vid}` : url,
        title: 'Video de YouTube',
        type: 'youtube',
      });
      setIframeSrc('');
      setBrowserLoading(false);
      return;
    }

    // Si es un archivo de video directo (.mp4, .webm, .m3u8)
    if (url.endsWith('.mp4') || url.endsWith('.webm') || url.includes('.m3u8')) {
      setDetectedVideo({
        url,
        title: url.split('/').pop().split('?')[0] || 'Video Directo',
        type: 'direct',
      });
      setIframeSrc('');
      setBrowserLoading(false);
      return;
    }

    setDetectedVideo(null);
    setBrowserLoading(true);
    setIframeSrc(`/api/browse?url=${encodeURIComponent(url)}`);
  };

  // Buscar en la Web (muestra resultados de búsqueda reales tipo Google)
  const performWebSearch = async (query) => {
    if (!query.trim()) return;
    const q = query.trim();

    // Si el usuario escribe una URL directa (ej: jkanime.net, wikipedia.org o https://...)
    if (q.startsWith('http://') || q.startsWith('https://') || (q.includes('.') && !q.includes(' '))) {
      navigateToUrl(q);
      return;
    }

    // Si es un término de búsqueda, consultar el buscador web
    setSearchingWeb(true);
    setSearchQuery(q);
    setIframeSrc('');
    setDetectedVideo(null);
    setAnimeServers([]);
    try {
      const res = await fetch(`/api/web-search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setWebSearchResults(data.results || []);
    } catch (e) {
      console.warn('Web search error:', e);
      setWebSearchResults([]);
    } finally {
      setSearchingWeb(false);
    }
  };

  const handleAddressSubmit = (e) => {
    e && e.preventDefault();
    if (!addressInput.trim()) return;
    performWebSearch(addressInput);
  };

  const handleBack = () => {
    if (historyIndex > 0) {
      const newIdx = historyIndex - 1;
      setHistoryIndex(newIdx);
      navigateToUrl(navHistory[newIdx], false);
    } else if (webSearchResults.length > 0 || iframeSrc) {
      // Volver a la pantalla de inicio de Google
      setIframeSrc('');
      setWebSearchResults([]);
      setAddressInput('');
      setCurrentUrl('');
      setDetectedVideo(null);
      setAnimeServers([]);
    }
  };

  const handleForward = () => {
    if (historyIndex < navHistory.length - 1) {
      const newIdx = historyIndex + 1;
      setHistoryIndex(newIdx);
      navigateToUrl(navHistory[newIdx], false);
    }
  };

  const handleRefresh = () => {
    if (currentUrl) navigateToUrl(currentUrl, false);
  };

  const handleHomeClick = () => {
    setIframeSrc('');
    setWebSearchResults([]);
    setAddressInput('');
    setCurrentUrl('');
    setDetectedVideo(null);
    setAnimeServers([]);
  };

  // ── YouTube handlers ─────────────────────────────────────────────

  const handleYtSearch = (e) => {
    e && e.preventDefault();
    if (!ytSearchInput.trim()) return;
    fetchYouTubeVideos(ytSearchInput.trim());
  };

  const handleYtCategoryClick = (cat) => {
    setYtActiveCategory(cat.label);
    setYtSearchInput('');
    fetchYouTubeVideos(cat.query);
  };

  const handleSelectAndPlay = (video) => {
    onSelectMedia({
      url: video.url,
      type: video.type || (isYouTubeUrl(video.url) ? 'youtube' : 'direct'),
      title: video.title,
    });
    onClose();
  };

  const handleAddQueue = (video, e) => {
    e && e.stopPropagation();
    onAddToPlaylist && onAddToPlaylist({
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      url: video.url,
      type: video.type || (isYouTubeUrl(video.url) ? 'youtube' : 'direct'),
      title: video.title,
      addedBy: 'Tú',
      addedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
  };

  const navBtnBase = {
    background: 'none',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    padding: 6,
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'background 0.15s, color 0.15s',
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.88)',
        backdropFilter: 'blur(16px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: 960,
          height: '100dvh',
          maxHeight: '94vh',
          background: '#07090e',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 20,
          boxShadow: '0 30px 80px rgba(0,0,0,0.95)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── App Switcher Bar Superior ─────────────────────────── */}
        <div
          style={{
            padding: '10px 16px',
            background: '#0d1320',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* YouTube App Tab */}
            <button
              onClick={() => setActiveApp('youtube')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '7px 16px',
                borderRadius: 10,
                fontSize: '0.86rem',
                fontWeight: 700,
                background: activeApp === 'youtube' ? '#ef4444' : 'rgba(255,255,255,0.05)',
                color: activeApp === 'youtube' ? '#fff' : '#94a3b8',
                border: activeApp === 'youtube' ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.06)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: activeApp === 'youtube' ? '0 0 16px rgba(239,68,68,0.4)' : 'none',
              }}
            >
              <PlaySquare size={17} fill={activeApp === 'youtube' ? 'white' : 'none'} />
              <span>YouTube App</span>
            </button>

            {/* Google / Web Browser Tab */}
            <button
              onClick={() => setActiveApp('google')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '7px 16px',
                borderRadius: 10,
                fontSize: '0.86rem',
                fontWeight: 700,
                background: activeApp === 'google' ? '#0070f3' : 'rgba(255,255,255,0.05)',
                color: activeApp === 'google' ? '#fff' : '#94a3b8',
                border: activeApp === 'google' ? '1px solid #00d2ff' : '1px solid rgba(255,255,255,0.06)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: activeApp === 'google' ? '0 0 16px rgba(0,210,255,0.4)' : 'none',
              }}
            >
              <Globe size={17} />
              <span>Navegador Web</span>
            </button>
          </div>

          <button
            onClick={onClose}
            style={{ color: '#94a3b8', padding: 6, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', background: 'none', border: 'none' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* ================================================================ */}
        {/* VISTA 1: YOUTUBE APP NATIVO INTERNO                              */}
        {/* ================================================================ */}
        {activeApp === 'youtube' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', background: '#0f172a', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <form onSubmit={handleYtSearch} style={{ display: 'flex', gap: 10 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={17} color="#64748b" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    placeholder="Buscar en YouTube..."
                    value={ytSearchInput}
                    onChange={(e) => setYtSearchInput(e.target.value)}
                    className="custom-input"
                    style={{ paddingLeft: 40, height: 42, fontSize: '0.9rem', borderRadius: 24, background: '#1e293b' }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={ytLoading}
                  style={{ background: '#ef4444', color: '#fff', padding: '0 20px', borderRadius: 24, fontWeight: 700, fontSize: '0.86rem', cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Search size={15} /> Buscar
                </button>
              </form>

              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
                {YT_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const sel = ytActiveCategory === cat.label;
                  return (
                    <button
                      key={cat.label}
                      onClick={() => handleYtCategoryClick(cat)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 16, fontSize: '0.76rem', fontWeight: 600, background: sel ? '#ffffff' : 'rgba(255,255,255,0.06)', color: sel ? '#000' : '#cbd5e1', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      <Icon size={12} />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
              {ytLoading ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: 60 }}>
                  <div style={{ width: 34, height: 34, border: '3px solid rgba(239,68,68,0.2)', borderTopColor: '#ef4444', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 14px' }} />
                  Buscando videos de YouTube...
                </div>
              ) : ytVideos.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#64748b', padding: 60 }}>
                  No se encontraron videos. Prueba buscando otro término.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                  {ytVideos.map((video) => (
                    <div
                      key={video.id || video.url}
                      onClick={() => handleSelectAndPlay(video)}
                      style={{ background: '#121827', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s, border-color 0.2s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                      <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#1e293b' }}>
                        <img src={video.thumb} alt={video.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        {video.duration && (
                          <span style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,0.85)', color: '#fff', fontSize: '0.68rem', fontWeight: 700, padding: '2px 5px', borderRadius: 4 }}>
                            {video.duration}
                          </span>
                        )}
                      </div>
                      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6, flex: 1, justifyContent: 'space-between' }}>
                        <div>
                          <h4 style={{ fontSize: '0.86rem', fontWeight: 700, color: '#f8fafc', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 4 }} title={video.title}>
                            {video.title}
                          </h4>
                          <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                            {video.author}{video.views ? ` • ${video.views}` : ''}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <button onClick={() => handleSelectAndPlay(video)} style={{ flex: 1, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 10px', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                            <Play size={12} fill="white" /> Reproducir
                          </button>
                          <button onClick={(e) => handleAddQueue(video, e)} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', borderRadius: 8, padding: '7px 10px', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }} title="Agregar a la cola">
                            <Plus size={13} /> Cola
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* VISTA 2: NAVEGADOR GOOGLE / WEB INTERNO                           */}
        {/* ================================================================ */}
        {activeApp === 'google' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

            {/* Barra de Navegación del Navegador (100% interna dentro de la app) */}
            <div
              style={{
                padding: '8px 12px',
                background: '#0d1320',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <button
                onClick={handleBack}
                disabled={historyIndex <= 0 && !iframeSrc && webSearchResults.length === 0}
                title="Atrás"
                style={{ ...navBtnBase, color: (historyIndex <= 0 && !iframeSrc && webSearchResults.length === 0) ? '#334155' : '#94a3b8' }}
              >
                <ArrowLeft size={18} />
              </button>
              <button
                onClick={handleForward}
                disabled={historyIndex >= navHistory.length - 1}
                title="Adelante"
                style={{ ...navBtnBase, color: historyIndex >= navHistory.length - 1 ? '#334155' : '#94a3b8' }}
              >
                <ArrowRight size={18} />
              </button>
              <button onClick={handleRefresh} title="Recargar" style={{ ...navBtnBase, color: '#64748b' }}>
                <RotateCw size={16} />
              </button>
              <button onClick={handleHomeClick} title="Inicio de Google" style={{ ...navBtnBase, color: '#64748b' }}>
                <Home size={16} />
              </button>

              {/* Barra de Direcciones / Búsqueda */}
              <form onSubmit={handleAddressSubmit} style={{ flex: 1, display: 'flex' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={14} color="#64748b" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    value={addressInput}
                    onChange={(e) => setAddressInput(e.target.value)}
                    onFocus={(e) => { e.target.select(); e.target.style.borderColor = 'rgba(0,210,255,0.6)'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'rgba(0,210,255,0.25)'; }}
                    placeholder="Buscar en Google o escribir URL (ej: jkanime.net)..."
                    style={{
                      width: '100%',
                      height: 36,
                      background: '#151d30',
                      border: '1px solid rgba(0,210,255,0.25)',
                      borderRadius: 18,
                      color: '#e2e8f0',
                      fontSize: '0.82rem',
                      paddingLeft: 34,
                      paddingRight: 14,
                      outline: 'none',
                      fontFamily: 'inherit',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </form>

              {(browserLoading || searchingWeb) && (
                <div style={{ width: 18, height: 18, border: '2px solid rgba(0,210,255,0.2)', borderTopColor: '#00d2ff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
              )}
            </div>

            {/* Banner flotante cuando se detecta un video en la página navegada */}
            {detectedVideo && (
              <div
                style={{
                  padding: '10px 16px',
                  background: 'rgba(16,185,129,0.15)',
                  borderBottom: '1px solid rgba(16,185,129,0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CheckCircle2 size={20} color="#10b981" />
                  <div>
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f1f5f9' }}>
                      ¡Video detectado en la página!
                    </span>
                    <p style={{ fontSize: '0.72rem', color: '#cbd5e1', maxWidth: 420, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                      {detectedVideo.url}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => handleAddQueue(detectedVideo)}
                    style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <Plus size={12} /> Cola
                  </button>
                  <button
                    onClick={() => handleSelectAndPlay(detectedVideo)}
                    className="glow-btn"
                    style={{ padding: '6px 14px', fontSize: '0.76rem', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 5 }}
                  >
                    <Play size={12} fill="white" /> Reproducir en Room
                  </button>
                </div>
              </div>
            )}

            {/* Banner de servidores de video encontrados (ej. jkanime, streamwish, etc.) */}
            {animeServers.length > 0 && !detectedVideo && (
              <div
                style={{
                  padding: '10px 16px',
                  background: 'rgba(124, 58, 237, 0.2)',
                  borderBottom: '1px solid rgba(124, 58, 237, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Film size={18} color="#a78bfa" />
                  <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#f1f5f9' }}>
                    Servidores de reproducción detectados:
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {animeServers.map((s, i) => (
                    <button
                      key={s.url + i}
                      onClick={() => handleSelectAndPlay({ url: s.url, title: `Episodio (${s.server})`, type: 'direct' })}
                      className="glow-btn"
                      style={{ padding: '5px 11px', fontSize: '0.74rem', borderRadius: 8 }}
                    >
                      <Play size={10} fill="white" style={{ marginRight: 4 }} />
                      {s.server}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Viewport del Navegador */}
            <div style={{ flex: 1, position: 'relative', background: '#0a0f1e', overflowY: 'auto' }}>

              {/* 1. Pantalla de Inicio de Google (cuando no hay búsqueda ni iframe cargado) */}
              {!iframeSrc && !searchingWeb && webSearchResults.length === 0 && (
                <div style={{ textAlign: 'center', padding: '50px 24px', maxWidth: 500, margin: '0 auto' }}>
                  {/* Logo de Google */}
                  <div style={{ fontSize: '2.8rem', fontWeight: 800, letterSpacing: -1, marginBottom: 14 }}>
                    <span style={{ color: '#4285F4' }}>G</span>
                    <span style={{ color: '#EA4335' }}>o</span>
                    <span style={{ color: '#FBBC05' }}>o</span>
                    <span style={{ color: '#4285F4' }}>g</span>
                    <span style={{ color: '#34A853' }}>l</span>
                    <span style={{ color: '#EA4335' }}>e</span>
                  </div>

                  <p style={{ fontSize: '0.84rem', color: '#94a3b8', marginBottom: 24, lineHeight: 1.6 }}>
                    Navega por internet dentro de la app. Puedes buscar en Google, entrar a páginas web y reproducir videos sincronizados en tu Room.
                  </p>

                  {/* Sugerencias Rápidas */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
                    {['jkanime.net', 'animeflv.net', 'Wikipedia', 'SoundCloud', 'Twitch'].map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setAddressInput(s);
                          performWebSearch(s);
                        }}
                        style={{ background: '#121827', border: '1px solid rgba(255,255,255,0.08)', color: '#cbd5e1', padding: '7px 14px', borderRadius: 16, fontSize: '0.78rem', cursor: 'pointer' }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Resultados de Búsqueda Web Tipo Google (Páginas reales) */}
              {!iframeSrc && webSearchResults.length > 0 && (
                <div style={{ padding: '18px 24px', maxWidth: 740, margin: '0 auto' }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 14 }}>
                    Resultados web para <strong style={{ color: '#00d2ff' }}>"{searchQuery}"</strong> — Toca cualquier enlace para entrar y navegar en la página:
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {webSearchResults.map((item, idx) => (
                      <div
                        key={item.url || idx}
                        onClick={() => navigateToUrl(item.url)}
                        style={{
                          padding: '14px 16px',
                          borderRadius: 12,
                          background: '#0f172a',
                          border: '1px solid rgba(255,255,255,0.06)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                          transition: 'border-color 0.2s, transform 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#00d2ff';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        {/* Dominio y URL */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.72rem', color: '#00d2ff', display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Globe size={11} /> {item.domain || item.url}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: '#475569', display: 'flex', alignItems: 'center', gap: 3 }}>
                            Entrar a página <ExternalLink size={10} />
                          </span>
                        </div>

                        {/* Título de la página web */}
                        <h4 style={{ fontSize: '0.94rem', fontWeight: 700, color: '#f8fafc', margin: 0, lineHeight: 1.3 }}>
                          {item.title}
                        </h4>

                        {/* Descripción o Snippet del contenido */}
                        {item.snippet && (
                          <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
                            {item.snippet}
                          </p>
                        )}

                        {/* Si es un enlace de video reconocido (YouTube / directo), mostrar acceso rápido */}
                        {item.isYT && (
                          <div style={{ marginTop: 4, display: 'flex', gap: 8 }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectAndPlay(item);
                              }}
                              className="glow-btn"
                              style={{ padding: '5px 12px', fontSize: '0.72rem', borderRadius: 6 }}
                            >
                              <Play size={10} fill="white" /> Reproducir video
                            </button>
                            <button
                              onClick={(e) => handleAddQueue(item, e)}
                              style={{ padding: '5px 10px', fontSize: '0.72rem', borderRadius: 6, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', cursor: 'pointer' }}
                            >
                              + Cola
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Indicador de Carga */}
              {(browserLoading || searchingWeb) && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(7,9,14,0.85)', zIndex: 10 }}>
                  <div style={{ textAlign: 'center', color: '#64748b' }}>
                    <div style={{ width: 40, height: 40, border: '3px solid rgba(0,210,255,0.15)', borderTopColor: '#00d2ff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 14px' }} />
                    <div style={{ fontSize: '0.84rem', color: '#cbd5e1' }}>
                      {searchingWeb ? 'Buscando en la web...' : 'Cargando página...'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 6, maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {addressInput}
                    </div>
                  </div>
                </div>
              )}

              {/* 4. El Navegador Web Real (sin restricciones de sandbox bloqueantes) */}
              {iframeSrc && (
                <iframe
                  key={iframeSrc}
                  src={iframeSrc}
                  title="Navegador Web Interno"
                  onLoad={() => setBrowserLoading(false)}
                  onError={() => setBrowserLoading(false)}
                  style={{ width: '100%', height: '100%', border: 'none', background: '#fff', display: 'block' }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
