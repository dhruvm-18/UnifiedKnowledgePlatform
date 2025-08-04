import React, { useState, useEffect, useRef } from 'react';
import { FaTimes, FaUser, FaImage, FaFileUpload, FaRobot, FaBrain, FaSearch, FaProjectDiagram, FaComments, FaArrowRight, FaCheck, FaPlay, FaChevronLeft, FaUpload } from 'react-icons/fa';
import { saveBannerToFolder } from '../utils/bannerStorage';
import '../styles/WelcomeOverlay.css';

const WelcomeOverlay = ({ isVisible, onClose, userName, userEmail }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [bannerImage, setBannerImage] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(null);
  const [bannerImagePreview, setBannerImagePreview] = useState(null);
  
  const profileInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  const features = [
    {
      icon: <FaUser className="feature-icon" />,
      title: "Personalized Profile",
      description: "Upload your profile photo and customize your banner with support for both images and GIFs",
      demo: "profile-demo",
      color: "#3B82F6"
    },
    {
      icon: <FaRobot className="feature-icon" />,
      title: "AI-Powered Conversations",
      description: "Chat with intelligent agents that understand your documents and provide instant insights",
      demo: "chat-demo",
      color: "#10B981"
    },
    {
      icon: <FaFileUpload className="feature-icon" />,
      title: "Multi-Format Upload",
      description: "Upload PDFs, images, documents, and more. Our AI extracts and understands everything",
      demo: "upload-demo",
      color: "#F59E0B"
    },
    {
      icon: <FaSearch className="feature-icon" />,
      title: "Smart Search",
      description: "Find information across all your documents with intelligent search and highlighting",
      demo: "search-demo",
      color: "#8B5CF6"
    },
    {
      icon: <FaProjectDiagram className="feature-icon" />,
      title: "Project Management",
      description: "Organize your work with projects, notes, and collaborative features",
      demo: "projects-demo",
      color: "#EF4444"
    },
    {
      icon: <FaBrain className="feature-icon" />,
      title: "Advanced Analytics",
      description: "Get insights into your usage patterns and optimize your workflow",
      demo: "analytics-demo",
      color: "#06B6D4"
    }
  ];

  const handleNext = async () => {
    // Auto-save images if we're on the profile step and images were uploaded
    if (currentStep === 0 && (profileImage || bannerImage)) {
      try {
        await handleSaveImages();
      } catch (error) {
        console.error('Error auto-saving images:', error);
      }
    }
    
    if (currentStep < features.length - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
        setIsAnimating(false);
      }, 300);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(currentStep - 1);
        setIsAnimating(false);
      }, 300);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const handleStepClick = (stepIndex) => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep(stepIndex);
      setIsAnimating(false);
    }, 300);
  };

  const handleProfileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setProfileImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setProfileImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleBannerUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setBannerImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setBannerImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleProfileClick = () => {
    profileInputRef.current?.click();
  };

  const handleBannerClick = () => {
    bannerInputRef.current?.click();
  };

  const removeProfileImage = () => {
    setProfileImage(null);
    setProfileImagePreview(null);
    if (profileInputRef.current) {
      profileInputRef.current.value = '';
    }
  };

  const removeBannerImage = () => {
    setBannerImage(null);
    setBannerImagePreview(null);
    if (bannerInputRef.current) {
      bannerInputRef.current.value = '';
    }
  };

  // Compress image for storage
  const compressImage = (imageData, callback) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Calculate new dimensions (max 300x300 for profile, 1200x300 for banner)
      const maxWidth = 300;
      const maxHeight = 300;
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to base64 with quality 0.8
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      callback(compressedDataUrl);
    };
    img.src = imageData;
  };

  const handleSaveImages = async () => {
    try {
      if (!userEmail) {
        console.error('No user email available for saving images');
        return;
      }

      // Save profile picture to localStorage
      if (profileImage) {
        compressImage(profileImagePreview, (compressedImage) => {
          try {
            // Save to localStorage
            const profilePhotoKey = `profilePhoto_${userEmail}`;
            localStorage.setItem(profilePhotoKey, compressedImage);
            
            // Update user object in localStorage
            const userData = JSON.parse(localStorage.getItem('ukpUser')) || {};
            const updatedUser = { ...userData, avatar: compressedImage };
            localStorage.setItem('ukpUser', JSON.stringify(updatedUser));
            
            // Update in users array
            const users = JSON.parse(localStorage.getItem('ukpUsers')) || [];
            const idx = users.findIndex(u => u.email === userEmail);
            if (idx !== -1) {
              users[idx] = { ...users[idx], avatar: compressedImage };
              localStorage.setItem('ukpUsers', JSON.stringify(users));
            }
            
            console.log('Profile picture saved successfully!');
          } catch (error) {
            console.error('Error saving profile picture:', error);
          }
        });
      }

      // Save banner to file system
      if (bannerImage) {
        try {
          // Convert preview back to file
          const response = await fetch(bannerImagePreview);
          const blob = await response.blob();
          const file = new File([blob], 'banner.jpg', { type: blob.type });

          const result = await saveBannerToFolder(userEmail, file);
          if (result.success) {
            console.log('Banner saved successfully!');
            // Dispatch event to notify other components
            window.dispatchEvent(new CustomEvent('bannerUpdated'));
          } else {
            throw new Error(result.error || 'Failed to save banner');
          }
        } catch (error) {
          console.error('Error saving banner:', error);
        }
      }

      console.log('All images saved successfully!');
    } catch (error) {
      console.error('Error saving images:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (isVisible) {
      setCurrentStep(0);
      setIsAnimating(false);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="welcome-overlay">
      <div className="welcome-overlay-backdrop" onClick={handleSkip} />
      
      <div className="welcome-overlay-content">
        {/* Header */}
        <div className="welcome-header">
          <div className="welcome-header-left">
            <div className="welcome-logo">
              <img src="/unified-knowledge-platform.png" alt="Unified" />
              <span>Unified®</span>
            </div>
          </div>
          <div className="welcome-header-right">
            <button className="welcome-skip-btn" onClick={handleSkip}>
              Skip
            </button>
            <button className="welcome-close-btn" onClick={handleSkip}>
              <FaTimes />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="welcome-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${((currentStep + 1) / features.length) * 100}%` }}
            />
          </div>
          <span className="progress-text">
            {currentStep + 1} of {features.length}
          </span>
        </div>

        {/* Main Content */}
        <div className="welcome-main">
          <div className={`welcome-feature ${isAnimating ? 'animating' : ''}`}>
            <div className="feature-demo-area">
              {currentStep === 0 ? (
                <div className="demo-upload-section">
                    <div className="demo-upload-item">
                      <div className="demo-upload-label">Profile Picture</div>
                      <div 
                        className={`demo-profile-picture ${profileImagePreview ? 'has-image' : ''}`}
                        onClick={handleProfileClick}
                      >
                        {profileImagePreview ? (
                          <img src={profileImagePreview} alt="Profile" />
                        ) : (
                          <FaUser />
                        )}
                        <div className="demo-upload-overlay">
                          <FaUpload />
                          <span>{profileImagePreview ? 'Change' : 'Upload'}</span>
                        </div>
                                                  {profileImagePreview && (
                            <button 
                              className="demo-remove-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeProfileImage();
                              }}
                            >
                              <FaTimes />
                            </button>
                          )}
                      </div>
                      <div className="demo-upload-types">
                        <div className="demo-upload-type">
                          <FaImage />
                          <span>Image</span>
                        </div>
                        <div className="demo-upload-type gif">
                          <FaPlay />
                          <span>GIF</span>
                        </div>
                      </div>
                      <input
                        ref={profileInputRef}
                        type="file"
                        accept="image/*,.gif"
                        onChange={handleProfileUpload}
                        style={{ display: 'none' }}
                      />
                    </div>
                    
                    <div className="demo-upload-item">
                      <div className="demo-upload-label">Banner</div>
                      <div 
                        className={`demo-banner-upload-area ${bannerImagePreview ? 'has-image' : ''}`}
                        onClick={handleBannerClick}
                      >
                        {bannerImagePreview ? (
                          <img src={bannerImagePreview} alt="Banner" />
                        ) : (
                          <FaImage />
                        )}
                        <div className="demo-upload-overlay">
                          <FaUpload />
                          <span>{bannerImagePreview ? 'Change' : 'Upload'}</span>
                        </div>
                                                  {bannerImagePreview && (
                            <button 
                              className="demo-remove-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeBannerImage();
                              }}
                            >
                              <FaTimes />
                            </button>
                          )}
                      </div>
                      <div className="demo-upload-types">
                        <div className="demo-upload-type">
                          <FaImage />
                          <span>Image</span>
                        </div>
                        <div className="demo-upload-type gif">
                          <FaPlay />
                          <span>GIF</span>
                        </div>
                      </div>
                      <input
                        ref={bannerInputRef}
                        type="file"
                        accept="image/*,.gif"
                        onChange={handleBannerUpload}
                        style={{ display: 'none' }}
                      />
                    </div>
                    
                  </div>
                ) : (
                  <div className="demo-container" style={{ backgroundColor: features[currentStep].color + '10' }}>
                    {features[currentStep].icon}
                    <div className="demo-placeholder">
                      <FaPlay className="demo-play-icon" />
                      <span>Interactive Demo</span>
                    </div>
                  </div>
                )}
                

            </div>
            
            <div className="feature-content">
              {currentStep !== 0 && (
                <div className="feature-icon-large" style={{ color: features[currentStep].color }}>
                  {features[currentStep].icon}
                </div>
              )}
              
              <h2 className="feature-title">{features[currentStep].title}</h2>
              <p className="feature-description">{features[currentStep].description}</p>
              {currentStep === 0 && (
                <div className="feature-details">
                  <p>Express yourself with both static images and animated GIFs for your profile picture and banner. Our innovative approach allows you to bring your profile to life with dynamic content while maintaining professional standards.</p>
                </div>
              )}
              
                             <div className="feature-highlights">
                 {currentStep === 0 && (
                   <>
                     <div className="highlight-item">
                       <FaCheck className="highlight-icon" />
                       <span>Upload profile photos and custom banners</span>
                     </div>
                     <div className="highlight-item">
                       <FaCheck className="highlight-icon" />
                       <span>Support for both static images and animated GIFs</span>
                     </div>
                     <div className="highlight-item">
                       <FaCheck className="highlight-icon" />
                       <span>Drag & drop interface for easy uploads</span>
                     </div>
                     <div className="highlight-item">
                       <FaCheck className="highlight-icon" />
                       <span>Real-time preview and cropping tools</span>
                     </div>
                   </>
                 )}
                {currentStep === 1 && (
                  <div className="highlight-item">
                    <FaCheck className="highlight-icon" />
                    <span>Multi-language support with real-time translation</span>
                  </div>
                )}
                {currentStep === 2 && (
                  <div className="highlight-item">
                    <FaCheck className="highlight-icon" />
                    <span>OCR for images and scanned documents</span>
                  </div>
                )}
                {currentStep === 3 && (
                  <div className="highlight-item">
                    <FaCheck className="highlight-icon" />
                    <span>Source highlighting and citation tracking</span>
                  </div>
                )}
                {currentStep === 4 && (
                  <div className="highlight-item">
                    <FaCheck className="highlight-icon" />
                    <span>Collaborative notes and project organization</span>
                  </div>
                )}
                {currentStep === 5 && (
                  <div className="highlight-item">
                    <FaCheck className="highlight-icon" />
                    <span>Usage analytics and performance insights</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="welcome-navigation">
          <div className="step-indicators">
            {features.map((_, index) => (
              <button
                key={index}
                className={`step-dot ${index === currentStep ? 'active' : ''}`}
                onClick={() => handleStepClick(index)}
              />
            ))}
          </div>
          
          <div className="navigation-buttons">
            {currentStep > 0 && (
              <button 
                className="welcome-prev-btn"
                onClick={handlePrevious}
              >
                <FaChevronLeft />
                <span>Previous</span>
              </button>
            )}
            <button 
              className="welcome-next-btn"
              onClick={handleNext}
            >
              {currentStep === features.length - 1 ? (
                <>
                  <span>Get Started</span>
                  <FaCheck />
                </>
              ) : currentStep === 0 && (profileImage || bannerImage) ? (
                <>
                  <span>Save & Continue</span>
                  <FaArrowRight />
                </>
              ) : (
                <>
                  <span>Next</span>
                  <FaArrowRight />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Welcome Message */}
        <div className="welcome-message">
          <h3>Welcome to Unified, {userName || 'User'}! 👋</h3>
          <p>Let's explore what makes Unified the ultimate knowledge platform</p>
          {currentStep === 0 && (
            <div className="innovation-highlight">
              <div className="innovation-badge">
                <FaPlay />
                <span>Innovation</span>
              </div>
              <p>First platform to support animated GIFs for profile customization!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WelcomeOverlay; 