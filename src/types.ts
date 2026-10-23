export type TeamSide = 'home' | 'away';

export type PlayerRole = 'GK' | 'LB' | 'CB1' | 'CB2' | 'RB' | 'LM' | 'CM1' | 'CM2' | 'RM' | 'ST1' | 'ST2';

// Phase 7: Canonical 3-Tier Positional Hierarchy & Authentic Playstyles
export type PrimaryPosition = 'ATT' | 'MID' | 'DEF' | 'GK';

export type SubPosition =
  // Attacker (ATT)
  | 'ST'
  | 'LW'
  | 'RW'
  | 'SS' // [SPECIAL] Second Striker / False 9
  // Midfielder (MID)
  | 'CAM'
  | 'CM'
  | 'CDM'
  | 'LM' // [SPECIAL] Wide Midfielder (inherits Winger)
  | 'RM' // [SPECIAL] Wide Midfielder (inherits Winger)
  // Defender (DEF)
  | 'LB'
  | 'RB'
  | 'CB'
  | 'LWB' // [SPECIAL] Wingback (inherits Fullback)
  | 'RWB' // [SPECIAL] Wingback (inherits Fullback)
  | 'LIB' // [SPECIAL] Libero / Sweeper (inherits CB & CDM)
  // Goalkeeper (GK)
  | 'GK';

export type PlayerPlaystyle =
  // Striker (ST)
  | 'poacher'
  | 'target'
  | 'complete'
  | 'finisher'
  | 'decoy'
  // Winger (LW / RW) & Wide Mid (LM / RM)
  | 'traditional'
  | 'inverted'
  | 'prolific'
  | 'pressing'
  // CAM & Second Striker (SS / False 9)
  | 'creator'
  | 'shadow'
  | 'classic_n10'
  | 'engine'
  // Central Midfielder (CM)
  | 'box_to_box'
  | 'maestro'
  | 'runner'
  // Central Defensive Midfielder (CDM)
  | 'enforcer'
  | 'anchor'
  | 'regista'
  // Fullback (LB / RB) & Wingback (LWB / RWB)
  | 'defensive'
  | 'inverted_fb'
  | 'attacker_fb'
  | 'balanced_fb'
  // Center Back (CB)
  | 'destroyer'
  | 'distributor'
  | 'playmaker'
  | 'stopper'
  // Libero (LIB / SW)
  | 'sweeper_cb'
  // Goalkeeper (GK)
  | 'balanced_gk'
  | 'sweeper'
  | 'wall'
  // Phase 16.5: Neutral Positional Baseline Playstyle
  | 'basic';

export type MatchStakeTier = 'friendly' | 'cup' | 'league' | 'key_match' | 'final';

export type ProgressionTier = 'amateur' | 'pro' | 'elite' | 'pinnacle' | 'stat_break';

export interface StatBreakDuelResolution {
  winner: 'attacker' | 'defender';
  traitTriggered: string;
  reason: string;
}

export interface CanonicalOutfieldStats {
  // Physical
  pac: number; // Pace [40-105]
  sta: number; // Stamina [40-105]
  str: number; // Strength [40-105]
  // Progression
  bcl: number; // Ball Control [40-105]
  ret: number; // Retention [40-105]
  dri: number; // Dribbling [40-105]
  // Passing
  spa: number; // Short Pass [40-105]
  lpa: number; // Long Pass [40-105]
  cro: number; // Crossing [40-105]
  // Goalscoring
  sho: number; // Shooting [40-105]
  hea: number; // Heading [40-105]
  lsh: number; // Long Shots [40-105]
  // Defending
  tck: number; // Tackling [40-105]
  sld: number; // Sliding Tackle [40-105]
  int: number; // Interceptions [40-105]
  mrk: number; // Marking [40-105]
  // Mental
  pos: number; // Positioning [40-105]
  cmp: number; // Composure [40-105]
  rea: number; // Reactions [40-105]
}

export interface CanonicalGoalkeeperStats {
  sav: number; // Saving [40-105]
  ref: number; // Reflexes [40-105]
  han: number; // Handling [40-105]
  gpo: number; // Positioning [40-105]
  aer: number; // Aerial Reach [40-105]
  oneOnOne: number; // 1v1 Smother [40-105]
  dis: number; // Distribution [40-105]
}

export interface PlayerStats {
  speed: number;
  sprintSpeed: number;
  shotPower: number;
  passing: number;
  tackling: number;
  heading: number;
  dribbling?: number;
  canonicalOutfield?: CanonicalOutfieldStats;
  canonicalGk?: CanonicalGoalkeeperStats;
}

// Phase 12: Parametric Player Appearance Framework (Integration Contract)
import type { PlayerAppearance } from './types/player';
export * from './types/player';

// Phase 13: Multi-Tier Team Database & Hierarchical Selection Engine
export * from './types/team';

// Phase 14: Modular Uniform Matrix
export * from './types/kit';

export interface BallTrailPoint {
  x: number;
  y: number;
  z: number;
  alpha: number;
  size: number;
  color?: string;
}

export type PlayerAction =
  | 'idle'
  | 'running'
  | 'kicking'
  | 'passing'
  | 'shooting'
  | 'crossing'
  | 'standing_pass'
  | 'standing_pass_low'
  | 'standing_pass_mid'
  | 'standing_pass_high'
  | 'running_pass'
  | 'running_pass_low'
  | 'running_pass_mid'
  | 'running_pass_high'
  | 'standing_shot'
  | 'standing_shot_low'
  | 'standing_shot_mid'
  | 'standing_shot_high'
  | 'running_shot'
  | 'running_shot_low'
  | 'running_shot_mid'
  | 'running_shot_high'
  | 'standing_cross'
  | 'standing_cross_low'
  | 'standing_cross_mid'
  | 'standing_cross_high'
  | 'running_cross'
  | 'running_cross_low'
  | 'running_cross_mid'
  | 'running_cross_high'
  | 'standing_long_pass'
  | 'standing_long_pass_low'
  | 'standing_long_pass_mid'
  | 'standing_long_pass_high'
  | 'running_long_pass'
  | 'running_long_pass_low'
  | 'running_long_pass_mid'
  | 'running_long_pass_high'
  | 'standing_tackle'
  | 'sliding_tackle'
  | 'heading'
  | 'fouled_falling'
  | 'goalkeeper_dive'
  | 'celebrating'
  | 'trapping'
  | 'shielding'
  | 'step_overs'
  | 'nutmeg_dash'
  | 'dribbling'
  | 'special_curl_shot'
  | 'knuckle_shot'
  | 'special_curl_pass'
  | 'knuckle_pass'
  | 'cruyff_turn'
  | 'rainbow_flick'
  | 'shirt_pull'
  | 'volley'
  | 'bicycle_kick'
  | 'scissor_kick'
  | 'scorpion_kick'
  | 'sombrero'
  | 'ginga_juggle'
  | 'roulette'
  | 'clearing'
  | 'pushing_foul'
  | 'throw_in'
  | 'throw_in_throw'
  | 'freekick_stance'
  | 'freekick_strike'
  | 'penalty_stance'
  | 'penalty_runup'
  | 'penalty_strike'
  | 'wall_stance'
  | 'wall_jump'
  | 'goalkeeper_penalty_anticipate'
  | 'half_volley'
  | 'diving_volley'
  | 'side_volley'
  | 'chest_volley'
  | 'rabona_volley'
  | 'flying_heel_volley'
  | 'sombrero_volley'
  | 'diving_header'
  | 'chip_shot'
  | 'chipped_cross'
  | 'chipped_long_pass'
  | 'elastico'
  | 'around_the_world'
  | 'heel_chop'
  // Phase 8: Expressive Procedural Animations & Physicality Polish
  | 'close_control'
  | 'body_feint'
  | 'driven_laces_strike'
  | 'curling_finesse'
  | 'sliding_toe_poke'
  | 'sidefoot_push'
  | 'trivela'
  | 'scoop_chip'
  | 'backheel_flick'
  | 'defensive_jockey'
  | 'deceleration_skid'
  | 'bullet_header'
  | 'glancing_header'
  | 'contested_duel'
  | 'gk_low_smother'
  | 'gk_fingertip_parry'
  | 'gk_punch'
  | 'gk_star_spread'
  | 'gk_high_catch'
  | 'gk_recovery_roll';

export interface Player {
  id: string;
  name: string;
  number: number;
  team: TeamSide;
  role: PlayerRole;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  baseX: number; // Base formation normalized X (0 to 1)
  baseY: number; // Base formation normalized Y (0 to 1)
  facingAngle: number; // In radians
  facingDir: 'up' | 'down' | 'left' | 'right' | 'up-left' | 'up-right' | 'down-left' | 'down-right';
  stats: PlayerStats;
  appearance: PlayerAppearance;
  scale?: number; // Physical player size scale (0.92 - 1.08)
  action: PlayerAction;
  actionTimer: number;
  stamina: number;
  staminaMax?: number;
  staminaInitialMax?: number;
  statsBuffer?: Float32Array;
  canonicalStats?: CanonicalOutfieldStats | CanonicalGoalkeeperStats;
  hasYellowCard: boolean;
  isRedCarded: boolean;
  animFrame: number;
  animTimer: number;
  isUserControlled: boolean;
  slideVelocityX: number;
  slideVelocityY: number;
  diveX: number;
  diveY: number;
  confusedTimer?: number; // Subtle confused emoji above defender when nutmegged
  stepOverTimer?: number; // Step-overs active frames
  isStepOverActive?: boolean; // Step-overs active flag
  stepOverDirChanged?: boolean; // Direction change effectiveness boost
  stepOverOriginalAngle?: number; // Original angle before direction change
  isShielding?: boolean; // Q key shielding active
  dashTimer?: number; // E explosive dash timer
  cruyffTurnTimer?: number; // Cruyff turn active
  rainbowFlickTimer?: number; // Rainbow flick active
  longThrowCharge?: number; // E long autopass charge level (0 to 1)
  isLongThrowCharging?: boolean; // E key held down while running
  shirtPulledTimer?: number; // Slowed down by opponent pulling shirt
  shirtPullingTimer?: number; // Defender pulling opponent shirt
  shirtPullTargetId?: string; // ID of player being pulled
  shoulderHitTimer?: number; // Defender shoulder barge timer
  isGingaLifting?: boolean; // Spacebar held to lift ball
  gingaHoldTimer?: number; // Frames spacebar held for Ginga lift
  gingaActive?: boolean; // Ball juggling mode active
  gingaCombo?: number; // Consecutive juggles kept in the air
  gkHoldTimer?: number; // Goalkeeper holding ball before clearing/passing
  temporaryCoverRole?: PlayerRole | null; // Total Football positional rotation
  tacticalMarkingTargetId?: string | null; // Man-to-man marking opponent assignment
  // Phase 4 & Phase 5: Dynamic Team AI, Line Intermingling & Tactical Engine fields
  supportRunType?: 'blindside' | 'overlap' | 'underlap' | 'drop_pocket' | 'cutback' | 'triangle_short' | 'triangle_penetrate' | 'third_man' | null;
  isSignalingForPass?: boolean;
  signalPassTimer?: number;
  pressRole?: 'hunter' | 'trap_closer' | 'cover_shadow' | null;
  tacticalTargetX?: number;
  tacticalTargetY?: number;
  tacticalBlockPhase?: TacticalBlockPhase;
  isRestDefence?: boolean;
  isSteppingOut?: boolean;
  stepOutTimer?: number;
  coverShadowTargetId?: string | null;
  // Phase 6: AI Decision Quality, Anti-Spam & Defensive Calibration
  lastPassPartnerId?: string;
  consecutiveBackPasses?: number;
  isRecoverySprinting?: boolean;
  recoveryRunTargetY?: number;
  // Phase 6: Attribute Progression Tiers & ⚡ Stat Break Engine
  ghostTrails?: Array<{ x: number; y: number; facingAngle: number; alpha: number; team: TeamSide }>;
  statBreakAuraTimer?: number;
  statBreakTraitName?: string;
  activeStatBreakTrait?: string | null;
  stumbleTimer?: number;
  stumbleReason?: string;
  // Phase 7: Canonical 3-Tier Positional Hierarchy & Authentic Playstyles
  primaryPos?: PrimaryPosition;
  primaryPosId?: number; // 0: ATT, 1: MID, 2: DEF, 3: GK
  subPos?: SubPosition;
  subPosId?: number;     // 0..15 integer constant for O(1) comparison
  playstyle?: PlayerPlaystyle;
  intrinsicPlaystyle?: PlayerPlaystyle; // Phase 16.5: Natural playstyle restored upon returning to compatible position
  playstyleId?: number;  // 0..31 integer constant for zero-allocation math
  playstyleName?: string;
  jumpHeight?: number; // Visual and collision elevation for wall jump
  // Phase 8: Expressive Procedural Animations & Physicality Polish fields
  jockeyTimer?: number; // Defensive jockey / backpedal stance
  decelSkidTimer?: number; // Braking deceleration turf skid timer
  aerialDuelTimer?: number; // Contested aerial duel clash timer
  aerialJumpZ?: number; // Procedural vertical leap height
  gkSpecialActionTimer?: number; // Goalkeeper acrobatic specialist save timer
  touchStepFoot?: 'left' | 'right'; // Close-control micro-tap alternating foot
  bodyFeintDir?: 'left' | 'right'; // Body feint drop direction
  prevVx?: number; // Momentum tracking for sudden deceleration skids
  prevVy?: number;
  prevFacingAngle?: number; // Body feint sharp cut angle tracking
  kickoffPrepTimer?: number; // AI preparation timer before executing kickoff pass
  // Phase 11: Wet surface & puddle slip physics
  slipTimer?: number; // Frames of traction loss on wet/puddle turf
  slipAngle?: number; // Angle of slip trajectory
  // Phase 8: Procedural Dribbling Animation Tiers & On-Ball Locomotion
  dribbleTier?: DribblingTier;
  onBallAccelProgress?: number; // Progressive on-ball acceleration ramp
  // Phase 9: Aerial Anticipation, Headers, Volleys & Rebound Reflexes
  aerialAwarenessTimer?: number; // Frames before player reacts to aerial drop-zone
  aerialDropTargetX?: number; // Target X coordinate of expected ball landing
  aerialDropTargetY?: number; // Target Y coordinate of expected ball landing
  secondBallReactTimer?: number; // Reaction lag frames before pursuing loose rebound
  isPursuingRebound?: boolean; // Currently sprinting toward loose second ball
}

// Phase 8: 6 Dribbling Animation Tiers (Section 8.1)
export type DribblingTier = 'amateur' | 'semi_pro' | 'pro' | 'elite' | 'world_class' | 'unique';

export type DifficultyLevel = 'standing' | 'easy' | 'normal' | 'elite' | 'legend';

export interface Ball {
  x: number;
  y: number;
  z: number; // Height above ground in pixels
  vx: number;
  vy: number;
  vz: number;
  spin: number; // Angular horizontal spin for Magnus curl effect (-6 to +6)
  spinY?: number; // Backspin / topspin affecting lift and bounce check
  ownerId: string | null;
  lastTouchTeam: TeamSide | null;
  lastTouchPlayerId: string | null;
  isAirborne: boolean;
  deformation?: number; // 0 (spherical) to 1 (max oval elongation)
  deformationAngle?: number; // Axis of oval elongation in radians
  squashTimer?: number; // Bounce impact squash frames
  rotationAngle?: number; // Visual rotational angle in radians
  trail?: BallTrailPoint[]; // Pixel motion / curl trail
  isSpecialCurve?: boolean; // Q-modifier extra curve
  isOverpowered?: boolean; // Hit in red / purplish black / burgundy (overdone)
  isKnuckle?: boolean; // Legacy E-modifier knuckleball
  isChipped?: boolean; // Phase 2: E-modifier delicate chip (lifted with backspin)
  chipType?: 'shot' | 'cross' | 'pass'; // Specific chip variation
  knuckleDipped?: boolean; // True once knuckleball drops sharply
  lastKickAction?: 'shoot' | 'cross' | 'long_pass' | 'pass' | 'clearance' | 'none';
  lastKickPower?: number; // 0.0 to 1.0 power bar level
  isDividedBall?: boolean; // Contested divided ball in transit
  prevX?: number; // Previous frame X for raycasting boundary crossing
  prevY?: number; // Previous frame Y for raycasting boundary crossing
  prevZ?: number; // Previous frame Z for raycasting boundary crossing
  // Phase 6: Stat Break Ball Attributes
  isStatBreak?: boolean;
  isThunderbolt?: boolean;
  thunderboltWobblePhase?: number;
  isLaserPing?: boolean;
  isGuidedWhip?: boolean;
  isRadarTelemetry?: boolean;
  isDeadlyAssassin?: boolean;
  statBreakTrait?: string;
  // Phase 11: Weather Ball & Puddle Physics
  ballType?: 'standard' | 'winter_orange' | 'winter_yellow';
  inPuddle?: boolean;
  // Phase 9: Rebounds & Second-Ball Reflexes
  isSecondBall?: boolean; // Loose ball resulting from duel/save/deflection
  isRebound?: boolean; // Specific rebound from GK save, post, or block
}

export type PowerActionType = 'pass' | 'long_pass' | 'shoot' | 'cross';

export interface PowerBarState {
  isActive: boolean;
  action: PowerActionType | null;
  power: number; // 0.0 to 1.0
  isSpecial: boolean; // Q modifier active (banana curve / swerve)
  isKnuckle: boolean; // E modifier active
  isChipped?: boolean; // Phase 2: E modifier chip mode active
  fillSpeed: number; // Filling increment per frame
  tier: 1 | 2 | 3 | 4 | 5;
  tierColor: string;
  tierLabel: string;
  fadeAlpha?: number;
}

export interface TeamKit {
  name: string;
  shortName: string;
  primaryColor: string; // Shirt main
  secondaryColor: string; // Shirt trim or stripe
  shortsColor: string;
  socksColor: string;
  gkColor: string;
}

export interface MatchScore {
  home: number;
  away: number;
}

export type MatchPhase =
  | 'kickoff_ready'
  | 'in_play'
  | 'goal_scored'
  | 'goal_celebration'
  | 'foul_stoppage'
  | 'free_kick'
  | 'penalty'
  | 'corner_kick'
  | 'goal_kick'
  | 'throw_in'
  | 'half_time'
  | 'full_time'
  | 'extra_time_half'
  | 'penalty_shootout';

export interface TeamMatchStats {
  goals: number;
  shots: number;
  shotsOnTarget: number;
  corners: number;
  fouls: number;
  yellowCards: number;
  redCards: number;
  possessionFrames: number;
  passesAttempted: number;
  passesCompleted: number;
  tackles: number;
  offsides: number;
}

export interface MatchStats {
  home: TeamMatchStats;
  away: TeamMatchStats;
}

export interface Referee {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facingAngle: number; // Sight direction (radians)
  sightRange: number; // Sight distance in field pixels (~360px)
  sightFov: number; // Field of vision cone in radians (~1.9 rad = ~110°)
  whistleTimer: number;
  cardDisplay: 'yellow' | 'red' | null;
  cardPlayerName: string | null;
  sightConeAlpha?: number;
}

export interface GoalNetState {
  impactX: number;
  impactY: number;
  impactZ: number;
  bulgeAmount: number; // Current physical bulge displacement (px)
  bulgeVel: number;    // Elastic spring velocity
  shake: number;       // Wave ripple vibration intensity
  ballCaught: boolean; // Whether ball is currently cushioned inside net
}

export interface SetPieceState {
  type: 'free_kick' | 'penalty' | 'corner_kick' | 'goal_kick' | 'throw_in';
  takerId: string;
  team: TeamSide;
  spotX: number;
  spotY: number;
  aimAngle: number;
  elevation?: number; // -1 (low driven) to +1 (high dip)
  curve?: number;     // -1 (left bend) to +1 (right bend)
  wallPlayerIds: string[];
  isPenalty: boolean;
  phase?: 'aiming' | 'runup' | 'kicking' | 'delivered';
  targetReticleX?: number;
  targetReticleY?: number;
  targetReticleZ?: number;
  sweetSpotZone?: 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right' | 'none';
  gkWeightShift?: 'left' | 'right' | 'center';
  isPanenka?: boolean;
}

export interface TurfParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

export interface KeyState {
  ArrowUp: boolean;
  ArrowDown: boolean;
  ArrowLeft: boolean;
  ArrowRight: boolean;
  Shift: boolean;
  KeyW: boolean;
  KeyA: boolean;
  KeyS: boolean;
  KeyD: boolean;
  KeyQ: boolean;
  KeyE: boolean;
  Space: boolean;
  KeyG?: boolean;
}

export type PlayerIndicatorType = 'small_arrow' | 'big_arrow' | 'circle';
export type PlayerIndicatorStyle = 'solid' | 'transparent' | 'off';

export type ControlMode = 'full_team' | 'one_player';

export interface ControllerCustomization {
  stickSide: 'left' | 'right';
  stickScale: number;
  stickOffsetX: number;
  stickOffsetY: number;
  buttonsLayout: 'diamond' | 'arc' | 'cluster';
  buttonsSpacing: number;
  buttonsOffsetX: number;
  buttonsOffsetY: number;
  deckHeight: number;
  deckScale: number;
  deckOpacity: number;
}

export type CameraMode = 'pitch' | 'ball' | 'player';

export interface CustomKeyBindings {
  longPass: string; // default: 'KeyW'
  shoot: string; // default: 'KeyA'
  shortPass: string; // default: 'KeyS'
  cross: string; // default: 'KeyD'
  sprint: string; // default: 'Shift'
  gingaSwitch: string; // default: 'Space'
  skillQ: string; // default: 'KeyQ'
  skillE: string; // default: 'KeyE'
  moveUp: string; // default: 'ArrowUp'
  moveDown: string; // default: 'ArrowDown'
  moveLeft: string; // default: 'ArrowLeft'
  moveRight: string; // default: 'ArrowRight'
  cameraFocus: string; // default: 'KeyC'
}

// ==========================================
// PHASE 1.5 & PHASE 4.5: MULTI-PLAYER, CONTROL SCOPE & CURSOR SWITCHING
// ==========================================
export type ControllerSide = 'home' | 'spectator' | 'away';
export type InputDeviceType = 'keyboard' | 'gamepad' | 'touch';
export type InputControlMode = 'keyboard' | 'touch' | 'gamepad';
export type KeyboardPreset = 'arrows' | 'wasd';
export type ControlScope = 'all_team' | 'single_player';
export type CursorSwitchMode = 'manual' | 'automatic';

export interface PlayerSlotConfig {
  id: number; // 1, 2, 3, 4
  name: string; // '1P', '2P', '3P', '4P'
  side: ControllerSide; // 'home' | 'spectator' | 'away'
  device: InputDeviceType; // 'keyboard' | 'gamepad' | 'touch'
  keyboardPreset?: KeyboardPreset; // 'arrows' | 'wasd'
  gamepadIndex?: number; // 0, 1, 2, 3
  color: string; // 1P: Blue (#38bdf8), 2P: Amber (#f59e0b), 3P: Emerald (#10b981), 4P: Purple (#a855f7)
  keyBindings?: CustomKeyBindings;
  controlScope?: ControlScope; // 'all_team' | 'single_player'
  lockedPlayerId?: string; // Player ID for single player lock
  cursorSwitchMode?: CursorSwitchMode; // 'manual' | 'automatic'
}

export const DEFAULT_KEY_BINDINGS_1P: CustomKeyBindings = {
  moveUp: 'ArrowUp',
  moveDown: 'ArrowDown',
  moveLeft: 'ArrowLeft',
  moveRight: 'ArrowRight',
  shortPass: 'KeyS',
  shoot: 'KeyA',
  longPass: 'KeyW',
  cross: 'KeyD',
  sprint: 'ShiftLeft',
  gingaSwitch: 'Space',
  skillQ: 'KeyQ',
  skillE: 'KeyE',
  cameraFocus: 'KeyC',
};

export const DEFAULT_KEY_BINDINGS_WASD: CustomKeyBindings = {
  moveUp: 'KeyW',
  moveDown: 'KeyS',
  moveLeft: 'KeyA',
  moveRight: 'KeyD',
  shortPass: 'KeyJ',
  shoot: 'KeyK',
  longPass: 'KeyI',
  cross: 'KeyL',
  sprint: 'ShiftLeft',
  gingaSwitch: 'Space',
  skillQ: 'KeyU',
  skillE: 'KeyO',
  cameraFocus: 'KeyC',
};

export const DEFAULT_KEY_BINDINGS_2P: CustomKeyBindings = {
  moveUp: 'KeyI',
  moveDown: 'KeyK',
  moveLeft: 'KeyJ',
  moveRight: 'KeyL',
  shortPass: 'KeyU',
  shoot: 'KeyO',
  longPass: 'KeyY',
  cross: 'KeyP',
  sprint: 'KeyN',
  gingaSwitch: 'KeyH',
  skillQ: 'KeyH',
  skillE: 'KeyN',
  cameraFocus: 'BracketRight',
};

export const DEFAULT_KEY_BINDINGS_3P: CustomKeyBindings = {
  moveUp: 'Numpad8',
  moveDown: 'Numpad5',
  moveLeft: 'Numpad4',
  moveRight: 'Numpad6',
  shortPass: 'Numpad1',
  shoot: 'Numpad2',
  longPass: 'Numpad3',
  cross: 'Numpad0',
  sprint: 'NumpadEnter',
  gingaSwitch: 'NumpadDecimal',
  skillQ: 'Numpad7',
  skillE: 'Numpad9',
  cameraFocus: 'NumpadAdd',
};

export const DEFAULT_KEY_BINDINGS_4P: CustomKeyBindings = {
  moveUp: 'KeyT',
  moveDown: 'KeyG',
  moveLeft: 'KeyF',
  moveRight: 'KeyH',
  shortPass: 'KeyZ',
  shoot: 'KeyX',
  longPass: 'KeyC',
  cross: 'KeyV',
  sprint: 'KeyR',
  gingaSwitch: 'KeyB',
  skillQ: 'KeyB',
  skillE: 'KeyR',
  cameraFocus: 'Digit6',
};

export const DEFAULT_PLAYER_SLOTS: PlayerSlotConfig[] = [
  {
    id: 1,
    name: '1P',
    side: 'home',
    device: 'keyboard',
    gamepadIndex: 0,
    color: '#38bdf8', // Neon Sky Blue
    keyBindings: DEFAULT_KEY_BINDINGS_1P,
  },
];

export interface GamepadBindings {
  shortPass: number;
  cross: number;
  shoot: number;
  longPass: number;
  gingaSwitch: number;
  sprint: number;
  skillQ: number;
  skillE: number;
  pause: number;
  cameraFocus: number;
}

export type FormationName =
  | '4-3-3'
  | '4-2-3-1'
  | '4-4-2'
  | '4-5-1'
  | '3-5-2'
  | '3-4-3'
  | '3-4-3-diamond'
  | '5-3-2'
  | '5-4-1'
  | 'custom';

export type ControllerBgMode = 'solid' | 'transparent' | 'floating' | 'hidden';

export type TacticalPlaystyle =
  | 'catenaccio'
  | 'possession'
  | 'long_ball'
  | 'futbol_champan'
  | 'conservative'
  | 'counterattack'
  | 'gegenpress'
  | 'arteta_control'
  | 'brexitball'
  | 'jogobonito'
  | 'custom';

// Phase 4: Tactical Team Block & Compactness Phases (2026 Modern Tactical Core)
export type TacticalBlockPhase =
  | 'high_press'
  | 'mid_block'
  | 'low_block'
  | 'attacking_possession'
  | 'counter_press';

// ==========================================
// DETAILED TACTICAL CATEGORIES & SETTINGS
// ==========================================

export type DefensiveLineLevel = 1 | 2 | 3 | 4 | 5;
export type DefensiveStyle = 'marking' | 'mixed' | 'zonal';
export type DefensiveCompactness = 1 | 2 | 3 | 4;

export type AttackingCreation = 'short' | 'mixed' | 'long';
export type AttackingFinalThird = 'early_shoot' | 'crossing' | 'secure';
export type AttackingShape = 'total_football' | 'free' | 'relational' | 'strict';
export type AttackingRuns = 'all_attack' | 'moderate' | 'low' | 'all_defend';

export interface DetailedTactics {
  // Defensive Category
  defensiveLine: DefensiveLineLevel; // 1 (Deep drop in box) to 5 (High press at halfway line)
  defensiveStyle: DefensiveStyle;    // 'marking' | 'mixed' | 'zonal'
  offsideTrap: boolean;              // true (YES) | false (NO)
  compactness: DefensiveCompactness; // 1 (Dispersed) to 4 (Ultra compact)

  // Attacking Category
  creation: AttackingCreation;       // 'short' | 'mixed' | 'long'
  finalThird: AttackingFinalThird;   // 'early_shoot' | 'crossing' | 'secure'
  shape: AttackingShape;             // 'total_football' | 'free' | 'relational' | 'strict'
  runs: AttackingRuns;               // 'all_attack' | 'moderate' | 'low' | 'all_defend'
}

export type HalfDurationMinutes = 2 | 3 | 5 | 10;

// ==========================================
// PHASE 10: DYNAMIC STADIUMS & MATCH ATMOSPHERE
// ==========================================
export type StadiumTier = 'monumental' | 'craven' | 'ascenso';
export type TimeOfDay = 'dawn' | 'noon' | 'sunset' | 'night';
export type SeatColorMode = 'auto' | 'blue' | 'red' | 'yellow' | 'green' | 'white' | 'wooden' | 'concrete';
export type CrowdLevel = 'empty' | 'small' | 'few' | 'half' | 'crowded' | 'packet';

// ==========================================
// PHASE 11: PITCH DIMENSIONS, WEATHER & SURFACE PHYSICS
// ==========================================
export type PitchDimensionPreset = 'compact' | 'balanced' | 'expansive' | 'custom';

export interface PitchDimensionConfig {
  preset: PitchDimensionPreset;
  lengthMeters: number; // 90 to 120m
  widthMeters: number;  // 45 to 90m
}

export type TurfQuality = 'pristine' | 'normal' | 'poor';
export type GrassLength = 'short' | 'normal' | 'long';
export type SurfaceStatus = 'dry' | 'normal' | 'wet';
export type LawnMowingPattern =
  | 'plain'
  | 'horizontal'
  | 'vertical'
  | 'european_boxes'
  | 'checkerboard'
  | 'diagonal_diamonds'
  | 'concentric_circles';
export type WeatherCondition = 'clear' | 'cloudy' | 'rain' | 'torrential' | 'snow' | 'blizzard';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type NetTension = 'hard' | 'moderate' | 'soft';
export type GoalFrameType = 'standard' | 'brazilian';

export interface PuddleZone {
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  depth: number;
}

export interface WeatherParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  type: 'rain' | 'snow' | 'splash' | 'spray';
  life: number;
  maxLife: number;
  size: number;
  alpha: number;
}

export interface PreMatchConfig {
  halfDurationMinutes: HalfDurationMinutes;
  homeFormation: FormationName;
  awayFormation: FormationName;
  homePlaystyle: TacticalPlaystyle;
  awayPlaystyle: TacticalPlaystyle;
  homeTactics?: DetailedTactics;
  awayTactics?: DetailedTactics;
  difficulty: DifficultyLevel;
  matchStakeTier?: MatchStakeTier;
  stadiumTier?: StadiumTier;
  timeOfDay?: TimeOfDay;
  seatColor?: SeatColorMode;
  crowdLevel?: CrowdLevel;
  // Phase 11 Additions
  pitchPreset?: PitchDimensionPreset;
  pitchLengthMeters?: number;
  pitchWidthMeters?: number;
  turfQuality?: TurfQuality;
  grassLength?: GrassLength;
  mowingPattern?: LawnMowingPattern;
  surfaceStatus?: SurfaceStatus;
  weather?: WeatherCondition;
  season?: Season;
  netTension?: NetTension;
  goalFrame?: GoalFrameType;
  // Phase 13 Additions: Multi-Tier Team Selection
  homeTeamId?: string;
  awayTeamId?: string;
  // Phase 14 Additions: Modular Uniform Matrix
  customHomeKit?: TeamKit;
  customAwayKit?: TeamKit;
  // Phase 0 / Be-A-Pro: User chosen locked player
  lockedPlayerId?: string;
  // Phase 4.5: Control Scope & Cursor Switch Mode
  controlScope?: ControlScope;
  cursorSwitchMode?: CursorSwitchMode;
}

export interface OffsideIncident {
  infringingPlayerId: string;
  infringingTeam: TeamSide;
  passStartX: number;
  passStartY: number;
  spotX: number;
  spotY: number;
  defensiveLineY: number;
}

// ==========================================
// PHASE 9: SCALABLE 3-TIER GRAPHICS PIPELINE & RETRO FILTER SUITE
// ==========================================

export type GraphicsTier = 'performance' | 'balanced' | 'high_end';

export type RetroFilterType =
  | 'none'
  | 'crt_arcade'
  | 'vhs_1994'
  | 'neo_geo_16bit'
  | 'vintage_1954'
  | 'manga_tsubasa'
  | 'cyberpunk_neon'
  | 'cinematic_35mm';

export interface GraphicsSettings {
  tier: GraphicsTier;
  quadShadows: boolean;         // 4 directional projected player shadows under corner floodlights
  ambientOcclusion: boolean;    // Soft contact ambient occlusion beneath player cleats
  pitchScuffs: boolean;         // Dynamic pitch turf scuffs & slide gouges persist for the half
  highDpi: boolean;             // High-DPI Super-Sampling (renders at native 1.5 - 2.0x DPR)
  volumetricLighting: boolean;  // Volumetric Stadium Rafter Haze & floodlight bloom
  crowdFlashbulbs: boolean;     // Dynamic camera flashes in grandstands on big moments
  netSpringPhysics: boolean;    // Micro-physics spring simulation on goal nets
  powerVaporTrails: boolean;    // Supersonic vapor trails on power shots
  waterSprayParticles: boolean; // Turf spray & water splash particles on slides
  activeFilter: RetroFilterType;
  unlockedFilters: RetroFilterType[];
}

export interface PitchScuffMark {
  x: number;
  y: number;
  angle: number;
  length: number;
  width: number;
  opacity: number;
  alpha?: number;
  life?: number;
  color: string;
}

export type {
  TeamTacticalRoles,
  TeamDefinition,
  TeamRosterPlayer,
  TeamCategory,
  Confederation,
  RatingTier,
  TeamBadge,
} from './types/team';

// Phase 10: Live Player Rating Engine (SofaScore Model) & Match MVP
export type { PlayerRatingRecord, MatchMvpResult } from './game/playerRatings';
