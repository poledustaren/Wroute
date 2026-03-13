import React, { useEffect, useRef, useState } from 'react';
import { Level1Engine } from '../engine/level1/Level1Engine';

interface Level1CanvasProps {
  key?: any;
  setGameState: (state: any) => void;
  setScore: (score: number) => void;
  setAmmo: (ammo: number) => void;
  setBuffs: (buffs: string[]) => void;
  showPopup: (text: string) => void;
}

export default function Level1Canvas({ setGameState, setScore, setAmmo, setBuffs, showPopup }: Level1CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Level1Engine | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new Level1Engine({
      canvas: canvasRef.current,
      onGameOver: () => setGameState('gameover'),
      onScoreUpdate: setScore,
      onAmmoUpdate: setAmmo,
      onBuffsUpdate: setBuffs,
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
  }, [setGameState, setScore, setAmmo, setBuffs, showPopup]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      
      <button 
        onClick={() => setGameState('menu')}
        className="absolute top-6 left-6 px-4 py-2 bg-black/50 border-2 border-white text-white font-bold rounded-lg hover:bg-white hover:text-black transition-all z-10"
      >
        ← В МЕНЮ
      </button>

      {/* Control hints */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-zinc-400 font-mono text-xs tracking-widest z-10 bg-black/30 px-4 py-1 rounded-full backdrop-blur-sm border border-white/5 uppercase">
        [Arrows] Move • [Space] Jump • [G/Enter] Goyda
      </div>
    </div>
  );
}
