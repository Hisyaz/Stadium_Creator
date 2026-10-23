/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PlayerAppearance, TeamKit } from '../types';

/**
 * Phase 14: 32-Bit Arcade Captain Hero Pixel Sprite Renderer
 *
 * Renders full-height, highly detailed 32-bit pixel-art character sprites of team
 * captains standing in a proud athletic stance (arms folded / heroic stance) wearing
 * their live modular uniform (shirt, shorts, socks) with gold captain's armband.
 */

export interface CaptainRenderOptions {
  width?: number;
  height?: number;
  facing?: 'right' | 'left';
  showArmband?: boolean;
  scale?: number;
}

// Color helper for generating highlight & shadow tints
function adjustHex(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  const num = parseInt(clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean, 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * Draws a 32-bit pixel-art captain hero sprite onto any 2D canvas context
 */
export function drawCaptainHeroSprite(
  ctx: CanvasRenderingContext2D,
  appearance: PlayerAppearance = {
    heightCm: 182,
    weightKg: 78,
    muscleMass: 3,
    skinTone: '#ffdbac',
    hairStyle: 'part',
    hairColor: '#2b1b0d',
    facialHair: 'clean',
  },
  kit: TeamKit,
  options: CaptainRenderOptions = {}
) {
  const {
    width = 96,
    height = 168,
    facing = 'right',
    showArmband = true,
  } = options;

  ctx.save();
  ctx.clearRect(0, 0, width, height);

  // Pixel art rendering settings
  ctx.imageSmoothingEnabled = false;

  // Center anchor
  const cx = Math.floor(width / 2);
  const groundY = height - 12;

  // Mirror if facing left
  if (facing === 'left') {
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
  }

  // --- PALETTE DERIVATIONS ---
  const skin = appearance.skinTone || '#ffdbac';
  const skinShadow = adjustHex(skin, -36);
  const skinHighlight = adjustHex(skin, 24);

  const hair = appearance.hairColor || '#2b1b0d';
  const hairDark = adjustHex(hair, -40);
  const hairHi = adjustHex(hair, 30);

  const shirt = kit.primaryColor || '#dc2626';
  const shirtDark = adjustHex(shirt, -45);
  const shirtHi = adjustHex(shirt, 35);
  const trim = kit.secondaryColor || '#ffffff';
  const trimDark = adjustHex(trim, -35);

  const shorts = kit.shortsColor || '#ffffff';
  const shortsDark = adjustHex(shorts, -40);
  const shortsHi = adjustHex(shorts, 25);

  const socks = kit.socksColor || '#dc2626';
  const socksDark = adjustHex(socks, -45);
  const socksHi = adjustHex(socks, 30);

  const goldArmband = '#f59e0b';
  const goldArmbandHi = '#fef08a';
  const goldArmbandDark = '#b45309';

  // Helper pixel block drawer
  const p = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
  };

  // 1. TURF DROP SHADOW
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(cx, groundY + 2, 28, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.beginPath();
  ctx.ellipse(cx, groundY + 2, 16, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. BOOTS (Arcade Cleats)
  // Left boot (viewer left)
  p(cx - 15, groundY - 6, 11, 7, '#0f172a'); // Main boot
  p(cx - 16, groundY - 2, 12, 3, '#020617'); // Sole
  p(cx - 15, groundY - 6, 2, 7, '#334155'); // Heel counter
  p(cx - 13, groundY - 4, 6, 2, '#f8fafc'); // Classic white 3-stripe/swoosh
  p(cx - 15, groundY + 1, 3, 2, '#e2e8f0'); // Cleat studs
  p(cx - 8, groundY + 1, 3, 2, '#e2e8f0');

  // Right boot (viewer right)
  p(cx + 4, groundY - 6, 12, 7, '#0f172a');
  p(cx + 4, groundY - 2, 13, 3, '#020617');
  p(cx + 4, groundY - 6, 2, 7, '#334155');
  p(cx + 6, groundY - 4, 6, 2, '#f8fafc');
  p(cx + 5, groundY + 1, 3, 2, '#e2e8f0');
  p(cx + 12, groundY + 1, 3, 2, '#e2e8f0');

  // 3. SOCKS (Modular Socks Color)
  // Left lower leg & sock
  p(cx - 14, groundY - 26, 9, 21, socks);
  p(cx - 14, groundY - 26, 2, 21, socksHi); // Shin highlight
  p(cx - 7, groundY - 26, 2, 21, socksDark); // Calf shadow
  // Turn-down sock collar bands
  p(cx - 15, groundY - 28, 11, 3, trim);
  p(cx - 15, groundY - 26, 11, 2, trimDark);

  // Right lower leg & sock
  p(cx + 5, groundY - 26, 9, 21, socks);
  p(cx + 5, groundY - 26, 2, 21, socksHi);
  p(cx + 12, groundY - 26, 2, 21, socksDark);
  p(cx + 4, groundY - 28, 11, 3, trim);
  p(cx + 4, groundY - 26, 11, 2, trimDark);

  // 4. KNEES & THIGHS (Athletic Skin Tone)
  // Left knee
  p(cx - 13, groundY - 37, 7, 10, skin);
  p(cx - 13, groundY - 37, 2, 9, skinHighlight);
  p(cx - 8, groundY - 37, 2, 9, skinShadow);
  p(cx - 12, groundY - 33, 5, 3, skinHighlight); // Patella highlight

  // Right knee
  p(cx + 6, groundY - 37, 7, 10, skin);
  p(cx + 6, groundY - 37, 2, 9, skinHighlight);
  p(cx + 11, groundY - 37, 2, 9, skinShadow);
  p(cx + 7, groundY - 33, 5, 3, skinHighlight);

  // 5. SHORTS (Modular Shorts Color & Athletic Cut)
  const shortsTop = groundY - 60;
  // Left leg shorts
  p(cx - 17, shortsTop + 6, 15, 18, shorts);
  p(cx - 17, shortsTop + 6, 2, 18, trim); // Left side piping
  p(cx - 15, shortsTop + 6, 3, 18, shortsHi);
  p(cx - 6, shortsTop + 14, 4, 10, shortsDark); // Inseam shadow
  p(cx - 17, shortsTop + 22, 15, 2, trimDark); // Hem trim

  // Right leg shorts
  p(cx + 2, shortsTop + 6, 15, 18, shorts);
  p(cx + 15, shortsTop + 6, 2, 18, trim); // Right side piping
  p(cx + 3, shortsTop + 6, 3, 18, shortsHi);
  p(cx + 2, shortsTop + 14, 4, 10, shortsDark);
  p(cx + 2, shortsTop + 22, 15, 2, trimDark);

  // Waistband & Pelvis center
  p(cx - 16, shortsTop, 32, 7, shorts);
  p(cx - 16, shortsTop, 32, 2, shortsHi); // Elastic waist highlight
  p(cx - 1, shortsTop + 3, 2, 16, shortsDark); // Center seam

  // 6. TORSO & JERSEY (Modular Shirt Primary + Secondary Details)
  const jerseyTop = groundY - 104;
  const jerseyHeight = 45;

  // Athletic V-taper jersey body
  p(cx - 18, jerseyTop + 8, 36, jerseyHeight - 8, shirt);
  // Chest highlight & lateral shadow
  p(cx - 18, jerseyTop + 8, 3, jerseyHeight - 8, shirtDark);
  p(cx + 15, jerseyTop + 8, 3, jerseyHeight - 8, shirtDark);
  p(cx - 13, jerseyTop + 12, 12, 14, shirtHi); // Left pec highlight
  p(cx + 1, jerseyTop + 12, 12, 14, shirtHi); // Right pec highlight
  p(cx - 1, jerseyTop + 10, 2, jerseyHeight - 12, shirtDark); // Sternum / ab furrow

  // Jersey hem tucked over shorts
  p(cx - 17, jerseyTop + jerseyHeight - 3, 34, 3, shirtDark);

  // Secondary Trim Details: Chest Sash or Collar Stripes
  p(cx - 10, jerseyTop + 4, 20, 4, trim); // V-neck collar band
  p(cx - 8, jerseyTop + 6, 16, 2, trimDark);
  // Front team crest badge (viewer left chest)
  p(cx - 14, jerseyTop + 14, 6, 6, trim);
  p(cx - 13, jerseyTop + 15, 4, 4, goldArmband);

  // 7. ARMS & HEROIC FOLDED / READY STANCE
  // Left Shoulder & Bicep (Viewer Left - Wearing the Captain Armband!)
  p(cx - 24, jerseyTop + 6, 8, 12, shirt); // Left sleeve
  p(cx - 24, jerseyTop + 16, 8, 2, trim); // Sleeve cuff

  if (showArmband) {
    // CAPTAIN'S ARMBAND ON LEFT ARM
    p(cx - 25, jerseyTop + 18, 9, 7, goldArmband);
    p(cx - 25, jerseyTop + 18, 9, 1, goldArmbandHi);
    p(cx - 25, jerseyTop + 24, 9, 1, goldArmbandDark);
    // Monogram 'C' in black
    p(cx - 23, jerseyTop + 20, 4, 1, '#000000');
    p(cx - 23, jerseyTop + 21, 2, 2, '#000000');
    p(cx - 23, jerseyTop + 23, 4, 1, '#000000');
  }

  // Left forearm folded horizontally across lower chest
  p(cx - 23, jerseyTop + 25, 7, 14, skin);
  p(cx - 23, jerseyTop + 25, 2, 14, skinHighlight);
  p(cx - 18, jerseyTop + 25, 2, 14, skinShadow);

  // Right Shoulder & Bicep (Viewer Right)
  p(cx + 16, jerseyTop + 6, 8, 12, shirt);
  p(cx + 16, jerseyTop + 16, 8, 2, trim);
  p(cx + 16, jerseyTop + 18, 7, 18, skin);
  p(cx + 16, jerseyTop + 18, 2, 18, skinHighlight);
  p(cx + 21, jerseyTop + 18, 2, 18, skinShadow);

  // Folded Forearms & Athletic Clenched Hands in Center
  p(cx - 16, jerseyTop + 28, 32, 9, skin);
  p(cx - 16, jerseyTop + 28, 32, 2, skinHighlight);
  p(cx - 16, jerseyTop + 35, 32, 2, skinShadow);
  // Knuckles and fingers definition
  p(cx - 8, jerseyTop + 30, 16, 5, skinHighlight);
  p(cx - 4, jerseyTop + 32, 8, 2, skinShadow);

  // 8. NECK & CLAVICLE
  p(cx - 6, jerseyTop, 12, 10, skin);
  p(cx - 6, jerseyTop, 2, 10, skinShadow);
  p(cx + 4, jerseyTop, 2, 10, skinShadow);
  p(cx - 3, jerseyTop + 2, 6, 6, skinHighlight);

  // 9. HEAD & FACIAL FEATURES
  const headTop = jerseyTop - 25;
  const headWidth = 20;

  // Face base oval
  p(cx - 10, headTop + 6, headWidth, 20, skin);
  p(cx - 10, headTop + 6, 2, 20, skinShadow); // Lateral shadow
  p(cx + 8, headTop + 6, 2, 20, skinShadow);
  p(cx - 7, headTop + 10, 14, 12, skinHighlight); // Cheek & forehead sheen

  // Strong athletic jaw
  p(cx - 8, headTop + 22, 16, 4, skin);
  p(cx - 6, headTop + 24, 12, 2, skinShadow); // Chin shadow

  // Ears
  p(cx - 12, headTop + 12, 3, 8, skin);
  p(cx - 12, headTop + 14, 2, 4, skinShadow);
  p(cx + 9, headTop + 12, 3, 8, skin);
  p(cx + 10, headTop + 14, 2, 4, skinShadow);

  // Eyes & Determined Eyebrows
  p(cx - 7, headTop + 11, 5, 2, hairDark); // Left brow
  p(cx + 2, headTop + 11, 5, 2, hairDark); // Right brow

  p(cx - 6, headTop + 14, 4, 3, '#ffffff'); // Left eye sclera
  p(cx - 4, headTop + 14, 2, 3, '#0f172a'); // Pupil / iris
  p(cx + 2, headTop + 14, 4, 3, '#ffffff'); // Right eye sclera
  p(cx + 2, headTop + 14, 2, 3, '#0f172a');

  // Nose Bridge & Nostril shadow
  p(cx - 1, headTop + 13, 2, 6, skinShadow);
  p(cx - 2, headTop + 18, 4, 2, skinShadow);

  // Mouth & Confident Expression
  p(cx - 4, headTop + 21, 8, 2, skinShadow);
  p(cx - 3, headTop + 21, 6, 1, '#881337'); // Subtle lip tint

  // Facial Hair
  if (appearance.facialHair === 'beard' || appearance.facialHair === 'stubble') {
    const fhColor = appearance.facialHair === 'beard' ? hairDark : skinShadow;
    p(cx - 8, headTop + 19, 3, 6, fhColor);
    p(cx + 5, headTop + 19, 3, 6, fhColor);
    p(cx - 7, headTop + 23, 14, 3, fhColor); // Jawline
    p(cx - 4, headTop + 20, 8, 2, fhColor); // Moustache
  } else if (appearance.facialHair === 'goatee') {
    p(cx - 4, headTop + 22, 8, 4, hairDark);
    p(cx - 3, headTop + 20, 6, 2, hairDark);
  }

  // 10. HAIRSTYLE (Parametric Appearance)
  const hairStyle = appearance.hairStyle || 'part';
  if (hairStyle === 'buzzcut') {
    p(cx - 10, headTop, 20, 7, hair);
    p(cx - 11, headTop + 2, 22, 6, hair);
    p(cx - 9, headTop, 18, 2, hairHi);
  } else if (hairStyle === 'afro') {
    p(cx - 14, headTop - 6, 28, 14, hair);
    p(cx - 15, headTop - 4, 30, 13, hair);
    p(cx - 12, headTop - 6, 24, 3, hairHi);
    p(cx - 14, headTop + 5, 4, 6, hairDark);
    p(cx + 10, headTop + 5, 4, 6, hairDark);
  } else if (hairStyle === 'curly' || hairStyle === 'dreads') {
    p(cx - 12, headTop - 4, 24, 12, hair);
    p(cx - 13, headTop - 2, 26, 14, hair);
    p(cx - 13, headTop + 8, 4, 8, hairDark);
    p(cx + 9, headTop + 8, 4, 8, hairDark);
    p(cx - 10, headTop - 4, 20, 3, hairHi);
  } else if (hairStyle === 'bald') {
    p(cx - 9, headTop + 1, 18, 7, skin);
    p(cx - 8, headTop + 1, 16, 2, skinHighlight);
  } else {
    // Default 'part' / 'short'
    p(cx - 11, headTop - 2, 22, 10, hair);
    p(cx - 12, headTop, 24, 9, hair);
    p(cx - 10, headTop - 2, 12, 3, hairHi); // Part highlight
    p(cx - 12, headTop + 4, 3, 6, hairDark); // Sideburn
    p(cx + 9, headTop + 4, 3, 6, hairDark);
    p(cx - 6, headTop + 6, 12, 2, hairDark); // Bangs line
  }

  ctx.restore();
}
