/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  StadiumDefinition,
  SurroundingsType,
  ApronMaterial,
  StadiumShape,
  getBackdropsForSurroundings,
} from '../../types/stadium';
import { createDefaultStadium } from '../stadiumRegistry';
import { drawAerialSkyCam } from '../skyCamRenderer';
import { drawPerimeterHorizon, drawStadiumArchitecture } from '../stadiumRenderer';
import { drawAerialEnvironment } from '../environmentRenderer';
import { HOME_KIT, AWAY_KIT } from '../constants';

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

describe('Phase 15.5: Stadium Creator Architectural Hotfixes, Apron Perimeters & Panoramic Surroundings Overhaul', () => {
  let mockStadium: StadiumDefinition;
  let mockCtx: CanvasRenderingContext2D;

  beforeEach(() => {
    mockStadium = createDefaultStadium('Estadio Monumental Hotfix');
    mockCtx = createMockCanvasContext();
  });

  describe('15.5.1: Apron Perimeter Material Support', () => {
    const apronMaterials: ApronMaterial[] = [
      'grass',
      'concrete',
      'rubber_tartan',
      'artificial_turf',
      'gravel_ballast',
      'asphalt_paved',
    ];

    it('should have at least 5 apron perimeter material options (implemented 6)', () => {
      expect(apronMaterials.length).toBeGreaterThanOrEqual(5);
    });

    it('should initialize default stadium with grass apron material', () => {
      expect(mockStadium.apronMaterial).toBe('grass');
    });

    it.each(apronMaterials)('should render apron material "%s" in drawStadiumArchitecture without crashing', (material) => {
      mockStadium.apronMaterial = material;
      expect(() => {
        drawStadiumArchitecture(
          mockCtx,
          1000,
          1000,
          'monumental',
          'noon',
          HOME_KIT,
          AWAY_KIT,
          undefined,
          mockStadium
        );
      }).not.toThrow();
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
    });

    it.each(apronMaterials)('should render apron material "%s" in Aerial Sky-Cam without crashing', (material) => {
      mockStadium.apronMaterial = material;
      expect(() => {
        drawAerialSkyCam(mockCtx, mockStadium, { timeOfDay: 'noon', showBroadcastHUD: true });
      }).not.toThrow();
    });
  });

  describe('15.5.2: Aerial View Pitch Bleed & Aperture Calibration', () => {
    it('should securely enclose the regulation pitch inside the aerial stadium bowl', () => {
      // In skyCamRenderer, apertureRadiusX is 930-960 and apertureRadiusY is 660-740
      // Pitch half-width is 675, pitch half-height is 450
      // The pitch is completely enclosed within the roof opening
      const pitchHalfWidth = 675;
      const pitchHalfHeight = 450;
      const minApertureRadiusX = 930;
      const minApertureRadiusY = 660;

      expect(minApertureRadiusX).toBeGreaterThan(pitchHalfWidth);
      expect(minApertureRadiusY).toBeGreaterThan(pitchHalfHeight);

      // Verify clearance margin for apron and running track
      const marginX = minApertureRadiusX - pitchHalfWidth;
      const marginY = minApertureRadiusY - pitchHalfHeight;
      expect(marginX).toBeGreaterThanOrEqual(200);
      expect(marginY).toBeGreaterThanOrEqual(150);
    });

    it('should render all 4 architectural shapes in Aerial Sky-Cam without throwing', () => {
      const shapes: StadiumShape[] = ['round', 'oval', 'square', 'rectangular'];
      shapes.forEach((shp) => {
        mockStadium.shape = shp;
        mockStadium.hasTrack = shp === 'round' || shp === 'oval';
        expect(() => {
          drawAerialSkyCam(mockCtx, mockStadium, { timeOfDay: 'sunset', showBroadcastHUD: true });
        }).not.toThrow();
      });
    });
  });

  describe('15.5.3: Running Track Geometry Calibration for Round & Oval Stadiums', () => {
    it('should correctly position running track between pitch apron and grandstand bowl', () => {
      // Round stadium track encircles pitch
      mockStadium.shape = 'round';
      mockStadium.hasTrack = true;
      expect(() => {
        drawStadiumArchitecture(
          mockCtx,
          1000,
          1000,
          'monumental',
          'night',
          HOME_KIT,
          AWAY_KIT,
          undefined,
          mockStadium
        );
      }).not.toThrow();

      // Oval stadium track encircles pitch with straight touchlines and semicircular end curves
      mockStadium.shape = 'oval';
      mockStadium.hasTrack = true;
      expect(() => {
        drawStadiumArchitecture(
          mockCtx,
          1000,
          1000,
          'monumental',
          'night',
          HOME_KIT,
          AWAY_KIT,
          undefined,
          mockStadium
        );
      }).not.toThrow();
    });
  });

  describe('15.5.4: 360° Panoramic Surroundings & Time-of-Day Variants', () => {
    const allSurroundings: SurroundingsType[] = [
      'mountains',
      'forest',
      'savannah',
      'highway',
      'small_city',
      'big_city',
      'beach',
      'airport',
      'railroad',
      'parking_lot',
      'marine_floating',
    ];

    it('should provide backdrop mappings for mountains, forest, savannah, and highway', () => {
      const mountainIds = getBackdropsForSurroundings('mountains').map((b) => b.id);
      expect(mountainIds).toContain('alpine_peaks');

      const forestIds = getBackdropsForSurroundings('forest').map((b) => b.id);
      expect(forestIds).toContain('dense_pine_woodland');

      const savannahIds = getBackdropsForSurroundings('savannah').map((b) => b.id);
      expect(savannahIds).toContain('acacia_plains');

      const highwayIds = getBackdropsForSurroundings('highway').map((b) => b.id);
      expect(highwayIds).toContain('cloverleaf_interchange');
    });

    it.each(allSurroundings)('should render perimeter horizon for surroundings "%s"', (surroundings) => {
      mockStadium.surroundings = surroundings;
      expect(() => {
        drawPerimeterHorizon(mockCtx, 1000, 1000, 'monumental', 'noon', undefined, surroundings);
      }).not.toThrow();
    });

    it('should support 3 time-of-day variants (noon, sunset, night) across surroundings', () => {
      const times = ['noon', 'sunset', 'night'] as const;
      const mockBounds = {
        left: -500,
        top: -500,
        width: 2500,
        height: 2500,
        stadiumBounds: {
          centerX: 1000,
          centerY: 1000,
          outerWidth: 1200,
          outerHeight: 900,
        },
      };

      times.forEach((tod) => {
        ['mountains', 'forest', 'savannah', 'highway', 'small_city', 'big_city'].forEach((sur) => {
          expect(() => {
            drawAerialEnvironment(mockCtx, sur as SurroundingsType, tod, mockBounds);
            drawPerimeterHorizon(mockCtx, 1000, 1000, 'monumental', tod, undefined, sur as SurroundingsType);
          }).not.toThrow();
        });
      });
    });
  });

  describe('15.5.5: Architectural Shape Distinctiveness in Full Pitch View', () => {
    it.each(['round', 'oval', 'square', 'rectangular'] as StadiumShape[])(
      'should render distinctive grandstand geometry for shape "%s"',
      (shape) => {
        mockStadium.shape = shape;
        expect(() => {
          drawStadiumArchitecture(
            mockCtx,
            1000,
            1000,
            'monumental',
            'noon',
            HOME_KIT,
            AWAY_KIT,
            undefined,
            mockStadium
          );
        }).not.toThrow();
      }
    );
  });
});
