import React, { useRef, useEffect } from 'react';
import { FaLightbulb, FaCogs, FaQuestionCircle, FaUnlockAlt, FaFileAlt, FaListUl, FaHighlighter, FaCube, FaChevronRight, FaRocket, FaShieldAlt, FaStar, FaUsers, FaVideo, FaQuoteLeft, FaBookOpen, FaComments, FaGithub, FaTwitter, FaLinkedin, FaFolderOpen, FaSave, FaMicrophone, FaRegCommentAlt } from 'react-icons/fa';
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

function HomeView({ userName, handleQuickOption, APP_NAME, onNavigateToKnowledgeSources, onNavigateToMyProjects, onNavigateToChat }) {
  const heroRef = useRef(null);
  const howItWorksRef = useRef(null);
  const coreFeaturesRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    const elementsToObserve = [
      heroRef.current,
      howItWorksRef.current,
      coreFeaturesRef.current,
    ].filter(element => element !== null);
    elementsToObserve.forEach((element) => {
      observer.observe(element);
    });
    return () => {
      elementsToObserve.forEach((element) => {
        observer.unobserve(element);
      });
    };
  }, []);

  // --- Testimonials Data ---
  const testimonials = [
    { name: 'Amit S.', text: 'This platform transformed how we handle compliance and knowledge sharing!', avatar: '/logo192.png' },
    { name: 'Priya R.', text: 'The AI agents are incredibly smart and easy to use. Highly recommended!', avatar: '/logo512.png' },
    { name: 'Rahul D.', text: 'The document highlighting and Q&A features are game changers for our team.', avatar: '/meta.png' },
  ];

  // --- Unique Selling Points ---
  const sellingPoints = [
    { icon: <FaStar />, title: 'Cutting-Edge AI', desc: 'Powered by the latest LLMs and custom agents.' },
    { icon: <FaUsers />, title: 'Team Collaboration', desc: 'Share insights and projects with your team.' },
    { icon: <FaShieldAlt />, title: 'Enterprise Security', desc: 'Your data is encrypted and never leaves your control.' },
    { icon: <FaRocket />, title: 'Lightning Fast', desc: 'Get answers and highlights in seconds, not minutes.' },
  ];

  // --- Quick Start Steps ---
  const quickStart = [
    { icon: <FaBookOpen />, title: '1. Upload', desc: 'Add your documents or PDFs.' },
    { icon: <FaComments />, title: '2. Chat', desc: 'Ask questions or summarize instantly.' },
    { icon: <FaHighlighter />, title: '3. Highlight', desc: 'See key points and sources highlighted.' },
    { icon: <FaCube />, title: '4. Organize', desc: 'Save chats, notes, and projects.' },
  ];

  // Expanded features list
  const ALL_FEATURES = [
    { icon: <FaFileAlt color="inherit" />, title: 'Document Summarization', description: 'Quickly grasp the essence of lengthy documents with concise summaries.' },
    { icon: <FaListUl color="inherit" />, title: 'Key Point Extraction', description: 'Identify and extract the most critical information from the text.' },
    { icon: <FaHighlighter color="inherit" />, title: 'PDF & Section Highlighting', description: 'Highlight answer phrases directly in your PDFs for instant context.' },
    { icon: <FaQuestionCircle color="inherit" />, title: 'Intelligent Q&A', description: 'Get accurate answers to your questions based on the document content.' },
    { icon: <FaCube color="inherit" />, title: 'Knowledge Source Integration', description: 'Connect and utilize multiple knowledge sources for comprehensive insights.' },
    { icon: <FaCogs color="inherit" />, title: 'Customizable Agents', description: 'Tailor the AI agent behavior and responses to specific needs.' },
    { icon: <FaFolderOpen color="inherit" />, title: 'Project Management', description: 'Organize chats, notes, and documents into projects for easy access.' },
    { icon: <FaSave color="inherit" />, title: 'Save & Edit Chats', description: 'Save important chats, edit chat names, and revisit them anytime.' },
    { icon: <FaMicrophone color="inherit" />, title: 'Voice Input & Output', description: 'Speak to the AI and listen to responses for hands-free interaction.' },
    { icon: <FaUsers color="inherit" />, title: 'Multi-Agent Support', description: 'Switch between specialized AI agents for different tasks.' },
    { icon: <FaRocket color="inherit" />, title: 'Fast & Secure', description: 'Lightning-fast responses with enterprise-grade security.' },
  ];

  // --- Carousel State (for testimonials) ---
  const [carouselIdx, setCarouselIdx] = React.useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setCarouselIdx(idx => (idx + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  return (
    <div className="home-view-container crazy-home">
      {/* --- Website Heading --- */}
      <div className="home-header-area">
        <img src="/unified-knowledge-platform.png" alt="App Logo" className="home-app-logo" />
        <h2 className="home-section-title accent-color">Unified Knowledge Platform</h2>
      </div>

      {/* --- Animated Modern Hero Section --- */}
      <div className="crazy-hero-bg">
        <div className="crazy-hero-content" ref={heroRef}>
          <h1 className="crazy-headline">Revolutionize Your Knowledge Experience</h1>
          <p className="crazy-subheadline">AI-powered insights, document mastery, and seamless collaboration—all in one platform.</p>
          <div className="crazy-cta-row">
            <button className="cta-button" onClick={onNavigateToKnowledgeSources}>
              Explore Knowledge Sources <FaChevronRight />
            </button>
            <button className="cta-button" onClick={onNavigateToMyProjects}>
              Explore Projects <FaFolderOpen />
            </button>
            <button className="cta-button" onClick={onNavigateToChat}>
              View Chats <FaRegCommentAlt />
            </button>
          </div>
        </div>
      </div>

      {/* --- Why Choose Us Section --- */}
      <div className="why-choose-section beautiful-card super-why-choose">
        <h2 className="accent-color">Why Choose Us?</h2>
        <div className="super-selling-points">
          {sellingPoints.map((sp, idx) => (
            <div key={idx} className="super-selling-point">
              <div className="super-selling-icon">{sp.icon}</div>
              <div className="super-selling-content">
                <h3>{sp.title}</h3>
                <p>{sp.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="super-why-extra">
          <FaRocket style={{ fontSize: 32, color: 'var(--accent-color)', marginRight: 12 }} />
          <span>Experience the next generation of document intelligence and collaboration.</span>
        </div>
      </div>

      {/* --- How It Works Roadmap Section --- */}
      <div className="how-it-works-section beautiful-card crazy-roadmap" ref={howItWorksRef}>
        <h2 className="accent-color">How it Works</h2>
        <div className="roadmap-container">
          {[
            {
              icon: <FaCube />,
              title: 'Ingest Knowledge',
              desc: 'Easily upload and process your documents and data to build your knowledge base.'
            },
            {
              icon: <FaCogs />,
              title: 'Activate AI Agents',
              desc: 'Select and configure specialized AI agents tailored to different knowledge sources.'
            },
            {
              icon: <FaQuestionCircle />,
              title: 'Ask Contextual Questions',
              desc: 'Interact with the AI assistant and ask questions based on your ingested knowledge.'
            },
            {
              icon: <FaUnlockAlt />,
              title: 'Get Reliable Answers',
              desc: 'Receive accurate, relevant, and quick insights drawn directly from your data.'
            }
          ].map((step, idx, arr) => (
            <div key={idx} className="roadmap-step">
              <div className="roadmap-icon-circle">
                {step.icon}
                <div className="roadmap-step-number">{idx + 1}</div>
              </div>
              <div className="roadmap-step-title">{step.title}</div>
              <div className="roadmap-step-desc">{step.desc}</div>
              {idx < arr.length - 1 && <div className="roadmap-connector"><span className="roadmap-arrow" style={{fontSize: '3.2rem', color: '#6c2eb7', fontWeight: 900, filter: 'drop-shadow(0 0 6px #a084e8)'}}>→</span></div>}
            </div>
          ))}
        </div>
      </div>

      {/* --- Quick Start Guide --- */}
      <div className="quick-start-section beautiful-card super-quick-start">
        <h2 className="accent-color">Quick Start Guide</h2>
        <div className="super-quick-start-steps">
          {quickStart.map((step, idx) => (
            <div key={idx} className="super-quick-step">
              <div className="super-quick-icon">{step.icon}</div>
              <div className="super-quick-content">
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
              {idx < quickStart.length - 1 && <div className="super-quick-arrow">→</div>}
            </div>
          ))}
        </div>
        <div className="super-quick-note">
        <FaLightbulb style={{ fontSize: 24, color: 'var(--accent-color)', marginRight: 12 }} />
          <span>Tip: You can start chatting as soon as your first document is uploaded!</span>
        </div>
      </div>

      {/* --- Expanded Features Section --- */}
      <div className="core-features-section beautiful-card" ref={coreFeaturesRef}>
        <h2 className="accent-color">Platform Capabilities</h2>
        <div className="features-grid expanded-features-grid">
          {ALL_FEATURES.map((feature, index) => (
            <div key={index} className="feature-item crazy-feature-card">
              <div className="roadmap-icon-circle">
                {feature.icon}
                <div className="roadmap-step-number">{index + 1}</div>
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* --- Instructional Video Section --- */}
      <div className="instruction-video-section beautiful-card" style={{ margin: '2.5rem auto', maxWidth: 900, borderRadius: 24, boxShadow: '0 4px 32px #0001', padding: '2.5rem 2rem', background: 'var(--bg-secondary)' }}>
        <h2 className="accent-color" style={{ marginBottom: 18, fontWeight: 700, fontSize: '1.5rem', letterSpacing: 0.5 }}><FaVideo style={{ marginRight: 8, color: 'var(--accent-color)' }} /> Watch How It Works</h2>
        <div className="video-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320, background: '#f3f4f6', borderRadius: 16, boxShadow: '0 2px 12px #0001' }}>
          {/* Placeholder for future video */}
          {/* eslint-disable-next-line jsx-a11y/iframe-has-title */}
          <iframe
            width="560"
            height="315"
            src=""
            style={{ display: 'none' }}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
          <div style={{ textAlign: 'center', color: '#888', fontSize: '1.15rem', width: '100%' }}>
            <img src="/Homepage.png" alt="Instructional Video Coming Soon" style={{ maxWidth: 320, margin: '0 auto 18px auto', opacity: 0.7, borderRadius: 12 }} />
            <div>Instructional video coming soon!</div>
          </div>
        </div>
        <p className="video-caption" style={{ color: '#888', marginTop: 16, fontSize: '1.05rem' }}>See a step-by-step walkthrough of all features and best practices (coming soon).</p>
      </div>

      {/* --- Footer --- */}
      <footer className="crazy-footer">
        <div className="footer-copy">&copy; {new Date().getFullYear()} Unified Knowledge Platform. All rights reserved.</div>
      </footer>
    </div>
  );
}

HomeView.propTypes = {
  onNavigateToKnowledgeSources: PropTypes.func.isRequired,
  onNavigateToMyProjects: PropTypes.func.isRequired,
  onNavigateToChat: PropTypes.func.isRequired,
};

export default HomeView; 