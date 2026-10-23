/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PITCH_CONFIG, HOME_KIT, AWAY_KIT } from './constants';
import { TimeOfDay, TeamKit, GraphicsSettings } from '../types';
import {
  StadiumDefinition,
  StadiumShape,
  StandGrade,
  SurroundingsType,
  ApronMaterial,
  StandPosition,
  StandConfig,
  DugoutConfig,
  EntranceTunnelConfig,
} from '../types/stadium';
import { drawAerialEnvironment } from './environmentRenderer';

/**
 * PHASE 15.2: 32-BIT HIGH-ALTITUDE AERIAL SKY-CAM RENDERER
 * PHASE 15.3: SEAMLESS PRE-MATCH SKY-CAM TO PITCH-CAM ZOOM SWOOP
 *
 * Renders the high-altitude bird's-eye perspective of the entire stadium:
 * 1. Surrounding landscape environment (Nature, City, Beach, Airport, etc.)
 * 2. Stadium outer facade cladding and architectural footprint (Round, Oval, Square, Rectangular)
 * 3. Outer stand grades (Municipal, Classic Red-Brick, Industrial Steel, Modern Concrete, Futuristic Aero)
 * 4. Stadium roof geometry with cantilever canopies / tensile cable aperture
 * 5. Athletics running track (when hasTrack is enabled)
 * 6. Central playing field visible through the roof opening with mowing patterns & line markings
 * 7. Pre-match squad lineups & referee at center circle
 * 8. Corner floodlight pylons & night illumination halos
 * 9. Retro 32-bit broadcast graphics banner overlay
 */

export interface PreMatchSwoopState {
  isActive: boolean;
  progress: number; // 0.0 (aerial sky-cam) to 1.0 (pitch-cam)
  startTime: number;
  durationMs: number;
  isSkipped: boolean;
  stadium: StadiumDefinition;
  homeTeamName: string;
  awayTeamName: string;
}

/**
 * Creates an initial pre-match swoop state
 */
export function createPreMatchSwoop(
  stadium: StadiumDefinition,
  homeTeamName: string = 'HOME TEAM',
  awayTeamName: string = 'AWAY TEAM',
  durationMs: number = 3000
): PreMatchSwoopState {
  return {
    isActive: true,
    progress: 0.0,
    startTime: performance.now(),
    durationMs,
    isSkipped: false,
    stadium,
    homeTeamName,
    awayTeamName,
  };
}

/**
 * Updates pre-match swoop progress (smooth cubic ease-in-out)
 */
export function updatePreMatchSwoop(
  state: PreMatchSwoopState,
  now: number = performance.now()
): { progress: number; isComplete: boolean; camera: { x: number; y: number; zoom: number; pitchTilt: number; roofOpacity: number } } {
  if (!state.isActive) {
    return {
      progress: 1.0,
      isComplete: true,
      camera: {
        x: PITCH_CONFIG.CENTER_X,
        y: PITCH_CONFIG.CENTER_Y,
        zoom: 1.05,
        pitchTilt: 0.5,
        roofOpacity: 0.0,
      },
    };
  }

  if (state.isSkipped) {
    state.progress = 1.0;
    state.isActive = false;
    return {
      progress: 1.0,
      isComplete: true,
      camera: {
        x: PITCH_CONFIG.CENTER_X,
        y: PITCH_CONFIG.CENTER_Y,
        zoom: 1.05,
        pitchTilt: 0.5,
        roofOpacity: 0.0,
      },
    };
  }

  const elapsed = now - state.startTime;
  const rawT = Math.min(1.0, Math.max(0.0, elapsed / state.durationMs));

  // Cinema-grade cubic-bezier / smoothstep ease
  // Slower start to take in the aerial horizon, accelerating through roofline, landing gently on kickoff
  const t = rawT < 0.5 ? 4 * rawT * rawT * rawT : 1 - Math.pow(-2 * rawT + 2, 3) / 2;
  state.progress = t;

  const isComplete = rawT >= 0.999;
  if (isComplete) {
    state.progress = 1.0;
    state.isActive = false;
  }

  // Camera coordinates interpolate from high-altitude Sky-Cam down to Pitch-Cam
  const startZoom = 0.25;
  const targetZoom = 1.05;
  const currentZoom = startZoom + (targetZoom - startZoom) * t;

  const startTilt = 0.32;
  const targetTilt = 0.50;
  const currentTilt = startTilt + (targetTilt - startTilt) * t;

  // Camera focus glides from slightly above the stadium down to exact center circle
  const startY = PITCH_CONFIG.CENTER_Y - 140;
  const targetY = PITCH_CONFIG.CENTER_Y;
  const currentY = startY + (targetY - startY) * t;

  // Roof / outer facade dissolves away as the camera penetrates through the roofline (between t 0.35 and 0.80)
  let roofOpacity = 1.0;
  if (t > 0.35) {
    roofOpacity = Math.max(0.0, 1.0 - (t - 0.35) / 0.45);
  }

  return {
    progress: t,
    isComplete,
    camera: {
      x: PITCH_CONFIG.CENTER_X,
      y: currentY,
      zoom: currentZoom,
      pitchTilt: currentTilt,
      roofOpacity,
    },
  };
}

/**
 * 15.2 Master 32-Bit High-Altitude Aerial Sky-Cam Renderer
 */
export function drawAerialSkyCam(
  ctx: CanvasRenderingContext2D,
  stadium: StadiumDefinition,
  options: {
    roofOpacity?: number; // 0.0 to 1.0 (for swoop fade)
    showBroadcastHUD?: boolean;
    homeKit?: TeamKit;
    awayKit?: TeamKit;
    timeOfDay?: TimeOfDay;
    cameraX?: number;
    cameraY?: number;
    homeTeamName?: string;
    awayTeamName?: string;
  } = {}
) {
  const {
    roofOpacity = 1.0,
    showBroadcastHUD = true,
    homeKit = HOME_KIT,
    awayKit = AWAY_KIT,
    timeOfDay = stadium.lighting?.timeOfDay || 'night',
    homeTeamName = 'HOME',
    awayTeamName = 'AWAY',
  } = options;

  const cx = PITCH_CONFIG.CENTER_X;
  const cy = PITCH_CONFIG.CENTER_Y;
  const shape = stadium.shape || 'rectangular';
  const surroundings = stadium.surroundings || 'big_city';
  const isNight = timeOfDay === 'night' || timeOfDay === 'sunset' || timeOfDay === 'dawn';

  // Overall Stadium Footprint Dimensions (Calibrated so pitch + apron + track fit inside with zero protrusion)
  const isBowl = shape === 'round' || shape === 'oval' || shape === 'circular';
  const outerWidth = shape === 'round' || shape === 'circular' ? 2700 : shape === 'oval' ? 2900 : shape === 'square' ? 2650 : 2850;
  const outerHeight = shape === 'round' || shape === 'circular' ? 2700 : shape === 'oval' ? 2300 : shape === 'square' ? 2650 : 2350;

  // 1. Surrounding Landscape Environment (spans 5000px in all directions)
  const envBounds = {
    left: cx - 2800,
    top: cy - 2600,
    width: 5600,
    height: 5200,
    stadiumBounds: {
      centerX: cx,
      centerY: cy,
      outerWidth,
      outerHeight,
    },
  };

  drawAerialEnvironment(ctx, surroundings, timeOfDay, envBounds);

  // 2. Concrete Stadium Concourse / Apron Plaza with Dynamic Time-of-Day Architectural Drop Shadows
  drawStadiumPlaza(ctx, cx, cy, outerWidth + 140, outerHeight + 140, isBowl, timeOfDay);

  // 3. Perimeter Run-off Apron Material (between pitch and stands/track)
  drawAerialApron(ctx, cx, cy, stadium.apronMaterial || 'grass', isBowl);

  // 4. Central Playing Turf & Markings (Visible through inner opening)
  drawAerialPitchTurf(ctx, cx, cy, stadium);

  // 5. Athletics Running Track (Exclusive to Round & Oval stadiums with hasTrack enabled)
  if (stadium.hasTrack && (shape === 'round' || shape === 'oval' || shape === 'circular')) {
    drawAerialAthleticsTrack(ctx, cx, cy, shape);
  }

  // 6. Pre-Match 22 Squad Lineup & Referee at Center Circle
  drawAerialSquadLineup(ctx, cx, cy, homeKit, awayKit);

  // 7. Macro-Scale Dugout Benches & Player Entrance Tunnel on Touchline Apron (Phase 15.8.1 Contract)
  drawAerialDugouts(ctx, stadium.dugouts, cx, cy, isBowl);
  drawAerialEntranceTunnel(ctx, stadium.tunnel, cx, cy, isBowl);

  // 8. Stadium Outer Facade Cladding & Roof Geometry (with dynamic opacity fade during swoop)
  if (roofOpacity > 0.01) {
    ctx.save();
    ctx.globalAlpha = roofOpacity;

    drawStadiumOuterFacade(ctx, cx, cy, outerWidth, outerHeight, shape, stadium, timeOfDay);
    drawStadiumRoofStructure(ctx, cx, cy, outerWidth, outerHeight, shape, stadium, timeOfDay);

    ctx.restore();
  }

  // 9. Volumetric Light Cones & Corner Floodlight Pylons (Phase 15.8.1)
  drawAerialFloodlights(ctx, cx, cy, outerWidth, outerHeight, isNight, timeOfDay);

  // 10. Atmospheric Sunset Golden-Hour / Night Lighting Wash over Stadium Bowl (Phase 15.8.3)
  if (timeOfDay === 'sunset') {
    ctx.save();
    const sunsetWash = ctx.createRadialGradient(cx, cy, 200, cx, cy, outerWidth * 0.55);
    sunsetWash.addColorStop(0, 'rgba(251, 146, 60, 0.18)');
    sunsetWash.addColorStop(0.7, 'rgba(234, 88, 12, 0.22)');
    sunsetWash.addColorStop(1, 'rgba(124, 45, 18, 0.28)');
    ctx.fillStyle = sunsetWash;
    if (isBowl) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, (outerWidth + 140) / 2, (outerHeight + 140) / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(cx - (outerWidth + 140) / 2, cy - (outerHeight + 140) / 2, outerWidth + 140, outerHeight + 140);
    }
    ctx.restore();
  }

  // 11. 32-Bit Broadcast Presentation Overlay (Retro Drawstar TV Graphics)
  if (showBroadcastHUD && roofOpacity > 0.15) {
    drawBroadcastPresentationOverlay(ctx, stadium, homeTeamName, awayTeamName, roofOpacity);
  }
}

/**
 * Concrete perimeter concourse and turnstile plazas encircling the venue with Dynamic Drop Shadows
 */
function drawStadiumPlaza(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  isBowl: boolean,
  timeOfDay: TimeOfDay = 'night'
) {
  const isNight = timeOfDay === 'night';
  const isSunset = timeOfDay === 'sunset' || timeOfDay === 'dawn';

  ctx.save();

  // Phase 15.8.3 Dynamic Architectural Drop Shadow cast onto terrain:
  // - Noon: Short, sharp perpendicular drop shadow (sun at zenith)
  // - Sunset: Dramatic long diagonal shadow stretching eastward (low-angle sun in west)
  // - Night: Deep nocturnal shadow beneath illuminated coliseum beacon
  const shadowOffsetX = isSunset ? 110 : isNight ? 8 : 4;
  const shadowOffsetY = isSunset ? 85 : isNight ? 14 : 8;
  const shadowAlpha = isSunset ? 'rgba(0, 0, 0, 0.55)' : isNight ? 'rgba(0, 0, 0, 0.60)' : 'rgba(0, 0, 0, 0.35)';

  ctx.fillStyle = shadowAlpha;
  if (isBowl) {
    ctx.beginPath();
    ctx.ellipse(cx + shadowOffsetX, cy + shadowOffsetY, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillRect(cx - w / 2 + shadowOffsetX, cy - h / 2 + shadowOffsetY, w, h);
  }

  // Concrete concourse pavement
  ctx.fillStyle = isNight ? '#1e293b' : isSunset ? '#64748b' : '#94a3b8';
  if (isBowl) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
  }

  // Radial pavement expansion joints
  ctx.strokeStyle = isNight ? '#0f172a' : isSunset ? '#475569' : '#64748b';
  ctx.lineWidth = 1.5;
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * (w * 0.42), cy + Math.sin(angle) * (h * 0.42));
    ctx.lineTo(cx + Math.cos(angle) * (w * 0.50), cy + Math.sin(angle) * (h * 0.50));
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Central playing field seen from high altitude through the roof aperture
 */
function drawAerialPitchTurf(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  stadium: StadiumDefinition
) {
  const left = PITCH_CONFIG.PITCH_LEFT;
  const top = PITCH_CONFIG.PITCH_TOP;
  const fWidth = PITCH_CONFIG.FIELD_WIDTH;
  const fHeight = PITCH_CONFIG.FIELD_HEIGHT;

  // Base grass
  const turfQuality = stadium.turfQuality || 'normal';
  ctx.fillStyle = turfQuality === 'pristine' ? '#1eb842' : turfQuality === 'poor' ? '#5f6f25' : '#2d7a18';
  ctx.fillRect(left - 50, top - 50, fWidth + 100, fHeight + 100);

  // Mowing stripes (horizontal alternating tones)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  const stripeH = 80;
  for (let y = top; y < top + fHeight; y += stripeH * 2) {
    ctx.fillRect(left, y, fWidth, stripeH);
  }

  // Official Pitch White Lines
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3.5;

  // Touchlines & Endlines
  ctx.strokeRect(left, top, fWidth, fHeight);

  // Halfway Line
  ctx.beginPath();
  ctx.moveTo(left, cy);
  ctx.lineTo(left + fWidth, cy);
  ctx.stroke();

  // Center Circle (radius 68 px) & Center Spot
  ctx.beginPath();
  ctx.arc(cx, cy, 68, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();

  // Top & Bottom Penalty Boxes
  const boxW = 280;
  const boxH = 120;
  ctx.strokeRect(cx - boxW / 2, top, boxW, boxH);
  ctx.strokeRect(cx - boxW / 2, top + fHeight - boxH, boxW, boxH);

  // Goal Boxes
  const goalBoxW = 140;
  const goalBoxH = 45;
  ctx.strokeRect(cx - goalBoxW / 2, top, goalBoxW, goalBoxH);
  ctx.strokeRect(cx - goalBoxW / 2, top + fHeight - goalBoxH, goalBoxW, goalBoxH);

  // Penalty Spots & D-Arcs
  ctx.beginPath();
  ctx.arc(cx, top + 80, 3, 0, Math.PI * 2);
  ctx.arc(cx, top + fHeight - 80, 3, 0, Math.PI * 2);
  ctx.fill();

  // 4 Corner Arcs
  const cornerR = 14;
  ctx.beginPath();
  ctx.arc(left, top, cornerR, 0, Math.PI / 2);
  ctx.arc(left + fWidth, top, cornerR, Math.PI / 2, Math.PI);
  ctx.arc(left + fWidth, top + fHeight, cornerR, Math.PI, (Math.PI * 3) / 2);
  ctx.arc(left, top + fHeight, cornerR, (Math.PI * 3) / 2, Math.PI * 2);
  ctx.stroke();

  // Goals (White posts and crossbar)
  const goalW = 86;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cx - goalW / 2, top - 14, goalW, 4);
  ctx.fillRect(cx - goalW / 2, top + fHeight + 10, goalW, 4);
}

/**
 * Perimeter Run-off Apron Material (Phase 15.5: between pitch line and grandstands/track)
 * 6 Materials: grass, concrete, rubber_tartan, artificial_turf, gravel_ballast, asphalt_paved
 */
function drawAerialApron(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  material: ApronMaterial = 'grass',
  isBowl: boolean
) {
  const apronW = 1620;
  const apronH = 1140;

  ctx.save();

  switch (material) {
    case 'concrete':
      ctx.fillStyle = '#94a3b8';
      break;
    case 'rubber_tartan':
      ctx.fillStyle = '#991b1b';
      break;
    case 'artificial_turf':
      ctx.fillStyle = '#15803d';
      break;
    case 'gravel_ballast':
      ctx.fillStyle = '#44403c';
      break;
    case 'asphalt_paved':
      ctx.fillStyle = '#1e293b';
      break;
    case 'grass':
    default:
      ctx.fillStyle = '#2d7a18';
      break;
  }

  if (isBowl) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, apronW / 2, apronH / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillRect(cx - apronW / 2, cy - apronH / 2, apronW, apronH);
  }

  // Texture details on apron
  if (material === 'concrete') {
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.2;
    for (let x = cx - apronW / 2 + 60; x < cx + apronW / 2; x += 140) {
      ctx.beginPath();
      ctx.moveTo(x, cy - apronH / 2);
      ctx.lineTo(x, cy + apronH / 2);
      ctx.stroke();
    }
  } else if (material === 'gravel_ballast') {
    ctx.fillStyle = '#292524';
    for (let i = 0; i < 60; i++) {
      const gx = cx - apronW / 2 + (i * 47) % apronW;
      const gy = cy - apronH / 2 + (i * 31) % apronH;
      ctx.fillRect(gx, gy, 8, 4);
    }
  }

  ctx.restore();
}

/**
 * 8-Lane Terracotta Athletics Running Track (Encircles the pitch and apron for Round & Oval)
 */
function drawAerialAthleticsTrack(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  shape: StadiumShape
) {
  const isCircle = shape === 'round' || shape === 'circular';
  const trackRadiusX = isCircle ? 850 : 880;
  const trackRadiusY = isCircle ? 850 : 640;
  const trackWidth = 85;

  ctx.save();

  // Red-terracotta synthetic track surface
  ctx.fillStyle = '#b91c1c';
  ctx.beginPath();
  ctx.ellipse(cx, cy, trackRadiusX, trackRadiusY, 0, 0, Math.PI * 2);
  ctx.ellipse(cx, cy, trackRadiusX - trackWidth, trackRadiusY - trackWidth, 0, 0, Math.PI * 2, true);
  ctx.fill();

  // White lane divider lines (8 lanes)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = 1.2;
  for (let lane = 1; lane < 8; lane++) {
    const rX = trackRadiusX - (trackWidth * lane) / 8;
    const rY = trackRadiusY - (trackWidth * lane) / 8;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rX, rY, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Finish line & lane start ticks
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cx - trackRadiusX + trackWidth / 2 - 3, cy - 8, 6, 16);

  ctx.restore();
}

/**
 * 22 Players and Referee lined up around center circle for pre-match ceremony
 */
function drawAerialSquadLineup(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  homeKit: TeamKit,
  awayKit: TeamKit
) {
  ctx.save();

  // Home Squad (11 dots lined up horizontally above halfway line)
  const startX = cx - 180;
  for (let i = 0; i < 11; i++) {
    const px = startX + i * 36;
    const py = cy - 24;

    // Drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.arc(px + 1, py + 2, 4, 0, Math.PI * 2);
    ctx.fill();

    // Player jersey dot
    ctx.fillStyle = i === 0 ? '#facc15' : homeKit.primaryColor; // GK is yellow
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Away Squad (11 dots lined up horizontally below halfway line)
  for (let i = 0; i < 11; i++) {
    const px = startX + i * 36;
    const py = cy + 24;

    // Drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.arc(px + 1, py + 2, 4, 0, Math.PI * 2);
    ctx.fill();

    // Player jersey dot
    ctx.fillStyle = i === 0 ? '#10b981' : awayKit.primaryColor; // GK is green
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Referee + 2 Assistant Referees at Center Spot
  ctx.fillStyle = '#0f172a'; // Black kit
  ctx.beginPath();
  ctx.arc(cx - 10, cy, 3.5, 0, Math.PI * 2); // Referee
  ctx.arc(cx + 10, cy, 3.5, 0, Math.PI * 2); // Ball
  ctx.fill();

  ctx.restore();
}

/**
 * Outer facade cladding reflecting the stand architectural grade and individual stand configurations
 */
/**
 * Outer facade cladding reflecting the stand architectural grade and individual stand configurations
 */
function drawStadiumOuterFacade(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  shape: StadiumShape,
  stadium: StadiumDefinition,
  timeOfDay: TimeOfDay = 'night'
) {
  const isNight = timeOfDay === 'night';
  const isSunset = timeOfDay === 'sunset' || timeOfDay === 'dawn';
  const isBowl = shape === 'round' || shape === 'oval' || shape === 'circular';
  const grade: StandGrade = stadium.stands?.west?.grade || 'grade4_modern';
  const stands = stadium.stands || ({} as Record<StandPosition, StandConfig>);

  ctx.save();

  // Resolve Facade Material Color based on Architectural Grade
  let facadeColor = '#cbd5e1';
  let structuralRibColor = '#94a3b8';

  if (grade === 'grade1_municipal' || grade === 'grade1_historic_timber') {
    facadeColor = isNight ? '#292524' : isSunset ? '#57534e' : '#78716c';
    structuralRibColor = '#44403c';
  } else if (grade === 'grade2_classic') {
    facadeColor = isNight ? '#450a0a' : isSunset ? '#7f1d1d' : '#991b1b';
    structuralRibColor = '#1e293b';
  } else if (grade === 'grade3_industrial' || grade === 'grade3_steel_cantilever') {
    facadeColor = isNight ? '#1e293b' : isSunset ? '#334155' : '#475569';
    structuralRibColor = '#0f172a';
  } else if (grade === 'grade4_modern') {
    facadeColor = isNight ? '#334155' : isSunset ? '#94a3b8' : '#e2e8f0';
    structuralRibColor = '#64748b';
  } else if (grade === 'grade5_futuristic') {
    facadeColor = isNight ? '#0f172a' : isSunset ? '#cbd5e1' : '#f8fafc';
    structuralRibColor = '#38bdf8';
  }

  // Outer Facade Ring (Stands Structure Boundary)
  const apertureRadiusX = isBowl ? 960 : 930;
  const apertureRadiusY = isBowl ? 740 : 660;

  // Render individual stand quadrants / wings based on stand configuration
  const hasWest = stands.west && stands.west.type !== 'none' && stands.west.type !== 'no_stand';
  const hasEast = stands.east && stands.east.type !== 'none' && stands.east.type !== 'no_stand';
  const hasNorth = stands.north && stands.north.type !== 'none' && stands.north.type !== 'no_stand';
  const hasSouth = stands.south && stands.south.type !== 'none' && stands.south.type !== 'no_stand';

  if (isBowl) {
    // Continuous Coliseum Bowl
    ctx.fillStyle = facadeColor;
    ctx.beginPath();
    ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.ellipse(cx, cy, apertureRadiusX + 40, apertureRadiusY + 40, 0, 0, Math.PI * 2, true);
    ctx.fill();

    // Structural Buttresses & Outer Radial Ribs
    ctx.strokeStyle = structuralRibColor;
    ctx.lineWidth = 3;
    const numRibs = 32;
    for (let i = 0; i < numRibs; i++) {
      const angle = (i * Math.PI * 2) / numRibs;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * (apertureRadiusX + 50), cy + Math.sin(angle) * (apertureRadiusY + 50));
      ctx.lineTo(cx + Math.cos(angle) * (w * 0.50), cy + Math.sin(angle) * (h * 0.50));
      ctx.stroke();
    }
  } else {
    // Rectilinear / Square Stadium: Render each stand wing independently
    // 1. WEST STAND FACADE
    if (hasWest) {
      ctx.fillStyle = facadeColor;
      ctx.fillRect(cx - w / 2, cy - h / 2, w / 2 - (apertureRadiusX + 40), h);
      // Vertical Ribs & Grade Accents
      ctx.strokeStyle = structuralRibColor;
      ctx.lineWidth = 2.5;
      for (let ry = cy - h / 2 + 50; ry <= cy + h / 2 - 50; ry += 60) {
        ctx.beginPath();
        ctx.moveTo(cx - w / 2, ry);
        ctx.lineTo(cx - (apertureRadiusX + 40), ry);
        ctx.stroke();
      }
    } else {
      // Open West concourse with perimeter wall/fence
      ctx.fillStyle = isNight ? '#0b1120' : '#475569';
      ctx.fillRect(cx - w / 2, cy - h / 2, w / 2 - (apertureRadiusX + 40), h);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - (apertureRadiusX + 50), cy - h / 2, 4, h);
    }

    // 2. EAST STAND FACADE
    if (hasEast) {
      ctx.fillStyle = facadeColor;
      ctx.fillRect(cx + apertureRadiusX + 40, cy - h / 2, w / 2 - (apertureRadiusX + 40), h);
      ctx.strokeStyle = structuralRibColor;
      ctx.lineWidth = 2.5;
      for (let ry = cy - h / 2 + 50; ry <= cy + h / 2 - 50; ry += 60) {
        ctx.beginPath();
        ctx.moveTo(cx + apertureRadiusX + 40, ry);
        ctx.lineTo(cx + w / 2, ry);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = isNight ? '#0b1120' : '#475569';
      ctx.fillRect(cx + apertureRadiusX + 40, cy - h / 2, w / 2 - (apertureRadiusX + 40), h);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx + apertureRadiusX + 46, cy - h / 2, 4, h);
    }

    // 3. NORTH STAND FACADE
    if (hasNorth) {
      ctx.fillStyle = facadeColor;
      ctx.fillRect(cx - apertureRadiusX - 40, cy - h / 2, (apertureRadiusX + 40) * 2, h / 2 - (apertureRadiusY + 40));
    }

    // 4. SOUTH STAND FACADE
    if (hasSouth) {
      ctx.fillStyle = facadeColor;
      ctx.fillRect(cx - apertureRadiusX - 40, cy + apertureRadiusY + 40, (apertureRadiusX + 40) * 2, h / 2 - (apertureRadiusY + 40));
    }
  }

  // Futuristic LED Ribbon Glow on Outer Facade
  if (grade === 'grade5_futuristic' && (isNight || isSunset)) {
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 14;
    if (isBowl) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, (w / 2) * 0.94, (h / 2) * 0.94, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.strokeRect(cx - (w * 0.94) / 2, cy - (h * 0.94) / 2, w * 0.94, h * 0.94);
    }
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

/**
 * Macro-Scale Dugout Benches on Touchline Concourse (Phase 15.8.1 Contract)
 * Renders manager and player dugout shelters faithfully according to DugoutConfig
 */
function drawAerialDugouts(
  ctx: CanvasRenderingContext2D,
  dugouts: DugoutConfig | undefined,
  cx: number,
  cy: number,
  isBowl: boolean
) {
  ctx.save();

  const pLeft = PITCH_CONFIG.PITCH_LEFT;
  const pCenterY = PITCH_CONFIG.CENTER_Y;
  const type = dugouts?.type || 'recaro_racing';
  const quality = dugouts?.quality || 'modern';
  const frameColor = dugouts?.frameColor || '#334155';
  const cushionColor = dugouts?.cushionColor || '#0284c7';
  const shelterTint = dugouts?.shelterTint || 'rgba(56, 189, 248, 0.45)';

  const dugoutW = 44;
  const dugoutH = 74;
  const setback = Math.max(70, dugouts?.setbackDistance || 95);
  const dugoutX = pLeft - setback;

  const homeDugoutY = pCenterY - 115;
  const awayDugoutY = pCenterY + 45;

  const benchSlots = [
    { y: homeDugoutY, teamCol: cushionColor || '#0284c7', label: 'HOME' },
    { y: awayDugoutY, teamCol: '#dc2626', label: 'AWAY' },
  ];

  for (const b of benchSlots) {
    if (type === 'recaro_racing' || type === 'racing_bucket') {
      // Luxury aerodynamic bucket seat shell
      ctx.fillStyle = frameColor;
      ctx.fillRect(dugoutX, b.y, dugoutW, dugoutH);

      // Ergonomic bucket seats (2 rows of 6 seats)
      for (let r = 0; r < 2; r++) {
        for (let s = 0; s < 6; s++) {
          const sx = dugoutX + 6 + r * 18;
          const sy = b.y + 8 + s * 10;
          ctx.fillStyle = b.teamCol;
          ctx.fillRect(sx, sy, 12, 7);
          ctx.fillStyle = '#0f172a'; // Contoured headrest
          ctx.fillRect(sx + 2, sy + 1, 8, 2);
        }
      }

      // Tinted glass aerodynamic weather canopy
      ctx.fillStyle = shelterTint;
      ctx.fillRect(dugoutX + 2, b.y + 2, dugoutW - 4, dugoutH - 4);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(dugoutX, b.y, dugoutW, dugoutH);
    } else if (type === 'covered_sunken') {
      // Sub-surface sunken trench with curved polycarbonate weather shield
      ctx.fillStyle = '#0f172a'; // Deep trench shadow
      ctx.fillRect(dugoutX - 4, b.y - 2, dugoutW + 8, dugoutH + 4);
      ctx.strokeStyle = '#64748b'; // Concrete trench retaining wall
      ctx.lineWidth = 2.5;
      ctx.strokeRect(dugoutX - 4, b.y - 2, dugoutW + 8, dugoutH + 4);

      // Benches inside trench
      ctx.fillStyle = b.teamCol;
      ctx.fillRect(dugoutX + 4, b.y + 6, dugoutW - 8, dugoutH - 12);

      // Curved transparent canopy
      ctx.fillStyle = 'rgba(203, 213, 225, 0.45)';
      ctx.fillRect(dugoutX, b.y, dugoutW, dugoutH);
    } else if (type === 'classic_timber') {
      // Grassroots timber bench with slatted wood planks
      ctx.fillStyle = '#451a03'; // Wooden frame
      ctx.fillRect(dugoutX, b.y, dugoutW, dugoutH);
      ctx.fillStyle = '#78350f'; // Slatted wood
      for (let sy = b.y + 6; sy < b.y + dugoutH - 6; sy += 8) {
        ctx.fillRect(dugoutX + 4, sy, dugoutW - 8, 5);
      }
      ctx.strokeStyle = '#1c1917'; // Iron brackets
      ctx.lineWidth = 2;
      ctx.strokeRect(dugoutX, b.y, dugoutW, dugoutH);
    } else if (type === 'utilitarian_concrete' || type === 'concrete_dugout') {
      // Solid concrete bunker shelter
      ctx.fillStyle = '#334155'; // Concrete bunker
      ctx.fillRect(dugoutX - 4, b.y - 2, dugoutW + 8, dugoutH + 4);
      ctx.fillStyle = '#0f172a'; // Interior recess
      ctx.fillRect(dugoutX, b.y + 4, dugoutW - 2, dugoutH - 8);
      ctx.fillStyle = b.teamCol;
      ctx.fillRect(dugoutX + 6, b.y + 10, dugoutW - 14, dugoutH - 20);
    } else {
      // Pitch-Level folding chairs
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'; // Drop shadow
      ctx.fillRect(dugoutX, b.y, dugoutW * 0.7, dugoutH);
      for (let s = 0; s < 7; s++) {
        const sy = b.y + 6 + s * 9;
        ctx.fillStyle = '#64748b'; // Metal frame
        ctx.fillRect(dugoutX + 2, sy, 22, 6);
        ctx.fillStyle = b.teamCol; // Cushion
        ctx.fillRect(dugoutX + 5, sy + 1, 16, 4);
      }
    }
  }

  ctx.restore();
}

/**
 * Macro-Scale Player Entrance Tunnel on Touchline / Concourse (Phase 15.8.1 Contract)
 * Renders pre-match player entrance portals faithfully according to EntranceTunnelConfig
 */
function drawAerialEntranceTunnel(
  ctx: CanvasRenderingContext2D,
  tunnel: EntranceTunnelConfig | undefined,
  cx: number,
  cy: number,
  isBowl: boolean
) {
  ctx.save();

  const pLeft = PITCH_CONFIG.PITCH_LEFT;
  const pTop = PITCH_CONFIG.PITCH_TOP;
  const fWidth = PITCH_CONFIG.FIELD_WIDTH;
  const fHeight = PITCH_CONFIG.FIELD_HEIGHT;
  const pCenterY = PITCH_CONFIG.CENTER_Y;

  const type = tunnel?.type || 'inflatable_accordion';
  const siting = tunnel?.siting || 'center_main';
  const primaryCol = tunnel?.primaryColor || '#b91c1c';
  const secondaryCol = tunnel?.secondaryColor || '#ffffff';

  // Determine Entrance Tunnel Coordinates based on siting
  let tunX = pLeft - 140;
  let tunY = pCenterY - 18;
  let tunW = 120;
  let tunH = 36;
  let isVertical = false;

  if (siting === 'corner') {
    // South-West pitch corner
    tunX = pLeft - 95;
    tunY = pTop + fHeight + 15;
    tunW = 85;
    tunH = 34;
  } else if (siting === 'behind_goal') {
    // Behind South goal line
    tunX = cx - 22;
    tunY = pTop + fHeight + 25;
    tunW = 44;
    tunH = 95;
    isVertical = true;
  }

  // Red Carpet Runner with gold embroidered trim
  ctx.fillStyle = '#991b1b';
  ctx.fillRect(tunX, tunY, tunW, tunH);
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 2;
  ctx.strokeRect(tunX, tunY, tunW, tunH);

  // Tunnel Body Architecture
  if (type === 'inflatable_accordion') {
    // South American style segmented bellows with alternating club stripes
    const numHoops = isVertical ? 8 : 10;
    const hoopStep = (isVertical ? tunH : tunW) / numHoops;
    for (let h = 0; h < numHoops; h++) {
      ctx.fillStyle = h % 2 === 0 ? primaryCol : secondaryCol;
      if (isVertical) {
        ctx.fillRect(tunX + 3, tunY + h * hoopStep, tunW - 6, hoopStep - 2);
      } else {
        ctx.fillRect(tunX + h * hoopStep, tunY + 3, hoopStep - 2, tunH - 6);
      }
    }
  } else if (type === 'modern_architectural') {
    // High-tech architectural tunnel with dark matte panels & glowing LED ribbons
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(tunX, tunY, tunW, tunH);
    // Illuminated cyan/gold LED ribbon edges
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 8;
    ctx.strokeRect(tunX + 2, tunY + 2, tunW - 4, tunH - 4);
    ctx.shadowBlur = 0;
  } else if (type === 'subterranean_staircase') {
    // Sunken concrete staircase descending into subterranean dressing rooms
    ctx.fillStyle = '#334155';
    ctx.fillRect(tunX, tunY, tunW, tunH);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    // Step lines
    const steps = 7;
    for (let st = 1; st < steps; st++) {
      ctx.beginPath();
      if (isVertical) {
        ctx.moveTo(tunX, tunY + (tunH * st) / steps);
        ctx.lineTo(tunX + tunW, tunY + (tunH * st) / steps);
      } else {
        ctx.moveTo(tunX + (tunW * st) / steps, tunY);
        ctx.lineTo(tunX + (tunW * st) / steps, tunY + tunH);
      }
      ctx.stroke();
    }
  } else if (type === 'direct_portal') {
    // Flush arched masonry portal with security grille
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(tunX, tunY, tunW, tunH);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.strokeRect(tunX, tunY, tunW, tunH);
  } else {
    // Telescopic canopy
    ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.fillRect(tunX, tunY, tunW, tunH);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.strokeRect(tunX, tunY, tunW, tunH);
  }

  ctx.restore();
}

/**
 * Stadium Roof Geometry: Cantilever canopies, translucent ETFE inner ring, inner aperture
 * Selectively covers only stands that have a roof configured (hasRoof !== false),
 * while exposing open-air stands with visible colored seating tiers!
 */
function drawStadiumRoofStructure(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  shape: StadiumShape,
  stadium: StadiumDefinition,
  timeOfDay: TimeOfDay = 'night'
) {
  const isNight = timeOfDay === 'night';
  const isSunset = timeOfDay === 'sunset' || timeOfDay === 'dawn';
  const isBowl = shape === 'round' || shape === 'oval' || shape === 'circular';
  const apertureRadiusX = isBowl ? 960 : 930;
  const apertureRadiusY = isBowl ? 740 : 660;
  const stands = stadium.stands || ({} as Record<StandPosition, StandConfig>);
  const grade: StandGrade = stadium.stands?.west?.grade || 'grade4_modern';

  ctx.save();

  // Roof Canopy Colors according to Architectural Grade & Time of Day
  let roofColor = isNight ? '#1e293b' : isSunset ? '#e2e8f0' : '#ffffff';
  let innerCanopyColor = isNight ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.65)'; // Translucent ETFE

  if (grade === 'grade1_municipal' || grade === 'grade1_historic_timber') {
    roofColor = isNight ? '#292524' : isSunset ? '#78350f' : '#94a3b8'; // Corrugated tin
  } else if (grade === 'grade2_classic') {
    roofColor = isNight ? '#1e293b' : isSunset ? '#7f1d1d' : '#f1f5f9'; // Leitch painted steel
  } else if (grade === 'grade3_industrial' || grade === 'grade3_steel_cantilever') {
    roofColor = isNight ? '#0f172a' : isSunset ? '#475569' : '#64748b'; // Galvanized steel
  } else if (grade === 'grade5_futuristic') {
    roofColor = isNight ? '#020617' : isSunset ? '#cbd5e1' : '#f8fafc'; // Aero-titanium
    innerCanopyColor = isNight ? 'rgba(56, 189, 248, 0.40)' : 'rgba(56, 189, 248, 0.25)';
  }

  const seatColor1 = stadium.seats?.colors?.[0] || '#2563eb';
  const seatColor2 = stadium.seats?.colors?.[1] || '#ffffff';
  const seatPattern = stadium.seats?.pattern || 'solid';

  // Stand Roof Status
  const westHasRoof = stands.west?.type !== 'none' && stands.west?.hasRoof !== false;
  const eastHasRoof = stands.east?.type !== 'none' && stands.east?.hasRoof !== false;
  const northHasRoof = stands.north?.type !== 'none' && stands.north?.hasRoof !== false;
  const southHasRoof = stands.south?.type !== 'none' && stands.south?.hasRoof !== false;

  if (isBowl) {
    // 🏟️ BOWL STADIUM: Full radial tension-ring roof
    ctx.fillStyle = roofColor;
    ctx.beginPath();
    ctx.ellipse(cx, cy, (w / 2) * 0.90, (h / 2) * 0.90, 0, 0, Math.PI * 2);
    ctx.ellipse(cx, cy, apertureRadiusX + 60, apertureRadiusY + 60, 0, 0, Math.PI * 2, true);
    ctx.fill();

    // Translucent Inner ETFE Canopy Lip
    ctx.fillStyle = innerCanopyColor;
    ctx.beginPath();
    ctx.ellipse(cx, cy, apertureRadiusX + 60, apertureRadiusY + 60, 0, 0, Math.PI * 2);
    ctx.ellipse(cx, cy, apertureRadiusX, apertureRadiusY, 0, 0, Math.PI * 2, true);
    ctx.fill();

    // Radial Tensile Cable Spokes
    ctx.strokeStyle = isNight ? '#475569' : isSunset ? '#78350f' : '#cbd5e1';
    ctx.lineWidth = 1.8;
    const numSpokes = 24;
    for (let s = 0; s < numSpokes; s++) {
      const angle = (s * Math.PI * 2) / numSpokes;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * apertureRadiusX, cy + Math.sin(angle) * apertureRadiusY);
      ctx.lineTo(cx + Math.cos(angle) * (w * 0.44), cy + Math.sin(angle) * (h * 0.44));
      ctx.stroke();
    }
  } else {
    // 🏟️ RECTILINEAR STADIUM: Render roofs per stand wing
    // If a stand has NO roof (hasRoof === false), render exposed colored seating tiers!

    // Helper for seat color calculation based on seat pattern
    const getSeatColor = (rowIdx: number, colIdx: number, defaultCol: string) => {
      if (seatPattern === 'solid') return defaultCol;
      if (seatPattern === 'horizontalBands' || seatPattern === 'lowerUpper') {
        return rowIdx % 2 === 0 ? seatColor1 : seatColor2;
      }
      if (seatPattern === 'verticalStripes') {
        return colIdx % 2 === 0 ? seatColor1 : seatColor2;
      }
      return defaultCol;
    };

    // 1. WEST ROOF OR EXPOSED TIERS
    const wRoofLeft = cx - (w * 0.90) / 2;
    const wRoofWidth = (w * 0.90) / 2 - apertureRadiusX;
    if (westHasRoof) {
      ctx.fillStyle = roofColor;
      ctx.fillRect(wRoofLeft, cy - (h * 0.90) / 2, wRoofWidth, h * 0.90);
      ctx.fillStyle = innerCanopyColor;
      ctx.fillRect(cx - apertureRadiusX - 40, cy - (h * 0.90) / 2, 40, h * 0.90);

      // Grade 2 Archibald Leitch Lattice Trusses / Grade 5 ETFE Cushions
      if (grade === 'grade2_classic') {
        ctx.strokeStyle = '#15803d';
        ctx.lineWidth = 1.5;
        for (let y = cy - (h * 0.85) / 2; y < cy + (h * 0.85) / 2; y += 40) {
          ctx.beginPath();
          ctx.moveTo(wRoofLeft, y);
          ctx.lineTo(cx - apertureRadiusX, y + 20);
          ctx.lineTo(wRoofLeft, y + 40);
          ctx.stroke();
        }
      }
    } else if (stands.west?.type !== 'none' && stands.west?.type !== 'no_stand') {
      // Exposed Seating Bowl from above with tier balconies, gangways & vomitories
      let row = 0;
      for (let tx = wRoofLeft; tx < cx - apertureRadiusX; tx += 20) {
        row++;
        ctx.fillStyle = getSeatColor(row, 0, seatColor1);
        ctx.fillRect(tx, cy - (h * 0.85) / 2, 16, h * 0.85);
      }
      // Stepped gangway safety yellow nosing stripes dividing seat blocks
      ctx.fillStyle = '#facc15';
      ctx.fillRect(wRoofLeft + wRoofWidth * 0.35, cy - (h * 0.85) / 2, 6, h * 0.85);
      ctx.fillRect(wRoofLeft + wRoofWidth * 0.70, cy - (h * 0.85) / 2, 6, h * 0.85);
      // Vomitory access concourse openings with emerald green emergency exit signage
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(wRoofLeft + wRoofWidth * 0.30, cy - 24, 18, 48);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(wRoofLeft + wRoofWidth * 0.30 + 3, cy - 20, 12, 4);
    }

    // 2. EAST ROOF OR EXPOSED TIERS
    const eRoofLeft = cx + apertureRadiusX;
    const eRoofWidth = (w * 0.90) / 2 - apertureRadiusX;
    if (eastHasRoof) {
      ctx.fillStyle = roofColor;
      ctx.fillRect(eRoofLeft, cy - (h * 0.90) / 2, eRoofWidth, h * 0.90);
      ctx.fillStyle = innerCanopyColor;
      ctx.fillRect(eRoofLeft, cy - (h * 0.90) / 2, 40, h * 0.90);

      if (grade === 'grade2_classic') {
        ctx.strokeStyle = '#15803d';
        ctx.lineWidth = 1.5;
        for (let y = cy - (h * 0.85) / 2; y < cy + (h * 0.85) / 2; y += 40) {
          ctx.beginPath();
          ctx.moveTo(eRoofLeft + eRoofWidth, y);
          ctx.lineTo(eRoofLeft, y + 20);
          ctx.lineTo(eRoofLeft + eRoofWidth, y + 40);
          ctx.stroke();
        }
      }
    } else if (stands.east?.type !== 'none' && stands.east?.type !== 'no_stand') {
      let row = 0;
      for (let tx = eRoofLeft; tx < eRoofLeft + eRoofWidth; tx += 20) {
        row++;
        ctx.fillStyle = getSeatColor(row, 1, seatColor1);
        ctx.fillRect(tx, cy - (h * 0.85) / 2, 16, h * 0.85);
      }
      ctx.fillStyle = '#facc15';
      ctx.fillRect(eRoofLeft + eRoofWidth * 0.35, cy - (h * 0.85) / 2, 6, h * 0.85);
      ctx.fillRect(eRoofLeft + eRoofWidth * 0.70, cy - (h * 0.85) / 2, 6, h * 0.85);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(eRoofLeft + eRoofWidth * 0.55, cy - 24, 18, 48);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(eRoofLeft + eRoofWidth * 0.55 + 3, cy - 20, 12, 4);
    }

    // 3. NORTH ROOF OR EXPOSED TIERS
    const nRoofTop = cy - (h * 0.90) / 2;
    const nRoofHeight = (h * 0.90) / 2 - apertureRadiusY;
    if (northHasRoof) {
      ctx.fillStyle = roofColor;
      ctx.fillRect(cx - apertureRadiusX, nRoofTop, apertureRadiusX * 2, nRoofHeight);
      ctx.fillStyle = innerCanopyColor;
      ctx.fillRect(cx - apertureRadiusX, cy - apertureRadiusY - 35, apertureRadiusX * 2, 35);
    } else if (stands.north?.type !== 'none' && stands.north?.type !== 'no_stand') {
      let row = 0;
      for (let ty = nRoofTop; ty < cy - apertureRadiusY; ty += 18) {
        row++;
        ctx.fillStyle = getSeatColor(row, 2, seatColor1);
        ctx.fillRect(cx - apertureRadiusX * 0.9, ty, apertureRadiusX * 1.8, 14);
      }
      ctx.fillStyle = '#facc15';
      ctx.fillRect(cx - 60, nRoofTop, 8, nRoofHeight);
      ctx.fillRect(cx + 60, nRoofTop, 8, nRoofHeight);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx - 14, nRoofTop + nRoofHeight * 0.4, 28, 16);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(cx - 10, nRoofTop + nRoofHeight * 0.4 + 2, 20, 3);
    }

    // 4. SOUTH ROOF OR EXPOSED TIERS
    const sRoofTop = cy + apertureRadiusY;
    const sRoofHeight = (h * 0.90) / 2 - apertureRadiusY;
    if (southHasRoof) {
      ctx.fillStyle = roofColor;
      ctx.fillRect(cx - apertureRadiusX, sRoofTop, apertureRadiusX * 2, sRoofHeight);
      ctx.fillStyle = innerCanopyColor;
      ctx.fillRect(cx - apertureRadiusX, sRoofTop, apertureRadiusX * 2, 35);
    } else if (stands.south?.type !== 'none' && stands.south?.type !== 'no_stand') {
      let row = 0;
      for (let ty = sRoofTop; ty < sRoofTop + sRoofHeight; ty += 18) {
        row++;
        ctx.fillStyle = getSeatColor(row, 3, seatColor1);
        ctx.fillRect(cx - apertureRadiusX * 0.9, ty, apertureRadiusX * 1.8, 14);
      }
      ctx.fillStyle = '#facc15';
      ctx.fillRect(cx - 60, sRoofTop, 8, sRoofHeight);
      ctx.fillRect(cx + 60, sRoofTop, 8, sRoofHeight);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx - 14, sRoofTop + sRoofHeight * 0.4, 28, 16);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(cx - 10, sRoofTop + sRoofHeight * 0.4 + 2, 20, 3);
    }
  }

  // Circular / Rectangular Roof Catwalk & Drainage Gutter
  ctx.strokeStyle = isNight ? '#0f172a' : isSunset ? '#64748b' : '#94a3b8';
  ctx.lineWidth = 3;
  if (isBowl) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, apertureRadiusX, apertureRadiusY, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.strokeRect(cx - apertureRadiusX, cy - apertureRadiusY, apertureRadiusX * 2, apertureRadiusY * 2);
  }

  ctx.restore();
}

/**
 * 4 Corner Floodlight Masts and Volumetric Illumination Cones into Bowl (Phase 15.8.1)
 */
function drawAerialFloodlights(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  isNight: boolean,
  timeOfDay: TimeOfDay
) {
  const isSunset = timeOfDay === 'sunset' || timeOfDay === 'dawn';
  const pylons = [
    { x: cx - w * 0.48, y: cy - h * 0.48, targetAngle: 0.8 },
    { x: cx + w * 0.48, y: cy - h * 0.48, targetAngle: 2.3 },
    { x: cx - w * 0.48, y: cy + h * 0.48, targetAngle: -0.8 },
    { x: cx + w * 0.48, y: cy + h * 0.48, targetAngle: -2.3 },
  ];

  ctx.save();

  for (const p of pylons) {
    // Pylon steel head
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
    ctx.fill();

    // High-output LED light matrix (6 bulbs per corner)
    ctx.fillStyle = isNight ? '#ffffff' : isSunset ? '#fde047' : '#64748b';
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 3) {
      const bx = p.x + Math.cos(angle) * 6;
      const by = p.y + Math.sin(angle) * 6;
      ctx.fillRect(bx - 1.5, by - 1.5, 3, 3);
    }

    // Volumetric Atmospheric Light Cones projecting into the pitch bowl at night / sunset
    if (isNight || isSunset) {
      const coneLength = 540;
      const coneSpread = 0.55;
      const beamAngle = Math.atan2(cy - p.y, cx - p.x);

      const coneGrad = ctx.createRadialGradient(p.x, p.y, 10, p.x, p.y, coneLength);
      if (isNight) {
        coneGrad.addColorStop(0, 'rgba(255, 255, 255, 0.40)');
        coneGrad.addColorStop(0.35, 'rgba(56, 189, 248, 0.18)');
        coneGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else {
        coneGrad.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
        coneGrad.addColorStop(0.35, 'rgba(249, 115, 22, 0.20)');
        coneGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }

      ctx.fillStyle = coneGrad;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.arc(p.x, p.y, coneLength, beamAngle - coneSpread / 2, beamAngle + coneSpread / 2);
      ctx.closePath();
      ctx.fill();

      // Atmospheric Halo centered directly on pylon head
      const haloGrad = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, 160);
      haloGrad.addColorStop(0, isNight ? 'rgba(255, 255, 255, 0.65)' : 'rgba(254, 240, 138, 0.55)');
      haloGrad.addColorStop(0.35, isNight ? 'rgba(56, 189, 248, 0.22)' : 'rgba(249, 115, 22, 0.18)');
      haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 160, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

/**
 * 32-Bit Broadcast Presentation Overlay (Retro Drawstar TV Network Graphics)
 */
function drawBroadcastPresentationOverlay(
  ctx: CanvasRenderingContext2D,
  stadium: StadiumDefinition,
  homeTeam: string,
  awayTeam: string,
  opacity: number
) {
  ctx.save();
  ctx.globalAlpha = Math.min(1.0, opacity);

  const cx = PITCH_CONFIG.CENTER_X;
  const topY = PITCH_CONFIG.CENTER_Y - 520;

  // 1. TOP HEADER BANNER (DRAWSTAR TV LIVE BROADCAST)
  const bannerW = 680;
  const bannerH = 76;
  const bannerX = cx - bannerW / 2;

  // 32-Bit Metallic Beveled Container
  ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
  ctx.fillRect(bannerX, topY, bannerW, bannerH);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(bannerX, topY, bannerW, bannerH);

  // Top Cyan Highlight Accent
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(bannerX + 2, topY + 2, bannerW - 4, 3);

  // Broadcast Bug Icon & Text
  ctx.fillStyle = '#facc15';
  ctx.font = 'bold 12px "Press Start 2P", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('DRAWSTAR TV 📺', bannerX + 18, topY + 28);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 10px "Press Start 2P", monospace';
  ctx.fillText('LIVE SKY-CAM BROADCAST', bannerX + 220, topY + 28);

  // Stadium Name & Location
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px "Press Start 2P", monospace';
  ctx.fillText(stadium.name.toUpperCase(), bannerX + 18, topY + 58);

  // FIFA Category Badge
  const fifa = (stadium.fifaCategory || 'continental').toUpperCase();
  ctx.fillStyle = '#facc15';
  ctx.font = 'bold 10px "Press Start 2P", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`FIFA ${fifa}`, bannerX + bannerW - 18, topY + 58);

  // 2. BOTTOM MATCHUP & CAPACITY BANNER
  const botY = PITCH_CONFIG.CENTER_Y + 480;
  const botW = 620;
  const botH = 48;
  const botX = cx - botW / 2;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
  ctx.fillRect(botX, botY, botW, botH);
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 2;
  ctx.strokeRect(botX, botY, botW, botH);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${homeTeam.toUpperCase()}  VS  ${awayTeam.toUpperCase()}`, cx, botY + 28);

  ctx.restore();
}
