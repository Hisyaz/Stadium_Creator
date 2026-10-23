import {
  Ball,
  TurfParticle,
  BallTrailPoint,
  GoalNetState,
  TurfQuality,
  GrassLength,
  WeatherCondition,
  Season,
  NetTension,
  GoalFrameType,
  PuddleZone,
} from '../types';
import { PITCH_CONFIG, PHYSICS } from './constants';
import { audio } from './audio';
import { getTurfRollingModifiers, applyPoorTurfMicroHops } from './turfPhysics';
import { getWeatherSurfaceModifiers, processBallPuddlePhysics } from './weatherEngine';
import {
  processGoalNetCollision,
  updateGoalNetOscillation,
  getGoalFrameMetrics,
} from './goalNetPhysics';

export interface GoalEvent {
  teamScored: 'home' | 'away';
  x: number;
  y: number;
}

/**
 * Aerodynamic soccer ball constants grounded in sports physics
 * (FIFA regulation size 5 football, 430g, 22cm diameter)
 */
const BALL_AERO = {
  MAGNUS_COEFF: 0.0125, // Lateral acceleration per unit of spin * velocity
  LIFT_COEFF: 0.008,    // Vertical lift from backspin
  SPIN_DECAY: 0.986,    // Rate at which ball spin attenuates in flight
  TURF_SPIN_GRIP: 0.35, // Spin to linear velocity transfer on bounce
  MAX_DEFORMATION: 0.85,// Maximum elongation factor (oval stretch)
  MIN_SPEED_DEFORM: 3.2,// Speed threshold before elongation kicks in
};

/**
 * Updates 3D ball physics with realistic aerodynamics:
 * - Magnus effect curl (swerve/banana arc)
 * - Velocity-aligned oval deformation / bending
 * - True grass turf restitution, skid, and spin transfer
 * - Goal post rebounds and net cushioning
 */
export function updateBallPhysics(
  ball: Ball,
  onGoalScored: (event: GoalEvent) => void,
  topGoalNet?: GoalNetState,
  bottomGoalNet?: GoalNetState,
  timeScale: number = 1,
  turfQuality: TurfQuality = 'normal',
  grassLength: GrassLength = 'normal',
  weather: WeatherCondition = 'clear',
  season: Season = 'summer',
  puddles: PuddleZone[] = [],
  netTension: NetTension = 'moderate',
  goalFrame: GoalFrameType = 'standard',
  homeAttacksUp: boolean = true
): TurfParticle[] {
  const particles: TurfParticle[] = [];

  // Initialize optional physics properties if not present
  if (ball.spin === undefined) ball.spin = 0;
  if (ball.spinY === undefined) ball.spinY = 0;
  if (!ball.trail) ball.trail = [];
  if (ball.squashTimer === undefined) ball.squashTimer = 0;

  // If player owns ball, ball follows player closely at their feet
  if (ball.ownerId) {
    ball.z = 0;
    ball.vz = 0;
    ball.spin = 0;
    ball.spinY = 0;
    ball.isAirborne = false;
    ball.deformation = 0;
    ball.squashTimer = 0;
    ball.trail = [];
    return particles;
  }

  // 1. Aerodynamic forces in flight (Magnus effect curl & backspin lift)
  const horizSpeed = Math.hypot(ball.vx, ball.vy);
  const totalSpeed = Math.hypot(horizSpeed, ball.vz);

  if (ball.z > 0 || ball.vz > 0) {
    ball.isAirborne = true;

    // MAGNUS EFFECT CURL & KNUCKLEBALL AERODYNAMICS:
    if (ball.isKnuckle) {
      // Knuckleball has STRICTLY NO CURVE
      ball.spin = 0;
      ball.spinY = 0;

      if (ball.isOverpowered) {
        // "when overpower the hit never comes back down it just keeps going up and to the stands"
        ball.vz = Math.max(ball.vz, 3.4);
      } else {
        // "ball goes up then falls down, no curve, more powerful"
        // Once it reaches apex / descending phase, it dips violently!
        if (ball.z > 6 && ball.vz <= 1.4) {
          ball.vz -= 0.38 * timeScale; // Sudden violent aerodynamic knuckle dip
          ball.knuckleDipped = true;
        }
      }
    } else if (Math.abs(ball.spin) > 0.05 && horizSpeed > 0.5) {
      // Magnus aerodynamic lateral curve:
      let coeff = 0.0016;
      if (ball.isSpecialCurve) {
        coeff = ball.isOverpowered ? 0.0034 : 0.0026;
      }
      const lateralAccel = Math.min(0.55, Math.abs(ball.spin) * coeff * horizSpeed);
      const spinSign = Math.sign(ball.spin);

      const oldVx = ball.vx;
      const oldVy = ball.vy;

      // Unit perpendicular vector: (-oldVy / horizSpeed, oldVx / horizSpeed)
      const defX = (-oldVy / horizSpeed) * lateralAccel * spinSign * timeScale;
      const defY = (oldVx / horizSpeed) * lateralAccel * spinSign * timeScale;

      ball.vx += defX;

      // Safeguard: Preserve the forward attacking direction of the ball
      if (oldVy < -1.5) {
        ball.vy = Math.min(-1.0, oldVy + defY * 0.4);
      } else if (oldVy > 1.5) {
        ball.vy = Math.max(1.0, oldVy + defY * 0.4);
      } else {
        ball.vy += defY;
      }

      // Spin decays in air due to boundary layer friction
      const decay = ball.isSpecialCurve ? 0.992 : BALL_AERO.SPIN_DECAY;
      ball.spin = ball.spin * Math.pow(decay, timeScale);
    }

    // Phase 6: ⚡ Thunderbolt Cannon erratic knuckleball wobble trajectory
    if (ball.isThunderbolt && horizSpeed > 2.0) {
      ball.thunderboltWobblePhase = (ball.thunderboltWobblePhase || 0) + 0.32 * timeScale;
      const wobble = Math.sin(ball.thunderboltWobblePhase) * 0.38 * timeScale;
      ball.vx += (-ball.vy / horizSpeed) * wobble;
      ball.vy += (ball.vx / horizSpeed) * wobble;
    }

    // Phase 7.1 Backspin / Topspin vertical aerodynamic lift
    // Backspin (spinY < 0) generates positive Magnus lift keeping driven balls and switches in flight;
    // Topspin (spinY > 0) creates dipping downward Magnus force
    if (!ball.isKnuckle && ball.spinY && Math.abs(ball.spinY) > 0.05 && horizSpeed > 1.0) {
      const aeroLift = -ball.spinY * BALL_AERO.LIFT_COEFF * horizSpeed * timeScale;
      ball.vz += aeroLift;
      ball.spinY = ball.spinY * Math.pow(BALL_AERO.SPIN_DECAY, timeScale);
    }

    // Phase 7.1 Gravity & Authentic Aerodynamic Drag (Extended Flight Curve)
    // Distance makes aiming harder; aerodynamic drag does NOT kill velocity!
    if (!(ball.isKnuckle && ball.isOverpowered)) {
      ball.vz -= PHYSICS.GRAVITY * timeScale;
    }
    // High-speed soccer balls enter the aerodynamic drag crisis where Cd drops significantly:
    let currentAirDrag = PHYSICS.BALL_AIR_DRAG;
    if (totalSpeed > 16.0) {
      // Drag crisis: narrow turbulent wake preserves piercing flight velocity
      currentAirDrag = Math.min(0.9984, currentAirDrag + 0.0012);
    } else {
      // Sub-critical speed: mild aerodynamic attenuation
      currentAirDrag = Math.max(0.993, currentAirDrag - totalSpeed * 0.00012);
    }
    const dragFactor = Math.pow(currentAirDrag, timeScale);
    ball.vx *= dragFactor;
    ball.vy *= dragFactor;
    ball.vz *= dragFactor;
  }

  // 2. Position Integration (scaled by game speed timeScale)
  ball.prevX = ball.x;
  ball.prevY = ball.y;
  ball.prevZ = ball.z;
  ball.x += ball.vx * timeScale;
  ball.y += ball.vy * timeScale;
  ball.z += ball.vz * timeScale;

  // 3. Ground Collision & Realistic Turf Bounce
  const turfMods = getTurfRollingModifiers(turfQuality, grassLength);
  const weatherMods = getWeatherSurfaceModifiers(weather, season, turfQuality);

  if (ball.z <= 0) {
    ball.z = 0;

    if (Math.abs(ball.vz) > 0.9) {
      // Impact with turf!
      // Restitution decreases with higher impact speeds due to rubber hysteresis and turf softness
      let restitution = Math.max(0.48, turfMods.bounceRestitution - Math.abs(ball.vz) * 0.018);
      // Phase 6: ⚡ Radar Telemetry Switch: lands like a feather directly in running teammate's path with zero bounce deviation
      if (ball.isRadarTelemetry) {
        restitution = 0.25;
      }
      ball.vz = -ball.vz * restitution;

      // Turf grip: transfer spin into bounce deflection (zero deviation for Radar Telemetry)
      if (!ball.isRadarTelemetry && Math.abs(ball.spin) > 0.2) {
        // Spin kicks the ball sideways upon hitting grass
        ball.vx += ball.spin * BALL_AERO.TURF_SPIN_GRIP;
        ball.spin *= 0.45; // grass scrubs off majority of spin
      } else if (ball.isRadarTelemetry) {
        ball.spin = 0;
      }

      // Backspin check: backspin bites into turf, decelerating horizontal travel
      if (ball.isChipped || (ball.spinY && Math.abs(ball.spinY) > 0.4)) {
        ball.vx *= 0.62;
        ball.vy *= 0.62;
        ball.spinY = (ball.spinY || 0) * 0.25;
      }

      // Ground impact triggers momentary squash compression
      ball.squashTimer = 4;

      // Knuckleball skip
      if (ball.isKnuckle) {
        ball.vx *= 0.98;
        ball.vy *= 0.98;
      }

      // Grass divots & turf clippings kick up on impact
      const particleCount = Math.min(6, Math.floor(Math.abs(ball.vz) * 1.2 * turfMods.scuffRateMultiplier) + 1);
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: ball.x + (Math.random() - 0.5) * 6,
          y: ball.y + (Math.random() - 0.5) * 6,
          z: 0,
          vx: (Math.random() - 0.5) * 2.2 + ball.vx * 0.15,
          vy: (Math.random() - 0.5) * 2.2 + ball.vy * 0.15,
          vz: Math.random() * 2.6 + Math.abs(ball.vz) * 0.25,
          color: turfQuality === 'poor' ? '#5c4827' : Math.random() < 0.6 ? '#28581c' : '#3d782b',
          life: 0,
          maxLife: 14 + Math.floor(Math.random() * 8),
          size: 1.8 + Math.random() * 1.2,
        });
      }
    } else {
      // Ball is rolling on grass
      ball.vz = 0;
      ball.isAirborne = false;
      ball.squashTimer = 0;

      // Rolling friction modulated by turf cut and weather surface wetness/snow
      const groundFriction = Math.pow(turfMods.friction * weatherMods.rollFrictionMultiplier, timeScale);
      ball.vx *= groundFriction;
      ball.vy *= groundFriction;

      // Poor turf micro-hops
      applyPoorTurfMicroHops(ball, turfQuality);

      // Standing water puddle check (torrential rain)
      if (puddles.length > 0) {
        processBallPuddlePhysics(ball, puddles, turfQuality, timeScale);
      }

      // Angular roll decay
      if (ball.spin) ball.spin = ball.spin * Math.pow(0.85, timeScale);
      if (ball.spinY) ball.spinY = ball.spinY * Math.pow(0.85, timeScale);

      if (horizSpeed < 0.06) {
        ball.vx = 0;
        ball.vy = 0;
      }
    }
  }

  // 4. Ball Visual Deformation (Oval Squash & Stretch)
  // When flying or shot at high velocity, ball bends/elongates along velocity vector
  const currentSpeed = Math.hypot(ball.vx, ball.vy, ball.vz);
  if (currentSpeed > BALL_AERO.MIN_SPEED_DEFORM) {
    const targetDeform = Math.min(
      BALL_AERO.MAX_DEFORMATION,
      (currentSpeed - BALL_AERO.MIN_SPEED_DEFORM) / 7.5
    );
    ball.deformation = (ball.deformation || 0) * 0.7 + targetDeform * 0.3;
    // Angle in screen space (x vs y - z)
    ball.deformationAngle = Math.atan2(ball.vy - ball.vz * 0.6, ball.vx);
  } else if (ball.squashTimer && ball.squashTimer > 0) {
    ball.squashTimer = Math.max(0, ball.squashTimer - timeScale);
    ball.deformation = -0.45; // Negative deformation = squash flattened on ground
    ball.deformationAngle = 0;
  } else {
    // Return smoothly to spherical geometry
    ball.deformation = (ball.deformation || 0) * 0.75;
    if (Math.abs(ball.deformation) < 0.02) ball.deformation = 0;
  }

  // 5. Visual Ball Rotation Angle
  const rollRate = (currentSpeed * 0.12 + (ball.spin || 0) * 0.08) * timeScale;
  ball.rotationAngle = ((ball.rotationAngle || 0) + rollRate) % (Math.PI * 2);

  // 6. Motion / Curl Trail for Bending Shots & Crosses & Knuckleballs & ⚡ Stat Breaks
  if (
    currentSpeed > 4.2 ||
    Math.abs(ball.spin || 0) > 1.6 ||
    ball.isSpecialCurve ||
    ball.isKnuckle ||
    ball.isStatBreak ||
    ball.isThunderbolt ||
    ball.isLaserPing
  ) {
    let trailColor = '#ffffff';
    if (ball.isThunderbolt) {
      trailColor = Math.random() > 0.4 ? '#38bdf8' : '#ffffff';
    } else if (ball.isDeadlyAssassin || ball.isStatBreak) {
      trailColor = Math.random() > 0.4 ? '#facc15' : '#eab308';
    } else if (ball.isKnuckle) {
      trailColor = ball.isOverpowered ? '#7f1d1d' : (Math.random() > 0.4 ? '#f472b6' : '#db2777');
    } else if (ball.isSpecialCurve) {
      trailColor = Math.random() > 0.4 ? '#c084fc' : '#a855f7';
    }

    const isExtraTrail = ball.isSpecialCurve || ball.isKnuckle || ball.isStatBreak || ball.isThunderbolt;
    ball.trail.unshift({
      x: ball.x,
      y: ball.y - ball.z,
      z: ball.z,
      alpha: isExtraTrail ? 0.88 : 0.65,
      size: Math.max(2.5, (ball.isThunderbolt ? 6.8 : isExtraTrail ? 6.2 : 5.0) - (ball.z / 200)),
      color: trailColor,
    });
  }

  // Fade and prune trail points
  const isExtended = ball.isSpecialCurve || ball.isKnuckle || ball.isStatBreak || ball.isThunderbolt;
  const maxTrailPoints = isExtended ? 18 : 10;
  for (let i = ball.trail.length - 1; i >= 0; i--) {
    ball.trail[i].alpha -= isExtended ? 0.05 : 0.09;
    if (ball.trail[i].alpha <= 0 || ball.trail.length > maxTrailPoints) {
      ball.trail.splice(i, 1);
    }
  }

  // 7. Goal Checking & Realistic 3D Net Catch Physics
  const goalLeft = PITCH_CONFIG.CENTER_X - PITCH_CONFIG.GOAL_WIDTH / 2;
  const goalRight = PITCH_CONFIG.CENTER_X + PITCH_CONFIG.GOAL_WIDTH / 2;
  const topGoalY = PITCH_CONFIG.PITCH_TOP;
  const bottomGoalY = PITCH_CONFIG.PITCH_BOTTOM;

  // Crossbar rebounds (metallic hit with loud ping/clang)
  checkCrossbarBounce(ball, topGoalY, goalLeft, goalRight, true);
  checkCrossbarBounce(ball, bottomGoalY, goalLeft, goalRight, false);

  // Goal post collisions
  checkPostBounce(ball, goalLeft, topGoalY);
  checkPostBounce(ball, goalRight, topGoalY);
  checkPostBounce(ball, goalLeft, bottomGoalY);
  checkPostBounce(ball, goalRight, bottomGoalY);

  // Check top goal (Rival goal, attacked by Home)
  const frameMetrics = getGoalFrameMetrics(goalFrame);
  const inTopGoalMouth =
    ball.y <= topGoalY &&
    ball.y >= topGoalY - frameMetrics.depth - 15 &&
    ball.x >= goalLeft + 2 &&
    ball.x <= goalRight - 2 &&
    ball.z <= frameMetrics.crossbarHeight + 3;

  if (inTopGoalMouth) {
    if (topGoalNet) {
      processGoalNetCollision(ball, topGoalNet, true, topGoalY, netTension, goalFrame, timeScale);
    }
    // Trigger goal scored event (top goal attacked by Home in 1st half, Away in 2nd half)
    const teamScored = homeAttacksUp ? 'home' : 'away';
    onGoalScored({ teamScored, x: ball.x, y: ball.y });
    return particles;
  }

  // Check bottom goal (bottom goal attacked by Away in 1st half, Home in 2nd half)
  const inBottomGoalMouth =
    ball.y >= bottomGoalY &&
    ball.y <= bottomGoalY + frameMetrics.depth + 15 &&
    ball.x >= goalLeft + 2 &&
    ball.x <= goalRight - 2 &&
    ball.z <= frameMetrics.crossbarHeight + 3;

  if (inBottomGoalMouth) {
    if (bottomGoalNet) {
      processGoalNetCollision(ball, bottomGoalNet, false, bottomGoalY, netTension, goalFrame, timeScale);
    }
    const teamScored = homeAttacksUp ? 'away' : 'home';
    onGoalScored({ teamScored, x: ball.x, y: ball.y });
    return particles;
  }

  // Update ongoing elastic ripple oscillations
  if (topGoalNet) updateGoalNetOscillation(topGoalNet, netTension, timeScale);
  if (bottomGoalNet) updateGoalNetOscillation(bottomGoalNet, netTension, timeScale);

  // Outer stadium perimeter containment (stadium grandstands)
  // Allows ball to freely cross lines so out-of-bounds referee logic triggers cleanly
  const maxPitchLeft = PITCH_CONFIG.PITCH_LEFT - 320;
  const maxPitchRight = PITCH_CONFIG.PITCH_RIGHT + 320;
  const maxPitchTop = PITCH_CONFIG.PITCH_TOP - 360;
  const maxPitchBottom = PITCH_CONFIG.PITCH_BOTTOM + 360;

  if (ball.x < maxPitchLeft) {
    ball.x = maxPitchLeft;
    ball.vx = -ball.vx * 0.2;
  } else if (ball.x > maxPitchRight) {
    ball.x = maxPitchRight;
    ball.vx = -ball.vx * 0.2;
  }

  if (ball.y < maxPitchTop) {
    ball.y = maxPitchTop;
    ball.vy = -ball.vy * 0.2;
  } else if (ball.y > maxPitchBottom) {
    ball.y = maxPitchBottom;
    ball.vy = -ball.vy * 0.2;
  }

  return particles;
}

/**
 * Checks bounce against horizontal crossbar (metallic clang and rebound)
 */
function checkCrossbarBounce(
  ball: Ball,
  goalY: number,
  goalLeft: number,
  goalRight: number,
  isTopGoal: boolean
): boolean {
  if (ball.x >= goalLeft - 4 && ball.x <= goalRight + 4) {
    const distY = Math.abs(ball.y - goalY);
    const distZ = Math.abs(ball.z - PITCH_CONFIG.GOAL_CROSSBAR_HEIGHT);
    if (distY <= 7 && distZ <= 6) {
      audio.playPostHit();
      audio.playNearMissGasp();
      if (isTopGoal && ball.vy < 0) {
        ball.vy = Math.abs(ball.vy) * 0.55;
      } else if (!isTopGoal && ball.vy > 0) {
        ball.vy = -Math.abs(ball.vy) * 0.55;
      }
      ball.vz = -Math.abs(ball.vz) * 0.65 - 1.2;
      ball.spin = -ball.spin * 0.7;
      ball.isDividedBall = true;
      ball.isSecondBall = true;
      ball.isRebound = true;
      return true;
    }
  }
  return false;
}

/**
 * Checks bounce against cylindrical vertical goal posts
 */
function checkPostBounce(ball: Ball, postX: number, postY: number): boolean {
  const dist = Math.hypot(ball.x - postX, ball.y - postY);
  if (dist < 10 && ball.z <= PITCH_CONFIG.GOAL_CROSSBAR_HEIGHT + 2) {
    audio.playPostHit();
    audio.playNearMissGasp();
    const angle = Math.atan2(ball.y - postY, ball.x - postX);
    const speed = Math.hypot(ball.vx, ball.vy);
    ball.vx = Math.cos(angle) * Math.max(speed * 0.85, 4.2);
    ball.vy = Math.sin(angle) * Math.max(speed * 0.85, 4.2);
    ball.spin = -ball.spin * 0.6;
    ball.isDividedBall = true;
    ball.isSecondBall = true;
    ball.isRebound = true;
    return true;
  }
  return false;
}
