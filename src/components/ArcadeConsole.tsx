/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useCallback, useMemo } from 'react';
import { KeyState, ControlMode, ControllerCustomization } from '../types';
import {
  resolveStickState,
  getStickSprite,
  getButtonSprite,
} from '../game/arcadeSprites';
import { Camera, Gamepad2, Sliders } from 'lucide-react';
import { DEFAULT_CONTROLLER_CUSTOMIZATION } from '../game/controllerConfig';

export type ActionModifier = 'normal' | 'Q' | 'E';
export type ControllerBgMode = 'solid' | 'transparent' | 'floating' | 'hidden';
export type ControllerTheme = 'black' | 'white' | 'dark_blue' | 'camo';

interface ArcadeConsoleProps {
  keys: KeyState;
  hasBall: boolean;
  onKeyChange: (key: keyof KeyState, pressed: boolean) => void;
  onActionPress?: (action: 'pass' | 'shoot' | 'cross' | 'long_pass', modifier?: ActionModifier) => void;
  onActionRelease?: (action: 'pass' | 'shoot' | 'cross' | 'long_pass', modifier?: ActionModifier) => void;
  onModifierChange?: (modifier: ActionModifier) => void;
  onDeflectionChange?: (ratio: number) => void;
  onTogglePause: () => void;
  isPaused: boolean;
  controllerBgMode?: ControllerBgMode;
  controllerTheme?: ControllerTheme;
  cameraFocus?: 'pitch' | 'ball' | 'player';
  onToggleCameraFocus?: () => void;
  controllerCustomization?: ControllerCustomization;
  controlMode?: ControlMode;
  isGamepadConnected?: boolean;
  gamepadName?: string;
  onOpenControllerSettings?: () => void;
}

export const ArcadeConsole: React.FC<ArcadeConsoleProps> = ({
  keys,
  hasBall,
  onKeyChange,
  onActionPress,
  onActionRelease,
  onModifierChange,
  onDeflectionChange,
  onTogglePause,
  isPaused,
  controllerBgMode = 'solid',
  controllerTheme = 'dark_blue',
  cameraFocus = 'pitch',
  onToggleCameraFocus,
  controllerCustomization = DEFAULT_CONTROLLER_CUSTOMIZATION,
  controlMode = 'full_team',
  isGamepadConnected = false,
  gamepadName = '',
  onOpenControllerSettings,
}) => {
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const [touchTilt, setTouchTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isTouchDragging, setIsTouchDragging] = useState(false);
  const [stickPace, setStickPace] = useState<'idle' | 'walk' | 'run'>('idle');
  const pointerIdRef = useRef<number | null>(null);

  // Button touch state and slide gestures
  const [touchPressed, setTouchPressed] = useState<{ [key: string]: boolean }>({});
  const [activeModifiers, setActiveModifiers] = useState<{ [key: string]: ActionModifier }>({});
  const buttonTouchStateRef = useRef<{
    [key: string]: {
      startY: number;
      startX: number;
      pointerId: number;
      modifier: ActionModifier;
      action: 'long_pass' | 'shoot' | 'pass' | 'cross';
    };
  }>({});

  // Active directional tilt from keyboard arrow keys (or touch)
  const keyboardX = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0);
  const keyboardY = (keys.ArrowDown ? 1 : 0) - (keys.ArrowUp ? 1 : 0);

  // Use touch drag if active, otherwise reflect keyboard arrow keys
  const activeX = isTouchDragging ? touchTilt.x : keyboardX;
  const activeY = isTouchDragging ? touchTilt.y : keyboardY;

  // Resolve 32-bit fixed sprite frame for stick (neutral, 8 half-tilt in-between, 8 full-tilt)
  const stickState = useMemo(() => resolveStickState(activeX, activeY), [activeX, activeY]);
  const stickSpriteSrc = useMemo(() => getStickSprite(stickState), [stickState]);

  // =========================================================================
  // WALKING VS RUNNING VISUAL STATE & SHIFT KEY DISPLACEMENT
  // "make the jotstick more visually dinstinct when walking and when running in keyboard shift is for running, it should visually shift the stick as well when you press it."
  // =========================================================================
  const isKeyboardMoving = keyboardX !== 0 || keyboardY !== 0;
  const isShiftPressed = !!keys.Shift;
  const isRunning = (isShiftPressed && (isKeyboardMoving || isTouchDragging || true)) || stickPace === 'run';
  const isWalking = !isRunning && (isKeyboardMoving || stickPace === 'walk');

  // Calculate visual displacement for joystick when Shift or sprint is active:
  let stickShiftX = 0;
  let stickShiftY = 0;
  let stickScaleBoost = 1.0;

  if (isShiftPressed) {
    stickScaleBoost = 1.09;
    if (keyboardX !== 0 || keyboardY !== 0) {
      stickShiftX = keyboardX * 13;
      stickShiftY = keyboardY * 13;
    } else if (isTouchDragging && (touchTilt.x !== 0 || touchTilt.y !== 0)) {
      stickShiftX = touchTilt.x * 13;
      stickShiftY = touchTilt.y * 13;
    } else {
      // Shift pressed alone: visibly shifts stick upward into forward sprint stance!
      stickShiftY = -11;
    }
  } else if (stickPace === 'run') {
    stickScaleBoost = 1.06;
    stickShiftX = touchTilt.x * 9;
    stickShiftY = touchTilt.y * 9;
  }

  // =========================================================================
  // JOYSTICK TOUCH HANDLERS: Slight pull = Walk, Further pull = Run
  // =========================================================================
  const updateJoystickPos = useCallback((clientX: number, clientY: number) => {
    if (!joystickBaseRef.current) return;
    const rect = joystickBaseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);
    const maxRadius = rect.width / 2 - 8;

    const clampedDist = Math.min(maxRadius, dist);
    const deflection = dist > 0 ? clampedDist / maxRadius : 0;
    const normX = dist > 0 ? (dx / dist) * deflection : 0;
    const normY = dist > 0 ? (dy / dist) * deflection : 0;

    setTouchTilt({ x: normX, y: normY });

    const deadzone = 0.16;
    if (deflection < deadzone) {
      onKeyChange('ArrowLeft', false);
      onKeyChange('ArrowRight', false);
      onKeyChange('ArrowUp', false);
      onKeyChange('ArrowDown', false);
      onKeyChange('Shift', false);
      if (onDeflectionChange) onDeflectionChange(1.0);
      setStickPace('idle');
      return;
    }

    const dirThreshold = 0.20;
    onKeyChange('ArrowLeft', normX < -dirThreshold);
    onKeyChange('ArrowRight', normX > dirThreshold);
    onKeyChange('ArrowUp', normY < -dirThreshold);
    onKeyChange('ArrowDown', normY > dirThreshold);

    // Slight pull: walk; Further pull: run
    const runThreshold = 0.52;
    const isRun = deflection >= runThreshold;
    onKeyChange('Shift', isRun);

    if (isRun) {
      setStickPace('run');
      if (onDeflectionChange) onDeflectionChange(1.0);
    } else {
      setStickPace('walk');
      const walkRatio = 0.65 + ((deflection - deadzone) / (runThreshold - deadzone)) * 0.35;
      if (onDeflectionChange) onDeflectionChange(walkRatio);
    }
  }, [onKeyChange, onDeflectionChange]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (pointerIdRef.current !== null) return;
    pointerIdRef.current = e.pointerId;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setIsTouchDragging(true);
    updateJoystickPos(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.pointerId !== pointerIdRef.current) return;
    updateJoystickPos(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (e.pointerId !== pointerIdRef.current) return;
    pointerIdRef.current = null;
    setIsTouchDragging(false);
    setTouchTilt({ x: 0, y: 0 });
    setStickPace('idle');
    onKeyChange('ArrowLeft', false);
    onKeyChange('ArrowRight', false);
    onKeyChange('ArrowUp', false);
    onKeyChange('ArrowDown', false);
    onKeyChange('Shift', false);
    if (onDeflectionChange) onDeflectionChange(1.0);
  };

  // =========================================================================
  // BUTTON ACTION HANDLERS WITH SWIPE GESTURE HOLD-CHARGING (Phase 7.5.2)
  // Swipe up (E): Loft / chip; Swipe down (Q): Low driven / curl;
  // Swipe right: Through-ball / long pass
  // Holding finger on screen continues ramping up the power bar;
  // Releasing touch executes with the accumulated charge power and modifier!
  // =========================================================================
  const handleButtonPointerDown = (
    btnKey: 'L' | 'S' | 'P' | 'C',
    action: 'long_pass' | 'shoot' | 'pass' | 'cross',
    fallbackKeyWithBall: keyof KeyState,
    fallbackKeyNoBall: keyof KeyState,
    e: React.PointerEvent
  ) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    buttonTouchStateRef.current[btnKey] = {
      startY: e.clientY,
      startX: e.clientX,
      pointerId: e.pointerId,
      modifier: 'normal',
      action: action,
    };

    setTouchPressed(prev => ({ ...prev, [btnKey]: true }));
    setActiveModifiers(prev => ({ ...prev, [btnKey]: 'normal' }));

    if (onActionPress) {
      onActionPress(action, 'normal');
    } else {
      onKeyChange(hasBall ? fallbackKeyWithBall : fallbackKeyNoBall, true);
    }
  };

  const handleButtonPointerMove = (btnKey: 'L' | 'S' | 'P' | 'C', e: React.PointerEvent) => {
    const state = buttonTouchStateRef.current[btnKey];
    if (!state || state.pointerId !== e.pointerId) return;

    const deltaY = e.clientY - state.startY;
    const deltaX = e.clientX - state.startX;
    const slideThreshold = 14;

    let newModifier: ActionModifier = 'normal';
    if (deltaY > slideThreshold) {
      newModifier = 'Q'; // Swipe down: low driven / curl
    } else if (deltaY < -slideThreshold) {
      newModifier = 'E'; // Swipe up: loft / chip
    }

    // Swipe right (deltaX > 20): Switch pass to through-ball / long pass
    if (deltaX > 20 && state.action === 'pass') {
      state.action = 'long_pass';
    }

    if (newModifier !== state.modifier) {
      state.modifier = newModifier;
      setActiveModifiers(prev => ({ ...prev, [btnKey]: newModifier }));

      if (newModifier === 'Q') {
        onKeyChange('KeyQ', true);
        onKeyChange('KeyE', false);
        if (onModifierChange) onModifierChange('Q');
      } else if (newModifier === 'E') {
        onKeyChange('KeyE', true);
        onKeyChange('KeyQ', false);
        if (onModifierChange) onModifierChange('E');
      } else {
        onKeyChange('KeyQ', false);
        onKeyChange('KeyE', false);
        if (onModifierChange) onModifierChange('normal');
      }
    }
  };

  const handleButtonPointerUp = (
    btnKey: 'L' | 'S' | 'P' | 'C',
    action: 'long_pass' | 'shoot' | 'pass' | 'cross',
    fallbackKeyWithBall: keyof KeyState,
    fallbackKeyNoBall: keyof KeyState,
    e: React.PointerEvent
  ) => {
    e.preventDefault();
    const state = buttonTouchStateRef.current[btnKey];
    const modifier = state ? state.modifier : 'normal';
    const effectiveAction = state ? state.action : action;

    delete buttonTouchStateRef.current[btnKey];
    setTouchPressed(prev => ({ ...prev, [btnKey]: false }));
    setActiveModifiers(prev => ({ ...prev, [btnKey]: 'normal' }));

    if (onActionRelease) {
      onActionRelease(effectiveAction, modifier);
    } else {
      onKeyChange(fallbackKeyWithBall, false);
      onKeyChange(fallbackKeyNoBall, false);
    }

    onKeyChange('KeyQ', false);
    onKeyChange('KeyE', false);
    if (onModifierChange) onModifierChange('normal');
  };

  // Button active press states
  const isQPressed = !!keys.KeyQ || !!touchPressed.Q;
  const isEPressed = !!keys.KeyE || !!touchPressed.E;
  const isGPressed = !!keys.Space || !!touchPressed.G;
  const isShootPressed = (hasBall ? !!keys.KeyA : !!keys.KeyS) || !!touchPressed.S;
  const isPassPressed = (hasBall ? !!keys.KeyS : !!keys.KeyW) || !!touchPressed.P;
  const isCrossPressed = !!keys.KeyD || !!touchPressed.C;
  const isLongPassPressed = (hasBall ? !!keys.KeyW : !!keys.KeyA) || !!touchPressed.L;

  // Pre-rendered 32-bit button sprites
  const qSprite = getButtonSprite('Q', isQPressed);
  const eSprite = getButtonSprite('E', isEPressed);
  const gSprite = getButtonSprite('G', isGPressed);
  const pauseSprite = getButtonSprite('PAUSE', isPaused);
  const lSprite = getButtonSprite('L', isLongPassPressed);
  const sSprite = getButtonSprite('S', isShootPressed);
  const cSprite = getButtonSprite('C', isCrossPressed);
  const pSprite = getButtonSprite('P', isPassPressed);

  // Background styling resolution based on controllerBgMode and controllerTheme
  const isFloating = controllerBgMode === 'floating';
  const isTransparent = controllerBgMode === 'transparent';

  let containerBgClass = '';
  let containerInlineStyle: React.CSSProperties = {
    minHeight: `${controllerCustomization.deckHeight}px`,
    opacity: controllerCustomization.deckOpacity,
    transform: `scale(${controllerCustomization.deckScale})`,
    transformOrigin: 'bottom center',
  };

  if (isFloating) {
    containerBgClass = 'bg-transparent border-t-0 shadow-none pointer-events-none';
  } else if (isTransparent) {
    if (controllerTheme === 'black') {
      containerBgClass = 'border-t-2 border-zinc-600/80 shadow-[0_-6px_20px_rgba(0,0,0,0.7)]';
      containerInlineStyle.backgroundColor = 'rgba(8, 9, 13, 0.74)';
    } else if (controllerTheme === 'white') {
      containerBgClass = 'border-t-2 border-slate-400/80 shadow-[0_-6px_20px_rgba(0,0,0,0.35)]';
      containerInlineStyle.backgroundColor = 'rgba(203, 213, 225, 0.74)';
    } else if (controllerTheme === 'camo') {
      containerBgClass = 'border-t-2 border-[#546b3f]/85 shadow-[0_-6px_20px_rgba(0,0,0,0.6)]';
      containerInlineStyle.backgroundColor = 'rgba(46, 61, 36, 0.74)';
    } else {
      containerBgClass = 'border-t-2 border-amber-500/80 shadow-[0_-6px_20px_rgba(0,0,0,0.65)]';
      containerInlineStyle.backgroundColor = 'rgba(7, 19, 30, 0.74)';
    }
  } else {
    if (controllerTheme === 'black') {
      containerBgClass = 'bg-[#08090d] border-t-2 border-zinc-600/90 shadow-[0_-8px_25px_rgba(0,0,0,0.95)]';
    } else if (controllerTheme === 'white') {
      containerBgClass = 'bg-[#cbd5e1] border-t-2 border-slate-400 shadow-[0_-8px_25px_rgba(0,0,0,0.5)]';
    } else if (controllerTheme === 'camo') {
      containerBgClass = 'border-t-2 border-[#546b3f] shadow-[0_-8px_25px_rgba(0,0,0,0.85)]';
      containerInlineStyle.backgroundColor = '#2e3d24';
    } else {
      containerBgClass = 'bg-[#07131e] border-t-2 border-amber-500/90 shadow-[inset_0_2px_4px_rgba(255,255,255,0.06),0_-8px_25px_rgba(0,0,0,0.85)]';
    }
  }

  // Stick and Buttons container styles with custom scaling and offsets
  const isStickRight = controllerCustomization.stickSide === 'right';
  const stickTransformStyle: React.CSSProperties = {
    transform: `translate(${controllerCustomization.stickOffsetX}px, ${controllerCustomization.stickOffsetY}px) scale(${controllerCustomization.stickScale})`,
    transformOrigin: 'center center',
  };

  const buttonsTransformStyle: React.CSSProperties = {
    transform: `translate(${controllerCustomization.buttonsOffsetX}px, ${controllerCustomization.buttonsOffsetY}px)`,
    transformOrigin: 'center center',
  };

  // Buttons spacing multiplier for layouts
  const spacing = controllerCustomization.buttonsSpacing;
  const layoutStyle = controllerCustomization.buttonsLayout;

  if (controllerBgMode === 'hidden') {
    return null;
  }

  return (
    <footer
      className={`relative w-full shrink-0 select-none z-30 transition-all duration-200 ${containerBgClass}`}
      style={containerInlineStyle}
    >
      {/* 32-BIT MICRO-DOT TEXTURE OVERLAY */}
      {!isFloating && !isTransparent && controllerTheme !== 'camo' && controllerTheme !== 'white' && (
        <div
          className="absolute inset-0 pointer-events-none opacity-15"
          style={{
            backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.25) 1px, transparent 1px)',
            backgroundSize: '8px 8px',
          }}
        />
      )}

      {/* 4 ORNATE GOLDEN CORNER BRACKETS */}
      {!isFloating && (
        <>
          <div className="absolute top-1 left-1.5 w-3.5 h-3.5 border-t-2 border-l-2 border-amber-400 pointer-events-none flex items-start justify-start">
            <div className="w-1 h-1 bg-amber-400 shadow-[0_0_4px_#f59e0b]" />
          </div>
          <div className="absolute top-1 right-1.5 w-3.5 h-3.5 border-t-2 border-r-2 border-amber-400 pointer-events-none flex items-start justify-end">
            <div className="w-1 h-1 bg-amber-400 shadow-[0_0_4px_#f59e0b]" />
          </div>
          <div className="absolute bottom-1 left-1.5 w-3.5 h-3.5 border-b-2 border-l-2 border-amber-400 pointer-events-none flex items-end justify-start">
            <div className="w-1 h-1 bg-amber-400 shadow-[0_0_4px_#f59e0b]" />
          </div>
          <div className="absolute bottom-1 right-1.5 w-3.5 h-3.5 border-b-2 border-r-2 border-amber-400 pointer-events-none flex items-end justify-end">
            <div className="w-1 h-1 bg-amber-400 shadow-[0_0_4px_#f59e0b]" />
          </div>
        </>
      )}

      {/* MAIN ARCADE CONSOLE CONTROL DECK (Supports Left vs Right Hand Inversion) */}
      <div
        className={`relative z-10 pointer-events-auto w-full max-w-sm sm:max-w-xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl mx-auto flex items-center justify-between px-2 sm:px-5 md:px-8 py-1 sm:py-2 ${
          isStickRight ? 'flex-row-reverse' : 'flex-row'
        }`}
      >
        {/* ======================================================== */}
        {/* 1. JOYSTICK DECK (SLIGHT PULL = WALK, FURTHER PULL / SHIFT = RUN) */}
        {/* ======================================================== */}
        <div
          className="relative flex flex-col items-center justify-center p-0.5 shrink-0 transition-transform duration-150"
          style={stickTransformStyle}
        >
          <div className="relative w-32 h-34 sm:w-38 sm:h-38 flex items-center justify-center">
            {/* SPECIAL Q BUTTON: TOP-LEFT OF STICK (WHITE) */}
            <div className="absolute top-0 left-0 flex flex-col items-center z-20">
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  setTouchPressed(prev => ({ ...prev, Q: true }));
                  onKeyChange('KeyQ', true);
                }}
                onPointerUp={(e) => {
                  e.preventDefault();
                  setTouchPressed(prev => ({ ...prev, Q: false }));
                  onKeyChange('KeyQ', false);
                }}
                onPointerLeave={() => {
                  setTouchPressed(prev => ({ ...prev, Q: false }));
                  onKeyChange('KeyQ', false);
                }}
                onPointerCancel={() => {
                  setTouchPressed(prev => ({ ...prev, Q: false }));
                  onKeyChange('KeyQ', false);
                }}
                aria-label="Q: Ball Shielding / Nutmeg"
                title="Q: Ball Shielding / Nutmeg Skill (White)"
                className="w-9 h-9 sm:w-10 sm:h-10 cursor-pointer active:scale-95 transition-transform select-none touch-manipulation focus:outline-none"
              >
                <img
                  src={qSprite}
                  alt="Q"
                  width={40}
                  height={40}
                  className="w-full h-full object-contain pointer-events-none [image-rendering:pixelated]"
                />
              </button>
              <span className={`font-['Press_Start_2P'] text-[6px] mt-0.5 tracking-tighter ${controllerTheme === 'white' && !isFloating ? 'text-slate-800' : 'text-slate-300'}`}>
                SHIELD
              </span>
            </div>

            {/* SPECIAL E BUTTON: TOP-RIGHT OF STICK (BLACK) */}
            <div className="absolute top-0 right-0 flex flex-col items-center z-20">
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  setTouchPressed(prev => ({ ...prev, E: true }));
                  onKeyChange('KeyE', true);
                }}
                onPointerUp={(e) => {
                  e.preventDefault();
                  setTouchPressed(prev => ({ ...prev, E: false }));
                  onKeyChange('KeyE', false);
                }}
                onPointerLeave={() => {
                  setTouchPressed(prev => ({ ...prev, E: false }));
                  onKeyChange('KeyE', false);
                }}
                onPointerCancel={() => {
                  setTouchPressed(prev => ({ ...prev, E: false }));
                  onKeyChange('KeyE', false);
                }}
                aria-label="E: Step-overs / Dash / Shirt Pull"
                title="E: Step-overs / Dash / Shirt Pull (Black)"
                className="w-9 h-9 sm:w-10 sm:h-10 cursor-pointer active:scale-95 transition-transform select-none touch-manipulation focus:outline-none"
              >
                <img
                  src={eSprite}
                  alt="E"
                  width={40}
                  height={40}
                  className="w-full h-full object-contain pointer-events-none [image-rendering:pixelated]"
                />
              </button>
              <span className={`font-['Press_Start_2P'] text-[6px] mt-0.5 tracking-tighter ${controllerTheme === 'white' && !isFloating ? 'text-slate-800' : 'text-slate-400'}`}>
                SKILL
              </span>
            </div>

            {/* JOYSTICK BASE WITH VISUALLY DISTINCT WALK VS RUN + KEYBOARD SHIFT SHIFTING */}
            <div
              ref={joystickBaseRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="absolute bottom-0 w-24 h-24 sm:w-28 sm:h-28 rounded-full cursor-grab active:cursor-grabbing touch-none select-none flex items-center justify-center ring-1 ring-slate-700/70 bg-slate-900/50 transition-all duration-150"
              title="32-Bit Arcade Joystick (Slight pull / Arrow = Walk | Further pull / Shift = Run)"
            >
              {/* JOYSTICK KNOB SPRITE - VISUALLY SHIFTS WITH STICK MOVEMENT & MECHANICAL SPRINT LEAN */}
              <img
                src={stickSpriteSrc}
                alt="Joystick"
                width={100}
                height={100}
                className="w-full h-full object-contain pointer-events-none [image-rendering:pixelated] transition-transform duration-100 ease-out"
                style={{
                  transform: `translate(${stickShiftX}px, ${stickShiftY}px) scale(${stickScaleBoost})`,
                }}
              />

              {/* REAL-TIME PACE INDICATOR (WALK / RUN / SHIFT) */}
              {(isRunning || isWalking) && (
                <div
                  className={`absolute -top-4 px-2 py-0.5 rounded border font-['Press_Start_2P'] text-[7px] font-bold shadow-md pointer-events-none animate-in fade-in duration-100 whitespace-nowrap z-30 ${
                    isRunning
                      ? 'bg-amber-600 border-amber-400 text-white'
                      : 'bg-slate-800 border-slate-600 text-slate-200'
                  }`}
                >
                  {isRunning ? '⚡ RUN (SHIFT)' : '🚶 WALK'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. CENTER: PAUSE BUTTON, JOYSTICK DETECTOR & G BUTTON */}
        {/* ======================================================== */}
        <div className="flex flex-col items-center justify-center px-1 sm:px-2 shrink-0 gap-1 sm:gap-2">
          {/* TOP: CIRCULAR PAUSE BUTTON */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              id="arcade-console-pause-btn"
              onClick={onTogglePause}
              aria-label="Pause Match"
              title="Pause Match (Options & Settings)"
              className="w-9 h-9 sm:w-11 sm:h-11 cursor-pointer active:scale-95 transition-transform select-none touch-manipulation focus:outline-none"
            >
              <img
                src={pauseSprite}
                alt="Pause"
                width={44}
                height={44}
                className="w-full h-full object-contain pointer-events-none [image-rendering:pixelated]"
              />
            </button>
            <span className={`font-['Press_Start_2P'] text-[6px] sm:text-[7px] mt-0.5 tracking-widest uppercase ${controllerTheme === 'white' && !isFloating ? 'text-amber-600 font-bold' : 'text-amber-400'}`}>
              {isPaused ? 'RESUME' : 'PAUSE'}
            </span>
          </div>

          {/* QUICK CONTROLLER CONFIG / GAMEPAD BADGE */}
          {onOpenControllerSettings && (
            <button
              type="button"
              onClick={onOpenControllerSettings}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[6px] font-mono transition cursor-pointer active:scale-95 ${
                isGamepadConnected
                  ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300 hover:text-white'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-amber-300 hover:border-amber-500'
              }`}
              title={isGamepadConnected ? `Joystick Active: ${gamepadName}. Click to configure.` : 'Controller & Button Configuration'}
            >
              {isGamepadConnected ? (
                <>
                  <Gamepad2 className="w-2.5 h-2.5 text-emerald-400" />
                  <span>PAD ON</span>
                </>
              ) : (
                <>
                  <Sliders className="w-2.5 h-2.5 text-amber-400" />
                  <span>CONFIG</span>
                </>
              )}
            </button>
          )}

          {/* BOTTOM: G BUTTON (GINGA / DEFENSE SWITCH / AUTO-POS) */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              tabIndex={-1}
              onPointerDown={(e) => {
                e.preventDefault();
                setTouchPressed(prev => ({ ...prev, G: true }));
                onKeyChange('Space', true);
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                setTouchPressed(prev => ({ ...prev, G: false }));
                onKeyChange('Space', false);
              }}
              onPointerLeave={() => {
                setTouchPressed(prev => ({ ...prev, G: false }));
                onKeyChange('Space', false);
              }}
              onPointerCancel={() => {
                setTouchPressed(prev => ({ ...prev, G: false }));
                onKeyChange('Space', false);
              }}
              aria-label={
                hasBall
                  ? "G: Ginga Lift / Juggling / Sombrero"
                  : controlMode === 'one_player'
                  ? "Auto-Position Assist (Spacebar)"
                  : "Switch Defender (Spacebar)"
              }
              title={
                hasBall
                  ? "G: Ginga Aerial Lift / Juggling / Sombreros (Spacebar)"
                  : controlMode === 'one_player'
                  ? "Spacebar: Automatically Position Player to Best Tactical AI Spot"
                  : "Spacebar: Switch to Closest Defender to Ball"
              }
              className="w-8 h-8 sm:w-9 sm:h-9 cursor-pointer active:scale-95 transition-transform select-none touch-manipulation focus:outline-none"
            >
              <img
                src={gSprite}
                alt={hasBall ? "Ginga" : controlMode === 'one_player' ? "Auto-Pos" : "Switch"}
                width={36}
                height={36}
                className="w-full h-full object-contain pointer-events-none [image-rendering:pixelated]"
              />
            </button>
            <span
              className={`font-['Press_Start_2P'] text-[5px] sm:text-[6px] mt-0.5 tracking-wider uppercase ${
                !hasBall
                  ? controlMode === 'one_player'
                    ? 'text-cyan-300 font-bold'
                    : 'text-cyan-400 font-bold'
                  : controllerTheme === 'white' && !isFloating
                  ? 'text-amber-700 font-bold'
                  : 'text-amber-300'
              }`}
            >
              {hasBall ? 'GINGA' : controlMode === 'one_player' ? 'AUTOPOS' : 'SWITCH'}
            </span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 3. RIGHT: 4 ARCADE BUTTONS (WITH CUSTOMIZABLE LAYOUT) */}
        {/* ======================================================== */}
        <div
          className="relative w-34 h-34 sm:w-38 sm:h-38 flex items-center justify-center p-0.5 shrink-0 transition-transform duration-150"
          style={buttonsTransformStyle}
        >
          {/* DETAILED BROADCAST CAMERA TOGGLE BUTTON AT TOP RIGHT */}
          {onToggleCameraFocus && (
            <div className="absolute -top-1.5 right-0 flex flex-col items-center z-30">
              <button
                type="button"
                onClick={onToggleCameraFocus}
                aria-label="Toggle Camera Focus (Pitch vs Ball vs Player)"
                title={`Camera & Radar Focus: ${cameraFocus.toUpperCase()} (Click or press C to toggle: Pitch / Ball / Player)`}
                className={`w-8 h-8 rounded-full border flex items-center justify-center transition active:scale-90 cursor-pointer shadow-md ${
                  cameraFocus === 'pitch'
                    ? 'bg-cyan-600/90 border-cyan-300 text-white shadow-[0_0_8px_#06b6d4]'
                    : cameraFocus === 'player'
                    ? 'bg-amber-500 border-amber-300 text-slate-950 shadow-[0_0_8px_#f59e0b]'
                    : 'bg-slate-900 border-slate-600 text-amber-300 hover:text-white hover:border-amber-400'
                }`}
              >
                {/* Detailed Broadcast Camera SVG Icon */}
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6">
                  {/* Camera Main Housing */}
                  <rect x="2.5" y="7" width="12" height="11" rx="2" fill="currentColor" fillOpacity="0.25" />
                  {/* Beveled Studio Lens Hood */}
                  <path d="M14.5 10.2L20.5 7.2V17.8L14.5 14.8" strokeLinejoin="round" fill="currentColor" fillOpacity="0.35" />
                  {/* Circular Optical Glass Element */}
                  <circle cx="8.5" cy="12.5" r="3.2" strokeWidth="1.2" />
                  <circle cx="8.5" cy="12.5" r="1.3" fill="currentColor" />
                  {/* Top Monitor / Viewfinder */}
                  <rect x="4.5" y="3.2" width="6.5" height="3.8" rx="1" fill="currentColor" fillOpacity="0.45" />
                  {/* Recording Tally Lamp (Red) */}
                  <circle cx="12.5" cy="9.2" r="1.1" fill="#ef4444" stroke="#f87171" strokeWidth="0.5" />
                </svg>
              </button>
              <span className="font-['Press_Start_2P'] text-[5px] text-amber-300 mt-0.5 tracking-tighter">
                {cameraFocus === 'pitch' ? 'PITCH' : cameraFocus === 'player' ? 'PLYR' : 'BALL'}
              </span>
            </div>
          )}

          {/* SLIDE GESTURE HUD HINTS ON HOVER / ACTIVE */}
          {activeModifiers.L === 'E' || activeModifiers.S === 'E' || activeModifiers.P === 'E' || activeModifiers.C === 'E' ? (
            <div className="absolute -top-3.5 left-2 px-2 py-0.5 rounded bg-pink-600/95 border border-pink-300 text-white font-['Press_Start_2P'] text-[7px] font-bold shadow-[0_0_10px_#f472b6] pointer-events-none z-30 animate-pulse">
              ▲ [E] CHIP / SKILL
            </div>
          ) : activeModifiers.L === 'Q' || activeModifiers.S === 'Q' || activeModifiers.P === 'Q' || activeModifiers.C === 'Q' ? (
            <div className="absolute -bottom-3.5 left-2 px-2 py-0.5 rounded bg-purple-600/95 border border-purple-300 text-white font-['Press_Start_2P'] text-[7px] font-bold shadow-[0_0_10px_#c084fc] pointer-events-none z-30 animate-pulse">
              ▼ [Q] SPECIAL CURVE / SHIELD
            </div>
          ) : null}

          {/* 4 ACTION BUTTONS CONTAINER (SUPPORTS DIAMOND, ARC, AND CLUSTER LAYOUTS) */}
          <div
            className="relative w-full h-full flex items-center justify-center"
            style={{ transform: `scale(${spacing})`, transformOrigin: 'center center' }}
          >
            {/* BUTTON 1: LONG PASS (L / W) - RED */}
            <div
              className={`absolute flex flex-col items-center ${
                layoutStyle === 'arc'
                  ? 'right-0 top-1'
                  : layoutStyle === 'cluster'
                  ? 'right-1 top-1'
                  : 'top-0 left-1/2 -translate-x-1/2'
              }`}
            >
              <button
                type="button"
                onPointerDown={(e) => handleButtonPointerDown('L', 'long_pass', 'KeyW', 'KeyW', e)}
                onPointerMove={(e) => handleButtonPointerMove('L', e)}
                onPointerUp={(e) => handleButtonPointerUp('L', 'long_pass', 'KeyW', 'KeyW', e)}
                onPointerCancel={(e) => handleButtonPointerUp('L', 'long_pass', 'KeyW', 'KeyW', e)}
                aria-label="L: Long Pass / Push Foul (Keyboard W)"
                title="L: Long Pass (With Ball) / Push Foul (Without Ball) [Keyboard W]"
                className={`relative w-10 h-10 sm:w-11 sm:h-11 cursor-pointer active:scale-95 transition-transform select-none touch-none focus:outline-none rounded-full ${
                  activeModifiers.L === 'E'
                    ? 'ring-2 ring-pink-400 shadow-[0_0_12px_#f472b6]'
                    : activeModifiers.L === 'Q'
                    ? 'ring-2 ring-purple-400 shadow-[0_0_12px_#c084fc]'
                    : ''
                }`}
              >
                <img
                  src={lSprite}
                  alt="L"
                  width={48}
                  height={48}
                  className="w-full h-full object-contain pointer-events-none [image-rendering:pixelated]"
                />
                <span className={`absolute -top-1.5 left-1/2 -translate-x-1/2 text-[6px] font-black ${activeModifiers.L === 'E' ? 'text-pink-300 font-bold scale-125' : 'text-slate-400/80'}`}>
                  ▲E
                </span>
                <span className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[6px] font-black ${activeModifiers.L === 'Q' ? 'text-purple-300 font-bold scale-125' : 'text-slate-400/80'}`}>
                  ▼Q
                </span>
              </button>
            </div>

            {/* BUTTON 2: SHOOT (S / A) - BLUE */}
            <div
              className={`absolute flex flex-col items-center ${
                layoutStyle === 'arc'
                  ? 'left-0 bottom-1'
                  : layoutStyle === 'cluster'
                  ? 'left-1 top-1'
                  : 'left-0 top-1/2 -translate-y-1/2'
              }`}
            >
              <button
                type="button"
                onPointerDown={(e) => handleButtonPointerDown('S', 'shoot', 'KeyA', 'KeyA', e)}
                onPointerMove={(e) => handleButtonPointerMove('S', e)}
                onPointerUp={(e) => handleButtonPointerUp('S', 'shoot', 'KeyA', 'KeyA', e)}
                onPointerCancel={(e) => handleButtonPointerUp('S', 'shoot', 'KeyA', 'KeyA', e)}
                aria-label="S: Shoot / Clear Volley (Keyboard A)"
                title="S: Shoot At Goal (With Ball) / Clearance (Without Ball) [Keyboard A]"
                className={`relative w-10 h-10 sm:w-11 sm:h-11 cursor-pointer active:scale-95 transition-transform select-none touch-none focus:outline-none rounded-full ${
                  activeModifiers.S === 'E'
                    ? 'ring-2 ring-pink-400 shadow-[0_0_12px_#f472b6]'
                    : activeModifiers.S === 'Q'
                    ? 'ring-2 ring-purple-400 shadow-[0_0_12px_#c084fc]'
                    : ''
                }`}
              >
                <img
                  src={sSprite}
                  alt="S"
                  width={48}
                  height={48}
                  className="w-full h-full object-contain pointer-events-none [image-rendering:pixelated]"
                />
                <span className={`absolute -top-1.5 left-1/2 -translate-x-1/2 text-[6px] font-black ${activeModifiers.S === 'E' ? 'text-pink-300 font-bold scale-125' : 'text-slate-400/80'}`}>
                  ▲E
                </span>
                <span className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[6px] font-black ${activeModifiers.S === 'Q' ? 'text-purple-300 font-bold scale-125' : 'text-slate-400/80'}`}>
                  ▼Q
                </span>
              </button>
            </div>

            {/* BUTTON 3: CROSS (C / D) - YELLOW */}
            <div
              className={`absolute flex flex-col items-center ${
                layoutStyle === 'arc'
                  ? 'right-9 top-1/2 -translate-y-1/2'
                  : layoutStyle === 'cluster'
                  ? 'right-1 bottom-1'
                  : 'right-0 top-1/2 -translate-y-1/2'
              }`}
            >
              <button
                type="button"
                onPointerDown={(e) => handleButtonPointerDown('C', 'cross', 'KeyD', 'KeyD', e)}
                onPointerMove={(e) => handleButtonPointerMove('C', e)}
                onPointerUp={(e) => handleButtonPointerUp('C', 'cross', 'KeyD', 'KeyD', e)}
                onPointerCancel={(e) => handleButtonPointerUp('C', 'cross', 'KeyD', 'KeyD', e)}
                aria-label="C: Cross / Slide Tackle (Keyboard D)"
                title="C: Curled Cross (With Ball) / Sliding Tackle (Without Ball) [Keyboard D]"
                className={`relative w-10 h-10 sm:w-11 sm:h-11 cursor-pointer active:scale-95 transition-transform select-none touch-none focus:outline-none rounded-full ${
                  activeModifiers.C === 'E'
                    ? 'ring-2 ring-pink-400 shadow-[0_0_12px_#f472b6]'
                    : activeModifiers.C === 'Q'
                    ? 'ring-2 ring-purple-400 shadow-[0_0_12px_#c084fc]'
                    : ''
                }`}
              >
                <img
                  src={cSprite}
                  alt="C"
                  width={48}
                  height={48}
                  className="w-full h-full object-contain pointer-events-none [image-rendering:pixelated]"
                />
                <span className={`absolute -top-1.5 left-1/2 -translate-x-1/2 text-[6px] font-black ${activeModifiers.C === 'E' ? 'text-pink-300 font-bold scale-125' : 'text-slate-400/80'}`}>
                  ▲E
                </span>
                <span className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[6px] font-black ${activeModifiers.C === 'Q' ? 'text-purple-300 font-bold scale-125' : 'text-slate-400/80'}`}>
                  ▼Q
                </span>
              </button>
            </div>

            {/* BUTTON 4: SHORT PASS (P / S) - GREEN */}
            <div
              className={`absolute flex flex-col items-center ${
                layoutStyle === 'arc'
                  ? 'left-9 top-1/2 -translate-y-1/2'
                  : layoutStyle === 'cluster'
                  ? 'left-1 bottom-1'
                  : 'bottom-0 left-1/2 -translate-x-1/2'
              }`}
            >
              <button
                type="button"
                onPointerDown={(e) => handleButtonPointerDown('P', 'pass', 'KeyS', 'KeyS', e)}
                onPointerMove={(e) => handleButtonPointerMove('P', e)}
                onPointerUp={(e) => handleButtonPointerUp('P', 'pass', 'KeyS', 'KeyS', e)}
                onPointerCancel={(e) => handleButtonPointerUp('P', 'pass', 'KeyS', 'KeyS', e)}
                aria-label="P: Short Pass / Standing Tackle (Keyboard S)"
                title="P: Short Ground Pass (With Ball) / Standing Tackle (Without Ball) [Keyboard S]"
                className={`relative w-10 h-10 sm:w-11 sm:h-11 cursor-pointer active:scale-95 transition-transform select-none touch-none focus:outline-none rounded-full ${
                  activeModifiers.P === 'E'
                    ? 'ring-2 ring-pink-400 shadow-[0_0_12px_#f472b6]'
                    : activeModifiers.P === 'Q'
                    ? 'ring-2 ring-purple-400 shadow-[0_0_12px_#c084fc]'
                    : ''
                }`}
              >
                <img
                  src={pSprite}
                  alt="P"
                  width={48}
                  height={48}
                  className="w-full h-full object-contain pointer-events-none [image-rendering:pixelated]"
                />
                <span className={`absolute -top-1.5 left-1/2 -translate-x-1/2 text-[6px] font-black ${activeModifiers.P === 'E' ? 'text-pink-300 font-bold scale-125' : 'text-slate-400/80'}`}>
                  ▲E
                </span>
                <span className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[6px] font-black ${activeModifiers.P === 'Q' ? 'text-purple-300 font-bold scale-125' : 'text-slate-400/80'}`}>
                  ▼Q
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
