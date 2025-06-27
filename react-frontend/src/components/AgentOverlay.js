import React from 'react';
import ReactDOM from 'react-dom';

const AgentOverlay = ({ children, onClose }) => {
  return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

export default AgentOverlay; 