import { useState } from 'react';

interface TextInputProps {
  onSubmit: (text: string) => void;
  isLoading: boolean;
}

export function TextInput({ onSubmit, isLoading }: TextInputProps) {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && !isLoading) {
      onSubmit(text);
    }
  };

  const placeholderText = `Paste your learning topics here...

Example:
- Virtual Machines
- Containers and Docker
- Kubernetes
- Load Balancing
- Auto Scaling
- Serverless Computing
- Cloud Storage (S3, Blob)
- CDN and Edge Computing
- Database Replication
- Caching Strategies (Redis, Memcached)`;

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholderText}
          disabled={isLoading}
          className="w-full h-80 p-6 rounded-2xl glass-strong text-white/90 placeholder-white/30 
                     font-mono text-sm leading-relaxed resize-none
                     focus:outline-none focus:ring-2 focus:ring-electric-400/50 focus:border-transparent
                     transition-all duration-300 disabled:opacity-50"
        />
        
        {/* Character count */}
        <div className="absolute bottom-4 right-4 text-white/30 text-xs font-mono">
          {text.length} characters
        </div>
      </div>

      <button
        type="submit"
        disabled={!text.trim() || isLoading}
        className="mt-6 w-full py-4 px-8 rounded-xl font-semibold text-lg
                   bg-gradient-to-r from-electric-500 to-electric-400 text-midnight-950
                   hover:from-electric-400 hover:to-electric-500
                   disabled:from-midnight-700 disabled:to-midnight-600 disabled:text-white/30
                   transform hover:scale-[1.02] active:scale-[0.98]
                   transition-all duration-200 glow
                   disabled:shadow-none disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-3">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Organizing your curriculum...
          </span>
        ) : (
          'Generate Learning Path'
        )}
      </button>
    </form>
  );
}

