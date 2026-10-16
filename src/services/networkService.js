import { Network } from '@capacitor/network';

export const networkService = {
  // Comprobar estado de conexion actual
  async getStatus() {
    try {
      const status = await Network.getStatus();
      return status; // { connected: boolean, connectionType: 'wifi' | 'cellular' | 'none' | 'unknown' }
    } catch (e) {
      // Fallback estandar del navegador si corre en web
      return {
        connected: navigator.onLine,
        connectionType: 'unknown'
      };
    }
  },

  // Escuchar cambios de conexion (si se desconecta el wifi o datos en el telefono)
  addListener(callback) {
    let handlePromise = null;
    try {
      handlePromise = Network.addListener('networkStatusChange', (status) => {
        callback(status);
      });
    } catch (e) {
      // ignore
    }

    const onlineHandler = () => callback({ connected: true, connectionType: 'unknown' });
    const offlineHandler = () => callback({ connected: false, connectionType: 'none' });

    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);

    return {
      remove: async () => {
        window.removeEventListener('online', onlineHandler);
        window.removeEventListener('offline', offlineHandler);
        if (handlePromise) {
          try {
            const h = await handlePromise;
            if (h && typeof h.remove === 'function') {
              h.remove();
            }
          } catch (err) {
            // ignore
          }
        }
      }
    };
  }
};
