import React, { useEffect, useRef, useState } from 'react';
import GameGuide from './components/GameGuide';

interface Level0CanvasProps {
  key?: number | string;
  gameState: 'menu' | 'playing' | 'playing2' | 'gameover' | 'playing0' | 'transition01';
  setGameState: (state: 'menu' | 'playing' | 'playing2' | 'gameover' | 'playing0' | 'transition01') => void;
  setScore: (score: number) => void;
  score: number;
}

interface ChatMessage {
  id: number;
  text: string;
  sender: 'client' | 'player';
  timestamp: Date;
}

interface Persona {
  name: string;
  role: string;
  initialPrompt: string;
  escalationPrompt: string;
  avatar: string;
  color: string;
}

const PERSONAS: Persona[] = [
  {
    name: 'Баба Зина',
    role: 'Пенсионерка-параноик',
    initialPrompt: 'Ты - Баба Зина, крайне подозрительная пенсионерка. У тебя "интернет поломался", и ты уверена, что это происки рептилоидов или хакеров. Пиши жалобу на плохом русском, с кучей ошибок и капсом.',
    escalationPrompt: 'Ты в ярости! Ты угрожаешь проклясть техподдержку и написать в Спортлото. Используй больше капса, требуй позвать главного директора всего интернета.',
    avatar: '👵',
    color: 'from-pink-600 to-rose-700'
  },
  {
    name: 'Dead_Inside_2009',
    role: 'Мамкин хакер',
    initialPrompt: 'Ты - прыщавый подросток, который возомнил себя хакером. Твой "супер-софт" не качается. Будь высокомерным, используй сленг (кулхацкер, ламер, гг вп).',
    escalationPrompt: 'Ты начинаешь "дедосить" (на самом деле просто спамишь). Угрожай вычислить по айпи и слить базу данных кукисов. Будь максимально кринжовым.',
    avatar: '⌨️',
    color: 'from-purple-600 to-indigo-700'
  },
  {
    name: 'Арнольд Вениаминович',
    role: 'Истеричный бизнесмен',
    initialPrompt: 'Ты - важный бизнесмен из 90-х. У тебя сделка на миллионы голды срывается из-за неработающего личного кабинета. Требуй немедленного решения.',
    escalationPrompt: 'Ты переходишь на крик. Обещай прислать "ребят на геликах". Твоё время стоит дороже, чем вся эта контора. Используй жесткие обороты.',
    avatar: '💼',
    color: 'from-amber-600 to-orange-700'
  }
];

export default function Level0Canvas({ gameState, setGameState, setScore, score }: Level0CanvasProps) {
  const [persona, setPersona] = useState<Persona>(PERSONAS[0]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentClientMessage, setCurrentClientMessage] = useState<string>('');
  const [playerInput, setPlayerInput] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showRating, setShowRating] = useState<{ rating: number; reaction: string; comment: string } | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [angerLevel, setAngerLevel] = useState(0); // 0 to 100
  const [isShaking, setIsShaking] = useState(false);
  const [glitchText, setGlitchText] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [showGuide, setShowGuide] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const MAX_INPUT_LENGTH = 200;

  useEffect(() => {
    const randomPersona = PERSONAS[Math.floor(Math.random() * PERSONAS.length)];
    setPersona(randomPersona);
    generateFirstMessage(randomPersona);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, currentClientMessage]);

  useEffect(() => {
    if (totalScore >= 100) {
      const timer = setTimeout(() => {
        setGameState('transition01');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [totalScore, setGameState]);

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const generateFirstMessage = async (p: Persona) => {
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
            { role: 'system', content: p.initialPrompt },
            { role: 'user', content: 'Начни диалог с техподдержкой.' }
          ],
          max_tokens: 100,
          temperature: 1.1,
        }),
      });
      const data = await response.json();
      const text = data.choices[0]?.message?.content || 'АЛЁ! ГДЕ ИНТЕРНЕТ?!';
      typeMessage(text);
    } catch (e) {
      setCurrentClientMessage('Слышь, интернет не пашет! Чини давай!');
    } finally {
      setIsGenerating(false);
    }
  };

  const typeMessage = (text: string) => {
    let current = '';
    const interval = setInterval(() => {
      if (current.length < text.length) {
        current += text[current.length];
        setCurrentClientMessage(current);
      } else {
        clearInterval(interval);
      }
    }, 30);
  };

  const handleSendInsult = async () => {
    if (!playerInput.trim() || isGenerating) return;
    
    setError(null);
    const newMessage: ChatMessage = {
      id: Date.now(),
      text: playerInput,
      sender: 'player',
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, newMessage]);
    setPlayerInput('');
    setIsGenerating(true);

    try {
      // 1. Оценка игрока
      const ratingResponse = await fetch('https://llm.vidak.wellsoft.pro/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer dummy-key' },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { 
              role: 'system', 
              content: 'Ты судья в битве оскорблений. Оцени ответ игрока клиенту. Верни ТОЛЬКО JSON: {"rating": <1-40>, "reaction": "ОДНО_СЛОВО_КАПСОМ", "comment": "короткий едкий коммент"}. Реакции должны быть типа: FATALITY, УНИЖЕН, СЛАБО, ОЖОГ, ГЕНИЙ.' 
            },
            { role: 'user', content: `Клиент сказал: "${currentClientMessage}". Игрок ответил: "${playerInput}"` }
          ],
          temperature: 1.0,
        }),
      });
      const ratingData = await ratingResponse.json();
      let ratingObj;
      try {
        ratingObj = JSON.parse(ratingData.choices[0]?.message?.content);
      } catch {
        ratingObj = { rating: 15, reaction: 'НИЧЁТАК', comment: 'Ну, пойдёт для начала.' };
      }

      const newScore = totalScore + ratingObj.rating;
      setTotalScore(newScore);
      setScore(newScore);
      setShowRating(ratingObj);
      if (ratingObj.rating > 25) triggerShake();

      // 2. Рост ярости
      const newAnger = Math.min(100, angerLevel + 15);
      setAngerLevel(newAnger);
      if (newAnger > 70) setGlitchText(true);

      // 3. Ответ клиента
      const response = await fetch('https://llm.vidak.wellsoft.pro/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer dummy-key' },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { 
              role: 'system', 
              content: `${newAnger > 50 ? persona.escalationPrompt : persona.initialPrompt}. Твой уровень ярости: ${newAnger}%. Игрок тебя только что оскорбил: "${playerInput}". Отвечай соразмерно агрессивно.` 
            },
            { role: 'user', content: 'Ответь этому наглецу!' }
          ],
          max_tokens: 120,
          temperature: 1.2,
        }),
      });
      const clientData = await response.json();
      const replyText = clientData.choices[0]?.message?.content || 'ДА ТЫ КТО ТАКОЙ ВООБЩЕ?!';
      
      const clientMsg: ChatMessage = {
        id: Date.now() + 1,
        text: currentClientMessage,
        sender: 'client',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, clientMsg]);
      typeMessage(replyText);

    } catch (e) {
      setError('Квантовый пробой связи! Но ты всё равно лох.');
    } finally {
      setIsGenerating(false);
    }
  };

  const currentBgColor = angerLevel > 80 ? 'bg-red-950' : angerLevel > 50 ? 'bg-red-900' : 'bg-gray-900';

  return (
    <div className={`relative w-full h-full overflow-hidden transition-colors duration-1000 ${currentBgColor} ${isShaking ? 'animate-shake' : ''}`}>
      {showGuide && <GameGuide level={0} onClose={() => setShowGuide(false)} />}
      
      {/* Dynamic Background Effects */}
      <div className={`absolute inset-0 opacity-20 pointer-events-none transition-opacity ${angerLevel > 60 ? 'opacity-50' : ''}`}>
        <div className={`absolute inset-0 bg-gradient-to-tr ${persona.color} mix-blend-overlay animate-pulse`} />
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-4xl perspective-1000">
          <div className={`bg-gray-800 p-4 rounded-xl border-8 border-gray-700 shadow-2xl transform transition-transform duration-500 ${angerLevel > 50 ? 'rotate-x-2' : ''}`}>
            
            <div className="bg-[#f0f2f5] rounded-sm h-[550px] flex flex-col overflow-hidden relative border-4 border-black">
              <div className="bg-gradient-to-r from-blue-700 to-blue-500 p-3 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{persona.avatar}</span>
                  <div className="flex flex-col">
                    <span className="text-white font-black leading-none text-sm uppercase tracking-tighter">ЧАТ С КЛИЕНТОМ: {persona.name}</span>
                    <span className="text-blue-200 text-[10px] font-bold italic">{persona.role} (Ярость: {angerLevel}%)</span>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse" />
                  <div className="w-3 h-3 bg-yellow-400 rounded-full" />
                  <div className="w-3 h-3 bg-green-400 rounded-full" />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white/80 backdrop-blur-sm">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender === 'player' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                    <div className={`max-w-[80%] p-3 rounded-2xl shadow-sm border ${
                      msg.sender === 'player' 
                        ? 'bg-red-600 text-white border-red-700 rounded-br-none' 
                        : 'bg-white text-gray-800 border-gray-200 rounded-bl-none'
                    }`}>
                      <p className="text-sm font-medium leading-tight">{msg.text}</p>
                    </div>
                  </div>
                ))}
                
                {(currentClientMessage || isGenerating) && (
                  <div className={`flex justify-start animate-in zoom-in-95 duration-300`}>
                    <div className={`max-w-[85%] p-4 rounded-2xl shadow-lg border-2 relative transition-all ${
                      angerLevel > 80 ? 'bg-red-50 border-red-600 animate-bounce' : 'bg-blue-50 border-blue-200'
                    }`}>
                      {angerLevel > 90 && <div className="absolute -top-6 -left-2 text-2xl animate-bounce">💢🤬🔥</div>}
                      <div className={`text-base font-black ${glitchText ? 'animate-glitch' : ''} ${angerLevel > 60 ? 'text-red-700' : 'text-blue-900'}`}>
                        {isGenerating && !currentClientMessage ? (
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                            <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                            <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                          </span>
                        ) : currentClientMessage}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-4 bg-gray-100 border-t-2 border-gray-200">
                {error && <div className="text-red-600 text-[10px] font-black uppercase mb-1 animate-pulse tracking-widest leading-none">⚠️ {error}</div>}
                <div className="flex gap-2 relative">
                  <input
                    type="text"
                    value={playerInput}
                    onChange={(e) => setPlayerInput(e.target.value.slice(0, MAX_INPUT_LENGTH))}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendInsult()}
                    placeholder="Напиши что-нибудь гадкое..."
                    className="flex-1 px-4 py-3 rounded-full border-2 border-gray-300 focus:border-red-600 focus:ring-4 focus:ring-red-100 outline-none font-bold text-gray-700 transition-all bg-white"
                    disabled={isGenerating}
                    autoFocus
                  />
                  <button
                    onClick={handleSendInsult}
                    disabled={isGenerating || !playerInput.trim()}
                    className={`px-6 py-3 rounded-full font-black text-white shadow-lg transform active:scale-95 transition-all ${
                      isGenerating || !playerInput.trim() 
                        ? 'bg-gray-400 grayscale cursor-not-allowed' 
                        : 'bg-red-600 hover:bg-red-700 hover:shadow-red-500/40'
                    }`}
                  >
                    {isGenerating ? '⏳...' : 'ОТПРАВИТЬ 🔥'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute top-6 left-6 flex flex-col gap-2 scale-110 origin-top-left">
        <div className="bg-black/80 backdrop-blur-md p-4 rounded-2xl border-2 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
          <div className="text-[10px] text-red-500 font-black uppercase tracking-widest mb-1">Очки унижения</div>
          <div className="text-3xl font-black text-white tracking-tighter leading-none">{totalScore} <span className="text-red-500">/ 100</span></div>
          <div className="w-full bg-gray-800 h-1.5 mt-3 rounded-full overflow-hidden border border-gray-700">
            <div className="h-full bg-gradient-to-r from-red-600 to-orange-500 transition-all duration-700 shadow-[0_0_100px_rgba(239,68,68,0.5)]" style={{ width: `${Math.min(100, totalScore)}%` }} />
          </div>
        </div>
        <button onClick={() => setGameState('menu')} className="bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold px-4 py-2 rounded-full backdrop-blur-sm transition-all text-center">← ВЕРНУТЬСЯ В МЕНЮ</button>
      </div>

      {showRating && (
        <div key={Date.now()} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 animate-in zoom-in-150 fade-in duration-500 flex flex-col items-center">
          <div className="bg-yellow-400 text-black px-8 py-4 rounded-xl shadow-[0_0_50px_rgba(250,204,21,0.6)] transform -rotate-3 border-4 border-black">
            <div className="text-6xl font-black italic tracking-tighter animate-bounce">{showRating.reaction}</div>
            <div className="text-xl font-bold mt-1 text-center bg-black text-yellow-400 px-2">+{showRating.rating} БАЛЛОВ</div>
            <div className="text-sm font-black mt-2 text-center uppercase tracking-tight max-w-[200px] leading-tight opacity-80">{showRating.comment}</div>
            <button 
              onClick={() => setShowRating(null)} 
              className="absolute -top-3 -right-3 w-8 h-8 bg-black text-white rounded-full font-black hover:bg-red-600 border-2 border-white transition-colors"
            >✕</button>
          </div>
        </div>
      )}

      {totalScore >= 100 && (
        <div className="absolute inset-0 z-[100] bg-black/90 flex items-center justify-center animate-in fade-in duration-1000">
          <div className="flex flex-col items-center text-center max-w-xl p-10 bg-gradient-to-br from-green-600 to-emerald-800 rounded-[3rem] border-8 border-green-400 shadow-[0_0_100px_rgba(34,197,94,0.4)]">
            <div className="text-8xl mb-6 drop-shadow-2xl animate-bounce">🚀</div>
            <h2 className="text-6xl font-black text-white leading-none tracking-tighter mb-4">УРОВЕНЬ ПРОЙДЕН!</h2>
            <p className="text-2xl font-bold text-green-100 opacity-90 mb-8 italic">Ты абсолютно токсичный гений. Офис уже ждёт твоего яда.</p>
            <div className="w-full bg-black/30 p-2 rounded-full border border-white/20">
              <div className="bg-white h-4 rounded-full" style={{ width: '100%' }} />
            </div>
            <p className="mt-4 text-white/50 font-bold uppercase tracking-[0.3em] text-[10px]">Квантовый прыжок в Level 1...</p>
          </div>
        </div>
      )}
    </div>
  );
}