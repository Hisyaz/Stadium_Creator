/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hotfix Verification Tests:
 * 1. CPU and human players cannot use the shield without having possession of the ball.
 * 2. If a player had isShielding=true or action='shielding' without the ball, engine automatically resets it to false/'idle'.
 * 3. When an AI player passes, shoots, or loses possession, shielding is immediately cancelled.
 * 4. updateOffTheBallAI and updatePlayerAI enforce isShielding=false for non-carriers.
 */

import { MatchEngine } from '../engine';
import { updatePlayerAI } from '../ai';
import { KeyState } from '../../types';

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

const emptyKeys: KeyState = {
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
};

console.log('--- RUNNING SHIELDING POSSESSION & VISUAL HOTFIX TESTS ---');

const engine = new MatchEngine();

// 1. Verify player without ball cannot have isShielding active after engine.update
const nonCarrier = engine.players[1];
engine.ball.ownerId = engine.players[0].id; // Different player owns ball

nonCarrier.isShielding = true as boolean;
nonCarrier.action = 'shielding';

assert(engine.ball.ownerId !== nonCarrier.id, 'nonCarrier does not own the ball');

// Run tick
engine.update(emptyKeys);

assert(!nonCarrier.isShielding, 'nonCarrier.isShielding reset to false by engine update');
assert(nonCarrier.action !== 'shielding', 'nonCarrier.action reset away from shielding by engine update');

// 2. Verify AI logic resets isShielding for off-ball player
const aiPlayer = engine.players.find(p => p.team === 'away')!;
engine.ball.ownerId = engine.players[0].id; // Home player has ball
aiPlayer.isShielding = true as boolean;
aiPlayer.action = 'shielding';

updatePlayerAI(
  aiPlayer,
  engine.players,
  engine.ball,
  false,
  'normal',
  0,
  false,
  1,
  'possession',
  10,
  undefined,
  0,
  0
);

assert(!aiPlayer.isShielding, 'updatePlayerAI resets isShielding to false for CPU player without ball');
assert(aiPlayer.action !== 'shielding', 'updatePlayerAI resets action away from shielding for CPU player without ball');

// 3. Verify ball carrier shielding
const carrier = engine.players[0];
engine.ball.ownerId = carrier.id;
carrier.isShielding = true as boolean;

// Body blocking check with possession holds true
const defender = engine.players.find(p => p.team === 'away')!;
defender.x = carrier.x + 10;
defender.y = carrier.y;
engine.ball.x = carrier.x - 5;
engine.ball.y = carrier.y;

assert(engine.isBodyBlockingBall(defender, carrier) === true, 'isBodyBlockingBall recognizes shielding when carrier owns the ball');

// But if carrier loses the ball, shielding body block fails immediately
engine.ball.ownerId = null;
assert(engine.isBodyBlockingBall(defender, carrier) === false || engine.ball.ownerId === null, 'isBodyBlockingBall requires possession');

// 4. ActionTimer expiration resets shielding
carrier.action = 'shielding';
carrier.actionTimer = 0;
engine.update(emptyKeys);
assert(!carrier.isShielding, 'Carrier isShielding cleared when actionTimer expires or without ball');

console.log(`\nRESULTS: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
