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
  ChevronDown,
  ChevronRight,
  SlidersHorizontal,
  CloudRain,
  Snowflake,
  Footprints,
  Check,
  RotateCcw
} from 'lucide-react';
import { API_BASE_URL } from './apiConfig';

export interface UserPreferences {
  walking_speed: string; // e.g. "2.5 mph"
  max_walking_distance: string; // e.g. "1 Mile"
  avoid_bad_weather: boolean;
  avoid_rain: boolean;
  avoid_snow: boolean;
  prefer_walking: boolean;
}

export interface UserProfile {
  name: string;
  email: string;
  netId: string;
  campus: string;
  preferences?: UserPreferences;
}

interface ProfileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onSelectTheme: (t: 'dark' | 'light') => void;
  onSyncCalendar?: () => void;
  onClassesLoaded?: (classes: any[]) => void;
  onLogout?: () => void;
  onLogin?: (user: UserProfile) => void;
}

const DEFAULT_GUEST: UserProfile | null = null;

export const DEFAULT_PREFERENCES: UserPreferences = {
  walking_speed: "2.5 mph",
  max_walking_distance: "1 Mile",
  avoid_bad_weather: true,
  avoid_rain: true,
  avoid_snow: true,
  prefer_walking: true
};

export const ProfileMenu: React.FC<ProfileMenuProps> = ({
  isOpen,
  onClose,
  triggerRef,
  theme,
  onToggleTheme: _onToggleTheme,
  onSelectTheme,
  onSyncCalendar,
  onClassesLoaded,
  onLogout,
  onLogin
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

  // User preferences (default: walking speed 2.5 mph, 1 mile, no rain/snow)
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    try {
      const saved = localStorage.getItem('scarlethop_user_preferences');
      return saved ? { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) } : DEFAULT_PREFERENCES;
    } catch {
      return DEFAULT_PREFERENCES;
    }
  });

  // Modal view: 'none' | 'login' | 'signup' | 'preferences'
  const [authModalView, setAuthModalView] = useState<'none' | 'login' | 'signup' | 'preferences'>('none');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authCampus, setAuthCampus] = useState('Busch');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [savedSuccessMessage, setSavedSuccessMessage] = useState('');

  // Save currentUser to localStorage
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

  // Save preferences to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('scarlethop_user_preferences', JSON.stringify(preferences));
    } catch {
      // ignore
    }
  }, [preferences]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
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

  // Connect Login with Backend SQL API
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim()) {
      setAuthError('Please enter your Rutgers NetID or scarletmail email');
      return;
    }
    if (!authPassword.trim()) {
      setAuthError('Please enter your password');
      return;
    }

    setAuthLoading(true);
    setAuthError('');

    const cleanNetId = authEmail.split('@')[0].trim().toLowerCase();

    try {
      const res = await fetch(`${API_BASE_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: cleanNetId,
          password: authPassword
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Incorrect NetID or password.");
      }

      // Fetch user profile and preferences from backend
      let loadedProfile: any = null;
      try {
        const profileRes = await fetch(`${API_BASE_URL}/api/user/${cleanNetId}`);
        if (profileRes.ok) {
          loadedProfile = await profileRes.json();
        }
      } catch {
        // ignore profile fetch error
      }

      const updatedPrefs: UserPreferences = {
        walking_speed: loadedProfile?.walking_speed || preferences.walking_speed || "2.5 mph",
        max_walking_distance: loadedProfile?.max_walking_distance || preferences.max_walking_distance || "1 Mile",
        avoid_bad_weather: loadedProfile?.avoid_bad_weather ?? true,
        avoid_rain: loadedProfile?.avoid_rain ?? true,
        avoid_snow: loadedProfile?.avoid_snow ?? true,
        prefer_walking: loadedProfile?.prefer_walking ?? true
      };

      setPreferences(updatedPrefs);

      const user: UserProfile = {
        name: cleanNetId.toUpperCase() + ' (Rutgers Student)',
        email: authEmail.includes('@') ? authEmail : `${cleanNetId}@scarletmail.rutgers.edu`,
        netId: cleanNetId,
        campus: authCampus || 'Busch',
        preferences: updatedPrefs
      };

      setCurrentUser(user);
      if (onLogin) {
        onLogin(user);
      }
      setAuthModalView('none');
      setAuthPassword('');
      setAuthError('');

      // Auto-load saved class schedule if available
      if (loadedProfile?.classes && loadedProfile.classes.length > 0 && onClassesLoaded) {
        onClassesLoaded(loadedProfile.classes);
      }
    } catch (err: any) {
      setAuthError(err.message || "Failed to log in. Please verify the backend is running.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Connect Sign Up with Backend SQL API
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim()) {
      setAuthError('Please provide your Rutgers NetID or email');
      return;
    }
    if (!authPassword.trim()) {
      setAuthError('Please create a password for your account');
      return;
    }

    setAuthLoading(true);
    setAuthError('');

    const cleanNetId = authEmail.split('@')[0].trim().toLowerCase();

    try {
      const res = await fetch(`${API_BASE_URL}/api/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: cleanNetId,
          password: authPassword,
          walking_speed: preferences.walking_speed,
          prefer_walking: preferences.prefer_walking,
          max_walking_distance: preferences.max_walking_distance,
          avoid_bad_weather: preferences.avoid_bad_weather,
          avoid_rain: preferences.avoid_rain,
          avoid_snow: preferences.avoid_snow
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Sign up failed. Username may already exist.");
      }

      const user: UserProfile = {
        name: authName.trim() || (cleanNetId.toUpperCase() + ' (Rutgers Student)'),
        email: authEmail.includes('@') ? authEmail : `${cleanNetId}@scarletmail.rutgers.edu`,
        netId: cleanNetId,
        campus: authCampus,
        preferences
      };

      setCurrentUser(user);
      if (onLogin) {
        onLogin(user);
      }
      setAuthModalView('none');
      setAuthPassword('');
      setAuthError('');
    } catch (err: any) {
      setAuthError(err.message || "Sign up failed. Please verify the backend is running.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Demo 1-Click Login using placeholder values (sk1234 instead of sknightXXX)
  const handleQuickDemoLogin = async () => {
    const demoNetId = 'sk1234';
    const demoName = 'Scarlet Knight';
    setAuthName(demoName);
    setAuthEmail(demoNetId);
    setAuthPassword('scarlet1234');

    // Register / Ensure demo user exists in backend SQL
    try {
      await fetch(`${API_BASE_URL}/api/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: demoNetId,
          password: 'scarlet1234',
          walking_speed: preferences.walking_speed,
          prefer_walking: preferences.prefer_walking,
          max_walking_distance: preferences.max_walking_distance,
          avoid_bad_weather: preferences.avoid_bad_weather,
          avoid_rain: preferences.avoid_rain,
          avoid_snow: preferences.avoid_snow
        })
      });
    } catch {
      // already exists or backend offline
    }

    const demoUser: UserProfile = {
      name: demoName,
      email: `${demoNetId}@scarletmail.rutgers.edu`,
      netId: demoNetId,
      campus: 'Busch',
      preferences
    };
    setCurrentUser(demoUser);
    if (onLogin) {
      onLogin(demoUser);
    }
    setAuthModalView('none');
    setAuthError('');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('scarlethop_classes');
      localStorage.removeItem('scarlethop_auth_user');
    } catch {
      // ignore
    }
    if (onLogout) {
      onLogout();
    }
  };

  // Save Preferences to LocalStorage & Backend SQL if Logged In
  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccessMessage('Preferences updated successfully!');

    if (currentUser?.netId) {
      try {
        await fetch(`${API_BASE_URL}/api/user/${currentUser.netId}/preferences`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walking_speed: preferences.walking_speed,
            prefer_walking: preferences.prefer_walking,
            max_walking_distance: preferences.max_walking_distance,
            avoid_bad_weather: preferences.avoid_bad_weather,
            avoid_rain: preferences.avoid_rain,
            avoid_snow: preferences.avoid_snow
          })
        });
      } catch {
        // Local state already updated
      }
    }

    setTimeout(() => {
      setSavedSuccessMessage('');
      setAuthModalView('none');
    }, 900);
  };

  const handleResetPreferences = () => {
    setPreferences(DEFAULT_PREFERENCES);
    setSavedSuccessMessage('Reset to defaults (2.5 mph, 1 mile, rain/snow avoided)');
    setTimeout(() => setSavedSuccessMessage(''), 2000);
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
          width: '300px',
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
                <span>Log Out ({currentUser.netId})</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '7px' }}>
              <button
                onClick={() => {
                  setAuthModalView('login');
                  setAuthError('');
                }}
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
                onClick={() => {
                  setAuthModalView('signup');
                  setAuthError('');
                }}
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

        {/* Section: Commute & Walking Preferences */}
        <div style={{ padding: '10px 0', borderBottom: '1px solid var(--apple-border)' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '7px'
          }}>
            <div style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--apple-label-tertiary)'
            }}>
              Commute Preferences
            </div>
            <span style={{ fontSize: '10px', color: '#30D158', fontWeight: 600 }}>
              {preferences.walking_speed} • {preferences.max_walking_distance}
            </span>
          </div>

          <button
            onClick={() => setAuthModalView('preferences')}
            className="apple-btn-secondary"
            style={{
              width: '100%',
              justifyContent: 'space-between',
              padding: '7px 10px',
              fontSize: '11.5px',
              borderRadius: '10px',
              gap: '6px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <SlidersHorizontal size={13} color="#FF375F" />
              <span style={{ fontWeight: 600 }}>Update Preferences</span>
            </div>
            <ChevronRight size={13} color="var(--apple-label-tertiary)" />
          </button>
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

      {/* ========================================================
          MODAL 1: PREFERENCES POPUP
          ======================================================== */}
      {authModalView === 'preferences' && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setAuthModalView('none');
              setSavedSuccessMessage('');
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
              maxWidth: '410px',
              background: 'var(--apple-glass-overlay)',
              backdropFilter: 'blur(32px)',
              WebkitBackdropFilter: 'blur(32px)',
              border: '1px solid var(--apple-border)',
              borderRadius: '24px',
              boxShadow: 'var(--apple-shadow-xl)',
              padding: '24px 22px',
              position: 'relative',
              animation: 'appleModalIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                setAuthModalView('none');
                setSavedSuccessMessage('');
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
                cursor: 'pointer'
              }}
            >
              <X size={16} />
            </button>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #FF375F 0%, #D71A43 100%)',
                color: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '10px',
                boxShadow: '0 4px 16px rgba(255, 55, 95, 0.4)'
              }}>
                <SlidersHorizontal size={22} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px', color: 'var(--apple-label-primary)' }}>
                Commute Preferences
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--apple-label-secondary)', margin: 0 }}>
                Personalize walking pace, weather limits, and route calculations.
              </p>
            </div>

            {savedSuccessMessage && (
              <div style={{
                padding: '8px 12px',
                borderRadius: '10px',
                background: 'rgba(48, 209, 88, 0.16)',
                border: '1px solid rgba(48, 209, 88, 0.3)',
                color: '#30D158',
                fontSize: '12px',
                marginBottom: '14px',
                textAlign: 'center',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}>
                <Check size={14} />
                <span>{savedSuccessMessage}</span>
              </div>
            )}

            <form onSubmit={handleSavePreferences}>
              {/* Setting 1: Walking Speed */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--apple-label-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Footprints size={13} color="#FF375F" />
                    <span>Walking Speed</span>
                  </label>
                  <span style={{ fontSize: '11px', color: '#FF375F', fontWeight: 700 }}>
                    {preferences.walking_speed}
                  </span>
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '4px',
                  background: 'var(--apple-control-bg)',
                  padding: '3px',
                  borderRadius: '10px'
                }}>
                  {[
                    { label: "2.0 mph", title: "Mosey / Relaxed" },
                    { label: "2.5 mph", title: "Stroll / Standard (Default)" },
                    { label: "3.0 mph", title: "Brisk / Swift" },
                    { label: "3.5 mph", title: "Dash / Fast" }
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setPreferences(prev => ({ ...prev, walking_speed: opt.label }))}
                      className={`apple-segment-btn ${preferences.walking_speed.includes(opt.label) ? 'active' : ''}`}
                      title={opt.title}
                      style={{ padding: '6px 4px', fontSize: '11.5px', borderRadius: '7px' }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Setting 2: Max Walking Distance */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--apple-label-secondary)' }}>
                    Max Walking Distance
                  </label>
                  <span style={{ fontSize: '11px', color: '#30D158', fontWeight: 700 }}>
                    {preferences.max_walking_distance}
                  </span>
                </div>
                <select
                  value={preferences.max_walking_distance}
                  onChange={(e) => setPreferences(prev => ({ ...prev, max_walking_distance: e.target.value }))}
                  className="apple-select"
                  style={{ height: '40px', fontSize: '13px' }}
                >
                  <option value="1/4 A Mile">1/4 A Mile (~5 mins max)</option>
                  <option value="1/2 A Mile">1/2 A Mile (~10 mins max)</option>
                  <option value="3/4 A Mile">3/4 A Mile (~15 mins max)</option>
                  <option value="1 Mile">1 Mile (~20 mins max - Default)</option>
                  <option value="A Mile or More">A Mile or More (Walking enthusiast)</option>
                </select>
              </div>

              {/* Setting 3: Weather Sensitivity */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--apple-border)',
                borderRadius: '12px',
                padding: '10px 12px',
                marginBottom: '16px'
              }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--apple-label-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px' }}>
                  Weather Adaptation
                </div>

                {/* Rain */}
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '5px 0',
                  cursor: 'pointer',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CloudRain size={14} color="#0A84FF" />
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--apple-label-primary)' }}>
                        Avoid Rain
                      </div>
                      <div style={{ fontSize: '10.5px', color: 'var(--apple-label-tertiary)' }}>
                        Prefers bus routes over pedestrian paths when raining
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.avoid_rain}
                    onChange={(e) => setPreferences(prev => ({
                      ...prev,
                      avoid_rain: e.target.checked,
                      avoid_bad_weather: e.target.checked || prev.avoid_snow
                    }))}
                    style={{ width: '16px', height: '16px', accentColor: '#FF375F', cursor: 'pointer' }}
                  />
                </label>

                {/* Snow */}
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 0 3px',
                  cursor: 'pointer'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Snowflake size={14} color="#64D2FF" />
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--apple-label-primary)' }}>
                        Avoid Snow & Freezing Temps
                      </div>
                      <div style={{ fontSize: '10.5px', color: 'var(--apple-label-tertiary)' }}>
                        Routes via heated bus stops and direct transit loops
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.avoid_snow}
                    onChange={(e) => setPreferences(prev => ({
                      ...prev,
                      avoid_snow: e.target.checked,
                      avoid_bad_weather: e.target.checked || prev.avoid_rain
                    }))}
                    style={{ width: '16px', height: '16px', accentColor: '#FF375F', cursor: 'pointer' }}
                  />
                </label>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="submit"
                  className="apple-btn-primary"
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    height: '42px',
                    fontSize: '13px',
                    fontWeight: 700,
                    borderRadius: '12px'
                  }}
                >
                  Save Preferences
                </button>
                <button
                  type="button"
                  onClick={handleResetPreferences}
                  className="apple-btn-secondary"
                  title="Reset to default settings"
                  style={{
                    padding: '0 12px',
                    height: '42px',
                    borderRadius: '12px',
                    fontSize: '12px'
                  }}
                >
                  <RotateCcw size={13} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: SIGN IN / SIGN UP MODAL
          ======================================================== */}
      {(authModalView === 'login' || authModalView === 'signup') && (
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
                cursor: 'pointer'
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
                  ? 'Access your synced schedule and saved preferences in SQL'
                  : 'Register your NetID and preferences to get personalized routing'}
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
                  Rutgers NetID or Username
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="e.g. sk1234"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="apple-input"
                    style={{ paddingLeft: '42px', fontSize: '14px', height: '46px' }}
                    required
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
                    placeholder="••••••••"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="apple-input"
                    style={{ paddingLeft: '42px', fontSize: '14px', height: '46px' }}
                    required
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
                disabled={authLoading}
                className="apple-btn-primary"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  height: '46px',
                  fontSize: '14px',
                  fontWeight: 700,
                  borderRadius: '13px',
                  marginBottom: '10px',
                  opacity: authLoading ? 0.7 : 1
                }}
              >
                {authLoading
                  ? 'Connecting...'
                  : authModalView === 'login'
                    ? 'Sign In'
                    : 'Create Account & Sync'}
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
