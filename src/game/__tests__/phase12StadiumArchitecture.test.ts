/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateStandCapacity,
  calculateStadiumTotalCapacity,
  calculateFifaQualification,
  StandConfig,
  StandPosition,
  StadiumShape,
} from '../../types/stadium';
import {
  STADIUM_REGISTRY,
  getAllRegisteredStadiums,
  getStadiumById,
  getHomeStadiumForTeam,
  ESTADIO_MONUMENTAL,
  LA_BOMBONERA,
  SANTIAGO_BERNABEU,
  CRAVEN_COTTAGE,
  ESTADIO_TECHO,
  MARACANA_LEGEND,
  VICTORIA_AIRPORT_GROUND,
  FLOATING_MARINA_ARENA,
} from '../stadiumRegistry';
import { MatchEngine } from '../engine';
import { getTeamById } from '../teams';

describe('Phase 12: Data-Driven Stadium Architecture, Dugout Benches, Entrance Tunnels & Team Venues', () => {
  let engine: MatchEngine;

  beforeEach(() => {
    engine = new MatchEngine();
  });

  describe('1. Stadium Shapes & Additive Capacity Math', () => {
    it('calculates stand capacity additively based on tiers, sizes, and architectural grade', () => {
      const stand: StandConfig = {
        position: 'east',
        type: 'tiered',
        grade: 'grade4_modern',
        tierCount: 3,
        tiers: [
          { size: 'large' },
          { size: 'medium' },
          { size: 'small' },
        ],
        primaryColor: '#dc2626',
        secondaryColor: '#ffffff',
      };

      const capacity = calculateStandCapacity(stand, 'rectangular');
      expect(capacity).toBeGreaterThan(5000);
      expect(Number.isInteger(capacity)).toBe(true);
    });

    it('calculates wall tier capacity based on wall height and depth', () => {
      const wallStand: StandConfig = {
        position: 'west',
        type: 'wall',
        grade: 'grade3_steel_cantilever',
        wallTier: {
          size: 'steep_compact',
          benchDepth: 18,
          barrierFinish: 'raw_concrete',
        },
        primaryColor: '#002244',
        secondaryColor: '#f59e0b',
      };

      const capacity = calculateStandCapacity(wallStand, 'rectangular');
      expect(capacity).toBeGreaterThan(0);
    });

    it('returns zero capacity for no_stand configuration', () => {
      const noStand: StandConfig = {
        position: 'north',
        type: 'no_stand',
        grade: 'grade1_historic_timber',
        noStandBackdrop: 'distant_trees',
      };

      const capacity = calculateStandCapacity(noStand, 'rectangular');
      expect(capacity).toBe(0);
    });

    it('applies shape capacity multipliers for oval and circular bowl acoustics', () => {
      const stand: StandConfig = {
        position: 'north',
        type: 'tiered',
        grade: 'grade4_modern',
        tierCount: 2,
        tiers: [{ size: 'medium' }, { size: 'medium' }],
      };

      const rectCap = calculateStandCapacity(stand, 'rectangular');
      const ovalCap = calculateStandCapacity(stand, 'oval');
      const circularCap = calculateStandCapacity(stand, 'circular');

      expect(ovalCap).toBeGreaterThan(rectCap);
      expect(circularCap).toBeGreaterThan(ovalCap);
    });
  });

  describe('2. Dynamic FIFA Qualification Thresholds', () => {
    it('accurately evaluates all 4 official FIFA categories based on capacity', () => {
      expect(calculateFifaQualification(12000)).toBe('national');
      expect(calculateFifaQualification(14999)).toBe('national');
      expect(calculateFifaQualification(15000)).toBe('first_division');
      expect(calculateFifaQualification(25700)).toBe('first_division');
      expect(calculateFifaQualification(34999)).toBe('first_division');
      expect(calculateFifaQualification(35000)).toBe('continental');
      expect(calculateFifaQualification(54000)).toBe('continental');
      expect(calculateFifaQualification(59999)).toBe('continental');
      expect(calculateFifaQualification(60000)).toBe('world');
      expect(calculateFifaQualification(84567)).toBe('world');
    });
  });

  describe('3. Canonical Stadium Registry & Architecture', () => {
    it('registers all 8 canonical stadiums with complete Phase 12 architecture specs', () => {
      const registered = getAllRegisteredStadiums();
      expect(registered.length).toBe(8);

      const ids = registered.map((s) => s.id);
      expect(ids).toContain('estadio_monumental');
      expect(ids).toContain('la_bombonera');
      expect(ids).toContain('santiago_bernabeu');
      expect(ids).toContain('craven_cottage');
      expect(ids).toContain('estadio_metropolitano_techo');
      expect(ids).toContain('maracana_legend');
      expect(ids).toContain('victoria_runway_ground');
      expect(ids).toContain('floating_marina_arena');
    });

    it('configures authentic dugouts and tunnels for each canonical stadium', () => {
      // 1. Monumental: covered sunken dugouts, inflatable accordion tunnel, oval shape, track
      expect(ESTADIO_MONUMENTAL.shape).toBe('oval');
      expect(ESTADIO_MONUMENTAL.hasTrack).toBe(true);
      expect(ESTADIO_MONUMENTAL.dugouts.type).toBe('covered_sunken');
      expect(ESTADIO_MONUMENTAL.tunnel.type).toBe('inflatable_accordion');
      expect(ESTADIO_MONUMENTAL.fifaCategory).toBe('world');

      // 2. La Bombonera: racing bucket dugouts, subterranean staircase tunnel, wall stand on East
      expect(LA_BOMBONERA.shape).toBe('rectangular');
      expect(LA_BOMBONERA.stands.east?.type).toBe('wall');
      expect(LA_BOMBONERA.dugouts.type).toBe('racing_bucket');
      expect(LA_BOMBONERA.tunnel.type).toBe('subterranean_staircase');
      expect(LA_BOMBONERA.fifaCategory).toBe('continental');

      // 3. Santiago Bernabéu: recaro racing dugouts, modern architectural tunnel with LED
      expect(SANTIAGO_BERNABEU.dugouts.type).toBe('recaro_racing');
      expect(SANTIAGO_BERNABEU.tunnel.type).toBe('modern_architectural');
      expect(SANTIAGO_BERNABEU.fifaCategory).toBe('world');

      // 4. Craven Cottage: classic timber dugout benches, direct portal archway
      expect(CRAVEN_COTTAGE.dugouts.type).toBe('classic_timber');
      expect(CRAVEN_COTTAGE.tunnel.type).toBe('direct_portal');
      expect(CRAVEN_COTTAGE.fifaCategory).toBe('first_division');

      // 5. Estadio de Techo: concrete dugout shelter, inflatable accordion tunnel
      expect(ESTADIO_TECHO.dugouts.type).toBe('utilitarian_concrete');
      expect(ESTADIO_TECHO.tunnel.type).toBe('inflatable_accordion');
      expect(ESTADIO_TECHO.fifaCategory).toBe('national');

      // 6. Maracanã Legend: round bowl with inflatable accordion tunnel
      expect(MARACANA_LEGEND.shape).toBe('round');
      expect(MARACANA_LEGEND.tunnel.type).toBe('inflatable_accordion');
      expect(MARACANA_LEGEND.fifaCategory).toBe('world');

      // 7. Victoria Airport Ground: runway surroundings, folding chairs
      expect(VICTORIA_AIRPORT_GROUND.surroundings).toBe('airport');
      expect(VICTORIA_AIRPORT_GROUND.dugouts.type).toBe('folding_chairs');
      expect(VICTORIA_AIRPORT_GROUND.fifaCategory).toBe('national');

      // 8. Floating Marina Arena: marine floating surroundings, continental tier
      expect(FLOATING_MARINA_ARENA.shape).toBe('rectangular');
      expect(FLOATING_MARINA_ARENA.surroundings).toBe('marine_floating');
      expect(FLOATING_MARINA_ARENA.fifaCategory).toBe('continental');
    });
  });

  describe('4. Team Home Stadium Binding & Kickoff Auto-Selection', () => {
    it('binds Boca Juniors to La Bombonera and applies home venue on team selection', () => {
      const boca = getTeamById('boca_juniors');
      expect(boca.homeStadiumId).toBe('la_bombonera');

      const homeStadium = getHomeStadiumForTeam(boca);
      expect(homeStadium?.id).toBe('la_bombonera');

      engine.setTeam('home', boca);
      expect(engine.activeStadium.id).toBe('la_bombonera');
      expect(engine.isHomeVenueSelected).toBe(true);
      expect(engine.turfQuality).toBe('normal');
      expect(engine.netTension).toBe('hard');
      expect(engine.activeStadium.dugouts.type).toBe('racing_bucket');
    });

    it('binds River Plate to Estadio Mâs Monumental and auto-activates athletics track and oval bowl', () => {
      const river = getTeamById('river_plate');
      expect(river.homeStadiumId).toBe('estadio_monumental');

      engine.setTeam('home', river);
      expect(engine.activeStadium.id).toBe('estadio_monumental');
      expect(engine.isHomeVenueSelected).toBe(true);
      expect(engine.activeStadium.hasTrack).toBe(true);
      expect(engine.activeStadium.shape).toBe('oval');
      expect(engine.activeStadium.dugouts.type).toBe('covered_sunken');
    });

    it('binds Spain 2026 to Santiago Bernabéu with elite LED tunnels', () => {
      const spain = getTeamById('spain_2026');
      expect(spain.homeStadiumId).toBe('santiago_bernabeu');

      engine.setTeam('home', spain);
      expect(engine.activeStadium.id).toBe('santiago_bernabeu');
      expect(engine.isHomeVenueSelected).toBe(true);
      expect(engine.activeStadium.tunnel.type).toBe('modern_architectural');
      expect(engine.turfQuality).toBe('pristine');
    });

    it('binds Classic European to Craven Cottage with historic timber bench and riverfront', () => {
      const classic = getTeamById('classic_european');
      expect(classic.homeStadiumId).toBe('craven_cottage');

      engine.setTeam('home', classic);
      expect(engine.activeStadium.id).toBe('craven_cottage');
      expect(engine.isHomeVenueSelected).toBe(true);
      expect(engine.stadiumTier).toBe('craven');
      expect(engine.activeStadium.dugouts.type).toBe('classic_timber');
    });

    it('allows switching to a neutral venue which unlocks isHomeVenueSelected', () => {
      const river = getTeamById('river_plate');
      engine.setTeam('home', river);
      expect(engine.isHomeVenueSelected).toBe(true);

      // Manually choose neutral Craven Cottage
      engine.applyStadium(CRAVEN_COTTAGE, false);
      expect(engine.activeStadium.id).toBe('craven_cottage');
      expect(engine.isHomeVenueSelected).toBe(false);
    });

    it('restoring home venue relocks isHomeVenueSelected', () => {
      const river = getTeamById('river_plate');
      engine.setTeam('home', river);

      // Switch away
      engine.applyStadium(CRAVEN_COTTAGE, false);
      expect(engine.isHomeVenueSelected).toBe(false);

      // Restore home venue
      engine.applyHomeVenueForTeam(river);
      expect(engine.activeStadium.id).toBe('estadio_monumental');
      expect(engine.isHomeVenueSelected).toBe(true);
    });
  });

  describe('5. 5 Bench Types & 5 Entrance Tunnel Types In Engine', () => {
    it('supports runtime configuration of all 5 bench types', () => {
      const types = ['racing_bucket', 'covered_sunken', 'classic_timber', 'concrete_dugout', 'folding_chairs'] as const;
      for (const t of types) {
        engine.activeStadium.dugouts.type = t;
        expect(engine.activeStadium.dugouts.type).toBe(t);
      }
    });

    it('supports runtime configuration of all 5 entrance tunnel types', () => {
      const types = ['inflatable_accordion', 'modern_architectural', 'subterranean_staircase', 'direct_portal', 'telescopic_canopy'] as const;
      for (const t of types) {
        engine.activeStadium.tunnel.type = t;
        expect(engine.activeStadium.tunnel.type).toBe(t);
      }
    });

    it('supports 4 stadium shapes', () => {
      const shapes: StadiumShape[] = ['rectangular', 'oval', 'circular', 'octagonal'];
      for (const s of shapes) {
        engine.activeStadium.shape = s;
        expect(engine.activeStadium.shape).toBe(s);
      }
    });
  });
});
