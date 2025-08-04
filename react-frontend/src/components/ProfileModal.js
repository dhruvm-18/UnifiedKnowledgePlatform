import React, { useState, useRef, useEffect } from 'react';
import '../styles/LoginView.css';
import Switch from 'react-switch';
import { FaSun, FaMoon, FaKey, FaTrash, FaCheckCircle, FaTimesCircle, FaEdit, FaSave, FaTimes, FaGithub, FaLink, FaUnlink, FaCrown, FaUser, FaThumbsUp, FaDatabase } from 'react-icons/fa';
import { GITHUB_CONFIG } from '../config/github';
import { getUserRoleInfo } from '../utils/permissions';
import { saveBannerToFolder, loadBannerFromFolder, removeBannerFromFolder, BANNER_CONFIG } from '../utils/bannerStorage';
import { clearUserData } from '../utils/userCleanup';
import AccountDeletionOTP from './AccountDeletionOTP';

const USERS_KEY = 'ukpUsers';
const ACCENT_COLOR = '#6c2eb7';
const ERROR_COLOR = '#ff5858';
const SUCCESS_COLOR = '#2ecc40';
const ADMIN_BADGE_COLOR = '#6c2eb7';
const DARK_BG = '#232136';
const DARK_CARD = '#2d2942';
const DARK_TEXT = '#f5f7fa';
const LIGHT_BG = '#f5f7fa';
const LIGHT_CARD = '#fff';
const LIGHT_TEXT = '#232136';

function ProfileModal({ user, onClose, onSave, theme, setTheme, modelOptions = [], preferredModel, onPreferredModelChange, fromSidebar = false }) {
  const [editMode, setEditMode] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [name, setName] = useState(user.name || '');
  const [avatar, setAvatar] = useState(user.avatar || null);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteOTP, setShowDeleteOTP] = useState(false);
  const modalRef = useRef(null);
  const [editingName, setEditingName] = useState(false);
  const fileInputRef = useRef(null);
  const bannerFileInputRef = useRef(null);
  const [showGitHubDisconnectConfirm, setShowGitHubDisconnectConfirm] = useState(false);
  const [showGitHubConnectWarning, setShowGitHubConnectWarning] = useState(false);
  const [userBanner, setUserBanner] = useState(null);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [bannerError, setBannerError] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);

  // Check if user is connected to GitHub
  const isGitHubConnected = user.githubId && user.githubUsername;

  // Load profile photo from localStorage on mount
  useEffect(() => {
    const userEmail = user.email;
    const profilePhotoKey = `profilePhoto_${userEmail}`;
    const savedPhoto = localStorage.getItem(profilePhotoKey);
    
    if (savedPhoto && !avatar) {
      setAvatar(savedPhoto);
    }
  }, [user.email, avatar]);

  // Load banner from dedicated folder
  useEffect(() => {
    const loadBanner = async () => {
      if (user?.email) {
        try {
          const bannerData = await loadBannerFromFolder(user.email);
          if (bannerData) {
            setUserBanner(bannerData.dataUrl);
          } else {
            setUserBanner(null);
          }
        } catch (error) {
          console.error('Error loading banner:', error);
          setUserBanner(null);
        }
      }
    };

    loadBanner();
  }, [user?.email]);

  // Close modal on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose && onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }
    
    // Validate file size (max 2MB for better storage management)
    if (file.size > 2 * 1024 * 1024) {
      setError('Image size should be less than 2MB. Please compress your image or choose a smaller file.');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      const imageData = ev.target.result;
      
      // Compress image if it's not a GIF (GIFs should remain as-is for animation)
      if (!file.type.includes('gif')) {
        compressImage(imageData, (compressedData) => {
          saveAvatarToStorage(compressedData);
        });
      } else {
        // For GIFs, check if they're too large and warn user
        if (imageData.length > 500000) { // ~500KB limit for GIFs
          setError('GIF is too large. Please choose a smaller GIF file (under 500KB) or convert to a static image.');
          return;
        }
        saveAvatarToStorage(imageData);
      }
    };
    reader.readAsDataURL(file);
  };

  // Image compression function
  const compressImage = (imageData, callback) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Calculate new dimensions (max 200x200 for profile photos)
      const maxSize = 200;
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      const compressedData = canvas.toDataURL('image/jpeg', 0.7); // 70% quality
      
      callback(compressedData);
    };
    img.src = imageData;
  };

  // Save avatar to storage with error handling
  const saveAvatarToStorage = (imageData) => {
    try {
      // Check localStorage quota before saving
      const testKey = 'quota_test';
      const testData = 'x'.repeat(1024 * 1024); // 1MB test
      
      try {
        localStorage.setItem(testKey, testData);
        localStorage.removeItem(testKey);
      } catch (quotaError) {
        // Clear old profile photos to make space
        clearOldProfilePhotos();
        
        // Try again with smaller test
        try {
          localStorage.setItem(testKey, 'x'.repeat(100 * 1024)); // 100KB test
          localStorage.removeItem(testKey);
        } catch (finalError) {
          setError('Storage is full. Please clear some data or use a smaller image.');
          return;
        }
      }
      
      setAvatar(imageData);
      
      // Save to localStorage with error handling
      const userEmail = user.email;
      const profilePhotoKey = `profilePhoto_${userEmail}`;
      
      try {
        localStorage.setItem(profilePhotoKey, imageData);
        
        // Update user object in localStorage
        const updatedUser = { ...user, avatar: imageData };
        localStorage.setItem('ukpUser', JSON.stringify(updatedUser));
        
        // Update in users array
        const users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
        const idx = users.findIndex(u => u.email === user.email);
        if (idx !== -1) {
          users[idx] = { ...users[idx], avatar: imageData };
          localStorage.setItem(USERS_KEY, JSON.stringify(users));
        }
        
        setSuccess('Profile photo updated!');
        setTimeout(() => setSuccess(''), 3000);
      } catch (storageError) {
        console.error('Storage error:', storageError);
        setError('Failed to save profile photo. Please try a smaller image or clear some data.');
      }
    } catch (error) {
      console.error('Avatar save error:', error);
      setError('Failed to process image. Please try again.');
    }
  };

  // Clear old profile photos to free up space
  const clearOldProfilePhotos = () => {
    const keys = Object.keys(localStorage);
    const profilePhotoKeys = keys.filter(key => key.startsWith('profilePhoto_'));
    
    // Keep only the current user's photo and remove others
    const currentUserKey = `profilePhoto_${user.email}`;
    profilePhotoKeys.forEach(key => {
      if (key !== currentUserKey) {
        localStorage.removeItem(key);
      }
    });
    
    console.log('Cleared old profile photos to free up storage space');
  };

  const handleRemoveAvatar = () => {
    setAvatar(null);
    
    // Remove from localStorage
    const userEmail = user.email;
    const profilePhotoKey = `profilePhoto_${userEmail}`;
    localStorage.removeItem(profilePhotoKey);
    
    // Update user object in localStorage
    const updatedUser = { ...user, avatar: null };
    localStorage.setItem('ukpUser', JSON.stringify(updatedUser));
    
    // Update in users array
    const users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    const idx = users.findIndex(u => u.email === user.email);
    if (idx !== -1) {
      users[idx] = { ...users[idx], avatar: null };
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
    
    setSuccess('Profile photo removed!');
    setTimeout(() => setSuccess(''), 3000);
  };

  // Utility function to clear all profile photos (for debugging)
  const clearAllProfilePhotos = () => {
    const keys = Object.keys(localStorage);
    const profilePhotoKeys = keys.filter(key => key.startsWith('profilePhoto_'));
    profilePhotoKeys.forEach(key => localStorage.removeItem(key));
    console.log('All profile photos cleared from localStorage');
  };

  // Storage management utilities
  const getStorageUsage = () => {
    let totalSize = 0;
    let profilePhotoSize = 0;
    let otherDataSize = 0;
    const keys = Object.keys(localStorage);
    
    keys.forEach(key => {
      const value = localStorage.getItem(key);
      const itemSize = key.length + value.length;
      totalSize += itemSize;
      
      if (key.startsWith('profilePhoto_')) {
        profilePhotoSize += itemSize;
      } else {
        otherDataSize += itemSize;
      }
    });
    
    return {
      totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      profilePhotoSizeMB: (profilePhotoSize / (1024 * 1024)).toFixed(2),
      otherDataSizeMB: (otherDataSize / (1024 * 1024)).toFixed(2),
      keyCount: keys.length,
      profilePhotoCount: keys.filter(key => key.startsWith('profilePhoto_')).length
    };
  };

  const clearStorageData = (type = 'all') => {
    const keys = Object.keys(localStorage);
    
    keys.forEach(key => {
      if (type === 'all') {
        // Keep essential data
        if (!key.includes('profilePhoto_') && 
            key !== 'theme' && 
            key !== 'isLoggedIn' && 
            key !== 'userEmail' && 
            !key.includes('ukpUser')) {
          localStorage.removeItem(key);
        }
      } else if (type === 'profilePhotos') {
        if (key.startsWith('profilePhoto_')) {
          localStorage.removeItem(key);
        }
      }
    });
    
    setSuccess(`Storage cleared successfully!`);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleProfileSave = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    if (!name.trim()) {
      setError('Name cannot be empty.');
      setSaving(false);
      return;
    }
    const updatedUser = {
      ...user,
      name,
      avatar,
    };
    localStorage.setItem('ukpUser', JSON.stringify(updatedUser));
    const users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    const idx = users.findIndex(u => u.email === user.email);
    if (idx !== -1) {
      users[idx] = { ...users[idx], name, avatar };
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
    setSuccess('Profile updated!');
    setSaving(false);
    setEditMode(false);
    onSave && onSave(updatedUser);
  };

  const handlePasswordSave = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('Fill all password fields.');
      setSaving(false);
      return;
    }
    if (oldPassword !== user.password) {
      setError('Old password is incorrect.');
      setSaving(false);
      return;
    }
    if (newPassword.length < 4) {
      setError('New password must be at least 4 characters.');
      setSaving(false);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      setSaving(false);
      return;
    }
    const updatedUser = {
      ...user,
      password: newPassword,
    };
    localStorage.setItem('ukpUser', JSON.stringify(updatedUser));
    const users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    const idx = users.findIndex(u => u.email === user.email);
    if (idx !== -1) {
      users[idx] = { ...users[idx], password: newPassword };
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
    setSuccess('Password updated!');
    setSaving(false);
    setShowPasswordForm(false);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    onSave && onSave(updatedUser);
  };

  const handleDeleteAccount = () => {
    setShowDeleteOTP(true);
  };

  const handleDeleteAccountSuccess = () => {
    // Use the utility function to clear all user data
    clearUserData(user.email);
    
    onSave && onSave({ deleted: true });
    onClose && onClose();
  };

  const handleDeleteAccountBack = () => {
    setShowDeleteOTP(false);
  };

  const handleGitHubConnect = () => {
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CONFIG.CLIENT_ID}&redirect_uri=${encodeURIComponent(GITHUB_CONFIG.REDIRECT_URI)}&scope=${encodeURIComponent(GITHUB_CONFIG.SCOPE)}&state=${Math.random().toString(36).substring(7)}`;
    window.location.href = githubAuthUrl;
  };

  const handleGitHubDisconnect = () => {
    // Remove GitHub connection from user data
    const updatedUser = { ...user };
    delete updatedUser.githubId;
    delete updatedUser.githubUsername;
    
    // Update localStorage
    localStorage.setItem('ukpUser', JSON.stringify(updatedUser));
    
    // Update in users array
    const users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    const idx = users.findIndex(u => u.email === user.email);
    if (idx !== -1) {
      delete users[idx].githubId;
      delete users[idx].githubUsername;
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
    
    setSuccess('GitHub connection removed!');
    setTimeout(() => setSuccess(''), 3000);
    
    // Update the user prop
    onSave && onSave(updatedUser);
  };

  // Banner upload handlers
  const handleBannerChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file
    if (!BANNER_CONFIG.supportedFormats.includes(file.type)) {
      setBannerError('Unsupported file format. Please use JPEG, PNG, GIF, or WebP.');
      return;
    }

    if (file.size > BANNER_CONFIG.maxSize) {
      setBannerError(`File size too large. Maximum size is ${BANNER_CONFIG.maxSize / (1024 * 1024)}MB.`);
      return;
    }

    if (file.type.includes('gif') && file.size > BANNER_CONFIG.maxGifSize) {
      setBannerError(`GIF file too large. Maximum size is ${BANNER_CONFIG.maxGifSize / (1024 * 1024)}MB.`);
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setBannerPreview(e.target.result);
      setBannerError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleBannerUpload = async () => {
    if (!bannerPreview) return;

    setIsUploadingBanner(true);
    setBannerError(null);

    try {
      // Convert preview back to file
      const response = await fetch(bannerPreview);
      const blob = await response.blob();
      const file = new File([blob], 'banner.jpg', { type: blob.type });

      const result = await saveBannerToFolder(user.email, file);
      if (result.success) {
        setUserBanner(result.dataUrl);
        setBannerPreview(null);
        setSuccess('Banner uploaded successfully!');
        setTimeout(() => setSuccess(''), 3000);
        
        // Dispatch event to notify ProfileOverlay
        window.dispatchEvent(new CustomEvent('bannerUpdated'));
      } else {
        throw new Error(result.error || 'Failed to upload banner');
      }
    } catch (error) {
      setBannerError(error.message);
      console.error('Error uploading banner:', error);
    } finally {
      setIsUploadingBanner(false);
    }
  };

  const handleRemoveBanner = async () => {
    try {
      await removeBannerFromFolder(user.email);
      setUserBanner(null);
      setBannerPreview(null);
      setSuccess('Banner removed successfully!');
      setTimeout(() => setSuccess(''), 3000);
      
      // Dispatch event to notify ProfileOverlay
      window.dispatchEvent(new CustomEvent('bannerUpdated'));
    } catch (error) {
      setBannerError('Failed to remove banner');
      console.error('Error removing banner:', error);
    }
  };

  return (
    <div className="modal-overlay animated-bg" style={{
      zIndex: 2000,
      background: theme === 'dark' ? 'rgba(24,24,27,0.95)' : 'rgba(60, 30, 90, 0.15)',
      backdropFilter: 'blur(2px)',
      animation: 'fadeIn 0.5s',
      color: theme === 'dark' ? DARK_TEXT : LIGHT_TEXT
    }}>
      <div className={`modal-content ${fromSidebar ? 'genie-modal' : ''}`} ref={modalRef} style={{
        maxWidth: 520,
        width: '100%',
        padding: '2.7rem 2.2rem',
        borderRadius: 24,
        background: theme === 'dark' ? '#18181b' : LIGHT_CARD,
        boxShadow: '0 8px 40px rgba(108,46,183,0.18)',
        position: 'relative',
        overflow: 'auto',
        maxHeight: '90vh',
        minHeight: 420,
        animation: fromSidebar ? 'genieEffect 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'fadeInScale 0.7s cubic-bezier(.23,1.01,.32,1)',
        color: theme === 'dark' ? DARK_TEXT : LIGHT_TEXT,
        transformOrigin: fromSidebar ? 'bottom left' : 'center'
      }}>
        {/* Theme Switcher */}
        
        <h2 style={{ textAlign: 'center', marginBottom: 18, fontWeight: 800, letterSpacing: 1, color: theme === 'dark' ? 'var(--accent-color-dark, #6c2eb7)' : 'var(--accent-color, #6c2eb7)', fontSize: '2.1rem', textShadow: theme === 'dark' ? '0 2px 8px #232136' : '0 2px 8px #eee' }}>Profile</h2>
        {!editMode && !showPasswordForm && (
          <button
            style={{
              position: 'absolute',
              top: 24,
              right: 24,
              background: 'none',
              border: 'none',
              color: theme === 'dark' ? 'var(--accent-color-dark, #6c2eb7)' : 'var(--accent-color, #6c2eb7)',
              fontSize: 22,
              cursor: 'pointer',
              zIndex: 10
            }}
            onClick={() => setEditMode(true)}
            title="Edit Profile"
          >
            <FaEdit />
          </button>
        )}
        {!showPasswordForm && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
            {/* Avatar with click-to-upload and animation */}
            <div style={{ marginBottom: 12, position: 'relative' }}>
              <div
                className="avatar-hover"
                style={{
                  background: theme === 'dark' ? DARK_BG : LIGHT_BG,
                  borderRadius: '50%',
                  padding: 4,
                  boxShadow: theme === 'dark' ? '0 4px 16px #232136' : '0 4px 16px #eee',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 90,
                  height: 90,
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  animation: 'bounceIn 1.2s',
                  border: `3px solid ${theme === 'dark' ? 'var(--accent-color-dark, #6c2eb7)' : 'var(--accent-color, #6c2eb7)'}`
                }}
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                title="Change Profile Photo"
                onMouseEnter={e => {
                  const tooltip = document.getElementById('avatar-tooltip');
                  if (tooltip) tooltip.style.opacity = 1;
                }}
                onMouseLeave={e => {
                  const tooltip = document.getElementById('avatar-tooltip');
                  if (tooltip) tooltip.style.opacity = 0;
                }}
              >
                {avatar ? (
                  <img src={avatar} alt="Avatar" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div className="user-avatar-initial" style={{ width: 80, height: 80, fontSize: 38, borderRadius: '50%', background: theme === 'dark' ? 'var(--accent-color-dark, #6c2eb7)' : 'var(--accent-color, #6c2eb7)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{name.charAt(0)}</div>
                )}
                
                {/* Upload overlay */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0,0,0,0.6)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0,
                  transition: 'opacity 0.2s',
                  pointerEvents: 'none'
                }} className="upload-overlay">
                  <FaEdit style={{ color: 'white', fontSize: 20 }} />
                </div>
                
                <div id="avatar-tooltip" style={{
                  position: 'absolute',
                  bottom: -32,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: theme === 'dark' ? 'var(--accent-color-dark, #6c2eb7)' : 'var(--accent-color, #6c2eb7)',
                  color: 'white',
                  padding: '3px 12px',
                  borderRadius: 8,
                  fontSize: 13,
                  opacity: 0,
                  pointerEvents: 'none',
                  transition: 'opacity 0.2s',
                  zIndex: 10
                }}>Change Profile Photo</div>
                
                <input
                  ref={fileInputRef}
                  id="profileAvatar"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{ display: 'none' }}
                />
              </div>
              
              {/* Remove photo button (only show if avatar exists) */}
              {avatar && (
                <button
                  onClick={handleRemoveAvatar}
                  style={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    background: ERROR_COLOR,
                    border: 'none',
                    borderRadius: '50%',
                    width: 24,
                    height: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'white',
                    fontSize: 12,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    transition: 'transform 0.2s'
                  }}
                  title="Remove Profile Photo"
                  onMouseEnter={e => e.target.style.transform = 'scale(1.1)'}
                  onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                >
                  <FaTimes />
                </button>
              )}
            </div>
            
            {/* Banner Section */}
            <div style={{ 
              width: '100%', 
              marginTop: 16,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8
            }}>
              <div style={{
                fontSize: '0.9rem',
                color: theme === 'dark' ? '#bbb' : '#888',
                fontWeight: 600
              }}>
                Profile Banner
              </div>
              
              <div style={{
                position: 'relative',
                width: '100%',
                maxWidth: 400,
                minHeight: 60,
                maxHeight: 200,
                borderRadius: 8,
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                border: `2px solid ${theme === 'dark' ? 'var(--accent-color-dark, #6c2eb7)' : 'var(--accent-color, #6c2eb7)'}`,
                background: (userBanner || bannerPreview) ? 'none' : (theme === 'dark' ? 'rgba(108, 46, 183, 0.1)' : 'rgba(108, 46, 183, 0.05)'),
                aspectRatio: (userBanner || bannerPreview) ? 'auto' : '3.33 / 1'
              }}
              onClick={() => bannerFileInputRef.current && bannerFileInputRef.current.click()}
              title="Change Profile Banner"
              >
                {(userBanner || bannerPreview) ? (
                  <img 
                    src={bannerPreview || userBanner} 
                    alt="Banner" 
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover',
                      display: 'block'
                    }} 
                    onLoad={(e) => {
                      const img = e.target;
                      const container = img.parentElement;
                      const aspectRatio = img.naturalWidth / img.naturalHeight;
                      const containerWidth = container.offsetWidth;
                      
                      if (aspectRatio > 2) {
                        container.style.height = `${containerWidth / aspectRatio}px`;
                      } else if (aspectRatio < 0.5) {
                        container.style.height = '200px';
                      } else {
                        container.style.height = `${containerWidth / aspectRatio}px`;
                      }
                      
                      const calculatedHeight = parseFloat(container.style.height);
                      if (calculatedHeight < 60) {
                        container.style.height = '60px';
                      } else if (calculatedHeight > 200) {
                        container.style.height = '200px';
                      }
                    }}
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: theme === 'dark' ? 'var(--accent-color-dark, #6c2eb7)' : 'var(--accent-color, #6c2eb7)',
                    fontSize: 12,
                    fontWeight: 600
                  }}>
                    Click to add banner
                  </div>
                )}
                
                <input
                  ref={bannerFileInputRef}
                  id="profileBanner"
                  type="file"
                  accept="image/*"
                  onChange={handleBannerChange}
                  style={{ display: 'none' }}
                />
              </div>
              
              {/* Banner Action Buttons */}
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                {bannerPreview && (
                  <button
                    onClick={handleBannerUpload}
                    disabled={isUploadingBanner}
                    style={{
                      background: SUCCESS_COLOR,
                      border: 'none',
                      borderRadius: 6,
                      padding: '6px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: 'white',
                      fontSize: 11,
                      fontWeight: 600,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                      transition: 'transform 0.2s',
                      opacity: isUploadingBanner ? 0.7 : 1
                    }}
                    title="Save Banner"
                    onMouseEnter={e => !isUploadingBanner && (e.target.style.transform = 'scale(1.05)')}
                    onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                  >
                    {isUploadingBanner ? (
                      <div style={{ width: 12, height: 12, border: '2px solid white', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                    ) : (
                      'Save Banner'
                    )}
                  </button>
                )}
                
                {(userBanner || bannerPreview) && (
                  <button
                    onClick={bannerPreview ? () => setBannerPreview(null) : handleRemoveBanner}
                    style={{
                      background: ERROR_COLOR,
                      border: 'none',
                      borderRadius: 6,
                      padding: '6px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: 'white',
                      fontSize: 11,
                      fontWeight: 600,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                      transition: 'transform 0.2s'
                    }}
                    title={bannerPreview ? "Cancel Preview" : "Remove Banner"}
                    onMouseEnter={e => e.target.style.transform = 'scale(1.05)'}
                    onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                  >
                    {bannerPreview ? 'Cancel' : 'Remove'}
                  </button>
                )}
              </div>
              
              {/* Banner Error */}
              {bannerError && (
                <div style={{
                  marginTop: 8,
                  padding: 8,
                  background: '#fee',
                  border: '1px solid #fcc',
                  borderRadius: 6,
                  color: '#c33',
                  fontSize: '0.8rem',
                  textAlign: 'center'
                }}>
                  {bannerError}
                </div>
              )}
            </div>
            
            {/* Inline editable name */}
            <div style={{ width: '100%', textAlign: 'center', marginBottom: 4 }}>
              {editMode ? (
                <>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    style={{ fontWeight: 700, fontSize: '1.3rem', color: theme === 'dark' ? DARK_TEXT : LIGHT_TEXT, border: `1.5px solid ${theme === 'dark' ? 'var(--accent-color-dark, #6c2eb7)' : 'var(--accent-color, #6c2eb7)'}`, borderRadius: 8, padding: '4px 10px', outline: 'none', minWidth: 120, background: theme === 'dark' ? DARK_BG : LIGHT_BG, marginBottom: 8 }}
                    autoFocus
                  />
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    style={{ fontSize: '1.05rem', color: '#bbb', background: theme === 'dark' ? DARK_BG : LIGHT_BG, border: 'none', marginBottom: 8, width: '100%', textAlign: 'center' }}
                  />
                  <select
                    value={preferredModel}
                    onChange={e => onPreferredModelChange(e.target.value)}
                    style={{ fontSize: '1.05rem', color: theme === 'dark' ? DARK_TEXT : LIGHT_TEXT, background: theme === 'dark' ? DARK_BG : LIGHT_BG, border: `1.5px solid ${theme === 'dark' ? 'var(--accent-color-dark, #6c2eb7)' : 'var(--accent-color, #6c2eb7)'}`, borderRadius: 8, padding: '6px 10px', marginBottom: 8, width: '100%' }}
                  >
                    {modelOptions.map(model => (
                      <option key={model.name} value={model.name}>{model.name}</option>
                    ))}
                  </select>
                  
                  {/* GitHub Connection Management in Edit Mode */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    gap: 16, 
                    marginBottom: 8, 
                    width: '100%',
                    padding: '8px 12px',
                    background: theme === 'dark' ? 'rgba(108, 46, 183, 0.05)' : 'rgba(108, 46, 183, 0.02)',
                    borderRadius: 8,
                    border: `1px solid ${theme === 'dark' ? 'rgba(108, 46, 183, 0.2)' : 'rgba(108, 46, 183, 0.1)'}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FaGithub style={{ 
                        fontSize: 18, 
                        color: isGitHubConnected ? SUCCESS_COLOR : ERROR_COLOR 
                      }} />
                      <span style={{ 
                        color: theme === 'dark' ? DARK_TEXT : LIGHT_TEXT,
                        fontWeight: 600
                      }}>
                        GitHub: {isGitHubConnected ? 'Connected' : 'Not Connected'}
                      </span>
                      {isGitHubConnected && (
                        <span style={{ 
                          fontSize: '0.9rem', 
                          color: theme === 'dark' ? '#bbb' : '#888'
                        }}>
                          (@{user.githubUsername})
                        </span>
                      )}
                    </div>
                    <div style={{ 
                      fontSize: '0.9rem', 
                      color: theme === 'dark' ? '#bbb' : '#888',
                      fontStyle: 'italic'
                    }}>
                      Click status to manage
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontWeight: 700, fontSize: '1.3rem', color: theme === 'dark' ? DARK_TEXT : LIGHT_TEXT }}>{name}</div>
                  <div style={{ color: theme === 'dark' ? '#bbb' : '#888', fontSize: '1.05rem', marginTop: 2 }}>{user.email}</div>
                  {/* Preferred Model and GitHub Connection in one line */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    gap: 16, 
                    color: theme === 'dark' ? 'var(--accent-color-dark, #6c2eb7)' : 'var(--accent-color, #6c2eb7)', 
                    fontSize: '1.05rem', 
                    marginTop: 12, 
                    fontWeight: 600,
                    width: '100%'
                  }}>
                    {/* Preferred Model */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <span>Preferred Model:</span>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 6,
                      background: theme === 'dark' ? 'rgba(108, 46, 183, 0.1)' : 'rgba(108, 46, 183, 0.05)',
                      padding: '4px 8px',
                      borderRadius: 6,
                      border: `1px solid ${theme === 'dark' ? 'rgba(108, 46, 183, 0.3)' : 'rgba(108, 46, 183, 0.2)'}`
                    }}>
                      {modelOptions.find(m => m.name === preferredModel)?.icon && (
                        <div style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {modelOptions.find(m => m.name === preferredModel)?.icon}
                        </div>
                      )}
                      <span>{preferredModel}</span>
                      </div>
                    </div>
                    
                    {/* GitHub Connection Status */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <span>GitHub Connection:</span>
                      <div 
                        className="github-status-hover"
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 8,
                          background: isGitHubConnected 
                            ? (theme === 'dark' ? 'rgba(46, 204, 64, 0.1)' : 'rgba(46, 204, 64, 0.05)')
                            : (theme === 'dark' ? 'rgba(255, 88, 88, 0.1)' : 'rgba(255, 88, 88, 0.05)'),
                          padding: '6px 12px',
                          borderRadius: 8,
                          border: `1px solid ${isGitHubConnected 
                            ? (theme === 'dark' ? 'rgba(46, 204, 64, 0.3)' : 'rgba(46, 204, 64, 0.2)')
                            : (theme === 'dark' ? 'rgba(255, 88, 88, 0.3)' : 'rgba(255, 88, 88, 0.2)')}`,
                          minWidth: 140,
                          justifyContent: 'center',
                          cursor: isGitHubConnected ? 'pointer' : 'pointer',
                          position: 'relative',
                          transition: 'all 0.3s ease',
                          transform: 'scale(1)'
                        }}
                        title={isGitHubConnected ? `GitHub User ID: ${user.githubId}\nUsername: @${user.githubUsername}\nClick to disconnect` : 'Click to connect GitHub'}
                        onClick={isGitHubConnected ? () => setShowGitHubDisconnectConfirm(true) : () => setShowGitHubConnectWarning(true)}
                      >
                        <FaGithub className="fa-github" style={{ 
                          fontSize: 16, 
                          color: isGitHubConnected ? SUCCESS_COLOR : ERROR_COLOR 
                        }} />
                        <span style={{ 
                          color: isGitHubConnected ? SUCCESS_COLOR : ERROR_COLOR,
                          fontWeight: 600
                        }}>
                          {isGitHubConnected ? 'Connected' : 'Not Connected'}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
              {/* Role Badge */}
              {(() => {
                const roleInfo = getUserRoleInfo(user.email);
                if (roleInfo.role !== 'user') {
                  const IconComponent = roleInfo.role === 'owner' || roleInfo.role === 'admin' ? FaCrown : 
                                       roleInfo.role === 'feedback-manager' ? FaThumbsUp : FaUser;
                  
                  return (
                <div style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                      gap: '0.25rem',
                      background: roleInfo.color,
                  color: 'white', 
                  padding: '3px 12px',
                  borderRadius: 20, 
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  marginTop: 8,
                  boxShadow: theme === 'dark' ? '0 2px 8px #232136' : '0 2px 8px #eee',
                  letterSpacing: '0.5px',
                  animation: 'badgeShimmer 2.5s infinite'
                }}>
                      <IconComponent style={{ fontSize: '0.8rem' }} />
                      {roleInfo.name}
                </div>
                  );
                }
                return null;
              })()}
            </div>
            {/* Storage Management Section */}
            {!editMode && !showPasswordForm && (
              <div style={{ 
                marginTop: 20, 
                padding: '16px', 
                background: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)', 
                borderRadius: 12, 
                border: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}` 
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  marginBottom: 12 
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 8, 
                    fontWeight: 600, 
                    color: theme === 'dark' ? DARK_TEXT : LIGHT_TEXT 
                  }}>
                    <FaDatabase style={{ fontSize: 16, color: ACCENT_COLOR }} />
                    <span>Storage Usage</span>
                  </div>
                  <div style={{ 
                    fontSize: '0.9rem', 
                    color: theme === 'dark' ? '#bbb' : '#888',
                    fontWeight: 500
                  }}>
                    {getStorageUsage().totalSizeMB} MB
                  </div>
                </div>
                
                <div style={{ 
                  fontSize: '0.8rem', 
                  color: theme === 'dark' ? '#999' : '#666',
                  marginBottom: 12,
                  lineHeight: 1.4
                }}>
                  <div>📸 Photos: {getStorageUsage().profilePhotoSizeMB} MB ({getStorageUsage().profilePhotoCount} files)</div>
                  <div>📊 Other: {getStorageUsage().otherDataSizeMB} MB</div>
                </div>
                
                <div style={{ 
                  display: 'flex', 
                  gap: 8, 
                  flexWrap: 'wrap' 
                }}>
                  <button
                    style={{
                      padding: '6px 12px',
                      background: theme === 'dark' ? 'rgba(255, 152, 0, 0.1)' : 'rgba(255, 152, 0, 0.05)',
                      color: '#ff9800',
                      border: `1px solid ${theme === 'dark' ? 'rgba(255, 152, 0, 0.3)' : 'rgba(255, 152, 0, 0.2)'}`,
                      borderRadius: 6,
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => clearStorageData('profilePhotos')}
                    title="Clear all profile photos except yours"
                  >
                    Clear Photos
                  </button>
                  <button
                    style={{
                      padding: '6px 12px',
                      background: theme === 'dark' ? 'rgba(255, 88, 88, 0.1)' : 'rgba(255, 88, 88, 0.05)',
                      color: '#f44336',
                      border: `1px solid ${theme === 'dark' ? 'rgba(255, 88, 88, 0.3)' : 'rgba(255, 88, 88, 0.2)'}`,
                      borderRadius: 6,
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => clearStorageData('all')}
                    title="Clear all non-essential data"
                  >
                    Clear All Data
                  </button>
                </div>
                
                {getStorageUsage().totalSizeMB > 4 && (
                  <div style={{ 
                    marginTop: 8, 
                    padding: '8px 12px', 
                    background: theme === 'dark' ? 'rgba(255, 152, 0, 0.1)' : 'rgba(255, 152, 0, 0.05)', 
                    borderRadius: 6, 
                    border: `1px solid ${theme === 'dark' ? 'rgba(255, 152, 0, 0.2)' : 'rgba(255, 152, 0, 0.1)'}`,
                    fontSize: '0.8rem',
                    color: '#ff9800',
                    fontWeight: 500
                  }}>
                    ⚠️ Storage usage is high. Consider clearing some data.
                  </div>
                )}
              </div>
            )}

            {/* Accent color buttons with icons always visible */}
            {/* Only show Change Password and Delete Account buttons when not in edit mode and not in password form */}
            {!editMode && !showPasswordForm && (
              <div style={{ display: 'flex', gap: 12, width: '100%', marginTop: 16 }}>
                <button
                  className="login-btn profile-anim-btn"
                  style={{
                    width: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    fontWeight: 700,
                    fontSize: '1rem',
                    background: theme === 'dark' ? 'var(--accent-color-dark, #6c2eb7)' : 'var(--accent-color, #6c2eb7)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    padding: '8px 16px',
                    boxShadow: '0 2px 8px var(--accent-color, #6c2eb7)',
                    transition: 'background 0.18s, transform 0.18s, box-shadow 0.18s',
                    outline: 'none',
                    minHeight: 40,
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    willChange: 'transform'
                  }}
                  onClick={() => setShowPasswordForm(true)}
                >
                  <FaKey style={{ fontSize: 18 }} />
                  <span>Change Password</span>
                </button>
            <button
                  className="login-btn profile-anim-btn"
                  style={{
                    width: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    fontWeight: 700,
                    fontSize: '1rem',
                    background: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    padding: '8px 16px',
                    boxShadow: '0 2px 8px #f44336',
                    transition: 'background 0.18s, transform 0.18s, box-shadow 0.18s',
                    outline: 'none',
                    minHeight: 40,
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    willChange: 'transform'
                  }}
              onClick={() => setShowDeleteConfirm(true)}
                >
                  <FaTrash style={{ fontSize: 18 }} />
                  <span>Delete Account</span>
                </button>
              </div>
            )}
            {showDeleteConfirm && (
              <div className="modal-overlay" style={{ zIndex: 3000, background: theme === 'dark' ? 'rgba(35,33,54,0.85)' : 'rgba(60, 30, 90, 0.35)', backdropFilter: 'blur(2px)' }}>
                <div className="modal-content" style={{ maxWidth: 420, width: '100%', borderRadius: 20, textAlign: 'center', background: theme === 'dark' ? DARK_CARD : LIGHT_CARD, boxShadow: '0 8px 40px #ff5858', padding: '2.5rem 2rem', position: 'relative', animation: 'fadeInScale 0.7s cubic-bezier(.23,1.01,.32,1)', color: theme === 'dark' ? DARK_TEXT : LIGHT_TEXT }}>
                  <div className="modal-warning-icon" style={{ fontSize: 48, marginBottom: 12, color: ERROR_COLOR, animation: 'bounce 1.5s infinite' }}>⚠️</div>
                  <div style={{ fontWeight: 800, fontSize: '1.18rem', marginBottom: 10, color: ERROR_COLOR, letterSpacing: 0.5 }}>Are you sure you want to delete your account?</div>
                  <div style={{ color: ERROR_COLOR, marginBottom: 22, fontWeight: 600 }}>This action cannot be undone.</div>
                  <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 18 }}>
                    <button
                      style={{ background: '#bbb', color: '#222', border: 'none', borderRadius: 8, padding: '10px 28px', fontWeight: 700, fontSize: '1.05rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                      onClick={() => setShowDeleteConfirm(false)}
                    ><FaTimesCircle /> Cancel</button>
                    <button
                      style={{ background: ERROR_COLOR, color: 'white', border: 'none', borderRadius: 8, padding: '10px 28px', fontWeight: 700, fontSize: '1.05rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                      onClick={handleDeleteAccount}
                    ><FaTrash /> Delete</button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Account Deletion OTP Modal */}
            {showDeleteOTP && (
              <div className="modal-overlay" style={{ zIndex: 3000, background: theme === 'dark' ? 'rgba(35,33,54,0.85)' : 'rgba(60, 30, 90, 0.35)', backdropFilter: 'blur(2px)' }}>
                <div className="modal-content" style={{ maxWidth: 480, width: '100%', borderRadius: 20, background: theme === 'dark' ? DARK_CARD : LIGHT_CARD, boxShadow: '0 8px 40px #ff5858', padding: '2rem', position: 'relative', animation: 'fadeInScale 0.7s cubic-bezier(.23,1.01,.32,1)', color: theme === 'dark' ? DARK_TEXT : LIGHT_TEXT }}>
                  <AccountDeletionOTP
                    email={user.email}
                    onBack={handleDeleteAccountBack}
                    onSuccess={handleDeleteAccountSuccess}
                  />
                </div>
              </div>
            )}
            
            {/* GitHub Disconnect Confirmation Modal */}
            {showGitHubDisconnectConfirm && (
              <div className="modal-overlay" style={{ zIndex: 3000, background: theme === 'dark' ? 'rgba(35,33,54,0.85)' : 'rgba(60, 30, 90, 0.35)', backdropFilter: 'blur(2px)' }}>
                <div className="modal-content" style={{ maxWidth: 420, width: '100%', borderRadius: 20, textAlign: 'center', background: theme === 'dark' ? DARK_CARD : LIGHT_CARD, boxShadow: '0 8px 40px #ff5858', padding: '2.5rem 2rem', position: 'relative', animation: 'fadeInScale 0.7s cubic-bezier(.23,1.01,.32,1)', color: theme === 'dark' ? DARK_TEXT : LIGHT_TEXT }}>
                  <div style={{ fontSize: 48, marginBottom: 12, color: '#ff9800', animation: 'bounce 1.5s infinite' }}>🔗</div>
                  <div style={{ fontWeight: 800, fontSize: '1.18rem', marginBottom: 10, color: '#ff9800', letterSpacing: 0.5 }}>Disconnect GitHub Account?</div>
                  <div style={{ color: theme === 'dark' ? '#bbb' : '#666', marginBottom: 16, fontWeight: 500 }}>
                    Are you sure you want to disconnect your GitHub account (@{user.githubUsername})?
                  </div>
                  <div style={{ color: '#ff9800', marginBottom: 22, fontWeight: 600, fontSize: '0.95rem' }}>
                    You can always reconnect later by clicking the GitHub connection status.
                  </div>
                  <div style={{ 
                    background: theme === 'dark' ? 'rgba(255, 152, 0, 0.1)' : 'rgba(255, 152, 0, 0.05)', 
                    border: `1px solid ${theme === 'dark' ? 'rgba(255, 152, 0, 0.3)' : 'rgba(255, 152, 0, 0.2)'}`,
                    borderRadius: 8, 
                    padding: '12px', 
                    marginBottom: 20,
                    fontSize: '0.9rem',
                    color: theme === 'dark' ? '#bbb' : '#666'
                  }}>
                    <strong style={{ color: '#ff9800' }}>Note:</strong> To completely remove access from GitHub's side, you'll need to visit 
                    <a 
                      href="https://github.com/settings/applications" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ color: '#ff9800', textDecoration: 'underline', marginLeft: 4 }}
                    >
                      GitHub Settings → Applications
                    </a> 
                    and revoke access for "Unified Knowledge Platform".
                  </div>
                  <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 18 }}>
                    <button
                      style={{ background: '#bbb', color: '#222', border: 'none', borderRadius: 8, padding: '10px 28px', fontWeight: 700, fontSize: '1.05rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                      onClick={() => setShowGitHubDisconnectConfirm(false)}
                    ><FaTimesCircle /> Cancel</button>
                    <button
                      style={{ background: '#ff9800', color: 'white', border: 'none', borderRadius: 8, padding: '10px 28px', fontWeight: 700, fontSize: '1.05rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                      onClick={() => {
                        handleGitHubDisconnect();
                        setShowGitHubDisconnectConfirm(false);
                      }}
                    ><FaUnlink /> Disconnect</button>
                  </div>
                </div>
              </div>
            )}
            
            {/* GitHub Connect Warning Modal */}
            {showGitHubConnectWarning && (
              <div className="modal-overlay" style={{ zIndex: 3000, background: theme === 'dark' ? 'rgba(35,33,54,0.85)' : 'rgba(60, 30, 90, 0.35)', backdropFilter: 'blur(2px)' }}>
                <div className="modal-content" style={{ maxWidth: 420, width: '100%', borderRadius: 20, textAlign: 'center', background: theme === 'dark' ? DARK_CARD : LIGHT_CARD, boxShadow: '0 8px 40px #6c2eb7', padding: '2.5rem 2rem', position: 'relative', animation: 'fadeInScale 0.7s cubic-bezier(.23,1.01,.32,1)', color: theme === 'dark' ? DARK_TEXT : LIGHT_TEXT }}>
                  <div style={{ fontSize: 48, marginBottom: 12, color: ACCENT_COLOR, animation: 'bounce 1.5s infinite' }}>🔗</div>
                  <div style={{ fontWeight: 800, fontSize: '1.18rem', marginBottom: 10, color: ACCENT_COLOR, letterSpacing: 0.5 }}>Connect GitHub Account?</div>
                  <div style={{ color: theme === 'dark' ? '#bbb' : '#666', marginBottom: 16, fontWeight: 500 }}>
                    You're about to connect your GitHub account to this application.
                  </div>
                  <div style={{ 
                    background: theme === 'dark' ? 'rgba(108, 46, 183, 0.1)' : 'rgba(108, 46, 183, 0.05)', 
                    border: `1px solid ${theme === 'dark' ? 'rgba(108, 46, 183, 0.3)' : 'rgba(108, 46, 183, 0.2)'}`,
                    borderRadius: 8, 
                    padding: '12px', 
                    marginBottom: 20,
                    fontSize: '0.9rem',
                    color: theme === 'dark' ? '#bbb' : '#666'
                  }}>
                    <strong style={{ color: ACCENT_COLOR }}>What this app will access:</strong>
                    <ul style={{ textAlign: 'left', margin: '8px 0 0 0', paddingLeft: '20px' }}>
                      <li>Your GitHub username and profile information</li>
                      <li>Your email address (if public)</li>
                      <li>Basic account details</li>
                    </ul>
                  </div>
                  <div style={{ color: ACCENT_COLOR, marginBottom: 22, fontWeight: 600, fontSize: '0.95rem' }}>
                    You can disconnect anytime from your profile settings.
                  </div>
                  <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 18 }}>
                    <button
                      style={{ background: '#bbb', color: '#222', border: 'none', borderRadius: 8, padding: '10px 28px', fontWeight: 700, fontSize: '1.05rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                      onClick={() => setShowGitHubConnectWarning(false)}
                    ><FaTimesCircle /> Cancel</button>
                    <button
                      style={{ background: ACCENT_COLOR, color: 'white', border: 'none', borderRadius: 8, padding: '10px 28px', fontWeight: 700, fontSize: '1.05rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                      onClick={() => {
                        handleGitHubConnect();
                        setShowGitHubConnectWarning(false);
                      }}
                    ><FaGithub /> Connect GitHub</button>
                  </div>
                </div>
              </div>
            )}
            {success && <div className="login-success" style={{ background: SUCCESS_COLOR, color: 'white', borderRadius: 8, padding: '8px 0', marginTop: 8, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, animation: 'fadeInMsg' }}><FaCheckCircle /> {success}</div>}
            {error && <div className="login-error" style={{ background: ERROR_COLOR, color: 'white', borderRadius: 8, padding: '8px 0', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, animation: 'fadeInMsg' }}><FaTimesCircle /> {error}</div>}
          </div>
        )}
        {/* Password form remains as before, but with improved button styles */}
        {showPasswordForm && (
          <form className="login-form" onSubmit={handlePasswordSave} style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <label htmlFor="oldPassword" style={{ fontWeight: 600, color: ACCENT_COLOR, marginBottom: 4 }}>Old Password</label>
            <input
              id="oldPassword"
              type="password"
              value={oldPassword}
              onChange={e => setOldPassword(e.target.value)}
              placeholder="Enter old password"
              autoComplete="current-password"
              style={{ borderRadius: 8, border: `1.5px solid ${ACCENT_COLOR}`, padding: '10px', fontSize: '1.05rem', marginBottom: 8, background: theme === 'dark' ? DARK_BG : LIGHT_BG, color: theme === 'dark' ? DARK_TEXT : LIGHT_TEXT }}
            />
            <label htmlFor="newPassword" style={{ fontWeight: 600, color: ACCENT_COLOR, marginBottom: 4 }}>New Password</label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              autoComplete="new-password"
              style={{ borderRadius: 8, border: `1.5px solid ${ACCENT_COLOR}`, padding: '10px', fontSize: '1.05rem', marginBottom: 8, background: theme === 'dark' ? DARK_BG : LIGHT_BG, color: theme === 'dark' ? DARK_TEXT : LIGHT_TEXT }}
            />
            <label htmlFor="confirmPassword" style={{ fontWeight: 600, color: ACCENT_COLOR, marginBottom: 4 }}>Confirm New Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              autoComplete="new-password"
              style={{ borderRadius: 8, border: `1.5px solid ${ACCENT_COLOR}`, padding: '10px', fontSize: '1.05rem', marginBottom: 8, background: theme === 'dark' ? DARK_BG : LIGHT_BG, color: theme === 'dark' ? DARK_TEXT : LIGHT_TEXT }}
            />
            {error && <div className="login-error" style={{ background: ERROR_COLOR, color: 'white', borderRadius: 8, padding: '8px 0', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}><FaTimesCircle /> {error}</div>}
            {success && <div className="login-success" style={{ background: SUCCESS_COLOR, color: 'white', borderRadius: 8, padding: '8px 0', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}><FaCheckCircle /> {success}</div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18, gap: 10 }}>
              <button type="button" className="login-btn" style={{ background: '#bbb', color: '#222', width: '48%', fontWeight: 700, borderRadius: 8 }} onClick={() => { setShowPasswordForm(false); setError(''); }}>Cancel</button>
              <button type="submit" className="login-btn" style={{ width: '48%', fontWeight: 700, borderRadius: 8, background: ACCENT_COLOR, color: 'white' }} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        )}
        {/* At the bottom of the modal, in edit mode, show Save/Cancel buttons */}
        {editMode && (
          <div style={{ display: 'flex', gap: 14, width: '100%', marginTop: 18, justifyContent: 'center' }}>
            <button
              className="login-btn profile-anim-btn"
              style={{
                width: '40%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontWeight: 700,
                fontSize: '1.05rem',
                background: theme === 'dark' ? 'var(--accent-color-dark, #6c2eb7)' : 'var(--accent-color, #6c2eb7)',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                padding: '10px 0',
                boxShadow: '0 2px 8px var(--accent-color, #6c2eb7)',
                transition: 'background 0.18s, transform 0.18s, box-shadow 0.18s',
                outline: 'none',
                minHeight: 44,
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                willChange: 'transform'
              }}
              onClick={() => { setEditMode(false); }}
            >
              Cancel
            </button>
            <button
              className="login-btn profile-anim-btn"
              style={{
                width: '40%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontWeight: 700,
                fontSize: '1.05rem',
                background: theme === 'dark' ? 'var(--accent-color-dark, #6c2eb7)' : 'var(--accent-color, #6c2eb7)',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                padding: '10px 0',
                boxShadow: '0 2px 8px var(--accent-color, #6c2eb7)',
                transition: 'background 0.18s, transform 0.18s, box-shadow 0.18s',
                outline: 'none',
                minHeight: 44,
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                willChange: 'transform'
              }}
              onClick={() => {
                setEditMode(false);
                onSave && onSave({ ...user, name, preferredModel });
              }}
            >
              Save
            </button>
          </div>
        )}
        {/* Background animation for modal overlay */}
        <style>{`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes fadeInScale { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
          @keyframes bounceIn { 0% { transform: scale(0.7); } 60% { transform: scale(1.1); } 100% { transform: scale(1); } }
          @keyframes shimmer { 0% { background-position: 0 0, 0 0; } 100% { background-position: 100px 100px, 100px 100px; } }
          @keyframes badgeShimmer { 0% { box-shadow: 0 0 0 0 ${ACCENT_COLOR}; } 50% { box-shadow: 0 0 12px 2px ${ACCENT_COLOR}; } 100% { box-shadow: 0 0 0 0 ${ACCENT_COLOR}; } }
          @keyframes fadeInMsg { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          .animated-bg::before {
            content: '';
            position: fixed;
            top: 0; left: 0; width: 100vw; height: 100vh;
            background: repeating-linear-gradient(120deg, rgba(108,46,183,0.07) 0 2px, transparent 2px 40px), repeating-linear-gradient(60deg, rgba(108,46,183,0.07) 0 2px, transparent 2px 40px);
            z-index: 0;
            pointer-events: none;
            animation: shimmer 3s linear infinite;
          }
          .avatar-hover:hover {
            box-shadow: 0 0 0 6px #a084e8aa, 0 4px 16px #6c2eb7;
            transform: scale(1.07);
            transition: box-shadow 0.2s, transform 0.2s;
          }
          .profile-anim-btn:hover {
            transform: scale(1.045) translateY(-2px);
            box-shadow: 0 6px 18px #6c2eb7;
            filter: brightness(1.08);
          }
          .profile-anim-btn:active {
            transform: scale(0.97);
            box-shadow: 0 2px 8px #6c2eb7;
            filter: brightness(0.97);
          }
          .login-success, .login-error {
            animation: fadeInMsg 0.5s;
          }
          .admin-badge-anim {
            animation: badgeShimmer 2.5s infinite;
          }
          .github-status-hover:hover {
            transform: scale(1.05);
            box-shadow: 0 0 0 6px #a084e8aa, 0 4px 16px #6c2eb7;
            transition: transform 0.2s, box-shadow 0.2s;
          }
          .github-status-hover:hover .fa-github {
            animation: githubPulse 0.6s ease-in-out;
          }
          @keyframes githubPulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); }
          }
        `}</style>
      </div>
    </div>
  );
}

export default ProfileModal; 