import React, { useState } from 'react';
import { Copy, Check, Tv, Crown, LogOut, Lock, Unlock, Share2, Settings } from 'lucide-react';
import { Logo } from './Logo';

export function TopBar({
  roomId,
  isHost,
  canControl,
  onToggleControlMode,
  onOpenMediaModal,
  onOpenSettings,
  onLeaveRoom,
  currentMediaTitle,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    const inviteUrl = `${window.location.origin}${window.location.pathname}#room=${roomId}`;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }).catch(() => {
      navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  };

  return (
    <header
      className="glass-panel topbar-container"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 20px',
        borderRadius: 'var(--radius-lg)',
        gap: 16,
        flexWrap: 'wrap',
      }}
    >
      {/* Brand & Room Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Logo size={34} showText={false} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.02em' }}>
                WatchFriends
              </span>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '2px 7px',
                  borderRadius: 'var(--radius-full)',
                  background: isHost ? 'rgba(139, 92, 246, 0.2)' : 'rgba(6, 182, 212, 0.2)',
                  color: isHost ? 'var(--accent-purple)' : 'var(--accent-cyan)',
                  border: isHost ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid rgba(6, 182, 212, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                }}
              >
                {isHost && <Crown size={10} />}
                {isHost ? 'Host' : 'Invitado'}
              </span>
            </div>
            <div
              style={{
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
                maxWidth: 240,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={currentMediaTitle || 'Sin reproducción activa'}
            >
              {currentMediaTitle || 'Sin reproducción activa'}
            </div>
          </div>
        </div>

        {/* Room Share Pill */}
        <div
          onClick={handleCopyLink}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border-subtle)',
            padding: '6px 12px',
            borderRadius: 'var(--radius-full)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          title="Haz clic para copiar el enlace de invitación"
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent-purple)')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
        >
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ROOM:</span>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
            {roomId}
          </span>
          {copied ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--accent-green)', fontSize: '0.75rem' }}>
              <Check size={14} /> ¡Copiado!
            </span>
          ) : (
            <Copy size={13} color="var(--text-muted)" />
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Change Video Button (Host or permitted guest) */}
        {canControl && (
          <button
            onClick={onOpenMediaModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'linear-gradient(135deg, var(--accent-purple), #6366f1)',
              color: '#fff',
              padding: '7px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              fontWeight: 600,
              boxShadow: '0 4px 14px var(--accent-purple-glow)',
            }}
          >
            <Tv size={15} /> Cambiar Video
          </button>
        )}

        {/* Host Control Mode Toggle */}
        {isHost && (
          <button
            onClick={onToggleControlMode}
            title={canControl ? 'Bloquear para que solo tú controles' : 'Permitir que cualquiera controle'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              padding: '7px 12px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            {canControl ? <Unlock size={14} color="var(--accent-green)" /> : <Lock size={14} color="#f59e0b" />}
            <span style={{ display: 'none', md: 'inline' }}>
              {canControl ? 'Control Libre' : 'Solo Host'}
            </span>
          </button>
        )}

        {/* Room Settings Button */}
        <button
          onClick={onOpenSettings}
          title={isHost ? "Configuración de la sala (Miembros, permisos, votaciones)" : "Ver ajustes de la sala"}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            backgroundColor: 'rgba(0, 210, 255, 0.1)',
            border: '1px solid rgba(0, 210, 255, 0.25)',
            color: '#00d2ff',
            padding: '7px 12px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.82rem',
            cursor: 'pointer',
          }}
        >
          <Settings size={14} />
          <span>Ajustes</span>
        </button>

        {/* Leave Room Button */}
        <button
          onClick={onLeaveRoom}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#f87171',
            padding: '7px 12px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.82rem',
            fontWeight: 500,
          }}
          title="Salir de la sala"
        >
          <LogOut size={14} /> Salir
        </button>
      </div>
    </header>
  );
}
