import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Sun,
  Moon,
  LogIn,
  LogOut,
  UserPlus,
  ShieldCheck,
  GraduationCap,
  X,
  Mail,
  Lock,
  Sparkles,
  Calendar,
  ChevronDown
} from 'lucide-react';

export interface UserProfile {
  name: string;
  email: string;
  netId: string;
  campus: string;
}

interface ProfileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onSelectTheme: (t: 'dark' | 'light') => void;
  onSyncCalendar?: () => void;
}

const DEFAULT_GUEST: UserProfile | null = null;

export const ProfileMenu: React.FC<ProfileMenuProps> = ({
  isOpen,
  onClose,
  triggerRef,
  theme,
  onToggleTheme: _onToggleTheme,
  onSelectTheme,
  onSyncCalendar
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // User state persisted to localStorage
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('scarlethop_auth_user');
      return saved ? JSON.parse(saved) : DEFAULT_GUEST;
    } catch {
      return DEFAULT_GUEST;
    }
  });

  // Auth modal view: 'none' | 'login' | 'signup'
  const [authModalView, setAuthModalView] = useState<'none' | 'login' | 'signup'>('none');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authCampus, setAuthCampus] = useState('Busch');
  const [authError, setAuthError] = useState('');

  // Save to localStorage when currentUser changes
  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem('scarlethop_auth_user', JSON.stringify(currentUser));
      } else {
        localStorage.removeItem('scarlethop_auth_user');
      }
    } catch {
      // ignore
    }
  }, [currentUser]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      // If auth modal is active, its own backdrop handles outside clicks
      if (authModalView !== 'none') return;

      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        onClose();
        setAuthModalView('none');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, triggerRef, authModalView]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim()) {
      setAuthError('Please enter your Rutgers NetID or scarletmail email');
      return;
    }
    const derivedNetId = authEmail.split('@')[0].toLowerCase();
    const newUser: UserProfile = {
      name: derivedNetId.toUpperCase() + ' (Rutgers Student)',
      email: authEmail.includes('@') ? authEmail : `${derivedNetId}@scarletmail.rutgers.edu`,
      netId: derivedNetId,
      campus: authCampus || 'Busch'
    };
    setCurrentUser(newUser);
    setAuthModalView('none');
    setAuthError('');
  };

  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim() || !authName.trim()) {
      setAuthError('Please provide your name and Rutgers email / NetID');
      return;
    }
    const derivedNetId = authEmail.split('@')[0].toLowerCase();
    const newUser: UserProfile = {
      name: authName.trim(),
      email: authEmail.includes('@') ? authEmail : `${derivedNetId}@scarletmail.rutgers.edu`,
      netId: derivedNetId,
      campus: authCampus
    };
    setCurrentUser(newUser);
    setAuthModalView('none');
    setAuthError('');
  };

  const handleQuickDemoLogin = () => {
    const demoUser: UserProfile = {
      name: 'Scarlet Knight',
      email: 'sknight26@scarletmail.rutgers.edu',
      netId: 'sknight26',
      campus: 'Busch'
    };
    setCurrentUser(demoUser);
    setAuthModalView('none');
    setAuthError('');
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Popover Dropdown */}
      <div
        ref={menuRef}
        style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          width: '280px',
          background: 'var(--apple-glass-overlay)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          border: '1px solid var(--apple-border)',
          borderRadius: '18px',
          boxShadow: 'var(--apple-shadow-lg)',
          padding: '14px',
          zIndex: 100000,
          animation: 'appleModalIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* User Info Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '11px',
          paddingBottom: '12px',
          borderBottom: '1px solid var(--apple-border)'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '9999px',
            background: currentUser
              ? 'linear-gradient(135deg, #CC0033 0%, #E6224B 100%)'
              : 'rgba(255, 255, 255, 0.1)',
            border: '1.5px solid var(--apple-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 800,
            fontSize: '14px',
            flexShrink: 0,
            boxShadow: currentUser ? '0 2px 10px rgba(204, 0, 51, 0.35)' : 'none'
          }}>
            {currentUser ? (
              currentUser.name.slice(0, 2).toUpperCase()
            ) : (
              <User size={19} color="var(--apple-label-secondary)" />
            )}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--apple-glass-text)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {currentUser ? currentUser.name : 'Guest Student'}
            </div>
            <div style={{
              fontSize: '11px',
              color: 'var(--apple-label-secondary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {currentUser ? currentUser.email : 'Rutgers University'}
            </div>
            {currentUser && (
              <div style={{
                fontSize: '9.5px',
                fontWeight: 700,
                color: '#30D158',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                marginTop: '1px'
              }}>
                <ShieldCheck size={10} />
                <span>NetID: {currentUser.netId} • {currentUser.campus}</span>
              </div>
            )}
          </div>
        </div>

        {/* Section: Authentication (Sign up / Login or Logout) */}
        <div style={{ padding: '10px 0', borderBottom: '1px solid var(--apple-border)' }}>
          {currentUser ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <button
                onClick={handleLogout}
                className="apple-btn-secondary"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  padding: '7px 12px',
                  fontSize: '11.5px',
                  color: '#FF453A',
                  gap: '6px'
                }}
              >
                <LogOut size={13} />
                <span>Log Out</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '7px' }}>
              <button
                onClick={() => setAuthModalView('login')}
                className="apple-btn-primary"
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  padding: '7px 10px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  gap: '5px'
                }}
              >
                <LogIn size={12} />
                <span>Log In</span>
              </button>
              <button
                onClick={() => setAuthModalView('signup')}
                className="apple-btn-secondary"
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  padding: '7px 10px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  gap: '5px'
                }}
              >
                <UserPlus size={12} />
                <span>Sign Up</span>
              </button>
            </div>
          )}
        </div>

        {/* Section: Appearance (Light Mode / Dark Mode) */}
        <div style={{ padding: '10px 0', borderBottom: '1px solid var(--apple-border)' }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: 'var(--apple-label-tertiary)',
            marginBottom: '7px'
          }}>
            Appearance
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '6px',
            background: 'var(--apple-surface-card)',
            padding: '3px',
            borderRadius: '11px',
            border: '1px solid var(--apple-border)'
          }}>
            <button
              onClick={() => onSelectTheme('dark')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                padding: '6px 8px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '11.5px',
                fontWeight: theme === 'dark' ? 700 : 500,
                background: theme === 'dark' ? 'rgba(255, 55, 95, 0.18)' : 'transparent',
                color: theme === 'dark' ? '#FF375F' : 'var(--apple-label-secondary)',
                boxShadow: theme === 'dark' ? '0 1px 4px rgba(0,0,0,0.2)' : 'none',
                transition: 'all 0.18s ease'
              }}
            >
              <Moon size={12} />
              <span>Dark Mode</span>
            </button>

            <button
              onClick={() => onSelectTheme('light')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                padding: '6px 8px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '11.5px',
                fontWeight: theme === 'light' ? 700 : 500,
                background: theme === 'light' ? 'rgba(10, 132, 255, 0.18)' : 'transparent',
                color: theme === 'light' ? '#0A84FF' : 'var(--apple-label-secondary)',
                boxShadow: theme === 'light' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.18s ease'
              }}
            >
              <Sun size={12} />
              <span>Light Mode</span>
            </button>
          </div>
        </div>

        {/* Section: Shortcuts (Sync Calendar / Rutgers Info) */}
        <div style={{ paddingTop: '9px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {onSyncCalendar && (
            <button
              onClick={() => {
                onClose();
                onSyncCalendar();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '7px',
                padding: '7px 12px',
                borderRadius: '10px',
                background: theme === 'dark' ? 'rgba(255, 55, 95, 0.14)' : 'rgba(10, 132, 255, 0.12)',
                border: `1px solid ${theme === 'dark' ? 'rgba(255, 55, 95, 0.32)' : 'rgba(10, 132, 255, 0.28)'}`,
                color: theme === 'dark' ? '#FF375F' : '#0A84FF',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
                width: '100%',
                textAlign: 'center',
                boxShadow: 'var(--apple-shadow-sm)',
                transition: 'all 0.18s ease'
              }}
            >
              <Calendar size={13} color={theme === 'dark' ? '#FF375F' : '#0A84FF'} />
              <span>Sync Device Calendar</span>
            </button>
          )}

          <div style={{
            fontSize: '9.5px',
            color: 'var(--apple-label-tertiary)',
            textAlign: 'center',
            paddingTop: '4px'
          }}>
            ScarletHop v2.6 • Rutgers University
          </div>
        </div>
      </div>

      {/* Sign In / Sign Up Modal */}
      {authModalView !== 'none' && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setAuthModalView('none');
              setAuthError('');
            }
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.68)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            zIndex: 100001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '390px',
              background: 'var(--apple-glass-overlay)',
              backdropFilter: 'blur(32px)',
              WebkitBackdropFilter: 'blur(32px)',
              border: '1px solid var(--apple-border)',
              borderRadius: '24px',
              boxShadow: 'var(--apple-shadow-xl)',
              padding: '26px 22px',
              position: 'relative',
              animation: 'appleModalIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                setAuthModalView('none');
                setAuthError('');
              }}
              aria-label="Close"
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                width: '30px',
                height: '30px',
                borderRadius: '9999px',
                background: 'rgba(255, 255, 255, 0.12)',
                border: 'none',
                color: 'var(--apple-label-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 0.2s ease, transform 0.15s ease'
              }}
            >
              <X size={16} />
            </button>

            {/* Modal Title & Brand */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #CC0033 0%, #FF375F 100%)',
                color: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '10px',
                boxShadow: '0 4px 16px rgba(204, 0, 51, 0.45)'
              }}>
                <GraduationCap size={26} />
              </div>
              <h3 style={{ fontSize: '19px', fontWeight: 800, margin: '0 0 5px', color: 'var(--apple-label-primary)', letterSpacing: '-0.3px' }}>
                {authModalView === 'login' ? 'Sign In to ScarletHop' : 'Create Student Account'}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--apple-label-secondary)', margin: 0, lineHeight: 1.4 }}>
                {authModalView === 'login'
                  ? 'Access synced schedules and Rutgers bus alerts'
                  : 'Get personalized transit suggestions across campuses'}
              </p>
            </div>

            {/* View Switcher: Log In / Sign Up */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '4px',
              background: 'var(--apple-control-bg)',
              padding: '3px',
              borderRadius: '12px',
              marginBottom: '18px'
            }}>
              <button
                type="button"
                onClick={() => {
                  setAuthModalView('login');
                  setAuthError('');
                }}
                className={`apple-segment-btn ${authModalView === 'login' ? 'active' : ''}`}
                style={{ padding: '7px 12px', fontSize: '13px', borderRadius: '9px' }}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthModalView('signup');
                  setAuthError('');
                }}
                className={`apple-segment-btn ${authModalView === 'signup' ? 'active' : ''}`}
                style={{ padding: '7px 12px', fontSize: '13px', borderRadius: '9px' }}
              >
                Sign Up
              </button>
            </div>

            {authError && (
              <div style={{
                padding: '9px 12px',
                borderRadius: '10px',
                background: 'rgba(255, 69, 58, 0.15)',
                border: '1px solid rgba(255, 69, 58, 0.3)',
                color: '#FF453A',
                fontSize: '12px',
                marginBottom: '14px',
                textAlign: 'center',
                fontWeight: 500
              }}>
                {authError}
              </div>
            )}

            {/* Form */}
            <form onSubmit={authModalView === 'login' ? handleLoginSubmit : handleSignUpSubmit}>
              {authModalView === 'signup' && (
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--apple-label-secondary)', marginBottom: '6px' }}>
                    Full Name
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="e.g. Scarlet Knight"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      className="apple-input"
                      style={{ paddingLeft: '42px', fontSize: '14px', height: '46px' }}
                    />
                    <User size={16} style={{ position: 'absolute', left: '14px', pointerEvents: 'none', color: 'var(--apple-label-tertiary)' }} />
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--apple-label-secondary)', marginBottom: '6px' }}>
                  Rutgers NetID or Scarletmail
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="netid or netid@scarletmail.rutgers.edu"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="apple-input"
                    style={{ paddingLeft: '42px', fontSize: '14px', height: '46px' }}
                  />
                  <Mail size={16} style={{ position: 'absolute', left: '14px', pointerEvents: 'none', color: 'var(--apple-label-tertiary)' }} />
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--apple-label-secondary)', marginBottom: '6px' }}>
                  Password
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="apple-input"
                    style={{ paddingLeft: '42px', fontSize: '14px', height: '46px' }}
                  />
                  <Lock size={16} style={{ position: 'absolute', left: '14px', pointerEvents: 'none', color: 'var(--apple-label-tertiary)' }} />
                </div>
              </div>

              {authModalView === 'signup' && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--apple-label-secondary)', marginBottom: '6px' }}>
                    Primary Campus
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <select
                      value={authCampus}
                      onChange={(e) => setAuthCampus(e.target.value)}
                      className="apple-select"
                      style={{ height: '46px', fontSize: '14px', paddingLeft: '14px', paddingRight: '36px' }}
                    >
                      <option value="Busch">Busch Campus</option>
                      <option value="Livingston">Livingston Campus</option>
                      <option value="College Ave">College Avenue Campus</option>
                      <option value="Cook">Cook / Douglass Campus</option>
                    </select>
                    <ChevronDown size={16} style={{ position: 'absolute', right: '14px', pointerEvents: 'none', color: 'var(--apple-label-tertiary)' }} />
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="apple-btn-primary"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  height: '46px',
                  fontSize: '14px',
                  fontWeight: 700,
                  borderRadius: '13px',
                  marginBottom: '10px'
                }}
              >
                {authModalView === 'login' ? 'Sign In' : 'Create Account'}
              </button>

              <button
                type="button"
                onClick={handleQuickDemoLogin}
                className="apple-btn-secondary"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  height: '42px',
                  fontSize: '12.5px',
                  borderRadius: '12px',
                  gap: '6px'
                }}
              >
                <Sparkles size={14} color="#BF5AF2" />
                <span>Demo Student 1-Click Login</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
