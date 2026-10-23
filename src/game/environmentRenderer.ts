/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PITCH_CONFIG } from './constants';
import { TimeOfDay } from '../types';
import { SurroundingsType } from '../types/stadium';

/**
 * PHASE 15.1: DUAL-PERSPECTIVE OUTSIDE SURROUNDINGS ENGINE
 *
 * Provides high-performance, zero-allocation procedural graphics for all 8 surroundings
 * across dual camera perspectives:
 * 1. Pitch-Level Horizon View (background skyline behind stadium stands)
 * 2. High-Altitude Aerial Bird's-Eye View (landscape surrounding stadium footprint from Sky-Cam)
 *
 * Surroundings Catalog:
 * 1. Nature: Alpine green hills, forest canopies, open sky, mountain lake reservoir.
 * 2. Parking Lot (Camp Nou Style): Asphalt bays, parked cars, team coach buses, tree boulevards.
 * 3. Small City: Suburban townhomes, neighborhood streets, red-brick commercial blocks.
 * 4. Big City: Dense metropolitan skyscrapers, arterial highways, elevated rail lines, helipads.
 * 5. Airport (Gibraltar Style): Adjacent tarmac runway, hangars, taxiways, control tower, aircraft.
 * 6. Railroad: Multi-track train depot, freight railyard, industrial gantries, moving trains.
 * 7. Beach: Sandy coastline, turquoise ocean surf, palm trees, seaside promenade.
 * 8. Marine Floating: Ocean water envelope, floating pontoons, harbor boats, perimeter buoys.
 */

export interface AerialEnvironmentBounds {
  left: number;
  top: number;
  width: number;
  height: number;
  stadiumBounds: {
    centerX: number;
    centerY: number;
    outerWidth: number;
    outerHeight: number;
  };
}

/**
 * Procedural color helper for time of day
 */
function isDark(time: TimeOfDay): boolean {
  return time === 'night' || time === 'sunset' || time === 'dawn';
}

/**
 * -----------------------------------------------------------------------------
 * 15.1 AERIAL ENVIRONMENT BIRD'S-EYE RENDERER
 * -----------------------------------------------------------------------------
 */
export function drawAerialEnvironment(
  ctx: CanvasRenderingContext2D,
  surroundings: SurroundingsType,
  timeOfDay: TimeOfDay = 'night',
  bounds: AerialEnvironmentBounds
) {
  const dark = isDark(timeOfDay);
  const { left, top, width, height, stadiumBounds } = bounds;
  const cx = stadiumBounds.centerX;
  const cy = stadiumBounds.centerY;

  ctx.save();

  switch (surroundings) {
    case 'mountains':
    case 'nature':
      drawAerialMountains(ctx, left, top, width, height, cx, cy, dark, timeOfDay);
      break;

    case 'forest':
      drawAerialForest(ctx, left, top, width, height, cx, cy, dark, timeOfDay);
      break;

    case 'savannah':
      drawAerialSavannah(ctx, left, top, width, height, cx, cy, dark, timeOfDay);
      break;

    case 'highway':
      drawAerialHighway(ctx, left, top, width, height, cx, cy, dark, timeOfDay);
      break;

    case 'parking_lot':
      drawAerialParkingLot(ctx, left, top, width, height, cx, cy, dark, timeOfDay);
      break;

    case 'small_city':
      drawAerialSmallCity(ctx, left, top, width, height, cx, cy, dark, timeOfDay);
      break;

    case 'big_city':
      drawAerialBigCity(ctx, left, top, width, height, cx, cy, dark, timeOfDay);
      break;

    case 'airport':
      drawAerialAirport(ctx, left, top, width, height, cx, cy, dark, timeOfDay);
      break;

    case 'railroad':
      drawAerialRailroad(ctx, left, top, width, height, cx, cy, dark, timeOfDay);
      break;

    case 'beach':
      drawAerialBeach(ctx, left, top, width, height, cx, cy, dark, timeOfDay);
      break;

    case 'marine_floating':
      drawAerialMarineFloating(ctx, left, top, width, height, cx, cy, dark, timeOfDay);
      break;

    default:
      drawAerialMountains(ctx, left, top, width, height, cx, cy, dark, timeOfDay);
      break;
  }

  // Atmospheric haze / distance fog vignette towards outer perimeter
  const fogRadius = Math.max(width, height) * 0.72;
  const fogGrad = ctx.createRadialGradient(cx, cy, fogRadius * 0.45, cx, cy, fogRadius);
  fogGrad.addColorStop(0, 'rgba(0,0,0,0)');
  fogGrad.addColorStop(0.7, dark ? (timeOfDay === 'sunset' ? 'rgba(80, 20, 10, 0.35)' : 'rgba(5, 10, 24, 0.45)') : 'rgba(210, 230, 255, 0.25)');
  fogGrad.addColorStop(1, dark ? (timeOfDay === 'sunset' ? 'rgba(60, 15, 10, 0.85)' : 'rgba(5, 10, 24, 0.88)') : 'rgba(180, 210, 240, 0.65)');
  ctx.fillStyle = fogGrad;
  ctx.fillRect(left, top, width, height);

  ctx.restore();
}

/**
 * 1. Mountains Aerial: Layered alpine terrain, rocky snow-capped summits, contour ridges, mountain lake, pine clusters, scenic roads
 * 3 Time-of-Day Variants: Morning/Noon (sunlight), Afternoon/Sunset (red/orange glow), Night (moonlit peaks)
 */
function drawAerialMountains(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  w: number,
  h: number,
  cx: number,
  cy: number,
  dark: boolean,
  time: TimeOfDay
) {
  const isNoon = time === 'noon';
  const isSunset = time === 'sunset' || time === 'dawn';

  // Base alpine meadow terrain
  ctx.fillStyle = isNoon ? '#2d7a2d' : isSunset ? '#5a2d16' : '#0d1e11';
  ctx.fillRect(left, top, w, h);

  // Elevation contour bands (higher plateaus & ridges)
  const ridgeColor = isNoon ? '#3b943b' : isSunset ? '#7c3a1e' : '#142c19';
  ctx.fillStyle = ridgeColor;
  for (let i = 0; i < 7; i++) {
    const rx = left + (i * 390) % w;
    const ry = top + (i * 330) % h;
    ctx.beginPath();
    ctx.ellipse(rx, ry, 360, 220, 0.35 * i, 0, Math.PI * 2);
    ctx.fill();
  }

  // Jagged Rocky Summits with Granite Shading
  const rockColor = isNoon ? '#64748b' : isSunset ? '#78350f' : '#1e293b';
  ctx.fillStyle = rockColor;
  const peaks = [
    { x: left + 220, y: top + 180, r: 160 },
    { x: left + w - 280, y: top + 160, r: 180 },
    { x: left + 190, y: top + h - 220, r: 170 },
    { x: left + w - 240, y: top + h - 200, r: 190 },
  ];
  for (const p of peaks) {
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - p.r);
    ctx.lineTo(p.x + p.r * 0.9, p.y + p.r * 0.6);
    ctx.lineTo(p.x - p.r * 0.9, p.y + p.r * 0.6);
    ctx.closePath();
    ctx.fill();

    // Snow caps on peaks
    ctx.fillStyle = isNoon ? '#f8fafc' : isSunset ? '#fde047' : '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - p.r);
    ctx.lineTo(p.x + p.r * 0.35, p.y - p.r * 0.4);
    ctx.lineTo(p.x - p.r * 0.35, p.y - p.r * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rockColor;
  }

  // Mountain Lake / Reservoir in north-east quadrant
  const lakeX = cx + 640;
  const lakeY = cy - 460;
  const lakeGrad = ctx.createRadialGradient(lakeX, lakeY, 20, lakeX, lakeY, 240);
  if (isNoon) {
    lakeGrad.addColorStop(0, '#0ea5e9');
    lakeGrad.addColorStop(1, '#0284c7');
  } else if (isSunset) {
    lakeGrad.addColorStop(0, '#ea580c');
    lakeGrad.addColorStop(1, '#7c2d12');
  } else {
    lakeGrad.addColorStop(0, '#0369a1');
    lakeGrad.addColorStop(1, '#02131e');
  }
  ctx.fillStyle = lakeGrad;
  ctx.beginPath();
  ctx.ellipse(lakeX, lakeY, 280, 170, -0.22, 0, Math.PI * 2);
  ctx.fill();

  // Lake shoreline sand/rock rim
  ctx.strokeStyle = isSunset ? '#b45309' : dark ? '#334155' : '#cbd5e1';
  ctx.lineWidth = 5;
  ctx.stroke();

  // Serpentine mountain switchback hairpin roads with safety guardrails climbing the western slope
  ctx.strokeStyle = isSunset ? '#451a03' : dark ? '#1e293b' : '#64748b';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(left, cy + 540);
  ctx.bezierCurveTo(cx - 500, cy + 640, cx - 640, cy - 380, cx - 220, top);
  ctx.stroke();

  // Mountain switchback hairpin curves on north-west ridge
  ctx.beginPath();
  ctx.moveTo(cx - 720, cy - 500);
  ctx.bezierCurveTo(cx - 820, cy - 420, cx - 820, cy - 340, cx - 700, cy - 320);
  ctx.bezierCurveTo(cx - 580, cy - 300, cx - 580, cy - 220, cx - 720, cy - 200);
  ctx.stroke();

  // Safety guardrails along switchback roads
  ctx.strokeStyle = isSunset ? '#78350f' : dark ? '#475569' : '#94a3b8';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Winding scenic mountain highway encircling the stadium
  ctx.strokeStyle = isSunset ? '#451a03' : dark ? '#1e293b' : '#64748b';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(left + 220, top);
  ctx.bezierCurveTo(cx - 320, cy - 520, cx + 460, cy - 680, left + w, cy - 320);
  ctx.stroke();

  // Road dashed centerline
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 2;
  ctx.setLineDash([12, 12]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Alpine Wooden Ski Chalets with smoking chimneys nestled in valleys
  const chalets = [
    { x: cx - 620, y: cy - 260, w: 46, h: 32 },
    { x: cx + 680, y: cy + 420, w: 52, h: 36 },
    { x: cx - 480, y: cy + 520, w: 44, h: 30 },
  ];
  for (const ch of chalets) {
    // Chalet timber body
    ctx.fillStyle = isSunset ? '#451a03' : '#78350f';
    ctx.fillRect(ch.x - ch.w / 2, ch.y - ch.h / 2, ch.w, ch.h);

    // Pitched alpine gable roof
    ctx.fillStyle = isNoon ? '#451a03' : isSunset ? '#78350f' : '#1c1917';
    ctx.beginPath();
    ctx.moveTo(ch.x - ch.w / 2 - 4, ch.y + ch.h / 2);
    ctx.lineTo(ch.x, ch.y - ch.h / 2 - 6);
    ctx.lineTo(ch.x + ch.w / 2 + 4, ch.y + ch.h / 2);
    ctx.closePath();
    ctx.fill();

    // Stone chimney with rising pixel smoke
    ctx.fillStyle = '#475569';
    ctx.fillRect(ch.x + ch.w / 4, ch.y - ch.h / 2 - 10, 6, 8);
    // Smoke puffs
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.beginPath();
    ctx.arc(ch.x + ch.w / 4 + 3, ch.y - ch.h / 2 - 14, 3, 0, Math.PI * 2);
    ctx.arc(ch.x + ch.w / 4 + 6, ch.y - ch.h / 2 - 20, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Warm illuminated window at night
    if (dark) {
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(ch.x - 8, ch.y - 4, 6, 6);
    }
  }

  // Dense Pine Tree Clusters (thousands of circular/conical canopies)
  const treeBase = isNoon ? '#15803d' : isSunset ? '#78350f' : '#081c0f';
  const treeHigh = isNoon ? '#22c55e' : isSunset ? '#b45309' : '#14532d';
  ctx.fillStyle = treeBase;

  for (let px = left + 80; px < left + w - 80; px += 90) {
    for (let py = top + 80; py < top + h - 80; py += 90) {
      if (Math.hypot(px - cx, py - cy) < 440) continue;
      if (Math.hypot(px - lakeX, py - lakeY) < 250) continue;

      const jitterX = ((px * 19) % 45) - 22;
      const jitterY = ((py * 23) % 45) - 22;
      const treeR = 9 + ((px + py) % 7);

      ctx.beginPath();
      ctx.arc(px + jitterX, py + jitterY, treeR, 0, Math.PI * 2);
      ctx.fill();

      // Tree sunlight/moonlight highlight
      ctx.fillStyle = treeHigh;
      ctx.beginPath();
      ctx.arc(px + jitterX - 2, py + jitterY - 2, treeR * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = treeBase;
    }
  }
}

/**
 * Backward-compatible alias for Nature
 */
function drawAerialNature(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  w: number,
  h: number,
  cx: number,
  cy: number,
  dark: boolean,
  time: TimeOfDay
) {
  drawAerialMountains(ctx, left, top, w, h, cx, cy, dark, time);
}

/**
 * 2. Forest Aerial: Vast 360-degree woodland canopy, winding gravel trails, ranger cabins, lumber clearings
 */
function drawAerialForest(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  w: number,
  h: number,
  cx: number,
  cy: number,
  dark: boolean,
  time: TimeOfDay
) {
  const isNoon = time === 'noon';
  const isSunset = time === 'sunset' || time === 'dawn';

  // Base rich soil & moss forest floor
  ctx.fillStyle = isNoon ? '#14532d' : isSunset ? '#451a03' : '#05180b';
  ctx.fillRect(left, top, w, h);

  // Winding dirt fire-trails & gravel tracks
  const trailColor = isNoon ? '#92400e' : isSunset ? '#78350f' : '#292524';
  ctx.strokeStyle = trailColor;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(left, cy - 350);
  ctx.quadraticCurveTo(cx - 400, cy - 250, cx - 300, top);
  ctx.moveTo(cx + 350, top);
  ctx.bezierCurveTo(cx + 450, cy + 100, cx + 550, cy + 450, left + w, cy + 500);
  ctx.moveTo(left + 300, top + h);
  ctx.quadraticCurveTo(cx - 350, cy + 450, left, cy + 400);
  ctx.stroke();

  // Dense, layered interlocking forest crowns
  const leafColors = isNoon
    ? ['#166534', '#15803d', '#14532d', '#1e3a1e', '#15803d']
    : isSunset
    ? ['#78350f', '#9a3412', '#b45309', '#d97706', '#451a03']
    : ['#052e16', '#022c22', '#064e3b', '#031a0e', '#052e16'];

  for (let fx = left + 50; fx < left + w - 50; fx += 55) {
    for (let fy = top + 50; fy < top + h - 50; fy += 55) {
      if (Math.hypot(fx - cx, fy - cy) < 430) continue;

      const jX = ((fx * 17) % 35) - 17;
      const jY = ((fy * 29) % 35) - 17;
      const r = 16 + ((fx + fy) % 9);
      const col = leafColors[(fx * 3 + fy * 7) % leafColors.length];

      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(fx + jX, fy + jY, r, 0, Math.PI * 2);
      ctx.fill();

      // Canopy highlight
      ctx.fillStyle = isNoon ? 'rgba(255,255,255,0.12)' : isSunset ? 'rgba(251,191,36,0.18)' : 'rgba(56,189,248,0.08)';
      ctx.beginPath();
      ctx.arc(fx + jX - 3, fy + jY - 3, r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Scenic River cutting diagonally through the woods
  const riverColor = isNoon ? '#0284c7' : isSunset ? '#c2410c' : '#0369a1';
  ctx.strokeStyle = riverColor;
  ctx.lineWidth = 42;
  ctx.beginPath();
  ctx.moveTo(left, cy + 620);
  ctx.bezierCurveTo(cx - 450, cy + 380, cx - 350, cy - 280, left + 450, top);
  ctx.stroke();

  // River water ripples and foam highlights
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(left + 80, cy + 560);
  ctx.bezierCurveTo(cx - 430, cy + 360, cx - 340, cy - 260, left + 460, top + 60);
  ctx.stroke();

  // Rustic Wooden Footbridge crossing the scenic river
  const bridgeX = cx - 440;
  const bridgeY = cy + 240;
  ctx.fillStyle = '#78350f';
  ctx.fillRect(bridgeX - 18, bridgeY - 32, 36, 64);
  ctx.strokeStyle = '#451a03';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(bridgeX - 18, bridgeY - 32, 36, 64);
  // Bridge plank slats
  for (let by = bridgeY - 26; by <= bridgeY + 26; by += 8) {
    ctx.beginPath();
    ctx.moveTo(bridgeX - 16, by);
    ctx.lineTo(bridgeX + 16, by);
    ctx.stroke();
  }

  // Timber logging lumber clearings
  const clearings = [
    { x: cx - 600, y: cy + 420 },
    { x: cx + 580, y: cy - 380 },
  ];
  for (const cl of clearings) {
    ctx.fillStyle = isNoon ? '#78350f' : '#292524';
    ctx.fillRect(cl.x - 45, cl.y - 30, 90, 60);

    // Stored timber log stacks
    ctx.fillStyle = '#d97706';
    for (let ly = cl.y - 20; ly <= cl.y + 15; ly += 9) {
      ctx.fillRect(cl.x - 35, ly, 70, 6);
    }
  }

  // Fire Ranger Lookout Tower on elevated clearing
  const towerX = cx + 540;
  const towerY = cy + 450;
  // Four steel lattice legs
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(towerX - 16, towerY - 16);
  ctx.lineTo(towerX - 8, towerY - 8);
  ctx.moveTo(towerX + 16, towerY - 16);
  ctx.lineTo(towerX + 8, towerY - 8);
  ctx.moveTo(towerX - 16, towerY + 16);
  ctx.lineTo(towerX - 8, towerY + 8);
  ctx.moveTo(towerX + 16, towerY + 16);
  ctx.lineTo(towerX + 8, towerY + 8);
  ctx.stroke();

  // Observation Cabin
  ctx.fillStyle = '#78350f';
  ctx.fillRect(towerX - 12, towerY - 12, 24, 24);
  // Glass panoramic observation windows
  ctx.fillStyle = dark ? '#fef08a' : '#38bdf8';
  ctx.fillRect(towerX - 9, towerY - 9, 18, 18);
  // Metal catwalk balcony railing
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(towerX - 14, towerY - 14, 28, 28);
}

/**
 * 3. Savannah Aerial: Golden sun-drenched plains, umbrella acacia trees, dry riverbed (wadi), watering hole
 */
function drawAerialSavannah(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  w: number,
  h: number,
  cx: number,
  cy: number,
  dark: boolean,
  time: TimeOfDay
) {
  const isNoon = time === 'noon';
  const isSunset = time === 'sunset' || time === 'dawn';

  // Base golden savannah grasses
  ctx.fillStyle = isNoon ? '#d97706' : isSunset ? '#9a3412' : '#292524';
  ctx.fillRect(left, top, w, h);

  // Dry riverbed (Wadi) with cracked silt meandering across the canvas
  ctx.strokeStyle = isNoon ? '#b45309' : isSunset ? '#78350f' : '#1c1917';
  ctx.lineWidth = 36;
  ctx.beginPath();
  ctx.moveTo(left, cy - 400);
  ctx.bezierCurveTo(cx - 350, cy - 320, cx - 250, cy + 450, left + w, cy + 380);
  ctx.stroke();

  // Natural Savannah Watering Hole
  const waterX = cx - 550;
  const waterY = cy + 380;
  ctx.fillStyle = isNoon ? '#0284c7' : isSunset ? '#b91c1c' : '#0369a1';
  ctx.beginPath();
  ctx.ellipse(waterX, waterY, 140, 85, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ca8a04'; // Sandy mud banks
  ctx.lineWidth = 12;
  ctx.stroke();

  // Granite Kopje Rock Formations
  const kopjes = [
    { x: cx + 580, y: cy - 400, w: 140, h: 90 },
    { x: cx + 520, y: cy + 460, w: 120, h: 70 },
  ];
  for (const kp of kopjes) {
    ctx.fillStyle = isSunset ? '#7c2d12' : dark ? '#334155' : '#78716c';
    ctx.beginPath();
    ctx.ellipse(kp.x, kp.y, kp.w / 2, kp.h / 2, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Dirt Safari Tracks meandering across the plains
  ctx.strokeStyle = isSunset ? '#78350f' : dark ? '#292524' : '#b45309';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(left + 240, top);
  ctx.bezierCurveTo(cx - 300, cy - 250, cx - 200, cy + 250, left + w - 240, top + h);
  ctx.stroke();

  // Safari 4x4 Land Rover Sprites driving along dirt tracks
  const rovers = [
    { x: cx - 280, y: cy - 220, angle: 0.6 },
    { x: cx - 180, y: cy + 280, angle: 0.4 },
  ];
  for (const rov of rovers) {
    ctx.save();
    ctx.translate(rov.x, rov.y);
    ctx.rotate(rov.angle);
    // Sand-beige vehicle body
    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(-12, -7, 24, 14);
    // Roof rack with luggage & spare wheel
    ctx.fillStyle = '#44403c';
    ctx.fillRect(-8, -5, 16, 10);
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.arc(-10, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    // Night headlights
    if (dark) {
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(11, -5, 3, 3);
      ctx.fillRect(11, 2, 3, 3);
    }
    ctx.restore();
  }

  // Massive Baobab Trees with swollen broad trunks and sprawling branches
  const baobabs = [
    { x: cx - 680, y: cy - 180, r: 24 },
    { x: cx + 640, y: cy + 240, r: 28 },
    { x: cx - 440, y: cy - 420, r: 22 },
  ];
  for (const bb of baobabs) {
    // Broad swollen wooden trunk
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.arc(bb.x, bb.y, bb.r * 0.7, 0, Math.PI * 2);
    ctx.fill();

    // Sprawling leafy crown
    ctx.fillStyle = isNoon ? '#15803d' : isSunset ? '#451a03' : '#052e16';
    ctx.beginPath();
    ctx.arc(bb.x, bb.y, bb.r, 0, Math.PI * 2);
    ctx.fill();

    // Trunk radial bark creases
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
      ctx.beginPath();
      ctx.moveTo(bb.x, bb.y);
      ctx.lineTo(bb.x + Math.cos(a) * bb.r * 0.8, bb.y + Math.sin(a) * bb.r * 0.8);
      ctx.stroke();
    }
  }

  // Iconic Umbrella Acacia Trees (Flat-topped wide circular canopies with distinct radiating branches)
  const acaciaCol = isNoon ? '#15803d' : isSunset ? '#451a03' : '#052e16';
  for (let ax = left + 100; ax < left + w - 100; ax += 125) {
    for (let ay = top + 100; ay < top + h - 100; ay += 125) {
      if (Math.hypot(ax - cx, ay - cy) < 440) continue;
      if (Math.hypot(ax - waterX, ay - waterY) < 140) continue;

      const jX = ((ax * 13) % 60) - 30;
      const jY = ((ay * 23) % 60) - 30;
      const treeR = 18 + ((ax + ay) % 8);

      // Umbrella canopy (wide flat ellipse)
      ctx.fillStyle = acaciaCol;
      ctx.beginPath();
      ctx.ellipse(ax + jX, ay + jY, treeR, treeR * 0.65, 0.1, 0, Math.PI * 2);
      ctx.fill();

      // Shadow cast onto golden savannah
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.beginPath();
      ctx.ellipse(ax + jX + 6, ay + jY + 8, treeR * 0.8, treeR * 0.45, 0.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * 4. Highway Aerial: Multi-tier concrete cloverleaf interchange, 8-lane expressways, moving vehicles with headlights/taillights
 */
function drawAerialHighway(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  w: number,
  h: number,
  cx: number,
  cy: number,
  dark: boolean,
  time: TimeOfDay
) {
  const isNoon = time === 'noon';
  const isSunset = time === 'sunset' || time === 'dawn';

  // Base terrain (highway landscaped grass embankment)
  ctx.fillStyle = isNoon ? '#15803d' : isSunset ? '#451a03' : '#0f172a';
  ctx.fillRect(left, top, w, h);

  // Major 8-Lane Expressway Avenues (North-South & East-West)
  const asphaltColor = isSunset ? '#1c1917' : dark ? '#0a0f1d' : '#1e293b';
  const roadWidth = 110;

  // Horizontal Expressway (crossing south of stadium)
  const hRoadY = cy + 480;
  ctx.fillStyle = asphaltColor;
  ctx.fillRect(left, hRoadY - roadWidth / 2, w, roadWidth);

  // Vertical Expressway (crossing east of stadium)
  const vRoadX = cx + 580;
  ctx.fillRect(vRoadX - roadWidth / 2, top, roadWidth, h);

  // Cloverleaf Overpass Flyover Loops (4 sweeping circular interchange ramps)
  const cloverCenter = { x: vRoadX, y: hRoadY };
  const rampRadius = 140;
  ctx.strokeStyle = isSunset ? '#292524' : dark ? '#1e293b' : '#334155';
  ctx.lineWidth = 32;

  // 4 Quadrant Cloverleaf Ramps
  const rampOffsets = [
    { dx: -rampRadius, dy: -rampRadius },
    { dx: rampRadius, dy: -rampRadius },
    { dx: -rampRadius, dy: rampRadius },
    { dx: rampRadius, dy: rampRadius },
  ];
  for (const ro of rampOffsets) {
    ctx.beginPath();
    ctx.arc(cloverCenter.x + ro.dx * 0.8, cloverCenter.y + ro.dy * 0.8, 70, 0, Math.PI * 2);
    ctx.stroke();
  }

  // White and Yellow Lane Divider Markings
  ctx.strokeStyle = '#facc15'; // Yellow median
  ctx.lineWidth = 3;
  // Horizontal median
  ctx.beginPath();
  ctx.moveTo(left, hRoadY);
  ctx.lineTo(left + w, hRoadY);
  ctx.stroke();
  // Vertical median
  ctx.beginPath();
  ctx.moveTo(vRoadX, top);
  ctx.lineTo(vRoadX, top + h);
  ctx.stroke();

  // Dashed white lane markings
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([16, 14]);
  for (let off of [-32, 32]) {
    ctx.beginPath();
    ctx.moveTo(left, hRoadY + off);
    ctx.lineTo(left + w, hRoadY + off);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(vRoadX + off, top);
    ctx.lineTo(vRoadX + off, top + h);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Moving Highway Vehicular Traffic (Cars, Trucks, Tankers, Buses)
  const vehicleColors = ['#dc2626', '#2563eb', '#ffffff', '#eab308', '#059669', '#9333ea', '#64748b'];

  // Vehicles along Horizontal Expressway
  for (let vx = left + 80; vx < left + w - 80; vx += 95) {
    const isEastbound = ((vx % 190) < 95);
    const vy = hRoadY + (isEastbound ? 24 : -24);
    const carW = 28 + (vx % 14);
    const carH = 14;
    const col = vehicleColors[(vx * 7) % vehicleColors.length];

    ctx.fillStyle = col;
    ctx.fillRect(vx, vy - carH / 2, carW, carH);

    // Windshield
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(vx + (isEastbound ? carW - 9 : 3), vy - 5, 6, 10);

    // Night Headlight Beams & Red Taillights
    if (dark) {
      // Headlights
      ctx.fillStyle = '#fef08a';
      const headX = isEastbound ? vx + carW : vx - 4;
      ctx.fillRect(headX, vy - 5, 4, 3);
      ctx.fillRect(headX, vy + 2, 4, 3);

      // Light beam cone
      ctx.fillStyle = 'rgba(254, 240, 138, 0.22)';
      ctx.beginPath();
      ctx.moveTo(headX, vy);
      ctx.lineTo(headX + (isEastbound ? 35 : -35), vy - 14);
      ctx.lineTo(headX + (isEastbound ? 35 : -35), vy + 14);
      ctx.closePath();
      ctx.fill();

      // Taillights
      ctx.fillStyle = '#ef4444';
      const tailX = isEastbound ? vx - 2 : vx + carW;
      ctx.fillRect(tailX, vy - 5, 3, 3);
      ctx.fillRect(tailX, vy + 2, 3, 3);
    }
  }

  // Overhead Steel Highway Sign Gantries spanning over lanes
  for (let gx = left + 280; gx < left + w - 280; gx += 460) {
    // Metal bridge
    ctx.fillStyle = '#475569';
    ctx.fillRect(gx - 3, hRoadY - roadWidth / 2 - 8, 6, roadWidth + 16);
    // Green highway directional sign
    ctx.fillStyle = '#15803d';
    ctx.fillRect(gx - 18, hRoadY - 35, 36, 16);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(gx - 18, hRoadY - 35, 36, 16);
  }
}

/**
 * 2. Parking Lot Aerial (Camp Nou style): Vast asphalt grids, white parking stalls, hundreds of cars, team buses
 */
function drawAerialParkingLot(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  w: number,
  h: number,
  cx: number,
  cy: number,
  dark: boolean,
  time: TimeOfDay
) {
  // Base asphalt ground
  ctx.fillStyle = dark ? (time === 'night' ? '#0f172a' : '#1e293b') : '#334155';
  ctx.fillRect(left, top, w, h);

  // Concrete pedestrian concourses and security ring around stadium
  ctx.fillStyle = dark ? '#1e293b' : '#64748b';
  ctx.beginPath();
  ctx.ellipse(cx, cy, 540, 420, 0, 0, Math.PI * 2);
  ctx.fill();

  // Multi-lane vehicular avenues around parking perimeter
  const aveColor = dark ? '#090d16' : '#1e293b';
  ctx.fillStyle = aveColor;
  ctx.fillRect(left, cy - 35, w, 70); // East-West boulevard
  ctx.fillRect(cx - 35, top, 70, h); // North-South avenue

  // Painted road markings
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 2;
  ctx.setLineDash([14, 12]);
  ctx.beginPath();
  ctx.moveTo(left, cy);
  ctx.lineTo(left + w, cy);
  ctx.moveTo(cx, top);
  ctx.lineTo(cx, top + h);
  ctx.stroke();
  ctx.setLineDash([]);

  // Parking Lot Grid Sectors (NW, NE, SW, SE)
  const sectors = [
    { x1: left + 100, y1: top + 100, x2: cx - 120, y2: cy - 120 },
    { x1: cx + 120, y1: top + 100, x2: left + w - 100, y2: cy - 120 },
    { x1: left + 100, y1: cy + 120, x2: cx - 120, y2: top + h - 100 },
    { x1: cx + 120, y1: cy + 120, x2: left + w - 100, y2: top + h - 100 },
  ];

  const carColors = ['#ffffff', '#dc2626', '#2563eb', '#94a3b8', '#1e293b', '#e2e8f0', '#f59e0b', '#10b981'];

  for (const s of sectors) {
    // Asphalt lot section
    ctx.fillStyle = dark ? '#0b1120' : '#1e293b';
    ctx.fillRect(s.x1, s.y1, s.x2 - s.x1, s.y2 - s.y1);

    // White parking bay stripes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1.2;

    for (let py = s.y1 + 25; py < s.y2 - 25; py += 50) {
      ctx.beginPath();
      ctx.moveTo(s.x1 + 10, py);
      ctx.lineTo(s.x2 - 10, py);
      ctx.stroke();

      // Individual parked cars
      for (let px = s.x1 + 20; px < s.x2 - 20; px += 24) {
        // Skip some slots to simulate empty parking spots
        const seed = (px * 31 + py * 17) % 100;
        if (seed < 22) continue; // 22% empty slots

        const color = carColors[(seed + px) % carColors.length];
        ctx.fillStyle = color;
        // Car rectangle (8 x 14 px)
        ctx.fillRect(px - 4, py - 10, 8, 14);

        // Windshield glass
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(px - 3, py - 6, 6, 4);

        // Car headlights glow at night
        if (dark && seed > 80) {
          ctx.fillStyle = 'rgba(254, 240, 138, 0.6)';
          ctx.fillRect(px - 3, py - 14, 2, 3);
          ctx.fillRect(px + 1, py - 14, 2, 3);
        }
      }
    }
  }

  // Official Team Luxury Coach Buses at West VIP Grandstand portal
  const busY = cy - 20;
  const busColors = ['#1d4ed8', '#b91c1c']; // Home Blue & Away Red team buses
  for (let b = 0; b < 2; b++) {
    const bx = cx - 440;
    const by = busY + b * 32;
    // Bus body (16 x 42 px)
    ctx.fillStyle = busColors[b];
    ctx.fillRect(bx, by, 42, 16);
    // Roof air conditioning vents
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(bx + 4, by + 3, 34, 10);
    // Team livery stripe
    ctx.fillStyle = '#facc15';
    ctx.fillRect(bx, by + 7, 42, 2);
  }

  // Tree Boulevards lining the perimeter avenues
  ctx.fillStyle = dark ? '#0f291e' : '#15803d';
  for (let tx = left + 40; tx < left + w - 40; tx += 60) {
    ctx.beginPath();
    ctx.arc(tx, cy - 42, 8, 0, Math.PI * 2);
    ctx.arc(tx, cy + 42, 8, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * 3. Small City Aerial: Suburban streets, blocks of houses with hip roofs, backyards, roundabouts
 */
function drawAerialSmallCity(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  w: number,
  h: number,
  cx: number,
  cy: number,
  dark: boolean,
  time: TimeOfDay
) {
  const isNoon = time === 'noon';
  const isSunset = time === 'sunset' || time === 'dawn';

  // Base suburban terrain (lawns & backyard greenery)
  ctx.fillStyle = isNoon ? '#4d7c0f' : isSunset ? '#78350f' : '#111e14';
  ctx.fillRect(left, top, w, h);

  // Street Grid (Residential roads & tree boulevards)
  const roadColor = isSunset ? '#292524' : dark ? '#1e293b' : '#64748b';
  ctx.fillStyle = roadColor;

  const roadSpacingX = 220;
  const roadSpacingY = 180;

  for (let rx = left + 100; rx < left + w; rx += roadSpacingX) {
    ctx.fillRect(rx - 12, top, 24, h);
  }
  for (let ry = top + 90; ry < top + h; ry += roadSpacingY) {
    ctx.fillRect(left, ry - 12, w, 24);
  }

  // Neighborhood Roundabouts
  for (let rx = left + 100; rx < left + w; rx += roadSpacingX * 2) {
    for (let ry = top + 90; ry < top + h; ry += roadSpacingY * 2) {
      ctx.fillStyle = roadColor;
      ctx.beginPath();
      ctx.arc(rx, ry, 36, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = isNoon ? '#4d7c0f' : isSunset ? '#78350f' : '#111e14';
      ctx.beginPath();
      ctx.arc(rx, ry, 18, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Civic Center: Historic Town Hall with Clock Tower & Community Center (2-3 medium buildings)
  const civicBuildings = [
    { x: cx - 520, y: cy - 280, w: 90, h: 65, color: '#7f1d1d', isTownHall: true },
    { x: cx + 460, y: cy - 270, w: 80, h: 55, color: '#334155', isTownHall: false },
    { x: cx - 480, y: cy + 290, w: 85, h: 60, color: '#1e293b', isTownHall: false },
  ];

  for (const cb of civicBuildings) {
    ctx.fillStyle = cb.color;
    ctx.fillRect(cb.x, cb.y, cb.w, cb.h);

    if (cb.isTownHall) {
      // Clock tower in center
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(cb.x + cb.w / 2 - 12, cb.y + cb.h / 2 - 12, 24, 24);
      // Clock dial
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cb.x + cb.w / 2, cb.y + cb.h / 2, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    // Windows with warm lights at night
    if (dark) {
      ctx.fillStyle = '#fef08a';
      for (let wx = cb.x + 8; wx < cb.x + cb.w - 8; wx += 14) {
        ctx.fillRect(wx, cb.y + 8, 5, 5);
        ctx.fillRect(wx, cb.y + cb.h - 13, 5, 5);
      }
    }
  }

  // Suburban House Blocks with Pitched Terracotta & Slate Roofs
  const roofColors = isSunset
    ? ['#b91c1c', '#c2410c', '#9a3412', '#78350f', '#451a03']
    : isNoon
    ? ['#991b1b', '#b45309', '#334155', '#475569', '#7c2d12']
    : ['#1e293b', '#292524', '#0f172a', '#1e1b4b', '#312e81'];

  for (let bx = left + 40; bx < left + w - 40; bx += roadSpacingX) {
    for (let by = top + 30; by < top + h - 30; by += roadSpacingY) {
      if (Math.hypot(bx + 80 - cx, by + 70 - cy) < 430) continue; // Clear stadium zone

      // Render 4 small family houses per block
      const houseOffsets = [
        { dx: 30, dy: 25, w: 50, h: 36 },
        { dx: 110, dy: 25, w: 50, h: 36 },
        { dx: 30, dy: 90, w: 50, h: 36 },
        { dx: 110, dy: 90, w: 50, h: 36 },
      ];

      for (let hIdx = 0; hIdx < houseOffsets.length; hIdx++) {
        const ho = houseOffsets[hIdx];
        const hx = bx + ho.dx;
        const hy = by + ho.dy;
        const col = roofColors[(bx + by + hIdx * 7) % roofColors.length];

        // Roof body
        ctx.fillStyle = col;
        ctx.fillRect(hx, hy, ho.w, ho.h);

        // Roof ridge line
        ctx.fillStyle = dark ? '#0f172a' : 'rgba(0,0,0,0.25)';
        ctx.fillRect(hx + 6, hy + ho.h / 2 - 2, ho.w - 12, 4);

        // Chimney
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(hx + ho.w - 10, hy + 5, 5, 5);

        // Windows illuminated at night
        if (dark && (hIdx + bx) % 3 !== 0) {
          ctx.fillStyle = '#fde047';
          ctx.fillRect(hx + 8, hy + 6, 4, 4);
          ctx.fillRect(hx + ho.w - 16, hy + ho.h - 10, 4, 4);
        }

        // Backyard tree
        ctx.fillStyle = isNoon ? '#15803d' : isSunset ? '#78350f' : '#0a1a0f';
        ctx.beginPath();
        ctx.arc(hx + ho.w + 12, hy + ho.h / 2, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Green Municipal Park with Duck Pond, walking paths & tree groves in South-East
  const parkX = cx + 560;
  const parkY = cy + 320;
  const parkW = 240;
  const parkH = 180;
  // Lush park lawn
  ctx.fillStyle = isNoon ? '#16a34a' : isSunset ? '#9a3412' : '#064e3b';
  ctx.fillRect(parkX - parkW / 2, parkY - parkH / 2, parkW, parkH);

  // Central park duck pond
  ctx.fillStyle = isNoon ? '#0284c7' : isSunset ? '#c2410c' : '#0369a1';
  ctx.beginPath();
  ctx.ellipse(parkX, parkY, 60, 38, 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ca8a04';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Winding gravel walking path encircling the pond
  ctx.strokeStyle = isSunset ? '#78350f' : dark ? '#475569' : '#e2e8f0';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(parkX, parkY, 82, 54, 0.25, 0, Math.PI * 2);
  ctx.stroke();

  // Local High Street Commercial District with colorful shop awnings
  const shopX = cx - 440;
  const shopY = cy - 380;
  const awningColors = ['#dc2626', '#2563eb', '#16a34a', '#d97706', '#9333ea'];
  for (let s = 0; s < 5; s++) {
    const sx = shopX + s * 44;
    // Shop building
    ctx.fillStyle = isSunset ? '#451a03' : '#334155';
    ctx.fillRect(sx, shopY, 38, 32);
    // Striped storefront awning
    ctx.fillStyle = awningColors[s % awningColors.length];
    ctx.fillRect(sx - 2, shopY + 28, 42, 8);
    // Warm shop window glow at night
    if (dark) {
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(sx + 4, shopY + 8, 14, 14);
      ctx.fillRect(sx + 20, shopY + 8, 14, 14);
    }
  }

  // Winding cul-de-sac turnarounds on neighborhood street terminals
  const culDeSacs = [
    { x: left + 140, y: top + 130 },
    { x: left + w - 180, y: cy - 240 },
  ];
  for (const cds of culDeSacs) {
    ctx.fillStyle = roadColor;
    ctx.beginPath();
    ctx.arc(cds.x, cds.y, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = isNoon ? '#4d7c0f' : isSunset ? '#78350f' : '#111e14';
    ctx.beginPath();
    ctx.arc(cds.x, cds.y, 10, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * 4. Big City Aerial: Dense soaring skyscrapers, HVAC vents, helipads, expressways, elevated metro
 */
function drawAerialBigCity(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  w: number,
  h: number,
  cx: number,
  cy: number,
  dark: boolean,
  time: TimeOfDay
) {
  const isSunset = time === 'sunset' || time === 'dawn';

  // Base metropolitan asphalt & sidewalks
  ctx.fillStyle = dark ? '#0a0e17' : '#1e293b';
  ctx.fillRect(left, top, w, h);

  // 6-Lane Expressway slicing horizontally below stadium
  const expY = cy + 460;
  ctx.fillStyle = dark ? '#05070d' : '#0f172a';
  ctx.fillRect(left, expY - 45, w, 90);

  // Expressway divider & lane stripes
  ctx.fillStyle = '#facc15';
  ctx.fillRect(left, expY - 2, w, 4);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([16, 14]);
  ctx.beginPath();
  ctx.moveTo(left, expY - 22);
  ctx.lineTo(left + w, expY - 22);
  ctx.moveTo(left, expY + 22);
  ctx.lineTo(left + w, expY + 22);
  ctx.stroke();
  ctx.setLineDash([]);

  // Moving expressway traffic (night headlights and red taillights)
  if (dark) {
    for (let tx = left + 30; tx < left + w - 30; tx += 65) {
      // Eastbound white headlights
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(tx, expY - 25, 6, 3);
      // Westbound red taillights
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(tx + 25, expY + 20, 6, 3);
    }
  }

  // Elevated Metro Rail track line along North
  const railY = cy - 470;
  ctx.fillStyle = dark ? '#1c1917' : '#44403c';
  ctx.fillRect(left, railY - 14, w, 28);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(left, railY - 6, w, 3);
  ctx.fillRect(left, railY + 3, w, 3);

  // Elevated rail support pylons
  ctx.fillStyle = '#64748b';
  for (let px = left + 40; px < left + w; px += 110) {
    ctx.fillRect(px - 5, railY - 18, 10, 36);
  }

  // Illuminated Passenger Transit Train Sprites running on elevated rail
  const trainX = left + 320;
  // Train consists of 4 streamlined cars
  for (let c = 0; c < 4; c++) {
    const cxCar = trainX + c * 52;
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(cxCar, railY - 12, 48, 16);
    // Dark car base
    ctx.fillStyle = '#0284c7'; // Transit blue stripe
    ctx.fillRect(cxCar, railY + 2, 48, 3);
    // Illuminated passenger car windows
    ctx.fillStyle = dark ? '#fde047' : '#0f172a';
    for (let wx = cxCar + 6; wx < cxCar + 44; wx += 10) {
      ctx.fillRect(wx, railY - 8, 6, 6);
    }
  }

  // Glowing streetlights along avenues forming an illuminated street grid at night
  if (dark) {
    ctx.fillStyle = '#fef08a';
    for (let lx = left + 60; lx < left + w - 60; lx += 110) {
      ctx.beginPath();
      ctx.arc(lx, expY - 48, 3, 0, Math.PI * 2);
      ctx.arc(lx, expY + 48, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Skyscrapers & Commercial Towers surrounding stadium (Massive array of towers)
  const towerBlocks = [
    { x: left + 140, y: top + 120, w: 180, h: 140, color: isSunset ? '#451a03' : '#334155', hasHelipad: true },
    { x: left + 380, y: top + 100, w: 220, h: 150, color: isSunset ? '#292524' : '#1e293b', hasHelipad: false },
    { x: cx + 320, y: top + 110, w: 200, h: 160, color: isSunset ? '#57534e' : '#475569', hasHelipad: true },
    { x: cx + 580, y: top + 90, w: 190, h: 180, color: isSunset ? '#1c1917' : '#0f172a', hasHelipad: false },
    { x: left + 120, y: cy + 180, w: 170, h: 190, color: isSunset ? '#292524' : '#1e293b', hasHelipad: false },
    { x: cx + 420, y: cy + 180, w: 210, h: 200, color: isSunset ? '#451a03' : '#334155', hasHelipad: true },
    { x: left + 100, y: cy - 200, w: 160, h: 220, color: isSunset ? '#1c1917' : '#0f172a', hasHelipad: false },
    { x: cx + 640, y: cy - 180, w: 180, h: 240, color: isSunset ? '#3f3f46' : '#1e293b', hasHelipad: true },
  ];

  for (const tb of towerBlocks) {
    // Rooftop surface
    ctx.fillStyle = tb.color;
    ctx.fillRect(tb.x, tb.y, tb.w, tb.h);

    // Sunset golden specular reflections on skyscraper rooftops
    if (isSunset) {
      ctx.fillStyle = 'rgba(251, 146, 60, 0.35)';
      ctx.fillRect(tb.x, tb.y, tb.w * 0.45, tb.h);
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(tb.x, tb.y, tb.w, tb.h);
    }

    // Architectural parapet border
    ctx.strokeStyle = dark ? '#475569' : '#cbd5e1';
    ctx.lineWidth = 3;
    ctx.strokeRect(tb.x, tb.y, tb.w, tb.h);

    // Glowing office windows in skyscrapers at night
    if (dark) {
      ctx.fillStyle = '#fef08a';
      for (let wy = tb.y + 12; wy < tb.y + tb.h - 12; wy += 22) {
        for (let wx = tb.x + 12; wx < tb.x + tb.w - 12; wx += 24) {
          if ((wx * 3 + wy * 7) % 5 !== 0) {
            ctx.fillRect(wx, wy, 8, 8);
          }
        }
      }
    }

    // Industrial HVAC Chiller Units & Vents
    ctx.fillStyle = '#64748b';
    ctx.fillRect(tb.x + 18, tb.y + 16, 32, 22);
    ctx.fillRect(tb.x + 56, tb.y + 16, 22, 22);

    // Aircraft Hazard Warning Beacon Tower
    const beaconX = tb.x + tb.w - 20;
    const beaconY = tb.y + 20;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(beaconX, beaconY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Helipad (Circle with 'H')
    if (tb.hasHelipad) {
      const hx = tb.x + tb.w / 2;
      const hy = tb.y + tb.h / 2 + 10;
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(hx, hy, 26, 0, Math.PI * 2);
      ctx.stroke();

      // Yellow 'H'
      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('H', hx, hy);
    }
  }
}

/**
 * 5. Airport Aerial (Gibraltar style): Adjacent runway, threshold markings, hangars, control tower, airplanes
 */
function drawAerialAirport(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  w: number,
  h: number,
  cx: number,
  cy: number,
  dark: boolean,
  time: TimeOfDay
) {
  // Base airfield terrain
  ctx.fillStyle = dark ? (time === 'night' ? '#0f172a' : '#1e293b') : '#334155';
  ctx.fillRect(left, top, w, h);

  // Massive Tarmac Runway running horizontally along South touchline
  const runwayY = cy + 440;
  const runwayH = 150;
  ctx.fillStyle = dark ? '#020617' : '#1e293b';
  ctx.fillRect(left, runwayY - runwayH / 2, w, runwayH);

  // Runway Piano-Key Threshold Markings
  ctx.fillStyle = '#ffffff';
  for (let k = 0; k < 12; k++) {
    ctx.fillRect(left + 60, runwayY - 55 + k * 10, 50, 6);
    ctx.fillRect(left + w - 110, runwayY - 55 + k * 10, 50, 6);
  }

  // Runway Dashed Centerline
  ctx.fillStyle = '#facc15';
  for (let rx = left + 140; rx < left + w - 140; rx += 70) {
    ctx.fillRect(rx, runwayY - 3, 45, 6);
  }

  // Runway Edge Green & Cyan Navigation Lights
  for (let lx = left + 40; lx < left + w - 40; lx += 45) {
    ctx.fillStyle = dark ? '#22c55e' : '#15803d';
    ctx.fillRect(lx, runwayY - runwayH / 2 + 2, 4, 4);
    ctx.fillRect(lx, runwayY + runwayH / 2 - 6, 4, 4);
  }

  // Taxiways connecting to flight aprons
  ctx.fillStyle = dark ? '#0f172a' : '#334155';
  ctx.fillRect(cx - 180, cy + 220, 80, 160);
  ctx.fillRect(cx + 120, cy + 220, 80, 160);

  // Taxiway yellow centerlines with curve turnoffs
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 140, cy + 220);
  ctx.lineTo(cx - 140, runwayY);
  ctx.moveTo(cx + 160, cy + 220);
  ctx.lineTo(cx + 160, runwayY);
  ctx.stroke();

  // Commercial Jet Airplanes parked on flight apron
  const planes = [
    { x: cx - 440, y: cy + 300, angle: -0.2 },
    { x: cx + 380, y: cy + 290, angle: 0.15 },
  ];

  for (const pl of planes) {
    ctx.save();
    ctx.translate(pl.x, pl.y);
    ctx.rotate(pl.angle);

    // Fuselage
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(0, 0, 48, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wings
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(-10, -8);
    ctx.lineTo(8, -52);
    ctx.lineTo(24, -50);
    ctx.lineTo(14, -8);
    ctx.lineTo(14, 8);
    ctx.lineTo(24, 50);
    ctx.lineTo(8, 52);
    ctx.lineTo(-10, 8);
    ctx.closePath();
    ctx.fill();

    // Tail horizontal stabilizer
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(-42, -5);
    ctx.lineTo(-32, -22);
    ctx.lineTo(-24, -20);
    ctx.lineTo(-30, -5);
    ctx.lineTo(-30, 5);
    ctx.lineTo(-24, 20);
    ctx.lineTo(-32, 22);
    ctx.lineTo(-42, 5);
    ctx.closePath();
    ctx.fill();

    // Jet engines
    ctx.fillStyle = '#64748b';
    ctx.fillRect(0, -28, 14, 6);
    ctx.fillRect(0, 22, 14, 6);

    ctx.restore();
  }

  // Air Traffic Control Tower & Radar Dome in North-West
  const towerX = cx - 480;
  const towerY = cy - 380;
  ctx.fillStyle = dark ? '#334155' : '#94a3b8';
  ctx.beginPath();
  ctx.arc(towerX, towerY, 32, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0284c7'; // Glass observation circle
  ctx.beginPath();
  ctx.arc(towerX, towerY, 20, 0, Math.PI * 2);
  ctx.fill();
  // Flashing red hazard beacon
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(towerX, towerY, 5, 0, Math.PI * 2);
  ctx.fill();

  // Rotating Radar Surveillance Beam Cone
  ctx.save();
  const sweepAngle = (Date.now() * 0.0015) % (Math.PI * 2);
  const radarRadius = 140;
  const beamGradient = ctx.createRadialGradient(towerX, towerY, 10, towerX, towerY, radarRadius);
  beamGradient.addColorStop(0, 'rgba(34, 197, 94, 0.55)');
  beamGradient.addColorStop(0.5, 'rgba(34, 197, 94, 0.25)');
  beamGradient.addColorStop(1, 'rgba(34, 197, 94, 0)');
  ctx.fillStyle = beamGradient;
  ctx.beginPath();
  ctx.moveTo(towerX, towerY);
  ctx.arc(towerX, towerY, radarRadius, sweepAngle, sweepAngle + 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Cargo Freight Terminal Depot Warehouse with loading dock bays in North-East
  const cargoX = cx + 520;
  const cargoY = cy - 360;
  const cargoW = 160;
  const cargoH = 80;
  ctx.fillStyle = dark ? '#1e293b' : '#475569';
  ctx.fillRect(cargoX, cargoY, cargoW, cargoH);
  ctx.strokeStyle = dark ? '#334155' : '#94a3b8';
  ctx.lineWidth = 2;
  ctx.strokeRect(cargoX, cargoY, cargoW, cargoH);

  // Loading dock door bays
  for (let dx = cargoX + 16; dx < cargoX + cargoW - 16; dx += 28) {
    ctx.fillStyle = dark ? '#0f172a' : '#1e293b';
    ctx.fillRect(dx, cargoY + cargoH - 14, 20, 14);
    // Yellow baggage tug trailer
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(dx + 2, cargoY + cargoH + 6, 16, 8);
  }
}

/**
 * 6. Railroad Aerial: Switching tracks, ballast gravel, train sheds, freight cars, moving locomotive
 */
function drawAerialRailroad(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  w: number,
  h: number,
  cx: number,
  cy: number,
  dark: boolean,
  time: TimeOfDay
) {
  // Base gravel and ballast ground
  ctx.fillStyle = dark ? (time === 'night' ? '#1c1917' : '#292524') : '#44403c';
  ctx.fillRect(left, top, w, h);

  // Massive Multi-Track Rail Corridor along North
  const railCenterY = cy - 420;
  const numTracks = 6;
  const trackSpacing = 24;

  for (let t = 0; t < numTracks; t++) {
    const ty = railCenterY - ((numTracks - 1) * trackSpacing) / 2 + t * trackSpacing;

    // Gravel ballast bed
    ctx.fillStyle = dark ? '#1c1917' : '#57534e';
    ctx.fillRect(left, ty - 10, w, 20);

    // Wooden cross ties / sleepers
    ctx.fillStyle = '#292524';
    for (let rx = left; rx < left + w; rx += 14) {
      ctx.fillRect(rx, ty - 9, 5, 18);
    }

    // Parallel steel rail lines
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(left, ty - 6, w, 2);
    ctx.fillRect(left, ty + 4, w, 2);
  }

  // Freight Train strings on tracks 1, 3, 5
  const trainColors = ['#b91c1c', '#1d4ed8', '#f59e0b', '#047857', '#6b7280'];
  for (let tr = 0; tr < 3; tr++) {
    const trackIdx = tr * 2;
    const ty = railCenterY - ((numTracks - 1) * trackSpacing) / 2 + trackIdx * trackSpacing;
    const startX = left + 180 + tr * 240;

    // String of 5 freight boxcars
    for (let c = 0; c < 5; c++) {
      const bx = startX + c * 52;
      const color = trainColors[(tr * 3 + c) % trainColors.length];
      ctx.fillStyle = color;
      ctx.fillRect(bx, ty - 7, 48, 14);

      // Boxcar corrugated roof ribs
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      for (let rib = bx + 6; rib < bx + 44; rib += 8) {
        ctx.fillRect(rib, ty - 7, 2, 14);
      }
    }

    // Lead Diesel Locomotive Engine
    const locoX = startX + 5 * 52;
    ctx.fillStyle = '#facc15'; // Heavy industrial yellow locomotive
    ctx.fillRect(locoX, ty - 8, 56, 16);
    ctx.fillStyle = '#0f172a'; // Windshield & cab
    ctx.fillRect(locoX + 38, ty - 6, 12, 12);
    // Headlight glow
    if (dark) {
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(locoX + 54, ty - 3, 4, 6);
    }
  }

  // Steel Electrification Gantries spanning across tracks every 220px
  for (let gx = left + 120; gx < left + w - 120; gx += 220) {
    ctx.fillStyle = '#64748b';
    ctx.fillRect(gx - 4, railCenterY - 85, 8, 170);
  }

  // Locomotive Turntable (circular pit with rotating bridge track) in the western quadrant
  const turnX = cx - 560;
  const turnY = railCenterY + 140;
  const turnR = 64;
  ctx.fillStyle = dark ? '#0f172a' : '#292524';
  ctx.beginPath();
  ctx.arc(turnX, turnY, turnR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Turntable center pivot & rotating bridge deck
  ctx.fillStyle = '#facc15'; // Yellow safety walkway
  ctx.save();
  ctx.translate(turnX, turnY);
  ctx.rotate(0.45);
  ctx.fillRect(-turnR + 4, -8, (turnR - 4) * 2, 16);
  ctx.fillStyle = '#0f172a'; // Bridge track rails
  ctx.fillRect(-turnR + 4, -4, (turnR - 4) * 2, 2);
  ctx.fillRect(-turnR + 4, 2, (turnR - 4) * 2, 2);
  ctx.restore();

  // Heavy Industrial Container Crane Gantries straddling multiple tracks
  const craneX = cx + 480;
  ctx.fillStyle = '#eab308'; // Safety yellow gantry
  // Left and right vertical gantry towers
  ctx.fillRect(craneX - 32, railCenterY - 95, 8, 190);
  ctx.fillRect(craneX + 24, railCenterY - 95, 8, 190);
  // Overhead horizontal crane beam
  ctx.fillRect(craneX - 36, railCenterY - 105, 72, 14);
  // Hoist trolley & spreader bar
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(craneX - 10, railCenterY - 40, 20, 10);
}

/**
 * 7. Beach Aerial: Golden sandy shoreline, turquoise coastal surf, blue ocean, palm trees, cabanas
 */
function drawAerialBeach(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  w: number,
  h: number,
  cx: number,
  cy: number,
  dark: boolean,
  time: TimeOfDay
) {
  // Base green coastal land
  ctx.fillStyle = dark ? (time === 'night' ? '#142817' : '#1e381f') : '#4d7c0f';
  ctx.fillRect(left, top, w, h);

  // Shoreline curve (starts along top/east, sweeping diagonally)
  const coastPoints = [
    { x: left, y: cy - 280 },
    { x: cx - 200, y: cy - 310 },
    { x: cx + 300, y: cy - 240 },
    { x: left + w, y: cy - 180 },
  ];

  // Deep Azure Ocean Water
  const oceanGrad = ctx.createLinearGradient(0, top, 0, cy - 200);
  oceanGrad.addColorStop(0, dark ? '#041d38' : '#0369a1');
  oceanGrad.addColorStop(1, dark ? '#083344' : '#06b6d4');

  ctx.fillStyle = oceanGrad;
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left + w, top);
  ctx.lineTo(left + w, cy - 180);
  ctx.bezierCurveTo(cx + 300, cy - 240, cx - 200, cy - 310, left, cy - 280);
  ctx.closePath();
  ctx.fill();

  // White Foaming Surf Line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(left, cy - 280);
  ctx.bezierCurveTo(cx - 200, cy - 310, cx + 300, cy - 240, left + w, cy - 180);
  ctx.stroke();

  // Golden Sand Beach Band
  ctx.strokeStyle = dark ? '#78350f' : '#fde047';
  ctx.lineWidth = 48;
  ctx.beginPath();
  ctx.moveTo(left, cy - 250);
  ctx.bezierCurveTo(cx - 200, cy - 280, cx + 300, cy - 210, left + w, cy - 150);
  ctx.stroke();

  // Beachside Boardwalk & Promenade
  ctx.strokeStyle = dark ? '#292524' : '#e2e8f0';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(left, cy - 215);
  ctx.bezierCurveTo(cx - 200, cy - 245, cx + 300, cy - 175, left + w, cy - 115);
  ctx.stroke();

  // Coastal Palm Tree Boulevard
  ctx.fillStyle = dark ? '#0f291e' : '#15803d';
  for (let px = left + 40; px < left + w - 40; px += 55) {
    const py = cy - 215 + Math.sin(px * 0.005) * 45;
    ctx.beginPath();
    ctx.arc(px, py - 18, 9, 0, Math.PI * 2);
    ctx.fill();
  }

  // Colorful Beach Umbrellas & Sun Loungers
  const umbrellaColors = ['#ef4444', '#3b82f6', '#f59e0b', '#10b981', '#ec4899'];
  for (let ux = left + 60; ux < left + w - 60; ux += 45) {
    const uy = cy - 255 + Math.sin(ux * 0.005) * 45;
    ctx.fillStyle = umbrellaColors[ux % umbrellaColors.length];
    ctx.beginPath();
    ctx.arc(ux, uy, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Marina Slips and Wooden Pier extending into the azure bay in East
  const pierX = cx + 580;
  const pierY = cy - 260;
  // Wooden pier structure
  ctx.fillStyle = '#78350f';
  ctx.fillRect(pierX - 8, pierY - 90, 16, 120);
  ctx.strokeStyle = '#451a03';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(pierX - 8, pierY - 90, 16, 120);

  // 3 Moored Leisure Yachts along pier
  for (let yIdx = 0; yIdx < 3; yIdx++) {
    const yBoatX = pierX + (yIdx % 2 === 0 ? 18 : -18);
    const yBoatY = pierY - 70 + yIdx * 32;
    // Boat hull
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(yBoatX, yBoatY - 14);
    ctx.lineTo(yBoatX + 6, yBoatY + 12);
    ctx.lineTo(yBoatX - 6, yBoatY + 12);
    ctx.closePath();
    ctx.fill();
    // Blue glass cabin
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(yBoatX - 3, yBoatY - 4, 6, 8);
  }
}

/**
 * 8. Marine Floating Aerial: Deep 360-degree ocean expanse, pontoons, breakwaters, docks, yachts, buoys
 */
function drawAerialMarineFloating(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  w: number,
  h: number,
  cx: number,
  cy: number,
  dark: boolean,
  time: TimeOfDay
) {
  // Deep 360-Degree Ocean Water Expanse
  const oceanGrad = ctx.createRadialGradient(cx, cy, 100, cx, cy, Math.max(w, h) * 0.85);
  oceanGrad.addColorStop(0, dark ? '#082f49' : '#0284c7');
  oceanGrad.addColorStop(1, dark ? '#02131e' : '#075985');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(left, top, w, h);

  // Animated procedural wave ripples in water
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 1.5;
  for (let wy = top + 40; wy < top + h - 40; wy += 38) {
    ctx.beginPath();
    for (let wx = left + 30; wx < left + w - 30; wx += 40) {
      const off = Math.sin((wx + wy * 3) * 0.04) * 4;
      if (wx === left + 30) ctx.moveTo(wx, wy + off);
      else ctx.lineTo(wx, wy + off);
    }
    ctx.stroke();
  }

  // Heavy Marine Steel Pontoons & Breakwaters enclosing the stadium platform
  ctx.fillStyle = dark ? '#334155' : '#64748b';
  // Outer perimeter breakwater ring
  ctx.beginPath();
  ctx.ellipse(cx, cy, 560, 440, 0, 0, Math.PI * 2);
  ctx.ellipse(cx, cy, 520, 400, 0, 0, Math.PI * 2, true); // Donut cutout
  ctx.fill();

  // 4 Radial Access Piers extending out into open ocean
  const pierW = 28;
  ctx.fillStyle = dark ? '#1e293b' : '#94a3b8';
  ctx.fillRect(cx - 560, cy - pierW / 2, -180, pierW); // West dock
  ctx.fillRect(cx + 560, cy - pierW / 2, 180, pierW); // East dock
  ctx.fillRect(cx - pierW / 2, cy - 440, pierW, -160); // North dock
  ctx.fillRect(cx - pierW / 2, cy + 440, pierW, 160); // South dock

  // Leisure Yachts and Speedboats moored along the perimeter piers
  for (let b = 0; b < 6; b++) {
    const angle = (b * Math.PI) / 3;
    const bx = cx + Math.cos(angle) * 600;
    const by = cy + Math.sin(angle) * 480;

    // Yacht hull
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(angle + Math.PI / 2);
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(8, 14);
    ctx.lineTo(-8, 14);
    ctx.closePath();
    ctx.fill();
    // Cabin
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(-4, -6, 8, 12);
    ctx.restore();
  }

  // Mooring Buoys bobbing in water (high-vis orange)
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 5) {
    const buoyX = cx + Math.cos(angle) * 660;
    const buoyY = cy + Math.sin(angle) * 540;
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.arc(buoyX, buoyY, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}
