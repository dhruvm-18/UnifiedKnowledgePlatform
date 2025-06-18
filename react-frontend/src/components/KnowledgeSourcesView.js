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
  const [selectedPdfs, setSelectedPdfs] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [newAgentIconType, setNewAgentIconType] = useState('FaFileAlt'); // New state for icon type
  const [showNewAgentOverlay, setShowNewAgentOverlay] = useState(false);
  const [overlaySuccessMessage, setOverlaySuccessMessage] = useState('');
  const [agentToEdit, setAgentToEdit] = useState(null); // New state to hold the agent being edited
  const [overlayScrollTop, setOverlayScrollTop] = useState(0); // State to store the scroll position for overlay
  const knowledgeSourcesViewRef = useRef(null); // Ref for the main scrollable div
  const [newAgentTileLineStartColor, setNewAgentTileLineStartColor] = useState('');
  const [newAgentTileLineEndColor, setNewAgentTileLineEndColor] = useState('');
  const [editedTileLineStartColor, setEditedTileLineStartColor] = useState(''); // New state for edit form
  const [editedTileLineEndColor, setEditedTileLineEndColor] = useState('');     // New state for edit form

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
    setEditedTileLineStartColor(agent.tileLineStartColor || ''); // Initialize with existing color or empty string
    setEditedTileLineEndColor(agent.tileLineEndColor || '');     // Initialize with existing color or empty string
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
        tileLineStartColor: editedTileLineStartColor,
        tileLineEndColor: editedTileLineEndColor,
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

  const handlePdfChange = (e) => {
    const files = Array.from(e.target.files).filter(file => file.type === 'application/pdf');
    if (files.length > 0) {
      setSelectedPdfs(files);
    } else {
      alert('Please select PDF files');
    }
  };

  const handleNewAgentSubmit = async (e) => {
    e.preventDefault();
    if (!newAgentName || !newAgentDescription || selectedPdfs.length === 0) {
      alert('Please fill in all fields and select at least one PDF file');
      return;
    }

    setIsSubmitting(true);
    setOverlaySuccessMessage('');

    try {
      // Create FormData and append files
      const formData = new FormData();
      selectedPdfs.forEach((file) => {
        formData.append('files', file);
      });

      // 1. Upload PDFs to backend
      const uploadResponse = await fetch(`${BACKEND_BASE}/upload-pdf`, {
        method: 'POST',
        body: formData,
        // Remove Content-Type header to let the browser set it with the boundary
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Failed to upload PDFs');
      }

      const uploadData = await uploadResponse.json();
      console.log('Upload response:', uploadData); // Debug log

      if (!uploadData.success) {
        throw new Error(uploadData.error || 'Failed to upload PDFs');
      }

      const pdfFilenames = uploadData.filenames; // Expecting an array
      console.log('PDF filenames:', pdfFilenames); // Debug log

      // 2. Create new agent via backend API
      const newAgentPayload = {
        iconType: newAgentIconType,
        name: newAgentName,
        description: newAgentDescription,
        buttonText: 'Start Chat',
        agentId: `agent_${Date.now()}`,
        pdfSources: pdfFilenames,
        tileLineStartColor: newAgentTileLineStartColor,
        tileLineEndColor: newAgentTileLineEndColor,
      };

      console.log('Creating agent with payload:', newAgentPayload); // Debug log

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
      console.log('Agent creation response:', agentData); // Debug log
      
      if (agentData.success) {
        // Call fetchAgents to update the list
        await fetchAgents();
        setOverlaySuccessMessage('Agent created successfully! ✓');
        // Reset form after successful creation
        setNewAgentName('');
        setNewAgentDescription('');
        setSelectedPdfs([]);
        setNewAgentTileLineStartColor('');
        setNewAgentTileLineEndColor('');
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
                  {agent.pdfSources.map((source, index) => (
                    <li key={index}>{source}</li>
                  ))}
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
              <input
                type="text"
                placeholder="Tile Line Start Color (e.g., #3498db or red)"
                value={newAgentTileLineStartColor}
                onChange={(e) => setNewAgentTileLineStartColor(e.target.value)}
                disabled={isSubmitting}
              />
              <input
                type="text"
                placeholder="Tile Line End Color (e.g., #8e44ad or blue)"
                value={newAgentTileLineEndColor}
                onChange={(e) => setNewAgentTileLineEndColor(e.target.value)}
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
                  multiple
                  onChange={handlePdfChange}
                  id="pdf-upload"
                  className="pdf-upload-input-hidden"
                  required
                  disabled={isSubmitting}
                />
                <label htmlFor="pdf-upload" className="file-upload-button">
                  <FaFileAlt /> Choose Files
                </label>
                <span className="file-chosen-text">
                  {selectedPdfs.length > 0
                    ? selectedPdfs.map(f => f.name).join(', ')
                    : 'No files chosen'}
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
              <input
                type="text"
                placeholder="Tile Line Start Color (e.g., #3498db or red)"
                value={editedTileLineStartColor}
                onChange={(e) => setEditedTileLineStartColor(e.target.value)}
                disabled={isSubmitting}
              />
              <input
                type="text"
                placeholder="Tile Line End Color (e.g., #8e44ad or blue)"
                value={editedTileLineEndColor}
                onChange={(e) => setEditedTileLineEndColor(e.target.value)}
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