import { useState, useEffect, useCallback } from 'react';

interface SelectionContextMenuProps {
  onAddToTutor: (text: string) => void;
}

export function SelectionContextMenu({ onAddToTutor }: SelectionContextMenuProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState('');

  const handleContextMenu = useCallback((e: MouseEvent) => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    
    if (text && text.length > 0) {
      e.preventDefault();
      setSelectedText(text);
      setPosition({ x: e.clientX, y: e.clientY });
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, []);

  const handleClick = useCallback(() => {
    setIsVisible(false);
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsVisible(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleContextMenu, handleClick, handleKeyDown]);

  const handleAddToTutor = () => {
    onAddToTutor(selectedText);
    setIsVisible(false);
    // Clear the selection
    window.getSelection()?.removeAllRanges();
  };

  if (!isVisible) return null;

  // Adjust position to keep menu in viewport
  const menuWidth = 220;
  const menuHeight = 50;
  const x = Math.min(position.x, window.innerWidth - menuWidth - 10);
  const y = Math.min(position.y, window.innerHeight - menuHeight - 10);

  return (
    <div
      className="fixed z-[100] animate-fade-in"
      style={{ left: x, top: y }}
    >
      <div className="glass-strong rounded-xl overflow-hidden shadow-2xl border border-white/10">
        <button
          onClick={handleAddToTutor}
          className="flex items-center gap-3 px-4 py-3 w-full text-left hover:bg-white/10 
                     transition-colors text-white/90 text-sm"
        >
          <div className="w-8 h-8 rounded-lg bg-electric-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-electric-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <div className="font-medium">Ask AI Tutor</div>
            <div className="text-white/40 text-xs">Add selection as context</div>
          </div>
        </button>
      </div>
    </div>
  );
}

