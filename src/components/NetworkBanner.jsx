import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw } from 'lucide-react';
import { networkService } from '../services/networkService';

export function NetworkBanner() {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    // Comprobar estado inicial
    networkService.getStatus().then((status) => {
      setIsConnected(status.connected);
    });

    // Escuchar cambios de red en el móvil
    const listener = networkService.addListener((status) => {
      setIsConnected(status.connected);
    });

    return () => {
      if (listener && typeof listener.remove === 'function') {
        listener.remove();
      }
    };
  }, []);

  const handleRetry = async () => {
    const status = await networkService.getStatus();
    setIsConnected(status.connected);
  };

  return (
    <AnimatePresence>
      {!isConnected && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          style={{
            position: 'fixed',
            top: 14,
            left: 16,
            right: 16,
            zIndex: 9999,
            background: 'rgba(239, 68, 68, 0.9)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: 14,
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
            color: '#fff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <WifiOff size={18} color="#fff" />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 700 }}>Sin conexión a Internet</span>
              <span style={{ fontSize: '0.72rem', opacity: 0.9 }}>
                Se requiere conexión para sincronizar videos y amigos
              </span>
            </div>
          </div>

          <button
            onClick={handleRetry}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              color: '#fff',
              padding: '6px 10px',
              borderRadius: 8,
              fontSize: '0.74rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={12} /> Reintentar
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
