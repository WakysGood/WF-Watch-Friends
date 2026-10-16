import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from './Logo';
import { GiphyPickerModal } from './GiphyPickerModal';
import { authService } from '../services/firebase';
import { 
  User, 
  Lock, 
  ArrowRight, 
  ShieldCheck, 
  Camera, 
  Sparkles, 
  AlertCircle,
  CheckCircle2,
  Film,
  Image as ImageIcon
} from 'lucide-react';

export function AuthView({ onAuthSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHIzb3k4M2k4d2h4ZmtwdmVjcTNtY3IycDVvdHJmNjY2aDJ6bW1hbiZlcD12MV9naWZzX3RyZW5kaW5nJmN0PWc/3o7TKSjRrfIPjeiVyM/giphy.gif');
  const [isGiphyOpen, setIsGiphyOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanUser = username.trim();
    if (!cleanUser || !password) {
      setErrorMsg('Por favor completa tu usuario y contraseña');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsLoading(true);

    try {
      let user;

      if (isRegister) {
        user = await authService.register(cleanUser, password, selectedAvatar);
      } else {
        user = await authService.login(cleanUser, password);
      }

      onAuthSuccess(user);
    } catch (err) {
      const code = err.code || '';
      if (code.includes('user-not-found') || code.includes('wrong-password') || code.includes('invalid-credential')) {
        setErrorMsg('Usuario o contraseña incorrectos.');
      } else if (code.includes('email-already-in-use')) {
        setErrorMsg('Este nombre de usuario ya está registrado.');
      } else if (code.includes('weak-password')) {
        setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      } else {
        setErrorMsg(err.message || 'Error durante la autenticación.');
      }
    } finally {
      setIsLoading(false);
    }
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

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-box"
        style={{
          width: '100%',
          maxWidth: 420,
          padding: '32px 28px',
          zIndex: 10,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 22 }}>
          <Logo size={42} showText={false} />
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.4rem',
              fontWeight: 800,
              color: '#ffffff',
              marginTop: 12,
              letterSpacing: '-0.02em',
            }}
          >
            {isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
            {isRegister
              ? 'Regístrate para guardar tu perfil y tus amigos'
              : 'Accede a tu cuenta de WatchFriends'}
          </p>
        </div>

        {/* Tab switch */}
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
              setIsRegister(false);
              setErrorMsg('');
            }}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              fontSize: '0.82rem',
              fontWeight: 600,
              background: !isRegister ? '#172033' : 'transparent',
              color: !isRegister ? '#ffffff' : 'var(--text-dim)',
              border: !isRegister ? '1px solid rgba(0, 210, 255, 0.25)' : '1px solid transparent',
              transition: 'all 0.2s',
            }}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setErrorMsg('');
            }}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              fontSize: '0.82rem',
              fontWeight: 600,
              background: isRegister ? '#172033' : 'transparent',
              color: isRegister ? '#ffffff' : 'var(--text-dim)',
              border: isRegister ? '1px solid rgba(0, 210, 255, 0.25)' : '1px solid transparent',
              transition: 'all 0.2s',
            }}
          >
            Registrarse
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {isRegister && (
            <>
              {/* Avatar Selector with GIPHY */}
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>
                  Avatar / Foto de Perfil (GIPHY GIF)
                </label>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div
                    onClick={() => setIsGiphyOpen(true)}
                    style={{
                      position: 'relative',
                      width: 58,
                      height: 58,
                      borderRadius: '50%',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: '2px solid #00d2ff',
                      boxShadow: '0 0 15px rgba(0, 210, 255, 0.35)',
                      flexShrink: 0,
                    }}
                    title="Haz clic para cambiar tu GIF de GIPHY"
                  >
                    <img
                      src={selectedAvatar}
                      alt="Avatar GIF"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0,
                        transition: 'opacity 0.2s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                    >
                      <Film size={18} color="#fff" />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                    <button
                      type="button"
                      onClick={() => setIsGiphyOpen(true)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        background: '#121826',
                        border: '1px solid rgba(0, 210, 255, 0.3)',
                        color: '#00d2ff',
                        padding: '8px 14px',
                        borderRadius: 8,
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <Film size={14} /> Seleccionar GIF de Giphy
                    </button>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                      Elige cualquier GIF animado de GIPHY para tu perfil
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Username (para login y registro) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
              Usuario
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Tu nombre de usuario..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="custom-input"
                style={{ paddingLeft: 38 }}
                required
                autoFocus
              />
              <User size={15} color="var(--text-dim)" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
              Contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                placeholder="Mínimo 6 caracteres..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="custom-input"
                style={{ paddingLeft: 38 }}
                required
              />
              <Lock size={15} color="var(--text-dim)" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#f87171',
                padding: '9px 12px',
                borderRadius: 8,
                fontSize: '0.8rem',
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="glow-btn"
            style={{ padding: '12px 18px', fontSize: '0.9rem', marginTop: 4 }}
          >
            {isLoading ? 'Verificando...' : isRegister ? 'Registrarse e Ingresar' : 'Iniciar Sesión'}
            <ArrowRight size={16} />
          </button>
        </form>
      </motion.div>

      {/* Footer credits */}
      <div
        style={{
          marginTop: 18,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: '0.75rem',
          color: 'var(--text-dim)',
        }}
      >
        <span>Desarrollado por</span>
        <span
          style={{
            color: '#00d2ff',
            fontWeight: 700,
            fontFamily: 'monospace',
            background: 'rgba(0, 210, 255, 0.08)',
            padding: '2px 8px',
            borderRadius: 6,
            border: '1px solid rgba(0, 210, 255, 0.2)',
          }}
        >
          hdev
        </span>
      </div>

      {/* GIPHY GIF Picker Modal */}
      <GiphyPickerModal
        isOpen={isGiphyOpen}
        onClose={() => setIsGiphyOpen(false)}
        onSelectGif={(gifUrl) => setSelectedAvatar(gifUrl)}
      />
    </div>
  );
}
