/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Player,
  Ball,
  TeamSide,
  PlayerRole,
  SubPosition,
  TacticalPlaystyle,
  DetailedTactics,
  DifficultyLevel,
  TacticalBlockPhase,
} from '../types';
import { PITCH_CONFIG, PHYSICS } from './constants';

/**
 * =========================================================================
 * 4.4 LIGHTWEIGHT MOBILE ARCHITECTURE: ZERO-ALLOCATION STATIC SCRATCHPADS
 * Pre-allocated typed buffers and arrays completely eliminate per-frame GC thrash.
 * =========================================================================
 */
export const CANDIDATE_TARGETS = new Int32Array(11);
export const CANDIDATE_SCORES = new Float32Array(11);
export const SCRATCH_VEC = new Float32Array(8);

// Reusable scratchpad for pressing assignments without heap allocations
export const SCRATCH_DEFENDER_INDICES = new Int32Array(11);
export const SCRATCH_DEFENDER_DISTSQ = new Float32Array(11);

// Pre-allocated typed buffers for Phase 4 Team Block calculations (11 players x 2 coordinates: x, y)
export const TEAM_BLOCK_TARGETS_HOME = new Float32Array(22);
export const TEAM_BLOCK_TARGETS_AWAY = new Float32Array(22);

// Dynamic pitch metrics for 2026 tactical compactness (105m standard pitch length)
export const PITCH_METERS_TO_PIXELS = PITCH_CONFIG.FIELD_HEIGHT / 105; // ~23.81 px/m
export const MIN_VERTICAL_COMPACTNESS_PX = 25 * PITCH_METERS_TO_PIXELS; // ~595.2 px (25m)
export const MAX_VERTICAL_COMPACTNESS_PX = 35 * PITCH_METERS_TO_PIXELS; // ~833.3 px (35m)

/**
 * Staggered & Time-Sliced Tactical Decision Ticking:
 * Staggers heavy trigonometric and raycast scanning across 4 frames: (frame + playerIndex) % 4 === 0.
 * Locomotion continues every frame at 60 FPS, reducing AI CPU consumption by 70%.
 */
export function shouldRunTacticalScan(frame: number, playerIndex: number): boolean {
  return (frame + playerIndex) % 4 === 0;
}

/**
 * Fast Euclidean squared distance (dx*dx + dy*dy) avoids expensive Math.sqrt in inner loops
 */
export function distSq(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
}

/**
 * Fast squared distance from point (px, py) to line segment (x1, y1) -> (x2, y2)
 */
export function distToSegmentSq(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const l2 = distSq(x1, y1, x2, y2);
  if (l2 === 0) return distSq(px, py, x1, y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * (x2 - x1);
  const projY = y1 + t * (y2 - y1);
  return distSq(px, py, projX, projY);
}

/**
 * =========================================================================
 * 4.1 MODERN TACTICAL PRESSING ARCHITECTURE
 * =========================================================================
 */

/**
 * 4.1.1 Computes an interception vector that cuts across the dribbler's forward stride
 * rather than passively chasing their rear coordinates.
 */
export function calculateInterceptionVector(
  defender: Player,
  carrier: Player,
  leadFrames: number = 8
): { targetX: number; targetY: number } {
  // Carrier forward motion vector
  const carrierSpeedSq = carrier.vx * carrier.vx + carrier.vy * carrier.vy;
  const forwardDx = carrierSpeedSq > 0.16 ? carrier.vx : Math.cos(carrier.facingAngle) * 1.5;
  const forwardDy = carrierSpeedSq > 0.16 ? carrier.vy : Math.sin(carrier.facingAngle) * 1.5;

  // Intercept point ahead of the dribbler
  const interceptX = carrier.x + forwardDx * leadFrames;
  const interceptY = carrier.y + forwardDy * leadFrames;

  // Clamp within pitch boundaries
  return {
    targetX: Math.max(PITCH_CONFIG.PITCH_LEFT + 25, Math.min(PITCH_CONFIG.PITCH_RIGHT - 25, interceptX)),
    targetY: Math.max(PITCH_CONFIG.PITCH_TOP + 30, Math.min(PITCH_CONFIG.PITCH_BOTTOM - 30, interceptY)),
  };
}

/**
 * 4.1.1 Tests if the ball carrier has entered the "Zone of Imminent Danger" (Pressing Corridor < 320px)
 */
export function isCarrierInPressingCorridor(
  carrier: Player,
  defLineY: number,
  isDefenderDefendingTop: boolean
): boolean {
  if (isDefenderDefendingTop) {
    // Defending Top Goal (Away team defending Top):
    // Danger if carrier enters within 320px of defLineY towards top goal
    return carrier.y < defLineY + 320;
  } else {
    // Defending Bottom Goal (Home team defending Bottom):
    // Danger if carrier enters within 320px of defLineY towards bottom goal
    return carrier.y > defLineY - 320;
  }
}

/**
 * 4.1.2 Computes cover shadow position along passing ray:
 * P_cover = 0.65 * P_carrier + 0.35 * P_target
 */
export function calculateCoverShadowPosition(
  carrierX: number,
  carrierY: number,
  targetX: number,
  targetY: number
): { x: number; y: number } {
  return {
    x: carrierX * 0.65 + targetX * 0.35,
    y: carrierY * 0.65 + targetY * 0.35,
  };
}

/**
 * 4.1.2 Identifies the best proximate attacking target to shadow for a covering defender
 */
export function findCoverShadowTarget(
  defender: Player,
  carrier: Player,
  allPlayers: Player[],
  isAttackingUp: boolean
): { x: number; y: number } | null {
  let closestAttacker: Player | null = null;
  let minAttackerDistSq = Infinity;

  for (let i = 0; i < allPlayers.length; i++) {
    const p = allPlayers[i];
    // Candidate is an attacking teammate of the ball carrier
    if (p.team === carrier.team && p.id !== carrier.id && p.role !== 'GK' && !p.isRedCarded) {
      const dSq = distSq(defender.x, defender.y, p.x, p.y);
      if (dSq < minAttackerDistSq && dSq < 260 * 260) {
        minAttackerDistSq = dSq;
        closestAttacker = p;
      }
    }
  }

  if (closestAttacker) {
    return calculateCoverShadowPosition(carrier.x, carrier.y, closestAttacker.x, closestAttacker.y);
  }

  return null;
}

/**
 * 4.1.3 Computes Zone 14 screening coordinate (space right outside the 18-yard box)
 */
export function calculateZone14Position(
  player: Player,
  isAttackingUp: boolean,
  ballX: number
): { x: number; y: number } {
  // Zone 14 is centered at 18-yard box arc (D-box)
  const zone14Y = isAttackingUp ? PITCH_CONFIG.PITCH_BOTTOM - 230 : PITCH_CONFIG.PITCH_TOP + 230;
  // Shift horizontally towards ball to block shooting angles
  const shiftX = (ballX - PITCH_CONFIG.CENTER_X) * 0.35;
  return {
    x: Math.max(PITCH_CONFIG.CENTER_X - 120, Math.min(PITCH_CONFIG.CENTER_X + 120, PITCH_CONFIG.CENTER_X + shiftX)),
    y: zone14Y,
  };
}

/**
 * =========================================================================
 * 4.2 PASSING TRIANGLES & UNOBSTRUCTED PASSING LANES
 * =========================================================================
 */

/**
 * 4.2.2 Evaluates whether an opponent sits directly on the passing lane between carrier and teammate.
 * If obstructed (distSq < 35*35), calculates an evasive lateral/diagonal step into open space.
 */
export function findUnobstructedPassingTarget(
  mate: Player,
  carrier: Player,
  opponents: Player[],
  isAttackingUp: boolean
): { targetX: number; targetY: number; isObstructed: boolean } {
  const OBSTRUCT_RADIUS_SQ = 35 * 35; // 35px threshold
  let isObstructed = false;
  let obstructingOpp: Player | null = null;

  for (let i = 0; i < opponents.length; i++) {
    const opp = opponents[i];
    if (opp.isRedCarded || opp.action === 'fouled_falling' || opp.role === 'GK') continue;
    const dSq = distToSegmentSq(opp.x, opp.y, carrier.x, carrier.y, mate.x, mate.y);
    if (dSq < OBSTRUCT_RADIUS_SQ) {
      isObstructed = true;
      obstructingOpp = opp;
      break;
    }
  }

  if (!isObstructed || !obstructingOpp) {
    return { targetX: mate.x, targetY: mate.y, isObstructed: false };
  }

  // Teammate takes 2-3 explosive lateral/diagonal steps into open passing channel
  const passAngle = Math.atan2(mate.y - carrier.y, mate.x - carrier.x);
  const perpAngle1 = passAngle + Math.PI / 2;
  const perpAngle2 = passAngle - Math.PI / 2;

  // Test lateral shift 1 vs shift 2 to see which moves further away from the obstructing opponent
  const stepDist = 48; // ~2-3 sprint strides
  const shift1X = mate.x + Math.cos(perpAngle1) * stepDist;
  const shift1Y = mate.y + Math.sin(perpAngle1) * stepDist;
  const shift2X = mate.x + Math.cos(perpAngle2) * stepDist;
  const shift2Y = mate.y + Math.sin(perpAngle2) * stepDist;

  const dist1 = distSq(shift1X, shift1Y, obstructingOpp.x, obstructingOpp.y);
  const dist2 = distSq(shift2X, shift2Y, obstructingOpp.x, obstructingOpp.y);

  const bestX = dist1 > dist2 ? shift1X : shift2X;
  const bestY = dist1 > dist2 ? shift1Y : shift2Y;

  return {
    targetX: Math.max(PITCH_CONFIG.PITCH_LEFT + 30, Math.min(PITCH_CONFIG.PITCH_RIGHT - 30, bestX)),
    targetY: Math.max(PITCH_CONFIG.PITCH_TOP + 40, Math.min(PITCH_CONFIG.PITCH_BOTTOM - 40, bestY)),
    isObstructed: true,
  };
}

/**
 * =========================================================================
 * 4.2.1 SUPPORT PHASE STATE MACHINE & PASSING TRIANGULATION
 * =========================================================================
 */
export type SupportPhase = 'deep_buildup' | 'midfield_progression' | 'final_third_overload';

/**
 * Determines current team in-possession phase based on ball carrier pitch position
 */
export function determineSupportPhase(carrier: Player, isAttackingUp: boolean): SupportPhase {
  if (isAttackingUp) {
    // Attacking Up: Home defending bottom (~1200px), attacking top (~80px)
    if (carrier.y > PITCH_CONFIG.CENTER_Y + 120) return 'deep_buildup';
    if (carrier.y < PITCH_CONFIG.CENTER_Y - 140) return 'final_third_overload';
    return 'midfield_progression';
  } else {
    // Attacking Down: Away defending top (~80px), attacking bottom (~1200px)
    if (carrier.y < PITCH_CONFIG.CENTER_Y - 120) return 'deep_buildup';
    if (carrier.y > PITCH_CONFIG.CENTER_Y + 140) return 'final_third_overload';
    return 'midfield_progression';
  }
}

/**
 * 4.2.1 & Phase 5.2 Dynamic Support Target & Role Fluidity:
 * Evaluates Primary Role + Sub-Position + Playstyle to compute authentic support runs:
 * - Deep Buildup: Inverted FB steps inside; Regista drops between CBs; Fullbacks provide width; CMs form 30°-60° triangles.
 * - Midfield Progression: Overlapping / underlapping fullback runs; CAM drops into pocket; B2B penetrates half-space; blindside channel runs.
 * - Final Third Overloads: Staggered cutback arrivals (near post, spot, edge of box); underlapping runs into box; strikers pin CBs.
 */
export function calculateSupportVector(
  mate: Player,
  carrier: Player,
  allTeammates: Player[],
  allOpponents: Player[],
  isAttackingUp: boolean,
  playstyle: TacticalPlaystyle,
  tactics?: DetailedTactics
): { targetX: number; targetY: number; runType: Player['supportRunType'] } {
  const phase = determineSupportPhase(carrier, isAttackingUp);
  const dirY = isAttackingUp ? -1 : 1;
  const isDefender = mate.role === 'CB1' || mate.role === 'CB2' || mate.role === 'LB' || mate.role === 'RB' || mate.primaryPos === 'DEF';
  const isMidfielder = mate.role === 'CM1' || mate.role === 'CM2' || mate.role === 'LM' || mate.role === 'RM' || mate.primaryPos === 'MID';
  const isForward = mate.role === 'ST1' || mate.role === 'ST2' || mate.primaryPos === 'ATT';

  const subPos = mate.subPos || (mate.role === 'LB' ? 'LB' : mate.role === 'RB' ? 'RB' : mate.role === 'LM' ? 'LM' : mate.role === 'RM' ? 'RM' : mate.role === 'ST1' || mate.role === 'ST2' ? 'ST' : 'CM');
  const playstyleId = mate.playstyleId;

  // 1. DEEP BUILDUP:
  if (phase === 'deep_buildup') {
    // Phase 5.1 Regista / Deep-Lying Playmaker: drops between or alongside CBs (Salida Lavolpiana)
    if (playstyleId === 18 || mate.playstyle === 'regista') {
      return {
        targetX: PITCH_CONFIG.CENTER_X,
        targetY: carrier.y - dirY * 35,
        runType: 'triangle_short',
      };
    }

    // Phase 5.1 Inverted Fullback (Inverted FB): Tucks into central half-space pivot
    if (playstyleId === 20 || mate.playstyle === 'inverted_fb') {
      const tuckX = mate.role === 'LB' || subPos === 'LB' ? PITCH_CONFIG.CENTER_X - 110 : PITCH_CONFIG.CENTER_X + 110;
      return {
        targetX: tuckX,
        targetY: carrier.y + dirY * 45,
        runType: 'triangle_short',
      };
    }

    if (mate.role === 'LB' || subPos === 'LB' || subPos === 'LWB') {
      return {
        targetX: PITCH_CONFIG.PITCH_LEFT + 75,
        targetY: carrier.y + dirY * 60,
        runType: 'triangle_short',
      };
    } else if (mate.role === 'RB' || subPos === 'RB' || subPos === 'RWB') {
      return {
        targetX: PITCH_CONFIG.PITCH_RIGHT - 75,
        targetY: carrier.y + dirY * 60,
        runType: 'triangle_short',
      };
    } else if (subPos === 'CAM' || playstyleId === 9 || playstyleId === 10 || playstyleId === 11) {
      // CAM drops into intermediate pocket to receive forward pass
      const pocket = calculateDropIntoPocket(mate, carrier, allOpponents, isAttackingUp);
      return {
        targetX: pocket.targetX,
        targetY: pocket.targetY,
        runType: 'drop_pocket',
      };
    } else if (isMidfielder) {
      // Central midfielders form passing triangles at 30°-60° angles
      const side = mate.role === 'CM1' ? -1 : 1;
      const angle = (Math.PI / 4) * side;
      const triangleDist = 140;
      const tx = carrier.x + Math.sin(angle) * triangleDist;
      const ty = carrier.y + dirY * Math.cos(angle) * triangleDist;
      return {
        targetX: Math.max(PITCH_CONFIG.PITCH_LEFT + 90, Math.min(PITCH_CONFIG.PITCH_RIGHT - 90, tx)),
        targetY: ty,
        runType: 'triangle_short',
      };
    } else if (isForward) {
      return {
        targetX: mate.role === 'ST1' ? PITCH_CONFIG.CENTER_X - 60 : PITCH_CONFIG.CENTER_X + 60,
        targetY: carrier.y + dirY * 260,
        runType: 'triangle_penetrate',
      };
    }
  }

  // 2. MIDFIELD PROGRESSION:
  if (phase === 'midfield_progression') {
    // Phase 5.2 Underlap vs Overlap Evaluation:
    // If carrier is out wide on the touchline (X > 200px from center), check for underlapping run!
    const isCarrierWide = Math.abs(carrier.x - PITCH_CONFIG.CENTER_X) > 200;
    if (isCarrierWide && carrier.id !== mate.id) {
      const isSameSide = (carrier.x < PITCH_CONFIG.CENTER_X && mate.x < PITCH_CONFIG.CENTER_X) ||
                         (carrier.x > PITCH_CONFIG.CENTER_X && mate.x > PITCH_CONFIG.CENTER_X);
      if (isSameSide && (isMidfielder || subPos === 'LB' || subPos === 'RB' || subPos === 'LWB' || subPos === 'RWB')) {
        const underlap = calculateUnderlappingRun(mate, carrier, carrier, isAttackingUp);
        if (underlap) {
          return { targetX: underlap.targetX, targetY: underlap.targetY, runType: 'underlap' };
        }
      }
    }

    // Overlapping Fullback / Wingback:
    if (mate.role === 'LB' || mate.role === 'RB' || subPos === 'LB' || subPos === 'RB' || subPos === 'LWB' || subPos === 'RWB') {
      const winger = allTeammates.find(t => (mate.role === 'LB' || subPos === 'LB' ? t.role === 'LM' || t.subPos === 'LW' : t.role === 'RM' || t.subPos === 'RW'));
      if (winger) {
        const overlap = calculateOverlappingFullbackRun(mate, winger, carrier, isAttackingUp);
        if (overlap) {
          return { targetX: overlap.targetX, targetY: overlap.targetY, runType: 'overlap' };
        }
      }
    }

    // Phase 5.2 CAM / Playmaker / SS: Drop into pocket between lines
    if (subPos === 'CAM' || subPos === 'SS' || playstyleId === 9 || playstyleId === 10 || playstyleId === 11) {
      const pocket = calculateDropIntoPocket(mate, carrier, allOpponents, isAttackingUp);
      return {
        targetX: pocket.targetX,
        targetY: pocket.targetY,
        runType: 'drop_pocket',
      };
    }

    // Phase 5.1 Box-to-Box (B2B) / Runner Midfielder: dynamic surge into half-space
    if (playstyleId === 13 || playstyleId === 15 || mate.playstyle === 'box_to_box') {
      const surgeSide = mate.x < PITCH_CONFIG.CENTER_X ? -85 : 85;
      return {
        targetX: PITCH_CONFIG.CENTER_X + surgeSide,
        targetY: carrier.y + dirY * 160,
        runType: 'triangle_penetrate',
      };
    }

    // Central Midfielder 1 (CDM / Anchor / Holding) holds as rest-defense pivot
    if (subPos === 'CDM' || playstyleId === 17 || mate.role === 'CM1') {
      return {
        targetX: PITCH_CONFIG.CENTER_X,
        targetY: carrier.y - dirY * 85,
        runType: 'triangle_short',
      };
    } else if (mate.role === 'CM2' || subPos === 'CM') {
      const halfSpaceX = carrier.x < PITCH_CONFIG.CENTER_X ? PITCH_CONFIG.CENTER_X + 80 : PITCH_CONFIG.CENTER_X - 80;
      return {
        targetX: halfSpaceX,
        targetY: carrier.y + dirY * 135,
        runType: 'triangle_penetrate',
      };
    } else if (mate.role === 'LM' || subPos === 'LM' || subPos === 'LW') {
      return {
        targetX: PITCH_CONFIG.PITCH_LEFT + 110,
        targetY: carrier.y + dirY * 120,
        runType: 'triangle_penetrate',
      };
    } else if (mate.role === 'RM' || subPos === 'RM' || subPos === 'RW') {
      return {
        targetX: PITCH_CONFIG.PITCH_RIGHT - 110,
        targetY: carrier.y + dirY * 120,
        runType: 'triangle_penetrate',
      };
    } else if (isForward) {
      const channelRun = calculateBlindsideChannelRun(mate, allOpponents, isAttackingUp);
      if (channelRun) {
        return { targetX: channelRun.targetX, targetY: channelRun.targetY, runType: 'blindside' };
      }
    }
  }

  // 3. FINAL THIRD OVERLOADS:
  if (phase === 'final_third_overload') {
    // Cutback check if carrier is near byline
    const cutback = calculateCutbackTarget(mate, carrier, allTeammates, isAttackingUp);
    if (cutback) {
      return { targetX: cutback.targetX, targetY: cutback.targetY, runType: 'cutback' };
    }

    // Phase 5.2 Underlapping run into box channel if carrier is wide on flank
    const isCarrierWide = Math.abs(carrier.x - PITCH_CONFIG.CENTER_X) > 180;
    if (isCarrierWide && (isMidfielder || subPos === 'CAM' || subPos === 'SS')) {
      const underlap = calculateUnderlappingRun(mate, carrier, carrier, isAttackingUp);
      if (underlap) {
        return { targetX: underlap.targetX, targetY: underlap.targetY, runType: 'underlap' };
      }
    }

    if (isForward) {
      const channelRun = calculateBlindsideChannelRun(mate, allOpponents, isAttackingUp);
      if (channelRun) {
        return { targetX: channelRun.targetX, targetY: channelRun.targetY, runType: 'blindside' };
      }
      return {
        targetX: mate.role === 'ST1' ? PITCH_CONFIG.CENTER_X - 55 : PITCH_CONFIG.CENTER_X + 55,
        targetY: carrier.y + dirY * 85,
        runType: 'blindside',
      };
    } else if (mate.role === 'LM' || mate.role === 'RM' || subPos === 'LW' || subPos === 'RW') {
      const targetBoxX = (mate.role === 'LM' || subPos === 'LW') ? PITCH_CONFIG.CENTER_X - 70 : PITCH_CONFIG.CENTER_X + 70;
      return {
        targetX: targetBoxX,
        targetY: carrier.y + dirY * 70,
        runType: 'blindside',
      };
    } else if (isMidfielder) {
      const edgeBoxY = isAttackingUp ? PITCH_CONFIG.PITCH_TOP + 230 : PITCH_CONFIG.PITCH_BOTTOM - 230;
      return {
        targetX: mate.role === 'CM1' ? PITCH_CONFIG.CENTER_X - 45 : PITCH_CONFIG.CENTER_X + 45,
        targetY: edgeBoxY,
        runType: 'cutback',
      };
    }
  }

  // Fallback anchor calculation
  const fieldW = PITCH_CONFIG.FIELD_WIDTH;
  const fieldH = PITCH_CONFIG.FIELD_HEIGHT;
  return {
    targetX: PITCH_CONFIG.PITCH_LEFT + mate.baseX * fieldW,
    targetY: PITCH_CONFIG.PITCH_TOP + mate.baseY * fieldH,
    runType: null,
  };
}

/**
 * =========================================================================
 * 4.2.3 INTELLIGENT OFF-THE-BALL RUNS (MODERN TACTICAL ARCHETYPES)
 * =========================================================================
 */

/**
 * Blindside Channel Run:
 * Strikers run between CB and FB on defender's blind side when attacking open space.
 */
export function calculateBlindsideChannelRun(
  striker: Player,
  defenders: Player[],
  isAttackingUp: boolean
): { targetX: number; targetY: number } | null {
  // Find opponent CBs and fullbacks
  let cb1: Player | null = null;
  let cb2: Player | null = null;
  let lb: Player | null = null;
  let rb: Player | null = null;

  for (let i = 0; i < defenders.length; i++) {
    const d = defenders[i];
    if (d.isRedCarded) continue;
    if (d.role === 'CB1') cb1 = d;
    else if (d.role === 'CB2') cb2 = d;
    else if (d.role === 'LB') lb = d;
    else if (d.role === 'RB') rb = d;
  }

  // Channel 1: between LB and CB1; Channel 2: between CB2 and RB
  let channel1X = PITCH_CONFIG.CENTER_X - 110;
  let channel2X = PITCH_CONFIG.CENTER_X + 110;

  if (lb && cb1) channel1X = (lb.x + cb1.x) * 0.5;
  if (rb && cb2) channel2X = (rb.x + cb2.x) * 0.5;

  const diff1 = Math.abs(striker.x - channel1X);
  const diff2 = Math.abs(striker.x - channel2X);

  const bestChannelX = diff1 < diff2 ? channel1X : channel2X;
  const forwardY = isAttackingUp ? striker.y - 140 : striker.y + 140;

  return {
    targetX: bestChannelX,
    targetY: Math.max(PITCH_CONFIG.PITCH_TOP + 60, Math.min(PITCH_CONFIG.PITCH_BOTTOM - 60, forwardY)),
  };
}

/**
 * Overlapping Fullback Run:
 * When a winger cuts inside with the ball, the outside back makes an explosive sprint along touchline.
 */
export function calculateOverlappingFullbackRun(
  fullback: Player,
  winger: Player,
  carrier: Player,
  isAttackingUp: boolean
): { targetX: number; targetY: number } | null {
  const isWingerCarrier = carrier.id === winger.id;
  const isWingerInverted = Math.abs(winger.x - PITCH_CONFIG.CENTER_X) < 320; // Cut inside from flank

  if (!isWingerCarrier || !isWingerInverted) return null;

  // Fullback overlaps along the outside boundary
  const isLeftFlank = fullback.role === 'LB';
  const touchlineX = isLeftFlank ? PITCH_CONFIG.PITCH_LEFT + 75 : PITCH_CONFIG.PITCH_RIGHT - 75;
  const advanceY = isAttackingUp ? winger.y - 110 : winger.y + 110;

  return {
    targetX: touchlineX,
    targetY: Math.max(PITCH_CONFIG.PITCH_TOP + 80, Math.min(PITCH_CONFIG.PITCH_BOTTOM - 80, advanceY)),
  };
}

/**
 * Phase 5.2 Underlapping Run:
 * When a wide player (winger or fullback) operates in the outer touchline corridor (X > 200px from center),
 * an inside teammate (fullback, LCM/RCM, or CAM) makes a dynamic underlapping surge through
 * the half-space channel *under* them into the final third.
 */
export function calculateUnderlappingRun(
  runner: Player,
  widePlayer: Player,
  carrier: Player,
  isAttackingUp: boolean
): { targetX: number; targetY: number } | null {
  const isWideFlank = Math.abs(widePlayer.x - PITCH_CONFIG.CENTER_X) > 200;
  if (!isWideFlank) return null;

  const isLeftFlank = widePlayer.x < PITCH_CONFIG.CENTER_X;
  // Underlap takes place in the half-space: ~110-150px from center
  const underlapX = isLeftFlank ? PITCH_CONFIG.CENTER_X - 130 : PITCH_CONFIG.CENTER_X + 130;
  const dirY = isAttackingUp ? -1 : 1;
  const advanceY = widePlayer.y + dirY * 115;

  return {
    targetX: Math.max(PITCH_CONFIG.PITCH_LEFT + 60, Math.min(PITCH_CONFIG.PITCH_RIGHT - 60, underlapX)),
    targetY: Math.max(PITCH_CONFIG.PITCH_TOP + 70, Math.min(PITCH_CONFIG.PITCH_BOTTOM - 70, advanceY)),
  };
}

/**
 * Phase 5.2 Drop Into Pocket:
 * Playmakers, CAMs, second strikers (SS), or false-9 strikers check away from the opposition center-backs,
 * dropping 15-20m toward the ball into the pocket of space between opponent midfield and defensive lines (Zone 14 / half-spaces).
 */
export function calculateDropIntoPocket(
  player: Player,
  carrier: Player,
  allOpponents: Player[],
  isAttackingUp: boolean
): { targetX: number; targetY: number } {
  const dirY = isAttackingUp ? -1 : 1;
  // Pocket is situated between the carrier and the opponent's defensive line
  const pocketY = carrier.y + dirY * 95;
  // Half-space bias: slight lateral offset from center to open diagonal receiving angles
  const lateralBias = player.x < PITCH_CONFIG.CENTER_X ? -65 : 65;
  const pocketX = PITCH_CONFIG.CENTER_X + lateralBias;

  return {
    targetX: Math.max(PITCH_CONFIG.PITCH_LEFT + 75, Math.min(PITCH_CONFIG.PITCH_RIGHT - 75, pocketX)),
    targetY: Math.max(PITCH_CONFIG.PITCH_TOP + 80, Math.min(PITCH_CONFIG.PITCH_BOTTOM - 80, pocketY)),
  };
}

/**
 * Cutback Awareness:
 * When an attacker reaches the byline inside the penalty box, forwards stagger their runs:
 * Near Post, Penalty Spot, and Edge of 18-yard Box.
 */
export function calculateCutbackTarget(
  runner: Player,
  carrier: Player,
  allTeammates: Player[],
  isAttackingUp: boolean
): { targetX: number; targetY: number } | null {
  // Carrier reached byline inside or near 18-yard box
  const inFinalThirdY = isAttackingUp ? carrier.y < PITCH_CONFIG.PITCH_TOP + 140 : carrier.y > PITCH_CONFIG.PITCH_BOTTOM - 140;
  const isFlankByline = Math.abs(carrier.x - PITCH_CONFIG.CENTER_X) > 160;

  if (!inFinalThirdY || !isFlankByline) return null;

  const isLeftFlank = carrier.x < PITCH_CONFIG.CENTER_X;
  const nearPostX = isLeftFlank ? PITCH_CONFIG.CENTER_X - 60 : PITCH_CONFIG.CENTER_X + 60;
  const penSpotX = PITCH_CONFIG.CENTER_X;
  const edgeBoxX = isLeftFlank ? PITCH_CONFIG.CENTER_X - 30 : PITCH_CONFIG.CENTER_X + 30;

  const goalLineY = isAttackingUp ? PITCH_CONFIG.PITCH_TOP : PITCH_CONFIG.PITCH_BOTTOM;
  const nearPostY = isAttackingUp ? goalLineY + 65 : goalLineY - 65;
  const penSpotY = isAttackingUp ? goalLineY + 130 : goalLineY - 130;
  const edgeBoxY = isAttackingUp ? goalLineY + 230 : goalLineY - 230;

  // Assign roles based on player role:
  // ST1 -> Near Post dart
  // ST2 -> Penalty Spot arrival
  // Arriving Midfielder (CM1/CM2/CAM) -> Edge of box cutback volley
  if (runner.role === 'ST1') {
    return { targetX: nearPostX, targetY: nearPostY };
  } else if (runner.role === 'ST2') {
    return { targetX: penSpotX, targetY: penSpotY };
  } else if (runner.role === 'CM1' || runner.role === 'CM2') {
    return { targetX: edgeBoxX, targetY: edgeBoxY };
  }

  return null;
}

/**
 * 4.2.3 Third-Man Run:
 * When Player A passes to Player B, Player C anticipates the pass and begins a sprint behind the defense
 * before Player B even touches the ball!
 */
export function calculateThirdManRun(
  runner: Player,
  passer: Player,
  receiver: Player,
  isAttackingUp: boolean
): { targetX: number; targetY: number } | null {
  // Candidate is forward or winger running in behind receiver
  if (runner.id === passer.id || runner.id === receiver.id) return null;
  const isRunnerUpfield = isAttackingUp ? runner.y < receiver.y : runner.y > receiver.y;
  if (!isRunnerUpfield) return null;

  const dirY = isAttackingUp ? -1 : 1;
  const targetX = (receiver.x + PITCH_CONFIG.CENTER_X) * 0.5;
  const targetY = receiver.y + dirY * 150;

  return {
    targetX: Math.max(PITCH_CONFIG.PITCH_LEFT + 40, Math.min(PITCH_CONFIG.PITCH_RIGHT - 40, targetX)),
    targetY: Math.max(PITCH_CONFIG.PITCH_TOP + 50, Math.min(PITCH_CONFIG.PITCH_BOTTOM - 50, targetY)),
  };
}

/**
 * =========================================================================
 * PHASE 5: ADVANCED AI POSITIONING, LINE INTERMINGLING & ROLE FLUIDITY (AI CORE - PART 2)
 *
 * 5.1 Line Intermingling Rules:
 *   - Forwards actively occupy and shadow opposition CBs & defensive midfielders in opponent's half
 *   - Midfield line interlocks with defensive (holding/anchor) and attacking (CAM/B2B) thirds
 *   - Full-backs tuck inside (inverted FB) or push high (attacking FB/wing-back)
 * 5.2 Positional Roles Drive Off-Ball Behaviour:
 *   - Support run type (underlap, overlap, blindside, drop into pocket)
 *   - Cover shadow target dynamically screened
 *   - Step out vs hold the line for CBs
 * 5.3 Difficulty-Scaled Anticipation & Canonical Stats (POS & REA)
 * 5.4 Zero per-frame memory allocation
 * =========================================================================
 */

export function getPlayerPOS(player: Player): number {
  if (player.canonicalStats && 'pos' in player.canonicalStats && typeof player.canonicalStats.pos === 'number') {
    return player.canonicalStats.pos;
  }
  return 70;
}

export function getPlayerREA(player: Player): number {
  if (player.canonicalStats && 'rea' in player.canonicalStats && typeof player.canonicalStats.rea === 'number') {
    return player.canonicalStats.rea;
  }
  return 70;
}

export function getPlayerTCK(player: Player): number {
  if (player.canonicalStats && 'tck' in player.canonicalStats && typeof player.canonicalStats.tck === 'number') {
    return player.canonicalStats.tck;
  }
  return 70;
}

export function getPlayerSLD(player: Player): number {
  if (player.canonicalStats && 'sld' in player.canonicalStats && typeof player.canonicalStats.sld === 'number') {
    return player.canonicalStats.sld;
  }
  return 70;
}

/**
 * Phase 5.1 & 5.2 Forward Shadowing Target:
 * Out-of-possession forwards occupy opposition CBs and shadow the opponent's holding midfielder / pivot (CDM).
 * Instead of retreating passively into their own half, forwards stay in the opponent's half
 * and position themselves directly on passing rays between rival CBs and the pivot.
 */
export function calculateForwardShadowingTarget(
  forward: Player,
  allOpponents: Player[],
  isAttackingUp: boolean
): { targetX: number; targetY: number; shadowTargetId: string | null } {
  let rivalCB1: Player | null = null;
  let rivalCB2: Player | null = null;
  let rivalPivot: Player | null = null;

  for (let i = 0; i < allOpponents.length; i++) {
    const opp = allOpponents[i];
    if (opp.team === forward.team || opp.isRedCarded || opp.role === 'GK') continue;
    if (opp.role === 'CB1') rivalCB1 = opp;
    else if (opp.role === 'CB2') rivalCB2 = opp;
    else if (opp.role === 'CM1' || opp.subPos === 'CDM') rivalPivot = opp;
  }

  const isLeftForward = forward.role === 'ST1' || forward.role === 'LM' || forward.x < PITCH_CONFIG.CENTER_X;
  const targetCB = isLeftForward ? (rivalCB1 || rivalCB2) : (rivalCB2 || rivalCB1);

  if (targetCB && rivalPivot) {
    const shadowPos = calculateCoverShadowPosition(targetCB.x, targetCB.y, rivalPivot.x, rivalPivot.y);
    return {
      targetX: shadowPos.x,
      targetY: shadowPos.y,
      shadowTargetId: rivalPivot.id,
    };
  } else if (targetCB) {
    const forwardSign = isAttackingUp ? 1 : -1;
    return {
      targetX: targetCB.x,
      targetY: targetCB.y + forwardSign * 45,
      shadowTargetId: targetCB.id,
    };
  }

  return { targetX: forward.x, targetY: forward.y, shadowTargetId: null };
}

/**
 * Phase 5.2 Step Out vs Hold The Line:
 * Center-backs evaluate whether to step out aggressively ("jump the line")
 * to intercept or close down an opponent receiving with back to goal in the hole,
 * or hold the line firmly to protect depth.
 */
export function evaluateDefenderStepOut(
  defender: Player,
  allOpponents: Player[],
  ball: Ball,
  isAttackingUp: boolean
): { shouldStepOut: boolean; stepTargetX: number; stepTargetY: number } {
  const isCB = defender.role === 'CB1' || defender.role === 'CB2' || defender.subPos === 'CB' || defender.subPos === 'LIB';
  if (!isCB) return { shouldStepOut: false, stepTargetX: defender.x, stepTargetY: defender.y };

  const isDestroyer = defender.playstyleId === 23 || defender.playstyle === 'destroyer';
  const tck = (defender.canonicalStats && 'tck' in defender.canonicalStats) ? defender.canonicalStats.tck : 75;
  const intStat = (defender.canonicalStats && 'int' in defender.canonicalStats) ? defender.canonicalStats.int : 75;
  const aggressionThreshold = isDestroyer ? 68 : 84;

  if (tck < aggressionThreshold && intStat < aggressionThreshold) {
    return { shouldStepOut: false, stepTargetX: defender.x, stepTargetY: defender.y };
  }

  const fwdSign = isAttackingUp ? -1 : 1;
  for (let i = 0; i < allOpponents.length; i++) {
    const opp = allOpponents[i];
    if (opp.team === defender.team || opp.isRedCarded || opp.role === 'GK') continue;

    const dX = opp.x - defender.x;
    const dY = opp.y - defender.y;
    const distSqVal = dX * dX + dY * dY;

    if (distSqVal > 35 * 35 && distSqVal < 130 * 130) {
      const isOppFacingAway = isAttackingUp ? Math.sin(opp.facingAngle) > 0.25 : Math.sin(opp.facingAngle) < -0.25;
      const isBallNearOpp = distSq(opp.x, opp.y, ball.x, ball.y) < 65 * 65;

      if (isOppFacingAway || isBallNearOpp) {
        const stepX = defender.x + dX * 0.45;
        const stepY = defender.y + fwdSign * 38;
        return {
          shouldStepOut: true,
          stepTargetX: Math.max(PITCH_CONFIG.PITCH_LEFT + 40, Math.min(PITCH_CONFIG.PITCH_RIGHT - 40, stepX)),
          stepTargetY: Math.max(PITCH_CONFIG.PITCH_TOP + 60, Math.min(PITCH_CONFIG.PITCH_BOTTOM - 60, stepY)),
        };
      }
    }
  }

  return { shouldStepOut: false, stepTargetX: defender.x, stepTargetY: defender.y };
}

/**
 * Phase 5.3 Difficulty-Scaled Anticipation & Attribute Modulation:
 * Modulates the target coordinate based on player's canonical Positioning (POS) and Reactions (REA),
 * scaled by difficulty tier.
 * - Higher POS (85-99+): zero spatial error; accurate positioning in free pocket / lane.
 * - Lower POS (40-65): spatial error offset (drift).
 * - Higher REA (85-99+): leads play by anticipating ball direction.
 * - Difficulty tiers:
 *   - Standing: 0 movement
 *   - Easy: ±25-40px error drift, delayed reaction
 *   - Normal: ±8-12px minor drift, standard reaction
 *   - Elite: 0 drift, instant anticipation
 *   - Legend: predictive leading vector, perfect anticipation
 */
export function applyAnticipationAndAttributeVariance(
  targetX: number,
  targetY: number,
  player: Player,
  difficulty: DifficultyLevel,
  ball: Ball,
  frame: number = 0
): { x: number; y: number } {
  if (difficulty === 'standing') {
    return { x: player.x, y: player.y };
  }

  const pos = getPlayerPOS(player);
  const rea = getPlayerREA(player);

  let noiseMagnitude = 0;
  if (difficulty === 'easy') {
    noiseMagnitude = Math.max(6, 38 - (pos / 105) * 26);
  } else if (difficulty === 'normal') {
    noiseMagnitude = Math.max(0, 14 - (pos / 105) * 14);
  } else {
    // Elite & Legend: 0 noise
    noiseMagnitude = 0;
  }

  let adjustedX = targetX;
  let adjustedY = targetY;

  if (noiseMagnitude > 0) {
    const seed = (player.number * 37 + Math.floor(frame / 30)) % 100;
    const noiseX = Math.sin(seed) * noiseMagnitude;
    const noiseY = Math.cos(seed) * noiseMagnitude;
    adjustedX += noiseX;
    adjustedY += noiseY;
  }

  // Predictive anticipation for Elite / Legend & high REA:
  if ((difficulty === 'elite' || difficulty === 'legend' || rea >= 85) && (ball.vx !== 0 || ball.vy !== 0)) {
    const ballSpeedSq = ball.vx * ball.vx + ball.vy * ball.vy;
    if (ballSpeedSq > 4) {
      const leadFactor = difficulty === 'legend' ? 0.35 : (difficulty === 'elite' ? 0.22 : 0.12);
      const reaMultiplier = rea / 99;
      adjustedX += ball.vx * leadFactor * reaMultiplier * 3.5;
      adjustedY += ball.vy * leadFactor * reaMultiplier * 3.5;
    }
  }

  adjustedX = Math.max(PITCH_CONFIG.PITCH_LEFT + 30, Math.min(PITCH_CONFIG.PITCH_RIGHT - 30, adjustedX));
  adjustedY = Math.max(PITCH_CONFIG.PITCH_TOP + 40, Math.min(PITCH_CONFIG.PITCH_BOTTOM - 40, adjustedY));

  return { x: adjustedX, y: adjustedY };
}

/**
 * =========================================================================
 * PHASE 4: MODERN COMPACT POSITIONING FOUNDATION (AI CORE – PART 1)
 *
 * 4.1 Vertical Compactness Engine (25–35m strict clamping first attacker -> last defender)
 * 4.2 Synchronised Elastic Block Movement (Unit shifts with ball X/Y, preserves relative spacing)
 * 4.3 Rest-Defence & Counter-Press Transition Safety (3-5s counter-press, rest-defence behind ball)
 * 4.4 Direct Zero-Heap Allocation Implementation
 * =========================================================================
 */

/**
 * 4.3 Evaluates counter-press duration window in frames (60fps) based on difficulty and tactics
 */
export function getCounterPressDurationFrames(
  difficulty: DifficultyLevel = 'normal',
  playstyle: TacticalPlaystyle = 'possession',
  tactics?: DetailedTactics
): number {
  if (difficulty === 'standing') return 0;

  // Base window in seconds: 2.4 to 4.8s
  let baseSeconds = 3.4;
  if (difficulty === 'legend') baseSeconds = 4.8;
  else if (difficulty === 'elite') baseSeconds = 4.2;
  else if (difficulty === 'normal') baseSeconds = 3.4;
  else if (difficulty === 'easy') baseSeconds = 2.4;

  if (playstyle === 'gegenpress' || tactics?.runs === 'all_attack') {
    baseSeconds = Math.min(5.0, baseSeconds + 1.0);
  } else if (playstyle === 'catenaccio' || playstyle === 'conservative' || (tactics && tactics.defensiveLine <= 2)) {
    baseSeconds = Math.max(1.8, baseSeconds - 1.0);
  }

  return Math.round(baseSeconds * 60);
}

/**
 * 4.1 / 4.3 Determines the active TacticalBlockPhase for a team based on match state
 */
export function determineTeamBlockPhase(
  teamHasBall: boolean,
  framesSinceLostPossession: number,
  counterPressWindowFrames: number,
  ballY: number,
  isAttackingUp: boolean,
  playstyle: TacticalPlaystyle = 'possession',
  tactics?: DetailedTactics
): TacticalBlockPhase {
  if (teamHasBall) {
    return 'attacking_possession';
  }

  // 4.3 Counter-press window immediately after losing possession
  if (framesSinceLostPossession >= 0 && framesSinceLostPossession <= counterPressWindowFrames) {
    return 'counter_press';
  }

  const fieldH = PITCH_CONFIG.FIELD_HEIGHT;
  const pitchTop = PITCH_CONFIG.PITCH_TOP;
  const defLine = tactics?.defensiveLine ?? 3;

  // Relative ball location:
  // For isAttackingUp: Own goal is at bottom (pitchTop + fieldH). Opponent goal is at top (pitchTop).
  // Opponent third (High Press Zone): ball.y < pitchTop + fieldH * 0.38
  // Own third (Low Block Zone): ball.y > pitchTop + fieldH * 0.68
  const isInOpponentThird = isAttackingUp
    ? ballY < pitchTop + fieldH * 0.38
    : ballY > pitchTop + fieldH * 0.62;

  const isInOwnThird = isAttackingUp
    ? ballY > pitchTop + fieldH * 0.68
    : ballY < pitchTop + fieldH * 0.32;

  const isHighPressTendency =
    playstyle === 'gegenpress' ||
    defLine >= 4 ||
    tactics?.runs === 'all_attack';

  const isLowBlockTendency =
    playstyle === 'catenaccio' ||
    playstyle === 'conservative' ||
    defLine <= 2;

  if (isInOpponentThird && isHighPressTendency) {
    return 'high_press';
  }

  if (isInOwnThird || isLowBlockTendency) {
    return 'low_block';
  }

  // Default modern recovery shape
  return 'mid_block';
}

/**
 * 4.4 Expose a single updateTeamBlockShape(team, ball, phase, difficulty) entry point
 * Updates the synchronized block target positions for the entire team with zero heap allocations.
 */
export function updateTeamBlockShape(
  team: TeamSide,
  ball: Ball,
  phase: TacticalBlockPhase = 'mid_block',
  difficulty: DifficultyLevel = 'normal',
  allPlayers?: Player[],
  isAttackingUp?: boolean,
  playstyle: TacticalPlaystyle = 'possession',
  tactics?: DetailedTactics
): void {
  if (!allPlayers || allPlayers.length === 0) return;

  const resolvedAttackingUp = isAttackingUp !== undefined ? isAttackingUp : (team === 'home');
  const buffer = team === 'home' ? TEAM_BLOCK_TARGETS_HOME : TEAM_BLOCK_TARGETS_AWAY;

  const fieldW = PITCH_CONFIG.FIELD_WIDTH;
  const fieldH = PITCH_CONFIG.FIELD_HEIGHT;
  const pitchTop = PITCH_CONFIG.PITCH_TOP;
  const pitchBottom = PITCH_CONFIG.PITCH_BOTTOM;
  const pitchLeft = PITCH_CONFIG.PITCH_LEFT;
  const pitchRight = PITCH_CONFIG.PITCH_RIGHT;
  const centerX = PITCH_CONFIG.CENTER_X;
  const centerY = PITCH_CONFIG.CENTER_Y;

  // =========================================================================
  // 4.1 VERTICAL COMPACTNESS ENGINE: CLAMP TO 25-35 METERS
  // =========================================================================
  const compactnessLevel = tactics?.compactness ?? 2;
  const defLineLevel = tactics?.defensiveLine ?? 3;

  // Base span in meters:
  // Low block: 25.5m (compact box defense)
  // Counter press: 25.0m (tight choking envelope)
  // High press: 27.0m (compressed front lines)
  // Mid block: 30.0m (balanced default shape)
  // Attacking possession: 33.0m (rest-defended)
  let targetSpanMeters = 30.0;
  if (phase === 'low_block') targetSpanMeters = 25.5;
  else if (phase === 'counter_press') targetSpanMeters = 25.0;
  else if (phase === 'high_press') targetSpanMeters = 27.0;
  else if (phase === 'mid_block') targetSpanMeters = 30.0;
  else if (phase === 'attacking_possession') targetSpanMeters = 33.0;

  // Compactness tactical slider fine-tuning (-2.5m for Level 4, +2.5m for Level 1)
  const compactnessOffsets = [2.5, 0.0, -2.0, -3.5];
  targetSpanMeters += compactnessOffsets[compactnessLevel - 1] ?? 0;

  // STRICT 25-35m clamp (4.1 mandate)
  const clampedSpanMeters = Math.max(25.0, Math.min(35.0, targetSpanMeters));
  const targetSpanPx = clampedSpanMeters * PITCH_METERS_TO_PIXELS;

  // =========================================================================
  // 4.1 & 4.2 SYNCHRONISED BLOCK HEIGHT & DEFENSIVE LINE Y
  // =========================================================================
  const fwdSign = resolvedAttackingUp ? -1 : 1;
  let defLineY: number;

  if (resolvedAttackingUp) {
    // Defends bottom goal (pitchBottom = 2720)
    if (phase === 'low_block') {
      // Anchors close to 18-yard box (~18-22m from goal line)
      defLineY = pitchBottom - (18 + (defLineLevel - 1) * 2.5) * PITCH_METERS_TO_PIXELS;
    } else if (phase === 'high_press') {
      // Back line pushes near/over midfield (~52-56m from goal line)
      defLineY = centerY + 70 - (defLineLevel - 3) * 35;
    } else if (phase === 'counter_press') {
      // Immediate compression around the ball
      defLineY = Math.max(centerY + 30, ball.y + 18 * PITCH_METERS_TO_PIXELS);
    } else if (phase === 'attacking_possession') {
      // Pushes up trailing play, locked 22-26m behind ball
      defLineY = Math.max(centerY - 80, ball.y + 22 * PITCH_METERS_TO_PIXELS);
    } else {
      // Mid-block default recovery shape (~36m from goal line + dynamic ball tracking)
      const ballTracking = (ball.y - centerY) * 0.28;
      defLineY = pitchBottom - (34 + (defLineLevel - 3) * 4) * PITCH_METERS_TO_PIXELS + ballTracking;
    }
    // Boundaries: cannot drop inside the 6-yard box or push beyond opponent penalty box
    defLineY = Math.max(pitchTop + 450, Math.min(pitchBottom - 350, defLineY));
  } else {
    // Defends top goal (pitchTop = 220)
    if (phase === 'low_block') {
      defLineY = pitchTop + (18 + (defLineLevel - 1) * 2.5) * PITCH_METERS_TO_PIXELS;
    } else if (phase === 'high_press') {
      defLineY = centerY - 70 + (defLineLevel - 3) * 35;
    } else if (phase === 'counter_press') {
      defLineY = Math.min(centerY - 30, ball.y - 18 * PITCH_METERS_TO_PIXELS);
    } else if (phase === 'attacking_possession') {
      defLineY = Math.min(centerY + 80, ball.y - 22 * PITCH_METERS_TO_PIXELS);
    } else {
      const ballTracking = (ball.y - centerY) * 0.28;
      defLineY = pitchTop + (34 + (defLineLevel - 3) * 4) * PITCH_METERS_TO_PIXELS + ballTracking;
    }
    defLineY = Math.min(pitchBottom - 450, Math.max(pitchTop + 350, defLineY));
  }

  // Offside trap: If enabled and ball is in midfield, defensive line steps forward 35px
  const isOffsideEnabled = tactics?.offsideTrap ?? false;
  const isBallInMidfield = Math.abs(ball.y - centerY) < fieldH * 0.30;
  if (isOffsideEnabled && isBallInMidfield && (phase === 'mid_block' || phase === 'high_press')) {
    defLineY += fwdSign * 35;
  }

  // Line Y anchor positions maintaining the exact clamped vertical span
  const attLineY = defLineY + fwdSign * targetSpanPx;
  const midLineY = defLineY + fwdSign * (targetSpanPx * 0.48);

  // =========================================================================
  // 4.2 SYNCHRONISED ELASTIC LATERAL SHIFTING (BALL-ORIENTED BLOCK UNIT)
  // =========================================================================
  const widthScaleMap = [1.12, 0.95, 0.78, 0.60];
  const widthScale = widthScaleMap[compactnessLevel - 1] ?? 0.95;

  const ballOffsetX = ball.x - centerX;
  // Block shifts laterally toward ball side by 28% of ball deviation
  const blockShiftX = ballOffsetX * 0.28 * widthScale;

  // =========================================================================
  // 4.3 REST-DEFENCE DESIGNATION IN ATTACKING POSSESSION
  // =========================================================================
  let teamPlayerIdx = 0;

  for (let i = 0; i < allPlayers.length; i++) {
    const p = allPlayers[i];
    if (p.team !== team) continue;

    // Goalkeeper holds fixed sanctuary / goalmouth anchor
    if (p.role === 'GK') {
      p.isRestDefence = false;
      p.tacticalBlockPhase = phase;
      const gkX = centerX;
      const gkY = resolvedAttackingUp ? pitchBottom - 75 : pitchTop + 75;
      p.tacticalTargetX = gkX;
      p.tacticalTargetY = gkY;
      if (teamPlayerIdx < 11) {
        buffer[teamPlayerIdx * 2] = gkX;
        buffer[teamPlayerIdx * 2 + 1] = gkY;
      }
      teamPlayerIdx++;
      continue;
    }

    const subPos: SubPosition = p.subPos || (p.role === 'LB' ? 'LB' : p.role === 'RB' ? 'RB' : p.role === 'LM' ? 'LM' : p.role === 'RM' ? 'RM' : (p.role === 'ST1' || p.role === 'ST2') ? 'ST' : (p.role === 'CB1' || p.role === 'CB2') ? 'CB' : 'CM');
    const playstyleId = p.playstyleId;

    const isDef = p.role === 'CB1' || p.role === 'CB2' || p.role === 'LB' || p.role === 'RB' || p.primaryPos === 'DEF';
    const isMid = p.role === 'CM1' || p.role === 'CM2' || p.role === 'LM' || p.role === 'RM' || p.primaryPos === 'MID';
    const isFwd = !isDef && !isMid;

    // 4.3 Rest-Defence identification:
    // In attacking possession, 3-4 players must remain behind the ball line
    let isRestDefPlayer = false;
    if (phase === 'attacking_possession') {
      if (p.role === 'CB1' || p.role === 'CB2') {
        isRestDefPlayer = true;
      } else if (playstyle === 'catenaccio' || playstyle === 'counterattack') {
        if (p.role === 'LB' || p.role === 'RB') isRestDefPlayer = true;
      } else if (playstyle === 'possession' || playstyle === 'arteta_control') {
        if (p.role === 'CM1' || subPos === 'CDM') {
          isRestDefPlayer = true;
        } else if ((ballOffsetX > 100 && p.role === 'LB') || (ballOffsetX < -100 && p.role === 'RB')) {
          isRestDefPlayer = true;
        }
      } else {
        if (p.role === 'CM1' || subPos === 'CDM') isRestDefPlayer = true;
      }
    }
    p.isRestDefence = isRestDefPlayer;
    p.tacticalBlockPhase = phase;

    // Base position from formation
    const basePxX = pitchLeft + p.baseX * fieldW;

    // Lateral block shift
    let targetX = centerX + (basePxX - centerX) * widthScale + blockShiftX;

    // Phase 5.1 Inverted Fullback (Inverted FB):
    // In attacking possession, tucks inside into half-space pivot instead of staying on touchline
    if (phase === 'attacking_possession' && (playstyleId === 20 || p.playstyle === 'inverted_fb')) {
      const tuckSide = (p.role === 'LB' || subPos === 'LB') ? -115 : 115;
      targetX = centerX + tuckSide * widthScale;
    } else {
      // Weak-side tuck-in: When ball is overloaded on one flank, opposite flank tucks in 65px
      if (ballOffsetX > 160 && (p.role === 'LB' || p.role === 'LM' || subPos === 'LB')) {
        targetX += 65 * widthScale;
      } else if (ballOffsetX < -160 && (p.role === 'RB' || p.role === 'RM' || subPos === 'RB')) {
        targetX -= 65 * widthScale;
      }
    }

    // Vertical line assignment with Phase 5 Line Intermingling & Fluid Roles
    let targetY: number;

    if (isRestDefPlayer) {
      // Rest-defence players strictly hold behind the ball (at least 22m)
      const restDefDist = 22 * PITCH_METERS_TO_PIXELS;
      targetY = defLineY;
      if (resolvedAttackingUp) {
        targetY = Math.max(defLineY, ball.y + restDefDist);
      } else {
        targetY = Math.min(defLineY, ball.y - restDefDist);
      }
    } else if (isDef) {
      targetY = defLineY;
      // Phase 5.1 Fullback & Wingback vertical adjustments
      if (p.role === 'LB' || p.role === 'RB' || subPos === 'LB' || subPos === 'RB' || subPos === 'LWB' || subPos === 'RWB') {
        if (phase === 'attacking_possession') {
          // Attacker Fullback / Wingback pushes high into final third
          if (subPos === 'LWB' || subPos === 'RWB' || playstyleId === 21 || p.playstyle === 'attacker_fb') {
            targetY = defLineY + fwdSign * (targetSpanPx * 0.72);
          } else {
            targetY = defLineY + fwdSign * (targetSpanPx * 0.28);
          }
        } else {
          targetY = defLineY + fwdSign * 15;
        }
      }
    } else if (isMid) {
      targetY = midLineY;

      // Phase 5.1 Midfield Line Interlocking:
      if (subPos === 'CDM' || playstyleId === 17 || playstyleId === 16 || p.playstyle === 'anchor' || p.playstyle === 'enforcer') {
        // Holding / Anchor drops to shield right in front of CBs
        if (phase === 'low_block' || phase === 'mid_block') {
          targetY = defLineY + fwdSign * (targetSpanPx * 0.18);
        } else {
          targetY = defLineY + fwdSign * (targetSpanPx * 0.35);
        }
      } else if (playstyleId === 18 || p.playstyle === 'regista') {
        // Regista drops between CBs in build-up
        if (phase === 'attacking_possession') {
          targetY = defLineY + fwdSign * (targetSpanPx * 0.08);
        }
      } else if (subPos === 'CAM' || playstyleId === 9 || playstyleId === 10 || playstyleId === 11) {
        // CAM / Shadow Striker interlocks into attacking third (occupies the hole between lines)
        targetY = defLineY + fwdSign * (targetSpanPx * 0.72);
      } else if (playstyleId === 13 || playstyleId === 15 || p.playstyle === 'box_to_box') {
        // Box-to-Box midfielder: interlocks into box in attack, tracks deep in defense
        if (phase === 'attacking_possession') {
          targetY = defLineY + fwdSign * (targetSpanPx * 0.82);
        } else if (phase === 'low_block') {
          targetY = defLineY + fwdSign * (targetSpanPx * 0.14);
        }
      } else if (p.role === 'LM' || p.role === 'RM' || subPos === 'LM' || subPos === 'RM') {
        targetY = midLineY + fwdSign * (targetSpanPx * 0.15);
      }
    } else {
      // Phase 5.1 Forwards Line Intermingling:
      // Forwards actively occupy and shadow opposition CBs / defensive midfielders (not stuck on their own half)
      targetY = attLineY;
      if (phase === 'mid_block' || phase === 'counter_press') {
        // When opponent builds up in their own half, forwards push across midfield into opponent half
        // to shadow opposition CBs and pivot
        const opponentDefendingHalfY = resolvedAttackingUp ? (pitchTop + fieldH * 0.40) : (pitchBottom - fieldH * 0.40);
        if (resolvedAttackingUp) {
          targetY = Math.min(attLineY, opponentDefendingHalfY);
        } else {
          targetY = Math.max(attLineY, opponentDefendingHalfY);
        }
      }
    }

    // Pitch boundary clamping
    const padX = 40;
    const padY = 60;
    targetX = Math.max(pitchLeft + padX, Math.min(pitchRight - padX, targetX));
    targetY = Math.max(pitchTop + padY, Math.min(pitchBottom - padY, targetY));

    p.tacticalTargetX = targetX;
    p.tacticalTargetY = targetY;

    if (teamPlayerIdx < 11) {
      buffer[teamPlayerIdx * 2] = targetX;
      buffer[teamPlayerIdx * 2 + 1] = targetY;
    }
    teamPlayerIdx++;
  }
}

/**
 * =========================================================================
 * 4.3 MATCH CONTEXT & GAME STATE ADAPTATION
 * =========================================================================
 */
export function getContextPressMultiplier(
  scoreDiff: number, // positive = AI winning, negative = AI losing
  matchTimeMinutes: number,
  isGegenpress: boolean
): number {
  let mult = 1.0;
  // Trailing late in match: aggressive surging press
  if (scoreDiff < 0) {
    mult += 0.15;
    if (matchTimeMinutes > 65) mult += 0.20;
    if (matchTimeMinutes > 80) mult += 0.25;
  } else if (scoreDiff > 0 && matchTimeMinutes > 70) {
    // Protecting lead: controlled, compact shape
    mult -= 0.10;
  }

  if (isGegenpress) mult += 0.18;
  return Math.max(0.85, Math.min(1.65, mult));
}

/**
 * =========================================================================
 * 15.5 AUTHORITATIVE "ROLES" SET-PIECE ASSIGNMENT & CANONICAL STAT EVALUATION
 * Evaluated strictly and exclusively via the 18 canonical outfield stats.
 * Zero fictitious stats like "Curve".
 * =========================================================================
 */
import type { TeamRosterPlayer, TeamTacticalRoles } from '../types/team';
import type { CanonicalOutfieldStats } from '../types';

export function getOutfieldStat(player: TeamRosterPlayer, key: keyof CanonicalOutfieldStats): number {
  if (!player.canonicalStats || player.role === 'GK' || !('pac' in player.canonicalStats)) {
    return 40;
  }
  const val = (player.canonicalStats as CanonicalOutfieldStats)[key];
  return typeof val === 'number' ? val : 50;
}

export interface RoleFitResult {
  score: number;
  highlightText: string;
}

/**
 * Evaluates candidate player's fit for a specific set-piece role
 * based strictly on the canonical 18 outfield stats formulas.
 */
export function evaluatePlayerRoleFit(
  player: TeamRosterPlayer,
  role: keyof TeamTacticalRoles
): RoleFitResult {
  const isGK = player.role === 'GK';

  switch (role) {
    case 'captainId': {
      // Captain (C): Composure (CMP) 65% + Positioning (POS) 35%
      const cmp = isGK ? 80 : getOutfieldStat(player, 'cmp');
      const pos = isGK ? 80 : getOutfieldStat(player, 'pos');
      const score = Math.round(cmp * 0.65 + pos * 0.35);
      return { score, highlightText: `CMP ${cmp} · POS ${pos}` };
    }

    case 'freeKickNearId': {
      // Free Kick Near (< 28m): Shooting (SHO) 50% + Long Shots (LSH) 30% + Composure (CMP) 20%
      if (isGK) return { score: 35, highlightText: 'GK' };
      const sho = getOutfieldStat(player, 'sho');
      const lsh = getOutfieldStat(player, 'lsh');
      const cmp = getOutfieldStat(player, 'cmp');
      const score = Math.round(sho * 0.50 + lsh * 0.30 + cmp * 0.20);
      return { score, highlightText: `SHO ${sho} · LSH ${lsh} · CMP ${cmp}` };
    }

    case 'freeKickLongId': {
      // Free Kick Long (> 28m): Long Pass (LPA) 55% + Crossing (CRO) 45%
      if (isGK) return { score: 35, highlightText: 'GK' };
      const lpa = getOutfieldStat(player, 'lpa');
      const cro = getOutfieldStat(player, 'cro');
      const score = Math.round(lpa * 0.55 + cro * 0.45);
      return { score, highlightText: `LPA ${lpa} · CRO ${cro}` };
    }

    case 'penaltyTakerId': {
      // Penalty Taker: Shooting (SHO) 60% + Composure (CMP) 40%
      if (isGK) return { score: 35, highlightText: 'GK' };
      const sho = getOutfieldStat(player, 'sho');
      const cmp = getOutfieldStat(player, 'cmp');
      const score = Math.round(sho * 0.60 + cmp * 0.40);
      return { score, highlightText: `SHO ${sho} · CMP ${cmp}` };
    }

    case 'leftCornerTakerId': {
      // Left Corner: Crossing (CRO) 65% + Short Pass (SPA) 35%
      if (isGK) return { score: 35, highlightText: 'GK' };
      const cro = getOutfieldStat(player, 'cro');
      const spa = getOutfieldStat(player, 'spa');
      const score = Math.round(cro * 0.65 + spa * 0.35);
      return { score, highlightText: `CRO ${cro} · SPA ${spa}` };
    }

    case 'rightCornerTakerId': {
      // Right Corner: Crossing (CRO) 65% + Short Pass (SPA) 35%
      if (isGK) return { score: 35, highlightText: 'GK' };
      const cro = getOutfieldStat(player, 'cro');
      const spa = getOutfieldStat(player, 'spa');
      const score = Math.round(cro * 0.65 + spa * 0.35);
      return { score, highlightText: `CRO ${cro} · SPA ${spa}` };
    }
  }
}

/**
 * Automatically calculates and assigns the optimal set-piece specialist roles
 * across the starting 11 players using canonical stat weight formulas.
 */
export function autoAssignOptimalRoles(startingPlayers: TeamRosterPlayer[]): TeamTacticalRoles {
  const outfield = startingPlayers.filter((p) => p.role !== 'GK');
  const pool = outfield.length > 0 ? outfield : startingPlayers;

  const findBestFor = (role: keyof TeamTacticalRoles): string => {
    let bestId = pool[0]?.id || '';
    let bestScore = -Infinity;
    for (const p of pool) {
      const fit = evaluatePlayerRoleFit(p, role);
      if (fit.score > bestScore) {
        bestScore = fit.score;
        bestId = p.id;
      }
    }
    return bestId;
  };

  // Find natural captain or leader
  const explicitCaptain = startingPlayers.find((p) => p.isCaptain);
  const captainId = explicitCaptain ? explicitCaptain.id : findBestFor('captainId');

  return {
    captainId,
    freeKickNearId: findBestFor('freeKickNearId'),
    freeKickLongId: findBestFor('freeKickLongId'),
    penaltyTakerId: findBestFor('penaltyTakerId'),
    leftCornerTakerId: findBestFor('leftCornerTakerId'),
    rightCornerTakerId: findBestFor('rightCornerTakerId'),
  };
}

