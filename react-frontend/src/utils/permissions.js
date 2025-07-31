// Default roles and their permissions
export const DEFAULT_ROLES = {
  'owner': {
    name: 'Owner',
    description: 'Full system access with role management capabilities',
    color: '#dc2626',
    icon: 'FaCrown',
    permissions: {
      developerOptions: true,
      feedbackDashboard: true,
      monitoringDashboard: true,
      userManagement: true,
      roleManagement: true,
      createRoles: true,
      editRoles: true,
      deleteRoles: true,
      assignRoles: true
    }
  },
  'admin': {
    name: 'Admin',
    description: 'Full administrative access',
    color: '#f59e0b',
    icon: 'FaCrown',
    permissions: {
      developerOptions: true,
      feedbackDashboard: true,
      monitoringDashboard: true,
      userManagement: true,
      roleManagement: false,
      createRoles: false,
      editRoles: false,
      deleteRoles: false,
      assignRoles: true
    }
  },
  'feedback-manager': {
    name: 'Feedback Manager',
    description: 'Access to feedback dashboard only',
    color: '#10b981',
    icon: 'FaThumbsUp',
    permissions: {
      developerOptions: true,
      feedbackDashboard: true,
      monitoringDashboard: false,
      userManagement: false,
      roleManagement: false,
      createRoles: false,
      editRoles: false,
      deleteRoles: false,
      assignRoles: false
    }
  },
  'user': {
    name: 'User',
    description: 'Regular user access',
    color: '#6b7280',
    icon: 'FaUser',
    permissions: {
      developerOptions: false,
      feedbackDashboard: false,
      monitoringDashboard: false,
      userManagement: false,
      roleManagement: false,
      createRoles: false,
      editRoles: false,
      deleteRoles: false,
      assignRoles: false
    }
  }
};

// Get user's role from localStorage
export const getUserRole = (userEmail) => {
  // Check for owner
  if (userEmail === 'dhruv.mendiratta4@gmail.com') {
    return 'owner';
  }
  
  // Check for custom role first
  const customRole = localStorage.getItem(`userCustomRole_${userEmail}`);
  if (customRole) {
    return customRole;
  }
  
  // Check for admin
  if (localStorage.getItem('userIsAdmin') === 'true' || localStorage.getItem(`userIsAdmin_${userEmail}`) === 'true') {
    return 'admin';
  }
  
  // Check for feedback manager
  if (localStorage.getItem(`userIsFeedbackManager_${userEmail}`) === 'true') {
    return 'feedback-manager';
  }
  
  // Default to user
  return 'user';
};

// Get role data including custom roles
export const getRoleData = (roleKey) => {
  const customRoles = JSON.parse(localStorage.getItem('ukpRoles') || '{}');
  const allRoles = { ...DEFAULT_ROLES, ...customRoles };
  return allRoles[roleKey] || allRoles['user'];
};

// Check if user has specific permission
export const hasPermission = (userEmail, permission) => {
  const userRole = getUserRole(userEmail);
  const roleData = getRoleData(userRole);
  return roleData?.permissions?.[permission] || false;
};

// Get all available roles
export const getAllRoles = () => {
  const customRoles = JSON.parse(localStorage.getItem('ukpRoles') || '{}');
  return { ...DEFAULT_ROLES, ...customRoles };
};

// Assign role to user
export const assignRoleToUser = (userEmail, roleKey) => {
  const roleData = getRoleData(roleKey);
  if (!roleData) {
    console.error('Invalid role:', roleKey);
    return false;
  }

  // Clear existing role flags
  localStorage.removeItem(`userIsAdmin_${userEmail}`);
  localStorage.removeItem(`userIsFeedbackManager_${userEmail}`);

  // Set new role flags based on permissions
  if (roleData.permissions.userManagement) {
    localStorage.setItem(`userIsAdmin_${userEmail}`, 'true');
  }
  if (roleData.permissions.feedbackDashboard && !roleData.permissions.userManagement) {
    localStorage.setItem(`userIsFeedbackManager_${userEmail}`, 'true');
  }

  // Store the custom role key for custom roles
  if (!DEFAULT_ROLES[roleKey]) {
    localStorage.setItem(`userCustomRole_${userEmail}`, roleKey);
  } else {
    localStorage.removeItem(`userCustomRole_${userEmail}`);
  }

  // Update user object in ukpUsers
  const users = JSON.parse(localStorage.getItem('ukpUsers') || '[]');
  const userIndex = users.findIndex(u => u.email === userEmail);
  if (userIndex !== -1) {
    users[userIndex] = {
      ...users[userIndex],
      role: roleData.name,
      roleKey: roleKey, // Store the role key for reference
      isAdmin: roleData.permissions.userManagement,
      isFeedbackManager: roleData.permissions.feedbackDashboard && !roleData.permissions.userManagement
    };
    localStorage.setItem('ukpUsers', JSON.stringify(users));
  }

  // Update current user if it's the same user
  const currentUser = JSON.parse(localStorage.getItem('ukpUser') || '{}');
  if (currentUser.email === userEmail) {
    const updatedUser = {
      ...currentUser,
      role: roleData.name,
      roleKey: roleKey, // Store the role key for reference
      isAdmin: roleData.permissions.userManagement,
      isFeedbackManager: roleData.permissions.feedbackDashboard && !roleData.permissions.userManagement
    };
    localStorage.setItem('ukpUser', JSON.stringify(updatedUser));
  }

  return true;
};

// Get user's display role information
export const getUserRoleInfo = (userEmail) => {
  const userRole = getUserRole(userEmail);
  const roleData = getRoleData(userRole);
  return {
    role: userRole,
    name: roleData.name,
    color: roleData.color,
    description: roleData.description,
    permissions: roleData.permissions
  };
};

// Check if user can access developer options
export const canAccessDeveloperOptions = (userEmail) => {
  return hasPermission(userEmail, 'developerOptions');
};

// Check if user can access feedback dashboard
export const canAccessFeedbackDashboard = (userEmail) => {
  return hasPermission(userEmail, 'feedbackDashboard');
};

// Check if user can access monitoring dashboard
export const canAccessMonitoringDashboard = (userEmail) => {
  return hasPermission(userEmail, 'monitoringDashboard');
};

// Check if user can access user management
export const canAccessUserManagement = (userEmail) => {
  return hasPermission(userEmail, 'userManagement');
};

// Check if user can access role management
export const canAccessRoleManagement = (userEmail) => {
  return hasPermission(userEmail, 'roleManagement');
};

// Check if user can create roles
export const canCreateRoles = (userEmail) => {
  return hasPermission(userEmail, 'createRoles');
};

// Check if user can edit roles
export const canEditRoles = (userEmail) => {
  return hasPermission(userEmail, 'editRoles');
};

// Check if user can delete roles
export const canDeleteRoles = (userEmail) => {
  return hasPermission(userEmail, 'deleteRoles');
};

// Check if user can assign roles
export const canAssignRoles = (userEmail) => {
  return hasPermission(userEmail, 'assignRoles');
}; 