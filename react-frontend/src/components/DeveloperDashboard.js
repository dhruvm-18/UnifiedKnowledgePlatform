import React, { useState, useEffect, useRef } from 'react';
import FeedbackDashboard from './FeedbackDashboard';
import MonitoringDashboard from './MonitoringDashboard';
import { FaThumbsUp, FaChartLine, FaSun, FaMoon, FaUserCog, FaTrash, FaCrown, FaUser, FaEdit, FaCheck, FaTimes, FaGithub, FaPlus, FaChevronDown, FaShieldAlt } from 'react-icons/fa';
import IAMSystem from './IAMSystem';
import { 
  canAccessDeveloperOptions, 
  canAccessFeedbackDashboard, 
  canAccessMonitoringDashboard, 
  canAccessRoleManagement, 
  getUserRoleInfo 
} from '../utils/permissions';

const DeveloperDashboard = () => {
  const [developerActiveView, setDeveloperActiveView] = useState('feedback');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(null);

  // Get current user info
  const currentUserEmail = localStorage.getItem('userEmail');
  const currentUserRoleInfo = getUserRoleInfo(currentUserEmail);
  const currentUserIsAdmin = localStorage.getItem('userIsAdmin') === 'true';
  const currentUserIsFeedbackManager = localStorage.getItem('userIsFeedbackManager') === 'true';

  // Check if user is properly logged in
  const isUserLoggedIn = localStorage.getItem('isLoggedIn') === 'true' && currentUserEmail;

  // Set initial active view based on user permissions
  const getInitialActiveView = () => {
    if (canAccessFeedbackDashboard(currentUserEmail)) return 'feedback';
    if (canAccessMonitoringDashboard(currentUserEmail)) return 'monitoring';
    if (canAccessRoleManagement(currentUserEmail)) return 'iam';
    return 'feedback'; // fallback
  };

  useEffect(() => {
    setDeveloperActiveView(getInitialActiveView());
  }, []);

  // Click outside handler for role dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (roleDropdownOpen && !event.target.closest('.role-dropdown')) {
        setRoleDropdownOpen(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [roleDropdownOpen]);

  const toggleTheme = () => {
    const newTheme = isDarkMode ? 'light' : 'dark';
    setIsDarkMode(!isDarkMode);
    
    // Update localStorage
    localStorage.setItem('theme', newTheme);
    
    // Apply theme to document body and html
    if (newTheme === 'dark') {
      document.body.classList.add('dark-mode');
      document.documentElement.classList.add('dark-mode');
      } else {
      document.body.classList.remove('dark-mode');
      document.documentElement.classList.remove('dark-mode');
    }
  };

  // Initialize theme on component mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    const isDark = savedTheme === 'dark';
    setIsDarkMode(isDark);
    
    if (isDark) {
      document.body.classList.add('dark-mode');
      document.documentElement.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
      document.documentElement.classList.remove('dark-mode');
    }
  }, []);

  // Listen for logout events and refresh dev tools
  useEffect(() => {
    const checkLoginStatus = () => {
      const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
      const userEmail = localStorage.getItem('userEmail');
      
      if (!isLoggedIn || !userEmail) {
        // Clear any remaining user data
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userIsAdmin');
        localStorage.removeItem('userIsFeedbackManager');
        localStorage.removeItem('githubId');
        localStorage.removeItem('githubUsername');
        
        // Redirect to home page
        window.location.href = '/';
        return false;
      }
      return true;
  };

    const handleLogout = () => {
      checkLoginStatus();
    };

    // Listen for storage changes (when user logs out from another tab)
    const handleStorageChange = (e) => {
      if (e.key === 'isLoggedIn' || e.key === 'userEmail') {
        checkLoginStatus();
      }
    };

    // Listen for custom logout event
    window.addEventListener('userLogout', handleLogout);
    window.addEventListener('storage', handleStorageChange);

    // Check login status immediately
    checkLoginStatus();

    // Set up periodic check for login status
    const intervalId = setInterval(checkLoginStatus, 2000); // Check every 2 seconds

    return () => {
      window.removeEventListener('userLogout', handleLogout);
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(intervalId);
  };
  }, []);

  // Set tab title
  useEffect(() => {
    document.title = 'Dev Tools';
  }, []);

  // Redirect if user is not logged in
  if (!isUserLoggedIn) {
    // Clear any remaining data and redirect
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userIsAdmin');
    localStorage.removeItem('userIsFeedbackManager');
    localStorage.removeItem('githubId');
    localStorage.removeItem('githubUsername');
    window.location.href = '/';
    return null;
  }

  return (
    <>
      <div 
        className={isDarkMode ? 'dark-mode' : ''}
        style={{
        display: 'flex',
        height: '100vh',
        background: 'var(--bg-primary)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}
      >
      {/* Left Sidebar */}
      <aside className="left-sidebar" style={{ width: '280px' }}>
          {/* Unified® Header - Matching main sidebar */}
        <div className="left-sidebar-header" style={{
            marginBottom: '1rem',
            cursor: 'pointer'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '0 1rem',
              marginBottom: '1rem'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <img 
                  src="/unified-knowledge-platform.png" 
                  alt="Logo" 
                  style={{
                    width: '50px',
                    height: '50px',
                    marginRight: '10px',
                    marginBottom: 0,
                    borderRadius: 0,
                    boxShadow: 'none'
                  }}
                />
                <div style={{
                  flexGrow: 1,
                  fontSize: '1.2rem',
            fontWeight: 700,
                  color: 'var(--accent-color)',
                  marginRight: '10px'
                }}>
                  Unified®
                </div>
              </div>
              
              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                  minWidth: '40px',
                  minHeight: '40px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '50%',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  padding: '0',
                  margin: '0',
                  boxSizing: 'border-box',
                  flexShrink: 0
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'var(--bg-tertiary)';
                  e.target.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'var(--bg-secondary)';
                  e.target.style.transform = 'scale(1)';
                }}
                title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDarkMode ? <FaSun size={18} /> : <FaMoon size={18} />}
              </button>
            </div>
        </div>

        {/* Current User Role Display */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '1.5rem',
          padding: '0.5rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.4rem 0.8rem',
            background: currentUserRoleInfo.color ? `${currentUserRoleInfo.color}20` : 'rgba(156, 163, 175, 0.1)',
            border: `1px solid ${currentUserRoleInfo.color || 'var(--border-color)'}`,
            borderRadius: '0.5rem',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: currentUserRoleInfo.color || 'var(--text-secondary)'
          }}>
            {currentUserRoleInfo.icon && React.createElement(currentUserRoleInfo.icon, {
              style: { fontSize: '0.85rem' }
            })}
            {currentUserRoleInfo.name || 'User'}
          </div>
        </div>



        {/* Navigation Buttons */}
          {/* Feedback Dashboard - Only visible to users with feedback permission */}
          {canAccessFeedbackDashboard(currentUserEmail) && (
        <button
          onClick={() => setDeveloperActiveView('feedback')}
          className="sidebar-nav-item"
          style={{
            display: 'flex',
            alignItems: 'center',
                width: '110%',
            padding: '0.8rem 1rem',
            marginBottom: '0.5rem',
                marginLeft: '-5%',
                background: 'none',
            border: 'none',
            borderRadius: '0.5rem',
                color: 'var(--text-primary)',
            fontSize: '1.05rem',
            fontWeight: 600,
            cursor: 'pointer',
                transition: 'all 0.3s ease',
                textAlign: 'left',
                position: 'relative',
                overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
              e.target.style.background = 'var(--bg-secondary)';
              e.target.style.color = 'var(--text-tertiary)';
                e.target.style.transform = 'translateX(4px)';
          }}
          onMouseLeave={(e) => {
              e.target.style.background = 'none';
              e.target.style.color = 'var(--text-primary)';
                e.target.style.transform = 'translateX(0)';
          }}
        >
          <FaThumbsUp style={{ 
            marginRight: '10px',
                color: 'var(--text-secondary)',
            fontSize: '1.2rem',
            background: 'none',
            border: 'none',
            boxShadow: 'none',
            padding: 0,
            display: 'block',
                overflow: 'visible',
                transition: 'all 0.3s ease'
          }} />
          Feedback Dashboard
        </button>
          )}

          {/* Monitoring Dashboard - Only visible to users with monitoring permission */}
          {canAccessMonitoringDashboard(currentUserEmail) && (
        <button
          onClick={() => setDeveloperActiveView('monitoring')}
          className="sidebar-nav-item"
          style={{
            display: 'flex',
            alignItems: 'center',
                width: '110%',
            padding: '0.8rem 1rem',
            marginBottom: '0.5rem',
                marginLeft: '-5%',
                background: 'none',
            border: 'none',
            borderRadius: '0.5rem',
                color: 'var(--text-primary)',
            fontSize: '1.05rem',
            fontWeight: 600,
            cursor: 'pointer',
                transition: 'all 0.3s ease',
                textAlign: 'left',
                position: 'relative',
                overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
              e.target.style.background = 'var(--bg-secondary)';
              e.target.style.color = 'var(--text-tertiary)';
                e.target.style.transform = 'translateX(4px)';
          }}
          onMouseLeave={(e) => {
              e.target.style.background = 'none';
              e.target.style.color = 'var(--text-primary)';
                e.target.style.transform = 'translateX(0)';
          }}
        >
          <FaChartLine style={{ 
            marginRight: '10px',
                color: 'var(--text-secondary)',
            fontSize: '1.2rem',
            background: 'none',
            border: 'none',
            boxShadow: 'none',
            padding: 0,
            display: 'block',
                overflow: 'visible',
                transition: 'all 0.3s ease'
          }} />
          Monitoring Dashboard
        </button>
          )}

          {/* IAM System - Only visible to users with role management permission */}
          {canAccessRoleManagement(currentUserEmail) && (
        <button
              onClick={() => setDeveloperActiveView('iam')}
          className="sidebar-nav-item"
          style={{
            display: 'flex',
            alignItems: 'center',
                width: '110%',
            padding: '0.8rem 1rem',
            marginBottom: '0.5rem',
                marginLeft: '-5%',
              background: 'none',
              border: 'none',
              borderRadius: '0.5rem',
              color: 'var(--text-primary)',
              fontSize: '1.05rem',
              fontWeight: 600,
              cursor: 'pointer',
                transition: 'all 0.3s ease',
                textAlign: 'left',
                position: 'relative',
                overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'var(--bg-secondary)';
              e.target.style.color = 'var(--text-tertiary)';
                e.target.style.transform = 'translateX(4px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'none';
              e.target.style.color = 'var(--text-primary)';
                e.target.style.transform = 'translateX(0)';
            }}
          >
              <FaShieldAlt style={{ 
                marginRight: '10px',
                color: 'var(--text-secondary)',
                fontSize: '1.2rem',
                background: 'none',
                border: 'none',
                boxShadow: 'none',
                padding: 0,
                display: 'block',
                overflow: 'visible',
                transition: 'all 0.3s ease'
              }} />
              IAM System
          </button>
          )}

          {/* Developer Options Section - Positioned at bottom */}
          <div style={{
            marginTop: 'auto',
            padding: '1rem',
            background: 'linear-gradient(135deg, rgba(108, 46, 183, 0.08) 0%, rgba(108, 46, 183, 0.03) 100%)',
            borderRadius: '12px',
            border: '1px solid rgba(108, 46, 183, 0.15)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '8px'
            }}>
              <div style={{
                width: '28px',
                height: '28px',
                background: 'var(--accent-color)',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <FaCrown style={{ 
                  color: 'white', 
                  fontSize: '14px'
                }} />
              </div>
              <h3 style={{
                fontSize: '1.1rem',
                fontWeight: 700,
                color: 'var(--accent-color)',
                margin: 0
              }}>
                Developer Options
              </h3>
            </div>
            <p style={{
              color: 'var(--text-secondary)',
              fontSize: '0.8rem',
                margin: 0,
              fontWeight: 500,
              lineHeight: '1.4'
              }}>
              Access advanced dashboard features
            </p>
          </div>


      </aside>

        {/* Main Content Area */}
        <main style={{
        flex: 1,
          overflow: 'auto'
        }}>


          {/* Content Sections */}
          {developerActiveView === 'feedback' && canAccessFeedbackDashboard(currentUserEmail) && (
            <div style={{ width: '100%', height: '100%' }}>
              <FeedbackDashboard />
            </div>
          )}

          {developerActiveView === 'feedback' && !canAccessFeedbackDashboard(currentUserEmail) && (
            <div style={{
              padding: '2rem',
              color: 'var(--text-primary)',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '2rem',
                fontWeight: 700,
                marginBottom: '1rem',
                color: 'var(--text-secondary)'
              }}>
                Access Denied
              </div>
              <p style={{
                  color: 'var(--text-secondary)',
                fontSize: '1.1rem'
                }}>
                You don't have permission to access Feedback Dashboard. This area requires the "Feedback Dashboard" permission.
              </p>
              </div>
          )}

          {developerActiveView === 'iam' && canAccessRoleManagement(currentUserEmail) && (
            <div style={{ width: '100%', height: '100%' }}>
              <IAMSystem 
                onClose={() => setDeveloperActiveView('feedback')}
                currentUser={{
                  email: currentUserEmail,
                  role: currentUserRoleInfo.role
                }}
              />
            </div>
          )}

          {developerActiveView === 'iam' && !canAccessRoleManagement(currentUserEmail) && (
            <div style={{
              padding: '2rem',
              color: 'var(--text-primary)',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '2rem',
                fontWeight: 700,
                marginBottom: '1rem',
                color: 'var(--text-secondary)'
              }}>
                Access Denied
              </div>
              <p style={{
                color: 'var(--text-secondary)',
                fontSize: '1.1rem'
              }}>
                You don't have permission to access IAM System. This area requires the "Role Management" permission.
              </p>
                </div>
          )}

          {developerActiveView === 'monitoring' && canAccessMonitoringDashboard(currentUserEmail) && (
            <div style={{ width: '100%', height: '100%' }}>
              <MonitoringDashboard />
                        </div>
                      )}

          {developerActiveView === 'monitoring' && !canAccessMonitoringDashboard(currentUserEmail) && (
                    <div style={{
              padding: '2rem',
                      color: 'var(--text-primary)',
              textAlign: 'center'
                    }}>
                    <div style={{
                fontSize: '2rem',
                fontWeight: 700,
                marginBottom: '1rem',
                      color: 'var(--text-secondary)'
                    }}>
                Access Denied
                    </div>
            <p style={{
              color: 'var(--text-secondary)',
              fontSize: '1.1rem'
            }}>
              You don't have permission to access Monitoring Dashboard. This area requires the "Monitoring Dashboard" permission.
            </p>
          </div>
        )}
      </main>
    </div>

    {/* CSS Animations */}
    <style>{`
      @keyframes titleFadeIn {
        from { 
          opacity: 0; 
          transform: translateY(-10px); 
        }
        to { 
          opacity: 1; 
          transform: translateY(0); 
        }
      }
      
      @keyframes subtitleFadeIn {
        from { 
          opacity: 0; 
          transform: translateY(-5px); 
        }
        to { 
          opacity: 1; 
          transform: translateY(0); 
        }
      }
      
      @keyframes statusPulse {
        0%, 100% { 
          opacity: 1; 
          transform: scale(1); 
        }
        50% { 
          opacity: 0.7; 
          transform: scale(1.2); 
        }
      }
      
      .sidebar-nav-item:hover svg {
        color: var(--text-tertiary) !important;
        transform: scale(1.1);
      }
      
      .sidebar-nav-item {
        position: relative;
        overflow: hidden;
      }
      
      .sidebar-nav-item::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(108, 46, 183, 0.1), transparent);
        transition: left 0.5s ease;
      }
      
      .sidebar-nav-item:hover::before {
        left: 100%;
      }
    `}</style>
    </>
  );
};

export default DeveloperDashboard; 