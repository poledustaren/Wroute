import React, { useState, useEffect, useRef } from 'react';
import { generateConversationText, speakText, stopSpeaking } from '../services/llmService';

interface Message {
  speaker: 'left' | 'right';
  text: string;
}

interface GameContext {
  score?: number;
  health?: number;
  recentEvent?: string;
  isGameOver?: boolean;
  hasVehicle?: boolean;
}

interface ConversationPopupProps {
  isVisible: boolean;
  onClose: () => void;
  gameContext?: GameContext;
}

export const ConversationPopup: React.FC<ConversationPopupProps> = ({
  isVisible,
  onClose,
  gameContext,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const speakTextAndWait = (text: string): Promise<void> => {
    return new Promise((resolve) => {
      setIsSpeaking(true);
      speakText(text, () => {
        setIsSpeaking(false);
        resolve();
      });
    });
  };

  const generateConversation = async () => {
    setIsGenerating(true);
    setMessages([]);
    stopSpeaking();
    
    try {
      // Генерируем 3-4 сообщения для беседы на 10 секунд
      const numMessages = Math.floor(Math.random() * 2) + 3; // 3-4 сообщения
      
      for (let i = 0; i < numMessages; i++) {
        const text = await generateConversationText(gameContext);
        const speaker: 'left' | 'right' = i % 2 === 0 ? 'left' : 'right';
        
        setMessages(prev => [...prev, { speaker, text }]);
        
        // Озвучиваем сообщение и ждем окончания
        await speakTextAndWait(text);
        
        // Небольшая пауза между сообщениями
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error('Ошибка генерации беседы:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (isVisible && messages.length === 0) {
      generateConversation();
    }
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) {
      setMessages([]);
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center bg-gradient-to-b from-black/90 to-transparent" style={{ height: '20vh' }}>
      <div className="bg-gradient-to-br from-gray-900/95 to-gray-800/95 rounded-b-2xl shadow-2xl border border-t-0 border-gray-700 w-full max-w-4xl overflow-hidden backdrop-blur-sm">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 flex items-center justify-between">
          <h2 className="text-white text-lg font-bold">🎲 Беседа наблюдателей</h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors text-xl"
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div className="px-6 py-3 h-28 overflow-y-auto space-y-3">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.speaker === 'left' ? 'justify-start' : 'justify-end'} animate-fade-in`}
              style={{
                animation: 'fadeIn 0.3s ease-in-out'
              }}
            >
              <div
                className={`max-w-sm px-5 py-3 rounded-2xl shadow-lg ${
                  message.speaker === 'left'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-bl-sm'
                    : 'bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-br-sm'
                }`}
              >
                <div className="text-xs opacity-80 mb-1 font-medium">
                  {message.speaker === 'left' ? '👤 Наблюдатель 1' : '👤 Наблюдатель 2'}
                </div>
                <div className="text-sm leading-relaxed font-medium">{message.text}</div>
              </div>
            </div>
          ))}
          
          {isGenerating && (
            <div className="flex justify-center">
              <div className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-6 py-3 rounded-full text-sm shadow-lg">
                <span className="animate-pulse">🤔 Генерация беседы...</span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Footer minimal */}
        <div className="bg-gray-800/30 px-4 py-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isSpeaking && (
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-400 text-xs">🔊</span>
              </div>
            )}
          </div>
          
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xs transition-colors"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};