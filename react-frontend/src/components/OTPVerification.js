import React, { useState, useEffect, useRef } from 'react';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaArrowLeft, FaCheck, FaTimes, FaUser } from 'react-icons/fa';

const OTPVerification = ({ email, onBack, onSuccess, type = 'password_reset', accountData = null }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState('otp'); // 'otp', 'password', 'success'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [canResend, setCanResend] = useState(false);
  const [resendTime, setResendTime] = useState(60); // 60 seconds cooldown

  const inputRefs = useRef([]);

  // Timer for OTP expiry
  useEffect(() => {
    if (step === 'otp' && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setError('OTP has expired. Please request a new one.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step, timeLeft]);

  // Timer for resend cooldown
  useEffect(() => {
    if (!canResend && resendTime > 0) {
      const timer = setInterval(() => {
        setResendTime(prev => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [canResend, resendTime]);

  // Auto-verify when all 6 digits are entered
  useEffect(() => {
    const otpString = otp.join('');
    if (otpString.length === 6 && /^\d{6}$/.test(otpString)) {
      // Small delay to ensure state is updated
      const timer = setTimeout(() => {
        handleVerifyOTP();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [otp]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOtpChange = (index, value) => {
    // Handle pasting 6 digits
    if (value.length === 6 && /^\d{6}$/.test(value)) {
      const digits = value.split('');
      setOtp(digits);
      setError('');
      return;
    }
    
    // Handle single digit input
    if (value.length > 1) return; // Only allow single digit
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    
    // Handle arrow keys
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
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
      setError('Please enter the complete 6-digit OTP');
      return;
    }

    // Don't show error if we're already loading (auto-verification)
    if (!loading) {
      setLoading(true);
      setError('');
    }

    try {
      const response = await fetch('http://localhost:5000/api/otp/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          otp: otpString,
          type: type
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (type === 'account_creation') {
          // For account creation, directly create the account after OTP verification
          await createAccount();
        } else {
          // For password reset, proceed to password change step
          setResetToken(data.reset_token);
          setStep('password');
          setSuccess('OTP verified successfully! Please enter your new password.');
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

  const createAccount = async () => {
    if (!accountData) {
      setError('Account data is missing');
      return;
    }

    try {
      // Create the account in localStorage
      const users = JSON.parse(localStorage.getItem('ukpUsers')) || [];
      const newUser = {
        name: accountData.name,
        email: accountData.email,
        password: accountData.password,
        avatar: null,
        isAdmin: false,
        role: 'User',
        createdAt: new Date().toISOString()
      };
      users.push(newUser);
      localStorage.setItem('ukpUsers', JSON.stringify(users));
      
      setStep('success');
      setSuccess('Account created successfully!');
      
      // Auto-redirect to login after 3 seconds
      setTimeout(() => {
        onSuccess && onSuccess(newUser);
      }, 3000);
    } catch (err) {
      setError('Failed to create account');
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    setError('');
    setCanResend(false);
    setResendTime(60);
    setTimeLeft(600);
    setOtp(['', '', '', '', '', '']);

    try {
      const response = await fetch('http://localhost:5000/api/otp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('New OTP sent to your email!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to send OTP');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/otp/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          reset_token: resetToken,
          new_password: newPassword
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Update password in localStorage
        const users = JSON.parse(localStorage.getItem('ukpUsers') || '[]');
        const userIndex = users.findIndex(u => u.email === email);
        if (userIndex !== -1) {
          users[userIndex].password = newPassword;
          localStorage.setItem('ukpUsers', JSON.stringify(users));
        }

        setStep('success');
        setSuccess('Password reset successful! You can now login with your new password.');
        
        // Auto-redirect to login after 3 seconds
        setTimeout(() => {
          onSuccess && onSuccess();
        }, 3000);
      } else {
        setError(data.error || 'Failed to reset password');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderOTPStep = () => (
    <div className="otp-step" style={{ animation: 'fadeInScale 0.6s ease' }}>
      <div className="step-header">
        <h2 style={{ 
          background: 'linear-gradient(135deg, #6c2eb7 0%, #8b5cf6 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          animation: 'textGlow 2s ease-in-out infinite alternate'
        }}>
          Enter OTP
        </h2>
        <p style={{ animation: 'fadeInUp 0.5s ease 0.1s both' }}>
          We've sent a 6-digit code to <strong style={{ color: '#6c2eb7' }}>{email}</strong>
        </p>
      </div>

      <div className="otp-input-container">
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={el => inputRefs.current[index] = el}
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
        <p className="timer">
          Time remaining: <span className={timeLeft < 60 ? 'warning' : ''}>{formatTime(timeLeft)}</span>
        </p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <button
        onClick={handleVerifyOTP}
        disabled={loading || otp.join('').length !== 6}
        className="verify-btn"
      >
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="spinner" style={{ width: '16px', height: '16px', border: '2px solid #ffffff', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            Verifying...
          </div>
        ) : (
          'Verify OTP'
        )}
      </button>

      <div className="resend-container">
        <p>Didn't receive the code?</p>
        <button
          onClick={handleResendOTP}
          disabled={!canResend || loading}
          className="resend-btn"
        >
          {canResend ? 'Resend OTP' : `Resend in ${resendTime}s`}
        </button>
      </div>
    </div>
  );

  const renderPasswordStep = () => (
    <div className="password-step">
      {success && (
        <div className="success-message">
          <FaCheck /> {success}
        </div>
      )}
      
      <div className="step-header">
        <h2>Set New Password</h2>
        <p>Enter your new password below</p>
      </div>

      <div className="password-input-container">
        <div className="input-group">
          <div className="input-wrapper">
            <FaLock className="input-icon" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New Password"
              className="password-input"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="toggle-password"
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
        </div>

        <div className="input-group">
          <div className="input-wrapper">
            <FaLock className="input-icon" />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm New Password"
              className="password-input"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="toggle-password"
            >
              {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={handleResetPassword}
        disabled={loading || !newPassword || !confirmPassword}
        className="reset-btn"
      >
        {loading ? 'Resetting...' : 'Reset Password'}
      </button>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="success-step">
      <div className="success-icon">
        <FaCheck />
      </div>
      <h2>{type === 'account_creation' ? 'Account Created Successfully!' : 'Password Reset Successful!'}</h2>
      <p>{type === 'account_creation' ? 'Your account has been created successfully. You can now login with your credentials.' : 'Your password has been updated successfully. You can now login with your new password.'}</p>
    </div>
  );

  return (
    <div className="otp-verification">
      {step !== 'success' && (
        <button onClick={onBack} className="back-btn">
          <FaArrowLeft /> Back
        </button>
      )}

      {error && (
        <div className="error-message">
          <FaTimes /> {error}
        </div>
      )}

      {step === 'otp' && renderOTPStep()}
      {step === 'password' && renderPasswordStep()}
      {step === 'success' && renderSuccessStep()}
    </div>
  );
};

export default OTPVerification; 