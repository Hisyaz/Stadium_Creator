/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PlayerRole, FormationName, TacticalPlaystyle, TeamSide, Player, DetailedTactics, SubPosition } from '../types';
import { applyPositionalHierarchyToPlayer } from './playstyles';

export * from './pitchGrid';

export interface FormationSlot {
  role: PlayerRole;
  label: string;
  x: number; // 0 to 1 normalized pitch width
  y: number; // 0 to 1 normalized pitch height
  subPos?: SubPosition;
}

export interface FormationData {
  name: FormationName;
  displayName: string;
  description: string;
  slots: Record<PlayerRole, { x: number; y: number; label: string }>;
}

export interface PlaystyleDefinition {
  id: TacticalPlaystyle;
  name: string;
  subtitle: string;
  description: string;
  accentColor: string;
  tactics: {
    pressIntensity: number; // 0.0 to 1.0
    defensiveLineDepth: number; // 0 (low block) to 1 (high line)
    horizontalCompactness: number; // 0 (wide) to 1 (ultra condensed)
    directness: number; // 0 (tiki taka) to 1 (long ball)
    tempo: number; // 0 (methodical) to 1 (rapid counters)
    foulingTendency: number; // 0 (clean) to 1 (tactical fouls)
  };
}

/**
 * Normalized base positions for HOME team (attacks UP towards y=0, GK at bottom y=0.96)
 */
export const HOME_FORMATIONS: Record<FormationName, Record<PlayerRole, { x: number; y: number; label: string }>> = {
  '4-4-2': {
    GK: { x: 0.50, y: 0.96, label: 'GK' },
    LB: { x: 0.16, y: 0.82, label: 'LB' },
    CB1: { x: 0.38, y: 0.84, label: 'CB' },
    CB2: { x: 0.62, y: 0.84, label: 'CB' },
    RB: { x: 0.84, y: 0.82, label: 'RB' },
    LM: { x: 0.15, y: 0.62, label: 'LM' },
    CM1: { x: 0.38, y: 0.64, label: 'CM' },
    CM2: { x: 0.62, y: 0.64, label: 'CM' },
    RM: { x: 0.85, y: 0.62, label: 'RM' },
    ST1: { x: 0.38, y: 0.50, label: 'ST' },
    ST2: { x: 0.62, y: 0.50, label: 'ST' },
  },
  '4-3-3': {
    GK: { x: 0.50, y: 0.96, label: 'GK' },
    LB: { x: 0.16, y: 0.82, label: 'LB' },
    CB1: { x: 0.38, y: 0.84, label: 'CB' },
    CB2: { x: 0.62, y: 0.84, label: 'CB' },
    RB: { x: 0.84, y: 0.82, label: 'RB' },
    CM1: { x: 0.50, y: 0.70, label: 'CDM' },
    CM2: { x: 0.34, y: 0.60, label: 'LCM' },
    RM: { x: 0.66, y: 0.60, label: 'RCM' },
    LM: { x: 0.16, y: 0.48, label: 'LW' },
    ST1: { x: 0.50, y: 0.46, label: 'ST' },
    ST2: { x: 0.84, y: 0.48, label: 'RW' },
  },
  '4-2-3-1': {
    GK: { x: 0.50, y: 0.96, label: 'GK' },
    LB: { x: 0.16, y: 0.82, label: 'LB' },
    CB1: { x: 0.38, y: 0.84, label: 'CB' },
    CB2: { x: 0.62, y: 0.84, label: 'CB' },
    RB: { x: 0.84, y: 0.82, label: 'RB' },
    CM1: { x: 0.38, y: 0.71, label: 'CDM' },
    CM2: { x: 0.62, y: 0.71, label: 'CDM' },
    LM: { x: 0.18, y: 0.55, label: 'LAM' },
    RM: { x: 0.82, y: 0.55, label: 'RAM' },
    ST2: { x: 0.50, y: 0.56, label: 'CAM' },
    ST1: { x: 0.50, y: 0.46, label: 'ST' },
  },
  '4-5-1': {
    GK: { x: 0.50, y: 0.96, label: 'GK' },
    LB: { x: 0.16, y: 0.82, label: 'LB' },
    CB1: { x: 0.38, y: 0.84, label: 'CB' },
    CB2: { x: 0.62, y: 0.84, label: 'CB' },
    RB: { x: 0.84, y: 0.82, label: 'RB' },
    LM: { x: 0.14, y: 0.62, label: 'LM' },
    CM1: { x: 0.32, y: 0.64, label: 'CM' },
    CM2: { x: 0.50, y: 0.68, label: 'CDM' },
    RM: { x: 0.68, y: 0.64, label: 'CM' },
    ST2: { x: 0.86, y: 0.62, label: 'RM' },
    ST1: { x: 0.50, y: 0.48, label: 'ST' },
  },
  '3-5-2': {
    GK: { x: 0.50, y: 0.96, label: 'GK' },
    LB: { x: 0.26, y: 0.84, label: 'LCB' },
    CB1: { x: 0.50, y: 0.85, label: 'CB' },
    CB2: { x: 0.74, y: 0.84, label: 'RCB' },
    RB: { x: 0.12, y: 0.62, label: 'LWB' },
    LM: { x: 0.88, y: 0.62, label: 'RWB' },
    CM1: { x: 0.34, y: 0.66, label: 'CM' },
    CM2: { x: 0.50, y: 0.72, label: 'CDM' },
    RM: { x: 0.66, y: 0.66, label: 'CM' },
    ST1: { x: 0.38, y: 0.48, label: 'ST' },
    ST2: { x: 0.62, y: 0.48, label: 'ST' },
  },
  '3-4-3': {
    GK: { x: 0.50, y: 0.96, label: 'GK' },
    LB: { x: 0.25, y: 0.84, label: 'LCB' },
    CB1: { x: 0.50, y: 0.85, label: 'CB' },
    CB2: { x: 0.75, y: 0.84, label: 'RCB' },
    RB: { x: 0.15, y: 0.63, label: 'LM' },
    CM1: { x: 0.38, y: 0.65, label: 'CM' },
    CM2: { x: 0.62, y: 0.65, label: 'CM' },
    RM: { x: 0.85, y: 0.63, label: 'RM' },
    LM: { x: 0.18, y: 0.48, label: 'LW' },
    ST1: { x: 0.50, y: 0.46, label: 'ST' },
    ST2: { x: 0.82, y: 0.48, label: 'RW' },
  },
  '3-4-3-diamond': {
    // 1 CAM, 1 CDM, 2 Wing Midfielders, 3 CBs, 3 Attackers
    GK: { x: 0.50, y: 0.96, label: 'GK' },
    LB: { x: 0.25, y: 0.84, label: 'LCB' },
    CB1: { x: 0.50, y: 0.85, label: 'CB' },
    CB2: { x: 0.75, y: 0.84, label: 'RCB' },
    CM1: { x: 0.50, y: 0.72, label: 'CDM' },
    RB: { x: 0.14, y: 0.61, label: 'LM' },
    RM: { x: 0.86, y: 0.61, label: 'RM' },
    CM2: { x: 0.50, y: 0.56, label: 'CAM' },
    LM: { x: 0.18, y: 0.46, label: 'LW' },
    ST1: { x: 0.50, y: 0.44, label: 'ST' },
    ST2: { x: 0.82, y: 0.46, label: 'RW' },
  },
  '5-3-2': {
    GK: { x: 0.50, y: 0.96, label: 'GK' },
    LB: { x: 0.12, y: 0.80, label: 'LWB' },
    CB1: { x: 0.31, y: 0.85, label: 'LCB' },
    CB2: { x: 0.50, y: 0.86, label: 'CB' },
    RB: { x: 0.69, y: 0.85, label: 'RCB' },
    LM: { x: 0.88, y: 0.80, label: 'RWB' },
    CM1: { x: 0.32, y: 0.65, label: 'CM' },
    CM2: { x: 0.50, y: 0.68, label: 'CDM' },
    RM: { x: 0.68, y: 0.65, label: 'CM' },
    ST1: { x: 0.38, y: 0.49, label: 'ST' },
    ST2: { x: 0.62, y: 0.49, label: 'ST' },
  },
  '5-4-1': {
    GK: { x: 0.50, y: 0.96, label: 'GK' },
    LB: { x: 0.12, y: 0.80, label: 'LWB' },
    CB1: { x: 0.31, y: 0.85, label: 'LCB' },
    CB2: { x: 0.50, y: 0.86, label: 'CB' },
    RB: { x: 0.69, y: 0.85, label: 'RCB' },
    LM: { x: 0.88, y: 0.80, label: 'RWB' },
    CM1: { x: 0.38, y: 0.65, label: 'CM' },
    CM2: { x: 0.62, y: 0.65, label: 'CM' },
    RM: { x: 0.16, y: 0.58, label: 'LM' },
    ST2: { x: 0.84, y: 0.58, label: 'RM' },
    ST1: { x: 0.50, y: 0.47, label: 'ST' },
  },
  'custom': {
    GK: { x: 0.50, y: 0.96, label: 'GK' },
    LB: { x: 0.16, y: 0.82, label: 'LB' },
    CB1: { x: 0.38, y: 0.84, label: 'CB' },
    CB2: { x: 0.62, y: 0.84, label: 'CB' },
    RB: { x: 0.84, y: 0.82, label: 'RB' },
    CM1: { x: 0.50, y: 0.70, label: 'CDM' },
    CM2: { x: 0.34, y: 0.60, label: 'LCM' },
    RM: { x: 0.66, y: 0.60, label: 'RCM' },
    LM: { x: 0.16, y: 0.48, label: 'LW' },
    ST1: { x: 0.50, y: 0.46, label: 'ST' },
    ST2: { x: 0.84, y: 0.48, label: 'RW' },
  },
};

/**
 * =========================================================================
 * PHASE 15: TACTICAL BOARD FORMATIONS (FULL-PITCH VERTICAL PES MATRIX)
 * Unlike in-match kickoff bases (which restrict team to defensive half),
 * the PES Tactical Board positions the starting 11 across the ENTIRE pitch:
 * Goalkeeper at the bottom goalmouth (y ≈ 0.91), backline (y ≈ 0.76),
 * midfield (y ≈ 0.45 - 0.62), wingers (y ≈ 0.22), and strikers near the TOP (y ≈ 0.14)!
 * =========================================================================
 */
export const TACTICAL_BOARD_FORMATIONS: Record<FormationName, Record<PlayerRole, { x: number; y: number; label: string }>> = {
  '4-4-2': {
    GK: { x: 0.50, y: 0.93, label: 'GK' },
    LB: { x: 0.14, y: 0.78, label: 'LB' },
    CB1: { x: 0.38, y: 0.81, label: 'CB' },
    CB2: { x: 0.62, y: 0.81, label: 'CB' },
    RB: { x: 0.86, y: 0.78, label: 'RB' },
    LM: { x: 0.14, y: 0.44, label: 'LMF' },
    CM1: { x: 0.38, y: 0.48, label: 'CMF' },
    CM2: { x: 0.62, y: 0.48, label: 'CMF' },
    RM: { x: 0.86, y: 0.44, label: 'RMF' },
    ST1: { x: 0.35, y: 0.11, label: 'CF' },
    ST2: { x: 0.65, y: 0.11, label: 'CF' },
  },
  '4-3-3': {
    GK: { x: 0.50, y: 0.93, label: 'GK' },
    LB: { x: 0.14, y: 0.78, label: 'LB' },
    CB1: { x: 0.38, y: 0.81, label: 'CB' },
    CB2: { x: 0.62, y: 0.81, label: 'CB' },
    RB: { x: 0.86, y: 0.78, label: 'RB' },
    CM1: { x: 0.50, y: 0.64, label: 'DMF' },
    CM2: { x: 0.33, y: 0.46, label: 'CMF' },
    RM: { x: 0.67, y: 0.46, label: 'CMF' },
    LM: { x: 0.16, y: 0.18, label: 'LWF' },
    ST1: { x: 0.50, y: 0.10, label: 'CF' },
    ST2: { x: 0.84, y: 0.18, label: 'RWF' },
  },
  '4-2-3-1': {
    GK: { x: 0.50, y: 0.93, label: 'GK' },
    LB: { x: 0.14, y: 0.78, label: 'LB' },
    CB1: { x: 0.38, y: 0.81, label: 'CB' },
    CB2: { x: 0.62, y: 0.81, label: 'CB' },
    RB: { x: 0.86, y: 0.78, label: 'RB' },
    CM1: { x: 0.36, y: 0.64, label: 'DMF' },
    CM2: { x: 0.64, y: 0.64, label: 'DMF' },
    LM: { x: 0.16, y: 0.30, label: 'LMF' },
    ST2: { x: 0.50, y: 0.28, label: 'AMF' },
    RM: { x: 0.84, y: 0.30, label: 'RMF' },
    ST1: { x: 0.50, y: 0.10, label: 'CF' },
  },
  '4-5-1': {
    GK: { x: 0.50, y: 0.93, label: 'GK' },
    LB: { x: 0.14, y: 0.78, label: 'LB' },
    CB1: { x: 0.38, y: 0.81, label: 'CB' },
    CB2: { x: 0.62, y: 0.81, label: 'CB' },
    RB: { x: 0.86, y: 0.78, label: 'RB' },
    CM2: { x: 0.50, y: 0.64, label: 'DMF' },
    CM1: { x: 0.33, y: 0.48, label: 'CMF' },
    RM: { x: 0.67, y: 0.48, label: 'CMF' },
    LM: { x: 0.15, y: 0.28, label: 'LMF' },
    ST2: { x: 0.85, y: 0.28, label: 'RMF' },
    ST1: { x: 0.50, y: 0.10, label: 'CF' },
  },
  '3-5-2': {
    GK: { x: 0.50, y: 0.93, label: 'GK' },
    LB: { x: 0.24, y: 0.80, label: 'CB' },
    CB1: { x: 0.50, y: 0.82, label: 'CB' },
    CB2: { x: 0.76, y: 0.80, label: 'CB' },
    CM2: { x: 0.50, y: 0.64, label: 'DMF' },
    RB: { x: 0.12, y: 0.46, label: 'LWB' },
    LM: { x: 0.88, y: 0.46, label: 'RWB' },
    CM1: { x: 0.34, y: 0.44, label: 'CMF' },
    RM: { x: 0.66, y: 0.44, label: 'CMF' },
    ST1: { x: 0.36, y: 0.11, label: 'CF' },
    ST2: { x: 0.64, y: 0.11, label: 'CF' },
  },
  '3-4-3': {
    GK: { x: 0.50, y: 0.93, label: 'GK' },
    LB: { x: 0.24, y: 0.80, label: 'CB' },
    CB1: { x: 0.50, y: 0.82, label: 'CB' },
    CB2: { x: 0.76, y: 0.80, label: 'CB' },
    RB: { x: 0.14, y: 0.48, label: 'LMF' },
    CM1: { x: 0.38, y: 0.50, label: 'CMF' },
    CM2: { x: 0.62, y: 0.50, label: 'CMF' },
    RM: { x: 0.86, y: 0.48, label: 'RMF' },
    LM: { x: 0.16, y: 0.18, label: 'LWF' },
    ST1: { x: 0.50, y: 0.10, label: 'CF' },
    ST2: { x: 0.84, y: 0.18, label: 'RWF' },
  },
  '3-4-3-diamond': {
    GK: { x: 0.50, y: 0.93, label: 'GK' },
    LB: { x: 0.24, y: 0.80, label: 'CB' },
    CB1: { x: 0.50, y: 0.82, label: 'CB' },
    CB2: { x: 0.76, y: 0.80, label: 'CB' },
    CM1: { x: 0.50, y: 0.64, label: 'DMF' },
    RB: { x: 0.14, y: 0.46, label: 'LMF' },
    RM: { x: 0.86, y: 0.46, label: 'RMF' },
    CM2: { x: 0.50, y: 0.30, label: 'AMF' },
    LM: { x: 0.16, y: 0.17, label: 'LWF' },
    ST1: { x: 0.50, y: 0.09, label: 'CF' },
    ST2: { x: 0.84, y: 0.17, label: 'RWF' },
  },
  '5-3-2': {
    GK: { x: 0.50, y: 0.93, label: 'GK' },
    LB: { x: 0.12, y: 0.74, label: 'LWB' },
    CB1: { x: 0.31, y: 0.80, label: 'CB' },
    CB2: { x: 0.50, y: 0.82, label: 'CB' },
    RB: { x: 0.69, y: 0.80, label: 'CB' },
    LM: { x: 0.88, y: 0.74, label: 'RWB' },
    CM2: { x: 0.50, y: 0.58, label: 'DMF' },
    CM1: { x: 0.33, y: 0.42, label: 'CMF' },
    RM: { x: 0.67, y: 0.42, label: 'CMF' },
    ST1: { x: 0.36, y: 0.11, label: 'CF' },
    ST2: { x: 0.64, y: 0.11, label: 'CF' },
  },
  '5-4-1': {
    GK: { x: 0.50, y: 0.93, label: 'GK' },
    LB: { x: 0.12, y: 0.74, label: 'LWB' },
    CB1: { x: 0.31, y: 0.80, label: 'CB' },
    CB2: { x: 0.50, y: 0.82, label: 'CB' },
    RB: { x: 0.69, y: 0.80, label: 'CB' },
    LM: { x: 0.88, y: 0.74, label: 'RWB' },
    CM1: { x: 0.37, y: 0.52, label: 'CMF' },
    CM2: { x: 0.63, y: 0.52, label: 'CMF' },
    RM: { x: 0.16, y: 0.30, label: 'LMF' },
    ST2: { x: 0.84, y: 0.30, label: 'RMF' },
    ST1: { x: 0.50, y: 0.10, label: 'CF' },
  },
  'custom': {
    GK: { x: 0.50, y: 0.93, label: 'GK' },
    LB: { x: 0.14, y: 0.78, label: 'LB' },
    CB1: { x: 0.38, y: 0.81, label: 'CB' },
    CB2: { x: 0.62, y: 0.81, label: 'CB' },
    RB: { x: 0.86, y: 0.78, label: 'RB' },
    CM1: { x: 0.50, y: 0.64, label: 'DMF' },
    CM2: { x: 0.33, y: 0.46, label: 'CMF' },
    RM: { x: 0.67, y: 0.46, label: 'CMF' },
    LM: { x: 0.16, y: 0.18, label: 'LWF' },
    ST1: { x: 0.50, y: 0.10, label: 'CF' },
    ST2: { x: 0.84, y: 0.18, label: 'RWF' },
  },
};

/**
 * Normalized base positions for AWAY team (attacks DOWN towards y=1, GK at top y=0.04)
 * Inverted along Y axis (y -> 1 - y) and mirrored X to maintain wing consistency
 */
export function getAwayFormationPositions(name: FormationName): Record<PlayerRole, { x: number; y: number; label: string }> {
  const home = HOME_FORMATIONS[name] || HOME_FORMATIONS['4-3-3'];
  const away: Partial<Record<PlayerRole, { x: number; y: number; label: string }>> = {};
  for (const role of Object.keys(home) as PlayerRole[]) {
    const slot = home[role];
    away[role] = {
      x: slot.x,
      y: 1.0 - slot.y,
      label: slot.label,
    };
  }
  return away as Record<PlayerRole, { x: number; y: number; label: string }>;
}

export const FORMATION_LIST: { id: FormationName; name: string; tag: string }[] = [
  { id: '4-4-2', name: '4-4-2 Classic', tag: 'Balanced' },
  { id: '4-3-3', name: '4-3-3 Attack', tag: 'Wide Flanks' },
  { id: '4-2-3-1', name: '4-2-3-1 Modern', tag: 'Double Pivot' },
  { id: '4-5-1', name: '4-5-1 Solid', tag: 'Midfield Lock' },
  { id: '3-5-2', name: '3-5-2 Wingbacks', tag: 'Wide & Strikers' },
  { id: '3-4-3', name: '3-4-3 Frontline', tag: 'All-Out Offense' },
  { id: '3-4-3-diamond', name: '3-4-3 Diamond', tag: 'CAM & CDM Hub' },
  { id: '5-3-2', name: '5-3-2 Counter', tag: 'Steel Defense' },
  { id: '5-4-1', name: '5-4-1 Fort', tag: 'Ultra Low Block' },
  { id: 'custom', name: 'Custom Formation', tag: 'Freeform Board' },
];

/**
 * =========================================================================
 * PHASE 0.2: FORMATION INTEGRITY RULES & STRUCTURAL VALIDATION ENGINE
 * Rules:
 * - Goalkeepers: Exactly 1 GK (locked in sanctuary)
 * - Defenders: At least 2 Defenders (CB, LB, RB, LWB, RWB, LIB)
 * - Midfielders: At least 2 Midfielders (CDM, CM, CAM, LM, RM, DMF, CMF, etc.)
 * - Attackers: At least 1 Attacker (ST, SS, CF, LW, RW, LWF, RWF)
 * =========================================================================
 */
export interface FormationValidationResult {
  isValid: boolean;
  gkCount: number;
  defCount: number;
  midCount: number;
  attCount: number;
  message: string;
}

export function isDefenderRole(labelOrRole: string): boolean {
  const norm = (labelOrRole || '').toUpperCase();
  return (
    ['CB', 'CB1', 'CB2', 'LB', 'RB', 'LWB', 'RWB', 'LIB', 'LCB', 'RCB', 'SW'].includes(norm) ||
    norm.startsWith('CB') ||
    norm.startsWith('LB') ||
    norm.startsWith('RB')
  );
}

export function isMidfielderRole(labelOrRole: string): boolean {
  const norm = (labelOrRole || '').toUpperCase();
  return (
    ['CDM', 'CM', 'CM1', 'CM2', 'CAM', 'LM', 'RM', 'DMF', 'CMF', 'AMF', 'LMF', 'RMF', 'LAM', 'RAM', 'LCM', 'RCM'].includes(norm) ||
    norm.startsWith('CM') ||
    norm.startsWith('DM') ||
    norm.startsWith('AM')
  );
}

export function isAttackerRole(labelOrRole: string): boolean {
  const norm = (labelOrRole || '').toUpperCase();
  return (
    ['ST', 'ST1', 'ST2', 'SS', 'CF', 'LW', 'RW', 'LWF', 'RWF'].includes(norm) ||
    norm.startsWith('ST') ||
    norm.startsWith('CF')
  );
}

export function validateFormationStructure(
  lineup: { role?: string; subPosition?: string; label?: string }[]
): FormationValidationResult {
  let gkCount = 0;
  let defCount = 0;
  let midCount = 0;
  let attCount = 0;

  for (const p of lineup) {
    const key = (p.label || p.subPosition || p.role || '').toUpperCase();
    if (key === 'GK') {
      gkCount++;
    } else if (isDefenderRole(key)) {
      defCount++;
    } else if (isMidfielderRole(key)) {
      midCount++;
    } else if (isAttackerRole(key)) {
      attCount++;
    }
  }

  const missing: string[] = [];
  if (gkCount !== 1) missing.push(gkCount === 0 ? '1 Goalkeeper' : 'Exactly 1 Goalkeeper');
  if (defCount < 2) missing.push(`at least 2 Defenders (currently: ${defCount})`);
  if (midCount < 2) missing.push(`at least 2 Midfielders (currently: ${midCount})`);
  if (attCount < 1) missing.push(`at least 1 Attacker (currently: ${attCount})`);

  const isValid = missing.length === 0;
  const message = isValid
    ? 'Lineup is valid'
    : `⚠️ INVALID FORMATION: Lineup requires ${missing.join(', ')}!`;

  return { isValid, gkCount, defCount, midCount, attCount, message };
}

export const CANONICAL_PLAYSTYLES: TacticalPlaystyle[] = [
  'possession',
  'arteta_control',
  'long_ball',
  'catenaccio',
  'counterattack',
  'gegenpress',
  'futbol_champan',
  'jogobonito',
  'custom',
];

export const PLAYSTYLE_DEFINITIONS: Record<TacticalPlaystyle, PlaystyleDefinition> = {
  possession: {
    id: 'possession',
    name: 'Tiki-Taka',
    subtitle: 'Fluid Possession',
    description: 'Spanish positional mastery: short triangulations, high defensive line, suffocating 3-second counter-press on turnovers.',
    accentColor: '#10b981',
    tactics: {
      pressIntensity: 0.85,
      defensiveLineDepth: 0.78, // high line
      horizontalCompactness: 0.65,
      directness: 0.15, // pure short passing
      tempo: 0.48,
      foulingTendency: 0.20,
    },
  },
  arteta_control: {
    id: 'arteta_control',
    name: 'Controlled Possession',
    subtitle: 'Arteta Positional Lock',
    description: 'Impenetrable 4-CB rest defense security, ultra-compact horizontal shape, patient buildup, and set-piece orientation.',
    accentColor: '#38bdf8',
    tactics: {
      pressIntensity: 0.82,
      defensiveLineDepth: 0.75,
      horizontalCompactness: 0.92, // ultra compact
      directness: 0.22,
      tempo: 0.50,
      foulingTendency: 0.35,
    },
  },
  conservative: {
    id: 'conservative',
    name: 'Controlled Possession',
    subtitle: 'Arteta Positional Lock',
    description: 'Impenetrable 4-CB rest defense security, ultra-compact horizontal shape, patient buildup, and set-piece orientation.',
    accentColor: '#6366f1',
    tactics: {
      pressIntensity: 0.82,
      defensiveLineDepth: 0.75,
      horizontalCompactness: 0.92,
      directness: 0.22,
      tempo: 0.50,
      foulingTendency: 0.35,
    },
  },
  long_ball: {
    id: 'long_ball',
    name: 'Direct Long Ball',
    subtitle: 'Burnley Two Towers',
    description: 'Direct route-one architecture: towering 500px+ aerial balls to target forwards (ST1/ST2) and surging midfield swarms winning second-ball knockdowns.',
    accentColor: '#f59e0b',
    tactics: {
      pressIntensity: 0.65,
      defensiveLineDepth: 0.35,
      horizontalCompactness: 0.78,
      directness: 0.96, // true direct route one
      tempo: 0.78,
      foulingTendency: 0.45,
    },
  },
  brexitball: {
    id: 'brexitball',
    name: 'Direct Long Ball',
    subtitle: 'Burnley Two Towers',
    description: 'Direct route-one architecture: towering 500px+ aerial balls to target forwards (ST1/ST2) and surging midfield swarms winning second-ball knockdowns.',
    accentColor: '#ca8a04',
    tactics: {
      pressIntensity: 0.65,
      defensiveLineDepth: 0.35,
      horizontalCompactness: 0.78,
      directness: 0.96,
      tempo: 0.78,
      foulingTendency: 0.45,
    },
  },
  catenaccio: {
    id: 'catenaccio',
    name: 'Catenaccio',
    subtitle: 'Tenacious Defensive Fort',
    description: 'Deep low compact block (18-22m), aggressive man-marking, bone-crunching physical duels, funneling attacks into congested wide areas.',
    accentColor: '#3b82f6',
    tactics: {
      pressIntensity: 0.85,
      defensiveLineDepth: 0.15, // deep low block
      horizontalCompactness: 0.90,
      directness: 0.45,
      tempo: 0.60,
      foulingTendency: 0.70,
    },
  },
  counterattack: {
    id: 'counterattack',
    name: 'Counterattack',
    subtitle: 'Vibeball / Direct Breaks',
    description: 'Absorbs pressure then unleashes lightning 3-4 pass vertical breaks into central channels. Automatically switches to aerial cross bombardment when trailing late in game.',
    accentColor: '#ec4899',
    tactics: {
      pressIntensity: 0.65,
      defensiveLineDepth: 0.25,
      horizontalCompactness: 0.80,
      directness: 0.85,
      tempo: 0.95, // blistering pace
      foulingTendency: 0.35,
    },
  },
  gegenpress: {
    id: 'gegenpress',
    name: 'Gegenpress',
    subtitle: 'German High-Line Intensity',
    description: 'Relentless high-line pressing suffocating rivals near the halfway line with active offside traps. Triggers high-block turnovers followed by rapid forward combinations.',
    accentColor: '#ef4444',
    tactics: {
      pressIntensity: 0.96, // maximum press
      defensiveLineDepth: 0.85, // defends near halfway line
      horizontalCompactness: 0.75,
      directness: 0.70,
      tempo: 0.92,
      foulingTendency: 0.55,
    },
  },
  futbol_champan: {
    id: 'futbol_champan',
    name: 'Fútbol Champán',
    subtitle: 'Argentine Flair & Grit',
    description: 'Fluid possession with high intensity. Free-roaming No. 10 dictates tempo (80%+ target bias). Uses tactical fouls to break counters & drops into a steel block when leading.',
    accentColor: '#06b6d4',
    tactics: {
      pressIntensity: 0.75,
      defensiveLineDepth: 0.55,
      horizontalCompactness: 0.75,
      directness: 0.50,
      tempo: 0.70,
      foulingTendency: 0.85, // tactical fouls
    },
  },
  jogobonito: {
    id: 'jogobonito',
    name: 'Jogo Bonito',
    subtitle: 'Samba Relational Ginga',
    description: 'Brazilian flair with relational overloads: players congregate near the ball carrier to weave rapid tiki-taka triangles, sombreros, and acrobatic volleys.',
    accentColor: '#eab308',
    tactics: {
      pressIntensity: 0.72,
      defensiveLineDepth: 0.58,
      horizontalCompactness: 0.70,
      directness: 0.25,
      tempo: 0.75,
      foulingTendency: 0.25,
    },
  },
  custom: {
    id: 'custom',
    name: 'Custom Tactics',
    subtitle: 'User Defined Philosophy',
    description: 'Custom fine-tuned tactical balance across defensive line depth, marking style, offside trap, compactness, build-up creation, final third behavior, shape, and attacking runs.',
    accentColor: '#f97316',
    tactics: {
      pressIntensity: 0.75,
      defensiveLineDepth: 0.50,
      horizontalCompactness: 0.75,
      directness: 0.50,
      tempo: 0.70,
      foulingTendency: 0.40,
    },
  },
};

/**
 * Detailed tactical settings mapped strictly according to specifications:
 * - Defensive Line: 1 (Deep drop in area) to 5 (Halfway line press)
 * - Style: 'marking' | 'mixed' | 'zonal'
 * - Offside: YES (true) | NO (false)
 * - Compactness: 1 (Dispersed) to 4 (Ultra compact)
 * - Creation: 'short' | 'mixed' | 'long'
 * - Final Third: 'early_shoot' | 'crossing' | 'secure'
 * - Shape: 'total_football' | 'free' | 'relational' | 'strict'
 * - Runs: 'all_attack' | 'moderate' | 'low' | 'all_defend'
 */
export const TACTICAL_PRESETS_DETAILED: Record<TacticalPlaystyle, DetailedTactics> = {
  possession: {
    defensiveLine: 4,
    defensiveStyle: 'zonal',
    offsideTrap: true,
    compactness: 2,
    creation: 'short',
    finalThird: 'secure',
    shape: 'total_football',
    runs: 'moderate',
  },
  arteta_control: {
    defensiveLine: 4,
    defensiveStyle: 'zonal',
    offsideTrap: true,
    compactness: 4,
    creation: 'short',
    finalThird: 'secure',
    shape: 'strict',
    runs: 'moderate',
  },
  gegenpress: {
    defensiveLine: 5,
    defensiveStyle: 'marking',
    offsideTrap: true,
    compactness: 2,
    creation: 'mixed',
    finalThird: 'early_shoot',
    shape: 'total_football',
    runs: 'all_attack',
  },
  catenaccio: {
    defensiveLine: 1,
    defensiveStyle: 'marking',
    offsideTrap: false,
    compactness: 4,
    creation: 'long',
    finalThird: 'early_shoot',
    shape: 'strict',
    runs: 'all_defend',
  },
  counterattack: {
    defensiveLine: 2,
    defensiveStyle: 'mixed',
    offsideTrap: false,
    compactness: 3,
    creation: 'mixed',
    finalThird: 'crossing',
    shape: 'strict',
    runs: 'moderate',
  },
  long_ball: {
    defensiveLine: 2,
    defensiveStyle: 'marking',
    offsideTrap: false,
    compactness: 3,
    creation: 'long',
    finalThird: 'crossing',
    shape: 'strict',
    runs: 'moderate',
  },
  brexitball: {
    defensiveLine: 2,
    defensiveStyle: 'marking',
    offsideTrap: false,
    compactness: 3,
    creation: 'long',
    finalThird: 'crossing',
    shape: 'strict',
    runs: 'moderate',
  },
  jogobonito: {
    defensiveLine: 3,
    defensiveStyle: 'zonal',
    offsideTrap: false,
    compactness: 2,
    creation: 'short',
    finalThird: 'secure',
    shape: 'relational',
    runs: 'all_attack',
  },
  futbol_champan: {
    defensiveLine: 4,
    defensiveStyle: 'mixed',
    offsideTrap: true,
    compactness: 2,
    creation: 'short',
    finalThird: 'secure',
    shape: 'free',
    runs: 'all_attack',
  },
  conservative: {
    defensiveLine: 4,
    defensiveStyle: 'zonal',
    offsideTrap: true,
    compactness: 4,
    creation: 'short',
    finalThird: 'secure',
    shape: 'strict',
    runs: 'moderate',
  },
  custom: {
    defensiveLine: 3,
    defensiveStyle: 'mixed',
    offsideTrap: true,
    compactness: 2,
    creation: 'mixed',
    finalThird: 'secure',
    shape: 'total_football',
    runs: 'moderate',
  },
};

/**
 * Returns default DetailedTactics for a given preset
 */
export function getDefaultTactics(preset: TacticalPlaystyle = 'possession'): DetailedTactics {
  return { ...(TACTICAL_PRESETS_DETAILED[preset] || TACTICAL_PRESETS_DETAILED.possession) };
}

/**
 * Checks if current DetailedTactics matches an existing preset exactly, or is 'custom'
 */
export function detectMatchingPreset(tactics: DetailedTactics): TacticalPlaystyle {
  for (const presetKey of CANONICAL_PLAYSTYLES) {
    if (presetKey === 'custom') continue;
    const presetTactics = TACTICAL_PRESETS_DETAILED[presetKey];
    if (
      presetTactics &&
      presetTactics.defensiveLine === tactics.defensiveLine &&
      presetTactics.defensiveStyle === tactics.defensiveStyle &&
      presetTactics.offsideTrap === tactics.offsideTrap &&
      presetTactics.compactness === tactics.compactness &&
      presetTactics.creation === tactics.creation &&
      presetTactics.finalThird === tactics.finalThird &&
      presetTactics.shape === tactics.shape &&
      presetTactics.runs === tactics.runs
    ) {
      return presetKey;
    }
  }
  return 'custom';
}

/**
 * Applies selected formation coordinates to a team's players
 */
export function applyFormationToPlayers(
  players: Player[],
  team: TeamSide,
  formation: FormationName,
  fieldWidth: number,
  fieldHeight: number,
  pitchLeft: number,
  pitchTop: number,
  attacksUp?: boolean
) {
  const isAttackingUp = attacksUp !== undefined ? attacksUp : team === 'home';
  const formationSlots = isAttackingUp ? HOME_FORMATIONS[formation] : getAwayFormationPositions(formation);

  for (const player of players) {
    if (player.team !== team) continue;
    const slot = formationSlots[player.role];
    if (slot) {
      player.baseX = slot.x;
      player.baseY = slot.y;
      player.targetX = pitchLeft + slot.x * fieldWidth;
      player.targetY = pitchTop + slot.y * fieldHeight;
      // Phase 7: Update 3-Tier Hierarchy (Primary, SubPos, Playstyle)
      applyPositionalHierarchyToPlayer(player, formation, player.playstyle);
    }
  }
}
