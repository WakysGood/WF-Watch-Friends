import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  ShieldCheck,
  Moon,
  Info,
  RefreshCw,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { CURRENT_APP_VERSION } from '../services/updateService';

export function SettingsPage({ onCheckUpdate }) {
  const [checking, setChecking] = useState(false);
  const [checkStatus, setCheckStatus] = useState(null);

  const handleManualCheck = async () => {
    if (!onCheckUpdate || checking) return;
    setChecking(true);
    setCheckStatus(null);
    try {
      const res = await onCheckUpdate();
      if (res && res.hasUpdate) {
        setCheckStatus({ type: 'update', msg: `¡Nueva versión disponible!` });
      } else {
        setCheckStatus({
          type: 'latest',
          msg: `Ya tienes la versión más reciente (v${CURRENT_APP_VERSION})`,
        });
      }
    } catch (_) {
      setCheckStatus({
        type: 'error',
        msg: 'No se pudo comprobar en este momento.',
      });
    } finally {
      setChecking(false);
    }
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

      {/* Item 3: Actualizaciones de la App (OTA y APK) */}
      <div
        style={{
          padding: '14px',
          background: '#121827',
          borderRadius: 10,
          border: '1px solid rgba(0, 210, 255, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={18} color="#00d2ff" />
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff' }}>
                Actualizaciones del Sistema
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                Versión actual: <strong style={{ color: '#00d2ff' }}>v{CURRENT_APP_VERSION}</strong>
              </div>
            </div>
          </div>
          <button
            onClick={handleManualCheck}
            disabled={checking}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              background: 'rgba(0, 210, 255, 0.15)',
              border: '1px solid rgba(0, 210, 255, 0.3)',
              color: '#00d2ff',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: checking ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <RefreshCw
              size={12}
              style={{
                animation: checking ? 'spin 1s linear infinite' : 'none',
              }}
            />
            {checking ? 'Buscando...' : 'Buscar'}
          </button>
        </div>

        {checkStatus && (
          <div
            style={{
              fontSize: '0.74rem',
              color: checkStatus.type === 'update' ? '#00d2ff' : checkStatus.type === 'latest' ? '#10b981' : '#f87171',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 10px',
              borderRadius: 6,
              background: 'rgba(0,0,0,0.2)',
            }}
          >
            {checkStatus.type === 'latest' && <CheckCircle2 size={13} color="#10b981" />}
            {checkStatus.msg}
          </div>
        )}
      </div>

      {/* Item 4: Info */}
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
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff' }}>Watch Friends</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
              Versión v{CURRENT_APP_VERSION} (OTA Auto-Sync)
            </div>
          </div>
        </div>
        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>hdev</span>
      </div>
    </motion.div>
  );
}
