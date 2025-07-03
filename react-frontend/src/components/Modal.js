import React from 'react';

export default function Modal({ children, onClose, size }) {
  return (
    <div className="modal-overlay" onClick={onClose} style={size === 'large' ? { zIndex: 3000 } : {}}>
      <div className={size === 'large' ? 'modal-content-large' : 'modal-content'} onClick={e => e.stopPropagation()}>
        {/* Removed close (cross) button */}
        {children}
      </div>
    </div>
  );
} 