/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 8 Unit Tests: Procedural Dribbling Animation Tiers, On-Ball Acceleration & Ginga Thresholds
 *
 * Verifies:
 * 1. Six Dribbling Animation Tiers (Amateur, Semi-Pro, Pro, Elite, World Class, Unique).
 * 2. On-Ball Physics Separation: Top speed (Pace) vs On-Ball Acceleration & Turn Radius (Dribbling + Ball Control).
 * 3. Ginga Thresholds:
 *    - Ineffective / high fumble failure below 70 BCL or 70 DRI.
 *    - Effective at 70+ BCL and 70+ DRI.
 *    - Highly reliable Master Class at 90+ BCL and 90+ DRI with explosive sombrero surge.
 * 4. Step-Over cycle speeds & body feint recovery timings scaled by Dribbling Tier.
 * 5. Touch distance / ball attachment offset scaled by tier.
 */

import {
  getDribblingTier,
  calculateOnBallAccelerationRamp,
  calculateOnBallTurnRate,
  calculateOnBallTopSpeed,
  calculateOffBallTopSpeed,
  getDribblingTouchOffset,
  getStepOverCycleSpeed,
} from '../playerStats';
import { animationEngine } from '../animationEngine';
import { updateGingaSystem } from '../ginga';
import { Player, Ball, KeyState } from '../../types';

function createMockPlayer(stats: { pac?: number; dri?: number; bcl?: number; str?: number }): Player {
  const pac = stats.pac ?? 75;
  const dri = stats.dri ?? 75;
  const bcl = stats.bcl ?? 75;
  const str = stats.str ?? 75;

  return {
    id: 'mock_player',
    name: 'Mock Player',
    number: 10,
    team: 'home',
    role: 'ST1',
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
    canonicalStats: {
      pac,
      sta: 85,
      str,
      bcl,
      ret: 80,
      dri,
      spa: 80,
      lpa: 80,
      cro: 80,
      sho: 85,
      hea: 80,
      lsh: 80,
      tck: 60,
      sld: 60,
      int: 60,
      mrk: 60,
      pos: 85,
      cmp: 80,
      rea: 85,
    },
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

function createMockBall(ownerId: string | null = null, x = 500, y = 500): Ball {
  return {
    x,
    y,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    spin: 0,
    spinY: 0,
    ownerId,
    isAirborne: false,
    lastTouchTeam: 'home',
    lastTouchPlayerId: ownerId,
    trail: [],
  };
}

function createEmptyKeys(): KeyState {
  return {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    Shift: false,
    KeyW: false,
    KeyA: false,
    KeyS: false,
    KeyD: false,
    KeyQ: false,
    KeyE: false,
    Space: false,
  };
}

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

console.log('--- RUNNING PHASE 8 DRIBBLING TIERS, ON-BALL LOCOMOTION & GINGA TESTS ---\n');

// =========================================================================
// TEST GROUP 1: Six Dribbling Animation Tiers (Section 8.1)
// =========================================================================
console.log('[TEST GROUP 1: Six Dribbling Animation Tiers]');
assert(getDribblingTier(45) === 'amateur', 'DRI 45 resolves to Amateur Tier');
assert(getDribblingTier(59) === 'amateur', 'DRI 59 resolves to Amateur Tier');
assert(getDribblingTier(60) === 'semi_pro', 'DRI 60 resolves to Semi-Pro Tier');
assert(getDribblingTier(69) === 'semi_pro', 'DRI 69 resolves to Semi-Pro Tier');
assert(getDribblingTier(70) === 'pro', 'DRI 70 resolves to Pro Tier');
assert(getDribblingTier(79) === 'pro', 'DRI 79 resolves to Pro Tier');
assert(getDribblingTier(80) === 'elite', 'DRI 80 resolves to Elite Tier');
assert(getDribblingTier(89) === 'elite', 'DRI 89 resolves to Elite Tier');
assert(getDribblingTier(90) === 'world_class', 'DRI 90 resolves to World Class Tier');
assert(getDribblingTier(99) === 'world_class', 'DRI 99 resolves to World Class Tier');
assert(getDribblingTier(100) === 'unique', 'DRI 100 resolves to Unique Tier (Stat Break)');
assert(getDribblingTier(105) === 'unique', 'DRI 105 resolves to Unique Tier (Stat Break)');

// Stride cadence differentiation in AnimationEngine
const pAmateur = createMockPlayer({ dri: 50 });
const pWorldClass = createMockPlayer({ dri: 95 });
pAmateur.vx = 2.0; pAmateur.vy = 0;
pWorldClass.vx = 2.0; pWorldClass.vy = 0;

animationEngine.updateCloseControlDribble(pAmateur, true, 1);
animationEngine.updateCloseControlDribble(pWorldClass, true, 1);

assert(animationEngine.resolveDribbleTier(pAmateur) === 'amateur', 'Player with DRI 50 resolves to Amateur in AnimationEngine');
assert(animationEngine.resolveDribbleTier(pWorldClass) === 'world_class', 'Player with DRI 95 resolves to World Class in AnimationEngine');

// Body feint recovery timing differentiation
animationEngine.triggerBodyFeint(pAmateur, 'left');
const amateurFeintTime = pAmateur.actionTimer;
animationEngine.triggerBodyFeint(pWorldClass, 'right');
const wcFeintTime = pWorldClass.actionTimer;

assert(amateurFeintTime === 22, `Amateur body feint takes ${amateurFeintTime} frames (heavy recovery)`);
assert(wcFeintTime === 10, `World Class body feint takes ${wcFeintTime} frames (lightning-fast recovery < 12 frames)`);

// =========================================================================
// TEST GROUP 2: On-Ball Physics Separation (Section 8.2)
// =========================================================================
console.log('\n[TEST GROUP 2: On-Ball Physics Separation]');
// Top speed still governed by Pace
const pFastPace = calculateOffBallTopSpeed(95);
const pSlowPace = calculateOffBallTopSpeed(50);
assert(pFastPace > pSlowPace, `Top speed governed by Pace: 95 PAC (${pFastPace.toFixed(2)}) > 50 PAC (${pSlowPace.toFixed(2)})`);

// Acceleration while on the ball governed by Dribbling + Ball Control
const accelAmateur = calculateOnBallAccelerationRamp(45, 45);
const accelPro = calculateOnBallAccelerationRamp(75, 75);
const accelWorldClass = calculateOnBallAccelerationRamp(95, 95);
const accelUnique = calculateOnBallAccelerationRamp(101, 95);

assert(accelAmateur < accelPro && accelPro < accelWorldClass, 'On-ball acceleration ramps smoothly: Amateur < Pro < World Class');
assert(accelUnique === 1.0, 'Unique Stat Break (100+ DRI) achieves instantaneous 1.0 acceleration');
assert(accelAmateur >= 0.20 && accelAmateur <= 0.35, `Amateur on-ball acceleration ramp is sluggish: ${accelAmateur.toFixed(2)}`);
assert(accelWorldClass >= 0.85, `World Class on-ball acceleration ramp is explosive: ${accelWorldClass.toFixed(2)} >= 0.85`);

// Turn radius / responsiveness governed by Dribbling + Ball Control
const turnAmateur = calculateOnBallTurnRate(45, 45);
const turnWorldClass = calculateOnBallTurnRate(95, 95);
assert(turnWorldClass > turnAmateur * 2.0, `World Class turns on a dime (${turnWorldClass.toFixed(2)}) vs Amateur heavy turning arc (${turnAmateur.toFixed(2)})`);

// Step-over cycle speed
const stepAmateur = getStepOverCycleSpeed('amateur');
const stepWorldClass = getStepOverCycleSpeed('world_class');
assert(stepWorldClass > stepAmateur * 2.0, `Step-over speed: World Class (${stepWorldClass}) is > 2x faster than Amateur (${stepAmateur})`);

// Ball attachment distance: Amateur pushes ball further out, World Class keeps it glued to boots
const touchAmateur = getDribblingTouchOffset('amateur');
const touchWorldClass = getDribblingTouchOffset('world_class');
const touchUnique = getDribblingTouchOffset('unique');
assert(touchAmateur > touchWorldClass, `Touch distance: Amateur (${touchAmateur}px) pushes ball further out than World Class (${touchWorldClass}px)`);
assert(touchUnique === 8, `Unique tier keeps ball glued tightly to cleats: ${touchUnique}px`);

// =========================================================================
// TEST GROUP 3: Ginga Thresholds (Section 8.3)
// =========================================================================
console.log('\n[TEST GROUP 3: Ginga Thresholds]');
// Below 70 BCL or DRI: High failure / fumble rate
let fumbles = 0;
let bannerMessage = '';
let lastFumbleBanner = '';
const mockBanner = (msg: string) => {
  bannerMessage = msg;
  if (msg.includes('GINGA FUMBLED') || msg.includes('FALLIDO')) {
    lastFumbleBanner = msg;
  }
};

// Run 20 Ginga lift release attempts for an Amateur player (BCL 50, DRI 50)
for (let i = 0; i < 20; i++) {
  const pSub = createMockPlayer({ bcl: 50, dri: 50 });
  const ball = createMockBall(pSub.id, pSub.x, pSub.y);
  pSub.isGingaLifting = true;
  pSub.gingaHoldTimer = 25;
  const keys = createEmptyKeys();

  updateGingaSystem(pSub, ball, keys, [], mockBanner);
  if (pSub.stumbleReason === 'Ginga Threshold') {
    fumbles++;
  }
}

assert(fumbles >= 12, `Sub-threshold player fumbled Ginga lift ${fumbles}/20 times (>= 60% failure rate)`);
assert(lastFumbleBanner.includes('GINGA FUMBLED'), `Banner shows correct fumble alert: "${lastFumbleBanner}"`);

// 70+ BCL and 70+ DRI: Qualified Ginga execution
const pQualified = createMockPlayer({ bcl: 75, dri: 75 });
const ballQual = createMockBall(pQualified.id, pQualified.x, pQualified.y);
pQualified.isGingaLifting = true;
pQualified.gingaHoldTimer = 30;
const keysQual = createEmptyKeys();
updateGingaSystem(pQualified, ballQual, keysQual, [], mockBanner);

assert(pQualified.gingaActive === true, 'Qualified player (75 BCL, 75 DRI) successfully lifted ball into Ginga juggling');
assert(ballQual.vz > 0, `Ball was lifted with upward velocity: vz = ${ballQual.vz.toFixed(2)}`);

// 90+ BCL and 90+ DRI: World Class Master Ginga Sombrero Surge
const pMaster = createMockPlayer({ bcl: 95, dri: 95 });
const ballMaster = createMockBall(pMaster.id, pMaster.x, pMaster.y);
pMaster.isGingaLifting = true;
pMaster.gingaHoldTimer = 35;
const keysSombrero = createEmptyKeys();
keysSombrero.ArrowUp = true; // Sombrero flick in up direction

updateGingaSystem(pMaster, ballMaster, keysSombrero, [], mockBanner);
assert(pMaster.action === 'sombrero', 'Master Ginga triggers sombrero flick');
assert(bannerMessage.includes('WORLD-CLASS GINGA') || bannerMessage.includes('SOMBRERO'), `Banner acknowledges World Class Master Ginga: "${bannerMessage}"`);
assert(pMaster.dashTimer >= 28, `Master player receives enhanced dash timer: ${pMaster.dashTimer} frames (>= 28)`);

// =========================================================================
// SUMMARY
// =========================================================================
console.log(`\n========================================`);
console.log(`PHASE 8 TEST SUMMARY: ${passedTests} passed, ${failedTests} failed`);
console.log(`========================================`);

if (failedTests > 0) {
  process.exit(1);
}
