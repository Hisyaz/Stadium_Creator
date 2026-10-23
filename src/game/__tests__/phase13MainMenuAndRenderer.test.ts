/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import { getStandGradePalette, drawStadiumArchitecture } from '../stadiumRenderer';
import { STADIUM_REGISTRY } from '../stadiumRegistry';
import { StadiumDefinition, StandConfig, StandPosition } from '../../types/stadium';
import { HOME_KIT, AWAY_KIT } from '../constants';

function createDummyStands(grade: StandConfig['grade'], tierCount: 1 | 2 | 3 | 4): Record<StandPosition, StandConfig> {
  const positions: StandPosition[] = [
    'east',
    'west',
    'north',
    'south',
    'corner_ne',
    'corner_nw',
    'corner_se',
    'corner_sw',
  ];
  const stands = {} as Record<StandPosition, StandConfig>;
  for (const pos of positions) {
    stands[pos] = {
      position: pos,
      type: 'tiered',
      grade,
      tierCount,
      hasRoof: true,
      roofCoverage: 0.8,
    };
  }
  return stands;
}

function createTestStadium(partial: Partial<StadiumDefinition> & { id: string; name: string }): StadiumDefinition {
  return {
    shortName: partial.name,
    city: 'Test City',
    country: 'Test Country',
    shape: 'rectangular',
    surroundings: 'small_city',
    hasTrack: false,
    stands: createDummyStands('grade4_modern', 2),
    seats: {
      style: 'classic_bucket',
      pattern: 'solid',
      colors: ['#ffffff'],
    },
    lighting: {
      type: 'corner_pylons',
      pylonCount: 4,
      powerKw: 1000,
      timeOfDay: 'night',
    },
    dugouts: {
      type: 'classic_timber',
      quality: 'classic',
      frameColor: '#78350f',
      cushionColor: '#1e293b',
      shelterTint: 'rgba(30, 41, 59, 0.8)',
      setbackDistance: 5,
    },
    tunnel: {
      type: 'direct_portal',
      siting: 'center_main',
      primaryColor: '#334155',
      secondaryColor: '#1e293b',
    },
    capacity: 20000,
    fifaCategory: 'first_division',
    ...partial,
  };
}

describe('Phase 13: 32-Bit Arcade Main Menu & Live Procedural Stadium Renderer', () => {
  describe('Phase 13.2: Stand Architectural Grades & Palettes', () => {
    it('returns weathered municipal timber palette for Grade 1', () => {
      const palette = getStandGradePalette('grade1_municipal');
      expect(palette.primaryWall).toBe('#57534e');
      expect(palette.seatTexture).toBe('bench');
      expect(palette.fasciaLed).toBeNull();

      const timberPalette = getStandGradePalette('grade1_historic_timber');
      expect(timberPalette.primaryWall).toBe('#57534e');
    });

    it('returns classic English red-brick masonry palette for Grade 2', () => {
      const palette = getStandGradePalette('grade2_classic');
      expect(palette.primaryWall).toBe('#7f1d1d');
      expect(palette.balustrade).toBe('#15803d');
      expect(palette.seatTexture).toBe('bucket');
      expect(palette.fasciaLed).toBeNull();
    });

    it('returns industrial corrugated steel palette for Grade 3', () => {
      const palette = getStandGradePalette('grade3_industrial');
      expect(palette.primaryWall).toBe('#334155');
      expect(palette.trim).toBe('#facc15'); // Warning yellow stripes
      expect(palette.fasciaLed).toBeNull();

      const cantileverPalette = getStandGradePalette('grade3_steel_cantilever');
      expect(cantileverPalette.primaryWall).toBe('#334155');
    });

    it('returns smooth pre-cast concrete & glass balustrade palette for Grade 4', () => {
      const palette = getStandGradePalette('grade4_modern');
      expect(palette.primaryWall).toBe('#1e293b');
      expect(palette.fasciaLed).toBe('#38bdf8');
      expect(palette.seatTexture).toBe('bucket');
    });

    it('returns futuristic anodized aero-aluminum & neon LED ribbon palette for Grade 5', () => {
      const palette = getStandGradePalette('grade5_futuristic');
      expect(palette.primaryWall).toBe('#0f172a');
      expect(palette.fasciaLed).toBe('#38bdf8');
      expect(palette.balustrade).toContain('56, 189, 248');
    });

    it('falls back to default futuristic palette when no grade is passed', () => {
      const palette = getStandGradePalette(undefined);
      expect(palette.primaryWall).toBe('#0f172a');
      expect(palette.fasciaLed).toBe('#38bdf8');
    });
  });

  describe('Phase 13.2: Stadium Registry Procedural Configurations', () => {
    it('contains valid architectural definitions across all stadiums in the registry', () => {
      const stadiums = Object.values(STADIUM_REGISTRY);
      expect(stadiums.length).toBeGreaterThan(0);

      for (const stadium of stadiums) {
        expect(stadium.id).toBeDefined();
        expect(stadium.name).toBeDefined();
        expect(stadium.shape).toMatch(/rectangular|square|round|oval|circular|octagonal/);
        expect(stadium.fifaCategory).toMatch(/national|first_division|continental|world/);
        if (stadium.dugouts) {
          expect(stadium.dugouts.type).toMatch(
            /recaro_racing|racing_bucket|covered_sunken|classic_timber|utilitarian_concrete|concrete_dugout|folding_chairs/
          );
        }
        if (stadium.tunnel) {
          expect(stadium.tunnel.type).toMatch(
            /subterranean_staircase|retractable_bellows|inflatable_accordion|modern_architectural|direct_portal|telescopic_canopy/
          );
        }
      }
    });

    it('correctly flags stadiums with athletics tracks vs pure rectangular football venues', () => {
      const stadiums = Object.values(STADIUM_REGISTRY);
      const trackStadiums = stadiums.filter((s) => s.hasTrack || s.shape === 'round' || s.shape === 'oval');
      const rectangularStadiums = stadiums.filter((s) => !s.hasTrack && (s.shape === 'rectangular' || s.shape === 'square'));

      expect(trackStadiums.length).toBeGreaterThan(0);
      expect(rectangularStadiums.length).toBeGreaterThan(0);
    });
  });

  describe('Phase 13.2: Procedural Live Stadium Canvas Rendering Performance & Safety', () => {
    function createMockContext(): CanvasRenderingContext2D {
      return {
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
        createLinearGradient: vi.fn(() => ({
          addColorStop: vi.fn(),
        })),
        createRadialGradient: vi.fn(() => ({
          addColorStop: vi.fn(),
        })),
      } as unknown as CanvasRenderingContext2D;
    }

    it('renders stadium architecture with round shape and athletics running track without throwing', () => {
      const ctx = createMockContext();
      const roundStadium = createTestStadium({
        id: 'test_olympic',
        name: 'Olympic Arena',
        fifaCategory: 'world',
        capacity: 75000,
        shape: 'round',
        hasTrack: true,
        stands: createDummyStands('grade5_futuristic', 3),
        dugouts: {
          type: 'recaro_racing',
          quality: 'elite_vip',
          frameColor: '#0f172a',
          cushionColor: '#dc2626',
          shelterTint: 'rgba(15, 23, 42, 0.9)',
          setbackDistance: 6,
        },
        tunnel: {
          type: 'modern_architectural',
          siting: 'center_main',
          primaryColor: '#0f172a',
          secondaryColor: '#38bdf8',
        },
      });

      expect(() => {
        drawStadiumArchitecture(
          ctx,
          1000,
          700,
          'monumental',
          'night',
          HOME_KIT,
          AWAY_KIT,
          undefined,
          roundStadium
        );
      }).not.toThrow();

      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
    });

    it('renders stadium architecture with Wall Tier (Die Gelbe Wand / Palcos) and inflatable accordion tunnel', () => {
      const ctx = createMockContext();
      const stands = createDummyStands('grade3_industrial', 2);
      stands.east = {
        position: 'east',
        type: 'wall',
        grade: 'grade3_industrial',
        wallSize: 'large',
        primaryColor: '#eab308',
        secondaryColor: '#000000',
      };

      const wallStadium = createTestStadium({
        id: 'test_wall',
        name: 'Estadio La Caldera',
        fifaCategory: 'continental',
        capacity: 55000,
        shape: 'rectangular',
        stands,
        dugouts: {
          type: 'classic_timber',
          quality: 'classic',
          frameColor: '#78350f',
          cushionColor: '#1e293b',
          shelterTint: 'rgba(30, 41, 59, 0.8)',
          setbackDistance: 5,
        },
        tunnel: {
          type: 'inflatable_accordion',
          siting: 'center_main',
          primaryColor: '#eab308',
          secondaryColor: '#000000',
        },
      });

      expect(() => {
        drawStadiumArchitecture(
          ctx,
          1000,
          700,
          'craven',
          'sunset',
          HOME_KIT,
          AWAY_KIT,
          undefined,
          wallStadium
        );
      }).not.toThrow();
    });

    it('renders open ends without crashing when stands are set to no_stand', () => {
      const ctx = createMockContext();
      const stands = createDummyStands('grade1_municipal', 1);
      stands.north = {
        position: 'north',
        type: 'no_stand',
        grade: 'grade1_municipal',
        noStandBackdrop: 'wall',
      };
      stands.east = {
        position: 'east',
        type: 'none',
        grade: 'grade1_municipal',
      };

      const openStadium = createTestStadium({
        id: 'test_open',
        name: 'Municipal Field',
        fifaCategory: 'national',
        capacity: 5000,
        shape: 'rectangular',
        stands,
        dugouts: {
          type: 'utilitarian_concrete',
          quality: 'municipal',
          frameColor: '#44403c',
          cushionColor: '#78716c',
          shelterTint: 'rgba(28, 25, 23, 0.7)',
          setbackDistance: 4,
        },
        tunnel: {
          type: 'direct_portal',
          siting: 'corner',
          primaryColor: '#44403c',
          secondaryColor: '#1c1917',
        },
      });

      expect(() => {
        drawStadiumArchitecture(
          ctx,
          1000,
          700,
          'ascenso',
          'noon',
          HOME_KIT,
          AWAY_KIT,
          undefined,
          openStadium
        );
      }).not.toThrow();
    });
  });
});
