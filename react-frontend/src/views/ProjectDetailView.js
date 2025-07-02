import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { FaArrowLeft, FaFolderOpen, FaEdit, FaTrash, FaSave, FaPlus, FaRegCommentAlt } from 'react-icons/fa';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { marked } from 'marked';

const BACKEND_BASE = process.env.REACT_APP_BACKEND_BASE || 'http://localhost:5000';

export default function ProjectDetailView({ project, onBack }) {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteText, setEditingNoteText] = useState('');
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [error, setError] = useState(null);
  const [chats, setChats] = useState([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [chatsError, setChatsError] = useState(null);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [editingChatTitle, setEditingChatTitle] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState('');

  useEffect(() => {
    fetchNotes();
    fetchChats();
    setSelectedChatId(null);
    // eslint-disable-next-line
  }, [project]);

  const fetchNotes = async () => {
    setLoadingNotes(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_BASE}/projects/${project.id}/notes`);
      if (!res.ok) throw new Error('Failed to fetch notes');
      const data = await res.json();
      setNotes(data);
    } catch (err) {
      setError('Could not load notes.');
    } finally {
      setLoadingNotes(false);
    }
  };

  const fetchChats = async () => {
    setLoadingChats(true);
    setChatsError(null);
    try {
      const res = await fetch(`${BACKEND_BASE}/projects/${project.id}/chats`);
      if (!res.ok) throw new Error('Failed to fetch chats');
      const data = await res.json();
      setChats(data);
      if (data.length > 0) setSelectedChatId(data[0].id);
    } catch (err) {
      setChatsError('Could not load chats.');
    } finally {
      setLoadingChats(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setError(null);
    try {
      const res = await fetch(`${BACKEND_BASE}/projects/${project.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newNote }),
      });
      if (!res.ok) throw new Error('Failed to add note');
      const note = await res.json();
      setNotes([note, ...notes]);
      setNewNote('');
    } catch (err) {
      setError('Could not add note.');
    }
  };

  const handleDeleteNote = async (id) => {
    setError(null);
    try {
      const res = await fetch(`${BACKEND_BASE}/projects/${project.id}/notes/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete note');
      setNotes(notes.filter(n => n.id !== id));
    } catch (err) {
      setError('Could not delete note.');
    }
  };

  const handleEditNote = (id, text) => {
    setEditingNoteId(id);
    setEditingNoteText(text);
  };

  const handleSaveEdit = async () => {
    setError(null);
    try {
      const res = await fetch(`${BACKEND_BASE}/projects/${project.id}/notes/${editingNoteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editingNoteText }),
      });
      if (!res.ok) throw new Error('Failed to update note');
      const updated = await res.json();
      setNotes(notes.map(n => n.id === editingNoteId ? updated : n));
      setEditingNoteId(null);
      setEditingNoteText('');
    } catch (err) {
      setError('Could not update note.');
    }
  };

  // Export selected chat to Word
  const handleExportChatToWord = () => {
    if (!selectedChat) return;
    // Combine all messages (user and assistant) in order
    const allContent = selectedChat.messages.map(msg => {
      let senderLabel = msg.sender === 'user' ? 'You:' : 'Assistant:';
      return `**${senderLabel}**\n${msg.content}`;
    }).join('\n\n');

    // Convert Markdown to HTML
    const html = marked.parse(allContent);
    const parser = new window.DOMParser();
    const docHtml = parser.parseFromString(html, 'text/html');
    const body = docHtml.body;

    function parseNode(node) {
      if (node.nodeType === 3) {
        return new TextRun(node.textContent);
      }
      if (node.nodeType !== 1) return null;
      switch (node.tagName.toLowerCase()) {
        case 'strong':
        case 'b':
          return new TextRun({ text: node.textContent, bold: true });
        case 'em':
        case 'i':
          return new TextRun({ text: node.textContent, italics: true });
        case 'u':
          return new TextRun({ text: node.textContent, underline: {} });
        case 'br':
          return new TextRun({ text: '\n' });
        case 'p':
          return new Paragraph({ children: Array.from(node.childNodes).map(parseNode).filter(Boolean) });
        case 'li':
          return new Paragraph({ text: node.textContent, bullet: { level: 0 } });
        case 'ul':
        case 'ol':
          return Array.from(node.childNodes).map(parseNode).filter(Boolean);
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
          return new Paragraph({ text: node.textContent, heading: 'HEADING_1' });
        default:
          return new Paragraph({ children: Array.from(node.childNodes).map(parseNode).filter(Boolean) });
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
      a.download = `${selectedChat.title || 'chat-history'}-${new Date().toISOString()}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  };

  if (!project) return null;
  const selectedChat = chats.find(c => c.id === selectedChatId);
  const isDarkMode = document.body.classList.contains('dark-mode') || document.documentElement.classList.contains('dark-mode');
  return (
    <div style={{ maxWidth: 1600, margin: '2.5rem auto', display: 'flex', gap: 32, alignItems: 'flex-start', color: 'var(--text-primary)', minHeight: 600 }}>
      {/* Left: Chat area */}
      <div style={{ flex: 7, minWidth: 340, maxWidth: 950, background: 'var(--bg-secondary)', borderRadius: 18, boxShadow: '0 2px 16px var(--shadow-color)', padding: '2.5rem', display: 'flex', flexDirection: 'column', height: '80vh' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--accent-color)', fontWeight: 600, fontSize: '1rem', display: 'flex', alignItems: 'center', marginBottom: 24, cursor: 'pointer' }}>
          <FaArrowLeft style={{ marginRight: 8 }} /> Back to Projects
        </button>
        {/* Chat switcher dropdown */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontWeight: 600, marginRight: 10 }}>Saved Chat:</label>
          <select
            value={selectedChatId || ''}
            onChange={e => setSelectedChatId(e.target.value)}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid var(--border-color)', fontSize: '1rem', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
            disabled={loadingChats || chats.length === 0}
          >
            {chats.map(chat => (
              <option key={chat.id} value={chat.id}>{chat.title} ({chat.createdAt ? new Date(chat.createdAt).toLocaleDateString() : ''})</option>
            ))}
          </select>
        </div>
        {/* Chat heading and metadata */}
        {selectedChat && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10 }}>
              <FaFolderOpen size={32} style={{ color: 'var(--accent-color)' }} />
              {editingChatTitle ? (
                <>
                  <input
                    type="text"
                    value={newChatTitle}
                    onChange={e => setNewChatTitle(e.target.value)}
                    style={{ fontWeight: 700, fontSize: '1.2rem', borderRadius: 8, border: '1.5px solid var(--border-color)', padding: '6px 12px', marginRight: 8 }}
                    autoFocus
                  />
                  <button
                    onClick={async () => {
                      if (!newChatTitle.trim()) return;
                      try {
                        const res = await fetch(`${BACKEND_BASE}/projects/${project.id}/chats/${selectedChat.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ title: newChatTitle.trim() }),
                        });
                        if (!res.ok) throw new Error('Failed to update chat title');
                        const updated = await res.json();
                        setChats(chats.map(c => c.id === selectedChat.id ? { ...c, title: updated.title } : c));
                        setEditingChatTitle(false);
                      } catch (err) {
                        alert('Could not update chat title.');
                      }
                    }}
                    style={{ background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: 8, padding: '6px 12px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}
                    title="Save"
                  ><FaSave /></button>
                  <button
                    onClick={() => setEditingChatTitle(false)}
                    style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: 'none', borderRadius: 8, padding: '6px 12px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}
                    title="Cancel"
                  ><FaTrash /></button>
                </>
              ) : (
                <>
                  <div style={{ fontWeight: 700, fontSize: '1.5rem' }}>{selectedChat.title}</div>
                  <button
                    onClick={() => { setEditingChatTitle(true); setNewChatTitle(selectedChat.title); }}
                    style={{ background: 'var(--bg-secondary)', color: 'var(--accent-color)', border: 'none', borderRadius: 8, padding: '6px 12px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}
                    title="Edit Chat Name"
                  ><FaEdit /></button>
                </>
              )}
              <button
                onClick={handleExportChatToWord}
                style={{ background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: 8, padding: '6px 16px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', marginLeft: 12 }}
                title="Export to Word"
              >Export to Word</button>
            </div>
            <div style={{ color: '#888', fontSize: '1.05rem', marginBottom: 18 }}>{selectedChat.createdAt ? new Date(selectedChat.createdAt).toLocaleString() : ''}</div>
            <div style={{ background: 'var(--bg-tertiary)', borderRadius: 14, padding: '18px 18px 12px 18px', minHeight: 220, maxHeight: '55vh', overflowY: 'auto', boxShadow: '0 2px 8px var(--shadow-color)', marginBottom: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {selectedChat.messages.map((msg, idx) => (
                  <div key={idx} style={{
                    alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    background: msg.sender === 'user'
                      ? 'var(--accent-color)'
                      : (isDarkMode ? 'var(--bg-tertiary)' : '#f1f1f1'),
                    color: msg.sender === 'user' ? 'white' : 'var(--text-primary)',
                    borderRadius: 16,
                    padding: '14px 20px',
                    maxWidth: 520,
                    width: 'fit-content',
                    wordBreak: 'break-word',
                    fontWeight: msg.sender === 'user' ? 600 : 400,
                    boxShadow: msg.sender === 'user' ? '0 2px 8px #b3c6ff' : '0 1px 4px #222',
                    fontSize: '1.12rem',
                    whiteSpace: 'pre-wrap',
                    marginLeft: msg.sender === 'user' ? 'auto' : 0,
                    marginRight: msg.sender === 'user' ? 0 : 'auto',
                  }}>
                    <ReactMarkdown>{msg.sender === 'user' ? `You: ${msg.content}` : `AI: ${msg.content}`}</ReactMarkdown>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
        {chatsError && <div style={{ color: 'var(--error-color)', marginTop: 12 }}>{chatsError}</div>}
        {loadingChats && <div style={{ color: '#aaa', fontStyle: 'italic', marginTop: 12 }}>(Loading chats...)</div>}
        {!selectedChat && !loadingChats && <div style={{ color: '#aaa', fontStyle: 'italic', marginTop: 12 }}>(No chat selected.)</div>}
      </div>
      {/* Right: Notes sidebar */}
      <div style={{ flex: 3, minWidth: 280, maxWidth: 480, background: 'var(--bg-secondary)', borderRadius: 18, boxShadow: '0 2px 16px var(--shadow-color)', padding: '2.5rem', height: '80vh', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontWeight: 700, fontSize: '1.3rem', marginBottom: 18 }}>Notes</h2>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <textarea
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            placeholder="Add a new note... (Markdown supported)"
            style={{ flex: 1, minHeight: 40, borderRadius: 8, border: '1.5px solid var(--border-color)', padding: '10px 14px', fontSize: '1rem', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontFamily: 'inherit' }}
          />
          <button
            onClick={handleAddNote}
            style={{ background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: 8, padding: '0 18px', fontWeight: 600, fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            disabled={!newNote.trim()}
            title="Add Note"
          >
            <FaPlus />
          </button>
        </div>
        {error && <div style={{ color: 'var(--error-color)', marginBottom: 8 }}>{error}</div>}
        {loadingNotes ? (
          <div style={{ color: '#aaa', fontStyle: 'italic' }}>(Loading notes...)</div>
        ) : notes.length === 0 ? (
          <div style={{ color: '#aaa', fontStyle: 'italic' }}>(No notes yet.)</div>
        ) : (
          notes.map(note => (
            <div key={note.id} style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', borderRadius: 8, padding: '10px 14px', marginBottom: 10, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              {editingNoteId === note.id ? (
                <>
                  <textarea
                    value={editingNoteText}
                    onChange={e => setEditingNoteText(e.target.value)}
                    style={{ flex: 1, minHeight: 40, borderRadius: 8, border: '1.5px solid var(--border-color)', padding: '8px 12px', fontSize: '1rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                  />
                  <button onClick={handleSaveEdit} style={{ background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: 8, padding: '6px 12px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }} title="Save"><FaSave /></button>
                  <button onClick={() => setEditingNoteId(null)} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: 'none', borderRadius: 8, padding: '6px 12px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }} title="Cancel"><FaTrash /></button>
                </>
              ) : (
                <>
                  <div style={{ flex: 1, whiteSpace: 'pre-wrap' }}>{note.text}</div>
                  <button onClick={() => handleEditNote(note.id, note.text)} style={{ background: 'var(--bg-secondary)', color: 'var(--accent-color)', border: 'none', borderRadius: 8, padding: '6px 12px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }} title="Edit"><FaEdit /></button>
                  <button onClick={() => handleDeleteNote(note.id)} style={{ background: 'var(--bg-secondary)', color: '#e74c3c', border: 'none', borderRadius: 8, padding: '6px 12px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }} title="Delete"><FaTrash /></button>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
} 