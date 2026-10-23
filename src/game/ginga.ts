import { Player, Ball, KeyState, TeamSide } from '../types';
import { PITCH_CONFIG, HOME_KIT } from './constants';
import { audio } from './audio';
import { t } from './i18n';
import { normalizeAngle } from './skills';
import { calculateAerialTimingWindow, evaluateAerialContactQuality } from './playerStats';

/**
 * Normalizes input direction from arrow keys or player facing angle
 */
export function getArrowDirection(keys: KeyState, fallbackAngle: number): { x: number; y: number; hasInput: boolean } {
  let dx = 0;
  let dy = 0;
  if (keys.ArrowLeft) dx -= 1;
  if (keys.ArrowRight) dx += 1;
  if (keys.ArrowUp) dy -= 1;
  if (keys.ArrowDown) dy += 1;

  if (dx !== 0 || dy !== 0) {
    const len = Math.hypot(dx, dy);
    return { x: dx / len, y: dy / len, hasInput: true };
  }

  return {
    x: Math.cos(fallbackAngle),
    y: Math.sin(fallbackAngle),
    hasInput: false,
  };
}

/**
 * Checks if the ball is within aerial hitting range of the player
 */
export function isBallInAirVolleyRange(player: Player, ball: Ball): { inRange: boolean; dist: number; z: number } {
  const dist = Math.hypot(ball.x - player.x, ball.y - player.y);
  return {
    inRange: dist < 32 && ball.z >= 3.5,
    dist,
    z: ball.z,
  };
}

/**
 * Main Ginga Update Loop:
 * Handles:
 * 1. Spacebar hold charging (< 1.8s lifts ball; > 1.8s overcooks uncontrollably)
 * 2. Sombrero flick over defender if arrow is pressed
 * 3. Lift in place and juggling rhythm if no arrow is pressed
 * 4. Repeating spacebar before ball hits ground to sustain Ginga combo
 */
export function updateGingaSystem(
  player: Player,
  ball: Ball,
  keys: KeyState,
  allPlayers: Player[],
  setBanner: (msg: string, timer?: number) => void
): void {
  // If player lost possession or ball grounded while juggling
  if (player.gingaActive && (!ball.isAirborne || ball.z <= 0.5)) {
    player.gingaActive = false;
    player.gingaCombo = 0;
  }

  // Check if player has the ball or is directly over it
  const isOwner = ball.ownerId === player.id;
  const distToBall = Math.hypot(ball.x - player.x, ball.y - player.y);
  const isBallNear = distToBall < 22;

  // ----------------------------------------------------
  // PHASE 8.3: GINGA ATTRIBUTE THRESHOLDS (BCL & DRI)
  // Effective only with Ball Control >= 70 AND Dribbling >= 70.
  // At 90+ on both attributes it becomes highly reliable (Master Class).
  // Below 70 on either attribute: high failure / loss-of-possession chance.
  // ----------------------------------------------------
  const bcl = player.canonicalStats && 'bcl' in player.canonicalStats ? player.canonicalStats.bcl : 70;
  const dri = player.canonicalStats && 'dri' in player.canonicalStats ? player.canonicalStats.dri : 70;
  const isGingaQualified = bcl >= 70 && dri >= 70;
  const isGingaMaster = bcl >= 90 && dri >= 90;

  // ----------------------------------------------------
  // 1. SPACEBAR PRESSED & HELD (Charging Ginga Lift)
  // ----------------------------------------------------
  if (keys.Space) {
    // If player has the ball on ground or is in juggling range
    if ((isOwner && ball.z < 6) || (isBallNear && ball.z < 6 && !ball.ownerId)) {
      player.isGingaLifting = true;
      player.gingaHoldTimer = (player.gingaHoldTimer || 0) + 1;

      // Overlift check: 1.8 seconds at 60fps is 108 frames
      // "if you press it longer than 1.8 seconds you send it too far to control it"
      if (player.gingaHoldTimer >= 108) {
        // OVERCOOKED! Ball blasted uncontrollably into the distance!
        ball.ownerId = null;
        ball.isAirborne = true;
        ball.z = 10;
        ball.vz = 9.2;
        const blastAngle = player.facingAngle + (Math.random() - 0.5) * 0.8;
        ball.vx = Math.cos(blastAngle) * 9.5;
        ball.vy = Math.sin(blastAngle) * 9.5;
        ball.lastTouchPlayerId = player.id;
        ball.lastTouchTeam = player.team;

        player.isGingaLifting = false;
        player.gingaHoldTimer = 0;
        player.gingaActive = false;
        player.gingaCombo = 0;
        player.action = 'idle';

        audio.playOverpoweredKick();
        setBanner(t('gingaOverlift'), 100);
        return;
      }
    } else if (player.gingaActive && ball.isAirborne && ball.z > 2.0 && isBallNear) {
      // Sub-threshold fumble check during mid-air juggling (80% failure if unqualified)
      if (!isGingaQualified && Math.random() < 0.80) {
        ball.ownerId = null;
        ball.vz = 0.5;
        ball.vx = (Math.random() - 0.5) * 3.5;
        ball.vy = (Math.random() - 0.5) * 3.5;
        player.gingaActive = false;
        player.gingaCombo = 0;
        player.action = 'trapping';
        player.actionTimer = 20;
        audio.playVolleyMiss();
        setBanner(t('gingaFailedThreshold'), 85);
        return;
      }

      // Special acrobatic tricks while juggling:
      if (keys.KeyQ && player.action !== 'around_the_world') {
        // AROUND THE WORLD (ATW): 360 degree leg revolution around airborne ball
        player.action = 'around_the_world';
        player.actionTimer = isGingaMaster ? 20 : 26;
        player.animFrame = 0;
        player.gingaCombo = (player.gingaCombo || 0) + 2;
        ball.vz = isGingaMaster ? 2.8 : 2.4;
        audio.playAcrobaticStrike();
        setBanner(isGingaMaster ? `${t('gingaMasterClass')} - ${t('aroundTheWorld')} x${player.gingaCombo}!` : `${t('aroundTheWorld')} x${player.gingaCombo}!`, 75);
      } else if (keys.KeyE && player.action !== 'elastico') {
        // SAMBA ELASTICO AIRBORNE FLICK
        player.action = 'elastico';
        player.actionTimer = isGingaMaster ? 18 : 22;
        player.animFrame = 0;
        player.gingaCombo = (player.gingaCombo || 0) + 1;
        ball.vz = isGingaMaster ? 2.5 : 2.2;
        ball.vx = Math.cos(player.facingAngle) * (isGingaMaster ? 2.8 : 2.2);
        ball.vy = Math.sin(player.facingAngle) * (isGingaMaster ? 2.8 : 2.2);
        audio.playGingaLift();
        setBanner(isGingaMaster ? `${t('gingaMasterClass')} - ${t('elasticoMove')} x${player.gingaCombo}!` : `${t('elasticoMove')} x${player.gingaCombo}!`, 70);
      } else if (!player.isGingaLifting) {
        // Tapping spacebar while juggling in the air!
        player.isGingaLifting = true;
        // Keep the juggle going with dynamic rhythm (thighs, instep, head balance)!
        ball.vz = 2.6 + Math.random() * 0.9;
        ball.vx = (Math.random() - 0.5) * 0.5;
        ball.vy = (Math.random() - 0.5) * 0.5;
        player.gingaCombo = (player.gingaCombo || 0) + 1;
        player.action = 'ginga_juggle';
        player.animFrame = ((player.animFrame || 0) + 1) % 4;
        player.actionTimer = isGingaMaster ? 18 : 22;
        audio.playGingaLift();
        const comboBanner = isGingaMaster && player.gingaCombo >= 3
          ? `${t('gingaMasterClass')} x${player.gingaCombo}!`
          : `${t('gingaJuggle')} x${player.gingaCombo}!`;
        setBanner(comboBanner, 50);
      }
    }
  }

  // ----------------------------------------------------
  // 2. SPACEBAR RELEASED (Execute Lift or Sombrero)
  // ----------------------------------------------------
  else if (player.isGingaLifting) {
    const holdFrames = player.gingaHoldTimer || 1;
    player.isGingaLifting = false;
    player.gingaHoldTimer = 0;

    // Check Phase 8.3 Ginga Threshold failure:
    // Below 70 BCL or DRI -> 75% to 85% chance of scuffing/fumbling the lift!
    if (!isGingaQualified) {
      const failChance = Math.max(0.70, 1.0 - ((bcl + dri) / 140) * 0.40);
      if (Math.random() < failChance) {
        // Fumbled lift! Ball bobs off cleats into loose turf
        ball.ownerId = null;
        ball.isAirborne = true;
        ball.z = 2.0;
        ball.vz = 1.3;
        const errAngle = player.facingAngle + (Math.random() - 0.5) * 1.6;
        ball.vx = Math.cos(errAngle) * (2.4 + Math.random() * 2.2);
        ball.vy = Math.sin(errAngle) * (2.4 + Math.random() * 2.2);
        ball.lastTouchPlayerId = player.id;
        ball.lastTouchTeam = player.team;

        player.gingaActive = false;
        player.gingaCombo = 0;
        player.action = 'trapping';
        player.actionTimer = 22;
        player.stumbleTimer = 24;
        player.stumbleReason = 'Ginga Threshold';

        audio.playVolleyMiss();
        setBanner(t('gingaFailedThreshold'), 90);
        return;
      }
    }

    // Calculate lift height ratio (from 0 to 1, capped at 90 frames / 1.5s)
    const holdRatio = Math.min(1.0, Math.max(0.15, holdFrames / 85));
    const arrow = getArrowDirection(keys, player.facingAngle);

    // Release ball from magnetic lock
    ball.ownerId = null;
    ball.isAirborne = true;
    ball.lastTouchPlayerId = player.id;
    ball.lastTouchTeam = player.team;

    if (arrow.hasInput) {
      // --------------------------------------------------
      // SOMBRERO FLICK IN ARROW DIRECTION & SURGE PAST
      // "if you press the arrow you throw it in that direction and your player follows it,
      // you can do sombreros on defenders"
      // --------------------------------------------------
      const masterSpeedMult = isGingaMaster ? 1.15 : 1.0;
      const flickSpeed = (4.2 + holdRatio * 2.8) * masterSpeedMult;
      const flickVz = (3.6 + holdRatio * 2.8) * (isGingaMaster ? 1.08 : 1.0);

      ball.vx = arrow.x * flickSpeed;
      ball.vy = arrow.y * flickSpeed;
      ball.vz = flickVz;
      ball.z = 4;

      player.facingAngle = Math.atan2(arrow.y, arrow.x);
      player.action = 'sombrero';
      player.actionTimer = isGingaMaster ? 20 : 24;
      // Player accelerates dynamically onto the flicked ball
      const sprintSpeedMult = isGingaMaster ? 1.48 : 1.32;
      player.vx = arrow.x * (player.stats.sprintSpeed * sprintSpeedMult);
      player.vy = arrow.y * (player.stats.sprintSpeed * sprintSpeedMult);
      player.dashTimer = isGingaMaster ? 28 : 24;

      // Look for rival defenders directly in the flick trajectory to sombrero
      let sombreroedDefender: Player | null = null;
      for (const opp of allPlayers) {
        if (opp.team !== player.team && opp.action !== 'fouled_falling') {
          const toOppX = opp.x - player.x;
          const toOppY = opp.y - player.y;
          const dist = Math.hypot(toOppX, toOppY);
          if (dist > 10 && dist < (isGingaMaster ? 75 : 65)) {
            // Check dot product with flick direction
            const dot = (toOppX * arrow.x + toOppY * arrow.y) / dist;
            if (dot > 0.60) {
              sombreroedDefender = opp;
              break;
            }
          }
        }
      }

      if (sombreroedDefender) {
        sombreroedDefender.confusedTimer = isGingaMaster ? 140 : 110;
        sombreroedDefender.action = 'idle';
        sombreroedDefender.vx *= 0.1;
        sombreroedDefender.vy *= 0.1;
        audio.playSombreroCheer();
        setBanner(isGingaMaster ? `${t('gingaMasterClass')} - ${t('sombreroOverDefender')}` : t('sombreroOverDefender'), 100);
      } else {
        audio.playGingaLift();
        setBanner(isGingaMaster ? `${t('gingaMasterClass')} - ${t('sombreroFlick')}` : t('sombreroFlick'), 75);
      }

      player.gingaActive = false;
      player.gingaCombo = 0;
    } else {
      // --------------------------------------------------
      // LIFT IN PLACE & ENTER GINGA JUGGLING
      // "if you're not pressing an arrow you just lift it in place"
      // --------------------------------------------------
      const liftVz = 2.4 + holdRatio * 3.4;
      ball.vx = 0;
      ball.vy = 0;
      ball.vz = liftVz;
      ball.z = 3;

      player.gingaActive = true;
      player.gingaCombo = 1;
      player.action = 'ginga_juggle';
      player.actionTimer = isGingaMaster ? 20 : 25;

      audio.playGingaLift();
      setBanner(isGingaMaster ? `${t('gingaMasterClass')} - ${t('gingaLift')}` : t('gingaLift'), 85);
    }
  }
}

/**
 * Handles Volleys and Acrobatic Strikes (Bicycle, Scissor, Scorpion, Crisp Volleys):
 * Triggered when pressing Shoot (A), Pass (S), Long Pass (W), or Cross (D) near an airborne ball.
 */
export function tryExecuteVolley(
  player: Player,
  ball: Ball,
  actionType: 'shoot' | 'pass' | 'long_pass' | 'cross',
  powerFraction: number,
  keys: KeyState,
  targetPos: { x: number; y: number } | null,
  setBanner: (msg: string, timer?: number) => void
): boolean {
  const dist = Math.hypot(ball.x - player.x, ball.y - player.y);
  const rea = player.canonicalStats && 'rea' in player.canonicalStats ? player.canonicalStats.rea : 75;
  const sho = player.canonicalStats && 'sho' in player.canonicalStats ? player.canonicalStats.sho : 75;
  const timingWindow = calculateAerialTimingWindow(rea, sho, true);

  if (dist > timingWindow.maxReachDist) return false;

  const contactQuality = evaluateAerialContactQuality(ball.z, dist, timingWindow);

  // Phase 9.2: Timing window check
  // If ball is outside acceptable vertical window or out of reach, scuffed miss!
  if (contactQuality === 'mistimed') {
    // MISTIMED MISS! Player scuffs into grass / air
    player.action = 'kicking';
    player.actionTimer = 20;
    ball.vx *= 0.25;
    ball.vy *= 0.25;
    audio.playVolleyMiss();
    setBanner(t('volleyMiss'), 75);
    return true;
  }

  // Calculate target angle
  let angle = player.facingAngle;
  if (targetPos) {
    angle = Math.atan2(targetPos.y - player.y, targetPos.x - player.x);
  } else {
    // Aim at rival top goal for shoot/cross by default
    const rivalGoalY = player.team === 'home' ? PITCH_CONFIG.PITCH_TOP : PITCH_CONFIG.PITCH_BOTTOM;
    angle = Math.atan2(rivalGoalY - player.y, PITCH_CONFIG.CENTER_X - player.x);
  }

  // Angle difference between player facing and ball position
  const angleToBall = Math.atan2(ball.y - player.y, ball.x - player.x);
  const angleDiff = Math.abs(normalizeAngle(angleToBall - player.facingAngle));
  const isBehind = angleDiff > 1.85;

  let power = Math.max(0.35, Math.min(1.0, powerFraction));
  power *= timingWindow.powerMultiplier;
  if (contactQuality === 'sweet_spot') {
    power *= 1.18;
  }
  const isMovingForward = Math.hypot(player.vx, player.vy) > 1.8;

  // Determine flair or crisp volley modifier:
  let strikeType:
    | 'scorpion'
    | 'bicycle'
    | 'scissor'
    | 'diving_volley'
    | 'side_volley'
    | 'half_volley'
    | 'chest_volley'
    | 'rabona_volley'
    | 'flying_heel_volley'
    | 'sombrero_volley'
    | 'crisp_volley'
    | 'standard_volley';

  if (keys.KeyQ) {
    // Flair strikes
    if (isBehind && ball.z >= 10) {
      strikeType = 'scorpion';
    } else if (isBehind && ball.z < 10) {
      strikeType = 'flying_heel_volley';
    } else if (ball.z > 17) {
      strikeType = 'bicycle';
    } else if (actionType === 'shoot' && Math.abs(normalizeAngle(angle - player.facingAngle)) > 0.8) {
      strikeType = 'rabona_volley';
    } else if (ball.z >= 10) {
      strikeType = 'scissor';
    } else {
      strikeType = 'side_volley';
    }
  } else if (keys.KeyE) {
    // Controlled crisp strikes
    if (ball.z >= 13 && ball.z <= 20) {
      strikeType = 'chest_volley';
    } else if (ball.z < 7.5) {
      strikeType = 'half_volley';
    } else {
      strikeType = 'crisp_volley';
    }
  } else {
    // Context-sensitive natural volley selection
    if (player.action === 'sombrero' || player.gingaActive) {
      strikeType = 'sombrero_volley';
    } else if (isMovingForward && ball.z >= 4.5 && ball.z <= 14) {
      strikeType = 'diving_volley';
    } else if (ball.z < 6.8) {
      strikeType = 'half_volley';
    } else if (ball.z > 17.5) {
      strikeType = 'bicycle';
    } else if (ball.z >= 9 && ball.z <= 17) {
      strikeType = 'side_volley';
    } else {
      strikeType = 'standard_volley';
    }
  }

  // Release possession and assign touch
  ball.ownerId = null;
  ball.isAirborne = true;
  ball.lastTouchPlayerId = player.id;
  ball.lastTouchTeam = player.team;
  player.gingaActive = false;
  player.gingaCombo = 0;

  if (strikeType === 'scorpion') {
    // SCORPION KICK
    player.action = 'scorpion_kick';
    player.actionTimer = 26;
    player.animFrame = 0;
    const speed = 7.8 + power * 5.0;
    ball.vx = Math.cos(player.facingAngle) * speed;
    ball.vy = Math.sin(player.facingAngle) * speed;
    ball.vz = 2.4;
    ball.spin = (Math.random() - 0.5) * 4;
    audio.playAcrobaticStrike();
    setBanner(t('scorpionKick'), 110);
  } else if (strikeType === 'flying_heel_volley') {
    // AIRBORNE FLYING HEEL VOLLEY
    player.action = 'flying_heel_volley';
    player.actionTimer = 24;
    player.animFrame = 0;
    const speed = 7.2 + power * 4.6;
    ball.vx = Math.cos(angle) * speed;
    ball.vy = Math.sin(angle) * speed;
    ball.vz = 1.9;
    ball.spin = 2.5;
    audio.playAcrobaticStrike();
    setBanner(t('flyingHeelVolley'), 105);
  } else if (strikeType === 'bicycle') {
    // OVERHEAD BICYCLE KICK
    player.action = 'bicycle_kick';
    player.actionTimer = 28;
    player.animFrame = 0;
    const speed = 8.6 + power * 5.4;
    ball.vx = Math.cos(angle) * speed;
    ball.vy = Math.sin(angle) * speed;
    ball.vz = 2.8;
    ball.spin = (Math.random() - 0.5) * 3;
    audio.playAcrobaticStrike();
    setBanner(t('bicycleKick'), 110);
  } else if (strikeType === 'scissor') {
    // FLYING SCISSOR KICK
    player.action = 'scissor_kick';
    player.actionTimer = 24;
    player.animFrame = 0;
    const speed = 8.2 + power * 4.8;
    ball.vx = Math.cos(angle) * speed;
    ball.vy = Math.sin(angle) * speed;
    ball.vz = 2.0;
    audio.playAcrobaticStrike();
    setBanner(t('scissorKick'), 100);
  } else if (strikeType === 'diving_volley') {
    // HORIZONTAL DIVING VOLLEY
    player.action = 'diving_volley';
    player.actionTimer = 25;
    player.animFrame = 0;
    player.vx = Math.cos(angle) * 3.5;
    player.vy = Math.sin(angle) * 3.5;
    const speed = 8.0 + power * 4.6;
    ball.vx = Math.cos(angle) * speed;
    ball.vy = Math.sin(angle) * speed;
    ball.vz = 1.5;
    audio.playAcrobaticStrike();
    setBanner(t('divingVolley'), 100);
  } else if (strikeType === 'side_volley') {
    // LATERAL SIDE VOLLEY
    player.action = 'side_volley';
    player.actionTimer = 22;
    player.animFrame = 0;
    const speed = 7.9 + power * 4.7;
    ball.vx = Math.cos(angle) * speed;
    ball.vy = Math.sin(angle) * speed;
    ball.vz = 1.6;
    ball.spin = (Math.random() - 0.5) * 2;
    audio.playVolleyStrike(power);
    setBanner(t('sideVolley'), 95);
  } else if (strikeType === 'half_volley') {
    // LOW DRIVEN HALF-VOLLEY (BOTEPRONTO)
    player.action = 'half_volley';
    player.actionTimer = 20;
    player.animFrame = 0;
    const speed = 8.4 + power * 4.9;
    ball.vx = Math.cos(angle) * speed;
    ball.vy = Math.sin(angle) * speed;
    ball.vz = 0.9; // Skimming turf with immense velocity!
    ball.spinY = -1.5; // Topspin dip
    audio.playVolleyStrike(power * 1.1);
    setBanner(t('halfVolley'), 90);
  } else if (strikeType === 'chest_volley') {
    // CHEST STALL & VOLLEY
    player.action = 'chest_volley';
    player.actionTimer = 24;
    player.animFrame = 0;
    const speed = 8.1 + power * 4.6;
    ball.vx = Math.cos(angle) * speed;
    ball.vy = Math.sin(angle) * speed;
    ball.vz = 1.8;
    audio.playVolleyStrike(power);
    setBanner(t('chestVolley'), 100);
  } else if (strikeType === 'rabona_volley') {
    // RABONA VOLLEY
    player.action = 'rabona_volley';
    player.actionTimer = 25;
    player.animFrame = 0;
    const speed = 7.7 + power * 4.5;
    ball.vx = Math.cos(angle) * speed;
    ball.vy = Math.sin(angle) * speed;
    ball.vz = 2.1;
    ball.spin = 3.2; // Trivela/rabona curve
    audio.playAcrobaticStrike();
    setBanner(t('rabonaVolley'), 105);
  } else if (strikeType === 'sombrero_volley') {
    // SOMBRERO FOLLOW-UP VOLLEY
    player.action = 'sombrero_volley';
    player.actionTimer = 23;
    player.animFrame = 0;
    const speed = 8.5 + power * 5.0;
    ball.vx = Math.cos(angle) * speed;
    ball.vy = Math.sin(angle) * speed;
    ball.vz = 2.2;
    audio.playAcrobaticStrike();
    setBanner(t('sombreroVolley'), 110);
  } else if (strikeType === 'crisp_volley') {
    // CRISP DRIVEN VOLLEY
    player.action = 'volley';
    player.actionTimer = 22;
    player.animFrame = 0;
    const speed = 7.8 + power * 4.5;
    ball.vx = Math.cos(angle) * speed;
    ball.vy = Math.sin(angle) * speed;
    ball.vz = 1.6;
    audio.playVolleyStrike(power);
    setBanner(t('crispVolley'), 90);
  } else {
    // STANDARD VOLLEY
    player.action = 'volley';
    player.actionTimer = 20;
    player.animFrame = 0;
    const speed = 6.8 + power * 4.2;
    ball.vx = Math.cos(angle) * speed;
    ball.vy = Math.sin(angle) * speed;
    ball.vz = 2.0;
    audio.playVolleyStrike(power * 0.85);
    setBanner(actionType === 'shoot' ? t('crispVolley') : t('flairVolleyPass'), 75);
  }

  return true;
}

/**
 * Rustic Volley Clearance for Defenders:
 * "defenders can also do volleys for clearance those are more rustic"
 */
export function executeRusticVolleyClearance(
  defender: Player,
  ball: Ball,
  setBanner: (msg: string, timer?: number) => void
): void {
  defender.action = 'volley';
  defender.actionTimer = 22;
  defender.animFrame = 0;

  ball.ownerId = null;
  ball.isAirborne = true;
  ball.lastTouchPlayerId = defender.id;
  ball.lastTouchTeam = defender.team;

  // Big, booming rustic upfield launch with high trajectory
  const clearDirY = defender.team === 'home' ? -1 : 1;
  const clearDirX = (Math.random() - 0.5) * 0.8;
  const speedY = clearDirY * (8.5 + Math.random() * 3.5);
  const speedX = clearDirX * 5.0;

  ball.vx = speedX;
  ball.vy = speedY;
  ball.vz = 6.8; // High, rustic arc

  audio.playRusticClearance();
  setBanner(t('rusticVolleyClearance'), 90);
}

/**
 * Phase 9.2: Automatic header on incoming aerial cross if no button was pressed:
 * "if you don't press anything your player will try to head it"
 * Scaled by REA & HEA timing windows and procedural header styles.
 */
export function checkAutomaticHeader(
  player: Player,
  ball: Ball,
  targetGoalY: number,
  setBanner: (msg: string, timer?: number) => void
): boolean {
  if (player.action !== 'idle' && player.action !== 'running') return false;
  if (!ball.isAirborne || ball.z < 10 || ball.z > 40) return false;

  const dist = Math.hypot(ball.x - player.x, ball.y - player.y);
  const rea = player.canonicalStats && 'rea' in player.canonicalStats ? player.canonicalStats.rea : 75;
  const hea = player.canonicalStats && 'hea' in player.canonicalStats ? player.canonicalStats.hea : 75;
  const timingWindow = calculateAerialTimingWindow(rea, hea, false);

  if (dist > timingWindow.maxReachDist) return false;

  const contactQuality = evaluateAerialContactQuality(ball.z, dist, timingWindow);
  if (contactQuality === 'mistimed') return false;

  // Leap up for the header!
  const isDefender = player.role === 'CB1' || player.role === 'CB2' || player.role === 'LB' || player.role === 'RB' || player.primaryPos === 'DEF';
  const inDefArea = player.team === 'home' ? player.y > PITCH_CONFIG.CENTER_Y : player.y < PITCH_CONFIG.CENTER_Y;
  const isClearance = isDefender && inDefArea;

  let headerAction: 'heading' | 'bullet_header' | 'diving_header' | 'glancing_header' = 'heading';
  let bannerText = t('headerAttempt');
  let ballVz = -1.6;

  if (isClearance) {
    headerAction = 'heading';
    bannerText = `⚡ DEFENSIVE HEADER CLEARANCE BY ${player.name.toUpperCase()}!`;
    ballVz = 5.2;
  } else if (ball.z > 14 && Math.abs(player.y - targetGoalY) < 260) {
    headerAction = 'bullet_header';
    bannerText = `⚡ BULLET HEADER BY ${player.name.toUpperCase()}!`;
    ballVz = -3.2;
  } else if (ball.z <= 16 && Math.hypot(player.vx, player.vy) > 1.2) {
    headerAction = 'diving_header';
    bannerText = `🚀 DIVING HEADER BY ${player.name.toUpperCase()}!`;
    ballVz = -1.4;
  } else if (Math.abs(player.x - PITCH_CONFIG.CENTER_X) > 80) {
    headerAction = 'glancing_header';
    bannerText = `🎯 GLANCING HEADER BY ${player.name.toUpperCase()}!`;
    ballVz = -1.5;
  }

  player.action = headerAction;
  player.actionTimer = 24;
  player.animFrame = 0;

  ball.ownerId = null;
  ball.isAirborne = true;
  ball.lastTouchPlayerId = player.id;
  ball.lastTouchTeam = player.team;

  // Head towards target
  let angle = Math.atan2(targetGoalY - player.y, PITCH_CONFIG.CENTER_X - player.x);
  if (isClearance) {
    const clearDirY = player.team === 'home' ? -1 : 1;
    angle = Math.atan2(clearDirY * 8.0, (Math.random() - 0.5) * 4.0);
  } else if (headerAction === 'glancing_header') {
    angle += player.x < PITCH_CONFIG.CENTER_X ? 0.35 : -0.35;
  }

  let speed = (5.6 + (hea / 99) * 2.8) * timingWindow.powerMultiplier;
  if (contactQuality === 'sweet_spot') speed *= 1.2;

  ball.vx = Math.cos(angle) * speed;
  ball.vy = Math.sin(angle) * speed;
  ball.vz = ballVz;
  ball.spin = (Math.random() - 0.5) * 2.0;
  ball.spinY = -1.4;

  audio.playKick(0.75);
  setBanner(bannerText, 70);
  return true;
}
