import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FaShieldAlt, FaSearch, FaGavel, FaEdit, FaSave, FaTimes } from 'react-icons/fa'; // Added FaEdit, FaSave, FaTimes

// Helper function to get icon component
const getIconComponent = (iconType) => {
  switch (iconType) {
    case 'FaShieldAlt':
      return <FaShieldAlt />;
    case 'FaGavel':
      return <FaGavel />;
    default:
      return <FaShieldAlt />;
  }
};

// Initial agent data with icon types instead of components
export const KNOWLEDGE_AGENT_CONST = [
  {
    iconType: 'FaShieldAlt',
    name: 'DPDP Compliance',
    description: 'Get insights from the Digital Personal Data Protection Act. Ask about user rights, data fiduciaries, and obligations.',
    buttonText: 'Start Chat',
    agentId: 'DPDP', // Using DPDP as agentId to match backend
    pdfSource: 'DPDP_act.pdf' // Added PDF source
  },
  {
    iconType: 'FaGavel',
    name: 'Parliamentary Rules',
    description: 'Access information on the Rules of Procedure and Conduct of Business in Lok Sabha.',
    buttonText: 'Start Chat',
    agentId: 'Parliament', // Using Parliament as agentId to match backend
    pdfSource: 'Rules_of_Procedures_Lok_Sabha.pdf' // Added PDF source
  }
];

function KnowledgeSourcesView({ onStartChatWithAgent, onAgentDataChange }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [agents, setAgents] = useState(() => {
    // Load agents from localStorage or use default
    const savedAgents = localStorage.getItem('knowledgeAgents');
    if (savedAgents) {
      const parsedSavedAgents = JSON.parse(savedAgents);
      const savedAgentsMap = new Map(parsedSavedAgents.map(agent => [agent.agentId, agent]));

      return KNOWLEDGE_AGENT_CONST.map(defaultAgent => {
        const savedAgent = savedAgentsMap.get(defaultAgent.agentId);
        if (savedAgent) {
          return {
            ...defaultAgent, // Start with default (correct iconType, pdfSource)
            name: savedAgent.name || defaultAgent.name, // Override name if saved
            description: savedAgent.description || defaultAgent.description, // Override description if saved
            // iconType and pdfSource are not overridden from savedAgent
          };
        }
        return defaultAgent;
      });
    }
    return KNOWLEDGE_AGENT_CONST;
  });
  const [editingAgentId, setEditingAgentId] = useState(null); // State to track which agent is being edited
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');

  // Save agents to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('knowledgeAgents', JSON.stringify(agents));
    onAgentDataChange(agents); // Notify parent component of changes
  }, [agents, onAgentDataChange]);

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

  const handleSave = (agentId) => {
    setAgents(prevAgents => {
      const updatedAgents = prevAgents.map(agent =>
        agent.agentId === agentId
          ? { ...agent, name: editedName, description: editedDescription }
          : agent
      );
      return updatedAgents;
    });
    setEditingAgentId(null);
  };

  const handleCancelEdit = () => {
    setEditingAgentId(null);
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
  onAgentDataChange: PropTypes.func.isRequired, // New prop type
};

export default KnowledgeSourcesView; 