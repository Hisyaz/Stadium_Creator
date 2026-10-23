/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Ball, Player, TeamSide } from '../types';
import { PITCH_CONFIG, HOME_KIT, AWAY_KIT } from './constants';
import { PitchCrossingResult } from './pitchBoundary';
import { audio } from './audio';

export interface SetPieceAward {
  type: 'throw_in' | 'corner_kick' | 'goal_kick';
  awardedTeam: TeamSide;
  defendingTeam?: TeamSide;
  spotX: number;
  spotY: number;
  banner: string;
  reason: string;
}

/**
 * Strict Last-Touch Attribution Rules:
 * - Touchline (Sideline): Always awards a Throw-In to the opponent of lastTouchTeam.
 * - Endline (Goal line):
 *   - Defending team touched last (deflection, block, GK tip) -> Corner Kick for attacking team.
 *   - Attacking team touched last (off-target shot, overhit pass) -> Goal Kick for defending team.
 */
export function determineOutOfBoundsAward(
  crossing: PitchCrossingResult,
  ball: Ball,
  homeKitName: string = HOME_KIT.name.toUpperCase(),
  awayKitName: string = AWAY_KIT.name.toUpperCase(),
  homeAttacksUp: boolean = true
): SetPieceAward | null {
  if (!crossing.hasExited || crossing.isGoalMouthEntrance) {
    return null;
  }

  const lastTouch = ball.lastTouchTeam;

  // 1. SIDELINE (TOUCHLINE) EXITS -> THROW-IN
  if (crossing.type === 'touchline_left' || crossing.type === 'touchline_right') {
    const isLeft = crossing.type === 'touchline_left';
    const spotX = isLeft ? PITCH_CONFIG.PITCH_LEFT + 8 : PITCH_CONFIG.PITCH_RIGHT - 8;
    const spotY = Math.max(
      PITCH_CONFIG.PITCH_TOP + 45,
      Math.min(PITCH_CONFIG.PITCH_BOTTOM - 45, crossing.crossingY)
    );

    // Rule: Award throw-in to opponent of last touch team
    let awardedTeam: TeamSide;
    if (lastTouch === 'home') {
      awardedTeam = 'away';
    } else if (lastTouch === 'away') {
      awardedTeam = 'home';
    } else {
      // Fallback if untouched: based on ball horizontal/vertical velocity
      awardedTeam = ball.vy < 0 ? 'away' : 'home';
    }

    const teamName = awardedTeam === 'home' ? homeKitName : awayKitName;
    return {
      type: 'throw_in',
      awardedTeam,
      spotX,
      spotY,
      banner: `THROW-IN FOR ${teamName}`,
      reason: `Ball crossed ${isLeft ? 'left' : 'right'} touchline; last touched by ${lastTouch || 'unknown'}`,
    };
  }

  // 2. TOP ENDLINE (GOAL LINE) EXITS
  // Attacking team towards top goal is: Home (if homeAttacksUp) else Away
  // Defending team at top goal is: Away (if homeAttacksUp) else Home
  if (crossing.type === 'endline_top') {
    const isLeftCorner = crossing.crossingX < PITCH_CONFIG.CENTER_X;
    const defendingSide: TeamSide = homeAttacksUp ? 'away' : 'home';
    const attackingSide: TeamSide = homeAttacksUp ? 'home' : 'away';
    const attackingKitName = attackingSide === 'home' ? homeKitName : awayKitName;
    const defendingKitName = defendingSide === 'home' ? homeKitName : awayKitName;

    if (lastTouch === defendingSide) {
      // Defending team touched last -> CORNER KICK for attacking team!
      const cornerX = isLeftCorner ? PITCH_CONFIG.PITCH_LEFT + 8 : PITCH_CONFIG.PITCH_RIGHT - 8;
      const cornerY = PITCH_CONFIG.PITCH_TOP + 8;
      return {
        type: 'corner_kick',
        awardedTeam: attackingSide,
        defendingTeam: defendingSide,
        spotX: cornerX,
        spotY: cornerY,
        banner: `CORNER KICK FOR ${attackingKitName}!`,
        reason: `Ball crossed top endline off defending team (${defendingKitName} deflection/save)`,
      };
    } else {
      // Attacking team kicked it out over rival endline -> GOAL KICK for defending team!
      const spotX = PITCH_CONFIG.CENTER_X - 35;
      const spotY = PITCH_CONFIG.PITCH_TOP + 45;
      return {
        type: 'goal_kick',
        awardedTeam: defendingSide,
        defendingTeam: defendingSide,
        spotX,
        spotY,
        banner: `GOAL KICK FOR ${defendingKitName}`,
        reason: `Ball crossed top endline off attacking team (${attackingKitName} off-target/overhit)`,
      };
    }
  }

  // 3. BOTTOM ENDLINE (GOAL LINE) EXITS
  // Attacking team towards bottom goal is: Away (if homeAttacksUp) else Home
  // Defending team at bottom goal is: Home (if homeAttacksUp) else Away
  if (crossing.type === 'endline_bottom') {
    const isLeftCorner = crossing.crossingX < PITCH_CONFIG.CENTER_X;
    const defendingSide: TeamSide = homeAttacksUp ? 'home' : 'away';
    const attackingSide: TeamSide = homeAttacksUp ? 'away' : 'home';
    const attackingKitName = attackingSide === 'home' ? homeKitName : awayKitName;
    const defendingKitName = defendingSide === 'home' ? homeKitName : awayKitName;

    if (lastTouch === defendingSide) {
      // Defending team touched last -> CORNER KICK for attacking team!
      const cornerX = isLeftCorner ? PITCH_CONFIG.PITCH_LEFT + 8 : PITCH_CONFIG.PITCH_RIGHT - 8;
      const cornerY = PITCH_CONFIG.PITCH_BOTTOM - 8;
      return {
        type: 'corner_kick',
        awardedTeam: attackingSide,
        defendingTeam: defendingSide,
        spotX: cornerX,
        spotY: cornerY,
        banner: `CORNER KICK FOR ${attackingKitName}!`,
        reason: `Ball crossed bottom endline off defending team (${defendingKitName} deflection/save)`,
      };
    } else {
      // Attacking team kicked it out over rival endline -> GOAL KICK for defending team!
      const spotX = PITCH_CONFIG.CENTER_X - 35;
      const spotY = PITCH_CONFIG.PITCH_BOTTOM - 45;
      return {
        type: 'goal_kick',
        awardedTeam: defendingSide,
        defendingTeam: defendingSide,
        spotX,
        spotY,
        banner: `GOAL KICK FOR ${defendingKitName}`,
        reason: `Ball crossed bottom endline off attacking team (${attackingKitName} off-target/overhit)`,
      };
    }
  }

  return null;
}

export type ParryResult =
  | { outcome: 'none' }
  | { outcome: 'caught'; banner: string }
  | { outcome: 'tipped_over_bar'; banner: string }
  | { outcome: 'parried_wide'; banner: string };

/**
 * Goalkeeper Saves, Tips & Deflection Resolution:
 * Evaluates whether an incoming shot is caught clean or parried/tipped over the bar
 * or around the post. Crucially flags ball.lastTouchTeam = defendingTeam so any ensuing
 * endline crossing properly awards a Corner Kick.
 */
export function processGoalkeeperShotReaction(
  gk: Player,
  ball: Ball,
  distToBall: number,
  isAttackingUp: boolean
): ParryResult {
  // If goalkeeper is on release cooldown or already has the ball
  if (gk.gkHoldTimer && gk.gkHoldTimer < 0) return { outcome: 'none' };
  if (ball.ownerId === gk.id) return { outcome: 'none' };

  const ballSpeed = Math.hypot(ball.vx, ball.vy);
  const isHighPower = ballSpeed > 7.5 || ball.isOverpowered || ball.isKnuckle;
  const isHighBall = ball.z > 24;
  const isDivingStretch = distToBall > 24;

  // Phase 2: Delicate Chip Shot over rushing Goalkeeper
  // If the shot is a chip and the Goalkeeper is charging out or ball has height over GK
  const isChipShot = !!ball.isChipped && (ball.chipType === 'shot' || ball.lastKickAction === 'shoot');
  if (isChipShot) {
    const goalLineY = gk.team === 'home' ? PITCH_CONFIG.PITCH_BOTTOM : PITCH_CONFIG.PITCH_TOP;
    const distToGoalLine = Math.abs(gk.y - goalLineY);
    const isGkRushingOut = distToGoalLine > 26 || Math.hypot(gk.vx, gk.vy) > 0.7 || gk.action === 'goalkeeper_dive';

    if (isGkRushingOut || ball.z > 20) {
      // Ball cleanly floats over the rushing Goalkeeper's outstretched reach!
      return {
        outcome: 'none',
      };
    }
  }

  const gkHan = gk.canonicalStats && 'han' in gk.canonicalStats ? gk.canonicalStats.han : 75;
  const gkSav = gk.canonicalStats && 'sav' in gk.canonicalStats ? gk.canonicalStats.sav : 75;
  const hasMagneticClaws = gkHan > 99;
  const hasSpidermanLeap = gkSav > 99;

  // ⚡ Case 3 Conflict Check: Deadly Assassin (Attacker SHO > 99) vs Spiderman Leap (GK SAV > 99)
  if (ball.isDeadlyAssassin) {
    const goalX = PITCH_CONFIG.CENTER_X;
    const postDistLeft = Math.abs(ball.x - (goalX - PITCH_CONFIG.GOAL_WIDTH / 2));
    const postDistRight = Math.abs(ball.x - (goalX + PITCH_CONFIG.GOAL_WIDTH / 2));
    const distToPost = Math.min(postDistLeft, postDistRight);
    if (distToPost <= 8) {
      // Postage Stamp Strike! Unreachable even for Spiderman Leap!
      return { outcome: 'none' };
    }
  }

    // Special Goalkeeper Action Intercepts (Star Spread & Punch Clear)
    if (gk.action === 'gk_punch') {
      // Intentional two-fist punch clear
      ball.ownerId = null;
      ball.lastTouchTeam = gk.team;
      ball.lastTouchPlayerId = gk.id;
      ball.isAirborne = true;
      ball.isDividedBall = true;
      ball.isSecondBall = true;
      ball.isRebound = true;
      const punchDirX = ball.x < PITCH_CONFIG.CENTER_X ? -1 : 1;
      ball.vx = punchDirX * (8.5 + Math.random() * 4.0);
      ball.vy = isAttackingUp ? 6.5 : -6.5;
      ball.vz = 4.2;
      audio.playKick(0.9);
      return {
        outcome: 'parried_wide',
        banner: `${gk.name.toUpperCase()} PUNCHES THE BALL POWERFULLY AWAY! [E PUNCH]`,
      };
    }

    if (gk.action === 'gk_star_spread') {
      // 1v1 Star Spread: Wide body barrier blocking close-range shots
      ball.ownerId = null;
      ball.lastTouchTeam = gk.team;
      ball.lastTouchPlayerId = gk.id;
      ball.isAirborne = false;
      ball.isDividedBall = true;
      ball.isSecondBall = true;
      ball.isRebound = true;
      const reboundDirX = (Math.random() - 0.5) * 6.0;
      ball.vx = reboundDirX;
      ball.vy = isAttackingUp ? 4.5 : -4.5;
      ball.vz = 1.0;
      audio.playKick(0.8);
      return {
        outcome: 'parried_wide',
        banner: `1v1 STAR SPREAD BLOCK BY ${gk.name.toUpperCase()}! [W BLOCK]`,
      };
    }

    // Catch Slip Check: If shot has extreme velocity (> 14 px/f) or heavy curve (> 4.5), ball may slip from gloves
    const isViolentShot = isHighPower || (ball.spin && Math.abs(ball.spin) > 4.5);
    const slipChance = isViolentShot ? Math.max(0.15, (100 - gkHan) / 100) : 0;
    const doesCatchSlip = !hasMagneticClaws && Math.random() < slipChance;

    if (doesCatchSlip && gk.action === 'gk_high_catch') {
      // Ball slips from hands on violent high-velocity catch attempt
      ball.ownerId = null;
      ball.lastTouchTeam = gk.team;
      ball.lastTouchPlayerId = gk.id;
      ball.isAirborne = true;
      ball.isDividedBall = true;
      ball.isSecondBall = true;
      ball.isRebound = true;
      ball.vx = (Math.random() - 0.5) * 5.0;
      ball.vy = isAttackingUp ? 3.0 : -3.0;
      ball.vz = 2.0;
      audio.playKick(0.7);
      return {
        outcome: 'parried_wide',
        banner: `SHOT WAS TOO POWERFUL! BALL SLIPS FROM ${gk.name.toUpperCase()}'S GLOVES!`,
      };
    }

    // Option A: Clean catch into chest hands (Magnetic Claws catches everything!)
    if (hasMagneticClaws || (!isHighPower && !isHighBall && !isDivingStretch && distToBall < 26 && ball.z < 28) || (gk.action === 'gk_high_catch' && !doesCatchSlip)) {
      ball.ownerId = gk.id;
      ball.lastTouchTeam = gk.team;
      ball.lastTouchPlayerId = gk.id;
      ball.vx = 0;
      ball.vy = 0;
      ball.vz = 0;
      ball.z = 10;
      ball.isAirborne = false;
      ball.isDividedBall = false;

      // Phase 8.6: Low Smothered Catch on low driven balls
      if (ball.z < 10 || isHighPower) {
        gk.action = 'gk_low_smother';
        gk.actionTimer = 22;
        gk.animFrame = 0;
      } else {
        gk.action = 'idle';
        gk.actionTimer = 0;
      }

      gk.gkHoldTimer = 0;
      audio.playKick(0.75);
      if (hasMagneticClaws) audio.playStatBreakChime();
      return {
        outcome: 'caught',
        banner: hasMagneticClaws
          ? `⚡ MAGNETIC CLAWS! ${gk.name.toUpperCase()} ABSORBS STRIKE CLEANLY! [STAT BREAK]`
          : `${gk.name.toUpperCase()} CATCHES THE BALL SECURELY!`,
      };
    }

    // Option B: Fingertip Tip Over the Crossbar! (Spiderman Leap reach extension!)
    const maxTipDist = hasSpidermanLeap ? 44 : 26;
    if ((isHighBall || ball.z > 14 || hasSpidermanLeap) && distToBall <= maxTipDist) {
      ball.ownerId = null;
      ball.lastTouchTeam = gk.team; // Defending GK touched it!
      ball.lastTouchPlayerId = gk.id;
      ball.isAirborne = true;
      ball.isDividedBall = true;
      ball.isSecondBall = true;
      ball.isRebound = true;

      // Phase 8.6: Full-extension fingertip corner parry diving leap
      gk.action = 'gk_fingertip_parry';
      gk.actionTimer = 26;
      gk.animFrame = 0;
      gk.diveX = (ball.x - gk.x) * 0.25;
      gk.diveY = (isAttackingUp ? 1 : -1) * 2.6;

      // Upward deflection trajectory tipping over the crossbar
      ball.vz = Math.max(3.8, Math.abs(ball.vz) * 0.8 + 2.4);
      // Continue moving backward past the goal line
      ball.vy = isAttackingUp ? Math.max(3.5, ball.vy * 0.45) : Math.min(-3.5, ball.vy * 0.45);
      ball.vx *= 0.6;
      audio.playKick(0.85);
      if (hasSpidermanLeap) audio.playStatBreakChime();

      const banner = hasSpidermanLeap
        ? `⚡ SPIDERMAN LEAP! ${gk.name.toUpperCase()} TIPS OVER THE BAR! [STAT BREAK]`
        : `${gk.name.toUpperCase()} TIPS IT OVER THE CROSSBAR!`;
      return { outcome: 'tipped_over_bar', banner };
    }

    // Option C: Acrobatic Parry Wide Past the Goalpost / Leaping Punch!
    ball.ownerId = null;
    ball.lastTouchTeam = gk.team; // Defending GK touched it!
    ball.lastTouchPlayerId = gk.id;
    ball.isAirborne = true;
    ball.isDividedBall = true;
    ball.isSecondBall = true;
    ball.isRebound = true;

    // Deflect ball wide towards the nearest touchline/post
    const deflectDirX = ball.x < PITCH_CONFIG.CENTER_X ? -1 : 1;
    ball.vx = deflectDirX * Math.max(5.2, Math.abs(ball.vx) + 2.2);
    ball.vy = isAttackingUp ? Math.max(1.8, ball.vy * 0.35) : Math.min(-1.8, ball.vy * 0.35);
    ball.vz = Math.max(1.2, ball.vz * 0.4 + 1.0);
    audio.playKick(0.85);

    // Phase 8.6: Double-Fist / Single-Hand Punch vs Full-Extension Parry
    if (ball.z > 16 || isHighPower) {
      gk.action = 'gk_punch';
      gk.actionTimer = 22;
      gk.animFrame = 0;
      gk.diveX = deflectDirX * 1.8;
      gk.diveY = (isAttackingUp ? 0.5 : -0.5);
    } else {
      gk.action = 'gk_fingertip_parry';
      gk.actionTimer = 24;
      gk.animFrame = 0;
      gk.diveX = deflectDirX * 3.2;
      gk.diveY = (isAttackingUp ? 0.8 : -0.8);
    }

    const banner = `${gk.name.toUpperCase()} PARRIES WIDE PAST THE POST!`;
    return { outcome: 'parried_wide', banner };
}

/**
 * Outfield Defender Shot Blocking:
 * Detects if a defending outfield player physically blocks or deflects a shot in flight.
 * Sets lastTouchTeam = defender.team. If ball then crosses touchline or endline,
 * set piece rules are correctly attributed.
 */
export function checkOutfieldDefenderShotBlock(
  defenders: Player[],
  ball: Ball
): Player | null {
  // Only applies to flying shots, crosses, or fast balls
  const ballSpeed = Math.hypot(ball.vx, ball.vy);
  if (ballSpeed < 3.2 && !ball.isAirborne) return null;
  if (ball.ownerId !== null) return null;
  if (ball.lastTouchTeam === null) return null;

  for (const def of defenders) {
    if (def.role === 'GK') continue; // Goalkeeper handled by specialist reaction
    if (def.team === ball.lastTouchTeam) continue; // Friendly teammates don't block friendly shots
    if (def.action === 'fouled_falling' || def.isRedCarded) continue;

    const dist = Math.hypot(ball.x - def.x, ball.y - def.y);
    const isWallJump = def.action === 'wall_jump';
    const minBlockZ = isWallJump ? 10 : 0; // Jumping wall defenders leave turf; low driven balls skim beneath them!
    const maxBlockZ = def.action === 'heading' || isWallJump ? 44 : 24;

    if (dist < 20 && ball.z >= minBlockZ && ball.z <= maxBlockZ) {
      // Clean body/shin block!
      ball.ownerId = null;
      ball.lastTouchTeam = def.team;
      ball.lastTouchPlayerId = def.id;
      ball.isDividedBall = true;
      ball.isSecondBall = true;
      ball.isRebound = true;

      // Deflection ricochet angle
      const ricochetAngle = Math.atan2(ball.vy, ball.vx) + Math.PI + (Math.random() - 0.5) * 1.4;
      const reboundSpeed = Math.max(3.2, ballSpeed * 0.48);
      ball.vx = Math.cos(ricochetAngle) * reboundSpeed;
      ball.vy = Math.sin(ricochetAngle) * reboundSpeed;
      ball.vz = Math.random() * 2.2 + 0.5;
      audio.playKick(0.8);

      return def;
    }
  }

  return null;
}
