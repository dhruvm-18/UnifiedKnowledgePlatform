import React, { useState, useEffect } from 'react';
import { FaFolderOpen, FaPlus, FaEdit, FaTrash, FaFileExport, FaSearch } from 'react-icons/fa';
import ProjectDetailView from './ProjectDetailView';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { marked } from 'marked';

const BACKEND_BASE = process.env.REACT_APP_BACKEND_BASE || 'http://localhost:5000';

export default function MyProjectsView({ refreshKey }) {
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState('');
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const [editProjectId, setEditProjectId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch projects on mount and when refreshKey changes
  useEffect(() => {
    fetchProjects();
    // eslint-disable-next-line
  }, [refreshKey]);

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_BASE}/projects`);
      if (!res.ok) throw new Error('Failed to fetch projects');
      const data = await res.json();
      setProjects(data);
    } catch (err) {
      setError('Could not load projects.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_BASE}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName, description: newProjectDesc }),
      });
      if (!res.ok) throw new Error('Failed to create project');
      setShowNewProjectModal(false);
      setNewProjectName('');
      setNewProjectDesc('');
      await fetchProjects();
    } catch (err) {
      setError('Could not create project.');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (project) => {
    setEditProjectId(project.id);
    setNewProjectName(project.name);
    setNewProjectDesc(project.description);
    setShowNewProjectModal(true);
  };

  const handleSaveProject = async () => {
    if (!newProjectName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_BASE}/projects/${editProjectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName, description: newProjectDesc }),
      });
      if (!res.ok) throw new Error('Failed to update project');
      setShowNewProjectModal(false);
      setEditProjectId(null);
      setNewProjectName('');
      setNewProjectDesc('');
      await fetchProjects();
    } catch (err) {
      setError('Could not update project.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_BASE}/projects/${projectToDelete.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete project');
      setShowDeleteConfirm(false);
      setProjectToDelete(null);
      await fetchProjects();
    } catch (err) {
      setError('Could not delete project.');
    } finally {
      setLoading(false);
    }
  };

  // Export all chats in a project to Word
  const handleExportProjectToWord = async (project) => {
    try {
      const res = await fetch(`${BACKEND_BASE}/projects/${project.id}/chats`);
      if (!res.ok) throw new Error('Failed to fetch chats');
      const chats = await res.json();
      if (!chats.length) return alert('No chats to export for this project.');
      // Combine all chats/messages
      const allContent = chats.map(chat => {
        const chatHeader = `# ${chat.title || 'Chat'} (${chat.createdAt ? new Date(chat.createdAt).toLocaleDateString() : ''})`;
        const messages = chat.messages.map(msg => {
          let senderLabel = msg.sender === 'user' ? 'You:' : 'Assistant:';
          return `**${senderLabel}**\n${msg.content}`;
        }).join('\n\n');
        return `${chatHeader}\n\n${messages}`;
      }).join('\n\n---\n\n');
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
        a.download = `${project.name || 'project'}-chats-${new Date().toISOString()}.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    } catch (err) {
      alert('Failed to export project chats.');
    }
  };

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase())
  );

  if (selectedProject) {
    return <ProjectDetailView project={selectedProject} onBack={() => setSelectedProject(null)} />;
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2.5rem 2.5rem 2rem 2.5rem', width: '100%', minHeight: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }}>My Projects</h1>
        <button
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: 18, padding: '10px 22px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}
          onClick={() => { setShowNewProjectModal(true); setEditProjectId(null); setNewProjectName(''); setNewProjectDesc(''); }}
        >
          <FaPlus /> New Project
        </button>
      </div>
      <div style={{ marginBottom: 24, position: 'relative', maxWidth: 500 }}>
        <FaSearch style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '1.2em', pointerEvents: 'none', zIndex: 1 }} />
        <input
          type="text"
          placeholder="Search projects..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: 320,
            maxWidth: '100%',
            padding: '10px 16px 10px 45px',
            borderRadius: 12,
            border: '1.5px solid var(--border-color)',
            fontSize: '1rem',
            background: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            transition: 'background 0.2s, color 0.2s, border 0.2s'
          }}
        />
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', color: '#888', marginTop: 64, fontSize: '1.2rem' }}>Loading projects...</div>
      ) : error ? (
        <div style={{ textAlign: 'center', color: 'var(--error-color)', marginTop: 64, fontSize: '1.2rem' }}>{error}</div>
      ) : filteredProjects.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#888', marginTop: 64, fontSize: '1.2rem' }}>
          <FaFolderOpen size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
          <div>No projects yet. Click <b>New Project</b> to get started!</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 28 }}>
          {filteredProjects.map(project => (
            <div key={project.id} style={{ background: 'var(--bg-secondary)', borderRadius: 18, boxShadow: '0 2px 8px var(--shadow-color)', padding: '1.5rem 1.2rem', display: 'flex', flexDirection: 'column', gap: 12, position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <FaFolderOpen size={28} style={{ color: 'var(--accent-color)' }} />
                <div style={{ fontWeight: 700, fontSize: '1.15rem' }}>{project.name}</div>
              </div>
              <div style={{ color: '#666', fontSize: '1rem', marginBottom: 8 }}>{project.description}</div>
              <div style={{ fontSize: '0.95rem', color: '#888' }}>Last updated: {project.date} • {project.notes ? project.notes.length : 0} notes</div>
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button title="Open" style={{ background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: 8, padding: '6px 16px', fontWeight: 600, cursor: 'pointer' }} onClick={() => setSelectedProject(project)}>Open</button>
                <button title="Edit" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: 'none', borderRadius: 8, padding: '6px 16px', fontWeight: 600, cursor: 'pointer' }} onClick={() => openEditModal(project)}><FaEdit /></button>
                <button title="Delete" style={{ background: 'var(--bg-tertiary)', color: '#e74c3c', border: 'none', borderRadius: 8, padding: '6px 16px', fontWeight: 600, cursor: 'pointer' }} onClick={() => { setShowDeleteConfirm(true); setProjectToDelete(project); }}><FaTrash /></button>
                <button title="Export" style={{ background: 'var(--bg-tertiary)', color: 'var(--accent-color)', border: 'none', borderRadius: 8, padding: '6px 16px', fontWeight: 600, cursor: 'pointer' }} onClick={() => handleExportProjectToWord(project)}><FaFileExport /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New/Edit Project Modal */}
      {showNewProjectModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.35)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', borderRadius: 18, boxShadow: '0 4px 32px var(--shadow-color)', padding: '2.5rem', minWidth: 340, maxWidth: 420, width: '100%' }}>
            <h2 style={{ fontWeight: 700, fontSize: '1.3rem', marginBottom: 24 }}>{editProjectId ? 'Edit Project' : 'Create New Project'}</h2>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Project Name</label>
              <input
                type="text"
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                style={{ width: '100%', padding: '10px 5px', borderRadius: 10, border: '1.5px solid var(--border-color)', fontSize: '1rem', fontFamily: 'inherit', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                placeholder="Enter project name"
                autoFocus
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Description</label>
              <textarea
                value={newProjectDesc}
                onChange={e => setNewProjectDesc(e.target.value)}
                style={{ width: '100%', padding: '10px 5px', borderRadius: 10, border: '1.5px solid var(--border-color)', fontSize: '1rem', fontFamily: 'inherit', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', minHeight: 70, resize: 'vertical' }}
                placeholder="Describe your project (optional)"
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                onClick={() => { setShowNewProjectModal(false); setEditProjectId(null); setNewProjectName(''); setNewProjectDesc(''); }}
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: 'none', borderRadius: 8, padding: '8px 22px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}
              >Cancel</button>
              <button
                onClick={editProjectId ? handleSaveProject : handleCreateProject}
                style={{ background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: 8, padding: '8px 22px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}
                disabled={!newProjectName.trim()}
              >{editProjectId ? 'Save' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.35)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', borderRadius: 18, boxShadow: '0 4px 32px var(--shadow-color)', padding: '2rem 2.5rem', minWidth: 320, maxWidth: 400, width: '100%' }}>
            <h2 style={{ fontWeight: 700, fontSize: '1.2rem', marginBottom: 18 }}>Delete Project</h2>
            <div style={{ marginBottom: 24 }}>Are you sure you want to delete <b>{projectToDelete?.name}</b>? This action cannot be undone.</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                onClick={() => { setShowDeleteConfirm(false); setProjectToDelete(null); }}
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: 'none', borderRadius: 8, padding: '8px 22px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}
              >Cancel</button>
              <button
                onClick={handleDeleteProject}
                style={{ background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: 8, padding: '8px 22px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}
              >Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 