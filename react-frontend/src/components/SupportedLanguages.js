import React from 'react';
import { FaGlobe } from 'react-icons/fa';

const SUPPORTED_LANGUAGES = [
  { name: 'English', code: 'en-IN' },
  { name: 'Hindi', code: 'hi-IN' },
  { name: 'Tamil', code: 'ta-IN' },
  { name: 'Bengali', code: 'bn-IN' },
  { name: 'Marathi', code: 'mr-IN' },
  { name: 'Gujarati', code: 'gu-IN' },
  { name: 'Punjabi', code: 'pa-IN' },
  { name: 'Telugu', code: 'te-IN' },
  { name: 'Malayalam', code: 'ml-IN' },
  { name: 'Kannada', code: 'kn-IN' },
  { name: 'Odia', code: 'or-IN' },
];

const UPCOMING_LANGUAGES = [];

export default function SupportedLanguages() {
  // Detect dark mode from the document body/class
  const isDarkMode = document.body.classList.contains('dark-mode') || document.documentElement.classList.contains('dark-mode');
  return (
    <div style={{ height: '100%', width: '100%', background: 'var(--bg-primary)', borderRadius: 0, boxShadow: 'none', padding: '2.5rem 2.5rem 2rem 2.5rem', border: 'none', overflowY: 'auto' }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
          <div style={{
            background: isDarkMode ? 'var(--accent-color)' : '#111',
            borderRadius: '50%',
            width: 48,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 18
          }}>
            <FaGlobe size={28} color={isDarkMode ? '#fff' : '#fff'} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: 700, color: 'var(--text-tertiary)' }}>Supported Languages</h2>
            <div style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginTop: 2 }}>Ask questions in any of these languages!</div>
          </div>
        </div>
        <div style={{ marginBottom: 24, color: 'var(--text-secondary)', fontSize: '1.08rem', lineHeight: 1.6 }}>
          Our platform supports seamless multilingual conversations. The system will automatically detect your language and respond in the same language. Enjoy a truly inclusive knowledge experience!
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '18px',
          background: 'var(--bg-secondary)',
          borderRadius: 14,
          padding: '1.5rem 1rem',
          border: '1px solid var(--border-color)',
          marginBottom: 24
        }}>
          {SUPPORTED_LANGUAGES.map(lang => (
            <div key={lang.code} style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--bg-primary)',
              borderRadius: 10,
              boxShadow: '0 1px 4px var(--shadow-color)',
              padding: '0.7rem 1.1rem',
              fontSize: '1.08rem',
              fontWeight: 500,
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              gap: 12
            }}>
              <FaGlobe size={18} color={isDarkMode ? 'var(--accent-color)' : '#111'} style={{ minWidth: 18 }} />
              <span style={{ flex: 1 }}>{lang.name}</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.98rem', fontWeight: 400 }}>({lang.code})</span>
            </div>
          ))}
        </div>
        <div style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: 10, marginTop: 10 }}>Upcoming Support</div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '14px',
          background: 'var(--bg-secondary)',
          borderRadius: 12,
          padding: '1rem 1rem',
          border: '1px dashed var(--border-color)',
          marginBottom: 8
        }}>
          {UPCOMING_LANGUAGES.map(lang => (
            <div key={lang.code} style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--bg-primary)',
              borderRadius: 8,
              boxShadow: '0 1px 2px var(--shadow-color)',
              padding: '0.6rem 1rem',
              fontSize: '1.04rem',
              fontWeight: 500,
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              gap: 10
            }}>
              <FaGlobe size={16} color={isDarkMode ? 'var(--accent-color)' : '#888'} style={{ minWidth: 16 }} />
              <span style={{ flex: 1 }}>{lang.name}</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.96rem', fontWeight: 400 }}>({lang.code})</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 24, color: 'var(--text-secondary)', fontSize: '0.98rem', textAlign: 'center' }}>
          More languages coming soon!
        </div>
        <div style={{ marginTop: 32, marginBottom: 24 }}>
          <h3 style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--text-tertiary)', marginBottom: 10 }}>Speech Features (TTS & STT)</h3>
          <div style={{ color: 'var(--text-secondary)', fontSize: '1.02rem', marginBottom: 10 }}>
            <span>Text-to-Speech (TTS) and Speech-to-Text (STT) are currently supported for <b>English</b> and <b>Hindi</b>. Other languages are coming soon!</span>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.5fr 1fr 1fr',
            gap: '0px',
            background: 'var(--bg-secondary)',
            borderRadius: 12,
            border: '1px solid var(--border-color)',
            overflow: 'hidden',
            marginBottom: 8
          }}>
            <div style={{ fontWeight: 600, padding: '0.7rem 1rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>Language</div>
            <div style={{ fontWeight: 600, padding: '0.7rem 1rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>TTS</div>
            <div style={{ fontWeight: 600, padding: '0.7rem 1rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>STT</div>
            {SUPPORTED_LANGUAGES.map(lang => {
              const isSupported = lang.code === 'en-IN' || lang.code === 'hi-IN';
              return (
                <React.Fragment key={lang.code}>
                  <div style={{ padding: '0.7rem 1rem', color: 'var(--text-primary)', background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)' }}>{lang.name}</div>
                  <div style={{ padding: '0.7rem 1rem', color: isSupported ? '#10B981' : '#b91c1c', background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)', fontWeight: 500 }}>
                    {isSupported ? 'Supported' : 'Coming Soon'}
                  </div>
                  <div style={{ padding: '0.7rem 1rem', color: isSupported ? '#10B981' : '#b91c1c', background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)', fontWeight: 500 }}>
                    {isSupported ? 'Supported' : 'Coming Soon'}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
} 