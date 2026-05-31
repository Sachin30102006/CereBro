import { Copy, RefreshCw, ThumbsUp, ThumbsDown, File } from 'lucide-react';
import CitationChip from './CitationChip';

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';

  return (
    <div className="flex w-full mb-8 group">
      <div className={`flex gap-6 max-w-4xl w-full ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start`}>
        
        {/* Avatar */}
        <div className="flex-shrink-0 mt-1">
          {isUser ? (
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium bg-[var(--bg-active)] text-white">
              U
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-white text-black shadow-[0_0_10px_rgba(255,255,255,0.2)]">
              R
            </div>
          )}
        </div>

        {/* Message Content Area */}
        <div className={`flex flex-col gap-3 min-w-0 flex-1 ${isUser ? 'items-end' : 'items-start'}`}>
          
          {/* Attachments */}
          {isUser && message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap justify-end gap-2 mb-2">
              {message.attachments.map((file, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-[#2a2a2a] px-3 py-2 rounded-xl border border-[#3a3a3a] text-sm text-white">
                  <div className="p-1.5 rounded-lg flex items-center justify-center bg-blue-500/20 text-blue-400">
                    <File size={16} strokeWidth={2.5} />
                  </div>
                  <span className="truncate text-[13px] font-medium leading-tight max-w-[120px]">{file.name}</span>
                </div>
              ))}
            </div>
          )}

          {message.content && (
            <div className={`py-1.5 text-[15px] leading-relaxed whitespace-pre-wrap font-light tracking-wide ${isUser ? 'text-right max-w-[80%] bg-[var(--bg-active)] px-5 py-3 rounded-2xl' : 'text-left text-white'}`}>
              {message.content}
            </div>
          )}

          {/* Bot Extras: Citations & Action Row */}
          {!isUser && (
            <div className="flex flex-col gap-2 w-full mt-2">
              {/* Citations */}
              {message.sources && message.sources.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {message.sources.map((source, idx) => (
                    <CitationChip 
                      key={idx} 
                      type={source.type} 
                      title={source.title} 
                      reference={source.reference} 
                    />
                  ))}
                </div>
              )}

              {/* Action Row */}
              <div className="flex items-center gap-2 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-1.5 rounded-md hover:bg-white/10 hover:text-white transition-colors" title="Copy">
                  <Copy size={15} />
                </button>
                <button className="p-1.5 rounded-md hover:bg-white/10 hover:text-white transition-colors" title="Good response">
                  <ThumbsUp size={15} />
                </button>
                <button className="p-1.5 rounded-md hover:bg-white/10 hover:text-white transition-colors" title="Bad response">
                  <ThumbsDown size={15} />
                </button>
                <button className="p-1.5 rounded-md hover:bg-white/10 hover:text-white transition-colors" title="Regenerate">
                  <RefreshCw size={15} />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
