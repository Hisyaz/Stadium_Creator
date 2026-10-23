/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Monitor,
  Sliders,
  Tv,
  Sparkles,
  Zap,
  CheckCircle2,
  Lock,
  Unlock,
  Eye,
  Camera,
  Layers,
  Flame,
  Sun,
  Shield,
  X,
} from 'lucide-react';
import { GraphicsSettings, GraphicsTier, RetroFilterType } from '../types';
import { ALL_RETRO_FILTERS, applyPresetTier, unlockAllRetroFilters } from '../game/graphicsConfig';

interface GraphicsSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GraphicsSettings;
  onChangeSettings: (settings: GraphicsSettings) => void;
}

export const GraphicsSettingsModal: React.FC<GraphicsSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onChangeSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'filters'>('presets');

  if (!isOpen) return null;

  const handleSelectPreset = (tier: GraphicsTier) => {
    const updated = applyPresetTier(settings, tier);
    onChangeSettings(updated);
  };

  const handleToggleLever = (key: keyof Omit<GraphicsSettings, 'tier' | 'activeFilter' | 'unlockedFilters'>) => {
    const updated = {
      ...settings,
      [key]: !settings[key],
    };
    onChangeSettings(updated);
  };

  const handleSelectFilter = (filterId: RetroFilterType) => {
    const updated = {
      ...settings,
      activeFilter: filterId,
    };
    onChangeSettings(updated);
  };

  const handleUnlockAll = () => {
    const updated = unlockAllRetroFilters(settings);
    onChangeSettings(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-2xl max-h-[92vh] bg-[#07131e] border-2 border-amber-500 rounded-xl shadow-[0_0_50px_rgba(245,158,11,0.35),inset_0_2px_4px_rgba(255,255,255,0.08)] overflow-hidden flex flex-col">
        {/* 4 ORNATE GOLDEN CORNER BRACKETS */}
        <div className="absolute top-1 left-1.5 w-3 h-3 border-t-2 border-l-2 border-amber-400 pointer-events-none z-20" />
        <div className="absolute top-1 right-1.5 w-3 h-3 border-t-2 border-r-2 border-amber-400 pointer-events-none z-20" />
        <div className="absolute bottom-1 left-1.5 w-3 h-3 border-b-2 border-l-2 border-amber-400 pointer-events-none z-20" />
        <div className="absolute bottom-1 right-1.5 w-3 h-3 border-b-2 border-r-2 border-amber-400 pointer-events-none z-20" />

        {/* MODAL HEADER */}
        <div className="p-3.5 sm:p-4 bg-gradient-to-r from-[#0c2238] via-[#102a45] to-[#0c2238] border-b-2 border-amber-500/80 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <Monitor className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="font-['Press_Start_2P'] text-xs sm:text-sm text-white tracking-wider flex items-center gap-2">
                <span>GRAPHICS & RETRO FILTERS</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/50">
                  PHASE 9
                </span>
              </h2>
              <p className="text-[10px] text-amber-200/70 font-mono tracking-tight mt-0.5">
                Scalable 3-tier graphics pipeline • Zero-lag hardware filters
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#0f2842] border border-amber-500/60 hover:border-amber-400 text-slate-300 hover:text-white transition cursor-pointer shadow-sm"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center border-b border-slate-800 bg-slate-950/90 px-4 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('presets')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'presets'
                ? 'border-amber-400 text-amber-400 bg-amber-500/10 rounded-t'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>GRAPHICS TIERS & LEVERS</span>
          </button>
          <button
            onClick={() => setActiveTab('filters')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'filters'
                ? 'border-amber-400 text-amber-400 bg-amber-500/10 rounded-t'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>RETRO FILTERS SUITE ({ALL_RETRO_FILTERS.length})</span>
            {settings.activeFilter !== 'none' && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
            )}
          </button>
        </div>

        {/* SCROLLABLE MODAL CONTENT */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto max-h-[calc(92vh-130px)]">
          {activeTab === 'presets' ? (
            <>
              {/* MASTER TIER PRESETS */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-['Press_Start_2P'] text-[10px] text-amber-400">
                    ONE-CLICK MASTER PRESETS
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                    ACTIVE TIER: <b className="text-amber-400 uppercase">{settings.tier.replace('_', ' ')}</b>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* PERFORMANCE */}
                  <button
                    onClick={() => handleSelectPreset('performance')}
                    className={`p-3 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between ${
                      settings.tier === 'performance'
                        ? 'bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500/50 shadow-lg'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-['Press_Start_2P'] text-[9px] text-emerald-400">
                          PERFORMANCE
                        </span>
                        {settings.tier === 'performance' && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        )}
                      </div>
                      <span className="text-[9px] font-mono text-emerald-300/80 block mb-1.5">
                        Fluidity & Battery Saver
                      </span>
                      <p className="text-[10px] text-slate-400 leading-tight">
                        Locked 1.0 DPR, flat simplified shadows, disabled canvas blur, static crowd, zero particle overhead. Locked 60 FPS on older phones.
                      </p>
                    </div>
                  </button>

                  {/* BALANCED */}
                  <button
                    onClick={() => handleSelectPreset('balanced')}
                    className={`p-3 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between ${
                      settings.tier === 'balanced'
                        ? 'bg-amber-950/40 border-amber-500 ring-1 ring-amber-500/50 shadow-lg'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-['Press_Start_2P'] text-[9px] text-amber-400">
                          BALANCED
                        </span>
                        {settings.tier === 'balanced' && (
                          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                        )}
                      </div>
                      <span className="text-[9px] font-mono text-amber-300/80 block mb-1.5">
                        Default Vector Standard
                      </span>
                      <p className="text-[10px] text-slate-400 leading-tight">
                        Dynamic altitude-scaled shadows, cylinder mower stripes with bevel depressions, sliding turf divots, 3D goal nets.
                      </p>
                    </div>
                  </button>

                  {/* HIGH-END */}
                  <button
                    onClick={() => handleSelectPreset('high_end')}
                    className={`p-3 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between ${
                      settings.tier === 'high_end'
                        ? 'bg-purple-950/40 border-purple-500 ring-1 ring-purple-500/50 shadow-lg'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-['Press_Start_2P'] text-[9px] text-purple-400">
                          HIGH-END
                        </span>
                        {settings.tier === 'high_end' && (
                          <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                        )}
                      </div>
                      <span className="text-[9px] font-mono text-purple-300/80 block mb-1.5">
                        Atmosphere & Showcase
                      </span>
                      <p className="text-[10px] text-slate-400 leading-tight">
                        4-Floodlight Quad Shadows, Cleat AO, persistent pitch gouges, High-DPI Super-Sampling, floodlight bloom, crowd flashes & vapor trails.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* GRANULAR GRAPHICAL LEVERS */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-['Press_Start_2P'] text-[10px] text-amber-400">
                    FINE-GRAINED RENDERING LEVERS
                  </span>
                  <span className="text-[9px] font-mono text-slate-400">
                    Custom overrides active immediately
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Quad Shadows */}
                  <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                        <Sun className="w-3.5 h-3.5 text-amber-400" />
                        <span>4-Floodlight Quad Shadows</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        4 projected multi-angle shadows from corner stadium towers.
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggleLever('quadShadows')}
                      className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold border cursor-pointer transition ${
                        settings.quadShadows
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {settings.quadShadows ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {/* Ambient Occlusion */}
                  <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                        <Layers className="w-3.5 h-3.5 text-sky-400" />
                        <span>Cleat Contact AO</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Soft ambient occlusion contact discs beneath player boots.
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggleLever('ambientOcclusion')}
                      className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold border cursor-pointer transition ${
                        settings.ambientOcclusion
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {settings.ambientOcclusion ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {/* Dynamic Pitch Scuffs */}
                  <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                        <Flame className="w-3.5 h-3.5 text-orange-400" />
                        <span>Dynamic Pitch Scuffs</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Slide tackle gouges and skid marks persist on turf for the half.
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggleLever('pitchScuffs')}
                      className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold border cursor-pointer transition ${
                        settings.pitchScuffs
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {settings.pitchScuffs ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {/* High-DPI Super-Sampling */}
                  <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                        <Monitor className="w-3.5 h-3.5 text-emerald-400" />
                        <span>High-DPI Super-Sampling</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Renders at native device pixel ratio (up to 2.0x DPR).
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggleLever('highDpi')}
                      className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold border cursor-pointer transition ${
                        settings.highDpi
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {settings.highDpi ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {/* Volumetric Stadium Lighting */}
                  <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                        <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                        <span>Volumetric Bloom & Haze</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Atmospheric floodlight bloom radiating from stadium rafters.
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggleLever('volumetricLighting')}
                      className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold border cursor-pointer transition ${
                        settings.volumetricLighting
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {settings.volumetricLighting ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {/* Crowd Flashbulbs */}
                  <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                        <Camera className="w-3.5 h-3.5 text-blue-400" />
                        <span>Crowd Camera Flashbulbs</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Dynamic camera flashes pop in the stands on big moments.
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggleLever('crowdFlashbulbs')}
                      className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold border cursor-pointer transition ${
                        settings.crowdFlashbulbs
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {settings.crowdFlashbulbs ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {/* Elastic Net Springs */}
                  <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                        <Zap className="w-3.5 h-3.5 text-rose-400" />
                        <span>Elastic Net Spring Physics</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Spring-mesh grid deformation with wave ripple decay on shots.
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggleLever('netSpringPhysics')}
                      className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold border cursor-pointer transition ${
                        settings.netSpringPhysics
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {settings.netSpringPhysics ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {/* Shot Vapor Trails */}
                  <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                        <Zap className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Supersonic Shot Vapor Trails</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Aerodynamic vapor condensation trail behind power strikes.
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggleLever('powerVaporTrails')}
                      className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold border cursor-pointer transition ${
                        settings.powerVaporTrails
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {settings.powerVaporTrails ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* RETRO FILTERS TAB */
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                <div>
                  <span className="font-['Press_Start_2P'] text-[10px] text-amber-400 block mb-1">
                    UNLOCKABLE RETRO FILTERS
                  </span>
                  <p className="text-[10px] text-slate-400">
                    GPU-composited CSS hardware layers (0 CPU lag, locked 60 FPS).
                  </p>
                </div>
                <button
                  onClick={handleUnlockAll}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500 text-amber-300 text-[10px] font-mono font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Unlock className="w-3 h-3 text-amber-400" />
                  <span>UNLOCK ALL</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ALL_RETRO_FILTERS.map((f) => {
                  const isUnlocked = true; // All retro filters available as requested
                  const isActive = settings.activeFilter === f.id;

                  return (
                    <div
                      key={f.id}
                      onClick={() => isUnlocked && handleSelectFilter(f.id)}
                      className={`p-3.5 rounded-xl border transition flex flex-col justify-between ${
                        isActive
                          ? 'bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/50 shadow-lg'
                          : isUnlocked
                          ? 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900 cursor-pointer text-slate-300'
                          : 'bg-slate-950/60 border-slate-900 opacity-60 text-slate-500'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span
                            className={`font-['Press_Start_2P'] text-[9px] ${
                              isActive ? 'text-amber-400' : isUnlocked ? 'text-slate-200' : 'text-slate-500'
                            }`}
                          >
                            {f.name}
                          </span>
                          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-slate-300 font-bold">
                            {f.badge}
                          </span>
                        </div>
                        <span className="text-[9px] font-mono text-amber-300/80 block mb-1">
                          {f.era}
                        </span>
                        <p className="text-[10px] text-slate-400 leading-snug">
                          {f.description}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                        <span className="text-[9px] font-mono text-slate-400">
                          {isUnlocked ? (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <Unlock className="w-2.5 h-2.5" /> UNLOCKED
                            </span>
                          ) : (
                            <span className="text-rose-400 flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" /> {f.achievementCondition}
                            </span>
                          )}
                        </span>

                        <button
                          disabled={!isUnlocked}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isUnlocked) handleSelectFilter(f.id);
                          }}
                          className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition ${
                            isActive
                              ? 'bg-amber-500 text-slate-950 font-black'
                              : isUnlocked
                              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer'
                              : 'bg-slate-900 text-slate-600 cursor-not-allowed'
                          }`}
                        >
                          {isActive ? 'ACTIVE' : 'SELECT'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-400">
              FILTER: <b className="text-amber-400 uppercase">{settings.activeFilter.replace('_', ' ')}</b>
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              • TIER: <b className="text-emerald-400 uppercase">{settings.tier.replace('_', ' ')}</b>
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-['Press_Start_2P'] text-[9px] font-black transition cursor-pointer shadow-md active:scale-95"
          >
            CONFIRM & PLAY
          </button>
        </div>
      </div>
    </div>
  );
};
