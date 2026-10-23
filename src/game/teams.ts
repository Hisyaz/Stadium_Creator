/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  TeamDefinition,
  TeamRosterPlayer,
  CanonicalOutfieldStats,
  CanonicalGoalkeeperStats,
  Player,
  PlayerRole,
} from '../types';
import {
  TEAM_DATABASE,
  getAllTeams,
  getTeamById,
  getCategories,
  getConfederations,
  getCountries,
  getLeagues,
  getTeamsByFilter,
  getRandomTeam,
} from './teamDatabase';
import { createStatsBuffer, calculateInitialMaxStamina, getDribblingTier } from './playerStats';
import { applyPositionalHierarchyToPlayer } from './playstyles';
import { applyFormationToPlayers, HOME_FORMATIONS, getAwayFormationPositions } from './formations';
import { PITCH_CONFIG } from './constants';
import type { MatchEngine } from './engine';

export * from './teamDatabase';

/**
 * Calculates a player's dynamic Overall Rating (OVR) based on canonical stats and tactical role
 */
export function calculatePlayerOvr(
  stats?: CanonicalOutfieldStats | CanonicalGoalkeeperStats | null,
  role?: PlayerRole | string
): number {
  if (!stats || typeof stats !== 'object') {
    return 75;
  }
  if (role === 'GK' || 'sav' in stats) {
    const gk = stats as CanonicalGoalkeeperStats;
    // Weighted GK formula
    const weighted =
      (gk.sav || 75) * 0.25 +
      (gk.ref || 75) * 0.25 +
      (gk.han || 75) * 0.15 +
      (gk.gpo || 75) * 0.15 +
      (gk.oneOnOne || 75) * 0.10 +
      (gk.aer || 75) * 0.05 +
      (gk.dis || 75) * 0.05;
    return Math.round(weighted);
  }

  const out = stats as CanonicalOutfieldStats;
  const isDef = role === 'CB1' || role === 'CB2' || role === 'LB' || role === 'RB';
  const isMid = role === 'CM1' || role === 'CM2' || role === 'LM' || role === 'RM';
  const isAtt = role === 'ST1' || role === 'ST2';

  if (isDef) {
    const weighted =
      out.tck * 0.20 +
      out.int * 0.18 +
      out.mrk * 0.16 +
      out.sld * 0.10 +
      out.str * 0.10 +
      out.pos * 0.10 +
      out.pac * 0.08 +
      out.cmp * 0.08;
    return Math.round(weighted);
  }

  if (isMid) {
    const weighted =
      out.spa * 0.18 +
      out.lpa * 0.14 +
      out.bcl * 0.14 +
      out.dri * 0.12 +
      out.ret * 0.10 +
      out.int * 0.10 +
      out.cmp * 0.10 +
      out.sta * 0.06 +
      out.sho * 0.06;
    return Math.round(weighted);
  }

  if (isAtt) {
    const weighted =
      out.sho * 0.24 +
      out.pos * 0.16 +
      out.bcl * 0.14 +
      out.dri * 0.14 +
      out.pac * 0.12 +
      out.lsh * 0.08 +
      out.hea * 0.06 +
      out.cmp * 0.06;
    return Math.round(weighted);
  }

  // Fallback average
  const sum =
    out.pac + out.sta + out.str + out.bcl + out.ret + out.dri +
    out.spa + out.lpa + out.cro + out.sho + out.hea + out.lsh +
    out.tck + out.sld + out.int + out.mrk + out.pos + out.cmp + out.rea;
  return Math.round(sum / 19);
}

/**
 * Applies a full team definition (roster, attributes, tactical identity, and kits) to the MatchEngine
 */
export function applyTeamToEngine(
  engine: MatchEngine,
  side: 'home' | 'away',
  team: TeamDefinition
) {
  if (side === 'home') {
    (engine as any).homeTeam = team;
    // Update kit
    engine.homeKit = { ...team.kit };
    engine.homeFormation = team.preferredFormation;
    engine.homePlaystyle = team.tacticalPlaystyle;
    engine.homeTactics = { ...team.tactics };
    // Phase 12: Team-Specific Home Stadium Binding & Kickoff Venue Registry (Section 12.5)
    if (typeof (engine as any).applyHomeVenueForTeam === 'function') {
      (engine as any).applyHomeVenueForTeam(team);
    }
  } else {
    (engine as any).awayTeam = team;
    // Update kit: prefer awayKit if defined, fallback to kit
    engine.awayKit = { ...(team.awayKit || team.kit) };
    engine.awayFormation = team.preferredFormation;
    engine.awayPlaystyle = team.tacticalPlaystyle;
    engine.awayTactics = { ...team.tactics };
  }

  // Apply roster to engine players on this side
  const teamPlayers = team.players;
  const sidePlayers = engine.players.filter(p => p.team === side);
  const matchedSet = new Set<string>();

  for (let i = 0; i < teamPlayers.length; i++) {
    const rp = teamPlayers[i];
    // Try to find matching player with same role not yet matched
    let targetPlayer = sidePlayers.find(p => p.role === rp.role && !matchedSet.has(p.id));
    if (!targetPlayer) {
      // Fallback to first unmatched player or direct index
      targetPlayer = sidePlayers.find(p => !matchedSet.has(p.id)) || sidePlayers[i];
    }
    if (!targetPlayer) continue;
    matchedSet.add(targetPlayer.id);

    targetPlayer.name = rp.name;
    targetPlayer.number = rp.number;
    targetPlayer.role = rp.role;
    targetPlayer.subPos = rp.subPosition;
    targetPlayer.playstyle = rp.playstyle;
    targetPlayer.scale = rp.scale ?? 1.0;
    targetPlayer.appearance = { ...rp.appearance };
    targetPlayer.canonicalStats = { ...rp.canonicalStats };

    const isGK = rp.role === 'GK';
    const sta = ('sta' in rp.canonicalStats) ? (rp.canonicalStats as CanonicalOutfieldStats).sta : 85;
    const initialMax = calculateInitialMaxStamina(sta);
    targetPlayer.stamina = initialMax;
    targetPlayer.staminaMax = initialMax;
    targetPlayer.staminaInitialMax = initialMax;

    // Phase 8: Dribbling Tier
    const dri = ('dri' in rp.canonicalStats) ? (rp.canonicalStats as CanonicalOutfieldStats).dri : 70;
    targetPlayer.dribbleTier = getDribblingTier(dri);

    // Zero-allocation buffer sync
    targetPlayer.statsBuffer = createStatsBuffer(
      !isGK ? (rp.canonicalStats as CanonicalOutfieldStats) : undefined,
      isGK ? (rp.canonicalStats as CanonicalGoalkeeperStats) : undefined
    );

    // Sync legacy approximation stats for secondary checks
    if (!isGK) {
      const out = rp.canonicalStats as CanonicalOutfieldStats;
      targetPlayer.stats = {
        speed: 2.0 + (out.pac - 40) * 0.015,
        sprintSpeed: 3.3 + (out.pac - 40) * 0.02,
        shotPower: 3.5 + (out.sho - 40) * 0.03,
        passing: 3.5 + (out.spa - 40) * 0.03,
        tackling: 3.0 + (out.tck - 40) * 0.03,
        heading: 3.0 + (out.hea - 40) * 0.03,
        dribbling: 3.0 + (out.dri - 40) * 0.03,
      };
    } else {
      const gk = rp.canonicalStats as CanonicalGoalkeeperStats;
      targetPlayer.stats = {
        speed: 2.1,
        sprintSpeed: 3.3,
        shotPower: 4.5,
        passing: 3.8 + (gk.dis - 40) * 0.02,
        tackling: 4.2,
        heading: 4.0,
      };
    }

    applyPositionalHierarchyToPlayer(targetPlayer, side === 'home' ? engine.homeFormation : engine.awayFormation);
  }

  // Re-apply formation layout base positions with correct half attack direction
  const formation = side === 'home' ? engine.homeFormation : engine.awayFormation;
  const attacksUp = side === 'home' ? engine.homeAttacksUp : !engine.homeAttacksUp;
  applyFormationToPlayers(
    engine.players,
    side,
    formation,
    PITCH_CONFIG.FIELD_WIDTH,
    PITCH_CONFIG.FIELD_HEIGHT,
    PITCH_CONFIG.PITCH_LEFT,
    PITCH_CONFIG.PITCH_TOP,
    attacksUp
  );

  // If match hasn't started or engine is paused (like during menus/kickoff):
  // snap players directly to their target formation positions so pitch canvas updates instantly
  if (engine.matchPhase === 'kickoff_ready' || engine.isPaused || engine.matchTimeSeconds === 0) {
    for (const p of engine.players) {
      if (p.team === side) {
        p.x = p.targetX;
        p.y = p.targetY;
        p.vx = 0;
        p.vy = 0;
        p.action = 'idle';
      }
    }
  }

  // Sync human player slots with updated roster
  engine.syncSlotControlledPlayers();

  // Phase 10: Initialize player ratings for updated team roster
  if (engine.matchTimeSeconds === 0) {
    engine.playerRatings.initPlayers(engine.players);
  }

  engine.setBanner(`${team.name.toUpperCase()} LOADED (${team.ratingTier}-TIER · ${team.averageOvr} OVR)`, 90);
}
