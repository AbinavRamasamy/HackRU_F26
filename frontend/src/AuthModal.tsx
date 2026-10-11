import React, { useState, useEffect } from 'react';
import {
  X,
  Eye,
  EyeOff,
  User,
  Lock,
  Footprints,
  CloudRain,
  Snowflake,
  Sparkles,
  ChevronDown,
  ArrowRight,
  ShieldCheck,
  Check
} from 'lucide-react';
import { API_BASE_URL } from './apiConfig';
import { UserProfile, UserPreferences, DEFAULT_PREFERENCES } from './ProfileMenu';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: UserProfile) => void;
  onClassesLoaded?: (classes: any[]) => void;
  initialMode?: 'login' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  onClassesLoaded,
  initialMode = 'login'
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError('');
    }
  }, [isOpen, initialMode]);

  // Form Fields
  const [netIdOrEmail, setNetIdOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [campus, setCampus] = useState('Busch');

  // Preferences (selected during signup or customized)
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    try {
      const saved = localStorage.getItem('scarlethop_user_preferences');
      return saved ? { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) } : DEFAULT_PREFERENCES;
    } catch {
      return DEFAULT_PREFERENCES;
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPasswordInfo, setShowForgotPasswordInfo] = useState(false);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!netIdOrEmail.trim()) {
      setError('Please enter your Rutgers NetID or email.');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    const cleanNetId = netIdOrEmail.split('@')[0].trim().toLowerCase();

    try {
      const res = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanNetId,
          password: password
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Incorrect NetID or password.');
      }

      // Fetch user profile and preferences from database
      let loadedProfile: any = null;
      try {
        const profileRes = await fetch(`${API_BASE_URL}/api/user/${cleanNetId}`);
        if (profileRes.ok) {
          loadedProfile = await profileRes.json();
        }
      } catch {
        // ignore fetch error
      }

      const updatedPrefs: UserPreferences = {
        walking_speed: loadedProfile?.walking_speed || preferences.walking_speed || '2.5 mph',
        max_walking_distance: loadedProfile?.max_walking_distance || preferences.max_walking_distance || '1 Mile',
        avoid_bad_weather: loadedProfile?.avoid_bad_weather ?? true,
        avoid_rain: loadedProfile?.avoid_rain ?? true,
        avoid_snow: loadedProfile?.avoid_snow ?? true,
        prefer_walking: loadedProfile?.prefer_walking ?? true
      };

      try {
        localStorage.setItem('scarlethop_user_preferences', JSON.stringify(updatedPrefs));
      } catch {}

      const user: UserProfile = {
        name: cleanNetId.toUpperCase() + ' (Rutgers Student)',
        email: netIdOrEmail.includes('@') ? netIdOrEmail : `${cleanNetId}@scarletmail.rutgers.edu`,
        netId: cleanNetId,
        campus: campus || 'Busch',
        preferences: updatedPrefs
      };

      try {
        localStorage.setItem('scarlethop_auth_user', JSON.stringify(user));
      } catch {}

      if (loadedProfile?.classes && loadedProfile.classes.length > 0 && onClassesLoaded) {
        onClassesLoaded(loadedProfile.classes);
      }

      onLogin(user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please verify backend service.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!netIdOrEmail.trim()) {
      setError('Please provide your Rutgers NetID or email.');
      return;
    }
    if (!password.trim()) {
      setError('Please create a password for your account.');
      return;
    }

    setLoading(true);
    const cleanNetId = netIdOrEmail.split('@')[0].trim().toLowerCase();

    try {
      const res = await fetch(`${API_BASE_URL}/api/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanNetId,
          password: password,
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
        throw new Error(errData.detail || 'Sign up failed. Username may already exist.');
      }

      try {
        localStorage.setItem('scarlethop_user_preferences', JSON.stringify(preferences));
      } catch {}

      const user: UserProfile = {
        name: fullName.trim() || (cleanNetId.toUpperCase() + ' (Rutgers Student)'),
        email: netIdOrEmail.includes('@') ? netIdOrEmail : `${cleanNetId}@scarletmail.rutgers.edu`,
        netId: cleanNetId,
        campus: campus,
        preferences
      };

      try {
        localStorage.setItem('scarlethop_auth_user', JSON.stringify(user));
      } catch {}

      onLogin(user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Quick 1-Click Demo Login (Continue as Scarlet Knight)
  const handleDemoLogin = async () => {
    const demoNetId = 'sk1234';
    const demoName = 'Scarlet Knight';
    setLoading(true);
    setError('');

    try {
      await fetch(`${API_BASE_URL}/api/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    } catch {}

    const demoUser: UserProfile = {
      name: demoName,
      email: `${demoNetId}@scarletmail.rutgers.edu`,
      netId: demoNetId,
      campus: 'Busch',
      preferences
    };

    try {
      localStorage.setItem('scarlethop_auth_user', JSON.stringify(demoUser));
      localStorage.setItem('scarlethop_user_preferences', JSON.stringify(preferences));
    } catch {}

    setLoading(false);
    onLogin(demoUser);
    onClose();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        zIndex: 100000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'appleModalFadeIn 0.25s ease-out'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '380px',
          backgroundColor: 'var(--apple-material-thick, #161618)',
          border: '1px solid var(--apple-border, rgba(255, 255, 255, 0.12))',
          borderRadius: '22px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.65)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}
      >
        {/* Top-Right Close Button (X like in Instagram mockup) */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'transparent',
            border: 'none',
            color: 'var(--apple-label-secondary, #999)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10,
            transition: 'opacity 0.15s, background-color 0.15s'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <X size={20} />
        </button>

        {/* Modal Main Content */}
        <div style={{ padding: '36px 30px 24px' }}>
          {/* Instagram-Style Script Brand Header */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <h1
              style={{
                fontFamily: "'Grand Hotel', 'Brush Script MT', 'Pacifico', cursive",
                fontSize: '44px',
                fontWeight: 500,
                margin: 0,
                color: 'var(--apple-label-primary, #ffffff)',
                letterSpacing: '1px',
                lineHeight: 1.1,
                background: 'linear-gradient(135deg, #FF375F 0%, #FFFFFF 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                display: 'inline-block'
              }}
            >
              ScarletHop
            </h1>
            <p
              style={{
                fontSize: '12px',
                color: 'var(--apple-label-secondary, rgba(235, 235, 245, 0.6))',
                margin: '6px 0 0',
                letterSpacing: '0.2px'
              }}
            >
              {mode === 'login'
                ? 'Rutgers Transit Copilot & Schedule Sync'
                : 'Set Up NetID & Commute Preferences'}
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div
              style={{
                padding: '9px 12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 69, 58, 0.14)',
                border: '1px solid rgba(255, 69, 58, 0.3)',
                color: '#FF453A',
                fontSize: '12px',
                marginBottom: '16px',
                textAlign: 'center',
                fontWeight: 500
              }}
            >
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={mode === 'login' ? handleLoginSubmit : handleSignUpSubmit}>
            {/* If Sign Up: Full Name */}
            {mode === 'signup' && (
              <div style={{ marginBottom: '10px' }}>
                <input
                  type="text"
                  placeholder="Full Name (optional)"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{
                    width: '100%',
                    height: '42px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--apple-border, rgba(255, 255, 255, 0.12))',
                    padding: '0 14px',
                    fontSize: '13px',
                    color: 'var(--apple-label-primary, #ffffff)',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            )}

            {/* Field 1: Username / NetID / Email */}
            <div style={{ marginBottom: '10px' }}>
              <input
                type="text"
                placeholder={mode === 'login' ? 'Phone number, username or email' : 'Rutgers NetID or email'}
                value={netIdOrEmail}
                onChange={(e) => setNetIdOrEmail(e.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
                required
                style={{
                  width: '100%',
                  height: '44px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--apple-border, rgba(255, 255, 255, 0.12))',
                  padding: '0 14px',
                  fontSize: '13px',
                  color: 'var(--apple-label-primary, #ffffff)',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s'
                }}
              />
            </div>

            {/* Field 2: Password with Eye Toggle */}
            <div style={{ position: 'relative', marginBottom: mode === 'login' ? '12px' : '14px' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  height: '44px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--apple-border, rgba(255, 255, 255, 0.12))',
                  padding: '0 40px 0 14px',
                  fontSize: '13px',
                  color: 'var(--apple-label-primary, #ffffff)',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  color: 'var(--apple-label-secondary, #999)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>

            {/* Login Mode: Forgot Password Link */}
            {mode === 'login' && (
              <div style={{ textAlign: 'right', marginBottom: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowForgotPasswordInfo((prev) => !prev)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#0095F6',
                    cursor: 'pointer'
                  }}
                >
                  Forgot password?
                </button>
                {showForgotPasswordInfo && (
                  <div
                    style={{
                      marginTop: '6px',
                      fontSize: '11px',
                      color: 'var(--apple-label-secondary, #999)',
                      textAlign: 'right'
                    }}
                  >
                    Use NetID password, or click <strong>Continue as Scarlet Knight</strong> below.
                  </div>
                )}
              </div>
            )}

            {/* Sign Up Mode: Campus & Preferences Selection */}
            {mode === 'signup' && (
              <div
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--apple-border, rgba(255, 255, 255, 0.08))',
                  borderRadius: '12px',
                  padding: '12px',
                  marginBottom: '16px'
                }}
              >
                <div
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: 'var(--apple-label-secondary, #999)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '8px'
                  }}
                >
                  Transit Preferences
                </div>

                {/* Campus Select */}
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--apple-label-secondary, #aaa)', marginBottom: '4px' }}>
                    Home Campus
                  </label>
                  <select
                    value={campus}
                    onChange={(e) => setCampus(e.target.value)}
                    style={{
                      width: '100%',
                      height: '36px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid var(--apple-border, rgba(255, 255, 255, 0.1))',
                      color: '#fff',
                      fontSize: '12.5px',
                      padding: '0 10px',
                      outline: 'none'
                    }}
                  >
                    <option value="Busch" style={{ background: '#1c1c1e' }}>Busch Campus</option>
                    <option value="Livingston" style={{ background: '#1c1c1e' }}>Livingston Campus</option>
                    <option value="College Ave" style={{ background: '#1c1c1e' }}>College Ave Campus</option>
                    <option value="Cook" style={{ background: '#1c1c1e' }}>Cook / Douglass Campus</option>
                  </select>
                </div>

                {/* Walking Speed Chips */}
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--apple-label-secondary, #aaa)', marginBottom: '4px' }}>
                    <span>Walking Pace</span>
                    <span style={{ color: '#FF375F', fontWeight: 600 }}>{preferences.walking_speed}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                    {['2.0 mph', '2.5 mph', '3.0 mph', '3.5 mph'].map((spd) => (
                      <button
                        key={spd}
                        type="button"
                        onClick={() => setPreferences((p) => ({ ...p, walking_speed: spd }))}
                        style={{
                          padding: '6px 2px',
                          fontSize: '11px',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          backgroundColor: preferences.walking_speed === spd ? '#FF375F' : 'rgba(255, 255, 255, 0.08)',
                          color: '#fff',
                          fontWeight: preferences.walking_speed === spd ? 700 : 500
                        }}
                      >
                        {spd}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Weather Avoidance Toggles */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <label
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 8px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      fontSize: '11px',
                      color: 'var(--apple-label-primary, #fff)',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={preferences.avoid_rain}
                      onChange={(e) =>
                        setPreferences((p) => ({
                          ...p,
                          avoid_rain: e.target.checked,
                          avoid_bad_weather: e.target.checked || p.avoid_snow
                        }))
                      }
                      style={{ accentColor: '#FF375F' }}
                    />
                    <CloudRain size={13} color="#0A84FF" />
                    <span>Avoid Rain</span>
                  </label>

                  <label
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 8px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      fontSize: '11px',
                      color: 'var(--apple-label-primary, #fff)',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={preferences.avoid_snow}
                      onChange={(e) =>
                        setPreferences((p) => ({
                          ...p,
                          avoid_snow: e.target.checked,
                          avoid_bad_weather: e.target.checked || p.avoid_rain
                        }))
                      }
                      style={{ accentColor: '#FF375F' }}
                    />
                    <Snowflake size={13} color="#64D2FF" />
                    <span>Avoid Snow</span>
                  </label>
                </div>
              </div>
            )}

            {/* Primary Action Button (Log In / Sign Up) */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: '44px',
                borderRadius: '8px',
                backgroundColor: '#0095F6',
                border: 'none',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 700,
                cursor: loading ? 'default' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'background-color 0.15s, opacity 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(0, 149, 246, 0.35)'
              }}
            >
              {loading
                ? 'Connecting...'
                : mode === 'login'
                ? 'Log In'
                : 'Save Preferences & Create Account'}
            </button>
          </form>

          {/* Divider: OR (like in Instagram mockup) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              margin: '22px 0 18px',
              gap: '16px'
            }}
          >
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--apple-border, rgba(255, 255, 255, 0.1))' }} />
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--apple-label-tertiary, #777)',
                letterSpacing: '0.8px'
              }}
            >
              OR
            </span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--apple-border, rgba(255, 255, 255, 0.1))' }} />
          </div>

          {/* Secondary Action: Continue as Scarlet Knight (Like 'Continue as Dave Johnson') */}
          <div style={{ textAlign: 'center' }}>
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={loading}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#0095F6',
                fontSize: '13.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                borderRadius: '6px'
              }}
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '4px',
                  backgroundColor: '#0095F6',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 800
                }}
              >
                R
              </div>
              <span>Continue as Scarlet Knight</span>
            </button>
          </div>

          {/* Continue as Guest bypass link */}
          <div style={{ textAlign: 'center', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--apple-label-secondary, #888)',
                fontSize: '12px',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Continue as Guest
            </button>
          </div>
        </div>

        {/* Bottom Footer: Don't have an account? Sign Up. / Have an account? Log In. */}
        <div
          style={{
            borderTop: '1px solid var(--apple-border, rgba(255, 255, 255, 0.1))',
            padding: '18px 24px',
            textAlign: 'center',
            fontSize: '13px',
            color: 'var(--apple-label-secondary, #aaa)',
            backgroundColor: 'rgba(0, 0, 0, 0.15)'
          }}
        >
          {mode === 'login' ? (
            <span>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError('');
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  color: '#0095F6',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Sign Up.
              </button>
            </span>
          ) : (
            <span>
              Have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError('');
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  color: '#0095F6',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Log In.
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
