// GitHub OAuth Configuration
// Replace this with your actual GitHub OAuth App credentials

export const GITHUB_CONFIG = {
  CLIENT_ID: process.env.REACT_APP_GITHUB_CLIENT_ID || "YOUR_GITHUB_CLIENT_ID_HERE",
  CLIENT_SECRET: process.env.REACT_APP_GITHUB_CLIENT_SECRET || "YOUR_GITHUB_CLIENT_SECRET_HERE",
  REDIRECT_URI: process.env.REACT_APP_GITHUB_REDIRECT_URI || "http://localhost:3000",
  SCOPE: "read:user user:email"
};

// Instructions to get GitHub OAuth App credentials:
// 1. Go to https://github.com/settings/developers
// 2. Click "New OAuth App"
// 3. Fill in the details:
//    - Application name: "Unified Knowledge Platform"
//    - Homepage URL: http://localhost:3000 (for development)
//    - Authorization callback URL: http://localhost:3000
// 4. Click "Register application"
// 5. Copy the Client ID and Client Secret
// 6. For production, update the URLs to your domain 