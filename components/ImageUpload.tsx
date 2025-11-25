import React, { useCallback, useState } from 'react';
import { Upload, Image as ImageIcon, Loader2 } from 'lucide-react';

interface ImageUploadProps {
  onImageSelected: (base64: string) => void;
  isAnalyzing: boolean;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onImageSelected, isAnalyzing }) => {
  const [isDragging, setIsDragging] = useState(false);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, загрузите файл изображения');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      // Remove data URL prefix for API
      const base64 = result.split(',')[1];
      onImageSelected(base64);
    };
    reader.readAsDataURL(file);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={`relative w-full max-w-2xl mx-auto h-64 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all duration-300 cursor-pointer
        ${isDragging 
          ? 'border-emerald-500 bg-emerald-50 scale-105' 
          : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-50'
        }
        ${isAnalyzing ? 'opacity-50 pointer-events-none' : ''}
      `}
    >
      <input
        type="file"
        accept="image/*"
        onChange={onFileChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={isAnalyzing}
      />
      
      {isAnalyzing ? (
        <div className="flex flex-col items-center text-emerald-600">
          <Loader2 className="w-10 h-10 animate-spin mb-4" />
          <p className="font-medium animate-pulse">Анализируем ваше пространство...</p>
        </div>
      ) : (
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