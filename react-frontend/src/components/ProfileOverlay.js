import React, { useState, useEffect } from 'react';
import { FaUser, FaRobot, FaCog, FaShieldAlt, FaCrown, FaCheck, FaUserTie, FaStar, FaPlus, FaEdit, FaTrash, FaCircle, FaMoon, FaMinus, FaTimes } from 'react-icons/fa';
import { getAllRoles, getUserRole, assignRoleToUser, canAssignRoles } from '../utils/permissions';

const ProfileOverlay = ({ isOpen, onClose, profileData, type = 'user' }) => {
  const [roles, setRoles] = useState({});
  const [userCurrentRole, setUserCurrentRole] = useState(null);
  const [showRoleManager, setShowRoleManager] = useState(false);
  const [canManageRoles, setCanManageRoles] = useState(false);
  const [userStatus, setUserStatus] = useState(() => {
    return localStorage.getItem('userStatus') || 'online';
  });

  // Listen for status changes from main App
  useEffect(() => {
    const handleStatusChange = (event) => {
      setUserStatus(event.detail.status);
    };

    window.addEventListener('userStatusChanged', handleStatusChange);
    return () => {
      window.removeEventListener('userStatusChanged', handleStatusChange);
    };
  }, []);

  const isUser = type === 'user';
  const isAssistant = type === 'assistant';

  // Load roles and user's current role
  useEffect(() => {
    if (isUser && profileData?.email) {
      const allRoles = getAllRoles();
      setRoles(allRoles);
      
      const currentRole = getUserRole(profileData.email);
      setUserCurrentRole(currentRole);
      
      // Check if current user can assign roles
      const currentUserEmail = localStorage.getItem('userEmail');
      setCanManageRoles(canAssignRoles(currentUserEmail));
    }
  }, [isUser, profileData?.email]);

  if (!isOpen) return null;

  const getIconComponent = (iconString) => {
    const iconMap = {
      'FaCrown': FaCrown,
      'FaUser': FaUser,
      'FaShieldAlt': FaShieldAlt,
      'FaThumbsUp': FaUserTie,
      'FaUserTie': FaUserTie
    };
    return iconMap[iconString] || FaUser;
  };

  const handleRoleChange = (newRoleKey) => {
    if (profileData?.email && canManageRoles) {
      assignRoleToUser(profileData.email, newRoleKey);
      setUserCurrentRole(newRoleKey);
      setShowRoleManager(false);
    }
  };



  const statusOptions = [
    { key: 'online', name: 'Online', icon: FaCircle, color: '#43b581', description: '' },
    { key: 'idle', name: 'Idle', icon: FaMoon, color: '#faa61a', description: '' },
    { key: 'dnd', name: 'Do Not Disturb', icon: FaMinus, color: '#f04747', description: 'You will not receive desktop notifications' },
    { key: 'invisible', name: 'Invisible', icon: FaCircle, color: '#747f8d', description: 'You will appear offline' }
  ];

  const getStatusIcon = (status) => {
    const statusOption = statusOptions.find(option => option.key === status);
    if (statusOption) {
      const IconComponent = statusOption.icon;
      return <IconComponent size={12} style={{ color: statusOption.color }} />;
    }
    return <FaCircle size={12} style={{ color: '#43b581' }} />;
  };

  // Mock bot badges
  const botBadges = [
    { name: 'Bot', color: '#7289da', icon: FaRobot },
    { name: 'Verified', color: '#43b581', icon: FaCheck },
    { name: 'Premium', color: '#faa61a', icon: FaStar }
  ];

  return (
    <div className="profile-overlay">
      <div className="profile-overlay-backdrop" onClick={onClose}></div>
      <div className="profile-card">
        <div className="profile-banner">
          <div className="profile-avatar-large">
            {isUser ? (
              profileData?.avatar ? (
                profileData.avatar.toLowerCase().endsWith('.gif') ? (
                  <img 
                    src={profileData.avatar} 
                    alt={profileData.name || 'User'} 
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      borderRadius: '50%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <img 
                    src={profileData.avatar} 
                    alt={profileData.name || 'User'} 
                  />
                )
              ) : (
                <span style={{ color: '#fff', fontWeight: 700, fontSize: 24 }}>
                  {profileData?.name?.charAt(0) || 'U'}
                </span>
              )
            ) : (
              <img 
                src="/unified-knowledge-platform.png" 
                alt="Unified Knowledge Platform" 
                style={{ filter: 'grayscale(100%) brightness(0.7)' }}
              />
            )}
            {/* Status indicator on profile picture */}
            {isUser && (
              <div style={{
                position: 'absolute',
                bottom: '8px',
                right: '8px',
                width: '16px',
                height: '16px',
                background: userStatus === 'online' ? '#43b581' : 
                           userStatus === 'idle' ? '#faa61a' : 
                           userStatus === 'dnd' ? '#f04747' : '#747f8d',
                borderRadius: '50%',
                border: '2px solid white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                zIndex: 10
              }}>
                {userStatus === 'idle' && <FaMoon size={7} style={{ color: 'white' }} />}
                {userStatus === 'dnd' && <FaMinus size={7} style={{ color: 'white' }} />}
              </div>
            )}
          </div>
        </div>
        
        <div className="profile-content">
          <div className="profile-username">
            {isUser ? (profileData?.name || 'User') : 'Unified Knowledge Platform'}
          </div>
          
          <div className="profile-userid">
            {isUser ? (profileData?.email || 'user@example.com') : 'AI Assistant'}
          </div>


          
          <div className="profile-badges">
            {isUser ? (
              // Show user's current role
              userCurrentRole && roles[userCurrentRole] ? (
                <div className="profile-role-tile" style={{ backgroundColor: roles[userCurrentRole].color }}>
                  {React.createElement(getIconComponent(roles[userCurrentRole].icon), { size: 12 })}
                  <span>{roles[userCurrentRole].name}</span>
                  {canManageRoles && (
                    <button 
                      onClick={() => setShowRoleManager(!showRoleManager)}
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        color: 'white', 
                        cursor: 'pointer',
                        marginLeft: '8px',
                        fontSize: '10px'
                      }}
                    >
                      <FaEdit size={10} />
                    </button>
                  )}
                </div>
              ) : (
                <div className="profile-role-tile" style={{ backgroundColor: '#6b7280' }}>
                  <FaUser size={12} />
                  <span>User</span>
                </div>
              )
            ) : (
              // Bot badges as tiles
              botBadges.map((badge, index) => {
                const IconComponent = badge.icon;
                return (
                  <div key={index} className="profile-badge-tile" style={{ backgroundColor: badge.color }}>
                    <IconComponent size={12} />
                    <span>{badge.name}</span>
                  </div>
                );
              })
            )}
          </div>

          {/* Role Manager */}
          {isUser && showRoleManager && canManageRoles && (
            <div className="role-manager" style={{ 
              marginTop: '12px', 
              padding: '12px', 
              background: 'var(--bg-primary)', 
              borderRadius: '8px',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
                Change Role
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {Object.entries(roles).map(([roleKey, roleData]) => (
                  <button
                    key={roleKey}
                    onClick={() => handleRoleChange(roleKey)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 8px',
                      background: roleKey === userCurrentRole ? 'var(--accent-color)' : 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      color: roleKey === userCurrentRole ? 'white' : 'var(--text-primary)',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {React.createElement(getIconComponent(roleData.icon), { size: 12 })}
                    <span>{roleData.name}</span>
                    {roleKey === userCurrentRole && <FaCheck size={10} />}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div className="profile-details">
            {isUser ? (
              <>
                <div className="profile-detail-item">
                  <div className="profile-detail-icon">
                    <FaUser />
                  </div>
                  <div className="profile-detail-label">Role:</div>
                  <div className="profile-detail-value">
                    {userCurrentRole && roles[userCurrentRole] ? roles[userCurrentRole].name : 'User'}
                  </div>
                </div>

              </>
            ) : (
              <>
                <div className="profile-detail-item">
                  <div className="profile-detail-icon">
                    <FaRobot />
                  </div>
                  <div className="profile-detail-label">Model:</div>
                  <div className="profile-detail-value">{profileData?.model || 'Gemini 2.5 Flash'}</div>
                </div>
                <div className="profile-detail-item">
                  <div className="profile-detail-icon">
                    <FaShieldAlt />
                  </div>
                  <div className="profile-detail-label">Agent:</div>
                  <div className="profile-detail-value">{profileData?.agent || 'Unified® Mode'}</div>
                </div>
                <div className="profile-detail-item">
                  <div className="profile-detail-icon">
                    <FaCog />
                  </div>
                  <div className="profile-detail-label">Status:</div>
                  <div className="profile-detail-value">Active</div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileOverlay; 