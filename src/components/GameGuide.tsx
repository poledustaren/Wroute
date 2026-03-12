import React, { useState, useEffect } from 'react';

interface GameGuideProps {
  level: number;
  onClose: () => void;
}

const guideContent = {
  0: {
    title: "🎯 УРОВЕНЬ 0: ТЕХПОДДЕРЖКА",
    subtitle: "Оскорбляй клиентов и зарабатывай очки!",
    controls: [
      { key: "⌨️ Ввод текста", action: "Напиши оскорбление в поле ввода" },
      { key: "↵ Enter", action: "Отправить оскорбление" },
      { key: "🔥 Кнопка ОСКОРБИТЬ", action: "Альтернатива Enter для отправки" },
    ],
    tips: [
      "💡 Чем креативнее оскорбление, тем больше очков!",
      "📊 Очки за оценку от 1 до 30 баллов",
      "🎯 Собери 100 очков чтобы перейти на Уровень 1",
      "🏆 Собери 1000 очков чтобы перейти на Уровень 2"
    ]
  },
  1: {
    title: "🎮 УРОВЕНЬ 1: ОФИС",
    subtitle: "Доберись до курилки через офис!",
    controls: [
      { key: "⬆️⬇️⬅️➡️ Стрелки", action: "Движение персонажа" },
      { key: "WASD", action: "Альтернативное управление" },
      { key: "🖱️ Клик / G", action: "Выстрел сигаретой" },
      { key: "🎯 Мышь", action: "Направление стрельбы" },
    ],
    tips: [
      "🚬 Сигареты - основное оружие (ограничено)",
      "☕ Кофе даёт ускорение",
      "📰 Сплетни замораживают врагов",
      "👗 Собирай одежду для стиля и очков"
    ]
  },
  2: {
    title: "🚬 УРОВЕНЬ 2: КУРИЛКА",
    subtitle: "Защищай свою территорию от душнил!",
    controls: [
      { key: "⬆️⬇️⬅️➡️ Стрелки", action: "Движение персонажа" },
      { key: "WASD", action: "Альтернативное управление" },
      { key: "🖱️ Клик", action: "Бросить выбранное оружие" },
      { key: "1️⃣ Кнопка Сига", action: "Выбрать сигареты" },
      { key: "2️⃣ Кнопка Пепел", action: "Выбрать пепельницу" },
      { key: "🔥 Кнопка ОГОНЬ", action: "Бросить/Выстрелить" },
    ],
    tips: [
      "🚬 Сигареты - летят прямо, наносят 1 урон",
      "🥣 Пепельница - отскакивает от стен и врагов!",
      "💨 Огнетушитель - убирает дым от вейперов",
      "🐵 Обезьяна-поэт - читает стихи за очки",
      "👗 Собирай одежду - хвалебные речи каждые 2-3 вещи!"
    ]
  }
};

export default function GameGuide({ level, onClose }: GameGuideProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [countdown, setCountdown] = useState(10);

  const guide = guideContent[level as keyof typeof guideContent];

  useEffect(() => {
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
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  if (!guide) return null;

  return (
    <div className={`absolute inset-0 z-50 flex items-center justify-center transition-all duration-300 ${
      isVisible ? 'opacity-100' : 'opacity-0'
    }`}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Guide Card */}
      <div className={`relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-white/20 rounded-2xl p-8 max-w-2xl mx-4 shadow-2xl transform transition-all duration-300 ${
        isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
      }`}>
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2">
            {guide.title}
          </h1>
          <p className="text-lg text-gray-300">
            {guide.subtitle}
          </p>
        </div>

        {/* Controls Section */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-blue-400 mb-3 flex items-center gap-2">
            <span>🎮</span> Управление
          </h2>
          <div className="grid gap-2">
            {guide.controls.map((control, index) => (
              <div 
                key={index}
                className="flex items-center gap-4 bg-white/5 rounded-lg p-3 border border-white/10"
              >
                <span className="font-mono text-sm bg-white/10 px-3 py-1 rounded text-white min-w-[140px] text-center">
                  {control.key}
                </span>
                <span className="text-gray-300 text-sm">
                  {control.action}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Tips Section */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-yellow-400 mb-3 flex items-center gap-2">
            <span>💡</span> Советы
          </h2>
          <div className="grid gap-2">
            {guide.tips.map((tip, index) => (
              <div 
                key={index}
                className="text-gray-300 text-sm bg-yellow-500/10 rounded-lg p-3 border border-yellow-500/20"
              >
                {tip}
              </div>
            ))}
          </div>
        </div>

        {/* Close Button & Countdown */}
        <div className="flex items-center justify-between">
          <div className="text-gray-400 text-sm">
            Автозакрытие через: <span className="text-white font-bold">{countdown}с</span>
          </div>
          <button
            onClick={handleClose}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-purple-700 active:scale-95 transition-all shadow-lg"
          >
            ПОНАЯЛ! 🚀
          </button>
        </div>

        {/* Decorative Elements */}
        <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-lg shadow-lg">
          {level === 0 ? '🎯' : level === 1 ? '🎮' : '🚬'}
        </div>
      </div>
    </div>
  );
}