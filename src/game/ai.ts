/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Player, Ball, TeamSide, PlayerRole, DifficultyLevel, TacticalPlaystyle, DetailedTactics } from '../types';
import { PITCH_CONFIG, PHYSICS } from './constants';
import { audio } from './audio';
import { isKickingAction } from './engine';
import { PLAYSTYLE_DEFINITIONS, getDefaultTactics } from './formations';
import { processGoalkeeperShotReaction } from './matchRules';
import { executeStepOvers } from './skills';
import { PLAYSTYLE_ID, getPlaystyleBias } from './playstyles';
import {
  CANDIDATE_TARGETS,
  CANDIDATE_SCORES,
  distSq,
  distToSegmentSq,
  calculateInterceptionVector,
  isCarrierInPressingCorridor,
  calculateCoverShadowPosition,
  findCoverShadowTarget,
  calculateZone14Position,
  findUnobstructedPassingTarget,
  calculateSupportVector,
  calculateBlindsideChannelRun,
  calculateOverlappingFullbackRun,
  calculateUnderlappingRun,
  calculateDropIntoPocket,
  calculateForwardShadowingTarget,
  evaluateDefenderStepOut,
  applyAnticipationAndAttributeVariance,
  getPlayerPOS,
  getPlayerREA,
  getPlayerTCK,
  getPlayerSLD,
  calculateCutbackTarget,
  calculateThirdManRun,
  getContextPressMultiplier,
  shouldRunTacticalScan,
  updateTeamBlockShape,
  determineTeamBlockPhase,
  getCounterPressDurationFrames,
} from './tactics';
import { calculateBallDropZone } from './ballPhysics';
import {
  calculateAerialAwarenessDelay,
  calculateAerialInterceptionBias,
  calculateAerialTimingWindow,
  evaluateAerialContactQuality,
  calculateSecondBallReactionDelay,
} from './playerStats';

export {
  updateTeamBlockShape,
  determineTeamBlockPhase,
  getCounterPressDurationFrames,
};

export interface AiActionOutput {
  action?: 'kick' | 'pass' | 'long_pass' | 'shoot' | 'cross' | 'tackle' | 'slide' | 'header' | 'volley' | 'tactical_foul';
  shotType?: 'driven' | 'finesse' | 'chip';
  targetX?: number;
  targetY?: number;
  power?: number;
  receiverId?: string;
  isAerialLob?: boolean;
  isChipped?: boolean;
  isCurved?: boolean;
  headerType?: 'bullet' | 'diving' | 'glancing' | 'clearance';
  volleyType?: 'half_volley' | 'side_volley' | 'diving_volley' | 'bicycle' | 'rustic_clearance';
}

/**
 * Calculates smart tactical positioning and behavior for 11v11 players.
 * Phase 4: Staggered time-sliced tactical decision ticking, zero-allocation math,
 * pressing envelopes, cover shadows, and teammate dynamic passing triangles.
 */
export function updatePlayerAI(
  player: Player,
  allPlayers: Player[],
  ball: Ball,
  isAttackingUp: boolean, // true for Home (attacks top goal), false for Away (attacks bottom goal)
  difficulty: DifficultyLevel = 'easy',
  scoreDiff: number = 0, // awayScore - homeScore: positive = AI winning, negative = AI losing
  isKickoffActive: boolean = false,
  timeScale: number = 1,
  playstyle: TacticalPlaystyle = 'possession',
  matchTimeMinutes: number = 0,
  detailedTactics?: DetailedTactics,
  playerIndex: number = 0,
  frame: number = 0
): AiActionOutput | null {
  const tactics = detailedTactics || getDefaultTactics(playstyle);

  // If player does not have the ball, they CANNOT use the shield under any circumstances
  if (ball.ownerId !== player.id) {
    player.isShielding = false;
    if (player.action === 'shielding') {
      player.action = 'idle';
    }
  }

  // If player is signaling for pass, decay the signal timer
  if (player.signalPassTimer && player.signalPassTimer > 0) {
    player.signalPassTimer -= timeScale;
    if (player.signalPassTimer <= 0) {
      player.isSignalingForPass = false;
      player.signalPassTimer = 0;
    }
  }

  // If player is currently executing a fixed locked action, wait for it to finish
  if (
    player.action === 'fouled_falling' ||
    player.action === 'sliding_tackle' ||
    player.action === 'goalkeeper_dive' ||
    (player.actionTimer > 0 && isKickingAction(player.action))
  ) {
    return null;
  }

  // --- KICK OFF ENFORCEMENT (Defending team cannot cross midfield or enter center circle) ---
  // Defending team remains in their own half and outside the center circle until the ball has been passed!
  if (isKickoffActive) {
    const kickingTeam = ball.lastTouchTeam || (ball.ownerId ? allPlayers.find(p => p.id === ball.ownerId)?.team : 'home');
    if (player.team !== kickingTeam && ball.ownerId !== player.id) {
      enforceKickoffBoundary(player, kickingTeam);
      player.vx = 0;
      player.vy = 0;
      player.action = 'idle';
      player.facingAngle = Math.atan2(PITCH_CONFIG.CENTER_Y - player.y, PITCH_CONFIG.CENTER_X - player.x);
      return null;
    }
  }

  // --- DIFFICULTY: STANDING MODE ---
  if (difficulty === 'standing' && player.role !== 'GK') {
    player.vx = 0;
    player.vy = 0;
    player.action = 'idle';
    return null;
  }

  const isOwner = ball.ownerId === player.id;
  const teamHasBall = allPlayers.some(p => p.team === player.team && ball.ownerId === p.id);

  // 1. GOALKEEPER SPECIFIC AI
  if (player.role === 'GK') {
    return updateGoalkeeperAI(player, allPlayers, ball, isAttackingUp, timeScale, playstyle, tactics, difficulty);
  }

  // 2. BALL CARRIER DECISION MAKING (If AI has the ball)
  if (isOwner) {
    const carrierAction = updateBallCarrierAI(
      player,
      allPlayers,
      ball,
      isAttackingUp,
      difficulty,
      scoreDiff,
      timeScale,
      playstyle,
      matchTimeMinutes,
      tactics,
      isKickoffActive
    );
    if (carrierAction) {
      player.isShielding = false;
    }
    return carrierAction;
  }

  // 3. OUT-OF-POSSESSION & OFF-THE-BALL POSITIONING
  return updateOffTheBallAI(
    player,
    allPlayers,
    ball,
    isAttackingUp,
    teamHasBall,
    difficulty,
    scoreDiff,
    timeScale,
    playstyle,
    matchTimeMinutes,
    tactics,
    playerIndex,
    frame
  );
}

/**
 * Enforces that opposing players remain in their own half and outside the center circle during kickoff
 * until the ball has been passed.
 */
function enforceKickoffBoundary(player: Player, kickingTeam: TeamSide = 'home') {
  const defendingTeam = kickingTeam === 'home' ? 'away' : 'home';

  // 1. Can't pass the middle of the pitch (halfway line)
  if (defendingTeam === 'away') {
    // Away defends top half (y <= CENTER_Y)
    const maxAllowedY = PITCH_CONFIG.CENTER_Y - 12;
    if (player.y > maxAllowedY) {
      player.y = maxAllowedY;
    }
  } else {
    // Home defends bottom half (y >= CENTER_Y)
    const minAllowedY = PITCH_CONFIG.CENTER_Y + 12;
    if (player.y < minAllowedY) {
      player.y = minAllowedY;
    }
  }

  // 2. Can't enter the circle at the middle of the pitch (CENTER_CIRCLE_RADIUS = 180)
  const distToCenter = Math.hypot(player.x - PITCH_CONFIG.CENTER_X, player.y - PITCH_CONFIG.CENTER_Y);
  const minCircleRadius = PITCH_CONFIG.CENTER_CIRCLE_RADIUS + 15; // 195px
  if (distToCenter < minCircleRadius) {
    const angle = Math.atan2(player.y - PITCH_CONFIG.CENTER_Y, player.x - PITCH_CONFIG.CENTER_X);
    player.x = PITCH_CONFIG.CENTER_X + Math.cos(angle) * minCircleRadius;
    player.y = PITCH_CONFIG.CENTER_Y + Math.sin(angle) * minCircleRadius;
    // Re-clamp halfway line
    if (defendingTeam === 'away' && player.y > PITCH_CONFIG.CENTER_Y - 12) {
      player.y = PITCH_CONFIG.CENTER_Y - 12;
    } else if (defendingTeam === 'home' && player.y < PITCH_CONFIG.CENTER_Y + 12) {
      player.y = PITCH_CONFIG.CENTER_Y + 12;
    }
  }
}

/**
 * Goalkeeper AI
 */
function updateGoalkeeperAI(
  player: Player,
  allPlayers: Player[],
  ball: Ball,
  isAttackingUp: boolean,
  timeScale: number = 1,
  playstyle: TacticalPlaystyle = 'possession',
  tactics?: DetailedTactics,
  difficulty: DifficultyLevel = 'easy'
): AiActionOutput | null {
  if (ball.ownerId !== player.id) {
    player.isShielding = false;
    if (player.action === 'shielding') {
      player.action = 'idle';
    }
  }

  const goalLineY = isAttackingUp ? PITCH_CONFIG.PITCH_BOTTOM - 20 : PITCH_CONFIG.PITCH_TOP + 20;
  const goalLeft = PITCH_CONFIG.CENTER_X - PITCH_CONFIG.GOAL_WIDTH / 2;
  const goalRight = PITCH_CONFIG.CENTER_X + PITCH_CONFIG.GOAL_WIDTH / 2;

  // A. IF GOALKEEPER CURRENTLY HAS POSSESSION:
  if (ball.ownerId === player.id) {
    player.gkHoldTimer = (player.gkHoldTimer || 0) + 1;
    player.facingAngle = isAttackingUp ? -Math.PI / 2 : Math.PI / 2;
    player.vx = 0;
    player.vy = 0;
    player.action = 'idle';

    const maxHoldTimer = difficulty === 'legend' ? 20 : difficulty === 'elite' ? 28 : difficulty === 'normal' ? 36 : 45;
    if (player.gkHoldTimer > maxHoldTimer) {
      player.gkHoldTimer = 0;

      // Playstyle distribution bias using DetailedTactics creation mode
      const prefersLong = tactics?.creation === 'long' || playstyle === 'long_ball' || playstyle === 'catenaccio';
      const prefersShort = tactics?.creation === 'short' || playstyle === 'possession' || playstyle === 'conservative';
      const chooseShort = prefersShort ? Math.random() < 0.88 : (prefersLong ? Math.random() < 0.15 : Math.random() < 0.50);

      let bestMate: Player | null = null;
      let bestScore = -Infinity;

      for (let i = 0; i < allPlayers.length; i++) {
        const m = allPlayers[i];
        if (m.team !== player.team || m.id === player.id || m.role === 'GK') continue;

        const isUpfield = isAttackingUp ? m.y < player.y - 65 : m.y > player.y + 65;
        if (!isUpfield) continue;

        const dSq = distSq(m.x, m.y, player.x, player.y);
        if (dSq > 85 * 85 && dSq < 440 * 440) {
          let oppPressure = 0;
          for (let j = 0; j < allPlayers.length; j++) {
            const opp = allPlayers[j];
            if (opp.team !== player.team) {
              const dOppSq = distSq(opp.x, opp.y, m.x, m.y);
              if (dOppSq < 45 * 45) oppPressure += 1;
            }
          }
          const score = 100000 - dSq * 0.5 - oppPressure * 3000;
          if (score > bestScore) {
            bestScore = score;
            bestMate = m;
          }
        }
      }

      if (chooseShort && bestMate) {
        return {
          action: 'pass',
          targetX: bestMate.x,
          targetY: bestMate.y,
          power: 0.82,
          receiverId: bestMate.id,
        };
      } else {
        const midX = PITCH_CONFIG.CENTER_X + (Math.random() - 0.5) * 160;
        const midY = PITCH_CONFIG.CENTER_Y + (isAttackingUp ? 40 : -40) + (Math.random() - 0.5) * 60;
        return {
          action: 'kick',
          targetX: midX,
          targetY: midY,
          power: 0.95,
        };
      }
    }
    return null;
  }

  // B. GOALKEEPER POSITIONING & SAVES
  if (player.gkHoldTimer && player.gkHoldTimer < 0) {
    player.vx = 0;
    player.vy = 0;
    return null;
  }

  // Recovery roll after dive/parry: quickly scramble back to upright ready stance
  if (player.action === 'gk_recovery_roll') {
    if (player.actionTimer <= 0) {
      player.action = 'idle';
      player.animFrame = 0;
    } else {
      player.vx *= 0.5;
      player.vy *= 0.5;
      return null;
    }
  }

  const targetX = Math.max(goalLeft + 15, Math.min(goalRight - 15, ball.x));
  let targetY = goalLineY;

  const boxTop = isAttackingUp ? PITCH_CONFIG.PITCH_BOTTOM - PITCH_CONFIG.PENALTY_BOX_HEIGHT : PITCH_CONFIG.PITCH_TOP;
  const boxBottom = isAttackingUp ? PITCH_CONFIG.PITCH_BOTTOM : PITCH_CONFIG.PITCH_TOP + PITCH_CONFIG.PENALTY_BOX_HEIGHT;
  const boxLeft = PITCH_CONFIG.CENTER_X - PITCH_CONFIG.PENALTY_BOX_WIDTH / 2;
  const boxRight = PITCH_CONFIG.CENTER_X + PITCH_CONFIG.PENALTY_BOX_WIDTH / 2;

  const isBallInBox = ball.x >= boxLeft && ball.x <= boxRight && ball.y >= boxTop && ball.y <= boxBottom;
  const distSqToBall = distSq(player.x, player.y, ball.x, ball.y);
  const distToBall = Math.sqrt(distSqToBall);

  const isSweeperKeeper = player.playstyleId === PLAYSTYLE_ID.SWEEPER;
  const isWallKeeper = player.playstyleId === PLAYSTYLE_ID.WALL;

  const gkHan = player.canonicalStats && 'han' in player.canonicalStats ? player.canonicalStats.han : 75;
  const gkSav = player.canonicalStats && 'sav' in player.canonicalStats ? player.canonicalStats.sav : 75;
  const gkRef = player.canonicalStats && 'ref' in player.canonicalStats ? player.canonicalStats.ref : 75;
  const gkAer = player.canonicalStats && 'aer' in player.canonicalStats ? player.canonicalStats.aer : 75;

  // 1. 1v1 STAR-SPREAD SMOTHER (Symmetric to Long Pass / W button)
  // Peter Schmeichel / Manuel Neuer starfish body barrier closing 1v1 angles in the box
  const starSpreadDist = difficulty === 'legend' ? 52 : difficulty === 'elite' ? 45 : difficulty === 'normal' ? 38 : difficulty === 'easy' ? 28 : 0;
  if (
    starSpreadDist > 0 &&
    ball.ownerId &&
    isBallInBox &&
    !['gk_star_spread', 'goalkeeper_dive', 'gk_fingertip_parry', 'gk_low_smother', 'gk_punch', 'gk_high_catch'].includes(player.action)
  ) {
    const carrier = allPlayers.find((p) => p.id === ball.ownerId);
    if (carrier && carrier.team !== player.team) {
      const distToCarrier = Math.hypot(carrier.x - player.x, carrier.y - player.y);
      if (distToCarrier < starSpreadDist) {
        player.action = 'gk_star_spread';
        player.actionTimer = 26;
        player.animFrame = 0;
        player.vx = 0;
        player.vy = 0;
        audio.playKick(0.7);
        return null;
      }
    }
  }

  // 2. LOOSE BALL IN PENALTY BOX: SWEEPER RUSH & CLAIM (Symmetric to Short Pass / S button)
  if (isBallInBox && !ball.ownerId && (!player.gkHoldTimer || player.gkHoldTimer >= 0)) {
    if (distSqToBall < 36 * 36 && ball.z < 45) {
      ball.ownerId = player.id;
      ball.lastTouchTeam = player.team;
      ball.lastTouchPlayerId = player.id;
      ball.vx = 0;
      ball.vy = 0;
      ball.vz = 0;
      ball.z = 10;
      ball.isAirborne = false;
      player.action = 'idle';
      player.actionTimer = 0;
      player.gkHoldTimer = 0;
      audio.playKick(0.75);
      return null;
    } else {
      // Rush out directly towards the loose ball at top sprint speed
      targetY = ball.y;
    }
  }

  // Sweeper keeper advances further up pitch during team attacks
  if (isSweeperKeeper && !isBallInBox) {
    const sweepAdvanceY = isAttackingUp ? -65 : 65;
    targetY += sweepAdvanceY;

    // Active Sweeper Rush: charge out to sweep loose balls outside the box
    if (!ball.ownerId && distSqToBall < 240 * 240 && ball.z < 25) {
      if (distSqToBall < 34 * 34) {
        // Kick clear upfield
        const clearY = isAttackingUp ? -1 : 1;
        return {
          action: 'kick',
          targetX: PITCH_CONFIG.CENTER_X + (Math.random() - 0.5) * 180,
          targetY: PITCH_CONFIG.CENTER_Y + clearY * 200,
          power: 0.96,
        };
      }
      targetY = ball.y;
    }
  } else if (isWallKeeper) {
    // Wall keeper stays tightly anchored on the line for optimal reflex diving
    targetY = goalLineY;
  }

  // 3. AERIAL CROSS / CORNER INTERCEPT: CATCH VS PUNCH EVALUATION (Symmetric to Q Catch vs E Punch)
  const isAerialCrossOrCorner =
    ball.isAirborne &&
    ball.z > 14 &&
    isBallInBox &&
    !ball.ownerId &&
    distToBall < (55 + (difficulty === 'legend' ? 15 : difficulty === 'elite' ? 10 : 0));

  if (isAerialCrossOrCorner && difficulty !== 'standing' && !['gk_high_catch', 'gk_punch', 'goalkeeper_dive', 'gk_fingertip_parry'].includes(player.action)) {
    const ballSpeed = Math.hypot(ball.vx, ball.vy);
    const hasHeavyCurve = ball.spin && Math.abs(ball.spin) > 3.0;
    const isViolentPower = ballSpeed > 8.0 || ball.isOverpowered || ball.isKnuckle;

    // Count contesting opposing attackers in the box
    let boxTraffic = 0;
    for (let i = 0; i < allPlayers.length; i++) {
      const opp = allPlayers[i];
      if (opp.team !== player.team && distSq(opp.x, opp.y, ball.x, ball.y) < 45 * 45) {
        boxTraffic++;
      }
    }

    // Catch vs Punch Decision Logic:
    // Heavy power, extreme spin, low handling (< 70), or traffic >= 2 triggers PUNCH!
    const wantsPunch = isViolentPower || hasHeavyCurve || boxTraffic >= 2 || gkHan < 68;

    if (wantsPunch) {
      // PUNCH CLEAR (E button equivalent)
      player.action = 'gk_punch';
      player.actionTimer = 24;
      player.animFrame = 0;
      processGoalkeeperShotReaction(player, ball, distToBall, isAttackingUp);
      return null;
    } else {
      // HIGH JUMP CATCH (Q button equivalent)
      player.action = 'gk_high_catch';
      player.actionTimer = 26;
      player.animFrame = 0;
      processGoalkeeperShotReaction(player, ball, distToBall, isAttackingUp);
      return null;
    }
  }

  // 4. INCOMING SHOT: HIGH DIVE VS LOW DIVE (Symmetric to Cross D vs Shoot A buttons)
  const isShotComing = isAttackingUp ? (ball.vy > 1.5 && ball.y > PITCH_CONFIG.CENTER_Y) : (ball.vy < -1.5 && ball.y < PITCH_CONFIG.CENTER_Y);
  const diveTriggerDistSq = difficulty === 'legend' ? 78 * 78 : difficulty === 'elite' ? 68 * 68 : difficulty === 'normal' ? 58 * 58 : difficulty === 'easy' ? 46 * 46 : 35 * 35;

  if (
    difficulty !== 'standing' &&
    isShotComing &&
    distSqToBall < diveTriggerDistSq &&
    !ball.ownerId &&
    (!player.gkHoldTimer || player.gkHoldTimer >= 0) &&
    !['goalkeeper_dive', 'gk_fingertip_parry', 'gk_low_smother', 'gk_punch', 'gk_high_catch'].includes(player.action)
  ) {
    const isHighTrajectory = ball.z > 14 || (ball.vz && ball.vz > 0.5);

    // Wall Keeper gets reach bonus + difficulty scaling
    const difficultyReachBonus = difficulty === 'legend' ? 14 : difficulty === 'elite' ? 8 : difficulty === 'normal' ? 3 : 0;
    const reachBonus = (isWallKeeper ? 15 : 0) + difficultyReachBonus;

    if (isHighTrajectory) {
      // HIGH DIVE / JUMP REACH (Cross / D equivalent): Tips over bar or parries past top corners
      player.action = 'gk_fingertip_parry';
      player.actionTimer = 26;
      player.animFrame = 0;
      player.diveX = (ball.x - player.x) * 0.45;
      player.diveY = (ball.y - player.y) * 0.45;
    } else {
      // LOW DIVE / SMOTHER (Shoot / A equivalent): Slides low along turf to cut bottom corner drives
      player.action = 'gk_low_smother';
      player.actionTimer = 24;
      player.animFrame = 0;
      player.diveX = (ball.x - player.x) * 0.55;
      player.diveY = (ball.y - player.y) * 0.25;
    }

    if (distSqToBall < (44 + reachBonus) * (44 + reachBonus) && ball.z < 55) {
      processGoalkeeperShotReaction(player, ball, distToBall, isAttackingUp);
    }
    return null;
  }

  const gkMoveSpeed = isSweeperKeeper ? player.stats.sprintSpeed : player.stats.speed;
  moveTowards(player, targetX, targetY, gkMoveSpeed, timeScale);
  return null;
}

/**
 * Ball Carrier AI with Tactical Playstyle Customization & Killer Instinct Engine (4.3)
 */
function updateBallCarrierAI(
  player: Player,
  allPlayers: Player[],
  ball: Ball,
  isAttackingUp: boolean,
  difficulty: DifficultyLevel,
  scoreDiff: number,
  timeScale: number = 1,
  playstyle: TacticalPlaystyle = 'possession',
  matchTimeMinutes: number = 0,
  tactics?: DetailedTactics,
  isKickoff: boolean = false
): AiActionOutput | null {
  // --- KICK OFF PASS EXECUTION (AI) ---
  // "the team doing the kickoff can pass the ball to any teammate"
  if (isKickoff) {
    player.kickoffPrepTimer = (player.kickoffPrepTimer || 0) + 1;
    player.vx = 0;
    player.vy = 0;
    player.action = 'idle';

    const mates = allPlayers.filter(p => p.team === player.team && p.id !== player.id && !p.isRedCarded);
    if (mates.length === 0) return null;

    // The AI kicker can pass to ANY teammate: strike partner, central midfielder, wingers, or defenders!
    let chosenMate = mates.find(m => m.role === 'ST2');
    if (!chosenMate || (player.id.charCodeAt(0) % 2 === 0)) {
      const mid = mates.find(m => m.role === 'CM1' || m.role === 'CM2');
      if (mid) chosenMate = mid;
    }
    if (!chosenMate) chosenMate = mates[0];

    // Face the chosen teammate
    player.facingAngle = Math.atan2(chosenMate.y - player.y, chosenMate.x - player.x);

    // After brief 20 frames (~0.33s) preparation, deliver the kickoff pass!
    if (player.kickoffPrepTimer > 20) {
      player.kickoffPrepTimer = 0;
      return {
        action: 'pass',
        targetX: chosenMate.x,
        targetY: chosenMate.y,
        power: 0.55,
        receiverId: chosenMate.id,
      };
    }
    return null;
  }

  const rivalGoalX = PITCH_CONFIG.CENTER_X;
  const rivalGoalY = isAttackingUp ? PITCH_CONFIG.PITCH_TOP : PITCH_CONFIG.PITCH_BOTTOM;
  const distSqToRivalGoal = distSq(player.x, player.y, rivalGoalX, rivalGoalY);
  const isRelaxed = (difficulty === 'easy' && scoreDiff >= 2) || difficulty === 'standing';

  // =========================================================================
  // 1. BREAKAWAY & 1v1 GOAL-HUNGER ENGINE
  // =========================================================================
  let rivalGK: Player | null = null;
  let hasDefendersAhead = false;

  for (let i = 0; i < allPlayers.length; i++) {
    const opp = allPlayers[i];
    if (opp.team !== player.team) {
      if (opp.role === 'GK') {
        rivalGK = opp;
      } else if (!opp.isRedCarded) {
        const isAheadY = isAttackingUp ? opp.y < player.y - 12 : opp.y > player.y + 12;
        const isNearChannel = Math.abs(opp.x - player.x) < 85;
        if (isAheadY && isNearChannel) {
          hasDefendersAhead = true;
        }
      }
    }
  }

  const inAttackingHalf = isAttackingUp ? player.y < PITCH_CONFIG.CENTER_Y + 70 : player.y > PITCH_CONFIG.CENTER_Y - 70;
  const isBreakaway = inAttackingHalf && !hasDefendersAhead && distSqToRivalGoal < 390 * 390;

  if (isBreakaway) {
    if (distSqToRivalGoal < 240 * 240) {
      const dSqToGK = rivalGK ? distSq(rivalGK.x, rivalGK.y, player.x, player.y) : 999999;
      const isGKRushing = rivalGK
        ? (isAttackingUp ? rivalGK.y > PITCH_CONFIG.PITCH_TOP + 32 : rivalGK.y < PITCH_CONFIG.PITCH_BOTTOM - 32)
        : false;

      if (rivalGK && isGKRushing && dSqToGK < 85 * 85) {
        // 1. Dink Chip Over Rushing Keeper (E + A)
        return {
          action: 'shoot',
          shotType: 'chip',
          targetX: rivalGoalX + (Math.random() - 0.5) * 20,
          targetY: rivalGoalY,
          power: 0.65,
          isAerialLob: true,
        };
      } else if (Math.abs(player.x - PITCH_CONFIG.CENTER_X) > 42) {
        // 2. Curling Finesse Strike bending around keeper
        const targetFarCornerX = player.x < PITCH_CONFIG.CENTER_X
          ? PITCH_CONFIG.CENTER_X + 68
          : PITCH_CONFIG.CENTER_X - 68;
        return {
          action: 'shoot',
          shotType: 'finesse',
          targetX: targetFarCornerX,
          targetY: rivalGoalY + (isAttackingUp ? -10 : 10),
          power: 0.88,
        };
      } else {
        // 3. Driven Rocket into Corners
        const gkSide = rivalGK && rivalGK.x < PITCH_CONFIG.CENTER_X ? 1 : -1;
        const targetCornerX = PITCH_CONFIG.CENTER_X + gkSide * 68;
        return {
          action: 'shoot',
          shotType: 'driven',
          targetX: targetCornerX,
          targetY: rivalGoalY + (isAttackingUp ? -15 : 15),
          power: 0.96,
        };
      }
    } else {
      // Sprint full pace at goal
      moveTowards(player, rivalGoalX, isAttackingUp ? player.y - 120 : player.y + 120, player.stats.sprintSpeed * 1.08, timeScale);
      return null;
    }
  }

  // =========================================================================
  // 2. 4.3.1 DIRECT THREAT & DISTANCE SHOOTING (< 28m / 260px)
  // Opponents recognize shooting within 260px of the net. If unpressed with open line
  // of sight, midfielders and forwards unleash driven shots or bending curlers!
  // =========================================================================
  const distToRivalGoal = Math.sqrt(distSqToRivalGoal);
  const wantsEarlyShoot = tactics?.finalThird === 'early_shoot' || playstyle === 'catenaccio' || playstyle === 'gegenpress';
  const wantsSecureShoot = tactics?.finalThird === 'secure' || playstyle === 'possession' || playstyle === 'arteta_control';
  const maxShootDist = wantsEarlyShoot ? 430 : (wantsSecureShoot ? 240 : 350);

  if (distToRivalGoal < maxShootDist) {
    let isGoalReachable = true;
    for (let i = 0; i < allPlayers.length; i++) {
      const opp = allPlayers[i];
      if (opp.team !== player.team && opp.role !== 'GK') {
        if (distToSegmentSq(opp.x, opp.y, player.x, player.y, rivalGoalX, rivalGoalY) < 24 * 24) {
          isGoalReachable = false;
          break;
        }
      }
    }

    let shotProb = distToRivalGoal < 220 ? 0.48 : (isGoalReachable ? 0.35 : 0.16);
    if (wantsEarlyShoot) shotProb *= 1.45;
    if (wantsSecureShoot && !isGoalReachable) shotProb = 0.05;

    // Trailing late in match: increased killer instinct & long-distance desperation shots
    if (scoreDiff < 0 && matchTimeMinutes > 65) shotProb *= 1.35;

    if (Math.random() < shotProb) {
      const targetCornerX = player.x < PITCH_CONFIG.CENTER_X
        ? PITCH_CONFIG.CENTER_X + 65 + (Math.random() - 0.5) * 20
        : PITCH_CONFIG.CENTER_X - 65 + (Math.random() - 0.5) * 20;
      const shotType: 'driven' | 'finesse' | 'chip' = Math.abs(player.x - PITCH_CONFIG.CENTER_X) > 45 ? 'finesse' : 'driven';
      return {
        action: 'shoot',
        shotType,
        targetX: targetCornerX,
        targetY: rivalGoalY + (isAttackingUp ? -15 : 15),
        power: isRelaxed ? 0.72 : (shotType === 'driven' ? 0.95 : 0.88),
      };
    }
  }

  // =========================================================================
  // 3. CREATION: DIRECT LONG BALL (Route One)
  // =========================================================================
  const prefersLongBall = tactics?.creation === 'long' || playstyle === 'long_ball' || playstyle === 'brexitball';
  if (prefersLongBall && player.role !== 'ST1' && player.role !== 'ST2') {
    let targetStriker: Player | null = null;
    for (let i = 0; i < allPlayers.length; i++) {
      const p = allPlayers[i];
      if (p.team === player.team && (p.role === 'ST1' || p.role === 'ST2') && !p.isRedCarded) {
        targetStriker = p;
        break;
      }
    }
    if (targetStriker && Math.random() < 0.52) {
      return {
        action: 'cross',
        targetX: targetStriker.x + (Math.random() - 0.5) * 25,
        targetY: targetStriker.y + (isAttackingUp ? -35 : 35),
        power: 0.95,
        receiverId: targetStriker.id,
        isAerialLob: true,
      };
    }
  }

  // =========================================================================
  // 4. FINAL THIRD: CROSSING PLAYSTYLE
  // =========================================================================
  const isTrailingLate = playstyle === 'counterattack' && matchTimeMinutes >= 70 && scoreDiff < 0;
  const isWideWing = player.x < PITCH_CONFIG.PITCH_LEFT + 280 || player.x > PITCH_CONFIG.PITCH_RIGHT - 280;
  const isAttackingZone = isAttackingUp
    ? player.y < PITCH_CONFIG.CENTER_Y + 120
    : player.y > PITCH_CONFIG.CENTER_Y - 120;
  const wantsCrossing = tactics?.finalThird === 'crossing' || isTrailingLate || playstyle === 'counterattack' || playstyle === 'long_ball';

  if (isWideWing && (isAttackingZone || isTrailingLate)) {
    const crossProb = wantsCrossing ? 0.52 : (isRelaxed ? 0.08 : 0.24);
    if (Math.random() < crossProb) {
      const penaltyBoxCenterY = isAttackingUp ? PITCH_CONFIG.PITCH_TOP + 170 : PITCH_CONFIG.PITCH_BOTTOM - 170;
      let targetMate: Player | null = null;

      for (let i = 0; i < allPlayers.length; i++) {
        const p = allPlayers[i];
        if (p.team === player.team && p.id !== player.id && p.role !== 'GK') {
          const inBox = Math.abs(p.x - PITCH_CONFIG.CENTER_X) < 260 &&
            (isAttackingUp ? p.y < PITCH_CONFIG.PITCH_TOP + 320 : p.y > PITCH_CONFIG.PITCH_BOTTOM - 320);
          if (inBox) {
            targetMate = p;
            break;
          }
        }
      }

      const targetX = targetMate ? targetMate.x : PITCH_CONFIG.CENTER_X + (Math.random() - 0.5) * 80;
      const targetY = targetMate ? targetMate.y : penaltyBoxCenterY;

      return {
        action: 'cross',
        targetX,
        targetY,
        power: 0.84,
        receiverId: targetMate ? targetMate.id : undefined,
      };
    }
  }

  // =========================================================================
  // 5. SCAN OPPONENT PRESSURE & SKILL MOVES
  // =========================================================================
  let nearestOppDistSq = Infinity;
  let pressingOpp: Player | null = null;
  for (let i = 0; i < allPlayers.length; i++) {
    const opp = allPlayers[i];
    if (opp.team !== player.team && opp.role !== 'GK' && opp.action !== 'fouled_falling' && !opp.isRedCarded) {
      const dSq = distSq(opp.x, opp.y, player.x, player.y);
      if (dSq < nearestOppDistSq) {
        nearestOppDistSq = dSq;
        pressingOpp = opp;
      }
    }
  }

  const isUnderPressure = nearestOppDistSq < 125 * 125;
  const isFacingAwayFromGoal = isAttackingUp ? Math.sin(player.facingAngle) > 0.35 : Math.sin(player.facingAngle) < -0.35;
  const isSkillfulPlayer = (player.stats.dribbling || 70) >= 74 || playstyle === 'jogobonito' || playstyle === 'futbol_champan';

  // 4.3.3 Protecting a lead: shield the ball at touchlines / under heavy contact
  // STRICT REQUIREMENT: Only players with possession of the ball can shield!
  const isProtectingLead = scoreDiff > 0 && matchTimeMinutes > 70;
  if (ball.ownerId === player.id && nearestOppDistSq < 34 * 34 && pressingOpp && (isFacingAwayFromGoal || isProtectingLead || tactics?.shape === 'strict')) {
    if (Math.random() < 0.44 && !player.isShielding) {
      player.isShielding = true;
      player.action = 'shielding';
      player.actionTimer = 24;
      audio.playShoulderHit();
      return null;
    }
  } else if (player.isShielding && (ball.ownerId !== player.id || nearestOppDistSq > 55 * 55)) {
    player.isShielding = false;
    if (player.action === 'shielding') {
      player.action = 'idle';
    }
  }

  // Skill Move (Step-overs / feints):
  if (pressingOpp && nearestOppDistSq < 42 * 42 && isSkillfulPlayer && !player.isStepOverActive) {
    const isOppTackling = pressingOpp.action === 'sliding_tackle' || pressingOpp.action === 'standing_tackle';
    if (isOppTackling || Math.random() < 0.26) {
      executeStepOvers(player, () => {});
      const evadeSide = player.x > pressingOpp.x ? 1 : -1;
      moveTowards(player, player.x + evadeSide * 45, isAttackingUp ? player.y - 45 : player.y + 45, player.stats.sprintSpeed * 0.9, timeScale);
      return null;
    }
  }

  // =========================================================================
  // 6. PHASE 6.1 DECISION-MAKING HIERARCHY & ZERO-HEAP PASSING ENGINE
  // Hierarchy under pressure:
  // 1. Safe progressive pass into free pocket
  // 2. Cross-field switch (Cambio de Frente) when wing is overloaded
  // 3. Controlled clearance only when no progressive option exists in defensive third
  // Eliminates the "20 back-passes between two CBs" loop!
  // =========================================================================
  let bestCandidateIndex = -1;
  let bestCandidateScore = -Infinity;
  let bestCandidateDist = 0;
  let candidateCount = 0;

  const isShortCreation = tactics?.creation === 'short' || playstyle === 'possession' || playstyle === 'arteta_control';
  const inFinalThird = distToRivalGoal < 380;
  const isOwnHalf = isAttackingUp ? player.y > PITCH_CONFIG.CENTER_Y : player.y < PITCH_CONFIG.CENTER_Y;

  // Phase 6.1: Flank Overload Detection
  // Check if ball carrier is wide or in half-space with 2+ opposing defenders crowding the corridor
  const isWideOrHalfSpace = Math.abs(player.x - PITCH_CONFIG.CENTER_X) > 120;
  let flankOpponents = 0;
  if (isWideOrHalfSpace) {
    const isLeftFlank = player.x < PITCH_CONFIG.CENTER_X;
    for (let i = 0; i < allPlayers.length; i++) {
      const opp = allPlayers[i];
      if (opp.team !== player.team && !opp.isRedCarded) {
        const oppOnSameFlank = isLeftFlank ? opp.x < PITCH_CONFIG.CENTER_X : opp.x > PITCH_CONFIG.CENTER_X;
        if (oppOnSameFlank && distSq(opp.x, opp.y, player.x, player.y) < 170 * 170) {
          flankOpponents++;
        }
      }
    }
  }
  const isFlankOverloaded = isWideOrHalfSpace && flankOpponents >= 2;

  for (let i = 0; i < allPlayers.length; i++) {
    const mate = allPlayers[i];
    if (mate.team !== player.team || mate.id === player.id || mate.role === 'GK' || mate.action === 'fouled_falling' || mate.isRedCarded) {
      continue;
    }

    const distSqToMate = distSq(mate.x, mate.y, player.x, player.y);
    if (distSqToMate < 55 * 55 || distSqToMate > 560 * 560) continue;

    // Passing lane ray-cast check
    let isLaneBlocked = false;
    for (let j = 0; j < allPlayers.length; j++) {
      const opp = allPlayers[j];
      if (opp.team !== player.team) {
        if (distToSegmentSq(opp.x, opp.y, player.x, player.y, mate.x, mate.y) < 26 * 26) {
          isLaneBlocked = true;
          break;
        }
      }
    }
    if (isLaneBlocked && isShortCreation) continue;

    // Nearest opponent distance to teammate
    let mateOppDistSq = Infinity;
    for (let j = 0; j < allPlayers.length; j++) {
      const opp = allPlayers[j];
      if (opp.team !== player.team) {
        const dSq = distSq(opp.x, opp.y, mate.x, mate.y);
        if (dSq < mateOppDistSq) mateOppDistSq = dSq;
      }
    }
    if (mateOppDistSq < 32 * 32 && isShortCreation) continue;

    const isAhead = isAttackingUp ? mate.y < player.y - 20 : mate.y > player.y + 20;
    const isBehind = isAttackingUp ? mate.y > player.y + 20 : mate.y < player.y - 20;
    const isLateral = Math.abs(mate.y - player.y) <= 45;

    // Phase 6.1 — Anti-Spam Rule: Eliminate the "20 back-passes between two CBs" loop
    const isPassBackToSender = mate.id === player.lastPassPartnerId;
    const isSameDefensiveLine = (player.role === 'CB1' || player.role === 'CB2' || player.primaryPos === 'DEF') &&
                                (mate.role === 'CB1' || mate.role === 'CB2' || mate.primaryPos === 'DEF');

    if (isPassBackToSender) {
      if (player.consecutiveBackPasses && player.consecutiveBackPasses >= 2) {
        // Strict ban: under pressure or after 2 passes, AI cannot loop back to the same player
        continue;
      }
    }

    const distToMate = Math.sqrt(distSqToMate);
    const mateOppDist = Math.sqrt(mateOppDistSq);

    let score = mateOppDist * 1.5;

    // 1. Safe Progressive Pass into Free Pocket
    const isInPocket = mate.supportRunType === 'drop_pocket' || (mateOppDistSq > 60 * 60 && isAhead);
    if (isAhead) {
      score += inFinalThird ? 280 : 170;
      if (isInPocket) score += 210; // Extra bonus for occupying pockets between lines
    }
    if (isLateral) score += 35;
    if (isBehind) {
      score -= isUnderPressure ? 240 : 80;
    }
    score -= distToMate * 0.20;

    // Center-Backs under pressure: heavily penalize sideways/backward passes to CB/GK, force forward or switch
    if ((player.role === 'CB1' || player.role === 'CB2') && isUnderPressure) {
      if (isSameDefensiveLine) score -= 380;
      else if (isAhead) score += 260;
    }

    if (isPassBackToSender && player.consecutiveBackPasses && player.consecutiveBackPasses >= 1) {
      score -= 420; // Heavy penalty to pass right back to sender
    }

    // 2. Cross-Field Switch ("Cambio de Frente") when flank is overloaded
    const isOppositeFlank = (player.x < PITCH_CONFIG.CENTER_X && mate.x > PITCH_CONFIG.CENTER_X + 100) ||
                           (player.x > PITCH_CONFIG.CENTER_X && mate.x < PITCH_CONFIG.CENTER_X - 100);
    if (isFlankOverloaded && isOppositeFlank && mateOppDistSq > 60 * 60) {
      score += 480; // High incentive to switch play across to open opposite flank!
    }

    // 4.3.2 Fast Vertical Transitions: Heavy forward runner bias when winning ball in own half
    if (isOwnHalf && isAhead && (mate.role === 'ST1' || mate.role === 'ST2' || mate.role === 'LM' || mate.role === 'RM' || mate.primaryPos === 'ATT')) {
      score += 260;
    }

    // Creation bias:
    if (tactics?.creation === 'short') {
      if (distToMate < 180) score += 180;
      else score -= 140;
    } else if (tactics?.creation === 'long') {
      if (distToMate > 240) score += 200;
    }

    if (score > bestCandidateScore) {
      bestCandidateScore = score;
      bestCandidateIndex = i;
      bestCandidateDist = distToMate;
    }

    if (candidateCount < 11) {
      CANDIDATE_TARGETS[candidateCount] = i;
      CANDIDATE_SCORES[candidateCount] = score;
      candidateCount++;
    }
  }

  // 3. Controlled Clearance: Under dangerous pressure in defensive third with no progressive option
  const isDangerousDefensiveThird = isAttackingUp
    ? player.y > PITCH_CONFIG.PITCH_BOTTOM - 290
    : player.y < PITCH_CONFIG.PITCH_TOP + 290;

  if (isDangerousDefensiveThird && isUnderPressure && (bestCandidateIndex < 0 || bestCandidateScore < 100)) {
    // Under severe pressure in defensive box with all forward lanes shut:
    // Execute controlled lofted clearance upfield or toward the touchline!
    const clearSideX = player.x < PITCH_CONFIG.CENTER_X
      ? PITCH_CONFIG.PITCH_LEFT + 120
      : PITCH_CONFIG.PITCH_RIGHT - 120;
    const clearY = isAttackingUp ? player.y - 360 : player.y + 360;
    return {
      action: 'kick',
      targetX: clearSideX,
      targetY: clearY,
      power: 0.92,
    };
  }

  if (bestCandidateIndex >= 0) {
    const mate = allPlayers[bestCandidateIndex];
    const isAhead = isAttackingUp ? mate.y < player.y - 20 : mate.y > player.y + 20;

    let mateOppDistSq = Infinity;
    for (let j = 0; j < allPlayers.length; j++) {
      const opp = allPlayers[j];
      if (opp.team !== player.team) {
        const dSq = distSq(opp.x, opp.y, mate.x, mate.y);
        if (dSq < mateOppDistSq) mateOppDistSq = dSq;
      }
    }

    const isOppositeFlank = (player.x < PITCH_CONFIG.CENTER_X && mate.x > PITCH_CONFIG.CENTER_X + 100) ||
                           (player.x > PITCH_CONFIG.CENTER_X && mate.x < PITCH_CONFIG.CENTER_X - 100);
    const isSwitchPlay = isFlankOverloaded && isOppositeFlank && Math.abs(mate.x - player.x) > 230;

    const hasSeparation = mateOppDistSq > 28 * 28;
    const isCounterOrDirect = playstyle === 'counterattack' || playstyle === 'long_ball' || tactics?.creation === 'long';
    const isPossessionStyle = playstyle === 'possession' || playstyle === 'arteta_control' || playstyle === 'conservative';

    // 4.3.2 AI Through-Ball Engine
    const wantsLongThroughBall = isAhead && (isCounterOrDirect || (hasSeparation && !isPossessionStyle && Math.random() < 0.70));
    const diffPassMultiplier = difficulty === 'legend' ? 1.4 : difficulty === 'elite' ? 1.2 : difficulty === 'normal' ? 1.0 : difficulty === 'easy' ? 0.8 : 0.3;
    const basePassChance = (isShortCreation ? 0.44 : 0.28) * diffPassMultiplier;
    const passTriggerChance = isUnderPressure ? Math.min(0.92, 0.78 * diffPassMultiplier) : (isRelaxed ? 0.10 : basePassChance);

    if (Math.random() < passTriggerChance) {
      // Calculate potential pass error scaled by difficulty and player canonical passing stat
      const pasStat: number = player.canonicalStats && 'pas' in player.canonicalStats ? (player.canonicalStats as { pas: number }).pas : 70;
      const errorSpread = difficulty === 'standing' ? 24 : difficulty === 'easy' ? Math.max(0, (85 - pasStat) * 0.28) : difficulty === 'normal' ? Math.max(0, (75 - pasStat) * 0.12) : 0;
      const errX = errorSpread > 0 ? (Math.random() - 0.5) * errorSpread : 0;
      const errY = errorSpread > 0 ? (Math.random() - 0.5) * errorSpread : 0;

      // Phase 6.1: Cross-field switch of play execution
      if (isSwitchPlay) {
        const leadDist = 26 + Math.min(28, Math.hypot(mate.vx, mate.vy) * 10);
        const switchTargetX = mate.x + (mate.x > player.x ? 1 : -1) * leadDist + errX;
        const switchTargetY = mate.y + (isAttackingUp ? -18 : 18) + errY;
        return {
          action: 'cross',
          targetX: switchTargetX,
          targetY: switchTargetY,
          power: 0.90,
          receiverId: mate.id,
        };
      }

      if (wantsLongThroughBall) {
        // KINETIC ATTACK DRIVER: Lead the runner into space
        const dirY = isAttackingUp ? -1 : 1;
        const leadDist = 48 + Math.min(35, Math.hypot(mate.vx, mate.vy) * 12);
        const leadTargetX = mate.x + Math.cos(mate.facingAngle) * 18 + errX;
        const leadTargetY = mate.y + dirY * leadDist + errY;

        let isGroundLaneContested = false;
        for (let j = 0; j < allPlayers.length; j++) {
          const opp = allPlayers[j];
          if (opp.team !== player.team) {
            if (distToSegmentSq(opp.x, opp.y, player.x, player.y, leadTargetX, leadTargetY) < 32 * 32) {
              isGroundLaneContested = true;
              break;
            }
          }
        }

        const isChipped = isGroundLaneContested || Math.random() < 0.28;
        const isCurved = !isChipped && (Math.abs(leadTargetX - player.x) > 120 && Math.random() < 0.35);

        return {
          action: 'long_pass',
          targetX: leadTargetX,
          targetY: leadTargetY,
          power: Math.min(0.85, Math.max(0.50, bestCandidateDist / 380)),
          receiverId: mate.id,
          isChipped,
          isCurved,
        };
      } else {
        // TEMPO REGULATOR & POSSESSION CALMER
        return {
          action: 'pass',
          targetX: mate.x + errX,
          targetY: mate.y + errY,
          power: Math.min(0.80, Math.max(0.42, bestCandidateDist / 360)),
          receiverId: mate.id,
        };
      }
    }
  }

  // =========================================================================
  // 7. DRIBBLE & SPACE EVASION
  // =========================================================================
  const speedScale = isRelaxed ? 0.65 : (scoreDiff <= -2 ? 0.98 : 0.88);
  let targetX = player.x;
  let targetY = isAttackingUp ? player.y - 120 : player.y + 120;

  // Phase 7: Playstyle Inverted Cut-Inside vs Traditional Flank Drive
  if (player.playstyleId !== undefined) {
    const bias = getPlaystyleBias(player.playstyleId);
    if (bias.cutInsideBias > 1.2) {
      const cutDir = player.x < PITCH_CONFIG.CENTER_X ? 1 : -1;
      targetX = player.x + cutDir * 60;
    } else if (bias.crossBias > 1.3) {
      const touchlineDir = player.x > PITCH_CONFIG.CENTER_X ? 1 : -1;
      targetX = player.x + touchlineDir * 30;
    }
  }

  if (pressingOpp && nearestOppDistSq < 90 * 90) {
    const evadeDir = player.x > pressingOpp.x ? 1 : -1;
    targetX = player.x + evadeDir * 55;
  }

  moveTowards(player, targetX, targetY, player.stats.speed * speedScale, timeScale);
  return null;
}

/**
 * Out-of-Possession Positioning, Dynamic Pressing & Tactical Blocks (4.1, 4.2)
 */
function updateOffTheBallAI(
  player: Player,
  allPlayers: Player[],
  ball: Ball,
  isAttackingUp: boolean,
  teamHasBall: boolean,
  difficulty: DifficultyLevel,
  scoreDiff: number,
  timeScale: number = 1,
  playstyle: TacticalPlaystyle = 'possession',
  matchTimeMinutes: number = 0,
  tactics?: DetailedTactics,
  playerIndex: number = 0,
  frame: number = 0
): AiActionOutput | null {
  // Players without the ball cannot use the shield under any circumstances
  player.isShielding = false;
  if (player.action === 'shielding') {
    player.action = 'idle';
  }

  const distSqToBall = distSq(ball.x, ball.y, player.x, player.y);
  const ballCarrier = allPlayers.find(p => p.id === ball.ownerId);
  const isCarrierGK = ballCarrier && ballCarrier.role === 'GK';

  // 4.4 ZERO HEAP ALLOCATIONS: Rank 1st and 2nd pressers in-place without array allocations
  let firstPresserId: string | null = null;
  let firstPresserDistSq = Infinity;
  let secondPresserId: string | null = null;
  let secondPresserDistSq = Infinity;

  for (let i = 0; i < allPlayers.length; i++) {
    const p = allPlayers[i];
    if (p.team === player.team && p.role !== 'GK' && !p.isRedCarded && p.action !== 'fouled_falling') {
      const dSq = distSq(ball.x, ball.y, p.x, p.y);
      if (dSq < firstPresserDistSq) {
        secondPresserDistSq = firstPresserDistSq;
        secondPresserId = firstPresserId;
        firstPresserDistSq = dSq;
        firstPresserId = p.id;
      } else if (dSq < secondPresserDistSq) {
        secondPresserDistSq = dSq;
        secondPresserId = p.id;
      }
    }
  }

  const is1stPresser = firstPresserId === player.id;
  const is2ndPresser = secondPresserId === player.id;

  // Assign pressRole for visual/tactical diagnostics
  if (is1stPresser) player.pressRole = 'hunter';
  else if (is2ndPresser) player.pressRole = 'trap_closer';
  else player.pressRole = 'cover_shadow';

  // Aggression & Speed Multipliers based on Match Context (4.3.3)
  const isGegenpress = playstyle === 'gegenpress' || tactics?.runs === 'all_attack';
  const isMarkingStyle = tactics?.defensiveStyle === 'marking' || playstyle === 'catenaccio';
  const contextMultiplier = getContextPressMultiplier(scoreDiff, matchTimeMinutes, isGegenpress);

  let speedMultiplier = 0.84 * contextMultiplier;
  let tackleChance = 0.14;

  if (difficulty === 'standing') {
    speedMultiplier = 0;
    tackleChance = 0;
  } else if (difficulty === 'easy') {
    speedMultiplier = 0.78 * contextMultiplier;
    tackleChance = 0.08;
  } else if (difficulty === 'normal') {
    speedMultiplier = 0.95 * contextMultiplier;
    tackleChance = 0.16;
  } else if (difficulty === 'elite') {
    speedMultiplier = 1.08 * contextMultiplier;
    tackleChance = 0.25;
  } else if (difficulty === 'legend') {
    speedMultiplier = 1.18 * contextMultiplier;
    tackleChance = 0.32;
  }

  if (isGegenpress) {
    speedMultiplier = Math.min(1.12, speedMultiplier * 1.12);
    tackleChance *= 1.35;
  } else if (isMarkingStyle) {
    tackleChance *= 1.45;
  }

  // Phase 6.3: Canonical Defender Attributes & Clean Tackling
  const tck = getPlayerTCK(player);
  const pos = getPlayerPOS(player);
  const isGoodDefender = tck >= 72 && pos >= 70;

  // =========================================================================
  // A. DEFENSE: PHASE 6.4 MODERN 1-2 MARKER PRESSING INTENSITY & RECOVERY RUNS
  // Opponent ball-carrier always feels 1-2 markers within realistic distance.
  // Good defenders preferentially use standing tackles & toe-pokes;
  // sliding tackles reserved strictly for last-ditch or specific aggressive philosophies.
  // =========================================================================
  if (!teamHasBall && !isCarrierGK) {
    const rivalCarrier = ballCarrier && ballCarrier.team !== player.team && !ballCarrier.isRedCarded ? ballCarrier : null;

    // Emergency Last-Ditch situation: Rival carrier threatens penalty area with direct goal route
    const carrierGoalDistSq = rivalCarrier
      ? distSq(rivalCarrier.x, rivalCarrier.y, PITCH_CONFIG.CENTER_X, isAttackingUp ? PITCH_CONFIG.PITCH_BOTTOM : PITCH_CONFIG.PITCH_TOP)
      : Infinity;
    const isLastDitch = rivalCarrier !== null && carrierGoalDistSq < 280 * 280 && distSqToBall > 25 * 25 && distSqToBall < 48 * 48;
    const isAggressivePhilosophy = isGegenpress || playstyle === 'brexitball' || tactics?.runs === 'all_attack' || tactics?.defensiveStyle === 'marking';

    // Sliding tackles reserved for last-ditch or specific aggressive philosophies:
    const prefersSlideTackle = (isLastDitch || (isAggressivePhilosophy && Math.random() < 0.22) || (scoreDiff <= -1 && matchTimeMinutes > 75 && Math.random() < 0.20)) && (!isGoodDefender || isLastDitch);

    // 4.1.1 1st Presser Engagement (The Hunter)
    if (is1stPresser) {
      // Tactical Foul Check (Futbol Champan / Argentine Style)
      if (
        playstyle === 'futbol_champan' &&
        !player.hasYellowCard &&
        rivalCarrier &&
        Math.abs(rivalCarrier.x - PITCH_CONFIG.CENTER_X) < 260 &&
        distSqToBall < 30 * 30 &&
        Math.random() < 0.28
      ) {
        return { action: 'tactical_foul' };
      }

      // Phase 6.3: Clean Standing Tackle & Toe-Pokes preferentially used by good defenders
      if (rivalCarrier && distSqToBall < 28 * 28 && ball.z < 25) {
        if (prefersSlideTackle && Math.random() < tackleChance * 0.40) {
          return { action: 'slide' };
        } else if (Math.random() < tackleChance) {
          return { action: 'tackle' };
        }
      }

      // Dynamic Closure Speed & Angle: Interception vector cut across forward stride
      const pressSpeed = player.stats.sprintSpeed * speedMultiplier;
      if (rivalCarrier && distSqToBall > 45 * 45) {
        const intercept = calculateInterceptionVector(player, rivalCarrier, 7);
        moveTowards(player, intercept.targetX, intercept.targetY, pressSpeed, timeScale);
      } else {
        // Containment buffer (<= 45px): active jockeying stance with standing tackle readiness
        moveTowards(player, ball.x, ball.y, pressSpeed * 0.95, timeScale);
      }
      return null;
    }

    // Phase 6.4: 2nd Presser (The Trap Closer / Double-Team Pincer)
    // In modern football, the opponent in possession always feels 1-2 markers within realistic distance!
    if (is2ndPresser && difficulty !== 'standing') {
      const pressIntensityTier = difficulty === 'legend' ? 1.05 : difficulty === 'elite' ? 0.95 : difficulty === 'normal' ? 0.82 : 0.55;

      // Calculate pincer vector: approach from opposite flank to trap and cut exit lane
      const trapOffsetX = rivalCarrier ? (rivalCarrier.x > player.x ? -26 : 26) : 0;
      const trapOffsetY = rivalCarrier ? (isAttackingUp ? 20 : -20) : 0;
      const trapTargetX = ball.x + trapOffsetX;
      const trapTargetY = ball.y + trapOffsetY;

      if (rivalCarrier && distSqToBall < 26 * 26 && ball.z < 25) {
        if (prefersSlideTackle && Math.random() < tackleChance * 0.35) {
          return { action: 'slide' };
        } else if (Math.random() < tackleChance) {
          return { action: 'tackle' };
        }
      }

      const pressSpeed = player.stats.sprintSpeed * speedMultiplier * pressIntensityTier;
      moveTowards(player, trapTargetX, trapTargetY, pressSpeed, timeScale);
      return null;
    }
  }

  // =========================================================================
  // 2. PHASE 9: AERIAL ANTICIPATION, DROP-ZONE PREDICTION & TIMED STRIKES (9.1, 9.2)
  // =========================================================================
  if (ball.isAirborne && (ball.z > 2.0 || ball.vz > 0.4)) {
    // 9.1 Drop-Zone Simulation: Forward ballistic projection
    const dropZone = calculateBallDropZone(ball, 13);
    const pos = getPlayerPOS(player);
    const awarenessDelay = calculateAerialAwarenessDelay(pos, difficulty);
    player.aerialAwarenessTimer = (player.aerialAwarenessTimer || 0) + timeScale;

    if (player.aerialAwarenessTimer >= awarenessDelay) {
      player.aerialDropTargetX = dropZone.landingX;
      player.aerialDropTargetY = dropZone.landingY;

      const distToLandingSq = distSq(player.x, player.y, dropZone.landingX, dropZone.landingY);
      const isDefender = player.role === 'CB1' || player.role === 'CB2' || player.role === 'LB' || player.role === 'RB' || player.primaryPos === 'DEF';

      // If player is in vicinity of the aerial landing zone (< 320px)
      if (distToLandingSq < 320 * 320) {
        let aerialRunTargetX = dropZone.landingX;
        let aerialRunTargetY = dropZone.landingY;

        if (isDefender) {
          // Interceptions (INT) attribute: cut off trajectory in front of forward
          const intStat = player.canonicalStats && 'int' in player.canonicalStats ? player.canonicalStats.int : 70;
          const intLeadBias = calculateAerialInterceptionBias(intStat);
          const cutOffDirY = isAttackingUp ? intLeadBias : -intLeadBias;
          aerialRunTargetY += cutOffDirY;
        }

        const runSpeed = player.stats.sprintSpeed * (difficulty === 'legend' ? 1.15 : (difficulty === 'elite' ? 1.05 : 0.95));
        moveTowards(player, aerialRunTargetX, aerialRunTargetY, runSpeed, timeScale);
      }
    }

    // 9.2 Timed Strike Execution (within contact window)
    if (distSqToBall < 34 * 34 && ball.z >= 3.0 && ball.z <= 42) {
      const hea = player.canonicalStats && 'hea' in player.canonicalStats ? player.canonicalStats.hea : 75;
      const sho = player.canonicalStats && 'sho' in player.canonicalStats ? player.canonicalStats.sho : 75;
      const rea = getPlayerREA(player);
      const isDefZone = isAttackingUp ? player.y > PITCH_CONFIG.CENTER_Y : player.y < PITCH_CONFIG.CENTER_Y;
      const isDefender = player.role === 'CB1' || player.role === 'CB2' || player.role === 'LB' || player.role === 'RB' || player.primaryPos === 'DEF';

      if (ball.z >= 10.5) {
        // Aerial Header Execution
        const timingWindow = calculateAerialTimingWindow(rea, hea, false);
        const contactQuality = evaluateAerialContactQuality(ball.z, Math.sqrt(distSqToBall), timingWindow);
        if (contactQuality !== 'mistimed' || Math.random() < 0.28) {
          let headerType: 'bullet' | 'diving' | 'glancing' | 'clearance' = 'heading' as any;
          if (isDefender && isDefZone) {
            headerType = 'clearance';
          } else if (ball.z > 14 && Math.random() < 0.65) {
            headerType = 'bullet';
          } else if (ball.z <= 16 && Math.random() < 0.45) {
            headerType = 'diving';
          } else {
            headerType = 'glancing';
          }
          return { action: 'header', headerType };
        }
      } else if (ball.z >= 3.0) {
        // Aerial Volley Execution
        const timingWindow = calculateAerialTimingWindow(rea, sho, true);
        const contactQuality = evaluateAerialContactQuality(ball.z, Math.sqrt(distSqToBall), timingWindow);
        if (contactQuality !== 'mistimed' || Math.random() < 0.28) {
          let volleyType: 'half_volley' | 'side_volley' | 'diving_volley' | 'bicycle' | 'rustic_clearance' = 'side_volley';
          if (isDefender && isDefZone) {
            volleyType = 'rustic_clearance';
          } else if (ball.z <= 6.8) {
            volleyType = 'half_volley';
          } else if (Math.hypot(player.vx, player.vy) > 1.8) {
            volleyType = 'diving_volley';
          }
          return { action: 'volley', volleyType };
        }
      }
    }
  } else {
    player.aerialAwarenessTimer = 0;
  }

  // =========================================================================
  // 3. PHASE 9.3: REBOUND & SECOND-BALL REFLEXES
  // =========================================================================
  const isLooseRebound = !ball.ownerId && (ball.isDividedBall || ball.isSecondBall || ball.isRebound || (ball.z < 8 && Math.hypot(ball.vx, ball.vy) < 11.0));
  if (isLooseRebound) {
    const rea = getPlayerREA(player);
    const secondBallDelay = calculateSecondBallReactionDelay(rea, difficulty);
    player.secondBallReactTimer = (player.secondBallReactTimer || 0) + timeScale;

    if (player.secondBallReactTimer >= secondBallDelay) {
      const distToLooseSq = distSq(player.x, player.y, ball.x, ball.y);
      if (distToLooseSq < 260 * 260) {
        player.isPursuingRebound = true;
        const isDefender = player.role === 'CB1' || player.role === 'CB2' || player.role === 'LB' || player.role === 'RB' || player.primaryPos === 'DEF';
        const isAttacker = player.role === 'ST1' || player.role === 'ST2' || player.primaryPos === 'ATT';
        const isAttZone = isAttackingUp ? player.y < PITCH_CONFIG.PITCH_TOP + 280 : player.y > PITCH_CONFIG.PITCH_BOTTOM - 280;
        const isDefZone = isAttackingUp ? player.y > PITCH_CONFIG.PITCH_BOTTOM - 280 : player.y < PITCH_CONFIG.PITCH_TOP + 280;

        // Higher difficulty AI wins a larger share of second balls through immediate burst acceleration
        if ((difficulty === 'legend' || difficulty === 'elite') && distToLooseSq < 150 * 150 && (!player.dashTimer || player.dashTimer <= 0)) {
          player.dashTimer = difficulty === 'legend' ? 18 : 12;
        }

        const sprintSpeed = player.stats.sprintSpeed * (difficulty === 'legend' ? 1.18 : (difficulty === 'elite' ? 1.08 : 0.95));
        moveTowards(player, ball.x, ball.y, sprintSpeed, timeScale);

        // Immediate first-time touch on loose ball in high-leverage areas
        if (distToLooseSq < 24 * 24 && ball.z < 18) {
          if (isAttacker && isAttZone) {
            if (ball.z > 3.0) {
              return { action: 'volley', volleyType: 'half_volley' };
            } else {
              const targetGoalY = isAttackingUp ? PITCH_CONFIG.PITCH_TOP : PITCH_CONFIG.PITCH_BOTTOM;
              return { action: 'shoot', shotType: 'driven', targetX: PITCH_CONFIG.CENTER_X, targetY: targetGoalY, power: 0.92 };
            }
          } else if (isDefender && isDefZone) {
            if (ball.z > 3.0) {
              return { action: 'volley', volleyType: 'rustic_clearance' };
            } else {
              return { action: 'kick' };
            }
          }
        }
        return null;
      }
    }
  } else {
    player.secondBallReactTimer = 0;
    player.isPursuingRebound = false;
  }

  // =========================================================================
  // B. TACTICAL DEFENSIVE LINE & COMPACTNESS (4.1.3)
  // Defensive Block Depths:
  // - High Press: steps aggressively to halfway line (Y ≈ 620px)
  // - Mid-Block: compact 180px vertical lock, Zone 14 screening
  // - Low Block: back four anchors at 18-yard box boundary
  // =========================================================================
  // =========================================================================
  // B. TACTICAL DEFENSIVE LINE & COMPACTNESS (Phase 4: Modern Compact Foundation)
  // Utilizes Phase 4 Synchronised Modern Compact Block Shape Target
  // =========================================================================
  const fieldW = PITCH_CONFIG.FIELD_WIDTH;
  const fieldH = PITCH_CONFIG.FIELD_HEIGHT;
  const anchorX = PITCH_CONFIG.PITCH_LEFT + player.baseX * fieldW;
  const anchorY = PITCH_CONFIG.PITCH_TOP + player.baseY * fieldH;

  const compactnessLevel = tactics?.compactness ?? 2;
  const widthScaleMap = [1.12, 0.95, 0.78, 0.60];
  const widthScale = widthScaleMap[compactnessLevel - 1] ?? 0.95;

  let targetX = player.tacticalTargetX ?? (PITCH_CONFIG.CENTER_X + (anchorX - PITCH_CONFIG.CENTER_X) * widthScale);
  let targetY = player.tacticalTargetY ?? anchorY;

  const isDefender = player.role === 'CB1' || player.role === 'CB2' || player.role === 'LB' || player.role === 'RB';
  const isMidfielder = player.role === 'CM1' || player.role === 'CM2' || player.role === 'LM' || player.role === 'RM';
  const isForward = player.role === 'ST1' || player.role === 'ST2';

  if (!teamHasBall) {
    // -----------------------------------------------------------------------
    // DEFENSE WITHOUT BALL
    // -----------------------------------------------------------------------
    // Fallback calculation if tactical block was not pre-computed
    if (player.tacticalTargetX === undefined || player.tacticalTargetY === undefined) {
      const defLineLevel = tactics?.defensiveLine ?? 3;
      const fwdSign = isAttackingUp ? -1 : 1;
      const targetSpanPx = 30 * (fieldH / 105);
      const defLineY = isAttackingUp
        ? PITCH_CONFIG.PITCH_BOTTOM - (34 + (defLineLevel - 3) * 4) * (fieldH / 105)
        : PITCH_CONFIG.PITCH_TOP + (34 + (defLineLevel - 3) * 4) * (fieldH / 105);
      if (isDefender) targetY = defLineY;
      else if (isMidfielder) targetY = defLineY + fwdSign * (targetSpanPx * 0.48);
      else targetY = defLineY + fwdSign * targetSpanPx;
    }

    // -----------------------------------------------------------------------
    // DEFENSIVE STYLE: MARKING vs MIXED vs ZONAL (with Cover Shadows 4.1.2)
    // -----------------------------------------------------------------------
    const defStyle = tactics?.defensiveStyle || 'mixed';

    if (defStyle === 'marking') {
      let assignedOpp: Player | null = null;
      let minDistanceSq = Infinity;

      for (let i = 0; i < allPlayers.length; i++) {
        const opp = allPlayers[i];
        if (opp.team !== player.team && opp.role !== 'GK') {
          let roleMatch = false;
          if ((player.role === 'CB1' || player.role === 'CB2') && (opp.role === 'ST1' || opp.role === 'ST2')) roleMatch = true;
          if (player.role === 'LB' && (opp.role === 'RM' || opp.role === 'ST2')) roleMatch = true;
          if (player.role === 'RB' && (opp.role === 'LM' || opp.role === 'ST1')) roleMatch = true;
          if (isMidfielder && (opp.role === 'CM1' || opp.role === 'CM2' || opp.role === 'LM' || opp.role === 'RM')) roleMatch = true;

          const dSq = distSq(opp.x, opp.y, player.x, player.y);
          if (roleMatch && dSq < 260 * 260) {
            assignedOpp = opp;
            break;
          }
          if (dSq < minDistanceSq && dSq < 200 * 200) {
            minDistanceSq = dSq;
            assignedOpp = opp;
          }
        }
      }

      if (assignedOpp) {
        const goalSideY = isAttackingUp ? 22 : -22;
        // Blend marking position with compact block shape so defenders preserve unit spacing
        targetX = targetX * 0.35 + assignedOpp.x * 0.65;
        targetY = targetY * 0.35 + (assignedOpp.y + goalSideY) * 0.65;
      }
    } else if (defStyle === 'mixed') {
      // 4.1.2 Mixed: Outfield defenders not engaging carrier calculate cover shadows scaled by difficulty
      if (ballCarrier && !is1stPresser && !is2ndPresser) {
        const shadow = findCoverShadowTarget(player, ballCarrier, allPlayers, isAttackingUp);
        if (shadow) {
          const shadowWeight = difficulty === 'legend' ? 0.88 : difficulty === 'elite' ? 0.75 : difficulty === 'normal' ? 0.60 : difficulty === 'easy' ? 0.35 : 0;
          targetX = (targetX * (1 - shadowWeight)) + (shadow.x * shadowWeight);
          targetY = (targetY * (1 - shadowWeight)) + (shadow.y * shadowWeight);
        }
      }
    } else {
      // Zonal: Squeeze toward central channel and maintain block between ball and goal
      const squeezeTightness = difficulty === 'legend' ? 0.90 : difficulty === 'elite' ? 0.82 : difficulty === 'normal' ? 0.75 : 0.65;
      const toCenterDist = targetX - PITCH_CONFIG.CENTER_X;
      targetX = PITCH_CONFIG.CENTER_X + toCenterDist * squeezeTightness;
      const ballToGoalY = isAttackingUp ? Math.min(ball.y + 40, targetY) : Math.max(ball.y - 40, targetY);
      targetY = (targetY * 0.6) + (ballToGoalY * 0.4);
    }

    // Phase 5.1 & 5.2 Forward Line Intermingling & Active Shadowing:
    // Out-of-possession forwards occupy opposition CBs and screen the holding midfielder (pivot)
    if ((isForward || player.primaryPos === 'ATT') && !is1stPresser && !is2ndPresser) {
      const fwdShadow = calculateForwardShadowingTarget(player, allPlayers, isAttackingUp);
      if (fwdShadow.shadowTargetId) {
        targetX = fwdShadow.targetX;
        targetY = fwdShadow.targetY;
        player.coverShadowTargetId = fwdShadow.shadowTargetId;
        player.pressRole = 'cover_shadow';
      }
    }

    // Phase 5.2 Center-Back Step Out vs Hold The Line:
    // Destroyer / high-aggression CBs jump out of the line to challenge receivers in the hole
    if ((player.role === 'CB1' || player.role === 'CB2' || player.subPos === 'CB') && !is1stPresser && !is2ndPresser) {
      const stepOut = evaluateDefenderStepOut(player, allPlayers, ball, isAttackingUp);
      if (stepOut.shouldStepOut) {
        targetX = stepOut.stepTargetX;
        targetY = stepOut.stepTargetY;
        player.isSteppingOut = true;
      } else {
        player.isSteppingOut = false;
      }
    }
  } else {
    // -----------------------------------------------------------------------
    // OFFENSE WITH BALL: REST-DEFENCE (4.3) & PASSING TRIANGLES (4.2)
    // -----------------------------------------------------------------------
    if (player.isRestDefence) {
      // 4.3 Rest-Defence security behind ball
      targetX = player.tacticalTargetX ?? targetX;
      targetY = player.tacticalTargetY ?? targetY;
    } else if (ballCarrier && ballCarrier.id !== player.id) {
      // 4.2.1 & Phase 5.2 Support Phase calculation: Deep Buildup, Midfield Progression, Final Third Overloads
      const support = calculateSupportVector(player, ballCarrier, allPlayers, allPlayers, isAttackingUp, playstyle, tactics);
      targetX = support.targetX;
      targetY = support.targetY;
      player.supportRunType = support.runType;

      // 4.2.2 Passing Lane Raycast Evaluation:
      // If opponent obstructs lane (< 35px), take explosive 2-3 steps into open passing channel!
      const unobstructed = findUnobstructedPassingTarget(player, ballCarrier, allPlayers, isAttackingUp);
      if (unobstructed.isObstructed) {
        targetX = unobstructed.targetX;
        targetY = unobstructed.targetY;
        player.isSignalingForPass = true;
        player.signalPassTimer = 35;
      }
    } else {
      // Fallback offensive runs if carrier not yet resolved
      const runsConfig = tactics?.runs || 'moderate';
      let runForwardDistance = 0;
      if (runsConfig === 'all_attack') {
        if (isForward) runForwardDistance = 160;
        else if (isMidfielder) runForwardDistance = 130;
        else if (player.role === 'LB' || player.role === 'RB') runForwardDistance = 80;
      } else if (runsConfig === 'moderate') {
        if (isForward) runForwardDistance = 140;
        else if (player.role === 'LM' || player.role === 'RM') runForwardDistance = 110;
        else if (isMidfielder) runForwardDistance = 50;
      } else if (runsConfig === 'low') {
        if (isForward) runForwardDistance = 120;
      }

      const runY = isAttackingUp ? -runForwardDistance : runForwardDistance;
      targetY += runY;
    }
  }

  // Phase 5.3 Difficulty-Scaled Anticipation & Attribute Modulation (POS & REA)
  const modulated = applyAnticipationAndAttributeVariance(targetX, targetY, player, difficulty, ball, frame);
  targetX = modulated.x;
  targetY = modulated.y;

  // Pitch boundary clamping
  targetX = Math.max(PITCH_CONFIG.PITCH_LEFT + 30, Math.min(PITCH_CONFIG.PITCH_RIGHT - 30, targetX));
  targetY = Math.max(PITCH_CONFIG.PITCH_TOP + 40, Math.min(PITCH_CONFIG.PITCH_BOTTOM - 40, targetY));

  // Strict boundary check: CBs never stand on the goal line!
  if (player.role === 'CB1' || player.role === 'CB2') {
    if (!isAttackingUp) targetY = Math.max(PITCH_CONFIG.PITCH_TOP + 140, targetY);
    else targetY = Math.min(PITCH_CONFIG.PITCH_BOTTOM - 140, targetY);
  }

  // Cache computed tactical target for 60 FPS locomotion
  player.targetX = targetX;
  player.targetY = targetY;

  // Phase 6.4: Transition Recovery Runs
  // When possession is lost and player is caught ahead of their tactical defensive depth:
  const isCaughtHigh = !teamHasBall && (isAttackingUp ? player.y < targetY - 55 : player.y > targetY + 55);
  let speed: number;
  if (isCaughtHigh && (isMidfielder || isForward)) {
    player.isRecoverySprinting = true;
    speed = player.stats.sprintSpeed * 1.06 * speedMultiplier;
  } else {
    player.isRecoverySprinting = false;
    speed = distSqToBall < 140 * 140 ? player.stats.sprintSpeed * speedMultiplier * 0.90 : player.stats.speed * speedMultiplier;
  }
  moveTowards(player, targetX, targetY, speed, timeScale);

  return null;
}

/**
 * Computes the optimal tactical position for a player based on role, formation, ball location, and defensive shape.
 */
export function getOptimalTacticalPosition(
  player: Player,
  allPlayers: Player[],
  ball: Ball,
  isAttackingUp: boolean,
  playstyle: TacticalPlaystyle = 'possession',
  tactics?: DetailedTactics
): { x: number; y: number } {
  const fieldW = PITCH_CONFIG.FIELD_WIDTH;
  const fieldH = PITCH_CONFIG.FIELD_HEIGHT;
  const anchorX = PITCH_CONFIG.PITCH_LEFT + player.baseX * fieldW;
  const anchorY = PITCH_CONFIG.PITCH_TOP + player.baseY * fieldH;

  const resolvedTactics = tactics || getDefaultTactics(playstyle);
  const defLineLevel = resolvedTactics.defensiveLine;
  const compLevel = resolvedTactics.compactness;

  const widthScaleMap = [1.12, 0.95, 0.78, 0.60];
  const widthScale = widthScaleMap[compLevel - 1] ?? 0.95;

  let targetX = player.tacticalTargetX ?? (PITCH_CONFIG.CENTER_X + (anchorX - PITCH_CONFIG.CENTER_X) * widthScale + (ball.x - PITCH_CONFIG.CENTER_X) * 0.25 * widthScale);
  let targetY = player.tacticalTargetY ?? anchorY;
  const isDefender = player.role === 'CB1' || player.role === 'CB2' || player.role === 'LB' || player.role === 'RB' || player.primaryPos === 'DEF';
  const isMid = player.role === 'CM1' || player.role === 'CM2' || player.role === 'LM' || player.role === 'RM' || player.primaryPos === 'MID';
  const isAtt = !isDefender && !isMid && player.role !== 'GK';

  if (player.tacticalTargetY === undefined) {
    const fwdSign = isAttackingUp ? -1 : 1;
    const targetSpanPx = 30 * (fieldH / 105);
    const defLineY = isAttackingUp
      ? PITCH_CONFIG.PITCH_BOTTOM - (34 + (defLineLevel - 3) * 4) * (fieldH / 105)
      : PITCH_CONFIG.PITCH_TOP + (34 + (defLineLevel - 3) * 4) * (fieldH / 105);
    if (isDefender) {
      targetY = defLineY;
    } else if (player.subPos === 'CAM' || player.subPos === 'SS') {
      targetY = defLineY + fwdSign * (targetSpanPx * 0.72);
    } else if (isMid) {
      targetY = defLineY + fwdSign * (targetSpanPx * 0.48);
    } else {
      targetY = defLineY + fwdSign * targetSpanPx;
    }
  }

  // Phase 7: Behavioral Bias Multipliers (O(1) in-place scalar arithmetic)
  if (player.playstyleId !== undefined) {
    const bias = getPlaystyleBias(player.playstyleId);

    // 1. Horizontal Cut-Inside vs Stay-Wide Touchline Bias
    if (bias.cutInsideBias > 1.15) {
      // Inverted wingers / attackers pull inside towards half-spaces
      const centerPull = (PITCH_CONFIG.CENTER_X - targetX) * 0.24 * (bias.cutInsideBias - 1.0);
      targetX += centerPull;
    } else if (bias.crossBias > 1.25) {
      // Traditional wingers hug touchlines
      const flankPush = targetX > PITCH_CONFIG.CENTER_X ? 35 : -35;
      targetX += flankPush;
    }

    // 2. Vertical Forward Run / Track-Back Bias
    const teamHasBall = allPlayers.some(p => p.team === player.team && ball.ownerId === p.id);
    if (teamHasBall) {
      const forwardDelta = (isAttackingUp ? -1 : 1) * 38 * (bias.forwardRunBias - 1.0);
      targetY += forwardDelta;
      // Box-to-Box & Shadow Strikers crash the box during attacking phases
      if (bias.boxArrivalBias > 1.25 && (isAttackingUp ? ball.y < PITCH_CONFIG.CENTER_Y + 100 : ball.y > PITCH_CONFIG.CENTER_Y - 100)) {
        const boxSurge = (isAttackingUp ? -1 : 1) * 50;
        targetY += boxSurge;
      }
    } else {
      // Defending phase: track-back or hold anchor zone
      const trackBackDelta = (isAttackingUp ? 1 : -1) * 32 * (bias.trackBackBias - 1.0);
      targetY += trackBackDelta;
      // Destroyer centerbacks step out aggressively to challenge
      if (bias.stepOutBias > 1.25 && isDefender) {
        const stepOutDelta = (isAttackingUp ? -1 : 1) * 35;
        targetY += stepOutDelta;
      }
    }
  }

  // Pitch boundary clamping
  const pad = 30;
  targetX = Math.max(PITCH_CONFIG.PITCH_LEFT + pad, Math.min(PITCH_CONFIG.PITCH_RIGHT - pad, targetX));
  targetY = Math.max(PITCH_CONFIG.PITCH_TOP + pad, Math.min(PITCH_CONFIG.PITCH_BOTTOM - pad, targetY));

  return { x: targetX, y: targetY };
}

/**
 * Calculates distance from a point (px, py) to a line segment (x1, y1) -> (x2, y2)
 */
export function distanceToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt(distToSegmentSq(px, py, x1, y1, x2, y2));
}

/**
 * Moves player toward a target coordinate with realistic acceleration and facing direction
 */
export function moveTowards(player: Player, targetX: number, targetY: number, targetSpeed: number, timeScale: number = 1) {
  const dx = targetX - player.x;
  const dy = targetY - player.y;
  const distSqVal = dx * dx + dy * dy;

  if (distSqVal < 9) { // < 3px
    player.vx = 0;
    player.vy = 0;
    player.action = 'idle';
    return;
  }

  const dist = Math.sqrt(distSqVal);
  const speed = Math.min(targetSpeed, dist * 0.5);
  const targetVx = (dx / dist) * speed;
  const targetVy = (dy / dist) * speed;

  const accel = PHYSICS.ACCELERATION * timeScale;
  player.vx += (targetVx - player.vx) * accel;
  player.vy += (targetVy - player.vy) * accel;

  player.x += player.vx * timeScale;
  player.y += player.vy * timeScale;

  player.facingAngle = Math.atan2(player.vy, player.vx);
  updateFacingDirection(player);

  player.action = 'running';
  player.animTimer = (player.animTimer || 0) + 1;
  if (player.animTimer > 6) {
    player.animTimer = 0;
    player.animFrame = ((player.animFrame || 0) + 1) % 4;
  }
}

/**
 * Updates 8-way facing direction based on facing angle (or optional dx/dy vector)
 */
export function updateFacingDirection(player: Player, dx?: number, dy?: number) {
  if (dx !== undefined && dy !== undefined && (dx !== 0 || dy !== 0)) {
    player.facingAngle = Math.atan2(dy, dx);
  }

  let angle = player.facingAngle;
  while (angle < 0) angle += Math.PI * 2;
  while (angle >= Math.PI * 2) angle -= Math.PI * 2;

  const octant = Math.round((angle / (Math.PI * 2)) * 8) % 8;
  switch (octant) {
    case 0: player.facingDir = 'right'; break;
    case 1: player.facingDir = 'down-right'; break;
    case 2: player.facingDir = 'down'; break;
    case 3: player.facingDir = 'down-left'; break;
    case 4: player.facingDir = 'left'; break;
    case 5: player.facingDir = 'up-left'; break;
    case 6: player.facingDir = 'up'; break;
    case 7: player.facingDir = 'up-right'; break;
  }
}

/**
 * Offside Rule Engine:
 * Evaluates whether receiver was in an offside position at the exact frame the pass was played.
 */
export function evaluateOffside(
  passingPlayer: Player,
  receiverPlayer: Player | null,
  passTargetX: number,
  passTargetY: number,
  allPlayers: Player[],
  isAttackingUp: boolean
): { isOffside: boolean; spotX: number; spotY: number; defensiveLineY: number } {
  if (!receiverPlayer) {
    return { isOffside: false, spotX: passTargetX, spotY: passTargetY, defensiveLineY: 0 };
  }

  const receiverX = receiverPlayer.x;
  const receiverY = receiverPlayer.y;

  // 1. Must be in opponent's half
  const inOpponentHalf = isAttackingUp
    ? receiverY < PITCH_CONFIG.CENTER_Y - 5
    : receiverY > PITCH_CONFIG.CENTER_Y + 5;

  if (!inOpponentHalf) {
    return { isOffside: false, spotX: receiverX, spotY: receiverY, defensiveLineY: 0 };
  }

  // 2. Must be ahead of passing player/ball
  const ballY = passingPlayer.y;
  const isAheadOfBall = isAttackingUp
    ? receiverY < ballY - 5
    : receiverY > ballY + 5;

  if (!isAheadOfBall) {
    return { isOffside: false, spotX: receiverX, spotY: receiverY, defensiveLineY: 0 };
  }

  // 3. Find 2nd-last opponent Y coordinate
  const opponents = allPlayers.filter(p => p.team !== passingPlayer.team && !p.isRedCarded);
  if (opponents.length < 2) {
    return { isOffside: false, spotX: receiverX, spotY: receiverY, defensiveLineY: 0 };
  }

  opponents.sort((a, b) => isAttackingUp ? a.y - b.y : b.y - a.y);
  const secondLastOpponent = opponents[1];
  const defLineY = secondLastOpponent.y;

  const isAheadOfDefense = isAttackingUp
    ? receiverY < defLineY - 8
    : receiverY > defLineY + 8;

  if (isAheadOfDefense) {
    return {
      isOffside: true,
      spotX: receiverX,
      spotY: receiverY,
      defensiveLineY: defLineY,
    };
  }

  return { isOffside: false, spotX: receiverX, spotY: receiverY, defensiveLineY: defLineY };
}
