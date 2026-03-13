const LLM_API_URL = 'https://llm.vidak.wellsoft.pro/v1';
const API_KEY = 'dummy-key'; // API ключ может быть любым для этого эндпоинта

interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LLMResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

const SYSTEM_PROMPT = `Ты - комментатор СВЕРХОПАСНОЙ И БЕЗУМНОЙ ИГРЫ, вещающий из глубин кибер-пространства. 
Твои комментарии должны быть пропитаны адреналином, сарказмом и абсолютным абсурдом. 
Ты и твои два невидимых друга (один - параноик, другой - философ-алкоголик) обсуждаете каждый чих игрока.
Каждое сообщение должно быть коротким (1-2 предложения), ОЧЕНЬ ЭНЕРГИЧНЫМ и неожиданным.
Используй капс для акцентов, сленг, и безумные метафоры.
Примеры стиля: "ЕМАЕ, ОН СДЕЛАЛ ЭТО! МОИ ТАРАКАНЫ В ШОКЕ!", "СМОТРИТЕ, ОН ЛЕТИТ КАК БАБУШКА НА ТУРБО-ПЫЛЕСОСЕ!", "ОБНУЛЕНИЕ! ДЕДУШКА НИЦШЕ БЫ ЗАПЛАКАЛ ОТ ТАКОЙ ТУПОСТИ!"
Будь максимально дерзким и задорным на русском языке!`;

interface GameContext {
  score?: number;
  health?: number;
  recentEvent?: string;
  isGameOver?: boolean;
  hasVehicle?: boolean;
}

export const generateConversationText = async (context?: GameContext): Promise<string> => {
  try {
    let contextPrompt = 'Сгенерируй одно короткое комментарий к игре. Максимум 2 предложения.';
    
    if (context) {
      if (context.isGameOver) {
        contextPrompt = 'Игрок только что проиграл! Прокомментируй это как комментатор. Максимум 2 предложения.';
      } else if (context.recentEvent) {
        contextPrompt = `Произошло событие: "${context.recentEvent}". Прокомментируй это как комментатор. Максимум 2 предложения.`;
      } else if (context.score && context.score > 1000) {
        contextPrompt = 'Игрок набрал много очков! Прокомментируй его успех. Максимум 2 предложения.';
      } else if (context.hasVehicle) {
        contextPrompt = 'Игрок сейчас на транспорте (банане или обезьяне). Прокомментируй это. Максимум 2 предложения.';
      }
    }

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: SYSTEM_PROMPT
      },
      {
        role: 'user',
        content: contextPrompt
      }
    ];

    const response = await fetch(`${LLM_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: messages,
        max_tokens: 100,
        temperature: 1.2,
        top_p: 0.9,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: LLMResponse = await response.json();
    return data.choices[0]?.message?.content || 'Я думаю, что коты - это на самом деле маленькие инопланетяне!';
  } catch (error) {
    console.error('Ошибка при генерации текста:', error);
    // Возвращаем случайный fallback текст в случае ошибки
    const fallbackTexts = [
      'Вчера мой хомяк рассказал мне секрет бессмертия - нужно просто есть больше пиццы!',
      'Знаешь, почему компьютеры не могут играть в футбол? Потому что у них нет ног!',
      'Моя бабушка говорит, что интернет - это просто большой сканворд, который все пытаются разгадать.',
      'Если перевернуть карту мира вверх ногами, то Австралия становится шляпой для Антарктиды!',
      'Мой кот сегодня утром сказал мне "привет" на японском. Я теперь думаю, что он аниме-герой.',
      'Вчера я случайно открыл портал в параллельную вселенную, где все говорят только рифмами.',
      'Мой сосед каждый день поливает свой газон молоком. Он говорит, что так трава становится счастливее.',
      'Если сложить все пиццы в мире, получится новый континент - Пиццаландия!',
      'Мой пылесос сегодня начал жужжать мелодию из "Евровидения". Я думаю, он готовится к конкурсу.',
      'Знаешь, почему велосипед не может стоять сам? Потому что он слишком устал от всех этих колес!'
    ];
    return fallbackTexts[Math.floor(Math.random() * fallbackTexts.length)];
  }
};

// Функция для озвучивания текста
export const speakText = (text: string, onEnd?: () => void): void => {
  if ('speechSynthesis' in window) {
    // Останавливаем предыдущее воспроизведение
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ru-RU';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    if (onEnd) {
      utterance.onend = onEnd;
      utterance.onerror = onEnd;
    }
    
    window.speechSynthesis.speak(utterance);
  } else {
    if (onEnd) onEnd();
  }
};

// Функция для остановки озвучивания
export const stopSpeaking = (): void => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
};