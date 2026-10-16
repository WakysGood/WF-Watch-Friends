import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GiphyPickerModal } from './GiphyPickerModal';
import { authService } from '../services/firebase';
import { 
  Tv, 
  Users, 
  MessageSquare, 
  User, 
  Radio, 
  KeyRound, 
  ArrowRight, 
  LogOut, 
  Trash2, 
  UserPlus, 
  Lock, 
  Film,
  Sparkles,
  Shield,
  Circle
} from 'lucide-react';

export function LobbyDashboard({ 
  user, 
  onCreateRoom, 
  onJoinRoom, 
  onLogout,
  defaultRoomId = '' 
}) {
  const [activeNav, setActiveNav] = useState('lobby'); // 'lobby' | 'friends' | 'chats' | 'profile'
  const [userPhoto, setUserPhoto] = useState(user.photoURL || '');
  const [isGiphyOpen, setIsGiphyOpen] = useState(false);
  const [roomIdInput, setRoomIdInput] = useState(defaultRoomId);
  const [roomActionTab, setRoomActionTab] = useState(defaultRoomId ? 'join' : 'create');
  const [friendsList, setFriendsList] = useState(user.friends || []);
  const [newFriendName, setNewFriendName] = useState('');
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleUpdateAvatar = async (newGifUrl) => {
    setUserPhoto(newGifUrl);
    await authService.updateUserData(user.uid, { photoURL: newGifUrl });
  };

  const handleAddFriend = async (e) => {
    e.preventDefault();
    const trimmed = newFriendName.trim();
    if (!trimmed) return;
    if (friendsList.includes(trimmed)) {
      setErrorMsg('Ese amigo ya está en tu lista');
      return;
    }

    await authService.addFriend(user.uid, trimmed);
    setFriendsList((prev) => [...prev, trimmed]);
    setNewFriendName('');
    setIsAddingFriend(false);
    setErrorMsg('');
  };

  const handleRemoveFriend = async (name) => {
    await authService.removeFriend(user.uid, name);
    setFriendsList((prev) => prev.filter((f) => f !== name));
  };

  const handleCreate = () => {
    onCreateRoom({
      name: user.displayName,
      avatar: userPhoto || user.displayName.slice(0, 2).toUpperCase(),
      color: '#00d2ff',
    });
  };

  const handleJoin = (e) => {
    e.preventDefault();
    const trimmed = roomIdInput.trim();
    if (!trimmed) {
      setErrorMsg('Por favor introduce el código de la sala');
      return;
    }
    onJoinRoom(trimmed, {
      name: user.displayName,
      avatar: userPhoto || user.displayName.slice(0, 2).toUpperCase(),
      color: '#00d2ff',
    });
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        height: '100dvh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        background: 'var(--bg-dark)',
      }}
    >
      <div className="bg-grid-ambient" />
      <div className="ambient-spotlight" />

      {/* Barra superior flotante con Glassmorphism */}
      <header className="floating-glass-top">
        <span
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.22rem',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: '#ffffff',
            textTransform: 'none',
          }}
        >
          WatchFriends
        </span>
      </header>

      {/* Main Dynamic Content Area (con padding para no chocar con las barras flotantes) */}
      <main
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '76px 16px 86px 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: activeNav === 'lobby' ? 'center' : 'flex-start',
          zIndex: 10,
          minHeight: 0,
        }}
      >
        {/* PESTAÑA 1: LOBBY */}
        {activeNav === 'lobby' && (
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
                  setRoomActionTab('create');
                  setErrorMsg('');
                }}
                style={{
                  padding: '9px 12px',
                  borderRadius: 8,
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  background: roomActionTab === 'create' ? '#172033' : 'transparent',
                  color: roomActionTab === 'create' ? '#ffffff' : 'var(--text-dim)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 7,
                  border: roomActionTab === 'create' ? '1px solid rgba(0, 210, 255, 0.25)' : '1px solid transparent',
                  cursor: 'pointer',
                }}
              >
                <Radio size={14} color={roomActionTab === 'create' ? '#00d2ff' : 'currentColor'} />
                Crear Sala
              </button>

              <button
                type="button"
                onClick={() => {
                  setRoomActionTab('join');
                  setErrorMsg('');
                }}
                style={{
                  padding: '9px 12px',
                  borderRadius: 8,
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  background: roomActionTab === 'join' ? '#172033' : 'transparent',
                  color: roomActionTab === 'join' ? '#ffffff' : 'var(--text-dim)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 7,
                  border: roomActionTab === 'join' ? '1px solid rgba(0, 210, 255, 0.25)' : '1px solid transparent',
                  cursor: 'pointer',
                }}
              >
                <KeyRound size={14} color={roomActionTab === 'join' ? '#00d2ff' : 'currentColor'} />
                Unirse a Sala
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

            {roomActionTab === 'create' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  Inicia una sala sincronizada P2P como <strong>Host</strong>. Tus amigos podrán conectarse directamente con tu código de sala.
                </p>

                <button
                  onClick={handleCreate}
                  className="glow-btn"
                  style={{ width: '100%', padding: '13px', fontSize: '0.92rem' }}
                >
                  <Radio size={16} /> Iniciar Sala (Ser Host)
                </button>
              </div>
            ) : (
              <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                    Código de Sala
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
        )}

        {/* PESTAÑA 2: AMIGOS */}
        {activeNav === 'friends' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="glass-box"
            style={{
              width: '100%',
              maxWidth: 420,
              padding: '18px 16px',
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              maxHeight: '100%',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: '0.94rem', fontWeight: 700, color: '#fff' }}>
                Mis Amigos ({friendsList.length})
              </span>
              <button
                onClick={() => setIsAddingFriend(!isAddingFriend)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  color: '#00d2ff',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  background: 'rgba(0, 210, 255, 0.1)',
                  padding: '5px 10px',
                  borderRadius: 6,
                  border: '1px solid rgba(0, 210, 255, 0.2)',
                  cursor: 'pointer',
                }}
              >
                <UserPlus size={13} /> Agregar
              </button>
            </div>

            <AnimatePresence>
              {isAddingFriend && (
                <motion.form
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  onSubmit={handleAddFriend}
                  style={{
                    padding: '10px 12px',
                    background: '#0d1320',
                    borderRadius: 8,
                    marginBottom: 12,
                    display: 'flex',
                    gap: 8,
                  }}
                >
                  <input
                    type="text"
                    placeholder="Usuario del amigo..."
                    value={newFriendName}
                    onChange={(e) => setNewFriendName(e.target.value)}
                    className="custom-input"
                    style={{ fontSize: '0.8rem', padding: '7px 10px' }}
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="glow-btn"
                    style={{ padding: '7px 12px', fontSize: '0.78rem' }}
                  >
                    Guardar
                  </button>
                </motion.form>
              )}
            </AnimatePresence>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {friendsList.length === 0 ? (
                <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.82rem', padding: 24 }}>
                  <Users size={32} style={{ opacity: 0.35, marginBottom: 8 }} />
                  <p>Aún no tienes amigos agregados.</p>
                </div>
              ) : (
                friendsList.map((fName, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: 8,
                      background: '#121827',
                      border: '1px solid rgba(255, 255, 255, 0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: '50%',
                          background: '#1e293b',
                          color: '#00d2ff',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {fName.slice(0, 2).toUpperCase()}
                      </div>
                      <span style={{ fontSize: '0.86rem', fontWeight: 600, color: '#f1f5f9' }}>
                        {fName}
                      </span>
                    </div>

                    <button
                      onClick={() => handleRemoveFriend(fName)}
                      style={{ color: 'var(--text-dim)', padding: 4, cursor: 'pointer' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {/* PESTAÑA 3: CHATS */}
        {activeNav === 'chats' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="glass-box"
            style={{
              width: '100%',
              maxWidth: 420,
              padding: '24px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              textAlign: 'center',
            }}
          >
            <MessageSquare size={38} color="#00d2ff" style={{ opacity: 0.5, marginBottom: 12 }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginBottom: 6 }}>
              Mensajes Privados
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: 280 }}>
              El chat global de cada sala se activa automáticamente al unirte a una sesión con tus amigos.
            </p>
          </motion.div>
        )}

        {/* PESTAÑA 4: PERFIL */}
        {activeNav === 'profile' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="glass-box"
            style={{
              width: '100%',
              maxWidth: 420,
              padding: '28px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            {/* Avatar GIF interactivo */}
            <div
              onClick={() => setIsGiphyOpen(true)}
              style={{
                position: 'relative',
                width: 80,
                height: 80,
                borderRadius: '50%',
                overflow: 'hidden',
                cursor: 'pointer',
                border: '3px solid #00d2ff',
                boxShadow: '0 0 20px rgba(0, 210, 255, 0.35)',
                marginBottom: 14,
              }}
              title="Cambiar GIF de Giphy"
            >
              {userPhoto ? (
                <img
                  src={userPhoto}
                  alt={user.displayName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(135deg, #00d2ff, #0066ff)',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: '1.4rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {user.displayName.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: 2 }}>
              {user.displayName}
            </h2>
            <span style={{ fontSize: '0.74rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
              <Circle size={8} fill="#10b981" color="#10b981" /> En Línea
            </span>

            <button
              onClick={() => setIsGiphyOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#121826',
                border: '1px solid rgba(0, 210, 255, 0.3)',
                color: '#00d2ff',
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                marginBottom: 24,
              }}
            >
              <Film size={14} /> Cambiar GIF de GIPHY
            </button>

            <button
              onClick={onLogout}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#f87171',
                padding: '12px',
                borderRadius: 10,
                fontSize: '0.88rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <LogOut size={16} /> Cerrar Sesión
            </button>
          </motion.div>
        )}
      </main>

      {/* Barra de navegación inferior flotante con Glassmorphism */}
      <nav className="floating-glass-bottom">
        {/* Opción 1: Lobby */}
        <button
          type="button"
          onClick={() => setActiveNav('lobby')}
          className={`nav-tab-btn ${activeNav === 'lobby' ? 'active' : ''}`}
          title="Lobby"
        >
          <Tv 
            size={22} 
            color={activeNav === 'lobby' ? '#00d2ff' : '#64748b'} 
            strokeWidth={activeNav === 'lobby' ? 2.4 : 1.8} 
          />
          {activeNav === 'lobby' && <span className="nav-tab-indicator" />}
        </button>

        {/* Opción 2: Amigos */}
        <button
          type="button"
          onClick={() => setActiveNav('friends')}
          className={`nav-tab-btn ${activeNav === 'friends' ? 'active' : ''}`}
          title="Amigos"
        >
          <Users 
            size={22} 
            color={activeNav === 'friends' ? '#00d2ff' : '#64748b'} 
            strokeWidth={activeNav === 'friends' ? 2.4 : 1.8} 
          />
          {activeNav === 'friends' && <span className="nav-tab-indicator" />}
        </button>

        {/* Opción 3: Chats */}
        <button
          type="button"
          onClick={() => setActiveNav('chats')}
          className={`nav-tab-btn ${activeNav === 'chats' ? 'active' : ''}`}
          title="Chats"
        >
          <MessageSquare 
            size={22} 
            color={activeNav === 'chats' ? '#00d2ff' : '#64748b'} 
            strokeWidth={activeNav === 'chats' ? 2.4 : 1.8} 
          />
          {activeNav === 'chats' && <span className="nav-tab-indicator" />}
        </button>

        {/* Opción 4: Perfil */}
        <button
          type="button"
          onClick={() => setActiveNav('profile')}
          className={`nav-tab-btn ${activeNav === 'profile' ? 'active' : ''}`}
          title="Perfil"
        >
          <User 
            size={22} 
            color={activeNav === 'profile' ? '#00d2ff' : '#64748b'} 
            strokeWidth={activeNav === 'profile' ? 2.4 : 1.8} 
          />
          {activeNav === 'profile' && <span className="nav-tab-indicator" />}
        </button>
      </nav>

      {/* Modal de GIPHY */}
      <GiphyPickerModal
        isOpen={isGiphyOpen}
        onClose={() => setIsGiphyOpen(false)}
        onSelectGif={handleUpdateAvatar}
      />
    </div>
  );
}
