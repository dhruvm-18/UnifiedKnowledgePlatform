import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "../styles/AnimatedScene.css";

const AnimatedScene = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const slides = [
    {
      left: {
        title: "AI Assistant",
        status: "green",
        message: "Welcome to UKP! I'm your intelligent AI assistant. I can help you search through documents, analyze content, and provide instant answers to your questions. How can I assist you today?",
        typing: true
      },
      center: {
        title: "Document Upload",
        status: "purple",
        message: "📄 Upload PDFs, Word docs, Excel files\n📊 Extract text and data automatically\n🔍 Index content for instant search\n✅ Ready for AI analysis",
        typing: false
      },
      right: {
        title: "User",
        status: "cyan",
        message: "I have some research papers and reports. Can you help me find specific information quickly?",
        typing: false
      }
    },
    {
      left: {
        title: "AI Assistant",
        status: "green",
        message: "I found 15 relevant documents matching your query. Here are the key insights and most relevant sections from your research papers.",
        typing: false
      },
      center: {
        title: "Smart Search",
        status: "purple",
        message: "🔍 Semantic search across all documents\n📈 Relevance scoring & ranking\n🎯 Context-aware results\n💡 Intelligent suggestions",
        typing: true
      },
      right: {
        title: "User",
        status: "cyan",
        message: "That's amazing! Can you summarize the main findings and create a report?",
        typing: true
      }
    },
    {
      left: {
        title: "AI Assistant",
        status: "green",
        message: "I've analyzed your documents and created a comprehensive summary. The report includes key findings, trends, and actionable insights with source citations.",
        typing: false
      },
      center: {
        title: "Report Generation",
        status: "purple",
        message: "📋 Executive Summary\n📊 Data Analysis & Charts\n📝 Key Findings & Insights\n📤 Export to PDF/Word",
        typing: false
      },
      right: {
        title: "User",
        status: "cyan",
        message: "Perfect! Can you also highlight the most important sections for my presentation?",
        typing: false
      }
    },
    {
      left: {
        title: "AI Assistant",
        status: "green",
        message: "I've highlighted the key sections and created presentation-ready slides. You can also collaborate with your team in real-time and share insights instantly.",
        typing: false
      },
      center: {
        title: "Team Collaboration",
        status: "purple",
        message: "👥 Real-time collaboration\n💬 Comment & discuss findings\n📱 Mobile-friendly access\n🔗 Share with stakeholders",
        typing: true
      },
      right: {
        title: "User",
        status: "cyan",
        message: "This is exactly what I needed! UKP has transformed how I work with documents.",
        typing: true
      }
    },
    {
      left: {
        title: "AI Assistant",
        status: "green",
        message: "I can also help you with advanced features like document comparison, trend analysis, and automated workflows. Your knowledge base is growing smarter every day!",
        typing: false
      },
      center: {
        title: "Advanced Features",
        status: "purple",
        message: "🔄 Document comparison\n📈 Trend analysis & predictions\n⚡ Automated workflows\n🤖 AI-powered insights",
        typing: false
      },
      right: {
        title: "User",
        status: "cyan",
        message: "The AI insights are incredibly valuable. This platform is a game-changer!",
        typing: false
      }
    },
    {
      left: {
        title: "AI Assistant",
        status: "green",
        message: "Thank you! UKP is designed to make knowledge management effortless and intelligent. Is there anything specific you'd like to explore or any other documents to analyze?",
        typing: true
      },
      center: {
        title: "Knowledge Hub",
        status: "purple",
        message: "🎯 Centralized knowledge base\n🚀 Instant search & retrieval\n💡 AI-powered insights\n🌐 Access anywhere, anytime",
        typing: false
      },
      right: {
        title: "User",
        status: "cyan",
        message: "I'll definitely be using this daily. The unified approach is brilliant!",
        typing: false
      }
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      
      // Pause for 0.5 seconds in center, then continue
      setTimeout(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
        setIsTransitioning(false);
      }, 500); // 0.5 seconds pause in center
    }, 3500); // Change slide every 3.5 seconds

    return () => clearInterval(interval);
  }, [slides.length]);

  const currentSlideData = slides[currentSlide];

  return (
    <div className="animated-scene">
      
      {/* Logo Section - Right Side */}
      <div className="logo-section">
        <img 
          src="/unified-knowledge-platform.png" 
          alt="UKP Logo" 
          className="logo-image animate-logo-subtle"
        />
      </div>

      {/* Slideshow Container */}
      <div className="slideshow-container">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{
              type: "tween",
              duration: 1.2,
              ease: "easeInOut"
            }}
            className="slides-container"
          >
            
            {/* Left Chat Window */}
            <div className="chat-window">
              <div className="slide-card animate-chat-float">
                <div className="slide-header">
                  <div className="header-content">
                    <div className={`status-indicator ${currentSlideData.left.status}`}></div>
                    <span className="slide-title">{currentSlideData.left.title}</span>
                  </div>
                </div>
                <div className="slide-content">
                  {currentSlideData.left.typing && (
                    <div className="typing-indicator">
                      <div className="typing-dot"></div>
                      <div className="typing-dot"></div>
                      <div className="typing-dot"></div>
                    </div>
                  )}
                  <div className="message-left">
                    <p className="slide-message">
                      {currentSlideData.left.message}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Center Chat Window */}
            <div className="chat-window">
              <div className="slide-card animate-chat-float-center">
                <div className="slide-header">
                  <div className="header-content">
                    <div className={`status-indicator ${currentSlideData.center.status}`}></div>
                    <span className="slide-title">{currentSlideData.center.title}</span>
                  </div>
                </div>
                <div className="slide-content">
                  <div className="message-center">
                    <p className="slide-message">
                      {currentSlideData.center.message}
                    </p>
                  </div>
                  {currentSlideData.center.typing && (
                    <div className="typing-indicator">
                      <div className="typing-dot"></div>
                      <div className="typing-dot"></div>
                      <div className="typing-dot"></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Right Chat Window */}
            <div className="chat-window">
              <div className="slide-card animate-chat-float">
                <div className="slide-header">
                  <div className="header-content">
                    <div className={`status-indicator ${currentSlideData.right.status}`}></div>
                    <span className="slide-title">{currentSlideData.right.title}</span>
                  </div>
                </div>
                <div className="slide-content">
                  <div className="message-right">
                    <p className="slide-message">
                      {currentSlideData.right.message}
                    </p>
                  </div>
                  {currentSlideData.right.typing && (
                    <div className="typing-indicator right-typing">
                      <div className="typing-dot"></div>
                      <div className="typing-dot"></div>
                      <div className="typing-dot"></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Slide Indicator */}
      <div className="slide-indicator">
        {slides.map((_, index) => (
          <div
            key={index}
            className={`indicator-dot ${
              index === currentSlide 
                ? 'indicator-active' 
                : 'indicator-inactive'
            }`}
          />
        ))}
      </div>

      {/* Minimalist Scene Title */}
      <div className="scene-title">
        <h2 className="main-title animate-title-subtle">
          Unified Knowledge Platform
        </h2>
        <p className="subtitle animate-subtitle-subtle">
          AI-Powered Knowledge Management
        </p>
      </div>
    </div>
  );
};

export default AnimatedScene; 