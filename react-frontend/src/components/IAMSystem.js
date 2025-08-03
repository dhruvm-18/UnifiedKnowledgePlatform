import React, { useState, useEffect } from 'react';
import { FaCrown, FaUser, FaThumbsUp, FaPlus, FaEdit, FaTrash, FaSave, FaTimes, FaShieldAlt, FaUsers, FaChartLine, FaCog, FaEye, FaEyeSlash, FaGithub, FaChevronDown, FaCheck, FaSort } from 'react-icons/fa';
import { assignRoleToUser, removeRoleFromUser, getAllRoles, getRoleData, getUserRole, getUserRoles, DEFAULT_ROLES } from '../utils/permissions';



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
  const [activeSubTab, setActiveSubTab] = useState('roles-list'); // 'roles-list' or 'priority-management'
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
  const [roleSelectionOverlay, setRoleSelectionOverlay] = useState(null);
  const [selectedRoles, setSelectedRoles] = useState({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [globalRoleOrder, setGlobalRoleOrder] = useState([]);

  // Load roles from localStorage
  useEffect(() => {
    const savedRoles = JSON.parse(localStorage.getItem('ukpRoles') || '{}');
    setRoles({ ...DEFAULT_ROLES, ...savedRoles });
  }, []);

  // Load global role order
  useEffect(() => {
    const savedOrder = JSON.parse(localStorage.getItem('ukpRoleOrder') || '[]');
    if (savedOrder.length > 0) {
      setGlobalRoleOrder(savedOrder);
    } else {
      // Initialize with default order
      const defaultOrder = Object.keys(DEFAULT_ROLES);
      setGlobalRoleOrder(defaultOrder);
      localStorage.setItem('ukpRoleOrder', JSON.stringify(defaultOrder));
    }
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
      // Get multiple roles for the user
      const userRoles = getUserRoles(user.email);
      const roleDataList = userRoles.map(roleKey => getRoleData(roleKey)).filter(Boolean);
      
      // Debug logging
      console.log(`User: ${user.email}, Roles: ${userRoles}, RoleData:`, roleDataList);
      
      return {
        ...user,
        roles: userRoles,
        roleDataList,
        primaryRole: userRoles[0] || 'user',
        primaryRoleData: getRoleData(userRoles[0] || 'user')
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

  // Handle global role reordering
  const handleGlobalRoleReorder = (draggedRole, targetRole) => {
    if (draggedRole === targetRole) return;
    
    const updatedOrder = [...globalRoleOrder];
    const draggedIndex = updatedOrder.indexOf(draggedRole);
    const targetIndex = updatedOrder.indexOf(targetRole);
    
    updatedOrder.splice(draggedIndex, 1);
    updatedOrder.splice(targetIndex, 0, draggedRole);
    
    setGlobalRoleOrder(updatedOrder);
    localStorage.setItem('ukpRoleOrder', JSON.stringify(updatedOrder));
    
    setSuccessMessage('Role priority updated successfully!');
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);
  };

  // Handle priority change with arrow buttons
  const handlePriorityChange = (roleKey, direction) => {
    const currentIndex = globalRoleOrder.indexOf(roleKey);
    if (currentIndex === -1) return;
    
    const updatedOrder = [...globalRoleOrder];
    
    if (direction === 'up' && currentIndex > 0) {
      // Move up
      [updatedOrder[currentIndex], updatedOrder[currentIndex - 1]] = 
      [updatedOrder[currentIndex - 1], updatedOrder[currentIndex]];
    } else if (direction === 'down' && currentIndex < updatedOrder.length - 1) {
      // Move down
      [updatedOrder[currentIndex], updatedOrder[currentIndex + 1]] = 
      [updatedOrder[currentIndex + 1], updatedOrder[currentIndex]];
    } else {
      return; // Can't move further
    }
    
    setGlobalRoleOrder(updatedOrder);
    localStorage.setItem('ukpRoleOrder', JSON.stringify(updatedOrder));
    
    setSuccessMessage('Role priority updated successfully!');
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);
  };

  // Open role selection overlay
  const openRoleSelection = (userEmail) => {
    const userRoles = getUserRoles(userEmail);
    const initialSelection = {};
    
    // Pre-select existing roles
    userRoles.forEach(roleKey => {
      initialSelection[roleKey] = true;
    });
    
    setSelectedRoles(initialSelection);
    setRoleSelectionOverlay(userEmail);
  };

  // Handle role selection change
  const handleRoleSelectionChange = (roleKey, checked) => {
    setSelectedRoles(prev => ({
      ...prev,
      [roleKey]: checked
    }));
  };

  // Save role selections
  const saveRoleSelections = (userEmail) => {
    const selectedRoleKeys = Object.keys(selectedRoles).filter(key => selectedRoles[key]);
    
    // Clear existing roles
    localStorage.removeItem(`userRoles_${userEmail}`);
    
    // Assign selected roles
    selectedRoleKeys.forEach(roleKey => {
      assignRoleToUser(userEmail, roleKey);
    });
    
    setRoleSelectionOverlay(null);
    setSelectedRoles({});
    setRefreshTrigger(prev => prev + 1);
    
    setSuccessMessage(`Roles updated for ${userEmail}`);
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);
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
        
        {/* Sub Navigation */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '1.5rem',
          padding: '0.5rem',
          background: 'var(--bg-primary)',
          borderRadius: '0.5rem',
          border: '1px solid var(--border-color)'
        }}>
          <button
            onClick={() => setActiveSubTab('roles-list')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: activeSubTab === 'roles-list' ? 'var(--accent-color)' : 'transparent',
              color: activeSubTab === 'roles-list' ? 'white' : 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '0.5rem',
              padding: '0.5rem 1rem',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <FaShieldAlt />
            Roles List
          </button>
          <button
            onClick={() => setActiveSubTab('priority-management')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: activeSubTab === 'priority-management' ? 'var(--accent-color)' : 'transparent',
              color: activeSubTab === 'priority-management' ? 'white' : 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '0.5rem',
              padding: '0.5rem 1rem',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <FaSort />
            Priority Management
          </button>
        </div>
        
        {/* Roles List Content */}
        {activeSubTab === 'roles-list' && (
          <div style={{
            display: 'grid',
            gap: '1rem'
          }}>
          {globalRoleOrder.map((roleKey, index) => {
            const role = roles[roleKey];
            if (!role) return null;
            
            const IconComponent = typeof role.icon === 'string' ? getIconComponent(role.icon) : (role.icon || FaUser);
            const isDefault = DEFAULT_ROLES[roleKey];
            
            return (
              <div 
                key={roleKey} 
                style={{
                  background: 'var(--bg-primary)',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  border: '1px solid var(--border-color)',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
              >
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
        )}
        
        {/* Role Priority Management Content */}
        {activeSubTab === 'priority-management' && (
          <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            border: '1px solid var(--border-color)'
          }}>
          <h3 style={{
            margin: '0 0 1rem 0',
            color: 'var(--text-primary)',
            fontSize: '1.1rem',
            fontWeight: 600
          }}>
            Role Priority Management
          </h3>
          <p style={{
            margin: '0 0 1rem 0',
            color: 'var(--text-secondary)',
            fontSize: '0.9rem'
          }}>
            Use the arrow buttons to adjust role priority. Higher priority roles will appear first in user profiles and role lists.
          </p>
          
          <div style={{
            background: 'var(--bg-primary)',
            borderRadius: '0.5rem',
            border: '1px solid var(--border-color)',
            overflow: 'hidden'
          }}>
            {globalRoleOrder.map((roleKey, index) => {
              const role = roles[roleKey];
              if (!role) return null;
              
              const IconComponent = typeof role.icon === 'string' ? getIconComponent(role.icon) : (role.icon || FaUser);
              
              return (
                <div
                  key={roleKey}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    borderBottom: index < globalRoleOrder.length - 1 ? '1px solid var(--border-color)' : 'none',
                    background: 'var(--bg-primary)',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.background = 'var(--bg-secondary)'}
                  onMouseLeave={(e) => e.target.style.background = 'var(--bg-primary)'}
                >
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
                      fontSize: '0.8rem'
                    }}>
                      <IconComponent />
                    </div>
                    <div>
                      <div style={{
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem'
                      }}>
                        {role.name}
                      </div>
                      <div style={{
                        color: 'var(--text-secondary)',
                        fontSize: '0.8rem'
                      }}>
                        Priority #{index + 1}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    gap: '0.25rem'
                  }}>
                    <button
                      onClick={() => handlePriorityChange(roleKey, 'up')}
                      disabled={index === 0}
                      style={{
                        background: index === 0 ? 'var(--bg-tertiary)' : 'var(--accent-color)',
                        color: index === 0 ? 'var(--text-secondary)' : 'white',
                        border: 'none',
                        borderRadius: '0.25rem',
                        padding: '0.5rem',
                        cursor: index === 0 ? 'not-allowed' : 'pointer',
                        fontSize: '0.8rem',
                        transition: 'all 0.2s ease'
                      }}
                      title="Move Up"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => handlePriorityChange(roleKey, 'down')}
                      disabled={index === globalRoleOrder.length - 1}
                      style={{
                        background: index === globalRoleOrder.length - 1 ? 'var(--bg-tertiary)' : 'var(--accent-color)',
                        color: index === globalRoleOrder.length - 1 ? 'var(--text-secondary)' : 'white',
                        border: 'none',
                        borderRadius: '0.25rem',
                        padding: '0.5rem',
                        cursor: index === globalRoleOrder.length - 1 ? 'not-allowed' : 'pointer',
                        fontSize: '0.8rem',
                        transition: 'all 0.2s ease'
                      }}
                      title="Move Down"
                    >
                      ↓
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        )}
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
                  {/* User Info Section */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '1rem'
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
                        {/* GitHub Connection Status */}
                        {user.githubId && user.githubUsername && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.8rem',
                            color: '#10b981',
                            marginTop: '0.25rem'
                          }}>
                            <FaGithub />
                            GitHub: @{user.githubUsername} (ID: {user.githubId})
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* GitHub Connection Status Badge */}
                    <div>
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
                    </div>
                  </div>
                      
                  {/* Roles Section */}
                  <div style={{
                    marginTop: '1rem'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      flexWrap: 'wrap'
                    }}>
                      {user.roles && user.roles.length > 0 ? (
                        user.roles.map((roleKey, index) => {
                          const roleData = getRoleData(roleKey);
                          const IconComponent = typeof roleData?.icon === 'string' ? getIconComponent(roleData.icon) : (roleData?.icon || FaUser);
                          
                          return (
                            <div
                              key={roleKey}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 0.75rem',
                                background: roleData?.color || '#6b7280',
                                color: 'white',
                                borderRadius: '0.5rem',
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                position: 'relative'
                              }}
                            >
                              <IconComponent style={{ fontSize: '0.8rem' }} />
                              <span>{roleData?.name || 'User'}</span>
                              <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>#{index + 1}</span>
                              
                              {/* Remove Role Button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (user.roles.length > 1) {
                                    removeRoleFromUser(user.email, roleKey);
                                    setRefreshTrigger(prev => prev + 1);
                                    setSuccessMessage(`Role "${roleData?.name}" removed from ${user.name || user.email}`);
                                    setShowSuccessMessage(true);
                                    setTimeout(() => setShowSuccessMessage(false), 3000);
                                  }
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'white',
                                  cursor: 'pointer',
                                  marginLeft: '0.25rem',
                                  fontSize: '0.7rem',
                                  padding: '0.1rem',
                                  borderRadius: '50%',
                                  width: '1.2rem',
                                  height: '1.2rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
                                onMouseLeave={(e) => e.target.style.background = 'none'}
                                title="Remove Role"
                              >
                                <FaTimes />
                              </button>
                            </div>
                          );
                        })
                      ) : (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.5rem 0.75rem',
                          background: '#6b7280',
                          color: 'white',
                          borderRadius: '0.5rem',
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          opacity: 0.7
                        }}>
                          <FaUser style={{ fontSize: '0.8rem' }} />
                          No roles assigned
                        </div>
                      )}
                      
                      {/* Add Role Button */}
                      {(hasPermission(currentUser.email, 'assignRoles') || isOwner) && (
                        <button
                          onClick={() => openRoleSelection(user.email)}
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
                            fontSize: '0.8rem',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.background = 'var(--accent-color-dark)'}
                          onMouseLeave={(e) => e.target.style.background = 'var(--accent-color)'}
                          title="Add/Edit Roles"
                        >
                          <FaPlus />
                        </button>
                      )}
                    </div>
                  </div>
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

      {/* Role Selection Overlay */}
      {roleSelectionOverlay && (
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
            setRoleSelectionOverlay(null);
            setSelectedRoles({});
          }
        }}
        >
          <div style={{
            background: 'var(--bg-primary)',
            borderRadius: '1rem',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h3 style={{
              margin: '0 0 1.5rem 0',
              color: 'var(--text-primary)',
              fontSize: '1.3rem',
              fontWeight: 600
            }}>
              Manage Roles for {roleSelectionOverlay}
            </h3>
            
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              marginBottom: '2rem'
            }}>
              {Object.entries(roles).map(([roleKey, role]) => {
                const RoleIcon = typeof role.icon === 'string' ? getIconComponent(role.icon) : (role.icon || FaUser);
                const isSelected = selectedRoles[roleKey] || false;
                
                return (
                  <div
                    key={roleKey}
                    onClick={() => handleRoleSelectionChange(roleKey, !isSelected)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      background: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-secondary)',
                      border: `1px solid ${isSelected ? 'rgba(59, 130, 246, 0.3)' : 'var(--border-color)'}`,
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = isSelected ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-tertiary)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = isSelected ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-secondary)';
                    }}
                  >
                    <div style={{
                      width: '1.2rem',
                      height: '1.2rem',
                      border: `2px solid ${isSelected ? 'var(--accent-color)' : 'var(--border-color)'}`,
                      borderRadius: '0.25rem',
                      background: isSelected ? 'var(--accent-color)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '0.7rem',
                      fontWeight: 'bold'
                    }}>
                      {isSelected && '✓'}
                    </div>
                    <RoleIcon style={{ 
                      color: role.color, 
                      fontSize: '1rem' 
                    }} />
                    <div>
                      <div style={{
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem'
                      }}>
                        {role.name}
                      </div>
                      <div style={{
                        color: 'var(--text-secondary)',
                        fontSize: '0.8rem'
                      }}>
                        {role.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setRoleSelectionOverlay(null);
                  setSelectedRoles({});
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
                onClick={() => saveRoleSelections(roleSelectionOverlay)}
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
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IAMSystem; 