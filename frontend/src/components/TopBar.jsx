import { Sparkles, Share, MoreHorizontal } from 'lucide-react';

export default function TopBar({ model, setModel, sidebarOpen, setSidebarOpen }) {
  return (
    <div className="h-16 flex items-center justify-between px-6 flex-shrink-0 bg-transparent">
      {/* Left: Model Selector & Sidebar Toggle */}
      <div className="flex items-center gap-4">
        {!sidebarOpen && (
           <button 
             onClick={() => setSidebarOpen(true)}
             className="p-1.5 -ml-2 rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-white transition-colors"
           >
             <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m14 9 3 3-3 3"/></svg>
           </button>
        )}
        <button className="flex items-center gap-2 group">
          <span className="font-semibold text-[15px] tracking-wide text-white group-hover:text-gray-300 transition-colors">
            {model}
          </span>
          <Sparkles size={14} className="text-[var(--text-secondary)] group-hover:text-white transition-colors" />
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-4 text-[var(--text-secondary)]">
        <button className="hover:text-white transition-colors">
          <Share size={16} />
        </button>
        <button className="hover:text-white transition-colors">
          <MoreHorizontal size={18} />
        </button>
      </div>
    </div>
  );
}
