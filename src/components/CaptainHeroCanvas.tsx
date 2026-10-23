/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import { PlayerAppearance, TeamKit } from '../types';
import { drawCaptainHeroSprite } from '../game/captainHeroRenderer';

interface CaptainHeroCanvasProps {
  appearance?: PlayerAppearance;
  kit: TeamKit;
  facing?: 'right' | 'left';
  width?: number;
  height?: number;
  scale?: number;
  className?: string;
}

export const CaptainHeroCanvas: React.FC<CaptainHeroCanvasProps> = ({
  appearance,
  kit,
  facing = 'right',
  width = 112,
  height = 192,
  scale = 2,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawCaptainHeroSprite(ctx, appearance, kit, {
      width,
      height,
      facing: facing === 'left' ? 'left' : 'right',
      showArmband: true,
      scale,
    });
  }, [appearance, kit, facing, width, height, scale]);

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          imageRendering: 'pixelated',
          width: `${width * scale}px`,
          height: `${height * scale}px`,
        }}
        className="transition-transform duration-200 drop-shadow-[0_12px_24px_rgba(0,0,0,0.6)]"
      />
    </div>
  );
};
