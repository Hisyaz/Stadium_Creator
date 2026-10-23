/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PITCH_CONFIG, HOME_KIT, AWAY_KIT } from './constants';
import { StadiumTier, TimeOfDay, TeamKit, GraphicsSettings } from '../types';
import {
  StadiumDefinition,
  DugoutConfig,
  EntranceTunnelConfig,
  SurroundingsType,
  BenchType,
  TunnelType,
  StandConfig,
  StandGrade,
  StadiumShape,
  NoStandBackdrop,
  ApronMaterial,
} from '../types/stadium';

/**
 * Safe Canvas 2D ellipse helper with fallback for environments lacking ctx.ellipse
 */
export function drawSafeEllipse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  rotation: number = 0,
  startAngle: number = 0,
  endAngle: number = Math.PI * 2
) {
  if (typeof ctx.ellipse === 'function') {
    ctx.ellipse(x, y, rx, ry, rotation, startAngle, endAngle);
  } else if (typeof ctx.arc === 'function') {
    if (typeof ctx.translate === 'function' && typeof ctx.scale === 'function') {
      if (typeof ctx.save === 'function') ctx.save();
      ctx.translate(x, y);
      if (rotation !== 0 && typeof ctx.rotate === 'function') ctx.rotate(rotation);
      ctx.scale(rx / Math.max(1, ry), 1);
      ctx.arc(0, 0, ry, startAngle, endAngle);
      if (typeof ctx.restore === 'function') ctx.restore();
    } else {
      ctx.arc(x, y, (rx + ry) / 2, startAngle, endAngle);
    }
  }
}

/**
 * Procedural sky and horizon atmospheric color schemes for each time of day
 */
interface SkyPalette {
  top: string;
  mid: string;
  horizon: string;
  groundFog: string;
  ambientLight: string;
  sunColor: string;
  sunGlow: string;
  hasStars: boolean;
  cloudColor: string;
  cloudShadow: string;
}

const SKY_PALETTES: Record<TimeOfDay, SkyPalette> = {
  dawn: {
    top: '#181136',
    mid: '#432354',
    horizon: '#e07a5f',
    groundFog: 'rgba(235, 148, 120, 0.22)',
    ambientLight: 'rgba(255, 200, 160, 0.15)',
    sunColor: '#ffe5a3',
    sunGlow: 'rgba(255, 180, 100, 0.35)',
    hasStars: true,
    cloudColor: 'rgba(255, 200, 180, 0.45)',
    cloudShadow: 'rgba(80, 40, 70, 0.4)',
  },
  noon: {
    top: '#1565c0',
    mid: '#388e3c', // soft transition towards bright horizon
    horizon: '#90caf9',
    groundFog: 'rgba(255, 255, 255, 0.08)',
    ambientLight: 'rgba(255, 255, 255, 0.12)',
    sunColor: '#fff9c4',
    sunGlow: 'rgba(255, 255, 200, 0.4)',
    hasStars: false,
    cloudColor: 'rgba(255, 255, 255, 0.85)',
    cloudShadow: 'rgba(180, 200, 220, 0.45)',
  },
  sunset: {
    top: '#240046',
    mid: '#7b2cbf',
    horizon: '#ff7b00',
    groundFog: 'rgba(255, 120, 40, 0.25)',
    ambientLight: 'rgba(255, 140, 60, 0.2)',
    sunColor: '#ffea00',
    sunGlow: 'rgba(255, 100, 30, 0.55)',
    hasStars: true,
    cloudColor: 'rgba(255, 140, 100, 0.65)',
    cloudShadow: 'rgba(90, 20, 80, 0.5)',
  },
  night: {
    top: '#050a18',
    mid: '#0d1830',
    horizon: '#142444',
    groundFog: 'rgba(15, 30, 60, 0.35)',
    ambientLight: 'rgba(100, 150, 255, 0.08)',
    sunColor: '#e2e8f0', // Moon
    sunGlow: 'rgba(200, 225, 255, 0.25)',
    hasStars: true,
    cloudColor: 'rgba(30, 45, 75, 0.45)',
    cloudShadow: 'rgba(10, 15, 30, 0.6)',
  },
};

/**
 * Renders the full procedural perimeter horizon, skybox, city skyline,
 * and outer architectural structures behind the stadium.
 */
export function drawPerimeterHorizon(
  ctx: CanvasRenderingContext2D,
  cameraX: number,
  cameraY: number,
  stadiumTier: StadiumTier = 'monumental',
  timeOfDay: TimeOfDay = 'night',
  graphicsSettings?: GraphicsSettings,
  surroundings?: SurroundingsType
) {
  const cx = PITCH_CONFIG.CENTER_X;
  const cy = PITCH_CONFIG.CENTER_Y;

  // Parallax offsets (subtle realistic camera shift)
  const pX = (cameraX - cx) * 0.12;
  const pY = (cameraY - cy) * 0.08;

  const bgLeft = PITCH_CONFIG.PITCH_LEFT - 1500;
  const bgTop = PITCH_CONFIG.PITCH_TOP - 1300;
  const bgWidth = PITCH_CONFIG.FIELD_WIDTH + 3000;
  const skyHeight = PITCH_CONFIG.PITCH_TOP - bgTop + 140;

  const sky = SKY_PALETTES[timeOfDay] || SKY_PALETTES.night;

  ctx.save();

  // 1. ATMOSPHERIC SKYBOX GRADIENT
  const skyGrad = ctx.createLinearGradient(0, bgTop, 0, PITCH_CONFIG.PITCH_TOP - 220);
  skyGrad.addColorStop(0, sky.top);
  skyGrad.addColorStop(0.55, sky.mid);
  skyGrad.addColorStop(1, sky.horizon);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(bgLeft, bgTop, bgWidth, skyHeight);

  // 2. CELESTIAL BODY (Sun or Moon)
  const sunX = cx + (timeOfDay === 'sunset' ? 420 : timeOfDay === 'dawn' ? -420 : 120) - pX * 0.15;
  const sunY = bgTop + (timeOfDay === 'noon' ? 90 : 160) - pY * 0.1;
  const sunRadius = timeOfDay === 'noon' ? 24 : 28;

  // Sun / Moon radial halo
  const sunGlow = ctx.createRadialGradient(sunX, sunY, sunRadius * 0.6, sunX, sunY, sunRadius * 4.2);
  sunGlow.addColorStop(0, sky.sunGlow);
  sunGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = sunGlow;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunRadius * 4.2, 0, Math.PI * 2);
  ctx.fill();

  // Sun / Moon solid core
  ctx.fillStyle = sky.sunColor;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
  ctx.fill();

  // 3. TWINKLING STARS & CLOUDS
  if (sky.hasStars) {
    ctx.fillStyle = timeOfDay === 'night' ? 'rgba(255, 255, 255, 0.75)' : 'rgba(255, 240, 200, 0.35)';
    for (let sx = bgLeft + 40; sx < bgLeft + bgWidth - 40; sx += 140) {
      const starY = bgTop + 30 + ((sx * 17) % 220);
      const size = ((sx * 7) % 3 === 0) ? 2 : 1;
      ctx.fillRect(sx - pX * 0.05, starY - pY * 0.05, size, size);
    }
  }

  // Drifting clouds (procedural pixel puffs)
  drawProceduralClouds(ctx, bgLeft, bgTop, bgWidth, pX, pY, sky);

  // 4. ARCHITECTURAL PERIMETER HORIZON BASED ON SURROUNDINGS OR STADIUM TIER
  const horizonBaseY = PITCH_CONFIG.PITCH_TOP - 280 - pY * 0.45;

  if (surroundings === 'airport') {
    drawAirportHorizon(ctx, bgLeft, bgWidth, horizonBaseY, pX, timeOfDay);
  } else if (surroundings === 'marine_floating') {
    drawMarineFloatingHorizon(ctx, bgLeft, bgWidth, horizonBaseY, pX, timeOfDay);
  } else if (surroundings === 'railroad') {
    drawRailroadHorizon(ctx, bgLeft, bgWidth, horizonBaseY, pX, timeOfDay);
  } else if (surroundings === 'beach') {
    drawBeachHorizon(ctx, bgLeft, bgWidth, horizonBaseY, pX, timeOfDay);
  } else if (surroundings === 'mountains') {
    drawMountainsHorizon(ctx, bgLeft, bgWidth, horizonBaseY, pX, timeOfDay);
  } else if (surroundings === 'forest') {
    drawForestHorizon(ctx, bgLeft, bgWidth, horizonBaseY, pX, timeOfDay);
  } else if (surroundings === 'savannah') {
    drawSavannahHorizon(ctx, bgLeft, bgWidth, horizonBaseY, pX, timeOfDay);
  } else if (surroundings === 'highway') {
    drawHighwayHorizon(ctx, bgLeft, bgWidth, horizonBaseY, pX, timeOfDay);
  } else if (surroundings === 'nature') {
    drawMountainsHorizon(ctx, bgLeft, bgWidth, horizonBaseY, pX, timeOfDay);
  } else if (surroundings === 'parking_lot') {
    drawParkingLotHorizon(ctx, bgLeft, bgWidth, horizonBaseY, pX, timeOfDay);
  } else if (surroundings === 'big_city' || stadiumTier === 'monumental') {
    // 🌆 ELITE METROPOLIS SKYLINE (Towering skyscrapers & communication spires)
    drawMonumentalCitySkyline(ctx, bgLeft, bgWidth, horizonBaseY, pX, timeOfDay);
  } else if (surroundings === 'small_city' || stadiumTier === 'craven') {
    // 🏘️ HISTORIC ENGLISH / SMALL TOWN HORIZON (Town hall, few commercial buildings & 2-story pitched terracotta houses)
    drawSmallCityHorizon(ctx, bgLeft, bgWidth, horizonBaseY, pX, timeOfDay);
  } else {
    // 🏭 ASCENSO MUNICIPAL HORIZON
    drawAscensoSurroundings(ctx, bgLeft, bgWidth, horizonBaseY, pX, timeOfDay);
  }

  // Atmospheric Ground Mist / Horizon Blend
  const fogGrad = ctx.createLinearGradient(0, horizonBaseY - 60, 0, PITCH_CONFIG.PITCH_TOP - 160);
  fogGrad.addColorStop(0, 'rgba(0,0,0,0)');
  fogGrad.addColorStop(1, sky.groundFog);
  ctx.fillStyle = fogGrad;
  ctx.fillRect(bgLeft, horizonBaseY - 60, bgWidth, 180);

  ctx.restore();
}

/**
 * Draws procedural pixel cloud clusters across the upper sky
 */
function drawProceduralClouds(
  ctx: CanvasRenderingContext2D,
  bgLeft: number,
  bgTop: number,
  bgWidth: number,
  pX: number,
  pY: number,
  sky: SkyPalette
) {
  const cloudBands = [
    { x: bgLeft + 180, y: bgTop + 85, w: 190, h: 22 },
    { x: bgLeft + 640, y: bgTop + 130, w: 260, h: 28 },
    { x: bgLeft + 1200, y: bgTop + 70, w: 220, h: 24 },
    { x: bgLeft + 1750, y: bgTop + 120, w: 290, h: 32 },
    { x: bgLeft + 2350, y: bgTop + 95, w: 210, h: 26 },
  ];

  for (const c of cloudBands) {
    const cx = c.x - pX * 0.12;
    const cy = c.y - pY * 0.08;

    // Cloud shadow underside
    ctx.fillStyle = sky.cloudShadow;
    ctx.fillRect(cx + 6, cy + 10, c.w - 12, c.h - 8);

    // Main cloud puff body
    ctx.fillStyle = sky.cloudColor;
    ctx.fillRect(cx, cy, c.w, c.h - 6);
    // Upper billows
    ctx.fillRect(cx + 25, cy - 8, c.w * 0.45, 8);
    ctx.fillRect(cx + c.w * 0.4, cy - 12, c.w * 0.38, 12);
  }
}

/**
 * Airport Surroundings (Gibraltar Victoria Stadium style)
 * Tarmac runway, taxiway markings, green/white runway edge lights, flight hangars & taxiing aircraft
 */
function drawAirportHorizon(
  ctx: CanvasRenderingContext2D,
  bgLeft: number,
  bgWidth: number,
  horizonY: number,
  pX: number,
  timeOfDay: TimeOfDay
) {
  const isNight = timeOfDay === 'night' || timeOfDay === 'sunset' || timeOfDay === 'dawn';

  // Flat runway tarmac base
  ctx.fillStyle = isNight ? '#0f172a' : '#334155';
  ctx.fillRect(bgLeft, horizonY - 45, bgWidth, 65);

  // Runway yellow & white dashed centerline
  ctx.fillStyle = '#facc15';
  for (let rx = bgLeft + 40; rx < bgLeft + bgWidth - 40; rx += 55) {
    ctx.fillRect(rx - pX * 0.35, horizonY - 18, 28, 4);
  }

  // Runway Edge Green & Cyan Navigation Lights
  for (let lx = bgLeft + 20; lx < bgLeft + bgWidth - 20; lx += 40) {
    const lightX = lx - pX * 0.35;
    ctx.fillStyle = isNight ? '#22c55e' : '#15803d';
    ctx.fillRect(lightX, horizonY - 42, 3, 3);
    ctx.fillRect(lightX, horizonY + 12, 3, 3);
  }

  // Flight Hangars & Control Tower every 450px
  for (let hx = bgLeft + 160; hx < bgLeft + bgWidth - 200; hx += 420) {
    const hangX = hx - pX * 0.4;
    // Arched curved hangar
    ctx.fillStyle = isNight ? '#1e293b' : '#64748b';
    ctx.beginPath();
    ctx.arc(hangX + 45, horizonY - 20, 36, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(hangX + 25, horizonY - 20, 40, 20); // Open hangar door

    // Air Traffic Control Tower with flashing beacon
    const towerX = hangX + 115;
    ctx.fillStyle = isNight ? '#334155' : '#94a3b8';
    ctx.fillRect(towerX - 6, horizonY - 75, 12, 75);
    ctx.fillStyle = '#0284c7'; // Glass observation cab
    ctx.fillRect(towerX - 12, horizonY - 88, 24, 14);
    ctx.fillStyle = '#ef4444'; // Red beacon
    ctx.fillRect(towerX - 2, horizonY - 92, 4, 4);
  }

  // Retro Taxiing Commercial Aircraft Sprite
  const planeX = bgLeft + 380 - pX * 0.28;
  const planeY = horizonY - 32;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(planeX, planeY, 48, 12); // Fuselage
  ctx.fillStyle = '#3b82f6'; // Tailfin
  ctx.beginPath();
  ctx.moveTo(planeX + 40, planeY);
  ctx.lineTo(planeX + 50, planeY - 16);
  ctx.lineTo(planeX + 44, planeY);
  ctx.fill();
  ctx.fillStyle = '#94a3b8'; // Wing
  ctx.fillRect(planeX + 18, planeY + 8, 22, 5);
}

/**
 * Marine Floating Stadium Surroundings (Ocean, Pontoons, Buoys, Yachts)
 */
function drawMarineFloatingHorizon(
  ctx: CanvasRenderingContext2D,
  bgLeft: number,
  bgWidth: number,
  horizonY: number,
  pX: number,
  timeOfDay: TimeOfDay
) {
  const isNight = timeOfDay === 'night' || timeOfDay === 'sunset';

  // Deep open ocean water gradient
  const waterGrad = ctx.createLinearGradient(0, horizonY - 60, 0, horizonY + 40);
  waterGrad.addColorStop(0, isNight ? '#082f49' : '#0369a1');
  waterGrad.addColorStop(1, isNight ? '#0c4a6e' : '#0284c7');
  ctx.fillStyle = waterGrad;
  ctx.fillRect(bgLeft, horizonY - 60, bgWidth, 90);

  // Animated procedural wave ripples
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1.5;
  for (let wy = horizonY - 45; wy < horizonY + 20; wy += 12) {
    ctx.beginPath();
    for (let wx = bgLeft; wx < bgLeft + bgWidth; wx += 30) {
      const off = Math.sin((wx + wy * 4 - pX * 2) * 0.05) * 2.5;
      if (wx === bgLeft) ctx.moveTo(wx, wy + off);
      else ctx.lineTo(wx, wy + off);
    }
    ctx.stroke();
  }

  // Floating Marina Pontoons & Leisure Boats
  for (let bx = bgLeft + 120; bx < bgLeft + bgWidth - 100; bx += 260) {
    const boatX = bx - pX * 0.32;
    // White boat hull
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(boatX, horizonY - 10);
    ctx.lineTo(boatX + 34, horizonY - 10);
    ctx.lineTo(boatX + 28, horizonY - 2);
    ctx.lineTo(boatX + 4, horizonY - 2);
    ctx.closePath();
    ctx.fill();
    // Mast & cabin
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(boatX + 12, horizonY - 18, 10, 8);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(boatX + 16, horizonY - 32, 2, 14);

    // Orange mooring buoy bobbing
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(boatX + 48, horizonY - 4, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Railroad Surroundings (Tracks, Gantries, Locomotives)
 */
function drawRailroadHorizon(
  ctx: CanvasRenderingContext2D,
  bgLeft: number,
  bgWidth: number,
  horizonY: number,
  pX: number,
  timeOfDay: TimeOfDay
) {
  const isNight = timeOfDay === 'night' || timeOfDay === 'sunset';

  // Ballast gravel corridor
  ctx.fillStyle = isNight ? '#1c1917' : '#44403c';
  ctx.fillRect(bgLeft, horizonY - 45, bgWidth, 65);

  // Parallel steel rails
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(bgLeft, horizonY - 28, bgWidth, 2);
  ctx.fillRect(bgLeft, horizonY - 20, bgWidth, 2);
  ctx.fillRect(bgLeft, horizonY - 6, bgWidth, 2);
  ctx.fillRect(bgLeft, horizonY + 2, bgWidth, 2);

  // Wooden sleepers / rail ties
  ctx.fillStyle = '#292524';
  for (let rx = bgLeft; rx < bgLeft + bgWidth; rx += 12) {
    ctx.fillRect(rx - pX * 0.35, horizonY - 30, 4, 13);
    ctx.fillRect(rx - pX * 0.35, horizonY - 8, 4, 13);
  }

  // Steel overhead electrification gantries every 180px
  for (let gx = bgLeft + 80; gx < bgLeft + bgWidth - 80; gx += 200) {
    const gantryX = gx - pX * 0.4;
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.strokeRect(gantryX, horizonY - 60, 45, 60);
    // Warning yellow diagonal stripes
    ctx.fillStyle = '#facc15';
    ctx.fillRect(gantryX + 2, horizonY - 58, 41, 4);
  }

  // Freight Train Boxcars
  for (let tx = bgLeft + 220; tx < bgLeft + bgWidth - 300; tx += 480) {
    const trainX = tx - pX * 0.35;
    ctx.fillStyle = '#b91c1c'; // Red freight car
    ctx.fillRect(trainX, horizonY - 38, 70, 22);
    ctx.fillStyle = '#1e3a8a'; // Blue freight car
    ctx.fillRect(trainX + 74, horizonY - 38, 70, 22);
  }
}

/**
 * Beach / Coastal Surroundings (Sand, Palm Trees, Turquoise Water)
 */
function drawBeachHorizon(
  ctx: CanvasRenderingContext2D,
  bgLeft: number,
  bgWidth: number,
  horizonY: number,
  pX: number,
  timeOfDay: TimeOfDay
) {
  const isNight = timeOfDay === 'night' || timeOfDay === 'sunset';

  // Turquoise ocean stripe
  ctx.fillStyle = isNight ? '#0369a1' : '#06b6d4';
  ctx.fillRect(bgLeft, horizonY - 55, bgWidth, 40);

  // Sandy golden beach
  ctx.fillStyle = isNight ? '#78350f' : '#fde047';
  ctx.fillRect(bgLeft, horizonY - 18, bgWidth, 38);

  // Palm trees along seaside promenade
  for (let px = bgLeft + 90; px < bgLeft + bgWidth - 90; px += 140) {
    const palmX = px - pX * 0.4;
    // Curved trunk
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(palmX, horizonY + 12);
    ctx.quadraticCurveTo(palmX + 8, horizonY - 20, palmX + 4, horizonY - 48);
    ctx.stroke();

    // Palm fronds (green leaf star)
    ctx.fillStyle = '#15803d';
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 3) {
      const lx = palmX + 4 + Math.cos(angle) * 16;
      const ly = horizonY - 48 + Math.sin(angle) * 9;
      ctx.beginPath();
      ctx.arc(lx, ly, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * Mountains Surroundings:
 * Layered rolling green mountains and craggy peaks, alpine meadows, and rustic chalets
 * 3 Time-of-day variants: Noon (vibrant green & azure), Sunset (red/orange warm alpine glow), Night (moonlit ridges & lit chalets)
 */
function drawMountainsHorizon(
  ctx: CanvasRenderingContext2D,
  bgLeft: number,
  bgWidth: number,
  horizonY: number,
  pX: number,
  timeOfDay: TimeOfDay
) {
  const isNight = timeOfDay === 'night';
  const isSunset = timeOfDay === 'sunset';

  // 1. Far Mountain Ridges (Deep blue-slate / violet sunset / obsidian night)
  const farMountainColor = isNight ? '#0b132b' : isSunset ? '#4a154b' : '#2d4a3e';
  ctx.fillStyle = farMountainColor;
  for (let mx = bgLeft - 100; mx < bgLeft + bgWidth + 100; mx += 220) {
    const mountainX = mx - pX * 0.15;
    const peakH = 140 + ((mx * 31) % 65);
    ctx.beginPath();
    ctx.moveTo(mountainX - 140, horizonY);
    ctx.lineTo(mountainX + 20, horizonY - peakH);
    ctx.lineTo(mountainX + 170, horizonY);
    ctx.closePath();
    ctx.fill();

    // Snow & rocky crest highlight
    ctx.fillStyle = isNight ? 'rgba(180, 210, 240, 0.25)' : isSunset ? '#ffb4a2' : '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(mountainX + 4, horizonY - peakH + 30);
    ctx.lineTo(mountainX + 20, horizonY - peakH);
    ctx.lineTo(mountainX + 38, horizonY - peakH + 30);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = farMountainColor;
  }

  // 2. Mid Green Mountains (Lush rolling alpine slopes)
  const midMountainColor = isNight ? '#0f241d' : isSunset ? '#6b2d2f' : '#22543d';
  ctx.fillStyle = midMountainColor;
  for (let mx = bgLeft; mx < bgLeft + bgWidth + 80; mx += 160) {
    const mountainX = mx - pX * 0.28;
    const slopeH = 85 + ((mx * 19) % 45);
    ctx.beginPath();
    ctx.moveTo(mountainX - 110, horizonY);
    ctx.lineTo(mountainX + 10, horizonY - slopeH);
    ctx.lineTo(mountainX + 120, horizonY);
    ctx.closePath();
    ctx.fill();
  }

  // 3. Alpine Pine Treeline on lower slopes
  ctx.fillStyle = isNight ? '#051b14' : isSunset ? '#2e1814' : '#14532d';
  for (let tx = bgLeft; tx < bgLeft + bgWidth; tx += 18) {
    const treeX = tx - pX * 0.38;
    const treeH = 26 + ((tx * 13) % 18);
    ctx.beginPath();
    ctx.moveTo(treeX - 10, horizonY);
    ctx.lineTo(treeX, horizonY - treeH);
    ctx.lineTo(treeX + 10, horizonY);
    ctx.closePath();
    ctx.fill();
  }

  // 4. Cozy Mountain Chalets & Alpine Huts with glowing windows
  for (let cx = bgLeft + 180; cx < bgLeft + bgWidth - 100; cx += 420) {
    const chaletX = cx - pX * 0.35;
    const chaletY = horizonY - 24;
    // Timber chalet body
    ctx.fillStyle = isNight ? '#1c1917' : '#78350f';
    ctx.fillRect(chaletX, chaletY, 26, 16);
    // Overhanging pitched roof
    ctx.fillStyle = isNight ? '#0f172a' : '#451a03';
    ctx.beginPath();
    ctx.moveTo(chaletX - 4, chaletY);
    ctx.lineTo(chaletX + 13, chaletY - 10);
    ctx.lineTo(chaletX + 30, chaletY);
    ctx.closePath();
    ctx.fill();
    // Warm window light
    ctx.fillStyle = isNight ? '#fde047' : isSunset ? '#ffedd5' : '#fed7aa';
    ctx.fillRect(chaletX + 5, chaletY + 4, 6, 6);
    ctx.fillRect(chaletX + 15, chaletY + 4, 6, 6);
  }
}

/**
 * Forest Surroundings:
 * Dense multi-layered woodland canopy, evergreens, deciduous crests, and forest access trails
 */
function drawForestHorizon(
  ctx: CanvasRenderingContext2D,
  bgLeft: number,
  bgWidth: number,
  horizonY: number,
  pX: number,
  timeOfDay: TimeOfDay
) {
  const isNight = timeOfDay === 'night';
  const isSunset = timeOfDay === 'sunset';

  // Back deep forest ridge
  ctx.fillStyle = isNight ? '#051810' : isSunset ? '#3b1c1c' : '#14532d';
  for (let fx = bgLeft; fx < bgLeft + bgWidth + 60; fx += 80) {
    const hillX = fx - pX * 0.22;
    const crownH = 70 + ((fx * 23) % 35);
    ctx.beginPath();
    ctx.arc(hillX, horizonY - crownH * 0.6, crownH * 0.65, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mid dense pine forest
  ctx.fillStyle = isNight ? '#062316' : isSunset ? '#502018' : '#15803d';
  for (let tx = bgLeft; tx < bgLeft + bgWidth; tx += 15) {
    const treeX = tx - pX * 0.35;
    const treeH = 38 + ((tx * 17) % 25);
    ctx.beginPath();
    ctx.moveTo(treeX - 12, horizonY);
    ctx.lineTo(treeX, horizonY - treeH);
    ctx.lineTo(treeX + 12, horizonY);
    ctx.closePath();
    ctx.fill();
  }

  // Front woodland broadleaf canopy
  ctx.fillStyle = isNight ? '#0a2e1d' : isSunset ? '#713f12' : '#166534';
  for (let fx = bgLeft + 20; fx < bgLeft + bgWidth; fx += 55) {
    const oakX = fx - pX * 0.42;
    const oakH = 32 + ((fx * 11) % 18);
    ctx.beginPath();
    ctx.arc(oakX, horizonY - oakH, 18, 0, Math.PI * 2);
    ctx.arc(oakX - 8, horizonY - oakH + 4, 14, 0, Math.PI * 2);
    ctx.arc(oakX + 8, horizonY - oakH + 4, 14, 0, Math.PI * 2);
    ctx.fill();
  }

  // Wooden Forest Ranger Watchtower with lookout beacon
  for (let rx = bgLeft + 320; rx < bgLeft + bgWidth - 200; rx += 750) {
    const towerX = rx - pX * 0.4;
    const towerY = horizonY - 65;
    // Wood stilts
    ctx.strokeStyle = isNight ? '#1c1917' : '#451a03';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(towerX - 8, horizonY);
    ctx.lineTo(towerX - 4, towerY + 12);
    ctx.moveTo(towerX + 8, horizonY);
    ctx.lineTo(towerX + 4, towerY + 12);
    ctx.stroke();
    // Cabin box
    ctx.fillStyle = isNight ? '#1e293b' : '#78350f';
    ctx.fillRect(towerX - 10, towerY, 20, 14);
    // Lookout window / beacon
    ctx.fillStyle = isNight ? '#fde047' : '#93c5fd';
    ctx.fillRect(towerX - 6, towerY + 3, 12, 6);
  }
}

/**
 * Savannah Surroundings:
 * Sun-drenched golden-yellow grassy steppe, flat-topped table plateaus, flat-top acacia trees, and watering holes
 */
function drawSavannahHorizon(
  ctx: CanvasRenderingContext2D,
  bgLeft: number,
  bgWidth: number,
  horizonY: number,
  pX: number,
  timeOfDay: TimeOfDay
) {
  const isNight = timeOfDay === 'night';
  const isSunset = timeOfDay === 'sunset';

  // 1. Distant flat-topped mesas / table plateaus
  const mesaColor = isNight ? '#0f172a' : isSunset ? '#581c10' : '#854d0e';
  ctx.fillStyle = mesaColor;
  for (let mx = bgLeft; mx < bgLeft + bgWidth + 100; mx += 260) {
    const mesaX = mx - pX * 0.18;
    const mesaW = 140 + ((mx * 29) % 60);
    const mesaH = 50 + ((mx * 17) % 30);
    ctx.beginPath();
    ctx.moveTo(mesaX - 30, horizonY);
    ctx.lineTo(mesaX, horizonY - mesaH);
    ctx.lineTo(mesaX + mesaW, horizonY - mesaH);
    ctx.lineTo(mesaX + mesaW + 30, horizonY);
    ctx.closePath();
    ctx.fill();
  }

  // 2. Rolling golden dry steppe grass
  const grassColor = isNight ? '#141d18' : isSunset ? '#9a3412' : '#ca8a04';
  ctx.fillStyle = grassColor;
  ctx.fillRect(bgLeft, horizonY - 22, bgWidth, 32);

  // 3. Iconic Flat-Topped Acacia Trees (umbrella silhouette)
  for (let ax = bgLeft + 70; ax < bgLeft + bgWidth - 50; ax += 170) {
    const acaciaX = ax - pX * 0.38;
    const acaciaY = horizonY - 14;
    const trunkH = 34 + ((ax * 13) % 18);

    // Twisted trunk
    ctx.strokeStyle = isNight ? '#09090b' : '#451a03';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(acaciaX, acaciaY);
    ctx.lineTo(acaciaX + 3, acaciaY - trunkH * 0.6);
    ctx.lineTo(acaciaX - 4, acaciaY - trunkH);
    ctx.stroke();

    // Spreading umbrella branches
    ctx.beginPath();
    ctx.moveTo(acaciaX - 4, acaciaY - trunkH);
    ctx.lineTo(acaciaX - 22, acaciaY - trunkH - 6);
    ctx.moveTo(acaciaX - 4, acaciaY - trunkH);
    ctx.lineTo(acaciaX + 18, acaciaY - trunkH - 6);
    ctx.stroke();

    // Flat umbrella canopy
    ctx.fillStyle = isNight ? '#052012' : isSunset ? '#3f180f' : '#3f6212';
    ctx.beginPath();
    drawSafeEllipse(ctx, acaciaX - 2, acaciaY - trunkH - 8, 26, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Savannah Safari Camp / Firepit
  if (isNight || isSunset) {
    for (let fx = bgLeft + 240; fx < bgLeft + bgWidth - 140; fx += 550) {
      const campX = fx - pX * 0.4;
      // Warm flickering campfire glow
      const fireGlow = ctx.createRadialGradient(campX, horizonY - 10, 2, campX, horizonY - 10, 35);
      fireGlow.addColorStop(0, '#f97316');
      fireGlow.addColorStop(0.5, 'rgba(234, 88, 12, 0.4)');
      fireGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = fireGlow;
      ctx.beginPath();
      ctx.arc(campX, horizonY - 10, 35, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * Highway Surroundings:
 * Multi-lane elevated interstate expressway running alongside the stadium,
 * concrete overpass pillars, overhead destination signs, and streaming vehicle traffic with headlights/taillights
 */
function drawHighwayHorizon(
  ctx: CanvasRenderingContext2D,
  bgLeft: number,
  bgWidth: number,
  horizonY: number,
  pX: number,
  timeOfDay: TimeOfDay
) {
  const isNight = timeOfDay === 'night' || timeOfDay === 'sunset';
  const now = Date.now();

  // Distant suburban skyline
  ctx.fillStyle = isNight ? '#0b1329' : '#475569';
  for (let bx = bgLeft + 60; bx < bgLeft + bgWidth - 60; bx += 90) {
    const bW = 50 + ((bx * 17) % 30);
    const bH = 45 + ((bx * 23) % 40);
    ctx.fillRect(bx - pX * 0.2, horizonY - bH - 30, bW, bH);
  }

  // Elevated highway viaduct concrete deck
  const deckY = horizonY - 26;
  const deckH = 22;
  ctx.fillStyle = isNight ? '#0f172a' : '#1e293b'; // Asphalt roadway
  ctx.fillRect(bgLeft, deckY, bgWidth, deckH);

  // Concrete side parapet & sound barrier
  ctx.fillStyle = isNight ? '#1e293b' : '#64748b';
  ctx.fillRect(bgLeft, deckY - 4, bgWidth, 4); // Railing
  ctx.fillRect(bgLeft, deckY + deckH, bgWidth, 6); // Bottom girder

  // Heavy concrete support pillars
  ctx.fillStyle = isNight ? '#131b2e' : '#475569';
  for (let px = bgLeft + 80; px < bgLeft + bgWidth; px += 140) {
    const pillX = px - pX * 0.4;
    ctx.fillRect(pillX - 8, deckY + deckH, 16, 30);
    // Pillar crosshead
    ctx.fillRect(pillX - 14, deckY + deckH, 28, 4);
  }

  // Highway dashed lane markings (white)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  for (let lx = bgLeft; lx < bgLeft + bgWidth; lx += 40) {
    ctx.fillRect(lx - pX * 0.35, deckY + 10, 16, 2);
  }

  // Overhead highway destination sign gantries (Green Interstate Signs)
  for (let sx = bgLeft + 220; sx < bgLeft + bgWidth - 100; sx += 480) {
    const gantryX = sx - pX * 0.38;
    // Steel portal truss
    ctx.fillStyle = '#64748b';
    ctx.fillRect(gantryX - 2, deckY - 26, 4, 26);
    ctx.fillRect(gantryX + 70, deckY - 26, 4, 26);
    ctx.fillRect(gantryX - 2, deckY - 26, 76, 3);
    // Green highway sign board
    ctx.fillStyle = '#15803d';
    ctx.fillRect(gantryX + 8, deckY - 24, 56, 16);
    // White text lines
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(gantryX + 14, deckY - 20, 32, 2);
    ctx.fillRect(gantryX + 14, deckY - 14, 24, 2);
    // Yellow exit arrow
    ctx.fillStyle = '#facc15';
    ctx.fillRect(gantryX + 52, deckY - 19, 6, 6);
  }

  // Active traffic flow: Eastbound & Westbound vehicles
  const trafficOffset = (now * 0.08) % 360;
  for (let vx = bgLeft + 30; vx < bgLeft + bgWidth; vx += 110) {
    const carX = ((vx + trafficOffset - bgLeft) % bgWidth) + bgLeft - pX * 0.38;
    // Eastbound vehicle (top lane)
    ctx.fillStyle = ((vx * 13) % 2 === 0) ? '#dc2626' : '#2563eb';
    ctx.fillRect(carX, deckY + 3, 20, 8);
    // Windows
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(carX + 4, deckY + 4, 10, 3);

    if (isNight) {
      // White forward headlight beam
      ctx.fillStyle = 'rgba(255, 255, 200, 0.45)';
      ctx.beginPath();
      ctx.moveTo(carX + 20, deckY + 6);
      ctx.lineTo(carX + 48, deckY + 2);
      ctx.lineTo(carX + 48, deckY + 12);
      ctx.closePath();
      ctx.fill();
      // Red taillight
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(carX - 2, deckY + 5, 2, 3);
    }
  }

  // Westbound opposite flow (bottom lane)
  const oppOffset = (now * 0.065) % 360;
  for (let vx = bgLeft + 60; vx < bgLeft + bgWidth; vx += 140) {
    const truckX = bgLeft + bgWidth - (((vx + oppOffset - bgLeft) % bgWidth)) - pX * 0.38;
    // Semi-truck trailer
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(truckX, deckY + 12, 30, 8);
    // Truck cab
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(truckX - 8, deckY + 13, 8, 7);

    if (isNight) {
      // White headlight beam pointing left
      ctx.fillStyle = 'rgba(255, 255, 200, 0.45)';
      ctx.beginPath();
      ctx.moveTo(truckX - 8, deckY + 15);
      ctx.lineTo(truckX - 36, deckY + 11);
      ctx.lineTo(truckX - 36, deckY + 21);
      ctx.closePath();
      ctx.fill();
      // Red taillight on back of trailer
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(truckX + 30, deckY + 14, 2, 3);
    }
  }
}

/**
 * Small City Surroundings:
 * Distinct from Big City! Features a town hall with clock tower, 2-3 mid-rise commercial buildings,
 * transitioning into charming rows of 2-story brick houses with pitched terracotta roofs, chimney smoke, and tree-lined avenues
 */
function drawSmallCityHorizon(
  ctx: CanvasRenderingContext2D,
  bgLeft: number,
  bgWidth: number,
  horizonY: number,
  pX: number,
  timeOfDay: TimeOfDay
) {
  const isNight = timeOfDay === 'night';
  const isSunset = timeOfDay === 'sunset';

  // 1. Two-Three Mid-Rise Commercial Buildings (Banks, municipal offices)
  const commercialColor = isNight ? '#172033' : isSunset ? '#452033' : '#475569';
  for (let bx = bgLeft + 220; bx < bgLeft + bgWidth - 200; bx += 580) {
    const bX = bx - pX * 0.35;
    const bW = 65;
    const bH = 80 + ((bx * 17) % 25);
    ctx.fillStyle = commercialColor;
    ctx.fillRect(bX, horizonY - bH, bW, bH);
    // Roof cornice
    ctx.fillStyle = isNight ? '#0f172a' : '#334155';
    ctx.fillRect(bX - 2, horizonY - bH - 3, bW + 4, 4);

    // Office windows
    const winGlow = isNight ? 'rgba(254, 240, 138, 0.45)' : isSunset ? 'rgba(255, 237, 213, 0.3)' : 'rgba(224, 242, 254, 0.4)';
    ctx.fillStyle = winGlow;
    for (let wy = horizonY - bH + 10; wy < horizonY - 10; wy += 14) {
      for (let wx = bX + 8; wx < bX + bW - 8; wx += 12) {
        ctx.fillRect(wx, wy, 6, 8);
      }
    }
  }

  // 2. Town Hall Civic Clock Tower with illuminated clock face
  for (let tx = bgLeft + 420; tx < bgLeft + bgWidth - 100; tx += 680) {
    const towerX = tx - pX * 0.36;
    const towerH = 115;
    // Brick tower body
    ctx.fillStyle = isNight ? '#1e1b18' : isSunset ? '#6b2d2f' : '#7f1d1d';
    ctx.fillRect(towerX - 16, horizonY - towerH, 32, towerH);
    // Spire
    ctx.fillStyle = isNight ? '#0f172a' : '#334155';
    ctx.beginPath();
    ctx.moveTo(towerX - 16, horizonY - towerH);
    ctx.lineTo(towerX, horizonY - towerH - 35);
    ctx.lineTo(towerX + 16, horizonY - towerH);
    ctx.closePath();
    ctx.fill();

    // Illuminated circular clock face
    ctx.fillStyle = isNight ? '#fef08a' : '#ffffff';
    ctx.beginPath();
    ctx.arc(towerX, horizonY - towerH + 20, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Clock hands
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(towerX - 1, horizonY - towerH + 15, 2, 6);
    ctx.fillRect(towerX - 1, horizonY - towerH + 19, 4, 2);
  }

  // 3. Rows of 2-Story Residential Houses with pitched terracotta roofs & chimneys
  const brickColor = isNight ? '#221915' : isSunset ? '#5a221a' : '#991b1b';
  const roofColor = isNight ? '#1c1917' : isSunset ? '#7c2d12' : '#b45309'; // Terracotta tiles

  for (let hx = bgLeft + 40; hx < bgLeft + bgWidth - 40; hx += 70) {
    const houseX = hx - pX * 0.42;
    const houseW = 62;
    const houseH = 44 + ((hx * 11) % 14);
    const houseY = horizonY - houseH;

    // Brick house facade
    ctx.fillStyle = brickColor;
    ctx.fillRect(houseX, houseY, houseW, houseH);

    // Pitched terracotta roof
    ctx.fillStyle = roofColor;
    ctx.beginPath();
    ctx.moveTo(houseX - 3, houseY);
    ctx.lineTo(houseX + houseW / 2, houseY - 18);
    ctx.lineTo(houseX + houseW + 3, houseY);
    ctx.closePath();
    ctx.fill();

    // Brick chimney with smoke plume
    ctx.fillStyle = brickColor;
    ctx.fillRect(houseX + 10, houseY - 24, 7, 12);
    ctx.fillStyle = isNight ? 'rgba(255, 255, 255, 0.15)' : 'rgba(220, 220, 220, 0.35)';
    ctx.fillRect(houseX + 11, houseY - 30, 4, 4);
    ctx.fillRect(houseX + 13, houseY - 38, 6, 6);

    // Warm sash windows
    const winColor = isNight ? '#fde047' : isSunset ? '#ffedd5' : '#bae6fd';
    ctx.fillStyle = winColor;
    ctx.fillRect(houseX + 8, houseY + 10, 7, 10);
    ctx.fillRect(houseX + 27, houseY + 10, 7, 10);
    ctx.fillRect(houseX + 46, houseY + 10, 7, 10);
  }

  // 4. Tree-lined suburban street & warm lamp posts
  for (let tx = bgLeft + 95; tx < bgLeft + bgWidth - 70; tx += 95) {
    const treeX = tx - pX * 0.44;
    // Tree
    ctx.fillStyle = isNight ? '#0b2014' : isSunset ? '#3f2115' : '#15803d';
    ctx.beginPath();
    ctx.arc(treeX, horizonY - 22, 14, 0, Math.PI * 2);
    ctx.fill();

    // Vintage cast-iron streetlamp
    if (isNight) {
      const lampX = treeX + 26;
      ctx.fillStyle = '#334155';
      ctx.fillRect(lampX - 1, horizonY - 24, 2, 24);
      // Glowing lantern
      ctx.fillStyle = '#facc15';
      ctx.fillRect(lampX - 3, horizonY - 28, 6, 5);
      // Ground light pool
      const lampGlow = ctx.createRadialGradient(lampX, horizonY, 2, lampX, horizonY, 22);
      lampGlow.addColorStop(0, 'rgba(253, 224, 71, 0.35)');
      lampGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = lampGlow;
      ctx.beginPath();
      ctx.arc(lampX, horizonY, 22, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * Nature Surroundings (Fallback alias to Mountains)
 */
function drawNatureHorizon(
  ctx: CanvasRenderingContext2D,
  bgLeft: number,
  bgWidth: number,
  horizonY: number,
  pX: number,
  timeOfDay: TimeOfDay
) {
  drawMountainsHorizon(ctx, bgLeft, bgWidth, horizonY, pX, timeOfDay);
}

/**
 * Parking Lot Surroundings (Camp Nou Style Asphalt Bays & Team Buses)
 */
function drawParkingLotHorizon(
  ctx: CanvasRenderingContext2D,
  bgLeft: number,
  bgWidth: number,
  horizonY: number,
  pX: number,
  timeOfDay: TimeOfDay
) {
  const isNight = timeOfDay === 'night' || timeOfDay === 'sunset';

  // Asphalt parking floor
  ctx.fillStyle = isNight ? '#0f172a' : '#1e293b';
  ctx.fillRect(bgLeft, horizonY - 50, bgWidth, 70);

  // Painted parking stalls (white dashes)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  for (let px = bgLeft + 30; px < bgLeft + bgWidth; px += 35) {
    ctx.fillRect(px - pX * 0.35, horizonY - 45, 2, 28);
  }

  // Spectator parked cars (pixel blocks)
  const carColors = ['#dc2626', '#2563eb', '#ffffff', '#eab308', '#475569'];
  for (let cx = bgLeft + 45; cx < bgLeft + bgWidth - 80; cx += 50) {
    const carX = cx - pX * 0.35;
    ctx.fillStyle = carColors[(cx * 7) % carColors.length];
    ctx.fillRect(carX, horizonY - 32, 22, 12);
    ctx.fillStyle = '#0f172a'; // Windows
    ctx.fillRect(carX + 4, horizonY - 30, 14, 4);
  }

  // Two Official Team Luxury Coaches (Home & Away Team Buses!)
  const bus1X = bgLeft + 320 - pX * 0.38;
  const bus2X = bgLeft + 420 - pX * 0.38;
  // Home Team Bus
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(bus1X, horizonY - 42, 60, 20);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(bus1X + 4, horizonY - 38, 52, 6);
  // Away Team Bus
  ctx.fillStyle = '#2563eb';
  ctx.fillRect(bus2X, horizonY - 42, 60, 20);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(bus2X + 4, horizonY - 38, 52, 6);
}

/**
 * Tier 1: Monumental Elite Metropolis Skyline
 * Dense gleaming skyscrapers, lit window grids, telecommunication spires, and red beacons
 */
function drawMonumentalCitySkyline(
  ctx: CanvasRenderingContext2D,
  bgLeft: number,
  bgWidth: number,
  horizonY: number,
  pX: number,
  timeOfDay: TimeOfDay
) {
  const isNightOrDusk = timeOfDay === 'night' || timeOfDay === 'dawn' || timeOfDay === 'sunset';
  const silhouetteColor = timeOfDay === 'night' ? '#0b1329' : timeOfDay === 'sunset' ? '#22112d' : timeOfDay === 'dawn' ? '#201633' : '#334155';

  // Back skyscraper layer (taller, darker)
  ctx.fillStyle = silhouetteColor;
  for (let bx = bgLeft + 80; bx < bgLeft + bgWidth - 80; bx += 85) {
    const bHeight = 110 + ((bx * 37) % 150);
    const bWidth = 55 + ((bx * 23) % 45);
    const bX = bx - pX * 0.35;
    ctx.fillRect(bX, horizonY - bHeight, bWidth, bHeight);

    // Antenna & aircraft warning light
    if ((bx % 240) < 90) {
      ctx.fillStyle = '#64748b';
      ctx.fillRect(bX + bWidth / 2 - 1, horizonY - bHeight - 32, 2, 32);
      ctx.fillStyle = '#ef4444'; // Flashing red beacon
      ctx.fillRect(bX + bWidth / 2 - 2, horizonY - bHeight - 33, 4, 3);
      ctx.fillStyle = silhouetteColor;
    }
  }

  // Front skyscraper layer (with lit windows)
  const frontColor = timeOfDay === 'night' ? '#111c38' : timeOfDay === 'sunset' ? '#351c46' : timeOfDay === 'dawn' ? '#2e2145' : '#475569';
  ctx.fillStyle = frontColor;
  for (let bx = bgLeft + 120; bx < bgLeft + bgWidth - 120; bx += 110) {
    const bHeight = 70 + ((bx * 47) % 100);
    const bWidth = 60 + ((bx * 19) % 40);
    const bX = bx - pX * 0.48;
    ctx.fillRect(bX, horizonY - bHeight, bWidth, bHeight);

    // Modern glass curtain wall roof crown
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(bX + 4, horizonY - bHeight, bWidth - 8, 3);
    ctx.fillStyle = frontColor;

    // Glowing office & residential windows
    if (isNightOrDusk) {
      const winColor = timeOfDay === 'night' ? 'rgba(254, 240, 138, 0.42)' : 'rgba(255, 230, 150, 0.28)';
      ctx.fillStyle = winColor;
      for (let wy = horizonY - bHeight + 14; wy < horizonY - 12; wy += 14) {
        for (let wx = bX + 7; wx < bX + bWidth - 7; wx += 11) {
          if (((wx + wy * 3) % 7) !== 0) {
            ctx.fillRect(wx, wy, 5, 7);
          }
        }
      }
      ctx.fillStyle = frontColor;
    }
  }
}

/**
 * Tier 2: Craven Heritage English Ground Horizon
 * Victorian red-brick terraced houses, brick chimneys with smoke plumes, leafy park trees, and church spires
 */
function drawCravenHeritageHorizon(
  ctx: CanvasRenderingContext2D,
  bgLeft: number,
  bgWidth: number,
  horizonY: number,
  pX: number,
  timeOfDay: TimeOfDay
) {
  const isNight = timeOfDay === 'night';
  const brickColor = isNight ? '#2a1b18' : '#7f2d22';
  const roofColor = isNight ? '#1e242b' : '#334155';
  const treeColor = isNight ? '#122515' : '#22542a';

  // Victorian Terraced Housing Row
  for (let hx = bgLeft + 60; hx < bgLeft + bgWidth - 60; hx += 75) {
    const houseX = hx - pX * 0.4;
    const houseW = 68;
    const houseH = 48 + ((hx * 13) % 18);
    const houseY = horizonY - houseH;

    // Brick house facade
    ctx.fillStyle = brickColor;
    ctx.fillRect(houseX, houseY, houseW, houseH);

    // Pitched slate roof
    ctx.fillStyle = roofColor;
    ctx.beginPath();
    ctx.moveTo(houseX - 3, houseY);
    ctx.lineTo(houseX + houseW / 2, houseY - 18);
    ctx.lineTo(houseX + houseW + 3, houseY);
    ctx.closePath();
    ctx.fill();

    // Chimney stack with cozy fireplace smoke
    ctx.fillStyle = brickColor;
    ctx.fillRect(houseX + 12, houseY - 26, 8, 14);
    ctx.fillRect(houseX + 10, houseY - 28, 12, 3); // Chimney pot

    // Chimney smoke puff
    ctx.fillStyle = isNight ? 'rgba(255, 255, 255, 0.15)' : 'rgba(220, 220, 220, 0.35)';
    ctx.fillRect(houseX + 13, houseY - 34, 4, 5);
    ctx.fillRect(houseX + 15, houseY - 42, 6, 6);
    ctx.fillRect(houseX + 18, houseY - 50, 9, 7);

    // Warm sash windows
    const winGlow = isNight ? '#fde047' : '#94a3b8';
    ctx.fillStyle = winGlow;
    ctx.fillRect(houseX + 10, houseY + 12, 8, 12);
    ctx.fillRect(houseX + 32, houseY + 12, 8, 12);
    ctx.fillRect(houseX + 50, houseY + 12, 8, 12);
  }

  // Historic Parish Church Spire every 600px
  for (let cx = bgLeft + 350; cx < bgLeft + bgWidth - 200; cx += 650) {
    const churchX = cx - pX * 0.4;
    const churchY = horizonY - 75;

    // Church stone tower
    ctx.fillStyle = isNight ? '#1e2430' : '#475569';
    ctx.fillRect(churchX - 16, churchY, 32, 75);

    // Gothic steeple spire
    ctx.fillStyle = isNight ? '#141c28' : '#334155';
    ctx.beginPath();
    ctx.moveTo(churchX - 16, churchY);
    ctx.lineTo(churchX, churchY - 65);
    ctx.lineTo(churchX + 16, churchY);
    ctx.closePath();
    ctx.fill();

    // Spire cross
    ctx.fillStyle = '#facc15';
    ctx.fillRect(churchX - 1, churchY - 72, 2, 8);
    ctx.fillRect(churchX - 3, churchY - 69, 6, 2);
  }

  // Leafy Park Trees between buildings
  for (let tx = bgLeft + 110; tx < bgLeft + bgWidth - 110; tx += 120) {
    const treeX = tx - pX * 0.42;
    const treeY = horizonY - 14;

    // Trunk
    ctx.fillStyle = '#422006';
    ctx.fillRect(treeX - 2, treeY - 20, 4, 20);

    // Foliage canopy
    ctx.fillStyle = treeColor;
    ctx.beginPath();
    ctx.arc(treeX, treeY - 32, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(treeX - 8, treeY - 26, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(treeX + 8, treeY - 26, 12, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Tier 3: Ascenso Municipal Raw Concrete Surroundings
 * Latin American 2nd-division ground: rolling hills, tin industrial roofs, water tanks, telegraph wires
 */
function drawAscensoSurroundings(
  ctx: CanvasRenderingContext2D,
  bgLeft: number,
  bgWidth: number,
  horizonY: number,
  pX: number,
  timeOfDay: TimeOfDay
) {
  const isNight = timeOfDay === 'night';
  const hillColor = isNight ? '#101d14' : timeOfDay === 'sunset' ? '#3d251d' : '#3a5028';

  // Rolling Arid/Green Hills in distance
  ctx.fillStyle = hillColor;
  ctx.beginPath();
  ctx.moveTo(bgLeft, horizonY);
  for (let x = bgLeft; x <= bgLeft + bgWidth; x += 180) {
    const hillY = horizonY - 70 - Math.sin((x * 0.0035)) * 45 - Math.cos((x * 0.008)) * 25;
    ctx.lineTo(x - pX * 0.25, hillY);
  }
  ctx.lineTo(bgLeft + bgWidth, horizonY + 50);
  ctx.lineTo(bgLeft, horizonY + 50);
  ctx.closePath();
  ctx.fill();

  // Low industrial brick houses & cinderblock rooftops
  const houseColor = isNight ? '#22272e' : '#8d6e63';
  const tinRoofColor = isNight ? '#2d333b' : '#94a3b8';

  for (let hx = bgLeft + 70; hx < bgLeft + bgWidth - 70; hx += 80) {
    const bX = hx - pX * 0.42;
    const bW = 72;
    const bH = 34 + ((hx * 17) % 22);
    const bY = horizonY - bH;

    // Cinderblock wall
    ctx.fillStyle = houseColor;
    ctx.fillRect(bX, bY, bW, bH);

    // Corrugated tin roof with rust patches
    ctx.fillStyle = tinRoofColor;
    ctx.fillRect(bX - 2, bY - 4, bW + 4, 5);
    ctx.fillStyle = '#b45309'; // Rust spots
    ctx.fillRect(bX + 8, bY - 4, 14, 2);
    ctx.fillRect(bX + 42, bY - 4, 18, 2);

    // Rooftop Blue/Black Water Tank (Tanque de agua)
    if ((hx % 160) < 90) {
      ctx.fillStyle = isNight ? '#1e293b' : '#0284c7';
      ctx.fillRect(bX + bW - 20, bY - 14, 14, 10);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(bX + bW - 22, bY - 16, 18, 3); // Tank lid
    }

    // Windows with iron security bars
    ctx.fillStyle = isNight ? '#fde047' : '#334155';
    ctx.fillRect(bX + 12, bY + 10, 10, 10);
    ctx.fillRect(bX + 40, bY + 10, 10, 10);
  }

  // Wooden Utility Poles with Overhead Wire Cables
  ctx.strokeStyle = isNight ? 'rgba(255, 255, 255, 0.2)' : 'rgba(30, 41, 59, 0.4)';
  ctx.lineWidth = 1;

  for (let px = bgLeft + 150; px < bgLeft + bgWidth - 150; px += 240) {
    const poleX = px - pX * 0.45;
    const poleTopY = horizonY - 65;

    // Wooden pole
    ctx.fillStyle = '#451a03';
    ctx.fillRect(poleX - 2, poleTopY, 4, 65);
    // Crossbeam
    ctx.fillRect(poleX - 10, poleTopY + 4, 20, 3);

    // Wire drooping to next pole
    const nextX = poleX + 240;
    ctx.beginPath();
    ctx.moveTo(poleX - 8, poleTopY + 4);
    ctx.quadraticCurveTo(poleX + 120, poleTopY + 18, nextX - 8, poleTopY + 4);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(poleX + 8, poleTopY + 4);
    ctx.quadraticCurveTo(poleX + 120, poleTopY + 22, nextX + 8, poleTopY + 4);
    ctx.stroke();
  }
}

/**
 * Draws the stadium apron, perimeter floor, running track or gravel border,
 * dugouts, ad hoardings, and floodlight towers according to the stadium tier.
 */
/**
 * Stand Grade Material Palettes for Phase 13.2 Procedural Rendering:
 * 1. Municipal: Rough weathered cinder blocks, timber benches, utilitarian perimeter
 * 2. Classic: Traditional English red-brick masonry, painted steel trusses, fold-down plastic seats
 * 3. Industrial: Heavy corrugated steel cladding, raw galvanized I-beams, hazard accents
 * 4. Modern: Smooth pre-cast architectural concrete, cantilevered sweeping roofs, glass balustrades
 * 5. Futuristic: Anodized aero-aluminum cladding, translucent ETFE, continuous glowing LED ribbon
 */
export interface StandGradePalette {
  primaryWall: string;
  secondaryWall: string;
  balustrade: string;
  roofPurlin: string;
  fasciaLed: string | null;
  seatTexture: 'bench' | 'bucket' | 'concrete';
  stepTexture: string;
  trim: string;
}

export function getStandGradePalette(grade?: StandGrade): StandGradePalette {
  switch (grade) {
    case 'grade1_municipal':
    case 'grade1_historic_timber':
      return {
        primaryWall: '#57534e', // Weathered grey cinder block
        secondaryWall: '#44403c',
        balustrade: '#78716c',
        roofPurlin: '#78350f', // Timber trusses
        fasciaLed: null,
        seatTexture: 'bench',
        stepTexture: '#292524',
        trim: '#a8a29e',
      };
    case 'grade2_classic':
      return {
        primaryWall: '#7f1d1d', // English red-brick masonry
        secondaryWall: '#991b1b',
        balustrade: '#15803d', // Painted dark green steel
        roofPurlin: '#166534',
        fasciaLed: null,
        seatTexture: 'bucket',
        stepTexture: '#451a03',
        trim: '#fde047',
      };
    case 'grade3_industrial':
    case 'grade3_steel_cantilever':
      return {
        primaryWall: '#334155', // Corrugated heavy steel
        secondaryWall: '#1e293b',
        balustrade: '#64748b', // Galvanized steel
        roofPurlin: '#0284c7', // Industrial painted steel beams
        fasciaLed: null,
        seatTexture: 'bucket',
        stepTexture: '#0f172a',
        trim: '#facc15', // Warning yellow stripes
      };
    case 'grade4_modern':
      return {
        primaryWall: '#1e293b', // Smooth pre-cast architectural concrete
        secondaryWall: '#0f172a',
        balustrade: 'rgba(56, 189, 248, 0.4)', // Glass balustrades
        roofPurlin: '#475569',
        fasciaLed: '#38bdf8', // Digital fascia
        seatTexture: 'bucket',
        stepTexture: '#334155',
        trim: '#ffffff',
      };
    case 'grade5_futuristic':
    default:
      return {
        primaryWall: '#0f172a', // Anodized aero-aluminum cladding
        secondaryWall: '#020617',
        balustrade: 'rgba(56, 189, 248, 0.7)', // Illuminated glass
        roofPurlin: '#0284c7',
        fasciaLed: '#38bdf8', // Continuous vibrant LED ribbon
        seatTexture: 'bucket',
        stepTexture: '#1e293b',
        trim: '#38bdf8',
      };
  }
}

/**
 * PHASE 13.2: Live Matchday Procedural Stadium Renderer
 * Draws the stadium apron, running track, grandstand enclosures (East, West, Corners),
 * dugouts with seated players & manager, entrance tunnel with stewards, and architectural shadows.
 */
/**
 * PHASE 13.2 & 15.5: Live Matchday Procedural Stadium Renderer
 * Draws the 360° exterior surroundings landscape, stadium apron, running track,
 * grandstand enclosures (East, West, North, South, Corners) with distinct architectural shapes,
 * dugouts with seated players & manager, entrance tunnel with stewards, and architectural shadows.
 */
export function drawStadiumArchitecture(
  ctx: CanvasRenderingContext2D,
  cameraX: number,
  cameraY: number,
  stadiumTier: StadiumTier = 'monumental',
  timeOfDay: TimeOfDay = 'night',
  homeKit: TeamKit = HOME_KIT,
  awayKit: TeamKit = AWAY_KIT,
  graphicsSettings?: GraphicsSettings,
  stadiumDef?: StadiumDefinition
) {
  const cx = PITCH_CONFIG.CENTER_X;
  const cy = PITCH_CONFIG.CENTER_Y;
  const pX = (cameraX - cx) * 0.12;
  const pY = (cameraY - cy) * 0.08;

  // 0. PHASE 15.5: 360° EXTERIOR SURROUNDINGS LANDSCAPE (Fills entire area outside stadium)
  drawSurroundingsPerimeterLandscape(ctx, cameraX, cameraY, stadiumDef, stadiumTier, timeOfDay);

  // 1. STADIUM APRON & SURROUNDS (6 apron materials + genuine curved athletics running track for round/oval)
  drawStadiumApron(ctx, stadiumTier, stadiumDef);

  // 2. GRANDSTANDS ENCLOSURE: WEST, EAST, NORTH, SOUTH & CORNERS (All 4 Shapes & 5 Stand Grades)
  drawTouchlineAndCornerStands(ctx, stadiumDef, stadiumTier, timeOfDay, homeKit, awayKit, graphicsSettings);

  // 3. ADVERTISING HOARDINGS (LED, Painted Billboards, or Rustic Concrete Walls)
  drawStadiumAdHoardings(ctx, stadiumTier, timeOfDay, graphicsSettings);

  // 4. TECHNICAL AREAS & DUGOUTS (5 bench types with seated subs, coaches, and manager)
  drawStadiumDugouts(ctx, stadiumTier, homeKit, awayKit, stadiumDef?.dugouts);

  // 5. PLAYER ENTRANCE TUNNEL (5 tunnel types with security stewards & carpet runner)
  drawStadiumEntranceTunnel(ctx, stadiumDef?.tunnel, homeKit, awayKit);

  // 6. ARCHITECTURAL ROOF SHADOW VOLUMES CAST ONTO TURF
  drawArchitecturalRoofShadows(ctx, stadiumDef?.shape || 'rectangular', timeOfDay, graphicsSettings);

  // 7. FOUR CORNER FLOODLIGHT TOWERS / PYLONS
  drawStadiumFloodlights(ctx, stadiumTier, timeOfDay, pX, pY);
}

/**
 * PHASE 15.5: 360° Surroundings Exterior Landscape Renderer
 * Fills the complete ground around the stadium (North, South, East, West, and corners),
 * not just the top skybox! Supports Mountains, Forest, Savannah, Highway, Small City, Big City, Beach, etc.
 * Features 3 Time-of-Day variants:
 * - Noon: Full sunlight, rich natural colors, clear asphalt/terrain
 * - Sunset: Golden/orange warm sky tones and long dramatic shadows
 * - Night: Moonlit ground, illuminated streetlamps, vehicle headlights casting beams, glowing windows & stadium floodlight spill
 */
function drawSurroundingsPerimeterLandscape(
  ctx: CanvasRenderingContext2D,
  cameraX: number,
  cameraY: number,
  stadiumDef?: StadiumDefinition,
  tier: StadiumTier = 'monumental',
  timeOfDay: TimeOfDay = 'night'
) {
  const surroundings = stadiumDef?.surroundings || (tier === 'monumental' ? 'big_city' : tier === 'craven' ? 'small_city' : 'mountains');
  const isNight = timeOfDay === 'night';
  const isSunset = timeOfDay === 'sunset';

  const extLeft = PITCH_CONFIG.PITCH_LEFT - 1400;
  const extTop = PITCH_CONFIG.PITCH_TOP - 1200;
  const extWidth = PITCH_CONFIG.FIELD_WIDTH + 2800;
  const extHeight = PITCH_CONFIG.FIELD_HEIGHT + 2400;

  ctx.save();

  // 1. Base Terrain Fill based on Surroundings & Time of Day
  let baseGround = '#14532d'; // Default green
  if (surroundings === 'mountains') {
    baseGround = isNight ? '#0a1a12' : isSunset ? '#2a3a1f' : '#27522c';
  } else if (surroundings === 'forest') {
    baseGround = isNight ? '#051810' : isSunset ? '#221e10' : '#14381e';
  } else if (surroundings === 'savannah') {
    baseGround = isNight ? '#171a0f' : isSunset ? '#5a2d0c' : '#a16207';
  } else if (surroundings === 'highway' || surroundings === 'parking_lot') {
    baseGround = isNight ? '#0a0f1d' : isSunset ? '#1e293b' : '#334155';
  } else if (surroundings === 'big_city') {
    baseGround = isNight ? '#0b1120' : isSunset ? '#1e2433' : '#334155';
  } else if (surroundings === 'small_city') {
    baseGround = isNight ? '#121815' : isSunset ? '#2e251d' : '#385e38';
  } else if (surroundings === 'beach') {
    baseGround = isNight ? '#2d2417' : isSunset ? '#b45309' : '#eab308';
  } else if (surroundings === 'marine_floating') {
    baseGround = isNight ? '#031730' : isSunset ? '#0e3a5a' : '#0284c7';
  } else if (surroundings === 'airport') {
    baseGround = isNight ? '#0c1322' : isSunset ? '#1e293b' : '#475569';
  }

  ctx.fillStyle = baseGround;
  ctx.fillRect(extLeft, extTop, extWidth, extHeight);

  // 2. Specific 360° Environmental Features around the Stadium
  const leftFlank = PITCH_CONFIG.PITCH_LEFT - 260;
  const rightFlank = PITCH_CONFIG.PITCH_RIGHT + 260;
  const topFlank = PITCH_CONFIG.PITCH_TOP - 260;
  const bottomFlank = PITCH_CONFIG.PITCH_BOTTOM + 260;

  if (surroundings === 'highway') {
    // Multi-lane asphalt ring expressway looping around the exterior of the stadium
    ctx.fillStyle = isNight ? '#020617' : '#1e293b';
    // West expressway belt
    ctx.fillRect(extLeft + 200, extTop, 160, extHeight);
    // East expressway belt
    ctx.fillRect(rightFlank + 300, extTop, 160, extHeight);
    // South interchange
    ctx.fillRect(extLeft, bottomFlank + 300, extWidth, 160);

    // Highway lane lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([20, 16]);
    ctx.beginPath();
    ctx.moveTo(extLeft + 280, extTop);
    ctx.lineTo(extLeft + 280, extTop + extHeight);
    ctx.moveTo(rightFlank + 380, extTop);
    ctx.lineTo(rightFlank + 380, extTop + extHeight);
    ctx.moveTo(extLeft, bottomFlank + 380);
    ctx.lineTo(extLeft + extWidth, bottomFlank + 380);
    ctx.stroke();
    ctx.setLineDash([]);

    // Highway vehicles with headlights/taillights
    const now = Date.now();
    for (let i = 0; i < 12; i++) {
      const carY = extTop + ((i * 320 + now * 0.1) % extHeight);
      ctx.fillStyle = i % 2 === 0 ? '#dc2626' : '#2563eb';
      ctx.fillRect(extLeft + 260, carY, 18, 30);
      if (isNight) {
        // Headlight beam pointing down
        ctx.fillStyle = 'rgba(255, 255, 200, 0.4)';
        ctx.beginPath();
        ctx.moveTo(extLeft + 260, carY + 30);
        ctx.lineTo(extLeft + 245, carY + 80);
        ctx.lineTo(extLeft + 295, carY + 80);
        ctx.closePath();
        ctx.fill();
        // Taillights
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(extLeft + 262, carY - 2, 4, 3);
        ctx.fillRect(extLeft + 272, carY - 2, 4, 3);
      }
    }
  } else if (surroundings === 'big_city') {
    // Dense Metropolis city blocks surrounding stadium flanks
    const blockColor = isNight ? '#0b1329' : isSunset ? '#261b33' : '#475569';
    // West city blocks
    for (let by = extTop + 50; by < extTop + extHeight; by += 260) {
      for (let bx = extLeft + 100; bx < leftFlank - 120; bx += 220) {
        ctx.fillStyle = blockColor;
        ctx.fillRect(bx, by, 180, 200);
        // Lit window grid
        if (isNight || isSunset) {
          ctx.fillStyle = isNight ? 'rgba(254, 240, 138, 0.5)' : 'rgba(255, 237, 213, 0.35)';
          for (let wy = by + 15; wy < by + 180; wy += 22) {
            for (let wx = bx + 15; wx < bx + 165; wx += 20) {
              if (((wx + wy) % 5) !== 0) ctx.fillRect(wx, wy, 8, 12);
            }
          }
        }
      }
    }
    // East city blocks
    for (let by = extTop + 50; by < extTop + extHeight; by += 260) {
      for (let bx = rightFlank + 140; bx < extLeft + extWidth - 100; bx += 220) {
        ctx.fillStyle = blockColor;
        ctx.fillRect(bx, by, 180, 200);
        if (isNight || isSunset) {
          ctx.fillStyle = isNight ? 'rgba(254, 240, 138, 0.5)' : 'rgba(255, 237, 213, 0.35)';
          for (let wy = by + 15; wy < by + 180; wy += 22) {
            for (let wx = bx + 15; wx < bx + 165; wx += 20) {
              if (((wx + wy) % 5) !== 0) ctx.fillRect(wx, wy, 8, 12);
            }
          }
        }
      }
    }
    // South metropolitan plazas & avenues
    for (let bx = extLeft + 150; bx < extLeft + extWidth - 150; bx += 250) {
      ctx.fillStyle = blockColor;
      ctx.fillRect(bx, bottomFlank + 180, 200, 240);
    }
  } else if (surroundings === 'small_city') {
    // Charming neighborhood streets, 2-story pitched terracotta roof houses
    const houseColor = isNight ? '#221915' : isSunset ? '#5a221a' : '#991b1b';
    const roofColor = isNight ? '#1c1917' : isSunset ? '#7c2d12' : '#b45309';

    // Flanking residential streets
    const houseCoords = [
      // West flank
      { x: leftFlank - 220, y: PITCH_CONFIG.CENTER_Y - 400 },
      { x: leftFlank - 220, y: PITCH_CONFIG.CENTER_Y - 150 },
      { x: leftFlank - 220, y: PITCH_CONFIG.CENTER_Y + 100 },
      { x: leftFlank - 220, y: PITCH_CONFIG.CENTER_Y + 350 },
      // East flank
      { x: rightFlank + 150, y: PITCH_CONFIG.CENTER_Y - 400 },
      { x: rightFlank + 150, y: PITCH_CONFIG.CENTER_Y - 150 },
      { x: rightFlank + 150, y: PITCH_CONFIG.CENTER_Y + 100 },
      { x: rightFlank + 150, y: PITCH_CONFIG.CENTER_Y + 350 },
      // South flank
      { x: PITCH_CONFIG.CENTER_X - 350, y: bottomFlank + 160 },
      { x: PITCH_CONFIG.CENTER_X - 100, y: bottomFlank + 160 },
      { x: PITCH_CONFIG.CENTER_X + 150, y: bottomFlank + 160 },
      { x: PITCH_CONFIG.CENTER_X + 400, y: bottomFlank + 160 },
    ];

    for (const h of houseCoords) {
      ctx.fillStyle = houseColor;
      ctx.fillRect(h.x, h.y, 80, 60);
      ctx.fillStyle = roofColor;
      ctx.beginPath();
      ctx.moveTo(h.x - 4, h.y);
      ctx.lineTo(h.x + 40, h.y - 25);
      ctx.lineTo(h.x + 84, h.y);
      ctx.closePath();
      ctx.fill();

      // Warm glowing windows
      ctx.fillStyle = isNight ? '#fde047' : isSunset ? '#ffedd5' : '#bae6fd';
      ctx.fillRect(h.x + 12, h.y + 15, 14, 16);
      ctx.fillRect(h.x + 54, h.y + 15, 14, 16);

      // Streetlamp
      if (isNight) {
        ctx.fillStyle = '#facc15';
        ctx.fillRect(h.x - 15, h.y + 40, 4, 4);
        const glow = ctx.createRadialGradient(h.x - 13, h.y + 42, 2, h.x - 13, h.y + 42, 28);
        glow.addColorStop(0, 'rgba(253, 224, 71, 0.45)');
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(h.x - 13, h.y + 42, 28, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (surroundings === 'mountains' || surroundings === 'nature') {
    // Alpine evergreen pine trees and craggy rock formations around all flanks
    ctx.fillStyle = isNight ? '#052e16' : isSunset ? '#1a3a22' : '#14532d';
    for (let y = extTop + 100; y < extTop + extHeight - 100; y += 120) {
      // West trees
      ctx.beginPath();
      ctx.arc(leftFlank - 180 - ((y * 17) % 140), y, 22, 0, Math.PI * 2);
      ctx.fill();
      // East trees
      ctx.beginPath();
      ctx.arc(rightFlank + 180 + ((y * 19) % 140), y, 22, 0, Math.PI * 2);
      ctx.fill();
    }
    // South mountain ridge trees
    for (let x = extLeft + 100; x < extLeft + extWidth - 100; x += 110) {
      ctx.beginPath();
      ctx.arc(x, bottomFlank + 220 + ((x * 13) % 80), 24, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (surroundings === 'forest') {
    // Dense woodland canopy clusters wrapping completely around the stadium
    ctx.fillStyle = isNight ? '#051810' : isSunset ? '#261b12' : '#166534';
    for (let y = extTop + 80; y < extTop + extHeight - 80; y += 90) {
      ctx.beginPath();
      ctx.arc(leftFlank - 150 - ((y * 11) % 120), y, 32, 0, Math.PI * 2);
      ctx.arc(rightFlank + 150 + ((y * 13) % 120), y, 32, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let x = extLeft + 80; x < extLeft + extWidth - 80; x += 90) {
      ctx.beginPath();
      ctx.arc(x, bottomFlank + 180 + ((x * 17) % 70), 32, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (surroundings === 'savannah') {
    // Flat-topped acacia trees and golden grassland perimeter
    ctx.fillStyle = isNight ? '#052012' : isSunset ? '#3f180f' : '#3f6212';
    for (let y = extTop + 140; y < extTop + extHeight - 140; y += 220) {
      const ax1 = leftFlank - 220;
      const ax2 = rightFlank + 220;
      // Umbrella canopies
      ctx.beginPath();
      drawSafeEllipse(ctx, ax1, y, 36, 10, 0, 0, Math.PI * 2);
      drawSafeEllipse(ctx, ax2, y, 36, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let x = extLeft + 150; x < extLeft + extWidth - 150; x += 240) {
      ctx.beginPath();
      drawSafeEllipse(ctx, x, bottomFlank + 220, 38, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 3. Night Floodlight Spill around the immediate stadium perimeter
  if (isNight) {
    const floodlightSpill = ctx.createRadialGradient(
      PITCH_CONFIG.CENTER_X,
      PITCH_CONFIG.CENTER_Y,
      PITCH_CONFIG.FIELD_HEIGHT * 0.45,
      PITCH_CONFIG.CENTER_X,
      PITCH_CONFIG.CENTER_Y,
      PITCH_CONFIG.FIELD_HEIGHT * 0.95
    );
    floodlightSpill.addColorStop(0, 'rgba(56, 189, 248, 0.12)');
    floodlightSpill.addColorStop(0.6, 'rgba(255, 255, 255, 0.05)');
    floodlightSpill.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = floodlightSpill;
    ctx.fillRect(extLeft, extTop, extWidth, extHeight);
  }

  ctx.restore();
}

/**
 * PHASE 15.5: Stadium Apron & Perimeter Material Selector + Running Track Geometry
 * Supports 6 distinct apron materials:
 * 1. Grass: Pristine natural turf apron with lawn stripes & technical line
 * 2. Concrete: Brushed architectural concrete slabs with expansion joint grid
 * 3. Rubber Tartan: High-grip red/terracotta or blue athletics rubber flooring
 * 4. Artificial Turf: Vivid lime synthetic astroturf with perimeter seam tape
 * 5. Gravel Ballast: Crushed gravel with multi-colored stone flecks
 * 6. Asphalt Paved: Deep charcoal tarmac asphalt with safety hazard borders
 *
 * Running Track:
 * - Oval & Round stadiums feature genuine curved multi-lane running tracks encircling the pitch!
 *   - Round: Continuous circular coliseum curve enclosing pitch & apron
 *   - Oval: Straight touchlines + semicircular horseshoe end curves behind North & South goals
 */
function drawStadiumApron(ctx: CanvasRenderingContext2D, tier: StadiumTier, stadiumDef?: StadiumDefinition) {
  const left = PITCH_CONFIG.PITCH_LEFT - 160;
  const top = PITCH_CONFIG.PITCH_TOP - 160;
  const width = PITCH_CONFIG.FIELD_WIDTH + 320;
  const height = PITCH_CONFIG.FIELD_HEIGHT + 320;
  const shape = stadiumDef?.shape || (tier === 'monumental' ? 'oval' : 'rectangular');
  const hasTrack = stadiumDef?.hasTrack || shape === 'round' || shape === 'oval';
  const apronMat: ApronMaterial = stadiumDef?.apronMaterial || 'grass';

  ctx.save();

  // 1. APRON PERIMETER MATERIAL SURFACE (Fill between pitch line and grandstands)
  if (apronMat === 'concrete') {
    // 🧱 Brushed architectural concrete slabs
    ctx.fillStyle = '#64748b';
    ctx.fillRect(left, top, width, height);
    // Expansion joint grid (100px square pavers)
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    for (let x = left; x <= left + width; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, top + height);
      ctx.stroke();
    }
    for (let y = top; y <= top + height; y += 80) {
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(left + width, y);
      ctx.stroke();
    }
  } else if (apronMat === 'rubber_tartan') {
    // 🏃 High-grip tartan athletic rubber
    const isBlue = tier === 'monumental';
    ctx.fillStyle = isBlue ? '#1e3a8a' : '#991b1b';
    ctx.fillRect(left, top, width, height);
    // Stippled rubber texture
    ctx.fillStyle = isBlue ? '#2563eb' : '#b91c1c';
    for (let y = top + 10; y < top + height; y += 24) {
      for (let x = left + 10; x < left + width; x += 36) {
        ctx.fillRect(x, y, 4, 3);
      }
    }
  } else if (apronMat === 'artificial_turf') {
    // 🌿 Vivid synthetic astroturf
    ctx.fillStyle = '#15803d';
    ctx.fillRect(left, top, width, height);
    // Turf carpet roll seam lines
    ctx.strokeStyle = '#166534';
    ctx.lineWidth = 2;
    for (let x = left; x <= left + width; x += 120) {
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, top + height);
      ctx.stroke();
    }
  } else if (apronMat === 'gravel_ballast') {
    // 🪨 Crushed river stone / ballast gravel
    ctx.fillStyle = '#57534e';
    ctx.fillRect(left, top, width, height);
    // Textured stone flecks
    const rockColors = ['#78716c', '#44403c', '#a8a29e', '#292524'];
    for (let i = 0; i < 400; i++) {
      const rx = left + ((i * 137) % width);
      const ry = top + ((i * 97) % height);
      ctx.fillStyle = rockColors[i % rockColors.length];
      ctx.fillRect(rx, ry, 3, 3);
    }
  } else if (apronMat === 'asphalt_paved') {
    // 🛣️ Deep charcoal paved tarmac asphalt
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(left, top, width, height);
    // Yellow hazard perimeter safety curb
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 3;
    ctx.strokeRect(left + 6, top + 6, width - 12, height - 12);
  } else {
    // ⚽ Pristine natural grass lawn apron (default)
    ctx.fillStyle = '#166534';
    ctx.fillRect(left, top, width, height);
    // Mower striping
    ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
    for (let y = top; y < top + height; y += 80) {
      ctx.fillRect(left, y, width, 40);
    }
  }

  // 2. ATHLETICS RUNNING TRACK (Encircles the pitch when enabled or on round/oval)
  if (hasTrack) {
    const isSyntheticBlue = tier === 'monumental' || stadiumDef?.stands?.north?.grade === 'grade4_modern' || stadiumDef?.stands?.north?.grade === 'grade5_futuristic';
    const trackColor = isSyntheticBlue ? '#1e3a5f' : '#873d2f';
    const trackBorder = isSyntheticBlue ? '#0f223a' : '#6f2d22';

    const cx = PITCH_CONFIG.CENTER_X;
    const cy = PITCH_CONFIG.CENTER_Y;
    const laneCount = 8;
    const laneSpacing = 14;
    const trackWidthTotal = laneCount * laneSpacing;

    if (shape === 'round') {
      // 🏟️ CONTINUOUS ROUND / CIRCULAR RUNNING TRACK (Coliseum style)
      // Wraps in a smooth rounded stadium curve between pitch and stands
      const rX = PITCH_CONFIG.FIELD_WIDTH / 2 + 130;
      const rY = PITCH_CONFIG.FIELD_HEIGHT / 2 + 130;

      // Outer track bed
      ctx.strokeStyle = trackColor;
      ctx.lineWidth = trackWidthTotal;
      ctx.beginPath();
      drawSafeEllipse(ctx, cx, cy, rX, rY, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Outer dark curb
      ctx.strokeStyle = trackBorder;
      ctx.lineWidth = 3;
      ctx.beginPath();
      drawSafeEllipse(ctx, cx, cy, rX + trackWidthTotal / 2, rY + trackWidthTotal / 2, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Inner white boundary
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      drawSafeEllipse(ctx, cx, cy, rX - trackWidthTotal / 2, rY - trackWidthTotal / 2, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Multi-lane concentric divider lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([14, 10]);
      for (let l = 1; l < laneCount; l++) {
        const lrX = rX - trackWidthTotal / 2 + l * laneSpacing;
        const lrY = rY - trackWidthTotal / 2 + l * laneSpacing;
        ctx.beginPath();
        drawSafeEllipse(ctx, cx, cy, lrX, lrY, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    } else if (shape === 'oval') {
      // 🏟️ OLYMPIC OVAL ATHLETICS TRACK (Straight touchlines + semicircular horseshoe end arcs)
      const pLeft = PITCH_CONFIG.PITCH_LEFT;
      const pRight = PITCH_CONFIG.PITCH_RIGHT;
      const pTop = PITCH_CONFIG.PITCH_TOP;
      const pBottom = PITCH_CONFIG.PITCH_BOTTOM;

      // Track bounding offset
      const tX = 90;
      const tY = 110;

      // Draw straight touchlines & curved goal end-curves
      ctx.strokeStyle = trackColor;
      ctx.lineWidth = trackWidthTotal;
      ctx.beginPath();
      // West straight
      ctx.moveTo(pLeft - tX, pTop);
      ctx.lineTo(pLeft - tX, pBottom);
      // South semicircular bend
      ctx.arc(cx, pBottom, cx - (pLeft - tX), 0, Math.PI);
      // East straight
      ctx.lineTo(pRight + tX, pTop);
      // North semicircular bend
      ctx.arc(cx, pTop, cx - (pLeft - tX), Math.PI, 0);
      ctx.closePath();
      ctx.stroke();

      // Lane lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([14, 10]);
      for (let l = 1; l < laneCount; l++) {
        const offset = -trackWidthTotal / 2 + l * laneSpacing;
        const currR = cx - (pLeft - tX) + offset;
        ctx.beginPath();
        ctx.moveTo(pLeft - tX + offset, pTop);
        ctx.lineTo(pLeft - tX + offset, pBottom);
        ctx.arc(cx, pBottom, currR, 0, Math.PI);
        ctx.lineTo(pRight + tX - offset, pTop);
        ctx.arc(cx, pTop, currR, Math.PI, 0);
        ctx.closePath();
        ctx.stroke();
      }
      ctx.setLineDash([]);
    } else {
      // Rectangular / Square Stadium running track
      ctx.fillStyle = trackColor;
      // West track strip
      ctx.fillRect(left + 20, top + 20, trackWidthTotal, height - 40);
      // East track strip
      ctx.fillRect(left + width - 20 - trackWidthTotal, top + 20, trackWidthTotal, height - 40);
      // North track strip
      ctx.fillRect(left + 20, top + 20, width - 40, trackWidthTotal);
      // South track strip
      ctx.fillRect(left + 20, top + height - 20 - trackWidthTotal, width - 40, trackWidthTotal);

      // Lane dividers
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([16, 12]);
      for (let l = 1; l <= laneCount; l++) {
        const inset = 20 + l * laneSpacing;
        ctx.strokeRect(left + inset, top + inset, width - inset * 2, height - inset * 2);
      }
      ctx.setLineDash([]);
    }

    // Long Jump / Triple Jump Sand Pit along West touchline apron
    const pitX = left + 32;
    const pitY = PITCH_CONFIG.CENTER_Y - 140;
    ctx.fillStyle = '#1c1917'; // Concrete border
    ctx.fillRect(pitX - 2, pitY - 2, 18, 124);
    ctx.fillStyle = '#fde047'; // Sand
    ctx.fillRect(pitX, pitY, 14, 120);
    ctx.fillStyle = '#ffffff'; // Takeoff board
    ctx.fillRect(pitX, pitY + 100, 14, 4);
  }

  ctx.restore();
}

/**
 * Grandstands Enclosure: West, East, North, South & 4 Corners (Phase 13.2 & 15.5)
 * Enforces DISTINCTIVE ARCHITECTURAL SHAPES in Full Pitch View:
 * - Rectangular: 4 standalone rectangular stands with sharp 90° corner gaps & gable roofs
 * - Square: 4 symmetric rectilinear stands + four 45° angled corner pavilion towers with diamond seating
 * - Round: Continuous coliseum circular bowl with outward-bowing touchlines & sweeping radial quarter-circle seating
 * - Oval: Straight touchlines + sweeping semicircular horseshoe endzone grandstands behind goals
 */
function drawTouchlineAndCornerStands(
  ctx: CanvasRenderingContext2D,
  stadiumDef?: StadiumDefinition,
  tier: StadiumTier = 'monumental',
  timeOfDay: TimeOfDay = 'night',
  homeKit: TeamKit = HOME_KIT,
  awayKit: TeamKit = AWAY_KIT,
  graphicsSettings?: GraphicsSettings
) {
  const left = PITCH_CONFIG.PITCH_LEFT;
  const right = PITCH_CONFIG.PITCH_RIGHT;
  const top = PITCH_CONFIG.PITCH_TOP;
  const bottom = PITCH_CONFIG.PITCH_BOTTOM;
  const stands = stadiumDef?.stands;
  const shape: StadiumShape = stadiumDef?.shape || (tier === 'monumental' ? 'oval' : 'rectangular');
  const surroundings = stadiumDef?.surroundings || (tier === 'monumental' ? 'big_city' : tier === 'craven' ? 'small_city' : 'mountains');

  ctx.save();

  // WEST STAND (Touchline Left - hosts Dugouts & Tunnel)
  const westStand = stands?.west || {
    position: 'west',
    type: 'tiered',
    grade: tier === 'monumental' ? 'grade4_modern' : tier === 'craven' ? 'grade2_classic' : 'grade1_municipal',
    tierCount: 2,
    primaryColor: homeKit.primaryColor,
    secondaryColor: homeKit.secondaryColor,
  };
  drawSingleTouchlineStand(ctx, westStand, left - 180, top - 80, 80, PITCH_CONFIG.FIELD_HEIGHT + 160, 'west', homeKit, awayKit, shape, timeOfDay, surroundings);

  // EAST STAND (Touchline Right)
  const eastStand = stands?.east || {
    position: 'east',
    type: 'tiered',
    grade: tier === 'monumental' ? 'grade4_modern' : tier === 'craven' ? 'grade2_classic' : 'grade1_municipal',
    tierCount: 2,
    primaryColor: homeKit.primaryColor,
    secondaryColor: homeKit.secondaryColor,
  };
  drawSingleTouchlineStand(ctx, eastStand, right + 100, top - 80, 80, PITCH_CONFIG.FIELD_HEIGHT + 160, 'east', homeKit, awayKit, shape, timeOfDay, surroundings);

  // NORTH STAND (Behind Top Goal)
  const northStand = stands?.north || {
    position: 'north',
    type: 'tiered',
    grade: tier === 'monumental' ? 'grade4_modern' : tier === 'craven' ? 'grade2_classic' : 'grade1_municipal',
    tierCount: 2,
    primaryColor: homeKit.primaryColor,
    secondaryColor: homeKit.secondaryColor,
  };
  drawGoalEndStand(ctx, northStand, left - 90, top - 180, PITCH_CONFIG.FIELD_WIDTH + 180, 80, 'north', homeKit, awayKit, shape, timeOfDay, surroundings);

  // SOUTH STAND (Behind Bottom Goal)
  const southStand = stands?.south || {
    position: 'south',
    type: 'tiered',
    grade: tier === 'monumental' ? 'grade4_modern' : tier === 'craven' ? 'grade2_classic' : 'grade1_municipal',
    tierCount: 2,
    primaryColor: homeKit.primaryColor,
    secondaryColor: homeKit.secondaryColor,
  };
  drawGoalEndStand(ctx, southStand, left - 90, bottom + 100, PITCH_CONFIG.FIELD_WIDTH + 180, 80, 'south', homeKit, awayKit, shape, timeOfDay, surroundings);

  // 4 CORNER QUADRANTS (NW, NE, SW, SE)
  drawCornerQuadrantStands(ctx, stadiumDef, left, right, top, bottom, homeKit, awayKit, shape, timeOfDay);

  ctx.restore();
}

/**
 * Phase 15.6: 32-Bit Architectural Touchline Grandstand (West or East)
 * Features grounded concrete foundations with drop-shadows onto the apron,
 * stepped riser/tread rake geometry, gangway stairs with white/yellow nosing,
 * recessed vomitory crowd portals with illuminated exit signs, cantilever steel trusses,
 * and authentic 32-bit pixel materials for all 5 grades.
 */
function drawSingleTouchlineStand(
  ctx: CanvasRenderingContext2D,
  stand: StandConfig,
  x: number,
  y: number,
  w: number,
  h: number,
  side: 'west' | 'east',
  homeKit: TeamKit,
  awayKit: TeamKit,
  shape: StadiumShape = 'rectangular',
  timeOfDay: TimeOfDay = 'night',
  surroundings: SurroundingsType = 'big_city'
) {
  if (stand.type === 'none' || stand.type === 'no_stand') {
    drawNoStandPerimeterAndBackdrop(ctx, stand, x, y, w, h, side, surroundings, timeOfDay);
    return;
  }

  const palette = getStandGradePalette(stand.grade);
  const primaryCol = stand.primaryColor || homeKit.primaryColor;
  const secondaryCol = stand.secondaryColor || homeKit.secondaryColor;
  const isNight = timeOfDay === 'night' || timeOfDay === 'sunset';

  // ---------------------------------------------------------------------------
  // 1. PHYSICAL GROUNDING PLINTH & APRON DROP-SHADOW (Eliminates "floating sign")
  // ---------------------------------------------------------------------------
  ctx.save();
  // Deep apron shadow cast beneath the front base of the stand
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  const shadowX = side === 'west' ? x + w : x - 12;
  ctx.fillRect(shadowX, y - 6, 12, h + 12);

  // Heavy reinforced concrete foundation footing curb
  const plinthX = side === 'west' ? x + w - 7 : x;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(plinthX, y - 4, 7, h + 8);
  ctx.fillStyle = '#334155';
  ctx.fillRect(side === 'west' ? plinthX + 5 : plinthX, y - 4, 2, h + 8); // Beveled curb highlight

  // ---------------------------------------------------------------------------
  // 2. MAIN STRUCTURAL SHELL & REAR WALL
  // ---------------------------------------------------------------------------
  if (shape === 'round') {
    // Bowing Coliseum touchline curve
    const bowOffset = side === 'west' ? -35 : 35;
    ctx.fillStyle = palette.primaryWall;
    ctx.beginPath();
    ctx.moveTo(x, y);
    if (typeof ctx.quadraticCurveTo === 'function') {
      ctx.quadraticCurveTo(x + bowOffset, y + h / 2, x, y + h);
    } else {
      ctx.lineTo(x, y + h);
    }
    ctx.lineTo(x + w, y + h);
    if (typeof ctx.quadraticCurveTo === 'function') {
      ctx.quadraticCurveTo(x + w + bowOffset, y + h / 2, x + w, y);
    } else {
      ctx.lineTo(x + w, y);
    }
    ctx.closePath();
    ctx.fill();
  } else {
    // Standard Rectilinear Solid Concrete / Masonry Shell
    ctx.fillStyle = palette.primaryWall;
    ctx.fillRect(x, y, w, h);
  }

  // ---------------------------------------------------------------------------
  // 3. 32-BIT MATERIAL FAÇADE TEXTURING ACCORDING TO STAND GRADE
  // ---------------------------------------------------------------------------
  if (stand.grade === 'grade1_municipal' || stand.grade === 'grade1_historic_timber') {
    // 🪵 Grade 1: Weathered timber planks with grain, nail rivets, and cinderblock mortar
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 1;
    for (let by = y + 10; by < y + h; by += 16) {
      ctx.beginPath();
      ctx.moveTo(x, by);
      ctx.lineTo(x + w, by);
      ctx.stroke();
      // Nail studs at timber joints
      ctx.fillStyle = '#44403c';
      ctx.fillRect(x + 8, by - 2, 2, 2);
      ctx.fillRect(x + w - 10, by - 2, 2, 2);
    }
    // Wooden structural cross-bracing on rear wall
    const rearX = side === 'west' ? x + 2 : x + w - 14;
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2;
    for (let my = y + 10; my < y + h - 30; my += 30) {
      ctx.beginPath();
      ctx.moveTo(rearX, my);
      ctx.lineTo(rearX + 12, my + 30);
      ctx.moveTo(rearX + 12, my);
      ctx.lineTo(rearX, my + 30);
      ctx.stroke();
    }
  } else if (stand.grade === 'grade2_classic') {
    // 🧱 Grade 2: Victorian Red-Brick Masonry Courses & Archibald Leitch Steel Trusses
    ctx.fillStyle = '#b91c1c';
    for (let by = y + 6; by < y + h; by += 10) {
      ctx.fillRect(x + 2, by, w - 4, 1.5);
    }
    // Cream sandstone decorative belt / stringcourse
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(x + 2, y + h * 0.33, w - 4, 3);
    ctx.fillRect(x + 2, y + h * 0.66, w - 4, 3);

    // Archibald Leitch Criss-Cross Steel Lattice Girders (Classic English Touchline Balustrade)
    const gX = side === 'west' ? x + w - 14 : x + 2;
    ctx.strokeStyle = '#15803d'; // Forest green painted iron
    ctx.lineWidth = 1.5;
    for (let ly = y + 10; ly < y + h - 20; ly += 20) {
      ctx.strokeRect(gX, ly, 12, 20);
      ctx.beginPath();
      ctx.moveTo(gX, ly);
      ctx.lineTo(gX + 12, ly + 20);
      ctx.moveTo(gX + 12, ly);
      ctx.lineTo(gX, ly + 20);
      ctx.stroke();
    }
  } else if (stand.grade === 'grade3_industrial' || stand.grade === 'grade3_steel_cantilever') {
    // 🏭 Grade 3: Corrugated Dark Gunmetal Steel with Riveted I-Beams & Diagonal Hazard Tape
    ctx.fillStyle = '#0f172a';
    for (let flX = x + 6; flX < x + w - 6; flX += 6) {
      ctx.fillRect(flX, y, 2, h);
    }
    // Heavy Steel Vertical Structural Columns with Rivet Bolts
    const colX = side === 'west' ? x + 4 : x + w - 12;
    ctx.fillStyle = '#334155';
    ctx.fillRect(colX, y, 8, h);
    ctx.fillStyle = '#94a3b8'; // Silver rivet heads
    for (let ry = y + 8; ry < y + h; ry += 16) {
      ctx.fillRect(colX + 2, ry, 2, 2);
      ctx.fillRect(colX + 5, ry, 2, 2);
    }
    // High-contrast diagonal hazard safety stripes on front fascia
    const hazX = side === 'west' ? x + w - 6 : x;
    ctx.fillStyle = '#facc15';
    ctx.fillRect(hazX, y, 6, h);
    ctx.fillStyle = '#000000';
    for (let hy = y; hy < y + h; hy += 14) {
      ctx.fillRect(hazX, hy, 6, 7);
    }
  } else if (stand.grade === 'grade4_modern') {
    // 🏢 Grade 4: Pre-cast Modular Architectural Concrete Panels & VIP Glass Skyboxes
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    for (let py = y + 30; py < y + h; py += 50) {
      ctx.beginPath();
      ctx.moveTo(x, py);
      ctx.lineTo(x + w, py);
      ctx.stroke();
    }
    // VIP Hospitality Executive Skybox Suites (Glass curtain with interior warm lounge lighting)
    const logeY = y + h * 0.38;
    const logeH = h * 0.24;
    ctx.fillStyle = isNight ? 'rgba(56, 189, 248, 0.45)' : 'rgba(56, 189, 248, 0.25)';
    ctx.fillRect(x + 5, logeY, w - 10, logeH);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 5, logeY, w - 10, logeH);

    // Interior VIP lounge silhouettes & pendant chandeliers
    if (isNight) {
      ctx.fillStyle = '#fef08a';
      for (let ly = logeY + 6; ly < logeY + logeH - 6; ly += 14) {
        ctx.fillRect(x + w / 2 - 2, ly, 4, 3);
      }
    }
  } else if (stand.grade === 'grade5_futuristic') {
    // 🚀 Grade 5: Titanium Aero-Panels, Translucent ETFE Pneumatic Cushions & Active LED Ribbon
    // Animated glowing digital matrix ribbon
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(side === 'west' ? x + w - 5 : x, y, 5, h);
    ctx.fillStyle = '#06b6d4';
    for (let cy = y; cy < y + h; cy += 12) {
      ctx.fillRect(side === 'west' ? x + w - 5 : x, cy, 5, 4);
    }
    // Translucent ETFE cushions with hexagonal tension framework
    ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
    for (let ey = y + 10; ey < y + h - 10; ey += 40) {
      ctx.fillRect(x + 6, ey, w - 12, 32);
      ctx.strokeStyle = 'rgba(147, 197, 253, 0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 6, ey, w - 12, 32);
    }
  }

  // ---------------------------------------------------------------------------
  // 4. STEPPED RAKE GEOMETRY, GANGWAY STAIRWAYS & VOMITORY ACCESS PORTALS
  // ---------------------------------------------------------------------------
  const tierCount = stand.tierCount || (stand.tiers ? stand.tiers.length : 2);
  const tierWidth = (w - 12) / tierCount;

  for (let t = 0; t < tierCount; t++) {
    const curX = side === 'west' ? (x + t * tierWidth + 4) : (x + (tierCount - 1 - t) * tierWidth + 4);
    const tierRakeColor = t % 2 === 0 ? palette.secondaryWall : palette.stepTexture;

    // Rake Tread Decking
    ctx.fillStyle = tierRakeColor;
    ctx.fillRect(curX, y + 2, tierWidth - 2, h - 4);

    // Stepped Riser Shadow Lip (3D terracing depth)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(side === 'west' ? curX + tierWidth - 4 : curX, y + 2, 2, h - 4);

    // Front safety balustrade railing
    ctx.fillStyle = palette.balustrade;
    ctx.fillRect(side === 'west' ? curX + tierWidth - 2 : curX, y + 2, 2, h - 4);

    // Gangway Stair Aisle (High-visibility steps cutting down the terrace)
    const gangwayY1 = y + h * 0.25;
    const gangwayY2 = y + h * 0.75;
    const gangways = [gangwayY1, gangwayY2];

    for (const gy of gangways) {
      // Concrete stair gap
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(curX + 2, gy - 6, tierWidth - 6, 12);

      // Bright yellow / white stair nosing lines
      ctx.fillStyle = '#facc15';
      for (let stepY = gy - 5; stepY <= gy + 5; stepY += 3) {
        ctx.fillRect(curX + 3, stepY, tierWidth - 8, 1);
      }

      // Center handrail
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(curX + (tierWidth - 6) / 2, gy - 6, 2, 12);
    }

    // -------------------------------------------------------------------------
    // VOMITORY PORTAL (Recessed crowd entrance tunnel into seating bowl)
    // -------------------------------------------------------------------------
    const vomY = y + h * 0.5 - 12;
    const vomW = Math.max(10, tierWidth - 4);
    const vomH = 24;

    // Dark interior tunnel portal void
    ctx.fillStyle = '#020617';
    ctx.fillRect(curX + 2, vomY, vomW, vomH);

    // Concrete arched / rectangular frame
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(curX + 2, vomY, vomW, vomH);

    // Illuminated Green Emergency Exit Lamp above portal
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(curX + vomW / 2 - 3, vomY - 3, 6, 2.5);

    // Handrail gate at vomitory opening
    ctx.strokeStyle = palette.balustrade;
    ctx.lineWidth = 1;
    ctx.strokeRect(curX + 2, vomY + vomH - 3, vomW, 3);

    // Spectator Seating Rows (Fans seated in tiers, skipping gangways & vomitories)
    for (let sy = y + 8; sy < y + h - 8; sy += 12) {
      // Skip if intersecting gangway or vomitory portal
      if (Math.abs(sy - gangwayY1) < 8 || Math.abs(sy - gangwayY2) < 8 || Math.abs(sy - (y + h * 0.5)) < 16) {
        continue;
      }
      const fanCol = ((sy * 7 + t * 13) % 2 === 0) ? primaryCol : secondaryCol;
      ctx.fillStyle = fanCol;
      ctx.fillRect(curX + 2, sy + 3, Math.min(8, tierWidth - 5), 5);
      // Pixel spectator face / cap
      ctx.fillStyle = '#f5c898';
      ctx.fillRect(curX + 3, sy, 3, 3);
    }
  }

  // ---------------------------------------------------------------------------
  // 5. CANTILEVER STEEL ROOF CANOPY & OVERHANG SHADOW
  // ---------------------------------------------------------------------------
  if (stand.hasRoof !== false) {
    const roofX = side === 'west' ? x + w - 18 : x;
    const roofW = 18;

    // Cantilever steel lattice gantry beams extending from rear wall
    ctx.strokeStyle = palette.roofPurlin;
    ctx.lineWidth = 2;
    for (let ry = y + 10; ry < y + h; ry += 35) {
      ctx.beginPath();
      ctx.moveTo(side === 'west' ? x : x + w, ry);
      ctx.lineTo(side === 'west' ? x + w : x, ry);
      ctx.stroke();
    }

    // Heavy roof purlin / fascia girder
    ctx.fillStyle = palette.roofPurlin;
    ctx.fillRect(roofX, y - 2, roofW, h + 4);

    // Suspended PA Loudspeaker Clusters
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(side === 'west' ? x + w - 12 : x + 6, y + h * 0.3, 5, 8);
    ctx.fillRect(side === 'west' ? x + w - 12 : x + 6, y + h * 0.7, 5, 8);

    // Deep 32-bit pixel shadow cast from canopy down onto upper seating rows
    ctx.fillStyle = 'rgba(0, 0, 0, 0.40)';
    ctx.fillRect(side === 'west' ? x + w - 28 : x + 18, y, 10, h);
  }

  ctx.restore();
}

/**
 * Phase 15.6: 32-Bit Architectural Goal-End Grandstand (North or South)
 * Supports both Rectilinear (Rectangular/Square) and Sweeping Semicircular (Oval/Round)
 * bowls with realistic stepped terracing, gangway stair nosing, vomitory portals,
 * and structural cantilever canopies.
 */
function drawGoalEndStand(
  ctx: CanvasRenderingContext2D,
  stand: StandConfig,
  x: number,
  y: number,
  w: number,
  h: number,
  end: 'north' | 'south',
  homeKit: TeamKit,
  awayKit: TeamKit,
  shape: StadiumShape = 'rectangular',
  timeOfDay: TimeOfDay = 'night',
  surroundings: SurroundingsType = 'big_city'
) {
  if (stand.type === 'none' || stand.type === 'no_stand') {
    drawNoStandPerimeterAndBackdrop(ctx, stand, x, y, w, h, end, surroundings, timeOfDay);
    return;
  }

  const palette = getStandGradePalette(stand.grade);
  const primaryCol = stand.primaryColor || homeKit.primaryColor;
  const secondaryCol = stand.secondaryColor || homeKit.secondaryColor;
  const isNight = timeOfDay === 'night' || timeOfDay === 'sunset';

  ctx.save();

  // 1. Apron Grounding Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  const shadowY = end === 'north' ? y + h : y - 10;
  ctx.fillRect(x - 8, shadowY, w + 16, 10);

  if (shape === 'oval' || shape === 'round') {
    // -------------------------------------------------------------------------
    // 🏟️ SWEEPING SEMICIRCULAR HORSESHOE ENDZONE BOWL
    // -------------------------------------------------------------------------
    const cx = PITCH_CONFIG.CENTER_X;
    const curveR = w / 2;

    // Concrete Bowl Shell
    ctx.fillStyle = palette.primaryWall;
    ctx.beginPath();
    if (end === 'north') {
      ctx.arc(cx, y + h, curveR, Math.PI, 0);
    } else {
      ctx.arc(cx, y, curveR, 0, Math.PI);
    }
    ctx.closePath();
    ctx.fill();

    // Concentric Stepped Seating Rows with Rake Depth
    const rowCount = 5;
    for (let r = 0; r < rowCount; r++) {
      const rowR = curveR - r * 14 - 10;
      // Riser dark lip
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.lineWidth = 10;
      ctx.beginPath();
      if (end === 'north') {
        ctx.arc(cx, y + h, rowR + 1, Math.PI + 0.08, -0.08);
      } else {
        ctx.arc(cx, y, rowR + 1, 0.08, Math.PI - 0.08);
      }
      ctx.stroke();

      // Colored bucket seat tread
      ctx.strokeStyle = r % 2 === 0 ? primaryCol : secondaryCol;
      ctx.lineWidth = 7;
      ctx.beginPath();
      if (end === 'north') {
        ctx.arc(cx, y + h, rowR, Math.PI + 0.08, -0.08);
      } else {
        ctx.arc(cx, y, rowR, 0.08, Math.PI - 0.08);
      }
      ctx.stroke();
    }

    // Radial Gangway Aisles & Vomitories
    const angles = end === 'north' ? [Math.PI * 1.25, Math.PI * 1.5, Math.PI * 1.75] : [Math.PI * 0.25, Math.PI * 0.5, Math.PI * 0.75];
    for (const ang of angles) {
      const vX = cx + Math.cos(ang) * (curveR * 0.65);
      const vY = (end === 'north' ? y + h : y) + Math.sin(ang) * (curveR * 0.65);
      // Vomitory dark portal
      ctx.fillStyle = '#020617';
      ctx.fillRect(vX - 8, vY - 6, 16, 12);
      ctx.fillStyle = '#22c55e'; // Exit sign
      ctx.fillRect(vX - 3, vY - 8, 6, 2);
    }

    // Curved Cantilever Canopy
    if (stand.hasRoof !== false) {
      ctx.strokeStyle = palette.roofPurlin;
      ctx.lineWidth = 8;
      ctx.beginPath();
      if (end === 'north') {
        ctx.arc(cx, y + h, curveR + 2, Math.PI, 0);
      } else {
        ctx.arc(cx, y, curveR + 2, 0, Math.PI);
      }
      ctx.stroke();
    }

  } else {
    // -------------------------------------------------------------------------
    // 🏟️ RECTILINEAR GOAL-END GRANDSTAND
    // -------------------------------------------------------------------------
    // Foundation plinth
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x, end === 'north' ? y + h - 6 : y, w, 6);

    // Concrete / Brick Structure
    ctx.fillStyle = palette.primaryWall;
    ctx.fillRect(x, y, w, h);

    // 3 Stepped Seating Tiers
    const tierH = (h - 12) / 3;
    for (let t = 0; t < 3; t++) {
      const ty = y + t * tierH + 2;
      ctx.fillStyle = palette.secondaryWall;
      ctx.fillRect(x + 4, ty, w - 8, tierH - 2);

      // Front balustrade
      ctx.fillStyle = palette.balustrade;
      ctx.fillRect(x + 4, ty + tierH - 3, w - 8, 2);

      // Gangway stairs cutting through tier
      for (let gx = x + w * 0.25; gx < x + w; gx += w * 0.25) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(gx - 6, ty, 12, tierH - 2);
        ctx.fillStyle = '#facc15';
        for (let sy = ty; sy < ty + tierH - 2; sy += 3) {
          ctx.fillRect(gx - 5, sy, 10, 1);
        }
      }

      // Seated supporters
      for (let sx = x + 16; sx < x + w - 16; sx += 18) {
        // Skip gangways
        if ((sx - x) % Math.floor(w * 0.25) < 18) continue;
        ctx.fillStyle = sx % 2 === 0 ? primaryCol : secondaryCol;
        ctx.fillRect(sx, ty + 2, 7, 5);
        ctx.fillStyle = '#f5c898';
        ctx.fillRect(sx + 2, ty - 1, 3, 3);
      }
    }

    // Vomitories on middle tier
    const midTy = y + tierH + 2;
    for (let vx = x + w * 0.35; vx <= x + w * 0.65; vx += w * 0.3) {
      ctx.fillStyle = '#020617';
      ctx.fillRect(vx - 8, midTy, 16, tierH - 2);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(vx - 4, midTy - 3, 8, 2);
    }

    // Cantilever Roof Truss
    if (stand.hasRoof !== false) {
      const roofY = end === 'north' ? y + h - 8 : y;
      ctx.fillStyle = palette.roofPurlin;
      ctx.fillRect(x, roofY, w, 8);

      // Diagonal roof cross-braces
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      for (let rx = x + 20; rx < x + w - 20; rx += 40) {
        ctx.beginPath();
        ctx.moveTo(rx, roofY);
        ctx.lineTo(rx + 20, roofY + 8);
        ctx.lineTo(rx + 40, roofY);
        ctx.stroke();
      }
    }
  }

  ctx.restore();
}

/**
 * Phase 15.6: 32-Bit Corner Quadrant Stands & Pavilions
 */
function drawCornerQuadrantStands(
  ctx: CanvasRenderingContext2D,
  stadiumDef: StadiumDefinition | undefined,
  left: number,
  right: number,
  top: number,
  bottom: number,
  homeKit: TeamKit,
  awayKit: TeamKit,
  shape: StadiumShape = 'rectangular',
  timeOfDay: TimeOfDay = 'night'
) {
  const corners = [
    { pos: 'corner_nw' as const, x: left - 180, y: top - 180, w: 90, h: 100 },
    { pos: 'corner_ne' as const, x: right + 90, y: top - 180, w: 90, h: 100 },
    { pos: 'corner_sw' as const, x: left - 180, y: bottom + 80, w: 90, h: 100 },
    { pos: 'corner_se' as const, x: right + 90, y: bottom + 80, w: 90, h: 100 },
  ];

  for (const c of corners) {
    const stand = stadiumDef?.stands?.[c.pos];
    if (stand && stand.type !== 'none' && stand.type !== 'no_stand') {
      const palette = getStandGradePalette(stand.grade);

      if (shape === 'square') {
        // 🏰 SQUARE: 45° Angled Corner Pavilion Towers with diamond seating
        ctx.save();
        ctx.fillStyle = palette.primaryWall;
        ctx.beginPath();
        if (c.pos === 'corner_nw') {
          ctx.moveTo(c.x, c.y + c.h);
          ctx.lineTo(c.x + c.w, c.y);
          ctx.lineTo(c.x + c.w, c.y + c.h);
        } else if (c.pos === 'corner_ne') {
          ctx.moveTo(c.x, c.y);
          ctx.lineTo(c.x + c.w, c.y + c.h);
          ctx.lineTo(c.x, c.y + c.h);
        } else if (c.pos === 'corner_sw') {
          ctx.moveTo(c.x, c.y);
          ctx.lineTo(c.x + c.w, c.y + c.h);
          ctx.lineTo(c.x + c.w, c.y);
        } else {
          ctx.moveTo(c.x, c.y + c.h);
          ctx.lineTo(c.x + c.w, c.y);
          ctx.lineTo(c.x, c.y);
        }
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = palette.balustrade;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();
      } else if (shape === 'round') {
        // 🏟️ ROUND: Continuous quarter-circle radial seating sweep
        ctx.save();
        ctx.fillStyle = palette.primaryWall;
        ctx.beginPath();
        const cornerCenterX = c.pos.includes('w') ? c.x + c.w : c.x;
        const cornerCenterY = c.pos.includes('n') ? c.y + c.h : c.y;
        ctx.arc(cornerCenterX, cornerCenterY, 80, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        // RECTANGULAR: Traditional standalone corner quadrant with ground plinth
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(c.x - 2, c.y - 2, c.w + 4, c.h + 4);
        ctx.fillStyle = palette.primaryWall;
        ctx.fillRect(c.x, c.y, c.w, c.h);
        ctx.fillStyle = palette.stepTexture;
        ctx.fillRect(c.x + 4, c.y + 4, c.w - 8, c.h - 8);

        // Supporters waving scarves
        for (let cy = c.y + 10; cy < c.y + c.h - 10; cy += 14) {
          for (let cx = c.x + 8; cx < c.x + c.w - 8; cx += 12) {
            ctx.fillStyle = homeKit.primaryColor;
            ctx.fillRect(cx, cy + 3, 5, 5);
            ctx.fillStyle = '#f5c898';
            ctx.fillRect(cx + 1, cy, 3, 3);
          }
        }
      }
    }
  }
}

/**
 * Phase 15.6: Elaborate 32-Bit "No Stand" Perimeter & Contextual Backdrop Engine
 * When a user selects "No Stand" for any side (Touchlines West/East, or Goal-Ends North/South):
 * 1. Renders authentic perimeter boundaries (Chainlink, Brick Wall, Concrete Wall, Timber, Hedge)
 * 2. Renders high-flavor 32-bit pixel art surroundings behind the perimeter:
 *    - Residential: Victorian terraced houses, slate roofs, chimneys with smoke puffs, flowerboxes
 *    - Commercial: Multi-story shops with awnings, neon signs, water towers, fire escapes
 *    - Trees / Park: Dense pine & oak forest, park benches, antique lampposts, walking path
 *    - Hills / Mountains: Alpine ridgelines, rocky crags, switchback road, pine trees
 *    - Water / Harbor: Stone canal embankment, turquoise waves, wooden boat pier with yachts
 *    - Highway: Asphalt motorway with concrete barriers, overhead signs, moving pixel cars
 *    - Train / Railroad: Twin steel tracks with gravel ballast, signal lights, catenary wire
 *    - Airport: Tarmac runway, blue taxiway lights, aircraft hangar, passing regional jet
 *    - Parking Lot: Tarmac bays, parked spectator cars, team coach buses, queueing crowds
 *    - Open: Countryside meadows, split-rail fence, telephone poles with sagging wire lines
 * 3. Spectator crowd leaning on perimeter rail with scarves, banners, and drinks!
 */
/**
 * =============================================================================
 * PHASE 15.7: FLAVOR-RICH "NO STAND" ATMOSPHERIC BACKDROPS & MULTI-MATERIAL PERIMETERS
 * =============================================================================
 *
 * When any stand (East, West, North, or South) is configured as 'none' / 'no_stand':
 * 1. 15.7.1 Atmospheric Contextual Backdrops tied directly to Surroundings:
 *    - Mountains: Alpine peaks, perpetual snow dust, pine foothills, ski chalets with smoking chimneys, cable car pylons
 *    - Forest: Dense multi-layered woodland canopy, evergreen & golden birch, fire access roads, ranger lookout towers, log fencing
 *    - Savannah: Golden grassy plains, red sandstone kopjes, umbrella acacia trees, safari tracks, wildlife silhouettes, thornbush kraals
 *    - Highway: Elevated concrete freeway, overhead sign gantries, guardrails, streaming headlights & taillights
 *    - Small City: 2-story Victorian red-brick townhouses with slate roofs & chimneys, clock tower, bakery, streetlamps
 *    - Big City: Towering glass/steel skyscrapers, corporate logos, rooftop communication masts, red aviation warning strobes, elevated metro rail
 *    - Airport: Active tarmac runway, threshold piano keys, approach lighting, hangars, radar dome tower, fuel trucks, commercial airliners
 *    - Railroad: Multi-track freight depot, parallel ballast tracks, switching signals, steel boxcars, container flatbeds, catenary gantries, shunter engines
 *    - Beach: Golden sand dunes, swaying coconut palms, turquoise ocean surf & white foam breakers, wooden boardwalk promenade, beach cabanas
 *    - Marine Floating: Open seawater bay, gentle wave ripples, wooden marina piers, mooring bollards, fishing trawlers, yachts, navigation buoys
 *    - Universal Wall: Custom height (low, medium, tall) & material (brick, concrete, stone, timber, metal cladding)
 *
 * 2. 15.7.2 High-Fidelity Perimeter Wall & Security Barrier Engine:
 *    - chainlink_fence: Galvanized diamond wire mesh, tubular top rail, tension posts, angled brackets with barbed-wire strands
 *    - brick_wall: Flemish-bond red brickwork, weathered mortar, moss patches, beveled stone coping caps
 *    - concrete_wall: Heavy concrete slabs, expansion seams, weep holes, safety stencils & retro graffiti tags
 *    - rustic_timber: Vertical wooden palings with woodgrain, iron nail studs, horizontal cross-timbers
 *    - corrugated_hoarding: Galvanized metal hoarding boards with vertical fluting, retro sponsor advertisements
 *
 * 3. 15.7.3 Grassroots Fan Presence & Touchline Atmosphere:
 *    - Casual standing supporter sprites leaning on the perimeter barrier in club colors, flat caps, waving scarves, holding coffee/beers
 */
function drawNoStandPerimeterAndBackdrop(
  ctx: CanvasRenderingContext2D,
  stand: StandConfig,
  x: number,
  y: number,
  w: number,
  h: number,
  orientation: 'west' | 'east' | 'north' | 'south',
  surroundings: SurroundingsType = 'big_city',
  timeOfDay: TimeOfDay = 'night'
) {
  const isNight = timeOfDay === 'night' || timeOfDay === 'sunset';
  const finish = stand.perimeterFinish || 'chainlink_fence';
  const rawBackdrop = String(stand.backdrop || stand.noStandBackdrop || '');
  const isHoriz = orientation === 'north' || orientation === 'south';

  // Geometry partition: Backdrop area vs Perimeter barrier
  // Barrier sits along the boundary touching the pitch apron
  const barrierDepth = 10;
  let bgX = x;
  let bgY = y;
  let bgW = w;
  let bgH = h;

  let barrierX = x;
  let barrierY = y;
  let barrierW = w;
  let barrierH = h;

  if (orientation === 'north') {
    // Pitch is South: Barrier at bottom of North stand
    barrierY = y + h - barrierDepth;
    barrierH = barrierDepth;
    bgH = Math.max(10, h - barrierDepth);
  } else if (orientation === 'south') {
    // Pitch is North: Barrier at top of South stand
    barrierY = y;
    barrierH = barrierDepth;
    bgY = y + barrierDepth;
    bgH = Math.max(10, h - barrierDepth);
  } else if (orientation === 'west') {
    // Pitch is East: Barrier at right of West stand
    barrierX = x + w - barrierDepth;
    barrierW = barrierDepth;
    bgW = Math.max(10, w - barrierDepth);
  } else {
    // East: Pitch is West: Barrier at left of East stand
    barrierX = x;
    barrierW = barrierDepth;
    bgX = x + barrierDepth;
    bgW = Math.max(10, w - barrierDepth);
  }

  ctx.save();

  // ---------------------------------------------------------------------------
  // 1. BASE TERRAIN GROUND BUFFER
  // ---------------------------------------------------------------------------
  ctx.fillStyle = isNight ? '#0b1322' : '#334155';
  ctx.fillRect(x, y, w, h);

  // ---------------------------------------------------------------------------
  // 2. 15.7.1 ATMOSPHERIC CONTEXTUAL BACKDROP SCENERY (Behind perimeter)
  // ---------------------------------------------------------------------------
  const isWall = rawBackdrop === 'wall' || rawBackdrop.includes('wall');
  const isResidential = !isWall && (rawBackdrop.includes('house') || rawBackdrop.includes('townhouse') || rawBackdrop.includes('clock') || rawBackdrop.includes('bakery') || rawBackdrop.includes('high_street') || rawBackdrop.includes('apartment') || surroundings === 'small_city');
  const isCommercial = !isWall && !isResidential && (rawBackdrop.includes('skyscraper') || rawBackdrop.includes('metro') || rawBackdrop.includes('aviation') || rawBackdrop.includes('mall') || surroundings === 'big_city');
  const isMountains = !isWall && (rawBackdrop.includes('mountain') || rawBackdrop.includes('alpine') || rawBackdrop.includes('chalet') || rawBackdrop.includes('cable') || rawBackdrop.includes('slope') || surroundings === 'mountains' || surroundings === 'nature');
  const isForest = !isWall && (rawBackdrop.includes('forest') || rawBackdrop.includes('woodland') || rawBackdrop.includes('canopy') || rawBackdrop.includes('ranger') || rawBackdrop.includes('trail') || rawBackdrop.includes('log_fencing') || surroundings === 'forest');
  const isSavannah = !isWall && (rawBackdrop.includes('savannah') || rawBackdrop.includes('acacia') || rawBackdrop.includes('kopje') || rawBackdrop.includes('safari') || rawBackdrop.includes('grassland') || rawBackdrop.includes('kraal') || surroundings === 'savannah');
  const isHighway = !isWall && (rawBackdrop.includes('highway') || rawBackdrop.includes('viaduct') || rawBackdrop.includes('interchange') || rawBackdrop.includes('boulevard') || rawBackdrop.includes('gantries') || surroundings === 'highway');
  const isAirport = !isWall && (rawBackdrop.includes('airport') || rawBackdrop.includes('runway') || rawBackdrop.includes('hangar') || rawBackdrop.includes('aircraft') || surroundings === 'airport');
  const isTrain = !isWall && (rawBackdrop.includes('railroad') || rawBackdrop.includes('train') || rawBackdrop.includes('rail') || rawBackdrop.includes('boxcar') || rawBackdrop.includes('depot') || surroundings === 'railroad');
  const isBeach = !isWall && (rawBackdrop.includes('beach') || rawBackdrop.includes('seaside') || rawBackdrop.includes('ocean_surf') || rawBackdrop.includes('surf') || rawBackdrop.includes('cabana') || rawBackdrop.includes('boardwalk') || surroundings === 'beach');
  const isMarine = !isWall && (rawBackdrop.includes('marine') || rawBackdrop.includes('floating') || rawBackdrop.includes('harbor') || rawBackdrop.includes('pontoons') || rawBackdrop.includes('trawler') || surroundings === 'marine_floating');
  const isParking = !isWall && (rawBackdrop.includes('parking') || rawBackdrop.includes('buses') || surroundings === 'parking_lot');

  if (isWall) {
    // 🧱 UNIVERSAL PERIMETER WALL RULE
    const wallSize = stand.wallPerimeter?.size || 'medium';
    const wallMat = stand.wallPerimeter?.material || 'brick';
    const wallHeight = wallSize === 'low' ? 24 : wallSize === 'tall' ? 72 : 46;

    // Outer sky/ground behind the wall
    ctx.fillStyle = isNight ? '#050a18' : '#60a5fa';
    ctx.fillRect(bgX, bgY, bgW, bgH);

    // Wall structure
    let wX = bgX;
    let wY = bgY;
    let wWidth = bgW;
    let wHeight = bgH;

    if (orientation === 'north') {
      wY = bgY + bgH - wallHeight;
      wHeight = wallHeight;
    } else if (orientation === 'south') {
      wHeight = wallHeight;
    } else if (orientation === 'west') {
      wX = bgX + bgW - wallHeight;
      wWidth = wallHeight;
    } else {
      wWidth = wallHeight;
    }

    if (wallMat === 'brick') {
      ctx.fillStyle = isNight ? '#450a0a' : '#7f1d1d';
      ctx.fillRect(wX, wY, wWidth, wHeight);
      // Flemish courses & stone coping
      ctx.fillStyle = isNight ? '#7f1d1d' : '#991b1b';
      for (let cy = wY; cy < wY + wHeight; cy += 8) {
        ctx.fillRect(wX, cy, wWidth, 1.5);
      }
      ctx.fillStyle = '#fef08a'; // Stone coping cap
      ctx.fillRect(wX, wY, isHoriz ? wWidth : 3, isHoriz ? 3 : wHeight);
    } else if (wallMat === 'concrete') {
      ctx.fillStyle = isNight ? '#1e293b' : '#475569';
      ctx.fillRect(wX, wY, wWidth, wHeight);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(wX, wY, isHoriz ? wWidth : 3, isHoriz ? 3 : wHeight);
      // Expansion joints
      ctx.fillStyle = '#0f172a';
      if (isHoriz) {
        for (let jx = wX + 35; jx < wX + wWidth; jx += 40) ctx.fillRect(jx, wY, 2, wHeight);
      } else {
        for (let jy = wY + 35; jy < wY + wHeight; jy += 40) ctx.fillRect(wX, jy, wWidth, 2);
      }
    } else if (wallMat === 'stone') {
      ctx.fillStyle = isNight ? '#292524' : '#57534e';
      ctx.fillRect(wX, wY, wWidth, wHeight);
      ctx.fillStyle = '#78716c';
      for (let sy = wY; sy < wY + wHeight; sy += 12) {
        ctx.fillRect(wX, sy, wWidth, 2);
      }
    } else if (wallMat === 'timber') {
      ctx.fillStyle = isNight ? '#451a03' : '#78350f';
      ctx.fillRect(wX, wY, wWidth, wHeight);
      ctx.fillStyle = '#1c1917';
      for (let ty = wY; ty < wY + wHeight; ty += 10) {
        ctx.fillRect(wX, ty, wWidth, 1.5);
      }
    } else {
      // metal_cladding
      ctx.fillStyle = isNight ? '#1e293b' : '#64748b';
      ctx.fillRect(wX, wY, wWidth, wHeight);
      ctx.fillStyle = '#334155';
      if (isHoriz) {
        for (let mx = wX; mx < wX + wWidth; mx += 8) ctx.fillRect(mx, wY, 2, wHeight);
      } else {
        for (let my = wY; my < wY + wHeight; my += 8) ctx.fillRect(wX, my, wWidth, 2);
      }
    }

  } else if (isMountains) {
    // ⛰️ MOUNTAINS: Jagged alpine peaks, perpetual snow dust, pine foothills, ski chalets with smoking stone chimneys, cable car pylons
    ctx.fillStyle = isNight ? '#050a18' : '#38bdf8';
    ctx.fillRect(bgX, bgY, bgW, bgH);

    // Jagged Granite Peaks with Perpetual Snow Dust
    ctx.fillStyle = isNight ? '#1e293b' : '#64748b';
    const numPeaks = Math.max(3, Math.floor(bgW / 65));
    const peakStep = bgW / numPeaks;
    ctx.beginPath();
    ctx.moveTo(bgX, bgY + bgH);
    for (let i = 0; i < numPeaks; i++) {
      const px = bgX + i * peakStep + peakStep / 2;
      const py = bgY + (i % 2 === 0 ? 8 : 18);
      ctx.lineTo(px, py);
      ctx.lineTo(bgX + (i + 1) * peakStep, bgY + bgH);
    }
    ctx.closePath();
    ctx.fill();

    // Snow caps
    ctx.fillStyle = '#f8fafc';
    for (let i = 0; i < numPeaks; i++) {
      const px = bgX + i * peakStep + peakStep / 2;
      const py = bgY + (i % 2 === 0 ? 8 : 18);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px - 14, py + 14);
      ctx.lineTo(px + 14, py + 14);
      ctx.closePath();
      ctx.fill();
    }

    // Pine Forest Foothills
    ctx.fillStyle = isNight ? '#052e16' : '#15803d';
    for (let fx = bgX + 10; fx < bgX + bgW - 10; fx += 26) {
      ctx.beginPath();
      ctx.arc(fx, bgY + bgH - 14, 12, 0, Math.PI * 2);
      ctx.fill();
    }

    // Wooden Ski Chalet with Smoking Stone Chimney
    const chaletX = bgX + Math.min(60, bgW * 0.3);
    const chaletY = bgY + bgH - 28;
    ctx.fillStyle = '#78350f';
    ctx.fillRect(chaletX, chaletY, 28, 18);
    // Steep pitched chalet roof
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(chaletX - 4, chaletY + 6);
    ctx.lineTo(chaletX + 14, chaletY - 6);
    ctx.lineTo(chaletX + 32, chaletY + 6);
    ctx.fill();
    // Stone chimney & drifting smoke puffs
    ctx.fillStyle = '#57534e';
    ctx.fillRect(chaletX + 20, chaletY - 12, 4, 8);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.fillRect(chaletX + 19, chaletY - 16, 5, 3);
    ctx.fillRect(chaletX + 22, chaletY - 20, 6, 3);

    // Aerial Cable Car Pylon & Gondola Cabin
    const pylonX = bgX + Math.min(bgW - 60, bgW * 0.7);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(pylonX, bgY + 4, 3, bgH - 8);
    ctx.fillRect(pylonX - 10, bgY + 10, 23, 2.5); // Cross-arm
    // Cable line
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bgX, bgY + 12);
    ctx.lineTo(bgX + bgW, bgY + 12);
    ctx.stroke();
    // Hanging red gondola cabin
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(pylonX - 18, bgY + 18, 12, 8);
    ctx.fillStyle = '#38bdf8'; // Window
    ctx.fillRect(pylonX - 16, bgY + 20, 4, 3);

  } else if (isForest) {
    // 🌲 FOREST: Dense multi-layered woodland canopy, evergreen & golden birch, fire access roads, ranger lookout towers, rustic log fencing
    ctx.fillStyle = isNight ? '#03140a' : '#14532d';
    ctx.fillRect(bgX, bgY, bgW, bgH);

    // Multi-layered interlocking tree crowns (pine, spruce, golden birch)
    const forestColors = isNight
      ? ['#052e16', '#022c22', '#064e3b', '#031a0e']
      : ['#166534', '#15803d', '#14532d', '#d97706', '#b45309'];
    for (let fx = bgX + 6; fx < bgX + bgW; fx += 22) {
      for (let fy = bgY + 4; fy < bgY + bgH - 8; fy += 20) {
        const col = forestColors[(fx * 5 + fy * 7) % forestColors.length];
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(fx, fy, 13, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Forest Access Fire Road (dirt track)
    ctx.fillStyle = '#92400e';
    ctx.fillRect(bgX, bgY + bgH - 12, bgW, 8);

    // Elevated Wooden Ranger Lookout Tower
    const towerX = bgX + Math.min(80, bgW * 0.4);
    const towerY = bgY + 6;
    ctx.fillStyle = '#78350f';
    // 4 Stilts
    ctx.fillRect(towerX, towerY + 10, 2, bgH - 18);
    ctx.fillRect(towerX + 16, towerY + 10, 2, bgH - 18);
    // Observation Cabin
    ctx.fillStyle = '#451a03';
    ctx.fillRect(towerX - 3, towerY, 24, 12);
    ctx.fillStyle = '#38bdf8'; // Window glass
    ctx.fillRect(towerX, towerY + 3, 18, 5);
    // Roof
    ctx.fillStyle = '#334155';
    ctx.fillRect(towerX - 5, towerY - 2, 28, 3);

    // Rustic Log Fencing along fire road
    ctx.fillStyle = '#78350f';
    for (let lx = bgX + 10; lx < bgX + bgW - 10; lx += 24) {
      ctx.fillRect(lx, bgY + bgH - 16, 2, 8);
      ctx.fillRect(lx - 4, bgY + bgH - 14, 20, 2);
    }

  } else if (isSavannah) {
    // 🦒 SAVANNAH: Golden grassy plains, red sandstone kopjes, umbrella acacia trees, safari tracks, wildlife silhouettes, thornbush kraals
    ctx.fillStyle = isNight ? '#1c1917' : '#d97706';
    ctx.fillRect(bgX, bgY, bgW, bgH);

    // Distant Red Sandstone Kopje Plateaus
    ctx.fillStyle = isNight ? '#292524' : '#7c2d12';
    ctx.fillRect(bgX + 20, bgY + 4, Math.min(110, bgW * 0.4), 22);
    ctx.fillRect(bgX + bgW - Math.min(100, bgW * 0.35), bgY + 8, Math.min(90, bgW * 0.3), 18);

    // Umbrella Acacia Trees (Flat-topped horizontal circular canopies)
    for (let ax = bgX + 35; ax < bgX + bgW - 20; ax += 70) {
      // Slender angled trunk
      ctx.fillStyle = '#451a03';
      ctx.fillRect(ax + 8, bgY + bgH - 22, 2.5, 14);
      // Flat-topped canopy
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.ellipse(ax + 9, bgY + bgH - 24, 18, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Distant Wildlife Silhouette (Giraffe with tall neck and legs)
    const girX = bgX + Math.min(bgW * 0.6, bgW - 40);
    const girY = bgY + bgH - 28;
    ctx.fillStyle = '#451a03';
    ctx.fillRect(girX, girY, 12, 6); // Body
    ctx.fillRect(girX + 10, girY - 14, 3, 16); // Neck
    ctx.fillRect(girX + 10, girY - 16, 6, 4); // Head
    ctx.fillRect(girX + 2, girY + 6, 1.5, 12); // Leg 1
    ctx.fillRect(girX + 8, girY + 6, 1.5, 12); // Leg 2

    // Rustic Thornbush Kraal Perimeter
    ctx.fillStyle = '#78350f';
    ctx.fillRect(bgX + 10, bgY + bgH - 8, Math.min(45, bgW * 0.25), 4);

  } else if (isHighway) {
    // 🛣️ HIGHWAY: Elevated concrete freeway, overhead sign gantries, guardrails, streaming headlights & taillights
    ctx.fillStyle = isNight ? '#020617' : '#1e293b';
    ctx.fillRect(bgX, bgY, bgW, bgH);

    // Multi-lane asphalt roadbed with yellow and white stripes
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(bgX, bgY + 4, bgW, bgH - 8);

    ctx.fillStyle = '#facc15'; // Yellow median
    ctx.fillRect(bgX, bgY + bgH / 2 - 1, bgW, 2);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'; // Dashed white lines
    for (let lx = bgX + 10; lx < bgX + bgW; lx += 24) {
      ctx.fillRect(lx, bgY + bgH * 0.25, 12, 1.5);
      ctx.fillRect(lx, bgY + bgH * 0.75, 12, 1.5);
    }

    // Moving vehicle sprites (White/yellow headlights, red taillights)
    const carCols = ['#dc2626', '#2563eb', '#ffffff', '#eab308', '#059669'];
    for (let cx = bgX + 25; cx < bgX + bgW - 30; cx += 55) {
      const isTopLane = (cx % 110 < 55);
      const cy = isTopLane ? bgY + bgH * 0.25 - 4 : bgY + bgH * 0.75 - 4;
      ctx.fillStyle = carCols[(cx * 7) % carCols.length];
      ctx.fillRect(cx, cy, 18, 8);
      // Headlights / Taillights
      if (isTopLane) {
        ctx.fillStyle = '#fef08a'; // Eastbound headlights
        ctx.fillRect(cx + 17, cy + 1, 3, 2);
        ctx.fillRect(cx + 17, cy + 5, 3, 2);
      } else {
        ctx.fillStyle = '#ef4444'; // Westbound red taillights
        ctx.fillRect(cx + 17, cy + 1, 2, 2);
        ctx.fillRect(cx + 17, cy + 5, 2, 2);
      }
    }

    // Overhead Steel Highway Sign Gantry
    const gantryX = bgX + Math.min(100, bgW * 0.5);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(gantryX, bgY + 2, 4, bgH - 4);
    ctx.fillStyle = '#15803d'; // Green Interstate Sign
    ctx.fillRect(gantryX - 16, bgY + 4, 36, 12);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(gantryX - 16, bgY + 4, 36, 12);

  } else if (isResidential) {
    // 🏠 SMALL CITY / RESIDENTIAL: 2-story Victorian red-brick townhouses, slate roofs, chimneys, clock tower, bakery, streetlamps
    ctx.fillStyle = isNight ? '#0b1322' : '#334155';
    ctx.fillRect(bgX, bgY, bgW, bgH);

    // Row of Victorian townhouses
    const houseW = 48;
    for (let hx = bgX + 8; hx < bgX + bgW - 20; hx += houseW + 8) {
      // Brick facade
      ctx.fillStyle = isNight ? '#3a1b18' : '#7f1d1d';
      ctx.fillRect(hx, bgY + 12, houseW, bgH - 16);
      // Pitched slate roof
      ctx.fillStyle = isNight ? '#1e242b' : '#334155';
      ctx.beginPath();
      ctx.moveTo(hx - 2, bgY + 14);
      ctx.lineTo(hx + houseW / 2, bgY + 2);
      ctx.lineTo(hx + houseW + 2, bgY + 14);
      ctx.fill();
      // Brick chimney & smoke puff
      ctx.fillStyle = '#451a03';
      ctx.fillRect(hx + 8, bgY - 2, 5, 8);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillRect(hx + 7, bgY - 6, 4, 3);
      ctx.fillRect(hx + 9, bgY - 9, 6, 3);
      // Windows with warm lights
      ctx.fillStyle = isNight ? '#fef08a' : '#94a3b8';
      ctx.fillRect(hx + 6, bgY + 18, 9, 9);
      ctx.fillRect(hx + houseW - 15, bgY + 18, 9, 9);
    }

    // Municipal Clock Tower in corner
    const clockX = bgX + bgW - Math.min(38, bgW * 0.2);
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(clockX, bgY - 6, 22, bgH);
    ctx.fillStyle = '#0d9488'; // Copper spire
    ctx.beginPath();
    ctx.moveTo(clockX - 2, bgY - 6);
    ctx.lineTo(clockX + 11, bgY - 18);
    ctx.lineTo(clockX + 24, bgY - 6);
    ctx.fill();
    // Clock dial
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(clockX + 11, bgY + 2, 6, 0, Math.PI * 2);
    ctx.fill();

    // Neighborhood Bakery with striped red/white awning
    const bakeryX = bgX + 12;
    ctx.fillStyle = '#dc2626';
    for (let ax = bakeryX; ax < bakeryX + 28; ax += 7) {
      ctx.fillRect(ax, bgY + bgH - 14, 4, 4);
    }

  } else if (isCommercial) {
    // 🏢 BIG CITY / COMMERCIAL: Towering glass/steel skyscrapers, corporate logos, rooftop communication masts, red aviation warning strobes, elevated metro rail
    ctx.fillStyle = isNight ? '#05070d' : '#0f172a';
    ctx.fillRect(bgX, bgY, bgW, bgH);

    // Array of skyscrapers with illuminated window grids
    const towers = [
      { x: bgX + 8, w: 45, col: '#1e293b' },
      { x: bgX + 58, w: 55, col: '#334155' },
      { x: bgX + 120, w: 60, col: '#1e293b' },
      { x: bgX + 185, w: 50, col: '#475569' },
      { x: bgX + 240, w: 65, col: '#334155' },
    ];

    for (const tw of towers) {
      if (tw.x + tw.w > bgX + bgW) continue;
      ctx.fillStyle = tw.col;
      ctx.fillRect(tw.x, bgY + 4, tw.w, bgH - 4);

      // Office windows
      if (isNight) {
        ctx.fillStyle = '#fef08a';
        for (let wy = bgY + 8; wy < bgY + bgH - 8; wy += 9) {
          for (let wx = tw.x + 5; wx < tw.x + tw.w - 5; wx += 9) {
            if ((wx + wy) % 3 !== 0) ctx.fillRect(wx, wy, 4, 4);
          }
        }
      }

      // Rooftop communication mast with red aviation warning strobe
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(tw.x + tw.w / 2 - 1, bgY - 10, 2, 14);
      ctx.fillStyle = '#ef4444'; // Flashing red strobe
      ctx.beginPath();
      ctx.arc(tw.x + tw.w / 2, bgY - 10, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Elevated Metro Rail Overpass
    const metroY = bgY + bgH - 12;
    ctx.fillStyle = '#475569';
    ctx.fillRect(bgX, metroY, bgW, 6);
    // Passing illuminated passenger train sprite
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(bgX + 20, metroY - 6, Math.min(80, bgW - 40), 6);
    ctx.fillStyle = '#ffffff';
    for (let tx = bgX + 24; tx < bgX + 90 && tx < bgX + bgW - 20; tx += 12) {
      ctx.fillRect(tx, metroY - 4, 6, 3);
    }

  } else if (isAirport) {
    // ✈️ AIRPORT: Active tarmac runway, threshold piano keys, approach lighting, hangars, radar dome tower, fuel trucks, commercial airliners
    ctx.fillStyle = isNight ? '#020617' : '#1e293b';
    ctx.fillRect(bgX, bgY, bgW, bgH);

    // Active Tarmac Runway
    const runY = bgY + 8;
    const runH = bgH - 16;
    ctx.fillStyle = '#0a0f1d';
    ctx.fillRect(bgX, runY, bgW, runH);

    // Piano-key white threshold stripes
    ctx.fillStyle = '#ffffff';
    for (let k = 0; k < 6; k++) {
      ctx.fillRect(bgX + 6, runY + 2 + k * 4, 18, 2.5);
      ctx.fillRect(bgX + bgW - 24, runY + 2 + k * 4, 18, 2.5);
    }

    // Runway yellow dashed centerline
    ctx.fillStyle = '#facc15';
    for (let rx = bgX + 35; rx < bgX + bgW - 35; rx += 28) {
      ctx.fillRect(rx, runY + runH / 2 - 1, 14, 2);
    }

    // Approach Lighting (green / cyan threshold lights)
    for (let lx = bgX + 10; lx < bgX + bgW; lx += 30) {
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(lx, runY - 2, 3, 3);
      ctx.fillRect(lx, runY + runH - 1, 3, 3);
    }

    // Curved Metal Aircraft Hangar
    const hangarX = bgX + Math.min(80, bgW * 0.4);
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(hangarX + 18, runY + 8, 16, Math.PI, 0);
    ctx.fill();

    // Radar Dome Tower
    const radarX = bgX + bgW - Math.min(45, bgW * 0.2);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(radarX, runY + 6, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(radarX - 1, runY - 3, 2, 2);

    // Parked Commercial Jet Airliner
    const jetX = bgX + Math.min(45, bgW * 0.2);
    ctx.fillStyle = '#ffffff'; // Fuselage
    ctx.fillRect(jetX, runY + runH / 2 - 3, 26, 6);
    ctx.fillStyle = '#38bdf8'; // Tail fin & swept wing
    ctx.fillRect(jetX - 2, runY + runH / 2 - 8, 6, 6);
    ctx.fillRect(jetX + 10, runY + runH / 2 - 7, 10, 3);

  } else if (isTrain) {
    // 🚂 RAILROAD: Multi-track freight depot, parallel ballast tracks, switching signals, steel boxcars, container flatbeds, catenary gantries, shunter engines
    ctx.fillStyle = isNight ? '#1c1917' : '#44403c';
    ctx.fillRect(bgX, bgY, bgW, bgH);

    // Ballast gravel beds & steel rails
    const numTracks = 3;
    const trackH = bgH / numTracks;
    for (let t = 0; t < numTracks; t++) {
      const ty = bgY + t * trackH + trackH / 2;
      // Wooden ties
      ctx.fillStyle = '#292524';
      for (let rx = bgX + 4; rx < bgX + bgW; rx += 10) {
        ctx.fillRect(rx, ty - 6, 3, 12);
      }
      // Steel rails
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(bgX, ty - 4, bgW, 1.5);
      ctx.fillRect(bgX, ty + 3, bgW, 1.5);
    }

    // Colorful Parked Boxcars on middle track
    const boxcarCols = ['#b91c1c', '#1d4ed8', '#f59e0b', '#047857'];
    for (let c = 0; c < 3; c++) {
      const bx = bgX + 25 + c * 38;
      if (bx + 34 > bgX + bgW - 10) continue;
      ctx.fillStyle = boxcarCols[c % boxcarCols.length];
      ctx.fillRect(bx, bgY + trackH * 0.5 - 5, 34, 10);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      for (let rib = bx + 4; rib < bx + 30; rib += 6) ctx.fillRect(rib, bgY + trackH * 0.5 - 5, 1.5, 10);
    }

    // Upright Rail Switching Signals (red and green LEDs)
    const sigX = bgX + bgW - 35;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(sigX, bgY + 4, 3, bgH - 8);
    ctx.fillStyle = '#22c55e'; // Green signal
    ctx.fillRect(sigX - 3, bgY + 8, 3, 3);
    ctx.fillStyle = '#ef4444'; // Red signal
    ctx.fillRect(sigX - 3, bgY + 14, 3, 3);

    // Overhead Steel Catenary Wire Gantry
    ctx.fillStyle = '#64748b';
    ctx.fillRect(bgX + bgW * 0.5, bgY + 2, 4, bgH - 4);

  } else if (isBeach) {
    // 🏖️ BEACH: Golden sand dunes, swaying coconut palms, turquoise ocean surf & white foam breakers, wooden boardwalk promenade, beach cabanas
    // Deep Ocean Water
    ctx.fillStyle = isNight ? '#041d38' : '#0284c7';
    ctx.fillRect(bgX, bgY, bgW, bgH);

    // Turquoise surf wave
    ctx.fillStyle = isNight ? '#083344' : '#06b6d4';
    ctx.fillRect(bgX, bgY + 8, bgW, bgH - 12);

    // White foaming breaker
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    for (let sx = bgX; sx < bgX + bgW; sx += 14) {
      ctx.fillRect(sx, bgY + 12, 10, 2.5);
    }

    // Golden Sand Dunes
    ctx.fillStyle = isNight ? '#78350f' : '#fde047';
    ctx.fillRect(bgX, bgY + 16, bgW, bgH - 16);

    // Wooden Boardwalk Promenade
    ctx.fillStyle = '#b45309';
    ctx.fillRect(bgX, bgY + bgH - 10, bgW, 8);
    ctx.fillStyle = '#78350f';
    for (let px = bgX; px < bgX + bgW; px += 8) {
      ctx.fillRect(px, bgY + bgH - 10, 1.5, 8);
    }

    // Swaying Coconut Palms
    for (let px = bgX + 25; px < bgX + bgW - 20; px += 65) {
      // Slender curving trunk
      ctx.fillStyle = '#78350f';
      ctx.fillRect(px, bgY + bgH - 24, 2.5, 16);
      // Palm fronds
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(px + 1, bgY + bgH - 24, 10, 0, Math.PI * 2);
      ctx.fill();
    }

    // Colorful Beach Cabanas
    const cabanaCols = ['#ef4444', '#3b82f6', '#facc15', '#10b981'];
    for (let cx = bgX + 45; cx < bgX + bgW - 30; cx += 55) {
      ctx.fillStyle = cabanaCols[(cx * 3) % cabanaCols.length];
      ctx.fillRect(cx, bgY + bgH - 18, 14, 8);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx + 2, bgY + bgH - 18, 3, 8);
    }

  } else if (isMarine) {
    // 🌊 MARINE FLOATING: Open seawater bay, gentle wave ripples, wooden marina piers, mooring bollards, fishing trawlers, yachts, navigation buoys
    ctx.fillStyle = isNight ? '#02131e' : '#0369a1';
    ctx.fillRect(bgX, bgY, bgW, bgH);

    // Wave ripples
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    for (let wy = bgY + 6; wy < bgY + bgH - 6; wy += 8) {
      for (let wx = bgX + 6; wx < bgX + bgW; wx += 20) {
        ctx.fillRect(wx + ((wy * 7) % 10), wy, 7, 1.2);
      }
    }

    // Wooden Marina Pier extending into water
    ctx.fillStyle = '#78350f';
    ctx.fillRect(bgX + 20, bgY + 6, Math.min(85, bgW * 0.4), 10);
    // Mooring bollards
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(bgX + 30, bgY + 4, 3, 3);
    ctx.fillRect(bgX + 70, bgY + 4, 3, 3);

    // Moored Fishing Trawler / Yacht
    const boatX = bgX + 36;
    ctx.fillStyle = '#ffffff'; // White hull
    ctx.fillRect(boatX, bgY + 12, 28, 8);
    ctx.fillStyle = '#38bdf8'; // Windshield
    ctx.fillRect(boatX + 6, bgY + 10, 10, 3);
    ctx.fillStyle = '#94a3b8'; // Mast
    ctx.fillRect(boatX + 14, bgY + 4, 2, 8);

    // Floating Navigation Buoys (high-vis orange)
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.arc(bgX + bgW - 25, bgY + bgH / 2, 4, 0, Math.PI * 2);
    ctx.fill();

  } else if (isParking) {
    // 🚌 PARKING LOT: Asphalt parking bays, parked spectator cars, official team coach buses
    ctx.fillStyle = isNight ? '#0f172a' : '#1e293b';
    ctx.fillRect(bgX, bgY, bgW, bgH);

    // White parking bay stripes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1;
    for (let px = bgX + 15; px < bgX + bgW - 15; px += 20) {
      ctx.strokeRect(px, bgY + 6, 14, bgH - 12);
      // Parked car
      if (px % 40 !== 0) {
        ctx.fillStyle = px % 60 === 0 ? '#dc2626' : '#2563eb';
        ctx.fillRect(px + 2, bgY + 8, 10, bgH - 16);
      }
    }

    // Team coach buses
    const busX = bgX + Math.min(30, bgW * 0.2);
    ctx.fillStyle = '#1d4ed8'; // Blue home team bus
    ctx.fillRect(busX, bgY + 4, 38, 14);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(busX, bgY + 9, 38, 2);

  } else {
    // 🌾 Open Countryside Field with Split-Rail Fence & Telephone Wires
    ctx.fillStyle = isNight ? '#052e16' : '#15803d';
    ctx.fillRect(bgX, bgY, bgW, bgH);
    // Telephone poles & wire
    ctx.fillStyle = '#78350f';
    ctx.fillRect(bgX + 16, bgY + 4, 3, bgH - 8);
    ctx.fillRect(bgX + bgW - 20, bgY + 4, 3, bgH - 8);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bgX + 16, bgY + 8);
    ctx.quadraticCurveTo(bgX + bgW / 2, bgY + 16, bgX + bgW - 20, bgY + 8);
    ctx.stroke();
  }

  // ---------------------------------------------------------------------------
  // 3. 15.7.2 HIGH-FIDELITY PERIMETER ENCLOSURE SUITE (Separates apron & world)
  // ---------------------------------------------------------------------------
  if (finish === 'brick_wall') {
    // 🧱 2. Weathered Brick Wall: Flemish-bond red brickwork, weathered mortar lines, moss patches, stone coping
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(barrierX, barrierY, barrierW, barrierH);

    // Weathered mortar lines
    ctx.fillStyle = '#450a0a';
    if (isHoriz) {
      for (let my = barrierY; my < barrierY + barrierH; my += 3) {
        ctx.fillRect(barrierX, my, barrierW, 1);
      }
    } else {
      for (let mx = barrierX; mx < barrierX + barrierW; mx += 3) {
        ctx.fillRect(mx, barrierY, 1, barrierH);
      }
    }

    // Moss patches
    ctx.fillStyle = '#15803d';
    if (isHoriz) {
      for (let mx = barrierX + 12; mx < barrierX + barrierW; mx += 36) {
        ctx.fillRect(mx, barrierY + barrierH - 3, 6, 2.5);
      }
    } else {
      for (let my = barrierY + 12; my < barrierY + barrierH; my += 36) {
        ctx.fillRect(barrierX + 1, my, 2.5, 6);
      }
    }

    // Beveled stone coping caps
    ctx.fillStyle = '#fef08a';
    if (isHoriz) {
      ctx.fillRect(barrierX, orientation === 'north' ? barrierY + barrierH - 2 : barrierY, barrierW, 2.5);
    } else {
      ctx.fillRect(orientation === 'west' ? barrierX + barrierW - 2 : barrierX, barrierY, 2.5, barrierH);
    }

  } else if (finish === 'concrete_wall') {
    // 🏢 3. Pre-Cast Concrete Security Wall: Heavy concrete slabs, expansion seams, weep holes, safety stencils & graffiti
    ctx.fillStyle = '#475569';
    ctx.fillRect(barrierX, barrierY, barrierW, barrierH);

    // Concrete coping rail
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(barrierX, barrierY, barrierW, isHoriz ? 2 : barrierH);

    // Expansion seams & circular weep holes
    ctx.fillStyle = '#0f172a';
    if (isHoriz) {
      for (let sx = barrierX + 28; sx < barrierX + barrierW; sx += 32) {
        ctx.fillRect(sx, barrierY, 1.5, barrierH);
        ctx.fillRect(sx - 12, barrierY + barrierH - 3, 2, 2); // Weep hole
      }
    } else {
      for (let sy = barrierY + 28; sy < barrierY + barrierH; sy += 32) {
        ctx.fillRect(barrierX, sy, barrierW, 1.5);
        ctx.fillRect(barrierX + barrierW - 3, sy - 12, 2, 2); // Weep hole
      }
    }

    // Retro 32-bit graffiti tags ("ULTRA", "GOAL", "94")
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(barrierX + 8, barrierY + 2, Math.min(22, barrierW - 12), Math.min(4, barrierH - 4));
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(barrierX + 12, barrierY + 3, Math.min(14, barrierW - 16), Math.min(2, barrierH - 5));

  } else if (finish === 'rustic_timber' || finish === 'small_fence') {
    // 🪵 4. Rustic Timber Palisade: Vertical wooden palings, woodgrain, forged iron nail studs, cross-timbers
    ctx.fillStyle = '#78350f';
    ctx.fillRect(barrierX, barrierY, barrierW, barrierH);

    // Vertical palings with woodgrain
    ctx.fillStyle = '#451a03';
    if (isHoriz) {
      for (let px = barrierX; px < barrierX + barrierW; px += 7) {
        ctx.fillRect(px, barrierY, 1.5, barrierH);
        // Forged black iron nail studs
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(px + 2, barrierY + 2, 1.5, 1.5);
        ctx.fillRect(px + 2, barrierY + barrierH - 3, 1.5, 1.5);
        ctx.fillStyle = '#451a03';
      }
      // Horizontal cross-timber beam
      ctx.fillStyle = '#92400e';
      ctx.fillRect(barrierX, barrierY + barrierH / 2 - 1, barrierW, 2.5);
    } else {
      for (let py = barrierY; py < barrierY + barrierH; py += 7) {
        ctx.fillRect(barrierX, py, barrierW, 1.5);
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(barrierX + 2, py + 2, 1.5, 1.5);
        ctx.fillRect(barrierX + barrierW - 3, py + 2, 1.5, 1.5);
        ctx.fillStyle = '#451a03';
      }
      ctx.fillStyle = '#92400e';
      ctx.fillRect(barrierX + barrierW / 2 - 1, barrierY, 2.5, barrierH);
    }

  } else if (finish === 'corrugated_hoarding' || finish === 'big_fence') {
    // 📻 5. Corrugated Hoarding Barrier: Galvanized metal hoarding boards, fluting ribs, retro painted sponsor advertisements
    ctx.fillStyle = '#64748b';
    ctx.fillRect(barrierX, barrierY, barrierW, barrierH);

    // Corrugated vertical fluting
    ctx.fillStyle = '#475569';
    if (isHoriz) {
      for (let fx = barrierX; fx < barrierX + barrierW; fx += 5) {
        ctx.fillRect(fx, barrierY, 1.5, barrierH);
      }
    } else {
      for (let fy = barrierY; fy < barrierY + barrierH; fy += 5) {
        ctx.fillRect(barrierX, fy, barrierW, 1.5);
      }
    }

    // Retro hand-painted sponsor billboards ("PIXEL COLA", "RETRO SPORT", "ARCADE BOOTS")
    const adColors = ['#dc2626', '#2563eb', '#15803d', '#d97706'];
    if (isHoriz) {
      for (let ax = barrierX + 10; ax < barrierX + barrierW - 30; ax += 50) {
        const adCol = adColors[(ax * 3) % adColors.length];
        ctx.fillStyle = adCol;
        ctx.fillRect(ax, barrierY + 2, 38, barrierH - 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(ax + 3, barrierY + 3, 32, 1.5);
      }
    } else {
      for (let ay = barrierY + 10; ay < barrierY + barrierH - 30; ay += 50) {
        const adCol = adColors[(ay * 3) % adColors.length];
        ctx.fillStyle = adCol;
        ctx.fillRect(barrierX + 2, ay, barrierW - 4, 38);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(barrierX + 3, ay + 3, 1.5, 32);
      }
    }

  } else {
    // ⛓️ 1. Chainlink Steel Fence: Galvanized diamond wire mesh, tubular top rail, vertical tension posts, angled barbed wire outrigger arms
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.45)';
    ctx.lineWidth = 1.2;

    // Diamond cross-hatch wire mesh
    if (isHoriz) {
      for (let mx = barrierX; mx < barrierX + barrierW; mx += 6) {
        ctx.beginPath();
        ctx.moveTo(mx, barrierY);
        ctx.lineTo(mx + 6, barrierY + barrierH);
        ctx.moveTo(mx + 6, barrierY);
        ctx.lineTo(mx, barrierY + barrierH);
        ctx.stroke();
      }
    } else {
      for (let my = barrierY; my < barrierY + barrierH; my += 6) {
        ctx.beginPath();
        ctx.moveTo(barrierX, my);
        ctx.lineTo(barrierX + barrierW, my + 6);
        ctx.moveTo(barrierX + barrierW, my);
        ctx.lineTo(barrierX, my + 6);
        ctx.stroke();
      }
    }

    // Tubular steel top rail and perimeter borders
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(barrierX, barrierY, barrierW, barrierH);

    // Fence vertical steel tube posts
    ctx.fillStyle = '#94a3b8';
    if (isHoriz) {
      for (let postX = barrierX; postX <= barrierX + barrierW; postX += 28) {
        ctx.fillRect(postX - 1, barrierY - 3, 2.5, barrierH + 6);
        // Angled 45-degree barbed wire outrigger arm with dual strands
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(postX - 2, barrierY - 6, 4, 2);
        ctx.fillRect(postX - 3, barrierY - 8, 5, 1.5);
        ctx.fillStyle = '#94a3b8';
      }
    } else {
      for (let postY = barrierY; postY <= barrierY + barrierH; postY += 28) {
        ctx.fillRect(barrierX - 3, postY - 1, barrierW + 6, 2.5);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(barrierX - 6, postY - 2, 2, 4);
        ctx.fillRect(barrierX - 8, postY - 3, 1.5, 5);
        ctx.fillStyle = '#94a3b8';
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 4. 15.7.3 GRASSROOTS FAN PRESENCE & TOUCHLINE ATMOSPHERE
  // ---------------------------------------------------------------------------
  if (stand.hasGrassrootsFans !== false) {
    const crowdCount = Math.floor((isHoriz ? w : h) / 26);
    const primaryCol = stand.primaryColor || '#dc2626';
    const secondaryCol = stand.secondaryColor || '#2563eb';
    const capColors = ['#334155', '#451a03', '#1e293b', '#78716c', '#0f172a'];
    const skinTones = ['#f5c898', '#d4a373', '#8d5b4c'];

    for (let i = 0; i < crowdCount; i++) {
      // Position fans right along the perimeter barrier overlooking the pitch
      let fanX = barrierX;
      let fanY = barrierY;

      if (orientation === 'north') {
        fanX = x + 14 + i * 26;
        fanY = barrierY - 4;
      } else if (orientation === 'south') {
        fanX = x + 14 + i * 26;
        fanY = barrierY + barrierH + 1;
      } else if (orientation === 'west') {
        fanX = barrierX - 4;
        fanY = y + 14 + i * 26;
      } else {
        fanX = barrierX + barrierW + 1;
        fanY = y + 14 + i * 26;
      }

      // Torso / Club jacket
      const shirtCol = i % 2 === 0 ? primaryCol : secondaryCol;
      ctx.fillStyle = shirtCol;
      ctx.fillRect(fanX, fanY, 6, 7);

      // Head & Face
      const skin = skinTones[(i * 3) % skinTones.length];
      ctx.fillStyle = skin;
      ctx.fillRect(fanX + 1, fanY - 4, 4, 4);

      // Flat cap / Newsboy hat
      const capCol = capColors[(i * 7) % capColors.length];
      ctx.fillStyle = capCol;
      ctx.fillRect(fanX, fanY - 6, 6, 2.5);
      ctx.fillRect(fanX + 1, fanY - 7, 4, 1.5); // Cap crown

      // Club scarf or held drink
      if (i % 3 === 0) {
        // Pixel scarf draped over arms
        ctx.fillStyle = '#facc15';
        ctx.fillRect(fanX - 1, fanY + 2, 8, 2);
      } else if (i % 3 === 1) {
        // Holding golden pint beer / steaming coffee mug
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(fanX + 6, fanY + 2, 2.5, 3.5);
        ctx.fillStyle = '#ffffff'; // Foam head
        ctx.fillRect(fanX + 6, fanY + 1, 2.5, 1);
      } else {
        // Cheering gesture arm raised on barrier
        ctx.fillStyle = skin;
        ctx.fillRect(fanX + 6, fanY - 2, 2, 4);
      }
    }
  }

  ctx.restore();
}



/**
 * Advertising Hoardings:
 * - Monumental: Animated scrolling / glowing LED panels
 * - Craven: Vintage painted billboard sponsors
 * - Ascenso: Weathered hand-painted concrete barriers with wire mesh fence
 */
function drawStadiumAdHoardings(
  ctx: CanvasRenderingContext2D,
  tier: StadiumTier,
  timeOfDay: TimeOfDay,
  graphicsSettings?: GraphicsSettings
) {
  const left = PITCH_CONFIG.PITCH_LEFT - 100;
  const width = PITCH_CONFIG.FIELD_WIDTH + 200;
  const boardYTop = PITCH_CONFIG.PITCH_TOP - 95;
  const boardYBottom = PITCH_CONFIG.PITCH_BOTTOM + 65;
  const adHeight = 32;

  ctx.save();
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.textBaseline = 'middle';

  const isAnimatedLED = tier === 'monumental' && graphicsSettings?.tier !== 'performance';
  const now = Date.now();
  const ledOffset = isAnimatedLED ? (now * 0.04) % 240 : 0;

  const positions = [boardYTop, boardYBottom];

  for (const boardY of positions) {
    // Base backing
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(left, boardY, width, adHeight);

    if (tier === 'monumental') {
      // Modern High-Res Animated LED Ad Hoardings
      const ledPanels = [
        { bg: '#0284c7', glow: '#38bdf8', text: '⚡ SONY PLAYSTATION', color: '#ffffff' },
        { bg: '#b91c1c', glow: '#f87171', text: 'PIRELLI FORMULA', color: '#ffffff' },
        { bg: '#047857', glow: '#34d399', text: 'HEINEKEN 0.0%', color: '#ffffff' },
        { bg: '#4338ca', glow: '#818cf8', text: 'EA SPORTS FC', color: '#facc15' },
        { bg: '#d97706', glow: '#fbbf24', text: 'MASTERCARD PRIDE', color: '#ffffff' },
      ];
      const pWidth = 240;
      let curX = left - (isAnimatedLED ? ledOffset : 0);
      let idx = 0;

      while (curX < left + width + pWidth) {
        if (curX + pWidth > left) {
          const p = ledPanels[idx % ledPanels.length];
          ctx.fillStyle = p.bg;
          ctx.fillRect(Math.max(left, curX), boardY, Math.min(pWidth - 4, left + width - curX), adHeight);

          // Digital top LED neon strip
          ctx.fillStyle = p.glow;
          ctx.fillRect(Math.max(left, curX), boardY, Math.min(pWidth - 4, left + width - curX), 2);
          ctx.fillRect(Math.max(left, curX), boardY + adHeight - 2, Math.min(pWidth - 4, left + width - curX), 2);

          // LED text
          ctx.fillStyle = p.color;
          if (curX + 16 >= left && curX + 16 <= left + width - 40) {
            ctx.fillText(p.text, curX + 14, boardY + adHeight / 2 + 1);
          }
        }
        curX += pWidth;
        idx++;
      }
    } else if (tier === 'craven') {
      // Classic English Painted Billboard Sponsors
      const panels = [
        { bg: '#b81212', text: 'SENSIBLE SOCCER', color: '#ffffff' },
        { bg: '#d4d4d4', text: "'95 / '96", color: '#111111' },
        { bg: '#0055b8', text: 'PIXEL CUP', color: '#ffffff' },
        { bg: '#1c7430', text: 'AMIGA POWER', color: '#ffd700' },
        { bg: '#78350f', text: 'RETRO BITTER ALE', color: '#fef08a' },
        { bg: '#1e293b', text: 'HERITAGE GROUND', color: '#ffffff' },
      ];
      const pWidth = 220;
      let curX = left;
      let idx = 0;

      while (curX < left + width) {
        const p = panels[idx % panels.length];
        ctx.fillStyle = p.bg;
        ctx.fillRect(curX, boardY, pWidth - 4, adHeight);

        // Painted wood bevel
        ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
        ctx.fillRect(curX, boardY, pWidth - 4, 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(curX, boardY + adHeight - 2, pWidth - 4, 2);

        ctx.fillStyle = p.color;
        ctx.fillText(p.text, curX + 12, boardY + adHeight / 2 + 1);

        curX += pWidth;
        idx++;
      }
    } else {
      // Ascenso: Hand-painted local ads on weathered concrete wall + chain-link fence
      const panels = [
        { bg: '#292524', text: 'TALLER MECANICO', color: '#facc15' },
        { bg: '#1c1917', text: 'FERRETERIA GOL', color: '#ef4444' },
        { bg: '#292524', text: 'GASEOSA RETRO', color: '#38bdf8' },
        { bg: '#1c1917', text: 'CARNICERIA TITO', color: '#ffffff' },
        { bg: '#292524', text: 'C.A. ASCENSO 1948', color: '#4ade80' },
      ];
      const pWidth = 240;
      let curX = left;
      let idx = 0;

      while (curX < left + width) {
        const p = panels[idx % panels.length];
        ctx.fillStyle = p.bg;
        ctx.fillRect(curX, boardY, pWidth - 6, adHeight);

        // Weathered wall texture
        ctx.fillStyle = '#44403c';
        ctx.fillRect(curX + 6, boardY + 4, 18, 4);

        ctx.fillStyle = p.color;
        ctx.fillText(p.text, curX + 14, boardY + adHeight / 2 + 1);

        curX += pWidth;
        idx++;
      }

      // Chain-link safety fence (Alambrado) along the boards
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.35)';
      ctx.lineWidth = 1;
      for (let fx = left; fx < left + width; fx += 16) {
        ctx.beginPath();
        ctx.moveTo(fx, boardY - 14);
        ctx.lineTo(fx, boardY + adHeight);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(left, boardY - 14);
      ctx.lineTo(left + width, boardY - 14);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/**
 * Dugouts / Technical Shelters along left touchline (Section 12.3 & 13.2)
 * Supports 5 Canonical Bench Types with seated substitute players, coaches, and pacing managers!
 */
function drawStadiumDugouts(
  ctx: CanvasRenderingContext2D,
  tier: StadiumTier,
  homeKit: TeamKit,
  awayKit: TeamKit,
  dugoutConfig?: DugoutConfig
) {
  const left = PITCH_CONFIG.PITCH_LEFT;
  const cy = PITCH_CONFIG.CENTER_Y;

  ctx.save();

  // Technical box markings
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(left - 38, cy - 110, 32, 90); // Away box
  ctx.strokeRect(left - 38, cy + 20, 32, 90);  // Home box
  ctx.setLineDash([]);

  const benchType = dugoutConfig?.type || (tier === 'monumental' ? 'recaro_racing' : tier === 'craven' ? 'classic_timber' : 'utilitarian_concrete');

  // Draw Away Dugout (Top) & Home Dugout (Bottom)
  if (benchType === 'recaro_racing' || benchType === 'racing_bucket') {
    drawExecutiveDugout(ctx, left - 62, cy - 95, 18, 60, awayKit.primaryColor, dugoutConfig);
    drawExecutiveDugout(ctx, left - 62, cy + 35, 18, 60, homeKit.primaryColor, dugoutConfig);
  } else if (benchType === 'covered_sunken') {
    drawCoveredSunkenDugout(ctx, left - 60, cy - 95, 16, 58, awayKit.primaryColor, dugoutConfig);
    drawCoveredSunkenDugout(ctx, left - 60, cy + 35, 16, 58, homeKit.primaryColor, dugoutConfig);
  } else if (benchType === 'classic_timber') {
    drawClassicDugout(ctx, left - 55, cy - 95, 14, 55, awayKit.primaryColor, dugoutConfig);
    drawClassicDugout(ctx, left - 55, cy + 35, 14, 55, homeKit.primaryColor, dugoutConfig);
  } else if (benchType === 'folding_chairs') {
    drawFoldingChairsDugout(ctx, left - 46, cy - 85, 12, 45, awayKit.primaryColor, dugoutConfig);
    drawFoldingChairsDugout(ctx, left - 46, cy + 40, 12, 45, homeKit.primaryColor, dugoutConfig);
  } else {
    // utilitarian_concrete / concrete_dugout
    drawRusticDugout(ctx, left - 50, cy - 90, 12, 50, awayKit.primaryColor, dugoutConfig);
    drawRusticDugout(ctx, left - 50, cy + 40, 12, 50, homeKit.primaryColor, dugoutConfig);
  }

  // 🧑‍🤝‍🧑 SEATED SUBSTITUTE PLAYERS, COACHES & STANDING MANAGERS (Phase 13.2 Realism)
  // Away Staff & Substitutes
  drawDugoutOccupants(ctx, left - 58, cy - 90, awayKit, 'away');
  // Home Staff & Substitutes
  drawDugoutOccupants(ctx, left - 58, cy + 40, homeKit, 'home');

  // Standing / Pacing Managers in Technical Boxes
  drawTechnicalAreaManager(ctx, left - 24, cy - 65, awayKit, 'away');
  drawTechnicalAreaManager(ctx, left - 24, cy + 65, homeKit, 'home');

  ctx.restore();
}

/**
 * Procedural Seated Substitute Players & Coaches on Benches
 */
function drawDugoutOccupants(
  ctx: CanvasRenderingContext2D,
  benchX: number,
  benchY: number,
  kit: TeamKit,
  teamSide: 'home' | 'away'
) {
  // 5 seated substitute players in team training bibs & tracksuits
  for (let s = 0; s < 5; s++) {
    const py = benchY + s * 10;
    // Seated knees / legs
    ctx.fillStyle = kit.secondaryColor || '#ffffff';
    ctx.fillRect(benchX + 4, py + 4, 4, 3);
    // Torso with fluorescent bib over kit
    ctx.fillStyle = s === 0 ? '#facc15' : kit.primaryColor;
    ctx.fillRect(benchX + 3, py + 1, 6, 5);
    // Head with hair
    ctx.fillStyle = '#f5c898';
    ctx.fillRect(benchX + 4, py - 2, 4, 3);
    ctx.fillStyle = s % 2 === 0 ? '#451a03' : '#1e293b'; // Hair
    ctx.fillRect(benchX + 4, py - 3, 4, 2);
  }

  // Seated assistant coach holding yellow clipboard at the edge of the bench
  const coachY = benchY + 50;
  ctx.fillStyle = '#0f172a'; // Dark tracksuit
  ctx.fillRect(benchX + 3, coachY + 1, 6, 5);
  ctx.fillStyle = '#f5c898'; // Head
  ctx.fillRect(benchX + 4, coachY - 2, 4, 3);
  ctx.fillStyle = '#ffffff'; // Grey hair
  ctx.fillRect(benchX + 4, coachY - 3, 4, 2);
  // Yellow tactical clipboard
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(benchX + 7, coachY + 2, 3, 4);
}

/**
 * Procedural Standing / Pacing Manager in Technical Area Box
 */
function drawTechnicalAreaManager(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  kit: TeamKit,
  side: 'home' | 'away'
) {
  // Elegant modern manager in suit / dark jacket
  const isSuit = side === 'home';
  const jacketColor = isSuit ? '#0f172a' : '#1e3a8a';

  // Feet / shoes
  ctx.fillStyle = '#020617';
  ctx.fillRect(x - 2, y + 8, 3, 2);
  ctx.fillRect(x + 1, y + 8, 3, 2);

  // Trousers
  ctx.fillStyle = isSuit ? '#1e293b' : '#0f172a';
  ctx.fillRect(x - 2, y + 4, 6, 5);

  // Jacket & tie
  ctx.fillStyle = jacketColor;
  ctx.fillRect(x - 3, y - 1, 8, 6);
  if (isSuit) {
    ctx.fillStyle = '#ffffff'; // White shirt collar
    ctx.fillRect(x, y - 1, 2, 2);
    ctx.fillStyle = kit.primaryColor; // Team colored tie!
    ctx.fillRect(x, y + 1, 2, 3);
  }

  // Head & hair
  ctx.fillStyle = '#d09868';
  ctx.fillRect(x - 1, y - 5, 4, 4);
  ctx.fillStyle = '#451a03'; // Styled hair
  ctx.fillRect(x - 2, y - 6, 6, 2);

  // Subtle animated pacing / tactical gesture arm
  const now = Date.now();
  const gesture = Math.sin(now * 0.003 + (side === 'home' ? 0 : 2)) > 0.5;
  if (gesture) {
    ctx.fillStyle = jacketColor;
    ctx.fillRect(x + 5, y, 3, 2); // Pointing arm directing team
    ctx.fillStyle = '#d09868';
    ctx.fillRect(x + 8, y, 2, 2); // Hand
  }
}

function drawExecutiveDugout(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  teamColor: string,
  cfg?: DugoutConfig
) {
  const frameColor = cfg?.frameColor || '#38bdf8';
  const cushionColor = cfg?.cushionColor || teamColor;

  // Dugout shadow
  ctx.fillStyle = 'rgba(10, 20, 10, 0.55)';
  ctx.fillRect(x - 3, y + 2, w + 6, h + 4);

  // Tinted tempered glass canopy
  ctx.fillStyle = cfg?.shelterTint || 'rgba(15, 23, 42, 0.9)';
  ctx.fillRect(x, y, w, h);

  // Sleek aluminum frame
  ctx.strokeStyle = frameColor;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, w, h);

  // Luxury Recaro style bucket seats
  ctx.fillStyle = cushionColor;
  for (let sy = y + 5; sy < y + h - 8; sy += 11) {
    ctx.fillRect(x + 3, sy, w - 6, 7);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + w / 2 - 2, sy + 1, 4, 2); // Headrest logo
    ctx.fillStyle = cushionColor;
  }
}

function drawCoveredSunkenDugout(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  teamColor: string,
  cfg?: DugoutConfig
) {
  // Sunken trench pit into turf
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(x - 4, y, w + 4, h);

  // Arched transparent polycarbonate canopy
  ctx.fillStyle = cfg?.shelterTint || 'rgba(56, 189, 248, 0.25)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = cfg?.frameColor || '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, w, h);

  // Sunken bench row
  const seatColor = cfg?.cushionColor || teamColor;
  ctx.fillStyle = seatColor;
  for (let sy = y + 6; sy < y + h - 6; sy += 10) {
    ctx.fillRect(x + 2, sy, w - 4, 6);
  }
}

function drawClassicDugout(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  teamColor: string,
  cfg?: DugoutConfig
) {
  ctx.fillStyle = 'rgba(10, 30, 10, 0.45)';
  ctx.fillRect(x - 2, y + 2, w + 4, h + 4);

  ctx.fillStyle = cfg?.shelterTint || 'rgba(30, 41, 59, 0.88)';
  ctx.fillRect(x, y, w, h);

  ctx.strokeStyle = cfg?.frameColor || '#94a3b8';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);

  const seatColor = cfg?.cushionColor || teamColor;
  ctx.fillStyle = seatColor;
  for (let seatY = y + 4; seatY < y + h - 6; seatY += 10) {
    ctx.fillRect(x + 3, seatY, w - 6, 6);
  }
}

function drawRusticDugout(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  teamColor: string,
  cfg?: DugoutConfig
) {
  // Raw concrete walls
  ctx.fillStyle = cfg?.frameColor || '#44403c';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#292524';
  ctx.strokeRect(x, y, w, h);

  // Wooden bench
  ctx.fillStyle = '#78350f';
  ctx.fillRect(x + 2, y + 4, w - 4, h - 8);

  const seatColor = cfg?.cushionColor || teamColor;
  ctx.fillStyle = seatColor;
  ctx.fillRect(x + 3, y + h / 2 - 6, w - 6, 12);
}

function drawFoldingChairsDugout(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  teamColor: string,
  cfg?: DugoutConfig
) {
  const seatColor = cfg?.cushionColor || teamColor;
  for (let sy = y + 4; sy < y + h - 4; sy += 9) {
    // Metal frame legs
    ctx.fillStyle = cfg?.frameColor || '#94a3b8';
    ctx.fillRect(x, sy + 1, 2, 6);
    ctx.fillRect(x + w - 2, sy + 1, 2, 6);
    // Canvas seat
    ctx.fillStyle = seatColor;
    ctx.fillRect(x + 2, sy, w - 4, 6);
  }
}

/**
 * Player Entrance Tunnels Architecture (Section 12.4 & 13.2)
 * Supports 5 Canonical Entrance Tunnel Types with high-vis security stewards & entrance carpet runner!
 */
function drawStadiumEntranceTunnel(
  ctx: CanvasRenderingContext2D,
  tunnel?: EntranceTunnelConfig,
  homeKit: TeamKit = HOME_KIT,
  awayKit: TeamKit = AWAY_KIT
) {
  const left = PITCH_CONFIG.PITCH_LEFT;
  const cy = PITCH_CONFIG.CENTER_Y;
  const cx = PITCH_CONFIG.CENTER_X;

  const siting = tunnel?.siting || 'center_main';
  const type = tunnel?.type || 'inflatable_accordion';
  const primaryColor = tunnel?.primaryColor || homeKit.primaryColor;
  const secondaryColor = tunnel?.secondaryColor || homeKit.secondaryColor;

  let x = left - 46;
  let y = cy - 18;
  let w = 34;
  let h = 36;

  if (siting === 'corner') {
    x = left - 50;
    y = PITCH_CONFIG.PITCH_TOP - 40;
    w = 32;
    h = 32;
  } else if (siting === 'behind_goal') {
    x = cx - 18;
    y = PITCH_CONFIG.PITCH_TOP - 55;
    w = 36;
    h = 30;
  }

  ctx.save();

  // 1. Club Crest Entrance Carpet Runner (extending out from tunnel mouth toward pitch)
  const runnerW = 22;
  const runnerH = 18;
  const runnerX = x + w;
  const runnerY = y + (h - runnerW) / 2;
  ctx.fillStyle = primaryColor;
  ctx.fillRect(runnerX, runnerY, runnerH, runnerW);
  ctx.fillStyle = '#facc15'; // Gold embroidered trim
  ctx.fillRect(runnerX, runnerY, runnerH, 2);
  ctx.fillRect(runnerX, runnerY + runnerW - 2, runnerH, 2);
  ctx.fillRect(runnerX + runnerH - 2, runnerY, 2, runnerW);

  // 2. Tunnel Architecture Body
  if (type === 'inflatable_accordion') {
    // Iconic South American flexible accordion bellows extending towards touchline
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(x - 2, y + 2, w + 4, h + 4); // Ground shadow

    // Alternating accordion bellows stripes
    const segmentCount = 6;
    const segW = w / segmentCount;
    for (let i = 0; i < segmentCount; i++) {
      ctx.fillStyle = i % 2 === 0 ? primaryColor : secondaryColor;
      ctx.fillRect(x + i * segW, y, segW, h);
      // Bellows arch rib
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.fillRect(x + i * segW, y, 1.5, h);
    }

    // Protective rubber front arch ring
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x, y, w, h);

    // South American style shield emblem atop tunnel mouth
    ctx.fillStyle = primaryColor;
    ctx.fillRect(x + w / 2 - 4, y - 4, 8, 4);
  } else if (type === 'modern_architectural') {
    // Ultra-high-tech backlit tunnel with dark matte panels & ambient LED ribbon lights
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x, y, w, h);

    // Dark brushed steel side panels
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x, y + 2, w, 6);
    ctx.fillRect(x, y + h - 8, w, 6);

    // Glowing cyan / white ambient LED ribbon strip
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(x, y, w, 2);
    ctx.fillRect(x, y + h - 2, w, 2);

    // Glass threshold & illuminated interior
    ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.fillRect(x + 4, y + 6, w - 8, h - 12);
  } else if (type === 'subterranean_staircase') {
    // Sunken concrete staircase descending from dressing rooms
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(x, y, w, h);

    // Descending concrete steps
    const stepCount = 5;
    const stepW = (w - 6) / stepCount;
    for (let s = 0; s < stepCount; s++) {
      ctx.fillStyle = s % 2 === 0 ? '#44403c' : '#292524';
      ctx.fillRect(x + 3 + s * stepW, y + 3, stepW, h - 6);
    }

    // Safety hazard yellow stripe at entrance
    ctx.fillStyle = '#facc15';
    ctx.fillRect(x + w - 4, y + 2, 3, h - 4);

    // Stainless steel handrails
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(x, y + 1, w, 2);
    ctx.fillRect(x, y + h - 3, w, 2);
  } else if (type === 'direct_portal') {
    // Arched masonry portal with dark interior depth and iron security grille
    ctx.fillStyle = '#334155';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#09090b';
    ctx.fillRect(x + 4, y + 4, w - 8, h - 8);

    // Arched stone lintel
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // Metal security grille vertical bars
    ctx.fillStyle = '#94a3b8';
    for (let bx = x + 8; bx < x + w - 6; bx += 5) {
      ctx.fillRect(bx, y + 4, 1.5, h - 8);
    }
  } else {
    // telescopic_canopy: sliding transparent canopy on rolling floor tracks
    ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
    ctx.fillRect(x, y, w, h);

    // Rolling floor tracks
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(x, y, w, 2);
    ctx.fillRect(x, y + h - 2, w, 2);

    // Transparent tinted canopy ribs
    ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
  }

  // 3. Security Stewards in High-Visibility Fluorescent Yellow Vests
  drawSecuritySteward(ctx, x + w - 2, y - 6);
  drawSecuritySteward(ctx, x + w - 2, y + h + 2);

  ctx.restore();
}

/**
 * Procedural Security Steward Sprite in High-Vis Vest
 */
function drawSecuritySteward(ctx: CanvasRenderingContext2D, sx: number, sy: number) {
  // Dark pants
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(sx, sy + 5, 4, 5);
  // High-vis yellow jacket
  ctx.fillStyle = '#facc15';
  ctx.fillRect(sx - 1, sy + 1, 6, 5);
  // Reflective silver safety strip
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(sx - 1, sy + 3, 6, 1);
  // Head & security cap
  ctx.fillStyle = '#f5c898';
  ctx.fillRect(sx, sy - 2, 4, 3);
  ctx.fillStyle = '#0f172a'; // Black cap
  ctx.fillRect(sx - 1, sy - 3, 5, 2);
}

/**
 * Architectural Roof Shadows Cast Onto Pitch Turf (Phase 13.2)
 * Dynamic soft elliptical pool for Round/Oval or angular envelope for Square/Rectangular
 */
function drawArchitecturalRoofShadows(
  ctx: CanvasRenderingContext2D,
  shape: StadiumShape,
  timeOfDay: TimeOfDay,
  graphicsSettings?: GraphicsSettings
) {
  if (graphicsSettings?.tier === 'performance') return;

  const left = PITCH_CONFIG.PITCH_LEFT;
  const top = PITCH_CONFIG.PITCH_TOP;
  const bottom = PITCH_CONFIG.PITCH_BOTTOM;
  const cx = PITCH_CONFIG.CENTER_X;
  const cy = PITCH_CONFIG.CENTER_Y;

  ctx.save();

  if (timeOfDay === 'sunset') {
    // Dramatic late-afternoon sunset shadow reaching deep across western touchline
    const shadowWidth = 320;
    const shadowAlpha = 0.24;

    ctx.fillStyle = `rgba(15, 23, 42, ${shadowAlpha})`;
    if (shape === 'round' || shape === 'oval') {
      // Curved elliptical shadow pool
      ctx.beginPath();
      drawSafeEllipse(ctx, left + 80, cy, shadowWidth / 2, PITCH_CONFIG.FIELD_HEIGHT * 0.48, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Angular roof canopy shadow envelope
      ctx.beginPath();
      ctx.moveTo(left, top);
      ctx.lineTo(left + shadowWidth, top + 100);
      ctx.lineTo(left + shadowWidth - 40, bottom - 100);
      ctx.lineTo(left, bottom);
      ctx.closePath();
      ctx.fill();
    }
  } else if (timeOfDay === 'noon') {
    // Crisp overhead midday shadow along touchlines
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.fillRect(left, top, 70, PITCH_CONFIG.FIELD_HEIGHT);
  } else if (timeOfDay === 'dawn') {
    // Morning shadow from eastern stand reaching inward
    const right = PITCH_CONFIG.PITCH_RIGHT;
    ctx.fillStyle = 'rgba(30, 20, 50, 0.18)';
    ctx.fillRect(right - 140, top, 140, PITCH_CONFIG.FIELD_HEIGHT);
  } else {
    // Night: Subtle cross-shadow from high-intensity quad floodlights
    ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
    ctx.fillRect(left, top, 90, PITCH_CONFIG.FIELD_HEIGHT);
  }

  ctx.restore();
}

/**
 * Four Corner Floodlight Towers:
 * - Monumental: Sleek tubular pylons with angled high-output halogen arrays
 * - Craven: Traditional criss-cross steel lattice towers
 * - Ascenso: Concrete/pipe poles with spotlights (some bulbs burnt out for raw character)
 */
function drawStadiumFloodlights(
  ctx: CanvasRenderingContext2D,
  tier: StadiumTier,
  timeOfDay: TimeOfDay,
  pX: number,
  pY: number
) {
  const towers = [
    { x: PITCH_CONFIG.PITCH_LEFT - 190, y: PITCH_CONFIG.PITCH_TOP - 220 },
    { x: PITCH_CONFIG.PITCH_RIGHT + 190, y: PITCH_CONFIG.PITCH_TOP - 220 },
    { x: PITCH_CONFIG.PITCH_LEFT - 190, y: PITCH_CONFIG.PITCH_BOTTOM + 220 },
    { x: PITCH_CONFIG.PITCH_RIGHT + 190, y: PITCH_CONFIG.PITCH_BOTTOM + 220 },
  ];

  for (const t of towers) {
    const tx = t.x - pX * 0.25;
    const ty = t.y - pY * 0.25;

    if (tier === 'monumental') {
      drawModernTubularMast(ctx, tx, ty, timeOfDay);
    } else if (tier === 'craven') {
      drawSteelLatticePylon(ctx, tx, ty, timeOfDay);
    } else {
      drawRusticSpotlightPole(ctx, tx, ty, timeOfDay);
    }
  }
}

function drawModernTubularMast(ctx: CanvasRenderingContext2D, tx: number, ty: number, timeOfDay: TimeOfDay) {
  const isNight = timeOfDay === 'night' || timeOfDay === 'sunset' || timeOfDay === 'dawn';
  ctx.save();

  // White/silver aerodynamic tubular column
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(tx - 4, ty - 65, 8, 85);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(tx, ty - 65, 4, 85); // Shading

  // Modern angled floodlight bank head
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(tx - 26, ty - 82, 52, 18);

  // Modern LED matrix bulbs
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 7; c++) {
      const lx = tx - 22 + c * 7;
      const ly = ty - 79 + r * 7;
      ctx.fillStyle = isNight ? '#ffffff' : '#64748b';
      ctx.fillRect(lx, ly, 5, 5);
      if (isNight) {
        ctx.fillStyle = '#38bdf8'; // Subtle cyan high-tech tint
        ctx.fillRect(lx + 1, ly + 1, 3, 3);
      }
    }
  }

  // Brilliant LED atmospheric halo
  if (isNight) {
    const halo = ctx.createRadialGradient(tx, ty - 73, 6, tx, ty - 73, 95);
    halo.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
    halo.addColorStop(0.5, 'rgba(56, 189, 248, 0.15)');
    halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(tx, ty - 73, 95, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawSteelLatticePylon(ctx: CanvasRenderingContext2D, tx: number, ty: number, timeOfDay: TimeOfDay) {
  const isNight = timeOfDay === 'night' || timeOfDay === 'sunset' || timeOfDay === 'dawn';
  ctx.save();

  // Steel tower base & lattice legs
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(tx - 18, ty + 20);
  ctx.lineTo(tx - 6, ty - 60);
  ctx.lineTo(tx + 6, ty - 60);
  ctx.lineTo(tx + 18, ty + 20);
  ctx.stroke();

  // Cross braces
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#64748b';
  ctx.beginPath();
  ctx.moveTo(tx - 14, ty);
  ctx.lineTo(tx + 10, ty - 30);
  ctx.moveTo(tx + 14, ty);
  ctx.lineTo(tx - 10, ty - 30);
  ctx.stroke();

  // Top floodlight head platform
  ctx.fillStyle = '#334155';
  ctx.fillRect(tx - 24, ty - 75, 48, 16);

  // Warm Halogen incandescent bulbs
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 6; col++) {
      const lx = tx - 20 + col * 7;
      const ly = ty - 71 + row * 6;
      ctx.fillStyle = isNight ? '#fef08a' : '#64748b';
      ctx.fillRect(lx, ly, 5, 4);
      if (isNight) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(lx + 1, ly + 1, 3, 2);
      }
    }
  }

  // Warm halogen halo
  if (isNight) {
    const halo = ctx.createRadialGradient(tx, ty - 65, 8, tx, ty - 65, 90);
    halo.addColorStop(0, 'rgba(254, 240, 138, 0.35)');
    halo.addColorStop(0.5, 'rgba(253, 224, 71, 0.12)');
    halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(tx, ty - 65, 90, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawRusticSpotlightPole(ctx: CanvasRenderingContext2D, tx: number, ty: number, timeOfDay: TimeOfDay) {
  const isNight = timeOfDay === 'night' || timeOfDay === 'sunset' || timeOfDay === 'dawn';
  ctx.save();

  // Concrete pole with rust stains
  ctx.fillStyle = '#64748b';
  ctx.fillRect(tx - 5, ty - 55, 10, 75);
  ctx.fillStyle = '#92400e'; // Rust streak
  ctx.fillRect(tx - 2, ty - 35, 3, 20);

  // Cross steel arm
  ctx.fillStyle = '#334155';
  ctx.fillRect(tx - 18, ty - 62, 36, 8);

  // 4 circular spotlights (3 lit, 1 burnt out for authentic raw 2nd-division character!)
  for (let i = 0; i < 4; i++) {
    const lx = tx - 15 + i * 9;
    const ly = ty - 60;
    const isBurntOut = i === 2; // 1 bulb burnt out!
    ctx.fillStyle = isNight ? (isBurntOut ? '#475569' : '#fef08a') : '#334155';
    ctx.fillRect(lx, ly, 7, 5);
    if (isNight && !isBurntOut) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(lx + 1, ly + 1, 5, 3);
    }
  }

  if (isNight) {
    const halo = ctx.createRadialGradient(tx, ty - 58, 6, tx, ty - 58, 75);
    halo.addColorStop(0, 'rgba(254, 240, 138, 0.28)');
    halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(tx, ty - 58, 75, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
