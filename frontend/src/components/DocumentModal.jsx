import { useState, useEffect } from 'react';
import { X, Database, Search } from 'lucide-react';

export default function DocumentModal({ docId, docName, onClose }) {
  const [chunks, setChunks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`http://localhost:8000/documents/${docId}/chunks`)
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        
        // Combine chunks and metadatas
        const combined = data.chunks.map((content, idx) => ({
          content,
          metadata: data.metadatas[idx]
        }));
        setChunks(combined);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, [docId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1e1e1e] border border-[#333] w-full max-w-3xl h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#333] bg-[#222]">
          <div className="flex items-center gap-3 text-white">
            <Database size={18} className="text-blue-400" />
            <h2 className="font-semibold text-[15px] truncate max-w-[400px]">{docName}</h2>
            <span className="bg-[#333] px-2 py-0.5 rounded-full text-[11px] font-mono text-gray-400">
              {chunks.length} chunks
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#1a1a1a]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
              <Search className="animate-spin text-blue-500" size={24} />
              <p className="text-sm">Retrieving vectors from ChromaDB...</p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full text-red-400 text-sm">
              Failed to load chunks: {error}
            </div>
          ) : chunks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm">
              <Database size={32} className="mb-3 opacity-20" />
              <p>No vectors found for this document.</p>
              <p className="text-[11px] mt-1">It might still be processing.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {chunks.map((chunk, idx) => (
                <div key={idx} className="bg-[#252525] border border-[#333] rounded-xl p-4 hover:border-[#444] transition-colors">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#333]/50">
                    <span className="text-[12px] font-mono text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded">
                      Chunk {idx + 1}
                    </span>
                    <span className="text-[11px] font-mono text-gray-500">
                      {chunk.metadata?.page ? `Page ${chunk.metadata.page}` : chunk.metadata?.start_time ? `Time: ${chunk.metadata.start_time}s` : ''}
                    </span>
                  </div>
                  <p className="text-[13px] text-gray-300 leading-relaxed font-light whitespace-pre-wrap">
                    {chunk.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
