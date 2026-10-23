/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { GraphicsSettings, GraphicsTier, ControllerBgMode } from '../types';
import { Gamepad2, Keyboard, Smartphone, Cpu, Monitor, Check, Sparkles, Shield, ArrowRight } from 'lucide-react';
import { GRAPHICS_PRESETS } from '../game/graphicsConfig';

export type InputDeviceMethod = 'touch' | 'keyboard' | 'gamepad';

interface DeviceProfile {
  deviceType: 'mobile' | 'tablet' | 'desktop';
  hasTouch: boolean;
  hasKeyboard: boolean;
  hasGamepad: boolean;
  gamepadName?: string;
  gpuRenderer: string;
  cores: number;
  memoryGb?: number;
  dpr: number;
  recommendedInput: InputDeviceMethod;
  recommendedControllerBg: ControllerBgMode;
  recommendedGraphicsTier: GraphicsTier;
}

interface DeviceProfilerModalProps {
  isOpen: boolean;
  onConfirm: (config: {
    inputMethod: InputDeviceMethod;
    controllerBgMode: ControllerBgMode;
    graphicsSettings: GraphicsSettings;
  }) => void;
  currentGraphicsSettings: GraphicsSettings;
}

export function profileCurrentDevice(): DeviceProfile {
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const isMobile = screenWidth < 768 || (hasTouch && screenWidth < 900);
  const isTablet = hasTouch && screenWidth >= 768 && screenWidth <= 1024;
  const isDesktop = !isMobile && !isTablet;

  const deviceType: 'mobile' | 'tablet' | 'desktop' = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';

  // Gamepad Check
  let hasGamepad = false;
  let gamepadName = '';
  try {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of gamepads) {
      if (gp && gp.connected) {
        hasGamepad = true;
        gamepadName = gp.id;
        break;
      }
    }
  } catch {}

  // GPU & WebGL Capability
  let gpuRenderer = 'Standard WebGL';
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl && gl instanceof WebGLRenderingContext) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      if (ext) {
        gpuRenderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || 'Standard GPU';
      }
    }
  } catch {}

  const cores = navigator.hardwareConcurrency || 4;
  const memoryGb = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

  // Input & Controller Recommendation
  let recommendedInput: InputDeviceMethod = 'touch';
  let recommendedControllerBg: ControllerBgMode = 'solid';

  if (hasGamepad) {
    recommendedInput = 'gamepad';
    recommendedControllerBg = 'hidden'; // Hide virtual overlay when joystick connected
  } else if (isDesktop) {
    recommendedInput = 'keyboard';
    recommendedControllerBg = 'hidden'; // Hide virtual overlay when keyboard is default
  } else {
    recommendedInput = 'touch';
    recommendedControllerBg = 'solid';
  }

  // Graphics Tier Recommendation
  let recommendedGraphicsTier: GraphicsTier = 'balanced';
  const lowerGpu = gpuRenderer.toLowerCase();
  const isDedicatedHighGpu =
    lowerGpu.includes('nvidia') ||
    lowerGpu.includes('geforce') ||
    lowerGpu.includes('radeon') ||
    lowerGpu.includes('apple m') ||
    lowerGpu.includes('adreno (tm) 7') ||
    lowerGpu.includes('mali-g7');

  const isLowEndMobile =
    cores <= 4 ||
    (memoryGb !== undefined && memoryGb <= 3) ||
    lowerGpu.includes('mali-4') ||
    lowerGpu.includes('mali-g52') ||
    lowerGpu.includes('adreno 5') ||
    lowerGpu.includes('powervr');

  if (isLowEndMobile) {
    recommendedGraphicsTier = 'performance';
  } else if (isDedicatedHighGpu && cores >= 6) {
    recommendedGraphicsTier = 'high_end';
  } else {
    recommendedGraphicsTier = 'balanced';
  }

  return {
    deviceType,
    hasTouch,
    hasKeyboard: isDesktop,
    hasGamepad,
    gamepadName,
    gpuRenderer,
    cores,
    memoryGb,
    dpr,
    recommendedInput,
    recommendedControllerBg,
    recommendedGraphicsTier,
  };
}

export const DeviceProfilerModal: React.FC<DeviceProfilerModalProps> = ({
  isOpen,
  onConfirm,
  currentGraphicsSettings,
}) => {
  const profile = useMemo(() => profileCurrentDevice(), []);

  const [selectedInput, setSelectedInput] = useState<InputDeviceMethod>(profile.recommendedInput);
  const [controllerBgMode, setControllerBgMode] = useState<ControllerBgMode>(profile.recommendedControllerBg);
  const [selectedTier, setSelectedTier] = useState<GraphicsTier>(profile.recommendedGraphicsTier);

  // Poll for gamepad connection on startup
  useEffect(() => {
    const handleGp = () => {
      setSelectedInput('gamepad');
      setControllerBgMode('hidden');
    };
    window.addEventListener('gamepadconnected', handleGp);
    return () => window.removeEventListener('gamepadconnected', handleGp);
  }, []);

  if (!isOpen) return null;

  const handleProceed = () => {
    const tierConfig = GRAPHICS_PRESETS[selectedTier];
    const newSettings: GraphicsSettings = {
      ...currentGraphicsSettings,
      ...tierConfig,
      tier: selectedTier,
    };

    onConfirm({
      inputMethod: selectedInput,
      controllerBgMode,
      graphicsSettings: newSettings,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/95 backdrop-blur-md animate-fade-in select-none">
      <div className="bg-slate-900 border-2 border-amber-500/80 rounded-2xl w-full max-w-2xl max-h-[96vh] flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden">
        {/* ========================================================================= */}
        {/* 32-BIT RETRO HARDWARE PROFILER HEADER                                    */}
        {/* ========================================================================= */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 px-4 py-2.5 sm:py-3 border-b-2 border-slate-700/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-400 shadow-sm">
              <Cpu className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="font-['Press_Start_2P'] text-[10px] sm:text-xs text-amber-400 tracking-wider">
                SYSTEM PROFILER
              </h2>
              <div className="text-[8px] sm:text-[9px] font-mono text-slate-400 mt-0.5">
                Auto-detected hardware & recommended configuration
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/15 border border-emerald-500/40 rounded text-emerald-300 font-mono text-[8px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            ONLINE
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PROFILER CONTENT BODY (FITS ZERO-SCROLL)                                 */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 sm:space-y-4 bg-gradient-to-b from-slate-900 to-slate-950 text-slate-200">
          {/* HARDWARE DIAGNOSTIC SUMMARY BANNER */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-center font-mono">
            <div className="p-1.5 rounded bg-slate-900/60 border border-slate-800/80">
              <div className="text-[7.5px] text-slate-500 uppercase">DEVICE</div>
              <div className="text-[9.5px] font-bold text-amber-300 uppercase mt-0.5">{profile.deviceType}</div>
            </div>
            <div className="p-1.5 rounded bg-slate-900/60 border border-slate-800/80">
              <div className="text-[7.5px] text-slate-500 uppercase">CPU CORES</div>
              <div className="text-[9.5px] font-bold text-white mt-0.5">{profile.cores} Cores</div>
            </div>
            <div className="p-1.5 rounded bg-slate-900/60 border border-slate-800/80">
              <div className="text-[7.5px] text-slate-500 uppercase">MEMORY</div>
              <div className="text-[9.5px] font-bold text-white mt-0.5">{profile.memoryGb ? `${profile.memoryGb} GB+` : 'Standard'}</div>
            </div>
            <div className="p-1.5 rounded bg-slate-900/60 border border-slate-800/80">
              <div className="text-[7.5px] text-slate-500 uppercase">HARDWARE DPR</div>
              <div className="text-[9.5px] font-bold text-sky-400 mt-0.5">{profile.dpr}x Native</div>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* 1. INPUT METHOD & BUTTON ALLOCATION SECTION                           */}
          {/* ===================================================================== */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
            <div className="text-[9px] sm:text-[10px] font-['Press_Start_2P'] text-amber-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>1. INPUT METHOD RECOMMENDATION</span>
              <span className="text-[8px] font-mono text-emerald-400 font-bold lowercase">
                (detected: {profile.hasGamepad ? 'joystick' : profile.hasTouch ? 'touchpad' : 'keyboard'})
              </span>
            </div>

            {/* Input Selection Tiles */}
            <div className="grid grid-cols-3 gap-2 mb-2.5">
              {[
                {
                  id: 'gamepad' as InputDeviceMethod,
                  label: 'CONTROLLER',
                  icon: <Gamepad2 className="w-4 h-4 text-emerald-400" />,
                  recommended: profile.hasGamepad,
                  desc: 'Gamepad / Joystick',
                },
                {
                  id: 'keyboard' as InputDeviceMethod,
                  label: 'KEYBOARD',
                  icon: <Keyboard className="w-4 h-4 text-amber-400" />,
                  recommended: !profile.hasGamepad && profile.deviceType === 'desktop',
                  desc: 'Arrow Keys + S/A/W/D',
                },
                {
                  id: 'touch' as InputDeviceMethod,
                  label: 'TOUCHPAD',
                  icon: <Smartphone className="w-4 h-4 text-sky-400" />,
                  recommended: profile.hasTouch && !profile.hasGamepad,
                  desc: 'Virtual 32-bit Console',
                },
              ].map((m) => {
                const isSelected = selectedInput === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setSelectedInput(m.id);
                      if (m.id === 'keyboard' || m.id === 'gamepad') {
                        setControllerBgMode('hidden');
                      } else {
                        setControllerBgMode('solid');
                      }
                    }}
                    className={`p-2 rounded-lg border text-left transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-amber-500/25 border-amber-400 ring-2 ring-amber-400/50 shadow-md'
                        : 'bg-slate-900/80 hover:bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    {m.recommended && (
                      <span className="absolute top-1 right-1 px-1 py-0.2 bg-emerald-500 text-slate-950 font-mono text-[6.5px] font-black rounded uppercase">
                        SUGGESTED
                      </span>
                    )}
                    <div className="flex items-center gap-1.5 mb-1">
                      {m.icon}
                      <span className="font-['Press_Start_2P'] text-[7.5px] sm:text-[8px] text-white">
                        {m.label}
                      </span>
                    </div>
                    <div className="text-[7.5px] sm:text-[8px] font-mono text-slate-400">{m.desc}</div>
                  </button>
                );
              })}
            </div>

            {/* Suggested Key Allocations Panel */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 text-[8.5px] font-mono">
              <div className="font-bold text-amber-300 mb-1.5 uppercase tracking-wide flex items-center justify-between">
                <span>⚡ RECOMMENDED BUTTON ALLOCATION:</span>
                <span className="text-slate-400 font-normal">Standard Arcade Layout</span>
              </div>

              {selectedInput === 'gamepad' ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-slate-300">
                  <div className="p-1 rounded bg-slate-950 border border-slate-800/80">
                    <span className="text-amber-400 font-bold">✖️ / 🅰️</span>: Short Pass / Tackle
                  </div>
                  <div className="p-1 rounded bg-slate-950 border border-slate-800/80">
                    <span className="text-amber-400 font-bold">⏹️ / 🇽</span>: Shoot / Power Clear
                  </div>
                  <div className="p-1 rounded bg-slate-950 border border-slate-800/80">
                    <span className="text-amber-400 font-bold">⭕ / 🅱️</span>: Long Pass / Cross
                  </div>
                  <div className="p-1 rounded bg-slate-950 border border-slate-800/80">
                    <span className="text-amber-400 font-bold">🔺 / 🇾</span>: Through Ball / GK Rush
                  </div>
                  <div className="p-1 rounded bg-slate-950 border border-slate-800/80">
                    <span className="text-amber-400 font-bold">RT / R2</span>: Sprint Acceleration
                  </div>
                  <div className="p-1 rounded bg-slate-950 border border-slate-800/80">
                    <span className="text-amber-400 font-bold">LB / L1</span>: Ginga Skill Feint
                  </div>
                  <div className="p-1 rounded bg-slate-950 border border-slate-800/80 col-span-2">
                    <span className="text-amber-400 font-bold">Start</span>: Tactical Pause Menu
                  </div>
                </div>
              ) : selectedInput === 'keyboard' ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-slate-300">
                  <div className="p-1 rounded bg-slate-950 border border-slate-800/80">
                    <span className="text-amber-400 font-bold">Arrows</span>: Directional Movement
                  </div>
                  <div className="p-1 rounded bg-slate-950 border border-slate-800/80">
                    <span className="text-amber-400 font-bold">S Key</span>: Short Pass / Tackle
                  </div>
                  <div className="p-1 rounded bg-slate-950 border border-slate-800/80">
                    <span className="text-amber-400 font-bold">A Key</span>: Shoot / Power Clear
                  </div>
                  <div className="p-1 rounded bg-slate-950 border border-slate-800/80">
                    <span className="text-amber-400 font-bold">W Key</span>: Long Pass / Lob
                  </div>
                  <div className="p-1 rounded bg-slate-950 border border-slate-800/80">
                    <span className="text-amber-400 font-bold">D Key</span>: Cross / Sliding Tackle
                  </div>
                  <div className="p-1 rounded bg-slate-950 border border-slate-800/80">
                    <span className="text-amber-400 font-bold">Shift</span>: Sprint Pace Burst
                  </div>
                  <div className="p-1 rounded bg-slate-950 border border-slate-800/80">
                    <span className="text-amber-400 font-bold">Space / G</span>: Ginga / Player Lock
                  </div>
                  <div className="p-1 rounded bg-slate-950 border border-slate-800/80">
                    <span className="text-amber-400 font-bold">Esc</span>: Pause & Options
                  </div>
                </div>
              ) : (
                <div className="text-slate-300">
                  Responsive 32-bit on-screen arcade console stick + action buttons (Pass, Shoot, Cross, Long Pass). Pull stick slightly to walk; pull fully or double-tap to sprint.
                </div>
              )}

              {/* Hide On-Screen Controller Toggle */}
              <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between">
                <span className="text-slate-400 text-[8px] font-mono">
                  Virtual On-Screen Touch Deck Display:
                </span>
                <div className="flex items-center gap-1">
                  {(['hidden', 'solid', 'transparent'] as ControllerBgMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setControllerBgMode(mode)}
                      className={`px-2 py-0.5 rounded text-[7.5px] font-mono font-bold uppercase cursor-pointer border transition-all ${
                        controllerBgMode === mode
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {mode === 'hidden' ? 'Hide Entirely' : mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* 2. GRAPHIC QUALITY PRESET RECOMMENDATION                             */}
          {/* ===================================================================== */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
            <div className="text-[9px] sm:text-[10px] font-['Press_Start_2P'] text-amber-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>2. GRAPHIC QUALITY PRESET</span>
              <span className="text-[8px] font-mono text-emerald-400 font-bold">
                (suggested: {profile.recommendedGraphicsTier.toUpperCase()})
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                {
                  id: 'performance' as GraphicsTier,
                  name: 'PERFORMANCE',
                  tag: 'Lightweight / 60 FPS',
                  desc: 'Flat turf, zero blur, maximum frame rate for cheap phones & low-end devices.',
                  recommended: profile.recommendedGraphicsTier === 'performance',
                },
                {
                  id: 'balanced' as GraphicsTier,
                  name: 'BALANCED',
                  tag: 'Standard Arcade',
                  desc: 'Crisp pitch markings, standard shadows, authentic 90s console feel.',
                  recommended: profile.recommendedGraphicsTier === 'balanced',
                },
                {
                  id: 'high_end' as GraphicsTier,
                  name: 'HIGH',
                  tag: 'Full 32-Bit Glory',
                  desc: 'Quad-shadow floodlights, dynamic lighting, retro CRT scanline bloom.',
                  recommended: profile.recommendedGraphicsTier === 'high_end',
                },
              ].map((tier) => {
                const isSelected = selectedTier === tier.id;
                return (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setSelectedTier(tier.id)}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-amber-500/25 border-amber-400 ring-2 ring-amber-400/50 shadow-md'
                        : 'bg-slate-900/80 hover:bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    {tier.recommended && (
                      <span className="absolute top-1 right-1 px-1 py-0.2 bg-emerald-500 text-slate-950 font-mono text-[6.5px] font-black rounded uppercase">
                        SUGGESTED
                      </span>
                    )}
                    <div className="font-['Press_Start_2P'] text-[7.5px] sm:text-[8px] text-white">
                      {tier.name}
                    </div>
                    <div className="text-[8px] font-mono text-amber-300 font-bold mt-0.5">{tier.tag}</div>
                    <div className="text-[7.5px] font-mono text-slate-400 mt-1 leading-tight">{tier.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* FOOTER: CONFIRM & PROCEED TO SQUAD SELECTION                              */}
        {/* ========================================================================= */}
        <div className="bg-slate-950 px-4 py-2.5 sm:py-3 border-t-2 border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-[8px] sm:text-[9px] font-mono text-slate-400 truncate max-w-[280px] sm:max-w-none">
            Selected: <span className="text-amber-400 font-bold">{selectedInput.toUpperCase()}</span> ·{' '}
            <span className="text-emerald-400 font-bold">{selectedTier.toUpperCase()} GRAPHICS</span> ·{' '}
            Controller: <span className="text-sky-400 font-bold">{controllerBgMode.toUpperCase()}</span>
          </div>

          <button
            type="button"
            onClick={handleProceed}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-['Press_Start_2P'] text-[9px] sm:text-[10px] font-bold rounded-xl shadow-lg shadow-amber-500/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <span>PROCEED TO TEAMS</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
