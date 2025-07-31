import React, { useState, useEffect } from 'react';
import { FaCrown, FaUser, FaThumbsUp, FaPlus, FaEdit, FaTrash, FaSave, FaTimes, FaShieldAlt, FaUsers, FaChartLine, FaCog, FaEye, FaEyeSlash, FaGithub, FaChevronDown, FaCheck } from 'react-icons/fa';
import { assignRoleToUser, getAllRoles, getRoleData, getUserRole, DEFAULT_ROLES } from '../utils/permissions';



// Available permissions for role creation
const AVAILABLE_PERMISSIONS = {
  developerOptions: {
    name: 'Developer Options',
    description: 'Access to developer options menu',
    icon: FaCog
  },
  feedbackDashboard: {
    name: 'Feedback Dashboard',
    description: 'Access to feedback management',
    icon: FaThumbsUp
  },
  monitoringDashboard: {
    name: 'Monitoring Dashboard',
    description: 'Access to system monitoring',
    icon: FaChartLine
  },
  userManagement: {
    name: 'User Management',
    description: 'Manage users and their roles',
    icon: FaUsers
  },
  roleManagement: {
    name: 'Role Management',
    description: 'View and manage roles',
    icon: FaShieldAlt
  },
  createRoles: {
    name: 'Create Roles',
    description: 'Create new custom roles',
    icon: FaPlus
  },
  editRoles: {
    name: 'Edit Roles',
    description: 'Modify existing roles',
    icon: FaEdit
  },
  deleteRoles: {
    name: 'Delete Roles',
    description: 'Remove custom roles',
    icon: FaTrash
  },
  assignRoles: {
    name: 'Assign Roles',
    description: 'Assign roles to users',
    icon: FaUsers
  }
};

const IAMSystem = ({ onClose, currentUser }) => {
  const [activeTab, setActiveTab] = useState('roles'); // 'roles' or 'users'
  const [roles, setRoles] = useState({});
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [newRole, setNewRole] = useState({
    name: '',
    description: '',
    color: '#6b7280',
    icon: FaUser,
    permissions: {}
  });
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Load roles from localStorage
  useEffect(() => {
    const savedRoles = JSON.parse(localStorage.getItem('ukpRoles') || '{}');
    setRoles({ ...DEFAULT_ROLES, ...savedRoles });
  }, []);

  // Close dropdown when clicking outside
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

  // Refresh users when refreshTrigger changes
  useEffect(() => {
    // This will trigger a re-render when refreshTrigger changes
  }, [refreshTrigger]);

  // Save roles to localStorage
  const saveRoles = (updatedRoles) => {
    const customRoles = Object.keys(updatedRoles).reduce((acc, key) => {
      if (!DEFAULT_ROLES[key]) {
        acc[key] = updatedRoles[key];
      }
      return acc;
    }, {});
    localStorage.setItem('ukpRoles', JSON.stringify(customRoles));
    setRoles(updatedRoles);
  };

  // Check if current user has permission
  const hasPermission = (permission) => {
    const userRole = currentUser.role?.toLowerCase() || 'user';
    const roleData = roles[userRole];
    return roleData?.permissions?.[permission] || false;
  };

  // Create new role
  const handleCreateRole = () => {
    if (!newRole.name.trim()) {
      alert('Role name is required');
      return;
    }

    const roleKey = newRole.name.toLowerCase().replace(/\s+/g, '-');
    if (roles[roleKey]) {
      alert('Role with this name already exists');
      return;
    }

    const updatedRoles = {
      ...roles,
      [roleKey]: {
        ...newRole,
        icon: FaUser, // Default icon for custom roles
        permissions: { ...newRole.permissions }
      }
    };

    saveRoles(updatedRoles);
    setNewRole({
      name: '',
      description: '',
      color: '#6b7280',
      icon: FaUser,
      permissions: {}
    });
    setShowCreateRole(false);
  };

  // Edit role
  const handleEditRole = (roleKey) => {
    const role = roles[roleKey];
    setEditingRole(roleKey);
    setNewRole({
      name: role.name,
      description: role.description,
      color: role.color,
      icon: role.icon || FaUser,
      permissions: { ...role.permissions }
    });
    setShowCreateRole(true);
  };

  // Save edited role
  const handleSaveEdit = () => {
    if (!newRole.name.trim()) {
      alert('Role name is required');
      return;
    }

    const updatedRoles = { ...roles };
    const isDefaultRole = DEFAULT_ROLES[editingRole];
    
    if (isDefaultRole) {
      // For default roles, preserve the original key and only update permissions
      updatedRoles[editingRole] = {
        ...updatedRoles[editingRole],
        permissions: { ...newRole.permissions }
      };
    } else {
      // For custom roles, allow full editing
      delete updatedRoles[editingRole];
      const roleKey = newRole.name.toLowerCase().replace(/\s+/g, '-');
      updatedRoles[roleKey] = {
        ...newRole,
        icon: newRole.icon || FaUser, // Preserve existing icon or use default
        permissions: { ...newRole.permissions }
      };
    }

    saveRoles(updatedRoles);
    setNewRole({
      name: '',
      description: '',
      color: '#6b7280',
      icon: FaUser,
      permissions: {}
    });
    setEditingRole(null);
    setShowCreateRole(false);
  };

  // Delete role
  const handleDeleteRole = (roleKey) => {
    if (DEFAULT_ROLES[roleKey]) {
      alert('Cannot delete default roles');
      return;
    }

    if (window.confirm(`Are you sure you want to delete the role "${roles[roleKey].name}"?`)) {
      const updatedRoles = { ...roles };
      delete updatedRoles[roleKey];
      saveRoles(updatedRoles);
    }
  };

  // Toggle permission
  const togglePermission = (permission) => {
    setNewRole(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permission]: !prev.permissions[permission]
      }
    }));
  };

  // Get users with their roles
  const getUsersWithRoles = () => {
    const users = JSON.parse(localStorage.getItem('ukpUsers') || '[]');
    const currentUser = JSON.parse(localStorage.getItem('ukpUser') || '{}');
    
    // Add current user if not in the list
    const allUsers = [...users];
    if (currentUser.email && !users.find(u => u.email === currentUser.email)) {
      allUsers.push(currentUser);
    }
    
    return allUsers.map(user => {
      // Try to get role from user object first, then fall back to getUserRole
      let userRole = user.roleKey || getUserRole(user.email);
      const roleData = getRoleData(userRole);
      
      // Debug logging
      console.log(`User: ${user.email}, Role: ${userRole}, RoleData:`, roleData);
      
      return {
        ...user,
        roleData,
        roleKey: userRole
      };
    });
  };

  // Helper function to get icon component from string
  const getIconComponent = (iconString) => {
    switch (iconString) {
      case 'FaCrown': return FaCrown;
      case 'FaUser': return FaUser;
      case 'FaThumbsUp': return FaThumbsUp;
      default: return FaUser;
    }
  };

  // Force refresh of users when refreshTrigger changes
  const users = getUsersWithRoles();
  const allRoles = getAllRoles();
  
  // Debug logging for roles
  console.log('All available roles:', allRoles);
  console.log('Users with roles:', users);

  // Special override for owner
  const isOwner = currentUser.email === 'dhruv.mendiratta4@gmail.com';
  const hasRoleManagementPermission = hasPermission(currentUser.email, 'roleManagement') || isOwner;

  if (!hasRoleManagementPermission) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: 'var(--text-primary)'
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
          You don't have permission to access Role Management.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      padding: 0,
      color: 'var(--text-primary)',
      maxHeight: '100vh',
      overflow: 'auto',
      background: 'var(--bg-primary)',
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        margin: 0,
        padding: '1.5rem 2rem',
        borderBottom: '2px solid var(--border-color)',
        background: 'var(--bg-secondary)',
        flexShrink: 0
      }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 700,
          margin: 0,
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <FaShieldAlt />
          IAM Management
        </h1>
        {(hasPermission(currentUser.email, 'createRoles') || isOwner) && activeTab === 'roles' && (
          <button
            onClick={() => setShowCreateRole(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'var(--accent-color)',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              padding: '0.75rem 1rem',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.background = 'var(--accent-color-dark)'}
            onMouseLeave={(e) => e.target.style.background = 'var(--accent-color)'}
          >
            <FaPlus />
            Create Role
          </button>
        )}
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '1.5rem',
        margin: '1.5rem 2rem',
        padding: '1.5rem',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setActiveTab('roles')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: activeTab === 'roles' ? 'var(--accent-color)' : 'transparent',
            color: activeTab === 'roles' ? 'white' : 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '0.5rem',
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <FaShieldAlt />
          Roles & Permissions
        </button>
        <button
          onClick={() => setActiveTab('users')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: activeTab === 'users' ? 'var(--accent-color)' : 'transparent',
            color: activeTab === 'users' ? 'white' : 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '0.5rem',
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <FaUsers />
          User Management
        </button>
      </div>

      {/* Roles Section */}
      {activeTab === 'roles' && (
        <div style={{
          background: 'var(--bg-secondary)',
          borderRadius: '0.75rem',
          padding: '1.5rem',
          marginBottom: '2rem',
          border: '1px solid var(--border-color)'
        }}>
        <h2 style={{
          margin: '0 0 1rem 0',
          color: 'var(--text-primary)',
          fontSize: '1.3rem',
          fontWeight: 600
        }}>
          Roles & Permissions
        </h2>
        
        <div style={{
          display: 'grid',
          gap: '1rem'
        }}>
          {Object.entries(roles).map(([roleKey, role]) => {
                            const IconComponent = typeof role.icon === 'string' ? getIconComponent(role.icon) : (role.icon || FaUser);
            const isDefault = DEFAULT_ROLES[roleKey];
            
            return (
              <div key={roleKey} style={{
                background: 'var(--bg-primary)',
                borderRadius: '0.5rem',
                padding: '1rem',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '0.5rem'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '2rem',
                      height: '2rem',
                      borderRadius: '50%',
                      background: role.color,
                      color: 'white',
                      border: isDefault ? '2px solid #3b82f6' : 'none'
                    }}>
                      <IconComponent />
                    </div>
                    <div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <span style={{
                          fontWeight: 600,
                          color: 'var(--text-primary)'
                        }}>
                          {role.name}
                        </span>
                        {isDefault && (
                          <span style={{
                            background: 'var(--accent-color)',
                            color: 'white',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '0.25rem',
                            fontSize: '0.7rem',
                            fontWeight: 600
                          }}>
                            DEFAULT
                          </span>
                        )}
                      </div>
                      <p style={{
                        margin: '0.25rem 0 0 0',
                        color: 'var(--text-secondary)',
                        fontSize: '0.9rem'
                      }}>
                        {role.description}
                      </p>
                    </div>
                  </div>
                  
                  {(hasPermission(currentUser.email, 'editRoles') || isOwner) && (
                    <div style={{
                      display: 'flex',
                      gap: '0.5rem'
                    }}>
                      <button
                        onClick={() => handleEditRole(roleKey)}
                        style={{
                          background: 'var(--accent-color)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.25rem',
                          padding: '0.5rem',
                          cursor: 'pointer',
                          fontSize: '0.8rem'
                        }}
                        title={isDefault ? "Edit Default Role Permissions" : "Edit Role"}
                      >
                        <FaEdit />
                      </button>
                      {(hasPermission(currentUser.email, 'deleteRoles') || isOwner) && !isDefault && (
                        <button
                          onClick={() => handleDeleteRole(roleKey)}
                          style={{
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.25rem',
                            padding: '0.5rem',
                            cursor: 'pointer',
                            fontSize: '0.8rem'
                          }}
                          title="Delete Role"
                        >
                          <FaTrash />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Permissions */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '0.5rem',
                  marginTop: '1rem'
                }}>
                  {Object.entries(AVAILABLE_PERMISSIONS).map(([permKey, perm]) => {
                    const hasPerm = role.permissions[permKey];
                    const PermIcon = perm.icon;
                    
                    return (
                      <div key={permKey} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem',
                        background: hasPerm ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        borderRadius: '0.25rem',
                        border: `1px solid ${hasPerm ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                      }}>
                        <PermIcon style={{
                          color: hasPerm ? '#10b981' : '#ef4444',
                          fontSize: '0.9rem'
                        }} />
                        <span style={{
                          fontSize: '0.8rem',
                          color: hasPerm ? '#10b981' : '#ef4444',
                          fontWeight: 500
                        }}>
                          {perm.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* Users Management Section */}
      {activeTab === 'users' && (
        <div style={{
          background: 'var(--bg-secondary)',
          borderRadius: '0.75rem',
          padding: '1.5rem',
          border: '1px solid var(--border-color)'
        }}>
          <h2 style={{
            margin: '0 0 1rem 0',
            color: 'var(--text-primary)',
            fontSize: '1.3rem',
            fontWeight: 600
          }}>
            User Management
          </h2>
          
          <div style={{
            display: 'grid',
            gap: '1rem'
          }}>
            {users.map((user) => {
              const roleData = user.roleData;
              const IconComponent = typeof roleData?.icon === 'string' ? getIconComponent(roleData.icon) : (roleData?.icon || FaUser);
              
              return (
                <div key={user.email} style={{
                  background: 'var(--bg-primary)',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.75rem'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem'
                    }}>
                      <div style={{
                        width: '2.5rem',
                        height: '2.5rem',
                        borderRadius: '50%',
                        background: user.avatar ? 'none' : roleData?.color || '#6b7280',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '1.2rem',
                        fontWeight: 600
                      }}>
                        {user.avatar ? (
                          <img 
                            src={user.avatar} 
                            alt="Avatar" 
                            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                          />
                        ) : (
                          user.name?.charAt(0) || user.email?.charAt(0) || 'U'
                        )}
                      </div>
                      
                      <div>
                        <div style={{
                          fontWeight: 600,
                          color: 'var(--text-primary)'
                        }}>
                          {user.name || user.email}
                        </div>
                        <div style={{
                          color: 'var(--text-secondary)',
                          fontSize: '0.9rem'
                        }}>
                          {user.email}
                        </div>
                      </div>
                    </div>
                    
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}>
                      {/* GitHub Connection Status */}
                      {user.githubId && user.githubUsername ? (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.25rem 0.5rem',
                          background: 'rgba(16, 185, 129, 0.1)',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          borderRadius: '0.25rem',
                          fontSize: '0.8rem',
                          color: '#10b981'
                        }}>
                          <FaGithub />
                          Connected
                        </div>
                      ) : (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.25rem 0.5rem',
                          background: 'rgba(156, 163, 175, 0.1)',
                          border: '1px solid rgba(156, 163, 175, 0.3)',
                          borderRadius: '0.25rem',
                          fontSize: '0.8rem',
                          color: '#6b7280'
                        }}>
                          <FaGithub />
                          Not Connected
                        </div>
                      )}
                      
                      {/* Current Role Badge */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 0.75rem',
                        background: roleData?.color || '#6b7280',
                        color: 'white',
                        borderRadius: '0.5rem',
                        fontSize: '0.9rem',
                        fontWeight: 600
                      }}>
                        <IconComponent style={{ fontSize: '0.8rem' }} />
                        {roleData?.name || 'User'}
                      </div>
                      
                      {/* Role Assignment Dropdown */}
                      {(hasPermission(currentUser.email, 'assignRoles') || isOwner) && (
                        <div style={{ position: 'relative' }} className="role-dropdown">
                          <button
                            onClick={() => setRoleDropdownOpen(roleDropdownOpen === user.email ? null : user.email)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              background: 'var(--accent-color)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.25rem',
                              padding: '0.5rem',
                              cursor: 'pointer',
                              fontSize: '0.8rem'
                            }}
                          >
                            <FaPlus />
                            <FaChevronDown />
                          </button>
                          
                          {roleDropdownOpen === user.email && (
                            <div style={{
                              position: 'absolute',
                              top: '100%',
                              right: 0,
                              background: 'var(--bg-primary)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '0.5rem',
                              padding: '0.5rem',
                              minWidth: '200px',
                              zIndex: 1000,
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                            }}>
                                                            {Object.entries(allRoles).map(([roleKey, role]) => {
                                const RoleIcon = typeof role.icon === 'string' ? getIconComponent(role.icon) : (role.icon || FaUser);
                                return (
                                  <div
                                    key={roleKey}
                                   onClick={() => {
                                     console.log(`Assigning role ${roleKey} to user ${user.email}`);
                                     const success = assignRoleToUser(user.email, roleKey);
                                     console.log(`Role assignment result:`, success);
                                     setRoleDropdownOpen(null);
                                     // Trigger UI refresh
                                     setRefreshTrigger(prev => prev + 1);
                                     
                                     // Show success message
                                     setSuccessMessage(`Role "${role.name}" assigned to ${user.name || user.email}`);
                                     setShowSuccessMessage(true);
                                     setTimeout(() => setShowSuccessMessage(false), 3000);
                                   }}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.5rem',
                                      padding: '0.5rem',
                                      cursor: 'pointer',
                                      borderRadius: '0.25rem',
                                      transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.target.style.background = 'var(--bg-secondary)'}
                                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                  >
                                    <RoleIcon style={{ color: role.color, fontSize: '0.9rem' }} />
                                    <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                                      {role.name}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* GitHub Details */}
                  {user.githubId && user.githubUsername && (
                    <div style={{
                      background: 'var(--bg-secondary)',
                      borderRadius: '0.25rem',
                      padding: '0.5rem',
                      fontSize: '0.8rem',
                      color: 'var(--text-secondary)'
                    }}>
                      <strong>GitHub:</strong> @{user.githubUsername} (ID: {user.githubId})
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Success Message */}
      {showSuccessMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: '#10b981',
          color: 'white',
          padding: '1rem 1.5rem',
          borderRadius: '0.5rem',
          zIndex: 10000,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          animation: 'slideIn 0.3s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FaCheck style={{ fontSize: '1rem' }} />
            {successMessage}
          </div>
        </div>
      )}

      {/* Create/Edit Role Modal */}
      {showCreateRole && (
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
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowCreateRole(false);
            setEditingRole(null);
            setNewRole({
              name: '',
              description: '',
              color: '#6b7280',
              permissions: {}
            });
          }
        }}
        >
          <div style={{
            background: 'var(--bg-primary)',
            borderRadius: '1rem',
            padding: '2rem',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto',
            border: '1px solid var(--border-color)'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{
              margin: '0 0 1.5rem 0',
              color: 'var(--text-primary)',
              fontSize: '1.5rem',
              fontWeight: 600
            }}>
              {editingRole ? (DEFAULT_ROLES[editingRole] ? 'Edit Default Role Permissions' : 'Edit Role') : 'Create New Role'}
            </h2>
            
            {editingRole && DEFAULT_ROLES[editingRole] && (
              <div style={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '0.5rem',
                padding: '1rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.5rem'
                }}>
                  <FaShieldAlt style={{ color: '#3b82f6', fontSize: '1rem' }} />
                  <strong style={{ color: '#3b82f6' }}>Default Role</strong>
                </div>
                <p style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.9rem',
                  margin: 0,
                  lineHeight: '1.4'
                }}>
                  You can modify the permissions for this default role, but the name, description, and color cannot be changed to maintain system consistency.
                </p>
              </div>
            )}
            
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              {/* Role Name */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  color: 'var(--text-primary)',
                  fontWeight: 600
                }}>
                  Role Name
                </label>
                <input
                  type="text"
                  value={newRole.name}
                  onChange={(e) => setNewRole(prev => ({ ...prev, name: e.target.value }))}
                  disabled={editingRole && DEFAULT_ROLES[editingRole]}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '0.5rem',
                    background: editingRole && DEFAULT_ROLES[editingRole] ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                    color: editingRole && DEFAULT_ROLES[editingRole] ? 'var(--text-secondary)' : 'var(--text-primary)',
                    fontSize: '1rem',
                    cursor: editingRole && DEFAULT_ROLES[editingRole] ? 'not-allowed' : 'text'
                  }}
                  placeholder="Enter role name"
                />
                {editingRole && DEFAULT_ROLES[editingRole] && (
                  <div style={{
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                    marginTop: '0.25rem'
                  }}>
                    Default role names cannot be changed
                  </div>
                )}
              </div>
              
              {/* Role Description */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  color: 'var(--text-primary)',
                  fontWeight: 600
                }}>
                  Description
                </label>
                <textarea
                  value={newRole.description}
                  onChange={(e) => setNewRole(prev => ({ ...prev, description: e.target.value }))}
                  disabled={editingRole && DEFAULT_ROLES[editingRole]}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '0.5rem',
                    background: editingRole && DEFAULT_ROLES[editingRole] ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                    color: editingRole && DEFAULT_ROLES[editingRole] ? 'var(--text-secondary)' : 'var(--text-primary)',
                    fontSize: '1rem',
                    minHeight: '80px',
                    resize: 'vertical',
                    cursor: editingRole && DEFAULT_ROLES[editingRole] ? 'not-allowed' : 'text'
                  }}
                  placeholder="Enter role description"
                />
                {editingRole && DEFAULT_ROLES[editingRole] && (
                  <div style={{
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                    marginTop: '0.25rem'
                  }}>
                    Default role descriptions cannot be changed
                  </div>
                )}
              </div>
              
              {/* Role Color */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  color: 'var(--text-primary)',
                  fontWeight: 600
                }}>
                  Role Color
                </label>
                <input
                  type="color"
                  value={newRole.color}
                  onChange={(e) => setNewRole(prev => ({ ...prev, color: e.target.value }))}
                  disabled={editingRole && DEFAULT_ROLES[editingRole]}
                  style={{
                    width: '100%',
                    height: '3rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '0.5rem',
                    cursor: editingRole && DEFAULT_ROLES[editingRole] ? 'not-allowed' : 'pointer',
                    opacity: editingRole && DEFAULT_ROLES[editingRole] ? 0.5 : 1
                  }}
                />
                {editingRole && DEFAULT_ROLES[editingRole] && (
                  <div style={{
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                    marginTop: '0.25rem'
                  }}>
                    Default role colors cannot be changed
                  </div>
                )}
              </div>
              
              {/* Permissions */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  color: 'var(--text-primary)',
                  fontWeight: 600
                }}>
                  Permissions
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '0.75rem'
                }}>
                  {Object.entries(AVAILABLE_PERMISSIONS).map(([permKey, perm]) => {
                    const hasPerm = newRole.permissions[permKey];
                    const PermIcon = perm.icon;
                    
                    return (
                      <div
                        key={permKey}
                        onClick={() => togglePermission(permKey)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.75rem',
                          background: hasPerm ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-secondary)',
                          border: `1px solid ${hasPerm ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-color)'}`,
                          borderRadius: '0.5rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = hasPerm ? 'rgba(16, 185, 129, 0.2)' : 'var(--bg-tertiary)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = hasPerm ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-secondary)';
                        }}
                      >
                        <PermIcon style={{
                          color: hasPerm ? '#10b981' : 'var(--text-secondary)',
                          fontSize: '1rem'
                        }} />
                        <div>
                          <div style={{
                            fontWeight: 600,
                            color: hasPerm ? '#10b981' : 'var(--text-primary)',
                            fontSize: '0.9rem'
                          }}>
                            {perm.name}
                          </div>
                          <div style={{
                            color: 'var(--text-secondary)',
                            fontSize: '0.8rem'
                          }}>
                            {perm.description}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              marginTop: '2rem',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setShowCreateRole(false);
                  setEditingRole(null);
                  setNewRole({
                    name: '',
                    description: '',
                    color: '#6b7280',
                    permissions: {}
                  });
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '0.5rem',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 600
                }}
              >
                Cancel
              </button>
              <button
                onClick={editingRole ? handleSaveEdit : handleCreateRole}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: 'none',
                  borderRadius: '0.5rem',
                  background: 'var(--accent-color)',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 600
                }}
              >
                {editingRole ? 'Save Changes' : 'Create Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IAMSystem; 