import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Tv, Users, MessageSquare, User, Settings } from 'lucide-react';

export function BottomNavBar() {
  const location = useLocation();
  const navigate = useNavigate();

  const currentPath = location.pathname;

  const navItems = [
    { path: '/lobby', label: 'Room', icon: Tv },
    { path: '/friends', label: 'Amigos', icon: Users },
    { path: '/chats', label: 'Chats', icon: MessageSquare },
    { path: '/profile', label: 'Perfil', icon: User },
    { path: '/settings', label: 'Ajustes', icon: Settings },
  ];

  return (
    <nav className="floating-glass-bottom">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentPath === item.path || (item.path === '/lobby' && currentPath === '/');

        return (
          <button
            key={item.path}
            type="button"
            onClick={() => navigate(item.path)}
            className={`nav-tab-btn ${isActive ? 'active' : ''}`}
            title={item.label}
          >
            <Icon 
              size={21} 
              color={isActive ? '#00d2ff' : '#64748b'} 
              strokeWidth={isActive ? 2.5 : 1.7} 
            />
            {isActive && <span className="nav-tab-indicator" />}
          </button>
        );
      })}
    </nav>
  );
}
