import React, { useState } from 'react';
import {
  Sparkles,
  Download,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Cpu,
  Layers,
} from 'lucide-react';
import {
  applyOtaUpdate,
  applyApkUpdate,
  CURRENT_APP_VERSION,
} from '../services/updateService';

export function UpdateModal({
  isOpen,
  updateInfo,
  onClose,
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState(null);

  if (!isOpen || !updateInfo) return null;

  const isOta = updateInfo.type === 'ota' || !updateInfo.type;
  const newVersion = updateInfo.version || 'Nueva';

  const handleStartUpdate = async () => {
    setIsUpdating(true);
    setProgress(5);
    setError(null);

    try {
      if (isOta) {
        setStatusText('Descargando parche de actualización...');
        await applyOtaUpdate(
          updateInfo.bundleUrl,
          newVersion,
          (pct) => {
            setProgress(pct);
            if (pct >= 90) {
              setStatusText('Aplicando cambios y reiniciando...');
            } else {
              setStatusText(`Descargando parche: ${Math.round(pct)}%`);
            }
          }
        );
      } else {
        setStatusText('Descargando archivo APK...');
        await applyApkUpdate(
          updateInfo.apkUrl,
          (pct) => {
            setProgress(pct);
            if (pct >= 90) {
              setStatusText('Abriendo instalador del sistema...');
            } else {
              setStatusText(`Descargando APK: ${Math.round(pct)}%`);
            }
          }
        );
        setIsUpdating(false);
      }
    } catch (err) {
      console.error('Update failed:', err);
      setError(err.message || 'Error durante la descarga de la actualización');
      setIsUpdating(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(5, 7, 15, 0.85)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          background: 'linear-gradient(145deg, #101626, #0b0f1a)',
          border: '1px solid rgba(0, 210, 255, 0.3)',
          borderRadius: 20,
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(0, 210, 255, 0.15)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeInScale 0.25s ease-out',
        }}
      >
        {/* Encabezado con Icono y Botón Cerrar */}
        <div
          style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: isOta
                  ? 'linear-gradient(135deg, rgba(0,210,255,0.2), rgba(59,130,246,0.3))'
                  : 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(236,72,153,0.3))',
                border: isOta
                  ? '1px solid rgba(0,210,255,0.4)'
                  : '1px solid rgba(168,85,247,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isOta ? (
                <Sparkles size={22} color="#00d2ff" />
              ) : (
                <Download size={22} color="#c084fc" />
              )}
            </div>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  color: '#f8fafc',
                }}
              >
                {updateInfo.title || 'Actualización Disponible'}
              </h3>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 3,
                }}
              >
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  v{CURRENT_APP_VERSION}
                </span>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>→</span>
                <span
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    color: '#00d2ff',
                  }}
                >
                  v{newVersion}
                </span>
              </div>
            </div>
          </div>

          {!isUpdating && (
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                padding: 6,
                borderRadius: 8,
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Cuerpo del Modal */}
        <div style={{ padding: '20px 24px' }}>
          {/* Badge del tipo de actualización */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 20,
              fontSize: '0.72rem',
              fontWeight: 600,
              marginBottom: 14,
              background: isOta
                ? 'rgba(0, 210, 255, 0.1)'
                : 'rgba(168, 85, 247, 0.1)',
              color: isOta ? '#00d2ff' : '#c084fc',
              border: isOta
                ? '1px solid rgba(0, 210, 255, 0.25)'
                : '1px solid rgba(168, 85, 247, 0.25)',
            }}
          >
            {isOta ? <Layers size={12} /> : <Cpu size={12} />}
            <span>
              {isOta
                ? 'Parche en vivo (se reinicia sin reinstalar)'
                : 'Actualización de APK del sistema'}
            </span>
          </div>

          {/* Notas de la versión (Changelog) */}
          <div
            style={{
              background: '#090d16',
              borderRadius: 12,
              padding: '12px 14px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              marginBottom: 20,
            }}
          >
            <span
              style={{
                fontSize: '0.74rem',
                fontWeight: 700,
                color: '#cbd5e1',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                display: 'block',
                marginBottom: 6,
              }}
            >
              Novedades y correcciones:
            </span>
            <p
              style={{
                margin: 0,
                fontSize: '0.8rem',
                color: '#94a3b8',
                lineHeight: 1.5,
                whiteSpace: 'pre-line',
              }}
            >
              {updateInfo.changelog || '• Mejoras de rendimiento y estabilidad general.'}
            </p>
          </div>

          {/* Estado de Progreso de Descarga */}
          {isUpdating ? (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    fontSize: '0.76rem',
                    color: '#cbd5e1',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <RefreshCw
                    size={12}
                    className="spin"
                    style={{ animation: 'spin 1s linear infinite' }}
                  />
                  {statusText}
                </span>
                <span
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#00d2ff',
                  }}
                >
                  {Math.round(progress)}%
                </span>
              </div>

              {/* Barra de progreso animada */}
              <div
                style={{
                  width: '100%',
                  height: 10,
                  background: '#151d30',
                  borderRadius: 6,
                  overflow: 'hidden',
                  border: '1px solid rgba(0, 210, 255, 0.2)',
                }}
              >
                <div
                  style={{
                    width: `${Math.max(5, progress)}%`,
                    height: '100%',
                    background:
                      'linear-gradient(90deg, #00d2ff 0%, #3b82f6 50%, #8b5cf6 100%)',
                    borderRadius: 6,
                    transition: 'width 0.25s ease',
                    boxShadow: '0 0 10px rgba(0, 210, 255, 0.5)',
                  }}
                />
              </div>

              <p
                style={{
                  fontSize: '0.7rem',
                  color: '#64748b',
                  textAlign: 'center',
                  marginTop: 10,
                  marginBottom: 0,
                }}
              >
                Por favor no cierres la app mientras se aplica la actualización.
              </p>
            </div>
          ) : error ? (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: '#fca5a5',
                fontSize: '0.78rem',
                marginBottom: 16,
              }}
            >
              <AlertCircle size={16} flexShrink={0} />
              <span>{error}</span>
            </div>
          ) : null}
        </div>

        {/* Botones de Acción */}
        {!isUpdating && (
          <div
            style={{
              padding: '14px 24px 20px',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              gap: 10,
              justifyContent: 'flex-end',
            }}
          >
            <button
              onClick={onClose}
              style={{
                padding: '9px 16px',
                borderRadius: 10,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#94a3b8',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Más tarde
            </button>
            <button
              onClick={handleStartUpdate}
              className="glow-btn"
              style={{
                padding: '9px 20px',
                borderRadius: 10,
                fontSize: '0.82rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Download size={14} />
              Actualizar ahora
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
