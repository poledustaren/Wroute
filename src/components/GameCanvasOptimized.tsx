import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from '../services/GameEngine';
import GameGuide from './GameGuide';

interface GameCanvasOptimizedProps {
  key?: number | string;
  gameState: 'menu' | 'playing' | 'playing2' | 'gameover' | 'playing0' | 'transition01';
  setGameState: (state: 'menu' | 'playing' | 'playing2' | 'gameover' | 'playing0' | 'transition01') => void;
  setScore: (score: number) => void;
  setAmmo: (ammo: number) => void;
  setBuffs: (buffs: string[]) => void;
  showPopup: (text: string) => void;
}

export default function GameCanvasOptimized({ gameState, setGameState, setScore, setAmmo, setBuffs, showPopup }: GameCanvasOptimizedProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showGuide, setShowGuide] = useState(true);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize game engine
    const engine = new GameEngine({
      canvas: canvasRef.current,
      width: window.innerWidth,
      height: window.innerHeight,
      onScoreUpdate: setScore,
      onAmmoUpdate: setAmmo,
      onBuffsUpdate: setBuffs,
      onGameOver: () => setGameState('gameover'),
      onPopup: showPopup,
    });

    engineRef.current = engine;
    engine.initialize();

    // Handle resize
    const handleResize = () => {
      engine.resize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      engine.destroy();
    };
  }, [setScore, setAmmo, setBuffs, setGameState, showPopup]);

  // Start game when gameState changes to 'playing'
  useEffect(() => {
    if (gameState === 'playing' && engineRef.current) {
      engineRef.current.start();
    }
  }, [gameState]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Game Guide */}
      {showGuide && (
        <GameGuide level={1} onClose={() => setShowGuide(false)} />
      )}
      
      <canvas ref={canvasRef} className="absolute inset-0 z-0 w-full h-full block" />
      
      {isMobile && (
        <div className="absolute inset-0 z-10 pointer-events-none">
          {/* Bottom Left: Goyda */}
          <div className="absolute bottom-10 left-10 flex flex-col gap-4 pointer-events-auto">
            <button
              className="w-24 h-24 bg-red-500/50 rounded-full border-2 border-red-500/80 flex items-center justify-center text-white font-bold active:bg-red-500/80 touch-none"
              onTouchStart={() => { 
                if (engineRef.current) {
                  engineRef.current.input.shoot = true;
                }
              }}
              onTouchEnd={() => { 
                if (engineRef.current) {
                  engineRef.current.input.shoot = false;
                }
              }}
            >
              ГОЙДА
            </button>
          </div>

          {/* Bottom Right: Jump */}
          <div className="absolute bottom-10 right-10 pointer-events-auto">
            <button
              className="w-24 h-24 bg-blue-500/50 rounded-full border-2 border-blue-500/80 flex items-center justify-center text-white font-bold active:bg-blue-500/80 touch-none"
              onTouchStart={() => { 
                if (engineRef.current) {
                  engineRef.current.input.jump = true;
                }
              }}
              onTouchEnd={() => { 
                if (engineRef.current) {
                  engineRef.current.input.jump = false;
                }
              }}
            >
              ПРЫЖОК
            </button>
          </div>
        </div>
      )}
    </div>
  );
}