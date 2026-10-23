/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 9 Unit Tests: Aerial Anticipation, Headers, Volleys & Rebound Reflexes
 *
 * Verifies:
 * 1. Drop-Zone Prediction (9.1):
 *    - calculateBallDropZone forward aerodynamic trajectory projection.
 *    - Correct timeToLand, landingX/Y coordinates, and apex height.
 *    - Difference between head-height target (targetZ = 13) vs ground target (targetZ = 0).
 * 2. Aerial Awareness & Reading Latency (9.1):
 *    - calculateAerialAwarenessDelay scales strictly with Positioning (POS) and DifficultyLevel.
 *    - Stat-break POS (> 99) yields immediate 0-frame latency.
 * 3. Defensive Aerial Interception Bias (9.1):
 *    - calculateAerialInterceptionBias scales with Interceptions (INT).
 *    - Sixth Sense breakthrough (INT > 99) provides 40px anticipation cut-off lead.
 * 4. Aerial Timing Windows & Contact Evaluation (9.2):
 *    - calculateAerialTimingWindow scales sweet-spot and reach with REA and HEA/SHO.
 *    - evaluateAerialContactQuality accurately distinguishes 'sweet_spot', 'acceptable', and 'mistimed'.
 * 5. Rebound & Second-Ball Reflexes (9.3):
 *    - calculateSecondBallReactionDelay scales with Reflexes (REA) and DifficultyLevel.
 *    - Higher difficulty AI (Legend/Elite) reacts with significantly faster latency.
 *    - Instant Synapse Stat Break (REA > 99) yields 0 frames reaction lag.
 * 6. Aerial Duel Contest Resolution (9.2):
 *    - resolveAerialContest weights STR, HEA, and REA to determine duel winner.
 * 7. Procedural Header & Volley Style Resolution (9.2):
 *    - resolveHeaderStyle: bullet, diving, glancing, clearance.
 *    - resolveVolleyStyle: half-volley, side volley, diving volley, bicycle/scissor kick.
 */

import {
  calculateBallDropZone,
} from '../ballPhysics';
import {
  calculateAerialAwarenessDelay,
  calculateAerialInterceptionBias,
  calculateAerialTimingWindow,
  evaluateAerialContactQuality,
  calculateSecondBallReactionDelay,
} from '../playerStats';
import { animationEngine } from '../animationEngine';
import { Player, Ball, PlayerRole, CanonicalOutfieldStats } from '../../types';
import { PITCH_CONFIG } from '../constants';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failedTests++;
  }
}

function createMockPlayer(stats: {
  hea?: number;
  sho?: number;
  rea?: number;
  pos?: number;
  int?: number;
  str?: number;
  role?: PlayerRole;
  primaryPos?: 'GK' | 'DEF' | 'MID' | 'ATT';
}): Player {
  const canonical: CanonicalOutfieldStats = {
    pac: 80,
    sta: 80,
    str: stats.str ?? 75,
    bcl: 75,
    ret: 75,
    dri: 75,
    spa: 75,
    lpa: 70,
    cro: 70,
    sho: stats.sho ?? 75,
    hea: stats.hea ?? 75,
    lsh: 70,
    tck: 60,
    sld: 60,
    int: stats.int ?? 70,
    mrk: 65,
    pos: stats.pos ?? 75,
    cmp: 75,
    rea: stats.rea ?? 75,
  };

  return {
    id: `mock_player_${Math.random()}`,
    name: 'Mock Player',
    number: 9,
    team: 'home',
    role: stats.role || ('ST1' as PlayerRole),
    primaryPos: stats.primaryPos || 'ATT',
    x: 500,
    y: 500,
    vx: 0,
    vy: 0,
    targetX: 500,
    targetY: 500,
    baseX: 0.5,
    baseY: 0.5,
    facingAngle: -Math.PI / 2,
    facingDir: 'up',
    stats: {
      speed: 3.5,
      sprintSpeed: 4.5,
      shotPower: 4.5,
      passing: 4.0,
      tackling: 3.5,
      heading: 4.0,
    },
    canonicalStats: canonical,
    appearance: {
      heightCm: 180,
      weightKg: 75,
      muscleMass: 3,
      skinTone: '#f1c27d',
      hairStyle: 'buzzcut',
      hairColor: '#000',
    },
    action: 'idle',
    actionTimer: 0,
    stamina: 100,
    hasYellowCard: false,
    isRedCarded: false,
    animFrame: 0,
    animTimer: 0,
    isUserControlled: true,
    slideVelocityX: 0,
    slideVelocityY: 0,
    diveX: 0,
    diveY: 0,
  };
}

function createMockBall(overrides: Partial<Ball> = {}): Ball {
  return {
    x: PITCH_CONFIG.CENTER_X,
    y: PITCH_CONFIG.CENTER_Y,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    spin: 0,
    ownerId: null,
    lastTouchTeam: 'home',
    lastTouchPlayerId: null,
    isAirborne: false,
    ...overrides,
  };
}

console.log('--- RUNNING PHASE 9 AERIAL ANTICIPATION & REBOUND REFLEXES TESTS ---');

// =========================================================================
// TEST GROUP 1: Drop-Zone Simulation & Aerodynamic Forward Projection (9.1)
// =========================================================================
console.log('\n[TEST GROUP 1: Drop-Zone Simulation & Trajectory Prediction]');

// 1.1 Grounded stationary ball returns immediate position
const groundBall = createMockBall({ x: 400, y: 600, z: 0, isAirborne: false, vz: 0 });
const groundDrop = calculateBallDropZone(groundBall, 0);
assert(groundDrop.timeToLand === 0, 'Stationary ground ball has timeToLand = 0');
assert(groundDrop.landingX === 400 && groundDrop.landingY === 600, 'Stationary ground ball landing coords match current position');
assert(groundDrop.isAirborne === false, 'Grounded ball isAirborne is false');

// 1.2 Airborne cross in flight
const crossBall = createMockBall({
  x: 300,
  y: 700,
  z: 10,
  vx: 5.5,
  vy: -8.0,
  vz: 6.2,
  isAirborne: true,
});
const crossDropTurf = calculateBallDropZone(crossBall, 0);
assert(crossDropTurf.timeToLand > 15, `Airborne cross timeToLand is positive and realistic (${crossDropTurf.timeToLand} frames)`);
assert(crossDropTurf.landingY < 700, `Cross moving upwards (vy < 0) lands upfield (Y = ${crossDropTurf.landingY.toFixed(1)} < 700)`);
assert(crossDropTurf.landingX > 300, `Cross moving rightwards (vx > 0) lands to right (X = ${crossDropTurf.landingX.toFixed(1)} > 300)`);
assert(crossDropTurf.apexZ > 10, `Apex height is higher than initial launch height (apexZ = ${crossDropTurf.apexZ.toFixed(1)} > 10)`);

// 1.3 Head-height prediction (targetZ = 13) lands earlier than turf prediction (targetZ = 0)
const crossDropHead = calculateBallDropZone(crossBall, 13);
assert(crossDropHead.timeToLand < crossDropTurf.timeToLand,
  `Head height target (Z = 13) arrives earlier (${crossDropHead.timeToLand} frames) than turf ground landing (${crossDropTurf.timeToLand} frames)`);

// 1.4 Boundary clamping
const rocketBall = createMockBall({
  x: 500,
  y: 300,
  z: 5,
  vx: 40.0,
  vy: -30.0,
  vz: 8.0,
  isAirborne: true,
});
const rocketDrop = calculateBallDropZone(rocketBall, 0, 100);
assert(rocketDrop.landingX <= PITCH_CONFIG.PITCH_RIGHT && rocketDrop.landingX >= PITCH_CONFIG.PITCH_LEFT,
  `Out of bounds trajectory landingX is clamped within pitch boundary (${rocketDrop.landingX})`);
assert(rocketDrop.landingY >= PITCH_CONFIG.PITCH_TOP && rocketDrop.landingY <= PITCH_CONFIG.PITCH_BOTTOM,
  `Out of bounds trajectory landingY is clamped within pitch boundary (${rocketDrop.landingY})`);

// =========================================================================
// TEST GROUP 2: Positioning (POS) — Aerial Awareness Delay & INT Bias (9.1)
// =========================================================================
console.log('\n[TEST GROUP 2: Aerial Awareness Delay & Interception Bias]');

// 2.1 High POS vs Low POS awareness delay
const delayLowPOS = calculateAerialAwarenessDelay(50, 'normal');
const delayHighPOS = calculateAerialAwarenessDelay(90, 'normal');
const delayElitePOS = calculateAerialAwarenessDelay(99, 'normal');
const delayStatBreakPOS = calculateAerialAwarenessDelay(102, 'normal');

assert(delayLowPOS > delayHighPOS, `Low POS (50) delay (${delayLowPOS}f) is greater than High POS (90) delay (${delayHighPOS}f)`);
assert(delayHighPOS > delayElitePOS, `High POS (90) delay (${delayHighPOS}f) is greater than Elite POS (99) delay (${delayElitePOS}f)`);
assert(delayStatBreakPOS === 0, `Stat-Break POS (102) has 0 frames delay (Instant Omnipresent anticipation)`);

// 2.2 Difficulty level modulation on awareness delay
const delayLegend = calculateAerialAwarenessDelay(80, 'legend');
const delayNormal = calculateAerialAwarenessDelay(80, 'normal');
const delayEasy = calculateAerialAwarenessDelay(80, 'easy');
const delayStanding = calculateAerialAwarenessDelay(80, 'standing');

assert(delayLegend < delayNormal, `Legend difficulty delay (${delayLegend}f) is faster than Normal (${delayNormal}f)`);
assert(delayNormal < delayEasy, `Normal difficulty delay (${delayNormal}f) is faster than Easy (${delayEasy}f)`);
assert(delayStanding === 999, 'Standing difficulty has 999 frames delay (no aerial tracking)');

// 2.3 Interceptions (INT) bias lead
const intBias50 = calculateAerialInterceptionBias(50);
const intBias85 = calculateAerialInterceptionBias(85);
const intBiasStatBreak = calculateAerialInterceptionBias(105);

assert(intBias85 > intBias50, `Higher INT (85) gives larger cut-off lead (${intBias85.toFixed(1)}px > ${intBias50.toFixed(1)}px)`);
assert(intBiasStatBreak === 40, `Stat-Break INT gives maximum 40px Sixth Sense breakthrough lead`);

// =========================================================================
// TEST GROUP 3: Aerial Timing Windows & Contact Quality (9.2)
// =========================================================================
console.log('\n[TEST GROUP 3: Aerial Timing Windows & Contact Quality]');

// 3.1 Header timing window comparison: High REA+HEA vs Low REA+HEA
const windowHeaderElite = calculateAerialTimingWindow(95, 95, false);
const windowHeaderAmateur = calculateAerialTimingWindow(50, 50, false);

assert(windowHeaderElite.maxReachDist > windowHeaderAmateur.maxReachDist,
  `Elite header reach (${windowHeaderElite.maxReachDist.toFixed(1)}px) exceeds amateur reach (${windowHeaderAmateur.maxReachDist.toFixed(1)}px)`);
assert((windowHeaderElite.sweetSpotZMax - windowHeaderElite.sweetSpotZMin) > (windowHeaderAmateur.sweetSpotZMax - windowHeaderAmateur.sweetSpotZMin),
  'Elite header sweet spot vertical window is broader and more forgiving than amateur');
assert(windowHeaderElite.powerMultiplier > windowHeaderAmateur.powerMultiplier,
  `Elite header power multiplier (${windowHeaderElite.powerMultiplier.toFixed(2)}) > amateur (${windowHeaderAmateur.powerMultiplier.toFixed(2)})`);

// 3.2 Volley timing window comparison
const windowVolleyElite = calculateAerialTimingWindow(92, 90, true);
const windowVolleyAmateur = calculateAerialTimingWindow(55, 55, true);

assert(windowVolleyElite.maxReachDist > windowVolleyAmateur.maxReachDist,
  `Elite volley reach (${windowVolleyElite.maxReachDist.toFixed(1)}px) exceeds amateur reach (${windowVolleyAmateur.maxReachDist.toFixed(1)}px)`);
assert(windowVolleyElite.sweetSpotZMax > windowVolleyAmateur.sweetSpotZMax,
  'Elite volley sweet spot extends to higher vertical elevations');

// 3.3 evaluateAerialContactQuality
// Test sweet spot contact
const qualitySweet = evaluateAerialContactQuality(18.0, 15.0, windowHeaderElite);
assert(qualitySweet === 'sweet_spot', `Ball at Z = 18 and dist = 15 is evaluated as 'sweet_spot'`);

// Test acceptable contact (e.g. ball high near upper boundary)
const qualityAcceptable = evaluateAerialContactQuality(34.0, 20.0, windowHeaderElite);
assert(qualityAcceptable === 'acceptable', `Ball at Z = 34 and dist = 20 is evaluated as 'acceptable'`);

// Test mistimed contact (too high or too far)
const qualityMistimedFar = evaluateAerialContactQuality(18.0, 60.0, windowHeaderElite);
assert(qualityMistimedFar === 'mistimed', `Ball at dist = 60px (beyond reach) is evaluated as 'mistimed'`);
const qualityMistimedHigh = evaluateAerialContactQuality(65.0, 15.0, windowHeaderElite);
assert(qualityMistimedHigh === 'mistimed', `Ball at Z = 65px (too high) is evaluated as 'mistimed'`);

// =========================================================================
// TEST GROUP 4: Rebound & Second-Ball Reflexes (9.3)
// =========================================================================
console.log('\n[TEST GROUP 4: Rebound & Second-Ball Reflexes]');

// 4.1 Reflexes (REA) scaling
const secondBallDelayLowREA = calculateSecondBallReactionDelay(50, 'normal');
const secondBallDelayHighREA = calculateSecondBallReactionDelay(90, 'normal');
const secondBallDelayStatBreak = calculateSecondBallReactionDelay(104, 'normal');

assert(secondBallDelayLowREA > secondBallDelayHighREA,
  `Low REA (50) second-ball delay (${secondBallDelayLowREA}f) > High REA (90) delay (${secondBallDelayHighREA}f)`);
assert(secondBallDelayStatBreak === 0, `Stat-Break REA (104) has 0 frames reaction lag (Instant Synapse)`);

// 4.2 Difficulty effect on second balls
const secondBallLegend = calculateSecondBallReactionDelay(80, 'legend');
const secondBallNormal = calculateSecondBallReactionDelay(80, 'normal');
const secondBallEasy = calculateSecondBallReactionDelay(80, 'easy');

assert(secondBallLegend < secondBallNormal,
  `Legend AI reacts faster to loose rebounds (${secondBallLegend}f) than Normal (${secondBallNormal}f)`);
assert(secondBallNormal < secondBallEasy,
  `Normal AI reacts faster to loose rebounds (${secondBallNormal}f) than Easy (${secondBallEasy}f)`);

// =========================================================================
// TEST GROUP 5: Contested Aerial Duels (9.2)
// =========================================================================
console.log('\n[TEST GROUP 5: Contested Aerial Duels]');

// Test aerial contest resolution: Dominant striker vs weak defender
let dominantStrikerWins = 0;
for (let i = 0; i < 30; i++) {
  const giantStriker = createMockPlayer({ hea: 95, str: 95, rea: 90 });
  const smallDefender = createMockPlayer({ hea: 55, str: 55, rea: 60, role: 'CB1', primaryPos: 'DEF' });
  const aerialBall = createMockBall({ z: 22, isAirborne: true });

  const duelRes = animationEngine.resolveAerialContest(giantStriker, smallDefender, aerialBall);
  if (duelRes.winner === giantStriker) {
    dominantStrikerWins++;
  }
}
assert(dominantStrikerWins >= 27, `Dominant aerial striker won ${dominantStrikerWins}/30 contested aerial duels (>= 90%)`);

// =========================================================================
// TEST GROUP 6: Procedural Header & Volley Style Resolution (9.2)
// =========================================================================
console.log('\n[TEST GROUP 6: Procedural Header & Volley Style Resolution]');

const striker = createMockPlayer({ hea: 85, sho: 85 });
const defender = createMockPlayer({ hea: 85, sho: 60, role: 'CB1', primaryPos: 'DEF' });

// 6.1 Headers
// Defensive clearance header
const clearanceHeader = animationEngine.resolveHeaderStyle(defender, createMockBall({ z: 20 }), 450, true);
assert(clearanceHeader === 'heading', `Defensive header clearance resolves to 'heading'`);

// Bullet header in the 18-yard box
const bulletHeader = animationEngine.resolveHeaderStyle(striker, createMockBall({ z: 20 }), 180, false);
assert(bulletHeader === 'bullet_header', `Close range header (< 240px to goal) resolves to 'bullet_header'`);

// Diving header on low-to-mid crosses in the box (8 <= z <= 18)
const divingHeader = animationEngine.resolveHeaderStyle(striker, createMockBall({ z: 12 }), 220, false);
assert(divingHeader === 'diving_header', `Low-to-mid cross (Z = 12, dist = 220) resolves to 'diving_header'`);

// 6.2 Volleys
// Defensive clearance volley
const clearanceVolley = animationEngine.resolveVolleyStyle(defender, createMockBall({ z: 8 }), 450, true);
assert(clearanceVolley === 'volley', `Defensive clearance volley resolves to 'volley'`);

// Half-volley off turf bounce (z <= 6.8)
const halfVolley = animationEngine.resolveVolleyStyle(striker, createMockBall({ z: 5.2 }), 200, false);
assert(halfVolley === 'half_volley', `Low ball off bounce (Z = 5.2) resolves to 'half_volley'`);

// High acrobatic overhead kick (z > 16.5)
const bicycleKick = animationEngine.resolveVolleyStyle(striker, createMockBall({ z: 19.0 }), 150, false);
assert(bicycleKick === 'bicycle_kick' || bicycleKick === 'scissor_kick',
  `High elevation ball (Z = 19.0) resolves to acrobatic strike ('${bicycleKick}')`);

// 6.3 Timing strike power & accuracy evaluation
const timingStrikeSweet = animationEngine.evaluateAerialTimingStrike(
  striker,
  createMockBall({ x: striker.x + 5, y: striker.y + 5, z: 18 }),
  false
);
assert(timingStrikeSweet.powerMultiplier > 1.0,
  `Sweet spot header delivers power multiplier > 1.0 (${timingStrikeSweet.powerMultiplier.toFixed(2)})`);
assert(timingStrikeSweet.accuracySpread <= 5,
  `Sweet spot header delivers pinpoint accuracy spread <= 5px (${timingStrikeSweet.accuracySpread}px)`);

// =========================================================================
// SUMMARY
// =========================================================================
console.log(`\n========================================`);
console.log(`PHASE 9 TEST SUMMARY: ${passedTests} passed, ${failedTests} failed`);
console.log(`========================================`);

if (failedTests > 0) {
  process.exit(1);
}
