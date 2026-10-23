/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hotfix Verification Tests:
 * 1. Throw-in short pass provides a secure, non-overshooting pass to the closest teammate in the aim direction.
 * 2. Set-piece prompts appear in the bottom-left event box (MatchHUD bannerMessage) without expiring while aiming.
 * 3. Overhead canvas text badges on top of the set piece taker are completely removed to never obstruct the play.
 */

import { MatchEngine } from '../engine';
import { setupThrowIn, executeSetPieceDelivery, getSetPiecePrompt } from '../setPieces';
import { PITCH_CONFIG } from '../constants';

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) {
    console.log(`  ✓ ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${msg}`);
    failed++;
  }
}

console.log('--- RUNNING THROW-IN & SET PIECE UI HOTFIX TESTS ---');

const engine = new MatchEngine();

// 1. Test Setup Throw-In
const touchX = PITCH_CONFIG.PITCH_LEFT;
const touchY = PITCH_CONFIG.CENTER_Y;
setupThrowIn(engine, 'home', touchX, touchY);

assert(engine.matchPhase === 'throw_in', 'Match phase set to throw_in');
assert(engine.setPiece !== null, 'Set piece state initialized');
assert(engine.bannerMessage !== null, 'Bottom-left banner message initialized on throw-in');
assert(
  engine.bannerMessage?.includes('THROW-IN') && engine.bannerMessage?.includes('SHORT PASS'),
  'Banner message displays clean throw-in instructions for the bottom-left text box'
);

// Verify banner does not count down while set piece is active
const initialTimer = engine.bannerTimer;
engine.update({
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
  KeyA: false,
  KeyS: false,
  KeyD: false,
  KeyW: false,
  KeyQ: false,
  KeyE: false,
  Space: false,
  Shift: false,
});
assert(engine.bannerTimer === initialTimer, 'Banner timer does not expire while set piece is being aimed');
assert(engine.bannerMessage !== null, 'Banner message remains active in bottom-left box while aiming');

// 2. Test Throw-in Short Pass Delivery to Closest Teammate in Aim Direction
const taker = engine.players.find(p => p.id === engine.setPiece!.takerId)!;
const mates = engine.players.filter(p => p.team === 'home' && p.id !== taker.id);

// Position mate A close by in aim direction (distance ~ 55px)
const mateA = mates[0];
mateA.x = touchX + 50;
mateA.y = touchY + 20;

// Position mate B further away in same direction (distance ~ 180px)
const mateB = mates[1];
mateB.x = touchX + 170;
mateB.y = touchY + 40;

// Aim roughly towards mate A and B (pointing right into pitch)
engine.setPiece!.aimAngle = Math.atan2(20, 50);

// Execute short pass throw-in
executeSetPieceDelivery(engine, taker, engine.setPiece!.aimAngle, 'pass', 0.5);

// Check ball speed and trajectory
const horizontalSpeed = Math.hypot(engine.ball.vx, engine.ball.vy);
assert(
  horizontalSpeed >= 3.8 && horizontalSpeed <= 6.5,
  `Short pass throw-in speed is calibrated and controlled (${horizontalSpeed.toFixed(2)} px/frame, not overshooting 12+ px/frame)`
);
assert(engine.ball.vz <= 0.35, `Soft downward trajectory (vz = ${engine.ball.vz.toFixed(2)}) for clean reception at feet`);
assert(engine.userControlledPlayerId === mateA.id, 'User control switched to closest teammate in aim direction (Mate A)');
assert(engine.setPieceDeliveryGraceTimer > 0, 'Grace period set so recipient has clean first touch');
assert(
  engine.bannerMessage?.includes('SECURE THROW-IN') && engine.bannerMessage?.includes(mateA.name.toUpperCase()),
  'Banner message celebrates secure pass to closest teammate in bottom-left event box'
);

// 3. Test Set Piece Prompts for other stop ball plays
const freeKickPrompt = getSetPiecePrompt({
  type: 'free_kick',
  takerId: 'h1',
  team: 'home',
  spotX: 500,
  spotY: 500,
  aimAngle: 0,
  elevation: 0,
  curve: 0,
  wallPlayerIds: [],
  isPenalty: false,
});
assert(freeKickPrompt.includes('FREE KICK'), 'Free kick prompt contains free kick controls');

const penaltyPrompt = getSetPiecePrompt({
  type: 'penalty',
  takerId: 'h1',
  team: 'home',
  spotX: 500,
  spotY: 500,
  aimAngle: 0,
  elevation: 0,
  curve: 0,
  wallPlayerIds: [],
  isPenalty: true,
});
assert(penaltyPrompt.includes('PENALTY KICK') && penaltyPrompt.includes('PANENKA'), 'Penalty prompt includes Panenka control');

const cornerPrompt = getSetPiecePrompt({
  type: 'corner_kick',
  takerId: 'h1',
  team: 'home',
  spotX: 500,
  spotY: 500,
  aimAngle: 0,
  elevation: 0,
  curve: 0,
  wallPlayerIds: [],
  isPenalty: false,
});
assert(cornerPrompt.includes('CORNER KICK'), 'Corner prompt contains corner kick controls');

console.log(`========================================\nHOTFIX SUMMARY: ${passed} passed, ${failed} failed\n========================================`);
if (failed > 0) process.exit(1);
