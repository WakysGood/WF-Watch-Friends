import React, { useState } from 'react';
import { X, Settings, Users, Video, Vote, Check, ShieldAlert } from 'lucide-react';

export function RoomSettingsModal({
  isOpen,
  onClose,
  isHost,
  settings,
  onUpdateSettings,
  currentParticipantsCount,
}) {
  const [maxParticipants, setMaxParticipants] = useState(settings?.maxParticipants || 10);
  const [allowGuestAddVideos, setAllowGuestAddVideos] = useState(settings?.allowGuestAddVideos ?? true);
  const [enableVoteSkip, setEnableVoteSkip] = useState(settings?.enableVoteSkip ?? true);
  const [voteSkipPercentage, setVoteSkipPercentage] = useState(settings?.voteSkipPercentage || 50);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    onUpdateSettings({
      maxParticipants: Number(maxParticipants),
      allowGuestAddVideos,
      enableVoteSkip,
      voteSkipPercentage: Number(voteSkipPercentage),
    });
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(10px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: 440,
          background: '#0d1320',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 16,
          boxShadow: '0 25px 60px rgba(0,0,0,0.85)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Settings size={20} color="#00d2ff" />
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>
              Configuración de la Sala
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              color: 'var(--text-muted)',
              padding: 6,
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {!isHost && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 12px',
                borderRadius: 8,
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                color: '#fbbf24',
                fontSize: '0.8rem',
              }}
            >
              <ShieldAlert size={16} /> Solo el Host puede modificar estos ajustes.
            </div>
          )}

          {/* Ajuste 1: Límite de miembros */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Users size={15} color="#00d2ff" /> Límite de Miembros
              </label>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#00d2ff' }}>
                {maxParticipants} personas
              </span>
            </div>
            <input
              type="range"
              min="2"
              max="30"
              step="1"
              disabled={!isHost}
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(e.target.value)}
              style={{ width: '100%', accentColor: '#00d2ff', cursor: isHost ? 'pointer' : 'not-allowed' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginTop: 4 }}>
              <span>2 min</span>
              <span>Actualmente: {currentParticipantsCount}</span>
              <span>30 máx</span>
            </div>
          </div>

          {/* Ajuste 2: Permitir a invitados agregar videos a la cola / reproducir */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              borderRadius: 10,
              background: '#121827',
              border: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: '80%' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Video size={15} color="#10b981" /> Videos de Invitados
              </span>
              <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                Permitir que los invitados agreguen videos a la lista "Videos por ver"
              </span>
            </div>
            <input
              type="checkbox"
              disabled={!isHost}
              checked={allowGuestAddVideos}
              onChange={(e) => setAllowGuestAddVideos(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: '#00d2ff', cursor: isHost ? 'pointer' : 'not-allowed' }}
            />
          </div>

          {/* Ajuste 3: Votación para pasar al siguiente video */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              borderRadius: 10,
              background: '#121827',
              border: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: '80%' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Vote size={15} color="#8b5cf6" /> Votar para Saltar Video
              </span>
              <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                Permitir que los miembros voten para pasar al siguiente video
              </span>
            </div>
            <input
              type="checkbox"
              disabled={!isHost}
              checked={enableVoteSkip}
              onChange={(e) => setEnableVoteSkip(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: '#00d2ff', cursor: isHost ? 'pointer' : 'not-allowed' }}
            />
          </div>

          {/* Botones de acción */}
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '11px',
                borderRadius: 8,
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: '#94a3b8',
                fontWeight: 600,
                fontSize: '0.84rem',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            {isHost && (
              <button
                type="submit"
                className="glow-btn"
                style={{
                  flex: 1,
                  padding: '11px',
                  borderRadius: 8,
                  fontSize: '0.84rem',
                }}
              >
                <Check size={16} /> Guardar Ajustes
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
