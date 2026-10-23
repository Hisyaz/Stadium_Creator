/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createPreMatchSwoop,
  updatePreMatchSwoop,
  drawAerialSkyCam,
  PreMatchSwoopState,
} from '../skyCamRenderer';
import { drawAerialEnvironment } from '../environmentRenderer';
import { MatchEngine } from '../engine';
import { PITCH_CONFIG, HOME_KIT, AWAY_KIT } from '../constants';
import { createDefaultStadium } from '../stadiumRegistry';
import { StadiumDefinition, SurroundingsType, StandGrade, StadiumShape } from '../../types/stadium';

/**
 * Mock Canvas 2D context for headless unit testing
 */
function createMockCanvasContext(): CanvasRenderingContext2D {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    rect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    clearRect: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    setLineDash: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 100 })),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
    globalAlpha: 1,
    font: '12px sans-serif',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    shadowColor: '',
    shadowBlur: 0,
  } as unknown as CanvasRenderingContext2D;
}

describe('Phase 15: Aerial Sky-Cam Broadcast Presentation & Dual-Layer Outside Environment Engine', () => {
  let mockStadium: StadiumDefinition;
  let mockCtx: CanvasRenderingContext2D;

  beforeEach(() => {
    mockStadium = createDefaultStadium('Estadio Sky-Cam Arena');
    mockCtx = createMockCanvasContext();
  });

  describe('15.1: Dual-Perspective Outside Surroundings Engine (Aerial Bird’s-Eye Graphics)', () => {
    const surroundingsCatalog: SurroundingsType[] = [
      'nature',
      'parking_lot',
      'small_city',
      'big_city',
      'airport',
      'railroad',
      'beach',
      'marine_floating',
    ];

    it('renders all 8 outside environments in aerial perspective without error', () => {
      const bounds = {
        left: -1000,
        top: -1000,
        width: 2000,
        height: 2000,
        stadiumBounds: {
          centerX: PITCH_CONFIG.CENTER_X,
          centerY: PITCH_CONFIG.CENTER_Y,
          outerWidth: 1400,
          outerHeight: 1200,
        },
      };

      for (const env of surroundingsCatalog) {
        expect(() => {
          drawAerialEnvironment(mockCtx, env, 'night', bounds);
        }).not.toThrow();
        expect(mockCtx.save).toHaveBeenCalled();
        expect(mockCtx.restore).toHaveBeenCalled();
      }
    });

    it('adapts environment rendering across different times of day (noon, sunset, night, dawn)', () => {
      const bounds = {
        left: 0,
        top: 0,
        width: 1500,
        height: 1500,
        stadiumBounds: {
          centerX: 750,
          centerY: 750,
          outerWidth: 800,
          outerHeight: 600,
        },
      };

      const times = ['noon', 'sunset', 'night', 'dawn'] as const;
      for (const time of times) {
        expect(() => {
          drawAerialEnvironment(mockCtx, 'airport', time, bounds);
          drawAerialEnvironment(mockCtx, 'big_city', time, bounds);
        }).not.toThrow();
      }
    });
  });

  describe('15.2: 32-Bit High-Altitude Aerial Sky-Cam Renderer', () => {
    it('renders full stadium sky-cam with outer facade, roof geometry, pitch, and broadcast banner', () => {
      expect(() => {
        drawAerialSkyCam(mockCtx, mockStadium, {
          roofOpacity: 1.0,
          showBroadcastHUD: true,
          homeTeamName: 'SPAIN',
          awayTeamName: 'ARGENTINA',
          homeKit: HOME_KIT,
          awayKit: AWAY_KIT,
        });
      }).not.toThrow();

      // Verified drawing elements
      expect(mockCtx.fillRect).toHaveBeenCalled();
      expect(mockCtx.strokeRect).toHaveBeenCalled();
      expect(mockCtx.fillText).toHaveBeenCalledWith(expect.stringContaining('DRAWSTAR TV'), expect.any(Number), expect.any(Number));
    });

    it('renders all 4 architectural stadium shapes (round, oval, square, rectangular)', () => {
      const shapes: StadiumShape[] = ['round', 'oval', 'square', 'rectangular'];

      for (const shape of shapes) {
        const stadium = { ...mockStadium, shape };
        expect(() => {
          drawAerialSkyCam(mockCtx, stadium, {
            roofOpacity: 1.0,
            showBroadcastHUD: false,
          });
        }).not.toThrow();
      }
    });

    it('renders athletics track when hasTrack is enabled on round or oval bowls', () => {
      const trackStadium: StadiumDefinition = {
        ...mockStadium,
        shape: 'round',
        hasTrack: true,
      };

      expect(() => {
        drawAerialSkyCam(mockCtx, trackStadium, {
          roofOpacity: 1.0,
          showBroadcastHUD: false,
        });
      }).not.toThrow();

      expect(mockCtx.ellipse).toHaveBeenCalled();
    });

    it('renders across all 5 architectural stand grades (municipal, classic, industrial, modern, futuristic)', () => {
      const grades: StandGrade[] = [
        'grade1_municipal',
        'grade2_classic',
        'grade3_industrial',
        'grade4_modern',
        'grade5_futuristic',
      ];

      for (const grade of grades) {
        const stadium: StadiumDefinition = {
          ...mockStadium,
          stands: {
            ...mockStadium.stands,
            west: { ...mockStadium.stands.west, grade },
          },
        };

        expect(() => {
          drawAerialSkyCam(mockCtx, stadium, {
            roofOpacity: 1.0,
            showBroadcastHUD: false,
          });
        }).not.toThrow();
      }
    });
  });

  describe('15.3: Seamless Pre-Match Sky-Cam to Pitch-Cam Zoom Swoop Director', () => {
    it('initializes pre-match swoop state at high-altitude sky-cam position', () => {
      const swoop = createPreMatchSwoop(mockStadium, 'BRAZIL', 'FRANCE', 3000);
      expect(swoop.isActive).toBe(true);
      expect(swoop.progress).toBe(0.0);
      expect(swoop.isSkipped).toBe(false);
      expect(swoop.durationMs).toBe(3000);
      expect(swoop.homeTeamName).toBe('BRAZIL');
      expect(swoop.awayTeamName).toBe('FRANCE');
    });

    it('progresses smoothly through cubic ease, interpolating zoom from 0.25 to 1.05 and dissolving roof', () => {
      const swoop = createPreMatchSwoop(mockStadium, 'BRAZIL', 'FRANCE', 2000);
      const startTime = swoop.startTime;

      // 1. Initial State (t = 0.0)
      const initial = updatePreMatchSwoop(swoop, startTime);
      expect(initial.progress).toBeCloseTo(0.0, 2);
      expect(initial.isComplete).toBe(false);
      expect(initial.camera.zoom).toBeCloseTo(0.25, 2);
      expect(initial.camera.pitchTilt).toBeCloseTo(0.32, 2);
      expect(initial.camera.roofOpacity).toBe(1.0);

      // 2. Mid-Point Transition (t = ~0.50 at 1000ms)
      const mid = updatePreMatchSwoop(swoop, startTime + 1000);
      expect(mid.progress).toBeGreaterThan(0.25);
      expect(mid.progress).toBeLessThan(0.75);
      expect(mid.camera.zoom).toBeGreaterThan(0.25);
      expect(mid.camera.zoom).toBeLessThan(1.05);
      expect(mid.camera.roofOpacity).toBeLessThan(1.0); // Roof begins dissolving as camera penetrates

      // 3. Completion State (t = 1.0 at >= 2000ms)
      const end = updatePreMatchSwoop(swoop, startTime + 2000);
      expect(end.progress).toBe(1.0);
      expect(end.isComplete).toBe(true);
      expect(end.camera.zoom).toBeCloseTo(1.05, 2);
      expect(end.camera.pitchTilt).toBeCloseTo(0.50, 2);
      expect(end.camera.roofOpacity).toBe(0.0); // Roof completely dissolved to reveal pitch
      expect(swoop.isActive).toBe(false);
    });

    it('supports immediate skipping on keypress or user tap', () => {
      const swoop = createPreMatchSwoop(mockStadium, 'BRAZIL', 'FRANCE', 3000);
      swoop.isSkipped = true;

      const result = updatePreMatchSwoop(swoop);
      expect(result.isComplete).toBe(true);
      expect(result.camera.zoom).toBe(1.05);
      expect(result.camera.roofOpacity).toBe(0.0);
      expect(swoop.isActive).toBe(false);
    });

    it('integrates seamlessly into MatchEngine lifecycle', () => {
      const engine = new MatchEngine();
      expect(engine.isPreMatchSwoopActive()).toBe(false);

      // Start pre-match swoop
      engine.startPreMatchSwoop(2500);
      expect(engine.isPreMatchSwoopActive()).toBe(true);
      expect(engine.camera.zoom).toBe(0.25);
      expect(engine.camera.pitchTilt).toBe(0.32);

      // Skip pre-match swoop
      engine.skipPreMatchSwoop();
      expect(engine.isPreMatchSwoopActive()).toBe(false);
      expect(engine.camera.zoom).toBe(1.05);
      expect(engine.camera.pitchTilt).toBe(0.5);
    });
  });
});
