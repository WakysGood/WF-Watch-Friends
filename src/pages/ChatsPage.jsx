import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, ArrowLeft, Circle, Database, ShieldCheck, Users } from 'lucide-react';
import { privateChatService } from '../services/privateChatService';

import { authService } from '../services/firebase';

export function ChatsPage({ user }) {
  const { friendUsername } = useParams();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(user);
  const [selectedFriend, setSelectedFriend] = useState(friendUsername || null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isPeerOnline, setIsPeerOnline] = useState(false);
  const [recentThreads, setRecentThreads] = useState(() => privateChatService.getRecentConversations());
  const messagesEndRef = useRef(null);

  // Escuchar cambios del usuario en Firestore en tiempo real para mantener amigos sincronizados
  useEffect(() => {
    if (!user.uid) return;
    const unsubscribe = authService.listenToUserDoc(user.uid, (data) => {
      setUserData((prev) => ({ ...prev, ...data }));
    });
    return () => unsubscribe && unsubscribe();
  }, [user.uid]);

  // Sincronizar selectedFriend si la URL cambia a /chats/usuario
  useEffect(() => {
    if (friendUsername) {
      setSelectedFriend(friendUsername);
    }
  }, [friendUsername]);

  const myUsername = userData.displayName || userData.username || 'Yo';
  const friendsList = userData.friends || [];

  // Recargar hilos de chats recientes
  const refreshThreads = () => {
    setRecentThreads(privateChatService.getRecentConversations());
  };

  // Inicializar servidor P2P local del usuario
  useEffect(() => {
    privateChatService.init(myUsername);

    // Escuchar mensajes entrantes en tiempo real
    const unbindMsg = privateChatService.on('message', (incomingMsg) => {
      refreshThreads();
      if (selectedFriend && (incomingMsg.from === selectedFriend || incomingMsg.to === selectedFriend)) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === incomingMsg.id)) return prev;
          return [...prev, incomingMsg];
        });
      }
    });

    const unbindStatus = privateChatService.on('statusChange', ({ user: u, online }) => {
      if (selectedFriend === u) {
        setIsPeerOnline(online);
      }
    });

    return () => {
      unbindMsg();
      unbindStatus();
    };
  }, [myUsername, selectedFriend]);

  // Sincronización en tiempo real (Firestore onSnapshot + Local Cache + P2P)
  useEffect(() => {
    if (!selectedFriend || !myUsername) return;

    // 1. Cargar caché local inmediato para que no se pierdan los mensajes previos
    const cached = privateChatService.getChatHistory(selectedFriend);
    if (cached && cached.length > 0) {
      setMessages(cached);
    }
    privateChatService.recordActiveConversation(selectedFriend);
    refreshThreads();

    // 2. Conectar P2P en paralelo
    privateChatService.connectToFriend(selectedFriend, myUsername);

    // 3. Suscribirse en tiempo real a los mensajes entre ambos usuarios en Firestore
    const unsubscribeSnapshot = authService.listenPrivateMessages(myUsername, selectedFriend, (firestoreMsgs) => {
      if (firestoreMsgs && firestoreMsgs.length > 0) {
        // Fusionar con caché local sin perder ni duplicar nada
        firestoreMsgs.forEach((msg) => {
          privateChatService.saveMessageToCache(selectedFriend, msg);
        });
        setMessages(firestoreMsgs);
        refreshThreads();
      }
    });

    return () => {
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, [selectedFriend, myUsername]);

  // Auto scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedFriend) return;

    const textToSend = inputText.trim();
    setInputText('');

    // 1. Enviar y guardar en caché local + P2P
    const localMsg = privateChatService.sendMessage(selectedFriend, myUsername, textToSend);
    setMessages((prev) => {
      if (prev.some((m) => m.id === localMsg.id)) return prev;
      return [...prev, localMsg];
    });
    refreshThreads();

    // 2. Transmitir en tiempo real a Firestore para entrega garantizada instantánea
    try {
      await authService.sendPrivateMessage(myUsername, selectedFriend, textToSend);
    } catch (err) {
      console.warn('Error enviando mensaje a Firestore (se mantiene en P2P y caché):', err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="glass-box"
      style={{
        width: '100%',
        maxWidth: 420,
        height: '100%',
        maxHeight: 'calc(100vh - 170px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* VISTA 1: Lista de amigos para chatear */}
      {!selectedFriend ? (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '18px 16px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MessageSquare size={18} color="#00d2ff" />
              <span style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
                Chats Privados P2P
              </span>
            </div>

            <span
              style={{
                fontSize: '0.68rem',
                color: '#10b981',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                padding: '2px 7px',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Database size={10} /> Caché Activa
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(() => {
              // Combinar lista de amigos de Firebase y conversaciones guardadas en caché
              const chatMap = new Map();

              // 1. Agregar amigos agregados
              friendsList.forEach((friend) => {
                const name = typeof friend === 'string' ? friend : (friend.username || friend.displayName || '');
                const photo = typeof friend === 'object' ? friend.photoURL : null;
                if (name) {
                  const history = privateChatService.getChatHistory(name);
                  const lastMsg = history[history.length - 1];
                  chatMap.set(name.toLowerCase(), {
                    username: name,
                    photoURL: photo,
                    lastMessage: lastMsg ? lastMsg.text : 'Toca para chatear...',
                    timestamp: lastMsg ? lastMsg.timestamp : 0,
                    timeStr: lastMsg ? lastMsg.timeStr : '',
                    hasMessages: !!lastMsg,
                  });
                }
              });

              // 2. Agregar conversaciones previas en caché aunque no estén en la lista de amigos
              recentThreads.forEach((thread) => {
                const name = thread.username;
                if (name) {
                  const key = name.toLowerCase();
                  const history = privateChatService.getChatHistory(name);
                  const lastMsg = history[history.length - 1];
                  const existing = chatMap.get(key);
                  chatMap.set(key, {
                    username: name,
                    photoURL: existing ? existing.photoURL : null,
                    lastMessage: lastMsg ? lastMsg.text : (thread.lastMessage || 'Toca para chatear...'),
                    timestamp: lastMsg ? lastMsg.timestamp : (thread.timestamp || 0),
                    timeStr: lastMsg ? lastMsg.timeStr : (thread.timeStr || ''),
                    hasMessages: true,
                  });
                }
              });

              const allChats = Array.from(chatMap.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

              if (allChats.length === 0) {
                return (
                  <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.82rem', padding: 24 }}>
                    <Users size={34} style={{ opacity: 0.35, marginBottom: 8 }} />
                    <p>No tienes chats abiertos ni amigos agregados.</p>
                    <p style={{ fontSize: '0.74rem', marginTop: 4 }}>
                      Agrega amigos en la pestaña de <strong>Amigos</strong> para iniciar chats privados directos.
                    </p>
                  </div>
                );
              }

              return allChats.map((chat) => {
                const { username: friendName, photoURL, lastMessage, timeStr, hasMessages } = chat;

                return (
                  <div
                    key={friendName}
                    onClick={() => {
                      setSelectedFriend(friendName);
                      navigate(`/chats/${friendName}`);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: 12,
                      background: '#121827',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s, transform 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#00d2ff';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: '50%',
                          background: '#1e293b',
                          color: '#00d2ff',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          border: '1px solid rgba(0, 210, 255, 0.25)',
                        }}
                      >
                        {photoURL ? (
                          <img src={photoURL} alt={friendName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          friendName.slice(0, 2).toUpperCase()
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f1f5f9' }}>
                          {friendName}
                        </span>
                        <span
                          style={{
                            fontSize: '0.74rem',
                            color: hasMessages ? '#94a3b8' : 'var(--text-dim)',
                            maxWidth: 190,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {lastMessage}
                        </span>
                      </div>
                    </div>

                    {timeStr && (
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                        {timeStr}
                      </span>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      ) : (
        /* VISTA 2: Conversación privada con el amigo */
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Top Bar de la conversación */}
          <div
            style={{
              padding: '12px 14px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              background: '#0d1320',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={() => {
                  setSelectedFriend(null);
                  navigate('/chats');
                }}
                style={{
                  color: 'var(--text-dim)',
                  padding: 4,
                  borderRadius: 6,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <ArrowLeft size={18} />
              </button>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#fff' }}>
                  {selectedFriend}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Circle size={6} fill="#10b981" color="#10b981" /> Nodo Local P2P
                </span>
              </div>
            </div>

            <span
              style={{
                fontSize: '0.68rem',
                color: 'var(--text-dim)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <ShieldCheck size={13} color="#00d2ff" /> Cifrado Directo
            </span>
          </div>

          {/* Área de mensajes con caché */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {messages.length === 0 ? (
              <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem', padding: 20 }}>
                Inicia la conversación con <strong>{selectedFriend}</strong>.
                <div style={{ fontSize: '0.72rem', marginTop: 4, opacity: 0.7 }}>
                  Los mensajes se transmiten directamente y se guardan en la caché de sus dispositivos.
                </div>
              </div>
            ) : (
              messages.map((m) => {
                const isMe = (m.from || '').toLowerCase().trim() === (myUsername || '').toLowerCase().trim();
                return (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isMe ? 'flex-end' : 'flex-start',
                      maxWidth: '82%',
                      alignSelf: isMe ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        padding: '9px 13px',
                        borderRadius: isMe ? '14px 14px 3px 14px' : '14px 14px 14px 3px',
                        background: isMe
                          ? 'linear-gradient(135deg, #00d2ff 0%, #0070f3 100%)'
                          : '#172033',
                        color: '#ffffff',
                        fontSize: '0.86rem',
                        lineHeight: 1.35,
                        wordBreak: 'break-word',
                        boxShadow: isMe ? '0 4px 12px rgba(0, 210, 255, 0.25)' : 'none',
                      }}
                    >
                      {m.text}
                    </div>
                    <span style={{ fontSize: '0.66rem', color: 'var(--text-dim)', marginTop: 2, padding: '0 4px' }}>
                      {m.timeStr}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Formulario de envío */}
          <form
            onSubmit={handleSend}
            style={{
              padding: '10px 12px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              background: '#0a0e17',
              display: 'flex',
              gap: 8,
            }}
          >
            <input
              type="text"
              placeholder="Escribe un mensaje privado..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="custom-input"
              style={{ fontSize: '0.84rem', padding: '9px 12px', height: 38 }}
              autoFocus
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="glow-btn"
              style={{ width: 38, height: 38, borderRadius: '50%', padding: 0 }}
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </motion.div>
  );
}
