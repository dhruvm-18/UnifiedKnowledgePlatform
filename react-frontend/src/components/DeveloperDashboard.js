import React, { useState, useEffect } from 'react';
import FeedbackDashboard from './FeedbackDashboard';
import MonitoringDashboard from './MonitoringDashboard';
import { FaThumbsUp, FaChartLine, FaSun, FaMoon, FaUsers, FaUserCog, FaTrash, FaCrown, FaUser, FaEdit, FaCheck, FaTimes } from 'react-icons/fa';
import '../styles/MonitoringDashboard.css';
import '../styles/FeedbackDashboard.css';
import '../styles/modal.css';
import '../App.css';
import '../styles/backgrounds.css';

const DeveloperDashboard = () => {
  const [developerActiveView, setDeveloperActiveView] = useState('feedback');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Load theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
  }, []);

  // Load users from localStorage
  useEffect(() => {
    const loadUsers = () => {
      try {
        const ukpUsers = JSON.parse(localStorage.getItem('ukpUsers') || '[]');
        const usersWithDetails = ukpUsers.map(user => {
          // Check for user-specific admin status
          const userSpecificAdmin = localStorage.getItem(`userIsAdmin_${user.email}`);
          const isAdmin = user.isAdmin || userSpecificAdmin === 'true';
          
          return {
            ...user,
            isAdmin: isAdmin,
            createdAt: user.createdAt || new Date().toISOString(),
            lastLogin: user.lastLogin || new Date().toISOString(),
            profilePhoto: localStorage.getItem(`profilePhoto_${user.email}`) || null
          };
        });
        setUsers(usersWithDetails);
      } catch (error) {
        console.error('Error loading users:', error);
        setUsers([]);
      }
    };

    loadUsers();
  }, []);

  // Load messages from localStorage or fetch from backend
  useEffect(() => {
    const loadMessages = async () => {
      try {
        // Try to get messages from localStorage first
        const savedMessages = localStorage.getItem('chatMessages');
        if (savedMessages) {
          setMessages(JSON.parse(savedMessages));
        } else {
          // If no saved messages, fetch from backend
          const response = await fetch('http://localhost:5000/api/messages');
          if (response.ok) {
            const data = await response.json();
            setMessages(data);
          }
        }
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    };

    loadMessages();
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.body.className = newTheme === 'dark' ? 'dark-mode' : '';
  };

  // User management functions
  const toggleUserRole = (userEmail) => {
    // Prevent removing admin status from the main admin account
    if (userEmail === 'dhruv.mendiratta4@gmail.com') {
      alert('Cannot remove admin status from the main administrator account.');
      return;
    }

    const updatedUsers = users.map(user => {
      if (user.email === userEmail) {
        return { ...user, isAdmin: !user.isAdmin };
      }
      return user;
    });
    setUsers(updatedUsers);
    
    // Update localStorage
    localStorage.setItem('ukpUsers', JSON.stringify(updatedUsers));
    
    // Update admin status in localStorage for the specific user
    const targetUser = updatedUsers.find(user => user.email === userEmail);
    if (targetUser) {
      if (targetUser.isAdmin) {
        localStorage.setItem(`userIsAdmin_${userEmail}`, 'true');
      } else {
        localStorage.removeItem(`userIsAdmin_${userEmail}`);
      }
    }
  };

  const deleteUser = (userEmail) => {
    if (window.confirm(`Are you sure you want to delete user ${userEmail}? This action cannot be undone.`)) {
      const updatedUsers = users.filter(user => user.email !== userEmail);
      setUsers(updatedUsers);
      
      // Update localStorage
      localStorage.setItem('ukpUsers', JSON.stringify(updatedUsers));
      
      // Remove user-specific data
      localStorage.removeItem(`profilePhoto_${userEmail}`);
      localStorage.removeItem(`userName_${userEmail}`);
      localStorage.removeItem(`preferredModel_${userEmail}`);
    }
  };

  const editUser = (user) => {
    setEditingUser(user);
    setShowUserModal(true);
  };

  const saveUserEdit = (updatedUser) => {
    const updatedUsers = users.map(user => {
      if (user.email === updatedUser.email) {
        return { ...user, ...updatedUser };
      }
      return user;
    });
    setUsers(updatedUsers);
    localStorage.setItem('ukpUsers', JSON.stringify(updatedUsers));
    setEditingUser(null);
    setShowUserModal(false);
  };

  const cancelUserEdit = () => {
    setEditingUser(null);
    setShowUserModal(false);
  };

  return (
    <>

      <div style={{
        display: 'flex',
        height: '100vh',
        background: 'var(--bg-primary)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
      {/* Left Sidebar */}
      <aside className="left-sidebar" style={{ width: '280px' }}>
        {/* Header */}
        <div className="left-sidebar-header" style={{
          marginBottom: '1.5rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid var(--border-color)',
          cursor: 'default'
        }}>
          <h2 style={{
            fontSize: '1.3rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: '0 0 0.5rem 0'
          }}>
            Developer Options
          </h2>
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '0.85rem',
            margin: 0
          }}>
            Access advanced dashboard features
          </p>
        </div>

        {/* Navigation Buttons */}
        <button
          onClick={() => setDeveloperActiveView('feedback')}
          className="sidebar-nav-item"
          style={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            padding: '0.8rem 1rem',
            marginBottom: '0.5rem',
            background: developerActiveView === 'feedback' ? 'var(--bg-secondary)' : 'none',
            border: 'none',
            borderRadius: '0.5rem',
            color: developerActiveView === 'feedback' ? 'var(--text-tertiary)' : 'var(--text-primary)',
            fontSize: '1.05rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s, color 0.2s',
            textAlign: 'left'
          }}
          onMouseEnter={(e) => {
            if (developerActiveView !== 'feedback') {
              e.target.style.background = 'var(--bg-secondary)';
              e.target.style.color = 'var(--text-tertiary)';
            }
          }}
          onMouseLeave={(e) => {
            if (developerActiveView !== 'feedback') {
              e.target.style.background = 'none';
              e.target.style.color = 'var(--text-primary)';
            }
          }}
        >
          <FaThumbsUp style={{ 
            marginRight: '10px',
            color: developerActiveView === 'feedback' ? 'var(--text-tertiary)' : 'var(--text-secondary)',
            fontSize: '1.2rem',
            background: 'none',
            border: 'none',
            boxShadow: 'none',
            padding: 0,
            display: 'block',
            overflow: 'visible'
          }} />
          Feedback Dashboard
        </button>

        <button
          onClick={() => setDeveloperActiveView('monitoring')}
          className="sidebar-nav-item"
          style={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            padding: '0.8rem 1rem',
            marginBottom: '0.5rem',
            background: developerActiveView === 'monitoring' ? 'var(--bg-secondary)' : 'none',
            border: 'none',
            borderRadius: '0.5rem',
            color: developerActiveView === 'monitoring' ? 'var(--text-tertiary)' : 'var(--text-primary)',
            fontSize: '1.05rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s, color 0.2s',
            textAlign: 'left'
          }}
          onMouseEnter={(e) => {
            if (developerActiveView !== 'monitoring') {
              e.target.style.background = 'var(--bg-secondary)';
              e.target.style.color = 'var(--text-tertiary)';
            }
          }}
          onMouseLeave={(e) => {
            if (developerActiveView !== 'monitoring') {
              e.target.style.background = 'none';
              e.target.style.color = 'var(--text-primary)';
            }
          }}
        >
          <FaChartLine style={{ 
            marginRight: '10px',
            color: developerActiveView === 'monitoring' ? 'var(--text-tertiary)' : 'var(--text-secondary)',
            fontSize: '1.2rem',
            background: 'none',
            border: 'none',
            boxShadow: 'none',
            padding: 0,
            display: 'block',
            overflow: 'visible'
          }} />
          Monitoring Dashboard
        </button>

        <button
          onClick={() => setDeveloperActiveView('users')}
          className="sidebar-nav-item"
          style={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            padding: '0.8rem 1rem',
            marginBottom: '0.5rem',
            background: developerActiveView === 'users' ? 'var(--bg-secondary)' : 'none',
            border: 'none',
            borderRadius: '0.5rem',
            color: developerActiveView === 'users' ? 'var(--text-tertiary)' : 'var(--text-primary)',
            fontSize: '1.05rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s, color 0.2s',
            textAlign: 'left'
          }}
          onMouseEnter={(e) => {
            if (developerActiveView !== 'users') {
              e.target.style.background = 'var(--bg-secondary)';
              e.target.style.color = 'var(--text-tertiary)';
            }
          }}
          onMouseLeave={(e) => {
            if (developerActiveView !== 'users') {
              e.target.style.background = 'none';
              e.target.style.color = 'var(--text-primary)';
            }
          }}
        >
          <FaUsers style={{ 
            marginRight: '10px',
            color: developerActiveView === 'users' ? 'var(--text-tertiary)' : 'var(--text-secondary)',
            fontSize: '1.2rem',
            background: 'none',
            border: 'none',
            boxShadow: 'none',
            padding: 0,
            display: 'block',
            overflow: 'visible'
          }} />
          User Management
        </button>

        {/* Theme Toggle */}
        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <button
            onClick={toggleTheme}
            className="sidebar-nav-item"
            style={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              padding: '0.8rem 1rem',
              marginBottom: '0.5rem',
              background: 'none',
              border: 'none',
              borderRadius: '0.5rem',
              color: 'var(--text-primary)',
              fontSize: '1.05rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.2s, color 0.2s',
              textAlign: 'left'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'var(--bg-secondary)';
              e.target.style.color = 'var(--text-tertiary)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'none';
              e.target.style.color = 'var(--text-primary)';
            }}
          >
            {theme === 'dark' ? (
              <FaSun style={{ 
                marginRight: '10px',
                color: 'var(--text-secondary)',
                fontSize: '1.2rem',
                background: 'none',
                border: 'none',
                boxShadow: 'none',
                padding: 0,
                display: 'block',
                overflow: 'visible'
              }} />
            ) : (
              <FaMoon style={{ 
                marginRight: '10px',
                color: 'var(--text-secondary)',
                fontSize: '1.2rem',
                background: 'none',
                border: 'none',
                boxShadow: 'none',
                padding: 0,
                display: 'block',
                overflow: 'visible'
              }} />
            )}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
      </aside>

      {/* Right Content Area */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        background: 'var(--bg-primary)'
      }}>
        {developerActiveView === 'feedback' && (
          <FeedbackDashboard messages={messages} />
        )}
        {developerActiveView === 'monitoring' && (
          <MonitoringDashboard />
        )}
        {developerActiveView === 'users' && (
          <div style={{
            padding: '2rem',
            color: 'var(--text-primary)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '2rem'
            }}>
              <h1 style={{
                fontSize: '2rem',
                fontWeight: 700,
                margin: 0,
                color: 'var(--text-primary)'
              }}>
                User Management
              </h1>
              <div style={{
                display: 'flex',
                gap: '1rem',
                alignItems: 'center'
              }}>
                <span style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.9rem'
                }}>
                  Total Users: {users.length}
                </span>
                <span style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.9rem'
                }}>
                  Admins: {users.filter(u => u.isAdmin).length}
                </span>
              </div>
            </div>

            {users.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '3rem',
                color: 'var(--text-secondary)'
              }}>
                <FaUsers style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }} />
                <h3>No Users Found</h3>
                <p>No users have been registered yet.</p>
              </div>
            ) : (
              <div style={{
                background: 'var(--bg-secondary)',
                borderRadius: '0.75rem',
                overflow: 'hidden',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr 1fr auto',
                  gap: '1rem',
                  padding: '1rem 1.5rem',
                  background: 'var(--bg-tertiary)',
                  borderBottom: '1px solid var(--border-color)',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  color: 'var(--text-secondary)'
                }}>
                  <div>User</div>
                  <div>Email</div>
                  <div>Role</div>
                  <div>Created</div>
                  <div>Actions</div>
                </div>

                {users.map((user, index) => (
                  <div key={user.email} style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr 1fr auto',
                    gap: '1rem',
                    padding: '1rem 1.5rem',
                    borderBottom: index < users.length - 1 ? '1px solid var(--border-color)' : 'none',
                    alignItems: 'center',
                    transition: 'background 0.2s'
                  }} onMouseEnter={(e) => {
                    e.target.style.background = 'var(--bg-tertiary)';
                  }} onMouseLeave={(e) => {
                    e.target.style.background = 'var(--bg-secondary)';
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}>
                      {user.profilePhoto ? (
                        <img 
                          src={user.profilePhoto} 
                          alt={user.name || user.email}
                          style={{
                            width: '2.5rem',
                            height: '2.5rem',
                            borderRadius: '50%',
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '2.5rem',
                          height: '2.5rem',
                          borderRadius: '50%',
                          background: 'var(--accent-color)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 600,
                          fontSize: '1rem'
                        }}>
                          {(user.name || user.email).charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div style={{
                          fontWeight: 600,
                          color: 'var(--text-primary)'
                        }}>
                          {user.name || 'Unnamed User'}
                        </div>
                        <div style={{
                          fontSize: '0.8rem',
                          color: 'var(--text-secondary)'
                        }}>
                          {user.preferredModel || 'No model set'}
                        </div>
                      </div>
                    </div>

                    <div style={{
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem'
                    }}>
                      {user.email}
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      {user.isAdmin ? (
                        <>
                          <FaCrown style={{ 
                            color: user.email === 'dhruv.mendiratta4@gmail.com' ? '#dc2626' : '#f59e0b', 
                            fontSize: '1rem' 
                          }} />
                          <span style={{ 
                            color: user.email === 'dhruv.mendiratta4@gmail.com' ? '#dc2626' : '#f59e0b', 
                            fontWeight: 600 
                          }}>
                            {user.email === 'dhruv.mendiratta4@gmail.com' ? 'Protected Admin' : 'Admin'}
                          </span>
                        </>
                      ) : (
                        <>
                          <FaUser style={{ color: 'var(--text-secondary)', fontSize: '1rem' }} />
                          <span style={{ color: 'var(--text-secondary)' }}>User</span>
                        </>
                      )}
                    </div>

                    <div style={{
                      fontSize: '0.8rem',
                      color: 'var(--text-secondary)'
                    }}>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </div>

                    <div style={{
                      display: 'flex',
                      gap: '0.5rem'
                    }}>
                      <button
                        onClick={() => toggleUserRole(user.email)}
                        style={{
                          padding: '0.5rem',
                          background: user.email === 'dhruv.mendiratta4@gmail.com' 
                            ? 'var(--bg-tertiary)' 
                            : user.isAdmin 
                              ? 'var(--bg-tertiary)' 
                              : 'var(--accent-color)',
                          border: 'none',
                          borderRadius: '0.375rem',
                          color: user.email === 'dhruv.mendiratta4@gmail.com' 
                            ? 'var(--text-secondary)' 
                            : user.isAdmin 
                              ? 'var(--text-primary)' 
                              : 'white',
                          cursor: user.email === 'dhruv.mendiratta4@gmail.com' ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          opacity: user.email === 'dhruv.mendiratta4@gmail.com' ? 0.6 : 1
                        }}
                        onMouseEnter={(e) => {
                          if (user.email === 'dhruv.mendiratta4@gmail.com') return;
                          e.target.style.transform = 'scale(1.05)';
                          if (user.isAdmin) {
                            e.target.style.background = 'var(--bg-primary)';
                            e.target.style.color = 'var(--text-primary)';
                          } else {
                            e.target.style.background = 'var(--accent-color-hover, #7c3aed)';
                            e.target.style.color = 'white';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (user.email === 'dhruv.mendiratta4@gmail.com') return;
                          e.target.style.transform = 'scale(1)';
                          if (user.isAdmin) {
                            e.target.style.background = 'var(--bg-tertiary)';
                            e.target.style.color = 'var(--text-primary)';
                          } else {
                            e.target.style.background = 'var(--accent-color)';
                            e.target.style.color = 'white';
                          }
                        }}
                        title={user.email === 'dhruv.mendiratta4@gmail.com' 
                          ? 'Protected Admin Account - Cannot Remove' 
                          : user.isAdmin 
                            ? 'Remove Admin Role' 
                            : 'Make Admin'}
                        disabled={user.email === 'dhruv.mendiratta4@gmail.com'}
                      >
                        <FaCrown style={{ fontSize: '0.8rem' }} />
                        {user.email === 'dhruv.mendiratta4@gmail.com' 
                          ? 'Protected Admin' 
                          : user.isAdmin 
                            ? 'Remove Admin' 
                            : 'Make Admin'}
                      </button>

                      <button
                        onClick={() => editUser(user)}
                        style={{
                          padding: '0.5rem',
                          background: 'var(--bg-tertiary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '0.375rem',
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.transform = 'scale(1.05)';
                          e.target.style.background = 'var(--bg-primary)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = 'scale(1)';
                          e.target.style.background = 'var(--bg-tertiary)';
                        }}
                        title="Edit User"
                      >
                        <FaEdit style={{ fontSize: '0.8rem' }} />
                      </button>

                      <button
                        onClick={() => deleteUser(user.email)}
                        style={{
                          padding: '0.5rem',
                          background: '#ef4444',
                          border: 'none',
                          borderRadius: '0.375rem',
                          color: 'white',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.transform = 'scale(1.05)';
                          e.target.style.background = '#dc2626';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = 'scale(1)';
                          e.target.style.background = '#ef4444';
                        }}
                        title="Delete User"
                      >
                        <FaTrash style={{ fontSize: '0.8rem' }} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>

    {/* User Edit Modal */}
    {showUserModal && editingUser && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          background: 'var(--bg-secondary)',
          borderRadius: '0.75rem',
          padding: '2rem',
          width: '90%',
          maxWidth: '500px',
          border: '1px solid var(--border-color)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem'
          }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              margin: 0,
              color: 'var(--text-primary)'
            }}>
              Edit User
            </h2>
            <button
              onClick={cancelUserEdit}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '1.5rem',
                padding: '0.25rem'
              }}
            >
              <FaTimes />
            </button>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: 'var(--text-primary)',
              fontWeight: 600
            }}>
              Name
            </label>
            <input
              type="text"
              defaultValue={editingUser.name || ''}
              onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--border-color)',
                borderRadius: '0.5rem',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '1rem'
              }}
              placeholder="Enter user name"
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: 'var(--text-primary)',
              fontWeight: 600
            }}>
              Email
            </label>
            <input
              type="email"
              value={editingUser.email}
              disabled
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--border-color)',
                borderRadius: '0.5rem',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                fontSize: '1rem',
                cursor: 'not-allowed'
              }}
            />
            <small style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
              Email cannot be changed
            </small>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: 'var(--text-primary)',
              fontWeight: 600
            }}>
              Preferred Model
            </label>
            <select
              value={editingUser.preferredModel || ''}
              onChange={(e) => setEditingUser({...editingUser, preferredModel: e.target.value})}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--border-color)',
                borderRadius: '0.5rem',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '1rem'
              }}
            >
              <option value="">Select a model</option>
              <option value="gemini">Gemini</option>
              <option value="mistral">Mistral</option>
              <option value="qwen">Qwen</option>
            </select>
          </div>

          <div style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'flex-end',
            marginTop: '2rem'
          }}>
            <button
              onClick={cancelUserEdit}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                borderRadius: '0.5rem',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 600,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'var(--bg-primary)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'var(--bg-tertiary)';
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => saveUserEdit(editingUser)}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'var(--accent-color)',
                border: 'none',
                borderRadius: '0.5rem',
                color: 'white',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 600,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1)';
              }}
            >
              <FaCheck style={{ marginRight: '0.5rem' }} />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default DeveloperDashboard; 