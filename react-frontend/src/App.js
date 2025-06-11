import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import './App.css';
import { FaPlus, FaPaperPlane, FaRegFileAlt, FaPaperclip, FaVolumeUp, FaMicrophone, FaChevronLeft, FaChevronRight, FaTrash, FaRegCommentAlt, FaCube, FaFileAlt, FaListUl, FaHighlighter, FaSun, FaMoon, FaHome, FaShieldAlt, FaGavel } from 'react-icons/fa';
import HomeView from './components/HomeView';
import KnowledgeSourcesView from './components/KnowledgeSourcesView';
import PDFViewer from './components/PDFViewer';
import remarkGfm from 'remark-gfm';
import DigitalBrainLoader from './components/AnimatedLogo';
import DOMPurify from 'dompurify';
import { KNOWLEDGE_AGENT_CONST } from './components/KnowledgeSourcesView'; // Corrected import

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

// Helper function to get icon component
const getIconComponent = (iconType) => {
  switch (iconType) {
    case 'FaShieldAlt':
      return <FaShieldAlt />;
    case 'FaGavel':
      return <FaGavel />;
    case 'FaFileAlt':
      return <FaFileAlt />;
    default:
      return <FaShieldAlt />;
  }
};

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
  // Replace underscores with spaces only after 'Section' or 'Rule'
  let cleaned = raw.replace(/^(Section|Rule)_/, '$1 ');
  // Replace any remaining underscores with spaces (if any)
  cleaned = cleaned.replace(/_/g, ' ');
  return cleaned;
}

function renderAssistantContent(content) {
  // Ensure content is a string before processing
  const stringContent = String(content);

  const lines = stringContent.split(/\n/);
  const processedLines = lines.map(line => {
    // Handle lines that start with 'source:' separately (e.g., Source: [Reference])
    const sourceMatch = line.match(/^source:\[([^\]]+)\](.+)$/i);
    if (sourceMatch) {
      const sectionReference = sourceMatch[1].trim();
      return `**Source: [${sectionReference}]**`;
    }

    // Regex to find lines containing PDF links in either format:
    // (pdf://filename.pdf/page/N) or (pdf://filename.pdf/page/N#section=Section)
    // It also captures optional text before and after the link.
    const pdfLinkMatch = line.match(/^(.*)\(pdf:\/\/([^/]+)\/page\/(\d+)(?:#section=([^)]+))?\)(.*)$/);

    if (pdfLinkMatch) {
      // Destructure the match results without unused variable
      const [, beforeText, filename, page, section] = pdfLinkMatch;

      // Determine the section name to use in the link text
      let displaySection = section;
      if (!displaySection) {
         // If #section= was not present, try to extract section from beforeText
         const sectionFromBeforeText = beforeText ? beforeText.match(/\[([^\]]+)\]/) : null;
         displaySection = sectionFromBeforeText ? sectionFromBeforeText[1].trim() : 'Document'; // Default
      }

      // Clean up the section/rule string for display
      const cleanedSection = formatSectionOrRule(displaySection);

      // Create the markdown link text
      const linkText = `${cleanedSection}, Page ${page}`;
      // Create the actual URL with fragment for page navigation
      const linkUrl = `${BACKEND_BASE}/pdfs/${filename}#page=${page}`;

      // Return only the markdown link, replacing the entire line that matched
      return `[${linkText}](${linkUrl})`;
    }

    // If the line doesn't match the 'source:' pattern or contain a pdf:// link, return it as is
    return line;
  });

  // Join the processed lines back into a single string
  const processedContent = processedLines.join('\n');

  // Custom renderers for ReactMarkdown
  const renderers = {
    a: (props) => {
      const { href, children } = props;
      // Check if the href is one of our PDF links
      const isPdfLink = href && href.startsWith(BACKEND_BASE + '/pdfs/');
      // Check if it's any other external URL
      const isExternal = href && (href.startsWith('http') || href.startsWith('https') || href.startsWith('www.'));

      if (isPdfLink) {
        // Apply button-like styling for PDF links
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
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
            {children}
          </a>
        );
      } else if (isExternal) {
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
  const [voiceLang, setVoiceLang] = useState('en-US');
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
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

  // State for PDF viewer
  const [viewedPdfUrl, setViewedPdfUrl] = useState(null);
  const [viewedPdfPage, setViewedPdfPage] = useState(null);
  const [viewedHighlightText, setViewedHighlightText] = useState(null);

  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const [filteredAgents, setFilteredAgents] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [activeAgentDetails, setActiveAgentDetails] = useState(null);

  const [currentAgents, setCurrentAgents] = useState(() => {
    // Always initialize currentAgents from KNOWLEDGE_AGENT_CONST as the baseline.
    // KnowledgeSourcesView will manage localStorage and pass updates via onAgentDataChange.
    return KNOWLEDGE_AGENT_CONST.map(agent => ({
      id: agent.agentId,
      name: agent.agentId,
      fullName: agent.name,
      iconType: agent.iconType,
      icon: getIconComponent(agent.iconType),
      pdfSource: agent.pdfSource
    }));
  });

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_BASE}/sessions`);
      if (!res.ok) throw new Error(`Failed to fetch sessions: ${res.status}`);
      const data = await res.json();
      // Ensure session titles are always strings
      const processedSessions = data.map(session => ({
        ...session,
        title: String(session.title)
      }));
      setSessions(processedSessions);

      const lastSessionId = localStorage.getItem('lastSessionId');

      if (lastSessionId && data.some(session => session.id === lastSessionId)) {
        // If lastSessionId exists and is in the fetched sessions, use it
        setCurrentSessionId(lastSessionId);
        // Also try to restore activeAgentDetails for the session
        const lastActiveAgentId = localStorage.getItem(`sessionAgent_${lastSessionId}`);
        if (lastActiveAgentId && currentAgents.length > 0) {
          const agent = currentAgents.find(a => a.id === lastActiveAgentId);
          setActiveAgentDetails(agent || null);
        } else {
          setActiveAgentDetails(null);
        }
      } else if (data.length > 0) {
        // If lastSessionId is invalid or null, but there are sessions, use the first one
        setCurrentSessionId(data[0].id);
        // Also try to restore activeAgentDetails for the session
        const firstActiveAgentId = localStorage.getItem(`sessionAgent_${data[0].id}`);
        if (firstActiveAgentId && currentAgents.length > 0) {
          const agent = currentAgents.find(a => a.id === firstActiveAgentId);
          setActiveAgentDetails(agent || null);
        } else {
          setActiveAgentDetails(null);
        }
      } else {
        // If no sessions exist, set currentSessionId to null
        setCurrentSessionId(null);
        setActiveAgentDetails(null);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setSessions([]);
      setCurrentSessionId(null);
      setActiveAgentDetails(null);
    }
  }, [setCurrentSessionId, setSessions]);

  // Initial mount effect
  useEffect(() => {
    document.title = APP_NAME;
    const link = document.querySelector("link[rel~='icon']");
    if (link) link.href = FAVICON_URL;

    // Load last viewed session and tab from localStorage
    const lastSessionId = localStorage.getItem('lastSessionId');
    const lastView = localStorage.getItem('lastView');
    
    if (lastSessionId) {
      setCurrentSessionId(lastSessionId);
      // Also try to restore activeAgentDetails for the session
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
  }, [fetchSessions]); // Only depend on fetchSessions

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
    
    // Reset activeAgentDetails for a new session (unless it's a dedicated start)
    setActiveAgentDetails(null); // Explicitly clear for new general chats

    // Removed activeAgentForChat and localStorage persistence from here.
    // This will be handled by handleStartChatWithAgent if it's a dedicated chat.
    
    return session.id; // Return the session ID
  };

  // When switching sessions/tabs, reset welcome state if no messages
  useEffect(() => {
    if (messages.length === 0) {
      setChatStarted(false);
      setShowWelcome(true);
    }
  }, [currentSessionId]);

  const handleSpeak = (text) => {
    console.log('handleSpeak called with text:', text);
    if (!('speechSynthesis' in window)) {
      console.error('Speech synthesis not supported');
      return;
    }

    window.speechSynthesis.cancel();
    setIsSpeaking(true);

    const voices = window.speechSynthesis.getVoices();
    console.log('Fetched voices:', voices);

    const findHindiVoice = (voices) => {
      return voices.find(v => v.lang === 'hi-IN') ||
             voices.find(v => v.lang.includes('hi')) ||
             voices.find(v => v.name.toLowerCase().includes('hindi'));
    };

    const hindiVoice = findHindiVoice(voices);
    const englishVoice = voices.find(v => v.lang === 'en-US') || voices.find(v => v.lang.includes('en'));

    console.log('Text received for speaking:', text);
    let sentences = text.match(/[^.!?\n।]+[.!?\n।]?/g) || [text];
    sentences = sentences.filter(sentence => sentence.trim().length > 0);
    console.log('Sentences after splitting:', sentences);

    const speak = async () => {
      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i].trim();
        if (!sentence) continue;

        const utter = new window.SpeechSynthesisUtterance(sentence);

        const isHindi = /[\u0900-\u097F]/.test(sentence) || sentence.startsWith(ASSISTANT_PREFIX_HI);

        if (isHindi) {
        utter.lang = 'hi-IN';
          if (hindiVoice) {
            utter.voice = hindiVoice;
            utter.rate = 0.9;
          } else if (englishVoice) {
            utter.voice = englishVoice;
            utter.lang = 'en-US';
            utter.rate = 1.0;
          } else if (voices.length > 0) {
            utter.voice = voices[0];
            utter.lang = voices[0].lang || 'en-US';
          }
          utter.pitch = 1.0;
      } else {
        utter.lang = 'en-US';
          if (englishVoice) {
            utter.voice = englishVoice;
          } else if (hindiVoice) {
            utter.voice = hindiVoice;
            utter.lang = 'hi-IN';
            utter.rate = 0.9;
          } else if (voices.length > 0) {
            utter.voice = voices[0];
            utter.lang = voices[0].lang || 'en-US';
          }
          utter.rate = 1.0;
          utter.pitch = 1.0;
        }

        await new Promise((resolve, reject) => {
          utter.onstart = () => {
            console.log('Utterance started (' + (i + 1) + '/' + sentences.length + '):', utter.text.substring(0, 50) + '...');
          };
      utter.onend = () => {
            console.log('Utterance ended (' + (i + 1) + '/' + sentences.length + '):', utter.text.substring(0, 50) + '...');
            if (i === sentences.length - 1) {
              setIsSpeaking(false);
            }
            resolve();
      };
          utter.onerror = (event) => {
            console.error('Speech synthesis error (' + (i + 1) + '/' + sentences.length + '):', event, 'for text:', utter.text.substring(0, 50) + '...');
        setIsSpeaking(false);
            reject(new Error('Speech synthesis error'));
      };
           utter.onpause = () => {
             console.log('Utterance paused (' + (i + 1) + '/' + sentences.length + '):', utter.text.substring(0, 50) + '...');
           };
           utter.onresume = () => {
             console.log('Utterance resumed (' + (i + 1) + '/' + sentences.length + '):', utter.text.substring(0, 50) + '...');
           };

          try {
      window.speechSynthesis.speak(utter);
            console.log('Speech synthesis speak() called for utterance (' + (i + 1) + '/' + sentences.length + '):', utter.text.substring(0, 50) + '...');
          } catch (e) {
            console.error('Synchronous error during speechSynthesis.speak:', e, 'for text:', utter.text.substring(0, 50) + '...');
            setIsSpeaking(false);
            reject(e);
          }
        });
      }
    };

    speak().catch(error => {
      console.error('Speech synthesis sequence stopped due to error:', error);
      setIsSpeaking(false);
    });
  };

  const handleStopSpeak = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
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
        const res = await fetch(`${BACKEND_BASE}/sessions/${newSession.id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: value, userName: userName })
        });

        if (res.ok) {
          const data = await res.json();
          const assistantContent = data && data.response !== undefined ? String(data.response) : 'Error: Could not retrieve response from backend.';
          const assistantAgentId = data.metadata && data.metadata.agent_id ? data.metadata.agent_id : null;
          setMessages(msgs => [...msgs, { sender: 'assistant', content: assistantContent, agentId: assistantAgentId }]);
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

  const handleSend = async (overrideInput) => {
    // Get the message from the contenteditable div
    const messageToSend = overrideInput !== undefined ? String(overrideInput) : inputRef.current.innerText;
    if (!messageToSend.trim() || loading) return;

    // Clear the input field after sending
    setInput('');
    if (inputRef.current) {
      inputRef.current.innerHTML = ''; // Clear the contenteditable div
    }

    setLoading(true);
    setIsTyping(true);

    const tempMessageId = Date.now();
    let sessionId = currentSessionId;
    // Use activeAgentDetails for agentId, agentFullName, agentIcon, pdfSourceToSend
    let agentId = activeAgentDetails?.id || null;
    let agentFullName = activeAgentDetails?.fullName || null;
    let agentIcon = activeAgentDetails?.icon || null;
    let pdfSourceToSend = activeAgentDetails?.pdfSource || null;

    // Only apply agent mention regex if not in a dedicated agent chat (i.e., activeAgentDetails is null)
    if (!activeAgentDetails) { 
      const agentMentionRegex = /^@([^\s]+(?:\s[^\s]+)*)\s*(.*)$/;
      const agentMentionMatch = messageToSend.match(agentMentionRegex);

      if (agentMentionMatch) {
        const mentionedAgentName = agentMentionMatch[1];
        const matchedAgent = currentAgents.find(agent => 
          agent.fullName.toLowerCase() === mentionedAgentName.toLowerCase()
        );
        if (matchedAgent) {
          agentId = matchedAgent.id;
          agentFullName = matchedAgent.fullName;
          agentIcon = matchedAgent.icon;
          pdfSourceToSend = matchedAgent.pdfSource;
        } else {
          console.warn(`Unknown agent mentioned: @${mentionedAgentName}`);
        }
      }
    }

    // Construct userMessage with agent details, even if null
    const userMessage = {
      sender: 'user',
      content: String(messageToSend),
      id: tempMessageId,
      agentId: agentId,
      agentName: agentFullName,
      agentIcon: agentIcon,
    };

    console.log(`User message object before adding to state:`, userMessage);
    setMessages(msgs => [...msgs, userMessage]);
    setChatStarted(true);

    try {
      if (!sessionId) {
        const sessionRes = await fetch(`${BACKEND_BASE}/sessions`, { method: 'POST' });
        if (!sessionRes.ok) throw new Error(`Failed to create new session: ${sessionRes.status}`);
        const newSessionId = await startNewSession(); // Get new session ID
        sessionId = newSessionId; // Use the new session ID

        const res = await fetch(`${BACKEND_BASE}/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: messageToSend, userName: userName, agentId: agentId, pdfSource: pdfSourceToSend })
        });

        if (res.ok) {
          const data = await res.json();
          console.log('Backend response data:', data);
          const assistantContent = data && data.response !== undefined ? String(data.response) : 'Error: Could not retrieve response from backend.';
          const assistantAgentId = data.metadata && data.metadata.agent_id ? data.metadata.agent_id : null;

          // Find the full agent name and icon from the agentList based on assistantAgentId
          const responseAgent = currentAgents.find(agent => agent.id === assistantAgentId);
          const assistantAgentFullName = responseAgent ? responseAgent.fullName : null;
          const assistantAgentIcon = responseAgent ? responseAgent.icon : null;

          setMessages([userMessage, { sender: 'assistant', content: assistantContent, agentId: assistantAgentId, agentName: assistantAgentFullName, agentIcon: assistantAgentIcon }]);
          if (data && data.session) {
            setSessions(sessions => sessions.map(session =>
              session.id === data.session.id ? data.session : session
            ));
          }
        } else {
          const errorData = await res.json();
          console.error('Backend error response:', errorData);
          throw new Error(errorData.error || `Failed to send message: ${res.status}`);
        }
      } else {
        const res = await fetch(`${BACKEND_BASE}/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: messageToSend, userName: userName, agentId: agentId, pdfSource: pdfSourceToSend })
        });

        if (res.ok) {
          const data = await res.json();
          console.log('Backend response data:', data);
          const assistantContent = data && data.response !== undefined ? String(data.response) : 'Error: Could not retrieve response from backend.';
          const assistantAgentId = data.metadata && data.metadata.agent_id ? data.metadata.agent_id : null;

          // Find the full agent name and icon from the agentList based on assistantAgentId
          const responseAgent = currentAgents.find(agent => agent.id === assistantAgentId);
          const assistantAgentFullName = responseAgent ? responseAgent.fullName : null;
          const assistantAgentIcon = responseAgent ? responseAgent.icon : null;

          setMessages(msgs => [...msgs, { sender: 'assistant', content: assistantContent, agentId: assistantAgentId, agentName: assistantAgentFullName, agentIcon: assistantAgentIcon }]);
          if (data && data.session) {
            setSessions(sessions => sessions.map(session =>
              session.id === data.session.id ? data.session : session
            ));
          }
        } else {
          const errorData = await res.json();
          console.error('Backend error response:', errorData);
          throw new Error(errorData.error || `Failed to send message: ${res.status}`);
        }
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setMessages(msgs => [...msgs, { sender: 'assistant', content: `Sorry, there was an error: ${err.message}` }]);
    } finally {
      setLoading(false);
      setIsTyping(false);
      if (inputRef.current) inputRef.current.focus();
    }
  };

  const handleInputKeyDown = (e) => {
    // If Enter is pressed and Shift is NOT pressed, and not loading, send the message
    if (e.key === 'Enter' && !e.shiftKey && !loading) {
      e.preventDefault(); // Prevent default form submission
      handleSend();
    } else if (e.key === 'Enter' && e.shiftKey) {
      // If Shift + Enter is pressed, allow newline
      // Default browser behavior for Shift+Enter in textarea is usually newline,
      // but we prevent default Enter behavior above, so ensure it's allowed here.
      // For an <input>, we'd need to manually insert '\n', but switching to <textarea> simplifies this.
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
  const [interimTranscript, setInterimTranscript] = useState('');

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const sr = new window.webkitSpeechRecognition();
      sr.continuous = true;
      sr.interimResults = true;
      sr.lang = voiceLang; // Use the selected voice language

      sr.onstart = () => {
        setListening(true);
        console.log('Speech recognition started');
      };

      sr.onresult = (event) => {
        let finalTranscript = '';
        let currentInterim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            currentInterim += event.results[i][0].transcript;
          }
        }
        setInput(prevInput => prevInput + finalTranscript); // Append final transcript to current input
        inputRef.current.innerText = inputRef.current.innerText + finalTranscript; // Update contenteditable div
        setInterimTranscript(currentInterim);
        restoreSelection(inputRef.current, inputRef.current.innerText.length);
      };

      sr.onerror = (event) => {
        console.error('Speech recognition error:', event);
        setListening(false);
        setInterimTranscript('');
      };

      sr.onend = () => {
        setListening(false);
        setInterimTranscript('');
        console.log('Speech recognition ended');
      };
      recognitionRef.current = sr;
    } else {
      console.warn('webkitSpeechRecognition not available');
    }
  }, [voiceLang]); // Re-initialize if voiceLang changes

  const startListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error('Error starting speech recognition:', e);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const groupedSessions = groupSessionsByDate(sessions);

  const handleEditTitle = (session) => {
    setEditingSessionId(session.id);
    setEditingTitle(session.title);
  };

  const handleSaveTitle = async (sessionId) => {
    const res = await fetch(`${BACKEND_BASE}/sessions/${sessionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editingTitle })
    });

    if (res.ok) {
      setSessions(sessions => sessions.map(session =>
        session.id === sessionId ? { ...session, title: editingTitle } : session
      ));
      setEditingSessionId(null);
      setEditingTitle('');
    } else {
      console.error("Error updating session title");
    }
  };

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

  const handleAgentDataChange = useCallback((updatedAgentsData) => {
    // Update the currentAgents state with the new data
    const newAgentList = updatedAgentsData.map(agent => ({
      id: agent.agentId,
      name: agent.agentId,
      fullName: agent.name,
      iconType: agent.iconType,
      icon: getIconComponent(agent.iconType),
      pdfSource: agent.pdfSource
    }));
    setCurrentAgents(newAgentList);
  }, []);

  const handleStartChatWithAgent = async (agentId) => {
    // Find the agent in the potentially updated list
    const agent = currentAgents.find(a => a.id === agentId);
    if (agent) {
      setCurrentView('chat');
      // Start a new session with the specified agent. startNewSession handles resetting states.
      const newSessionId = await startNewSession(); // newSessionId will now be used for localStorage

      // Explicitly set activeAgentDetails and persist agentId for the new dedicated session
      setActiveAgentDetails(agent); // Set the full agent object
      localStorage.setItem(`sessionAgent_${newSessionId}`, agentId); // Persist agent ID with new session ID

      // Clear input as it's a dedicated chat, no need for @mention prefix
      if (inputRef.current) {
        inputRef.current.innerText = '';
        inputRef.current.focus();
      }
    } else {
      console.error("Agent not found:", agentId);
    }
  };

  // Function to handle opening a PDF link
  const handleOpenPdfLink = (e, href) => {
    e.preventDefault();
    
    try {
      // Parse the full HTTP URL generated by renderAssistantContent
    const url = new URL(href);
      
      // Extract the filename from the pathname (e.g., /pdfs/DPDP_act.pdf -> DPDP_act.pdf)
      const pdfFilename = url.pathname.split('/').pop();
      
      // Parse hash parameters for page and section
      const hashParams = new URLSearchParams(url.hash.substring(1));
      const pdfPage = hashParams.get('page');
      const pdfSection = hashParams.get('section');
    
      console.log('Opening PDF:', { pdfFilename, pdfPage, pdfSection });
      
      // Construct the URL for the PDF viewer, using the correct filename
      const pdfViewerUrl = `${BACKEND_BASE}/pdfs/${pdfFilename}`;
      const pageParam = pdfPage ? `#page=${pdfPage}` : '';
      // Encode the section parameter for the URL if it exists
      const sectionParam = pdfSection ? `${pageParam ? '&' : '#'}section=${encodeURIComponent(pdfSection)}` : '';
      
      // Open PDF in a new window
      window.open(`${pdfViewerUrl}${pageParam}${sectionParam}`, '_blank');
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
              {messages.length === 0 && !chatStarted && !loading && !activeAgentDetails && (
                <div className="welcome-center-outer">
                  <div className="welcome-center-area">
                    <div className="welcome-logo">
                      <img src="/unified-knowledge-platform.png" alt="Logo" className="welcome-logo-img" />
                    </div>
                    <div className="welcome-greeting-area">
                      <div className="welcome-hi-user">Hi {userName || 'User'},</div>
                      <div className="welcome-headline">Welcome to <span className="welcome-app-name">{APP_NAME}</span></div>
                    </div>
                    <div className="welcome-subtitle" style={{ maxWidth: '600px', textAlign: 'center' }}>
                      Unlock insights from internal documents with our intelligent AI Assistant, transforming complex information into clear, actionable knowledge.
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
                  </div>
                </div>
              )}

              {(messages.length > 0 || chatStarted || loading) && (
                <div id="middle-chatbox-container">
                  {activeAgentDetails && ( // Display agent name at the top if dedicated chat using activeAgentDetails
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
                              {msg.agentName && (
                                <div className="agent-info-display">
                                  {msg.agentIcon && <span className="agent-info-icon">{msg.agentIcon}</span>}
                                  <span className="agent-info-name">{msg.agentName}</span>
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
                                return renderAssistantContent(content);
                              })()}
                              <button
                                className="voice-btn"
                                title="Read aloud"
                                onClick={() => handleSpeak(typeof msg.content === 'string' ? msg.content : String(msg.content))}
                                style={{ marginLeft: 10, background: 'none', border: 'none', cursor: isSpeaking ? 'not-allowed' : 'pointer', color: isSpeaking ? '#10B981' : '#bbb' }}
                                disabled={isSpeaking}
                              >
                                <FaVolumeUp size={18} />
                              </button>
                              {isSpeaking && (
                                <button
                                  className="voice-stop-btn"
                                  title="Stop reading"
                                  onClick={handleStopSpeak}
                                  style={{ marginLeft: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444' }}
                                >
                                  Stop
                                </button>
                              )}
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
                                  {/* Ensure icon is always rendered from iconType via currentAgents */}
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
                      <div className="bubble assistant" >
                        {console.log('isTyping:', isTyping)}
                        <DigitalBrainLoader isLoading={isTyping} />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>
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
                  placeholder="Type your question..."
                  onInput={e => {
                    const div = e.target;
                    const savedCaretOffset = saveSelection(div);
                    let plainText = div.innerText; // Get plain text content

                    // Update the input state for send button and other logic that might depend on it
                    setInput(plainText);

                    // Only allow agent mention features if not in a dedicated agent chat
                    if (!activeAgentDetails) {
                      // Dynamically build regex for highlighting based on currentAgents for input field
                      const agentNamesForInputRegex = currentAgents.map(agent => 
                        agent.fullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                      ).join('|');
                      // This regex specifically matches @ followed by a full agent name, optionally followed by a space
                      const dynamicHighlightRegexInput = new RegExp(`@(${agentNamesForInputRegex})(?=[\s\u00A0]|$)`, 'gi');

                      // Highlight agent mentions in the input field
                      let highlightedHtml = plainText.replace(dynamicHighlightRegexInput, '<span class="agent-mention">$&</span>');

                      // Sanitize the HTML before setting it back
                      const cleanHtml = DOMPurify.sanitize(highlightedHtml, {
                          ADD_TAGS: ['span'],
                          ADD_ATTR: ['class']
                      });
                      div.innerHTML = cleanHtml;
                      
                      // Restore cursor position
                      restoreSelection(div, savedCaretOffset);

                      // Logic for agent dropdown and strict validation
                      if (plainText.includes('@')) {
                        const lastAtIndex = plainText.lastIndexOf('@');
                        const mentionPart = plainText.substring(lastAtIndex + 1); // Get text after last @

                        const matchedAgent = currentAgents.find(agent => 
                          agent.fullName.toLowerCase() === mentionPart.toLowerCase().trim()
                        ); 

                        if (matchedAgent) {
                          const afterAgentName = plainText.substring(lastAtIndex + 1 + matchedAgent.fullName.length);
                          // Case 1: User typed something immediately after the full agent name without a space.
                          // We should add a space and preserve the rest of the input.
                          if (afterAgentName.length > 0 && !/^[\s\u00A0]*$/.test(afterAgentName)) {
                            const correctedPlainText = plainText.substring(0, lastAtIndex) + `@${matchedAgent.fullName} ` + afterAgentName.trimStart();
                            div.innerText = correctedPlainText;
                            setInput(correctedPlainText);
                            restoreSelection(div, correctedPlainText.length);
                            setShowAgentDropdown(false);
                            setFilteredAgents([]);
                            return;
                          }
                          // Case 2: User just finished typing the full agent name, no space yet.
                          // We need to add a space if the current text ends with the agent mention
                          // and doesn't already end with a space.
                          if (!plainText.endsWith(' ') && plainText.endsWith(`@${matchedAgent.fullName}`))
                          {
                             const correctedPlainText = plainText + ' ';
                             div.innerText = correctedPlainText;
                             setInput(correctedPlainText);
                             restoreSelection(div, correctedPlainText.length);
                             setShowAgentDropdown(false); // Hide dropdown as agent is fully selected
                             setFilteredAgents([]);
                             return;
                          }
                        }

                        // Filter against currentAgents for dynamic updates (for dropdown)
                        const currentFilteredAgents = currentAgents.filter(agent =>
                          agent.fullName.toLowerCase().startsWith(mentionPart.toLowerCase())
                        );
                        setFilteredAgents(currentFilteredAgents);
                        setShowAgentDropdown(currentFilteredAgents.length > 0); // Show if there are matches
                      } else {
                        setShowAgentDropdown(false);
                        setFilteredAgents([]);
                      }
                    } else { // If activeAgentDetails is set, no @mention features
                      // Ensure the input field only contains plain text without highlighting
                      div.innerHTML = DOMPurify.sanitize(plainText);
                      restoreSelection(div, savedCaretOffset);
                      setShowAgentDropdown(false);
                      setFilteredAgents([]);
                    }
                  }}
                  onKeyDown={handleInputKeyDown}
                  disabled={loading}
                ></div>
                {showAgentDropdown && filteredAgents.length > 0 && (
                  <div className="agent-dropdown">
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
                        }}
                      >
                        @{agent.fullName} {/* Display full name in dropdown */}
                      </div>
                    ))}
                  </div>
                )}
                <button
                  className="lang-toggle-btn"
                  type="button"
                  title={voiceLang === 'en-US' ? 'Switch to Hindi' : 'Switch to English'}
                  onClick={() => setVoiceLang(voiceLang === 'en-US' ? 'hi-IN' : 'en-US')}
                  style={{
                    background: '#007BFF',
                    color: '#F9FAFB',
                    border: 'none',
                    borderRadius: '8px',
                    width: 44,
                    height: 44,
                    marginLeft: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: 16,
                    transition: 'background 0.2s, color 0.2s',
                  }}
                  disabled={loading}
                >
                  {voiceLang === 'en-US' ? 'EN' : 'HI'}
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
                <button
                  className="send-btn send-arrow"
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  title="Send"
                  type="button"
                >
                  <FaPaperPlane color={input.trim() ? '#3B82F6' : '#6B7280'} size={24} />
                </button>
              </div>
            </div>
          </>
        )}
        {currentView === 'knowledge-sources' && (
          <KnowledgeSourcesView 
            onStartChatWithAgent={handleStartChatWithAgent} 
            onAgentDataChange={handleAgentDataChange}
          />
        )}

        {/* Render PdfViewer when currentView is 'pdf-viewer' */}
        {currentView === 'pdf-viewer' && viewedPdfUrl && (
          <div className="pdf-viewer-container">
             <button onClick={handleClosePdfViewer} style={{ marginBottom: '10px' }}>Close PDF</button>
            <PDFViewer
              pdfUrl={viewedPdfUrl}
              pageNumber={viewedPdfPage}
              highlightText={viewedHighlightText}
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
                          {editingSessionId === session.id ? (
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onBlur={() => handleSaveTitle(session.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveTitle(session.id);
                                }
                              }}
                              className="chat-history-input"
                              autoFocus
                            />
                          ) : (
                          <span className="chat-history-title">{String(session.title)}</span>
                          )}
                          <button className="delete-chat-btn" onClick={e => { e.stopPropagation(); handleDeleteSession(session.id); }}><FaTrash /></button>
                          {editingSessionId !== session.id && (
                            <button className="edit-chat-btn" onClick={e => { e.stopPropagation(); handleEditTitle(session); }}>✏️</button>
                          )}
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
    </div>
  );
}

export default App; 
