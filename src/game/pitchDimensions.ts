/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PitchDimensionPreset, PitchDimensionConfig } from '../types';

/**
 * Standard IFAB Law 1 Pitch Dimension Presets
 */
export const PITCH_DIMENSION_PRESETS: Record<
  Exclude<PitchDimensionPreset, 'custom'>,
  {
    name: string;
    lengthMeters: number;
    widthMeters: number;
    description: string;
    tacticalSummary: string;
    staminaDrainMultiplier: number;
    spaceHalfSpaceMultiplier: number;
    pressingTrapMultiplier: number;
  }
> = {
  compact: {
    name: 'Compact / Direct Ground (100m × 64m)',
    lengthMeters: 100,
    widthMeters: 64,
    description: 'IFAB Legal Minimum ground. Compresses midfield channels and passing avenues.',
    tacticalSummary: 'Favors low blocks, aggressive gegenpressing, and direct aerial long balls.',
    staminaDrainMultiplier: 0.90,
    spaceHalfSpaceMultiplier: 0.82,
    pressingTrapMultiplier: 1.25,
  },
  balanced: {
    name: 'FIFA / UEFA Benchmark (105m × 68m)',
    lengthMeters: 105,
    widthMeters: 68,
    description: 'Standard international tournament & UEFA Champions League specification.',
    tacticalSummary: 'Symmetrical spacing for both wide wingers and central possession triangles.',
    staminaDrainMultiplier: 1.0,
    spaceHalfSpaceMultiplier: 1.0,
    pressingTrapMultiplier: 1.0,
  },
  expansive: {
    name: 'Expansive Cathedral (110m × 74m)',
    lengthMeters: 110,
    widthMeters: 74,
    description: 'IFAB Legal Maximum ground (e.g., Camp Nou). Hugely stretched half-spaces.',
    tacticalSummary: 'Favors tiki-taka possession, switches to wingers, and stretching low defensive blocks.',
    staminaDrainMultiplier: 1.15,
    spaceHalfSpaceMultiplier: 1.22,
    pressingTrapMultiplier: 0.82,
  },
};

/**
 * Converts real-world pitch dimensions (meters) into pixel coordinates
 * Baseline benchmark: 68m × 105m maps to 1500px × 2500px
 */
export interface ResolvedPitchMetrics {
  preset: PitchDimensionPreset;
  lengthMeters: number;
  widthMeters: number;
  fieldWidth: number;
  fieldHeight: number;
  marginX: number;
  marginTop: number;
  marginBottom: number;
  totalWidth: number;
  totalHeight: number;
  pitchLeft: number;
  pitchRight: number;
  pitchTop: number;
  pitchBottom: number;
  centerX: number;
  centerY: number;
  // Markings
  penaltyBoxWidth: number;
  penaltyBoxHeight: number;
  sixYardBoxWidth: number;
  sixYardBoxHeight: number;
  centerCircleRadius: number;
  penaltySpotDist: number;
  cornerArcRadius: number;
  // Tactical Modifiers
  staminaMultiplier: number;
  spaceMultiplier: number;
}

export function resolvePitchMetrics(
  config?: Partial<PitchDimensionConfig>
): ResolvedPitchMetrics {
  const preset = config?.preset || 'balanced';
  let lengthMeters = 105;
  let widthMeters = 68;

  if (preset === 'custom') {
    lengthMeters = Math.max(90, Math.min(120, config?.lengthMeters ?? 105));
    widthMeters = Math.max(45, Math.min(90, config?.widthMeters ?? 68));
  } else if (PITCH_DIMENSION_PRESETS[preset]) {
    lengthMeters = PITCH_DIMENSION_PRESETS[preset].lengthMeters;
    widthMeters = PITCH_DIMENSION_PRESETS[preset].widthMeters;
  }

  // Pixels per meter based on standard 1500px / 68m (~22.06 px/m) and 2500px / 105m (~23.81 px/m)
  const pxPerMeterX = 1500 / 68;
  const pxPerMeterY = 2500 / 105;

  const fieldWidth = Math.round(widthMeters * pxPerMeterX);
  const fieldHeight = Math.round(lengthMeters * pxPerMeterY);

  const marginX = 180;
  const marginTop = 220;
  const marginBottom = 200;

  const totalWidth = fieldWidth + marginX * 2;
  const totalHeight = fieldHeight + marginTop + marginBottom;

  const pitchLeft = marginX;
  const pitchRight = marginX + fieldWidth;
  const pitchTop = marginTop;
  const pitchBottom = marginTop + fieldHeight;
  const centerX = marginX + fieldWidth / 2;
  const centerY = marginTop + fieldHeight / 2;

  // Markings scale according to IFAB standards
  const penaltyBoxWidth = Math.round(40.32 * pxPerMeterX); // 40.32m
  const penaltyBoxHeight = Math.round(16.5 * pxPerMeterY); // 16.5m
  const sixYardBoxWidth = Math.round(18.32 * pxPerMeterX);  // 18.32m
  const sixYardBoxHeight = Math.round(5.5 * pxPerMeterY);   // 5.5m
  const centerCircleRadius = Math.round(9.15 * pxPerMeterX); // 9.15m (10 yards)
  const penaltySpotDist = Math.round(11.0 * pxPerMeterY);   // 11.0m (12 yards)
  const cornerArcRadius = Math.round(1.0 * pxPerMeterX);    // 1m

  // Compute tactical modifiers
  const areaRatio = (widthMeters * lengthMeters) / (68 * 105);
  const staminaMultiplier = Math.max(0.85, Math.min(1.25, Math.sqrt(areaRatio)));
  const spaceMultiplier = Math.max(0.80, Math.min(1.25, widthMeters / 68));

  return {
    preset,
    lengthMeters,
    widthMeters,
    fieldWidth,
    fieldHeight,
    marginX,
    marginTop,
    marginBottom,
    totalWidth,
    totalHeight,
    pitchLeft,
    pitchRight,
    pitchTop,
    pitchBottom,
    centerX,
    centerY,
    penaltyBoxWidth,
    penaltyBoxHeight,
    sixYardBoxWidth,
    sixYardBoxHeight,
    centerCircleRadius,
    penaltySpotDist,
    cornerArcRadius: Math.max(26, cornerArcRadius),
    staminaMultiplier,
    spaceMultiplier,
  };
}
