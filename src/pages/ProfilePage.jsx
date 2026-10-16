import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Film, LogOut, Circle, ArrowLeft } from 'lucide-react';
import { GiphyPickerModal } from '../components/GiphyPickerModal';
import { authService } from '../services/firebase';

export function ProfilePage({ user, onLogout }) {
  const navigate = useNavigate();
  const [photo, setPhoto] = useState(user.photoURL || '');
  const [isGiphyOpen, setIsGiphyOpen] = useState(false);

  const handleUpdateAvatar = async (newGif) => {
    setPhoto(newGif);
    await authService.updateUserData(user.uid, { photoURL: newGif });
  };

  return (
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
      }}
    >
      {/* Botón Volver */}
      <div style={{ width: '100%', display: 'flex', alignItems: 'center', marginBottom: 10 }}>
        <button
          onClick={() => navigate('/lobby')}
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#e2e8f0',
            borderRadius: 8,
            padding: '6px 10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontSize: '0.78rem',
            fontWeight: 600,
          }}
          title="Volver al lobby"
        >
          <ArrowLeft size={16} /> Volver
        </button>
      </div>
      {/* Avatar GIF interactivo */}
      <div
        onClick={() => setIsGiphyOpen(true)}
        style={{
          position: 'relative',
          width: 86,
          height: 86,
          borderRadius: '50%',
          overflow: 'hidden',
          cursor: 'pointer',
          border: '3px solid #00d2ff',
          boxShadow: '0 0 25px rgba(0, 210, 255, 0.35)',
          marginBottom: 14,
        }}
        title="Cambiar GIF de Giphy"
      >
        {photo ? (
          <img
            src={photo}
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
              fontSize: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {user.displayName.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>

      <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', marginBottom: 3 }}>
        {user.displayName}
      </h2>

      <span style={{ fontSize: '0.74rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 18 }}>
        <Circle size={8} fill="#10b981" color="#10b981" /> Cuenta Activa
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
          padding: '9px 18px',
          borderRadius: 8,
          fontSize: '0.82rem',
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: 26,
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

      <GiphyPickerModal
        isOpen={isGiphyOpen}
        onClose={() => setIsGiphyOpen(false)}
        onSelectGif={handleUpdateAvatar}
      />
    </motion.div>
  );
}
