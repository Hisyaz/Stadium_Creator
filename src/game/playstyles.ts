/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  PrimaryPosition,
  SubPosition,
  PlayerPlaystyle,
  PlayerRole,
  FormationName,
  Player,
} from '../types';
import { resolveEffectivePlaystyle, isPlaystyleCompatibleWithSubPosition } from './pitchGrid';

export { resolveEffectivePlaystyle, isPlaystyleCompatibleWithSubPosition };

/**
 * =========================================================================
 * PHASE 7: POSITIONAL HIERARCHY, SUB-POSITIONS & AUTHENTIC PLAYSTYLES
 *
 * DrawStar Remake 2.0 authoritative 3-tier hierarchy:
 * Primary Position (4) -> Tactical Sub-Position (16) -> Characteristic Playstyle (31)
 *
 * 1. Numeric Integer Constants for zero-string comparison in 60 FPS update loop
 * 2. Static Behavioral Bias Multipliers for vector calculations
 * 3. Zero Heap Allocations during AI Decision Loops
 * =========================================================================
 */

// ---------------------------------------------------------------------------
// 1. PRIMARY POSITION CONSTANTS & BITMASKS
// ---------------------------------------------------------------------------
export const PRIMARY_POSITION_ID = {
  ATT: 0,
  MID: 1,
  DEF: 2,
  GK: 3,
} as const;

export type PrimaryPositionId = typeof PRIMARY_POSITION_ID[keyof typeof PRIMARY_POSITION_ID];

// ---------------------------------------------------------------------------
// 2. SUB-POSITION CONSTANTS & METADATA
// ---------------------------------------------------------------------------
export const SUB_POSITION_ID = {
  GK: 0,
  CB: 1,
  LB: 2,
  RB: 3,
  LWB: 4,
  RWB: 5,
  LIB: 6,
  CDM: 7,
  CM: 8,
  CAM: 9,
  LM: 10,
  RM: 11,
  LW: 12,
  RW: 13,
  ST: 14,
  SS: 15,
} as const;

export type SubPositionId = typeof SUB_POSITION_ID[keyof typeof SUB_POSITION_ID];

export interface SubPositionMetadata {
  id: SubPosition;
  numericId: SubPositionId;
  primary: PrimaryPosition;
  primaryId: PrimaryPositionId;
  name: string;
  shortCode: string;
  isSpecial: boolean;
  inheritedFrom?: SubPosition[];
  allowedPlaystyles: PlayerPlaystyle[];
}

// ---------------------------------------------------------------------------
// 3. PLAYSTYLE CONSTANTS & METADATA
// ---------------------------------------------------------------------------
export const PLAYSTYLE_ID = {
  // Strikers (ST)
  POACHER: 0,
  TARGET: 1,
  COMPLETE: 2,
  FINISHER: 3,
  DECOY: 4,
  // Wingers & Wide Mids (LW/RW, LM/RM)
  TRADITIONAL: 5,
  INVERTED: 6,
  PROLIFIC: 7,
  PRESSING: 8,
  // CAM & Second Strikers (CAM, SS)
  CREATOR: 9,
  SHADOW: 10,
  CLASSIC_N10: 11,
  ENGINE: 12,
  // Central Midfielders (CM)
  BOX_TO_BOX: 13,
  MAESTRO: 14,
  RUNNER: 15,
  // Central Defensive Midfielders (CDM)
  ENFORCER: 16,
  ANCHOR: 17,
  REGISTA: 18,
  // Fullbacks & Wingbacks (LB/RB, LWB/RWB)
  DEFENSIVE: 19,
  INVERTED_FB: 20,
  ATTACKER_FB: 21,
  BALANCED_FB: 22,
  // Center Backs (CB)
  DESTROYER: 23,
  DISTRIBUTOR: 24,
  PLAYMAKER: 25,
  STOPPER: 26,
  SWEEPER_CB: 27,
  // Goalkeepers (GK)
  BALANCED_GK: 28,
  SWEEPER: 29,
  WALL: 30,
  // Phase 16.5: Neutral Baseline
  BASIC: 31,
} as const;

export type PlaystyleId = typeof PLAYSTYLE_ID[keyof typeof PLAYSTYLE_ID];

/**
 * Mathematical bias multipliers applied in-place during 60 FPS update loop.
 */
export interface PlaystyleBias {
  forwardRunBias: number;     // Multiplier for forward bursts (e.g. 1.4 for poacher)
  trackBackBias: number;      // Multiplier for defensive recovery (e.g. 0.2 for poacher, 1.4 for b2b)
  cutInsideBias: number;      // Horizontal bias toward center when wide (e.g. 1.3 for inverted winger)
  crossBias: number;          // Propensity to whip cross from flank (e.g. 1.4 for traditional)
  holdZoneY: number;          // Normalized defensive line anchor ratio (e.g. 0.65 for anchor)
  pressTackleRadius: number;  // Engagement proximity multiplier (e.g. 1.3 for destroyer)
  stepOutBias: number;        // Defender stepping out of line to challenge
  safePassBias: number;       // Preference for safe ground passes
  penetrationBias: number;    // Preference for through balls & vertical passes
  boxArrivalBias: number;     // Surging into opponent box on attacks
  roamFreedom: number;        // Freedom to drift laterally into pockets & half-spaces
  aerialDuelBias: number;     // Aggressive positioning for aerial headers / knockdowns
  physicalShieldBias: number; // Propensity to use Q shielding under physical pressure
  sweeperRushDistance: number;// Goalkeeper rush-out threshold
  wallLineAnchor: number;     // Goalkeeper goal line stickiness
}

export interface PlaystyleDetailedDefinition {
  id: PlayerPlaystyle;
  numericId: PlaystyleId;
  name: string;
  tag: string;
  icon: string;
  description: string;
  archetypes: {
    modern: string;
    legends: string;
  };
  mechanicalEffect: string;
  bias: PlaystyleBias;
}

// ---------------------------------------------------------------------------
// 4. PRE-ALLOCATED BIAS LOOKUP TABLE (0 BYTES ALLOCATED PER FRAME)
// ---------------------------------------------------------------------------
export const PLAYSTYLE_BIAS_TABLE: Record<PlaystyleId, PlaystyleBias> = {
  // ST - Poacher
  [PLAYSTYLE_ID.POACHER]: {
    forwardRunBias: 1.45,
    trackBackBias: 0.20,
    cutInsideBias: 1.0,
    crossBias: 0.2,
    holdZoneY: 0.45,
    pressTackleRadius: 0.7,
    stepOutBias: 0.2,
    safePassBias: 0.7,
    penetrationBias: 1.3,
    boxArrivalBias: 1.5,
    roamFreedom: 0.6,
    aerialDuelBias: 1.1,
    physicalShieldBias: 0.8,
    sweeperRushDistance: 0,
    wallLineAnchor: 0,
  },
  // ST - Target
  [PLAYSTYLE_ID.TARGET]: {
    forwardRunBias: 1.05,
    trackBackBias: 0.35,
    cutInsideBias: 0.9,
    crossBias: 0.1,
    holdZoneY: 0.50,
    pressTackleRadius: 0.9,
    stepOutBias: 0.4,
    safePassBias: 1.2,
    penetrationBias: 0.8,
    boxArrivalBias: 1.35,
    roamFreedom: 0.5,
    aerialDuelBias: 1.5,
    physicalShieldBias: 1.6,
    sweeperRushDistance: 0,
    wallLineAnchor: 0,
  },
  // ST - Complete
  [PLAYSTYLE_ID.COMPLETE]: {
    forwardRunBias: 1.35,
    trackBackBias: 0.45,
    cutInsideBias: 1.25,
    crossBias: 0.6,
    holdZoneY: 0.48,
    pressTackleRadius: 1.0,
    stepOutBias: 0.5,
    safePassBias: 1.0,
    penetrationBias: 1.25,
    boxArrivalBias: 1.35,
    roamFreedom: 1.2,
    aerialDuelBias: 1.2,
    physicalShieldBias: 1.2,
    sweeperRushDistance: 0,
    wallLineAnchor: 0,
  },
  // ST - Finisher
  [PLAYSTYLE_ID.FINISHER]: {
    forwardRunBias: 1.30,
    trackBackBias: 0.25,
    cutInsideBias: 1.1,
    crossBias: 0.2,
    holdZoneY: 0.46,
    pressTackleRadius: 0.8,
    stepOutBias: 0.3,
    safePassBias: 0.9,
    penetrationBias: 1.1,
    boxArrivalBias: 1.45,
    roamFreedom: 0.8,
    aerialDuelBias: 1.05,
    physicalShieldBias: 0.9,
    sweeperRushDistance: 0,
    wallLineAnchor: 0,
  },
  // ST - Decoy
  [PLAYSTYLE_ID.DECOY]: {
    forwardRunBias: 1.25,
    trackBackBias: 0.60,
    cutInsideBias: 1.2,
    crossBias: 0.4,
    holdZoneY: 0.52,
    pressTackleRadius: 1.1,
    stepOutBias: 0.7,
    safePassBias: 1.2,
    penetrationBias: 1.0,
    boxArrivalBias: 0.9,
    roamFreedom: 1.5,
    aerialDuelBias: 0.9,
    physicalShieldBias: 1.1,
    sweeperRushDistance: 0,
    wallLineAnchor: 0,
  },
  // WINGER - Traditional
  [PLAYSTYLE_ID.TRADITIONAL]: {
    forwardRunBias: 1.35,
    trackBackBias: 0.65,
    cutInsideBias: 0.45,
    crossBias: 1.55,
    holdZoneY: 0.55,
    pressTackleRadius: 0.9,
    stepOutBias: 0.4,
    safePassBias: 0.85,
    penetrationBias: 1.2,
    boxArrivalBias: 0.7,
    roamFreedom: 0.4,
    aerialDuelBias: 0.6,
    physicalShieldBias: 0.7,
    sweeperRushDistance: 0,
    wallLineAnchor: 0,
  },
  // WINGER - Inverted
  [PLAYSTYLE_ID.INVERTED]: {
    forwardRunBias: 1.30,
    trackBackBias: 0.55,
    cutInsideBias: 1.50,
    crossBias: 0.45,
    holdZoneY: 0.52,
    pressTackleRadius: 0.9,
    stepOutBias: 0.5,
    safePassBias: 1.0,
    penetrationBias: 1.3,
    boxArrivalBias: 1.2,
    roamFreedom: 1.2,
    aerialDuelBias: 0.6,
    physicalShieldBias: 1.0,
    sweeperRushDistance: 0,
    wallLineAnchor: 0,
  },
  // WINGER - Prolific
  [PLAYSTYLE_ID.PROLIFIC]: {
    forwardRunBias: 1.40,
    trackBackBias: 0.40,
    cutInsideBias: 1.35,
    crossBias: 0.5,
    holdZoneY: 0.50,
    pressTackleRadius: 0.85,
    stepOutBias: 0.4,
    safePassBias: 0.8,
    penetrationBias: 1.25,
    boxArrivalBias: 1.45,
    roamFreedom: 1.1,
    aerialDuelBias: 1.0,
    physicalShieldBias: 0.9,
    sweeperRushDistance: 0,
    wallLineAnchor: 0,
  },
  // WINGER - Pressing
  [PLAYSTYLE_ID.PRESSING]: {
    forwardRunBias: 1.15,
    trackBackBias: 1.35,
    cutInsideBias: 0.9,
    crossBias: 0.8,
    holdZoneY: 0.58,
    pressTackleRadius: 1.4,
    stepOutBias: 1.2,
    safePassBias: 1.1,
    penetrationBias: 0.9,
    boxArrivalBias: 0.8,
    roamFreedom: 0.7,
    aerialDuelBias: 0.8,
    physicalShieldBias: 1.1,
    sweeperRushDistance: 0,
    wallLineAnchor: 0,
  },
  // CAM - Creator
  [PLAYSTYLE_ID.CREATOR]: {
    forwardRunBias: 1.10,
    trackBackBias: 0.50,
    cutInsideBias: 1.1,
    crossBias: 0.7,
    holdZoneY: 0.58,
    pressTackleRadius: 0.8,
    stepOutBias: 0.4,
    safePassBias: 1.0,
    penetrationBias: 1.55,
    boxArrivalBias: 1.0,
    roamFreedom: 1.4,
    aerialDuelBias: 0.6,
    physicalShieldBias: 1.1,
    sweeperRushDistance: 0,
    wallLineAnchor: 0,
  },
  // CAM - Shadow
  [PLAYSTYLE_ID.SHADOW]: {
    forwardRunBias: 1.40,
    trackBackBias: 0.45,
    cutInsideBias: 1.15,
    crossBias: 0.4,
    holdZoneY: 0.55,
    pressTackleRadius: 0.9,
    stepOutBias: 0.5,
    safePassBias: 0.9,
    penetrationBias: 1.1,
    boxArrivalBias: 1.55,
    roamFreedom: 1.0,
    aerialDuelBias: 1.2,
    physicalShieldBias: 1.0,
    sweeperRushDistance: 0,
    wallLineAnchor: 0,
  },
  // CAM - Classic N10
  [PLAYSTYLE_ID.CLASSIC_N10]: {
    forwardRunBias: 0.85,
    trackBackBias: 0.30,
    cutInsideBias: 1.2,
    crossBias: 0.6,
    holdZoneY: 0.56,
    pressTackleRadius: 0.6,
    stepOutBias: 0.3,
    safePassBias: 1.3,
    penetrationBias: 1.4,
    boxArrivalBias: 0.85,
    roamFreedom: 1.6,
    aerialDuelBias: 0.5,
    physicalShieldBias: 1.4,
    sweeperRushDistance: 0,
    wallLineAnchor: 0,
  },
  // CAM - Engine
  [PLAYSTYLE_ID.ENGINE]: {
    forwardRunBias: 1.25,
    trackBackBias: 1.20,
    cutInsideBias: 1.0,
    crossBias: 0.7,
    holdZoneY: 0.60,
    pressTackleRadius: 1.25,
    stepOutBias: 0.9,
    safePassBias: 1.0,
    penetrationBias: 1.1,
    boxArrivalBias: 1.2,
    roamFreedom: 1.1,
    aerialDuelBias: 1.1,
    physicalShieldBias: 1.3,
    sweeperRushDistance: 0,
    wallLineAnchor: 0,
  },
  // CM - Box-to-Box
  [PLAYSTYLE_ID.BOX_TO_BOX]: {
    forwardRunBias: 1.30,
    trackBackBias: 1.35,
    cutInsideBias: 1.0,
    crossBias: 0.6,
    holdZoneY: 0.64,
    pressTackleRadius: 1.2,
    stepOutBias: 0.8,
    safePassBias: 1.0,
    penetrationBias: 1.1,
    boxArrivalBias: 1.35,
    roamFreedom: 1.1,
    aerialDuelBias: 1.15,
    physicalShieldBias: 1.2,
    sweeperRushDistance: 0,
    wallLineAnchor: 0,
  },
  // CM - Maestro
  [PLAYSTYLE_ID.MAESTRO]: {
    forwardRunBias: 0.95,
    trackBackBias: 0.80,
    cutInsideBias: 0.9,
    crossBias: 0.5,
    holdZoneY: 0.65,
    pressTackleRadius: 0.85,
    stepOutBias: 0.5,
    safePassBias: 1.5,
    penetrationBias: 1.2,
    boxArrivalBias: 0.65,
    roamFreedom: 1.2,
    aerialDuelBias: 0.6,
    physicalShieldBias: 1.3,
    sweeperRushDistance: 0,
    wallLineAnchor: 0,
  },
  // CM - Runner
  [PLAYSTYLE_ID.RUNNER]: {
    forwardRunBias: 1.45,
    trackBackBias: 0.95,
    cutInsideBias: 1.1,
    crossBias: 0.6,
    holdZoneY: 0.63,
    pressTackleRadius: 1.0,
    stepOutBias: 0.7,
    safePassBias: 0.9,
    penetrationBias: 1.15,
    boxArrivalBias: 1.3,
    roamFreedom: 1.0,
    aerialDuelBias: 0.9,
    physicalShieldBias: 1.1,
    sweeperRushDistance: 0,
    wallLineAnchor: 0,
  },
  // CDM - Enforcer
  [PLAYSTYLE_ID.ENFORCER]: {
    forwardRunBias: 0.55,
    trackBackBias: 1.35,
    cutInsideBias: 0.8,
    crossBias: 0.2,
    holdZoneY: 0.72,
    pressTackleRadius: 1.4,
    stepOutBias: 1.35,
    safePassBias: 1.1,
    penetrationBias: 0.7,
    boxArrivalBias: 0.3,
    roamFreedom: 0.6,
    aerialDuelBias: 1.3,
    physicalShieldBias: 1.5,
    sweeperRushDistance: 0,
    wallLineAnchor: 0,
  },
  // CDM - Anchor
  [PLAYSTYLE_ID.ANCHOR]: {
    forwardRunBias: 0.40,
    trackBackBias: 1.45,
    cutInsideBias: 0.7,
    crossBias: 0.1,
    holdZoneY: 0.74,
    pressTackleRadius: 1.2,
    stepOutBias: 0.4,
    safePassBias: 1.4,
    penetrationBias: 0.8,
    boxArrivalBias: 0.15,
    roamFreedom: 0.35,
    aerialDuelBias: 1.2,
    physicalShieldBias: 1.4,
    sweeperRushDistance: 0,
    wallLineAnchor: 0,
  },
  // CDM - Regista
  [PLAYSTYLE_ID.REGISTA]: {
    forwardRunBias: 0.50,
    trackBackBias: 1.10,
    cutInsideBias: 0.8,
    crossBias: 0.7,
    holdZoneY: 0.75,
    pressTackleRadius: 0.8,
    stepOutBias: 0.3,
    safePassBias: 1.3,
    penetrationBias: 1.55,
    boxArrivalBias: 0.2,
    roamFreedom: 1.2,
    aerialDuelBias: 0.6,
    physicalShieldBias: 1.35,
    sweeperRushDistance: 0,
    wallLineAnchor: 0,
  },
  // FULLBACK - Defensive
  [PLAYSTYLE_ID.DEFENSIVE]: {
    forwardRunBias: 0.35,
    trackBackBias: 1.50,
    cutInsideBias: 0.5,
    crossBias: 0.4,
    holdZoneY: 0.82,
    pressTackleRadius: 1.25,
    stepOutBias: 0.6,
    safePassBias: 1.3,
    penetrationBias: 0.7,
    boxArrivalBias: 0.05,
    roamFreedom: 0.2,
    aerialDuelBias: 1.1,
    physicalShieldBias: 1.1,
    sweeperRushDistance: 0,
    wallLineAnchor: 0,
  },
  // FULLBACK - Inverted
  [PLAYSTYLE_ID.INVERTED_FB]: {
    forwardRunBias: 0.85,
    trackBackBias: 1.25,
    cutInsideBias: 1.60,
    crossBias: 0.4,
    holdZoneY: 0.74,
    pressTackleRadius: 1.15,
    stepOutBias: 0.8,
    safePassBias: 1.35,
    penetrationBias: 1.15,
    boxArrivalBias: 0.4,
    roamFreedom: 1.2,
    aerialDuelBias: 0.7,
    physicalShieldBias: 1.1,
    sweeperRushDistance: 0,
    wallLineAnchor: 0,
  },
  // FULLBACK - Attacker
  [PLAYSTYLE_ID.ATTACKER_FB]: {
    forwardRunBias: 1.45,
    trackBackBias: 1.05,
    cutInsideBias: 0.6,
    crossBias: 1.4,
    holdZoneY: 0.70,
    pressTackleRadius: 1.0,
    stepOutBias: 0.7,
    safePassBias: 0.9,
    penetrationBias: 1.1,
    boxArrivalBias: 0.85,
    roamFreedom: 0.9,
    aerialDuelBias: 0.8,
    physicalShieldBias: 1.0,
    sweeperRushDistance: 0,
    wallLineAnchor: 0,
  },
  // FULLBACK - Balanced
  [PLAYSTYLE_ID.BALANCED_FB]: {
    forwardRunBias: 0.90,
    trackBackBias: 1.35,
    cutInsideBias: 0.8,
    crossBias: 0.9,
    holdZoneY: 0.78,
    pressTackleRadius: 1.15,
    stepOutBias: 0.6,
    safePassBias: 1.1,
    penetrationBias: 0.95,
    boxArrivalBias: 0.35,
    roamFreedom: 0.6,
    aerialDuelBias: 1.0,
    physicalShieldBias: 1.1,
    sweeperRushDistance: 0,
    wallLineAnchor: 0,
  },
  // CB - Destroyer
  [PLAYSTYLE_ID.DESTROYER]: {
    forwardRunBias: 0.20,
    trackBackBias: 1.45,
    cutInsideBias: 0.5,
    crossBias: 0.1,
    holdZoneY: 0.83,
    pressTackleRadius: 1.35,
    stepOutBias: 1.40,
    safePassBias: 1.0,
    penetrationBias: 0.6,
    boxArrivalBias: 0.1,
    roamFreedom: 0.4,
    aerialDuelBias: 1.45,
    physicalShieldBias: 1.4,
    sweeperRushDistance: 0,
    wallLineAnchor: 0,
  },
  // CB - Distributor
  [PLAYSTYLE_ID.DISTRIBUTOR]: {
    forwardRunBias: 0.25,
    trackBackBias: 1.45,
    cutInsideBias: 0.5,
    crossBias: 0.2,
    holdZoneY: 0.85,
    pressTackleRadius: 1.0,
    stepOutBias: 0.6,
    safePassBias: 1.45,
    penetrationBias: 1.15,
    boxArrivalBias: 0.05,
    roamFreedom: 0.5,
    aerialDuelBias: 1.15,
    physicalShieldBias: 1.2,
    sweeperRushDistance: 0,
    wallLineAnchor: 0,
  },
  // CB - Playmaker
  [PLAYSTYLE_ID.PLAYMAKER]: {
    forwardRunBias: 0.35,
    trackBackBias: 1.35,
    cutInsideBias: 0.6,
    crossBias: 0.3,
    holdZoneY: 0.84,
    pressTackleRadius: 0.95,
    stepOutBias: 0.7,
    safePassBias: 1.1,
    penetrationBias: 1.5,
    boxArrivalBias: 0.15,
    roamFreedom: 0.8,
    aerialDuelBias: 1.2,
    physicalShieldBias: 1.25,
    sweeperRushDistance: 0,
    wallLineAnchor: 0,
  },
  // CB - Stopper
  [PLAYSTYLE_ID.STOPPER]: {
    forwardRunBias: 0.15,
    trackBackBias: 1.55,
    cutInsideBias: 0.5,
    crossBias: 0.1,
    holdZoneY: 0.86,
    pressTackleRadius: 1.15,
    stepOutBias: 0.5,
    safePassBias: 1.2,
    penetrationBias: 0.8,
    boxArrivalBias: 0.05,
    roamFreedom: 0.25,
    aerialDuelBias: 1.4,
    physicalShieldBias: 1.3,
    sweeperRushDistance: 0,
    wallLineAnchor: 0,
  },
  // LIB - Sweeper CB
  [PLAYSTYLE_ID.SWEEPER_CB]: {
    forwardRunBias: 0.65,
    trackBackBias: 1.40,
    cutInsideBias: 0.8,
    crossBias: 0.3,
    holdZoneY: 0.89,
    pressTackleRadius: 1.05,
    stepOutBias: 0.9,
    safePassBias: 1.3,
    penetrationBias: 1.3,
    boxArrivalBias: 0.2,
    roamFreedom: 1.3,
    aerialDuelBias: 1.25,
    physicalShieldBias: 1.3,
    sweeperRushDistance: 0,
    wallLineAnchor: 0,
  },
  // GK - Balanced
  [PLAYSTYLE_ID.BALANCED_GK]: {
    forwardRunBias: 0.0,
    trackBackBias: 1.0,
    cutInsideBias: 0.0,
    crossBias: 0.0,
    holdZoneY: 0.96,
    pressTackleRadius: 1.0,
    stepOutBias: 0.4,
    safePassBias: 1.1,
    penetrationBias: 0.9,
    boxArrivalBias: 0.0,
    roamFreedom: 0.1,
    aerialDuelBias: 1.0,
    physicalShieldBias: 1.0,
    sweeperRushDistance: 160,
    wallLineAnchor: 0.95,
  },
  // GK - Sweeper
  [PLAYSTYLE_ID.SWEEPER]: {
    forwardRunBias: 0.0,
    trackBackBias: 1.0,
    cutInsideBias: 0.0,
    crossBias: 0.0,
    holdZoneY: 0.91,
    pressTackleRadius: 1.2,
    stepOutBias: 1.4,
    safePassBias: 1.25,
    penetrationBias: 1.2,
    boxArrivalBias: 0.0,
    roamFreedom: 0.4,
    aerialDuelBias: 1.15,
    physicalShieldBias: 1.1,
    sweeperRushDistance: 270,
    wallLineAnchor: 0.70,
  },
  // GK - Wall
  [PLAYSTYLE_ID.WALL]: {
    forwardRunBias: 0.0,
    trackBackBias: 1.0,
    cutInsideBias: 0.0,
    crossBias: 0.0,
    holdZoneY: 0.97,
    pressTackleRadius: 0.85,
    stepOutBias: 0.2,
    safePassBias: 1.0,
    penetrationBias: 0.8,
    boxArrivalBias: 0.0,
    roamFreedom: 0.05,
    aerialDuelBias: 0.95,
    physicalShieldBias: 1.0,
    sweeperRushDistance: 110,
    wallLineAnchor: 1.25,
  },
  // Phase 16.5: Neutral Baseline (Zero qualitative behavioral alterations)
  [PLAYSTYLE_ID.BASIC]: {
    forwardRunBias: 1.0,
    trackBackBias: 1.0,
    cutInsideBias: 1.0,
    crossBias: 1.0,
    holdZoneY: 0.65,
    pressTackleRadius: 1.0,
    stepOutBias: 1.0,
    safePassBias: 1.0,
    penetrationBias: 1.0,
    boxArrivalBias: 1.0,
    roamFreedom: 1.0,
    aerialDuelBias: 1.0,
    physicalShieldBias: 1.0,
    sweeperRushDistance: 0,
    wallLineAnchor: 0,
  },
};

// ---------------------------------------------------------------------------
// 5. DETAILED PLAYSTYLE DEFINITIONS DICTIONARY
// ---------------------------------------------------------------------------
export const PLAYSTYLE_DEFINITIONS_DETAILED: Record<PlayerPlaystyle, PlaystyleDetailedDefinition> = {
  poacher: {
    id: 'poacher',
    numericId: PLAYSTYLE_ID.POACHER,
    name: 'Poacher',
    tag: 'Goal Predator',
    icon: '⚡',
    description: 'Lurks on the shoulder of the last defender; makes predatory blindside runs; lethal conversion rate inside the 6-yard box.',
    archetypes: {
      modern: 'Erling Haaland',
      legends: 'Gerd Müller',
    },
    mechanicalEffect: '+15% finish conversion in 6-yard box, stays on defender shoulder, 0 trackback drag.',
    bias: PLAYSTYLE_BIAS_TABLE[PLAYSTYLE_ID.POACHER],
  },
  target: {
    id: 'target',
    numericId: PLAYSTYLE_ID.TARGET,
    name: 'Target Forward',
    tag: 'Aerial Anchor',
    icon: '🛡️',
    description: 'Uses upper-body strength to pin center-backs, win aerial knockdowns, and hold up play for arriving runners.',
    archetypes: {
      modern: 'Olivier Giroud',
      legends: 'Didier Drogba',
    },
    mechanicalEffect: '+20% aerial duel win rate, +15% Q shield mass, holds line for second-ball runners.',
    bias: PLAYSTYLE_BIAS_TABLE[PLAYSTYLE_ID.TARGET],
  },
  complete: {
    id: 'complete',
    numericId: PLAYSTYLE_ID.COMPLETE,
    name: 'Complete Striker',
    tag: 'Total Threat',
    icon: '👑',
    description: 'All-round monster capable of beating defenders 1v1, running in behind, scoring from range, and clinical finishing.',
    archetypes: {
      modern: 'Kylian Mbappé',
      legends: 'Ronaldo Nazário',
    },
    mechanicalEffect: 'Fluid channel runs, balanced inside cuts, +10% sprint burst when leading into space.',
    bias: PLAYSTYLE_BIAS_TABLE[PLAYSTYLE_ID.COMPLETE],
  },
  finisher: {
    id: 'finisher',
    numericId: PLAYSTYLE_ID.FINISHER,
    name: 'Finisher',
    tag: 'Channel Master',
    icon: '🎯',
    description: 'Master of channel timing; arrives into space at the exact moment to apply a devastating one-touch finish.',
    archetypes: {
      modern: 'Lautaro Martínez',
      legends: 'Eusébio',
    },
    mechanicalEffect: 'Times cutback arrival to perfection; +15% 1-touch volley and first-time strike accuracy.',
    bias: PLAYSTYLE_BIAS_TABLE[PLAYSTYLE_ID.FINISHER],
  },
  decoy: {
    id: 'decoy',
    numericId: PLAYSTYLE_ID.DECOY,
    name: 'Decoy Runner',
    tag: 'Space Opener',
    icon: '🏃',
    description: 'Tireless off-the-ball runner who drags center-backs out of position to open gaps for wingers and trailing midfielders.',
    archetypes: {
      modern: 'Ferran Torres',
      legends: 'Roberto Firmino',
    },
    mechanicalEffect: 'Pulls opposing markers 25px wide to isolate Zone 14; relentless off-ball work rate.',
    bias: PLAYSTYLE_BIAS_TABLE[PLAYSTYLE_ID.DECOY],
  },
  traditional: {
    id: 'traditional',
    numericId: PLAYSTYLE_ID.TRADITIONAL,
    name: 'Traditional Winger',
    tag: 'Touchline Sprinter',
    icon: '🚀',
    description: 'Hugs the touchline, beats fullbacks on the outside with acceleration, and delivers whipped crosses into the box.',
    archetypes: {
      modern: 'Bukayo Saka',
      legends: 'Garrincha, Ryan Giggs',
    },
    mechanicalEffect: 'Stays glued to touchline; +20% cross curl accuracy; sprint ramp acceleration on flank.',
    bias: PLAYSTYLE_BIAS_TABLE[PLAYSTYLE_ID.TRADITIONAL],
  },
  inverted: {
    id: 'inverted',
    numericId: PLAYSTYLE_ID.INVERTED,
    name: 'Inverted Winger',
    tag: 'Inside Cutter',
    icon: '⚡',
    description: 'Cuts inside on their stronger foot toward central shooting pockets; nightmare for defenders 1v1.',
    archetypes: {
      modern: 'Lamine Yamal',
      legends: 'Lionel Messi',
    },
    mechanicalEffect: 'Sharp 45° cuts into half-spaces; +15% curl finesse shot accuracy from the edge of box.',
    bias: PLAYSTYLE_BIAS_TABLE[PLAYSTYLE_ID.INVERTED],
  },
  prolific: {
    id: 'prolific',
    numericId: PLAYSTYLE_ID.PROLIFIC,
    name: 'Prolific Winger',
    tag: 'Inside Forward',
    icon: '🔥',
    description: 'Inside forward archetype; starts wide but aggressively attacks the far post to score like a second striker.',
    archetypes: {
      modern: 'Cole Palmer, Mohamed Salah',
      legends: 'Cristiano Ronaldo, Arjen Robben',
    },
    mechanicalEffect: 'Diagonal back-post runs; crashes 18-yard box on cross deliveries; high conversion.',
    bias: PLAYSTYLE_BIAS_TABLE[PLAYSTYLE_ID.PROLIFIC],
  },
  pressing: {
    id: 'pressing',
    numericId: PLAYSTYLE_ID.PRESSING,
    name: 'Pressing Winger',
    tag: 'Flank Harrier',
    icon: '🛡️',
    description: 'High-intensity pressing winger who harasses opposing fullbacks on build-up and forces immediate turnovers.',
    archetypes: {
      modern: 'Luis Díaz',
      legends: 'Park Ji-sung',
    },
    mechanicalEffect: '+30% pressing recovery speed; closes down rival fullbacks within 25px.',
    bias: PLAYSTYLE_BIAS_TABLE[PLAYSTYLE_ID.PRESSING],
  },
  creator: {
    id: 'creator',
    numericId: PLAYSTYLE_ID.CREATOR,
    name: 'Creator',
    tag: 'Visionary Architect',
    icon: '🎨',
    description: 'Visionary playmaker who unlocks compact defensive blocks with defense-splitting through-balls.',
    archetypes: {
      modern: 'Kevin De Bruyne',
      legends: 'Zinedine Zidane, Dennis Bergkamp',
    },
    mechanicalEffect: '+25% through-ball lead distance; reads runner speed to deliver zero-stumble passes.',
    bias: PLAYSTYLE_BIAS_TABLE[PLAYSTYLE_ID.CREATOR],
  },
  shadow: {
    id: 'shadow',
    numericId: PLAYSTYLE_ID.SHADOW,
    name: 'Shadow Striker',
    tag: 'Ghost Runner',
    icon: '👻',
    description: 'Late arriving runner who charges into the penalty box from deep to capitalize on cutbacks and rebounds.',
    archetypes: {
      modern: 'Jude Bellingham',
      legends: 'Johan Cruyff',
    },
    mechanicalEffect: 'Timed late run into Zone 14 / penalty spot; catches defenders marking front-line forwards.',
    bias: PLAYSTYLE_BIAS_TABLE[PLAYSTYLE_ID.SHADOW],
  },
  classic_n10: {
    id: 'classic_n10',
    numericId: PLAYSTYLE_ID.CLASSIC_N10,
    name: 'Classic No. 10',
    tag: 'La Pausa Wizard',
    icon: '🎩',
    description: 'Pure ball wizard; dictates tempo with pauses (la pausa), close-quarters dribbling, and impossible passes.',
    archetypes: {
      modern: 'James Rodríguez',
      legends: 'Juan Román Riquelme, Diego Maradona',
    },
    mechanicalEffect: 'Immune to close press stumbles; draws tactical fouls; sublime chip pass trajectory.',
    bias: PLAYSTYLE_BIAS_TABLE[PLAYSTYLE_ID.CLASSIC_N10],
  },
  engine: {
    id: 'engine',
    numericId: PLAYSTYLE_ID.ENGINE,
    name: 'Engine',
    tag: 'Box-to-Box Hybrid',
    icon: '⚙️',
    description: 'Box-to-box hybrid attacking midfielder who contributes relentlessly to pressing transitions and counter-attacks.',
    archetypes: {
      modern: 'Federico Valverde',
      legends: 'Pavel Nedvěd, Ruud Gullit',
    },
    mechanicalEffect: 'High work-rate; recovers deep then joins counter-attacks with explosive linear pace.',
    bias: PLAYSTYLE_BIAS_TABLE[PLAYSTYLE_ID.ENGINE],
  },
  box_to_box: {
    id: 'box_to_box',
    numericId: PLAYSTYLE_ID.BOX_TO_BOX,
    name: 'Box-to-Box',
    tag: 'Two-Box Dynamo',
    icon: '🔄',
    description: 'Dynamic stamina engine with commanding presence in both penalty boxes; breaks play and finishes attacks.',
    archetypes: {
      modern: 'Dominik Szoboszlai',
      legends: 'Lothar Matthäus',
    },
    mechanicalEffect: 'Surges from defensive box to opponent 18-yard area; relentless late-match motor.',
    bias: PLAYSTYLE_BIAS_TABLE[PLAYSTYLE_ID.BOX_TO_BOX],
  },
  maestro: {
    id: 'maestro',
    numericId: PLAYSTYLE_ID.MAESTRO,
    name: 'Maestro',
    tag: 'Midfield Metronome',
    icon: '🎼',
    description: 'Metronome who controls match tempo through short and long passing triangles; rarely loses possession.',
    archetypes: {
      modern: 'Pedri',
      legends: 'Xavi Hernández',
    },
    mechanicalEffect: '+15% short pass velocity; 0-turn deceleration; always available in passing triangle.',
    bias: PLAYSTYLE_BIAS_TABLE[PLAYSTYLE_ID.MAESTRO],
  },
  runner: {
    id: 'runner',
    numericId: PLAYSTYLE_ID.RUNNER,
    name: 'Runner',
    tag: 'Vertical Surge',
    icon: '⚡',
    description: 'Uses intelligent vertical bursts from deep to break through defensive lines and generate numeric overloads.',
    archetypes: {
      modern: 'Marcos Llorente',
      legends: 'Yaya Touré',
    },
    mechanicalEffect: 'Explosive third-man runs; breaks offside trap from deep midfield channels.',
    bias: PLAYSTYLE_BIAS_TABLE[PLAYSTYLE_ID.RUNNER],
  },
  enforcer: {
    id: 'enforcer',
    numericId: PLAYSTYLE_ID.ENFORCER,
    name: 'Enforcer',
    tag: 'Physical Hammer',
    icon: '🔨',
    description: 'Imposes physical intimidation in midfield through hard standing challenges, tactical fouls, and duel supremacy.',
    archetypes: {
      modern: 'Casemiro',
      legends: 'Roy Keane',
    },
    mechanicalEffect: '+20% shoulder barge mass; +15% standing tackle sweep reach; shuts down rivals.',
    bias: PLAYSTYLE_BIAS_TABLE[PLAYSTYLE_ID.ENFORCER],
  },
  anchor: {
    id: 'anchor',
    numericId: PLAYSTYLE_ID.ANCHOR,
    name: 'Anchor',
    tag: 'Backline Shield',
    icon: '⚓',
    description: 'Positional screen protecting the center-backs; cuts passing lanes, intercepts build-up balls, and plays safe lay-offs.',
    archetypes: {
      modern: 'Rodri',
      legends: 'Sergio Busquets',
    },
    mechanicalEffect: 'Holds Zone 14 anchor; +20% pass lane interception radius; prevents counters.',
    bias: PLAYSTYLE_BIAS_TABLE[PLAYSTYLE_ID.ANCHOR],
  },
  regista: {
    id: 'regista',
    numericId: PLAYSTYLE_ID.REGISTA,
    name: 'Regista',
    tag: 'Deep Orchestrator',
    icon: '🎻',
    description: 'Deep-lying orchestrator with zero destructive duties; commands tempo with press resistance, immaculate vision, and long switches.',
    archetypes: {
      modern: 'Toni Kroos, Hakan Çalhanoğlu',
      legends: 'Andrea Pirlo, Xabi Alonso, Pep Guardiola',
    },
    mechanicalEffect: 'Drops between center-backs on buildup; +25% diagonal switch accuracy with backspin.',
    bias: PLAYSTYLE_BIAS_TABLE[PLAYSTYLE_ID.REGISTA],
  },
  defensive: {
    id: 'defensive',
    numericId: PLAYSTYLE_ID.DEFENSIVE,
    name: 'Defensive Fullback',
    tag: 'Lockdown Flank',
    icon: '🔒',
    description: 'Stays deep, rarely crosses the halfway line; dedicated to locking down rival wingers 1v1.',
    archetypes: {
      modern: 'Kyle Walker',
      legends: 'Lilian Thuram',
    },
    mechanicalEffect: 'Maintains backline shape; never caught out on breaks; shuts down outside runs.',
    bias: PLAYSTYLE_BIAS_TABLE[PLAYSTYLE_ID.DEFENSIVE],
  },
  inverted_fb: {
    id: 'inverted_fb',
    numericId: PLAYSTYLE_ID.INVERTED_FB,
    name: 'Inverted Fullback',
    tag: 'Pivot Auxiliary',
    icon: '📐',
    description: 'Steps inside into the central midfield pivot during possession to create central passing superiority.',
    archetypes: {
      modern: 'Pedro Porro, Trent Alexander-Arnold',
      legends: 'Philipp Lahm',
    },
    mechanicalEffect: 'Tucks inside into midfield double-pivot on possession; creates central overload.',
    bias: PLAYSTYLE_BIAS_TABLE[PLAYSTYLE_ID.INVERTED_FB],
  },
  attacker_fb: {
    id: 'attacker_fb',
    numericId: PLAYSTYLE_ID.ATTACKER_FB,
    name: 'Attacking Fullback',
    tag: 'Overlapping Winger',
    icon: '⚡',
    description: 'Aggressive overlapping fullback acting as a supplementary winger with tireless touchline stamina.',
    archetypes: {
      modern: 'Achraf Hakimi',
      legends: 'Roberto Carlos, Cafu',
    },
    mechanicalEffect: 'Explosive touchline overlaps; provides wide crossing option on attacking breaks.',
    bias: PLAYSTYLE_BIAS_TABLE[PLAYSTYLE_ID.ATTACKER_FB],
  },
  balanced_fb: {
    id: 'balanced_fb',
    numericId: PLAYSTYLE_ID.BALANCED_FB,
    name: 'Balanced Fullback',
    tag: 'Two-Way Master',
    icon: '⚖️',
    description: 'Reliable two-way fullback who provides defensive security while timing forward support runs.',
    archetypes: {
      modern: 'Andrew Robertson',
      legends: 'Paolo Maldini',
    },
    mechanicalEffect: 'Smooth transitions between 4-man rest defense and wide support triangles.',
    bias: PLAYSTYLE_BIAS_TABLE[PLAYSTYLE_ID.BALANCED_FB],
  },
  destroyer: {
    id: 'destroyer',
    numericId: PLAYSTYLE_ID.DESTROYER,
    name: 'Destroyer',
    tag: 'Crunch Stopper',
    icon: '💥',
    description: 'Aggressive, physical stopper who steps out of the defensive line to crunch tackles and dominate strikers.',
    archetypes: {
      modern: 'Antonio Rüdiger',
      legends: 'Nemanja Vidić',
    },
    mechanicalEffect: 'Steps forward 20px to break dribbles; +20% clean tackle win rate in duels.',
    bias: PLAYSTYLE_BIAS_TABLE[PLAYSTYLE_ID.DESTROYER],
  },
  distributor: {
    id: 'distributor',
    numericId: PLAYSTYLE_ID.DISTRIBUTOR,
    name: 'Distributor',
    tag: 'Composed Passer',
    icon: '🛡️',
    description: 'Composed center-back who calmly breaks lines with crisp ground passes out from the back.',
    archetypes: {
      modern: 'William Saliba',
      legends: 'Franco Baresi',
    },
    mechanicalEffect: 'Immune to press panic; splits midfield lines with 12px/f ground distribution.',
    bias: PLAYSTYLE_BIAS_TABLE[PLAYSTYLE_ID.DISTRIBUTOR],
  },
  playmaker: {
    id: 'playmaker',
    numericId: PLAYSTYLE_ID.PLAYMAKER,
    name: 'Playmaker CB',
    tag: 'Deep Ball Striker',
    icon: '📡',
    description: 'Visionary defender equipped with long-range diagonal passing to initiate rapid counter-attacks.',
    archetypes: {
      modern: 'Virgil van Dijk',
      legends: 'Franz Beckenbauer, Ronald Koeman',
    },
    mechanicalEffect: '+25% long ball velocity; hits 600px diagonal switches right onto winger cleats.',
    bias: PLAYSTYLE_BIAS_TABLE[PLAYSTYLE_ID.PLAYMAKER],
  },
  stopper: {
    id: 'stopper',
    numericId: PLAYSTYLE_ID.STOPPER,
    name: 'Stopper',
    tag: 'Positioning Wall',
    icon: '🧱',
    description: 'Elite reader of the game; relies on immaculate positioning, anticipation, and clean challenges.',
    archetypes: {
      modern: 'Gabriel Magalhães',
      legends: 'Fabio Cannavaro',
    },
    mechanicalEffect: 'Near-zero foul attribution; positions perfectly to block shots and cut passes.',
    bias: PLAYSTYLE_BIAS_TABLE[PLAYSTYLE_ID.STOPPER],
  },
  sweeper_cb: {
    id: 'sweeper_cb',
    numericId: PLAYSTYLE_ID.SWEEPER_CB,
    name: 'Libero / Sweeper',
    tag: 'Covering Sweeper',
    icon: '🧹',
    description: 'Sweeps behind defensive line off the ball, and steps forward into central midfield with the ball.',
    archetypes: {
      modern: 'John Stones',
      legends: 'Franz Beckenbauer, Ronald Koeman, Matthias Sammer',
    },
    mechanicalEffect: 'Drops 15px deeper to collect through-balls; steps into midfield pivot in possession.',
    bias: PLAYSTYLE_BIAS_TABLE[PLAYSTYLE_ID.SWEEPER_CB],
  },
  balanced_gk: {
    id: 'balanced_gk',
    numericId: PLAYSTYLE_ID.BALANCED_GK,
    name: 'Balanced Goalkeeper',
    tag: 'Consistent Guardian',
    icon: '🧤',
    description: 'All-round goalkeeper with consistent handling, positioning, and reliable counter-attack distribution.',
    archetypes: {
      modern: 'Thibaut Courtois',
      legends: 'Iker Casillas, Dino Zoff',
    },
    mechanicalEffect: 'Balanced dive coverage and steady distribution throws to fullbacks.',
    bias: PLAYSTYLE_BIAS_TABLE[PLAYSTYLE_ID.BALANCED_GK],
  },
  sweeper: {
    id: 'sweeper',
    numericId: PLAYSTYLE_ID.SWEEPER,
    name: 'Sweeper Keeper',
    tag: '11th Outfield Player',
    icon: '⚡',
    description: 'Acts as an eleventh outfield player; steps 15–20 yards outside the box to clear through-balls with feet.',
    archetypes: {
      modern: 'Manuel Neuer, Alisson, Ederson',
      legends: 'Lev Yashin, René Higuita',
    },
    mechanicalEffect: 'Holds line 250px up pitch; rushes to clear through-balls before attackers reach them.',
    bias: PLAYSTYLE_BIAS_TABLE[PLAYSTYLE_ID.SWEEPER],
  },
  wall: {
    id: 'wall',
    numericId: PLAYSTYLE_ID.WALL,
    name: 'Wall Shot-Stopper',
    tag: 'Goal Mouth Titan',
    icon: '🏰',
    description: 'Pure shot-stopper who dominates the goal mouth; unbeatable on reflex saves and close-range strikes.',
    archetypes: {
      modern: 'Emiliano Martínez',
      legends: 'Oliver Kahn, Peter Schmeichel',
    },
    mechanicalEffect: 'Anchors on the goal line; +15px diving reach bonus on rocket strikes and postage stamps.',
    bias: PLAYSTYLE_BIAS_TABLE[PLAYSTYLE_ID.WALL],
  },
  // Phase 16.5: Neutral Positional Baseline
  basic: {
    id: 'basic',
    numericId: PLAYSTYLE_ID.BASIC,
    name: 'Basic',
    tag: 'Positional Baseline',
    icon: '⚽',
    description: 'Standard tactical execution with zero qualitative behavioral alterations, operating purely on baseline attributes.',
    archetypes: {
      modern: 'Tactical Flex',
      legends: 'Versatile Squad Player',
    },
    mechanicalEffect: 'Neutral 1.0x behavioral multipliers; operates on baseline canonical attributes and tactical formation anchors.',
    bias: PLAYSTYLE_BIAS_TABLE[PLAYSTYLE_ID.BASIC],
  },
};

// ---------------------------------------------------------------------------
// 6. SUB-POSITION DEFINITIONS WITH ALLOWED / INHERITED PLAYSTYLES
// ---------------------------------------------------------------------------
export const SUB_POSITION_DEFINITIONS: Record<SubPosition, SubPositionMetadata> = {
  // ATTACKERS
  ST: {
    id: 'ST',
    numericId: SUB_POSITION_ID.ST,
    primary: 'ATT',
    primaryId: PRIMARY_POSITION_ID.ATT,
    name: 'Striker',
    shortCode: 'ST',
    isSpecial: false,
    allowedPlaystyles: ['poacher', 'target', 'complete', 'finisher', 'decoy'],
  },
  LW: {
    id: 'LW',
    numericId: SUB_POSITION_ID.LW,
    primary: 'ATT',
    primaryId: PRIMARY_POSITION_ID.ATT,
    name: 'Left Winger',
    shortCode: 'LW',
    isSpecial: false,
    allowedPlaystyles: ['traditional', 'inverted', 'prolific', 'pressing'],
  },
  RW: {
    id: 'RW',
    numericId: SUB_POSITION_ID.RW,
    primary: 'ATT',
    primaryId: PRIMARY_POSITION_ID.ATT,
    name: 'Right Winger',
    shortCode: 'RW',
    isSpecial: false,
    allowedPlaystyles: ['traditional', 'inverted', 'prolific', 'pressing'],
  },
  SS: {
    id: 'SS',
    numericId: SUB_POSITION_ID.SS,
    primary: 'ATT',
    primaryId: PRIMARY_POSITION_ID.ATT,
    name: 'Second Striker / False 9',
    shortCode: 'SS',
    isSpecial: true,
    inheritedFrom: ['CAM', 'ST'],
    allowedPlaystyles: ['creator', 'shadow', 'classic_n10', 'engine', 'finisher', 'complete', 'poacher', 'target', 'decoy'],
  },

  // MIDFIELDERS
  CAM: {
    id: 'CAM',
    numericId: SUB_POSITION_ID.CAM,
    primary: 'MID',
    primaryId: PRIMARY_POSITION_ID.MID,
    name: 'Attacking Midfielder',
    shortCode: 'CAM',
    isSpecial: false,
    allowedPlaystyles: ['creator', 'shadow', 'classic_n10', 'engine'],
  },
  CM: {
    id: 'CM',
    numericId: SUB_POSITION_ID.CM,
    primary: 'MID',
    primaryId: PRIMARY_POSITION_ID.MID,
    name: 'Central Midfielder',
    shortCode: 'CM',
    isSpecial: false,
    allowedPlaystyles: ['box_to_box', 'maestro', 'runner'],
  },
  CDM: {
    id: 'CDM',
    numericId: SUB_POSITION_ID.CDM,
    primary: 'MID',
    primaryId: PRIMARY_POSITION_ID.MID,
    name: 'Defensive Midfielder',
    shortCode: 'CDM',
    isSpecial: false,
    allowedPlaystyles: ['enforcer', 'anchor', 'regista'],
  },
  LM: {
    id: 'LM',
    numericId: SUB_POSITION_ID.LM,
    primary: 'MID',
    primaryId: PRIMARY_POSITION_ID.MID,
    name: 'Left Wide Midfielder',
    shortCode: 'LM',
    isSpecial: true,
    inheritedFrom: ['LW'],
    allowedPlaystyles: ['traditional', 'inverted', 'prolific', 'pressing', 'box_to_box', 'maestro', 'runner'],
  },
  RM: {
    id: 'RM',
    numericId: SUB_POSITION_ID.RM,
    primary: 'MID',
    primaryId: PRIMARY_POSITION_ID.MID,
    name: 'Right Wide Midfielder',
    shortCode: 'RM',
    isSpecial: true,
    inheritedFrom: ['RW'],
    allowedPlaystyles: ['traditional', 'inverted', 'prolific', 'pressing', 'box_to_box', 'maestro', 'runner'],
  },
  // Phase 16.5: LWB & RWB in Midfield Zone employing Fullback playstyles
  LWB: {
    id: 'LWB',
    numericId: SUB_POSITION_ID.LWB,
    primary: 'MID',
    primaryId: PRIMARY_POSITION_ID.MID,
    name: 'Left Wingback',
    shortCode: 'LWB',
    isSpecial: true,
    inheritedFrom: ['LB'],
    allowedPlaystyles: ['attacker_fb', 'inverted_fb', 'balanced_fb', 'defensive'],
  },
  RWB: {
    id: 'RWB',
    numericId: SUB_POSITION_ID.RWB,
    primary: 'MID',
    primaryId: PRIMARY_POSITION_ID.MID,
    name: 'Right Wingback',
    shortCode: 'RWB',
    isSpecial: true,
    inheritedFrom: ['RB'],
    allowedPlaystyles: ['attacker_fb', 'inverted_fb', 'balanced_fb', 'defensive'],
  },

  // DEFENDERS
  LB: {
    id: 'LB',
    numericId: SUB_POSITION_ID.LB,
    primary: 'DEF',
    primaryId: PRIMARY_POSITION_ID.DEF,
    name: 'Left Fullback',
    shortCode: 'LB',
    isSpecial: false,
    allowedPlaystyles: ['defensive', 'inverted_fb', 'attacker_fb', 'balanced_fb'],
  },
  RB: {
    id: 'RB',
    numericId: SUB_POSITION_ID.RB,
    primary: 'DEF',
    primaryId: PRIMARY_POSITION_ID.DEF,
    name: 'Right Fullback',
    shortCode: 'RB',
    isSpecial: false,
    allowedPlaystyles: ['defensive', 'inverted_fb', 'attacker_fb', 'balanced_fb'],
  },
  CB: {
    id: 'CB',
    numericId: SUB_POSITION_ID.CB,
    primary: 'DEF',
    primaryId: PRIMARY_POSITION_ID.DEF,
    name: 'Center Back',
    shortCode: 'CB',
    isSpecial: false,
    allowedPlaystyles: ['destroyer', 'distributor', 'playmaker', 'stopper'],
  },
  LIB: {
    id: 'LIB',
    numericId: SUB_POSITION_ID.LIB,
    primary: 'DEF',
    primaryId: PRIMARY_POSITION_ID.DEF,
    name: 'Libero / Sweeper',
    shortCode: 'LIB',
    isSpecial: true,
    inheritedFrom: ['CB', 'CDM'],
    allowedPlaystyles: ['enforcer', 'anchor', 'regista', 'destroyer', 'distributor', 'playmaker', 'stopper', 'sweeper_cb'],
  },

  // GOALKEEPER
  GK: {
    id: 'GK',
    numericId: SUB_POSITION_ID.GK,
    primary: 'GK',
    primaryId: PRIMARY_POSITION_ID.GK,
    name: 'Goalkeeper',
    shortCode: 'GK',
    isSpecial: false,
    allowedPlaystyles: ['balanced_gk', 'sweeper', 'wall'],
  },
};

// ---------------------------------------------------------------------------
// 7. CANONICAL SQUAD CONFIGURATIONS (RETRO ALL-STARS & PIXEL LEGENDS)
// ---------------------------------------------------------------------------
export interface CanonicalPlayerHierarchyConfig {
  role: PlayerRole;
  primary: PrimaryPosition;
  subPos: SubPosition;
  playstyle: PlayerPlaystyle;
}

export const HOME_PLAYER_PLAYSTYLES: Record<PlayerRole, CanonicalPlayerHierarchyConfig> = {
  GK: { role: 'GK', primary: 'GK', subPos: 'GK', playstyle: 'wall' }, // Schmeichel
  LB: { role: 'LB', primary: 'DEF', subPos: 'LB', playstyle: 'balanced_fb' }, // Maldini
  CB1: { role: 'CB1', primary: 'DEF', subPos: 'CB', playstyle: 'stopper' }, // Baresi
  CB2: { role: 'CB2', primary: 'DEF', subPos: 'LIB', playstyle: 'playmaker' }, // Koeman
  RB: { role: 'RB', primary: 'DEF', subPos: 'RWB', playstyle: 'attacker_fb' }, // Cafu
  LM: { role: 'LM', primary: 'MID', subPos: 'LM', playstyle: 'traditional' }, // Giggs
  CM1: { role: 'CM1', primary: 'MID', subPos: 'CM', playstyle: 'box_to_box' }, // Matthäus
  CM2: { role: 'CM2', primary: 'MID', subPos: 'CAM', playstyle: 'engine' }, // Gullit
  RM: { role: 'RM', primary: 'MID', subPos: 'CAM', playstyle: 'classic_n10' }, // Gascoigne
  ST1: { role: 'ST1', primary: 'ATT', subPos: 'SS', playstyle: 'classic_n10' }, // Maradona (False 9)
  ST2: { role: 'ST2', primary: 'ATT', subPos: 'ST', playstyle: 'complete' }, // Van Basten
};

export const AWAY_PLAYER_PLAYSTYLES: Record<PlayerRole, CanonicalPlayerHierarchyConfig> = {
  GK: { role: 'GK', primary: 'GK', subPos: 'GK', playstyle: 'balanced_gk' }, // Zoff
  RB: { role: 'RB', primary: 'DEF', subPos: 'RB', playstyle: 'inverted_fb' }, // Brehme
  CB1: { role: 'CB1', primary: 'DEF', subPos: 'LIB', playstyle: 'distributor' }, // Scirea
  CB2: { role: 'CB2', primary: 'DEF', subPos: 'CB', playstyle: 'destroyer' }, // Desailly
  LB: { role: 'LB', primary: 'DEF', subPos: 'LB', playstyle: 'attacker_fb' }, // Roberto Carlos
  RM: { role: 'RM', primary: 'MID', subPos: 'RM', playstyle: 'classic_n10' }, // Valderrama
  CM1: { role: 'CM1', primary: 'MID', subPos: 'CDM', playstyle: 'anchor' }, // Rijkaard
  CM2: { role: 'CM2', primary: 'MID', subPos: 'CAM', playstyle: 'creator' }, // Hagi
  LM: { role: 'LM', primary: 'ATT', subPos: 'LW', playstyle: 'prolific' }, // Stoichkov
  ST1: { role: 'ST1', primary: 'ATT', subPos: 'ST', playstyle: 'poacher' }, // Romário
  ST2: { role: 'ST2', primary: 'ATT', subPos: 'SS', playstyle: 'shadow' }, // Baggio
};

// ---------------------------------------------------------------------------
// 8. RESOLUTION & HELPER FUNCTIONS
// ---------------------------------------------------------------------------

/**
 * Resolves the tactical sub-position for any player slot based on formation
 */
export function resolveSubPositionForSlot(role: PlayerRole, formation: FormationName): SubPosition {
  if (role === 'GK') return 'GK';

  switch (formation) {
    case '4-3-3':
      if (role === 'LB') return 'LB';
      if (role === 'CB1' || role === 'CB2') return 'CB';
      if (role === 'RB') return 'RB';
      if (role === 'CM1') return 'CDM'; // Deep pivot
      if (role === 'CM2') return 'CM';
      if (role === 'RM') return 'CM';
      if (role === 'LM') return 'LW';
      if (role === 'ST1') return 'ST';
      if (role === 'ST2') return 'RW';
      break;

    case '4-2-3-1':
      if (role === 'LB') return 'LB';
      if (role === 'CB1' || role === 'CB2') return 'CB';
      if (role === 'RB') return 'RB';
      if (role === 'CM1' || role === 'CM2') return 'CDM'; // Double pivot
      if (role === 'LM') return 'LM';
      if (role === 'RM') return 'RM';
      if (role === 'ST2') return 'CAM'; // Central attacking mid
      if (role === 'ST1') return 'ST';
      break;

    case '3-5-2':
      if (role === 'LB') return 'CB'; // LCB
      if (role === 'CB1') return 'CB';
      if (role === 'CB2') return 'CB'; // RCB
      if (role === 'RB') return 'LWB';
      if (role === 'LM') return 'RWB';
      if (role === 'CM1' || role === 'RM') return 'CM';
      if (role === 'CM2') return 'CDM';
      if (role === 'ST1') return 'ST';
      if (role === 'ST2') return 'SS';
      break;

    case '3-4-3-diamond':
      if (role === 'LB') return 'CB';
      if (role === 'CB1' || role === 'CB2') return 'CB';
      if (role === 'CM1') return 'CDM';
      if (role === 'RB') return 'LM';
      if (role === 'RM') return 'RM';
      if (role === 'CM2') return 'CAM';
      if (role === 'LM') return 'LW';
      if (role === 'ST1') return 'ST';
      if (role === 'ST2') return 'RW';
      break;

    case '3-4-3':
      if (role === 'LB') return 'CB';
      if (role === 'CB1' || role === 'CB2') return 'CB';
      if (role === 'RB') return 'LM';
      if (role === 'CM1' || role === 'CM2') return 'CM';
      if (role === 'RM') return 'RM';
      if (role === 'LM') return 'LW';
      if (role === 'ST1') return 'ST';
      if (role === 'ST2') return 'RW';
      break;

    case '5-3-2':
      if (role === 'LB') return 'LWB';
      if (role === 'CB1' || role === 'CB2') return 'CB';
      if (role === 'RB') return 'CB';
      if (role === 'LM') return 'RWB';
      if (role === 'CM1' || role === 'RM') return 'CM';
      if (role === 'CM2') return 'CDM';
      if (role === 'ST1') return 'ST';
      if (role === 'ST2') return 'SS';
      break;

    case '5-4-1':
      if (role === 'LB') return 'LWB';
      if (role === 'CB1' || role === 'CB2' || role === 'RB') return 'CB';
      if (role === 'LM') return 'RWB';
      if (role === 'CM1' || role === 'CM2') return 'CM';
      if (role === 'RM') return 'LM';
      if (role === 'ST2') return 'RM';
      if (role === 'ST1') return 'ST';
      break;

    case '4-5-1':
      if (role === 'LB') return 'LB';
      if (role === 'CB1' || role === 'CB2') return 'CB';
      if (role === 'RB') return 'RB';
      if (role === 'LM') return 'LM';
      if (role === 'CM1' || role === 'RM') return 'CM';
      if (role === 'CM2') return 'CDM';
      if (role === 'ST2') return 'RM';
      if (role === 'ST1') return 'ST';
      break;

    case '4-4-2':
    default:
      if (role === 'LB') return 'LB';
      if (role === 'CB1' || role === 'CB2') return 'CB';
      if (role === 'RB') return 'RB';
      if (role === 'LM') return 'LM';
      if (role === 'CM1' || role === 'CM2') return 'CM';
      if (role === 'RM') return 'RM';
      if (role === 'ST1') return 'SS'; // Often played as second striker / false 9
      if (role === 'ST2') return 'ST';
      break;
  }

  return 'CM';
}

/**
 * Returns default playstyle for a given sub-position
 */
export function getDefaultPlaystyleForSubPosition(subPos: SubPosition): PlayerPlaystyle {
  const meta = SUB_POSITION_DEFINITIONS[subPos];
  if (meta && meta.allowedPlaystyles.length > 0) {
    return meta.allowedPlaystyles[0];
  }
  return 'balanced_fb';
}

/**
 * Applies the 3-Tier Hierarchy (Primary, SubPos, Playstyle) to a Player instance
 */
export function applyPositionalHierarchyToPlayer(
  player: Player,
  formation: FormationName,
  customPlaystyle?: PlayerPlaystyle
) {
  const isHome = player.team === 'home';
  const canonical = isHome ? HOME_PLAYER_PLAYSTYLES[player.role] : AWAY_PLAYER_PLAYSTYLES[player.role];

  // Resolve sub-position dynamically based on formation or player's custom assignment
  const formationSubPos = resolveSubPositionForSlot(player.role, formation);
  const subPos = player.subPos || canonical?.subPos || formationSubPos;
  const subMeta = SUB_POSITION_DEFINITIONS[subPos] || SUB_POSITION_DEFINITIONS[formationSubPos] || SUB_POSITION_DEFINITIONS.CM;

  player.primaryPos = subMeta.primary;
  player.primaryPosId = subMeta.primaryId;
  player.subPos = subPos;
  player.subPosId = subMeta.numericId;

  // Determine playstyle (Phase 16.5): Intrinsic playstyle preservation & 'basic' reversion rule
  if (!player.intrinsicPlaystyle) {
    player.intrinsicPlaystyle = customPlaystyle || player.playstyle || canonical?.playstyle || subMeta.allowedPlaystyles[0];
  }

  const candidatePlaystyle = customPlaystyle || player.intrinsicPlaystyle;
  const playstyle = resolveEffectivePlaystyle(candidatePlaystyle, subPos);

  const playstyleDef = PLAYSTYLE_DEFINITIONS_DETAILED[playstyle] || PLAYSTYLE_DEFINITIONS_DETAILED.basic;
  player.playstyle = playstyle;
  player.playstyleId = playstyleDef ? playstyleDef.numericId : PLAYSTYLE_ID.BASIC;
  player.playstyleName = playstyleDef ? playstyleDef.name : 'Basic';
}

/**
 * Fast O(1) lookup of playstyle bias multipliers
 */
export function getPlaystyleBias(playstyleId: number): PlaystyleBias {
  return PLAYSTYLE_BIAS_TABLE[playstyleId as PlaystyleId] || PLAYSTYLE_BIAS_TABLE[PLAYSTYLE_ID.BALANCED_FB];
}

/**
 * Returns list of playstyles valid for a player's current sub-position
 */
export function getAllowedPlaystylesForSubPosition(subPos: SubPosition): PlayerPlaystyle[] {
  return SUB_POSITION_DEFINITIONS[subPos]?.allowedPlaystyles || ['balanced_fb'];
}
