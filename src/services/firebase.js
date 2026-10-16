import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove,
  collection,
  query,
  where,
  getDocs,
  onSnapshot
} from 'firebase/firestore';

// Credenciales oficiales de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDthF6oOo9a50eGBSY6DZlJq7jP5LlJ9O0",
  authDomain: "watch-friends.firebaseapp.com",
  projectId: "watch-friends",
  storageBucket: "watch-friends.firebasestorage.app",
  messagingSenderId: "631640462044",
  appId: "1:631640462044:web:d925bcded21e40790c5a19"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

// Helper para convertir el nombre de usuario limpio a formato email interno sin que el usuario lo vea
function userToInternalEmail(username) {
  const clean = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
  return `${clean}@watchfriends.app`;
}

export const authService = {
  // Escuchar estado de sesión activo de Firebase
  onAuthChange(callback) {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const extraData = userDoc.exists() ? userDoc.data() : {};
          callback({
            uid: user.uid,
            username: extraData.username || user.displayName || 'Usuario',
            displayName: extraData.username || user.displayName || 'Usuario',
            photoURL: extraData.photoURL || user.photoURL || null,
            friends: extraData.friends || [],
          });
        } catch (e) {
          callback({
            uid: user.uid,
            username: user.displayName || 'Usuario',
            displayName: user.displayName || 'Usuario',
            photoURL: user.photoURL || null,
            friends: [],
          });
        }
      } else {
        callback(null);
      }
    });
  },

  // Registrar cuenta permanente solo con Usuario y Contraseña
  async register(username, password, photoURL = null) {
    const cleanUsername = username.trim();
    const internalEmail = userToInternalEmail(cleanUsername);

    // 1. Crear en Firebase Auth
    const cred = await createUserWithEmailAndPassword(auth, internalEmail, password);
    
    // 2. Guardar display name y avatar en Auth
    await updateProfile(cred.user, {
      displayName: cleanUsername,
      photoURL: photoURL
    });

    // 3. Guardar en Firestore permanente
    await setDoc(doc(db, 'users', cred.user.uid), {
      uid: cred.user.uid,
      username: cleanUsername,
      username_lower: cleanUsername.toLowerCase(),
      photoURL: photoURL,
      friends: [],
      incomingRequests: [],
      sentRequests: [],
      createdAt: Date.now()
    });

    return {
      uid: cred.user.uid,
      username: cleanUsername,
      displayName: cleanUsername,
      photoURL: photoURL,
      friends: []
    };
  },

  // Iniciar sesión solo con Usuario y Contraseña
  async login(username, password) {
    const cleanUsername = username.trim();
    const internalEmail = userToInternalEmail(cleanUsername);

    const cred = await signInWithEmailAndPassword(auth, internalEmail, password);
    
    // Recuperar o inicializar datos permanentes de Firestore
    const userDocRef = doc(db, 'users', cred.user.uid);
    const userDoc = await getDoc(userDocRef);
    let data = userDoc.exists() ? userDoc.data() : {};

    // Si la cuenta existía en Auth pero aún no tenía doc en Firestore, crearlo
    if (!userDoc.exists() || !data.username) {
      data = {
        uid: cred.user.uid,
        username: cleanUsername,
        username_lower: cleanUsername.toLowerCase(),
        photoURL: cred.user.photoURL || null,
        friends: data.friends || [],
        incomingRequests: data.incomingRequests || [],
        sentRequests: data.sentRequests || [],
        createdAt: Date.now()
      };
      await setDoc(userDocRef, data, { merge: true });
    }

    return {
      uid: cred.user.uid,
      username: data.username || cleanUsername,
      displayName: data.username || cleanUsername,
      photoURL: data.photoURL || cred.user.photoURL || null,
      friends: data.friends || []
    };
  },

  // Cerrar sesión
  async logout() {
    await signOut(auth);
  },

  // Actualizar avatar GIF en Firestore permanente
  async updateUserData(uid, { photoURL, username }) {
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, {
        ...(photoURL && { photoURL }),
        ...(username && { displayName: username })
      });
    }

    await updateDoc(doc(db, 'users', uid), {
      ...(photoURL && { photoURL }),
      ...(username && { username })
    });
  },

  // Escuchar en tiempo real los cambios del documento del usuario (amigos y solicitudes)
  listenToUserDoc(uid, callback) {
    return onSnapshot(doc(db, 'users', uid), (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data());
      }
    });
  },

  // Buscar un usuario por nombre (insensible a mayúsculas/minúsculas)
  async searchUser(targetUsername) {
    const clean = targetUsername.trim();
    if (!clean) return null;

    try {
      // 1. Intento por coincidencia exacta
      const qExact = query(collection(db, 'users'), where('username', '==', clean));
      const snapExact = await getDocs(qExact);
      if (!snapExact.empty) {
        const docSnap = snapExact.docs[0];
        return { uid: docSnap.id, ...docSnap.data() };
      }

      // 2. Intento por minúsculas
      const qLower = query(collection(db, 'users'), where('username_lower', '==', clean.toLowerCase()));
      const snapLower = await getDocs(qLower);
      if (!snapLower.empty) {
        const docSnap = snapLower.docs[0];
        return { uid: docSnap.id, ...docSnap.data() };
      }

      // 3. Fallback: escanear colección users para tolerar mayúsculas/minúsculas
      const allUsersSnap = await getDocs(collection(db, 'users'));
      for (const d of allUsersSnap.docs) {
        const data = d.data();
        if ((data.username || '').toLowerCase() === clean.toLowerCase()) {
          return { uid: d.id, ...data };
        }
      }

      return null;
    } catch (e) {
      console.error('Error buscando usuario en Firestore:', e);
      throw e;
    }
  },

  // Enviar solicitud de amistad
  async sendFriendRequest(currentUser, targetUser) {
    // 1. En el emisor: guardar en sentRequests
    await updateDoc(doc(db, 'users', currentUser.uid), {
      sentRequests: arrayUnion({
        uid: targetUser.uid,
        username: targetUser.username,
        photoURL: targetUser.photoURL || null
      })
    });

    // 2. En el receptor: guardar en incomingRequests
    await updateDoc(doc(db, 'users', targetUser.uid), {
      incomingRequests: arrayUnion({
        uid: currentUser.uid,
        username: currentUser.username || currentUser.displayName,
        photoURL: currentUser.photoURL || null
      })
    });
  },

  // Aceptar solicitud de amistad
  async acceptFriendRequest(currentUser, requestFromUser) {
    // 1. Añadir a lista mutua de amigos
    await updateDoc(doc(db, 'users', currentUser.uid), {
      friends: arrayUnion({
        uid: requestFromUser.uid,
        username: requestFromUser.username,
        photoURL: requestFromUser.photoURL || null
      }),
      incomingRequests: arrayRemove(requestFromUser)
    });

    // 2. Añadir en el perfil del otro usuario y limpiar sentRequests
    await updateDoc(doc(db, 'users', requestFromUser.uid), {
      friends: arrayUnion({
        uid: currentUser.uid,
        username: currentUser.username || currentUser.displayName,
        photoURL: currentUser.photoURL || null
      }),
      sentRequests: arrayRemove({
        uid: currentUser.uid,
        username: currentUser.username || currentUser.displayName,
        photoURL: currentUser.photoURL || null
      })
    });
  },

  // Rechazar solicitud de amistad
  async rejectFriendRequest(currentUser, requestFromUser) {
    await updateDoc(doc(db, 'users', currentUser.uid), {
      incomingRequests: arrayRemove(requestFromUser)
    });
  },

    // Eliminar amigo en Firestore
    async removeFriend(currentUid, friendObj) {
      await updateDoc(doc(db, 'users', currentUid), {
        friends: arrayRemove(friendObj)
      });
    },

    // Generar un ID de conversación canónico único entre dos usuarios
    getConversationId(user1, user2) {
      const u1 = (user1 || '').toLowerCase().trim();
      const u2 = (user2 || '').toLowerCase().trim();
      return [u1, u2].sort().join('_chat_');
    },

    // Enviar mensaje privado en tiempo real respaldado por Firestore y guardado en caché local
    async sendPrivateMessage(fromUser, toUser, text) {
      const convId = this.getConversationId(fromUser, toUser);
      const msgId = Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const msgObj = {
        id: msgId,
        from: fromUser,
        to: toUser,
        text: text.trim(),
        timestamp: Date.now(),
        timeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const chatDocRef = doc(db, 'private_chats', convId);
      await setDoc(chatDocRef, {
        participants: [fromUser.toLowerCase().trim(), toUser.toLowerCase().trim()],
        lastUpdated: Date.now(),
        lastMessage: text.trim(),
        messages: arrayUnion(msgObj)
      }, { merge: true });

      return msgObj;
    },

    // Escuchar mensajes privados en tiempo real entre dos usuarios
    listenPrivateMessages(user1, user2, callback) {
      const convId = this.getConversationId(user1, user2);
      const chatDocRef = doc(db, 'private_chats', convId);
      return onSnapshot(chatDocRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          callback(data.messages || []);
        } else {
          callback([]);
        }
      }, (err) => {
        console.warn('Error listening to private messages:', err);
      });
    }
  };
