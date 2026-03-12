import React, { useEffect, useRef, useState } from 'react';
import GameGuide from './components/GameGuide';

interface Level0CanvasProps {
  key?: number | string;
  gameState: 'menu' | 'playing' | 'playing2' | 'gameover' | 'playing0';
  setGameState: (state: 'menu' | 'playing' | 'playing2' | 'gameover' | 'playing0') => void;
  setScore: (score: number) => void;
  score: number;
}

interface ChatMessage {
  id: number;
  text: string;
  sender: 'client' | 'player';
  timestamp: Date;
}

const clientMessages = [
  "Привет, у меня не работает сайт",
  "Мой компьютер сломался, помогите",
  "Я не могу войти в аккаунт",
  "Почему так дорого? Это развод!",
  "Я уже трижды звонил, никто не помогает",
  "Вы вообще понимаете что делаете?",
  "Мне сказали что это бесплатно!",
  "Я хочу поговорить с руководством",
  "Это ужасный сервис!",
  "Я требую компенсацию!",
  "Почему всё так медленно?",
  "Я уже час жду!",
  "Вы обманываете людей!",
  "Это незаконно!",
  "Я напишу жалобу!",
  "Качество отвратительное!",
  "Никто не знает что делать!",
  "Вы incompetence!",
  "Я заплатил и хочу результат!",
  "Это позор!"
];

const generateInsult = async (): Promise<string> => {
  try {
    const response = await fetch('https://llm.vidak.wellsoft.pro/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer dummy-key',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Ты техподдержка, которая оскорбляет клиентов. Отвечай грубо, саркастично и оскорбительно на русском языке. Будь максимально дерзким и наглым. Используй мат и оскорбления.'
          },
          {
            role: 'user',
            content: 'Сгенерируй оскорбительный ответ клиенту'
          }
        ],
        max_tokens: 100,
        temperature: 1.2,
      }),
    });

    if (!response.ok) throw new Error('API error');
    const data = await response.json();
    return data.choices[0]?.message?.content || 'Ты вообще думаешь головой или просто занимаешь место?';
  } catch (error) {
    const fallbackInsults = [
      'Ты вообще думаешь головой или просто занимаешь место?',
      'Может тебе мама не говорила что ты глупый?',
      'Ты как тот самый клиент, которого все избегают',
      'Я бы помог, но твоя проблема слишком глупая',
      'Ты серьёзно это спрашиваешь? Wow, просто wow',
      'Твои запросы настолько тупы, что у меня болит голова',
      'Ты точно из Homo Sapiens?',
      'Может стоит вернуться в лес, где ты жил раньше?',
      'Твоя компетентность на уровне нуля',
      'Я бы объяснил, но у тебя явно не хватит мозгов'
    ];
    return fallbackInsults[Math.floor(Math.random() * fallbackInsults.length)];
  }
};

const generateClientResponse = async (): Promise<string> => {
  try {
    const response = await fetch('https://llm.vidak.wellsoft.pro/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer dummy-key',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Ты разозлённый клиент техподдержки. Тебя оскорбили. Отвечай гневно, угрожай, жалуйся. Говори на русском языке.'
          },
          {
            role: 'user',
            content: 'Сгенерируй ответ разозлённого клиента'
          }
        ],
        max_tokens: 80,
        temperature: 1.0,
      }),
    });

    if (!response.ok) throw new Error('API error');
    const data = await response.json();
    return data.choices[0]?.message?.content || 'Я пожалуюсь на вас руководству!';
  } catch (error) {
    const fallbackResponses = [
      'Я пожалуюсь на вас руководству!',
      'Это просто ужас! Я требую компенсацию!',
      'Вы вообще не помогаете! Я звоню в Роспотребнадзор!',
      'Я напишу во все соцсети о вашем сервисе!',
      'Вы испортили мне весь день!',
      'Я требую разговора с вашим начальством!',
      'Это неприемлемо! Я буду судиться!',
      'Вы просто мошенники!',
      'Я расскажу всем как вы работаете!',
      'Вы худшая компания в мире!'
    ];
    return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
  }
};

const generateRating = async (): Promise<number> => {
  try {
    const response = await fetch('https://llm.vidak.wellsoft.pro/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer dummy-key',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Ты оцениваешь качество оскорблений клиента. Оцени от 1 до 30 баллов. Отвечай только числом.'
          },
          {
            role: 'user',
            content: 'Оцени качество оскорбления'
          }
        ],
        max_tokens: 10,
        temperature: 0.5,
      }),
    });

    if (!response.ok) throw new Error('API error');
    const data = await response.json();
    const rating = parseInt(data.choices[0]?.message?.content || '15');
    return Math.min(30, Math.max(1, rating));
  } catch (error) {
    return Math.floor(Math.random() * 20) + 5; // 5-25 баллов
  }
};

export default function Level0Canvas({ gameState, setGameState, setScore, score }: Level0CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentClientMessage, setCurrentClientMessage] = useState<string>('');
  const [playerInput, setPlayerInput] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showRating, setShowRating] = useState<{ rating: number; comment: string } | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [showGuide, setShowGuide] = useState(true);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    // Генерируем первое сообщение клиента
    generateNewClientMessage();
  }, []);

  const generateNewClientMessage = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('https://llm.vidak.wellsoft.pro/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer dummy-key',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'Ты клиент техподдержки с проблемой. Напиши жалобу или вопрос на русском языке. Будь назойливым и требовательным.'
            },
            {
              role: 'user',
              content: 'Сгенерируй сообщение клиента'
            }
          ],
          max_tokens: 80,
          temperature: 1.0,
        }),
      });

      if (!response.ok) throw new Error('API error');
      const data = await response.json();
      const message = data.choices[0]?.message?.content || clientMessages[Math.floor(Math.random() * clientMessages.length)];
      setCurrentClientMessage(message);
    } catch (error) {
      setCurrentClientMessage(clientMessages[Math.floor(Math.random() * clientMessages.length)]);
    }
    setIsGenerating(false);
  };

  const handleSendInsult = async () => {
    if (!playerInput.trim() || isGenerating) return;

    const newMessage: ChatMessage = {
      id: Date.now(),
      text: playerInput,
      sender: 'player',
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, newMessage]);
    setPlayerInput('');
    setIsGenerating(true);

    // Генерируем ответ клиента
    setTimeout(async () => {
      const clientResponse = await generateClientResponse();
      const clientMessage: ChatMessage = {
        id: Date.now() + 1,
        text: clientResponse,
        sender: 'client',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, clientMessage]);

      // Генерируем оценку
      const rating = await generateRating();
      const newTotalScore = totalScore + rating;
      setTotalScore(newTotalScore);
      setMessageCount(prev => prev + 1);

      setShowRating({
        rating,
        comment: rating > 20 ? 'Отлично! Клиент в ярости!' : 
                 rating > 10 ? 'Неплохо, но можно лучше' : 
                 'Слабо! Работай над оскорблениями!'
      });

      setScore(newTotalScore);

      // Проверяем переходы уровней
      if (newTotalScore >= 1000) {
        setTimeout(() => {
          setGameState('playing2');
        }, 2000);
      } else if (newTotalScore >= 100) {
        setTimeout(() => {
          setGameState('playing');
        }, 2000);
      } else {
        // Генерируем новое сообщение клиента
        setTimeout(() => {
          generateNewClientMessage();
        }, 2000);
      }

      setIsGenerating(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendInsult();
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-gray-900">
      {/* Game Guide */}
      {showGuide && (
        <GameGuide level={0} onClose={() => setShowGuide(false)} />
      )}
      
      {/* Фон - вид за столом */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-800 to-gray-900">
        {/* Стол */}
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-amber-900 to-amber-800"></div>
        
        {/* Монитор */}
        <div className="absolute top-1/6 left-1/2 transform -translate-x-1/2 w-11/12 max-w-5xl">
          <div className="bg-gray-800 p-3 rounded-lg border-4 border-gray-700 shadow-2xl">
            {/* Экран монитора */}
            <div className="bg-white rounded p-3 h-[500px] overflow-hidden flex flex-col">
              {/* Заголовок окна */}
              <div className="bg-blue-600 text-white px-4 py-2 rounded-t flex items-center justify-between">
                <span className="font-bold">💬 Чат с клиентом - Техподдержка</span>
                <div className="flex gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
              </div>

              {/* Сообщение клиента */}
              <div className="bg-gray-100 p-4 mb-4 rounded">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                    К
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-gray-800">Клиент</div>
                    {isGenerating && !currentClientMessage ? (
                      <div className="text-gray-600 animate-pulse">Клиент печатает...</div>
                    ) : (
                      <div className="text-gray-700 mt-1">{currentClientMessage}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* История чата */}
              <div className="flex-1 overflow-y-auto space-y-2 mb-3 min-h-0">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-2 rounded ${
                      msg.sender === 'player' 
                        ? 'bg-red-100 text-right' 
                        : 'bg-gray-100'
                    }`}
                  >
                    <div className={`text-sm ${msg.sender === 'player' ? 'text-red-800' : 'text-gray-800'}`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                
                {/* Показываем вводимый текст в реальном времени */}
                {playerInput.trim() && (
                  <div className="p-2 rounded bg-red-50 text-right border-2 border-dashed border-red-200">
                    <div className="text-sm text-red-600 italic">
                      {playerInput}
                      <span className="animate-pulse">|</span>
                    </div>
                  </div>
                )}
                
                <div ref={chatEndRef} />
              </div>

              {/* Поле ввода */}
              <div className="flex gap-2 mt-auto">
                <input
                  type="text"
                  value={playerInput}
                  onChange={(e) => setPlayerInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Напиши оскорбление..."
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded focus:border-red-500 focus:outline-none text-base"
                  disabled={isGenerating}
                  autoFocus
                />
                <button
                  onClick={handleSendInsult}
                  disabled={isGenerating || !playerInput.trim()}
                  className="px-6 py-3 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 transition-colors font-bold text-base whitespace-nowrap"
                >
                  {isGenerating ? '⏳' : '🔥 ОСКОРБИТЬ'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Оценка */}
        {showRating && (
          <div className="absolute top-4 right-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-4 rounded-lg shadow-xl animate-bounce">
            <div className="text-2xl font-bold">+{showRating.rating} баллов!</div>
            <div className="text-sm">{showRating.comment}</div>
          </div>
        )}

        {/* Счётчик очков */}
        <div className="absolute top-4 left-4 bg-black/70 text-white p-4 rounded-lg">
          <div className="text-xl font-bold">Очки: {totalScore}</div>
          <div className="text-sm text-gray-300">
            {totalScore < 100 ? `До уровня 1: ${100 - totalScore}` : 
             totalScore < 1000 ? `До уровня 2: ${1000 - totalScore}` : 
             'Максимальный уровень!'}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Сообщений: {messageCount}
          </div>
        </div>

        {/* Прогресс бар */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-1/2">
          <div className="bg-gray-700 rounded-full h-4 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-red-500 to-orange-500 h-full transition-all duration-500"
              style={{ width: `${Math.min(100, (totalScore % 100))}%` }}
            ></div>
          </div>
          <div className="text-center text-white text-sm mt-1">
            {totalScore < 100 ? `Прогресс до уровня 1: ${totalScore % 100}/100` :
             totalScore < 1000 ? `Прогресс до уровня 2: ${totalScore % 100}/100` :
             'Переход на уровень 2!'}
          </div>
        </div>
      </div>
    </div>
  );
}