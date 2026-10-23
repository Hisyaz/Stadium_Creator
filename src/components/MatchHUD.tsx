/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MatchScore, MatchPhase, Player } from '../types';
import { TeamDefinition } from '../types/team';
import { HOME_KIT, AWAY_KIT } from '../game/constants';
import { Tv, Radio, Sparkles, Activity, Star } from 'lucide-react';
import { PlayerRatingsEngine } from '../game/playerRatings';

export type HudDisplayMode = 'solid' | 'transparent' | 'off';

interface MatchHUDProps {
  score: MatchScore;
  matchTimeSeconds: number;
  matchPhase: MatchPhase;
  bannerMessage: string | null;
  controlledPlayer?: Player;
  controlledPlayerRating?: number;
  scoreboardMode?: HudDisplayMode;
  specialActionTextMode?: HudDisplayMode;
  playerInfoMode?: HudDisplayMode;
  onOpenPreMatch?: () => void;
  onOpenPresentation?: () => void;
  onOpenGraphicsSettings?: () => void;
  homeTeam?: TeamDefinition;
  awayTeam?: TeamDefinition;
  stoppageTimeDisplay?: string | null;
  currentHalf?: number;
  currentPeriod?: string;
}

export const MatchHUD: React.FC<MatchHUDProps> = ({
  score,
  matchTimeSeconds,
  bannerMessage,
  controlledPlayer,
  controlledPlayerRating = 6.0,
  scoreboardMode = 'solid',
  specialActionTextMode = 'solid',
  playerInfoMode = 'solid',
  onOpenPreMatch,
  onOpenPresentation,
  onOpenGraphicsSettings,
  homeTeam,
  awayTeam,
  stoppageTimeDisplay,
  currentHalf = 1,
  currentPeriod = '1st_half',
}) => {
  // Format match clock (e.g. 45:00)
  const minutes = Math.floor(matchTimeSeconds / 60);
  const seconds = Math.floor(matchTimeSeconds % 60);
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  const halfText =
    currentPeriod === 'extra_time_1'
      ? 'ET 1'
      : currentPeriod === 'extra_time_2'
      ? 'ET 2'
      : currentPeriod === 'penalty_shootout'
      ? 'PENS'
      : currentHalf === 2 || minutes >= 45
      ? '2ND HALF'
      : '1ST HALF';

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-2 sm:p-3.5 select-none z-20">
      {/* ======================================================== */}
      {/* ======================================================== */}
      {/* 1. TOP ROW: SCOREBOARD (LEFT) & DRAWSTAR TV LOGO (RIGHT) */}
      {/* ======================================================== */}
      <div className="flex items-start justify-between w-full pointer-events-none">
        {scoreboardMode !== 'off' ? (
          <div
            className={`pointer-events-auto flex flex-col rounded-lg overflow-hidden border-2 transition-all duration-200 ${
              scoreboardMode === 'solid'
                ? 'border-amber-500/90 shadow-[0_8px_25px_rgba(0,0,0,0.85),0_0_12px_rgba(245,158,11,0.25)] bg-[#07131e]'
                : 'border-amber-500/60 shadow-[0_4px_16px_rgba(0,0,0,0.7)] bg-[#07131e]/70 backdrop-blur-md'
            }`}
          >
            {/* TOP 90s TV BROADCAST BUG / CHANNEL BANNER */}
            <div
              className={`flex items-center justify-between px-2.5 py-0.5 border-b ${
                scoreboardMode === 'solid'
                  ? 'bg-gradient-to-r from-[#0c2238] via-[#102a45] to-[#0c2238] border-amber-500/50'
                  : 'bg-black/40 border-amber-500/40'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Tv className="w-2.5 h-2.5 text-amber-400" />
                <span className="font-['Press_Start_2P'] text-[6px] sm:text-[7px] text-amber-400 font-bold tracking-wider uppercase">
                  MATCHDAY
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_4px_#f43f5e]" />
                <span className="font-['Press_Start_2P'] text-[6px] text-rose-400 font-bold tracking-tighter">
                  LIVE
                </span>
              </div>
            </div>

            {/* MAIN 32-BIT BEVELED SCOREBOARD DECK */}
            <div className="relative flex items-stretch">
              {/* CRT SCANLINE OVERLAY */}
              <div
                className="absolute inset-0 pointer-events-none opacity-15 z-10"
                style={{
                  backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.2) 1px, transparent 1px)',
                  backgroundSize: '100% 2px',
                }}
              />

              {/* HOME TEAM MODULE */}
              <div
                className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 border-r-2 border-amber-500/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)] ${
                  scoreboardMode === 'solid'
                    ? 'bg-gradient-to-b from-[#0e3c75] to-[#082348]'
                    : 'bg-blue-950/60'
                }`}
                style={homeTeam ? { backgroundColor: homeTeam.kit.primaryColor + 'cc' } : undefined}
              >
                {/* Home Team Badge */}
                <div className="relative flex items-center justify-center">
                  <span
                    className="w-4 h-4 rounded-full ring-1.5 ring-white/80 shadow-sm flex items-center justify-center text-[7px] font-black text-white font-['Press_Start_2P']"
                    style={{ backgroundColor: homeTeam?.badge?.bg || '#0055b8' }}
                  >
                    {homeTeam?.badge?.icon || homeTeam?.badge?.text || 'H'}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-['Press_Start_2P'] text-[9px] sm:text-[10px] font-bold text-white tracking-wider drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                    {homeTeam?.shortName || HOME_KIT.shortName}
                  </span>
                  <span className="text-[6px] text-blue-200 uppercase font-mono tracking-tighter hidden sm:inline truncate max-w-[65px]">
                    {homeTeam?.country || 'ALL-STARS'}
                  </span>
                </div>
                {/* Score Digit */}
                <div className="ml-1 sm:ml-2 px-1.5 py-0.5 rounded bg-black/60 border border-amber-500/40 shadow-inner flex items-center justify-center min-w-[20px] sm:min-w-[24px]">
                  <span className="font-['Press_Start_2P'] text-xs sm:text-sm font-black text-amber-400 drop-shadow-[0_2px_0_rgba(0,0,0,1)]">
                    {score.home}
                  </span>
                </div>
              </div>

              {/* BROADCAST MATCH CLOCK & HALF PILLAR */}
              <div
                className={`flex flex-col items-center justify-center px-2.5 sm:px-3.5 py-1 border-r-2 border-amber-500/60 min-w-[68px] sm:min-w-[80px] ${
                  scoreboardMode === 'solid'
                    ? 'bg-gradient-to-b from-[#081524] to-[#040b12]'
                    : 'bg-black/60'
                }`}
              >
                {/* Digital Clock Readout & Added Stoppage Time Badge */}
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <Radio className="w-2.5 h-2.5 text-emerald-400 animate-pulse hidden sm:inline" />
                  <span className="font-['Press_Start_2P'] text-[10px] sm:text-[11px] font-black text-emerald-400 tracking-wider drop-shadow-[0_0_6px_rgba(52,211,153,0.5)]">
                    {timeFormatted}
                  </span>
                  {stoppageTimeDisplay && (
                    <span className="px-1 py-0.2 rounded bg-amber-500/25 border border-amber-400/90 font-['Press_Start_2P'] text-[6px] sm:text-[7px] font-black text-amber-300 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.6)]">
                      {stoppageTimeDisplay}
                    </span>
                  )}
                </div>
                {/* Period Indicator */}
                <span className="font-['Press_Start_2P'] text-[6px] sm:text-[7px] font-bold text-amber-300 tracking-wider mt-0.5">
                  {halfText}
                </span>
              </div>

              {/* AWAY TEAM MODULE */}
              <div
                className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)] ${
                  scoreboardMode === 'solid'
                    ? 'bg-gradient-to-b from-[#7f1d1d] to-[#450a0a]'
                    : 'bg-red-950/60'
                }`}
                style={awayTeam ? { backgroundColor: awayTeam.kit.primaryColor + 'cc' } : undefined}
              >
                {/* Score Digit */}
                <div className="mr-1 sm:mr-2 px-1.5 py-0.5 rounded bg-black/60 border border-amber-500/40 shadow-inner flex items-center justify-center min-w-[20px] sm:min-w-[24px]">
                  <span className="font-['Press_Start_2P'] text-xs sm:text-sm font-black text-amber-400 drop-shadow-[0_2px_0_rgba(0,0,0,1)]">
                    {score.away}
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-['Press_Start_2P'] text-[9px] sm:text-[10px] font-bold text-white tracking-wider drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                    {awayTeam?.shortName || AWAY_KIT.shortName}
                  </span>
                  <span className="text-[6px] text-red-200 uppercase font-mono tracking-tighter hidden sm:inline truncate max-w-[65px]">
                    {awayTeam?.country || 'LEGENDS'}
                  </span>
                </div>
                {/* Away Team Badge */}
                <div className="relative flex items-center justify-center">
                  <span
                    className="w-4 h-4 rounded-full ring-1.5 ring-white/80 shadow-sm flex items-center justify-center text-[7px] font-black text-white font-['Press_Start_2P']"
                    style={{ backgroundColor: awayTeam?.badge?.bg || '#991b1b' }}
                  >
                    {awayTeam?.badge?.icon || awayTeam?.badge?.text || 'A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : <div />}

        {/* TOP RIGHT: AUTHENTIC 90s "DrawStar TV" BROADCAST LOGO (PURE 32-BIT RETRO TEXT, NO BACKGROUND) */}
        <div className="pointer-events-auto flex items-center select-none pt-0.5 sm:pt-1 pr-1 sm:pr-2">
          <div className="flex items-baseline gap-1 sm:gap-1.5">
            {/* 32-bit Star Icon */}
            <span
              className="font-['Press_Start_2P'] text-[10px] sm:text-[13px] text-amber-400 select-none animate-pulse"
              style={{
                textShadow: '2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 3px 3px 0 rgba(0,0,0,0.9), 0 0 8px rgba(251,191,36,0.7)',
              }}
            >
              ★
            </span>
            {/* DrawStar 32-bit 90s Wordmark */}
            <span
              className="font-['Press_Start_2P'] text-[10px] sm:text-[13px] font-black italic tracking-wider sm:tracking-widest uppercase bg-gradient-to-b from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent"
              style={{
                filter: 'drop-shadow(2px 2px 0px #000000) drop-shadow(-1px -1px 0px #000000) drop-shadow(3px 3px 2px rgba(0,0,0,0.85))',
              }}
            >
              DRAWSTAR
            </span>
            {/* 90s 32-bit TV Text */}
            <span
              className="font-['Press_Start_2P'] text-[9px] sm:text-[11px] font-black italic tracking-tight uppercase bg-gradient-to-b from-rose-400 via-red-500 to-rose-600 bg-clip-text text-transparent"
              style={{
                filter: 'drop-shadow(2px 2px 0px #000000) drop-shadow(-1px -1px 0px #000000) drop-shadow(3px 3px 2px rgba(0,0,0,0.85))',
              }}
            >
              TV
            </span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. BOTTOM LEFT: SPECIAL ACTION TEXT & CONTROLLED PLAYER INFO */}
      {/* Anchored cleanly ABOVE the bottom arcade controller deck */}
      {/* ======================================================== */}
      <div className="absolute bottom-[160px] sm:bottom-[175px] md:bottom-[180px] left-2.5 sm:left-4 pointer-events-auto flex flex-col items-start gap-1.5 max-w-[280px] sm:max-w-sm z-20 select-none">
        {/* TOP ITEM: SPECIAL ACTION NOTIFICATION BANNER (NUTMEG, BULLET SHOT, ETC.) */}
        {bannerMessage && specialActionTextMode !== 'off' && (
          <div
            className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 animate-in fade-in duration-150 transition-all ${
              specialActionTextMode === 'solid'
                ? 'bg-gradient-to-r from-[#0c2238] via-[#163554] to-[#0c2238] border-amber-400 text-amber-300 shadow-[0_4px_16px_rgba(0,0,0,0.9),0_0_12px_rgba(245,158,11,0.4)]'
                : 'bg-[#07131e]/75 backdrop-blur-sm border-amber-400/80 text-amber-300 shadow-[0_4px_12px_rgba(0,0,0,0.7)]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
            <span className="font-['Press_Start_2P'] text-[8px] sm:text-[9px] font-bold tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
              {bannerMessage}
            </span>
          </div>
        )}

        {/* BOTTOM ITEM: CONTROLLED PLAYER CARD (NAME, NUMBER, STAMINA) */}
        {controlledPlayer && playerInfoMode !== 'off' && (
          <div
            className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-2 transition-all ${
              playerInfoMode === 'solid'
                ? 'bg-[#07131e] border-amber-500/80 shadow-[0_4px_16px_rgba(0,0,0,0.85)]'
                : 'bg-[#07131e]/75 backdrop-blur-sm border-amber-500/60 shadow-[0_4px_12px_rgba(0,0,0,0.6)]'
            }`}
          >
            {/* SHIRT NUMBER BADGE */}
            <div className="w-6 h-6 rounded bg-amber-500/20 border border-amber-400 flex items-center justify-center shrink-0 shadow-inner">
              <span className="font-['Press_Start_2P'] text-[9px] font-black text-amber-300">
                #{controlledPlayer.number}
              </span>
            </div>

            {/* PLAYER NAME & ROLE */}
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-['Press_Start_2P'] text-[8px] sm:text-[9px] font-bold text-white tracking-wider">
                  {controlledPlayer.name.toUpperCase()}
                </span>
                {controlledPlayer.primaryPos && (
                  <span
                    className={`text-[7px] font-mono font-bold px-1 rounded border ${
                      controlledPlayer.primaryPos === 'ATT'
                        ? 'bg-rose-950/90 text-rose-300 border-rose-600/60'
                        : controlledPlayer.primaryPos === 'MID'
                        ? 'bg-emerald-950/90 text-emerald-300 border-emerald-600/60'
                        : controlledPlayer.primaryPos === 'DEF'
                        ? 'bg-sky-950/90 text-sky-300 border-sky-600/60'
                        : 'bg-amber-950/90 text-amber-300 border-amber-600/60'
                    }`}
                  >
                    {controlledPlayer.primaryPos}
                  </span>
                )}
                <span className="text-[7px] font-mono font-bold px-1 rounded bg-slate-800 text-amber-400 border border-slate-700">
                  {controlledPlayer.subPos || controlledPlayer.role}
                </span>
                {controlledPlayer.playstyleName && (
                  <span className="text-[7px] font-mono font-bold px-1 rounded bg-amber-950/80 text-amber-300 border border-amber-600/50">
                    {controlledPlayer.playstyleName.toUpperCase()}
                  </span>
                )}
                {/* LIVE SOFASCORE RATING BADGE */}
                <div
                  className={`text-[7px] font-mono font-bold px-1.5 py-0.2 rounded border flex items-center gap-0.5 ${
                    PlayerRatingsEngine.getRatingBadgeClasses(controlledPlayerRating).badgeBg
                  } ${PlayerRatingsEngine.getRatingBadgeClasses(controlledPlayerRating).border} ${
                    PlayerRatingsEngine.getRatingBadgeClasses(controlledPlayerRating).text
                  }`}
                >
                  <Star className="w-2.5 h-2.5 fill-current shrink-0 text-amber-400" />
                  <span>{controlledPlayerRating.toFixed(1)}</span>
                </div>
              </div>

              {/* MINI STAMINA METER */}
              <div className="flex items-center gap-1 mt-1">
                <Activity className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                <div className="w-20 sm:w-24 h-1.5 rounded-full bg-slate-900 border border-slate-700 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-200"
                    style={{
                      width: `${Math.max(5, Math.min(100, controlledPlayer.stamina))}%`,
                      backgroundColor:
                        controlledPlayer.stamina > 50
                          ? '#10b981'
                          : controlledPlayer.stamina > 25
                          ? '#facc15'
                          : '#ef4444',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 3. BOTTOM RIGHT: LIVE PLAYER RATING FLOATING BADGE (PHASE 10) */}
      {/* Anchored cleanly ABOVE the bottom arcade button deck */}
      {/* ======================================================== */}
      {controlledPlayer && playerInfoMode !== 'off' && (
        <div className="absolute bottom-[160px] sm:bottom-[175px] md:bottom-[180px] right-2.5 sm:right-4 pointer-events-auto flex items-center gap-1.5 z-20 select-none animate-in fade-in duration-200">
          <div
            className={`px-2.5 py-1 rounded-lg border flex items-center gap-2 shadow-[0_4px_16px_rgba(0,0,0,0.85)] font-mono transition-all duration-300 ${
              PlayerRatingsEngine.getRatingBadgeClasses(controlledPlayerRating).badgeBg
            } ${PlayerRatingsEngine.getRatingBadgeClasses(controlledPlayerRating).border} ${
              PlayerRatingsEngine.getRatingBadgeClasses(controlledPlayerRating).glow
            }`}
          >
            <Star className="w-3.5 h-3.5 fill-current shrink-0 text-amber-400 animate-pulse" />
            <div className="flex flex-col items-end">
              <span className="font-['Press_Start_2P'] text-[6px] text-slate-300 uppercase tracking-tighter">
                RATING
              </span>
              <span
                className={`font-['Press_Start_2P'] text-[9px] sm:text-[10px] ${
                  PlayerRatingsEngine.getRatingBadgeClasses(controlledPlayerRating).text
                } tracking-tight`}
              >
                {controlledPlayerRating.toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
