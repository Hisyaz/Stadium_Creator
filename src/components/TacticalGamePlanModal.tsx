/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, useState, useMemo, useEffect } from 'react';
import {
  TeamDefinition,
  TeamRosterPlayer,
  PlayerRole,
  SubPosition,
  FormationName,
  TacticalPlaystyle,
  DetailedTactics,
  TeamTacticalRoles,
} from '../types';
import { TacticalPitchBoard } from './TacticalPitchBoard';
import {
  CANONICAL_PLAYSTYLES,
  PLAYSTYLE_DEFINITIONS,
  FORMATION_LIST,
  getDefaultTactics,
  validateFormationStructure,
} from '../game/formations';
import { calculatePlayerOvr, getTeamById } from '../game/teams';
import { evaluatePlayerRoleFit, autoAssignOptimalRoles } from '../game/tactics';
import { resolveEffectivePlaystyle } from '../game/pitchGrid';
import {
  Shield,
  Sparkles,
  Zap,
  ArrowRightLeft,
  X,
  Check,
  RotateCcw,
  Sliders,
  Users,
  Crosshair,
  Crown,
  ChevronRight,
  Flame,
  AlertTriangle,
} from 'lucide-react';

export interface GamePlanPayload {
  homeTeam: TeamDefinition;
  awayTeam: TeamDefinition;
  homeFormation: FormationName;
  awayFormation: FormationName;
  homePlaystyle: TacticalPlaystyle;
  awayPlaystyle: TacticalPlaystyle;
  homeTactics: DetailedTactics;
  awayTactics: DetailedTactics;
  homeRoles: TeamTacticalRoles;
  awayRoles: TeamTacticalRoles;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onReset: () => void;
  onClose: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class GamePlanErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = { hasError: false };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('TacticalGamePlanModal caught error:', error, errorInfo);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md select-none">
          <div className="bg-slate-900 border-2 border-rose-500/80 rounded-2xl p-6 max-w-md w-full shadow-2xl text-center">
            <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3 animate-pulse" />
            <h3 className="font-['Press_Start_2P'] text-xs text-rose-400 mb-2">TACTICAL BOARD RECOVERED</h3>
            <p className="text-xs font-mono text-slate-300 mb-4">
              A temporary lineup formatting issue occurred. Click Reset to restore standard tactical formations safely without a blank screen.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false });
                  this.props.onReset();
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-['Press_Start_2P'] text-[10px] rounded-lg shadow-md cursor-pointer"
              >
                RESET TO DEFAULTS
              </button>
              <button
                type="button"
                onClick={this.props.onClose}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs rounded-lg cursor-pointer"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

interface TacticalGamePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialHomeTeam: TeamDefinition;
  initialAwayTeam: TeamDefinition;
  initialHomeFormation?: FormationName;
  initialAwayFormation?: FormationName;
  initialHomePlaystyle?: TacticalPlaystyle;
  initialAwayPlaystyle?: TacticalPlaystyle;
  initialHomeTactics?: DetailedTactics;
  initialAwayTactics?: DetailedTactics;
  initialHomeRoles?: TeamTacticalRoles;
  initialAwayRoles?: TeamTacticalRoles;
  onApplyGamePlan: (plan: GamePlanPayload) => void;
  isMidMatch?: boolean;
}

type TabType = 'game_plan' | 'roles' | 'tactics';

// Defensive helpers to guarantee zero blank screens or runtime crashes
function getSafeRolesForPlayers(players: TeamRosterPlayer[], roles?: TeamTacticalRoles): TeamTacticalRoles {
  const validIds = new Set((players || []).map((p) => p.id));
  const optimal = autoAssignOptimalRoles(players || []);
  const fallbackId = players && players.length > 0 ? players[0].id : 'p1';

  const captainId = roles?.captainId && validIds.has(roles.captainId) ? roles.captainId : (optimal.captainId || fallbackId);
  const freeKickNearId = roles?.freeKickNearId && validIds.has(roles.freeKickNearId) ? roles.freeKickNearId : (optimal.freeKickNearId || fallbackId);
  const freeKickLongId = roles?.freeKickLongId && validIds.has(roles.freeKickLongId) ? roles.freeKickLongId : (optimal.freeKickLongId || fallbackId);
  const penaltyTakerId = roles?.penaltyTakerId && validIds.has(roles.penaltyTakerId) ? roles.penaltyTakerId : (optimal.penaltyTakerId || fallbackId);
  const leftCornerTakerId = roles?.leftCornerTakerId && validIds.has(roles.leftCornerTakerId) ? roles.leftCornerTakerId : (optimal.leftCornerTakerId || fallbackId);
  const rightCornerTakerId = roles?.rightCornerTakerId && validIds.has(roles.rightCornerTakerId) ? roles.rightCornerTakerId : (optimal.rightCornerTakerId || fallbackId);

  return {
    captainId,
    freeKickNearId,
    freeKickLongId,
    penaltyTakerId,
    leftCornerTakerId,
    rightCornerTakerId,
  };
}

function getSafeSubPosition(subPos?: any, role?: any): SubPosition {
  if (subPos && !['ST1', 'ST2', 'CB1', 'CB2', 'CM1', 'CM2'].includes(subPos)) {
    return subPos as SubPosition;
  }
  const r = (role || '').toUpperCase();
  if (r === 'GK') return 'GK';
  if (r.startsWith('CB') || r === 'LIB' || r === 'SW') return 'CB';
  if (r.startsWith('LB')) return 'LB';
  if (r.startsWith('RB')) return 'RB';
  if (r.startsWith('ST') || r.startsWith('CF')) return 'ST';
  if (r.startsWith('SS')) return 'SS';
  if (r === 'LM' || r === 'LMF') return 'LM';
  if (r === 'RM' || r === 'RMF') return 'RM';
  if (r === 'LW' || r === 'LWF') return 'LW';
  if (r === 'RW' || r === 'RWF') return 'RW';
  if (r.startsWith('CDM') || r.startsWith('DM')) return 'CDM';
  if (r.startsWith('CAM') || r.startsWith('AM')) return 'CAM';
  return 'CM';
}

function sanitizeTeam(team?: TeamDefinition, fallbackId: string = 'spain_2026'): TeamDefinition {
  const fallback = getTeamById(fallbackId);
  const base = team && team.players && team.players.length >= 11 ? team : fallback;

  let players = (base.players || []).map((p) => ({
    ...p,
    name: p.name || 'Player',
    role: p.role || 'CM1',
    subPosition: getSafeSubPosition(p.subPosition, p.role),
    playstyle: p.playstyle || 'basic',
    canonicalStats: p.canonicalStats || fallback.players[0].canonicalStats,
  }));

  if (players.length < 11) {
    players = (fallback.players || []).map((p) => ({ ...p }));
  }

  const substitutes = (base.substitutes && base.substitutes.length > 0 ? base.substitutes : fallback.substitutes || []).map((p) => ({
    ...p,
    name: p.name || 'Sub',
    role: p.role || 'CM1',
    subPosition: getSafeSubPosition(p.subPosition, p.role),
    playstyle: p.playstyle || 'basic',
    canonicalStats: p.canonicalStats || fallback.players[0].canonicalStats,
  }));

  return {
    ...base,
    name: base.name || fallback.name,
    shortName: base.shortName || fallback.shortName,
    players,
    substitutes,
    roles: getSafeRolesForPlayers(players, base.roles || fallback.roles),
    tacticalPlaystyle: base.tacticalPlaystyle || fallback.tacticalPlaystyle || 'possession',
    preferredFormation: base.preferredFormation || fallback.preferredFormation || '4-3-3',
  };
}

function getSafeRoles(team: TeamDefinition, roles?: TeamTacticalRoles): TeamTacticalRoles {
  return getSafeRolesForPlayers(team.players || [], roles || team.roles);
}

const TacticalGamePlanModalInner: React.FC<TacticalGamePlanModalProps> = ({
  isOpen,
  onClose,
  initialHomeTeam,
  initialAwayTeam,
  initialHomeFormation,
  initialAwayFormation,
  initialHomePlaystyle,
  initialAwayPlaystyle,
  initialHomeTactics,
  initialAwayTactics,
  initialHomeRoles,
  initialAwayRoles,
  onApplyGamePlan,
  isMidMatch = false,
}) => {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<TabType>('game_plan');

  // Mobile Single-Pitch Active Team Toggle
  const [mobileActiveSide, setMobileActiveSide] = useState<'home' | 'away'>('home');

  // Active Team Clones (guaranteed safe default instances)
  const [homeTeam, setHomeTeam] = useState<TeamDefinition>(() =>
    sanitizeTeam(initialHomeTeam, 'spain_2026')
  );

  const [awayTeam, setAwayTeam] = useState<TeamDefinition>(() =>
    sanitizeTeam(initialAwayTeam, 'argentina_2026')
  );

  // Formations & Playstyles
  const [homeFormation, setHomeFormation] = useState<FormationName>(
    initialHomeFormation || initialHomeTeam?.preferredFormation || '4-3-3'
  );
  const [awayFormation, setAwayFormation] = useState<FormationName>(
    initialAwayFormation || initialAwayTeam?.preferredFormation || '4-4-2'
  );

  const [homePlaystyle, setHomePlaystyle] = useState<TacticalPlaystyle>(
    initialHomePlaystyle || initialHomeTeam?.tacticalPlaystyle || 'possession'
  );
  const [awayPlaystyle, setAwayPlaystyle] = useState<TacticalPlaystyle>(
    initialAwayPlaystyle || initialAwayTeam?.tacticalPlaystyle || 'gegenpress'
  );

  const [homeTactics, setHomeTactics] = useState<DetailedTactics>(
    initialHomeTactics || initialHomeTeam?.tactics || getDefaultTactics('possession')
  );
  const [awayTactics, setAwayTactics] = useState<DetailedTactics>(
    initialAwayTactics || initialAwayTeam?.tactics || getDefaultTactics('gegenpress')
  );

  // Authoritative Set-Piece Roles
  const [homeRoles, setHomeRoles] = useState<TeamTacticalRoles>(() =>
    getSafeRoles(sanitizeTeam(initialHomeTeam, 'spain_2026'), initialHomeRoles)
  );
  const [awayRoles, setAwayRoles] = useState<TeamTacticalRoles>(() =>
    getSafeRoles(sanitizeTeam(initialAwayTeam, 'argentina_2026'), initialAwayRoles)
  );

  // Active Selection for Substitutions / Swaps
  const [selectedPlayer, setSelectedPlayer] = useState<{
    id: string;
    isBench: boolean;
    side: 'home' | 'away';
  } | null>(null);

  // Roles Tab Active Sub-Team Selector
  const [rolesActiveSide, setRolesActiveSide] = useState<'home' | 'away'>('home');

  // Sync when initial teams change
  useEffect(() => {
    if (isOpen) {
      const safeHome = sanitizeTeam(initialHomeTeam, 'spain_2026');
      const safeAway = sanitizeTeam(initialAwayTeam, 'argentina_2026');
      setHomeTeam(safeHome);
      setAwayTeam(safeAway);
      setHomeFormation(initialHomeFormation || safeHome.preferredFormation || '4-3-3');
      setAwayFormation(initialAwayFormation || safeAway.preferredFormation || '4-4-2');
      setHomePlaystyle(initialHomePlaystyle || safeHome.tacticalPlaystyle || 'possession');
      setAwayPlaystyle(initialAwayPlaystyle || safeAway.tacticalPlaystyle || 'gegenpress');
      setHomeTactics(initialHomeTactics || safeHome.tactics || getDefaultTactics('possession'));
      setAwayTactics(initialAwayTactics || safeAway.tactics || getDefaultTactics('gegenpress'));
      setHomeRoles(getSafeRoles(safeHome, initialHomeRoles));
      setAwayRoles(getSafeRoles(safeAway, initialAwayRoles));
      setSelectedPlayer(null);
    }
  }, [
    isOpen,
    initialHomeTeam,
    initialAwayTeam,
    initialHomeFormation,
    initialAwayFormation,
    initialHomePlaystyle,
    initialAwayPlaystyle,
    initialHomeTactics,
    initialAwayTactics,
    initialHomeRoles,
    initialAwayRoles,
  ]);

  // Handle Player Selection, Swapping, and Substitutions
  const handleSelectPlayer = (
    player: TeamRosterPlayer,
    isBench: boolean,
    side: 'home' | 'away'
  ) => {
    // If no player selected or clicking different team, select this player
    if (!selectedPlayer || selectedPlayer.side !== side) {
      setSelectedPlayer({ id: player.id, isBench, side });
      return;
    }

    // Clicking same player deselects
    if (selectedPlayer.id === player.id) {
      setSelectedPlayer(null);
      return;
    }

    const currentTeam = side === 'home' ? homeTeam : awayTeam;
    const setTeam = side === 'home' ? setHomeTeam : setAwayTeam;
    const currentRoles = side === 'home' ? homeRoles : awayRoles;
    const setRoles = side === 'home' ? setHomeRoles : setAwayRoles;

    const newPlayers = [...currentTeam.players];
    const newSubs = [...(currentTeam.substitutes || [])];

    // Case 1: Pitch Player <-> Pitch Player (Swap positions / roles)
    if (!selectedPlayer.isBench && !isBench) {
      const idxA = newPlayers.findIndex((p) => p.id === selectedPlayer.id);
      const idxB = newPlayers.findIndex((p) => p.id === player.id);

      if (idxA !== -1 && idxB !== -1) {
        // Swap tactical roles and subpositions
        const tempRole = newPlayers[idxA].role;
        const tempSub = newPlayers[idxA].subPosition;

        newPlayers[idxA] = {
          ...newPlayers[idxA],
          role: newPlayers[idxB].role,
          subPosition: newPlayers[idxB].subPosition,
        };

        newPlayers[idxB] = {
          ...newPlayers[idxB],
          role: tempRole,
          subPosition: tempSub,
        };

        setTeam({ ...currentTeam, players: newPlayers });
      }
      setSelectedPlayer(null);
      return;
    }

    // Case 2: Pitch Player <-> Bench Player (Tactical Substitution)
    const pitchPlayerId = selectedPlayer.isBench ? player.id : selectedPlayer.id;
    const benchPlayerId = selectedPlayer.isBench ? selectedPlayer.id : player.id;

    const pitchIdx = newPlayers.findIndex((p) => p.id === pitchPlayerId);
    const benchIdx = newSubs.findIndex((p) => p.id === benchPlayerId);

    if (pitchIdx !== -1 && benchIdx !== -1) {
      const oldPitchPlayer = newPlayers[pitchIdx];
      const incomingBenchPlayer = newSubs[benchIdx];

      // Assign incoming player to the starting spot and role
      newPlayers[pitchIdx] = {
        ...incomingBenchPlayer,
        role: oldPitchPlayer.role,
        subPosition: incomingBenchPlayer.subPosition || oldPitchPlayer.subPosition,
      };

      // Put departing player onto the bench
      newSubs[benchIdx] = {
        ...oldPitchPlayer,
        role: incomingBenchPlayer.role,
      };

      // Check if departed player held any special set-piece role
      const updatedRoles = { ...currentRoles };
      const autoRoles = autoAssignOptimalRoles(newPlayers);

      if (updatedRoles.captainId === oldPitchPlayer.id) {
        updatedRoles.captainId = autoRoles.captainId;
      }
      if (updatedRoles.freeKickNearId === oldPitchPlayer.id) {
        updatedRoles.freeKickNearId = autoRoles.freeKickNearId;
      }
      if (updatedRoles.freeKickLongId === oldPitchPlayer.id) {
        updatedRoles.freeKickLongId = autoRoles.freeKickLongId;
      }
      if (updatedRoles.penaltyTakerId === oldPitchPlayer.id) {
        updatedRoles.penaltyTakerId = autoRoles.penaltyTakerId;
      }
      if (updatedRoles.leftCornerTakerId === oldPitchPlayer.id) {
        updatedRoles.leftCornerTakerId = autoRoles.leftCornerTakerId;
      }
      if (updatedRoles.rightCornerTakerId === oldPitchPlayer.id) {
        updatedRoles.rightCornerTakerId = autoRoles.rightCornerTakerId;
      }

      setRoles(updatedRoles);
      setTeam({
        ...currentTeam,
        players: newPlayers,
        substitutes: newSubs,
      });
    }

    setSelectedPlayer(null);
  };

  // Auto-Assign Optimal Roles Handler
  const handleAutoAssignRoles = (side: 'home' | 'away') => {
    const targetTeam = side === 'home' ? homeTeam : awayTeam;
    const optimal = autoAssignOptimalRoles(targetTeam.players);
    if (side === 'home') {
      setHomeRoles(optimal);
    } else {
      setAwayRoles(optimal);
    }
  };

  // Handle Player Custom Position Drag on Tactical Board (Phase 16)
  const handlePlayerPositionChange = (
    side: 'home' | 'away',
    playerId: string,
    pos: { x: number; y: number },
    newRole: PlayerRole,
    newSubPos: SubPosition,
    pesLabel: string
  ) => {
    const isHome = side === 'home';
    const setTeam = isHome ? setHomeTeam : setAwayTeam;
    const currentTeam = isHome ? homeTeam : awayTeam;

    const newPlayers = currentTeam.players.map((p) => {
      if (p.id === playerId) {
        const intrinsic = p.intrinsicPlaystyle || p.playstyle;
        const effectivePlaystyle = resolveEffectivePlaystyle(intrinsic, newSubPos);
        return {
          ...p,
          customPos: pos,
          role: newRole,
          subPosition: newSubPos,
          intrinsicPlaystyle: intrinsic,
          playstyle: effectivePlaystyle,
        };
      }
      return p;
    });

    setTeam({
      ...currentTeam,
      players: newPlayers,
    });
  };

  // Phase 0.2: Formation structural validation checks (>=2 DEF, >=2 MID, >=1 ATT, 1 GK)
  const homeValidation = useMemo(() => {
    return validateFormationStructure(
      homeTeam.players.map((p) => ({
        role: p.role,
        subPosition: p.subPosition,
        label: p.subPosition || p.role,
      }))
    );
  }, [homeTeam.players]);

  const awayValidation = useMemo(() => {
    return validateFormationStructure(
      awayTeam.players.map((p) => ({
        role: p.role,
        subPosition: p.subPosition,
        label: p.subPosition || p.role,
      }))
    );
  }, [awayTeam.players]);

  const isFormationValid = homeValidation.isValid && awayValidation.isValid;
  const invalidMessage = !homeValidation.isValid
    ? `HOME: ${homeValidation.message}`
    : !awayValidation.isValid
    ? `AWAY: ${awayValidation.message}`
    : '';

  // Confirm & Apply Changes
  const handleConfirm = () => {
    if (!isFormationValid) return;

    onApplyGamePlan({
      homeTeam,
      awayTeam,
      homeFormation,
      awayFormation,
      homePlaystyle,
      awayPlaystyle,
      homeTactics,
      awayTactics,
      homeRoles,
      awayRoles,
    });
    onClose();
  };

  // Reset to Defaults
  const handleResetDefaults = () => {
    const safeHome = sanitizeTeam(initialHomeTeam, 'spain_2026');
    const safeAway = sanitizeTeam(initialAwayTeam, 'argentina_2026');
    setHomeTeam(safeHome);
    setAwayTeam(safeAway);
    setHomeFormation(safeHome.preferredFormation || '4-3-3');
    setAwayFormation(safeAway.preferredFormation || '4-4-2');
    setHomePlaystyle(safeHome.tacticalPlaystyle || 'possession');
    setAwayPlaystyle(safeAway.tacticalPlaystyle || 'gegenpress');
    setHomeTactics(safeHome.tactics || getDefaultTactics('possession'));
    setAwayTactics(safeAway.tactics || getDefaultTactics('gegenpress'));
    setHomeRoles(getSafeRoles(safeHome, initialHomeRoles));
    setAwayRoles(getSafeRoles(safeAway, initialAwayRoles));
    setSelectedPlayer(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-2.5 bg-slate-950/90 backdrop-blur-md animate-fade-in select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-xl sm:rounded-2xl w-full max-w-7xl h-[calc(100dvh-8px)] max-h-[100dvh] flex flex-col shadow-2xl overflow-hidden">
          {/* ========================================================================= */}
          {/* TOP HEADER: 32-BIT TACTICAL MATRIX BANNER & BUMPERS                       */}
          {/* ========================================================================= */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 px-3 sm:px-4 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="font-['Press_Start_2P'] text-[10px] sm:text-xs text-amber-400 flex items-center gap-1.5 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">
              <span>LB</span>
              <span className="text-white">GAME PLAN</span>
              <span>RB</span>
            </div>
            <span className="text-[9px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700 hidden sm:inline">
              32-BIT TACTICAL MATRIX
            </span>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('game_plan')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg text-[9px] sm:text-[10px] font-['Press_Start_2P'] transition-all flex items-center gap-1.5 ${
                activeTab === 'game_plan'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3 h-3" />
              <span>BOARD</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('roles')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg text-[9px] sm:text-[10px] font-['Press_Start_2P'] transition-all flex items-center gap-1.5 ${
                activeTab === 'roles'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Crosshair className="w-3 h-3" />
              <span>ROLES</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('tactics')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg text-[9px] sm:text-[10px] font-['Press_Start_2P'] transition-all flex items-center gap-1.5 ${
                activeTab === 'tactics'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3 h-3" />
              <span>TACTICS</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-2 py-1 text-[8.5px] sm:text-[9px] font-mono text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              RESET
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!isFormationValid}
              title={!isFormationValid ? invalidMessage : 'Confirm & Apply Game Plan'}
              className={`px-3 py-1.5 text-[9px] sm:text-[10px] font-['Press_Start_2P'] rounded-lg font-bold shadow-md transition-all flex items-center gap-1.5 ${
                isFormationValid
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 active:scale-95 cursor-pointer'
                  : 'bg-rose-950/70 border border-rose-500/80 text-rose-300 opacity-70 cursor-not-allowed'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>CONFIRM</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* FORMATION INTEGRITY ALERT BANNER (Active when illegal lineup is detected) */}
        {/* ========================================================================= */}
        {!isFormationValid && (
          <div className="bg-rose-950/90 border-b-2 border-rose-500/80 px-3 sm:px-4 py-1.5 flex items-center justify-between gap-2 shrink-0 animate-pulse text-rose-200">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="font-['Press_Start_2P'] text-[7px] sm:text-[8px] text-rose-300 truncate">
                {invalidMessage}
              </span>
            </div>
            <span className="text-[8px] font-mono text-rose-200/90 shrink-0 hidden md:inline">
              Adjust player roles to restore minimums: ≥2 DEF, ≥2 MID, ≥1 ATT
            </span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MOBILE SINGLE-PITCH TEAM SWITCHER BAR (ONLY VISIBLE ON < 768px)          */}
        {/* ========================================================================= */}
        {activeTab === 'game_plan' && (
          <div className="md:hidden bg-slate-950 border-b border-slate-800 px-3 py-1.5 flex items-center justify-between shrink-0">
            <div className="text-[9px] font-mono text-slate-400">
              VIEWING: <span className="font-bold text-white uppercase">{mobileActiveSide} TEAM</span>
            </div>
            <button
              type="button"
              onClick={() => setMobileActiveSide((prev) => (prev === 'home' ? 'away' : 'home'))}
              className="px-2.5 py-1 bg-amber-500 text-slate-950 font-['Press_Start_2P'] text-[8px] rounded-lg shadow flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowRightLeft className="w-3 h-3" />
              <span>⇄ SWITCH TO {mobileActiveSide === 'home' ? 'AWAY' : 'HOME'}</span>
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MAIN BODY CONTENT AREA (PITCH BOARD / ROLES / TACTICS) - STRICT ZERO-SCROLL */}
        {/* ========================================================================= */}
        <div className="flex-1 min-h-0 overflow-hidden p-1 sm:p-2.5">
          {/* ----------------------------------------------------------------------- */}
          {/* TAB 1: DUAL-PITCH COMPARATIVE BOARD (STRICT ZERO-SCROLL SINGLE SCREEN)  */}
          {/* ----------------------------------------------------------------------- */}
          {activeTab === 'game_plan' && (
            <div className="w-full h-full grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 overflow-hidden min-h-0">
              {/* HOME TEAM TACTICAL PITCH BOARD */}
              <div className={`${mobileActiveSide === 'away' ? 'hidden md:flex' : 'flex'} flex-col h-full min-h-0 overflow-hidden`}>
                <TacticalPitchBoard
                  team={homeTeam}
                  side="home"
                  selectedPlayerId={selectedPlayer?.side === 'home' ? selectedPlayer.id : null}
                  onSelectPlayer={(p, isBench) => handleSelectPlayer(p, isBench, 'home')}
                  formation={homeFormation}
                  onChangeFormation={setHomeFormation}
                  tacticalPlaystyle={homePlaystyle}
                  captainId={homeRoles.captainId}
                  activeKit={homeTeam.kit}
                  onPlayerPositionChange={(pId, pos, nRole, nSubPos, pesLabel) =>
                    handlePlayerPositionChange('home', pId, pos, nRole, nSubPos, pesLabel)
                  }
                />
              </div>

              {/* AWAY TEAM TACTICAL PITCH BOARD */}
              <div className={`${mobileActiveSide === 'home' ? 'hidden md:flex' : 'flex'} flex-col h-full min-h-0 overflow-hidden`}>
                <TacticalPitchBoard
                  team={awayTeam}
                  side="away"
                  isOpponent={true}
                  selectedPlayerId={selectedPlayer?.side === 'away' ? selectedPlayer.id : null}
                  onSelectPlayer={(p, isBench) => handleSelectPlayer(p, isBench, 'away')}
                  formation={awayFormation}
                  onChangeFormation={setAwayFormation}
                  tacticalPlaystyle={awayPlaystyle}
                  captainId={awayRoles.captainId}
                  activeKit={awayTeam.awayKit || awayTeam.kit}
                  onPlayerPositionChange={(pId, pos, nRole, nSubPos, pesLabel) =>
                    handlePlayerPositionChange('away', pId, pos, nRole, nSubPos, pesLabel)
                  }
                />
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------------- */}
          {/* TAB 2: AUTHORITATIVE "ROLES" SET-PIECE ASSIGNMENT SUITE (SECTION 15.5)  */}
          {/* ----------------------------------------------------------------------- */}
          {activeTab === 'roles' && (
            <div className="w-full h-full flex flex-col bg-slate-950/90 border border-slate-800 rounded-2xl p-4 sm:p-6 overflow-y-auto">
              {/* Team Selector & Auto-Assign Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-4 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">TEAM:</span>
                  <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setRolesActiveSide('home')}
                      className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${
                        rolesActiveSide === 'home'
                          ? 'bg-sky-500 text-slate-950 shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      HOME ({homeTeam.name})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRolesActiveSide('away')}
                      className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${
                        rolesActiveSide === 'away'
                          ? 'bg-rose-500 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      AWAY ({awayTeam.name})
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleAutoAssignRoles(rolesActiveSide)}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-['Press_Start_2P'] text-[9px] rounded-lg shadow-md transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>⚡ AUTO-ASSIGN OPTIMAL ROLES</span>
                </button>
              </div>

              {/* Canonical 6 Set-Piece Roles Cards Grid */}
              {(() => {
                const targetTeam = rolesActiveSide === 'home' ? homeTeam : awayTeam;
                const activeRoles = rolesActiveSide === 'home' ? homeRoles : awayRoles;
                const setRoles = rolesActiveSide === 'home' ? setHomeRoles : setAwayRoles;
                const startingPlayers = targetTeam.players;

                const roleConfigs: {
                  key: keyof TeamTacticalRoles;
                  title: string;
                  badge: string;
                  description: string;
                  formula: string;
                }[] = [
                  {
                    key: 'captainId',
                    title: 'CAPTAIN (C)',
                    badge: '(C)',
                    description: 'Provides +5 CMP stabilization to whole squad during high pressure.',
                    formula: 'CMP 65% + POS 35%',
                  },
                  {
                    key: 'freeKickNearId',
                    title: 'FREE KICK (NEAR < 28m)',
                    badge: 'FK-S',
                    description: 'Direct strikes on goal, curled finesse, and dipped free kicks.',
                    formula: 'SHO 50% + LSH 30% + CMP 20%',
                  },
                  {
                    key: 'freeKickLongId',
                    title: 'FREE KICK (LONG > 28m)',
                    badge: 'FK-L',
                    description: 'Driven through-balls, switches, and box deliveries.',
                    formula: 'LPA 55% + CRO 45%',
                  },
                  {
                    key: 'penaltyTakerId',
                    title: 'PENALTY TAKER',
                    badge: 'PEN',
                    description: 'Primary spot-kick specialist with ice in their veins.',
                    formula: 'SHO 60% + CMP 40%',
                  },
                  {
                    key: 'leftCornerTakerId',
                    title: 'LEFT CORNER TAKER',
                    badge: 'LCK',
                    description: 'Inswinging & outswinging crosses from the left flag.',
                    formula: 'CRO 65% + SPA 35%',
                  },
                  {
                    key: 'rightCornerTakerId',
                    title: 'RIGHT CORNER TAKER',
                    badge: 'RCK',
                    description: 'Inswinging & outswinging crosses from the right flag.',
                    formula: 'CRO 65% + SPA 35%',
                  },
                ];

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 flex-1">
                    {roleConfigs.map((cfg) => {
                      const assignedPlayerId = activeRoles[cfg.key];
                      const assignedPlayer =
                        startingPlayers.find((p) => p.id === assignedPlayerId) || startingPlayers[0];
                      const fitResult = assignedPlayer
                        ? evaluatePlayerRoleFit(assignedPlayer, cfg.key)
                        : { score: 50, highlightText: '' };

                      return (
                        <div
                          key={cfg.key}
                          className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between shadow-lg"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="font-['Press_Start_2P'] text-[10px] text-amber-400">
                                {cfg.title}
                              </span>
                              <span className="text-[9px] font-mono bg-slate-950 px-1.5 py-0.5 rounded text-slate-400 border border-slate-800">
                                {cfg.formula}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-mono mb-3">{cfg.description}</p>

                            {/* Current Assigned Player Card */}
                            <div className="bg-slate-950 border border-amber-500/30 rounded-lg p-2.5 mb-2 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded bg-amber-500/20 text-amber-300 font-bold font-mono text-[10px] flex items-center justify-center border border-amber-500/40">
                                  #{assignedPlayer?.number ?? 10}
                                </span>
                                <div>
                                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                    <span>{assignedPlayer?.name ? assignedPlayer.name.toUpperCase() : 'UNKNOWN'}</span>
                                    <span className="text-[9px] font-mono text-slate-400">
                                      ({assignedPlayer?.subPosition || assignedPlayer?.role || 'FW'})
                                    </span>
                                  </div>
                                  <div className="text-[9px] font-mono text-emerald-400 mt-0.5">
                                    {fitResult?.highlightText || ''}
                                  </div>
                                </div>
                              </div>

                              <span className="font-mono font-bold text-xs text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/40">
                                FIT: {fitResult?.score ?? 50}
                              </span>
                            </div>
                          </div>

                          {/* Candidate Selector Dropdown */}
                          <div>
                            <span className="text-[8px] font-mono text-slate-500 uppercase font-bold mb-1 block">
                              REASSIGN SPECIALIST:
                            </span>
                            <select
                              value={assignedPlayerId}
                              onChange={(e) => {
                                setRoles({
                                  ...activeRoles,
                                  [cfg.key]: e.target.value,
                                });
                              }}
                              className="w-full bg-slate-950 border border-slate-700 hover:border-slate-500 text-slate-200 text-xs rounded-lg px-2 py-1.5 font-mono focus:outline-none"
                            >
                              {startingPlayers.map((p) => {
                                const fit = evaluatePlayerRoleFit(p, cfg.key);
                                return (
                                  <option key={p.id} value={p.id}>
                                    #{p.number} {p?.name ? p.name.toUpperCase() : 'PLAYER'} ({p.subPosition || p.role}) — Fit: {fit.score} ({fit.highlightText})
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ----------------------------------------------------------------------- */}
          {/* TAB 3: TACTICS & FORMATION QUICK-SHIFTER                                */}
          {/* ----------------------------------------------------------------------- */}
          {activeTab === 'tactics' && (
            <div className="w-full h-full grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto">
              {/* HOME TEAM TACTICAL SUITE */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                    <span className="font-['Press_Start_2P'] text-[11px] text-sky-400">
                      HOME TACTICAL SUITE
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">{homeTeam.name}</span>
                  </div>

                  {/* Formation Selector */}
                  <div className="mb-4">
                    <label className="text-[10px] font-mono text-slate-400 font-bold uppercase mb-1.5 block">
                      FORMATION SYSTEM:
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {FORMATION_LIST.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setHomeFormation(f.id)}
                          className={`p-2 rounded-lg text-left border transition-all ${
                            homeFormation === f.id
                              ? 'bg-sky-500/20 border-sky-400 text-white font-bold'
                              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          <div className="font-['Press_Start_2P'] text-[9px] text-amber-300">{f.id}</div>
                          <div className="text-[9px] font-mono text-slate-400">{f.tag}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Playstyle Selector */}
                  <div className="mb-4">
                    <label className="text-[10px] font-mono text-slate-400 font-bold uppercase mb-1.5 block">
                      TACTICAL PHILOSOPHY:
                    </label>
                    <select
                      value={homePlaystyle}
                      onChange={(e) => {
                        const nextStyle = e.target.value as TacticalPlaystyle;
                        setHomePlaystyle(nextStyle);
                        setHomeTactics(getDefaultTactics(nextStyle));
                      }}
                      className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl p-2.5 font-mono focus:outline-none"
                    >
                      {CANONICAL_PLAYSTYLES.map((ps) => {
                        const def = PLAYSTYLE_DEFINITIONS[ps];
                        return (
                          <option key={ps} value={ps}>
                            {def ? `${def.name} (${def.subtitle})` : ps}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-[10px] font-mono text-slate-400">
                  <div className="text-amber-400 font-bold mb-1">PHILOSOPHY PROFILE:</div>
                  <p>{PLAYSTYLE_DEFINITIONS[homePlaystyle]?.description || 'Tactical system'}</p>
                </div>
              </div>

              {/* AWAY TEAM TACTICAL SUITE */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                    <span className="font-['Press_Start_2P'] text-[11px] text-rose-400">
                      AWAY TACTICAL SUITE
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">{awayTeam.name}</span>
                  </div>

                  {/* Formation Selector */}
                  <div className="mb-4">
                    <label className="text-[10px] font-mono text-slate-400 font-bold uppercase mb-1.5 block">
                      FORMATION SYSTEM:
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {FORMATION_LIST.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setAwayFormation(f.id)}
                          className={`p-2 rounded-lg text-left border transition-all ${
                            awayFormation === f.id
                              ? 'bg-rose-500/20 border-rose-400 text-white font-bold'
                              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          <div className="font-['Press_Start_2P'] text-[9px] text-amber-300">{f.id}</div>
                          <div className="text-[9px] font-mono text-slate-400">{f.tag}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Playstyle Selector */}
                  <div className="mb-4">
                    <label className="text-[10px] font-mono text-slate-400 font-bold uppercase mb-1.5 block">
                      TACTICAL PHILOSOPHY:
                    </label>
                    <select
                      value={awayPlaystyle}
                      onChange={(e) => {
                        const nextStyle = e.target.value as TacticalPlaystyle;
                        setAwayPlaystyle(nextStyle);
                        setAwayTactics(getDefaultTactics(nextStyle));
                      }}
                      className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl p-2.5 font-mono focus:outline-none"
                    >
                      {CANONICAL_PLAYSTYLES.map((ps) => {
                        const def = PLAYSTYLE_DEFINITIONS[ps];
                        return (
                          <option key={ps} value={ps}>
                            {def ? `${def.name} (${def.subtitle})` : ps}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-[10px] font-mono text-slate-400">
                  <div className="text-amber-400 font-bold mb-1">PHILOSOPHY PROFILE:</div>
                  <p>{PLAYSTYLE_DEFINITIONS[awayPlaystyle]?.description || 'Tactical system'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const TacticalGamePlanModal: React.FC<TacticalGamePlanModalProps> = (props) => {
  const [resetKey, setResetKey] = useState(0);
  if (!props.isOpen) return null;
  return (
    <GamePlanErrorBoundary
      key={resetKey}
      onReset={() => {
        setResetKey((prev) => prev + 1);
      }}
      onClose={props.onClose}
    >
      <TacticalGamePlanModalInner {...props} key={resetKey} />
    </GamePlanErrorBoundary>
  );
};

