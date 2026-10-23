/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PITCH_CONFIG } from './constants';

export type BoundaryCrossingType =
  | 'none'
  | 'touchline_left'
  | 'touchline_right'
  | 'endline_top'
  | 'endline_bottom';

export interface PitchCrossingResult {
  hasExited: boolean;
  type: BoundaryCrossingType;
  crossingX: number;
  crossingY: number;
  crossingZ: number;
  t: number; // 0..1 parameter along ray from prev to current
  isGoalMouthEntrance: boolean; // True if crossing enters the open goal frame under crossbar
}

/**
 * Checks whether a 2D coordinate is strictly within the playable pitch perimeter
 */
export function isPointInsidePitch(x: number, y: number, buffer: number = 0): boolean {
  return (
    x >= PITCH_CONFIG.PITCH_LEFT - buffer &&
    x <= PITCH_CONFIG.PITCH_RIGHT + buffer &&
    y >= PITCH_CONFIG.PITCH_TOP - buffer &&
    y <= PITCH_CONFIG.PITCH_BOTTOM + buffer
  );
}

/**
 * Checks if a point is within the physical goal mouth (between goalposts and under crossbar)
 */
export function isInsideGoalFrame(x: number, y: number, z: number = 0, whichGoal: 'top' | 'bottom'): boolean {
  const goalLeft = PITCH_CONFIG.CENTER_X - PITCH_CONFIG.GOAL_WIDTH / 2;
  const goalRight = PITCH_CONFIG.CENTER_X + PITCH_CONFIG.GOAL_WIDTH / 2;
  const isWithinPosts = x >= goalLeft && x <= goalRight;
  const isUnderCrossbar = z <= PITCH_CONFIG.GOAL_CROSSBAR_HEIGHT + 2;

  if (!isWithinPosts || !isUnderCrossbar) return false;

  if (whichGoal === 'top') {
    return y <= PITCH_CONFIG.PITCH_TOP + 4 && y >= PITCH_CONFIG.PITCH_TOP - PITCH_CONFIG.GOAL_DEPTH - 15;
  } else {
    return y >= PITCH_CONFIG.PITCH_BOTTOM - 4 && y <= PITCH_CONFIG.PITCH_BOTTOM + PITCH_CONFIG.GOAL_DEPTH + 15;
  }
}

interface BoundaryCandidate {
  type: BoundaryCrossingType;
  t: number;
  x: number;
  y: number;
  z: number;
  isGoalMouth: boolean;
}

/**
 * Robust Pitch-Boundary Raycasting:
 * Evaluates line segment from previous ball position (p0) to current ball position (p1).
 * Detects the earliest boundary segment intersection (t in [0, 1]), correctly discriminating
 * between Touchline (sideline) and Endline (goal line) crossings, even when the ball exits
 * near corner flags.
 */
export function raycastPitchBoundary(
  prevX: number,
  prevY: number,
  prevZ: number,
  currX: number,
  currY: number,
  currZ: number
): PitchCrossingResult {
  const left = PITCH_CONFIG.PITCH_LEFT;
  const right = PITCH_CONFIG.PITCH_RIGHT;
  const top = PITCH_CONFIG.PITCH_TOP;
  const bottom = PITCH_CONFIG.PITCH_BOTTOM;

  const goalLeft = PITCH_CONFIG.CENTER_X - PITCH_CONFIG.GOAL_WIDTH / 2;
  const goalRight = PITCH_CONFIG.CENTER_X + PITCH_CONFIG.GOAL_WIDTH / 2;
  const crossbarHeight = PITCH_CONFIG.GOAL_CROSSBAR_HEIGHT;

  const dx = currX - prevX;
  const dy = currY - prevY;
  const dz = currZ - prevZ;

  // STRICT IN-PLAY CHECK:
  // If the ball's current position is inside the playable pitch perimeter,
  // it has NOT exited the pitch! (Crucial for throw-ins and dead-ball deliveries
  // entering the field from touchlines/corners).
  const isCurrInside = currX >= left && currX <= right && currY >= top && currY <= bottom;
  if (isCurrInside) {
    return {
      hasExited: false,
      type: 'none',
      crossingX: currX,
      crossingY: currY,
      crossingZ: currZ,
      t: 1,
      isGoalMouthEntrance: false,
    };
  }

  const isPrevInside = prevX >= left && prevX <= right && prevY >= top && prevY <= bottom;

  const candidates: BoundaryCandidate[] = [];

  // 1. Left Touchline (x = left, y in [top, bottom])
  if (Math.abs(dx) > 1e-6) {
    const t = (left - prevX) / dx;
    if (t >= -0.05 && t <= 1.05) {
      const yCross = prevY + t * dy;
      if (yCross >= top - 2 && yCross <= bottom + 2) {
        const zCross = Math.max(0, prevZ + t * dz);
        candidates.push({
          type: 'touchline_left',
          t,
          x: left,
          y: Math.max(top, Math.min(bottom, yCross)),
          z: zCross,
          isGoalMouth: false,
        });
      }
    }
  }

  // 2. Right Touchline (x = right, y in [top, bottom])
  if (Math.abs(dx) > 1e-6) {
    const t = (right - prevX) / dx;
    if (t >= -0.05 && t <= 1.05) {
      const yCross = prevY + t * dy;
      if (yCross >= top - 2 && yCross <= bottom + 2) {
        const zCross = Math.max(0, prevZ + t * dz);
        candidates.push({
          type: 'touchline_right',
          t,
          x: right,
          y: Math.max(top, Math.min(bottom, yCross)),
          z: zCross,
          isGoalMouth: false,
        });
      }
    }
  }

  // 3. Top Endline (y = top, x in [left, right])
  if (Math.abs(dy) > 1e-6) {
    const t = (top - prevY) / dy;
    if (t >= -0.05 && t <= 1.05) {
      const xCross = prevX + t * dx;
      if (xCross >= left - 2 && xCross <= right + 2) {
        const zCross = Math.max(0, prevZ + t * dz);
        const inGoal = xCross >= goalLeft + 2 && xCross <= goalRight - 2 && zCross <= crossbarHeight + 2;
        candidates.push({
          type: 'endline_top',
          t,
          x: Math.max(left, Math.min(right, xCross)),
          y: top,
          z: zCross,
          isGoalMouth: inGoal,
        });
      }
    }
  }

  // 4. Bottom Endline (y = bottom, x in [left, right])
  if (Math.abs(dy) > 1e-6) {
    const t = (bottom - prevY) / dy;
    if (t >= -0.05 && t <= 1.05) {
      const xCross = prevX + t * dx;
      if (xCross >= left - 2 && xCross <= right + 2) {
        const zCross = Math.max(0, prevZ + t * dz);
        const inGoal = xCross >= goalLeft + 2 && xCross <= goalRight - 2 && zCross <= crossbarHeight + 2;
        candidates.push({
          type: 'endline_bottom',
          t,
          x: Math.max(left, Math.min(right, xCross)),
          y: bottom,
          z: zCross,
          isGoalMouth: inGoal,
        });
      }
    }
  }

  // Filter candidates: valid t >= -0.05
  if (candidates.length > 0) {
    // Sort by earliest crossing along the trajectory ray
    candidates.sort((a, b) => a.t - b.t);
    const earliest = candidates[0];

    // If it crossed through the goal frame under crossbar, it's a goal mouth entrance, not out-of-bounds!
    if (earliest.isGoalMouth) {
      return {
        hasExited: false,
        type: earliest.type,
        crossingX: earliest.x,
        crossingY: earliest.y,
        crossingZ: earliest.z,
        t: earliest.t,
        isGoalMouthEntrance: true,
      };
    }

    return {
      hasExited: true,
      type: earliest.type,
      crossingX: earliest.x,
      crossingY: earliest.y,
      crossingZ: earliest.z,
      t: earliest.t,
      isGoalMouthEntrance: false,
    };
  }

  // Fallback: if both prev and curr were already outside or ray failed
  if (!isCurrInside) {
    // Check if inside goal mouth first
    if (currY < top && currX >= goalLeft && currX <= goalRight && currZ <= crossbarHeight) {
      return {
        hasExited: false,
        type: 'endline_top',
        crossingX: currX,
        crossingY: top,
        crossingZ: currZ,
        t: 1,
        isGoalMouthEntrance: true,
      };
    }
    if (currY > bottom && currX >= goalLeft && currX <= goalRight && currZ <= crossbarHeight) {
      return {
        hasExited: false,
        type: 'endline_bottom',
        crossingX: currX,
        crossingY: bottom,
        crossingZ: currZ,
        t: 1,
        isGoalMouthEntrance: true,
      };
    }

    // Determine whether sideline or endline was the exit using distance from pitch edges
    const distPastLeft = left - currX;
    const distPastRight = currX - right;
    const distPastTop = top - currY;
    const distPastBottom = currY - bottom;

    const maxDistX = Math.max(distPastLeft, distPastRight);
    const maxDistY = Math.max(distPastTop, distPastBottom);

    if (maxDistX > 0 && maxDistY <= 0) {
      // Exited sideline only
      return {
        hasExited: true,
        type: distPastLeft > 0 ? 'touchline_left' : 'touchline_right',
        crossingX: distPastLeft > 0 ? left : right,
        crossingY: Math.max(top, Math.min(bottom, currY)),
        crossingZ: currZ,
        t: 1,
        isGoalMouthEntrance: false,
      };
    } else if (maxDistY > 0 && maxDistX <= 0) {
      // Exited endline only
      return {
        hasExited: true,
        type: distPastTop > 0 ? 'endline_top' : 'endline_bottom',
        crossingX: Math.max(left, Math.min(right, currX)),
        crossingY: distPastTop > 0 ? top : bottom,
        crossingZ: currZ,
        t: 1,
        isGoalMouthEntrance: false,
      };
    } else if (maxDistX > 0 && maxDistY > 0) {
      // Near corner flag: use velocity vector to discern whether it exited sideline or endline
      if (Math.abs(dx) > Math.abs(dy)) {
        return {
          hasExited: true,
          type: distPastLeft > 0 ? 'touchline_left' : 'touchline_right',
          crossingX: distPastLeft > 0 ? left : right,
          crossingY: distPastTop > 0 ? top : bottom,
          crossingZ: currZ,
          t: 1,
          isGoalMouthEntrance: false,
        };
      } else {
        return {
          hasExited: true,
          type: distPastTop > 0 ? 'endline_top' : 'endline_bottom',
          crossingX: distPastLeft > 0 ? left : right,
          crossingY: distPastTop > 0 ? top : bottom,
          crossingZ: currZ,
          t: 1,
          isGoalMouthEntrance: false,
        };
      }
    }
  }

  return {
    hasExited: false,
    type: 'none',
    crossingX: currX,
    crossingY: currY,
    crossingZ: currZ,
    t: 1,
    isGoalMouthEntrance: false,
  };
}
