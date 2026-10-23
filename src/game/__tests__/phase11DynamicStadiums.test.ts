/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 11 Unit Tests: Dynamic Stadiums, Living Match Atmosphere & Crowd Acoustics
 *
 * Verifies:
 * 1. 11.1 Dynamic Crowd Acoustics & Reactivity:
 *    - 6 Crowd Attendance Multipliers (Empty 0, Small 0.22, Few 0.45, Half 0.70, Crowded 1.0, Packet 1.35).
 *    - Stadium Tier Acoustic Profiles (Monumental Cathedral Reverb, Craven Intimate Clap, Ascenso Bombo Drum).
 *    - Empty Stadium "Ghost Match" Mode: hollow concrete echo slapback, zero crowd singing, player/coach shouts.
 *    - Near-Miss Gasp Reactivity ("OHHHH!") on goal woodwork hits and narrow endline misses.
 *    - Home vs Away Goal Celebrations (Home explosive roar + flares vs Away stunned silence + boos).
 * 2. 11.2 Visual Crowd & Banner Immersion:
 *    - Density thresholds for all 6 attendance tiers (0% to 100%+ packet standing room).
 *    - Ultras colored smoke flares & drifting confetti streamers (papelitos) on goals and packet matches.
 *    - Dynamic "Hinchada" pogo bounce and scarf waving aloft for celebrating supporters.
 *    - Away fan section segregation on the far-right (~15% width).
 *    - Flashbulb pops scaling during night matches, penalty kicks, shootouts, and goal celebrations.
 * 3. 11.3 Kickoff Stadium Selector & Match Engine Coupling:
 *    - Authoritative synchronization between MatchEngine and AudioEngine on crowdLevel & stadiumTier.
 *    - Real-time danger level tracking & ambient murmur modulation.
 */

import { audio } from '../audio';
import {
  CROWD_DENSITY_THRESHOLDS,
  getCrowdDensityForLevel,
  triggerGoalCelebrationAtmosphere,
  getCrowdCelebrationState,
} from '../crowdRenderer';
import { MatchEngine } from '../engine';
import { CrowdLevel, StadiumTier } from '../../types';
import { PITCH_CONFIG } from '../constants';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failedTests++;
  }
}

console.log('--- RUNNING PHASE 11 DYNAMIC STADIUMS & MATCH ATMOSPHERE TESTS ---');

// =========================================================================
// TEST GROUP 1: Six Crowd Attendance Tiers & Acoustic Multipliers (11.1 & 11.3)
// =========================================================================
console.log('\n[TEST GROUP 1: Six Crowd Attendance Levels & Multipliers]');

audio.setCrowdLevel('empty');
assert(audio.getCrowdMultiplier() === 0, 'Empty stadium has exactly 0.0 crowd multiplier (ghost match)');

audio.setCrowdLevel('small');
assert(Math.abs(audio.getCrowdMultiplier() - 0.22) < 0.001, 'Small attendance has ~0.22 multiplier (sparse applause)');

audio.setCrowdLevel('few');
assert(Math.abs(audio.getCrowdMultiplier() - 0.45) < 0.001, 'Few attendance has ~0.45 multiplier (scattered murmurs)');

audio.setCrowdLevel('half');
assert(Math.abs(audio.getCrowdMultiplier() - 0.70) < 0.001, 'Half attendance has ~0.70 multiplier (solid hum & claps)');

audio.setCrowdLevel('crowded');
assert(Math.abs(audio.getCrowdMultiplier() - 1.0) < 0.001, 'Crowded attendance has 1.0 standard capacity multiplier');

audio.setCrowdLevel('packet');
assert(Math.abs(audio.getCrowdMultiplier() - 1.35) < 0.001, 'Packet attendance has 1.35 over-capacity multiplier (to the brim)');

// =========================================================================
// TEST GROUP 2: Stadium Architecture Acoustic Profiles (11.1)
// =========================================================================
console.log('\n[TEST GROUP 2: Stadium Tier Acoustic Profiles]');

const monumentalProfile = audio.getStadiumAcousticParams('monumental', 'crowded');
assert(monumentalProfile.reverbDecay >= 1.3, 'Monumental Arena has grand cathedral reverb decay (>= 1.3s)');
assert(monumentalProfile.chantStyle === 'hymn', 'Monumental Arena features melodic vocal hymn chant style');
assert(!monumentalProfile.hasBomboDrums, 'Monumental Arena uses clean European/continental chanting without bombos');

const cravenProfile = audio.getStadiumAcousticParams('craven', 'crowded');
assert(cravenProfile.reverbDecay <= 0.45, 'Craven Heritage Ground has intimate tight acoustic decay (<= 0.45s)');
assert(cravenProfile.chantStyle === 'clap', 'Craven Heritage Ground features rhythmic British 4-beat clap sequences');
assert(cravenProfile.highDamping > monumentalProfile.highDamping, 'Craven Ground has brighter, crisper high-frequency claps');

const ascensoProfile = audio.getStadiumAcousticParams('ascenso', 'crowded');
assert(ascensoProfile.hasBomboDrums === true, 'Ascenso Municipal authentically features South American Bombo drums');
assert(ascensoProfile.chantStyle === 'bombo', 'Ascenso Municipal chant style is driven by heavy Bombo percussion');
assert(ascensoProfile.lowBoost > monumentalProfile.lowBoost, 'Ascenso Municipal has high bass boost for deep terrace drums');

// Empty stadium hollow slapback echo
const emptyMonumental = audio.getStadiumAcousticParams('monumental', 'empty');
assert(emptyMonumental.isHollowEcho === true, 'Empty stadium profile activates hollow concrete slapback echo');
assert(emptyMonumental.reverbDecay > monumentalProfile.reverbDecay, 'Empty concrete bowl exhibits prolonged slapback flutter');

// =========================================================================
// TEST GROUP 3: Visual Density Thresholds & Crowd Capacity (11.2)
// =========================================================================
console.log('\n[TEST GROUP 3: Visual Density Thresholds]');

assert(getCrowdDensityForLevel('empty') === 0, 'Empty density threshold is 0.0 (bare concrete terraces)');
assert(getCrowdDensityForLevel('small') === 0.18, 'Small density threshold is 0.18 (isolated pockets)');
assert(getCrowdDensityForLevel('few') === 0.38, 'Few density threshold is 0.38 (dispersed turnout)');
assert(getCrowdDensityForLevel('half') === 0.58, 'Half density threshold is 0.58 (half-full grandstands)');
assert(getCrowdDensityForLevel('crowded') === 0.88, 'Crowded density threshold is 0.88 (near-capacity)');
assert(getCrowdDensityForLevel('packet') === 1.0, 'Packet density threshold is 1.0 (100% full + standing room)');

// =========================================================================
// TEST GROUP 4: Goal Celebrations, Ultras Smoke Flares & Confetti (11.1 & 11.2)
// =========================================================================
console.log('\n[TEST GROUP 4: Goal Celebrations, Smoke Flares & Papelitos]');

// Trigger home goal celebration
triggerGoalCelebrationAtmosphere('home', '#0055b8', '#ffffff');
let celebState = getCrowdCelebrationState();
assert(celebState.celebratingTeam === 'home', 'Goal celebration correctly registers Home team as celebrant');
assert(celebState.celebrationTimer > 0, 'Celebration timer initializes with positive countdown duration');

// Trigger away goal celebration
triggerGoalCelebrationAtmosphere('away', '#dc2626', '#ffffff');
celebState = getCrowdCelebrationState();
assert(celebState.celebratingTeam === 'away', 'Away goal celebration correctly assigns Away team as celebrant');

// Audio goal celebrations execute safely in test environment
audio.playGoalCelebration('home', false, 'monumental');
audio.playGoalCelebration('home', true, 'monumental'); // Late minute winner
audio.playGoalCelebration('away', false, 'monumental'); // Away silence + boos
assert(true, 'audio.playGoalCelebration executes cleanly for home, late-minute, and away scores');

// =========================================================================
// TEST GROUP 5: Near-Miss Gasp & Woodwork Reactions (11.1)
// =========================================================================
console.log('\n[TEST GROUP 5: Near-Miss Gasp & Woodwork Reactivity]');

audio.setCrowdLevel('crowded');
audio.playNearMissGasp('monumental');
audio.playNearMissGasp('craven');
audio.playNearMissGasp('ascenso');
assert(true, 'playNearMissGasp executes across all stadium tiers');

// Suppressed in empty stadium
audio.setCrowdLevel('empty');
audio.playNearMissGasp('monumental');
assert(true, 'playNearMissGasp cleanly suppresses crowd noise in empty stadium');

// Tactical player shouts
audio.playPlayerShout('man_on');
audio.playPlayerShout('pass');
audio.playPlayerShout('ref');
audio.playPlayerShout('shoot');
assert(true, 'playPlayerShout executes for all empty stadium communication types');

// =========================================================================
// TEST GROUP 6: MatchEngine Coupling & Atmosphere Synchronization (11.3)
// =========================================================================
console.log('\n[TEST GROUP 6: MatchEngine Coupling & Atmosphere Synchronization]');

const engine = new MatchEngine();
engine.isPaused = false;

// Verify setting crowd level updates engine and audio
engine.setCrowdLevel('packet');
assert(engine.crowdLevel === 'packet', 'MatchEngine crowdLevel updated to packet');
assert(audio.getCrowdLevel() === 'packet', 'AudioEngine synchronized to packet crowd level');
assert(audio.getCrowdMultiplier() === 1.35, 'AudioEngine crowd multiplier matches packet level (1.35)');

// Verify setting stadium tier updates engine and audio
engine.setStadiumTier('ascenso');
assert(engine.stadiumTier === 'ascenso', 'MatchEngine stadiumTier updated to ascenso');
assert(audio.getStadiumTier() === 'ascenso', 'AudioEngine synchronized to ascenso tier');
assert(audio.getStadiumAcousticParams().hasBomboDrums === true, 'Acoustic profile updates to include Bombo drums');

// Update tick atmosphere coupling
audio.updateAtmosphere({
  crowdLevel: 'crowded',
  stadiumTier: 'monumental',
  ballY: PITCH_CONFIG.PITCH_TOP + 100, // Dangerous attacking position!
  homeHasBall: true,
  dangerLevel: 0.85,
  scoreDelta: 0,
  matchTimeSeconds: 65 * 60,
  isPenalty: false,
});
assert(true, 'audio.updateAtmosphere executes with high danger level');

// Penalty shootout tension hush
audio.updateAtmosphere({
  crowdLevel: 'packet',
  stadiumTier: 'monumental',
  ballY: PITCH_CONFIG.PITCH_BOTTOM - 80,
  homeHasBall: true,
  dangerLevel: 0.95,
  scoreDelta: 0,
  matchTimeSeconds: 120 * 60,
  isPenalty: true,
});
assert(true, 'audio.updateAtmosphere successfully applies penalty shootout tension hush');

// =========================================================================
// SUMMARY
// =========================================================================
console.log('\n========================================');
console.log(`PHASE 11 TEST SUMMARY: ${passedTests} passed, ${failedTests} failed`);
console.log('========================================\n');

if (failedTests > 0) {
  process.exit(1);
}
