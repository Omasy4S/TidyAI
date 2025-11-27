import React, { useState, useCallback } from "react";
import { LayoutGrid, Sparkles, X, MessageCircle } from "lucide-react";
import ImageUpload from "./components/ImageUpload";
import AnalysisDashboard from "./components/AnalysisDashboard";
import ChatInterface from "./components/ChatInterface";
import { analyzeRoomImage } from "./services/geminiService";
import { RoomAnalysis } from "./types";

// ============================================================================
// КОНСТАНТЫ
// ============================================================================

/** Описание фич для главной страницы */
const FEATURES = [
  {
    title: "Мгновенный анализ",
    description: "Получите мгновенную разбивку категорий беспорядка.",
  },
  {
    title: "Конкретные шаги",
    description: "Пошаговое руководство по устранению беспорядка.",
  },
  {
    title: "Советы по дизайну",
    description: "Эстетические рекомендации для улучшения пространства.",
  },
] as const;

// ============================================================================
// КОМПОНЕНТ
// ============================================================================

function App() {
  // Состояние приложения
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<RoomAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Обработка выбора изображения и запуск анализа
   */
  const handleImageSelect = useCallback(async (base64: string) => {
    setSelectedImage(base64);
    setIsAnalyzing(true);
    setError(null);
    setAnalysis(null);

    try {
      const result = await analyzeRoomImage(base64);
      setAnalysis(result);
    } catch (err) {
      console.error("Ошибка анализа:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Не удалось проанализировать изображение. Попробуйте с более четким фото.";
      setError(errorMessage);
      setSelectedImage(null);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  /**
   * Сброс состояния приложения
   */
  const resetApp = useCallback(() => {
    setSelectedImage(null);
    setAnalysis(null);
    setShowChat(false);
    setError(null);
  }, []);

  /**
   * Очистка ошибки
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Переключение чата (для мобильных)
   */
  const toggleChat = useCallback(() => {
    setShowChat((prev) => !prev);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Шапка */}
      <Header onLogoClick={resetApp} showResetButton={!!analysis} onReset={resetApp} />

      {/* Основной контент */}
      <main className="flex-grow container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Сообщение об ошибке */}
        {error && <ErrorBanner message={error} onClose={clearError} />}

        {/* Начальный экран (загрузка изображения) */}
        {!analysis && !isAnalyzing && (
          <HeroSection onImageSelected={handleImageSelect} isAnalyzing={isAnalyzing} />
        )}

        {/* Состояние загрузки */}
        {isAnalyzing && <LoadingState />}

        {/* Результаты анализа */}
        {analysis && selectedImage && (
          <AnalysisResults
            analysis={analysis}
            selectedImage={selectedImage}
            showChat={showChat}
            onToggleChat={toggleChat}
          />
        )}
      </main>
    </div>
  );
}

// ============================================================================
// ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ
// ============================================================================

/**
 * Компонент шапки
 */
interface HeaderProps {
  onLogoClick: () => void;
  showResetButton: boolean;
  onReset: () => void;
}

const Header: React.FC<HeaderProps> = ({ onLogoClick, showResetButton, onReset }) => (
  <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      {/* Логотип */}
      <div
        className="flex items-center space-x-2 cursor-pointer"
        onClick={onLogoClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && onLogoClick()}
      >
        <div className="bg-emerald-500 p-2 rounded-lg">
          <LayoutGrid className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
          TidyAI
        </h1>
      </div>

      {/* Кнопка сброса */}
      {showResetButton && (
        <button
          onClick={onReset}
          className="text-sm font-medium text-slate-500 hover:text-emerald-600 transition-colors flex items-center"
        >
          Начать заново
        </button>
      )}
    </div>
  </header>
);

/**
 * Баннер с ошибкой
 */
interface ErrorBannerProps {
  message: string;
  onClose: () => void;
}

const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onClose }) => (
  <div className="max-w-2xl mx-auto mb-8 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
    <span>{message}</span>
    <button onClick={onClose} aria-label="Закрыть">
      <X className="w-5 h-5 opacity-50 hover:opacity-100" />
    </button>
  </div>
);

/**
 * Начальный экран с Hero-секцией
 */
interface HeroSectionProps {
  onImageSelected: (base64: string) => void;
  isAnalyzing: boolean;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onImageSelected, isAnalyzing }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-fade-in-up">
    {/* Заголовок */}
    <div className="space-y-4 max-w-2xl">
      <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
        Наведите порядок с помощью <span className="text-emerald-500">ИИ</span>
      </h2>
      <p className="text-lg text-slate-600">
        Загрузите фото любой беспорядочной комнаты. Наш ИИ проанализирует беспорядок, создаст
        персональный план действий и поможет вам вернуть уют в дом.
      </p>
    </div>

    {/* Зона загрузки */}
    <div className="w-full max-w-2xl">
      <ImageUpload onImageSelected={onImageSelected} isAnalyzing={isAnalyzing} />
    </div>

    {/* Карточки функций */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-4xl mt-12 text-left">
      {FEATURES.map((feature, index) => (
        <div
          key={index}
          className="bg-white p-6 rounded-xl shadow-sm border border-slate-100"
        >
          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mb-3">
            <Sparkles className="w-5 h-5 text-emerald-600" />
          </div>
          <h3 className="font-semibold text-slate-800">{feature.title}</h3>
          <p className="text-sm text-slate-500 mt-1">{feature.description}</p>
        </div>
      ))}
    </div>
  </div>
);

/**
 * Состояние загрузки
 */
const LoadingState: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8">
    <div className="w-full max-w-2xl relative opacity-50 pointer-events-none">
      <ImageUpload onImageSelected={() => {}} isAnalyzing={true} />
    </div>
  </div>
);

/**
 * Результаты анализа
 */
interface AnalysisResultsProps {
  analysis: RoomAnalysis;
  selectedImage: string;
  showChat: boolean;
  onToggleChat: () => void;
}

const AnalysisResults: React.FC<AnalysisResultsProps> = ({
  analysis,
  selectedImage,
  showChat,
  onToggleChat,
}) => (
  <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 animate-fade-in">
    {/* Левая колонка: Изображение и чат */}
    <div className="xl:col-span-4 space-y-6">
      {/* Карточка с изображением */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-100 relative group">
          <img
            src={`data:image/jpeg;base64,${selectedImage}`}
            alt="Загруженная комната"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Исходное фото
          </span>
          <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
            Проанализировано
          </span>
        </div>
      </div>

      {/* Чат на десктопе */}
      <div className="hidden xl:block">
        <ChatInterface initialContextImage={selectedImage} />
      </div>

      {/* Кнопка чата на мобильных */}
      <div className="xl:hidden">
        <button
          onClick={onToggleChat}
          className="w-full py-4 bg-slate-900 text-white rounded-xl shadow-lg flex items-center justify-center font-medium hover:bg-slate-800 transition-colors"
        >
          <MessageCircle className="w-5 h-5 mr-2" />
          {showChat ? "Скрыть ассистента" : "Спросить ассистента TidyAI"}
        </button>
        {showChat && (
          <div className="mt-4">
            <ChatInterface initialContextImage={selectedImage} />
          </div>
        )}
      </div>
    </div>

    {/* Правая колонка: Дашборд анализа */}
    <div className="xl:col-span-8">
      <AnalysisDashboard analysis={analysis} />
    </div>
  </div>
);

export default App;
