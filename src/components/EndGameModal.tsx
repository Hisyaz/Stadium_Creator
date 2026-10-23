/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  RotateCcw,
  Users,
  BarChart3,
  Star,
  Settings,
  Home,
  Clock,
  Shield,
  Trophy,
  Flame,
  X,
} from 'lucide-react';
import { MatchStats, PlayerRatingRecord, MatchMvpResult } from '../types';
import { PlayerRatingsEngine } from '../game/playerRatings';
import { audio } from '../game/audio';

export interface EndGameModalProps {
  isOpen: boolean;
  homeScore: number;
  awayScore: number;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamBadge?: string;
  awayTeamBadge?: string;
  homeKitColor?: string;
  awayKitColor?: string;
  stats: MatchStats;
  playerRatings?: PlayerRatingRecord[];
  matchMvp?: MatchMvpResult | null;
  isDraw: boolean;
  isExtraTimeAvailable?: boolean;
  matchPeriod?: string;
  onRematch: () => void;
  onTeamSelection: () => void;
  onOpenSettings: () => void;
  onMainMenu?: () => void;
  onStartExtraTime?: () => void;
  onStartPenalties?: () => void;
}

export const EndGameModal: React.FC<EndGameModalProps> = ({
  isOpen,
  homeScore,
  awayScore,
  homeTeamName,
  awayTeamName,
  homeTeamBadge = '🛡️',
  awayTeamBadge = '⚔️',
  homeKitColor = '#0055b8',
  awayKitColor = '#991b1b',
  stats,
  playerRatings = [],
  matchMvp = null,
  isDraw,
  isExtraTimeAvailable = true,
  matchPeriod = '90:00',
  onRematch,
  onTeamSelection,
  onOpenSettings,
  onMainMenu,
  onStartExtraTime,
  onStartPenalties,
}) => {
  const [activeTab, setActiveTab] = useState<'main' | 'stats' | 'ratings'>('main');
  const [ratingTeamTab, setRatingTeamTab] = useState<'home' | 'away'>('home');

  if (!isOpen) return null;

  const userWon = homeScore > awayScore;
  const userLost = homeScore < awayScore;

  // Calculate possession percentage from recorded frames
  const totalPossession = (stats.home.possessionFrames || 0) + (stats.away.possessionFrames || 0);
  const homePossPct = totalPossession > 0
    ? Math.round((stats.home.possessionFrames / totalPossession) * 100)
    : 50;
  const awayPossPct = 100 - homePossPct;

  const statItems = [
    { label: 'POSSESSION', home: `${homePossPct}%`, away: `${awayPossPct}%`, homeVal: homePossPct, awayVal: awayPossPct, max: 100 },
    { label: 'TOTAL SHOTS', home: stats.home.shots, away: stats.away.shots, homeVal: stats.home.shots, awayVal: stats.away.shots, max: Math.max(1, stats.home.shots, stats.away.shots) },
    { label: 'SHOTS ON TARGET', home: stats.home.shotsOnTarget, away: stats.away.shotsOnTarget, homeVal: stats.home.shotsOnTarget, awayVal: stats.away.shotsOnTarget, max: Math.max(1, stats.home.shotsOnTarget, stats.away.shotsOnTarget) },
    { label: 'PASSES COMPLETED', home: stats.home.passesCompleted, away: stats.away.passesCompleted, homeVal: stats.home.passesCompleted, awayVal: stats.away.passesCompleted, max: Math.max(1, stats.home.passesCompleted, stats.away.passesCompleted) },
    { label: 'CORNER KICKS', home: stats.home.corners, away: stats.away.corners, homeVal: stats.home.corners, awayVal: stats.away.corners, max: Math.max(1, stats.home.corners, stats.away.corners) },
    { label: 'FOULS COMMITTED', home: stats.home.fouls, away: stats.away.fouls, homeVal: stats.home.fouls, awayVal: stats.away.fouls, max: Math.max(1, stats.home.fouls, stats.away.fouls) },
    { label: 'YELLOW / RED CARDS', home: `${stats.home.yellowCards} / ${stats.home.redCards}`, away: `${stats.away.yellowCards} / ${stats.away.redCards}`, homeVal: stats.home.yellowCards + stats.home.redCards * 2, awayVal: stats.away.yellowCards + stats.away.redCards * 2, max: Math.max(1, stats.home.yellowCards + stats.home.redCards * 2, stats.away.yellowCards + stats.away.redCards * 2) },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-xl max-h-[96vh] bg-slate-900 border-2 border-amber-500/80 rounded-2xl shadow-[0_0_60px_rgba(245,158,11,0.35)] overflow-hidden flex flex-col text-white font-sans">
        {/* 4 ORNATE GOLDEN CORNER BRACKETS */}
        <div className="absolute top-1 left-1.5 w-3 h-3 border-t-2 border-l-2 border-amber-400 pointer-events-none z-20" />
        <div className="absolute top-1 right-1.5 w-3 h-3 border-t-2 border-r-2 border-amber-400 pointer-events-none z-20" />
        <div className="absolute bottom-1 left-1.5 w-3 h-3 border-b-2 border-l-2 border-amber-400 pointer-events-none z-20" />
        <div className="absolute bottom-1 right-1.5 w-3 h-3 border-b-2 border-r-2 border-amber-400 pointer-events-none z-20" />

        {/* 32-BIT METALLIC CONSOLE HEADER */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-slate-950 via-slate-800 to-slate-950 border-b-2 border-slate-700/80 shrink-0">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${userWon ? 'bg-emerald-400' : userLost ? 'bg-rose-500' : 'bg-amber-400'} animate-pulse shadow-md`} />
            <h2 className="font-['Press_Start_2P'] text-xs sm:text-sm text-amber-400 tracking-wider">
              {activeTab === 'main' ? 'FULL TIME RESULT' : activeTab === 'stats' ? 'MATCH STATISTICS' : 'PLAYER RATINGS'}
            </h2>
          </div>

          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{matchPeriod}</span>
            {activeTab !== 'main' && (
              <button
                type="button"
                onClick={() => {
                  audio.playKick(0.2);
                  setActiveTab('main');
                }}
                className="ml-2 p-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 cursor-pointer"
                title="Back to Summary"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* OUTCOME BANNER */}
        <div
          className={`py-2 px-4 text-center border-b font-['Press_Start_2P'] text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center gap-2 shrink-0 ${
            userWon
              ? 'bg-gradient-to-r from-emerald-950 via-emerald-800 to-emerald-950 text-emerald-300 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
              : userLost
              ? 'bg-gradient-to-r from-rose-950 via-rose-900 to-rose-950 text-rose-300 border-rose-500/50'
              : 'bg-gradient-to-r from-amber-950 via-amber-800 to-amber-950 text-amber-300 border-amber-500/50'
          }`}
        >
          {userWon ? (
            <>
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>VICTORY!</span>
              <Trophy className="w-4 h-4 text-amber-400" />
            </>
          ) : userLost ? (
            <>
              <Shield className="w-4 h-4 text-rose-400" />
              <span>DEFEAT</span>
              <Shield className="w-4 h-4 text-rose-400" />
            </>
          ) : (
            <>
              <Flame className="w-4 h-4 text-amber-400" />
              <span>FULL TIME DRAW</span>
              <Flame className="w-4 h-4 text-amber-400" />
            </>
          )}
        </div>

        {/* MATCH SCOREBOARD HERO CARD */}
        <div className="p-3 sm:p-5 bg-gradient-to-b from-slate-950 to-slate-900 border-b border-slate-800 shrink-0">
          <div className="flex items-center justify-between gap-3">
            {/* Home Team */}
            <div className="flex-1 text-center min-w-0">
              <div
                className="w-11 h-11 sm:w-12 sm:h-12 mx-auto rounded-xl border border-sky-400/60 flex items-center justify-center text-2xl shadow-lg mb-1"
                style={{ backgroundColor: `${homeKitColor}33` }}
              >
                {homeTeamBadge}
              </div>
              <div className="font-['Press_Start_2P'] text-[9px] sm:text-[10px] text-white truncate">
                {homeTeamName}
              </div>
              <div className="text-[7px] sm:text-[8px] font-mono text-sky-400 font-bold uppercase mt-0.5">
                HOME
              </div>
            </div>

            {/* Score Centerpiece */}
            <div className="shrink-0 flex flex-col items-center px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl shadow-inner min-w-[90px]">
              <div className="font-['Press_Start_2P'] text-2xl sm:text-3xl text-amber-400 tracking-tight drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]">
                {homeScore} - {awayScore}
              </div>
              <div className="text-[7px] sm:text-[8px] font-mono text-slate-400 mt-1 uppercase font-bold">
                FINAL
              </div>
            </div>

            {/* Away Team */}
            <div className="flex-1 text-center min-w-0">
              <div
                className="w-11 h-11 sm:w-12 sm:h-12 mx-auto rounded-xl border border-rose-400/60 flex items-center justify-center text-2xl shadow-lg mb-1"
                style={{ backgroundColor: `${awayKitColor}33` }}
              >
                {awayTeamBadge}
              </div>
              <div className="font-['Press_Start_2P'] text-[9px] sm:text-[10px] text-white truncate">
                {awayTeamName}
              </div>
              <div className="text-[7px] sm:text-[8px] font-mono text-rose-400 font-bold uppercase mt-0.5">
                AWAY
              </div>
            </div>
          </div>
        </div>

        {/* MODAL BODY (NO SCROLL, COMPACT DYNAMIC VIEWS) */}
        <div className="flex-1 p-3 sm:p-5 flex flex-col justify-between overflow-hidden bg-slate-900/95">
          {activeTab === 'main' && (
            <div className="space-y-3 flex-1 flex flex-col justify-center">
              {/* DRAW RESOLUTION SECTION (Shown if Tied & Extra Time Available) */}
              {isDraw && isExtraTimeAvailable && (
                <div className="p-3 rounded-xl border border-amber-500/60 bg-gradient-to-r from-amber-500/15 via-yellow-500/20 to-amber-500/15">
                  <div className="text-[9px] font-['Press_Start_2P'] text-amber-300 text-center mb-2.5 tracking-wider">
                    DRAW RESOLUTION
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        audio.playKick(0.3);
                        if (onStartExtraTime) onStartExtraTime();
                      }}
                      className="py-2.5 px-3 rounded-lg border border-amber-400 bg-amber-500/30 hover:bg-amber-500/45 text-amber-200 font-['Press_Start_2P'] text-[9px] sm:text-[10px] font-bold shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>EXTRA TIME</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        audio.playKick(0.3);
                        if (onStartPenalties) onStartPenalties();
                      }}
                      className="py-2.5 px-3 rounded-lg border border-yellow-400 bg-yellow-500/30 hover:bg-yellow-500/45 text-yellow-200 font-['Press_Start_2P'] text-[9px] sm:text-[10px] font-bold shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Shield className="w-3.5 h-3.5 text-yellow-400" />
                      <span>PENALTIES</span>
                    </button>
                  </div>
                </div>
              )}

              {/* PRIMARY ACTION: REMATCH */}
              <button
                type="button"
                onClick={() => {
                  audio.playKick(0.3);
                  onRematch();
                }}
                className="w-full py-3 sm:py-3.5 px-4 rounded-xl border-2 border-emerald-400/80 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-['Press_Start_2P'] text-xs sm:text-sm font-black shadow-[0_0_25px_rgba(16,185,129,0.5)] hover:shadow-[0_0_35px_rgba(16,185,129,0.7)] transition-all transform active:scale-98 flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 fill-slate-950" />
                <span>REMATCH</span>
              </button>

              {/* SECONDARY ROW: TEAM SELECTION & STATS */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    audio.playKick(0.3);
                    onTeamSelection();
                  }}
                  className="py-2.5 sm:py-3 px-3 rounded-xl border border-sky-400/80 bg-slate-950 hover:bg-sky-950/40 text-sky-300 font-['Press_Start_2P'] text-[9px] sm:text-[10px] font-bold shadow transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 text-sky-400" />
                  <span>TEAMS</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    audio.playKick(0.3);
                    setActiveTab('stats');
                  }}
                  className="py-2.5 sm:py-3 px-3 rounded-xl border border-amber-400/80 bg-slate-950 hover:bg-amber-950/40 text-amber-300 font-['Press_Start_2P'] text-[9px] sm:text-[10px] font-bold shadow transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
                  <span>STATS</span>
                </button>
              </div>

              {/* TERTIARY ROW: RATINGS, SETTINGS & DISABLED MAIN MENU */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    audio.playKick(0.3);
                    setActiveTab('ratings');
                  }}
                  className="py-2 px-2 rounded-lg border border-slate-700 bg-slate-950 hover:bg-slate-800 text-slate-300 font-['Press_Start_2P'] text-[8px] font-bold shadow transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Star className="w-3 h-3 text-amber-400" />
                  <span>RATINGS</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    audio.playKick(0.3);
                    onOpenSettings();
                  }}
                  className="py-2 px-2 rounded-lg border border-slate-700 bg-slate-950 hover:bg-slate-800 text-slate-300 font-['Press_Start_2P'] text-[8px] font-bold shadow transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Settings className="w-3 h-3 text-slate-300" />
                  <span>SETTINGS</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    audio.playKick(0.3);
                    if (onMainMenu) onMainMenu();
                  }}
                  title="Return to Main Menu"
                  className="py-2 px-2 rounded-lg border border-slate-700 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-amber-300 font-['Press_Start_2P'] text-[8px] font-bold shadow transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Home className="w-3 h-3 text-amber-400" />
                  <span>MENU</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="space-y-2 flex-1 flex flex-col justify-center">
              <div className="text-[9px] font-['Press_Start_2P'] text-amber-400 text-center mb-1">
                MATCH COMPARISON
              </div>
              <div className="space-y-1.5 text-[9px] font-mono">
                {statItems.map((st, idx) => (
                  <div key={idx} className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 flex flex-col gap-0.5">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-sky-400">{st.home}</span>
                      <span className="text-slate-400 text-[8px] font-['Press_Start_2P']">{st.label}</span>
                      <span className="text-rose-400">{st.away}</span>
                    </div>
                    {/* Comparative Progress Bar */}
                    <div className="flex h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="bg-sky-500 h-full transition-all duration-300"
                        style={{ width: `${(st.homeVal / ((st.homeVal + st.awayVal) || 1)) * 100}%` }}
                      />
                      <div
                        className="bg-rose-500 h-full transition-all duration-300"
                        style={{ width: `${(st.awayVal / ((st.homeVal + st.awayVal) || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  audio.playKick(0.2);
                  setActiveTab('main');
                }}
                className="w-full mt-2 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 font-['Press_Start_2P'] text-[9px] font-bold cursor-pointer"
              >
                RETURN TO SUMMARY
              </button>
            </div>
          )}

          {activeTab === 'ratings' && (
            <div className="space-y-2 flex-1 flex flex-col justify-between overflow-hidden">
              {/* MATCH MVP SPOTLIGHT BANNER */}
              {matchMvp && (
                <div className="p-2 sm:p-2.5 rounded-xl border-2 border-yellow-400/90 bg-gradient-to-r from-yellow-500/20 via-amber-500/25 to-yellow-500/20 shadow-[0_0_20px_rgba(250,204,21,0.35)] flex items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-yellow-400/30 border border-yellow-400 flex items-center justify-center shrink-0 shadow-inner">
                      <Trophy className="w-4 h-4 text-yellow-300" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-['Press_Start_2P'] text-[7px] text-yellow-400 font-bold uppercase tracking-wider">
                          MATCH MVP
                        </span>
                        <span className="text-[7px] font-mono font-bold px-1 rounded bg-slate-950 text-slate-300 border border-slate-700">
                          {matchMvp.isHome ? homeTeamName : awayTeamName}
                        </span>
                      </div>
                      <div className="font-['Press_Start_2P'] text-[9px] sm:text-[10px] text-white font-bold truncate mt-0.5">
                        #{matchMvp.player.number} {matchMvp.player.name.toUpperCase()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* MVP Event Stats Pill */}
                    <div className="hidden sm:flex items-center gap-1.5 text-[8px] font-mono text-slate-300 bg-slate-950/70 px-2 py-1 rounded border border-yellow-500/40">
                      {matchMvp.player.goals > 0 && <span>⚽{matchMvp.player.goals}</span>}
                      {matchMvp.player.assists > 0 && <span>🎯{matchMvp.player.assists}</span>}
                      {matchMvp.player.keyPasses > 0 && <span>🔑{matchMvp.player.keyPasses}</span>}
                      {matchMvp.player.saves > 0 && <span>🧤{matchMvp.player.saves}</span>}
                      {matchMvp.player.tacklesWon + matchMvp.player.interceptions > 0 && (
                        <span>🛡️{matchMvp.player.tacklesWon + matchMvp.player.interceptions}</span>
                      )}
                    </div>
                    {/* MVP Rating Badge */}
                    <div className="px-2.5 py-1 rounded-lg bg-yellow-400 border border-yellow-300 text-slate-950 font-['Press_Start_2P'] text-xs sm:text-sm font-black shadow-[0_0_12px_rgba(250,204,21,0.8)] flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-slate-950" />
                      <span>{matchMvp.player.rating.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TEAM TOGGLE TABS */}
              <div className="grid grid-cols-2 gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    audio.playKick(0.2);
                    setRatingTeamTab('home');
                  }}
                  className={`py-1.5 px-3 rounded-lg border font-['Press_Start_2P'] text-[8px] sm:text-[9px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    ratingTeamTab === 'home'
                      ? 'bg-sky-950/90 border-sky-400 text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.4)]'
                      : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>{homeTeamBadge}</span>
                  <span className="truncate">{homeTeamName.toUpperCase()}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    audio.playKick(0.2);
                    setRatingTeamTab('away');
                  }}
                  className={`py-1.5 px-3 rounded-lg border font-['Press_Start_2P'] text-[8px] sm:text-[9px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    ratingTeamTab === 'away'
                      ? 'bg-rose-950/90 border-rose-400 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                      : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>{awayTeamBadge}</span>
                  <span className="truncate">{awayTeamName.toUpperCase()}</span>
                </button>
              </div>

              {/* SQUAD RATINGS GRID (ZERO SCROLL, COMPACT 2-COLUMNS) */}
              <div className="flex-1 overflow-hidden grid grid-cols-1 sm:grid-cols-2 gap-1 content-start py-0.5">
                {(playerRatings.filter((r) => r.team === ratingTeamTab).length > 0
                  ? playerRatings.filter((r) => r.team === ratingTeamTab)
                  : []
                ).slice(0, 12).map((pRec) => {
                  const badgeClasses = PlayerRatingsEngine.getRatingBadgeClasses(pRec.rating);
                  const isPlayerMvp = matchMvp?.player.playerId === pRec.playerId;

                  return (
                    <div
                      key={pRec.playerId}
                      className={`px-2 py-1 rounded-md border flex items-center justify-between gap-1 text-[8px] font-mono transition-all ${
                        isPlayerMvp
                          ? 'bg-yellow-950/40 border-yellow-400/80 shadow-[0_0_10px_rgba(250,204,21,0.25)]'
                          : 'bg-slate-950/80 border-slate-800'
                      }`}
                    >
                      {/* Left: Player Info */}
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-5 text-center font-['Press_Start_2P'] text-[7px] text-amber-400 font-bold shrink-0">
                          #{pRec.number}
                        </span>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="font-['Press_Start_2P'] text-[7px] text-white truncate max-w-[95px] sm:max-w-[110px]">
                              {pRec.name}
                            </span>
                            {isPlayerMvp && (
                              <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400 shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-[6px]">
                            <span
                              className={`px-1 py-0.2 rounded font-bold ${
                                pRec.primaryPos === 'ATT'
                                  ? 'text-rose-400'
                                  : pRec.primaryPos === 'MID'
                                  ? 'text-emerald-400'
                                  : pRec.primaryPos === 'DEF'
                                  ? 'text-sky-400'
                                  : 'text-amber-400'
                              }`}
                            >
                              {pRec.primaryPos || pRec.role}
                            </span>
                            {pRec.isSubbedOut && (
                              <span className="text-amber-400/90 font-bold">
                                [SUB {pRec.subbedMinute}']
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Key Match Impact & Rating Badge */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="flex items-center gap-1 text-[7px] text-slate-400">
                          {pRec.goals > 0 && <span className="text-white font-bold">⚽{pRec.goals}</span>}
                          {pRec.assists > 0 && <span className="text-sky-400 font-bold">🎯{pRec.assists}</span>}
                          {pRec.saves > 0 && <span className="text-emerald-400 font-bold">🧤{pRec.saves}</span>}
                        </div>

                        {/* SofaScore-Style Rating Pill */}
                        <div
                          className={`px-1.5 py-0.5 rounded border font-['Press_Start_2P'] text-[7px] font-black min-w-[28px] text-center shadow-sm ${badgeClasses.badgeBg} ${badgeClasses.border} ${badgeClasses.text}`}
                        >
                          {pRec.rating.toFixed(1)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* RETURN BUTTON */}
              <button
                type="button"
                onClick={() => {
                  audio.playKick(0.2);
                  setActiveTab('main');
                }}
                className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 font-['Press_Start_2P'] text-[9px] font-bold cursor-pointer shrink-0"
              >
                RETURN TO SUMMARY
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
