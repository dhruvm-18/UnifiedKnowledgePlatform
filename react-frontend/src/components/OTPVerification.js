import React, { useState, useEffect, useRef } from 'react';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaArrowLeft, FaCheck, FaTimes } from 'react-icons/fa';

const OTPVerification = ({ email, onBack, onSuccess }) => {
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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOtpChange = (index, value) => {
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
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setError('Please enter the complete 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/otp/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          otp: otpString
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResetToken(data.reset_token);
        setStep('password');
        setSuccess('OTP verified successfully! Please enter your new password.');
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
    <div className="otp-step">
      <div className="step-header">
        <h2>Enter OTP</h2>
        <p>We've sent a 6-digit code to <strong>{email}</strong></p>
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
            className="otp-input"
            placeholder="0"
          />
        ))}
      </div>

      <div className="timer-container">
        <p className="timer">
          Time remaining: <span className={timeLeft < 60 ? 'warning' : ''}>{formatTime(timeLeft)}</span>
        </p>
      </div>

      <button
        onClick={handleVerifyOTP}
        disabled={loading || otp.join('').length !== 6}
        className="verify-btn"
      >
        {loading ? 'Verifying...' : 'Verify OTP'}
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
      <h2>Password Reset Successful!</h2>
      <p>Your password has been updated successfully. You can now login with your new password.</p>
      <button onClick={onSuccess} className="login-btn">
        Back to Login
      </button>
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

      {success && (
        <div className="success-message">
          <FaCheck /> {success}
        </div>
      )}

      {step === 'otp' && renderOTPStep()}
      {step === 'password' && renderPasswordStep()}
      {step === 'success' && renderSuccessStep()}
    </div>
  );
};

export default OTPVerification; 