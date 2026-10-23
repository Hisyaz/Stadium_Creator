/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Building2,
  Sliders,
  Check,
  X,
  Sun,
  Moon,
  Sunrise,
  Sunset,
  Cloud,
  CloudRain,
  Snowflake,
  Wind,
  Layers,
  Sparkles,
  Zap,
  Shield,
  RotateCcw,
  Box,
  Compass,
  CircleDot,
  Grid,
  Users,
  Trophy,
  Plane,
  Anchor,
  Trees,
  Train,
  Armchair,
  DoorOpen,
  Eye,
} from 'lucide-react';
import {
  StadiumTier,
  TimeOfDay,
  SeatColorMode,
  CrowdLevel,
  PitchDimensionPreset,
  TurfQuality,
  GrassLength,
  LawnMowingPattern,
  SurfaceStatus,
  WeatherCondition,
  Season,
  NetTension,
  GoalFrameType,
} from '../types';
import {
  StadiumDefinition,
  StadiumShape,
  StandGrade,
  SurroundingsType,
  ApronMaterial,
  BenchType,
  BenchQualityTier,
  TunnelType,
  TunnelSiting,
  FifaQualification,
  calculateFifaQualification,
  calculateStadiumTotalCapacity,
} from '../types/stadium';
import { TeamDefinition } from '../types/team';
import {
  STADIUM_REGISTRY,
  getAllRegisteredStadiums,
  getStadiumById,
  getHomeStadiumForTeam,
} from '../game/stadiumRegistry';
import { audio } from '../game/audio';

export interface StadiumConfig {
  stadiumTier: StadiumTier;
  pitchPreset: PitchDimensionPreset;
  pitchLengthMeters: number;
  pitchWidthMeters: number;
  turfQuality: TurfQuality;
  mowingPattern: LawnMowingPattern;
  grassLength: GrassLength;
  surfaceStatus: SurfaceStatus;
  weather: WeatherCondition;
  season: Season;
  timeOfDay: TimeOfDay;
  seatColor: SeatColorMode;
  crowdLevel: CrowdLevel;
  netTension: NetTension;
  goalFrame: GoalFrameType;
  // Phase 12 & 15.5 Stadium Architecture Additions
  stadiumId?: string;
  isHomeVenueLocked?: boolean;
  shape?: StadiumShape;
  surroundings?: SurroundingsType;
  standGrade?: StandGrade;
  benchType?: BenchType;
  benchQuality?: BenchQualityTier;
  tunnelType?: TunnelType;
  tunnelSiting?: TunnelSiting;
  hasTrack?: boolean;
  apronMaterial?: ApronMaterial;
  capacity?: number;
  fifaCategory?: FifaQualification;
}

interface StadiumSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: StadiumConfig;
  onChangeConfig: (config: StadiumConfig) => void;
  onApplyAndClose?: (config: StadiumConfig) => void;
  homeTeam?: TeamDefinition;
  awayTeam?: TeamDefinition;
  onSelectStadium?: (stadium: StadiumDefinition, isHomeVenue: boolean) => void;
  onOpenStadiumCreator?: (stadium?: StadiumDefinition) => void;
}

export const StadiumSelectorModal: React.FC<StadiumSelectorModalProps> = ({
  isOpen,
  onClose,
  config,
  onChangeConfig,
  onApplyAndClose,
  homeTeam,
  awayTeam,
  onSelectStadium,
  onOpenStadiumCreator,
}) => {
  const [activeTab, setActiveTab] = useState<'venues' | 'pitch_turf' | 'atmosphere' | 'stadium_nets'>('venues');

  if (!isOpen) return null;

  const update = <K extends keyof StadiumConfig>(key: K, value: StadiumConfig[K]) => {
    audio.playKick(0.2);
    // Automatic consistency rules:
    // Snow & Blizzard locked to Winter season
    if (key === 'weather' && (value === 'snow' || value === 'blizzard')) {
      onChangeConfig({
        ...config,
        weather: value as WeatherCondition,
        season: 'winter',
      });
      return;
    }
    // Changing away from winter unlocks weather if it was snow/blizzard
    if (key === 'season' && value !== 'winter' && (config.weather === 'snow' || config.weather === 'blizzard')) {
      onChangeConfig({
        ...config,
        season: value as Season,
        weather: 'clear',
      });
      return;
    }
    onChangeConfig({
      ...config,
      [key]: value,
    });
  };

  const allStadiums = getAllRegisteredStadiums();
  const homeStadium = homeTeam ? getHomeStadiumForTeam(homeTeam) : null;

  const handleSelectRegisteredVenue = (stadium: StadiumDefinition) => {
    audio.playKick(0.3);
    const isHome = homeTeam?.homeStadiumId === stadium.id;
    onChangeConfig({
      ...config,
      stadiumTier:
        stadium.id === 'craven_cottage'
          ? 'craven'
          : stadium.id === 'estadio_metropolitano_techo'
          ? 'ascenso'
          : 'monumental',
      stadiumId: stadium.id,
      isHomeVenueLocked: isHome,
      shape: stadium.shape,
      surroundings: stadium.surroundings,
      standGrade: stadium.stands.east?.grade || 'grade4_modern',
      benchType: stadium.dugouts.type,
      benchQuality: stadium.dugouts.quality,
      tunnelType: stadium.tunnel.type,
      tunnelSiting: stadium.tunnel.siting,
      hasTrack: stadium.hasTrack,
      apronMaterial: stadium.apronMaterial || 'grass',
      capacity: stadium.capacity,
      fifaCategory: stadium.fifaCategory,
      pitchPreset: stadium.pitchPreset,
      pitchLengthMeters: stadium.pitchLengthMeters,
      pitchWidthMeters: stadium.pitchWidthMeters,
      turfQuality: stadium.turfQuality,
      mowingPattern: stadium.mowingPattern,
      grassLength: stadium.grassLength,
      surfaceStatus: stadium.surfaceStatus,
      netTension: stadium.netTension,
      goalFrame: stadium.goalFrame,
      seatColor: stadium.seatColor,
    });
    if (onSelectStadium) {
      onSelectStadium(stadium, isHome);
    }
  };

  const handlePresetDimensions = (preset: PitchDimensionPreset) => {
    audio.playKick(0.25);
    if (preset === 'compact') {
      onChangeConfig({
        ...config,
        pitchPreset: 'compact',
        pitchLengthMeters: 100,
        pitchWidthMeters: 64,
      });
    } else if (preset === 'expansive') {
      onChangeConfig({
        ...config,
        pitchPreset: 'expansive',
        pitchLengthMeters: 110,
        pitchWidthMeters: 74,
      });
    } else if (preset === 'balanced') {
      onChangeConfig({
        ...config,
        pitchPreset: 'balanced',
        pitchLengthMeters: 105,
        pitchWidthMeters: 68,
      });
    } else {
      onChangeConfig({
        ...config,
        pitchPreset: 'custom',
      });
    }
  };

  const handleApply = () => {
    audio.playKick(0.4);
    if (onApplyAndClose) {
      onApplyAndClose(config);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border-2 border-emerald-500/60 rounded-2xl shadow-[0_0_50px_rgba(16,185,129,0.3)] overflow-hidden text-white font-sans">
        {/* ========================================================================= */}
        {/* 32-BIT RETRO HEADER WITH METALLIC BEVEL                                   */}
        {/* ========================================================================= */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-800 to-slate-950 px-4 py-3 border-b-2 border-slate-700 flex items-center justify-between shrink-0 shadow-inner">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400 shadow-md">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-['Press_Start_2P'] text-xs sm:text-sm text-emerald-400 tracking-wider">
                  STADIUM & PITCH CUSTOMIZER
                </h2>
                {config.isHomeVenueLocked && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-400/20 border border-amber-400 text-amber-300 font-mono text-[8px] font-black uppercase">
                    🏆 HOME LOCKED
                  </span>
                )}
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                Phase 12 Data-Driven Venues · 4 Shapes · 5 Dugout Styles · 5 Tunnel Types · FIFA Qualifications
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
        {/* 32-BIT ARCADE TABS                                                        */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-1 bg-slate-950 px-4 py-2 border-b border-slate-800 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              audio.playKick(0.15);
              setActiveTab('venues');
            }}
            className={`px-3 py-1.5 text-[8.5px] sm:text-[9.5px] font-['Press_Start_2P'] rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'venues'
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-bold'
                : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800 hover:border-slate-700'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>OFFICIAL VENUES 🏆</span>
          </button>

          <button
            type="button"
            onClick={() => {
              audio.playKick(0.15);
              setActiveTab('pitch_turf');
            }}
            className={`px-3 py-1.5 text-[8.5px] sm:text-[9.5px] font-['Press_Start_2P'] rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'pitch_turf'
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800 hover:border-slate-700'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>TURF & LAWN</span>
          </button>

          <button
            type="button"
            onClick={() => {
              audio.playKick(0.15);
              setActiveTab('atmosphere');
            }}
            className={`px-3 py-1.5 text-[8.5px] sm:text-[9.5px] font-['Press_Start_2P'] rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'atmosphere'
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800 hover:border-slate-700'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>WEATHER & SKY</span>
          </button>

          <button
            type="button"
            onClick={() => {
              audio.playKick(0.15);
              setActiveTab('stadium_nets');
            }}
            className={`px-3 py-1.5 text-[8.5px] sm:text-[9.5px] font-['Press_Start_2P'] rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'stadium_nets'
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800 hover:border-slate-700'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>STANDS & DUGOUT</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB BODY                                                                  */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 bg-gradient-to-b from-slate-900 to-slate-950">
          {/* TAB 0: OFFICIAL VENUES & CANONICAL GROUNDS */}
          {activeTab === 'venues' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-['Press_Start_2P'] text-xs text-amber-400">CANONICAL VENUE REGISTRY</span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[8px] font-bold">
                      PHASE 12 ARCHITECTURE
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    Official stadium architecture, dugout shelters, entrance tunnels, surroundings & FIFA qualifications.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
                  {onOpenStadiumCreator && (
                    <button
                      type="button"
                      onClick={() => {
                        audio.playKick(0.25);
                        onOpenStadiumCreator();
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-['Press_Start_2P'] text-[8px] font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-cyan-500/20 shrink-0 border border-cyan-400"
                    >
                      <Building2 className="w-3.5 h-3.5 text-cyan-200" />
                      <span>🛠️ STADIUM CREATOR</span>
                    </button>
                  )}

                  {homeStadium && (
                    <button
                      type="button"
                      onClick={() => handleSelectRegisteredVenue(homeStadium)}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-['Press_Start_2P'] text-[8px] font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20 shrink-0"
                    >
                      <Trophy className="w-3.5 h-3.5" />
                      <span>RESTORE HOME: {homeStadium.shortName.toUpperCase()}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 8 Registered Stadium Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {allStadiums.map((stadium) => {
                  const isHomeVenue = homeTeam?.homeStadiumId === stadium.id;
                  const isCurrentActive =
                    config.stadiumId === stadium.id ||
                    (!config.stadiumId && isHomeVenue);

                  const fifaBadge =
                    stadium.fifaCategory === 'world'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                      : stadium.fifaCategory === 'continental'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                      : stadium.fifaCategory === 'first_division'
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/50'
                      : 'bg-slate-700/40 text-slate-300 border-slate-600';

                  const shapeLabel =
                    stadium.shape === 'rectangular'
                      ? 'RECTANGULAR 4-STAND'
                      : stadium.shape === 'oval'
                      ? 'OVAL BOWL'
                      : (stadium.shape === 'circular' || stadium.shape === 'round')
                      ? 'CIRCULAR COLOSSEUM'
                      : 'OCTAGONAL COMPLEX';

                  return (
                    <div
                      key={stadium.id}
                      onClick={() => handleSelectRegisteredVenue(stadium)}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden group flex flex-col justify-between ${
                        isCurrentActive
                          ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 border-amber-400 ring-2 ring-amber-400/50 shadow-lg'
                          : 'bg-slate-950/70 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Top banner / badges */}
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1.5 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px]">{stadium.country === 'Argentina' ? '🇦🇷' : stadium.country === 'Spain' ? '🇪🇸' : stadium.country === 'England' ? '🏴󠁧󠁢󠁥󠁮󠁧󠁿' : stadium.country === 'Colombia' ? '🇨🇴' : stadium.country === 'Brazil' ? '🇧🇷' : stadium.country === 'Canada' ? '🇨🇦' : '🇸🇬'}</span>
                            <span className="font-mono text-[9px] text-slate-300 font-bold uppercase">{stadium.city}, {stadium.country}</span>
                          </div>

                          <div className="flex items-center gap-1">
                            {isHomeVenue && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-mono text-[7.5px] font-black uppercase shadow">
                                🏆 HOME VENUE
                              </span>
                            )}
                            <span className={`px-1.5 py-0.5 rounded border font-mono text-[7.5px] font-bold uppercase ${fifaBadge}`}>
                              FIFA {stadium.fifaCategory.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        {/* Name & Short */}
                        <div className="font-['Press_Start_2P'] text-[10px] text-white group-hover:text-amber-300 transition-colors">
                          {stadium.name}
                        </div>
                        <div className="text-[9.5px] font-mono text-amber-400 mt-0.5">
                          {shapeLabel} · {stadium.capacity.toLocaleString()} SEATS
                        </div>

                        {/* Specs Pill Badges */}
                        <div className="mt-2.5 grid grid-cols-2 gap-1.5 text-[8.5px] font-mono">
                          <div className="bg-slate-900/80 px-2 py-1 rounded border border-slate-800 text-slate-300 flex items-center gap-1">
                            <Armchair className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span className="truncate">BENCH: {stadium.dugouts.type.replace('_', ' ').toUpperCase()}</span>
                          </div>
                          <div className="bg-slate-900/80 px-2 py-1 rounded border border-slate-800 text-slate-300 flex items-center gap-1">
                            <DoorOpen className="w-3 h-3 text-sky-400 shrink-0" />
                            <span className="truncate">TUNNEL: {stadium.tunnel.type.replace('_', ' ').toUpperCase()}</span>
                          </div>
                          <div className="bg-slate-900/80 px-2 py-1 rounded border border-slate-800 text-slate-300 flex items-center gap-1">
                            <Layers className="w-3 h-3 text-amber-400 shrink-0" />
                            <span className="truncate">STANDS: {stadium.stands.east?.grade?.replace('grade', 'G') || 'MODERN'}</span>
                          </div>
                          <div className="bg-slate-900/80 px-2 py-1 rounded border border-slate-800 text-slate-300 flex items-center gap-1">
                            <Eye className="w-3 h-3 text-rose-400 shrink-0" />
                            <span className="truncate">ENV: {stadium.surroundings.replace('_', ' ').toUpperCase()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Bottom action row */}
                      <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[9px] font-mono">
                        <span className="text-slate-400">
                          {stadium.hasTrack ? '🏃 400m Track' : '⚽ Pitch Apron'} · {stadium.turfQuality.toUpperCase()} TURF
                        </span>
                        <span className={`font-bold font-['Press_Start_2P'] text-[7.5px] ${isCurrentActive ? 'text-amber-400' : 'text-slate-400'}`}>
                          {isCurrentActive ? '✓ SELECTED' : 'SELECT ARENA →'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 1: TURF & LAWN DESIGN */}
          {activeTab === 'pitch_turf' && (
            <div className="space-y-5 animate-fade-in">
              {/* 1. THREE CALIBRATED TURF QUALITY GRADES (Section 17.2) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>TURF QUALITY GRADE (VISUAL & REALISTIC PHYSICS)</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    Friction & Roll calibrated
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* POOR QUALITY */}
                  <button
                    type="button"
                    onClick={() => update('turfQuality', 'poor')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                      config.turfQuality === 'poor'
                        ? 'bg-amber-950/40 border-amber-400 ring-2 ring-amber-400/50 shadow-lg'
                        : 'bg-slate-950/60 hover:bg-slate-800/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-['Press_Start_2P'] text-[9px] text-amber-300">
                        POOR QUALITY
                      </span>
                      {config.turfQuality === 'poor' && (
                        <Check className="w-4 h-4 text-amber-400" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-300 leading-snug">
                      Distinct arid, yellowish-green hue with visible bare soil & dry mud patches in goalmouths.
                    </p>
                    <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-2 text-[9px] font-mono text-amber-400/90">
                      <span>⚡ Micro-bounces</span>
                      <span>·</span>
                      <span>Heavy roll drag</span>
                    </div>
                  </button>

                  {/* NORMAL QUALITY */}
                  <button
                    type="button"
                    onClick={() => update('turfQuality', 'normal')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                      config.turfQuality === 'normal'
                        ? 'bg-emerald-950/40 border-emerald-400 ring-2 ring-emerald-400/50 shadow-lg'
                        : 'bg-slate-950/60 hover:bg-slate-800/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-['Press_Start_2P'] text-[9px] text-emerald-400">
                        NORMAL QUALITY
                      </span>
                      {config.turfQuality === 'normal' && (
                        <Check className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-300 leading-snug">
                      Standard authentic football pitch green with natural blade sheen & balanced contrast.
                    </p>
                    <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-2 text-[9px] font-mono text-emerald-400/90">
                      <span>✓ True ball roll</span>
                      <span>·</span>
                      <span>Standard divots</span>
                    </div>
                  </button>

                  {/* PRISTINE / ELITE */}
                  <button
                    type="button"
                    onClick={() => update('turfQuality', 'pristine')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                      config.turfQuality === 'pristine'
                        ? 'bg-teal-950/50 border-teal-300 ring-2 ring-teal-300/50 shadow-lg'
                        : 'bg-slate-950/60 hover:bg-slate-800/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-['Press_Start_2P'] text-[9px] text-teal-300">
                        PRISTINE / ELITE
                      </span>
                      {config.turfQuality === 'pristine' && (
                        <Check className="w-4 h-4 text-teal-300" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-300 leading-snug">
                      Deep vibrant emerald green with razor-sharp blade highlights & zero grass gouging.
                    </p>
                    <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-2 text-[9px] font-mono text-teal-300/90">
                      <span>★ Smooth fast roll</span>
                      <span>·</span>
                      <span>Vacuum drainage</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* 2. SEVEN AUTHENTIC LAWN MOWING PATTERNS (Section 17.2) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                    <Grid className="w-3.5 h-3.5" />
                    <span>7 AUTHENTIC LAWN MOWING PATTERNS</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    Real-time canvas rendering
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                  {[
                    {
                      id: 'plain',
                      name: 'Plain Cut',
                      tag: 'Uniform',
                      desc: 'Clean single shade',
                      icon: '🟩',
                    },
                    {
                      id: 'horizontal',
                      name: 'Horizontal',
                      tag: 'Stripes',
                      desc: 'Perpendicular width bands',
                      icon: '≡',
                    },
                    {
                      id: 'vertical',
                      name: 'Vertical',
                      tag: 'Lanes',
                      desc: 'Longitudinal goal lanes',
                      icon: '|||',
                    },
                    {
                      id: 'european_boxes',
                      name: 'European',
                      tag: 'Top-Club',
                      desc: 'UCL shaded box squares',
                      icon: '▦',
                    },
                    {
                      id: 'checkerboard',
                      name: 'Checker',
                      tag: 'Graphic',
                      desc: 'Bold alternating tiles',
                      icon: '🏁',
                    },
                    {
                      id: 'diagonal_diamonds',
                      name: 'Diagonal',
                      tag: 'Diamonds',
                      desc: '45° intersecting cross',
                      icon: '❖',
                    },
                    {
                      id: 'concentric_circles',
                      name: 'Circles',
                      tag: 'Concentric',
                      desc: 'Ripples from center spot',
                      icon: '◎',
                    },
                  ].map((p) => {
                    const isSelected = config.mowingPattern === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => update('mowingPattern', p.id as LawnMowingPattern)}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-between ${
                          isSelected
                            ? 'bg-emerald-500/25 border-emerald-400 ring-2 ring-emerald-400/50 shadow-md scale-102'
                            : 'bg-slate-950/60 hover:bg-slate-800 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <span className="text-xl mb-1">{p.icon}</span>
                        <div className="font-['Press_Start_2P'] text-[7.5px] text-white truncate max-w-full">
                          {p.name}
                        </div>
                        <div className="text-[7px] font-mono text-emerald-400 uppercase mt-0.5 font-bold">
                          {p.tag}
                        </div>
                        <div className="text-[7.5px] text-slate-400 leading-tight mt-1 line-clamp-2">
                          {p.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. GRASS CUT LENGTH & SURFACE DRAINAGE STATUS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Grass Length */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                  <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5" />
                    <span>GRASS LENGTH CUT</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'short', label: 'SHORT CUT', desc: 'Fast ground passing' },
                      { id: 'normal', label: 'NORMAL CUT', desc: 'Regulation pace' },
                      { id: 'long', label: 'LONG CUT', desc: 'High rolling friction' },
                    ].map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => update('grassLength', g.id as GrassLength)}
                        className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                          config.grassLength === g.id
                            ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400'
                            : 'bg-slate-900 text-slate-300 hover:bg-slate-850 border-slate-800'
                        }`}
                      >
                        <div className="text-[9px] font-mono font-black">{g.label}</div>
                        <div className="text-[7.5px] opacity-80 mt-0.5">{g.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Surface Status */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                  <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5" />
                    <span>SURFACE STATUS & MOISTURE</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'dry', label: 'DRY SURFACE', desc: 'Dusty, firm bounce' },
                      { id: 'normal', label: 'BALANCED', desc: 'Standard moisture' },
                      { id: 'wet', label: 'WET / SLICK', desc: 'Glossy water sheen' },
                    ].map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => update('surfaceStatus', s.id as SurfaceStatus)}
                        className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                          config.surfaceStatus === s.id
                            ? 'bg-sky-500 text-slate-950 font-bold border-sky-400'
                            : 'bg-slate-900 text-slate-300 hover:bg-slate-850 border-slate-800'
                        }`}
                      >
                        <div className="text-[9px] font-mono font-black">{s.label}</div>
                        <div className="text-[7.5px] opacity-80 mt-0.5">{s.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4. IFAB PITCH DIMENSIONS (COMPACT / BALANCED / EXPANSIVE / CUSTOM) */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Box className="w-3.5 h-3.5" />
                    <span>IFAB PITCH DIMENSIONS ({config.pitchLengthMeters}m × {config.pitchWidthMeters}m)</span>
                  </div>
                  <span className="text-[9px] font-mono text-emerald-400 font-bold bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30">
                    {config.pitchPreset.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                  {[
                    { id: 'compact', label: 'IFAB COMPACT', dim: '100m × 64m', tag: 'High Pressing' },
                    { id: 'balanced', label: 'BALANCED', dim: '105m × 68m', tag: 'UEFA Standard' },
                    { id: 'expansive', label: 'EXPANSIVE', dim: '110m × 74m', tag: 'Flank Space' },
                    { id: 'custom', label: 'CUSTOM SLIDERS', dim: 'Manual Control', tag: 'Freestyle' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handlePresetDimensions(p.id as PitchDimensionPreset)}
                      className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                        config.pitchPreset === p.id
                          ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                          : 'bg-slate-900 text-slate-300 hover:bg-slate-850 border-slate-800'
                      }`}
                    >
                      <div className="text-[8.5px] font-['Press_Start_2P'] truncate">{p.label}</div>
                      <div className="text-[10px] font-mono mt-1">{p.dim}</div>
                      <div className="text-[8px] opacity-75">{p.tag}</div>
                    </button>
                  ))}
                </div>

                {/* Custom Sliders if Custom preset selected */}
                {config.pitchPreset === 'custom' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                    <div>
                      <div className="flex justify-between text-[10px] font-mono text-slate-300 mb-1">
                        <span>PITCH LENGTH</span>
                        <span className="text-amber-400 font-bold">{config.pitchLengthMeters} meters</span>
                      </div>
                      <input
                        type="range"
                        min={90}
                        max={120}
                        value={config.pitchLengthMeters}
                        onChange={(e) => update('pitchLengthMeters', Number(e.target.value))}
                        className="w-full accent-emerald-500 cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] font-mono text-slate-300 mb-1">
                        <span>PITCH WIDTH</span>
                        <span className="text-amber-400 font-bold">{config.pitchWidthMeters} meters</span>
                      </div>
                      <input
                        type="range"
                        min={45}
                        max={90}
                        value={config.pitchWidthMeters}
                        onChange={(e) => update('pitchWidthMeters', Number(e.target.value))}
                        className="w-full accent-emerald-500 cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 5. PHASE 15.5: APRON PERIMETER MATERIAL (PITCH BORDER) */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    <span>APRON PERIMETER MATERIAL (PITCH BORDER)</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    6 Procedural Materials
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {[
                    { id: 'grass', label: 'NATURAL TURF', icon: '🌱', desc: 'Lush lawn striping & line' },
                    { id: 'concrete', label: 'CONCRETE SLABS', icon: '🧱', desc: 'Pavers & joint grid' },
                    { id: 'rubber_tartan', label: 'TARTAN RUBBER', icon: '🏃', desc: 'High-grip athletic track' },
                    { id: 'artificial_turf', label: 'ASTROTURF', icon: '🌿', desc: 'Synthetic turf & seam' },
                    { id: 'gravel_ballast', label: 'CRUSHED GRAVEL', icon: '🪨', desc: 'Ballast stone flecks' },
                    { id: 'asphalt_paved', label: 'PAVED ASPHALT', icon: '🛣️', desc: 'Tarmac & hazard curb' },
                  ].map((mat) => {
                    const isSelected = (config.apronMaterial || 'grass') === mat.id;
                    return (
                      <button
                        key={mat.id}
                        type="button"
                        onClick={() => update('apronMaterial', mat.id as ApronMaterial)}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-between ${
                          isSelected
                            ? 'bg-amber-500/25 border-amber-400 ring-2 ring-amber-400/50 shadow-md font-bold'
                            : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-slate-300'
                        }`}
                      >
                        <span className="text-xl mb-1">{mat.icon}</span>
                        <div className="font-['Press_Start_2P'] text-[7.5px] text-white truncate max-w-full">
                          {mat.label}
                        </div>
                        <div className="text-[7.5px] text-slate-400 leading-tight mt-1 line-clamp-2">
                          {mat.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: WEATHER, SKY & ATMOSPHERE */}
          {activeTab === 'atmosphere' && (
            <div className="space-y-5 animate-fade-in">
              {/* Weather Conditions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                    <Cloud className="w-3.5 h-3.5" />
                    <span>WEATHER CONDITIONS</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    Snow & Blizzard auto-locks Season to Winter
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {[
                    { id: 'clear', label: 'CLEAR', icon: '☀️', desc: 'Sunny stadium sky' },
                    { id: 'cloudy', label: 'CLOUDY', icon: '☁️', desc: 'Overcast soft diffuse' },
                    { id: 'rain', label: 'RAIN', icon: '🌧️', desc: 'Slick passes & spray' },
                    { id: 'torrential', label: 'TORRENTIAL', icon: '⛈️', desc: 'Standing water puddles' },
                    { id: 'snow', label: 'SNOW', icon: '❄️', desc: '🔴 Red lines & orange ball' },
                    { id: 'blizzard', label: 'BLIZZARD', icon: '🌨️', desc: 'Heavy snow & yellow ball' },
                  ].map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => update('weather', w.id as WeatherCondition)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-between ${
                        config.weather === w.id
                          ? 'bg-sky-500/25 border-sky-400 ring-2 ring-sky-400/50 shadow-md scale-102'
                          : 'bg-slate-950/60 hover:bg-slate-800 border-slate-800'
                      }`}
                    >
                      <span className="text-xl mb-1">{w.icon}</span>
                      <div className="font-['Press_Start_2P'] text-[8px] text-white truncate max-w-full">
                        {w.label}
                      </div>
                      <div className="text-[7.5px] text-slate-400 leading-tight mt-1">
                        {w.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Time of Day */}
              <div>
                <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5" />
                  <span>TIME OF DAY & SHADOW MATRIX</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'morning', label: 'MORNING / DAWN', icon: <Sunrise className="w-4 h-4 text-amber-400" />, desc: 'Long diagonal shadows' },
                    { id: 'noon', label: 'NOON', icon: <Sun className="w-4 h-4 text-yellow-400" />, desc: 'Sharp drop shadows directly below' },
                    { id: 'sunset', label: 'SUNSET (GOLDEN)', icon: <Sunset className="w-4 h-4 text-orange-400" />, desc: 'Warm golden hour raking light' },
                    { id: 'night', label: 'NIGHT (FLOODLIT)', icon: <Moon className="w-4 h-4 text-sky-400" />, desc: 'Quad floodlit directional shadows' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => update('timeOfDay', t.id as TimeOfDay)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        config.timeOfDay === t.id
                          ? 'bg-amber-500/25 border-amber-400 ring-2 ring-amber-400/50 shadow-md'
                          : 'bg-slate-950/60 hover:bg-slate-800 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        {t.icon}
                        <span className="font-['Press_Start_2P'] text-[8px] text-white">
                          {t.label}
                        </span>
                      </div>
                      <div className="text-[8px] text-slate-300">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Season */}
              <div>
                <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5" />
                  <span>SEASONAL CLIMATE</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'spring', label: 'SPRING', icon: '🌸' },
                    { id: 'summer', label: 'SUMMER', icon: '☀️' },
                    { id: 'autumn', label: 'AUTUMN', icon: '🍂' },
                    { id: 'winter', label: 'WINTER', icon: '❄️' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => update('season', s.id as Season)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        config.season === s.id
                          ? 'bg-emerald-500/25 border-emerald-400 ring-2 ring-emerald-400/50 font-bold'
                          : 'bg-slate-950/60 hover:bg-slate-800 border-slate-800 text-slate-300'
                      }`}
                    >
                      <span className="text-lg">{s.icon}</span>
                      <div className="font-['Press_Start_2P'] text-[8.5px] mt-1">{s.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Crowd Attendance Level */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>CROWD ATTENDANCE LEVEL</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    Modulates grandstand visual density & acoustic roar
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {[
                    {
                      id: 'empty',
                      label: 'EMPTY',
                      tag: '0% CAP',
                      icon: '🪑',
                      desc: 'Behind closed doors, hollow echo',
                    },
                    {
                      id: 'small',
                      label: 'SMALL',
                      tag: 'SPARSE',
                      icon: '👥',
                      desc: 'Scattered pockets, polite claps',
                    },
                    {
                      id: 'few',
                      label: 'FEW',
                      tag: 'MODEST',
                      icon: '🏟️',
                      desc: 'Low turnout, sporadic murmurs',
                    },
                    {
                      id: 'half',
                      label: 'HALF',
                      tag: '50% FULL',
                      icon: '🥁',
                      desc: 'Half-full arena, solid rumble',
                    },
                    {
                      id: 'crowded',
                      label: 'CROWDED',
                      tag: 'NEAR FULL',
                      icon: '📣',
                      desc: 'High capacity, loud sustained roar',
                    },
                    {
                      id: 'packet',
                      label: 'PACKET',
                      tag: 'TO THE BRIM',
                      icon: '🔥',
                      desc: 'Over-capacity final! Seismic roar & flares',
                    },
                  ].map((c) => {
                    const isSelected = config.crowdLevel === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => update('crowdLevel', c.id as CrowdLevel)}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-between ${
                          isSelected
                            ? 'bg-amber-500/25 border-amber-400 ring-2 ring-amber-400/50 shadow-md scale-102 font-bold'
                            : 'bg-slate-950/60 hover:bg-slate-800 border-slate-800 text-slate-300'
                        }`}
                      >
                        <span className="text-xl mb-1">{c.icon}</span>
                        <div className="font-['Press_Start_2P'] text-[8px] text-white truncate max-w-full">
                          {c.label}
                        </div>
                        <div className="text-[7.5px] font-mono text-amber-400 uppercase mt-0.5 font-bold">
                          {c.tag}
                        </div>
                        <div className="text-[7.5px] text-slate-400 leading-tight mt-1 line-clamp-2">
                          {c.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ARENA ARCHITECTURE & GOAL NETS */}
          {activeTab === 'stadium_nets' && (
            <div className="space-y-5 animate-fade-in">
              {/* Live FIFA Capacity & Qualification Meter */}
              {(() => {
                const currentCap = config.capacity || (config.stadiumTier === 'monumental' ? 84567 : config.stadiumTier === 'craven' ? 25700 : 12000);
                const currentFifa = config.fifaCategory || calculateFifaQualification(currentCap);
                const fifaBadge =
                  currentFifa === 'world'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/60'
                    : currentFifa === 'continental'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60'
                    : currentFifa === 'first_division'
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/60'
                    : 'bg-slate-700/40 text-slate-300 border-slate-600';

                return (
                  <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-3 rounded-xl border border-emerald-500/40 flex items-center justify-between gap-2 shadow-inner">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                      <div>
                        <div className="text-[8.5px] font-['Press_Start_2P'] text-emerald-400">
                          TOTAL VENUE CAPACITY: {currentCap.toLocaleString()} SEATS
                        </div>
                        <div className="text-[9.5px] font-mono text-slate-400 mt-0.5">
                          Architectural Shape: {(config.shape || 'rectangular').toUpperCase()} · Surroundings: {(config.surroundings || 'big_city').replace('_', ' ').toUpperCase()}
                        </div>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded border font-mono text-[8.5px] font-bold uppercase shrink-0 ${fifaBadge}`}>
                      FIFA {currentFifa.toUpperCase()} QUALIFIED
                    </span>
                  </div>
                );
              })()}

              {/* 1. STADIUM SHAPE ARCHITECTURE (4 Archetypes) */}
              <div>
                <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5" />
                  <span>1. STADIUM SHAPE ARCHETYPE</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'rectangular', label: 'RECTANGULAR', sub: 'Traditional 4-Stand', desc: 'Direct sightlines & decoupled corners' },
                    { id: 'oval', label: 'OVAL BOWL', sub: 'Continuous Curved', desc: 'Curving grandstands & athletics space' },
                    { id: 'circular', label: 'CIRCULAR', sub: 'Colosseum Radial', desc: 'Symmetric round bowl & seismic roar' },
                    { id: 'octagonal', label: 'OCTAGONAL', sub: 'Geometric Complex', desc: 'Angled corner pavilion infills' },
                  ].map((sh) => (
                    <button
                      key={sh.id}
                      type="button"
                      onClick={() => update('shape', sh.id as StadiumShape)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        (config.shape || 'rectangular') === sh.id
                          ? 'bg-emerald-500/25 border-emerald-400 ring-2 ring-emerald-400/50 shadow-md font-bold'
                          : 'bg-slate-950/60 hover:bg-slate-800 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="font-['Press_Start_2P'] text-[8.5px] text-white truncate">{sh.label}</div>
                      <div className="text-[8px] font-mono text-amber-400 mt-0.5 font-bold">{sh.sub}</div>
                      <div className="text-[7.5px] text-slate-400 mt-1 line-clamp-2">{sh.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. MANAGER & SQUAD DUGOUT BENCHES (5 Types) */}
              <div>
                <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Armchair className="w-3.5 h-3.5" />
                  <span>2. MANAGER & SQUAD DUGOUT BENCHES</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  {[
                    { id: 'racing_bucket', label: 'RACING BUCKET', sub: 'Recaro Style', desc: 'Ergonomic bucket seats & LED canopy' },
                    { id: 'covered_sunken', label: 'COVERED SUNKEN', sub: 'Modern Shelter', desc: 'Sub-level floor with curved tinted shelter' },
                    { id: 'classic_timber', label: 'CLASSIC TIMBER', sub: 'Heritage Wood', desc: 'Varnished timber slats & pitched roof' },
                    { id: 'concrete_dugout', label: 'CONCRETE SHELTER', sub: 'Raw Utilitarian', desc: 'Cast bunker with weather hood' },
                    { id: 'folding_chairs', label: 'FOLDING CHAIRS', sub: 'Minimalist Grass', desc: 'Open pitch-side folding seats' },
                  ].map((dug) => (
                    <button
                      key={dug.id}
                      type="button"
                      onClick={() => update('benchType', dug.id as BenchType)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        (config.benchType || 'racing_bucket') === dug.id
                          ? 'bg-amber-500/25 border-amber-400 ring-2 ring-amber-400/50 shadow-md font-bold'
                          : 'bg-slate-950/60 hover:bg-slate-800 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="font-['Press_Start_2P'] text-[8px] text-white truncate">{dug.label}</div>
                      <div className="text-[7.5px] font-mono text-amber-400 mt-0.5 font-bold">{dug.sub}</div>
                      <div className="text-[7px] text-slate-400 mt-1 line-clamp-2">{dug.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. PLAYER ENTRANCE TUNNEL (5 Types) */}
              <div>
                <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <DoorOpen className="w-3.5 h-3.5" />
                  <span>3. PLAYER ENTRANCE TUNNEL</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  {[
                    { id: 'inflatable_accordion', label: 'INFLATABLE BELLOWS', sub: 'South American Icon', desc: 'Accordion bellows canopy extending to touchline' },
                    { id: 'modern_architectural', label: 'MODERN ARCHITECTURAL', sub: 'LED Ribbon Portal', desc: 'Angular metal composite with pulsating LED edge' },
                    { id: 'subterranean_staircase', label: 'SUBTERRANEAN STAIRS', sub: 'Under-Pitch Flight', desc: 'Players rise up from deep subterranean concrete steps' },
                    { id: 'direct_portal', label: 'PITCH-LEVEL PORTAL', sub: 'Grandstand Wall Cut', desc: 'Direct portal archway cut into the main stand wall' },
                    { id: 'telescopic_canopy', label: 'TELESCOPIC CANOPY', sub: 'Motorized Glass', desc: 'Extending transparent polycarbonate protective hood' },
                  ].map((tun) => (
                    <button
                      key={tun.id}
                      type="button"
                      onClick={() => update('tunnelType', tun.id as TunnelType)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        (config.tunnelType || 'modern_architectural') === tun.id
                          ? 'bg-sky-500/25 border-sky-400 ring-2 ring-sky-400/50 shadow-md font-bold'
                          : 'bg-slate-950/60 hover:bg-slate-800 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="font-['Press_Start_2P'] text-[7.5px] text-white truncate">{tun.label}</div>
                      <div className="text-[7.5px] font-mono text-sky-400 mt-0.5 font-bold">{tun.sub}</div>
                      <div className="text-[7px] text-slate-400 mt-1 line-clamp-2">{tun.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. SURROUNDINGS ENVIRONMENT & ATHLETICS TRACK */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2 bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                  <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" />
                    <span>SURROUNDINGS & HORIZON BACKDROP</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {[
                      { id: 'big_city', label: 'BIG CITY METROPOLIS' },
                      { id: 'nature', label: 'NATURE & HIGHLANDS' },
                      { id: 'beach', label: 'SEASIDE WATERFRONT' },
                      { id: 'industrial', label: 'INDUSTRIAL DOCKS' },
                      { id: 'railroad', label: 'RAILWAY JUNCTION' },
                      { id: 'airport', label: 'AIRPORT RUNWAY' },
                    ].map((env) => (
                      <button
                        key={env.id}
                        type="button"
                        onClick={() => update('surroundings', env.id as SurroundingsType)}
                        className={`p-2 rounded-lg border text-left transition-all cursor-pointer truncate ${
                          (config.surroundings || 'big_city') === env.id
                            ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400'
                            : 'bg-slate-900 text-slate-300 hover:bg-slate-850 border-slate-800'
                        }`}
                      >
                        <div className="text-[7.5px] font-mono font-bold truncate">{env.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Athletics Track Toggle */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider mb-1">
                      ATHLETICS TRACK
                    </div>
                    <p className="text-[8.5px] text-slate-400 leading-tight">
                      Red Tartan 400m synthetic running track encircling the pitch apron.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => update('hasTrack', !config.hasTrack)}
                    className={`mt-2 py-2 px-3 rounded-lg border font-['Press_Start_2P'] text-[8px] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      config.hasTrack
                        ? 'bg-rose-500 text-white border-rose-400 shadow-md font-bold'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span>{config.hasTrack ? '✓ 400m OLYMPIC TRACK' : 'PITCH-ONLY APRON'}</span>
                  </button>
                </div>
              </div>

              {/* Goal Frame & Net Tension */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Goal Frame Architecture */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
                  <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider mb-2">
                    GOAL FRAME STRUCTURE
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {
                        id: 'standard',
                        label: 'REGULATION FRAME',
                        desc: 'Classic European continental angled stanchions',
                      },
                      {
                        id: 'brazilian',
                        label: 'BRAZILIAN DEEP BOX',
                        desc: 'Deep box frame with suspended rear netting',
                      },
                    ].map((gf) => (
                      <button
                        key={gf.id}
                        type="button"
                        onClick={() => update('goalFrame', gf.id as GoalFrameType)}
                        className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                          config.goalFrame === gf.id
                            ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                            : 'bg-slate-900 text-slate-300 hover:bg-slate-850 border-slate-800'
                        }`}
                      >
                        <div className="text-[8.5px] font-['Press_Start_2P']">{gf.label}</div>
                        <div className="text-[8px] mt-1 opacity-80">{gf.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Net Tension & Ricochet Physics */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
                  <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider mb-2">
                    GOAL NET TENSION & RICOCHET
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'hard', label: 'HARD TENSION', desc: 'Instant ricochet rebound' },
                      { id: 'moderate', label: 'MODERATE GIVE', desc: 'Balanced cushion bulge' },
                      { id: 'soft', label: 'SOFT DRAPE', desc: 'Ball caught deep in net' },
                    ].map((nt) => (
                      <button
                        key={nt.id}
                        type="button"
                        onClick={() => update('netTension', nt.id as NetTension)}
                        className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                          config.netTension === nt.id
                            ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400'
                            : 'bg-slate-900 text-slate-300 hover:bg-slate-850 border-slate-800'
                        }`}
                      >
                        <div className="text-[8px] font-mono font-black">{nt.label}</div>
                        <div className="text-[7.5px] opacity-80 mt-0.5">{nt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* FOOTER: CONFIRM & APPLY                                                   */}
        {/* ========================================================================= */}
        <div className="bg-slate-950 px-4 py-3 border-t-2 border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-[9px] sm:text-[10px] font-mono text-slate-400">
            Current Setup: <span className="text-emerald-400 font-bold">{config.stadiumTier.toUpperCase()}</span> · <span className="text-amber-400 font-bold">{config.turfQuality.toUpperCase()} TURF</span> · <span className="text-sky-400 font-bold">{config.mowingPattern.toUpperCase()}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-[9px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer border border-slate-700"
            >
              CANCEL
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-2 text-[10px] font-['Press_Start_2P'] bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/30 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>CONFIRM STADIUM</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
