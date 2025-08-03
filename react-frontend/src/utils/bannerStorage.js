// Banner storage configuration
const BANNER_CONFIG = {
  maxSize: 5 * 1024 * 1024, // 5MB
  maxGifSize: 10 * 1024 * 1024, // 10MB for GIFs
  supportedFormats: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  maxDimensions: { width: 1920, height: 1080 }
};

// Backend API base URL
const API_BASE_URL = 'http://localhost:5000/api';

// Save banner file to dedicated folder via backend API
export const saveBannerToFolder = async (userEmail, file) => {
  try {
    // Validate file
    if (!BANNER_CONFIG.supportedFormats.includes(file.type)) {
      throw new Error('Unsupported file format. Please use JPEG, PNG, GIF, or WebP.');
    }

    if (file.size > BANNER_CONFIG.maxSize) {
      throw new Error(`File size too large. Maximum size is ${BANNER_CONFIG.maxSize / (1024 * 1024)}MB.`);
    }

    if (file.type.includes('gif') && file.size > BANNER_CONFIG.maxGifSize) {
      throw new Error(`GIF file too large. Maximum size is ${BANNER_CONFIG.maxGifSize / (1024 * 1024)}MB.`);
    }

    // Convert file to base64
    const fileData = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });

    // Send to backend API
    const response = await fetch(`${API_BASE_URL}/banners/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_email: userEmail,
        file_data: fileData,
        file_type: file.type
      })
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to upload banner');
    }

    return {
      success: true,
      bannerId: result.banner_id,
      filename: result.filename,
      dataUrl: fileData
    };
  } catch (error) {
    throw error;
  }
};

// Load banner from folder via backend API
export const loadBannerFromFolder = async (userEmail) => {
  try {
    const response = await fetch(`${API_BASE_URL}/banners/${encodeURIComponent(userEmail)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // No banner found
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      return null;
    }

    return {
      dataUrl: result.data_url,
      metadata: {
        filename: result.filename,
        file_type: result.file_type,
        uploaded_at: result.uploaded_at
      }
    };
  } catch (error) {
    console.error('Error loading banner:', error);
    return null;
  }
};

// Remove banner from folder via backend API
export const removeBannerFromFolder = async (userEmail) => {
  try {
    const response = await fetch(`${API_BASE_URL}/banners/${encodeURIComponent(userEmail)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to remove banner');
    }

    return { success: true };
  } catch (error) {
    throw error;
  }
};

// Get banner storage info via backend API
export const getBannerStorageInfo = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/banners/storage/info`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to get storage info');
    }

    return {
      totalBanners: result.total_banners,
      totalSize: result.total_size,
      totalSizeMB: result.total_size_mb,
      userBannerCount: result.user_count
    };
  } catch (error) {
    console.error('Error getting banner storage info:', error);
    return {
      totalBanners: 0,
      totalSize: 0,
      totalSizeMB: '0.00',
      userBannerCount: 0
    };
  }
};

// Export configuration
export { BANNER_CONFIG }; 