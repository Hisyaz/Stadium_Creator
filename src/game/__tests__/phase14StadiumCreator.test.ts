/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import {
  StadiumCameraPerspective,
  getStadiumCameraTarget,
  getStandCameraCoordinates,
  getTunnelCameraCoordinates,
  getDugoutCameraCoordinates,
  lerpCamera,
  getCinematicCameraPreset,
} from '../stadiumCamera';
import {
  createDefaultStadium,
  saveCustomStadium,
  loadCustomStadiums,
  deleteCustomStadium,
  STADIUM_REGISTRY,
  getStadiumById,
} from '../stadiumRegistry';
import {
  calculateStadiumTotalCapacity,
  calculateStandCapacity,
  calculateFifaQualification,
  getBackdropsForSurroundings,
  StadiumDefinition,
  StandConfig,
} from '../../types/stadium';
import { drawStadiumArchitecture } from '../stadiumRenderer';
import { PITCH_CONFIG, HOME_KIT, AWAY_KIT } from '../constants';

describe('Phase 14: Interactive 32-Bit Stadium Creator & Stand Camera Director Suite', () => {
  describe('14.1: Top-Right Multi-View Camera Switcher Suite (7 Perspectives)', () => {
    const mockStadium = createDefaultStadium('Test Arena');

    it('resolves Relevant View dynamically according to inspector step and focus target', () => {
      // Step 1: Shape focus -> full stadium geometry
      const step1Shape = getStadiumCameraTarget('relevant', {
        activeStep: 1,
        stadiumDef: mockStadium,
      });
      expect(step1Shape.label).toBe('RELEVANT: STADIUM SHAPE');
      expect(step1Shape.zoom).toBe(0.36);

      // Step 1: Surroundings focus -> shifts upward to skyline horizon
      const step1Surroundings = getStadiumCameraTarget('relevant', {
        activeStep: 1,
        stadiumDef: mockStadium,
        focusSubTarget: 'surroundings',
      });
      expect(step1Surroundings.label).toBe('RELEVANT: SURROUNDINGS SKYLINE');
      expect(step1Surroundings.y).toBeLessThan(PITCH_CONFIG.CENTER_Y);

      // Step 2: Stand inspector -> East touchline stand
      const step2East = getStadiumCameraTarget('relevant', {
        activeStep: 2,
        activeStand: 'east',
        stadiumDef: mockStadium,
      });
      expect(step2East.label).toContain('EAST');
      expect(step2East.x).toBeGreaterThan(PITCH_CONFIG.PITCH_RIGHT);

      // Step 2: Stand inspector -> North goal stand
      const step2North = getStadiumCameraTarget('relevant', {
        activeStep: 2,
        activeStand: 'north',
        stadiumDef: mockStadium,
      });
      expect(step2North.label).toContain('NORTH');
      expect(step2North.y).toBeLessThan(PITCH_CONFIG.PITCH_TOP);

      // Step 3: Dugouts
      const step3Dugouts = getStadiumCameraTarget('relevant', {
        activeStep: 3,
        stadiumDef: mockStadium,
        focusSubTarget: 'dugouts',
      });
      expect(step3Dugouts.label).toBe('RELEVANT: DUGOUTS');
      expect(step3Dugouts.zoom).toBeGreaterThanOrEqual(1.15);

      // Step 3: Tunnel
      const step3Tunnel = getStadiumCameraTarget('relevant', {
        activeStep: 3,
        stadiumDef: mockStadium,
        focusSubTarget: 'tunnel',
      });
      expect(step3Tunnel.label).toBe('RELEVANT: ENTRANCE TUNNEL');
      expect(step3Tunnel.zoom).toBeGreaterThanOrEqual(1.25);

      // Step 5: Seats
      const step5Seats = getStadiumCameraTarget('relevant', {
        activeStep: 5,
        stadiumDef: mockStadium,
      });
      expect(step5Seats.label).toBe('RELEVANT: SEAT PATTERNS');

      // Step 6: Floodlights
      const step6Lights = getStadiumCameraTarget('relevant', {
        activeStep: 6,
        stadiumDef: mockStadium,
      });
      expect(step6Lights.label).toBe('RELEVANT: FLOODLIGHTS & ATMOSPHERE');
    });

    it('resolves Full Pitch broadcast overview with standard zoom', () => {
      const target = getStadiumCameraTarget('full_pitch', {
        activeStep: 1,
        stadiumDef: mockStadium,
      });
      expect(target.label).toBe('FULL PITCH VIEW');
      expect(target.x).toBe(PITCH_CONFIG.CENTER_X);
      expect(target.y).toBe(PITCH_CONFIG.CENTER_Y);
      expect(target.zoom).toBe(0.38);
    });

    it('resolves Stands View with rapid stand-by-stand cycling', () => {
      const eastTarget = getStadiumCameraTarget('stands', {
        activeStep: 2,
        activeStand: 'east',
        stadiumDef: mockStadium,
      });
      expect(eastTarget.label).toContain('EAST');
      expect(eastTarget.x).toBeGreaterThan(PITCH_CONFIG.PITCH_RIGHT);

      const westTarget = getStadiumCameraTarget('stands', {
        activeStep: 2,
        activeStand: 'west',
        stadiumDef: mockStadium,
      });
      expect(westTarget.label).toContain('WEST');
      expect(westTarget.x).toBeLessThan(PITCH_CONFIG.PITCH_LEFT);

      const southTarget = getStadiumCameraTarget('stands', {
        activeStep: 2,
        activeStand: 'south',
        stadiumDef: mockStadium,
      });
      expect(southTarget.label).toContain('SOUTH');
      expect(southTarget.y).toBeGreaterThan(PITCH_CONFIG.PITCH_BOTTOM);
    });

    it('resolves Playing Field Focus tight camera centered on pitch turf', () => {
      const target = getStadiumCameraTarget('field_focus', {
        activeStep: 1,
        stadiumDef: mockStadium,
      });
      expect(target.label).toBe('PLAYING FIELD FOCUS');
      expect(target.zoom).toBe(0.85);
      expect(target.x).toBe(PITCH_CONFIG.CENTER_X);
      expect(target.y).toBe(PITCH_CONFIG.CENTER_Y);
    });

    it('resolves Aerial Sky-Cam (Far View) high-altitude bird-eye perspective', () => {
      const target = getStadiumCameraTarget('aerial_sky', {
        activeStep: 1,
        stadiumDef: mockStadium,
      });
      expect(target.label).toBe('AERIAL SKY-CAM (FAR)');
      expect(target.zoom).toBeLessThanOrEqual(0.30);
      expect(target.y).toBeLessThan(PITCH_CONFIG.CENTER_Y);
    });

    it('resolves Tunnel Camera with siting variations (center, corner, behind goal)', () => {
      // Center Main siting
      const centerCoords = getTunnelCameraCoordinates('center_main');
      expect(centerCoords.x).toBeLessThan(PITCH_CONFIG.PITCH_LEFT);
      expect(centerCoords.y).toBe(PITCH_CONFIG.CENTER_Y);

      // Corner siting
      const cornerCoords = getTunnelCameraCoordinates('corner');
      expect(cornerCoords.x).toBeLessThan(PITCH_CONFIG.PITCH_LEFT);
      expect(cornerCoords.y).toBeLessThan(PITCH_CONFIG.PITCH_TOP);

      // Behind Goal siting
      const goalCoords = getTunnelCameraCoordinates('behind_goal');
      expect(goalCoords.x).toBe(PITCH_CONFIG.CENTER_X);
      expect(goalCoords.y).toBeLessThan(PITCH_CONFIG.PITCH_TOP);
    });

    it('resolves Bench Camera focused on touchline dugouts and technical box', () => {
      const benchCoords = getDugoutCameraCoordinates();
      expect(benchCoords.x).toBeLessThan(PITCH_CONFIG.PITCH_LEFT);
      expect(benchCoords.y).toBeLessThan(PITCH_CONFIG.CENTER_Y);
      expect(benchCoords.zoom).toBeGreaterThanOrEqual(1.15);
    });

    it('smoothly interpolates camera state using exponential lerp', () => {
      const current = { x: 100, y: 100, zoom: 0.5, pitchTilt: 0.5 };
      const target = { x: 200, y: 300, zoom: 1.0, pitchTilt: 0.7 };
      const next = lerpCamera(current, target, 0.1);

      expect(next.x).toBe(110);
      expect(next.y).toBe(120);
      expect(next.zoom).toBe(0.55);
      expect(next.pitchTilt).toBeCloseTo(0.52);
    });

    it('provides dual-purpose matchday cinematic presets', () => {
      const walkout = getCinematicCameraPreset('walkout', mockStadium);
      expect(walkout.label).toBe('WALKOUT CINEMATIC');
      expect(walkout.zoom).toBeGreaterThan(1.0);

      const anthem = getCinematicCameraPreset('anthem', mockStadium);
      expect(anthem.label).toBe('ANTHEM LINEUP');

      const bench = getCinematicCameraPreset('bench_reaction', mockStadium);
      expect(bench.label).toBe('TECHNICAL BENCH CINEMATIC');

      const goal = getCinematicCameraPreset('goal_celebration', mockStadium);
      expect(goal.label).toBe('CELEBRATION CLOSE-UP');
    });
  });

  describe('14.2: Visual WYSIWYG Real-Time Matchday Preview & Initial Base Stadium', () => {
    it('initializes base stadium with Tier 1 in Small size across all stands with visible stacked tiers', () => {
      const defaultStadium = createDefaultStadium('Grassroots Ground');
      expect(defaultStadium.id).toContain('custom_');
      expect(defaultStadium.name).toBe('Grassroots Ground');
      expect(defaultStadium.shape).toBe('rectangular');

      // Verify all stands have lowest tier (Tier 1) in Small size
      const positions: (keyof typeof defaultStadium.stands)[] = [
        'east',
        'west',
        'north',
        'south',
        'corner_ne',
        'corner_nw',
        'corner_se',
        'corner_sw',
      ];

      for (const pos of positions) {
        const stand = defaultStadium.stands[pos];
        expect(stand).toBeDefined();
        expect(stand.type).toBe('tiered');
        expect(stand.grade).toBe('grade1_municipal');
        expect(stand.tierCount).toBe(1);
        expect(stand.tiers).toHaveLength(1);
        expect(stand.tiers![0].size).toBe('small');
        expect(stand.hasRoof).toBe(true);
      }
    });

    it('renders real-time procedural stadium architecture on canvas without throwing', () => {
      const mockCtx = {
        save: vi.fn(),
        restore: vi.fn(),
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        fillText: vi.fn(),
        beginPath: vi.fn(),
        closePath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        arc: vi.fn(),
        stroke: vi.fn(),
        fill: vi.fn(),
        setLineDash: vi.fn(),
        createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
        createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      } as unknown as CanvasRenderingContext2D;

      const stadium = createDefaultStadium();

      expect(() => {
        drawStadiumArchitecture(
          mockCtx,
          PITCH_CONFIG.CENTER_X,
          PITCH_CONFIG.CENTER_Y,
          'craven',
          'night',
          HOME_KIT,
          AWAY_KIT,
          undefined,
          stadium
        );
      }).not.toThrow();

      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
    });
  });

  describe('14.3: Persistent Bottom-Left HUD Box (Qualification & Capacity Calculation)', () => {
    it('correctly calculates additive capacity for tiered stands with small, medium, and large decks', () => {
      const standSmall: StandConfig = {
        position: 'east',
        type: 'tiered',
        grade: 'grade2_classic',
        tierCount: 1,
        tiers: [{ size: 'small' }],
      };
      const capSmall = calculateStandCapacity(standSmall, 'rectangular', 'east');
      expect(capSmall).toBe(3200);

      const standMedium: StandConfig = {
        position: 'east',
        type: 'tiered',
        grade: 'grade2_classic',
        tierCount: 1,
        tiers: [{ size: 'medium' }],
      };
      const capMedium = calculateStandCapacity(standMedium, 'rectangular', 'east');
      expect(capMedium).toBe(4800);

      const standLarge: StandConfig = {
        position: 'east',
        type: 'tiered',
        grade: 'grade2_classic',
        tierCount: 1,
        tiers: [{ size: 'large' }],
      };
      const capLarge = calculateStandCapacity(standLarge, 'rectangular', 'east');
      expect(capLarge).toBe(6800);
    });

    it('correctly calculates additive capacity for Wall Tiers (Dortmund Die Gelbe Wand style)', () => {
      const wallLarge: StandConfig = {
        position: 'south',
        type: 'wall',
        grade: 'grade3_industrial',
        wallSize: 'large',
      };
      const capLarge = calculateStandCapacity(wallLarge, 'rectangular', 'south');
      expect(capLarge).toBe(Math.round(24000 * 0.85));

      const wallSmall: StandConfig = {
        position: 'south',
        type: 'wall',
        grade: 'grade3_industrial',
        wallSize: 'small',
      };
      const capSmall = calculateStandCapacity(wallSmall, 'rectangular', 'south');
      expect(capSmall).toBe(Math.round(14400 * 0.85));
    });

    it('returns strictly 0 capacity contribution for No Stand sides', () => {
      const noStand: StandConfig = {
        position: 'north',
        type: 'none',
        grade: 'grade1_municipal',
      };
      expect(calculateStandCapacity(noStand, 'rectangular', 'north')).toBe(0);

      const noStandAlias: StandConfig = {
        position: 'north',
        type: 'no_stand',
        grade: 'grade1_municipal',
      };
      expect(calculateStandCapacity(noStandAlias, 'rectangular', 'north')).toBe(0);
    });

    it('dynamically computes FIFA category across National, First Division, Continental, and World tiers', () => {
      // Grassroots / Municipal
      const grassroots = calculateFifaQualification(6000, 'grade1_municipal', 600, 'poor');
      expect(grassroots).toBe('national');

      // Top flight domestic
      const firstDivision = calculateFifaQualification(22000, 'grade3_industrial', 1200, 'normal');
      expect(firstDivision).toBe('first_division');

      // Continental arena
      const continental = calculateFifaQualification(42000, 'grade4_modern', 1800, 'pristine');
      expect(continental).toBe('continental');

      // World Cup finals standard
      const worldVenue = calculateFifaQualification(75000, 'grade5_futuristic', 2400, 'pristine');
      expect(worldVenue).toBe('world');
    });

    it('correctly associates contextual backdrops with outside surroundings for open ends', () => {
      const airportBackdrops = getBackdropsForSurroundings('airport');
      expect(airportBackdrops.some((b) => b.id === 'runway')).toBe(true);
      expect(airportBackdrops.some((b) => b.id === 'wall')).toBe(true);

      const natureBackdrops = getBackdropsForSurroundings('nature');
      expect(natureBackdrops.some((b) => b.id === 'mountain_forest')).toBe(true);
      expect(natureBackdrops.some((b) => b.id === 'wall')).toBe(true);

      const beachBackdrops = getBackdropsForSurroundings('beach');
      expect(beachBackdrops.some((b) => b.id === 'beach_seaside')).toBe(true);
      expect(beachBackdrops.some((b) => b.id === 'wall')).toBe(true);

      const cityBackdrops = getBackdropsForSurroundings('big_city');
      expect(cityBackdrops.some((b) => b.id === 'skyscrapers')).toBe(true);
      expect(cityBackdrops.some((b) => b.id === 'wall')).toBe(true);
    });
  });

  describe('14.4: Persistent Global Registry Save & Hydration', () => {
    it('saves custom stadium to STADIUM_REGISTRY and retrieves it by ID', () => {
      const customVenue = createDefaultStadium('Estadio Sol de Mayo');
      customVenue.id = 'custom_sol_de_mayo';
      customVenue.city = 'Montevideo';

      saveCustomStadium(customVenue);

      const retrieved = getStadiumById('custom_sol_de_mayo');
      expect(retrieved).toBeDefined();
      expect(retrieved.name).toBe('Estadio Sol de Mayo');
      expect(retrieved.city).toBe('Montevideo');
    });

    it('deletes custom stadium cleanly from registry', () => {
      const customVenue = createDefaultStadium('Temporary Arena');
      customVenue.id = 'custom_temp_arena';

      saveCustomStadium(customVenue);
      expect(STADIUM_REGISTRY['custom_temp_arena']).toBeDefined();

      deleteCustomStadium('custom_temp_arena');
      expect(STADIUM_REGISTRY['custom_temp_arena']).toBeUndefined();
    });
  });
});
