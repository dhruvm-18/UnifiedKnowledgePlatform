import React from 'react';

export default function Modal({ children, onClose, size }) {
  let modalStyle = {
    width: 480,
    maxWidth: '95vw',
    minWidth: 580,
    background: 'var(--bg-primary)',
    borderRadius: 16,
    boxShadow: '0 8px 32px var(--shadow-color)',
    padding: 0,
    position: 'relative',
    border: '1px solid var(--border-color)',
  };
  if (size === 'large') {
    modalStyle.width = 1000;
    modalStyle.maxWidth = '98vw';
  }
  if (size === 'preview') {
    modalStyle.width = 1200;
    modalStyle.maxWidth = '100vw';
    modalStyle.minWidth = 600;
    modalStyle.height = '95vh';
    modalStyle.overflow = 'auto';
  }
  return (
    <div
      className="modal-overlay"
      onClick={onClose}
    >
      <div
        className={size === 'large' ? 'modal-content-large' : 'modal-content'}
        onClick={e => e.stopPropagation()}
        style={modalStyle}
      >
        {/* Removed close (cross) button */}
        {children}
      </div>
    </div>
  );
} 