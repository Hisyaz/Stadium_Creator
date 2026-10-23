/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import {
  TeamDefinition,
  TeamRosterPlayer,
  PlayerRole,
  SubPosition,
  FormationName,
  TacticalPlaystyle,
  TeamKit,
  PlayerPlaystyle,
} from '../types';
import { calculatePlayerOvr } from '../game/teams';
import { TACTICAL_BOARD_FORMATIONS, FORMATION_LIST, validateFormationStructure } from '../game/formations';
import {
  evaluatePitchDrop,
  clampOutfieldCoordinates,
  getRoleAndLabelForSubPosition,
  isPlaystyleCompatibleWithSubPosition,
  SubPositionZoneConfig,
  GK_SANCTUARY_BOX,
  MECHANICAL_PITCH_TIERS,
} from '../game/pitchGrid';
import { audio } from '../game/audio';
import { Sparkles, Zap, Shield, ArrowRightLeft, Move, Hand, Lock, Check, X, Crosshair, AlertTriangle } from 'lucide-react';

interface TacticalPitchBoardProps {
  team: TeamDefinition;
  side: 'home' | 'away';
  isOpponent?: boolean;
  selectedPlayerId: string | null;
  onSelectPlayer: (player: TeamRosterPlayer, isBench: boolean) => void;
  formation: FormationName;
  onChangeFormation?: (formation: FormationName) => void;
  tacticalPlaystyle: TacticalPlaystyle;
  onChangePlaystyle?: (playstyle: TacticalPlaystyle) => void;
  captainId: string;
  activeKit?: TeamKit;
  onSwapPlayers?: (idA: string, idB: string) => void;
  onSubstitute?: (pitchPlayerId: string, benchPlayerId: string) => void;
  onPlayerPositionChange?: (
    playerId: string,
    pos: { x: number; y: number },
    newRole: PlayerRole,
    newSubPos: SubPosition,
    pesLabel: string
  ) => void;
  isCompactMobile?: boolean;
}

/**
 * PHASE 16: Authentic 32-Bit Retro Football Jersey Silhouette (Banishing the Cross Shape)
 * Shoulders and sleeves are aligned smoothly with the top collar line, sloping naturally down to sleeves.
 * Centered squad number with high-contrast 32-bit pixel shadow.
 */
export const PixelKitIcon: React.FC<{
  primaryColor: string;
  secondaryColor?: string;
  number?: number;
  className?: string;
}> = ({ primaryColor, secondaryColor = '#ffffff', number, className = 'w-7 h-7 sm:w-8 sm:h-8' }) => {
  return (
    <div className={`relative shrink-0 flex items-center justify-center select-none ${className}`}>
      <svg
        viewBox="0 0 24 24"
        className="w-full h-full drop-shadow-[0_2px_4px_rgba(0,0,0,0.65)]"
        shapeRendering="crispEdges"
      >
        {/* Outer high-contrast 32-bit pixel border outline */}
        <path
          d="M7 2h10l5 3v5l-4 1v9H6v-9l-4-1V5l5-3z"
          fill="#000000"
          opacity={0.5}
        />

        {/* Main Football Jersey Silhouette (Sleeves aligned with top shoulder line, no horizontal cross bar) */}
        <path
          d="M8 3l-5 2v4l3 1v9h12v-9l3-1V5l-5-2H8z"
          fill={primaryColor}
        />

        {/* 32-Bit Collar & V-Neckline Accent */}
        <path d="M10 3h4l-2 3-2-3z" fill={secondaryColor} />

        {/* Left & Right Sleeve Cuffs */}
        <path d="M3 8l3 1v-1l-3-1v1z" fill={secondaryColor} />
        <path d="M21 8l-3 1v-1l3-1v1z" fill={secondaryColor} />

        {/* Bottom Hem Trim */}
        <path d="M6 18h12v1H6z" fill={secondaryColor} opacity={0.7} />

        {/* 32-Bit Subtle Fabric Depth & Seam Shading */}
        <path d="M6 10h1v8H6z" fill="#000000" opacity={0.18} />
        <path d="M17 10h1v8h-1z" fill="#ffffff" opacity={0.2} />
      </svg>

      {/* Squad Number centered cleanly inside the chest area */}
      {number !== undefined && (
        <span className="absolute inset-0 flex items-center justify-center text-[10px] sm:text-[11px] font-mono font-black text-white drop-shadow-[0_1px_3px_rgba(0,0,0,1)] pt-0.5">
          {number}
        </span>
      )}
    </div>
  );
};

/**
 * Phase 16.5: Infers tactical role and standard position label based on 3-tier partitioning & geometry
 */
export function inferRoleFromPitchCoords(
  x: number,
  y: number,
  currentRole: PlayerRole,
  currentSubPos?: SubPosition
): { subPosition: SubPosition; pesLabel: string; role: PlayerRole } {
  // Goalkeeper Zone Sanctuary Box
  if (
    currentRole === 'GK' ||
    (y >= GK_SANCTUARY_BOX.minY && x >= GK_SANCTUARY_BOX.minX && x <= GK_SANCTUARY_BOX.maxX)
  ) {
    return { subPosition: 'GK', pesLabel: 'GK', role: 'GK' };
  }

  const evalResult = evaluatePitchDrop(x, y, currentSubPos);
  const best = evalResult.primaryMatch;
  const { role, pesLabel } = getRoleAndLabelForSubPosition(best.subPos, x);

  return { subPosition: best.subPos, pesLabel, role };
}

export function getPositionalBadgeColor(label?: string) {
  if (!label) {
    return 'bg-emerald-500 text-slate-950 font-black border-emerald-200 shadow-sm';
  }
  if (label === 'GK') {
    return 'bg-amber-400 text-slate-950 font-black border-amber-200 shadow-sm';
  }
  if (['CB', 'LB', 'RB', 'LWB', 'RWB', 'LIB'].includes(label)) {
    return 'bg-sky-500 text-slate-950 font-black border-sky-200 shadow-sm';
  }
  if (['CDM', 'DMF', 'CM', 'CMF', 'CAM', 'AMF', 'LM', 'LMF', 'RM', 'RMF'].includes(label)) {
    return 'bg-emerald-500 text-slate-950 font-black border-emerald-200 shadow-sm';
  }
  return 'bg-rose-600 text-white font-black border-rose-300 shadow-sm';
}

export function getOvrTextColor(ovr: number) {
  if (ovr >= 95) return 'text-amber-300 drop-shadow-[0_0_6px_rgba(245,158,11,0.9)]';
  if (ovr >= 90) return 'text-amber-400';
  if (ovr >= 85) return 'text-emerald-400';
  if (ovr >= 75) return 'text-sky-300';
  return 'text-slate-200';
}

export function getOvrColorClass(ovr: number) {
  if (ovr >= 95) return 'text-amber-300 bg-amber-950/80 border-amber-400/80 shadow-[0_0_8px_rgba(245,158,11,0.6)]';
  if (ovr >= 90) return 'text-amber-300 bg-amber-950/60 border-amber-500/50';
  if (ovr >= 85) return 'text-emerald-300 bg-emerald-950/60 border-emerald-500/50';
  if (ovr >= 75) return 'text-sky-300 bg-sky-950/60 border-sky-500/50';
  return 'text-slate-200 bg-slate-900 border-slate-700';
}

function hasStatBreak(p: TeamRosterPlayer): boolean {
  if (!p.canonicalStats) return false;
  return Object.values(p.canonicalStats).some((val) => typeof val === 'number' && val > 99);
}

export const TacticalPitchBoard: React.FC<TacticalPitchBoardProps> = ({
  team,
  side,
  selectedPlayerId,
  onSelectPlayer,
  formation,
  onChangeFormation,
  tacticalPlaystyle,
  captainId,
  activeKit,
  onPlayerPositionChange,
  isCompactMobile = false,
}) => {
  const pitchRef = useRef<HTMLDivElement>(null);
  const formationSlots = TACTICAL_BOARD_FORMATIONS[formation] || TACTICAL_BOARD_FORMATIONS['4-3-3'];

  // Calculate live team average OVR
  const teamAvgOvr = useMemo(() => {
    if (!team?.players || team.players.length === 0) return team?.averageOvr || 80;
    const sum = team.players.reduce((acc, p) => acc + (p ? calculatePlayerOvr(p.canonicalStats, p.role) : 75), 0);
    return Math.round(sum / (team.players.length || 1));
  }, [team]);

  const substitutes = team?.substitutes || [];

  // Local positions map for smooth 60fps drag & drop
  const [positions, setPositions] = useState<Record<string, { x: number; y: number; label: string }>>({});

  // Sync positions from formation or custom coordinates
  useEffect(() => {
    const nextPositions: Record<string, { x: number; y: number; label: string }> = {};
    const slotKeys = Object.keys(formationSlots) as PlayerRole[];

    (team?.players || []).forEach((player, idx) => {
      if (player.customPos) {
        const inf = inferRoleFromPitchCoords(player.customPos.x, player.customPos.y, player.role);
        nextPositions[player.id] = {
          x: player.customPos.x,
          y: player.customPos.y,
          label: inf.pesLabel,
        };
      } else if (formationSlots[player.role]) {
        nextPositions[player.id] = {
          x: formationSlots[player.role].x,
          y: formationSlots[player.role].y,
          label: formationSlots[player.role].label,
        };
      } else {
        const fallback = formationSlots[slotKeys[idx % slotKeys.length]];
        nextPositions[player.id] = {
          x: fallback?.x || 0.5,
          y: fallback?.y || 0.5,
          label: fallback?.label || player.role,
        };
      }
    });

    setPositions(nextPositions);
  }, [formation, team.players, formationSlots]);

  // Dragging state tracking
  const [draggingPlayerId, setDraggingPlayerId] = useState<string | null>(null);
  const dragActiveRef = useRef<boolean>(false);

  // Phase 16.5: Tactile Disambiguation Popover State for Multi-Role Overlap Drops
  const [pendingDisambiguation, setPendingDisambiguation] = useState<{
    playerId: string;
    playerName: string;
    coords: { x: number; y: number };
    candidates: SubPositionZoneConfig[];
    currentSubPos?: SubPosition;
    playerIntrinsicPlaystyle?: PlayerPlaystyle;
  } | null>(null);

  // Formation structure validation: >=2 DEF, >=2 MID, >=1 ATT, 1 GK
  const formationValidation = useMemo(() => {
    return validateFormationStructure(
      (team?.players || []).map((p) => ({
        role: p.role,
        subPosition: p.subPosition,
        label: positions[p.id]?.label || p.subPosition || p.role,
      }))
    );
  }, [team?.players, positions]);

  const handlePointerDown = (playerId: string, e: React.PointerEvent) => {
    // Only drag with left mouse button or touch
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.stopPropagation();

    const p = team.players.find((pl) => pl.id === playerId);
    if (p) {
      onSelectPlayer(p, false);
      // Non-draggable Goalkeeper Mandate (Section 16.5.1)
      if (p.role === 'GK' || p.subPosition === 'GK') {
        return;
      }
    }

    const targetEl = e.currentTarget as HTMLElement;
    targetEl.setPointerCapture(e.pointerId);

    setDraggingPlayerId(playerId);
    dragActiveRef.current = true;
    // Dismiss any open popover when starting a new drag
    setPendingDisambiguation(null);
  };

  const handlePointerMove = (playerId: string, e: React.PointerEvent) => {
    if (!dragActiveRef.current || draggingPlayerId !== playerId || !pitchRef.current) return;
    e.preventDefault();

    const rect = pitchRef.current.getBoundingClientRect();
    const rawX = (e.clientX - rect.left) / rect.width;
    const rawY = (e.clientY - rect.top) / rect.height;

    // Strict 3-zone boundaries & Goalkeeper sanctuary box clamping (Section 16.5.1 & 16.5.2)
    const clamped = clampOutfieldCoordinates(rawX, rawY);
    const p = team.players.find((pl) => pl.id === playerId);
    const evalResult = evaluatePitchDrop(clamped.x, clamped.y, p?.subPosition);

    setPositions((prev) => ({
      ...prev,
      [playerId]: {
        x: clamped.x,
        y: clamped.y,
        label: evalResult.primaryMatch.pesLabel,
      },
    }));
  };

  const handlePointerUp = (playerId: string, e: React.PointerEvent) => {
    if (draggingPlayerId !== playerId) return;
    dragActiveRef.current = false;
    setDraggingPlayerId(null);

    try {
      const targetEl = e.currentTarget as HTMLElement;
      targetEl.releasePointerCapture(e.pointerId);
    } catch {}

    const currentPos = positions[playerId];
    if (currentPos) {
      const p = team.players.find((pl) => pl.id === playerId);
      if (p) {
        const evalResult = evaluatePitchDrop(currentPos.x, currentPos.y, p.subPosition);

        // Section 16.5.3: Overlap Detection & Tactile Disambiguation Popover
        if (evalResult.isOverlap && evalResult.candidates.length > 1) {
          audio.playKick(0.25);
          setPendingDisambiguation({
            playerId: p.id,
            playerName: p.name,
            coords: { x: currentPos.x, y: currentPos.y },
            candidates: evalResult.candidates,
            currentSubPos: p.subPosition,
            playerIntrinsicPlaystyle: p.intrinsicPlaystyle || p.playstyle,
          });
        } else {
          // Single-Match Drop
          audio.playKick(0.35);
          const best = evalResult.primaryMatch;
          const { role, pesLabel } = getRoleAndLabelForSubPosition(best.subPos, currentPos.x);

          setPositions((prev) => ({
            ...prev,
            [playerId]: {
              x: currentPos.x,
              y: currentPos.y,
              label: pesLabel,
            },
          }));

          if (formation !== 'custom') {
            onChangeFormation?.('custom');
          }

          onPlayerPositionChange?.(
            playerId,
            { x: currentPos.x, y: currentPos.y },
            role,
            best.subPos,
            pesLabel
          );
        }
      }
    }
  };

  // Selection from Tactile Disambiguation Popover
  const handleSelectCandidate = (candidate: SubPositionZoneConfig) => {
    if (!pendingDisambiguation) return;
    const { playerId, coords } = pendingDisambiguation;
    const { role, pesLabel } = getRoleAndLabelForSubPosition(candidate.subPos, coords.x);

    audio.playKick(0.4);
    if (formation !== 'custom') {
      onChangeFormation?.('custom');
    }
    setPositions((prev) => ({
      ...prev,
      [playerId]: {
        x: coords.x,
        y: coords.y,
        label: pesLabel,
      },
    }));

    onPlayerPositionChange?.(
      playerId,
      coords,
      role,
      candidate.subPos,
      pesLabel
    );

    setPendingDisambiguation(null);
  };

  // Dismiss popover on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && pendingDisambiguation) {
        handleSelectCandidate(pendingDisambiguation.candidates[0]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingDisambiguation]);

  return (
    <div className="flex flex-col h-full bg-slate-950/95 border-2 border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl relative select-none">
      {/* ========================================================================= */}
      {/* 16.3 HEADER: 32-BIT BRUSHED METALLIC ARCADE CONSOLE HEADER WITH BUMPERS  */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-2.5 sm:px-3 py-1 sm:py-1.5 border-b-2 border-slate-700/80 flex items-center justify-between gap-2 shrink-0 shadow-inner">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-sm sm:text-base font-bold shadow-md border border-white/30 shrink-0"
            style={{ backgroundColor: team?.badge?.bg || '#1e293b', color: team?.badge?.primaryColor || '#f8fafc' }}
          >
            {team?.badge?.icon || team?.badge?.text || team?.shortName || 'FC'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className={`px-1.5 py-0.2 rounded text-[8px] font-mono font-black uppercase tracking-wider ${
                  side === 'home'
                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                }`}
              >
                {side.toUpperCase()}
              </span>
              <span className="text-[10px] font-black font-mono text-amber-400 bg-amber-400/15 px-1.5 py-0.2 rounded border border-amber-500/40">
                ★ {teamAvgOvr} OVR
              </span>
            </div>
            <h3 className="text-xs sm:text-sm font-black text-white truncate tracking-wide mt-0.5">{team?.name || 'TEAM'}</h3>
          </div>
        </div>

        {/* Tactical Philosophy Crown Banner */}
        <div className="text-right shrink-0">
          <div className="flex items-center justify-end gap-1 text-[8px] font-mono text-amber-400 font-bold uppercase">
            <Sparkles className="w-2.5 h-2.5" />
            <span>PHILOSOPHY</span>
          </div>
          <div className="text-[10px] sm:text-[11px] font-['Press_Start_2P'] text-emerald-400 tracking-tight mt-0.5 max-w-[150px] truncate">
            {(team?.tacticalPlaystyle || tacticalPlaystyle || 'possession').replace(/_/g, ' ').toUpperCase()}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MAIN BODY: OUTER FLANK BENCH RAIL + SCALED 32-BIT PITCH BOARD            */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-row overflow-hidden relative min-h-0">
        {/* ===================================================================== */}
        {/* 16.3 VERTICAL BENCH RAIL (32-BIT RETRO SQUAD ROSTER)                  */}
        {/* ===================================================================== */}
        <div
          className={`w-28 sm:w-36 md:w-40 bg-slate-950/90 border-r-2 border-slate-800 p-1.5 sm:p-2 flex flex-col shrink-0 overflow-y-auto ${
            isCompactMobile ? 'hidden sm:flex' : 'flex'
          }`}
        >
          <div className="flex items-center justify-between text-[8px] sm:text-[9px] font-mono text-slate-400 border-b border-slate-800 pb-1 mb-1.5 shrink-0">
            <span className="font-black text-slate-300 uppercase tracking-wider flex items-center gap-1">
              <Shield className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400" />
              BENCH ({substitutes.length})
            </span>
            <span className="text-slate-500">OVR</span>
          </div>

          <div className="space-y-1 flex-1 overflow-y-auto pr-0.5">
            {substitutes.map((sub) => {
              const ovr = calculatePlayerOvr(sub.canonicalStats, sub.role);
              const isSelected = selectedPlayerId === sub.id;
              const hasBreak = hasStatBreak(sub);
              const badgeClass = getPositionalBadgeColor(sub.subPosition || sub.role);

              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => onSelectPlayer(sub, true)}
                  className={`w-full text-left p-1 sm:p-1.5 rounded-lg border transition-all flex items-center justify-between gap-1 group cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/25 border-amber-400 ring-2 ring-amber-400/50 shadow-lg scale-[1.02]'
                      : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1 min-w-0">
                    <span
                      className={`px-1 py-0.2 rounded text-[7px] sm:text-[7.5px] font-mono font-black uppercase tracking-tighter shrink-0 border ${badgeClass}`}
                    >
                      {sub.subPosition || sub.role}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[8.5px] sm:text-[9.5px] font-black text-slate-200 truncate group-hover:text-amber-300 tracking-tight">
                        {sub?.name ? sub.name.toUpperCase() : 'SUB'}
                      </div>
                      <div className="text-[7px] font-mono text-slate-400">
                        #{sub?.number ?? 12}
                      </div>
                    </div>
                    {hasBreak && <Zap className="w-2 h-2 text-amber-400 fill-amber-400 shrink-0 animate-pulse" />}
                  </div>

                  <span
                    className={`font-mono font-black text-[8.5px] sm:text-[9.5px] px-1 py-0.2 rounded shrink-0 border ${getOvrColorClass(
                      ovr
                    )}`}
                  >
                    ★{ovr}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ===================================================================== */}
        {/* 16.2 & 16.3 AUTHENTIC 32-BIT PITCH SURFACE & DRAG-AND-DROP ENGINE     */}
        {/* ===================================================================== */}
        <div className="flex-1 min-h-0 relative bg-gradient-to-b from-[#0b3319] via-[#0d4220] to-[#0b3319] p-1 sm:p-2 flex items-center justify-center overflow-hidden">
          {/* Authentic 32-Bit Lawn Mowing Stripes + Pixel Dither Grid */}
          <div className="absolute inset-0 opacity-25 pointer-events-none bg-[repeating-linear-gradient(0deg,#000,#000_28px,#fff_28px,#fff_56px)] mix-blend-overlay" />
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:8px_8px]" />

          {/* Scaled Full Pitch Container - Zero scroll, aspect ratio preserved */}
          <div
            ref={pitchRef}
            className="relative h-full max-h-full max-w-full aspect-[68/105] rounded-xl border-2 border-white/60 shadow-[0_0_20px_rgba(0,0,0,0.85)] overflow-hidden bg-[#105228]/95 flex flex-col justify-between select-none mx-auto"
          >
            {/* Structural Formation Validation Warning Banner */}
            {!formationValidation.isValid && (
              <div className="absolute top-1.5 left-1.5 right-1.5 z-40 bg-rose-950/95 border-2 border-rose-500 rounded-lg px-2 py-1 shadow-xl flex items-center gap-1.5 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <div className="min-w-0">
                  <div className="font-['Press_Start_2P'] text-[6.5px] sm:text-[7.5px] text-rose-300 font-bold tracking-tight">
                    INVALID FORMATION
                  </div>
                  <div className="text-[7px] font-mono text-rose-200 truncate mt-0.5">
                    {formationValidation.message}
                  </div>
                </div>
              </div>
            )}

            {/* 32-Bit Goal Net Perspective at Top (Opponent Goal Mouth) */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[34%] h-[3.5%] bg-white/10 border-x-2 border-b-2 border-white/60 pointer-events-none z-0">
              <div className="w-full h-full opacity-30 bg-[repeating-linear-gradient(45deg,#fff,#fff_2px,transparent_2px,transparent_6px)]" />
            </div>

            {/* Field Markings: Top Penalty Box */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-[15%] border-b-2 border-x-2 border-white/60 pointer-events-none" />
            {/* Top 6-Yard Box */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[30%] h-[5.5%] border-b-2 border-x-2 border-white/60 pointer-events-none" />
            {/* Top Penalty Arc */}
            <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[22%] h-[5%] border-b-2 border-white/50 rounded-b-full pointer-events-none" />
            {/* Top Penalty Spot */}
            <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white/90 pointer-events-none" />

            {/* Halfway Line */}
            <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-white/60 pointer-events-none -translate-y-1/2" />
            {/* Center Circle with 32-Bit Pixel Perimeter */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[26%] aspect-square rounded-full border-2 border-white/60 pointer-events-none" />
            {/* Center Spot */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white/90 pointer-events-none" />

            {/* Bottom Penalty Arc */}
            <div className="absolute bottom-[15%] left-1/2 -translate-x-1/2 w-[22%] h-[5%] border-t-2 border-white/50 rounded-t-full pointer-events-none" />
            {/* Bottom Penalty Spot */}
            <div className="absolute bottom-[10%] left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white/90 pointer-events-none" />
            {/* Bottom Penalty Box (Goalkeeper Territory) */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60%] h-[15%] border-t-2 border-x-2 border-white/60 pointer-events-none" />
            {/* Bottom 6-Yard Box */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[30%] h-[5.5%] border-t-2 border-x-2 border-white/60 pointer-events-none" />

            {/* 32-Bit Goal Net Perspective at Bottom (Defending Goal Mouth) */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[34%] h-[3.5%] bg-white/10 border-x-2 border-t-2 border-white/60 pointer-events-none z-0">
              <div className="w-full h-full opacity-30 bg-[repeating-linear-gradient(45deg,#fff,#fff_2px,transparent_2px,transparent_6px)]" />
            </div>

            {/* 32-Bit Pixelated Corner Flags */}
            <div className="absolute top-0 left-0 w-2.5 h-2.5 border-r-2 border-b-2 border-white/70 rounded-br-full pointer-events-none" />
            <div className="absolute top-0 right-0 w-2.5 h-2.5 border-l-2 border-b-2 border-white/70 rounded-bl-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-r-2 border-t-2 border-white/70 rounded-tr-full pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-l-2 border-t-2 border-white/70 rounded-tl-full pointer-events-none" />

            {/* ================================================================= */}
            {/* PHASE 16.5: THREE-TIER MECHANICAL PITCH GUIDES (SHOWN ON DRAG)    */}
            {/* ================================================================= */}
            {draggingPlayerId && (
              <>
                {/* ATT / MID Divider (y = 0.36) */}
                <div className="absolute top-[36%] left-0 right-0 border-b border-amber-400/40 border-dashed pointer-events-none z-10 flex items-center justify-between px-2">
                  <span className="text-[7.5px] font-mono font-bold text-amber-300/80 bg-slate-950/70 px-1 rounded">
                    ⚡ ATTACKER ZONE
                  </span>
                  <span className="text-[7.5px] font-mono font-bold text-emerald-300/80 bg-slate-950/70 px-1 rounded">
                    ⚙️ MIDFIELD ZONE
                  </span>
                </div>
                {/* MID / DEF Divider (y = 0.68) */}
                <div className="absolute top-[68%] left-0 right-0 border-b border-sky-400/40 border-dashed pointer-events-none z-10 flex items-center justify-between px-2">
                  <span className="text-[7.5px] font-mono font-bold text-emerald-300/80 bg-slate-950/70 px-1 rounded">
                    ⚙️ MIDFIELD ZONE
                  </span>
                  <span className="text-[7.5px] font-mono font-bold text-sky-300/80 bg-slate-950/70 px-1 rounded">
                    🛡️ DEFENDER ZONE
                  </span>
                </div>
              </>
            )}

            {/* ================================================================= */}
            {/* PHASE 16.5: FIXED GOALKEEPER SANCTUARY BOX (y: 88-94%, x: 38-62%)  */}
            {/* ================================================================= */}
            <div
              style={{
                left: `${GK_SANCTUARY_BOX.minX * 100}%`,
                top: `${GK_SANCTUARY_BOX.minY * 100}%`,
                width: `${(GK_SANCTUARY_BOX.maxX - GK_SANCTUARY_BOX.minX) * 100}%`,
                height: `${(GK_SANCTUARY_BOX.maxY - GK_SANCTUARY_BOX.minY) * 100}%`,
              }}
              className="absolute border border-amber-400/50 border-dotted rounded bg-amber-400/5 pointer-events-none flex items-center justify-center z-10"
            >
              <span className="text-[6.5px] font-mono font-black text-amber-300/70 tracking-tighter uppercase px-1 py-0.2 bg-slate-950/60 rounded flex items-center gap-0.5">
                <Lock className="w-2 h-2" /> GK SANCTUARY
              </span>
            </div>

            {/* ================================================================= */}
            {/* 16.1 & 16.2 SLIMMER 32-BIT PLAYER MARKERS WITH DRAG & DROP        */}
            {/* ================================================================= */}
            {(team?.players || []).map((player) => {
              const pos = positions[player.id] || { x: 0.5, y: 0.5, label: player.role };
              const ovr = calculatePlayerOvr(player.canonicalStats, player.role);
              const isSelected = selectedPlayerId === player.id;
              const isDragging = draggingPlayerId === player.id;
              const isCap = player.id === captainId || player.isCaptain;
              const hasBreak = hasStatBreak(player);
              const isGK = player.role === 'GK' || player.subPosition === 'GK';
              const isBasic = player.playstyle === 'basic';
              const badgeClass = getPositionalBadgeColor(pos.label);

              const leftPercent = pos.x * 100;
              const topPercent = pos.y * 100;

              return (
                <div
                  key={player.id}
                  style={{
                    left: `${leftPercent}%`,
                    top: `${topPercent}%`,
                    transform: 'translate(-50%, -50%)',
                    touchAction: isGK ? 'auto' : 'none',
                  }}
                  onPointerDown={(e) => handlePointerDown(player.id, e)}
                  onPointerMove={(e) => handlePointerMove(player.id, e)}
                  onPointerUp={(e) => handlePointerUp(player.id, e)}
                  onPointerCancel={(e) => handlePointerUp(player.id, e)}
                  className={`absolute transition-transform select-none ${
                    isGK
                      ? 'cursor-pointer z-30'
                      : isDragging
                      ? 'z-50 scale-115 cursor-grabbing'
                      : isSelected
                      ? 'z-40 scale-108 cursor-grab'
                      : 'z-20 hover:scale-105 cursor-grab'
                  }`}
                >
                  {/* Selection Indicator Cursor */}
                  {isSelected && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce z-40 pointer-events-none">
                      <span className="text-xs text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,1)] font-black">
                        ▼
                      </span>
                    </div>
                  )}

                  {/* Dragging Reticle Crosshair */}
                  {isDragging && (
                    <div className="absolute -inset-2 rounded-xl border border-amber-400/80 border-dashed pointer-events-none animate-pulse" />
                  )}

                  {/* 16.1 COMPACT RETRO GLASS PLAYER CARD (SLIMMER FOOTPRINT & TRANSLUCENT) */}
                  <div
                    className={`relative flex flex-col items-center w-[44px] sm:w-[50px] md:w-[54px] rounded-lg border transition-all overflow-hidden ${
                      isDragging
                        ? 'bg-amber-950/70 border-amber-400 ring-2 ring-amber-400 shadow-[0_0_18px_rgba(245,158,11,0.9)]'
                        : isSelected
                        ? 'bg-slate-950/50 border-amber-400 ring-2 ring-amber-400/60 shadow-[0_0_14px_rgba(245,158,11,0.6)]'
                        : isGK
                        ? 'bg-slate-950/45 backdrop-blur-[2px] border-amber-400/40 hover:border-amber-400 shadow-md'
                        : 'bg-slate-950/35 backdrop-blur-[2px] border-white/25 hover:border-amber-400/50 hover:bg-slate-950/50 shadow-md'
                    }`}
                  >
                    {/* Top Strip: Role Badge + Compact OVR */}
                    <div className="w-full flex items-center justify-between gap-0.5 px-0.5 sm:px-1 py-0.2 bg-slate-950/40 border-b border-white/10">
                      <div className="flex items-center gap-0.5 min-w-0">
                        <span
                          className={`px-0.5 sm:px-1 py-0.2 rounded text-[6.5px] sm:text-[7.5px] font-mono font-black uppercase tracking-tighter shrink-0 border ${badgeClass}`}
                        >
                          {pos.label}
                        </span>
                        {isGK && (
                          <span title="Fixed Goalkeeper" className="flex items-center">
                            <Lock className="w-1.5 h-1.5 sm:w-2 sm:h-2 text-amber-400 shrink-0" />
                          </span>
                        )}
                        {isBasic && (
                          <span
                            className="px-0.5 py-0.2 bg-amber-500/20 text-amber-300 text-[5.5px] sm:text-[6.5px] font-mono font-bold rounded border border-amber-500/30"
                            title="Operating on baseline attributes without special playstyle modifiers"
                          >
                            BSC
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <span className={`font-mono font-black text-[7.5px] sm:text-[8.5px] tracking-tight ${getOvrTextColor(ovr)}`}>
                          ★{ovr}
                        </span>
                        {hasBreak && (
                          <Zap className="w-2 h-2 text-amber-400 fill-amber-400 shrink-0 animate-pulse" />
                        )}
                      </div>
                    </div>

                    {/* Middle: Phase 16 Redesigned Jersey Shirt Silhouette + Captain Armband */}
                    <div className="py-0.5 px-0.5 flex items-center justify-center relative w-full">
                      <PixelKitIcon
                        primaryColor={activeKit?.primaryColor || team.kit.primaryColor}
                        secondaryColor={activeKit?.secondaryColor || team.kit.secondaryColor}
                        number={player.number}
                        className="w-5 h-5 sm:w-6 sm:h-6"
                      />
                      {isCap && (
                        <span className="absolute top-0 right-0 px-0.5 py-0.2 bg-amber-400 text-slate-950 rounded text-[6px] font-black font-mono shadow-sm">
                          C
                        </span>
                      )}
                    </div>

                    {/* Bottom: Player Surname on Translucent Ribbon */}
                    <div className="w-full px-0.5 py-0.2 bg-slate-950/60 text-center border-t border-white/10">
                      <span className="text-[7px] sm:text-[8px] font-mono font-black text-white tracking-tight truncate block max-w-[40px] sm:max-w-[48px] mx-auto drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">
                        {player?.name ? player.name.toUpperCase() : 'PLAYER'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* ================================================================= */}
            {/* PHASE 16.5.3: TACTILE DISAMBIGUATION POPOVER FOR MULTI-ROLE DROPS */}
            {/* ================================================================= */}
            {pendingDisambiguation && (
              <div
                className="absolute inset-0 z-50 pointer-events-auto"
                onClick={() => handleSelectCandidate(pendingDisambiguation.candidates[0])}
              >
                {/* Popover Card */}
                <div
                  style={{
                    left: `${Math.max(22, Math.min(78, pendingDisambiguation.coords.x * 100))}%`,
                    top: `${pendingDisambiguation.coords.y * 100}%`,
                    transform:
                      pendingDisambiguation.coords.y < 0.28
                        ? 'translate(-50%, 20px)'
                        : 'translate(-50%, calc(-100% - 20px))',
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute w-[240px] sm:w-[270px] bg-slate-950/95 border-2 border-amber-400 rounded-xl p-2.5 shadow-[0_0_30px_rgba(0,0,0,0.95)] backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 select-none z-50"
                >
                  {/* 32-Bit Metallic Header */}
                  <div className="flex items-center justify-between border-b border-amber-400/40 pb-1.5 mb-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-5 h-5 rounded bg-amber-400/20 border border-amber-400 flex items-center justify-center text-amber-300 text-xs shrink-0 font-bold">
                        ⚔️
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-['Press_Start_2P'] text-[8px] text-amber-300 truncate">
                          CHOOSE ROLE
                        </h4>
                        <div className="text-[7.5px] font-mono text-slate-400 truncate">
                          {pendingDisambiguation.playerName} · Overlap Zone
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelectCandidate(pendingDisambiguation.candidates[0])}
                      className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/10 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Candidate Position Badges */}
                  <div className="space-y-1.5">
                    {pendingDisambiguation.candidates.map((c) => {
                      const badgeClass = getPositionalBadgeColor(c.pesLabel);
                      const isCurrent = c.subPos === pendingDisambiguation.currentSubPos;
                      const intrinsic = pendingDisambiguation.playerIntrinsicPlaystyle;
                      const compatible = intrinsic && isPlaystyleCompatibleWithSubPosition(intrinsic, c.subPos);

                      return (
                        <button
                          key={c.subPos}
                          type="button"
                          onClick={() => handleSelectCandidate(c)}
                          className={`w-full text-left p-2 rounded-lg border transition-all flex items-center justify-between gap-2 group cursor-pointer ${
                            isCurrent
                              ? 'bg-amber-400/20 border-amber-400 shadow-md ring-1 ring-amber-400/60'
                              : 'bg-slate-900/90 hover:bg-slate-800 border-slate-700 hover:border-amber-400/60'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`px-2 py-0.5 rounded text-[8px] font-mono font-black uppercase tracking-wider shrink-0 border ${badgeClass}`}
                            >
                              {c.pesLabel}
                            </span>
                            <div className="min-w-0">
                              <div className="text-[10px] font-black text-white group-hover:text-amber-300 flex items-center gap-1 truncate">
                                <span>{c.icon}</span>
                                <span className="truncate">{c.name}</span>
                              </div>
                              <div className="text-[7.5px] font-mono text-slate-400 truncate mt-0.5">
                                {compatible ? (
                                  <span className="text-emerald-400 font-bold">✓ Playstyle Active</span>
                                ) : (
                                  <span className="text-amber-400/90 flex items-center gap-0.5">
                                    <AlertTriangle className="w-2.5 h-2.5 shrink-0" /> Reverts to Basic
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 text-slate-400 group-hover:text-amber-300">
                            <Check
                              className={`w-3.5 h-3.5 ${isCurrent ? 'text-amber-400' : 'opacity-0 group-hover:opacity-100'}`}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Arrow Pointer */}
                  <div
                    className={`absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-950 border-amber-400 rotate-45 ${
                      pendingDisambiguation.coords.y < 0.28
                        ? '-top-1.5 border-t-2 border-l-2'
                        : '-bottom-1.5 border-b-2 border-r-2'
                    }`}
                  />
                </div>
              </div>
            )}

            {/* Bottom Corner Pitch Badge: Formation & Kit Swatch */}
            <div className="absolute bottom-2 right-2 bg-slate-950/90 border border-slate-700/80 rounded-lg px-2 py-0.5 flex items-center gap-1.5 shadow-xl pointer-events-none z-10">
              <span
                className="w-2 h-2 rounded-full border border-white/60 shadow-sm"
                style={{ backgroundColor: activeKit?.primaryColor || team?.kit?.primaryColor || '#38bdf8' }}
              />
              <span className="font-['Press_Start_2P'] text-[8px] text-amber-300">{formation}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FOOTER: FORMATION QUICK-SHIFTER & INTERACTIVE DRAG-AND-DROP GUIDE        */}
      {/* ========================================================================= */}
      <div className="bg-slate-900/90 border-t-2 border-slate-700/80 px-2.5 sm:px-3 py-1 sm:py-1.5 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          {onChangeFormation && (
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] font-mono text-slate-400 font-bold uppercase">SYSTEM:</span>
              <select
                value={formation}
                onChange={(e) => onChangeFormation(e.target.value as FormationName)}
                className="bg-slate-950 border border-slate-700 hover:border-amber-500/50 text-amber-400 font-['Press_Start_2P'] text-[8px] px-2 py-1 rounded-lg focus:outline-none transition-colors cursor-pointer"
              >
                {FORMATION_LIST.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.id} ({f.tag})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="text-[8.5px] sm:text-[9.5px] font-mono text-amber-300/90 flex items-center gap-1.5 font-bold">
          <Move className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>DRAG PLAYERS TO REPOSITION & CHANGE ROLES</span>
        </div>
      </div>
    </div>
  );
};
