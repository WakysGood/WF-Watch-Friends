import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { App as CapApp } from '@capacitor/app';
import { peerService } from './services/peerService';
import { authService } from './services/firebase';
import { AuthView } from './components/AuthView';
import { DashboardLayout } from './layouts/DashboardLayout';
import { LobbyPage } from './pages/LobbyPage';
import { RoomPage } from './pages/RoomPage';
import { FriendsPage } from './pages/FriendsPage';
import { ChatsPage } from './pages/ChatsPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { TopBar } from './components/TopBar';
import { SyncedPlayer } from './components/SyncedPlayer';
import { ChatPanel } from './components/ChatPanel';
import { MediaSelectorModal } from './components/MediaSelectorModal';
import { RoomSettingsModal } from './components/RoomSettingsModal';
import { NetworkBanner } from './components/NetworkBanner';
import { UpdateModal } from './components/UpdateModal';
import { checkForUpdate, notifyAppReady } from './services/updateService';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [authUser, setAuthUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState('auth'); // 'auth' | 'lobby' | 'room'
  const [isHost, setIsHost] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [pendingUpdate, setPendingUpdate] = useState(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  // Verificar actualizaciones de la app al iniciar
  useEffect(() => {
    notifyAppReady();
    checkForUpdate().then((res) => {
      if (res && res.hasUpdate && res.updateInfo) {
        setPendingUpdate(res.updateInfo);
        setIsUpdateModalOpen(true);
      }
    });
  }, []);

  const handleManualCheckUpdate = async () => {
    const res = await checkForUpdate();
    if (res && res.hasUpdate && res.updateInfo) {
      setPendingUpdate(res.updateInfo);
      setIsUpdateModalOpen(true);
      return { hasUpdate: true, version: res.updateInfo.version };
    }
    return { hasUpdate: false, currentVersion: res?.currentVersion || '1.0.0' };
  };

  // Escuchar estado de Firebase Auth o LocalStorage fallback
  useEffect(() => {
    const unsubscribe = authService.onAuthChange((user) => {
      setAuthUser(user);
      setIsAuthLoading(false);
      if (user && currentScreen === 'auth') {
        setCurrentScreen('lobby');
      } else if (!user) {
        setCurrentScreen('auth');
      }
    });

    return () => unsubscribe && unsubscribe();
  }, [currentScreen]);

  // Room state
  const [currentMedia, setCurrentMedia] = useState({
    url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk', // Default cozy Lofi stream
    type: 'youtube',
    title: 'Lofi Hip Hop Radio / Chill Beats',
  });
  const [controlMode, setControlMode] = useState('host_only'); // 'host_only' | 'free_for_all'
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [floatingReactions, setFloatingReactions] = useState([]);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);

  // Sync state received from remote
  const [remoteSyncEvent, setRemoteSyncEvent] = useState(null);

  // Room Settings State (configurable by Host)
  const [roomSettings, setRoomSettings] = useState({
    maxParticipants: 10,
    allowGuestAddVideos: true,
    enableVoteSkip: true,
    voteSkipPercentage: 50,
  });
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Queue ("Videos por ver") & Skip Voting
  const [playlist, setPlaylist] = useState([]);
  const [skipVotes, setSkipVotes] = useState([]);

  // Current playback reference for host to answer REQUEST_INITIAL_STATE
  const hostPlaybackRef = useRef({
    currentTime: 0,
    isPlaying: false,
  });

  const currentMediaRef = useRef(currentMedia);
  const controlModeRef = useRef(controlMode);
  const roomSettingsRef = useRef(roomSettings);
  const playlistRef = useRef(playlist);
  const skipVotesRef = useRef(skipVotes);

  useEffect(() => {
    currentMediaRef.current = currentMedia;
  }, [currentMedia]);

  useEffect(() => {
    controlModeRef.current = controlMode;
  }, [controlMode]);

  useEffect(() => {
    roomSettingsRef.current = roomSettings;
  }, [roomSettings]);

  useEffect(() => {
    playlistRef.current = playlist;
  }, [playlist]);

  useEffect(() => {
    skipVotesRef.current = skipVotes;
  }, [skipVotes]);

  // Check URL hash for direct invite link: #room=wf-xxxx
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#room=')) {
      const code = hash.replace('#room=', '').trim();
      if (code) {
        setRoomId(code);
      }
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      peerService.destroy();
    };
  }, []);

  // Spawn a floating reaction on the video area
  const spawnReactionBubble = useCallback((emoji) => {
    const newBubble = {
      id: Math.random().toString(36).substring(2, 9),
      emoji,
      left: `${20 + Math.random() * 60}%`,
      bottom: `${20 + Math.random() * 30}px`,
    };

    setFloatingReactions((prev) => [...prev, newBubble]);
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((b) => b.id !== newBubble.id));
    }, 2200);
  }, []);

  /**
   * HOST: Create and initialize room
   */
  const handleCreateRoom = async (userProfile) => {
    try {
      setCurrentUser({ ...userProfile, isHost: true });
      setIsHost(true);

      const generatedId = await peerService.initHost();
      setRoomId(generatedId);
      window.location.hash = `#room=${generatedId}`;

      const hostParticipant = {
        id: generatedId,
        name: userProfile.name,
        color: userProfile.color,
        avatar: userProfile.avatar,
        isHost: true,
      };

      setParticipants([hostParticipant]);
      setCurrentScreen('room');

      // Setup Host listeners
      peerService.on('connection', ({ peerId }) => {
        console.log(`New peer connected: ${peerId}`);
      });

      peerService.on('data', ({ from, data }) => {
        if (!data || !data.type) return;

        switch (data.type) {
          case 'USER_JOIN': {
            // Validar límite máximo de participantes configurado por el Host
            if (participants.length >= (roomSettingsRef.current.maxParticipants || 10)) {
              peerService.sendToPeer(from, {
                type: 'ROOM_FULL_ERROR',
                message: `La sala está llena (máximo ${roomSettingsRef.current.maxParticipants} miembros).`,
              });
              return;
            }

            setParticipants((prev) => {
              const updated = prev.filter((p) => p.id !== data.user.id);
              const nextList = [...updated, { ...data.user, isHost: false }];
              // Broadcast updated participants to everyone
              peerService.broadcast({
                type: 'PARTICIPANTS_UPDATE',
                participants: nextList,
              });
              return nextList;
            });

            // Post system message
            const joinMsg = {
              id: Date.now(),
              userName: 'Sistema',
              userColor: 'var(--accent-cyan)',
              text: `${data.user.name} se unió a la sala 👋`,
              timeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
            setMessages((prev) => [...prev, joinMsg]);
            peerService.broadcast({ type: 'CHAT_MESSAGE', message: joinMsg });

            // Enviar inmediatamente el estado del video, ajustes y cola de videos al invitado
            peerService.sendToPeer(from, {
              type: 'INITIAL_STATE',
              media: currentMediaRef.current,
              controlMode: controlModeRef.current,
              playback: hostPlaybackRef.current,
              roomSettings: roomSettingsRef.current,
              playlist: playlistRef.current,
              skipVotes: skipVotesRef.current,
            });
            break;
          }

          case 'REQUEST_INITIAL_STATE': {
            // Reply with the exact current room state
            peerService.sendToPeer(from, {
              type: 'INITIAL_STATE',
              media: currentMediaRef.current,
              controlMode: controlModeRef.current,
              playback: hostPlaybackRef.current,
              roomSettings: roomSettingsRef.current,
              playlist: playlistRef.current,
              skipVotes: skipVotesRef.current,
            });
            break;
          }

          case 'ADD_TO_PLAYLIST': {
            // Si el host lo permite o es el host
            if (roomSettingsRef.current.allowGuestAddVideos || from === roomId) {
              setPlaylist((prev) => {
                const nextList = [...prev, data.item];
                peerService.broadcast({ type: 'PLAYLIST_UPDATE', playlist: nextList });
                return nextList;
              });

              const addMsg = {
                id: Date.now(),
                userName: 'Sistema',
                userColor: 'var(--accent-cyan)',
                text: `${data.item.addedBy} añadió "${data.item.title}" a la lista por ver 🎬`,
                timeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              };
              setMessages((prev) => [...prev, addMsg]);
              peerService.broadcast({ type: 'CHAT_MESSAGE', message: addMsg });
            }
            break;
          }

          case 'REMOVE_FROM_PLAYLIST': {
            setPlaylist((prev) => {
              const nextList = prev.filter((it, idx) => (it.id ? it.id !== data.id : idx !== data.id));
              peerService.broadcast({ type: 'PLAYLIST_UPDATE', playlist: nextList });
              return nextList;
            });
            break;
          }

          case 'VOTE_SKIP': {
            if (!roomSettingsRef.current.enableVoteSkip) return;

            setSkipVotes((prev) => {
              let nextVotes;
              if (prev.includes(data.userId)) {
                nextVotes = prev.filter((id) => id !== data.userId);
              } else {
                nextVotes = [...prev, data.userId];
              }
              peerService.broadcast({ type: 'SKIP_VOTES_UPDATE', skipVotes: nextVotes });

              // Evaluar si se alcanzó la mayoría de votos requerida
              const totalParts = participants.length;
              const required = Math.max(1, Math.ceil(totalParts * ((roomSettingsRef.current.voteSkipPercentage || 50) / 100)));

              if (nextVotes.length >= required) {
                // Saltar al siguiente video
                setTimeout(() => {
                  handlePlayNextVideo();
                }, 300);
              }

              return nextVotes;
            });
            break;
          }

          case 'CHAT_MESSAGE': {
            setMessages((prev) => [...prev, data.message]);
            peerService.broadcast(data, from);
            break;
          }

          case 'REACTION': {
            spawnReactionBubble(data.emoji);
            peerService.broadcast(data, from);
            break;
          }

          case 'GUEST_SYNC_ACTION': {
            // If free_for_all is allowed, host accepts guest seek/play/pause and broadcasts
            if (controlMode === 'free_for_all') {
              hostPlaybackRef.current.currentTime = data.currentTime;
              hostPlaybackRef.current.isPlaying = data.action === 'PLAY';
              setRemoteSyncEvent({
                action: data.action,
                currentTime: data.currentTime,
                isPlaying: data.action === 'PLAY',
                timestamp: Date.now(),
              });
              peerService.broadcast({
                type: 'SYNC_STATE',
                action: data.action,
                currentTime: data.currentTime,
                isPlaying: data.action === 'PLAY',
              });
            }
            break;
          }

          default:
            break;
        }
      });

      peerService.on('disconnection', ({ peerId }) => {
        setParticipants((prev) => {
          const leaving = prev.find((p) => p.id === peerId);
          const nextList = prev.filter((p) => p.id !== peerId);
          peerService.broadcast({
            type: 'PARTICIPANTS_UPDATE',
            participants: nextList,
          });

          if (leaving) {
            const leaveMsg = {
              id: Date.now(),
              userName: 'Sistema',
              userColor: 'var(--text-muted)',
              text: `${leaving.name} salió de la sala.`,
              timeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
            setMessages((m) => [...m, leaveMsg]);
            peerService.broadcast({ type: 'CHAT_MESSAGE', message: leaveMsg });
          }

          return nextList;
        });
      });
    } catch (err) {
      alert(`Error al crear la sala: ${err.message || err}`);
    }
  };

  /**
   * GUEST: Join an existing host's room
   */
  const handleJoinRoom = async (targetRoomId, userProfile) => {
    try {
      setIsHost(false);
      setRoomId(targetRoomId);

      const guestId = await peerService.initGuest(targetRoomId, userProfile);
      setCurrentUser({ ...userProfile, id: guestId, isHost: false });
      setCurrentScreen('room');

      // Setup Guest listeners
      peerService.on('data', ({ data }) => {
        if (!data || !data.type) return;

        switch (data.type) {
          case 'INITIAL_STATE': {
            if (data.media) setCurrentMedia(data.media);
            if (data.controlMode) setControlMode(data.controlMode);
            if (data.roomSettings) setRoomSettings(data.roomSettings);
            if (data.playlist) setPlaylist(data.playlist);
            if (data.skipVotes) setSkipVotes(data.skipVotes);
            if (data.playback) {
              setRemoteSyncEvent({
                action: data.playback.isPlaying ? 'PLAY' : 'PAUSE',
                currentTime: data.playback.currentTime || 0,
                isPlaying: data.playback.isPlaying,
                timestamp: Date.now(),
              });
            }
            break;
          }

          case 'ROOM_FULL_ERROR': {
            alert(data.message || 'La sala ha alcanzado el límite máximo de miembros.');
            handleLeaveRoom();
            break;
          }

          case 'PLAYLIST_UPDATE': {
            setPlaylist(data.playlist || []);
            break;
          }

          case 'SKIP_VOTES_UPDATE': {
            setSkipVotes(data.skipVotes || []);
            break;
          }

          case 'ROOM_SETTINGS_UPDATE': {
            setRoomSettings(data.settings);
            break;
          }

          case 'SYNC_STATE': {
            setRemoteSyncEvent({
              action: data.action,
              currentTime: data.currentTime,
              isPlaying: data.isPlaying,
              timestamp: Date.now(),
            });
            break;
          }

          case 'MEDIA_CHANGED': {
            setCurrentMedia(data.media);
            setRemoteSyncEvent({
              action: 'PLAY',
              currentTime: 0,
              isPlaying: true,
              timestamp: Date.now(),
            });
            break;
          }

          case 'PARTICIPANTS_UPDATE': {
            setParticipants(data.participants);
            break;
          }

          case 'CHAT_MESSAGE': {
            setMessages((prev) => [...prev, data.message]);
            break;
          }

          case 'REACTION': {
            spawnReactionBubble(data.emoji);
            break;
          }

          case 'CONTROL_MODE_CHANGED': {
            setControlMode(data.controlMode);
            break;
          }

          default:
            break;
        }
      });

      peerService.on('disconnection', () => {
        alert('El Host se ha desconectado o cerró la sala.');
        handleLeaveRoom();
      });
    } catch (err) {
      alert(`No se pudo conectar a la sala "${targetRoomId}". Verifica que el Host esté conectado.`);
    }
  };

  /**
   * Broadcast sync actions (Play, Pause, Seek)
   */
  const handleBroadcastSync = (actionObj) => {
    if (isHost) {
      hostPlaybackRef.current.currentTime = actionObj.currentTime;
      hostPlaybackRef.current.isPlaying = actionObj.type === 'PLAY';

      peerService.broadcast({
        type: 'SYNC_STATE',
        action: actionObj.type,
        currentTime: actionObj.currentTime,
        isPlaying: actionObj.type === 'PLAY',
      });
    } else if (controlMode === 'free_for_all') {
      peerService.broadcast({
        type: 'GUEST_SYNC_ACTION',
        action: actionObj.type,
        currentTime: actionObj.currentTime,
      });
    }
  };

  /**
   * Request fresh sync from host (for guests)
   */
  const handleRequestSync = () => {
    if (!isHost) {
      peerService.broadcast({
        type: 'REQUEST_INITIAL_STATE',
      });
    }
  };

  /**
   * Send a chat message
   */
  const handleSendMessage = (text) => {
    const newMsg = {
      id: Date.now(),
      userId: currentUser.id,
      userName: currentUser.name,
      userColor: currentUser.color,
      isHost,
      text,
      timeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newMsg]);

    if (isHost) {
      peerService.broadcast({ type: 'CHAT_MESSAGE', message: newMsg });
    } else {
      peerService.broadcast({ type: 'CHAT_MESSAGE', message: newMsg });
    }
  };

  /**
   * Send an emoji reaction
   */
  const handleSendReaction = (emoji) => {
    spawnReactionBubble(emoji);
    peerService.broadcast({
      type: 'REACTION',
      emoji,
      userId: currentUser.id,
    });
  };

  /**
   * Change current media (Host only)
   */
  const handleSelectMedia = (media) => {
    setCurrentMedia(media);
    setSkipVotes([]);
    hostPlaybackRef.current.currentTime = 0;
    hostPlaybackRef.current.isPlaying = true;

    peerService.broadcast({
      type: 'MEDIA_CHANGED',
      media,
    });
    peerService.broadcast({
      type: 'SKIP_VOTES_UPDATE',
      skipVotes: [],
    });
  };

  /**
   * Reproducir siguiente video de la cola (automático al terminar o por votos)
   */
  const handlePlayNextVideo = () => {
    const currentQueue = playlistRef.current;
    if (currentQueue && currentQueue.length > 0) {
      const nextMedia = currentQueue[0];
      const remainingQueue = currentQueue.slice(1);

      setPlaylist(remainingQueue);
      setSkipVotes([]);
      handleSelectMedia(nextMedia);

      peerService.broadcast({
        type: 'PLAYLIST_UPDATE',
        playlist: remainingQueue,
      });

      const nextMsg = {
        id: Date.now(),
        userName: 'Sistema',
        userColor: 'var(--accent-purple)',
        text: `Reproduciendo siguiente video: "${nextMedia.title}" 🍿`,
        timeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, nextMsg]);
      peerService.broadcast({ type: 'CHAT_MESSAGE', message: nextMsg });
    }
  };

  /**
   * Agregar video a la cola "Videos por ver"
   */
  const handleAddToPlaylist = (item) => {
    if (isHost) {
      setPlaylist((prev) => {
        const nextList = [...prev, item];
        peerService.broadcast({ type: 'PLAYLIST_UPDATE', playlist: nextList });
        return nextList;
      });

      const addMsg = {
        id: Date.now(),
        userName: 'Sistema',
        userColor: 'var(--accent-cyan)',
        text: `${item.addedBy} añadió "${item.title}" a la lista por ver 🎬`,
        timeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, addMsg]);
      peerService.broadcast({ type: 'CHAT_MESSAGE', message: addMsg });
    } else {
      // Invitado solicita agregar video al Host
      peerService.broadcast({
        type: 'ADD_TO_PLAYLIST',
        item,
      });
    }
  };

  /**
   * Eliminar video de la lista
   */
  const handleRemoveFromPlaylist = (id) => {
    if (isHost) {
      setPlaylist((prev) => {
        const nextList = prev.filter((it, idx) => (it.id ? it.id !== id : idx !== id));
        peerService.broadcast({ type: 'PLAYLIST_UPDATE', playlist: nextList });
        return nextList;
      });
    } else {
      peerService.broadcast({
        type: 'REMOVE_FROM_PLAYLIST',
        id,
      });
    }
  };

  /**
   * Reproducir inmediatamente un elemento de la lista (Host)
   */
  const handlePlayQueueItem = (item, index) => {
    if (!isHost) return;
    const remainingQueue = playlist.filter((_, idx) => idx !== index);
    setPlaylist(remainingQueue);
    peerService.broadcast({
      type: 'PLAYLIST_UPDATE',
      playlist: remainingQueue,
    });
    handleSelectMedia(item);
  };

  /**
   * Votar para saltar el video actual
   */
  const handleVoteSkip = () => {
    if (!roomSettings.enableVoteSkip) return;

    if (isHost) {
      setSkipVotes((prev) => {
        let nextVotes;
        if (prev.includes(currentUser.id)) {
          nextVotes = prev.filter((id) => id !== currentUser.id);
        } else {
          nextVotes = [...prev, currentUser.id];
        }
        peerService.broadcast({ type: 'SKIP_VOTES_UPDATE', skipVotes: nextVotes });

        const totalParts = participants.length;
        const required = Math.max(1, Math.ceil(totalParts * ((roomSettings.voteSkipPercentage || 50) / 100)));

        if (nextVotes.length >= required) {
          setTimeout(() => {
            handlePlayNextVideo();
          }, 300);
        }
        return nextVotes;
      });
    } else {
      peerService.broadcast({
        type: 'VOTE_SKIP',
        userId: currentUser.id,
      });
    }
  };

  /**
   * Actualizar configuración de la sala (Host)
   */
  const handleUpdateRoomSettings = (newSettings) => {
    if (!isHost) return;
    setRoomSettings(newSettings);
    peerService.broadcast({
      type: 'ROOM_SETTINGS_UPDATE',
      settings: newSettings,
    });

    const confMsg = {
      id: Date.now(),
      userName: 'Sistema',
      userColor: 'var(--accent-cyan)',
      text: `El Host actualizó los ajustes de la sala (Límite: ${newSettings.maxParticipants} miembros, Videos de invitados: ${newSettings.allowGuestAddVideos ? 'Activado' : 'Desactivado'}, Votos para saltar: ${newSettings.enableVoteSkip ? 'Activado' : 'Desactivado'}).`,
      timeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, confMsg]);
    peerService.broadcast({ type: 'CHAT_MESSAGE', message: confMsg });
  };

  /**
   * Toggle control mode between host-only and free-for-all
   */
  const handleToggleControlMode = () => {
    const nextMode = controlMode === 'host_only' ? 'free_for_all' : 'host_only';
    setControlMode(nextMode);
    peerService.broadcast({
      type: 'CONTROL_MODE_CHANGED',
      controlMode: nextMode,
    });
  };

  /**
   * Leave room and return to lobby
   */
  const handleLeaveRoom = () => {
    peerService.destroy();
    window.location.hash = '';
    setCurrentScreen('lobby');
    setParticipants([]);
    setMessages([]);
    setIsHost(false);
  };

  const canControl = isHost || controlMode === 'free_for_all';

  const handleLogout = async () => {
    await authService.logout();
    setAuthUser(null);
    setCurrentScreen('auth');
  };

  // ── Manejo global de botón de retroceso (Android Hardware / Gestos / Popstate) ──
  useEffect(() => {
    const handleBackAction = () => {
      // 1. Si el modal del navegador web / YouTube está abierto, cerrarlo
      if (isMediaModalOpen) {
        setIsMediaModalOpen(false);
        return true;
      }

      // 2. Si el modal de actualización está abierto, cerrarlo
      if (isUpdateModalOpen) {
        setIsUpdateModalOpen(false);
        return true;
      }

      // 3. Si el modal de configuración de sala está abierto, cerrarlo
      if (isSettingsModalOpen) {
        setIsSettingsModalOpen(false);
        return true;
      }

      // 4. Si el usuario está dentro de una sala en reproducción ('room'), salir al lobby
      if (currentScreen === 'room') {
        const confirmExit = window.confirm('¿Deseas salir de la sala de reproducción?');
        if (confirmExit) {
          handleLeaveRoom();
        }
        return true;
      }

      // 5. Si está en una sub-página (/friends, /chats, /profile, /settings), volver a /lobby
      if (location.pathname !== '/lobby' && location.pathname !== '/') {
        navigate('/lobby');
        return true;
      }

      // Si ya está en /lobby y no hay modales abiertos, permitir la acción por defecto
      return false;
    };

    // 1. Capacitor Nativo Plugin listener (cuando @capacitor/app esté disponible)
    let appListener = null;
    try {
      appListener = CapApp.addListener('backButton', ({ canGoBack }) => {
        const handled = handleBackAction();
        if (!handled && canGoBack) {
          window.history.back();
        }
      });
    } catch (_) {}

    // 2. Document 'backbutton' listener de Cordova/Capacitor
    const onBackButton = (e) => {
      const handled = handleBackAction();
      if (handled) {
        e.preventDefault && e.preventDefault();
        e.stopPropagation && e.stopPropagation();
      }
    };

    // 3. Tecla física / keydown en WebView (KEYCODE_BACK / keyCode 4 / "GoBack")
    const onKeyDown = (e) => {
      if (e.key === 'GoBack' || e.keyCode === 4) {
        const handled = handleBackAction();
        if (handled) {
          e.preventDefault && e.preventDefault();
          e.stopPropagation && e.stopPropagation();
        }
      }
    };

    document.addEventListener('backbutton', onBackButton, false);
    window.addEventListener('keydown', onKeyDown, true);

    return () => {
      appListener && appListener.remove && appListener.remove();
      document.removeEventListener('backbutton', onBackButton);
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [
    isMediaModalOpen,
    isUpdateModalOpen,
    isSettingsModalOpen,
    currentScreen,
    location.pathname,
    navigate,
  ]);

  if (isAuthLoading) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-dark)',
          color: 'var(--text-dim)',
          fontSize: '0.9rem',
        }}
      >
        Iniciando WatchFriends...
      </div>
    );
  }

  if (currentScreen === 'auth' || !authUser) {
    return (
      <>
        <AuthView
          onAuthSuccess={(user) => {
            setAuthUser(user);
            setCurrentScreen('lobby');
          }}
        />
        <UpdateModal
          isOpen={isUpdateModalOpen}
          updateInfo={pendingUpdate}
          onClose={() => setIsUpdateModalOpen(false)}
        />
      </>
    );
  }

  if (currentScreen === 'lobby') {
    return (
      <>
        <Routes>
          <Route element={<DashboardLayout />}>
            <Route
              path="/lobby"
              element={
                <LobbyPage
                  onCreateRoom={() =>
                    handleCreateRoom({
                      name: authUser.displayName,
                      avatar: authUser.photoURL || authUser.displayName.slice(0, 2).toUpperCase(),
                      color: '#00d2ff',
                    })
                  }
                  onJoinRoom={(code) =>
                    handleJoinRoom(code, {
                      name: authUser.displayName,
                      avatar: authUser.photoURL || authUser.displayName.slice(0, 2).toUpperCase(),
                      color: '#00d2ff',
                    })
                  }
                  defaultRoomId={roomId}
                />
              }
            />
            <Route path="/friends" element={<FriendsPage user={authUser} />} />
            <Route path="/chats" element={<ChatsPage user={authUser} />} />
            <Route path="/chats/:friendUsername" element={<ChatsPage user={authUser} />} />
            <Route path="/profile" element={<ProfilePage user={authUser} onLogout={handleLogout} />} />
            <Route
              path="/settings"
              element={<SettingsPage onCheckUpdate={handleManualCheckUpdate} />}
            />
            <Route path="*" element={<Navigate to="/lobby" replace />} />
          </Route>
        </Routes>
        <UpdateModal
          isOpen={isUpdateModalOpen}
          updateInfo={pendingUpdate}
          onClose={() => setIsUpdateModalOpen(false)}
        />
      </>
    );
  }

  return (
    <>
      <RoomPage
        roomId={roomId}
        isHost={isHost}
        canControl={canControl}
        onToggleControlMode={handleToggleControlMode}
        onOpenMediaModal={() => setIsMediaModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onLeaveRoom={handleLeaveRoom}
        currentMedia={currentMedia}
        onBroadcastSync={handleBroadcastSync}
        remoteSyncEvent={remoteSyncEvent}
        onRequestSync={handleRequestSync}
        onVideoEnded={handlePlayNextVideo}
        floatingReactions={floatingReactions}
        messages={messages}
        participants={participants}
        currentUser={currentUser || {}}
        onSendMessage={handleSendMessage}
        onSendReaction={handleSendReaction}
        playlist={playlist}
        onAddToPlaylist={handleAddToPlaylist}
        onRemoveFromPlaylist={handleRemoveFromPlaylist}
        onPlayQueueItem={handlePlayQueueItem}
        skipVotes={skipVotes}
        onVoteSkip={handleVoteSkip}
        enableVoteSkip={roomSettings.enableVoteSkip}
        allowGuestAddVideos={roomSettings.allowGuestAddVideos}
      />

      {/* Media Selector Modal (Buscador interno de YouTube y Google Web) */}
      <MediaSelectorModal
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        onSelectMedia={handleSelectMedia}
        onAddToPlaylist={handleAddToPlaylist}
        playlistCount={playlist.length}
      />

      {/* Room Settings Modal */}
      <RoomSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        isHost={isHost}
        settings={roomSettings}
        onUpdateSettings={handleUpdateRoomSettings}
        currentParticipantsCount={participants.length}
      />

      {/* Update Modal */}
      <UpdateModal
        isOpen={isUpdateModalOpen}
        updateInfo={pendingUpdate}
        onClose={() => setIsUpdateModalOpen(false)}
      />
    </>
  );
}
