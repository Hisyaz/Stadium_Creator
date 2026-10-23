import React, { useEffect, useRef, useState } from 'react';
import { MatchEngine } from '../game/engine';
import { KeyState, PowerBarState, PlayerIndicatorType, PlayerIndicatorStyle, GraphicsSettings } from '../types';
import { drawPitch, drawParticles, drawPlayerPowerBar, addPitchScuff } from '../game/pitchRenderer';
import { drawPlayerSprite, drawBall, drawReferee } from '../game/sprites';
import { HOME_KIT, AWAY_KIT } from '../game/constants';
import { t } from '../game/i18n';
import { drawAerialSkyCam, updatePreMatchSwoop } from '../game/skyCamRenderer';

interface PitchCanvasProps {
  engine: MatchEngine;
  keysRef: React.MutableRefObject<KeyState>;
  slotKeysRef?: React.MutableRefObject<Record<number, KeyState>>;
  onTick?: () => void;
  playerIndicatorType?: PlayerIndicatorType;
  playerIndicatorStyle?: PlayerIndicatorStyle;
  graphicsSettings?: GraphicsSettings;
  controllerBgMode?: 'solid' | 'transparent' | 'floating' | 'hidden';
  controllerHeight?: number;
}

export const PitchCanvas: React.FC<PitchCanvasProps> = ({
  engine,
  keysRef,
  slotKeysRef,
  onTick,
  playerIndicatorType = 'small_arrow',
  playerIndicatorStyle = 'solid',
  graphicsSettings,
  controllerBgMode = 'solid',
  controllerHeight = 155,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [isSwoopActive, setIsSwoopActive] = useState(() => engine.isPreMatchSwoopActive());

  // Handle container and window resizing
  useEffect(() => {
    const updateDimensions = () => {
      const parent = canvasRef.current?.parentElement;
      if (parent && parent.clientWidth > 0 && parent.clientHeight > 0) {
        setDimensions({ width: parent.clientWidth, height: parent.clientHeight });
      } else {
        setDimensions({ width: window.innerWidth, height: window.innerHeight });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    let resizeObserver: ResizeObserver | null = null;
    if (canvasRef.current?.parentElement) {
      resizeObserver = new ResizeObserver(() => {
        updateDimensions();
      });
      resizeObserver.observe(canvasRef.current.parentElement);
    }

    return () => {
      window.removeEventListener('resize', updateDimensions);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, []);

  // Main Animation / Render Loop
  useEffect(() => {
    let animId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. Advance Game Engine
      engine.update(keysRef.current, slotKeysRef?.current);
      if (onTick) onTick();

      // Phase 9: High-DPI Super-Sampling (up to 2.0x DPR) or Locked 1.0 DPR in Performance
      const dpr = graphicsSettings?.tier === 'performance'
        ? 1.0
        : graphicsSettings?.highDpi
        ? Math.min(window.devicePixelRatio || 1, 2.0)
        : Math.min(window.devicePixelRatio || 1, 1.25);

      const targetW = Math.round(dimensions.width * dpr);
      const targetH = Math.round(dimensions.height * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      const width = dimensions.width;
      const height = dimensions.height;

      // Clear Canvas
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.fillStyle = '#1e3814';
      ctx.fillRect(0, 0, width, height);

      // Pixel-crisp rendering
      ctx.imageSmoothingEnabled = false;

      // CAMERA TRANSFORMS:
      // When the bottom controller is solid, the screen area above it is used as reference
      // Center camera on the visible gameplay portion so the focal action is never obscured
      const bottomInset = controllerBgMode === 'solid' ? (controllerHeight || 155) : 0;
      const visibleH = Math.max(80, height - bottomInset);
      const screenCenterY = visibleH / 2;

      ctx.translate(width / 2, screenCenterY);

      // Camera Zoom & Pitch Tilt Angle:
      // "when you're near the top goal (rival goal) the angle is a bit lower and you see it closer to the ground
      // giving more vertical angle of the goal, but as you go down to your own goal, the camera is higher"
      const zoom = engine.camera.zoom;
      const tilt = engine.camera.pitchTilt; // 0 (top goal) to 1 (bottom goal)
      const scaleY = zoom * (0.94 + tilt * 0.10);

      ctx.scale(zoom, scaleY);
      ctx.translate(-engine.camera.x, -engine.camera.y);

      // Active camera viewport in world space
      const viewW = width / zoom;
      const viewH = height / scaleY;
      const viewL = engine.camera.x - viewW / 2;
      const viewT = engine.camera.y - (screenCenterY / scaleY);

      // 2. Draw Pitch, Line Markings, Stadium Grandstands, and 3D Goals with dynamic net physics
      drawPitch(
        ctx,
        viewL,
        viewT,
        viewW,
        viewH,
        engine.topGoalNet,
        engine.bottomGoalNet,
        tilt,
        engine.camera.x,
        engine.camera.y,
        graphicsSettings,
        engine.ball.y,
        engine.powerBar.isActive && engine.powerBar.action === 'shoot',
        engine.stadiumTier,
        engine.timeOfDay,
        engine.seatColor,
        engine.homeKit || HOME_KIT,
        engine.awayKit || AWAY_KIT,
        engine.turfQuality,
        engine.grassLength,
        engine.weather,
        engine.season,
        engine.netTension,
        engine.goalFrame,
        engine.puddles,
        engine.mowingPattern,
        engine.surfaceStatus,
        engine.crowdLevel,
        engine.matchPhase === 'penalty' || engine.matchPhase === 'penalty_shootout',
        Boolean(engine.bannerMessage?.includes('GOAL') && engine.bannerTimer > 0),
        engine.activeStadium
      );

      // 3. Draw Turf/Grass Particles & Supersonic Vapor Trails
      drawParticles(ctx, engine.particles, graphicsSettings, engine.ball);

      // 4. Collect and sort all entities by Y position for proper depth layering
      type RenderItem =
        | { type: 'player'; y: number; data: typeof engine.players[0] }
        | { type: 'ball'; y: number; data: typeof engine.ball }
        | { type: 'referee'; y: number; data: typeof engine.referee };

      const items: RenderItem[] = [];

      for (const p of engine.players) {
        items.push({ type: 'player', y: p.y, data: p });
      }
      items.push({ type: 'ball', y: engine.ball.y, data: engine.ball });
      items.push({ type: 'referee', y: engine.referee.y, data: engine.referee });

      items.sort((a, b) => a.y - b.y);

      // 5. Draw Entities in Depth Order
      for (const item of items) {
        if (item.type === 'player') {
          const p = item.data;
          const kit = p.team === 'home' ? (engine.homeKit || HOME_KIT) : (engine.awayKit || AWAY_KIT);
          drawPlayerSprite(ctx, p, kit, 1, graphicsSettings);

          // Phase 9 High-End: Dynamic pitch scuffs & tackle skid marks persist
          if (p.action === 'sliding_tackle' && graphicsSettings?.pitchScuffs !== false && p.actionTimer && p.actionTimer % 6 === 0) {
            addPitchScuff(p.x, p.y, p.facingAngle, 24, 4.5);
          }

          // Multi-Player / User controlled player indicator (Phase 1.5)
          const slot = !engine.isSpectatorMode()
            ? (engine.playerSlots || []).find(
                (s) =>
                  s.side !== 'spectator' &&
                  (engine.slotControlledPlayerIds?.[s.id] === p.id ||
                    (s.id === 1 && p.id === engine.userControlledPlayerId))
              )
            : null;

          if (slot) {
            drawUserPlayerIndicator(
              ctx,
              p,
              playerIndicatorType as PlayerIndicatorType,
              playerIndicatorStyle as PlayerIndicatorStyle,
              slot.color,
              slot.name
            );
            if (p.id === engine.userControlledPlayerId) {
              if (engine.powerBar.isActive || (engine.powerBar.fadeAlpha && engine.powerBar.fadeAlpha > 0)) {
                drawPlayerPowerBar(ctx, p, engine.powerBar);
              }
              if (
                (engine.autoPositionTimer > 0 && engine.autoPositionTarget) ||
                (engine.controlMode === 'one_player' && engine.tacticalGuideEnabled && engine.autoPositionTarget)
              ) {
                drawAutoPositionGuide(ctx, p, engine.autoPositionTarget);
              }
            }
          }

          // ⚡ Phase 6: Stat Break traits are felt purely through gameplay & physical dominance (visual glowing auras disabled)
          // Ghost trails and neon auras removed for authentic realism
          if (p.stumbleTimer && p.stumbleTimer > 0) {
            drawStumbleIndicator(ctx, p);
          }

          // Q BALL SHIELDING: Physical cleat plant effect only when actively holding possession
          if ((p.isShielding || p.action === 'shielding') && engine.ball.ownerId === p.id) {
            drawShieldingVisuals(ctx, p);
          }

          // SLIDING TACKLE: Ground dust & turf spray trail
          if (p.action === 'sliding_tackle') {
            drawTackleSlideEffect(ctx, p);
          }

          // FOULED / FALLING: Ground impact burst & impact badge
          if (p.action === 'fouled_falling') {
            drawFoulVisuals(ctx, p);
          }

          if (p.shirtPulledTimer && p.shirtPulledTimer > 0) {
            drawShirtPullEffect(ctx, p);
          }

          if (p.isGingaLifting || p.gingaActive) {
            drawGingaIndicator(ctx, p);
          }

          // Acrobatic Volleys & Ginga Skill flair effects
          const isAcrobatic =
            p.action === 'bicycle_kick' ||
            p.action === 'scissor_kick' ||
            p.action === 'scorpion_kick' ||
            p.action === 'diving_volley' ||
            p.action === 'side_volley' ||
            p.action === 'half_volley' ||
            p.action === 'chest_volley' ||
            p.action === 'rabona_volley' ||
            p.action === 'flying_heel_volley' ||
            p.action === 'sombrero_volley' ||
            p.action === 'diving_header' ||
            p.action === 'around_the_world' ||
            p.action === 'elastico';

          if (isAcrobatic && p.actionTimer > 0) {
            drawAcrobaticActionEffect(ctx, p);
          }

          // Phase 4: Dynamic off-the-ball support runs & call for pass indicator
          if (p.isSignalingForPass && p.team === 'home' && p.id !== engine.userControlledPlayerId) {
            drawSupportRunIndicator(ctx, p);
          }

          // Volley opportunity indicator when airborne ball is within striking distance
          const distToBall = Math.hypot(engine.ball.x - p.x, engine.ball.y - p.y);
          if (p.isUserControlled && (engine.ball.isAirborne || p.gingaActive || engine.ball.z > 2.5) && distToBall < 36 && engine.ball.z > 2.0) {
            drawVolleyOpportunityIndicator(ctx, p, engine.ball);
          }
        } else if (item.type === 'ball') {
          // During throw-in aiming phase, ball is held in thrower's hands on sprite; don't draw duplicate ball
          if (engine.setPiece?.type !== 'throw_in') {
            drawBall(ctx, item.data);
            if (item.data.isDividedBall && !item.data.ownerId) {
              drawDividedBallReticle(ctx, item.data);
            }
          }
        } else if (item.type === 'referee') {
          drawReferee(ctx, item.data);
        }
      }

      // 6. Draw Set Piece Aim & Prompt overlay (if active dead-ball phase)
      if (engine.setPiece && (engine.matchPhase === 'penalty' || engine.matchPhase === 'free_kick' || engine.matchPhase === 'corner_kick' || engine.matchPhase === 'goal_kick' || engine.matchPhase === 'throw_in')) {
        drawSetPieceOverlay(ctx, engine);
      }

      // 7. Phase 15.2 & 15.3: High-Altitude Aerial Sky-Cam & Pre-Match Swoop Overlay
      if (engine.isPreMatchSwoopActive() && engine.preMatchSwoop) {
        if (!isSwoopActive) setIsSwoopActive(true);
        const swoop = updatePreMatchSwoop(engine.preMatchSwoop);
        if (swoop.camera.roofOpacity > 0.01) {
          drawAerialSkyCam(ctx, engine.activeStadium, {
            roofOpacity: swoop.camera.roofOpacity,
            showBroadcastHUD: true,
            homeTeamName: engine.homeTeam.name,
            awayTeamName: engine.awayTeam.name,
            homeKit: engine.homeKit,
            awayKit: engine.awayKit,
            timeOfDay: engine.timeOfDay,
          });
        }
      } else if (isSwoopActive) {
        setIsSwoopActive(false);
      }

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [engine, keysRef, onTick, playerIndicatorType, playerIndicatorStyle, graphicsSettings]);

  /**
   * Draws controlled player indicator with selectable shape (small arrow, big arrow, bottom circle)
   * and style (solid, transparent, off), cleanly positioned above or around the player without touching.
   */
  const drawUserPlayerIndicator = (
    ctx: CanvasRenderingContext2D,
    player: typeof engine.players[0],
    type: PlayerIndicatorType,
    style: PlayerIndicatorStyle,
    color: string = '#facc15',
    slotTag?: string
  ) => {
    if (style === 'off') return;

    ctx.save();
    const x = Math.round(player.x);
    const isTrans = style === 'transparent';
    ctx.globalAlpha = isTrans ? 0.52 : 1.0;

    if (type === 'circle') {
      // Circle around the bottom / feet of the player on the pitch
      const feetY = Math.round(player.y + 2);
      const pulse = Math.sin(Date.now() / 120) * 1.5;

      // Outer tactical ellipse
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x, feetY, 14 + pulse, 7 + pulse * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Inner dashed contour ring
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(x, feetY, 10, 5, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Direction notch on circle
      const ang = player.facingAngle;
      const notchX = x + Math.cos(ang) * (14 + pulse);
      const notchY = feetY + Math.sin(ang) * (7 + pulse * 0.5);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(notchX, notchY, 2, 0, Math.PI * 2);
      ctx.fill();

      // Overhead tag if present
      if (slotTag) {
        ctx.fillStyle = color;
        ctx.font = 'bold 7px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(slotTag, x, feetY - 26);
      }
    } else if (type === 'big_arrow') {
      // Bold 32-bit arcade chevron pointer, floating cleanly above player's head without touching
      const bounceY = Math.sin(Date.now() / 140) * 3;
      const tipY = Math.round(player.y - 42 + bounceY);

      // Outer bold chevron
      ctx.fillStyle = color;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 8, tipY - 11);
      ctx.lineTo(x + 8, tipY - 11);
      ctx.lineTo(x, tipY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Inner highlight bevel
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x - 6, tipY - 9.5);
      ctx.lineTo(x + 6, tipY - 9.5);
      ctx.stroke();

      // Player slot tag (1P, 2P, etc.)
      if (slotTag) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 7px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(slotTag, x, tipY - 14);
      }
    } else {
      // 'small_arrow' (default):
      // Small retro triangle pointer, floating cleanly above head without touching
      const bounceY = Math.sin(Date.now() / 150) * 2.5;
      const tipY = Math.round(player.y - 41 + bounceY);

      ctx.fillStyle = color;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x - 5, tipY - 7);
      ctx.lineTo(x + 5, tipY - 7);
      ctx.lineTo(x, tipY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Player slot tag (1P, 2P, etc.)
      if (slotTag) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 7px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(slotTag, x, tipY - 9);
      }
    }

    ctx.restore();
  };

  /**
   * Draws tactical guide line and target reticle when auto-positioning assist is active
   */
  /**
   * Draws real-time tactical position guide:
   * Semi-transparent lighting line with an arrow at the destination that updates automatically to the best position.
   */
  const drawAutoPositionGuide = (
    ctx: CanvasRenderingContext2D,
    player: typeof engine.players[0],
    target: { x: number; y: number }
  ) => {
    ctx.save();
    const px = player.x;
    const py = player.y;
    const tx = target.x;
    const ty = target.y;

    const dx = tx - px;
    const dy = ty - py;
    const dist = Math.hypot(dx, dy);

    // 1. Semi-transparent lighting line (electric cyan / neon beam)
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(tx, ty);

    // Outer soft lighting beam glow
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
    ctx.stroke();

    // Inner pulsing bright laser core
    const dashOffset = (Date.now() / 45) % 18;
    ctx.beginPath();
    ctx.setLineDash([9, 7]);
    ctx.lineDashOffset = -dashOffset;
    ctx.moveTo(px, py);
    ctx.lineTo(tx, ty);
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
    ctx.stroke();

    // 2. Destination target ring
    ctx.setLineDash([]);
    const pulse = Math.sin(Date.now() / 140) * 2;
    ctx.beginPath();
    ctx.arc(tx, ty, 10 + pulse, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(tx, ty, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.95)';
    ctx.fill();

    // 3. Transparent lighting arrow pointing into optimal position
    const arrowLen = 13;
    const arrowAngle = dist > 14 ? Math.atan2(dy, dx) : player.facingAngle;
    const ax = tx + Math.cos(arrowAngle) * (13 + pulse);
    const ay = ty + Math.sin(arrowAngle) * (13 + pulse);

    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(
      ax - Math.cos(arrowAngle - 0.48) * arrowLen,
      ay - Math.sin(arrowAngle - 0.48) * arrowLen
    );
    ctx.lineTo(
      ax - Math.cos(arrowAngle) * (arrowLen * 0.58),
      ay - Math.sin(arrowAngle) * (arrowLen * 0.58)
    );
    ctx.lineTo(
      ax - Math.cos(arrowAngle + 0.48) * arrowLen,
      ay - Math.sin(arrowAngle + 0.48) * arrowLen
    );
    ctx.closePath();
    ctx.fillStyle = 'rgba(56, 189, 248, 0.88)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.lineWidth = 1.2;
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  };

  /**
   * Draws shirt pull visual tension line
   */
  const drawShirtPullEffect = (ctx: CanvasRenderingContext2D, player: typeof engine.players[0]) => {
    ctx.save();
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const pullOffset = Math.sin(Date.now() / 50) * 2;
    ctx.moveTo(player.x - 4, player.y - 10);
    ctx.lineTo(player.x - 14 + pullOffset, player.y - 6);
    ctx.stroke();

    ctx.fillStyle = '#ef4444';
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.fillText('⚡PULL', player.x - 22, player.y - 14);
    ctx.restore();
  };

  /**
   * Draws golden Ginga juggling / lift status and combo meter
   */
  const drawGingaIndicator = (ctx: CanvasRenderingContext2D, player: typeof engine.players[0]) => {
    ctx.save();
    if (player.isGingaLifting) {
      // Hold spacebar charging ring
      const holdTime = player.gingaHoldTimer || 0;
      const progress = Math.min(1.0, holdTime / 108); // 108 frames = 1.8s
      const isDangerous = holdTime > 90;

      ctx.strokeStyle = isDangerous ? '#ef4444' : '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(player.x, player.y + 4, 15, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
      ctx.stroke();

      ctx.font = '6px "Press Start 2P", monospace';
      ctx.fillStyle = isDangerous ? '#f87171' : '#fef08a';
      ctx.textAlign = 'center';
      ctx.fillText(isDangerous ? 'MAX 1.8S!' : 'LIFTING...', player.x, player.y + 26);
    } else if (player.gingaActive) {
      // Active Ginga juggling state
      const combo = player.gingaCombo || 1;
      const ringRadius = 14 + Math.sin(Date.now() / 90) * 2;
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(player.x, player.y + 2, ringRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.font = '6px "Press Start 2P", monospace';
      ctx.fillStyle = '#fef08a';
      ctx.textAlign = 'center';
      ctx.fillText(`GINGA x${combo}`, player.x, player.y + 24);
    }
    ctx.restore();
  };

  /**
   * Draws dynamic visual flair effects for volleys and acrobatic skill moves
   */
  const drawAcrobaticActionEffect = (ctx: CanvasRenderingContext2D, player: typeof engine.players[0]) => {
    ctx.save();
    const px = Math.round(player.x);
    const py = Math.round(player.y);
    const action = player.action;

    // Action specific badge text and colors
    let label = 'ACROBATIC!';
    let color = '#facc15';

    if (action === 'bicycle_kick') {
      label = 'CHILENA / BICYCLE!';
      color = '#f59e0b';
    } else if (action === 'scissor_kick') {
      label = 'SCISSOR VOLLEY!';
      color = '#38bdf8';
    } else if (action === 'scorpion_kick') {
      label = 'SCORPION KICK!';
      color = '#ec4899';
    } else if (action === 'diving_volley') {
      label = 'DIVING VOLLEY!';
      color = '#34d399';
    } else if (action === 'side_volley') {
      label = 'SIDE VOLLEY!';
      color = '#60a5fa';
    } else if (action === 'half_volley') {
      label = 'HALF-VOLLEY!';
      color = '#fbbf24';
    } else if (action === 'chest_volley') {
      label = 'CHEST VOLLEY!';
      color = '#a78bfa';
    } else if (action === 'rabona_volley') {
      label = 'RABONA VOLLEY!';
      color = '#f43f5e';
    } else if (action === 'flying_heel_volley') {
      label = 'FLYING HEEL VOLLEY!';
      color = '#e879f9';
    } else if (action === 'sombrero_volley') {
      label = 'SOMBRERO VOLLEY!';
      color = '#fb923c';
    } else if (action === 'diving_header') {
      label = 'DIVING HEADER!';
      color = '#fbbf24';
    } else if (action === 'around_the_world') {
      label = 'ATW 360°!';
      color = '#22d3ee';
    } else if (action === 'elastico') {
      label = 'ELASTICO!';
      color = '#4ade80';
    }

    // Dynamic shockwave ring
    const timerRatio = Math.max(0, (player.actionTimer || 1) / 25);
    const radius = 10 + (1 - timerRatio) * 16;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(px, py - 6, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Sparkle particles
    const time = Date.now() * 0.008;
    for (let i = 0; i < 4; i++) {
      const a = time + (i * Math.PI) / 2;
      const sx = px + Math.cos(a) * (radius + 4);
      const sy = py - 6 + Math.sin(a) * (radius * 0.6 + 2);
      ctx.fillStyle = color;
      ctx.fillRect(sx, sy, 2, 2);
    }

    // Overhead action text badge
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.strokeRect(px - 44, py - 46, 88, 12);
    ctx.fillRect(px - 44, py - 46, 88, 12);

    ctx.font = '6px "Press Start 2P", monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, px, py - 40);

    ctx.restore();
  };

  /**
   * Draws a target indicator when an aerial ball is ready to be volleyed or flair struck
   */
  const drawVolleyOpportunityIndicator = (
    ctx: CanvasRenderingContext2D,
    player: typeof engine.players[0],
    ball: typeof engine.ball
  ) => {
    ctx.save();
    const bx = Math.round(ball.x);
    const by = Math.round(ball.y);

    // Subtle pulsing aerial crosshair under ball shadow
    const pulse = 8 + Math.sin(Date.now() / 70) * 3;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.arc(bx, by, pulse, 0, Math.PI * 2);
    ctx.stroke();

    // Floating action hint
    ctx.font = '6px "Press Start 2P", monospace';
    ctx.fillStyle = '#7dd3fc';
    ctx.textAlign = 'center';
    ctx.fillText('VOLLEY [A/E/Q]', bx, by - Math.min(30, ball.z) - 10);

    ctx.restore();
  };

  /**
   * Draws a retro pulsing tactical run / call-for-pass chevron above an open supporting teammate (Phase 4)
   */
  const drawSupportRunIndicator = (ctx: CanvasRenderingContext2D, player: typeof engine.players[0]) => {
    ctx.save();
    const px = Math.round(player.x);
    const py = Math.round(player.y - 36);

    const pulse = Math.sin(Date.now() * 0.012) * 2;
    // Neon emerald call chevron
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.moveTo(px, py + pulse);
    ctx.lineTo(px - 4, py - 6 + pulse);
    ctx.lineTo(px + 4, py - 6 + pulse);
    ctx.closePath();
    ctx.fill();

    // Subtle archetype badge
    if (player.supportRunType === 'blindside' || player.supportRunType === 'overlap' || player.supportRunType === 'cutback') {
      ctx.font = '5px "Press Start 2P", monospace';
      ctx.fillStyle = '#34d399';
      ctx.textAlign = 'center';
      const label = player.supportRunType === 'overlap' ? 'OVERLAP' : (player.supportRunType === 'cutback' ? 'CUTBACK' : 'RUN');
      ctx.fillText(label, px, py - 9 + pulse);
    }

    ctx.restore();
  };

  /**
   * Draws a subtle, grounded physical stance indicator when shielding the ball [Q]
   * (Subtle physical cleat plant effect on the turf, zero glowing sci-fi aura or magical superpower feeling)
   */
  const drawShieldingVisuals = (ctx: CanvasRenderingContext2D, player: typeof engine.players[0]) => {
    ctx.save();
    const px = Math.round(player.x);
    const py = Math.round(player.y);

    // Subtle physical cleat plant arc behind player's center of gravity
    const backAngle = player.facingAngle + Math.PI;
    const braceX = px + Math.cos(backAngle) * 3;
    const braceY = py + 2 + Math.sin(backAngle) * 2;

    // Faint grounded turf footprint brace (realistic physical traction)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.fillStyle = 'rgba(12, 38, 12, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(braceX, braceY, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Small subtle plant tick mark at back cleat
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(braceX, braceY, 6, backAngle - 0.7, backAngle + 0.7);
    ctx.stroke();

    ctx.restore();
  };

  /**
   * Draws turf divot slide spray behind player performing a sliding tackle
   */
  const drawTackleSlideEffect = (ctx: CanvasRenderingContext2D, player: typeof engine.players[0]) => {
    ctx.save();
    const px = Math.round(player.x);
    const py = Math.round(player.y);
    ctx.fillStyle = 'rgba(34, 197, 94, 0.65)';
    for (let i = 0; i < 3; i++) {
      const sx = px - (player.slideVelocityX || 0) * 0.4 + (i * 3 - 3);
      const sy = py - (player.slideVelocityY || 0) * 0.4 + (i * 2 - 2);
      ctx.fillRect(sx, sy, 3, 2);
    }
    ctx.restore();
  };

  /**
   * Draws ground impact shock burst & badge when player is fouled
   */
  const drawFoulVisuals = (ctx: CanvasRenderingContext2D, player: typeof engine.players[0]) => {
    ctx.save();
    const px = Math.round(player.x);
    const py = Math.round(player.y);

    // Ground impact ring
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(px, py, 14, 0, Math.PI * 2);
    ctx.stroke();

    // Overhead impact alert
    ctx.fillStyle = 'rgba(239, 68, 68, 0.95)';
    ctx.fillRect(px - 22, py - 38, 44, 13);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(px - 22, py - 38, 44, 13);

    ctx.font = '6px "Press Start 2P", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡FOUL!', px, py - 31);
    ctx.restore();
  };

  /**
   * ⚡ Phase 6: Ethereal Speed-Line Afterimages (Hyper-Burst Ghost Trails)
   */
  const drawGhostTrails = (
    ctx: CanvasRenderingContext2D,
    trails: Array<{ x: number; y: number; facingAngle: number; alpha: number; team: string }>
  ) => {
    ctx.save();
    for (const trail of trails) {
      if (trail.alpha <= 0.05) continue;
      ctx.save();
      ctx.globalAlpha = trail.alpha * 0.45;
      const col = trail.team === 'home' ? '#38bdf8' : '#f87171';
      ctx.fillStyle = col;
      ctx.shadowColor = col;
      ctx.shadowBlur = 8;
      // Ghost silhouette ellipse at previous position
      ctx.beginPath();
      ctx.ellipse(Math.round(trail.x), Math.round(trail.y - 12), 7, 14, trail.facingAngle - Math.PI / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  };

  /**
   * ⚡ Phase 6: Supernatural Trait Activation Aura Ring & Crown
   */
  const drawStatBreakAura = (ctx: CanvasRenderingContext2D, player: typeof engine.players[0]) => {
    ctx.save();
    const px = Math.round(player.x);
    const py = Math.round(player.y);
    const pulse = 20 + Math.sin(Date.now() / 60) * 3;
    const trait = player.statBreakTraitName || '⚡ STAT BREAK';

    // Golden divine celestial aura
    ctx.strokeStyle = '#facc15';
    ctx.fillStyle = 'rgba(250, 204, 21, 0.16)';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#eab308';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(px, py - 4, pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Floating trait banner above head
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1;
    ctx.fillRect(px - 50, py - 52, 100, 13);
    ctx.strokeRect(px - 50, py - 52, 100, 13);

    ctx.font = '6px "Press Start 2P", monospace';
    ctx.fillStyle = '#fde047';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(trait, px, py - 45);

    ctx.restore();
  };

  /**
   * ⚡ Phase 6: Ankle Breaker Off-Balance Stumble Indicator
   */
  const drawStumbleIndicator = (ctx: CanvasRenderingContext2D, player: typeof engine.players[0]) => {
    ctx.save();
    const px = Math.round(player.x);
    const py = Math.round(player.y);

    // Stumble swirl rings
    const time = Date.now() * 0.012;
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(px, py - 8, 12 + Math.sin(time) * 3, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#ea580c';
    ctx.font = '6px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('STUMBLE!', px, py - 38);

    ctx.restore();
  };

  /**
   * Draws golden dynamic reticle indicating a contested "Divided Ball" in play
   */
  const drawDividedBallReticle = (ctx: CanvasRenderingContext2D, ball: typeof engine.ball) => {
    ctx.save();
    const bx = Math.round(ball.x);
    const by = Math.round(ball.y);
    const pulse = 9 + Math.sin(Date.now() / 80) * 2;

    ctx.strokeStyle = 'rgba(250, 204, 21, 0.75)';
    ctx.setLineDash([3, 2]);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(bx, by, pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  };

  /**
   * Draws set piece trajectory line, target point, and controls prompt
   */
  /**
   * Phase 7.5.4: Streamlined Free Kick & Set Piece Arcade Aiming Overlay
   * Stripped of confusing 3D parabolic curves, height nodes, and curve dials.
   * Free kicks behave like natural arcade passes, shots, or crosses with dead-ball accuracy.
   */
  const drawSetPieceOverlay = (ctx: CanvasRenderingContext2D, eng: MatchEngine) => {
    const sp = eng.setPiece;
    if (!sp || sp.team !== 'home') return;

    ctx.save();
    const sx = sp.spotX;
    const sy = sp.spotY;
    const ang = sp.aimAngle;
    const isPen = sp.type === 'penalty';
    const isThrow = sp.type === 'throw_in';
    const isCorner = sp.type === 'corner_kick';

    // 1. Sleek Arcade Aim Direction Line
    const aimLen = isPen ? 75 : isThrow ? 65 : 95;
    const targetX = sx + Math.cos(ang) * aimLen;
    const targetY = sy + Math.sin(ang) * aimLen;

    ctx.save();
    ctx.strokeStyle = isPen ? '#f43f5e' : '#facc15';
    ctx.lineWidth = 2.0;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(targetX, targetY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Target aiming crosshair
    const pulse = Math.sin(Date.now() / 90) * 1.5;
    ctx.strokeStyle = isPen ? '#f43f5e' : '#facc15';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(targetX, targetY, 6 + pulse, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(targetX, targetY, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Sleek aim direction and crosshair drawn without any text box on top of the player
    ctx.restore();
  };

  const getCanvasFilterClass = () => {
    switch (graphicsSettings?.activeFilter) {
      case 'crt_arcade':
        return 'canvas-crt-mode';
      case 'vhs_1994':
        return 'canvas-vhs-mode';
      case 'neo_geo_16bit':
        return 'canvas-neogeo-mode';
      case 'vintage_1954':
        return 'canvas-vintage-mode';
      case 'manga_tsubasa':
        return 'canvas-manga-mode';
      case 'cyberpunk_neon':
        return 'canvas-cyberpunk-mode';
      case 'cinematic_35mm':
        return 'canvas-cinematic-mode';
      default:
        return '';
    }
  };

  return (
    <div className="relative w-full h-full select-none">
      <canvas
        ref={canvasRef}
        id="football-canvas"
        width={dimensions.width}
        height={dimensions.height}
        className={`block w-full h-full cursor-default select-none ${getCanvasFilterClass()}`}
      />
      {isSwoopActive && (
        <button
          onClick={() => {
            engine.skipPreMatchSwoop();
            setIsSwoopActive(false);
          }}
          className="absolute top-16 right-6 z-40 px-3.5 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-sky-400 hover:text-white border-2 border-sky-400/80 font-mono text-xs uppercase tracking-wider rounded shadow-lg backdrop-blur flex items-center gap-2 cursor-pointer transition-all active:scale-95"
        >
          <span>⏩</span>
          <span className="font-bold">SKIP INTRO</span>
          <span className="text-[10px] text-slate-400 hidden sm:inline">(SPACE)</span>
        </button>
      )}
    </div>
  );
};
