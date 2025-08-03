import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Routes, Route, useLocation } from 'react-router-dom';
import './App.css';
import './styles/backgrounds.css';
import './styles/modal.css';
import { FaPlus, FaPaperPlane, FaRegFileAlt, FaPaperclip, FaVolumeUp, FaMicrophone, FaChevronLeft, FaChevronRight, FaTrash, FaRegCommentAlt, FaCube, FaHighlighter, FaSun, FaMoon, FaHome, FaShieldAlt, FaGavel, FaFileAlt, FaListUl, FaCopy, FaFileExport, FaGlobe, FaFeatherAlt, FaRobot, FaBrain, FaTimes, FaSave, FaStop, FaFolderOpen, FaFolderPlus, FaEdit, FaThumbsUp, FaThumbsDown, FaEllipsisH, FaSearch, FaFileImage, FaFilePdf, FaEye, FaFileWord, FaFileExcel, FaFileAudio, FaFile, FaChartLine, FaExternalLinkAlt, FaLightbulb, FaBalanceScale, FaClipboardList } from 'react-icons/fa';
import { canAccessDeveloperOptions, getUserRoleInfo } from './utils/permissions';
import { Image as ReactImage } from 'react-image';
import ReactAudioPlayer from 'react-audio-player';
import HomeView from './components/HomeView';
import KnowledgeSourcesView from './components/KnowledgeSourcesView';
import PDFViewer from './components/PDFViewer';
import remarkGfm from 'remark-gfm';
import DigitalBrainLoader from './components/AnimatedLogo';
import GlowingSphere from './components/cursorfollow';
import DOMPurify from 'dompurify';
import { getIconComponent } from './utils/iconUtils';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useSpeechSynthesis } from './hooks/useSpeechSynthesis';
import { sarvamTranslate } from './utils/sarvamTranslate';
import SupportedLanguages from './components/SupportedLanguages';
import AgentOverlay from './components/AgentOverlay';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell } from "docx";
import { marked } from "marked";
import MyProjectsView from './views/MyProjectsView';
import Modal from './components/Modal';
import FeedbackModalContent from './components/FeedbackModalContent';
import LoginView from './views/LoginView';
import ProfileModal from './components/ProfileModal';
import FeedbackDashboard from './components/FeedbackDashboard';
import MonitoringDashboard from './components/MonitoringDashboard';
import DeveloperDashboard from './components/DeveloperDashboard';
import { renderAsync as renderDocxPreview } from 'docx-preview';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

// Add at the top, before the App component
const getOrCreateUserId = () => {
  let uid = localStorage.getItem('userId');
  if (!uid) {
    uid = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('userId', uid);
  }
  return uid;
};
const userId = getOrCreateUserId();

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

const BACKEND_BASE = process.env.REACT_APP_BACKEND_BASE || 'http://localhost:5000';
const APP_NAME = 'Unified Knowledge Platform';
const FAVICON_URL = '/unified-knowledge-platform.png';

// Add a translation for the assistant prefix
const ASSISTANT_PREFIX_EN = 'Thanks for asking the question. As per the information available with me.';
const ASSISTANT_PREFIX_HI = 'प्रश्न पूछने के लिए धन्यवाद। मेरे पास उपलब्ध जानकारी के अनुसार,';

// Add quick chat options with associated icons - specific and actionable
const QUICK_OPTIONS = [
  { label: 'Summarize Content', value: 'Please provide a comprehensive summary of the main points and key information from this content.', icon: <FaFileAlt /> },
  { label: 'Extract Key Points', value: 'What are the most important key points, main takeaways, and critical insights from this content?', icon: <FaListUl /> },
  { label: 'Find Important Sections', value: 'Please identify and highlight the most important sections, critical information, and key details in this content.', icon: <FaHighlighter /> },
  { label: 'Simplify Explanation', value: 'Please explain the main concepts and ideas from this content in simple, easy-to-understand terms.', icon: <FaLightbulb /> },
  { label: 'Compare Concepts', value: 'Please compare and contrast the different concepts, ideas, or approaches mentioned in this content.', icon: <FaBalanceScale /> },
  { label: 'Provide Examples', value: 'Please provide specific examples, use cases, and practical applications related to the concepts in this content.', icon: <FaClipboardList /> },
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

function App() {
  const [sessions, setSessions] = useState([]);
  const [csvPreview, setCsvPreview] = useState(null);
  const [docxPreviewNode, setDocxPreviewNode] = useState(null);
  const [previewPdfFile, setPreviewPdfFile] = useState(null);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isDedicatedChat, setIsDedicatedChat] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [chatAttachment, setChatAttachment] = useState(null);
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
  const location = useLocation();
  const [userName, setUserName] = useState(() => {
    const userData = JSON.parse(localStorage.getItem('ukpUser'));
    return userData?.name || 'Dhruv Mendiratta';
  });
  const [userAvatar, setUserAvatar] = useState(() => {
    const userData = JSON.parse(localStorage.getItem('ukpUser'));
    const userEmail = userData?.email;
    
    // First try to get from userData.avatar
    if (userData?.avatar) {
      return userData.avatar;
    }
    
    // If not found, try to get from profilePhoto_key
    if (userEmail) {
      const profilePhotoKey = `profilePhoto_${userEmail}`;
      const savedPhoto = localStorage.getItem(profilePhotoKey);
      if (savedPhoto) {
        return savedPhoto;
      }
    }
    
    return null;
  });
  const [userEmail, setUserEmail] = useState(() => {
    const userData = JSON.parse(localStorage.getItem('ukpUser'));
    return userData?.email || 'dhruv.mendiratta4@gmail.com';
  });
  const [editingUserName, setEditingUserName] = useState(false);
  const userNameInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [currentView, setCurrentView] = useState('home');
  const [showWelcome, setShowWelcome] = useState(true);
  const [editingAssistantName, setEditingAssistantName] = useState(false);
  const assistantNameInputRef = useRef(null);
  const [preferredModel, setPreferredModel] = useState(() => localStorage.getItem('preferredModel') || modelOptions[0]?.name || 'Gemini 2.5 Flash');

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

  // Add new state for source opener modal
  const [sourcePreview, setSourcePreview] = useState({ type: null, url: null, name: null, docxHtml: null, csvRows: null, loading: false, error: null });

  // Add at the top, with other refs
  const userDetailsMenuRef = useRef(null);

  const [inputValue, setInputValue] = useState('');
  
  useEffect(() => {
    if (preferredModel) {
      localStorage.setItem('preferredModel', preferredModel);
    }
  }, [preferredModel]);

    useEffect(() => {
    if (preferredModel && preferredModel !== selectedModel) {
      setSelectedModel(preferredModel);
    }
  }, [preferredModel]);

  const handlePreferredModelChange = (modelName) => {
    setPreferredModel(modelName);
    localStorage.setItem('preferredModel', modelName);
    // Optionally update user profile in localStorage
    const userData = JSON.parse(localStorage.getItem('ukpUser')) || {};
    userData.preferredModel = modelName;
    localStorage.setItem('ukpUser', JSON.stringify(userData));
  };

// 1. Generalize the handler (move inside App)
const handleOpenSourceLink = (e, href, msg = null) => {
  e.preventDefault();
  try {
    const url = new URL(href);
    const filename = url.pathname.split('/').pop();
    fetch(href)
      .then(res => res.blob())
      .then(blob => {
        // Use blob.type if available, otherwise guess from extension
        let type = blob.type;
        if (!type || type === 'application/octet-stream') {
          const ext = filename.split('.').pop().toLowerCase();
          if (ext === 'pdf') type = 'application/pdf';
          else if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'].includes(ext)) type = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
          else if (['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(ext)) type = `audio/${ext}`;
          else if (ext === 'csv') type = 'text/csv';
          else if (ext === 'docx') type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          else if (ext === 'txt') type = 'text/plain';
        }
        const file = new File([blob], filename, { type });
        setPreviewPdfFile(file);
        setCsvPreview(null);
        setDocxPreviewNode(null);
      });
  } catch (error) {
    console.error('Error handling source link:', error);
  }
};

function renderAssistantContent(content, handleOpenSourceLink, sourceHighlights = null) {
  // Ensure content is a string before processing
  let stringContent = String(content);

  // Normalize bolded markdown links: **[filename.ext]** (filename.ext) or **[filename.ext]**(filename.ext)
  stringContent = stringContent.replace(/\*\*\[([^\]]+)\]\*\*\s*\(([^)]+)\)/g, (match, label, p1) => `(${p1.trim()})`);

  // Normalize markdown links with optional spaces: [filename.ext] (filename.ext) or [filename.ext](filename.ext)
  stringContent = stringContent.replace(/\[[^\]]+\]\s*\(([^)]+)\)/g, (match, p1) => `(${p1.trim()})`);

  // NEW: Convert any (filename.ext) to [filename.ext](filename.ext) for all file types
  stringContent = stringContent.replace(/\(([^\s()]+\.[\w]+)\)/g, (match, p1) => `[${p1}](${p1})`);

  // Replace all raw pdf://... or @pdf://... links with just (<url>) (no markdown link, no brackets, no label)
  stringContent = stringContent.replace(/@?pdf:\/\/[\w\-.]+\.[\w]+(?:\/page\/\d+)?(?:#section=[^&\s)]+)?(?:&highlight=[^\s)]+)?/g, match => {
    // Remove leading @ if present
    const cleanLink = match.replace(/^@/, '');
    // Render as just (<url>)
    return `(${cleanLink})`;
  });

  // Add: Replace all raw pdf://... links with markdown links
  const pdfRawLinkPattern = /@?pdf:\/\/[\w\-.]+\.pdf(?:\/page\/\d+)?(?:#section=[^&\s)]+)?(?:&highlight=[^\s)]+)?/g;
  stringContent = stringContent.replace(pdfRawLinkPattern, (match) => {
    return `${match}`;
  });

  const lines = stringContent.split(/\n/);
  const processedLines = lines.map(line => {
    // Remove any previous source:[]() matches that might have been generated by old logic
    const cleanedLine = line.replace(/source:\[([^\]]+)\]\((.*?)\)/gi, (match, p1) => `**Sources:** ${p1}`);

    // Remove lines that are just () or ()()
    if (cleanedLine.trim() === '()' || cleanedLine.trim() === '()()') {
      return '';
    }

    // Regex to find parenthesized pdf:// links, capturing the content inside
    // Now also capture highlight param
    const pdfLinkPattern = /\(@?pdf:\/\/([^)]+)\)/g; // Matches (pdf://...) and captures content inside parentheses

    if (cleanedLine.match(pdfLinkPattern)) {
      // Replace all (pdf://...) links in the line with a markdown link format that ReactMarkdown will process
      const processedLine = cleanedLine.replace(pdfLinkPattern, (fullMatch, contentInsideParentheses) => {
        // contentInsideParentheses will be like "filename.pdf/page/N#section=Section_X&highlight=..."
        // Parse filename, page, section, highlight
        const urlParts = contentInsideParentheses.match(/([^/]+)(?:\/page\/(\d+))?(?:#section=([^&)]*))?(?:&highlight=([^)]*))?/);
        if (urlParts) {
          const [, filename, page, section, highlight] = urlParts;
          let linkUrl = `${BACKEND_BASE}/pdfs/${filename}`;
          const ext = filename.split('.').pop().toLowerCase();
          let hash = '';
          if (ext === 'pdf') {
            if (page) hash += `#page=${page}`;
            if (section) hash += `${hash ? '&' : '#'}section=${encodeURIComponent(section)}`;
            if (highlight) hash += `${hash ? '&' : '#'}highlight=${encodeURIComponent(highlight)}`;
          }
          // For non-PDFs, do not add section or highlight
          linkUrl += hash;
          // Always use pdf://filename for the button/link, no section/highlight for non-PDFs
          return `[](\u200B)(${linkUrl})`;
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
      // Only handle links to our backend /pdfs/ directory
      const isSourceLink = cleanHref && cleanHref.startsWith(BACKEND_BASE + '/pdfs/');
      // NEW: If the href is just a filename (with or without spaces), treat it as a file in /pdfs/
      const filenameOnly = cleanHref &&
        !cleanHref.startsWith('http') &&
        !cleanHref.startsWith('/') &&
        !cleanHref.includes('://') &&
        /^[\w\-. ]+\.[\w]+$/.test(cleanHref.trim());
      if (isSourceLink || filenameOnly) {
        // If filenameOnly, build the full URL
        let fileUrl = cleanHref;
        if (filenameOnly) {
          fileUrl = `${BACKEND_BASE}/pdfs/${cleanHref.trim()}`;
        }
        // Parse filename and extension
        const url = new URL(fileUrl, window.location.origin);
        const filename = url.pathname.split('/').pop();
        const ext = filename.split('.').pop().toLowerCase();
        // PDF button logic
        if (ext === 'pdf') {
          return (
            <button
              type="button"
              aria-label={`Open PDF file: ${filename}`}
              onClick={e => handleOpenSourceLink(e, fileUrl, sourceHighlights)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 12px',
                margin: '2px',
                backgroundColor: '#d32f2f',
                color: 'white',
                border: 'none',
                borderRadius: '14px',
                fontSize: '0.95em',
                fontWeight: 500,
                cursor: 'pointer',
                boxShadow: '0 1px 4px #0001',
                transition: 'background 0.2s, color 0.2s',
                outline: 'none',
              }}
            >
              <FaFilePdf style={{ color: 'white', fontSize: 18 }} />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>{filename}</span>
            </button>
          );
        }
        // Non-PDF button logic
        // Color coding by type
        let bgColor = '#495057';
        let icon = <FaFile style={{ color: 'white', fontSize: 18 }} />;
        let type = 'other';
        if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'].includes(ext)) {
          bgColor = '#6c2eb7';
          icon = <FaFileImage style={{ color: 'white', fontSize: 18 }} />;
          type = 'image';
        } else if (['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(ext)) {
          bgColor = '#fbc02d';
          icon = <FaFileAudio style={{ color: 'white', fontSize: 18 }} />;
          type = 'audio';
        } else if (['doc', 'docx'].includes(ext)) {
          bgColor = '#1976d2';
          icon = <FaFileWord style={{ color: 'white', fontSize: 18 }} />;
          type = 'docx';
        } else if (['xls', 'xlsx', 'csv'].includes(ext)) {
          bgColor = '#388e3c';
          icon = <FaFileExcel style={{ color: 'white', fontSize: 18 }} />;
          type = 'spreadsheet';
        } else if (['txt'].includes(ext)) {
          bgColor = '#616161';
          icon = <FaFileAlt style={{ color: 'white', fontSize: 18 }} />;
          type = 'text';
        }
        return (
          <button
            type="button"
            aria-label={`Open file: ${filename}`}
            onClick={async e => {
              e.preventDefault();
              setSourcePreview({ type, url: null, name: filename, docxHtml: null, csvRows: null, loading: true, error: null });
              try {
                const res = await fetch(fileUrl);
                const blob = await res.blob();
                if (type === 'image') {
                  setSourcePreview({ type, url: URL.createObjectURL(blob), name: filename, loading: false });
                } else if (type === 'audio') {
                  setSourcePreview({ type, url: URL.createObjectURL(blob), name: filename, loading: false });
                } else if (type === 'spreadsheet') {
                  // Excel/CSV preview
                  if (['csv'].includes(ext)) {
                    // Use PapaParse for CSV
                    const reader = new FileReader();
                    reader.onload = (e) => {
                      const text = e.target.result;
                      const parsed = Papa.parse(text, { skipEmptyLines: true });
                      setSourcePreview({ type, csvRows: parsed.data, url: null, name: filename, loading: false });
                    };
                    reader.readAsText(blob);
                  } else {
                    // Use SheetJS for .xls/.xlsx
                    const reader = new FileReader();
                    reader.onload = (e) => {
                      const data = new Uint8Array(e.target.result);
                      const workbook = XLSX.read(data, { type: 'array' });
                      const sheetName = workbook.SheetNames[0];
                      const worksheet = workbook.Sheets[sheetName];
                      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                      setSourcePreview({ type, csvRows: rows, url: null, name: filename, loading: false });
                    };
                    reader.readAsArrayBuffer(blob);
                  }
                } else if (type === 'docx') {
                  // DOCX preview as HTML
                  const reader = new FileReader();
                  reader.onload = async (e) => {
                    try {
                      const arrayBuffer = e.target.result;
                      const container = document.createElement('div');
                      await renderDocxPreview(arrayBuffer, container);
                      setSourcePreview({ type, docxHtml: container.innerHTML, url: null, name: filename, loading: false });
                    } catch (err) {
                      setSourcePreview({ type, docxHtml: null, url: null, name: filename, loading: false, error: 'Failed to render DOCX.' });
                    }
                  };
                  reader.readAsArrayBuffer(blob);
                } else {
                  setSourcePreview({ type, url: URL.createObjectURL(blob), name: filename, loading: false });
                }
              } catch (err) {
                setSourcePreview({ type, url: null, name: filename, loading: false, error: 'Failed to load file.' });
              }
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              margin: '2px',
              backgroundColor: bgColor,
              color: 'white',
              border: 'none',
              borderRadius: '14px',
              fontSize: '0.95em',
              fontWeight: 500,
              cursor: 'pointer',
              boxShadow: '0 1px 4px #0001',
              transition: 'background 0.2s, color 0.2s',
              outline: 'none',
            }}
          >
            {icon}
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>{filename}</span>
          </button>
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

// Helper to get icon by file type
function getFileTypeIcon(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return <FaFilePdf style={{ color: '#d32f2f' }} />;
  if (name.endsWith('.doc') || name.endsWith('.docx')) return <FaFileWord style={{ color: '#1976d2' }} />;
  if (name.endsWith('.xls') || name.endsWith('.xlsx') || name.endsWith('.csv')) return <FaFileExcel style={{ color: '#388e3c' }} />;
  if (name.endsWith('.txt')) return <FaFileAlt style={{ color: '#616161' }} />;
  if (name.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/)) return <FaFileImage style={{ color: '#6c2eb7' }} />;
  if (name.match(/\.(mp3|wav|ogg|m4a|aac)$/)) return <FaFileAudio style={{ color: '#fbc02d' }} />;
          return <FaFile style={{ color: 'var(--text-secondary)' }} />;
}

// Helper to get file type for preview
function getFileType(file) {
  const name = file.name.toLowerCase();
  const type = file.type || '';
  if (type.startsWith('application/pdf') || name.endsWith('.pdf')) return 'pdf';
  if (type.includes('wordprocessingml') || name.endsWith('.doc') || name.endsWith('.docx')) return 'docx';
  if (type.startsWith('application/vnd.ms-excel') || type.startsWith('application/vnd.openxmlformats-officedocument.spreadsheetml') || type === 'text/csv' || name.endsWith('.xls') || name.endsWith('.xlsx') || name.endsWith('.csv')) return 'spreadsheet';
  if (type.startsWith('text/plain') || name.endsWith('.txt')) return 'text';
  if (type.startsWith('image/') || name.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/)) return 'image';
  if (type.startsWith('audio/') || name.match(/\.(mp3|wav|ogg|m4a|aac)$/)) return 'audio';
  return 'other';
}


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

  useEffect(() => {
    const storedAgent = localStorage.getItem('activeAgentDetails');
    const storedDedicated = localStorage.getItem('isDedicatedChat');
    if (storedAgent) {
      try {
        setActiveAgentDetails(JSON.parse(storedAgent));
      } catch {}
    }
    if (storedDedicated) {
      setIsDedicatedChat(storedDedicated === 'true');
    }
    setShowAgentDropdown(false);
    setFilteredAgents([]);
  }, []);

  // When switching to chat view, reset dropdown state and reload agents if needed
  useEffect(() => {
    if (currentView === 'chat') {
      setShowAgentDropdown(false);
      setFilteredAgents([]);
      // Optionally reload agents if needed (uncomment if agents are not always loaded)
      // fetchAgents();
    }
  }, [currentView]);
  
  useEffect(() => {
    const storedAgent = localStorage.getItem('activeAgentDetails');
    const storedDedicated = localStorage.getItem('isDedicatedChat');
    if (storedAgent) {
      try {
        setActiveAgentDetails(JSON.parse(storedAgent));
      } catch {}
    }
    if (storedDedicated) {
      setIsDedicatedChat(storedDedicated === 'true');
    }
    setShowAgentDropdown(false);
    setFilteredAgents([]);
  }, []);


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
        if (userDetailsMenuRef.current && !userDetailsMenuRef.current.contains(e.target)) {
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
              processedMsg.modelDisplayName = modelOption ? modelOption.name : null;
              processedMsg.modelDisplayIcon = modelOption ? modelOption.icon : null;
            }
          }
          return processedMsg;
        });
        setMessages(processedMessages);
        
        // Load existing feedback for these messages
        await loadExistingFeedback(processedMessages);
        
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
  
  const loadExistingFeedback = async (messages) => {
    try {
      const response = await fetch('http://localhost:5000/api/feedback');
      if (response.ok) {
        const allFeedback = await response.json();
        
        // Create a map of existing feedback by answerId
        const feedbackMap = {};
        allFeedback.forEach(feedback => {
          feedbackMap[feedback.message_id] = feedback;
        });
        
        // Update feedback state for messages that have existing feedback
        const newFeedbackState = {};
        messages.forEach(msg => {
          if (feedbackMap[msg.id]) {
            const existingFeedback = feedbackMap[msg.id];
            newFeedbackState[msg.id] = {
              rating: existingFeedback.feedback_type === 'positive' ? 'up' : 
                     existingFeedback.feedback_type === 'negative' ? 'down' : null,
              submitted: true,
              text: existingFeedback.feedback_text || '',
              stars: existingFeedback.rating || 0
            };
          }
        });
        
        setFeedbackState(prev => ({ ...prev, ...newFeedbackState }));
      }
    } catch (error) {
      console.error('Error loading existing feedback:', error);
    }
  };

  const startNewSession = async (agentIdToActivate = null) => {
    const userEmail = localStorage.getItem('userEmail') || 'anonymous@user.com';
    const res = await fetch(`${BACKEND_BASE}/sessions`, { 
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userEmail })
    });
    const session = await res.json();
    setSessions(sessions => [session, ...sessions]);
    setCurrentSessionId(session.id);
    setMessages([]);
    setChatStarted(false);
    setShowWelcome(true);
    setCurrentView('chat');
    // Persist the last selected agent unless a new one is chosen
    if (agentIdToActivate) {
      const agent = currentAgents.find(a => a.id === agentIdToActivate);
      if (agent) setActiveAgentDetails(agent);
    } else if (activeAgentDetails) {
      setActiveAgentDetails(activeAgentDetails); // Re-apply the last agent
    }
    localStorage.removeItem('isDedicatedChat');
    return session.id;
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
        const userEmail = localStorage.getItem('userEmail') || 'anonymous@user.com';
        const sessionRes = await fetch(`${BACKEND_BASE}/sessions`, { 
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userEmail })
        });
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
          body: JSON.stringify({ message: value, userName: userName, userEmail: userEmail, model: modelBackendName })
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
    setInputValue('');
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

    // Fix regex for agent mention
    const agentMentionRegex = /^@([\w\s]+)\s*(.*)$/;
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

    // If no session, create one and add the message to the new chat immediately
    if (!sessionId) {
      const newSession = await startNewSession();
      sessionId = newSession.id || newSession; // startNewSession may return id or session object
      setCurrentSessionId(sessionId);
      setMessages([userMessage]);
      setChatStarted(true);
      setShowWelcome(false);
    } else {
      setMessages(msgs => [...msgs, userMessage]);
      setChatStarted(true);
    }

    try {
      const modelBackendName = modelOptions.find(m => m.name === selectedModel)?.backendName || 'gemini';
      abortControllerRef.current = new AbortController();
      const userEmail = localStorage.getItem('userEmail') || 'anonymous@user.com';
      const res = await fetch(`${BACKEND_BASE}/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: translatedInput,
          userName: userName, 
          userEmail: userEmail,
          agentId: agentIdToSend,
          pdfSource: pdfSourceToSend,
          lang: detectedLang,
          model: modelBackendName // <-- always include model
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

        setMessages(msgs => {
          // If this is a new session, replace the messages; otherwise, append
          if (!currentSessionId) {
            return [userMessage, { sender: 'assistant', content: assistantContent, agentId: assistantAgentId, agentName: assistantAgentFullName, agentIcon: assistantAgentIcon, lang: detectedLang, modelUsed: data.model_used, modelDisplayName: data.model_used ? modelOptions.find(m => m.backendName === data.model_used).name : null, modelDisplayIcon: data.model_used ? modelOptions.find(m => m.backendName === data.model_used).icon : null }];
          } else {
            return [...msgs, { sender: 'assistant', content: assistantContent, agentId: assistantAgentId, agentName: assistantAgentFullName, agentIcon: assistantAgentIcon, lang: detectedLang, modelUsed: data.model_used, modelDisplayName: data.model_used ? modelOptions.find(m => m.backendName === data.model_used).name : null, modelDisplayIcon: data.model_used ? modelOptions.find(m => m.backendName === data.model_used).icon : null }];
          }
        });
        if (data && data.session) {
          setSessions(sessions => sessions.map(session =>
            session.id === data.session.id ? data.session : session
          ));
        }
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || `Failed to send message: ${res.status}`);
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
      const userEmail = localStorage.getItem('userEmail') || 'anonymous@user.com';
      const response = await fetch(`${BACKEND_BASE}/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ userEmail }),
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
      const reader = new FileReader();
      reader.onloadend = () => {
        setUserAvatar(reader.result);
        // Save to ukpUser in localStorage
        const userData = JSON.parse(localStorage.getItem('ukpUser')) || {};
        userData.avatar = reader.result;
        localStorage.setItem('ukpUser', JSON.stringify(userData));
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
    // Save to ukpUser in localStorage
    const userData = JSON.parse(localStorage.getItem('ukpUser')) || {};
    userData.name = userName;
    localStorage.setItem('ukpUser', JSON.stringify(userData));
    setEditingUserName(false);
  };

  const handleCancelUserNameEdit = () => {
    setUserName(localStorage.getItem('userName') || 'User');
    setEditingUserName(false);
  };

  // Add a handler for changing password
  const handleChangePassword = () => {
    const newPassword = prompt('Enter new password:');
    if (newPassword && newPassword.length >= 4) {
      const userData = JSON.parse(localStorage.getItem('ukpUser')) || {};
      userData.password = newPassword;
      localStorage.setItem('ukpUser', JSON.stringify(userData));
      alert('Password updated!');
    } else if (newPassword) {
      alert('Password must be at least 4 characters.');
    }
    setShowUserDetailsMenu(false);
  };

  // Voice input functionality
  const startListening = async () => {
    if (listening) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let recorder;
      let mimeType = '';
      if (MediaRecorder.isTypeSupported('audio/ogg')) {
        mimeType = 'audio/ogg';
      } else {
        mimeType = '';
      }
      recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      setMediaRecorder(recorder);
      setAudioChunks([]);

      recorder.ondataavailable = (event) => {
        setAudioChunks((prev) => [...prev, event.data]);
      };

      recorder.onstop = async () => {
        const extension = mimeType === 'audio/ogg' ? 'ogg' : 'webm';
        const audioBlob = new Blob(audioChunks, { type: mimeType || 'audio/webm' });
        setAudioChunks([]); // Clear chunks after stopping

        const formData = new FormData();
        formData.append('audio', audioBlob, `recording.${extension}`);

        try {
          const response = await fetch(`${BACKEND_BASE}/whisper/stt`, {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`STT failed: ${response.statusText}`);
          }

          const data = await response.json();
          setInput(data.transcript); // Set the transcribed text to input
          setInputValue(data.transcript); // Update inputValue state for send button
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

  const handleAgentDataChange = useCallback((updatedAgentsData, shouldRefresh = false) => {
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
    if (shouldRefresh) setAgentRefreshKey(k => k + 1);
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

  // Function to handle navigation to My Projects view
  const handleNavigateToMyProjects = () => {
    setCurrentView('my-projects');
    setRightCollapsed(true); // Collapse right sidebar when viewing my projects
    // Also clear any viewed PDF
    setViewedPdfUrl(null);
    setViewedPdfPage(null);
    setViewedHighlightText(null);
  };

  // Function to handle opening a PDF link
  const handleOpenPdfLink = (e, href, msg = null) => {
    e.preventDefault();
    try {
      const url = new URL(href);
      const pdfFilename = url.pathname.split('/').pop();
      const hashParams = new URLSearchParams(url.hash.substring(1));
      const pdfPage = hashParams.get('page');
      const pdfSection = hashParams.get('section');
      let highlightTexts = null;
      if (msg && msg.content) {
        // Split the answer bubble text into sentences for highlighting
        const decoded = decodeURIComponent(msg.content);
        // Split into sentences using regex (handles ., !, ? as sentence enders)
        const sentences = decoded.match(/[^.!?\n]+[.!?]?/g)?.map(s => s.trim()).filter(Boolean) || [decoded];
        highlightTexts = sentences;
      } else {
        let pdfHighlight = hashParams.get('highlight');
        if (pdfHighlight && pdfHighlight.trim()) {
          const decoded = decodeURIComponent(pdfHighlight);
          highlightTexts = decoded.split('|||').map(s => s.trim()).filter(Boolean);
        } else {
          highlightTexts = ["No answer provided"];
        }
      }
      const pdfViewerUrl = `${BACKEND_BASE}/pdfs/${pdfFilename}`;
      setViewedPdfUrl(pdfViewerUrl);
      setViewedPdfPage(pdfPage);
      setViewedHighlightText(null);
      setCurrentView('pdf-viewer');
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
    const userEmail = localStorage.getItem('userEmail') || 'anonymous@user.com';
    const res = await fetch(`${BACKEND_BASE}/sessions`, { 
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userEmail })
    });
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
      localStorage.setItem('activeAgentDetails', JSON.stringify(agent));
    }
    // Clear input as it's a dedicated chat, no need for @mention prefix
    if (inputRef.current) {
      inputRef.current.innerText = '';
      inputRef.current.focus();
    }
    setInputValue('');
    setIsDedicatedChat(true);
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
    const html = marked.parse(content);
    const parser = new DOMParser();
    const docHtml = parser.parseFromString(html, "text/html");
    const body = docHtml.body;

    function parseNode(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        if (!node.textContent.trim()) return null;
        return new TextRun(node.textContent);
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return null;

      switch (node.tagName) {
        case "STRONG":
          return new TextRun({ text: node.textContent, bold: true });
        case "U":
        case "INS":
          return new TextRun({ text: node.textContent, underline: {} });
        case "EM":
        case "I":
          return new TextRun({ text: node.textContent, italics: true });
        case "LI":
          return new Paragraph({
            children: Array.from(node.childNodes).map(parseNode).filter(Boolean),
            bullet: { level: 0 }
          });
        case "OL":
        case "UL":
          return Array.from(node.children).map(parseNode).filter(Boolean);
        case "P":
          return new Paragraph({
            children: Array.from(node.childNodes).map(parseNode).filter(Boolean)
          });
        case "TABLE":
          return new Table({
            rows: Array.from(node.rows).map(row =>
              new TableRow({
                children: Array.from(row.cells).map(cell =>
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: Array.from(cell.childNodes).map(parseNode).filter(Boolean)
                      })
                    ]
                  })
                )
              })
            )
          });
        case "TR":
        case "TD":
        case "TH":
          return null;
        case "BR":
          return new TextRun({ text: "\n" });
        default:
          return new Paragraph({
            children: Array.from(node.childNodes).map(parseNode).filter(Boolean)
          });
      }
    }

    function flatten(arr) {
      return arr.reduce((acc, val) => acc.concat(Array.isArray(val) ? flatten(val) : val), []);
    }

    const docElements = flatten(Array.from(body.childNodes).map(parseNode).filter(Boolean));
    const cleanDocElements = docElements.filter(Boolean);

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: cleanDocElements,
        },
      ],
    });

    Packer.toBlob(doc).then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-response-${new Date().toISOString()}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
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
      name: 'Mistral AI',
      icon: <img src="/mistral.png" alt="Mistral AI" className="model-icon-img" />,
      description: "Mistral AI's next-generation open LLM. Fast, efficient, multilingual, and ideal for document analysis.",
      backendName: 'mistral',
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
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setSelectedPdfs(files);
    } else {
      setSelectedPdfs([]);
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
      alert('Please fill in all fields and select at least one file');
      return;
    }
    setIsSubmitting(true);
    setOverlaySuccessMessage('');
    try {
      // Upload files (all types)
      const formData = new FormData();
      selectedPdfs.forEach((file) => {
        formData.append('files', file);
      });
      // You can add more fields if needed (e.g., file_type, audio_transcript)
      const uploadResponse = await fetch(`${BACKEND_BASE}/upload`, {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' },
      });
      const uploadData = await uploadResponse.json();
      if (!uploadData.success || !uploadData.results) {
        throw new Error(uploadData.error || 'Failed to upload files');
      }
      const uploadedFilenames = uploadData.results.map(r => r.filename);
      // Create new agent (still using /agents endpoint)
      const newAgentPayload = {
        iconType: newAgentIconType,
        name: newAgentName,
        description: newAgentDescription,
        buttonText: 'Start Chat',
        agentId: `agent_${Date.now()}`,
        pdfSources: uploadedFilenames, // This field is still used for all files
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

  // Export all chat messages as a Word file
  const handleExportAllMessages = () => {
    // Combine all messages (user and assistant) in order
    const allContent = messages.map(msg => {
      let senderLabel = msg.sender === 'user' ? 'You:' : 'Assistant:';
      return `**${senderLabel}**\n${msg.content}`;
    }).join('\n\n');

    // Convert Markdown to HTML
    const html = marked.parse(allContent);
    const parser = new DOMParser();
    const docHtml = parser.parseFromString(html, "text/html");
    const body = docHtml.body;

    function parseNode(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        if (!node.textContent.trim()) return null;
        return new TextRun(node.textContent);
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return null;

      switch (node.tagName) {
        case "STRONG":
          return new TextRun({ text: node.textContent, bold: true });
        case "U":
        case "INS":
          return new TextRun({ text: node.textContent, underline: {} });
        case "EM":
        case "I":
          return new TextRun({ text: node.textContent, italics: true });
        case "BR":
          return new TextRun({ text: "\n" });
        case "LI":
          return new Paragraph({ text: node.textContent, bullet: { level: 0 } });
        case "OL":
        case "UL":
          return Array.from(node.childNodes).map(parseNode).filter(Boolean);
        case "TABLE":
          return new Table({
            rows: Array.from(node.rows).map(row =>
              new TableRow({
                children: Array.from(row.cells).map(cell =>
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun(cell.textContent)] })],
                  })
                ),
              })
            ),
          });
        default:
          return new Paragraph({
            children: Array.from(node.childNodes).map(parseNode).filter(Boolean)
          });
      }
    }

    function flatten(arr) {
      return arr.reduce((acc, val) => acc.concat(Array.isArray(val) ? flatten(val) : val), []);
    }

    const docElements = flatten(Array.from(body.childNodes).map(parseNode).filter(Boolean));
    const cleanDocElements = docElements.filter(Boolean);

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: cleanDocElements,
        },
      ],
    });

    Packer.toBlob(doc).then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-history-${new Date().toISOString()}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  };

  // Clear all chat sessions and history
  const handleClearAllChats = () => {
    setShowClearChatsOverlay(true);
  };

  const handleConfirmClearAllChats = () => {
    setSessions([]);
    setCurrentSessionId(null);
    setMessages([]);
    setChatStarted(false);
    setShowClearChatsOverlay(false);
    // Optionally, clear from backend if needed
    fetch(`${BACKEND_BASE}/sessions/clear_all`, { method: 'POST' });
  };

  const handleCancelClearAllChats = () => {
    setShowClearChatsOverlay(false);
  };

  const [showClearChatsOverlay, setShowClearChatsOverlay] = useState(false);

  const [showSaveToProjectModal, setShowSaveToProjectModal] = useState(false);
  const [saveToProjectInput, setSaveToProjectInput] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [projectsList, setProjectsList] = useState([]); // For modal dropdown
  const saveToProjectTextareaRef = useRef(null);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Handler to open Save to Project modal
  const handleOpenSaveToProject = async () => {
    setSaveToProjectInput(inputRef.current.innerText || '');
    setShowSaveToProjectModal(true);
    setSaveChatTitle('');
    setSaveError(null);
    setSaveLoading(true);
    try {
      const res = await fetch(`${BACKEND_BASE}/projects`);
      if (!res.ok) throw new Error('Failed to fetch projects');
      const data = await res.json();
      setProjectsList(data);
      setSelectedProjectId(data.length ? data[0].id : '');
    } catch (err) {
      setProjectsList([]);
      setSelectedProjectId('');
      setSaveError('Could not load projects.');
    } finally {
      setSaveLoading(false);
    }
  };

  // Handler to save input as note to selected project
  const handleSaveInputToProject = async () => {
    if (!selectedProjectId || !saveChatTitle.trim() || !messages.length) return;
    setSaveLoading(true);
    setSaveError(null);
    try {
      const res = await fetch(`${BACKEND_BASE}/projects/${selectedProjectId}/chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: saveChatTitle.trim(), messages }),
      });
      if (!res.ok) throw new Error('Failed to save chat');
      setShowSaveToProjectModal(false);
      setSaveToProjectInput('');
      setSaveChatTitle('');
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 1800);
    } catch (err) {
      setSaveError('Could not save chat.');
    } finally {
      setSaveLoading(false);
    }
  };

  useEffect(() => {
    if (showSaveToProjectModal && saveToProjectTextareaRef.current) {
      saveToProjectTextareaRef.current.focus();
    }
  }, [showSaveToProjectModal]);

  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [showNewProjectFields, setShowNewProjectFields] = useState(false);

  const [projects, setProjects] = useState([]);
  const fetchProjects = async () => {
    try {
      const res = await fetch(`${BACKEND_BASE}/projects`);
      if (!res.ok) throw new Error('Failed to fetch projects');
      const data = await res.json();
      setProjects(data);
    } catch (err) {
      // Optionally handle error
    }
  };
  useEffect(() => { fetchProjects(); }, []);

  useEffect(() => {
    if (currentView === 'my-projects') {
      fetchProjects();
    }
  }, [currentView]);

  const [saveChatTitle, setSaveChatTitle] = useState('');

  // Add at the top of App function:
  const [agentRefreshKey, setAgentRefreshKey] = useState(0);

  const [newSessionTitle, setNewSessionTitle] = useState('');

  const [feedbackState, setFeedbackState] = useState({});
  const [feedbackModal, setFeedbackModal] = useState({ open: false, msg: null });

  const handleFeedback = (msg, rating) => {
    // Update feedback state immediately for this message
    setFeedbackState(prev => ({
      ...prev,
      [msg.id]: { 
        ...prev[msg.id], 
        rating, 
        showForm: false, 
        text: '', 
        submitted: false 
      }
    }));
    // Always open modal for feedback, regardless of upvote or downvote
    setFeedbackModal({ open: true, msg });
  };
  const handleFeedbackTextChange = (msg, text) => {
    setFeedbackState(prev => ({
      ...prev,
      [msg.id]: { ...prev[msg.id], text }
    }));
  };
  const handleSubmitFeedback = async (msg, ratingOverride = null, modalData = null) => {
    console.log('handleSubmitFeedback called with:', { msg, ratingOverride, modalData });
    const feedback = feedbackState[msg.id] || {};
    // If user downvotes but selects 5 stars, treat as upvote
    let rating = modalData?.stars || feedback.stars || (ratingOverride === 'up' ? 5 : ratingOverride === 'down' ? 2 : 0);
    console.log('Calculated rating:', rating);
    const feedbackText = modalData?.reason || feedback.text;
    const stars = modalData?.stars || feedback.stars;
    
    // Debug: Ensure msg.content is present
    console.log('Submitting feedback for msg:', msg);
    if (!msg.content) {
      console.warn('msg.content is missing! Attempting to fallback to last assistant message.');
      // Fallback: find the last assistant message in the current session
      const lastAssistantMsg = messages.slice().reverse().find(m => m.sender === 'assistant' && m.id === msg.id);
      if (lastAssistantMsg && lastAssistantMsg.content) {
        msg.content = lastAssistantMsg.content;
      } else {
        // As a last resort, find any assistant message
        const anyAssistantMsg = messages.slice().reverse().find(m => m.sender === 'assistant');
        if (anyAssistantMsg && anyAssistantMsg.content) {
          msg.content = anyAssistantMsg.content;
        }
      }
      console.log('After fallback, msg.content:', msg.content);
    }
    
    // Feedback deletion is disabled to ensure data persistence
    if (rating === null) {
      console.log('Feedback deletion is disabled to ensure data persistence');
      return;
    }
    
    // Only now declare feedbackType ONCE:
    let feedbackType = 'neutral';
    if (rating === 'up' || (typeof rating === 'number' && rating >= 4)) {
      feedbackType = 'positive';
    } else if (rating === 'down' || (typeof rating === 'number' && rating <= 2)) {
      feedbackType = 'negative';
    }
    
    // Determine category based on feedback text
    let category = 'helpfulness';
    if (feedbackText) {
      const text = feedbackText.toLowerCase();
      if (text.includes('speed') || text.includes('fast') || text.includes('slow') || text.includes('time')) {
        category = 'speed';
      } else if (text.includes('accurate') || text.includes('correct') || text.includes('right') || text.includes('wrong')) {
        category = 'accuracy';
      }
    }
    
    // Determine severity based on rating
    let severity = 'medium';
    if (typeof rating === 'number') {
      if (rating <= 2) severity = 'high';
      else if (rating <= 3) severity = 'medium';
      else severity = 'low';
    } else if (rating === 'down') {
      severity = 'high';
    } else if (rating === 'up') {
      severity = 'low';
    }
    
    // Attach session transcript (all messages in the session)
    const sessionTranscript = messages.filter(m => m.sessionId === msg.sessionId);
    
    // Get user email from localStorage
    const userEmail = localStorage.getItem('userEmail') || 'anonymous@user.com';
    
    // Get current model information
    const currentModel = selectedModel || 'Gemini 2.5 Flash';
    const modelIcon = currentModel.includes('Gemini') ? '🤖' : 
                     currentModel.includes('Llama') ? '🦙' : 
                     currentModel.includes('Mistral') ? '🌪️' : '🤖';
    
    const feedbackData = {
      sessionId: msg.sessionId,
      agentId: msg.agentId || 'default_agent',
      agentName: msg.agentName || 'Unknown Agent',
      answerId: msg.id,
      documentChunkIds: msg.chunkIds,
      rating,
      feedbackText,
      stars,
      suggestion: modalData?.suggestion || '',
      userId: userId,
      userEmail: userEmail,
      timestamp: new Date().toISOString(),
      // Additional fields for dashboard
      feedbackType,
      category,
      severity,
      modelUsed: currentModel,
      modelIcon: modelIcon,
      responseTime: Math.random() * 3 + 1, // Simulated response time
      sessionDuration: Math.floor(Math.random() * 30) + 5, // Simulated session duration
      answerText: msg.content,
      sessionTranscript: sessionTranscript.map(m => ({
        id: m.id,
        sender: m.sender,
        content: m.content,
        timestamp: m.timestamp,
        sessionId: m.sessionId
      }))
    };
    
    try {
      console.log('Submitting feedback data:', feedbackData);
      console.log('Making API call to /api/feedback...');
      const response = await fetch('http://localhost:5000/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedbackData)
      });
      
      console.log('Feedback submission response status:', response.status);
      if (response.ok) {
        const result = await response.json();
        console.log('Feedback submitted successfully:', result);
      } else {
        const errorText = await response.text();
        console.error('Failed to submit feedback:', response.status, errorText);
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
    
    setFeedbackState(prev => ({ 
      ...prev, 
      [msg.id]: { 
        ...prev[msg.id], 
        showForm: false, 
        submitted: true, 
        rating: feedbackData.rating, 
        text: feedbackText, 
        stars 
      } 
    }));
    setFeedbackModal({ open: false, msg: null });
  };

  // Add state for menu and delete overlay
  const [menuOpen, setMenuOpen] = useState(null);
  const [showDeleteOverlay, setShowDeleteOverlay] = useState(false);
  const [pendingDeleteSessionId, setPendingDeleteSessionId] = useState(null);

  // Add ref for kebab menu
  const kebabMenuRef = useRef(null);

  // Close kebab menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(event) {
      if (kebabMenuRef.current && !kebabMenuRef.current.contains(event.target)) {
        setMenuOpen(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  // Add state for chat search
  const [chatSearch, setChatSearch] = useState('');

  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('isLoggedIn') === 'true');

  // Handle login
  const handleLogin = (user) => {
    console.log('handleLogin called with user:', user);
    setIsLoggedIn(true);
    localStorage.setItem('isLoggedIn', 'true');
    if (user && user.email) localStorage.setItem('userEmail', user.email);
    // Update user info from localStorage
    const userData = JSON.parse(localStorage.getItem('ukpUser'));
    console.log('User data from localStorage:', userData);
    if (userData) {
      setUserName(userData.name);
      setUserAvatar(userData.avatar);
      setUserEmail(userData.email);
      // Store admin status if available
      if (userData.isAdmin) {
        localStorage.setItem('userIsAdmin', 'true');
        localStorage.setItem(`userIsAdmin_${userData.email}`, 'true');
        localStorage.setItem('userRole', userData.role || 'Administrator');
      } else {
        // Check if user has specific admin status
        const userSpecificAdmin = localStorage.getItem(`userIsAdmin_${userData.email}`);
        if (userSpecificAdmin === 'true') {
          localStorage.setItem('userIsAdmin', 'true');
          localStorage.setItem('userRole', 'Administrator');
        } else {
          localStorage.removeItem('userIsAdmin');
          localStorage.removeItem('userRole');
        }
      }
    } else {
      setUserName('Dhruv Mendiratta');
      setUserAvatar(null);
      setUserEmail('dhruv.mendiratta4@gmail.com');
    }
    console.log('Setting current view to chat');
    setCurrentView('chat'); // Open to chats tab after login
    
    // Force a re-render by updating localStorage and triggering a state change
    setTimeout(() => {
      console.log('Forcing re-render after login');
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'isLoggedIn',
        newValue: 'true'
      }));
    }, 100);
    
    // Log user login activity
    try {
      fetch('http://localhost:5000/api/monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: userData?.email || 'dhruv.mendiratta4@gmail.com',
          action: 'login',
          details: { userName: userData?.name || 'Dhruv Mendiratta' }
        })
      });
    } catch (err) {
      console.error('Error logging login activity:', err);
    }
  };

  // Handle logout (optional, for future use)
  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userEmail');
  };

  // Handle profile updates from ProfileModal
  const handleProfileUpdate = (updatedUser) => {
    setUserName(updatedUser.name || 'User');
    setUserAvatar(updatedUser.avatar || null);
    setUserEmail(updatedUser.email || 'user@example.com');
    
    // Update localStorage
    localStorage.setItem('ukpUser', JSON.stringify(updatedUser));
    
    // Update users array
    const users = JSON.parse(localStorage.getItem('ukpUsers')) || [];
    const existingUserIndex = users.findIndex(u => u.email === updatedUser.email);
    if (existingUserIndex !== -1) {
      users[existingUserIndex] = updatedUser;
    }
    localStorage.setItem('ukpUsers', JSON.stringify(users));
  };
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileModalFromSidebar, setProfileModalFromSidebar] = useState(false);

  

  
  // Show login page if not logged in
  if (!isLoggedIn) {
    return <LoginView onLogin={handleLogin} />;
  }

  // Use location to check current route
 
  
  // If we're on the developer dashboard route, check developer options permission
  if (location.pathname === '/developer-dashboard') {
    // Check if current user has developer options permission
    const currentUserEmail = userEmail || localStorage.getItem('userEmail');
    
    if (canAccessDeveloperOptions(currentUserEmail)) {
      return <DeveloperDashboard />;
    } else {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            background: 'var(--bg-secondary)',
            borderRadius: '1rem',
            border: '1px solid var(--border-color)',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
            maxWidth: '500px'
          }}>
            <div style={{
              fontSize: '4rem',
              marginBottom: '1rem',
              color: '#ef4444'
            }}>
              ⚠️
            </div>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: 700,
              marginBottom: '1rem',
              color: 'var(--text-primary)'
            }}>
              Access Denied
            </h1>
            <p style={{
              fontSize: '1.1rem',
              color: 'var(--text-secondary)',
              marginBottom: '2rem',
              lineHeight: '1.6'
            }}>
              You don't have permission to access the Developer Dashboard. 
              This area requires the "Developer Options" permission.
            </p>
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center'
            }}>
              <button
                onClick={() => window.history.back()}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '0.5rem',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 600,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'var(--bg-primary)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'var(--bg-tertiary)';
                }}
              >
                Go Back
              </button>
              <button
                onClick={() => window.location.href = '/'}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'var(--accent-color)',
                  border: 'none',
                  borderRadius: '0.5rem',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 600,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1)';
                }}
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      );
    }
  }


  const handleChatFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setChatAttachment({
          name: file.name,
          type: file.type,
          dataUrl: reader.result,
          file: file
        });
      };
      if (file.type.startsWith('image/')) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    }
    // Reset file input so same file can be uploaded again if needed
    e.target.value = '';
  };

  // Restore agent and chat mode from localStorage on mount, and reset dropdown state
  

 // Track file to preview

  const handleCancelNewAgent = () => {
    setNewAgentName('');
    setNewAgentDescription('');
    setNewAgentTileLineStartColor('');
    setNewAgentTileLineEndColor('');
    setNewAgentIconType('FaFileAlt');
    setSelectedPdfs([]);
    setShowNewAgentOverlay(false);
  };

  // Handler to remove a file from selectedPdfs
  function handleRemoveFile(idx) {
    setSelectedPdfs(prev => prev.filter((_, i) => i !== idx));
  }

  // Add state for CSV and DOCX preview content
  

  // After modelOptions and selectedModel state:

  // After selectedModel and preferredModel useState hooks:


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
              <div className="sidebar-title-short">Unified®</div>
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
              onClick={handleNavigateToMyProjects}
              title="View your projects"
            >
              <FaFolderOpen style={{ marginRight: '10px' }} /> My Projects
            </button>
            <button
              className="sidebar-nav-item"
              onClick={() => setCurrentView('supported-languages')}
              title="View supported languages"
            >
              <FaGlobe style={{ marginRight: '10px' }} /> Supported Languages
            </button>
            <div className="user-details" onClick={e => { e.stopPropagation(); setShowUserDetailsMenu(!showUserDetailsMenu); }}
                 style={{
                   cursor: 'pointer',
                   transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                   transform: showUserDetailsMenu ? 'scale(1.02)' : 'scale(1)',
                   filter: showUserDetailsMenu ? 'brightness(1.1)' : 'brightness(1)'
                 }}>
              <div className="user-avatar" style={{
                position: 'relative',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: showUserDetailsMenu ? 'scale(1.1)' : 'scale(1)',
                boxShadow: showUserDetailsMenu ? '0 4px 12px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.2)'
              }}>
                {userAvatar && <img src={userAvatar} alt="avatar" style={{ width: 40, height: 40, borderRadius: '50%' }} />}
                {!userAvatar && <div className="user-avatar-initial">{userName.charAt(0)}</div>}
                {showUserDetailsMenu && (
                  <div style={{
                    position: 'absolute',
                    top: -2,
                    right: -2,
                    width: 12,
                    height: 12,
                    background: 'var(--accent-color)',
                    borderRadius: '50%',
                    border: '2px solid var(--bg-primary)',
                    animation: 'pulse 2s infinite'
                  }} />
                )}
              </div>
              <div className="user-info" style={{
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: showUserDetailsMenu ? 'translateX(4px)' : 'translateX(0)'
              }}>
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
                  <div className="user-name" style={{
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    color: showUserDetailsMenu ? 'var(--accent-color)' : 'var(--text-primary)'
                  }}>{userName}</div>
                )}
                <div className="user-email" style={{
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  opacity: showUserDetailsMenu ? 0.8 : 0.7
                }}>{userEmail}</div>
                {/* Role Badge */}
                {(() => {
                  const roleInfo = getUserRoleInfo(userEmail);
                  if (roleInfo.role !== 'user') {
                    return (
                  <div style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                        gap: '0.25rem',
                        background: roleInfo.color,
                    color: 'white', 
                    padding: '2px 6px', 
                    borderRadius: 8, 
                    fontSize: '0.6rem', 
                    fontWeight: 600,
                    marginTop: 2,
                    boxShadow: showUserDetailsMenu ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.2)',
                    letterSpacing: '0.2px',
                    width: 'fit-content',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: showUserDetailsMenu ? 'scale(1.05)' : 'scale(1)'
                  }}>
                        {roleInfo.name.toUpperCase()}
                  </div>
                    );
                  }
                  return null;
                })()}
              </div>
              {showUserDetailsMenu && (
                <div className="user-details-menu" ref={userDetailsMenuRef}>
                  <div
                    className="theme-slider-row"
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', cursor: 'pointer', userSelect: 'none' }}
                    onClick={e => {
                      e.stopPropagation();
                      setTheme(theme === 'dark' ? 'light' : 'dark');
                    }}
                  >
                    <div className={`theme-slider${theme === 'dark' ? ' dark' : ''}`}
                      style={{ position: 'relative', width: 48, height: 22, borderRadius: 12, background: theme === 'dark' ? '#23233a' : '#f5f5f5', transition: 'background 0.2s', border: '1px solid #ccc' }}
                    >
                      <span style={{ position: 'absolute', left: 6, top: 3, zIndex: 2 }}><FaMoon style={{ color: '#888', fontSize: 14 }} /></span>
                      <span style={{ position: 'absolute', right: 6, top: 3, zIndex: 2 }}><FaSun style={{ color: '#ffd600', fontSize: 14 }} /></span>
                      <div className="theme-slider-thumb" style={{
                        position: 'absolute',
                        top: 2,
                        left: theme === 'dark' ? 26 : 2,
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        background: theme === 'dark' ? '#9c27b0' : '#ffd600',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                        transition: 'left 0.22s cubic-bezier(.4,2.2,.6,1), background 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }} />
                    </div>
                    <span style={{ fontWeight: 500 }}>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                  </div>
                  <div className="menu-item" onClick={() => { setShowProfileModal(true); setProfileModalFromSidebar(true); setShowUserDetailsMenu(false); }}>Profile</div>
                  {/* Developer Options - Only visible to users with developer options permission */}
                  {canAccessDeveloperOptions(userEmail) && (
                  <div className="menu-item" onClick={() => { 
                    window.open('/developer-dashboard', '_blank');
                    setShowUserDetailsMenu(false); 
                  }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Developer Options</span>
                    <FaExternalLinkAlt style={{ fontSize: '12px', opacity: 0.7 }} />
                  </div>
                  )}
                  <div className="menu-item" onClick={handleLogout}>Log out</div>
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
      <main className="main-content">
        {currentView === 'home' && <HomeView
          userName={userName}
          APP_NAME={APP_NAME}
          onNavigateToKnowledgeSources={handleNavigateToKnowledgeSources}
          onNavigateToMyProjects={handleNavigateToMyProjects}
          onNavigateToChat={handleNavigateToChat}
          theme={theme}
        />}
        {currentView === 'chat' && (
          <>
            <div className="chat-window chatbot-full-window">
              <div className="chat-wave-bg top" />
              {messages.length === 0 && !chatStarted && !loading && (
                <div className="welcome-center-outer" style={{ position: "relative", display: "block", alignItems: "flex-start", justifyContent: "flex-start" }}>
                  <div className="welcome-center-area" style={{ paddingTop: "140px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start" }}>
                   <div style={{position: "absolute", top: "130px", left: "57%", transform: "translateX(-50%)", zIndex: 1000}}>
                       <GlowingSphere 
                         position={{ 
                           x: 0, 
                           y: 0
                         }} 
                         visible={true} 
                         leftCollapsed={leftCollapsed}
                         rightCollapsed={rightCollapsed}
                         isThinking={inputValue.length > 0}
                       /> 
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
                                  <div id="middle-chatbox-container" style={{position: "relative"}}>
                    {/* Removed sphere from chat area - it should only appear in welcome screen */}
                  
                  {messages.map((msg, idx) => (
                    <div key={msg.id || idx} className={`chat-message ${msg.sender}`}>
                      {msg.sender === 'assistant' && (
                        <>
                          <div className="avatar assistant"><img src="/unified-knowledge-platform.png" alt="avatar" /></div>
                          <div className="bubble assistant">
                            <div className="message-content">
                              {/* Model name and icon above agent name */}
                              {msg.modelDisplayName && msg.modelDisplayIcon && (
                                <div className="model-info-display" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                  <span className="model-info-icon">{msg.modelDisplayIcon}</span>
                                  <span className="model-info-name" style={{ fontWeight: 600, fontSize: '0.98em', color: 'var(--accent-color)' }}>{msg.modelDisplayName}</span>
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
                                return renderAssistantContent(content, (e, href) => handleOpenPdfLink(e, href, msg), msg.source_highlights);
                              })()}
                              {/* Add retractable sources section here */}
                              {/* Feedback UI */}
                              <div className="answer-feedback-row">
                                <span style={{ marginRight: 8 }}>Was this helpful?</span>
                                <button 
                                  className="feedback-btn" 
                                  onClick={() => {
                                    if (feedbackState[msg.id]?.rating === 'up') {
                                      // If already upvoted, remove the feedback
                                      setFeedbackState(prev => ({
                                        ...prev,
                                        [msg.id]: { ...prev[msg.id], rating: null, submitted: false }
                                      }));
                                    } else {
                                      // Submit upvote
                                      handleFeedback(msg, 'up');
                                    }
                                  }}
                                  style={{ 
                                    cursor: 'pointer',
                                    background: 'none',
                                    border: 'none',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    transition: 'all 0.2s ease'
                                  }}
                                >
                                  <FaThumbsUp 
                                    color={feedbackState[msg.id]?.rating === 'up' ? 'var(--accent-color)' : 'var(--text-secondary)'} 
                                    style={{ fontSize: '16px' }}
                                  />
                                </button>
                                <button 
                                  className="feedback-btn" 
                                  onClick={() => {
                                    if (feedbackState[msg.id]?.rating === 'down') {
                                      // If already downvoted, remove the feedback
                                      setFeedbackState(prev => ({
                                        ...prev,
                                        [msg.id]: { ...prev[msg.id], rating: null, submitted: false }
                                      }));
                                    } else {
                                      // Submit downvote
                                      handleFeedback(msg, 'down');
                                    }
                                  }}
                                  style={{ 
                                    cursor: 'pointer',
                                    background: 'none',
                                    border: 'none',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    transition: 'all 0.2s ease'
                                  }}
                                >
                                  <FaThumbsDown 
                                    color={feedbackState[msg.id]?.rating === 'down' ? '#e74c3c' : 'var(--text-secondary)'} 
                                    style={{ fontSize: '16px' }}
                                  />
                                </button>
                                {feedbackState[msg.id]?.submitted && (
                                  <span style={{ color: 'var(--accent-color)', marginLeft: 8, fontSize: '0.9rem' }}>
                                    Thank you for your feedback!
                                  </span>
                                )}
                              </div>
                              {/* End Feedback UI */}
                              <div className="message-actions">
                                <button
                                  className="action-btn copy-btn"
                                  title={copiedMessageId === msg.id ? "Copied!" : "Copy"}
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
                                  title="Export to Word"
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
                                  className="action-btn voice-btn"
                                  title="Text to Speech"
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
              <div className="floating-input-inner" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 0, padding: '0.4rem 1rem' }}>
                {!activeAgentDetails && (
                  <div
                    className="ukp-mode-banner"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: theme === 'dark' ? 'var(--bg-secondary-dark, #232136)' : 'rgba(240,244,255,0.95)',
                      border: `1.5px solid ${theme === 'dark' ? 'var(--accent-color-dark, #6c2eb7)' : 'var(--accent-color, #6c2eb7)'}`,
                      borderRadius: 999,
                      padding: '3px 14px',
                      fontSize: '0.98rem',
                      fontWeight: 500,
                      color: theme === 'dark' ? 'var(--accent-color-dark, #6c2eb7)' : 'var(--accent-color, #6c2eb7)',
                      marginBottom: 6,
                      maxWidth: '100%',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    <span style={{ fontWeight: 700 }}>Unified® Mode</span>
                                                    <span style={{ color: 'var(--text-secondary)', fontWeight: 400, marginLeft: 8 }}>Ask anything across all knowledge sources</span>
                  </div>
                )}
                {activeAgentDetails && !isDedicatedChat && (
                  <div
                    className="dedicated-agent-inline"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: theme === 'dark' ? 'rgba(108, 46, 183, 0.1)' : 'rgba(240,244,255,0.95)',
                      border: '1.5px solid var(--accent-color)',
                      borderRadius: 999,
                      padding: '3px 14px',
                      fontSize: '0.98rem',
                      fontWeight: 500,
                      color: 'var(--accent-color)',
                      marginBottom: 6,
                      maxWidth: '100%',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      position: 'relative'
                    }}
                  >
                    {activeAgentDetails?.icon && (
                      <span style={{ fontSize: 18, color: 'var(--accent-color)' }}>
                        {getIconComponent(activeAgentDetails.iconType)}
                      </span>
                    )}
                    <span>
                      Chatting with: <span style={{ fontWeight: 700 }}>{activeAgentDetails?.fullName}</span>
                    </span>
                    <button
                      onClick={() => { setActiveAgentDetails(null); setIsDedicatedChat(false); localStorage.removeItem('activeAgentDetails'); localStorage.setItem('isDedicatedChat', 'false'); }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#bbb',
                        cursor: 'pointer',
                        fontSize: 18,
                        marginLeft: 10,
                        padding: 0,
                        lineHeight: 1
                      }}
                      title="Clear agent"
                    >
                      <FaTimes />
                    </button>
                  </div>
                )}
                {activeAgentDetails && isDedicatedChat && (
                  <div
                    className="dedicated-agent-inline"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: theme === 'dark' ? 'rgba(108, 46, 183, 0.1)' : 'rgba(240,244,255,0.95)',
                      border: '1.5px solid var(--accent-color)',
                      borderRadius: 999,
                      padding: '3px 14px',
                      fontSize: '0.98rem',
                      fontWeight: 500,
                      color: 'var(--accent-color)',
                      marginBottom: 6,
                      maxWidth: '100%',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {activeAgentDetails?.icon && (
                      <span style={{ fontSize: 18, color: 'var(--accent-color)' }}>
                        {getIconComponent(activeAgentDetails.iconType)}
                      </span>
                    )}
                    <span>
                      Chatting with: <span style={{ fontWeight: 700 }}>{activeAgentDetails?.fullName}</span>
                    </span>
                  </div>
                )}
                {/* Quick options for dedicated chats only */}
                {activeAgentDetails && isDedicatedChat && (
                  <div className="quick-options-row" style={{ marginBottom: 8 }}>
                    <div className="quick-options-scroll">
                      {QUICK_OPTIONS.map(opt => (
                        <button
                          key={opt.label}
                          className="quick-option-btn"
                          onClick={() => handleQuickOption(opt.value)}
                          type="button"
                        >
                          {opt.icon} {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ width: '100%', position: 'relative' }}>
                  {/* Show file preview above the input box */}
                  {chatAttachment && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0' }}>
                      {chatAttachment.type.startsWith('image/') ? (
                        <img src={chatAttachment.dataUrl} alt={chatAttachment.name} style={{ maxWidth: 80, maxHeight: 80, borderRadius: 8, border: '1px solid #eee' }} />
                      ) : chatAttachment.type === 'application/pdf' ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FaFilePdf color="#e74c3c" size={32} /> {chatAttachment.name}</span>
                      ) : (
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FaFileAlt color="var(--text-secondary)" size={32} /> {chatAttachment.name}</span>
                      )}
                      <button onClick={() => setChatAttachment(null)} style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: 18 }} title="Remove attachment"><FaTimes /></button>
                    </div>
                  )}
                  <div
                    ref={inputRef}
                    className="chat-input"
                    contentEditable={true}
                    data-placeholder={!activeAgentDetails ? 'Ask anything across all knowledge sources...' : 'Your entire knowledge base, one question away...'}
                    onInput={e => {
                      const div = e.target;
                      const savedCaretOffset = saveSelection(div);
                      let plainText = div.innerText; // Get plain text content

                      // Update the input state for send button and other logic that might depend on it
                      setInputValue(plainText);

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
                    style={{ minHeight: 32, fontSize: '0.98rem', width: '100%', border: 'none', outline: 'none', background: 'transparent', marginBottom: 0, padding: '4px 0' }}
                  ></div>
                  {/* Agent mention drop-up menu */}
                  {showAgentDropdown && filteredAgents.length > 0 && (
                    <div
                      className="agent-mention-dropdown"
                      style={{
                        position: 'absolute',
                        bottom: '110%', // Drop-up
                        left: 0,
                        width: '100%',
                        background: 'var(--bg-secondary)',
                        border: '1.5px solid var(--border-color)',
                        borderRadius: 10,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                        zIndex: 100,
                        maxHeight: 180,
                        overflowY: 'auto',
                        padding: 0,
                        marginBottom: 6
                      }}
                    >
                      {filteredAgents.map(agent => (
                        <div
                          key={agent.id}
                          className="agent-mention-dropdown-item"
                          style={{
                            padding: '10px 16px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            fontSize: '1rem',
                            color: 'var(--text-primary)',
                            background: 'none',
                            borderBottom: '1px solid var(--border-color)'
                          }}
                          onMouseDown={() => {
                            const div = inputRef.current;
                            if (div) {
                              // Update active agent (not dedicated/locked)
                              setActiveAgentDetails(agent);
                              setIsDedicatedChat(false);
                              localStorage.setItem('activeAgentDetails', JSON.stringify(agent));
                              localStorage.setItem('isDedicatedChat', 'false');
                              div.innerText = '';
                              setInput('');
                              setShowAgentDropdown(false);
                              setFilteredAgents([]);
                              restoreSelection(div, 0);
                            }
                          }}
                        >
                          {agent.icon} <span style={{ fontWeight: 600 }}>{agent.fullName}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, marginTop: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <label htmlFor="file-upload" className="media-upload-btn" style={{ cursor: 'pointer', marginRight: 0 }}>
                      <FaPaperclip size={20} color="var(--text-secondary)" />
                      <input id="file-upload" type="file" style={{ display: 'none' }} onChange={handleChatFileUpload} />
                    </label>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      className="model-selector-btn-flex bg-transparent border-none shadow-none focus:outline-none p-0 m-0"
                      title="Select Model"
                      type="button"
                      onClick={() => setShowModelSelector(true)}
                      style={{ background: 'none', border: 'none', boxShadow: 'none', display: 'flex', alignItems: 'center', gap: 6, padding: 0, margin: 0 }}
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
                        width: 36,
                        height: 36,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'background 0.2s, color 0.2s, boxShadow 0.2s',
                        verticalAlign: 'middle',
                      }}
                      disabled={loading}
                    >
                      <FaMicrophone size={18} style={{ color: listening ? '#007BFF' : 'var(--text-secondary)' }} />
                    </button>
                    <button
                      className="send-btn export-all-btn"
                      onClick={handleExportAllMessages}
                      title="Export entire chat as Word file"
                      type="button"
                      style={{
                        marginLeft: 4,
                        background: 'none',
                        border: 'none',
                        boxShadow: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        verticalAlign: 'middle',
                      }}
                    >
                      <FaRegFileAlt color="var(--text-secondary)" size={18} />
                    </button>
                    <button
                      className="send-btn save-to-project-btn"
                      onClick={handleOpenSaveToProject}
                      title="Save to My Project"
                      type="button"
                      style={{
                        marginLeft: 4,
                        background: 'none',
                        border: 'none',
                        boxShadow: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        verticalAlign: 'middle',
                      }}
                    >
                      <FaFolderPlus color="#6B7280" size={20} />
                    </button>
                    {/* Send and Stop buttons in chat input area */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                      <button
                        className="send-btn"
                        title="Send"
                        onClick={handleSend}
                        disabled={loading || !inputValue.trim()}
                        style={{
                          background: 'none',
                          color: inputValue.trim() ? 'var(--accent-color)' : '#b0b8d9',
                          border: 'none',
                          borderRadius: 8,
                          width: 40,
                          height: 40,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 20,
                          cursor: loading || !inputValue.trim() ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <FaPaperPlane />
                      </button>
                      {isTyping && (
                        <button
                          className="send-btn stop-btn"
                          title="Stop generating"
                          onClick={handleStopGeneration}
                          style={{
                            background: '#ef4444',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 8,
                            width: 40,
                            height: 40,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 20,
                            cursor: 'pointer'
                          }}
                        >
                          <FaStop />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
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
        {currentView === 'knowledge-sources' && <KnowledgeSourcesView
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
          editedName={editedName}
          setEditedName={setEditedName}
          editedDescription={editedDescription}
          setEditedDescription={setEditedDescription}
          editedTileLineStartColor={editedTileLineStartColor}
          setEditedTileLineStartColor={setEditedTileLineStartColor}
          editedTileLineEndColor={editedTileLineEndColor}
          setEditedTileLineEndColor={setEditedTileLineEndColor}
          refreshKey={agentRefreshKey}
          theme={theme}
        />}
        {currentView === 'supported-languages' && <SupportedLanguages />}
        {currentView === 'my-projects' && <MyProjectsView refreshKey={currentView} />}
        {currentView === 'feedback-dashboard' && <FeedbackDashboard messages={messages} />}
        {currentView === 'monitoring-dashboard' && <MonitoringDashboard />}
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
                style={{ width: '100%', marginBottom: '0.7rem' }}
              >
                <FaPlus style={{ marginRight: '10px' }} /> New Chat
              </button>
              {/* Clear All Chats button at the bottom center of the right sidebar */}
              <div style={{ position: 'absolute', bottom: 24, left: 0, width: '100%', display: 'flex', justifyContent: 'center', zIndex: 2 }}>
                <button
                  className="sidebar-nav-item"
                  onClick={handleClearAllChats}
                  style={{ width: '80%', padding: '0.8rem 0', borderRadius: '1.5rem', justifyContent: 'center', alignItems: 'center', display: 'flex' }}
                >
                  <FaTrash style={{ marginRight: '10px' }} /> Clear All Chats
                </button>
              </div>
              {/* Search bar below New Chat button */}
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', borderRadius: 8, padding: '0.4rem 0.8rem', marginBottom: '1rem', boxShadow: '0 1px 4px var(--shadow-color)' }}>
                <FaSearch style={{ color: 'var(--text-secondary)', marginRight: 8, fontSize: 16 }} />
                <input
                  type="text"
                  value={chatSearch}
                  onChange={e => setChatSearch(e.target.value)}
                  placeholder="Search chats..."
                  style={{ border: 'none', outline: 'none', background: 'transparent', color: 'var(--text-primary)', fontSize: '1rem', flex: 1 }}
                />
              </div>
              <div className="chat-history-list">
                {Object.entries(groupedSessions).map(([group, groupSessions]) => {
                  const filteredSessions = groupSessions.filter(session => session.title.toLowerCase().includes(chatSearch.toLowerCase()));
                  return filteredSessions.length > 0 ? (
                    <div key={group} style={{ marginBottom: 18 }}>
                      {filteredSessions.map(session => (
                        <div
                          key={session.id}
                          className={`chat-history-item${session.id === currentSessionId ? ' active' : ''}`}
                          onClick={() => setCurrentSessionId(session.id)}
                          style={{ position: 'relative' }}
                        >
                          <span className="chat-icon">
                            <FaRegFileAlt />
                          </span>
                          {editingSessionId === session.id ? (
                            <>
                              <input
                                type="text"
                                value={newSessionTitle}
                                onChange={e => setNewSessionTitle(e.target.value)}
                                style={{ fontWeight: 600, fontSize: '1rem', borderRadius: 6, border: '1.5px solid var(--border-color)', padding: '2px 8px', marginRight: 6, width: 90 }}
                                autoFocus
                                onClick={e => e.stopPropagation()}
                                onKeyDown={async e => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (!newSessionTitle.trim()) return;
                                    try {
                                      const res = await fetch(`${BACKEND_BASE}/sessions/${session.id}`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ title: newSessionTitle.trim() }),
                                      });
                                      if (!res.ok) throw new Error('Failed to update chat name');
                                      const updated = await res.json();
                                      setSessions(sessions => sessions.map(s => s.id === session.id ? { ...s, title: updated.title } : s));
                                      setEditingSessionId(null);
                                    } catch (err) {
                                      alert('Could not update chat name.');
                                    }
                                  }
                                }}
                              />
                              <button
                                onClick={e => { e.stopPropagation(); setEditingSessionId(null); }}
                                style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: 'none', borderRadius: 6, padding: '2px 8px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}
                                title="Cancel"
                              ><FaTimes /></button>
                            </>
                          ) : (
                            <>
                              <span className="chat-history-title">{String(session.title)}</span>
                              <div className="chat-actions" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', position: 'relative' }}>
                                <button
                                  className="kebab-menu-btn"
                                  onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === session.id ? null : session.id); }}
                                  title="More options"
                                >
                                  <FaEllipsisH />
                                </button>
                                {menuOpen === session.id && (
                                  <div
                                    className="chat-popup-menu"
                                    ref={kebabMenuRef}
                                    style={{ position: 'absolute', right: 0, top: '2.2em', zIndex: 10, background: 'var(--bg-secondary)', borderRadius: 10, boxShadow: '0 4px 16px var(--shadow-color)', minWidth: 120, padding: '0.5rem 0', display: 'flex', flexDirection: 'column' }}
                                  >
                                    <button onClick={e => { e.stopPropagation(); setEditingSessionId(session.id); setNewSessionTitle(session.title); setMenuOpen(null); }} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', padding: '0.7rem 1.2rem', textAlign: 'left', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center' }}><FaEdit style={{ marginRight: 8 }} /> Rename</button>
                                    <button onClick={e => { e.stopPropagation(); setShowDeleteOverlay(true); setPendingDeleteSessionId(session.id); setMenuOpen(null); }} style={{ background: 'none', border: 'none', color: 'var(--error-color)', padding: '0.7rem 1.2rem', textAlign: 'left', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center' }}><FaTrash style={{ marginRight: 8 }} /> Delete</button>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : null;
                })}
              </div>
            </>
          )}
        </aside>
      )}
      {/* Overlay Portal for New/Edit Agent */}
      {showNewAgentOverlay && (
        <AgentOverlay onClose={() => setShowNewAgentOverlay(false)} theme={theme}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <input
              type="color"
              value={newAgentTileLineStartColor || '#3498db'}
              onChange={e => setNewAgentTileLineStartColor(e.target.value)}
              disabled={isSubmitting}
              style={{ width: 28, height: 28, border: 'none', marginRight: 4, cursor: 'pointer', background: 'none', padding: 0 }}
              title="Tile Line Start Color"
            />
            <input
              type="color"
              value={newAgentTileLineEndColor || '#8e44ad'}
              onChange={e => setNewAgentTileLineEndColor(e.target.value)}
              disabled={isSubmitting}
              style={{ width: 28, height: 28, border: 'none', marginLeft: 4, cursor: 'pointer', background: 'none', padding: 0 }}
              title="Tile Line End Color"
            />
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
          <h2 style={{ fontWeight: 700, fontSize: '1.3rem', marginBottom: 24 }}>New Knowledge Source</h2>
          <div style={{ marginBottom: 18 }}>
            <input
              type="text"
              placeholder="Knowledge Source Name"
              value={newAgentName}
              onChange={(e) => setNewAgentName(e.target.value)}
              required
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '10px 5px',
                borderRadius: 10,
                border: '1.5px solid var(--border-color)',
                fontSize: '1.15rem',
                fontWeight: 700,
                marginBottom: 10,
                fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
                background: theme === 'dark' ? '#23233a' : '#fff',
                color: theme === 'dark' ? '#f0f0f0' : '#18181b',
                borderColor: theme === 'dark' ? '#444' : 'var(--border-color)'
              }}
            />
            <textarea
              placeholder="Knowledge Source Description"
              value={newAgentDescription}
              onChange={(e) => setNewAgentDescription(e.target.value)}
              required
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '10px 5px',
                borderRadius: 10,
                border: '1.5px solid var(--border-color)',
                fontSize: '1.15rem',
                minHeight: 70,
                resize: 'vertical',
                marginBottom: 10,
                fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
                background: theme === 'dark' ? '#23233a' : '#fff',
                color: theme === 'dark' ? '#f0f0f0' : '#18181b',
                borderColor: theme === 'dark' ? '#444' : 'var(--border-color)'
              }}
            />
            {/* Icon selection and PDF upload remain unchanged */}
            <div className="selected-icon-preview" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 0 12px 0', fontSize: 32 }}>
              {getIconComponent(newAgentIconType, { size: '32px' })}
            </div>
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
              </div>
            <div className="pdf-upload-row" style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 18, width: '100%', margin: '10px 0' }}>
              <div style={{ flex: '0 0 auto' }}>
              <input
                type="file"
                  accept="*"
                multiple
                onChange={handlePdfChange}
                id="pdf-upload"
                className="pdf-upload-input-hidden"
                required
                disabled={isSubmitting}
              />
                <label htmlFor="pdf-upload" className="file-upload-button" style={{ fontSize: '1rem', padding: '10px 18px', minWidth: 160, display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                  <FaFileAlt style={{ marginRight: 8 }} /> Choose Files
              </label>
              </div>
              <span className="file-chosen-text" style={{
                fontSize: '0.95em',
                display: 'grid',
                gridTemplateColumns: '24px 1fr 36px 32px',
                columnGap: 8,
                rowGap: 2,
                maxHeight: 68,
                overflowY: 'auto',
                marginTop: 0,
                marginBottom: 2,
                flex: '1 1 0',
                justifySelf: 'end',
                minWidth: 0
              }}>
                {selectedPdfs.length > 0
                  ? selectedPdfs.map((f, idx) => (
                      <React.Fragment key={f.name + idx}>
                        <span style={{ width: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{getFileTypeIcon(f)}</span>
                        <span
                          style={{
                            maxWidth: 120,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            display: 'block',
                            fontSize: '1em',
                            lineHeight: '34px',
                          }}
                          title={f.name}
                        >
                          {f.name}
                        </span>
                        <button
                          type="button"
                          style={{
                            fontSize: '1.1em',
                            width: 32,
                            height: 32,
                            borderRadius: 6,
                            border: '1px solid #ccc',
                            background: '#f3f3f3',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginLeft: 0,
                          }}
                          onClick={() => setPreviewPdfFile(f)}
                          disabled={isSubmitting}
                          title="Preview"
                        >
                          <FaEye />
                        </button>
                        <button
                          type="button"
                          style={{
                            fontSize: '1.1em',
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#d32f2f',
                            marginLeft: 0,
                          }}
                          onClick={() => handleRemoveFile(idx)}
                          disabled={isSubmitting}
                          title="Remove"
                        >
                          <FaTimes />
                        </button>
                      </React.Fragment>
                    ))
                  : <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: '34px' }}>No files chosen</span>}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button
              onClick={handleCancelNewAgent}
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: 'none', borderRadius: 8, padding: '8px 22px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}
              disabled={isSubmitting}
            >Cancel</button>
            <button
              onClick={handleNewAgentSubmit}
              style={{ background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: 8, padding: '8px 22px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}
              disabled={isSubmitting || !newAgentName || !newAgentDescription || selectedPdfs.length === 0}
            >Create</button>
          </div>
        </AgentOverlay>
      )}
      {agentToEdit && (
        <AgentOverlay onClose={handleCancelEdit} theme={theme}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
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
          <div style={{ width: '100%', padding: 0, margin: 0 }}>
            <div
              style={{
                display: 'block',
                width: '100%',
                height: 16,
                borderRadius: 12,
                marginBottom: 18,
                background: `linear-gradient(90deg, ${editedTileLineStartColor || '#3498db'}, ${editedTileLineEndColor || '#8e44ad'})`,
                transition: 'background 0.2s',
              }}
            />
          </div>
          <h2 style={{ fontWeight: 700, fontSize: '1.3rem', marginBottom: 24 }}>Edit Knowledge Source</h2>
          <div style={{ marginBottom: 18 }}>
            <input
              type="text"
              value={editedName}
              onChange={e => setEditedName(e.target.value)}
              required
              disabled={isSubmitting}
              placeholder="Knowledge Source Name"
              style={{
                width: '100%',
                padding: '10px 5px',
                borderRadius: 10,
                border: '1.5px solid var(--border-color)',
                fontSize: '1.15rem',
                fontWeight: 700,
                marginBottom: 10,
                fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
                background: theme === 'dark' ? '#23233a' : '#fff',
                color: theme === 'dark' ? '#f0f0f0' : '#18181b',
                borderColor: theme === 'dark' ? '#444' : 'var(--border-color)'
              }}
            />
            <textarea
              value={editedDescription}
              onChange={e => setEditedDescription(e.target.value)}
              required
              disabled={isSubmitting}
              placeholder="Knowledge Source Description"
              style={{
                width: '100%',
                padding: '10px 5px',
                borderRadius: 10,
                border: '1.5px solid var(--border-color)',
                fontSize: '1.15rem',
                minHeight: 70,
                resize: 'vertical',
                marginBottom: 10,
                fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
                background: theme === 'dark' ? '#23233a' : '#fff',
                color: theme === 'dark' ? '#f0f0f0' : '#18181b',
                borderColor: theme === 'dark' ? '#444' : 'var(--border-color)'
              }}
            />
            {/* Icon selection remains unchanged */}
            <div className="icon-selection-container">
              <label htmlFor="icon-select" className="icon-select-label">Choose an Icon:</label>
              <select
                id="icon-select"
                className="icon-select-dropdown"
                value={agentToEdit.iconType}
                onChange={e => setNewAgentIconType(e.target.value)}
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
                {getIconComponent(agentToEdit.iconType, { size: '24px' })}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button
              onClick={handleCancelEdit}
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: 'none', borderRadius: 8, padding: '8px 22px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}
              disabled={isSubmitting}
            >Cancel</button>
            <button
              onClick={handleSaveEdit}
              style={{ background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: 8, padding: '8px 22px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}
              disabled={isSubmitting || !editedName || !editedDescription}
            >Save</button>
          </div>
        </AgentOverlay>
      )}
      {showClearChatsOverlay && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.35)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', borderRadius: 18, boxShadow: '0 4px 32px var(--shadow-color)', padding: '2rem 2.5rem', minWidth: 320, maxWidth: 400, width: '100%' }}>
            <h2 style={{ fontWeight: 700, fontSize: '1.2rem', marginBottom: 18 }}>Delete All Chats</h2>
            <div style={{ marginBottom: 24, textAlign: 'left' }}>Are you sure you want to delete your entire chat history? This action cannot be undone.</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                onClick={handleCancelClearAllChats}
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: 'none', borderRadius: 8, padding: '8px 22px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}
              >Cancel</button>
              <button
                onClick={handleConfirmClearAllChats}
                style={{ background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: 8, padding: '8px 22px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}
              >Delete</button>
            </div>
          </div>
        </div>
      )}
      {/* Save to My Project Modal */}
      {showSaveToProjectModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.35)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeInModal 0.25s' }}>
          <div style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', borderRadius: 18, boxShadow: '0 4px 32px var(--shadow-color)', padding: '2.2rem 2.5rem 2rem 2.5rem', minWidth: 340, maxWidth: 420, width: '100%' }}>
            <h2 style={{ fontWeight: 700, fontSize: '1.2rem', marginBottom: 18 }}>Save Chat to My Project</h2>
            {saveError && <div style={{ color: 'var(--error-color)', marginBottom: 10 }}>{saveError}</div>}
            {saveLoading ? (
                              <div style={{ color: 'var(--text-secondary)', marginBottom: 18 }}>Loading projects...</div>
            ) : (
              <>
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Select Project</label>
                  <select
                    value={selectedProjectId}
                    onChange={e => setSelectedProjectId(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border-color)', fontSize: '1rem', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                    disabled={saveLoading || !projectsList.length}
                  >
                    {projectsList.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => setShowNewProjectFields(f => !f)}
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--accent-color)', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', marginBottom: 18, width: '100%' }}
                >
                  {showNewProjectFields ? 'Cancel New Project' : '+ New Project'}
                </button>
                {showNewProjectFields && (
                  <div style={{ marginBottom: 18 }}>
                    <input
                      type="text"
                      value={newProjectName}
                      onChange={e => setNewProjectName(e.target.value)}
                      placeholder="Project name"
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border-color)', fontSize: '1rem', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', marginBottom: 12 }}
                      autoFocus
                    />
                    <textarea
                      value={newProjectDesc}
                      onChange={e => setNewProjectDesc(e.target.value)}
                      placeholder="Description (optional)"
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border-color)', fontSize: '1rem', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', minHeight: 50, resize: 'vertical', marginBottom: 12 }}
                    />
                    <button
                      onClick={async () => {
                        setSaveLoading(true);
                        setSaveError(null);
                        try {
                          const res = await fetch(`${BACKEND_BASE}/projects`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name: newProjectName, description: newProjectDesc }),
                          });
                          if (!res.ok) throw new Error('Failed to create project');
                          const newProject = await res.json();
                          // Fetch the full updated project list
                          const projectsRes = await fetch(`${BACKEND_BASE}/projects`);
                          const allProjects = projectsRes.ok ? await projectsRes.json() : [newProject];
                          setProjectsList(allProjects);
                          setSelectedProjectId(newProject.id);
                          setNewProjectName('');
                          setNewProjectDesc('');
                          setShowNewProjectFields(false);
                        } catch (err) {
                          setSaveError('Could not create project.');
                        } finally {
                          setSaveLoading(false);
                        }
                      }}
                      style={{ background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: 8, padding: '8px 22px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', width: '100%' }}
                      disabled={!newProjectName || saveLoading}
                    >Create Project</button>
                  </div>
                )}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Chat Title</label>
                  <input
                    type="text"
                    value={saveChatTitle}
                    onChange={e => setSaveChatTitle(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border-color)', fontSize: '1rem', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                    placeholder="Enter a title for this chat"
                    disabled={saveLoading}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                  <button
                    onClick={() => setShowSaveToProjectModal(false)}
                    style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: 'none', borderRadius: 8, padding: '8px 22px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}
                    disabled={saveLoading}
                  >Cancel</button>
                  <button
                    onClick={handleSaveInputToProject}
                    style={{ background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: 8, padding: '8px 22px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}
                    disabled={!saveChatTitle.trim() || !selectedProjectId || !messages.length || saveLoading}
                  >{saveLoading ? 'Saving...' : 'Save Chat'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* Save success snackbar */}
      {showSaveSuccess && (
        <div style={{ position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', background: 'var(--accent-color)', color: 'white', borderRadius: 8, padding: '12px 32px', fontWeight: 600, fontSize: '1.1rem', zIndex: 3000, boxShadow: '0 2px 12px var(--shadow-color)', animation: 'fadeInModal 0.25s' }}>
          Note saved to project!
        </div>
      )}
      {/* Feedback Modal Overlay */}
      {feedbackModal.open && (
        <Modal onClose={() => setFeedbackModal({ open: false, msg: null })}>
          <FeedbackModalContent
            msg={feedbackModal.msg}
            onSubmit={(modalData) => handleSubmitFeedback(feedbackModal.msg, null, modalData)}
            onCancel={() => setFeedbackModal({ open: false, msg: null })}
          />
        </Modal>
      )}
      {showDeleteOverlay && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.35)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', borderRadius: 18, boxShadow: '0 4px 32px var(--shadow-color)', padding: '2rem 2.5rem', minWidth: 320, maxWidth: 400, width: '100%' }}>
            <h2 style={{ fontWeight: 700, fontSize: '1.2rem', marginBottom: 18 }}>Delete Chat?</h2>
            <div style={{ marginBottom: 24, textAlign: 'left' }}>Are you sure you want to delete this chat? This action cannot be undone.</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                onClick={() => { setShowDeleteOverlay(false); setPendingDeleteSessionId(null); }}
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: 'none', borderRadius: 8, padding: '8px 22px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}
              >Cancel</button>
              <button
                onClick={() => {
                  handleDeleteSession(pendingDeleteSessionId);
                  setShowDeleteOverlay(false);
                  setPendingDeleteSessionId(null);
                }}
                style={{ background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: 8, padding: '8px 22px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}
              >Delete</button>
            </div>
          </div>
        </div>
      )}
      {showProfileModal && (
        <ProfileModal
          user={{ 
            name: userName, 
            email: userEmail, 
            avatar: userAvatar, 
            password: (JSON.parse(localStorage.getItem('ukpUser')) || {}).password || '',
            isAdmin: localStorage.getItem('userIsAdmin') === 'true' || localStorage.getItem(`userIsAdmin_${userEmail}`) === 'true',
            isFeedbackManager: localStorage.getItem(`userIsFeedbackManager_${userEmail}`) === 'true',
            role: localStorage.getItem('userRole') || 'User',
            preferredModel: preferredModel,
            githubId: (JSON.parse(localStorage.getItem('ukpUser')) || {}).githubId,
            githubUsername: (JSON.parse(localStorage.getItem('ukpUser')) || {}).githubUsername,
          }}
          onClose={() => {
            setShowProfileModal(false);
            setProfileModalFromSidebar(false);
          }}
          onSave={updatedUser => {
            if (updatedUser.deleted) {
              handleLogout();
              setShowProfileModal(false);
              setProfileModalFromSidebar(false);
              return;
            }
            handleProfileUpdate(updatedUser);
            setPreferredModel(updatedUser.preferredModel || preferredModel);
            setShowProfileModal(false);
            setProfileModalFromSidebar(false);
          }}
          fromSidebar={profileModalFromSidebar}
          theme={theme}
          setTheme={setTheme}
          modelOptions={modelOptions}
          preferredModel={preferredModel}
          onPreferredModelChange={handlePreferredModelChange}
        />
      )}
      

      {/* PDF Preview Modal */}
      {previewPdfFile && (
        <Modal onClose={() => { setPreviewPdfFile(null); setCsvPreview(null); setDocxPreviewNode(null); }} size="large">
          <div style={{ width: '100%', height: '80vh', minWidth: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <button
              onClick={() => { setPreviewPdfFile(null); setCsvPreview(null); setDocxPreviewNode(null); }}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                zIndex: 100,
                background: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: 40,
                height: 40,
                boxShadow: '0 2px 8px #0002',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              title="Close Preview"
            >
              <FaTimes size={20} color="#374151" />
            </button>
            {(() => {
              const type = getFileType(previewPdfFile);
              if (type === 'spreadsheet' && previewPdfFile) {
                // CSV preview logic
                if (!csvPreview) {
                  const reader = new FileReader();
                  reader.onload = (e) => {
                    const text = e.target.result;
                    const rows = text.split('\n').map(row => row.split(','));
                    setCsvPreview(rows);
                  };
                  reader.readAsText(previewPdfFile);
                  return <div>Loading CSV preview...</div>;
                }
                return (
                  <div style={{ overflow: 'auto', maxHeight: '70vh', width: '100%' }}>
                    <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                      <tbody>
                        {csvPreview.map((row, i) => (
                          <tr key={i}>
                            {row.map((cell, j) => (
                              <td key={j} style={{ border: '1px solid #ccc', padding: 4 }}>{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              } else if (type === 'docx' && previewPdfFile) {
                // DOCX preview logic
                if (!docxPreviewNode) {
                  const reader = new FileReader();
                  reader.onload = async (e) => {
                    const arrayBuffer = e.target.result;
                    const container = document.createElement('div');
                    await renderDocxPreview(arrayBuffer, container);
                    setDocxPreviewNode(container.innerHTML);
                  };
                  reader.readAsArrayBuffer(previewPdfFile);
                  return <div>Loading DOCX preview...</div>;
                }
                return (
                  <div style={{ overflow: 'auto', maxHeight: '70vh', width: '100%' }} dangerouslySetInnerHTML={{ __html: docxPreviewNode }} />
                );
              } else if (type === 'pdf' || type === 'text') {
                return (
                  <PDFViewer
                    pdfUrl={URL.createObjectURL(previewPdfFile)}
                    onClose={() => setPreviewPdfFile(null)}
                    previewMode={true}
                  />
                );
              } else if (type === 'image') {
                return (
                  <img
                    src={URL.createObjectURL(previewPdfFile)}
                    alt={previewPdfFile.name}
                    style={{ maxWidth: '90vw', maxHeight: '75vh', borderRadius: 12, boxShadow: '0 2px 16px #0002' }}
                  />
                );
              } else if (type === 'audio') {
                return (
                  <audio controls style={{ width: '100%' }}>
                    <source src={URL.createObjectURL(previewPdfFile)} />
                    Your browser does not support the audio element.
                  </audio>
                );
              } else {
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>{getFileTypeIcon(previewPdfFile)}</div>
                    <div style={{ fontSize: 18, color: '#555', wordBreak: 'break-all' }}>{previewPdfFile.name}</div>
                    <div style={{ color: 'var(--text-secondary)', marginTop: 12 }}>No preview available</div>
                  </div>
                );
              }
            })()}
          </div>
        </Modal>
      )}
      {sourcePreview.type && (
        <Modal onClose={() => setSourcePreview({ type: null, url: null, name: null, docxHtml: null, csvRows: null, loading: false, error: null })} size="large">
          <div style={{ width: '100%', height: '80vh', minWidth: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <button
              onClick={() => setSourcePreview({ type: null, url: null, name: null, docxHtml: null, csvRows: null, loading: false, error: null })}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                zIndex: 100,
                background: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: 40,
                height: 40,
                boxShadow: '0 2px 8px #0002',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              title="Close Preview"
            >
              <FaTimes size={20} color="#374151" />
            </button>
            {sourcePreview.loading ? (
                              <div style={{ color: 'var(--text-secondary)', fontSize: 20 }}>Loading preview...</div>
            ) : sourcePreview.error ? (
              <div style={{ color: 'red', fontSize: 18 }}>{sourcePreview.error}</div>
            ) : sourcePreview.type === 'image' ? (
              <img src={sourcePreview.url} style={{ maxWidth: '90vw', maxHeight: '75vh', borderRadius: 12, boxShadow: '0 2px 16px #0002' }} alt="Preview" />
            ) : sourcePreview.type === 'audio' ? (
              <ReactAudioPlayer src={sourcePreview.url} controls style={{ width: '100%' }} />
            ) : sourcePreview.type === 'spreadsheet' && sourcePreview.csvRows ? (
              <div style={{ overflow: 'auto', maxHeight: '70vh', width: '100%' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                  <tbody>
                    {sourcePreview.csvRows.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j} style={{ border: '1px solid #ccc', padding: 4 }}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : sourcePreview.type === 'docx' && sourcePreview.docxHtml ? (
              <div style={{ overflow: 'auto', maxHeight: '70vh', width: '100%' }} dangerouslySetInnerHTML={{ __html: sourcePreview.docxHtml }} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}><FaFile style={{ color: 'white' }} /></div>
                <div style={{ fontSize: 18, color: '#555', wordBreak: 'break-all' }}>{sourcePreview.name}</div>
                <div style={{ color: 'var(--text-secondary)', marginTop: 12 }}>No preview available for this file type.</div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

export default App;