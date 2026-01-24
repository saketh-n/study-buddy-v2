import { useState, useRef, useEffect } from 'react';
import { chatWithTutor, getChatHistory } from '../api';
import type { ChatMessage } from '../types';
import Markdown from 'react-markdown';

interface AiTutorProps {
  isOpen: boolean;
  onClose: () => void;
  curriculumId: string;
  clusterIndex: number;
  topicIndex: number;
  topicName: string;
  highlightedContext?: string;
  onClearHighlight?: () => void;
}

export function AiTutor({ 
  isOpen, 
  onClose, 
  curriculumId, 
  clusterIndex, 
  topicIndex, 
  topicName,
  highlightedContext,
  onClearHighlight
}: AiTutorProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [pendingContext, setPendingContext] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load chat history when topic changes
  useEffect(() => {
    const loadHistory = async () => {
      setIsLoadingHistory(true);
      setPendingContext(null);
      try {
        const history = await getChatHistory(curriculumId, clusterIndex, topicIndex);
        setMessages(history);
      } catch (e) {
        console.error('Failed to load chat history:', e);
        setMessages([]);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    
    loadHistory();
  }, [curriculumId, clusterIndex, topicIndex]);

  // Handle incoming highlighted context
  useEffect(() => {
    if (highlightedContext) {
      setPendingContext(highlightedContext);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [highlightedContext]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    
    const contextToSend = pendingContext || '';
    const messageToSend = input;
    
    setInput('');
    setPendingContext(null);
    onClearHighlight?.();
    setIsLoading(true);

    try {
      const result = await chatWithTutor(
        curriculumId,
        clusterIndex,
        topicIndex,
        messageToSend,
        contextToSend
      );
      
      // Use the full history from server to stay in sync
      setMessages(result.history);
    } catch {
      const errorMessage: ChatMessage = { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearContext = () => {
    setPendingContext(null);
    onClearHighlight?.();
  };

  if (!isOpen) return null;

  return (
    <div className="w-96 border-l border-white/10 flex flex-col bg-midnight-950/50 backdrop-blur-xl animate-slide-in-right">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-electric-500/30 to-coral-500/20 
                          flex items-center justify-center">
            <svg className="w-6 h-6 text-electric-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-white">AI Tutor</h3>
            <p className="text-white/40 text-xs truncate max-w-[180px]">{topicName}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoadingHistory ? (
          <div className="flex items-center justify-center py-8">
            <svg className="w-6 h-6 animate-spin text-white/40" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : messages.length === 0 && !pendingContext ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl glass flex items-center justify-center">
              <svg className="w-8 h-8 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-white/40 text-sm mb-2">Ask me anything!</p>
            <p className="text-white/25 text-xs mb-6">I'm here to help you understand this topic better.</p>
            
            {/* Suggested questions */}
            <div className="space-y-2">
              {[
                "What problem does this concept solve?",
                "Can you give me a real-world example?",
                "Why is this solution considered elegant?"
              ].map((q, i) => (
                <button
                  key={i}
                  onClick={() => setInput(q)}
                  className="w-full text-left p-3 rounded-xl glass hover:glass-strong 
                             text-white/60 text-sm transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] p-3 rounded-2xl ${
                  msg.role === 'user'
                    ? 'bg-electric-500 text-midnight-950 rounded-br-sm'
                    : 'glass text-white/80 rounded-bl-sm'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm prose-invert max-w-none
                                  prose-p:my-1 prose-ul:my-1 prose-ol:my-1
                                  prose-li:my-0 prose-headings:my-2
                                  prose-code:bg-white/10 prose-code:px-1 prose-code:rounded
                                  prose-pre:bg-white/5 prose-pre:p-2">
                    <Markdown>{msg.content}</Markdown>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="glass p-3 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-white/40 animate-pulse-soft"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Pending context indicator */}
      {pendingContext && (
        <div className="mx-4 mb-2 p-3 rounded-xl bg-electric-500/10 border border-electric-500/30">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-electric-400 text-xs font-medium mb-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                </svg>
                Selected context
              </div>
              <p className="text-white/60 text-xs line-clamp-2">{pendingContext}</p>
            </div>
            <button
              onClick={handleClearContext}
              className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-white/10">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={pendingContext ? "Ask about the selected text..." : "Ask a question..."}
            rows={1}
            className="flex-1 px-4 py-3 rounded-xl glass text-white placeholder-white/30 text-sm
                       resize-none focus:outline-none focus:ring-2 focus:ring-electric-500/50"
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-4 rounded-xl bg-electric-500 text-midnight-950
                       disabled:opacity-50 disabled:cursor-not-allowed
                       hover:bg-electric-400 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
