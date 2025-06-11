import React, { useRef, useEffect } from 'react';
import { FaLightbulb, FaCogs, FaQuestionCircle, FaUnlockAlt, FaFileAlt, FaListUl, FaHighlighter, FaCube, FaChevronRight, FaRocket, FaShieldAlt } from 'react-icons/fa';
import PropTypes from 'prop-types';

// Define core features data
const CORE_FEATURES = [
  {
    icon: <FaFileAlt />,
    title: 'Document Summarization',
    description: 'Quickly grasp the essence of lengthy documents with concise summaries.'
  },
  {
    icon: <FaListUl />,
    title: 'Key Point Extraction',
    description: 'Identify and extract the most critical information from the text.'
  },
  {
    icon: <FaHighlighter />,
    title: 'Section Highlighting',
    description: 'Automatically highlight important sections for easy review.'
  },
  {
    icon: <FaQuestionCircle />,
    title: 'Intelligent Q&A',
    description: 'Get accurate answers to your questions based on the document content.'
  },
  {
    icon: <FaCube />,
    title: 'Knowledge Source Integration',
    description: 'Connect and utilize multiple knowledge sources for comprehensive insights.'
  },
  {
    icon: <FaCogs />,
    title: 'Customizable Agents',
    description: 'Tailor the AI agent behavior and responses to specific needs.'
  },
];

function HomeView({ userName, handleQuickOption, APP_NAME, onNavigateToKnowledgeSources }) {
  const heroRef = useRef(null);
  const howItWorksRef = useRef(null);
  const coreFeaturesRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target); // Stop observing once visible
          }
        });
      },
      { threshold: 0.1 } // Trigger when 10% of the element is visible
    );

    const elementsToObserve = [
      heroRef.current,
      howItWorksRef.current,
      coreFeaturesRef.current,
      // Add refs for any other sections you want to animate
    ].filter(element => element !== null);

    elementsToObserve.forEach((element) => {
      observer.observe(element);
    });

    return () => {
      elementsToObserve.forEach((element) => {
        observer.unobserve(element);
      });
    };
  }, []); // Empty dependency array means this effect runs once on mount

  return (
    <div className="home-view-container">
      {/* Overall Section Title */}
      <div className="home-header-area">
        {/* App Logo */}
        <img src="/unified-knowledge-platform.png" alt="App Logo" className="home-app-logo" />
        <h2 className="home-section-title">Unified Knowledge Platform</h2>
      </div>

      {/* Two-Column Hero Section */}
      <div className="home-hero" ref={heroRef}>
        <div className="home-hero-left">
          {/* Updated Headline and Subtitle */}
          <h1 className="home-headline">Unlock Powerful Insights from Your Data</h1>
          <p className="home-subheadline">
            Seamlessly access and utilize knowledge from your policies, laws, and documents with our intelligent AI Agents.
          </p>

          {/* Updated CTA Button */}
          <div className="home-cta-area">
            <button className="cta-button" onClick={onNavigateToKnowledgeSources}>
              Explore Knowledge Sources <FaChevronRight />
            </button>
            {/* Optional: Add a small descriptive text near CTA if needed */}
            {/* <p className="cta-description">Start a conversation with our specialized AI Agents.</p> */}
          </div>
        </div>
        <div className="home-hero-right">
          {/* Illustration Placeholder - Ensure this is visually appealing and relevant */}
          <img src="/Homepage.png" alt="Homepage Illustration" className="home-illustration" />
        </div>
      </div>

      {/* How It Works Section */}
      <div className="how-it-works-section" ref={howItWorksRef}>
        <h2>How it Works</h2>
        <div className="how-it-works-steps">
          <div className="step">
            <FaCube size={40} />
            <h3>1. Ingest Knowledge</h3>
            <p>Easily upload and process your documents and data to build your knowledge base.</p>
          </div>
          <div className="step">
            <FaCogs size={40} />
            <h3>2. Activate AI Agents</h3>
            <p>Select and configure specialized AI agents tailored to different knowledge sources.</p>
          </div>
          <div className="step">
            <FaQuestionCircle size={40} />
            <h3>3. Ask Contextual Questions</h3>
            <p>Interact with the AI assistant and ask questions based on your ingested knowledge.</p>
          </div>
          <div className="step">
            <FaUnlockAlt size={40} />
            <h3>4. Get Reliable Answers</h3>
            <p>Receive accurate, relevant, and quick insights drawn directly from your data.</p>
          </div>
        </div>
      </div>

      {/* Core Features Section */}
      <div className="core-features-section" ref={coreFeaturesRef}>
        <h2>Core Capabilities</h2>
        <div className="features-grid">
          {CORE_FEATURES.map((feature, index) => (
            <div key={index} className="feature-item">
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Existing Home CTA (can remove if the one in hero is sufficient) */}
      {/* <div className="home-cta">
        <button className="cta-button" onClick={() => alert('Navigate to Knowledge Sources')}>
          Go to Knowledge Sources
        </button>
      </div> */}
    </div>
  );
}

HomeView.propTypes = {
  onNavigateToKnowledgeSources: PropTypes.func.isRequired,
};

export default HomeView; 