/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { PITCH_CONFIG, HOME_KIT, AWAY_KIT } from '../constants';
import { StadiumDefinition, StandConfig, TimeOfDay } from '../../types';
import { createDefaultStadium } from '../stadiumRegistry';
import { drawStadiumArchitecture } from '../stadiumRenderer';
import { getBackdropsForSurroundings, SurroundingsType, PerimeterFinishType } from '../../types/stadium';

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

describe('PHASE 15.7: Flavor-Rich "No Stand" Atmospheric Backdrops & Multi-Material Perimeter Enclosure Suite', () => {

  describe('1. 15.7.1 Atmospheric Contextual Backdrops Tied Directly to Surroundings', () => {
    it('provides rich backdrop catalogs for all surroundings via getBackdropsForSurroundings', () => {
      const surroundingsList: SurroundingsType[] = [
        'mountains',
        'forest',
        'savannah',
        'highway',
        'small_city',
        'big_city',
        'airport',
        'railroad',
        'beach',
        'marine_floating',
        'parking_lot',
      ];

      for (const sur of surroundingsList) {
        const backdrops = getBackdropsForSurroundings(sur);
        expect(backdrops.length).toBeGreaterThanOrEqual(4);
        // Universal wall must always be present
        expect(backdrops.some(b => b.id === 'wall')).toBe(true);
      }
    });

    it('renders Mountains backdrop with jagged alpine peaks, snow caps, ski chalets & cable car pylons', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stadium = createDefaultStadium();
      stadium.surroundings = 'mountains';
      stadium.stands.east = {
        position: 'east',
        type: 'none',
        grade: 'grade1_municipal',
        backdrop: 'alpine_peaks',
        perimeterFinish: 'chainlink_fence',
      };

      drawStadiumArchitecture(ctx, PITCH_CONFIG.CENTER_X, PITCH_CONFIG.CENTER_Y, 'craven', 'noon', HOME_KIT, AWAY_KIT, undefined, stadium);

      // Verify snow dust cap color (#f8fafc) and chalet timber (#78350f)
      const snowCapOps = operations.filter(op => op.method === 'set:fillStyle' && op.args[0] === '#f8fafc');
      expect(snowCapOps.length).toBeGreaterThan(0);
      const chaletTimberOps = operations.filter(op => op.method === 'set:fillStyle' && op.args[0] === '#78350f');
      expect(chaletTimberOps.length).toBeGreaterThan(0);
    });

    it('renders Forest backdrop with multi-layered woodland canopy, fire access roads & ranger lookout tower', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stadium = createDefaultStadium();
      stadium.surroundings = 'forest';
      stadium.stands.north = {
        position: 'north',
        type: 'none',
        grade: 'grade1_municipal',
        backdrop: 'dense_woodland',
        perimeterFinish: 'rustic_timber',
      };

      drawStadiumArchitecture(ctx, PITCH_CONFIG.CENTER_X, PITCH_CONFIG.CENTER_Y, 'craven', 'noon', HOME_KIT, AWAY_KIT, undefined, stadium);

      // Verify fire road dirt color (#92400e) and lookout cabin glass (#38bdf8)
      const dirtRoadOps = operations.filter(op => op.method === 'set:fillStyle' && op.args[0] === '#92400e');
      expect(dirtRoadOps.length).toBeGreaterThan(0);
      const cabinGlassOps = operations.filter(op => op.method === 'set:fillStyle' && op.args[0] === '#38bdf8');
      expect(cabinGlassOps.length).toBeGreaterThan(0);
    });

    it('renders Savannah backdrop with golden grassy plains, sandstone kopjes, umbrella acacias & wildlife silhouette', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stadium = createDefaultStadium();
      stadium.surroundings = 'savannah';
      stadium.stands.east = {
        position: 'east',
        type: 'none',
        grade: 'grade1_municipal',
        backdrop: 'acacia_plains',
        perimeterFinish: 'chainlink_fence',
      };

      drawStadiumArchitecture(ctx, PITCH_CONFIG.CENTER_X, PITCH_CONFIG.CENTER_Y, 'craven', 'noon', HOME_KIT, AWAY_KIT, undefined, stadium);

      // Verify golden steppe (#d97706) and acacia canopy (#15803d)
      const goldenSteppeOps = operations.filter(op => op.method === 'set:fillStyle' && op.args[0] === '#d97706');
      expect(goldenSteppeOps.length).toBeGreaterThan(0);
      const acaciaCanopyOps = operations.filter(op => op.method === 'set:fillStyle' && op.args[0] === '#15803d');
      expect(acaciaCanopyOps.length).toBeGreaterThan(0);
    });

    it('renders Highway backdrop with elevated multi-lane freeway, sign gantries, and headlights/taillights', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stadium = createDefaultStadium();
      stadium.surroundings = 'highway';
      stadium.stands.south = {
        position: 'south',
        type: 'none',
        grade: 'grade1_municipal',
        backdrop: 'elevated_viaduct',
        perimeterFinish: 'concrete_wall',
      };

      drawStadiumArchitecture(ctx, PITCH_CONFIG.CENTER_X, PITCH_CONFIG.CENTER_Y, 'craven', 'night', HOME_KIT, AWAY_KIT, undefined, stadium);

      // Verify highway median (#facc15) and interstate green sign (#15803d)
      const medianOps = operations.filter(op => op.method === 'set:fillStyle' && op.args[0] === '#facc15');
      expect(medianOps.length).toBeGreaterThan(0);
      const signOps = operations.filter(op => op.method === 'set:fillStyle' && op.args[0] === '#15803d');
      expect(signOps.length).toBeGreaterThan(0);
    });

    it('renders Airport backdrop with active runway, threshold piano keys, approach lighting & airliners', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stadium = createDefaultStadium();
      stadium.surroundings = 'airport';
      stadium.stands.north = {
        position: 'north',
        type: 'none',
        grade: 'grade1_municipal',
        backdrop: 'runway',
        perimeterFinish: 'chainlink_fence',
      };

      drawStadiumArchitecture(ctx, PITCH_CONFIG.CENTER_X, PITCH_CONFIG.CENTER_Y, 'craven', 'night', HOME_KIT, AWAY_KIT, undefined, stadium);

      // Verify approach green threshold lamps (#22c55e) and white threshold piano keys (#ffffff)
      const greenLampOps = operations.filter(op => op.method === 'set:fillStyle' && op.args[0] === '#22c55e');
      expect(greenLampOps.length).toBeGreaterThan(0);
      const whiteThresholdOps = operations.filter(op => op.method === 'set:fillStyle' && op.args[0] === '#ffffff');
      expect(whiteThresholdOps.length).toBeGreaterThan(0);
    });

    it('renders Railroad backdrop with multi-track ballast gravel, switching signals & boxcars', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stadium = createDefaultStadium();
      stadium.surroundings = 'railroad';
      stadium.stands.north = {
        position: 'north',
        type: 'none',
        grade: 'grade1_municipal',
        backdrop: 'train_depot',
        perimeterFinish: 'chainlink_fence',
      };

      drawStadiumArchitecture(ctx, PITCH_CONFIG.CENTER_X, PITCH_CONFIG.CENTER_Y, 'craven', 'noon', HOME_KIT, AWAY_KIT, undefined, stadium);

      // Verify gravel ballast (#44403c), steel rails (#94a3b8), and red/green signals
      const ballastOps = operations.filter(op => op.method === 'set:fillStyle' && op.args[0] === '#44403c');
      expect(ballastOps.length).toBeGreaterThan(0);
      const railOps = operations.filter(op => op.method === 'set:fillStyle' && op.args[0] === '#94a3b8');
      expect(railOps.length).toBeGreaterThan(0);
    });

    it('renders Beach backdrop with sand dunes, swaying coconut palms, turquoise surf & cabanas', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stadium = createDefaultStadium();
      stadium.surroundings = 'beach';
      stadium.stands.west = {
        position: 'west',
        type: 'none',
        grade: 'grade1_municipal',
        backdrop: 'beach_seaside',
        perimeterFinish: 'rustic_timber',
      };

      drawStadiumArchitecture(ctx, PITCH_CONFIG.CENTER_X, PITCH_CONFIG.CENTER_Y, 'craven', 'noon', HOME_KIT, AWAY_KIT, undefined, stadium);

      // Verify turquoise surf (#06b6d4) and golden sand dunes (#fde047)
      const surfOps = operations.filter(op => op.method === 'set:fillStyle' && op.args[0] === '#06b6d4');
      expect(surfOps.length).toBeGreaterThan(0);
      const sandOps = operations.filter(op => op.method === 'set:fillStyle' && op.args[0] === '#fde047');
      expect(sandOps.length).toBeGreaterThan(0);
    });

    it('renders Marine Floating backdrop with open seawater bay, wooden marina piers & moored vessels', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stadium = createDefaultStadium();
      stadium.surroundings = 'marine_floating';
      stadium.stands.east = {
        position: 'east',
        type: 'none',
        grade: 'grade1_municipal',
        backdrop: 'open_ocean',
        perimeterFinish: 'chainlink_fence',
      };

      drawStadiumArchitecture(ctx, PITCH_CONFIG.CENTER_X, PITCH_CONFIG.CENTER_Y, 'craven', 'noon', HOME_KIT, AWAY_KIT, undefined, stadium);

      // Verify deep azure marine water (#0369a1) and orange buoy (#ea580c)
      const waterOps = operations.filter(op => op.method === 'set:fillStyle' && op.args[0] === '#0369a1');
      expect(waterOps.length).toBeGreaterThan(0);
      const buoyOps = operations.filter(op => op.method === 'set:fillStyle' && op.args[0] === '#ea580c');
      expect(buoyOps.length).toBeGreaterThan(0);
    });

    it('renders Universal Wall with customizable material (brick, concrete, stone, timber, metal)', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stadium = createDefaultStadium();
      stadium.stands.north = {
        position: 'north',
        type: 'none',
        grade: 'grade1_municipal',
        backdrop: 'wall',
        wallPerimeter: {
          size: 'tall',
          material: 'stone',
        },
        perimeterFinish: 'brick_wall',
      };

      drawStadiumArchitecture(ctx, PITCH_CONFIG.CENTER_X, PITCH_CONFIG.CENTER_Y, 'craven', 'noon', HOME_KIT, AWAY_KIT, undefined, stadium);

      // Verify stone wall color (#57534e) was rendered
      const stoneOps = operations.filter(op => op.method === 'set:fillStyle' && op.args[0] === '#57534e');
      expect(stoneOps.length).toBeGreaterThan(0);
    });
  });

  describe('2. 15.7.2 High-Fidelity Perimeter Enclosure Suite (5 Options)', () => {
    it('renders 1. Chainlink Steel Fence with diamond wire mesh, tubular rail & barbed wire outrigger arms', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stadium = createDefaultStadium();
      stadium.stands.east = {
        position: 'east',
        type: 'none',
        grade: 'grade1_municipal',
        perimeterFinish: 'chainlink_fence',
      };

      drawStadiumArchitecture(ctx, PITCH_CONFIG.CENTER_X, PITCH_CONFIG.CENTER_Y, 'craven', 'noon', HOME_KIT, AWAY_KIT, undefined, stadium);

      // Verify wire mesh stroke ('rgba(203, 213, 225, 0.45)') and barbed wire arms (#e2e8f0)
      const wireMeshOps = operations.filter(
        op => op.method === 'set:strokeStyle' && typeof op.args[0] === 'string' && op.args[0].includes('rgba(203, 213, 225')
      );
      expect(wireMeshOps.length).toBeGreaterThan(0);
      const barbedArmOps = operations.filter(op => op.method === 'set:fillStyle' && op.args[0] === '#e2e8f0');
      expect(barbedArmOps.length).toBeGreaterThan(0);
    });

    it('renders 2. Weathered Brick Wall with red brick courses, moss patches & stone coping caps', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stadium = createDefaultStadium();
      stadium.stands.north = {
        position: 'north',
        type: 'none',
        grade: 'grade1_municipal',
        perimeterFinish: 'brick_wall',
      };

      drawStadiumArchitecture(ctx, PITCH_CONFIG.CENTER_X, PITCH_CONFIG.CENTER_Y, 'craven', 'noon', HOME_KIT, AWAY_KIT, undefined, stadium);

      // Verify red brick (#7f1d1d), moss patches (#15803d), and stone coping cap (#fef08a)
      const brickOps = operations.filter(op => op.method === 'set:fillStyle' && op.args[0] === '#7f1d1d');
      expect(brickOps.length).toBeGreaterThan(0);
      const mossOps = operations.filter(op => op.method === 'set:fillStyle' && op.args[0] === '#15803d');
      expect(mossOps.length).toBeGreaterThan(0);
      const copingOps = operations.filter(op => op.method === 'set:fillStyle' && op.args[0] === '#fef08a');
      expect(copingOps.length).toBeGreaterThan(0);
    });

    it('renders 3. Pre-Cast Concrete Security Wall with expansion seams, weep holes & graffiti tags', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stadium = createDefaultStadium();
      stadium.stands.east = {
        position: 'east',
        type: 'none',
        grade: 'grade1_municipal',
        perimeterFinish: 'concrete_wall',
      };

      drawStadiumArchitecture(ctx, PITCH_CONFIG.CENTER_X, PITCH_CONFIG.CENTER_Y, 'craven', 'noon', HOME_KIT, AWAY_KIT, undefined, stadium);

      // Verify concrete wall color (#475569) and graffiti tags (#ef4444 / #38bdf8)
      const concreteOps = operations.filter(op => op.method === 'set:fillStyle' && op.args[0] === '#475569');
      expect(concreteOps.length).toBeGreaterThan(0);
      const graffitiOps = operations.filter(
        op => op.method === 'set:fillStyle' && (op.args[0] === '#ef4444' || op.args[0] === '#38bdf8')
      );
      expect(graffitiOps.length).toBeGreaterThan(0);
    });

    it('renders 4. Rustic Timber Palisade with vertical wood palings, forged iron nail studs & cross-timbers', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stadium = createDefaultStadium();
      stadium.stands.west = {
        position: 'west',
        type: 'none',
        grade: 'grade1_municipal',
        perimeterFinish: 'rustic_timber',
      };

      drawStadiumArchitecture(ctx, PITCH_CONFIG.CENTER_X, PITCH_CONFIG.CENTER_Y, 'craven', 'noon', HOME_KIT, AWAY_KIT, undefined, stadium);

      // Verify timber wood (#78350f), forged iron nail studs (#1c1917), and cross-timber (#92400e)
      const timberOps = operations.filter(op => op.method === 'set:fillStyle' && op.args[0] === '#78350f');
      expect(timberOps.length).toBeGreaterThan(0);
      const ironNailOps = operations.filter(op => op.method === 'set:fillStyle' && op.args[0] === '#1c1917');
      expect(ironNailOps.length).toBeGreaterThan(0);
      const crossBeamOps = operations.filter(op => op.method === 'set:fillStyle' && op.args[0] === '#92400e');
      expect(crossBeamOps.length).toBeGreaterThan(0);
    });

    it('renders 5. Corrugated Hoarding Barrier with fluting ribs & retro hand-painted sponsor ads', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stadium = createDefaultStadium();
      stadium.stands.south = {
        position: 'south',
        type: 'none',
        grade: 'grade1_municipal',
        perimeterFinish: 'corrugated_hoarding',
      };

      drawStadiumArchitecture(ctx, PITCH_CONFIG.CENTER_X, PITCH_CONFIG.CENTER_Y, 'craven', 'noon', HOME_KIT, AWAY_KIT, undefined, stadium);

      // Verify metal hoarding panels (#64748b) and sponsor ad banners
      const hoardingOps = operations.filter(op => op.method === 'set:fillStyle' && op.args[0] === '#64748b');
      expect(hoardingOps.length).toBeGreaterThan(0);
      const adColorOps = operations.filter(
        op => op.method === 'set:fillStyle' && (op.args[0] === '#dc2626' || op.args[0] === '#2563eb' || op.args[0] === '#15803d')
      );
      expect(adColorOps.length).toBeGreaterThan(0);
    });
  });

  describe('3. 15.7.3 Grassroots Fan Presence & Touchline Atmosphere', () => {
    it('renders standing supporters leaning on perimeter barrier with club colors, caps, scarves & drinks', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stadium = createDefaultStadium();
      stadium.stands.east = {
        position: 'east',
        type: 'none',
        grade: 'grade1_municipal',
        perimeterFinish: 'chainlink_fence',
        hasGrassrootsFans: true,
      };

      drawStadiumArchitecture(ctx, PITCH_CONFIG.CENTER_X, PITCH_CONFIG.CENTER_Y, 'craven', 'noon', HOME_KIT, AWAY_KIT, undefined, stadium);

      // Verify fan faces (skin tone #f5c898), newsboy caps (#334155), scarves (#facc15), and beer (#f59e0b)
      const faceOps = operations.filter(op => op.method === 'set:fillStyle' && op.args[0] === '#f5c898');
      expect(faceOps.length).toBeGreaterThan(0);
      const capOps = operations.filter(op => op.method === 'set:fillStyle' && op.args[0] === '#334155');
      expect(capOps.length).toBeGreaterThan(0);
      const scarfOps = operations.filter(op => op.method === 'set:fillStyle' && op.args[0] === '#facc15');
      expect(scarfOps.length).toBeGreaterThan(0);
      const drinkOps = operations.filter(op => op.method === 'set:fillStyle' && op.args[0] === '#f59e0b');
      expect(drinkOps.length).toBeGreaterThan(0);
    });

    it('can disable grassroots supporters via hasGrassrootsFans: false', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stadium = createDefaultStadium();
      stadium.stands.east = {
        position: 'east',
        type: 'none',
        grade: 'grade1_municipal',
        perimeterFinish: 'chainlink_fence',
        hasGrassrootsFans: false,
      };

      drawStadiumArchitecture(ctx, PITCH_CONFIG.CENTER_X, PITCH_CONFIG.CENTER_Y, 'craven', 'noon', HOME_KIT, AWAY_KIT, undefined, stadium);

      // When fans are disabled, drink foam and beer colors are not drawn for this stand
      const drinkOps = operations.filter(op => op.method === 'set:fillStyle' && op.args[0] === '#f59e0b');
      expect(drinkOps.length).toBe(0);
    });
  });
});
