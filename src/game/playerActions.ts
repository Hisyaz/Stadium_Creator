/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Player, Ball, KeyState, TeamSide } from '../types';
import { PITCH_CONFIG, HOME_KIT, AWAY_KIT } from './constants';
import { audio } from './audio';
import { evaluateOffside } from './ai';
import {
  evaluateKickAccuracyInfo,
  calculateShortPassPhysics,
  calculateLongPassPhysics,
  calculateCrossPhysics,
  calculateShotPhysics,
  KickAccuracyInfo,
} from './ballPhysics';

export interface ActionExecutionContext {
  players: Player[];
  ball: Ball;
  setBanner: (msg: string, frames?: number) => void;
  triggerOffside: (incident: any, passingPlayer: Player) => void;
  updateUserControlledFlag: () => void;
  userControlledPlayerId: string | null;
  matchPhase: string;
  setMatchPhase: (phase: any) => void;
  stakeFactor?: number;
  kickoffKickingTeam?: TeamSide;
  homeAttacksUp?: boolean;
}

/**
 * Phase 2 — 1. Short Pass Execution (S / Green S Button)
 * Crisp, low ground roll directly into the recipient's body for clean first-touch reception.
 */
export function executeShortPassAction(
  ctx: ActionExecutionContext,
  player: Player,
  power: number = 0.5,
  isSpecial: boolean = false,
  isChip: boolean = false,
  keys?: KeyState
) {
  const isKickoff = ctx.matchPhase === 'kickoff_ready';

  const acc = evaluateKickAccuracyInfo(player, keys, ctx.players);

  // Set visual animation
  if (isChip) {
    player.action = 'chip_shot';
    player.actionTimer = 14;
  } else if (isSpecial) {
    player.action = 'special_curl_pass';
    player.actionTimer = 16;
  } else if (power < 0.60) {
    player.action = acc.isRunning ? 'running_pass_low' : 'standing_pass_low';
    player.actionTimer = acc.isRunning ? 11 : 9;
  } else if (power <= 0.70) {
    player.action = acc.isRunning ? 'running_pass_mid' : 'standing_pass_mid';
    player.actionTimer = acc.isRunning ? 14 : 12;
  } else {
    player.action = acc.isRunning ? 'running_pass_high' : 'standing_pass_high';
    player.actionTimer = acc.isRunning ? 17 : 15;
  }
  player.animFrame = 0;

  // Find best teammate — during kickoff, can pass to ANY teammate across the squad!
  const mates = ctx.players.filter(p => p.team === player.team && p.id !== player.id && !p.isRedCarded);
  let bestMate: Player | null = null;
  let bestScore = -Infinity;

  let inputDx = 0;
  let inputDy = 0;
  if (keys?.ArrowLeft) inputDx -= 1;
  if (keys?.ArrowRight) inputDx += 1;
  if (keys?.ArrowUp) inputDy -= 1;
  if (keys?.ArrowDown) inputDy += 1;
  const hasDirectionalInput = inputDx !== 0 || inputDy !== 0;

  if (isKickoff) {
    if (hasDirectionalInput) {
      // Steered kickoff pass: target the teammate best aligned with aimed direction (supports backwards, sideways, or forward!)
      const aimAngle = Math.atan2(inputDy, inputDx);
      for (const m of mates) {
        const dx = m.x - player.x;
        const dy = m.y - player.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 5) continue;

        const angleToMate = Math.atan2(dy, dx);
        let angleDiff = Math.abs(angleToMate - aimAngle);
        while (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

        // Alignment with aim is primary, distance is secondary
        const alignment = Math.cos(angleDiff);
        const score = alignment * 1000 - dist * 0.35;
        if (score > bestScore) {
          bestScore = score;
          bestMate = m;
        }
      }
    } else {
      // Neutral tap pass at kickoff: reliably passes to nearest supporting partner (ST2 or central midfielder)
      for (const m of mates) {
        const dx = m.x - player.x;
        const dy = m.y - player.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 5) continue;

        const isST2 = m.role === 'ST2';
        const isCM = m.role === 'CM1' || m.role === 'CM2';
        let prefScore = 600 - dist * 0.5;
        if (isST2) prefScore += 350;
        if (isCM) prefScore += 220;
        if (prefScore > bestScore) {
          bestScore = prefScore;
          bestMate = m;
        }
      }
    }
  } else {
    for (const m of mates) {
      const dx = m.x - player.x;
      const dy = m.y - player.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 10) continue;

      const angleToMate = Math.atan2(dy, dx);
      let angleDiff = Math.abs(angleToMate - player.facingAngle);
      while (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

      const forwardBonus = (player.team === 'home' ? -dy : dy) * 0.4;
      const rangePenalty = dist > 420 ? (dist - 420) * 1.5 : 0;
      const score = 1000 - dist * 0.45 - angleDiff * 250 + forwardBonus - rangePenalty;
      if (score > bestScore) {
        bestScore = score;
        bestMate = m;
      }
    }
  }

  // Phase 8 Expressive Passing Delivery Selection
  if (bestMate) {
    const dx = bestMate.x - player.x;
    const dy = bestMate.y - player.y;
    const angleToMate = Math.atan2(dy, dx);
    let angleDiff = Math.abs(angleToMate - player.facingAngle);
    while (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

    if (angleDiff > 2.2) {
      // 8.3 Sneaky backward heel tap in stride
      player.action = 'backheel_flick';
      player.actionTimer = 16;
    } else if (isSpecial) {
      // 8.3 Trivela outside-of-the-boot curved slice
      player.action = 'trivela';
      player.actionTimer = 18;
    } else if (isChip) {
      // 8.3 Low digging scoop chip lifting softly over defense
      player.action = 'scoop_chip';
      player.actionTimer = 16;
    } else if (power < 0.58) {
      // 8.3 Clean sidefoot precision push
      player.action = 'sidefoot_push';
      player.actionTimer = 14;
    }
  }

  if (!bestMate && mates.length > 0) {
    bestMate = mates[0];
  }

  if (bestMate) {
    let targetX = bestMate.x;
    let targetY = bestMate.y;

    if (acc.isRunning) {
      targetX += bestMate.vx * 3.2;
      targetY += bestMate.vy * 3.2;
    }

    if (acc.isDefenderTouching) {
      targetX += (Math.random() - 0.5) * 42 * (acc.errorSpreadMultiplier * 0.5);
      targetY += (Math.random() - 0.5) * 42 * (acc.errorSpreadMultiplier * 0.5);
    }

    if (isKickoff) {
      player.facingAngle = Math.atan2(targetY - player.y, targetX - player.x);
    }

    // Dynamic offside check (kickoffs are exempt from offside under FIFA Law 11)
    if (!isKickoff) {
      const isAttackingUp = player.team === 'home';
      const offside = evaluateOffside(player, bestMate, targetX, targetY, ctx.players, isAttackingUp);
      if (offside.isOffside) {
        ctx.triggerOffside(offside, player);
        return;
      }
    }

    // Kickoff ball is now in play!
    if (isKickoff) {
      ctx.setMatchPhase('in_play');
    }

    // Trajectory calculation via ballPhysics
    const traj = calculateShortPassPhysics(player, targetX, targetY, power, isSpecial, isChip, acc, ctx.stakeFactor || 0);

    ctx.ball.ownerId = null;
    ctx.ball.lastTouchTeam = player.team;
    ctx.ball.lastTouchPlayerId = player.id;
    ctx.ball.lastKickAction = 'pass';
    ctx.ball.lastKickPower = power;
    ctx.ball.isDividedBall = true;
    ctx.ball.vx = traj.vx;
    ctx.ball.vy = traj.vy;
    ctx.ball.vz = traj.vz;
    ctx.ball.z = traj.vz > 0 ? 0.5 : 0;
    ctx.ball.spin = traj.spin;
    ctx.ball.spinY = traj.spinY;
    ctx.ball.isAirborne = traj.isAirborne;
    ctx.ball.isOverpowered = traj.isOverpowered;
    ctx.ball.isSpecialCurve = traj.isSpecialCurve;
    ctx.ball.isChipped = traj.isChipped;
    ctx.ball.chipType = traj.chipType;
    ctx.ball.isLaserPing = traj.isLaserPing;
    ctx.ball.isStatBreak = traj.isLaserPing;
    ctx.ball.statBreakTrait = traj.statBreakTrait;
    if (traj.isLaserPing) {
      player.statBreakAuraTimer = 35;
      player.statBreakTraitName = '⚡ Laser Ping';
    }

    // Audio sound
    if (isChip) {
      audio.playChipScoop(power);
    } else if (traj.isOverpowered) {
      audio.playOverpoweredKick();
    } else if (isSpecial) {
      audio.playSpecialCurveKick();
    } else {
      audio.playKick(0.55 + power * 0.35);
    }

    ctx.setBanner(traj.bannerMessage, 65);

    // Switch control cleanly to recipient if passer was human-controlled
    if (player.id === ctx.userControlledPlayerId) {
      ctx.userControlledPlayerId = bestMate.id;
      ctx.updateUserControlledFlag();
    }
  }
}

/**
 * Phase 2 — 2. Long Pass / Through Ball Execution (W / Red L Button)
 * Space ahead of target teammate in attack direction; leading space vector; bypasses ground interceptors.
 */
export function executeLongPassAction(
  ctx: ActionExecutionContext,
  player: Player,
  power: number = 0.5,
  isSpecial: boolean = false,
  isChip: boolean = false,
  keys?: KeyState
) {
  const isKickoff = ctx.matchPhase === 'kickoff_ready';

  const acc = evaluateKickAccuracyInfo(player, keys, ctx.players);

  if (isChip) {
    player.action = 'chipped_long_pass';
    player.actionTimer = 22;
  } else if (power < 0.60) {
    player.action = acc.isRunning ? 'running_long_pass_low' : 'standing_long_pass_low';
    player.actionTimer = acc.isRunning ? 13 : 11;
  } else if (power <= 0.70) {
    player.action = acc.isRunning ? 'running_long_pass_mid' : 'standing_long_pass_mid';
    player.actionTimer = acc.isRunning ? 17 : 15;
  } else {
    player.action = acc.isRunning ? 'running_long_pass_high' : 'standing_long_pass_high';
    player.actionTimer = acc.isRunning ? 21 : 19;
  }
  player.animFrame = 0;

  const dirY = player.team === 'home' ? -1 : 1;
  const isAttackingUp = player.team === 'home';
  const passAngle = player.facingAngle;

  let inputDx = 0;
  let inputDy = 0;
  if (keys?.ArrowLeft) inputDx -= 1;
  if (keys?.ArrowRight) inputDx += 1;
  if (keys?.ArrowUp) inputDy -= 1;
  if (keys?.ArrowDown) inputDy -= 1;
  const hasDirectionalInput = inputDx !== 0 || inputDy !== 0;

  // Search for the best teammate — during kickoff, can long-pass to ANY teammate across the squad!
  let bestMate: Player | null = null;
  let bestScore = -Infinity;

  if (isKickoff) {
    const aimAngle = hasDirectionalInput ? Math.atan2(inputDy, inputDx) : player.facingAngle;
    for (const m of ctx.players) {
      if (m.team === player.team && m.id !== player.id && !m.isRedCarded) {
        const dx = m.x - player.x;
        const dy = m.y - player.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 10) continue;

        const angleToMate = Math.atan2(dy, dx);
        let angleDiff = Math.abs(angleToMate - aimAngle);
        while (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

        const alignment = Math.cos(angleDiff);
        const score = alignment * 1000 + (dist > 80 ? 150 : 0) - dist * 0.25;
        if (score > bestScore) {
          bestScore = score;
          bestMate = m;
        }
      }
    }
  } else {
    for (const m of ctx.players) {
      if (m.team === player.team && m.id !== player.id && !m.isRedCarded) {
        const dx = m.x - player.x;
        const dy = m.y - player.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 35 && dist < 720) {
          const angleToMate = Math.atan2(dy, dx);
          let angleDiff = Math.abs(passAngle - angleToMate);
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          angleDiff = Math.abs(angleDiff);

          const alignmentScore = Math.cos(angleDiff);
          if (alignmentScore > 0.25) {
            const isAheadOfBall = isAttackingUp ? m.y < player.y - 10 : m.y > player.y + 10;
            const runnerSpeed = Math.hypot(m.vx, m.vy);
            const score = alignmentScore * 0.55 + (isAheadOfBall ? 0.35 : 0.0) + (runnerSpeed > 1.0 ? 0.20 : 0.0) - (dist / 720) * 0.15;
            if (score > bestScore) {
              bestScore = score;
              bestMate = m;
            }
          }
        }
      }
    }
  }

  // Target coordinates calculation
  let targetX: number;
  let targetY: number;

  if (isKickoff && bestMate) {
    targetX = bestMate.x;
    targetY = bestMate.y;
    player.facingAngle = Math.atan2(targetY - player.y, targetX - player.x);
  } else if (bestMate) {
    const leadDistance = 45 + power * 40;
    const forwardRunX = Math.cos(bestMate.facingAngle) * Math.max(Math.abs(bestMate.vx) * 12, 10);
    const forwardRunY = dirY * Math.max(Math.abs(bestMate.vy) * 12, leadDistance);
    targetX = bestMate.x + forwardRunX;
    targetY = bestMate.y + forwardRunY;
  } else {
    const passDist = 260 + power * 320;
    targetX = player.x + Math.cos(passAngle) * passDist;
    targetY = player.y + Math.sin(passAngle) * passDist;
  }

  // Pitch boundary clamping
  targetX = Math.max(PITCH_CONFIG.PITCH_LEFT + 30, Math.min(PITCH_CONFIG.PITCH_RIGHT - 30, targetX));
  targetY = Math.max(PITCH_CONFIG.PITCH_TOP + 30, Math.min(PITCH_CONFIG.PITCH_BOTTOM - 30, targetY));

  if (acc.isDefenderTouching) {
    targetX += (Math.random() - 0.5) * 55 * (acc.errorSpreadMultiplier * 0.5);
    targetY += (Math.random() - 0.5) * 55 * (acc.errorSpreadMultiplier * 0.5);
  }

  // Dynamic offside check (exempt on kickoff under FIFA Law 11)
  if (!isKickoff && bestMate) {
    const offside = evaluateOffside(player, bestMate, targetX, targetY, ctx.players, isAttackingUp);
    if (offside.isOffside) {
      ctx.triggerOffside(offside, player);
      return;
    }
  }

  // Kickoff ball is now in play!
  if (isKickoff) {
    ctx.setMatchPhase('in_play');
  }

  const traj = calculateLongPassPhysics(player, targetX, targetY, power, isSpecial, isChip, acc, ctx.stakeFactor || 0);

  ctx.ball.ownerId = null;
  ctx.ball.lastTouchTeam = player.team;
  ctx.ball.lastTouchPlayerId = player.id;
  ctx.ball.lastKickAction = 'long_pass';
  ctx.ball.lastKickPower = power;
  ctx.ball.isDividedBall = true;
  ctx.ball.vx = traj.vx;
  ctx.ball.vy = traj.vy;
  ctx.ball.vz = traj.vz;
  ctx.ball.z = traj.vz > 0 ? 0.5 : 0;
  ctx.ball.spin = traj.spin;
  ctx.ball.spinY = traj.spinY;
  ctx.ball.isAirborne = traj.isAirborne;
  ctx.ball.isOverpowered = traj.isOverpowered;
  ctx.ball.isSpecialCurve = traj.isSpecialCurve;
  ctx.ball.isChipped = traj.isChipped;
  ctx.ball.chipType = traj.chipType;
  ctx.ball.isKnuckle = false;
  ctx.ball.isRadarTelemetry = traj.isRadarTelemetry;
  ctx.ball.isStatBreak = traj.isRadarTelemetry;
  ctx.ball.statBreakTrait = traj.statBreakTrait;
  if (traj.isRadarTelemetry) {
    player.statBreakAuraTimer = 35;
    player.statBreakTraitName = '⚡ Radar Telemetry Switch';
  }

  if (isChip) {
    audio.playChipScoop(power);
  } else if (traj.isOverpowered) {
    audio.playOverpoweredKick();
  } else if (isSpecial) {
    audio.playSpecialCurveKick();
  } else {
    audio.playKick(0.85);
  }

  ctx.setBanner(traj.bannerMessage, 70);

  // Alert runner to sprint onto ball in stride
  if (bestMate) {
    bestMate.targetX = targetX;
    bestMate.targetY = targetY;
    bestMate.actionTimer = 0;
    bestMate.action = 'running';

    if (player.id === ctx.userControlledPlayerId) {
      ctx.userControlledPlayerId = bestMate.id;
      ctx.updateUserControlledFlag();
    }
  }
}

/**
 * Phase 2 — 3. Cross Execution (D / Blue C Button) & ⚡ Chipped Cross (E + D)
 * Opposing team's penalty box corridor; whipped delivery for aerial duels; high floating chipped cross for far-post runners.
 */
export function executeCrossAction(
  ctx: ActionExecutionContext,
  player: Player,
  power: number = 0.5,
  isSpecial: boolean = false,
  isChip: boolean = false,
  keys?: KeyState
) {
  if (ctx.matchPhase === 'kickoff_ready') {
    ctx.setMatchPhase('in_play');
  }

  const acc = evaluateKickAccuracyInfo(player, keys, ctx.players);

  if (isChip) {
    player.action = 'chipped_cross';
    player.actionTimer = 22;
  } else if (power < 0.60) {
    player.action = acc.isRunning ? 'running_cross_low' : 'standing_cross_low';
    player.actionTimer = acc.isRunning ? 14 : 12;
  } else if (power <= 0.70) {
    player.action = acc.isRunning ? 'running_cross_mid' : 'standing_cross_mid';
    player.actionTimer = acc.isRunning ? 18 : 16;
  } else {
    player.action = acc.isRunning ? 'running_cross_high' : 'standing_cross_high';
    player.actionTimer = acc.isRunning ? 21 : 19;
  }
  player.animFrame = 0;

  const isAttackingUp = ctx.homeAttacksUp !== undefined
    ? (player.team === 'home' ? ctx.homeAttacksUp : !ctx.homeAttacksUp)
    : player.team === 'home';

  // Phase 7.2: Automatic Cambio de Frente (Cross-Field Switch of Play) Detection
  // High-power cross aimed from one wing toward opposite flank is interpreted as a flat switch.
  const fromLeftWing = player.x < PITCH_CONFIG.CENTER_X - 110;
  const fromRightWing = player.x > PITCH_CONFIG.CENTER_X + 110;
  const isWing = fromLeftWing || fromRightWing;
  const isAimingAcross = (fromLeftWing && (keys?.ArrowRight || Math.cos(player.facingAngle) > 0.25)) ||
                         (fromRightWing && (keys?.ArrowLeft || Math.cos(player.facingAngle) < -0.25));
  const isFieldSwitch = isWing && (isAimingAcross || power >= 0.68);

  let targetX: number;
  let targetY: number;
  let targetReceiver: Player | null = null;

  if (isFieldSwitch) {
    // Search for receiving winger / fullback on the opposite flank to lead in stride
    const oppositeMates = ctx.players.filter(m => {
      if (m.team !== player.team || m.id === player.id || m.role === 'GK' || m.isRedCarded) return false;
      return fromLeftWing ? m.x > PITCH_CONFIG.CENTER_X + 60 : m.x < PITCH_CONFIG.CENTER_X - 60;
    });

    let bestWinger: Player | null = null;
    let bestScore = -Infinity;

    for (const m of oppositeMates) {
      const isWingerRole = ['RW', 'RM', 'RWB', 'RB', 'LW', 'LM', 'LWB', 'LB', 'ST1', 'ST2'].includes(m.role) ||
                           ['RW', 'RM', 'RWB', 'RB', 'LW', 'LM', 'LWB', 'LB'].includes(m.subPos || '');
      const widthScore = Math.abs(m.x - PITCH_CONFIG.CENTER_X); // Wider lateral position is favored
      const isAhead = isAttackingUp ? m.y < player.y + 80 : m.y > player.y - 80;
      let score = widthScore + (isWingerRole ? 350 : 0) + (isAhead ? 250 : 0);
      if (score > bestScore) {
        bestScore = score;
        bestWinger = m;
      }
    }

    if (bestWinger) {
      targetReceiver = bestWinger;
      const attackDirY = isAttackingUp ? -1 : 1;
      const runnerSpeed = Math.hypot(bestWinger.vx, bestWinger.vy);
      // Leading space vector ahead of opposite winger so they can take it in stride
      const leadDistance = 35 + power * 45 + runnerSpeed * 12;
      targetX = bestWinger.x + (bestWinger.x > PITCH_CONFIG.CENTER_X ? 20 : -20);
      targetY = bestWinger.y + attackDirY * leadDistance;
    } else {
      // Projected open opposite channel
      const attackDirY = isAttackingUp ? -1 : 1;
      targetX = fromLeftWing ? PITCH_CONFIG.PITCH_RIGHT - 140 : PITCH_CONFIG.PITCH_LEFT + 140;
      targetY = player.y + attackDirY * (120 + power * 150);
    }
  } else {
    // Standard cross into the opposing team's penalty box corridor
    targetX = PITCH_CONFIG.CENTER_X;
    targetY = isAttackingUp ? PITCH_CONFIG.PITCH_TOP + 115 : PITCH_CONFIG.PITCH_BOTTOM - 115;

    // Directional arrow fine-tuning towards near post, penalty spot, or far post inside the box
    if (keys?.ArrowLeft) {
      targetX -= 65;
    } else if (keys?.ArrowRight) {
      targetX += 65;
    }

    if (keys?.ArrowUp) {
      targetY += isAttackingUp ? -45 : 45; // deeper towards 6-yard box
    } else if (keys?.ArrowDown) {
      targetY += isAttackingUp ? 45 : -45; // towards penalty spot / top of box
    }
  }

  // Pitch boundary clamping
  targetX = Math.max(PITCH_CONFIG.PITCH_LEFT + 25, Math.min(PITCH_CONFIG.PITCH_RIGHT - 25, targetX));
  targetY = Math.max(PITCH_CONFIG.PITCH_TOP + 25, Math.min(PITCH_CONFIG.PITCH_BOTTOM - 25, targetY));

  if (acc.isDefenderTouching) {
    targetX += (Math.random() - 0.5) * 50 * (acc.errorSpreadMultiplier * 0.5);
    targetY += (Math.random() - 0.5) * 35 * (acc.errorSpreadMultiplier * 0.5);
  }

  const traj = calculateCrossPhysics(player, targetX, targetY, power, isSpecial, isChip, acc, ctx.stakeFactor || 0, isFieldSwitch);

  ctx.ball.ownerId = null;
  ctx.ball.lastTouchTeam = player.team;
  ctx.ball.lastTouchPlayerId = player.id;
  ctx.ball.lastKickAction = 'cross';
  ctx.ball.lastKickPower = power;
  ctx.ball.isDividedBall = true;
  ctx.ball.vx = traj.vx;
  ctx.ball.vy = traj.vy;
  ctx.ball.vz = traj.vz;
  ctx.ball.z = 1.0;
  ctx.ball.spin = traj.spin;
  ctx.ball.spinY = traj.spinY;
  ctx.ball.isAirborne = true;
  ctx.ball.isOverpowered = traj.isOverpowered;
  ctx.ball.isSpecialCurve = traj.isSpecialCurve;
  ctx.ball.isChipped = traj.isChipped;
  ctx.ball.chipType = traj.chipType;
  ctx.ball.isKnuckle = false;
  ctx.ball.isGuidedWhip = traj.isGuidedWhip;
  ctx.ball.isStatBreak = traj.isGuidedWhip;
  ctx.ball.statBreakTrait = traj.statBreakTrait;
  if (traj.isGuidedWhip) {
    player.statBreakAuraTimer = 35;
    player.statBreakTraitName = '⚡ Guided Whip';
  }

  if (isChip) {
    audio.playChipScoop(power);
  } else if (traj.isOverpowered) {
    audio.playOverpoweredKick();
    audio.playCrowdGasp();
  } else if (isSpecial) {
    audio.playSpecialCurveKick();
  } else {
    audio.playKick(0.75 + power * 0.25);
  }

  ctx.setBanner(traj.bannerMessage, 70);

  // Phase 7.2: Alert receiving runner to sprint onto ball in stride and transfer user cursor
  if (targetReceiver) {
    targetReceiver.targetX = targetX;
    targetReceiver.targetY = targetY;
    targetReceiver.action = 'running';
    targetReceiver.actionTimer = 0;

    if (player.id === ctx.userControlledPlayerId) {
      ctx.userControlledPlayerId = targetReceiver.id;
      ctx.updateUserControlledFlag();
    }
  } else if (player.id === ctx.userControlledPlayerId) {
    // For standard crosses into box, transfer cursor to the best positioned attacker in the box
    const boxMates = ctx.players.filter(
      p => p.team === player.team && p.id !== player.id && p.role !== 'GK' && !p.isRedCarded
    );
    let bestBoxMate: Player | null = null;
    let minD = Infinity;
    for (const m of boxMates) {
      const d = Math.hypot(m.x - targetX, m.y - targetY);
      if (d < minD) {
        minD = d;
        bestBoxMate = m;
      }
    }
    if (bestBoxMate) {
      ctx.userControlledPlayerId = bestBoxMate.id;
      ctx.updateUserControlledFlag();
    }
  }
}

/**
 * Phase 2 — 4. Shot Execution (A / Orange S Button) & ⚡ Chip Shot (E + A)
 * High-velocity strike aimed toward corners/side netting; or delicate dink scoop lifting cleanly over rushing GK.
 */
export function executeShotAction(
  ctx: ActionExecutionContext,
  player: Player,
  power: number = 0.5,
  isSpecial: boolean = false,
  isChip: boolean = false,
  keys?: KeyState
) {
  if (ctx.matchPhase === 'kickoff_ready') {
    ctx.setMatchPhase('in_play');
  }

  const acc = evaluateKickAccuracyInfo(player, keys, ctx.players);

  // Check for desperate sliding toe poke when pressured from behind/sides
  let isUnderPressure = false;
  for (const opp of ctx.players) {
    if (opp.team !== player.team && !opp.isRedCarded) {
      const d = Math.hypot(opp.x - player.x, opp.y - player.y);
      if (d < 24) {
        isUnderPressure = true;
        break;
      }
    }
  }

  if (isChip) {
    player.action = 'chip_shot';
    player.actionTimer = 20;
  } else if (isSpecial) {
    player.action = 'curling_finesse';
    player.actionTimer = 22;
  } else if (isUnderPressure && power > 0.6) {
    player.action = 'sliding_toe_poke';
    player.actionTimer = 18;
  } else if (power >= 0.75) {
    player.action = 'driven_laces_strike';
    player.actionTimer = 22;
  } else if (power < 0.60) {
    player.action = acc.isRunning ? 'running_shot_low' : 'standing_shot_low';
    player.actionTimer = acc.isRunning ? 14 : 12;
  } else {
    player.action = acc.isRunning ? 'running_shot_mid' : 'standing_shot_mid';
    player.actionTimer = acc.isRunning ? 18 : 16;
  }
  player.animFrame = 0;

  const isAttackingUp = ctx.homeAttacksUp !== undefined
    ? (player.team === 'home' ? ctx.homeAttacksUp : !ctx.homeAttacksUp)
    : player.team === 'home';
  const targetGoalY = isAttackingUp ? PITCH_CONFIG.PITCH_TOP : PITCH_CONFIG.PITCH_BOTTOM;

  // Aim towards postage stamps or side netting based on directional keys
  let aimX = PITCH_CONFIG.CENTER_X;
  if (keys?.ArrowLeft) {
    aimX = PITCH_CONFIG.CENTER_X - 48; // Left post / corner
  } else if (keys?.ArrowRight) {
    aimX = PITCH_CONFIG.CENTER_X + 48; // Right post / corner
  }

  // Precision adjustment
  if (acc.isStanding) {
    aimX += (Math.random() - 0.5) * 8;
  } else if (acc.isRunning) {
    aimX += (Math.random() - 0.5) * 16 + (player.vx * 0.28);
  }

  if (acc.isDefenderTouching) {
    aimX += (Math.random() - 0.5) * 44 * (acc.errorSpreadMultiplier * 0.5);
  }

  const traj = calculateShotPhysics(player, targetGoalY, aimX, power, isSpecial, isChip, acc, ctx.stakeFactor || 0);

  ctx.ball.ownerId = null;
  ctx.ball.lastTouchTeam = player.team;
  ctx.ball.lastTouchPlayerId = player.id;
  ctx.ball.lastKickAction = 'shoot';
  ctx.ball.lastKickPower = power;
  ctx.ball.isDividedBall = true;
  ctx.ball.vx = traj.vx;
  ctx.ball.vy = traj.vy;
  ctx.ball.vz = traj.vz;
  ctx.ball.z = 0.5;
  ctx.ball.spin = traj.spin;
  ctx.ball.spinY = traj.spinY;
  ctx.ball.isAirborne = true;
  ctx.ball.isOverpowered = traj.isOverpowered;
  ctx.ball.isSpecialCurve = traj.isSpecialCurve;
  ctx.ball.isChipped = traj.isChipped;
  ctx.ball.chipType = traj.chipType;
  ctx.ball.isKnuckle = false;
  ctx.ball.isThunderbolt = traj.isThunderbolt;
  ctx.ball.isDeadlyAssassin = traj.isDeadlyAssassin;
  ctx.ball.isStatBreak = traj.isThunderbolt || traj.isDeadlyAssassin;
  ctx.ball.statBreakTrait = traj.statBreakTrait;
  if (traj.statBreakTrait) {
    player.statBreakAuraTimer = 40;
    player.statBreakTraitName = `⚡ ${traj.statBreakTrait}`;
  }

  if (isChip) {
    audio.playChipScoop(power);
    if (traj.isOverpowered) {
      audio.playCrowdGasp();
    }
  } else if (traj.isOverpowered) {
    audio.playOverpoweredKick();
    audio.playCrowdGasp();
  } else if (isSpecial) {
    audio.playSpecialCurveKick();
  } else {
    audio.playKick(0.7 + power * 0.4);
  }

  ctx.setBanner(traj.bannerMessage, 70);
}
