/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TeamKit } from '../types';
import { TeamDefinition } from './team';

/**
 * Phase 14: PES6-Style Modular Uniform Matrix (Kit Mixer)
 */

export type KitPresetType = '1st' | '2nd' | '3rd' | 'custom';
export type KitSlot = 0 | 1 | 2; // 0 = 1st/Home, 1 = 2nd/Away, 2 = 3rd/Alternative

export interface ModularKitSelection {
  preset: KitPresetType;
  shirtSlot: KitSlot;
  shortsSlot: KitSlot;
  socksSlot: KitSlot;
}

export interface KitClashAnalysis {
  hasShirtClash: boolean;
  hasShortsClash: boolean;
  isHighClashRisk: boolean;
  warningMessage?: string;
}

/**
 * Returns available kits for a team in a guaranteed 3-element array:
 * [1st (Home), 2nd (Away), 3rd (Alternative)]
 */
export function getTeamKitOptions(team: TeamDefinition): [TeamKit, TeamKit, TeamKit] {
  const first = team.kit;
  const second = team.awayKit || {
    name: `${team.shortName} Away`,
    shortName: team.shortName,
    primaryColor: '#ffffff',
    secondaryColor: team.kit.primaryColor,
    shortsColor: '#ffffff',
    socksColor: '#ffffff',
    gkColor: '#ef4444',
  };
  const third = team.thirdKit || {
    name: `${team.shortName} Alternative`,
    shortName: team.shortName,
    primaryColor: '#1e293b',
    secondaryColor: '#f59e0b',
    shortsColor: '#1e293b',
    socksColor: '#f59e0b',
    gkColor: '#10b981',
  };

  return [first, second, third];
}

/**
 * Combines selected modular slots into a unified, playable TeamKit
 */
export function resolveModularKit(
  team: TeamDefinition,
  selection: ModularKitSelection
): TeamKit {
  const kits = getTeamKitOptions(team);
  const shirtKit = kits[selection.shirtSlot] || kits[0];
  const shortsKit = kits[selection.shortsSlot] || kits[0];
  const socksKit = kits[selection.socksSlot] || kits[0];

  const presetName =
    selection.preset === '1st'
      ? `${shirtKit.name} (1st)`
      : selection.preset === '2nd'
      ? `${shirtKit.name} (2nd)`
      : selection.preset === '3rd'
      ? `${shirtKit.name} (3rd)`
      : `${team.shortName} Mixed Hybrid`;

  return {
    name: presetName,
    shortName: team.shortName,
    primaryColor: shirtKit.primaryColor,
    secondaryColor: shirtKit.secondaryColor,
    shortsColor: shortsKit.shortsColor,
    socksColor: socksKit.socksColor,
    gkColor: shirtKit.gkColor || '#ef4444',
  };
}

/**
 * Color luminance distance to detect kit clashes
 */
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16),
      parseInt(clean[1] + clean[1], 16),
      parseInt(clean[2] + clean[2], 16),
    ];
  }
  return [
    parseInt(clean.slice(0, 2), 16) || 0,
    parseInt(clean.slice(2, 4), 16) || 0,
    parseInt(clean.slice(4, 6), 16) || 0,
  ];
}

function colorDistance(hexA: string, hexB: string): number {
  const [r1, g1, b1] = hexToRgb(hexA);
  const [r2, g2, b2] = hexToRgb(hexB);
  return Math.sqrt(
    Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2)
  );
}

/**
 * Analyzes two team uniforms for visual clashes (shirts and shorts)
 */
export function detectKitClash(homeKit: TeamKit, awayKit: TeamKit): KitClashAnalysis {
  const shirtDist = colorDistance(homeKit.primaryColor, awayKit.primaryColor);
  const shortsDist = colorDistance(homeKit.shortsColor, awayKit.shortsColor);

  const hasShirtClash = shirtDist < 75; // Close chromatic threshold
  const hasShortsClash = shortsDist < 60;
  const isHighClashRisk = hasShirtClash || (shirtDist < 100 && hasShortsClash);

  let warningMessage: string | undefined;
  if (hasShirtClash && hasShortsClash) {
    warningMessage = 'CRITICAL KIT CLASH: Both teams have matching jerseys and shorts! Switch 2nd or 3rd kit.';
  } else if (hasShirtClash) {
    warningMessage = 'JERSEY CLASH: Teams have similar shirt colors. Swap away jersey to 2nd or 3rd.';
  } else if (hasShortsClash) {
    warningMessage = 'SHORTS CLASH: Both teams wear matching shorts. Swap shorts in Kit Mixer.';
  }

  return {
    hasShirtClash,
    hasShortsClash,
    isHighClashRisk,
    warningMessage,
  };
}

/**
 * Default initial selection for a team side
 */
export function getDefaultKitSelection(side: 'home' | 'away'): ModularKitSelection {
  if (side === 'home') {
    return {
      preset: '1st',
      shirtSlot: 0,
      shortsSlot: 0,
      socksSlot: 0,
    };
  }
  return {
    preset: '2nd',
    shirtSlot: 1,
    shortsSlot: 1,
    socksSlot: 1,
  };
}
