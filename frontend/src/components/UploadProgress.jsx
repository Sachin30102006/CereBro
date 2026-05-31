import { Zap } from 'lucide-react';

export default function UploadProgress({ filename, progress = 0 }) {
  if (progress >= 100 || progress <= 0) return null;

  return (
    <div className="max-w-3xl mx-auto w-full mb-3">
      <div className="flex items-center gap-3 rounded-lg border px-4 py-2.5" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}>
        <Zap size={16} className="text-[#3b82f6] flex-shrink-0" fill="#3b82f6" fillOpacity={0.2} />
        
        <div className="flex-1 flex flex-col gap-1.5 min-w-0">
          <div className="flex items-center justify-between text-[13px]">
            <span className="truncate" style={{ color: 'var(--text-primary)' }}>Processing {filename}...</span>
            <span className="font-medium flex-shrink-0 ml-3" style={{ color: 'var(--blue)' }}>{Math.round(progress)}%</span>
          </div>
          
          {/* Progress Bar Track */}
          <div className="w-full h-[3px] rounded-[2px] overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
            {/* Progress Bar Fill */}
            <div 
              className="h-full rounded-[2px] transition-all duration-300 ease-out" 
              style={{ backgroundColor: 'var(--blue)', width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
