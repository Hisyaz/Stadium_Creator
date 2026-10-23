import React, { useRef, useState } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Zap } from 'lucide-react';
import { KeyState } from '../types';

interface TouchControlsProps {
  keys: KeyState;
  hasBall: boolean;
  onKeyChange: (key: keyof KeyState, pressed: boolean) => void;
  onActionPress?: (action: 'pass' | 'shoot' | 'cross' | 'long_pass', modifier?: 'normal' | 'Q' | 'E') => void;
  onActionRelease?: (action: 'pass' | 'shoot' | 'cross' | 'long_pass', modifier?: 'normal' | 'Q' | 'E') => void;
  onModifierChange?: (modifier: 'normal' | 'Q' | 'E') => void;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  keys,
  hasBall,
  onKeyChange,
  onActionPress,
  onActionRelease,
  onModifierChange,
}) => {
  // Swipe gesture hold-charging state tracking (Phase 7.5.2)
  const [touchPressed, setTouchPressed] = useState<{ [key: string]: boolean }>({});
  const [activeModifiers, setActiveModifiers] = useState<{ [key: string]: 'normal' | 'Q' | 'E' }>({});
  const buttonTouchStateRef = useRef<{
    [key: string]: {
      startY: number;
      startX: number;
      pointerId: number;
      modifier: 'normal' | 'Q' | 'E';
      action: 'long_pass' | 'shoot' | 'pass' | 'cross';
    };
  }>({});

  const handleTouch = (key: keyof KeyState, pressed: boolean) => {
    onKeyChange(key, pressed);
  };

  const handleActionButtonPointerDown = (
    btnKey: 'W' | 'A' | 'S' | 'D',
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

  const handleActionButtonPointerMove = (btnKey: 'W' | 'A' | 'S' | 'D', e: React.PointerEvent) => {
    const state = buttonTouchStateRef.current[btnKey];
    if (!state || state.pointerId !== e.pointerId) return;

    const deltaY = e.clientY - state.startY;
    const deltaX = e.clientX - state.startX;
    const slideThreshold = 14;

    let newModifier: 'normal' | 'Q' | 'E' = 'normal';
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

  const handleActionButtonPointerUp = (
    btnKey: 'W' | 'A' | 'S' | 'D',
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

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-3 px-3 flex justify-between items-end select-none">
      {/* D-PAD (Arrow Keys) & Sprint */}
      <div className="pointer-events-auto flex flex-col items-center gap-1 bg-slate-950/70 p-2 rounded-2xl border border-slate-800 backdrop-blur">
        <button
          onPointerDown={() => handleTouch('ArrowUp', true)}
          onPointerUp={() => handleTouch('ArrowUp', false)}
          onPointerLeave={() => handleTouch('ArrowUp', false)}
          className={`w-11 h-11 rounded-lg flex items-center justify-center border ${
            keys.ArrowUp ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-300'
          }`}
        >
          <ArrowUp className="w-5 h-5" />
        </button>

        <div className="flex gap-1">
          <button
            onPointerDown={() => handleTouch('ArrowLeft', true)}
            onPointerUp={() => handleTouch('ArrowLeft', false)}
            onPointerLeave={() => handleTouch('ArrowLeft', false)}
            className={`w-11 h-11 rounded-lg flex items-center justify-center border ${
              keys.ArrowLeft ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <button
            onPointerDown={() => handleTouch('Shift', true)}
            onPointerUp={() => handleTouch('Shift', false)}
            onPointerLeave={() => handleTouch('Shift', false)}
            className={`w-11 h-11 rounded-lg flex flex-col items-center justify-center border ${
              keys.Shift ? 'bg-amber-500 border-amber-300 text-slate-950 font-bold' : 'bg-slate-900 border-slate-700 text-amber-400'
            }`}
            title="Sprint"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span className="text-[8px] font-bold">RUN</span>
          </button>

          <button
            onPointerDown={() => handleTouch('ArrowRight', true)}
            onPointerUp={() => handleTouch('ArrowRight', false)}
            onPointerLeave={() => handleTouch('ArrowRight', false)}
            className={`w-11 h-11 rounded-lg flex items-center justify-center border ${
              keys.ArrowRight ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        <button
          onPointerDown={() => handleTouch('ArrowDown', true)}
          onPointerUp={() => handleTouch('ArrowDown', false)}
          onPointerLeave={() => handleTouch('ArrowDown', false)}
          className={`w-11 h-11 rounded-lg flex items-center justify-center border ${
            keys.ArrowDown ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-300'
          }`}
        >
          <ArrowDown className="w-5 h-5" />
        </button>
      </div>

      {/* ACTION BUTTONS (W, A, S, D, Q, E) WITH SWIPE GESTURE HOLD-CHARGING */}
      <div className="pointer-events-auto flex flex-col items-end gap-1.5 bg-slate-950/70 p-2.5 rounded-2xl border border-slate-800 backdrop-blur">
        {/* Top row: Q (Shield / Nutmeg or Shoulder) + E (Skill / Autopass or Shirt Pull) + SPACE (Ginga) + W (Long pass / Push) */}
        <div className="w-full flex justify-between items-center gap-1.5">
          <div className="flex items-center gap-1">
            <button
              onPointerDown={() => handleTouch('KeyQ', true)}
              onPointerUp={() => handleTouch('KeyQ', false)}
              onPointerLeave={() => handleTouch('KeyQ', false)}
              className={`px-2 h-9 rounded-lg border text-xs font-mono font-bold flex flex-col items-center justify-center transition ${
                keys.KeyQ
                  ? 'bg-purple-600 border-purple-300 text-white shadow-[0_0_12px_#c084fc]'
                  : 'bg-slate-900 border-purple-800 text-purple-300'
              }`}
            >
              <span className="font-['Press_Start_2P'] text-[8px]">Q</span>
              <span className="text-[7px]">{hasBall ? 'SKILL' : 'FLAIR'}</span>
            </button>
            <button
              onPointerDown={() => handleTouch('KeyE', true)}
              onPointerUp={() => handleTouch('KeyE', false)}
              onPointerLeave={() => handleTouch('KeyE', false)}
              className={`px-2 h-9 rounded-lg border text-xs font-mono font-bold flex flex-col items-center justify-center transition ${
                keys.KeyE
                  ? 'bg-pink-600 border-pink-300 text-white shadow-[0_0_12px_#f472b6]'
                  : 'bg-slate-900 border-pink-800 text-pink-300'
              }`}
            >
              <span className="font-['Press_Start_2P'] text-[8px]">E</span>
              <span className="text-[7px]">{hasBall ? 'CHIP/STEP' : 'PULL'}</span>
            </button>
            <button
              onPointerDown={() => handleTouch('Space', true)}
              onPointerUp={() => handleTouch('Space', false)}
              onPointerLeave={() => handleTouch('Space', false)}
              className={`px-2 h-9 rounded-lg border text-xs font-mono font-bold flex flex-col items-center justify-center transition ${
                keys.Space
                  ? 'bg-amber-500 border-amber-300 text-slate-950 shadow-[0_0_12px_#f59e0b]'
                  : 'bg-slate-900 border-amber-800 text-amber-300'
              }`}
            >
              <span className="font-['Press_Start_2P'] text-[7px]">GINGA</span>
              <span className="text-[7px]">SPACE</span>
            </button>
          </div>

          <button
            onPointerDown={(e) => handleActionButtonPointerDown('W', 'long_pass', 'KeyW', 'KeyW', e)}
            onPointerMove={(e) => handleActionButtonPointerMove('W', e)}
            onPointerUp={(e) => handleActionButtonPointerUp('W', 'long_pass', 'KeyW', 'KeyW', e)}
            onPointerCancel={(e) => handleActionButtonPointerUp('W', 'long_pass', 'KeyW', 'KeyW', e)}
            className={`w-16 h-12 rounded-xl border flex flex-col items-center justify-center shadow transition ${
              touchPressed.W || keys.KeyW
                ? 'bg-amber-500 border-amber-300 text-white scale-95 shadow-[0_0_12px_#f59e0b]'
                : 'bg-slate-800 border-slate-600 text-white'
            }`}
          >
            <span className="font-['Press_Start_2P'] text-[10px] text-amber-400">W</span>
            <span className="text-[8px] font-bold text-slate-300">
              {activeModifiers.W === 'E'
                ? 'CHIP LOB'
                : activeModifiers.W === 'Q'
                ? 'SWERVE'
                : (hasBall ? 'THROUGH' : 'PUSH')}
            </span>
          </button>
        </div>

        {/* Middle row: A (Shoot / Clear) and D (Cross / Slide) */}
        <div className="flex gap-2">
          <button
            onPointerDown={(e) => handleActionButtonPointerDown('A', 'shoot', 'KeyA', 'KeyA', e)}
            onPointerMove={(e) => handleActionButtonPointerMove('A', e)}
            onPointerUp={(e) => handleActionButtonPointerUp('A', 'shoot', 'KeyA', 'KeyA', e)}
            onPointerCancel={(e) => handleActionButtonPointerUp('A', 'shoot', 'KeyA', 'KeyA', e)}
            className={`w-16 h-12 rounded-xl border flex flex-col items-center justify-center shadow transition ${
              touchPressed.A || keys.KeyA
                ? 'bg-red-600 border-red-400 text-white scale-95 shadow-[0_0_12px_#ef4444]'
                : 'bg-slate-800 border-slate-600 text-white'
            }`}
          >
            <span className="font-['Press_Start_2P'] text-[10px] text-rose-400">A</span>
            <span className="text-[8px] font-bold text-slate-300">
              {activeModifiers.A === 'E'
                ? 'CHIP SHOT'
                : activeModifiers.A === 'Q'
                ? 'CURVE SHOT'
                : (hasBall ? 'SHOOT' : 'CLEAR')}
            </span>
          </button>

          <button
            onPointerDown={(e) => handleActionButtonPointerDown('D', 'cross', 'KeyD', 'KeyD', e)}
            onPointerMove={(e) => handleActionButtonPointerMove('D', e)}
            onPointerUp={(e) => handleActionButtonPointerUp('D', 'cross', 'KeyD', 'KeyD', e)}
            onPointerCancel={(e) => handleActionButtonPointerUp('D', 'cross', 'KeyD', 'KeyD', e)}
            className={`w-16 h-12 rounded-xl border flex flex-col items-center justify-center shadow transition ${
              touchPressed.D || keys.KeyD
                ? 'bg-blue-600 border-blue-400 text-white scale-95 shadow-[0_0_12px_#3b82f6]'
                : 'bg-slate-800 border-slate-600 text-white'
            }`}
          >
            <span className="font-['Press_Start_2P'] text-[10px] text-sky-400">D</span>
            <span className="text-[8px] font-bold text-slate-300">
              {activeModifiers.D === 'E'
                ? 'FLOAT CROSS'
                : activeModifiers.D === 'Q'
                ? 'WHIP CROSS'
                : (hasBall ? 'CROSS' : 'SLIDE')}
            </span>
          </button>
        </div>

        {/* Bottom button: S (Short pass / Standing tackle) */}
        <div className="w-full flex justify-center">
          <button
            onPointerDown={(e) => handleActionButtonPointerDown('S', 'pass', 'KeyS', 'KeyS', e)}
            onPointerMove={(e) => handleActionButtonPointerMove('S', e)}
            onPointerUp={(e) => handleActionButtonPointerUp('S', 'pass', 'KeyS', 'KeyS', e)}
            onPointerCancel={(e) => handleActionButtonPointerUp('S', 'pass', 'KeyS', 'KeyS', e)}
            className={`w-16 h-12 rounded-xl border flex flex-col items-center justify-center shadow transition ${
              touchPressed.S || keys.KeyS
                ? 'bg-emerald-600 border-emerald-400 text-white scale-95 shadow-[0_0_12px_#10b981]'
                : 'bg-slate-800 border-slate-600 text-white'
            }`}
          >
            <span className="font-['Press_Start_2P'] text-[10px] text-emerald-400">S</span>
            <span className="text-[8px] font-bold text-slate-300">
              {buttonTouchStateRef.current['S']?.action === 'long_pass'
                ? 'THROUGH'
                : activeModifiers.S === 'E'
                ? 'CHIP PASS'
                : activeModifiers.S === 'Q'
                ? 'CURVE PASS'
                : (hasBall ? 'PASS' : 'TACKLE')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
