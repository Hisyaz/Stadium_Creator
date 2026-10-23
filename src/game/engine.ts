import {
  Player,
  Ball,
  Referee,
  TurfParticle,
  KeyState,
  MatchPhase,
  MatchScore,
  TeamSide,
  PlayerRole,
  PowerBarState,
  PowerActionType,
  SetPieceState,
  DifficultyLevel,
  GoalNetState,
  FormationName,
  TacticalPlaystyle,
  HalfDurationMinutes,
  PreMatchConfig,
  OffsideIncident,
  ControlMode,
  DetailedTactics,
  MatchStakeTier,
  TacticalBlockPhase,
  PrimaryPosition,
  SubPosition,
  PlayerPlaystyle,
  StadiumTier,
  TimeOfDay,
  SeatColorMode,
  CrowdLevel,
  TurfQuality,
  GrassLength,
  WeatherCondition,
  Season,
  NetTension,
  GoalFrameType,
  PitchDimensionPreset,
  PuddleZone,
  LawnMowingPattern,
  SurfaceStatus,
  TeamKit,
  TeamDefinition,
  TeamTacticalRoles,
  MatchStats,
  PlayerSlotConfig,
  DEFAULT_PLAYER_SLOTS,
  ControlScope,
  CursorSwitchMode,
  DribblingTier,
} from '../types';
import { PlayerRatingsEngine, PlayerRatingRecord, MatchMvpResult } from './playerRatings';
import { getTeamById, applyTeamToEngine } from './teams';
import { StadiumDefinition, ApronMaterial } from '../types/stadium';
import { STADIUM_REGISTRY, getStadiumById } from './stadiumRegistry';
import { resolvePitchMetrics, PITCH_DIMENSION_PRESETS } from './pitchDimensions';
import {
  generatePuddleZones,
  updateWeatherParticles,
  processPlayerPuddleTraction,
  spawnCleatSpray,
  evaluateHalfTimeWeatherTransition,
  getWeatherSurfaceModifiers,
} from './weatherEngine';
import {
  PreMatchSwoopState,
  createPreMatchSwoop,
  updatePreMatchSwoop,
} from './skyCamRenderer';
import { getTurfRollingModifiers, createTurfScuff } from './turfPhysics';
import { addPitchScuff } from './pitchRenderer';
import {
  applyPositionalHierarchyToPlayer,
  PLAYSTYLE_DEFINITIONS_DETAILED,
  PLAYSTYLE_ID,
} from './playstyles';
import {
  PITCH_CONFIG,
  PHYSICS,
  HOME_KIT,
  AWAY_KIT,
  HOME_FORMATION_BASE,
  AWAY_FORMATION_BASE,
} from './constants';
import {
  HOME_PLAYER_CANONICAL_STATS,
  AWAY_PLAYER_CANONICAL_STATS,
  createStatsBuffer,
  updatePlayerStaminaDynamic,
  calculateInitialMaxStamina,
  calculateOffBallTopSpeed,
  calculateOnBallTopSpeed,
  calculateTurnDecelerationFactor,
  calculateOnBallAccelerationRamp,
  calculateOnBallTurnRate,
  getDribblingTier,
  getDribblingTouchOffset,
  getStepOverCycleSpeed,
  calculateTrapDistance,
  resolveShieldDuel,
  calculateInterceptionRadius,
  calculateCleanInterceptChance,
  calculateStandingTackleCleanChance,
  calculateSlideCleanChance,
  calculateSlideReach,
  calculateStealToFeetChance,
  calculateGkDiveReach,
  calculateGkCatchChance,
  getStakeFactor,
  calculateHeaderAccuracy,
  resolveStatBreakDuel,
  isStatBreak,
  getAttributeTier,
  getAttributeStatBreakName,
} from './playerStats';
import { updateBallPhysics, GoalEvent } from './physics';
import {
  updatePlayerAI,
  updateFacingDirection,
  evaluateOffside,
  getOptimalTacticalPosition,
  updateTeamBlockShape,
  determineTeamBlockPhase,
  getCounterPressDurationFrames,
} from './ai';
import {
  applyFormationToPlayers,
  HOME_FORMATIONS,
  getAwayFormationPositions,
  PLAYSTYLE_DEFINITIONS,
  getDefaultTactics,
} from './formations';
import { audio } from './audio';
import { triggerGoalCelebrationAtmosphere } from './crowdRenderer';
import { t } from './i18n';
import {
  InputSkillTracker,
  ArrowRotationTracker,
  executeAutopassLaunch,
  executeRainbowFlick,
  executeStepOvers,
  executeDoubleTapQSkill,
  executeRoulette,
  executeShoulderHit,
  executeShirtPull,
  isIncidentSeenByReferee,
  normalizeAngle,
} from './skills';
import {
  isInsideDefendingPenaltyBox,
  setupPenalty,
  setupFreeKick,
  setupCornerKick,
  setupGoalKick,
  setupThrowIn,
  updateSetPiece,
  executePenaltyShot,
  executeSetPieceDelivery,
} from './setPieces';
import {
  updateGingaSystem,
  tryExecuteVolley,
  executeRusticVolleyClearance,
  checkAutomaticHeader,
} from './ginga';
import { raycastPitchBoundary, PitchCrossingResult } from './pitchBoundary';
import {
  determineOutOfBoundsAward,
  processGoalkeeperShotReaction,
  checkOutfieldDefenderShotBlock,
} from './matchRules';
import {
  executeShortPassAction,
  executeLongPassAction,
  executeCrossAction,
  executeShotAction,
  ActionExecutionContext,
} from './playerActions';
import { animationEngine } from './animationEngine';

import { CameraManager, CameraState } from './camera';
export type { CameraState };

export function isKickingAction(action: string): boolean {
  return (
    action === 'running_pass' ||
    action === 'running_pass_low' ||
    action === 'running_pass_mid' ||
    action === 'running_pass_high' ||
    action === 'running_long_pass' ||
    action === 'running_long_pass_low' ||
    action === 'running_long_pass_mid' ||
    action === 'running_long_pass_high' ||
    action === 'running_shot' ||
    action === 'running_shot_low' ||
    action === 'running_shot_mid' ||
    action === 'running_shot_high' ||
    action === 'running_cross' ||
    action === 'running_cross_low' ||
    action === 'running_cross_mid' ||
    action === 'running_cross_high' ||
    action === 'standing_pass' ||
    action === 'standing_pass_low' ||
    action === 'standing_pass_mid' ||
    action === 'standing_pass_high' ||
    action === 'standing_long_pass' ||
    action === 'standing_long_pass_low' ||
    action === 'standing_long_pass_mid' ||
    action === 'standing_long_pass_high' ||
    action === 'standing_shot' ||
    action === 'standing_shot_low' ||
    action === 'standing_shot_mid' ||
    action === 'standing_shot_high' ||
    action === 'standing_cross' ||
    action === 'standing_cross_low' ||
    action === 'standing_cross_mid' ||
    action === 'standing_cross_high' ||
    action === 'special_curl_shot' ||
    action === 'knuckle_shot' ||
    action === 'chip_shot' ||
    action === 'chipped_cross' ||
    action === 'chipped_long_pass' ||
    action === 'special_curl_pass' ||
    action === 'knuckle_pass' ||
    action === 'passing' ||
    action === 'shooting' ||
    action === 'crossing' ||
    action === 'kicking' ||
    action === 'freekick_strike' ||
    action === 'penalty_strike' ||
    action === 'throw_in_throw' ||
    action === 'driven_laces_strike' ||
    action === 'curling_finesse' ||
    action === 'sliding_toe_poke' ||
    action === 'sidefoot_push' ||
    action === 'trivela' ||
    action === 'scoop_chip' ||
    action === 'backheel_flick' ||
    action === 'bullet_header' ||
    action === 'glancing_header' ||
    action === 'diving_header'
  );
}

export class MatchEngine {
  public players: Player[] = [];
  public ball: Ball = {
    x: PITCH_CONFIG.CENTER_X,
    y: PITCH_CONFIG.CENTER_Y,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    spin: 0,
    ownerId: null,
    lastTouchTeam: null,
    lastTouchPlayerId: null,
    isAirborne: false,
  };
  public referee: Referee = {
    x: PITCH_CONFIG.CENTER_X + 60,
    y: PITCH_CONFIG.CENTER_Y + 40,
    vx: 0,
    vy: 0,
    facingAngle: 0,
    sightRange: 360,
    sightFov: (110 * Math.PI) / 180,
    whistleTimer: 0,
    cardDisplay: null,
    cardPlayerName: null,
  };

  public cameraManager: CameraManager = new CameraManager();
  public camera: CameraState = this.cameraManager.state;

  /**
   * Camera and Radar focus mode:
   * 'pitch' = follows ball while dynamically auto-framing so user-controlled player remains on screen (default)
   * 'ball' = follows ball
   * 'player' = follows user-controlled player
   */
  public cameraFocus: 'pitch' | 'ball' | 'player' = 'pitch';

  public toggleCameraFocus(): 'pitch' | 'ball' | 'player' {
    if (this.cameraFocus === 'pitch') {
      this.cameraFocus = 'ball';
    } else if (this.cameraFocus === 'ball') {
      this.cameraFocus = 'player';
    } else {
      this.cameraFocus = 'pitch';
    }
    return this.cameraFocus;
  }

  // Phase 15.3: Pre-Match Sky-Cam to Pitch-Cam Zoom Swoop Director
  public preMatchSwoop: PreMatchSwoopState | null = null;

  public startPreMatchSwoop(durationMs: number = 3000) {
    this.preMatchSwoop = createPreMatchSwoop(
      this.activeStadium,
      this.homeTeam?.name || 'HOME TEAM',
      this.awayTeam?.name || 'AWAY TEAM',
      durationMs
    );
    this.camera.x = PITCH_CONFIG.CENTER_X;
    this.camera.y = PITCH_CONFIG.CENTER_Y - 140;
    this.camera.zoom = 0.25;
    this.camera.pitchTilt = 0.32;
  }

  public skipPreMatchSwoop() {
    if (this.preMatchSwoop && this.preMatchSwoop.isActive) {
      this.preMatchSwoop.isSkipped = true;
      this.preMatchSwoop.isActive = false;
      this.camera.x = PITCH_CONFIG.CENTER_X;
      this.camera.y = PITCH_CONFIG.CENTER_Y;
      this.camera.zoom = 1.05;
      this.camera.pitchTilt = 0.5;
    }
  }

  public isPreMatchSwoopActive(): boolean {
    return !!(this.preMatchSwoop && this.preMatchSwoop.isActive && !this.preMatchSwoop.isSkipped);
  }

  public score: MatchScore = { home: 0, away: 0 };
  public difficulty: DifficultyLevel = 'easy';
  public matchPhase: MatchPhase = 'kickoff_ready';
  public kickoffKickingTeam: TeamSide = 'away';
  public phaseTimer: number = 0;
  public matchTimeSeconds: number = 0; // 90 min match scaled
  public frameCount: number = 0; // Total 60 FPS update frame counter for staggered tactical ticking
  public isPaused: boolean = false;
  public userControlledPlayerId: string = '';
  public controlMode: ControlMode = 'full_team';
  public lockedPlayerId: string | null = null;
  public autoPositionTarget: { x: number; y: number } | null = null;
  public autoPositionTimer: number = 0;
  public tacticalGuideEnabled: boolean = false;

  // Phase 1.5 & Phase 4.5: Multi-Player, Control Scope & Cursor Switching
  public cursorSwitchMode: CursorSwitchMode = 'manual';
  public lastSwitchPressTime: Record<number, number> = {};

  public playerSlots: PlayerSlotConfig[] = [
    {
      id: 1,
      name: '1P',
      side: 'home',
      device: 'keyboard',
      keyboardPreset: 'arrows',
      gamepadIndex: 0,
      color: '#38bdf8',
      controlScope: 'all_team',
      cursorSwitchMode: 'manual',
    },
  ];

  // Map of human controlled player IDs per player slot (e.g. 1 -> home_ST1, 2 -> away_ST1)
  public slotControlledPlayerIds: Record<number, string> = {};

  public setPlayerSlots(slots: PlayerSlotConfig[]) {
    this.playerSlots = slots.map(s => ({ ...s }));
    const slot1 = this.playerSlots.find(s => s.id === 1);
    if (slot1) {
      if (slot1.cursorSwitchMode) {
        this.cursorSwitchMode = slot1.cursorSwitchMode;
      }
      if (slot1.controlScope) {
        this.setControlMode(slot1.controlScope === 'single_player' ? 'one_player' : 'full_team');
      }
      if (slot1.lockedPlayerId && slot1.controlScope === 'single_player') {
        this.setLockedPlayer(slot1.lockedPlayerId);
      }
    }
    this.syncSlotControlledPlayers();
  }

  public isSideHumanControlled(side: TeamSide): boolean {
    return this.playerSlots.some(s => s.side === side);
  }

  public isSpectatorMode(): boolean {
    return !this.isSideHumanControlled('home') && !this.isSideHumanControlled('away');
  }

  public syncSlotControlledPlayers() {
    this.slotControlledPlayerIds = {};
    if (this.isSpectatorMode()) {
      this.userControlledPlayerId = '';
      this.updateUserControlledFlag();
      return;
    }

    if (this.controlMode === 'one_player' && this.lockedPlayerId) {
      const lockedP = this.players.find(p => p.id === this.lockedPlayerId);
      if (lockedP) {
        this.userControlledPlayerId = lockedP.id;
        const slot1 = this.playerSlots.find(s => s.id === 1);
        if (slot1) this.slotControlledPlayerIds[slot1.id] = lockedP.id;
        this.updateUserControlledFlag();
        return;
      }
    }

    for (const slot of this.playerSlots) {
      if (slot.side === 'spectator') continue;

      if (slot.controlScope === 'single_player' && slot.lockedPlayerId) {
        const locked = this.players.find(p => p.id === slot.lockedPlayerId);
        if (locked) {
          this.slotControlledPlayerIds[slot.id] = locked.id;
          if (slot.id === 1) this.userControlledPlayerId = locked.id;
          continue;
        }
      }

      const teamPlayers = this.players.filter(p => p.team === slot.side && p.role !== 'GK');
      // Assign closest or primary attacker/midfielder
      const candidate = teamPlayers.find(p => !Object.values(this.slotControlledPlayerIds).includes(p.id)) || teamPlayers[0];
      if (candidate) {
        this.slotControlledPlayerIds[slot.id] = candidate.id;
        if (slot.id === 1) {
          this.userControlledPlayerId = candidate.id;
        }
      }
    }

    if (!this.userControlledPlayerId && Object.values(this.slotControlledPlayerIds).length > 0) {
      this.userControlledPlayerId = Object.values(this.slotControlledPlayerIds)[0];
    }
    this.updateUserControlledFlag();
  }

  public setControlMode(mode: ControlMode) {
    this.controlMode = mode;
    if (mode === 'one_player') {
      const cp = this.getControlledPlayer();
      this.lockedPlayerId = cp ? cp.id : (this.players.find(p => p.team === 'home')?.id || null);
      if (this.lockedPlayerId) {
        this.userControlledPlayerId = this.lockedPlayerId;
        this.updateUserControlledFlag();
      }
    } else {
      this.tacticalGuideEnabled = false;
      this.autoPositionTarget = null;
    }
  }

  public setLockedPlayer(playerId: string) {
    const p = this.players.find(pl => pl.id === playerId);
    if (p) {
      this.lockedPlayerId = p.id;
      this.userControlledPlayerId = p.id;
      this.updateUserControlledFlag();
      this.setBanner(`1-PLAYER LOCKED: #${p.number} ${p.name.toUpperCase()} (${p.role})`, 80);
      audio.playKick(0.4);
    }
  }

  // Formations, Tactical Playstyles & Match Rules
  public homeFormation: FormationName = '4-4-2';
  public awayFormation: FormationName = '4-4-2';
  public homePlaystyle: TacticalPlaystyle = 'possession';
  public awayPlaystyle: TacticalPlaystyle = 'gegenpress';
  public homeTactics: DetailedTactics = getDefaultTactics('possession');
  public awayTactics: DetailedTactics = getDefaultTactics('gegenpress');
  public halfDurationMinutes: HalfDurationMinutes = 3;
  public matchStakeTier: MatchStakeTier = 'friendly';
  public currentHalf: 1 | 2 = 1;
  public currentPeriod: '1st_half' | '2nd_half' | 'extra_time_1' | 'extra_time_2' | 'penalty_shootout' = '1st_half';
  public homeAttacksUp: boolean = true; // 1st half: Home attacks UP, 2nd half: Home attacks DOWN (sides swapped)
  public firstHalfSubsInjuries: number = 0;
  public secondHalfSubsInjuries: number = 0;
  public firstHalfStoppageMinutes: number = 1; // Min 1 min, +30s per sub/injury in 1m batches
  public secondHalfStoppageMinutes: number = 2; // Min 2 min, +30s per sub/injury in 1m batches
  public deathSetPieceDecision: 'allow' | 'blow' | null = null;
  public lastConcedingTeam: TeamSide = 'away';
  private wasSpacePressedLastFrame: boolean = false;
  private wasGPressedLastFrame: boolean = false;
  public lastOffsideIncident: OffsideIncident | null = null;

  // Phase 4: Modern Compact Positioning & Transition Tracking
  public lastPossessionTeam: TeamSide | null = null;
  public possessionLostFrame: { home: number; away: number } = { home: -9999, away: -9999 };
  public homeBlockPhase: TacticalBlockPhase = 'mid_block';
  public awayBlockPhase: TacticalBlockPhase = 'mid_block';

  // Phase 10: Live Player Rating Engine (SofaScore Model) & Match MVP
  public playerRatings: PlayerRatingsEngine = new PlayerRatingsEngine();
  public lastPassPlayerId: string | null = null;
  public lastPassIsThroughBall: boolean = false;
  public lastPassTimeSeconds: number = 0;
  public lastCompletedPasserId: string | null = null;
  public lastCompletedPassTime: number = 0;

  public matchStats: MatchStats = {
    home: {
      goals: 0,
      shots: 0,
      shotsOnTarget: 0,
      corners: 0,
      fouls: 0,
      yellowCards: 0,
      redCards: 0,
      possessionFrames: 0,
      passesAttempted: 0,
      passesCompleted: 0,
      tackles: 0,
      offsides: 0,
    },
    away: {
      goals: 0,
      shots: 0,
      shotsOnTarget: 0,
      corners: 0,
      fouls: 0,
      yellowCards: 0,
      redCards: 0,
      possessionFrames: 0,
      passesAttempted: 0,
      passesCompleted: 0,
      tackles: 0,
      offsides: 0,
    },
  };

  public get stoppageTimeDisplay(): string | null {
    if (this.currentHalf === 1 && this.matchTimeSeconds >= 44 * 60) {
      return `+${this.firstHalfStoppageMinutes}'`;
    }
    if (this.currentHalf === 2 && this.currentPeriod === '2nd_half' && this.matchTimeSeconds >= 89 * 60) {
      return `+${this.secondHalfStoppageMinutes}'`;
    }
    if (this.currentPeriod === 'extra_time_1' && this.matchTimeSeconds >= 104 * 60) {
      return "+1'";
    }
    if (this.currentPeriod === 'extra_time_2' && this.matchTimeSeconds >= 119 * 60) {
      return "+1'";
    }
    return null;
  }

  public recordStoppageEvent(type: 'substitution' | 'injury' = 'substitution') {
    if (this.currentHalf === 1) {
      this.firstHalfSubsInjuries++;
      this.firstHalfStoppageMinutes = 1 + Math.floor((this.firstHalfSubsInjuries * 30) / 60);
    } else {
      this.secondHalfSubsInjuries++;
      this.secondHalfStoppageMinutes = 2 + Math.floor((this.secondHalfSubsInjuries * 30) / 60);
    }
  }

  public resetMatchStats() {
    this.matchStats = {
      home: { goals: 0, shots: 0, shotsOnTarget: 0, corners: 0, fouls: 0, yellowCards: 0, redCards: 0, possessionFrames: 0, passesAttempted: 0, passesCompleted: 0, tackles: 0, offsides: 0 },
      away: { goals: 0, shots: 0, shotsOnTarget: 0, corners: 0, fouls: 0, yellowCards: 0, redCards: 0, possessionFrames: 0, passesAttempted: 0, passesCompleted: 0, tackles: 0, offsides: 0 },
    };
    this.lastPassPlayerId = null;
    this.lastCompletedPasserId = null;
    this.playerRatings.reset(this.players);
  }

  public getControlledPlayerRating(): number {
    const cp = this.getControlledPlayer();
    return cp ? this.playerRatings.getRating(cp.id) : 6.0;
  }

  public setHomeTactics(tactics: DetailedTactics, playstyle?: TacticalPlaystyle) {
    this.homeTactics = { ...tactics };
    if (playstyle) this.homePlaystyle = playstyle;
  }

  public setAwayTactics(tactics: DetailedTactics, playstyle?: TacticalPlaystyle) {
    this.awayTactics = { ...tactics };
    if (playstyle) this.awayPlaystyle = playstyle;
  }

  // Phase 13.5: Multi-Tier Team Database & Selection Engine
  public homeTeam: TeamDefinition = getTeamById('modern_european_xi');
  public awayTeam: TeamDefinition = getTeamById('classic_european_xi');
  public homeKit: TeamKit = { ...this.homeTeam.kit };
  public awayKit: TeamKit = { ...this.awayTeam.kit };

  public setTeam(side: 'home' | 'away', team: TeamDefinition) {
    applyTeamToEngine(this, side, team);
  }

  /**
   * Phase 15: Dual-Pitch PES Tactical Game Plan Application
   * Applies lineups, substitutions, set-piece specialist assignments, formations and playstyles.
   */
  public applyTacticalGamePlan(plan: {
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
  }) {
    this.homeTeam = { ...plan.homeTeam, roles: { ...plan.homeRoles } };
    this.awayTeam = { ...plan.awayTeam, roles: { ...plan.awayRoles } };
    this.homeFormation = plan.homeFormation;
    this.awayFormation = plan.awayFormation;
    this.homePlaystyle = plan.homePlaystyle;
    this.awayPlaystyle = plan.awayPlaystyle;
    this.homeTactics = { ...plan.homeTactics };
    this.awayTactics = { ...plan.awayTactics };

    // Sync active rosters and player substitutions on both sides
    const syncSide = (side: 'home' | 'away', team: TeamDefinition, formation: FormationName) => {
      const sidePlayers = this.players.filter(p => p.team === side);
      for (let i = 0; i < team.players.length; i++) {
        const rp = team.players[i];
        const targetPlayer = sidePlayers[i];
        if (!targetPlayer) continue;

        if (this.matchTimeSeconds > 0 && targetPlayer.name !== rp.name) {
          this.recordStoppageEvent('substitution');
          // Phase 10: Freeze subbed-out player's rating at exact exit minute
          this.playerRatings.freezePlayerRating(targetPlayer.id, Math.floor(this.matchTimeSeconds / 60));
          this.playerRatings.substituteIn({
            id: targetPlayer.id,
            name: rp.name,
            number: rp.number,
            team: side,
            role: rp.role,
            primaryPos: targetPlayer.primaryPos,
            subPos: rp.subPosition,
          });
        }

        targetPlayer.name = rp.name;
        targetPlayer.number = rp.number;
        targetPlayer.role = rp.role;
        targetPlayer.subPos = rp.subPosition;
        targetPlayer.intrinsicPlaystyle = rp.intrinsicPlaystyle || targetPlayer.intrinsicPlaystyle || rp.playstyle;
        targetPlayer.playstyle = rp.playstyle;
        targetPlayer.scale = rp.scale ?? 1.0;
        targetPlayer.appearance = { ...rp.appearance };
        targetPlayer.canonicalStats = { ...rp.canonicalStats };

        const isGK = rp.role === 'GK';
        const sta = ('sta' in rp.canonicalStats) ? (rp.canonicalStats as any).sta : 85;
        const initialMax = calculateInitialMaxStamina(sta);
        targetPlayer.staminaMax = initialMax;
        targetPlayer.staminaInitialMax = initialMax;

        const dri = ('dri' in rp.canonicalStats) ? (rp.canonicalStats as any).dri : 70;
        targetPlayer.dribbleTier = getDribblingTier(dri);

        targetPlayer.statsBuffer = createStatsBuffer(
          !isGK ? (rp.canonicalStats as any) : undefined,
          isGK ? (rp.canonicalStats as any) : undefined
        );

        applyPositionalHierarchyToPlayer(targetPlayer, formation, rp.playstyle);
      }

      const attacksUp = side === 'home' ? this.homeAttacksUp : !this.homeAttacksUp;
      applyFormationToPlayers(
        this.players,
        side,
        formation,
        PITCH_CONFIG.FIELD_WIDTH,
        PITCH_CONFIG.FIELD_HEIGHT,
        PITCH_CONFIG.PITCH_LEFT,
        PITCH_CONFIG.PITCH_TOP,
        attacksUp
      );

      // Phase 16.5: Override custom anchor coordinates from tactical board drag & drop
      for (let i = 0; i < team.players.length; i++) {
        const rp = team.players[i];
        if (!rp.customPos) continue;
        const targetPlayer = sidePlayers[i];
        if (!targetPlayer) continue;

        const normX = rp.customPos.x;
        const normY = attacksUp ? rp.customPos.y : 1.0 - rp.customPos.y;

        targetPlayer.baseX = normX;
        targetPlayer.baseY = normY;
        targetPlayer.targetX = PITCH_CONFIG.PITCH_LEFT + normX * PITCH_CONFIG.FIELD_WIDTH;
        targetPlayer.targetY = PITCH_CONFIG.PITCH_TOP + normY * PITCH_CONFIG.FIELD_HEIGHT;
      }
    };

    syncSide('home', this.homeTeam, this.homeFormation);
    syncSide('away', this.awayTeam, this.awayFormation);

    this.setBanner(`TACTICAL GAME PLAN APPLIED! [${this.homeFormation} vs ${this.awayFormation}]`, 100);
    audio.playKick(0.5);
  }

  // Phase 10 & Phase 12: Dynamic Stadium Architecture, Time of Day & Atmosphere
  public stadiumTier: StadiumTier = 'monumental';
  public timeOfDay: TimeOfDay = 'night';
  public seatColor: SeatColorMode = 'auto';
  public crowdLevel: CrowdLevel = 'crowded';

  // Phase 12: Data-Driven Stadium Architecture & Official Team Venues (Section 12.2 & 12.5)
  public activeStadium: StadiumDefinition = STADIUM_REGISTRY.estadio_monumental;
  public isHomeVenueSelected: boolean = false;

  public applyStadium(stadium: StadiumDefinition, isHomeVenue: boolean = false) {
    this.activeStadium = stadium;
    this.isHomeVenueSelected = isHomeVenue;
    this.stadiumTier = stadium.fifaCategory === 'world' ? 'monumental' : stadium.fifaCategory === 'national' ? 'ascenso' : 'craven';
    audio.setStadiumTier(this.stadiumTier);
    if (stadium.pitchPreset) this.pitchPreset = stadium.pitchPreset;
    if (stadium.pitchLengthMeters) this.pitchLengthMeters = stadium.pitchLengthMeters;
    if (stadium.pitchWidthMeters) this.pitchWidthMeters = stadium.pitchWidthMeters;
    if (stadium.turfQuality) this.setTurfQuality(stadium.turfQuality);
    if (stadium.mowingPattern) this.setMowingPattern(stadium.mowingPattern);
    if (stadium.grassLength) this.setGrassLength(stadium.grassLength);
    if (stadium.surfaceStatus) this.setSurfaceStatus(stadium.surfaceStatus);
    if (stadium.goalFrame) this.setGoalFrame(stadium.goalFrame);
    if (stadium.netTension) this.setNetTension(stadium.netTension);
    if (stadium.seatColor) this.setSeatColor(stadium.seatColor);
    if (stadium.timeOfDay) this.setTimeOfDay(stadium.timeOfDay);
    if (stadium.weather) this.setWeather(stadium.weather);
    if (stadium.season) this.setSeason(stadium.season);
    if (stadium.apronMaterial) this.setApronMaterial(stadium.apronMaterial);

    const banner = isHomeVenue
      ? `🏟️ HOME VENUE: ${stadium.name.toUpperCase()} [${stadium.fifaCategory.toUpperCase()}]`
      : `🏟️ VENUE: ${stadium.name.toUpperCase()} [${stadium.fifaCategory.toUpperCase()}]`;
    this.setBanner(banner, 90);
  }

  public setApronMaterial(material: ApronMaterial) {
    if (this.activeStadium) {
      this.activeStadium.apronMaterial = material;
    }
  }

  public applyHomeVenueForTeam(team: TeamDefinition) {
    if (team.homeStadiumId && STADIUM_REGISTRY[team.homeStadiumId]) {
      const stad = STADIUM_REGISTRY[team.homeStadiumId];
      this.applyStadium(stad, true);
      if (team.venueOverrides) {
        const v = team.venueOverrides;
        if (v.pitchPattern) this.setMowingPattern(v.pitchPattern);
        if (v.netStyle) this.setGoalFrame(v.netStyle);
        if (v.netTension) this.setNetTension(v.netTension);
        if (v.pitchSizePreset) this.setPitchDimensions(v.pitchSizePreset, v.pitchLengthMeters, v.pitchWidthMeters);
        if (v.turfQuality) this.setTurfQuality(v.turfQuality);
        if (v.grassLength) this.setGrassLength(v.grassLength);
        if (v.surfaceStatus) this.setSurfaceStatus(v.surfaceStatus);
      }
    }
  }

  public setStadiumTier(tier: StadiumTier) {
    this.stadiumTier = tier;
    audio.setStadiumTier(tier);
    const names = {
      monumental: 'ELITE GRAND ARENA (MONUMENTAL)',
      craven: 'HERITAGE ENGLISH GROUND (CRAVEN)',
      ascenso: 'ASCENSO MUNICIPAL (RAW CONCRETE)',
    };
    this.setBanner(`STADIUM: ${names[tier]}`, 80);
  }

  public setTimeOfDay(time: TimeOfDay) {
    this.timeOfDay = time;
    this.setBanner(`LIGHTING: ${time.toUpperCase()}`, 70);
  }

  public setSeatColor(color: SeatColorMode) {
    this.seatColor = color;
    this.setBanner(`SEAT PALETTE: ${color.toUpperCase()}`, 70);
  }

  public setCrowdLevel(level: CrowdLevel) {
    this.crowdLevel = level;
    audio.setCrowdLevel(level);
    const names: Record<CrowdLevel, string> = {
      empty: 'EMPTY (0% ATTENDANCE)',
      small: 'SMALL (SPARSE ATTENDANCE)',
      few: 'FEW (LOW ATTENDANCE)',
      half: 'HALF (50% ATTENDANCE)',
      crowded: 'CROWDED (HIGH ATTENDANCE)',
      packet: 'PACKET (TO THE BRIM / OVER CAPACITY)',
    };
    this.setBanner(`CROWD: ${names[level] || level.toUpperCase()}`, 80);
  }

  // Phase 11: Tactical Pitch Dimensions, Surface Quality, Weather & Brazilian Nets
  public pitchPreset: PitchDimensionPreset = 'balanced';
  public pitchLengthMeters: number = 105;
  public pitchWidthMeters: number = 68;
  public turfQuality: TurfQuality = 'normal';
  public grassLength: GrassLength = 'normal';
  public mowingPattern: LawnMowingPattern = 'horizontal';
  public surfaceStatus: SurfaceStatus = 'normal';
  public weather: WeatherCondition = 'clear';
  public season: Season = 'summer';
  public netTension: NetTension = 'moderate';
  public goalFrame: GoalFrameType = 'standard';
  public puddles: PuddleZone[] = [];

  public setTurfQuality(quality: TurfQuality) {
    this.turfQuality = quality;
    if (this.weather === 'torrential' || this.weather === 'rain') {
      this.puddles = generatePuddleZones(quality);
    }
    this.setBanner(`TURF GRADE: ${quality.toUpperCase()}`, 70);
  }

  public setMowingPattern(pattern: LawnMowingPattern) {
    this.mowingPattern = pattern;
    const names: Record<LawnMowingPattern, string> = {
      plain: 'PLAIN CUT (UNIFORM)',
      horizontal: 'HORIZONTAL STRIPES',
      vertical: 'VERTICAL STRIPES',
      european_boxes: 'EUROPEAN CHECKERED SHADES',
      checkerboard: 'HIGH-CONTRAST CHECKERBOARD',
      diagonal_diamonds: 'DIAGONAL DIAMONDS',
      concentric_circles: 'CONCENTRIC CIRCLES',
    };
    this.setBanner(`LAWN PATTERN: ${names[pattern] || pattern.toUpperCase()}`, 70);
  }

  public setSurfaceStatus(status: SurfaceStatus) {
    this.surfaceStatus = status;
    this.setBanner(`SURFACE STATUS: ${status.toUpperCase()}`, 70);
  }

  public setGrassLength(length: GrassLength) {
    this.grassLength = length;
    this.setBanner(`GRASS LENGTH: ${length.toUpperCase()} CUT`, 70);
  }

  public setWeather(weather: WeatherCondition) {
    this.weather = weather;
    if (weather === 'torrential' || weather === 'rain') {
      this.puddles = generatePuddleZones(this.turfQuality);
    } else {
      this.puddles = [];
    }
    if (weather === 'snow') {
      this.ball.ballType = 'winter_orange';
    } else if (weather === 'blizzard') {
      this.ball.ballType = 'winter_yellow';
    } else {
      this.ball.ballType = 'standard';
    }
    this.setBanner(`WEATHER: ${weather.toUpperCase()}`, 70);
  }

  public setSeason(season: Season) {
    this.season = season;
    this.setBanner(`SEASON: ${season.toUpperCase()}`, 70);
  }

  public setNetTension(tension: NetTension) {
    this.netTension = tension;
    this.setBanner(`GOAL NET TENSION: ${tension.toUpperCase()}`, 70);
  }

  public setGoalFrame(frame: GoalFrameType) {
    this.goalFrame = frame;
    this.setBanner(`GOAL FRAME: ${frame === 'brazilian' ? 'BRAZILIAN DEEP BOX' : 'STANDARD REGULATION'}`, 80);
  }

  public setPitchDimensions(preset: PitchDimensionPreset, length?: number, width?: number) {
    this.pitchPreset = preset;
    if (preset === 'compact') {
      this.pitchLengthMeters = 100;
      this.pitchWidthMeters = 64;
    } else if (preset === 'expansive') {
      this.pitchLengthMeters = 110;
      this.pitchWidthMeters = 74;
    } else if (preset === 'custom') {
      this.pitchLengthMeters = length ?? 105;
      this.pitchWidthMeters = width ?? 68;
    } else {
      this.pitchLengthMeters = 105;
      this.pitchWidthMeters = 68;
    }
    this.setBanner(`PITCH: ${this.pitchLengthMeters}m × ${this.pitchWidthMeters}m (${preset.toUpperCase()})`, 80);
  }

  /**
   * Game speed slider setting (ranges from 1% to 200%, default 100%).
   * "slow down the game by 30% add a game speed slider that ranges from 1% to 200%, the current speed lowered by 30% will be the base speed at 100%"
   */
  public gameSpeed: number = 100;

  /**
   * Returns current effective simulation time multiplier.
   * At 100% slider, speed is lowered by 30% (multiplier = 0.70).
   */
  public getTimeScale(): number {
    const clamped = Math.max(1, Math.min(200, this.gameSpeed));
    return (clamped / 100) * 0.70;
  }

  public setPiece: SetPieceState | null = null;
  public setPieceCameraFollowTimer: number = 0;
  public setPieceCameraType: 'free_kick' | 'penalty' | 'corner_kick' | 'goal_kick' | 'throw_in' | null = null;
  public setPieceLastAimAngle: number = 0;
  public setPieceTakerCooldownPlayerId: string | null = null;
  public setPieceTakerCooldownTimer: number = 0;
  public setPieceDeliveryGraceTimer: number = 0;
  public skillTracker: InputSkillTracker = new InputSkillTracker();
  public arrowRotationTracker: ArrowRotationTracker = new ArrowRotationTracker();

  public particles: TurfParticle[] = [];
  public bannerMessage: string | null = 'PRESS PASS (S) OR SHOOT (A) TO KICK OFF';
  public bannerTimer: number = 240;

  // Power bar system for Pass / Cross / Shoot / Long Pass + Q-modifier extra curve + E-modifier knuckleball
  public powerBar: PowerBarState = {
    isActive: false,
    action: null,
    power: 0,
    isSpecial: false,
    isKnuckle: false,
    fillSpeed: 1 / 35, // 3x faster default fill speed (~0.58s full charge)
    tier: 1,
    tierColor: '#86efac',
    tierLabel: 'LOW POWER',
    fadeAlpha: 0,
  };

  public heldAction: PowerActionType | null = null;
  private wasFullChargeFired: boolean = false;

  /**
   * Analog deflection ratio from virtual stick (1.0 = normal keyboard/full stick).
   * Used for smooth walking speed when stick is pulled slightly.
   */
  public analogSpeedRatio: number = 1.0;

  public goalNetShake: number = 0;
  private outOfBoundsDelay: number = 0;

  public topGoalNet: GoalNetState = {
    impactX: PITCH_CONFIG.CENTER_X,
    impactY: PITCH_CONFIG.PITCH_TOP - 20,
    impactZ: 10,
    bulgeAmount: 0,
    bulgeVel: 0,
    shake: 0,
    ballCaught: false,
  };

  public bottomGoalNet: GoalNetState = {
    impactX: PITCH_CONFIG.CENTER_X,
    impactY: PITCH_CONFIG.PITCH_BOTTOM + 20,
    impactZ: 10,
    bulgeAmount: 0,
    bulgeVel: 0,
    shake: 0,
    ballCaught: false,
  };

  /**
   * Starts charging a power bar action:
   * Power bar fills 3x faster than originally (1/35), and a further 25% faster for short passes (1/28)
   */
  public startChargingPower(action: PowerActionType, isSpecial: boolean = false, isKnuckle: boolean = false) {
    this.powerBar.isActive = true;
    this.powerBar.action = action;
    this.powerBar.power = 0.05;
    this.powerBar.isSpecial = isSpecial;
    this.powerBar.isKnuckle = isKnuckle;
    this.powerBar.fadeAlpha = 1.0;

    const baseSpeed = 1 / 35; // 3 times faster than previous 1/105
    this.powerBar.fillSpeed = action === 'pass' ? baseSpeed * 1.25 : baseSpeed; // 25% faster for short passes
    this.updatePowerBarTiers();
  }

  /**
   * Dynamically updates the power bar color & tier based on level, Q-modifier, and E-modifier
   */
  public updatePowerBarTiers() {
    const p = this.powerBar.power;
    const isQ = this.powerBar.isSpecial;
    const isE = this.powerBar.isKnuckle;

    // Progression:
    // Normal: Light Green -> Green -> Yellow -> Orange (Maximum output) -> Red (Overpowered)
    // Q-Special: White -> Light Purple -> Purple -> Dark Purple (Maximum output) -> Purplish Black (Overpotency violent bend)
    // E-Chip: Pink -> Medium Pink -> Dark Pink -> Red (Max Output) -> Burgundy (Overcooked Chip)
    if (isE) {
      this.powerBar.isChipped = true;
      if (p < 0.25) {
        this.powerBar.tier = 1;
        this.powerBar.tierColor = '#f472b6'; // Pink
        this.powerBar.tierLabel = 'CHIP (DINK)';
      } else if (p < 0.55) {
        this.powerBar.tier = 2;
        this.powerBar.tierColor = '#ec4899'; // Medium Pink
        this.powerBar.tierLabel = 'DELICATE CHIP';
      } else if (p < 0.75) {
        this.powerBar.tier = 3;
        this.powerBar.tierColor = '#be185d'; // Dark Pink
        this.powerBar.tierLabel = 'CHIP (LIFT)';
      } else if (p < 0.90) {
        this.powerBar.tier = 4;
        this.powerBar.tierColor = '#ef4444'; // Red (Max Output)
        this.powerBar.tierLabel = 'MAX CHIP SCOOP';
      } else {
        this.powerBar.tier = 5;
        this.powerBar.tierColor = '#701a31'; // Burgundy (Overpower)
        this.powerBar.tierLabel = 'OVERCOOKED CHIP!';
      }
    } else if (isQ) {
      if (p < 0.25) {
        this.powerBar.tier = 1;
        this.powerBar.tierColor = '#ffffff';
        this.powerBar.tierLabel = 'Q-TOUCH';
      } else if (p < 0.55) {
        this.powerBar.tier = 2;
        this.powerBar.tierColor = '#d8b4fe';
        this.powerBar.tierLabel = 'Q-CURVE';
      } else if (p < 0.75) {
        this.powerBar.tier = 3;
        this.powerBar.tierColor = '#a855f7';
        this.powerBar.tierLabel = 'Q-SWERVE';
      } else if (p < 0.90) {
        this.powerBar.tier = 4;
        this.powerBar.tierColor = '#7e22ce';
        this.powerBar.tierLabel = 'MAX SPECIAL OUTPUT';
      } else {
        this.powerBar.tier = 5;
        this.powerBar.tierColor = '#2e1065';
        this.powerBar.tierLabel = 'VIOLENT OVERPOTENCY!';
      }
    } else {
      if (p < 0.25) {
        this.powerBar.tier = 1;
        this.powerBar.tierColor = '#86efac';
        this.powerBar.tierLabel = 'LOW POWER';
      } else if (p < 0.55) {
        this.powerBar.tier = 2;
        this.powerBar.tierColor = '#22c55e';
        this.powerBar.tierLabel = 'MEDIUM POWER';
      } else if (p < 0.75) {
        this.powerBar.tier = 3;
        this.powerBar.tierColor = '#facc15';
        this.powerBar.tierLabel = 'STRONG POWER';
      } else if (p < 0.90) {
        this.powerBar.tier = 4;
        this.powerBar.tierColor = '#f97316';
        this.powerBar.tierLabel = 'MAXIMUM OUTPUT';
      } else {
        this.powerBar.tier = 5;
        this.powerBar.tierColor = '#ef4444';
        this.powerBar.tierLabel = 'OVERPOWERED!';
      }
    }
  }

  /**
   * Evaluates shooting/passing accuracy based on:
   * 1. Standing vs Running: Standing has highest accuracy (1.0). Running/sprinting has natural momentum variance.
   * 2. Defender Physical Contact: If an opposing defender is touching the player (< 28 units), accuracy is lowered by 50%!
   */
  private evaluateKickAccuracy(player: Player, keys?: KeyState) {
    const isMoving = Math.hypot(player.vx, player.vy) > 0.35;
    const hasArrowInput = !!(keys && (keys.ArrowUp || keys.ArrowDown || keys.ArrowLeft || keys.ArrowRight));
    const isRunning = isMoving || hasArrowInput || player.action === 'running';
    const isStanding = !isRunning;
    const isSprinting = isRunning && !!(keys?.Shift || (player.dashTimer && player.dashTimer > 0));

    // Defender physical contact check (< 28 units = physical contact / body jostle / touching)
    let isDefenderTouching = false;
    let touchingDefender: Player | null = null;
    let minOppDist = Infinity;

    for (const opp of this.players) {
      if (opp.team !== player.team && opp.role !== 'GK' && opp.action !== 'fouled_falling') {
        const dist = Math.hypot(opp.x - player.x, opp.y - player.y);
        if (dist < 28 && dist < minOppDist) {
          minOppDist = dist;
          isDefenderTouching = true;
          touchingDefender = opp;
        }
      }
    }

    // Base accuracy: Standing is 1.0 (highest accuracy), Running is 0.82, Sprinting is 0.70
    let accuracy = isStanding ? 1.0 : (isSprinting ? 0.70 : 0.82);

    // "also if a defender is tocuhing us lower accuracy by 50%"
    if (isDefenderTouching) {
      accuracy *= 0.50; // Accuracy halved under defender physical contact!
    }

    // Error spread multiplier is inversely proportional to accuracy
    const errorSpreadMultiplier = 1.0 / accuracy;

    return {
      accuracy,
      isStanding,
      isRunning,
      isSprinting,
      isDefenderTouching,
      touchingDefender,
      errorSpreadMultiplier,
    };
  }

  /**
   * Executes the charged action immediately
   */
  public executeChargedAction(player: Player, keys: KeyState) {
    if (!this.powerBar.isActive || !this.powerBar.action) return;

    const action = this.powerBar.action;
    // Ensure minimal punchy kick on quick taps
    const power = Math.max(0.18, this.powerBar.power);
    const isSpecial = this.powerBar.isSpecial;
    const isKnuckle = this.powerBar.isKnuckle;

    this.powerBar.isActive = false;
    this.powerBar.fadeAlpha = 1.0;
    this.heldAction = null;

    if (action === 'pass') {
      this.executeShortPass(player, power, isSpecial, isKnuckle, keys);
    } else if (action === 'long_pass') {
      this.executeLongPass(player, power, isSpecial, isKnuckle, keys);
    } else if (action === 'shoot') {
      this.executeShot(player, power, isSpecial, isKnuckle, keys);
    } else if (action === 'cross') {
      this.executeCross(player, power, isSpecial, isKnuckle, keys);
    }
  }

  /**
   * Updates current charging action modifier (Q special curve or E knuckle) on the fly
   * when sliding buttons downward (Q) or upward (E) on touch controls.
   */
  public setActionModifier(modifier: 'normal' | 'Q' | 'E') {
    if (this.powerBar.isActive) {
      if (modifier === 'Q') {
        this.powerBar.isSpecial = true;
        this.powerBar.isKnuckle = false;
        this.updatePowerBarTiers();
      } else if (modifier === 'E') {
        this.powerBar.isKnuckle = true;
        this.powerBar.isSpecial = false;
        this.updatePowerBarTiers();
      } else {
        this.powerBar.isSpecial = false;
        this.powerBar.isKnuckle = false;
        this.updatePowerBarTiers();
      }
    }
  }

  /**
   * Called the exact millisecond user presses an action button or key down (Pass, Shoot, Cross, Long Pass)
   * Supports modifier: 'Q' (downward slide) or 'E' (upward slide)
   */
  public triggerActionPress(action: PowerActionType, keys?: KeyState, modifier?: 'normal' | 'Q' | 'E') {
    const player = this.getControlledPlayer();
    if (!player) return;

    // Set piece action press handling
    if (this.setPiece && this.setPiece.team === player.team) {
      if (this.setPiece.type === 'penalty' && action !== 'shoot') {
        this.setBanner(t('penaltyShootOnly'), 60);
        return;
      }
      const k = keys || (this as any)._lastKeys || {};
      const wantsKnuckle = modifier === 'E' || (modifier !== 'Q' && !!k.KeyE);
      const wantsSpecial = modifier === 'Q' || (modifier !== 'E' && !!k.KeyQ);
      this.startChargingPower(action, wantsSpecial, wantsKnuckle);
      return;
    }

    const distToBall = Math.hypot(this.ball.x - player.x, this.ball.y - player.y);
    const hasBall = this.ball.ownerId === player.id || (!this.ball.ownerId && distToBall < 26 && this.ball.z < 8);

    if (hasBall) {
      this.heldAction = action;
      const k = keys || (this as any)._lastKeys || {};
      const wantsKnuckle = modifier === 'E' || (modifier !== 'Q' && !!k.KeyE && !player.isLongThrowCharging);
      const wantsSpecial = modifier === 'Q' || (modifier !== 'E' && !!k.KeyQ && !player.isShielding);
      this.startChargingPower(action, wantsSpecial, wantsKnuckle);
    } else {
      // During active dead-ball set pieces, goal celebrations, or match stoppages, disable defensive tackles and fouls
      if (
        this.setPiece !== null ||
        this.matchPhase === 'goal_celebration' ||
        this.matchPhase === 'goal_scored' ||
        this.matchPhase === 'half_time' ||
        this.matchPhase === 'full_time' ||
        this.matchPhase === 'foul_stoppage'
      ) {
        return;
      }

      // Goalkeeper Specialized Without-Ball Mechanics:
      if (player.role === 'GK') {
        const k = keys || (this as any)._lastKeys || {};
        const angle = player.facingAngle;
        const dirX = Math.cos(angle);
        const dirY = Math.sin(angle);

        if (modifier === 'Q' || k.KeyQ) {
          // Q Ball Shield Button -> High Aerial Catch Leap (Useful for crosses & corners)
          player.action = 'gk_high_catch';
          player.actionTimer = 40;
          player.aerialJumpZ = 28;
          player.jumpHeight = 28;
          this.setBanner('AERIAL CATCH LEAP! [Q]', 50);
          audio.playKick(0.3);
          return;
        } else if (modifier === 'E' || k.KeyE) {
          // E Special Key -> Jump and Punch Ball Away (Safe vs high power / violent curl)
          player.action = 'gk_punch';
          player.actionTimer = 35;
          player.aerialJumpZ = 24;
          player.jumpHeight = 24;
          this.setBanner('TWO-FIST PUNCH CLEAR! [E]', 50);
          audio.playKick(0.5);
          return;
        }

        if (action === 'pass') {
          // S (Short Pass Button) -> Rush out at full sprint towards the ball
          const dx = this.ball.x - player.x;
          const dy = this.ball.y - player.y;
          const dist = Math.hypot(dx, dy) || 1;
          const rushSpeed = PHYSICS.RUN_SPEED * 1.45;
          player.action = 'running';
          player.vx = (dx / dist) * rushSpeed;
          player.vy = (dy / dist) * rushSpeed;
          player.facingAngle = Math.atan2(dy, dx);
          this.setBanner('GOALKEEPER RUSH OUT! [S]', 45);
          return;
        } else if (action === 'long_pass') {
          // W (Long Pass Button) -> 1v1 Star Spread to block close-range ground shots
          player.action = 'gk_star_spread';
          player.actionTimer = 35;
          player.vx = 0;
          player.vy = 0;
          this.setBanner('1v1 STAR SPREAD BLOCK! [W]', 50);
          audio.playKick(0.3);
          return;
        } else if (action === 'cross') {
          // D (Cross Button) -> High dive aiming at top corners with exchanged hands for extra reach
          player.action = 'gk_fingertip_parry';
          player.actionTimer = 40;
          player.aerialJumpZ = 22;
          player.jumpHeight = 22;
          player.diveX = dirX * 5.8;
          player.diveY = dirY * 5.8;
          player.vx = player.diveX;
          player.vy = player.diveY;
          this.setBanner('HIGH FINGERTIP PARRY LEAP! [D]', 50);
          audio.playKick(0.4);
          return;
        } else if (action === 'shoot') {
          // A (Shoot Button) -> Low dive aiming at the bottom corners
          player.action = 'gk_low_smother';
          player.actionTimer = 38;
          player.diveX = dirX * 6.2;
          player.diveY = dirY * 6.2;
          player.vx = player.diveX;
          player.vy = player.diveY;
          this.setBanner('LOW CORNER SMOTHER DIVE! [A]', 50);
          audio.playKick(0.4);
          return;
        }
      }

      // Outfield player actions without ball:
      // Q slide triggers Shoulder Hit; E slide triggers Shirt Pull
      if (modifier === 'Q') {
        executeShoulderHit(player, this.ball, this.players, this.referee, this.awardFoul.bind(this), this.setBanner.bind(this));
        return;
      } else if (modifier === 'E') {
        executeShirtPull(player, this.players, this.referee, this.awardFoul.bind(this), this.setBanner.bind(this));
        return;
      }

      if (action === 'pass') {
        // S (Short Pass button on defense) -> Standing Tackle / Intercept
        this.executeStandingTackle(player);
      } else if (action === 'shoot') {
        // A (Shoot button on defense) -> Clearance / Rustic Volley Clearance
        if (this.ball.isAirborne && this.ball.z >= 3.5 && distToBall < 35) {
          executeRusticVolleyClearance(player, this.ball, this.setBanner.bind(this));
        } else {
          this.executeClearance(player);
        }
      } else if (action === 'cross') {
        // D (Cross button on defense) -> Sliding Tackle / Block
        this.executeSlidingTackle(player);
      } else if (action === 'long_pass') {
        // W (Long Pass button on defense) -> Push Foul / Hard Physical Challenge
        this.executePushFoul(player);
      }
    }
  }

  /**
   * Called the exact millisecond user releases an action button or key up (P, S, C, L)
   * The player executes the pass/shoot/cross/long pass animation the exact millisecond of release.
   */
  public triggerActionRelease(action: PowerActionType, keys?: KeyState, modifier?: 'normal' | 'Q' | 'E') {
    const player = this.getControlledPlayer();
    if (!player) return;

    this.heldAction = null;

    // If 100% full-charge auto fire already resolved the kick on hold threshold, prevent release double-kick
    if (this.wasFullChargeFired) {
      this.wasFullChargeFired = false;
      return;
    }

    const k = keys || (this as any)._lastKeys || {};
    if (modifier === 'Q') {
      this.powerBar.isSpecial = true;
      this.powerBar.isKnuckle = false;
      this.updatePowerBarTiers();
    } else if (modifier === 'E') {
      this.powerBar.isKnuckle = true;
      this.powerBar.isSpecial = false;
      this.updatePowerBarTiers();
    }

    // Set piece action release handling
    if (this.setPiece && this.setPiece.team === player.team) {
      const sp = this.setPiece;
      const power = this.powerBar.isActive ? this.powerBar.power : 0.45;
      if (sp.isPenalty) {
        executePenaltyShot(this, player, sp.aimAngle, power);
      } else {
        executeSetPieceDelivery(this, player, sp.aimAngle, action, power);
      }
      this.powerBar.isActive = false;
      this.powerBar.fadeAlpha = 1.0;
      return;
    }

    if (this.powerBar.isActive) {
      const act = this.powerBar.action || action;
      this.powerBar.action = act;
      this.executeChargedAction(player, k as KeyState);
    }
  }

  public triggerSlotActionPress(slotId: number, action: PowerActionType, keys?: KeyState) {
    if (slotId === 1) {
      this.triggerActionPress(action, keys);
      return;
    }
    const slot = this.playerSlots.find(s => s.id === slotId);
    if (!slot || slot.side === 'spectator') return;

    const playerId = this.slotControlledPlayerIds[slot.id];
    const player = this.players.find(p => p.id === playerId);
    if (!player) return;

    const distToBall = Math.hypot(this.ball.x - player.x, this.ball.y - player.y);
    const hasBall = this.ball.ownerId === player.id || (!this.ball.ownerId && distToBall < 26 && this.ball.z < 8);

    if (hasBall) {
      if (action === 'pass') this.executeShortPass(player, 0.55, false, false, keys);
      else if (action === 'long_pass') this.executeLongPass(player, 0.65, false, false, keys);
      else if (action === 'shoot') this.executeShot(player, 0.75, false, false, keys);
      else if (action === 'cross') this.executeCross(player, 0.65, false, false, keys);
    } else {
      if (action === 'pass') this.executeStandingTackle(player);
      else if (action === 'cross') this.executeSlidingTackle(player);
      else if (action === 'shoot') this.executeClearance(player);
      else if (action === 'long_pass') this.executePushFoul(player);
    }
  }

  public triggerSlotActionRelease(slotId: number, action: PowerActionType, keys?: KeyState) {
    if (slotId === 1) {
      this.triggerActionRelease(action, keys);
    }
  }

  constructor() {
    this.initSquads();
    this.resetToKickoff('away', true, true);
  }

  /**
   * Initializes both 11-player squads
   */
  public initSquads() {
    this.players = [];

    // HOME TEAM (User controlled by default, attacks UP)
    const homeRoles = Object.keys(HOME_FORMATION_BASE) as PlayerRole[];
    for (const role of homeRoles) {
      const info = HOME_FORMATION_BASE[role];
      const canonical = HOME_PLAYER_CANONICAL_STATS[role];
      const isGK = role === 'GK';
      const sta = ('sta' in canonical) ? canonical.sta : 85;
      const initialMax = calculateInitialMaxStamina(sta);
      const buffer = createStatsBuffer(!isGK ? canonical as any : undefined, isGK ? canonical as any : undefined);

      const player: Player = {
        id: `home_${role}`,
        name: info.name,
        number: info.number,
        team: 'home',
        role: role,
        x: PITCH_CONFIG.PITCH_LEFT + info.x * PITCH_CONFIG.FIELD_WIDTH,
        y: PITCH_CONFIG.PITCH_TOP + info.y * PITCH_CONFIG.FIELD_HEIGHT,
        vx: 0,
        vy: 0,
        targetX: 0,
        targetY: 0,
        baseX: info.x,
        baseY: info.y,
        facingAngle: -Math.PI / 2, // Facing UP
        facingDir: 'up',
        stats: { ...info.stats },
        canonicalStats: canonical,
        statsBuffer: buffer,
        appearance: { ...info.appearance },
        scale: info.scale || 1.0,
        action: 'idle',
        actionTimer: 0,
        stamina: initialMax,
        staminaMax: initialMax,
        staminaInitialMax: initialMax,
        hasYellowCard: false,
        isRedCarded: false,
        animFrame: 0,
        animTimer: 0,
        isUserControlled: false,
        slideVelocityX: 0,
        slideVelocityY: 0,
        diveX: 0,
        diveY: 0,
      };
      // Phase 7: Canonical 3-Tier Positional Hierarchy & Authentic Playstyle
      applyPositionalHierarchyToPlayer(player, this.homeFormation);
      this.players.push(player);
    }

    // AWAY TEAM (AI opponent, attacks DOWN)
    const awayRoles = Object.keys(AWAY_FORMATION_BASE) as PlayerRole[];
    for (const role of awayRoles) {
      const info = AWAY_FORMATION_BASE[role];
      const canonical = AWAY_PLAYER_CANONICAL_STATS[role];
      const isGK = role === 'GK';
      const sta = ('sta' in canonical) ? canonical.sta : 85;
      const initialMax = calculateInitialMaxStamina(sta);
      const buffer = createStatsBuffer(!isGK ? canonical as any : undefined, isGK ? canonical as any : undefined);

      const player: Player = {
        id: `away_${role}`,
        name: info.name,
        number: info.number,
        team: 'away',
        role: role,
        x: PITCH_CONFIG.PITCH_LEFT + info.x * PITCH_CONFIG.FIELD_WIDTH,
        y: PITCH_CONFIG.PITCH_TOP + info.y * PITCH_CONFIG.FIELD_HEIGHT,
        vx: 0,
        vy: 0,
        targetX: 0,
        targetY: 0,
        baseX: info.x,
        baseY: info.y,
        facingAngle: Math.PI / 2, // Facing DOWN
        facingDir: 'down',
        stats: { ...info.stats },
        canonicalStats: canonical,
        statsBuffer: buffer,
        appearance: { ...info.appearance },
        scale: info.scale || 1.0,
        action: 'idle',
        actionTimer: 0,
        stamina: initialMax,
        staminaMax: initialMax,
        staminaInitialMax: initialMax,
        hasYellowCard: false,
        isRedCarded: false,
        animFrame: 0,
        animTimer: 0,
        isUserControlled: false,
        slideVelocityX: 0,
        slideVelocityY: 0,
        diveX: 0,
        diveY: 0,
      };
      // Phase 7: Canonical 3-Tier Positional Hierarchy & Authentic Playstyle
      applyPositionalHierarchyToPlayer(player, this.awayFormation);
      this.players.push(player);
    }

    // Set initial user-controlled player (Home ST1 - Maradona)
    this.userControlledPlayerId = 'home_ST1';
    const userPlayer = this.players.find(p => p.id === this.userControlledPlayerId);
    if (userPlayer) userPlayer.isUserControlled = true;

    // Phase 10: Initialize all players at 6.0 baseline
    this.playerRatings.initPlayers(this.players);
  }

  /**
   * Phase 7: Sets player characteristic playstyle dynamically
   */
  public setPlayerPlaystyle(playerId: string, playstyle: PlayerPlaystyle) {
    const p = this.players.find(pl => pl.id === playerId);
    if (p) {
      applyPositionalHierarchyToPlayer(p, p.team === 'home' ? this.homeFormation : this.awayFormation, playstyle);
      this.setBanner(`${p.name.toUpperCase()} PLAYSTYLE: ${p.playstyleName?.toUpperCase()}`, 75);
    }
  }

  /**
   * Applies pre-match setup configuration (half duration, formations, playstyles, rival difficulty, match stakes)
   */
  public applyPreMatchConfig(config: PreMatchConfig) {
    this.halfDurationMinutes = config.halfDurationMinutes;
    this.homeFormation = config.homeFormation;
    this.awayFormation = config.awayFormation;
    this.homePlaystyle = config.homePlaystyle;
    this.awayPlaystyle = config.awayPlaystyle;
    this.homeTactics = config.homeTactics || getDefaultTactics(config.homePlaystyle);
    this.awayTactics = config.awayTactics || getDefaultTactics(config.awayPlaystyle);
    this.difficulty = config.difficulty;
    if (config.matchStakeTier) this.matchStakeTier = config.matchStakeTier;
    if (config.stadiumTier) this.stadiumTier = config.stadiumTier;
    if (config.timeOfDay) this.timeOfDay = config.timeOfDay;
    if (config.seatColor) this.seatColor = config.seatColor;
    if (config.turfQuality) this.setTurfQuality(config.turfQuality);
    if (config.grassLength) this.setGrassLength(config.grassLength);
    if (config.mowingPattern) this.setMowingPattern(config.mowingPattern);
    if (config.surfaceStatus) this.setSurfaceStatus(config.surfaceStatus);
    if (config.weather) this.setWeather(config.weather);
    if (config.season) this.setSeason(config.season);
    if (config.netTension) this.setNetTension(config.netTension);
    if (config.goalFrame) this.setGoalFrame(config.goalFrame);
    if (config.pitchPreset) this.setPitchDimensions(config.pitchPreset, config.pitchLengthMeters, config.pitchWidthMeters);

    // Phase 13: Multi-Tier Team Database & Selection
    if (config.homeTeamId) {
      const team = getTeamById(config.homeTeamId);
      applyTeamToEngine(this, 'home', team);
    }
    if (config.awayTeamId) {
      const team = getTeamById(config.awayTeamId);
      applyTeamToEngine(this, 'away', team);
    }

    // Phase 14: PES6 Modular Uniform Matrix
    if (config.customHomeKit) {
      this.homeKit = { ...config.customHomeKit };
    }
    if (config.customAwayKit) {
      this.awayKit = { ...config.customAwayKit };
    }

    applyFormationToPlayers(
      this.players,
      'home',
      this.homeFormation,
      PITCH_CONFIG.FIELD_WIDTH,
      PITCH_CONFIG.FIELD_HEIGHT,
      PITCH_CONFIG.PITCH_LEFT,
      PITCH_CONFIG.PITCH_TOP
    );

    applyFormationToPlayers(
      this.players,
      'away',
      this.awayFormation,
      PITCH_CONFIG.FIELD_WIDTH,
      PITCH_CONFIG.FIELD_HEIGHT,
      PITCH_CONFIG.PITCH_LEFT,
      PITCH_CONFIG.PITCH_TOP
    );

    if (config.cursorSwitchMode) {
      this.cursorSwitchMode = config.cursorSwitchMode;
    }
    if (config.controlScope === 'single_player' && config.lockedPlayerId) {
      this.setControlMode('one_player');
      this.setLockedPlayer(config.lockedPlayerId);
    } else if (config.controlScope === 'all_team') {
      this.setControlMode('full_team');
      this.lockedPlayerId = null;
    }

    this.currentHalf = 1;
    this.currentPeriod = '1st_half';
    this.homeAttacksUp = true;
    this.firstHalfSubsInjuries = 0;
    this.secondHalfSubsInjuries = 0;
    this.firstHalfStoppageMinutes = 1;
    this.secondHalfStoppageMinutes = 2;
    this.deathSetPieceDecision = null;
    this.resetMatchStats();

    // Kickoff is awarded to the team with human control, or Home by default
    const firstKickoffTeam: TeamSide =
      this.playerSlots.find(s => s.side === 'away') && !this.playerSlots.find(s => s.side === 'home')
        ? 'away'
        : 'home';
    this.resetToKickoff(firstKickoffTeam, true, true);
    this.startPreMatchSwoop();
    this.setBanner(`MATCH STARTED! ${firstKickoffTeam.toUpperCase()} TEAM KICK OFF (${config.halfDurationMinutes} MIN HALVES)`, 140);
  }

  /**
   * Applies tactical adjustments mid-match without resetting score or match time
   */
  public applyTacticsMidMatch(config: Partial<PreMatchConfig>) {
    if (config.homeFormation && config.homeFormation !== this.homeFormation) {
      this.homeFormation = config.homeFormation;
      applyFormationToPlayers(
        this.players,
        'home',
        this.homeFormation,
        PITCH_CONFIG.FIELD_WIDTH,
        PITCH_CONFIG.FIELD_HEIGHT,
        PITCH_CONFIG.PITCH_LEFT,
        PITCH_CONFIG.PITCH_TOP
      );
    }
    if (config.awayFormation && config.awayFormation !== this.awayFormation) {
      this.awayFormation = config.awayFormation;
      applyFormationToPlayers(
        this.players,
        'away',
        this.awayFormation,
        PITCH_CONFIG.FIELD_WIDTH,
        PITCH_CONFIG.FIELD_HEIGHT,
        PITCH_CONFIG.PITCH_LEFT,
        PITCH_CONFIG.PITCH_TOP
      );
    }
    if (config.homePlaystyle) this.homePlaystyle = config.homePlaystyle;
    if (config.awayPlaystyle) this.awayPlaystyle = config.awayPlaystyle;
    if (config.homeTactics) this.homeTactics = config.homeTactics;
    if (config.awayTactics) this.awayTactics = config.awayTactics;
    if (config.difficulty) this.difficulty = config.difficulty;
    if (config.stadiumTier) this.stadiumTier = config.stadiumTier;
    if (config.timeOfDay) this.timeOfDay = config.timeOfDay;
    if (config.seatColor) this.seatColor = config.seatColor;
    if (config.turfQuality) this.setTurfQuality(config.turfQuality);
    if (config.grassLength) this.setGrassLength(config.grassLength);
    if (config.weather) this.setWeather(config.weather);
    if (config.season) this.setSeason(config.season);
    if (config.netTension) this.setNetTension(config.netTension);
    if (config.goalFrame) this.setGoalFrame(config.goalFrame);
    if (config.pitchPreset) this.setPitchDimensions(config.pitchPreset, config.pitchLengthMeters, config.pitchWidthMeters);

    const homeStyleName = this.homePlaystyle === 'custom' ? 'CUSTOM' : this.homePlaystyle.toUpperCase();
    const awayStyleName = this.awayPlaystyle === 'custom' ? 'CUSTOM' : this.awayPlaystyle.toUpperCase();
    this.setBanner(`TACTICS UPDATED LIVE: ${homeStyleName} vs ${awayStyleName}`, 110);
  }

  /**
   * Spacebar / Q Button on defense:
   * Switches control to player closest to ball in Full Team mode,
   * OR toggles the real-time Tactical Position Guide on/off in 1-Player mode.
   * Phase 4.5.4: 3-Meter Proximity Protection & Double-Tap Override
   */
  public switchControlToClosestDefender(slotId: number = 1, forceBypassProximity: boolean = false): Player | null {
    if (this.controlMode === 'one_player' && slotId === 1) {
      return this.toggleTacticalPositionGuide();
    }

    const slot = this.playerSlots.find(s => s.id === slotId) || this.playerSlots[0];
    if (!slot || slot.side === 'spectator') return null;
    const targetTeam: TeamSide = slot.side;

    const now = performance.now();
    const lastTime = this.lastSwitchPressTime[slotId] || 0;
    const timeDelta = now - lastTime;
    this.lastSwitchPressTime[slotId] = now;
    // Phase 4.5.4: Double-Tap Player Switch Override within 300 ms window
    const isDoubleTap = forceBypassProximity || (lastTime > 0 && timeDelta > 10 && timeDelta <= 300);

    const currentId = this.slotControlledPlayerIds[slotId] || (slotId === 1 ? this.userControlledPlayerId : '');
    const currentControlled = this.players.find(p => p.id === currentId);

    const otherControlledIds = Object.entries(this.slotControlledPlayerIds)
      .filter(([sId]) => Number(sId) !== slotId)
      .map(([, pId]) => pId);

    const candidates = this.players.filter(
      p => p.team === targetTeam && p.role !== 'GK' && !p.isRedCarded && !otherControlledIds.includes(p.id)
    );

    // Sort candidates by distance to ball
    candidates.sort((a, b) => {
      const da = Math.hypot(this.ball.x - a.x, this.ball.y - a.y);
      const db = Math.hypot(this.ball.x - b.x, this.ball.y - b.y);
      return da - db;
    });

    let chosen: Player | null = null;

    for (const cand of candidates) {
      if (cand.id === currentId) continue;

      if (currentControlled && !isDoubleTap) {
        // Phase 4.5.4: 3-Meter Proximity Guard (< 3m / ~71 px)
        const distToCurrent = Math.hypot(cand.x - currentControlled.x, cand.y - currentControlled.y);
        if (distToCurrent < 71) {
          continue; // Suppress switch between adjacent cluster defenders
        }
      }

      chosen = cand;
      break;
    }

    // Double-tap override allows micro-switch to adjacent cluster teammate
    if (!chosen && isDoubleTap && candidates.length > 0) {
      chosen = candidates.find(p => p.id !== currentId) || null;
    }

    const isAlreadyOnClosest = (!chosen || chosen.id === currentId) && candidates.length > 0 && candidates[0].id === currentId;

    if (isAlreadyOnClosest) {
      // If user triggers defense switch while already on closest outfield defender, cycle to Goalkeeper!
      const gk = this.players.find(p => p.team === targetTeam && p.role === 'GK' && !p.isRedCarded);
      if (gk && currentId !== gk.id) {
        this.slotControlledPlayerIds[slotId] = gk.id;
        if (slotId === 1) this.userControlledPlayerId = gk.id;
        this.updateUserControlledFlag();
        this.setBanner(`🎮 CONTROL: GOALKEEPER (${gk.name.toUpperCase()} #${gk.number})`, 50);
        audio.playKick(0.4);
        return gk;
      }
    }

    if (chosen) {
      this.slotControlledPlayerIds[slotId] = chosen.id;
      if (slotId === 1) {
        this.userControlledPlayerId = chosen.id;
      }
      this.updateUserControlledFlag();
      const overrideBanner = isDoubleTap ? ' ⚡ [3M OVERRIDE]' : '';
      this.setBanner(`DEFENSE (${slot.name}): SWITCHED TO ${chosen.name.toUpperCase()} (#${chosen.number})${overrideBanner}`, 45);
      audio.playKick(0.35);
      return chosen;
    }

    return currentControlled || null;
  }

  /**
   * Directly switches control to the team's Goalkeeper (Phase 3.1)
   */
  public switchControlToGoalkeeper(slotId: number = 1): Player | null {
    const slot = this.playerSlots.find(s => s.id === slotId) || this.playerSlots[0];
    if (!slot || slot.side === 'spectator') return null;
    const targetTeam: TeamSide = slot.side;
    const gk = this.players.find(p => p.team === targetTeam && p.role === 'GK' && !p.isRedCarded);
    if (!gk) return null;

    const currentId = this.slotControlledPlayerIds[slotId] || (slotId === 1 ? this.userControlledPlayerId : '');
    if (currentId === gk.id) {
      // Toggle back to closest outfield defender
      return this.switchControlToClosestDefender(slotId);
    }

    this.slotControlledPlayerIds[slotId] = gk.id;
    if (slotId === 1) {
      this.userControlledPlayerId = gk.id;
    }
    this.updateUserControlledFlag();
    this.setBanner(`🎮 CONTROL: GOALKEEPER (${gk.name.toUpperCase()} #${gk.number}) [32-BIT GK MODE]`, 55);
    audio.playKick(0.4);
    return gk;
  }

  /**
   * 1-Player Control Mode: Toggle Tactical Position Guide
   * Shows semi-transparent lighting line with an arrow updating to the best position.
   * Pressing again disables it.
   */
  public toggleTacticalPositionGuide(): Player | null {
    const cp = this.getControlledPlayer();
    if (!cp) return null;

    this.tacticalGuideEnabled = !this.tacticalGuideEnabled;
    if (this.tacticalGuideEnabled) {
      const bestPos = getOptimalTacticalPosition(
        cp,
        this.players,
        this.ball,
        true, // Home attacks up
        this.homePlaystyle,
        this.homeTactics
      );
      this.autoPositionTarget = bestPos;
      this.setBanner(`POSITION GUIDE: ON (LIGHTING LINE & ARROW ACTIVE)`, 70);
      audio.playKick(0.4);
    } else {
      this.autoPositionTarget = null;
      this.setBanner(`POSITION GUIDE: DISABLED`, 50);
      audio.playKick(0.25);
    }
    return cp;
  }

  /**
   * Section 1.2 Context-Aware Intelligent Referee Whistle Engine
   * Non-Dangerous Ending Logic:
   * - Does NOT blow whistle while attacking team is in active danger or threatening box.
   * - Penalties must always be taken.
   * - Corners & dangerous free kicks at the death: 70% permitted, 30% whistle blown.
   */
  public canBlowWhistle(): boolean {
    if (this.matchPhase === 'goal_celebration' || this.matchPhase === 'goal_scored') {
      return false;
    }

    // Penalty Kick awarded: must always be resolved!
    if (this.matchPhase === 'penalty' || this.setPiece?.type === 'penalty') {
      return false;
    }

    // Set-Pieces at the Death (Corner Kicks: 70% permitted, 30% blown before taken)
    if (this.matchPhase === 'corner_kick' || this.setPiece?.type === 'corner_kick') {
      if (this.deathSetPieceDecision === null) {
        this.deathSetPieceDecision = Math.random() < 0.70 ? 'allow' : 'blow';
      }
      return this.deathSetPieceDecision !== 'allow';
    }

    // Free Kicks at the Death: same 70/30 rule if in threatening attacking distance
    if (this.matchPhase === 'free_kick' || this.setPiece?.type === 'free_kick') {
      const sp = this.setPiece;
      const isAttackingUp = sp ? (sp.team === 'home' ? this.homeAttacksUp : !this.homeAttacksUp) : true;
      const targetGoalY = isAttackingUp ? PITCH_CONFIG.PITCH_TOP : PITCH_CONFIG.PITCH_BOTTOM;
      const distToGoal = sp ? Math.abs(sp.spotY - targetGoalY) : 999;
      if (distToGoal < 560) {
        if (this.deathSetPieceDecision === null) {
          this.deathSetPieceDecision = Math.random() < 0.70 ? 'allow' : 'blow';
        }
        return this.deathSetPieceDecision !== 'allow';
      }
      return true;
    }

    if (this.matchPhase === 'throw_in' || this.matchPhase === 'goal_kick') {
      return true;
    }

    // In-play active attacking danger evaluation:
    if (this.matchPhase === 'in_play') {
      let attackingSide: TeamSide | null = null;
      if (this.ball.ownerId) {
        const owner = this.players.find(p => p.id === this.ball.ownerId);
        if (owner) attackingSide = owner.team;
      } else if (this.ball.lastTouchTeam) {
        attackingSide = this.ball.lastTouchTeam;
      }

      if (attackingSide) {
        const isAttackingUp = (attackingSide === 'home') === this.homeAttacksUp;
        const targetGoalY = isAttackingUp ? PITCH_CONFIG.PITCH_TOP : PITCH_CONFIG.PITCH_BOTTOM;
        const distToGoalLine = Math.abs(this.ball.y - targetGoalY);
        const distToCenter = Math.abs(this.ball.x - PITCH_CONFIG.CENTER_X);

        const isInsideOrThreateningBox = distToGoalLine < 440 && distToCenter < 390;
        const isShotHeadingToGoal = this.ball.isAirborne && Math.hypot(this.ball.vx, this.ball.vy) > 1.8 &&
          (isAttackingUp ? this.ball.vy < -0.4 : this.ball.vy > 0.4);

        if (isInsideOrThreateningBox || isShotHeadingToGoal) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Evaluates whether regulation or extra time for the current period has elapsed.
   */
  public isPeriodOver(): boolean {
    if (this.currentHalf === 1 && this.currentPeriod === '1st_half') {
      return this.matchTimeSeconds >= (45 + this.firstHalfStoppageMinutes) * 60;
    }
    if (this.currentHalf === 2 && this.currentPeriod === '2nd_half') {
      return this.matchTimeSeconds >= (90 + this.secondHalfStoppageMinutes) * 60;
    }
    if (this.currentPeriod === 'extra_time_1') {
      return this.matchTimeSeconds >= 106 * 60;
    }
    if (this.currentPeriod === 'extra_time_2') {
      return this.matchTimeSeconds >= 121 * 60;
    }
    return false;
  }

  /**
   * Section 1.2 Whistle AI Execution:
   * Checks if the period has expired and the pitch state is non-dangerous,
   * blowing the half-time, full-time, or extra-time whistle.
   */
  public checkPeriodEndWhistle(): boolean {
    if (!this.isPeriodOver()) return false;
    if (!this.canBlowWhistle()) return false;

    if (this.currentHalf === 1 && this.currentPeriod === '1st_half') {
      this.triggerHalfTime();
      return true;
    }
    if (this.currentHalf === 2 && this.currentPeriod === '2nd_half') {
      this.triggerFullTime();
      return true;
    }
    if (this.currentPeriod === 'extra_time_1') {
      this.triggerExtraTimeHalf();
      return true;
    }
    if (this.currentPeriod === 'extra_time_2') {
      this.triggerFullTime();
      return true;
    }
    return false;
  }

  public triggerHalfTime() {
    this.matchPhase = 'half_time';
    this.isPaused = true;
    this.deathSetPieceDecision = null;
    audio.playWhistle(true);
    const newWeather = evaluateHalfTimeWeatherTransition(this.weather, this.season);
    if (newWeather !== this.weather) {
      this.setWeather(newWeather);
    }
    this.setBanner('HALF TIME! START 2ND HALF [TEAMS SWITCH ENDS]', 300);
  }

  public startSecondHalf() {
    this.currentHalf = 2;
    this.currentPeriod = '2nd_half';
    this.homeAttacksUp = false; // Teams switch ends in 2nd half!
    this.matchTimeSeconds = 45 * 60;
    this.deathSetPieceDecision = null;

    applyFormationToPlayers(
      this.players,
      'home',
      this.homeFormation,
      PITCH_CONFIG.FIELD_WIDTH,
      PITCH_CONFIG.FIELD_HEIGHT,
      PITCH_CONFIG.PITCH_LEFT,
      PITCH_CONFIG.PITCH_TOP,
      false
    );
    applyFormationToPlayers(
      this.players,
      'away',
      this.awayFormation,
      PITCH_CONFIG.FIELD_WIDTH,
      PITCH_CONFIG.FIELD_HEIGHT,
      PITCH_CONFIG.PITCH_LEFT,
      PITCH_CONFIG.PITCH_TOP,
      true
    );

    // 2nd Half Kickoff: Executed by Home team
    this.resetToKickoff('home', false, false);
    this.isPaused = false;
    audio.playWhistle(true);
    this.setBanner(`2ND HALF KICK OFF! ${this.homeTeam.name.toUpperCase()} RESTART`, 200);
  }

  public triggerFullTime() {
    this.matchPhase = 'full_time';
    this.isPaused = true;
    this.deathSetPieceDecision = null;
    audio.playWhistle(true);

    // Phase 10: Award clean-sheet bonuses to GKs and DEF if 0 goals conceded
    this.playerRatings.evaluateCleanSheetBonus('home', this.score.away);
    this.playerRatings.evaluateCleanSheetBonus('away', this.score.home);

    if (this.score.home === this.score.away) {
      this.setBanner('FULL TIME! MATCH TIED [EXTRA TIME OR PENALTIES]', 360);
    } else {
      const winner = this.score.home > this.score.away ? this.homeTeam.name : this.awayTeam.name;
      this.setBanner(`FULL TIME! ${winner.toUpperCase()} VICTORIOUS!`, 360);
    }
  }

  public startExtraTime() {
    this.currentPeriod = 'extra_time_1';
    this.matchTimeSeconds = 90 * 60;
    this.homeAttacksUp = true; // Switch ends back for ET1
    this.deathSetPieceDecision = null;

    applyFormationToPlayers(this.players, 'home', this.homeFormation, PITCH_CONFIG.FIELD_WIDTH, PITCH_CONFIG.FIELD_HEIGHT, PITCH_CONFIG.PITCH_LEFT, PITCH_CONFIG.PITCH_TOP, true);
    applyFormationToPlayers(this.players, 'away', this.awayFormation, PITCH_CONFIG.FIELD_WIDTH, PITCH_CONFIG.FIELD_HEIGHT, PITCH_CONFIG.PITCH_LEFT, PITCH_CONFIG.PITCH_TOP, false);

    this.resetToKickoff('away', false, false);
    this.isPaused = false;
    audio.playWhistle(true);
    this.setBanner('EXTRA TIME 1ST HALF (15 MIN)! AWAY KICK OFF', 220);
  }

  public triggerExtraTimeHalf() {
    this.matchPhase = 'extra_time_half';
    this.isPaused = true;
    this.deathSetPieceDecision = null;
    audio.playWhistle(true);
    this.setBanner('EXTRA TIME HALF TIME (105:00)! [SWITCH ENDS FOR ET2]', 300);
  }

  public startExtraTimeSecondHalf() {
    this.currentPeriod = 'extra_time_2';
    this.matchTimeSeconds = 105 * 60;
    this.homeAttacksUp = false; // Switch ends for ET2
    this.deathSetPieceDecision = null;

    applyFormationToPlayers(this.players, 'home', this.homeFormation, PITCH_CONFIG.FIELD_WIDTH, PITCH_CONFIG.FIELD_HEIGHT, PITCH_CONFIG.PITCH_LEFT, PITCH_CONFIG.PITCH_TOP, false);
    applyFormationToPlayers(this.players, 'away', this.awayFormation, PITCH_CONFIG.FIELD_WIDTH, PITCH_CONFIG.FIELD_HEIGHT, PITCH_CONFIG.PITCH_LEFT, PITCH_CONFIG.PITCH_TOP, true);

    this.resetToKickoff('home', false, false);
    this.isPaused = false;
    audio.playWhistle(true);
    this.setBanner('EXTRA TIME 2ND HALF (15 MIN)! HOME KICK OFF', 220);
  }

  public startPenaltyShootout() {
    this.currentPeriod = 'penalty_shootout';
    this.matchPhase = 'penalty_shootout';
    this.isPaused = false;
    this.deathSetPieceDecision = null;
    audio.playWhistle(true);
    this.setBanner('PENALTY SHOOTOUT COMMENCED!', 240);
    setupPenalty(this, 'home');
  }

  /**
   * Resets players to base kickoff positions and places ball at center circle.
   * Awarded to the team that conceded, or team starting the half.
   */
  public resetToKickoff(kickingTeam: TeamSide = 'home', isFirstKickoff: boolean = false, resetScore: boolean = false) {
    if (resetScore) {
      this.score = { home: 0, away: 0 };
      this.matchTimeSeconds = 0;
      this.currentHalf = 1;
    }

    const fieldW = PITCH_CONFIG.FIELD_WIDTH;
    const fieldH = PITCH_CONFIG.FIELD_HEIGHT;

    for (const p of this.players) {
      p.x = PITCH_CONFIG.PITCH_LEFT + p.baseX * fieldW;
      p.y = PITCH_CONFIG.PITCH_TOP + p.baseY * fieldH;
      p.vx = 0;
      p.vy = 0;
      p.action = 'idle';
      p.actionTimer = 0;
      p.animFrame = 0;
      p.facingDir = p.team === 'home' ? 'up' : 'down';
    }

    this.kickoffKickingTeam = kickingTeam;
    const isHomeKickoff = kickingTeam === 'home';
    const isKickingAttackingUp = (kickingTeam === 'home') === this.homeAttacksUp;
    const stY1 = isKickingAttackingUp ? PITCH_CONFIG.CENTER_Y + 12 : PITCH_CONFIG.CENTER_Y - 12;
    const stY2 = isKickingAttackingUp ? PITCH_CONFIG.CENTER_Y + 20 : PITCH_CONFIG.CENTER_Y - 20;

    const kickerPrefix = isHomeKickoff ? 'home' : 'away';
    const kickerSt1 = this.players.find(p => p.id === `${kickerPrefix}_ST1`) || this.players.find(p => p.team === kickingTeam && p.role !== 'GK');
    const kickerSt2 = this.players.find(p => p.id === `${kickerPrefix}_ST2`) || this.players.filter(p => p.team === kickingTeam && p.role !== 'GK')[1];

    if (kickerSt1) {
      kickerSt1.x = PITCH_CONFIG.CENTER_X - 10;
      kickerSt1.y = stY1;
      this.ball.ownerId = kickerSt1.id;
      this.ball.lastTouchTeam = kickingTeam;
      this.ball.lastTouchPlayerId = kickerSt1.id;
    }
    if (kickerSt2) {
      kickerSt2.x = PITCH_CONFIG.CENTER_X + 25;
      kickerSt2.y = stY2;
    }

    if (this.controlMode === 'one_player' && this.lockedPlayerId) {
      this.userControlledPlayerId = this.lockedPlayerId;
      const slot1 = this.playerSlots.find(s => s.id === 1);
      if (slot1) this.slotControlledPlayerIds[slot1.id] = this.lockedPlayerId;
    } else {
      this.syncSlotControlledPlayers();
      const kickingSlot = this.playerSlots.find(s => s.side === kickingTeam);
      if (kickingSlot && kickerSt1) {
        this.slotControlledPlayerIds[kickingSlot.id] = kickerSt1.id;
        if (kickingSlot.id === 1) {
          this.userControlledPlayerId = kickerSt1.id;
        }
      }
    }

    // Ensure ALL defending players strictly start in their own half and outside the center circle!
    const defendingTeam: TeamSide = isHomeKickoff ? 'away' : 'home';
    const isDefendingAttackingUp = (defendingTeam === 'home') === this.homeAttacksUp;
    for (const p of this.players) {
      if (p.team === defendingTeam) {
        // Enforce defending half
        if (!isDefendingAttackingUp && p.y > PITCH_CONFIG.CENTER_Y - 20) {
          p.y = PITCH_CONFIG.CENTER_Y - 25;
        } else if (isDefendingAttackingUp && p.y < PITCH_CONFIG.CENTER_Y + 20) {
          p.y = PITCH_CONFIG.CENTER_Y + 25;
        }
        // Enforce center circle distance (outside 180px radius)
        const dCenter = Math.hypot(p.x - PITCH_CONFIG.CENTER_X, p.y - PITCH_CONFIG.CENTER_Y);
        if (dCenter < PITCH_CONFIG.CENTER_CIRCLE_RADIUS + 18) {
          const angle = Math.atan2(p.y - PITCH_CONFIG.CENTER_Y, p.x - PITCH_CONFIG.CENTER_X);
          p.x = PITCH_CONFIG.CENTER_X + Math.cos(angle) * (PITCH_CONFIG.CENTER_CIRCLE_RADIUS + 25);
          p.y = PITCH_CONFIG.CENTER_Y + Math.sin(angle) * (PITCH_CONFIG.CENTER_CIRCLE_RADIUS + 25);
          if (!isDefendingAttackingUp && p.y > PITCH_CONFIG.CENTER_Y - 20) {
            p.y = PITCH_CONFIG.CENTER_Y - 25;
          } else if (isDefendingAttackingUp && p.y < PITCH_CONFIG.CENTER_Y + 20) {
            p.y = PITCH_CONFIG.CENTER_Y + 25;
          }
        }
      }
    }

    // Ball to center
    this.ball.x = PITCH_CONFIG.CENTER_X;
    this.ball.y = PITCH_CONFIG.CENTER_Y;
    this.ball.z = 0;
    this.ball.vx = 0;
    this.ball.vy = 0;
    this.ball.vz = 0;
    this.ball.spin = 0;
    this.ball.spinY = 0;
    this.ball.deformation = 0;
    this.ball.deformationAngle = 0;
    this.ball.trail = [];
    this.ball.isAirborne = false;

    // Referee near center circle
    this.referee.x = PITCH_CONFIG.CENTER_X + 70;
    this.referee.y = PITCH_CONFIG.CENTER_Y - 40;
    this.referee.whistleTimer = 30;
    this.referee.cardDisplay = null;
    this.referee.cardPlayerName = null;

    this.matchPhase = 'kickoff_ready';
    this.phaseTimer = 0;
    this.updateUserControlledFlag();
    this.cameraManager.resetToCenter();
    this.camera = this.cameraManager.state;

    if (isHomeKickoff) {
      this.bannerMessage = isFirstKickoff
        ? 'MATCH STARTED! PASS (S / W) TO ANY TEAMMATE TO KICK OFF'
        : 'KICK OFF: PASS (S / W) TO ANY TEAMMATE!';
      this.bannerTimer = 160;
      if (!isFirstKickoff) audio.playWhistle(true);
    } else {
      this.bannerMessage = `KICK OFF - ${AWAY_KIT.name.toUpperCase()} RESTART!`;
      this.bannerTimer = 150;
      if (!isFirstKickoff) audio.playWhistle(true);
    }
  }

  /**
   * Main game tick (60 FPS)
   */
  public update(keys: KeyState, slotKeys?: Record<number, KeyState>) {
    if (this.isPaused) return;

    this.frameCount++;

    // Phase 11: Real-time dynamic match atmosphere & crowd acoustics
    if (this.frameCount % 30 === 0) {
      const topGoalDist = Math.abs(this.ball.y - PITCH_CONFIG.PITCH_TOP);
      const bottomGoalDist = Math.abs(this.ball.y - PITCH_CONFIG.PITCH_BOTTOM);
      const minGoalDist = Math.min(topGoalDist, bottomGoalDist);
      const dangerLevel = Math.max(0, Math.min(1, 1 - minGoalDist / 600));
      const carrier = this.ball.ownerId ? this.players.find(p => p.id === this.ball.ownerId) : null;
      const homeHasBall = carrier ? carrier.team === 'home' : this.ball.lastTouchTeam === 'home';

      audio.updateAtmosphere({
        crowdLevel: this.crowdLevel,
        stadiumTier: this.stadiumTier,
        ballY: this.ball.y,
        ballZ: this.ball.z,
        homeHasBall,
        dangerLevel,
        scoreDelta: this.score.home - this.score.away,
        matchTimeSeconds: this.matchTimeSeconds,
        isPenalty: this.matchPhase === 'penalty' || this.matchPhase === 'penalty_shootout',
      });
    }

    // Strict single controlled player synchronization
    this.updateUserControlledFlag();

    // Universal invariant: if a player does not have the ball, they CANNOT use the shield under any circumstances
    for (let i = 0; i < this.players.length; i++) {
      const p = this.players[i];
      if (this.ball.ownerId !== p.id) {
        if (p.isShielding) {
          p.isShielding = false;
        }
        if (p.action === 'shielding') {
          p.action = 'idle';
        }
      }
    }

    const timeScale = this.getTimeScale();

    // Kickoff resolution: transition to in_play once the ball has actually been passed, kicked, or dribbled out of center circle!
    if (this.matchPhase === 'kickoff_ready') {
      const ballKickedAway = !this.ball.ownerId && Math.hypot(this.ball.vx, this.ball.vy) > 2.5;
      const dribbledOutOfCircle = Math.hypot(this.ball.x - PITCH_CONFIG.CENTER_X, this.ball.y - PITCH_CONFIG.CENTER_Y) > PITCH_CONFIG.CENTER_CIRCLE_RADIUS;
      if (ballKickedAway || dribbledOutOfCircle) {
        this.matchPhase = 'in_play';
      }
    }

    // Strict Kickoff Boundary Enforcement:
    // Strict Kickoff Boundary Enforcement:
    // The other team CANNOT pass the middle of the pitch OR enter the circle at the middle of the pitch until the ball has been passed!
    if (this.matchPhase === 'kickoff_ready') {
      const defendingTeam = this.kickoffKickingTeam === 'home' ? 'away' : 'home';
      const isDefendingAttackingUp = (defendingTeam === 'home') === this.homeAttacksUp;
      for (const p of this.players) {
        if (p.team === defendingTeam) {
          // 1. Defending team can't pass the middle of the pitch (halfway line)
          if (!isDefendingAttackingUp) {
            if (p.y > PITCH_CONFIG.CENTER_Y - 8) {
              p.y = PITCH_CONFIG.CENTER_Y - 8;
              if (p.vy > 0) p.vy = 0;
            }
          } else {
            if (p.y < PITCH_CONFIG.CENTER_Y + 8) {
              p.y = PITCH_CONFIG.CENTER_Y + 8;
              if (p.vy < 0) p.vy = 0;
            }
          }

          // 2. Defending team can't enter the circle at the middle of the pitch
          const dCenter = Math.hypot(p.x - PITCH_CONFIG.CENTER_X, p.y - PITCH_CONFIG.CENTER_Y);
          const minRadius = PITCH_CONFIG.CENTER_CIRCLE_RADIUS + 10;
          if (dCenter < minRadius) {
            const angle = Math.atan2(p.y - PITCH_CONFIG.CENTER_Y, p.x - PITCH_CONFIG.CENTER_X);
            p.x = PITCH_CONFIG.CENTER_X + Math.cos(angle) * minRadius;
            p.y = PITCH_CONFIG.CENTER_Y + Math.sin(angle) * minRadius;
            if (!isDefendingAttackingUp && p.y > PITCH_CONFIG.CENTER_Y - 8) {
              p.y = PITCH_CONFIG.CENTER_Y - 8;
            } else if (isDefendingAttackingUp && p.y < PITCH_CONFIG.CENTER_Y + 8) {
              p.y = PITCH_CONFIG.CENTER_Y + 8;
            }
            p.vx = 0;
            p.vy = 0;
          }
        }
      }
    }

    // Advance match clock scaled by half duration setting and game speed
    if (this.matchPhase === 'in_play') {
      if (this.ball.ownerId) {
        const owner = this.players.find(p => p.id === this.ball.ownerId);
        if (owner) {
          this.matchStats[owner.team].possessionFrames++;
          if (this.lastPossessionTeam && this.lastPossessionTeam !== owner.team) {
            this.possessionLostFrame[this.lastPossessionTeam] = this.frameCount;
          }
          this.lastPossessionTeam = owner.team;
        }
      } else if (this.lastPossessionTeam && (this.ball.isDividedBall || this.ball.lastTouchTeam !== this.lastPossessionTeam)) {
        if (this.frameCount - this.possessionLostFrame[this.lastPossessionTeam] > 300) {
          this.possessionLostFrame[this.lastPossessionTeam] = this.frameCount;
        }
      }

      const clockRate = (0.75 / this.halfDurationMinutes) * timeScale;
      this.matchTimeSeconds += clockRate;

      // Intelligent Non-Dangerous Whistle Engine check
      this.checkPeriodEndWhistle();
    } else if (this.isPeriodOver() && (this.matchPhase === 'throw_in' || this.matchPhase === 'goal_kick')) {
      // Dead ball boundary exit at period expiration: blow whistle immediately
      this.checkPeriodEndWhistle();
    }

    if (this.matchPhase === 'half_time' || this.matchPhase === 'extra_time_half' || this.matchPhase === 'full_time') {
      return;
    }

    if (this.bannerTimer > 0) {
      // Do not count down or expire set-piece prompt while user is actively aiming a set piece
      if (!this.setPiece) {
        this.bannerTimer = Math.max(0, this.bannerTimer - timeScale);
        if (this.bannerTimer === 0) this.bannerMessage = null;
      }
    }

    if (this.powerBar.fadeAlpha && this.powerBar.fadeAlpha > 0 && !this.powerBar.isActive) {
      this.powerBar.fadeAlpha = Math.max(0, this.powerBar.fadeAlpha - 0.05 * timeScale);
    }

    if (this.referee.whistleTimer > 0) {
      this.referee.whistleTimer = Math.max(0, this.referee.whistleTimer - timeScale);
    }
    if (this.goalNetShake > 0) this.goalNetShake *= Math.pow(0.92, timeScale);

    // Top goal net spring physics decay
    if (this.topGoalNet.bulgeAmount > 0.05 || this.topGoalNet.shake > 0.05) {
      this.topGoalNet.bulgeVel += (0 - this.topGoalNet.bulgeAmount) * 0.15 * timeScale;
      this.topGoalNet.bulgeVel *= Math.pow(0.82, timeScale);
      this.topGoalNet.bulgeAmount = Math.max(0, this.topGoalNet.bulgeAmount + this.topGoalNet.bulgeVel * timeScale);
      this.topGoalNet.shake *= Math.pow(0.92, timeScale);
      if (this.topGoalNet.shake < 0.1) this.topGoalNet.shake = 0;
    } else {
      this.topGoalNet.bulgeAmount = 0;
      this.topGoalNet.bulgeVel = 0;
      this.topGoalNet.shake = 0;
    }

    // Bottom goal net spring physics decay
    if (this.bottomGoalNet.bulgeAmount > 0.05 || this.bottomGoalNet.shake > 0.05) {
      this.bottomGoalNet.bulgeVel += (0 - this.bottomGoalNet.bulgeAmount) * 0.15 * timeScale;
      this.bottomGoalNet.bulgeVel *= Math.pow(0.82, timeScale);
      this.bottomGoalNet.bulgeAmount = Math.max(0, this.bottomGoalNet.bulgeAmount + this.bottomGoalNet.bulgeVel * timeScale);
      this.bottomGoalNet.shake *= Math.pow(0.92, timeScale);
      if (this.bottomGoalNet.shake < 0.1) this.bottomGoalNet.shake = 0;
    } else {
      this.bottomGoalNet.bulgeAmount = 0;
      this.bottomGoalNet.bulgeVel = 0;
      this.bottomGoalNet.shake = 0;
    }

    // Clear caught flag if ball is outside goalmouth
    if (this.ball.y > PITCH_CONFIG.PITCH_TOP + 10) {
      this.topGoalNet.ballCaught = false;
    }
    if (this.ball.y < PITCH_CONFIG.PITCH_BOTTOM - 10) {
      this.bottomGoalNet.ballCaught = false;
    }

    // Set piece taker kick cooldown decay
    if (this.setPieceTakerCooldownTimer > 0) {
      this.setPieceTakerCooldownTimer = Math.max(0, this.setPieceTakerCooldownTimer - timeScale);
      if (this.setPieceTakerCooldownTimer === 0) {
        this.setPieceTakerCooldownPlayerId = null;
      }
    }

    if (this.setPieceDeliveryGraceTimer > 0) {
      this.setPieceDeliveryGraceTimer = Math.max(0, this.setPieceDeliveryGraceTimer - timeScale);
    }

    // Phase 7.5.6: Post-Goal Match Freeze & Whistle to Kickoff Reset
    if (this.matchPhase === 'goal_celebration' || this.matchPhase === 'goal_scored') {
      this.phaseTimer += timeScale;
      // Authoritative physical freeze lock: disable all tackles, duels, collisions, out-of-bounds whistles
      for (const p of this.players) {
        p.vx = 0;
        p.vy = 0;
        if (p.actionTimer > 0) {
          p.actionTimer = Math.max(0, p.actionTimer - timeScale);
        }
      }
      this.updateParticles(timeScale);
      this.updateCamera(timeScale);

      if (this.phaseTimer > 150) {
        // Clean transition directly to kickoff formation
        this.resetToKickoff(this.lastConcedingTeam);
      }
      return; // STRICT GOAL CELEBRATION FREEZE LOCK!
    } else if (this.matchPhase === 'foul_stoppage') {
      this.phaseTimer += timeScale;
      if (this.phaseTimer > 140) {
        this.matchPhase = 'in_play';
        this.referee.cardDisplay = null;
        this.referee.cardPlayerName = null;
      }
    }

    // Spectator mode automatic kickoff for CPU vs CPU matches
    if (this.isSpectatorMode() && this.matchPhase === 'kickoff_ready') {
      this.phaseTimer += timeScale;
      if (this.phaseTimer > 45) {
        this.matchPhase = 'in_play';
        this.phaseTimer = 0;
        this.setBanner('MATCH IN PLAY - CPU SIMULATION', 70);
        const kicker = this.players.find(p => p.team === this.kickoffKickingTeam && (p.role === 'ST1' || p.role === 'ST2')) || this.players[0];
        if (kicker) {
          this.ball.ownerId = kicker.id;
        }
      }
    }

    // 1. Process User Player Input
    this.handleUserInput(keys);

    // 1.2 Process Secondary Human Slots (2P, 3P, 4P)
    if (slotKeys) {
      this.handleSecondarySlotsInput(slotKeys, timeScale);
    }

    // 1.5 Goalkeeper Possession & Distribution Handler (handles composed stance and auto-distribution)
    this.handleGoalkeeperPossession();

    // 2. Process AI for all non-user controlled players
    this.handleAI();

    // 3. Update Ball Physics with 3D Goal Net catch, Brazilian frame depth, and surface/weather dynamics
    const newParticles = updateBallPhysics(
      this.ball,
      event => this.onGoal(event),
      this.topGoalNet,
      this.bottomGoalNet,
      timeScale,
      this.turfQuality,
      this.grassLength,
      this.weather,
      this.season,
      this.puddles,
      this.netTension,
      this.goalFrame,
      this.homeAttacksUp
    );
    if (newParticles.length > 0) {
      this.particles.push(...newParticles);
    }

    // 3.1 Update Weather Atmosphere Particles across active camera view
    updateWeatherParticles(
      this.weather,
      this.camera.x - 700,
      this.camera.y - 450,
      1400,
      900,
      'balanced',
      timeScale
    );

    // 3.5 Defensive wall block collision check during free kick shots
    if ((this.ball.isAirborne || Math.hypot(this.ball.vx, this.ball.vy) > 3.0) && this.ball.lastTouchTeam !== null) {
      for (const p of this.players) {
        if ((p.action === 'wall_stance' || p.action === 'wall_jump') && p.team !== this.ball.lastTouchTeam) {
          const d = Math.hypot(this.ball.x - p.x, this.ball.y - p.y);
          const maxBlockZ = p.action === 'wall_jump' ? 36 : 22;
          if (d < 15 && this.ball.z <= maxBlockZ) {
            this.ball.vx = -this.ball.vx * 0.42 + (Math.random() - 0.5) * 3;
            this.ball.vy = -this.ball.vy * 0.42;
            this.ball.vz = Math.random() * 2.2;
            this.ball.spin = (Math.random() - 0.5) * 4;
            this.ball.lastTouchPlayerId = p.id;
            this.ball.lastTouchTeam = p.team;
            audio.playKick(0.85);
            this.setBanner('BLOCKED BY THE WALL!', 60);
            p.action = 'trapping';
            p.actionTimer = 16;
            break;
          }
        }
      }
    }

    // 3.6 Outfield defender body block / deflection check on shots
    if (!this.ball.ownerId && (this.ball.lastKickAction === 'shoot' || Math.hypot(this.ball.vx, this.ball.vy) > 5.5)) {
      const blockedBy = checkOutfieldDefenderShotBlock(this.players, this.ball);
      if (blockedBy) {
        this.setBanner(`BLOCKED BY ${blockedBy.name.toUpperCase()}!`, 65);
      }
    }

    // 4. Ball Possession & Player Proximity Check
    this.updateBallPossession();

    // 4.5 Check out of bounds / overpowered balls in stands
    this.checkOutOfBounds();

    // 5. Update Actions & Animations for all players
    this.updatePlayerStates(timeScale);

    // 6. Update Referee AI (moves along sideline & follows action)
    this.updateReferee(timeScale);

    // 7. Update Particles
    this.updateParticles(timeScale);

    // 8. Update Camera smoothly with dynamic angle
    this.updateCamera(timeScale);

    // 9. Auto-switch user control to closest Home player to ball (if not holding ball)
    this.autoSwitchUserPlayer();
  }

  /**
   * Handles user keyboard controls:
   * Arrows = Move, Shift = Run
   * With ball: W = Long Pass to space, A = Shoot, S = Short Pass to feet, D = Cross to box
   * Without ball: S = Standing tackle, D = Sliding tackle, A = Clear ball, W = Push / Foul
   */
  private handleUserInput(keys: KeyState) {
    // Spectator mode: CPU vs CPU, no human input steering
    if (this.isSpectatorMode()) return;

    // If Player 1 is assigned to Spectator slot, do not process primary steering
    const slot1 = this.playerSlots.find(s => s.id === 1);
    if (slot1 && slot1.side === 'spectator') return;

    // Set piece phase control (penalty, free kick, corner, goal kick, throw-in)
    if (this.setPiece && (this.matchPhase === 'free_kick' || this.matchPhase === 'penalty' || this.matchPhase === 'corner_kick' || this.matchPhase === 'goal_kick' || this.matchPhase === 'throw_in')) {
      updateSetPiece(this, keys);
      return;
    }

    const player = this.players.find(p => p.id === this.userControlledPlayerId);
    if (!player) return;

    if (player.action === 'sliding_tackle' || player.action === 'fouled_falling' || player.action === 'cruyff_turn' || player.action === 'rainbow_flick') {
      return; // Cannot steer while performing locked skill action, slide or knocked down
    }

    const distToBall = Math.hypot(this.ball.x - player.x, this.ball.y - player.y);
    const isCharging = this.powerBar.isActive && (this.ball.ownerId === player.id || distToBall < 35);
    const hasBall = this.ball.ownerId === player.id || isCharging || (!this.ball.ownerId && distToBall < 26 && this.ball.z < 8);

    // Keep ball attached to player's feet during running kick charge
    if (isCharging) {
      this.ball.ownerId = player.id;
    }

    // DEFENSE CONTROL SWITCH: Map Spacebar / Q (L1) on defense to switch control immediately to player closest to ball
    const isSwitchTrigger = !hasBall && (keys.Space || keys.KeyQ) && !this.powerBar.isActive;
    if (isSwitchTrigger) {
      if (!this.wasSpacePressedLastFrame) {
        this.switchControlToClosestDefender(1);
      }
      this.wasSpacePressedLastFrame = true;
      if (keys.KeyQ) keys.KeyQ = false;
      return;
    } else if (!keys.Space && !keys.KeyQ) {
      this.wasSpacePressedLastFrame = false;
    }

    // DIRECT GOALKEEPER CONTROL SWITCH (Phase 3.1): Press 'G' to toggle direct control to the Goalkeeper
    if (keys.KeyG && !hasBall) {
      if (!this.wasGPressedLastFrame) {
        this.switchControlToGoalkeeper(1);
      }
      this.wasGPressedLastFrame = true;
      return;
    } else if (!keys.KeyG) {
      this.wasGPressedLastFrame = false;
    }

    const skillEvents = this.skillTracker.update(keys);

    // Movement directional input
    let dx = 0;
    let dy = 0;
    if (keys.ArrowLeft) dx -= 1;
    if (keys.ArrowRight) dx += 1;
    if (keys.ArrowUp) dy -= 1;
    if (keys.ArrowDown) dy += 1;

    // Phase 7.5.5 Kickoff wake-up: the exact millisecond user inputs movement or action from kickoff, trigger in_play!
    if (this.matchPhase === 'kickoff_ready') {
      if (dx !== 0 || dy !== 0 || this.powerBar.isActive || Math.hypot(this.ball.vx, this.ball.vy) > 0.1 || Math.hypot(this.ball.x - PITCH_CONFIG.CENTER_X, this.ball.y - PITCH_CONFIG.CENTER_Y) > 8) {
        this.matchPhase = 'in_play';
      }
    }

    // Real-Time Tactical Guide Assist for 1-Player Control Mode:
    // Continuous dynamic target calculation while preserving 100% manual locomotion freedom
    if (this.controlMode === 'one_player' && this.tacticalGuideEnabled) {
      this.autoPositionTarget = getOptimalTacticalPosition(
        player,
        this.players,
        this.ball,
        true, // Home attacks up
        this.homePlaystyle,
        this.homeTactics
      );
    }

    // --- WITH BALL SKILL DISPATCH (Phase 3.1: Goalkeeper with ball behaves identically to outfield player) ---
    if (hasBall) {

      // 0. Rotate arrow keys while pressing E -> Marseille Roulette 360° spin!
      const isRotatingArrows = this.arrowRotationTracker.update(keys, !!keys.KeyE);
      if (isRotatingArrows) {
        executeRoulette(player, this.ball, keys, this.players, this.setBanner.bind(this));
        return;
      }

      // 1. Double-tap Q: short skill (nutmeg if defender behind, Cruyff turn if on side)
      if (skillEvents.doubleTapQ) {
        executeDoubleTapQSkill(player, this.ball, this.players, this.setBanner.bind(this));
        return;
      }

      // 2. Double-tap E:
      // If standing and defender in front -> Rainbow flick
      // Otherwise -> Step-overs
      if (skillEvents.doubleTapE) {
        if (dx === 0 && dy === 0) {
          let defInFront: Player | null = null;
          for (const opp of this.players) {
            if (opp.team !== player.team) {
              const d = Math.hypot(opp.x - player.x, opp.y - player.y);
              if (d < 58) {
                const ang = Math.atan2(opp.y - player.y, opp.x - player.x);
                if (Math.abs(normalizeAngle(ang - player.facingAngle)) < 0.85) {
                  defInFront = opp;
                  break;
                }
              }
            }
          }
          if (defInFront) {
            executeRainbowFlick(player, this.ball, defInFront, this.setBanner.bind(this));
            return;
          } else {
            executeStepOvers(player, this.setBanner.bind(this));
          }
        } else {
          executeStepOvers(player, this.setBanner.bind(this));
        }
      }

      // 3. While running pressing E makes you throw the ball longer (autopass ahead)
      const isMovingOrRunning = dx !== 0 || dy !== 0 || player.action === 'running' || player.action === 'nutmeg_dash';
      if (keys.KeyE && isMovingOrRunning && !this.powerBar.isActive && !player.isStepOverActive) {
        player.isLongThrowCharging = true;
        player.longThrowCharge = Math.min(1.0, (player.longThrowCharge || 0) + 0.034);
      }

      if (skillEvents.releasedEAfterHold && (player.longThrowCharge || 0) > 0.06) {
        executeAutopassLaunch(player, this.ball, keys, player.longThrowCharge || 0.5, this.setBanner.bind(this));
        player.longThrowCharge = 0;
        player.isLongThrowCharging = false;
        return;
      }
    }

    // --- GINGA SYSTEM: SPACEBAR BALL LIFTING, JUGGLING & SOMBREROS ---
    updateGingaSystem(player, this.ball, keys, this.players, this.setBanner.bind(this));

    // --- [Q] SHIELDING MECHANIC (when with ball and not charging action) ---
    // "when with the ball Q makes you shield the ball, your back faces coming pressing rivals, and you move the ball away from them automatically"
    // "if you're running pressing Q stops your run and allows to manouver, turn faster and avoid rivals, you can't run while pressing Q but you turn much faster than normal"
    const isShieldingKey = hasBall && keys.KeyQ && !this.powerBar.isActive && !keys.KeyA && !keys.KeyS && !keys.KeyD && !keys.KeyW && !skillEvents.doubleTapQ;
    player.isShielding = isShieldingKey;

    // --- [E] STEP-OVERS & DASH MECHANIC (when with ball and not charging action) ---
    const isStepOverKey = hasBall && keys.KeyE && !this.powerBar.isActive && !keys.KeyA && !keys.KeyS && !keys.KeyD && !keys.KeyW && !player.isLongThrowCharging;

    if (isShieldingKey) {
      // Cannot sprint/run while shielding: stops run, provides nimble tight maneuvering
      const timeScale = this.getTimeScale();
      const shieldSpeed = player.stats.speed * 0.44 * timeScale;
      if (dx !== 0 || dy !== 0) {
        const len = Math.hypot(dx, dy);
        player.vx = (dx / len) * shieldSpeed;
        player.vy = (dy / len) * shieldSpeed;
        player.x += player.vx;
        player.y += player.vy;

        // Turn much faster than normal
        player.facingAngle = Math.atan2(dy, dx);
        updateFacingDirection(player, dx / len, dy / len);
      } else {
        player.vx = 0;
        player.vy = 0;
      }

      // Automatically shield from nearest incoming rival
      let nearestRival: Player | null = null;
      let minRivalDist = 130;
      for (const opp of this.players) {
        if (opp.team !== player.team) {
          const d = Math.hypot(opp.x - player.x, opp.y - player.y);
          if (d < minRivalDist) {
            minRivalDist = d;
            nearestRival = opp;
          }
        }
      }

      if (nearestRival) {
        // Back faces coming rival! Player faces away from rival
        const awayAngle = Math.atan2(player.y - nearestRival.y, player.x - nearestRival.x);
        player.facingAngle = awayAngle;
        updateFacingDirection(player, Math.cos(awayAngle), Math.sin(awayAngle));
        // Move ball away from rival automatically
        this.ball.x = player.x + Math.cos(awayAngle) * 12;
        this.ball.y = player.y + Math.sin(awayAngle) * 12;
      } else {
        this.ball.x = player.x + Math.cos(player.facingAngle) * 10;
        this.ball.y = player.y + Math.sin(player.facingAngle) * 10;
      }
      this.ball.z = 0;
      this.ball.vx = 0;
      this.ball.vy = 0;

      player.action = 'shielding';
      player.animFrame = 0;
    } else if (isStepOverKey && dx === 0 && dy === 0) {
      // Stopped on the ball: do step-overs hovering above it
      player.vx = 0;
      player.vy = 0;
      player.action = 'step_overs';
      const dri = player.canonicalStats && 'dri' in player.canonicalStats ? player.canonicalStats.dri : 70;
      const tier = getDribblingTier(dri);
      player.dribbleTier = tier;
      const stepOverSpeed = getStepOverCycleSpeed(tier);
      player.stepOverTimer = (player.stepOverTimer || 0) + stepOverSpeed;
      player.animFrame = Math.floor(player.stepOverTimer / 6) % 4;

      if (player.stepOverTimer % 18 < stepOverSpeed) {
        audio.playStepOver();
      }

      // Ball sits still under feet
      this.ball.x = player.x;
      this.ball.y = player.y + 4;
      this.ball.z = 0;
      this.ball.vx = 0;
      this.ball.vy = 0;
    } else {
      // Step-over direction change effectiveness check:
      if (player.isStepOverActive && (dx !== 0 || dy !== 0)) {
        const inputAngle = Math.atan2(dy, dx);
        if (Math.abs(normalizeAngle(inputAngle - (player.stepOverOriginalAngle || player.facingAngle))) > 0.6) {
          player.stepOverDirChanged = true;
          const dri = player.canonicalStats && 'dri' in player.canonicalStats ? player.canonicalStats.dri : 70;
          const tier = getDribblingTier(dri);
          const bonusDash = tier === 'unique' ? 8 : tier === 'world_class' ? 5 : tier === 'elite' ? 3 : 0;
          player.dashTimer = 22 + bonusDash;
          player.isStepOverActive = false;
          player.action = 'nutmeg_dash';
          audio.playStepOver();
          for (const def of this.players) {
            if (def.team !== player.team) {
              const d = Math.hypot(def.x - player.x, def.y - player.y);
              if (d < 50) def.confusedTimer = tier === 'world_class' || tier === 'unique' ? 85 : 65;
            }
          }
          this.setBanner(t('stepoverCut'), 60);
        }
      }

      // Normal running / sprinting OR longer dash after step-overs [E]
      const wasStepOverOrDash = (player.stepOverTimer && player.stepOverTimer > 5) || (player.action === 'step_overs') || (player.dashTimer && player.dashTimer > 0) || (keys.KeyE && (dx !== 0 || dy !== 0));

      if (wasStepOverOrDash && (dx !== 0 || dy !== 0) && (!player.dashTimer || player.dashTimer === 0) && !player.isLongThrowCharging) {
        // Trigger longer explosive dash
        player.dashTimer = 26;
        player.action = 'nutmeg_dash';

        // Check for automatic nutmeg if defender is in front and not in standing tackle!
        const dashDirX = dx / Math.hypot(dx, dy);
        const dashDirY = dy / Math.hypot(dx, dy);
        const dashAngle = Math.atan2(dashDirY, dashDirX);

        for (const def of this.players) {
          if (def.team !== player.team) {
            const d = Math.hypot(def.x - player.x, def.y - player.y);
            if (d < 54) {
              const angleToDef = Math.atan2(def.y - player.y, def.x - player.x);
              let angleDiff = Math.abs(angleToDef - dashAngle);
              while (angleDiff > Math.PI) angleDiff = Math.abs(angleDiff - Math.PI * 2);

              if (angleDiff < 0.95) {
                const isTackling = def.action === 'standing_tackle' || def.action === 'sliding_tackle';
                if (!isTackling) {
                  def.confusedTimer = 110; // Subtle small confused emoji
                  def.action = 'idle';

                  // Ball nutmegs between defender's legs into space ahead
                  this.ball.ownerId = null;
                  this.ball.x = def.x + Math.cos(dashAngle) * 22;
                  this.ball.y = def.y + Math.sin(dashAngle) * 22;
                  this.ball.vx = Math.cos(dashAngle) * 5.2;
                  this.ball.vy = Math.sin(dashAngle) * 5.2;
                  this.ball.z = 0;
                  this.ball.vz = 0;
                  this.ball.lastTouchPlayerId = player.id;
                  this.ball.lastTouchTeam = player.team;

                  audio.playNutmegCheer();
                  this.setBanner(t('nutmegDash'), 90);
                  break;
                }
              }
            }
          }
        }
        player.stepOverTimer = 0;
      }

      const pac = player.canonicalStats && 'pac' in player.canonicalStats ? player.canonicalStats.pac : 70;
      const dri = player.canonicalStats && 'dri' in player.canonicalStats ? player.canonicalStats.dri : 70;
      const bcl = player.canonicalStats && 'bcl' in player.canonicalStats ? player.canonicalStats.bcl : 70;
      const str = player.canonicalStats && 'str' in player.canonicalStats ? player.canonicalStats.str : 70;
      const dribbleTier = getDribblingTier(dri);
      player.dribbleTier = dribbleTier;
      const topSpeed = hasBall ? calculateOnBallTopSpeed(pac, dri) : calculateOffBallTopSpeed(pac);

      const isDashing = player.dashTimer && player.dashTimer > 0;
      const isSprinting = (keys.Shift || isDashing) && (dx !== 0 || dy !== 0) && player.stamina > 5;
      let currentSpeed = isDashing
        ? topSpeed * 1.45
        : (isSprinting
            ? topSpeed
            : (topSpeed * 0.68) * Math.max(0.65, Math.min(1.0, this.analogSpeedRatio)));

      // ⚡ Phase 6: Hyper-Burst / Sonic Ghost (PAC > 99)
      // Instantaneous zero-to-top velocity curve (0-frame acceleration ramp) + ethereal speed-line afterimages
      if (pac > 99 && isSprinting) {
        currentSpeed = Math.max(currentSpeed, 4.4);
        if (!player.ghostTrails) player.ghostTrails = [];
        if (this.frameCount % 2 === 0) {
          player.ghostTrails.push({ x: player.x, y: player.y, facingAngle: player.facingAngle, alpha: 0.65, team: player.team });
          if (player.ghostTrails.length > 6) player.ghostTrails.shift();
        }
      }

      // ⚡ Phase 6: Immovable Juggernaut (STR > 99) Immunity to Shirt Pulls & Shoulder Disruptions
      if (str > 99) {
        player.shirtPulledTimer = 0;
        player.shoulderHitTimer = 0;
      }

      // Turn deceleration on the ball governed by Dribbling (DRI)
      if (hasBall && (dx !== 0 || dy !== 0)) {
        const inputAngle = Math.atan2(dy, dx);
        let angleDiff = Math.abs(inputAngle - player.facingAngle);
        while (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
        currentSpeed *= calculateTurnDecelerationFactor(dri, angleDiff);

        // ⚡ Phase 6: Ankle Breaker (DRI > 99)
        // Instantaneous 180° cuts without centrifugal deceleration; proximate lunging defenders suffer stumble animation!
        if (dri > 99 && angleDiff > 1.2 && isSprinting) {
          for (const opp of this.players) {
            if (opp.team !== player.team && opp.role !== 'GK' && opp.action !== 'fouled_falling' && !opp.isRedCarded) {
              const dOpp = Math.hypot(opp.x - player.x, opp.y - player.y);
              if (dOpp < 36 && (!opp.stumbleTimer || opp.stumbleTimer === 0)) {
                const duel = resolveStatBreakDuel(player, opp, 'dribble_cut', { cutAngle: angleDiff * (180 / Math.PI) });
                if (duel.winner === 'attacker') {
                  opp.stumbleTimer = 22;
                  opp.stumbleReason = 'Ankle Breaker';
                  opp.vx *= 0.15;
                  opp.vy *= 0.15;
                  this.setBanner(`⚡ ANKLE BREAKER! ${player.name.toUpperCase()} SHAKES ${opp.name.toUpperCase()}!`, 80);
                  audio.playStatBreakChime();
                }
              }
            }
          }
        }
      }

      // Stumble stun deceleration (from Ankle Breaker or Juggernaut)
      if (player.stumbleTimer && player.stumbleTimer > 0) {
        currentSpeed *= 0.35;
      }

      // Step-overs slow down the run
      if (player.isStepOverActive) {
        currentSpeed *= 0.54;
      }

      // Shirt pulled slows down player
      if (player.shirtPulledTimer && player.shirtPulledTimer > 0) {
        currentSpeed *= 0.42;
      }

      // Phase 5 Dynamic Stamina Engine: sprint burn, irreversible max wear, and natural recovery
      const timeScale = this.getTimeScale();
      updatePlayerStaminaDynamic(player, isSprinting && !isDashing, timeScale);

      if (dx !== 0 || dy !== 0) {
        // Normalize vector
        const len = Math.hypot(dx, dy);
        const ndx = dx / len;
        const ndy = dy / len;

        const timeScale = this.getTimeScale();
        const targetVx = ndx * currentSpeed * timeScale;
        const targetVy = ndy * currentSpeed * timeScale;

        // Phase 8.2: On-Ball Acceleration Ramp & Turn Radius Separation
        // Top speed still governed by Pace; acceleration & turn radius while on the ball
        // are governed strictly by Dribbling (60%) and Ball Control (40%).
        if (hasBall && !isDashing && dri <= 99) {
          const accelRamp = calculateOnBallAccelerationRamp(dri, bcl);
          const turnRate = calculateOnBallTurnRate(dri, bcl);
          const blendRate = Math.min(1.0, turnRate * accelRamp * 1.5 * timeScale);
          player.vx += (targetVx - player.vx) * blendRate;
          player.vy += (targetVy - player.vy) * blendRate;

          // Realistic turn rate / angular acceleration
          const targetAngle = Math.atan2(ndy, ndx);
          let angleDiff = normalizeAngle(targetAngle - player.facingAngle);
          player.facingAngle += angleDiff * Math.min(1.0, turnRate * 2.4 * timeScale);
          updateFacingDirection(player, Math.cos(player.facingAngle), Math.sin(player.facingAngle));
        } else {
          player.vx = targetVx;
          player.vy = targetVy;
          player.facingAngle = Math.atan2(ndy, ndx);
          updateFacingDirection(player, ndx, ndy);
        }
        player.x += player.vx;
        player.y += player.vy;

        // Maintain shooting/passing/crossing kick animation while running
        if (player.actionTimer <= 0 || !isKickingAction(player.action)) {
          if (this.powerBar.isActive) {
            // Authentic kick wind-up backswing frame while running/sprinting (Phase 7.5.1)
            const act = this.powerBar.action;
            if (act === 'shoot') player.action = 'running_shot_low';
            else if (act === 'cross') player.action = 'running_cross_low';
            else if (act === 'long_pass') player.action = 'running_long_pass_low';
            else player.action = 'running_pass_low';
            player.animFrame = 1; // Backswing kick wind-up frame
          } else {
            const isDashing = player.dashTimer && player.dashTimer > 0;
            const currentSpeed = Math.hypot(player.vx, player.vy);

            if (isDashing) {
              player.action = 'nutmeg_dash';
            } else if (player.isStepOverActive) {
              player.action = 'step_overs';
            } else if (hasBall) {
              // Phase 8.1 Close-Control Touch Steps vs Fluid Dribble
              if (currentSpeed < 2.5 || player.isShielding) {
                player.action = 'close_control';
                animationEngine.updateCloseControlDribble(player, true, this.getTimeScale());
              } else {
                player.action = 'dribbling';
                player.animTimer = (player.animTimer || 0) + 1;
                if (player.animTimer % 4 === 0) {
                  player.animFrame = ((player.animFrame || 0) + 1) % 6;
                }
              }

              // Phase 8.1 Body Feints & Cuts: Sharp shoulder drop when cutting sharply with ball
              if (currentSpeed > 1.4 && player.prevFacingAngle !== undefined) {
                let angleDelta = player.facingAngle - player.prevFacingAngle;
                while (angleDelta > Math.PI) angleDelta -= Math.PI * 2;
                while (angleDelta < -Math.PI) angleDelta += Math.PI * 2;
                if (Math.abs(angleDelta) > 1.25 && player.actionTimer <= 0) {
                  animationEngine.triggerBodyFeint(player, angleDelta > 0 ? 'right' : 'left');
                }
              }
              player.prevFacingAngle = player.facingAngle;
            } else {
              // Phase 8.4 Defensive Jockey / Backpedal Stance
              const isRetreating = player.team === 'home' ? player.vy > 0.4 : player.vy < -0.4;
              if (keys.KeyQ || (isRetreating && currentSpeed < 2.5)) {
                player.action = 'defensive_jockey';
                player.animTimer = (player.animTimer || 0) + 1;
                if (player.animTimer % 5 === 0) {
                  player.animFrame = ((player.animFrame || 0) + 1) % 4;
                }
              } else {
                player.action = 'running';
                player.animTimer = (player.animTimer || 0) + 1;
                const animSpeed = isSprinting ? 3 : 5;
                if (player.animTimer % animSpeed === 0) {
                  player.animFrame = (player.animFrame + 1) % 6;
                }
              }
            }
          }
        }
      } else {
        player.vx = 0;
        player.vy = 0;
        if (
          player.actionTimer <= 0 &&
          (player.action === 'running' ||
            player.action === 'dribbling' ||
            player.action === 'close_control' ||
            player.action === 'defensive_jockey' ||
            player.action === 'nutmeg_dash')
        ) {
          player.action = player.isStepOverActive ? 'step_overs' : 'idle';
          player.animFrame = 0;
        }
      }
    }

    // Keep within pitch bounds
    player.x = Math.max(PITCH_CONFIG.PITCH_LEFT, Math.min(PITCH_CONFIG.PITCH_RIGHT, player.x));
    player.y = Math.max(PITCH_CONFIG.PITCH_TOP, Math.min(PITCH_CONFIG.PITCH_BOTTOM, player.y));

    // Keep defending user player in own half and outside center circle during kickoff
    if (this.matchPhase === 'kickoff_ready' && player.team !== this.kickoffKickingTeam) {
      if (player.team === 'away') {
        if (player.y > PITCH_CONFIG.CENTER_Y - 8) {
          player.y = PITCH_CONFIG.CENTER_Y - 8;
          if (player.vy > 0) player.vy = 0;
        }
      } else {
        if (player.y < PITCH_CONFIG.CENTER_Y + 8) {
          player.y = PITCH_CONFIG.CENTER_Y + 8;
          if (player.vy < 0) player.vy = 0;
        }
      }
      const dCenter = Math.hypot(player.x - PITCH_CONFIG.CENTER_X, player.y - PITCH_CONFIG.CENTER_Y);
      const minRadius = PITCH_CONFIG.CENTER_CIRCLE_RADIUS + 10;
      if (dCenter < minRadius) {
        const ang = Math.atan2(player.y - PITCH_CONFIG.CENTER_Y, player.x - PITCH_CONFIG.CENTER_X);
        player.x = PITCH_CONFIG.CENTER_X + Math.cos(ang) * minRadius;
        player.y = PITCH_CONFIG.CENTER_Y + Math.sin(ang) * minRadius;
        if (player.team === 'away' && player.y > PITCH_CONFIG.CENTER_Y - 8) {
          player.y = PITCH_CONFIG.CENTER_Y - 8;
        } else if (player.team === 'home' && player.y < PITCH_CONFIG.CENTER_Y + 8) {
          player.y = PITCH_CONFIG.CENTER_Y + 8;
        }
        player.vx = 0;
        player.vy = 0;
      }
    }

    // ACTION BUTTONS (W, A, S, D)
    if (hasBall) {
      // Check Q / E key modifiers for special curve or knuckleball modes
      const wantsKnuckle = !!keys.KeyE && !player.isLongThrowCharging;
      const wantsSpecial = !!keys.KeyQ && !player.isShielding;

      // 1. If not currently charging, start charging when key is pressed
      if (!this.powerBar.isActive) {
        if (keys.KeyS) {
          this.startChargingPower('pass', wantsSpecial, wantsKnuckle);
        } else if (keys.KeyW) {
          this.startChargingPower('long_pass', wantsSpecial, wantsKnuckle);
        } else if (keys.KeyA) {
          this.startChargingPower('shoot', wantsSpecial, wantsKnuckle);
        } else if (keys.KeyD) {
          this.startChargingPower('cross', wantsSpecial, wantsKnuckle);
        }
      }

      // 2. If charging an action (Phase 7.5.1: Decoupled charge while running/sprinting):
      if (this.powerBar.isActive) {
        const action = this.powerBar.action;
        let isKeyHeld = false;
        if (action === 'pass') isKeyHeld = !!keys.KeyS;
        else if (action === 'long_pass') isKeyHeld = !!keys.KeyW;
        else if (action === 'shoot') isKeyHeld = !!keys.KeyA;
        else if (action === 'cross') isKeyHeld = !!keys.KeyD;

        // Check either keyboard key held OR virtual button held
        const isActionHeld = isKeyHeld || (this.heldAction === action);

        if (keys.KeyE) {
          this.powerBar.isKnuckle = true;
          this.powerBar.isSpecial = false;
          this.updatePowerBarTiers();
        } else if (keys.KeyQ) {
          this.powerBar.isSpecial = true;
          this.powerBar.isKnuckle = false;
          this.updatePowerBarTiers();
        }

        if (isActionHeld) {
          // Linear power charge ramp-up during hold duration
          this.powerBar.power = Math.min(1.0, this.powerBar.power + this.powerBar.fillSpeed);
          this.updatePowerBarTiers();

          // Full charge threshold reached (100%): auto-fire at full output!
          if (this.powerBar.power >= 1.0) {
            this.wasFullChargeFired = true;
            this.executeChargedAction(player, keys);
            this.heldAction = null;
            if (action === 'pass') keys.KeyS = false;
            else if (action === 'long_pass') keys.KeyW = false;
            else if (action === 'shoot') keys.KeyA = false;
            else if (action === 'cross') keys.KeyD = false;
          }
        } else {
          // Released button / key: execute charged action cleanly
          this.executeChargedAction(player, keys);
          this.heldAction = null;
        }
      }
    } else {
      // WITHOUT THE BALL:
      if (this.powerBar.isActive) {
        this.powerBar.isActive = false;
        this.heldAction = null;
      }

      // --- AERIAL BALL MECHANICS: VOLLEYS, FLAIR SHOTS, SOMBREROS & HEADERS ---
      const distToBall = Math.hypot(this.ball.x - player.x, this.ball.y - player.y);
      const isBallAirborneNear = (this.ball.isAirborne || player.gingaActive || this.ball.z > 2.0) && distToBall < 36;

      if (isBallAirborneNear) {
        // 1. Shoot Volley / Acrobatic Flair (A)
        if (keys.KeyA) {
          const isOwnDefensiveHalf = player.team === 'home'
            ? player.y > PITCH_CONFIG.CENTER_Y + 50
            : player.y < PITCH_CONFIG.CENTER_Y - 50;
          const isDefender = player.role === 'CB1' || player.role === 'CB2' || player.role === 'LB' || player.role === 'RB';

          if (isOwnDefensiveHalf && isDefender && !keys.KeyQ && !keys.KeyE) {
            // "defenders can also do volleys for clearance those are more rustic"
            executeRusticVolleyClearance(player, this.ball, this.setBanner.bind(this));
          } else {
            tryExecuteVolley(player, this.ball, 'shoot', 0.85, keys, null, this.setBanner.bind(this));
          }
          keys.KeyA = false;
          return;
        }

        // 2. Short Pass Volley / Flair (S)
        if (keys.KeyS) {
          tryExecuteVolley(player, this.ball, 'pass', 0.65, keys, null, this.setBanner.bind(this));
          keys.KeyS = false;
          return;
        }

        // 3. Long Pass Volley / Flair (W)
        if (keys.KeyW) {
          tryExecuteVolley(player, this.ball, 'long_pass', 0.8, keys, null, this.setBanner.bind(this));
          keys.KeyW = false;
          return;
        }

        // 4. Cross Volley / Flair (D)
        if (keys.KeyD) {
          tryExecuteVolley(player, this.ball, 'cross', 0.8, keys, null, this.setBanner.bind(this));
          keys.KeyD = false;
          return;
        }

        // 5. Automatic Header if no button pressed on incoming aerial cross/ball:
        // "if you don't press anything you player will try to head it"
        const isAttackingUp = (player.team === 'home') === this.homeAttacksUp;
        const rivalGoalY = isAttackingUp ? PITCH_CONFIG.PITCH_TOP : PITCH_CONFIG.PITCH_BOTTOM;
        if (checkAutomaticHeader(player, this.ball, rivalGoalY, this.setBanner.bind(this))) {
          return;
        }
      }

      // Manual Header contest check: if airborne ball is right overhead
      if (this.ball.isAirborne && this.ball.z > 14 && this.ball.z < 45 && distToBall < 30) {
        if (keys.KeyA || keys.KeyS || keys.KeyD || keys.KeyW) {
          this.executeHeader(player);
          return;
        }
      }

      // --- PHASE 3.1: HUMAN GOALKEEPER CONTROL SCHEME (WITHOUT BALL) ---
      if (player.role === 'GK') {
        const isAttackingUp = (player.team === 'home') === this.homeAttacksUp;

        // 1. S: Short Pass -> Sprint full speed toward the ball (Sweeper Rush)
        if (keys.KeyS) {
          player.action = 'running';
          player.dashTimer = 35;
          const dist = Math.hypot(this.ball.x - player.x, this.ball.y - player.y);
          if (dist > 1) {
            player.facingAngle = Math.atan2(this.ball.y - player.y, this.ball.x - player.x);
            updateFacingDirection(player, Math.cos(player.facingAngle), Math.sin(player.facingAngle));
          }
          this.setBanner(`⚡ SWEEPER RUSH! [S CHARGE]`, 45);
          audio.playKick(0.4);
          keys.KeyS = false;
          return;
        }

        // 2. W: Long Pass -> 1v1 Star-Spread Smother (Peter Schmeichel / Neuer starfish body barrier)
        if (keys.KeyW) {
          player.action = 'gk_star_spread';
          player.actionTimer = 28;
          player.animFrame = 0;
          player.vx = 0;
          player.vy = 0;
          this.setBanner(`⭐ 1v1 STAR SPREAD BLOCK! [W BLOCK]`, 50);
          audio.playKick(0.7);
          keys.KeyW = false;
          return;
        }

        // 3. D: Cross -> High dive / jumping reach in stick direction aiming top corners
        if (keys.KeyD) {
          player.action = 'gk_fingertip_parry';
          player.actionTimer = 26;
          player.animFrame = 0;
          const diveDx = dx !== 0 ? dx : (this.ball.x < player.x ? -1 : 1);
          const diveDy = dy !== 0 ? dy : (isAttackingUp ? 1 : -1);
          player.diveX = diveDx * 2.8;
          player.diveY = diveDy * 2.2;
          this.setBanner(`HIGH EXTENSION DIVE! [D HIGH DIVE]`, 50);
          audio.playKick(0.8);
          keys.KeyD = false;
          return;
        }

        // 4. A: Shoot -> Low dive aiming bottom corner (low ground smother slide)
        if (keys.KeyA) {
          player.action = 'gk_low_smother';
          player.actionTimer = 25;
          player.animFrame = 0;
          const diveDx = dx !== 0 ? dx : (this.ball.x < player.x ? -1 : 1);
          const diveDy = dy !== 0 ? dy : (isAttackingUp ? 0.8 : -0.8);
          player.diveX = diveDx * 3.2;
          player.diveY = diveDy * 1.2;
          this.setBanner(`LOW TURF SMOTHER DIVE! [A LOW DIVE]`, 50);
          audio.playKick(0.75);
          keys.KeyA = false;
          return;
        }

        // 5. Q: Ball Shield -> High jump to catch (aerial corners / crosses contest)
        if (keys.KeyQ) {
          player.action = 'gk_high_catch';
          player.actionTimer = 26;
          player.animFrame = 0;
          player.vx = dx * 1.5;
          player.vy = dy * 1.5;
          this.setBanner(`AERIAL HIGH CATCH! [Q CATCH]`, 50);
          audio.playKick(0.65);
          keys.KeyQ = false;
          return;
        }

        // 6. E: Special -> Punch clear instead of catch
        if (keys.KeyE) {
          player.action = 'gk_punch';
          player.actionTimer = 24;
          player.animFrame = 0;
          player.vx = dx * 1.8;
          player.vy = dy * 1.8;
          this.setBanner(`TWO-FISTED PUNCH CLEAR! [E PUNCH]`, 50);
          audio.playKick(0.9);
          keys.KeyE = false;
          return;
        }

        // 7. Automatic Dive if opponent shoots and user provides no dive input:
        const isShotComing = isAttackingUp ? (this.ball.vy > 1.5 && this.ball.y > PITCH_CONFIG.CENTER_Y) : (this.ball.vy < -1.5 && this.ball.y < PITCH_CONFIG.CENTER_Y);
        const distSqToBall = (this.ball.x - player.x) ** 2 + (this.ball.y - player.y) ** 2;
        if (
          isShotComing &&
          distSqToBall < 55 * 55 &&
          !this.ball.ownerId &&
          !['goalkeeper_dive', 'gk_fingertip_parry', 'gk_low_smother', 'gk_punch', 'gk_high_catch', 'gk_star_spread'].includes(player.action)
        ) {
          player.action = 'goalkeeper_dive';
          player.actionTimer = 22;
          player.diveX = (this.ball.x - player.x) * 0.5;
          player.diveY = (this.ball.y - player.y) * 0.5;
          player.animFrame = 1; // medium height
          const dist = Math.sqrt(distSqToBall);
          if (dist < 42 && this.ball.z < 52) {
            processGoalkeeperShotReaction(player, this.ball, dist, isAttackingUp);
          }
        }

        return;
      }

      // --- OUTFIELD DEFENSIVE ACTIONS ---
      // --- Q: SHOULDER HIT DEFENDING ---
      if (keys.KeyQ) {
        executeShoulderHit(player, this.ball, this.players, this.referee, this.awardFoul.bind(this), this.setBanner.bind(this));
        keys.KeyQ = false;
        return;
      }

      // --- E: SHIRT PULL DEFENDING ---
      if (keys.KeyE) {
        executeShirtPull(player, this.players, this.referee, this.awardFoul.bind(this), this.setBanner.bind(this));
        keys.KeyE = false;
        return;
      }

      // --- S: STANDING TACKLE ---
      if (keys.KeyS) {
        this.executeStandingTackle(player);
        keys.KeyS = false;
      }

      // --- D: SLIDING TACKLE ---
      else if (keys.KeyD) {
        this.executeSlidingTackle(player);
        keys.KeyD = false;
      }

      // --- A: CLEARING THE BALL ---
      else if (keys.KeyA) {
        if (this.ball.isAirborne && this.ball.z >= 3.5 && distToBall < 35) {
          executeRusticVolleyClearance(player, this.ball, this.setBanner.bind(this));
        } else {
          this.executeClearance(player);
        }
        keys.KeyA = false;
      }

      // --- W: PUSHING / FOULING OPPONENT ---
      else if (keys.KeyW) {
        this.executePushFoul(player);
        keys.KeyW = false;
      }
    }
  }

  /**
   * Processes locomotion, sprinting, and shielding for secondary human player slots (2P, 3P, 4P)
   */
  private handleSecondarySlotsInput(slotKeys: Record<number, KeyState>, timeScale: number) {
    if (this.isSpectatorMode()) return;

    for (const slot of this.playerSlots) {
      if (slot.id === 1 || slot.side === 'spectator') continue;

      const pId = this.slotControlledPlayerIds[slot.id];
      const player = this.players.find(p => p.id === pId);
      if (!player) continue;

      if (
        player.action === 'sliding_tackle' ||
        player.action === 'fouled_falling' ||
        player.action === 'cruyff_turn' ||
        player.action === 'rainbow_flick'
      ) {
        continue;
      }

      const sk = slotKeys[slot.id];
      if (!sk) continue;

      const distToBall = Math.hypot(this.ball.x - player.x, this.ball.y - player.y);
      const hasBall = this.ball.ownerId === player.id || (!this.ball.ownerId && distToBall < 26 && this.ball.z < 8);

      // Defense control switch
      if (sk.Space && !hasBall) {
        this.switchControlToClosestDefender(slot.id);
        continue;
      }

      // Movement directional input
      let dx = 0;
      let dy = 0;
      if (sk.ArrowLeft) dx -= 1;
      if (sk.ArrowRight) dx += 1;
      if (sk.ArrowUp) dy -= 1;
      if (sk.ArrowDown) dy += 1;

      // Kickoff wake-up
      if (this.matchPhase === 'kickoff_ready' && (dx !== 0 || dy !== 0)) {
        this.matchPhase = 'in_play';
      }

      // Shielding
      if (hasBall && sk.KeyQ) {
        player.action = 'shielding';
        player.isShielding = true;
      } else {
        player.isShielding = false;
      }

      const pac = player.canonicalStats && 'pac' in player.canonicalStats ? player.canonicalStats.pac : 70;
      const dri = player.canonicalStats && 'dri' in player.canonicalStats ? player.canonicalStats.dri : 70;
      const bcl = player.canonicalStats && 'bcl' in player.canonicalStats ? player.canonicalStats.bcl : 70;
      const tier = getDribblingTier(dri);
      player.dribbleTier = tier;
      const topSpeed = hasBall ? calculateOnBallTopSpeed(pac, dri) : calculateOffBallTopSpeed(pac);
      const isSprinting = sk.Shift && (dx !== 0 || dy !== 0) && player.stamina > 5;
      const currentSpeed = isSprinting ? topSpeed : topSpeed * 0.68;

      updatePlayerStaminaDynamic(player, isSprinting, timeScale);

      if (dx !== 0 || dy !== 0) {
        const len = Math.hypot(dx, dy);
        const ndx = dx / len;
        const ndy = dy / len;
        const targetVx = ndx * currentSpeed * timeScale;
        const targetVy = ndy * currentSpeed * timeScale;

        // Phase 8.2: On-Ball Acceleration Ramp & Turn Radius for secondary slots
        if (hasBall && dri <= 99) {
          const accelRamp = calculateOnBallAccelerationRamp(dri, bcl);
          const turnRate = calculateOnBallTurnRate(dri, bcl);
          const blendRate = Math.min(1.0, turnRate * accelRamp * 1.5 * timeScale);
          player.vx += (targetVx - player.vx) * blendRate;
          player.vy += (targetVy - player.vy) * blendRate;

          const targetAngle = Math.atan2(ndy, ndx);
          let angleDiff = normalizeAngle(targetAngle - player.facingAngle);
          player.facingAngle += angleDiff * Math.min(1.0, turnRate * 2.4 * timeScale);
          updateFacingDirection(player, Math.cos(player.facingAngle), Math.sin(player.facingAngle));
        } else {
          player.vx = targetVx;
          player.vy = targetVy;
          player.facingAngle = Math.atan2(ndy, ndx);
          updateFacingDirection(player, ndx, ndy);
        }

        player.x += player.vx;
        player.y += player.vy;

        if (player.actionTimer <= 0 || !isKickingAction(player.action)) {
          player.action = hasBall ? 'dribbling' : 'running';
          player.animFrame = (player.animFrame + 1) % 6;
        }

        if (hasBall && this.ball.ownerId === player.id) {
          const touchDist = getDribblingTouchOffset(tier);
          this.ball.x = player.x + Math.cos(player.facingAngle) * touchDist;
          this.ball.y = player.y + Math.sin(player.facingAngle) * touchDist;
        }
      } else {
        player.vx = 0;
        player.vy = 0;
        if (player.action === 'running' || player.action === 'dribbling') {
          player.action = 'idle';
          player.animFrame = 0;
        }
      }

      // Action buttons execution for secondary player slot
      if (hasBall) {
        if (sk.KeyS) {
          const prevP1 = this.userControlledPlayerId;
          this.userControlledPlayerId = player.id;
          this.executeShortPass(player, 0.55, !!sk.KeyQ, !!sk.KeyE, sk);
          if (this.userControlledPlayerId !== player.id) {
            this.slotControlledPlayerIds[slot.id] = this.userControlledPlayerId;
          }
          this.userControlledPlayerId = prevP1;
          this.updateUserControlledFlag();
          sk.KeyS = false;
        } else if (sk.KeyA) {
          this.executeShot(player, 0.75, !!sk.KeyQ, !!sk.KeyE, sk);
          sk.KeyA = false;
        } else if (sk.KeyW) {
          const prevP1 = this.userControlledPlayerId;
          this.userControlledPlayerId = player.id;
          this.executeLongPass(player, 0.65, !!sk.KeyQ, !!sk.KeyE, sk);
          if (this.userControlledPlayerId !== player.id) {
            this.slotControlledPlayerIds[slot.id] = this.userControlledPlayerId;
          }
          this.userControlledPlayerId = prevP1;
          this.updateUserControlledFlag();
          sk.KeyW = false;
        } else if (sk.KeyD) {
          this.executeCross(player, 0.70, !!sk.KeyQ, !!sk.KeyE, sk);
          sk.KeyD = false;
        }
      } else {
        if (player.role === 'GK') {
          const isAttackingUp = (player.team === 'home') === this.homeAttacksUp;
          if (sk.KeyS) {
            // Sweeper Rush
            player.action = 'running';
            player.dashTimer = 35;
            const dist = Math.hypot(this.ball.x - player.x, this.ball.y - player.y);
            if (dist > 1) {
              player.facingAngle = Math.atan2(this.ball.y - player.y, this.ball.x - player.x);
              updateFacingDirection(player, Math.cos(player.facingAngle), Math.sin(player.facingAngle));
            }
            audio.playKick(0.4);
            sk.KeyS = false;
          } else if (sk.KeyW) {
            // 1v1 Star Spread
            player.action = 'gk_star_spread';
            player.actionTimer = 28;
            player.animFrame = 0;
            player.vx = 0;
            player.vy = 0;
            audio.playKick(0.7);
            sk.KeyW = false;
          } else if (sk.KeyD) {
            // High Dive
            player.action = 'gk_fingertip_parry';
            player.actionTimer = 26;
            player.animFrame = 0;
            const diveDx = dx !== 0 ? dx : (this.ball.x < player.x ? -1 : 1);
            const diveDy = dy !== 0 ? dy : (isAttackingUp ? 1 : -1);
            player.diveX = diveDx * 2.8;
            player.diveY = diveDy * 2.2;
            audio.playKick(0.8);
            sk.KeyD = false;
          } else if (sk.KeyA) {
            // Low Dive
            player.action = 'gk_low_smother';
            player.actionTimer = 25;
            player.animFrame = 0;
            const diveDx = dx !== 0 ? dx : (this.ball.x < player.x ? -1 : 1);
            const diveDy = dy !== 0 ? dy : (isAttackingUp ? 0.8 : -0.8);
            player.diveX = diveDx * 3.2;
            player.diveY = diveDy * 1.2;
            audio.playKick(0.75);
            sk.KeyA = false;
          } else if (sk.KeyQ) {
            // Aerial High Catch
            player.action = 'gk_high_catch';
            player.actionTimer = 26;
            player.animFrame = 0;
            player.vx = dx * 1.5;
            player.vy = dy * 1.5;
            audio.playKick(0.65);
            sk.KeyQ = false;
          } else if (sk.KeyE) {
            // Punch Clear
            player.action = 'gk_punch';
            player.actionTimer = 24;
            player.animFrame = 0;
            player.vx = dx * 1.8;
            player.vy = dy * 1.8;
            audio.playKick(0.9);
            sk.KeyE = false;
          }
        } else {
          if (sk.KeyS) {
            this.executeStandingTackle(player);
            sk.KeyS = false;
          } else if (sk.KeyD) {
            this.executeSlidingTackle(player);
            sk.KeyD = false;
          } else if (sk.KeyA) {
            this.executeClearance(player);
            sk.KeyA = false;
          } else if (sk.KeyW) {
            this.executePushFoul(player);
            sk.KeyW = false;
          }
        }
      }
    }
  }

  /**
   * Offside Rule Trigger:
   * Dynamic offside checks using defensive line positioning at the precise frame a pass is played.
   */
  public triggerOffside(
    incident: { isOffside: boolean; spotX: number; spotY: number; defensiveLineY: number },
    passingPlayer: Player
  ) {
    const defendingTeam = passingPlayer.team === 'home' ? 'away' : 'home';
    const defKit = defendingTeam === 'home' ? HOME_KIT : AWAY_KIT;

    this.lastOffsideIncident = {
      infringingPlayerId: passingPlayer.id,
      infringingTeam: passingPlayer.team,
      passStartX: passingPlayer.x,
      passStartY: passingPlayer.y,
      spotX: incident.spotX,
      spotY: incident.spotY,
      defensiveLineY: incident.defensiveLineY,
    };

    this.matchStats[passingPlayer.team].offsides++;
    audio.playWhistle(true);
    this.setBanner(`OFFSIDE! FREE KICK FOR ${defKit.name.toUpperCase()}`, 160);

    this.ball.vx = 0;
    this.ball.vy = 0;
    this.ball.vz = 0;
    this.ball.z = 0;
    this.ball.isAirborne = false;
    this.ball.ownerId = null;
    this.ball.lastTouchTeam = passingPlayer.team;
    this.ball.lastTouchPlayerId = passingPlayer.id;

    setupFreeKick(this, defendingTeam, incident.spotX, incident.spotY);
    this.updateUserControlledFlag();
  }

  /**
   * Action Execution Context for Phase 2 Modular Actions
   */
  public getActionExecutionContext(): ActionExecutionContext {
    return {
      players: this.players,
      ball: this.ball,
      setBanner: this.setBanner.bind(this),
      triggerOffside: this.triggerOffside.bind(this),
      updateUserControlledFlag: this.updateUserControlledFlag.bind(this),
      userControlledPlayerId: this.userControlledPlayerId,
      matchPhase: this.matchPhase,
      setMatchPhase: (phase: MatchPhase) => { this.matchPhase = phase; },
      stakeFactor: getStakeFactor(this.matchStakeTier),
      kickoffKickingTeam: this.kickoffKickingTeam,
      homeAttacksUp: this.homeAttacksUp,
    };
  }

  /**
   * Phase 2 — 1. Short Pass (S / Green S Button)
   * Crisp, low ground roll directly into the recipient's body for clean first-touch reception.
   */
  private executeShortPass(player: Player, power: number = 0.5, isSpecial: boolean = false, isKnuckle: boolean = false, keys?: KeyState) {
    this.matchStats[player.team].passesAttempted++;
    this.lastPassPlayerId = player.id;
    this.lastPassIsThroughBall = false;
    this.lastPassTimeSeconds = this.matchTimeSeconds;
    this.playerRatings.recordPassAttempt(player);

    const ctx = this.getActionExecutionContext();
    executeShortPassAction(ctx, player, power, isSpecial, isKnuckle, keys);
    if (ctx.userControlledPlayerId !== this.userControlledPlayerId) {
      this.userControlledPlayerId = ctx.userControlledPlayerId;
    }
  }

  /**
   * Phase 2 — 2. Long Pass / Through Ball (W / Red L Button) & ⚡ Chipped Long Pass (E + W)
   * Space ahead of target teammate in attack direction; leading space vector; or delicate chipped aerial through-ball.
   */
  private executeLongPass(player: Player, power: number = 0.5, isSpecial: boolean = false, isKnuckle: boolean = false, keys?: KeyState) {
    this.matchStats[player.team].passesAttempted++;
    this.lastPassPlayerId = player.id;
    this.lastPassIsThroughBall = true;
    this.lastPassTimeSeconds = this.matchTimeSeconds;
    this.playerRatings.recordPassAttempt(player);

    const ctx = this.getActionExecutionContext();
    executeLongPassAction(ctx, player, power, isSpecial, isKnuckle, keys);
    if (ctx.userControlledPlayerId !== this.userControlledPlayerId) {
      this.userControlledPlayerId = ctx.userControlledPlayerId;
    }
  }

  /**
   * Phase 2 — 4. Shoot (A / Orange S Button) & ⚡ Chip Shot (E + A)
   * High-velocity strike aimed toward corners/side netting; or delicate dink scoop lifting cleanly over rushing GK.
   */
  private executeShot(player: Player, power: number = 0.5, isSpecial: boolean = false, isKnuckle: boolean = false, keys?: KeyState) {
    this.matchStats[player.team].shots++;
    const ctx = this.getActionExecutionContext();
    executeShotAction(ctx, player, power, isSpecial, isKnuckle, keys);
    const isOnTarget = Math.abs(this.ball.x - PITCH_CONFIG.CENTER_X) < PITCH_CONFIG.GOAL_WIDTH / 2 + 45;
    if (isOnTarget) {
      this.matchStats[player.team].shotsOnTarget++;
    }
    this.playerRatings.recordShot(player, isOnTarget);
  }

  /**
   * Phase 2 — 3. Cross (D / Blue C Button) & ⚡ Chipped Cross (E + D)
   * Opposing team's penalty box corridor; whipped delivery for aerial duels; or high floating chipped cross for far-post runners.
   */
  private executeCross(player: Player, power: number = 0.5, isSpecial: boolean = false, isKnuckle: boolean = false, keys?: KeyState) {
    this.matchStats[player.team].passesAttempted++;
    this.lastPassPlayerId = player.id;
    this.lastPassIsThroughBall = true;
    this.lastPassTimeSeconds = this.matchTimeSeconds;
    this.playerRatings.recordPassAttempt(player);

    const ctx = this.getActionExecutionContext();
    executeCrossAction(ctx, player, power, isSpecial, isKnuckle, keys);
  }


  /**
   * S (Without ball): Standing tackle
   */
  /**
   * Checks whether the ball-carrier's physical body is directly blocking the defender's reach to the ball
   * "if they place their body in front you can't reach the ball so the opossing player's body can block your path"
   */
  public isBodyBlockingBall(defender: Player, carrier: Player): boolean {
    const dDefToBall = Math.hypot(this.ball.x - defender.x, this.ball.y - defender.y);
    const dDefToCarrier = Math.hypot(carrier.x - defender.x, carrier.y - defender.y);

    if (carrier.isShielding && this.ball.ownerId === carrier.id) {
      // When shielding [Q], the carrier actively positions their back between defender and ball
      return dDefToCarrier < dDefToBall + 8;
    }

    if (dDefToCarrier >= dDefToBall) {
      // Ball is closer to defender than carrier's center (ball is exposed on defender's side)
      return false;
    }

    // Project carrier onto line segment from defender to ball
    const segX = this.ball.x - defender.x;
    const segY = this.ball.y - defender.y;
    const lenSq = segX * segX + segY * segY;
    if (lenSq === 0) return false;

    const t = Math.max(0, Math.min(1, ((carrier.x - defender.x) * segX + (carrier.y - defender.y) * segY) / lenSq));
    const projX = defender.x + t * segX;
    const projY = defender.y + t * segY;
    const distToLine = Math.hypot(carrier.x - projX, carrier.y - projY);

    // Carrier body blocking radius: 14px
    return distToLine <= 14 && t > 0.05 && t < 0.95;
  }

  /**
   * Defender touches the ball from an opposing player without body obstruction:
   * Defender tries to tap the ball away, freeing it into open space ("Divided Ball")
   * "make it so that if you touch the ball from an opossing player your player tries to tap it away from them"
   */
  public executeBallTapAway(defender: Player, carrier: Player) {
    if (carrier.role === 'GK') return;

    this.ball.ownerId = null;
    this.ball.isDividedBall = true;
    this.ball.lastTouchTeam = defender.team;
    this.ball.lastTouchPlayerId = defender.id;

    // Tap/poke velocity away from defender into contested space
    const pokeAngle = Math.atan2(this.ball.y - defender.y, this.ball.x - defender.x);
    this.ball.vx = Math.cos(pokeAngle) * 4.6;
    this.ball.vy = Math.sin(pokeAngle) * 4.6;
    this.ball.vz = 0.3;

    audio.playKick(0.5);
    this.setBanner(`BALL POKED FREE BY ${defender.name.toUpperCase()}!`, 65);
  }

  /**
   * Resolves physical tackle contact between tackler and ball-carrier:
   * - Sliding from behind: tries to place leg in front; mistimed kicks opponent from behind -> CLEAR RED CARD!
   * - Standing from behind: tries to place leg in front; mistimed kicks legs -> FOUL + YELLOW CARD!
   * - From sides and front: sliding and standing are MUCH MORE EFFECTIVE!
   * - Body blocking: if carrier places body in front, defender cannot reach the ball!
   */
  public resolveTackleContact(tackler: Player, victim: Player, isSlide: boolean): boolean {
    const outcome = this.resolveTackleContactInternal(tackler, victim, isSlide);
    this.playerRatings.recordTackle(tackler, outcome);
    if (outcome) {
      this.playerRatings.recordDispossessed(victim);
    }
    return outcome;
  }

  private resolveTackleContactInternal(tackler: Player, victim: Player, isSlide: boolean): boolean {
    if (victim.role === 'GK' || victim.action === 'fouled_falling' || victim.isRedCarded || victim.team === tackler.team) return false;

    // Phase 7.5.6 & 7.5.7: Disable tackles during goal celebrations, set pieces, or match stoppages
    if (this.matchPhase !== 'in_play' && this.matchPhase !== 'kickoff_ready') return false;
    if (this.setPiece !== null) return false;

    // Relative angle from victim to tackler
    const angleVictimToTackler = Math.atan2(tackler.y - victim.y, tackler.x - victim.x);
    let relAngle = angleVictimToTackler - victim.facingAngle;
    while (relAngle > Math.PI) relAngle -= Math.PI * 2;
    while (relAngle < -Math.PI) relAngle += Math.PI * 2;

    const isFromBehind = Math.abs(relAngle) > 2.0; // > ~115 degrees (approaching from rear)
    const isFromSide = Math.abs(relAngle) >= 0.85 && Math.abs(relAngle) <= 2.0;
    const isFromFront = Math.abs(relAngle) < 0.85;

    const isBodyBlocking = this.isBodyBlockingBall(tackler, victim);

    // Rule: Cannot take ball from step-over with a tackle without a foul
    if (victim.isStepOverActive) {
      const seen = isIncidentSeenByReferee(this.referee, victim.x, victim.y);
      if (seen) {
        this.awardFoul(victim, victim.x, victim.y, tackler, isSlide ? 'yellow' : 'yellow');
        this.setBanner(t('illegalTackleOnStepover'), 140);
      } else {
        this.setBanner(t('refMissedIt'), 75);
      }
      return false;
    }

    // ⚡ Phase 6: Stat Break Duel Matrix Resolution (Surgical Extraction vs Immovable Juggernaut)
    const duelRes = resolveStatBreakDuel(victim, tackler, 'tackle');
    if (duelRes.traitTriggered !== 'Standard Duel') {
      if (duelRes.winner === 'attacker') {
        // Attacker shrugs off tackle completely! Defender stumbles back
        tackler.stumbleTimer = 18;
        tackler.vx *= 0.2;
        tackler.vy *= 0.2;
        victim.statBreakAuraTimer = 35;
        victim.statBreakTraitName = duelRes.traitTriggered;
        this.setBanner(`${duelRes.traitTriggered.toUpperCase()}: ${duelRes.reason}`, 90);
        audio.playStatBreakChime();
        return false;
      } else if (duelRes.winner === 'defender') {
        // Defender wins cleanly with Surgical Extraction! Clean steal with 0% foul risk
        this.ball.ownerId = tackler.id;
        this.ball.lastTouchTeam = tackler.team;
        this.ball.lastTouchPlayerId = tackler.id;
        tackler.statBreakAuraTimer = 35;
        tackler.statBreakTraitName = duelRes.traitTriggered;
        this.setBanner(`${duelRes.traitTriggered.toUpperCase()}: ${duelRes.reason}`, 90);
        audio.playStatBreakChime();
        return true;
      }
    }

    if (isSlide) {
      // --- SLIDING TACKLE ---
      if (isFromBehind) {
        // "sliding tackle from behind the player tries to come a bit from a side and place the leg in front to cut the ball,
        // it misstimed it kicks the opponent from behind resuklting in a clear red"
        const isDirectBehind = Math.abs(relAngle) > 2.55;
        const sld = tackler.canonicalStats && 'sld' in tackler.canonicalStats ? tackler.canonicalStats.sld : 75;
        const baseClean = calculateSlideCleanChance(sld);
        // Clean cut chance is low from behind; requires angled entry & timing
        const cleanCutChance = isDirectBehind ? (baseClean * 0.18) : (isBodyBlocking ? (baseClean * 0.30) : (baseClean * 0.50));

        if (Math.random() < cleanCutChance && !(victim.isShielding && this.ball.ownerId === victim.id)) {
          // Perfectly timed slide hook around side! Cuts ball in front
          this.ball.ownerId = null;
          this.ball.isDividedBall = true;
          this.ball.vx = tackler.slideVelocityX * 0.75;
          this.ball.vy = tackler.slideVelocityY * 0.75;
          this.ball.lastTouchTeam = tackler.team;
          this.ball.lastTouchPlayerId = tackler.id;
          this.setBanner(`CLEAN SLIDE HOOK FROM BEHIND!`, 80);
          audio.playKick(0.8);
          return true;
        } else {
          // MISTIMED! Kicks the opponent from behind -> CLEAR RED CARD!
          victim.action = 'fouled_falling';
          victim.actionTimer = 55;
          victim.vx = tackler.slideVelocityX * 0.45;
          victim.vy = tackler.slideVelocityY * 0.45;
          if (this.ball.ownerId === victim.id) {
            this.ball.ownerId = null;
            this.ball.isDividedBall = true;
          }
          const seen = isIncidentSeenByReferee(this.referee, victim.x, victim.y);
          if (seen) {
            this.awardFoul(victim, victim.x, victim.y, tackler, 'red');
            this.setBanner(`RED CARD FOR ${tackler.name.toUpperCase()}! DANGEROUS SLIDE FROM BEHIND!`, 180);
          } else {
            this.setBanner(t('refMissedIt'), 75);
          }
          return false;
        }
      } else {
        // SLIDING FROM SIDES OR FRONT: MUCH MORE EFFECTIVE!
        // Phase 6.3: Clean tackling & foul calibration scaling with difficulty and POS/SLD attributes
        const sld = tackler.canonicalStats && 'sld' in tackler.canonicalStats ? tackler.canonicalStats.sld : 75;
        const pos = tackler.canonicalStats && 'pos' in tackler.canonicalStats ? tackler.canonicalStats.pos : 70;
        const baseClean = calculateSlideCleanChance(sld);
        const diffCleanBonus = this.difficulty === 'legend' ? 0.22 : this.difficulty === 'elite' ? 0.15 : this.difficulty === 'normal' ? 0.05 : 0;
        const posBonus = (pos - 70) * 0.005;
        const cleanChance = Math.min(0.96, Math.max(0.15, (isBodyBlocking ? baseClean * 0.72 : baseClean) + diffCleanBonus + posBonus));

        if (Math.random() < cleanChance) {
          this.ball.ownerId = null;
          this.ball.isDividedBall = true;
          this.ball.vx = tackler.slideVelocityX * 0.85;
          this.ball.vy = tackler.slideVelocityY * 0.85;
          this.ball.lastTouchTeam = tackler.team;
          this.ball.lastTouchPlayerId = tackler.id;
          this.setBanner(isFromFront ? `FRONT SLIDE BLOCK!` : `SIDE SLIDE HOOK!`, 65);
          audio.playKick(0.75);
          return true;
        } else {
          // Clumsy foul: high-defending players rarely foul; low-stat defenders trip more often
          victim.action = 'fouled_falling';
          victim.actionTimer = 45;
          if (this.ball.ownerId === victim.id) this.ball.ownerId = null;
          const seen = isIncidentSeenByReferee(this.referee, victim.x, victim.y);
          if (seen) {
            // Front/side slide trip is a standard foul; only reckless/cynical slides get yellow
            const isCynicalCard = isBodyBlocking || sld < 60 || Math.random() < 0.28;
            this.awardFoul(victim, victim.x, victim.y, tackler, isCynicalCard ? 'yellow' : 'none');
          }
          return false;
        }
      }
    } else {
      // --- STANDING TACKLE ---
      const tck = tackler.canonicalStats && 'tck' in tackler.canonicalStats ? tackler.canonicalStats.tck : 75;
      const pos = tackler.canonicalStats && 'pos' in tackler.canonicalStats ? tackler.canonicalStats.pos : 70;
      const bcl = tackler.canonicalStats && 'bcl' in tackler.canonicalStats ? tackler.canonicalStats.bcl : 70;
      const baseClean = calculateStandingTackleCleanChance(tck);
      const diffCleanBonus = this.difficulty === 'legend' ? 0.20 : this.difficulty === 'elite' ? 0.14 : this.difficulty === 'normal' ? 0.05 : 0;
      const posBonus = (pos - 70) * 0.005;
      const cleanChance = Math.min(0.97, Math.max(0.20, baseClean + diffCleanBonus + posBonus));

      if (isFromBehind) {
        // "for standing from behind the player will try to place the leg in front of the opponent from behind coming from a side
        // misttime means you kick their legs, leads to a foul sometimes even a yellow"
        const isDirectBehind = Math.abs(relAngle) > 2.5;
        const behindCleanChance = isDirectBehind ? (cleanChance * 0.24) : (isBodyBlocking ? (cleanChance * 0.38) : (cleanChance * 0.62));

        if (Math.random() < behindCleanChance && !(victim.isShielding && this.ball.ownerId === victim.id)) {
          // Successfully places leg in front from side and pokes the ball
          this.executeBallTapAway(tackler, victim);
          this.setBanner(`POKED FREE FROM BEHIND!`, 65);
          return true;
        } else {
          // Mistimed: kicks their legs from behind! Leads to foul + yellow card
          victim.action = 'fouled_falling';
          victim.actionTimer = 50;
          victim.vx = (victim.x - tackler.x) * 0.18;
          victim.vy = (victim.y - tackler.y) * 0.18;
          if (this.ball.ownerId === victim.id) {
            this.ball.ownerId = null;
            this.ball.isDividedBall = true;
          }
          const seen = isIncidentSeenByReferee(this.referee, victim.x, victim.y);
          if (seen) {
            this.awardFoul(victim, victim.x, victim.y, tackler, 'yellow');
            this.setBanner(`FOUL FROM BEHIND! YELLOW CARD FOR ${tackler.name.toUpperCase()}!`, 150);
          } else {
            this.setBanner(t('refMissedIt'), 75);
          }
          return false;
        }
      } else {
        // STANDING TACKLE FROM SIDES OR FRONT: MUCH MORE EFFECTIVE!
        if (isBodyBlocking) {
          // Carrier places body in front: defender cannot reach through!
          this.setBanner(`BODY BLOCKED BY ${victim.name.toUpperCase()}!`, 55);
          return false;
        }

        if (Math.random() < cleanChance) {
          const stealToFeetChance = calculateStealToFeetChance(bcl);
          if (Math.random() < stealToFeetChance) {
            // Clean steal directly to feet!
            this.ball.ownerId = tackler.id;
            this.ball.lastTouchTeam = tackler.team;
            this.ball.lastTouchPlayerId = tackler.id;
            this.setBanner(isFromFront ? `FRONT STANDING BLOCK!` : `SIDE STANDING STRIP!`, 60);
          } else {
            // Dispossessed but ball tapped loose into space
            this.executeBallTapAway(tackler, victim);
          }
          audio.playKick(0.6);
          return true;
        } else {
          // Clumsy foul occurs mostly on low defending stat players (tck < 62 or pos < 60)
          const foulRisk = (1.0 - cleanChance) * (tck < 62 ? 0.60 : 0.18);
          if (Math.random() < foulRisk) {
            victim.action = 'fouled_falling';
            victim.actionTimer = 40;
            if (this.ball.ownerId === victim.id) {
              this.ball.ownerId = null;
              this.ball.isDividedBall = true;
            }
            const seen = isIncidentSeenByReferee(this.referee, victim.x, victim.y);
            if (seen) {
              this.awardFoul(victim, victim.x, victim.y, tackler, 'none');
              this.setBanner(`TRIPPING FOUL BY ${tackler.name.toUpperCase()}!`, 75);
            }
          }
          return false;
        }
      }
    }
  }

  /**
   * S (Without ball): Standing tackle with lunging block & angle resolution
   */
  private executeStandingTackle(player: Player) {
    if (this.matchPhase !== 'in_play' && this.matchPhase !== 'kickoff_ready') return;
    if (this.setPiece !== null) return;

    this.matchStats[player.team].tackles++;
    player.action = 'standing_tackle';
    player.actionTimer = 16;
    audio.playKick(0.35);

    const tck = player.canonicalStats && 'tck' in player.canonicalStats ? player.canonicalStats.tck : 75;
    const standingReach = 26 + (tck / 99) * 12;

    // Check if opponent with ball is within reach
    const opp = this.players.find(p => p.team !== player.team && this.ball.ownerId === p.id && !p.isRedCarded);
    if (opp) {
      const dist = Math.hypot(opp.x - player.x, opp.y - player.y);
      if (dist < standingReach) {
        this.resolveTackleContact(player, opp, false);
      }
    }
  }

  /**
   * D (Without ball): Sliding tackle with hooked leg sweep & angle resolution
   */
  private executeSlidingTackle(player: Player) {
    if (this.matchPhase !== 'in_play' && this.matchPhase !== 'kickoff_ready') return;
    if (this.setPiece !== null) return;

    this.matchStats[player.team].tackles++;
    player.action = 'sliding_tackle';
    player.actionTimer = PHYSICS.TACKLE_DURATION;

    const slideAngle = player.facingAngle;
    player.slideVelocityX = Math.cos(slideAngle) * PHYSICS.TACKLE_SLIDE_SPEED;
    player.slideVelocityY = Math.sin(slideAngle) * PHYSICS.TACKLE_SLIDE_SPEED;

    audio.playSlide();

    // Turf particles from slide
    for (let i = 0; i < 7; i++) {
      this.particles.push({
        x: player.x - Math.cos(slideAngle) * 8,
        y: player.y - Math.sin(slideAngle) * 8,
        z: 0,
        vx: -Math.cos(slideAngle) * 2 + (Math.random() - 0.5),
        vy: -Math.sin(slideAngle) * 2 + (Math.random() - 0.5),
        vz: Math.random() * 2.8,
        color: '#2a5e1e',
        life: 0,
        maxLife: 22,
        size: 2.5,
      });
    }

    // Check collision with ball carrier using canonical Slide Reach (SLD)
    const opp = this.players.find(p => p.team !== player.team && this.ball.ownerId === p.id && !p.isRedCarded);
    if (opp) {
      const sld = player.canonicalStats && 'sld' in player.canonicalStats ? player.canonicalStats.sld : 75;
      const slideReach = calculateSlideReach(sld);
      const dist = Math.hypot(opp.x - player.x, opp.y - player.y);
      if (dist < slideReach) {
        this.resolveTackleContact(player, opp, true);
      }
    }
  }

  /**
   * A (Without ball): Clear the ball up the pitch with massive high clearance animation!
   */
  private executeClearance(player: Player) {
    const dist = Math.hypot(this.ball.x - player.x, this.ball.y - player.y);
    if (dist < 42) {
      player.action = 'clearing';
      player.actionTimer = 20;
      this.ball.ownerId = null;
      this.ball.lastTouchTeam = player.team;
      this.ball.lastTouchPlayerId = player.id;
      this.ball.lastKickAction = 'clearance';
      this.ball.lastKickPower = 0.90;
      this.ball.isDividedBall = true;

      // Clear upwards towards rival half
      const clearDirY = player.team === 'home' ? -1 : 1;
      this.ball.vx = (Math.random() - 0.5) * 4;
      this.ball.vy = clearDirY * 9.5;
      this.ball.vz = 6.2; // Massive towering high clearing boot!
      this.ball.isAirborne = true;

      this.bannerMessage = 'HOOFED CLEAR OF DANGER!';
      this.bannerTimer = 75;
      audio.playKick(1.0);
    }
  }

  /**
   * W (Without ball): Push opponent AKA foul them with emphatic two-handed shove animation!
   */
  private executePushFoul(player: Player) {
    if (this.matchPhase !== 'in_play' && this.matchPhase !== 'kickoff_ready') return;
    if (this.setPiece !== null) return;

    // Find closest opponent
    let closestOpp: Player | null = null;
    let closestDist = Infinity;
    for (const opp of this.players) {
      if (opp.team !== player.team && opp.action !== 'fouled_falling' && !opp.isRedCarded) {
        const d = Math.hypot(opp.x - player.x, opp.y - player.y);
        if (d < closestDist) {
          closestDist = d;
          closestOpp = opp;
        }
      }
    }

    if (closestOpp && closestDist < 40) {
      // Execute push! Pusher plays the aggressive shove animation
      player.action = 'pushing_foul';
      player.actionTimer = 18;

      // Knock opponent down with dramatic stumble & turf tumble
      closestOpp.action = 'fouled_falling';
      closestOpp.actionTimer = PHYSICS.FOUL_KNOCKDOWN_DURATION;
      closestOpp.vx = (closestOpp.x - player.x) * 0.32;
      closestOpp.vy = (closestOpp.y - player.y) * 0.32;

      // Strip ball if opponent had it -> becomes divided ball
      if (this.ball.ownerId === closestOpp.id) {
        this.ball.ownerId = null;
        this.ball.isDividedBall = true;
        this.ball.vx = (Math.random() - 0.5) * 3;
        this.ball.vy = (Math.random() - 0.5) * 3;
      }

      audio.playFoul();

      // Check if referee sees the push!
      const seen = isIncidentSeenByReferee(this.referee, player.x, player.y);
      if (seen) {
        this.awardFoul(closestOpp, closestOpp.x, closestOpp.y, player, 'yellow');
        this.setBanner(`FOUL! DELIBERATE PUSH BY ${player.name.toUpperCase()}!`, 120);
      } else {
        this.setBanner(t('refMissedIt'), 80);
      }
    }
  }

  public awardFoul(
    victim: Player,
    foulX: number,
    foulY: number,
    offender?: Player,
    cardType: 'yellow' | 'red' | 'none' = 'yellow'
  ) {
    if (
      this.matchPhase === 'goal_celebration' ||
      this.matchPhase === 'goal_scored' ||
      this.matchPhase === 'half_time' ||
      this.matchPhase === 'full_time' ||
      this.setPiece !== null
    ) {
      return;
    }

    this.referee.whistleTimer = 45;
    this.referee.x = foulX + 25;
    this.referee.y = foulY - 15;
    audio.playWhistle(true);
    audio.playFoul();

    let isRed = cardType === 'red';

    if (offender) {
      this.matchStats[offender.team].fouls++;
      if (cardType === 'yellow') {
        if (offender.hasYellowCard) {
          // Second yellow card -> RED!
          isRed = true;
          this.matchStats[offender.team].redCards++;
        } else {
          offender.hasYellowCard = true;
          this.matchStats[offender.team].yellowCards++;
          this.referee.cardDisplay = 'yellow';
          this.referee.cardPlayerName = offender.name;
        }
      } else if (cardType === 'red') {
        this.matchStats[offender.team].redCards++;
      }

      this.playerRatings.recordFoul(offender, victim, isRed ? 'red' : cardType);

      if (isRed) {
        offender.isRedCarded = true;
        this.referee.cardDisplay = 'red';
        this.referee.cardPlayerName = offender.name;
        this.recordStoppageEvent('injury');

        // Sent off to sideline / dugout
        offender.x = PITCH_CONFIG.PITCH_LEFT - 75;
        offender.y = PITCH_CONFIG.CENTER_Y;
        offender.vx = 0;
        offender.vy = 0;
        offender.action = 'idle';

        // Auto-switch user control if offender was controlled
        if (this.userControlledPlayerId === offender.id) {
          const nextMate = this.players.find(p => p.team === offender.team && !p.isRedCarded && p.role !== 'GK');
          if (nextMate) {
            this.userControlledPlayerId = nextMate.id;
            this.updateUserControlledFlag();
          }
        }
      }
    }

    if (victim.actionTimer && victim.actionTimer >= 45) {
      this.recordStoppageEvent('injury');
    }

    const victimTeam = victim.team;
    const isVictimAttackingUp = (victimTeam === 'home') === this.homeAttacksUp;
    const isInsideBox = isInsideDefendingPenaltyBox(foulX, foulY, isVictimAttackingUp);
    const teamName = victimTeam === 'home' ? this.homeTeam.name.toUpperCase() : this.awayTeam.name.toUpperCase();
    const cardText = isRed ? 'RED CARD' : cardType === 'yellow' ? 'YELLOW CARD' : 'FOUL';

    // Section 1.2 Context-Aware Free Kick at the Death:
    if (this.isPeriodOver() && !isInsideBox) {
      const targetGoalY = isVictimAttackingUp ? PITCH_CONFIG.PITCH_TOP : PITCH_CONFIG.PITCH_BOTTOM;
      const distToGoal = Math.abs(foulY - targetGoalY);
      if (distToGoal < 560) {
        if (this.deathSetPieceDecision === null) {
          this.deathSetPieceDecision = Math.random() < 0.70 ? 'allow' : 'blow';
        }
        if (this.deathSetPieceDecision === 'blow') {
          this.checkPeriodEndWhistle();
          return;
        }
      } else {
        this.checkPeriodEndWhistle();
        return;
      }
    }

    if (isInsideBox) {
      setupPenalty(this, victimTeam);
      this.setBanner(`PENALTY FOR ${teamName}! ${cardText} FOR ${offender ? offender.name.toUpperCase() : 'DEFENDER'}!`, 180);
    } else {
      setupFreeKick(this, victimTeam, foulX, foulY);
      this.setBanner(`FREE KICK FOR ${teamName}! ${cardText} FOR ${offender ? offender.name.toUpperCase() : 'DEFENDER'}!`, 180);
    }
  }

  public setBanner(message: string, timer: number = 90) {
    this.bannerMessage = message;
    this.bannerTimer = timer;
  }

  /**
   * Header contest when ball is in the air (governed by HEA, CMP, aerial duels, and match stakes)
   */
  private executeHeader(player: Player) {
    const isAttackingUp = (player.team === 'home') === this.homeAttacksUp;
    const targetGoalY = isAttackingUp ? PITCH_CONFIG.PITCH_TOP : PITCH_CONFIG.PITCH_BOTTOM;
    const dx = PITCH_CONFIG.CENTER_X - player.x;
    const dy = targetGoalY - player.y;
    const dist = Math.hypot(dx, dy) || 1;

    // Phase 8.5: Contested Aerial Duel Clash
    let duelWinner = player;
    let isContested = false;
    const rivalAerialContender = this.players.find(
      opp =>
        opp.team !== player.team &&
        !opp.isRedCarded &&
        opp.role !== 'GK' &&
        Math.hypot(opp.x - player.x, opp.y - player.y) < 28
    );

    if (rivalAerialContender) {
      const duelRes = animationEngine.resolveAerialContest(player, rivalAerialContender, this.ball);
      isContested = true;
      duelWinner = duelRes.winner;
      duelRes.loser.action = 'contested_duel';
      duelRes.loser.actionTimer = 22;
      duelRes.loser.animFrame = 0;
      duelRes.loser.stumbleTimer = 24;
      this.playerRatings.recordAerialDuel(duelRes.winner, duelRes.loser);
      this.setBanner(`💥 AERIAL DUEL: ${duelWinner.name.toUpperCase()} WINS HEADER!`, 70);
    }

    // Execute header strike through the duel winner
    const headerTaker = duelWinner;
    const hea = headerTaker.canonicalStats && 'hea' in headerTaker.canonicalStats ? headerTaker.canonicalStats.hea : 75;
    const cmp = headerTaker.canonicalStats && 'cmp' in headerTaker.canonicalStats ? headerTaker.canonicalStats.cmp : 70;
    const accuracy = calculateHeaderAccuracy(hea, cmp, getStakeFactor(this.matchStakeTier));
    const isAccurate = Math.random() < accuracy;

    // Phase 9.2: Timing window calculation
    const timing = animationEngine.evaluateAerialTimingStrike(headerTaker, this.ball, false);

    let aimAngle = Math.atan2(dy, dx);
    if (!isAccurate || timing.quality === 'mistimed') {
      const spread = timing.quality === 'mistimed' ? 45 : 30;
      aimAngle += ((Math.random() - 0.5) * spread * Math.PI) / 180;
    }

    const isSkyWalk = isStatBreak(hea);
    if (isSkyWalk) {
      headerTaker.statBreakAuraTimer = 35;
      headerTaker.statBreakTraitName = '⚡ Sky Walk & Bullet Header';
      audio.playStatBreakChime();
    }

    // Check if defender in own defensive half making a clearance header
    const isDefender = headerTaker.role === 'CB1' || headerTaker.role === 'CB2' || headerTaker.role === 'LB' || headerTaker.role === 'RB' || headerTaker.primaryPos === 'DEF';
    const inDefArea = isAttackingUp ? headerTaker.y > PITCH_CONFIG.CENTER_Y : headerTaker.y < PITCH_CONFIG.CENTER_Y;
    const isClearance = isDefender && inDefArea;

    // Phase 8.5 & Phase 9.2: Expressive Header Style Selection
    const headerStyle = isSkyWalk
      ? 'bullet_header'
      : animationEngine.resolveHeaderStyle(headerTaker, this.ball, dist, isClearance);

    headerTaker.action = headerStyle;
    headerTaker.actionTimer = 22;
    headerTaker.animFrame = 0;

    let headerSpeed = isSkyWalk ? 9.5 : 5.4 + (hea / 99) * 2.8;
    headerSpeed *= timing.powerMultiplier;
    if (isContested) headerSpeed *= 1.1;

    let ballVz = -2.2;
    let ballSpinY = -1.6;

    if (isClearance) {
      // Towering defensive clearance header booting ball upfield out of danger
      const clearDirY = isAttackingUp ? -1 : 1;
      aimAngle = Math.atan2(clearDirY * 9.0, (Math.random() - 0.5) * 5.0);
      headerSpeed = isSkyWalk ? 11.2 : 7.8 + (hea / 99) * 3.2;
      ballVz = 5.4;
      ballSpinY = -1.4;
      this.setBanner(`⚡ TOWERING DEFENSIVE HEADER CLEARANCE BY ${headerTaker.name.toUpperCase()}!`, 75);
    } else if (headerStyle === 'bullet_header') {
      // Downward bullet header driving forehead through ball to bounce off turf
      ballVz = isSkyWalk ? -3.8 : -3.2;
      ballSpinY = -2.4;
      headerSpeed *= 1.12;
      this.setBanner(`⚡ BULLET HEADER BY ${headerTaker.name.toUpperCase()}!`, 70);
    } else if (headerStyle === 'diving_header') {
      // Forward horizontal torpedo launch
      headerTaker.vx = Math.cos(aimAngle) * 3.4;
      headerTaker.vy = Math.sin(aimAngle) * 3.4;
      ballVz = -1.4;
      ballSpinY = -0.8;
      this.setBanner(`🚀 DIVING HEADER BY ${headerTaker.name.toUpperCase()}!`, 70);
    } else if (headerStyle === 'glancing_header') {
      // Delicate near-post flick-on altering ball vector
      aimAngle += headerTaker.x < PITCH_CONFIG.CENTER_X ? 0.35 : -0.35;
      ballVz = -1.6;
      ballSpinY = 1.2;
      this.setBanner(`🎯 GLANCING HEADER BY ${headerTaker.name.toUpperCase()}!`, 70);
    } else if (isSkyWalk) {
      this.bannerMessage = `⚡ SKY WALK & BULLET HEADER BY ${headerTaker.name.toUpperCase()}! [STAT BREAK]`;
    } else if (!isContested) {
      this.bannerMessage = `${headerTaker.name.toUpperCase()} HEADER!`;
    }

    this.ball.ownerId = null;
    this.ball.lastTouchTeam = headerTaker.team;
    this.ball.lastTouchPlayerId = headerTaker.id;
    this.ball.vx = Math.cos(aimAngle) * headerSpeed;
    this.ball.vy = Math.sin(aimAngle) * headerSpeed;
    this.ball.vz = ballVz;
    this.ball.z = Math.max(12, this.ball.z);
    this.ball.spin = (Math.random() - 0.5) * 2.0;
    this.ball.spinY = ballSpinY;

    this.bannerTimer = 65;
    audio.playKick(isSkyWalk ? 0.95 : 0.75);
  }

  /**
   * Phase 9.2: AI Volley Execution (half-volley, side volley, diving volley, acrobatic bicycle/scissor)
   */
  private executeAiVolley(player: Player, decision: any) {
    const isAttackingUp = (player.team === 'home') === this.homeAttacksUp;
    const targetGoalY = isAttackingUp ? PITCH_CONFIG.PITCH_TOP : PITCH_CONFIG.PITCH_BOTTOM;
    const dx = PITCH_CONFIG.CENTER_X - player.x;
    const dy = targetGoalY - player.y;
    const dist = Math.hypot(dx, dy) || 1;
    const isDefender = player.role === 'CB1' || player.role === 'CB2' || player.role === 'LB' || player.role === 'RB' || player.primaryPos === 'DEF';
    const inDefArea = isAttackingUp ? player.y > PITCH_CONFIG.CENTER_Y : player.y < PITCH_CONFIG.CENTER_Y;
    const isClearance = decision?.volleyType === 'rustic_clearance' || (isDefender && inDefArea);

    const volleyStyle = isClearance
      ? 'volley'
      : animationEngine.resolveVolleyStyle(player, this.ball, dist, false);

    player.action = volleyStyle;
    player.actionTimer = 22;
    player.animFrame = 0;

    const timing = animationEngine.evaluateAerialTimingStrike(player, this.ball, true);

    this.ball.ownerId = null;
    this.ball.lastTouchTeam = player.team;
    this.ball.lastTouchPlayerId = player.id;
    this.ball.isAirborne = true;
    this.ball.isDividedBall = true;

    if (isClearance) {
      const clearDirY = isAttackingUp ? -1 : 1;
      this.ball.vx = (Math.random() - 0.5) * 5.0;
      this.ball.vy = clearDirY * (9.5 + Math.random() * 3.5);
      this.ball.vz = 6.2; // Rustic upfield trajectory
      audio.playRusticClearance();
      this.setBanner(`⚡ RUSTIC VOLLEY CLEARANCE BY ${player.name.toUpperCase()}!`, 75);
      return;
    }

    let aimAngle = Math.atan2(dy, dx);
    if (timing.quality === 'mistimed') {
      aimAngle += ((Math.random() - 0.5) * 35 * Math.PI) / 180;
    }

    let speed = (8.4 + (decision?.power || 0.8) * 4.6) * timing.powerMultiplier;
    this.ball.vx = Math.cos(aimAngle) * speed;
    this.ball.vy = Math.sin(aimAngle) * speed;

    if (volleyStyle === 'half_volley') {
      this.ball.vz = 0.9;
      this.ball.spinY = -1.5;
      audio.playVolleyStrike(1.1);
      this.setBanner(`⚡ THUMPING HALF-VOLLEY BY ${player.name.toUpperCase()}!`, 85);
    } else if (volleyStyle === 'diving_volley') {
      player.vx = Math.cos(aimAngle) * 3.4;
      player.vy = Math.sin(aimAngle) * 3.4;
      this.ball.vz = 1.6;
      audio.playAcrobaticStrike();
      this.setBanner(`🚀 DIVING VOLLEY BY ${player.name.toUpperCase()}!`, 85);
    } else if (volleyStyle === 'bicycle_kick' || volleyStyle === 'scissor_kick') {
      this.ball.vz = 2.4;
      audio.playAcrobaticStrike();
      this.setBanner(`⭐ ACROBATIC OVERHEAD STRIKE BY ${player.name.toUpperCase()}!`, 90);
    } else {
      this.ball.vz = 1.8;
      audio.playVolleyStrike(0.9);
      this.setBanner(`CRISP VOLLEY BY ${player.name.toUpperCase()}!`, 75);
    }
  }

  /**
   * Phase 4: Synchronised Modern Compact Positioning Foundation (AI Core - Part 1)
   * Calculates elastic block shapes, clamped 25-35m vertical span, and rest-defence
   */
  private updateTeamBlocks() {
    const homeHasBall = this.players.some(p => p.team === 'home' && p.id === this.ball.ownerId);
    const awayHasBall = this.players.some(p => p.team === 'away' && p.id === this.ball.ownerId);

    const homeCounterPressFrames = getCounterPressDurationFrames(this.difficulty, this.homePlaystyle, this.homeTactics);
    const awayCounterPressFrames = getCounterPressDurationFrames(this.difficulty, this.awayPlaystyle, this.awayTactics);

    const homeFramesSinceLost = this.frameCount - this.possessionLostFrame.home;
    const awayFramesSinceLost = this.frameCount - this.possessionLostFrame.away;

    this.homeBlockPhase = determineTeamBlockPhase(
      homeHasBall,
      homeFramesSinceLost,
      homeCounterPressFrames,
      this.ball.y,
      this.homeAttacksUp,
      this.homePlaystyle,
      this.homeTactics
    );

    this.awayBlockPhase = determineTeamBlockPhase(
      awayHasBall,
      awayFramesSinceLost,
      awayCounterPressFrames,
      this.ball.y,
      !this.homeAttacksUp,
      this.awayPlaystyle,
      this.awayTactics
    );

    updateTeamBlockShape(
      'home',
      this.ball,
      this.homeBlockPhase,
      this.difficulty,
      this.players,
      this.homeAttacksUp,
      this.homePlaystyle,
      this.homeTactics
    );

    updateTeamBlockShape(
      'away',
      this.ball,
      this.awayBlockPhase,
      this.difficulty,
      this.players,
      !this.homeAttacksUp,
      this.awayPlaystyle,
      this.awayTactics
    );
  }

  /**
   * Runs AI update for non-user-controlled players
   */
  private handleAI() {
    // Phase 4: Synchronised Modern Compact Block Shape Update (Zero Heap Allocations)
    this.updateTeamBlocks();

    // If during a dead-ball set piece waiting for kick/throw, non-takers hold position
    if (this.setPiece && (this.matchPhase === 'penalty' || this.matchPhase === 'free_kick' || this.matchPhase === 'corner_kick' || this.matchPhase === 'goal_kick' || this.matchPhase === 'throw_in')) {
      return;
    }

    const isKickoff = this.matchPhase === 'kickoff_ready';
    const scoreDiff = this.score.away - this.score.home;

    for (let i = 0; i < this.players.length; i++) {
      const p = this.players[i];
      const isHuman =
        !this.isSpectatorMode() &&
        (Object.values(this.slotControlledPlayerIds).includes(p.id) || p.id === this.userControlledPlayerId);
      if (isHuman) continue;

      // Phase 5: Dynamic Stamina update for AI players
      const isAiSprinting = Math.hypot(p.vx, p.vy) > 3.0;
      updatePlayerStaminaDynamic(p, isAiSprinting, this.getTimeScale());

      const isAttackingUp = (p.team === 'home') === this.homeAttacksUp;
      const playstyle = p.team === 'home' ? this.homePlaystyle : this.awayPlaystyle;
      const tactics = p.team === 'home' ? this.homeTactics : this.awayTactics;
      const matchTimeMin = this.matchTimeSeconds / 60;
      const decision = updatePlayerAI(
        p,
        this.players,
        this.ball,
        isAttackingUp,
        this.difficulty,
        scoreDiff,
        isKickoff,
        this.getTimeScale(),
        playstyle,
        matchTimeMin,
        tactics,
        i,
        this.frameCount
      );

      if (decision) {
        p.isShielding = false;
        if (this.matchPhase === 'kickoff_ready') {
          this.matchPhase = 'in_play';
        }
        if (decision.action === 'shoot') {
          this.matchStats[p.team].shots++;
          const tx = decision.targetX || PITCH_CONFIG.CENTER_X;
          if (Math.abs(tx - PITCH_CONFIG.CENTER_X) < PITCH_CONFIG.GOAL_WIDTH / 2 + 45) {
            this.matchStats[p.team].shotsOnTarget++;
          }
          const isMoving = Math.hypot(p.vx, p.vy) > 0.5;
          const shotType = decision.shotType || 'finesse';
          const isChip = shotType === 'chip' || decision.isAerialLob;

          p.action = isMoving ? 'running_shot' : 'standing_shot';
          p.actionTimer = 16;
          const ty = decision.targetY || (isAttackingUp ? PITCH_CONFIG.PITCH_TOP : PITCH_CONFIG.PITCH_BOTTOM);
          const dx = tx - p.x;
          const dy = ty - p.y;
          const dist = Math.hypot(dx, dy) || 1;

          this.ball.ownerId = null;
          this.ball.lastTouchTeam = p.team;
          this.ball.lastTouchPlayerId = p.id;
          this.ball.isDividedBall = true;
          this.ball.isAirborne = true;

          if (isChip) {
            // Delicate dink scoop lifting cleanly over the goalkeeper
            this.ball.lastKickAction = 'shoot';
            this.ball.lastKickPower = 0.65;
            this.ball.vx = (dx / dist) * 5.6;
            this.ball.vy = (dy / dist) * 5.6;
            this.ball.vz = 4.8;
            this.ball.spin = (Math.random() - 0.5) * 1.5;
            this.ball.spinY = -1.8; // Soft backspin
            audio.playKick(0.7);
            this.setBanner(`${p.name.toUpperCase()} DELICATE DINK CHIP OVER THE KEEPER!`, 90);
          } else if (shotType === 'driven') {
            // Bullet rocket driven hard and low into corners
            this.ball.lastKickAction = 'shoot';
            this.ball.lastKickPower = 0.96;
            this.ball.vx = (dx / dist) * 11.2;
            this.ball.vy = (dy / dist) * 11.2;
            this.ball.vz = 0.9;
            this.ball.spin = p.x < PITCH_CONFIG.CENTER_X ? 1.5 : -1.5;
            this.ball.spinY = 1.0;
            audio.playKick(1.0);
            this.setBanner(`${p.name.toUpperCase()} DRIVEN ROCKET INTO THE CORNER!`, 85);
          } else {
            // Finesse curling strike bent around the goalkeeper
            this.ball.lastKickAction = 'shoot';
            this.ball.lastKickPower = 0.84;
            this.ball.vx = (dx / dist) * 8.6;
            this.ball.vy = (dy / dist) * 8.6;
            this.ball.vz = 2.0;
            this.ball.spin = p.x < PITCH_CONFIG.CENTER_X ? 3.5 : -3.5;
            this.ball.spinY = -0.8;
            audio.playKick(0.9);
          }
        } else if (decision.action === 'pass') {
          this.matchStats[p.team].passesAttempted++;
          const isGK = p.role === 'GK';
          const isMoving = Math.hypot(p.vx, p.vy) > 0.5;
          p.action = isMoving ? 'running_pass' : 'standing_pass';
          p.actionTimer = isGK ? 16 : 12;
          const tx = decision.targetX || p.x;
          const ty = decision.targetY || (isAttackingUp ? p.y - 80 : p.y + 80);
          const dx = tx - p.x;
          const dy = ty - p.y;
          const dist = Math.hypot(dx, dy) || 1;
          const aimAngle = Math.atan2(dy, dx);
          p.facingAngle = aimAngle;

          this.ball.ownerId = null;
          this.ball.lastTouchTeam = p.team;
          this.ball.lastTouchPlayerId = p.id;
          this.ball.lastKickAction = 'pass';
          this.ball.lastKickPower = 0.45;
          this.ball.isDividedBall = true;

          if (isGK) {
            // Position ball 32px forward outside goalkeeper pickup radius
            this.ball.x = p.x + Math.cos(aimAngle) * 32;
            this.ball.y = p.y + Math.sin(aimAngle) * 32;
            p.gkHoldTimer = -75; // Release cooldown prevents immediate re-grabbing!
          }

          const passSpeed = isGK ? 10.5 : Math.min(13.5, Math.max(8.0, dist * 0.065));
          this.ball.vx = (dx / dist) * passSpeed;
          this.ball.vy = (dy / dist) * passSpeed;
          this.ball.vz = 0.15;
          this.ball.spin = (Math.random() - 0.5) * 1.5;
          this.ball.spinY = 0;
          this.ball.isAirborne = false;
          audio.playKick(0.65);

          // Alert receiver and switch user control if Home team
          if (decision.receiverId) {
            const receiver = this.players.find(pl => pl.id === decision.receiverId);
            if (receiver) {
              receiver.targetX = decision.targetX || this.ball.x;
              receiver.targetY = decision.targetY || this.ball.y;
              // Phase 6.1: Anti-Spam pass tracking
              receiver.lastPassPartnerId = p.id;
              if (p.lastPassPartnerId === receiver.id) {
                receiver.consecutiveBackPasses = (p.consecutiveBackPasses || 0) + 1;
              } else {
                receiver.consecutiveBackPasses = 0;
              }
            }
            if (p.team === 'home') {
              this.userControlledPlayerId = decision.receiverId;
              this.updateUserControlledFlag();
              if (isGK) {
                this.setBanner(`GOALKEEPER DISTRIBUTES TO BUILD PLAY!`, 75);
              }
            }
          }
        } else if (decision.action === 'long_pass') {
          this.matchStats[p.team].passesAttempted++;
          const isMoving = Math.hypot(p.vx, p.vy) > 0.5;
          p.action = isMoving ? 'running_long_pass_low' : 'standing_long_pass_low';
          p.actionTimer = 14;
          const tx = decision.targetX || (isAttackingUp ? p.x : p.x);
          const ty = decision.targetY || (isAttackingUp ? p.y - 140 : p.y + 140);
          const dx = tx - p.x;
          const dy = ty - p.y;
          const dist = Math.hypot(dx, dy) || 1;
          const aimAngle = Math.atan2(dy, dx);
          p.facingAngle = aimAngle;

          this.ball.ownerId = null;
          this.ball.lastTouchTeam = p.team;
          this.ball.lastTouchPlayerId = p.id;
          this.ball.lastKickAction = 'long_pass';
          this.ball.lastKickPower = decision.power || 0.65;
          this.ball.isDividedBall = true;

          if (decision.isChipped) {
            // Chipped through ball over defenders
            const speed = 11.8;
            this.ball.vx = (dx / dist) * speed;
            this.ball.vy = (dy / dist) * speed;
            this.ball.vz = 4.4;
            this.ball.spin = 0;
            this.ball.spinY = -1.6;
            this.ball.isAirborne = true;
            this.ball.isSpecialCurve = false;
            audio.playKnuckleStrike(0.85);
            this.setBanner(`${p.name.toUpperCase()} CHIPS THROUGH-BALL OVER DEFENSE!`, 75);
          } else if (decision.isCurved) {
            // Swerving curved through ball
            const speed = 11.2;
            this.ball.vx = (dx / dist) * speed;
            this.ball.vy = (dy / dist) * speed;
            this.ball.vz = 1.4;
            this.ball.spin = (tx < p.x ? -5.0 : 5.0);
            this.ball.spinY = 1.6;
            this.ball.isSpecialCurve = true;
            this.ball.isAirborne = true;
            audio.playSpecialCurveKick();
            this.setBanner(`${p.name.toUpperCase()} CURVES BENT THROUGH-BALL AROUND DEFENDER!`, 75);
          } else if (dist > 320 || (decision.power || 0.65) >= 0.70) {
            // Phase 7.1: True Long-Range Aerial Driven Long Pass
            const speed = 19.5 + (decision.power || 0.75) * 10.0;
            this.ball.vx = (dx / dist) * speed;
            this.ball.vy = (dy / dist) * speed;
            const distRatio = Math.min(1.0, dist / 1500);
            this.ball.vz = 2.4 + (decision.power || 0.75) * 2.0 + distRatio * 1.5;
            this.ball.z = 0.5;
            this.ball.spin = (Math.random() - 0.5) * 1.2;
            this.ball.spinY = -1.2;
            this.ball.isAirborne = true;
            this.ball.isSpecialCurve = false;
            audio.playKick(0.9);
            this.setBanner(`${p.name.toUpperCase()} PINGS PINPOINT LONG PASS INTO SPACE!`, 75);
          } else {
            // High velocity ground driven through-ball
            const speed = 14.5;
            this.ball.vx = (dx / dist) * speed;
            this.ball.vy = (dy / dist) * speed;
            this.ball.vz = 0;
            this.ball.z = 0;
            this.ball.spin = (Math.random() - 0.5) * 1.0;
            this.ball.spinY = 0;
            this.ball.isAirborne = false;
            this.ball.isSpecialCurve = false;
            audio.playKick(0.85);
            this.setBanner(`${p.name.toUpperCase()} THREADS DRIVEN THROUGH-BALL INTO SPACE!`, 75);
          }

          if (decision.receiverId) {
            const receiver = this.players.find(pl => pl.id === decision.receiverId);
            if (receiver) {
              receiver.targetX = tx;
              receiver.targetY = ty;
              receiver.action = 'running';
              receiver.actionTimer = 0;
              // Phase 6.1: Anti-Spam pass tracking
              receiver.lastPassPartnerId = p.id;
              if (p.lastPassPartnerId === receiver.id) {
                receiver.consecutiveBackPasses = (p.consecutiveBackPasses || 0) + 1;
              } else {
                receiver.consecutiveBackPasses = 0;
              }
            }
            if (p.team === 'home') {
              this.userControlledPlayerId = decision.receiverId;
              this.updateUserControlledFlag();
            }
          }
        } else if (decision.action === 'cross') {
          this.matchStats[p.team].passesAttempted++;
          const isMoving = Math.hypot(p.vx, p.vy) > 0.5;
          p.action = isMoving ? 'running_cross' : 'standing_cross';
          p.actionTimer = 16;
          const tx = decision.targetX || PITCH_CONFIG.CENTER_X;
          const ty = decision.targetY || (isAttackingUp ? PITCH_CONFIG.PITCH_TOP + 150 : PITCH_CONFIG.PITCH_BOTTOM - 150);
          const dx = tx - p.x;
          const dy = ty - p.y;
          const dist = Math.hypot(dx, dy) || 1;
          this.ball.ownerId = null;
          this.ball.lastTouchTeam = p.team;
          this.ball.lastTouchPlayerId = p.id;
          this.ball.isDividedBall = true;
          this.ball.isAirborne = true;

          if (decision.isAerialLob) {
            // True Route One Towering Aerial Ball (Burnley Two Towers 2026)
            this.ball.lastKickAction = 'cross';
            this.ball.lastKickPower = 0.95;
            this.ball.vx = (dx / dist) * 10.2;
            this.ball.vy = (dy / dist) * 10.2;
            this.ball.vz = 7.4; // High soaring flight with backspin
            this.ball.spin = (Math.random() - 0.5) * 1.2;
            this.ball.spinY = -2.0; // Heavy backspin keeping ball airborne
            audio.playKick(0.95);
            this.setBanner(`${p.name.toUpperCase()} LAUNCHES TOWERING ROUTE-ONE DIRECT BALL!`, 80);
          } else if (Math.abs(dx) > 300 || (p.x < PITCH_CONFIG.CENTER_X - 80 && tx > PITCH_CONFIG.CENTER_X + 60) || (p.x > PITCH_CONFIG.CENTER_X + 80 && tx < PITCH_CONFIG.CENTER_X - 60)) {
            // Phase 7.2: AI Cambio de Frente (Flat cross-field switch to opposite flank)
            this.ball.lastKickAction = 'cross';
            this.ball.lastKickPower = decision.power || 0.88;
            const switchSpeed = 22.0 + (decision.power || 0.85) * 8.5;
            this.ball.vx = (dx / dist) * switchSpeed;
            this.ball.vy = (dy / dist) * switchSpeed;
            this.ball.vz = 2.6 + (decision.power || 0.85) * 1.4;
            this.ball.spin = p.x < PITCH_CONFIG.CENTER_X ? 3.0 : -3.0;
            this.ball.spinY = 0.6;
            audio.playKick(0.9);
            this.setBanner(`${p.name.toUpperCase()} PINGS A CAMBIO DE FRENTE SWITCH ACROSS THE PITCH!`, 85);
          } else {
            // Standard cross into the box
            this.ball.lastKickAction = 'cross';
            this.ball.lastKickPower = 0.76;
            const crossSpeed = 16.5 + (decision.power || 0.72) * 5.5;
            this.ball.vx = (dx / dist) * crossSpeed;
            this.ball.vy = (dy / dist) * crossSpeed;
            this.ball.vz = 4.2 + (decision.power || 0.72) * 1.6;
            this.ball.spin = p.x < PITCH_CONFIG.CENTER_X ? 4.2 : -4.2; // AI inward banana cross
            this.ball.spinY = 1.8;
            audio.playKick(0.85);
          }

          if (decision.receiverId) {
            const receiver = this.players.find(pl => pl.id === decision.receiverId);
            if (receiver) {
              receiver.lastPassPartnerId = p.id;
              if (p.lastPassPartnerId === receiver.id) {
                receiver.consecutiveBackPasses = (p.consecutiveBackPasses || 0) + 1;
              } else {
                receiver.consecutiveBackPasses = 0;
              }
            }
            if (p.team === 'home') {
              this.userControlledPlayerId = decision.receiverId;
              this.updateUserControlledFlag();
            }
          }
        } else if (decision.action === 'kick') {
          // Goalkeeper clearance / long punt upfield to midfield
          const isGK = p.role === 'GK';
          p.action = 'kicking';
          p.actionTimer = 22;
          const tx = decision.targetX || PITCH_CONFIG.CENTER_X;
          const ty = decision.targetY || PITCH_CONFIG.CENTER_Y;
          const dx = tx - p.x;
          const dy = ty - p.y;
          const dist = Math.hypot(dx, dy) || 1;
          const aimAngle = Math.atan2(dy, dx);
          p.facingAngle = aimAngle;

          this.ball.ownerId = null;
          this.ball.lastTouchTeam = p.team;
          this.ball.lastTouchPlayerId = p.id;
          this.ball.lastKickAction = 'clearance';
          this.ball.lastKickPower = 0.85;
          this.ball.isDividedBall = true;

          if (isGK) {
            // Position ball 36px forward outside goalkeeper pickup radius
            this.ball.x = p.x + Math.cos(aimAngle) * 36;
            this.ball.y = p.y + Math.sin(aimAngle) * 36;
            p.gkHoldTimer = -75; // Release cooldown prevents immediate re-grabbing!
          }

          const kickSpeed = 14.5 + Math.random() * 1.5;
          this.ball.vx = (dx / dist) * kickSpeed;
          this.ball.vy = (dy / dist) * kickSpeed;
          this.ball.vz = 6.8; // High towering aerial drop kick to midfield!
          this.ball.isAirborne = true;
          audio.playKick(0.95);

          if (isGK) {
            this.setBanner(`${p.name.toUpperCase()} PUNTS FAR TO MIDFIELD!`, 80);
          }
        } else if (decision.action === 'slide') {
          // Strictly only slide tackle if an OPPONENT possesses the ball
          const ballCarrier = this.players.find(pl => pl.id === this.ball.ownerId && pl.team !== p.team);
          if (!ballCarrier || ballCarrier.role === 'GK') {
            return;
          }
          this.matchStats[p.team].tackles++;
          p.action = 'sliding_tackle';
          p.actionTimer = PHYSICS.TACKLE_DURATION;
          const dx = this.ball.x - p.x;
          const dy = this.ball.y - p.y;
          const dist = Math.hypot(dx, dy) || 1;
          p.slideVelocityX = (dx / dist) * PHYSICS.TACKLE_SLIDE_SPEED;
          p.slideVelocityY = (dy / dist) * PHYSICS.TACKLE_SLIDE_SPEED;
          audio.playSlide();
        } else if (decision.action === 'tackle') {
          // Strictly only standing tackle if an OPPONENT possesses the ball
          const ballCarrier = this.players.find(pl => pl.id === this.ball.ownerId && pl.team !== p.team);
          if (!ballCarrier || ballCarrier.role === 'GK') {
            return;
          }
          this.matchStats[p.team].tackles++;
          p.action = 'standing_tackle';
          p.actionTimer = 14;
          if (ballCarrier.isStepOverActive) {
            // "also defenders can't take the ball from a stepover with a tackle without it being a foul"
            const seen = isIncidentSeenByReferee(this.referee, ballCarrier.x, ballCarrier.y);
            if (seen) {
              this.awardFoul(ballCarrier, ballCarrier.x, ballCarrier.y, p);
              this.setBanner(t('illegalTackleOnStepover'), 140);
            } else {
              this.setBanner(t('refMissedIt'), 75);
            }
          } else if ((this.powerBar.isActive || isKickingAction(ballCarrier.action)) && ballCarrier.id === this.userControlledPlayerId) {
            // The player is charging or releasing a kick while running or being closed down.
            // Defender contact is detected by evaluateKickAccuracy and lowers accuracy by 50% without canceling the kick!
          } else {
            this.ball.ownerId = p.id;
            this.ball.lastTouchTeam = p.team;
            this.ball.lastTouchPlayerId = p.id;
          }
        } else if (decision.action === 'header') {
          this.executeHeader(p);
        } else if (decision.action === 'volley') {
          this.executeAiVolley(p, decision);
        } else if (decision.action === 'tactical_foul') {
          const ballCarrier = this.players.find(vic => vic.id === this.ball.ownerId && vic.team !== p.team) || this.players.find(vic => vic.team !== p.team && !vic.isRedCarded);
          if (ballCarrier) {
            p.action = 'sliding_tackle';
            p.actionTimer = 26;
            p.hasYellowCard = true;
            this.referee.cardDisplay = 'yellow';
            this.referee.cardPlayerName = p.name;
            this.awardFoul(ballCarrier, ballCarrier.x, ballCarrier.y, p, 'yellow');
            this.setBanner(`TACTICAL FOUL BY ${p.name.toUpperCase()} TO STOP COUNTER! YELLOW CARD`, 160);
          }
        }
      } else {
        // AI Defender rustic volley clearance for incoming aerial cross or lob
        const isDefender = p.role === 'CB1' || p.role === 'CB2' || p.role === 'LB' || p.role === 'RB';
        const inDefensiveArea = isAttackingUp ? p.y > PITCH_CONFIG.CENTER_Y : p.y < PITCH_CONFIG.CENTER_Y;
        if (isDefender && inDefensiveArea && this.ball.isAirborne && this.ball.z >= 3.0 && this.ball.z <= 28) {
          const distToAirBall = Math.hypot(this.ball.x - p.x, this.ball.y - p.y);
          if (distToAirBall < 24 && p.action !== 'sliding_tackle' && p.action !== 'volley') {
            executeRusticVolleyClearance(p, this.ball, this.setBanner.bind(this));
          }
        }
      }
    }
  }

  /**
   * Goalkeeper Possession Handler:
   * "when the goalkeeper has the ball it doest nothing and there iis a buggy motion there,
   * adjust it so that when the goalkeeper has the ball it eiter passes it short to a teammate
   * or kicks it far away around the middle of the pitch"
   *
   * Maintains steady composed stance holding ball in chest hands,
   * then auto-distributes after ~42 frames if user doesn't manually press S (pass) or A/W (kick).
   */
  private handleGoalkeeperPossession() {
    if (!this.ball.ownerId) return;
    const gk = this.players.find(p => p.id === this.ball.ownerId && p.role === 'GK');
    if (!gk) return;

    // Do not interfere while goalkeeper is already playing an active kick or dive animation
    if (gk.action === 'kicking' || isKickingAction(gk.action) || gk.action === 'goalkeeper_dive' || gk.action === 'gk_low_smother' || gk.action === 'gk_fingertip_parry') {
      return;
    }

    const isHumanControlled = !this.isSpectatorMode() && (
      Object.values(this.slotControlledPlayerIds).includes(gk.id) || gk.id === this.userControlledPlayerId
    );

    const isAttackingUp = (gk.team === 'home') === this.homeAttacksUp;
    gk.gkHoldTimer = (gk.gkHoldTimer || 0) + 1;

    if (!isHumanControlled) {
      gk.facingAngle = isAttackingUp ? -Math.PI / 2 : Math.PI / 2;
      gk.vx = 0;
      gk.vy = 0;
      gk.action = 'idle';

      // After ~42 frames (~0.7s) of composed stance, automatically distribute!
      if (gk.gkHoldTimer > 42) {
        this.executeGoalkeeperDistribution(gk, isAttackingUp);
      }
    } else {
      // Human Goalkeeper has full movement, aiming and distribution freedom (Phase 3.1)
      // Generous 240-frame safety fallback (~4s) prevents delay-of-game stalling
      if (gk.gkHoldTimer > 240) {
        this.executeGoalkeeperDistribution(gk, isAttackingUp);
      }
    }
  }

  /**
   * Executes clean distribution from the goalkeeper:
   * Either a crisp short ground pass to an open outfield teammate,
   * or a towering punt kick far away around the middle of the pitch.
   */
  public executeGoalkeeperDistribution(gk: Player, isAttackingUp: boolean, forceMode?: 'short' | 'long') {
    gk.gkHoldTimer = -75; // Release cooldown: prevents goalkeeper from re-grabbing its own delivery

    const chooseShort = forceMode ? forceMode === 'short' : Math.random() < 0.5;

    const teammates = this.players.filter(p => p.team === gk.team && p.id !== gk.id && p.role !== 'GK');
    let bestMate: Player | null = null;
    let bestScore = -Infinity;

    for (const m of teammates) {
      const isUpfield = isAttackingUp ? m.y < gk.y - 70 : m.y > gk.y + 70;
      if (!isUpfield) continue;

      const dist = Math.hypot(m.x - gk.x, m.y - gk.y);
      if (dist > 85 && dist < 450) {
        let oppPressure = 0;
        for (const opp of this.players) {
          if (opp.team !== gk.team) {
            const dOpp = Math.hypot(opp.x - m.x, opp.y - m.y);
            if (dOpp < 48) oppPressure++;
          }
        }
        const score = 1000 - dist - oppPressure * 260;
        if (score > bestScore) {
          bestScore = score;
          bestMate = m;
        }
      }
    }

    if (chooseShort && bestMate) {
      // Option A: Short pass to an open teammate to build play
      const dx = bestMate.x - gk.x;
      const dy = bestMate.y - gk.y;
      const dist = Math.hypot(dx, dy) || 1;
      const aimAngle = Math.atan2(dy, dx);
      gk.facingAngle = aimAngle;
      gk.action = 'standing_pass';
      gk.actionTimer = 18;

      this.ball.ownerId = null;
      this.ball.lastTouchTeam = gk.team;
      this.ball.lastTouchPlayerId = gk.id;

      // Position ball 32px forward outside goalkeeper pickup zone
      this.ball.x = gk.x + Math.cos(aimAngle) * 32;
      this.ball.y = gk.y + Math.sin(aimAngle) * 32;
      this.ball.z = 0;
      this.ball.isAirborne = false;

      const passSpeed = 10.5;
      this.ball.vx = (dx / dist) * passSpeed;
      this.ball.vy = (dy / dist) * passSpeed;
      this.ball.vz = 0.15;
      this.ball.spin = (Math.random() - 0.5) * 1.5;
      this.ball.spinY = 0;
      audio.playKick(0.7);

      if (gk.team === 'home') {
        this.userControlledPlayerId = bestMate.id;
        this.updateUserControlledFlag();
        this.setBanner(`GOALKEEPER PASSES OUT SHORT TO BUILD PLAY!`, 85);
      } else {
        this.setBanner(`${AWAY_KIT.name.toUpperCase()} GOALKEEPER PASSES SHORT`, 75);
      }
    } else {
      // Option B: Far kick around the middle of the pitch
      const midX = PITCH_CONFIG.CENTER_X + (Math.random() - 0.5) * 160;
      const midY = PITCH_CONFIG.CENTER_Y + (isAttackingUp ? 45 : -45) + (Math.random() - 0.5) * 60;
      const dx = midX - gk.x;
      const dy = midY - gk.y;
      const dist = Math.hypot(dx, dy) || 1;
      const aimAngle = Math.atan2(dy, dx);
      gk.facingAngle = aimAngle;
      gk.action = 'kicking';
      gk.actionTimer = 22;

      this.ball.ownerId = null;
      this.ball.lastTouchTeam = gk.team;
      this.ball.lastTouchPlayerId = gk.id;

      // Position ball 36px forward outside goalkeeper pickup zone
      this.ball.x = gk.x + Math.cos(aimAngle) * 36;
      this.ball.y = gk.y + Math.sin(aimAngle) * 36;
      this.ball.z = 2;
      this.ball.isAirborne = true;

      const kickSpeed = 14.5 + Math.random() * 1.5;
      this.ball.vx = (dx / dist) * kickSpeed;
      this.ball.vy = (dy / dist) * kickSpeed;
      this.ball.vz = 6.8; // High soaring aerial punt to midfield
      this.ball.spin = (Math.random() - 0.5) * 2.0;
      this.ball.spinY = -1.0;
      audio.playKick(0.95);

      if (gk.team === 'home') {
        this.setBanner(`GOALKEEPER PUNTS FAR TO MIDFIELD!`, 85);
      } else {
        this.setBanner(`${AWAY_KIT.name.toUpperCase()} GOALKEEPER CLEARS TO MIDFIELD!`, 80);
      }
    }
  }

  /**
   * Checks ball possession, physical body blocking, touch tap-aways,
   * loose ball pickups, and power-dependent interceptions ("Divided Ball" system)
   */
  private updateBallPossession() {
    // Dead-ball set piece in progress: ball state and control is strictly owned by set piece
    if (this.setPiece && (this.matchPhase === 'free_kick' || this.matchPhase === 'penalty' || this.matchPhase === 'corner_kick' || this.matchPhase === 'goal_kick' || this.matchPhase === 'throw_in')) {
      return;
    }

    if (this.ball.ownerId) {
      const owner = this.players.find(p => p.id === this.ball.ownerId);
      if (owner) {
        if (owner.isGingaLifting) {
          const fAngle = owner.facingAngle;
          const dist = 9;
          this.ball.x = owner.x + Math.cos(fAngle) * dist;
          this.ball.y = owner.y + Math.sin(fAngle) * dist;
          this.ball.z = Math.min(3.5, (owner.gingaHoldTimer || 0) * 0.05);
          this.ball.vx = owner.vx;
          this.ball.vy = owner.vy;
          return;
        }

        if (owner.role === 'GK') {
          // Goalkeeper holds ball securely in both hands at chest level with composed stance
          const fAngle = owner.facingAngle;
          const dist = 12;
          this.ball.x = owner.x + Math.cos(fAngle) * dist;
          this.ball.y = owner.y + Math.sin(fAngle) * dist;
          this.ball.z = 10;
          this.ball.vx = 0;
          this.ball.vy = 0;
          this.ball.vz = 0;
          return;
        }

        // Phase 8.1 & 8.2: Keep ball at player's feet with tier-scaled touch offset
        // (Amateur pushes ball looser at ~17px, World Class/Unique keeps it glued at 8-9px)
        const fAngle = owner.facingAngle;
        const dri = owner.canonicalStats && 'dri' in owner.canonicalStats ? owner.canonicalStats.dri : 70;
        const tier = owner.dribbleTier || getDribblingTier(dri);
        owner.dribbleTier = tier;
        const dist = getDribblingTouchOffset(tier);
        this.ball.x = owner.x + Math.cos(fAngle) * dist;
        this.ball.y = owner.y + Math.sin(fAngle) * dist;
        this.ball.z = 0;
        this.ball.vx = owner.vx;
        this.ball.vy = owner.vy;

        // --- PHYSICALITY SYSTEM: BODY BLOCKING & TOUCHING THE BALL ---
        // "make it so that if you touch the ball from an opossing player your player tries to tap it away from them
        // however if they place their body in front you can't reach the ball so the opossing player's body can block your path,
        // let's work on this physicality system, to recognize the opposing player's body and the ball as dinstictive entities and one can block the other."
        for (const opp of this.players) {
          if (opp.team === owner.team || opp.isRedCarded || opp.action === 'fouled_falling') continue;

          const dOppCarrier = Math.hypot(opp.x - owner.x, opp.y - owner.y);
          const dOppBall = Math.hypot(opp.x - this.ball.x, opp.y - this.ball.y);

          // 1. Physical body clash / repulsion & Shield vs Strength Duel (Phase 5)
          const minBodyDist = 18;
          if (dOppCarrier < minBodyDist && dOppCarrier > 0) {
            const angle = Math.atan2(opp.y - owner.y, opp.x - owner.x);
            const overlap = minBodyDist - dOppCarrier;
            if (owner.isShielding) {
              const ret = owner.canonicalStats && 'ret' in owner.canonicalStats ? owner.canonicalStats.ret : 75;
              const str = owner.canonicalStats && 'str' in owner.canonicalStats ? owner.canonicalStats.str : 75;
              const oppStr = opp.canonicalStats && 'str' in opp.canonicalStats ? opp.canonicalStats.str : 75;
              const oppTck = opp.canonicalStats && 'tck' in opp.canonicalStats ? opp.canonicalStats.tck : 75;
              const duel = resolveShieldDuel(ret, str, oppStr, oppTck);

              if (duel.holds) {
                // Shield holds firmly: defender stumbles back!
                opp.x += Math.cos(angle) * overlap * 1.1;
                opp.y += Math.sin(angle) * overlap * 1.1;
              } else {
                // Defender breaks the shield!
                owner.isShielding = false;
                owner.action = 'idle';
                this.executeBallTapAway(opp, owner);
                this.setBanner(`SHIELD BROKEN BY ${opp.name.toUpperCase()}!`, 65);
                break;
              }
            } else {
              opp.x += Math.cos(angle) * (overlap * 0.5);
              opp.y += Math.sin(angle) * (overlap * 0.5);
              owner.x -= Math.cos(angle) * (overlap * 0.5);
              owner.y -= Math.sin(angle) * (overlap * 0.5);
            }
          }

          // 2. Ball touch vs Body blocking
          const touchBallRadius = 18;
          if (dOppBall < touchBallRadius && opp.action !== 'sliding_tackle') {
            const isBlockedByBody = this.isBodyBlockingBall(opp, owner);
            if (isBlockedByBody) {
              // Carrier's body is between opponent and ball! Opponent cannot reach through!
              // Body blocks opponent's path to ball
            } else {
              // Path to ball is unblocked! Opponent touches ball directly and taps it away into space!
              this.executeBallTapAway(opp, owner);
              break;
            }
          }
        }
      } else {
        this.ball.ownerId = null;
      }
      return;
    }

    // --- INTERCEPTIONS & DIVIDED BALL SYSTEM ---
    // "let's also work on interceptions any ball that's going near one of the players if it comes from a rival be a shoot or a pass cross etc,
    // the player will attempt to intercept it, depending on the power it has (shoot is more power, cross power but as much, long pass a bit less power, short pass the least powerful)
    // on top of that consider the power bar meter, the higher the power the more errsatic the interception becomes so if it has low poweer the interception is clean
    // the player who intercept instantly controls the ball if it has lots of power then the intercepting player barely tocuhed and the ball rebounds further away
    // and consider all the in between powers let's call these a system as well 'divided ball' this system means the ball is free until a player controls it."
    for (const p of this.players) {
      if (
        p.action === 'fouled_falling' ||
        p.action === 'bicycle_kick' ||
        p.action === 'scissor_kick' ||
        p.action === 'scorpion_kick' ||
        p.action === 'sombrero' ||
        p.isRedCarded
      ) continue;

      if (p.gingaActive && this.ball.z > 3.0) continue;

      const isGK = p.role === 'GK';
      const intStat = p.canonicalStats && 'int' in p.canonicalStats ? p.canonicalStats.int : 70;
      const bclStat = p.canonicalStats && 'bcl' in p.canonicalStats ? p.canonicalStats.bcl : 70;

      // Goalkeeper release cooldown prevents immediate re-grabbing
      if (isGK && p.gkHoldTimer !== undefined && p.gkHoldTimer < 0) continue;

      // Set piece taker kick cooldown: prevents kicker/thrower from immediately re-trapping their own set piece
      if (this.setPieceTakerCooldownPlayerId === p.id && this.setPieceTakerCooldownTimer > 0) continue;

      // Phase 9.5 Direct Free Kick & Shot Flight Protection:
      // While a shot is traveling towards goal (speed > 3.0 or airborne z > 2):
      // 1. Teammates NEVER intercept or trap a shot at goal in mid-flight!
      // 2. Outfield defenders cannot casually suction-trap a rocket shot at goal in mid-air (handled by GK saves, wall jumps, or physical body blocks)
      const isShotInFlight = this.ball.lastKickAction === 'shoot' && (Math.hypot(this.ball.vx, this.ball.vy) > 3.0 || this.ball.z > 2);
      if (isShotInFlight && !isGK) continue;

      // Phase 9.5 Set-Piece Delivery Grace Window:
      // Prevents point-blank suction trap right off the kicker/thrower's boot during the initial frames of delivery
      const distToBall = Math.hypot(this.ball.x - p.x, this.ball.y - p.y);
      if (this.setPieceDeliveryGraceTimer > 0 && !isGK) {
        if (p.team === this.ball.lastTouchTeam || distToBall < 65) continue;
      }

      // Players who just kicked, struck, thrown or passed cannot immediately vacuum the ball back
      if (p.actionTimer > 0 && (isKickingAction(p.action) || p.action === 'clearing' || p.action === 'throw_in_throw' || p.action === 'wall_stance' || p.action === 'wall_jump')) continue;

      const pickupRadius = isGK ? 36 : calculateInterceptionRadius(intStat);
      const maxZ = isGK ? 45 : 8;

      if (this.ball.z > maxZ) continue;

      const dist = distToBall;
      if (dist < pickupRadius) {
        // Is this a rival attempting an interception?
        const isRivalInterception = this.ball.lastTouchTeam !== null && p.team !== this.ball.lastTouchTeam;

        if (isRivalInterception && isGK) {
          this.playerRatings.recordGkSave(p, 'parry');
          const parryRes = processGoalkeeperShotReaction(p, this.ball, dist, p.team === 'home');
          if (parryRes.outcome === 'tipped_over_bar' || parryRes.outcome === 'parried_wide') {
            this.setBanner(parryRes.banner, 80);
            break;
          }
        }

        if (isRivalInterception && !isGK) {
          // INTERCEPTION EVALUATION BY POWER & ACTION TYPE (Phase 5)
          let basePower = 0.40;
          if (this.ball.lastKickAction === 'shoot') basePower = 0.85;
          else if (this.ball.lastKickAction === 'clearance') basePower = 0.85;
          else if (this.ball.lastKickAction === 'cross') basePower = 0.72;
          else if (this.ball.lastKickAction === 'long_pass') basePower = 0.58;
          else if (this.ball.lastKickAction === 'pass') basePower = 0.32;

          const kickPower = this.ball.lastKickPower !== undefined ? this.ball.lastKickPower : 0.5;
          const combinedPower = (basePower * 0.45) + (kickPower * 0.55);
          const ballSpeed = Math.hypot(this.ball.vx, this.ball.vy);
          // Decayed speed allows clean control if the ball has slowed down
          const speedFactor = Math.min(1.2, Math.max(0.25, ballSpeed / 7.5));
          const effectivePower = combinedPower * speedFactor;

          const isSixthSense = intStat > 99;
          const isMagneticVelvet = bclStat > 99;
          const cleanCatchChance = isMagneticVelvet ? 1.0 : calculateCleanInterceptChance(bclStat);
          const isCleanCatch = (isSixthSense || isMagneticVelvet || effectivePower < 0.38 || ballSpeed < 3.0) && Math.random() < cleanCatchChance;

          if (isCleanCatch) {
            // LOW POWER / STAT BREAK: Clean, instant interception! Controls ball directly to feet
            this.ball.ownerId = p.id;
            this.ball.lastTouchTeam = p.team;
            this.ball.lastTouchPlayerId = p.id;
            this.playerRatings.recordPassInterception(this.lastPassPlayerId, p);
            this.lastPassPlayerId = null;
            this.ball.isDividedBall = false;
            this.ball.isSecondBall = false;
            this.ball.isRebound = false;
            this.ball.vx = 0;
            this.ball.vy = 0;
            this.ball.vz = 0;
            this.ball.z = 0;
            this.ball.isAirborne = false;
            p.action = 'trapping';
            p.actionTimer = 10;
            audio.playKick(0.35);

            if (isSixthSense) {
              p.statBreakAuraTimer = 35;
              p.statBreakTraitName = '⚡ Sixth Sense';
              this.setBanner(`⚡ SIXTH SENSE! TELEPATHIC INTERCEPTION BY ${p.name.toUpperCase()}!`, 85);
              audio.playStatBreakChime();
            } else if (isMagneticVelvet) {
              p.statBreakAuraTimer = 35;
              p.statBreakTraitName = '⚡ Magnetic Velvet';
              this.setBanner(`⚡ MAGNETIC VELVET! PERFECT CONTROL BY ${p.name.toUpperCase()}!`, 85);
              audio.playStatBreakChime();
            } else {
              this.setBanner(`CLEAN INTERCEPTION BY ${p.name.toUpperCase()}!`, 75);
            }

            if (p.team === 'home') {
              this.userControlledPlayerId = p.id;
              this.updateUserControlledFlag();
            }
            break;
          } else if (effectivePower < 0.58) {
            // MEDIUM-LOW POWER: Cushioned control with first touch trap distance
            const trapDist = calculateTrapDistance(bclStat, this.ball.isAirborne);
            this.ball.ownerId = p.id;
            this.ball.lastTouchTeam = p.team;
            this.ball.lastTouchPlayerId = p.id;
            this.playerRatings.recordPassInterception(this.lastPassPlayerId, p);
            this.lastPassPlayerId = null;
            this.ball.isDividedBall = false;
            this.ball.isSecondBall = false;
            this.ball.isRebound = false;
            this.ball.vx = 0;
            this.ball.vy = 0;
            this.ball.vz = 0;
            this.ball.z = 0;
            this.ball.isAirborne = false;
            p.action = 'trapping';
            p.actionTimer = 14;
            audio.playKick(0.5);
            this.setBanner(`INTERCEPTED & CONTROLLED BY ${p.name.toUpperCase()}!`, 70);
            if (p.team === 'home') {
              this.userControlledPlayerId = p.id;
              this.updateUserControlledFlag();
            }
            break;
          } else if (effectivePower < 0.78) {
            // MEDIUM-HIGH POWER: Erratic touch / heavy deflection into divided ball
            this.ball.ownerId = null;
            this.ball.lastTouchTeam = p.team;
            this.ball.lastTouchPlayerId = p.id;
            this.ball.isDividedBall = true;
            this.ball.isSecondBall = true;
            this.ball.isRebound = true;
            // Rebounds 20-35px away in deflected direction
            const deflectAngle = Math.atan2(this.ball.vy, this.ball.vx) + (Math.random() - 0.5) * 1.6 + Math.PI;
            const reboundSpeed = Math.max(3.5, ballSpeed * 0.45);
            this.ball.vx = Math.cos(deflectAngle) * reboundSpeed;
            this.ball.vy = Math.sin(deflectAngle) * reboundSpeed;
            this.ball.vz = 0.8;
            p.action = 'trapping';
            p.actionTimer = 16;
            audio.playKick(0.7);
            this.setBanner(`DEFLECTED INTERCEPTION! DIVIDED BALL!`, 80);

            // Spawn turf particles on deflection
            for (let i = 0; i < 4; i++) {
              this.particles.push({
                x: this.ball.x,
                y: this.ball.y,
                z: 0,
                vx: (Math.random() - 0.5) * 3,
                vy: (Math.random() - 0.5) * 3,
                vz: Math.random() * 2.2,
                color: '#2a5e1e',
                life: 0,
                maxLife: 18,
                size: 2,
              });
            }
            break;
          } else {
            // HIGH / MAXIMUM POWER: Glancing erratic deflection, barely touched, rebounds further away!
            this.ball.ownerId = null;
            this.ball.lastTouchTeam = p.team;
            this.ball.lastTouchPlayerId = p.id;
            this.ball.isDividedBall = true;
            this.ball.isSecondBall = true;
            this.ball.isRebound = true;
            // Wild glancing rebound 35-60px away
            const deflectAngle = Math.atan2(this.ball.vy, this.ball.vx) + (Math.random() - 0.5) * 2.2 + Math.PI;
            const reboundSpeed = Math.max(5.5, ballSpeed * 0.62);
            this.ball.vx = Math.cos(deflectAngle) * reboundSpeed;
            this.ball.vy = Math.sin(deflectAngle) * reboundSpeed;
            this.ball.vz = 1.3;
            p.action = 'trapping';
            p.actionTimer = 18;
            audio.playKick(0.85);
            this.setBanner(`ERRATIC TOUCH ON HIGH-POWER BALL!`, 85);

            for (let i = 0; i < 6; i++) {
              this.particles.push({
                x: this.ball.x,
                y: this.ball.y,
                z: 0,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                vz: Math.random() * 2.8,
                color: '#2a5e1e',
                life: 0,
                maxLife: 22,
                size: 2.2,
              });
            }
            break;
          }
        }

        // Clean control for teammates or standard loose ball pickup / Goalkeeper
        if (this.lastPassPlayerId && this.lastPassPlayerId !== p.id && this.ball.lastTouchTeam === p.team) {
          const isKeyPass = this.lastPassIsThroughBall || (p.primaryPos === 'ATT');
          this.playerRatings.recordPassCompletion(this.lastPassPlayerId, p, isKeyPass);
          this.matchStats[p.team].passesCompleted++;
          this.lastCompletedPasserId = this.lastPassPlayerId;
          this.lastCompletedPassTime = this.matchTimeSeconds;
          this.lastPassPlayerId = null;
        }

        this.ball.ownerId = p.id;
        this.ball.lastTouchTeam = p.team;
        this.ball.lastTouchPlayerId = p.id;
        this.ball.isDividedBall = false;
        this.ball.isSecondBall = false;
        this.ball.isRebound = false;
        this.ball.vx = 0;
        this.ball.vy = 0;
        this.ball.vz = 0;
        this.ball.z = isGK ? 10 : 0;
        this.ball.isAirborne = false;
        p.gingaActive = false;
        p.gingaCombo = 0;
        if (isGK) {
          p.action = 'idle';
          p.actionTimer = 0;
          p.gkHoldTimer = 0;
        } else if (this.ball.lastKickAction === 'long_pass') {
          // THROUGH-BALL RECEPTION: Preserved runner momentum & zero-stumble reception in stride
          p.actionTimer = 0;
          p.action = 'running';
        } else if (this.ball.lastKickAction === 'pass') {
          // SHORT PASS RECEPTION: Received in a settled position to feet, regulating match tempo
          p.action = 'trapping';
          p.actionTimer = 8;
        }
        if (p.team === 'home') {
          this.userControlledPlayerId = p.id;
          this.updateUserControlledFlag();
        }
        break;
      }
    }
  }

  /**
   * Updates state timers for sliding tackles, falls, and dives,
   * driving multi-frame action animations
   */
  private updatePlayerStates(timeScale: number = 1) {
    const isKickoff = this.matchPhase === 'kickoff_ready';

    for (const p of this.players) {
      // Release cooldown for goalkeeper after kicking or passing out
      if (p.gkHoldTimer !== undefined && p.gkHoldTimer < 0) {
        p.gkHoldTimer += timeScale;
      }
      // Enforcement of Kickoff Boundary:
      // "the other team, can't pass the middle of the pitch or enter the circle at the middle of the pitch until the ball has been pass."
      if (isKickoff) {
        const defendingTeam: TeamSide = this.kickoffKickingTeam === 'home' ? 'away' : 'home';
        if (p.team === defendingTeam) {
          // 1. Defending team can't pass the middle of the pitch (halfway line)
          if (defendingTeam === 'away') {
            const maxAllowedY = PITCH_CONFIG.CENTER_Y - 12;
            if (p.y > maxAllowedY) p.y = maxAllowedY;
          } else {
            const minAllowedY = PITCH_CONFIG.CENTER_Y + 12;
            if (p.y < minAllowedY) p.y = minAllowedY;
          }

          // 2. Defending team can't enter the circle at the middle of the pitch (CENTER_CIRCLE_RADIUS = 180)
          const distCenter = Math.hypot(p.x - PITCH_CONFIG.CENTER_X, p.y - PITCH_CONFIG.CENTER_Y);
          const minCircleRadius = PITCH_CONFIG.CENTER_CIRCLE_RADIUS + 15; // 195px
          if (distCenter < minCircleRadius) {
            const ang = Math.atan2(p.y - PITCH_CONFIG.CENTER_Y, p.x - PITCH_CONFIG.CENTER_X);
            p.x = PITCH_CONFIG.CENTER_X + Math.cos(ang) * minCircleRadius;
            p.y = PITCH_CONFIG.CENTER_Y + Math.sin(ang) * minCircleRadius;
            if (defendingTeam === 'away' && p.y > PITCH_CONFIG.CENTER_Y - 12) {
              p.y = PITCH_CONFIG.CENTER_Y - 12;
            } else if (defendingTeam === 'home' && p.y < PITCH_CONFIG.CENTER_Y + 12) {
              p.y = PITCH_CONFIG.CENTER_Y + 12;
            }
          }
          p.vx = 0;
          p.vy = 0;
        }
      }

      // Standing difficulty: away outfielders strictly stand still
      if (this.difficulty === 'standing' && p.team === 'away' && p.role !== 'GK') {
        p.vx = 0;
        p.vy = 0;
        if (p.action === 'running') p.action = 'idle';
      }

      if (p.confusedTimer && p.confusedTimer > 0) {
        p.confusedTimer = Math.max(0, p.confusedTimer - timeScale);
      }

      if (p.shirtPulledTimer && p.shirtPulledTimer > 0) {
        p.shirtPulledTimer = Math.max(0, p.shirtPulledTimer - timeScale);
      }

      if (p.shirtPullingTimer && p.shirtPullingTimer > 0) {
        p.shirtPullingTimer = Math.max(0, p.shirtPullingTimer - timeScale);
        if (p.shirtPullingTimer === 0 && p.action === 'shirt_pull') {
          p.action = 'idle';
        }
      }

      if (p.stepOverTimer && p.stepOverTimer > 0) {
        p.stepOverTimer = Math.max(0, p.stepOverTimer - timeScale);
        p.animFrame = Math.floor(p.stepOverTimer / 7) % 4;
        if (p.stepOverTimer === 0) {
          p.isStepOverActive = false;
          if (p.action === 'step_overs') {
            p.action = 'idle';
          }
        }
      }

      if (p.dashTimer && p.dashTimer > 0) {
        p.dashTimer = Math.max(0, p.dashTimer - timeScale);
        p.animFrame = Math.floor((24 - p.dashTimer) / 6) % 4;
        if (p.dashTimer === 0 && p.action === 'nutmeg_dash') {
          p.action = 'running';
        }
      }

      // ⚡ Phase 6: Stat Break Aura, Stumble & Ghost Trail Fading
      if (p.statBreakAuraTimer && p.statBreakAuraTimer > 0) {
        p.statBreakAuraTimer = Math.max(0, p.statBreakAuraTimer - timeScale);
      }
      if (p.stumbleTimer && p.stumbleTimer > 0) {
        p.stumbleTimer = Math.max(0, p.stumbleTimer - timeScale);
      }
      if (p.ghostTrails && p.ghostTrails.length > 0) {
        for (let tIdx = p.ghostTrails.length - 1; tIdx >= 0; tIdx--) {
          p.ghostTrails[tIdx].alpha -= 0.05 * timeScale;
          if (p.ghostTrails[tIdx].alpha <= 0) {
            p.ghostTrails.splice(tIdx, 1);
          }
        }
      }

      // If ball has completely touched down, end Ginga aerial state
      if (this.ball.z <= 0.1 && p.gingaActive && p.action !== 'ginga_juggle') {
        p.gingaActive = false;
        p.gingaCombo = 0;
      }

      if (p.actionTimer > 0) {
        p.actionTimer = Math.max(0, p.actionTimer - timeScale);

        // Action animation frame progression
        if (p.action === 'standing_shot_low') {
          p.animFrame = p.actionTimer > 7 ? 0 : p.actionTimer > 3 ? 1 : 2;
        } else if (p.action === 'standing_shot_mid' || p.action === 'standing_shot' || p.action === 'shooting') {
          p.animFrame = p.actionTimer > 11 ? 0 : p.actionTimer > 5 ? 1 : 2;
        } else if (p.action === 'standing_shot_high') {
          p.animFrame = p.actionTimer > 14 ? 0 : p.actionTimer > 7 ? 1 : 2;
        } else if (p.action === 'running_shot_low') {
          p.animFrame = p.actionTimer > 7 ? 0 : p.actionTimer > 3 ? 1 : 2;
        } else if (p.action === 'running_shot_mid' || p.action === 'running_shot') {
          p.animFrame = p.actionTimer > 11 ? 0 : p.actionTimer > 5 ? 1 : 2;
        } else if (p.action === 'running_shot_high') {
          p.animFrame = p.actionTimer > 14 ? 0 : p.actionTimer > 7 ? 1 : 2;
        } else if (p.action === 'special_curl_shot') {
          if (p.actionTimer > 14) p.animFrame = 0;
          else if (p.actionTimer > 7) p.animFrame = 1;
          else p.animFrame = 2;
        } else if (p.action === 'knuckle_shot') {
          if (p.actionTimer > 13) p.animFrame = 0;
          else if (p.actionTimer > 6) p.animFrame = 1;
          else p.animFrame = 2;
        } else if (p.action === 'standing_pass_low') {
          p.animFrame = p.actionTimer > 5 ? 0 : p.actionTimer > 2 ? 1 : 2;
        } else if (p.action === 'standing_pass_mid' || p.action === 'standing_pass' || p.action === 'passing' || p.action === 'kicking') {
          p.animFrame = p.actionTimer > 7 ? 0 : p.actionTimer > 3 ? 1 : 2;
        } else if (p.action === 'standing_pass_high') {
          p.animFrame = p.actionTimer > 10 ? 0 : p.actionTimer > 5 ? 1 : 2;
        } else if (p.action === 'running_pass_low') {
          p.animFrame = p.actionTimer > 6 ? 0 : p.actionTimer > 3 ? 1 : 2;
        } else if (p.action === 'running_pass_mid' || p.action === 'running_pass') {
          p.animFrame = p.actionTimer > 8 ? 0 : p.actionTimer > 4 ? 1 : 2;
        } else if (p.action === 'running_pass_high') {
          p.animFrame = p.actionTimer > 11 ? 0 : p.actionTimer > 5 ? 1 : 2;
        } else if (p.action === 'special_curl_pass') {
          if (p.actionTimer > 10) p.animFrame = 0;
          else if (p.actionTimer > 5) p.animFrame = 1;
          else p.animFrame = 2;
        } else if (p.action === 'knuckle_pass') {
          if (p.actionTimer > 9) p.animFrame = 0;
          else if (p.actionTimer > 4) p.animFrame = 1;
          else p.animFrame = 2;
        } else if (p.action === 'standing_long_pass_low') {
          p.animFrame = p.actionTimer > 7 ? 0 : p.actionTimer > 3 ? 1 : 2;
        } else if (p.action === 'standing_long_pass_mid' || p.action === 'standing_long_pass') {
          p.animFrame = p.actionTimer > 11 ? 0 : p.actionTimer > 5 ? 1 : 2;
        } else if (p.action === 'standing_long_pass_high') {
          p.animFrame = p.actionTimer > 14 ? 0 : p.actionTimer > 7 ? 1 : 2;
        } else if (p.action === 'running_long_pass_low') {
          p.animFrame = p.actionTimer > 7 ? 0 : p.actionTimer > 3 ? 1 : 2;
        } else if (p.action === 'running_long_pass_mid' || p.action === 'running_long_pass') {
          p.animFrame = p.actionTimer > 11 ? 0 : p.actionTimer > 5 ? 1 : 2;
        } else if (p.action === 'running_long_pass_high') {
          p.animFrame = p.actionTimer > 14 ? 0 : p.actionTimer > 7 ? 1 : 2;
        } else if (p.action === 'standing_cross_low') {
          p.animFrame = p.actionTimer > 7 ? 0 : p.actionTimer > 3 ? 1 : 2;
        } else if (p.action === 'standing_cross_mid' || p.action === 'standing_cross' || p.action === 'crossing') {
          p.animFrame = p.actionTimer > 11 ? 0 : p.actionTimer > 5 ? 1 : 2;
        } else if (p.action === 'standing_cross_high') {
          p.animFrame = p.actionTimer > 14 ? 0 : p.actionTimer > 7 ? 1 : 2;
        } else if (p.action === 'running_cross_low') {
          p.animFrame = p.actionTimer > 7 ? 0 : p.actionTimer > 3 ? 1 : 2;
        } else if (p.action === 'running_cross_mid' || p.action === 'running_cross') {
          p.animFrame = p.actionTimer > 11 ? 0 : p.actionTimer > 5 ? 1 : 2;
        } else if (p.action === 'running_cross_high') {
          p.animFrame = p.actionTimer > 14 ? 0 : p.actionTimer > 7 ? 1 : 2;
        } else if (p.action === 'cruyff_turn') {
          p.animFrame = p.actionTimer > 12 ? 0 : p.actionTimer > 6 ? 1 : 2;
        } else if (p.action === 'roulette') {
          p.animFrame = Math.floor((22 - p.actionTimer) / 5.5) % 4;
          // Rotate facing angle through 360 degrees
          p.facingAngle += (Math.PI * 2) / 22;
          this.ball.x = p.x + Math.cos(p.facingAngle) * 6;
          this.ball.y = p.y + Math.sin(p.facingAngle) * 6;
          this.ball.ownerId = p.id;
        } else if (p.action === 'rainbow_flick') {
          p.animFrame = p.actionTimer > 18 ? 0 : p.actionTimer > 10 ? 1 : p.actionTimer > 4 ? 2 : 3;
        } else if (p.action === 'bicycle_kick') {
          if (p.actionTimer > 18) p.animFrame = 0; // Inverted launch
          else if (p.actionTimer > 8) p.animFrame = 1; // Mid-air overhead bicycle strike
          else p.animFrame = 2; // Landing roll
        } else if (p.action === 'scissor_kick') {
          if (p.actionTimer > 16) p.animFrame = 0; // Horizontal leap
          else if (p.actionTimer > 8) p.animFrame = 1; // Scissor legs whip
          else p.animFrame = 2; // Touch down
        } else if (p.action === 'scorpion_kick') {
          if (p.actionTimer > 18) p.animFrame = 0; // Forward dive
          else if (p.actionTimer > 9) p.animFrame = 1; // Double heel reverse sting
          else p.animFrame = 2; // Slide recovery
        } else if (p.action === 'volley') {
          if (p.actionTimer > 14) p.animFrame = 0; // Side-on torso pivot
          else if (p.actionTimer > 7) p.animFrame = 1; // Full laces thunderbolt
          else p.animFrame = 2; // Follow-through
        } else if (p.action === 'diving_volley') {
          if (p.actionTimer > 16) p.animFrame = 0; // Forward dive launch
          else if (p.actionTimer > 8) p.animFrame = 1; // Full horizontal flight strike
          else p.animFrame = 2; // Turf glide landing
        } else if (p.action === 'side_volley') {
          if (p.actionTimer > 15) p.animFrame = 0; // Hip coiling
          else if (p.actionTimer > 7) p.animFrame = 1; // 90° lateral whip strike
          else p.animFrame = 2; // Follow-through
        } else if (p.action === 'half_volley') {
          if (p.actionTimer > 13) p.animFrame = 0; // Low plant & wind-up
          else if (p.actionTimer > 6) p.animFrame = 1; // Low laces driven strike
          else p.animFrame = 2; // Low sweep follow-through
        } else if (p.action === 'chest_volley') {
          if (p.actionTimer > 16) p.animFrame = 0; // Arched chest cushion
          else if (p.actionTimer > 8) p.animFrame = 1; // Volley strike on descending ball
          else p.animFrame = 2; // Dual foot landing
        } else if (p.action === 'rabona_volley') {
          if (p.actionTimer > 16) p.animFrame = 0; // Cross-legged plant
          else if (p.actionTimer > 8) p.animFrame = 1; // Rabona wrap-behind strike
          else p.animFrame = 2; // Balance unwrap
        } else if (p.action === 'flying_heel_volley') {
          if (p.actionTimer > 16) p.animFrame = 0; // Mid-air forward tilt
          else if (p.actionTimer > 8) p.animFrame = 1; // Reverse heel flick strike
          else p.animFrame = 2; // Drop recovery
        } else if (p.action === 'sombrero_volley') {
          if (p.actionTimer > 15) p.animFrame = 0; // Eye on descending ball
          else if (p.actionTimer > 7) p.animFrame = 1; // Downward smash volley
          else p.animFrame = 2; // Touchdown
        } else if (p.action === 'around_the_world') {
          p.animFrame = Math.floor((24 - p.actionTimer) / 6) % 4; // 4 rotational stages around ball
        } else if (p.action === 'elastico') {
          p.animFrame = Math.floor((22 - p.actionTimer) / 7.3) % 3; // 3-stage elastic outside-inside flick
        } else if (p.action === 'sombrero') {
          p.animFrame = p.actionTimer > 16 ? 0 : p.actionTimer > 8 ? 1 : 2;
        } else if (p.action === 'ginga_juggle') {
          p.animFrame = Math.floor((25 - p.actionTimer) / 6) % 4;
        } else if (p.action === 'heading') {
          if (p.actionTimer > 13) p.animFrame = 0; // Jump load
          else if (p.actionTimer > 9) p.animFrame = 1; // Airborne arched back
          else if (p.actionTimer > 4) p.animFrame = 2; // Forehead thrust snap
          else p.animFrame = 3; // Landing
        } else if (p.action === 'sliding_tackle') {
          p.x += p.slideVelocityX * timeScale;
          p.y += p.slideVelocityY * timeScale;
          p.slideVelocityX *= Math.pow(0.92, timeScale);
          p.slideVelocityY *= Math.pow(0.92, timeScale);

          // Spawn sliding turf spray particles & persistent pitch scuff marks
          if (Math.random() < 0.25) {
            addPitchScuff(p.x, p.y, p.facingAngle, 22, 4.5);
          }
          if (Math.random() < 0.6) {
            this.particles.push({
              x: p.x - Math.sign(p.slideVelocityX) * 6,
              y: p.y - Math.sign(p.slideVelocityY) * 6,
              z: 0,
              vx: -p.slideVelocityX * 0.15 + (Math.random() - 0.5),
              vy: -p.slideVelocityY * 0.15 + (Math.random() - 0.5),
              vz: Math.random() * 2.2,
              color: '#2a5e1e',
              life: 0,
              maxLife: 18,
              size: 2.2,
            });
          }

          // Slide tackle collision against opposing players
          for (const opp of this.players) {
            if (opp.team !== p.team && opp.role !== 'GK' && opp.action !== 'fouled_falling' && !opp.isRedCarded) {
              const dOpp = Math.hypot(opp.x - p.x, opp.y - p.y);
              if (dOpp < 26) {
                this.resolveTackleContact(p, opp, true);
                break;
              }
            }
          }

          // Slide tackle contact with loose/divided ball
          if (!this.ball.ownerId) {
            const dBall = Math.hypot(this.ball.x - p.x, this.ball.y - p.y);
            if (dBall < 26 && this.ball.z < 18) {
              this.ball.vx = p.slideVelocityX * 0.9;
              this.ball.vy = p.slideVelocityY * 0.9;
              this.ball.vz = Math.random() * 1.6 + 0.4;
              this.ball.lastTouchTeam = p.team;
              this.ball.lastTouchPlayerId = p.id;
              this.ball.isDividedBall = true;
              audio.playKick(0.75);
              this.setBanner(`SLIDE CLEARANCE BY ${p.name.toUpperCase()}!`, 60);
            }
          }

          if (p.actionTimer > 18) p.animFrame = 0; // Entry thrust
          else if (p.actionTimer > 8) p.animFrame = 1; // Full turf slide
          else p.animFrame = 2; // Recovery brake
        } else if (p.action === 'standing_tackle') {
          p.animFrame = p.actionTimer > 8 ? 0 : 1;
        } else if (p.action === 'goalkeeper_dive') {
          p.x += p.diveX * timeScale;
          p.y += p.diveY * timeScale;
          p.diveX *= Math.pow(0.9, timeScale);
          p.diveY *= Math.pow(0.9, timeScale);

          if (p.actionTimer > 16) p.animFrame = 0; // Push-off
          else if (p.actionTimer > 8) p.animFrame = 1; // Horizontal flight
          else p.animFrame = 2; // Fingertip save & roll
        } else if (p.action === 'fouled_falling') {
          if (p.actionTimer > 45) p.animFrame = 0; // Stumble
          else if (p.actionTimer > 30) p.animFrame = 1; // Mid-air tumble
          else if (p.actionTimer > 15) p.animFrame = 2; // Turf impact
          else p.animFrame = 3; // Down on grass
        } else if (p.action === 'driven_laces_strike') {
          if (p.actionTimer > 15) p.animFrame = 0; // Low plant & wind-up
          else if (p.actionTimer > 7) p.animFrame = 1; // Flat laces strike punch
          else p.animFrame = 2; // Piercing follow-through
        } else if (p.action === 'curling_finesse') {
          if (p.actionTimer > 15) p.animFrame = 0; // Open-hip angle coil
          else if (p.actionTimer > 7) p.animFrame = 1; // Instep whip strike
          else p.animFrame = 2; // Guided follow-through
        } else if (p.action === 'sliding_toe_poke') {
          if (p.actionTimer > 12) p.animFrame = 0; // Desperate lunge entry
          else if (p.actionTimer > 6) p.animFrame = 1; // Stretched toe poke contact
          else p.animFrame = 2; // Turf glide recovery
        } else if (p.action === 'sidefoot_push') {
          if (p.actionTimer > 9) p.animFrame = 0; // Instep opening
          else if (p.actionTimer > 4) p.animFrame = 1; // Controlled push
          else p.animFrame = 2; // Ground follow-through
        } else if (p.action === 'trivela') {
          if (p.actionTimer > 12) p.animFrame = 0; // Outside edge coil
          else if (p.actionTimer > 6) p.animFrame = 1; // Exterior boot slice
          else p.animFrame = 2; // Trivela follow-through
        } else if (p.action === 'scoop_chip') {
          if (p.actionTimer > 11) p.animFrame = 0; // Low digging toe poise
          else if (p.actionTimer > 5) p.animFrame = 1; // Soft lofting scoop
          else p.animFrame = 2; // Gentle follow-through
        } else if (p.action === 'backheel_flick') {
          if (p.actionTimer > 11) p.animFrame = 0; // Plant in stride
          else if (p.actionTimer > 5) p.animFrame = 1; // Reverse heel flick tap
          else p.animFrame = 2; // Stride recovery
        } else if (p.action === 'body_feint') {
          if (p.actionTimer > 11) p.animFrame = 0; // Sharp shoulder drop
          else if (p.actionTimer > 5) p.animFrame = 1; // Acceleration cut opposite channel
          else p.animFrame = 2; // Burst forward
        } else if (p.action === 'bullet_header') {
          if (p.actionTimer > 14) p.animFrame = 0; // High-point aerial leap
          else if (p.actionTimer > 7) p.animFrame = 1; // Forehead thrust driven down into turf
          else p.animFrame = 2; // Downward follow-through & touchdown
        } else if (p.action === 'glancing_header') {
          if (p.actionTimer > 13) p.animFrame = 0; // Near-post aerial leap
          else if (p.actionTimer > 6) p.animFrame = 1; // Delicate sideways glancing touch
          else p.animFrame = 2; // Touchdown
        } else if (p.action === 'contested_duel') {
          p.animFrame = p.actionTimer > 11 ? 1 : 0; // Mid-air physical contest clash
        } else if (p.action === 'diving_header') {
          p.x += Math.cos(p.facingAngle) * 2.5 * timeScale;
          p.y += Math.sin(p.facingAngle) * 2.5 * timeScale;
          if (p.actionTimer > 16) p.animFrame = 0; // Torpedo launch
          else if (p.actionTimer > 8) p.animFrame = 1; // Horizontal flight
          else p.animFrame = 2; // Turf glide landing
        } else if (p.action === 'heel_chop') {
          if (p.actionTimer > 12) p.animFrame = 0; // Plant leg forward
          else if (p.actionTimer > 6) p.animFrame = 1; // Chopping heel 90° redirection
          else p.animFrame = 2; // Direction exit
        } else if (p.action === 'gk_low_smother') {
          p.animFrame = p.actionTimer > 11 ? 0 : 1; // Trapping low ball securely into chest
        } else if (p.action === 'gk_fingertip_parry') {
          p.x += p.diveX * timeScale;
          p.y += p.diveY * timeScale;
          p.diveX *= Math.pow(0.9, timeScale);
          p.diveY *= Math.pow(0.9, timeScale);
          if (p.actionTimer > 17) p.animFrame = 0; // Push-off
          else if (p.actionTimer > 8) p.animFrame = 1; // Full horizontal flight
          else p.animFrame = 2; // Fingertip tip past post
        } else if (p.action === 'gk_punch') {
          if (p.actionTimer > 14) p.animFrame = 0; // Leaping coil
          else if (p.actionTimer > 7) p.animFrame = 1; // Double-fist punch contact
          else p.animFrame = 2; // Touchdown
        } else if (p.action === 'gk_star_spread') {
          p.animFrame = p.actionTimer > 10 ? 0 : 1; // Massive starfish split stance
        } else if (p.action === 'gk_recovery_roll') {
          p.animFrame = p.actionTimer > 8 ? 0 : 1; // Floor momentum roll back to feet
        } else if (p.action === 'defensive_jockey') {
          p.animFrame = Math.floor((p.actionTimer || 0) / 4) % 4;
        } else if (p.action === 'deceleration_skid') {
          p.animFrame = 0;
        }

        if (p.actionTimer === 0) {
          // If Goalkeeper finished a diving save or smother and the ball is still loose in the box:
          if (
            (p.action === 'goalkeeper_dive' || p.action === 'gk_fingertip_parry' || p.action === 'gk_low_smother') &&
            !this.ball.ownerId &&
            Math.hypot(this.ball.x - p.x, this.ball.y - p.y) < 65
          ) {
            p.action = 'gk_recovery_roll';
            p.actionTimer = 16;
            p.animFrame = 0;
          } else {
            if (p.action === 'shielding') {
              p.isShielding = false;
            }
            p.action = 'idle';
            p.animFrame = 0;
          }
        }
      }

      // Phase 8.4 Locomotion, Deceleration Skids & Friction Particles
      const isSprinting = Math.hypot(p.vx, p.vy) > 3.0;
      const isJockeying = p.action === 'defensive_jockey';
      const particles = animationEngine.updateLocomotion(p, isSprinting, isJockeying, timeScale);
      if (particles && particles.length > 0) {
        this.particles.push(...particles);
      }

      // Phase 11: Weather Surface Traction, Wet/Puddle Slipping & Cleat Spray
      const weatherMods = getWeatherSurfaceModifiers(this.weather, this.season, this.turfQuality);
      if (weatherMods.playerSlipRisk > 0 || this.puddles.length > 0) {
        processPlayerPuddleTraction(p, this.puddles, weatherMods.playerSlipRisk, timeScale);
      }
      if (isSprinting && (this.weather === 'rain' || this.weather === 'torrential' || this.weather === 'snow' || this.weather === 'blizzard')) {
        if (Math.random() < 0.35) {
          spawnCleatSpray(p.x, p.y, p.vx, p.vy, this.weather === 'snow' || this.weather === 'blizzard');
        }
      }
    }

    // General physicality & body collision between opposing outfield players
    // "to recognize the opposing player's body and the ball as dinstictive entities and one can block the other"
    for (let i = 0; i < this.players.length; i++) {
      const p1 = this.players[i];
      if (p1.action === 'fouled_falling' || p1.isRedCarded) continue;
      for (let j = i + 1; j < this.players.length; j++) {
        const p2 = this.players[j];
        if (p2.team === p1.team || p2.action === 'fouled_falling' || p2.isRedCarded) continue;

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.hypot(dx, dy);
        const minBodyDist = 17;

        if (dist > 0 && dist < minBodyDist) {
          const overlap = minBodyDist - dist;
          const nx = dx / dist;
          const ny = dy / dist;

          if (p1.isShielding && this.ball.ownerId === p1.id) {
            // Rooted shielding stance
            p2.x += nx * overlap * 0.9;
            p2.y += ny * overlap * 0.9;
          } else if (p2.isShielding && this.ball.ownerId === p2.id) {
            p1.x -= nx * overlap * 0.9;
            p1.y -= ny * overlap * 0.9;
          } else {
            p1.x -= nx * overlap * 0.5;
            p1.y -= ny * overlap * 0.5;
            p2.x += nx * overlap * 0.5;
            p2.y += ny * overlap * 0.5;
          }
        }
      }
    }
  }

  /**
   * Moves referee near play without interfering
   */
  private updateReferee(timeScale: number = 1) {
    const targetX = this.ball.x + 50;
    const targetY = this.ball.y + 30;
    const dx = targetX - this.referee.x;
    const dy = targetY - this.referee.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 70) {
      this.referee.vx = (dx / dist) * 2.2;
      this.referee.vy = (dy / dist) * 2.2;
      this.referee.x += this.referee.vx * timeScale;
      this.referee.y += this.referee.vy * timeScale;
    }

    // Referee faces the ball and focal play area
    this.referee.facingAngle = Math.atan2(this.ball.y - this.referee.y, this.ball.x - this.referee.x);

    if (this.referee.whistleTimer > 0) {
      this.referee.whistleTimer = Math.max(0, this.referee.whistleTimer - timeScale);
    }
  }

  /**
   * Updates turf/grass divot particles
   */
  private updateParticles(timeScale: number = 1) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x += pt.vx * timeScale;
      pt.y += pt.vy * timeScale;
      pt.z += pt.vz * timeScale;
      pt.vz -= 0.2 * timeScale;
      pt.life += timeScale;
      if (pt.life >= pt.maxLife || pt.z < 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  /**
   * Dynamic camera following ball smoothly:
   * "the camera should have a bit of an angle when you're near the top goal (which is the rival team's goal)
   * the angle is a bit lower and you see it closer to the ground giving more vertical angle of the goal,
   * but as you go down to your own goal, the camera is higher and more above the ground"
   */
  /**
   * Dynamic camera following ball smoothly:
   * Features the stereotypical football game camera for free kicks, penalties, corners, and throw-ins!
   * Driven by CameraManager with smooth easing down to pitch level and zero stutter.
   */
  private updateCamera(timeScale: number = 1) {
    if (this.isPreMatchSwoopActive() && this.preMatchSwoop) {
      const swoop = updatePreMatchSwoop(this.preMatchSwoop);
      this.camera.x = swoop.camera.x;
      this.camera.y = swoop.camera.y;
      this.camera.zoom = swoop.camera.zoom;
      this.camera.pitchTilt = swoop.camera.pitchTilt;
      this.cameraManager.state.x = swoop.camera.x;
      this.cameraManager.state.y = swoop.camera.y;
      this.cameraManager.state.zoom = swoop.camera.zoom;
      this.cameraManager.state.pitchTilt = swoop.camera.pitchTilt;
      if (swoop.isComplete) {
        audio.playWhistle(true);
        this.setBanner('KICK OFF! PASS (S / W) TO BEGIN', 120);
      }
      return;
    }

    if (this.setPieceCameraFollowTimer > 0) {
      this.setPieceCameraFollowTimer--;
    }
    this.camera = this.cameraManager.update(
      this.ball,
      this.players,
      this.userControlledPlayerId,
      this.matchPhase,
      this.setPiece,
      this.setPieceCameraFollowTimer,
      this.setPieceCameraType,
      this.setPieceLastAimAngle,
      this.cameraFocus,
      timeScale
    );
  }

  /**
   * Automatically assigns user control to the Home player closest to the ball
   */
  private autoSwitchUserPlayer() {
    // If during an active set piece, never auto-switch away from taker
    if (this.setPiece) return;

    // In Spectator Mode (CPU vs CPU), no human controls any player
    if (this.isSpectatorMode()) {
      this.userControlledPlayerId = '';
      this.slotControlledPlayerIds = {};
      this.updateUserControlledFlag();
      return;
    }

    // If in 1-Player Control Mode (Be-A-Pro lock), never auto-switch away from locked player
    if (this.controlMode === 'one_player') {
      if (this.lockedPlayerId && this.userControlledPlayerId !== this.lockedPlayerId) {
        this.userControlledPlayerId = this.lockedPlayerId;
        this.updateUserControlledFlag();
      }
      return;
    }

    // Auto-switch for each active human player slot
    for (const slot of this.playerSlots) {
      if (slot.side === 'spectator') continue;

      const currentId = this.slotControlledPlayerIds[slot.id] || (slot.id === 1 ? this.userControlledPlayerId : '');

      // If team's Goalkeeper gained possession of the ball, switch directly to the Goalkeeper!
      const teamGK = this.players.find(p => p.team === slot.side && p.role === 'GK');
      if (teamGK && this.ball.ownerId === teamGK.id) {
        if (currentId !== teamGK.id) {
          this.slotControlledPlayerIds[slot.id] = teamGK.id;
          if (slot.id === 1) {
            this.userControlledPlayerId = teamGK.id;
          }
        }
        continue;
      }

      // If current controlled player has the ball, don't switch away
      if (currentId && this.ball.ownerId === currentId) continue;

      // If human slot is currently manually controlling the GK in defense, don't rip control away while threat is active
      const curr = this.players.find(p => p.id === currentId);
      if (curr && curr.role === 'GK') {
        const isAttackingUp = (slot.side === 'home') === this.homeAttacksUp;
        const inDefensiveHalf = isAttackingUp ? this.ball.y > PITCH_CONFIG.CENTER_Y - 50 : this.ball.y < PITCH_CONFIG.CENTER_Y + 50;
        if (inDefensiveHalf && Math.hypot(this.ball.x - curr.x, this.ball.y - curr.y) < 280) {
          continue;
        }
      }

      // If teammate on slot.side gained ball possession, auto-switch cursor to the ball carrier
      const teamBallCarrier = this.players.find(p => p.team === slot.side && p.id === this.ball.ownerId);
      if (teamBallCarrier) {
        if (currentId !== teamBallCarrier.id) {
          this.slotControlledPlayerIds[slot.id] = teamBallCarrier.id;
          if (slot.id === 1) {
            this.userControlledPlayerId = teamBallCarrier.id;
          }
        }
        continue;
      }

      // Check whether rival team possesses the ball (defense without the ball)
      const rivalHasBall = this.players.some(p => p.team !== slot.side && p.id === this.ball.ownerId);
      const slotCursorMode: CursorSwitchMode = slot.cursorSwitchMode || this.cursorSwitchMode || 'manual';

      // Phase 4.5.3: Manual Mode
      // Without the ball: Cursor NEVER auto-switches; player only changes with Player Switch button (Q / L1 / LB / Space)
      if (slotCursorMode === 'manual' && rivalHasBall) {
        continue;
      }

      let closest: Player | null = null;
      let minDistance = Infinity;

      for (const p of this.players) {
        if (p.team === slot.side && p.role !== 'GK') {
          // Avoid taking another human slot's assigned player
          const isTakenByOther = Object.entries(this.slotControlledPlayerIds).some(
            ([sId, pId]) => Number(sId) !== slot.id && pId === p.id
          );
          if (isTakenByOther) continue;

          const d = Math.hypot(this.ball.x - p.x, this.ball.y - p.y);
          if (d < minDistance) {
            minDistance = d;
            closest = p;
          }
        }
      }

      if (closest && closest.id !== currentId && minDistance < 320) {
        // Phase 4.5.4: 3-Meter Proximity Guard (< 3m / ~71 px) in Automatic Mode:
        // If closest candidate is situated < 3m (~71 px) from current player, suppress switch!
        if (curr) {
          const distToCurrent = Math.hypot(closest.x - curr.x, closest.y - curr.y);
          if (distToCurrent < 71) {
            continue; // Suppress erratic micro-switch
          }
        }

        this.slotControlledPlayerIds[slot.id] = closest.id;
        if (slot.id === 1) {
          this.userControlledPlayerId = closest.id;
        }
      }
    }

    this.updateUserControlledFlag();
  }

  public updateUserControlledFlag() {
    const controlledSet = new Set<string>();
    if (this.userControlledPlayerId) controlledSet.add(this.userControlledPlayerId);
    for (const id of Object.values(this.slotControlledPlayerIds)) {
      if (id) controlledSet.add(id);
    }

    for (const p of this.players) {
      p.isUserControlled = !this.isSpectatorMode() && controlledSet.has(p.id);
    }
  }

  /**
   * Called when ball crosses goal line into net
   */
  private onGoal(event: GoalEvent) {
    if (this.matchPhase === 'goal_scored') return;

    this.matchPhase = 'goal_scored';
    this.phaseTimer = 0;
    this.goalNetShake = 28;

    if (event.teamScored === 'home') {
      this.score.home++;
      this.matchStats.home.goals++;
      this.lastConcedingTeam = 'away';
      if (this.homeAttacksUp) {
        this.topGoalNet.shake = 35;
        this.topGoalNet.bulgeAmount = Math.max(this.topGoalNet.bulgeAmount, 22);
      } else {
        this.bottomGoalNet.shake = 35;
        this.bottomGoalNet.bulgeAmount = Math.max(this.bottomGoalNet.bulgeAmount, 22);
      }
      this.bannerMessage = `GOOOOOAL FOR ${this.homeTeam.name.toUpperCase()}!`;
    } else {
      this.score.away++;
      this.matchStats.away.goals++;
      this.lastConcedingTeam = 'home';
      if (this.homeAttacksUp) {
        this.bottomGoalNet.shake = 35;
        this.bottomGoalNet.bulgeAmount = Math.max(this.bottomGoalNet.bulgeAmount, 22);
      } else {
        this.topGoalNet.shake = 35;
        this.topGoalNet.bulgeAmount = Math.max(this.topGoalNet.bulgeAmount, 22);
      }
      this.bannerMessage = `GOAL FOR ${this.awayTeam.name.toUpperCase()}!`;
    }
    this.bannerTimer = 180;

    // Phase 10: Record Goal & Assist in SofaScore rating model
    const scorerId = this.ball.lastTouchPlayerId;
    const scorer = scorerId ? this.players.find(p => p.id === scorerId) : null;
    const assistCandidate = (this.lastCompletedPasserId && (this.matchTimeSeconds - this.lastCompletedPassTime < 20))
      ? this.lastCompletedPasserId
      : null;

    if (scorer && scorer.team === this.lastConcedingTeam) {
      this.playerRatings.recordOwnGoal(scorer, this.lastConcedingTeam);
    } else {
      this.playerRatings.recordGoal(scorerId, assistCandidate, this.lastConcedingTeam, this.players);
    }

    const scoringSide: 'home' | 'away' = this.lastConcedingTeam === 'home' ? 'away' : 'home';
    const isLateMinute = this.matchTimeSeconds >= 40 * 60;
    audio.playGoalCelebration(scoringSide, isLateMinute, this.stadiumTier);
    audio.playWhistle(true);

    const scoringKit = scoringSide === 'home' ? (this.homeKit || HOME_KIT) : (this.awayKit || AWAY_KIT);
    triggerGoalCelebrationAtmosphere(scoringSide, scoringKit.primaryColor, scoringKit.secondaryColor);
  }

  /**
   * Robust Out-of-Bounds & Set-Piece Assignment Engine (Phase 1)
   * 1.1 Robust Pitch-Boundary Raycasting:
   *   Traces (prevX, prevY, prevZ) -> (x, y, z) to detect boundary crossing segment.
   *   Correctly distinguishes Sideline (Touchline) exits from Endline (Goal line) exits near corner flags.
   * 1.2 Strict Last-Touch Attribution Rules:
   *   - Touchline (Sideline): Always awards Throw-In to the opponent of lastTouchTeam.
   *   - Endline (Goal line): Defending team touched last -> Corner Kick; Attacking team touched last -> Goal Kick.
   */
  private checkOutOfBounds() {
    if (this.matchPhase !== 'in_play' && this.matchPhase !== 'kickoff_ready') return;

    const prevX = this.ball.prevX !== undefined ? this.ball.prevX : this.ball.x;
    const prevY = this.ball.prevY !== undefined ? this.ball.prevY : this.ball.y;
    const prevZ = this.ball.prevZ !== undefined ? this.ball.prevZ : this.ball.z;

    const crossing = raycastPitchBoundary(prevX, prevY, prevZ, this.ball.x, this.ball.y, this.ball.z);

    if (crossing.hasExited && !crossing.isGoalMouthEntrance) {
      // If a player carried the ball out of bounds, strip ownership and award to opponent!
      if (this.ball.ownerId) {
        const carrier = this.players.find(p => p.id === this.ball.ownerId);
        if (carrier) {
          this.ball.lastTouchTeam = carrier.team;
          this.ball.lastTouchPlayerId = carrier.id;
        }
        this.ball.ownerId = null;
      }

      this.outOfBoundsDelay = 0;
      this.resetOutOfBoundsWithAward(crossing);
    } else {
      this.outOfBoundsDelay = 0;
    }
  }

  private resetOutOfBoundsWithAward(crossing: PitchCrossingResult) {
    this.ball.isOverpowered = false;
    this.ball.isSpecialCurve = false;
    this.ball.vx = 0;
    this.ball.vy = 0;
    this.ball.vz = 0;
    this.ball.z = 0;
    audio.playWhistle(false);

    // Phase 11: Dynamic Stadium Crowd Reactivity (Near Miss Gasp)
    const isEndlineExit = crossing.type === 'endline_top' || crossing.type === 'endline_bottom';
    const goalLeft = PITCH_CONFIG.CENTER_X - PITCH_CONFIG.GOAL_WIDTH / 2;
    const goalRight = PITCH_CONFIG.CENTER_X + PITCH_CONFIG.GOAL_WIDTH / 2;
    const isNearPost =
      (crossing.crossingX >= goalLeft - 140 && crossing.crossingX < goalLeft) ||
      (crossing.crossingX > goalRight && crossing.crossingX <= goalRight + 140);
    if (isEndlineExit && (isNearPost || this.ball.lastKickAction === 'shoot')) {
      audio.playNearMissGasp(this.stadiumTier);
    }

    // Phase 7.5.7 Out-of-Bounds Dead-Ball State Enforcement:
    // Immediately cancel lingering tackles, physical duels, and zero velocities
    for (const p of this.players) {
      p.vx = 0;
      p.vy = 0;
      if (p.action === 'sliding_tackle' || p.action === 'standing_tackle') {
        p.action = 'idle';
        p.actionTimer = 0;
      }
    }

    const award = determineOutOfBoundsAward(
      crossing,
      this.ball,
      this.homeTeam.name.toUpperCase(),
      this.awayTeam.name.toUpperCase(),
      this.homeAttacksUp
    );

    if (award) {
      if (this.isPeriodOver()) {
        if (award.type === 'throw_in' || award.type === 'goal_kick') {
          this.checkPeriodEndWhistle();
          return;
        }
        if (award.type === 'corner_kick') {
          if (this.deathSetPieceDecision === null) {
            this.deathSetPieceDecision = Math.random() < 0.70 ? 'allow' : 'blow';
          }
          if (this.deathSetPieceDecision === 'blow') {
            this.checkPeriodEndWhistle();
            return;
          }
        }
      }

      if (award.type === 'corner_kick') {
        this.matchStats[award.awardedTeam].corners++;
        setupCornerKick(this, award.awardedTeam, award.spotX, award.spotY);
        this.setBanner(award.banner, 150);
      } else if (award.type === 'goal_kick') {
        setupGoalKick(this, award.awardedTeam);
        this.setBanner(award.banner, 150);
      } else if (award.type === 'throw_in') {
        setupThrowIn(this, award.awardedTeam, award.spotX, award.spotY);
        this.setBanner(award.banner, 150);
      }
    }

    this.updateUserControlledFlag();
  }

  public togglePause(): boolean {
    this.isPaused = !this.isPaused;
    return this.isPaused;
  }

  public getControlledPlayer(): Player | undefined {
    return this.players.find(p => p.id === this.userControlledPlayerId);
  }
}
