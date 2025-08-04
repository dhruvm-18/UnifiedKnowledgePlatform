/**
 * Utility functions for cleaning up user data when accounts are deleted
 */

/**
 * Clears all user-related data from localStorage for a specific email
 * @param {string} email - The user's email address
 */
export const clearUserData = (email) => {
  if (!email) return;
  
  // Clear basic user data
  localStorage.removeItem('ukpUser');
  localStorage.removeItem('isLoggedIn');
  localStorage.removeItem('userEmail');
  
  // Clear welcome overlay flags
  localStorage.removeItem(`hasSeenWelcome_${email}`);
  localStorage.removeItem(`userFirstLogin_${email}`);
  
  // Clear admin and role flags
  localStorage.removeItem(`userIsAdmin_${email}`);
  localStorage.removeItem(`userIsFeedbackManager_${email}`);
  localStorage.removeItem(`userCustomRole_${email}`);
  localStorage.removeItem(`userRoles_${email}`);
  
  // Clear profile photos and banners
  localStorage.removeItem(`profilePhoto_${email}`);
  
  // Remove from users array
  const users = JSON.parse(localStorage.getItem('ukpUsers') || '[]');
  const filteredUsers = users.filter(u => u.email !== email);
  localStorage.setItem('ukpUsers', JSON.stringify(filteredUsers));
  
  // Also check the old USERS_KEY format
  const oldUsers = JSON.parse(localStorage.getItem('ukpUsers') || '[]');
  const filteredOldUsers = oldUsers.filter(u => u.email !== email);
  localStorage.setItem('ukpUsers', JSON.stringify(filteredOldUsers));
  
  console.log(`Cleared all user data for: ${email}`);
};

/**
 * Clears only welcome overlay flags for a specific email
 * @param {string} email - The user's email address
 */
export const clearWelcomeFlags = (email) => {
  if (!email) return;
  
  localStorage.removeItem(`hasSeenWelcome_${email}`);
  localStorage.removeItem(`userFirstLogin_${email}`);
  
  console.log(`Cleared welcome flags for: ${email}`);
}; 