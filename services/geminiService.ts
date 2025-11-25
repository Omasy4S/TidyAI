import { GoogleGenAI, Type, Schema } from "@google/genai";
import { RoomAnalysis, GeminiContent } from "../types";

// Инициализация клиента. Ключ должен быть в переменных окружения.
const apiKey = process.env.API_KEY;
if (!apiKey) {
  console.error("API_KEY is missing from environment variables.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key' });

// Используем модель gemini-3-pro-preview для наилучшего понимания изображений и сложных инструкций
const MODEL_NAME = 'gemini-3-pro-preview';

// Строгая схема JSON для ответа модели.
// Мы используем это, чтобы гарантировать, что ответ придет в нужном формате для рендеринга UI.
const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    roomType: { type: Type.STRING, description: "Тип комнаты (одно-два слова на русском)" },
    clutterLevel: { type: Type.INTEGER, description: "Число от 0 до 100" },
    summary: { type: Type.STRING, description: "Краткое резюме на русском (максимум 2 предложения)" },
    spaceUtilization: {
      type: Type.ARRAY,
      description: "Статистика для графика",
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Категория на русском (Мебель, Пол, Хлам)" },
          value: { type: Type.INTEGER }
        }
      }
    },
    actionItems: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING, description: "Короткий заголовок действия на русском" },
          description: { type: Type.STRING, description: "Четкая инструкция на русском без лишних слов" },
          difficulty: { type: Type.STRING, enum: ["Easy", "Medium", "Hard"] },
          category: { type: Type.STRING, enum: ["Discard", "Organize", "Buy"] }
        }
      }
    },
    aestheticSuggestions: {
      type: Type.ARRAY,
      items: { type: Type.STRING, description: "Совет по дизайну на русском" }
    }
  },
  required: ["roomType", "clutterLevel", "summary", "actionItems", "aestheticSuggestions", "spaceUtilization"]
};

// Функция очистки текста от артефактов модели.
// Иногда модель, несмотря на инструкции, добавляет английские переводы в скобках или примечания.
const cleanText = (text: string): string => {
  if (!text) return "";
  let cleaned = text;

  // Удаляем содержимое в скобках, если это похоже на английский перевод или технические заметки
  // Например: "(Mug and Pitcher)" или "(Note: ...)"
  cleaned = cleaned.replace(/\([A-Za-z\s&:\-.]+\)/g, "");

  // Удаляем префиксы типа "Description:", "Translation:", "Context:", которые модель любит добавлять
  cleaned = cleaned.replace(/^(Description|Translation|Context|Note|Analysis):/i, "");
  
  // Удаляем Markdown жирный шрифт
  cleaned = cleaned.replace(/\*\*/g, "");

  // Удаляем внутренний монолог модели, если он просочился (начинается с Wait, ...)
  cleaned = cleaned.replace(/Wait,.*$/i, "");
  
  return cleaned.trim();
};

export const analyzeRoomImage = async (base64Image: string): Promise<RoomAnalysis> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image
            }
          },
          {
            text: "Роль: Профессиональный организатор. Задача: Проанализируй фото и дай четкий план действий. Язык: Строго Русский. Не добавляй переводы на английский. Не пиши свои мысли в JSON. Только финальный результат."
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        // Жесткая системная инструкция для контроля поведения модели
        systemInstruction: "Ты строгий JSON-генератор. Твоя задача - вернуть валидный JSON на русском языке. Запрещено: писать рассуждения (chain-of-thought) внутри строковых полей, добавлять английские переводы в скобках, добавлять префиксы вроде 'Description:'. Пиши кратко и по делу."
      }
    });

    if (!response.text) {
      throw new Error("No response text received from Gemini");
    }

    const rawData = JSON.parse(response.text) as RoomAnalysis;

    // Пост-обработка данных для гарантии чистоты текста
    const cleanData: RoomAnalysis = {
      ...rawData,
      roomType: cleanText(rawData.roomType),
      summary: cleanText(rawData.summary),
      actionItems: rawData.actionItems.map(item => ({
        ...item,
        title: cleanText(item.title),
        description: cleanText(item.description)
      })),
      aestheticSuggestions: rawData.aestheticSuggestions.map(s => cleanText(s)),
      spaceUtilization: rawData.spaceUtilization.map(s => ({
        ...s,
        name: cleanText(s.name)
      }))
    };

    return cleanData;
  } catch (error: any) {
    console.error("Error analyzing room:", error);
    // Обработка ошибки региональных ограничений (распространено для новых моделей Gemini)
    if (error.toString().includes("Region not supported") || error.message?.includes("403")) {
      throw new Error("Gemini API недоступен в вашем регионе. Пожалуйста, используйте VPN.");
    }
    throw error;
  }
};

// Функция отправки сообщений в чат с контекстом истории
export const sendChatMessage = async (
  history: GeminiContent[],
  newMessage: string,
  base64Image?: string
): Promise<string> => {
  try {
    const contents = [...history];

    const newParts: any[] = [{ text: newMessage }];
    
    // Если есть изображение (обычно в первом сообщении), добавляем его в контекст
    if (base64Image) {
      newParts.unshift({
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Image
        }
      });
    }

    contents.push({
      role: 'user',
      parts: newParts
    });

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: contents,
      config: {
        systemInstruction: "Ты TidyAI. Отвечай кратко и только на русском языке. Не используй markdown разметку, если не просят."
      }
    });

    return response.text || "Извините, я не смог сгенерировать ответ.";
  } catch (error) {
    console.error("Chat error:", error);
    return "Извините, произошла ошибка во время обработки. Возможно, сервис недоступен в вашем регионе.";
  }
};