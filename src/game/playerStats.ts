/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  MatchStakeTier,
  CanonicalOutfieldStats,
  CanonicalGoalkeeperStats,
  PlayerRole,
  Player,
  ProgressionTier,
  StatBreakDuelResolution,
  DribblingTier,
  DifficultyLevel,
} from '../types';

/**
 * Normalized rating scale S in [40, 105]:
 * Standard human athletic range: [40, 99]
 * Progression factor t = (clamp(S, 40, 99) - 40) / (99 - 40) in [0.0, 1.0]
 * Stat break: S > 99
 */
export function normalizeStat(stat: number): number {
  const clamped = Math.min(99, Math.max(40, stat));
  return (clamped - 40) / 59;
}

export function isStatBreak(stat: number): boolean {
  return stat > 99;
}

/**
 * Phase 6: Canonical 4 Progression Tiers + ⚡ Stat Break Paradigm
 * Amateur: 40 - 59
 * Pro: 60 - 79
 * Elite: 80 - 94
 * Pinnacle: 95 - 99
 * ⚡ Stat Break: > 99 (100+)
 */
export function getAttributeTier(stat: number): ProgressionTier {
  if (stat > 99) return 'stat_break';
  if (stat >= 95) return 'pinnacle';
  if (stat >= 80) return 'elite';
  if (stat >= 60) return 'pro';
  return 'amateur';
}

/**
 * Canonical ⚡ Stat Break Breakthrough Trait Names (Section 6.2 & 6.3)
 */
export const STAT_BREAK_TRAIT_NAMES: Record<string, string> = {
  // Outfield (18 Attributes)
  pac: 'Hyper-Burst / Sonic Ghost',
  sta: 'Iron Engine',
  str: 'Immovable Juggernaut',
  bcl: 'Magnetic Velvet & Instinctive Skill',
  ret: 'Fortress Shield',
  dri: 'Ankle Breaker',
  spa: 'Laser Ping',
  lpa: 'Radar Telemetry Switch',
  cro: 'Guided Whip',
  sho: 'Deadly Assassin',
  hea: 'Sky Walk & Bullet Header',
  lsh: 'Thunderbolt Cannon',
  tck: 'Surgical Extraction',
  mrk: 'Shadow Lockdown',
  int: 'Sixth Sense',
  pos: 'Omnipresent Phantom',
  cmp: 'Ice in the Veins',
  rea: 'Instant Synapse',
  // Goalkeeper (7 Specialist Metrics)
  sav: 'Spiderman Leap',
  ref: 'Bullet Time',
  han: 'Magnetic Claws',
  gpo: 'Geometric Master',
  aer: 'Sky Domination',
  oneOnOne: 'Sweeper Wall',
  dis: 'Laser Telemetry',
};

export function getAttributeStatBreakName(code: string): string {
  const lower = code.toLowerCase();
  return STAT_BREAK_TRAIT_NAMES[lower] || '⚡ Supernatural Breakthrough';
}

/**
 * Phase 6 — Section 6.4 Mathematical Stat Break Duel Resolution & Conflict Priority Matrix
 */
export function resolveStatBreakDuel(
  attacker: Player,
  defender: Player,
  duelType: 'tackle' | 'dribble_cut' | 'shot_save' | 'aerial_duel' | 'loose_ball_pass',
  context?: {
    cutAngle?: number;
    distToFrame?: number;
    isInsideSixYard?: boolean;
    isInInterceptionCone?: boolean;
    leadToOpenSpace?: boolean;
  }
): StatBreakDuelResolution {
  const attStats = attacker.canonicalStats as CanonicalOutfieldStats | undefined;
  const defStats = defender.canonicalStats as (CanonicalOutfieldStats & CanonicalGoalkeeperStats) | undefined;

  // 1. ⚡ Immovable Juggernaut (STR) vs ⚡ Surgical Extraction (TCK)
  if (duelType === 'tackle') {
    const attStr = attStats?.str ?? 75;
    const defTck = defStats?.tck ?? 75;
    const isJuggernaut = isStatBreak(attStr);
    const isSurgical = isStatBreak(defTck);

    if (isJuggernaut && isSurgical) {
      // Momentum Vector Check: If attacker is moving forward at >70% max speed, Juggernaut wins
      const attSpeed = Math.hypot(attacker.vx, attacker.vy);
      const attMaxSpeed = 4.4;
      if (attSpeed >= 0.70 * attMaxSpeed) {
        return {
          winner: 'attacker',
          traitTriggered: '⚡ Immovable Juggernaut',
          reason: 'Momentum Vector Check: Moving at >70% velocity; attacker shrugs tackle!',
        };
      } else {
        return {
          winner: 'defender',
          traitTriggered: '⚡ Surgical Extraction',
          reason: 'Momentum Vector Check: Attacker decelerated; defender cleanly strips the ball!',
        };
      }
    } else if (isJuggernaut) {
      const attSpeed = Math.hypot(attacker.vx, attacker.vy);
      if (attSpeed >= 0.50 * 4.4) {
        return {
          winner: 'attacker',
          traitTriggered: '⚡ Immovable Juggernaut',
          reason: 'Attacker shrugs off physical challenge with colossal kinetic mass!',
        };
      }
    } else if (isSurgical) {
      return {
        winner: 'defender',
        traitTriggered: '⚡ Surgical Extraction',
        reason: 'Pristine surgical tackle cleanly captures ball with 0% foul risk!',
      };
    }
  }

  // 2. ⚡ Ankle Breaker (DRI) vs ⚡ Shadow Lockdown (MRK)
  if (duelType === 'dribble_cut') {
    const attDri = attStats?.dri ?? 75;
    const defMrk = defStats?.mrk ?? 75;
    const isAnkleBreaker = isStatBreak(attDri);
    const isLockdown = isStatBreak(defMrk);

    if (isAnkleBreaker && isLockdown) {
      const cutAngle = context?.cutAngle ?? 90;
      if (cutAngle > 75) {
        return {
          winner: 'attacker',
          traitTriggered: '⚡ Ankle Breaker',
          reason: 'Angle Divergence Check: Cut angle >75°; sharp cut leaves defender off-balance!',
        };
      } else {
        return {
          winner: 'defender',
          traitTriggered: '⚡ Shadow Lockdown',
          reason: 'Angle Divergence Check: Shallow angle; Lockdown defender sticks to hip!',
        };
      }
    } else if (isAnkleBreaker) {
      return {
        winner: 'attacker',
        traitTriggered: '⚡ Ankle Breaker',
        reason: 'Instantaneous 180° turn with 0 deceleration causes defender stumble!',
      };
    } else if (isLockdown) {
      return {
        winner: 'defender',
        traitTriggered: '⚡ Shadow Lockdown',
        reason: 'Shadow Lockdown adheres like glue, nullifying attacker burst!',
      };
    }
  }

  // 3. ⚡ Deadly Assassin (SHO) vs ⚡ Spiderman Leap (SAV)
  if (duelType === 'shot_save') {
    const attSho = attStats?.sho ?? 75;
    const defSav = defStats?.sav ?? 75;
    const isAssassin = isStatBreak(attSho);
    const isSpiderman = isStatBreak(defSav);

    if (isAssassin && isSpiderman) {
      const distToFrame = context?.distToFrame ?? 12;
      if (distToFrame <= 8) {
        return {
          winner: 'attacker',
          traitTriggered: '⚡ Deadly Assassin',
          reason: 'Postage Stamp Duel: Within 8px of post/bar; postage stamp finishes clean!',
        };
      } else {
        return {
          winner: 'defender',
          traitTriggered: '⚡ Spiderman Leap',
          reason: 'Postage Stamp Duel: >8px from frame; Spiderman Leap tips over crossbar!',
        };
      }
    } else if (isAssassin) {
      return {
        winner: 'attacker',
        traitTriggered: '⚡ Deadly Assassin',
        reason: 'Ruthless postage-stamp accuracy delays goalkeeper dive!',
      };
    } else if (isSpiderman) {
      return {
        winner: 'defender',
        traitTriggered: '⚡ Spiderman Leap',
        reason: 'Supernatural +20px diving spring fingertip reach!',
      };
    }
  }

  // 4. ⚡ Sky Walk & Bullet (HEA) vs ⚡ Sky Domination (AER)
  if (duelType === 'aerial_duel') {
    const attHea = attStats?.hea ?? 75;
    const defAer = defStats?.aer ?? 75;
    const isSkyWalk = isStatBreak(attHea);
    const isSkyDomination = isStatBreak(defAer);

    if (isSkyWalk && isSkyDomination) {
      if (context?.isInsideSixYard) {
        return {
          winner: 'defender',
          traitTriggered: '⚡ Sky Domination',
          reason: 'Positioning Anchor Check: Inside 6-yard box; Goalkeeper dominates airspace!',
        };
      } else {
        return {
          winner: 'attacker',
          traitTriggered: '⚡ Sky Walk & Bullet Header',
          reason: 'Positioning Anchor Check: Outside 6-yard box; Attacker out-leaps backline!',
        };
      }
    } else if (isSkyWalk) {
      return {
        winner: 'attacker',
        traitTriggered: '⚡ Sky Walk & Bullet Header',
        reason: 'Unmatched vertical hang-time powers downward bullet header!',
      };
    } else if (isSkyDomination) {
      return {
        winner: 'defender',
        traitTriggered: '⚡ Sky Domination',
        reason: 'Penalty box airspace dominance claims high contested delivery clean!',
      };
    }
  }

  // 5. ⚡ Hyper-Burst (PAC) vs ⚡ Sixth Sense (INT)
  if (duelType === 'loose_ball_pass') {
    const attPac = attStats?.pac ?? 75;
    const defInt = defStats?.int ?? 75;
    const isHyperBurst = isStatBreak(attPac);
    const isSixthSense = isStatBreak(defInt);

    if (isHyperBurst && isSixthSense) {
      if (context?.isInInterceptionCone) {
        return {
          winner: 'defender',
          traitTriggered: '⚡ Sixth Sense',
          reason: 'Anticipation Vector: Pass in lane; Sixth Sense cuts it off cleanly!',
        };
      } else {
        return {
          winner: 'attacker',
          traitTriggered: '⚡ Hyper-Burst / Sonic Ghost',
          reason: 'Anticipation Vector: Pass led into green space; Sonic Ghost wins footrace!',
        };
      }
    } else if (isHyperBurst) {
      return {
        winner: 'attacker',
        traitTriggered: '⚡ Hyper-Burst / Sonic Ghost',
        reason: 'Instantaneous 0-frame acceleration burns into open space!',
      };
    } else if (isSixthSense) {
      return {
        winner: 'defender',
        traitTriggered: '⚡ Sixth Sense',
        reason: 'Telepathic passing lane read lunges across 35px radius!',
      };
    }
  }

  return {
    winner: 'attacker',
    traitTriggered: 'Standard Duel',
    reason: 'Standard physical contest resolved by attribute ratings.',
  };
}

/**
 * Match Stakes Tier Factors:
 * Friendly: W = 0% (0.00)
 * Cup Match: W = 10% (0.10)
 * League Match: W = 15% (0.15)
 * Key Match: W = 25% (0.25)
 * Final: W = 40% (0.40)
 */
export const MATCH_STAKE_FACTORS: Record<MatchStakeTier, number> = {
  friendly: 0.00,
  cup: 0.10,
  league: 0.15,
  key_match: 0.25,
  final: 0.40,
};

export function getStakeFactor(tier: MatchStakeTier = 'friendly'): number {
  return MATCH_STAKE_FACTORS[tier] ?? 0.00;
}

/**
 * Authoritative Stakes Composure Modifier:
 * deltaCmp = (CMP - 70) / 29 in [-1.03, +1.00] (neutral at 70)
 * Mod_stakes = 1.0 + W * deltaCmp
 * EffectiveRate = clamp(BaseRate * Mod_stakes, 0.02, 0.98)
 */
export function applyStakesComposureModifier(baseRate: number, cmp: number, stakeFactor: number): number {
  if (stakeFactor <= 0) return Math.min(0.98, Math.max(0.02, baseRate));
  const deltaCmp = (cmp - 70) / 29;
  const modStakes = 1.0 + stakeFactor * deltaCmp;
  return Math.min(0.98, Math.max(0.02, baseRate * modStakes));
}

// ============================================================================
// 1. PASSING SUCCESS RATE FORMULAS (SHORT, LONG, CROSS)
// ============================================================================

/**
 * Short Pass Success Rate (P_short):
 * Base: 10% at 40 -> 95% at 99 -> 98% at Stat Break (>99)
 */
export function calculateShortPassSuccessRate(
  spa: number,
  cmp: number = 70,
  stakeFactor: number = 0
): number {
  let baseRate: number;
  if (spa <= 99) {
    baseRate = 0.10 + 0.85 * normalizeStat(spa);
  } else {
    baseRate = 0.95 + 0.03 * Math.min(1.0, (spa - 99) / 6);
  }
  return applyStakesComposureModifier(baseRate, cmp, stakeFactor);
}

/**
 * Long Pass Success Rate (P_long):
 * Inherently 40% lower success rate compared to short passes across all tiers
 * P_long = P_short * (1.0 - 0.40) = 0.60 * P_short
 */
export function calculateLongPassSuccessRate(
  lpa: number,
  cmp: number = 70,
  stakeFactor: number = 0
): number {
  const shortEquivalent = calculateShortPassSuccessRate(lpa, cmp, stakeFactor);
  return shortEquivalent * 0.60;
}

/**
 * Crossing Success Rate (P_cross):
 * Wide deliveries into penalty box: 20% lower success rate compared to short pass
 * P_cross = P_short * (1.0 - 0.20) = 0.80 * P_short
 */
export function calculateCrossSuccessRate(
  cro: number,
  cmp: number = 70,
  stakeFactor: number = 0
): number {
  const shortEquivalent = calculateShortPassSuccessRate(cro, cmp, stakeFactor);
  return shortEquivalent * 0.80;
}

// ============================================================================
// 2. GOALSCORING ACCURACY FORMULAS (INSIDE BOX, LONG SHOTS, HEADING, VOLLEYS, BICYCLE)
// ============================================================================

/**
 * Inside-the-Box Shooting Accuracy (P_shoot):
 * Base: 10% at 40 -> 95% at 99 -> 98% at Stat Break (>99)
 */
export function calculateInsideBoxShotAccuracy(
  sho: number,
  cmp: number = 70,
  stakeFactor: number = 0
): number {
  let baseRate: number;
  if (sho <= 99) {
    baseRate = 0.10 + 0.85 * normalizeStat(sho);
  } else {
    baseRate = 0.98;
  }
  return applyStakesComposureModifier(baseRate, cmp, stakeFactor);
}

/**
 * Long Shots Outside the Box (P_long_shoot):
 * Loses 3.5% accuracy per meter of distance outside the penalty box (1m approx 8.5 field px)
 * Penalty_dist = D_box * 0.035
 * P_long_shoot = max(0.02, [0.60 * P_shoot] - Penalty_dist)
 */
export function calculateLongShotAccuracy(
  lsh: number,
  distanceOutsideBoxMeters: number,
  cmp: number = 70,
  stakeFactor: number = 0
): number {
  const baseShot = calculateInsideBoxShotAccuracy(lsh, cmp, stakeFactor);
  const penaltyDist = Math.max(0, distanceOutsideBoxMeters) * 0.035;
  const longAccuracy = Math.max(0.02, (0.60 * baseShot) - penaltyDist);
  return applyStakesComposureModifier(longAccuracy, cmp, stakeFactor);
}

/**
 * Heading Accuracy & Duel Win Rate (HEA):
 * P_header = 0.10 + 0.85 * normalizeStat(HEA)
 */
export function calculateHeaderAccuracy(
  hea: number,
  cmp: number = 70,
  stakeFactor: number = 0
): number {
  const baseRate = 0.10 + 0.85 * normalizeStat(hea);
  return applyStakesComposureModifier(baseRate, cmp, stakeFactor);
}

/**
 * Bicycle Kick Accuracy:
 * Defined by SHO (NOT HEA!). 50% less accuracy than standard shots.
 * P_bicycle = P_shoot(SHO) * 0.50
 */
export function calculateBicycleKickAccuracy(
  sho: number,
  cmp: number = 70,
  stakeFactor: number = 0
): number {
  const baseShot = calculateInsideBoxShotAccuracy(sho, cmp, stakeFactor);
  return baseShot * 0.50;
}

/**
 * Side Volley Accuracy:
 * Defined by SHO (NOT HEA!). 50% less accuracy than standard shots.
 * P_volley = P_shoot(SHO) * 0.50
 */
export function calculateVolleyAccuracy(
  sho: number,
  cmp: number = 70,
  stakeFactor: number = 0
): number {
  const baseShot = calculateInsideBoxShotAccuracy(sho, cmp, stakeFactor);
  return baseShot * 0.50;
}

// ============================================================================
// 3. PROGRESSION MECHANICS (BALL CONTROL, RETENTION, SHIELDING, DRIBBLING)
// ============================================================================

/**
 * Ball Control (BCL) — First-Touch Trapping Physics:
 * TrapDistance(BCL) = 36px - 32px * t in [4px, 36px]
 * Receiving a high aerial pass adds +35% (x 1.35)
 */
export function calculateTrapDistance(bcl: number, isAerial: boolean = false): number {
  const t = normalizeStat(bcl);
  let dist = 36 - 32 * t;
  if (isAerial) dist *= 1.35;
  return Math.max(3, dist);
}

/**
 * Knock-On Running Touch Control:
 * KnockOnControl = 1.0 - 0.40 * (1.0 - t)
 * Higher BCL recovers full dribble control in 2 frames vs 18 frames for 40 BCL
 */
export function calculateKnockOnRecoveryFrames(bcl: number): number {
  const t = normalizeStat(bcl);
  return Math.round(18 - 16 * t);
}

/**
 * Retention (RET) — Walking Turn Agility:
 * TurnSpeed_walk(RET) = 0.08 + 0.18 * t rad/frame in [0.08, 0.26]
 */
export function calculateWalkTurnSpeed(ret: number): number {
  return 0.08 + 0.18 * normalizeStat(ret);
}

/**
 * Shield vs Strength Duel Calculation:
 * ShieldPower = 0.60 * RET + 0.40 * STR_carrier
 * BreakPower = 0.70 * STR_tackler + 0.30 * TCK_tackler
 * Delta_duel = ShieldPower - BreakPower
 * Returns true if shield holds, false if broken
 */
export function resolveShieldDuel(
  carrierRet: number,
  carrierStr: number,
  tacklerStr: number,
  tacklerTck: number
): { holds: boolean; delta: number } {
  const shieldPower = 0.60 * carrierRet + 0.40 * carrierStr;
  const breakPower = 0.70 * tacklerStr + 0.30 * tacklerTck;
  const delta = shieldPower - breakPower;
  return {
    holds: delta >= 0,
    delta,
  };
}

/**
 * Pace (PAC) — Raw Off-Ball Top Locomotion Speed:
 * V_off_ball(PAC) = 2.80 + 1.60 * t in [2.80, 4.40] px/frame
 */
export function calculateOffBallTopSpeed(pac: number): number {
  const t = normalizeStat(pac);
  if (pac > 99) {
    // Hyper-burst stat break
    return 4.40 + 0.35 * Math.min(1.0, (pac - 99) / 6);
  }
  return 2.80 + 1.60 * t;
}

/**
 * Dribbling (DRI) Modifier on the Ball:
 * DribbleSpeedMod(DRI) = 0.75 + 0.25 * t in [0.75, 1.00]
 * V_on_ball = V_off_ball(PAC) * DribbleSpeedMod(DRI)
 */
export function calculateDribbleSpeedMod(dri: number): number {
  const t = normalizeStat(dri);
  return 0.75 + 0.25 * t;
}

export function calculateOnBallTopSpeed(pac: number, dri: number): number {
  return calculateOffBallTopSpeed(pac) * calculateDribbleSpeedMod(dri);
}

/**
 * Turn Deceleration on the Ball based on Dribbling (DRI):
 * At 40 DRI, turning > 60 deg causes -45% speed drop
 * At 99 DRI, turning speed loss is 0%
 */
export function calculateTurnDecelerationFactor(dri: number, angleDiffRad: number): number {
  if (Math.abs(angleDiffRad) < Math.PI / 3) return 1.0; // Under 60 degrees: full speed
  const t = normalizeStat(dri);
  const penalty = 0.45 * (1.0 - t);
  return Math.max(0.55, 1.0 - penalty);
}

// ============================================================================
// PHASE 8: PROCEDURAL DRIBBLING ANIMATION TIERS & ON-BALL PHYSICS SEPARATION
// ============================================================================

/**
 * Phase 8.1 Six Dribbling Animation Tiers:
 * 40–59: Amateur      -> Heavy, upright, slow turns
 * 60–69: Semi-Pro     -> Basic close control
 * 70–79: Pro          -> Sharper cuts, better body feints
 * 80–89: Elite        -> Quick step-overs, rapid direction change
 * 90–99: World Class  -> Fluid, low centre of gravity, explosive
 * 100+ : Unique       -> Signature / exaggerated elite moves (Stat Break)
 */
export function getDribblingTier(dri: number): DribblingTier {
  if (dri >= 100) return 'unique';
  if (dri >= 90) return 'world_class';
  if (dri >= 80) return 'elite';
  if (dri >= 70) return 'pro';
  if (dri >= 60) return 'semi_pro';
  return 'amateur';
}

/**
 * Phase 8.2 On-Ball Acceleration Ramp Factor in [0.20, 1.00]:
 * Top speed is governed by Pace, but acceleration while on the ball is governed
 * strictly by Dribbling (60%) and Ball Control (40%).
 * Low BCL+DRI takes multiple strides to push and gather the ball up to top speed.
 * High BCL+DRI launches into top velocity almost instantly.
 */
export function calculateOnBallAccelerationRamp(dri: number, bcl: number): number {
  if (dri > 99 || bcl > 99) return 1.0;
  const composite = dri * 0.60 + bcl * 0.40;
  const t = Math.max(0, Math.min(1.0, (composite - 40) / 59));
  return 0.20 + 0.78 * t;
}

/**
 * Phase 8.2 On-Ball Turn Responsiveness & Turn Radius in [0.22, 1.00]:
 * Turn radius while on the ball governed by Dribbling + Ball Control.
 * At Amateur (40-59), turning has high inertia (wide turning circle).
 * At World Class (90-99), turning is razor-sharp on a dime.
 * At Unique (100+), turns instantly without any loss of velocity.
 */
export function calculateOnBallTurnRate(dri: number, bcl: number): number {
  if (dri > 99) return 1.0;
  const composite = dri * 0.65 + bcl * 0.35;
  const t = Math.max(0, Math.min(1.0, (composite - 40) / 59));
  return 0.22 + 0.78 * Math.pow(t, 1.3);
}

/**
 * Touch offset distance (px) between ball and player cleats while carrying ball.
 * Lower tiers nudge the ball further away (16-18px), making it easier for rivals to contest.
 * Higher tiers keep it glued tightly to their boots (8-10px).
 */
export function getDribblingTouchOffset(tier: DribblingTier): number {
  switch (tier) {
    case 'amateur':
      return 17;
    case 'semi_pro':
      return 14;
    case 'pro':
      return 12;
    case 'elite':
      return 10;
    case 'world_class':
      return 9;
    case 'unique':
      return 8;
  }
}

/**
 * Speed multiplier for step-overs and body feints based on tier.
 * Higher tiers unlock faster, crisper animations.
 */
export function getStepOverCycleSpeed(tier: DribblingTier): number {
  switch (tier) {
    case 'amateur':
      return 0.65;
    case 'semi_pro':
      return 0.85;
    case 'pro':
      return 1.10;
    case 'elite':
      return 1.45;
    case 'world_class':
      return 1.85;
    case 'unique':
      return 2.25;
  }
}

// ============================================================================
// 4. DEFENSIVE MECHANICS (INTERCEPTIONS, TACKLES, SLIDES & COUPLING)
// ============================================================================

/**
 * Interception (INT) — Reach Radius:
 * InterceptionRadius(INT) = 14px + 22px * t in [14px, 36px]
 */
export function calculateInterceptionRadius(int: number): number {
  return 14 + 22 * normalizeStat(int);
}

/**
 * Clean Interception Control vs Loose Deflection:
 * P_clean_intercept(BCL) = 0.20 + 0.75 * normalizeStat(BCL)
 */
export function calculateCleanInterceptChance(bcl: number): number {
  return 0.20 + 0.75 * normalizeStat(bcl);
}

/**
 * Standing Tackle (TCK) — Dispossession & Clean Ball Rate:
 * P_clean_tackle(TCK) = 0.30 + 0.65 * normalizeStat(TCK)
 * FoulChance_standing = (1.0 - P_clean_tackle) * 0.35
 */
export function calculateStandingTackleCleanChance(tck: number): number {
  return 0.30 + 0.65 * normalizeStat(tck);
}

export function calculateStandingTackleFoulChance(tck: number): number {
  return (1.0 - calculateStandingTackleCleanChance(tck)) * 0.35;
}

/**
 * Standing Tackle Ball Coupling with BCL:
 * P_steal_to_feet(BCL) = 0.15 + 0.80 * normalizeStat(BCL)
 */
export function calculateStealToFeetChance(bcl: number): number {
  return 0.15 + 0.80 * normalizeStat(bcl);
}

/**
 * Sliding Tackle (SLD) — Sweep Reach & Clean Win Rate:
 * SlideReach(SLD) = 28px + 30px * t in [28px, 58px]
 * P_clean_slide(SLD) = 0.25 + 0.70 * normalizeStat(SLD)
 * FoulChance_slide = (1.0 - P_clean_slide) * 0.70
 */
export function calculateSlideReach(sld: number): number {
  return 28 + 30 * normalizeStat(sld);
}

export function calculateSlideCleanChance(sld: number): number {
  return 0.25 + 0.70 * normalizeStat(sld);
}

export function calculateSlideFoulChance(sld: number): number {
  return (1.0 - calculateSlideCleanChance(sld)) * 0.70;
}

// ============================================================================
// 5. REFLEXES (REF) & POSITIONING (POS) — PHASE 9 AERIAL ANTICIPATION & REBOUND REFLEXES
// ============================================================================

/**
 * Reflexes (REF) — Input & Physical Response Latency:
 * ResponseLagFrames(REF) = round(12 - 11 * t) in [1, 12] frames
 * If REF > 99 (Stat Break): 0 frames
 */
export function calculateResponseLagFrames(ref: number): number {
  if (ref > 99) return 0;
  return Math.round(12 - 11 * normalizeStat(ref));
}

/**
 * Positioning (POS) — Spatial IQ:
 * SpatialIQ(POS) = 0.40 + 0.58 * normalizeStat(POS) in [0.40, 0.98]
 */
export function calculateSpatialIQ(pos: number): number {
  return 0.40 + 0.58 * normalizeStat(pos);
}

/**
 * Phase 9.1: Positioning (POS) — Aerial Awareness & Drop-Zone Reading Latency (Frames)
 * High POS (85–99+) players immediately recognize ball flight arcs and run directly to the landing pocket.
 * Low POS or casual players take up to 24–30 frames before reacting to the flight path.
 * If POS > 99 (Stat Break: Omnipresent Phantom): 0 frames delay!
 */
export function calculateAerialAwarenessDelay(pos: number, difficulty: DifficultyLevel = 'normal'): number {
  if (difficulty === 'standing') return 999;
  if (pos > 99) return 0;

  const t = normalizeStat(pos);
  const baseFrames = 24 - 22 * t; // [2, 24] frames

  let diffFactor = 1.0;
  if (difficulty === 'legend') diffFactor = 0.40;
  else if (difficulty === 'elite') diffFactor = 0.65;
  else if (difficulty === 'normal') diffFactor = 1.00;
  else if (difficulty === 'easy') diffFactor = 1.50;

  return Math.max(0, Math.round(baseFrames * diffFactor));
}

/**
 * Phase 9.1: Interceptions (INT) — Defensive Aerial Anticipation Lead Bias (px)
 * Helps defenders (CBs, fullbacks, CDMs) calculate cut-off coordinates ahead of the attacker,
 * enabling them to step in front, establish body position, and clear aerial crosses first.
 */
export function calculateAerialInterceptionBias(int: number): number {
  const t = normalizeStat(int);
  if (int > 99) return 40; // Sixth Sense Breakthrough
  return 10 + 25 * t; // [10, 35] px
}

/**
 * Phase 9.2: Timing Window Contract for Aerial Headers & Volleys
 */
export interface AerialTimingWindow {
  sweetSpotZMin: number;
  sweetSpotZMax: number;
  acceptableZMin: number;
  acceptableZMax: number;
  maxReachDist: number;
  accuracyBonus: number;
  powerMultiplier: number;
}

/**
 * Phase 9.2: Timing Window Calculation scaled strictly by Reactions (REA) and Skill (HEA / SHO)
 * Higher REA provides a wider, more forgiving sweet-spot connection window and larger reach distance.
 * Low REA results in narrow, unforgiving timing windows where slight mistimings cause scuffed contact.
 */
export function calculateAerialTimingWindow(
  rea: number,
  skillStat: number,
  isVolley: boolean = false
): AerialTimingWindow {
  const tRea = normalizeStat(rea);
  const tSkill = normalizeStat(skillStat);
  const composite = tRea * 0.60 + tSkill * 0.40;
  const isStatBreakPlayer = rea > 99 || skillStat > 99;

  if (isVolley) {
    // Volley timing: waist-height to chest/head depending on volley type
    const sweetSpotZMin = Math.max(2.5, 4.0 - composite * 1.5);
    const sweetSpotZMax = 16.0 + composite * 5.0; // [16.0, 21.0]
    const acceptableZMin = 1.8;
    const acceptableZMax = 28.0 + (isStatBreakPlayer ? 6.0 : composite * 4.0);
    const maxReachDist = 24 + composite * 14; // [24, 38] px
    const accuracyBonus = 0.15 + composite * 0.35;
    const powerMultiplier = 1.0 + composite * 0.40;

    return {
      sweetSpotZMin,
      sweetSpotZMax,
      acceptableZMin,
      acceptableZMax,
      maxReachDist: isStatBreakPlayer ? 42 : maxReachDist,
      accuracyBonus,
      powerMultiplier,
    };
  } else {
    // Header timing: head elevation window
    const sweetSpotZMin = Math.max(9.0, 13.0 - composite * 3.5); // [9.5, 13.0]
    const sweetSpotZMax = 25.0 + composite * 7.0; // [25.0, 32.0]
    const acceptableZMin = 7.0;
    const acceptableZMax = 36.0 + (isStatBreakPlayer ? 8.0 : composite * 4.0);
    const maxReachDist = 20 + composite * 15; // [20, 35] px
    const accuracyBonus = 0.10 + composite * 0.40;
    const powerMultiplier = 0.95 + composite * 0.35;

    return {
      sweetSpotZMin,
      sweetSpotZMax,
      acceptableZMin,
      acceptableZMax,
      maxReachDist: isStatBreakPlayer ? 40 : maxReachDist,
      accuracyBonus,
      powerMultiplier,
    };
  }
}

/**
 * Phase 9.2: Evaluates contact quality given ball elevation Z, distance, and timing window
 */
export function evaluateAerialContactQuality(
  z: number,
  dist: number,
  timingWindow: AerialTimingWindow
): 'sweet_spot' | 'acceptable' | 'mistimed' {
  if (dist > timingWindow.maxReachDist) return 'mistimed';
  if (z >= timingWindow.sweetSpotZMin && z <= timingWindow.sweetSpotZMax) {
    return 'sweet_spot';
  }
  if (z >= timingWindow.acceptableZMin && z <= timingWindow.acceptableZMax) {
    return 'acceptable';
  }
  return 'mistimed';
}

/**
 * Phase 9.3: Reflexes (REA) — Second-Ball & Loose Rebound Reaction Delay (Frames)
 * Reflexes attribute shortens reaction latency to deflections, goalkeeper parries,
 * and loose balls in the box.
 * Higher difficulty AI reacts with faster latency and wins a larger share of second balls.
 */
export function calculateSecondBallReactionDelay(
  rea: number,
  difficulty: DifficultyLevel = 'normal'
): number {
  if (difficulty === 'standing') return 999;
  if (rea > 99) return 0; // Instant Synapse Stat Break

  const t = normalizeStat(rea);
  const baseFrames = 14 - 13 * t; // [1, 14] frames

  let diffFactor = 1.0;
  if (difficulty === 'legend') diffFactor = 0.35;
  else if (difficulty === 'elite') diffFactor = 0.60;
  else if (difficulty === 'normal') diffFactor = 1.00;
  else if (difficulty === 'easy') diffFactor = 1.80;

  return Math.max(0, Math.round(baseFrames * diffFactor));
}

// ============================================================================
// 6. DYNAMIC STAMINA ENGINE
// ============================================================================

/**
 * Dynamic Stamina Capacity:
 * Initial capacity: E_max(0) = 100.0 + 50.0 * normalizeStat(STA) in [100.0, 150.0]
 */
export function calculateInitialMaxStamina(sta: number): number {
  return 100.0 + 50.0 * normalizeStat(sta);
}

/**
 * Sprint Burn Rate (dE_burn):
 * dE_burn = (0.28 - 0.12 * normalizeStat(STA)) units/frame
 * Stat Break (STA > 99): Iron Engine = 0.00
 */
export function calculateStaminaSprintBurn(sta: number): number {
  if (sta > 99) return 0;
  return 0.28 - 0.12 * normalizeStat(sta);
}

/**
 * Recovery Rate (dE_recov):
 * dE_recov = (0.08 + 0.14 * normalizeStat(STA)) units/frame
 */
export function calculateStaminaRecovery(sta: number): number {
  return 0.08 + 0.14 * normalizeStat(sta);
}

/**
 * Updates player stamina for one frame:
 * Incorporates sprint burn, irreversible max cap decay (-0.04 * dE_burn),
 * floor at 50% of E_max(0), and recovery when not sprinting.
 */
export function updatePlayerStaminaDynamic(
  player: Player,
  isSprinting: boolean,
  timeScale: number = 1
) {
  const sta = (player as any).canonicalStats?.sta ?? 70;
  if (sta > 99) {
    // Stat break: infinite stamina!
    player.stamina = player.staminaMax ?? 150;
    return;
  }

  if (player.staminaInitialMax === undefined) {
    player.staminaInitialMax = calculateInitialMaxStamina(sta);
    player.staminaMax = player.staminaInitialMax;
    player.stamina = player.staminaMax;
  }

  const initialMax = player.staminaInitialMax;
  const currentMax = player.staminaMax ?? initialMax;
  const minFloor = 0.50 * initialMax;

  if (isSprinting) {
    const burn = calculateStaminaSprintBurn(sta) * timeScale;
    player.stamina = Math.max(0, player.stamina - burn);

    // Irreversible max wear
    const wear = 0.04 * burn;
    player.staminaMax = Math.max(minFloor, currentMax - wear);
  } else {
    const recov = calculateStaminaRecovery(sta) * timeScale;
    player.stamina = Math.min(currentMax, player.stamina + recov);
  }
}

// ============================================================================
// 7. GOALKEEPER 7 SPECIALIST METRICS
// ============================================================================

/**
 * 1. Saving (SAV) — Dive Reach:
 * DiveReach(SAV) = 24px + 36px * t in [24px, 60px]
 */
export function calculateGkDiveReach(sav: number): number {
  return 24 + 36 * normalizeStat(sav);
}

/**
 * 2. Reflexes (REF) — Reaction Latency in Frames:
 * LatencyFrames(REF) = round(16 - 15 * t) in [1, 16] frames (0 if REF > 99)
 */
export function calculateGkLatencyFrames(ref: number): number {
  if (ref > 99) return 0;
  return Math.round(16 - 15 * normalizeStat(ref));
}

/**
 * 3. Handling (HAN) — Catch vs Spilled Rebound Rate:
 * P_clean_catch = max(0.05, 0.10 + 0.85 * t - 0.02 * max(0, V_shot - 15))
 */
export function calculateGkCatchChance(han: number, shotSpeed: number): number {
  const t = normalizeStat(han);
  const speedExcess = Math.max(0, shotSpeed - 15);
  return Math.max(0.05, 0.10 + 0.85 * t - 0.02 * speedExcess);
}

/**
 * 4. Positioning (GPO) — Angle Occlusion:
 * AngleOcclusion(GPO) = 0.40 + 0.45 * t in [40%, 85%]
 */
export function calculateGkAngleOcclusion(gpo: number): number {
  return 0.40 + 0.45 * normalizeStat(gpo);
}

/**
 * 5. Aerial Reach (AER) — Cross Interception Ceiling:
 * Z_max_claim(AER) = 20px + 12px * t in [20px, 32px]
 */
export function calculateGkAirCeiling(aer: number): number {
  return 20 + 12 * normalizeStat(aer);
}

/**
 * 6. One-on-One (1v1) — Smother Starfish Hitbox Radius:
 * SmotherHitboxRadius(1v1) = 18px + 22px * t in [18px, 40px]
 */
export function calculateGkSmotherHitbox(oneOnOne: number): number {
  return 18 + 22 * normalizeStat(oneOnOne);
}

/**
 * 7. Distribution (DIS) — Counter-Attack Launch Accuracy:
 * P_counter_launch(DIS) = 0.10 + 0.85 * t in [10%, 95%]
 */
export function calculateGkCounterLaunchChance(dis: number): number {
  return 0.10 + 0.85 * normalizeStat(dis);
}

// ============================================================================
// 8. ZERO-ALLOCATION CONTIGUOUS FLOAT32ARRAY MEMORY LAYOUT
// ============================================================================

export const STAT_INDEX = {
  // Outfield (0 - 18)
  PAC: 0,
  STA: 1,
  STR: 2,
  BCL: 3,
  RET: 4,
  DRI: 5,
  SPA: 6,
  LPA: 7,
  CRO: 8,
  SHO: 9,
  HEA: 10,
  LSH: 11,
  TCK: 12,
  SLD: 13,
  INT: 14,
  MRK: 15,
  POS: 16,
  CMP: 17,
  REA: 18,
  // Goalkeeper (19 - 24)
  SAV: 19,
  REF: 20,
  HAN: 21,
  GPO: 22,
  AER: 23,
  ONE_ON_ONE: 24,
  DIS: 24, // shared slot for 25-element buffer
} as const;

export function createStatsBuffer(
  outfield?: Partial<CanonicalOutfieldStats>,
  gk?: Partial<CanonicalGoalkeeperStats>
): Float32Array {
  const buf = new Float32Array(25);
  if (outfield) {
    buf[0] = outfield.pac ?? 70;
    buf[1] = outfield.sta ?? 70;
    buf[2] = outfield.str ?? 70;
    buf[3] = outfield.bcl ?? 70;
    buf[4] = outfield.ret ?? 70;
    buf[5] = outfield.dri ?? 70;
    buf[6] = outfield.spa ?? 70;
    buf[7] = outfield.lpa ?? 70;
    buf[8] = outfield.cro ?? 70;
    buf[9] = outfield.sho ?? 70;
    buf[10] = outfield.hea ?? 70;
    buf[11] = outfield.lsh ?? 70;
    buf[12] = outfield.tck ?? 70;
    buf[13] = outfield.sld ?? 70;
    buf[14] = outfield.int ?? 70;
    buf[15] = outfield.mrk ?? 70;
    buf[16] = outfield.pos ?? 70;
    buf[17] = outfield.cmp ?? 70;
    buf[18] = outfield.rea ?? 70;
  }
  if (gk) {
    buf[19] = gk.sav ?? 70;
    buf[20] = gk.ref ?? 70;
    buf[21] = gk.han ?? 70;
    buf[22] = gk.gpo ?? 70;
    buf[23] = gk.aer ?? 70;
    buf[24] = gk.oneOnOne ?? 70;
  }
  return buf;
}

// ============================================================================
// 9. CANONICAL SQUAD DATA DEFINITIONS (22 LEGENDARY PLAYERS)
// ============================================================================

export const HOME_PLAYER_CANONICAL_STATS: Record<PlayerRole, CanonicalOutfieldStats | CanonicalGoalkeeperStats> = {
  GK: {
    // Schmeichel - The Great Dane (⚡ Stat Break on Saving: Spiderman Leap)
    sav: 101, // ⚡ STAT BREAK!
    ref: 97,
    han: 94,
    gpo: 95,
    aer: 96,
    oneOnOne: 98,
    dis: 90,
  },
  LB: {
    // Maldini - Il Capitano (⚡ Stat Break on Tackling: Surgical Extraction)
    pac: 88,
    sta: 95,
    str: 88,
    bcl: 90,
    ret: 88,
    dri: 84,
    spa: 88,
    lpa: 87,
    cro: 86,
    sho: 64,
    hea: 92,
    lsh: 62,
    tck: 101, // ⚡ STAT BREAK!
    sld: 98,
    int: 98,
    mrk: 99,
    pos: 98,
    cmp: 98,
    rea: 96,
  },
  CB1: {
    // Baresi - Master of the Sweeper (⚡ Stat Break on Positioning: Omnipresent Phantom)
    pac: 85,
    sta: 93,
    str: 87,
    bcl: 91,
    ret: 89,
    dri: 82,
    spa: 91,
    lpa: 90,
    cro: 76,
    sho: 58,
    hea: 90,
    lsh: 60,
    tck: 99,
    sld: 98,
    int: 99,
    mrk: 99,
    pos: 101, // ⚡ STAT BREAK!
    cmp: 99,
    rea: 98,
  },
  CB2: {
    // Koeman - The Rocket Sweeper (⚡ Stat Break on Long Pass: Radar Telemetry Switch)
    pac: 80,
    sta: 91,
    str: 93,
    bcl: 89,
    ret: 85,
    dri: 80,
    spa: 92,
    lpa: 101, // ⚡ STAT BREAK!
    cro: 84,
    sho: 95,
    hea: 88,
    lsh: 99,
    tck: 92,
    sld: 90,
    int: 91,
    mrk: 89,
    pos: 93,
    cmp: 95,
    rea: 91,
  },
  RB: {
    // Cafu - Il Pendolino (⚡ Stat Break on Stamina: Iron Engine)
    pac: 96,
    sta: 101, // ⚡ STAT BREAK!
    str: 84,
    bcl: 91,
    ret: 90,
    dri: 92,
    spa: 89,
    lpa: 87,
    cro: 93,
    sho: 72,
    hea: 78,
    lsh: 75,
    tck: 88,
    sld: 86,
    int: 90,
    mrk: 87,
    pos: 92,
    cmp: 91,
    rea: 95,
  },
  LM: {
    // Giggs - Welsh Wizard (⚡ Stat Break on Pace: Hyper-Burst / Sonic Ghost)
    pac: 101, // ⚡ STAT BREAK!
    sta: 92,
    str: 78,
    bcl: 95,
    ret: 94,
    dri: 96,
    spa: 91,
    lpa: 88,
    cro: 96,
    sho: 84,
    hea: 72,
    lsh: 82,
    tck: 65,
    sld: 62,
    int: 72,
    mrk: 64,
    pos: 92,
    cmp: 90,
    rea: 95,
  },
  CM1: {
    // Matthäus - Complete Midfielder
    pac: 90,
    sta: 97,
    str: 92,
    bcl: 94,
    ret: 93,
    dri: 90,
    spa: 95,
    lpa: 94,
    cro: 86,
    sho: 93,
    hea: 84,
    lsh: 96,
    tck: 92,
    sld: 90,
    int: 94,
    mrk: 92,
    pos: 96,
    cmp: 97,
    rea: 96,
  },
  CM2: {
    // Gullit - The Complete Colossus (⚡ Stat Break on Strength: Immovable Juggernaut)
    pac: 93,
    sta: 96,
    str: 101, // ⚡ STAT BREAK!
    bcl: 95,
    ret: 94,
    dri: 93,
    spa: 93,
    lpa: 91,
    cro: 89,
    sho: 92,
    hea: 98,
    lsh: 92,
    tck: 86,
    sld: 84,
    int: 88,
    mrk: 86,
    pos: 95,
    cmp: 95,
    rea: 95,
  },
  RM: {
    // Gascoigne - Gazza Flair
    pac: 91,
    sta: 88,
    str: 86,
    bcl: 96,
    ret: 95,
    dri: 96,
    spa: 94,
    lpa: 92,
    cro: 91,
    sho: 89,
    hea: 75,
    lsh: 91,
    tck: 72,
    sld: 68,
    int: 76,
    mrk: 70,
    pos: 91,
    cmp: 92,
    rea: 94,
  },
  ST1: {
    // Maradona - El Pibe de Oro (⚡ Stat Break on Dribbling: Ankle Breaker)
    pac: 96,
    sta: 88,
    str: 84,
    bcl: 99,
    ret: 99,
    dri: 101, // ⚡ STAT BREAK!
    spa: 98,
    lpa: 96,
    cro: 95,
    sho: 98,
    hea: 78,
    lsh: 97,
    tck: 52,
    sld: 48,
    int: 70,
    mrk: 55,
    pos: 98,
    cmp: 98,
    rea: 99,
  },
  ST2: {
    // Van Basten - The Swan of Utrecht (⚡ Stat Break on Heading: Sky Walk & Bullet Header)
    pac: 91,
    sta: 90,
    str: 91,
    bcl: 97,
    ret: 94,
    dri: 93,
    spa: 90,
    lpa: 84,
    cro: 82,
    sho: 99,
    hea: 101, // ⚡ STAT BREAK!
    lsh: 94,
    tck: 50,
    sld: 46,
    int: 62,
    mrk: 52,
    pos: 99,
    cmp: 97,
    rea: 96,
  },
};

export const AWAY_PLAYER_CANONICAL_STATS: Record<PlayerRole, CanonicalOutfieldStats | CanonicalGoalkeeperStats> = {
  GK: {
    // Zoff - Monumental Italian Wall (⚡ Stat Break on Handling: Magnetic Claws)
    sav: 95,
    ref: 95,
    han: 101, // ⚡ STAT BREAK!
    gpo: 99,
    aer: 93,
    oneOnOne: 95,
    dis: 86,
  },
  RB: {
    // Brehme - Ambidextrous Fullback Legend
    pac: 88,
    sta: 94,
    str: 86,
    bcl: 92,
    ret: 90,
    dri: 87,
    spa: 92,
    lpa: 94,
    cro: 96,
    sho: 88,
    hea: 80,
    lsh: 92,
    tck: 90,
    sld: 88,
    int: 91,
    mrk: 90,
    pos: 93,
    cmp: 96,
    rea: 93,
  },
  CB1: {
    // Scirea - Absolute Elegance & Timing (⚡ Stat Break on Interception: Sixth Sense)
    pac: 86,
    sta: 92,
    str: 88,
    bcl: 92,
    ret: 90,
    dri: 84,
    spa: 93,
    lpa: 91,
    cro: 76,
    sho: 62,
    hea: 91,
    lsh: 66,
    tck: 98,
    sld: 97,
    int: 101, // ⚡ STAT BREAK!
    mrk: 98,
    pos: 99,
    cmp: 99,
    rea: 97,
  },
  CB2: {
    // Desailly - The Rock
    pac: 87,
    sta: 95,
    str: 97,
    bcl: 87,
    ret: 85,
    dri: 80,
    spa: 88,
    lpa: 86,
    cro: 72,
    sho: 65,
    hea: 96,
    lsh: 68,
    tck: 98,
    sld: 96,
    int: 96,
    mrk: 97,
    pos: 96,
    cmp: 95,
    rea: 95,
  },
  LB: {
    // Roberto Carlos - Cannon Leg (⚡ Stat Break on Long Shots: Thunderbolt Cannon)
    pac: 98,
    sta: 97,
    str: 93,
    bcl: 89,
    ret: 86,
    dri: 90,
    spa: 87,
    lpa: 94,
    cro: 94,
    sho: 96,
    hea: 72,
    lsh: 101, // ⚡ STAT BREAK!
    tck: 88,
    sld: 93,
    int: 87,
    mrk: 84,
    pos: 90,
    cmp: 92,
    rea: 95,
  },
  RM: {
    // Valderrama - El Pibe Afro Maestro (⚡ Stat Break on Short Pass: Laser Ping)
    pac: 78,
    sta: 84,
    str: 78,
    bcl: 98,
    ret: 99,
    dri: 94,
    spa: 101, // ⚡ STAT BREAK!
    lpa: 97,
    cro: 92,
    sho: 82,
    hea: 68,
    lsh: 84,
    tck: 60,
    sld: 55,
    int: 78,
    mrk: 62,
    pos: 96,
    cmp: 99,
    rea: 95,
  },
  CM1: {
    // Rijkaard - Black Hurricane Anchor (⚡ Stat Break on Marking: Shadow Lockdown)
    pac: 89,
    sta: 96,
    str: 96,
    bcl: 94,
    ret: 93,
    dri: 89,
    spa: 94,
    lpa: 92,
    cro: 82,
    sho: 86,
    hea: 96,
    lsh: 88,
    tck: 97,
    sld: 95,
    int: 97,
    mrk: 101, // ⚡ STAT BREAK!
    pos: 97,
    cmp: 97,
    rea: 96,
  },
  CM2: {
    // Hagi - Maradona of the Carpathians
    pac: 88,
    sta: 89,
    str: 82,
    bcl: 97,
    ret: 96,
    dri: 96,
    spa: 96,
    lpa: 95,
    cro: 93,
    sho: 95,
    hea: 74,
    lsh: 98,
    tck: 62,
    sld: 58,
    int: 74,
    mrk: 65,
    pos: 94,
    cmp: 95,
    rea: 95,
  },
  LM: {
    // Stoichkov - The Dagger (⚡ Stat Break on Reactions: Instant Synapse)
    pac: 95,
    sta: 93,
    str: 88,
    bcl: 95,
    ret: 93,
    dri: 95,
    spa: 91,
    lpa: 89,
    cro: 92,
    sho: 96,
    hea: 84,
    lsh: 95,
    tck: 68,
    sld: 66,
    int: 77,
    mrk: 70,
    pos: 95,
    cmp: 96,
    rea: 101, // ⚡ STAT BREAK!
  },
  ST1: {
    // Romário - O Baixinho Penalty Box Genius (⚡ Stat Break on Shooting: Deadly Assassin)
    pac: 96,
    sta: 84,
    str: 82,
    bcl: 99,
    ret: 98,
    dri: 98,
    spa: 88,
    lpa: 80,
    cro: 76,
    sho: 101, // ⚡ STAT BREAK!
    hea: 84,
    lsh: 91,
    tck: 46,
    sld: 42,
    int: 58,
    mrk: 46,
    pos: 99,
    cmp: 98,
    rea: 99,
  },
  ST2: {
    // Baggio - Il Divin Codino (⚡ Stat Break on Composure: Ice in the Veins)
    pac: 93,
    sta: 89,
    str: 80,
    bcl: 98,
    ret: 98,
    dri: 98,
    spa: 96,
    lpa: 94,
    cro: 92,
    sho: 97,
    hea: 78,
    lsh: 95,
    tck: 52,
    sld: 48,
    int: 68,
    mrk: 54,
    pos: 97,
    cmp: 101, // ⚡ STAT BREAK!
    rea: 97,
  },
};
