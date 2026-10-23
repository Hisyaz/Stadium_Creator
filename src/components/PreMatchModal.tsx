/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FormationName,
  TacticalPlaystyle,
  HalfDurationMinutes,
  DifficultyLevel,
  PreMatchConfig,
  DetailedTactics,
  DefensiveLineLevel,
  DefensiveStyle,
  DefensiveCompactness,
  AttackingCreation,
  AttackingFinalThird,
  AttackingShape,
  AttackingRuns,
  MatchStakeTier,
  PlayerPlaystyle,
  PrimaryPosition,
  SubPosition,
  PlayerRole,
  StadiumTier,
  TimeOfDay,
  SeatColorMode,
  PitchDimensionPreset,
  TurfQuality,
  GrassLength,
  WeatherCondition,
  Season,
  NetTension,
  GoalFrameType,
} from '../types';
import { PITCH_DIMENSION_PRESETS } from '../game/pitchDimensions';
import {
  FORMATION_LIST,
  PLAYSTYLE_DEFINITIONS,
  CANONICAL_PLAYSTYLES,
  HOME_FORMATIONS,
  TACTICAL_BOARD_FORMATIONS,
  getAwayFormationPositions,
  getDefaultTactics,
  detectMatchingPreset,
  TACTICAL_PRESETS_DETAILED,
} from '../game/formations';
import {
  HOME_PLAYER_PLAYSTYLES,
  AWAY_PLAYER_PLAYSTYLES,
  PLAYSTYLE_DEFINITIONS_DETAILED,
  SUB_POSITION_DEFINITIONS,
  resolveSubPositionForSlot,
  getAllowedPlaystylesForSubPosition,
} from '../game/playstyles';
import { HOME_KIT, AWAY_KIT } from '../game/constants';
import {
  Play,
  Settings2,
  Shield,
  Flame,
  Clock,
  Swords,
  Sliders,
  Sparkles,
  ShieldAlert,
  Zap,
  ArrowUpDown,
  MoveRight,
  Crosshair,
  Users,
  Check,
  ChevronRight,
  RotateCcw,
  Building2,
  Sun,
  Moon,
  Sunrise,
  Sunset,
  Palette,
  Flag,
  Cloud,
  CloudRain,
  Snowflake,
  Wind,
  Compass,
  Dices,
  RefreshCw,
} from 'lucide-react';

import {
  HOME_PLAYER_CANONICAL_STATS,
  AWAY_PLAYER_CANONICAL_STATS,
  getAttributeTier,
  getAttributeStatBreakName,
} from '../game/playerStats';
import { HOME_FORMATION_BASE, AWAY_FORMATION_BASE } from '../game/constants';
import { TeamDefinition } from '../types/team';
import { getTeamById, getAllTeams, getRandomTeam, calculatePlayerOvr } from '../game/teams';
import { TeamSelectorModal } from './TeamSelectorModal';

interface PreMatchModalProps {
  isOpen: boolean;
  onStartMatch: (config: PreMatchConfig) => void;
  onClose?: () => void;
  onOpenPresentation?: () => void;
  onOpenGamePlan?: () => void;
  initialConfig?: Partial<PreMatchConfig>;
  isMidMatch?: boolean;
  onApplyTacticsMidMatch?: (config: Partial<PreMatchConfig>) => void;
  onUpdatePlayerPlaystyle?: (playerId: string, playstyle: PlayerPlaystyle) => void;
}

export const PreMatchModal: React.FC<PreMatchModalProps> = ({
  isOpen,
  onStartMatch,
  onClose,
  onOpenPresentation,
  onOpenGamePlan,
  initialConfig,
  isMidMatch = false,
  onApplyTacticsMidMatch,
  onUpdatePlayerPlaystyle,
}) => {
  // Phase 13.5: Multi-Tier Team State
  const [homeTeam, setHomeTeam] = useState<TeamDefinition>(() =>
    initialConfig?.homeTeamId ? getTeamById(initialConfig.homeTeamId) : getTeamById('modern_european_xi')
  );
  const [awayTeam, setAwayTeam] = useState<TeamDefinition>(() =>
    initialConfig?.awayTeamId ? getTeamById(initialConfig.awayTeamId) : getTeamById('classic_european_xi')
  );
  const [teamSelectorSide, setTeamSelectorSide] = useState<'home' | 'away' | null>(null);

  const [activeTab, setActiveTab] = useState<'home' | 'away' | 'squads' | 'stadium' | 'match'>('home');
  const [stadiumTier, setStadiumTier] = useState<StadiumTier>(initialConfig?.stadiumTier || 'monumental');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(initialConfig?.timeOfDay || 'night');
  const [seatColor, setSeatColor] = useState<SeatColorMode>(initialConfig?.seatColor || 'auto');
  const [homePlayerPlaystyles, setHomePlayerPlaystyles] = useState<Record<string, PlayerPlaystyle>>(() => {
    const initial: Record<string, PlayerPlaystyle> = {};
    for (const [r, c] of Object.entries(HOME_PLAYER_PLAYSTYLES)) {
      initial[r] = c.playstyle;
    }
    return initial;
  });
  const [awayPlayerPlaystyles, setAwayPlayerPlaystyles] = useState<Record<string, PlayerPlaystyle>>(() => {
    const initial: Record<string, PlayerPlaystyle> = {};
    for (const [r, c] of Object.entries(AWAY_PLAYER_PLAYSTYLES)) {
      initial[r] = c.playstyle;
    }
    return initial;
  });
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [halfDuration, setHalfDuration] = useState<HalfDurationMinutes>(initialConfig?.halfDurationMinutes || 3);
  const [homeFormation, setHomeFormation] = useState<FormationName>(initialConfig?.homeFormation || homeTeam.preferredFormation);
  const [awayFormation, setAwayFormation] = useState<FormationName>(initialConfig?.awayFormation || awayTeam.preferredFormation);
  const [homePlaystyle, setHomePlaystyle] = useState<TacticalPlaystyle>(initialConfig?.homePlaystyle || homeTeam.tacticalPlaystyle);
  const [awayPlaystyle, setAwayPlaystyle] = useState<TacticalPlaystyle>(initialConfig?.awayPlaystyle || awayTeam.tacticalPlaystyle);
  const [homeTactics, setHomeTactics] = useState<DetailedTactics>(() => initialConfig?.homeTactics || homeTeam.tactics || getDefaultTactics('possession'));
  const [awayTactics, setAwayTactics] = useState<DetailedTactics>(() => initialConfig?.awayTactics || awayTeam.tactics || getDefaultTactics('gegenpress'));
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(initialConfig?.difficulty || 'easy');
  const [matchStakeTier, setMatchStakeTier] = useState<MatchStakeTier>(initialConfig?.matchStakeTier || 'friendly');
  const [pitchPreset, setPitchPreset] = useState<PitchDimensionPreset>(initialConfig?.pitchPreset || 'balanced');
  const [pitchLengthMeters, setPitchLengthMeters] = useState<number>(initialConfig?.pitchLengthMeters || 105);
  const [pitchWidthMeters, setPitchWidthMeters] = useState<number>(initialConfig?.pitchWidthMeters || 68);
  const [turfQuality, setTurfQuality] = useState<TurfQuality>(initialConfig?.turfQuality || 'normal');
  const [grassLength, setGrassLength] = useState<GrassLength>(initialConfig?.grassLength || 'normal');
  const [weather, setWeather] = useState<WeatherCondition>(initialConfig?.weather || 'clear');
  const [season, setSeason] = useState<Season>(initialConfig?.season || 'summer');
  const [netTension, setNetTension] = useState<NetTension>(initialConfig?.netTension || 'moderate');
  const [goalFrame, setGoalFrame] = useState<GoalFrameType>(initialConfig?.goalFrame || 'standard');

  const handleSelectTeam = (side: 'home' | 'away', team: TeamDefinition) => {
    if (side === 'home') {
      setHomeTeam(team);
      setHomeFormation(team.preferredFormation);
      setHomePlaystyle(team.tacticalPlaystyle);
      setHomeTactics({ ...team.tactics });
      const newPlaystyles: Record<string, PlayerPlaystyle> = {};
      team.players.forEach(p => {
        newPlaystyles[p.role] = p.playstyle;
      });
      setHomePlayerPlaystyles(newPlaystyles);
    } else {
      setAwayTeam(team);
      setAwayFormation(team.preferredFormation);
      setAwayPlaystyle(team.tacticalPlaystyle);
      setAwayTactics({ ...team.tactics });
      const newPlaystyles: Record<string, PlayerPlaystyle> = {};
      team.players.forEach(p => {
        newPlaystyles[p.role] = p.playstyle;
      });
      setAwayPlayerPlaystyles(newPlaystyles);
    }
  };

  const handleRandomizeMatchup = () => {
    const tHome = getRandomTeam();
    let tAway = getRandomTeam();
    const all = getAllTeams();
    if (all.length > 1) {
      while (tAway.id === tHome.id) {
        tAway = getRandomTeam();
      }
    }
    handleSelectTeam('home', tHome);
    handleSelectTeam('away', tAway);
  };

  if (!isOpen) return null;

  const handleStart = () => {
    onStartMatch({
      halfDurationMinutes: halfDuration,
      homeFormation,
      awayFormation,
      homePlaystyle,
      awayPlaystyle,
      homeTactics,
      awayTactics,
      difficulty,
      matchStakeTier,
      stadiumTier,
      timeOfDay,
      seatColor,
      pitchPreset,
      pitchLengthMeters,
      pitchWidthMeters,
      turfQuality,
      grassLength,
      weather,
      season,
      netTension,
      goalFrame,
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
    });
  };

  const handleSelectHomePreset = (preset: TacticalPlaystyle) => {
    setHomePlaystyle(preset);
    setHomeTactics(getDefaultTactics(preset));
  };

  const handleSelectAwayPreset = (preset: TacticalPlaystyle) => {
    setAwayPlaystyle(preset);
    setAwayTactics(getDefaultTactics(preset));
  };

  const handleUpdateHomeTactics = <K extends keyof DetailedTactics>(field: K, value: DetailedTactics[K]) => {
    const updated = { ...homeTactics, [field]: value };
    setHomeTactics(updated);
    const matched = detectMatchingPreset(updated);
    setHomePlaystyle(matched);
  };

  const handleUpdateAwayTactics = <K extends keyof DetailedTactics>(field: K, value: DetailedTactics[K]) => {
    const updated = { ...awayTactics, [field]: value };
    setAwayTactics(updated);
    const matched = detectMatchingPreset(updated);
    setAwayPlaystyle(matched);
  };

  const selectedHomeStyle = PLAYSTYLE_DEFINITIONS[homePlaystyle] || PLAYSTYLE_DEFINITIONS.custom;
  const selectedAwayStyle = PLAYSTYLE_DEFINITIONS[awayPlaystyle] || PLAYSTYLE_DEFINITIONS.custom;

  // Visual Pitch Diagram for Formation Preview (Full Pitch 32-Bit Coverage)
  const renderFormationPitchPreview = (formation: FormationName, isHome: boolean) => {
    const slots = TACTICAL_BOARD_FORMATIONS[formation] || HOME_FORMATIONS[formation];
    const primaryColor = isHome ? homeTeam.kit.primaryColor : awayTeam.kit.primaryColor;

    return (
      <div className="relative w-44 h-56 bg-emerald-950/80 border-2 border-emerald-600/60 rounded overflow-hidden shadow-inner flex flex-col justify-between p-2">
        {/* Pitch line markings */}
        <div className="absolute inset-x-2 top-2 bottom-2 border border-emerald-500/40 pointer-events-none" />
        <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 border-t border-emerald-500/40 pointer-events-none" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full border border-emerald-500/40 pointer-events-none" />

        {/* Penalty boxes */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-8 border-b border-x border-emerald-500/40 pointer-events-none" />
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-20 h-8 border-t border-x border-emerald-500/40 pointer-events-none" />

        {/* Player Dots */}
        {Object.entries(slots).map(([role, pos]) => (
          <div
            key={role}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none"
            style={{
              left: `${pos.x * 100}%`,
              top: `${pos.y * 100}%`,
            }}
          >
            <div
              className="w-3 h-3 rounded-full border border-white shadow-md flex items-center justify-center text-[6px] font-bold text-white"
              style={{ backgroundColor: role === 'GK' ? '#f59e0b' : primaryColor }}
            />
            <span className="text-[7px] font-mono text-emerald-100 font-semibold tracking-tighter scale-90 leading-none mt-0.5 drop-shadow">
              {pos.label}
            </span>
          </div>
        ))}
      </div>
    );
  };

  /**
   * Renders the comprehensive interactive tactical sliders & category selectors
   */
  const renderDetailedTacticsControls = (
    tactics: DetailedTactics,
    currentPlaystyle: TacticalPlaystyle,
    onUpdate: <K extends keyof DetailedTactics>(field: K, value: DetailedTactics[K]) => void,
    onSelectPreset: (preset: TacticalPlaystyle) => void,
    themeColor: 'blue' | 'red'
  ) => {
    const isBlue = themeColor === 'blue';
    const accentBorder = isBlue ? 'border-blue-500' : 'border-red-500';
    const accentBg = isBlue ? 'bg-blue-600' : 'bg-red-600';
    const accentText = isBlue ? 'text-blue-400' : 'text-red-400';
    const accentActive = isBlue ? 'bg-blue-900/60 border-blue-400 text-white' : 'bg-red-900/60 border-red-400 text-white';

    const defLineDescriptions = [
      '1 - Deep Drop (Inside area closing all space)',
      '2 - Low-Mid Block',
      '3 - Balanced Midfield Line',
      '4 - High Line Press',
      '5 - High Press at Halfway Line',
    ];

    const compactnessDescriptions = [
      '1 - Dispersed (Wide pitch coverage)',
      '2 - Moderate Spacing',
      '3 - Compact (Arteta controlled possession)',
      '4 - Ultra Compact (Catenaccio box wall)',
    ];

    return (
      <div className="space-y-4">
        {/* Presets Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono text-slate-300">
            <span className="font-bold flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>TACTICAL PHILOSOPHY PRESETS</span>
            </span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${currentPlaystyle === 'custom' ? 'bg-amber-950/70 border-amber-400 text-amber-300' : `${accentBg}/30 ${accentBorder} ${accentText}`}`}>
              {currentPlaystyle === 'custom' ? '★ CUSTOM TACTICS' : PLAYSTYLE_DEFINITIONS[currentPlaystyle]?.name.toUpperCase() || 'PRESET'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5">
            {CANONICAL_PLAYSTYLES.map(key => {
              const def = PLAYSTYLE_DEFINITIONS[key];
              const isSelected = currentPlaystyle === key;
              return (
                <button
                  key={key}
                  type="button"
                  tabIndex={-1}
                  onClick={() => onSelectPreset(key)}
                  className={`py-1.5 px-2 rounded text-left border text-[10px] font-mono transition-all flex flex-col justify-between ${
                    isSelected
                      ? `${accentActive} ring-1 ${isBlue ? 'ring-blue-400' : 'ring-red-400'} shadow font-bold`
                      : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-600 hover:text-white'
                  }`}
                >
                  <span className="truncate">{def.name}</span>
                  <span className="text-[8px] text-slate-400 opacity-80 truncate">{def.subtitle}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2 CATEGORIES: DEFENSE & ATTACK */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* ======================================================== */}
          {/* CATEGORY 1: DEFENSIVE TACTICS */}
          {/* ======================================================== */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3.5 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>DEFENSIVE CATEGORY</span>
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">4 SETTINGS</span>
            </div>

            {/* 1. Defensive Line Slider (5 Levels) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200">Defensive Line Depth</span>
                <span className={`font-mono text-[11px] font-bold ${accentText}`}>
                  Level {tactics.defensiveLine} / 5
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={tactics.defensiveLine}
                onChange={e => onUpdate('defensiveLine', parseInt(e.target.value) as DefensiveLineLevel)}
                className="w-full accent-amber-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="text-[10px] font-mono text-slate-400 bg-slate-900/90 px-2 py-1 rounded border border-slate-800 flex items-center justify-between">
                <span>{defLineDescriptions[tactics.defensiveLine - 1]}</span>
              </div>
            </div>

            {/* 2. Style (Marking, Mixed, Zonal) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200">Defensive Style</span>
                <span className="font-mono text-[10px] text-slate-400">1v1 vs Zonal</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {(['marking', 'mixed', 'zonal'] as DefensiveStyle[]).map(s => (
                  <button
                    key={s}
                    type="button"
                    tabIndex={-1}
                    onClick={() => onUpdate('defensiveStyle', s)}
                    className={`py-1.5 px-2 rounded border text-[10px] font-mono text-center transition-all ${
                      tactics.defensiveStyle === s
                        ? `${accentActive} font-bold shadow`
                        : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    {s === 'marking' && 'Marking (1v1)'}
                    {s === 'mixed' && 'Mixed'}
                    {s === 'zonal' && 'Zonal'}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                {tactics.defensiveStyle === 'marking' && 'Focus on 1v1 man-to-man physical duels. Closest presses, others mark rivals tightly.'}
                {tactics.defensiveStyle === 'mixed' && 'Closest presses, next 2 close passing lanes, and others mark runners.'}
                {tactics.defensiveStyle === 'zonal' && 'Cut off passing lanes and protect dangerous zones (protect center and penalty box).'}
              </p>
            </div>

            {/* 3. Offside Trap (YES / NO) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200">Offside Trap</span>
                <span className="font-mono text-[10px] text-slate-400">Step up offside trap</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => onUpdate('offsideTrap', true)}
                  className={`py-1.5 px-3 rounded border text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 ${
                    tactics.offsideTrap
                      ? 'border-emerald-500 bg-emerald-950/70 text-emerald-300 shadow'
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span>YES (Step Up)</span>
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => onUpdate('offsideTrap', false)}
                  className={`py-1.5 px-3 rounded border text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 ${
                    !tactics.offsideTrap
                      ? 'border-slate-600 bg-slate-800 text-white shadow'
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span>NO (Drop Safe)</span>
                </button>
              </div>
            </div>

            {/* 4. Compactness (1 to 4) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200">Compactness</span>
                <span className={`font-mono text-[11px] font-bold ${accentText}`}>
                  Level {tactics.compactness} / 4
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {([1, 2, 3, 4] as DefensiveCompactness[]).map(lvl => (
                  <button
                    key={lvl}
                    type="button"
                    tabIndex={-1}
                    onClick={() => onUpdate('compactness', lvl)}
                    className={`py-1.5 rounded border text-[10px] font-mono text-center transition-all ${
                      tactics.compactness === lvl
                        ? `${accentActive} font-bold shadow`
                        : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    Lvl {lvl}
                  </button>
                ))}
              </div>
              <p className="text-[10px] font-mono text-slate-400 bg-slate-900/90 px-2 py-1 rounded border border-slate-800">
                {compactnessDescriptions[tactics.compactness - 1]}
              </p>
            </div>
          </div>

          {/* ======================================================== */}
          {/* CATEGORY 2: ATTACKING TACTICS */}
          {/* ======================================================== */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3.5 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>ATTACKING CATEGORY</span>
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">4 SETTINGS</span>
            </div>

            {/* 1. Creation (Short, Mixed, Long) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200">Creation</span>
                <span className="font-mono text-[10px] text-slate-400">Chance creation</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {(['short', 'mixed', 'long'] as AttackingCreation[]).map(c => (
                  <button
                    key={c}
                    type="button"
                    tabIndex={-1}
                    onClick={() => onUpdate('creation', c)}
                    className={`py-1.5 px-2 rounded border text-[10px] font-mono text-center transition-all ${
                      tactics.creation === c
                        ? `${accentActive} font-bold shadow`
                        : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    {c.toUpperCase()}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                {tactics.creation === 'short' && 'Short passes and combination triangles to create openings.'}
                {tactics.creation === 'mixed' && 'Balanced mix of short passes, through balls, and direct switches.'}
                {tactics.creation === 'long' && 'Direct towering long balls and route one passes to strikers.'}
              </p>
            </div>

            {/* 2. Final Third (Early Shoot, Crossing, Secure) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200">Final Third</span>
                <span className="font-mono text-[10px] text-slate-400">Finishing action</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {(['early_shoot', 'crossing', 'secure'] as AttackingFinalThird[]).map(f => (
                  <button
                    key={f}
                    type="button"
                    tabIndex={-1}
                    onClick={() => onUpdate('finalThird', f)}
                    className={`py-1.5 px-1.5 rounded border text-[10px] font-mono text-center transition-all ${
                      tactics.finalThird === f
                        ? `${accentActive} font-bold shadow`
                        : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    {f === 'early_shoot' && 'Early Shoot'}
                    {f === 'crossing' && 'Crossing'}
                    {f === 'secure' && 'Secure'}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                {tactics.finalThird === 'early_shoot' && 'Shoots whenever in range (Gegenpressing, Catenaccio).'}
                {tactics.finalThird === 'crossing' && 'Crosses often into the box for headers and volleys.'}
                {tactics.finalThird === 'secure' && 'Works close into box, only shoots on clear target (Tiki-Taka).'}
              </p>
            </div>

            {/* 3. Shape (Total Football, Free, Relational, Strict) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200">Shape</span>
                <span className="font-mono text-[10px] text-slate-400">Position interchange</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                {(['total_football', 'free', 'relational', 'strict'] as AttackingShape[]).map(sh => (
                  <button
                    key={sh}
                    type="button"
                    tabIndex={-1}
                    onClick={() => onUpdate('shape', sh)}
                    className={`py-1.5 px-1 rounded border text-[10px] font-mono text-center transition-all ${
                      tactics.shape === sh
                        ? `${accentActive} font-bold shadow`
                        : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    {sh === 'total_football' && 'Total Football'}
                    {sh === 'free' && 'Free'}
                    {sh === 'relational' && 'Relational'}
                    {sh === 'strict' && 'Strict'}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                {tactics.shape === 'total_football' && 'Fluid position swapping: striker drops to cover advancing midfielder.'}
                {tactics.shape === 'free' && 'Free roaming across pitch; only defense maintains strict line shape.'}
                {tactics.shape === 'relational' && 'Players gather closer to ball carrier to form overloads & triangles.'}
                {tactics.shape === 'strict' && 'Players strictly hold designated formation coordinates.'}
              </p>
            </div>

            {/* 4. Runs (All Attack, Moderate, Low, All Defend) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200">Runs</span>
                <span className="font-mono text-[10px] text-slate-400">Supporting runs</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                {(['all_attack', 'moderate', 'low', 'all_defend'] as AttackingRuns[]).map(r => (
                  <button
                    key={r}
                    type="button"
                    tabIndex={-1}
                    onClick={() => onUpdate('runs', r)}
                    className={`py-1.5 px-1 rounded border text-[10px] font-mono text-center transition-all ${
                      tactics.runs === r
                        ? `${accentActive} font-bold shadow`
                        : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    {r === 'all_attack' && 'All Attack'}
                    {r === 'moderate' && 'Moderate'}
                    {r === 'low' && 'Low'}
                    {r === 'all_defend' && 'All Defend'}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                {tactics.runs === 'all_attack' && 'Many teammates rush forward making penetrating runs (Gegenpress).'}
                {tactics.runs === 'moderate' && '2-3 supporting players make forward runs (Tiki-Taka).'}
                {tactics.runs === 'low' && 'Only attackers and CAM join attacks.'}
                {tactics.runs === 'all_defend' && 'Only ball carrier and 1 teammate join; all others stay back defending.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      tabIndex={-1}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4"
    >
      <div className="relative w-full max-w-5xl bg-slate-900 border-2 border-amber-400/80 rounded-lg shadow-2xl flex flex-col max-h-[94vh] overflow-hidden text-slate-100 font-['Outfit',sans-serif]">
        {/* Header */}
        <div className="px-5 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 bg-amber-400 rounded-sm animate-pulse" />
            <h2 className="font-['Press_Start_2P'] text-xs sm:text-sm text-amber-400 tracking-wider">
              MATCH SETUP & ADVANCED TACTICS
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {onOpenGamePlan && (
              <button
                type="button"
                onClick={onOpenGamePlan}
                className="px-2.5 py-1 text-[9px] font-['Press_Start_2P'] bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded flex items-center gap-1.5 transition active:scale-95 shadow cursor-pointer"
                title="Open 32-Bit Dual-Pitch Game Plan & Roles"
              >
                <Users className="w-3 h-3 text-slate-950" />
                <span>GAME PLAN</span>
              </button>
            )}
            {onOpenPresentation && (
              <button
                type="button"
                onClick={onOpenPresentation}
                className="px-2.5 py-1 text-[9px] font-['Press_Start_2P'] bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/60 rounded flex items-center gap-1.5 transition active:scale-95 shadow cursor-pointer"
                title="Open 32-Bit Split-Screen Presentation & Modular Kit Mixer"
              >
                <span>👕 PRESENTATION</span>
              </button>
            )}
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <Swords className="w-4 h-4 text-amber-400" />
              <span>11v11 ARCADE PRO</span>
            </div>
          </div>
        </div>

        {/* Phase 13: Hierarchical Matchup Banner & Team Selectors */}
        <div className="bg-slate-950/95 border-b border-slate-800 px-3 sm:px-5 py-2.5 sm:py-3 flex flex-col md:flex-row items-center justify-between gap-2.5 sm:gap-3 shrink-0 shadow-inner">
          {/* HOME TEAM CARD */}
          <div className="flex-1 w-full bg-slate-900/90 border border-blue-500/50 hover:border-blue-400 rounded-lg p-2.5 sm:p-3 flex items-center justify-between gap-3 shadow-md transition">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-full border-2 border-blue-400 flex items-center justify-center text-lg font-bold shrink-0 shadow"
                style={{ backgroundColor: homeTeam.badge.bg || '#0055b8', color: homeTeam.badge.primaryColor || '#ffffff' }}
              >
                {homeTeam.badge.icon || homeTeam.badge.text || '🏠'}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-xs sm:text-sm text-white truncate drop-shadow">{homeTeam.name}</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-950 border border-blue-400/50 text-blue-300 font-bold">
                    Tier {homeTeam.ratingTier}
                  </span>
                  <span className="text-[10px] text-amber-400 font-mono">
                    {homeTeam.ratingTier === 'S' ? '★★★★★' : homeTeam.ratingTier === 'A' ? '★★★★☆' : homeTeam.ratingTier === 'B' ? '★★★☆☆' : '★★☆☆☆'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] font-mono text-slate-400 mt-0.5">
                  <span className="truncate">{homeTeam.country}</span>
                  <span>•</span>
                  <span className="text-emerald-400 font-bold">OVR {homeTeam.averageOvr}</span>
                  <span>•</span>
                  <span className="text-amber-300 font-semibold">{homeTeam.preferredFormation}</span>
                </div>
                {/* Kit swatch preview */}
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[8px] font-mono text-slate-400 mr-0.5">KIT:</span>
                  <span className="w-2.5 h-2.5 rounded-full border border-white/60 shadow-xs" style={{ backgroundColor: homeTeam.kit.primaryColor }} title="Shirt" />
                  <span className="w-2.5 h-2.5 rounded-full border border-white/60 shadow-xs" style={{ backgroundColor: homeTeam.kit.secondaryColor }} title="Trim" />
                  <span className="w-2.5 h-2.5 rounded-full border border-white/60 shadow-xs" style={{ backgroundColor: homeTeam.kit.shortsColor }} title="Shorts" />
                </div>
              </div>
            </div>
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setTeamSelectorSide('home')}
              className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-['Press_Start_2P'] text-[8px] sm:text-[9px] font-bold tracking-wider transition shadow cursor-pointer shrink-0 border border-blue-400"
            >
              CHANGE
            </button>
          </div>

          {/* VS & INSTANT RANDOM MATCHUP BUTTON */}
          <div className="flex flex-row md:flex-col items-center justify-center gap-1.5 sm:gap-2 shrink-0">
            <div className="font-['Press_Start_2P'] text-[10px] sm:text-xs text-amber-400 tracking-widest drop-shadow px-2">
              VS
            </div>
            <button
              type="button"
              tabIndex={-1}
              onClick={handleRandomizeMatchup}
              title="Roll random home and away teams instantly"
              className="px-2.5 py-1.5 rounded bg-slate-900 border border-amber-500/60 hover:border-amber-400 text-amber-300 hover:text-white font-['Press_Start_2P'] text-[8px] font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow"
            >
              <Dices className="w-3.5 h-3.5 text-amber-400" />
              <span>RANDOM</span>
            </button>
          </div>

          {/* AWAY TEAM CARD */}
          <div className="flex-1 w-full bg-slate-900/90 border border-red-500/50 hover:border-red-400 rounded-lg p-2.5 sm:p-3 flex items-center justify-between gap-3 shadow-md transition">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-full border-2 border-red-400 flex items-center justify-center text-lg font-bold shrink-0 shadow"
                style={{ backgroundColor: awayTeam.badge.bg || '#991b1b', color: awayTeam.badge.primaryColor || '#ffffff' }}
              >
                {awayTeam.badge.icon || awayTeam.badge.text || '🚩'}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-xs sm:text-sm text-white truncate drop-shadow">{awayTeam.name}</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-red-950 border border-red-400/50 text-red-300 font-bold">
                    Tier {awayTeam.ratingTier}
                  </span>
                  <span className="text-[10px] text-amber-400 font-mono">
                    {awayTeam.ratingTier === 'S' ? '★★★★★' : awayTeam.ratingTier === 'A' ? '★★★★☆' : awayTeam.ratingTier === 'B' ? '★★★☆☆' : '★★☆☆☆'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] font-mono text-slate-400 mt-0.5">
                  <span className="truncate">{awayTeam.country}</span>
                  <span>•</span>
                  <span className="text-emerald-400 font-bold">OVR {awayTeam.averageOvr}</span>
                  <span>•</span>
                  <span className="text-amber-300 font-semibold">{awayTeam.preferredFormation}</span>
                </div>
                {/* Kit swatch preview */}
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[8px] font-mono text-slate-400 mr-0.5">KIT:</span>
                  <span className="w-2.5 h-2.5 rounded-full border border-white/60 shadow-xs" style={{ backgroundColor: awayTeam.kit.primaryColor }} title="Shirt" />
                  <span className="w-2.5 h-2.5 rounded-full border border-white/60 shadow-xs" style={{ backgroundColor: awayTeam.kit.secondaryColor }} title="Trim" />
                  <span className="w-2.5 h-2.5 rounded-full border border-white/60 shadow-xs" style={{ backgroundColor: awayTeam.kit.shortsColor }} title="Shorts" />
                </div>
              </div>
            </div>
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setTeamSelectorSide('away')}
              className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded bg-red-600 hover:bg-red-500 active:scale-95 text-white font-['Press_Start_2P'] text-[8px] sm:text-[9px] font-bold tracking-wider transition shadow cursor-pointer shrink-0 border border-red-400"
            >
              CHANGE
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 text-xs sm:text-sm font-semibold tracking-wide">
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setActiveTab('home')}
            className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'home'
                ? 'border-blue-500 text-blue-400 bg-blue-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-4 h-4 text-blue-400" />
            <span>USER TACTICS ({homeTeam.shortName})</span>
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setActiveTab('away')}
            className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'away'
                ? 'border-red-500 text-red-400 bg-red-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-4 h-4 text-red-400" />
            <span>RIVAL TACTICS ({awayTeam.shortName})</span>
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setActiveTab('squads')}
            className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'squads'
                ? 'border-yellow-400 text-yellow-300 bg-yellow-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span>⚡ SQUADS & STATS</span>
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setActiveTab('stadium')}
            className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'stadium'
                ? 'border-emerald-400 text-emerald-300 bg-emerald-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4 text-emerald-400" />
            <span>🏟️ STADIUM & PITCH</span>
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setActiveTab('match')}
            className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'match'
                ? 'border-amber-400 text-amber-300 bg-amber-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-400" />
            <span>RULES & TIME</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-3 sm:p-5 overflow-y-auto flex-1 space-y-5">
          {activeTab === 'home' && (
            <div className="space-y-5">
              {/* Top Row: Formation Picker & Diagram */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 flex flex-col md:flex-row items-center gap-4">
                <div className="flex flex-col items-center">
                  <span className="text-[11px] font-mono font-bold text-slate-400 mb-1">
                    FORMATION: {homeFormation}
                  </span>
                  {renderFormationPitchPreview(homeFormation, true)}
                </div>
                <div className="flex-1 w-full space-y-2">
                  <div className="text-xs font-mono font-bold text-slate-300">
                    SELECT BASE FORMATION
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                    {FORMATION_LIST.map(f => (
                      <button
                        key={f.id}
                        type="button"
                        tabIndex={-1}
                        onClick={() => setHomeFormation(f.id)}
                        className={`p-2 text-center rounded border transition-all text-xs font-mono ${
                          homeFormation === f.id
                            ? 'border-blue-400 bg-blue-900/60 text-white font-bold shadow'
                            : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <div>{f.id}</div>
                        <div className="text-[9px] text-slate-400 opacity-80">{f.tag}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Detailed Tactics Editor */}
              {renderDetailedTacticsControls(
                homeTactics,
                homePlaystyle,
                handleUpdateHomeTactics,
                handleSelectHomePreset,
                'blue'
              )}
            </div>
          )}

          {activeTab === 'away' && (
            <div className="space-y-5">
              {/* Top Row: Formation Picker & Diagram */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 flex flex-col md:flex-row items-center gap-4">
                <div className="flex flex-col items-center">
                  <span className="text-[11px] font-mono font-bold text-slate-400 mb-1">
                    RIVAL FORMATION: {awayFormation}
                  </span>
                  {renderFormationPitchPreview(awayFormation, false)}
                </div>
                <div className="flex-1 w-full space-y-2">
                  <div className="text-xs font-mono font-bold text-slate-300">
                    SELECT RIVAL BASE FORMATION
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                    {FORMATION_LIST.map(f => (
                      <button
                        key={f.id}
                        type="button"
                        tabIndex={-1}
                        onClick={() => setAwayFormation(f.id)}
                        className={`p-2 text-center rounded border transition-all text-xs font-mono ${
                          awayFormation === f.id
                            ? 'border-red-400 bg-red-900/60 text-white font-bold shadow'
                            : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <div>{f.id}</div>
                        <div className="text-[9px] text-slate-400 opacity-80">{f.tag}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Detailed Tactics Editor */}
              {renderDetailedTacticsControls(
                awayTactics,
                awayPlaystyle,
                handleUpdateAwayTactics,
                handleSelectAwayPreset,
                'red'
              )}
            </div>
          )}

          {activeTab === 'squads' && (
            <div className="space-y-6 max-w-4xl mx-auto py-2">
              <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-yellow-400" />
                    <h3 className="font-semibold text-sm text-slate-100 font-mono">
                      ⚡ CANONICAL PROGRESSION TIERS & STAT BREAKS
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-yellow-950/80 border border-yellow-500/50 text-yellow-300 font-bold">
                    RATINGS 40 - 105
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs font-mono">
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-400">
                    <div className="font-bold text-slate-300">AMATEUR</div>
                    <div className="text-[10px] opacity-75">40 - 59</div>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300">
                    <div className="font-bold text-blue-400">PRO</div>
                    <div className="text-[10px] opacity-75">60 - 79</div>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-200">
                    <div className="font-bold text-emerald-400">ELITE</div>
                    <div className="text-[10px] opacity-75">80 - 94</div>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-100">
                    <div className="font-bold text-purple-400">PINNACLE</div>
                    <div className="text-[10px] opacity-75">95 - 99</div>
                  </div>
                  <div className="p-2 rounded bg-yellow-950/60 border border-yellow-500/60 text-yellow-300 font-bold col-span-2 sm:col-span-1 shadow">
                    <div>⚡ STAT BREAK</div>
                    <div className="text-[10px] text-yellow-400">100+ (&gt;99)</div>
                  </div>
                </div>
              </div>

              {/* Home Squad Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-blue-900/60 pb-2">
                  <h4 className="text-sm font-mono font-bold text-blue-400 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-400" />
                    <span>HOME SQUAD ROSTER ({homeTeam.name.toUpperCase()})</span>
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                    <span className="text-emerald-400 font-bold">AVG OVR: {homeTeam.averageOvr}</span>
                    <span>•</span>
                    <span>TIER {homeTeam.ratingTier}</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {homeTeam.players.map(p => {
                    const role = p.role;
                    const stats = p.canonicalStats;
                    const subPos = p.subPosition || resolveSubPositionForSlot(role as PlayerRole, homeFormation);
                    const subMeta = SUB_POSITION_DEFINITIONS[subPos] || SUB_POSITION_DEFINITIONS.CM;
                    const primary = subMeta.primary;
                    const playerOvr = calculatePlayerOvr(stats, role);
                    const isCaptain = homeTeam.roles?.captainId === p.id || p.isCaptain;
                    const isPK = homeTeam.roles?.penaltyTakerId === p.id;
                    const isFK = homeTeam.roles?.freeKickNearId === p.id || homeTeam.roles?.freeKickLongId === p.id;
                    const isCK = homeTeam.roles?.leftCornerTakerId === p.id || homeTeam.roles?.rightCornerTakerId === p.id;

                    const currentPlaystyleKey = homePlayerPlaystyles[role] || p.playstyle || subMeta.allowedPlaystyles[0];
                    const playstyleDef = PLAYSTYLE_DEFINITIONS_DETAILED[currentPlaystyleKey] || PLAYSTYLE_DEFINITIONS_DETAILED.balanced_fb;
                    const allowedPlaystyles = subMeta.allowedPlaystyles;
                    const isEditing = editingRole === `home_${role}`;

                    // Stat break checks (> 99)
                    const breaks: Array<{ stat: string; val: number; trait: string }> = [];
                    if (stats) {
                      for (const [k, v] of Object.entries(stats)) {
                        if (typeof v === 'number' && v > 99) {
                          breaks.push({ stat: k.toUpperCase(), val: v, trait: getAttributeStatBreakName(k) });
                        }
                      }
                    }

                    const primaryBadgeClass =
                      primary === 'ATT'
                        ? 'bg-rose-950/90 text-rose-300 border-rose-600/60'
                        : primary === 'MID'
                        ? 'bg-emerald-950/90 text-emerald-300 border-emerald-600/60'
                        : primary === 'DEF'
                        ? 'bg-sky-950/90 text-sky-300 border-sky-600/60'
                        : 'bg-amber-950/90 text-amber-300 border-amber-600/60';

                    const ovrColorClass =
                      playerOvr >= 95
                        ? 'bg-purple-950/90 border-purple-400 text-purple-300'
                        : playerOvr >= 85
                        ? 'bg-emerald-950/90 border-emerald-400 text-emerald-300'
                        : playerOvr >= 75
                        ? 'bg-blue-950/90 border-blue-400 text-blue-300'
                        : 'bg-slate-900 border-slate-700 text-slate-300';

                    return (
                      <div
                        key={p.id}
                        className={`p-3 rounded-lg border flex flex-col justify-between transition-all ${
                          breaks.length > 0
                            ? 'bg-slate-900/90 border-yellow-500/40 shadow-sm shadow-yellow-500/5'
                            : 'bg-slate-950/70 border-slate-800'
                        }`}
                      >
                        {/* Player Header Row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="w-5 h-5 rounded bg-blue-900/80 border border-blue-500/50 flex items-center justify-center text-[10px] font-mono font-bold text-blue-300">
                              #{p.number}
                            </span>
                            <span className="font-bold text-sm text-slate-100">{p.name}</span>
                            {/* Primary Position Badge */}
                            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${primaryBadgeClass}`}>
                              {primary}
                            </span>
                            {/* Sub-Position Badge */}
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-300 font-bold">
                              {subPos}
                            </span>
                            {/* OVR Rating Pill */}
                            <span className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded border ${ovrColorClass}`}>
                              {playerOvr} OVR
                            </span>
                            {/* Authoritative Role Badges */}
                            {isCaptain && (
                              <span className="text-[8px] font-mono font-black px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 shadow-xs" title="Team Captain">
                                (C)
                              </span>
                            )}
                            {isPK && (
                              <span className="text-[8px] font-mono font-bold px-1 py-0.5 rounded bg-rose-950 border border-rose-500 text-rose-300" title="Penalty Taker">
                                PK
                              </span>
                            )}
                            {isFK && (
                              <span className="text-[8px] font-mono font-bold px-1 py-0.5 rounded bg-cyan-950 border border-cyan-500 text-cyan-300" title="Free Kick Specialist">
                                FK
                              </span>
                            )}
                            {isCK && (
                              <span className="text-[8px] font-mono font-bold px-1 py-0.5 rounded bg-emerald-950 border border-emerald-500 text-emerald-300" title="Corner Kick Taker">
                                CK
                              </span>
                            )}
                          </div>
                          {breaks.length > 0 && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-yellow-950 border border-yellow-500 text-yellow-300 font-bold flex items-center gap-1 animate-pulse">
                              <span>⚡</span>
                              <span>BREAKTHROUGH</span>
                            </span>
                          )}
                        </div>

                        {/* Canonical Stat Calibration Strip */}
                        <div className="mt-2 grid grid-cols-6 gap-1 text-[9px] font-mono bg-slate-900/60 p-1.5 rounded border border-slate-800 text-center">
                          {role === 'GK' ? (
                            <>
                              <div><span className="text-slate-400">DIV</span> <strong className="text-amber-300">{(stats as any).div || 75}</strong></div>
                              <div><span className="text-slate-400">HAN</span> <strong className="text-amber-300">{(stats as any).han || 75}</strong></div>
                              <div><span className="text-slate-400">KCK</span> <strong className="text-amber-300">{(stats as any).kck || 75}</strong></div>
                              <div><span className="text-slate-400">REF</span> <strong className="text-amber-300">{(stats as any).ref || 75}</strong></div>
                              <div><span className="text-slate-400">POS</span> <strong className="text-amber-300">{(stats as any).pos || 75}</strong></div>
                              <div><span className="text-slate-400">SPD</span> <strong className="text-amber-300">{(stats as any).spd || 60}</strong></div>
                            </>
                          ) : (
                            <>
                              <div><span className="text-slate-400">PAC</span> <strong className="text-amber-300">{(stats as any).pac || 75}</strong></div>
                              <div><span className="text-slate-400">SHO</span> <strong className="text-amber-300">{(stats as any).sho || 75}</strong></div>
                              <div><span className="text-slate-400">PAS</span> <strong className="text-amber-300">{(stats as any).spa || 75}</strong></div>
                              <div><span className="text-slate-400">DRI</span> <strong className="text-amber-300">{(stats as any).dri || 75}</strong></div>
                              <div><span className="text-slate-400">DEF</span> <strong className="text-amber-300">{(stats as any).tck || 75}</strong></div>
                              <div><span className="text-slate-400">PHY</span> <strong className="text-amber-300">{(stats as any).str || 75}</strong></div>
                            </>
                          )}
                        </div>

                        {/* Playstyle Selection & Identity */}
                        <div className="mt-2 pt-2 border-t border-slate-800/80">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-mono text-slate-400">PLAYSTYLE:</span>
                            <button
                              type="button"
                              tabIndex={-1}
                              onClick={() => setEditingRole(isEditing ? null : `home_${role}`)}
                              className="px-2 py-1 rounded bg-slate-900 border border-amber-500/50 hover:border-amber-400 text-amber-300 text-xs font-mono font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
                            >
                              <span>{playstyleDef.icon}</span>
                              <span>{playstyleDef.name}</span>
                              <span className="text-[10px] text-slate-400 font-normal">({playstyleDef.tag})</span>
                              <ChevronRight className={`w-3 h-3 text-amber-400 transition-transform ${isEditing ? 'rotate-90' : ''}`} />
                            </button>
                          </div>

                          {/* Interactive Playstyle Picker Dropdown */}
                          {isEditing && (
                            <div className="my-2 p-2 rounded bg-slate-950 border border-slate-700 space-y-1.5 animate-in fade-in duration-100">
                              <div className="text-[10px] font-mono text-slate-400 flex justify-between items-center pb-1 border-b border-slate-800">
                                <span>SELECT PLAYSTYLE FOR {subPos} ({subMeta.name}):</span>
                                <span className="text-[9px] text-amber-400">{allowedPlaystyles.length} Archetypes</span>
                              </div>
                              <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto pr-1">
                                {allowedPlaystyles.map(psKey => {
                                  const def = PLAYSTYLE_DEFINITIONS_DETAILED[psKey];
                                  if (!def) return null;
                                  const isSelected = psKey === currentPlaystyleKey;
                                  return (
                                    <button
                                      key={psKey}
                                      type="button"
                                      tabIndex={-1}
                                      onClick={() => {
                                        setHomePlayerPlaystyles(prev => ({ ...prev, [role]: psKey }));
                                        onUpdatePlayerPlaystyle?.(`home_${role}`, psKey);
                                        setEditingRole(null);
                                      }}
                                      className={`p-1.5 rounded text-left border transition text-xs font-mono flex flex-col gap-0.5 cursor-pointer ${
                                        isSelected
                                          ? 'border-amber-400 bg-amber-950/50 text-white'
                                          : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 font-bold">
                                          <span>{def.icon}</span>
                                          <span className={isSelected ? 'text-amber-300' : 'text-slate-200'}>{def.name}</span>
                                          <span className="text-[10px] font-normal text-slate-400">• {def.tag}</span>
                                        </div>
                                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                                      </div>
                                      <div className="text-[10px] text-slate-400 line-clamp-1">{def.description}</div>
                                      <div className="text-[9px] text-slate-500 font-sans italic">
                                        Modern: {def.archetypes.modern} | Legends: {def.archetypes.legends}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Active Playstyle Archetypes & Mechanical Effect */}
                          <div className="mt-1 space-y-1">
                            <p className="text-[10px] text-slate-300 leading-tight">
                              <span className="text-amber-400/90 font-semibold">{playstyleDef.description}</span>
                            </p>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[9px] font-mono text-slate-400 gap-0.5">
                              <span className="truncate">⭐ {playstyleDef.archetypes.modern} / {playstyleDef.archetypes.legends}</span>
                              <span className="text-emerald-400 font-semibold shrink-0">⚡ {playstyleDef.mechanicalEffect}</span>
                            </div>
                          </div>
                        </div>

                        {/* Stat Break Badges */}
                        {breaks.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-slate-800/80 space-y-1">
                            {breaks.map((b, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs font-mono">
                                <span className="text-yellow-400 font-bold">{b.stat}: {b.val}</span>
                                <span className="text-yellow-200 text-[11px] truncate max-w-[210px] font-semibold">{b.trait}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Away Squad Grid */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-red-900/60 pb-2">
                  <h4 className="text-sm font-mono font-bold text-red-400 flex items-center gap-2">
                    <Flame className="w-4 h-4 text-red-400" />
                    <span>AWAY SQUAD ROSTER ({awayTeam.name.toUpperCase()})</span>
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                    <span className="text-emerald-400 font-bold">AVG OVR: {awayTeam.averageOvr}</span>
                    <span>•</span>
                    <span>TIER {awayTeam.ratingTier}</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {awayTeam.players.map(p => {
                    const role = p.role;
                    const stats = p.canonicalStats;
                    const subPos = p.subPosition || resolveSubPositionForSlot(role as PlayerRole, awayFormation);
                    const subMeta = SUB_POSITION_DEFINITIONS[subPos] || SUB_POSITION_DEFINITIONS.CM;
                    const primary = subMeta.primary;
                    const playerOvr = calculatePlayerOvr(stats, role);
                    const isCaptain = awayTeam.roles?.captainId === p.id || p.isCaptain;
                    const isPK = awayTeam.roles?.penaltyTakerId === p.id;
                    const isFK = awayTeam.roles?.freeKickNearId === p.id || awayTeam.roles?.freeKickLongId === p.id;
                    const isCK = awayTeam.roles?.leftCornerTakerId === p.id || awayTeam.roles?.rightCornerTakerId === p.id;

                    const currentPlaystyleKey = awayPlayerPlaystyles[role] || p.playstyle || subMeta.allowedPlaystyles[0];
                    const playstyleDef = PLAYSTYLE_DEFINITIONS_DETAILED[currentPlaystyleKey] || PLAYSTYLE_DEFINITIONS_DETAILED.balanced_fb;
                    const allowedPlaystyles = subMeta.allowedPlaystyles;
                    const isEditing = editingRole === `away_${role}`;

                    // Stat break checks (> 99)
                    const breaks: Array<{ stat: string; val: number; trait: string }> = [];
                    if (stats) {
                      for (const [k, v] of Object.entries(stats)) {
                        if (typeof v === 'number' && v > 99) {
                          breaks.push({ stat: k.toUpperCase(), val: v, trait: getAttributeStatBreakName(k) });
                        }
                      }
                    }

                    const primaryBadgeClass =
                      primary === 'ATT'
                        ? 'bg-rose-950/90 text-rose-300 border-rose-600/60'
                        : primary === 'MID'
                        ? 'bg-emerald-950/90 text-emerald-300 border-emerald-600/60'
                        : primary === 'DEF'
                        ? 'bg-sky-950/90 text-sky-300 border-sky-600/60'
                        : 'bg-amber-950/90 text-amber-300 border-amber-600/60';

                    const ovrColorClass =
                      playerOvr >= 95
                        ? 'bg-purple-950/90 border-purple-400 text-purple-300'
                        : playerOvr >= 85
                        ? 'bg-emerald-950/90 border-emerald-400 text-emerald-300'
                        : playerOvr >= 75
                        ? 'bg-blue-950/90 border-blue-400 text-blue-300'
                        : 'bg-slate-900 border-slate-700 text-slate-300';

                    return (
                      <div
                        key={p.id}
                        className={`p-3 rounded-lg border flex flex-col justify-between transition-all ${
                          breaks.length > 0
                            ? 'bg-slate-900/90 border-yellow-500/40 shadow-sm shadow-yellow-500/5'
                            : 'bg-slate-950/70 border-slate-800'
                        }`}
                      >
                        {/* Player Header Row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="w-5 h-5 rounded bg-red-900/80 border border-red-500/50 flex items-center justify-center text-[10px] font-mono font-bold text-red-300">
                              #{p.number}
                            </span>
                            <span className="font-bold text-sm text-slate-100">{p.name}</span>
                            {/* Primary Position Badge */}
                            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${primaryBadgeClass}`}>
                              {primary}
                            </span>
                            {/* Sub-Position Badge */}
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-300 font-bold">
                              {subPos}
                            </span>
                            {/* OVR Rating Pill */}
                            <span className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded border ${ovrColorClass}`}>
                              {playerOvr} OVR
                            </span>
                            {/* Authoritative Role Badges */}
                            {isCaptain && (
                              <span className="text-[8px] font-mono font-black px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 shadow-xs" title="Team Captain">
                                (C)
                              </span>
                            )}
                            {isPK && (
                              <span className="text-[8px] font-mono font-bold px-1 py-0.5 rounded bg-rose-950 border border-rose-500 text-rose-300" title="Penalty Taker">
                                PK
                              </span>
                            )}
                            {isFK && (
                              <span className="text-[8px] font-mono font-bold px-1 py-0.5 rounded bg-cyan-950 border border-cyan-500 text-cyan-300" title="Free Kick Specialist">
                                FK
                              </span>
                            )}
                            {isCK && (
                              <span className="text-[8px] font-mono font-bold px-1 py-0.5 rounded bg-emerald-950 border border-emerald-500 text-emerald-300" title="Corner Kick Taker">
                                CK
                              </span>
                            )}
                          </div>
                          {breaks.length > 0 && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-yellow-950 border border-yellow-500 text-yellow-300 font-bold flex items-center gap-1 animate-pulse">
                              <span>⚡</span>
                              <span>BREAKTHROUGH</span>
                            </span>
                          )}
                        </div>

                        {/* Canonical Stat Calibration Strip */}
                        <div className="mt-2 grid grid-cols-6 gap-1 text-[9px] font-mono bg-slate-900/60 p-1.5 rounded border border-slate-800 text-center">
                          {role === 'GK' ? (
                            <>
                              <div><span className="text-slate-400">DIV</span> <strong className="text-amber-300">{(stats as any).div || 75}</strong></div>
                              <div><span className="text-slate-400">HAN</span> <strong className="text-amber-300">{(stats as any).han || 75}</strong></div>
                              <div><span className="text-slate-400">KCK</span> <strong className="text-amber-300">{(stats as any).kck || 75}</strong></div>
                              <div><span className="text-slate-400">REF</span> <strong className="text-amber-300">{(stats as any).ref || 75}</strong></div>
                              <div><span className="text-slate-400">POS</span> <strong className="text-amber-300">{(stats as any).pos || 75}</strong></div>
                              <div><span className="text-slate-400">SPD</span> <strong className="text-amber-300">{(stats as any).spd || 60}</strong></div>
                            </>
                          ) : (
                            <>
                              <div><span className="text-slate-400">PAC</span> <strong className="text-amber-300">{(stats as any).pac || 75}</strong></div>
                              <div><span className="text-slate-400">SHO</span> <strong className="text-amber-300">{(stats as any).sho || 75}</strong></div>
                              <div><span className="text-slate-400">PAS</span> <strong className="text-amber-300">{(stats as any).spa || 75}</strong></div>
                              <div><span className="text-slate-400">DRI</span> <strong className="text-amber-300">{(stats as any).dri || 75}</strong></div>
                              <div><span className="text-slate-400">DEF</span> <strong className="text-amber-300">{(stats as any).tck || 75}</strong></div>
                              <div><span className="text-slate-400">PHY</span> <strong className="text-amber-300">{(stats as any).str || 75}</strong></div>
                            </>
                          )}
                        </div>

                        {/* Playstyle Selection & Identity */}
                        <div className="mt-2.5 pt-2 border-t border-slate-800/80">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-mono text-slate-400">PLAYSTYLE:</span>
                            <button
                              type="button"
                              tabIndex={-1}
                              onClick={() => setEditingRole(isEditing ? null : `away_${role}`)}
                              className="px-2 py-1 rounded bg-slate-900 border border-amber-500/50 hover:border-amber-400 text-amber-300 text-xs font-mono font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
                            >
                              <span>{playstyleDef.icon}</span>
                              <span>{playstyleDef.name}</span>
                              <span className="text-[10px] text-slate-400 font-normal">({playstyleDef.tag})</span>
                              <ChevronRight className={`w-3 h-3 text-amber-400 transition-transform ${isEditing ? 'rotate-90' : ''}`} />
                            </button>
                          </div>

                          {/* Interactive Playstyle Picker Dropdown */}
                          {isEditing && (
                            <div className="my-2 p-2 rounded bg-slate-950 border border-slate-700 space-y-1.5 animate-in fade-in duration-100">
                              <div className="text-[10px] font-mono text-slate-400 flex justify-between items-center pb-1 border-b border-slate-800">
                                <span>SELECT PLAYSTYLE FOR {subPos} ({subMeta.name}):</span>
                                <span className="text-[9px] text-amber-400">{allowedPlaystyles.length} Archetypes</span>
                              </div>
                              <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto pr-1">
                                {allowedPlaystyles.map(psKey => {
                                  const def = PLAYSTYLE_DEFINITIONS_DETAILED[psKey];
                                  if (!def) return null;
                                  const isSelected = psKey === currentPlaystyleKey;
                                  return (
                                    <button
                                      key={psKey}
                                      type="button"
                                      tabIndex={-1}
                                      onClick={() => {
                                        setAwayPlayerPlaystyles(prev => ({ ...prev, [role]: psKey }));
                                        onUpdatePlayerPlaystyle?.(`away_${role}`, psKey);
                                        setEditingRole(null);
                                      }}
                                      className={`p-1.5 rounded text-left border transition text-xs font-mono flex flex-col gap-0.5 cursor-pointer ${
                                        isSelected
                                          ? 'border-amber-400 bg-amber-950/50 text-white'
                                          : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 font-bold">
                                          <span>{def.icon}</span>
                                          <span className={isSelected ? 'text-amber-300' : 'text-slate-200'}>{def.name}</span>
                                          <span className="text-[10px] font-normal text-slate-400">• {def.tag}</span>
                                        </div>
                                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                                      </div>
                                      <div className="text-[10px] text-slate-400 line-clamp-1">{def.description}</div>
                                      <div className="text-[9px] text-slate-500 font-sans italic">
                                        Modern: {def.archetypes.modern} | Legends: {def.archetypes.legends}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Active Playstyle Archetypes & Mechanical Effect */}
                          <div className="mt-1 space-y-1">
                            <p className="text-[10px] text-slate-300 leading-tight">
                              <span className="text-amber-400/90 font-semibold">{playstyleDef.description}</span>
                            </p>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[9px] font-mono text-slate-400 gap-0.5">
                              <span className="truncate">⭐ {playstyleDef.archetypes.modern} / {playstyleDef.archetypes.legends}</span>
                              <span className="text-rose-400 font-semibold shrink-0">⚡ {playstyleDef.mechanicalEffect}</span>
                            </div>
                          </div>
                        </div>

                        {/* Stat Break Badges */}
                        {breaks.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-slate-800/80 space-y-1">
                            {breaks.map((b, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs font-mono">
                                <span className="text-yellow-400 font-bold">{b.stat}: {b.val}</span>
                                <span className="text-yellow-200 text-[11px] truncate max-w-[210px] font-semibold">{b.trait}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stadium' && (
            <div className="space-y-5 max-w-4xl mx-auto py-2">
              {/* Header Banner */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-emerald-400" />
                    <h3 className="font-semibold text-sm text-slate-100 font-mono">
                      🏟️ DYNAMIC STADIUMS & MATCH ATMOSPHERE
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-bold">
                    PHASE 10 ARCHITECTURE
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Select your match architecture, surrounding horizon skyline, time-of-day skybox lighting, and stand seat colors.
                </p>
              </div>

              {/* SECTION 1: 3 STADIUM ARCHITECTURES */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-200 font-mono flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-emerald-400" />
                    <span>1. STADIUM ARCHITECTURE & ENVIRONMENT</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">
                    {stadiumTier === 'monumental' ? 'ELITE GRAND ARENA' : stadiumTier === 'craven' ? 'HERITAGE ENGLISH GROUND' : 'ASCENSO MUNICIPAL'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Option 1: Monumental */}
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setStadiumTier('monumental')}
                    className={`p-3.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                      stadiumTier === 'monumental'
                        ? 'border-emerald-400 bg-emerald-950/50 text-white font-bold ring-1 ring-emerald-400/50 shadow-md'
                        : 'border-slate-800 bg-slate-900/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-emerald-300">ELITE GRAND ARENA</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-900/80 text-emerald-300 border border-emerald-500/40">"MONUMENTAL"</span>
                      </div>
                      <div className="text-[11px] text-slate-300 mt-1.5 font-semibold">
                        60,000+ seat triple-tier grandstands with cantilever canopies & VIP suites.
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 leading-snug space-y-0.5">
                        <div>• Modern animated LED ad hoardings</div>
                        <div>• Distant city skyline with lit glass skyscrapers</div>
                        <div>• Integrated modern tubular floodlight masts</div>
                        <div>• Sunken dugouts with luxury bucket seats</div>
                      </div>
                    </div>
                  </button>

                  {/* Option 2: Craven */}
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setStadiumTier('craven')}
                    className={`p-3.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                      stadiumTier === 'craven'
                        ? 'border-emerald-400 bg-emerald-950/50 text-white font-bold ring-1 ring-emerald-400/50 shadow-md'
                        : 'border-slate-800 bg-slate-900/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-amber-300">CLASSIC GROUND</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-900/80 text-amber-300 border border-amber-500/40">"CRAVEN STYLE"</span>
                      </div>
                      <div className="text-[11px] text-slate-300 mt-1.5 font-semibold">
                        Historic English heritage ground with red brick facades & gables.
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 leading-snug space-y-0.5">
                        <div>• Intimate steep stands close to touchlines</div>
                        <div>• Victorian terraced houses & church spires</div>
                        <div>• Classic criss-cross lattice steel floodlights</div>
                        <div>• Vintage hand-painted billboard sponsors</div>
                      </div>
                    </div>
                  </button>

                  {/* Option 3: Ascenso */}
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setStadiumTier('ascenso')}
                    className={`p-3.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                      stadiumTier === 'ascenso'
                        ? 'border-emerald-400 bg-emerald-950/50 text-white font-bold ring-1 ring-emerald-400/50 shadow-md'
                        : 'border-slate-800 bg-slate-900/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-rose-300">ASCENSO MUNICIPAL</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-900/80 text-rose-300 border border-rose-500/40">"RAW CONCRETE"</span>
                      </div>
                      <div className="text-[11px] text-slate-300 mt-1.5 font-semibold">
                        Raw Latin American 2nd-division ground with bare concrete steps.
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 leading-snug space-y-0.5">
                        <div>• Weathered concrete terraces & rusty iron roofs</div>
                        <div>• Wire mesh chain-link fencing separating fans</div>
                        <div>• Rolling hills, water tanks & industrial roofs</div>
                        <div>• Hand-painted local ads & spotlight poles</div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* SECTION 2: TIME OF DAY & SKYBOX LIGHTING */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-200 font-mono flex items-center gap-1.5">
                    <Sun className="w-4 h-4 text-amber-400" />
                    <span>2. MATCH LIGHTING & SKYBOX HORIZON</span>
                  </span>
                  <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">
                    {timeOfDay === 'dawn' ? '🌅 MORNING DAWN' : timeOfDay === 'noon' ? '☀️ HIGH NOON' : timeOfDay === 'sunset' ? '🌇 GOLDEN SUNSET' : '🌙 FLOODLIT NIGHT'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'dawn', label: 'Morning Dawn', icon: Sunrise, color: 'text-rose-300', desc: 'Soft pink/amber sunrise with angled shadows' },
                    { id: 'noon', label: 'High Noon', icon: Sun, color: 'text-amber-300', desc: 'Crisp azure sky, bright sun, puffy cumulus clouds' },
                    { id: 'sunset', label: 'Golden Sunset', icon: Sunset, color: 'text-orange-400', desc: 'Dramatic fiery orange/violet golden hour twilight' },
                    { id: 'night', label: 'Floodlit Night', icon: Moon, color: 'text-blue-300', desc: 'Deep indigo sky with glowing floodlight halos' },
                  ].map(t => {
                    const Icon = t.icon;
                    const isSelected = timeOfDay === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        tabIndex={-1}
                        onClick={() => setTimeOfDay(t.id as TimeOfDay)}
                        className={`p-3 rounded-md border text-left transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'border-amber-400 bg-amber-950/60 text-white font-bold ring-1 ring-amber-400/50 shadow'
                            : 'border-slate-800 bg-slate-900/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${t.color}`} />
                          <span className="text-xs font-mono font-bold">{t.label}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 leading-tight">{t.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 3: GRANDSTAND SEAT PALETTE */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-200 font-mono flex items-center gap-1.5">
                    <Palette className="w-4 h-4 text-purple-400" />
                    <span>3. STAND SEAT COLOR CUSTOMIZATION</span>
                  </span>
                  <span className="text-[10px] font-mono text-purple-400 font-bold uppercase">
                    {seatColor === 'auto' ? `CLUB COLORS (${HOME_KIT.shortName})` : seatColor}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
                  {[
                    { id: 'auto', label: 'Club Auto', swatch: HOME_KIT.primaryColor, desc: `${HOME_KIT.name} colors` },
                    { id: 'blue', label: 'Royal Blue', swatch: '#0284c7', desc: 'Molded plastic' },
                    { id: 'red', label: 'Crimson Red', swatch: '#dc2626', desc: 'Molded plastic' },
                    { id: 'yellow', label: 'Gold Yellow', swatch: '#eab308', desc: 'Molded plastic' },
                    { id: 'green', label: 'Pitch Green', swatch: '#16a34a', desc: 'Molded plastic' },
                    { id: 'white', label: 'Clean White', swatch: '#f8fafc', desc: 'Molded plastic' },
                    { id: 'wooden', label: 'Wood Slats', swatch: '#92400e', desc: 'Vintage timber' },
                    { id: 'concrete', label: 'Raw Concrete', swatch: '#64748b', desc: 'Stepped terrace' },
                  ].map(s => {
                    const isSelected = seatColor === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        tabIndex={-1}
                        onClick={() => setSeatColor(s.id as SeatColorMode)}
                        className={`p-2 rounded-md border text-center transition-all flex flex-col items-center justify-between gap-1 ${
                          isSelected
                            ? 'border-purple-400 bg-purple-950/60 text-white font-bold ring-1 ring-purple-400/50 shadow'
                            : 'border-slate-800 bg-slate-900/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        <div
                          className="w-5 h-5 rounded-full border border-slate-600 shadow-sm"
                          style={{ backgroundColor: s.swatch }}
                        />
                        <div className="text-[10px] font-mono font-bold truncate w-full">{s.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 4: FAN ATMOSPHERE & CURVA KOP PREVIEW */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Flag className="w-4 h-4 text-rose-400" />
                  <h4 className="font-semibold text-xs text-slate-200 font-mono">
                    CURVA / KOP ULTRAS & CLUB SUPPORTERS
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono text-slate-300 pt-1">
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800 space-y-1">
                    <div className="text-emerald-400 font-bold">CLUB SUPPORTERS</div>
                    <div className="text-[10px] text-slate-400">
                      Crowd sprites dynamically wear <strong className="text-blue-400">{HOME_KIT.name}</strong> jerseys & scarves, with dedicated away fans in <strong className="text-red-400">{AWAY_KIT.name}</strong> colors.
                    </div>
                  </div>
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800 space-y-1">
                    <div className="text-amber-400 font-bold">WAVING ULTRAS FLAGS</div>
                    <div className="text-[10px] text-slate-400">
                      Curva ultras wave massive team flags with procedural sine-wave cloth ripple physics (static on Performance tier).
                    </div>
                  </div>
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800 space-y-1">
                    <div className="text-rose-400 font-bold">PIXEL BANNERS & FLASHES</div>
                    <div className="text-[10px] text-slate-400">
                      32-bit pixel banners draped over barriers with club slogans ("FORZA RETRO", "100% PASSION") + camera flashbulbs.
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 5: IFAB PITCH DIMENSIONS & TACTICAL SYNERGIES */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-emerald-400" />
                    <h4 className="font-semibold text-xs text-slate-200 font-mono">
                      5. IFAB PITCH DIMENSIONS & TACTICAL SYNERGIES
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/50 text-emerald-300 font-bold">
                    {pitchLengthMeters}m × {pitchWidthMeters}m ({pitchPreset.toUpperCase()})
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Tactically scale your home pitch under IFAB Law 1 to match your style of play.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1">
                  {[
                    { id: 'compact', name: '1. Compact', dims: '100m × 64m', desc: 'Favors low blocks, pressing & direct duels.' },
                    { id: 'balanced', name: '2. Balanced', dims: '105m × 68m', desc: 'FIFA benchmark; symmetrical spacing.' },
                    { id: 'expansive', name: '3. Expansive', dims: '110m × 74m', desc: 'Favors tiki-taka, wingers & stretching low blocks.' },
                    { id: 'custom', name: '4. Custom', dims: 'Sliders', desc: 'Configure custom length and width boundaries.' },
                  ].map(p => {
                    const isSelected = pitchPreset === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        tabIndex={-1}
                        onClick={() => {
                          setPitchPreset(p.id as PitchDimensionPreset);
                          if (p.id === 'compact') {
                            setPitchLengthMeters(100);
                            setPitchWidthMeters(64);
                          } else if (p.id === 'balanced') {
                            setPitchLengthMeters(105);
                            setPitchWidthMeters(68);
                          } else if (p.id === 'expansive') {
                            setPitchLengthMeters(110);
                            setPitchWidthMeters(74);
                          }
                        }}
                        className={`p-2.5 rounded-md border text-left transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'border-emerald-400 bg-emerald-950/70 text-white font-bold ring-1 ring-emerald-400/50 shadow'
                            : 'border-slate-800 bg-slate-900/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-mono font-bold text-slate-200 flex items-center justify-between">
                            <span>{p.name}</span>
                            <span className="text-[10px] text-emerald-400">{p.dims}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1 leading-tight">{p.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {pitchPreset === 'custom' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-slate-900 rounded border border-slate-800">
                    <div>
                      <div className="flex justify-between text-[11px] font-mono text-slate-300 mb-1">
                        <span>PITCH LENGTH (IFAB 90m - 120m):</span>
                        <strong className="text-emerald-400">{pitchLengthMeters}m</strong>
                      </div>
                      <input
                        type="range"
                        min="90"
                        max="120"
                        value={pitchLengthMeters}
                        onChange={(e) => setPitchLengthMeters(Number(e.target.value))}
                        className="w-full accent-emerald-400 cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] font-mono text-slate-300 mb-1">
                        <span>PITCH WIDTH (IFAB 45m - 90m):</span>
                        <strong className="text-emerald-400">{pitchWidthMeters}m</strong>
                      </div>
                      <input
                        type="range"
                        min="45"
                        max="90"
                        value={pitchWidthMeters}
                        onChange={(e) => setPitchWidthMeters(Number(e.target.value))}
                        className="w-full accent-emerald-400 cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 6: PITCH TURF GRADE & GRASS LENGTH */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-lime-400" />
                    <h4 className="font-semibold text-xs text-slate-200 font-mono">
                      6. PITCH TURF QUALITY & MOWER GRASS CUT
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-lime-950 border border-lime-500/50 text-lime-300 font-bold uppercase">
                    {turfQuality} • {grassLength} CUT
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'pristine', name: 'Pristine Elite Turf', desc: 'True ball roll, high durability, vacuum drainage prevents standing water.' },
                    { id: 'normal', name: 'Normal Turf', desc: 'Standard friction, balanced wear and slide resistance.' },
                    { id: 'poor', name: 'Poor Quality Turf', desc: 'Bare goalmouth patches, micro-hops, double degradation scuff marks.' },
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      tabIndex={-1}
                      onClick={() => setTurfQuality(t.id as TurfQuality)}
                      className={`p-2.5 rounded-md border text-left transition-all ${
                        turfQuality === t.id
                          ? 'border-lime-400 bg-lime-950/70 text-white font-bold ring-1 ring-lime-400/50 shadow'
                          : 'border-slate-800 bg-slate-900/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <div className="text-xs font-mono font-bold text-slate-200">{t.name}</div>
                      <div className="text-[10px] text-slate-400 mt-1 leading-tight">{t.desc}</div>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800/60">
                  {[
                    { id: 'short', name: 'Short Cut', desc: 'Fast ground passes, zippy transition play.' },
                    { id: 'normal', name: 'Normal Cut', desc: 'Balanced rolling resistance.' },
                    { id: 'long', name: 'Long Cut', desc: 'Noticeable friction, ground passes decelerate fast.' },
                  ].map(g => (
                    <button
                      key={g.id}
                      type="button"
                      tabIndex={-1}
                      onClick={() => setGrassLength(g.id as GrassLength)}
                      className={`p-2 rounded text-left border transition-all ${
                        grassLength === g.id
                          ? 'border-lime-400 bg-lime-950/50 text-lime-200 font-bold'
                          : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-[11px] font-mono font-bold">{g.name}</div>
                      <div className="text-[9px] text-slate-400">{g.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* SECTION 7: WEATHER CONDITIONS & SEASONS */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CloudRain className="w-4 h-4 text-cyan-400" />
                    <h4 className="font-semibold text-xs text-slate-200 font-mono">
                      7. WEATHER CONDITIONS & SEASONS
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/50 text-cyan-300 font-bold uppercase">
                    {weather} • {season}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  {[
                    { id: 'clear', label: 'Clear', icon: Sun, desc: 'Crisp sunlight' },
                    { id: 'cloudy', label: 'Cloudy', icon: Cloud, desc: 'Overcast; 2nd half shift' },
                    { id: 'rain', label: 'Rain', icon: CloudRain, desc: '+35% slide, boot spray' },
                    { id: 'torrential', label: 'Torrential', icon: Wind, desc: 'Standing puddles stop balls' },
                    { id: 'snow', label: 'Snow 🔴', icon: Snowflake, desc: '🔴 Red lines & orange ball' },
                    { id: 'blizzard', label: 'Blizzard 🔴', icon: Snowflake, desc: 'Heavy snow & yellow ball' },
                  ].map(w => {
                    const Icon = w.icon;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        tabIndex={-1}
                        onClick={() => setWeather(w.id as WeatherCondition)}
                        className={`p-2 rounded-md border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                          weather === w.id
                            ? 'border-cyan-400 bg-cyan-950/70 text-white font-bold ring-1 ring-cyan-400/50 shadow'
                            : 'border-slate-800 bg-slate-900/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        <Icon className="w-4 h-4 text-cyan-300" />
                        <div className="text-[11px] font-mono font-bold truncate w-full">{w.label}</div>
                        <div className="text-[8px] text-slate-400 leading-none">{w.desc}</div>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-4 gap-2 pt-1 border-t border-slate-800/60">
                  {(['spring', 'summer', 'autumn', 'winter'] as Season[]).map(s => (
                    <button
                      key={s}
                      type="button"
                      tabIndex={-1}
                      onClick={() => setSeason(s)}
                      className={`py-1.5 px-2 rounded text-center font-mono text-[10px] uppercase border transition-all ${
                        season === s
                          ? 'border-amber-400 bg-amber-950/60 text-amber-300 font-bold ring-1 ring-amber-400/40'
                          : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* SECTION 8: GOAL NET TENSION & GOAL FRAME VARIATIONS */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crosshair className="w-4 h-4 text-indigo-400" />
                    <h4 className="font-semibold text-xs text-slate-200 font-mono">
                      8. GOAL NET TENSION & FRAME DYNAMICS
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 border border-indigo-500/50 text-indigo-300 font-bold uppercase">
                    {goalFrame} • {netTension}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: 'standard', name: 'Standard Regulation Goal', desc: '7.32m × 2.44m (24ft × 8ft) with 2m standard depth frame.' },
                    { id: 'brazilian', name: 'Brazilian / Deep Box Frame', desc: 'Deep rear stanchion posts, hanging mesh, and rear tie-back cables.' },
                  ].map(gf => (
                    <button
                      key={gf.id}
                      type="button"
                      tabIndex={-1}
                      onClick={() => setGoalFrame(gf.id as GoalFrameType)}
                      className={`p-2.5 rounded-md border text-left transition-all ${
                        goalFrame === gf.id
                          ? 'border-indigo-400 bg-indigo-950/70 text-white font-bold ring-1 ring-indigo-400/50 shadow'
                          : 'border-slate-800 bg-slate-900/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <div className="text-xs font-mono font-bold text-slate-200">{gf.name}</div>
                      <div className="text-[10px] text-slate-400 mt-1 leading-tight">{gf.desc}</div>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800/60">
                  {[
                    { id: 'hard', name: 'Hard Net Tension', desc: 'Tight 1980s continental tension; balls strike and ricochet crisply back onto grass.' },
                    { id: 'moderate', name: 'Moderate Tension', desc: 'Balanced tension with realistic 3D spring pocket give.' },
                    { id: 'soft', name: 'Soft Net Drape', desc: 'Deep cushioning drape; instantly deadens velocity into bottom netting.' },
                  ].map(nt => (
                    <button
                      key={nt.id}
                      type="button"
                      tabIndex={-1}
                      onClick={() => setNetTension(nt.id as NetTension)}
                      className={`p-2 rounded text-left border transition-all ${
                        netTension === nt.id
                          ? 'border-purple-400 bg-purple-950/60 text-purple-200 font-bold'
                          : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-[11px] font-mono font-bold">{nt.name}</div>
                      <div className="text-[9px] text-slate-400 mt-0.5">{nt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'match' && (
            <div className="space-y-5 max-w-2xl mx-auto py-2">
              {/* Half Duration Selector */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-400" />
                  <h3 className="font-semibold text-sm text-slate-100">
                    HALF DURATION (MATCH LENGTH)
                  </h3>
                </div>
                <p className="text-xs text-slate-400">
                  Select regulation length per half. Scoreboard clock smoothly scales to 45:00 at half-time and 90:00 at full-time.
                </p>
                <div className="grid grid-cols-4 gap-3 pt-2">
                  {([2, 3, 5, 10] as HalfDurationMinutes[]).map(mins => (
                    <button
                      key={mins}
                      type="button"
                      tabIndex={-1}
                      onClick={() => setHalfDuration(mins)}
                      className={`py-3 px-2 rounded-md border text-center transition-all ${
                        halfDuration === mins
                          ? 'border-amber-400 bg-amber-950/60 text-amber-300 font-bold shadow ring-1 ring-amber-400/40'
                          : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-lg font-mono font-bold">{mins} MIN</div>
                      <div className="text-[10px] text-slate-400 font-mono">({mins * 2} min total)</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty Selector */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-semibold text-sm text-slate-100">
                    RIVAL AI DIFFICULTY
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1">
                  {([
                    { id: 'standing', name: 'DUMMY', sub: 'Practice stationary' },
                    { id: 'easy', name: 'CASUAL', sub: 'Amateur challenge' },
                    { id: 'normal', name: 'NORMAL', sub: 'Balanced modern press' },
                    { id: 'elite', name: 'ELITE', sub: 'High intensity & pressing' },
                    { id: 'legend', name: 'LEGEND', sub: 'Flawless AI masterclass' },
                  ] as { id: DifficultyLevel; name: string; sub: string }[]).map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      tabIndex={-1}
                      onClick={() => setDifficulty(d.id)}
                      className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                        difficulty === d.id
                          ? 'border-amber-400 bg-amber-500/20 text-white font-bold ring-1 ring-amber-400/50'
                          : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-['Press_Start_2P'] text-amber-300">{d.name}</div>
                      <div className="text-[10px] text-slate-400 mt-1 font-mono leading-tight">{d.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Match Stakes & Composure Pressure Matrix (Phase 5) */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-rose-400" />
                    <h3 className="font-semibold text-sm text-slate-100">
                      MATCH STAKES & COMPOSURE PRESSURE
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-rose-950/80 border border-rose-500/50 text-rose-300 font-bold">
                    {matchStakeTier === 'friendly' ? 'W = 0%' : matchStakeTier === 'cup' ? 'W = 10%' : matchStakeTier === 'league' ? 'W = 15%' : matchStakeTier === 'key_match' ? 'W = 25%' : 'W = 40%'}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Higher stakes amplify reliance on player Composure (CMP). Low composure players crumble under final pressure, while high CMP legends elevate their execution.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1">
                  {[
                    { id: 'friendly', name: '1. Friendly', factor: '0%', color: 'border-slate-700 text-slate-300', desc: 'Exhibition match; pure baseline attributes.' },
                    { id: 'cup', name: '2. Cup Match', factor: '10%', color: 'border-blue-500/50 text-blue-300', desc: 'Knockout cup tie; slight composure pressure.' },
                    { id: 'league', name: '3. League', factor: '15%', color: 'border-emerald-500/50 text-emerald-300', desc: 'Competitive league match; standard stakes.' },
                    { id: 'key_match', name: '4. Key Match', factor: '25%', color: 'border-amber-500/50 text-amber-300', desc: 'Derby six-pointer; heavy pressure stakes.' },
                    { id: 'final', name: '5. Final', factor: '40%', color: 'border-rose-500 text-rose-300', desc: 'Championship final; maximum clutch test.' },
                  ].map(stake => (
                    <button
                      key={stake.id}
                      type="button"
                      tabIndex={-1}
                      onClick={() => setMatchStakeTier(stake.id as MatchStakeTier)}
                      className={`p-2.5 rounded-md border text-left transition-all flex flex-col justify-between ${
                        matchStakeTier === stake.id
                          ? 'border-rose-400 bg-rose-950/70 text-white font-bold ring-1 ring-rose-400/50 shadow'
                          : 'border-slate-800 bg-slate-900/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between text-xs font-mono font-bold">
                          <span>{stake.name}</span>
                          <span className="text-[10px] opacity-80">{stake.factor}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 leading-tight">
                          {stake.desc}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="hidden sm:flex items-center gap-3 text-xs font-mono text-slate-400">
            <span>HOME: <strong className="text-blue-400">{homeTeam.shortName}</strong> ({homeFormation} - {selectedHomeStyle.name})</span>
            <span>•</span>
            <span>AWAY: <strong className="text-red-400">{awayTeam.shortName}</strong> ({awayFormation} - {selectedAwayStyle.name})</span>
            <span>•</span>
            <span>HALF: <strong className="text-amber-400">{halfDuration}M</strong></span>
          </div>

          <div className="flex items-center gap-2.5 ml-auto flex-wrap justify-end">
            {onClose && (
              <button
                type="button"
                tabIndex={-1}
                onClick={onClose}
                className="py-2 px-3.5 rounded border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-800 transition-colors"
              >
                CANCEL
              </button>
            )}

            {isMidMatch && onApplyTacticsMidMatch && (
              <button
                type="button"
                tabIndex={-1}
                onClick={() => {
                  onApplyTacticsMidMatch({
                    homeFormation,
                    awayFormation,
                    homePlaystyle,
                    awayPlaystyle,
                    homeTactics,
                    awayTactics,
                    difficulty,
                    stadiumTier,
                    timeOfDay,
                    seatColor,
                    pitchPreset,
                    pitchLengthMeters,
                    pitchWidthMeters,
                    turfQuality,
                    grassLength,
                    weather,
                    season,
                    netTension,
                    goalFrame,
                  });
                }}
                className="py-2.5 px-4 rounded bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-['Press_Start_2P'] text-[10px] sm:text-xs font-bold tracking-wider shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 border border-emerald-400"
              >
                <Check className="w-3.5 h-3.5 text-white" />
                <span>APPLY TACTICS & RESUME</span>
              </button>
            )}

            <button
              type="button"
              tabIndex={-1}
              onClick={handleStart}
              className={`py-2.5 px-4 sm:px-5 rounded font-['Press_Start_2P'] text-[10px] sm:text-xs font-bold tracking-wider shadow-lg transition-all flex items-center gap-2 ${
                isMidMatch
                  ? 'border border-amber-500/80 bg-amber-950/70 text-amber-300 hover:bg-amber-900/80'
                  : 'bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 shadow-amber-500/20'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isMidMatch ? 'RESTART MATCH' : 'START MATCH'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Phase 13: 4-Level Drill-Down Team Selector Modal */}
      {teamSelectorSide && (
        <TeamSelectorModal
          isOpen={teamSelectorSide !== null}
          side={teamSelectorSide}
          currentTeamId={teamSelectorSide === 'home' ? homeTeam.id : awayTeam.id}
          onSelectTeam={(side, team) => {
            handleSelectTeam(side, team);
            setTeamSelectorSide(null);
          }}
          onClose={() => setTeamSelectorSide(null)}
        />
      )}
    </div>
  );
};
