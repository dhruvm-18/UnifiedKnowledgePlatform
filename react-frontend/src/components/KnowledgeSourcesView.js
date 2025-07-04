import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import PropTypes from 'prop-types';
import { FaShieldAlt, FaSearch, FaGavel, FaEdit, FaSave, FaTimes, FaPlus, FaFileAlt, FaRobot, FaBook, FaLightbulb, FaFlask, FaUserTie, FaTrash, FaArrowRight, FaArrowDown, FaArrowUp, FaSync, FaFilePdf, FaFileImage, FaFileCsv, FaFileAudio, FaFileWord } from 'react-icons/fa';
import { getIconComponent } from '../utils/iconUtils';
import '../styles/KnowledgeSourcesView.css';
import { Element, scroller } from 'react-scroll';

// KNOWLEDGE_AGENT_CONST will now serve as a default for _initial_ setup if backend is empty,
// but agents will be fetched from backend for actual state.
export const KNOWLEDGE_AGENT_CONST = []; // Will be populated by backend

// Add a helper to convert color names to hex codes for color pickers
const colorNameToHex = (color) => {
  const colors = {
    red: '#ff0000',
    gold: '#ffd700',
    violet: '#8f00ff',
    blue: '#3498db',
    black: '#000000',
    green: '#4caf50',
    orange: '#ffa500',
    purple: '#800080',
    yellow: '#ffff00',
    pink: '#ff69b4',
    brown: '#a52a2a',
    gray: '#808080',
    white: '#ffffff',
    // Add more as needed
  };
  if (!color) return '';
  if (color.startsWith('#')) return color;
  const lower = color.toLowerCase();
  return colors[lower] || color;
};

function KnowledgeSourcesView({ onStartChatWithAgent, onAgentDataChange, showNewAgentOverlay, setShowNewAgentOverlay, agentToEdit, setAgentToEdit, overlaySuccessMessage, setOverlaySuccessMessage, isSubmitting, setIsSubmitting, newAgentName, setNewAgentName, newAgentDescription, setNewAgentDescription, newAgentTileLineStartColor, setNewAgentTileLineStartColor, newAgentTileLineEndColor, setNewAgentTileLineEndColor, newAgentIconType, setNewAgentIconType, selectedPdfs, setSelectedPdfs, editedName, setEditedName, editedDescription, setEditedDescription, editedTileLineStartColor, setEditedTileLineStartColor, editedTileLineEndColor, setEditedTileLineEndColor, refreshKey }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [agents, setAgents] = useState([]); // Initialize as empty, will fetch from backend
  const [showNewAgentForm, setShowNewAgentForm] = useState(false);
  const [overlayScrollTop, setOverlayScrollTop] = useState(0); // State to store the scroll position for overlay
  const knowledgeSourcesViewRef = useRef(null); // Ref for the main scrollable div
  const [atBottom, setAtBottom] = useState(false);

  const BACKEND_BASE = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

  // Effect to manage scrolling of the knowledge-sources-view when overlays are active
  useEffect(() => {
    if (knowledgeSourcesViewRef.current) {
      if (showNewAgentOverlay || agentToEdit) {
        knowledgeSourcesViewRef.current.style.overflowY = 'hidden';
      } else {
        knowledgeSourcesViewRef.current.style.overflowY = 'auto';
      }
    }
    // Cleanup function to reset overflow when component unmounts or dependencies change
    return () => {
      if (knowledgeSourcesViewRef.current) {
        knowledgeSourcesViewRef.current.style.overflowY = '';
      }
    };
  }, [showNewAgentOverlay, agentToEdit]);

  // Function to fetch agents from the backend
  const fetchAgents = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`${BACKEND_BASE}/agents`);
      if (!response.ok) {
        throw new Error(`Failed to fetch agents: ${response.statusText}`);
      }
      const data = await response.json();
      setAgents(data);
      onAgentDataChange(data); // Notify parent component (App.js) of the fetched agents
    } catch (error) {
      console.error('Error fetching agents:', error);
      setAgents([]);
      onAgentDataChange([]);
    } finally {
      setIsSubmitting(false);
    }
  }, [BACKEND_BASE, onAgentDataChange, setIsSubmitting]);

  // Fetch agents on component mount
  useEffect(() => {
    fetchAgents();
  }, [fetchAgents, refreshKey]);

  // Poll if agents are empty
  useEffect(() => {
    if (agents.length === 0) {
      const timer = setTimeout(() => {
        fetchAgents();
      }, 1500); // 1.5 seconds
      return () => clearTimeout(timer);
    }
  }, [agents, fetchAgents]);

  const isSearching = searchQuery !== '';

  // Filter agents based on search query
  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEditAgent = (agent) => {
    setAgentToEdit(agent);
    setEditedName(agent.name);
    setEditedDescription(agent.description);
    setEditedTileLineStartColor(colorNameToHex(agent.tileLineStartColor) || '');
    setEditedTileLineEndColor(colorNameToHex(agent.tileLineEndColor) || '');
    // Capture current scroll position of the knowledge-sources-view
    if (knowledgeSourcesViewRef.current) {
      setOverlayScrollTop(knowledgeSourcesViewRef.current.scrollTop);
    }
  };

  const handleDeleteAgent = async (agentId) => {
    if (window.confirm('Are you sure you want to delete this agent?')) {
      try {
        const response = await fetch(`${BACKEND_BASE}/agents/${agentId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete agent');
        }

        fetchAgents(); // Re-fetch agents to update state after deletion
      } catch (error) {
        console.error('Error deleting agent:', error);
        alert(`Failed to delete agent: ${error.message}`);
      }
    }
  };

  useLayoutEffect(() => {
    const handleScroll = () => {
      if (!knowledgeSourcesViewRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = knowledgeSourcesViewRef.current;
      setAtBottom(scrollTop + clientHeight >= scrollHeight - 40);
    };
    const ref = knowledgeSourcesViewRef.current;
    if (ref) {
      ref.scrollTop = 0;
      setAtBottom(false); // Always start with down arrow
      setTimeout(() => {
        if (ref) {
          const { scrollTop, scrollHeight, clientHeight } = ref;
          if (scrollHeight > clientHeight && scrollTop + clientHeight >= scrollHeight - 40) {
            setAtBottom(true);
          } else {
            setAtBottom(false);
          }
        }
      }, 0);
      handleScroll();
      ref.addEventListener('scroll', handleScroll);
    }
    return () => {
      if (ref) ref.removeEventListener('scroll', handleScroll);
    };
  }, [knowledgeSourcesViewRef]);

  const scrollToBottom = () => {
    if (knowledgeSourcesViewRef.current) {
      knowledgeSourcesViewRef.current.scrollTo({ top: knowledgeSourcesViewRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  const scrollToTop = () => {
    if (knowledgeSourcesViewRef.current) {
      knowledgeSourcesViewRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <>
      <div className="knowledge-header-bg">
        <svg className="header-bg-svg" viewBox="0 0 1200 220" preserveAspectRatio="none">
          <rect x="-60" y="10" width="340" height="48" rx="18" opacity="0.18" transform="rotate(-8 110 34)" />
          <rect x="320" y="30" width="420" height="54" rx="18" opacity="0.13" transform="rotate(-4 530 57)" />
          <rect x="800" y="0" width="320" height="44" rx="18" opacity="0.16" transform="rotate(7 960 22)" />
          <rect x="180" y="110" width="320" height="50" rx="18" opacity="0.11" transform="rotate(-6 340 129)" />
          <rect x="600" y="120" width="380" height="50" rx="18" opacity="0.14" transform="rotate(5 790 145)" />
          <rect x="1020" y="80" width="220" height="50" rx="18" opacity="0.10" transform="rotate(-10 1130 98)" />
        </svg>
        <div className="knowledge-sources-header">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            Knowledge Sources
            <button
              onClick={fetchAgents}
              title="Refresh Knowledge Sources"
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'var(--accent-color)',
                color: 'white',
                border: 'none',
                borderRadius: 18,
                padding: '6px 12px',
                fontWeight: 600,
                fontSize: '1rem',
                cursor: 'pointer',
                marginLeft: 12
              }}
            >
              <FaSync className={`${isSubmitting ? 'refresh-spin' : ''} refresh-hover-spin`} />
            </button>
          </h1>
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--accent-color)',
              color: 'white',
              border: 'none',
              borderRadius: 18,
              padding: '10px 22px',
              fontWeight: 600,
              fontSize: '1rem',
              cursor: 'pointer'
            }}
            onClick={() => { setShowNewAgentOverlay(true); setAgentToEdit(null); setNewAgentName(''); setNewAgentDescription(''); }}
          >
            <FaPlus /> New Knowledge Source
          </button>
        </div>
        <p className="knowledge-sources-description">
          Browse available knowledge sources, each representing an AI Agent trained on specific datasets.
          Click 'Start Chat' to begin a conversation with an agent and explore its knowledge.
        </p>
        {/* (Optional) Tabs, badges, etc. can go here */}
      </div>
      <div className="knowledge-sources-view" ref={knowledgeSourcesViewRef} style={{ position: 'relative' }}>
        {/* Search bar and rest of content below */}
        <div className="search-bar">
          <div className="search-input-container" style={{ display: 'flex', alignItems: 'center' }}>
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Loading indicator if agents are not loaded */}
        {agents.length === 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200, width: '100%' }}>
            <div className="loader" style={{ fontSize: 32, color: '#3498db', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div className="spinner" style={{
                width: 48,
                height: 48,
                border: '6px solid #e0e0e0',
                borderTop: '6px solid #3498db',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginBottom: 16
              }} />
              Loading agents...
            </div>
          </div>
        )}

        {/* Agent Cards Grid - Add class when searching */}
        {agents.length > 0 && (
          <Element name="knowledge-sources-scroll-container" className={`agent-grid ${isSearching ? 'agent-cards-grid--searching' : ''}`}>
            {filteredAgents.map((agent) => (
              <div
                key={agent.agentId}
                className="agent-card"
                style={{
                  '--tile-line-gradient-start': agent.tileLineStartColor,
                  '--tile-line-gradient-end': agent.tileLineEndColor,
                }}
              >
                <div className="agent-icon">{getIconComponent(agent.iconType)}</div>
                <h3>{agent.name}</h3>
                <p>{agent.description}</p>
                {agent.pdfSources && agent.pdfSources.length > 0 && (
                  <div className="source-info">
                    <p>Sources:</p>
                    <ul>
                      {agent.pdfSources.map((source, index) => {
                        let icon = <FaFileAlt style={{ color: '#555', marginRight: 6 }} />;
                        if (source.toLowerCase().endsWith('.pdf')) {
                          icon = <FaFilePdf style={{ color: '#e74c3c', marginRight: 6 }} />;
                        } else if (source.toLowerCase().match(/\.(png|jpg|jpeg|gif)$/)) {
                          icon = <FaFileImage style={{ color: '#3498db', marginRight: 6 }} />;
                        } else if (source.toLowerCase().endsWith('.csv')) {
                          icon = <FaFileCsv style={{ color: '#27ae60', marginRight: 6 }} />;
                        } else if (source.toLowerCase().endsWith('.mp3')) {
                          icon = <FaFileAudio style={{ color: '#f39c12', marginRight: 6 }} />;
                        } else if (source.toLowerCase().endsWith('.doc') || source.toLowerCase().endsWith('.docx')) {
                          icon = <FaFileWord style={{ color: '#2980b9', marginRight: 6 }} />;
                        }
                        return (
                          <li key={index} style={{ display: 'flex', alignItems: 'center' }}>
                            {icon}
                            {source}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                <div className="agent-card-footer">
                  <div className="agent-tag">Agent</div>
                  <div className="agent-actions-right">
                    <button
                      className="start-chat-btn"
                      onClick={() => onStartChatWithAgent(agent.agentId)}
                    >
                      <span>{agent.buttonText}</span>
                      <FaArrowRight className="start-chat-arrow" />
                    </button>
                    <div className="tile-actions">
                      <button
                        className="edit-button"
                        onClick={() => handleEditAgent(agent)}
                        title="Edit Agent"
                      >
                        <FaEdit />
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteAgent(agent.agentId)}
                        title="Delete Agent"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {filteredAgents.length === 0 && (
              <p>No agents found matching your search.</p>
            )}
          </Element>
        )}

        {/* Scroll to bottom/up button (always visible, positioned at true bottom right of tab) */}
        <button
          className="scroll-to-bottom-btn"
          onClick={atBottom ? scrollToTop : scrollToBottom}
          style={{
            position: 'sticky',
            float: 'right',
            right: 5,
            bottom: 5,
            zIndex: 50,
            background: 'var(--accent-color)',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: 48,
            height: 48,
            boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            cursor: 'pointer',
            transition: 'background 0.2s, color 0.2s',
          }}
          title={atBottom ? 'Scroll to top' : 'Scroll to bottom'}
        >
          {atBottom ? <FaArrowUp /> : <FaArrowDown />}
        </button>
      </div>
    </>
  );
}

KnowledgeSourcesView.propTypes = {
  onStartChatWithAgent: PropTypes.func.isRequired,
  onAgentDataChange: PropTypes.func.isRequired,
  showNewAgentOverlay: PropTypes.bool.isRequired,
  setShowNewAgentOverlay: PropTypes.func.isRequired,
  agentToEdit: PropTypes.object,
  setAgentToEdit: PropTypes.func.isRequired,
  overlaySuccessMessage: PropTypes.string.isRequired,
  setOverlaySuccessMessage: PropTypes.func.isRequired,
  isSubmitting: PropTypes.bool.isRequired,
  setIsSubmitting: PropTypes.func.isRequired,
  newAgentName: PropTypes.string.isRequired,
  setNewAgentName: PropTypes.func.isRequired,
  newAgentDescription: PropTypes.string.isRequired,
  setNewAgentDescription: PropTypes.func.isRequired,
  newAgentTileLineStartColor: PropTypes.string.isRequired,
  setNewAgentTileLineStartColor: PropTypes.func.isRequired,
  newAgentTileLineEndColor: PropTypes.string.isRequired,
  setNewAgentTileLineEndColor: PropTypes.func.isRequired,
  newAgentIconType: PropTypes.string.isRequired,
  setNewAgentIconType: PropTypes.func.isRequired,
  selectedPdfs: PropTypes.array.isRequired,
  setSelectedPdfs: PropTypes.func.isRequired,
  editedName: PropTypes.string.isRequired,
  setEditedName: PropTypes.func.isRequired,
  editedDescription: PropTypes.string.isRequired,
  setEditedDescription: PropTypes.func.isRequired,
  editedTileLineStartColor: PropTypes.string.isRequired,
  setEditedTileLineStartColor: PropTypes.func.isRequired,
  editedTileLineEndColor: PropTypes.string.isRequired,
  setEditedTileLineEndColor: PropTypes.func.isRequired,
  refreshKey: PropTypes.any.isRequired,
};

export default KnowledgeSourcesView; 