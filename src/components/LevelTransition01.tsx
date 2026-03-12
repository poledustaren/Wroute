import React, { useState, useEffect, useRef, useCallback } from 'react';

interface LevelTransition01Props {
  onComplete: () => void;
  onSkipToMenu: () => void;
  score: number;
}

const storySlides = [
  {
    text: "Наконец-то ты изничтожил последнего клиента. Никто больше не достаёт.",
    subtext: "Ты смотришь на часы. 16:58.",
    voiceText: "Наконец-то ты изничтожил последнего клиента. Никто больше не достаёт. Ты смотришь на часы. Шестнадцать пятьдесят восемь.",
  },
  {
    text: "Курилка. Заветная курилка. Но туда не так просто добраться.",
    subtext: "Коридор за твоим рабочим столом превратился в нечто… другое.",
    voiceText: "Курилка. Заветная курилка. Но туда не так просто добраться. Коридор за твоим рабочим столом превратился в нечто… другое.",
  },
  {
    text: "Коллеги-монстры, дикие обезьяны, летающие сигареты и геймплейные нейронки стоят на твоём пути.",
    subtext: "У тебя есть только банан и стойкость.",
    voiceText: "Коллеги-монстры, дикие обезьяны, летающие сигареты и геймплейные нейронки стоят на твоём пути. У тебя есть только банан и стойкость.",
  },
  {
    text: "Доберись до курилки. Не дай им остановить тебя.",
    subtext: "",
    voiceText: "Доберись до курилки. Не дай им остановить тебя. Гойда!",
  },
];

export default function LevelTransition01({ onComplete, onSkipToMenu, score }: LevelTransition01Props) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [displayedSubtext, setDisplayedSubtext] = useState('');
  const [isTypingSubtext, setIsTypingSubtext] = useState(false);
  const [phase, setPhase] = useState<'fade-in' | 'typing' | 'reading' | 'fade-out'>('fade-in');
  const [fadeInProgress, setFadeInProgress] = useState(0);
  const [fadeOutProgress, setFadeOutProgress] = useState(0);
  const [isVoiceSpeaking, setIsVoiceSpeaking] = useState(false);
  const typingRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const slideRef = useRef(0);
  const hasSpokenRef = useRef(false);

  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ru-RU';
    utterance.rate = 0.85;
    utterance.pitch = 1.0;
    utterance.volume = 0.9;

    const voices = window.speechSynthesis.getVoices();
    const russianVoices = voices.filter(v => v.lang.includes('ru'));
    if (russianVoices.length > 0) {
      utterance.voice = russianVoices[0];
    }

    utterance.onstart = () => setIsVoiceSpeaking(true);
    utterance.onend = () => setIsVoiceSpeaking(false);
    utterance.onerror = () => setIsVoiceSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, []);

  // Fade-in effect
  useEffect(() => {
    if (phase !== 'fade-in') return;
    const interval = setInterval(() => {
      setFadeInProgress(prev => {
        if (prev >= 1) {
          clearInterval(interval);
          setPhase('typing');
          return 1;
        }
        return prev + 0.03;
      });
    }, 16);
    return () => clearInterval(interval);
  }, [phase]);

  // Typing effect
  useEffect(() => {
    if (phase !== 'typing') return;

    const slide = storySlides[slideRef.current];
    const fullText = slide.text;
    let charIndex = 0;

    // Reset states
    setDisplayedText('');
    setDisplayedSubtext('');
    setIsTypingSubtext(false);
    hasSpokenRef.current = false;

    // Start voice after a small delay (let text start appearing)
    const voiceDelay = setTimeout(() => {
      if (!hasSpokenRef.current) {
        hasSpokenRef.current = true;
        speak(slide.voiceText);
      }
    }, 800);

    typingRef.current = window.setInterval(() => {
      if (charIndex < fullText.length) {
        setDisplayedText(fullText.substring(0, charIndex + 1));
        charIndex++;
      } else {
        clearInterval(typingRef.current!);
        clearTimeout(voiceDelay);

        // Type subtext after main text
        if (slide.subtext) {
          setIsTypingSubtext(true);
          let subIndex = 0;
          typingRef.current = window.setInterval(() => {
            if (subIndex < slide.subtext!.length) {
              setDisplayedSubtext(slide.subtext!.substring(0, subIndex + 1));
              subIndex++;
            } else {
              clearInterval(typingRef.current!);
              setPhase('reading');
            }
          }, 25);
        } else {
          setPhase('reading');
        }
      }
    }, 35);

    return () => {
      clearInterval(typingRef.current!);
      clearTimeout(voiceDelay);
    };
  }, [phase, speak]);

  // Reading phase — auto advance
  useEffect(() => {
    if (phase !== 'reading') return;

    const slide = storySlides[slideRef.current];
    const readTime = Math.max(3000, slide.voiceText.length * 55);

    timeoutRef.current = window.setTimeout(() => {
      if (slideRef.current < storySlides.length - 1) {
        // Fade out then next slide
        setPhase('fade-out');
      } else {
        // Last slide — fade out then complete
        setPhase('fade-out');
      }
    }, readTime);

    return () => clearTimeout(timeoutRef.current!);
  }, [phase]);

  // Fade-out effect
  useEffect(() => {
    if (phase !== 'fade-out') return;

    const interval = setInterval(() => {
      setFadeOutProgress(prev => {
        if (prev >= 1) {
          clearInterval(interval);
          if (slideRef.current < storySlides.length - 1) {
            slideRef.current++;
            setCurrentSlide(slideRef.current);
            setFadeInProgress(0);
            setFadeOutProgress(0);
            setPhase('fade-in');
          } else {
            // Defer onComplete to avoid setState-during-render error
            setTimeout(() => onComplete(), 0);
          }
          return 1;
        }
        return prev + 0.04;
      });
    }, 16);
    return () => clearInterval(interval);
  }, [phase, onComplete]);

  // Progress bar
  const progress = ((slideRef.current) / storySlides.length) * 100;

  // Skip on Space/Enter
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (phase === 'reading' || phase === 'typing') {
            window.speechSynthesis.cancel();
            if (slideRef.current < storySlides.length - 1) {
              slideRef.current++;
              setCurrentSlide(slideRef.current);
              setFadeInProgress(1);
              setFadeOutProgress(0);
              setPhase('typing');
            } else {
              // Defer onComplete to avoid setState-during-render error
              setTimeout(() => onComplete(), 0);
            }
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [phase, onComplete]);

  const opacity = phase === 'fade-out'
    ? 1 - fadeOutProgress
    : phase === 'fade-in'
    ? fadeInProgress
    : 1;

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center p-6 md:p-12 transition-opacity duration-200"
      style={{
        opacity,
        background: 'linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 50%, #0a1a2e 100%)',
      }}
    >
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/5"
            style={{
              width: Math.random() * 4 + 2 + 'px',
              height: Math.random() * 4 + 2 + 'px',
              left: Math.random() * 100 + '%',
              top: Math.random() * 100 + '%',
              animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: Math.random() * 3 + 's',
            }}
          />
        ))}
      </div>

      {/* Level indicator */}
      <div className="absolute top-6 left-6 text-white/40 text-xs font-mono uppercase tracking-widest">
        Глава 1 → Глава 2
      </div>

      {/* Score display */}
      <div className="absolute top-6 right-6 text-white/40 text-xs font-mono">
        Счёт: {score}
      </div>

      {/* Progress bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-48 h-1 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-400 to-emerald-400 transition-all duration-500"
          style={{ width: `${progress + (phase === 'fade-out' ? 100 / storySlides.length : 0)}%` }}
        />
      </div>

      {/* Slide content */}
      <div className="relative max-w-2xl w-full text-center">
        {/* Slide number */}
        <div className="mb-6 text-white/20 text-sm font-mono">
          {String(slideRef.current + 1).padStart(2, '0')} / {String(storySlides.length).padStart(2, '0')}
        </div>

        {/* Main text */}
        <h2
          className="text-2xl md:text-3xl lg:text-4xl font-black text-white leading-relaxed mb-4"
          style={{ textShadow: '0 0 30px rgba(100, 200, 255, 0.3)' }}
        >
          {displayedText}
          {phase === 'typing' && !isTypingSubtext && (
            <span className="inline-block w-0.5 h-6 md:h-8 bg-white/60 ml-1 animate-pulse align-middle" />
          )}
        </h2>

        {/* Subtext */}
        {slideRef.current < storySlides.length && storySlides[slideRef.current].subtext && (
          <p
            className={`text-base md:text-lg text-white/60 leading-relaxed italic transition-opacity duration-500 ${
              isTypingSubtext ? 'opacity-100' : displayedSubtext ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {displayedSubtext}
            {isTypingSubtext && (
              <span className="inline-block w-0.5 h-4 bg-white/40 ml-1 animate-pulse align-middle" />
            )}
          </p>
        )}
      </div>

      {/* Voice indicator */}
      {isVoiceSpeaking && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-2 text-white/40 text-sm">
          <div className="flex gap-1">
            <div className="w-1 h-3 bg-white/40 rounded animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1 h-4 bg-white/40 rounded animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1 h-2 bg-white/40 rounded animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="font-mono text-xs">Озвучка</span>
        </div>
      )}

      {/* Skip hint */}
      {phase === 'reading' && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/20 text-xs font-mono">
          Нажмите SPACE для пропуска
        </div>
      )}

      {/* Menu button — always visible during transition */}
      <button
        onClick={() => {
          window.speechSynthesis.cancel();
          onSkipToMenu();
        }}
        className="absolute bottom-4 left-4 px-3 py-1.5 text-white/30 hover:text-white/70 text-xs font-mono border border-white/10 hover:border-white/30 rounded transition-all"
      >
        ← В МЕНЮ
      </button>

      {/* CSS animation keyframes */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
          25% { transform: translateY(-20px) translateX(5px); opacity: 0.6; }
          50% { transform: translateY(-10px) translateX(-5px); opacity: 0.4; }
          75% { transform: translateY(-30px) translateX(3px); opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
