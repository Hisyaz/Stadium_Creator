/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Phase 12: Parametric Player Appearance Framework (Integration Contract)
 *
 * Lightweight, zero-GC data contract for player physical dimensions,
 * facial features, hairstyles, uniform styling, and body art hooks.
 * Stored per-player in under 120 bytes (under 3 KB total across all 22 players).
 */

export type MelaninSkinTone =
  | '#ffdbac' // Tone 1: Light Nordic / Celtic
  | '#f1c27d' // Tone 2: Fair European / Mediterranean
  | '#e0ac69' // Tone 3: Olive / Southern European / East Asian
  | '#c68642' // Tone 4: Bronzed / Latin / Middle Eastern
  | '#8d5524' // Tone 5: Deep Bronze / South Asian / Afro-Latino
  | '#3b2219' // Tone 6: Rich Melanin / African
  | string;

export type HairPresetId =
  | 'buzzcut'
  | 'high-fade'
  | 'afro'
  | 'braids'
  | 'topknot'
  | 'wavy'
  | 'part'
  | 'bald'
  // Legacy preset support
  | 'curly_blond'
  | 'afro_black'
  | 'ponytail_dark'
  | 'dreads'
  | 'crop_brown'
  | 'blond_sweep'
  | 'ginger_curly'
  | 'spiky_black'
  | string;

export type FacialHairPreset = 'clean' | 'stubble' | 'beard' | 'goatee';

export type JerseyFitPreset = 'tucked' | 'untucked';

export type CollarStylePreset = 'crew' | 'v-neck' | 'polo';

export type SleeveLengthPreset = 'short' | 'long' | 'undershirt';

export type SockHeightPreset = 'low' | 'standard' | 'high-knee';

export type EarringStylePreset = 'none' | 'left-stud' | 'right-stud' | 'dual-stud' | 'small-hoop';

export type TattooPreset = 'none' | 'forearm-ink' | 'full-sleeve';

export interface PlayerTattoos {
  leftArm: TattooPreset;
  rightArm: TattooPreset;
}

/**
 * Authoritative PlayerAppearance Integration Schema
 */
export interface PlayerAppearance {
  // Physical Dimensions (scales coordinate transforms)
  heightCm: number;          // 165 - 202 (scales vertical player height multiplier 0.88 - 1.15)
  weightKg: number;          // 60 - 95 (scales torso radius & shadow spread)
  muscleMass: number;        // 1 - 5 (controls limb thickness, shoulder width)
  skinTone: MelaninSkinTone; // Hex melanin tone

  // Head & Hair Preset IDs
  hairStyle: HairPresetId;
  hairColor: string;         // Hex hair tint
  facialHair?: FacialHairPreset;

  // Uniform & Kit Styling Hooks
  jerseyFit?: JerseyFitPreset;
  collarStyle?: CollarStylePreset;
  sleeveLength?: SleeveLengthPreset;
  sockHeight?: SockHeightPreset;

  // Accessories & Body Art Hooks
  earrings?: EarringStylePreset;
  tattoos?: PlayerTattoos;

  // Backwards compatibility flag for legacy systems
  hasBeard?: boolean;
}
