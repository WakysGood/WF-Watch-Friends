import React from 'react';
import { Outlet } from 'react-router-dom';
import { BottomNavBar } from '../components/BottomNavBar';
import { NetworkBanner } from '../components/NetworkBanner';

export function DashboardLayout() {
  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        height: '100dvh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        background: 'var(--bg-dark)',
      }}
    >
      <div className="bg-grid-ambient" />
      <div className="ambient-spotlight" />

      {/* Banner de alerta de red / internet */}
      <NetworkBanner />

      {/* Barra superior flotante con Glassmorphism */}
      <header className="floating-glass-top">
        <span
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.22rem',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: '#ffffff',
          }}
        >
          WatchFriends
        </span>
      </header>

      {/* Contenedor dinámico de rutas */}
      <main
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '78px 16px 90px 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          minHeight: 0,
        }}
      >
        <Outlet />
      </main>

      {/* Barra inferior flotante con Glassmorphism */}
      <BottomNavBar />
    </div>
  );
}
