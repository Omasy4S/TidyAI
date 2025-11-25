import { GoogleGenAI } from "@google/genai";
import { RoomAnalysis, GeminiContent } from "../types";

// Используем import.meta.env для Vite
const apiKey = import.meta.env.VITE_API_KEY;

if (!apiKey) {
  console.error("❌ VITE_API_KEY не найден! Проверь файл .env");
}

const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key' });

// Модель gemini-2.0-flash - самая новая и бесплатная
const MODEL_NAME = 'gemini-2.0-flash';

// Функция очистки текста от артефактов модели
const cleanText = (text: string): string => {
  if (!text) return "";
  let cleaned = text;

  cleaned = cleaned.replace(/\([A-Za-z\s&:\-.]+\)/g, "");
  cleaned = cleaned.replace(/^(Description|Translation|Context|Note|Analysis):/i, "");
  cleaned = cleaned.replace(/\*\*/g, "");
  cleaned = cleaned.replace(/Wait,.*$/i, "");
  
  return cleaned.trim();
};

// Извлечение JSON из ответа модели
const extractJSON = (text: string): string => {
  // Убираем markdown code blocks
  let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  // Находим JSON объект
  const match = cleaned.match(/\{[\s\S]*\}/);
  return match ? match[0] : cleaned;
};

export const analyzeRoomImage = async (base64Image: string): Promise<RoomAnalysis> => {
  if (!apiKey) throw new Error("API Key is missing");

  try {
    const prompt = `Ты профессиональный организатор пространства. Проанализируй фото комнаты и верни ТОЛЬКО валидный JSON на русском языке в следующем формате (без markdown, без \`\`\`):
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

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image
              }
            },
            {
              text: prompt
            }
          ]
        }
      ]
    });

    const responseText = response.text;

    if (!responseText) {
      throw new Error("No response text received from Gemini");
    }

    const jsonString = extractJSON(responseText);
    const rawData = JSON.parse(jsonString) as RoomAnalysis;

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
    if (error.toString().includes("Region not supported") || error.message?.includes("403")) {
      throw new Error("Gemini API недоступен в вашем регионе (VPN может помочь).");
    }
    throw error;
  }
};

export const sendChatMessage = async (
  history: GeminiContent[],
  newMessage: string,
  base64Image?: string
): Promise<string> => {
  if (!apiKey) return "Ошибка: Нет API ключа";

  try {
    const contents = history.map(msg => ({
      role: msg.role,
      parts: msg.parts.map(part => {
        if (part.text) return { text: part.text };
        if (part.inlineData) return { inlineData: part.inlineData };
        return { text: '' };
      })
    }));
    
    const newParts: any[] = [];
    
    if (base64Image) {
      newParts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Image
        }
      });
    }
    
    newParts.push({ text: newMessage });

    contents.push({
      role: 'user',
      parts: newParts
    });

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: contents,
      config: {
        systemInstruction: "Ты TidyAI - помощник по организации пространства. Отвечай кратко и только на русском языке."
      }
    });

    return response.text || "Извините, я не смог сгенерировать ответ.";
  } catch (error) {
    console.error("Chat error:", error);
    return "Произошла ошибка при обращении к AI.";
  }
};
