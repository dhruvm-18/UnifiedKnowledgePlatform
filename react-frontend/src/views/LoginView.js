import React, { useState, useEffect } from 'react';
import '../styles/LoginView.css';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaGithub, FaHeart, FaMagic, FaSun, FaMoon } from 'react-icons/fa';
import { GITHUB_CONFIG } from '../config/github';

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
  const [isAnimating, setIsAnimating] = useState(false);
  const [particles, setParticles] = useState([]);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const getUsers = () => JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  const saveUsers = (users) => localStorage.setItem(USERS_KEY, JSON.stringify(users));

  // Theme toggle function
  const toggleTheme = () => {
    const newTheme = isDarkMode ? 'light' : 'dark';
    setIsDarkMode(!isDarkMode);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark-mode', !isDarkMode);
  };

  // Handle GitHub OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    
    if (error) {
      setError('GitHub authentication was cancelled or failed.');
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }
    
    if (code) {
      handleGitHubCallback(code);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Apply theme on mount
  useEffect(() => {
    document.documentElement.classList.toggle('dark-mode', isDarkMode);
  }, [isDarkMode]);

  // Create floating particles
  useEffect(() => {
    const createParticle = () => ({
      id: Math.random(),
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 3 + 1,
      speedX: (Math.random() - 0.5) * 1.5,
      speedY: (Math.random() - 0.5) * 1.5,
      opacity: Math.random() * 0.4 + 0.2,
      color: `hsl(${Math.random() * 60 + 200}, 70%, 60%)`
    });

    const initialParticles = Array.from({ length: 30 }, createParticle);
    setParticles(initialParticles);

    const interval = setInterval(() => {
      setParticles(prev => prev.map(particle => ({
        ...particle,
        x: particle.x + particle.speedX,
        y: particle.y + particle.speedY,
        opacity: particle.opacity + (Math.random() - 0.5) * 0.1
      })).map(particle => {
        if (particle.x < 0 || particle.x > window.innerWidth || 
            particle.y < 0 || particle.y > window.innerHeight) {
          return createParticle();
        }
        return particle;
      }));
    }, 50);

    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setLoading(true);
    setIsAnimating(true);
    
    setTimeout(() => {
      setLoading(false);
      setIsAnimating(false);
      const users = getUsers();
      const user = users.find(u => u.email === email && u.password === password);
      
      // Check for admin account
      if (email === 'dhruv.mendiratta4@gmail.com' && password === 'Dhruv@9013669130') {
        const adminData = { 
          name: 'Dhruv Mendiratta', 
          email: 'dhruv.mendiratta4@gmail.com', 
          avatar: null, 
          isAdmin: true,
          role: 'Administrator'
        };
        localStorage.setItem('ukpUser', JSON.stringify(adminData));
        onLogin && onLogin({ email, name: adminData.name, avatar: adminData.avatar, isAdmin: true, role: adminData.role });
        return;
      }
      
      if ((email === 'demo@ukp.com' && password === 'password') || user) {
        const userData = user || { name: 'Demo User', email: 'demo@ukp.com', avatar: null, isAdmin: false, role: 'User' };
        localStorage.setItem('ukpUser', JSON.stringify(userData));
        onLogin && onLogin({ email, name: userData.name, avatar: userData.avatar, isAdmin: false, role: userData.role });
      } else {
        setError('Invalid email or password.');
      }
    }, 1500);
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
    const userData = { name: regName, email: regEmail, password: regPassword, avatar: regAvatar, isAdmin: false, role: 'User' };
    users.push(userData);
    saveUsers(users);
    localStorage.setItem('ukpUser', JSON.stringify(userData));
    onLogin && onLogin({ email: regEmail, name: regName, avatar: regAvatar, isAdmin: false, role: 'User' });
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

  const handleGitHubLogin = () => {
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CONFIG.CLIENT_ID}&redirect_uri=${encodeURIComponent(GITHUB_CONFIG.REDIRECT_URI)}&scope=${encodeURIComponent(GITHUB_CONFIG.SCOPE)}&state=${Math.random().toString(36).substring(7)}`;
    window.location.href = githubAuthUrl;
  };

  const handleGitHubCallback = async (code) => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch('http://localhost:5000/api/github/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        throw new Error('GitHub authentication failed');
      }

      const data = await response.json();
      const { access_token, user } = data;

      const users = getUsers();
      const existingUser = users.find(u => u.email === user.email);
      
      let userData;
      if (existingUser) {
        existingUser.name = user.name || user.login;
        existingUser.avatar = user.avatar_url;
        existingUser.githubId = user.id;
        existingUser.githubUsername = user.login;
        userData = existingUser;
      } else {
        userData = {
          name: user.name || user.login,
          email: user.email,
          avatar: user.avatar_url,
          githubId: user.id,
          githubUsername: user.login,
          isAdmin: false,
          role: 'User',
          createdAt: new Date().toISOString()
        };
        users.push(userData);
        saveUsers(users);
      }
      
      localStorage.setItem('ukpUser', JSON.stringify(userData));
      onLogin && onLogin({ 
        email: user.email, 
        name: userData.name, 
        avatar: userData.avatar, 
        isAdmin: userData.isAdmin, 
        role: userData.role 
      });
    } catch (error) {
      console.error('GitHub login error:', error);
      setError('GitHub login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Theme Toggle Button */}
      <button 
        className="theme-toggle-btn"
        onClick={toggleTheme}
        title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {isDarkMode ? <FaSun /> : <FaMoon />}
      </button>

      {/* Animated Background */}
      <div className="animated-background">
        <div className="gradient-overlay"></div>
        <div className="floating-shapes">
          {[...Array(12)].map((_, i) => (
            <div key={i} className={`floating-shape shape-${i % 4}`} style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${Math.random() * 10 + 10}s`
            }}></div>
          ))}
        </div>
        
        {/* Floating Particles */}
        {particles.map(particle => (
          <div
            key={particle.id}
            className="particle"
            style={{
              left: `${particle.x}px`,
              top: `${particle.y}px`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              backgroundColor: particle.color,
              opacity: particle.opacity
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="login-content">
        {/* Left Panel - Features */}
        <div className="features-panel">
          <div className="features-content">
            <div className="logo-section">
              <div className="logo-container">
                <img src="/unified-knowledge-platform.png" alt="Logo" className="main-logo" />
                <div className="logo-glow"></div>
              </div>
              <h1 className="app-title">{APP_NAME}</h1>
              <p className="app-subtitle">AI-Powered Knowledge Management</p>
            </div>


          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div className="login-panel">
      <div className="login-card">
        {showForgot ? (
              <div className="forgot-password-form">
                <div className="form-header">
                  <button type="button" className="back-button" onClick={() => setShowForgot(false)}>
                    <span>←</span> Back
                  </button>
                  <h2>Reset Password</h2>
            </div>
                
                <form onSubmit={handleForgotPassword} className="form">
                  <div className="input-group">
                    <label>Email</label>
                    <div className="input-wrapper">
                      <FaEnvelope className="input-icon" />
              <input
                type="email"
                value={fpEmail}
                onChange={e => setFpEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
                    </div>
                  </div>
                  
                  <div className="input-group">
                    <label>Old Password</label>
                    <div className="input-wrapper">
                      <FaLock className="input-icon" />
              <input
                type="password"
                value={fpOldPassword}
                onChange={e => setFpOldPassword(e.target.value)}
                placeholder="Enter old password"
                required
              />
                    </div>
                  </div>
                  
                  <div className="input-group">
                    <label>New Password</label>
                    <div className="input-wrapper">
                      <FaLock className="input-icon" />
              <input
                type="password"
                value={fpNewPassword}
                onChange={e => setFpNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
              />
                    </div>
                  </div>
                  
                  <div className="input-group">
                    <label>Confirm Password</label>
                    <div className="input-wrapper">
                      <FaLock className="input-icon" />
              <input
                type="password"
                value={fpConfirmPassword}
                onChange={e => setFpConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
              />
                    </div>
                  </div>
                  
                  {fpError && <div className="error-message">{fpError}</div>}
                  {fpSuccess && <div className="success-message">{fpSuccess}</div>}
                  
                  <button type="submit" className="submit-button" disabled={fpLoading}>
                    {fpLoading ? <div className="spinner"></div> : 'Update Password'}
              </button>
            </form>
              </div>
        ) : (
          <>
            {!showRegister ? (
                  <div className="login-form">
                    <div className="form-header">
                      <h2>Welcome Back</h2>
                      <p>Sign in to continue</p>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="form">
                      <div className="input-group">
                        <label>Email</label>
                        <div className="input-wrapper">
                    <FaEnvelope className="input-icon" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                            placeholder="Enter your email"
                      required
                    />
                  </div>
                      </div>
                      
                      <div className="input-group">
                        <label>Password</label>
                        <div className="input-wrapper">
                    <FaLock className="input-icon" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                            placeholder="Enter your password"
                      required
                    />
                          <button 
                            type="button" 
                            className="password-toggle"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                      </div>
                      
                      {error && <div className="error-message">{error}</div>}
                      
                      <button type="submit" className={`submit-button ${isAnimating ? 'animating' : ''}`} disabled={loading}>
                        {loading ? (
                          <div className="loading-content">
                            <div className="spinner"></div>
                            <span>Signing In...</span>
                          </div>
                        ) : (
                          <div className="button-content">
                            <FaMagic />
                            <span>Sign In</span>
                          </div>
                        )}
                  </button>
                </form>
                    
                    <div className="divider">
                      <span>or</span>
                    </div>
                    
                    <div className="github-section">
                      <h3 className="github-heading">Login or Sign up with GitHub</h3>
                      <button 
                        type="button" 
                        className="github-button"
                        onClick={handleGitHubLogin}
                        disabled={loading}
                      >
                        <FaGithub />
                      </button>
                </div>
                    
                    <div className="form-footer">
                      <button type="button" className="link-button" onClick={() => setShowForgot(true)}>
                        Forgot password?
                      </button>
                      <div className="register-prompt">
                  <span>Don't have an account?</span>
                        <button type="button" className="link-button" onClick={() => setShowRegister(true)}>
                          Create one
                        </button>
                      </div>
                    </div>
                </div>
            ) : (
                  <div className="register-form">
                    <div className="form-header">
                      <button type="button" className="back-button" onClick={() => setShowRegister(false)}>
                        <span>←</span> Back
                      </button>
                      <h2>Create Account</h2>
                      <p>Join the future</p>
                </div>
                    
                    <form onSubmit={handleRegister} className="form">
                      <div className="input-group">
                        <label>Full Name</label>
                        <div className="input-wrapper">
                          <FaEnvelope className="input-icon" />
                  <input
                    type="text"
                    value={regName}
                    onChange={e => setRegName(e.target.value)}
                            placeholder="Enter your full name"
                    required
                  />
                        </div>
                      </div>
                      
                      <div className="input-group">
                        <label>Email</label>
                        <div className="input-wrapper">
                          <FaEnvelope className="input-icon" />
                  <input
                    type="email"
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                  />
                        </div>
                      </div>
                      
                      <div className="input-group">
                        <label>Password</label>
                        <div className="input-wrapper">
                          <FaLock className="input-icon" />
                  <input
                    type="password"
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    placeholder="Create a password"
                    required
                  />
                        </div>
                      </div>
                      
                      <div className="input-group">
                        <label>Profile Picture (Optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                          className="file-input"
                  />
                        {regAvatar && (
                          <div className="avatar-preview">
                            <img src={regAvatar} alt="Avatar preview" />
                          </div>
                        )}
                      </div>
                      
                      {regError && <div className="error-message">{regError}</div>}
                      
                      <button type="submit" className="submit-button">
                        <div className="button-content">
                          <FaHeart />
                          <span>Create Account</span>
                        </div>
                      </button>
                </form>
                    

                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginView; 