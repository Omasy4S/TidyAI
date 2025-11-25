// Описание отдельной задачи в плане уборки
export interface ActionItem {
  id: string;
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard'; // Сложность задачи для сортировки или отображения бейджей
  category: 'Discard' | 'Organize' | 'Buy'; // Категория для группировки в интерфейсе
}

// Полный результат анализа комнаты от AI
export interface RoomAnalysis {
  roomType: string; // Например: "Спальня", "Рабочий стол"
  clutterLevel: number; // 0-100 (процент захламленности)
  spaceUtilization: {
    name: string;
    value: number;
  }[]; // Данные для круговой диаграммы (Мебель vs Пустое место vs Хлам)
  summary: string; // Краткое резюме состояния комнаты
  actionItems: ActionItem[]; // Список конкретных шагов
  aestheticSuggestions: string[]; // Советы по дизайну
}

// Структура сообщения в чате
export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

// Типы для внутреннего использования SDK Gemini
export interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

export interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}