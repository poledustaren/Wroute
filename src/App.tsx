import React, { useState, useEffect } from 'react';
import GameCanvas, { inputState } from './GameCanvas';
import Level2Canvas, { inputState2 } from './Level2Canvas';
import Level0Canvas from './Level0Canvas';
import { Play, Skull, ArrowLeft, ArrowRight, ArrowUp, Zap, FileText, Cigarette, MessageSquare } from 'lucide-react';

export default function App() {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'playing2' | 'gameover' | 'playing0'>('menu');
  const [score, setScore] = useState(0);
  const [ammo, setAmmo] = useState(10);
  const [buffs, setBuffs] = useState<string[]>([]);
  const [gameId, setGameId] = useState(0);
  const [popupText, setPopupText] = useState<{text: string, id: number} | null>(null);

  useEffect(() => {
    if (popupText) {
      const timer = setTimeout(() => setPopupText(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [popupText]);

  const showPopup = (text: string) => {
    setPopupText({ text, id: Date.now() });
  };

  const startGame = () => {
    setScore(0);
    setAmmo(10);
    setBuffs([]);
    setPopupText(null);
    setGameId(prev => prev + 1);
    setGameState('playing');
  };

  const startLevel2 = () => {
    setScore(0);
    setAmmo(30);
    setBuffs([]);
    setPopupText(null);
    setGameId(prev => prev + 1);
    setGameState('playing2');
  };

  const startLevel0 = () => {
    setScore(0);
    setAmmo(0);
    setBuffs([]);
    setPopupText(null);
    setGameId(prev => prev + 1);
    setGameState('playing0');
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black text-white font-sans select-none">
      {/* Game Canvas */}
      {gameState === 'playing' && (
        <GameCanvas 
          key={gameId}
          gameState={gameState} 
          setGameState={setGameState} 
          setScore={setScore} 
          setAmmo={setAmmo}
          setBuffs={setBuffs}
          showPopup={showPopup}
        />
      )}
      
      {gameState === 'playing2' && (
        <Level2Canvas 
          key={gameId}
          gameState={gameState} 
          setGameState={setGameState} 
          setScore={setScore} 
          setAmmo={setAmmo}
          setBuffs={setBuffs}
          showPopup={showPopup}
        />
      )}

      {gameState === 'playing0' && (
        <Level0Canvas 
          key={gameId}
          gameState={gameState} 
          setGameState={setGameState} 
          setScore={setScore}
          score={score}
        />
      )}

      {/* Popup Text */}
      {popupText && (gameState === 'playing' || gameState === 'playing2') && (
        <div key={popupText.id} className="absolute top-1/4 left-1/2 -translate-x-1/2 z-50 animate-bounce pointer-events-none w-full px-4 text-center">
          <span 
            className="text-2xl md:text-4xl font-black text-yellow-400 drop-shadow-[0_4px_4px_rgba(0,0,0,1)]" 
            style={{ WebkitTextStroke: '1px black' }}
          >
            {popupText.text}
          </span>
        </div>
      )}

      {/* Main Menu */}
      {gameState === 'menu' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/90 backdrop-blur-sm z-50 p-6">
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-2 text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-emerald-400 text-center">
            W ROUTE EBAL
          </h1>
          <p className="text-zinc-400 mb-6 text-lg md:text-xl uppercase tracking-widest text-center">
            Долгий путь в курилку
          </p>
          
          <div className="max-w-2xl text-center mb-12 text-zinc-300 text-sm md:text-base leading-relaxed italic bg-black/30 p-6 rounded-2xl border border-white/5">
            "Сходить покурить, надо начать начинать, а как начнешь если еще не зажегся огонь. Не задымилась подносное пространство, определив конечность горящих задач. Хочется пожечь не только свой пердак, поэтому дорога в курилку превращается в бесконечное путешествие."
          </div>
          
          <div className="flex flex-col gap-4 w-full max-w-xs">
            <button
              onClick={startGame}
              className="flex items-center justify-center gap-2 w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 active:scale-95 transition-all"
            >
              <Play size={20} />
              СТАРТ ИГРЫ
            </button>
            <button
              onClick={startLevel2}
              className="flex items-center justify-center gap-2 w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 active:scale-95 transition-all"
            >
              <Cigarette size={20} />
              УРОВЕНЬ 2 (КУРИЛКА)
            </button>
            <button
              onClick={startGame}
              className="flex items-center justify-center gap-2 w-full py-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 active:scale-95 transition-all"
            >
              <Zap size={20} />
              ГОЙДА
            </button>
            <button
              onClick={startLevel0}
              className="flex items-center justify-center gap-2 w-full py-4 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 active:scale-95 transition-all"
            >
              <MessageSquare size={20} />
              ТЕХПОДДЕРЖКА (УРОВЕНЬ 0)
            </button>
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md z-50">
          <Skull size={64} className="text-red-500 mb-6 animate-pulse" />
          <h2 className="text-4xl font-black mb-2">УВОЛЕН</h2>
          <p className="text-xl text-zinc-300 mb-8">Счет: {score}</p>
          
          <button
            onClick={() => setGameState('menu')}
            className="px-8 py-4 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 active:scale-95 transition-all"
          >
            ПЕРЕИГРАТЬ
          </button>
        </div>
      )}

      {/* HUD */}
      {(gameState === 'playing' || gameState === 'playing2') && (
        <>
          {/* Top HUD */}
          <div className="absolute top-6 left-6 right-6 flex justify-between items-start z-40 pointer-events-none">
            <div className="flex flex-col gap-2">
              <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-lg border border-white/10 inline-block">
                <span className="text-zinc-400 text-xs font-mono uppercase tracking-wider block mb-1">Score</span>
                <span className="text-2xl font-black font-mono">{score}</span>
              </div>
              
              <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-lg border border-white/10 inline-flex items-center gap-3">
                <Zap className="text-red-500" size={20} />
                <span className="text-xl font-black font-mono">{ammo}</span>
              </div>
            </div>

            {/* Buffs */}
            <div className="flex flex-col gap-2 items-end">
              {buffs.map((buff, idx) => (
                <div key={idx} className={`px-3 py-1.5 rounded-md text-sm font-bold backdrop-blur-md border ${
                  buff.includes('Замедление') 
                    ? 'bg-green-500/20 border-green-500/50 text-green-400' 
                    : 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                }`}>
                  {buff}
                </div>
              ))}
            </div>
          </div>
          
          {/* Desktop Instructions */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-zinc-500 text-sm hidden lg:block font-mono">
            [Arrows] Move & Jump • [G] Goyda / Shoot
          </div>
        </>
      )}
    </div>
  );
}
