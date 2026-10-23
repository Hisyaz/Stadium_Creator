import { Player, PlayerAppearance, TeamKit, Ball, Referee, GraphicsSettings, DribblingTier } from '../types';
import { PITCH_CONFIG } from './constants';
import {
  calculatePlayerScaleMultipliers,
  serializeAppearance,
  renderProceduralHairPath,
  renderFacialHairPath,
  renderCollarDetails,
  renderJerseyHemFit,
  renderArmTattooOverlay,
  renderEarringAccessories,
} from './appearance';

// High-detail 16-bit arcade pixel art renderer (Sensible Soccer / Neo Geo Super Sidekicks / Kick Off style)
// Crisp procedural pixel art with distinctive multi-frame animations, authentic kit details,
// facial expressions, captain armbands, and realistic ball deformation & curl trails.

const spriteCache = new Map<string, HTMLCanvasElement>();

/**
 * Draws a pixelated player sprite onto canvas
 */
export function drawPlayerSprite(
  ctx: CanvasRenderingContext2D,
  player: Player,
  kit: TeamKit,
  scale: number = 1,
  graphicsSettings?: GraphicsSettings
) {
  const isGk = player.role === 'GK';
  const effectivePrimary = isGk ? kit.gkColor : kit.primaryColor;
  const effectiveSocks = isGk ? '#222222' : kit.socksColor;

  // Phase 12: Parametric scale multipliers from player appearance (height, weight, muscle mass)
  const { scaleX, scaleY } = calculatePlayerScaleMultipliers(
    player.appearance?.heightCm,
    player.appearance?.weightKg,
    player.appearance?.muscleMass
  );

  // Draw dynamic pitch shadow first
  drawPlayerShadow(ctx, player, graphicsSettings);

  // Direction vectors
  let dirX = 0;
  let dirY = 1;
  if (player.facingDir.includes('left')) dirX = -1;
  if (player.facingDir.includes('right')) dirX = 1;
  if (player.facingDir.includes('up')) dirY = -1;
  if (player.facingDir.includes('down')) dirY = 1;

  // Captain check (Home: Matthäus #10, Away: Scirea #6)
  const isCaptain = (player.team === 'home' && player.number === 10) || (player.team === 'away' && player.number === 6);

  // Phase 8.1: Six Dribbling Animation Tiers
  const dribbleTier: DribblingTier = player.dribbleTier || (player.canonicalStats && 'dri' in player.canonicalStats ? (player.canonicalStats.dri >= 100 ? 'unique' : player.canonicalStats.dri >= 90 ? 'world_class' : player.canonicalStats.dri >= 80 ? 'elite' : player.canonicalStats.dri >= 70 ? 'pro' : player.canonicalStats.dri >= 60 ? 'semi_pro' : 'amateur') : 'pro');

  const appearanceKey = player.appearance ? serializeAppearance(player.appearance) : 'default';

  const cacheKey = [
    appearanceKey,
    effectivePrimary,
    kit.secondaryColor,
    kit.shortsColor,
    effectiveSocks,
    player.action,
    player.animFrame,
    dirX,
    dirY,
    isGk ? 'gk' : 'pl',
    isCaptain ? 'c' : 'n',
    dribbleTier,
  ].join('|');

  let cachedCanvas = spriteCache.get(cacheKey);

  if (!cachedCanvas) {
    cachedCanvas = renderPlayerToCanvas(
      player.appearance,
      effectivePrimary,
      kit.secondaryColor,
      kit.shortsColor,
      effectiveSocks,
      player.action,
      player.animFrame,
      dirX,
      dirY,
      player.number,
      isGk,
      isCaptain,
      dribbleTier
    );
    spriteCache.set(cacheKey, cachedCanvas);
  }

  // Centered sprite rendering with parametric player height and width scaling
  const pScale = (player.scale || 1.0) * scale;
  const sw = Math.round(cachedCanvas.width * pScale * scaleX);
  const sh = Math.round(cachedCanvas.height * pScale * scaleY);
  const wallJumpOffset = player.action === 'wall_jump' && player.actionTimer
    ? Math.sin(Math.max(0, 34 - player.actionTimer) / 34 * Math.PI) * 16
    : (player.jumpHeight || 0);

  ctx.drawImage(
    cachedCanvas,
    Math.round(player.x - sw / 2),
    Math.round(player.y - sh + 5 * pScale * scaleY - wallJumpOffset),
    sw,
    sh
  );


  // Subtle confused emoji above defender when nutmegged or beaten by roulette
  if (player.confusedTimer && player.confusedTimer > 0) {
    ctx.save();
    const alpha = Math.min(1, player.confusedTimer / 20);
    ctx.globalAlpha = alpha;
    const emojiY = player.y - sh - 5;

    // Small subtle confused emoji face
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('😵‍💫', player.x, emojiY);
    ctx.restore();
  }
}

/**
 * Realistic pitch shadow responding to player actions (jumping, sliding, diving, tumbling),
 * with Phase 9 Quad-Shadows under 4 stadium floodlights and Cleat Ambient Occlusion (AO).
 */
function drawPlayerShadow(ctx: CanvasRenderingContext2D, player: Player, settings?: GraphicsSettings) {
  ctx.save();
  const { scaleX, shadowRadiusMult } = calculatePlayerScaleMultipliers(
    player.appearance?.heightCm,
    player.appearance?.weightKg,
    player.appearance?.muscleMass
  );
  const sc = (player.scale || 1.0) * scaleX * shadowRadiusMult;

  // 1. Performance Tier: flat simplified disc, zero blur
  if (settings?.tier === 'performance') {
    ctx.fillStyle = 'rgba(10, 32, 10, 0.35)';
    ctx.beginPath();
    ctx.ellipse(player.x - 3 * sc, player.y + 3 * sc, 10 * sc, 3.2 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // 2. High-End Tier: Multi-Floodlight Quad Shadows (4 directional shadows cast from corner towers)
  if (settings?.quadShadows) {
    const towers = [
      { x: PITCH_CONFIG.PITCH_LEFT - 190, y: PITCH_CONFIG.PITCH_TOP - 220 },
      { x: PITCH_CONFIG.PITCH_RIGHT + 190, y: PITCH_CONFIG.PITCH_TOP - 220 },
      { x: PITCH_CONFIG.PITCH_LEFT - 190, y: PITCH_CONFIG.PITCH_BOTTOM + 220 },
      { x: PITCH_CONFIG.PITCH_RIGHT + 190, y: PITCH_CONFIG.PITCH_BOTTOM + 220 },
    ];

    ctx.fillStyle = 'rgba(8, 28, 8, 0.18)';
    for (const t of towers) {
      const dx = player.x - t.x;
      const dy = player.y - t.y;
      const dist = Math.hypot(dx, dy) || 1;
      const nx = dx / dist;
      const ny = dy / dist;
      const angle = Math.atan2(ny, nx);
      const shadowLen = Math.min(24, 11 + (dist / 240) * 4) * sc;

      ctx.beginPath();
      ctx.ellipse(
        player.x + nx * (shadowLen * 0.45),
        player.y + ny * (shadowLen * 0.35) + 3 * sc,
        shadowLen,
        3.5 * sc,
        angle,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Soft Contact Ambient Occlusion (AO) beneath cleats
    if (settings.ambientOcclusion) {
      ctx.fillStyle = 'rgba(0, 15, 0, 0.58)';
      ctx.beginPath();
      ctx.ellipse(player.x, player.y + 2 * sc, 6.5 * sc, 2.2 * sc, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    return;
  }

  // Soft Contact Ambient Occlusion (AO) beneath cleats if enabled without quad shadows
  if (settings?.ambientOcclusion) {
    ctx.fillStyle = 'rgba(0, 15, 0, 0.52)';
    ctx.beginPath();
    ctx.ellipse(player.x, player.y + 2 * sc, 6.5 * sc, 2.2 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Balanced Tier: dynamic single shadow
  ctx.fillStyle = 'rgba(10, 32, 10, 0.42)';
  const shadowOffsetX = -4 * sc;
  const shadowOffsetY = 5 * sc;

  if (player.action === 'sliding_tackle') {
    ctx.beginPath();
    ctx.ellipse(
      player.x + shadowOffsetX,
      player.y + 3 * sc,
      16 * sc,
      5 * sc,
      -0.15,
      0,
      Math.PI * 2
    );
    ctx.fill();
  } else if (
    player.action === 'heading' ||
    player.action === 'bullet_header' ||
    player.action === 'glancing_header' ||
    player.action === 'contested_duel' ||
    player.action === 'gk_fingertip_parry' ||
    player.action === 'gk_punch' ||
    player.action === 'gk_high_catch' ||
    player.action === 'bicycle_kick' ||
    player.action === 'scissor_kick' ||
    player.action === 'scorpion_kick' ||
    player.action === 'diving_volley' ||
    player.action === 'side_volley' ||
    player.action === 'flying_heel_volley' ||
    player.action === 'sombrero_volley' ||
    player.action === 'diving_header' ||
    player.action === 'around_the_world' ||
    player.action === 'wall_jump'
  ) {
    // Airborne acrobatics: shadow stays anchored on pitch and contracts
    ctx.beginPath();
    ctx.ellipse(
      player.x + shadowOffsetX * 0.6,
      player.y + 4 * sc,
      7 * sc,
      3.8 * sc,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
  } else if (
    player.action === 'goalkeeper_dive' ||
    player.action === 'gk_low_smother' ||
    player.action === 'gk_star_spread' ||
    player.action === 'gk_recovery_roll' ||
    player.action === 'sliding_toe_poke'
  ) {
    ctx.beginPath();
    ctx.ellipse(
      player.x + shadowOffsetX,
      player.y + 4 * sc,
      17 * sc,
      5.5 * sc,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
  } else if (player.action === 'fouled_falling') {
    ctx.beginPath();
    ctx.ellipse(
      player.x + shadowOffsetX,
      player.y + 3 * sc,
      12 * sc,
      6 * sc,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
  } else if ((player.action === 'running_shot' || player.action === 'running_long_pass') && player.animFrame === 2) {
    // Airborne follow-through leap: shadow contracts on turf
    ctx.beginPath();
    ctx.ellipse(
      player.x + shadowOffsetX * 0.7,
      player.y + 4 * sc,
      8 * sc,
      3.5 * sc,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
  } else {
    // Upright / Running / Skill moves shadow
    const isSprinting = Math.hypot(player.vx, player.vy) > 3.0;
    ctx.beginPath();
    ctx.ellipse(
      player.x + shadowOffsetX,
      player.y + shadowOffsetY * 0.5,
      (isSprinting ? 11 : 9.5) * sc,
      4.5 * sc,
      -0.25,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Procedural rasterizer: creates detailed, high-craft 16-bit arcade pixel art sprites
 */
function renderPlayerToCanvas(
  appearance: PlayerAppearance,
  shirtColor: string,
  trimColor: string,
  shortsColor: string,
  socksColor: string,
  action: string,
  frame: number,
  dirX: number,
  dirY: number,
  number: number,
  isGk: boolean,
  isCaptain: boolean = false,
  dribbleTier: DribblingTier = 'pro'
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const w = 36;
  const h = 42;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = false;

  const cx = 18;
  const groundY = 36;

  // Helper pixel drawers
  const p = (x: number, y: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  };
  const r = (x: number, y: number, rw: number, rh: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), rw, rh);
  };

  const skin = appearance.skinTone;
  const skinShadow = shadeColor(skin, -26);
  const skinHighlight = shadeColor(skin, 15);
  const hair = appearance.hairColor;
  const hairHigh = shadeColor(hair, 22);
  const hairShadow = shadeColor(hair, -32);
  const bootColor = '#141414';
  const bootStuds = '#e4e4e7';
  const bootLace = '#f5f5f5';
  const bootAccent = '#dc2626'; // Iconic red fold-over tongue
  const sockRib = shadeColor(socksColor, -20);
  const sockHigh = shadeColor(socksColor, 18);
  const sockWhite = '#ffffff';
  const shirtHigh = shadeColor(shirtColor, 20);
  const shirtShadow = shadeColor(shirtColor, -24);
  const pinstripeCol = shadeColor(shirtColor, -14);
  const shortsHigh = shadeColor(shortsColor, 18);
  const shortsShadow = shadeColor(shortsColor, -24);

  // ==========================================
  // 1. SLIDING TACKLE ANIMATION (3 Frames)
  // ==========================================
  if (action === 'sliding_tackle') {
    const slideDir = dirX !== 0 ? dirX : 1;
    ctx.save();
    if (slideDir < 0) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }

    const f = frame % 3;
    // Frame 0: Entry thrust, Frame 1: Full turf slide with hooked leg, Frame 2: Recovery sweep
    // "sliding tackle from behind the player tries to come a bit from a side and place the leg in front to cut the ball"
    const slideY = groundY - 4;
    const legReach = f === 1 ? 16 : (f === 0 ? 11 : 14);

    // Outstretched Lead Hooking Leg (front)
    r(15, slideY, legReach, 3, socksColor);
    r(15 + legReach - 2, slideY - 1, 2, 4, sockRib); // Sock cuff
    // Hooked Boot with studs positioned to cut across the ball
    r(15 + legReach, slideY - 2, 6, 4, bootColor);
    p(15 + legReach + 1, slideY - 2, bootAccent); // Boot tongue
    r(15 + legReach + 2, slideY + 2, 4, 2, bootStuds); // Cleat studs hooking turf
    // Dynamic green turf spray pixels at the slide contact point
    if (f === 1) {
      p(15 + legReach + 6, slideY + 1, '#22c55e');
      p(15 + legReach + 7, slideY + 3, '#15803d');
      p(14, slideY + 3, '#166534');
    }

    // Trailing bent leg (under hip)
    r(10, slideY - 1, 6, 3, skin);
    r(8, slideY + 1, 5, 3, socksColor);
    r(6, slideY + 2, 4, 3, bootColor);

    // Shorts
    r(8, slideY - 4, 9, 5, shortsColor);
    r(9, slideY - 4, 1, 5, trimColor); // Side stripe

    // Torso leaned back
    r(3, slideY - 9, 8, 7, shirtColor);
    r(4, slideY - 8, 6, 4, trimColor);

    // Arms bracing
    r(1, slideY - 6, 3, 5, skin);
    r(0, slideY - 2, 3, 3, skinShadow);

    // Head
    r(1, slideY - 15, 7, 7, skin);
    // Determined grimace expression
    p(5, slideY - 12, '#ffffff');
    p(6, slideY - 12, '#111111');
    p(4, slideY - 13, '#111111'); // Eyebrow angled
    p(5, slideY - 10, skinShadow); // Grit mouth

    // Hair
    renderHairStyle(ctx, 4, slideY - 16, appearance.hairStyle, hair, hairHigh, hairShadow, false);

    ctx.restore();
    return canvas;
  }

  // ==========================================
  // 2. GOALKEEPER DIVE ANIMATION (3 Frames)
  // ==========================================
  if (action === 'goalkeeper_dive') {
    const diveDir = dirX !== 0 ? dirX : 1;
    ctx.save();
    if (diveDir < 0) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }

    const f = frame % 3;
    const isHighDive = f === 2;
    const diveLift = isHighDive ? -9 : (f === 1 ? -6 : -3);
    const dy = groundY - 12 + diveLift;

    if (isHighDive) {
      // Frame 2: High Dive / Opposite-Hand Top Corner Reach
      // Torso arched diagonally upward
      r(7, dy, 11, 7, shirtColor);
      r(8, dy + 1, 9, 2, trimColor);

      // Trailing legs in full flight
      r(-4, dy + 5, 8, 3, socksColor);
      r(-8, dy + 5, 5, 3, bootColor);
      r(1, dy + 3, 7, 5, shortsColor);

      // Head looking up towards upper 90
      r(16, dy - 5, 6, 6, skin);
      p(19, dy - 3, '#ffffff');
      p(20, dy - 3, '#111111');
      renderHairStyle(ctx, 18, dy - 7, appearance.hairStyle, hair, hairHigh, hairShadow, false);

      // Lower supporting arm
      r(18, dy - 1, 6, 3, skin);
      r(23, dy - 2, 4, 5, '#facc15');

      // Top opposite-hand reaching skyward towards top corner
      r(19, dy - 9, 4, 7, skin);
      r(20, dy - 15, 6, 6, '#facc15'); // Full extension glove
      p(22, dy - 13, '#1e293b');
      p(23, dy - 11, '#1e293b');
      // Aerodynamic tip highlight
      p(24, dy - 16, '#38bdf8');
    } else {
      // Both Outstretched Arms Reaching horizontally
      r(22, dy - 1, 7, 3, skin);
      r(29, dy - 3, 5, 6, '#facc15'); // Padded Goalkeeper Gloves (Fluo Yellow)
      p(31, dy - 2, '#1e293b'); // Glove grip palm details
      p(32, dy, '#1e293b');

      // Head
      r(17, dy - 3, 6, 6, skin);
      p(20, dy - 1, '#ffffff');
      p(21, dy - 1, '#111111');
      renderHairStyle(ctx, 19, dy - 5, appearance.hairStyle, hair, hairHigh, hairShadow, false);

      // Horizontal Torso
      r(9, dy - 2, 10, 7, shirtColor);
      r(10, dy - 1, 8, 2, trimColor);

      // Shorts
      r(4, dy - 1, 6, 6, shortsColor);

      // Horizontal Legs & Boots
      r(-2, dy, 7, 3, socksColor);
      r(-5, dy, 4, 3, bootColor);
      r(-5, dy + 3, 2, 1, bootStuds);
    }

    ctx.restore();
    return canvas;
  }

  // ==========================================
  // 3. FOULED / FALLING ANIMATION (4 Frames)
  // ==========================================
  if (action === 'fouled_falling') {
    const f = frame % 4;
    ctx.save();

    if (f === 0) {
      // Stumble back
      r(cx - 5, groundY - 10, 4, 6, socksColor);
      r(cx - 6, groundY - 4, 5, 4, bootColor);
      r(cx + 2, groundY - 12, 4, 7, skin);
      r(cx - 3, groundY - 16, 9, 6, shortsColor);
      r(cx - 6, groundY - 24, 11, 8, shirtColor);
      r(cx - 4, groundY - 30, 7, 6, skin);
      p(cx - 2, groundY - 28, '#111111'); // Shocked eye
      p(cx + 1, groundY - 28, '#111111');
      r(cx - 5, groundY - 33, 8, 4, hair);
    } else if (f === 1) {
      // Mid-air tumble
      r(cx - 8, groundY - 14, 8, 4, socksColor);
      r(cx - 11, groundY - 15, 4, 4, bootColor);
      r(cx - 3, groundY - 10, 8, 6, shortsColor);
      r(cx + 3, groundY - 13, 9, 7, shirtColor);
      r(cx + 10, groundY - 16, 6, 6, skin);
      r(cx + 9, groundY - 19, 7, 4, hair);
    } else {
      // Down on turf clutching knee
      r(cx - 10, groundY - 5, 8, 4, skin);
      r(cx - 12, groundY - 5, 4, 4, socksColor);
      r(cx - 14, groundY - 5, 3, 3, bootColor);
      r(cx - 5, groundY - 7, 7, 5, shortsColor);
      r(cx + 1, groundY - 8, 8, 6, shirtColor);
      r(cx + 7, groundY - 10, 6, 6, skin);
      r(cx + 7, groundY - 13, 7, 4, hair);
    }

    ctx.restore();
    return canvas;
  }

  // ==========================================
  // 3b. ACROBATIC AERIAL STRIKES (Bicycle, Scissor, Scorpion)
  // ==========================================
  if (action === 'bicycle_kick') {
    ctx.save();
    const kickDir = dirX !== 0 ? dirX : 1;
    if (kickDir < 0) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }

    const f = frame % 3;
    // Frame 0: Inverted launch / windup (midY - 10)
    // Frame 1: Full overhead celestial extension & strike (midY - 16)
    // Frame 2: Landing roll onto grass (midY - 6)
    const midY = f === 1 ? groundY - 16 : (f === 0 ? groundY - 10 : groundY - 6);

    if (f === 2) {
      // LANDING ROLL
      r(cx - 3, midY - 2, 9, 6, shirtColor);
      r(cx + 4, midY - 3, 5, 5, skin);
      p(cx + 6, midY - 2, '#ffffff');
      p(cx + 7, midY - 2, '#111111');
      renderHairStyle(ctx, cx + 5, midY - 5, appearance.hairStyle, hair, hairHigh, hairShadow, false);
      r(cx - 6, midY + 1, 6, 4, skin); // Arms breaking fall
      r(cx - 7, midY - 2, 6, 5, shortsColor);
      r(cx - 10, midY - 5, 5, 3, socksColor);
      r(cx - 12, midY - 6, 4, 3, bootColor);
      r(cx - 4, midY + 2, 4, 3, socksColor);
      r(cx - 2, midY + 3, 4, 2, bootColor);
    } else {
      // INVERTED LAUNCH (f=0) OR CELESTIAL STRIKE (f=1)
      // Head tilted back watching strike
      r(cx + 6, midY - 2, 6, 6, skin);
      p(cx + 8, midY, '#ffffff');
      p(cx + 9, midY, '#111111');
      renderHairStyle(ctx, cx + 9, midY - 4, appearance.hairStyle, hair, hairHigh, hairShadow, false);

      // Torso horizontal in mid-air
      r(cx - 4, midY - 3, 10, 7, shirtColor);
      r(cx - 3, midY - 2, 8, 2, trimColor);

      // Outstretched balancing arms
      r(cx + 2, midY + 4, 3, 5, skin);
      r(cx - 5, midY + 4, 3, 5, skin);

      // Shorts angled
      r(cx - 9, midY - 4, 6, 6, shortsColor);

      // Non-kicking trailing leg (bent)
      const trailLegY = f === 1 ? midY + 1 : midY - 2;
      r(cx - 12, trailLegY, 5, 3, socksColor);
      r(cx - 14, trailLegY + 1, 4, 3, bootColor);

      // Kicking lead leg reaching skyward
      const legReach = f === 1 ? 21 : 15;
      r(cx - 11, midY - (f === 1 ? 10 : 8), 3, 8, skin);
      r(cx - 11, midY - (legReach - 4), 3, 7, socksColor);
      p(cx - 11, midY - (legReach - 4), sockRib);
      r(cx - 13, midY - legReach, 5, 4, bootColor);
      p(cx - 12, midY - (legReach - 1), bootAccent);
      r(cx - 10, midY - (legReach + 1), 3, 1, bootStuds); // Studs pointing to heaven

      if (f === 1) {
        // Strike flash sparkles on apex contact
        p(cx - 14, midY - legReach - 2, '#ffffff');
        p(cx - 16, midY - legReach, '#fde047');
        p(cx - 10, midY - legReach - 3, '#38bdf8');
      }
    }

    ctx.restore();
    return canvas;
  }

  if (action === 'scissor_kick') {
    ctx.save();
    const kickDir = dirX !== 0 ? dirX : 1;
    if (kickDir < 0) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }

    const f = frame % 3;
    // Frame 0: Horizontal leap launch
    // Frame 1: Full scissor blade whip horizontal with laces flash
    // Frame 2: Recovery descent
    const midY = f === 1 ? groundY - 14 : (f === 0 ? groundY - 10 : groundY - 5);

    // Torso angled
    r(cx - 3, midY - 4, 9, 7, shirtColor);
    r(cx - 2, midY - 3, 7, 2, trimColor);

    // Head
    r(cx + 5, midY - 7, 6, 6, skin);
    p(cx + 8, midY - 5, '#ffffff');
    p(cx + 9, midY - 5, '#111111');
    renderHairStyle(ctx, cx + 7, midY - 9, appearance.hairStyle, hair, hairHigh, hairShadow, false);

    // Balancing arms
    r(cx + 2, midY + 3, 3, 5, skin);

    // Shorts
    r(cx - 8, midY - 2, 6, 6, shortsColor);

    // Kicking leg whipped sideways like a scissor blade
    const ext = f === 1 ? 28 : (f === 0 ? 20 : 16);
    r(cx - 16, midY - 1, 9, 3, skin);
    r(cx - (ext - 5), midY - 1, 8, 3, socksColor);
    p(cx - (ext - 7), midY - 1, sockRib);
    r(cx - ext, midY - 2, 5, 4, bootColor);
    p(cx - (ext - 1), midY - 1, bootAccent);
    r(cx - ext, midY + 2, 3, 1, bootStuds);

    if (f === 1) {
      // Scissor blade spark impact
      p(cx - ext - 2, midY - 3, '#ffffff');
      p(cx - ext - 3, midY, '#38bdf8');
    }

    // Trailing scissor leg
    const trailY = f === 2 ? midY + 1 : midY + 4;
    r(cx - 10, trailY, 5, 3, socksColor);
    r(cx - 12, trailY + 2, 4, 3, bootColor);

    ctx.restore();
    return canvas;
  }

  if (action === 'scorpion_kick') {
    ctx.save();
    const kickDir = dirX !== 0 ? dirX : 1;
    if (kickDir < 0) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }

    const f = frame % 3;
    const midY = f === 1 ? groundY - 10 : (f === 0 ? groundY - 6 : groundY - 3);

    // Head diving low forward
    r(cx + 8, midY + 1, 6, 6, skin);
    p(cx + 11, midY + 3, '#ffffff');
    p(cx + 12, midY + 3, '#111111');
    renderHairStyle(ctx, cx + 9, midY - 1, appearance.hairStyle, hair, hairHigh, hairShadow, false);

    // Torso arched horizontally low to pitch
    r(cx - 1, midY, 10, 6, shirtColor);
    r(cx, midY + 1, 8, 2, trimColor);

    // Outstretched diving arms
    r(cx + 6, midY + 6, 4, 3, skin);

    // Shorts arched upward
    r(cx - 7, midY - 3, 7, 6, shortsColor);

    if (f === 2) {
      // CHEST SLIDE RECOVERY
      r(cx - 12, midY - 2, 6, 3, socksColor);
      r(cx - 16, midY - 2, 5, 3, bootColor);
    } else {
      // SCORPION STING (f=1 peak arch, f=0 loading arch)
      const archH = f === 1 ? 19 : 14;
      r(cx - 11, midY - 9, 4, 7, skin);
      r(cx - 9, midY - (archH - 4), 4, 7, socksColor);
      p(cx - 9, midY - (archH - 4), sockRib);
      r(cx - 5, midY - archH, 5, 4, bootColor);
      p(cx - 4, midY - (archH - 1), bootAccent);
      r(cx - 3, midY - (archH - 3), 3, 1, bootStuds);

      if (f === 1) {
        // Golden reverse sting impact spark
        p(cx - 4, midY - archH - 3, '#ffffff');
        p(cx - 6, midY - archH - 2, '#facc15');
        p(cx - 2, midY - archH - 1, '#ec4899');
      }
    }

    ctx.restore();
    return canvas;
  }

  // ==========================================
  // THROW-IN ANIMATION (FIFA 2-handed overhead hold & aim)
  // ==========================================
  if (action === 'throw_in') {
    ctx.save();
    const throwDir = dirX !== 0 ? dirX : 1;
    if (throwDir < 0) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    const f = frame % 2;
    const archBack = f === 1 ? -1 : 0;
    const yB = groundY;

    // Both feet firmly planted on touchline (FIFA regulation)
    r(cx - 5, yB - 3, 4, 3, bootColor);
    p(cx - 4, yB - 3, bootAccent);
    r(cx - 5, yB, 4, 1, bootStuds);
    r(cx + 1, yB - 3, 4, 3, bootColor);
    p(cx + 2, yB - 3, bootAccent);
    r(cx + 1, yB, 4, 1, bootStuds);

    // Socks & legs
    r(cx - 5, yB - 8, 3, 5, socksColor);
    r(cx - 5, yB - 8, 3, 1, sockWhite);
    r(cx + 1, yB - 8, 3, 5, socksColor);
    r(cx + 1, yB - 8, 3, 1, sockWhite);

    // Shorts
    r(cx - 6, yB - 15, 12, 7, shortsColor);
    r(cx - 6, yB - 15, 1, 7, trimColor);
    r(cx + 5, yB - 15, 1, 7, trimColor);

    // Torso arched back holding momentum
    const torsoX = cx - 5 + archBack;
    const torsoY = yB - 26;
    r(torsoX, torsoY, 10, 11, shirtColor);
    r(torsoX + 2, torsoY + 1, 6, 9, trimColor);

    // Head looking out onto pitch to spot receiver
    const headX = torsoX + 2;
    const headY = torsoY - 8;
    r(headX, headY, 7, 7, skin);
    p(headX + 5, headY + 3, '#ffffff'); // Eye looking into pitch
    p(headX + 6, headY + 3, '#111111');
    renderHairStyle(ctx, headX + 3, headY - 1, appearance.hairStyle, hair, hairHigh, hairShadow, false);

    // Both arms raised overhead behind head
    r(torsoX - 3, torsoY - 5, 3, 8, skin);
    r(torsoX + 8, torsoY - 5, 3, 8, skin);

    // 16-BIT SOCCER BALL HELD OVERHEAD IN BOTH HANDS
    const ballX = torsoX + 1;
    const ballY = torsoY - 14;
    r(ballX, ballY, 8, 8, '#f8fafc');
    r(ballX + 3, ballY + 2, 2, 2, '#0f172a');
    r(ballX + 1, ballY + 4, 2, 2, '#0f172a');
    r(ballX + 5, ballY + 5, 2, 2, '#0f172a');
    p(ballX + 2, ballY + 1, '#ffffff'); // Specular gleam

    // Hands gripping ball sides
    p(ballX - 1, ballY + 3, skin);
    p(ballX - 1, ballY + 4, skinHighlight);
    p(ballX + 8, ballY + 3, skin);
    p(ballX + 8, ballY + 4, skinHighlight);

    ctx.restore();
    return canvas;
  }

  // ==========================================
  // THROW-IN EXECUTION (Dynamic forward snap)
  // ==========================================
  if (action === 'throw_in_throw') {
    ctx.save();
    const throwDir = dirX !== 0 ? dirX : 1;
    if (throwDir < 0) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    const yB = groundY;

    // Lead foot flat on line, back foot on toe tip
    r(cx + 3, yB - 3, 5, 3, bootColor);
    p(cx + 4, yB - 3, bootAccent);
    r(cx - 6, yB - 4, 3, 4, bootColor);

    // Legs braced
    r(cx + 3, yB - 8, 3, 5, socksColor);
    r(cx - 5, yB - 9, 3, 5, socksColor);

    // Shorts
    r(cx - 4, yB - 15, 11, 7, shortsColor);

    // Torso thrust forward with power
    const torsoX = cx - 1;
    const torsoY = yB - 25;
    r(torsoX, torsoY, 11, 10, shirtColor);
    r(torsoX + 2, torsoY + 1, 7, 8, trimColor);

    // Head
    const headX = torsoX + 5;
    const headY = torsoY - 7;
    r(headX, headY, 7, 7, skin);
    p(headX + 5, headY + 3, '#ffffff');
    p(headX + 6, headY + 3, '#111111');
    renderHairStyle(ctx, headX + 4, headY - 1, appearance.hairStyle, hair, hairHigh, hairShadow, false);

    // Arms fully extended forward overhead releasing ball
    r(torsoX + 7, torsoY - 7, 7, 3, skin);
    r(torsoX + 9, torsoY - 10, 6, 3, skinHighlight);
    r(torsoX + 14, torsoY - 9, 3, 3, skin); // Open release hands

    ctx.restore();
    return canvas;
  }

  // ==========================================
  // DEFENSIVE WALL STANCE (Tight shoulder-to-shoulder, protecting body)
  // ==========================================
  if (action === 'wall_stance') {
    ctx.save();
    const yB = groundY;
    // Feet pressed together
    r(cx - 4, yB - 3, 3, 3, bootColor);
    r(cx, yB - 3, 3, 3, bootColor);
    p(cx - 3, yB - 3, bootAccent);
    p(cx + 1, yB - 3, bootAccent);

    // Legs straight together
    r(cx - 4, yB - 8, 3, 5, socksColor);
    r(cx, yB - 8, 3, 5, socksColor);
    r(cx - 4, yB - 8, 7, 1, sockWhite);

    // Shorts
    r(cx - 5, yB - 15, 10, 7, shortsColor);
    r(cx - 5, yB - 15, 1, 7, trimColor);
    r(cx + 4, yB - 15, 1, 7, trimColor);

    // Upright tall torso
    r(cx - 6, yB - 26, 12, 11, shirtColor);
    r(cx - 4, yB - 25, 8, 9, trimColor);

    // Hands crossed in front over groin/chest protecting body
    r(cx - 3, yB - 18, 6, 4, skin);
    p(cx - 2, yB - 17, skinHighlight);
    p(cx + 1, yB - 17, skinHighlight);
    // Arms clamped tight to sides
    r(cx - 7, yB - 24, 2, 7, shirtColor);
    r(cx + 5, yB - 24, 2, 7, shirtColor);

    // Head facing ball with tense focused expression
    const headX = cx - 3;
    const headY = yB - 33;
    r(headX, headY, 7, 7, skin);
    p(headX + 1, headY + 3, '#ffffff');
    p(headX + 2, headY + 3, '#111111');
    p(headX + 4, headY + 3, '#ffffff');
    p(headX + 5, headY + 3, '#111111');
    p(headX + 1, headY + 2, '#111111');
    p(headX + 5, headY + 2, '#111111');
    renderHairStyle(ctx, headX + 3, headY - 1, appearance.hairStyle, hair, hairHigh, hairShadow, false);

    ctx.restore();
    return canvas;
  }

  // ==========================================
  // DEFENSIVE WALL JUMP (Synchronous block jump)
  // ==========================================
  if (action === 'wall_jump') {
    ctx.save();
    // Elevated jump off turf by 16px
    const jumpY = groundY - 16;

    // Pointed toes / boots hanging down
    r(cx - 4, jumpY, 3, 4, bootColor);
    r(cx, jumpY, 3, 4, bootColor);
    p(cx - 3, jumpY, bootAccent);
    p(cx + 1, jumpY, bootAccent);

    // Legs straight down together
    r(cx - 4, jumpY - 7, 3, 7, socksColor);
    r(cx, jumpY - 7, 3, 7, socksColor);
    r(cx - 4, jumpY - 7, 7, 1, sockWhite);

    // Shorts
    r(cx - 5, jumpY - 14, 10, 7, shortsColor);

    // Torso stretched tall
    r(cx - 6, jumpY - 26, 12, 12, shirtColor);
    r(cx - 4, jumpY - 25, 8, 10, trimColor);

    // Hands shielding chest, elbows tucked
    r(cx - 4, jumpY - 20, 8, 4, skin);
    r(cx - 7, jumpY - 25, 2, 8, shirtColor);
    r(cx + 5, jumpY - 25, 2, 8, shirtColor);

    // Head tilted up watching ball soar
    const headX = cx - 3;
    const headY = jumpY - 34;
    r(headX, headY, 7, 8, skin);
    p(headX + 1, headY + 2, '#ffffff');
    p(headX + 2, headY + 1, '#111111');
    p(headX + 4, headY + 2, '#ffffff');
    p(headX + 5, headY + 1, '#111111');
    renderHairStyle(ctx, headX + 3, headY - 1, appearance.hairStyle, hair, hairHigh, hairShadow, false);

    ctx.restore();
    return canvas;
  }

  // ==========================================
  // FREE KICK STANCE (Iconic wide stance, chest puffed)
  // ==========================================
  if (action === 'freekick_stance') {
    ctx.save();
    const kickDir = dirX !== 0 ? dirX : 1;
    if (kickDir < 0) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    const yB = groundY;

    // Wide grounded stance (feet spaced apart)
    r(cx - 7, yB - 3, 4, 3, bootColor);
    p(cx - 6, yB - 3, bootAccent);
    r(cx - 7, yB, 4, 1, bootStuds);
    r(cx + 3, yB - 3, 4, 3, bootColor);
    p(cx + 4, yB - 3, bootAccent);
    r(cx + 3, yB, 4, 1, bootStuds);

    // Angled athletic legs
    r(cx - 6, yB - 8, 3, 5, socksColor);
    r(cx - 6, yB - 8, 3, 1, sockWhite);
    r(cx + 2, yB - 8, 3, 5, socksColor);
    r(cx + 2, yB - 8, 3, 1, sockWhite);

    // Shorts
    r(cx - 6, yB - 15, 12, 7, shortsColor);
    r(cx - 6, yB - 15, 1, 7, trimColor);
    r(cx + 5, yB - 15, 1, 7, trimColor);

    // Puffed athletic chest with subtle breathing
    const chestBob = Math.sin(Date.now() / 180) * 0.7;
    const torsoY = Math.round(yB - 26 + chestBob);
    r(cx - 6, torsoY, 12, 11, shirtColor);
    r(cx - 4, torsoY + 1, 8, 9, trimColor);

    // Hands resting on thighs/hips
    r(cx - 8, torsoY + 4, 3, 6, skin);
    r(cx + 5, torsoY + 4, 3, 6, skin);

    // Head looking dead ahead at goal top corner
    const headX = cx - 3;
    const headY = torsoY - 8;
    r(headX, headY, 7, 7, skin);
    p(headX + 4, headY + 3, '#ffffff');
    p(headX + 5, headY + 3, '#111111'); // Laser focused eye
    p(headX + 4, headY + 2, '#111111');
    renderHairStyle(ctx, headX + 3, headY - 1, appearance.hairStyle, hair, hairHigh, hairShadow, false);

    ctx.restore();
    return canvas;
  }

  // ==========================================
  // FREE KICK STRIKE (Dynamic curved instep whip)
  // ==========================================
  if (action === 'freekick_strike') {
    ctx.save();
    const kickDir = dirX !== 0 ? dirX : 1;
    if (kickDir < 0) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    const yB = groundY;

    // Planted support foot digging deep into turf
    r(cx - 5, yB - 3, 5, 3, bootColor);
    p(cx - 4, yB - 3, bootAccent);
    r(cx - 5, yB, 5, 2, bootStuds);
    p(cx - 7, yB - 1, '#22c55e'); // Turf flecks
    p(cx - 6, yB + 1, '#15803d');

    // Plant leg support
    r(cx - 4, yB - 8, 3, 5, socksColor);
    r(cx - 4, yB - 8, 3, 1, sockWhite);

    // Striking leg swept high forward with curved instep
    r(cx + 4, yB - 11, 4, 3, skin);
    r(cx + 7, yB - 9, 5, 3, socksColor);
    r(cx + 11, yB - 8, 5, 4, bootColor);
    p(cx + 12, yB - 8, bootAccent);
    p(cx + 13, yB - 6, '#ffffff');

    // Shorts angled
    r(cx - 5, yB - 15, 12, 7, shortsColor);

    // Torso leaned back and side for curl leverage
    const torsoX = cx - 4;
    const torsoY = yB - 25;
    r(torsoX, torsoY, 11, 10, shirtColor);
    r(torsoX + 2, torsoY + 1, 7, 8, trimColor);

    // Balancing arms outstretched
    r(torsoX - 5, torsoY + 2, 5, 3, skin);
    r(torsoX + 10, torsoY - 4, 4, 4, skin);

    // Head locked on ball trajectory
    const headX = torsoX + 2;
    const headY = torsoY - 7;
    r(headX, headY, 7, 7, skin);
    p(headX + 4, headY + 4, '#ffffff');
    p(headX + 5, headY + 4, '#111111');
    renderHairStyle(ctx, headX + 3, headY - 1, appearance.hairStyle, hair, hairHigh, hairShadow, false);

    ctx.restore();
    return canvas;
  }

  // ==========================================
  // PENALTY STANCE (Concentrated laser focus)
  // ==========================================
  if (action === 'penalty_stance') {
    ctx.save();
    const kickDir = dirX !== 0 ? dirX : 1;
    if (kickDir < 0) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    const yB = groundY;

    // Solid upright stance
    r(cx - 4, yB - 3, 4, 3, bootColor);
    p(cx - 3, yB - 3, bootAccent);
    r(cx + 1, yB - 3, 4, 3, bootColor);
    p(cx + 2, yB - 3, bootAccent);

    // Legs
    r(cx - 4, yB - 8, 3, 5, socksColor);
    r(cx - 4, yB - 8, 3, 1, sockWhite);
    r(cx + 1, yB - 8, 3, 5, socksColor);
    r(cx + 1, yB - 8, 3, 1, sockWhite);

    // Shorts
    r(cx - 5, yB - 15, 10, 7, shortsColor);

    // Torso with rhythmic breathing
    const breath = Math.sin(Date.now() / 200) * 0.8;
    const torsoY = Math.round(yB - 26 + breath);
    r(cx - 5, torsoY, 11, 11, shirtColor);
    r(cx - 3, torsoY + 1, 7, 9, trimColor);

    // Arms loose at sides
    r(cx - 7, torsoY + 2, 2, 7, skin);
    r(cx + 5, torsoY + 2, 2, 7, skin);

    // Head looking straight forward
    const headX = cx - 3;
    const headY = torsoY - 8;
    r(headX, headY, 7, 7, skin);
    p(headX + 4, headY + 3, '#ffffff');
    p(headX + 5, headY + 3, '#111111');
    renderHairStyle(ctx, headX + 3, headY - 1, appearance.hairStyle, hair, hairHigh, hairShadow, false);

    ctx.restore();
    return canvas;
  }

  // ==========================================
  // PENALTY RUN-UP (Measured approach strides)
  // ==========================================
  if (action === 'penalty_runup') {
    ctx.save();
    const runDir = dirX !== 0 ? dirX : 1;
    if (runDir < 0) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    const f = frame % 3;
    const yB = groundY;

    // Stride legs
    const legFront = f === 1 ? 5 : 2;
    const legBack = f === 1 ? -4 : -2;

    r(cx + legFront, yB - 3, 4, 3, bootColor);
    r(cx + legFront, yB - 8, 3, 5, socksColor);
    r(cx + legBack, yB - 4, 4, 3, bootColor);
    r(cx + legBack, yB - 9, 3, 5, socksColor);

    // Shorts
    r(cx - 4, yB - 15, 10, 7, shortsColor);

    // Torso leaned into stride
    r(cx - 2, yB - 25, 10, 10, shirtColor);
    r(cx, yB - 24, 7, 8, trimColor);

    // Pumping arms
    r(cx - 4, yB - 22, 3, 6, skin);
    r(cx + 7, yB - 24, 3, 5, skin);

    // Head
    const headX = cx + 2;
    const headY = yB - 32;
    r(headX, headY, 7, 7, skin);
    p(headX + 4, headY + 3, '#ffffff');
    p(headX + 5, headY + 3, '#111111');
    renderHairStyle(ctx, headX + 3, headY - 1, appearance.hairStyle, hair, hairHigh, hairShadow, false);

    ctx.restore();
    return canvas;
  }

  // ==========================================
  // PENALTY STRIKE (Clean instep whip / driven power shot)
  // ==========================================
  if (action === 'penalty_strike') {
    ctx.save();
    const kickDir = dirX !== 0 ? dirX : 1;
    if (kickDir < 0) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    const yB = groundY;

    // Plant foot
    r(cx - 4, yB - 3, 5, 3, bootColor);
    p(cx - 3, yB - 3, bootAccent);
    r(cx - 3, yB - 8, 3, 5, socksColor);

    // High follow-through striking leg
    r(cx + 3, yB - 9, 4, 3, skin);
    r(cx + 6, yB - 7, 4, 3, socksColor);
    r(cx + 9, yB - 6, 5, 4, bootColor);
    p(cx + 10, yB - 6, bootAccent);

    // Shorts
    r(cx - 5, yB - 15, 11, 7, shortsColor);

    // Torso leaning forward over ball for driven power
    const torsoX = cx - 2;
    const torsoY = yB - 25;
    r(torsoX, torsoY, 10, 10, shirtColor);
    r(torsoX + 1, torsoY + 1, 7, 8, trimColor);

    // Balance arms
    r(torsoX - 5, torsoY + 2, 4, 4, skin);
    r(torsoX + 8, torsoY - 2, 4, 4, skin);

    // Head
    const headX = torsoX + 2;
    const headY = torsoY - 7;
    r(headX, headY, 7, 7, skin);
    p(headX + 4, headY + 3, '#ffffff');
    p(headX + 5, headY + 3, '#111111');
    renderHairStyle(ctx, headX + 3, headY - 1, appearance.hairStyle, hair, hairHigh, hairShadow, false);

    ctx.restore();
    return canvas;
  }

  // ==========================================
  // GOALKEEPER PENALTY ANTICIPATION (Dancing/swaying on goal line)
  // ==========================================
  if (action === 'goalkeeper_penalty_anticipate') {
    ctx.save();
    const yB = groundY;
    // Bouncing sway side to side on the line
    const sway = Math.sin(Date.now() / 110) * 3.5;
    const sX = cx + Math.round(sway);

    // Up on toes / balls of feet
    r(sX - 5, yB - 4, 4, 3, bootColor);
    r(sX + 2, yB - 4, 4, 3, bootColor);

    // Bent athletic knees
    r(sX - 5, yB - 9, 3, 5, socksColor);
    r(sX + 2, yB - 9, 3, 5, socksColor);

    // GK Shorts
    r(sX - 6, yB - 16, 13, 7, shortsColor);

    // Wide athletic torso
    r(sX - 7, yB - 27, 14, 11, shirtColor);
    r(sX - 5, yB - 26, 10, 9, trimColor);

    // Both arms raised and spread wide ready to spring
    r(sX - 11, yB - 26, 4, 3, skin);
    r(sX - 13, yB - 29, 3, 4, '#ffffff'); // GK Gloves
    r(sX + 7, yB - 26, 4, 3, skin);
    r(sX + 10, yB - 29, 3, 4, '#ffffff'); // GK Gloves

    // Focused head with eyes locked on taker
    const headX = sX - 3;
    const headY = yB - 34;
    r(headX, headY, 7, 7, skin);
    p(headX + 1, headY + 3, '#ffffff');
    p(headX + 2, headY + 3, '#111111');
    p(headX + 4, headY + 3, '#ffffff');
    p(headX + 5, headY + 3, '#111111');
    renderHairStyle(ctx, headX + 3, headY - 1, appearance.hairStyle, hair, hairHigh, hairShadow, false);

    ctx.restore();
    return canvas;
  }

  // ==========================================
  // 3c. ADVANCED VOLLEYS & GINGA FLUID ANIMATIONS
  // Half-volley, Diving volley, Side-volley, Chest-volley, Rabona, Elastico, ATW
  // ==========================================

  // HALF-VOLLEY (Driven low laces strike, knee over ball, arms flared)
  if (action === 'half_volley') {
    ctx.save();
    const kickDir = dirX !== 0 ? dirX : 1;
    if (kickDir < 0) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    const f = frame % 3;
    const yB = groundY;

    // Plant foot digging deep into turf
    r(cx - 5, yB - 3, 5, 3, bootColor);
    p(cx - 4, yB - 3, bootAccent);
    r(cx - 5, yB, 5, 2, bootStuds);
    p(cx - 7, yB - 1, '#22c55e');

    // Plant leg support with bent knee
    r(cx - 4, yB - 8, 3, 5, socksColor);
    r(cx - 4, yB - 8, 3, 1, sockWhite);

    // Striking leg: f=0 (windup), f=1 (impact snap on bounce), f=2 (low follow-through)
    const reach = f === 1 ? 12 : (f === 0 ? 6 : 14);
    const legY = f === 1 ? yB - 6 : (f === 0 ? yB - 10 : yB - 5);
    r(cx + 2, legY - 3, 5, 3, skin);
    r(cx + 6, legY - 1, 5, 3, socksColor);
    r(cx + reach, legY, 6, 4, bootColor);
    p(cx + reach + 1, legY, bootAccent);
    p(cx + reach + 3, legY + 2, '#f8fafc'); // Gleam on striking laces

    if (f === 1) {
      // Turf impact sparks on low driven half-volley
      p(cx + reach + 4, legY + 3, '#ffffff');
      p(cx + reach + 2, legY + 4, '#22c55e');
      p(cx + reach + 5, legY + 1, '#facc15');
    }

    // Shorts angled low
    r(cx - 5, yB - 15, 12, 7, shortsColor);

    // Torso leaned forward aggressively over the ball
    const torsoX = cx - 3;
    const torsoY = yB - 26;
    r(torsoX, torsoY, 11, 11, shirtColor);
    r(torsoX + 2, torsoY + 1, 7, 9, trimColor);

    // Balancing arms flared wide
    r(torsoX - 5, torsoY + 2, 5, 3, skin);
    r(torsoX + 9, torsoY - 2, 4, 4, skin);

    // Head locked down on the sweet spot of the ball
    const headX = torsoX + 3;
    const headY = torsoY - 8;
    r(headX, headY, 7, 7, skin);
    p(headX + 4, headY + 4, '#ffffff');
    p(headX + 5, headY + 4, '#111111');
    renderHairStyle(ctx, headX + 3, headY - 1, appearance.hairStyle, hair, hairHigh, hairShadow, false);

    ctx.restore();
    return canvas;
  }

  // DIVING VOLLEY (Horizontal airborne diving strike 12-15px above turf)
  if (action === 'diving_volley') {
    ctx.save();
    const kickDir = dirX !== 0 ? dirX : 1;
    if (kickDir < 0) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    const f = frame % 3;
    // f=0: Launch lunge, f=1: Horizontal rocket flight & strike, f=2: Turf glide landing
    const midY = f === 1 ? groundY - 14 : (f === 0 ? groundY - 9 : groundY - 5);

    // Head diving forward with laser focus
    const headOffset = f === 1 ? 12 : 9;
    r(cx + headOffset, midY - 3, 6, 6, skin);
    p(cx + headOffset + 2, midY - 1, '#ffffff');
    p(cx + headOffset + 3, midY - 1, '#111111');
    renderHairStyle(ctx, cx + headOffset + 1, midY - 5, appearance.hairStyle, hair, hairHigh, hairShadow, false);

    // Torso horizontal in flight
    r(cx, midY - 2, 11, 7, shirtColor);
    r(cx + 1, midY - 1, 9, 2, trimColor);

    // Wingspan arms outstretched forward
    r(cx + 7, midY + 4, 4, 3, skin);
    r(cx - 3, midY + 4, 4, 3, skin);

    // Shorts horizontal
    r(cx - 6, midY - 2, 7, 6, shortsColor);

    // Striking lead leg thrust straight forward horizontally
    const thrust = f === 1 ? 22 : (f === 0 ? 15 : 18);
    r(cx + 6, midY - 8, 8, 3, skin);
    r(cx + 13, midY - 9, 7, 3, socksColor);
    r(cx + thrust, midY - 10, 5, 4, bootColor);
    p(cx + thrust + 1, midY - 9, bootAccent);
    p(cx + thrust + 3, midY - 8, '#ffffff'); // Impact flash

    if (f === 1) {
      // Sonic dive impact flash
      p(cx + thrust + 4, midY - 11, '#38bdf8');
      p(cx + thrust + 5, midY - 7, '#fef08a');
    }

    // Trailing leg streamlined behind
    r(cx - 12, midY + 1, 7, 3, socksColor);
    r(cx - 16, midY + 2, 5, 3, bootColor);

    ctx.restore();
    return canvas;
  }

  // SIDE VOLLEY (Full 90° lateral hip rotation, horizontal leg snap)
  if (action === 'side_volley') {
    ctx.save();
    const kickDir = dirX !== 0 ? dirX : 1;
    if (kickDir < 0) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    const f = frame % 3;
    const yB = groundY;

    // Plant foot up on toe with spring
    r(cx - 4, yB - 4, 4, 4, bootColor);
    p(cx - 3, yB - 3, bootAccent);
    r(cx - 3, yB - 9, 3, 5, socksColor);

    // Striking leg swept horizontal at waist height
    const legSweep = f === 1 ? 18 : (f === 0 ? 11 : 16);
    r(cx + 2, yB - 14, 8, 4, skin);
    r(cx + 9, yB - 15, 8, 4, socksColor);
    p(cx + 11, yB - 15, sockRib);
    r(cx + legSweep, yB - 16, 6, 5, bootColor);
    p(cx + legSweep + 1, yB - 15, bootAccent);
    p(cx + legSweep + 4, yB - 14, '#ffffff'); // Laces gleam
    r(cx + legSweep + 1, yB - 11, 4, 1, bootStuds); // Studs visible sideways

    if (f === 1) {
      // Whipped side volley impact sparks
      p(cx + legSweep + 5, yB - 17, '#60a5fa');
      p(cx + legSweep + 6, yB - 14, '#ffffff');
    }

    // Shorts angled sideways
    r(cx - 6, yB - 16, 12, 7, shortsColor);

    // Torso leaned 45 degrees away for leverage
    const lean = f === 1 ? -8 : -5;
    const torsoX = cx + lean;
    const torsoY = yB - 26;
    r(torsoX, torsoY, 11, 11, shirtColor);
    r(torsoX + 2, torsoY + 1, 7, 9, trimColor);

    // Outstretched counter-balance arms
    r(torsoX - 5, torsoY + 4, 5, 3, skin);
    r(torsoX + 9, torsoY - 3, 4, 4, skin);

    // Head turned looking down the line of the strike
    const headX = torsoX + 2;
    const headY = torsoY - 8;
    r(headX, headY, 7, 7, skin);
    p(headX + 4, headY + 3, '#ffffff');
    p(headX + 5, headY + 3, '#111111');
    renderHairStyle(ctx, headX + 3, headY - 1, appearance.hairStyle, hair, hairHigh, hairShadow, false);

    ctx.restore();
    return canvas;
  }

  // CHEST VOLLEY (Arched chest stall transitioning into thunderous laces volley)
  if (action === 'chest_volley') {
    ctx.save();
    const kickDir = dirX !== 0 ? dirX : 1;
    if (kickDir < 0) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    const f = frame % 3;
    const yB = groundY;

    // Both feet planted firm
    r(cx - 5, yB - 3, 4, 3, bootColor);
    r(cx + 2, yB - 4, 4, 3, bootColor);
    r(cx - 5, yB - 8, 3, 5, socksColor);
    r(cx + 2, yB - 9, 3, 5, socksColor);

    // Shorts
    r(cx - 6, yB - 15, 12, 7, shortsColor);

    if (f === 1) {
      // VOLLEY RELEASE: Leg snaps outward to strike falling ball
      r(cx + 2, yB - 13, 7, 4, skin);
      r(cx + 9, yB - 14, 7, 4, socksColor);
      r(cx + 15, yB - 15, 6, 4, bootColor);
      p(cx + 17, yB - 14, '#ffffff');
      p(cx + 19, yB - 15, '#a78bfa');
    }

    // Puffed chest arched backwards to cushion ball
    const torsoX = cx - 4;
    const torsoY = yB - 26;
    r(torsoX, torsoY, 12, 11, shirtColor);
    r(torsoX + 2, torsoY + 1, 8, 9, trimColor);

    // Balancing arms flared back
    r(torsoX - 4, torsoY + 3, 3, 6, skin);
    r(torsoX + 9, torsoY + 3, 3, 6, skin);

    // Head tilted up watching ball impact chest
    const headX = torsoX + 3;
    const headY = torsoY - 9;
    r(headX, headY, 7, 7, skin);
    p(headX + 3, headY + 2, '#ffffff');
    p(headX + 4, headY + 2, '#111111');
    renderHairStyle(ctx, headX + 3, headY - 2, appearance.hairStyle, hair, hairHigh, hairShadow, false);

    ctx.restore();
    return canvas;
  }

  // RABONA VOLLEY (Acrobatic cross-legged strike behind plant foot)
  if (action === 'rabona_volley') {
    ctx.save();
    const kickDir = dirX !== 0 ? dirX : 1;
    if (kickDir < 0) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    const f = frame % 3;
    const yB = groundY;

    // Lead support foot planted
    r(cx + 2, yB - 3, 5, 3, bootColor);
    r(cx + 2, yB - 8, 3, 5, socksColor);

    // Striking leg wrapped BEHIND the support leg!
    const hook = f === 1 ? 6 : (f === 0 ? 3 : 5);
    r(cx - 7, yB - 9, 6, 3, skin);
    r(cx - 1, yB - 8, 5, 3, socksColor);
    r(cx + hook, yB - 7, 5, 4, bootColor);
    p(cx + hook + 1, yB - 7, bootAccent);
    p(cx + hook + 4, yB - 6, '#ffffff'); // Outside-boot strike gleam

    if (f === 1) {
      // Trivela / rabona curve spark
      p(cx + hook + 5, yB - 8, '#f43f5e');
      p(cx + hook + 6, yB - 5, '#facc15');
    }

    // Shorts
    r(cx - 5, yB - 15, 11, 7, shortsColor);

    // Torso twisted with flair
    const torsoX = cx - 3;
    const torsoY = yB - 25;
    r(torsoX, torsoY, 11, 10, shirtColor);
    r(torsoX + 2, torsoY + 1, 7, 8, trimColor);

    // Arms out for acrobatic equilibrium
    r(torsoX - 5, torsoY + 3, 4, 3, skin);
    r(torsoX + 8, torsoY - 2, 4, 4, skin);

    // Head
    const headX = torsoX + 2;
    const headY = torsoY - 7;
    r(headX, headY, 7, 7, skin);
    p(headX + 4, headY + 3, '#ffffff');
    p(headX + 5, headY + 3, '#111111');
    renderHairStyle(ctx, headX + 3, headY - 1, appearance.hairStyle, hair, hairHigh, hairShadow, false);

    ctx.restore();
    return canvas;
  }

  // ELASTICO (Ronaldinho outside-inside lightning ankle snap with hip feint)
  if (action === 'elastico') {
    ctx.save();
    const kickDir = dirX !== 0 ? dirX : 1;
    if (kickDir < 0) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    const f = frame % 3;
    const yB = groundY;

    // Feint plant foot
    r(cx - 4, yB - 3, 4, 3, bootColor);
    r(cx - 4, yB - 8, 3, 5, socksColor);

    // Trick foot: outside brush -> sharp inside hook
    const trickX = f === 1 ? cx + 6 : cx + 2;
    r(trickX, yB - 4, 5, 3, bootColor);
    p(trickX + 1, yB - 4, bootAccent);
    r(trickX - 1, yB - 9, 3, 5, socksColor);

    // Elastic motion sparks
    p(trickX + 4, yB - 2, '#38bdf8');
    p(trickX - 2, yB - 2, '#facc15');

    // Shorts with sharp hip tilt
    const hipSway = f === 1 ? 2 : -1;
    r(cx - 5 + hipSway, yB - 15, 11, 7, shortsColor);

    // Torso swaying in counter-balance
    const torsoX = cx - 3 - hipSway;
    const torsoY = yB - 25;
    r(torsoX, torsoY, 11, 10, shirtColor);
    r(torsoX + 2, torsoY + 1, 7, 8, trimColor);

    // Samba arms balancing
    r(torsoX - 5, torsoY + 2, 4, 4, skin);
    r(torsoX + 8, torsoY + 1, 4, 4, skin);

    // Head with confident smirk
    const headX = torsoX + 2;
    const headY = torsoY - 8;
    r(headX, headY, 7, 7, skin);
    p(headX + 4, headY + 3, '#ffffff');
    p(headX + 5, headY + 3, '#111111');
    renderHairStyle(ctx, headX + 3, headY - 1, appearance.hairStyle, hair, hairHigh, hairShadow, false);

    ctx.restore();
    return canvas;
  }

  // AROUND THE WORLD (360° leg loop around the suspended ball)
  if (action === 'around_the_world') {
    ctx.save();
    const kickDir = dirX !== 0 ? dirX : 1;
    if (kickDir < 0) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    const f = frame % 4;
    const yB = groundY;

    // Standing foot on toes
    r(cx - 3, yB - 4, 4, 4, bootColor);
    r(cx - 3, yB - 9, 3, 5, socksColor);

    // Circling leg in 4 rotational quadrants over ball
    let loopX = cx + 2;
    let loopY = yB - 14;
    if (f === 0) { loopX = cx - 5; loopY = yB - 12; }
    else if (f === 1) { loopX = cx + 1; loopY = yB - 18; }
    else if (f === 2) { loopX = cx + 8; loopY = yB - 14; }
    else { loopX = cx + 4; loopY = yB - 8; }

    r(loopX, loopY, 5, 3, bootColor);
    p(loopX + 1, loopY, bootAccent);
    r(loopX - 2, loopY + 3, 3, 5, socksColor);

    // Freestyle motion orbit trail
    p(loopX + 5, loopY - 1, '#fde047');
    p(loopX - 4, loopY + 1, '#38bdf8');

    // Shorts
    r(cx - 5, yB - 15, 11, 7, shortsColor);

    // Torso
    const torsoX = cx - 3;
    const torsoY = yB - 25;
    r(torsoX, torsoY, 11, 10, shirtColor);
    r(torsoX + 2, torsoY + 1, 7, 8, trimColor);

    // Freestyle balancing arms
    r(torsoX - 5, torsoY + 1, 4, 4, skin);
    r(torsoX + 8, torsoY + 1, 4, 4, skin);

    // Head watching ball intently
    const headX = torsoX + 2;
    const headY = torsoY - 8;
    r(headX, headY, 7, 7, skin);
    p(headX + 3, headY + 4, '#ffffff');
    p(headX + 4, headY + 4, '#111111');
    renderHairStyle(ctx, headX + 3, headY - 1, appearance.hairStyle, hair, hairHigh, hairShadow, false);

    ctx.restore();
    return canvas;
  }

  // FLYING HEEL VOLLEY (Airborne backward heel flick deflection)
  if (action === 'flying_heel_volley') {
    ctx.save();
    const kickDir = dirX !== 0 ? dirX : 1;
    if (kickDir < 0) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    const f = frame % 3;
    // f=0: Forward leap tilt, f=1: Reverse heel flick snap, f=2: Touchdown recovery
    const midY = f === 1 ? groundY - 14 : (f === 0 ? groundY - 10 : groundY - 5);

    // Torso tilted forward in mid-air
    r(cx - 2, midY - 3, 10, 8, shirtColor);
    r(cx, midY - 2, 7, 2, trimColor);

    // Head looking down towards trajectory
    r(cx + 6, midY - 6, 6, 6, skin);
    p(cx + 9, midY - 4, '#ffffff');
    p(cx + 10, midY - 4, '#111111');
    renderHairStyle(ctx, cx + 7, midY - 8, appearance.hairStyle, hair, hairHigh, hairShadow, false);

    // Balancing outstretched arms
    r(cx + 4, midY + 4, 4, 3, skin);
    r(cx - 6, midY + 3, 4, 3, skin);

    // Shorts angled
    r(cx - 7, midY - 2, 6, 6, shortsColor);

    // Striking heel snapped backward in mid-air
    const reach = f === 1 ? 23 : (f === 0 ? 15 : 18);
    r(cx - 12, midY - 6, 6, 3, skin);
    r(cx - (reach - 4), midY - 5, 5, 3, socksColor);
    r(cx - reach, midY - 4, 5, 4, bootColor);
    p(cx - (reach - 2), midY - 4, '#ffffff'); // Gleam on heel impact point
    r(cx - reach, midY - 1, 3, 1, bootStuds);

    if (f === 1) {
      // Impact star flash on heel strike
      p(cx - reach - 2, midY - 5, '#ffffff');
      p(cx - reach - 3, midY - 2, '#e879f9');
      p(cx - reach + 2, midY - 7, '#facc15');
    }

    // Trailing support leg
    r(cx - 7, midY + 4, 4, 4, socksColor);
    r(cx - 9, midY + 7, 4, 3, bootColor);

    ctx.restore();
    return canvas;
  }

  // SOMBRERO VOLLEY (Acrobatic airborne strike following up a sombrero flick)
  if (action === 'sombrero_volley') {
    ctx.save();
    const kickDir = dirX !== 0 ? dirX : 1;
    if (kickDir < 0) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    const f = frame % 3;
    // f=0: Eyeing descending ball, f=1: Explosive downward laces smash, f=2: Touchdown roll
    const midY = f === 1 ? groundY - 16 : (f === 0 ? groundY - 12 : groundY - 6);

    // Head tilted up watching aerial ball drop into sweet spot
    r(cx + 4, midY - 8, 6, 6, skin);
    p(cx + 7, midY - 6, '#ffffff');
    p(cx + 8, midY - 6, '#111111');
    renderHairStyle(ctx, cx + 5, midY - 10, appearance.hairStyle, hair, hairHigh, hairShadow, false);

    // Torso dynamically coiled 30° backwards
    r(cx - 4, midY - 4, 10, 8, shirtColor);
    r(cx - 3, midY - 3, 8, 2, trimColor);

    // Flying wingspan arms
    r(cx + 5, midY + 2, 4, 4, skin);
    r(cx - 7, midY + 2, 4, 4, skin);

    // Shorts
    r(cx - 8, midY - 2, 6, 6, shortsColor);

    // Extended striking leg smashing downward with laces
    const ext = f === 1 ? 16 : (f === 0 ? 10 : 13);
    r(cx + 1, midY - 9, 6, 3, skin);
    r(cx + 6, midY - 8, 6, 3, socksColor);
    r(cx + ext, midY - 7, 6, 4, bootColor);
    p(cx + ext + 1, midY - 7, bootAccent);
    p(cx + ext + 4, midY - 6, '#ffffff'); // Explosive laces flash

    if (f === 1) {
      // Thunder smash sparkles
      p(cx + ext + 5, midY - 8, '#fb923c');
      p(cx + ext + 6, midY - 5, '#ffffff');
      p(cx + ext + 2, midY - 10, '#facc15');
    }

    // Trailing airborne leg
    r(cx - 12, midY + 2, 5, 3, socksColor);
    r(cx - 14, midY + 4, 4, 3, bootColor);

    ctx.restore();
    return canvas;
  }

  // DIVING HEADER (Torpedo horizontal flying header)
  if (action === 'diving_header') {
    ctx.save();
    const kickDir = dirX !== 0 ? dirX : 1;
    if (kickDir < 0) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    const midY = groundY - 9;

    // Torpedo outstretched head crashing forward
    r(cx + 12, midY - 2, 7, 7, skin);
    p(cx + 15, midY, '#ffffff');
    p(cx + 16, midY, '#111111');
    renderHairStyle(ctx, cx + 13, midY - 4, appearance.hairStyle, hair, hairHigh, hairShadow, false);

    // Torso completely horizontal like an arrow
    r(cx + 1, midY - 1, 12, 6, shirtColor);
    r(cx + 2, midY, 10, 2, trimColor);

    // Aerodynamic swept-back arms
    r(cx - 4, midY + 2, 4, 3, skin);
    r(cx + 6, midY + 2, 4, 3, skin);

    // Shorts horizontal
    r(cx - 5, midY - 1, 7, 5, shortsColor);

    // Both legs streamlined together straight behind
    r(cx - 12, midY, 8, 3, socksColor);
    r(cx - 17, midY, 6, 3, bootColor);
    p(cx - 16, midY, bootAccent);

    ctx.restore();
    return canvas;
  }

  // HEEL CHOP (Sharp hop and 90° heel redirection behind standing leg)
  if (action === 'heel_chop') {
    ctx.save();
    const kickDir = dirX !== 0 ? dirX : 1;
    if (kickDir < 0) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    const yB = groundY;

    // Plant leg forward
    r(cx + 3, yB - 4, 4, 4, bootColor);
    r(cx + 3, yB - 9, 3, 5, socksColor);

    // Chopping heel tucked sharp behind
    r(cx - 6, yB - 5, 5, 4, bootColor);
    p(cx - 5, yB - 4, bootAccent);
    r(cx - 5, yB - 10, 3, 5, socksColor);
    p(cx - 8, yB - 3, '#22c55e'); // Turf flick

    // Shorts
    r(cx - 4, yB - 16, 11, 7, shortsColor);

    // Torso
    const torsoX = cx - 2;
    const torsoY = yB - 26;
    r(torsoX, torsoY, 11, 10, shirtColor);
    r(torsoX + 2, torsoY + 1, 7, 8, trimColor);

    // Arms
    r(torsoX - 4, torsoY + 2, 4, 4, skin);
    r(torsoX + 7, torsoY + 2, 4, 4, skin);

    // Head
    const headX = torsoX + 2;
    const headY = torsoY - 8;
    r(headX, headY, 7, 7, skin);
    p(headX + 4, headY + 3, '#ffffff');
    p(headX + 5, headY + 3, '#111111');
    renderHairStyle(ctx, headX + 3, headY - 1, appearance.hairStyle, hair, hairHigh, hairShadow, false);

    ctx.restore();
    return canvas;
  }

  // ==========================================
  // PHASE 8: SPECIALIST ACROBATICS & PHYSICALITY
  // ==========================================

  // SLIDING TOE POKE: Desperate lunging poke under pressure
  if (action === 'sliding_toe_poke') {
    ctx.save();
    const kickDir = dirX !== 0 ? dirX : 1;
    if (kickDir < 0) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    const f = frame % 3;
    const yB = groundY;

    // Ground turf slide trail
    r(cx - 10, yB - 3, 6, 2, '#166534');

    // Plant/trailing bent leg dragging turf
    r(cx - 8, yB - 4, 7, 3, skin);
    r(cx - 12, yB - 3, 5, 3, socksColor);
    r(cx - 15, yB - 3, 4, 3, bootColor);

    // Outstretched lunging kicking leg stretched to the limit
    const ext = f === 1 ? 24 : 20;
    r(cx - 1, yB - 5, 8, 3, skin);
    r(cx + 6, yB - 4, 8, 3, socksColor);
    p(cx + 8, yB - 4, sockRib);
    r(cx + ext - 6, yB - 3, 6, 4, bootColor);
    p(cx + ext - 5, yB - 3, bootAccent);
    p(cx + ext - 1, yB - 2, '#ffffff'); // Stretched toe tip poke gleam
    r(cx + ext - 3, yB + 1, 3, 1, bootStuds);

    if (f === 1) {
      // Impact grass clippings and toe poke spark
      p(cx + ext + 1, yB - 2, '#fde047');
      p(cx + ext + 2, yB - 4, '#ffffff');
      p(cx + ext, yB + 2, '#22c55e');
    }

    // Shorts sliding low
    r(cx - 7, yB - 8, 10, 5, shortsColor);

    // Torso leaned forward desperate lunge
    const torsoX = cx - 3;
    const torsoY = yB - 15;
    r(torsoX, torsoY, 11, 8, shirtColor);
    r(torsoX + 2, torsoY + 1, 7, 6, trimColor);

    // Arms bracing against ground & balance
    r(torsoX - 4, torsoY + 4, 4, 4, skin);
    r(torsoX + 7, torsoY + 1, 4, 3, skin);

    // Head determined grit
    const headX = torsoX + 5;
    const headY = torsoY - 7;
    r(headX, headY, 7, 7, skin);
    p(headX + 4, headY + 3, '#ffffff');
    p(headX + 5, headY + 3, '#111111');
    renderHairStyle(ctx, headX + 3, headY - 1, appearance.hairStyle, hair, hairHigh, hairShadow, false);

    ctx.restore();
    return canvas;
  }

  // BULLET HEADER: High-point aerial leap driving forehead downward into turf
  if (action === 'bullet_header') {
    ctx.save();
    const kickDir = dirX !== 0 ? dirX : 1;
    if (kickDir < 0) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    const f = frame % 3;
    const jumpY = f === 1 ? groundY - 16 : groundY - 12;

    // Both legs drawn back in mid-air coil
    r(cx - 8, jumpY + 4, 4, 6, skin);
    r(cx - 4, jumpY + 5, 4, 6, skin);
    r(cx - 9, jumpY + 9, 4, 5, socksColor);
    r(cx - 5, jumpY + 10, 4, 5, socksColor);
    r(cx - 10, jumpY + 13, 4, 3, bootColor);
    r(cx - 6, jumpY + 14, 4, 3, bootColor);

    // Shorts angled
    r(cx - 6, jumpY - 2, 10, 7, shortsColor);

    // Torso powerfully snapping forward
    const torsoX = cx - 3;
    const torsoY = jumpY - 12;
    r(torsoX, torsoY, 11, 11, shirtColor);
    r(torsoX + 2, torsoY + 1, 7, 9, trimColor);

    // Pumping airborne arms
    r(torsoX - 4, torsoY + 3, 3, 6, skin);
    r(torsoX + 8, torsoY + 1, 4, 5, skin);

    // Forehead snapping downward through the ball
    const headX = torsoX + 3;
    const headY = torsoY - 8;
    r(headX, headY, 8, 8, skin);
    p(headX + 5, headY + 5, '#ffffff');
    p(headX + 6, headY + 5, '#111111');
    p(headX + 4, headY + 3, '#111111'); // Intense downward brow
    renderHairStyle(ctx, headX + 3, headY - 1, appearance.hairStyle, hair, hairHigh, hairShadow, false);

    if (f === 1) {
      // Downward bullet impact flash
      p(headX + 7, headY + 8, '#fde047');
      p(headX + 8, headY + 10, '#ffffff');
      p(headX + 6, headY + 9, '#38bdf8');
    }

    ctx.restore();
    return canvas;
  }

  // GLANCING HEADER: Delicate near-post touch altering ball trajectory
  if (action === 'glancing_header') {
    ctx.save();
    const kickDir = dirX !== 0 ? dirX : 1;
    if (kickDir < 0) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    const jumpY = groundY - 10;

    // Upright aerial leap
    r(cx - 4, jumpY + 3, 3, 6, socksColor);
    r(cx + 1, jumpY + 2, 3, 7, socksColor);
    r(cx - 4, jumpY + 8, 4, 3, bootColor);
    r(cx + 1, jumpY + 8, 4, 3, bootColor);

    // Shorts
    r(cx - 5, jumpY - 4, 10, 7, shortsColor);

    // Torso twisted sideways to glance ball
    const torsoX = cx - 3;
    const torsoY = jumpY - 15;
    r(torsoX, torsoY, 11, 11, shirtColor);
    r(torsoX + 2, torsoY + 1, 7, 9, trimColor);

    // Balancing arms
    r(torsoX - 4, torsoY + 2, 3, 6, skin);
    r(torsoX + 8, torsoY + 2, 3, 6, skin);

    // Head turned sideways glancing ball
    const headX = torsoX + 2;
    const headY = torsoY - 8;
    r(headX, headY, 7, 7, skin);
    p(headX + 4, headY + 3, '#ffffff');
    p(headX + 5, headY + 3, '#111111');
    p(headX + 6, headY + 1, '#fde047'); // Glancing touch spark
    renderHairStyle(ctx, headX + 3, headY - 1, appearance.hairStyle, hair, hairHigh, hairShadow, false);

    ctx.restore();
    return canvas;
  }

  // CONTESTED AERIAL DUEL: Physical mid-air clash between two players
  if (action === 'contested_duel') {
    ctx.save();
    const kickDir = dirX !== 0 ? dirX : 1;
    if (kickDir < 0) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    const f = frame % 2;
    const jumpY = groundY - (f === 1 ? 14 : 10);

    // Tense bent aerial legs with knee cocked for physical leverage
    r(cx - 6, jumpY + 2, 4, 6, skin);
    r(cx + 1, jumpY + 1, 4, 7, skin);
    r(cx - 7, jumpY + 7, 4, 5, socksColor);
    r(cx + 1, jumpY + 7, 4, 6, socksColor);
    r(cx - 7, jumpY + 11, 4, 3, bootColor);
    r(cx + 1, jumpY + 12, 4, 3, bootColor);

    // Shorts
    r(cx - 6, jumpY - 5, 11, 7, shortsColor);

    // Torso leaned into mid-air physical shoulder challenge
    const torsoX = cx - 4;
    const torsoY = jumpY - 16;
    r(torsoX, torsoY, 12, 11, shirtColor);
    r(torsoX + 2, torsoY + 1, 8, 9, trimColor);

    // Strong physical arms locking out opponent
    r(torsoX - 5, torsoY + 2, 4, 5, skin);
    r(torsoX + 9, torsoY - 1, 4, 5, skin);

    // Determined battle face
    const headX = torsoX + 2;
    const headY = torsoY - 8;
    r(headX, headY, 8, 8, skin);
    p(headX + 4, headY + 3, '#ffffff');
    p(headX + 5, headY + 3, '#111111');
    p(headX + 3, headY + 2, '#111111');
    p(headX + 6, headY + 2, '#111111');
    renderHairStyle(ctx, headX + 3, headY - 1, appearance.hairStyle, hair, hairHigh, hairShadow, false);

    ctx.restore();
    return canvas;
  }

  // GOALKEEPER LOW SMOTHER: Collapsing sideways onto grass, trapping low ball securely into chest
  if (action === 'gk_low_smother') {
    ctx.save();
    const diveDir = dirX !== 0 ? dirX : 1;
    if (diveDir < 0) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    const yB = groundY;

    // Body horizontal on turf
    r(cx - 10, yB - 3, 10, 4, socksColor);
    r(cx - 14, yB - 3, 5, 4, bootColor);
    r(cx - 4, yB - 5, 8, 6, shortsColor);

    // Torso curled around ball
    r(cx + 2, yB - 7, 10, 8, shirtColor);
    r(cx + 3, yB - 6, 8, 2, trimColor);

    // Head tucked down protecting ball
    r(cx + 10, yB - 10, 7, 7, skin);
    p(cx + 13, yB - 7, '#ffffff');
    p(cx + 14, yB - 7, '#111111');
    renderHairStyle(ctx, cx + 11, yB - 12, appearance.hairStyle, hair, hairHigh, hairShadow, false);

    // Gloves wrapped tight around ball at chest level
    r(cx + 5, yB - 5, 5, 5, '#facc15'); // Fluo yellow GK gloves
    p(cx + 7, yB - 4, '#1e293b');
    r(cx + 8, yB - 6, 4, 5, '#facc15');

    ctx.restore();
    return canvas;
  }

  // GOALKEEPER FINGERTIP PARRY: Full-extension diving leap tipping rocket strike past post
  if (action === 'gk_fingertip_parry') {
    ctx.save();
    const diveDir = dirX !== 0 ? dirX : 1;
    if (diveDir < 0) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    const f = frame % 3;
    const dy = groundY - 16;

    // Fully horizontal streamlined legs
    r(cx - 14, dy + 2, 9, 3, socksColor);
    r(cx - 18, dy + 2, 5, 3, bootColor);
    r(cx - 6, dy + 1, 7, 6, shortsColor);

    // Torso stretched in full horizontal flight
    r(cx, dy, 11, 7, shirtColor);
    r(cx + 1, dy + 1, 9, 2, trimColor);

    // Head watching ball at full extension
    r(cx + 8, dy - 2, 6, 6, skin);
    p(cx + 11, dy, '#ffffff');
    p(cx + 12, dy, '#111111');
    renderHairStyle(ctx, cx + 9, dy - 4, appearance.hairStyle, hair, hairHigh, hairShadow, false);

    // Single fully extended arm reaching skyward for fingertip tip
    const reach = f === 1 ? 26 : 22;
    r(cx + 9, dy - 4, 7, 3, skin);
    r(cx + reach - 6, dy - 7, 6, 6, '#facc15'); // Extended glove
    p(cx + reach - 3, dy - 6, '#1e293b');

    // Fingertip deflection sparks
    p(cx + reach, dy - 8, '#38bdf8');
    p(cx + reach + 1, dy - 9, '#ffffff');
    p(cx + reach - 1, dy - 10, '#facc15');

    ctx.restore();
    return canvas;
  }

  // GOALKEEPER PUNCH: Leaping punch through traffic with clenched gloves
  if (action === 'gk_punch') {
    ctx.save();
    const jumpY = groundY - 12;

    // Springing legs
    r(cx - 4, jumpY + 2, 3, 6, socksColor);
    r(cx + 1, jumpY + 1, 3, 7, socksColor);
    r(cx - 4, jumpY + 7, 4, 3, bootColor);
    r(cx + 1, jumpY + 7, 4, 3, bootColor);

    // Shorts
    r(cx - 5, jumpY - 5, 10, 7, shortsColor);

    // Wide athletic torso
    const torsoX = cx - 3;
    const torsoY = jumpY - 16;
    r(torsoX, torsoY, 11, 11, shirtColor);
    r(torsoX + 2, torsoY + 1, 7, 9, trimColor);

    // Clenched double-fist gloves punching upward
    r(torsoX - 2, torsoY - 8, 5, 6, '#facc15');
    r(torsoX + 3, torsoY - 8, 5, 6, '#facc15');
    p(torsoX, torsoY - 7, '#1e293b');
    p(torsoX + 5, torsoY - 7, '#1e293b');

    // Head looking up at punch contact point
    const headX = torsoX + 2;
    const headY = torsoY - 6;
    r(headX, headY, 7, 7, skin);
    p(headX + 2, headY + 2, '#ffffff');
    p(headX + 3, headY + 1, '#111111');
    p(headX + 5, headY + 2, '#ffffff');
    p(headX + 6, headY + 1, '#111111');
    renderHairStyle(ctx, headX + 3, headY - 1, appearance.hairStyle, hair, hairHigh, hairShadow, false);

    // Powerful punch impact burst
    p(torsoX + 2, torsoY - 11, '#ffffff');
    p(torsoX + 4, torsoY - 12, '#fde047');

    ctx.restore();
    return canvas;
  }

  // GOALKEEPER 1v1 STAR SPREAD: Peter Schmeichel / Manuel Neuer starfish spread smother
  if (action === 'gk_star_spread') {
    ctx.save();
    const yB = groundY;

    // Both legs kicked out wide in starfish barrier
    r(cx - 10, yB - 4, 5, 4, bootColor);
    r(cx + 6, yB - 4, 5, 4, bootColor);
    r(cx - 8, yB - 9, 4, 6, socksColor);
    r(cx + 5, yB - 9, 4, 6, socksColor);

    // Shorts dropped low in athletic split stance
    r(cx - 6, yB - 14, 13, 6, shortsColor);

    // Broad upright torso blocking maximum surface area
    const torsoX = cx - 5;
    const torsoY = yB - 25;
    r(torsoX, torsoY, 13, 12, shirtColor);
    r(torsoX + 2, torsoY + 1, 9, 10, trimColor);

    // Both arms extended wide & high forming massive defensive wall
    r(torsoX - 6, torsoY - 4, 6, 4, skin);
    r(torsoX + 11, torsoY - 4, 6, 4, skin);
    r(torsoX - 9, torsoY - 7, 6, 6, '#facc15'); // Left spread glove
    r(torsoX + 13, torsoY - 7, 6, 6, '#facc15'); // Right spread glove
    p(torsoX - 7, torsoY - 5, '#1e293b');
    p(torsoX + 15, torsoY - 5, '#1e293b');

    // Intense commanding gaze closing down striker's vision
    const headX = cx - 3;
    const headY = torsoY - 8;
    r(headX, headY, 8, 8, skin);
    p(headX + 2, headY + 3, '#ffffff');
    p(headX + 3, headY + 3, '#111111');
    p(headX + 5, headY + 3, '#ffffff');
    p(headX + 6, headY + 3, '#111111');
    renderHairStyle(ctx, headX + 3, headY - 1, appearance.hairStyle, hair, hairHigh, hairShadow, false);

    ctx.restore();
    return canvas;
  }

  // GOALKEEPER QUICK FLOOR RECOVERY ROLL: Momentum roll from dive back onto feet
  if (action === 'gk_recovery_roll') {
    ctx.save();
    const yB = groundY;

    // Curled tuck roll transitioning from grass to crouched feet
    r(cx - 6, yB - 6, 7, 5, shortsColor);
    r(cx + 1, yB - 7, 8, 7, shirtColor);
    r(cx - 8, yB - 4, 5, 4, socksColor);
    r(cx - 10, yB - 3, 4, 3, bootColor);

    // Bracing gloves on turf springing upward
    r(cx + 6, yB - 3, 4, 4, '#facc15');
    p(cx + 7, yB - 2, '#1e293b');

    // Head coming up scanning immediate rebound danger
    r(cx + 5, yB - 13, 7, 7, skin);
    p(cx + 8, yB - 10, '#ffffff');
    p(cx + 9, yB - 10, '#111111');
    renderHairStyle(ctx, cx + 6, yB - 14, appearance.hairStyle, hair, hairHigh, hairShadow, false);

    ctx.restore();
    return canvas;
  }

  // GOALKEEPER HIGH LEAPING CATCH: High vertical spring plucking aerial cross/corner cleanly overhead
  if (action === 'gk_high_catch') {
    ctx.save();
    const f = frame % 3;
    const jumpLift = f === 1 ? -16 : -13;
    const dy = groundY + jumpLift;

    // Tucked athletic legs in mid-air spring
    r(cx - 5, dy + 2, 4, 7, socksColor);
    r(cx + 1, dy + 3, 4, 6, socksColor);
    r(cx - 6, dy + 8, 5, 3, bootColor);
    r(cx + 1, dy + 8, 5, 3, bootColor);
    p(cx - 5, dy + 11, bootStuds);
    p(cx + 2, dy + 11, bootStuds);

    // Shorts
    r(cx - 5, dy - 6, 11, 8, shortsColor);

    // Upright extended athletic torso
    const torsoX = cx - 4;
    const torsoY = dy - 18;
    r(torsoX, torsoY, 11, 12, shirtColor);
    r(torsoX + 2, torsoY + 1, 7, 10, trimColor);

    // Both arms reaching high overhead in secure 'W' catching cup
    r(torsoX - 3, torsoY - 8, 4, 9, skin);
    r(torsoX + 9, torsoY - 8, 4, 9, skin);
    // Overhead fluo yellow goalkeeper gloves
    r(torsoX - 4, torsoY - 14, 6, 6, '#facc15');
    r(torsoX + 8, torsoY - 14, 6, 6, '#facc15');
    p(torsoX - 2, torsoY - 12, '#1e293b');
    p(torsoX + 10, torsoY - 12, '#1e293b');

    // Head looking up at high ball
    const headX = torsoX + 2;
    const headY = torsoY - 7;
    r(headX, headY, 7, 7, skin);
    p(headX + 2, headY + 1, '#ffffff');
    p(headX + 3, headY, '#111111');
    p(headX + 5, headY + 1, '#ffffff');
    p(headX + 6, headY, '#111111');
    renderHairStyle(ctx, headX + 3, headY - 2, appearance.hairStyle, hair, hairHigh, hairShadow, false);

    // Secure grip glow
    p(torsoX + 2, torsoY - 16, '#38bdf8');
    p(torsoX + 8, torsoY - 16, '#ffffff');

    ctx.restore();
    return canvas;
  }

  // ==========================================
  // 4. UPRIGHT & IN-PLAY ANIMATIONS
  // Running, Passing, Shooting, Crossing, Heading, Tackles, Idle
  // ==========================================
  const isFacingUp = dirY < 0;
  const isFacingDown = dirY > 0;
  const isFacingSide = dirX !== 0 && Math.abs(dirX) > Math.abs(dirY * 0.6);

  let legOffset1 = 0;
  let legOffset2 = 0;
  let armOffset1 = 0;
  let armOffset2 = 0;
  let bodyBob = 0;
  let torsoLeanX = 0;
  let kickingLegHigh = false;
  let isMidAirHeader = false;
  let isLowBlockTackle = false;

  // RUNNING: 6-frame smooth high-detail sprint cycle
  if (action === 'running') {
    const f = frame % 6;
    if (f === 0) {
      legOffset1 = -3;
      legOffset2 = 3;
      armOffset1 = 3;
      armOffset2 = -3;
      bodyBob = 0;
    } else if (f === 1) {
      legOffset1 = -1;
      legOffset2 = 1;
      armOffset1 = 1;
      armOffset2 = -1;
      bodyBob = 1; // Downward foot plant
    } else if (f === 2) {
      legOffset1 = 2;
      legOffset2 = -1;
      armOffset1 = -1;
      armOffset2 = 2;
      bodyBob = -1; // Mid-stride lift
    } else if (f === 3) {
      legOffset1 = 3;
      legOffset2 = -3;
      armOffset1 = -3;
      armOffset2 = 3;
      bodyBob = 0;
    } else if (f === 4) {
      legOffset1 = 1;
      legOffset2 = -1;
      armOffset1 = -1;
      armOffset2 = 1;
      bodyBob = 1;
    } else {
      legOffset1 = -1;
      legOffset2 = 2;
      armOffset1 = 2;
      armOffset2 = -1;
      bodyBob = -1;
    }
  }

  // =========================================================================
  // PHASE 8.1: SIX DRIBBLING ANIMATION TIERS
  // Amateur (40-59), Semi-Pro (60-69), Pro (70-79), Elite (80-89), World Class (90-99), Unique (100+)
  // =========================================================================
  else if (action === 'dribbling') {
    const f = frame % 6;
    if (dribbleTier === 'amateur') {
      // 1. AMATEUR: Heavy, upright, slow turns, stiff stride cadence
      bodyBob = 2; // High upright center of gravity
      torsoLeanX = 0; // Stiff upright posture with no fluid lean
      legOffset1 = f % 2 === 0 ? 2 : -1;
      legOffset2 = f % 2 === 0 ? -1 : 1;
      armOffset1 = 1;
      armOffset2 = -1;
    } else if (dribbleTier === 'semi_pro') {
      // 2. SEMI-PRO: Basic close control
      bodyBob = 1;
      torsoLeanX = 1;
      legOffset1 = (f === 0 || f === 5) ? 3 : -1;
      legOffset2 = (f === 2 || f === 3) ? 3 : -1;
      armOffset1 = 2;
      armOffset2 = -2;
    } else if (dribbleTier === 'pro') {
      // 3. PRO: Sharper cuts, better body feints, athletic forward lean
      bodyBob = 0;
      torsoLeanX = 2;
      if (f === 0) {
        legOffset1 = 4; legOffset2 = -2; armOffset1 = -3; armOffset2 = 4; bodyBob = 1;
      } else if (f === 1) {
        legOffset1 = 1; legOffset2 = 0; armOffset1 = 2; armOffset2 = -2;
      } else if (f === 2) {
        legOffset1 = -2; legOffset2 = 3; armOffset1 = 3; armOffset2 = -3; bodyBob = -1;
      } else if (f === 3) {
        legOffset1 = -3; legOffset2 = 4; armOffset1 = 4; armOffset2 = -3; bodyBob = 1;
      } else if (f === 4) {
        legOffset1 = 0; legOffset2 = 1; armOffset1 = -2; armOffset2 = 2;
      } else {
        legOffset1 = 2; legOffset2 = -2; armOffset1 = -3; armOffset2 = 3; bodyBob = -1;
      }
    } else if (dribbleTier === 'elite') {
      // 4. ELITE: Quick step-overs, rapid direction change, low athletic crouch
      bodyBob = -1;
      torsoLeanX = 3;
      if (f === 0) {
        legOffset1 = 5; legOffset2 = -3; armOffset1 = -4; armOffset2 = 4;
      } else if (f === 1) {
        legOffset1 = 2; legOffset2 = -1; armOffset1 = 3; armOffset2 = -3;
      } else if (f === 2) {
        legOffset1 = -3; legOffset2 = 4; armOffset1 = 4; armOffset2 = -4; bodyBob = -2;
      } else if (f === 3) {
        legOffset1 = -4; legOffset2 = 5; armOffset1 = 5; armOffset2 = -4;
      } else if (f === 4) {
        legOffset1 = 1; legOffset2 = 1; armOffset1 = -3; armOffset2 = 3;
      } else {
        legOffset1 = 3; legOffset2 = -3; armOffset1 = -4; armOffset2 = 4; bodyBob = -2;
      }
    } else if (dribbleTier === 'world_class') {
      // 5. WORLD CLASS: Fluid, low centre of gravity, explosive cadence, ball glued to boots
      bodyBob = -2; // Deep low center of gravity
      torsoLeanX = 3;
      if (f === 0) {
        legOffset1 = 6; legOffset2 = -4; armOffset1 = -5; armOffset2 = 5;
      } else if (f === 1) {
        legOffset1 = 2; legOffset2 = -1; armOffset1 = 4; armOffset2 = -4;
      } else if (f === 2) {
        legOffset1 = -4; legOffset2 = 5; armOffset1 = 5; armOffset2 = -5; bodyBob = -3;
      } else if (f === 3) {
        legOffset1 = -5; legOffset2 = 6; armOffset1 = 6; armOffset2 = -5;
      } else if (f === 4) {
        legOffset1 = 1; legOffset2 = 2; armOffset1 = -4; armOffset2 = 4;
      } else {
        legOffset1 = 4; legOffset2 = -4; armOffset1 = -5; armOffset2 = 5; bodyBob = -3;
      }
    } else {
      // 6. UNIQUE (100+ Stat Break): Signature / exaggerated elite moves, dazzling Brazilian flair
      bodyBob = -2;
      torsoLeanX = 4; // Exaggerated fluid body angle
      if (f === 0) {
        legOffset1 = 6; legOffset2 = -4; armOffset1 = -6; armOffset2 = 6;
      } else if (f === 1) {
        legOffset1 = 3; legOffset2 = -1; armOffset1 = 5; armOffset2 = -5;
      } else if (f === 2) {
        legOffset1 = -4; legOffset2 = 6; armOffset1 = 6; armOffset2 = -6; bodyBob = -3;
      } else if (f === 3) {
        legOffset1 = -5; legOffset2 = 7; armOffset1 = 7; armOffset2 = -6;
      } else if (f === 4) {
        legOffset1 = 1; legOffset2 = 2; armOffset1 = -5; armOffset2 = 5;
      } else {
        legOffset1 = 5; legOffset2 = -4; armOffset1 = -6; armOffset2 = 6; bodyBob = -3;
      }
    }
  }

  // 8.1 CLOSE-CONTROL TOUCH STEPS: Micro-taps alternating inner & outer boot edges
  else if (action === 'close_control') {
    const f = frame % 6;
    if (dribbleTier === 'amateur') {
      bodyBob = 2;
      torsoLeanX = 0;
      legOffset1 = f % 2 === 0 ? 1 : 0;
      legOffset2 = f % 2 === 0 ? 0 : 1;
      armOffset1 = 1;
      armOffset2 = -1;
    } else if (dribbleTier === 'world_class' || dribbleTier === 'unique') {
      bodyBob = -1;
      torsoLeanX = dribbleTier === 'unique' ? 2 : 1;
      if (f === 0 || f === 3) {
        legOffset1 = f === 0 ? 4 : -3;
        legOffset2 = f === 0 ? -2 : 4;
        armOffset1 = f === 0 ? -3 : 4;
        armOffset2 = f === 0 ? 4 : -3;
      } else if (f === 1 || f === 4) {
        legOffset1 = 1; legOffset2 = 0; armOffset1 = 1; armOffset2 = -1; bodyBob = 0;
      } else {
        legOffset1 = -1; legOffset2 = 2; armOffset1 = -2; armOffset2 = 2; bodyBob = -2;
      }
    } else {
      bodyBob = 0;
      if (f === 0 || f === 3) {
        legOffset1 = f === 0 ? 3 : -2;
        legOffset2 = f === 0 ? -1 : 3;
        armOffset1 = f === 0 ? -2 : 3;
        armOffset2 = f === 0 ? 3 : -2;
        torsoLeanX = f === 0 ? 1 : -1;
      } else if (f === 1 || f === 4) {
        legOffset1 = 1; legOffset2 = 0; armOffset1 = 1; armOffset2 = -1; bodyBob = 1; torsoLeanX = 0;
      } else {
        legOffset1 = -1; legOffset2 = 1; armOffset1 = -1; armOffset2 = 1; bodyBob = -1; torsoLeanX = 0;
      }
    }
  }

  // 8.1 BODY FEINTS & CUTS: Sharp shoulder drop before accelerating into opposite channel
  else if (action === 'body_feint') {
    const f = frame % 3;
    if (f === 0) {
      bodyBob = 2;
      legOffset1 = 5;
      legOffset2 = -4;
      armOffset1 = -5;
      armOffset2 = 6;
      torsoLeanX = 4;
    } else if (f === 1) {
      bodyBob = -1;
      legOffset1 = -4;
      legOffset2 = 6;
      armOffset1 = 6;
      armOffset2 = -5;
      torsoLeanX = -3;
    } else {
      bodyBob = 0;
      legOffset1 = 2;
      legOffset2 = 0;
      armOffset1 = 2;
      armOffset2 = -2;
      torsoLeanX = 1;
    }
  }

  // 8.2 DRIVEN LACES STRIKE: Low head-down stance, plant foot firmly in turf, flat piercing follow-through
  else if (action === 'driven_laces_strike') {
    const f = frame % 3;
    if (f === 0) {
      legOffset1 = -7;
      legOffset2 = 0;
      armOffset1 = 7;
      armOffset2 = -6;
      bodyBob = 2;
      torsoLeanX = -3;
    } else if (f === 1) {
      legOffset1 = 9;
      legOffset2 = -4;
      armOffset1 = -7;
      armOffset2 = 6;
      bodyBob = -2;
      torsoLeanX = 4;
      kickingLegHigh = true;
    } else {
      legOffset1 = 9;
      legOffset2 = -5;
      armOffset1 = -6;
      armOffset2 = 5;
      bodyBob = -3;
      torsoLeanX = 2;
      kickingLegHigh = true;
    }
  }

  // 8.2 CURLING FINESSE / INSTEP STRIKE: Open-hip body angle curling around defenders
  else if (action === 'curling_finesse') {
    const f = frame % 3;
    if (f === 0) {
      legOffset1 = -5;
      legOffset2 = -1;
      armOffset1 = 6;
      armOffset2 = -6;
      bodyBob = 1;
      torsoLeanX = -3;
    } else if (f === 1) {
      legOffset1 = 8;
      legOffset2 = -3;
      armOffset1 = -6;
      armOffset2 = 6;
      bodyBob = -1;
      torsoLeanX = 3;
      kickingLegHigh = true;
    } else {
      legOffset1 = 7;
      legOffset2 = -4;
      armOffset1 = -5;
      armOffset2 = 5;
      bodyBob = -2;
      torsoLeanX = 2;
      kickingLegHigh = true;
    }
  }

  // 8.3 SIDEFOOT PRECISION PUSH: Clean opening of instep with controlled low follow-through
  else if (action === 'sidefoot_push') {
    const f = frame % 3;
    if (f === 0) {
      legOffset1 = -3;
      legOffset2 = 0;
      armOffset1 = 2;
      armOffset2 = -2;
      bodyBob = 0;
      torsoLeanX = 0;
    } else if (f === 1) {
      legOffset1 = 5;
      legOffset2 = -1;
      armOffset1 = -3;
      armOffset2 = 3;
      bodyBob = 0;
      torsoLeanX = 1;
    } else {
      legOffset1 = 5;
      legOffset2 = -1;
      armOffset1 = -2;
      armOffset2 = 2;
      bodyBob = 0;
      torsoLeanX = 1;
    }
  }

  // 8.3 TRIVELA (OUTSIDE-OF-THE-BOOT): Elegant curved swerve struck with exterior edge
  else if (action === 'trivela') {
    const f = frame % 3;
    if (f === 0) {
      legOffset1 = -5;
      legOffset2 = -1;
      armOffset1 = 5;
      armOffset2 = -5;
      bodyBob = 1;
      torsoLeanX = -3;
    } else if (f === 1) {
      legOffset1 = 8;
      legOffset2 = -3;
      armOffset1 = -7;
      armOffset2 = 6;
      bodyBob = 0;
      torsoLeanX = 3;
      kickingLegHigh = true;
    } else {
      legOffset1 = 7;
      legOffset2 = -4;
      armOffset1 = -5;
      armOffset2 = 5;
      bodyBob = -1;
      torsoLeanX = 2;
      kickingLegHigh = true;
    }
  }

  // 8.3 SCOOP / CHIP THROUGH-BALL: Low digging toe stroke lifting ball into space
  else if (action === 'scoop_chip') {
    const f = frame % 3;
    if (f === 0) {
      legOffset1 = -4;
      legOffset2 = 0;
      armOffset1 = 4;
      armOffset2 = -4;
      bodyBob = 1;
      torsoLeanX = -2;
    } else if (f === 1) {
      legOffset1 = 7;
      legOffset2 = -2;
      armOffset1 = -6;
      armOffset2 = 5;
      bodyBob = 0;
      torsoLeanX = 1;
      kickingLegHigh = true;
    } else {
      legOffset1 = 6;
      legOffset2 = -2;
      armOffset1 = -4;
      armOffset2 = 4;
      bodyBob = 0;
      torsoLeanX = 1;
      kickingLegHigh = true;
    }
  }

  // 8.3 BACKHEEL FLICK: Sneaky backward heel tap in stride
  else if (action === 'backheel_flick') {
    const f = frame % 3;
    if (f === 0) {
      legOffset1 = 3;
      legOffset2 = -2;
      armOffset1 = 2;
      armOffset2 = -2;
      bodyBob = 0;
      torsoLeanX = 1;
    } else if (f === 1) {
      legOffset1 = -6;
      legOffset2 = 2;
      armOffset1 = -4;
      armOffset2 = 4;
      bodyBob = 1;
      torsoLeanX = -2;
    } else {
      legOffset1 = -4;
      legOffset2 = 1;
      armOffset1 = -2;
      armOffset2 = 2;
      bodyBob = 0;
      torsoLeanX = -1;
    }
  }

  // 8.4 DEFENSIVE JOCKEY / BACKPEDAL: Crouched wide stance with quick shuffling footsteps
  else if (action === 'defensive_jockey') {
    const f = frame % 4;
    bodyBob = 2;
    if (f === 0) {
      legOffset1 = -2;
      legOffset2 = 2;
      armOffset1 = 3;
      armOffset2 = -3;
      torsoLeanX = -1;
    } else if (f === 1) {
      legOffset1 = 0;
      legOffset2 = 0;
      armOffset1 = 1;
      armOffset2 = -1;
      torsoLeanX = 0;
    } else if (f === 2) {
      legOffset1 = 2;
      legOffset2 = -2;
      armOffset1 = -3;
      armOffset2 = 3;
      torsoLeanX = 1;
    } else {
      legOffset1 = 0;
      legOffset2 = 0;
      armOffset1 = -1;
      armOffset2 = 1;
      torsoLeanX = 0;
    }
  }

  // 8.4 DECELERATION TURF SLIDE: Quick braking skid with heels dug in
  else if (action === 'deceleration_skid') {
    bodyBob = 2;
    legOffset1 = 4;
    legOffset2 = -3;
    armOffset1 = 5;
    armOffset2 = -5;
    torsoLeanX = -3;
  }

  // 1a. STANDING SHORT PASS - LOW POWER (< 60%): Quick nimble inside-foot tap / toe poke
  else if (action === 'standing_pass_low') {
    const f = frame % 3;
    if (f === 0) {
      // Rapid plant, subtle backswing without wasted motion
      legOffset1 = -2;
      legOffset2 = 0;
      armOffset1 = 1;
      armOffset2 = -1;
      bodyBob = 0;
      torsoLeanX = 0;
    } else if (f === 1) {
      // Crisp side-foot tap through ball center
      legOffset1 = 3;
      legOffset2 = -1;
      armOffset1 = -2;
      armOffset2 = 2;
      bodyBob = 0;
      torsoLeanX = 1;
    } else {
      // Clean short grounded follow-through
      legOffset1 = 4;
      legOffset2 = 0;
      armOffset1 = -2;
      armOffset2 = 2;
      bodyBob = 0;
      torsoLeanX = 0;
    }
  }

  // 1b. STANDING SHORT PASS - MID POWER (60% - 70%): Improved athletic side-foot drive
  else if (action === 'standing_pass_mid' || action === 'standing_pass' || action === 'passing') {
    const f = frame % 3;
    if (f === 0) {
      // Windup: solid firm plant foot on turf, kicking leg drawn back, ankle locked
      legOffset1 = -4;
      legOffset2 = 0;
      armOffset1 = 3;
      armOffset2 = -3;
      bodyBob = 1;
      torsoLeanX = -1;
    } else if (f === 1) {
      // Impact: sharp crisp inside-boot snap with hip drive
      legOffset1 = 5;
      legOffset2 = -1;
      armOffset1 = -4;
      armOffset2 = 3;
      bodyBob = 0;
      torsoLeanX = 2;
    } else {
      // Follow-through: guided ground-level extension pointing directly to teammate
      legOffset1 = 6;
      legOffset2 = -1;
      armOffset1 = -4;
      armOffset2 = 3;
      bodyBob = 0;
      torsoLeanX = 1;
    }
  }

  // 1c. STANDING SHORT PASS - HIGH POWER (71% - 90% & Overpower): Bullet driven laser pass
  else if (action === 'standing_pass_high') {
    const f = frame % 3;
    if (f === 0) {
      // Deep leg windup: deep backward coil, cocked knee, shoulders torqued
      legOffset1 = -6;
      legOffset2 = 1;
      armOffset1 = 5;
      armOffset2 = -5;
      bodyBob = 2;
      torsoLeanX = -2;
    } else if (f === 1) {
      // Bullet strike: violent laces/instep punch, torso lunging forward over ball
      legOffset1 = 7;
      legOffset2 = -3;
      armOffset1 = -6;
      armOffset2 = 5;
      bodyBob = -1;
      torsoLeanX = 3;
    } else {
      // Violent follow-through scraping turf with high kick recoil
      legOffset1 = 8;
      legOffset2 = -4;
      armOffset1 = -5;
      armOffset2 = 4;
      bodyBob = -2;
      torsoLeanX = 2;
      kickingLegHigh = true;
    }
  }

  // 1d. SPECIAL CURL PASS [Q] (Outside-of-the-boot Trivela curve pass)
  else if (action === 'special_curl_pass') {
    const f = frame % 3;
    if (f === 0) {
      // Hip twist windup: torso tilted away, outside boot cocked
      legOffset1 = -4;
      legOffset2 = -1;
      armOffset1 = 5;
      armOffset2 = -5;
      bodyBob = 1;
      torsoLeanX = -3;
    } else if (f === 1) {
      // Trivela slice: foot slices outward across ball, hips rotating
      legOffset1 = 6;
      legOffset2 = -3;
      armOffset1 = -6;
      armOffset2 = 5;
      bodyBob = 0;
      torsoLeanX = 2;
      kickingLegHigh = true;
    } else {
      // Elegant trivela follow-through across body
      legOffset1 = 7;
      legOffset2 = -3;
      armOffset1 = -5;
      armOffset2 = 4;
      bodyBob = -1;
      torsoLeanX = 1;
      kickingLegHigh = true;
    }
  }

  // 1e. CHIPPED LONG PASS [E] / DRIVEN PASS (Delicate lifted scoop or low punch)
  else if (action === 'chipped_long_pass' || action === 'knuckle_pass') {
    const f = frame % 3;
    if (f === 0) {
      // Graceful scoop plant: toe poised underneath ball, chest tilted back
      legOffset1 = -4;
      legOffset2 = 0;
      armOffset1 = 4;
      armOffset2 = -4;
      bodyBob = 1;
      torsoLeanX = -2;
    } else if (f === 1) {
      // Delicate dink scoop through undercarriage of ball
      legOffset1 = 6;
      legOffset2 = -2;
      armOffset1 = -5;
      armOffset2 = 5;
      bodyBob = 0;
      torsoLeanX = 1;
      kickingLegHigh = true;
    } else {
      // Soft lofted follow-through
      legOffset1 = 5;
      legOffset2 = -2;
      armOffset1 = -3;
      armOffset2 = 3;
      bodyBob = 0;
      torsoLeanX = 1;
      kickingLegHigh = true;
    }
  }

  // 2a. RUNNING PASS - LOW POWER (< 60%): Fast running poke / flick in full stride
  else if (action === 'running_pass_low') {
    const f = frame % 3;
    if (f === 0) {
      legOffset1 = -1;
      legOffset2 = 1;
      armOffset1 = 2;
      armOffset2 = -2;
      bodyBob = 0;
      torsoLeanX = 1;
    } else if (f === 1) {
      legOffset1 = 4;
      legOffset2 = -2;
      armOffset1 = -3;
      armOffset2 = 3;
      bodyBob = 0;
      torsoLeanX = 2;
    } else {
      legOffset1 = 3;
      legOffset2 = -3;
      armOffset1 = -2;
      armOffset2 = 2;
      bodyBob = -1;
      torsoLeanX = 1;
    }
  }

  // 2b. RUNNING PASS - MID POWER (60% - 70%): Fluid one-two push pass in full stride
  else if (action === 'running_pass_mid' || action === 'running_pass') {
    const f = frame % 3;
    if (f === 0) {
      legOffset1 = -3;
      legOffset2 = 2;
      armOffset1 = 4;
      armOffset2 = -4;
      bodyBob = -1;
      torsoLeanX = 2;
    } else if (f === 1) {
      legOffset1 = 6;
      legOffset2 = -3;
      armOffset1 = -5;
      armOffset2 = 4;
      bodyBob = 0;
      torsoLeanX = 3;
    } else {
      legOffset1 = 5;
      legOffset2 = -4;
      armOffset1 = -3;
      armOffset2 = 3;
      bodyBob = -2;
      torsoLeanX = 2;
    }
  }

  // 2c. RUNNING PASS - HIGH POWER (71% - 90% & Overpower): Full stride driven bullet pass
  else if (action === 'running_pass_high') {
    const f = frame % 3;
    if (f === 0) {
      legOffset1 = -5;
      legOffset2 = 3;
      armOffset1 = 6;
      armOffset2 = -5;
      bodyBob = -1;
      torsoLeanX = 2;
    } else if (f === 1) {
      legOffset1 = 8;
      legOffset2 = -4;
      armOffset1 = -6;
      armOffset2 = 5;
      bodyBob = -2;
      torsoLeanX = 4;
    } else {
      legOffset1 = 8;
      legOffset2 = -5;
      armOffset1 = -4;
      armOffset2 = 4;
      bodyBob = -3;
      torsoLeanX = 3;
      kickingLegHigh = true;
    }
  }

  // 3a. STANDING LONG PASS - LOW POWER (< 60%): Driven ground punch through-ball
  else if (action === 'standing_long_pass_low') {
    const f = frame % 3;
    if (f === 0) {
      legOffset1 = -3;
      legOffset2 = 0;
      armOffset1 = 3;
      armOffset2 = -3;
      bodyBob = 0;
      torsoLeanX = 0;
    } else if (f === 1) {
      legOffset1 = 5;
      legOffset2 = -1;
      armOffset1 = -4;
      armOffset2 = 3;
      bodyBob = 0;
      torsoLeanX = 1;
    } else {
      legOffset1 = 5;
      legOffset2 = -1;
      armOffset1 = -3;
      armOffset2 = 3;
      bodyBob = 0;
      torsoLeanX = 1;
    }
  }

  // 3b. STANDING LONG PASS - MID POWER (60% - 70%): Arced lofted long ball
  else if (action === 'standing_long_pass_mid' || action === 'standing_long_pass') {
    const f = frame % 3;
    if (f === 0) {
      legOffset1 = -5;
      legOffset2 = -1;
      armOffset1 = 5;
      armOffset2 = -5;
      bodyBob = 1;
      torsoLeanX = -2;
    } else if (f === 1) {
      legOffset1 = 6;
      legOffset2 = -2;
      armOffset1 = -4;
      armOffset2 = 4;
      bodyBob = 0;
      torsoLeanX = -1;
    } else {
      legOffset1 = 7;
      legOffset2 = -2;
      armOffset1 = -5;
      armOffset2 = 5;
      bodyBob = -1;
      torsoLeanX = 0;
      kickingLegHigh = true;
    }
  }

  // 3c. STANDING LONG PASS - HIGH POWER (71% - 90% & Overpower): Booming catapult clearance
  else if (action === 'standing_long_pass_high') {
    const f = frame % 3;
    if (f === 0) {
      legOffset1 = -7;
      legOffset2 = 0;
      armOffset1 = 7;
      armOffset2 = -6;
      bodyBob = 2;
      torsoLeanX = -4;
    } else if (f === 1) {
      legOffset1 = 9;
      legOffset2 = -3;
      armOffset1 = -6;
      armOffset2 = 5;
      bodyBob = -1;
      torsoLeanX = 1;
    } else {
      legOffset1 = 9;
      legOffset2 = -4;
      armOffset1 = -6;
      armOffset2 = 6;
      bodyBob = -3;
      torsoLeanX = 0;
      kickingLegHigh = true;
    }
  }

  // 4a. RUNNING LONG PASS - LOW POWER (< 60%): Quick running ground punch
  else if (action === 'running_long_pass_low') {
    const f = frame % 3;
    if (f === 0) {
      legOffset1 = -2;
      legOffset2 = 2;
      armOffset1 = 3;
      armOffset2 = -3;
      bodyBob = 0;
      torsoLeanX = 1;
    } else if (f === 1) {
      legOffset1 = 5;
      legOffset2 = -2;
      armOffset1 = -4;
      armOffset2 = 4;
      bodyBob = 0;
      torsoLeanX = 2;
    } else {
      legOffset1 = 5;
      legOffset2 = -3;
      armOffset1 = -3;
      armOffset2 = 3;
      bodyBob = -1;
      torsoLeanX = 1;
    }
  }

  // 4b. RUNNING LONG PASS - MID POWER (60% - 70%): Driven through-ball sliced in motion
  else if (action === 'running_long_pass_mid' || action === 'running_long_pass') {
    const f = frame % 3;
    if (f === 0) {
      legOffset1 = -4;
      legOffset2 = 3;
      armOffset1 = 5;
      armOffset2 = -4;
      bodyBob = -1;
      torsoLeanX = 2;
    } else if (f === 1) {
      legOffset1 = 7;
      legOffset2 = -3;
      armOffset1 = -5;
      armOffset2 = 5;
      bodyBob = -1;
      torsoLeanX = 3;
    } else {
      legOffset1 = 8;
      legOffset2 = -5;
      armOffset1 = -4;
      armOffset2 = 4;
      bodyBob = -3;
      torsoLeanX = 2;
      kickingLegHigh = true;
    }
  }

  // 4c. RUNNING LONG PASS - HIGH POWER (71% - 90% & Overpower): Full flight airborne catapult
  else if (action === 'running_long_pass_high') {
    const f = frame % 3;
    if (f === 0) {
      legOffset1 = -6;
      legOffset2 = 4;
      armOffset1 = 7;
      armOffset2 = -6;
      bodyBob = -2;
      torsoLeanX = 2;
    } else if (f === 1) {
      legOffset1 = 9;
      legOffset2 = -4;
      armOffset1 = -7;
      armOffset2 = 6;
      bodyBob = -2;
      torsoLeanX = 4;
    } else {
      legOffset1 = 10;
      legOffset2 = -6;
      armOffset1 = -5;
      armOffset2 = 5;
      bodyBob = -4;
      torsoLeanX = 3;
      kickingLegHigh = true;
    }
  }

  // 5a. STANDING SHOOTING - LOW POWER (< 60%): Placed side-foot placement shot to corner
  else if (action === 'standing_shot_low') {
    const f = frame % 3;
    if (f === 0) {
      legOffset1 = -3;
      legOffset2 = 0;
      armOffset1 = 3;
      armOffset2 = -3;
      bodyBob = 0;
      torsoLeanX = -1;
    } else if (f === 1) {
      legOffset1 = 5;
      legOffset2 = -2;
      armOffset1 = -4;
      armOffset2 = 4;
      bodyBob = 0;
      torsoLeanX = 1;
    } else {
      legOffset1 = 5;
      legOffset2 = -2;
      armOffset1 = -3;
      armOffset2 = 3;
      bodyBob = 0;
      torsoLeanX = 1;
    }
  }

  // 5b. STANDING SHOOTING - MID POWER (60% - 70%): Clean controlled laces drive
  else if (action === 'standing_shot_mid' || action === 'standing_shot' || action === 'shooting') {
    const f = frame % 3;
    if (f === 0) {
      legOffset1 = -5;
      legOffset2 = -1;
      armOffset1 = 5;
      armOffset2 = -5;
      bodyBob = 1;
      torsoLeanX = -2;
    } else if (f === 1) {
      legOffset1 = 7;
      legOffset2 = -3;
      armOffset1 = -5;
      armOffset2 = 5;
      bodyBob = -1;
      torsoLeanX = 2;
    } else {
      legOffset1 = 8;
      legOffset2 = -4;
      armOffset1 = -5;
      armOffset2 = 5;
      bodyBob = -2;
      torsoLeanX = 1;
      kickingLegHigh = true;
    }
  }

  // 5c. STANDING SHOOTING - HIGH POWER (71% - 90% & Overpower): Thunderous full laces rocket
  else if (action === 'standing_shot_high') {
    const f = frame % 3;
    if (f === 0) {
      legOffset1 = -8;
      legOffset2 = 0;
      armOffset1 = 7;
      armOffset2 = -7;
      bodyBob = 2;
      torsoLeanX = -4;
    } else if (f === 1) {
      legOffset1 = 9;
      legOffset2 = -4;
      armOffset1 = -7;
      armOffset2 = 6;
      bodyBob = -2;
      torsoLeanX = 3;
    } else {
      legOffset1 = 10;
      legOffset2 = -5;
      armOffset1 = -6;
      armOffset2 = 6;
      bodyBob = -4;
      torsoLeanX = 2;
      kickingLegHigh = true;
    }
  }

  // 6a. RUNNING SHOOTING - LOW POWER (< 60%): Low placed strike in stride
  else if (action === 'running_shot_low') {
    const f = frame % 3;
    if (f === 0) {
      legOffset1 = -3;
      legOffset2 = 2;
      armOffset1 = 3;
      armOffset2 = -3;
      bodyBob = -1;
      torsoLeanX = 2;
    } else if (f === 1) {
      legOffset1 = 6;
      legOffset2 = -2;
      armOffset1 = -4;
      armOffset2 = 4;
      bodyBob = -1;
      torsoLeanX = 2;
    } else {
      legOffset1 = 5;
      legOffset2 = -3;
      armOffset1 = -3;
      armOffset2 = 3;
      bodyBob = -2;
      torsoLeanX = 2;
    }
  }

  // 6b. RUNNING SHOOTING - MID POWER (60% - 70%): Laces strike in full stride
  else if (action === 'running_shot_mid' || action === 'running_shot') {
    const f = frame % 3;
    if (f === 0) {
      legOffset1 = -5;
      legOffset2 = 3;
      armOffset1 = 5;
      armOffset2 = -5;
      bodyBob = -1;
      torsoLeanX = 3;
    } else if (f === 1) {
      legOffset1 = 8;
      legOffset2 = -3;
      armOffset1 = -6;
      armOffset2 = 5;
      bodyBob = -2;
      torsoLeanX = 4;
    } else {
      legOffset1 = 7;
      legOffset2 = -5;
      armOffset1 = -4;
      armOffset2 = 4;
      bodyBob = -4;
      torsoLeanX = 3;
      kickingLegHigh = true;
    }
  }

  // 6c. RUNNING SHOOTING - HIGH POWER (71% - 90% & Overpower): Airborne running thunderbolt
  else if (action === 'running_shot_high') {
    const f = frame % 3;
    if (f === 0) {
      legOffset1 = -7;
      legOffset2 = 4;
      armOffset1 = 7;
      armOffset2 = -6;
      bodyBob = -2;
      torsoLeanX = 3;
    } else if (f === 1) {
      legOffset1 = 10;
      legOffset2 = -4;
      armOffset1 = -7;
      armOffset2 = 6;
      bodyBob = -3;
      torsoLeanX = 5;
    } else {
      legOffset1 = 9;
      legOffset2 = -6;
      armOffset1 = -5;
      armOffset2 = 5;
      bodyBob = -5;
      torsoLeanX = 3;
      kickingLegHigh = true;
    }
  }

  // 6d. SPECIAL BANANA CURL / TRIVELA SHOT [Q]
  else if (action === 'special_curl_shot') {
    const f = frame % 3;
    if (f === 0) {
      // Extreme banana coil: 45° lateral torso tilt, arms spread like wings for angular torque
      legOffset1 = -6;
      legOffset2 = -2;
      armOffset1 = 7;
      armOffset2 = -7;
      bodyBob = 2;
      torsoLeanX = -4;
    } else if (f === 1) {
      // Trivela / banana whip: Outside-of-the-boot diagonal slice across ball center
      legOffset1 = 9;
      legOffset2 = -4;
      armOffset1 = -7;
      armOffset2 = 6;
      bodyBob = -1;
      torsoLeanX = 4;
      kickingLegHigh = true;
    } else {
      // Curled high follow-through swept across the body
      legOffset1 = 8;
      legOffset2 = -5;
      armOffset1 = -5;
      armOffset2 = 5;
      bodyBob = -3;
      torsoLeanX = 2;
      kickingLegHigh = true;
    }
  }

  // 6e. CHIP SHOT [E] / DELICATE DINK SCOOP
  else if (action === 'chip_shot' || action === 'knuckle_shot') {
    const f = frame % 3;
    if (f === 0) {
      // Poised scoop plant: toe slides cleanly under sphere, torso arched back for elevation
      legOffset1 = -4;
      legOffset2 = 0;
      armOffset1 = 5;
      armOffset2 = -5;
      bodyBob = 1;
      torsoLeanX = -3;
    } else if (f === 1) {
      // Delicate dink scoop: toe scoops under ball creating soft backspin
      legOffset1 = 7;
      legOffset2 = -2;
      armOffset1 = -6;
      armOffset2 = 5;
      bodyBob = -1;
      torsoLeanX = 2;
      kickingLegHigh = true;
    } else {
      // Graceful high follow-through with upright chest
      legOffset1 = 6;
      legOffset2 = -2;
      armOffset1 = -4;
      armOffset2 = 3;
      bodyBob = -2;
      torsoLeanX = 1;
      kickingLegHigh = true;
    }
  }

  // 6f. CHIPPED CROSS [E] / HIGH FLOATING AERIAL CROSS
  else if (action === 'chipped_cross') {
    const f = frame % 3;
    if (f === 0) {
      // Deep arching approach to get under ball
      legOffset1 = -5;
      legOffset2 = -1;
      armOffset1 = 6;
      armOffset2 = -6;
      bodyBob = 2;
      torsoLeanX = -4;
    } else if (f === 1) {
      // Sweeping high lofted contact
      legOffset1 = 8;
      legOffset2 = -3;
      armOffset1 = -7;
      armOffset2 = 6;
      bodyBob = -1;
      torsoLeanX = 3;
      kickingLegHigh = true;
    } else {
      // Maximum hang-time follow-through
      legOffset1 = 7;
      legOffset2 = -3;
      armOffset1 = -5;
      armOffset2 = 4;
      bodyBob = -2;
      torsoLeanX = 2;
      kickingLegHigh = true;
    }
  }

  // 7a. STANDING CROSS - LOW POWER (< 60%): Clipped delicate chip / dink cross
  else if (action === 'standing_cross_low') {
    const f = frame % 3;
    if (f === 0) {
      legOffset1 = -2;
      legOffset2 = 0;
      armOffset1 = 3;
      armOffset2 = -3;
      bodyBob = 0;
      torsoLeanX = -1;
    } else if (f === 1) {
      legOffset1 = 4;
      legOffset2 = -1;
      armOffset1 = -3;
      armOffset2 = 3;
      bodyBob = 0;
      torsoLeanX = 0;
    } else {
      legOffset1 = 5;
      legOffset2 = -1;
      armOffset1 = -3;
      armOffset2 = 3;
      bodyBob = 0;
      torsoLeanX = 0;
      kickingLegHigh = true;
    }
  }

  // 7b. STANDING CROSS - MID POWER (60% - 70%): Whipped curling delivery from wing
  else if (action === 'standing_cross_mid' || action === 'standing_cross' || action === 'crossing') {
    const f = frame % 3;
    if (f === 0) {
      legOffset1 = -4;
      legOffset2 = 0;
      armOffset1 = 5;
      armOffset2 = -5;
      bodyBob = 1;
      torsoLeanX = -2;
    } else if (f === 1) {
      legOffset1 = 5;
      legOffset2 = -2;
      armOffset1 = -4;
      armOffset2 = 4;
      bodyBob = -1;
      torsoLeanX = 1;
    } else {
      legOffset1 = 6;
      legOffset2 = -1;
      armOffset1 = -4;
      armOffset2 = 4;
      bodyBob = 0;
      torsoLeanX = 0;
      kickingLegHigh = true;
    }
  }

  // 7c. STANDING CROSS - HIGH POWER (71% - 90% & Overpower): Whipped thunder-cross
  else if (action === 'standing_cross_high') {
    const f = frame % 3;
    if (f === 0) {
      legOffset1 = -6;
      legOffset2 = 0;
      armOffset1 = 6;
      armOffset2 = -6;
      bodyBob = 1;
      torsoLeanX = -3;
    } else if (f === 1) {
      legOffset1 = 8;
      legOffset2 = -3;
      armOffset1 = -6;
      armOffset2 = 5;
      bodyBob = -2;
      torsoLeanX = 3;
    } else {
      legOffset1 = 8;
      legOffset2 = -3;
      armOffset1 = -5;
      armOffset2 = 5;
      bodyBob = -3;
      torsoLeanX = 1;
      kickingLegHigh = true;
    }
  }

  // 8a. RUNNING CROSS - LOW POWER (< 60%): Chipped cross on the run
  else if (action === 'running_cross_low') {
    const f = frame % 3;
    if (f === 0) {
      legOffset1 = -2;
      legOffset2 = 2;
      armOffset1 = 3;
      armOffset2 = -3;
      bodyBob = -1;
      torsoLeanX = 1;
    } else if (f === 1) {
      legOffset1 = 5;
      legOffset2 = -2;
      armOffset1 = -4;
      armOffset2 = 3;
      bodyBob = 0;
      torsoLeanX = 2;
    } else {
      legOffset1 = 5;
      legOffset2 = -3;
      armOffset1 = -3;
      armOffset2 = 3;
      bodyBob = -1;
      torsoLeanX = 1;
      kickingLegHigh = true;
    }
  }

  // 8b. RUNNING CROSS - MID POWER (60% - 70%): Winger cross in full motion
  else if (action === 'running_cross_mid' || action === 'running_cross') {
    const f = frame % 3;
    if (f === 0) {
      legOffset1 = -4;
      legOffset2 = 2;
      armOffset1 = 5;
      armOffset2 = -4;
      bodyBob = -1;
      torsoLeanX = 2;
    } else if (f === 1) {
      legOffset1 = 6;
      legOffset2 = -3;
      armOffset1 = -5;
      armOffset2 = 4;
      bodyBob = -1;
      torsoLeanX = 3;
    } else {
      legOffset1 = 6;
      legOffset2 = -4;
      armOffset1 = -3;
      armOffset2 = 3;
      bodyBob = -2;
      torsoLeanX = 2;
      kickingLegHigh = true;
    }
  }

  // 8c. RUNNING CROSS - HIGH POWER (71% - 90% & Overpower): Whipped laser thunder-delivery
  else if (action === 'running_cross_high') {
    const f = frame % 3;
    if (f === 0) {
      legOffset1 = -6;
      legOffset2 = 3;
      armOffset1 = 7;
      armOffset2 = -5;
      bodyBob = -2;
      torsoLeanX = 3;
    } else if (f === 1) {
      legOffset1 = 9;
      legOffset2 = -4;
      armOffset1 = -7;
      armOffset2 = 5;
      bodyBob = -3;
      torsoLeanX = 4;
    } else {
      legOffset1 = 9;
      legOffset2 = -5;
      armOffset1 = -4;
      armOffset2 = 4;
      bodyBob = -4;
      torsoLeanX = 2;
      kickingLegHigh = true;
    }
  }

  // HEADING: Dynamic leaping header with arched back and forehead thrust!
  else if (action === 'heading') {
    const f = frame % 4;
    isMidAirHeader = true;
    if (f === 0) {
      // Jump launch
      bodyBob = -4;
      legOffset1 = -1;
      legOffset2 = -1;
      armOffset1 = -3;
      armOffset2 = -3;
    } else if (f === 1) {
      // Airborne peak: arched back, arms high
      bodyBob = -10;
      legOffset1 = -2;
      legOffset2 = -2;
      armOffset1 = -6;
      armOffset2 = -6;
      torsoLeanX = -1; // Torso arched back
    } else if (f === 2) {
      // Forehead thrust snap!
      bodyBob = -9;
      legOffset1 = -1;
      legOffset2 = -1;
      armOffset1 = 3;
      armOffset2 = 3;
      torsoLeanX = 2; // Head snapped forward
    } else {
      // Landing descent
      bodyBob = -3;
      legOffset1 = 0;
      legOffset2 = 0;
      armOffset1 = 0;
      armOffset2 = 0;
    }
  }

  // STANDING TACKLE: Low lunging block tackle with extended hooking leg (3 Frames)
  // Phase 8.4: Lightweight procedural improvements for standing tackle
  else if (action === 'standing_tackle') {
    isLowBlockTackle = true;
    const f = frame % 3;
    if (f === 0) {
      // Entry lunge: coil low, plant foot digging in
      bodyBob = 3;
      legOffset1 = 7;
      legOffset2 = -3;
      armOffset1 = -5;
      armOffset2 = 5;
      torsoLeanX = 3;
    } else if (f === 1) {
      // Full extended lunging tackle reach with front foot hooking inward around the ball!
      bodyBob = 5;
      legOffset1 = 12; // Pronounced extended hooking leg reach
      legOffset2 = -4;
      armOffset1 = -8;
      armOffset2 = 7;
      torsoLeanX = 5;
    } else {
      // Firm grounded block clamp
      bodyBob = 4;
      legOffset1 = 8;
      legOffset2 = -3;
      armOffset1 = -6;
      armOffset2 = 5;
      torsoLeanX = 3;
    }
  }

  // CLEARING: Massive high-boot defensive clearance into the sky!
  else if (action === 'clearing') {
    const f = frame % 3;
    if (f === 0) {
      // Huge windup coil
      legOffset1 = -6;
      legOffset2 = 1;
      armOffset1 = 6;
      armOffset2 = -6;
      bodyBob = 2;
      torsoLeanX = -3;
    } else if (f === 1) {
      // Explosive upward blast through the ball
      legOffset1 = 8;
      legOffset2 = -3;
      armOffset1 = -6;
      armOffset2 = 6;
      bodyBob = -2;
      torsoLeanX = 1;
      kickingLegHigh = true;
    } else {
      // Sky-high follow-through with player airborne off turf!
      legOffset1 = 9;
      legOffset2 = -5;
      armOffset1 = -5;
      armOffset2 = 5;
      bodyBob = -4;
      torsoLeanX = 2;
      kickingLegHigh = true;
    }
  }

  // PUSHING FOUL: Aggressive two-handed forward shove into opponent!
  else if (action === 'pushing_foul') {
    const f = frame % 3;
    if (f === 0) {
      // Coil forward with elbows back
      legOffset1 = 2;
      legOffset2 = -2;
      armOffset1 = 3;
      armOffset2 = 3;
      bodyBob = 1;
      torsoLeanX = 1;
    } else if (f === 1) {
      // Emphatic forward shove with both hands thrusting forward!
      legOffset1 = 5;
      legOffset2 = -3;
      armOffset1 = 9;
      armOffset2 = 9;
      bodyBob = 0;
      torsoLeanX = 5;
    } else {
      // Follow-through recovery
      legOffset1 = 3;
      legOffset2 = -2;
      armOffset1 = 6;
      armOffset2 = 6;
      bodyBob = 0;
      torsoLeanX = 3;
    }
  }

  // STEP-OVERS [E]: Fluid circular leg sweeps over the ball with dynamic hip feints
  else if (action === 'step_overs') {
    const f = frame % 4;
    bodyBob = -2;
    if (f === 0) {
      // Right leg sweeping outward around the ball, arms swaying left
      legOffset1 = 6;
      legOffset2 = -2;
      armOffset1 = -5;
      armOffset2 = 4;
      torsoLeanX = 3;
      kickingLegHigh = true;
    } else if (f === 1) {
      // Right leg plants wide, head drops right to bait the tackle
      legOffset1 = 3;
      legOffset2 = 0;
      armOffset1 = -2;
      armOffset2 = 2;
      torsoLeanX = 4;
      bodyBob = 0;
    } else if (f === 2) {
      // Left leg sweeping outward around the ball, arms swaying right
      legOffset1 = -2;
      legOffset2 = 6;
      armOffset1 = 4;
      armOffset2 = -5;
      torsoLeanX = -3;
      kickingLegHigh = true;
    } else {
      // Left leg plants wide, head drops left ready for decisive cut
      legOffset1 = 0;
      legOffset2 = 3;
      armOffset1 = 2;
      armOffset2 = -2;
      torsoLeanX = -4;
      bodyBob = 0;
    }
  }

  // NUTMEG DASH: 180° hip swivel, ball flick through legs & explosive low sprint burst
  else if (action === 'nutmeg_dash') {
    const f = frame % 4;
    if (f === 0) {
      // Turn and flick ball through defender legs
      legOffset1 = 5;
      legOffset2 = -3;
      armOffset1 = 4;
      armOffset2 = -4;
      bodyBob = 1;
      torsoLeanX = 2;
    } else if (f === 1) {
      // Low explosive aerodynamic sprint burst past flat-footed defender
      legOffset1 = 8;
      legOffset2 = -5;
      armOffset1 = -6;
      armOffset2 = 6;
      bodyBob = -3;
      torsoLeanX = 4;
    } else if (f === 2) {
      // Full extension sprint stride
      legOffset1 = -4;
      legOffset2 = 6;
      armOffset1 = 5;
      armOffset2 = -5;
      bodyBob = -1;
      torsoLeanX = 3;
    } else {
      // Re-gathering stride in full speed
      legOffset1 = 5;
      legOffset2 = -3;
      armOffset1 = -4;
      armOffset2 = 4;
      bodyBob = 0;
      torsoLeanX = 2;
    }
  }

  // SHIELDING [Q]: Solid wide athletic shielding stance facing away with back to rival
  // "make the Q ball shielding more visible"
  else if (action === 'shielding') {
    const f = frame % 3;
    if (f === 0) {
      // Anchored athletic stance: low center of gravity, arms wide
      bodyBob = 3;
      legOffset1 = 5;
      legOffset2 = -4;
      armOffset1 = 8;
      armOffset2 = -7;
      torsoLeanX = -3;
    } else if (f === 1) {
      // Firm body barrier: shoulder dropped into challenge, stiff-arm barring opponent
      bodyBob = 4;
      legOffset1 = 6;
      legOffset2 = -5;
      armOffset1 = 9;
      armOffset2 = -8;
      torsoLeanX = -4;
    } else {
      // Rooted protector stance: legs wide clamping space over ball
      bodyBob = 3;
      legOffset1 = 5;
      legOffset2 = -5;
      armOffset1 = 8;
      armOffset2 = -7;
      torsoLeanX = -3;
    }
  }

  // CRUYFF TURN: Fake kick into sudden inside chop behind standing leg
  else if (action === 'cruyff_turn') {
    const f = frame % 3;
    if (f === 0) {
      legOffset1 = 5;
      legOffset2 = -3;
      armOffset1 = 4;
      torsoLeanX = 2;
    } else if (f === 1) {
      legOffset1 = -4;
      legOffset2 = 4;
      bodyBob = -2;
      torsoLeanX = -2;
    } else {
      legOffset1 = -2;
      legOffset2 = 3;
      torsoLeanX = -1;
    }
  }

  // RAINBOW FLICK: Heel lift, arched flick into sprint
  else if (action === 'rainbow_flick') {
    const f = frame % 4;
    bodyBob = f === 1 ? -6 : -2;
    legOffset1 = f === 1 ? -6 : 3;
    legOffset2 = f === 1 ? 5 : -2;
    armOffset1 = 5;
    armOffset2 = -5;
    torsoLeanX = 2;
  }

  // SHIRT PULL: Arm outstretched grabbing opponent jersey
  else if (action === 'shirt_pull') {
    bodyBob = 1;
    legOffset1 = -2;
    legOffset2 = 3;
    armOffset1 = 6;
    armOffset2 = -2;
    torsoLeanX = -2;
  }

  // VOLLEY: Horizontal hip-high driven side volley
  else if (action === 'volley') {
    bodyBob = -3;
    legOffset1 = 7;
    legOffset2 = -3;
    armOffset1 = -5;
    armOffset2 = 5;
    torsoLeanX = -2;
    kickingLegHigh = true;
  }

  // SOMBRERO: Fluid scoop and explosive acceleration follow-through
  else if (action === 'sombrero') {
    const f = frame % 3;
    bodyBob = f === 1 ? -4 : -2;
    legOffset1 = 6;
    legOffset2 = 1;
    armOffset1 = 4;
    armOffset2 = -4;
    torsoLeanX = 2;
  }

  // GINGA JUGGLE: Brazilian samba rhythm, Capoeira ginga sway & high aerial knee pops
  else if (action === 'ginga_juggle') {
    const f = frame % 4;
    if (f === 0) {
      // Deep swaying base stance (Ginga sway)
      bodyBob = 2;
      legOffset1 = 4;
      legOffset2 = -4;
      armOffset1 = 5;
      armOffset2 = -5;
      torsoLeanX = -3;
    } else if (f === 1) {
      // High knee flick / thigh pop lifting the ball!
      bodyBob = -4;
      legOffset1 = 7;
      legOffset2 = -2;
      armOffset1 = -4;
      armOffset2 = 4;
      torsoLeanX = 1;
      kickingLegHigh = true;
    } else if (f === 2) {
      // Instep pop / toe stall cushioning ball at chest height
      bodyBob = -2;
      legOffset1 = 6;
      legOffset2 = -1;
      armOffset1 = 3;
      armOffset2 = -3;
      torsoLeanX = 2;
      kickingLegHigh = true;
    } else {
      // Rhythm arm flourish & sway
      bodyBob = 0;
      legOffset1 = -3;
      legOffset2 = 4;
      armOffset1 = -4;
      armOffset2 = 4;
      torsoLeanX = 0;
    }
  }

  // ROULETTE (MARSEILLE 360° SPIN): Sole drag, 180° back pivot, hook exit!
  else if (action === 'roulette') {
    const f = frame % 4;
    if (f === 0) {
      legOffset1 = 4;
      legOffset2 = -3;
      armOffset1 = 4;
      armOffset2 = -4;
      bodyBob = 0;
      torsoLeanX = -1;
    } else if (f === 1) {
      legOffset1 = -2;
      legOffset2 = 4;
      armOffset1 = -3;
      armOffset2 = 3;
      bodyBob = -1;
      torsoLeanX = 0;
    } else if (f === 2) {
      legOffset1 = 5;
      legOffset2 = -2;
      armOffset1 = 4;
      armOffset2 = -3;
      bodyBob = -1;
      torsoLeanX = 2;
    } else {
      legOffset1 = 4;
      legOffset2 = -4;
      armOffset1 = -4;
      armOffset2 = 4;
      bodyBob = 0;
      torsoLeanX = 3;
    }
  }

  const yBase = groundY + bodyBob;

  // ----------------------------------------------------
  // LEGS, SOCKS & BOOTS RENDERING (16-Bit Detailed Arcade)
  // ----------------------------------------------------
  if (isFacingSide) {
    const flip = dirX < 0;
    ctx.save();
    if (flip) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }

    // Back leg
    r(cx - 3 + legOffset2, yBase - 9, 3, 5, skin); // Thigh
    p(cx - 3 + legOffset2, yBase - 9, skinShadow); // Hamstring shadow
    r(cx - 3 + legOffset2, yBase - 4, 3, 4, socksColor); // Shin
    p(cx - 2 + legOffset2, yBase - 3, sockHigh); // Shin guard vertical ridge
    r(cx - 3 + legOffset2, yBase - 4, 3, 1, sockWhite); // Turnover cuff
    p(cx - 3 + legOffset2, yBase - 3, sockRib);
    // Boot (Classic leather with white stripes & red tongue)
    r(cx - 4 + legOffset2, yBase, 4, 3, bootColor);
    p(cx - 3 + legOffset2, yBase + 1, '#ffffff'); // Boot stripe 1
    p(cx - 2 + legOffset2, yBase + 1, '#ffffff'); // Boot stripe 2
    p(cx - 4 + legOffset2, yBase, bootAccent); // Red tongue fold-over
    r(cx - 3 + legOffset2, yBase + 3, 2, 1, bootStuds); // Cleat studs

    // Front leg
    const frontY = kickingLegHigh ? yBase - 5 : yBase;
    r(cx + legOffset1, frontY - 9, 3, 5, skin); // Thigh
    p(cx + 1 + legOffset1, frontY - 8, skinHighlight); // Quad muscle highlight
    r(cx + legOffset1, frontY - 4, 3, 4, socksColor); // Shin sock
    p(cx + 1 + legOffset1, frontY - 3, sockHigh); // Shin guard 3D contour
    r(cx + legOffset1, frontY - 4, 3, 1, sockWhite); // White sock turnover
    p(cx + legOffset1, frontY - 3, sockRib);
    // Front Boot
    r(cx - 1 + legOffset1, frontY, 5, 3, bootColor);
    p(cx + legOffset1, frontY, bootAccent); // Red fold-over tongue
    p(cx + 1 + legOffset1, frontY + 1, '#ffffff'); // Adidas-style stripes
    p(cx + 2 + legOffset1, frontY + 1, '#ffffff');
    p(cx + legOffset1, frontY + 2, bootLace);
    r(cx + legOffset1, frontY + 3, 3, 1, bootStuds); // Ground cleat studs

    // Phase 8.4: Standing tackle turf clipping sparks
    if (isLowBlockTackle && (frame % 3) === 1) {
      p(cx + legOffset1 + 4, frontY + 3, '#22c55e');
      p(cx + legOffset1 + 5, frontY + 2, '#15803d');
    }

    // Phase 8.1: Unique Tier 100+ Stat Break Boot Gleam
    if (dribbleTier === 'unique' && (action === 'dribbling' || action === 'close_control' || action === 'step_overs')) {
      p(cx + 1 + legOffset1, frontY + 1, '#38bdf8');
      p(cx + 2 + legOffset1, frontY, '#facc15');
    }

    ctx.restore();
  } else {
    // Left Leg
    r(cx - 4, yBase - 9 + legOffset1, 3, 5, skin);
    p(cx - 3, yBase - 8 + legOffset1, skinHighlight); // Thigh muscle highlight
    r(cx - 4, yBase - 4 + legOffset1, 3, 4, socksColor);
    p(cx - 3, yBase - 3 + legOffset1, sockHigh); // Shin guard vertical highlight
    r(cx - 4, yBase - 4 + legOffset1, 3, 1, sockWhite); // Folded sock cuff
    p(cx - 4, yBase - 3 + legOffset1, sockRib);
    // Left Boot
    r(cx - 5, yBase + legOffset1, 4, 3, bootColor);
    p(cx - 4, yBase + legOffset1, bootAccent); // Red tongue
    p(cx - 3, yBase + 1 + legOffset1, '#ffffff'); // White stripe flash
    p(cx - 2, yBase + legOffset1, bootLace);
    r(cx - 4, yBase + 3 + legOffset1, 2, 1, bootStuds);

    // Right Leg
    const rLegY = kickingLegHigh ? yBase - 5 : yBase;
    r(cx + 1, rLegY - 9 + legOffset2, 3, 5, skin);
    p(cx + 2, rLegY - 8 + legOffset2, skinHighlight);
    r(cx + 1, rLegY - 4 + legOffset2, 3, 4, socksColor);
    p(cx + 2, rLegY - 3 + legOffset2, sockHigh); // Shin guard vertical highlight
    r(cx + 1, rLegY - 4 + legOffset2, 3, 1, sockWhite); // Folded sock cuff
    p(cx + 1, rLegY - 3 + legOffset2, sockRib);
    // Right Boot
    r(cx + 1, rLegY + legOffset2, 4, 3, bootColor);
    p(cx + 2, rLegY + legOffset2, bootAccent); // Red tongue
    p(cx + 3, rLegY + 1 + legOffset2, '#ffffff'); // White stripe flash
    p(cx + 3, rLegY + legOffset2, bootLace);
    r(cx + 2, rLegY + 3 + legOffset2, 2, 1, bootStuds);
  }

  // ----------------------------------------------------
  // SHORTS (Athletic cut with waistband, trim & leg hem)
  // ----------------------------------------------------
  const shortsY = yBase - 15;
  r(cx - 6, shortsY, 12, 6, shortsColor);
  // Waistband highlight
  r(cx - 6, shortsY, 12, 1, shortsHigh);
  // Contrasting lateral side stripes
  r(cx - 6, shortsY, 1, 6, trimColor);
  r(cx + 5, shortsY, 1, 6, trimColor);
  // Lower leg opening hem shadows
  r(cx - 5, shortsY + 5, 4, 1, shortsShadow);
  r(cx + 1, shortsY + 5, 4, 1, shortsShadow);
  // Inner leg seam divider
  if (isFacingDown || isFacingUp) {
    p(cx - 1, shortsY + 4, '#0f172a');
    p(cx, shortsY + 4, '#0f172a');
  }

  // ----------------------------------------------------
  // TORSO (Shirt with Jacquard Pinstripes, Collar & Team Crest)
  // ----------------------------------------------------
  const shirtY = yBase - 25;
  const torsoX = cx - 7 + torsoLeanX;

  // Base jersey and shoulder highlight
  r(torsoX, shirtY + 1, 14, 9, shirtColor);
  r(torsoX, shirtY, 14, 1, shirtHigh); // Top shoulder sheen
  // Lateral rib contour shadows
  r(torsoX, shirtY + 1, 1, 9, shirtShadow);
  r(torsoX + 13, shirtY + 1, 1, 9, shirtShadow);
  r(torsoX + 1, shirtY + 9, 12, 1, shirtShadow); // Bottom hem

  // Phase 12: Draped untucked jersey hem
  if (appearance.jerseyFit === 'untucked') {
    renderJerseyHemFit(ctx, torsoX + 7, shirtY + 9, 'untucked', shirtColor, shortsColor);
  }

  // Retro kit subtle vertical pinstripes (classic 90s jersey texture)
  if (!isGk) {
    r(torsoX + 3, shirtY + 2, 1, 7, pinstripeCol);
    r(torsoX + 6, shirtY + 2, 1, 7, pinstripeCol);
    r(torsoX + 9, shirtY + 2, 1, 7, pinstripeCol);
    r(torsoX + 12, shirtY + 2, 1, 7, pinstripeCol);
  } else {
    // 90s iconic goalkeeper chest diamond graphic
    p(cx - 3 + torsoLeanX, shirtY + 3, '#38bdf8');
    p(cx - 2 + torsoLeanX, shirtY + 2, '#38bdf8');
    p(cx - 1 + torsoLeanX, shirtY + 3, '#38bdf8');
    p(cx - 2 + torsoLeanX, shirtY + 4, '#38bdf8');
    p(cx + 1 + torsoLeanX, shirtY + 3, '#f43f5e');
    p(cx + 2 + torsoLeanX, shirtY + 2, '#f43f5e');
    p(cx + 3 + torsoLeanX, shirtY + 3, '#f43f5e');
    p(cx + 2 + torsoLeanX, shirtY + 4, '#f43f5e');
  }

  // Phase 12: Collar & Neckline styling (crew, v-neck, or polo with flaps)
  if (appearance.collarStyle && appearance.collarStyle !== 'crew') {
    renderCollarDetails(ctx, torsoX + 7, shirtY + 1, appearance.collarStyle, shirtColor, trimColor);
  } else {
    r(torsoX + 3, shirtY, 8, 1, trimColor); // Collar band
    if (isFacingDown) {
      p(cx - 1 + torsoLeanX, shirtY + 1, trimColor); // V-neck trim
      p(cx + 1 + torsoLeanX, shirtY + 1, trimColor);
      p(cx + torsoLeanX, shirtY + 2, trimColor);
      p(cx + torsoLeanX, shirtY + 1, skinShadow); // Throat shadow dip
    }
  }

  if (isFacingDown) {
    // Embroidered metallic team crest badge on left chest
    p(cx - 4 + torsoLeanX, shirtY + 3, '#fbbf24'); // Gold shield
    p(cx - 3 + torsoLeanX, shirtY + 3, '#f59e0b');
    p(cx - 4 + torsoLeanX, shirtY + 4, '#d97706');
    p(cx - 3 + torsoLeanX, shirtY + 4, '#b45309');
  } else if (isFacingUp) {
    // Back squad number in crisp pixel font
    drawPixelNumber(ctx, cx - 2 + torsoLeanX, shirtY + 2, number, trimColor);
  }

  // Captain's Armband (Distinctive golden band with black 'C')
  if (isCaptain) {
    r(torsoX, shirtY + 3, 3, 3, '#facc15');
    p(torsoX + 1, shirtY + 3, '#111111');
    p(torsoX, shirtY + 4, '#111111');
    p(torsoX + 1, shirtY + 5, '#111111');
  }

  // ----------------------------------------------------
  // ARMS & HANDS (with Sleeve Length & Tattoo Hooks)
  // ----------------------------------------------------
  const isLongSleeve = isGk || appearance.sleeveLength === 'long';
  const isUndershirt = !isGk && appearance.sleeveLength === 'undershirt';
  const armBaseColor = isGk ? '#facc15' : isLongSleeve ? shirtColor : isUndershirt ? '#1e293b' : skin;

  if (isFacingSide) {
    const flip = dirX < 0;
    ctx.save();
    if (flip) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    // Sleeve with shoulder highlight and cuff trim
    r(cx - 7 + armOffset1, shirtY + 1, 4, 3, shirtColor);
    p(cx - 7 + armOffset1, shirtY + 1, shirtHigh);
    r(cx - 7 + armOffset1, shirtY + 4, 4, 1, trimColor); // Sleeve cuff band
    // Forearm & Hand
    r(cx - 7 + armOffset1, shirtY + 5, 3, 5, armBaseColor);
    if (!isGk && !isLongSleeve && !isUndershirt) {
      p(cx - 6 + armOffset1, shirtY + 6, skinHighlight); // Forearm muscle
      p(cx - 7 + armOffset1, shirtY + 9, skinShadow); // Clenched fingers
      if (appearance.tattoos?.leftArm && appearance.tattoos.leftArm !== 'none') {
        renderArmTattooOverlay(ctx, cx - 7 + armOffset1, shirtY + 5, 3, 5, appearance.tattoos.leftArm);
      }
    } else if (isGk) {
      p(cx - 6 + armOffset1, shirtY + 8, '#0f172a'); // Glove palm grip
    }
    ctx.restore();
  } else {
    // Left Arm
    r(cx - 9, shirtY + 1 + armOffset1, 3, 3, shirtColor);
    p(cx - 9, shirtY + 1 + armOffset1, shirtHigh);
    r(cx - 9, shirtY + 4 + armOffset1, 3, 1, trimColor); // Left cuff
    r(cx - 9, shirtY + 5 + armOffset1, 2, 5, armBaseColor);
    if (isGk) {
      p(cx - 9, shirtY + 8 + armOffset1, '#0f172a');
    } else if (!isLongSleeve && !isUndershirt && appearance.tattoos?.leftArm && appearance.tattoos.leftArm !== 'none') {
      renderArmTattooOverlay(ctx, cx - 9, shirtY + 5 + armOffset1, 2, 5, appearance.tattoos.leftArm);
    }

    // Right Arm
    r(cx + 6, shirtY + 1 + armOffset2, 3, 3, shirtColor);
    p(cx + 8, shirtY + 1 + armOffset2, shirtHigh);
    r(cx + 6, shirtY + 4 + armOffset2, 3, 1, trimColor); // Right cuff
    r(cx + 7, shirtY + 5 + armOffset2, 2, 5, armBaseColor);
    if (isGk) {
      p(cx + 8, shirtY + 8 + armOffset2, '#0f172a');
    } else if (!isLongSleeve && !isUndershirt && appearance.tattoos?.rightArm && appearance.tattoos.rightArm !== 'none') {
      renderArmTattooOverlay(ctx, cx + 7, shirtY + 5 + armOffset2, 2, 5, appearance.tattoos.rightArm);
    }
  }

  // ----------------------------------------------------
  // HEAD & EXPRESSIVE FACE (Tri-Tone Skin & Expressive Eyes)
  // ----------------------------------------------------
  const headY = shirtY - 7;
  const headX = cx - 4 + torsoLeanX;

  // Neck with shadow
  r(cx - 2 + torsoLeanX, shirtY - 1, 4, 2, skin);
  r(cx - 2 + torsoLeanX, shirtY - 1, 4, 1, skinShadow);

  // Face Base & Tri-tone shading
  r(headX, headY, 8, 7, skin);
  r(headX + 1, headY + 1, 6, 1, skinHighlight); // Forehead highlight
  p(headX + 1, headY + 4, skinHighlight); // Left cheek highlight
  p(headX + 6, headY + 4, skinHighlight); // Right cheek highlight
  r(headX, headY + 6, 8, 1, skinShadow); // Jawline shadow
  p(headX, headY + 3, skinShadow); // Left ear
  p(headX + 7, headY + 3, skinShadow); // Right ear

  if (isFacingDown) {
    // Dynamic Eyebrows (reactive to sprint, tackle, shot)
    const browColor = '#09090b';
    const isHighIntensity = action.includes('shot') || action.includes('cross') || action.includes('shoot') || action.includes('tackle') || action.includes('sprint');
    if (isHighIntensity) {
      // Determined V-shaped aggressive brows
      p(headX + 1, headY + 2, browColor);
      p(headX + 2, headY + 3, browColor);
      p(headX + 5, headY + 3, browColor);
      p(headX + 6, headY + 2, browColor);
    } else {
      // Focused level match brows
      r(headX + 1, headY + 2, 2, 1, browColor);
      r(headX + 5, headY + 2, 2, 1, browColor);
    }

    // Expressive 16-Bit Eyes (white sclera + focused dark pupil)
    r(headX + 1, headY + 3, 2, 2, '#ffffff');
    p(headX + (dirX < 0 ? 1 : 2), headY + 4, '#09090b'); // Left pupil
    r(headX + 5, headY + 3, 2, 2, '#ffffff');
    p(headX + (dirX < 0 ? 5 : 6), headY + 4, '#09090b'); // Right pupil

    // Defined nose bridge & nostrils
    p(headX + 3, headY + 4, skinShadow);
    p(headX + 4, headY + 4, skinHighlight);
    p(headX + 4, headY + 5, skinShadow);

    // Mouth / Expression
    if (isHighIntensity) {
      r(headX + 3, headY + 6, 2, 1, skinShadow); // Focused grit
    } else {
      p(headX + 3, headY + 6, skinShadow);
    }

    // Phase 12: Facial hair / Beard / Goatee / Stubble
    if (appearance.facialHair && appearance.facialHair !== 'clean') {
      renderFacialHairPath(ctx, headX + 4, headY, appearance.facialHair, hair, skin);
    } else if (appearance.hasBeard) {
      renderFacialHairPath(ctx, headX + 4, headY, 'beard', hair, skin);
    }

    // Phase 12: Earrings Hook (diamonds/gold hoops)
    if (appearance.earrings && appearance.earrings !== 'none') {
      renderEarringAccessories(ctx, headX + 4, headY, appearance.earrings);
    }
  } else if (isFacingUp) {
    // Back of head covered by rich hair texture
    r(headX, headY + 1, 8, 6, hair);
    r(headX + 1, headY + 2, 6, 2, hairHigh);
    p(headX + 1, headY + 5, hairShadow);
    p(headX + 6, headY + 5, hairShadow);
  } else {
    // Side profile with expressive eye & nose
    const flip = dirX < 0;
    ctx.save();
    if (flip) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    r(headX + 3, headY + 3, 2, 2, '#ffffff');
    p(headX + 4, headY + 4, '#09090b');
    p(headX + 6, headY + 4, skin); // Nose projection
    p(headX + 6, headY + 5, skinShadow);
    p(headX + 1, headY + 3, skinShadow); // Ear on profile

    // Earrings on side profile
    if (appearance.earrings && appearance.earrings !== 'none') {
      p(headX + 1, headY + 5, appearance.earrings === 'small-hoop' ? '#f59e0b' : '#f8fafc');
    }

    ctx.restore();
  }

  // ----------------------------------------------------
  // DISTINCTIVE HAIR STYLES (Valderrama, Gullit, Baggio, etc.)
  // ----------------------------------------------------
  renderHairStyle(ctx, cx + torsoLeanX, headY, appearance.hairStyle, hair, hairHigh, hairShadow, isFacingUp);

  return canvas;
}

/**
 * Renders small retro pixel numbers on the back of jerseys (1 to 14)
 */
function drawPixelNumber(ctx: CanvasRenderingContext2D, x: number, y: number, num: number, color: string) {
  ctx.fillStyle = color;
  const p = (px: number, py: number) => ctx.fillRect(x + px, y + py, 1, 1);

  if (num === 1) {
    p(1, 0); p(2, 0); p(2, 1); p(2, 2); p(2, 3); p(1, 3); p(3, 3);
  } else if (num === 10) {
    // '1'
    p(0, 0); p(1, 0); p(1, 1); p(1, 2); p(1, 3);
    // '0'
    p(3, 0); p(4, 0); p(3, 1); p(5, 1); p(3, 2); p(5, 2); p(3, 3); p(4, 3);
  } else {
    // Generic crisp 3x4 pixel number representation
    p(0, 0); p(1, 0); p(2, 0);
    p(0, 1); p(2, 1);
    p(0, 2); p(1, 2); p(2, 2);
    p(2, 3);
  }
}

/**
 * Hair styles matching the legends from user's uploaded picture:
 * Valderrama afro, Gullit dreads, Baggio ponytail, Voller curls, clean crops
 */
function renderHairStyle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  headY: number,
  style: string,
  hair: string,
  hairHigh: string,
  hairShadow: string,
  isFacingUp: boolean
) {
  renderProceduralHairPath(ctx, cx, headY, style as any, hair, isFacingUp);
}

/**
 * Draws the football with:
 * - Oval squash & stretch deformation along the movement vector
 * - Dynamic curling motion vapor trail
 * - Realistic height-based pitch shadow
 * - 3D rotating Telstar pentagons
 */
export function drawBall(ctx: CanvasRenderingContext2D, ball: Ball) {
  ctx.save();

  // 1. DYNAMIC MOTION / CURL VAPOR TRAIL / ⚡ STAT BREAK TRAIL
  // Displays the banana curve arc or supersonic Stat Break plasma trail!
  if (ball.trail && ball.trail.length > 0) {
    for (let i = 0; i < ball.trail.length; i++) {
      const pt = ball.trail[i];
      if (pt.alpha <= 0.02) continue;

      ctx.save();
      if (ball.isThunderbolt || ball.statBreakTrait === 'Thunderbolt Cannon') {
        // ⚡ Supersonic plasma trail with electric cyan-white crackle
        ctx.fillStyle = i % 2 === 0 ? '#38bdf8' : '#ffffff';
        ctx.globalAlpha = pt.alpha * 0.95;
        ctx.shadowColor = '#0284c7';
        ctx.shadowBlur = 12;
      } else if (ball.isDeadlyAssassin || ball.isStatBreak || ball.statBreakTrait) {
        // ⚡ Golden Divine Strike Trail
        ctx.fillStyle = '#facc15';
        ctx.globalAlpha = pt.alpha * 0.90;
        ctx.shadowColor = '#eab308';
        ctx.shadowBlur = 10;
      } else if (ball.isSpecialCurve || pt.color?.includes('#')) {
        const pColor = pt.color || '#a855f7';
        ctx.fillStyle = pColor;
        ctx.globalAlpha = pt.alpha * 0.75;
        ctx.shadowColor = '#c084fc';
        ctx.shadowBlur = 6;
      } else {
        ctx.fillStyle = `rgba(255, 255, 255, ${pt.alpha * 0.45})`;
      }
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size * (1 - (i / ball.trail.length) * 0.4), 0, Math.PI * 2);
      ctx.fill();

      // Air cut swirl lines
      if (Math.abs(ball.spin || 0) > 1.5 && i % 2 === 0) {
        ctx.strokeStyle = ball.isThunderbolt
          ? `rgba(56, 189, 248, ${pt.alpha * 0.8})`
          : ball.isSpecialCurve
          ? `rgba(216, 180, 254, ${pt.alpha * 0.5})`
          : `rgba(220, 240, 255, ${pt.alpha * 0.35})`;
        ctx.lineWidth = ball.isThunderbolt ? 2.2 : ball.isSpecialCurve ? 1.5 : 1;
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // 2. BALL PITCH SHADOW (scales and offsets based on 3D z height)
  const shadowScale = Math.max(0.25, 1 - ball.z / 220);
  const shadowAlpha = Math.max(0.12, 0.46 - (ball.z / 220) * 0.32);
  const shadowOffsetX = -3 - ball.z * 0.09;
  const shadowOffsetY = 5 + ball.z * 0.16;

  ctx.fillStyle = `rgba(8, 28, 8, ${shadowAlpha})`;
  ctx.beginPath();
  ctx.ellipse(
    ball.x + shadowOffsetX,
    ball.y + shadowOffsetY,
    6.5 * shadowScale,
    3.8 * shadowScale,
    -0.2,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // 3. BALL SPRITE WITH OVAL DEFORMATION & TELSTAR SEAMS
  const drawY = ball.y - ball.z;
  const baseRadius = 5.2;

  ctx.save();
  ctx.translate(ball.x, drawY);

  // Apply oval deformation (squash & stretch)
  const deform = ball.deformation || 0;
  if (deform !== 0) {
    ctx.rotate(ball.deformationAngle || 0);
    if (deform > 0) {
      // Elongate in flight direction (oval shape)
      const stretchX = 1 + deform * 0.42;
      const stretchY = 1 - deform * 0.22;
      ctx.scale(stretchX, stretchY);
    } else {
      // Squash on turf bounce
      const squashX = 1 + Math.abs(deform) * 0.35;
      const squashY = 1 - Math.abs(deform) * 0.35;
      ctx.scale(squashX, squashY);
    }
  }

  // Ball core body - Phase 11 high-vis winter ball support
  const isWinterOrange = ball.ballType === 'winter_orange';
  const isWinterYellow = ball.ballType === 'winter_yellow';
  const coreColor = isWinterOrange ? '#ff6a00' : isWinterYellow ? '#facc15' : '#ffffff';
  const shadeColor = isWinterOrange ? '#c2410c' : isWinterYellow ? '#ca8a04' : '#cbd5e1';
  const pentagonColor = isWinterOrange || isWinterYellow ? '#0f172a' : '#18181b';

  ctx.fillStyle = coreColor;
  ctx.beginPath();
  ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
  ctx.fill();

  // Bottom edge sphere shading
  ctx.fillStyle = shadeColor;
  ctx.beginPath();
  ctx.arc(0, 0, baseRadius, 0.25 * Math.PI, 0.95 * Math.PI);
  ctx.arc(0, 0, baseRadius - 1.2, 0.95 * Math.PI, 0.25 * Math.PI, true);
  ctx.closePath();
  ctx.fill();

  // Outer seam ring
  ctx.strokeStyle = pentagonColor;
  ctx.lineWidth = 1;
  ctx.stroke();

  // 3D Rotating Telstar Pentagon Patches
  ctx.fillStyle = pentagonColor;
  const spinOffset = ball.rotationAngle || ((Date.now() * 0.005) % (Math.PI * 2));

  // Center patch
  const cx1 = Math.cos(spinOffset) * 2;
  const cy1 = Math.sin(spinOffset) * 2;
  ctx.fillRect(Math.round(cx1 - 1), Math.round(cy1 - 1), 2, 2);

  // Orbiting patches with 3D spherical depth
  const cx2 = Math.cos(spinOffset + 2.1) * 3.2;
  const cy2 = Math.sin(spinOffset + 2.1) * 3.2;
  ctx.fillRect(Math.round(cx2 - 1), Math.round(cy2 - 1), 2, 2);

  const cx3 = Math.cos(spinOffset + 4.2) * 3.0;
  const cy3 = Math.sin(spinOffset + 4.2) * 3.0;
  ctx.fillRect(Math.round(cx3 - 1), Math.round(cy3 - 1), 2, 2);

  // Specular top highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.fillRect(-2, -3, 2, 1);

  ctx.restore();
  ctx.restore();
}

/**
 * Draws the referee in authentic black uniform with whistle and card display,
 * along with a subtle, delicate sight angle cone representing the referee's vision
 */
export function drawReferee(ctx: CanvasRenderingContext2D, ref: Referee) {
  ctx.save();

  // Subtle Referee Sight Cone (subtle field of vision cone)
  const facing = ref.facingAngle || 0;
  const fov = ref.sightFov || (110 * Math.PI / 180);
  const range = ref.sightRange || 360;
  const halfFov = fov / 2;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(ref.x, ref.y - 14);
  ctx.arc(ref.x, ref.y - 14, range, facing - halfFov, facing + halfFov);
  ctx.closePath();

  // Soft translucent golden radial gradient
  const grad = ctx.createRadialGradient(ref.x, ref.y - 14, 10, ref.x, ref.y - 14, range);
  grad.addColorStop(0, 'rgba(254, 240, 138, 0.08)');
  grad.addColorStop(0.5, 'rgba(254, 240, 138, 0.035)');
  grad.addColorStop(1, 'rgba(254, 240, 138, 0.0)');
  ctx.fillStyle = grad;
  ctx.fill();

  // Subtle dashed vision edge boundary
  ctx.strokeStyle = 'rgba(254, 240, 138, 0.12)';
  ctx.setLineDash([4, 6]);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  // Shadow (standard average adult player shadow)
  ctx.fillStyle = 'rgba(10, 32, 10, 0.45)';
  ctx.beginPath();
  ctx.ellipse(ref.x - 4, ref.y + 4, 11, 5, -0.2, 0, Math.PI * 2);
  ctx.fill();

  const groundY = ref.y;
  const cx = ref.x;

  // 1. Boots (Adult regulation: 5px wide, 4px tall with adidas style stripes)
  ctx.fillStyle = '#09090b';
  ctx.fillRect(cx - 6, groundY - 4, 5, 4);
  ctx.fillRect(cx + 1, groundY - 4, 5, 4);
  // White boot stripes
  ctx.fillStyle = '#e4e4e7';
  ctx.fillRect(cx - 5, groundY - 3, 2, 1);
  ctx.fillRect(cx - 4, groundY - 2, 2, 1);
  ctx.fillRect(cx + 2, groundY - 3, 2, 1);
  ctx.fillRect(cx + 3, groundY - 2, 2, 1);

  // 2. Legs & Black Socks (Adult athletic proportion: 8px tall, 4px wide each)
  ctx.fillStyle = '#18181b';
  ctx.fillRect(cx - 5, groundY - 12, 4, 8);
  ctx.fillRect(cx + 1, groundY - 12, 4, 8);
  // White sock turn-over rings at top
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(cx - 5, groundY - 12, 4, 2);
  ctx.fillRect(cx + 1, groundY - 12, 4, 2);

  // 3. Official Referee Shorts (15px wide, 9px tall, matching outfield players)
  ctx.fillStyle = '#18181b';
  ctx.fillRect(cx - 7, groundY - 20, 15, 9);
  // Elastic waistband & subtle seam highlight
  ctx.fillStyle = '#27272a';
  ctx.fillRect(cx - 7, groundY - 20, 15, 2);
  ctx.fillStyle = '#09090b';
  ctx.fillRect(cx, groundY - 17, 1, 6); // Crotch seam

  // 4. Official Referee Shirt (17px wide, 13px tall, athletic adult torso)
  ctx.fillStyle = '#18181b';
  ctx.fillRect(cx - 8, groundY - 32, 17, 13);

  // Two chest pockets with button flaps
  ctx.fillStyle = '#27272a';
  ctx.fillRect(cx - 6, groundY - 28, 5, 5);
  ctx.fillRect(cx + 2, groundY - 28, 5, 5);
  ctx.fillStyle = '#3f3f46';
  ctx.fillRect(cx - 6, groundY - 28, 5, 1); // Pocket flap
  ctx.fillRect(cx + 2, groundY - 28, 5, 1);

  // Official FIFA gold referee badge on left chest pocket
  ctx.fillStyle = '#eab308';
  ctx.fillRect(cx - 5, groundY - 27, 3, 3);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cx - 4, groundY - 26, 1, 1);

  // Crisp white collar & V-neck
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(cx - 3, groundY - 33, 6, 2);
  ctx.fillRect(cx - 2, groundY - 31, 4, 2);
  ctx.fillRect(cx - 1, groundY - 29, 2, 2);

  // 5. Athletic Arms (4px wide, adult reach, digital match watch)
  ctx.fillStyle = '#d09868';
  // Left arm
  ctx.fillRect(cx - 11, groundY - 31, 4, 11);
  // Right arm
  ctx.fillRect(cx + 8, groundY - 31, 4, 11);
  // Black digital referee watch on left wrist
  ctx.fillStyle = '#09090b';
  ctx.fillRect(cx - 11, groundY - 23, 4, 3);
  ctx.fillStyle = '#22d3ee';
  ctx.fillRect(cx - 10, groundY - 22, 2, 1); // Cyan LCD display

  // 6. Neck & Whistle
  ctx.fillStyle = '#c58a5c';
  ctx.fillRect(cx - 2, groundY - 35, 5, 3);
  // Neon cyan lanyard loop around neck
  ctx.fillStyle = '#06b6d4';
  ctx.fillRect(cx - 1, groundY - 32, 3, 2);
  // Metallic whistle
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(cx, groundY - 30, 2, 3);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(cx + 1, groundY - 28, 1, 1);

  // 7. Head (10px wide, 8px tall, adult facial structure)
  ctx.fillStyle = '#d09868';
  ctx.fillRect(cx - 5, groundY - 42, 10, 8);
  // Chin shadow
  ctx.fillStyle = '#b8794c';
  ctx.fillRect(cx - 4, groundY - 35, 8, 1);

  // Focused referee eyes & brow
  ctx.fillStyle = '#3f3f46';
  ctx.fillRect(cx - 4, groundY - 39, 3, 1); // Left brow
  ctx.fillRect(cx + 1, groundY - 39, 3, 1); // Right brow
  ctx.fillStyle = '#18181b';
  ctx.fillRect(cx - 3, groundY - 38, 2, 2); // Left eye
  ctx.fillRect(cx + 2, groundY - 38, 2, 2); // Right eye
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cx - 2, groundY - 38, 1, 1); // Catchlight
  ctx.fillRect(cx + 3, groundY - 38, 1, 1);

  // 8. Hair (12px wide, neat professional dark haircut)
  ctx.fillStyle = '#27272a';
  ctx.fillRect(cx - 6, groundY - 44, 12, 4);
  ctx.fillRect(cx - 6, groundY - 40, 2, 3); // Left sideburn
  ctx.fillRect(cx + 4, groundY - 40, 2, 3); // Right sideburn
  // Subtle hair highlight
  ctx.fillStyle = '#3f3f46';
  ctx.fillRect(cx - 4, groundY - 44, 6, 1);

  // 9. Card Display (held high overhead with extended arm when active)
  if (ref.cardDisplay) {
    ctx.save();
    // Arm extended fully upward
    ctx.fillStyle = '#d09868';
    ctx.fillRect(cx + 8, groundY - 45, 4, 14);
    // Card held aloft
    ctx.fillStyle = ref.cardDisplay === 'yellow' ? '#facc15' : '#ef4444';
    ctx.fillRect(cx + 7, groundY - 54, 7, 10);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx + 7, groundY - 54, 7, 10);
    ctx.restore();
  }

  // 10. Whistle text indicator
  if (ref.whistleTimer > 0) {
    ctx.fillStyle = '#ffffff';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillText('♫ TWEET!', cx - 22, groundY - 48);
  }

  ctx.restore();
}

/**
 * Utility color shade modifier
 */
function shadeColor(color: string, percent: number): string {
  let R = parseInt(color.substring(1, 3), 16);
  let G = parseInt(color.substring(3, 5), 16);
  let B = parseInt(color.substring(5, 7), 16);

  R = Math.min(255, Math.max(0, Math.round(R * (100 + percent) / 100)));
  G = Math.min(255, Math.max(0, Math.round(G * (100 + percent) / 100)));
  B = Math.min(255, Math.max(0, Math.round(B * (100 + percent) / 100)));

  const RR = R.toString(16).padStart(2, '0');
  const GG = G.toString(16).padStart(2, '0');
  const BB = B.toString(16).padStart(2, '0');

  return `#${RR}${GG}${BB}`;
}
