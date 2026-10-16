import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, UserPlus, Check, X, Loader2, User } from 'lucide-react';
import { authService } from '../services/firebase';

export function AddFriendModal({ isOpen, onClose, currentUser, sentRequests = [], friendsList = [] }) {
  const [queryName, setQueryName] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [foundUser, setFoundUser] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSearch = async (e) => {
    e.preventDefault();
    const clean = queryName.trim();
    if (!clean) return;

    if (clean.toLowerCase() === (currentUser.username || currentUser.displayName || '').toLowerCase()) {
      setErrorMsg('No puedes buscarte a ti mismo.');
      setFoundUser(null);
      setHasSearched(true);
      return;
    }

    setIsSearching(true);
    setErrorMsg('');
    setRequestSent(false);

    try {
      const user = await authService.searchUser(clean);
      setFoundUser(user);
      setHasSearched(true);
    } catch (err) {
      if (err.code === 'permission-denied') {
        setErrorMsg('Faltan permisos en Firestore: habilita lectura en las Reglas de Firebase.');
      } else {
        setErrorMsg(err.message || 'Error al buscar usuario en el servidor.');
      }
      setHasSearched(true);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFriend = async () => {
    if (!foundUser) return;
    setIsSending(true);
    setErrorMsg('');

    try {
      await authService.addFriendDirectly(currentUser, foundUser);
      setRequestSent(true);
    } catch (err) {
      setErrorMsg('Error al agregar amigo: ' + (err.message || ''));
    } finally {
      setIsSending(false);
    }
  };

  const isAlreadyFriend = friendsList.some(
    (f) => (typeof f === 'string' ? f : f.username)?.toLowerCase() === foundUser?.username?.toLowerCase()
  );

  const isAlreadyRequested = sentRequests.some(
    (r) => (typeof r === 'string' ? r : r.username)?.toLowerCase() === foundUser?.username?.toLowerCase()
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(16px)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        className="glass-box"
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#0e1422',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>
            Buscar y Agregar Amigo
          </span>
          <button
            onClick={onClose}
            style={{ color: 'var(--text-dim)', padding: 4, cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Input Buscador */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              placeholder="Escribe el usuario exacto..."
              value={queryName}
              onChange={(e) => {
                setQueryName(e.target.value);
                setHasSearched(false);
                setErrorMsg('');
              }}
              className="custom-input"
              style={{ paddingLeft: 36, height: 42 }}
              autoFocus
            />
            <Search
              size={16}
              color="var(--text-dim)"
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
            />
          </div>

          <button
            type="submit"
            disabled={isSearching}
            className="glow-btn"
            style={{ padding: '0 16px', height: 42, fontSize: '0.85rem' }}
          >
            {isSearching ? <Loader2 size={16} className="pulse-indicator" /> : 'Buscar'}
          </button>
        </form>

        {errorMsg && (
          <div style={{ color: '#f87171', background: 'rgba(239, 68, 68, 0.1)', padding: '8px 12px', borderRadius: 8, fontSize: '0.8rem' }}>
            {errorMsg}
          </div>
        )}

        {/* Tarjeta del Perfil Encontrado */}
        {hasSearched && !errorMsg && (
          <div style={{ marginTop: 4 }}>
            {!foundUser ? (
              <div style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--text-dim)', fontSize: '0.86rem' }}>
                No se encontró ningún usuario con el nombre "<strong>{queryName}</strong>".
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  background: '#141c2e',
                  border: '1px solid rgba(0, 210, 255, 0.25)',
                  borderRadius: 12,
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                }}
              >
                {/* Avatar y Datos del Perfil */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      overflow: 'hidden',
                      border: '2px solid #00d2ff',
                      boxShadow: '0 0 12px rgba(0, 210, 255, 0.35)',
                      flexShrink: 0,
                    }}
                  >
                    {foundUser.photoURL ? (
                      <img
                        src={foundUser.photoURL}
                        alt={foundUser.username}
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
                          fontSize: '1rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {foundUser.username?.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.94rem', fontWeight: 800, color: '#fff' }}>
                      {foundUser.username}
                    </span>
                    <span style={{ fontSize: '0.74rem', color: '#10b981' }}>
                      Usuario Registrado
                    </span>
                  </div>
                </div>

                {/* Botón de acción */}
                <div>
                  {isAlreadyFriend || requestSent ? (
                    <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Check size={15} /> Ya son amigos
                    </span>
                  ) : (
                    <button
                      onClick={handleAddFriend}
                      disabled={isSending}
                      className="glow-btn"
                      style={{ padding: '8px 14px', fontSize: '0.8rem' }}
                    >
                      <UserPlus size={14} /> {isSending ? 'Agregando...' : 'Agregar Amigo'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
