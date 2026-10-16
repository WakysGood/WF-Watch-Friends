import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Radio, KeyRound, Lock, ArrowRight } from 'lucide-react';

export function LobbyPage({ onCreateRoom, onJoinRoom, defaultRoomId = '' }) {
  const [roomIdInput, setRoomIdInput] = useState(defaultRoomId);
  const [tab, setTab] = useState(defaultRoomId ? 'join' : 'create');
  const [errorMsg, setErrorMsg] = useState('');

  const handleJoin = (e) => {
    e.preventDefault();
    const trimmed = roomIdInput.trim();
    if (!trimmed) {
      setErrorMsg('Por favor introduce el código de la sala');
      return;
    }
    onJoinRoom(trimmed);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      className="glass-box"
      style={{
        width: '100%',
        maxWidth: 420,
        padding: '24px 20px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Switch Crear vs Unirse */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          background: '#090d15',
          padding: 3,
          borderRadius: 10,
          border: '1px solid rgba(255, 255, 255, 0.05)',
          marginBottom: 20,
        }}
      >
        <button
          type="button"
          onClick={() => {
            setTab('create');
            setErrorMsg('');
          }}
          style={{
            padding: '9px 12px',
            borderRadius: 8,
            fontSize: '0.84rem',
            fontWeight: 600,
            background: tab === 'create' ? '#172033' : 'transparent',
            color: tab === 'create' ? '#ffffff' : '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 7,
            border: tab === 'create' ? '1px solid rgba(0, 210, 255, 0.25)' : '1px solid transparent',
            cursor: 'pointer',
          }}
        >
          <Radio size={14} color={tab === 'create' ? '#00d2ff' : '#64748b'} />
          Crear Sala
        </button>

        <button
          type="button"
          onClick={() => {
            setTab('join');
            setErrorMsg('');
          }}
          style={{
            padding: '9px 12px',
            borderRadius: 8,
            fontSize: '0.84rem',
            fontWeight: 600,
            background: tab === 'join' ? '#172033' : 'transparent',
            color: tab === 'join' ? '#ffffff' : '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 7,
            border: tab === 'join' ? '1px solid rgba(0, 210, 255, 0.25)' : '1px solid transparent',
            cursor: 'pointer',
          }}
        >
          <KeyRound size={14} color={tab === 'join' ? '#00d2ff' : '#64748b'} />
          Unirse a Room
        </button>
      </div>

      {errorMsg && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#f87171',
            padding: '8px 12px',
            borderRadius: 8,
            fontSize: '0.8rem',
            marginBottom: 14,
          }}
        >
          {errorMsg}
        </div>
      )}

      {tab === 'create' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Inicia un <strong>Room</strong> sincronizado P2P como <strong>Host</strong>. Tus amigos podrán conectarse directamente con tu código de room.
          </p>

          <button
            onClick={onCreateRoom}
            className="glow-btn"
            style={{ width: '100%', padding: '13px', fontSize: '0.92rem' }}
          >
            <Radio size={16} /> Iniciar Room (Ser Host)
          </button>
        </div>
      ) : (
        <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
              Código del Room
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="ej: wf-7x9q3k"
                value={roomIdInput}
                onChange={(e) => setRoomIdInput(e.target.value)}
                className="custom-input"
                style={{ paddingLeft: 38 }}
                autoFocus
              />
              <Lock size={15} color="var(--text-dim)" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <button
            type="submit"
            className="glow-btn"
            style={{ width: '100%', padding: '13px', fontSize: '0.92rem' }}
          >
            Entrar a la Sala <ArrowRight size={16} />
          </button>
        </form>
      )}
    </motion.div>
  );
}
