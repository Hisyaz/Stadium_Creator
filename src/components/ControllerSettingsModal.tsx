/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Gamepad2,
  Keyboard,
  Sliders,
  RotateCcw,
  X,
  Check,
  Sparkles,
  Shield,
  Zap,
  Info,
  Layers,
  Move,
} from 'lucide-react';
import {
  ControlMode,
  ControllerCustomization,
  CustomKeyBindings,
  GamepadBindings,
} from '../types';
import {
  DEFAULT_CONTROLLER_CUSTOMIZATION,
  DEFAULT_KEY_BINDINGS,
  DEFAULT_GAMEPAD_BINDINGS,
  formatKeyDisplay,
  formatGamepadButtonDisplay,
} from '../game/controllerConfig';

interface ControllerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  controlMode: ControlMode;
  onChangeControlMode: (mode: ControlMode) => void;
  controllerCustomization: ControllerCustomization;
  onChangeControllerCustomization: (custom: ControllerCustomization) => void;
  keyBindings: CustomKeyBindings;
  onChangeKeyBindings: (bindings: CustomKeyBindings) => void;
  gamepadBindings: GamepadBindings;
  onChangeGamepadBindings: (bindings: GamepadBindings) => void;
  isGamepadConnected?: boolean;
  gamepadName?: string;
}

type TabType = 'buttons' | 'layout' | 'mode';

export const ControllerSettingsModal: React.FC<ControllerSettingsModalProps> = ({
  isOpen,
  onClose,
  controlMode,
  onChangeControlMode,
  controllerCustomization,
  onChangeControllerCustomization,
  keyBindings,
  onChangeKeyBindings,
  gamepadBindings,
  onChangeGamepadBindings,
  isGamepadConnected = false,
  gamepadName = '',
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('buttons');
  const [rebindingKeyAction, setRebindingKeyAction] = useState<keyof CustomKeyBindings | null>(null);
  const [rebindingGamepadAction, setRebindingGamepadAction] = useState<keyof GamepadBindings | null>(null);
  const [activeGamepadButtons, setActiveGamepadButtons] = useState<number[]>([]);

  // Listen for key press during keyboard rebinding
  useEffect(() => {
    if (!rebindingKeyAction) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Don't rebind escape; allow escape to cancel rebinding
      if (e.code === 'Escape') {
        setRebindingKeyAction(null);
        return;
      }

      onChangeKeyBindings({
        ...keyBindings,
        [rebindingKeyAction]: e.code,
      });
      setRebindingKeyAction(null);
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [rebindingKeyAction, keyBindings, onChangeKeyBindings]);

  // Poll gamepad inputs for live testing and rebinding
  useEffect(() => {
    let animId: number;
    const pollGamepad = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = gamepads[0] || gamepads[1];
      if (gp) {
        const pressed: number[] = [];
        gp.buttons.forEach((b, idx) => {
          if (b.pressed) pressed.push(idx);
        });
        setActiveGamepadButtons(pressed);

        if (rebindingGamepadAction && pressed.length > 0) {
          const chosenBtn = pressed[0];
          onChangeGamepadBindings({
            ...gamepadBindings,
            [rebindingGamepadAction]: chosenBtn,
          });
          setRebindingGamepadAction(null);
        }
      } else {
        setActiveGamepadButtons([]);
      }
      animId = requestAnimationFrame(pollGamepad);
    };

    if (isOpen) {
      animId = requestAnimationFrame(pollGamepad);
    }
    return () => cancelAnimationFrame(animId);
  }, [isOpen, rebindingGamepadAction, gamepadBindings, onChangeGamepadBindings]);

  if (!isOpen) return null;

  const actionsList: {
    keyAction: keyof CustomKeyBindings;
    gamepadAction: keyof GamepadBindings;
    label: string;
    withBallDesc: string;
    withoutBallDesc: string;
    color: string;
  }[] = [
    {
      keyAction: 'longPass',
      gamepadAction: 'longPass',
      label: 'Long Pass / Driven Through-Ball',
      withBallDesc: 'W: Driven through-ball to space (E: Chip, Q: Curve)',
      withoutBallDesc: 'W: Push foul / Shoulder charge (GK: 1v1 Star-Spread Smother)',
      color: 'text-amber-400',
    },
    {
      keyAction: 'shoot',
      gamepadAction: 'shoot',
      label: 'Shoot / Clear Volley',
      withBallDesc: 'A: Shot on goal / Placement',
      withoutBallDesc: 'A: Defensive clearance (GK: Low smother dive)',
      color: 'text-rose-400',
    },
    {
      keyAction: 'shortPass',
      gamepadAction: 'shortPass',
      label: 'Short Pass / Standing Tackle',
      withBallDesc: 'S: Ground pass to feet / Calms tempo',
      withoutBallDesc: 'S: Standing tackle / Ball pressure (GK: Sweeper sprint rush)',
      color: 'text-emerald-400',
    },
    {
      keyAction: 'cross',
      gamepadAction: 'cross',
      label: 'Cross / Slide Tackle',
      withBallDesc: 'D: Curled cross / Flank delivery',
      withoutBallDesc: 'D: Sliding tackle / Interception (GK: High dive / Top corner)',
      color: 'text-sky-400',
    },
    {
      keyAction: 'cameraFocus',
      gamepadAction: 'cameraFocus',
      label: 'Switch Camera (Pitch / Ball / Player)',
      withBallDesc: 'C: Cycle Pitch / Ball / Player Camera',
      withoutBallDesc: 'C: Cycle Pitch / Ball / Player Camera',
      color: 'text-cyan-300',
    },
    {
      keyAction: 'sprint',
      gamepadAction: 'sprint',
      label: 'Sprint / Turbo Run',
      withBallDesc: 'Shift: Sprint / Dash ahead',
      withoutBallDesc: 'Shift: Sprint recovery run',
      color: 'text-yellow-300',
    },
    {
      keyAction: 'gingaSwitch',
      gamepadAction: 'gingaSwitch',
      label: 'Ginga / Defense Switch / Tactical Guide',
      withBallDesc: 'Space: Sombrero lift & volleys',
      withoutBallDesc: 'Space: Switch defender (G: Direct Goalkeeper toggle)',
      color: 'text-cyan-400',
    },
    {
      keyAction: 'skillQ',
      gamepadAction: 'skillQ',
      label: 'Skill Q / Shield / Shoulder Hit',
      withBallDesc: 'Q: Ball shielding & Nutmeg',
      withoutBallDesc: 'Q: Body check & Shoulder hit (GK: High aerial jump catch)',
      color: 'text-purple-400',
    },
    {
      keyAction: 'skillE',
      gamepadAction: 'skillE',
      label: 'Skill E / Knuckle / Shirt Pull',
      withBallDesc: 'E: Knuckle shot & Step-overs',
      withoutBallDesc: 'E: Shirt pull tactical foul (GK: Two-fisted punch clear)',
      color: 'text-pink-400',
    },
  ];

  const handleResetKeys = () => {
    onChangeKeyBindings(DEFAULT_KEY_BINDINGS);
    onChangeGamepadBindings(DEFAULT_GAMEPAD_BINDINGS);
  };

  const handleResetLayout = () => {
    onChangeControllerCustomization(DEFAULT_CONTROLLER_CUSTOMIZATION);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[92vh] bg-[#07131e] border-2 border-amber-500 rounded-xl shadow-[0_0_50px_rgba(245,158,11,0.35),inset_0_2px_4px_rgba(255,255,255,0.08)] overflow-hidden flex flex-col">
        {/* 4 ORNATE GOLDEN CORNER BRACKETS */}
        <div className="absolute top-1 left-1.5 w-3 h-3 border-t-2 border-l-2 border-amber-400 pointer-events-none z-20" />
        <div className="absolute top-1 right-1.5 w-3 h-3 border-t-2 border-r-2 border-amber-400 pointer-events-none z-20" />
        <div className="absolute bottom-1 left-1.5 w-3 h-3 border-b-2 border-l-2 border-amber-400 pointer-events-none z-20" />
        <div className="absolute bottom-1 right-1.5 w-3 h-3 border-b-2 border-r-2 border-amber-400 pointer-events-none z-20" />

        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-[#0d2136] via-[#091522] to-[#0d2136] border-b-2 border-amber-500/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <Gamepad2 className="w-5 h-5 text-amber-400 animate-pulse" />
            <h2 className="font-['Press_Start_2P'] text-xs sm:text-sm text-amber-400 tracking-wider">
              CONTROLLER & BUTTON ASSIGNMENT
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-amber-400 text-slate-400 hover:text-white transition cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center border-b border-slate-800 bg-slate-950/70 px-4 pt-2 gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('buttons')}
            className={`flex items-center gap-2 px-3 py-2 border-b-2 font-['Press_Start_2P'] text-[9px] transition cursor-pointer ${
              activeTab === 'buttons'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>BUTTON ASSIGNMENT</span>
          </button>
          <button
            onClick={() => setActiveTab('layout')}
            className={`flex items-center gap-2 px-3 py-2 border-b-2 font-['Press_Start_2P'] text-[9px] transition cursor-pointer ${
              activeTab === 'layout'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>CUSTOMIZE ARCADE DECK</span>
          </button>
          <button
            onClick={() => setActiveTab('mode')}
            className={`flex items-center gap-2 px-3 py-2 border-b-2 font-['Press_Start_2P'] text-[9px] transition cursor-pointer ${
              activeTab === 'mode'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>CONTROL MODE (1-P / TEAM)</span>
          </button>
        </div>

        {/* TAB CONTENTS (SCROLLABLE) */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* ========================================================= */}
          {/* TAB 1: BUTTON ASSIGNMENT (KEYBOARD & GAMEPAD REMAPPING) */}
          {/* ========================================================= */}
          {activeTab === 'buttons' && (
            <div className="space-y-4">
              {/* JOYSTICK / GAMEPAD CONNECTION STATUS */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800 gap-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      isGamepadConnected
                        ? 'bg-emerald-400 shadow-[0_0_10px_#10b981] animate-pulse'
                        : 'bg-slate-600'
                    }`}
                  />
                  <div>
                    <span className="font-['Press_Start_2P'] text-[9px] text-white block">
                      {isGamepadConnected ? 'JOYSTICK / GAMEPAD CONNECTED' : 'NO JOYSTICK DETECTED'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {isGamepadConnected
                        ? gamepadName || 'Standard Gamepad Ready'
                        : 'Connect USB/Bluetooth joystick or play with keyboard / arcade console'}
                    </span>
                  </div>
                </div>

                {isGamepadConnected && (
                  <div className="flex items-center gap-1.5 text-[9px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-1 rounded border border-emerald-800/80">
                    <span>LIVE INPUTS:</span>
                    <span className="font-bold text-white">
                      {activeGamepadButtons.length > 0
                        ? activeGamepadButtons.map(b => `B${b}`).join(', ')
                        : 'IDLE'}
                    </span>
                  </div>
                )}
              </div>

              {/* REMAPPING TABLE */}
              <div className="bg-slate-950/90 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
                <div className="grid grid-cols-12 bg-slate-900/90 px-3 py-2 border-b border-slate-800 font-['Press_Start_2P'] text-[8px] text-slate-400">
                  <div className="col-span-5 sm:col-span-4">ACTION & BEHAVIOR</div>
                  <div className="col-span-4 sm:col-span-4 text-center">KEYBOARD KEY</div>
                  <div className="col-span-3 sm:col-span-4 text-right">JOYSTICK INPUT</div>
                </div>

                <div className="divide-y divide-slate-800/80">
                  {actionsList.map((item) => {
                    const currentKeyCode = keyBindings[item.keyAction];
                    const currentGamepadBtn = gamepadBindings[item.gamepadAction];
                    const isRebindingThisKey = rebindingKeyAction === item.keyAction;
                    const isRebindingThisGamepad = rebindingGamepadAction === item.gamepadAction;

                    return (
                      <div
                        key={item.keyAction}
                        className="grid grid-cols-12 items-center px-3 py-2.5 hover:bg-slate-900/40 transition"
                      >
                        {/* ACTION DETAILS */}
                        <div className="col-span-5 sm:col-span-4 space-y-0.5">
                          <span className={`font-bold text-xs ${item.color} block`}>
                            {item.label}
                          </span>
                          <span className="text-[9px] text-slate-400 block font-sans">
                            {item.withBallDesc}
                          </span>
                          <span className="text-[9px] text-slate-500 block font-sans">
                            {item.withoutBallDesc}
                          </span>
                        </div>

                        {/* KEYBOARD BINDING BUTTON */}
                        <div className="col-span-4 sm:col-span-4 flex justify-center">
                          <button
                            type="button"
                            onClick={() => {
                              setRebindingGamepadAction(null);
                              setRebindingKeyAction(item.keyAction);
                            }}
                            className={`min-w-[70px] sm:min-w-[90px] px-2 py-1.5 rounded-lg border font-mono text-xs font-bold transition cursor-pointer text-center ${
                              isRebindingThisKey
                                ? 'bg-amber-500 text-slate-950 border-amber-300 ring-2 ring-amber-400/80 animate-pulse'
                                : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-amber-300'
                            }`}
                          >
                            {isRebindingThisKey ? 'PRESS KEY...' : formatKeyDisplay(currentKeyCode)}
                          </button>
                        </div>

                        {/* GAMEPAD BINDING BUTTON */}
                        <div className="col-span-3 sm:col-span-4 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setRebindingKeyAction(null);
                              setRebindingGamepadAction(item.gamepadAction);
                            }}
                            className={`min-w-[65px] sm:min-w-[100px] px-2 py-1.5 rounded-lg border font-mono text-[10px] sm:text-xs font-semibold transition cursor-pointer text-center ${
                              isRebindingThisGamepad
                                ? 'bg-cyan-500 text-slate-950 border-cyan-300 ring-2 ring-cyan-400/80 animate-pulse'
                                : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-cyan-300'
                            }`}
                          >
                            {isRebindingThisGamepad ? 'PRESS BTN...' : formatGamepadButtonDisplay(currentGamepadBtn)}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* RESET KEYS BUTTON */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-[10px] text-slate-400 font-sans">
                  Default keyboard: <b>W</b>=Long Pass, <b>A</b>=Shoot, <b>S</b>=Short Pass, <b>D</b>=Cross, <b>Shift</b>=Sprint, <b>Space</b>=Switch/Ginga
                </span>
                <button
                  type="button"
                  onClick={handleResetKeys}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-['Press_Start_2P'] text-[8px] transition cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>RESET DEFAULTS</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: CUSTOMIZE ARCADE DECK (STICK, BUTTONS & BACKGROUND) */}
          {/* ========================================================= */}
          {activeTab === 'layout' && (
            <div className="space-y-5">
              {/* STICK POSITION & HAND LAYOUT */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2 text-slate-200 font-bold text-xs">
                    <Move className="w-4 h-4 text-amber-400" />
                    <span>JOYSTICK POSITION & SCALE</span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-400">
                    SIDE: <b className="text-amber-400">{controllerCustomization.stickSide.toUpperCase()}</b>
                  </span>
                </div>

                {/* Hand Side Toggle */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    STICK HAND ORIENTATION
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onChangeControllerCustomization({
                          ...controllerCustomization,
                          stickSide: 'left',
                        })
                      }
                      className={`py-2 px-3 rounded-lg text-center font-['Press_Start_2P'] text-[9px] border transition cursor-pointer ${
                        controllerCustomization.stickSide === 'left'
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300 ring-1 ring-amber-400'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      LEFT-HAND STICK (STANDARD)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onChangeControllerCustomization({
                          ...controllerCustomization,
                          stickSide: 'right',
                        })
                      }
                      className={`py-2 px-3 rounded-lg text-center font-['Press_Start_2P'] text-[9px] border transition cursor-pointer ${
                        controllerCustomization.stickSide === 'right'
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300 ring-1 ring-amber-400'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      RIGHT-HAND STICK (LEFTY)
                    </button>
                  </div>
                </div>

                {/* Stick Scale & Offsets */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>STICK SIZE</span>
                      <span className="font-mono text-amber-300">{Math.round(controllerCustomization.stickScale * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.80"
                      max="1.30"
                      step="0.05"
                      value={controllerCustomization.stickScale}
                      onChange={(e) =>
                        onChangeControllerCustomization({
                          ...controllerCustomization,
                          stickScale: parseFloat(e.target.value),
                        })
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>STICK OFFSET X</span>
                      <span className="font-mono text-amber-300">{controllerCustomization.stickOffsetX}px</span>
                    </div>
                    <input
                      type="range"
                      min="-40"
                      max="40"
                      step="2"
                      value={controllerCustomization.stickOffsetX}
                      onChange={(e) =>
                        onChangeControllerCustomization({
                          ...controllerCustomization,
                          stickOffsetX: parseInt(e.target.value),
                        })
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>STICK OFFSET Y</span>
                      <span className="font-mono text-amber-300">{controllerCustomization.stickOffsetY}px</span>
                    </div>
                    <input
                      type="range"
                      min="-30"
                      max="30"
                      step="2"
                      value={controllerCustomization.stickOffsetY}
                      onChange={(e) =>
                        onChangeControllerCustomization({
                          ...controllerCustomization,
                          stickOffsetY: parseInt(e.target.value),
                        })
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* BUTTONS POSITION & LAYOUT PRESET */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2 text-slate-200 font-bold text-xs">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    <span>BUTTONS POSITION & ARC LAYOUT</span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-400">
                    STYLE: <b className="text-emerald-400">{controllerCustomization.buttonsLayout.toUpperCase()}</b>
                  </span>
                </div>

                {/* Preset Layouts */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    BUTTON ARRANGEMENT PATTERN
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'diamond', label: 'DIAMOND', desc: 'Classic D-pad orientation' },
                      { id: 'arc', label: 'CURVED ARC', desc: 'Ergonomic arcade cabinet' },
                      { id: 'cluster', label: 'CLUSTER', desc: '2x2 Compact matrix' },
                    ].map((lay) => (
                      <button
                        key={lay.id}
                        type="button"
                        onClick={() =>
                          onChangeControllerCustomization({
                            ...controllerCustomization,
                            buttonsLayout: lay.id as any,
                          })
                        }
                        className={`p-2 rounded-lg text-center font-['Press_Start_2P'] text-[8px] border transition cursor-pointer flex flex-col items-center gap-1 ${
                          controllerCustomization.buttonsLayout === lay.id
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 ring-1 ring-emerald-400'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        <span>{lay.label}</span>
                        <span className="text-[7px] text-slate-500 font-sans">{lay.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Button Spacing & Offsets */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>BUTTON SPACING</span>
                      <span className="font-mono text-emerald-300">{Math.round(controllerCustomization.buttonsSpacing * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.80"
                      max="1.30"
                      step="0.05"
                      value={controllerCustomization.buttonsSpacing}
                      onChange={(e) =>
                        onChangeControllerCustomization({
                          ...controllerCustomization,
                          buttonsSpacing: parseFloat(e.target.value),
                        })
                      }
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>BUTTON OFFSET X</span>
                      <span className="font-mono text-emerald-300">{controllerCustomization.buttonsOffsetX}px</span>
                    </div>
                    <input
                      type="range"
                      min="-40"
                      max="40"
                      step="2"
                      value={controllerCustomization.buttonsOffsetX}
                      onChange={(e) =>
                        onChangeControllerCustomization({
                          ...controllerCustomization,
                          buttonsOffsetX: parseInt(e.target.value),
                        })
                      }
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>BUTTON OFFSET Y</span>
                      <span className="font-mono text-emerald-300">{controllerCustomization.buttonsOffsetY}px</span>
                    </div>
                    <input
                      type="range"
                      min="-30"
                      max="30"
                      step="2"
                      value={controllerCustomization.buttonsOffsetY}
                      onChange={(e) =>
                        onChangeControllerCustomization({
                          ...controllerCustomization,
                          buttonsOffsetY: parseInt(e.target.value),
                        })
                      }
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* CONSOLE DECK BACKGROUND SIZE & SCALE */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2 text-slate-200 font-bold text-xs">
                    <Sliders className="w-4 h-4 text-cyan-400" />
                    <span>CONTROLLER DECK BACKGROUND SIZE & SCALE</span>
                  </div>
                  <span className="text-[9px] font-mono text-cyan-400">
                    HEIGHT: {controllerCustomization.deckHeight}px
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>DECK HEIGHT</span>
                      <span className="font-mono text-cyan-300">{controllerCustomization.deckHeight}px</span>
                    </div>
                    <input
                      type="range"
                      min="110"
                      max="190"
                      step="5"
                      value={controllerCustomization.deckHeight}
                      onChange={(e) =>
                        onChangeControllerCustomization({
                          ...controllerCustomization,
                          deckHeight: parseInt(e.target.value),
                        })
                      }
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>DECK SCALE</span>
                      <span className="font-mono text-cyan-300">{Math.round(controllerCustomization.deckScale * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.85"
                      max="1.15"
                      step="0.05"
                      value={controllerCustomization.deckScale}
                      onChange={(e) =>
                        onChangeControllerCustomization({
                          ...controllerCustomization,
                          deckScale: parseFloat(e.target.value),
                        })
                      }
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>DECK OPACITY</span>
                      <span className="font-mono text-cyan-300">{Math.round(controllerCustomization.deckOpacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.30"
                      max="1.00"
                      step="0.05"
                      value={controllerCustomization.deckOpacity}
                      onChange={(e) =>
                        onChangeControllerCustomization({
                          ...controllerCustomization,
                          deckOpacity: parseFloat(e.target.value),
                        })
                      }
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* RESET LAYOUT BUTTON */}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleResetLayout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-['Press_Start_2P'] text-[8px] transition cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>RESET DECK LAYOUT</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: CONTROL MODE & MECHANICS */}
          {/* ========================================================= */}
          {activeTab === 'mode' && (
            <div className="space-y-4">
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-slate-200 font-bold text-xs">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span>PLAYER CONTROL MODE</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* FULL TEAM CONTROL */}
                  <button
                    type="button"
                    onClick={() => onChangeControlMode('full_team')}
                    className={`p-3.5 rounded-xl border text-left space-y-2 transition cursor-pointer relative ${
                      controlMode === 'full_team'
                        ? 'bg-amber-500/15 border-amber-400 ring-2 ring-amber-400/50 shadow-lg'
                        : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-['Press_Start_2P'] text-[9px] text-amber-300">
                        FULL TEAM MODE
                      </span>
                      {controlMode === 'full_team' && <Check className="w-4 h-4 text-amber-400" />}
                    </div>
                    <p className="text-[11px] text-slate-300 leading-snug">
                      Standard arcade 11v11 soccer. Automatically switches user control to the teammate closest to the ball.
                    </p>
                    <div className="bg-slate-950/60 p-2 rounded border border-slate-800 text-[10px] text-amber-200/90 font-mono">
                      <b>SPACEBAR / G BUTTON WITHOUT BALL:</b>
                      <span className="block text-slate-400">Instantly switches control to nearest teammate to ball.</span>
                    </div>
                  </button>

                  {/* 1-PLAYER CONTROL MODE */}
                  <button
                    type="button"
                    onClick={() => onChangeControlMode('one_player')}
                    className={`p-3.5 rounded-xl border text-left space-y-2 transition cursor-pointer relative ${
                      controlMode === 'one_player'
                        ? 'bg-cyan-500/15 border-cyan-400 ring-2 ring-cyan-400/50 shadow-lg'
                        : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-['Press_Start_2P'] text-[9px] text-cyan-300">
                        1-PLAYER (BE-A-PRO LOCK)
                      </span>
                      {controlMode === 'one_player' && <Check className="w-4 h-4 text-cyan-400" />}
                    </div>
                    <p className="text-[11px] text-slate-300 leading-snug">
                      Locked to your single chosen player! The camera can focus on you, and control never auto-switches away.
                    </p>
                    <div className="bg-slate-950/60 p-2 rounded border border-cyan-800/60 text-[10px] text-cyan-200 font-mono">
                      <b>SPACEBAR / G BUTTON WITHOUT BALL:</b>
                      <span className="block text-cyan-400 font-semibold">
                        Tactical Auto-Position Assist: Automatically drives your player into optimal tactical defensive cover as calculated by AI!
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* MOBILE & JOYSTICK USABILITY INFO */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-amber-400 text-[11px]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>SMART INPUT FEATURES</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  • <b>Mobile & Touch:</b> The arcade console is tailored for high-responsiveness on touch screens with slight pull = walk and extended pull = run.<br />
                  • <b>Shift Stick Visual:</b> Pressing <b>Shift</b> on keyboard visually shifts and tilts the arcade joystick into high-powered sprint stance.<br />
                  • <b>Gamepad Support:</b> Plug in an Xbox, PlayStation, or generic USB controller for automatic zero-latency native joystick gameplay!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-['Press_Start_2P'] text-[10px] font-bold shadow-lg transition active:scale-95 cursor-pointer"
          >
            SAVE & RESUME
          </button>
        </div>
      </div>
    </div>
  );
};
