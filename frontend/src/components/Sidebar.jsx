import { useState } from 'react';
import { Plus, MessageSquare, File, FileText, PlaySquare, Trash2, Settings, HelpCircle, PanelLeftClose, Edit2 } from 'lucide-react';
import DocumentModal from './DocumentModal';

export default function Sidebar({ currentView, setCurrentView, documents = [], setDocuments, sessions = [], setSessions, activeSessionId, loadSession, createNewThread, setSidebarOpen }) {
  const [selectedDoc, setSelectedDoc] = useState(null);

  const handleDelete = async (e, doc_id) => {
    e.stopPropagation();
    try {
      await fetch(`http://localhost:8000/documents/${doc_id}`, { method: 'DELETE' });
      if (setDocuments) {
        setDocuments(prev => prev.filter(d => d.doc_id !== doc_id));
      }
    } catch (err) {
      console.error("Failed to delete document", err);
    }
  };

  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation();
    try {
      await fetch(`http://localhost:8000/sessions/${sessionId}`, { method: 'DELETE' });
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (activeSessionId === sessionId) {
         createNewThread();
      }
    } catch(err) {
      console.error("Failed to delete session", err);
    }
  };

  const handleRenameSession = async (e, sessionId, currentTitle) => {
    e.stopPropagation();
    const newTitle = prompt("Enter new title:", currentTitle);
    if (newTitle && newTitle.trim() !== "" && newTitle !== currentTitle) {
      try {
        await fetch(`http://localhost:8000/sessions/${sessionId}`, { 
           method: 'PUT',
           headers: {'Content-Type': 'application/json'},
           body: JSON.stringify({ title: newTitle.trim() })
        });
        setSessions(prev => prev.map(s => s.id === sessionId ? {...s, title: newTitle.trim()} : s));
      } catch (err) {
        console.error("Failed to rename session", err);
      }
    }
  };
  return (
    <div className="flex flex-col h-full text-sm font-light tracking-wide transition-all">
      {/* Top Header */}
      <div className="flex items-center justify-between p-4 pb-2">
        <span className="font-semibold text-lg tracking-tight">Cerebro</span>
        <button onClick={() => setSidebarOpen(false)} className="text-[var(--text-secondary)] hover:text-white transition-colors">
          <PanelLeftClose size={18} />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="px-3 mt-4 mb-6">
        <button 
          onClick={createNewThread}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-full border text-[13px] font-medium transition-all hover:bg-[var(--bg-hover)]" 
          style={{ borderColor: 'var(--border)' }}
        >
          <Plus size={16} />
          New Thread
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3">
        {/* Chat History Section */}
        <div className="mb-8">
          <div className="px-2 mb-3 text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--text-muted)' }}>
            Recent Threads
          </div>
          <div className="flex flex-col gap-1">
             {sessions.length === 0 ? (
               <div className="px-3 py-2 text-[12px] text-[var(--text-muted)] italic">
                 No recent threads.
               </div>
             ) : (
               sessions.map(session => (
                 <div 
                   key={session.id}
                   onClick={() => loadSession(session.id)}
                   className={`flex items-center gap-3 px-3 py-2 rounded-lg text-left group cursor-pointer ${activeSessionId === session.id ? 'bg-[var(--bg-active)]' : 'hover:bg-[var(--bg-hover)]'}`}
                 >
                   <MessageSquare size={14} className={activeSessionId === session.id ? "text-white" : "text-[var(--text-secondary)] group-hover:text-white transition-colors"} />
                   <span className={`truncate flex-1 text-[13px] font-medium ${activeSessionId === session.id ? "text-white" : "text-[var(--text-secondary)] group-hover:text-white transition-colors"}`}>
                     {session.title}
                   </span>
                   
                   <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                      <button 
                        onClick={(e) => handleRenameSession(e, session.id, session.title)}
                        className="text-[var(--text-muted)] hover:text-white transition-colors"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button 
                        onClick={(e) => handleDeleteSession(e, session.id)}
                        className="text-[var(--text-muted)] hover:text-white transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                   </div>
                 </div>
               ))
             )}
          </div>
        </div>

        {/* Knowledge Base Section */}
        <div>
          <div className="px-2 mb-3 text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--text-muted)' }}>
            Knowledge Base
          </div>
          <div className="flex flex-col gap-1">
            {documents.length === 0 ? (
              <div className="px-3 py-2 text-[12px] text-[var(--text-muted)] italic">
                No documents uploaded yet. Use the paperclip icon to upload.
              </div>
            ) : (
              documents.map(doc => (
                <div 
                  key={doc.doc_id} 
                  onClick={() => setSelectedDoc(doc)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-[var(--bg-hover)] group cursor-pointer" 
                  title={doc.name}
                >
                  {doc.source_type === 'youtube' ? (
                    <PlaySquare size={14} className="text-[var(--text-secondary)] group-hover:text-white transition-colors flex-shrink-0" />
                  ) : (
                    <FileText size={14} className="text-[var(--text-secondary)] group-hover:text-white transition-colors flex-shrink-0" />
                  )}
                  <span className="truncate flex-1 text-[13px] text-[var(--text-secondary)] group-hover:text-white transition-colors">
                    {doc.name}
                  </span>
                  {doc.status === 'processing' && (
                    <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
                  )}
                  {doc.status === 'error' && (
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  )}
                  <button 
                    onClick={(e) => handleDelete(e, doc.doc_id)}
                    className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-white transition-colors ml-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Pinned */}
      <div className="p-4 mt-auto">
        <button 
          onClick={() => setCurrentView('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--bg-hover)] text-left group ${currentView === 'settings' ? 'bg-[var(--bg-active)]' : ''}`}
        >
          <Settings size={16} className={`group-hover:text-white transition-colors ${currentView === 'settings' ? 'text-white' : 'text-[var(--text-secondary)]'}`} />
          <span className={`text-[13px] group-hover:text-white transition-colors ${currentView === 'settings' ? 'text-white' : 'text-[var(--text-secondary)]'}`}>Settings</span>
        </button>
        <button 
          onClick={() => setCurrentView('help')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--bg-hover)] text-left group mt-1 ${currentView === 'help' ? 'bg-[var(--bg-active)]' : ''}`}
        >
          <HelpCircle size={16} className={`group-hover:text-white transition-colors ${currentView === 'help' ? 'text-white' : 'text-[var(--text-secondary)]'}`} />
          <span className={`text-[13px] group-hover:text-white transition-colors ${currentView === 'help' ? 'text-white' : 'text-[var(--text-secondary)]'}`}>Help & FAQ</span>
        </button>
      </div>

      {selectedDoc && (
        <DocumentModal 
          docId={selectedDoc.doc_id} 
          docName={selectedDoc.name} 
          onClose={() => setSelectedDoc(null)} 
        />
      )}
    </div>
  );
}
