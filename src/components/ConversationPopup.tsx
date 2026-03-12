import React, { useState, useEffect, useRef } from 'react';

interface ConversationPopupProps {
  isVisible: boolean;
  onClose: () => void;
  gameContext?: {
    score?: number;
    recentEvent?: string;
    isGameOver?: boolean;
    hasVehicle?: boolean;
  };
}

interface Message {
  id: number;
  text: string;
  sender: 'left' | 'right';
  timestamp: Date;
}

const generateConversation = async (): Promise<{ left: string; right: string }> => {
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
            content: 'Ты генерируешь диалоги двух странных персонажей. Они общаются и несут "дикую дичь" - абсурдные, нелогичные, смешные фразы. Каждый персонаж говорит по одной фразе. Ответь в формате:\nLEFT: [фраза левого персонажа]\nRIGHT: [фраза правого персонажа]\n\nФразы должны быть на русском языке, абсурдными и смешными.'
          },
          {
            role: 'user',
            content: 'Сгенерируй абсурдный диалог двух странных персонажей'
          }
        ],
        max_tokens: 150,
        temperature: 1.5,
      }),
    });

    if (!response.ok) throw new Error('API error');
    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';
    
    // Парсим ответ
    const leftMatch = content.match(/LEFT:\s*(.+)/i);
    const rightMatch = content.match(/RIGHT:\s*(.+)/i);
    
    return {
      left: leftMatch?.[1]?.trim() || 'Я видел как кошка играет на пианино вчера!',
      right: rightMatch?.[1]?.trim() || 'А я знаю что коты могут программировать на Python!'
    };
  } catch (error) {
    const fallbackConversations = [
      { left: 'Я видел как кошка играет на пианино вчера!', right: 'А я знаю что коты могут программировать на Python!' },
      { left: 'Мой компьютер стал есть пиццу!', right: 'Может ему просто нужны витамины?' },
      { left: 'Я нашёл интернет в холодильнике!', right: 'Отлично! Теперь можно качать файлы прямо из морозилки!' },
      { left: 'Мой телефон звонит самому себе!', right: 'Он просто хочет поговорить с кем-то умным!' },
      { left: 'Я вижу как байты танцуют на экране!', right: 'Это просто визуализация твоего безумия!' },
      { left: 'Мой роутер стал вегетарианцем!', right: 'Он больше не ест пакеты данных!' },
      { left: 'Я нашёл баг в реальности!', right: 'Не нажимай Ctrl+Z, а то всё сломается!' },
      { left: 'Мой принтер печатает деньги!', right: 'Отлично! Теперь можно купить больше чернил!' },
      { left: 'Я вижу как код компилируется в облаках!', right: 'Это просто облачные сервисы, дурачок!' },
      { left: 'Мой винчестер стал есть салат!', right: 'Он на диете, хочет прожить дольше!' }
    ];
    return fallbackConversations[Math.floor(Math.random() * fallbackConversations.length)];
  }
};

const speakText = (text: string, voiceIndex: number = 0) => {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ru-RU';
  utterance.rate = 0.9;
  utterance.pitch = voiceIndex === 0 ? 1.2 : 0.8; // Разные голоса
  utterance.volume = 0.8;
  
  // Пытаемся выбрать разные голоса
  const voices = window.speechSynthesis.getVoices();
  const russianVoices = voices.filter(voice => voice.lang.includes('ru'));
  if (russianVoices.length > 0) {
    utterance.voice = russianVoices[voiceIndex % russianVoices.length];
  }
  
  window.speechSynthesis.speak(utterance);
};

export default function ConversationPopup({ isVisible, onClose, gameContext }: ConversationPopupProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<'left' | 'right' | null>(null);
  const [countdown, setCountdown] = useState(10);
  const [isAnimating, setIsAnimating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isVisible && messages.length === 0) {
      generateNewConversation();
    }
  }, [isVisible]);

  useEffect(() => {
    if (isVisible && messages.length > 0) {
      // Автоматическое закрытие через 10 секунд
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleClose();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isVisible, messages.length]);

  const generateNewConversation = async () => {
    setIsGenerating(true);
    setIsAnimating(true);
    
    try {
      const conversation = await generateConversation();
      
      // Добавляем сообщение левого персонажа
      const leftMessage: Message = {
        id: Date.now(),
        text: conversation.left,
        sender: 'left',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, leftMessage]);
      setCurrentSpeaker('left');
      speakText(conversation.left, 0);
      
      // Через 3 секунды добавляем ответ правого персонажа
      setTimeout(() => {
        const rightMessage: Message = {
          id: Date.now() + 1,
          text: conversation.right,
          sender: 'right',
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, rightMessage]);
        setCurrentSpeaker('right');
        speakText(conversation.right, 1);
        
        setTimeout(() => {
          setCurrentSpeaker(null);
          setIsAnimating(false);
        }, 2000);
      }, 3000);
      
    } catch (error) {
      console.error('Ошибка генерации диалога:', error);
      setIsAnimating(false);
    }
    
    setIsGenerating(false);
  };

  const handleClose = () => {
    setIsAnimating(false);
    setCurrentSpeaker(null);
    window.speechSynthesis.cancel();
    onClose();
  };

  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Conversation Window */}
      <div className={`relative bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900 border-2 border-purple-400/30 rounded-2xl p-6 max-w-2xl mx-4 shadow-2xl transform transition-all duration-500 ${
        isAnimating ? 'scale-105' : 'scale-100'
      }`}>
        {/* Header */}
        <div className="text-center mb-4">
          <h2 className="text-2xl font-black text-white mb-1">
            🎭 СТРАННЫЙ РАЗГОВОР
          </h2>
          <p className="text-purple-300 text-sm">
            Два незнакомца несут дичь...
          </p>
        </div>

        {/* Characters */}
        <div className="flex items-start gap-4 mb-4">
          {/* Left Character */}
          <div className={`flex-1 p-4 rounded-xl transition-all duration-300 ${
            currentSpeaker === 'left' 
              ? 'bg-blue-500/30 border-2 border-blue-400 shadow-lg shadow-blue-500/20' 
              : 'bg-blue-900/20 border border-blue-500/20'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${
                currentSpeaker === 'left' ? 'bg-blue-500 animate-pulse' : 'bg-blue-700'
              }`}>
                🤪
              </div>
              <span className="text-blue-300 font-bold text-sm">Странный тип</span>
            </div>
            {currentSpeaker === 'left' && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            )}
          </div>

          {/* Right Character */}
          <div className={`flex-1 p-4 rounded-xl transition-all duration-300 ${
            currentSpeaker === 'right' 
              ? 'bg-green-500/30 border-2 border-green-400 shadow-lg shadow-green-500/20' 
              : 'bg-green-900/20 border border-green-500/20'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${
                currentSpeaker === 'right' ? 'bg-green-500 animate-pulse' : 'bg-green-700'
              }`}>
                🤯
              </div>
              <span className="text-green-300 font-bold text-sm">Ещё странный</span>
            </div>
            {currentSpeaker === 'right' && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-3 rounded-lg transition-all duration-300 ${
                msg.sender === 'left'
                  ? 'bg-blue-500/20 border-l-4 border-blue-400 text-blue-100'
                  : 'bg-green-500/20 border-r-4 border-green-400 text-green-100'
              }`}
            >
              <div className="text-sm leading-relaxed">
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="text-purple-300 text-sm">
            Автозакрытие через: <span className="text-white font-bold">{countdown}с</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={generateNewConversation}
              disabled={isGenerating || isAnimating}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-600 transition-colors font-bold text-sm"
            >
              {isGenerating ? '⏳' : '🎲'} ЕЩЁ
            </button>
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-bold text-sm"
            >
              ЗАКРЫТЬ
            </button>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute -top-2 -left-2 w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-lg shadow-lg">
          🎭
        </div>
        <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center text-lg shadow-lg">
          💬
        </div>
      </div>
    </div>
  );
}