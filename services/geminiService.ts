import { GoogleGenAI } from "@google/genai";
import { RoomAnalysis, GeminiContent, GeminiPart } from "../types";

// ============================================================================
// КОНФИГУРАЦИЯ
// ============================================================================

const API_KEY = import.meta.env.VITE_API_KEY as string | undefined;
const MODEL_NAME = "gemini-2.0-flash";

// Проверка наличия API ключа при инициализации
if (!API_KEY) {
  console.error("❌ VITE_API_KEY не найден! Создайте файл .env с ключом.");
}

// Инициализация клиента (lazy - ошибка будет при первом запросе если нет ключа)
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

// ============================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================================

/**
 * Очищает текст от артефактов модели:
 * - Удаляет английские пояснения в скобках
 * - Удаляет markdown-форматирование (**жирный**)
 * - Удаляет служебные префиксы (Description:, Translation: и т.д.)
 * - Удаляет незавершенные фразы типа "Wait, ..."
 */
function cleanText(text: string): string {
  if (!text) return "";
  
  let cleaned = text;
  
  // Убираем пояснения в скобках типа "(English translation)"
  cleaned = cleaned.replace(/\([A-Za-z\s&:\-.]+\)/g, "");
  
  // Убираем служебные префиксы
  cleaned = cleaned.replace(/^(Description|Translation|Context|Note|Analysis):\s*/i, "");
  
  // Убираем markdown **жирный**
  cleaned = cleaned.replace(/\*\*/g, "");
  
  // Убираем незавершенные мысли модели
  cleaned = cleaned.replace(/Wait,.*$/i, "");
  
  return cleaned.trim();
}

/**
 * Извлекает JSON объект из ответа модели.
 * Модель может обернуть JSON в ```json ... ``` блоки.
 */
function extractJSON(text: string): string {
  // Убираем markdown code blocks
  let cleaned = text
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "");
  
  // Находим первый JSON объект в тексте
  const match = cleaned.match(/\{[\s\S]*\}/);
  return match ? match[0] : cleaned;
}

/**
 * Проверяет доступность API и бросает понятную ошибку
 */
function ensureApiAvailable(): void {
  if (!API_KEY || !ai) {
    throw new Error("API ключ не настроен. Создайте файл .env с VITE_API_KEY.");
  }
}

// ============================================================================
// ПРОМПТЫ
// ============================================================================

const ANALYSIS_PROMPT = `Ты профессиональный организатор пространства. Проанализируй фото комнаты и верни ТОЛЬКО валидный JSON на русском языке в следующем формате (без markdown, без \`\`\`):
{
  "roomType": "Тип комнаты (1-2 слова)",
  "clutterLevel": число от 0 до 100,
  "summary": "Краткое резюме состояния (1-2 предложения)",
  "spaceUtilization": [
    {"name": "Мебель", "value": число},
    {"name": "Свободное место", "value": число},
    {"name": "Хлам", "value": число}
  ],
  "actionItems": [
    {
      "id": "1",
      "title": "Короткий заголовок",
      "description": "Описание действия",
      "difficulty": "Easy",
      "category": "Discard"
    }
  ],
  "aestheticSuggestions": ["Совет 1", "Совет 2"]
}

Важно:
- difficulty может быть только: "Easy", "Medium", "Hard"
- category может быть только: "Discard", "Organize", "Buy"
- Все тексты на русском языке
- Верни только JSON без дополнительного текста`;

const CHAT_SYSTEM_INSTRUCTION = 
  "Ты TidyAI - дружелюбный помощник по организации пространства. " +
  "Отвечай кратко, по делу и только на русском языке. " +
  "Если пользователь спрашивает о конкретных товарах, предлагай общие категории, а не бренды.";

// ============================================================================
// ОСНОВНЫЕ ФУНКЦИИ API
// ============================================================================

/**
 * Анализирует изображение комнаты и возвращает структурированный отчет
 * @param base64Image - изображение в формате base64 (без data URL префикса)
 */
export async function analyzeRoomImage(base64Image: string): Promise<RoomAnalysis> {
  ensureApiAvailable();

  try {
    const response = await ai!.models.generateContent({
      model: MODEL_NAME,
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image,
              },
            },
            {
              text: ANALYSIS_PROMPT,
            },
          ],
        },
      ],
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Пустой ответ от модели");
    }

    // Парсим JSON из ответа
    const jsonString = extractJSON(responseText);
    const rawData = JSON.parse(jsonString) as RoomAnalysis;

    // Очищаем все текстовые поля от артефактов
    const cleanedData: RoomAnalysis = {
      ...rawData,
      roomType: cleanText(rawData.roomType),
      summary: cleanText(rawData.summary),
      actionItems: rawData.actionItems.map((item) => ({
        ...item,
        title: cleanText(item.title),
        description: cleanText(item.description),
      })),
      aestheticSuggestions: rawData.aestheticSuggestions.map(cleanText),
      spaceUtilization: rawData.spaceUtilization.map((s) => ({
        ...s,
        name: cleanText(s.name),
      })),
    };

    return cleanedData;
    
  } catch (error: unknown) {
    console.error("Ошибка анализа комнаты:", error);
    
    // Преобразуем ошибку в строку для анализа
    const errorString = error instanceof Error ? error.message : JSON.stringify(error);
    
    // Обработка известных ошибок API (региональные ограничения)
    if (
      errorString.includes("User location is not supported") ||
      errorString.includes("FAILED_PRECONDITION") ||
      errorString.includes("Region not supported") ||
      errorString.includes("location is not supported") ||
      (errorString.includes("400") && errorString.includes("not supported"))
    ) {
      throw new Error(
        "Gemini API недоступен в вашем регионе. Попробуйте использовать VPN (например, подключиться к серверу в США или Европе)."
      );
    }
    
    if (errorString.includes("quota") || errorString.includes("429")) {
      throw new Error("Превышен лимит запросов к API. Попробуйте позже.");
    }
    
    if (errorString.includes("API_KEY") || errorString.includes("invalid")) {
      throw new Error("Неверный API ключ. Проверьте настройки в файле .env");
    }
    
    // Общая ошибка с понятным сообщением
    throw new Error("Не удалось проанализировать изображение. Попробуйте еще раз.");
  }
}

/**
 * Отправляет сообщение в чат с контекстом предыдущей беседы
 * @param history - история сообщений для контекста
 * @param newMessage - новое сообщение пользователя
 * @param base64Image - опциональное изображение для контекста
 */
export async function sendChatMessage(
  history: GeminiContent[],
  newMessage: string,
  base64Image?: string
): Promise<string> {
  if (!API_KEY || !ai) {
    return "Ошибка: API ключ не настроен";
  }

  try {
    // Преобразуем историю в формат API
    const contents = history.map((msg) => ({
      role: msg.role,
      parts: msg.parts.map((part: GeminiPart) => {
        if (part.text) return { text: part.text };
        if (part.inlineData) return { inlineData: part.inlineData };
        return { text: "" };
      }),
    }));

    // Формируем части нового сообщения
    const newParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
    
    if (base64Image) {
      newParts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Image,
        },
      });
    }
    
    newParts.push({ text: newMessage });

    // Добавляем новое сообщение в контент
    contents.push({
      role: "user" as const,
      parts: newParts,
    });

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: contents,
      config: {
        systemInstruction: CHAT_SYSTEM_INSTRUCTION,
      },
    });

    return response.text || "Извините, не удалось сгенерировать ответ.";
    
  } catch (error: unknown) {
    console.error("Ошибка чата:", error);
    return "Произошла ошибка при обращении к AI. Попробуйте еще раз.";
  }
}
