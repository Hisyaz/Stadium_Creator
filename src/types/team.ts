/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  PlayerRole,
  SubPosition,
  PlayerPlaystyle,
  FormationName,
  TacticalPlaystyle,
  DetailedTactics,
  TeamKit,
  CanonicalOutfieldStats,
  CanonicalGoalkeeperStats,
  PlayerAppearance,
} from '../types';
import { TeamVenueOverrides } from './stadium';

/**
 * Phase 13: Multi-Tier Team Database & Hierarchical Selection Engine
 */

export type TeamCategory = 'national' | 'club' | 'special';

export type Confederation = 'uefa' | 'conmebol' | 'concacaf' | 'afc' | 'caf' | 'ofc' | 'special';

export type RatingTier = 'S' | 'A' | 'B' | 'C';

/**
 * Authoritative Tactical Roles & Set-Piece Takers Schema (Section 13.4)
 */
export interface TeamTacticalRoles {
  captainId: string;           // Team captain (wears armband, CMP & POS leader)
  freeKickNearId: string;      // Direct free kicks near the penalty box (< 28m, high SHO & CMP)
  freeKickLongId: string;      // Deep / long free kicks into the box (> 28m, high LPA & CRO)
  penaltyTakerId: string;      // Primary penalty taker (highest SHO & CMP balance)
  leftCornerTakerId: string;   // Left corner kick specialist (high CRO & SPA)
  rightCornerTakerId: string;  // Right corner kick specialist (high CRO & SPA)
}

export interface TeamBadge {
  icon: string;         // Unicode or emoji emblem (e.g. '⭐', '🇪🇸', '🇦🇷', '👑')
  bg: string;           // Badge background color hex
  text: string;         // 3-letter badge abbreviation or symbol
  primaryColor: string; // Accent color hex
  secondaryColor: string;
}

export interface TeamRosterPlayer {
  id: string;
  name: string;
  number: number;
  role: PlayerRole;
  subPosition: SubPosition;
  playstyle: PlayerPlaystyle;
  intrinsicPlaystyle?: PlayerPlaystyle; // Phase 16.5: Intrinsic natural playstyle
  appearance: PlayerAppearance;
  scale?: number;
  canonicalStats: CanonicalOutfieldStats | CanonicalGoalkeeperStats;
  isCaptain?: boolean;
  customPos?: { x: number; y: number };
}

export interface TeamDefinition {
  id: string;
  name: string;
  shortName: string;
  category: TeamCategory;
  confederation: Confederation;
  country: string;
  countryCode: string; // e.g. 'ES', 'AR', 'CO', 'GL'
  league?: string;     // Domestic league for clubs (e.g. 'Liga Profesional', 'Torneo BetPlay')
  badge: TeamBadge;
  ratingTier: RatingTier;
  averageOvr: number; // Calibrated 50+ to 99+
  description: string;
  tacticalPlaystyle: TacticalPlaystyle;
  preferredFormation: FormationName;
  tactics: DetailedTactics;
  kit: TeamKit;
  awayKit: TeamKit;
  thirdKit?: TeamKit;
  roles: TeamTacticalRoles;
  manager?: {
    name: string;
    country?: string;
    countryCode?: string;
  };
  players: TeamRosterPlayer[];
  substitutes?: TeamRosterPlayer[];
  // Phase 12: Team-Specific Home Stadium Binding & Kickoff Venue Registry
  homeStadiumId?: string;
  venueOverrides?: TeamVenueOverrides;
}
