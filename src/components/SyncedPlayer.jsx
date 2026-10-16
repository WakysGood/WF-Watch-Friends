import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, RefreshCw, Volume2, VolumeX, Maximize2, ShieldCheck, Film, ExternalLink } from 'lucide-react';
import {
  isVideoServerUrl,
  isDirectVideoUrl,
  getServerNameFromUrl,
  openInSystemBrowser,
} from '../services/mediaSearchService';

// Helper to extract YouTube video ID
export function getYouTubeId(url) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

export function SyncedPlayer({
  media,           // { url, type: 'youtube' | 'direct' | 'stream' | 'embed', title }
  isHost,          // boolean
  canControl,      // boolean (host or permissions)
  onBroadcastSync, // (action: { type: 'PLAY' | 'PAUSE' | 'SEEK', currentTime: number }) => void
  remoteSyncEvent, // { action: 'PLAY' | 'PAUSE' | 'SEEK' | 'STATE', currentTime: number, timestamp: number }
  onRequestSync,   // () => void
  onVideoEnded,    // () => void
}) {
  const containerRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const videoRef = useRef(null);
  const ytContainerId = useRef(`yt-player-${Math.random().toString(36).substring(2, 9)}`);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSynced, setIsSynced] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [embedKey, setEmbedKey] = useState(0);

  // Prevent local triggers when applying a remote sync command
  const isApplyingRemoteSync = useRef(false);
  const lastEmittedTime = useRef(0);

  const youtubeId = getYouTubeId(media?.url);
  const isYouTube = Boolean(youtubeId);
  const isDirect = !isYouTube && (media?.type === 'direct' || isDirectVideoUrl(media?.url));
  const isEmbed = !isYouTube && (media?.type === 'embed' || (!isDirect && isVideoServerUrl(media?.url)) || (Boolean(media?.url) && !isDirect));

  // Initialize YouTube Player
  useEffect(() => {
    if (!isYouTube) return;

    let destroyed = false;

    const setupPlayer = () => {
      if (destroyed || !window.YT || !window.YT.Player) return;

      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch (e) {
          console.warn('Error destroying player:', e);
        }
      }

      ytPlayerRef.current = new window.YT.Player(ytContainerId.current, {
        videoId: youtubeId,
        playerVars: {
          autoplay: 0,
          controls: canControl ? 1 : 1, // Permitir controles para que en móvil el usuario pueda interactuar con el audio/video
          disablekb: canControl ? 0 : 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1, // Imprescindible para Android / iOS y evitar pantalla completa forzada
          enablejsapi: 1,
          origin:
            window.location.origin && window.location.origin.startsWith('http')
              ? window.location.origin
              : 'https://localhost',
          host: 'https://www.youtube.com',
        },
        events: {
          onReady: (event) => {
            if (destroyed) return;
            setDuration(event.target.getDuration() || 0);
            if (!isHost && onRequestSync) {
              onRequestSync();
            }
          },
          onStateChange: (event) => {
            if (destroyed || isApplyingRemoteSync.current) return;

            // 0: Ended, 1: Playing, 2: Paused, 3: Buffering
            if (event.data === window.YT.PlayerState.ENDED) {
              setIsPlaying(false);
              onVideoEnded?.();
            } else if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
              if (canControl) {
                const cur = event.target.getCurrentTime();
                onBroadcastSync?.({ type: 'PLAY', currentTime: cur });
              }
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              setIsPlaying(false);
              if (canControl) {
                const cur = event.target.getCurrentTime();
                onBroadcastSync?.({ type: 'PAUSE', currentTime: cur });
              }
            } else if (event.data === window.YT.PlayerState.BUFFERING) {
              setIsBuffering(true);
            }
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      setupPlayer();
    } else {
      if (!document.getElementById('yt-iframe-api-tag')) {
        const script = document.createElement('script');
        script.id = 'yt-iframe-api-tag';
        script.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(script);
      }
      const checkInterval = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(checkInterval);
          setupPlayer();
        }
      }, 200);
      return () => {
        clearInterval(checkInterval);
        destroyed = true;
      };
    }

    return () => {
      destroyed = true;
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch (e) {
          // ignore cleanup errors
        }
        ytPlayerRef.current = null;
      }
    };
  }, [youtubeId, isYouTube, canControl]);

  // Handle incoming remote sync commands from Host
  useEffect(() => {
    if (!remoteSyncEvent) return;
    const { action, currentTime: targetTime, isPlaying: hostIsPlaying } = remoteSyncEvent;

    isApplyingRemoteSync.current = true;
    setIsSynced(true);

    if (isYouTube && ytPlayerRef.current && typeof ytPlayerRef.current.getPlayerState === 'function') {
      try {
        const localTime = ytPlayerRef.current.getCurrentTime?.() || 0;
        const drift = Math.abs(localTime - targetTime);

        // Resync time if drift > 1.2s or explicit seek
        if (drift > 1.2 || action === 'SEEK') {
          ytPlayerRef.current.seekTo(targetTime, true);
        }

        if (action === 'PLAY' || hostIsPlaying === true) {
          try {
            ytPlayerRef.current.playVideo();
          } catch (e) {
            // Si el navegador móvil bloquea autoplay con sonido, intentar reproducir silenciado y luego reactivar
            try {
              ytPlayerRef.current.mute();
              ytPlayerRef.current.playVideo();
            } catch (err2) {}
          }
          setIsPlaying(true);
        } else if (action === 'PAUSE' || hostIsPlaying === false) {
          ytPlayerRef.current.pauseVideo();
          setIsPlaying(false);
        }
      } catch (err) {
        console.warn('Error applying YouTube remote sync:', err);
      }
    } else if (!isYouTube && videoRef.current) {
      const v = videoRef.current;
      const drift = Math.abs(v.currentTime - targetTime);

      if (drift > 1.2 || action === 'SEEK') {
        v.currentTime = targetTime;
      }

      if (action === 'PLAY' || hostIsPlaying === true) {
        v.play().catch(() => {});
        setIsPlaying(true);
      } else if (action === 'PAUSE' || hostIsPlaying === false) {
        v.pause();
        setIsPlaying(false);
      }
    }

    setTimeout(() => {
      isApplyingRemoteSync.current = false;
    }, 400);
  }, [remoteSyncEvent, isYouTube]);

  // Direct HTML5 Video controls
  const handleDirectPlay = () => {
    if (isApplyingRemoteSync.current) return;
    setIsPlaying(true);
    if (canControl && videoRef.current) {
      onBroadcastSync?.({ type: 'PLAY', currentTime: videoRef.current.currentTime });
    }
  };

  const handleDirectPause = () => {
    if (isApplyingRemoteSync.current) return;
    setIsPlaying(false);
    if (canControl && videoRef.current) {
      onBroadcastSync?.({ type: 'PAUSE', currentTime: videoRef.current.currentTime });
    }
  };

  const handleDirectSeek = (e) => {
    if (!videoRef.current || !canControl) return;
    const newTime = parseFloat(e.target.value);
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    onBroadcastSync?.({ type: 'SEEK', currentTime: newTime });
  };

  // Fullscreen helper
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: '#000',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
      }}
    >
      {/* Sync Badge */}
      <div
        style={{
          position: 'absolute',
          top: 14,
          left: 14,
          zIndex: 30,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(10, 13, 20, 0.75)',
          backdropFilter: 'blur(10px)',
          padding: '6px 12px',
          borderRadius: 'var(--radius-full)',
          border: '1px solid var(--border-subtle)',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: isSynced ? 'var(--accent-green)' : '#f59e0b',
            boxShadow: isSynced ? '0 0 8px var(--accent-green)' : 'none',
          }}
        />
        <span>
          {isHost
            ? isEmbed ? `Host (Servidor: ${getServerNameFromUrl(media?.url)})` : 'Eres el Host (Emisor)'
            : isSynced
            ? isEmbed ? `Sincronizado (${getServerNameFromUrl(media?.url)})` : 'Sincronizado'
            : 'Alineando...'}
        </span>

        {isEmbed && (
          <>
            <span
              style={{
                fontSize: '0.68rem',
                color: '#10b981',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '2px 7px',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontWeight: 600,
              }}
            >
              <ShieldCheck size={11} /> AdGuard DNS
            </span>
            <button
              onClick={() => setEmbedKey(k => k + 1)}
              title="Recargar reproductor (limpia anuncios residuales)"
              style={{
                display: 'flex',
                alignItems: 'center',
                color: '#00d2ff',
                padding: '3px 8px',
                borderRadius: 6,
                cursor: 'pointer',
                background: 'rgba(0, 210, 255, 0.1)',
                border: '1px solid rgba(0, 210, 255, 0.25)',
                fontSize: '0.7rem',
                fontWeight: 600,
                gap: 4,
              }}
            >
              <RefreshCw size={11} /> Limpiar Anuncio
            </button>
            <button
              onClick={() => openInSystemBrowser(media.url)}
              title="Abrir este reproductor en navegador externo (Chrome)"
              style={{
                display: 'flex',
                alignItems: 'center',
                color: 'var(--accent-cyan, #00d2ff)',
                padding: '2px 4px',
                borderRadius: 4,
                cursor: 'pointer',
                background: 'none',
                border: 'none',
              }}
            >
              <ExternalLink size={13} />
            </button>
          </>
        )}

        {!isHost && !isEmbed && (
          <button
            onClick={onRequestSync}
            title="Forzar resincronización con el Host"
            style={{
              display: 'flex',
              alignItems: 'center',
              color: 'var(--text-muted)',
              padding: '2px 4px',
              borderRadius: 4,
            }}
          >
            <RefreshCw size={13} />
          </button>
        )}
      </div>

      {/* Main Player Display */}
      {isYouTube ? (
        <div style={{ width: '100%', height: '100%', pointerEvents: 'auto' }}>
          <div id={ytContainerId.current} style={{ width: '100%', height: '100%' }} />
        </div>
      ) : isEmbed && media?.url ? (
        <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000' }}>
          <iframe
            key={`${media.url}_${embedKey}`}
            src={media.url}
            title={media.title || 'Reproductor de Servidor'}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              background: '#000',
              display: 'block',
            }}
            sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
            referrerPolicy="no-referrer"
          />
        </div>
      ) : media?.url ? (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <video
            ref={videoRef}
            src={media.url}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            controls={canControl}
            onPlay={handleDirectPlay}
            onPause={handleDirectPause}
            onTimeUpdate={() => videoRef.current && setCurrentTime(videoRef.current.currentTime)}
            onLoadedMetadata={() => videoRef.current && setDuration(videoRef.current.duration)}
            onEnded={() => onVideoEnded?.()}
          />
        </div>
      ) : (
        <div
          style={{
            textAlign: 'center',
            padding: 30,
            color: 'var(--text-secondary)',
          }}
        >
          <Film size={48} style={{ color: 'var(--accent-purple)', marginBottom: 12, opacity: 0.8 }} />
          <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: 6 }}>
            {isHost ? 'No hay video seleccionado' : 'Esperando que el Host reproduzca algo...'}
          </h3>
          <p style={{ fontSize: '0.9rem', maxWidth: 400 }}>
            {isHost
              ? 'Elige un video de YouTube, un enlace directo MP4 o una de las demos recomendadas para comenzar a ver juntos.'
              : 'Ponte cómodo y prepárate unas palomitas 🍿.'}
          </p>
        </div>
      )}

      {/* Guest Lock Indicator */}
      {!canControl && media?.url && (
        <div
          style={{
            position: 'absolute',
            bottom: 14,
            left: 14,
            zIndex: 30,
            background: 'rgba(10, 13, 20, 0.75)',
            backdropFilter: 'blur(8px)',
            padding: '5px 10px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <ShieldCheck size={14} color="var(--accent-purple)" />
          Controlado por el Host
        </div>
      )}

      {/* Floating Fullscreen Action */}
      <button
        onClick={toggleFullscreen}
        style={{
          position: 'absolute',
          bottom: 14,
          right: 14,
          zIndex: 30,
          background: 'rgba(15, 20, 30, 0.75)',
          backdropFilter: 'blur(8px)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-primary)',
          padding: 8,
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title="Pantalla completa"
      >
        <Maximize2 size={16} />
      </button>
    </div>
  );
}
