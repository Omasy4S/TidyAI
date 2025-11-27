import React, { useState, useRef, useEffect, useCallback } from "react";
import { Send, User, Bot, Sparkles } from "lucide-react";
import { ChatMessage, GeminiContent } from "../types";
import { sendChatMessage } from "../services/geminiService";

// ============================================================================
// ТИПЫ
// ============================================================================

interface ChatInterfaceProps {
  /** Base64 изображение для контекста чата */
  initialContextImage: string;
}

// ============================================================================
// КОНСТАНТЫ
// ============================================================================

/** Начальное приветственное сообщение */
const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "model",
  text: "Я проанализировал вашу комнату! Задавайте любые вопросы по плану организации или попросите рекомендации товаров.",
  timestamp: new Date(),
};

/** Начальная история для API (контекст с изображением) */
const createInitialHistory = (imageBase64: string): GeminiContent[] => [
  {
    role: "user",
    parts: [
      { inlineData: { mimeType: "image/jpeg", data: imageBase64 } },
      { text: "Вот фото комнаты, которую я хочу организовать." },
    ],
  },
  {
    role: "model",
    parts: [{ text: "Понял. Я проанализировал изображение и готов помочь вам навести порядок." }],
  },
];

// ============================================================================
// КОМПОНЕНТ
// ============================================================================

const ChatInterface: React.FC<ChatInterfaceProps> = ({ initialContextImage }) => {
  // Состояние сообщений в UI
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Ref для автоскролла
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // История для API (сохраняется между рендерами)
  const historyRef = useRef<GeminiContent[]>(createInitialHistory(initialContextImage));

  /**
   * Скролл к последнему сообщению
   */
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Автоскролл при новых сообщениях
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  /**
   * Отправка сообщения
   */
  const handleSend = useCallback(async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    // Создаем сообщение пользователя
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      text: trimmedInput,
      timestamp: new Date(),
    };

    // Добавляем в UI и очищаем поле ввода
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Отправляем в API
      const responseText = await sendChatMessage(historyRef.current, trimmedInput);

      // Создаем ответ бота
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "model",
        text: responseText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);

      // Обновляем историю для API
      historyRef.current.push(
        { role: "user", parts: [{ text: trimmedInput }] },
        { role: "model", parts: [{ text: responseText }] }
      );
    } catch (error) {
      console.error("Ошибка отправки сообщения:", error);
      
      // Добавляем сообщение об ошибке
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "model",
          text: "Извините, возникла проблема с соединением. Попробуйте снова.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading]);

  /**
   * Обработка нажатия Enter
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  /**
   * Обработка изменения поля ввода
   */
  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setInput(event.target.value);
  }, []);

  // Проверка возможности отправки
  const canSend = input.trim() && !isLoading;

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
      {/* Заголовок чата */}
      <header className="bg-emerald-600 p-4 text-white flex items-center shadow-sm z-10">
        <Sparkles className="w-5 h-5 mr-2" />
        <h3 className="font-semibold">Ассистент TidyAI</h3>
      </header>

      {/* Область сообщений */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 scrollbar-hide">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        
        {/* Индикатор загрузки */}
        {isLoading && <LoadingIndicator />}
        
        {/* Якорь для автоскролла */}
        <div ref={messagesEndRef} />
      </div>

      {/* Поле ввода */}
      <footer className="p-4 bg-white border-t border-slate-100">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Задайте вопрос..."
            className="flex-1 px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-slate-700 placeholder-slate-400"
            disabled={isLoading}
            aria-label="Сообщение"
          />
          <button
            onClick={handleSend}
            disabled={!canSend}
            className={`p-2 rounded-xl transition-colors ${
              canSend
                ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            }`}
            aria-label="Отправить"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </footer>
    </div>
  );
};

// ============================================================================
// ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ
// ============================================================================

/**
 * Компонент пузырька сообщения
 */
const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.role === "user";

  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`flex max-w-[80%] ${isUser ? "flex-row-reverse" : "flex-row"}`}>
        {/* Аватар */}
        <div
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            isUser ? "bg-slate-200 ml-2" : "bg-emerald-100 mr-2"
          }`}
        >
          {isUser ? (
            <User className="w-5 h-5 text-slate-600" />
          ) : (
            <Bot className="w-5 h-5 text-emerald-600" />
          )}
        </div>

        {/* Текст сообщения */}
        <div
          className={`p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
            isUser
              ? "bg-slate-800 text-white rounded-tr-none"
              : "bg-white text-slate-800 border border-slate-100 rounded-tl-none"
          }`}
        >
          {message.text}
        </div>
      </div>
    </div>
  );
};

/**
 * Компонент индикатора загрузки (печатает...)
 */
const LoadingIndicator: React.FC = () => (
  <div className="flex w-full justify-start">
    <div className="flex max-w-[80%] flex-row">
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-emerald-100 mr-2">
        <Bot className="w-5 h-5 text-emerald-600" />
      </div>
      <div className="bg-white text-slate-800 border border-slate-100 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center">
        <div className="flex space-x-1">
          <div
            className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
            style={{ animationDelay: "0ms" }}
          />
          <div
            className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
            style={{ animationDelay: "150ms" }}
          />
          <div
            className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
            style={{ animationDelay: "300ms" }}
          />
        </div>
      </div>
    </div>
  </div>
);

export default ChatInterface;
