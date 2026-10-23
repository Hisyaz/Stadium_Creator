/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Languages,
  Shield,
  Users,
  Settings,
  X,
  Clock,
  Sparkles,
  Gamepad2,
  Home,
} from 'lucide-react';
import { audio } from '../game/audio';
import { Language } from '../game/i18n';
import { DifficultyLevel } from '../types';

export interface PauseModalProps {
  isOpen: boolean;
  onResume: () => void;
  onResetKickoff: () => void;
  onOpenGamePlan?: () => void;
  onOpenSettings?: () => void;
  onOpenSideSelect?: () => void;
  onOpenMainMenu?: () => void;
  homeScore: number;
  awayScore: number;
  homeTeamName?: string;
  awayTeamName?: string;
  homeTeamBadge?: string;
  awayTeamBadge?: string;
  matchTimeSeconds?: number;
  currentHalf?: number;
  difficulty?: DifficultyLevel;
  currentLang?: Language;
  onToggleLanguage?: () => void;
  isHalfTime?: boolean;
  isExtraTimeHalf?: boolean;
  onStartSecondHalf?: () => void;
  onStartETSecondHalf?: () => void;
  stoppageTimeMinutes?: number;
  // Optional backwards compatibility pass-throughs
  [key: string]: any;
}

/**
 * PHASE 17.3 & PHASE 1: Streamlined 32-Bit In-Game Pause & Halftime Hub
 * - When in Halftime: prominently features [ ⏩ START 2ND HALF ] (Teams switch ends · Home kicks off)
 * - When in Pause: 3-button streamlined hub (Resume, Tactical Game Plan, Settings)
 */
export const PauseModal: React.FC<PauseModalProps> = ({
  isOpen,
  onResume,
  onResetKickoff,
  onOpenGamePlan,
  onOpenSettings,
  onOpenSideSelect,
  onOpenMainMenu,
  onOpenDetailedSettings,
  onOpenGraphicsSettings,
  homeScore,
  awayScore,
  homeTeamName = 'HOME',
  awayTeamName = 'AWAY',
  homeTeamBadge = '🛡️',
  awayTeamBadge = '⚔️',
  matchTimeSeconds = 0,
  currentHalf = 1,
  difficulty = 'easy',
  currentLang = 'en',
  onToggleLanguage,
  isHalfTime = false,
  isExtraTimeHalf = false,
  onStartSecondHalf,
  onStartETSecondHalf,
  stoppageTimeMinutes,
}) => {
  const [muted, setMuted] = React.useState(audio.getMuted());

  if (!isOpen) return null;

  const handleToggleSound = () => {
    const nextMute = audio.toggleMute();
    setMuted(nextMute);
  };

  const handleResume = () => {
    audio.playKick(0.3);
    onResume();
  };

  const handleTactics = () => {
    audio.playKick(0.3);
    if (onOpenGamePlan) {
      onOpenGamePlan();
    }
  };

  const handleSettings = () => {
    audio.playKick(0.3);
    if (onOpenSettings) {
      onOpenSettings();
    } else if (onOpenDetailedSettings) {
      onOpenDetailedSettings();
    } else if (onOpenGraphicsSettings) {
      onOpenGraphicsSettings();
    }
  };

  const minutes = Math.floor(matchTimeSeconds / 60);
  const seconds = Math.floor(matchTimeSeconds % 60);
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-xl bg-slate-900 border-2 border-amber-500/80 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.35)] overflow-hidden flex flex-col text-white font-sans">
        {/* 4 ORNATE GOLDEN CORNER BRACKETS */}
        <div className="absolute top-1 left-1.5 w-3 h-3 border-t-2 border-l-2 border-amber-400 pointer-events-none z-20" />
        <div className="absolute top-1 right-1.5 w-3 h-3 border-t-2 border-r-2 border-amber-400 pointer-events-none z-20" />
        <div className="absolute bottom-1 left-1.5 w-3 h-3 border-b-2 border-l-2 border-amber-400 pointer-events-none z-20" />
        <div className="absolute bottom-1 right-1.5 w-3 h-3 border-b-2 border-r-2 border-amber-400 pointer-events-none z-20" />

        {/* 32-BIT METALLIC RETRO ARCADE CONSOLE HEADER */}
        <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-slate-950 via-slate-800 to-slate-950 border-b-2 border-slate-700/80 shrink-0">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isHalfTime || isExtraTimeHalf ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]' : 'bg-emerald-400'} animate-pulse`} />
            <h2 className="font-['Press_Start_2P'] text-xs sm:text-sm text-amber-400 tracking-wider">
              {isHalfTime ? 'HALF TIME' : isExtraTimeHalf ? 'EXTRA TIME HALF' : 'MATCH PAUSED'}
            </h2>
          </div>

          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {isHalfTime
                ? `1ST HALF FINISHED · 45:00 ${stoppageTimeMinutes ? `(+${stoppageTimeMinutes}')` : ''}`
                : isExtraTimeHalf
                ? 'ET 1ST HALF · 105:00'
                : `HALF ${currentHalf} · ${formattedTime}`}
            </span>
          </div>
        </div>

        {/* MATCH SCOREBOARD HERO CARD */}
        <div className="p-4 sm:p-6 bg-gradient-to-b from-slate-950/90 to-slate-900 border-b border-slate-800">
          <div className="flex items-center justify-between gap-4">
            {/* Home Team */}
            <div className="flex-1 text-center min-w-0">
              <div className="w-12 h-12 mx-auto rounded-xl bg-sky-500/20 border border-sky-400/60 flex items-center justify-center text-2xl shadow-lg mb-1.5">
                {homeTeamBadge}
              </div>
              <div className="font-['Press_Start_2P'] text-[9px] sm:text-[10px] text-white truncate">
                {homeTeamName}
              </div>
              <div className="text-[8px] font-mono text-sky-400 font-bold uppercase mt-0.5">
                HOME
              </div>
            </div>

            {/* Score Centerpiece */}
            <div className="shrink-0 flex flex-col items-center px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl shadow-inner">
              <div className="font-['Press_Start_2P'] text-2xl sm:text-3xl text-amber-400 tracking-tight drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]">
                {homeScore} - {awayScore}
              </div>
              <div className="text-[8px] font-mono text-slate-400 mt-1 uppercase font-bold">
                {isHalfTime ? 'BREAK' : difficulty === 'easy' ? 'COMPETITIVE' : 'PRACTICE'}
              </div>
            </div>

            {/* Away Team */}
            <div className="flex-1 text-center min-w-0">
              <div className="w-12 h-12 mx-auto rounded-xl bg-rose-500/20 border border-rose-400/60 flex items-center justify-center text-2xl shadow-lg mb-1.5">
                {awayTeamBadge}
              </div>
              <div className="font-['Press_Start_2P'] text-[9px] sm:text-[10px] text-white truncate">
                {awayTeamName}
              </div>
              <div className="text-[8px] font-mono text-rose-400 font-bold uppercase mt-0.5">
                AWAY
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 1.3 & 17.3: STREAMLINED 3-OPTION ACTION HUB                       */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-6 space-y-3 bg-slate-900/90">
          {/* OPTION 1: START 2ND HALF / RESUME */}
          {isHalfTime ? (
            <button
              type="button"
              onClick={() => {
                audio.playKick(0.3);
                if (onStartSecondHalf) onStartSecondHalf();
                else onResume();
              }}
              className="w-full py-3.5 sm:py-4 px-5 rounded-xl border-2 border-amber-400 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-['Press_Start_2P'] text-xs sm:text-sm font-black shadow-[0_0_30px_rgba(245,158,11,0.6)] hover:shadow-[0_0_40px_rgba(245,158,11,0.8)] transition-all transform active:scale-98 flex flex-col items-center justify-center gap-1 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Play className="w-5 h-5 fill-slate-950" />
                <span>START 2ND HALF</span>
              </div>
              <span className="text-[8px] font-sans font-bold text-slate-900 tracking-normal uppercase">
                Teams switch ends · Home team kicks off
              </span>
            </button>
          ) : isExtraTimeHalf ? (
            <button
              type="button"
              onClick={() => {
                audio.playKick(0.3);
                if (onStartETSecondHalf) onStartETSecondHalf();
                else onResume();
              }}
              className="w-full py-3.5 sm:py-4 px-5 rounded-xl border-2 border-amber-400 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-['Press_Start_2P'] text-xs sm:text-sm font-black shadow-[0_0_30px_rgba(245,158,11,0.6)] hover:shadow-[0_0_40px_rgba(245,158,11,0.8)] transition-all transform active:scale-98 flex flex-col items-center justify-center gap-1 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Play className="w-5 h-5 fill-slate-950" />
                <span>START ET 2ND HALF</span>
              </div>
              <span className="text-[8px] font-sans font-bold text-slate-900 tracking-normal uppercase">
                Teams switch ends · Home kicks off
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleResume}
              className="w-full py-3.5 sm:py-4 px-5 rounded-xl border-2 border-emerald-400/80 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-['Press_Start_2P'] text-xs sm:text-sm font-black shadow-[0_0_25px_rgba(16,185,129,0.5)] hover:shadow-[0_0_35px_rgba(16,185,129,0.7)] transition-all transform active:scale-98 flex items-center justify-center gap-3 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-slate-950" />
              <span>RESUME MATCH</span>
            </button>
          )}

          {/* OPTION 2: TACTICS (GAME PLAN) */}
          <button
            type="button"
            onClick={handleTactics}
            className="w-full py-3 sm:py-3.5 px-5 rounded-xl border-2 border-amber-400/80 bg-gradient-to-r from-amber-500/20 via-yellow-500/30 to-amber-500/20 hover:from-amber-500/30 hover:to-yellow-500/40 text-amber-300 hover:text-white font-['Press_Start_2P'] text-[10px] sm:text-xs font-bold shadow-md transition-all transform active:scale-98 flex items-center justify-center gap-3 cursor-pointer"
          >
            <Users className="w-4 h-4 text-amber-400" />
            <span>TACTICAL GAME PLAN</span>
          </button>

          {/* OPTION 3: SELECT SIDE / CONTROLLER ASSIGNMENT (PHASE 1.5) */}
          <button
            type="button"
            onClick={() => {
              audio.playKick(0.3);
              if (onOpenSideSelect) onOpenSideSelect();
            }}
            className="w-full py-3 sm:py-3.5 px-5 rounded-xl border-2 border-sky-400/80 bg-gradient-to-r from-sky-500/20 via-blue-500/30 to-sky-500/20 hover:from-sky-500/30 hover:to-blue-500/40 text-sky-300 hover:text-white font-['Press_Start_2P'] text-[10px] sm:text-xs font-bold shadow-md transition-all transform active:scale-98 flex items-center justify-center gap-3 cursor-pointer"
          >
            <Gamepad2 className="w-4 h-4 text-sky-400" />
            <span>SELECT SIDE</span>
          </button>

          {/* OPTION 4: SETTINGS (UNIFIED SYSTEM SETTINGS) */}
          <button
            type="button"
            onClick={handleSettings}
            className="w-full py-3 sm:py-3.5 px-5 rounded-xl border-2 border-slate-700 hover:border-slate-600 bg-slate-950/80 hover:bg-slate-800 text-slate-200 hover:text-white font-['Press_Start_2P'] text-[10px] sm:text-xs font-bold shadow-md transition-all transform active:scale-98 flex items-center justify-center gap-3 cursor-pointer"
          >
            <Settings className="w-4 h-4 text-sky-400" />
            <span>SYSTEM SETTINGS</span>
          </button>

          {/* OPTION 5: RETURN TO MAIN MENU */}
          {onOpenMainMenu && (
            <button
              type="button"
              onClick={() => {
                audio.playKick(0.3);
                onOpenMainMenu();
              }}
              className="w-full py-2.5 sm:py-3 px-5 rounded-xl border border-slate-800 hover:border-amber-400/80 bg-slate-950/80 hover:bg-slate-900 text-slate-300 hover:text-amber-300 font-['Press_Start_2P'] text-[9px] sm:text-[10px] font-bold shadow transition-all transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Home className="w-3.5 h-3.5 text-amber-400" />
              <span>MAIN MENU</span>
            </button>
          )}
        </div>

        {/* 32-BIT BOTTOM UTILITY STRIP */}
        <div className="bg-slate-950 px-4 py-2.5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <button
            type="button"
            onClick={() => {
              audio.playKick(0.2);
              onResetKickoff();
              onResume();
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-amber-400 border border-slate-800 transition-colors text-[9px] font-mono font-bold cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESTART KICKOFF</span>
          </button>

          <div className="flex items-center gap-2">
            {onToggleLanguage && (
              <button
                type="button"
                onClick={() => {
                  audio.playKick(0.2);
                  onToggleLanguage();
                }}
                className="flex items-center gap-1 px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[9px] font-mono cursor-pointer"
              >
                <Languages className="w-3 h-3" />
                <span className="uppercase font-bold">{currentLang}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleToggleSound}
              className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 cursor-pointer"
              title={muted ? 'Unmute' : 'Mute'}
            >
              {muted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
