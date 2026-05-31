import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';

export default function ChatInterface({ messages, isTyping = false }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto py-8 font-sans">
      {messages.map((msg, index) => (
        <MessageBubble key={index} message={msg} />
      ))}

      {isTyping && (
        <div className="flex w-full mb-8">
          <div className="flex gap-6 max-w-4xl w-full flex-row items-start">
            <div className="flex-shrink-0 mt-1">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-white text-black">
                R
              </div>
            </div>
            <div className="flex flex-col justify-center min-w-0 flex-1">
              <div className="py-2 text-[15px] leading-relaxed flex items-center gap-2 text-white">
                <div className="w-2 h-2 rounded-full bg-white/50 animate-pulse" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-white/50 animate-pulse" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-white/50 animate-pulse" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
