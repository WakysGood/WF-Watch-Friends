import React, { useState, useRef, useEffect } from 'react';
import { Send, Users, MessageSquare, Crown, Smile, Sparkles, ListVideo, Plus, ThumbsUp, Trash2, Play, SkipForward } from 'lucide-react';
import confetti from 'canvas-confetti';

const QUICK_REACTIONS = ['🔥', '😂', '❤️', '🍿', '🚀', '😱', '👏', '🎉'];

export function ChatPanel({
  messages = [],
  participants = [],
  currentUser = {},
  onSendMessage,
  onSendReaction,
  // Cola de videos por ver
  playlist = [],
  onAddToPlaylist,
  onRemoveFromPlaylist,
  onPlayQueueItem,
  // Votación para pasar video
  skipVotes = [],
  onVoteSkip,
  enableVoteSkip = true,
  allowGuestAddVideos = true,
  isHost = false,
}) {
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'queue' | 'participants'
  const [inputText, setInputText] = useState('');
  const [queueUrlInput, setQueueUrlInput] = useState('');
  const [isAddingQueue, setIsAddingQueue] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleReactionClick = (emoji) => {
    onSendReaction(emoji);
    if (emoji === '🎉' || emoji === '🚀') {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.8 },
      });
    }
  };

  const handleAddQueueSubmit = (e) => {
    e.preventDefault();
    const trimmed = queueUrlInput.trim();
    if (!trimmed) return;

    const isYT = trimmed.includes('youtube.com') || trimmed.includes('youtu.be');
    onAddToPlaylist?.({
      id: Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      url: trimmed,
      type: isYT ? 'youtube' : 'direct',
      title: isYT ? 'Video de YouTube' : 'Video Web',
      addedBy: currentUser.name || 'Usuario',
      addedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });

    setQueueUrlInput('');
    setIsAddingQueue(false);
  };

  const hasVotedSkip = skipVotes.includes(currentUser.id);
  const totalVotes = skipVotes.length;
  const requiredVotes = Math.max(1, Math.ceil(participants.length * 0.5));

  return (
    <div
      className="glass-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Tab Switcher Header */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '8px 10px',
          gap: 6,
          alignItems: 'center',
          background: 'rgba(12, 16, 26, 0.4)',
        }}
      >
        <button
          onClick={() => setActiveTab('chat')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            padding: '7px 8px',
            borderRadius: 'var(--radius-md)',
            background: activeTab === 'chat' ? 'var(--bg-tertiary)' : 'transparent',
            color: activeTab === 'chat' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'chat' ? 600 : 400,
            fontSize: '0.82rem',
            cursor: 'pointer',
          }}
        >
          <MessageSquare size={15} color={activeTab === 'chat' ? '#00d2ff' : 'currentColor'} />
          Chat
        </button>

        <button
          onClick={() => setActiveTab('queue')}
          style={{
            flex: 1.2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            padding: '7px 8px',
            borderRadius: 'var(--radius-md)',
            background: activeTab === 'queue' ? 'var(--bg-tertiary)' : 'transparent',
            color: activeTab === 'queue' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'queue' ? 600 : 400,
            fontSize: '0.82rem',
            cursor: 'pointer',
          }}
        >
          <ListVideo size={15} color={activeTab === 'queue' ? '#8b5cf6' : 'currentColor'} />
          Por ver ({playlist.length})
        </button>

        <button
          onClick={() => setActiveTab('participants')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            padding: '7px 8px',
            borderRadius: 'var(--radius-md)',
            background: activeTab === 'participants' ? 'var(--bg-tertiary)' : 'transparent',
            color: activeTab === 'participants' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'participants' ? 600 : 400,
            fontSize: '0.82rem',
            cursor: 'pointer',
          }}
        >
          <Users size={15} color={activeTab === 'participants' ? 'var(--accent-cyan)' : 'currentColor'} />
          Amigos ({participants.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'chat' ? (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          {/* Messages list */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {messages.length === 0 ? (
              <div
                style={{
                  margin: 'auto',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.85rem',
                  padding: 20,
                }}
              >
                <Sparkles size={28} style={{ color: 'var(--accent-purple)', marginBottom: 8, opacity: 0.7 }} />
                <p>¡Sé el primero en enviar un mensaje o reaccionar!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.userId === currentUser.id;
                return (
                  <div
                    key={msg.id || `${msg.timestamp}-${Math.random()}`}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isMe ? 'flex-end' : 'flex-start',
                      maxWidth: '88%',
                      alignSelf: isMe ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        marginBottom: 3,
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <span style={{ fontWeight: 600, color: msg.userColor || 'var(--text-secondary)' }}>
                        {msg.userName}
                      </span>
                      {msg.isHost && (
                        <span
                          style={{
                            background: 'rgba(139, 92, 246, 0.2)',
                            color: 'var(--accent-purple)',
                            fontSize: '0.65rem',
                            padding: '1px 5px',
                            borderRadius: 4,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            fontWeight: 600,
                          }}
                        >
                          <Crown size={10} /> HOST
                        </span>
                      )}
                      <span>{msg.timeStr}</span>
                    </div>

                    <div
                      style={{
                        padding: '8px 12px',
                        borderRadius: isMe ? '14px 14px 3px 14px' : '14px 14px 14px 3px',
                        background: isMe
                          ? 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)'
                          : 'var(--bg-tertiary)',
                        color: 'var(--text-primary)',
                        fontSize: '0.88rem',
                        lineHeight: 1.35,
                        wordBreak: 'break-word',
                        boxShadow: isMe ? '0 4px 15px rgba(124, 58, 237, 0.25)' : 'none',
                      }}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Emoji Reactions Bar */}
          <div
            style={{
              padding: '6px 10px',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              gap: 6,
              overflowX: 'auto',
              background: 'rgba(10, 13, 22, 0.6)',
            }}
          >
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReactionClick(emoji)}
                style={{
                  fontSize: '1.25rem',
                  padding: '4px 6px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'transparent',
                  transform: 'scale(1)',
                  transition: 'transform 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.25)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                title={`Reaccionar ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form
            onSubmit={handleSubmit}
            style={{
              padding: '10px 12px',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              gap: 8,
              background: 'var(--bg-secondary)',
            }}
          >
            <input
              type="text"
              placeholder="Escribe algo aquí..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              style={{
                flex: 1,
                fontSize: '0.88rem',
                padding: '8px 12px',
                borderRadius: 'var(--radius-full)',
              }}
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              style={{
                background: inputText.trim()
                  ? 'linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))'
                  : 'var(--bg-tertiary)',
                color: inputText.trim() ? '#fff' : 'var(--text-muted)',
                width: 38,
                height: 38,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: inputText.trim() ? 1 : 0.6,
                cursor: inputText.trim() ? 'pointer' : 'not-allowed',
                boxShadow: inputText.trim() ? '0 0 12px var(--accent-purple-glow)' : 'none',
              }}
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      ) : activeTab === 'queue' ? (
        /* VISTA: Videos por ver (Queue) */
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          {/* Banner de votación para saltar video */}
          {enableVoteSkip && (
            <div
              style={{
                padding: '10px 14px',
                background: 'rgba(139, 92, 246, 0.08)',
                borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <SkipForward size={14} color="#00d2ff" /> Votar para saltar video
                </span>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  Votos: <strong style={{ color: '#00d2ff' }}>{totalVotes}</strong> / {requiredVotes} requeridos
                </span>
              </div>

              <button
                onClick={onVoteSkip}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  background: hasVotedSkip ? 'rgba(0, 210, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  border: hasVotedSkip ? '1px solid #00d2ff' : '1px solid rgba(255, 255, 255, 0.1)',
                  color: hasVotedSkip ? '#00d2ff' : '#cbd5e1',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <ThumbsUp size={13} /> {hasVotedSkip ? 'Votado' : 'Votar (+1)'}
              </button>
            </div>
          )}

          {/* Formulario para agregar video a la cola */}
          {(isHost || allowGuestAddVideos) ? (
            <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
              {!isAddingQueue ? (
                <button
                  onClick={() => setIsAddingQueue(true)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: 8,
                    background: 'rgba(0, 210, 255, 0.08)',
                    border: '1px dashed rgba(0, 210, 255, 0.3)',
                    color: '#00d2ff',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <Plus size={15} /> Agregar video a la cola
                </button>
              ) : (
                <form onSubmit={handleAddQueueSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input
                    type="text"
                    placeholder="Enlace de YouTube o MP4 directo..."
                    value={queueUrlInput}
                    onChange={(e) => setQueueUrlInput(e.target.value)}
                    className="custom-input"
                    style={{ fontSize: '0.82rem', padding: '8px 10px' }}
                    autoFocus
                  />
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingQueue(false);
                        setQueueUrlInput('');
                      }}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 6,
                        background: 'transparent',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#94a3b8',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={!queueUrlInput.trim()}
                      className="glow-btn"
                      style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                    >
                      Añadir a la lista
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div style={{ padding: '8px 12px', background: 'rgba(255, 255, 255, 0.02)', fontSize: '0.72rem', color: '#64748b', textAlign: 'center' }}>
              El Host no permite que los invitados agreguen videos.
            </div>
          )}

          {/* Lista de videos por ver */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {playlist.length === 0 ? (
              <div style={{ margin: 'auto', textAlign: 'center', color: '#64748b', fontSize: '0.8rem', padding: 20 }}>
                <ListVideo size={32} style={{ opacity: 0.35, marginBottom: 8 }} />
                <p>No hay videos siguientes en la cola.</p>
                <p style={{ fontSize: '0.72rem', marginTop: 4 }}>
                  Los videos que agregues aquí se reproducirán automáticamente cuando el actual termine.
                </p>
              </div>
            ) : (
              playlist.map((item, idx) => (
                <div
                  key={item.id || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: '#121827',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, maxWidth: '75%' }}>
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        background: '#1e293b',
                        color: '#00d2ff',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {idx + 1}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.title}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        Agregado por {item.addedBy}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {isHost && (
                      <button
                        onClick={() => onPlayQueueItem?.(item, idx)}
                        style={{
                          color: '#00d2ff',
                          padding: 5,
                          borderRadius: 6,
                          background: 'rgba(0, 210, 255, 0.1)',
                          cursor: 'pointer',
                        }}
                        title="Reproducir este video ahora"
                      >
                        <Play size={13} fill="#00d2ff" />
                      </button>
                    )}

                    {(isHost || item.addedBy === currentUser.name) && (
                      <button
                        onClick={() => onRemoveFromPlaylist?.(item.id || idx)}
                        style={{
                          color: '#ef4444',
                          padding: 5,
                          borderRadius: 6,
                          background: 'rgba(239, 68, 68, 0.1)',
                          cursor: 'pointer',
                        }}
                        title="Eliminar de la cola"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* Participants list */
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
            Conectados ({participants.length})
          </div>

          {participants.map((user) => (
            <div
              key={user.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-tertiary)',
                border: user.isHost ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    backgroundColor: user.color || 'var(--accent-purple)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    color: '#fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                  }}
                >
                  {user.avatar || (user.name ? user.name.slice(0, 2).toUpperCase() : 'WF')}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.88rem', fontWeight: 600 }}>
                    <span>{user.name}</span>
                    {user.id === currentUser.id && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(Tú)</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-green)' }} />
                    En línea
                  </div>
                </div>
              </div>

              {user.isHost && (
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--accent-purple)',
                    background: 'rgba(139, 92, 246, 0.15)',
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-full)',
                  }}
                >
                  <Crown size={12} /> Host
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
