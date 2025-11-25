import React, { useState } from 'react';
import { LayoutGrid, Sparkles, X, MessageCircle } from 'lucide-react';
import ImageUpload from './components/ImageUpload';
import AnalysisDashboard from './components/AnalysisDashboard';
import ChatInterface from './components/ChatInterface';
import { analyzeRoomImage } from './services/geminiService';
import { RoomAnalysis } from './types';

function App() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<RoomAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageSelect = async (base64: string) => {
    setSelectedImage(base64);
    setIsAnalyzing(true);
    setError(null);
    setAnalysis(null);

    try {
      const result = await analyzeRoomImage(base64);
      setAnalysis(result);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Не удалось проанализировать изображение. Пожалуйста, попробуйте еще раз с более четким фото.");
      setSelectedImage(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetApp = () => {
    setSelectedImage(null);
    setAnalysis(null);
    setShowChat(false);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={resetApp}>
            <div className="bg-emerald-500 p-2 rounded-lg">
              <LayoutGrid className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
              TidyAI
            </h1>
          </div>
          
          {analysis && (
            <button
              onClick={resetApp}
              className="text-sm font-medium text-slate-500 hover:text-emerald-600 transition-colors flex items-center"
            >
              Начать заново
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Error Message */}
        {error && (
            <div className="max-w-2xl mx-auto mb-8 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
                <span>{error}</span>
                <button onClick={() => setError(null)}><X className="w-5 h-5 opacity-50 hover:opacity-100" /></button>
            </div>
        )}

        {/* Hero / Upload State */}
        {!analysis && !isAnalyzing && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-fade-in-up">
            <div className="space-y-4 max-w-2xl">
              <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
                Наведите порядок с помощью <span className="text-emerald-500">ИИ</span>
              </h2>
              <p className="text-lg text-slate-600">
                Загрузите фото любой беспорядочной комнаты. Наш ИИ проанализирует беспорядок, создаст персональный план действий и поможет вам вернуть уют в дом.
              </p>
            </div>
            
            <div className="w-full max-w-2xl">
              <ImageUpload onImageSelected={handleImageSelect} isAnalyzing={isAnalyzing} />
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-4xl mt-12 text-left">
              {[
                { title: 'Мгновенный анализ', desc: 'Получите мгновенную разбивку категорий беспорядка.' },
                { title: 'Конкретные шаги', desc: 'Пошаговое руководство по устранению беспорядка.' },
                { title: 'Советы по дизайну', desc: 'Эстетические рекомендации для улучшения пространства.' }
              ].map((f, i) => (
                <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mb-3">
                    <Sparkles className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h3 className="font-semibold text-slate-800">{f.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading State */}
        {isAnalyzing && (
           <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8">
               <div className="w-full max-w-2xl relative opacity-50 pointer-events-none">
                    {/* Re-render the upload box in loading state to maintain layout */}
                    <ImageUpload onImageSelected={() => {}} isAnalyzing={true} />
               </div>
           </div>
        )}

        {/* Analysis Result State */}
        {analysis && selectedImage && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 animate-fade-in">
            {/* Left Column: Image & Chat Trigger */}
            <div className="xl:col-span-4 space-y-6">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-100 relative group">
                  <img 
                    src={`data:image/jpeg;base64,${selectedImage}`} 
                    alt="Uploaded Room" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Исходное фото</span>
                    <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">Проанализировано</span>
                </div>
              </div>

              {/* Chat Toggle for Mobile/Tablet or Sticker for Desktop */}
              <div className="hidden xl:block">
                  <ChatInterface initialContextImage={selectedImage} />
              </div>
              
              <div className="xl:hidden">
                 <button 
                    onClick={() => setShowChat(!showChat)}
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

            {/* Right Column: Analysis Data */}
            <div className="xl:col-span-8">
              <AnalysisDashboard analysis={analysis} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;