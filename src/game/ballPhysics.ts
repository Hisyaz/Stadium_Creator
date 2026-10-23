/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Ball, Player, TeamSide, KeyState, DifficultyLevel } from '../types';
import { PITCH_CONFIG, PHYSICS } from './constants';
import { audio } from './audio';
import {
  calculateShortPassSuccessRate,
  calculateLongPassSuccessRate,
  calculateCrossSuccessRate,
  calculateInsideBoxShotAccuracy,
  calculateLongShotAccuracy,
  isStatBreak,
} from './playerStats';

/**
 * Aerodynamic soccer ball constants (FIFA Regulation Size 5 ball, 430g, 22cm diameter)
 */
export const BALL_AERO = {
  MAGNUS_COEFF: 0.0125,   // Lateral acceleration per unit of spin * velocity
  LIFT_COEFF: 0.008,      // Vertical lift from backspin
  SPIN_DECAY: 0.986,      // Rate at which ball spin attenuates in flight
  TURF_SPIN_GRIP: 0.35,   // Spin to linear velocity transfer on bounce
  MAX_DEFORMATION: 0.85,  // Maximum elongation factor (oval stretch)
  MIN_SPEED_DEFORM: 3.2,  // Speed threshold before elongation kicks in
  CHIP_TURF_BITE: 0.62,   // Deceleration factor when backspin chip checks up on grass
};

export interface KickAccuracyInfo {
  isStanding: boolean;
  isRunning: boolean;
  isSprinting: boolean;
  isDefenderTouching: boolean;
  touchingDefender: Player | null;
  errorSpreadMultiplier: number;
  // Phase 6: Strictly stat-driven pressure, fatigue and difficulty factors
  fatigueFactor: number; // 1.0 (fresh) up to 1.84 (exhausted)
  pressureIntensity: number; // 0.0 (unmarked) to 3.0 (surrounded)
  difficultyMultiplier: number; // 0.75 (legend) to 1.50 (standing)
}

export interface TrajectoryResult {
  vx: number;
  vy: number;
  vz: number;
  spin: number;
  spinY: number;
  isAirborne: boolean;
  isOverpowered: boolean;
  isSpecialCurve: boolean;
  isChipped: boolean;
  chipType?: 'shot' | 'cross' | 'pass';
  bannerMessage: string;
  isThunderbolt?: boolean;
  isLaserPing?: boolean;
  isGuidedWhip?: boolean;
  isRadarTelemetry?: boolean;
  isDeadlyAssassin?: boolean;
  statBreakTrait?: string;
}

/**
 * Phase 6.2 Evaluates kick accuracy strictly stat-driven based on:
 * - Player momentum (standing vs running vs sprinting)
 * - Composure-cushioned continuous defensive pressure (markers within 35px, 75px, 130px)
 * - Dynamic stamina fatigue ratio
 * - Difficulty scaling
 */
export function evaluateKickAccuracyInfo(
  player: Player,
  keys: KeyState | undefined,
  allPlayers: Player[],
  difficulty: DifficultyLevel = 'normal'
): KickAccuracyInfo {
  const isMoving = Math.hypot(player.vx, player.vy) > 0.35;
  const hasArrowInput = !!(keys && (keys.ArrowUp || keys.ArrowDown || keys.ArrowLeft || keys.ArrowRight));
  const isRunning = isMoving || hasArrowInput || player.action === 'running';
  const isStanding = !isRunning;
  const isSprinting = isRunning && !!(keys?.Shift || (player.dashTimer && player.dashTimer > 0));

  // 1. Continuous Opponent Pressure Scanning
  let rawPressure = 0;
  let isDefenderTouching = false;
  let touchingDefender: Player | null = null;
  for (let i = 0; i < allPlayers.length; i++) {
    const p = allPlayers[i];
    if (p.team !== player.team && !p.isRedCarded) {
      const d = Math.hypot(p.x - player.x, p.y - player.y);
      if (d < 35) {
        rawPressure += 1.0;
        if (d < 28) {
          isDefenderTouching = true;
          touchingDefender = p;
        }
      } else if (d < 75) {
        rawPressure += 0.5;
      } else if (d < 130) {
        rawPressure += 0.2;
      }
    }
  }

  // Composure (CMP) mitigates pressure panic: 90 CMP ignores 70% of press, 45 CMP collapses
  const cmp = player.canonicalStats && 'cmp' in player.canonicalStats ? player.canonicalStats.cmp : 70;
  const cmpResistance = Math.max(0.15, (cmp - 35) / 64);
  const pressureIntensity = Math.min(3.0, rawPressure / (0.45 + cmpResistance * 0.75));

  // 2. Dynamic Stamina Fatigue Factor
  const currentStamina = typeof player.stamina === 'number' ? player.stamina : 100;
  const maxStamina = player.staminaMax || 100;
  const staminaPct = Math.max(0, Math.min(1, currentStamina / maxStamina));
  const fatigueFactor = staminaPct >= 0.70 ? 1.0 : 1.0 + (0.70 - staminaPct) * 1.2;

  // 3. Difficulty Multiplier (Legend makes fewer unforced errors; Easy has more forgiving spreads)
  let difficultyMultiplier = 1.0;
  if (difficulty === 'legend') difficultyMultiplier = 0.75;
  else if (difficulty === 'elite') difficultyMultiplier = 0.88;
  else if (difficulty === 'normal') difficultyMultiplier = 1.00;
  else if (difficulty === 'easy') difficultyMultiplier = 1.25;
  else if (difficulty === 'standing') difficultyMultiplier = 1.50;

  // 4. Composite Error Spread Multiplier
  let errorSpreadMultiplier = 1.0;
  if (isStanding) errorSpreadMultiplier = 0.45;
  if (isRunning) errorSpreadMultiplier = 1.0;
  if (isSprinting) errorSpreadMultiplier = 1.45;
  if (isDefenderTouching) errorSpreadMultiplier *= 1.85;
  errorSpreadMultiplier *= (1.0 + (fatigueFactor - 1.0) * 0.45) * (1.0 + pressureIntensity * 0.35);

  return {
    isStanding,
    isRunning,
    isSprinting,
    isDefenderTouching,
    touchingDefender,
    errorSpreadMultiplier,
    fatigueFactor,
    pressureIntensity,
    difficultyMultiplier,
  };
}

/**
 * Phase 5 — 1. Canonical Short Pass Trajectory (S / Green S Button)
 * Governed by Short Passing (SPA), Composure (CMP), and Match Stakes (W):
 * P_short(S) in [10% at 40 -> 95% at 99 -> 98% Break]
 * On failure: angular error dispersion theta_err in +- [15 deg, 35 deg] & velocity scatter +- 30%
 */
export function calculateShortPassPhysics(
  player: Player,
  targetX: number,
  targetY: number,
  power: number,
  isSpecial: boolean,
  isChip: boolean,
  acc: KickAccuracyInfo,
  stakeFactor: number = 0
): TrajectoryResult {
  const dx = targetX - player.x;
  const dy = targetY - player.y;
  const dist = Math.hypot(dx, dy) || 1;

  // Retrieve canonical attributes
  const spa = player.canonicalStats && 'spa' in player.canonicalStats ? player.canonicalStats.spa : 75;
  const cmp = player.canonicalStats && 'cmp' in player.canonicalStats ? player.canonicalStats.cmp : 70;
  const baseSuccess = calculateShortPassSuccessRate(spa, cmp, stakeFactor);

  // Phase 6.2: Strictly stat-driven success rate
  // Miss probability is a function of Short Pass (SPA) + pressure + fatigue + difficulty multiplier
  // A 90-rated passer under light pressure almost never misses; a 45-rated player under high press frequently does
  const fatiguePenalty = (acc.fatigueFactor - 1.0) * 0.22;
  const pressurePenalty = acc.pressureIntensity * 0.12;
  const statDrivenRate = Math.max(0.02, baseSuccess - fatiguePenalty - pressurePenalty);
  const effectiveSuccess = Math.min(0.99, Math.max(0.02, statDrivenRate / (acc.errorSpreadMultiplier * (acc.difficultyMultiplier || 1.0))));
  const isSuccess = Math.random() < effectiveSuccess;
  const hasStatBreak = isStatBreak(spa);

  if (power >= 0.90) {
    // Overpowered Short Pass: rolls past teammate with excessive force
    const overSpeed = 15.5;
    return {
      vx: (dx / dist) * overSpeed,
      vy: (dy / dist) * overSpeed,
      vz: 0.3,
      spin: isSpecial ? (Math.random() > 0.5 ? 8.2 : -8.2) : (Math.random() - 0.5) * 1.5,
      spinY: 0,
      isAirborne: false,
      isOverpowered: true,
      isSpecialCurve: isSpecial,
      isChipped: false,
      bannerMessage: isSpecial
        ? 'VIOLENT HOOK PASS PAST TEAMMATE!'
        : 'OVERHIT PASS! ROLLED PAST TEAMMATE! (BURGUNDY)',
    };
  }

  // Calculate direction angle and apply error dispersion on miss
  let aimAngle = Math.atan2(dy, dx);
  let speedMultiplier = 1.0;

  if (!isSuccess && !hasStatBreak) {
    const errorMagnitude = (1.0 - effectiveSuccess) * (acc.difficultyMultiplier || 1.0);
    const errorAngle = ((12 + errorMagnitude * 26) * Math.PI) / 180;
    const sign = Math.random() > 0.5 ? 1 : -1;
    aimAngle += errorAngle * sign;
    speedMultiplier = Math.max(0.55, 1.0 + (Math.random() - 0.5) * (0.30 + errorMagnitude * 0.35)); // velocity scatter
  }

  const finalDirX = Math.cos(aimAngle);
  const finalDirY = Math.sin(aimAngle);

  if (isChip) {
    // Delicate chipped short pass / dink over lunging leg
    const chipSpeed = Math.min(14.0, Math.max(9.0, dist * 0.07)) * (0.95 + power * 0.35) * speedMultiplier;
    return {
      vx: finalDirX * chipSpeed + (acc.isRunning ? player.vx * 0.14 : 0),
      vy: finalDirY * chipSpeed + (acc.isRunning ? player.vy * 0.14 : 0),
      vz: 2.8 + power * 0.6,
      spin: 0,
      spinY: -1.8,
      isAirborne: true,
      isOverpowered: false,
      isSpecialCurve: false,
      isChipped: true,
      chipType: 'pass',
      bannerMessage: acc.isDefenderTouching
        ? 'DINKED PASS UNDER PRESSURE (-50% ACCURACY)'
        : hasStatBreak
        ? '⚡ PINPOINT SCOOP CHIP! [STAT BREAK]'
        : 'DELICATE CHIPPED PASS TO FEET! [E]',
    };
  }

  // Crisp, clean ground roll (z = 0, vz = 0)
  const baseSpeed = Math.min(15.2, Math.max(8.8, dist * 0.068)) * (0.95 + power * 0.45) * speedMultiplier;
  const speed = hasStatBreak ? baseSpeed * 1.25 : baseSpeed; // ⚡ Laser Ping: +25% supersonic velocity across grass
  let vx = finalDirX * speed;
  let vy = finalDirY * speed;
  if (acc.isRunning) {
    vx += player.vx * 0.16;
    vy += player.vy * 0.16;
  }

  let spin = (Math.random() - 0.5) * 1.2;
  if (isSpecial) {
    spin = player.x < PITCH_CONFIG.CENTER_X ? 4.5 : -4.5;
  }

  let banner = 'CRISP GROUND PASS TO FEET!';
  if (hasStatBreak) {
    banner = '⚡ LASER PING PASS! [STAT BREAK]';
    audio.playStatBreakChime();
  } else if (isSpecial) banner = 'CURVED SHORT PASS! [Q]';
  else if (!isSuccess) banner = 'MISPLACED PASS UNDER PRESSURE!';
  else if (power >= 0.75) banner = 'CRISP ZIP PASS! (MAX OUTPUT)';
  if (acc.isDefenderTouching && isSuccess) banner = 'PASS UNDER DEFENDER PRESSURE (-50% ACCURACY)';

  return {
    vx,
    vy,
    vz: 0,
    spin,
    spinY: 0,
    isAirborne: false,
    isOverpowered: false,
    isSpecialCurve: isSpecial,
    isChipped: false,
    bannerMessage: banner,
    isLaserPing: hasStatBreak,
    statBreakTrait: hasStatBreak ? 'Laser Ping' : undefined,
  };
}

/**
 * Phase 6.2 Canonical Long Pass / Through Ball Trajectory (W / Red L Button)
 * Governed by Long Passing (LPA), Composure (CMP), Match Stakes (W), pressure, and fatigue
 * Stat Break (>99): Radar Telemetry zero-bounce glide with pinpoint targeting
 */
export function calculateLongPassPhysics(
  player: Player,
  targetX: number,
  targetY: number,
  power: number,
  isSpecial: boolean,
  isChip: boolean,
  acc: KickAccuracyInfo,
  stakeFactor: number = 0
): TrajectoryResult {
  const dx = targetX - player.x;
  const dy = targetY - player.y;
  const dist = Math.hypot(dx, dy) || 1;

  // Retrieve canonical attributes
  const lpa = player.canonicalStats && 'lpa' in player.canonicalStats ? player.canonicalStats.lpa : 70;
  const cmp = player.canonicalStats && 'cmp' in player.canonicalStats ? player.canonicalStats.cmp : 70;
  const baseSuccess = calculateLongPassSuccessRate(lpa, cmp, stakeFactor);

  // Phase 6.2: Strictly stat-driven success rate
  const fatiguePenalty = (acc.fatigueFactor - 1.0) * 0.24;
  const pressurePenalty = acc.pressureIntensity * 0.14;
  const statDrivenRate = Math.max(0.02, baseSuccess - fatiguePenalty - pressurePenalty);
  const effectiveSuccess = Math.min(0.98, Math.max(0.02, statDrivenRate / (acc.errorSpreadMultiplier * (acc.difficultyMultiplier || 1.0))));
  const isSuccess = Math.random() < effectiveSuccess;
  const hasStatBreak = isStatBreak(lpa);

  if (power >= 0.96) {
    // Overpowered: overcooks through ball past the endline (only at 96%+ burgundy max)
    const overSpeed = 30.0;
    return {
      vx: (dx / dist) * overSpeed,
      vy: (dy / dist) * overSpeed,
      vz: 6.2,
      spin: isSpecial ? (Math.random() > 0.5 ? 9.0 : -9.0) : (Math.random() - 0.5) * 2.0,
      spinY: 0,
      isAirborne: true,
      isOverpowered: true,
      isSpecialCurve: isSpecial,
      isChipped: false,
      bannerMessage: isSpecial
        ? 'VIOLENTLY CURVED LONG PASS! OVERCOOKED!'
        : 'UNCATCHABLE OVERCOOKED THROUGH-BALL! (BURGUNDY)',
    };
  }

  // Calculate direction angle and apply error dispersion on miss
  let aimAngle = Math.atan2(dy, dx);
  let speedMultiplier = 1.0;

  if (!isSuccess && !hasStatBreak) {
    const errorMagnitude = (1.0 - effectiveSuccess) * (acc.difficultyMultiplier || 1.0);
    const errorAngle = ((15 + errorMagnitude * 25) * Math.PI) / 180;
    const sign = Math.random() > 0.5 ? 1 : -1;
    aimAngle += errorAngle * sign;
    speedMultiplier = Math.max(0.60, 1.0 + (Math.random() - 0.5) * (0.35 + errorMagnitude * 0.35)); // velocity scatter
  }

  const finalDirX = Math.cos(aimAngle);
  const finalDirY = Math.sin(aimAngle);

  if (isChip) {
    // ⚡ CHIPPED LONG PASS (E + W): Scooped aerial ball lifted softly over pressing midfield into channels
    // Phase 7.1: True flight distance with aerodynamic backspin lift
    const chipSpeed = (13.5 + power * 6.5) * (player.stats.shotPower / 4.4) * speedMultiplier;
    return {
      vx: finalDirX * chipSpeed + (acc.isRunning ? player.vx * 0.16 : 0),
      vy: finalDirY * chipSpeed + (acc.isRunning ? player.vy * 0.16 : 0),
      vz: 4.8 + power * 1.8,
      spin: 0,
      spinY: -2.2, // Pronounced backspin allows ball to float and bite on turf
      isAirborne: true,
      isOverpowered: false,
      isSpecialCurve: false,
      isChipped: true,
      chipType: 'pass',
      bannerMessage: acc.isDefenderTouching
        ? 'CHIPPED PASS UNDER PRESSURE (-50% ACCURACY)'
        : hasStatBreak
        ? '⚡ RADAR TELEMETRY GLIDE CHIP! [STAT BREAK]'
        : 'CHIPPED THROUGH-BALL OVER DEFENDERS! [E]',
      isRadarTelemetry: hasStatBreak,
      statBreakTrait: hasStatBreak ? 'Radar Telemetry Switch' : undefined,
    };
  }

  if (isSpecial) {
    // ⚡ CURVED LONG PASS (Q + W): Curved swerving through-ball bending around defenders
    const curveSpeed = (16.5 + power * 10.0) * (player.stats.shotPower / 4.4) * speedMultiplier;
    const curlDir = targetX < player.x ? -1 : 1;
    return {
      vx: finalDirX * curveSpeed + (acc.isRunning ? player.vx * 0.16 : 0),
      vy: finalDirY * curveSpeed + (acc.isRunning ? player.vy * 0.16 : 0),
      vz: 2.2 + power * 1.4,
      spin: curlDir * 6.5,
      spinY: 1.0,
      isAirborne: true,
      isOverpowered: false,
      isSpecialCurve: true,
      isChipped: false,
      bannerMessage: acc.isDefenderTouching
        ? 'CURVED THROUGH-BALL UNDER PRESSURE (-50% ACCURACY)'
        : 'CURVED SWERVING THROUGH-BALL! [Q]',
      isRadarTelemetry: hasStatBreak,
      statBreakTrait: hasStatBreak ? 'Radar Telemetry Switch' : undefined,
    };
  }

  // Phase 7.1: Extended Flight Curve for Long Passes / Driven Through-Balls
  // 80–95 % power long passes from three-quarter pitch take flight and reach target in stride with pace
  const isDrivenAerial = dist > 320 || power >= 0.65;
  if (isDrivenAerial) {
    const longPassSpeed = (18.5 + power * 12.0) * (player.stats.shotPower / 4.4) * speedMultiplier;
    const distRatio = Math.min(1.0, dist / 1500);
    const vz = 2.4 + power * 2.0 + distRatio * 1.6;

    return {
      vx: finalDirX * longPassSpeed + (acc.isRunning ? player.vx * 0.18 : 0),
      vy: finalDirY * longPassSpeed + (acc.isRunning ? player.vy * 0.18 : 0),
      vz,
      spin: (Math.random() - 0.5) * 1.2,
      spinY: -1.2, // Backspin keeps ball in penetrating flight
      isAirborne: true,
      isOverpowered: false,
      isSpecialCurve: false,
      isChipped: false,
      bannerMessage: acc.isDefenderTouching
        ? 'DRIVEN LONG PASS UNDER PRESSURE (-50% ACCURACY)'
        : hasStatBreak
        ? '⚡ RADAR TELEMETRY SWITCH! [STAT BREAK]'
        : !isSuccess
        ? 'OVERHIT / STRAY LONG PASS!'
        : power >= 0.75
        ? 'LASER DRIVEN LONG BALL! (MAX VELOCITY)'
        : 'DRIVEN LONG PASS INTO SPACE!',
      isRadarTelemetry: hasStatBreak,
      statBreakTrait: hasStatBreak ? 'Radar Telemetry Switch' : undefined,
    };
  }

  // Standard crisp ground through-ball for short-to-medium distances
  const groundSpeed = (14.0 + power * 6.0) * speedMultiplier;
  return {
    vx: finalDirX * groundSpeed + (acc.isRunning ? player.vx * 0.18 : 0),
    vy: finalDirY * groundSpeed + (acc.isRunning ? player.vy * 0.18 : 0),
    vz: 0,
    spin: (Math.random() - 0.5) * 1.0,
    spinY: 0,
    isAirborne: false,
    isOverpowered: false,
    isSpecialCurve: false,
    isChipped: false,
    bannerMessage: acc.isDefenderTouching
      ? 'DRIVEN THROUGH-BALL UNDER PRESSURE (-50% ACCURACY)'
      : hasStatBreak
      ? '⚡ RADAR TELEMETRY SWITCH! [STAT BREAK]'
      : !isSuccess
      ? 'OVERHIT / STRAY THROUGH-BALL!'
      : power >= 0.75
      ? 'ROCKET DRIVEN THROUGH-BALL! (MAX VELOCITY)'
      : 'DRIVEN THROUGH-BALL INTO SPACE!',
    isRadarTelemetry: hasStatBreak,
    statBreakTrait: hasStatBreak ? 'Radar Telemetry Switch' : undefined,
  };
}

/**
 * Phase 6.2 & Phase 7.2 Canonical Cross Trajectory (D / Blue C Button) & Automatic Cambio de Frente
 * Governed by Crossing (CRO), Composure (CMP), Match Stakes (W), pressure, and fatigue
 * Stat Break (>99): Guided Whip with extreme dipping Magnus curvature
 * Phase 7.2: High-power cross aimed from one wing toward opposite flank is interpreted as flat switch
 */
export function calculateCrossPhysics(
  player: Player,
  targetBoxX: number,
  targetBoxY: number,
  power: number,
  isSpecial: boolean,
  isChip: boolean,
  acc: KickAccuracyInfo,
  stakeFactor: number = 0,
  isFieldSwitchOverride?: boolean
): TrajectoryResult {
  const fromLeftWing = player.x < PITCH_CONFIG.CENTER_X - 110;
  const fromRightWing = player.x > PITCH_CONFIG.CENTER_X + 110;
  const aimingOppositeWing = (fromLeftWing && targetBoxX > PITCH_CONFIG.CENTER_X + 80) ||
                             (fromRightWing && targetBoxX < PITCH_CONFIG.CENTER_X - 80);
  const isFieldSwitch = isFieldSwitchOverride || (aimingOppositeWing && (power >= 0.55 || Math.abs(targetBoxX - player.x) > 420));

  // Retrieve canonical attributes
  const cro = player.canonicalStats && 'cro' in player.canonicalStats ? player.canonicalStats.cro : 75;
  const cmp = player.canonicalStats && 'cmp' in player.canonicalStats ? player.canonicalStats.cmp : 70;
  const baseSuccess = calculateCrossSuccessRate(cro, cmp, stakeFactor);

  // Phase 6.2: Strictly stat-driven crossing accuracy
  const fatiguePenalty = (acc.fatigueFactor - 1.0) * 0.22;
  const pressurePenalty = acc.pressureIntensity * 0.12;
  const statDrivenRate = Math.max(0.02, baseSuccess - fatiguePenalty - pressurePenalty);
  const effectiveSuccess = Math.min(0.98, Math.max(0.02, statDrivenRate / (acc.errorSpreadMultiplier * (acc.difficultyMultiplier || 1.0))));
  const isSuccess = Math.random() < effectiveSuccess;
  const hasStatBreak = isStatBreak(cro);

  if (power >= 0.96) {
    // Overpowered Cross: blasts out into far touchline/stands
    const overSpeed = 28.5;
    const overX = fromLeftWing ? PITCH_CONFIG.PITCH_RIGHT + 160 : PITCH_CONFIG.PITCH_LEFT - 160;
    const odx = overX - player.x;
    const ody = targetBoxY - player.y;
    const odist = Math.hypot(odx, ody) || 1;
    return {
      vx: (odx / odist) * overSpeed,
      vy: (ody / odist) * overSpeed,
      vz: 8.5,
      spin: isSpecial ? (fromLeftWing ? 8.2 : -8.2) : (fromLeftWing ? 4.5 : -4.5),
      spinY: 0,
      isAirborne: true,
      isOverpowered: true,
      isSpecialCurve: isSpecial,
      isChipped: false,
      bannerMessage: isSpecial
        ? 'VIOLENT HOOK CROSS INTO FAR STANDS!'
        : 'OVERHIT CROSS! OUT TO THE STANDS! (BURGUNDY)',
    };
  }

  let finalTargetX = targetBoxX;
  let finalTargetY = targetBoxY;

  if (!isSuccess && !hasStatBreak) {
    const errorMagnitude = (1.0 - effectiveSuccess) * (acc.difficultyMultiplier || 1.0);
    const errorX = (Math.random() - 0.5) * (65 + errorMagnitude * 40);
    const errorY = (Math.random() - 0.5) * (45 + errorMagnitude * 35);
    finalTargetX += errorX;
    finalTargetY += errorY;
  }

  const dx = finalTargetX - player.x;
  const dy = finalTargetY - player.y;
  const dist = Math.hypot(dx, dy) || 1;

  if (isFieldSwitch) {
    // Phase 7.2: CAMBIO DE FRENTE: Flat driven cross-field diagonal switch across to the opposite flank
    // Full flight velocity is maintained; distance does NOT kill pace
    const switchSpeed = (21.5 + power * 12.0) * (player.stats.shotPower / 4.4);
    const vx = (dx / dist) * switchSpeed + (acc.isRunning ? player.vx * 0.16 : 0);
    const vy = (dy / dist) * switchSpeed + (acc.isRunning ? player.vy * 0.16 : 0);
    const vz = isChip ? (4.8 + power * 1.6) : (2.4 + power * 1.4); // Flat, driven trajectory
    const spin = isSpecial ? (fromLeftWing ? 7.8 : -7.8) : (fromLeftWing ? 3.0 : -3.0);
    const spinY = isChip ? -1.8 : 0.6;

    let banner = 'CAMBIO DE FRENTE! (DRIVEN CROSS-FIELD SWITCH)';
    if (hasStatBreak) banner = '⚡ RADAR SWITCH! [STAT BREAK CAMBIO DE FRENTE]';
    else if (isSpecial) banner = '⚡ BENDING CAMBIO DE FRENTE! [Q SPECIAL]';
    else if (isChip) banner = 'FLOATING CAMBIO DE FRENTE! [E CHIP]';

    return {
      vx,
      vy,
      vz,
      spin,
      spinY,
      isAirborne: true,
      isOverpowered: false,
      isSpecialCurve: isSpecial,
      isChipped: isChip,
      bannerMessage: banner,
      isGuidedWhip: hasStatBreak,
      statBreakTrait: hasStatBreak ? 'Radar Switch' : undefined,
    };
  }

  if (isChip) {
    // ⚡ CHIPPED CROSS: High floating aerial cross with maximum hang-time; drops onto far-post runners
    const chipSpeed = (13.5 + power * 4.5) * (player.stats.shotPower / 4.4);
    return {
      vx: (dx / dist) * chipSpeed + (acc.isRunning ? player.vx * 0.15 : 0),
      vy: (dy / dist) * chipSpeed + (acc.isRunning ? player.vy * 0.15 : 0),
      vz: 5.6 + power * 1.2, // High floating hang-time for headers
      spin: fromLeftWing ? 2.0 : -2.0,
      spinY: -1.8, // soft float landing in 6-yard box
      isAirborne: true,
      isOverpowered: false,
      isSpecialCurve: false,
      isChipped: true,
      chipType: 'cross',
      bannerMessage: acc.isDefenderTouching
        ? 'CHIPPED CROSS UNDER PRESSURE (-50% ACCURACY)'
        : hasStatBreak
        ? '⚡ GUIDED DIPPING WHIP CROSS! [STAT BREAK]'
        : 'HIGH FLOATING CHIPPED CROSS! [E]',
      isGuidedWhip: hasStatBreak,
      statBreakTrait: hasStatBreak ? 'Guided Whip' : undefined,
    };
  }

  // Whipped delivery into dangerous box corridor
  const speed = (16.8 + power * 8.5) * (player.stats.shotPower / 4.5);
  const vx = (dx / dist) * speed + (acc.isRunning ? player.vx * 0.16 : 0);
  const vy = (dy / dist) * speed + (acc.isRunning ? player.vy * 0.16 : 0);
  const vz = 3.8 + power * 1.8;

  let spin = fromLeftWing ? 3.8 : -3.8;
  if (hasStatBreak) spin = fromLeftWing ? 8.5 : -8.5; // Guided whip dipping curve
  else if (isSpecial) spin = fromLeftWing ? 6.8 : -6.8;

  let banner = 'WHIPPED DANGEROUS CROSS INTO BOX!';
  if (hasStatBreak) banner = '⚡ GUIDED WHIP DIPPING CROSS! [STAT BREAK]';
  else if (isSpecial) banner = 'BENDING BANANA CROSS! [Q]';
  else if (!isSuccess) banner = 'DRIFTING UNACCURATE CROSS!';
  else if (power >= 0.75) banner = 'POWERFUL WHIPPED CROSS! (RED MAX)';
  if (acc.isDefenderTouching && isSuccess) banner = 'CROSS UNDER DEFENDER PRESSURE (-50% ACCURACY)';

  return {
    vx,
    vy,
    vz,
    spin,
    spinY: 1.8,
    isAirborne: true,
    isOverpowered: false,
    isSpecialCurve: isSpecial,
    isChipped: false,
    bannerMessage: banner,
    isGuidedWhip: hasStatBreak,
    statBreakTrait: hasStatBreak ? 'Guided Whip' : undefined,
  };
}

/**
 * Phase 6.2 & Phase 7.1 Canonical Shot Trajectory (A / Orange S Button) & ⚡ Chip Shot (E + A)
 * Inside Box: P_shoot(SHO) [10% at 40 -> 95% at 99 -> 98% Break]
 * Outside Box: P_long_shoot(LSH, D_box)
 * Governed strictly by attributes + pressure + fatigue + difficulty multiplier.
 * Phase 7.1: 80–95 % power shots from three-quarter pitch reach penalty area / goal with remaining pace.
 * Aerodynamic drag is realistic; distance makes aiming harder, it does not kill velocity.
 */
export function calculateShotPhysics(
  player: Player,
  targetGoalY: number,
  aimX: number,
  power: number,
  isSpecial: boolean,
  isChip: boolean,
  acc: KickAccuracyInfo,
  stakeFactor: number = 0
): TrajectoryResult {
  const isHome = player.team === 'home';
  const boxTop = PITCH_CONFIG.PITCH_TOP + 140;
  const boxBottom = PITCH_CONFIG.PITCH_BOTTOM - 140;
  const isInBox = isHome ? player.y <= boxTop : player.y >= boxBottom;

  // Retrieve canonical attributes
  const sho = player.canonicalStats && 'sho' in player.canonicalStats ? player.canonicalStats.sho : 75;
  const lsh = player.canonicalStats && 'lsh' in player.canonicalStats ? player.canonicalStats.lsh : 72;
  const cmp = player.canonicalStats && 'cmp' in player.canonicalStats ? player.canonicalStats.cmp : 70;

  let successRate: number;
  const distOutsidePx = isHome ? Math.max(0, player.y - boxTop) : Math.max(0, boxBottom - player.y);
  if (isInBox) {
    successRate = calculateInsideBoxShotAccuracy(sho, cmp, stakeFactor);
  } else {
    const distMeters = distOutsidePx / 8.5; // ~8.5 field px per meter
    successRate = calculateLongShotAccuracy(lsh, distMeters, cmp, stakeFactor);
  }

  // Phase 6.2: Strictly stat-driven shooting accuracy
  const fatiguePenalty = (acc.fatigueFactor - 1.0) * 0.22;
  const pressurePenalty = acc.pressureIntensity * 0.12;
  const statDrivenRate = Math.max(0.02, successRate - fatiguePenalty - pressurePenalty);
  const effectiveSuccess = Math.min(0.99, Math.max(0.02, statDrivenRate / (acc.errorSpreadMultiplier * (acc.difficultyMultiplier || 1.0))));
  const isSuccess = Math.random() < effectiveSuccess;
  const hasStatBreak = isInBox ? isStatBreak(sho) : isStatBreak(lsh);

  if (power >= 0.96) {
    // Overpowered: Blasted over crossbar into the grandstands (only at 96%+ burgundy max)
    const blastSpeed = 33.0 + Math.random() * 3.5;
    const dx = aimX - player.x;
    const dy = targetGoalY - player.y;
    const dist = Math.hypot(dx, dy) || 1;
    return {
      vx: (dx / dist) * blastSpeed,
      vy: (dy / dist) * blastSpeed,
      vz: 9.8,
      spin: isSpecial ? (player.x < PITCH_CONFIG.CENTER_X ? 8.5 : -8.5) : (Math.random() - 0.5) * 3.0,
      spinY: 0,
      isAirborne: true,
      isOverpowered: true,
      isSpecialCurve: isSpecial,
      isChipped: isChip,
      chipType: isChip ? 'shot' : undefined,
      bannerMessage: isSpecial
        ? 'VIOLENT SWERVE INTO THE STANDS! (OVERHIT)'
        : isChip
        ? 'OVERCOOKED CHIP OVER THE CROSSBAR! (BURGUNDY)'
        : 'BLASTED INTO THE STANDS! (OVERHIT)',
    };
  }

  // Phase 7.1: Distance makes aiming harder; distance does NOT kill strike velocity!
  let targetX = aimX;
  if (!isSuccess && !hasStatBreak) {
    const distFactor = Math.min(2.8, 1.0 + (distOutsidePx / 420));
    const errorMagnitude = (1.0 - effectiveSuccess) * (acc.difficultyMultiplier || 1.0);
    const errorSpread = (Math.random() - 0.5) * (80 * distFactor * (0.35 + errorMagnitude * 0.65));
    targetX += errorSpread;
  } else {
    // Precision strike within +- 2 degrees
    targetX += (Math.random() - 0.5) * 10;
  }

  const dx = targetX - player.x;
  const dy = targetGoalY - player.y;
  const dist = Math.hypot(dx, dy) || 1;

  if (isChip) {
    // ⚡ CHIP SHOT (E + A): Delicate dink scoop lifting cleanly over a rushing Goalkeeper's hands into net with soft backspin
    let chipSpeed = (11.5 + power * 4.2) * (player.stats.shotPower / 4.4);
    if (acc.isDefenderTouching) chipSpeed *= 0.90;

    return {
      vx: (dx / dist) * chipSpeed + (acc.isRunning ? player.vx * 0.14 : 0),
      vy: (dy / dist) * chipSpeed + (acc.isRunning ? player.vy * 0.14 : 0),
      vz: 4.8 + power * 1.2, // lifts over goalkeeper diving reach
      spin: 0,
      spinY: -2.4, // pronounced backspin checks up softly on bounce
      isAirborne: true,
      isOverpowered: false,
      isSpecialCurve: false,
      isChipped: true,
      chipType: 'shot',
      bannerMessage: acc.isDefenderTouching
        ? 'CHIP SHOT UNDER DEFENDER PRESSURE (-50% ACCURACY)'
        : hasStatBreak
        ? '⚡ SURGICAL CHIP OVER GOALKEEPER! [STAT BREAK]'
        : 'DELICATE CHIP OVER GOALKEEPER! [E]',
    };
  }

  // Phase 7.1: High-velocity strike aimed toward corners/side netting
  // 80–95 % power shots from three-quarter pitch (1200 - 1600 px away) reach the penalty area / goal with remaining pace!
  let baseShotSpeed = isInBox ? (20.0 + power * 14.0) : (23.5 + power * 15.0);
  let shotSpeed = baseShotSpeed * (player.stats.shotPower / 4.4);
  const isThunderbolt = !isInBox && hasStatBreak;
  const isDeadlyAssassin = isInBox && hasStatBreak;

  if (isThunderbolt) {
    // ⚡ Thunderbolt Cannon: Supersonic ball velocity (34+ px/f), audible sonic crack
    shotSpeed = Math.min(38.0, Math.max(32.0, shotSpeed * 1.36));
    audio.playSonicCrack();
  } else if (isDeadlyAssassin) {
    shotSpeed *= 1.15;
    audio.playStatBreakChime();
  } else if (hasStatBreak) {
    shotSpeed *= 1.12;
    audio.playStatBreakChime();
  }

  if (acc.isDefenderTouching) shotSpeed *= 0.90;

  const vx = (dx / dist) * shotSpeed + (acc.isRunning ? player.vx * 0.16 : 0);
  const vy = (dy / dist) * shotSpeed + (acc.isRunning ? player.vy * 0.16 : 0);

  // Phase 7.1: Calibrate vertical launch angle and backspin lift for long-distance carrying trajectory
  const distRatio = Math.min(1.0, dist / 1600);
  const vz = 1.8 + power * 2.2 + distRatio * (1.8 + power * 2.0);

  let spin = 0;
  if (isThunderbolt) {
    spin = (Math.random() - 0.5) * 5.0; // Erratic knuckleball wobble
  } else if (isSpecial) {
    spin = player.x < PITCH_CONFIG.CENTER_X ? 5.2 : -5.2;
  } else if (player.x < PITCH_CONFIG.CENTER_X - 50) {
    spin = 2.6;
  } else if (player.x > PITCH_CONFIG.CENTER_X + 50) {
    spin = -2.6;
  } else {
    spin = (Math.random() - 0.5) * 1.5;
  }

  let banner = `${player.name.toUpperCase()} STRIKES!`;
  if (isThunderbolt) {
    banner = `⚡ THUNDERBOLT CANNON FROM ${player.name.toUpperCase()}! [STAT BREAK]`;
  } else if (isDeadlyAssassin) {
    banner = `⚡ DEADLY ASSASSIN FINISH FROM ${player.name.toUpperCase()}! [STAT BREAK]`;
  } else if (isSpecial) {
    banner = 'BANANA BEND STRIKE! [Q SPECIAL]';
  } else if (!isInBox) {
    banner = isSuccess ? 'THUMPING LONG RANGE STRIKE ON TARGET!' : 'LONG SHOT DISPERSED WIDE!';
  } else if (power >= 0.75) {
    banner = acc.isStanding ? 'CLEAN POWER STRIKE! (HIGH ACCURACY)' : 'ROCKET STRIKE ON THE RUN!';
  }
  if (acc.isDefenderTouching && isSuccess) banner = 'SHOT UNDER DEFENDER PRESSURE (-50% ACCURACY)';

  return {
    vx,
    vy,
    vz,
    spin,
    spinY: -1.2, // Pronounced backspin provides aerodynamic lift during high-speed flight
    isAirborne: true,
    isOverpowered: false,
    isSpecialCurve: isSpecial,
    isChipped: false,
    bannerMessage: banner,
    isThunderbolt,
    isDeadlyAssassin,
    statBreakTrait: isThunderbolt ? 'Thunderbolt Cannon' : isDeadlyAssassin ? 'Deadly Assassin' : undefined,
  };
}

/**
 * Phase 9.1: Ball Drop-Zone & Trajectory Prediction
 * Simulates aerodynamic ballistic flight forward in time to project the landing zone
 * where the airborne ball descends back to target height targetZ (default 0 for turf, or ~14 for head height).
 * Pre-allocated zero-heap integration loop.
 */
export interface BallDropZoneResult {
  landingX: number;
  landingY: number;
  timeToLand: number; // frames until reaching targetZ
  apexZ: number;
  isAirborne: boolean;
  landingSpeed: number;
}

export function calculateBallDropZone(
  ball: Ball,
  targetZ: number = 0,
  maxSimFrames: number = 150
): BallDropZoneResult {
  // If ball is on ground or stationary
  if (!ball.isAirborne && ball.z <= targetZ && ball.vz <= 0.2) {
    return {
      landingX: ball.x,
      landingY: ball.y,
      timeToLand: 0,
      apexZ: ball.z,
      isAirborne: false,
      landingSpeed: Math.hypot(ball.vx, ball.vy),
    };
  }

  let simX = ball.x;
  let simY = ball.y;
  let simZ = ball.z;
  let simVx = ball.vx;
  let simVy = ball.vy;
  let simVz = ball.vz;
  let simSpin = ball.spin || 0;
  let simSpinY = ball.spinY || 0;
  let apexZ = simZ;
  let frameCount = 0;

  // Simulate trajectory step by step
  for (let f = 1; f <= maxSimFrames; f++) {
    const horizSpeed = Math.hypot(simVx, simVy);
    const totalSpeed = Math.hypot(horizSpeed, simVz);

    // Magnus curve
    if (!ball.isKnuckle && Math.abs(simSpin) > 0.05 && horizSpeed > 0.5) {
      const coeff = ball.isSpecialCurve ? 0.0026 : 0.0016;
      const lateralAccel = Math.min(0.55, Math.abs(simSpin) * coeff * horizSpeed);
      const spinSign = Math.sign(simSpin);
      const defX = (-simVy / horizSpeed) * lateralAccel * spinSign;
      const defY = (simVx / horizSpeed) * lateralAccel * spinSign;
      simVx += defX;
      simVy += defY * 0.4;
      simSpin *= BALL_AERO.SPIN_DECAY;
    }

    // Backspin lift / topspin dip
    if (!ball.isKnuckle && simSpinY && Math.abs(simSpinY) > 0.05 && horizSpeed > 1.0) {
      const aeroLift = -simSpinY * BALL_AERO.LIFT_COEFF * horizSpeed;
      simVz += aeroLift;
      simSpinY *= BALL_AERO.SPIN_DECAY;
    }

    // Gravity
    simVz -= PHYSICS.GRAVITY;

    // Air drag
    let currentAirDrag = PHYSICS.BALL_AIR_DRAG;
    if (totalSpeed > 16.0) {
      currentAirDrag = Math.min(0.9984, currentAirDrag + 0.0012);
    } else {
      currentAirDrag = Math.max(0.993, currentAirDrag - totalSpeed * 0.00012);
    }
    simVx *= currentAirDrag;
    simVy *= currentAirDrag;
    simVz *= currentAirDrag;

    simX += simVx;
    simY += simVy;
    simZ += simVz;

    if (simZ > apexZ) {
      apexZ = simZ;
    }

    // Check if ball has descended to or below target height
    if (simZ <= targetZ && simVz <= 0) {
      frameCount = f;
      // Clamp to pitch boundaries
      const clampedX = Math.max(PITCH_CONFIG.PITCH_LEFT, Math.min(PITCH_CONFIG.PITCH_RIGHT, simX));
      const clampedY = Math.max(PITCH_CONFIG.PITCH_TOP, Math.min(PITCH_CONFIG.PITCH_BOTTOM, simY));
      return {
        landingX: clampedX,
        landingY: clampedY,
        timeToLand: frameCount,
        apexZ,
        isAirborne: true,
        landingSpeed: Math.hypot(simVx, simVy),
      };
    }
  }

  // If simulation ran out without descending (e.g. flat or overpowered ball):
  const clampedX = Math.max(PITCH_CONFIG.PITCH_LEFT, Math.min(PITCH_CONFIG.PITCH_RIGHT, simX));
  const clampedY = Math.max(PITCH_CONFIG.PITCH_TOP, Math.min(PITCH_CONFIG.PITCH_BOTTOM, simY));
  return {
    landingX: clampedX,
    landingY: clampedY,
    timeToLand: maxSimFrames,
    apexZ,
    isAirborne: true,
    landingSpeed: Math.hypot(simVx, simVy),
  };
}
