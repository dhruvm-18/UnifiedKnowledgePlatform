import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import PropTypes from 'prop-types';
import { FaShieldAlt, FaSearch, FaGavel, FaEdit, FaSave, FaTimes, FaPlus, FaFileAlt, FaRobot, FaBook, FaLightbulb, FaFlask, FaUserTie, FaTrash, FaArrowRight, FaArrowDown, FaArrowUp, FaSync, FaFilePdf, FaFileImage, FaFileCsv, FaFileAudio, FaFileWord, FaEllipsisH } from 'react-icons/fa';
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

function getCapabilitiesFromSources(sources = []) {
  const extToCaps = {
    pdf: ['PDF Analysis', 'Text Summarization', 'Document Search', 'Knowledge Extraction'],
    png: ['Image Analysis', 'OCR Extraction', 'Visual Search', 'Knowledge Extraction'],
    jpg: ['Image Analysis', 'OCR Extraction', 'Visual Search', 'Knowledge Extraction'],
    jpeg: ['Image Analysis', 'OCR Extraction', 'Visual Search', 'Knowledge Extraction'],
    gif: ['Image Analysis', 'OCR Extraction', 'Visual Search', 'Knowledge Extraction'],
    bmp: ['Image Analysis', 'OCR Extraction', 'Visual Search', 'Knowledge Extraction'],
    webp: ['Image Analysis', 'OCR Extraction', 'Visual Search', 'Knowledge Extraction'],
    tiff: ['Image Analysis', 'OCR Extraction', 'Visual Search', 'Knowledge Extraction'],
    mp3: ['Audio Transcription', 'Audio Analysis', 'Speech-to-Text', 'Knowledge Extraction'],
    wav: ['Audio Transcription', 'Audio Analysis', 'Speech-to-Text', 'Knowledge Extraction'],
    m4a: ['Audio Transcription', 'Audio Analysis', 'Speech-to-Text', 'Knowledge Extraction'],
    flac: ['Audio Transcription', 'Audio Analysis', 'Speech-to-Text', 'Knowledge Extraction'],
    ogg: ['Audio Transcription', 'Audio Analysis', 'Speech-to-Text', 'Knowledge Extraction'],
    aac: ['Audio Transcription', 'Audio Analysis', 'Speech-to-Text', 'Knowledge Extraction'],
    csv: ['Data Visualization', 'Data Analysis', 'Table Extraction', 'Knowledge Extraction'],
    xlsx: ['Data Visualization', 'Data Analysis', 'Table Extraction', 'Knowledge Extraction'],
    txt: ['Text Summarization', 'Document Search', 'Knowledge Extraction', 'Text Analysis'],
    doc: ['Word Analysis', 'Text Summarization', 'Document Search', 'Knowledge Extraction'],
    docx: ['Word Analysis', 'Text Summarization', 'Document Search', 'Knowledge Extraction'],
    json: ['Data Extraction', 'Data Visualization', 'Knowledge Extraction', 'Structured Search'],
  };
  const caps = new Set();
  sources.forEach(src => {
    const ext = src.split('.').pop().toLowerCase();
    if (extToCaps[ext]) {
      extToCaps[ext].forEach(cap => caps.add(cap));
    }
  });
  // If no known file types, fallback to a generic capability
  if (caps.size === 0) {
    caps.add('Knowledge Extraction');
  }
  return Array.from(caps);
}

function KnowledgeSourcesView({ onStartChatWithAgent, onAgentDataChange, showNewAgentOverlay, setShowNewAgentOverlay, agentToEdit, setAgentToEdit, overlaySuccessMessage, setOverlaySuccessMessage, isSubmitting, setIsSubmitting, newAgentName, setNewAgentName, newAgentDescription, setNewAgentDescription, newAgentTileLineStartColor, setNewAgentTileLineStartColor, newAgentTileLineEndColor, setNewAgentTileLineEndColor, newAgentIconType, setNewAgentIconType, selectedPdfs, setSelectedPdfs, editedName, setEditedName, editedDescription, setEditedDescription, editedTileLineStartColor, setEditedTileLineStartColor, editedTileLineEndColor, setEditedTileLineEndColor, refreshKey }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [agents, setAgents] = useState([]); // Initialize as empty, will fetch from backend
  const [showNewAgentForm, setShowNewAgentForm] = useState(false);
  const [overlayScrollTop, setOverlayScrollTop] = useState(0); // State to store the scroll position for overlay
  const knowledgeSourcesViewRef = useRef(null); // Ref for the main scrollable div
  const [atBottom, setAtBottom] = useState(false);
  const [showDeleteAgentOverlay, setShowDeleteAgentOverlay] = useState(false);
  const [pendingDeleteAgentId, setPendingDeleteAgentId] = useState(null);
  const [openKebabMenu, setOpenKebabMenu] = useState(null);
  const kebabMenuRef = useRef(null);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [aboutAgent, setAboutAgent] = useState(null);
  const [aboutOverlayPos, setAboutOverlayPos] = useState(null);
  const aboutBtnRefs = useRef({});

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

  const handleDeleteAgentClick = (agentId) => {
    setShowDeleteAgentOverlay(true);
    setPendingDeleteAgentId(agentId);
  };

  const confirmDeleteAgent = async () => {
    if (!pendingDeleteAgentId) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`${BACKEND_BASE}/agents/${pendingDeleteAgentId}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete agent');
        }
      fetchAgents();
      setShowDeleteAgentOverlay(false);
      setPendingDeleteAgentId(null);
      } catch (error) {
        console.error('Error deleting agent:', error);
        alert(`Failed to delete agent: ${error.message}`);
      setShowDeleteAgentOverlay(false);
      setPendingDeleteAgentId(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelDeleteAgent = () => {
    setShowDeleteAgentOverlay(false);
    setPendingDeleteAgentId(null);
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

  // Close kebab menu on outside click
  useEffect(() => {
    if (!openKebabMenu) return;
    function handleClickOutside(event) {
      if (kebabMenuRef.current && !kebabMenuRef.current.contains(event.target)) {
        setOpenKebabMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openKebabMenu]);

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
            {filteredAgents.map((agent) => {
              const capabilities = getCapabilitiesFromSources(agent.pdfSources);
              // Determine main file type from first source
              let mainType = 'Other';
              let mainIcon = <FaFileAlt style={{ color: '#555', marginRight: 4 }} />;
              let badgeColor = '#888';
              const firstSource = agent.pdfSources && agent.pdfSources[0] ? agent.pdfSources[0].toLowerCase() : '';
              if (firstSource.endsWith('.pdf')) {
                mainType = 'PDF';
                mainIcon = <FaFilePdf style={{ color: '#e74c3c', marginRight: 4 }} />;
                badgeColor = '#e74c3c';
              } else if (firstSource.match(/\.(png|jpg|jpeg|gif)$/)) {
                mainType = 'Image';
                mainIcon = <FaFileImage style={{ color: '#3498db', marginRight: 4 }} />;
                badgeColor = '#3498db';
              } else if (firstSource.endsWith('.csv')) {
                mainType = 'CSV';
                mainIcon = <FaFileCsv style={{ color: '#27ae60', marginRight: 4 }} />;
                badgeColor = '#27ae60';
              } else if (firstSource.endsWith('.mp3')) {
                mainType = 'Audio';
                mainIcon = <FaFileAudio style={{ color: '#f39c12', marginRight: 4 }} />;
                badgeColor = '#f39c12';
              } else if (firstSource.endsWith('.doc') || firstSource.endsWith('.docx')) {
                mainType = 'Word';
                mainIcon = <FaFileWord style={{ color: '#2980b9', marginRight: 4 }} />;
                badgeColor = '#2980b9';
              }
              return (
              <div
                key={agent.agentId}
                className="agent-card"
                style={{
                  '--tile-line-gradient-start': agent.tileLineStartColor,
                  '--tile-line-gradient-end': agent.tileLineEndColor,
                  position: 'relative',
                }}
              >
                {/* Kebab menu in upper right corner */}
                <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 3 }}>
                  <button
                    className="kebab-menu-btn"
                    onClick={e => { e.stopPropagation(); setOpenKebabMenu(openKebabMenu === agent.agentId ? null : agent.agentId); }}
                    title="More options"
                    style={{ background: 'none', border: 'none', color: '#95a5a6', fontSize: '1.2em', cursor: 'pointer', padding: 8, borderRadius: '50%' }}
                  >
                    <FaEllipsisH />
                  </button>
                  {openKebabMenu === agent.agentId && (
                    <div
                      ref={kebabMenuRef}
                      style={{
                        position: 'absolute',
                        top: 36,
                        right: 0,
                        background: 'var(--bg-secondary)',
                        borderRadius: 10,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                        minWidth: 120,
                        padding: '0.5rem 0',
                        zIndex: 10,
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <button
                        onClick={e => { e.stopPropagation(); setAgentToEdit(agent); setEditedName(agent.name); setEditedDescription(agent.description); setEditedTileLineStartColor(colorNameToHex(agent.tileLineStartColor) || ''); setEditedTileLineEndColor(colorNameToHex(agent.tileLineEndColor) || ''); setOpenKebabMenu(null); }}
                        style={{ background: 'none', border: 'none', color: 'var(--text-primary)', padding: '0.7rem 1.2rem', textAlign: 'left', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center' }}
                      >
                        <FaEdit style={{ marginRight: 8 }} /> Edit Tile
                      </button>
                      <button
                        ref={el => aboutBtnRefs.current[agent.agentId] = el}
                        onClick={e => {
                          e.stopPropagation();
                          setAgentToEdit(null);
                          setAboutAgent(agent);
                          setShowAboutModal(true);
                          setOpenKebabMenu(null);
                        }}
                        style={{ background: 'none', border: 'none', color: 'var(--text-primary)', padding: '0.7rem 1.2rem', textAlign: 'left', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center' }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: '50%', background: '#3498db', color: 'white', fontWeight: 700, fontSize: 13, marginRight: 8 }}>i</span> About
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleDeleteAgentClick(agent.agentId); setOpenKebabMenu(null); }}
                        style={{ background: 'none', border: 'none', color: 'var(--error-color)', padding: '0.7rem 1.2rem', textAlign: 'left', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center' }}
                      >
                        <FaTrash style={{ marginRight: 8 }} /> Delete
                      </button>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  {/* Minimalist file type icon badge with tooltip */}
                  {firstSource && (
                    <div
                      title={mainType}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#fff',
                        borderRadius: '50%',
                        width: 22,
                        height: 22,
                        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                        marginRight: 2,
                        border: '1px solid #eee',
                        cursor: 'default',
                      }}
                    >
                      {React.cloneElement(mainIcon, { size: 14, style: { verticalAlign: 'middle' } })}
                    </div>
                  )}
                  <div className="agent-tag">Agent</div>
                </div>
                <div className="agent-icon">{getIconComponent(agent.iconType)}</div>
                <h3>{agent.name}</h3>
                <p>{agent.description}</p>
                {/* Capabilities pills */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '8px 0' }}>
                  {capabilities.map((cap, idx) => (
                    <span key={idx} style={{ background: '#f4f4f4', color: '#333', borderRadius: 16, padding: '4px 12px', fontSize: 13, fontWeight: 500, display: 'inline-block' }}>{cap}</span>
                  ))}
                </div>
                <div className="agent-card-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* File count */}
                    <span style={{ color: '#666', fontSize: 13 }}>{agent.pdfSources ? `${agent.pdfSources.length} files trained` : 'No files'}</span>
                    {/* Status */}
                    <span style={{ color: '#4caf50', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 8, height: 8, background: '#4caf50', borderRadius: '50%', display: 'inline-block' }}></span> Active
                    </span>
                  </div>
                  <div className="agent-actions-right">
                    <button
                      className="start-chat-btn"
                      onClick={() => onStartChatWithAgent(agent.agentId)}
                    >
                      <span>Try Out</span>
                      <FaArrowRight className="start-chat-arrow" />
                    </button>
                  </div>
                </div>
              </div>
              );
            })}
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
      {/* Delete Agent Confirmation Overlay */}
      {showDeleteAgentOverlay && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.35)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', borderRadius: 18, boxShadow: '0 4px 32px var(--shadow-color)', padding: '2rem 2.5rem', minWidth: 320, maxWidth: 400, width: '100%' }}>
            <h2 style={{ fontWeight: 700, fontSize: '1.2rem', marginBottom: 18 }}>Delete Agent?</h2>
            <div style={{ marginBottom: 24, textAlign: 'left' }}>Are you sure you want to delete this agent? This action cannot be undone.</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                onClick={cancelDeleteAgent}
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: 'none', borderRadius: 8, padding: '8px 22px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}
              >Cancel</button>
              <button
                onClick={confirmDeleteAgent}
                style={{ background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: 8, padding: '8px 22px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}
                disabled={isSubmitting}
              >Delete</button>
            </div>
          </div>
        </div>
      )}
      {/* About Overlay */}
      {showAboutModal && aboutAgent && (
        <div className="modal-overlay" style={{ zIndex: 4000 }} onClick={() => setShowAboutModal(false)}>
          <div className="modal-content-small" onClick={e => e.stopPropagation()} style={{
            maxWidth: 500,
            minHeight: 200,
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            borderRadius: 16,
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
            padding: '2rem 2.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            border: '1px solid var(--border-color)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-color)', color: 'white', fontWeight: 700, fontSize: 16 }}>i</span>
              <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-primary)' }}>About: {aboutAgent.name}</h2>
            </div>
            <div style={{ marginBottom: 16, textAlign: 'center', width: '100%' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Capabilities:</strong>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12, justifyContent: 'center' }}>
                {getCapabilitiesFromSources(aboutAgent.pdfSources).map((cap, idx) => (
                  <span key={idx} style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', borderRadius: 16, padding: '6px 14px', fontSize: 13, fontWeight: 500, display: 'inline-block', border: '1px solid var(--border-color)' }}>{cap}</span>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 12, textAlign: 'center', width: '100%' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Files Used:</strong>
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', textAlign: 'center', width: '100%', maxHeight: 150, overflowY: 'auto' }}>
              {(aboutAgent.pdfSources || []).map((source, idx) => (
                <li key={idx} style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', color: 'var(--text-secondary)' }}>
                  {source}
                </li>
              ))}
            </ul>
            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <button onClick={() => setShowAboutModal(false)} style={{ background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', transition: 'all 0.2s ease' }}>Close</button>
            </div>
          </div>
        </div>
      )}
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