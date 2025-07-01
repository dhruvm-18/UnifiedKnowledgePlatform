import React, { useState } from 'react';
import '../styles/LoginView.css';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';

const APP_NAME = 'Unified Knowledge Platform';
const USERS_KEY = 'ukpUsers';

function LoginView({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regAvatar, setRegAvatar] = useState(null);
  const [regError, setRegError] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [fpEmail, setFpEmail] = useState('');
  const [fpOldPassword, setFpOldPassword] = useState('');
  const [fpNewPassword, setFpNewPassword] = useState('');
  const [fpConfirmPassword, setFpConfirmPassword] = useState('');
  const [fpError, setFpError] = useState('');
  const [fpSuccess, setFpSuccess] = useState('');
  const [fpLoading, setFpLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const getUsers = () => JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  const saveUsers = (users) => localStorage.setItem(USERS_KEY, JSON.stringify(users));

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const users = getUsers();
      const user = users.find(u => u.email === email && u.password === password);
      if ((email === 'demo@ukp.com' && password === 'password') || user) {
        const userData = user || { name: 'Demo User', email: 'demo@ukp.com', avatar: null };
        localStorage.setItem('ukpUser', JSON.stringify(userData));
        onLogin && onLogin({ email, name: userData.name, avatar: userData.avatar });
      } else {
        setError('Invalid email or password.');
      }
    }, 900);
  };

  const handleRegister = (e) => {
    e.preventDefault();
    setRegError('');
    if (!regName || !regEmail || !regPassword) {
      setRegError('Please fill in all fields.');
      return;
    }
    const users = getUsers();
    if (users.some(u => u.email === regEmail)) {
      setRegError('An account with this email already exists.');
      return;
    }
    const userData = { name: regName, email: regEmail, password: regPassword, avatar: regAvatar };
    users.push(userData);
    saveUsers(users);
    localStorage.setItem('ukpUser', JSON.stringify(userData));
    onLogin && onLogin({ email: regEmail, name: regName, avatar: regAvatar });
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setRegAvatar(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    setFpError('');
    setFpSuccess('');
    setFpLoading(true);
    setTimeout(() => {
      setFpLoading(false);
      const users = getUsers();
      const idx = users.findIndex(u => u.email === fpEmail);
      if (idx === -1) {
        setFpError('No account found with this email.');
        return;
      }
      if (users[idx].password !== fpOldPassword) {
        setFpError('Old password is incorrect.');
        return;
      }
      if (fpNewPassword.length < 4) {
        setFpError('New password must be at least 4 characters.');
        return;
      }
      if (fpNewPassword !== fpConfirmPassword) {
        setFpError('New passwords do not match.');
        return;
      }
      users[idx].password = fpNewPassword;
      saveUsers(users);
      setFpSuccess('Password updated! You can now log in with your new password.');
      setFpEmail(''); setFpOldPassword(''); setFpNewPassword(''); setFpConfirmPassword('');
    }, 900);
  };

  return (
    <div className="login-bg">
      {/* SVG background for crazy visuals */}
      <svg className="crazy-bg-svg" viewBox="0 0 1440 900" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="crazy1" x1="0" y1="0" x2="1440" y2="900" gradientUnits="userSpaceOnUse">
            <stop stopColor="#a084e8" />
            <stop offset="1" stopColor="#f8fafc" />
          </linearGradient>
          <linearGradient id="crazy2" x1="0" y1="900" x2="1440" y2="0" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6c2eb7" />
            <stop offset="1" stopColor="#a084e8" />
          </linearGradient>
        </defs>
        <ellipse cx="1200" cy="120" rx="320" ry="90" fill="url(#crazy1)" opacity="0.22" />
        <ellipse cx="300" cy="800" rx="340" ry="120" fill="url(#crazy2)" opacity="0.18" />
        <rect x="900" y="600" width="320" height="80" rx="40" fill="#a084e8" opacity="0.13" transform="rotate(-8 1060 640)" />
        <rect x="-80" y="100" width="420" height="120" rx="60" fill="#6c2eb7" opacity="0.11" transform="rotate(7 130 160)" />
        <path d="M0,700 Q720,900 1440,700 L1440,900 L0,900 Z" fill="url(#crazy2)" opacity="0.13" />
      </svg>
      <div className="login-card">
        {showForgot ? (
          <>
            <div className="login-back-top">
              <a href="#" className="forgot-link" onClick={e => { e.preventDefault(); setShowForgot(false); }}>← Back to login</a>
            </div>
            <img src="/unified-knowledge-platform.png" alt="App Logo" className="login-logo" />
            <h1 className="login-title">{APP_NAME}</h1>
            <form className="login-form" onSubmit={handleForgotPassword}>
              <label htmlFor="fpEmail">Email</label>
              <input
                id="fpEmail"
                type="email"
                value={fpEmail}
                onChange={e => setFpEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
              <label htmlFor="fpOldPassword">Old Password</label>
              <input
                id="fpOldPassword"
                type="password"
                value={fpOldPassword}
                onChange={e => setFpOldPassword(e.target.value)}
                placeholder="Enter old password"
                required
              />
              <label htmlFor="fpNewPassword">New Password</label>
              <input
                id="fpNewPassword"
                type="password"
                value={fpNewPassword}
                onChange={e => setFpNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
              />
              <label htmlFor="fpConfirmPassword">Confirm New Password</label>
              <input
                id="fpConfirmPassword"
                type="password"
                value={fpConfirmPassword}
                onChange={e => setFpConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
              />
              {fpError && <div className="login-error">{fpError}</div>}
              {fpSuccess && <div className="login-success">{fpSuccess}</div>}
              <button className="login-btn" type="submit" disabled={fpLoading}>
                {fpLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </>
        ) : (
          <>
            {!showRegister ? (
              <>
                <img src="/unified-knowledge-platform.png" alt="App Logo" className="login-logo" />
                <h1 className="login-title">{APP_NAME}</h1>
                <div className="login-welcome">Welcome back! Please sign in to continue.</div>
                <form className="login-form" onSubmit={handleSubmit}>
                  <label htmlFor="email">Email</label>
                  <div className="input-icon-row">
                    <FaEnvelope className="input-icon" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      autoComplete="username"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                  <label htmlFor="password">Password</label>
                  <div className="input-icon-row">
                    <FaLock className="input-icon" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      required
                    />
                    <button type="button" className="show-password-btn" tabIndex={-1} onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                  {error && <div className="login-banner error-banner">{error}</div>}
                  <button className="login-btn" type="submit" disabled={loading}>
                    {loading ? <span className="spinner"></span> : 'Login'}
                  </button>
                </form>
                <div className="login-footer">
                  <a href="#" className="forgot-link" onClick={e => { e.preventDefault(); setShowForgot(true); }}>Forgot password?</a>
                </div>
                <div className="login-divider"><span>or</span></div>
                <div className="login-register-row">
                  <span>Don't have an account?</span>
                  <a href="#" className="forgot-link" style={{ marginLeft: 6 }} onClick={e => { e.preventDefault(); setShowRegister(true); }}>Create one</a>
                </div>
              </>
            ) : (
              <>
                <div className="login-back-top">
                  <a href="#" className="forgot-link" onClick={e => { e.preventDefault(); setShowRegister(false); }}>← Back to login</a>
                </div>
                <img src="/unified-knowledge-platform.png" alt="App Logo" className="login-logo" />
                <h1 className="login-title">{APP_NAME}</h1>
                <form className="login-form" onSubmit={handleRegister}>
                  <label htmlFor="regName">Name</label>
                  <input
                    id="regName"
                    type="text"
                    value={regName}
                    onChange={e => setRegName(e.target.value)}
                    placeholder="Your name"
                    required
                  />
                  <label htmlFor="regEmail">Email</label>
                  <input
                    id="regEmail"
                    type="email"
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                  />
                  <label htmlFor="regPassword">Password</label>
                  <input
                    id="regPassword"
                    type="password"
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    placeholder="Create a password"
                    required
                  />
                  <label htmlFor="regAvatar">Avatar (optional)</label>
                  <input
                    id="regAvatar"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                  />
                  {regAvatar && <img src={regAvatar} alt="Avatar preview" style={{ width: 48, height: 48, borderRadius: '50%', margin: '0.5rem auto' }} />}
                  {regError && <div className="login-error">{regError}</div>}
                  <button className="login-btn" type="submit">Create Account</button>
                </form>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default LoginView; 