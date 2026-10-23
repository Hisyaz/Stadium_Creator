/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 7 Unit Tests: True Long-Range Ball Flight, Cambio de Frente & Physics Polish
 * Verifies:
 * 1. 80–95 % power shots from 3/4 pitch reach the penalty area / goal with remaining pace.
 * 2. 80–95 % power long passes from 3/4 pitch take flight and reach target in stride.
 * 3. Aerodynamic drag crisis and backspin lift preserve piercing flight pace.
 * 4. Automatic "Cambio de Frente" cross-field switches with leading space vectors.
 * 5. Consistency with chip (E) and curve (Q) modifiers and stat break traits.
 */

import {
  calculateShotPhysics,
  calculateLongPassPhysics,
  calculateCrossPhysics,
  evaluateKickAccuracyInfo,
} from '../ballPhysics';
import { updateBallPhysics } from '../physics';
import { PITCH_CONFIG, PHYSICS } from '../constants';
import { Player, Ball } from '../../types';

function createMockPlayer(id: string, x: number, y: number, team: 'home' | 'away' = 'home'): Player {
  return {
    id,
    name: id,
    number: 9,
    team,
    role: 'ST1',
    x,
    y,
    vx: 0,
    vy: 0,
    targetX: x,
    targetY: y,
    baseX: 0.5,
    baseY: 0.5,
    facingAngle: -Math.PI / 2, // Upward toward top goal
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
      pac: 85, sta: 85, str: 80,
      bcl: 85, ret: 80, dri: 85,
      spa: 85, lpa: 85, cro: 85,
      sho: 88, hea: 80, lsh: 86,
      tck: 60, sld: 55, int: 60, mrk: 60,
      pos: 88, cmp: 85, rea: 85,
    },
    appearance: {
      heightCm: 185,
      weightKg: 80,
      muscleMass: 4,
      skinTone: '#f1c27d',
      hairStyle: 'short',
      hairColor: '#000',
      facialHair: 'clean',
      jerseyFit: 'tucked',
      sleeveLength: 'short',
    },
    action: 'idle',
    actionTimer: 0,
    stamina: 100,
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
}

function createMockBall(x: number, y: number, z: number = 0): Ball {
  return {
    x,
    y,
    z,
    vx: 0,
    vy: 0,
    vz: 0,
    spin: 0,
    spinY: 0,
    ownerId: null,
    isAirborne: false,
    lastTouchTeam: 'home',
    lastTouchPlayerId: null,
    trail: [],
  };
}

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failed++;
  }
}

console.log('--- RUNNING PHASE 7 BALL FLIGHT & PHYSICS TESTS ---');

// =========================================================================
// TEST GROUP 1: Long-Range Shots from Three-Quarter Pitch (80%–95% Power)
// =========================================================================
console.log('\n[TEST GROUP 1: 80-95% Power Shots from 3/4 Pitch]');
{
  // 3/4 pitch: Home player at y = PITCH_CONFIG.CENTER_Y + 300 (~1770), attacking top goal y = 220
  // Distance to top goal = 1550 px (~180 meters in simulation units)
  const shooter = createMockPlayer('shooter', PITCH_CONFIG.CENTER_X, PITCH_CONFIG.CENTER_Y + 300, 'home');
  const acc = evaluateKickAccuracyInfo(shooter, undefined, [shooter]);
  const targetGoalY = PITCH_CONFIG.PITCH_TOP;
  const aimX = PITCH_CONFIG.CENTER_X;

  const traj85 = calculateShotPhysics(shooter, targetGoalY, aimX, 0.85, false, false, acc);
  const shotSpeed = Math.hypot(traj85.vx, traj85.vy);

  assert(shotSpeed >= 32.0, `85% shot speed ${shotSpeed.toFixed(1)} px/f is blistering (> 32 px/f)`);
  assert(traj85.isAirborne === true, '85% shot is airborne');
  assert(traj85.vz >= 5.0, `85% shot vz ${traj85.vz.toFixed(1)} provides authentic carrying loft`);
  assert(traj85.spinY < 0, `85% shot has backspin (spinY = ${traj85.spinY}) for aerodynamic lift`);

  // Simulate ball flight using physics engine
  const ball = createMockBall(shooter.x, shooter.y, 0.5);
  ball.vx = traj85.vx;
  ball.vy = traj85.vy;
  ball.vz = traj85.vz;
  ball.spin = traj85.spin;
  ball.spinY = traj85.spinY;
  ball.isAirborne = true;

  let frames = 0;
  let reachedBox = false;
  let speedAtBox = 0;

  for (let f = 0; f < 65; f++) {
    updateBallPhysics(ball, () => {}, undefined, undefined, 1.0);
    frames++;
    if (ball.y <= PITCH_CONFIG.PITCH_TOP + 320 && !reachedBox) {
      reachedBox = true;
      speedAtBox = Math.hypot(ball.vx, ball.vy);
    }
    if (ball.y <= PITCH_CONFIG.PITCH_TOP) {
      break;
    }
  }

  assert(reachedBox, `Shot from 3/4 pitch reached penalty area in ${frames} frames`);
  assert(speedAtBox >= 18.0, `Remaining pace entering box is ${speedAtBox.toFixed(1)} px/f (> 18 px/f remaining pace)`);
}

// =========================================================================
// TEST GROUP 2: Distance Makes Aiming Harder Without Killing Velocity
// =========================================================================
console.log('\n[TEST GROUP 2: Aiming Dispersion vs Strike Velocity]');
{
  const shooterNear = createMockPlayer('shooter_near', PITCH_CONFIG.CENTER_X, PITCH_CONFIG.PITCH_TOP + 200, 'home');
  const shooterFar = createMockPlayer('shooter_far', PITCH_CONFIG.CENTER_X, PITCH_CONFIG.CENTER_Y + 400, 'home');
  const accNear = evaluateKickAccuracyInfo(shooterNear, undefined, [shooterNear]);
  const accFar = evaluateKickAccuracyInfo(shooterFar, undefined, [shooterFar]);

  const trajNear = calculateShotPhysics(shooterNear, PITCH_CONFIG.PITCH_TOP, PITCH_CONFIG.CENTER_X, 0.85, false, false, accNear);
  const trajFar = calculateShotPhysics(shooterFar, PITCH_CONFIG.PITCH_TOP, PITCH_CONFIG.CENTER_X, 0.85, false, false, accFar);

  const speedNear = Math.hypot(trajNear.vx, trajNear.vy);
  const speedFar = Math.hypot(trajFar.vx, trajFar.vy);

  assert(speedFar >= speedNear, `Distance does NOT kill strike velocity (Far: ${speedFar.toFixed(1)} >= Near: ${speedNear.toFixed(1)})`);
}

// =========================================================================
// TEST GROUP 3: 80–95 % Power Long Passes from Three-Quarter Pitch
// =========================================================================
console.log('\n[TEST GROUP 3: 80-95% Power Long Passes]');
{
  const passer = createMockPlayer('passer', PITCH_CONFIG.CENTER_X, PITCH_CONFIG.CENTER_Y + 300, 'home');
  const targetX = PITCH_CONFIG.CENTER_X + 250;
  const targetY = PITCH_CONFIG.PITCH_TOP + 250; // 1520 px long pass across pitch
  const acc = evaluateKickAccuracyInfo(passer, undefined, [passer]);

  const trajPass85 = calculateLongPassPhysics(passer, targetX, targetY, 0.85, false, false, acc);
  const passSpeed = Math.hypot(trajPass85.vx, trajPass85.vy);

  assert(trajPass85.isAirborne === true, '85% power long pass takes flight (isAirborne: true)');
  assert(passSpeed >= 26.0, `85% long pass speed is ${passSpeed.toFixed(1)} px/f (piercing velocity > 26 px/f)`);
  assert(trajPass85.vz >= 3.8, `85% long pass vz is ${trajPass85.vz.toFixed(1)} carrying across lines`);

  // Simulate long pass flight
  const ball = createMockBall(passer.x, passer.y, 0.5);
  ball.vx = trajPass85.vx;
  ball.vy = trajPass85.vy;
  ball.vz = trajPass85.vz;
  ball.spin = trajPass85.spin;
  ball.spinY = trajPass85.spinY;
  ball.isAirborne = true;

  for (let f = 0; f < 55; f++) {
    updateBallPhysics(ball, () => {}, undefined, undefined, 1.0);
  }

  const distTraveled = Math.hypot(ball.x - passer.x, ball.y - passer.y);
  assert(distTraveled >= 1200, `Long pass traveled ${distTraveled.toFixed(0)} px (> 1200 px) in flight`);
}

// =========================================================================
// TEST GROUP 4: Automatic "Cambio de Frente" (Cross-Field Switch of Play)
// =========================================================================
console.log('\n[TEST GROUP 4: Automatic Cambio de Frente]');
{
  // Winger on left flank
  const leftWinger = createMockPlayer('left_winger', PITCH_CONFIG.PITCH_LEFT + 120, PITCH_CONFIG.CENTER_Y, 'home');
  const oppositeFlankTargetX = PITCH_CONFIG.PITCH_RIGHT - 120; // Opposite right flank
  const oppositeFlankTargetY = PITCH_CONFIG.CENTER_Y - 200;
  const acc = evaluateKickAccuracyInfo(leftWinger, undefined, [leftWinger]);

  const switchTraj = calculateCrossPhysics(
    leftWinger,
    oppositeFlankTargetX,
    oppositeFlankTargetY,
    0.85,
    false,
    false,
    acc,
    0,
    true // isFieldSwitch
  );

  const switchSpeed = Math.hypot(switchTraj.vx, switchTraj.vy);
  assert(switchSpeed >= 28.0, `Cambio de Frente switch speed ${switchSpeed.toFixed(1)} px/f is flat and rapid (> 28 px/f)`);
  assert(switchTraj.vz <= 4.0, `Cambio de Frente trajectory is flat (vz = ${switchTraj.vz.toFixed(1)} <= 4.0)`);
  assert(switchTraj.bannerMessage.includes('CAMBIO DE FRENTE'), `Banner message identifies '${switchTraj.bannerMessage}'`);

  // Simulate cross-field flight across the width of the pitch (~1260 px)
  const ball = createMockBall(leftWinger.x, leftWinger.y, 1.0);
  ball.vx = switchTraj.vx;
  ball.vy = switchTraj.vy;
  ball.vz = switchTraj.vz;
  ball.spin = switchTraj.spin;
  ball.spinY = switchTraj.spinY;
  ball.isAirborne = true;

  for (let f = 0; f < 45; f++) {
    updateBallPhysics(ball, () => {}, undefined, undefined, 1.0);
  }

  assert(ball.x > PITCH_CONFIG.CENTER_X + 250, `Switch traversed the field from left wing to right flank (final x: ${ball.x.toFixed(0)})`);
}

// =========================================================================
// TEST GROUP 5: Aerodynamic Drag-Crisis & Backspin Lift
// =========================================================================
console.log('\n[TEST GROUP 5: Aerodynamic Drag Crisis & Lift]');
{
  const highSpeedBall = createMockBall(PITCH_CONFIG.CENTER_X, PITCH_CONFIG.CENTER_Y, 20);
  highSpeedBall.vx = 0;
  highSpeedBall.vy = -30.0; // Fast high-velocity strike
  highSpeedBall.vz = 0;
  highSpeedBall.spinY = -1.5; // Backspin

  const initialSpeed = Math.abs(highSpeedBall.vy);
  for (let f = 0; f < 30; f++) {
    updateBallPhysics(highSpeedBall, () => {}, undefined, undefined, 1.0);
  }
  const speedAfter30 = Math.abs(highSpeedBall.vy);
  const retention = speedAfter30 / initialSpeed;

  assert(retention >= 0.88, `High-speed ball pace retention over 30 frames is ${(retention * 100).toFixed(1)}% (>= 88% due to drag crisis)`);
}

// =========================================================================
// TEST GROUP 6: Consistency with E (Chip) and Q (Curve) Modifiers
// =========================================================================
console.log('\n[TEST GROUP 6: Consistency with Modifiers]');
{
  const kicker = createMockPlayer('kicker', PITCH_CONFIG.CENTER_X, PITCH_CONFIG.CENTER_Y, 'home');
  const acc = evaluateKickAccuracyInfo(kicker, undefined, [kicker]);

  // Chip modifier (E)
  const chipShot = calculateShotPhysics(kicker, PITCH_CONFIG.PITCH_TOP, PITCH_CONFIG.CENTER_X, 0.70, false, true, acc);
  assert(chipShot.isChipped === true, 'Chip shot preserves isChipped: true');
  assert(chipShot.spinY < -2.0, 'Chip shot has pronounced backspin');

  // Curve modifier (Q)
  const curveShot = calculateShotPhysics(kicker, PITCH_CONFIG.PITCH_TOP, PITCH_CONFIG.CENTER_X, 0.70, true, false, acc);
  assert(curveShot.isSpecialCurve === true, 'Curve shot preserves isSpecialCurve: true');
  assert(Math.abs(curveShot.spin) >= 4.0, 'Curve shot has high Magnus spin');

  // Stat Break: Thunderbolt Cannon (lsh > 99)
  const cannonPlayer = createMockPlayer('cannon', PITCH_CONFIG.CENTER_X, PITCH_CONFIG.CENTER_Y, 'home');
  cannonPlayer.canonicalStats = { ...cannonPlayer.canonicalStats, lsh: 104 };
  const thunderbolt = calculateShotPhysics(cannonPlayer, PITCH_CONFIG.PITCH_TOP, PITCH_CONFIG.CENTER_X, 0.90, false, false, acc);
  assert(thunderbolt.isThunderbolt === true, 'Stat break Thunderbolt Cannon triggers for lsh > 99');
  assert(thunderbolt.statBreakTrait === 'Thunderbolt Cannon', 'Stat break trait is Thunderbolt Cannon');
}

console.log(`\n========================================`);
console.log(`PHASE 7 TEST SUMMARY: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
