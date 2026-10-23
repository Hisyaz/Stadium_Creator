/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  StadiumDefinition,
  StandConfig,
  StandPosition,
  calculateStadiumTotalCapacity,
  calculateFifaQualification,
} from '../types/stadium';
import { TeamDefinition } from '../types/team';

function createDefaultStands(grade: StandConfig['grade'], tierCount: 1 | 2 | 3 | 4, primaryColor: string, secondaryColor: string): Record<StandPosition, StandConfig> {
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
    const isCorner = pos.startsWith('corner_');
    stands[pos] = {
      position: pos,
      type: 'tiered',
      grade,
      tierCount,
      tiers: Array.from({ length: tierCount }, () => ({ size: isCorner ? 'small' : 'medium' })),
      primaryColor,
      secondaryColor,
      hasRoof: true,
      roofCoverage: 0.85,
    };
  }
  return stands;
}

/**
 * Canonical Registered Stadiums for Phase 12
 */

// 1. ESTADIO MONUMENTAL (River Plate & Argentina 2026 Home)
const monumentalStands = createDefaultStands('grade4_modern', 3, '#dc2626', '#ffffff');
const monumentalCapacity = calculateStadiumTotalCapacity(monumentalStands, 'oval');
export const ESTADIO_MONUMENTAL: StadiumDefinition = {
  id: 'estadio_monumental',
  name: 'Estadio Mâs Monumental',
  shortName: 'Monumental',
  city: 'Buenos Aires',
  country: 'Argentina',
  shape: 'oval',
  surroundings: 'big_city',
  hasTrack: true,
  apronMaterial: 'rubber_tartan',
  stands: monumentalStands,
  seats: {
    style: 'tip_up_padded',
    pattern: 'horizontalBands',
    colors: ['#dc2626', '#ffffff', '#e2e8f0'],
  },
  lighting: {
    type: 'corner_pylons',
    pylonCount: 4,
    powerKw: 2400,
    timeOfDay: 'night',
  },
  dugouts: {
    type: 'covered_sunken',
    quality: 'luxury',
    frameColor: '#dc2626',
    cushionColor: '#ffffff',
    shelterTint: 'rgba(15, 23, 42, 0.85)',
    setbackDistance: 16,
  },
  tunnel: {
    type: 'inflatable_accordion',
    siting: 'center_main',
    primaryColor: '#dc2626',
    secondaryColor: '#ffffff',
  },
  capacity: monumentalCapacity,
  fifaCategory: calculateFifaQualification(monumentalCapacity),
  pitchPreset: 'balanced',
  pitchLengthMeters: 105,
  pitchWidthMeters: 68,
  turfQuality: 'pristine',
  mowingPattern: 'european_boxes',
  grassLength: 'normal',
  surfaceStatus: 'normal',
  goalFrame: 'standard',
  netTension: 'moderate',
  seatColor: 'red',
};

// 2. LA BOMBONERA (Boca Juniors Home)
const bomboneraStands = createDefaultStands('grade3_industrial', 3, '#1d4ed8', '#eab308');
// East Stand is the iconic steep vertical Wall Tier / Palcos Box Tower!
bomboneraStands.east = {
  position: 'east',
  type: 'wall',
  grade: 'grade3_industrial',
  wallSize: 'small',
  primaryColor: '#1d4ed8',
  secondaryColor: '#eab308',
  hasRoof: true,
  roofCoverage: 0.6,
};
// North & South are 2-tier steep terraces
bomboneraStands.north.tierCount = 2;
bomboneraStands.north.tiers = [{ size: 'medium' }, { size: 'medium' }];
bomboneraStands.south.tierCount = 2;
bomboneraStands.south.tiers = [{ size: 'medium' }, { size: 'medium' }];
// Due to the flat eastern property boundary (Del Valle Iberlucea), the eastern corners are open with perimeter walls
bomboneraStands.corner_ne = {
  position: 'corner_ne',
  type: 'none',
  grade: 'grade3_industrial',
  backdrop: 'wall',
  primaryColor: '#1d4ed8',
  secondaryColor: '#eab308',
  hasRoof: false,
  roofCoverage: 0,
};
bomboneraStands.corner_se = {
  position: 'corner_se',
  type: 'none',
  grade: 'grade3_industrial',
  backdrop: 'wall',
  primaryColor: '#1d4ed8',
  secondaryColor: '#eab308',
  hasRoof: false,
  roofCoverage: 0,
};
bomboneraStands.corner_nw.tierCount = 2;
bomboneraStands.corner_nw.tiers = [{ size: 'small' }, { size: 'small' }];
bomboneraStands.corner_sw.tierCount = 2;
bomboneraStands.corner_sw.tiers = [{ size: 'small' }, { size: 'small' }];
const bomboneraCapacity = calculateStadiumTotalCapacity(bomboneraStands, 'rectangular');
export const LA_BOMBONERA: StadiumDefinition = {
  id: 'la_bombonera',
  name: 'Estadio Alberto J. Armando (La Bombonera)',
  shortName: 'La Bombonera',
  city: 'Buenos Aires',
  country: 'Argentina',
  shape: 'rectangular',
  surroundings: 'small_city',
  hasTrack: false,
  apronMaterial: 'concrete',
  stands: bomboneraStands,
  seats: {
    style: 'classic_bucket',
    pattern: 'horizontalBands',
    colors: ['#1d4ed8', '#eab308'],
  },
  lighting: {
    type: 'roof_banks',
    pylonCount: 4,
    powerKw: 2000,
    timeOfDay: 'night',
  },
  dugouts: {
    type: 'racing_bucket',
    quality: 'modern',
    frameColor: '#1d4ed8',
    cushionColor: '#eab308',
    shelterTint: 'rgba(30, 41, 59, 0.9)',
    setbackDistance: 14,
  },
  tunnel: {
    type: 'subterranean_staircase',
    siting: 'corner',
    primaryColor: '#1d4ed8',
    secondaryColor: '#eab308',
    hasBellows: false,
  },
  capacity: bomboneraCapacity,
  fifaCategory: calculateFifaQualification(bomboneraCapacity),
  pitchPreset: 'compact',
  pitchLengthMeters: 100,
  pitchWidthMeters: 64,
  turfQuality: 'normal',
  mowingPattern: 'diagonal_diamonds',
  grassLength: 'short',
  surfaceStatus: 'normal',
  goalFrame: 'brazilian',
  netTension: 'hard',
  seatColor: 'blue',
};

// 3. SANTIAGO BERNABÉU (Spain 2026 & Modern European XI Home)
const bernabeuStands = createDefaultStands('grade5_futuristic', 4, '#1e293b', '#38bdf8');
const bernabeuCapacity = calculateStadiumTotalCapacity(bernabeuStands, 'rectangular');
export const SANTIAGO_BERNABEU: StadiumDefinition = {
  id: 'santiago_bernabeu',
  name: 'Estadio Santiago Bernabéu',
  shortName: 'Bernabéu',
  city: 'Madrid',
  country: 'Spain',
  shape: 'rectangular',
  surroundings: 'big_city',
  hasTrack: false,
  apronMaterial: 'artificial_turf',
  stands: bernabeuStands,
  seats: {
    style: 'vip_leather',
    pattern: 'solid',
    colors: ['#0284c7', '#38bdf8'],
  },
  lighting: {
    type: 'roof_banks',
    pylonCount: 4,
    powerKw: 3200,
    timeOfDay: 'night',
  },
  dugouts: {
    type: 'recaro_racing',
    quality: 'elite_vip',
    frameColor: '#0f172a',
    cushionColor: '#0284c7',
    shelterTint: 'rgba(15, 23, 42, 0.95)',
    setbackDistance: 18,
  },
  tunnel: {
    type: 'modern_architectural',
    siting: 'center_main',
    primaryColor: '#0284c7',
    secondaryColor: '#38bdf8',
    backlitLeds: true,
  },
  capacity: bernabeuCapacity,
  fifaCategory: calculateFifaQualification(bernabeuCapacity),
  pitchPreset: 'balanced',
  pitchLengthMeters: 105,
  pitchWidthMeters: 68,
  turfQuality: 'pristine',
  mowingPattern: 'european_boxes',
  grassLength: 'short',
  surfaceStatus: 'normal',
  goalFrame: 'standard',
  netTension: 'moderate',
  seatColor: 'blue',
};

// 4. CRAVEN COTTAGE (Classic European XI Home)
const cravenStands = createDefaultStands('grade2_classic', 1, '#991b1b', '#f8fafc');
// West stand (Riverside) is a 2-tier stand
cravenStands.west.tierCount = 2;
cravenStands.west.tiers = [{ size: 'medium' }, { size: 'medium' }];
// Classic English ground with open corners and brick boundary wall
cravenStands.corner_ne = {
  position: 'corner_ne',
  type: 'none',
  grade: 'grade2_classic',
  backdrop: 'small_houses',
  perimeterFinish: 'brick_wall',
  primaryColor: '#991b1b',
  secondaryColor: '#f8fafc',
  hasRoof: false,
  roofCoverage: 0,
};
cravenStands.corner_nw = {
  position: 'corner_nw',
  type: 'none',
  grade: 'grade2_classic',
  backdrop: 'small_houses',
  perimeterFinish: 'brick_wall',
  primaryColor: '#991b1b',
  secondaryColor: '#f8fafc',
  hasRoof: false,
  roofCoverage: 0,
};
cravenStands.corner_se = {
  position: 'corner_se',
  type: 'none',
  grade: 'grade2_classic',
  backdrop: 'small_houses',
  perimeterFinish: 'brick_wall',
  primaryColor: '#991b1b',
  secondaryColor: '#f8fafc',
  hasRoof: false,
  roofCoverage: 0,
};
cravenStands.corner_sw = {
  position: 'corner_sw',
  type: 'none',
  grade: 'grade2_classic',
  backdrop: 'small_houses',
  perimeterFinish: 'brick_wall',
  primaryColor: '#991b1b',
  secondaryColor: '#f8fafc',
  hasRoof: false,
  roofCoverage: 0,
};
const cravenCapacity = calculateStadiumTotalCapacity(cravenStands, 'rectangular');
export const CRAVEN_COTTAGE: StadiumDefinition = {
  id: 'craven_cottage',
  name: 'Craven Heritage Ground',
  shortName: 'Craven Ground',
  city: 'London',
  country: 'England',
  shape: 'rectangular',
  surroundings: 'nature',
  hasTrack: false,
  apronMaterial: 'grass',
  stands: cravenStands,
  seats: {
    style: 'classic_bucket',
    pattern: 'horizontalBands',
    colors: ['#991b1b', '#f8fafc'],
  },
  lighting: {
    type: 'corner_pylons',
    pylonCount: 4,
    powerKw: 1600,
    timeOfDay: 'night',
  },
  dugouts: {
    type: 'classic_timber',
    quality: 'classic',
    frameColor: '#78350f',
    cushionColor: '#991b1b',
    shelterTint: 'rgba(30, 41, 59, 0.85)',
    setbackDistance: 12,
  },
  tunnel: {
    type: 'direct_portal',
    siting: 'corner',
    primaryColor: '#991b1b',
    secondaryColor: '#f8fafc',
  },
  capacity: cravenCapacity,
  fifaCategory: calculateFifaQualification(cravenCapacity),
  pitchPreset: 'compact',
  pitchLengthMeters: 100,
  pitchWidthMeters: 65,
  turfQuality: 'normal',
  mowingPattern: 'horizontal',
  grassLength: 'normal',
  surfaceStatus: 'normal',
  goalFrame: 'standard',
  netTension: 'moderate',
  seatColor: 'wooden',
};

// 5. ESTADIO METROPOLITANO DE TECHO (Bogotá FC & Real Cundinamarca Home)
const techoStands = createDefaultStands('grade1_municipal', 1, '#15803d', '#facc15');
// North & South are open without stands
techoStands.north = {
  position: 'north',
  type: 'none',
  grade: 'grade1_municipal',
  backdrop: 'small_houses',
  perimeterFinish: 'chainlink_fence',
  primaryColor: '#475569',
  secondaryColor: '#cbd5e1',
  hasRoof: false,
  roofCoverage: 0,
};
techoStands.south = {
  position: 'south',
  type: 'none',
  grade: 'grade1_municipal',
  backdrop: 'wall',
  wallPerimeter: { size: 'medium', material: 'concrete' },
  primaryColor: '#475569',
  secondaryColor: '#cbd5e1',
  hasRoof: false,
  roofCoverage: 0,
};
const techoCapacity = calculateStadiumTotalCapacity(techoStands, 'square');
export const ESTADIO_TECHO: StadiumDefinition = {
  id: 'estadio_metropolitano_techo',
  name: 'Estadio Metropolitano de Techo',
  shortName: 'Techo Municipal',
  city: 'Bogotá',
  country: 'Colombia',
  shape: 'square',
  surroundings: 'small_city',
  hasTrack: false,
  apronMaterial: 'asphalt_paved',
  stands: techoStands,
  seats: {
    style: 'plastic_bench',
    pattern: 'solid',
    colors: ['#15803d', '#facc15'],
  },
  lighting: {
    type: 'light_poles',
    pylonCount: 4,
    powerKw: 900,
    timeOfDay: 'sunset',
  },
  dugouts: {
    type: 'utilitarian_concrete',
    quality: 'municipal',
    frameColor: '#475569',
    cushionColor: '#15803d',
    shelterTint: 'rgba(30, 41, 59, 0.75)',
    setbackDistance: 10,
  },
  tunnel: {
    type: 'inflatable_accordion',
    siting: 'center_main',
    primaryColor: '#15803d',
    secondaryColor: '#facc15',
    hasBellows: true,
  },
  capacity: techoCapacity,
  fifaCategory: calculateFifaQualification(techoCapacity),
  pitchPreset: 'compact',
  pitchLengthMeters: 100,
  pitchWidthMeters: 64,
  turfQuality: 'poor',
  mowingPattern: 'plain',
  grassLength: 'long',
  surfaceStatus: 'dry',
  goalFrame: 'standard',
  netTension: 'soft',
  seatColor: 'concrete',
};

// 6. MARACANÃ LEGENDS BOWL (Classic South American XI Home)
const maracanaStands = createDefaultStands('grade4_modern', 3, '#047857', '#fbbf24');
const maracanaCapacity = calculateStadiumTotalCapacity(maracanaStands, 'round');
export const MARACANA_LEGEND: StadiumDefinition = {
  id: 'maracana_legend',
  name: 'Estádio do Maracanã (Legends Arena)',
  shortName: 'Maracanã',
  city: 'Rio de Janeiro',
  country: 'Brazil',
  shape: 'round',
  surroundings: 'nature',
  hasTrack: true,
  apronMaterial: 'rubber_tartan',
  stands: maracanaStands,
  seats: {
    style: 'classic_bucket',
    pattern: 'lowerUpper',
    colors: ['#047857', '#fbbf24', '#0284c7'],
  },
  lighting: {
    type: 'corner_pylons',
    pylonCount: 4,
    powerKw: 2800,
    timeOfDay: 'night',
  },
  dugouts: {
    type: 'recaro_racing',
    quality: 'modern',
    frameColor: '#047857',
    cushionColor: '#fbbf24',
    shelterTint: 'rgba(15, 23, 42, 0.85)',
    setbackDistance: 16,
  },
  tunnel: {
    type: 'inflatable_accordion',
    siting: 'center_main',
    primaryColor: '#047857',
    secondaryColor: '#fbbf24',
    hasBellows: true,
  },
  capacity: maracanaCapacity,
  fifaCategory: calculateFifaQualification(maracanaCapacity),
  pitchPreset: 'expansive',
  pitchLengthMeters: 110,
  pitchWidthMeters: 74,
  turfQuality: 'pristine',
  mowingPattern: 'plain',
  grassLength: 'normal',
  surfaceStatus: 'normal',
  goalFrame: 'brazilian',
  netTension: 'hard',
  seatColor: 'green',
};

// 7. VICTORIA AIRPORT GROUND (Airport Runway Open Stand)
const runwayStands = createDefaultStands('grade1_municipal', 1, '#2563eb', '#ffffff');
// Runway and open airport fencing along north, east, and all corners
runwayStands.north = {
  position: 'north',
  type: 'none',
  grade: 'grade1_municipal',
  backdrop: 'runway',
  perimeterFinish: 'big_fence',
  primaryColor: '#334155',
  secondaryColor: '#64748b',
  hasRoof: false,
  roofCoverage: 0,
};
runwayStands.east = {
  position: 'east',
  type: 'none',
  grade: 'grade1_municipal',
  backdrop: 'runway',
  perimeterFinish: 'chainlink_fence',
  primaryColor: '#334155',
  secondaryColor: '#64748b',
  hasRoof: false,
  roofCoverage: 0,
};
runwayStands.corner_ne = {
  position: 'corner_ne',
  type: 'none',
  grade: 'grade1_municipal',
  backdrop: 'runway',
  primaryColor: '#334155',
  secondaryColor: '#64748b',
  hasRoof: false,
  roofCoverage: 0,
};
runwayStands.corner_nw = {
  position: 'corner_nw',
  type: 'none',
  grade: 'grade1_municipal',
  backdrop: 'runway',
  primaryColor: '#334155',
  secondaryColor: '#64748b',
  hasRoof: false,
  roofCoverage: 0,
};
runwayStands.corner_se = {
  position: 'corner_se',
  type: 'none',
  grade: 'grade1_municipal',
  backdrop: 'runway',
  primaryColor: '#334155',
  secondaryColor: '#64748b',
  hasRoof: false,
  roofCoverage: 0,
};
runwayStands.corner_sw = {
  position: 'corner_sw',
  type: 'none',
  grade: 'grade1_municipal',
  backdrop: 'runway',
  primaryColor: '#334155',
  secondaryColor: '#64748b',
  hasRoof: false,
  roofCoverage: 0,
};
const runwayCapacity = calculateStadiumTotalCapacity(runwayStands, 'rectangular');
export const VICTORIA_AIRPORT_GROUND: StadiumDefinition = {
  id: 'victoria_runway_ground',
  name: 'Victoria Runway Ground',
  shortName: 'Victoria Ground',
  city: 'Gibraltar',
  country: 'Gibraltar',
  shape: 'rectangular',
  surroundings: 'airport',
  hasTrack: false,
  apronMaterial: 'gravel_ballast',
  stands: runwayStands,
  seats: {
    style: 'plastic_bench',
    pattern: 'solid',
    colors: ['#2563eb', '#ffffff'],
  },
  lighting: {
    type: 'light_poles',
    pylonCount: 4,
    powerKw: 800,
    timeOfDay: 'noon',
  },
  dugouts: {
    type: 'folding_chairs',
    quality: 'municipal',
    frameColor: '#2563eb',
    cushionColor: '#ffffff',
    shelterTint: 'rgba(255, 255, 255, 0.2)',
    setbackDistance: 8,
  },
  tunnel: {
    type: 'telescopic_canopy',
    siting: 'center_main',
    primaryColor: '#2563eb',
    secondaryColor: '#ffffff',
  },
  capacity: runwayCapacity,
  fifaCategory: calculateFifaQualification(runwayCapacity),
  pitchPreset: 'compact',
  pitchLengthMeters: 100,
  pitchWidthMeters: 64,
  turfQuality: 'normal',
  mowingPattern: 'vertical',
  grassLength: 'normal',
  surfaceStatus: 'dry',
  goalFrame: 'standard',
  netTension: 'moderate',
  seatColor: 'blue',
};

// 8. FLOATING MARINA ARENA (Marine Floating Surroundings)
const marinaStands = createDefaultStands('grade4_modern', 2, '#0284c7', '#38bdf8');
marinaStands.north = {
  position: 'north',
  type: 'none',
  grade: 'grade4_modern',
  backdrop: 'open_ocean',
  perimeterFinish: 'chainlink_fence',
  primaryColor: '#0369a1',
  secondaryColor: '#38bdf8',
  hasRoof: false,
  roofCoverage: 0,
};
const marinaCapacity = calculateStadiumTotalCapacity(marinaStands, 'rectangular');
export const FLOATING_MARINA_ARENA: StadiumDefinition = {
  id: 'floating_marina_arena',
  name: 'Oceanic Floating Marina Stadium',
  shortName: 'Floating Arena',
  city: 'Marina Bay',
  country: 'Singapore',
  shape: 'rectangular',
  surroundings: 'marine_floating',
  hasTrack: false,
  apronMaterial: 'concrete',
  stands: marinaStands,
  seats: {
    style: 'tip_up_padded',
    pattern: 'verticalStripes',
    colors: ['#0284c7', '#38bdf8', '#ffffff'],
  },
  lighting: {
    type: 'roof_banks',
    pylonCount: 4,
    powerKw: 2200,
    timeOfDay: 'sunset',
  },
  dugouts: {
    type: 'covered_sunken',
    quality: 'modern',
    frameColor: '#0284c7',
    cushionColor: '#ffffff',
    shelterTint: 'rgba(15, 23, 42, 0.9)',
    setbackDistance: 14,
  },
  tunnel: {
    type: 'direct_portal',
    siting: 'center_main',
    primaryColor: '#0284c7',
    secondaryColor: '#38bdf8',
  },
  capacity: marinaCapacity,
  fifaCategory: calculateFifaQualification(marinaCapacity),
  pitchPreset: 'balanced',
  pitchLengthMeters: 105,
  pitchWidthMeters: 68,
  turfQuality: 'pristine',
  mowingPattern: 'checkerboard',
  grassLength: 'short',
  surfaceStatus: 'wet',
  goalFrame: 'standard',
  netTension: 'moderate',
  seatColor: 'blue',
};

export const STADIUM_REGISTRY: Record<string, StadiumDefinition> = {
  estadio_monumental: ESTADIO_MONUMENTAL,
  la_bombonera: LA_BOMBONERA,
  santiago_bernabeu: SANTIAGO_BERNABEU,
  craven_cottage: CRAVEN_COTTAGE,
  estadio_metropolitano_techo: ESTADIO_TECHO,
  maracana_legend: MARACANA_LEGEND,
  victoria_runway_ground: VICTORIA_AIRPORT_GROUND,
  floating_marina_arena: FLOATING_MARINA_ARENA,
};

/**
 * Phase 14.2: Factory to create initial base stadium
 * Initializes with lowest tier (Tier 1) in Small size across all stands with stacked tiers visible immediately.
 */
export function createDefaultStadium(customName?: string): StadiumDefinition {
  const stands = createDefaultStands('grade1_municipal', 1, '#2563eb', '#1e40af');
  // Explicitly ensure every stand has 1 small tier
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
  for (const p of positions) {
    stands[p] = {
      position: p,
      type: 'tiered',
      grade: 'grade1_municipal',
      tierCount: 1,
      tiers: [{ size: 'small' }],
      primaryColor: '#2563eb',
      secondaryColor: '#1e40af',
      hasRoof: true,
      roofCoverage: 0.75,
    };
  }

  const id = `custom_${Date.now()}`;
  const name = customName || 'Arcade Municipal Arena';
  const capacity = calculateStadiumTotalCapacity(stands, 'rectangular');
  const fifaCategory = calculateFifaQualification(capacity, 'grade1_municipal', 800, 'normal');

  return {
    id,
    name,
    shortName: customName ? customName.slice(0, 14) : 'Municipal',
    city: 'Arcade City',
    country: 'International',
    shape: 'rectangular',
    surroundings: 'small_city',
    hasTrack: false,
    apronMaterial: 'grass',
    stands,
    seats: {
      style: 'plastic_bench',
      pattern: 'solid',
      colors: ['#2563eb', '#ffffff'],
    },
    lighting: {
      type: 'light_poles',
      pylonCount: 4,
      powerKw: 800,
      timeOfDay: 'night',
    },
    dugouts: {
      type: 'classic_timber',
      quality: 'municipal',
      frameColor: '#78350f',
      cushionColor: '#2563eb',
      shelterTint: 'rgba(30, 41, 59, 0.8)',
      setbackDistance: 10,
    },
    tunnel: {
      type: 'direct_portal',
      siting: 'center_main',
      primaryColor: '#2563eb',
      secondaryColor: '#ffffff',
    },
    capacity,
    fifaCategory,
    pitchPreset: 'balanced',
    pitchLengthMeters: 105,
    pitchWidthMeters: 68,
    turfQuality: 'normal',
    mowingPattern: 'horizontal',
    grassLength: 'normal',
    surfaceStatus: 'normal',
    goalFrame: 'standard',
    netTension: 'moderate',
    seatColor: 'blue',
  };
}

/**
 * Phase 14: Save custom stadium to persistent registry and localStorage
 */
export function saveCustomStadium(stadium: StadiumDefinition): void {
  STADIUM_REGISTRY[stadium.id] = stadium;
  try {
    const customList = loadCustomStadiums();
    const existingIdx = customList.findIndex((s) => s.id === stadium.id);
    if (existingIdx >= 0) {
      customList[existingIdx] = stadium;
    } else {
      customList.push(stadium);
    }
    localStorage.setItem('swos_custom_stadiums', JSON.stringify(customList));
  } catch {}
}

/**
 * Load all custom stadiums from localStorage into active registry
 */
export function loadCustomStadiums(): StadiumDefinition[] {
  try {
    const raw = localStorage.getItem('swos_custom_stadiums');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      for (const std of parsed) {
        if (std && std.id && std.name) {
          STADIUM_REGISTRY[std.id] = std;
        }
      }
      return parsed;
    }
  } catch {}
  return [];
}

/**
 * Delete a custom stadium from registry and localStorage
 */
export function deleteCustomStadium(stadiumId: string): void {
  delete STADIUM_REGISTRY[stadiumId];
  try {
    const customList = loadCustomStadiums().filter((s) => s.id !== stadiumId);
    localStorage.setItem('swos_custom_stadiums', JSON.stringify(customList));
  } catch {}
}

// Auto-hydrate custom stadiums on startup
if (typeof window !== 'undefined') {
  try {
    loadCustomStadiums();
  } catch {}
}

export function getAllRegisteredStadiums(): StadiumDefinition[] {
  return Object.values(STADIUM_REGISTRY);
}

export function getStadiumById(id: string): StadiumDefinition {
  return STADIUM_REGISTRY[id] || ESTADIO_MONUMENTAL;
}

export function getHomeStadiumForTeam(team: TeamDefinition): StadiumDefinition | null {
  if (team.homeStadiumId && STADIUM_REGISTRY[team.homeStadiumId]) {
    return STADIUM_REGISTRY[team.homeStadiumId];
  }
  return null;
}
