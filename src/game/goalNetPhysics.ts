/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoalNetState, NetTension, GoalFrameType, Ball } from '../types';
import { PITCH_CONFIG } from './constants';
import { audio } from './audio';

export interface GoalFrameMetrics {
  width: number;
  depth: number;
  crossbarHeight: number;
  rearStanchionDepth: number;
  hasTieBackCables: boolean;
}

export function getGoalFrameMetrics(frameType: GoalFrameType = 'standard'): GoalFrameMetrics {
  if (frameType === 'brazilian') {
    return {
      width: PITCH_CONFIG.GOAL_WIDTH, // 220px (~7.32m)
      depth: 95,                      // Extra deep South American box net depth
      crossbarHeight: PITCH_CONFIG.GOAL_CROSSBAR_HEIGHT,
      rearStanchionDepth: 110,        // Rear vertical stanchion post depth
      hasTieBackCables: true,         // Rear diagonal tension cables
    };
  }
  return {
    width: PITCH_CONFIG.GOAL_WIDTH,   // 220px
    depth: 60,                        // Standard UEFA/FIFA regulation depth
    crossbarHeight: PITCH_CONFIG.GOAL_CROSSBAR_HEIGHT,
    rearStanchionDepth: 75,
    hasTieBackCables: false,
  };
}

/**
 * Applies physical impact reaction when ball strikes goal net based on net tension & frame type
 */
export function processGoalNetCollision(
  ball: Ball,
  net: GoalNetState,
  isTopGoal: boolean,
  goalLineY: number,
  tension: NetTension = 'moderate',
  frameType: GoalFrameType = 'standard',
  timeScale: number = 1
): void {
  const metrics = getGoalFrameMetrics(frameType);
  const cx = PITCH_CONFIG.CENTER_X;
  const goalLeft = cx - metrics.width / 2;
  const goalRight = cx + metrics.width / 2;
  const speed = Math.hypot(ball.vx, ball.vy, ball.vz);

  // Trigger initial net impact bulge and sound
  if (!net.ballCaught) {
    net.impactX = ball.x;
    net.impactY = ball.y;
    net.impactZ = ball.z;
    net.ballCaught = true;

    if (tension === 'hard') {
      // Stiff, tight continental net
      net.bulgeAmount = Math.min(15, speed * 1.2 + 5);
      net.shake = 45; // High-frequency rapid twang
      audio.playPostHit(); // Sharp acoustic snap
    } else if (tension === 'soft') {
      // Deep cushioning drape
      net.bulgeAmount = Math.min(38, speed * 2.8 + 12);
      net.shake = 20; // Slow undulating ripple
      audio.playNetSwish();
    } else {
      // Moderate UEFA net
      net.bulgeAmount = Math.min(26, speed * 2.2 + 8);
      net.shake = 32;
      audio.playNetSwish();
    }
  }

  // Energy absorption based on Net Tension
  let dampingFactor = 0.80;
  let reboundVelocity = 0.12;

  if (tension === 'hard') {
    dampingFactor = 0.65;
    reboundVelocity = 0.42; // Ricochets crisply back out toward 6-yard box!
  } else if (tension === 'soft') {
    dampingFactor = 0.94; // Velocity deadens immediately
    reboundVelocity = 0.02; // Settles right down in bottom netting
  }

  ball.vx *= Math.pow(1 - (1 - dampingFactor) * 0.9, timeScale);
  ball.vy *= Math.pow(1 - (1 - dampingFactor) * 0.9, timeScale);
  ball.vz *= Math.pow(0.80, timeScale);

  if (ball.spin) ball.spin *= 0.60;
  if (ball.spinY) ball.spinY *= 0.60;

  // Rear netting containment & ricochet
  const backNetY = isTopGoal ? goalLineY - metrics.depth : goalLineY + metrics.depth;

  if (isTopGoal) {
    if (ball.y <= backNetY + 7) {
      ball.y = Math.max(backNetY + 2, ball.y);
      ball.vy = Math.abs(ball.vy) * reboundVelocity; // Rebounds downwards toward pitch
      ball.vx *= 0.65;
      net.bulgeAmount = Math.max(net.bulgeAmount, tension === 'hard' ? 12 : 24);
      net.shake = Math.max(net.shake, 20);
    }
  } else {
    if (ball.y >= backNetY - 7) {
      ball.y = Math.min(backNetY - 2, ball.y);
      ball.vy = -Math.abs(ball.vy) * reboundVelocity; // Rebounds upwards toward pitch
      ball.vx *= 0.65;
      net.bulgeAmount = Math.max(net.bulgeAmount, tension === 'hard' ? 12 : 24);
      net.shake = Math.max(net.shake, 20);
    }
  }

  // Side netting containment
  if (ball.x <= goalLeft + 5) {
    ball.x = goalLeft + 5;
    ball.vx = Math.abs(ball.vx) * (tension === 'hard' ? 0.35 : 0.15);
    net.shake = Math.max(net.shake, 14);
  } else if (ball.x >= goalRight - 5) {
    ball.x = goalRight - 5;
    ball.vx = -Math.abs(ball.vx) * (tension === 'hard' ? 0.35 : 0.15);
    net.shake = Math.max(net.shake, 14);
  }

  // Roof netting containment
  if (ball.z >= metrics.crossbarHeight - 4) {
    ball.z = metrics.crossbarHeight - 4;
    ball.vz = -Math.abs(ball.vz) * (tension === 'hard' ? 0.35 : 0.15);
  }

  // Gravity pulls caught ball down to turf inside net
  if (ball.z > 0) {
    ball.vz -= 0.26 * timeScale;
  } else {
    ball.z = 0;
    ball.vz = 0;
    const groundRest = tension === 'soft' ? 0.65 : 0.85;
    ball.vx *= groundRest;
    ball.vy *= groundRest;
  }
}

/**
 * Updates elastic oscillation and ripple decay on goal net state
 */
export function updateGoalNetOscillation(
  net: GoalNetState,
  tension: NetTension = 'moderate',
  timeScale: number = 1
): void {
  // Elastic spring frequency & damping coefficients
  let springK = 0.14;
  let frictionDamp = 0.88;

  if (tension === 'hard') {
    springK = 0.28;       // Stiff spring recoil
    frictionDamp = 0.82;  // Quick settling
  } else if (tension === 'soft') {
    springK = 0.08;       // Slow gentle drape
    frictionDamp = 0.94;  // Long slow wave
  }

  if (Math.abs(net.bulgeAmount) > 0.05 || Math.abs(net.bulgeVel) > 0.05) {
    const force = -springK * net.bulgeAmount;
    net.bulgeVel = (net.bulgeVel + force * timeScale) * Math.pow(frictionDamp, timeScale);
    net.bulgeAmount += net.bulgeVel * timeScale;
    if (Math.abs(net.bulgeAmount) < 0.05 && Math.abs(net.bulgeVel) < 0.05) {
      net.bulgeAmount = 0;
      net.bulgeVel = 0;
    }
  }

  if (net.shake > 0) {
    net.shake = Math.max(0, net.shake - (tension === 'hard' ? 2.5 : 1.2) * timeScale);
  }
}
