import React from 'react';
import ReactDOM from 'react-dom';

const AgentOverlay = ({ children, onClose }) => {
  return ReactDOM.createPortal(
    <div className="new-agent-overlay" onClick={onClose}>
      <div
        className="new-agent-overlay-content"
        onClick={e => e.stopPropagation()}
        style={{
          width: '650px',
          maxWidth: '95vw',
          maxHeight: '80vh',
          overflowY: 'auto',
          borderRadius: 18,
          boxShadow: '0 4px 32px #0002',
          background: '#fff',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          padding: '2.5rem 2.5rem 2rem 2.5rem',
        }}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

export default AgentOverlay; 