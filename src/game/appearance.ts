/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  PlayerAppearance,
  MelaninSkinTone,
  HairPresetId,
  FacialHairPreset,
  JerseyFitPreset,
  CollarStylePreset,
  SleeveLengthPreset,
  SockHeightPreset,
  EarringStylePreset,
  TattooPreset,
} from '../types/player';

/**
 * Phase 12: Parametric Player Appearance Framework
 *
 * Lightweight procedural vector rendering hooks and data contract.
 * Implements height, weight, muscle mass scaling, 8 hair presets,
 * facial hair, uniform details (untucked hem, polo collar), sock height,
 * tattoos, and accessories.
 */

export const MELANIN_PALETTE: readonly MelaninSkinTone[] = [
  '#ffdbac', // Tone 1: Light Nordic / Celtic
  '#f1c27d', // Tone 2: Fair European / Mediterranean
  '#e0ac69', // Tone 3: Olive / Southern European / East Asian
  '#c68642', // Tone 4: Bronzed / Latin / Middle Eastern
  '#8d5524', // Tone 5: Deep Bronze / South Asian / Afro-Latino
  '#3b2219', // Tone 6: Rich Melanin / African
];

export const HAIR_PRESET_IDS: readonly HairPresetId[] = [
  'buzzcut',
  'high-fade',
  'afro',
  'braids',
  'topknot',
  'wavy',
  'part',
  'bald',
];

export const FACIAL_HAIR_PRESETS: readonly FacialHairPreset[] = ['clean', 'stubble', 'beard', 'goatee'];
export const JERSEY_FIT_PRESETS: readonly JerseyFitPreset[] = ['tucked', 'untucked'];
export const COLLAR_STYLE_PRESETS: readonly CollarStylePreset[] = ['crew', 'v-neck', 'polo'];
export const SLEEVE_LENGTH_PRESETS: readonly SleeveLengthPreset[] = ['short', 'long', 'undershirt'];
export const SOCK_HEIGHT_PRESETS: readonly SockHeightPreset[] = ['low', 'standard', 'high-knee'];
export const EARRING_PRESETS: readonly EarringStylePreset[] = ['none', 'left-stud', 'right-stud', 'dual-stud', 'small-hoop'];
export const TATTOO_PRESETS: readonly TattooPreset[] = ['none', 'forearm-ink', 'full-sleeve'];

/**
 * Creates default valid PlayerAppearance object with fallbacks
 */
export function createDefaultAppearance(overrides?: Partial<PlayerAppearance>): PlayerAppearance {
  return {
    heightCm: overrides?.heightCm ?? 180,
    weightKg: overrides?.weightKg ?? 75,
    muscleMass: overrides?.muscleMass ?? 3,
    skinTone: overrides?.skinTone ?? '#f1c27d',
    hairStyle: overrides?.hairStyle ?? 'part',
    hairColor: overrides?.hairColor ?? '#2a1a0a',
    facialHair: overrides?.facialHair ?? (overrides?.hasBeard ? 'beard' : 'clean'),
    jerseyFit: overrides?.jerseyFit ?? 'tucked',
    collarStyle: overrides?.collarStyle ?? 'crew',
    sleeveLength: overrides?.sleeveLength ?? 'short',
    sockHeight: overrides?.sockHeight ?? 'standard',
    earrings: overrides?.earrings ?? 'none',
    tattoos: overrides?.tattoos ?? {
      leftArm: 'none',
      rightArm: 'none',
    },
    hasBeard: overrides?.hasBeard ?? false,
  };
}

/**
 * Calculates physical coordinate multipliers based on appearance parameters.
 * - heightCm: 165 - 202 cm scales vertical multiplier (0.88 - 1.15)
 * - weightKg: 60 - 95 kg scales torso width & shadow spread
 * - muscleMass: 1 - 5 scales limb thickness and shoulder span
 */
export function calculatePlayerScaleMultipliers(
  heightCm: number = 180,
  weightKg: number = 75,
  muscleMass: number = 3
): { scaleX: number; scaleY: number; shadowRadiusMult: number } {
  const clampedHeight = Math.max(165, Math.min(202, heightCm));
  const clampedWeight = Math.max(60, Math.min(95, weightKg));
  const clampedMuscle = Math.max(1, Math.min(5, muscleMass));

  // Height multiplier: 165cm -> 0.88, 180cm -> 0.99, 202cm -> 1.15
  const heightProgress = (clampedHeight - 165) / (202 - 165);
  const scaleY = 0.88 + heightProgress * (1.15 - 0.88);

  // Weight & muscle multiplier: affects width and torso bulk
  const weightProgress = (clampedWeight - 60) / (95 - 60);
  const muscleProgress = (clampedMuscle - 1) / 4;
  const scaleX = (0.92 + weightProgress * 0.14) * (0.96 + muscleProgress * 0.08);

  // Shadow spread
  const shadowRadiusMult = 0.90 + weightProgress * 0.22;

  return { scaleX, scaleY, shadowRadiusMult };
}

/**
 * Applies float scale transforms directly to local player coordinate space
 */
export function applyPlayerScale(
  ctx: CanvasRenderingContext2D,
  heightCm: number = 180,
  muscleMass: number = 3
): void {
  const { scaleX, scaleY } = calculatePlayerScaleMultipliers(heightCm, 75, muscleMass);
  ctx.scale(scaleX, scaleY);
}

/**
 * Quick hex shade generator
 */
export function shadeHexColor(color: string, percent: number): string {
  if (!color || !color.startsWith('#') || color.length < 7) {
    return color || '#000000';
  }
  let R = parseInt(color.substring(1, 3), 16);
  let G = parseInt(color.substring(3, 5), 16);
  let B = parseInt(color.substring(5, 7), 16);

  R = Math.min(255, Math.max(0, Math.round((R * (100 + percent)) / 100)));
  G = Math.min(255, Math.max(0, Math.round((G * (100 + percent)) / 100)));
  B = Math.min(255, Math.max(0, Math.round((B * (100 + percent)) / 100)));

  const RR = R.toString(16).padStart(2, '0');
  const GG = G.toString(16).padStart(2, '0');
  const BB = B.toString(16).padStart(2, '0');

  return `#${RR}${GG}${BB}`;
}

/**
 * Serializes PlayerAppearance into a compact string representation (< 120 bytes)
 * Ideal for network transmission, career mode save files, and cache key generation.
 */
export function serializeAppearance(app: PlayerAppearance): string {
  const parts = [
    Math.round(app.heightCm || 180),
    Math.round(app.weightKg || 75),
    app.muscleMass || 3,
    app.skinTone.replace('#', ''),
    app.hairStyle || 'part',
    app.hairColor.replace('#', ''),
    app.facialHair || (app.hasBeard ? 'beard' : 'clean'),
    app.jerseyFit || 'tucked',
    app.collarStyle || 'crew',
    app.sleeveLength || 'short',
    app.sockHeight || 'standard',
    app.earrings || 'none',
    app.tattoos?.leftArm || 'none',
    app.tattoos?.rightArm || 'none',
  ];
  return parts.join('~');
}

/**
 * Deserializes compact string back into PlayerAppearance
 */
export function deserializeAppearance(str: string): PlayerAppearance {
  const p = str.split('~');
  if (p.length < 14) {
    return createDefaultAppearance();
  }
  return {
    heightCm: Number(p[0]) || 180,
    weightKg: Number(p[1]) || 75,
    muscleMass: Number(p[2]) || 3,
    skinTone: `#${p[3]}`,
    hairStyle: p[4] as HairPresetId,
    hairColor: `#${p[5]}`,
    facialHair: p[6] as FacialHairPreset,
    jerseyFit: p[7] as JerseyFitPreset,
    collarStyle: p[8] as CollarStylePreset,
    sleeveLength: p[9] as SleeveLengthPreset,
    sockHeight: p[10] as SockHeightPreset,
    earrings: p[11] as EarringStylePreset,
    tattoos: {
      leftArm: p[12] as TattooPreset,
      rightArm: p[13] as TattooPreset,
    },
  };
}

/**
 * Procedural Hair Path Registry: Modular switch mapping hairStyle ID
 * to lightweight 2D canvas pixel / vector arcs
 */
export function renderProceduralHairPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  headY: number,
  hairStyle: HairPresetId,
  hairColor: string,
  isFacingUp: boolean = false
): void {
  const hair = hairColor || '#1c1917';
  const hairHigh = shadeHexColor(hair, 24);
  const hairShadow = shadeHexColor(hair, -30);

  const r = (x: number, y: number, rw: number, rh: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), rw, rh);
  };
  const p = (x: number, y: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  };

  switch (hairStyle) {
    case 'buzzcut': {
      // Very close-clipped army buzzcut
      r(cx - 5, headY - 3, 10, 4, hair);
      r(cx - 6, headY, 2, 2, hairShadow);
      r(cx + 4, headY, 2, 2, hairShadow);
      r(cx - 4, headY - 3, 8, 1, hairHigh);
      break;
    }

    case 'high-fade': {
      // Modern clean high fade: high textured dark top, tapered skin fade sides
      r(cx - 5, headY - 5, 10, 5, hair);
      r(cx - 4, headY - 6, 8, 2, hairHigh);
      p(cx - 2, headY - 4, hairHigh);
      p(cx + 2, headY - 4, hairHigh);
      // Skin fade gradient sideburns
      r(cx - 6, headY, 1, 3, hairShadow);
      r(cx + 5, headY, 1, 3, hairShadow);
      break;
    }

    case 'afro':
    case 'afro_black':
    case 'curly_blond': {
      // Voluminous rounded afro with textured perimeter (Valderrama, Maradona, Ronaldinho)
      r(cx - 7, headY - 6, 14, 7, hair);
      r(cx - 9, headY - 3, 18, 6, hair);
      r(cx - 8, headY + 3, 4, 3, hairShadow);
      r(cx + 4, headY + 3, 4, 3, hairShadow);
      // Textured curl flecks & highlights
      p(cx - 6, headY - 4, hairHigh);
      p(cx - 4, headY - 5, hairHigh);
      p(cx - 1, headY - 6, hairHigh);
      p(cx + 2, headY - 6, hairHigh);
      p(cx + 5, headY - 4, hairHigh);
      p(cx - 2, headY - 3, hairHigh);
      p(cx + 3, headY - 2, hairHigh);
      p(cx - 5, headY - 1, hairShadow);
      p(cx + 4, headY - 1, hairShadow);
      break;
    }

    case 'braids':
    case 'dreads': {
      // Long braids or Gullit dreadlocks with beads
      r(cx - 5, headY - 4, 10, 5, hair);
      p(cx - 2, headY - 4, hairHigh);
      p(cx + 2, headY - 4, hairHigh);
      r(cx - 7, headY, 3, 10, hair);
      r(cx + 4, headY, 3, 10, hair);
      p(cx - 7, headY + 4, hairShadow);
      p(cx + 6, headY + 4, hairShadow);
      // Golden dread beads
      p(cx - 6, headY + 8, '#facc15');
      p(cx + 5, headY + 8, '#facc15');
      p(cx - 7, headY + 6, '#fbbf24');
      if (isFacingUp) {
        r(cx - 4, headY + 3, 8, 7, hair);
        p(cx - 2, headY + 7, '#facc15');
        p(cx + 2, headY + 7, '#facc15');
      }
      break;
    }

    case 'topknot':
    case 'ponytail_dark': {
      // Samurai topknot / Divine Ponytail (Baggio, Ibrahimovic)
      r(cx - 5, headY - 3, 10, 5, hair);
      p(cx - 2, headY - 3, hairHigh);
      p(cx + 1, headY - 3, hairHigh);
      r(cx - 6, headY + 1, 2, 3, hair);
      r(cx + 4, headY + 1, 2, 3, hair);
      // Bun / Ponytail
      if (isFacingUp) {
        r(cx - 1, headY + 6, 2, 7, hairShadow);
        p(cx, headY + 13, hair);
        r(cx - 1, headY + 6, 2, 1, '#0284c7'); // Hair tie band
      } else {
        r(cx + 3, headY + 5, 2, 6, hairShadow);
        r(cx + 3, headY + 5, 2, 1, '#0284c7');
        p(cx + 4, headY + 10, hair);
        // Topknot knot on top
        r(cx - 1, headY - 5, 3, 2, hair);
        p(cx, headY - 5, '#0284c7');
      }
      break;
    }

    case 'wavy':
    case 'ginger_curly': {
      // Medium flowing wavy locks (Modric, Voller, Puyol)
      r(cx - 6, headY - 4, 12, 7, hair);
      r(cx - 7, headY - 1, 2, 5, hairShadow);
      r(cx + 5, headY - 1, 2, 5, hairShadow);
      p(cx - 3, headY - 4, hairHigh);
      p(cx + 2, headY - 4, hairHigh);
      p(cx - 4, headY - 2, hairHigh);
      p(cx + 3, headY - 2, hairHigh);
      p(cx - 1, headY - 2, hairShadow);
      break;
    }

    case 'part':
    case 'crop_brown':
    case 'blond_sweep': {
      // Classic side-part / clean footballer comb
      r(cx - 5, headY - 3, 10, 5, hair);
      r(cx - 6, headY + 1, 2, 3, hairShadow);
      r(cx + 4, headY + 1, 2, 3, hairShadow);
      r(cx - 3, headY - 3, 6, 1, hairHigh);
      p(cx - 4, headY - 2, hairHigh);
      p(cx + 3, headY - 2, hairHigh);
      // Clean part line
      p(cx - 1, headY - 3, hairShadow);
      p(cx - 1, headY - 2, hairShadow);
      break;
    }

    case 'bald': {
      // Shaved bald scalp (Roberto Carlos, Zidane) with specular highlight
      r(cx - 3, headY - 1, 6, 1, hairHigh);
      p(cx - 2, headY - 2, hairHigh);
      p(cx + 1, headY - 2, hairHigh);
      break;
    }

    default: {
      r(cx - 5, headY - 3, 10, 5, hair);
      r(cx - 6, headY + 1, 2, 3, hairShadow);
      r(cx + 4, headY + 1, 2, 3, hairShadow);
      r(cx - 3, headY - 3, 6, 1, hairHigh);
      break;
    }
  }
}

/**
 * Facial Hair Rendering Hook
 */
export function renderFacialHairPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  headY: number,
  facialHair: FacialHairPreset = 'clean',
  hairColor: string,
  skinTone: string
): void {
  if (facialHair === 'clean') return;

  const hair = hairColor || '#1c1917';
  const shadow = shadeHexColor(skinTone, -28);

  const r = (x: number, y: number, rw: number, rh: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), rw, rh);
  };
  const p = (x: number, y: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  };

  switch (facialHair) {
    case 'stubble': {
      // 5 o'clock shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      r(cx - 3, headY + 5, 6, 2, 'rgba(0,0,0,0.22)');
      p(cx - 4, headY + 5, 'rgba(0,0,0,0.18)');
      p(cx + 3, headY + 5, 'rgba(0,0,0,0.18)');
      break;
    }
    case 'goatee': {
      // Mustache + chin goatee
      p(cx - 1, headY + 3, hair);
      p(cx, headY + 3, hair);
      p(cx + 1, headY + 3, hair);
      r(cx - 1, headY + 5, 3, 2, hair);
      break;
    }
    case 'beard': {
      // Full beard wrapping around jawline and chin
      r(cx - 4, headY + 4, 8, 3, hair);
      r(cx - 5, headY + 2, 2, 4, hair);
      r(cx + 3, headY + 2, 2, 4, hair);
      // Mustache
      p(cx - 2, headY + 3, hair);
      p(cx + 1, headY + 3, hair);
      p(cx, headY + 3, shadow);
      break;
    }
  }
}

/**
 * Kit Detail Hook: Collar Style (Crew, V-Neck, or Polo with flaps)
 */
export function renderCollarDetails(
  ctx: CanvasRenderingContext2D,
  cx: number,
  neckY: number,
  collarStyle: CollarStylePreset = 'crew',
  shirtColor: string,
  trimColor: string
): void {
  const r = (x: number, y: number, rw: number, rh: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), rw, rh);
  };
  const p = (x: number, y: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  };

  switch (collarStyle) {
    case 'polo': {
      // Triangular classic folded polo collar flaps over chest (Cantona / Maldini / 90s kits)
      r(cx - 4, neckY - 1, 8, 2, trimColor);
      // Left and right triangular collar points
      p(cx - 4, neckY + 1, trimColor);
      p(cx - 3, neckY + 2, trimColor);
      p(cx + 3, neckY + 1, trimColor);
      p(cx + 2, neckY + 2, trimColor);
      // Central button placket
      p(cx, neckY + 1, shadeHexColor(shirtColor, -25));
      p(cx, neckY + 2, '#ffffff'); // Tiny white pearl button
      break;
    }
    case 'v-neck': {
      // Sharp V-neck insert
      r(cx - 3, neckY - 1, 6, 1, trimColor);
      p(cx - 2, neckY, trimColor);
      p(cx + 1, neckY, trimColor);
      p(cx, neckY + 1, trimColor);
      break;
    }
    case 'crew':
    default: {
      // Classic rounded rib crewneck
      r(cx - 3, neckY - 1, 6, 2, trimColor);
      break;
    }
  }
}

/**
 * Kit Detail Hook: Jersey Fit (Tucked vs Untucked hem draping over waistband)
 */
export function renderJerseyHemFit(
  ctx: CanvasRenderingContext2D,
  cx: number,
  waistY: number,
  jerseyFit: JerseyFitPreset = 'tucked',
  shirtColor: string,
  shortsColor: string
): void {
  if (jerseyFit !== 'untucked') return;

  const r = (x: number, y: number, rw: number, rh: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), rw, rh);
  };
  const p = (x: number, y: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  };

  // Draped hem contour hanging 2px lower over the shorts with gentle side ripple slits
  r(cx - 7, waistY + 1, 14, 2, shirtColor);
  p(cx - 8, waistY + 1, shadeHexColor(shirtColor, -18));
  p(cx + 7, waistY + 1, shadeHexColor(shirtColor, -18));
  // Shadow beneath draped hem onto shorts
  r(cx - 6, waistY + 3, 12, 1, 'rgba(0, 0, 0, 0.28)');
}

/**
 * Ink Overlay Hook: Vector stippled tattoo art on left/right arms
 */
export function renderArmTattooOverlay(
  ctx: CanvasRenderingContext2D,
  armX: number,
  armY: number,
  armW: number,
  armH: number,
  tattoo: TattooPreset = 'none'
): void {
  if (tattoo === 'none') return;

  const p = (x: number, y: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  };

  const inkColor = '#1e293b'; // Charcoal ink
  const inkDark = '#0f172a';

  if (tattoo === 'forearm-ink') {
    // Lower half of arm covered in dark geometric ink strokes
    const startY = armY + Math.floor(armH * 0.45);
    const endY = armY + armH;
    for (let y = startY; y < endY; y++) {
      for (let x = armX; x < armX + armW; x++) {
        if ((x + y) % 2 === 0) {
          p(x, y, inkColor);
        }
      }
    }
    p(armX + 1, startY + 1, inkDark);
    p(armX + armW - 2, endY - 2, inkDark);
  } else if (tattoo === 'full-sleeve') {
    // Entire arm covered in dense sleeve artwork
    for (let y = armY; y < armY + armH; y++) {
      for (let x = armX; x < armX + armW; x++) {
        if ((x + y * 2) % 3 !== 0) {
          p(x, y, (x + y) % 2 === 0 ? inkColor : inkDark);
        }
      }
    }
  }
}

/**
 * Accessories Hook: Earrings (studs or hoops)
 */
export function renderEarringAccessories(
  ctx: CanvasRenderingContext2D,
  cx: number,
  headY: number,
  earrings: EarringStylePreset = 'none'
): void {
  if (earrings === 'none') return;

  const p = (x: number, y: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  };

  const diamondGlint = '#f8fafc';
  const goldHoop = '#f59e0b';

  const leftEarX = cx - 6;
  const rightEarX = cx + 5;
  const earLobeY = headY + 3;

  if (earrings === 'left-stud' || earrings === 'dual-stud') {
    p(leftEarX, earLobeY, diamondGlint);
  }
  if (earrings === 'right-stud' || earrings === 'dual-stud') {
    p(rightEarX, earLobeY, diamondGlint);
  }
  if (earrings === 'small-hoop') {
    p(leftEarX, earLobeY, goldHoop);
    p(leftEarX, earLobeY + 1, goldHoop);
  }
}
