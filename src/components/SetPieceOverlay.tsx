import React, { useState, useEffect } from 'react';
import { MatchEngine } from '../game/engine';
import { KeyState } from '../types';
import { PITCH_CONFIG } from '../game/constants';
import { Crosshair, MoveUp, MoveDown, RotateCcw, RotateCw, Sparkles, ShieldAlert, Zap } from 'lucide-react';

interface SetPieceOverlayProps {
  engine: MatchEngine;
  keysRef: React.MutableRefObject<KeyState>;
  onAimChange?: (deltaAngle: number, deltaElev: number, deltaCurve: number) => void;
}

export const SetPieceOverlay: React.FC<SetPieceOverlayProps> = ({
  engine,
  keysRef,
}) => {
  const sp = engine.setPiece;
  const isHomeTaker = sp && sp.team === 'home';
  const isPenalty = sp?.type === 'penalty';
  const isFreeKick = sp?.type === 'free_kick';
  const isCorner = sp?.type === 'corner_kick';
  const isThrow = sp?.type === 'throw_in';

  // State refreshed on animation tick
  const [, setTick] = useState(0);

  useEffect(() => {
    let animId: number;
    const loop = () => {
      setTick(t => t + 1);
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  if (!sp || !isHomeTaker) return null;

  const elevation = sp.elevation || 0;
  const curve = sp.curve || 0;
  const power = engine.powerBar.isActive ? engine.powerBar.power : 0;
  const isCharging = engine.powerBar.isActive;
  const powerAction = engine.powerBar.action;
  const isPanenka = sp.isPanenka || engine.powerBar.isChipped || engine.powerBar.isKnuckle;

  // Sweet spot target detection
  // Top goal mouth: Center is PITCH_CONFIG.CENTER_X (930), width is 220
  // Left post: 820, Right post: 1040
  const isSweetSpotLeft = sp.aimAngle < -1.62 && sp.aimAngle > -1.78;
  const isSweetSpotRight = sp.aimAngle < -1.36 && sp.aimAngle > -1.52;
  const isHighElevation = elevation > 0.22;
  const isLowElevation = elevation < -0.20;

  let sweetSpotBadge: string | null = null;
  if (isHighElevation && isSweetSpotLeft) sweetSpotBadge = 'TOP-LEFT 90 POSTAGE STAMP';
  else if (isHighElevation && isSweetSpotRight) sweetSpotBadge = 'TOP-RIGHT 90 POSTAGE STAMP';
  else if (isLowElevation && isSweetSpotLeft) sweetSpotBadge = 'BOTTOM-LEFT SIDE NETTING';
  else if (isLowElevation && isSweetSpotRight) sweetSpotBadge = 'BOTTOM-RIGHT SIDE NETTING';
  else if (Math.abs(curve) > 0.45 && Math.abs(sp.aimAngle - (-Math.PI / 2)) < 0.25) sweetSpotBadge = 'BENDING MAGNUS CURL';

  // Sweet-spot timing green notch is between 60% and 78% power
  const isSweetSpotTiming = power >= 0.60 && power <= 0.78;
  const isOverpowered = power > 0.88;

  // Handlers for on-screen touch/mouse buttons
  const adjustAim = (deltaAngle: number) => {
    if (sp) {
      sp.aimAngle += deltaAngle;
    }
  };

  const adjustElevation = (deltaElev: number) => {
    if (sp) {
      sp.elevation = Math.max(-0.75, Math.min(0.85, (sp.elevation || 0) + deltaElev));
    }
  };

  const adjustCurve = (deltaCurve: number) => {
    if (sp) {
      sp.curve = Math.max(-0.85, Math.min(0.85, (sp.curve || 0) + deltaCurve));
    }
  };

  const triggerTouchPress = (action: 'shoot' | 'cross' | 'pass' | 'long_pass', panenka: boolean = false) => {
    keysRef.current[action === 'shoot' ? 'KeyA' : action === 'cross' ? 'KeyD' : action === 'pass' ? 'KeyS' : 'KeyW'] = true;
    if (panenka) {
      keysRef.current.KeyE = true;
      if (sp) sp.isPanenka = true;
    }
    engine.triggerActionPress(action, keysRef.current, panenka ? 'E' : 'normal');
  };

  const triggerTouchRelease = (action: 'shoot' | 'cross' | 'pass' | 'long_pass') => {
    keysRef.current[action === 'shoot' ? 'KeyA' : action === 'cross' ? 'KeyD' : action === 'pass' ? 'KeyS' : 'KeyW'] = false;
    keysRef.current.KeyE = false;
    engine.triggerActionRelease(action, keysRef.current);
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-4 font-mono select-none">
      {/* TOP HEADER: SET PIECE HUD BANNER & TARGET SWEET SPOT */}
      <div className="flex flex-col items-center gap-2 pt-2">
        <div className="bg-slate-950/85 backdrop-blur-md border border-amber-500/80 px-4 py-2 rounded shadow-2xl flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
            <Crosshair className="w-4 h-4 animate-spin text-amber-400" />
            <span>
              {isPenalty
                ? 'PENALTY KICK DUEL'
                : isCorner
                ? 'CORNER KICK'
                : isThrow
                ? 'TOUCHLINE THROW-IN'
                : isFreeKick
                ? 'DIRECT FREE KICK'
                : 'SET PIECE AIMING'}
            </span>
          </div>

          <div className="h-4 w-[1px] bg-slate-700" />

          {/* Sweet Spot Status */}
          {sweetSpotBadge ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/20 border border-emerald-400/70 rounded text-[10px] text-emerald-300 font-bold animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>🎯 {sweetSpotBadge}</span>
            </div>
          ) : (
            <div className="text-[10px] text-slate-300">
              {isThrow ? 'AIM: [ARROWS] • S: SHORT THROW • W: LONG THROW' : 'AIM: [←/→] • HOLD KEY OR BUTTON TO CHARGE POWER'}
            </div>
          )}

          {/* Goalkeeper Anticipation Psychology indicator for penalties */}
          {isPenalty && sp.gkWeightShift && (
            <div className="flex items-center gap-1 text-[9px] px-2 py-0.5 bg-sky-950/70 border border-sky-400/40 rounded text-sky-300">
              <ShieldAlert className="w-3 h-3 text-sky-400" />
              <span>GK STANCE: {sp.gkWeightShift.toUpperCase()}</span>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM ACTION BUTTONS (Clean, Arcade Flow, Touch / Mouse Friendly) */}
      <div className="flex flex-col items-center gap-2 pb-24 pointer-events-auto">
        <div className="bg-slate-950/90 backdrop-blur-md border border-slate-700 rounded-lg p-2.5 shadow-2xl flex flex-col gap-2 min-w-[280px]">
          <div className="flex items-center justify-between text-[10px] px-1">
            <span className="font-bold text-amber-400 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
              {isPenalty ? 'PENALTY KICK' : isCorner ? 'CORNER KICK' : isThrow ? 'TOUCHLINE THROW-IN' : 'DIRECT FREE KICK'}
            </span>
            <span className="text-[9px] text-slate-400">
              {isThrow ? 'AIM: [ARROWS]' : 'AIM: [←/→]'}
            </span>
          </div>

          {/* Action execution buttons */}
          <div className="grid grid-cols-4 gap-1.5">
            {isThrow ? (
              <>
                <button
                  onMouseDown={() => triggerTouchPress('pass', false)}
                  onMouseUp={() => triggerTouchRelease('pass')}
                  onTouchStart={() => triggerTouchPress('pass', false)}
                  onTouchEnd={() => triggerTouchRelease('pass')}
                  className="col-span-2 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg border border-emerald-400 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-white" />
                  [S] SHORT THROW (SECURE)
                </button>
                <button
                  onMouseDown={() => triggerTouchPress('long_pass', false)}
                  onMouseUp={() => triggerTouchRelease('long_pass')}
                  onTouchStart={() => triggerTouchPress('long_pass', false)}
                  onTouchEnd={() => triggerTouchRelease('long_pass')}
                  className="col-span-2 py-2 px-3 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white rounded font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg border border-purple-400 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-200" />
                  [W] LONG THROW
                </button>
              </>
            ) : isPenalty ? (
              <>
                <button
                  onMouseDown={() => triggerTouchPress('shoot', false)}
                  onMouseUp={() => triggerTouchRelease('shoot')}
                  onTouchStart={() => triggerTouchPress('shoot', false)}
                  onTouchEnd={() => triggerTouchRelease('shoot')}
                  className="col-span-2 py-2 px-3 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white rounded font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg border border-amber-400 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-white" />
                  HOLD [A] SHOOT
                </button>
                <button
                  onMouseDown={() => triggerTouchPress('shoot', true)}
                  onMouseUp={() => triggerTouchRelease('shoot')}
                  onTouchStart={() => triggerTouchPress('shoot', true)}
                  onTouchEnd={() => triggerTouchRelease('shoot')}
                  className="col-span-2 py-2 px-3 bg-fuchsia-600 hover:bg-fuchsia-500 active:bg-fuchsia-700 text-white rounded font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg border border-fuchsia-400 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-fuchsia-200" />
                  [E+A] PANENKA
                </button>
              </>
            ) : isCorner ? (
              <>
                <button
                  onMouseDown={() => triggerTouchPress('cross', false)}
                  onMouseUp={() => triggerTouchRelease('cross')}
                  onTouchStart={() => triggerTouchPress('cross', false)}
                  onTouchEnd={() => triggerTouchRelease('cross')}
                  className="py-2 px-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded font-bold text-[10px] text-center border border-blue-400 shadow cursor-pointer"
                >
                  [D] CROSS
                </button>
                <button
                  onMouseDown={() => triggerTouchPress('cross', true)}
                  onMouseUp={() => triggerTouchRelease('cross')}
                  onTouchStart={() => triggerTouchPress('cross', true)}
                  onTouchEnd={() => triggerTouchRelease('cross')}
                  className="py-2 px-2 bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white rounded font-bold text-[10px] text-center border border-teal-400 shadow cursor-pointer"
                >
                  [E+D] CHIP
                </button>
                <button
                  onMouseDown={() => triggerTouchPress('pass', false)}
                  onMouseUp={() => triggerTouchRelease('pass')}
                  onTouchStart={() => triggerTouchPress('pass', false)}
                  onTouchEnd={() => triggerTouchRelease('pass')}
                  className="py-2 px-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded font-bold text-[10px] text-center border border-emerald-400 shadow cursor-pointer"
                >
                  [S] SHORT
                </button>
                <button
                  onMouseDown={() => triggerTouchPress('shoot', false)}
                  onMouseUp={() => triggerTouchRelease('shoot')}
                  onTouchStart={() => triggerTouchPress('shoot', false)}
                  onTouchEnd={() => triggerTouchRelease('shoot')}
                  className="py-2 px-2 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white rounded font-bold text-[10px] text-center border border-amber-400 shadow cursor-pointer"
                >
                  [A] OLIMPICO
                </button>
              </>
            ) : (
              <>
                <button
                  onMouseDown={() => triggerTouchPress('shoot', false)}
                  onMouseUp={() => triggerTouchRelease('shoot')}
                  onTouchStart={() => triggerTouchPress('shoot', false)}
                  onTouchEnd={() => triggerTouchRelease('shoot')}
                  className="py-2 px-2 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white rounded font-bold text-[10px] text-center border border-amber-400 shadow cursor-pointer"
                >
                  [A] SHOOT
                </button>
                <button
                  onMouseDown={() => triggerTouchPress('cross', false)}
                  onMouseUp={() => triggerTouchRelease('cross')}
                  onTouchStart={() => triggerTouchPress('cross', false)}
                  onTouchEnd={() => triggerTouchRelease('cross')}
                  className="py-2 px-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded font-bold text-[10px] text-center border border-blue-400 shadow cursor-pointer"
                >
                  [D] CROSS
                </button>
                <button
                  onMouseDown={() => triggerTouchPress('pass', false)}
                  onMouseUp={() => triggerTouchRelease('pass')}
                  onTouchStart={() => triggerTouchPress('pass', false)}
                  onTouchEnd={() => triggerTouchRelease('pass')}
                  className="py-2 px-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded font-bold text-[10px] text-center border border-emerald-400 shadow cursor-pointer"
                >
                  [S] PASS
                </button>
                <button
                  onMouseDown={() => triggerTouchPress('long_pass', false)}
                  onMouseUp={() => triggerTouchRelease('long_pass')}
                  onTouchStart={() => triggerTouchPress('long_pass', false)}
                  onTouchEnd={() => triggerTouchRelease('long_pass')}
                  className="py-2 px-2 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white rounded font-bold text-[10px] text-center border border-purple-400 shadow cursor-pointer"
                >
                  [W] LOB
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
