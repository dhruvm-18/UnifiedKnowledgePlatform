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
    // Only require reason for downvotes (3 stars or less)
    if (stars <= 3 && !reason.trim()) {
      setError('Please provide a reason.');
      return;
    }
    onSubmit({ stars, reason, suggestion });
  };

  // Determine heading based on stars
  const heading = stars === 0 ? 'Share your feedback' :
    stars >= 4 ? "We're glad you found this helpful!" :
    "We'd love to improve. What could be better?";

  return (
    <form className="feedback-modal-form modern-feedback-modal" onSubmit={handleSubmit}>
      <h3 className="feedback-modal-heading">{heading}</h3>
      <div className="star-rating-row modern-stars">
        {[1,2,3,4,5].map(n => (
          <span
            key={n}
            className={`star modern-star ${stars >= n ? 'filled' : ''}`}
            onClick={() => handleStarClick(n)}
            tabIndex={0}
            role="button"
            aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
            onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && handleStarClick(n)}
          >&#9733;</span>
        ))}
      </div>
      <label className="feedback-label">
        {stars <= 3 ? 'Why was this answer not helpful?' : 'What did you like most?'}
        {stars <= 3 && <span style={{color:'red'}}>*</span>}
      </label>
      <textarea
        value={reason}
        onChange={e => setReason(e.target.value)}
        required={stars <= 3}
        rows={3}
        placeholder={stars <= 3 ? 'Please explain...' : 'Share what worked well!'}
        className="feedback-textarea"
      />
      <label className="feedback-label">Any suggestions for improvement? <span style={{color:'#aaa',fontWeight:400}}>(optional)</span></label>
      <textarea
        value={suggestion}
        onChange={e => setSuggestion(e.target.value)}
        rows={2}
        placeholder="Your suggestions..."
        className="feedback-textarea"
      />
      {error && <div className="feedback-error" style={{color:'red',marginTop:4}}>{error}</div>}
      <div className="feedback-modal-actions">
        <button type="submit" className="feedback-submit-btn modern-btn">Submit</button>
        <button type="button" className="feedback-cancel-btn modern-btn" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
} 