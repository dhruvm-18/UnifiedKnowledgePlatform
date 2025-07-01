import React, { useState } from 'react';
import '../styles/LoginView.css';

const APP_NAME = 'Unified Knowledge Platform';

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

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setLoading(true);
    // Placeholder: Replace with real authentication logic
    setTimeout(() => {
      setLoading(false);
      // Check localStorage for registered user
      const userData = JSON.parse(localStorage.getItem('ukpUser'));
      if ((email === 'demo@ukp.com' && password === 'password') || (userData && userData.email === email && userData.password === password)) {
        onLogin && onLogin({ email, name: userData?.name, avatar: userData?.avatar });
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
    // Save to localStorage (for demo)
    const userData = { name: regName, email: regEmail, password: regPassword, avatar: regAvatar };
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

  return (
    <div className="login-bg">
      <div className="login-card">
        <img src="/unified-knowledge-platform.png" alt="App Logo" className="login-logo" />
        <h1 className="login-title">{APP_NAME}</h1>
        {!showRegister ? (
          <>
            <form className="login-form" onSubmit={handleSubmit}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="username"
                placeholder="Enter your email"
                required
              />
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Enter your password"
                required
              />
              {error && <div className="login-error">{error}</div>}
              <button className="login-btn" type="submit" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>
            <div className="login-footer">
              <a href="#" className="forgot-link">Forgot password?</a>
              <span style={{ margin: '0 8px', color: '#bbb' }}>|</span>
              <a href="#" className="forgot-link" onClick={e => { e.preventDefault(); setShowRegister(true); }}>Create new account</a>
            </div>
          </>
        ) : (
          <>
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
            <div className="login-footer">
              <a href="#" className="forgot-link" onClick={e => { e.preventDefault(); setShowRegister(false); }}>Back to login</a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default LoginView; 