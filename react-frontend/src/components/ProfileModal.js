import React, { useState, useRef, useEffect } from 'react';
import '../styles/LoginView.css';
import Switch from 'react-switch';
import { FaSun, FaMoon } from 'react-icons/fa';

const USERS_KEY = 'ukpUsers';

function ProfileModal({ user, onClose, onSave, theme, setTheme }) {
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
  const modalRef = useRef(null);

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
    const reader = new FileReader();
    reader.onload = (ev) => setAvatar(ev.target.result);
    reader.readAsDataURL(file);
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
    const users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    const filtered = users.filter(u => u.email !== user.email);
    localStorage.setItem(USERS_KEY, JSON.stringify(filtered));
    localStorage.removeItem('ukpUser');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userEmail');
    onSave && onSave({ deleted: true });
    onClose && onClose();
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 2000 }}>
      <div className="modal-content" ref={modalRef} style={{ maxWidth: 520, width: '100%', padding: '2.7rem 2.2rem', borderRadius: 16 }}>
        <h2 style={{ textAlign: 'center', marginBottom: 18 }}>Profile</h2>
        {!editMode && !showPasswordForm && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
            <div style={{ marginBottom: 12 }}>
              {avatar ? (
                <img src={avatar} alt="Avatar" style={{ width: 64, height: 64, borderRadius: '50%' }} />
              ) : (
                <div className="user-avatar-initial" style={{ width: 64, height: 64, fontSize: 32, borderRadius: '50%', background: 'var(--accent-color)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{name.charAt(0)}</div>
              )}
            </div>
            <div style={{ width: '100%' }}>
              <div style={{ fontWeight: 700, fontSize: '1.2rem', marginBottom: 2 }}>{name}</div>
              <div style={{ color: '#888', fontSize: '1.01rem', marginBottom: 8 }}>{user.email}</div>
            </div>
            <div style={{ display: 'flex', gap: 10, width: '100%', marginTop: 10 }}>
              <button className="login-btn" style={{ width: '50%' }} onClick={() => setEditMode(true)}>Edit</button>
              <button className="login-btn" style={{ width: '50%' }} onClick={() => setShowPasswordForm(true)}>Change Password</button>
            </div>
            <button
              style={{ background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: 8, padding: '8px 22px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', width: '100%', marginTop: 12 }}
              onClick={() => setShowDeleteConfirm(true)}
            >Delete Account</button>
            {showDeleteConfirm && (
              <div className="modal-overlay" style={{ zIndex: 3000 }}>
                <div className="modal-content" style={{ maxWidth: 420, width: '100%', borderRadius: 16, textAlign: 'center' }}>
                  <div className="modal-warning-icon">⚠️</div>
                  <div style={{ fontWeight: 700, fontSize: '1.13rem', marginBottom: 10, color: 'var(--text-primary)' }}>Are you sure you want to delete your account?</div>
                  <div style={{ color: 'var(--accent-color)', marginBottom: 22, fontWeight: 500 }}>This action cannot be undone.</div>
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 18 }}>
                    <button
                      style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: 'none', borderRadius: 8, padding: '8px 22px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}
                      onClick={() => setShowDeleteConfirm(false)}
                    >Cancel</button>
                    <button
                      style={{ background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: 8, padding: '8px 22px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}
                      onClick={handleDeleteAccount}
                    >Delete</button>
                  </div>
                </div>
              </div>
            )}
            {success && <div className="login-success">{success}</div>}
          </div>
        )}
        {editMode && (
          <form className="login-form" onSubmit={handleProfileSave} style={{ marginTop: 8 }}>
            <label htmlFor="profileName">Name</label>
            <input
              id="profileName"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
            <label htmlFor="profileAvatar">Avatar</label>
            <input
              id="profileAvatar"
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
            />
            {avatar && <img src={avatar} alt="Avatar preview" style={{ width: 48, height: 48, borderRadius: '50%', margin: '0.5rem auto' }} />}
            {error && <div className="login-error">{error}</div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18 }}>
              <button type="button" className="login-btn" style={{ background: '#bbb', color: '#222', width: '48%' }} onClick={() => { setEditMode(false); setError(''); }}>Cancel</button>
              <button type="submit" className="login-btn" style={{ width: '48%' }} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        )}
        {showPasswordForm && (
          <form className="login-form" onSubmit={handlePasswordSave} style={{ marginTop: 8 }}>
            <label htmlFor="oldPassword">Old Password</label>
            <input
              id="oldPassword"
              type="password"
              value={oldPassword}
              onChange={e => setOldPassword(e.target.value)}
              placeholder="Enter old password"
              autoComplete="current-password"
            />
            <label htmlFor="newPassword">New Password</label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              autoComplete="new-password"
            />
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              autoComplete="new-password"
            />
            {error && <div className="login-error">{error}</div>}
            {success && <div className="login-success">{success}</div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18 }}>
              <button type="button" className="login-btn" style={{ background: '#bbb', color: '#222', width: '48%' }} onClick={() => { setShowPasswordForm(false); setError(''); }}>Cancel</button>
              <button type="submit" className="login-btn" style={{ width: '48%' }} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ProfileModal; 