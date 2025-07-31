import React, { useState, useRef, useEffect } from 'react';
import { FaArrowLeft, FaCheck, FaTimes, FaTrash } from 'react-icons/fa';
import '../styles/LoginView.css';

const AccountDeletionOTP = ({ email, onBack, onSuccess }) => {
  const [step, setStep] = useState('otp'); // 'otp', 'success'
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  const inputRefs = useRef([]);

  // Send OTP automatically when component mounts
  useEffect(() => {
    const sendInitialOTP = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await fetch('http://localhost:5000/api/otp/delete-account', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email
          }),
        });

        const data = await response.json();

        if (response.ok) {
          setSuccess('OTP sent successfully!');
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

    sendInitialOTP();
  }, [email]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

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

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
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

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/otp/verify-deletion', {
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
        setSuccess('Account deleted successfully!');
        setStep('success');
        // Clear user data from localStorage
        localStorage.removeItem('ukpUser');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userIsAdmin');
        localStorage.removeItem('userIsFeedbackManager');
        localStorage.removeItem('userCustomRole');
        
        // Remove user from users array
        const users = JSON.parse(localStorage.getItem('ukpUsers') || '[]');
        const filteredUsers = users.filter(u => u.email !== email);
        localStorage.setItem('ukpUsers', JSON.stringify(filteredUsers));
        
        // Clear profile photo
        const profilePhotoKey = `profilePhoto_${email}`;
        localStorage.removeItem(profilePhotoKey);
        
        setTimeout(() => {
          onSuccess && onSuccess();
        }, 2000);
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
      const response = await fetch('http://localhost:5000/api/otp/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('OTP resent successfully!');
        setTimeLeft(600); // Reset timer
        setOtp(['', '', '', '', '', '']);
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

  const renderOTPStep = () => (
    <div className="otp-step" style={{ animation: 'fadeInScale 0.6s ease' }}>
      <div className="step-header">
        <h2 style={{ 
          background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          animation: 'textGlow 2s ease-in-out infinite alternate'
        }}>
          Delete Account
        </h2>
        {loading ? (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            justifyContent: 'center', 
            marginBottom: '10px',
            animation: 'fadeInUp 0.5s ease'
          }}>
            <div className="spinner" style={{ 
              width: '16px', 
              height: '16px', 
              border: '2px solid #dc3545', 
              borderTop: '2px solid transparent', 
              borderRadius: '50%', 
              animation: 'spin 1s linear infinite' 
            }}></div>
            <span style={{ color: '#dc3545', fontWeight: '600' }}>Sending OTP...</span>
          </div>
        ) : (
          <p style={{ animation: 'fadeInUp 0.5s ease 0.1s both' }}>
            We've sent a 6-digit code to <strong style={{ color: '#dc3545' }}>{email}</strong>
          </p>
        )}
        <p style={{ 
          color: '#dc3545', 
          fontWeight: 'bold', 
          marginTop: '10px',
          animation: 'fadeInUp 0.5s ease 0.2s both',
          padding: '8px 12px',
          background: 'rgba(220, 53, 69, 0.1)',
          borderRadius: '8px',
          border: '1px solid rgba(220, 53, 69, 0.2)'
        }}>
          ⚠️ WARNING: This action is irreversible and will permanently delete your account!
        </p>
        <p style={{ 
          color: '#6c757d', 
          fontStyle: 'italic', 
          marginTop: '8px',
          animation: 'fadeInUp 0.5s ease 0.3s both'
        }}>
          We're sorry to see you go! 💝
        </p>
      </div>

      <div className="otp-input-container" style={{ animation: 'fadeInUp 0.5s ease 0.4s both' }}>
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
            disabled={loading}
            style={{
              animation: `fadeInUp 0.5s ease ${0.5 + index * 0.1}s both`,
              transform: digit ? 'scale(1.05)' : 'scale(1)',
              transition: 'all 0.3s ease'
            }}
          />
        ))}
      </div>

      <div className="timer-container" style={{ animation: 'fadeInUp 0.5s ease 0.5s both' }}>
        <p className="timer">
          Time remaining: <span className={timeLeft < 60 ? 'warning' : ''} style={{ 
            animation: timeLeft < 60 ? 'pulse 1s ease-in-out infinite' : 'none'
          }}>{formatTime(timeLeft)}</span>
        </p>
      </div>

      {error && <div className="error-message" style={{ animation: 'slideInLeft 0.3s ease' }}>{error}</div>}
      {success && <div className="success-message" style={{ animation: 'slideInLeft 0.3s ease' }}>{success}</div>}

      <button
        onClick={handleVerifyOTP}
        disabled={loading || otp.join('').length !== 6}
        className="verify-btn"
        style={{ 
          backgroundColor: '#dc3545',
          animation: 'fadeInUp 0.5s ease 0.6s both',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="spinner" style={{ width: '16px', height: '16px', border: '2px solid #ffffff', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            {otp.join('').length === 6 ? 'Deleting Account...' : 'Sending OTP...'}
          </div>
        ) : (
          'Delete Account'
        )}
      </button>
      
      {otp.join('').length === 6 && !loading && (
        <div className="auto-verify-indicator">
          <span>Auto-verifying...</span>
        </div>
      )}

      <div className="resend-container">
        <p>Didn't receive the code?</p>
        <button
          onClick={handleResendOTP}
          disabled={loading || timeLeft > 0}
          className="resend-btn"
        >
          {timeLeft > 0 ? `Resend in ${formatTime(timeLeft)}` : 'Resend OTP'}
        </button>
      </div>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="success-step" style={{ animation: 'fadeInScale 0.8s ease' }}>
      <div className="success-icon" style={{ 
        color: '#dc3545',
        animation: 'successBounce 1s ease 0.3s both'
      }}>
        <FaTrash />
      </div>
      <h2 style={{ 
        animation: 'fadeInUp 0.6s ease 0.5s both',
        background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text'
      }}>
        Account Deleted Successfully!
      </h2>
      <p style={{ animation: 'fadeInUp 0.6s ease 0.7s both' }}>
        Your account has been permanently deleted. You will be redirected to the login page.
      </p>
      <p style={{ 
        color: '#6c757d', 
        fontStyle: 'italic', 
        marginTop: '10px',
        animation: 'fadeInUp 0.6s ease 0.9s both'
      }}>
        Thank you for being part of our community! 💝
      </p>
      <p style={{ 
        color: '#6c757d', 
        fontSize: '0.9rem', 
        marginTop: '5px',
        animation: 'fadeInUp 0.6s ease 1.1s both'
      }}>
        You can always create a new account if you change your mind.
      </p>
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
      {step === 'success' && renderSuccessStep()}
    </div>
  );
};

export default AccountDeletionOTP; 