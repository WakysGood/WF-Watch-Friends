import React, { useState, useEffect } from 'react';
import { Search, Loader2, Sparkles, X } from 'lucide-react';

const GIPHY_API_KEY = 'YLJxTj7LEz6Ne6zLyBMEuAvJUcmP51Se';

export function GiphyPickerModal({ isOpen, onClose, onSelectGif }) {
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('trending');

  const CATEGORIES = ['Anime', 'Cyberpunk', 'Gaming', 'Reaction', 'Pixel'];

  useEffect(() => {
    if (!isOpen) return;
    loadGifs(query);
  }, [isOpen]);

  const loadGifs = async (searchQuery = '') => {
    setLoading(true);
    try {
      let endpoint = '';
      if (searchQuery.trim()) {
        endpoint = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(searchQuery)}&limit=24&rating=g`;
      } else {
        endpoint = `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=24&rating=g`;
      }

      const res = await fetch(endpoint);
      const data = await res.json();
      if (data && data.data) {
        setGifs(data.data);
      }
    } catch (e) {
      console.warn('Error fetching Giphy GIFs:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadGifs(query);
  };

  const handleCategoryClick = (cat) => {
    setQuery(cat);
    setActiveCategory(cat);
    loadGifs(cat);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(12px)',
        zIndex: 150,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="glass-box"
        style={{
          width: '100%',
          maxWidth: 480,
          height: '75vh',
          maxHeight: 560,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: '#0d121c',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                background: 'linear-gradient(135deg, #00d2ff, #7928ca)',
                padding: '2px 8px',
                borderRadius: 4,
                fontSize: '0.72rem',
                fontWeight: 800,
                color: '#fff',
                letterSpacing: '0.05em',
              }}
            >
              GIPHY
            </span>
            <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#fff' }}>
              Elige tu GIF de Perfil
            </span>
          </div>

          <button
            onClick={onClose}
            style={{
              color: 'var(--text-dim)',
              padding: 4,
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Input */}
        <form
          onSubmit={handleSearchSubmit}
          style={{
            padding: '12px 18px 8px 18px',
            display: 'flex',
            gap: 8,
          }}
        >
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              placeholder="Buscar GIFs en GIPHY..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="custom-input"
              style={{ paddingLeft: 36, paddingRight: 10, fontSize: '0.85rem', height: 38 }}
            />
            <Search
              size={15}
              color="var(--text-dim)"
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
            />
          </div>

          <button
            type="submit"
            className="glow-btn"
            style={{ padding: '0 14px', fontSize: '0.82rem', height: 38 }}
          >
            Buscar
          </button>
        </form>

        {/* Quick Categories */}
        <div
          style={{
            display: 'flex',
            gap: 6,
            padding: '0 18px 12px 18px',
            overflowX: 'auto',
          }}
        >
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => handleCategoryClick(cat)}
              style={{
                fontSize: '0.72rem',
                padding: '3px 9px',
                borderRadius: 999,
                background: query === cat ? '#1e293b' : 'rgba(255, 255, 255, 0.05)',
                color: query === cat ? '#00d2ff' : 'var(--text-muted)',
                border: query === cat ? '1px solid rgba(0, 210, 255, 0.3)' : '1px solid transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* GIFs Grid */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0 18px 18px 18px',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
            alignContent: 'start',
          }}
        >
          {loading ? (
            <div
              style={{
                gridColumn: '1 / -1',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: 180,
                color: 'var(--text-dim)',
                gap: 8,
              }}
            >
              <Loader2 size={24} className="pulse-indicator" color="#00d2ff" />
              <span style={{ fontSize: '0.8rem' }}>Cargando GIFs...</span>
            </div>
          ) : gifs.length === 0 ? (
            <div
              style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                padding: 40,
                color: 'var(--text-dim)',
                fontSize: '0.82rem',
              }}
            >
              No se encontraron GIFs para "{query}"
            </div>
          ) : (
            gifs.map((g) => {
              // Obtenemos una versión optimizada (fixed_height_small o downsized)
              const gifUrl = g.images?.fixed_height_small?.url || g.images?.downsized_medium?.url || g.images?.original?.url;
              return (
                <div
                  key={g.id}
                  onClick={() => {
                    onSelectGif(gifUrl);
                    onClose();
                  }}
                  style={{
                    position: 'relative',
                    aspectRatio: '1',
                    borderRadius: 8,
                    overflow: 'hidden',
                    background: '#161e2e',
                    cursor: 'pointer',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    transition: 'transform 0.15s, border-color 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.04)';
                    e.currentTarget.style.borderColor = '#00d2ff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                  }}
                >
                  <img
                    src={gifUrl}
                    alt={g.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    loading="lazy"
                  />
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
