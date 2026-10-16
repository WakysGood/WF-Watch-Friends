import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary capturó un error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#07090e',
            color: '#f8fafc',
            padding: 24,
            textAlign: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444',
              fontSize: '1.8rem',
            }}
          >
            ⚠️
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
            Algo no cargó correctamente
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.88rem', maxWidth: 360, margin: 0 }}>
            Ocurrió un error inesperado al renderizar esta sección. Puedes volver al inicio sin perder tu sesión.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.hash = '';
              window.location.reload();
            }}
            style={{
              marginTop: 8,
              background: 'linear-gradient(135deg, #00d2ff, #0070f3)',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              padding: '10px 20px',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reiniciar pantalla
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
