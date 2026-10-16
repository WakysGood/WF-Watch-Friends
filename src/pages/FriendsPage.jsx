import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, UserPlus, Trash2, Check, X, Clock, UserCheck, MessageSquare } from 'lucide-react';
import { authService } from '../services/firebase';
import { AddFriendModal } from '../components/AddFriendModal';

export function FriendsPage({ user }) {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(user);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('friends'); // 'friends' | 'requests'

  // Escuchar en tiempo real los cambios del usuario en Firestore (amigos y solicitudes aceptadas/enviadas)
  useEffect(() => {
    if (!user.uid) return;
    const unsubscribe = authService.listenToUserDoc(user.uid, (data) => {
      setUserData((prev) => ({ ...prev, ...data }));
    });
    return () => unsubscribe && unsubscribe();
  }, [user.uid]);

  const friends = userData.friends || [];
  const incomingRequests = userData.incomingRequests || [];
  const sentRequests = userData.sentRequests || [];

  const handleAccept = async (reqUser) => {
    await authService.acceptFriendRequest(user, reqUser);
  };

  const handleReject = async (reqUser) => {
    await authService.rejectFriendRequest(user, reqUser);
  };

  const handleRemoveFriend = async (friend) => {
    await authService.removeFriend(user.uid, friend);
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
        padding: '20px 18px',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        maxHeight: '100%',
      }}
    >
      {/* Header con botón para buscar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>
          Comunidad y Amigos
        </span>

        <button
          onClick={() => setIsModalOpen(true)}
          className="glow-btn"
          style={{
            padding: '7px 14px',
            fontSize: '0.8rem',
            borderRadius: 8,
          }}
        >
          <UserPlus size={14} /> Buscar Usuario
        </button>
      </div>

      {/* Tabs: Amigos vs Solicitudes Pendientes */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          background: '#090d15',
          padding: 3,
          borderRadius: 10,
          border: '1px solid rgba(255, 255, 255, 0.05)',
          marginBottom: 16,
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('friends')}
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            fontSize: '0.82rem',
            fontWeight: 600,
            background: activeTab === 'friends' ? '#172033' : 'transparent',
            color: activeTab === 'friends' ? '#00d2ff' : '#64748b',
            border: activeTab === 'friends' ? '1px solid rgba(0, 210, 255, 0.25)' : '1px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <Users size={14} /> Amigos ({friends.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('requests')}
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            fontSize: '0.82rem',
            fontWeight: 600,
            background: activeTab === 'requests' ? '#172033' : 'transparent',
            color: activeTab === 'requests' ? '#00d2ff' : '#64748b',
            border: activeTab === 'requests' ? '1px solid rgba(0, 210, 255, 0.25)' : '1px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <Clock size={14} /> Solicitudes ({incomingRequests.length + sentRequests.length})
        </button>
      </div>

      {/* TAB 1: LISTA DE AMIGOS ACEPTADOS */}
      {activeTab === 'friends' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {friends.length === 0 ? (
            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.82rem', padding: 24 }}>
              <Users size={34} style={{ opacity: 0.35, marginBottom: 8 }} />
              <p>Aún no tienes amigos en tu lista.</p>
              <p style={{ fontSize: '0.74rem', marginTop: 4 }}>Usa el botón "Buscar Usuario" para enviar una solicitud.</p>
            </div>
          ) : (
            friends.map((friend, i) => {
              const name = typeof friend === 'string' ? friend : friend.username;
              const photo = typeof friend === 'object' ? friend.photoURL : null;

              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: '#121827',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        overflow: 'hidden',
                        background: '#1e293b',
                        color: '#00d2ff',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid rgba(0, 210, 255, 0.3)',
                      }}
                    >
                      {photo ? (
                        <img src={photo} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        name.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f1f5f9' }}>
                      {name}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      onClick={() => navigate(`/chats/${name}`)}
                      style={{
                        color: '#00d2ff',
                        padding: '6px 10px',
                        cursor: 'pointer',
                        background: 'rgba(0, 210, 255, 0.1)',
                        border: '1px solid rgba(0, 210, 255, 0.25)',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        transition: 'all 0.2s ease',
                      }}
                      title={`Enviar mensaje a ${name}`}
                    >
                      <MessageSquare size={13} />
                      <span>Chat</span>
                    </button>

                    <button
                      onClick={() => handleRemoveFriend(friend)}
                      style={{
                        color: '#64748b',
                        padding: 6,
                        cursor: 'pointer',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title="Eliminar amigo"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: SOLICITUDES ENTRANTES Y ENVIADAS */}
      {activeTab === 'requests' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Solicitudes que te enviaron a ti (Para Aceptar) */}
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#00d2ff', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.04em' }}>
              Solicitudes Recibidas ({incomingRequests.length})
            </div>

            {incomingRequests.length === 0 ? (
              <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', padding: '6px 0' }}>
                No tienes solicitudes pendientes por responder.
              </div>
            ) : (
              incomingRequests.map((req, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: '#141c2e',
                    border: '1px solid rgba(0, 210, 255, 0.25)',
                    marginBottom: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: '50%',
                        overflow: 'hidden',
                        background: '#1e293b',
                        color: '#00d2ff',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {req.photoURL ? (
                        <img src={req.photoURL} alt={req.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        req.username?.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#fff' }}>
                      {req.username}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => handleAccept(req)}
                      style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#fff',
                        border: 'none',
                        padding: '6px 10px',
                        borderRadius: 6,
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        cursor: 'pointer',
                      }}
                    >
                      <Check size={12} /> Aceptar
                    </button>

                    <button
                      onClick={() => handleReject(req)}
                      style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: '#f87171',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        padding: '6px 8px',
                        borderRadius: 6,
                        cursor: 'pointer',
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Solicitudes enviadas por ti (Esperando aceptación) */}
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.04em' }}>
              Solicitudes Enviadas ({sentRequests.length})
            </div>

            {sentRequests.length === 0 ? (
              <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', padding: '6px 0' }}>
                No tienes solicitudes enviadas pendientes.
              </div>
            ) : (
              sentRequests.map((req, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: '#121827',
                    border: '1px solid rgba(255, 255, 255, 0.04)',
                    marginBottom: 6,
                  }}
                >
                  <span style={{ fontSize: '0.84rem', color: '#e2e8f0', fontWeight: 600 }}>
                    {req.username}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 700 }}>
                    Esperando respuesta...
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal de Búsqueda de Usuario y Envío de Solicitud */}
      <AddFriendModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentUser={user}
        sentRequests={sentRequests}
        friendsList={friends}
      />
    </motion.div>
  );
}
