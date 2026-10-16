import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from './Logo';
import { 
  User, 
  KeyRound, 
  ShieldCheck, 
  ArrowRight, 
  Radio, 
  Lock, 
  Globe2, 
  Terminal, 
  Layers,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export function Lobby({ onCreateRoom, onJoinRoom, defaultRoomId = '' }) {
  const [userName, setUserName] = useState(() => localStorage.getItem('wf_username') || '');
  const [roomIdInput, setRoomIdInput] = useState(defaultRoomId);
  const [mode, setMode] = useState(defaultRoomId ? 'join' : 'host'); // 'host' | 'join'
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (defaultRoomId) {
      setRoomIdInput(defaultRoomId);
      setMode('join');
    }
  }, [defaultRoomId]);

  const handleAction = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedUser = userName.trim();
    if (!trimmedUser) {
      setErrorMsg('Introduce un nombre de usuario o ID');
      return;
    }

    if (mode === 'join' && !roomIdInput.trim()) {
      setErrorMsg('Introduce el código de acceso a la sala');
      return;
    }

    setIsSubmitting(true);
    localStorage.setItem('wf_username', trimmedUser);

    const userProfile = {
      name: trimmedUser,
      avatar: trimmedUser.slice(0, 2).toUpperCase(),
      color: '#00d2ff',
    };

    setTimeout(() => {
      if (mode === 'host') {
        onCreateRoom(userProfile);
      } else {
        onJoinRoom(roomIdInput.trim(), userProfile);
      }
      setIsSubmitting(false);
    }, 400);
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div className="bg-grid-ambient" />
      <div className="ambient-spotlight" />

      {/* Main Auth Card Container */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="glass-box"
        style={{
          width: '100%',
          maxWidth: 440,
          padding: '36px 32px',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Header / Brand */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
          <Logo size={46} showText={false} />
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.45rem',
              fontWeight: 800,
              color: '#ffffff',
              marginTop: 14,
              letterSpacing: '-0.02em',
            }}
          >
            WatchFriends
          </h1>
          <p
            style={{
              fontSize: '0.84rem',
              color: 'var(--text-muted)',
              marginTop: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <ShieldCheck size={14} color="#00d2ff" /> Plataforma de Transmisión P2P Directa
          </p>
        </div>

        {/* Tab Selector: Host session vs Connect session */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            background: '#090d15',
            padding: 4,
            borderRadius: 12,
            border: '1px solid rgba(255, 255, 255, 0.05)',
            marginBottom: 24,
            position: 'relative',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMode('host');
              setErrorMsg('');
            }}
            style={{
              padding: '9px 12px',
              borderRadius: 8,
              fontSize: '0.84rem',
              fontWeight: 600,
              background: mode === 'host' ? '#172033' : 'transparent',
              color: mode === 'host' ? '#ffffff' : 'var(--text-dim)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.2s',
              border: mode === 'host' ? '1px solid rgba(0, 210, 255, 0.2)' : '1px solid transparent',
            }}
          >
            <Radio size={14} color={mode === 'host' ? '#00d2ff' : 'currentColor'} />
            Crear Sesión
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('join');
              setErrorMsg('');
            }}
            style={{
              padding: '9px 12px',
              borderRadius: 8,
              fontSize: '0.84rem',
              fontWeight: 600,
              background: mode === 'join' ? '#172033' : 'transparent',
              color: mode === 'join' ? '#ffffff' : 'var(--text-dim)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.2s',
              border: mode === 'join' ? '1px solid rgba(0, 210, 255, 0.2)' : '1px solid transparent',
            }}
          >
            <KeyRound size={14} color={mode === 'join' ? '#00d2ff' : 'currentColor'} />
            Unirse a Sesión
          </button>
        </div>

        {/* Auth / Login Form */}
        <form onSubmit={handleAction} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Username Input */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.78rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Nombre de Usuario
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Escribe tu usuario..."
                value={userName}
                onChange={(e) => {
                  setUserName(e.target.value);
                  setErrorMsg('');
                }}
                className="custom-input"
                style={{ paddingLeft: 42 }}
                autoFocus
                maxLength={24}
              />
              <User
                size={16}
                color="var(--text-dim)"
                style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
              />
            </div>
          </div>

          {/* Room ID Input (Only in Join Mode) */}
          <AnimatePresence>
            {mode === 'join' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    marginBottom: 8,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Identificador de Sala
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="ej: wf-7x9q3k"
                    value={roomIdInput}
                    onChange={(e) => {
                      setRoomIdInput(e.target.value);
                      setErrorMsg('');
                    }}
                    className="custom-input"
                    style={{ paddingLeft: 42 }}
                  />
                  <Lock
                    size={16}
                    color="var(--text-dim)"
                    style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Status / Error Banner */}
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#f87171',
                padding: '9px 12px',
                borderRadius: 8,
                fontSize: '0.82rem',
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </motion.div>
          )}

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="glow-btn"
            style={{
              padding: '13px 20px',
              fontSize: '0.92rem',
              marginTop: 4,
            }}
          >
            {isSubmitting ? (
              'Estableciendo enlace...'
            ) : mode === 'host' ? (
              <>
                Iniciar como Host <ArrowRight size={16} />
              </>
            ) : (
              <>
                Ingresar a Sala <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Technical Specs Footer inside card */}
        <div
          style={{
            marginTop: 24,
            paddingTop: 18,
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.73rem',
            color: 'var(--text-dim)',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Layers size={12} color="#00d2ff" /> WebRTC DataMesh
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Globe2 size={12} color="#10b981" /> Sin Base de Datos
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Terminal size={12} /> Host Serverless
          </span>
        </div>
      </motion.div>

      {/* Required Developer Credit */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        style={{
          marginTop: 20,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: '0.78rem',
          color: 'var(--text-dim)',
          letterSpacing: '0.04em',
        }}
      >
        <span>Desarrollado por</span>
        <span
          style={{
            color: '#00d2ff',
            fontWeight: 700,
            letterSpacing: '0.06em',
            fontFamily: 'monospace',
            background: 'rgba(0, 210, 255, 0.08)',
            padding: '2px 8px',
            borderRadius: 6,
            border: '1px solid rgba(0, 210, 255, 0.2)',
          }}
        >
          hdev
        </span>
      </motion.div>
    </div>
  );
}
