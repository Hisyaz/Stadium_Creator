/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Play,
  Settings,
  Wrench,
  Users,
  Building2,
  Tv,
  Monitor,
  Gamepad2,
  Keyboard,
  Smartphone,
  Trophy,
  Compass,
  Sparkles,
  ArrowRight,
  Shield,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { TeamDefinition } from '../types/team';
import { StadiumDefinition } from '../types/stadium';
import { PlayerSlotConfig, GraphicsSettings, DifficultyLevel } from '../types';
import { audio } from '../game/audio';

export type MainMenuAction =
  | 'kick_off'
  | 'settings'
  | 'editor_teams'
  | 'editor_stadiums'
  | 'profiler';

interface MainMenuModalProps {
  isOpen: boolean;
  onAction: (action: MainMenuAction) => void;
  homeTeam: TeamDefinition;
  awayTeam: TeamDefinition;
  activeStadium?: StadiumDefinition;
  playerSlots: PlayerSlotConfig[];
  graphicsSettings?: GraphicsSettings;
  difficulty: DifficultyLevel;
  halfDurationMinutes: number;
}

export const MainMenuModal: React.FC<MainMenuModalProps> = ({
  isOpen,
  onAction,
  homeTeam,
  awayTeam,
  activeStadium,
  playerSlots,
  graphicsSettings,
  difficulty,
  halfDurationMinutes,
}) => {
  const [selectedOption, setSelectedOption] = useState<'kick_off' | 'settings' | 'editor'>('kick_off');
  const [isEditorExpanded, setIsEditorExpanded] = useState(false);

  // Keyboard navigation for authentic 32-bit console feel
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        audio.playKick(0.18);
        setSelectedOption((prev) => (prev === 'editor' ? 'settings' : prev === 'settings' ? 'kick_off' : 'editor'));
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        audio.playKick(0.18);
        setSelectedOption((prev) => (prev === 'kick_off' ? 'settings' : prev === 'settings' ? 'editor' : 'kick_off'));
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        audio.playKick(0.35);
        if (selectedOption === 'kick_off') {
          onAction('kick_off');
        } else if (selectedOption === 'settings') {
          onAction('settings');
        } else if (selectedOption === 'editor') {
          setIsEditorExpanded((prev) => !prev);
        }
      } else if (e.key === 'k' || e.key === 'K') {
        audio.playKick(0.35);
        onAction('kick_off');
      } else if (e.key === 'e' || e.key === 'E') {
        audio.playKick(0.25);
        setIsEditorExpanded(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedOption, onAction]);

  if (!isOpen) return null;

  const p1Slot = playerSlots.find((s) => s.id === 1);
  const inputDeviceLabel =
    p1Slot?.device === 'gamepad'
      ? 'GAMEPAD / JOYSTICK'
      : p1Slot?.device === 'touch'
      ? 'TOUCH CONTROLLER'
      : p1Slot?.keyboardPreset === 'wasd'
      ? 'KEYBOARD (WASD)'
      : 'KEYBOARD (ARROWS)';

  const venueName = activeStadium?.name || 'Estadio Alberto J. Armando';
  const venueCity = activeStadium?.city ? `${activeStadium.city}, ${activeStadium.country}` : 'Buenos Aires, Argentina';
  const venueFifa = activeStadium?.fifaCategory?.toUpperCase() || 'FIRST DIVISION';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 select-none animate-fadeIn">
      {/* 32-Bit Metallic Console Enclosure */}
      <div className="relative w-full max-w-4xl max-h-[96vh] h-[640px] flex flex-col rounded-2xl border-4 border-slate-700 bg-gradient-to-b from-slate-900 via-slate-950 to-black shadow-2xl overflow-hidden text-slate-100">
        
        {/* Top Header Marquee */}
        <div className="relative flex-none px-4 py-3 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b-2 border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-950/80 border border-red-600/70 text-red-400 font-mono text-[10px] tracking-widest font-black uppercase shadow-inner">
              <Tv className="w-3.5 h-3.5 animate-pulse text-red-400" />
              <span>DRAWSTAR TV</span>
            </div>
            <span className="hidden sm:inline-block text-[11px] font-mono text-cyan-400 tracking-wider font-bold">
              32-BIT SIMULATION ENGINE • VER 13.0
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-500/60 text-emerald-400 text-[10px] font-mono font-bold">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              60 FPS LOCKED
            </div>
            <button
              onClick={() => {
                audio.playKick(0.2);
                onAction('profiler');
              }}
              title="Hardware Profiler & Input Config"
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[10px] font-mono font-bold text-slate-200 hover:text-cyan-300 transition-colors flex items-center gap-1 shadow-sm"
            >
              <Monitor className="w-3 h-3 text-cyan-400" />
              <span className="hidden xs:inline">PROFILER</span>
            </button>
          </div>
        </div>

        {/* Hero Title Section */}
        <div className="relative flex-none text-center py-4 px-4 bg-gradient-to-b from-slate-900/60 to-transparent">
          <div className="inline-block px-3 py-0.5 mb-1.5 rounded-full bg-amber-500/10 border border-amber-400/40 text-amber-300 text-[9px] font-mono tracking-widest uppercase font-bold animate-pulse">
            ★ ARCADE CONSOLE EDITION ★
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-wider uppercase font-['Outfit'] bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_4px_12px_rgba(245,158,11,0.35)]">
            RETRO 11v11 FOOTBALL
          </h1>
          <p className="text-[11px] sm:text-xs font-mono text-slate-400 mt-1 tracking-widest uppercase">
            PHYSICS-GROUNDED TACTICAL SIMULATION • ZERO MAGIC • GROUNDED REALISM
          </p>
        </div>

        {/* Main Interactive Hub (Zero-Scroll 32-Bit Grid) */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3 px-3 sm:px-6 py-2 overflow-hidden items-center">
          
          {/* Left Column: 3 Primary Actions (Columns 1-7) */}
          <div className="md:col-span-7 flex flex-col justify-center space-y-2.5 sm:space-y-3">
            
            {/* OPTION 1: KICK OFF */}
            <button
              onMouseEnter={() => {
                if (selectedOption !== 'kick_off') audio.playKick(0.12);
                setSelectedOption('kick_off');
              }}
              onClick={() => {
                audio.playKick(0.4);
                onAction('kick_off');
              }}
              className={`group relative text-left w-full p-3.5 sm:p-4 rounded-xl border-2 transition-all duration-200 shadow-lg ${
                selectedOption === 'kick_off'
                  ? 'border-amber-400 bg-gradient-to-r from-amber-950/80 via-slate-900 to-slate-900 ring-2 ring-amber-400/50 scale-[1.02]'
                  : 'border-slate-700 bg-slate-900/90 hover:border-slate-500 hover:bg-slate-850'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg border flex items-center justify-center ${
                    selectedOption === 'kick_off'
                      ? 'bg-amber-500 border-amber-300 text-slate-950 shadow-md'
                      : 'bg-slate-800 border-slate-600 text-amber-400'
                  }`}>
                    <Play className="w-5 h-5 fill-current" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-['Outfit'] font-black text-base sm:text-lg tracking-wider text-white uppercase group-hover:text-amber-300 transition-colors">
                        KICK OFF
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 text-[9px] font-mono font-bold uppercase">
                        PRIMARY
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono tracking-wide mt-0.5">
                      Sides → Starting XI → Captain Presentation → Matchday
                    </p>
                  </div>
                </div>
                <ArrowRight className={`w-5 h-5 transition-transform duration-200 ${
                  selectedOption === 'kick_off' ? 'text-amber-400 translate-x-1' : 'text-slate-600'
                }`} />
              </div>
            </button>

            {/* OPTION 2: SETTINGS */}
            <button
              onMouseEnter={() => {
                if (selectedOption !== 'settings') audio.playKick(0.12);
                setSelectedOption('settings');
              }}
              onClick={() => {
                audio.playKick(0.3);
                onAction('settings');
              }}
              className={`group relative text-left w-full p-3 sm:p-3.5 rounded-xl border-2 transition-all duration-200 shadow-md ${
                selectedOption === 'settings'
                  ? 'border-cyan-400 bg-gradient-to-r from-cyan-950/70 via-slate-900 to-slate-900 ring-2 ring-cyan-400/40 scale-[1.01]'
                  : 'border-slate-700 bg-slate-900/80 hover:border-slate-500 hover:bg-slate-850'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg border flex items-center justify-center ${
                    selectedOption === 'settings'
                      ? 'bg-cyan-500 border-cyan-300 text-slate-950 shadow-md'
                      : 'bg-slate-800 border-slate-600 text-cyan-400'
                  }`}>
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-['Outfit'] font-black text-base tracking-wider text-white uppercase group-hover:text-cyan-300 transition-colors">
                        SETTINGS
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono tracking-wide mt-0.5">
                      Graphics (CRT/VHS), Controls & Custom Binds, Match Rules
                    </p>
                  </div>
                </div>
                <ArrowRight className={`w-5 h-5 transition-transform duration-200 ${
                  selectedOption === 'settings' ? 'text-cyan-400 translate-x-1' : 'text-slate-600'
                }`} />
              </div>
            </button>

            {/* OPTION 3: EDITOR PORTAL */}
            <div className={`relative rounded-xl border-2 transition-all duration-200 shadow-md overflow-hidden ${
              selectedOption === 'editor'
                ? 'border-purple-400 bg-gradient-to-r from-purple-950/70 via-slate-900 to-slate-900 ring-2 ring-purple-400/40'
                : 'border-slate-700 bg-slate-900/80 hover:border-slate-500'
            }`}>
              <button
                onMouseEnter={() => {
                  if (selectedOption !== 'editor') audio.playKick(0.12);
                  setSelectedOption('editor');
                }}
                onClick={() => {
                  audio.playKick(0.25);
                  setIsEditorExpanded(!isEditorExpanded);
                }}
                className="w-full p-3 sm:p-3.5 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg border flex items-center justify-center ${
                    selectedOption === 'editor'
                      ? 'bg-purple-500 border-purple-300 text-slate-950 shadow-md'
                      : 'bg-slate-800 border-slate-600 text-purple-400'
                  }`}>
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-['Outfit'] font-black text-base tracking-wider text-white uppercase hover:text-purple-300 transition-colors">
                        EDITOR PORTAL
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[9px] font-mono font-bold uppercase">
                        2 MODES
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono tracking-wide mt-0.5">
                      Tactical Game Plans, Starting XI & Stadium Inspector
                    </p>
                  </div>
                </div>
                <div className="text-xs font-mono text-purple-300 font-bold">
                  {isEditorExpanded ? '▲ CLOSE' : '▼ OPEN'}
                </div>
              </button>

              {/* Sub-Portal 2 Options */}
              {isEditorExpanded && (
                <div className="px-3 pb-3 pt-1 border-t border-purple-800/40 bg-purple-950/20 grid grid-cols-2 gap-2 animate-fadeIn">
                  <button
                    onClick={() => {
                      audio.playKick(0.3);
                      onAction('editor_teams');
                    }}
                    className="p-2.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-purple-900/60 hover:border-purple-400 text-left transition-all group flex flex-col justify-between"
                  >
                    <div className="flex items-center gap-1.5 text-purple-300 font-bold text-xs font-mono">
                      <Users className="w-3.5 h-3.5" />
                      <span>TEAMS</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono mt-1">
                      Formations, Playstyles & Home Venues
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      audio.playKick(0.3);
                      onAction('editor_stadiums');
                    }}
                    className="p-2.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-purple-900/60 hover:border-purple-400 text-left transition-all group flex flex-col justify-between"
                  >
                    <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-xs font-mono">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>STADIUMS</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono mt-1">
                      Venues, Stand Grades, Dugouts & FIFA Category
                    </span>
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Matchday Showcase Card (Columns 8-12) */}
          <div className="md:col-span-5 flex flex-col h-full justify-center">
            <div className="p-4 rounded-xl border border-slate-700/80 bg-slate-900/90 shadow-xl flex flex-col space-y-3">
              
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  MATCHDAY SHOWCASE
                </span>
                <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold">
                  {difficulty.toUpperCase()} AI
                </span>
              </div>

              {/* Matchup Teams Banner */}
              <div className="grid grid-cols-2 gap-2 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                {/* Home Team */}
                <div className="flex flex-col items-center text-center p-1.5 rounded border border-slate-800/80 bg-slate-900/60">
                  <div className="text-2xl mb-1">{homeTeam.badge?.icon || '⚽'}</div>
                  <span className="font-['Outfit'] font-black text-xs text-white uppercase truncate w-full">
                    {homeTeam.name}
                  </span>
                  <span className="text-[9px] font-mono text-amber-400 uppercase font-bold mt-0.5">
                    HOME (1P)
                  </span>
                </div>

                {/* Away Team */}
                <div className="flex flex-col items-center text-center p-1.5 rounded border border-slate-800/80 bg-slate-900/60">
                  <div className="text-2xl mb-1">{awayTeam.badge?.icon || '⚽'}</div>
                  <span className="font-['Outfit'] font-black text-xs text-white uppercase truncate w-full">
                    {awayTeam.name}
                  </span>
                  <span className="text-[9px] font-mono text-cyan-400 uppercase font-bold mt-0.5">
                    AWAY (CPU)
                  </span>
                </div>
              </div>

              {/* Venue Preview Details */}
              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] font-mono space-y-1.5">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-500 font-bold">VENUE:</span>
                  <span className="text-amber-300 font-bold truncate max-w-[170px]">{venueName}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-slate-500">LOCATION:</span>
                  <span className="truncate max-w-[170px]">{venueCity}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-slate-500">FIFA RATING:</span>
                  <span className="text-cyan-400 font-bold uppercase">{venueFifa}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-slate-500">CAPACITY:</span>
                  <span className="text-white font-bold">{activeStadium?.capacity ? activeStadium.capacity.toLocaleString() : '57,200'}</span>
                </div>
              </div>

              {/* Active Controller Profile Pill */}
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-950/90 border border-slate-800 text-[10px] font-mono">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Gamepad2 className="w-3.5 h-3.5 text-cyan-400" />
                  1P INPUT:
                </span>
                <span className="text-cyan-300 font-bold tracking-wide">{inputDeviceLabel}</span>
              </div>

            </div>
          </div>

        </div>

        {/* Bottom Status Bar */}
        <div className="flex-none px-4 py-2 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-t-2 border-slate-800 flex flex-wrap items-center justify-between text-[10px] font-mono text-slate-400">
          <div className="flex items-center gap-3">
            <span className="text-amber-400 font-bold">NAVIGATION:</span>
            <span>[▲ / ▼] SELECT</span>
            <span>[ENTER] CONFIRM</span>
            <span>[K] KICK OFF</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">HALVES:</span>
            <span className="text-slate-200 font-bold">{halfDurationMinutes}M SIMULATED</span>
            <span className="text-slate-700">|</span>
            <span className="text-slate-500">GRAPHICS:</span>
            <span className="text-emerald-400 font-bold uppercase">{graphicsSettings?.tier || 'HIGH'}</span>
          </div>
        </div>

      </div>
    </div>
  );
};
