import React from 'react';
import ReactDOM from 'react-dom';

const AgentOverlay = ({ children, onClose, theme = 'light' }) => {
  return ReactDOM.createPortal(
    <div className={`modal-overlay ${theme}-mode`} onClick={onClose}>
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