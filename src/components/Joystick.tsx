import React, { useRef, useState, useEffect } from 'react';

interface JoystickProps {
  onMove: (x: number, y: number) => void;
  size?: number;
  color?: string;
}

export const Joystick: React.FC<JoystickProps> = ({ onMove, size = 120, color = 'rgba(255, 255, 255, 0.3)' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [stickPos, setStickPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const handleStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    handleMove(e);
  };

  const handleMove = (e: React.TouchEvent | React.MouseEvent | TouchEvent | MouseEvent) => {
    if (!isDragging && e.type !== 'touchstart' && e.type !== 'mousedown') return;
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    }

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDistance = size / 2;

    let finalX = dx;
    let finalY = dy;

    if (distance > maxDistance) {
      finalX = (dx / distance) * maxDistance;
      finalY = (dy / distance) * maxDistance;
    }

    setStickPos({ x: finalX, y: finalY });
    onMove(finalX / maxDistance, finalY / maxDistance);
  };

  const handleEnd = () => {
    setIsDragging(false);
    setStickPos({ x: 0, y: 0 });
    onMove(0, 0);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('touchmove', handleMove as any);
      window.addEventListener('touchend', handleEnd);
      window.addEventListener('mousemove', handleMove as any);
      window.addEventListener('mouseup', handleEnd);
    } else {
      window.removeEventListener('touchmove', handleMove as any);
      window.removeEventListener('touchend', handleEnd);
      window.removeEventListener('mousemove', handleMove as any);
      window.removeEventListener('mouseup', handleEnd);
    }
    return () => {
      window.removeEventListener('touchmove', handleMove as any);
      window.removeEventListener('touchend', handleEnd);
      window.removeEventListener('mousemove', handleMove as any);
      window.removeEventListener('mouseup', handleEnd);
    };
  }, [isDragging]);

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center rounded-full touch-none shadow-2xl"
      style={{
        width: size,
        height: size,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        backdropFilter: 'blur(4px)',
        border: '4px solid rgba(255, 255, 255, 0.2)',
      }}
      onTouchStart={handleStart}
      onMouseDown={handleStart}
    >
      <div
        className="absolute rounded-full bg-white/40 shadow-xl border-2 border-white/60"
        style={{
          width: size / 2.2,
          height: size / 2.2,
          transform: `translate(${stickPos.x}px, ${stickPos.y}px)`,
          transition: isDragging ? 'none' : 'transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-1/2 h-1/2 rounded-full bg-white/20" />
        </div>
      </div>
    </div>
  );
};
