import { useState, useRef, useEffect } from 'react';
import { Paperclip, ArrowRight, File, X } from 'lucide-react';

export default function InputBar({ onSendMessage, setUploadStatus, uploadStatus, setDocuments, documents, isHero }) {
  const [inputText, setInputText] = useState('');
  const [activeUploads, setActiveUploads] = useState([]);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleYoutubeUpload = async (url) => {
    const formData = new FormData();
    formData.append('youtube_url', url);

    try {
      const res = await fetch('http://localhost:8000/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.doc_id) {
        setDocuments(prev => [{ doc_id: data.doc_id, name: data.name, source_type: 'youtube', status: 'pending' }, ...prev]);
        setUploadStatus(prev => ({ ...prev, [data.doc_id]: { progress: 0, status: 'pending' } }));
        setActiveUploads(prev => [...prev, { id: data.doc_id, name: data.name }]);
        pollStatus(data.doc_id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleInput = (e) => {
    let text = e.target.value;
    
    // Match the full YouTube URL including query parameters
    const ytRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:\S+)?/;
    const match = text.match(ytRegex);
    
    if (match) {
        // Send just the clean URL to the backend, but strip the entire raw URL from the chat
        const rawUrl = match[0];
        const cleanUrl = `https://youtu.be/${match[1]}`;
        text = text.replace(rawUrl, '').trim();
        handleYoutubeUpload(cleanUrl);
    }
    
    setInputText(text);
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [inputText]);

  const pollStatus = (doc_id) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:8000/status/${doc_id}`);
        const data = await res.json();
        if (data.progress !== undefined) {
          setUploadStatus(prev => ({ ...prev, [doc_id]: { progress: data.progress, status: data.status } }));
          if (data.progress >= 100 || data.status === 'error') clearInterval(interval);
        } else {
          clearInterval(interval);
        }
      } catch (e) {
        console.error(e);
        clearInterval(interval);
      }
    }, 1000);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('http://localhost:8000/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.doc_id) {
        setDocuments(prev => [{ doc_id: data.doc_id, name: data.name, source_type: data.source_type, status: 'pending' }, ...prev]);
        setUploadStatus(prev => ({ ...prev, [data.doc_id]: { progress: 0, status: 'pending' } }));
        setActiveUploads(prev => [...prev, { id: data.doc_id, name: data.name }]);
        pollStatus(data.doc_id);
      }
    } catch (err) {
      console.error(err);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = () => {
    if (!inputText.trim() && activeUploads.length === 0) return;
    onSendMessage(inputText.trim(), activeUploads);
    setInputText('');
    setActiveUploads([]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full relative">
      {/* Input Container */}
      <div 
        className="flex flex-col gap-2 rounded-[24px] p-2 pl-4 border transition-all shadow-lg"
        style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}
      >
        {/* Active Uploads Chips */}
        {activeUploads.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1 w-full">
            {activeUploads.map(upload => {
              const statusData = uploadStatus[upload.id] || { progress: 0, status: 'pending' };
              const isDone = statusData.progress >= 100 || statusData.status === 'completed';
              const isError = statusData.status === 'error';

              return (
                <div key={upload.id} className="flex items-center gap-2 bg-[#2a2a2a] px-3 py-2 rounded-xl border border-[#3a3a3a] text-sm text-white">
                  <div className={`p-1.5 rounded-lg flex items-center justify-center ${isError ? 'bg-red-500/20 text-red-400' : isDone ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                    <File size={16} strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col max-w-[120px] justify-center">
                    <span className="truncate text-[13px] font-medium leading-tight">{upload.name}</span>
                    {!isDone && !isError && (
                      <div className="w-full bg-[#1a1a1a] h-1 mt-1 rounded overflow-hidden">
                        <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${statusData.progress}%` }}></div>
                      </div>
                    )}
                    {isDone && <span className="text-[10px] text-green-400 font-semibold leading-tight mt-0.5">Ready</span>}
                    {isError && <span className="text-[10px] text-red-400 font-semibold leading-tight mt-0.5">Failed</span>}
                  </div>
                  <button onClick={() => setActiveUploads(prev => prev.filter(u => u.id !== upload.id))} className="ml-1 text-gray-400 hover:text-white transition-colors">
                    <X size={16} strokeWidth={2.5} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-end gap-3 w-full">
          {/* Center: Textarea */}
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything..."
          className="flex-1 max-h-[200px] min-h-[44px] bg-transparent outline-none resize-none py-3 text-[15px] placeholder:text-[var(--text-muted)] text-white font-light tracking-wide"
          rows={1}
        />

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 mb-1 mr-1">
          <button 
            onClick={() => fileInputRef.current?.click()} 
            className="p-2.5 rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-white transition-colors"
            title="Attach file"
          >
            <Paperclip size={20} strokeWidth={2} />
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.txt" />
          </button>
          
          <button 
            onClick={handleSend}
            disabled={!inputText.trim() && activeUploads.length === 0}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors disabled:opacity-30 disabled:bg-transparent bg-white text-black hover:bg-gray-200"
          >
            <ArrowRight size={20} strokeWidth={2.5} />
          </button>
        </div>
        </div>
      </div>

      {/* Footer Text */}
      <div className="mt-4 text-center text-[12px] font-light tracking-wide text-[var(--text-muted)]">
        Powered by Ollama
      </div>
    </div>
  );
}
