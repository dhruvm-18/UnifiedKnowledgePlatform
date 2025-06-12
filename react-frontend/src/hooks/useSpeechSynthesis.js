import { useState, useEffect } from 'react';

export const useSpeechSynthesis = () => {
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState([]);

  useEffect(() => {
    const getVoices = () => {
      setVoices(window.speechSynthesis.getVoices());
    };

    // Fetch voices when they are loaded
    window.speechSynthesis.onvoiceschanged = getVoices;
    getVoices(); // Initial fetch

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const speak = (text, lang = 'en-US', voiceName = null) => {
    if (!window.speechSynthesis || !text) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;

    if (voiceName) {
      const selectedVoice = voices.find(voice => voice.name === voiceName && voice.lang === lang);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    } else {
      // Try to find a default voice for the language if no specific voiceName is provided
      const defaultVoice = voices.find(voice => voice.lang === lang && voice.default);
      if (defaultVoice) {
        utterance.voice = defaultVoice;
      } else {
        // Fallback to any voice for the language if no default is found
        const anyVoice = voices.find(voice => voice.lang === lang);
        if (anyVoice) {
          utterance.voice = anyVoice;
        }
      }
    }

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const cancelSpeak = () => {
    if (window.speechSynthesis && speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }
  };

  return { speaking, speak, cancelSpeak, voices };
}; 