import React, { useState, useEffect } from 'react';
import '../styles/LoginView.css';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaGithub, FaHeart, FaMagic, FaSun, FaMoon, FaUserPlus, FaUser } from 'react-icons/fa';
import { GITHUB_CONFIG } from '../config/github';
import CustomAuthAnimation from '../components/CustomAuthAnimation';
import OTPVerification from '../components/OTPVerification';
import AccountCreation from '../components/AccountCreation';
import AnimatedScene from '../components/AnimatedScene';

const APP_NAME = 'Unified Knowledge Platform';
const USERS_KEY = 'ukpUsers';

function LoginView({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
  const [showAuthAnimation, setShowAuthAnimation] = useState(false);
  const [pendingLoginData, setPendingLoginData] = useState(null);
  const [showOTP, setShowOTP] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpSuccess, setOtpSuccess] = useState('');
  const [showAccountCreation, setShowAccountCreation] = useState(false);
  const [otpType, setOtpType] = useState('password_reset');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  const handleAnimationComplete = () => {
    console.log('Animation completed, processing login...');
    setLoading(false);
    setIsAnimating(false);
    setShowAuthAnimation(false);
    
    // Get login data from localStorage as backup
    const storedLoginData = localStorage.getItem('pendingLoginData');
    const loginData = pendingLoginData || (storedLoginData ? JSON.parse(storedLoginData) : null);
    
    if (!loginData) {
      console.log('No pending login data found');
      return;
    }
    
    console.log('Processing login for:', loginData.email);
    
    // Check if this is a GitHub login (has githubId)
    if (loginData.githubId) {
      console.log('GitHub login detected');
      const userData = {
        name: loginData.name,
        email: loginData.email,
        avatar: loginData.avatar,
        githubId: loginData.githubId,
        githubUsername: loginData.githubUsername,
        isAdmin: loginData.isAdmin,
        role: loginData.role
      };
      localStorage.setItem('ukpUser', JSON.stringify(userData));
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userEmail', userData.email);
      localStorage.setItem('userIsAdmin', userData.isAdmin ? 'true' : 'false');
      localStorage.setItem('githubId', userData.githubId);
      localStorage.setItem('githubUsername', userData.githubUsername);
      console.log('Calling onLogin with GitHub user data');
      onLogin && onLogin({ 
        email: loginData.email, 
        name: loginData.name, 
        avatar: loginData.avatar, 
        isAdmin: loginData.isAdmin, 
        role: loginData.role 
      });
      setPendingLoginData(null);
      localStorage.removeItem('pendingLoginData');
      return;
    }
    
    // Regular email/password login
    const users = getUsers();
    const user = users.find(u => u.email === loginData.email && u.password === loginData.password);
    
    // Check for admin account
    if (loginData.email === 'dhruv.mendiratta4@gmail.com' && loginData.password === 'Dhruv@9013669130') {
      console.log('Admin login detected');
      const adminData = { 
        name: 'Dhruv Mendiratta', 
        email: 'dhruv.mendiratta4@gmail.com', 
        avatar: null, 
        isAdmin: true,
        role: 'Administrator'
      };
      localStorage.setItem('ukpUser', JSON.stringify(adminData));
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userEmail', adminData.email);
      localStorage.setItem('userIsAdmin', 'true');
      console.log('Calling onLogin with admin data');
      onLogin && onLogin({ email: loginData.email, name: adminData.name, avatar: adminData.avatar, isAdmin: true, role: adminData.role });
      setPendingLoginData(null);
      localStorage.removeItem('pendingLoginData');
      return;
    }
    
    if ((loginData.email === 'demo@unified.com' && loginData.password === 'password') || user) {
      console.log('Regular user login detected');
              const userData = user || { name: 'Demo User', email: 'demo@unified.com', avatar: null, isAdmin: false, role: 'User' };
      localStorage.setItem('ukpUser', JSON.stringify(userData));
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userEmail', userData.email);
      localStorage.setItem('userIsAdmin', userData.isAdmin ? 'true' : 'false');
      console.log('Calling onLogin with user data');
      onLogin && onLogin({ email: loginData.email, name: userData.name, avatar: userData.avatar, isAdmin: userData.isAdmin, role: userData.role });
    } else {
      console.log('Invalid credentials');
      setError('Invalid email or password.');
    }
    setPendingLoginData(null);
    localStorage.removeItem('pendingLoginData');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    
    const loginData = { email, password };
    setPendingLoginData(loginData);
    // Also store in localStorage as backup
    localStorage.setItem('pendingLoginData', JSON.stringify(loginData));
    
    setShowAuthAnimation(true);
    setLoading(true);
    setIsAnimating(true);
    
    // The new animation takes about 5 seconds (5 stages * 1 second each)
    setTimeout(() => {
      handleAnimationComplete();
    }, 5500); // Slightly longer than the animation to ensure it completes
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

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setOtpError('');
    setOtpSuccess('');
    setOtpLoading(true);
    setOtpType('password_reset'); // Set type for forgot password

    try {
      const response = await fetch('http://localhost:5000/api/otp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: fpEmail, type: 'password_reset' }),
      });

      const data = await response.json();

      if (response.ok) {
        setOtpEmail(fpEmail);
        setShowOTP(true);
        setOtpSuccess('OTP sent successfully! Check your email.');
      } else {
        setOtpError(data.error || 'Failed to send OTP');
      }
    } catch (err) {
      setOtpError('Network error. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleOTPBack = () => {
    setShowOTP(false);
    setOtpEmail('');
    setOtpError('');
    setOtpSuccess('');
    setOtpType('password_reset');
  };

  const handleOTPSuccess = () => {
    setShowOTP(false);
    setShowForgot(false);
    setOtpEmail('');
    setOtpError('');
    setOtpSuccess('');
    setOtpType('password_reset');
    setFpEmail('');
    setFpOldPassword('');
    setFpNewPassword('');
    setFpConfirmPassword('');
  };

  const handleAccountCreationBack = () => {
    setShowAccountCreation(false);
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    });
    setError('');
    setSuccess('');
  };

  const handleAccountCreationSuccess = (accountData) => {
    setShowAccountCreation(false);
    setShowOTP(false);
    setOtpEmail('');
    setOtpError('');
    setOtpSuccess('');
    setOtpType('password_reset');
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    });
    setError(''); // Clear any existing errors
    setSuccess(`Account created successfully! Welcome ${accountData.name}! You can now login.`);
    setTimeout(() => setSuccess(''), 5000);
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!formData.name || !formData.email || !formData.password) {
      setError('Please fill in all fields.');
      return;
    }

    const users = getUsers();
    if (users.some(u => u.email === formData.email)) {
      setError('An account with this email already exists.');
      return;
    }

    // Send OTP for account creation instead of directly creating account
    setLoading(true);
    setOtpType('account_creation'); // Set type for account creation
    try {
      const response = await fetch('http://localhost:5000/api/otp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: formData.email, type: 'account_creation' }),
      });

      const data = await response.json();

      if (response.ok) {
        setOtpEmail(formData.email);
        setShowOTP(true);
        setOtpSuccess('OTP sent successfully! Check your email.');
      } else {
        setError(data.error || 'Failed to send OTP');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGitHubLogin = () => {
    setLoading(true);
    
    // Redirect immediately to GitHub without showing animation
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CONFIG.CLIENT_ID}&redirect_uri=${encodeURIComponent(GITHUB_CONFIG.REDIRECT_URI)}&scope=${encodeURIComponent(GITHUB_CONFIG.SCOPE)}&state=${Math.random().toString(36).substring(7)}`;
    window.location.href = githubAuthUrl;
  };

  const handleGitHubCallback = async (code) => {
    try {
      // Start animation immediately when callback is received
      setShowAuthAnimation(true);
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
      
      // Store login data for animation completion
      const loginData = { 
        email: user.email, 
        name: userData.name, 
        avatar: userData.avatar, 
        isAdmin: userData.isAdmin, 
        role: userData.role,
        githubId: user.id,
        githubUsername: user.login
      };
      localStorage.setItem('pendingLoginData', JSON.stringify(loginData));
      
      // Animation will complete after 5.5 seconds and call handleAnimationComplete
      setTimeout(() => {
        handleAnimationComplete();
      }, 5500);
      
    } catch (error) {
      console.error('GitHub login error:', error);
      setError('GitHub login failed. Please try again.');
      setShowAuthAnimation(false);
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
        {/* Left Panel - Animated Scene */}
        <div className="features-panel">
          <AnimatedScene />
        </div>

        {/* Right Panel - Login Form */}
        <div className="login-panel">
      <div className="login-card">
            {showOTP ? (
              <OTPVerification 
                email={otpEmail}
                onBack={handleOTPBack}
                onSuccess={handleOTPSuccess}
                type={otpType}
                accountData={otpType === 'account_creation' ? formData : null}
              />
            ) : showAccountCreation ? (
              <div className="forgot-password-form">
                <div className="form-header">
                  <button type="button" className="back-button" onClick={handleAccountCreationBack}>
                    <span>←</span> Back
                  </button>
                  <h2>Create Account</h2>
                  <p>Enter your details to create a new account</p>
                </div>
                
                <form className="form">
                  <div className="input-group">
                    <label>Full Name</label>
                    <div className="input-wrapper">
                      <FaUser className="input-icon" />
                      <input
                        type="text"
                        name="name"
                        placeholder="Enter your full name"
                        value={formData.name}
                        onChange={handleInputChange}
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
                        name="email"
                        placeholder="Enter your email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="input-group">
                    <label>Password</label>
                    <div className="input-wrapper">
                      <FaLock className="input-icon" />
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={handleInputChange}
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

                  <div className="input-group">
                    <label>Confirm Password</label>
                    <div className="input-wrapper">
                      <FaLock className="input-icon" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        placeholder="Confirm your password"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        required
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                  </div>

                  {error && <div className="error-message">{error}</div>}
                  {success && <div className="success-message">{success}</div>}

                  <button
                    type="button"
                    className="submit-button"
                    onClick={handleCreateAccount}
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="loading-content">
                        <div className="spinner"></div>
                        <span>Sending OTP...</span>
                      </div>
                    ) : (
                      <div className="button-content">
                        <FaUser />
                        <span>Create Account</span>
                      </div>
                    )}
                  </button>
                </form>
              </div>
            ) : showAuthAnimation ? (
              <div className="auth-animation-container">
                <CustomAuthAnimation />
              </div>
            ) : (
              <>
        {showForgot ? (
              <div className="forgot-password-form">
                <div className="form-header">
                  <button type="button" className="back-button" onClick={() => setShowForgot(false)}>
                    <span>←</span> Back
                  </button>
                  <h2>Reset Password</h2>
                      <p>Enter your email to receive a verification code</p>
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
                  
                      {otpError && <div className="error-message">{otpError}</div>}
                      {otpSuccess && <div className="success-message">{otpSuccess}</div>}
                  
                      <button type="submit" className="submit-button" disabled={otpLoading}>
                        {otpLoading ? <div className="spinner"></div> : 'Send OTP'}
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
                      {success && <div className="success-message">{success}</div>}
                      
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
                        <button type="button" className="link-button" onClick={() => setShowAccountCreation(true)}>
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginView; 