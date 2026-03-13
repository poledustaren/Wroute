import React, { useEffect, useRef, useState } from 'react';
import { Level3Engine } from '../engine/level3/Level3Engine';

interface Level3CanvasProps {
  key?: any;
  setGameState: (state: any) => void;
  showPopup: (text: string) => void;
}

export default function Level3Canvas({ setGameState, showPopup }: Level3CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Level3Engine | null>(null);
  const [state, setState] = useState<any>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new Level3Engine({
      canvas: canvasRef.current,
      onGameOver: () => setGameState('gameover'),
      onStateUpdate: (newState) => setState({ ...newState }), // Clone object for React reactivity
      showPopup: showPopup
    });

    engineRef.current = engine;
    engine.start();

    const handleResize = () => {
      engine.resize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      engine.destroy();
    };
  }, [setGameState, showPopup]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      
      {/* HUD Integration */}
      {state && (
        <>
          <div className="absolute top-6 left-6 flex gap-4 z-10">
            <div className="bg-red-900/80 border-2 border-red-500 px-4 py-2 rounded-lg shadow-[0_0_15px_rgba(255,0,0,0.5)]">
                <span className="text-yellow-400 font-bold text-xl">🍌 {state.bananas} Бананов</span>
            </div>
            <div className="bg-blue-900/80 border-2 border-blue-500 px-4 py-2 rounded-lg shadow-[0_0_15px_rgba(0,100,255,0.5)]">
                <span className="text-white font-bold text-xl">🌊 {state.wave}</span>
            </div>
          </div>

          <button 
            onClick={() => setGameState('menu')}
            className="absolute top-6 right-6 px-4 py-2 bg-black/50 border-2 border-white text-white font-bold rounded-lg hover:bg-white hover:text-black transition-all z-10"
          >
            ← В МЕНЮ
          </button>

          {/* Build Menu */}
          <div className="absolute bottom-10 left-10 p-6 bg-red-950/90 border-4 border-red-600 rounded-xl shadow-[0_0_30px_rgba(255,0,0,0.4)] z-10 min-w-[220px]">
            <h3 className="text-yellow-400 font-black text-center mb-4 tracking-tighter text-shadow-glow">⚙ СТРОЙКА</h3>
            <button
              onClick={() => {
                if (engineRef.current) engineRef.current.state.placingMode = true;
              }}
              disabled={state.bananas < 5 || state.placingMode}
              className={`w-full py-4 rounded-lg font-black text-lg transition-all ${
                state.placingMode 
                ? 'bg-green-600 border-4 border-green-400 animate-pulse' 
                : state.bananas >= 5 
                  ? 'bg-red-600 border-4 border-red-400 hover:scale-105 active:scale-95' 
                  : 'bg-zinc-800 border-4 border-zinc-700 opacity-50 cursor-not-allowed'
              }`}
            >
              {state.placingMode ? 'КЛИКАЙ НА КАРТУ' : `🗼 МИНИГОЙДЕР (5🍌)`}
            </button>
          </div>

          {/* Upgrade Menu */}
          {state.selectedTowerId && (
            <div className="absolute bottom-10 right-10 p-6 bg-red-950/90 border-4 border-red-600 rounded-xl shadow-[0_0_30px_rgba(255,0,0,0.4)] z-10 min-w-[300px]">
              <h3 className="text-yellow-400 font-black text-center mb-4 tracking-tighter text-shadow-glow">⬆ АПГРЕЙД</h3>
              <div className="flex gap-4">
                <button
                  onClick={() => engineRef.current?.upgradeTower('stalin')}
                  className="flex-1 p-3 bg-red-800 border-2 border-red-500 rounded-lg hover:bg-red-700 transition-all"
                >
                  <div className="text-xl">☭</div>
                  <div className="text-[10px] font-bold">ЗА СТАЛИНА</div>
                </button>
                <button
                  onClick={() => engineRef.current?.upgradeTower('zaza')}
                  className="flex-1 p-3 bg-emerald-800 border-2 border-emerald-500 rounded-lg hover:bg-emerald-700 transition-all"
                >
                  <div className="text-xl">⚡</div>
                  <div className="text-[10px] font-bold">ЗА ЗА ЗА</div>
                </button>
              </div>
            </div>
          )}

          {/* Wave Start */}
          {!state.waveActive && !state.gameOver && (
            <button
              onClick={() => engineRef.current?.startWave()}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-12 py-6 bg-green-600 border-8 border-green-400 rounded-2xl font-black text-4xl text-white shadow-[0_0_50px_rgba(0,255,0,0.6)] hover:scale-110 active:scale-90 transition-all z-20"
            >
              ▶ НАЧАТЬ ВОЛНУ {state.wave}
            </button>
          )}

          {/* Game Over */}
          {state.gameOver && (
            <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-50">
              <h2 className="text-8xl font-black text-red-600 mb-8 drop-shadow-[0_0_40px_rgba(255,0,0,1)] animate-bounce italic">ПОРАЖЕНИЕ</h2>
              <button
                onClick={() => window.location.reload()}
                className="px-12 py-6 bg-white text-black font-black text-3xl rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-[0_0_30px_white]"
              >
                🔄 ЕЩЁ РАЗ
              </button>
            </div>
          )}
        </>
      )}

      <style jsx>{`
        .text-shadow-glow {
            text-shadow: 0 0 10px rgba(255, 221, 0, 0.8);
        }
      `}</style>
    </div>
  );
}
