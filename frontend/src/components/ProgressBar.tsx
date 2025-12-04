interface ProgressBarProps {
  progress: number;
  message: string;
}

export function ProgressBar({ progress, message }: ProgressBarProps) {
  return (
    <div className="w-full animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <span className="text-white/70 text-sm font-medium">{message}</span>
        <span className="text-electric-400 font-mono text-sm">{progress}%</span>
      </div>
      
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-electric-500 to-electric-400 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <div className="mt-4 flex items-center justify-center gap-2">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-electric-400 animate-pulse-soft"
              style={{ animationDelay: `${i * 200}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

