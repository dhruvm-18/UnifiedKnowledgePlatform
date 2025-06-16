import React, { useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { FaShieldAlt, FaSearch, FaGavel, FaEdit, FaSave, FaTimes, FaPlus, FaFileAlt, FaRobot, FaBook, FaLightbulb, FaFlask, FaUserTie, FaTrash, FaArrowRight } from 'react-icons/fa';
import { getIconComponent } from '../utils/iconUtils';
import '../styles/KnowledgeSourcesView.css';
import { Element, scroller } from 'react-scroll';

// KNOWLEDGE_AGENT_CONST will now serve as a default for _initial_ setup if backend is empty,
// but agents will be fetched from backend for actual state.
export const KNOWLEDGE_AGENT_CONST = []; // Will be populated by backend

function KnowledgeSourcesView({ onStartChatWithAgent, onAgentDataChange }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [agents, setAgents] = useState([]); // Initialize as empty, will fetch from backend
  const [editingAgentId, setEditingAgentId] = useState(null);
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [showNewAgentForm, setShowNewAgentForm] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentDescription, setNewAgentDescription] = useState('');
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [newAgentIconType, setNewAgentIconType] = useState('FaFileAlt'); // New state for icon type
  const [showNewAgentOverlay, setShowNewAgentOverlay] = useState(false);
  const [overlaySuccessMessage, setOverlaySuccessMessage] = useState('');
  const [agentToEdit, setAgentToEdit] = useState(null); // New state to hold the agent being edited
  const [overlayScrollTop, setOverlayScrollTop] = useState(0); // State to store the scroll position for overlay
  const knowledgeSourcesViewRef = useRef(null); // Ref for the main scrollable div

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
      // Fallback to KNOWLEDGE_AGENT_CONST if fetching fails (for development convenience)
      // In a production app, you might want a more robust error display
      setAgents([]); // Or KNOWLEDGE_AGENT_CONST if you want hardcoded defaults
      onAgentDataChange([]);
    }
  }, [BACKEND_BASE, onAgentDataChange]);

  // Fetch agents on component mount
  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

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
    // Capture current scroll position of the knowledge-sources-view
    if (knowledgeSourcesViewRef.current) {
      setOverlayScrollTop(knowledgeSourcesViewRef.current.scrollTop);
    }
  };

  const handleSaveEdit = async () => {
    if (!agentToEdit) return; // Should not happen if button is correctly rendered

    setIsSubmitting(true);
    try {
      const updatedAgent = {
        agentId: agentToEdit.agentId,
        name: editedName,
        description: editedDescription,
      };

      const response = await fetch(`${BACKEND_BASE}/agents/${agentToEdit.agentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedAgent),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update agent');
      }
      fetchAgents(); // Re-fetch agents to update state with latest data from backend
      setAgentToEdit(null); // Close the edit overlay
    } catch (error) {
      console.error('Error saving agent:', error);
      alert(`Failed to save agent: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setAgentToEdit(null); // Close the edit overlay
  };

  const handleNewAgentSubmit = async (e) => {
    e.preventDefault();
    if (!newAgentName || !newAgentDescription || !selectedPdf) {
      alert('Please fill in all fields and select a PDF file');
      return;
    }

    setIsSubmitting(true);
    setOverlaySuccessMessage('');

    try {
      const formData = new FormData();
      formData.append('file', selectedPdf);

      // 1. Upload PDF to backend
      const uploadResponse = await fetch(`${BACKEND_BASE}/upload-pdf`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Failed to upload PDF');
      }
      const uploadData = await uploadResponse.json();
      
      if (!uploadData.success) {
        throw new Error(uploadData.error || 'Failed to upload PDF');
      }
      
      const pdfFilename = uploadData.filename;

      // 2. Create new agent via backend API
      const newAgentPayload = {
        iconType: newAgentIconType,
        name: newAgentName,
        description: newAgentDescription,
        buttonText: 'Start Chat',
        agentId: `agent_${Date.now()}`,
        pdfSource: pdfFilename,
      };

      const agentResponse = await fetch(`${BACKEND_BASE}/agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newAgentPayload),
      });

      if (!agentResponse.ok) {
        const errorData = await agentResponse.json();
        throw new Error(errorData.error || 'Failed to create new agent');
      }

      const agentData = await agentResponse.json();
      
      if (agentData.success) {
        fetchAgents();
        setOverlaySuccessMessage('Agent created successfully! ✓');
        // Reset form after successful creation
        setNewAgentName('');
        setNewAgentDescription('');
        setSelectedPdf(null);
        // Close overlay after a delay
        setTimeout(() => {
          setShowNewAgentOverlay(false);
          setOverlaySuccessMessage('');
        }, 2000);
      } else {
        throw new Error(agentData.error || 'Failed to create agent');
      }
    } catch (error) {
      console.error('Error creating new agent:', error);
      alert(`Failed to create new agent: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePdfChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedPdf(file);
    } else {
      alert('Please select a PDF file');
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

  return (
    <div className="knowledge-sources-view" ref={knowledgeSourcesViewRef}>
      <div className="knowledge-sources-header">
        <h1>Knowledge Sources</h1>
        <button 
          className="new-agent-header-btn"
          onClick={() => setShowNewAgentOverlay(true)}
        >
          <FaPlus /> New Agent
        </button>
      </div>
      <p className="knowledge-sources-description">
        Browse available knowledge sources, each representing an AI Agent trained on specific datasets.
        Click 'Start Chat' to begin a conversation with an agent and explore its knowledge.
      </p>

      {successMessage && (
        <div className="success-message">
          {successMessage}
        </div>
      )}

      {/* Search Input with Icon */}
      <div className="search-bar">
        <div className="search-input-container">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Agent Cards Grid - Add class when searching */}
      <Element name="knowledge-sources-scroll-container" className={`agent-grid ${isSearching ? 'agent-cards-grid--searching' : ''}`}>
        {filteredAgents.map((agent) => (
          <div key={agent.agentId} className="agent-card">
            <div className="agent-icon">{getIconComponent(agent.iconType)}</div>
            <h3>{agent.name}</h3>
            <p>{agent.description}</p>
            {agent.pdfSource && <p className="source-info">Source: {agent.pdfSource}</p>}
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

      {/* New Agent Creation Overlay */}
      {showNewAgentOverlay && (
        <div className="new-agent-overlay" style={{ top: `20px` }}>
          <div className="new-agent-overlay-content">
            <div className="overlay-header">
              <h2>New Agent</h2>
              <button className="close-overlay-btn" onClick={() => setShowNewAgentOverlay(false)}>
                <FaTimes />
              </button>
            </div>
            {overlaySuccessMessage && (
              <div className="overlay-success-message">
                {overlaySuccessMessage}
              </div>
            )}
            <form onSubmit={handleNewAgentSubmit}>
              <input
                type="text"
                placeholder="Agent Name"
                value={newAgentName}
                onChange={(e) => setNewAgentName(e.target.value)}
                required
                disabled={isSubmitting}
              />
              <textarea
                placeholder="Agent Description"
                value={newAgentDescription}
                onChange={(e) => setNewAgentDescription(e.target.value)}
                required
                disabled={isSubmitting}
              />
              <div className="icon-selection-container">
                <label htmlFor="icon-select" className="icon-select-label">Choose an Icon:</label>
                <select
                  id="icon-select"
                  value={newAgentIconType}
                  onChange={(e) => setNewAgentIconType(e.target.value)}
                  disabled={isSubmitting}
                >
                  <option value="FaFileAlt">Document (Default)</option>
                  <option value="FaShieldAlt">Shield</option>
                  <option value="FaGavel">Gavel</option>
                  <option value="FaRobot">Robot</option>
                  <option value="FaBook">Book</option>
                  <option value="FaLightbulb">Lightbulb</option>
                  <option value="FaFlask">Flask</option>
                  <option value="FaUserTie">User Tie</option>
                </select>
                <div className="selected-icon-preview">
                  {getIconComponent(newAgentIconType, { size: '24px' })} 
                </div>
              </div>
              <div className="pdf-upload-section">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handlePdfChange}
                  id="pdf-upload"
                  className="pdf-upload-input-hidden"
                  required
                  disabled={isSubmitting}
                />
                <label htmlFor="pdf-upload" className="file-upload-button">
                  <FaFileAlt /> Choose File
                </label>
                <span className="file-chosen-text">
                  {selectedPdf ? selectedPdf.name : 'No file chosen'}
                </span>
              </div>
              <div className="overlay-actions">
                <button 
                  type="submit" 
                  className="create-agent-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : <><FaSave /> Create Agent</>}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowNewAgentOverlay(false)} 
                  className="cancel-btn"
                  disabled={isSubmitting}
                >
                  <FaTimes /> Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Agent Overlay */}
      {agentToEdit && (
        <div className="new-agent-overlay" style={{ top: `${overlayScrollTop}px` }}>
          <div className="new-agent-overlay-content">
            <div className="overlay-header">
              <h2>Edit Agent</h2>
              <button className="close-overlay-btn" onClick={handleCancelEdit}>
                <FaTimes />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }}>
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                required
                disabled={isSubmitting}
              />
              <textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                required
                disabled={isSubmitting}
              />
              <div className="overlay-actions">
                <button 
                  type="submit" 
                  className="create-agent-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : <><FaSave /> Save</>}
                </button>
                <button 
                  type="button" 
                  onClick={handleCancelEdit} 
                  className="cancel-btn"
                  disabled={isSubmitting}
                >
                  <FaTimes /> Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

KnowledgeSourcesView.propTypes = {
  onStartChatWithAgent: PropTypes.func.isRequired,
  onAgentDataChange: PropTypes.func.isRequired,
};

export default KnowledgeSourcesView; 