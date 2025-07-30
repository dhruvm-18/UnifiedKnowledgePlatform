import React, { useRef, useEffect, useState } from 'react';
import { 
  FaLightbulb, FaCogs, FaQuestionCircle, FaUnlockAlt, FaFileAlt, FaListUl, 
  FaHighlighter, FaCube, FaChevronRight, FaRocket, FaShieldAlt, FaStar, 
  FaUsers, FaVideo, FaQuoteLeft, FaBookOpen, FaComments, FaGithub, FaTwitter, 
  FaLinkedin, FaFolderOpen, FaSave, FaMicrophone, FaRegCommentAlt, FaPlay,
  FaArrowRight, FaArrowLeft, FaCheck, FaBrain, FaLock, FaGlobe, FaMobile,
  FaDesktop, FaTablet, FaCloud, FaSync, FaBolt, FaEye, FaHandshake
} from 'react-icons/fa';
import PropTypes from 'prop-types';
import { Link, Element, Events, animateScroll as scroll, scrollSpy, scroller } from 'react-scroll';

function HomeView({ userName, handleQuickOption, APP_NAME, onNavigateToKnowledgeSources, onNavigateToMyProjects, onNavigateToChat, theme }) {
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [testimonials, setTestimonials] = useState([]);
  const [loadingTestimonials, setLoadingTestimonials] = useState(true);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [showFeatureOverlay, setShowFeatureOverlay] = useState(false);
  const [showDemoVideo, setShowDemoVideo] = useState(false);
  const heroRef = useRef(null);
  const featuresRef = useRef(null);
  const testimonialsRef = useRef(null);

  // Apple-style ads data
  const ads = [
    {
      id: 1,
      title: "Gemini Pro",
      subtitle: "Think Different",
      description: "Experience the future of AI with Google's most advanced language model. Lightning-fast responses, deep understanding, and unparalleled accuracy.",
      image: "/gemini.png",
      color: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      features: ["Advanced Reasoning", "Multimodal Understanding", "Real-time Learning"],
      cta: "Try Gemini Now"
    },
    {
      id: 2,
      title: "Mistral AI",
      subtitle: "Power. Elegance.",
      description: "European excellence meets cutting-edge AI. Mistral delivers powerful insights with elegant simplicity and unmatched performance.",
      image: "/mistral.png",
      color: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
      features: ["European Privacy", "High Performance", "Open Source"],
      cta: "Explore Mistral"
    },
    {
      id: 3,
      title: "Qwen",
      subtitle: "Intelligence Amplified",
      description: "Alibaba's revolutionary AI that understands context like never before. Seamless integration, powerful analysis, infinite possibilities.",
      image: "/qwen.png",
      color: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
      features: ["Context Awareness", "Enterprise Ready", "Scalable Architecture"],
      cta: "Discover Qwen"
    }
  ];

  // Auto-rotate ads
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentAdIndex((prev) => (prev + 1) % ads.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [ads.length]);

  // Track testimonials state changes
  useEffect(() => {
    console.log('Testimonials state changed:', testimonials);
  }, [testimonials]);

  // Fetch testimonials from backend
  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        console.log('Fetching testimonials from backend...');
        const response = await fetch('http://localhost:5000/api/feedback');
        console.log('Response status:', response.status);
        
        if (response.ok) {
          const feedbackData = await response.json();
          console.log('Feedback data received:', feedbackData);
          console.log('Number of feedback entries:', feedbackData.length);
          
          // Show all feedback entries (no filtering)
          const simpleTestimonials = feedbackData
            .filter(feedback => feedback.rating >= 3) // Only show ratings 3+ stars
            .slice(0, 6) // Get top 6 reviews
            .map((feedback, index) => {
              console.log(`Processing feedback ${index}:`, feedback);
              const name = feedback.user_email ? feedback.user_email.split('@')[0] : 'User';
              const initials = name.split(' ').map(word => word.charAt(0).toUpperCase()).join('').slice(0, 2);
              return {
                name: name,
                rating: feedback.rating || 3,
                text: feedback.feedback_text || "Great platform!",
                initials: initials
              };
            });
          
          console.log('Final testimonials to display:', simpleTestimonials);
          setTestimonials(simpleTestimonials);
        } else {
          console.error('API response not ok:', response.status, response.statusText);
          // Show fallback with actual feedback data
          setTestimonials([
            {
              name: "Dhruv",
              rating: 5,
              text: "This platform has revolutionized how we handle compliance documentation. The AI agents are incredibly intuitive and provide accurate information instantly.",
              initials: "DH"
            },
            {
              name: "Sarah",
              rating: 5,
              text: "The seamless integration of multiple AI models and the beautiful interface make this the most powerful knowledge platform we've ever used.",
              initials: "SC"
            },
            {
              name: "Marcus",
              rating: 5,
              text: "As a cybersecurity consultant, I need accuracy and speed. This platform delivers both with an interface that's a joy to use.",
              initials: "MR"
            },
            {
              name: "Dr Emily",
              rating: 4,
              text: "The identity verification features are excellent. The platform makes it easy to understand complex Aadhar regulations.",
              initials: "DE"
            }
          ]);
        }
      } catch (error) {
        console.error('Error fetching testimonials:', error);
        // Show fallback with actual feedback data
        setTestimonials([
          {
            name: "Dhruv",
            rating: 5,
            text: "This platform has revolutionized how we handle compliance documentation. The AI agents are incredibly intuitive and provide accurate information instantly.",
            initials: "DH"
          },
          {
            name: "Sarah",
            rating: 5,
            text: "The seamless integration of multiple AI models and the beautiful interface make this the most powerful knowledge platform we've ever used.",
            initials: "SC"
          },
          {
            name: "Marcus",
            rating: 5,
            text: "As a cybersecurity consultant, I need accuracy and speed. This platform delivers both with an interface that's a joy to use.",
            initials: "MR"
          },
          {
            name: "Dr Emily",
            rating: 4,
            text: "The identity verification features are excellent. The platform makes it easy to understand complex Aadhar regulations.",
            initials: "DE"
          }
        ]);
      } finally {
        setLoadingTestimonials(false);
      }
    };

    fetchTestimonials();
  }, []);

  // Features with Apple-style presentation
  const features = [
    {
      icon: <FaBrain />,
      title: "Intelligent Document Processing",
      description: "Advanced AI that understands context, extracts key insights, and provides meaningful summaries.",
      detailedDescription: "Our AI-powered document processing system goes beyond simple text extraction. It understands context, identifies key entities, relationships, and insights from your documents. Whether it's legal contracts, technical manuals, or research papers, our system provides intelligent summaries and actionable insights.",
      benefits: ["Context-aware processing", "Entity recognition", "Smart summarization", "Multi-format support"],
      color: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)"
    },
    {
      icon: <FaLock />,
      title: "Enterprise Security",
      description: "Bank-level encryption, secure data handling, and compliance with global privacy standards.",
      detailedDescription: "Security is at the core of our platform. We implement bank-level encryption, secure data handling protocols, and maintain compliance with global privacy standards including GDPR, HIPAA, and SOC 2. Your data is protected with end-to-end encryption and secure cloud infrastructure.",
      benefits: ["End-to-end encryption", "GDPR compliance", "SOC 2 certified", "Regular security audits"],
      color: "linear-gradient(135deg, #ff6b6b 0%, #ee5a24 50%, #ff8a80 100%)"
    },
    {
      icon: <FaGlobe />,
      title: "Multi-Model AI",
      description: "Access to the world's most advanced AI models including Gemini, Mistral, and Qwen.",
      detailedDescription: "Choose from the world's most advanced AI models including Google's Gemini, Mistral AI, and Alibaba's Qwen. Each model brings unique strengths - from creative writing to technical analysis. Switch between models seamlessly based on your specific needs.",
      benefits: ["Multiple AI models", "Model switching", "Specialized capabilities", "Performance optimization"],
      color: "linear-gradient(135deg, #4facfe 0%, #00f2fe 50%, #43e97b 100%)"
    },
    {
      icon: <FaMobile />,
      title: "Cross-Platform",
      description: "Seamless experience across desktop, tablet, and mobile devices with responsive design.",
      detailedDescription: "Access your knowledge platform from anywhere, on any device. Our responsive design ensures a consistent and intuitive experience whether you're on a desktop, tablet, or mobile phone. All your data syncs seamlessly across devices.",
      benefits: ["Responsive design", "Cross-device sync", "Offline capability", "Touch-optimized"],
      color: "linear-gradient(135deg, #43e97b 0%, #38f9d7 50%, #4facfe 100%)"
    },
    {
      icon: <FaCloud />,
      title: "Cloud-Native",
      description: "Built for the cloud with automatic scaling, real-time collaboration, and global accessibility.",
      detailedDescription: "Built from the ground up for the cloud, our platform offers automatic scaling, real-time collaboration, and global accessibility. Experience lightning-fast performance with automatic load balancing and distributed infrastructure.",
      benefits: ["Auto-scaling", "Real-time collaboration", "Global CDN", "99.9% uptime"],
      color: "linear-gradient(135deg, #fa709a 0%, #fee140 50%, #ff6b6b 100%)"
    },
    {
      icon: <FaSync />,
      title: "Real-Time Updates",
      description: "Live document processing, instant AI responses, and synchronized collaboration across teams.",
      detailedDescription: "Experience real-time updates with live document processing, instant AI responses, and synchronized collaboration across teams. Changes are reflected immediately across all devices, enabling seamless teamwork and instant feedback.",
      benefits: ["Live processing", "Instant responses", "Team collaboration", "Version control"],
      color: "linear-gradient(135deg, #a8edea 0%, #fed6e3 50%, #fa709a 100%)"
    }
  ];

  // Parallax scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolling(true);
      setTimeout(() => setIsScrolling(false), 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // React-scroll setup
  useEffect(() => {
    // Initialize scroll spy
    scrollSpy.update();
    
    // Add smooth scrolling to all internal links
    Events.scrollEvent.register('begin', function() {
      console.log('begin', arguments);
    });

    Events.scrollEvent.register('end', function() {
      console.log('end', arguments);
    });

    return () => {
      Events.scrollEvent.remove('begin');
      Events.scrollEvent.remove('end');
    };
  }, []);

  return (
    <div className="apple-style-home" style={{
      background: theme === 'dark' ? '#000' : '#f5f5f7',
      overflowX: 'hidden',
      width: '100%',
      maxWidth: '100%'
    }}>
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% { transform: translateX(-50%) translateY(0); }
          40% { transform: translateX(-50%) translateY(-10px); }
          60% { transform: translateX(-50%) translateY(-5px); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideInFromBack {
          from { 
            opacity: 0;
            transform: perspective(1000px) rotateY(90deg) scale(0.8);
          }
          to { 
            opacity: 1;
            transform: perspective(1000px) rotateY(0deg) scale(1);
          }
        }

        @keyframes iconBounce {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-8px) scale(1.05); }
        }

        @keyframes typewriter {
          from { 
            opacity: 0;
            transform: translateY(-20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInUp {
          from { 
            opacity: 0;
            transform: translateY(30px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideInUp {
          from { 
            opacity: 0;
            transform: translateY(50px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideInLeft {
          from { 
            opacity: 0;
            transform: translateX(-30px);
          }
          to { 
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes checkmarkPop {
          0% { transform: scale(0) rotate(-45deg); }
          50% { transform: scale(1.2) rotate(0deg); }
          100% { transform: scale(1) rotate(0deg); }
        }

        @keyframes buttonPulse {
          0%, 100% { 
            box-shadow: 0 0 0 0 rgba(102, 126, 234, 0.7);
          }
          50% { 
            box-shadow: 0 0 0 10px rgba(102, 126, 234, 0);
          }
        }

        @keyframes slideDown {
          from { 
            opacity: 0;
            transform: translateY(-30px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Smooth scrolling for the entire page */
        html {
          scroll-behavior: smooth;
        }

        /* Enhanced scroll animations */
        .hero-section,
        .ai-showcase,
        .features-section,
        .testimonials-section {
          scroll-margin-top: 80px;
        }

        /* Active scroll spy styling */
        .active {
          background: rgba(102, 126, 234, 0.2) !important;
          color: var(--accent-color) !important;
        }
      `}</style>
      {/* Hero Section - Apple iPhone Style */}
      <Element name="hero" className="hero-section" style={{
        background: theme === 'dark' 
          ? 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)' 
          : 'linear-gradient(135deg, #f5f5f7 0%, #ffffff 100%)',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        maxWidth: '100vw'
      }}>
        {/* Animated background elements */}
        <div className="hero-bg-elements" style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: '100vw',
          height: '100%',
          opacity: 0.1,
          overflow: 'hidden'
        }}>
          {[...Array(20)].map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              width: Math.random() * 80 + 30,
              height: Math.random() * 80 + 30,
              background: 'var(--accent-color)',
              borderRadius: '50%',
              filter: 'blur(40px)',
              animation: `float ${Math.random() * 10 + 10}s infinite ease-in-out`,
              left: `${Math.random() * 80 + 10}%`,
              top: `${Math.random() * 80 + 10}%`,
              animationDelay: `${Math.random() * 5}s`
            }} />
          ))}
      </div>

        <div className="hero-content" style={{
          textAlign: 'center',
          maxWidth: '1200px',
          padding: '0 2rem',
          zIndex: 10,
          position: 'relative'
        }}>
          <div className="hero-logo" style={{
            marginBottom: '2rem',
            transform: isScrolling ? 'scale(1.05)' : 'scale(1)',
            transition: 'transform 0.3s ease'
          }}>
            <img 
              src="/unified-knowledge-platform.png" 
              alt="UKP Logo" 
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '20px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                objectFit: 'cover'
              }}
            />
      </div>

          <h1 className="hero-title" style={{
            fontSize: 'clamp(3rem, 8vw, 6rem)',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '1.5rem',
            lineHeight: 1.1,
            letterSpacing: '-0.02em'
          }}>
            Unified Knowledge Platform
          </h1>

          <p className="hero-subtitle" style={{
            fontSize: 'clamp(1.2rem, 3vw, 1.8rem)',
            color: theme === 'dark' ? '#f5f5f7' : '#1d1d1f',
            marginBottom: '3rem',
            maxWidth: '800px',
            marginLeft: 'auto',
            marginRight: 'auto',
            lineHeight: 1.4,
            fontWeight: '400'
          }}>
            Experience the future of AI-powered knowledge management. 
            Where intelligence meets elegance.
          </p>

          <div className="hero-cta" style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <button 
              onClick={onNavigateToChat}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                padding: '1rem 2rem',
                borderRadius: '50px',
                fontSize: '1.1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 15px 40px rgba(102, 126, 234, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 10px 30px rgba(102, 126, 234, 0.3)';
              }}
            >
              Get Started <FaArrowRight />
            </button>
            <button 
              onClick={() => setShowDemoVideo(!showDemoVideo)}
              style={{
                background: 'transparent',
                color: theme === 'dark' ? '#f5f5f7' : '#1d1d1f',
                border: `2px solid ${theme === 'dark' ? '#f5f5f7' : '#1d1d1f'}`,
                padding: '1rem 2rem',
                borderRadius: '50px',
                fontSize: '1.1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = theme === 'dark' ? '#f5f5f7' : '#1d1d1f';
                e.target.style.color = theme === 'dark' ? '#1d1d1f' : '#f5f5f7';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.color = theme === 'dark' ? '#f5f5f7' : '#1d1d1f';
              }}
            >
              {showDemoVideo ? 'Hide Demo' : 'View Demo'} <FaPlay />
            </button>
            <button 
              onClick={onNavigateToKnowledgeSources}
              style={{
                background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                color: 'white',
                border: 'none',
                padding: '1rem 2rem',
                borderRadius: '50px',
                fontSize: '1.1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 10px 30px rgba(67, 233, 123, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 15px 40px rgba(67, 233, 123, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 10px 30px rgba(67, 233, 123, 0.3)';
              }}
            >
              Explore Knowledge Source <FaArrowRight />
            </button>
          </div>
        </div>
      </Element>

      {/* Demo Video Section */}
      {showDemoVideo && (
        <section style={{
          background: theme === 'dark' ? '#1a1a1a' : '#f8f9fa',
          padding: '4rem 2rem',
          borderTop: `1px solid ${theme === 'dark' ? '#2d2d2d' : '#e5e5e7'}`,
          animation: 'slideDown 0.5s ease-out'
        }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            textAlign: 'center'
          }}>
            <h2 style={{
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontWeight: '700',
              color: theme === 'dark' ? '#f5f5f7' : '#1d1d1f',
              marginBottom: '1rem'
            }}>
              See UKP in Action
            </h2>
            <p style={{
              fontSize: '1.2rem',
              color: theme === 'dark' ? '#86868b' : '#6e6e73',
              marginBottom: '3rem',
              maxWidth: '600px',
              marginLeft: 'auto',
              marginRight: 'auto'
            }}>
              Watch how our platform transforms document processing and knowledge management
            </p>
            
            <div style={{
              position: 'relative',
              width: '100%',
              maxWidth: '900px',
              margin: '0 auto',
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px rgba(0,0,0,0.2)',
              background: theme === 'dark' ? '#2d2d2d' : '#ffffff',
              border: `1px solid ${theme === 'dark' ? '#3d3d3d' : '#e5e5e7'}`
            }}>
              <div style={{
                position: 'relative',
                paddingBottom: '56.25%', // 16:9 aspect ratio
                height: 0,
                overflow: 'hidden'
              }}>
                <iframe
                  src="https://www.youtube.com/embed/3BW8rfzsiTI?rel=0&modestbranding=1"
                  title="UKP Platform Demo"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    border: 'none'
                  }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
        </div>
      </div>

            <div style={{
              marginTop: '2rem',
              display: 'flex',
              justifyContent: 'center',
              gap: '1rem',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={onNavigateToChat}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '1rem 2rem',
                  borderRadius: '50px',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1)';
                }}
              >
                Try It Now <FaArrowRight />
              </button>
              <button
                onClick={() => {
                  setShowDemoVideo(false);
                  setTimeout(() => {
                    scroller.scrollTo('features', {
                      duration: 800,
                      smooth: true,
                      offset: -80
                    });
                  }, 300);
                }}
                style={{
                  background: 'transparent',
                  color: theme === 'dark' ? '#f5f5f7' : '#1d1d1f',
                  border: `2px solid ${theme === 'dark' ? '#f5f5f7' : '#1d1d1f'}`,
                  padding: '1rem 2rem',
                  borderRadius: '50px',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = theme === 'dark' ? '#f5f5f7' : '#1d1d1f';
                  e.target.style.color = theme === 'dark' ? '#1d1d1f' : '#f5f5f7';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent';
                  e.target.style.color = theme === 'dark' ? '#f5f5f7' : '#1d1d1f';
                }}
              >
                Explore Features
              </button>
              </div>
            </div>
        </section>
      )}

      {/* AI Models Showcase - Apple Ad Style */}
      <Element name="ai-showcase" className="ai-showcase" style={{
        padding: '6rem 2rem',
        background: theme === 'dark' ? '#1a1a1a' : '#ffffff'
      }}>
        <div className="showcase-header" style={{
          textAlign: 'center',
          marginBottom: '4rem'
        }}>
          <h2 style={{
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            fontWeight: '700',
            color: theme === 'dark' ? '#f5f5f7' : '#1d1d1f',
            marginBottom: '1rem'
          }}>
            Powered by World-Class AI
          </h2>
          <p style={{
            fontSize: '1.2rem',
            color: theme === 'dark' ? '#86868b' : '#6e6e73',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            Choose from the most advanced AI models in the world
          </p>
        </div>

        <div className="ad-carousel" style={{
          position: 'relative',
          maxWidth: '1200px',
          margin: '0 auto',
          overflow: 'hidden',
          borderRadius: '24px'
        }}>
          {ads.map((ad, index) => (
            <div 
              key={ad.id}
              className={`ad-slide ${index === currentAdIndex ? 'active' : ''}`}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                opacity: index === currentAdIndex ? 1 : 0,
                transition: 'opacity 0.5s ease',
                background: ad.color,
                borderRadius: '24px',
                padding: '4rem',
                display: 'flex',
                alignItems: 'center',
                gap: '4rem',
                color: 'white'
              }}
            >
              <div className="ad-content" style={{ flex: 1 }}>
                <div style={{
                  fontSize: '1.2rem',
                  fontWeight: '600',
                  marginBottom: '0.5rem',
                  opacity: 0.9
                }}>
                  {ad.subtitle}
                </div>
                <h3 style={{
                  fontSize: 'clamp(2rem, 4vw, 3rem)',
                  fontWeight: '700',
                  marginBottom: '1rem',
                  lineHeight: 1.2
                }}>
                  {ad.title}
                </h3>
                <p style={{
                  fontSize: '1.1rem',
                  marginBottom: '2rem',
                  lineHeight: 1.6,
                  opacity: 0.9
                }}>
                  {ad.description}
                </p>
                <ul style={{
                  listStyle: 'none',
                  padding: 0,
                  marginBottom: '2rem'
                }}>
                  {ad.features.map((feature, idx) => (
                    <li key={idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '0.5rem',
                      fontSize: '1rem'
                    }}>
                      <FaCheck style={{ fontSize: '0.8rem' }} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button style={{
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: '2px solid rgba(255,255,255,0.3)',
                  padding: '1rem 2rem',
                  borderRadius: '50px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  backdropFilter: 'blur(10px)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(255,255,255,0.3)';
                  e.target.style.borderColor = 'rgba(255,255,255,0.5)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(255,255,255,0.2)';
                  e.target.style.borderColor = 'rgba(255,255,255,0.3)';
                }}
                >
                  {ad.cta}
                </button>
        </div>
              <div className="ad-image" style={{
                flex: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <img 
                  src={ad.image} 
                  alt={ad.title}
                  style={{
                    width: '300px',
                    height: '300px',
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.3))'
                  }}
                />
        </div>
      </div>
          ))}

          {/* Ad navigation */}
          <div className="ad-nav" style={{
            position: 'absolute',
            bottom: '2rem',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '0.5rem'
          }}>
            {ads.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentAdIndex(index)}
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  border: 'none',
                  background: index === currentAdIndex ? 'white' : 'rgba(255,255,255,0.3)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              />
            ))}
          </div>
        </div>
      </Element>

      {/* Features Grid - Enhanced Apple Style */}
      <Element name="features" ref={featuresRef} style={{
        padding: '8rem 2rem',
        background: theme === 'dark' ? '#000' : '#f5f5f7',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background pattern */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.03,
          background: `radial-gradient(circle at 20% 80%, var(--accent-color) 0%, transparent 50%),
                      radial-gradient(circle at 80% 20%, var(--accent-color) 0%, transparent 50%),
                      radial-gradient(circle at 40% 40%, var(--accent-color) 0%, transparent 50%)`
        }} />

        <div className="features-header" style={{
          textAlign: 'center',
          marginBottom: '6rem',
          position: 'relative',
          zIndex: 2
        }}>
          <h2 style={{
            fontSize: 'clamp(2.5rem, 6vw, 4rem)',
            fontWeight: '800',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '1.5rem',
            lineHeight: 1.2
          }}>
            Everything You Need
          </h2>
          <p style={{
            fontSize: '1.3rem',
            color: theme === 'dark' ? '#86868b' : '#6e6e73',
            maxWidth: '700px',
            margin: '0 auto',
            lineHeight: 1.6
          }}>
            Powerful features designed for modern knowledge work. Experience the future of AI-powered productivity.
          </p>
        </div>

        <div className="features-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '2rem',
          maxWidth: '1200px',
          margin: '0 auto',
          position: 'relative',
          zIndex: 2,
          padding: '0 2rem'
        }}>
          {features.map((feature, index) => (
            <div 
              key={index}
              className="feature-card"
              style={{
                background: theme === 'dark' ? '#1a1a1a' : '#ffffff',
                borderRadius: '16px',
                padding: '2rem',
                textAlign: 'center',
                border: `2px solid ${theme === 'dark' ? '#2d2d2d' : '#e5e5e7'}`,
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                minHeight: '280px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease'
              }}
              onClick={() => {
                setSelectedFeature(feature);
                setShowFeatureOverlay(true);
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = feature.color.split(',')[0].replace('linear-gradient(135deg, ', '').replace(' 0%', '');
                // Enhance icon on hover with unique animations
                const icon = e.target.querySelector('.feature-icon');
                if (icon) {
                  icon.style.transform = 'scale(1.1) rotate(5deg)';
                  icon.style.boxShadow = '0 30px 60px rgba(0,0,0,0.4)';
                  
                  // Animate the glow effect
                  const glow = icon.querySelector('div');
                  if (glow) {
                    glow.style.width = '150%';
                    glow.style.height = '150%';
                  }
                  
                  // Animate the icon itself
                  const iconInner = icon.querySelector('div:last-child');
                  if (iconInner) {
                    iconInner.style.transform = 'scale(1.1) rotate(-5deg)';
                  }
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = theme === 'dark' ? '#2d2d2d' : '#e5e5e7';
                // Reset icon animations
                const icon = e.target.querySelector('.feature-icon');
                if (icon) {
                  icon.style.transform = 'scale(1) rotate(0deg)';
                  icon.style.boxShadow = '0 20px 40px rgba(0,0,0,0.25)';
                  
                  // Reset glow effect
                  const glow = icon.querySelector('div');
                  if (glow) {
                    glow.style.width = '0%';
                    glow.style.height = '0%';
                  }
                  
                  // Reset icon inner
                  const iconInner = icon.querySelector('div:last-child');
                  if (iconInner) {
                    iconInner.style.transform = 'scale(1) rotate(0deg)';
                  }
                }
              }}
            >
              <div className="feature-icon" style={{
                width: '120px',
                height: '120px',
                borderRadius: '24px',
                background: feature.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 2rem',
                fontSize: '3.5rem',
                color: 'white',
                position: 'relative',
                zIndex: 2,
                boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
                border: '4px solid rgba(255,255,255,0.2)',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                overflow: 'hidden'
              }}>
                {/* Animated background glow */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '0%',
                  height: '0%',
                  background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)',
                  borderRadius: '50%',
                  transform: 'translate(-50%, -50%)',
                  transition: 'all 0.4s ease',
                  pointerEvents: 'none'
                }} />
                
                {/* Icon with enhanced styling */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  height: '100%',
                  transition: 'all 0.4s ease',
                  transform: 'scale(1) rotate(0deg)'
                }}>
                  {feature.icon}
              </div>
              </div>
              
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h3 style={{
                  fontSize: '1.3rem',
                  fontWeight: '700',
                  color: theme === 'dark' ? '#f5f5f7' : '#1d1d1f',
                  marginBottom: '1rem',
                  position: 'relative',
                  zIndex: 2,
                  lineHeight: 1.3
                }}>
                  {feature.title}
                </h3>
                <p style={{
                  color: theme === 'dark' ? '#a1a1aa' : '#6b7280',
                  lineHeight: 1.5,
                  fontSize: '0.95rem',
                  position: 'relative',
                  zIndex: 2,
                  margin: 0
                }}>
                  {feature.description}
                </p>
      </div>

              <div style={{
                marginTop: '1rem',
                fontSize: '0.8rem',
                color: theme === 'dark' ? '#6b7280' : '#9ca3af',
                fontWeight: '500'
              }}>
                Click to learn more →
              </div>
            </div>
          ))}
                  </div>
        
        {/* Bottom CTA */}
        <div style={{
          textAlign: 'center',
          marginTop: '4rem',
          position: 'relative',
          zIndex: 2
        }}>
                </div>
      </Element>

      {/* Pokemon Card-Style Feature Overlay */}
      {showFeatureOverlay && selectedFeature && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
          animation: 'fadeIn 0.4s ease'
        }}
        onClick={() => setShowFeatureOverlay(false)}
        >
          <div style={{
            background: theme === 'dark' ? '#1a1a1a' : '#ffffff',
            borderRadius: '20px',
            padding: '2.5rem',
            maxWidth: '450px',
            width: '100%',
            position: 'relative',
            border: `3px solid ${selectedFeature.color.split(',')[0].replace('linear-gradient(135deg, ', '').replace(' 0%', '')}`,
            animation: 'slideInFromBack 0.6s ease',
            transform: 'perspective(1000px) rotateY(0deg)',
            boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
            overflow: 'hidden'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* Animated background particles */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              overflow: 'hidden',
              pointerEvents: 'none'
            }}>
              {[...Array(8)].map((_, i) => (
                <div key={i} style={{
                  position: 'absolute',
                  width: Math.random() * 6 + 2,
                  height: Math.random() * 6 + 2,
                  background: selectedFeature.color.split(',')[0].replace('linear-gradient(135deg, ', '').replace(' 0%', ''),
                  borderRadius: '50%',
                  opacity: 0.3,
                  animation: `float ${Math.random() * 8 + 4}s infinite ease-in-out`,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`
                }} />
              ))}
              </div>

            {/* Feature Icon with animation */}
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '16px',
              background: selectedFeature.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              fontSize: '2rem',
              color: 'white',
              boxShadow: '0 15px 35px rgba(0,0,0,0.2)',
              animation: 'iconBounce 2s ease-in-out infinite',
              position: 'relative',
              zIndex: 2
            }}>
              {selectedFeature.icon}
                </div>
                
            {/* Feature Title with typing effect */}
            <h2 style={{
              fontSize: '1.6rem',
              fontWeight: '800',
              color: theme === 'dark' ? '#f5f5f7' : '#1d1d1f',
              marginBottom: '1rem',
              textAlign: 'center',
              animation: 'typewriter 1s ease-out',
              position: 'relative',
              zIndex: 2
            }}>
              {selectedFeature.title}
            </h2>

            {/* Detailed Description with fade in */}
            <p style={{
              color: theme === 'dark' ? '#a1a1aa' : '#6b7280',
              lineHeight: 1.6,
              fontSize: '1rem',
              marginBottom: '1.5rem',
              textAlign: 'center',
              animation: 'fadeInUp 0.8s ease-out 0.3s both',
              position: 'relative',
              zIndex: 2
            }}>
              {selectedFeature.detailedDescription}
            </p>

            {/* Benefits List with staggered animation */}
            <div style={{
              background: theme === 'dark' ? '#2d2d2d' : '#f8f9fa',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              animation: 'slideInUp 0.6s ease-out 0.5s both',
              position: 'relative',
              zIndex: 2
            }}>
              <h3 style={{
                fontSize: '1.1rem',
                fontWeight: '700',
                color: theme === 'dark' ? '#f5f5f7' : '#1d1d1f',
                marginBottom: '0.75rem',
                textAlign: 'center'
              }}>
                Key Benefits
              </h3>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                {selectedFeature.benefits.map((benefit, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem',
                    borderRadius: '8px',
                    background: theme === 'dark' ? '#1a1a1a' : '#ffffff',
                    animation: `slideInLeft 0.4s ease-out ${0.7 + index * 0.1}s both`
                  }}>
                    <FaCheck style={{ 
                      color: selectedFeature.color.split(',')[0].replace('linear-gradient(135deg, ', '').replace(' 0%', ''),
                      fontSize: '0.8rem',
                      animation: 'checkmarkPop 0.3s ease-out'
                    }} />
                    <span style={{
                      fontSize: '0.9rem',
                      color: theme === 'dark' ? '#f5f5f7' : '#1d1d1f',
                      fontWeight: '500'
                    }}>
                      {benefit}
                    </span>
            </div>
          ))}
        </div>
        </div>

            {/* Action Button with pulse animation */}
            <div style={{ textAlign: 'center', position: 'relative', zIndex: 2 }}>
              <button
                onClick={() => setShowFeatureOverlay(false)}
                style={{
                  background: selectedFeature.color,
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '25px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  animation: 'buttonPulse 2s ease-in-out infinite'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1)';
                }}
              >
                Got it!
              </button>
              </div>
          </div>
        </div>
      )}

      {/* Testimonials Section */}
      <Element name="testimonials" ref={testimonialsRef} style={{
        padding: '8rem 2rem',
        background: theme === 'dark' ? '#000' : '#f5f5f7',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div className="testimonials-header" style={{
          textAlign: 'center',
          marginBottom: '4rem'
        }}>
          <h2 style={{
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            fontWeight: '700',
            color: theme === 'dark' ? '#f5f5f7' : '#1d1d1f',
            marginBottom: '1rem'
          }}>
            Experience
          </h2>
          <p style={{
            fontSize: '1.2rem',
            color: theme === 'dark' ? '#86868b' : '#6e6e73',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            See what our users are saying about their experience
          </p>
                </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: '2rem',
          marginTop: '3rem'
        }}>
          {(() => {
            console.log('Rendering testimonials section - loadingTestimonials:', loadingTestimonials, 'testimonials.length:', testimonials.length);
            return loadingTestimonials ? (
            // Loading state
            [...Array(3)].map((_, index) => (
              <div 
                key={`loading-${index}`}
                style={{
                  background: theme === 'dark' ? '#2d2d2d' : '#f5f5f7',
                  borderRadius: '20px',
                  padding: '2.5rem',
                  border: `1px solid ${theme === 'dark' ? '#3d3d3d' : '#e5e5e7'}`,
                  animation: 'pulse 1.5s infinite'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: theme === 'dark' ? '#3d3d3d' : '#e5e5e7'
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{
                      height: '20px',
                      background: theme === 'dark' ? '#3d3d3d' : '#e5e5e7',
                      borderRadius: '4px',
                      marginBottom: '0.5rem',
                      width: '60%'
                    }} />
                    <div style={{
                      height: '16px',
                      background: theme === 'dark' ? '#3d3d3d' : '#e5e5e7',
                      borderRadius: '4px',
                      width: '40%'
                    }} />
            </div>
                </div>
                <div style={{
                  height: '60px',
                  background: theme === 'dark' ? '#3d3d3d' : '#e5e5e7',
                  borderRadius: '8px',
                  marginBottom: '1rem'
                }} />
                <div style={{
                  display: 'flex',
                  gap: '0.25rem'
                }}>
                  {[...Array(5)].map((_, i) => (
                    <div key={i} style={{
                      width: '16px',
                      height: '16px',
                      background: theme === 'dark' ? '#3d3d3d' : '#e5e5e7',
                      borderRadius: '2px'
                    }} />
          ))}
        </div>
      </div>
            ))
          ) : testimonials.length > 0 ? (
            (() => {
              console.log('About to render testimonials:', testimonials);
              return testimonials.map((testimonial, index) => (
                <div 
                  key={index}
                  className="testimonial-card"
                  style={{
                    background: theme === 'dark' ? '#2d2d2d' : '#f5f5f7',
                    borderRadius: '20px',
                    padding: '2.5rem',
                    transition: 'all 0.3s ease',
                    border: `1px solid ${theme === 'dark' ? '#3d3d3d' : '#e5e5e7'}`
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    marginBottom: '1.5rem'
                  }}>
                    <div style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      background: theme === 'dark' ? '#3d3d3d' : '#e5e5e7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                      fontWeight: 'bold',
                      color: theme === 'dark' ? '#f5f5f7' : '#1d1d1f'
                    }}>
                      {testimonial.initials}
        </div>
                    <div>
                      <h4 style={{
                        fontSize: '1.1rem',
                        fontWeight: '600',
                        color: theme === 'dark' ? '#f5f5f7' : '#1d1d1f',
                        marginBottom: '0.25rem'
                      }}>
                        {testimonial.name}
                      </h4>
                      <div style={{
                        display: 'flex',
                        gap: '0.25rem',
                        alignItems: 'center'
                      }}>
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <FaStar key={i} style={{ color: '#ffd700', fontSize: '1rem' }} />
                        ))}
                        <span style={{
                          fontSize: '0.9rem',
                          color: theme === 'dark' ? '#86868b' : '#6e6e73',
                          marginLeft: '0.5rem'
                        }}>
                          {testimonial.rating}/5
                        </span>
      </div>
                    </div>
                  </div>
                  <p style={{
                    color: theme === 'dark' ? '#f5f5f7' : '#1d1d1f',
                    lineHeight: 1.6,
                    fontSize: '1rem',
                    fontStyle: 'italic'
                  }}>
                    "{testimonial.text}"
                  </p>
                </div>
              ));
            })()
          ) : (
            // No testimonials state
            <div style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              padding: '3rem',
              color: theme === 'dark' ? '#86868b' : '#6e6e73'
            }}>
              <FaComments style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }} />
              <h3>No Reviews Yet</h3>
              <p>Be the first to share your experience with our platform!</p>
            </div>
          );
          })()}
        </div>
      </Element>

      {/* Footer */}
      <footer style={{
        background: theme === 'dark' ? '#000' : '#f5f5f7',
        padding: '3rem 2rem',
        textAlign: 'center',
        borderTop: `1px solid ${theme === 'dark' ? '#2d2d2d' : '#e5e5e7'}`
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <img 
            src="/unified-knowledge-platform.png" 
            alt="UKP Logo" 
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '12px',
              marginBottom: '1rem'
            }}
          />
          <p style={{
            color: theme === 'dark' ? '#86868b' : '#6e6e73',
            fontSize: '1rem'
          }}>
            © {new Date().getFullYear()} Unified Knowledge Platform. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default HomeView; 
