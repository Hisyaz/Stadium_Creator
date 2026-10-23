/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  TeamDefinition,
  TeamCategory,
  Confederation,
} from '../types/team';

import { MODERN_EUROPEAN_XI, CLASSIC_EUROPEAN_XI } from './teams/specialTeams';
import { MODERN_SOUTH_AMERICAN_XI, CLASSIC_SOUTH_AMERICAN_XI } from './teams/southAmericanLegends';
import { AFRICA_ALL_TIME_XI, ASIA_OCEANIA_ALL_TIME_XI, CONCACAF_LEGENDS } from './teams/otherLegends';
import { SPAIN_2026, ARGENTINA_2026 } from './teams/nationalTeams';
import { BOCA_JUNIORS_2026, RIVER_PLATE_2026, REAL_CUNDINAMARCA, BOGOTA_FC } from './teams/clubTeams';

export * from './teams/specialTeams';
export * from './teams/southAmericanLegends';
export * from './teams/otherLegends';
export * from './teams/nationalTeams';
export * from './teams/clubTeams';

/**
 * Phase 13.5: Expanded Multi-Tier Roster Database & All-Time Continental Showcase (7 Legendary Squads)
 *
 * Tiers:
 * - Tier S: All-Time Continental Showcase (93 - 98 OVR) with ⚡ Stat Breaks (7 Global Teams)
 * - Tier A: Elite International Contenders (87 OVR, Spain 2026 & Argentina 2026)
 * - Tier B: Heritage Pro Superclásico Rivals (76 - 77 OVR, Boca Juniors 2026 & River Plate 2026)
 * - Tier C: Ascenso Derby Underdogs (55 OVR, Real Cundinamarca & Bogotá FC)
 */

export const TEAM_DATABASE: TeamDefinition[] = [
  // ==========================================================================
  // TIER S — ALL-TIME CONTINENTAL SHOWCASE (7 LEGENDARY SQUADS)
  // ==========================================================================
  MODERN_EUROPEAN_XI,
  CLASSIC_EUROPEAN_XI,
  MODERN_SOUTH_AMERICAN_XI,
  CLASSIC_SOUTH_AMERICAN_XI,
  AFRICA_ALL_TIME_XI,
  ASIA_OCEANIA_ALL_TIME_XI,
  CONCACAF_LEGENDS,

  // ==========================================================================
  // TIER A — WORLD CUP HEAVYWEIGHTS (NATIONAL TEAMS)
  // ==========================================================================
  SPAIN_2026,
  ARGENTINA_2026,

  // ==========================================================================
  // TIER B — SUPERCLÁSICO RIVALS (CLUBS)
  // ==========================================================================
  BOCA_JUNIORS_2026,
  RIVER_PLATE_2026,

  // ==========================================================================
  // TIER C — ASCENSO DERBY RIVALS (CLUBS)
  // ==========================================================================
  REAL_CUNDINAMARCA,
  BOGOTA_FC,
];

// Phase 12: Team-Specific Home Stadium Binding & Kickoff Venue Registry (Section 12.5)
BOCA_JUNIORS_2026.homeStadiumId = 'la_bombonera';
BOCA_JUNIORS_2026.venueOverrides = {
  pitchPattern: 'diagonal_diamonds',
  netStyle: 'brazilian',
  netTension: 'hard',
  pitchSizePreset: 'compact',
  turfQuality: 'normal',
  dugoutStyle: 'covered_sunken',
  tunnelStyle: 'inflatable_accordion',
  fanColors: { primary: '#1d4ed8', secondary: '#eab308' },
  bannerMessages: ['¡LA 12 TE ALIENTA!', 'BOCA ES MUNDIAL', 'XENEIZE HASTA LA MUERTE'],
  sponsors: ['QUILMES', 'PIRELLI', 'FIAT', 'CABJ STORE'],
};

RIVER_PLATE_2026.homeStadiumId = 'estadio_monumental';
RIVER_PLATE_2026.venueOverrides = {
  pitchPattern: 'european_boxes',
  netStyle: 'standard',
  netTension: 'moderate',
  pitchSizePreset: 'balanced',
  turfQuality: 'pristine',
  dugoutStyle: 'recaro_racing',
  tunnelStyle: 'subterranean_staircase',
  fanColors: { primary: '#dc2626', secondary: '#ffffff' },
  bannerMessages: ['EL MAS GRANDE LEJOS', 'RIVER DE MI VIDA', 'CARP 1901'],
  sponsors: ['SONY', 'ADIDAS', 'FLY EMIRATES', 'BBVA'],
};

SPAIN_2026.homeStadiumId = 'santiago_bernabeu';
SPAIN_2026.venueOverrides = {
  pitchPattern: 'european_boxes',
  netStyle: 'standard',
  netTension: 'moderate',
  pitchSizePreset: 'balanced',
  turfQuality: 'pristine',
  dugoutStyle: 'recaro_racing',
  tunnelStyle: 'modern_architectural',
  fanColors: { primary: '#dc2626', secondary: '#facc15' },
  bannerMessages: ['VIVA ESPAÑA', 'LA FURIA ROJA', 'CAMPEONES DEL MUNDO'],
};

ARGENTINA_2026.homeStadiumId = 'estadio_monumental';
ARGENTINA_2026.venueOverrides = {
  pitchPattern: 'european_boxes',
  netStyle: 'standard',
  netTension: 'moderate',
  pitchSizePreset: 'balanced',
  turfQuality: 'pristine',
  dugoutStyle: 'recaro_racing',
  tunnelStyle: 'subterranean_staircase',
  fanColors: { primary: '#38bdf8', secondary: '#ffffff' },
  bannerMessages: ['MUCHACHOS AHORA NOS VOLVIMOS A ILUSIONAR', 'VAMOS ARGENTINA', '3 ESTRELLAS EN EL PECHO'],
};

REAL_CUNDINAMARCA.homeStadiumId = 'estadio_metropolitano_techo';
REAL_CUNDINAMARCA.venueOverrides = {
  pitchPattern: 'plain',
  netStyle: 'standard',
  netTension: 'soft',
  pitchSizePreset: 'compact',
  turfQuality: 'poor',
  dugoutStyle: 'utilitarian_concrete',
  tunnelStyle: 'inflatable_accordion',
  fanColors: { primary: '#005b41', secondary: '#ffd100' },
  bannerMessages: ['CUNDINAMARCA CORAZON', 'FUERZA REAL', 'ASCENSO PASION'],
};

BOGOTA_FC.homeStadiumId = 'estadio_metropolitano_techo';
BOGOTA_FC.venueOverrides = {
  pitchPattern: 'plain',
  netStyle: 'standard',
  netTension: 'soft',
  pitchSizePreset: 'compact',
  turfQuality: 'poor',
  dugoutStyle: 'utilitarian_concrete',
  tunnelStyle: 'inflatable_accordion',
  fanColors: { primary: '#e11d48', secondary: '#fbbf24' },
  bannerMessages: ['BOGOTA FC EN EL PECHO', 'LOS LEONES DE TECHO'],
};

CLASSIC_EUROPEAN_XI.homeStadiumId = 'craven_cottage';
CLASSIC_EUROPEAN_XI.venueOverrides = {
  pitchPattern: 'horizontal',
  netStyle: 'standard',
  netTension: 'moderate',
  pitchSizePreset: 'compact',
  turfQuality: 'normal',
  dugoutStyle: 'classic_timber',
  tunnelStyle: 'direct_portal',
};

MODERN_EUROPEAN_XI.homeStadiumId = 'santiago_bernabeu';
MODERN_EUROPEAN_XI.venueOverrides = {
  pitchPattern: 'european_boxes',
  netStyle: 'standard',
  netTension: 'moderate',
  pitchSizePreset: 'balanced',
  turfQuality: 'pristine',
  dugoutStyle: 'recaro_racing',
  tunnelStyle: 'modern_architectural',
};

CLASSIC_SOUTH_AMERICAN_XI.homeStadiumId = 'maracana_legend';
CLASSIC_SOUTH_AMERICAN_XI.venueOverrides = {
  pitchPattern: 'plain',
  netStyle: 'brazilian',
  netTension: 'hard',
  pitchSizePreset: 'expansive',
  turfQuality: 'pristine',
  dugoutStyle: 'recaro_racing',
  tunnelStyle: 'inflatable_accordion',
};

MODERN_SOUTH_AMERICAN_XI.homeStadiumId = 'maracana_legend';
MODERN_SOUTH_AMERICAN_XI.venueOverrides = {
  pitchPattern: 'plain',
  netStyle: 'brazilian',
  netTension: 'hard',
  pitchSizePreset: 'expansive',
  turfQuality: 'pristine',
  dugoutStyle: 'recaro_racing',
  tunnelStyle: 'inflatable_accordion',
};

ASIA_OCEANIA_ALL_TIME_XI.homeStadiumId = 'floating_marina_arena';
ASIA_OCEANIA_ALL_TIME_XI.venueOverrides = {
  pitchPattern: 'checkerboard',
  netStyle: 'standard',
  pitchSizePreset: 'balanced',
  turfQuality: 'pristine',
  dugoutStyle: 'covered_sunken',
  tunnelStyle: 'direct_portal',
};

CONCACAF_LEGENDS.homeStadiumId = 'victoria_runway_ground';
CONCACAF_LEGENDS.venueOverrides = {
  pitchPattern: 'vertical',
  netStyle: 'standard',
  pitchSizePreset: 'compact',
  turfQuality: 'normal',
  dugoutStyle: 'folding_chairs',
  tunnelStyle: 'telescopic_canopy',
};

AFRICA_ALL_TIME_XI.homeStadiumId = 'estadio_monumental';

/**
 * Helper Utilities for Team Querying & Hierarchical Navigation
 */

export function getAllTeams(): TeamDefinition[] {
  return TEAM_DATABASE;
}

export function getTeamById(id: string): TeamDefinition {
  // Backwards compatibility aliases for retired legacy squads & short queries
  if (id === 'ginga_all_stars' || id === 'pixel_legends') {
    return MODERN_EUROPEAN_XI;
  }
  if (id === 'boca_juniors') {
    return BOCA_JUNIORS_2026;
  }
  if (id === 'river_plate') {
    return RIVER_PLATE_2026;
  }
  if (id === 'classic_european') {
    return CLASSIC_EUROPEAN_XI;
  }
  if (id === 'modern_european') {
    return MODERN_EUROPEAN_XI;
  }
  const found = TEAM_DATABASE.find(t => t.id === id);
  if (found) return found;
  return TEAM_DATABASE[0]; // Fallback to first team
}

export function getCategories(): { id: TeamCategory; label: string; icon: string; count: number }[] {
  return [
    { id: 'club', label: 'Club Teams', icon: '🛡️', count: TEAM_DATABASE.filter(t => t.category === 'club').length },
    { id: 'national', label: 'National Teams', icon: '🌍', count: TEAM_DATABASE.filter(t => t.category === 'national').length },
    { id: 'special', label: 'Special Teams', icon: '⚡', count: TEAM_DATABASE.filter(t => t.category === 'special').length },
  ];
}

export function getConfederations(category?: TeamCategory): { id: Confederation; label: string; region: string; count: number }[] {
  const teams = category ? TEAM_DATABASE.filter(t => t.category === category) : TEAM_DATABASE;
  const confedCounts = new Map<Confederation, number>();
  teams.forEach(t => {
    confedCounts.set(t.confederation, (confedCounts.get(t.confederation) || 0) + 1);
  });

  const defs: Record<Confederation, { id: Confederation; label: string; region: string }> = {
    uefa: { id: 'uefa', label: 'UEFA', region: 'Europe' },
    conmebol: { id: 'conmebol', label: 'CONMEBOL', region: 'South America' },
    concacaf: { id: 'concacaf', label: 'CONCACAF', region: 'North, Central America & Caribbean' },
    afc: { id: 'afc', label: 'AFC', region: 'Asia' },
    caf: { id: 'caf', label: 'CAF', region: 'Africa' },
    ofc: { id: 'ofc', label: 'OFC', region: 'Oceania' },
    special: { id: 'special', label: 'Special Teams', region: 'All-Time Continental Showcase' },
  };

  return Array.from(confedCounts.keys()).map(c => ({
    ...(defs[c] || { id: c, label: c.toUpperCase(), region: c }),
    count: confedCounts.get(c) || 0,
  }));
}

export function getCountries(category: TeamCategory, confederation: Confederation): string[] {
  const teams = TEAM_DATABASE.filter(t => t.category === category && t.confederation === confederation);
  const countries = new Set<string>();
  teams.forEach(t => countries.add(t.country));
  return Array.from(countries);
}

export function getLeagues(category: TeamCategory, confederation: Confederation, country: string): string[] {
  const teams = TEAM_DATABASE.filter(
    t => t.category === category && t.confederation === confederation && t.country === country
  );
  const leagues = new Set<string>();
  teams.forEach(t => {
    if (t.league) leagues.add(t.league);
  });
  return Array.from(leagues);
}

export function getTeamsByFilter(
  category?: TeamCategory,
  confederation?: Confederation,
  country?: string,
  league?: string
): TeamDefinition[] {
  return TEAM_DATABASE.filter(t => {
    if (category && t.category !== category) return false;
    if (category === 'special') return true; // Special teams are all directly visible!
    if (confederation && t.confederation !== confederation) return false;
    if (country && t.country !== country) return false;
    if (league && t.league && t.league !== league) return false;
    return true;
  });
}

/**
 * 🎲 One-Click Instant Random Team Selector
 */
export function getRandomTeam(filter?: { category?: TeamCategory; confederation?: Confederation }): TeamDefinition {
  let pool = TEAM_DATABASE;
  if (filter?.category) {
    pool = pool.filter(t => t.category === filter.category);
  }
  if (filter?.confederation) {
    pool = pool.filter(t => t.confederation === filter.confederation);
  }
  if (pool.length === 0) pool = TEAM_DATABASE;
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx];
}
