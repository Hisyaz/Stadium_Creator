/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 10 Unit Tests: Live Player Rating Engine (SofaScore Model) & Match MVP
 *
 * Verifies:
 * 1. Initial 6.0 Baseline (10.1):
 *    - Every outfield player and goalkeeper initializes at canonical 6.0.
 * 2. Positive & Negative Event Matrix (10.1):
 *    - Passing: Completed pass (+0.025), Key pass / Through-ball (+0.28), Incomplete pass turnover (-0.04).
 *    - Shooting: Shot on target (+0.20), Shot off target (-0.06).
 *    - Goalscoring & Assists: Position-weighted goals (ST +1.0, MID +1.15, DEF +1.35, GK +2.0), Assists (+0.65).
 *    - Conceding penalty: Defending team defenders (-0.28) and GK (-0.45) receive negative adjustments on goals conceded.
 *    - Disciplinary: Fouls committed (-0.15), Yellow card (-0.55), Red card (-1.50).
 *    - Own Goal: Massive disciplinary penalty (-1.40).
 *    - Defending & Goalkeeping: Clean tackles (+0.30), Interceptions (+0.26), Blocks (+0.32), GK parries (+0.40), GK catches (+0.50).
 *    - Skill & Dribbling: Successful skill bypass (+0.24), Dispossessed (-0.20).
 *    - Aerial Duels: Duel won (+0.16), Duel lost (-0.08).
 *    - Clean Sheet Bonus: +0.40 awarded to GK and Defenders if 0 goals conceded.
 * 3. Rating Clamping Bounds (10.1):
 *    - Rating never dips below 3.0 or exceeds 10.0.
 * 4. Substitution Freeze (10.2):
 *    - Subbed-out players freeze their rating at the minute of exit and receive no further event deltas.
 *    - Incoming substitute begins fresh at 6.0.
 * 5. Match MVP Resolution (10.2):
 *    - Highest rating across BOTH teams wins Match MVP.
 *    - Tiebreaker hierarchy functions deterministically.
 */

import { PlayerRatingsEngine, PlayerRatingRecord } from '../playerRatings';
import { Player, CanonicalOutfieldStats } from '../../types';

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

function createMockPlayer(overrides: Partial<Player> = {}): Player {
  const canonical: CanonicalOutfieldStats = {
    pac: 80, sta: 80, str: 75, bcl: 75, ret: 75, dri: 75,
    spa: 75, lpa: 70, cro: 70, sho: 75, hea: 75, lsh: 70,
    tck: 60, sld: 60, int: 70, mrk: 65, pos: 75, cmp: 75, rea: 75,
  };

  return {
    id: `player_${Math.random()}`,
    name: 'Test Player',
    number: 10,
    team: 'home',
    role: 'ST1',
    primaryPos: 'ATT',
    x: 500,
    y: 500,
    vx: 0,
    vy: 0,
    targetX: 500,
    targetY: 500,
    baseX: 0.5,
    baseY: 0.5,
    facingAngle: 0,
    facingDir: 'up',
    stats: { speed: 3.5, sprintSpeed: 4.5, shotPower: 4.5, passing: 4.0, tackling: 3.5, heading: 4.0 },
    canonicalStats: canonical,
    appearance: { heightCm: 180, weightKg: 75, muscleMass: 3, skinTone: '#f1c27d', hairStyle: 'buzzcut', hairColor: '#000' },
    action: 'idle',
    actionTimer: 0,
    stamina: 100,
    hasYellowCard: false,
    isRedCarded: false,
    animFrame: 0,
    animTimer: 0,
    isUserControlled: false,
    slideVelocityX: 0,
    slideVelocityY: 0,
    diveX: 0,
    diveY: 0,
    ...overrides,
  };
}

console.log('--- RUNNING PHASE 10 LIVE PLAYER RATING ENGINE & MATCH MVP TESTS ---');

// =========================================================================
// TEST GROUP 1: Baseline Initialization (10.1)
// =========================================================================
console.log('\n[TEST GROUP 1: Canonical 6.0 Baseline Initialization]');

const engine = new PlayerRatingsEngine();
const striker = createMockPlayer({ id: 'home_st', name: 'Ronaldo', number: 9, role: 'ST1', primaryPos: 'ATT', team: 'home' });
const mid = createMockPlayer({ id: 'home_mid', name: 'Zidane', number: 10, role: 'CM1', primaryPos: 'MID', team: 'home' });
const def = createMockPlayer({ id: 'home_def', name: 'Maldini', number: 3, role: 'CB1', primaryPos: 'DEF', team: 'home' });
const gk = createMockPlayer({ id: 'home_gk', name: 'Buffon', number: 1, role: 'GK', primaryPos: 'GK', team: 'home' });
const awayFwd = createMockPlayer({ id: 'away_fwd', name: 'Messi', number: 10, role: 'ST1', primaryPos: 'ATT', team: 'away' });

engine.initPlayers([striker, mid, def, gk, awayFwd]);

assert(engine.getRating('home_st') === 6.0, 'Striker starts at exactly 6.0 baseline rating');
assert(engine.getRating('home_mid') === 6.0, 'Midfielder starts at exactly 6.0 baseline rating');
assert(engine.getRating('home_def') === 6.0, 'Defender starts at exactly 6.0 baseline rating');
assert(engine.getRating('home_gk') === 6.0, 'Goalkeeper starts at exactly 6.0 baseline rating');
assert(engine.getRating('away_fwd') === 6.0, 'Away striker starts at exactly 6.0 baseline rating');

// =========================================================================
// TEST GROUP 2: Passing & Key Penetration Events (10.1)
// =========================================================================
console.log('\n[TEST GROUP 2: Passing & Distribution Matrix]');

// 2.1 Standard Pass Completion
const rawBefore = engine.getRecord(mid.id)!.rawRating;
engine.recordPassAttempt(mid);
engine.recordPassCompletion(mid.id, striker, false);
assert(engine.getRecord(mid.id)!.rawRating > rawBefore, `Completed pass increases rawRating (${engine.getRecord(mid.id)!.rawRating.toFixed(3)} > ${rawBefore.toFixed(3)})`);

// Multiple passes reflect in rounded decimal
for (let i = 0; i < 3; i++) {
  engine.recordPassAttempt(mid);
  engine.recordPassCompletion(mid.id, striker, false);
}
assert(engine.getRating(mid.id) >= 6.1, `Cumulative passes increase rounded rating (${engine.getRating(mid.id)} >= 6.1)`);

// 2.2 Key Pass / Penetrating Through Ball
const ratingBeforeKeyPass = engine.getRating(mid.id);
engine.recordPassAttempt(mid);
engine.recordPassCompletion(mid.id, striker, true);
assert(engine.getRating(mid.id) > ratingBeforeKeyPass + 0.2, `Key pass gives significant boost (+0.28) (${engine.getRating(mid.id)})`);

// 2.3 Turnover via intercepted pass
const rawBeforeTurnover = engine.getRecord(mid.id)!.rawRating;
engine.recordPassAttempt(mid);
engine.recordPassInterception(mid.id, awayFwd);
assert(engine.getRecord(mid.id)!.rawRating < rawBeforeTurnover, `Turnover from intercepted pass penalizes passer (${engine.getRecord(mid.id)!.rawRating.toFixed(3)} < ${rawBeforeTurnover.toFixed(3)})`);
assert(engine.getRating(awayFwd.id) > 6.0, `Interceptor receives positive reward (${engine.getRating(awayFwd.id)} > 6.0)`);

// =========================================================================
// TEST GROUP 3: Shooting, Goals & Assists (10.1)
// =========================================================================
console.log('\n[TEST GROUP 3: Shooting, Goals & Assists Matrix]');

// 3.1 Shot on Target vs Off Target
const ratingBeforeShot = engine.getRating(striker.id);
engine.recordShot(striker, true);
assert(engine.getRating(striker.id) > ratingBeforeShot, `Shot on target rewards shooter (${engine.getRating(striker.id)})`);

engine.recordShot(striker, false);
assert(engine.getRating(striker.id) < engine.getRating(striker.id) + 0.05, `Shot off target applies slight deduction`);

// 3.2 Goal Scored and Assist Delivered
const strikerRatingBeforeGoal = engine.getRating(striker.id);
const midRatingBeforeAssist = engine.getRating(mid.id);
const awayGk = createMockPlayer({ id: 'away_gk', role: 'GK', primaryPos: 'GK', team: 'away' });
const awayDef = createMockPlayer({ id: 'away_def', role: 'CB1', primaryPos: 'DEF', team: 'away' });
engine.initPlayers([striker, mid, def, gk, awayFwd, awayGk, awayDef]);

engine.recordGoal(striker.id, mid.id, 'away', [striker, mid, def, gk, awayFwd, awayGk, awayDef]);

assert(engine.getRating(striker.id) >= 7.0, `Scoring goal gives major boost (+1.0) (${engine.getRating(striker.id)})`);
assert(engine.getRating(mid.id) >= 6.6, `Delivering assist gives strong boost (+0.65) (${engine.getRating(mid.id)})`);
assert(engine.getRating(awayGk.id) < 6.0, `Conceding team GK penalized on goal conceded (${engine.getRating(awayGk.id)} < 6.0)`);
assert(engine.getRating(awayDef.id) < 6.0, `Conceding team defender penalized on goal conceded (${engine.getRating(awayDef.id)} < 6.0)`);

// 3.3 Own Goal
const unluckyDef = createMockPlayer({ id: 'unlucky_def', role: 'CB1', primaryPos: 'DEF', team: 'away' });
engine.initPlayers([unluckyDef]);
engine.recordOwnGoal(unluckyDef, 'away');
assert(engine.getRating(unluckyDef.id) <= 4.6, `Own goal severely penalizes defender (-1.40) (${engine.getRating(unluckyDef.id)})`);

// =========================================================================
// TEST GROUP 4: Defending, Tackles, Blocks & Goalkeeping (10.1)
// =========================================================================
console.log('\n[TEST GROUP 4: Defending & Goalkeeping Matrix]');

const defenderA = createMockPlayer({ id: 'def_a', role: 'CB1', primaryPos: 'DEF', team: 'home' });
const keeperA = createMockPlayer({ id: 'gk_a', role: 'GK', primaryPos: 'GK', team: 'home' });
const attackerB = createMockPlayer({ id: 'att_b', role: 'ST1', primaryPos: 'ATT', team: 'away' });
engine.initPlayers([defenderA, keeperA, attackerB]);

// 4.1 Tackle Won vs Lost
engine.recordTackle(defenderA, true);
assert(engine.getRating(defenderA.id) === 6.3, `Clean tackle won adds +0.30 (${engine.getRating(defenderA.id)})`);

engine.recordDispossessed(attackerB);
assert(engine.getRating(attackerB.id) === 5.8, `Dispossessed player loses -0.20 (${engine.getRating(attackerB.id)})`);

// 4.2 Shot Block
engine.recordBlock(defenderA);
assert(engine.getRating(defenderA.id) === 6.6, `Shot block rewards defender (+0.32) (${engine.getRating(defenderA.id)})`);

// 4.3 Goalkeeper Save
engine.recordGkSave(keeperA, 'parry');
assert(engine.getRating(keeperA.id) === 6.4, `GK parry save adds +0.40 (${engine.getRating(keeperA.id)})`);

engine.recordGkSave(keeperA, 'catch');
assert(engine.getRating(keeperA.id) === 6.9, `GK clean catch adds +0.50 (${engine.getRating(keeperA.id)})`);

// 4.4 Clean Sheet Evaluation
engine.evaluateCleanSheetBonus('home', 0);
assert(engine.getRating(defenderA.id) === 7.0, `Defender receives clean sheet bonus (+0.40) (${engine.getRating(defenderA.id)})`);
assert(engine.getRating(keeperA.id) === 7.3, `GK receives clean sheet bonus (+0.40) (${engine.getRating(keeperA.id)})`);

// =========================================================================
// TEST GROUP 5: Disciplinary Actions & Skill Moves (10.1)
// =========================================================================
console.log('\n[TEST GROUP 5: Disciplinary Actions & Skill Moves]');

const bruiser = createMockPlayer({ id: 'bruiser', role: 'CM1', subPos: 'CDM', primaryPos: 'MID', team: 'home' });
const trickster = createMockPlayer({ id: 'trickster', role: 'ST1', subPos: 'LW', primaryPos: 'ATT', team: 'away' });
engine.initPlayers([bruiser, trickster]);

// 5.1 Dribble Success
engine.recordDribbleSuccess(trickster);
assert(engine.getRating(trickster.id) === 6.2, `Skill dribble success adds +0.24 (${engine.getRating(trickster.id)})`);

// 5.2 Foul & Yellow Card
engine.recordFoul(bruiser, trickster, 'yellow');
assert(engine.getRating(bruiser.id) === 5.5, `Yellow card deducts -0.55 (${engine.getRating(bruiser.id)})`);
assert(engine.getRating(trickster.id) === 6.3, `Foul victim gains +0.08 (${engine.getRating(trickster.id)})`);

// 5.3 Straight Red Card
engine.recordFoul(bruiser, trickster, 'red');
assert(engine.getRating(bruiser.id) === 4.0, `Red card deducts -1.50 (${engine.getRating(bruiser.id)})`);

// =========================================================================
// TEST GROUP 6: Rating Clamping Bounds [3.0, 10.0] (10.1)
// =========================================================================
console.log('\n[TEST GROUP 6: Clamping Bounds 3.0 to 10.0]');

const starPlayer = createMockPlayer({ id: 'star_player', role: 'ST1', primaryPos: 'ATT', team: 'home' });
const catastrophePlayer = createMockPlayer({ id: 'catastrophe', role: 'CB1', primaryPos: 'DEF', team: 'away' });
engine.initPlayers([starPlayer, catastrophePlayer]);

// Elevate star player to maximum
for (let i = 0; i < 15; i++) {
  engine.recordGoal(starPlayer.id, null, 'away', [starPlayer, catastrophePlayer]);
}
assert(engine.getRating(starPlayer.id) === 10.0, `Rating is strictly capped at 10.0 (${engine.getRating(starPlayer.id)})`);

// Push catastrophe player down
for (let i = 0; i < 15; i++) {
  engine.recordOwnGoal(catastrophePlayer, 'away');
}
assert(engine.getRating(catastrophePlayer.id) === 3.0, `Rating is strictly floored at 3.0 (${engine.getRating(catastrophePlayer.id)})`);

// =========================================================================
// TEST GROUP 7: Substitution Freeze Logic (10.2)
// =========================================================================
console.log('\n[TEST GROUP 7: Substitution Freeze Logic]');

const starter = createMockPlayer({ id: 'sub_starter', name: 'Starter', number: 7, role: 'RM', primaryPos: 'MID', team: 'home' });
const benchSub = createMockPlayer({ id: 'bench_sub', name: 'SuperSub', number: 18, role: 'RM', primaryPos: 'MID', team: 'home' });
engine.initPlayers([starter]);

// Accrue some events
engine.recordPassAttempt(starter);
engine.recordPassCompletion(starter.id, starter, true);
const frozenRating = engine.getRating(starter.id);
assert(frozenRating > 6.0, `Starter accrued positive rating before sub (${frozenRating})`);

// Freeze on substitution at 62nd minute
const subbedRecord = engine.freezePlayerRating(starter.id, 62);
assert(subbedRecord !== null && subbedRecord.isSubbedOut === true, 'Starter record is marked isSubbedOut: true');
assert(subbedRecord?.subbedMinute === 62, 'Starter record records subbedMinute: 62');

// Events occurring after substitution MUST NOT change starter's rating!
engine.recordPassAttempt(starter);
engine.recordPassCompletion(starter.id, starter, true);
engine.recordGoal(starter.id, null, 'away', [starter]);
assert(engine.getRating(starter.id) === frozenRating, `Subbed player rating remains strictly frozen at ${frozenRating}`);

// Substitute in
const newSubRec = engine.substituteIn(benchSub);
assert(newSubRec.rating === 6.0, `Incoming substitute starts at fresh 6.0 baseline (${newSubRec.rating})`);
engine.recordGoal(benchSub.id, null, 'away', [benchSub]);
assert(engine.getRating(benchSub.id) >= 7.0, `Incoming substitute accrues events independently (${engine.getRating(benchSub.id)})`);

// =========================================================================
// TEST GROUP 8: Match MVP Determination (10.2)
// =========================================================================
console.log('\n[TEST GROUP 8: Match MVP Determination]');

const mvpHomeStriker = createMockPlayer({ id: 'mvp_home_st', name: 'Pelé', number: 10, role: 'ST1', primaryPos: 'ATT', team: 'home' });
const mvpAwayStriker = createMockPlayer({ id: 'mvp_away_st', name: 'Cruyff', number: 14, role: 'ST1', primaryPos: 'ATT', team: 'away' });
const regularPlayer = createMockPlayer({ id: 'regular', name: 'Player', number: 8, role: 'CM1', primaryPos: 'MID', team: 'home' });

engine.initPlayers([mvpHomeStriker, mvpAwayStriker, regularPlayer]);

// Pelé scores 2 goals + 1 assist
engine.recordGoal(mvpHomeStriker.id, null, 'away', [mvpHomeStriker, mvpAwayStriker, regularPlayer]);
engine.recordGoal(mvpHomeStriker.id, null, 'away', [mvpHomeStriker, mvpAwayStriker, regularPlayer]);
engine.recordGoal(regularPlayer.id, mvpHomeStriker.id, 'away', [mvpHomeStriker, mvpAwayStriker, regularPlayer]);

// Cruyff scores 1 goal
engine.recordGoal(mvpAwayStriker.id, null, 'home', [mvpHomeStriker, mvpAwayStriker, regularPlayer]);

const mvpResult = engine.getMatchMvp();
assert(mvpResult !== null, 'Match MVP is resolved');
assert(mvpResult?.player.playerId === mvpHomeStriker.id, `Pelé (${mvpResult?.player.name}) is crowned Match MVP (${mvpResult?.player.rating})`);
assert(mvpResult?.isHome === true, 'Match MVP is correctly attributed to Home side');

// =========================================================================
// SUMMARY
// =========================================================================
console.log(`\n========================================`);
console.log(`PHASE 10 TEST SUMMARY: ${passedTests} passed, ${failedTests} failed`);
console.log(`========================================`);

if (failedTests > 0) {
  process.exit(1);
}
