import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Sparkles } from 'lucide-react';
import { ChatMessage, GeminiContent } from '../types';
import { sendChatMessage } from '../services/geminiService';

interface ChatInterfaceProps {
  initialContextImage: string; // Base64
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ initialContextImage }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: "Я проанализировал вашу комнату! Задавайте любые вопросы по плану организации или попросите рекомендации товаров.",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Maintain internal history for the API
  const historyRef = useRef<GeminiContent[]>([
    {
        role: 'user',
        parts: [
            { inlineData: { mimeType: 'image/jpeg', data: initialContextImage } },
            { text: "Вот фото комнаты, которую я хочу организовать." }
        ]
    },
    {
        role: 'model',
        parts: [{ text: "Понял. Я проанализировал изображение и готов помочь вам навести порядок." }]
    }
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await sendChatMessage(historyRef.current, input);
      
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMsg]);
      
      // Update history
      historyRef.current.push(
          { role: 'user', parts: [{ text: userMsg.text }] },
          { role: 'model', parts: [{ text: responseText }] }
      );

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "Извините, возникла проблема с соединением. Попробуйте снова.",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-emerald-600 p-4 text-white flex items-center shadow-sm z-10">
        <Sparkles className="w-5 h-5 mr-2" />
        <h3 className="font-semibold">Ассистент TidyAI</h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 scrollbar-hide">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center 
                ${msg.role === 'user' ? 'bg-slate-200 ml-2' : 'bg-emerald-100 mr-2'}`}>
                {msg.role === 'user' ? (
                  <User className="w-5 h-5 text-slate-600" />
                ) : (
                  <Bot className="w-5 h-5 text-emerald-600" />
                )}
              </div>
              <div
                className={`p-3 rounded-2xl text-sm leading-relaxed shadow-sm
                  ${msg.role === 'user' 
                    ? 'bg-slate-800 text-white rounded-tr-none' 
                    : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                  }`}
              >
                {msg.text}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
            <div className="flex w-full justify-start">
                 <div className="flex max-w-[80%] flex-row">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-emerald-100 mr-2">
                         <Bot className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="bg-white text-slate-800 border border-slate-100 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                 </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-slate-100">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Задайте вопрос..."
            className="flex-1 px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-slate-700 placeholder-slate-400"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={`p-2 rounded-xl transition-colors ${
              input.trim() && !isLoading
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;