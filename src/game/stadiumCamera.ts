/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PITCH_CONFIG } from './constants';
import {
  StadiumDefinition,
  StandPosition,
  TunnelSiting,
} from '../types/stadium';

/**
 * PHASE 14.1: Top-Right Multi-View Camera Switcher Suite (7 Specialized Views)
 *
 * 1. relevant: Dynamically frames whatever component is currently being edited in inspector
 * 2. full_pitch: Classic broadcast overview framing pitch, touchlines, and surrounds
 * 3. stands: Dedicated spectator grandstand inspection with rapid stand cycling
 * 4. field_focus: Tight pitch-level focus centered on playing surface, turf, and goalmouth
 * 5. aerial_sky: High-altitude bird's-eye perspective framing outer architecture and landscape
 * 6. tunnel: Dramatic low-angle cinematic perspective focused on player entrance tunnel
 * 7. bench: Touchline dugout perspective focused on manager and substitutes' bench
 */
export type StadiumCameraPerspective =
  | 'relevant'
  | 'full_pitch'
  | 'stands'
  | 'field_focus'
  | 'aerial_sky'
  | 'tunnel'
  | 'bench';

export type StandInspectionPosition = 'east' | 'west' | 'north' | 'south' | 'corners';

export interface CameraTarget {
  x: number;
  y: number;
  zoom: number;
  pitchTilt: number;
  label: string;
  description: string;
}

/**
 * Computes the exact camera coordinates and lens zoom for any stand position
 */
export function getStandCameraCoordinates(pos: StandPosition | StandInspectionPosition): { x: number; y: number; zoom: number } {
  const cx = PITCH_CONFIG.CENTER_X;
  const cy = PITCH_CONFIG.CENTER_Y;
  const left = PITCH_CONFIG.PITCH_LEFT;
  const right = PITCH_CONFIG.PITCH_RIGHT;
  const top = PITCH_CONFIG.PITCH_TOP;
  const bottom = PITCH_CONFIG.PITCH_BOTTOM;

  switch (pos) {
    case 'east':
      // Right touchline stand
      return { x: right + 120, y: cy, zoom: 0.65 };
    case 'west':
      // Left touchline main stand
      return { x: left - 120, y: cy, zoom: 0.65 };
    case 'north':
      // Top end goal stand
      return { x: cx, y: top - 80, zoom: 0.62 };
    case 'south':
      // Bottom end goal stand
      return { x: cx, y: bottom + 80, zoom: 0.62 };
    case 'corner_ne':
      return { x: right + 80, y: top - 40, zoom: 0.72 };
    case 'corner_nw':
      return { x: left - 80, y: top - 40, zoom: 0.72 };
    case 'corner_se':
      return { x: right + 80, y: bottom + 40, zoom: 0.72 };
    case 'corner_sw':
      return { x: left - 80, y: bottom + 40, zoom: 0.72 };
    case 'corners':
    default:
      // Overview of northern corners
      return { x: cx, y: top, zoom: 0.52 };
  }
}

/**
 * Computes the entrance tunnel camera target based on siting configuration
 */
export function getTunnelCameraCoordinates(siting: TunnelSiting = 'center_main'): { x: number; y: number; zoom: number } {
  const cx = PITCH_CONFIG.CENTER_X;
  const cy = PITCH_CONFIG.CENTER_Y;
  const left = PITCH_CONFIG.PITCH_LEFT;
  const top = PITCH_CONFIG.PITCH_TOP;

  switch (siting) {
    case 'corner':
      return { x: left - 40, y: top - 30, zoom: 1.25 };
    case 'behind_goal':
      return { x: cx, y: top - 45, zoom: 1.25 };
    case 'center_main':
    default:
      return { x: left - 40, y: cy, zoom: 1.35 };
  }
}

/**
 * Computes the dugout bench camera target along touchline
 */
export function getDugoutCameraCoordinates(): { x: number; y: number; zoom: number } {
  const left = PITCH_CONFIG.PITCH_LEFT;
  const cy = PITCH_CONFIG.CENTER_Y;
  // Centered over home bench and technical area
  return { x: left - 35, y: cy - 40, zoom: 1.20 };
}

/**
 * Master Camera Director Resolver for Phase 14.1
 */
export function getStadiumCameraTarget(
  perspective: StadiumCameraPerspective,
  inspectorContext: {
    activeStep: number;
    activeStand?: StandPosition | StandInspectionPosition;
    stadiumDef: Partial<StadiumDefinition>;
    focusSubTarget?: 'dugouts' | 'tunnel' | 'roof' | 'seats' | 'floodlights' | 'surroundings';
  }
): CameraTarget {
  const cx = PITCH_CONFIG.CENTER_X;
  const cy = PITCH_CONFIG.CENTER_Y;
  const { activeStep, activeStand = 'west', stadiumDef, focusSubTarget } = inspectorContext;

  switch (perspective) {
    case 'full_pitch':
      return {
        x: cx,
        y: cy,
        zoom: 0.38,
        pitchTilt: 0.5,
        label: 'FULL PITCH VIEW',
        description: 'Classic broadcast overview framing the entire pitch, sidelines, and surroundings.',
      };

    case 'stands': {
      const standCoords = getStandCameraCoordinates(activeStand);
      return {
        x: standCoords.x,
        y: standCoords.y,
        zoom: standCoords.zoom,
        pitchTilt: 0.5,
        label: `STANDS VIEW (${activeStand.toUpperCase()})`,
        description: `Grandstand inspection framing the ${activeStand.toUpperCase()} spectator tiers and architecture.`,
      };
    }

    case 'field_focus':
      return {
        x: cx,
        y: cy,
        zoom: 0.85,
        pitchTilt: 0.55,
        label: 'PLAYING FIELD FOCUS',
        description: 'Pitch-level focus on grass mowing stripes, penalty boxes, and goal netting.',
      };

    case 'aerial_sky':
      return {
        x: cx,
        y: cy - 140,
        zoom: 0.26,
        pitchTilt: 0.35,
        label: 'AERIAL SKY-CAM (FAR)',
        description: 'High-altitude bird’s-eye perspective showing outer architecture and horizon.',
      };

    case 'tunnel': {
      const tunnelSiting = stadiumDef?.tunnel?.siting || 'center_main';
      const tunnelCoords = getTunnelCameraCoordinates(tunnelSiting);
      return {
        x: tunnelCoords.x,
        y: tunnelCoords.y,
        zoom: tunnelCoords.zoom,
        pitchTilt: 0.7,
        label: 'TUNNEL WALKOUT CAM',
        description: 'Dramatic low-angle cinematic perspective previewing player matchday walkouts.',
      };
    }

    case 'bench': {
      const benchCoords = getDugoutCameraCoordinates();
      return {
        x: benchCoords.x,
        y: benchCoords.y,
        zoom: benchCoords.zoom,
        pitchTilt: 0.65,
        label: 'DUGOUT BENCH CAM',
        description: 'Touchline perspective framing manager, substitutes, and coaching technical box.',
      };
    }

    case 'relevant':
    default: {
      // DYNAMIC RELEVANT VIEW: Auto-frames whatever the user is editing in the inspector!
      if (focusSubTarget === 'dugouts' || (activeStep === 3 && focusSubTarget !== 'tunnel')) {
        const benchCoords = getDugoutCameraCoordinates();
        return {
          x: benchCoords.x,
          y: benchCoords.y,
          zoom: benchCoords.zoom,
          pitchTilt: 0.65,
          label: 'RELEVANT: DUGOUTS',
          description: 'Auto-framing technical area benches and substitute shelters.',
        };
      }

      if (focusSubTarget === 'tunnel') {
        const tunnelSiting = stadiumDef?.tunnel?.siting || 'center_main';
        const tunnelCoords = getTunnelCameraCoordinates(tunnelSiting);
        return {
          x: tunnelCoords.x,
          y: tunnelCoords.y,
          zoom: tunnelCoords.zoom,
          pitchTilt: 0.7,
          label: 'RELEVANT: ENTRANCE TUNNEL',
          description: 'Auto-framing player entrance portal and walkout corridor.',
        };
      }

      if (activeStep === 1) {
        if (focusSubTarget === 'surroundings') {
          return {
            x: cx,
            y: cy - 220,
            zoom: 0.28,
            pitchTilt: 0.3,
            label: 'RELEVANT: SURROUNDINGS SKYLINE',
            description: 'Auto-framing perimeter skyline, mountains, and environmental surroundings.',
          };
        }
        return {
          x: cx,
          y: cy,
          zoom: 0.36,
          pitchTilt: 0.45,
          label: 'RELEVANT: STADIUM SHAPE',
          description: 'Auto-framing stadium perimeter and bowl geometry.',
        };
      }

      if (activeStep === 2) {
        const standCoords = getStandCameraCoordinates(activeStand);
        return {
          x: standCoords.x,
          y: standCoords.y,
          zoom: standCoords.zoom,
          pitchTilt: 0.5,
          label: `RELEVANT: ${activeStand.toUpperCase()} STAND`,
          description: `Auto-framing ${activeStand.toUpperCase()} grandstand tiers, grade, and roof.`,
        };
      }

      if (activeStep === 5) {
        return {
          x: cx,
          y: cy,
          zoom: 0.40,
          pitchTilt: 0.5,
          label: 'RELEVANT: SEAT PATTERNS',
          description: 'Full bowl overview showcasing grandstand seating patterns and club colors.',
        };
      }

      if (activeStep === 6) {
        return {
          x: cx,
          y: cy - 80,
          zoom: 0.34,
          pitchTilt: 0.4,
          label: 'RELEVANT: FLOODLIGHTS & ATMOSPHERE',
          description: 'Overhead view showcasing atmospheric lighting and floodlight towers.',
        };
      }

      // Default fallback
      return {
        x: cx,
        y: cy,
        zoom: 0.38,
        pitchTilt: 0.5,
        label: 'RELEVANT: FULL VENUE',
        description: 'Auto-framing current venue configuration.',
      };
    }
  }
}

/**
 * Smooth camera interpolation helper (exponential decay for 60 FPS silky swoop)
 */
export function lerpCamera(
  current: { x: number; y: number; zoom: number; pitchTilt?: number },
  target: { x: number; y: number; zoom: number; pitchTilt?: number },
  factor = 0.12
) {
  const clampF = Math.max(0.01, Math.min(1.0, factor));
  return {
    x: current.x + (target.x - current.x) * clampF,
    y: current.y + (target.y - current.y) * clampF,
    zoom: current.zoom + (target.zoom - current.zoom) * clampF,
    pitchTilt: (current.pitchTilt ?? 0.5) + ((target.pitchTilt ?? 0.5) - (current.pitchTilt ?? 0.5)) * clampF,
  };
}

/**
 * Matchday Cinematics Camera Presets (Section 14.1 Dual-Purpose)
 */
export function getCinematicCameraPreset(
  action: 'walkout' | 'anthem' | 'sub_home' | 'sub_away' | 'goal_celebration' | 'bench_reaction',
  stadiumDef?: StadiumDefinition
): CameraTarget {
  const tunnelCoords = getTunnelCameraCoordinates(stadiumDef?.tunnel?.siting || 'center_main');
  const benchCoords = getDugoutCameraCoordinates();
  const cx = PITCH_CONFIG.CENTER_X;
  const cy = PITCH_CONFIG.CENTER_Y;

  switch (action) {
    case 'walkout':
      return {
        x: tunnelCoords.x,
        y: tunnelCoords.y,
        zoom: 1.35,
        pitchTilt: 0.7,
        label: 'WALKOUT CINEMATIC',
        description: 'Tunnel camera framing players walking onto pitch.',
      };
    case 'anthem':
      return {
        x: cx,
        y: cy,
        zoom: 0.75,
        pitchTilt: 0.6,
        label: 'ANTHEM LINEUP',
        description: 'Midfield lineup camera tracking captains and anthems.',
      };
    case 'sub_home':
    case 'sub_away':
    case 'bench_reaction':
      return {
        x: benchCoords.x,
        y: benchCoords.y,
        zoom: 1.25,
        pitchTilt: 0.65,
        label: 'TECHNICAL BENCH CINEMATIC',
        description: 'Touchline camera framing substitution and coach reaction.',
      };
    case 'goal_celebration':
      return {
        x: cx,
        y: cy,
        zoom: 0.95,
        pitchTilt: 0.55,
        label: 'CELEBRATION CLOSE-UP',
        description: 'Corner flag & touchline celebration camera.',
      };
  }
}
