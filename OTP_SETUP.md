# OTP Password Reset Setup Guide

## Overview
The OTP (One-Time Password) functionality allows users to reset their passwords securely via email verification. This system generates a 6-digit code, sends it to the user's email, and verifies it before allowing password reset.

## Backend Setup

### 1. Install Dependencies
```bash
cd backend
pip install flask-mail pyotp
```

### 2. Email Configuration
Create a `.env` file in the `backend` directory with your email credentials:

```env
# Email Configuration for OTP
EMAIL_USERNAME=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# GitHub OAuth Configuration
GITHUB_CLIENT_ID=YOUR_GITHUB_CLIENT_ID_HERE
GITHUB_CLIENT_SECRET=YOUR_GITHUB_CLIENT_SECRET_HERE

# Flask Secret Key
FLASK_SECRET_KEY=supersecretkey
```

### 3. Gmail App Password Setup
For Gmail, you need to create an App Password:

1. Go to your Google Account settings
2. Navigate to Security
3. Enable 2-Step Verification if not already enabled
4. Go to App passwords
5. Generate a new app password for "Mail"
6. Use this password in the `EMAIL_PASSWORD` field

### 4. Start the Backend Server
```bash
cd backend
python backend.py
```

## Frontend Setup

### 1. Install Dependencies
```bash
cd react-frontend
npm install
```

### 2. Start the Frontend
```bash
npm start
```

## How It Works

### 1. User Flow
1. User clicks "Forgot password?" on login page
2. User enters their email address
3. System sends a 6-digit OTP to the user's email
4. User enters the OTP in the verification screen
5. If OTP is correct, user can set a new password
6. Password is updated and user can login with new credentials

### 2. Security Features
- **OTP Expiry**: OTP expires after 10 minutes
- **Attempt Limits**: Maximum 3 failed attempts per OTP
- **Resend Cooldown**: 60-second cooldown between resend requests
- **Secure Tokens**: Reset tokens are cryptographically secure
- **Email Validation**: OTP is sent to registered email only

### 3. API Endpoints

#### Send OTP
```
POST /api/otp/send
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Verify OTP
```
POST /api/otp/verify
Content-Type: application/json

{
  "email": "user@example.com",
  "otp": "123456"
}
```

#### Reset Password
```
POST /api/otp/reset-password
Content-Type: application/json

{
  "email": "user@example.com",
  "reset_token": "token_from_verify_response",
  "new_password": "newpassword123"
}
```

## Features

### ✅ **Complete OTP Flow**
- Email-based OTP generation and delivery
- 6-digit numeric OTP with expiry
- Secure verification process
- Password reset with validation

### ✅ **User Experience**
- Clean, intuitive interface
- Real-time countdown timers
- Auto-focus OTP input fields
- Resend functionality with cooldown
- Success/error feedback

### ✅ **Security**
- OTP expiry (10 minutes)
- Attempt limiting (3 attempts)
- Secure reset tokens
- Password strength validation
- Email verification

### ✅ **Email Templates**
- Professional HTML email template
- Plain text fallback
- Branded with UKP styling
- Security warnings included

## Troubleshooting

### Email Not Sending
1. Check your Gmail credentials
2. Ensure 2-Step Verification is enabled
3. Verify App Password is correct
4. Check firewall/network settings

### OTP Not Working
1. Check backend server is running
2. Verify email configuration
3. Check browser console for errors
4. Ensure CORS is properly configured

### Frontend Issues
1. Check React development server
2. Verify API endpoints are accessible
3. Check browser console for errors
4. Ensure all dependencies are installed

## Customization

### Email Template
Edit the HTML template in `backend.py` in the `send_otp_email` function to customize the email appearance.

### OTP Settings
Modify these values in `backend.py`:
- OTP length: Change the range in `generate_otp()`
- Expiry time: Modify `timedelta(minutes=10)`
- Attempt limits: Change the limit in verify endpoint

### Frontend Styling
Customize the OTP interface by modifying the CSS in `react-frontend/src/styles/LoginView.css`.

## Production Considerations

1. **Database Storage**: Replace in-memory OTP storage with Redis or database
2. **Email Service**: Consider using services like SendGrid or AWS SES
3. **Rate Limiting**: Implement rate limiting for OTP requests
4. **Logging**: Add comprehensive logging for security monitoring
5. **HTTPS**: Ensure all communications use HTTPS
6. **Environment Variables**: Use proper environment variable management 