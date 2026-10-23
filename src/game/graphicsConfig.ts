/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GraphicsSettings, GraphicsTier, RetroFilterType } from '../types';

export const ALL_RETRO_FILTERS: {
  id: RetroFilterType;
  name: string;
  badge: string;
  era: string;
  description: string;
  achievementCondition: string;
}[] = [
  {
    id: 'none',
    name: 'Standard Clean',
    badge: 'OFF',
    era: 'Native Pixel Art',
    description: 'Crisp, modern 16-bit vector aesthetic without post-processing filters.',
    achievementCondition: 'Unlocked by default',
  },
  {
    id: 'crt_arcade',
    name: 'CRT Arcade Monitor',
    badge: 'ARCADE',
    era: '1990s Coin-Op',
    description: 'Sub-pixel horizontal scanlines, Trinitron convex glass vignette, and subtle 60Hz phosphor glow.',
    achievementCondition: 'Unlocked by default',
  },
  {
    id: 'vhs_1994',
    name: '1994 World Cup VHS',
    badge: 'VHS TAPE',
    era: '1994 USA Broadcast',
    description: 'Analog magnetic tape flutter, slight chroma bleed, and bottom-edge tracking noise bar.',
    achievementCondition: 'Score 1 goal from open play',
  },
  {
    id: 'neo_geo_16bit',
    name: '16-Bit Neo-Geo / Mega Drive',
    badge: '16-BIT',
    era: '1992 Neo-Geo AES',
    description: 'Punchy arcade saturation, high contrast, and classic micro-dithered palette feel.',
    achievementCondition: 'Unlocked by default',
  },
  {
    id: 'vintage_1954',
    name: '1954 Vintage B&W Newsprint',
    badge: '1954 B&W',
    era: '1954 World Cup / Pelé Era',
    description: 'Historic monochromatic grain, authentic sepia tint, newsprint halftone dot pattern & dark vignette.',
    achievementCondition: 'Keep a clean sheet for 1 half',
  },
  {
    id: 'manga_tsubasa',
    name: 'Manga / Anime Cel-Shaded',
    badge: 'TSUBASA',
    era: 'Captain Tsubasa Mode',
    description: 'High-contrast ink outlines, hyper-saturated colors, and dramatic speed lines on screen perimeter.',
    achievementCondition: 'Perform any skill move or volley',
  },
  {
    id: 'cyberpunk_neon',
    name: 'Cyberpunk Neon Pitch',
    badge: 'NIGHT ELECTRIC',
    era: 'Neo-Tokyo 2099',
    description: 'Pitch markings radiate electric cyan, obsidian pitch turf, and luminescent player glow.',
    achievementCondition: 'Sprint with ball for 10 seconds',
  },
  {
    id: 'cinematic_35mm',
    name: 'Cinematic 35mm Technicolor',
    badge: '35MM WIDESCREEN',
    era: '1970s Theatrical Film',
    description: 'Warm golden grass grading, subtle film grain jitter, and dramatic 2.39:1 widescreen letterbox bars.',
    achievementCondition: 'Score a chipped or curved goal',
  },
];

export const GRAPHICS_PRESETS: Record<GraphicsTier, Omit<GraphicsSettings, 'activeFilter' | 'unlockedFilters'>> = {
  performance: {
    tier: 'performance',
    quadShadows: false,
    ambientOcclusion: false,
    pitchScuffs: false,
    highDpi: false,
    volumetricLighting: false,
    crowdFlashbulbs: false,
    netSpringPhysics: false,
    powerVaporTrails: false,
    waterSprayParticles: false,
  },
  balanced: {
    tier: 'balanced',
    quadShadows: false,
    ambientOcclusion: false,
    pitchScuffs: false,
    highDpi: false,
    volumetricLighting: false,
    crowdFlashbulbs: true,
    netSpringPhysics: true,
    powerVaporTrails: false,
    waterSprayParticles: false,
  },
  high_end: {
    tier: 'high_end',
    quadShadows: true,
    ambientOcclusion: true,
    pitchScuffs: true,
    highDpi: true,
    volumetricLighting: true,
    crowdFlashbulbs: true,
    netSpringPhysics: true,
    powerVaporTrails: true,
    waterSprayParticles: true,
  },
};

const ALL_FILTER_IDS: RetroFilterType[] = ALL_RETRO_FILTERS.map((f) => f.id);

const DEFAULT_GRAPHICS_SETTINGS: GraphicsSettings = {
  tier: 'balanced',
  quadShadows: false,
  ambientOcclusion: false,
  pitchScuffs: false,
  highDpi: false,
  volumetricLighting: false,
  crowdFlashbulbs: true,
  netSpringPhysics: true,
  powerVaporTrails: false,
  waterSprayParticles: false,
  activeFilter: 'none',
  unlockedFilters: ALL_FILTER_IDS,
};

const STORAGE_KEY = 'swos_graphics_settings';

export function loadGraphicsSettings(): GraphicsSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // For now, leave all filters available as requested
      return {
        ...DEFAULT_GRAPHICS_SETTINGS,
        ...parsed,
        unlockedFilters: ALL_FILTER_IDS,
      };
    }
  } catch (err) {
    console.warn('Failed to load graphics settings from localStorage:', err);
  }
  return { ...DEFAULT_GRAPHICS_SETTINGS };
}

export function saveGraphicsSettings(settings: GraphicsSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn('Failed to save graphics settings to localStorage:', err);
  }
}

export function applyPresetTier(current: GraphicsSettings, tier: GraphicsTier): GraphicsSettings {
  const preset = GRAPHICS_PRESETS[tier];
  return {
    ...current,
    ...preset,
    tier,
  };
}

export function unlockAllRetroFilters(current: GraphicsSettings): GraphicsSettings {
  const allIds = ALL_RETRO_FILTERS.map((f) => f.id);
  const updated = {
    ...current,
    unlockedFilters: allIds,
  };
  saveGraphicsSettings(updated);
  return updated;
}
