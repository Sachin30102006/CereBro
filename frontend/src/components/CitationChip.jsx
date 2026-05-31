import { FileText, PlaySquare } from 'lucide-react';

export default function CitationChip({ type, title, reference }) {
  const isYoutube = type === 'youtube';

  return (
    <button 
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#333] transition-colors hover:bg-[#333]"
      style={{ backgroundColor: '#252525' }}
    >
      {isYoutube ? (
        <PlaySquare size={12} className="text-red-500" />
      ) : (
        <FileText size={12} style={{ color: 'var(--text-secondary)' }} />
      )}
      <span className="text-[12px]" style={{ color: 'var(--text-primary)' }}>
        {title} <span style={{ color: 'var(--text-muted)' }}>·</span> {reference}
      </span>
    </button>
  );
}
