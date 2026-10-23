/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  PlayerSlotConfig,
  ControllerSide,
  InputDeviceType,
  KeyboardPreset,
  ControlScope,
  CursorSwitchMode,
  DEFAULT_PLAYER_SLOTS,
  DEFAULT_KEY_BINDINGS_1P,
  DEFAULT_KEY_BINDINGS_WASD,
  DEFAULT_KEY_BINDINGS_2P,
  DEFAULT_KEY_BINDINGS_3P,
  DEFAULT_KEY_BINDINGS_4P,
  CustomKeyBindings,
} from '../types';
import {
  Gamepad2,
  Keyboard,
  Smartphone,
  Eye,
  Plus,
  Trash2,
  Check,
  ChevronLeft,
  ChevronRight,
  Shield,
  Tv,
  HelpCircle,
  X,
  User,
  Users,
  Lock,
  Zap,
  Info,
} from 'lucide-react';

export interface SideSelectPlayerBrief {
  id: string;
  name: string;
  number: number;
  role: string;
  subPosition?: string;
}

interface SideSelectModalProps {
  isOpen: boolean;
  onConfirm: (
    players: PlayerSlotConfig[],
    controlScope: ControlScope,
    lockedPlayerId?: string,
    cursorSwitchMode?: CursorSwitchMode
  ) => void;
  onClose?: () => void;
  initialPlayers?: PlayerSlotConfig[];
  isMidMatch?: boolean;
  homeTeamName?: string;
  awayTeamName?: string;
  homeTeamBadge?: string;
  awayTeamBadge?: string;
  homePlayers?: SideSelectPlayerBrief[];
  awayPlayers?: SideSelectPlayerBrief[];
  initialControlScope?: ControlScope;
  initialLockedPlayerId?: string;
  initialCursorSwitchMode?: CursorSwitchMode;
}

const PLAYER_METADATA: {
  name: string;
  color: string;
  borderClass: string;
  bgClass: string;
  textClass: string;
  defaultBindingsArrows: CustomKeyBindings;
  defaultBindingsWasd: CustomKeyBindings;
}[] = [
  {
    name: '1P',
    color: '#38bdf8', // Blue
    borderClass: 'border-sky-400',
    bgClass: 'bg-sky-500/20',
    textClass: 'text-sky-400',
    defaultBindingsArrows: DEFAULT_KEY_BINDINGS_1P,
    defaultBindingsWasd: DEFAULT_KEY_BINDINGS_WASD,
  },
  {
    name: '2P',
    color: '#f59e0b', // Amber / Orange
    borderClass: 'border-amber-400',
    bgClass: 'bg-amber-500/20',
    textClass: 'text-amber-400',
    defaultBindingsArrows: DEFAULT_KEY_BINDINGS_2P,
    defaultBindingsWasd: DEFAULT_KEY_BINDINGS_2P,
  },
  {
    name: '3P',
    color: '#10b981', // Emerald / Green
    borderClass: 'border-emerald-400',
    bgClass: 'bg-emerald-500/20',
    textClass: 'text-emerald-400',
    defaultBindingsArrows: DEFAULT_KEY_BINDINGS_3P,
    defaultBindingsWasd: DEFAULT_KEY_BINDINGS_3P,
  },
  {
    name: '4P',
    color: '#c084fc', // Purple / Pink
    borderClass: 'border-purple-400',
    bgClass: 'bg-purple-500/20',
    textClass: 'text-purple-400',
    defaultBindingsArrows: DEFAULT_KEY_BINDINGS_4P,
    defaultBindingsWasd: DEFAULT_KEY_BINDINGS_4P,
  },
];

export const SideSelectModal: React.FC<SideSelectModalProps> = ({
  isOpen,
  onConfirm,
  onClose,
  initialPlayers = DEFAULT_PLAYER_SLOTS,
  isMidMatch = false,
  homeTeamName = 'HOME TEAM',
  awayTeamName = 'AWAY TEAM',
  homeTeamBadge,
  awayTeamBadge,
  homePlayers = [],
  awayPlayers = [],
  initialControlScope = 'all_team',
  initialLockedPlayerId,
  initialCursorSwitchMode = 'manual',
}) => {
  const [players, setPlayers] = useState<PlayerSlotConfig[]>(() => {
    return initialPlayers && initialPlayers.length > 0 ? initialPlayers : DEFAULT_PLAYER_SLOTS;
  });

  // Phase 4.5.2: Control Scope (Team vs. Single Player Lock)
  const [controlScope, setControlScope] = useState<ControlScope>(initialControlScope);
  const [lockedPlayerId, setLockedPlayerId] = useState<string>(() => {
    if (initialLockedPlayerId) return initialLockedPlayerId;
    const defaultHomeAttacker = homePlayers.find((p) => p.role === 'ST1' || p.role === 'ST2' || p.role === 'CM1') || homePlayers[0];
    return defaultHomeAttacker?.id || 'home_ST1';
  });

  // Phase 4.5.3: Cursor Change Logic (Manual vs. Automatic)
  const [cursorSwitchMode, setCursorSwitchMode] = useState<CursorSwitchMode>(initialCursorSwitchMode);

  const [connectedGamepadCount, setConnectedGamepadCount] = useState<number>(0);
  const [showKeyGuideFor, setShowKeyGuideFor] = useState<number | null>(null);

  // Sync on open
  useEffect(() => {
    if (isOpen) {
      if (initialPlayers && initialPlayers.length > 0) {
        setPlayers(initialPlayers.map((p) => ({ ...p })));
      }
      setControlScope(initialControlScope || 'all_team');
      if (initialLockedPlayerId) {
        setLockedPlayerId(initialLockedPlayerId);
      }
      setCursorSwitchMode(initialCursorSwitchMode || 'manual');
    }
  }, [isOpen, initialPlayers, initialControlScope, initialLockedPlayerId, initialCursorSwitchMode]);

  // Poll for connected physical gamepads
  useEffect(() => {
    if (!isOpen) return;

    const checkPads = () => {
      try {
        const pads = navigator.getGamepads ? navigator.getGamepads() : [];
        let count = 0;
        for (const p of pads) {
          if (p && p.connected) count++;
        }
        setConnectedGamepadCount(count);
      } catch {}
    };

    checkPads();
    const interval = setInterval(checkPads, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Move player between sides: Home <-> Spectator <-> Away
  const handleMoveSide = (playerId: number, targetSide: ControllerSide) => {
    setPlayers((prev) =>
      prev.map((p) => (p.id === playerId ? { ...p, side: targetSide } : p))
    );
  };

  const handleCycleSide = (playerId: number, direction: 'left' | 'right') => {
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id !== playerId) return p;
        const sequence: ControllerSide[] = ['home', 'spectator', 'away'];
        const currentIdx = sequence.indexOf(p.side);
        let nextIdx = direction === 'left' ? currentIdx - 1 : currentIdx + 1;
        if (nextIdx < 0) nextIdx = 0;
        if (nextIdx > 2) nextIdx = 2;
        return { ...p, side: sequence[nextIdx] };
      })
    );
  };

  // Change device (keyboard arrows, keyboard wasd, gamepad, touch)
  const handleChangeDevice = (
    playerId: number,
    device: InputDeviceType,
    keyboardPreset: KeyboardPreset = 'arrows'
  ) => {
    setPlayers((prev) => {
      if (device === 'touch') {
        const otherHasTouch = prev.some((p) => p.id !== playerId && p.device === 'touch');
        if (otherHasTouch) return prev; // Deny: Only 1 player can have touch
      }

      return prev.map((p) => {
        if (p.id !== playerId) return p;
        let padIndex = p.gamepadIndex ?? 0;
        if (device === 'gamepad') {
          const usedPadIndices = prev
            .filter((o) => o.id !== playerId && o.device === 'gamepad')
            .map((o) => o.gamepadIndex ?? 0);
          for (let i = 0; i < 4; i++) {
            if (!usedPadIndices.includes(i)) {
              padIndex = i;
              break;
            }
          }
        }

        const meta = PLAYER_METADATA[p.id - 1] || PLAYER_METADATA[0];
        const keyBindings =
          device === 'keyboard'
            ? keyboardPreset === 'wasd'
              ? meta.defaultBindingsWasd
              : meta.defaultBindingsArrows
            : p.keyBindings;

        return {
          ...p,
          device,
          keyboardPreset,
          gamepadIndex: padIndex,
          keyBindings,
        };
      });
    });
  };

  // Add new player (2P, 3P, up to 4P)
  const handleAddPlayer = () => {
    if (players.length >= 4) return;
    const nextId = players.length + 1;
    const meta = PLAYER_METADATA[nextId - 1] || PLAYER_METADATA[0];

    let device: InputDeviceType = 'keyboard';
    const usedGamepads = players.filter((p) => p.device === 'gamepad').length;
    if (connectedGamepadCount > usedGamepads) {
      device = 'gamepad';
    }

    let side: ControllerSide = 'away';
    if (players.length === 1 && players[0].side === 'home') {
      side = 'away';
    } else if (players.length === 2) {
      side = 'home';
    }

    const newSlot: PlayerSlotConfig = {
      id: nextId,
      name: meta.name,
      side,
      device,
      keyboardPreset: 'arrows',
      gamepadIndex: usedGamepads,
      color: meta.color,
      keyBindings: meta.defaultBindingsArrows,
      controlScope,
      cursorSwitchMode,
    };

    setPlayers((prev) => [...prev, newSlot]);
  };

  // Remove player
  const handleRemovePlayer = (playerId: number) => {
    if (players.length <= 1) return;
    setPlayers((prev) => {
      const filtered = prev.filter((p) => p.id !== playerId);
      return filtered.map((p, idx) => ({
        ...p,
        id: idx + 1,
        name: `${idx + 1}P`,
        color: PLAYER_METADATA[idx].color,
        keyBindings: p.keyBindings || PLAYER_METADATA[idx].defaultBindingsArrows,
      }));
    });
  };

  // Match Mode description computation
  const homeCount = players.filter((p) => p.side === 'home').length;
  const awayCount = players.filter((p) => p.side === 'away').length;
  const spectatorCount = players.filter((p) => p.side === 'spectator').length;

  const matchModeTitle = useMemo(() => {
    if (homeCount === 0 && awayCount === 0) {
      return '📺 SPECTATOR SIMULATION: CPU VS CPU (AUTONOMOUS MATCH)';
    }
    if (homeCount > 0 && awayCount > 0) {
      return `⚔️ LOCAL MULTIPLAYER: HOME (${homeCount}P) VS AWAY (${awayCount}P)`;
    }
    if (homeCount > 0 && awayCount === 0) {
      return `🕹️ SINGLE / CO-OP: HOME (${homeCount}P) VS CPU (AWAY)`;
    }
    return `🕹️ SINGLE / CO-OP: CPU (HOME) VS AWAY (${awayCount}P)`;
  }, [homeCount, awayCount]);

  const touchPlayerCount = players.filter((p) => p.device === 'touch').length;

  // Primary active player slot side (for locked player lineup selection)
  const activeHumanSide: 'home' | 'away' = useMemo(() => {
    const p1 = players.find((p) => p.id === 1);
    if (p1 && p1.side === 'away') return 'away';
    return 'home';
  }, [players]);

  const activeRoster: SideSelectPlayerBrief[] = activeHumanSide === 'home' ? homePlayers : awayPlayers;

  const handleConfirmAll = () => {
    // Authoritatively bind controlScope and cursorSwitchMode to all slots
    const updatedSlots = players.map((p) => ({
      ...p,
      controlScope,
      lockedPlayerId: controlScope === 'single_player' ? lockedPlayerId : undefined,
      cursorSwitchMode: controlScope === 'all_team' ? cursorSwitchMode : undefined,
    }));
    onConfirm(updatedSlots, controlScope, lockedPlayerId, cursorSwitchMode);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/95 backdrop-blur-xl animate-fade-in select-none">
      <div className="relative w-full max-w-5xl h-[94vh] max-h-[94vh] flex flex-col bg-slate-900 border-2 border-sky-500/70 rounded-2xl shadow-[0_0_50px_rgba(56,189,248,0.25)] overflow-hidden text-white font-mono">
        {/* ========================================================================= */}
        {/* TOP HEADER                                                                */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-sky-500/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <Gamepad2 className="w-5 h-5 text-sky-400" />
            <div>
              <h2 className="font-['Press_Start_2P'] text-xs sm:text-sm text-sky-300 drop-shadow-[0_0_8px_rgba(56,189,248,0.6)]">
                SELECT SIDE & CONTROLLER PROFILE
              </h2>
              <p className="text-[10px] text-slate-400 mt-0.5">
                AUTHORITATIVE CONTROLLER BINDINGS · TEAM/PLAYER SCOPE · CURSOR SWITCHING
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-700 hidden sm:inline">
              🎮 {connectedGamepadCount} JOYSTICK{connectedGamepadCount !== 1 ? 'S' : ''} DETECTED
            </span>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MATCH MODE BANNER                                                         */}
        {/* ========================================================================= */}
        <div className="bg-sky-950/70 border-b border-sky-500/30 px-4 py-1.5 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 text-xs text-sky-200">
            <span className="font-['Press_Start_2P'] text-[9px] text-amber-400">MODE:</span>
            <span className="font-bold tracking-wide truncate max-w-md">{matchModeTitle}</span>
          </div>
          <div className="text-[10px] text-slate-400 shrink-0 hidden md:block">
            {players.length} / 4 CONTROLLER{players.length !== 1 ? 'S' : ''} ALLOCATED
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PHASE 4.5.2 & 4.5.3: CONTROL SCOPE & CURSOR SWITCHING STRIP              */}
        {/* ========================================================================= */}
        <div className="bg-slate-950 border-b border-slate-800 px-3 sm:px-4 py-2 shrink-0 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* 1. Control Scope: Team vs. Single Player Lock */}
          <div className="flex items-center gap-2">
            <span className="font-['Press_Start_2P'] text-[8.5px] text-amber-400 uppercase">
              SCOPE:
            </span>
            <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setControlScope('all_team')}
                className={`px-3 py-1 rounded text-[9.5px] font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                  controlScope === 'all_team'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Controls ball carrier and switches between outfield players"
              >
                <Users className="w-3.5 h-3.5" />
                <span>ALL TEAM</span>
              </button>
              <button
                type="button"
                onClick={() => setControlScope('single_player')}
                className={`px-3 py-1 rounded text-[9.5px] font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                  controlScope === 'single_player'
                    ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Locks user control onto a single designated player for the entire match"
              >
                <User className="w-3.5 h-3.5" />
                <span>SINGLE PLAYER</span>
              </button>
            </div>
          </div>

          {/* 2. Cursor Change Mode (Only visible when All Team is active) */}
          {controlScope === 'all_team' && (
            <div className="flex items-center gap-2">
              <span className="font-['Press_Start_2P'] text-[8.5px] text-emerald-400 uppercase">
                CURSOR CHANGE:
              </span>
              <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setCursorSwitchMode('manual')}
                  className={`px-3 py-1 rounded text-[9.5px] font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                    cursorSwitchMode === 'manual'
                      ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Manual Mode: Auto on-ball, switches only with Switch button on defense (3m proximity protected)"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>MANUAL (TACTICAL)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCursorSwitchMode('automatic')}
                  className={`px-3 py-1 rounded text-[9.5px] font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                    cursorSwitchMode === 'automatic'
                      ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Automatic Mode: Automatically switches to closest defender on defense (3m proximity protected)"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>AUTOMATIC</span>
                </button>
              </div>
            </div>
          )}

          {/* 3. When Single Player is selected: Locked Player Selector */}
          {controlScope === 'single_player' && (
            <div className="flex items-center gap-2">
              <span className="font-['Press_Start_2P'] text-[8.5px] text-cyan-400 flex items-center gap-1 uppercase">
                <Lock className="w-3 h-3 text-cyan-400" />
                <span>LOCKED ATHLETE:</span>
              </span>
              <select
                value={lockedPlayerId}
                onChange={(e) => setLockedPlayerId(e.target.value)}
                className="bg-slate-900 border border-cyan-500/60 rounded px-2 py-1 text-[10px] text-cyan-300 font-bold focus:outline-none focus:ring-1 focus:ring-cyan-400 cursor-pointer max-w-[200px]"
              >
                {activeRoster.length > 0 ? (
                  activeRoster.map((p) => (
                    <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                      #{p.number} {p.name.toUpperCase()} ({p.subPosition || p.role})
                    </option>
                  ))
                ) : (
                  <>
                    <option value="home_ST1">#10 ATTACKER (ST)</option>
                    <option value="home_CM1">#8 MIDFIELDER (CM)</option>
                    <option value="home_CB1">#4 DEFENDER (CB)</option>
                    <option value="home_GK">#1 GOALKEEPER (GK)</option>
                  </>
                )}
              </select>
            </div>
          )}

          {/* 4. Proximity Protection & Double-Tap Badge */}
          {controlScope === 'all_team' && (
            <div className="text-[9px] font-mono text-slate-400 hidden lg:flex items-center gap-1 bg-slate-900/60 px-2 py-0.5 rounded border border-slate-800">
              <Info className="w-3 h-3 text-emerald-400" />
              <span>3m Proximity Guard Active · Double-Tap Switch overrides</span>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* MAIN 3-COLUMN SELECTION PITCH CORRIDOR (HOME | SPECTATOR | AWAY)          */}
        {/* ========================================================================= */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-2.5 p-2 sm:p-3 bg-slate-950/80 overflow-y-auto">
          {/* ----------------------------------------------------------------------- */}
          {/* COLUMN 1: HOME TEAM (LEFT)                                              */}
          {/* ----------------------------------------------------------------------- */}
          <div
            onClick={() => {
              if (players[0]) handleMoveSide(players[0].id, 'home');
            }}
            className={`flex flex-col rounded-xl border-2 transition-all p-2.5 bg-gradient-to-b from-sky-950/40 to-slate-900/60 min-h-[220px] ${
              homeCount > 0 ? 'border-sky-500 shadow-[0_0_15px_rgba(56,189,248,0.2)]' : 'border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between border-b border-sky-500/30 pb-1.5 mb-2 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">{homeTeamBadge || '🔵'}</span>
                <div>
                  <div className="font-['Press_Start_2P'] text-[10px] text-sky-400">HOME</div>
                  <div className="text-xs font-bold text-white truncate max-w-[140px]">{homeTeamName}</div>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded border border-sky-500/40">
                {homeCount} PLAYER{homeCount !== 1 ? 'S' : ''}
              </span>
            </div>

            {/* Players on Home */}
            <div className="flex-1 space-y-2 overflow-y-auto min-h-[120px]">
              {players.filter((p) => p.side === 'home').length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-800 rounded-lg text-slate-500">
                  <Shield className="w-8 h-8 text-slate-700 mb-1" />
                  <span className="text-xs font-bold uppercase">CPU AUTONOMOUS AI</span>
                  <span className="text-[10px] text-slate-600 mt-0.5">Move a controller here to play as Home</span>
                </div>
              ) : (
                players
                  .filter((p) => p.side === 'home')
                  .map((p) => (
                    <ControllerCard
                      key={p.id}
                      player={p}
                      onCycleSide={handleCycleSide}
                      onMoveSide={handleMoveSide}
                      onChangeDevice={handleChangeDevice}
                      onRemovePlayer={handleRemovePlayer}
                      canRemove={players.length > 1}
                      touchDisabled={touchPlayerCount >= 1 && p.device !== 'touch'}
                      onShowKeyGuide={() => setShowKeyGuideFor(showKeyGuideFor === p.id ? null : p.id)}
                      isKeyGuideOpen={showKeyGuideFor === p.id}
                    />
                  ))
              )}
            </div>
          </div>

          {/* ----------------------------------------------------------------------- */}
          {/* COLUMN 2: SPECTATOR / CPU VS CPU (MIDDLE)                               */}
          {/* ----------------------------------------------------------------------- */}
          <div
            onClick={() => {
              if (players[0]) handleMoveSide(players[0].id, 'spectator');
            }}
            className={`flex flex-col rounded-xl border-2 transition-all p-2.5 bg-gradient-to-b from-slate-900/80 to-slate-950 min-h-[220px] ${
              spectatorCount > 0 ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between border-b border-amber-500/30 pb-1.5 mb-2 shrink-0">
              <div className="flex items-center gap-2">
                <Tv className="w-5 h-5 text-amber-400" />
                <div>
                  <div className="font-['Press_Start_2P'] text-[10px] text-amber-400">SPECTATOR</div>
                  <div className="text-xs font-bold text-white">CPU VS CPU BROADCAST</div>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/40">
                {spectatorCount} IDLE
              </span>
            </div>

            {/* Players in Spectator */}
            <div className="flex-1 space-y-2 overflow-y-auto min-h-[120px]">
              {players.filter((p) => p.side === 'spectator').length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-800 rounded-lg text-slate-500">
                  <Eye className="w-8 h-8 text-slate-700 mb-1" />
                  <span className="text-xs font-bold uppercase">NO CONTROLLERS SITTING OUT</span>
                  <span className="text-[10px] text-slate-600 mt-0.5">Move here to watch CPU play autonomously</span>
                </div>
              ) : (
                players
                  .filter((p) => p.side === 'spectator')
                  .map((p) => (
                    <ControllerCard
                      key={p.id}
                      player={p}
                      onCycleSide={handleCycleSide}
                      onMoveSide={handleMoveSide}
                      onChangeDevice={handleChangeDevice}
                      onRemovePlayer={handleRemovePlayer}
                      canRemove={players.length > 1}
                      touchDisabled={touchPlayerCount >= 1 && p.device !== 'touch'}
                      onShowKeyGuide={() => setShowKeyGuideFor(showKeyGuideFor === p.id ? null : p.id)}
                      isKeyGuideOpen={showKeyGuideFor === p.id}
                    />
                  ))
              )}
            </div>
          </div>

          {/* ----------------------------------------------------------------------- */}
          {/* COLUMN 3: AWAY TEAM (RIGHT)                                             */}
          {/* ----------------------------------------------------------------------- */}
          <div
            onClick={() => {
              if (players[0]) handleMoveSide(players[0].id, 'away');
            }}
            className={`flex flex-col rounded-xl border-2 transition-all p-2.5 bg-gradient-to-b from-rose-950/40 to-slate-900/60 min-h-[220px] ${
              awayCount > 0 ? 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.2)]' : 'border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between border-b border-rose-500/30 pb-1.5 mb-2 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">{awayTeamBadge || '🔴'}</span>
                <div>
                  <div className="font-['Press_Start_2P'] text-[10px] text-rose-400">AWAY</div>
                  <div className="text-xs font-bold text-white truncate max-w-[140px]">{awayTeamName}</div>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded border border-rose-500/40">
                {awayCount} PLAYER{awayCount !== 1 ? 'S' : ''}
              </span>
            </div>

            {/* Players on Away */}
            <div className="flex-1 space-y-2 overflow-y-auto min-h-[120px]">
              {players.filter((p) => p.side === 'away').length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-800 rounded-lg text-slate-500">
                  <Shield className="w-8 h-8 text-slate-700 mb-1" />
                  <span className="text-xs font-bold uppercase">CPU AUTONOMOUS AI</span>
                  <span className="text-[10px] text-slate-600 mt-0.5">Move a controller here to play as Away</span>
                </div>
              ) : (
                players
                  .filter((p) => p.side === 'away')
                  .map((p) => (
                    <ControllerCard
                      key={p.id}
                      player={p}
                      onCycleSide={handleCycleSide}
                      onMoveSide={handleMoveSide}
                      onChangeDevice={handleChangeDevice}
                      onRemovePlayer={handleRemovePlayer}
                      canRemove={players.length > 1}
                      touchDisabled={touchPlayerCount >= 1 && p.device !== 'touch'}
                      onShowKeyGuide={() => setShowKeyGuideFor(showKeyGuideFor === p.id ? null : p.id)}
                      isKeyGuideOpen={showKeyGuideFor === p.id}
                    />
                  ))
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BOTTOM ACTION TOOLBAR                                                     */}
        {/* ========================================================================= */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-950 border-t border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddPlayer}
              disabled={players.length >= 4}
              className={`px-3 py-2 text-[9px] sm:text-[10px] font-['Press_Start_2P'] rounded-xl border flex items-center gap-2 transition-all ${
                players.length < 4
                  ? 'bg-slate-800 hover:bg-slate-700 text-amber-400 border-amber-500/40 hover:border-amber-400 cursor-pointer active:scale-95'
                  : 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed opacity-60'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ADD PLAYER ({players.length}/4)</span>
            </button>
            <span className="text-[10px] text-slate-500 hidden sm:inline">
              Instant binding: Keyboard WASD, Arrows, Joypads & Touchpad
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {isMidMatch && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-mono text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                CANCEL
              </button>
            )}
            <button
              type="button"
              onClick={handleConfirmAll}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-['Press_Start_2P'] text-xs rounded-xl font-bold shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all flex items-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>CONFIRM SIDES</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// CONTROLLER CARD SUBCOMPONENT
// =============================================================================
interface ControllerCardProps {
  player: PlayerSlotConfig;
  onCycleSide: (playerId: number, direction: 'left' | 'right') => void;
  onMoveSide: (playerId: number, target: ControllerSide) => void;
  onChangeDevice: (playerId: number, device: InputDeviceType, keyboardPreset?: KeyboardPreset) => void;
  onRemovePlayer: (playerId: number) => void;
  canRemove: boolean;
  touchDisabled: boolean;
  onShowKeyGuide: () => void;
  isKeyGuideOpen: boolean;
}

const ControllerCard: React.FC<ControllerCardProps> = ({
  player,
  onCycleSide,
  onMoveSide,
  onChangeDevice,
  onRemovePlayer,
  canRemove,
  touchDisabled,
  onShowKeyGuide,
  isKeyGuideOpen,
}) => {
  const meta = PLAYER_METADATA[player.id - 1] || PLAYER_METADATA[0];
  const keyboardPreset = player.keyboardPreset || 'arrows';

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`relative p-2.5 rounded-xl border-2 transition-all shadow-md bg-slate-900/95 ${meta.borderClass}`}
    >
      {/* Top Header of Card */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center font-['Press_Start_2P'] text-[10px] font-bold shadow"
            style={{ backgroundColor: player.color, color: '#07131e' }}
          >
            {player.name}
          </div>
          <div className="leading-tight">
            <span className="font-bold text-xs text-white uppercase">{player.name} CONTROLLER</span>
            <div className="text-[9px] text-slate-400 capitalize">
              {player.side === 'spectator' ? 'Sitting Out (Spectator)' : `${player.side} Team`}
            </div>
          </div>
        </div>

        {canRemove && (
          <button
            type="button"
            onClick={() => onRemovePlayer(player.id)}
            className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/60 rounded transition-colors cursor-pointer"
            title="Remove Player"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Side Placement Buttons (Left | Middle | Right) */}
      <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 mb-2">
        <button
          type="button"
          onClick={() => onMoveSide(player.id, 'home')}
          className={`py-1 rounded text-[9px] font-mono font-bold transition-all flex items-center justify-center gap-1 ${
            player.side === 'home'
              ? 'bg-sky-500 text-slate-950 shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ChevronLeft className="w-3 h-3" />
          <span>HOME</span>
        </button>

        <button
          type="button"
          onClick={() => onMoveSide(player.id, 'spectator')}
          className={`py-1 rounded text-[9px] font-mono font-bold transition-all flex items-center justify-center gap-1 ${
            player.side === 'spectator'
              ? 'bg-amber-500 text-slate-950 shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Eye className="w-3 h-3" />
          <span>SPEC</span>
        </button>

        <button
          type="button"
          onClick={() => onMoveSide(player.id, 'away')}
          className={`py-1 rounded text-[9px] font-mono font-bold transition-all flex items-center justify-center gap-1 ${
            player.side === 'away'
              ? 'bg-rose-500 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>AWAY</span>
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Input Device Selector: Arrows, WASD, Joystick, Touch */}
      <div className="grid grid-cols-4 gap-1 text-[8.5px] font-mono bg-slate-950/70 p-1 rounded-lg border border-slate-800 mb-2">
        <button
          type="button"
          onClick={() => onChangeDevice(player.id, 'keyboard', 'arrows')}
          className={`py-1 px-0.5 rounded flex items-center justify-center gap-1 transition-all ${
            player.device === 'keyboard' && keyboardPreset === 'arrows'
              ? 'bg-sky-500 text-slate-950 font-bold shadow'
              : 'text-slate-400 hover:text-white'
          }`}
          title="Move: Arrow keys (↑↓←→) · Actions: S, A, W, D"
        >
          <Keyboard className="w-3 h-3 shrink-0" />
          <span>ARROWS</span>
        </button>

        <button
          type="button"
          onClick={() => onChangeDevice(player.id, 'keyboard', 'wasd')}
          className={`py-1 px-0.5 rounded flex items-center justify-center gap-1 transition-all ${
            player.device === 'keyboard' && keyboardPreset === 'wasd'
              ? 'bg-amber-500 text-slate-950 font-bold shadow'
              : 'text-slate-400 hover:text-white'
          }`}
          title="Move: W, A, S, D · Actions: J (Pass), K (Shoot), I (Through), L (Cross)"
        >
          <Keyboard className="w-3 h-3 shrink-0" />
          <span>WASD</span>
        </button>

        <button
          type="button"
          onClick={() => onChangeDevice(player.id, 'gamepad')}
          className={`py-1 px-0.5 rounded flex items-center justify-center gap-1 transition-all ${
            player.device === 'gamepad'
              ? 'bg-emerald-500 text-slate-950 font-bold shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Gamepad2 className="w-3 h-3 shrink-0" />
          <span>JOY #{(player.gamepadIndex ?? 0) + 1}</span>
        </button>

        <button
          type="button"
          onClick={() => onChangeDevice(player.id, 'touch')}
          disabled={touchDisabled}
          title={touchDisabled ? 'Touchscreen restricted to 1 player maximum' : 'Touchscreen virtual buttons'}
          className={`py-1 px-0.5 rounded flex items-center justify-center gap-1 transition-all ${
            player.device === 'touch'
              ? 'bg-purple-500 text-white font-bold shadow'
              : touchDisabled
              ? 'opacity-40 text-slate-600 cursor-not-allowed'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Smartphone className="w-3 h-3 shrink-0" />
          <span>TOUCH</span>
        </button>
      </div>

      {/* Control Help / Key Assignment Quick Preview */}
      {player.device === 'keyboard' && (
        <div className="text-[9px] font-mono text-slate-400 bg-slate-950/60 p-1.5 rounded border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-amber-400 font-bold">
              MAPPING ({keyboardPreset === 'wasd' ? 'WASD + JKIL' : 'ARROWS + SAWD'}):
            </span>
            <button
              type="button"
              onClick={onShowKeyGuide}
              className="text-[8px] text-sky-400 hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <HelpCircle className="w-2.5 h-2.5" />
              <span>{isKeyGuideOpen ? 'HIDE' : 'DETAILS'}</span>
            </button>
          </div>
          {isKeyGuideOpen ? (
            <div className="mt-1 space-y-0.5 text-[8.5px] text-slate-300">
              {player.id === 1 && keyboardPreset === 'arrows' && (
                <>
                  <div>Move: <span className="text-amber-300">Arrows (↑ ↓ ← →)</span></div>
                  <div>Pass / Tackle: <span className="text-amber-300">S</span> · Shoot: <span className="text-amber-300">A</span></div>
                  <div>Through Ball: <span className="text-amber-300">W</span> · Cross: <span className="text-amber-300">D</span></div>
                  <div>Switch / Shield: <span className="text-amber-300">Q / Space</span> · Sprint: <span className="text-amber-300">Shift</span></div>
                </>
              )}
              {player.id === 1 && keyboardPreset === 'wasd' && (
                <>
                  <div>Move: <span className="text-amber-300">W (Up), S (Down), A (Left), D (Right)</span></div>
                  <div>Pass / Tackle: <span className="text-amber-300">J</span> · Shoot: <span className="text-amber-300">K</span></div>
                  <div>Through Ball: <span className="text-amber-300">I</span> · Cross: <span className="text-amber-300">L</span></div>
                  <div>Switch / Shield: <span className="text-amber-300">U / Space</span> · Sprint: <span className="text-amber-300">Shift</span></div>
                </>
              )}
              {player.id === 2 && (
                <>
                  <div>Move: <span className="text-amber-300">I, K, J, L</span></div>
                  <div>Pass: <span className="text-amber-300">U</span> · Shoot: <span className="text-amber-300">O</span> · Through: <span className="text-amber-300">Y</span> · Cross: <span className="text-amber-300">P</span></div>
                </>
              )}
              {player.id === 3 && (
                <>
                  <div>Move: <span className="text-amber-300">Numpad 8, 5, 4, 6</span></div>
                  <div>Pass: <span className="text-amber-300">Num1</span> · Shoot: <span className="text-amber-300">Num2</span> · Through: <span className="text-amber-300">Num3</span> · Cross: <span className="text-amber-300">Num0</span></div>
                </>
              )}
              {player.id === 4 && (
                <>
                  <div>Move: <span className="text-amber-300">T, G, F, H</span></div>
                  <div>Pass: <span className="text-amber-300">Z</span> · Shoot: <span className="text-amber-300">X</span> · Through: <span className="text-amber-300">C</span> · Cross: <span className="text-amber-300">V</span></div>
                </>
              )}
            </div>
          ) : (
            <div className="truncate text-slate-300 mt-0.5">
              {player.id === 1 && keyboardPreset === 'arrows' && 'Move: Arrows · Pass: S · Shoot: A · Through: W · Cross: D'}
              {player.id === 1 && keyboardPreset === 'wasd' && 'Move: WASD · Pass: J · Shoot: K · Through: I · Cross: L'}
              {player.id === 2 && 'Move: IJKL · Pass: U · Shoot: O · Through: Y · Cross: P'}
              {player.id === 3 && 'Move: Num 8546 · Pass: Num1 · Shoot: Num2 · Cross: Num0'}
              {player.id === 4 && 'Move: TGFH · Pass: Z · Shoot: X · Cross: V'}
            </div>
          )}
        </div>
      )}

      {player.device === 'gamepad' && (
        <div className="text-[9px] font-mono text-slate-400 bg-slate-950/60 p-1 rounded border border-slate-800 truncate">
          🎮 Stick / D-Pad: Move · ✕/A: Pass · □/X: Shoot · △/Y: Through · ○/B: Cross · L1: Switch
        </div>
      )}

      {player.device === 'touch' && (
        <div className="text-[9px] font-mono text-slate-400 bg-slate-950/60 p-1 rounded border border-slate-800 truncate">
          📱 On-screen floating analog stick + S, A, W, D virtual arcade touch buttons
        </div>
      )}
    </div>
  );
};
