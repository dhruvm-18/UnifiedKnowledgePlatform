import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "../styles/AnimatedScene.css";

const AnimatedScene = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const slides = [
    {
      title: "AI Assistant",
      status: "green",
      message: "Welcome to Unified®! I'm your intelligent AI assistant. I can help you search through documents, analyze content, and provide instant answers to your questions. How can I assist you today?",
      typing: true
    },
    {
      title: "Document Upload & Search",
      status: "purple",
      message: "📄 Upload PDFs, Word docs, Excel files\n📊 Extract text and data automatically\n🔍 Semantic search across all documents\n📈 Relevance scoring & ranking\n🎯 Context-aware results\n💡 Intelligent suggestions",
      typing: false
    },
    {
      title: "Report Generation & Collaboration",
      status: "purple",
      message: "📋 Executive Summary\n📊 Data Analysis & Charts\n📝 Key Findings & Insights\n📤 Export to PDF/Word\n👥 Real-time collaboration\n💬 Comment & discuss findings",
      typing: false
    },
    {
      title: "Advanced Features & Workflows",
      status: "purple",
      message: "⚡ Automated workflows\n🤖 AI-powered insights\n🔄 Document comparison\n📈 Trend analysis & predictions\n🎯 Centralized knowledge base\n🚀 Instant search & retrieval",
      typing: false
    },
    {
      title: "Team Success Story",
      status: "green",
      message: "I've highlighted the key sections and created presentation-ready slides. You can also collaborate with your team in real-time and share insights instantly. Unified® has transformed how you work with documents! The AI insights are incredibly valuable. This platform is a game-changer!",
      typing: false
    },
    {
      title: "Unified Knowledge Platform",
      status: "purple",
      message: "🎯 Centralized knowledge base\n🚀 Instant search & retrieval\n💡 AI-powered insights\n🌐 Access anywhere, anytime\n📊 Smart analytics\n🔒 Secure & compliant\n🤖 Intelligent AI assistant\n📄 Multi-format support",
      typing: false
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      
      // Wait for current slide to exit completely, then change slide
      setTimeout(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
        setIsTransitioning(false);
      }, 1200); // Match the animation duration
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
          alt="Unified® Logo" 
          className="logo-image animate-logo-subtle"
        />
      </div>

      {/* Slideshow Container */}
      <div className="slideshow-container">
        <div className="slides-container">
          
          {/* Single Slide with Exit Animation */}
          <motion.div
            key={currentSlide}
            className="chat-window"
            initial={{ x: "100%" }}
            animate={{ 
              x: isTransitioning ? "-100%" : 0 
            }}
            transition={{
              type: "tween",
              duration: 1.2,
              ease: "easeInOut"
            }}
          >
            <div className="slide-card animate-chat-float">
              <div className="slide-header">
                <div className="header-content">
                  <div className={`status-indicator ${currentSlideData.status}`}></div>
                  <span className="slide-title">{currentSlideData.title}</span>
                </div>
              </div>
              <div className="slide-content">
                {currentSlideData.typing && (
                  <div className="typing-indicator">
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                  </div>
                )}
                <div className="message-content">
                  <p className="slide-message">
                    {currentSlideData.message}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
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