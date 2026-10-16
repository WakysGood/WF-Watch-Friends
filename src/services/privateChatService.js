import { Peer } from 'peerjs';

class PrivateChatService {
  constructor() {
    this.peer = null;
    this.myPeerId = null;
    this.activeConnections = new Map(); // friendUsername -> DataConnection
    this.listeners = {
      message: [],
      statusChange: [],
      ready: []
    };
  }

  // Sanitizar nombre de usuario para generar un Peer ID determinista y único
  getPeerIdForUser(username) {
    const clean = username.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `wf_user_${clean}`;
  }

  // Inicializar el nodo P2P local del usuario
  async init(myUsername) {
    if (!myUsername) return;
    const targetPeerId = this.getPeerIdForUser(myUsername);

    if (this.peer && !this.peer.destroyed && this.myPeerId === targetPeerId) {
      return this.myPeerId;
    }

    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (e) {}
      this.peer = null;
    }

    return new Promise((resolve) => {
      this.peer = new Peer(targetPeerId, { debug: 1 });

      this.peer.on('open', (id) => {
        this.myPeerId = id;
        this.emit('ready', id);
        resolve(id);
      });

      // Recibir mensajes o llamadas entrantes de amigos
      this.peer.on('connection', (conn) => {
        const friendUser = conn.metadata?.fromUser || conn.peer;
        this.activeConnections.set(friendUser, conn);

        conn.on('data', (data) => {
          if (data && data.type === 'PRIVATE_MESSAGE') {
            this.saveMessageToCache(data.from, data);
            this.emit('message', data);
          }
        });

        conn.on('close', () => {
          this.activeConnections.delete(friendUser);
          this.emit('statusChange', { user: friendUser, online: false });
        });
      });

      this.peer.on('error', (err) => {
        // Si el id está temporalmente tomado por refresh rápido de vite
        if (err.type === 'unavailable-id') {
          console.warn('Peer ID ocupado temporalmente, reconectando...');
        } else {
          console.warn('Private Chat Peer info:', err);
        }
      });
    });
  }

  // Conectar con un amigo por P2P directo
  connectToFriend(friendUsername, myUsername) {
    if (!this.peer || this.peer.destroyed) return null;

    const friendPeerId = this.getPeerIdForUser(friendUsername);
    const existing = this.activeConnections.get(friendUsername);
    if (existing && existing.open) return existing;

    const conn = this.peer.connect(friendPeerId, {
      reliable: true,
      metadata: { fromUser: myUsername }
    });

    conn.on('open', () => {
      this.activeConnections.set(friendUsername, conn);
      this.emit('statusChange', { user: friendUsername, online: true });
    });

    conn.on('data', (data) => {
      if (data && data.type === 'PRIVATE_MESSAGE') {
        this.saveMessageToCache(data.from, data);
        this.emit('message', data);
      }
    });

    conn.on('close', () => {
      this.activeConnections.delete(friendUsername);
      this.emit('statusChange', { user: friendUsername, online: false });
    });

    return conn;
  }

  // Enviar mensaje privado a un amigo
  sendMessage(friendUsername, myUsername, text) {
    const msgObj = {
      id: Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      type: 'PRIVATE_MESSAGE',
      from: myUsername,
      to: friendUsername,
      text: text.trim(),
      timestamp: Date.now(),
      timeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Guardar en la caché local propia siempre
    this.saveMessageToCache(friendUsername, msgObj);

    // Enviar por P2P al amigo
    let conn = this.activeConnections.get(friendUsername);
    if (!conn || !conn.open) {
      conn = this.connectToFriend(friendUsername, myUsername);
    }

    if (conn) {
      if (conn.open) {
        conn.send(msgObj);
      } else {
        conn.on('open', () => {
          conn.send(msgObj);
        });
      }
    }

    return msgObj;
  }

  // Guardado permanente en caché local (LocalStorage / IndexedDB cache)
  saveMessageToCache(conversationWith, msgObj) {
    if (!conversationWith) return;
    const peerName = conversationWith.trim();
    const cacheKey = `wf_chat_cache_${peerName.toLowerCase()}`;
    const history = this.getChatHistory(peerName);
    
    // Evitar duplicados por id
    if (!history.some(m => m.id === msgObj.id)) {
      history.push(msgObj);
      localStorage.setItem(cacheKey, JSON.stringify(history));
    }

    // Registrar conversación en el índice de chats recientes
    this.recordActiveConversation(peerName, msgObj);
  }

  // Registrar conversación activa en el índice local
  recordActiveConversation(friendUsername, lastMessage = null) {
    if (!friendUsername) return;
    const name = friendUsername.trim();
    const threadsKey = 'wf_chat_recent_threads';
    try {
      const stored = localStorage.getItem(threadsKey);
      let threads = stored ? JSON.parse(stored) : [];
      
      const existingIdx = threads.findIndex(t => (t.username || t).toLowerCase() === name.toLowerCase());
      const threadData = {
        username: name,
        lastMessage: lastMessage ? lastMessage.text : 'Conversación iniciada',
        timestamp: lastMessage ? lastMessage.timestamp : Date.now(),
        timeStr: lastMessage ? lastMessage.timeStr : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      if (existingIdx >= 0) {
        threads[existingIdx] = { ...threads[existingIdx], ...threadData };
      } else {
        threads.unshift(threadData);
      }

      // Ordenar por el más reciente
      threads.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      localStorage.setItem(threadsKey, JSON.stringify(threads));
    } catch (e) {
      console.warn('Error saving recent thread:', e);
    }
  }

  // Obtener lista de hilos de chat guardados en caché
  getRecentConversations() {
    const threadsKey = 'wf_chat_recent_threads';
    try {
      const stored = localStorage.getItem(threadsKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {}

    // Fallback: escanear claves en localStorage que empiecen con wf_chat_cache_
    const discovered = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('wf_chat_cache_')) {
          const friendName = key.replace('wf_chat_cache_', '');
          const history = this.getChatHistory(friendName);
          const last = history[history.length - 1];
          discovered.push({
            username: last ? (last.from === friendName ? last.from : last.to) : friendName,
            lastMessage: last ? last.text : 'Conversación iniciada',
            timestamp: last ? last.timestamp : Date.now(),
            timeStr: last ? last.timeStr : '',
          });
        }
      }
    } catch (e) {}
    return discovered;
  }

  // Obtener historial de mensajes guardado en caché local
  getChatHistory(conversationWith) {
    if (!conversationWith) return [];
    const cacheKey = `wf_chat_cache_${conversationWith.toLowerCase()}`;
    try {
      const stored = localStorage.getItem(cacheKey);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  // Escuchar eventos
  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
    return () => {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    };
  }

  emit(event, ...args) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => {
        try {
          cb(...args);
        } catch (e) {
          console.error(e);
        }
      });
    }
  }

  destroy() {
    this.activeConnections.forEach(c => c.close());
    this.activeConnections.clear();
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.myPeerId = null;
  }
}

export const privateChatService = new PrivateChatService();
