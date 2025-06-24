import React from 'react';
import ReactDOM from 'react-dom';

const AgentOverlay = ({ children, onClose }) => {
  return ReactDOM.createPortal(
    <div className="new-agent-overlay" onClick={onClose}>
      <div className="new-agent-overlay-content" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body
  );
};

export default AgentOverlay; 