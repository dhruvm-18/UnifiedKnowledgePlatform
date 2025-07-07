import React from 'react';

export default function Modal({ children, onClose, size }) {
  let modalStyle = {
    width: 480,
    maxWidth: '95vw',
    minWidth: 280,
    background: '#fff',
    borderRadius: 10,
    boxShadow: '0 2px 12px #0002',
    padding: 0,
    position: 'relative',
  };
  if (size === 'large') {
    modalStyle.width = 600;
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
      style={{
        zIndex: 3000,
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.18)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
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