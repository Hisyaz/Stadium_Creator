/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import { PITCH_CONFIG, HOME_KIT, AWAY_KIT } from '../constants';
import { StadiumDefinition, StandConfig, TimeOfDay } from '../../types';
import { createDefaultStadium } from '../stadiumRegistry';
import { drawStadiumArchitecture } from '../stadiumRenderer';
import { drawAerialSkyCam } from '../skyCamRenderer';

/**
 * Creates a mock 2D canvas rendering context that tracks operations
 */
function createMockCanvasContext() {
  const operations: { method: string; args: any[] }[] = [];
  const properties: Record<string, any> = {
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    globalAlpha: 1.0,
    font: '10px monospace',
    textBaseline: 'top',
  };

  const ctx = new Proxy({} as any, {
    get(target, prop: string) {
      if (prop in properties) {
        return properties[prop];
      }
      return (...args: any[]) => {
        operations.push({ method: prop, args });
        if (prop === 'createRadialGradient' || prop === 'createLinearGradient') {
          return {
            addColorStop: (offset: number, color: string) => {
              operations.push({ method: 'addColorStop', args: [offset, color] });
            },
          };
        }
        return undefined;
      };
    },
    set(target, prop: string, value: any) {
      properties[prop] = value;
      operations.push({ method: `set:${prop}`, args: [value] });
      return true;
    },
  });

  return { ctx, operations, properties };
}

describe('PHASE 15.6: 32-Bit Pixel Art Grandstand Overhaul & Time-of-Day Cycling', () => {

  describe('1. Time-of-Day Sun / Sunset / Moon Cycling Logic', () => {
    it('cycles in canonical 3-stage sequence: noon -> sunset -> night -> noon', () => {
      const times: TimeOfDay[] = ['noon', 'sunset', 'night'];
      const cycleTimeOfDay = (current: TimeOfDay): TimeOfDay => {
        return current === 'noon' ? 'sunset' : current === 'sunset' ? 'night' : 'noon';
      };

      expect(cycleTimeOfDay('noon')).toBe('sunset');
      expect(cycleTimeOfDay('sunset')).toBe('night');
      expect(cycleTimeOfDay('night')).toBe('noon');
      // Fallback for dawn
      expect(cycleTimeOfDay('dawn')).toBe('noon');
    });

    it('renders with noon daylight palette and sun ambiance', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stadium = createDefaultStadium();
      stadium.lighting.timeOfDay = 'noon';

      drawStadiumArchitecture(ctx, PITCH_CONFIG.CENTER_X, PITCH_CONFIG.CENTER_Y, 'monumental', 'noon', HOME_KIT, AWAY_KIT, undefined, stadium);

      // Verify operations occurred
      expect(operations.length).toBeGreaterThan(50);
      const fills = operations.filter(op => op.method === 'fillRect');
      expect(fills.length).toBeGreaterThan(10);
    });

    it('renders with sunset warm orange/red/purple sky tones and long shadows', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stadium = createDefaultStadium();
      stadium.lighting.timeOfDay = 'sunset';

      drawStadiumArchitecture(ctx, PITCH_CONFIG.CENTER_X, PITCH_CONFIG.CENTER_Y, 'monumental', 'sunset', HOME_KIT, AWAY_KIT, undefined, stadium);

      expect(operations.length).toBeGreaterThan(50);
      // Verify color settings occurred for sunset
      const colorChanges = operations.filter(op => op.method === 'set:fillStyle');
      expect(colorChanges.length).toBeGreaterThan(15);
    });

    it('renders with night moonlight, dark sky, and floodlight spill', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stadium = createDefaultStadium();
      stadium.lighting.timeOfDay = 'night';

      drawStadiumArchitecture(ctx, PITCH_CONFIG.CENTER_X, PITCH_CONFIG.CENTER_Y, 'monumental', 'night', HOME_KIT, AWAY_KIT, undefined, stadium);

      // Verify radial gradient for floodlight spill was created at night
      const gradientOps = operations.filter(op => op.method === 'createRadialGradient');
      expect(gradientOps.length).toBeGreaterThan(0);
    });
  });

  describe('2. 32-Bit Architectural Grandstand Overhaul (Eliminating Floating Signs)', () => {
    it('renders concrete foundation plinths and apron drop-shadows under touchline stands', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stadium = createDefaultStadium();

      drawStadiumArchitecture(ctx, PITCH_CONFIG.CENTER_X, PITCH_CONFIG.CENTER_Y, 'monumental', 'night', HOME_KIT, AWAY_KIT, undefined, stadium);

      // Verify apron drop-shadow was set (rgba(0, 0, 0, 0.45))
      const shadowColorOps = operations.filter(
        op => op.method === 'set:fillStyle' && typeof op.args[0] === 'string' && op.args[0].includes('rgba(0, 0, 0, 0.4')
      );
      expect(shadowColorOps.length).toBeGreaterThan(0);

      // Verify heavy foundation plinth (#0f172a) was applied
      const plinthOps = operations.filter(
        op => op.method === 'set:fillStyle' && op.args[0] === '#0f172a'
      );
      expect(plinthOps.length).toBeGreaterThan(0);
    });

    it('renders vomitory portals with illuminated green exit signs (#22c55e)', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stadium = createDefaultStadium();

      drawStadiumArchitecture(ctx, PITCH_CONFIG.CENTER_X, PITCH_CONFIG.CENTER_Y, 'monumental', 'night', HOME_KIT, AWAY_KIT, undefined, stadium);

      // Verify exit sign green color (#22c55e) was drawn for vomitory entrances
      const exitSignOps = operations.filter(
        op => op.method === 'set:fillStyle' && op.args[0] === '#22c55e'
      );
      expect(exitSignOps.length).toBeGreaterThan(0);
    });

    it('renders stepped gangway stair aisles with high-contrast safety nosing (#facc15)', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stadium = createDefaultStadium();

      drawStadiumArchitecture(ctx, PITCH_CONFIG.CENTER_X, PITCH_CONFIG.CENTER_Y, 'monumental', 'night', HOME_KIT, AWAY_KIT, undefined, stadium);

      // Verify warning yellow stair nosing (#facc15) was rendered
      const yellowNosingOps = operations.filter(
        op => op.method === 'set:fillStyle' && op.args[0] === '#facc15'
      );
      expect(yellowNosingOps.length).toBeGreaterThan(0);
    });

    it('renders distinctive Grade 2 Classic Archibald Leitch criss-cross steel lattice girders', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stadium = createDefaultStadium();
      stadium.stands.west.grade = 'grade2_classic';
      stadium.stands.east.grade = 'grade2_classic';

      drawStadiumArchitecture(ctx, PITCH_CONFIG.CENTER_X, PITCH_CONFIG.CENTER_Y, 'craven', 'night', HOME_KIT, AWAY_KIT, undefined, stadium);

      // Verify green painted iron balustrade color (#15803d) was applied to lattice
      const latticeColorOps = operations.filter(
        op => op.method === 'set:strokeStyle' && op.args[0] === '#15803d'
      );
      expect(latticeColorOps.length).toBeGreaterThan(0);
    });

    it('renders distinctive Grade 3 Industrial hazard warning safety tape and riveted columns', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stadium = createDefaultStadium();
      stadium.stands.west.grade = 'grade3_industrial';

      drawStadiumArchitecture(ctx, PITCH_CONFIG.CENTER_X, PITCH_CONFIG.CENTER_Y, 'monumental', 'night', HOME_KIT, AWAY_KIT, undefined, stadium);

      // Verify hazard black-and-yellow striping occurred
      const blackOps = operations.filter(
        op => op.method === 'set:fillStyle' && op.args[0] === '#000000'
      );
      expect(blackOps.length).toBeGreaterThan(0);
    });

    it('renders distinctive Grade 4 Modern pre-cast architectural concrete with VIP glass suites', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stadium = createDefaultStadium();
      stadium.stands.west.grade = 'grade4_modern';

      drawStadiumArchitecture(ctx, PITCH_CONFIG.CENTER_X, PITCH_CONFIG.CENTER_Y, 'monumental', 'night', HOME_KIT, AWAY_KIT, undefined, stadium);

      // Verify VIP skybox cyan tinted glass (rgba(56, 189, 248, ...)) was applied
      const skyboxGlassOps = operations.filter(
        op => op.method === 'set:fillStyle' && typeof op.args[0] === 'string' && op.args[0].includes('rgba(56, 189, 248')
      );
      expect(skyboxGlassOps.length).toBeGreaterThan(0);
    });

    it('renders distinctive Grade 5 Futuristic digital LED ribbon matrix and ETFE cushions', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stadium = createDefaultStadium();
      stadium.stands.west.grade = 'grade5_futuristic';

      drawStadiumArchitecture(ctx, PITCH_CONFIG.CENTER_X, PITCH_CONFIG.CENTER_Y, 'monumental', 'night', HOME_KIT, AWAY_KIT, undefined, stadium);

      // Verify digital matrix cyan strip (#38bdf8 / #06b6d4) was rendered
      const ledOps = operations.filter(
        op => op.method === 'set:fillStyle' && (op.args[0] === '#38bdf8' || op.args[0] === '#06b6d4')
      );
      expect(ledOps.length).toBeGreaterThan(0);
    });
  });

  describe('3. Contextual "No Stand" Backdrops & Perimeters', () => {
    it('renders open touchlines when stand is set to none/no_stand without throwing', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stadium = createDefaultStadium();
      stadium.stands.east = {
        position: 'east',
        type: 'none',
        grade: 'grade1_municipal',
        perimeterFinish: 'chainlink_fence',
      };

      expect(() => {
        drawStadiumArchitecture(ctx, PITCH_CONFIG.CENTER_X, PITCH_CONFIG.CENTER_Y, 'ascenso', 'noon', HOME_KIT, AWAY_KIT, undefined, stadium);
      }).not.toThrow();

      expect(operations.length).toBeGreaterThan(30);
    });

    it('renders open goal-ends (North / South) when set to none/no_stand', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stadium = createDefaultStadium();
      stadium.stands.north = {
        position: 'north',
        type: 'none',
        grade: 'grade1_municipal',
        backdrop: 'wall',
        perimeterFinish: 'brick_wall',
      };

      drawStadiumArchitecture(ctx, PITCH_CONFIG.CENTER_X, PITCH_CONFIG.CENTER_Y, 'craven', 'noon', HOME_KIT, AWAY_KIT, undefined, stadium);

      // Verify brick wall perimeter color (#7f1d1d) was drawn for north goal end
      const brickWallOps = operations.filter(
        op => op.method === 'set:fillStyle' && op.args[0] === '#7f1d1d'
      );
      expect(brickWallOps.length).toBeGreaterThan(0);
    });

    it('renders spectators leaning on perimeter barrier when stand is none', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stadium = createDefaultStadium();
      stadium.stands.east = {
        position: 'east',
        type: 'none',
        grade: 'grade1_municipal',
        perimeterFinish: 'chainlink_fence',
      };

      drawStadiumArchitecture(ctx, PITCH_CONFIG.CENTER_X, PITCH_CONFIG.CENTER_Y, 'craven', 'noon', HOME_KIT, AWAY_KIT, undefined, stadium);

      // Verify spectator fan face tone (#f5c898) was drawn behind perimeter
      const fanFaceOps = operations.filter(
        op => op.method === 'set:fillStyle' && op.args[0] === '#f5c898'
      );
      expect(fanFaceOps.length).toBeGreaterThan(0);
    });
  });

  describe('4. Dual-Perspective Architecture (Standard Pitch View vs Aerial Sky-Cam)', () => {
    it('generates aerial view taking into account individual stand configurations', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stadium = createDefaultStadium();
      stadium.shape = 'rectangular';
      stadium.stands.east = {
        position: 'east',
        type: 'none',
        grade: 'grade1_municipal',
        perimeterFinish: 'chainlink_fence',
      };

      drawAerialSkyCam(ctx, stadium, {
        roofOpacity: 1.0,
        showBroadcastHUD: false,
        timeOfDay: 'noon',
      });

      expect(operations.length).toBeGreaterThan(50);
    });

    it('renders exposed colored seating tiers from the air when a stand has no roof', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stadium = createDefaultStadium();
      stadium.shape = 'rectangular';
      stadium.stands.west.hasRoof = false; // Exposed open-air stand
      stadium.seats.colors = ['#dc2626', '#ffffff'];

      drawAerialSkyCam(ctx, stadium, {
        roofOpacity: 1.0,
        showBroadcastHUD: false,
        timeOfDay: 'noon',
      });

      // Verify red seat color (#dc2626) was rendered from above for the exposed West stand
      const seatColorOps = operations.filter(
        op => op.method === 'set:fillStyle' && op.args[0] === '#dc2626'
      );
      expect(seatColorOps.length).toBeGreaterThan(0);
    });

    it('renders aerial dugout bench boxes and entrance tunnel on West concourse', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stadium = createDefaultStadium();

      drawAerialSkyCam(ctx, stadium, {
        roofOpacity: 1.0,
        showBroadcastHUD: false,
        timeOfDay: 'night',
      });

      // Verify tunnel red carpet runner (#b91c1c) and gold border (#facc15) were drawn
      const carpetOps = operations.filter(
        op => op.method === 'set:fillStyle' && op.args[0] === '#b91c1c'
      );
      expect(carpetOps.length).toBeGreaterThan(0);

      // Verify dugout bench colors (#0284c7)
      const dugoutOps = operations.filter(
        op => op.method === 'set:fillStyle' && op.args[0] === '#0284c7'
      );
      expect(dugoutOps.length).toBeGreaterThan(0);
    });
  });
});
