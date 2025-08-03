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

// Get user's multiple roles from localStorage
export const getUserRoles = (userEmail) => {
  // Get stored multiple roles
  const storedRoles = localStorage.getItem(`userRoles_${userEmail}`);
  if (storedRoles) {
    try {
      const roles = JSON.parse(storedRoles);
      return sortRolesByPriority(roles);
    } catch (error) {
      console.error('Error parsing stored roles:', error);
    }
  }
  
  // Fallback to single role system
  const singleRole = getUserRole(userEmail);
  return singleRole ? [singleRole] : ['user'];
};

// Sort roles by global priority
export const sortRolesByPriority = (roles) => {
  const globalOrder = JSON.parse(localStorage.getItem('ukpRoleOrder') || '[]');
  
  // Sort roles based on global priority
  return roles.sort((a, b) => {
    const aIndex = globalOrder.indexOf(a);
    const bIndex = globalOrder.indexOf(b);
    
    // If both roles are in global order, sort by their position
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    
    // If only one role is in global order, prioritize it
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    
    // If neither role is in global order, maintain original order
    return 0;
  });
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

// Assign role to user (adds to existing roles)
export const assignRoleToUser = (userEmail, roleKey) => {
  const roleData = getRoleData(roleKey);
  if (!roleData) {
    console.error('Invalid role:', roleKey);
    return false;
  }

  // Get current roles
  const currentRoles = getUserRoles(userEmail);
  
  // Add new role if not already present
  if (!currentRoles.includes(roleKey)) {
    currentRoles.push(roleKey);
    localStorage.setItem(`userRoles_${userEmail}`, JSON.stringify(currentRoles));
  }

  // Update role flags based on highest permission level
  let hasUserManagement = false;
  let hasFeedbackDashboard = false;
  
  currentRoles.forEach(role => {
    const roleInfo = getRoleData(role);
    if (roleInfo) {
      if (roleInfo.permissions.userManagement) hasUserManagement = true;
      if (roleInfo.permissions.feedbackDashboard) hasFeedbackDashboard = true;
    }
  });

  // Set role flags
  if (hasUserManagement) {
    localStorage.setItem(`userIsAdmin_${userEmail}`, 'true');
  } else {
    localStorage.removeItem(`userIsAdmin_${userEmail}`);
  }
  
  if (hasFeedbackDashboard && !hasUserManagement) {
    localStorage.setItem(`userIsFeedbackManager_${userEmail}`, 'true');
  } else {
    localStorage.removeItem(`userIsFeedbackManager_${userEmail}`);
  }

  // Store the custom role key for custom roles (for backward compatibility)
  const customRoles = currentRoles.filter(role => !DEFAULT_ROLES[role]);
  if (customRoles.length > 0) {
    localStorage.setItem(`userCustomRole_${userEmail}`, customRoles[0]);
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
      roleKey: roleKey, // Store the primary role key for reference
      roles: currentRoles, // Store all roles
      isAdmin: hasUserManagement,
      isFeedbackManager: hasFeedbackDashboard && !hasUserManagement
    };
    localStorage.setItem('ukpUsers', JSON.stringify(users));
  }

  // Update current user if it's the same user
  const currentUser = JSON.parse(localStorage.getItem('ukpUser') || '{}');
  if (currentUser.email === userEmail) {
    const updatedUser = {
      ...currentUser,
      role: roleData.name,
      roleKey: roleKey, // Store the primary role key for reference
      roles: currentRoles, // Store all roles
      isAdmin: hasUserManagement,
      isFeedbackManager: hasFeedbackDashboard && !hasUserManagement
    };
    localStorage.setItem('ukpUser', JSON.stringify(updatedUser));
  }

  return true;
};

// Remove role from user
export const removeRoleFromUser = (userEmail, roleKey) => {
  // Get current roles
  const currentRoles = getUserRoles(userEmail);
  
  // Remove the role if present
  const updatedRoles = currentRoles.filter(role => role !== roleKey);
  
  // Ensure user has at least one role
  if (updatedRoles.length === 0) {
    updatedRoles.push('user');
  }
  
  // Save updated roles
  localStorage.setItem(`userRoles_${userEmail}`, JSON.stringify(updatedRoles));

  // Update role flags based on remaining roles
  let hasUserManagement = false;
  let hasFeedbackDashboard = false;
  
  updatedRoles.forEach(role => {
    const roleInfo = getRoleData(role);
    if (roleInfo) {
      if (roleInfo.permissions.userManagement) hasUserManagement = true;
      if (roleInfo.permissions.feedbackDashboard) hasFeedbackDashboard = true;
    }
  });

  // Set role flags
  if (hasUserManagement) {
    localStorage.setItem(`userIsAdmin_${userEmail}`, 'true');
  } else {
    localStorage.removeItem(`userIsAdmin_${userEmail}`);
  }
  
  if (hasFeedbackDashboard && !hasUserManagement) {
    localStorage.setItem(`userIsFeedbackManager_${userEmail}`, 'true');
  } else {
    localStorage.removeItem(`userIsFeedbackManager_${userEmail}`);
  }

  // Store the custom role key for custom roles (for backward compatibility)
  const customRoles = updatedRoles.filter(role => !DEFAULT_ROLES[role]);
  if (customRoles.length > 0) {
    localStorage.setItem(`userCustomRole_${userEmail}`, customRoles[0]);
  } else {
    localStorage.removeItem(`userCustomRole_${userEmail}`);
  }

  // Update user object in ukpUsers
  const users = JSON.parse(localStorage.getItem('ukpUsers') || '[]');
  const userIndex = users.findIndex(u => u.email === userEmail);
  if (userIndex !== -1) {
    const primaryRole = updatedRoles[0];
    const primaryRoleData = getRoleData(primaryRole);
    users[userIndex] = {
      ...users[userIndex],
      role: primaryRoleData ? primaryRoleData.name : 'User',
      roleKey: primaryRole, // Store the primary role key for reference
      roles: updatedRoles, // Store all roles
      isAdmin: hasUserManagement,
      isFeedbackManager: hasFeedbackDashboard && !hasUserManagement
    };
    localStorage.setItem('ukpUsers', JSON.stringify(users));
  }

  // Update current user if it's the same user
  const currentUser = JSON.parse(localStorage.getItem('ukpUser') || '{}');
  if (currentUser.email === userEmail) {
    const primaryRole = updatedRoles[0];
    const primaryRoleData = getRoleData(primaryRole);
    const updatedUser = {
      ...currentUser,
      role: primaryRoleData ? primaryRoleData.name : 'User',
      roleKey: primaryRole, // Store the primary role key for reference
      roles: updatedRoles, // Store all roles
      isAdmin: hasUserManagement,
      isFeedbackManager: hasFeedbackDashboard && !hasUserManagement
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