import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { FaShieldAlt, FaSearch, FaGavel, FaEdit, FaSave, FaTimes, FaPlus, FaFileAlt } from 'react-icons/fa';
import { getIconComponent } from '../utils/iconUtils';

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

  const BACKEND_BASE = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

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

  const handleEdit = (agent) => {
    setEditingAgentId(agent.agentId);
    setEditedName(agent.name);
    setEditedDescription(agent.description);
  };

  const handleSave = async (agentId) => {
    try {
      const updatedAgent = {
        agentId: agentId,
        name: editedName,
        description: editedDescription,
      };

      const response = await fetch(`${BACKEND_BASE}/agents/${agentId}`, {
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
      setEditingAgentId(null);
    } catch (error) {
      console.error('Error saving agent:', error);
      alert(`Failed to save agent: ${error.message}`);
    }
  };

  const handleCancelEdit = () => {
    setEditingAgentId(null);
  };

  const handleNewAgentSubmit = async (e) => {
    e.preventDefault();
    if (!newAgentName || !newAgentDescription || !selectedPdf) {
      alert('Please fill in all fields and select a PDF file');
      return;
    }

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
      const pdfFilename = uploadData.filename;

      // 2. Create new agent via backend API
      const newAgentPayload = {
        iconType: 'FaFileAlt', // Default icon for new agents
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

      fetchAgents(); // Re-fetch agents to update state with latest data from backend

      // Reset form
      setShowNewAgentForm(false);
      setNewAgentName('');
      setNewAgentDescription('');
      setSelectedPdf(null);

    } catch (error) {
      console.error('Error creating new agent:', error);
      alert(`Failed to create new agent: ${error.message}`);
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
    <div className="knowledge-sources-container">
      {/* Add the main heading here */}
      <h2>Knowledge Sources</h2>
      <p className="knowledge-sources-description">
        Browse available knowledge sources, each representing an AI Agent trained on specific datasets.
        Click 'Start Chat' to begin a conversation with an agent and explore its knowledge.
      </p>

      {/* Search Input with Icon */}
      <div className="search-panel">
        <FaSearch className="search-icon" /> {/* Add the search icon */}
        <input
          type="text"
          placeholder="Search agents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="agent-search-input"
        />
      </div>

      {/* Agent Cards Grid - Add class when searching */}
      <div className={`agent-cards-grid ${isSearching ? 'agent-cards-grid--searching' : ''}`}>
        {!showNewAgentForm && (
          <div className="agent-card new-agent-card" onClick={() => setShowNewAgentForm(true)}>
            <div className="agent-icon"><FaPlus /></div>
            <h3 className="agent-name">New Knowledge Agent</h3>
            <p className="agent-description">Design and deploy your own AI-powered knowledge agent by uploading custom documents like PDFs.</p>
          </div>
        )}

        {showNewAgentForm && (
          <div className="agent-card new-agent-form">
            <form onSubmit={handleNewAgentSubmit}>
              <input
                type="text"
                placeholder="Agent Name"
                value={newAgentName}
                onChange={(e) => setNewAgentName(e.target.value)}
                className="agent-edit-name-input"
                required
              />
              <textarea
                placeholder="Agent Description"
                value={newAgentDescription}
                onChange={(e) => setNewAgentDescription(e.target.value)}
                className="agent-edit-description-input"
                required
              />
              <div className="pdf-upload-section">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handlePdfChange}
                  className="pdf-upload-input"
                  required
                />
                {selectedPdf && <p className="selected-pdf">Selected: {selectedPdf.name}</p>}
              </div>
              <div className="edit-controls">
                <button type="submit" className="save-button"><FaSave /> Create Agent</button>
                <button type="button" onClick={() => setShowNewAgentForm(false)} className="cancel-button"><FaTimes /> Cancel</button>
              </div>
            </form>
          </div>
        )}

        {filteredAgents.map((agent) => (
          <div key={agent.agentId} className="agent-card">
            <div className="agent-icon">{getIconComponent(agent.iconType)}</div>
            {editingAgentId === agent.agentId ? (
              <div className="agent-edit-fields">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="agent-edit-name-input"
                />
                <textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  className="agent-edit-description-input"
                />
                <div className="edit-controls">
                  <button onClick={() => handleSave(agent.agentId)}><FaSave /> Save</button>
                  <button onClick={handleCancelEdit}><FaTimes /> Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <h3 className="agent-name">{agent.name}</h3>
                <p className="agent-description">{agent.description}</p>
                {agent.pdfSource && <p className="agent-pdf-source">Source: {agent.pdfSource}</p>}
                <div className="agent-tag">Agent</div>
                <div className="agent-card-footer">
                  <button
                    className="agent-start-chat-button"
                    onClick={() => onStartChatWithAgent(agent.agentId)}
                  >
                    {agent.buttonText}
                  </button>
                  <button 
                    className="agent-edit-button"
                    onClick={() => handleEdit(agent)}
                  >
                    <FaEdit />
                  </button>
                  <button 
                    className="agent-delete-button"
                    onClick={() => handleDeleteAgent(agent.agentId)}
                  >
                    <FaTimes />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
        {filteredAgents.length === 0 && (
          <p>No agents found matching your search.</p>
        )}
      </div>
    </div>
  );
}

KnowledgeSourcesView.propTypes = {
  onStartChatWithAgent: PropTypes.func.isRequired,
  onAgentDataChange: PropTypes.func.isRequired,
};

export default KnowledgeSourcesView; 