import React from 'react';

export function Logo({ size = 36, showText = true }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
      <div
        style={{
          width: size,
          height: size,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 0 12px rgba(0, 210, 255, 0.45))' }}
        >
          <defs>
            <linearGradient id="wfGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00d2ff" />
              <stop offset="100%" stopColor="#0066ff" />
            </linearGradient>
            <linearGradient id="wfGradDark" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
          </defs>
          
          {/* Hexagonal / Octagonal Modern Shield Frame */}
          <rect
            x="8"
            y="8"
            width="84"
            height="84"
            rx="24"
            fill="url(#wfGradDark)"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="2"
          />

          {/* Sync Signal Pulse Arc */}
          <path
            d="M 28 50 C 28 37.85 37.85 28 50 28"
            stroke="url(#wfGrad)"
            strokeWidth="5"
            strokeLinecap="round"
          />

          {/* Core Geometric Play / Sync Triangle */}
          <path
            d="M 44 38 L 66 50 L 44 62 Z"
            fill="url(#wfGrad)"
          />

          {/* Outer Sync Beacon */}
          <circle cx="72" cy="28" r="4.5" fill="#00d2ff" />
        </svg>
      </div>

      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: size > 40 ? '1.45rem' : '1.15rem',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                color: '#ffffff',
              }}
            >
              WatchFriends
            </span>
            <span
              style={{
                fontSize: '0.62rem',
                fontWeight: 700,
                color: '#00d2ff',
                background: 'rgba(0, 210, 255, 0.1)',
                border: '1px solid rgba(0, 210, 255, 0.3)',
                padding: '1px 6px',
                borderRadius: 4,
                letterSpacing: '0.05em',
              }}
            >
              PRO
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
