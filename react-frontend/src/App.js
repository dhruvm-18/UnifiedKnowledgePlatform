import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import './App.css';
import './styles/backgrounds.css';
import './styles/modal.css';
import { FaPlus, FaPaperPlane, FaRegFileAlt, FaPaperclip, FaVolumeUp, FaMicrophone, FaChevronLeft, FaChevronRight, FaTrash, FaRegCommentAlt, FaCube, FaHighlighter, FaSun, FaMoon, FaHome, FaShieldAlt, FaGavel, FaFileAlt, FaListUl, FaCopy, FaFileExport, FaGlobe, FaFeatherAlt, FaRobot, FaBrain, FaTimes, FaSave, FaStop } from 'react-icons/fa';
import HomeView from './components/HomeView';
import KnowledgeSourcesView from './components/KnowledgeSourcesView';
import PDFViewer from './components/PDFViewer';
import remarkGfm from 'remark-gfm';
import DigitalBrainLoader from './components/AnimatedLogo';
import DOMPurify from 'dompurify';
import { getIconComponent } from './utils/iconUtils';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useSpeechSynthesis } from './hooks/useSpeechSynthesis';
import { sarvamTranslate } from './utils/sarvamTranslate';
import SupportedLanguages from './components/SupportedLanguages';
import AgentOverlay from './components/AgentOverlay';

// Helper to save current cursor selection
function saveSelection(element) {
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(element);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    const caretOffset = preCaretRange.toString().length;
    return caretOffset;
  }
  return 0;
}

// Helper to restore cursor selection
function restoreSelection(element, savedCaretOffset) {
  const range = document.createRange();
  const selection = window.getSelection();
  let charCount = 0;

  function traverseNodes(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const nextCharCount = charCount + node.length;
      if (savedCaretOffset <= nextCharCount) {
        range.setStart(node, savedCaretOffset - charCount);
        range.setEnd(node, savedCaretOffset - charCount);
        found = true;
      }
      charCount = nextCharCount;
    } else {
      for (let i = 0; i < node.childNodes.length; i++) {
        traverseNodes(node.childNodes[i]);
      }
    }
  }

  let found = false; // Initialize found here
  traverseNodes(element);

  if (found) {
    selection.removeAllRanges();
    selection.addRange(range);
  } else {
    // If for some reason the offset is beyond the content, place cursor at the end
    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

const BACKEND_BASE = 'http://localhost:5000';
const APP_NAME = 'Unified Knowledge Platform';
const FAVICON_URL = '/unified-knowledge-platform.png';

// Add a translation for the assistant prefix
const ASSISTANT_PREFIX_EN = 'Thanks for asking the question. As per the information available with me.';
const ASSISTANT_PREFIX_HI = 'प्रश्न पूछने के लिए धन्यवाद। मेरे पास उपलब्ध जानकारी के अनुसार,';

// Add quick chat options with associated icons
const QUICK_OPTIONS = [
  { label: 'Summarize the document', value: 'Summarize the document.', icon: <FaFileAlt /> },
  { label: 'Show key points', value: 'Show key points of the document.', icon: <FaListUl /> },
  { label: 'Highlight important sections', value: 'Highlight important sections of the document.', icon: <FaHighlighter /> },
];

function groupSessionsByDate(sessions) {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const isSameDay = (d1, d2) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
  const groups = { Today: [], Yesterday: [], Older: [] };
  sessions.forEach(session => {
    const created = new Date(session.createdAt);
    if (isSameDay(created, today)) groups.Today.push(session);
    else if (isSameDay(created, yesterday)) groups.Yesterday.push(session);
    else groups.Older.push(session);
  });
  return groups;
}

// Helper to clean up section/rule string for display
function formatSectionOrRule(raw) {
  if (!raw) return '';
  // Strip any leading "Section ", "Rule ", or similar, allowing for multiple occurrences
  let stripped = raw.replace(/^((?:Section|Rule)\s*)+/i, '').trim();
  // Replace any remaining underscores with spaces
  let cleaned = stripped.replace(/_/g, ' ');
  return cleaned;
}

function renderAssistantContent(content, handleOpenPdfLink) {
  // Ensure content is a string before processing
  let stringContent = String(content);

  // Add: Replace all raw pdf://... links with markdown links
  const pdfRawLinkPattern = /pdf:\/\/[\w\-.]+\.pdf(?:\/page\/\d+)?(?:#section=[^&\s)]+)?(?:&highlight=[^\s)]+)?/g;
  stringContent = stringContent.replace(pdfRawLinkPattern, (match) => {
    return `${match}`;
  });

  const lines = stringContent.split(/\n/);
  const processedLines = lines.map(line => {
    // Remove any previous source:[]() matches that might have been generated by old logic
    const cleanedLine = line.replace(/source:\[([^\]]+)\]\((.*?)\)/gi, (match, p1) => `**Sources:** ${p1}`);

    // Regex to find parenthesized pdf:// links, capturing the content inside
    // Now also capture highlight param
    const pdfLinkPattern = /\(pdf:\/\/([^)]+)\)/g; // Matches (pdf://...) and captures content inside parentheses

    if (cleanedLine.match(pdfLinkPattern)) {
      // Replace all (pdf://...) links in the line with a markdown link format that ReactMarkdown will process
      const processedLine = cleanedLine.replace(pdfLinkPattern, (fullMatch, contentInsideParentheses) => {
        // contentInsideParentheses will be like "filename.pdf/page/N#section=Section_X&highlight=..."
        // Parse filename, page, section, highlight
        const urlParts = contentInsideParentheses.match(/([^/]+)(?:\/page\/(\d+))?(?:#section=([^&)]*))?(?:&highlight=([^)]*))?/);
        if (urlParts) {
          const [, filename, page, section, highlight] = urlParts;
          let linkUrl = `${BACKEND_BASE}/pdfs/${filename}`;
          let hash = '';
          if (page) hash += `#page=${page}`;
          if (section) hash += `${hash ? '&' : '#'}section=${encodeURIComponent(section)}`;
          if (highlight) hash += `${hash ? '&' : '#'}highlight=${encodeURIComponent(highlight)}`;
          linkUrl += hash;
          // Return a markdown link with a zero-width space as text, our 'a' renderer will populate the text
          return `[](\u200B)(${linkUrl})`; // Using zero-width space
        }
        return fullMatch; // Fallback if regex doesn't parse for some reason
      });
      return processedLine;
    }

    // If no specific pattern matched, return the cleaned line as is
    return cleanedLine;
  });

  // Join the processed lines back into a single string
  const processedContent = processedLines.join('\n');

  // Custom renderers for ReactMarkdown
  const renderers = {
    a: (props) => {
      const { href, children } = props;
      let cleanHref = href;
      // Strip any leading @ from @pdf:// links
      if (cleanHref && cleanHref.startsWith(BACKEND_BASE + '/pdfs/@')) {
        cleanHref = cleanHref.replace('/pdfs/@', '/pdfs/');
      }
      if (cleanHref && cleanHref.includes('@pdf://')) {
        cleanHref = cleanHref.replace('@pdf://', 'pdf://');
      }
      const isPdfLink = cleanHref && cleanHref.startsWith(BACKEND_BASE + '/pdfs/');
      if (isPdfLink) {
        // Parse hash params
        const url = new URL(cleanHref);
        const filename = url.pathname.split('/').pop();
        const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
        const page = hashParams.get('page');
        const section = hashParams.get('section');
        // Friendly label
        let label = '';
        if (page) label += `Page ${page}`;
        if (section) label += (label ? ', ' : '') + `Section ${section.replace(/_/g, ' ')}`;
        if (filename) label += (label ? ' (' : '') + filename + (label ? ')' : '');
        if (!label) label = filename;
        return (
          <a
            href={cleanHref}
            onClick={e => handleOpenPdfLink(e, cleanHref)}
            style={{
              display: 'inline-block',
              padding: '3px 7px',
              margin: '2px',
              backgroundColor: '#495057',
              color: 'white',
              borderRadius: '12px',
              textDecoration: 'none',
              fontSize: '0.8em',
              cursor: 'pointer'
            }}
          >
            {label}
          </a>
        );
      }
      // Check if the href is one of our PDF links
      const isExternal = href && (href.startsWith('http') || href.startsWith('https') || href.startsWith('www.'));

      if (isExternal) {
        // Standard link rendering for other external URLs, opens in new tab
        return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
      } else {
        // Default behavior for other links (e.g., internal anchor links if any)
        return <a href={href}>{children}</a>;
      }
    },
    strong: (props) => {
      const { children } = props;
      return <strong style={{ textDecoration: 'underline' }}>{children}</strong>;
    }
  };

  // Render the entire content using ReactMarkdown with custom renderers
  // Ensure the final content passed to ReactMarkdown is a string
  return <ReactMarkdown remarkPlugins={[remarkGfm]} components={renderers}>{String(processedContent)}</ReactMarkdown>;
}

function App() {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const audioRef = useRef(null); // New ref to hold the audio object
  const [voiceLang, setVoiceLang] = useState('en-US');
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [chatStarted, setChatStarted] = useState(false);
  const [showUserDetailsMenu, setShowUserDetailsMenu] = useState(false);
  const [userName, setUserName] = useState('Dhruv Mendiratta');
  const [userAvatar, setUserAvatar] = useState(null);
  const [editingUserName, setEditingUserName] = useState(false);
  const userNameInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [currentView, setCurrentView] = useState('home');
  const [showWelcome, setShowWelcome] = useState(true);
  const [editingAssistantName, setEditingAssistantName] = useState(false);
  const assistantNameInputRef = useRef(null);

  // State for PDF viewer
  const [viewedPdfUrl, setViewedPdfUrl] = useState(null);
  const [viewedPdfPage, setViewedPdfPage] = useState(null);
  const [viewedHighlightText, setViewedHighlightText] = useState(null);

  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const [filteredAgents, setFilteredAgents] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [activeAgentDetails, setActiveAgentDetails] = useState(null);

  // State for MediaRecorder
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);

  // Initialize currentAgents by fetching from backend on mount
  const [currentAgents, setCurrentAgents] = useState([]);
  const fetchInitialAgents = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_BASE}/agents`);
      if (!response.ok) {
        throw new Error(`Failed to fetch initial agents: ${response.statusText}`);
      }
      const data = await response.json();
      const agentsWithIcons = data.map(agent => ({
        ...agent,
        icon: getIconComponent(agent.iconType),
      }));
      setCurrentAgents(agentsWithIcons);
    } catch (error) {
      console.error('Error fetching initial agents in App.js:', error);
      // Fallback to empty array if backend is not available or errors
      setCurrentAgents([]);
    }
  }, [BACKEND_BASE]);

  // Call fetchInitialAgents on component mount
  useEffect(() => {
    fetchInitialAgents();
  }, [fetchInitialAgents]);

  const [lastMentionedAgent, setLastMentionedAgent] = useState(null); // NEW: sticky agent for general chat

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_BASE}/sessions`);
      if (!res.ok) throw new Error(`Failed to fetch sessions: ${res.status}`);
      const data = await res.json();
      const processedSessions = data.map(session => ({
        ...session,
        title: String(session.title)
      }));
      setSessions(processedSessions);

      const lastSessionId = localStorage.getItem('lastSessionId');

      if (lastSessionId && data.some(session => session.id === lastSessionId)) {
        setCurrentSessionId(lastSessionId);
        const lastActiveAgentId = localStorage.getItem(`sessionAgent_${lastSessionId}`);
        if (lastActiveAgentId && currentAgents.length > 0) {
          const agent = currentAgents.find(a => a.id === lastActiveAgentId);
          setActiveAgentDetails(agent || null);
        } else {
          setActiveAgentDetails(null);
        }
      } else if (data.length > 0) {
        setCurrentSessionId(data[0].id);
        const firstActiveAgentId = localStorage.getItem(`sessionAgent_${data[0].id}`);
        if (firstActiveAgentId && currentAgents.length > 0) {
          const agent = currentAgents.find(a => a.id === firstActiveAgentId);
          setActiveAgentDetails(agent || null);
        } else {
          setActiveAgentDetails(null);
        }
      } else {
        setCurrentSessionId(null);
        setActiveAgentDetails(null);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setSessions([]);
      setCurrentSessionId(null);
      setActiveAgentDetails(null);
    }
  }, [setCurrentSessionId, setSessions, currentAgents]); // Added currentAgents as dependency

  // Initial mount effect
  useEffect(() => {
    document.title = APP_NAME;
    const link = document.querySelector("link[rel~='icon']");
    if (link) link.href = FAVICON_URL;

    const lastSessionId = localStorage.getItem('lastSessionId');
    const lastView = localStorage.getItem('lastView');
    
    if (lastSessionId) {
      setCurrentSessionId(lastSessionId);
      const lastActiveAgentId = localStorage.getItem(`sessionAgent_${lastSessionId}`);
      if (lastActiveAgentId && currentAgents.length > 0) {
        const agent = currentAgents.find(a => a.id === lastActiveAgentId);
        setActiveAgentDetails(agent || null);
      } else {
        setActiveAgentDetails(null);
      }
    }
    if (lastView) {
      setCurrentView(lastView);
    }

    fetchSessions();
  }, [fetchSessions, currentAgents]); // Added currentAgents as dependency

  // Separate theme effect
  useEffect(() => {
    // Save theme to localStorage
    localStorage.setItem('theme', theme);
    
    // Apply theme class using requestAnimationFrame to prevent flickering
    requestAnimationFrame(() => {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark-mode');
      } else {
        document.documentElement.classList.remove('dark-mode');
      }
    });
  }, [theme]); // Only depend on theme

  // Effect to fetch messages when currentSessionId changes
  useEffect(() => {
    if (currentSessionId) {
      fetchMessages(currentSessionId);
      // Save current session ID to localStorage
      localStorage.setItem('lastSessionId', currentSessionId);

      // Always load activeAgentDetails for the current session from localStorage
      const storedAgentId = localStorage.getItem(`sessionAgent_${currentSessionId}`);
      if (storedAgentId && currentAgents.length > 0) {
        const agent = currentAgents.find(a => a.id === storedAgentId);
        setActiveAgentDetails(agent || null);
      } else {
        setActiveAgentDetails(null);
      }
    } else {
      setMessages([]);
      // Remove last session ID from localStorage if no session is active
      localStorage.removeItem('lastSessionId');
      setActiveAgentDetails(null); // No active agent if no session
    }
  }, [currentSessionId, currentView, currentAgents]); // Added currentAgents as dependency

  // Effect to save currentView to localStorage
  useEffect(() => {
    localStorage.setItem('lastView', currentView);
    // If switching to chat view, ensure messages are fetched
    if (currentView === 'chat' && currentSessionId) {
      fetchMessages(currentSessionId);
    }
  }, [currentView, currentSessionId]); // Add currentSessionId as dependency

  useEffect(() => {
    if (chatEndRef.current) {
      const animationFrame = requestAnimationFrame(() => {
        if (chatEndRef.current) {
        chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      });
      return () => cancelAnimationFrame(animationFrame);
    }
  }, [messages, isTyping]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentSessionId]);

  useEffect(() => {
    if (editingUserName && userNameInputRef.current) {
      userNameInputRef.current.focus();
    }
  }, [editingUserName]);

  useEffect(() => {
    const handleDocumentClick = (e) => {
      if (showUserDetailsMenu) {
        const leftSidebar = document.querySelector('.left-sidebar');
        if (leftSidebar && !leftSidebar.contains(e.target)) {
            setShowUserDetailsMenu(false);
        }
      }
    };

    document.addEventListener('click', handleDocumentClick);

    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [showUserDetailsMenu]);

  const fetchMessages = async (sessionId) => {
    try {
      const res = await fetch(`${BACKEND_BASE}/sessions/${sessionId}/messages`);
      if (res.ok) {
        const data = await res.json();
        // Ensure message content is always a string and include agent details for user messages
        const processedMessages = data.map(msg => {
          const processedMsg = {
            ...msg,
            content: String(msg.content),
          };
          // If it's a user message and has agent details, include them
          if (msg.sender === 'user') {
            console.log(`User message raw content (from backend): "${msg.content}"`);
            if (msg.agentId) {
              console.log(`User message agentId from backend: ${msg.agentId}`);
              console.log('Current agentList in fetchMessages:', currentAgents);
              // Find the full agent name and icon from the agentList based on msg.agentId
              const agentDetails = currentAgents.find(agent => agent.id === msg.agentId);
              if (agentDetails) {
                processedMsg.agentName = agentDetails.fullName;
                processedMsg.agentIcon = agentDetails.icon;
                console.log(`Found agentDetails for ${msg.agentId}:`, agentDetails);
              } else {
                console.warn(`Agent details not found in agentList for agentId: ${msg.agentId}`);
              }
            }
          } else if (msg.sender === 'assistant') { // New block for assistant messages
            if (msg.agentId) {
              console.log(`Assistant message agentId from backend: ${msg.agentId}`);
              // Find the full agent name and icon from the agentList based on msg.agentId
              const agentDetails = currentAgents.find(agent => agent.id === msg.agentId);
              if (agentDetails) {
                processedMsg.agentName = agentDetails.fullName;
                processedMsg.agentIcon = agentDetails.icon;
                console.log(`Found agentDetails for assistant ${msg.agentId}:`, agentDetails);
              } else {
                console.warn(`Agent details not found in agentList for assistant agentId: ${msg.agentId}`);
              }
            }
            processedMsg.modelUsed = msg.modelUsed || msg.model_used;
            if (processedMsg.modelUsed) {
              const modelOption = modelOptions.find(m => m.backendName === processedMsg.modelUsed);
              processedMsg.modelDisplayName = modelOption ? modelOption.name : processedMsg.modelUsed;
              processedMsg.modelDisplayIcon = modelOption ? modelOption.icon : null;
            }
          }
          return processedMsg;
        });
        setMessages(processedMessages);
        // Ensure chat is marked as started if there are messages
        if (data.length > 0) {
          setChatStarted(true);
        }
      } else {
        console.error('Failed to fetch messages:', res.status);
        setMessages([]);
        setChatStarted(false);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      setMessages([]);
      setChatStarted(false);
    }
  };

  const startNewSession = async (agentIdToActivate = null) => {
    const res = await fetch(`${BACKEND_BASE}/sessions`, { method: 'POST' });
    const session = await res.json();
    setSessions(sessions => [session, ...sessions]);
    setCurrentSessionId(session.id);
    setMessages([]);
    setChatStarted(false);
    setShowWelcome(true);
    setCurrentView('chat');
    setActiveAgentDetails(null); // Explicitly clear for new general chats
    localStorage.removeItem('isDedicatedChat'); // Ensure General Chat does not have the flag
    return session.id; // Return the session ID
  };

  // When switching sessions/tabs, reset welcome state if no messages
  useEffect(() => {
    if (messages.length === 0) {
      setChatStarted(false);
      setShowWelcome(true);
    }
  }, [currentSessionId]);

  const handleSpeak = async (text) => {
    console.log('handleSpeak called with text:', text);
    setIsSpeaking(true);

    // Stop any currently playing audio before starting a new one
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    try {
      const response = await fetch(`${BACKEND_BASE}/elevenlabs/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: text, voiceLang: voiceLang }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.statusText}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio; // Store the audio object in the ref

      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null; // Clear the ref when audio ends
      };

      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null; // Clear the ref on error
      };

      audio.play();

    } catch (error) {
      console.error('Error in handleSpeak:', error);
      setIsSpeaking(false);
      if (audioRef.current) {
        audioRef.current.pause(); // Ensure audio is stopped on error
        audioRef.current = null;
      }
    }
  };

  const handleStopSpeak = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null; // Clear the ref after stopping
      setIsSpeaking(false);
    }
  };

  const handleQuickOption = async (value) => {
    // Prevent double sending
    if (loading) return;
    
    setLoading(true);
    try {
      // Create a new session first if none exists
      if (!currentSessionId) {
        const sessionRes = await fetch(`${BACKEND_BASE}/sessions`, { method: 'POST' });
        if (!sessionRes.ok) throw new Error(`Failed to create new session: ${sessionRes.status}`);
        const newSession = await sessionRes.json();
        setSessions(sessions => [newSession, ...sessions]);
        setCurrentSessionId(newSession.id);
        
        // Add the message to local state immediately
        const tempMessageId = Date.now();
        const userMessage = { sender: 'user', content: value, id: tempMessageId };
        console.log(`User message content (before adding to state): "${userMessage.content}"`);
        setMessages([userMessage]);
        setChatStarted(true);
        
        // Send the message to the backend
        const modelBackendName = modelOptions.find(m => m.name === selectedModel)?.backendName || 'gemini';
        const res = await fetch(`${BACKEND_BASE}/sessions/${newSession.id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: value, userName: userName, model: modelBackendName })
        });

        if (res.ok) {
          const data = await res.json();
          const assistantContent = data && data.response !== undefined ? String(data.response) : 'Error: Could not retrieve response from backend.';
          const assistantAgentId = data.metadata && data.metadata.agent_id ? data.metadata.agent_id : null;
          setMessages(msgs => [...msgs, { sender: 'assistant', content: assistantContent, agentId: assistantAgentId, modelUsed: data.model_used, modelDisplayName: data.model_used ? modelOptions.find(m => m.backendName === data.model_used).name : null, modelDisplayIcon: data.model_used ? modelOptions.find(m => m.backendName === data.model_used).icon : null }]);
          if (data.session) {
            setSessions(sessions => sessions.map(session =>
              session.id === data.session.id ? data.session : session
            ));
          }
        }
      } else {
        // If session exists, just send the message normally
        handleSend(value);
      }
    } catch (error) {
      console.error('Error in handleQuickOption:', error);
      setMessages(msgs => [...msgs, { sender: 'assistant', content: 'Sorry, there was an error processing your request.' }]);
    } finally {
      setLoading(false);
    }
  };

  const abortControllerRef = useRef(null);

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsTyping(false);
      setLoading(false);
    }
  };

  const handleSend = async (overrideInput) => {
    let userInput = overrideInput !== undefined ? String(overrideInput) : inputRef.current.innerText;
    if (!userInput.trim() || loading) return;

    setInput('');
    if (inputRef.current) {
      inputRef.current.innerHTML = '';
    }

    setLoading(true);
    setIsTyping(true);

    const tempMessageId = Date.now();
    let sessionId = currentSessionId;

    let agentIdToSend = activeAgentDetails?.id || null;
    let agentFullNameToSend = activeAgentDetails?.fullName || null;
    let agentIconToSend = activeAgentDetails?.iconType || null;
    let pdfSourceToSend = activeAgentDetails?.pdfSource || null;
    let contextualAgentAssignment = false;

    const agentMentionRegex = /^@([^\s]+(?:\s[^\s]+)*)\s*(.*)$/;
    const agentMentionMatch = userInput.match(agentMentionRegex);

    const isFirstMessageInNewSession = messages.length === 0 && !currentSessionId;

    if (agentMentionMatch) {
      const mentionedAgentName = agentMentionMatch[1];
      const matchedAgent = currentAgents.find(agent => 
        agent.fullName.toLowerCase() === mentionedAgentName.toLowerCase()
      );
      if (matchedAgent) {
        agentIdToSend = matchedAgent.id;
        agentFullNameToSend = matchedAgent.fullName;
        agentIconToSend = matchedAgent.iconType;
        pdfSourceToSend = matchedAgent.pdfSource;
        setActiveAgentDetails(matchedAgent);
        localStorage.setItem('activeAgentId', matchedAgent.id);
      } else {
        agentIdToSend = null;
        agentFullNameToSend = null;
        agentIconToSend = null;
        pdfSourceToSend = null;
      }
    } else {
      if (isFirstMessageInNewSession) {
        agentIdToSend = null;
        contextualAgentAssignment = true;
      } else if (activeAgentDetails) {
        agentIdToSend = activeAgentDetails.id;
        agentFullNameToSend = activeAgentDetails.fullName;
        agentIconToSend = activeAgentDetails.iconType;
        pdfSourceToSend = activeAgentDetails.pdfSource;
      } else {
        agentIdToSend = null;
        agentFullNameToSend = null;
        agentIconToSend = null;
        pdfSourceToSend = null;
      }
    }

    // Sarvam Translate integration
    let detectedLang = 'en';
    let translatedInput = userInput;
    let translationError = false;
    try {
      const sarvamResult = await sarvamTranslate(userInput, 'en', 'auto');
      detectedLang = sarvamResult.detected_source_language || 'en';
      translatedInput = sarvamResult.translated_text || userInput;
    } catch (err) {
      console.error('Sarvam Translate failed (input)', err);
      translationError = true;
      detectedLang = 'en';
      translatedInput = userInput;
    }

    const userMessage = {
      sender: 'user',
      content: userInput,
      id: tempMessageId,
      agentId: agentIdToSend,
      agentName: agentFullNameToSend,
      agentIcon: agentIconToSend,
      lang: detectedLang
    };

    setMessages(msgs => [...msgs, userMessage]);
    setChatStarted(true);

    try {
      if (!sessionId) {
        const newSessionData = await startNewSession();
        sessionId = newSessionData.id;

        const modelBackendName = modelOptions.find(m => m.name === selectedModel)?.backendName || 'gemini';
        abortControllerRef.current = new AbortController();
        const res = await fetch(`${BACKEND_BASE}/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: translatedInput,
            userName: userName, 
            agentId: agentIdToSend,
            pdfSource: pdfSourceToSend,
            lang: detectedLang,
            model: modelBackendName, // <-- always include model
          }),
          signal: abortControllerRef.current.signal
        });
        abortControllerRef.current = null;

        if (res.ok) {
          const data = await res.json();
          let assistantContent = data && data.response !== undefined ? String(data.response) : 'Error: Could not retrieve response from backend.';
          const assistantAgentId = data.metadata && data.metadata.agent_id ? data.metadata.agent_id : null;

          // Translate back if needed
          if (detectedLang !== 'en') {
            try {
              const backTrans = await sarvamTranslate(assistantContent, detectedLang, 'en');
              assistantContent = backTrans.translated_text || assistantContent;
            } catch (err) {
              console.error('Sarvam Translate failed (output)', err);
              // Fallback: show English
            }
          }

          const responseAgent = currentAgents.find(agent => agent.id === assistantAgentId);
          const assistantAgentFullName = responseAgent ? responseAgent.fullName : null;
          const assistantAgentIcon = responseAgent ? responseAgent.iconType : null;

          setMessages([userMessage, { sender: 'assistant', content: assistantContent, agentId: assistantAgentId, agentName: assistantAgentFullName, agentIcon: assistantAgentIcon, lang: detectedLang, modelUsed: data.model_used, modelDisplayName: data.model_used ? modelOptions.find(m => m.backendName === data.model_used).name : null, modelDisplayIcon: data.model_used ? modelOptions.find(m => m.backendName === data.model_used).icon : null }]);
          if (data && data.session) {
            setSessions(sessions => sessions.map(session =>
              session.id === data.session.id ? data.session : session
            ));
          }
        } else {
          const errorData = await res.json();
          throw new Error(errorData.error || `Failed to send message: ${res.status}`);
        }
      } else {
        const modelBackendName = modelOptions.find(m => m.name === selectedModel)?.backendName || 'gemini';
        abortControllerRef.current = new AbortController();
        const res = await fetch(`${BACKEND_BASE}/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: translatedInput,
            userName: userName, 
            agentId: agentIdToSend,
            pdfSource: pdfSourceToSend,
            lang: detectedLang,
            model: modelBackendName // <-- now included for existing sessions
          }),
          signal: abortControllerRef.current.signal
        });
        abortControllerRef.current = null;

        if (res.ok) {
          const data = await res.json();
          let assistantContent = data && data.response !== undefined ? String(data.response) : 'Error: Could not retrieve response from backend.';
          const assistantAgentId = data.metadata && data.metadata.agent_id ? data.metadata.agent_id : null;

          if (detectedLang !== 'en') {
            try {
              const backTrans = await sarvamTranslate(assistantContent, detectedLang, 'en');
              assistantContent = backTrans.translated_text || assistantContent;
            } catch (err) {
              console.error('Sarvam Translate failed (output)', err);
              // Fallback: show English
            }
          }

          const responseAgent = currentAgents.find(agent => agent.id === assistantAgentId);
          const assistantAgentFullName = responseAgent ? responseAgent.fullName : null;
          const assistantAgentIcon = responseAgent ? responseAgent.iconType : null;

          setMessages(msgs => [...msgs, { sender: 'assistant', content: assistantContent, agentId: assistantAgentId, agentName: assistantAgentFullName, agentIcon: assistantAgentIcon, lang: detectedLang, modelUsed: data.model_used, modelDisplayName: data.model_used ? modelOptions.find(m => m.backendName === data.model_used).name : null, modelDisplayIcon: data.model_used ? modelOptions.find(m => m.backendName === data.model_used).icon : null }]);
          if (data && data.session) {
            setSessions(sessions => sessions.map(session =>
              session.id === data.session.id ? data.session : session
            ));
          }
        } else {
          const errorData = await res.json();
          throw new Error(errorData.error || `Failed to send message: ${res.status}`);
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        setMessages(msgs => [...msgs, { sender: 'assistant', content: 'Generation stopped by user.', lang: detectedLang }]);
      } else {
        console.error("Error sending message:", err);
        setMessages(msgs => [...msgs, { sender: 'assistant', content: `Sorry, there was an error: ${err.message}`, lang: detectedLang }]);
      }
    } finally {
      setLoading(false);
      setIsTyping(false);
      abortControllerRef.current = null;
      if (inputRef.current) inputRef.current.focus();
    }
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !loading) {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'Enter' && e.shiftKey) {
      // Allow newline
    }
  };

  const handleDeleteSession = async (sessionId) => {
    try {
      console.log(`Attempting to delete session: ${sessionId}`);
      const response = await fetch(`${BACKEND_BASE}/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete session: ${response.status}`);
      }

      setSessions(sessions => {
        const updatedSessions = sessions.filter(s => s.id !== sessionId);
        console.log('Sessions after deletion:', updatedSessions);
        if (currentSessionId === sessionId) {
          console.log('Deleted current session.');
          setCurrentSessionId(null);
          setMessages([]);
          setChatStarted(false);
          setCurrentView('chat'); // Ensure we stay in chat view
        }
        return updatedSessions;
      });
    } catch (error) {
      console.error('Error deleting session:', error);
      // Optionally show an error message to the user
      alert('Failed to delete session. Please try again.');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      console.log('Selected file:', file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUserAvatar(reader.result);
      };
      reader.readAsDataURL(file);
    }
    setShowUserDetailsMenu(false);
  };

  const handleChangeAvatarClick = () => {
    fileInputRef.current.click();
    setShowUserDetailsMenu(false);
  };

  const handleChangeNameClick = () => {
    setEditingUserName(true);
    setShowUserDetailsMenu(false);
  };

  const handleSaveUserName = () => {
    if (userName.trim() === '') {
      setUserName('User');
    }
    localStorage.setItem('userName', userName);
    setEditingUserName(false);
  };

  const handleCancelUserNameEdit = () => {
    setUserName(localStorage.getItem('userName') || 'User');
    setEditingUserName(false);
  };

  // Voice input functionality
  const startListening = async () => {
    if (listening) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);
      setAudioChunks([]);

      recorder.ondataavailable = (event) => {
        setAudioChunks((prev) => [...prev, event.data]);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' }); // Adjust MIME type if necessary
        setAudioChunks([]); // Clear chunks after stopping

        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');

        try {
          const response = await fetch(`${BACKEND_BASE}/elevenlabs/stt`, {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`STT failed: ${response.statusText}`);
          }

          const data = await response.json();
          setInput(data.transcript); // Set the transcribed text to input
          if (inputRef.current) {
            inputRef.current.innerText = data.transcript;
            restoreSelection(inputRef.current, data.transcript.length);
          }
        } catch (error) {
          console.error('Error sending audio for STT:', error);
        } finally {
          setListening(false);
        }
        stream.getTracks().forEach(track => track.stop()); // Stop microphone stream
      };

      recorder.start();
      setListening(true);
      console.log('MediaRecorder started');
    } catch (error) {
      console.error('Error starting microphone:', error);
      setListening(false);
    }
  };

  const stopListening = () => {
    if (mediaRecorder && listening) {
      mediaRecorder.stop();
      console.log('MediaRecorder stopped');
    }
  };

  // Removed the useEffect for webkitSpeechRecognition as it's no longer used.

  const handleAgentDataChange = useCallback((updatedAgentsData) => {
    // This function is called by KnowledgeSourcesView when agents are updated (added, edited, deleted)
    const newAgentList = updatedAgentsData.map(agent => ({
      id: agent.agentId, // Use agentId as id
      name: agent.name,
      fullName: agent.name, // Assuming name is full name for display
      iconType: agent.iconType,
      icon: getIconComponent(agent.iconType),
      pdfSource: agent.pdfSource
    }));
    setCurrentAgents(newAgentList);
  }, []);

  const groupedSessions = groupSessionsByDate(sessions);

  // Function to handle navigation to Home view
  const handleNavigateToHome = () => {
    setChatStarted(false);
    setMessages([]);
    setCurrentSessionId(null); // Set session to null when navigating home
    setCurrentView('home');
    setRightCollapsed(true);
    // Also clear any viewed PDF
    setViewedPdfUrl(null);
    setViewedPdfPage(null);
    setViewedHighlightText(null);
  };

  // Function to handle navigation to Chat view
  const handleNavigateToChat = () => {
    setCurrentView('chat');
    setRightCollapsed(false);
    // Also clear any viewed PDF
    setViewedPdfUrl(null);
    setViewedPdfPage(null);
    setViewedHighlightText(null);
  };

  // Function to handle navigation to Knowledge Sources view
  const handleNavigateToKnowledgeSources = () => {
    setCurrentView('knowledge-sources');
    setRightCollapsed(true); // Collapse right sidebar when viewing knowledge sources
    // Also clear any viewed PDF
    setViewedPdfUrl(null);
    setViewedPdfPage(null);
    setViewedHighlightText(null);
  };

  // Function to handle opening a PDF link
  const handleOpenPdfLink = (e, href) => {
    e.preventDefault();
    try {
      // Parse the full HTTP URL generated by renderAssistantContent
      const url = new URL(href);
      // Extract the filename from the pathname (e.g., /pdfs/DPDP_act.pdf -> DPDP_act.pdf)
      const pdfFilename = url.pathname.split('/').pop();
      // Parse hash parameters for page, section, highlight
      const hashParams = new URLSearchParams(url.hash.substring(1));
      const pdfPage = hashParams.get('page');
      const pdfSection = hashParams.get('section');
      let pdfHighlight = hashParams.get('highlight');
      let highlightTexts = null;
      if (pdfHighlight) {
        try {
          pdfHighlight = decodeURIComponent(pdfHighlight);
          // Double decode in case of double encoding
          pdfHighlight = decodeURIComponent(pdfHighlight);
        } catch (err) {}
        // Support comma or semicolon separated phrases for multi-highlighting
        if (pdfHighlight.includes(',') || pdfHighlight.includes(';')) {
          highlightTexts = pdfHighlight.split(/[,;]/).map(s => s.trim()).filter(Boolean);
        } else {
          highlightTexts = [pdfHighlight];
        }
      }
      // Construct the URL for the PDF viewer, using the correct filename
      const pdfViewerUrl = `${BACKEND_BASE}/pdfs/${pdfFilename}`;
      setViewedPdfUrl(pdfViewerUrl);
      setViewedPdfPage(pdfPage);
      setViewedHighlightText(null); // Clear old single highlight
      setCurrentView('pdf-viewer');
      // Pass highlightTexts as state for PDFViewer
      setTimeout(() => {
        setViewedHighlightText(highlightTexts);
      }, 0);
    } catch (error) {
      console.error('Error handling PDF link:', error);
    }
  };

  // Function to close the PDF viewer
  const handleClosePdfViewer = () => {
    setViewedPdfUrl(null);
    setViewedPdfPage(null);
    setViewedHighlightText(null);
    setCurrentView('chat'); // Return to chat view (or a previous view if you track history)
    setRightCollapsed(false); // Open right sidebar when returning to chat
  };

  // Dedicated agent chat creation for Knowledge Source
  const startDedicatedAgentChat = async (agentId) => {
    // Start a new session
    const res = await fetch(`${BACKEND_BASE}/sessions`, { method: 'POST' });
    const session = await res.json();
    setSessions(sessions => [session, ...sessions]);
    setCurrentSessionId(session.id);
    setChatStarted(false);
    setShowWelcome(true);
    setCurrentView('chat');

    // Set dedicated agent details and lock the chat
    const agent = currentAgents.find(a => a.id === agentId);
    if (agent) {
      setActiveAgentDetails(agent);
      localStorage.setItem(`sessionAgent_${session.id}`, agentId);
      localStorage.setItem('activeAgentId', agentId);
      localStorage.setItem('isDedicatedChat', 'true');
    }
    // Clear input as it's a dedicated chat, no need for @mention prefix
    if (inputRef.current) {
      inputRef.current.innerText = '';
      inputRef.current.focus();
    }
    return session.id;
  };

  // Update Knowledge Source Start Chat to use dedicated chat logic
  const handleStartChatWithAgent = async (agentId) => {
    await startDedicatedAgentChat(agentId);
  };

  const [copiedMessageId, setCopiedMessageId] = useState(null);

  const handleCopyMessage = (content, messageId) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageId(messageId);
    setTimeout(() => setCopiedMessageId(null), 2000); // Reset after 2 seconds
  };

  const handleExportMessage = (content) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-response-${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const [showModelSelector, setShowModelSelector] = useState(false);
  const modelOptions = [
    {
      name: 'Gemini 2.5 Flash',
      icon: <img src="/gemini.png" alt="Gemini" className="model-icon-img" />,
      description: "Google's latest, fastest model, best for data analysis, reasoning, and large context tasks.",
      backendName: 'gemini',
    },
    {
      name: 'Meta LlaMa 3',
      icon: <img src="/meta.png" alt="Meta Llama 3" className="model-icon-img" />,
      description: "Meta's most advanced open-source LLM, great for data analysis, summarization, and complex reasoning.",
      backendName: 'llama3',
    },
    {
      name: 'Mistral AI (Coming Soon)',
      icon: <img src="/mistral.png" alt="Mistral AI" className="model-icon-img" />,
      description: "Mistral AI's next-generation open LLM. Fast, efficient, multilingual, and ideal for document analysis. Coming soon to Unified Knowledge Platform!",
      backendName: 'mistral',
      comingSoon: true,
    },
    {
      name: 'Qwen 3:4 (Coming Soon)',
      icon: <img src="/qwen.png" alt="Qwen 3:4" className="model-icon-img" />,
      description: "Qwen 3:4 is Alibaba's advanced open LLM, excelling at reasoning, multilingual tasks, and data analysis. Coming soon to Unified Knowledge Platform!",
      backendName: 'qwen3_4',
      comingSoon: true,
    },
  ];
  const [selectedModel, setSelectedModel] = useState('Gemini 2.5 Flash');
  const [modelSearch, setModelSearch] = useState('');

  const filteredModels = modelOptions.filter(m => m.name.toLowerCase().includes(modelSearch.toLowerCase()));

  const [underlineActive, setUnderlineActive] = useState(true);
  useEffect(() => {
    setUnderlineActive(false);
    const timeout = setTimeout(() => setUnderlineActive(true), 10);
    return () => clearTimeout(timeout);
  }, [selectedModel]);

  const [viewMode, setViewMode] = useState('tiles'); // 'tiles' or 'list'

  // Overlay state for KnowledgeSourcesView
  const [showNewAgentOverlay, setShowNewAgentOverlay] = useState(false);
  const [agentToEdit, setAgentToEdit] = useState(null);
  const [overlaySuccessMessage, setOverlaySuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentDescription, setNewAgentDescription] = useState('');
  const [newAgentTileLineStartColor, setNewAgentTileLineStartColor] = useState('');
  const [newAgentTileLineEndColor, setNewAgentTileLineEndColor] = useState('');
  const [newAgentIconType, setNewAgentIconType] = useState('FaFileAlt');
  const [selectedPdfs, setSelectedPdfs] = useState([]);
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedTileLineStartColor, setEditedTileLineStartColor] = useState('');
  const [editedTileLineEndColor, setEditedTileLineEndColor] = useState('');

  // Handler: PDF file input change
  const handlePdfChange = (e) => {
    const files = Array.from(e.target.files).filter(file => file.type === 'application/pdf');
    if (files.length > 0) {
      setSelectedPdfs(files);
    } else {
      alert('Please select PDF files');
    }
  };

  // Handler: Cancel edit overlay
  const handleCancelEdit = () => {
    setAgentToEdit(null);
  };

  // Handler: Save edit agent
  const handleSaveEdit = async () => {
    if (!agentToEdit) return;
    setIsSubmitting(true);
    try {
      const updatedAgent = {
        agentId: agentToEdit.agentId,
        name: editedName,
        description: editedDescription,
        tileLineStartColor: editedTileLineStartColor,
        tileLineEndColor: editedTileLineEndColor,
      };
      const response = await fetch(`${BACKEND_BASE}/agents/${agentToEdit.agentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedAgent),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update agent');
      }
      // Optionally re-fetch agents here if needed
      setAgentToEdit(null);
    } catch (error) {
      console.error('Error saving agent:', error);
      alert(`Failed to save agent: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler: New agent form submit
  const handleNewAgentSubmit = async (e) => {
    e.preventDefault();
    if (!newAgentName || !newAgentDescription || selectedPdfs.length === 0) {
      alert('Please fill in all fields and select at least one PDF file');
      return;
    }
    setIsSubmitting(true);
    setOverlaySuccessMessage('');
    try {
      // Upload PDFs
      const formData = new FormData();
      selectedPdfs.forEach((file) => {
        formData.append('files', file);
      });
      const uploadResponse = await fetch(`${BACKEND_BASE}/upload-pdf`, {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' },
      });
      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Failed to upload PDFs');
      }
      const uploadData = await uploadResponse.json();
      if (!uploadData.success) {
        throw new Error(uploadData.error || 'Failed to upload PDFs');
      }
      const pdfFilenames = uploadData.filenames;
      // Create new agent
      const newAgentPayload = {
        iconType: newAgentIconType,
        name: newAgentName,
        description: newAgentDescription,
        buttonText: 'Start Chat',
        agentId: `agent_${Date.now()}`,
        pdfSources: pdfFilenames,
        tileLineStartColor: newAgentTileLineStartColor,
        tileLineEndColor: newAgentTileLineEndColor,
      };
      const agentResponse = await fetch(`${BACKEND_BASE}/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAgentPayload),
      });
      if (!agentResponse.ok) {
        const errorData = await agentResponse.json();
        throw new Error(errorData.error || 'Failed to create new agent');
      }
      const agentData = await agentResponse.json();
      if (agentData.success) {
        setOverlaySuccessMessage('Agent created successfully! ✓');
        setNewAgentName('');
        setNewAgentDescription('');
        setSelectedPdfs([]);
        setNewAgentTileLineStartColor('');
        setNewAgentTileLineEndColor('');
        setTimeout(() => {
          setShowNewAgentOverlay(false);
          setOverlaySuccessMessage('');
        }, 2000);
      } else {
        throw new Error(agentData.error || 'Failed to create agent');
      }
    } catch (error) {
      console.error('Error creating new agent:', error);
      alert(`Failed to create new agent: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`app-layout ${theme}-mode${leftCollapsed ? ' left-collapsed' : ''}${rightCollapsed ? ' right-collapsed' : ''}`}>
      <aside className={`left-sidebar${leftCollapsed ? ' collapsed' : ''}`}>
        <button className={`sidebar-toggle-btn left ${leftCollapsed ? 'collapsed' : 'expanded'}`} onClick={() => setLeftCollapsed(!leftCollapsed)} title={leftCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {leftCollapsed ? <FaChevronRight /> : <FaChevronLeft />}
        </button>
        {!leftCollapsed && (
          <>
            <div className="left-sidebar-header" onClick={handleNavigateToHome}>
              <img src="/unified-knowledge-platform.png" alt="Logo" className="sidebar-logo" />
              <div className="sidebar-title-short">UKP</div>
            </div>
            <button
              className="sidebar-nav-item"
              onClick={handleNavigateToHome}
              title="Go to Home"
            >
              <FaHome style={{ marginRight: '10px' }} /> Home
            </button>
            <button
              className="sidebar-nav-item"
              onClick={handleNavigateToChat}
              title={rightCollapsed ? 'Show Chats History' : 'Hide Chats History'}
            >
              <FaRegCommentAlt style={{ marginRight: '10px' }} /> Chats
            </button>
            <button
              className="sidebar-nav-item"
              onClick={handleNavigateToKnowledgeSources}
              title="Select different knowledge sources or agents"
            >
              <FaCube style={{ marginRight: '10px' }} /> Knowledge Sources
            </button>
            <button
              className="sidebar-nav-item"
              onClick={() => setCurrentView('supported-languages')}
              title="View supported languages"
            >
              <FaGlobe style={{ marginRight: '10px' }} /> Supported Languages
            </button>
            <button
              className="sidebar-nav-item theme-toggle"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? (
                <FaSun style={{ marginRight: '10px' }} />
              ) : (
                <FaMoon style={{ marginRight: '10px' }} />
              )}
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </button>
            <div className="user-details" onClick={() => setShowUserDetailsMenu(!showUserDetailsMenu)}>
              <div className="user-avatar">
                {userAvatar && <img src={userAvatar} alt="avatar" style={{ width: 40, height: 40, borderRadius: '50%' }} />}
                {!userAvatar && <div className="user-avatar-initial">{userName.charAt(0)}</div>}
              </div>
              <div className="user-info">
                {editingUserName ? (
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    onBlur={handleSaveUserName}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveUserName();
                      } else if (e.key === 'Escape') {
                        handleCancelUserNameEdit();
                      }
                    }}
                    className="user-name-input"
                    ref={userNameInputRef}
                  />
                ) : (
                  <div className="user-name">{userName}</div>
                )}
                <div className="user-email">dhruv.mendiratta4@gmail.com</div>
              </div>
              {showUserDetailsMenu && (
                <div className="user-details-menu">
                  <div className="menu-item" onClick={handleChangeAvatarClick}>Change avatar</div>
                  <div className="menu-item" onClick={handleChangeNameClick}>Change name</div>
                  <div className="menu-item" onClick={() => console.log('Change Password clicked')}>Change password</div>
                  <div className="menu-item" onClick={() => console.log('Log Out clicked')}>Log out</div>
                </div>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
          </>
        )}
      </aside>
      <main className="main-content chatbot-full">
        {currentView === 'home' && (
          <HomeView userName={userName} APP_NAME={APP_NAME} onNavigateToKnowledgeSources={handleNavigateToKnowledgeSources} />
        )}
        {currentView === 'chat' && (
          <>
            <div className="chat-window chatbot-full-window">
              <div className="chat-wave-bg top" />
              {messages.length === 0 && !chatStarted && !loading && (
                <div className="welcome-center-outer">
                  <div className="welcome-center-area">
                    <div className="welcome-logo">
                      <img src="/unified-knowledge-platform.png" alt="Logo" className="welcome-logo-img" />
                    </div>
                    <div className="welcome-greeting-area">
                      <div className="welcome-hi-user">Hi {userName || 'User'},</div>
                      <div className="welcome-headline">Welcome to <span className="welcome-app-name">{APP_NAME}</span></div>
                    </div>
                    {activeAgentDetails ? (
                      <>
                        <div className="welcome-subtitle" style={{ maxWidth: '600px', textAlign: 'center' }}>
                          You are chatting with <span className="agent-mention">@{activeAgentDetails.fullName}</span>. Unlock insights from internal documents with our intelligent AI Assistant, transforming complex information into clear, actionable knowledge.
                        </div>
                        <h2 className="welcome-subtitle" style={{ fontSize: '1.4rem', fontWeight: 600, marginBottom: '1rem' }}>How can I help you?</h2>
                        <div className="quick-options-col center-col">
                          {QUICK_OPTIONS.map(opt => (
                            <button
                              key={opt.label}
                              className="welcome-option-btn"
                              onClick={() => handleQuickOption(opt.value)}
                              type="button"
                            >
                              {opt.icon} {opt.label}
                            </button>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="welcome-subtitle" style={{ maxWidth: '600px', textAlign: 'center' }}>
                        Start a conversation by typing a message or mentioning an agent using @.
                      </div>
                    )}
                    {!activeAgentDetails && (
                      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
                        <div style={{
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          borderRadius: 18,
                          boxShadow: '0 2px 8px var(--shadow-color)',
                          padding: '1.2rem 1.5rem',
                          fontSize: '1rem',
                          fontWeight: 500,
                          textAlign: 'left',
                          maxWidth: 400,
                          display: 'inline-block',
                          border: '1px solid var(--border-color)'
                        }}>
                          <span style={{ color: '#888', fontWeight: 500 }}>Example: </span><span className="user-agent-mention" style={{ color: '#2563eb', fontWeight: 600 }}>@Agent</span> What is the primary purpose of the Digital Personal Data Protection Act, 2023, as stated in the Act??
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(messages.length > 0 || chatStarted || loading) && (
                <div id="middle-chatbox-container">
                  {activeAgentDetails && (
                    <div className="dedicated-agent-header">
                      Chatting with: {activeAgentDetails.fullName}
                    </div>
                  )}
                  {messages.map((msg, idx) => (
                    <div key={msg.id || idx} className={`chat-message ${msg.sender}`}>
                      {msg.sender === 'assistant' && (
                        <>
                          <div className="avatar assistant"><img src="/unified-knowledge-platform.png" alt="avatar" /></div>
                          <div className="bubble assistant">
                            <div className="message-content">
                              {/* Model name and icon above agent name */}
                              {msg.modelDisplayName && (
                                <div className="model-info-display" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                  {msg.modelDisplayIcon && <span className="model-info-icon">{msg.modelDisplayIcon}</span>}
                                  <span className="model-info-name" style={{ fontWeight: 600, fontSize: '0.98em', color: '#2563eb' }}>{msg.modelDisplayName}</span>
                                </div>
                              )}
                              {msg.agentName && (
                                <div className="agent-info-display">
                                  {msg.agentIcon && <span className="agent-info-icon">{getIconComponent(msg.agentIcon)}</span>}
                                  <span className="agent-info-name">{msg.agentName}</span>
                                </div>
                              )}
                              {!msg.agentName && (
                                <div className="agent-info-display">
                                  <span className="agent-info-icon"><img src="/unified-knowledge-platform.png" alt="avatar" style={{ width: '24px', height: '24px', borderRadius: '50%' }} /></span>
                                </div>
                              )}
                              {(() => {
                                let content = msg.content;
                                if (typeof content === 'object') {
                                  try {
                                    content = JSON.stringify(content);
                                  } catch (e) {
                                    content = String(content);
                                  }
                                } else if (typeof content !== 'string') {
                                  content = String(content);
                                }
                                if (voiceLang === 'hi-IN' && content.startsWith(ASSISTANT_PREFIX_EN)) {
                                  content = content.replace(ASSISTANT_PREFIX_EN, ASSISTANT_PREFIX_HI);
                                }
                                return renderAssistantContent(content, handleOpenPdfLink);
                              })()}
                              <div className="message-actions">
                                <button
                                  className="action-btn copy-btn"
                                  title={copiedMessageId === msg.id ? "Copied!" : "Copy message"}
                                  onClick={() => handleCopyMessage(msg.content, msg.id)}
                                  style={{ 
                                    background: 'none', 
                                    border: 'none', 
                                    cursor: 'pointer', 
                                    color: copiedMessageId === msg.id ? '#10B981' : '#bbb',
                                    marginLeft: 10
                                  }}
                                >
                                  <FaCopy size={18} />
                                </button>
                                <button
                                  className="action-btn export-btn"
                                  title="Export message"
                                  onClick={() => handleExportMessage(msg.content)}
                                  style={{ 
                                    background: 'none', 
                                    border: 'none', 
                                    cursor: 'pointer', 
                                    color: '#bbb',
                                    marginLeft: 6
                                  }}
                                >
                                  <FaFileExport size={18} />
                                </button>
                                <button
                                  className="voice-btn"
                                  title="Read aloud"
                                  onClick={() => handleSpeak(typeof msg.content === 'string' ? msg.content : String(msg.content))}
                                  style={{ 
                                    background: 'none', 
                                    border: 'none', 
                                    cursor: isSpeaking ? 'not-allowed' : 'pointer', 
                                    color: isSpeaking ? '#10B981' : '#bbb',
                                    marginLeft: 6
                                  }}
                                  disabled={isSpeaking}
                                >
                                  <FaVolumeUp size={18} />
                                </button>
                                {isSpeaking && (
                                  <button
                                    className="voice-stop-btn"
                                    title="Stop reading"
                                    onClick={handleStopSpeak}
                                    style={{ 
                                      background: 'none', 
                                      border: 'none', 
                                      cursor: 'pointer', 
                                      color: '#EF4444',
                                      marginLeft: 6
                                    }}
                                  >
                                    Stop
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                      {msg.sender === 'user' && (
                        <>
                          <div className="bubble user">
                            {msg.agentName && msg.agentId && (
                              <div className="agent-info-display agent-info-display-user">
                                <span className="agent-info-icon">
                                  {getIconComponent(currentAgents.find(a => a.id === msg.agentId)?.iconType)}
                                </span>
                                <span className="agent-info-name">{msg.agentName}</span>
                              </div>
                            )}
                            {(() => {
                              const agentMentionMatch = msg.content.match(/^(@[^\s]+(?:\s[^\s]+)*)\s*(.*)$/);
                              if (agentMentionMatch) {
                                const [, agentMention, restOfMessage] = agentMentionMatch;
                                return (
                                  <>
                                    <span className="user-agent-mention">{agentMention}</span>
                                    <span> {restOfMessage}</span>
                                  </>
                                );
                              } else {
                                return <span>{msg.content}</span>;
                              }
                            })()}
                          </div>
                          <div className="avatar user">
                            {userAvatar ? (
                              <img src={userAvatar} alt="User Avatar" />
                            ) : (
                              <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{userName ? userName.charAt(0) : 'U'}</span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {isTyping && (
                    <div className="chat-message assistant">
                      <div className="avatar assistant"><img src="/unified-knowledge-platform.png" alt="avatar" /></div>
                      <div className="bubble assistant">
                        {console.log('isTyping:', isTyping)}
                        <DigitalBrainLoader isLoading={isTyping} />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}
              <div className="chat-wave-bg" />
            <div className="floating-input-row anchored-bottom">
              <div className="floating-input-inner">
                <label htmlFor="file-upload" className="media-upload-btn" style={{ cursor: 'pointer', marginRight: 12 }}>
                  <FaPaperclip size={22} color="#60A5FA" />
                  <input id="file-upload" type="file" style={{ display: 'none' }} onChange={handleFileUpload} />
                </label>
                <div
                  ref={inputRef}
                  className="chat-input"
                  contentEditable={true}
                  data-placeholder="Your entire knowledge base, one question away..."
                  onInput={e => {
                    const div = e.target;
                    const savedCaretOffset = saveSelection(div);
                    let plainText = div.innerText; // Get plain text content

                    // Update the input state for send button and other logic that might depend on it
                    setInput(plainText);

                    // Only allow agent mention highlighting and dropdown in General Chat (when isDedicatedChat is false)
                    const isDedicatedChat = localStorage.getItem('isDedicatedChat') === 'true';
                    if (!isDedicatedChat) {
                      // General Chat: allow highlighting and dropdown
                      // Dynamically build regex for highlighting based on currentAgents for input field
                      const agentNamesForInputRegex = currentAgents
                        .filter(agent => agent && typeof agent.fullName === 'string' && agent.fullName.trim() !== '')
                        .map(agent => agent.fullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
                        .sort((a, b) => b.length - a.length) // Sort by length DESC to match longest names first
                        .join('|');
                      // Regex: @ followed by any agent name (including spaces), with word boundary or end
                      const dynamicHighlightRegexInput = new RegExp(`@(${agentNamesForInputRegex})(?=\\b|\\s|$)`, 'g');

                      // Highlight ALL agent mentions in the input, not just the one being typed
                      let highlightedHtml = plainText.replace(dynamicHighlightRegexInput, '<span class="agent-mention">@$1</span>');

                      // Sanitize the HTML before setting it back
                      const cleanHtml = DOMPurify.sanitize(highlightedHtml, {
                          ADD_TAGS: ['span'],
                          ADD_ATTR: ['class']
                      });
                      div.innerHTML = cleanHtml;

                      // Dropdown logic for General Chat
                      if (plainText.includes('@')) {
                        const lastAtIndex = plainText.lastIndexOf('@');
                        const mentionPart = plainText.substring(lastAtIndex + 1).trim(); // Get text after last @ and trim whitespace
                        // Filter against currentAgents for dynamic updates (for dropdown)
                        const currentFilteredAgents = currentAgents.filter(agent =>
                          agent && agent.fullName && 
                          agent.fullName.toLowerCase().startsWith(mentionPart.toLowerCase())
                        );
                        setFilteredAgents(currentFilteredAgents);
                        setShowAgentDropdown(currentFilteredAgents.length > 0);
                      } else {
                        setShowAgentDropdown(false);
                        setFilteredAgents([]);
                      }
                    } else {
                      // Dedicated Chat: no highlighting, no dropdown
                      div.innerHTML = DOMPurify.sanitize(plainText);
                      setShowAgentDropdown(false);
                      setFilteredAgents([]);
                    }
                    // Restore cursor position
                    restoreSelection(div, savedCaretOffset);
                  }}
                  onKeyDown={handleInputKeyDown}
                  disabled={loading}
                ></div>
                {showAgentDropdown && filteredAgents.length > 0 && (
                  <div className="agent-dropdown" style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '0',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 1000,
                    marginBottom: '8px',
                    width: '100%'
                  }}>
                    {filteredAgents.map(agent => (
                      <div
                        key={agent.id}
                        className="agent-dropdown-item"
                        onClick={() => {
                          const div = inputRef.current;
                          const currentText = div.innerText;
                          const lastAtIndex = currentText.lastIndexOf('@');
                          
                          // Construct the new plain text for the input using agent.fullName
                          const newPlainText = currentText.substring(0, lastAtIndex) + `@${agent.fullName} `;
                          // Calculate the new caret offset
                          const newCaretOffset = newPlainText.length;

                          // Dynamically build regex for highlighting based on the selected agent's full name
                          const escapedAgentFullName = agent.fullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                          const agentMentionRegex = new RegExp(`@${escapedAgentFullName}`, 'gi');
                          const highlightedHtml = newPlainText.replace(agentMentionRegex, '<span class="agent-mention">$&</span>');

                          // Sanitize and set the new HTML content
                          const cleanHtml = DOMPurify.sanitize(highlightedHtml, {
                              ADD_TAGS: ['span'],
                              ADD_ATTR: ['class']
                          });
                          div.innerHTML = cleanHtml;

                          // Update the input state to keep it in sync for send button etc.
                          setInput(newPlainText);
                          // Restore cursor position
                          restoreSelection(div, newCaretOffset);

                          setShowAgentDropdown(false);
                          setFilteredAgents([]);
                          div.focus(); // Ensure the div remains focused

                          // NEW: Set active agent details for general chat and persist in localStorage
                          setActiveAgentDetails(agent);
                          localStorage.setItem('activeAgentId', agent.id);
                          if (currentSessionId) {
                            localStorage.setItem(`sessionAgent_${currentSessionId}`, agent.id);
                          }
                        }}
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          color: 'var(--text-primary)',
                          ':hover': {
                            backgroundColor: 'var(--bg-secondary)'
                          }
                        }}
                      >
                        {agent.iconType && <span>{getIconComponent(agent.iconType)}</span>}
                        <span>@{agent.fullName}</span>
                      </div>
                    ))}
                  </div>
                )}
                  <button
                    className="model-selector-btn-flex bg-transparent border-none shadow-none focus:outline-none cursor-pointer p-0 m-0"
                    title="Select Model"
                    type="button"
                    onClick={() => setShowModelSelector(true)}
                    style={{ background: 'none', border: 'none', boxShadow: 'none' }}
                  >
                    {modelOptions.find(m => m.name === selectedModel)?.icon}
                    <span key={selectedModel} className={`model-text-underline model-underline-animate${underlineActive ? ' underline-active' : ''}`}>{selectedModel}</span>
                  </button>
                <button
                  className="voice-input-btn"
                  type="button"
                  title={listening ? 'Stop listening' : 'Speak'}
                  onClick={listening ? stopListening : startListening}
                  style={{
                    border: 'none',
                    width: 44,
                    height: 44,
                    marginLeft: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'background 0.2s, color 0.2s, box-shadow 0.2s',
                  }}
                  disabled={loading}
                >
                  <FaMicrophone size={20} style={{ color: listening ? '#007BFF' : 'var(--text-secondary)' }} />
                </button>
                {isTyping ? (
                  <button
                    className="send-btn stop-btn"
                    onClick={handleStopGeneration}
                    title="Stop generating"
                    type="button"
                    style={{ background: 'none', border: 'none', color: '#EF4444' }}
                  >
                    <FaStop size={24} />
                  </button>
                ) : (
                  <button
                    className="send-btn send-arrow"
                    onClick={handleSend}
                    disabled={loading || !input.trim()}
                    title="Send"
                    type="button"
                  >
                    <FaPaperPlane color={input.trim() ? '#3B82F6' : '#6B7280'} size={24} />
                  </button>
                )}
                </div>
              </div>
            </div>
            {showModelSelector && (
              <div className="modal-overlay" onClick={() => setShowModelSelector(false)}>
                {(() => {
                  const isDarkMode = document.body.classList.contains('dark-mode') || document.documentElement.classList.contains('dark-mode');
                  return (
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{
                      width: '700px',
                      maxWidth: '90vw',
                      maxHeight: '80vh',
                      overflowY: 'auto',
                      minHeight: 'unset',
                      borderRadius: 18,
                      boxShadow: isDarkMode ? '0 4px 32px #0008' : '0 4px 32px #0002',
                      background: isDarkMode ? '#181a20' : '#fff',
                      color: isDarkMode ? '#f3f4f6' : '#222',
                      margin: '0 auto',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'stretch',
                      padding: '2.5rem 2.5rem 2rem 2.5rem',
                      transition: 'background 0.2s, color 0.2s',
                    }}>
                      <div className="model-search-toggle-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, marginTop: 0 }}>
                        <div className="model-search-input-wrapper" style={{ flex: 1, marginRight: 16 }}>
                          <svg className="model-search-icon" width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M21 21l-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" stroke="#A0A4AB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          <input
                            type="text"
                            className="model-search-input"
                            placeholder="Search models"
                            value={modelSearch}
                            onChange={e => setModelSearch(e.target.value)}
                            autoFocus
                          />
                        </div>
                        <div className="model-view-toggle-row" style={{ display: 'flex', gap: 8 }}>
                          <button className={`model-view-toggle-btn${viewMode === 'tiles' ? ' active' : ''}`} onClick={() => setViewMode('tiles')} aria-label="Grid view">
                            <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="2" fill="currentColor"/><rect x="14" y="3" width="7" height="7" rx="2" fill="currentColor"/><rect x="14" y="14" width="7" height="7" rx="2" fill="currentColor"/><rect x="3" y="14" width="7" height="7" rx="2" fill="currentColor"/></svg>
                          </button>
                          <button className={`model-view-toggle-btn${viewMode === 'list' ? ' active' : ''}`} onClick={() => setViewMode('list')} aria-label="List view">
                            <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="2.5" rx="1.25" fill="currentColor"/><rect x="4" y="10.75" width="16" height="2.5" rx="1.25" fill="currentColor"/><rect x="4" y="16.5" width="16" height="2.5" rx="1.25" fill="currentColor"/></svg>
                          </button>
                        </div>
                      </div>
                      {viewMode === 'tiles' ? (
                        <div className="model-tiles-list">
                          {filteredModels.map((model, idx) => (
                            <div
                              key={model.name + modelSearch}
                              className={`model-tile model-tile-animate${model.comingSoon ? ' model-tile-coming-soon' : ''}`}
                              style={{ animationDelay: `${idx * 60}ms`, opacity: model.comingSoon ? 0.6 : 1, cursor: model.comingSoon ? 'not-allowed' : 'pointer', position: 'relative' }}
                              onClick={model.comingSoon ? undefined : () => { setSelectedModel(model.name); setShowModelSelector(false); }}
                              role={model.comingSoon ? undefined : 'button'}
                              aria-label={model.comingSoon ? undefined : `Select ${model.name}`}
                              tabIndex={model.comingSoon ? -1 : 0}
                            >
                              <div className="model-tile-icon-row">
                                <div className="model-tile-icon">{model.icon}</div>
                              </div>
                              <div className="model-tile-name">{model.name}</div>
                              <div className="model-tile-desc">{model.description}</div>
                              {model.comingSoon && (
                                <div style={{
                                  position: 'absolute',
                                  top: 10,
                                  right: 10,
                                  background: '#6c2eb7',
                                  color: '#fff',
                                  borderRadius: 8,
                                  padding: '2px 10px',
                                  fontSize: '0.85em',
                                  fontWeight: 600,
                                  letterSpacing: 1,
                                  boxShadow: '0 2px 8px #0002',
                                  zIndex: 2
                                }}>Coming Soon</div>
                              )}
                            </div>
                          ))}
                          {filteredModels.length === 0 && (
                            <div className="model-tile-empty">No models found.</div>
                          )}
                        </div>
                      ) : (
                        <div className="model-list-view">
                          {filteredModels.map((model, idx) => (
                            <div
                              key={model.name + modelSearch}
                              className={`model-list-row model-tile-animate${viewMode === 'list' ? ' list-animate' : ''}`}
                              style={{ animationDelay: `${idx * 60}ms` }}
                              onClick={() => { setSelectedModel(model.name); setShowModelSelector(false); }}
                              tabIndex={0}
                              role="button"
                              aria-label={`Select ${model.name}`}
                            >
                              <div className="model-list-icon">{model.icon}</div>
                              <div className="model-list-info">
                                <div className="model-list-name">{model.name}</div>
                                <div className="model-list-desc">{model.description}</div>
                              </div>
                            </div>
                          ))}
                          {filteredModels.length === 0 && (
                            <div className="model-tile-empty">No models found.</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </>
        )}
        {currentView === 'knowledge-sources' && (
          <KnowledgeSourcesView
            onStartChatWithAgent={handleStartChatWithAgent}
            onAgentDataChange={handleAgentDataChange}
            showNewAgentOverlay={showNewAgentOverlay}
            setShowNewAgentOverlay={setShowNewAgentOverlay}
            agentToEdit={agentToEdit}
            setAgentToEdit={setAgentToEdit}
            overlaySuccessMessage={overlaySuccessMessage}
            setOverlaySuccessMessage={setOverlaySuccessMessage}
            isSubmitting={isSubmitting}
            setIsSubmitting={setIsSubmitting}
            newAgentName={newAgentName}
            setNewAgentName={setNewAgentName}
            newAgentDescription={newAgentDescription}
            setNewAgentDescription={setNewAgentDescription}
            newAgentTileLineStartColor={newAgentTileLineStartColor}
            setNewAgentTileLineStartColor={setNewAgentTileLineStartColor}
            newAgentTileLineEndColor={newAgentTileLineEndColor}
            setNewAgentTileLineEndColor={setNewAgentTileLineEndColor}
            newAgentIconType={newAgentIconType}
            setNewAgentIconType={setNewAgentIconType}
            selectedPdfs={selectedPdfs}
            setSelectedPdfs={setSelectedPdfs}
            handleNewAgentSubmit={handleNewAgentSubmit}
            handlePdfChange={handlePdfChange}
            handleCancelEdit={handleCancelEdit}
            handleSaveEdit={handleSaveEdit}
            editedName={editedName}
            setEditedName={setEditedName}
            editedDescription={editedDescription}
            setEditedDescription={setEditedDescription}
            editedTileLineStartColor={editedTileLineStartColor}
            setEditedTileLineStartColor={setEditedTileLineStartColor}
            editedTileLineEndColor={editedTileLineEndColor}
            setEditedTileLineEndColor={setEditedTileLineEndColor}
          />
        )}
        {currentView === 'supported-languages' && (
          <SupportedLanguages />
        )}

        {/* Render PdfViewer when currentView is 'pdf-viewer' */}
        {currentView === 'pdf-viewer' && viewedPdfUrl && (
          <div className="pdf-viewer-container">
            <PDFViewer
              pdfUrl={viewedPdfUrl}
              pageNumber={viewedPdfPage}
              highlightTexts={viewedHighlightText}
              onClose={handleClosePdfViewer}
            />
          </div>
        )}

      </main>
      {currentView === 'chat' && (
        <aside className={`right-sidebar${rightCollapsed ? ' collapsed' : ''}`}>
          <button className={`sidebar-toggle-btn right ${rightCollapsed ? 'collapsed' : 'expanded'}`} onClick={() => setRightCollapsed(!rightCollapsed)} title={rightCollapsed ? 'Expand chat history' : 'Collapse chat history'}>
            {rightCollapsed ? <FaChevronLeft /> : <FaChevronRight />}
          </button>
          {!rightCollapsed && (
            <>
              <div className="right-sidebar-heading">Chats History</div>
              <div style={{ marginBottom: 16 }} />
              <button
                className="sidebar-nav-item"
                onClick={startNewSession}
                style={{ width: '100%', marginBottom: '1.5rem' }}
              >
                <FaPlus style={{ marginRight: '10px' }} /> New Chat
              </button>
              <div className="chat-history-list">
                {Object.entries(groupedSessions).map(([group, groupSessions]) => (
                  groupSessions.length > 0 && (
                    <div key={group} style={{ marginBottom: 18 }}>
                      {groupSessions.map(session => (
                        <div
                          key={session.id}
                          className={`chat-history-item${session.id === currentSessionId ? ' active' : ''}`}
                          onClick={() => setCurrentSessionId(session.id)}
                        >
                          <FaRegFileAlt size={22} style={{ color: '#bbb' }} />
                          <span className="chat-history-title">{String(session.title)}</span>
                          <button className="delete-chat-btn" onClick={e => { e.stopPropagation(); handleDeleteSession(session.id); }}><FaTrash /></button>
                        </div>
                      ))}
                    </div>
                  )
                ))}
              </div>
            </>
          )}
        </aside>
      )}
      {/* Overlay Portal for New/Edit Agent */}
      {showNewAgentOverlay && (
        <AgentOverlay onClose={() => setShowNewAgentOverlay(false)}>
          <div className="overlay-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>New Agent</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="color"
                value={newAgentTileLineStartColor || '#3498db'}
                onChange={e => setNewAgentTileLineStartColor(e.target.value)}
                disabled={isSubmitting}
                style={{ width: 24, height: 24, border: 'none', marginRight: 4, cursor: 'pointer', background: 'none', padding: 0 }}
                title="Tile Line Start Color"
              />
              <input
                type="color"
                value={newAgentTileLineEndColor || '#8e44ad'}
                onChange={e => setNewAgentTileLineEndColor(e.target.value)}
                disabled={isSubmitting}
                style={{ width: 24, height: 24, border: 'none', marginLeft: 4, cursor: 'pointer', background: 'none', padding: 0 }}
                title="Tile Line End Color"
              />
            </div>
          </div>
          <div style={{ width: '100%', padding: 0, margin: 0 }}>
            <div
              style={{
                display: 'block',
                width: '100%',
                height: 16,
                borderRadius: 12,
                marginBottom: 18,
                background: `linear-gradient(90deg, ${newAgentTileLineStartColor || '#3498db'}, ${newAgentTileLineEndColor || '#8e44ad'})`,
                transition: 'background 0.2s',
              }}
            />
          </div>
          {overlaySuccessMessage && (
            <div className="overlay-success-message">
              {overlaySuccessMessage}
            </div>
          )}
          <form onSubmit={handleNewAgentSubmit} style={{ fontSize: '0.98rem' }}>
            <input
              type="text"
              placeholder="Agent Name"
              value={newAgentName}
              onChange={(e) => setNewAgentName(e.target.value)}
              required
              disabled={isSubmitting}
              style={{ height: 36, fontSize: '1rem', marginBottom: 10 }}
            />
            <textarea
              placeholder="Agent Description"
              value={newAgentDescription}
              onChange={(e) => setNewAgentDescription(e.target.value)}
              required
              disabled={isSubmitting}
              style={{ minHeight: 70, fontSize: '1rem', marginBottom: 10 }}
            />
            <div className="icon-selection-container">
              <label htmlFor="icon-select" className="icon-select-label">Choose an Icon:</label>
              <select
                id="icon-select"
                className="icon-select-dropdown"
                value={newAgentIconType}
                onChange={(e) => setNewAgentIconType(e.target.value)}
                disabled={isSubmitting}
                style={{ height: 36, fontSize: '1rem' }}
              >
                <option value="FaFileAlt">Document (Default)</option>
                <option value="FaShieldAlt">Shield</option>
                <option value="FaGavel">Gavel</option>
                <option value="FaRobot">Robot</option>
                <option value="FaBook">Book</option>
                <option value="FaLightbulb">Lightbulb</option>
                <option value="FaFlask">Flask</option>
                <option value="FaUserTie">User Tie</option>
                <option value="FaDatabase">Database</option>
                <option value="FaCloud">Cloud</option>
                <option value="FaUser">User</option>
                <option value="FaLock">Lock</option>
                <option value="FaChartBar">Chart</option>
                <option value="FaCog">Settings</option>
                <option value="FaComments">Comments</option>
                <option value="FaStar">Star</option>
                <option value="FaBell">Bell</option>
                <option value="FaCalendar">Calendar</option>
                <option value="FaEnvelope">Envelope</option>
                <option value="FaMap">Map</option>
                <option value="FaHeart">Heart</option>
                <option value="FaCheck">Check</option>
                <option value="FaTimes">Times</option>
              </select>
              <div className="selected-icon-preview">
                {getIconComponent(newAgentIconType, { size: '22px' })}
              </div>
            </div>
            <div className="pdf-upload-section" style={{ margin: '10px 0' }}>
              <input
                type="file"
                accept=".pdf"
                multiple
                onChange={handlePdfChange}
                id="pdf-upload"
                className="pdf-upload-input-hidden"
                required
                disabled={isSubmitting}
              />
              <label htmlFor="pdf-upload" className="file-upload-button" style={{ fontSize: '1rem', padding: '10px 18px' }}>
                <FaFileAlt /> Choose Files
              </label>
              <span className="file-chosen-text" style={{ fontSize: '0.95em' }}>
                {selectedPdfs.length > 0
                  ? selectedPdfs.map(f => f.name).join(', ')
                  : 'No files chosen'}
              </span>
            </div>
            <div className="overlay-actions" style={{ gap: 10, marginTop: 18 }}>
              <button
                type="submit"
                className="create-agent-btn"
                disabled={isSubmitting}
                style={{ fontSize: '1rem', padding: '10px 24px', minWidth: 120, height: 38 }}
              >
                {isSubmitting ? 'Creating...' : <><FaSave /> Create Agent</>}
              </button>
              <button
                type="button"
                onClick={() => setShowNewAgentOverlay(false)}
                className="cancel-btn"
                disabled={isSubmitting}
                style={{ fontSize: '1rem', padding: '10px 24px', minWidth: 120, height: 38 }}
              >
                <FaTimes /> Cancel
              </button>
            </div>
          </form>
        </AgentOverlay>
      )}
      {agentToEdit && (
        <AgentOverlay onClose={handleCancelEdit}>
          <div className="overlay-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ margin: 0 }}>Edit Agent</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="color"
                value={editedTileLineStartColor || '#3498db'}
                onChange={e => setEditedTileLineStartColor(e.target.value)}
                disabled={isSubmitting}
                style={{ width: 28, height: 28, border: 'none', marginRight: 4, cursor: 'pointer', background: 'none', padding: 0 }}
                title="Tile Line Start Color"
              />
              <input
                type="color"
                value={editedTileLineEndColor || '#8e44ad'}
                onChange={e => setEditedTileLineEndColor(e.target.value)}
                disabled={isSubmitting}
                style={{ width: 28, height: 28, border: 'none', marginLeft: 4, cursor: 'pointer', background: 'none', padding: 0 }}
                title="Tile Line End Color"
              />
            </div>
          </div>
          {/* Visual gradient line preview for Edit Agent */}
          {(() => {
            const isDarkMode = document.body.classList.contains('dark-mode') || document.documentElement.classList.contains('dark-mode');
            const start = editedTileLineStartColor || (isDarkMode ? '#5e35b1' : '#3498db');
            const end = editedTileLineEndColor || (isDarkMode ? '#7b1fa2' : '#8e44ad');
            return (
              <div
                style={{
                  height: 16,
                  borderRadius: 12,
                  marginBottom: 28,
                  background: `linear-gradient(90deg, ${start}, ${end})`,
                  width: '100%',
                  boxShadow: isDarkMode
                    ? '0 2px 8px rgba(124, 58, 237, 0.18)'
                    : '0 2px 8px rgba(52, 152, 219, 0.12)',
                  transition: 'background 0.2s',
                }}
              />
            );
          })()}
          {overlaySuccessMessage && (
            <div className="overlay-success-message">
              {overlaySuccessMessage}
            </div>
          )}
          <form onSubmit={e => { e.preventDefault(); handleSaveEdit(); }}>
            <input
              type="text"
              value={editedName}
              onChange={e => setEditedName(e.target.value)}
              required
              disabled={isSubmitting}
            />
            <textarea
              value={editedDescription}
              onChange={e => setEditedDescription(e.target.value)}
              required
              disabled={isSubmitting}
            />
            <div className="icon-selection-container">
              <label htmlFor="icon-select" className="icon-select-label">Choose an Icon:</label>
              <select
                id="icon-select"
                className="icon-select-dropdown"
                value={agentToEdit.iconType}
                onChange={e => setNewAgentIconType(e.target.value)}
                disabled={isSubmitting}
              >
                <option value="FaFileAlt">Document (Default)</option>
                <option value="FaShieldAlt">Shield</option>
                <option value="FaGavel">Gavel</option>
                <option value="FaRobot">Robot</option>
                <option value="FaBook">Book</option>
                <option value="FaLightbulb">Lightbulb</option>
                <option value="FaFlask">Flask</option>
                <option value="FaUserTie">User Tie</option>
                <option value="FaDatabase">Database</option>
                <option value="FaCloud">Cloud</option>
                <option value="FaUser">User</option>
                <option value="FaLock">Lock</option>
                <option value="FaChartBar">Chart</option>
                <option value="FaCog">Settings</option>
                <option value="FaComments">Comments</option>
                <option value="FaStar">Star</option>
                <option value="FaBell">Bell</option>
                <option value="FaCalendar">Calendar</option>
                <option value="FaEnvelope">Envelope</option>
                <option value="FaMap">Map</option>
                <option value="FaHeart">Heart</option>
                <option value="FaCheck">Check</option>
                <option value="FaTimes">Times</option>
              </select>
              <div className="selected-icon-preview">
                {getIconComponent(agentToEdit.iconType, { size: '24px' })}
              </div>
            </div>
            <div className="overlay-actions">
              <button
                type="submit"
                className="create-agent-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : <><FaSave /> Save</>}
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="cancel-btn"
                disabled={isSubmitting}
              >
                <FaTimes /> Cancel
              </button>
            </div>
          </form>
        </AgentOverlay>
      )}
    </div>
  );
}

export default App;