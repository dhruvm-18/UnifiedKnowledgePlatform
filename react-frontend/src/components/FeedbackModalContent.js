import React, { useState } from 'react';

export default function FeedbackModalContent({ msg, onSubmit, onCancel }) {
  const [stars, setStars] = useState(0);
  const [reason, setReason] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [error, setError] = useState('');

  const handleStarClick = (n) => setStars(n);
  const handleSubmit = (e) => {
    e.preventDefault();
    if (stars === 0) {
      setError('Please provide a star rating.');
      return;
    }
    if (!reason.trim()) {
      setError('Please provide a reason.');
      return;
    }
    onSubmit({ stars, reason, suggestion });
  };

  return (
    <form className="feedback-modal-form" onSubmit={handleSubmit}>
      <h3>We're sorry this answer wasn't helpful.</h3>
      <div className="star-rating-row">
        {[1,2,3,4,5].map(n => (
          <span key={n} className={`star ${stars >= n ? 'filled' : ''}`} onClick={() => handleStarClick(n)}>&#9733;</span>
        ))}
      </div>
      <label>Why was this answer not helpful? <span style={{color:'red'}}>*</span></label>
      <textarea value={reason} onChange={e => setReason(e.target.value)} required rows={3} placeholder="Please explain..." />
      <label>Any suggestions for improvement? (optional)</label>
      <textarea value={suggestion} onChange={e => setSuggestion(e.target.value)} rows={2} placeholder="Your suggestions..." />
      {error && <div className="feedback-error" style={{color:'red',marginTop:4}}>{error}</div>}
      <div style={{display:'flex',gap:8,marginTop:10}}>
        <button type="submit" className="feedback-submit-btn">Submit</button>
        <button type="button" className="feedback-cancel-btn" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
} 