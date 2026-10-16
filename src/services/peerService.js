import { Peer } from 'peerjs';

class PeerService {
  constructor() {
    this.peer = null;
    this.myPeerId = null;
    this.isHost = false;
    this.connections = new Map(); // For host: peerId -> DataConnection
    this.hostConnection = null;   // For guest: DataConnection to host
    this.listeners = {
      ready: [],
      error: [],
      data: [],
      connection: [],
      disconnection: [],
    };
  }

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
        } catch (err) {
          console.error(`Error in peer event ${event} listener:`, err);
        }
      });
    }
  }

  generateRoomId() {
    // Generate clean, readable 6-character room code
    const chars = '23456789abcdefghjkmnpqrstuvwxyz';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `wf-${code}`;
  }

  /**
   * Initialize Host: creates a peer with specific or generated ID
   */
  async initHost(roomId) {
    this.destroy();
    this.isHost = true;
    const targetId = roomId || this.generateRoomId();

    return new Promise((resolve, reject) => {
      try {
        this.peer = new Peer(targetId, {
          debug: 1,
        });

        this.peer.on('open', (id) => {
          this.myPeerId = id;
          this.emit('ready', { peerId: id, isHost: true, roomId: id });
          resolve(id);
        });

        this.peer.on('connection', (conn) => {
          this.setupHostIncomingConnection(conn);
        });

        this.peer.on('error', (err) => {
          console.warn('Host Peer error:', err);
          this.emit('error', err);
          // If ID is already taken, try with another random one
          if (err.type === 'unavailable-id') {
            const fallbackId = this.generateRoomId();
            this.initHost(fallbackId).then(resolve).catch(reject);
          } else {
            reject(err);
          }
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Host handles a new incoming peer connection
   */
  setupHostIncomingConnection(conn) {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn);
      this.emit('connection', { peerId: conn.peer, conn });
    });

    conn.on('data', (data) => {
      // Host receives data from a guest
      this.emit('data', { from: conn.peer, data });

      // Automatically relay broadcast-eligible messages to other peers
      if (data && data._broadcast) {
        this.broadcast(data, conn.peer);
      }
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
      this.emit('disconnection', { peerId: conn.peer });
    });

    conn.on('error', (err) => {
      console.warn(`Connection error with ${conn.peer}:`, err);
      this.connections.delete(conn.peer);
      this.emit('disconnection', { peerId: conn.peer });
    });
  }

  /**
   * Initialize Guest: connects directly to Host's room peer
   */
  async initGuest(targetHostId, userProfile) {
    this.destroy();
    this.isHost = false;

    return new Promise((resolve, reject) => {
      try {
        // Guest creates an ephemeral peer
        this.peer = new Peer({ debug: 1 });

        this.peer.on('open', (myId) => {
          this.myPeerId = myId;

          // Connect to the host
          const conn = this.peer.connect(targetHostId, {
            reliable: true,
            metadata: { user: userProfile },
          });

          this.hostConnection = conn;

          conn.on('open', () => {
            this.emit('ready', { peerId: myId, isHost: false, roomId: targetHostId });

            // Introduce self to host
            conn.send({
              type: 'USER_JOIN',
              user: {
                id: myId,
                ...userProfile,
              },
            });

            // Request initial state from host
            conn.send({
              type: 'REQUEST_INITIAL_STATE',
              guestId: myId,
            });

            resolve(myId);
          });

          conn.on('data', (data) => {
            this.emit('data', { from: 'HOST', data });
          });

          conn.on('close', () => {
            this.emit('disconnection', { peerId: targetHostId, isHost: true });
          });

          conn.on('error', (err) => {
            console.error('Guest connection to host failed:', err);
            this.emit('error', err);
            reject(err);
          });
        });

        this.peer.on('error', (err) => {
          this.emit('error', err);
          reject(err);
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Send data to all peers (if host) or to the host (if guest)
   */
  broadcast(data, excludePeerId = null) {
    if (this.isHost) {
      this.connections.forEach((conn, peerId) => {
        if (peerId !== excludePeerId && conn.open) {
          try {
            conn.send(data);
          } catch (e) {
            console.warn(`Failed to send data to peer ${peerId}:`, e);
          }
        }
      });
    } else if (this.hostConnection && this.hostConnection.open) {
      // Guest sends to host; flag _broadcast tells host to share with others
      this.hostConnection.send({ ...data, _broadcast: true });
    }
  }

  /**
   * Send targeted message to specific peer (Host only)
   */
  sendToPeer(peerId, data) {
    if (this.isHost) {
      const conn = this.connections.get(peerId);
      if (conn && conn.open) {
        conn.send(data);
      }
    }
  }

  destroy() {
    if (this.hostConnection) {
      this.hostConnection.close();
      this.hostConnection = null;
    }
    this.connections.forEach((conn) => conn.close());
    this.connections.clear();

    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.myPeerId = null;
  }
}

export const peerService = new PeerService();
