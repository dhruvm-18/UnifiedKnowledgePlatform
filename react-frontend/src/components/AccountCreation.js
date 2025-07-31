import React, { useState, useRef, useEffect } from 'react';
import { FaEnvelope, FaLock, FaUser, FaArrowLeft, FaCheckCircle, FaEye, FaEyeSlash } from 'react-icons/fa';

const AccountCreation = ({ onBack, onSuccess }) => {
  const [step, setStep] = useState(1); // 1: Account details, 2: OTP verification, 3: Success
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  const [canResend, setCanResend] = useState(true);
  const [resendTime, setResendTime] = useState(0);
  
  const otpRefs = useRef([]);

  // Timer for OTP expiry
  useEffect(() => {
    let timer;
    if (step === 2 && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setError('OTP has expired. Please request a new one.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  // Timer for resend cooldown
  useEffect(() => {
    let timer;
    if (resendTime > 0) {
      timer = setInterval(() => {
        setResendTime(prev => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendTime]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Name is required');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!formData.email.includes('@')) {
      setError('Please enter a valid email address');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleCreateAccount = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/otp/create-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStep(2);
        setTimeLeft(600); // Reset timer
        setSuccess('OTP sent to your email!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to create account');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    // Handle pasting 6 digits
    if (value.length === 6 && /^\d{6}$/.test(value)) {
      const digits = value.split('');
      setOtp(digits);
      setError('');
      // Auto-verify after a short delay
      setTimeout(() => {
        handleVerifyOTP();
      }, 500);
      return;
    }
    
    // Handle single digit input
    if (value.length > 1) return; // Only allow single digit
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    // Move to next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    } else if (value && index === 5) {
      // Auto-verify when last digit is entered
      setTimeout(() => {
        handleVerifyOTP();
      }, 300);
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    
    // Handle arrow keys
    if (e.key === 'ArrowLeft' && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
    
    // Handle paste
    if (e.ctrlKey && e.key === 'v') {
      e.preventDefault();
      navigator.clipboard.readText().then(text => {
        if (text.length === 6 && /^\d{6}$/.test(text)) {
          const digits = text.split('');
          setOtp(digits);
          setError('');
          // Auto-verify after a short delay
          setTimeout(() => {
            handleVerifyOTP();
          }, 500);
        }
      });
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    
    if (pastedText.length === 6 && /^\d{6}$/.test(pastedText)) {
      const digits = pastedText.split('');
      setOtp(digits);
      setError('');
      // Auto-verify after a short delay
      setTimeout(() => {
        handleVerifyOTP();
      }, 500);
    }
  };



  const handleVerifyOTP = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setError('Please enter the complete OTP');
      return;
    }

    // Don't show error if we're already loading (auto-verification)
    if (!loading) {
      setLoading(true);
      setError('');
    }

    try {
      const response = await fetch('http://localhost:5000/api/otp/verify-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          otp: otpString
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStep(3);
        // Store user data in localStorage
        const users = JSON.parse(localStorage.getItem('ukpUsers') || '[]');
        users.push({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          isAdmin: false,
          isFeedbackManager: false
        });
        localStorage.setItem('ukpUsers', JSON.stringify(users));
        
        if (onSuccess) {
          onSuccess(data.account);
        }
      } else {
        setError(data.error || 'Failed to verify OTP');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/otp/create-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setTimeLeft(600);
        setCanResend(false);
        setResendTime(60); // 1 minute cooldown
        setSuccess('New OTP sent!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to resend OTP');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderAccountDetailsStep = () => (
    <div className="account-details-step" style={{ animation: 'fadeInScale 0.6s ease' }}>
      <div className="step-header">
        <h2 style={{ 
          background: 'linear-gradient(135deg, #6c2eb7 0%, #8b5cf6 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          animation: 'textGlow 2s ease-in-out infinite alternate'
        }}>
          Create Account
        </h2>
        <p style={{ animation: 'fadeInUp 0.5s ease 0.1s both' }}>
          Enter your details to create a new account
        </p>
      </div>

      <div className="form-group">
        <div className="input-container">
          <FaUser className="input-icon" />
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            value={formData.name}
            onChange={handleInputChange}
            className="form-input"
          />
        </div>
      </div>

      <div className="form-group">
        <div className="input-container">
          <FaEnvelope className="input-icon" />
          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={formData.email}
            onChange={handleInputChange}
            className="form-input"
          />
        </div>
      </div>

      <div className="form-group">
        <div className="input-container">
          <FaLock className="input-icon" />
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleInputChange}
            className="form-input"
          />
          <button
            type="button"
            className="toggle-password"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>
      </div>

      <div className="form-group">
        <div className="input-container">
          <FaLock className="input-icon" />
          <input
            type={showConfirmPassword ? "text" : "password"}
            name="confirmPassword"
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            className="form-input"
          />
          <button
            type="button"
            className="toggle-password"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="button-group">
        <button
          type="button"
          className="back-btn"
          onClick={onBack}
        >
          <FaArrowLeft /> Back to Login
        </button>
        <button
          type="button"
          className="create-btn"
          onClick={handleCreateAccount}
          disabled={loading}
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
      </div>
    </div>
  );

  const renderOTPStep = () => (
    <div className="otp-step">
      <div className="step-header">
        <h2>Verify Your Email</h2>
        <p>We've sent a 6-digit code to {formData.email}</p>
      </div>

      <div className="otp-input-container">
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={el => otpRefs.current[index] = el}
            type="text"
            maxLength="1"
            value={digit}
            onChange={(e) => handleOtpChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            className="otp-input"
            placeholder="0"
            inputMode="numeric"
            pattern="[0-9]*"
          />
        ))}
      </div>
      


      <div className="timer-container">
        <span className="timer">Time remaining: {formatTime(timeLeft)}</span>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="button-group">
        <button
          type="button"
          className="back-btn"
          onClick={() => setStep(1)}
        >
          <FaArrowLeft /> Back
        </button>
              <button
        type="button"
        className="verify-btn"
        onClick={handleVerifyOTP}
        disabled={loading || otp.join('').length !== 6}
      >
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="spinner" style={{ width: '16px', height: '16px', border: '2px solid #ffffff', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            Verifying...
          </div>
        ) : (
          'Verify & Create Account'
        )}
      </button>
      </div>

      <div className="resend-container">
        <button
          type="button"
          className="resend-btn"
          onClick={handleResendOTP}
          disabled={!canResend || loading}
        >
          {canResend ? 'Resend OTP' : `Resend in ${resendTime}s`}
        </button>
      </div>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="success-step">
      <div className="success-icon">
        <FaCheckCircle />
      </div>
      <h2>Account Created Successfully!</h2>
      <p>Welcome to Unified Knowledge Platform, {formData.name}!</p>
      <p>Your account has been created and verified.</p>
      
      <button
        type="button"
        className="login-btn"
        onClick={onBack}
      >
        Continue to Login
      </button>
    </div>
  );

  return (
    <div className="account-creation">
      {step === 1 && renderAccountDetailsStep()}
      {step === 2 && renderOTPStep()}
      {step === 3 && renderSuccessStep()}
    </div>
  );
};

export default AccountCreation; 