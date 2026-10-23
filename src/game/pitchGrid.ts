/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  PrimaryPosition,
  SubPosition,
  PlayerRole,
  PlayerPlaystyle,
} from '../types';

/**
 * =========================================================================
 * PHASE 16.5: DYNAMIC DROP-ZONE POSITIONAL GRID & OVERLAP DISAMBIGUATION
 *
 * 1. Three-Tier Mechanical Pitch Partitioning & Fixed Goalkeeper Sanctuary
 * 2. Strict Sub-Position Placement Boundaries & Geometry (15 Outfield Sub-Positions)
 * 3. Multi-Role Overlap Detection & Candidate Disambiguation
 * 4. Dynamic Playstyle Compatibility & 'Basic' Playstyle Reversion Rule
 * =========================================================================
 */

export interface PitchZoneBounds {
  name: string;
  primary: PrimaryPosition;
  minY: number;
  maxY: number;
}

export const MECHANICAL_PITCH_TIERS: Record<'ATT' | 'MID' | 'DEF', PitchZoneBounds> = {
  ATT: {
    name: 'Attacker Zone (ATT)',
    primary: 'ATT',
    minY: 0.06,
    maxY: 0.36,
  },
  MID: {
    name: 'Midfielder Zone (MID)',
    primary: 'MID',
    minY: 0.36,
    maxY: 0.68,
  },
  DEF: {
    name: 'Defender Zone (DEF)',
    primary: 'DEF',
    minY: 0.68,
    maxY: 0.94,
  },
};

/**
 * Fixed Goalkeeper Sanctuary Box (Section 16.5.1)
 * Exactly one Goalkeeper exists per team, fixed inside the 6-yard/penalty goalmouth box.
 * NON-DRAGGABLE MANDATE: Outfield players cannot be placed here.
 */
export const GK_SANCTUARY_BOX = {
  minX: 0.38,
  maxX: 0.62,
  minY: 0.88,
  maxY: 0.94,
};

export interface SubPositionZoneConfig {
  subPos: SubPosition;
  primary: PrimaryPosition;
  pesLabel: string;
  name: string;
  role: PlayerRole;
  icon: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  description: string;
}

/**
 * Precise lateral (x) and vertical (y) bounds for all 15 Outfield Sub-Positions
 * (Section 16.5.2)
 */
export const OUTFIELD_SUB_POSITION_ZONES: SubPositionZoneConfig[] = [
  // --- A. ATTACKER ZONE (4 Sub-Positions) ---
  {
    subPos: 'LW',
    primary: 'ATT',
    pesLabel: 'LWF',
    name: 'Left Winger',
    role: 'LM',
    icon: '⚡',
    minX: 0.08,
    maxX: 0.28,
    minY: 0.06,
    maxY: 0.36,
    description: 'Flank speedster delivering crosses & diagonal goal cuts',
  },
  {
    subPos: 'RW',
    primary: 'ATT',
    pesLabel: 'RWF',
    name: 'Right Winger',
    role: 'RM',
    icon: '⚡',
    minX: 0.72,
    maxX: 0.92,
    minY: 0.06,
    maxY: 0.36,
    description: 'Flank speedster delivering crosses & cutting into the box',
  },
  {
    subPos: 'ST',
    primary: 'ATT',
    pesLabel: 'CF',
    name: 'Center Forward',
    role: 'ST1',
    icon: '⚽',
    minX: 0.32,
    maxX: 0.68,
    minY: 0.06,
    maxY: 0.22,
    description: 'Primary penalty-box spearhead & clinical finisher',
  },
  {
    subPos: 'SS',
    primary: 'ATT',
    pesLabel: 'SS',
    name: 'Second Striker',
    role: 'ST2',
    icon: '🎯',
    minX: 0.26,
    maxX: 0.74,
    minY: 0.16,
    maxY: 0.36,
    description: 'Shadow forward roaming behind lines (inherits CAM styles)',
  },

  // --- B. MIDFIELDER ZONE (7 Sub-Positions) ---
  {
    subPos: 'LM',
    primary: 'MID',
    pesLabel: 'LMF',
    name: 'Left Midfielder',
    role: 'LM',
    icon: '🏃',
    minX: 0.08,
    maxX: 0.25,
    minY: 0.36,
    maxY: 0.68,
    description: 'Wide midfield operator supporting transitions & wing width',
  },
  {
    subPos: 'RM',
    primary: 'MID',
    pesLabel: 'RMF',
    name: 'Right Midfielder',
    role: 'RM',
    icon: '🏃',
    minX: 0.75,
    maxX: 0.92,
    minY: 0.36,
    maxY: 0.68,
    description: 'Wide midfield operator supporting transitions & wing width',
  },
  {
    subPos: 'CAM',
    primary: 'MID',
    pesLabel: 'AMF',
    name: 'Attacking Midfielder',
    role: 'CM2',
    icon: '🎩',
    minX: 0.25,
    maxX: 0.75,
    minY: 0.36,
    maxY: 0.52,
    description: 'Central playmaker creating through-balls in the final third',
  },
  {
    subPos: 'CM',
    primary: 'MID',
    pesLabel: 'CMF',
    name: 'Central Midfielder',
    role: 'CM1',
    icon: '⚙️',
    minX: 0.24,
    maxX: 0.76,
    minY: 0.40,
    maxY: 0.64,
    description: 'Box-to-box engine distributing play & controlling tempo',
  },
  {
    subPos: 'CDM',
    primary: 'MID',
    pesLabel: 'DMF',
    name: 'Defensive Midfielder',
    role: 'CM1',
    icon: '🛡️',
    minX: 0.25,
    maxX: 0.75,
    minY: 0.52,
    maxY: 0.68,
    description: 'Deep defensive shield screening backline & recycling balls',
  },
  {
    subPos: 'LWB',
    primary: 'MID',
    pesLabel: 'LWB',
    name: 'Left Wing-Back',
    role: 'LB',
    icon: '⚡',
    minX: 0.08,
    maxX: 0.25,
    minY: 0.52,
    maxY: 0.68,
    description: 'Flank runner in lower midfield (employs fullback playstyles)',
  },
  {
    subPos: 'RWB',
    primary: 'MID',
    pesLabel: 'RWB',
    name: 'Right Wing-Back',
    role: 'RB',
    icon: '⚡',
    minX: 0.75,
    maxX: 0.92,
    minY: 0.52,
    maxY: 0.68,
    description: 'Flank runner in lower midfield (employs fullback playstyles)',
  },

  // --- C. DEFENDER ZONE (4 Sub-Positions) ---
  {
    subPos: 'LB',
    primary: 'DEF',
    pesLabel: 'LB',
    name: 'Left Back',
    role: 'LB',
    icon: '🛡️',
    minX: 0.08,
    maxX: 0.28,
    minY: 0.68,
    maxY: 0.92,
    description: 'Defensive flank stopper tracking opposition wingers',
  },
  {
    subPos: 'RB',
    primary: 'DEF',
    pesLabel: 'RB',
    name: 'Right Back',
    role: 'RB',
    icon: '🛡️',
    minX: 0.72,
    maxX: 0.92,
    minY: 0.68,
    maxY: 0.92,
    description: 'Defensive flank stopper tracking opposition wingers',
  },
  {
    subPos: 'CB',
    primary: 'DEF',
    pesLabel: 'CB',
    name: 'Center Back',
    role: 'CB1',
    icon: '🧱',
    minX: 0.24,
    maxX: 0.76,
    minY: 0.68,
    maxY: 0.90,
    description: 'Central defensive wall executing tackles & aerial clearances',
  },
  {
    subPos: 'LIB',
    primary: 'DEF',
    pesLabel: 'LIB',
    name: 'Libero / Sweeper',
    role: 'CB2',
    icon: '👑',
    minX: 0.36,
    maxX: 0.64,
    minY: 0.70,
    maxY: 0.90,
    description: 'Deep sweeping distributor (employs CDM & CB playstyles)',
  },
];

/**
 * Explicit multi-role overlap zones defined in Section 16.5.3
 */
export interface OverlapZoneConfig {
  id: string;
  title: string;
  roles: SubPosition[];
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export const OVERLAP_ZONES: OverlapZoneConfig[] = [
  {
    id: 'attack_pocket',
    title: 'Attack Pocket (ST vs. SS)',
    roles: ['ST', 'SS'],
    minX: 0.32,
    maxX: 0.68,
    minY: 0.16,
    maxY: 0.22,
  },
  {
    id: 'upper_midfield',
    title: 'Upper Central Midfield (CM vs. CAM)',
    roles: ['CAM', 'CM'],
    minX: 0.25,
    maxX: 0.75,
    minY: 0.40,
    maxY: 0.52,
  },
  {
    id: 'lower_midfield',
    title: 'Lower Central Midfield (CM vs. CDM)',
    roles: ['CM', 'CDM'],
    minX: 0.25,
    maxX: 0.75,
    minY: 0.52,
    maxY: 0.64,
  },
  {
    id: 'lower_flank_left',
    title: 'Left Flank Corridor (LM vs. LWB)',
    roles: ['LM', 'LWB'],
    minX: 0.08,
    maxX: 0.25,
    minY: 0.52,
    maxY: 0.68,
  },
  {
    id: 'lower_flank_right',
    title: 'Right Flank Corridor (RM vs. RWB)',
    roles: ['RM', 'RWB'],
    minX: 0.75,
    maxX: 0.92,
    minY: 0.52,
    maxY: 0.68,
  },
  {
    id: 'central_defense',
    title: 'Central Defensive Spine (CB vs. LIB)',
    roles: ['CB', 'LIB'],
    minX: 0.36,
    maxX: 0.64,
    minY: 0.70,
    maxY: 0.90,
  },
];

/**
 * Clamps coordinates to legal outfield bounds and prevents entering the Goalkeeper sanctuary
 */
export function clampOutfieldCoordinates(rawX: number, rawY: number): { x: number; y: number } {
  let x = Math.max(0.08, Math.min(0.92, rawX));
  let y = Math.max(0.06, Math.min(0.94, rawY));

  // Check Goalkeeper Sanctuary Box ($x \in [0.38, 0.62], y \in [0.88, 0.94]$)
  if (
    x >= GK_SANCTUARY_BOX.minX &&
    x <= GK_SANCTUARY_BOX.maxX &&
    y >= GK_SANCTUARY_BOX.minY &&
    y <= GK_SANCTUARY_BOX.maxY
  ) {
    // Push outfield player just above the GK sanctuary into defender line
    y = GK_SANCTUARY_BOX.minY - 0.02;
  }

  return { x, y };
}

/**
 * Evaluates a release point on the pitch board to identify all matching Sub-Positions.
 * Returns candidate list and whether an overlap popover should be shown.
 */
export function evaluatePitchDrop(
  x: number,
  y: number,
  currentSubPos?: SubPosition
): {
  candidates: SubPositionZoneConfig[];
  isOverlap: boolean;
  primaryMatch: SubPositionZoneConfig;
} {
  const clamped = clampOutfieldCoordinates(x, y);
  const cx = clamped.x;
  const cy = clamped.y;

  // 1. Check explicit overlap zones first
  for (const oz of OVERLAP_ZONES) {
    if (cx >= oz.minX && cx <= oz.maxX && cy >= oz.minY && cy <= oz.maxY) {
      const matched = oz.roles
        .map((r) => OUTFIELD_SUB_POSITION_ZONES.find((z) => z.subPos === r))
        .filter((z): z is SubPositionZoneConfig => !!z);

      if (matched.length > 1) {
        // Find best primary candidate (prefer currentSubPos if among them)
        const currentMatch = matched.find((m) => m.subPos === currentSubPos);
        return {
          candidates: matched,
          isOverlap: true,
          primaryMatch: currentMatch || matched[0],
        };
      }
    }
  }

  // 2. Check all sub-position spatial bounds
  const directMatches = OUTFIELD_SUB_POSITION_ZONES.filter(
    (zone) => cx >= zone.minX && cx <= zone.maxX && cy >= zone.minY && cy <= zone.maxY
  );

  if (directMatches.length > 1) {
    const currentMatch = directMatches.find((m) => m.subPos === currentSubPos);
    return {
      candidates: directMatches,
      isOverlap: true,
      primaryMatch: currentMatch || directMatches[0],
    };
  }

  if (directMatches.length === 1) {
    return {
      candidates: directMatches,
      isOverlap: false,
      primaryMatch: directMatches[0],
    };
  }

  // 3. Fallback: coordinate is slightly outside all sub-zones; find nearest sub-position
  let bestDist = Infinity;
  let nearest = OUTFIELD_SUB_POSITION_ZONES[0];

  for (const zone of OUTFIELD_SUB_POSITION_ZONES) {
    // Distance from point to box
    const dx = Math.max(0, Math.max(zone.minX - cx, cx - zone.maxX));
    const dy = Math.max(0, Math.max(zone.minY - cy, cy - zone.maxY));
    const distSq = dx * dx + dy * dy;
    if (distSq < bestDist) {
      bestDist = distSq;
      nearest = zone;
    }
  }

  return {
    candidates: [nearest],
    isOverlap: false,
    primaryMatch: nearest,
  };
}

/**
 * Derives the representative PlayerRole and tactical label for a SubPosition
 */
export function getRoleAndLabelForSubPosition(
  subPos: SubPosition,
  x: number = 0.5
): { role: PlayerRole; pesLabel: string } {
  if (subPos === 'GK') return { role: 'GK', pesLabel: 'GK' };

  const zone = OUTFIELD_SUB_POSITION_ZONES.find((z) => z.subPos === subPos);
  if (!zone) return { role: 'CM1', pesLabel: 'CMF' };

  // For central roles, disambiguate left vs. right
  let role = zone.role;
  if (subPos === 'CB') {
    role = x < 0.5 ? 'CB1' : 'CB2';
  } else if (subPos === 'CM') {
    role = x < 0.5 ? 'CM1' : 'CM2';
  }

  return { role, pesLabel: zone.pesLabel };
}

/**
 * =========================================================================
 * PHASE 16.5.4: PLAYSTYLE COMPATIBILITY & 'BASIC' REVERSION RULE
 * =========================================================================
 */

/**
 * Allowed playstyles per Sub-Position including Cross-Zone inheritances (Section 16.5.4)
 */
export const SUB_POSITION_ALLOWED_PLAYSTYLES: Record<SubPosition, PlayerPlaystyle[]> = {
  // ATTACKERS
  ST: ['poacher', 'target', 'complete', 'finisher', 'decoy'],
  LW: ['traditional', 'inverted', 'prolific', 'pressing'],
  RW: ['traditional', 'inverted', 'prolific', 'pressing'],
  // SS inherits CAM playstyles ('creator', 'shadow', 'classic_n10', 'engine') + Striker finishers
  SS: ['creator', 'shadow', 'classic_n10', 'engine', 'finisher', 'complete', 'poacher', 'target', 'decoy'],

  // MIDFIELDERS
  CAM: ['creator', 'shadow', 'classic_n10', 'engine'],
  CM: ['box_to_box', 'maestro', 'runner'],
  CDM: ['enforcer', 'anchor', 'regista'],
  // LM / RM inherit Winger playstyles
  LM: ['traditional', 'inverted', 'prolific', 'pressing', 'box_to_box', 'maestro', 'runner'],
  RM: ['traditional', 'inverted', 'prolific', 'pressing', 'box_to_box', 'maestro', 'runner'],
  // LWB / RWB inherit Fullback playstyles
  LWB: ['attacker_fb', 'inverted_fb', 'balanced_fb', 'defensive'],
  RWB: ['attacker_fb', 'inverted_fb', 'balanced_fb', 'defensive'],

  // DEFENDERS
  LB: ['defensive', 'inverted_fb', 'attacker_fb', 'balanced_fb'],
  RB: ['defensive', 'inverted_fb', 'attacker_fb', 'balanced_fb'],
  CB: ['destroyer', 'distributor', 'playmaker', 'stopper'],
  // LIB inherits CDM playstyles ('enforcer', 'anchor', 'regista') + CB styles
  LIB: ['enforcer', 'anchor', 'regista', 'destroyer', 'distributor', 'playmaker', 'stopper', 'sweeper_cb'],

  // GOALKEEPER
  GK: ['balanced_gk', 'sweeper', 'wall'],
};

/**
 * Checks whether a playstyle is compatible with a given SubPosition
 */
export function isPlaystyleCompatibleWithSubPosition(
  playstyle: PlayerPlaystyle,
  subPos: SubPosition
): boolean {
  if (playstyle === 'basic') return true;
  const allowed = SUB_POSITION_ALLOWED_PLAYSTYLES[subPos];
  return !!allowed && allowed.includes(playstyle);
}

/**
 * Resolves the effective playstyle when placing a player in subPos (Section 16.5.4):
 * - If intrinsic playstyle is compatible with subPos -> remains active!
 * - If NOT compatible -> dynamically reverts to 'basic' (0 modifiers, baseline attributes).
 * - Restores intrinsic playstyle immediately when placed back into a compatible role.
 */
export function resolveEffectivePlaystyle(
  intrinsicPlaystyle: PlayerPlaystyle | undefined,
  subPos: SubPosition
): PlayerPlaystyle {
  if (!intrinsicPlaystyle || intrinsicPlaystyle === 'basic') {
    // If no intrinsic playstyle was known, pick canonical default for subPos
    const allowed = SUB_POSITION_ALLOWED_PLAYSTYLES[subPos];
    return allowed && allowed.length > 0 ? allowed[0] : 'basic';
  }

  if (isPlaystyleCompatibleWithSubPosition(intrinsicPlaystyle, subPos)) {
    return intrinsicPlaystyle;
  }

  // Incompatible placement -> dynamically reverts to 'basic'
  return 'basic';
}
