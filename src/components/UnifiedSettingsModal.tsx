/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Settings,
  Monitor,
  Gamepad2,
  Eye,
  Sliders,
  X,
  Check,
  Sparkles,
  Zap,
  Clock,
  Gauge,
  Tv,
  Target,
  Sun,
  Layers,
  ChevronRight,
  Shield,
  RotateCcw,
  Flame,
} from 'lucide-react';
import {
  GraphicsSettings,
  GraphicsTier,
  RetroFilterType,
  ControlMode,
  ControllerCustomization,
  CustomKeyBindings,
  GamepadBindings,
  HalfDurationMinutes,
  DifficultyLevel,
  PlayerIndicatorType,
  PlayerIndicatorStyle,
} from '../types';
import { HudDisplayMode } from './MatchHUD';
import { RadarZoom, MinimapMode } from './RadarMinimap';
import { ControllerBgMode, ControllerTheme } from './ArcadeConsole';
import { ALL_RETRO_FILTERS, applyPresetTier } from '../game/graphicsConfig';
import { formatKeyDisplay, formatGamepadButtonDisplay } from '../game/controllerConfig';
import { audio } from '../game/audio';

export interface UnifiedSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Tab 1: Graphics & Retro Filters
  graphicsSettings: GraphicsSettings;
  onChangeGraphicsSettings: (settings: GraphicsSettings) => void;
  // Tab 2: Controls & Controller Deck
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
  controllerBgMode?: ControllerBgMode;
  onChangeControllerBgMode?: (mode: ControllerBgMode) => void;
  controllerTheme?: ControllerTheme;
  onChangeControllerTheme?: (theme: ControllerTheme) => void;
  // Tab 3: Match & HUD Visibility
  halfDuration: HalfDurationMinutes;
  onChangeHalfDuration: (dur: HalfDurationMinutes) => void;
  gameSpeed: number;
  onChangeGameSpeed: (speed: number) => void;
  difficulty?: DifficultyLevel;
  onChangeDifficulty?: (diff: DifficultyLevel) => void;
  scoreboardMode: HudDisplayMode;
  onChangeScoreboardMode: (mode: HudDisplayMode) => void;
  specialActionTextMode: HudDisplayMode;
  onChangeSpecialActionTextMode: (mode: HudDisplayMode) => void;
  playerInfoMode: HudDisplayMode;
  onChangePlayerInfoMode: (mode: HudDisplayMode) => void;
  playerIndicatorType?: PlayerIndicatorType;
  onChangePlayerIndicatorType?: (type: PlayerIndicatorType) => void;
  playerIndicatorStyle?: PlayerIndicatorStyle;
  onChangePlayerIndicatorStyle?: (style: PlayerIndicatorStyle) => void;
  minimapMode: MinimapMode;
  onChangeMinimapMode: (mode: MinimapMode) => void;
  minimapSonar: boolean;
  onChangeMinimapSonar: (sonar: boolean) => void;
  radarZoom: RadarZoom;
  onChangeRadarZoom: (zoom: RadarZoom) => void;
  initialTab?: 'graphics' | 'controls' | 'match_hud';
}

export const UnifiedSettingsModal: React.FC<UnifiedSettingsModalProps> = ({
  isOpen,
  onClose,
  graphicsSettings,
  onChangeGraphicsSettings,
  controlMode,
  onChangeControlMode,
  controllerCustomization,
  onChangeControllerCustomization,
  keyBindings,
  onChangeKeyBindings,
  gamepadBindings,
  onChangeGamepadBindings,
  isGamepadConnected,
  gamepadName,
  controllerBgMode,
  onChangeControllerBgMode,
  controllerTheme,
  onChangeControllerTheme,
  halfDuration,
  onChangeHalfDuration,
  gameSpeed,
  onChangeGameSpeed,
  difficulty,
  onChangeDifficulty,
  scoreboardMode,
  onChangeScoreboardMode,
  specialActionTextMode,
  onChangeSpecialActionTextMode,
  playerInfoMode,
  onChangePlayerInfoMode,
  playerIndicatorType,
  onChangePlayerIndicatorType,
  playerIndicatorStyle,
  onChangePlayerIndicatorStyle,
  minimapMode,
  onChangeMinimapMode,
  minimapSonar,
  onChangeMinimapSonar,
  radarZoom,
  onChangeRadarZoom,
  initialTab = 'graphics',
}) => {
  const [activeTab, setActiveTab] = useState<'graphics' | 'controls' | 'match_hud'>(initialTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border-2 border-amber-500/60 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.25)] overflow-hidden text-white font-sans">
        {/* ========================================================================= */}
        {/* 32-BIT RETRO HEADER                                                       */}
        {/* ========================================================================= */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-800 to-slate-950 px-4 py-3 border-b-2 border-slate-700 flex items-center justify-between shrink-0 shadow-inner">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-400 shadow-md">
              <Settings className="w-4 h-4 animate-spin-slow" />
            </div>
            <div>
              <h2 className="font-['Press_Start_2P'] text-xs sm:text-sm text-amber-400 tracking-wider">
                UNIVERSAL SYSTEM SETTINGS
              </h2>
              <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                Graphics Pipeline · Arcade Controller Config · Match & HUD Matrix
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer border border-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* 32-BIT ARCADE 3-TAB CONTROLLER (Section 17.1 item 4)                      */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-1 bg-slate-950 px-4 py-2 border-b border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => {
              audio.playKick(0.15);
              setActiveTab('graphics');
            }}
            className={`px-3 py-1.5 text-[9px] sm:text-[10px] font-['Press_Start_2P'] rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'graphics'
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800 hover:border-slate-700'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>GRAPHICS & FILTERS</span>
          </button>

          <button
            type="button"
            onClick={() => {
              audio.playKick(0.15);
              setActiveTab('controls');
            }}
            className={`px-3 py-1.5 text-[9px] sm:text-[10px] font-['Press_Start_2P'] rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'controls'
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800 hover:border-slate-700'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>CONTROLS & BINDINGS</span>
          </button>

          <button
            type="button"
            onClick={() => {
              audio.playKick(0.15);
              setActiveTab('match_hud');
            }}
            className={`px-3 py-1.5 text-[9px] sm:text-[10px] font-['Press_Start_2P'] rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'match_hud'
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800 hover:border-slate-700'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>MATCH & HUD</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB BODY                                                                  */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 bg-gradient-to-b from-slate-900 to-slate-950">
          {/* TAB 1: GRAPHICS & RETRO FILTERS */}
          {activeTab === 'graphics' && (
            <div className="space-y-5 animate-fade-in">
              {/* Presets: Performance, Balanced, High-End */}
              <div>
                <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Monitor className="w-3.5 h-3.5" />
                  <span>3-TIER SCALABLE GRAPHICS PIPELINE</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    {
                      id: 'performance',
                      name: 'PERFORMANCE',
                      tag: 'Smooth 60 FPS',
                      desc: 'Optimized for low-end devices. Disables heavy post-processing & blur.',
                    },
                    {
                      id: 'balanced',
                      name: 'BALANCED',
                      tag: 'Standard Arcade',
                      desc: 'Authentic 90s console balance with high-DPI scaling & crowd flashes.',
                    },
                    {
                      id: 'high_end',
                      name: 'HIGH-END',
                      tag: 'Maximum Fidelity',
                      desc: 'Full quad-shadows, volumetric bloom, detailed pitch scuffs & retro shaders.',
                    },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        audio.playKick(0.2);
                        const updated = applyPresetTier(graphicsSettings, p.id as GraphicsTier);
                        onChangeGraphicsSettings(updated);
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        graphicsSettings.tier === p.id
                          ? 'bg-amber-500/25 border-amber-400 ring-2 ring-amber-400/50 shadow-md'
                          : 'bg-slate-950/60 hover:bg-slate-800 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-['Press_Start_2P'] text-[9px] text-white">
                          {p.name}
                        </span>
                        {graphicsSettings.tier === p.id && (
                          <Check className="w-4 h-4 text-amber-400" />
                        )}
                      </div>
                      <div className="text-[9px] font-mono text-amber-400 font-bold mb-1">
                        {p.tag}
                      </div>
                      <p className="text-[8.5px] text-slate-300 leading-relaxed">{p.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Retro Filter Selector */}
              <div>
                <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Tv className="w-3.5 h-3.5" />
                  <span>RETRO SHADERS & BROADCAST FILTERS</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ALL_RETRO_FILTERS.map((f) => {
                    const isSelected = graphicsSettings.activeFilter === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          audio.playKick(0.2);
                          onChangeGraphicsSettings({
                            ...graphicsSettings,
                            activeFilter: f.id,
                          });
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md'
                            : 'bg-slate-950/60 hover:bg-slate-800 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-base">{f.badge}</span>
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <div className="font-['Press_Start_2P'] text-[7.5px] truncate max-w-full">
                          {f.name}
                        </div>
                        <div className="text-[7.5px] opacity-80 truncate mt-0.5">{f.era}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Graphics Detail Toggles */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
                <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider mb-2">
                  INDIVIDUAL RENDERING ENGINES
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono">
                  {[
                    { key: 'quadShadows', label: 'Quad-Shadows (4 Floodlights)' },
                    { key: 'highDpi', label: 'High-DPI Retina Buffer Scaling' },
                    { key: 'volumetricLighting', label: 'Volumetric Rafter Haze & Bloom' },
                    { key: 'pitchScuffs', label: 'Persistent Dynamic Pitch Scuff Marks' },
                    { key: 'crowdFlashbulbs', label: 'Dynamic Crowd Supporter Camera Flashes' },
                  ].map((item) => {
                    const val = graphicsSettings[item.key as keyof GraphicsSettings];
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => {
                          audio.playKick(0.15);
                          onChangeGraphicsSettings({
                            ...graphicsSettings,
                            [item.key]: !val,
                          });
                        }}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer"
                      >
                        <span className="text-slate-300">{item.label}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[8px] font-black ${
                            val ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          {val ? 'ON' : 'OFF'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONTROLS & BINDINGS */}
          {activeTab === 'controls' && (
            <div className="space-y-5 animate-fade-in">
              {/* Phase 4.5.1: Controller & Side Assignment Notice (Managed strictly via Side Select) */}
              <div className="bg-slate-950/60 border border-sky-500/40 rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-inner">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-sky-500/20 border border-sky-400 flex items-center justify-center text-sky-400 shrink-0">
                    <Gamepad2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-['Press_Start_2P'] text-[9px] text-sky-300">
                      CONTROLLER & SIDE ASSIGNMENT
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5 leading-relaxed">
                      Device binding (Keyboard WASD, Arrows, Gamepads, Touch), Control Scope (All Team vs Single Player), and Cursor Change mode are authoritatively configured in the <b className="text-sky-300">SELECT SIDE</b> menu.
                    </div>
                  </div>
                </div>
              </div>

              {/* Virtual On-Screen Controller Deck Visibility */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
                <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>VIRTUAL CONTROLLER DECK DISPLAY</span>
                  {controllerBgMode === 'hidden' && (
                    <span className="text-[9px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                      HIDDEN · PURE HARDWARE INPUTS
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'solid', label: 'SOLID DECK', desc: 'Full arcade console' },
                    { id: 'transparent', label: 'TRANSPARENT', desc: 'See-through pitch' },
                    { id: 'floating', label: 'FLOATING', desc: 'Minimal sticks' },
                    { id: 'hidden', label: 'HIDE ENTIRELY', desc: 'Keyboard & Gamepad' },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => {
                        audio.playKick(0.2);
                        onChangeControllerBgMode(mode.id as ControllerBgMode);
                      }}
                      className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                        controllerBgMode === mode.id
                          ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md ring-1 ring-amber-400/50'
                          : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-['Press_Start_2P'] text-[7.5px] truncate">{mode.label}</div>
                      <div className={`text-[8.5px] font-mono mt-0.5 truncate ${controllerBgMode === mode.id ? 'text-slate-950/80 font-medium' : 'text-slate-400'}`}>
                        {mode.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Keyboard Bindings Reference */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
                <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>KEYBOARD ACTION MAPPINGS</span>
                  <span className="text-[9px] font-normal text-slate-400">Arrow keys for movement</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px] font-mono">
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 flex justify-between">
                    <span className="text-slate-400">SHORT PASS / TACKLE:</span>
                    <span className="text-amber-400 font-bold">{formatKeyDisplay(keyBindings.shortPass)}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 flex justify-between">
                    <span className="text-slate-400">SHOOT / CLEAR:</span>
                    <span className="text-amber-400 font-bold">{formatKeyDisplay(keyBindings.shoot)}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 flex justify-between">
                    <span className="text-slate-400">THROUGH BALL / GK RUSH:</span>
                    <span className="text-amber-400 font-bold">{formatKeyDisplay(keyBindings.longPass)}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 flex justify-between">
                    <span className="text-slate-400">CROSS / SLIDE:</span>
                    <span className="text-amber-400 font-bold">{formatKeyDisplay(keyBindings.cross)}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 flex justify-between">
                    <span className="text-slate-400">SPRINT / JOCKEY:</span>
                    <span className="text-amber-400 font-bold">{formatKeyDisplay(keyBindings.sprint)}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 flex justify-between">
                    <span className="text-slate-400">GINGA TRICK / CHIP:</span>
                    <span className="text-amber-400 font-bold">{formatKeyDisplay(keyBindings.skillE || 'KeyE')}</span>
                  </div>
                </div>
              </div>

              {/* Gamepad Status */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gamepad2 className="w-5 h-5 text-amber-400" />
                    <div>
                      <div className="font-['Press_Start_2P'] text-[9px] text-white">
                        {isGamepadConnected ? 'GAMEPAD CONNECTED' : 'GAMEPAD AUTO-DETECTION'}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                        {gamepadName || 'Plug in Xbox, PlayStation, or generic USB controller'}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[8.5px] font-mono font-bold ${
                      isGamepadConnected
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {isGamepadConnected ? 'ACTIVE' : 'READY'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MATCH DURATION, SPEED & HUD VISIBILITY */}
          {activeTab === 'match_hud' && (
            <div className="space-y-5 animate-fade-in">
              {/* Match Timing & Game Speed */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Half Duration */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
                  <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>HALF DURATION</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {([2, 3, 5, 10] as HalfDurationMinutes[]).map((dur) => (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => {
                          audio.playKick(0.2);
                          onChangeHalfDuration(dur);
                        }}
                        className={`py-2 text-[10px] font-['Press_Start_2P'] rounded-lg border transition-all cursor-pointer ${
                          halfDuration === dur
                            ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md'
                            : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'
                        }`}
                      >
                        {dur}m
                      </button>
                    ))}
                  </div>
                </div>

                {/* Game Speed Slider */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5" />
                      <span>GAME SPEED SLIDER</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-400 text-xs">
                      {gameSpeed}% SPEED
                    </span>
                  </div>
                  <input
                    type="range"
                    min={80}
                    max={125}
                    value={gameSpeed}
                    onChange={(e) => onChangeGameSpeed(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[8px] font-mono text-slate-400 mt-1">
                    <span>80% (Slow pace)</span>
                    <span>100% (Balanced)</span>
                    <span>125% (Turbo Arcade)</span>
                  </div>
                </div>
              </div>

              {/* Rival AI Difficulty (5 Tiers) */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-rose-400" />
                    <span>RIVAL AI DIFFICULTY</span>
                  </div>
                  <span className="font-mono font-bold text-rose-400 text-xs uppercase">
                    {difficulty}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {(['standing', 'easy', 'normal', 'elite', 'legend'] as DifficultyLevel[]).map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => {
                        audio.playKick(0.2);
                        onChangeDifficulty(diff);
                      }}
                      className={`py-2 px-1 text-[8.5px] font-['Press_Start_2P'] uppercase rounded-lg border transition-all cursor-pointer ${
                        difficulty === diff
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black border-amber-300 shadow-md'
                          : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'
                      }`}
                    >
                      {diff === 'standing' ? 'DUMMY' : diff}
                    </button>
                  ))}
                </div>
                <div className="text-[9px] font-mono text-slate-400 mt-2">
                  {difficulty === 'standing' && 'Practice Dummies: AI outfielders stand stationary for target practice.'}
                  {difficulty === 'easy' && 'Casual / Amateur: Forgiving challenge, slower press reaction, loose marking.'}
                  {difficulty === 'normal' && 'Balanced Pro: Authentic modern football, smart tactical choices, active press.'}
                  {difficulty === 'elite' && 'Elite Challenge: High-intensity counter-press, tight cover shadows, rarely makes mistakes.'}
                  {difficulty === 'legend' && 'World Class Legend: Flawless AI, lethal finishing, zero unforced errors.'}
                </div>
              </div>

              {/* HUD Visibility Modes: Scoreboard, Action Text, Player Info */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
                <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider mb-2">
                  HEADS-UP DISPLAY (HUD) VISIBILITY
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Scoreboard Mode */}
                  <div>
                    <div className="text-[10px] font-mono text-slate-300 mb-1">SCOREBOARD</div>
                    <div className="grid grid-cols-3 gap-1">
                      {(['solid', 'transparent', 'off'] as HudDisplayMode[]).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => {
                            audio.playKick(0.15);
                            onChangeScoreboardMode(mode);
                          }}
                          className={`py-1 text-[8px] font-mono font-bold uppercase rounded border cursor-pointer ${
                            scoreboardMode === mode
                              ? 'bg-amber-500 text-slate-950 border-amber-400'
                              : 'bg-slate-900 text-slate-400 border-slate-800'
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Special Action Text */}
                  <div>
                    <div className="text-[10px] font-mono text-slate-300 mb-1">ACTION BANNERS</div>
                    <div className="grid grid-cols-3 gap-1">
                      {(['solid', 'transparent', 'off'] as HudDisplayMode[]).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => {
                            audio.playKick(0.15);
                            onChangeSpecialActionTextMode(mode);
                          }}
                          className={`py-1 text-[8px] font-mono font-bold uppercase rounded border cursor-pointer ${
                            specialActionTextMode === mode
                              ? 'bg-amber-500 text-slate-950 border-amber-400'
                              : 'bg-slate-900 text-slate-400 border-slate-800'
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Player Info Card */}
                  <div>
                    <div className="text-[10px] font-mono text-slate-300 mb-1">PLAYER CARD</div>
                    <div className="grid grid-cols-3 gap-1">
                      {(['solid', 'transparent', 'off'] as HudDisplayMode[]).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => {
                            audio.playKick(0.15);
                            onChangePlayerInfoMode(mode);
                          }}
                          className={`py-1 text-[8px] font-mono font-bold uppercase rounded border cursor-pointer ${
                            playerInfoMode === mode
                              ? 'bg-amber-500 text-slate-950 border-amber-400'
                              : 'bg-slate-900 text-slate-400 border-slate-800'
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Radar Minimap Matrix */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
                <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>RADAR MINIMAP CONTROLS</span>
                  <button
                    type="button"
                    onClick={() => {
                      audio.playKick(0.15);
                      onChangeMinimapSonar(!minimapSonar);
                    }}
                    className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold border cursor-pointer ${
                      minimapSonar
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    NEON RADAR SONAR: {minimapSonar ? 'ON' : 'OFF'}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] font-mono text-slate-300 mb-1">RADAR DISPLAY</div>
                    <div className="grid grid-cols-3 gap-1">
                      {(['solid', 'transparent', 'off'] as MinimapMode[]).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => {
                            audio.playKick(0.15);
                            onChangeMinimapMode(mode);
                          }}
                          className={`py-1 text-[8px] font-mono font-bold uppercase rounded border cursor-pointer ${
                            minimapMode === mode
                              ? 'bg-amber-500 text-slate-950 border-amber-400'
                              : 'bg-slate-900 text-slate-400 border-slate-800'
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono text-slate-300 mb-1">RADAR ZOOM</div>
                    <div className="grid grid-cols-3 gap-1">
                      {(['full', 'zoom1', 'zoom2'] as RadarZoom[]).map((z) => (
                        <button
                          key={z}
                          type="button"
                          onClick={() => {
                            audio.playKick(0.15);
                            onChangeRadarZoom(z);
                          }}
                          className={`py-1 text-[8px] font-mono font-bold uppercase rounded border cursor-pointer ${
                            radarZoom === z
                              ? 'bg-amber-500 text-slate-950 border-amber-400'
                              : 'bg-slate-900 text-slate-400 border-slate-800'
                          }`}
                        >
                          {z.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* FOOTER: CONFIRM & CLOSE                                                   */}
        {/* ========================================================================= */}
        <div className="bg-slate-950 px-4 py-3 border-t-2 border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-[9px] sm:text-[10px] font-mono text-slate-400">
            Active Tier: <span className="text-amber-400 font-bold">{graphicsSettings.tier.toUpperCase()}</span> · Speed: <span className="text-emerald-400 font-bold">{gameSpeed}%</span> · Half: <span className="text-sky-400 font-bold">{halfDuration}m</span>
          </div>

          <button
            type="button"
            onClick={() => {
              audio.playKick(0.3);
              onClose();
            }}
            className="px-4 py-2 text-[10px] font-['Press_Start_2P'] bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/30 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>SAVE & CLOSE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
