import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import ChatInterface from './components/ChatInterface';
import InputBar from './components/InputBar';
import UploadProgress from './components/UploadProgress';

function App() {
  const [messages, setMessages] = useState([
    { role: 'bot', content: 'Hello! I am Cerebro. Ask me anything about your documents.', sources: [] }
  ]);
  
  const [documents, setDocuments] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [uploadStatus, setUploadStatus] = useState({});
  const [isTyping, setIsTyping] = useState(false);
  const [model, setModel] = useState("qwen2.5:7b");
  const [currentView, setCurrentView] = useState('chat'); // 'chat', 'settings', 'help'
  
  useEffect(() => {
    fetch('http://localhost:8000/documents')
      .then(res => res.json())
      .then(data => setDocuments(data))
      .catch(err => console.error("Failed to fetch documents", err));
      
    fetch('http://localhost:8000/sessions')
      .then(res => res.json())
      .then(data => setSessions(data))
      .catch(err => console.error("Failed to fetch sessions", err));
  }, []);

  const loadSession = async (sessionId) => {
    setActiveSessionId(sessionId);
    setCurrentView('chat');
    try {
        const res = await fetch(`http://localhost:8000/sessions/${sessionId}/messages`);
        const data = await res.json();
        setMessages(data);
    } catch(err) {
        console.error("Failed to load messages", err);
    }
  };

  const createNewThread = () => {
    setActiveSessionId(null);
    setMessages([]);
    setCurrentView('chat');
  };

  const handleSendMessage = async (text, attachments = []) => {
    const newMessages = [...messages, { role: 'user', content: text, attachments: attachments }];
    setMessages(newMessages);
    setIsTyping(true);

    let currentSessionId = activeSessionId;
    if (!currentSessionId) {
       // Create session on first message
       try {
           // Create a short title from the text
           const title = text.length > 30 ? text.substring(0, 30) + '...' : text;
           const res = await fetch('http://localhost:8000/sessions', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ title: title })
           });
           const data = await res.json();
           currentSessionId = data.id;
           setActiveSessionId(currentSessionId);
           setSessions(prev => [{id: currentSessionId, title: title, updated_at: new Date().toISOString()}, ...prev]);
       } catch (err) {
           console.error("Failed to create session", err);
       }
    }

    try {
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, model: model, session_id: currentSessionId })
      });
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let botContent = '';
      let isFirstChunk = true;
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (isFirstChunk) {
           setIsTyping(false);
           isFirstChunk = false;
        }
        
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        botContent += chunk;
        
        let sources = [];
        let displayContent = botContent;
        if (botContent.includes("Sources:\n")) {
           const parts = botContent.split("Sources:\n");
           displayContent = parts[0].trim();
           const sourceLines = parts[1].split("\n");
           sourceLines.forEach(line => {
             const match = line.match(/- \[ID: (.*?)\|(.*?)\|(.*?)\|(.*?)\]/);
             if (match) {
               sources.push({ type: match[2], title: match[3], reference: match[4] });
             }
           });
        }
        
        setMessages(prev => {
          const updated = [...prev];
          if (updated[updated.length - 1].role === 'user') {
            updated.push({ role: 'bot', content: displayContent, sources: sources });
          } else {
            updated[updated.length - 1] = { role: 'bot', content: displayContent, sources: sources };
          }
          return updated;
        });
      }
    } catch (error) {
      console.error('Chat error:', error);
      setIsTyping(false);
      setMessages(prev => {
          const updated = [...prev];
          if (updated[updated.length - 1].role === 'user') {
            updated.push({ role: 'bot', content: 'Error communicating with the backend.', sources: [] });
          } else {
            updated[updated.length - 1] = { role: 'bot', content: 'Error communicating with the backend.', sources: [] };
          }
          return updated;
      });
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden text-[#f0f0f0] font-sans relative" style={{ backgroundColor: 'var(--bg-main)' }}>
      {/* Sidebar */}
      <div className={`flex-shrink-0 transition-all duration-300 ease-in-out ${sidebarOpen ? 'w-[220px]' : 'w-0 overflow-hidden'}`} style={{ backgroundColor: 'var(--bg-sidebar)' }}>
        <Sidebar 
           currentView={currentView} 
           setCurrentView={setCurrentView} 
           documents={documents} 
           setDocuments={setDocuments}
           sessions={sessions}
           setSessions={setSessions}
           activeSessionId={activeSessionId}
           loadSession={loadSession}
           createNewThread={createNewThread}
           setSidebarOpen={setSidebarOpen}
        />
      </div>

      {/* Main Area */}
      <div className="flex flex-col flex-1 min-w-0 bg-transparent relative transition-all duration-300">
        <TopBar model={model} setModel={setModel} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        
        {currentView === 'chat' && (
          <>
            {messages.length === 0 ? (
               // Hero Interface
               <div className="flex-1 flex flex-col items-center justify-center p-4">
                  <div className="flex items-center gap-3 mb-8">
                     <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M12 12 2.1 7.1"/><path d="m12 12 7.1-7.1"/></svg>
                     <h1 className="text-4xl font-semibold tracking-tight">Cerebro</h1>
                  </div>
                  <div className="w-full max-w-3xl">
                     <InputBar 
                        onSendMessage={handleSendMessage} 
                        setUploadStatus={setUploadStatus} 
                        uploadStatus={uploadStatus}
                        setDocuments={setDocuments} 
                        documents={documents} 
                        isHero={true}
                     />
                  </div>
               </div>
            ) : (
               // Normal Chat Interface
               <>
                  <div className="flex-1 overflow-y-auto px-4 lg:px-20">
                     <ChatInterface messages={messages} isTyping={isTyping} />
                  </div>

                  <div className="p-4 lg:px-20 flex flex-col gap-2 pb-6 w-full max-w-4xl mx-auto">
                     {/* Mock Upload Progress if uploading */}
                     {Object.entries(uploadStatus).map(([id, status]) => (
                        status.progress > 0 && status.progress < 100 && (
                          <UploadProgress key={id} filename={documents.find(d => d.doc_id === id)?.name || 'document'} progress={status.progress} />
                        )
                     ))}
                     <div className="flex-shrink-0 w-full">
                        <InputBar 
                          onSendMessage={handleSendMessage} 
                          setUploadStatus={setUploadStatus} 
                          uploadStatus={uploadStatus}
                          setDocuments={setDocuments} 
                          documents={documents} 
                          isHero={false}
                        />
                     </div>
                  </div>
               </>
            )}
          </>
        )}

        {currentView === 'settings' && (
          <div className="flex-1 overflow-y-auto p-10 flex justify-center items-start">
            <div className="max-w-2xl w-full text-white">
               <h1 className="text-3xl font-light mb-6">Settings</h1>
               <div className="border border-[var(--border)] rounded-2xl p-6 bg-[var(--bg-sidebar)]">
                  <p className="text-[var(--text-secondary)] mb-4">Select your inference model:</p>
                  <select 
                    value={model} 
                    onChange={(e) => setModel(e.target.value)} 
                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] text-white p-3 rounded-xl outline-none"
                  >
                     <option value="qwen2.5:7b">qwen2.5:7b</option>
                     <option value="llama3:8b">llama3:8b</option>
                     <option value="mistral:7b">mistral:7b</option>
                  </select>
                  <p className="text-[var(--text-muted)] text-sm mt-4">Make sure the model is pulled locally via Ollama.</p>
               </div>
            </div>
          </div>
        )}

        {currentView === 'help' && (
          <div className="flex-1 overflow-y-auto p-10 flex justify-center items-start">
            <div className="max-w-2xl w-full text-white">
               <h1 className="text-3xl font-light mb-6">Help & FAQ</h1>
               <div className="border border-[var(--border)] rounded-2xl p-6 bg-[var(--bg-sidebar)]">
                  <h3 className="text-lg font-medium mb-2">How to use Cerebro?</h3>
                  <p className="text-[var(--text-secondary)] mb-6 text-sm leading-relaxed">
                    Cerebro uses local inference to process your documents securely. Attach a PDF or text file using the paperclip icon in the chat view. 
                    The backend will chunk the document and index it locally using ChromaDB. Once processed, you can ask questions and the AI will reference your documents.
                  </p>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
