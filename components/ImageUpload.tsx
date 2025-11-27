import React, { useCallback, useState } from "react";
import { Upload, Image as ImageIcon, Loader2 } from "lucide-react";

// ============================================================================
// ТИПЫ
// ============================================================================

interface ImageUploadProps {
  /** Коллбек, вызываемый после успешной загрузки с base64 изображения */
  onImageSelected: (base64: string) => void;
  /** Флаг состояния анализа (блокирует интерфейс) */
  isAnalyzing: boolean;
}

// ============================================================================
// КОНСТАНТЫ
// ============================================================================

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// ============================================================================
// КОМПОНЕНТ
// ============================================================================

const ImageUpload: React.FC<ImageUploadProps> = ({ onImageSelected, isAnalyzing }) => {
  const [isDragging, setIsDragging] = useState(false);

  /**
   * Обрабатывает файл: проверяет тип и конвертирует в base64
   */
  const processFile = useCallback(
    (file: File) => {
      // Проверка типа файла
      if (!file.type.startsWith("image/")) {
        alert("Пожалуйста, загрузите файл изображения (JPEG, PNG, WebP или GIF)");
        return;
      }

      const reader = new FileReader();
      
      reader.onload = (event) => {
        const result = event.target?.result as string;
        // Убираем data URL префикс (data:image/jpeg;base64,) для API
        const base64 = result.split(",")[1];
        onImageSelected(base64);
      };
      
      reader.onerror = () => {
        alert("Ошибка чтения файла. Попробуйте другое изображение.");
      };

      reader.readAsDataURL(file);
    },
    [onImageSelected]
  );

  /**
   * Обработчик события drop
   */
  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);

      const file = event.dataTransfer.files?.[0];
      if (file) {
        processFile(file);
      }
    },
    [processFile]
  );

  /**
   * Обработчик события dragover
   */
  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  /**
   * Обработчик события dragleave
   */
  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  }, []);

  /**
   * Обработчик выбора файла через input
   */
  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        processFile(file);
      }
    },
    [processFile]
  );

  // Динамические классы для разных состояний
  const containerClasses = [
    "relative w-full max-w-2xl mx-auto h-64",
    "border-2 border-dashed rounded-2xl",
    "flex flex-col items-center justify-center",
    "transition-all duration-300 cursor-pointer",
    isDragging
      ? "border-emerald-500 bg-emerald-50 scale-105"
      : "border-slate-300 hover:border-emerald-400 hover:bg-slate-50",
    isAnalyzing ? "opacity-50 pointer-events-none" : "",
  ].join(" ");

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={containerClasses}
    >
      {/* Скрытый input для выбора файла */}
      <input
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        onChange={handleFileChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={isAnalyzing}
        aria-label="Загрузить изображение"
      />

      {isAnalyzing ? (
        // Состояние загрузки
        <div className="flex flex-col items-center text-emerald-600">
          <Loader2 className="w-10 h-10 animate-spin mb-4" />
          <p className="font-medium animate-pulse">Анализируем ваше пространство...</p>
        </div>
      ) : (
        // Состояние ожидания
        <div className="flex flex-col items-center text-slate-500 p-4 text-center">
          <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4">
            {isDragging ? (
              <ImageIcon className="w-8 h-8 text-emerald-500" />
            ) : (
              <Upload className="w-8 h-8 text-slate-400" />
            )}
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-1">
            Загрузите фото комнаты
          </h3>
          <p className="text-sm text-slate-400 max-w-xs">
            Перетащите или нажмите для выбора. Мы поможем навести порядок.
          </p>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
