import React from 'react';
import { motion } from 'framer-motion';
import { Settings, ShieldCheck, Moon, Volume2, Info } from 'lucide-react';

export function SettingsPage() {
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
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <Settings size={20} color="#00d2ff" />
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
          Configuración
        </h3>
      </div>

      {/* Item 1: Modo Oscuro */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 14px',
          background: '#121827',
          borderRadius: 10,
          border: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Moon size={18} color="#00d2ff" />
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff' }}>Tema Ultra Dark</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Diseño de alto contraste activo</div>
          </div>
        </div>
        <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>Predeterminado</span>
      </div>

      {/* Item 2: Conexión WebRTC */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 14px',
          background: '#121827',
          borderRadius: 10,
          border: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShieldCheck size={18} color="#00d2ff" />
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff' }}>Red WebRTC Directa</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Host serverless sin base de datos de video</div>
          </div>
        </div>
        <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>Activo</span>
      </div>

      {/* Item 3: Info */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 14px',
          background: '#121827',
          borderRadius: 10,
          border: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Info size={18} color="#64748b" />
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff' }}>Versión de la App</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>WatchFriends v1.0.0 PRO APK</div>
          </div>
        </div>
        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>hdev</span>
      </div>
    </motion.div>
  );
}
