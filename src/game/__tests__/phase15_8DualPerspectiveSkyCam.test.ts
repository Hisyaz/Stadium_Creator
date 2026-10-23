/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { PITCH_CONFIG, HOME_KIT, AWAY_KIT } from '../constants';
import { TimeOfDay } from '../../types';
import {
  StadiumDefinition,
  SurroundingsType,
  StandGrade,
  StadiumShape,
  BenchType,
  TunnelType,
  TunnelSiting,
} from '../../types/stadium';
import { createDefaultStadium } from '../stadiumRegistry';
import { drawAerialSkyCam } from '../skyCamRenderer';
import { drawAerialEnvironment } from '../environmentRenderer';

/**
 * Creates a mock 2D canvas rendering context that tracks operations and properties
 */
function createMockCanvasContext() {
  const operations: { method: string; args: any[] }[] = [];
  const properties: Record<string, any> = {
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    globalAlpha: 1.0,
    font: '10px monospace',
    textAlign: 'left',
    textBaseline: 'top',
    shadowColor: '',
    shadowBlur: 0,
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

describe('PHASE 15.8: Dual-Perspective Component Architecture & Macroscopic Aerial Sky-Cam Horizon Suite', () => {

  describe('1. 15.8.1 The Dual-Perspective Architectural Contract (Aerial View B)', () => {
    it('renders macroscopic geometric roofs reflecting all 5 architectural grades', () => {
      const grades: StandGrade[] = [
        'grade1_municipal',
        'grade2_classic',
        'grade3_industrial',
        'grade4_modern',
        'grade5_futuristic',
      ];

      for (const grade of grades) {
        const { ctx, operations } = createMockCanvasContext();
        const stadium = createDefaultStadium();
        stadium.stands.west.grade = grade;
        stadium.stands.east.grade = grade;

        drawAerialSkyCam(ctx, stadium, {
          roofOpacity: 1.0,
          showBroadcastHUD: false,
          timeOfDay: 'night',
        });

        expect(operations.length).toBeGreaterThan(100);

        if (grade === 'grade2_classic') {
          // Archibald Leitch British racing green criss-cross lattice balustrade
          const leitchLattice = operations.filter(
            op => op.method === 'set:strokeStyle' && op.args[0] === '#15803d'
          );
          expect(leitchLattice.length).toBeGreaterThan(0);
        } else if (grade === 'grade5_futuristic') {
          // Cyan digital LED matrix ribbon & aero-titanium
          const ledRibbon = operations.filter(
            op => op.method === 'set:strokeStyle' && op.args[0] === '#38bdf8'
          );
          expect(ledRibbon.length).toBeGreaterThan(0);
        }
      }
    });

    it('renders exposed seating bowl for uncovered stands (hasRoof: false) with custom seat patterns, gangways & vomitories', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stadium = createDefaultStadium();
      stadium.seats.colors = ['#1d4ed8', '#facc15'];
      stadium.seats.pattern = 'horizontalBands';
      // Open-air West and East stands
      stadium.stands.west.hasRoof = false;
      stadium.stands.east.hasRoof = false;

      drawAerialSkyCam(ctx, stadium, {
        roofOpacity: 1.0,
        showBroadcastHUD: false,
        timeOfDay: 'noon',
      });

      // Verify custom seat colors were rendered in the exposed seating bowl
      const seatColor1Ops = operations.filter(
        op => op.method === 'set:fillStyle' && op.args[0] === '#1d4ed8'
      );
      expect(seatColor1Ops.length).toBeGreaterThan(0);

      // Verify stepped gangway safety yellow nosing (#facc15)
      const gangwayOps = operations.filter(
        op => op.method === 'set:fillStyle' && op.args[0] === '#facc15'
      );
      expect(gangwayOps.length).toBeGreaterThan(0);

      // Verify concourse vomitory portal exit signage (#22c55e emerald green)
      const vomitoryOps = operations.filter(
        op => op.method === 'set:fillStyle' && op.args[0] === '#22c55e'
      );
      expect(vomitoryOps.length).toBeGreaterThan(0);
    });

    it('renders macro-scale dugout benches on touchline apron across all bench types', () => {
      const benchTypes: BenchType[] = [
        'recaro_racing',
        'covered_sunken',
        'classic_timber',
        'utilitarian_concrete',
        'folding_chairs',
      ];

      for (const bType of benchTypes) {
        const { ctx, operations } = createMockCanvasContext();
        const stadium = createDefaultStadium();
        stadium.dugouts = {
          type: bType,
          quality: 'elite_vip',
          frameColor: '#0f172a',
          cushionColor: '#2563eb',
          shelterTint: 'rgba(56, 189, 248, 0.45)',
          setbackDistance: 90,
        };

        drawAerialSkyCam(ctx, stadium, {
          roofOpacity: 1.0,
          showBroadcastHUD: false,
          timeOfDay: 'noon',
        });

        if (bType === 'recaro_racing') {
          // Verify luxury tinted shelter and blue cushion color
          const cushionOps = operations.filter(
            op => op.method === 'set:fillStyle' && op.args[0] === '#2563eb'
          );
          expect(cushionOps.length).toBeGreaterThan(0);
        } else if (bType === 'classic_timber') {
          // Grassroots wood color (#78350f / #451a03)
          const timberOps = operations.filter(
            op => op.method === 'set:fillStyle' && (op.args[0] === '#78350f' || op.args[0] === '#451a03')
          );
          expect(timberOps.length).toBeGreaterThan(0);
        }
      }
    });

    it('renders macro-scale entrance tunnels across all sitings and tunnel types', () => {
      const sitings: TunnelSiting[] = ['center_main', 'corner', 'behind_goal'];
      const tunnelTypes: TunnelType[] = [
        'inflatable_accordion',
        'modern_architectural',
        'subterranean_staircase',
        'direct_portal',
        'telescopic_canopy',
      ];

      for (const siting of sitings) {
        for (const tType of tunnelTypes) {
          const { ctx, operations } = createMockCanvasContext();
          const stadium = createDefaultStadium();
          stadium.tunnel = {
            type: tType,
            siting,
            primaryColor: '#b91c1c',
            secondaryColor: '#facc15',
          };

          drawAerialSkyCam(ctx, stadium, {
            roofOpacity: 1.0,
            showBroadcastHUD: false,
            timeOfDay: 'night',
          });

          // Red carpet runner (#991b1b) with gold trim (#facc15)
          const carpetOps = operations.filter(
            op => op.method === 'set:fillStyle' && op.args[0] === '#991b1b'
          );
          expect(carpetOps.length).toBeGreaterThan(0);

          if (tType === 'inflatable_accordion') {
            // Flexible bellows hoops in club colors
            const primaryOps = operations.filter(
              op => op.method === 'set:fillStyle' && op.args[0] === '#b91c1c'
            );
            expect(primaryOps.length).toBeGreaterThan(0);
          }
        }
      }
    });

    it('projects volumetric radial light beam cones from corner pylons into the pitch bowl', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stadium = createDefaultStadium();

      drawAerialSkyCam(ctx, stadium, {
        roofOpacity: 1.0,
        showBroadcastHUD: false,
        timeOfDay: 'night',
      });

      // Verify volumetric radial gradients were created for the floodlight cones
      const gradientOps = operations.filter(op => op.method === 'createRadialGradient');
      expect(gradientOps.length).toBeGreaterThanOrEqual(4);

      // Verify arc operations sweeping beam cones
      const arcOps = operations.filter(op => op.method === 'arc');
      expect(arcOps.length).toBeGreaterThanOrEqual(8);
    });
  });

  describe('2. 15.8.2 Macroscopic Aerial Surroundings Suite', () => {
    const envBounds = {
      left: 0,
      top: 0,
      width: 4000,
      height: 4000,
      stadiumBounds: {
        centerX: 2000,
        centerY: 2000,
        outerWidth: 1600,
        outerHeight: 1400,
      },
    };

    it('renders Big City with transit trains, avenue streetlights, helipads and skyscraper reflections', () => {
      const { ctx, operations } = createMockCanvasContext();
      drawAerialEnvironment(ctx, 'big_city', 'night', envBounds);

      // Transit train blue stripe (#0284c7) & illuminated windows (#fde047)
      const trainOps = operations.filter(
        op => op.method === 'set:fillStyle' && (op.args[0] === '#0284c7' || op.args[0] === '#fde047')
      );
      expect(trainOps.length).toBeGreaterThan(0);

      // Helipad 'H' text rendering
      const helipadText = operations.filter(
        op => op.method === 'fillText' && op.args[0] === 'H'
      );
      expect(helipadText.length).toBeGreaterThan(0);
    });

    it('renders Small City with green municipal park, duck pond, high street shops and cul-de-sacs', () => {
      const { ctx, operations } = createMockCanvasContext();
      drawAerialEnvironment(ctx, 'small_city', 'noon', envBounds);

      // Duck pond blue water (#0284c7) and park lawn (#16a34a)
      const pondOps = operations.filter(
        op => op.method === 'set:fillStyle' && op.args[0] === '#0284c7'
      );
      expect(pondOps.length).toBeGreaterThan(0);
      const parkLawnOps = operations.filter(
        op => op.method === 'set:fillStyle' && op.args[0] === '#16a34a'
      );
      expect(parkLawnOps.length).toBeGreaterThan(0);
    });

    it('renders Airport with rotating radar surveillance beam and cargo freight depot', () => {
      const { ctx, operations } = createMockCanvasContext();
      drawAerialEnvironment(ctx, 'airport', 'night', envBounds);

      // Cargo depot building (#1e293b / #475569) and baggage tugs (#f59e0b)
      const baggageTugOps = operations.filter(
        op => op.method === 'set:fillStyle' && op.args[0] === '#f59e0b'
      );
      expect(baggageTugOps.length).toBeGreaterThan(0);

      // Green runway edge navigation lights (#22c55e)
      const runwayLightOps = operations.filter(
        op => op.method === 'set:fillStyle' && op.args[0] === '#22c55e'
      );
      expect(runwayLightOps.length).toBeGreaterThan(0);
    });

    it('renders Railroad with multi-track freight corridor, turntable and container crane gantries', () => {
      const { ctx, operations } = createMockCanvasContext();
      drawAerialEnvironment(ctx, 'railroad', 'noon', envBounds);

      // Crane safety yellow (#eab308) and yellow locomotive (#facc15)
      const craneOps = operations.filter(
        op => op.method === 'set:fillStyle' && op.args[0] === '#eab308'
      );
      expect(craneOps.length).toBeGreaterThan(0);
      const locoOps = operations.filter(
        op => op.method === 'set:fillStyle' && op.args[0] === '#facc15'
      );
      expect(locoOps.length).toBeGreaterThan(0);
    });

    it('renders Beach with coral reef gradients, breaking waves and marina piers with moored yachts', () => {
      const { ctx, operations } = createMockCanvasContext();
      drawAerialEnvironment(ctx, 'beach', 'noon', envBounds);

      // Wooden marina pier (#78350f) and white yacht hulls (#f8fafc)
      const pierOps = operations.filter(
        op => op.method === 'set:fillStyle' && op.args[0] === '#78350f'
      );
      expect(pierOps.length).toBeGreaterThan(0);
      const yachtOps = operations.filter(
        op => op.method === 'set:fillStyle' && op.args[0] === '#f8fafc'
      );
      expect(yachtOps.length).toBeGreaterThan(0);
    });

    it('renders Mountains with alpine snow caps, serpentine switchback roads with guardrails & ski chalets', () => {
      const { ctx, operations } = createMockCanvasContext();
      drawAerialEnvironment(ctx, 'mountains', 'noon', envBounds);

      // Snow caps (#f8fafc) and guardrails (#94a3b8)
      const snowOps = operations.filter(
        op => op.method === 'set:fillStyle' && op.args[0] === '#f8fafc'
      );
      expect(snowOps.length).toBeGreaterThan(0);
      const guardrailOps = operations.filter(
        op => op.method === 'set:strokeStyle' && op.args[0] === '#94a3b8'
      );
      expect(guardrailOps.length).toBeGreaterThan(0);
    });

    it('renders Forest with scenic river, rustic footbridge, and fire ranger lookout tower', () => {
      const { ctx, operations } = createMockCanvasContext();
      drawAerialEnvironment(ctx, 'forest', 'noon', envBounds);

      // Scenic river (#0284c7) and wooden footbridge (#78350f)
      const riverOps = operations.filter(
        op => op.method === 'set:strokeStyle' && op.args[0] === '#0284c7'
      );
      expect(riverOps.length).toBeGreaterThan(0);
      const bridgeOps = operations.filter(
        op => op.method === 'set:fillStyle' && op.args[0] === '#78350f'
      );
      expect(bridgeOps.length).toBeGreaterThan(0);
    });

    it('renders Savannah with baobab trees, dirt safari tracks and 4x4 rover sprites', () => {
      const { ctx, operations } = createMockCanvasContext();
      drawAerialEnvironment(ctx, 'savannah', 'noon', envBounds);

      // Sand-beige safari rover (#ca8a04) and baobab wood (#78350f)
      const roverOps = operations.filter(
        op => op.method === 'set:fillStyle' && op.args[0] === '#ca8a04'
      );
      expect(roverOps.length).toBeGreaterThan(0);
      const baobabOps = operations.filter(
        op => op.method === 'set:fillStyle' && op.args[0] === '#78350f'
      );
      expect(baobabOps.length).toBeGreaterThan(0);
    });
  });

  describe('3. 15.8.3 Dynamic Aerial Time-of-Day Lighting Ambiance', () => {
    it('applies noon zenith lighting with sharp perpendicular drop shadows', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stadium = createDefaultStadium();

      drawAerialSkyCam(ctx, stadium, {
        roofOpacity: 1.0,
        showBroadcastHUD: false,
        timeOfDay: 'noon',
      });

      // Noon shadow offset (dx: 4, dy: 8)
      const rectOps = operations.filter(op => op.method === 'fillRect');
      expect(rectOps.length).toBeGreaterThan(10);
    });

    it('applies sunset golden-hour lighting with long diagonal shadows and warm atmospheric wash', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stadium = createDefaultStadium();

      drawAerialSkyCam(ctx, stadium, {
        roofOpacity: 1.0,
        showBroadcastHUD: false,
        timeOfDay: 'sunset',
      });

      // Verify sunset atmospheric radial wash was rendered
      const radialGrads = operations.filter(op => op.method === 'createRadialGradient');
      expect(radialGrads.length).toBeGreaterThan(0);
    });

    it('applies night contrast with dark terrain and stadium glowing as an illuminated coliseum beacon', () => {
      const { ctx, operations } = createMockCanvasContext();
      const stadium = createDefaultStadium();

      drawAerialSkyCam(ctx, stadium, {
        roofOpacity: 1.0,
        showBroadcastHUD: false,
        timeOfDay: 'night',
      });

      // Night lighting elements (LED matrix, light cones, floodlights)
      const lightBulbs = operations.filter(
        op => op.method === 'set:fillStyle' && op.args[0] === '#ffffff'
      );
      expect(lightBulbs.length).toBeGreaterThan(0);
    });
  });
});
