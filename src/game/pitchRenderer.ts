import { PITCH_CONFIG, HOME_KIT, AWAY_KIT } from './constants';
import {
  TurfParticle,
  GoalNetState,
  Player,
  PowerBarState,
  GraphicsSettings,
  PitchScuffMark,
  Ball,
  StadiumTier,
  TimeOfDay,
  SeatColorMode,
  TeamKit,
  TurfQuality,
  GrassLength,
  WeatherCondition,
  Season,
  NetTension,
  GoalFrameType,
  PuddleZone,
  LawnMowingPattern,
  SurfaceStatus,
  CrowdLevel,
} from '../types';
import { StadiumDefinition } from '../types/stadium';
import { drawPerimeterHorizon, drawStadiumArchitecture } from './stadiumRenderer';
import {
  drawTopGrandstandWithAtmosphere,
  drawBottomGrandstandWithAtmosphere,
  updateAndDrawCrowdFlashbulbs,
} from './crowdRenderer';
import { drawPoorTurfPatches } from './turfPhysics';
import { drawWeatherAtmosphere, getWeatherSurfaceModifiers } from './weatherEngine';
import { getGoalFrameMetrics } from './goalNetPhysics';

const pitchPatternCache: Record<string, HTMLCanvasElement> = {};

/**
 * Phase 17.2: Calibrated Turf Color Palettes
 */
interface TurfPalette {
  baseLight: string;
  baseDark: string;
  highlight: string;
  subtleHighlight: string;
  shadow: string;
  tuftLight: string;
  tuftDark: string;
}

function getTurfPalette(quality: TurfQuality): TurfPalette {
  switch (quality) {
    case 'poor':
      // Arid, yellowish-green faded hue with dry soil undertone
      return {
        baseLight: '#6d7b2a',
        baseDark: '#58641e',
        highlight: '#8c9c38',
        subtleHighlight: '#7a892d',
        shadow: '#382b12',
        tuftLight: 'rgba(150, 170, 70, 0.32)',
        tuftDark: 'rgba(50, 40, 15, 0.40)',
      };
    case 'pristine':
      // Deep, rich vibrant emerald green with razor-sharp highlights
      return {
        baseLight: '#1eb842',
        baseDark: '#128e30',
        highlight: '#6ef88d',
        subtleHighlight: '#48d868',
        shadow: '#0a501a',
        tuftLight: 'rgba(110, 250, 140, 0.32)',
        tuftDark: 'rgba(5, 45, 15, 0.35)',
      };
    case 'normal':
    default:
      // Standard authentic football pitch green
      return {
        baseLight: '#3e9a1f',
        baseDark: '#338317',
        highlight: '#58c030',
        subtleHighlight: '#4db226',
        shadow: '#1c520a',
        tuftLight: 'rgba(100, 220, 60, 0.28)',
        tuftDark: 'rgba(15, 50, 10, 0.32)',
      };
  }
}

/**
 * Creates an authentic, high-detail 16-bit pixel turf pattern for all 7 mowing patterns:
 * 1. Plain Cut (Uniform)
 * 2. Horizontal Stripes
 * 3. Vertical Stripes
 * 4. European Top-Club Checkered Shades (Box Lawn)
 * 5. High-Contrast Checkerboard
 * 6. Diagonal / Diamond Grid
 * 7. Concentric Circles (base uniform pattern; ripple rings drawn on-pitch)
 */
function getPitchPattern(
  quality: TurfQuality = 'normal',
  mowingPattern: LawnMowingPattern = 'horizontal'
): HTMLCanvasElement {
  const cacheKey = `${quality}_${mowingPattern}`;
  if (pitchPatternCache[cacheKey]) return pitchPatternCache[cacheKey];

  const palette = getTurfPalette(quality);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  const pHash = (x: number, y: number) => {
    let h = (x * 374761393 + y * 668265263) ^ (x * y);
    h = (h ^ (h >> 13)) * 1274126177;
    return (h ^ (h >> 16)) & 0xffff;
  };

  if (mowingPattern === 'plain' || mowingPattern === 'concentric_circles') {
    // ---------------------------------------------------------
    // 1. PLAIN CUT & CONCENTRIC CIRCLES BASE: Clean uniform lawn
    // ---------------------------------------------------------
    canvas.width = 128;
    canvas.height = 128;
    ctx.fillStyle = palette.baseLight;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else if (mowingPattern === 'horizontal') {
    // ---------------------------------------------------------
    // 2. HORIZONTAL STRIPES: Alternating perpendicular bands
    // ---------------------------------------------------------
    const stripeH = 64;
    canvas.width = 160;
    canvas.height = stripeH * 2;

    ctx.fillStyle = palette.baseLight;
    ctx.fillRect(0, 0, canvas.width, stripeH);
    ctx.fillStyle = palette.highlight;
    ctx.fillRect(0, 0, canvas.width, 1);
    ctx.fillStyle = palette.subtleHighlight;
    ctx.fillRect(0, 1, canvas.width, 1);
    ctx.fillStyle = palette.shadow;
    ctx.fillRect(0, stripeH - 1, canvas.width, 1);

    ctx.fillStyle = palette.baseDark;
    ctx.fillRect(0, stripeH, canvas.width, stripeH);
    ctx.fillStyle = palette.subtleHighlight;
    ctx.fillRect(0, stripeH, canvas.width, 1);
    ctx.fillStyle = palette.shadow;
    ctx.fillRect(0, stripeH * 2 - 1, canvas.width, 1);
  } else if (mowingPattern === 'vertical') {
    // ---------------------------------------------------------
    // 3. VERTICAL STRIPES: Alternating longitudinal goal-to-goal lanes
    // ---------------------------------------------------------
    const stripeW = 64;
    canvas.width = stripeW * 2;
    canvas.height = 160;

    ctx.fillStyle = palette.baseLight;
    ctx.fillRect(0, 0, stripeW, canvas.height);
    ctx.fillStyle = palette.highlight;
    ctx.fillRect(0, 0, 1, canvas.height);
    ctx.fillStyle = palette.shadow;
    ctx.fillRect(stripeW - 1, 0, 1, canvas.height);

    ctx.fillStyle = palette.baseDark;
    ctx.fillRect(stripeW, 0, stripeW, canvas.height);
    ctx.fillStyle = palette.subtleHighlight;
    ctx.fillRect(stripeW, 0, 1, canvas.height);
    ctx.fillStyle = palette.shadow;
    ctx.fillRect(stripeW * 2 - 1, 0, 1, canvas.height);
  } else if (mowingPattern === 'european_boxes') {
    // ---------------------------------------------------------
    // 4. EUROPEAN BOXES: Signature UEFA Champions League Checkered Shades
    // ---------------------------------------------------------
    const boxSize = 80;
    canvas.width = boxSize * 2;
    canvas.height = boxSize * 2;

    ctx.fillStyle = palette.baseLight;
    ctx.fillRect(0, 0, boxSize, boxSize);
    ctx.fillRect(boxSize, boxSize, boxSize, boxSize);

    ctx.fillStyle = palette.baseDark;
    ctx.fillRect(boxSize, 0, boxSize, boxSize);
    ctx.fillRect(0, boxSize, boxSize, boxSize);

    // Subtle edge mowing pass contrast
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.fillRect(0, 0, canvas.width, 1);
    ctx.fillRect(0, boxSize, canvas.width, 1);
    ctx.fillRect(0, 0, 1, canvas.height);
    ctx.fillRect(boxSize, 0, 1, canvas.height);
  } else if (mowingPattern === 'checkerboard') {
    // ---------------------------------------------------------
    // 5. HIGH-CONTRAST CHECKERBOARD: Bold alternating tiles
    // ---------------------------------------------------------
    const tileSize = 64;
    canvas.width = tileSize * 2;
    canvas.height = tileSize * 2;

    ctx.fillStyle = palette.baseLight;
    ctx.fillRect(0, 0, tileSize, tileSize);
    ctx.fillRect(tileSize, tileSize, tileSize, tileSize);

    ctx.fillStyle = palette.baseDark;
    ctx.fillRect(tileSize, 0, tileSize, tileSize);
    ctx.fillRect(0, tileSize, tileSize, tileSize);

    // High-contrast border seams
    ctx.fillStyle = palette.highlight;
    ctx.fillRect(0, 0, canvas.width, 1);
    ctx.fillRect(0, 0, 1, canvas.height);
    ctx.fillStyle = palette.shadow;
    ctx.fillRect(0, tileSize - 1, canvas.width, 1);
    ctx.fillRect(tileSize - 1, 0, 1, canvas.height);
  } else if (mowingPattern === 'diagonal_diamonds') {
    // ---------------------------------------------------------
    // 6. DIAGONAL / DIAMOND GRID: 45-degree intersecting mowing paths
    // ---------------------------------------------------------
    const dSize = 96;
    canvas.width = dSize;
    canvas.height = dSize;

    ctx.fillStyle = palette.baseLight;
    ctx.fillRect(0, 0, dSize, dSize);

    // Draw diamond center patch
    ctx.fillStyle = palette.baseDark;
    ctx.beginPath();
    ctx.moveTo(dSize / 2, 0);
    ctx.lineTo(dSize, dSize / 2);
    ctx.lineTo(dSize / 2, dSize);
    ctx.lineTo(0, dSize / 2);
    ctx.closePath();
    ctx.fill();

    // Corner triangles
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(dSize / 4, 0);
    ctx.lineTo(0, dSize / 4);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(dSize, 0);
    ctx.lineTo(dSize - dSize / 4, 0);
    ctx.lineTo(dSize, dSize / 4);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, dSize);
    ctx.lineTo(dSize / 4, dSize);
    ctx.lineTo(0, dSize - dSize / 4);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(dSize, dSize);
    ctx.lineTo(dSize - dSize / 4, dSize);
    ctx.lineTo(dSize, dSize - dSize / 4);
    ctx.closePath();
    ctx.fill();

    // Diamond seam line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(dSize / 2, 0);
    ctx.lineTo(dSize, dSize / 2);
    ctx.lineTo(dSize / 2, dSize);
    ctx.lineTo(0, dSize / 2);
    ctx.closePath();
    ctx.stroke();
  }

  // ---------------------------------------------------------
  // HIGH-DETAIL PIXEL GRASS BLADE DITHERING
  // ---------------------------------------------------------
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const idx = (y * canvas.width + x) * 4;
      const rnd = pHash(x, y);

      if (rnd % 19 === 0) {
        // Bright grass tip
        const boost = 30;
        data[idx] = Math.min(255, data[idx] + boost * 0.45);
        data[idx + 1] = Math.min(255, data[idx + 1] + boost);
        data[idx + 2] = Math.min(255, data[idx + 2] + boost * 0.35);
      } else if (rnd % 23 === 0) {
        // Subtle secondary blade sheen
        const boost = 18;
        data[idx] = Math.min(255, data[idx] + boost * 0.4);
        data[idx + 1] = Math.min(255, data[idx + 1] + boost);
        data[idx + 2] = Math.min(255, data[idx + 2] + boost * 0.3);
      } else if (rnd % 17 === 0) {
        // Turf root depth shadow
        const cut = 22;
        data[idx] = Math.max(0, data[idx] - cut * 0.5);
        data[idx + 1] = Math.max(0, data[idx + 1] - cut);
        data[idx + 2] = Math.max(0, data[idx + 2] - cut * 0.4);
      } else {
        // Micro-fine blade texture
        const microNoise = ((rnd % 11) - 5) * 2;
        data[idx] = Math.max(0, Math.min(255, data[idx] + microNoise * 0.3));
        data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + microNoise * 0.8));
        data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + microNoise * 0.25));
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // Add subtle 2px directional grass blade tufts for high-craft finish
  ctx.fillStyle = palette.tuftLight;
  for (let y = 3; y < canvas.height - 3; y += 7) {
    for (let x = 4; x < canvas.width - 4; x += 11) {
      const h = pHash(x, y);
      if (h % 5 === 0) {
        ctx.fillRect(x, y, 1, 2);
        ctx.fillRect(x + 1, y - 1, 1, 1);
      }
    }
  }

  ctx.fillStyle = palette.tuftDark;
  for (let y = 4; y < canvas.height - 4; y += 8) {
    for (let x = 5; x < canvas.width - 5; x += 13) {
      const h = pHash(x * 3, y * 2);
      if (h % 5 === 0) {
        ctx.fillRect(x, y + 2, 2, 1);
      }
    }
  }

  pitchPatternCache[cacheKey] = canvas;
  return canvas;
}

/**
 * Concentric circles circular mowing ripples radiating from pitch center (Section 17.2)
 */
function drawConcentricCirclesMowing(ctx: CanvasRenderingContext2D, turfQuality: TurfQuality) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(
    PITCH_CONFIG.PITCH_LEFT - 70,
    PITCH_CONFIG.PITCH_TOP - 70,
    PITCH_CONFIG.FIELD_WIDTH + 140,
    PITCH_CONFIG.FIELD_HEIGHT + 140
  );
  ctx.clip();

  const maxRadius = Math.hypot(PITCH_CONFIG.FIELD_WIDTH, PITCH_CONFIG.FIELD_HEIGHT) / 2 + 120;
  const ringWidth = 55;
  const alpha = turfQuality === 'pristine' ? 0.16 : turfQuality === 'poor' ? 0.12 : 0.14;

  for (let r = 0; r < maxRadius; r += ringWidth * 2) {
    ctx.beginPath();
    ctx.arc(PITCH_CONFIG.CENTER_X, PITCH_CONFIG.CENTER_Y, r + ringWidth, 0, Math.PI * 2);
    ctx.arc(PITCH_CONFIG.CENTER_X, PITCH_CONFIG.CENTER_Y, r, 0, Math.PI * 2, true);
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    ctx.fill();

    // Mower boundary track highlight line
    ctx.beginPath();
    ctx.arc(PITCH_CONFIG.CENTER_X, PITCH_CONFIG.CENTER_Y, r + ringWidth, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();
}

// ========================================================
// PHASE 9: PERSISTENT PITCH SCUFF MARKS & TURF DEGRADATION
// ========================================================
const PITCH_SCUFFS: PitchScuffMark[] = [];

export function addPitchScuff(
  x: number,
  y: number,
  angle: number,
  length: number = 28,
  width: number = 5
) {
  if (PITCH_SCUFFS.length > 75) {
    PITCH_SCUFFS.shift(); // Bound memory footprint
  }
  PITCH_SCUFFS.push({
    x,
    y,
    angle,
    length,
    width,
    opacity: 0.72,
    color: Math.random() > 0.5 ? '#1a430c' : '#225210',
  });
}

export function clearPitchScuffs() {
  PITCH_SCUFFS.length = 0;
}

function drawPitchScuffs(ctx: CanvasRenderingContext2D) {
  if (PITCH_SCUFFS.length === 0) return;
  ctx.save();
  for (const scuff of PITCH_SCUFFS) {
    ctx.save();
    ctx.translate(scuff.x, scuff.y);
    ctx.rotate(scuff.angle);
    ctx.globalAlpha = scuff.opacity;
    // Outer gouge
    ctx.fillStyle = scuff.color;
    ctx.fillRect(-scuff.length / 2, -scuff.width / 2, scuff.length, scuff.width);
    // Darker inner soil furrow
    ctx.fillStyle = '#0f2905';
    ctx.fillRect(-scuff.length / 2 + 3, -scuff.width / 4, scuff.length - 6, scuff.width / 2);
    ctx.restore();
  }
  ctx.restore();
}

// ========================================================
// PHASE 9: VOLUMETRIC STADIUM BLOOM & CROWD FLASHBULBS
// ========================================================
function drawVolumetricFloodlightBloom(ctx: CanvasRenderingContext2D) {
  const bloomTowers = [
    { x: PITCH_CONFIG.PITCH_LEFT - 190, y: PITCH_CONFIG.PITCH_TOP - 220, targetX: PITCH_CONFIG.PITCH_LEFT + 200, targetY: PITCH_CONFIG.PITCH_TOP + 300 },
    { x: PITCH_CONFIG.PITCH_RIGHT + 190, y: PITCH_CONFIG.PITCH_TOP - 220, targetX: PITCH_CONFIG.PITCH_RIGHT - 200, targetY: PITCH_CONFIG.PITCH_TOP + 300 },
    { x: PITCH_CONFIG.PITCH_LEFT - 190, y: PITCH_CONFIG.PITCH_BOTTOM + 220, targetX: PITCH_CONFIG.PITCH_LEFT + 200, targetY: PITCH_CONFIG.PITCH_BOTTOM - 300 },
    { x: PITCH_CONFIG.PITCH_RIGHT + 190, y: PITCH_CONFIG.PITCH_BOTTOM + 220, targetX: PITCH_CONFIG.PITCH_RIGHT - 200, targetY: PITCH_CONFIG.PITCH_BOTTOM - 300 },
  ];

  ctx.save();
  for (const t of bloomTowers) {
    const beamGrad = ctx.createRadialGradient(t.x, t.y - 65, 12, t.x, t.y - 65, 260);
    beamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.28)');
    beamGrad.addColorStop(0.35, 'rgba(253, 224, 71, 0.08)');
    beamGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.arc(t.x, t.y - 65, 260, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}


/**
 * Draws the entire realistic pixel football stadium, pitch, markings, crowd, and 3D goals
 * Phase 11: Supports tactical pitch dimensions, turf quality, grass length, weather atmosphere, and goal frames.
 */
export function drawPitch(
  ctx: CanvasRenderingContext2D,
  viewLeft: number,
  viewTop: number,
  viewWidth: number,
  viewHeight: number,
  topNetState?: GoalNetState | number,
  bottomNetState?: GoalNetState | number,
  pitchTilt: number = 0.5,
  cameraX: number = PITCH_CONFIG.CENTER_X,
  cameraY: number = PITCH_CONFIG.CENTER_Y,
  graphicsSettings?: GraphicsSettings,
  ballY: number = PITCH_CONFIG.CENTER_Y,
  isShooting: boolean = false,
  stadiumTier: StadiumTier = 'monumental',
  timeOfDay: TimeOfDay = 'night',
  seatColor: SeatColorMode = 'auto',
  homeKit: TeamKit = HOME_KIT,
  awayKit: TeamKit = AWAY_KIT,
  turfQuality: TurfQuality = 'normal',
  grassLength: GrassLength = 'normal',
  weather: WeatherCondition = 'clear',
  season: Season = 'summer',
  netTension: NetTension = 'moderate',
  goalFrame: GoalFrameType = 'standard',
  puddles: PuddleZone[] = [],
  mowingPattern: LawnMowingPattern = 'horizontal',
  surfaceStatus: SurfaceStatus = 'normal',
  crowdLevel: CrowdLevel = 'crowded',
  isPenalty: boolean = false,
  isGoalCelebration: boolean = false,
  stadiumDef?: StadiumDefinition
) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // Performance tier optimization: lock shadowBlur to 0
  if (graphicsSettings?.tier === 'performance') {
    ctx.shadowBlur = 0;
  }

  // Normalize net states
  const topNet: GoalNetState = (typeof topNetState === 'object' && topNetState !== null)
    ? topNetState
    : { impactX: PITCH_CONFIG.CENTER_X, impactY: PITCH_CONFIG.PITCH_TOP - 20, impactZ: 10, bulgeAmount: 0, bulgeVel: 0, shake: typeof topNetState === 'number' ? topNetState : 0, ballCaught: false };

  const bottomNet: GoalNetState = (typeof bottomNetState === 'object' && bottomNetState !== null)
    ? bottomNetState
    : { impactX: PITCH_CONFIG.CENTER_X, impactY: PITCH_CONFIG.PITCH_BOTTOM + 20, impactZ: 10, bulgeAmount: 0, bulgeVel: 0, shake: typeof bottomNetState === 'number' ? bottomNetState : 0, ballCaught: false };

  const weatherMods = getWeatherSurfaceModifiers(weather, season, turfQuality);

  // 0. Phase 10 & 12: Dynamic Perimeter Horizon & Skybox (Metropolis, English Heritage, Ascenso, Airport, Marine, Beach, Nature, Parking)
  drawPerimeterHorizon(ctx, cameraX, cameraY, stadiumTier, timeOfDay, graphicsSettings, stadiumDef?.surroundings);

  // Volumetric Stadium Floodlight Bloom & Rafter Haze (Phase 9 High-End)
  if (graphicsSettings?.volumetricLighting) {
    drawVolumetricFloodlightBloom(ctx);
  }

  // 1. Phase 10 & 12: Stadium Surrounds, Apron (Running Track), Hoardings, Dugouts (5 types) & Entrance Tunnel (5 types)
  drawStadiumArchitecture(ctx, cameraX, cameraY, stadiumTier, timeOfDay, homeKit, awayKit, graphicsSettings, stadiumDef);

  // 2. Phase 17.2: Draw Textured Regulation Grass Pitch (supports all 7 mowing patterns & 3 turf grades)
  const grassCanvas = getPitchPattern(turfQuality, mowingPattern);
  const pattern = ctx.createPattern(grassCanvas, 'repeat');
  if (pattern) {
    ctx.fillStyle = pattern;
  } else {
    ctx.fillStyle = turfQuality === 'pristine' ? '#1eb842' : turfQuality === 'poor' ? '#6d7b2a' : '#3e8f1c';
  }

  // Draw regulation pitch field with boundary honoring apron perimeter material
  const pitchMargin = (stadiumDef?.apronMaterial && stadiumDef.apronMaterial !== 'grass') ? 16 : 70;
  ctx.fillRect(
    PITCH_CONFIG.PITCH_LEFT - pitchMargin,
    PITCH_CONFIG.PITCH_TOP - pitchMargin,
    PITCH_CONFIG.FIELD_WIDTH + pitchMargin * 2,
    PITCH_CONFIG.FIELD_HEIGHT + pitchMargin * 2
  );

  // Phase 17.2: Concentric Circles ripple rings
  if (mowingPattern === 'concentric_circles') {
    drawConcentricCirclesMowing(ctx, turfQuality);
  }

  // Phase 17.2: Turf Quality Palette Tint
  if (turfQuality === 'poor') {
    ctx.fillStyle = 'rgba(180, 160, 40, 0.08)'; // Arid yellowish sun-faded wash
    ctx.fillRect(
      PITCH_CONFIG.PITCH_LEFT - pitchMargin,
      PITCH_CONFIG.PITCH_TOP - pitchMargin,
      PITCH_CONFIG.FIELD_WIDTH + pitchMargin * 2,
      PITCH_CONFIG.FIELD_HEIGHT + pitchMargin * 2
    );
  } else if (turfQuality === 'pristine') {
    ctx.fillStyle = 'rgba(30, 255, 100, 0.04)'; // Vibrant emerald sheen
    ctx.fillRect(
      PITCH_CONFIG.PITCH_LEFT - pitchMargin,
      PITCH_CONFIG.PITCH_TOP - pitchMargin,
      PITCH_CONFIG.FIELD_WIDTH + pitchMargin * 2,
      PITCH_CONFIG.FIELD_HEIGHT + pitchMargin * 2
    );
  }

  // Phase 17.2: Surface Status Sheen & Drainage
  if (surfaceStatus === 'wet') {
    ctx.fillStyle = 'rgba(180, 230, 255, 0.09)'; // High-gloss wet reflection
    ctx.fillRect(
      PITCH_CONFIG.PITCH_LEFT - pitchMargin,
      PITCH_CONFIG.PITCH_TOP - pitchMargin,
      PITCH_CONFIG.FIELD_WIDTH + pitchMargin * 2,
      PITCH_CONFIG.FIELD_HEIGHT + pitchMargin * 2
    );
  } else if (surfaceStatus === 'dry') {
    ctx.fillStyle = 'rgba(255, 235, 180, 0.04)'; // Dry parched sunlight warmth
    ctx.fillRect(
      PITCH_CONFIG.PITCH_LEFT - pitchMargin,
      PITCH_CONFIG.PITCH_TOP - pitchMargin,
      PITCH_CONFIG.FIELD_WIDTH + pitchMargin * 2,
      PITCH_CONFIG.FIELD_HEIGHT + pitchMargin * 2
    );
  }

  // Phase 11: Grass Length tint overlay
  if (grassLength === 'long') {
    ctx.fillStyle = 'rgba(10, 40, 10, 0.12)'; // Darker heavy cut sheen
    ctx.fillRect(
      PITCH_CONFIG.PITCH_LEFT - pitchMargin,
      PITCH_CONFIG.PITCH_TOP - pitchMargin,
      PITCH_CONFIG.FIELD_WIDTH + pitchMargin * 2,
      PITCH_CONFIG.FIELD_HEIGHT + pitchMargin * 2
    );
  } else if (grassLength === 'short') {
    ctx.fillStyle = 'rgba(255, 255, 200, 0.05)'; // Light fast-cut sheen
    ctx.fillRect(
      PITCH_CONFIG.PITCH_LEFT - pitchMargin,
      PITCH_CONFIG.PITCH_TOP - pitchMargin,
      PITCH_CONFIG.FIELD_WIDTH + pitchMargin * 2,
      PITCH_CONFIG.FIELD_HEIGHT + pitchMargin * 2
    );
  }

  // 3. Draw Goalmouth Scuffed Turf & Penalty Box Wear (authentic realism)
  drawGoalmouthWear(ctx);

  // Phase 11: Dry bare soil patches on Poor Turf
  if (turfQuality === 'poor') {
    drawPoorTurfPatches(ctx);
  }

  // Dynamic Pitch Scuffs: tackle gouges & skid marks persist on turf (Phase 9 High-End)
  if (graphicsSettings?.pitchScuffs !== false) {
    drawPitchScuffs(ctx);
  }

  // 4. Draw Regulation Pitch Markings (Phase 11: Enforces 🔴 Red Line Mandate in Snow/Blizzard)
  drawPitchMarkings(ctx, weatherMods.isRedLines);

  // 5. Corner Flags
  drawCornerFlags(ctx);

  // Phase 11: Weather Atmosphere, Snow Dusting Blanket, Standing Water Puddles & Rain Streaks
  drawWeatherAtmosphere(ctx, weather, puddles, viewLeft, viewTop, viewWidth, viewHeight);

  // 6. Phase 10 & 13.2: Grandstands, Customizable Seats & Club Supporters with Waving Flags/Banners
  drawTopGrandstandWithAtmosphere(ctx, stadiumTier, seatColor, homeKit, awayKit, graphicsSettings, crowdLevel, stadiumDef?.stands?.north);
  drawBottomGrandstandWithAtmosphere(ctx, stadiumTier, seatColor, homeKit, awayKit, graphicsSettings, crowdLevel, stadiumDef?.stands?.south);

  // Dynamic Crowd Flashbulbs (Phase 9 High-End & Balanced)
  if (graphicsSettings?.crowdFlashbulbs) {
    updateAndDrawCrowdFlashbulbs(ctx, ballY, isShooting, isPenalty, isGoalCelebration);
  }

  // 7. Draw Top Goal (Rival Goal with 3D net depth, Brazilian frame & tension)
  drawTopGoal(ctx, topNet, pitchTilt, goalFrame, netTension);

  // 8. Draw Bottom Goal (Own Goal with 3D net depth, Brazilian frame & tension)
  drawBottomGoal(ctx, bottomNet, pitchTilt, goalFrame, netTension);

  // Phase 11: Weather Ambient Hue Tint (Storm gloom, frosty snow veil, golden autumn)
  if (weatherMods.atmosphericHueOverlay) {
    ctx.fillStyle = weatherMods.atmosphericHueOverlay;
    ctx.fillRect(
      PITCH_CONFIG.PITCH_LEFT - 300,
      PITCH_CONFIG.PITCH_TOP - 300,
      PITCH_CONFIG.FIELD_WIDTH + 600,
      PITCH_CONFIG.FIELD_HEIGHT + 600
    );
  }

  ctx.restore();
}

/**
 * Renders extended background with subtle parallax perspective:
 * Sky gradient, distant city skyline with lit windows,
 * outer stadium concourse, perimeter wall, and 4 massive floodlight pylons.
 */
function drawPerspectiveBackground(
  ctx: CanvasRenderingContext2D,
  cameraX: number,
  cameraY: number,
  pitchTilt: number
) {
  const cx = PITCH_CONFIG.CENTER_X;
  const cy = PITCH_CONFIG.CENTER_Y;

  // Parallax offsets (subtle shift as camera moves toward stadium edges)
  const pX = (cameraX - cx) * 0.12;
  const pY = (cameraY - cy) * 0.08;

  const bgLeft = PITCH_CONFIG.PITCH_LEFT - 1400;
  const bgTop = PITCH_CONFIG.PITCH_TOP - 1200;
  const bgWidth = PITCH_CONFIG.FIELD_WIDTH + 2800;
  const bgHeight = PITCH_CONFIG.FIELD_HEIGHT + 2400;

  // 1. Deep Stadium Dusk Sky
  const skyGrad = ctx.createLinearGradient(0, bgTop, 0, PITCH_CONFIG.PITCH_TOP - 200);
  skyGrad.addColorStop(0, '#0a1024');
  skyGrad.addColorStop(0.5, '#121b38');
  skyGrad.addColorStop(1, '#1b2a4a');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(bgLeft, bgTop, bgWidth, (PITCH_CONFIG.PITCH_TOP - bgTop) + 100);

  // Distant stars / stadium haze
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  for (let sx = bgLeft + 50; sx < bgLeft + bgWidth - 50; sx += 180) {
    const starY = bgTop + 60 + ((sx * 13) % 240);
    ctx.fillRect(sx - pX * 0.3, starY - pY * 0.2, 2, 2);
  }

  // 2. Parallax Distant City Skyline Silhouettes (beyond the stadium roof)
  const horizonY = PITCH_CONFIG.PITCH_TOP - 320 - pY * 0.5;
  ctx.fillStyle = '#0f172a';
  for (let bx = bgLeft + 100; bx < bgLeft + bgWidth - 100; bx += 75) {
    const bHeight = 70 + ((bx * 31) % 110);
    const bWidth = 50 + ((bx * 17) % 35);
    const bX = bx - pX * 0.45;
    ctx.fillRect(bX, horizonY - bHeight, bWidth, bHeight);

    // Lit windows in buildings
    ctx.fillStyle = 'rgba(254, 240, 138, 0.35)';
    for (let wy = horizonY - bHeight + 12; wy < horizonY - 10; wy += 14) {
      for (let wx = bX + 6; wx < bX + bWidth - 6; wx += 10) {
        if (((wx + wy) % 5) !== 0) {
          ctx.fillRect(wx, wy, 4, 6);
        }
      }
    }
    // Radio tower antennas with blinking lights
    if ((bx % 300) < 80) {
      ctx.fillStyle = '#64748b';
      ctx.fillRect(bX + bWidth / 2 - 1, horizonY - bHeight - 25, 2, 25);
      ctx.fillStyle = '#ef4444'; // Red beacon
      ctx.fillRect(bX + bWidth / 2 - 2, horizonY - bHeight - 26, 4, 3);
    }
    ctx.fillStyle = '#0f172a';
  }

  // 3. Outer Stadium Concourse Floor & Perimeter Pavement
  const outerLeft = PITCH_CONFIG.PITCH_LEFT - 320;
  const outerTop = PITCH_CONFIG.PITCH_TOP - 320;
  const outerWidth = PITCH_CONFIG.FIELD_WIDTH + 640;
  const outerHeight = PITCH_CONFIG.FIELD_HEIGHT + 640;

  // Dark asphalt / concrete grounds around stadium
  ctx.fillStyle = '#171d18';
  ctx.fillRect(outerLeft - 100, outerTop - 100, outerWidth + 200, outerHeight + 200);

  // Outer security wall / perimeter barrier
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 4;
  ctx.strokeRect(outerLeft - 40, outerTop - 40, outerWidth + 80, outerHeight + 80);

  // Outer stadium banner flagpoles
  const flagpoles = [
    { x: PITCH_CONFIG.PITCH_LEFT - 180, y: PITCH_CONFIG.PITCH_TOP - 170, color: '#0055b8' },
    { x: PITCH_CONFIG.PITCH_LEFT - 180, y: PITCH_CONFIG.PITCH_TOP - 90, color: '#ffffff' },
    { x: PITCH_CONFIG.PITCH_RIGHT + 180, y: PITCH_CONFIG.PITCH_TOP - 170, color: '#c8102e' },
    { x: PITCH_CONFIG.PITCH_RIGHT + 180, y: PITCH_CONFIG.PITCH_TOP - 90, color: '#ffffff' },
    { x: PITCH_CONFIG.PITCH_LEFT - 180, y: PITCH_CONFIG.PITCH_BOTTOM + 170, color: '#0055b8' },
    { x: PITCH_CONFIG.PITCH_RIGHT + 180, y: PITCH_CONFIG.PITCH_BOTTOM + 170, color: '#c8102e' },
  ];

  ctx.fillStyle = '#94a3b8';
  for (const fp of flagpoles) {
    ctx.fillRect(fp.x, fp.y - 36, 2, 36);
    // Waving triangular pennant
    ctx.fillStyle = fp.color;
    ctx.beginPath();
    ctx.moveTo(fp.x + 2, fp.y - 36);
    ctx.lineTo(fp.x + 18, fp.y - 30);
    ctx.lineTo(fp.x + 2, fp.y - 24);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#94a3b8';
  }

  // 4. Massive 4-Corner Stadium Floodlight Towers
  const towers = [
    { x: PITCH_CONFIG.PITCH_LEFT - 190, y: PITCH_CONFIG.PITCH_TOP - 220, dir: 'down-right' },
    { x: PITCH_CONFIG.PITCH_RIGHT + 190, y: PITCH_CONFIG.PITCH_TOP - 220, dir: 'down-left' },
    { x: PITCH_CONFIG.PITCH_LEFT - 190, y: PITCH_CONFIG.PITCH_BOTTOM + 220, dir: 'up-right' },
    { x: PITCH_CONFIG.PITCH_RIGHT + 190, y: PITCH_CONFIG.PITCH_BOTTOM + 220, dir: 'up-left' },
  ];

  for (const t of towers) {
    drawFloodlightTower(ctx, t.x - pX * 0.25, t.y - pY * 0.25, t.dir);
  }
}

/**
 * Draws iconic retro steel lattice floodlight pylon with glowing halogen bulb bank
 */
function drawFloodlightTower(ctx: CanvasRenderingContext2D, tx: number, ty: number, dir: string) {
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
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(tx - 22, ty - 73, 44, 12);

  // Halogen lamp matrix (4x2 glowing bulbs)
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 6; col++) {
      const lx = tx - 20 + col * 7;
      const ly = ty - 71 + row * 6;
      ctx.fillStyle = '#fef08a'; // Bright yellow halogen bulb
      ctx.fillRect(lx, ly, 5, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(lx + 1, ly + 1, 3, 2);
    }
  }

  // Atmospheric floodlight bloom halo
  const haloGrad = ctx.createRadialGradient(tx, ty - 65, 8, tx, ty - 65, 90);
  haloGrad.addColorStop(0, 'rgba(254, 240, 138, 0.32)');
  haloGrad.addColorStop(0.5, 'rgba(253, 224, 71, 0.12)');
  haloGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');
  ctx.fillStyle = haloGrad;
  ctx.beginPath();
  ctx.arc(tx, ty - 65, 90, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Draws outer stadium surrounds: red cinder running track and outer concrete wall
 */
function drawStadiumSurrounds(ctx: CanvasRenderingContext2D) {
  const left = PITCH_CONFIG.PITCH_LEFT - 130;
  const top = PITCH_CONFIG.PITCH_TOP - 160;
  const width = PITCH_CONFIG.FIELD_WIDTH + 260;
  const height = PITCH_CONFIG.FIELD_HEIGHT + 320;

  // Outer dark stadium concrete floor
  ctx.fillStyle = '#1e241c';
  ctx.fillRect(left - 40, top - 40, width + 80, height + 80);

  // Red cinder / clay running track perimeter (classic Olympic stadium style)
  ctx.fillStyle = '#873d2f';
  ctx.fillRect(left, top, width, height);

  // Running track lane lines (crisp pixel dashes)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1;
  ctx.setLineDash([8, 6]);
  ctx.strokeRect(left + 15, top + 15, width - 30, height - 30);
  ctx.strokeRect(left + 35, top + 35, width - 70, height - 70);
  ctx.setLineDash([]);

  // Running track surface grain
  ctx.fillStyle = '#733327';
  for (let y = top + 8; y < top + height; y += 14) {
    ctx.fillRect(left + 4, y, width - 8, 1);
  }
}


/**
 * Draws authentic goalmouth scuff marks and worn penalty box grass
 * where goalkeepers and penalty takers wear down the turf.
 */
function drawGoalmouthWear(ctx: CanvasRenderingContext2D) {
  const cx = PITCH_CONFIG.CENTER_X;
  const top = PITCH_CONFIG.PITCH_TOP;
  const bottom = PITCH_CONFIG.PITCH_BOTTOM;
  const sixW = PITCH_CONFIG.SIX_YARD_BOX_WIDTH;

  ctx.save();

  // TOP GOALMOUTH SCUFF (Around rival goalkeeper area)
  drawGoalAreaWearPatch(ctx, cx, top + 14, sixW * 0.7, 24);
  // Top penalty spot wear spot
  drawPenaltySpotScuff(ctx, cx, top + PITCH_CONFIG.PENALTY_SPOT_DIST);

  // BOTTOM GOALMOUTH SCUFF (Around home goalkeeper area)
  drawGoalAreaWearPatch(ctx, cx, bottom - 14, sixW * 0.7, 24);
  // Bottom penalty spot wear spot
  drawPenaltySpotScuff(ctx, cx, bottom - PITCH_CONFIG.PENALTY_SPOT_DIST);

  // Center circle kickoff trampled scuff
  drawKickoffScuff(ctx, cx, PITCH_CONFIG.CENTER_Y);

  ctx.restore();
}

function drawGoalAreaWearPatch(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number
) {
  // Translucent worn earthy turf base
  ctx.fillStyle = 'rgba(65, 90, 32, 0.42)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Earthy soil flecks in goalmouth
  ctx.fillStyle = '#4d5e28';
  for (let i = -w / 2 + 6; i < w / 2 - 6; i += 7) {
    const py = cy + Math.sin(i * 0.4) * (h * 0.35);
    ctx.fillRect(cx + i, py, 2, 1);
    ctx.fillRect(cx + i + 2, py + 1, 1, 1);
  }

  // Slightly lighter scuffed grass blades
  ctx.fillStyle = 'rgba(105, 138, 55, 0.45)';
  for (let i = -w / 3; i < w / 3; i += 9) {
    const py = cy + Math.cos(i * 0.3) * (h * 0.25);
    ctx.fillRect(cx + i, py - 1, 2, 2);
  }
}

function drawPenaltySpotScuff(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.fillStyle = 'rgba(60, 85, 28, 0.5)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 2, 9, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#4a5b25';
  ctx.fillRect(cx - 3, cy + 1, 6, 2);
}

function drawKickoffScuff(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.fillStyle = 'rgba(60, 85, 28, 0.38)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, 14, 7, 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Draws the regulation pitch lines with subtle chalk depth and painted grass texture.
 * Phase 11: In Snow / Blizzard conditions, dynamically enforces the 🔴 Red Line Mandate (Russian/Scandinavian winter rules).
 */
function drawPitchMarkings(ctx: CanvasRenderingContext2D, isRedLines: boolean = false) {
  ctx.save();

  const left = PITCH_CONFIG.PITCH_LEFT;
  const right = PITCH_CONFIG.PITCH_RIGHT;
  const top = PITCH_CONFIG.PITCH_TOP;
  const bottom = PITCH_CONFIG.PITCH_BOTTOM;
  const cx = PITCH_CONFIG.CENTER_X;
  const cy = PITCH_CONFIG.CENTER_Y;

  const lineCol = isRedLines ? '#ff3823' : '#ffffff';
  const shadowCol = isRedLines ? 'rgba(70, 15, 12, 0.65)' : 'rgba(15, 45, 10, 0.5)';

  // 1. Line Under-Shadow: Gives authentic "painted onto grass blades" appearance
  ctx.strokeStyle = shadowCol;
  ctx.lineWidth = 4;
  ctx.lineCap = 'square';

  // Shadow for outer boundary
  ctx.strokeRect(left + 1, top + 1, PITCH_CONFIG.FIELD_WIDTH, PITCH_CONFIG.FIELD_HEIGHT);

  // 2. Regulation Chalk Lines (White or Fluorescent Red)
  ctx.strokeStyle = lineCol;
  ctx.lineWidth = 3;

  // Outer Boundary Touchlines and Goal Lines
  ctx.strokeRect(left, top, PITCH_CONFIG.FIELD_WIDTH, PITCH_CONFIG.FIELD_HEIGHT);

  // Halfway Line with subtle shadow
  ctx.beginPath();
  ctx.moveTo(left, cy);
  ctx.lineTo(right, cy);
  ctx.stroke();

  // Center Circle & Center Spot
  ctx.beginPath();
  ctx.arc(cx, cy, PITCH_CONFIG.CENTER_CIRCLE_RADIUS, 0, Math.PI * 2);
  ctx.stroke();

  // Center Spot (regulation 22cm chalk circle)
  ctx.fillStyle = lineCol;
  ctx.beginPath();
  ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Center line kick-off tick
  ctx.strokeStyle = lineCol;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 6, cy);
  ctx.lineTo(cx + 6, cy);
  ctx.stroke();

  // TOP PENALTY BOX (Rival)
  const penW = PITCH_CONFIG.PENALTY_BOX_WIDTH;
  const penH = PITCH_CONFIG.PENALTY_BOX_HEIGHT;
  ctx.strokeRect(cx - penW / 2, top, penW, penH);

  // Top 6-yard Goal Area
  const sixW = PITCH_CONFIG.SIX_YARD_BOX_WIDTH;
  const sixH = PITCH_CONFIG.SIX_YARD_BOX_HEIGHT;
  ctx.strokeRect(cx - sixW / 2, top, sixW, sixH);

  // Top Penalty Spot
  ctx.beginPath();
  ctx.arc(cx, top + PITCH_CONFIG.PENALTY_SPOT_DIST, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Top Penalty Arc (D-arc outside box)
  ctx.beginPath();
  ctx.arc(cx, top + PITCH_CONFIG.PENALTY_SPOT_DIST, PITCH_CONFIG.CENTER_CIRCLE_RADIUS, 0.65, Math.PI - 0.65);
  ctx.stroke();

  // BOTTOM PENALTY BOX (Own)
  ctx.strokeRect(cx - penW / 2, bottom - penH, penW, penH);

  // Bottom 6-yard Goal Area
  ctx.strokeRect(cx - sixW / 2, bottom - sixH, sixW, sixH);

  // Bottom Penalty Spot
  ctx.beginPath();
  ctx.arc(cx, bottom - PITCH_CONFIG.PENALTY_SPOT_DIST, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Bottom Penalty Arc
  ctx.beginPath();
  ctx.arc(cx, bottom - PITCH_CONFIG.PENALTY_SPOT_DIST, PITCH_CONFIG.CENTER_CIRCLE_RADIUS, Math.PI + 0.65, Math.PI * 2 - 0.65);
  ctx.stroke();

  // Corner Arcs (4 corners with regulation 1m radius)
  const r = PITCH_CONFIG.CORNER_ARC_RADIUS;
  // Top-left
  ctx.beginPath();
  ctx.arc(left, top, r, 0, Math.PI / 2);
  ctx.stroke();
  // Top-right
  ctx.beginPath();
  ctx.arc(right, top, r, Math.PI / 2, Math.PI);
  ctx.stroke();
  // Bottom-left
  ctx.beginPath();
  ctx.arc(left, bottom, r, -Math.PI / 2, 0);
  ctx.stroke();
  // Bottom-right
  ctx.beginPath();
  ctx.arc(right, bottom, r, Math.PI, -Math.PI / 2);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws manager technical areas and substitute dugouts along the touchlines
 */
function drawTechnicalAreas(ctx: CanvasRenderingContext2D) {
  const left = PITCH_CONFIG.PITCH_LEFT;
  const cy = PITCH_CONFIG.CENTER_Y;

  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);

  // Home Technical Area (Left touchline, lower half)
  ctx.strokeRect(left - 38, cy + 20, 32, 90);

  // Away Technical Area (Left touchline, upper half)
  ctx.strokeRect(left - 38, cy - 110, 32, 90);

  ctx.setLineDash([]);

  // Dugout Shelters (Transparent blue perspex / metal team shelters)
  // Away Dugout
  drawDugout(ctx, left - 55, cy - 95, 14, 55, AWAY_KIT.primaryColor);
  // Home Dugout
  drawDugout(ctx, left - 55, cy + 35, 14, 55, HOME_KIT.primaryColor);

  ctx.restore();
}

function drawDugout(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  teamColor: string
) {
  // Dugout shadow
  ctx.fillStyle = 'rgba(10, 30, 10, 0.45)';
  ctx.fillRect(x - 2, y + 2, w + 4, h + 4);

  // Shelter canopy (translucent tinted acrylic)
  ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
  ctx.fillRect(x, y, w, h);

  // Metal frame
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);

  // Bench seats with team color
  ctx.fillStyle = teamColor;
  for (let seatY = y + 4; seatY < y + h - 6; seatY += 10) {
    ctx.fillRect(x + 3, seatY, w - 6, 6);
  }
}

/**
 * Precomputed, permanently fixed-color crowd system.
 * Each spectator has a 100% fixed shirt color, face skin tone, and scarf,
 * with subtle, organic vertical bobbing up and down.
 */
interface CrowdSpectator {
  x: number;
  baseY: number;
  color: string;
  headColor: string;
  hasScarf: boolean;
  scarfColor: string;
  phase: number;
  bobAmp: number;
}

const CROWD_SHIRT_PALETTE = [
  '#0055b8', // Home Royal Blue
  '#c8102e', // Passion Red
  '#f8fafc', // Crisp Home White
  '#ffd000', // Stadium Gold
  '#1e293b', // Deep Navy
  '#16a34a', // Emerald Green
  '#ea580c', // Vivid Orange
  '#0284c7', // Sky Blue
];

const CROWD_HEAD_PALETTE = ['#f5c898', '#d09868', '#fcd34d', '#c58a5c', '#8d5b32'];
const CROWD_SCARF_PALETTE = ['#facc15', '#ffffff', '#ef4444', '#3b82f6'];

function initGrandstandCrowd(grandstandY: number): CrowdSpectator[] {
  const left = PITCH_CONFIG.PITCH_LEFT - 100;
  const width = PITCH_CONFIG.FIELD_WIDTH + 200;
  const spectators: CrowdSpectator[] = [];

  // Deterministic PRNG seed for identical, unshakeable layout
  let seed = 4217 + Math.floor(grandstandY);
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  for (let row = 0; row < 5; row++) {
    const baseY = grandstandY + row * 15 + 4;
    for (let x = left + 8; x < left + width - 8; x += 11) {
      const colIdx = Math.floor(rand() * CROWD_SHIRT_PALETTE.length);
      const headIdx = Math.floor(rand() * CROWD_HEAD_PALETTE.length);
      const hasScarf = rand() < 0.22;
      const scarfIdx = Math.floor(rand() * CROWD_SCARF_PALETTE.length);

      spectators.push({
        x,
        baseY,
        color: CROWD_SHIRT_PALETTE[colIdx],
        headColor: CROWD_HEAD_PALETTE[headIdx],
        hasScarf,
        scarfColor: CROWD_SCARF_PALETTE[scarfIdx],
        phase: (x * 0.022) + (row * 0.65) + rand() * 0.5,
        bobAmp: 1.1 + rand() * 0.7,
      });
    }
  }
  return spectators;
}

const TOP_CROWD_SEATS: CrowdSpectator[] = initGrandstandCrowd(PITCH_CONFIG.PITCH_TOP - 95 - 80);
const BOTTOM_CROWD_SEATS: CrowdSpectator[] = initGrandstandCrowd(PITCH_CONFIG.PITCH_BOTTOM + 95);

/**
 * Draws animated top stadium crowd and retro advertising hoardings with fixed colors
 */
function drawCrowdGrandstand(ctx: CanvasRenderingContext2D, isStatic: boolean = false) {
  ctx.save();

  const boardY = PITCH_CONFIG.PITCH_TOP - 95;
  const grandstandY = boardY - 80;
  const left = PITCH_CONFIG.PITCH_LEFT - 100;
  const width = PITCH_CONFIG.FIELD_WIDTH + 200;

  // Grandstand steps background
  ctx.fillStyle = '#2b221d';
  ctx.fillRect(left, grandstandY, width, 80);

  // Concrete tier step lines
  ctx.fillStyle = '#3d312a';
  for (let s = 0; s < 5; s++) {
    ctx.fillRect(left, grandstandY + s * 15 + 13, width, 2);
  }

  // Draw spectators: fixed permanent colors, subtle vertical sine-wave bobbing (static on performance)
  const now = Date.now();
  for (let i = 0; i < TOP_CROWD_SEATS.length; i++) {
    const s = TOP_CROWD_SEATS[i];
    const bob = isStatic ? 0 : Math.round(Math.sin(now * 0.003 + s.phase) * s.bobAmp);
    const y = s.baseY + bob;

    // Body (fixed color)
    ctx.fillStyle = s.color;
    ctx.fillRect(s.x, y + 4, 6, 7);

    // Head (fixed skin tone)
    ctx.fillStyle = s.headColor;
    ctx.fillRect(s.x + 1, y, 4, 4);

    // Cheering fan scarf / banner in occasional fan
    if (s.hasScarf) {
      ctx.fillStyle = s.scarfColor;
      ctx.fillRect(s.x - 2, y - 1, 10, 2);
    }
  }

  // Barrier rail
  ctx.fillStyle = '#9ca3af';
  ctx.fillRect(left, boardY - 6, width, 4);
  ctx.fillStyle = '#4b5563';
  ctx.fillRect(left, boardY - 2, width, 2);

  // Advertising Hoardings / Ad Boards
  const adHeight = 32;
  const adY = boardY;
  ctx.fillStyle = '#111111';
  ctx.fillRect(left, adY, width, adHeight);

  // Ad board panels with authentic 16-bit sponsors
  const panelWidth = 220;
  const panels = [
    { bg: '#b81212', text: 'SENSIBLE SOCCER', color: '#ffffff' },
    { bg: '#d4d4d4', text: "'95 / '96", color: '#111111' },
    { bg: '#0055b8', text: 'PIXEL CUP', color: '#ffffff' },
    { bg: '#1c7430', text: 'AMIGA POWER', color: '#ffd700' },
    { bg: '#d4d4d4', text: "'95 / '96", color: '#111111' },
    { bg: '#b81212', text: 'WORLD CHAMPION', color: '#ffffff' },
    { bg: '#232b38', text: 'ARCADE FOOTBALL', color: '#00e5ff' },
    { bg: '#d4d4d4', text: "'95 / '96", color: '#111111' },
  ];

  let currentX = left;
  let idx = 0;
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.textBaseline = 'middle';

  while (currentX < left + width) {
    const p = panels[idx % panels.length];
    ctx.fillStyle = p.bg;
    ctx.fillRect(currentX, adY, panelWidth - 4, adHeight);

    // Bevel top/bottom of ad board
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(currentX, adY, panelWidth - 4, 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(currentX, adY + adHeight - 2, panelWidth - 4, 2);

    ctx.fillStyle = p.color;
    ctx.fillText(p.text, currentX + 12, adY + adHeight / 2 + 1);

    currentX += panelWidth;
    idx++;
  }

  // Pitchside photographers sitting on stools
  for (let px = left + 140; px < left + width - 140; px += 280) {
    // Stool
    ctx.fillStyle = '#444444';
    ctx.fillRect(px - 4, boardY + 36, 8, 8);
    // Photographer
    ctx.fillStyle = '#d09868'; // Face
    ctx.fillRect(px - 3, boardY + 24, 6, 6);
    ctx.fillStyle = '#ff7700'; // Fluorescent bib
    ctx.fillRect(px - 5, boardY + 30, 10, 8);
    // Camera with telephoto lens pointed at pitch
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px - 2, boardY + 33, 4, 10);
    ctx.fillStyle = '#111111';
    ctx.fillRect(px - 1, boardY + 41, 2, 3); // Lens aperture
  }

  ctx.restore();
}

/**
 * Draws animated bottom stadium crowd and retro advertising hoardings with fixed colors
 */
function drawBottomCrowdGrandstand(ctx: CanvasRenderingContext2D, isStatic: boolean = false) {
  ctx.save();

  const boardY = PITCH_CONFIG.PITCH_BOTTOM + 65;
  const grandstandY = boardY + 36;
  const left = PITCH_CONFIG.PITCH_LEFT - 100;
  const width = PITCH_CONFIG.FIELD_WIDTH + 200;

  // Advertising Hoardings / Ad Boards
  const adHeight = 32;
  ctx.fillStyle = '#111111';
  ctx.fillRect(left, boardY, width, adHeight);

  // Ad board panels with authentic 16-bit sponsors
  const panelWidth = 220;
  const panels = [
    { bg: '#0055b8', text: 'PIXEL CUP', color: '#ffffff' },
    { bg: '#d4d4d4', text: "'95 / '96", color: '#111111' },
    { bg: '#b81212', text: 'SENSIBLE SOCCER', color: '#ffffff' },
    { bg: '#1c7430', text: 'AMIGA POWER', color: '#ffd700' },
    { bg: '#232b38', text: 'ARCADE FOOTBALL', color: '#00e5ff' },
    { bg: '#d4d4d4', text: "'95 / '96", color: '#111111' },
  ];

  let currentX = left;
  let idx = 0;
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.textBaseline = 'middle';

  while (currentX < left + width) {
    const p = panels[idx % panels.length];
    ctx.fillStyle = p.bg;
    ctx.fillRect(currentX, boardY, panelWidth - 4, adHeight);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(currentX, boardY, panelWidth - 4, 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(currentX, boardY + adHeight - 2, panelWidth - 4, 2);

    ctx.fillStyle = p.color;
    ctx.fillText(p.text, currentX + 12, boardY + adHeight / 2 + 1);

    currentX += panelWidth;
    idx++;
  }

  // Barrier rail
  ctx.fillStyle = '#9ca3af';
  ctx.fillRect(left, boardY + adHeight + 2, width, 4);

  // Grandstand steps background
  ctx.fillStyle = '#2b221d';
  ctx.fillRect(left, grandstandY, width, 80);

  // Concrete tier step lines
  ctx.fillStyle = '#3d312a';
  for (let s = 0; s < 5; s++) {
    ctx.fillRect(left, grandstandY + s * 15 + 13, width, 2);
  }

  // Draw spectators: fixed permanent colors, subtle vertical sine-wave bobbing (static on performance)
  const now = Date.now();
  for (let i = 0; i < BOTTOM_CROWD_SEATS.length; i++) {
    const s = BOTTOM_CROWD_SEATS[i];
    const bob = isStatic ? 0 : Math.round(Math.sin(now * 0.003 + s.phase) * s.bobAmp);
    const y = s.baseY + bob;

    // Body (fixed color)
    ctx.fillStyle = s.color;
    ctx.fillRect(s.x, y + 4, 6, 7);

    // Head (fixed skin tone)
    ctx.fillStyle = s.headColor;
    ctx.fillRect(s.x + 1, y, 4, 4);

    if (s.hasScarf) {
      ctx.fillStyle = s.scarfColor;
      ctx.fillRect(s.x - 2, y - 1, 10, 2);
    }
  }

  ctx.restore();
}

/**
 * Draws the Top Goal (Rival Goal) with 3D cylindrical posts, crossbar, corner brackets,
 * rear support stanchions, realistic box net cage, ground pegs, and dynamic 3D bulge & ripple physics.
 * Phase 11: Supports Brazilian Deep Box Frame with extended depth and rear tie-back tension cables.
 */
function drawTopGoal(
  ctx: CanvasRenderingContext2D,
  net: GoalNetState,
  pitchTilt: number,
  goalFrame: GoalFrameType = 'standard',
  netTension: NetTension = 'moderate'
) {
  ctx.save();

  const metrics = getGoalFrameMetrics(goalFrame);
  const cx = PITCH_CONFIG.CENTER_X;
  const w = metrics.width;
  const depth = metrics.depth;
  const h = metrics.crossbarHeight * (1.12 - pitchTilt * 0.2);
  const goalLineY = PITCH_CONFIG.PITCH_TOP;

  const leftX = cx - w / 2;
  const rightX = cx + w / 2;
  const backY = goalLineY - depth;
  const topBackY = goalLineY - depth * (goalFrame === 'brazilian' ? 0.90 : 0.75); // Deeper top shelf for South American box net

  const shake = net.shake || 0;
  const bulge = net.bulgeAmount || 0;
  const impX = net.impactX || cx;
  const impY = net.impactY || (goalLineY - depth * 0.5);

  // Bulge & wave deformation function for top net vertices
  const getVertex = (x: number, y: number): { x: number; y: number } => {
    const dx = x - impX;
    const dy = y - impY;
    const distSq = dx * dx + dy * dy;
    const dist = Math.sqrt(distSq);

    // Tension affects sag drape: soft net has slightly lower spring tension
    const sag = netTension === 'soft' ? 1.5 : netTension === 'hard' ? -0.5 : 0;
    // Gaussian bulge backwards (towards negative Y)
    const b = Math.exp(-distSq / (45 * 45)) * bulge;
    // Harmonic wave ripple
    const wave = Math.sin(Date.now() * 0.022 - dist * 0.13) * (shake * Math.exp(-dist / 85)) * 0.5;

    const dispY = -b * 0.88 + wave * 0.45 + sag;
    const dispX = (dx / (Math.abs(dx) + 24)) * b * 0.32 + wave * 0.25;
    return { x: x + dispX, y: y + dispY };
  };

  // 1. Goal Net Ground Shadow (trapezoidal shadow cast on turf)
  ctx.fillStyle = 'rgba(8, 28, 8, 0.52)';
  ctx.beginPath();
  ctx.moveTo(leftX - 8, goalLineY + 2);
  ctx.lineTo(rightX + 8, goalLineY + 2);
  ctx.lineTo(rightX + 22, backY - 8);
  ctx.lineTo(leftX - 22, backY - 8);
  ctx.closePath();
  ctx.fill();

  // Subtle interior turf shadow inside the goalmouth
  ctx.fillStyle = 'rgba(0, 20, 0, 0.25)';
  ctx.fillRect(leftX, backY, w, depth);

  // 2. Ground Net Perimeter Tape & Fastening Pegs
  ctx.strokeStyle = '#f1f5f9';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(leftX, goalLineY);
  ctx.lineTo(leftX, backY);
  ctx.lineTo(rightX, backY);
  ctx.lineTo(rightX, goalLineY);
  ctx.stroke();

  // Steel ground pegs along back net base
  ctx.fillStyle = '#cbd5e1';
  for (let px = leftX + 10; px <= rightX - 10; px += 18) {
    ctx.fillRect(px - 1, backY - 1, 2, 3);
  }
  for (let py = goalLineY - 12; py >= backY + 8; py -= 16) {
    ctx.fillRect(leftX - 1, py - 1, 2, 3);
    ctx.fillRect(rightX - 1, py - 1, 2, 3);
  }

  // 3. Rear Support Stanchions
  // Left angled steel pole
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(leftX - 10, backY - 12);
  ctx.lineTo(leftX, topBackY - h * 0.94);
  ctx.stroke();
  // Left Stanchion highlight
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(leftX - 10, backY - 12);
  ctx.lineTo(leftX, topBackY - h * 0.94);
  ctx.stroke();

  // Right angled steel pole
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(rightX + 10, backY - 12);
  ctx.lineTo(rightX, topBackY - h * 0.94);
  ctx.stroke();
  // Right Stanchion highlight
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(rightX + 10, backY - 12);
  ctx.lineTo(rightX, topBackY - h * 0.94);
  ctx.stroke();

  // Tension guy ropes holding top rear corners
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(leftX - 10, backY - 12);
  ctx.lineTo(leftX, topBackY - h * 0.94);
  ctx.moveTo(rightX + 10, backY - 12);
  ctx.lineTo(rightX, topBackY - h * 0.94);
  ctx.stroke();

  // Brazilian Deep Box Rear Tie-Back Tension Cables
  if (metrics.hasTieBackCables) {
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(leftX, topBackY - h * 0.94);
    ctx.lineTo(leftX - 22, backY - 26);
    ctx.moveTo(rightX, topBackY - h * 0.94);
    ctx.lineTo(rightX + 22, backY - 26);
    ctx.stroke();

    // Anchor ground stakes
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(leftX - 24, backY - 28, 4, 6);
    ctx.fillRect(rightX + 20, backY - 28, 4, 6);
  }

  // 4. Net Mesh (Roof, Back Drop, and Side Walls)
  // --- A. ROOF (Top Shelf) ---
  const roofStepsX = 22; // Cords across goal width
  const roofStepsY = 6;  // Cords from crossbar to top back bar

  // Roof longitudinal cords (front to back)
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(240, 248, 255, 0.78)';
  for (let i = 0; i <= roofStepsX; i++) {
    const fracX = i / roofStepsX;
    const origX = leftX + fracX * w;

    ctx.beginPath();
    for (let j = 0; j <= roofStepsY; j++) {
      const fracY = j / roofStepsY;
      const origY = (goalLineY - h) + fracY * (topBackY - (goalLineY - h));
      const pt = getVertex(origX, origY);
      if (j === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
    ctx.stroke();
  }

  // Roof latitudinal cross-cords (side to side)
  for (let j = 0; j <= roofStepsY; j++) {
    const fracY = j / roofStepsY;
    const origY = (goalLineY - h) + fracY * (topBackY - (goalLineY - h));
    ctx.beginPath();
    for (let i = 0; i <= roofStepsX; i++) {
      const fracX = i / roofStepsX;
      const origX = leftX + fracX * w;
      const pt = getVertex(origX, origY);
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
    ctx.stroke();
  }

  // --- B. BACK WALL (Vertical drop from top rear bar down to ground) ---
  const backStepsY = 6;
  ctx.strokeStyle = 'rgba(230, 242, 255, 0.75)';

  // Back vertical cords
  for (let i = 0; i <= roofStepsX; i++) {
    const fracX = i / roofStepsX;
    const origX = leftX + fracX * w;

    ctx.beginPath();
    for (let j = 0; j <= backStepsY; j++) {
      const fracY = j / backStepsY;
      const origY = topBackY + fracY * (backY - topBackY);
      const pt = getVertex(origX, origY);
      if (j === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
    ctx.stroke();
  }

  // Back horizontal cords
  for (let j = 0; j <= backStepsY; j++) {
    const fracY = j / backStepsY;
    const origY = topBackY + fracY * (backY - topBackY);

    ctx.beginPath();
    for (let i = 0; i <= roofStepsX; i++) {
      const fracX = i / roofStepsX;
      const origX = leftX + fracX * w;
      const pt = getVertex(origX, origY);
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
    ctx.stroke();
  }

  // --- C. SIDE NET WALLS (Left and Right) ---
  ctx.strokeStyle = 'rgba(225, 238, 252, 0.70)';
  // Left side netting
  for (let step = 0; step <= 5; step++) {
    const t = step / 5;
    const frontPt = getVertex(leftX, goalLineY - h * (1 - t));
    const backPt = getVertex(leftX, backY + (topBackY - backY) * (1 - t));
    ctx.beginPath();
    ctx.moveTo(frontPt.x, frontPt.y);
    ctx.lineTo(backPt.x, backPt.y);
    ctx.stroke();
  }
  // Right side netting
  for (let step = 0; step <= 5; step++) {
    const t = step / 5;
    const frontPt = getVertex(rightX, goalLineY - h * (1 - t));
    const backPt = getVertex(rightX, backY + (topBackY - backY) * (1 - t));
    ctx.beginPath();
    ctx.moveTo(frontPt.x, frontPt.y);
    ctx.lineTo(backPt.x, backPt.y);
    ctx.stroke();
  }

  // 5. 3D Cylindrical Goal Posts & Crossbar with Metal Highlights & Corner Elbows
  // Post Ground Shadows
  ctx.fillStyle = 'rgba(8, 26, 8, 0.75)';
  ctx.beginPath();
  ctx.ellipse(leftX - 2, goalLineY + 1, 6, 2.5, 0, 0, Math.PI * 2);
  ctx.ellipse(rightX - 2, goalLineY + 1, 6, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ground Mounting Base Plates
  ctx.fillStyle = '#334155';
  ctx.fillRect(leftX - 4, goalLineY - 2, 8, 4);
  ctx.fillRect(rightX - 4, goalLineY - 2, 8, 4);
  // Hexagonal anchor bolt rivets
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(leftX - 3, goalLineY - 1, 1.5, 1.5);
  ctx.fillRect(leftX + 2, goalLineY - 1, 1.5, 1.5);
  ctx.fillRect(rightX - 3, goalLineY - 1, 1.5, 1.5);
  ctx.fillRect(rightX + 2, goalLineY - 1, 1.5, 1.5);

  // Left Post (Cylindrical metal pipe)
  // Left post outer shadow
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#94a3b8';
  ctx.beginPath();
  ctx.moveTo(leftX, goalLineY);
  ctx.lineTo(leftX, goalLineY - h);
  ctx.stroke();
  // Left post body
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = '#f1f5f9';
  ctx.beginPath();
  ctx.moveTo(leftX, goalLineY);
  ctx.lineTo(leftX, goalLineY - h);
  ctx.stroke();
  // Left post specular core highlight
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(leftX - 0.8, goalLineY);
  ctx.lineTo(leftX - 0.8, goalLineY - h);
  ctx.stroke();

  // Right Post
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#94a3b8';
  ctx.beginPath();
  ctx.moveTo(rightX, goalLineY);
  ctx.lineTo(rightX, goalLineY - h);
  ctx.stroke();
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = '#f1f5f9';
  ctx.beginPath();
  ctx.moveTo(rightX, goalLineY);
  ctx.lineTo(rightX, goalLineY - h);
  ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(rightX - 0.8, goalLineY);
  ctx.lineTo(rightX - 0.8, goalLineY - h);
  ctx.stroke();

  // Crossbar (Horizontal Beam)
  // Crossbar bottom shadow bevel
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#94a3b8';
  ctx.beginPath();
  ctx.moveTo(leftX - 3, goalLineY - h);
  ctx.lineTo(rightX + 3, goalLineY - h);
  ctx.stroke();
  // Crossbar body
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = '#f1f5f9';
  ctx.beginPath();
  ctx.moveTo(leftX - 3, goalLineY - h);
  ctx.lineTo(rightX + 3, goalLineY - h);
  ctx.stroke();
  // Crossbar top specular highlight line
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(leftX - 3, goalLineY - h - 1);
  ctx.lineTo(rightX + 3, goalLineY - h - 1);
  ctx.stroke();

  // Reinforced Corner Elbow Joint Brackets
  ctx.fillStyle = '#cbd5e1';
  // Top left elbow bracket
  ctx.beginPath();
  ctx.moveTo(leftX - 2, goalLineY - h + 6);
  ctx.lineTo(leftX + 6, goalLineY - h - 2);
  ctx.lineTo(leftX - 2, goalLineY - h - 2);
  ctx.closePath();
  ctx.fill();
  // Top right elbow bracket
  ctx.beginPath();
  ctx.moveTo(rightX + 2, goalLineY - h + 6);
  ctx.lineTo(rightX - 6, goalLineY - h - 2);
  ctx.lineTo(rightX + 2, goalLineY - h - 2);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/**
 * Draws Bottom Goal (Home Goal defended by User) with 3D cylindrical posts, crossbar,
 * realistic box net cage, ground pegs, and dynamic 3D bulge & ripple physics.
 * Phase 11: Supports Brazilian Deep Box Frame with extended depth and rear tie-back tension cables.
 */
function drawBottomGoal(
  ctx: CanvasRenderingContext2D,
  net: GoalNetState,
  pitchTilt: number,
  goalFrame: GoalFrameType = 'standard',
  netTension: NetTension = 'moderate'
) {
  ctx.save();

  const metrics = getGoalFrameMetrics(goalFrame);
  const cx = PITCH_CONFIG.CENTER_X;
  const w = metrics.width;
  const depth = metrics.depth;
  const h = metrics.crossbarHeight * 0.94;
  const goalLineY = PITCH_CONFIG.PITCH_BOTTOM;

  const leftX = cx - w / 2;
  const rightX = cx + w / 2;
  const backY = goalLineY + depth;
  const topBackY = goalLineY + depth * (goalFrame === 'brazilian' ? 0.90 : 0.75);

  const shake = net.shake || 0;
  const bulge = net.bulgeAmount || 0;
  const impX = net.impactX || cx;
  const impY = net.impactY || (goalLineY + depth * 0.5);

  // Bulge & wave deformation function for bottom net vertices
  const getVertex = (x: number, y: number): { x: number; y: number } => {
    const dx = x - impX;
    const dy = y - impY;
    const distSq = dx * dx + dy * dy;
    const dist = Math.sqrt(distSq);

    const sag = netTension === 'soft' ? 1.5 : netTension === 'hard' ? -0.5 : 0;
    // Bulge pushes forward/downward (towards positive Y)
    const b = Math.exp(-distSq / (45 * 45)) * bulge;
    const wave = Math.sin(Date.now() * 0.022 - dist * 0.13) * (shake * Math.exp(-dist / 85)) * 0.5;

    const dispY = b * 0.88 + wave * 0.45 + sag;
    const dispX = (dx / (Math.abs(dx) + 24)) * b * 0.32 + wave * 0.25;
    return { x: x + dispX, y: y + dispY };
  };

  // 1. Goal Net Ground Shadow
  ctx.fillStyle = 'rgba(8, 28, 8, 0.48)';
  ctx.beginPath();
  ctx.moveTo(leftX - 8, goalLineY - 2);
  ctx.lineTo(rightX + 8, goalLineY - 2);
  ctx.lineTo(rightX + 22, backY + 8);
  ctx.lineTo(leftX - 22, backY + 8);
  ctx.closePath();
  ctx.fill();

  // Subtle interior turf shadow
  ctx.fillStyle = 'rgba(0, 20, 0, 0.22)';
  ctx.fillRect(leftX, goalLineY, w, depth);

  // 2. Ground Net Perimeter Tape & Fastening Pegs
  ctx.strokeStyle = '#f1f5f9';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(leftX, goalLineY);
  ctx.lineTo(leftX, backY);
  ctx.lineTo(rightX, backY);
  ctx.lineTo(rightX, goalLineY);
  ctx.stroke();

  // Steel ground pegs along base
  ctx.fillStyle = '#cbd5e1';
  for (let px = leftX + 10; px <= rightX - 10; px += 18) {
    ctx.fillRect(px - 1, backY - 1, 2, 3);
  }
  for (let py = goalLineY + 12; py <= backY - 8; py += 16) {
    ctx.fillRect(leftX - 1, py - 1, 2, 3);
    ctx.fillRect(rightX - 1, py - 1, 2, 3);
  }

  // 3. Rear Support Stanchions
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(leftX - 10, backY + 12);
  ctx.lineTo(leftX, topBackY - h * 0.88);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(rightX + 10, backY + 12);
  ctx.lineTo(rightX, topBackY - h * 0.88);
  ctx.stroke();

  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(leftX - 10, backY + 12);
  ctx.lineTo(leftX, topBackY - h * 0.88);
  ctx.moveTo(rightX + 10, backY + 12);
  ctx.lineTo(rightX, topBackY - h * 0.88);
  ctx.stroke();

  // Brazilian Deep Box Rear Tie-Back Tension Cables
  if (metrics.hasTieBackCables) {
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(leftX, topBackY - h * 0.88);
    ctx.lineTo(leftX - 22, backY + 26);
    ctx.moveTo(rightX, topBackY - h * 0.88);
    ctx.lineTo(rightX + 22, backY + 26);
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(leftX - 24, backY + 24, 4, 6);
    ctx.fillRect(rightX + 20, backY + 24, 4, 6);
  }

  // 4. Net Mesh (Roof, Back Drop, and Side Walls)
  const roofStepsX = 22;
  const roofStepsY = 6;

  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(240, 248, 255, 0.75)';

  // Roof longitudinal cords
  for (let i = 0; i <= roofStepsX; i++) {
    const fracX = i / roofStepsX;
    const origX = leftX + fracX * w;

    ctx.beginPath();
    for (let j = 0; j <= roofStepsY; j++) {
      const fracY = j / roofStepsY;
      const origY = (goalLineY - h) + fracY * (topBackY - (goalLineY - h));
      const pt = getVertex(origX, origY);
      if (j === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
    ctx.stroke();
  }

  // Roof latitudinal cross-cords
  for (let j = 0; j <= roofStepsY; j++) {
    const fracY = j / roofStepsY;
    const origY = (goalLineY - h) + fracY * (topBackY - (goalLineY - h));
    ctx.beginPath();
    for (let i = 0; i <= roofStepsX; i++) {
      const fracX = i / roofStepsX;
      const origX = leftX + fracX * w;
      const pt = getVertex(origX, origY);
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
    ctx.stroke();
  }

  // Back vertical drop cords
  const backStepsY = 6;
  ctx.strokeStyle = 'rgba(230, 242, 255, 0.72)';
  for (let i = 0; i <= roofStepsX; i++) {
    const fracX = i / roofStepsX;
    const origX = leftX + fracX * w;

    ctx.beginPath();
    for (let j = 0; j <= backStepsY; j++) {
      const fracY = j / backStepsY;
      const origY = topBackY + fracY * (backY - topBackY);
      const pt = getVertex(origX, origY);
      if (j === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
    ctx.stroke();
  }

  // Back horizontal cords
  for (let j = 0; j <= backStepsY; j++) {
    const fracY = j / backStepsY;
    const origY = topBackY + fracY * (backY - topBackY);

    ctx.beginPath();
    for (let i = 0; i <= roofStepsX; i++) {
      const fracX = i / roofStepsX;
      const origX = leftX + fracX * w;
      const pt = getVertex(origX, origY);
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
    ctx.stroke();
  }

  // Side netting
  ctx.strokeStyle = 'rgba(225, 238, 252, 0.68)';
  for (let step = 0; step <= 5; step++) {
    const t = step / 5;
    const frontPt = getVertex(leftX, goalLineY - h * (1 - t));
    const backPt = getVertex(leftX, backY - (backY - topBackY) * (1 - t));
    ctx.beginPath();
    ctx.moveTo(frontPt.x, frontPt.y);
    ctx.lineTo(backPt.x, backPt.y);
    ctx.stroke();
  }
  for (let step = 0; step <= 5; step++) {
    const t = step / 5;
    const frontPt = getVertex(rightX, goalLineY - h * (1 - t));
    const backPt = getVertex(rightX, backY - (backY - topBackY) * (1 - t));
    ctx.beginPath();
    ctx.moveTo(frontPt.x, frontPt.y);
    ctx.lineTo(backPt.x, backPt.y);
    ctx.stroke();
  }

  // 5. 3D Cylindrical Goal Posts & Crossbar with Metal Highlights & Corner Elbows
  // Post Ground Shadows
  ctx.fillStyle = 'rgba(8, 26, 8, 0.75)';
  ctx.beginPath();
  ctx.ellipse(leftX - 2, goalLineY + 1, 6, 2.5, 0, 0, Math.PI * 2);
  ctx.ellipse(rightX - 2, goalLineY + 1, 6, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Mounting Base Plates
  ctx.fillStyle = '#334155';
  ctx.fillRect(leftX - 4, goalLineY - 2, 8, 4);
  ctx.fillRect(rightX - 4, goalLineY - 2, 8, 4);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(leftX - 3, goalLineY - 1, 1.5, 1.5);
  ctx.fillRect(leftX + 2, goalLineY - 1, 1.5, 1.5);
  ctx.fillRect(rightX - 3, goalLineY - 1, 1.5, 1.5);
  ctx.fillRect(rightX + 2, goalLineY - 1, 1.5, 1.5);

  // Left Post
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#94a3b8';
  ctx.beginPath();
  ctx.moveTo(leftX, goalLineY);
  ctx.lineTo(leftX, goalLineY - h);
  ctx.stroke();
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = '#f1f5f9';
  ctx.beginPath();
  ctx.moveTo(leftX, goalLineY);
  ctx.lineTo(leftX, goalLineY - h);
  ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(leftX - 0.8, goalLineY);
  ctx.lineTo(leftX - 0.8, goalLineY - h);
  ctx.stroke();

  // Right Post
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#94a3b8';
  ctx.beginPath();
  ctx.moveTo(rightX, goalLineY);
  ctx.lineTo(rightX, goalLineY - h);
  ctx.stroke();
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = '#f1f5f9';
  ctx.beginPath();
  ctx.moveTo(rightX, goalLineY);
  ctx.lineTo(rightX, goalLineY - h);
  ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(rightX - 0.8, goalLineY);
  ctx.lineTo(rightX - 0.8, goalLineY - h);
  ctx.stroke();

  // Crossbar
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#94a3b8';
  ctx.beginPath();
  ctx.moveTo(leftX - 3, goalLineY - h);
  ctx.lineTo(rightX + 3, goalLineY - h);
  ctx.stroke();
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = '#f1f5f9';
  ctx.beginPath();
  ctx.moveTo(leftX - 3, goalLineY - h);
  ctx.lineTo(rightX + 3, goalLineY - h);
  ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(leftX - 3, goalLineY - h - 1);
  ctx.lineTo(rightX + 3, goalLineY - h - 1);
  ctx.stroke();

  // Reinforced Corner Elbow Joint Brackets
  ctx.fillStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.moveTo(leftX - 2, goalLineY - h + 6);
  ctx.lineTo(leftX + 6, goalLineY - h - 2);
  ctx.lineTo(leftX - 2, goalLineY - h - 2);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(rightX + 2, goalLineY - h + 6);
  ctx.lineTo(rightX - 6, goalLineY - h - 2);
  ctx.lineTo(rightX + 2, goalLineY - h - 2);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/**
 * Draws 4 waving corner flags with checkered quadrants and spring-loaded flexible pole
 */
function drawCornerFlags(ctx: CanvasRenderingContext2D) {
  const flags = [
    { x: PITCH_CONFIG.PITCH_LEFT, y: PITCH_CONFIG.PITCH_TOP },
    { x: PITCH_CONFIG.PITCH_RIGHT, y: PITCH_CONFIG.PITCH_TOP },
    { x: PITCH_CONFIG.PITCH_LEFT, y: PITCH_CONFIG.PITCH_BOTTOM },
    { x: PITCH_CONFIG.PITCH_RIGHT, y: PITCH_CONFIG.PITCH_BOTTOM },
  ];

  ctx.save();
  const wave = Math.sin(Date.now() * 0.007) * 1.5;

  for (const f of flags) {
    // Flag turf insertion socket
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(f.x - 1.5, f.y - 1, 3, 2);

    // Flexible white/yellow pole
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(f.x, f.y);
    ctx.lineTo(f.x + wave * 0.4, f.y - 15);
    ctx.stroke();

    // Checkered red and yellow corner flag (official FIFA style)
    const topX = f.x + wave * 0.4;
    const topY = f.y - 15;
    const flagW = 9 + wave;
    const flagH = 7;

    // Top-left quadrant (Yellow)
    ctx.fillStyle = '#facc15';
    ctx.fillRect(topX, topY, flagW / 2, flagH / 2);
    // Bottom-right quadrant (Yellow)
    ctx.fillRect(topX + flagW / 2, topY + flagH / 2, flagW / 2, flagH / 2);

    // Top-right quadrant (Red)
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(topX + flagW / 2, topY, flagW / 2, flagH / 2);
    // Bottom-left quadrant (Red)
    ctx.fillRect(topX, topY + flagH / 2, flagW / 2, flagH / 2);

    // Flag gold tip
    ctx.fillStyle = '#eab308';
    ctx.fillRect(topX - 1, topY - 1, 2, 2);
  }
  ctx.restore();
}

/**
 * Renders all dynamic grass particles, supersonic shot vapor trails, and water/turf spray
 */
export function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: TurfParticle[],
  graphicsSettings?: GraphicsSettings,
  ball?: Ball
) {
  // Performance tier optimization: skip particle draw if disabled
  if (graphicsSettings?.tier === 'performance') return;

  ctx.save();
  for (const pt of particles) {
    ctx.fillStyle = pt.color;
    ctx.fillRect(Math.round(pt.x), Math.round(pt.y - pt.z), pt.size, pt.size);
  }

  // Supersonic shot vapor trail (Phase 9 High-End)
  if (graphicsSettings?.powerVaporTrails && ball) {
    const ballSpeed = Math.hypot(ball.vx, ball.vy);
    if (ballSpeed > 13.0 && ball.trail && ball.trail.length > 0) {
      for (let i = 0; i < ball.trail.length; i++) {
        const tr = ball.trail[i];
        const age = (i + 1) / ball.trail.length; // 0 to 1
        ctx.fillStyle = `rgba(224, 242, 254, ${age * 0.45})`;
        ctx.beginPath();
        ctx.arc(tr.x, tr.y - (tr.z || 0), (tr.size || 5) * (1.2 + (1 - age) * 0.8), 0, Math.PI * 2);
        ctx.fill();

        // Inner core vapor streamline
        ctx.fillStyle = `rgba(255, 255, 255, ${age * 0.75})`;
        ctx.beginPath();
        ctx.arc(tr.x, tr.y - (tr.z || 0), (tr.size || 3) * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.restore();
}

/**
 * Phase 7.5.3: Dynamic Power Bar Placement Beneath Player
 * High-visibility arcade power meter rendered directly beneath the active player's feet
 * (just under the player indicator chevron/circle) on the pitch canvas.
 * Styling:
 * - Sleek rounded meter with 2px dark border and neon inner glow.
 * - Dynamic color grading: Soft Cyan/Green (0–50%) -> Vivid Amber (51–80%) -> Fiery Crimson/Red (81–100%).
 * - Smooth fill interpolation that appears instantly upon button press and fades cleanly after kick delivery.
 */
export function drawPlayerPowerBar(
  ctx: CanvasRenderingContext2D,
  player: Player,
  powerBar: PowerBarState
) {
  const alpha = powerBar.isActive ? 1.0 : (powerBar.fadeAlpha || 0);
  if (alpha <= 0.01) return;

  ctx.save();
  ctx.globalAlpha = Math.min(1.0, Math.max(0, alpha));

  const x = Math.round(player.x);
  const y = Math.round(player.y + 17);

  const barW = 46;
  const barH = 7;
  const radius = 3.5;

  // Outer 2px dark container border & dark background
  ctx.fillStyle = 'rgba(2, 6, 23, 0.92)';
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 2;

  ctx.beginPath();
  if (typeof (ctx as any).roundRect === 'function') {
    (ctx as any).roundRect(x - barW / 2, y, barW, barH, radius);
  } else {
    ctx.rect(x - barW / 2, y, barW, barH);
  }
  ctx.fill();
  ctx.stroke();

  // Dynamic color grading:
  // 0% - 50%: Soft Cyan / Bright Green
  // 51% - 80%: Vivid Amber
  // 81% - 100%: Fiery Crimson / Red
  const p = Math.max(0.04, Math.min(1.0, powerBar.power));
  let fillColor = '#06b6d4';
  let glowColor = '#22d3ee';

  if (powerBar.isKnuckle || powerBar.isChipped) {
    if (p <= 0.50) {
      fillColor = '#f472b6';
      glowColor = '#f472b6';
    } else if (p <= 0.80) {
      fillColor = '#ec4899';
      glowColor = '#f43f5e';
    } else {
      fillColor = '#dc2626';
      glowColor = '#ef4444';
    }
  } else if (powerBar.isSpecial) {
    if (p <= 0.50) {
      fillColor = '#c084fc';
      glowColor = '#c084fc';
    } else if (p <= 0.80) {
      fillColor = '#a855f7';
      glowColor = '#9333ea';
    } else {
      fillColor = '#e11d48';
      glowColor = '#f43f5e';
    }
  } else {
    if (p <= 0.50) {
      fillColor = p < 0.25 ? '#06b6d4' : '#22c55e';
      glowColor = p < 0.25 ? '#22d3ee' : '#4ade80';
    } else if (p <= 0.80) {
      fillColor = '#f59e0b';
      glowColor = '#fbbf24';
    } else {
      fillColor = '#ef4444';
      glowColor = '#dc2626';
    }
  }

  // Active filled width
  const innerW = barW - 4;
  const innerH = barH - 4;
  const fillW = Math.max(2, Math.min(innerW, Math.round(innerW * p)));

  // Inner neon glow
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = p > 0.80 ? 9 : 6;
  ctx.fillStyle = fillColor;

  ctx.beginPath();
  if (typeof (ctx as any).roundRect === 'function') {
    (ctx as any).roundRect(x - barW / 2 + 2, y + 2, fillW, innerH, Math.min(2, radius - 1));
  } else {
    ctx.rect(x - barW / 2 + 2, y + 2, fillW, innerH);
  }
  ctx.fill();

  // Reset shadow for crisp pixel text and marker lines
  ctx.shadowBlur = 0;

  // 80% sweet-spot / max output demarcation notch
  const sweetX = Math.round(x - barW / 2 + 2 + innerW * 0.80);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.fillRect(sweetX, y + 1, 1, barH - 2);

  // Action text badge floating cleanly beneath meter
  ctx.font = '6px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  const actionText = (powerBar.action || 'KICK').toUpperCase().replace('_', ' ');
  let label = actionText;
  if (powerBar.isKnuckle || powerBar.isChipped) {
    label = `⚡ CHIP ${actionText === 'PASS' ? '' : actionText}`;
  } else if (powerBar.isSpecial) {
    label = `[Q] ${actionText}`;
  }

  ctx.fillStyle = glowColor;
  ctx.fillText(label, x, y + barH + 3);

  ctx.restore();
}

