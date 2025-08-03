import React, { useState, useEffect, useRef } from 'react';
import { 
  FaTimes, 
  FaCircle, 
  FaMoon, 
  FaMinus, 
  FaUser, 
  FaCrown, 
  FaShieldAlt, 
  FaUserTie,
  FaGithub,
  FaCalendarAlt,
  FaUserFriends,
  FaStar,
  FaRobot,
  FaCheck,
  FaEdit,
  FaUpload,
  FaTrash
} from 'react-icons/fa';
import { getAllRoles, getUserRoles } from '../utils/permissions';
import { loadBannerFromFolder } from '../utils/bannerStorage';
import '../styles/ProfileOverlay.css';

const ProfileOverlay = ({ isOpen, onClose, profileData, type = 'user' }) => {
  const [userRoles, setUserRoles] = useState([]);


  const [userBanner, setUserBanner] = useState(null);

  const [userStatus, setUserStatus] = useState(() => {
    return localStorage.getItem('userStatus') || 'online';
  });



  const isUser = type === 'user';

  // Load user roles
  useEffect(() => {
    if (isUser && profileData?.email) {
      const userRoleList = getUserRoles(profileData.email);
      setUserRoles(userRoleList);
    }
  }, [isUser, profileData?.email]);



  // Load banner from dedicated folder
  useEffect(() => {
    const loadBanner = async () => {
      if (isUser && profileData?.email) {
        try {
          const bannerData = await loadBannerFromFolder(profileData.email);
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

    // Listen for banner updates
    const handleBannerUpdate = () => {
      loadBanner();
    };

    window.addEventListener('bannerUpdated', handleBannerUpdate);
    return () => {
      window.removeEventListener('bannerUpdated', handleBannerUpdate);
    };
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





  const getStatusIcon = (status) => {
  const statusOptions = [
    { key: 'online', name: 'Online', icon: FaCircle, color: '#43b581', description: '' },
    { key: 'idle', name: 'Idle', icon: FaMoon, color: '#faa61a', description: '' },
    { key: 'dnd', name: 'Do Not Disturb', icon: FaMinus, color: '#f04747', description: 'You will not receive desktop notifications' },
      { key: 'invisible', name: 'Invisible', icon: FaCircle, color: '#ffffff', description: 'You will appear offline' }
  ];

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

  // Get member since date
  const getMemberSinceDate = () => {
    if (isUser && profileData?.email) {
      // Get user creation date from localStorage or use current date
      const userData = JSON.parse(localStorage.getItem('ukpUser') || '{}');
      const creationDate = userData.createdAt || new Date().toISOString();
      return new Date(creationDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
    return new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get GitHub profile info
  const getGitHubInfo = () => {
    if (isUser && profileData?.email) {
      const userData = JSON.parse(localStorage.getItem('ukpUser') || '{}');
      return {
        isLinked: userData.githubUsername && userData.githubId,
        username: userData.githubUsername,
        profileUrl: userData.githubUsername ? `https://github.com/${userData.githubUsername}` : null
      };
    }
    return { isLinked: false, username: null, profileUrl: null };
  };

  const githubInfo = getGitHubInfo();



  return (
    <div className="profile-overlay">
      <div className="profile-overlay-backdrop" onClick={onClose}></div>
      <div className="profile-card">
        <div className="profile-banner" style={{
          background: userBanner && isUser ? 'none' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          position: 'relative',
          overflow: 'hidden',
          width: '100%',
          minHeight: '120px',
          maxHeight: '200px',
          height: userBanner && isUser ? 'auto' : '120px'
        }}>
          {userBanner && isUser && (
            <img 
              src={userBanner} 
              alt="Profile Banner" 
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                position: 'absolute',
                top: 0,
                left: 0,
                zIndex: 1
              }}
              onLoad={(e) => {
                const img = e.target;
                const bannerElement = img.parentElement;
                const aspectRatio = img.naturalWidth / img.naturalHeight;
                const containerWidth = bannerElement.offsetWidth;
                
                if (aspectRatio > 2) {
                  bannerElement.style.height = `${containerWidth / aspectRatio}px`;
                } else if (aspectRatio < 0.5) {
                  bannerElement.style.height = '200px';
                } else {
                  bannerElement.style.height = `${containerWidth / aspectRatio}px`;
                }
                
                const calculatedHeight = parseFloat(bannerElement.style.height);
                if (calculatedHeight < 120) {
                  bannerElement.style.height = '120px';
                } else if (calculatedHeight > 200) {
                  bannerElement.style.height = '200px';
                }
              }}
            />
          )}
          

        </div>
        
        <div className="profile-content">
          <div className="profile-avatar-large">
            {isUser ? (
              profileData?.avatar ? (
                  <img 
                    src={profileData.avatar} 
                    alt={profileData.name || 'User'} 
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      borderRadius: '50%',
                    objectFit: 'cover',
                    display: 'block'
                  }}
                />
              ) : (
                <div style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 24,
                  fontWeight: 700
                }}>
                  {profileData?.name?.charAt(0) || 'U'}
                </div>
              )
            ) : (
              <div style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: 24,
                fontWeight: 700
              }}>
                {profileData?.name?.charAt(0) || 'A'}
              </div>
            )}
          </div>
          <div className="profile-username">
            {profileData?.name || (isUser ? 'User' : 'Agent')}
          </div>
          <div className="profile-userid">
            {profileData?.email || 'No email provided'}
          </div>

          {/* Member Since Section */}
          <div style={{ 
            marginBottom: 20, 
            padding: 12, 
            background: 'var(--bg-tertiary)', 
            borderRadius: 8, 
            borderLeft: '4px solid var(--accent-color)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
              Member of Unified® since
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>
              <FaCalendarAlt style={{ marginRight: 8, color: 'var(--accent-color)' }} />
              {getMemberSinceDate()}
            </div>
          </div>

          {/* Roles Section */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
              Roles
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {isUser && userRoles.length > 0 ? (
                userRoles.map((roleKey, index) => {
                  const allRoles = getAllRoles();
                  const roleData = allRoles[roleKey];
                  if (!roleData) return null;
                  
                  const IconComponent = typeof roleData.icon === 'string' ? getIconComponent(roleData.icon) : (roleData.icon || FaUser);
                  
                  return (
                                                              <div
                       key={roleKey}
                       style={{
                         display: 'inline-flex',
                         alignItems: 'center',
                         gap: 6,
                         padding: '6px 12px',
                         borderRadius: 20,
                         backgroundColor: roleData.color,
                         color: 'white',
                         fontSize: '0.8rem',
                         fontWeight: 600,
                         whiteSpace: 'nowrap',
                         boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
                         transition: 'all 0.2s ease'
                       }}
                     >
                       <IconComponent style={{ color: 'white' }} />
                       {roleData.name}
                     </div>
                  );
                })
              ) : (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 20,
                  backgroundColor: '#6b7280',
                  color: 'white',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  opacity: 0.8
                }}>
                  <FaUser style={{ color: 'white' }} />
                  {isUser ? 'No roles assigned' : 'Agent Role'}
                </div>
              )}
            </div>
          </div>

          {/* GitHub Section */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
              GitHub Profile
            </div>
            {githubInfo.isLinked ? (
              <a 
                href={githubInfo.profileUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: 8,
                  background: 'var(--bg-tertiary)',
                  borderRadius: 6,
                  textDecoration: 'none',
                  color: 'var(--text-primary)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.background = 'var(--accent-color)'}
                onMouseLeave={(e) => e.target.style.background = 'var(--bg-tertiary)'}
              >
                <FaGithub style={{ color: 'var(--accent-color)' }} />
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                    {githubInfo.username}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    Linked
                  </div>
                </div>
              </a>
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: 8,
                background: 'var(--bg-tertiary)',
                borderRadius: 6,
                color: 'var(--text-secondary)'
              }}>
                <FaGithub />
                <div style={{ fontSize: '0.9rem' }}>
                  GitHub not linked
                </div>
                  </div>
            )}
          </div>

          
          
          
        </div>
      </div>
    </div>
  );
};

export default ProfileOverlay; 