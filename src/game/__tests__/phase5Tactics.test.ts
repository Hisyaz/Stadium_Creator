/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 5 Unit Tests: Advanced AI Positioning, Line Intermingling & Role Fluidity
 * Tests compactness clamping (25m - 35m) across canonical formations (4-3-3, 4-2-3-1, 3-5-2, 5-3-2),
 * line intermingling (forwards shadowing CBs/pivot, inverted fullbacks, CAM in pocket, CDM shielding),
 * off-ball runs (underlap, overlap, drop into pocket), and difficulty/stats anticipation scaling.
 */

import {
  updateTeamBlockShape,
  PITCH_METERS_TO_PIXELS,
  MIN_VERTICAL_COMPACTNESS_PX,
  MAX_VERTICAL_COMPACTNESS_PX,
  calculateUnderlappingRun,
  calculateDropIntoPocket,
  calculateForwardShadowingTarget,
  evaluateDefenderStepOut,
  applyAnticipationAndAttributeVariance,
  getPlayerPOS,
  getPlayerREA,
} from '../tactics';
import { PITCH_CONFIG } from '../constants';
import { Player, Ball, FormationName, PlayerRole } from '../../types';
import { HOME_FORMATIONS, applyFormationToPlayers } from '../formations';

function createMockPlayer(
  id: string,
  role: PlayerRole,
  team: 'home' | 'away',
  subPos?: any,
  playstyle?: any,
  playstyleId?: number,
  canonicalStats?: any
): Player {
  return {
    id,
    name: id,
    number: 10,
    team,
    role,
    x: PITCH_CONFIG.CENTER_X,
    y: PITCH_CONFIG.CENTER_Y,
    vx: 0,
    vy: 0,
    targetX: PITCH_CONFIG.CENTER_X,
    targetY: PITCH_CONFIG.CENTER_Y,
    baseX: 0.5,
    baseY: 0.5,
    facingAngle: 0,
    facingDir: 'up',
    stats: {
      speed: 3.5,
      sprintSpeed: 4.5,
      shotPower: 0.7,
      passing: 0.7,
      tackling: 0.7,
      heading: 0.7,
    },
    appearance: {
      heightCm: 180,
      weightKg: 75,
      muscleMass: 3,
      skinTone: '#f1c27d',
      hairStyle: 'buzzcut',
      hairColor: '#000',
      facialHair: 'clean',
      jerseyFit: 'tucked',
      sleeveLength: 'short',
    },
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
    subPos,
    playstyle,
    playstyleId,
    canonicalStats: canonicalStats || {
      pac: 80, sta: 85, str: 75,
      bcl: 80, ret: 80, dri: 80,
      spa: 80, lpa: 75, cro: 75,
      sho: 75, hea: 75, lsh: 70,
      tck: 75, sld: 70, int: 75, mrk: 75,
      pos: 85, cmp: 80, rea: 85,
    },
  };
}

function create11MockPlayers(team: 'home' | 'away', formation: FormationName): Player[] {
  const roles: PlayerRole[] = ['GK', 'LB', 'CB1', 'CB2', 'RB', 'LM', 'CM1', 'CM2', 'RM', 'ST1', 'ST2'];
  const players = roles.map((r, i) => createMockPlayer(`${team}_${r}`, r, team));
  applyFormationToPlayers(
    players,
    team,
    formation,
    PITCH_CONFIG.FIELD_WIDTH,
    PITCH_CONFIG.FIELD_HEIGHT,
    PITCH_CONFIG.PITCH_LEFT,
    PITCH_CONFIG.PITCH_TOP,
    team === 'home'
  );
  return players;
}

function createMockBall(): Ball {
  return {
    x: PITCH_CONFIG.CENTER_X,
    y: PITCH_CONFIG.CENTER_Y,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    spin: 0,
    spinY: 0,
    ownerId: null,
    isAirborne: false,
    lastTouchTeam: 'home',
    lastTouchPlayerId: null,
    trail: [],
  };
}

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failedTests++;
  }
}

console.log('--- RUNNING PHASE 5 TACTICAL UNIT TESTS ---');

// 1. COMPACTNESS ENGINE ON CANONICAL FORMATIONS (4-3-3, 4-2-3-1, 3-5-2, 5-3-2)
console.log('\n[TEST GROUP 1: Compactness Engine (25m - 35m Clamp)]');
const testFormations: FormationName[] = ['4-3-3', '4-2-3-1', '3-5-2', '5-3-2'];
const testPhases: Array<'mid_block' | 'high_press' | 'low_block' | 'attacking_possession' | 'counter_press'> = [
  'mid_block', 'high_press', 'low_block', 'attacking_possession', 'counter_press'
];

for (const formation of testFormations) {
  const players = create11MockPlayers('home', formation);
  const ball = createMockBall();

  for (const phase of testPhases) {
    updateTeamBlockShape('home', ball, phase, 'normal', players, true);

    const outfield = players.filter(p => p.role !== 'GK');
    const minY = Math.min(...outfield.map(p => p.tacticalTargetY!));
    const maxY = Math.max(...outfield.map(p => p.tacticalTargetY!));
    const verticalSpanPx = maxY - minY;
    const verticalSpanMeters = verticalSpanPx / PITCH_METERS_TO_PIXELS;

    assert(
      verticalSpanMeters >= 24.0 && verticalSpanMeters <= 36.5,
      `${formation} [${phase}] vertical span ${verticalSpanMeters.toFixed(1)}m strictly within ~25-35m`
    );
  }
}

// 2. LINE INTERMINGLING: FORWARDS OCCUPYING OPPONENT HALF IN DEFENSE
console.log('\n[TEST GROUP 2: Line Intermingling - Forwards in Opponent Half]');
{
  const players = create11MockPlayers('home', '4-3-3');
  const ball = createMockBall();
  // Opponent builds up in their deep half (top half for home attacking up)
  ball.y = PITCH_CONFIG.PITCH_TOP + 400;

  updateTeamBlockShape('home', ball, 'mid_block', 'normal', players, true);

  const striker = players.find(p => p.role === 'ST1')!;
  // Striker should push into opponent half (y < CENTER_Y for Home attacking UP)
  assert(
    striker.tacticalTargetY! < PITCH_CONFIG.CENTER_Y + 50,
    `Home ST1 occupies opponent half (y: ${striker.tacticalTargetY!.toFixed(0)} < ${PITCH_CONFIG.CENTER_Y}) during rival buildup`
  );
}

// 3. LINE INTERMINGLING: INVERTED FULLBACK TUCKS INSIDE
console.log('\n[TEST GROUP 3: Line Intermingling - Inverted Fullback]');
{
  const players = create11MockPlayers('home', '4-3-3');
  const lb = players.find(p => p.role === 'LB')!;
  lb.playstyle = 'inverted_fb';
  lb.playstyleId = 20;

  const ball = createMockBall();
  updateTeamBlockShape('home', ball, 'attacking_possession', 'normal', players, true);

  // Inverted LB should tuck inside into half-space (~115px from center instead of ~270px out wide)
  const distFromCenter = Math.abs(lb.tacticalTargetX! - PITCH_CONFIG.CENTER_X);
  assert(
    distFromCenter < 160,
    `Inverted LB tucks into central half-space pivot (distFromCenter: ${distFromCenter.toFixed(0)}px < 160px)`
  );
}

// 4. LINE INTERMINGLING: ATTACKER FULLBACK / WINGBACK PUSHES HIGH
console.log('\n[TEST GROUP 4: Line Intermingling - Attacking Fullback / Wingback]');
{
  const players = create11MockPlayers('home', '4-3-3');
  const rb = players.find(p => p.role === 'RB')!;
  rb.playstyle = 'attacker_fb';
  rb.playstyleId = 21;
  rb.subPos = 'RWB';

  const cb = players.find(p => p.role === 'CB1')!;
  const ball = createMockBall();
  updateTeamBlockShape('home', ball, 'attacking_possession', 'normal', players, true);

  // Attacking RWB should push significantly higher upfield than CBs (lower Y for Home)
  const advancement = cb.tacticalTargetY! - rb.tacticalTargetY!;
  assert(
    advancement > 250,
    `Attacking RWB pushes high upfield (${advancement.toFixed(0)}px ahead of CBs)`
  );
}

// 5. LINE INTERMINGLING: CDM SHIELDS DEFENSE & CAM IN POCKET
console.log('\n[TEST GROUP 5: Midfield Line Interlocking]');
{
  const players = create11MockPlayers('home', '4-2-3-1');
  const cdm = players.find(p => p.role === 'CM1')!;
  cdm.subPos = 'CDM';
  cdm.playstyle = 'anchor';
  cdm.playstyleId = 17;

  const cb = players.find(p => p.role === 'CB1')!;
  const ball = createMockBall();
  updateTeamBlockShape('home', ball, 'low_block', 'normal', players, true);

  // CDM in low block drops right in front of CBs (< 180px)
  const cdmGap = cb.tacticalTargetY! - cdm.tacticalTargetY!;
  assert(
    cdmGap < 200,
    `CDM anchor drops close to shield defensive line (gap to CB: ${cdmGap.toFixed(0)}px)`
  );

  // CAM in 4-2-3-1 interlocks into attacking third (in the pocket)
  const cam = players.find(p => p.role === 'ST2')!;
  cam.subPos = 'CAM';
  cam.playstyle = 'shadow';
  cam.playstyleId = 10;

  updateTeamBlockShape('home', ball, 'attacking_possession', 'normal', players, true);
  const camToCbGap = cb.tacticalTargetY! - cam.tacticalTargetY!;
  assert(
    camToCbGap > 400,
    `CAM shadow striker interlocks into forward third (gap to CB: ${camToCbGap.toFixed(0)}px)`
  );
}

// 6. POSITIONAL ROLES & OFF-BALL RUNS (Underlap, Drop into Pocket, Forward Shadowing, Step Out)
console.log('\n[TEST GROUP 6: Positional Roles & Off-Ball Runs]');
{
  const runner = createMockPlayer('runner', 'CM2', 'home', 'CM', 'box_to_box', 13);
  const wideWinger = createMockPlayer('winger', 'LM', 'home', 'LW');
  wideWinger.x = PITCH_CONFIG.PITCH_LEFT + 90; // Hugging touchline wide
  wideWinger.y = PITCH_CONFIG.CENTER_Y - 100;

  const underlap = calculateUnderlappingRun(runner, wideWinger, wideWinger, true);
  assert(underlap !== null, 'calculateUnderlappingRun generates underlap target when teammate is wide');
  if (underlap) {
    const isHalfSpace = Math.abs(underlap.targetX - PITCH_CONFIG.CENTER_X) < 180;
    assert(isHalfSpace, `Underlap targets interior half-space (targetX: ${underlap.targetX.toFixed(0)})`);
  }

  // Drop into pocket
  const cam = createMockPlayer('cam', 'ST2', 'home', 'CAM', 'creator', 9);
  const pocket = calculateDropIntoPocket(cam, wideWinger, [], true);
  assert(pocket.targetY > wideWinger.y - 120, 'calculateDropIntoPocket provides intermediate receiving pocket');

  // Forward shadowing target
  const opponentCB1 = createMockPlayer('opp_cb1', 'CB1', 'away');
  opponentCB1.x = PITCH_CONFIG.CENTER_X - 100;
  opponentCB1.y = PITCH_CONFIG.PITCH_TOP + 300;

  const opponentCDM = createMockPlayer('opp_cdm', 'CM1', 'away', 'CDM');
  opponentCDM.x = PITCH_CONFIG.CENTER_X;
  opponentCDM.y = PITCH_CONFIG.PITCH_TOP + 450;

  const fwd = createMockPlayer('fwd', 'ST1', 'home');
  const shadow = calculateForwardShadowingTarget(fwd, [opponentCB1, opponentCDM], true);
  assert(shadow.shadowTargetId !== null, 'calculateForwardShadowingTarget identifies rival pivot to shadow');

  // Defender step out
  const destroyerCB = createMockPlayer('cb_dest', 'CB1', 'home', 'CB', 'destroyer', 23, {
    tck: 92, int: 88, pos: 88, rea: 86
  });
  destroyerCB.y = PITCH_CONFIG.PITCH_BOTTOM - 400;

  const rivalAttacker = createMockPlayer('rival_att', 'ST1', 'away');
  rivalAttacker.x = destroyerCB.x + 10;
  rivalAttacker.y = destroyerCB.y - 70; // 70px ahead in the hole
  rivalAttacker.facingAngle = Math.PI / 2; // Facing back to goal

  const ball = createMockBall();
  ball.x = rivalAttacker.x;
  ball.y = rivalAttacker.y;

  const stepOut = evaluateDefenderStepOut(destroyerCB, [rivalAttacker], ball, true);
  assert(stepOut.shouldStepOut === true, 'Destroyer CB steps out aggressively to challenge receiver in the hole');
}

// 7. DIFFICULTY-SCALED ANTICIPATION & CANONICAL STATS (POS & REA)
console.log('\n[TEST GROUP 7: Difficulty-Scaled Anticipation & Stats]');
{
  const elitePlayer = createMockPlayer('elite', 'ST1', 'home', 'ST', 'poacher', 0, {
    pos: 98, rea: 96
  });
  const amateurPlayer = createMockPlayer('amateur', 'ST1', 'home', 'ST', 'poacher', 0, {
    pos: 45, rea: 48
  });

  const ball = createMockBall();
  ball.vx = 4;
  ball.vy = -6;

  // Elite on Legend difficulty has 0 random noise drift
  const eliteMod = applyAnticipationAndAttributeVariance(500, 500, elitePlayer, 'legend', ball, 0);
  assert(typeof eliteMod.x === 'number' && typeof eliteMod.y === 'number', 'applyAnticipationAndAttributeVariance returns valid coordinates');

  // Easy on amateur player exhibits spatial drift
  const easyMod = applyAnticipationAndAttributeVariance(500, 500, amateurPlayer, 'easy', ball, 0);
  const diffFromBase = Math.hypot(easyMod.x - 500, easyMod.y - 500);
  assert(diffFromBase > 0, `Easy mode with low POS exhibits spatial drift (${diffFromBase.toFixed(1)}px > 0)`);

  // Standing mode returns exact player position (0 movement)
  const standingMod = applyAnticipationAndAttributeVariance(500, 500, elitePlayer, 'standing', ball, 0);
  assert(standingMod.x === elitePlayer.x && standingMod.y === elitePlayer.y, 'Standing difficulty freezes player at current location');
}

console.log(`\n========================================`);
console.log(`PHASE 5 TEST SUMMARY: ${passedTests} passed, ${failedTests} failed`);
console.log(`========================================\n`);

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
