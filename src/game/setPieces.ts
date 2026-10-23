import { Player, Ball, SetPieceState, KeyState, TeamSide } from '../types';
import { PITCH_CONFIG, HOME_KIT, AWAY_KIT } from './constants';
import { audio } from './audio';
import { t } from './i18n';
import type { MatchEngine } from './engine';

/**
 * Checks if a coordinate is inside the defending team's penalty box
 */
export function isInsideDefendingPenaltyBox(x: number, y: number, isAttackingUp: boolean): boolean {
  const boxLeft = PITCH_CONFIG.CENTER_X - PITCH_CONFIG.PENALTY_BOX_WIDTH / 2;
  const boxRight = PITCH_CONFIG.CENTER_X + PITCH_CONFIG.PENALTY_BOX_WIDTH / 2;

  if (isAttackingUp) {
    // Defending team's box is at the top of the pitch
    return x >= boxLeft && x <= boxRight && y >= PITCH_CONFIG.PITCH_TOP && y <= PITCH_CONFIG.PITCH_TOP + PITCH_CONFIG.PENALTY_BOX_HEIGHT;
  } else {
    // Defending team's box is at the bottom of the pitch
    return x >= boxLeft && x <= boxRight && y >= PITCH_CONFIG.PITCH_BOTTOM - PITCH_CONFIG.PENALTY_BOX_HEIGHT && y <= PITCH_CONFIG.PITCH_BOTTOM;
  }
}

/**
 * Phase 13: Authoritative Set-Piece Role Specialist Assignment (Section 13.4)
 */
function getAssignedSetPieceTaker(
  engine: MatchEngine,
  attackingTeam: TeamSide,
  roleType: 'penalty' | 'freeKickNear' | 'freeKickLong' | 'leftCorner' | 'rightCorner'
): Player {
  const teamDef = attackingTeam === 'home' ? (engine as any).homeTeam : (engine as any).awayTeam;
  if (teamDef && teamDef.roles) {
    let assignedId = '';
    if (roleType === 'penalty') assignedId = teamDef.roles.penaltyTakerId;
    else if (roleType === 'freeKickNear') assignedId = teamDef.roles.freeKickNearId;
    else if (roleType === 'freeKickLong') assignedId = teamDef.roles.freeKickLongId;
    else if (roleType === 'leftCorner') assignedId = teamDef.roles.leftCornerTakerId;
    else if (roleType === 'rightCorner') assignedId = teamDef.roles.rightCornerTakerId;

    if (assignedId) {
      const match = engine.players.find(
        p => p.team === attackingTeam && !p.isRedCarded && (
          p.id === assignedId ||
          p.id.endsWith(assignedId) ||
          p.name.toLowerCase().includes(assignedId.toLowerCase())
        )
      );
      if (match) return match;
    }
  }

  // Fallbacks
  if (roleType === 'penalty') {
    return (
      engine.players.find(p => p.team === attackingTeam && !p.isRedCarded && (p.role === 'ST1' || p.role === 'ST2' || p.isUserControlled)) ||
      engine.players.find(p => p.team === attackingTeam && !p.isRedCarded && p.role !== 'GK')!
    );
  }
  if (roleType === 'leftCorner' || roleType === 'rightCorner') {
    const rolePref = roleType === 'leftCorner' ? 'LM' : 'RM';
    return (
      engine.players.find(p => p.team === attackingTeam && !p.isRedCarded && (p.role === rolePref || p.isUserControlled)) ||
      engine.players.find(p => p.team === attackingTeam && !p.isRedCarded && p.role !== 'GK')!
    );
  }
  return (
    engine.players.find(p => p.team === attackingTeam && !p.isRedCarded && (p.isUserControlled || p.role === 'CM1' || p.role === 'ST1')) ||
    engine.players.find(p => p.team === attackingTeam && !p.isRedCarded && p.role !== 'GK')!
  );
}

/**
 * Sets up a Penalty Kick
 * "add freekicks, and penalties... penalty you can only shoot"
 */
export function setupPenalty(engine: MatchEngine, attackingTeam: TeamSide): void {
  engine.matchPhase = 'penalty';
  engine.phaseTimer = 0;

  const isAttackingUp = attackingTeam === 'home';
  const spotX = PITCH_CONFIG.CENTER_X;
  const spotY = isAttackingUp ? PITCH_CONFIG.PITCH_TOP + 110 : PITCH_CONFIG.PITCH_BOTTOM - 110;

  engine.ball.x = spotX;
  engine.ball.y = spotY;
  engine.ball.z = 0;
  engine.ball.vx = 0;
  engine.ball.vy = 0;
  engine.ball.vz = 0;
  engine.ball.ownerId = null;
  engine.ball.isAirborne = false;

  // Select assigned penalty taker
  const taker = getAssignedSetPieceTaker(engine, attackingTeam, 'penalty');

  const takerAim = isAttackingUp ? -Math.PI / 2 : Math.PI / 2;
  taker.x = spotX;
  taker.y = isAttackingUp ? spotY + 18 : spotY - 18;
  taker.facingAngle = takerAim;
  taker.action = 'penalty_stance';
  taker.actionTimer = 0;

  // Defending Goalkeeper on the goal line with anticipation bounce
  const defendingTeam = attackingTeam === 'home' ? 'away' : 'home';
  const gk = engine.players.find(p => p.team === defendingTeam && p.role === 'GK');
  if (gk) {
    gk.x = PITCH_CONFIG.CENTER_X;
    gk.y = isAttackingUp ? PITCH_CONFIG.PITCH_TOP + 12 : PITCH_CONFIG.PITCH_BOTTOM - 12;
    gk.facingAngle = isAttackingUp ? Math.PI / 2 : -Math.PI / 2;
    gk.action = 'goalkeeper_penalty_anticipate';
    gk.actionTimer = 0;
  }

  // Clear all other players outside the penalty box
  for (const p of engine.players) {
    if (p.id === taker.id || (gk && p.id === gk.id)) continue;
    p.action = 'idle';
    if (isAttackingUp) {
      p.y = Math.max(PITCH_CONFIG.PITCH_TOP + PITCH_CONFIG.PENALTY_BOX_HEIGHT + 24, p.y);
    } else {
      p.y = Math.min(PITCH_CONFIG.PITCH_BOTTOM - PITCH_CONFIG.PENALTY_BOX_HEIGHT - 24, p.y);
    }
  }

  engine.setPiece = {
    type: 'penalty',
    takerId: taker.id,
    team: attackingTeam,
    spotX,
    spotY,
    aimAngle: takerAim,
    elevation: 0,
    curve: 0,
    wallPlayerIds: [],
    isPenalty: true,
  };

  if (attackingTeam === 'home') {
    engine.userControlledPlayerId = taker.id;
    engine.updateUserControlledFlag();
    engine.bannerMessage = '⚡ PENALTY KICK • AIM: ←/→ • HOLD A: SHOOT • E+A: PANENKA';
  } else {
    if (gk) {
      engine.userControlledPlayerId = gk.id;
      engine.updateUserControlledFlag();
    }
    engine.bannerMessage = `PENALTY FOR ${AWAY_KIT.name.toUpperCase()}! DIVE WITH GOALKEEPER!`;
  }
  engine.bannerTimer = 999999;
}

/**
 * Sets up a Free Kick outside the box
 * "add freekicks, and penalties. as well as corners, goalkicks and side throw ins., where you can point and hit/pass"
 */
export function setupFreeKick(engine: MatchEngine, attackingTeam: TeamSide, foulX: number, foulY: number): void {
  engine.matchPhase = 'free_kick';
  engine.phaseTimer = 0;

  const isAttackingUp = attackingTeam === 'home';
  const clampedX = Math.max(PITCH_CONFIG.PITCH_LEFT + 25, Math.min(PITCH_CONFIG.PITCH_RIGHT - 25, foulX));
  const clampedY = Math.max(PITCH_CONFIG.PITCH_TOP + 35, Math.min(PITCH_CONFIG.PITCH_BOTTOM - 35, foulY));

  engine.ball.x = clampedX;
  engine.ball.y = clampedY;
  engine.ball.z = 0;
  engine.ball.vx = 0;
  engine.ball.vy = 0;
  engine.ball.vz = 0;
  engine.ball.ownerId = null;
  engine.ball.isAirborne = false;

  const goalY = isAttackingUp ? PITCH_CONFIG.PITCH_TOP : PITCH_CONFIG.PITCH_BOTTOM;
  const initialAim = Math.atan2(goalY - clampedY, PITCH_CONFIG.CENTER_X - clampedX);
  const distToGoal = Math.hypot(PITCH_CONFIG.CENTER_X - clampedX, goalY - clampedY);
  const isDirect = distToGoal < 300;

  const taker = getAssignedSetPieceTaker(engine, attackingTeam, isDirect ? 'freeKickNear' : 'freeKickLong');

  taker.x = clampedX - Math.cos(initialAim) * 14;
  taker.y = clampedY - Math.sin(initialAim) * 14;
  taker.facingAngle = initialAim;
  taker.action = 'freekick_stance';
  taker.actionTimer = 0;

  if (attackingTeam === 'home') {
    engine.userControlledPlayerId = taker.id;
    engine.updateUserControlledFlag();
  } else {
    // Away team has the kick; ensure user defends with an active Home player
    const userPlayer = engine.players.find(p => p.id === engine.userControlledPlayerId);
    if (!userPlayer || userPlayer.team !== 'home' || userPlayer.isRedCarded) {
      const nearestHome = engine.players.find(p => p.team === 'home' && !p.isRedCarded && p.role !== 'GK');
      if (nearestHome) {
        engine.userControlledPlayerId = nearestHome.id;
        engine.updateUserControlledFlag();
      }
    }
  }

  const defendingTeam = attackingTeam === 'home' ? 'away' : 'home';

  // =========================================================================
  // DYNAMIC TEAMMATE POSITIONING & TACTICAL ADVANTAGE (Phase 9.5 Revamp)
  // Regardless of what the player chooses (Shoot, Cross, Long Pass, Short Pass),
  // teammates dynamically seek space and positions to create tactical superiority:
  // 1. Short pass option: 1 open teammate drops to the side in free space
  // 2. Space runner: 1 teammate moves down the channel/flank for a long pass
  // 3. Crossing targets: 2-3 attackers position inside the penalty box ready for headers/volleys
  // 4. Defensive shape: defenders stay behind the ball
  // 5. Clean shooting lane: Clear ALL teammates out of the direct shot cone to goal!
  // =========================================================================
  const attackingMates = engine.players.filter(
    p => p.team === attackingTeam && p.id !== taker.id && p.role !== 'GK' && !p.isRedCarded
  );

  // 1. Clear immediate corridor in front of the taker and direct line to goal
  for (const m of attackingMates) {
    const d = Math.hypot(m.x - clampedX, m.y - clampedY);
    if (d < 85) {
      const awayAng = Math.atan2(m.y - clampedY, m.x - clampedX);
      m.x = clampedX + Math.cos(awayAng) * 95;
      m.y = clampedY + Math.sin(awayAng) * 95;
    }
    const toGoalAngle = Math.atan2(goalY - clampedY, PITCH_CONFIG.CENTER_X - clampedX);
    const toMateAngle = Math.atan2(m.y - clampedY, m.x - clampedX);
    let diff = Math.abs(toMateAngle - toGoalAngle);
    while (diff > Math.PI) diff -= Math.PI * 2;
    diff = Math.abs(diff);
    if (diff < 0.42 && d < 190) {
      const lateralSign = m.x < clampedX ? -1 : 1;
      m.x += lateralSign * 50;
    }
    m.vx = 0;
    m.vy = 0;
  }

  // Role 1: Uncontested Short Pass Option (drops into open space to the side to keep possession)
  const shortMate =
    attackingMates.find(m => m.role === 'CM1' || m.role === 'CM2' || m.role === 'LM' || m.role === 'RM') ||
    attackingMates[0];
  if (shortMate) {
    const sideSign = clampedX < PITCH_CONFIG.CENTER_X ? 1 : -1;
    const shortAngle = initialAim + sideSign * 1.35;
    shortMate.x = Math.max(
      PITCH_CONFIG.PITCH_LEFT + 35,
      Math.min(PITCH_CONFIG.PITCH_RIGHT - 35, clampedX + Math.cos(shortAngle) * 55)
    );
    shortMate.y = Math.max(
      PITCH_CONFIG.PITCH_TOP + 45,
      Math.min(PITCH_CONFIG.PITCH_BOTTOM - 45, clampedY + Math.sin(shortAngle) * 55)
    );
    shortMate.facingAngle = Math.atan2(clampedY - shortMate.y, clampedX - shortMate.x);
    shortMate.action = 'idle';
    shortMate.actionTimer = 0;
    shortMate.vx = 0;
    shortMate.vy = 0;
  }

  // Role 2: Space Runner for Long Pass into space
  const spaceRunner =
    attackingMates.find(
      m => m.id !== shortMate?.id && (m.role === 'RM' || m.role === 'LM' || m.role === 'RB' || m.role === 'LB' || m.role === 'ST2')
    ) || attackingMates[1];
  if (spaceRunner) {
    const isLeftChannel = clampedX > PITCH_CONFIG.CENTER_X;
    const channelX = isLeftChannel ? PITCH_CONFIG.PITCH_LEFT + 75 : PITCH_CONFIG.PITCH_RIGHT - 75;
    const targetY = isAttackingUp
      ? Math.max(PITCH_CONFIG.PITCH_TOP + 65, clampedY - 140)
      : Math.min(PITCH_CONFIG.PITCH_BOTTOM - 65, clampedY + 140);
    spaceRunner.x = channelX;
    spaceRunner.y = targetY;
    spaceRunner.facingAngle = Math.atan2(goalY - spaceRunner.y, PITCH_CONFIG.CENTER_X - spaceRunner.x);
    spaceRunner.action = 'idle';
    spaceRunner.actionTimer = 0;
    spaceRunner.vx = 0;
    spaceRunner.vy = 0;
  }

  // Role 3: Penalty Box Runners / Crossing Targets
  const boxMates = attackingMates.filter(
    m =>
      m.id !== shortMate?.id &&
      m.id !== spaceRunner?.id &&
      (m.role === 'ST1' || m.role === 'ST2' || m.role === 'CM1' || m.role === 'CM2')
  );
  const boxTargetY = isAttackingUp ? PITCH_CONFIG.PITCH_TOP + 85 : PITCH_CONFIG.PITCH_BOTTOM - 85;
  const boxOffsets = [-45, 0, 45];
  boxMates.forEach((bm, i) => {
    const offX = boxOffsets[i % boxOffsets.length];
    bm.x = PITCH_CONFIG.CENTER_X + offX;
    bm.y = boxTargetY + (i % 2 === 0 ? 0 : (isAttackingUp ? 22 : -22));
    bm.facingAngle = Math.atan2(clampedY - bm.y, clampedX - bm.x);
    bm.action = 'idle';
    bm.actionTimer = 0;
    bm.vx = 0;
    bm.vy = 0;
  });

  // Role 4: Defensive cover (CBs) stay behind ball to maintain balance
  const defendersMates = attackingMates.filter(
    m => m.id !== shortMate?.id && m.id !== spaceRunner?.id && !boxMates.includes(m)
  );
  defendersMates.forEach((dm, i) => {
    dm.x = PITCH_CONFIG.CENTER_X + (i === 0 ? -45 : 45);
    dm.y = isAttackingUp
      ? Math.min(PITCH_CONFIG.PITCH_BOTTOM - 50, clampedY + 50)
      : Math.max(PITCH_CONFIG.PITCH_TOP + 50, clampedY - 50);
    dm.facingAngle = initialAim;
    dm.action = 'idle';
    dm.actionTimer = 0;
    dm.vx = 0;
    dm.vy = 0;
  });

  // Push back ALL defending players at least 95 units (FIFA 10 yards rule) away from the free kick spot
  for (const p of engine.players) {
    if (p.team === defendingTeam && p.role !== 'GK') {
      const d = Math.hypot(p.x - clampedX, p.y - clampedY);
      if (d < 95) {
        const awayAngle = Math.atan2(p.y - clampedY, p.x - clampedX);
        p.x = clampedX + Math.cos(awayAngle) * 105;
        p.y = clampedY + Math.sin(awayAngle) * 105;
        p.vx = 0;
        p.vy = 0;
      }
    }
  }

  // Position defensive wall barrier of 3-5 players within 35 yards (~340px) at regulation 10 yards (90px)
  const wallIds: string[] = [];

  if (distToGoal < 360) {
    const wallCount = distToGoal < 220 ? 5 : distToGoal < 290 ? 4 : 3;
    const defenders = engine.players.filter(p => p.team === defendingTeam && p.role !== 'GK').slice(0, wallCount);
    const wallDist = 90; // Regulation 10 yards (90px)
    const goalAim = Math.atan2(goalY - clampedY, PITCH_CONFIG.CENTER_X - clampedX);
    const wallCenterX = clampedX + Math.cos(goalAim) * wallDist;
    const wallCenterY = clampedY + Math.sin(goalAim) * wallDist;
    const perpAngle = goalAim + Math.PI / 2;

    defenders.forEach((d, idx) => {
      const offset = (idx - (wallCount - 1) / 2) * 16;
      d.x = wallCenterX + Math.cos(perpAngle) * offset;
      d.y = wallCenterY + Math.sin(perpAngle) * offset;
      d.facingAngle = goalAim + Math.PI; // Face the ball
      d.action = 'wall_stance';
      d.actionTimer = 0;
      d.vx = 0;
      d.vy = 0;
      wallIds.push(d.id);
    });
  }

  engine.setPiece = {
    type: 'free_kick',
    takerId: taker.id,
    team: attackingTeam,
    spotX: clampedX,
    spotY: clampedY,
    aimAngle: initialAim,
    elevation: 0.1,
    curve: 0,
    wallPlayerIds: wallIds,
    isPenalty: false,
  };

  if (attackingTeam === 'home') {
    engine.bannerMessage = '⚽ DIRECT FREE KICK • AIM: ←/→ • A: SHOOT • D: CROSS • S: PASS';
  } else {
    engine.bannerMessage = `FREE KICK FOR ${AWAY_KIT.name.toUpperCase()}! DEFEND THE WALL!`;
  }
  engine.bannerTimer = 999999;
}

/**
 * Sets up a Corner Kick
 */
export function setupCornerKick(engine: MatchEngine, attackingTeam: TeamSide, cornerX: number, cornerY: number): void {
  engine.matchPhase = 'corner_kick';
  engine.phaseTimer = 0;

  const isAttackingUp = attackingTeam === 'home';
  engine.ball.x = cornerX;
  engine.ball.y = cornerY;
  engine.ball.z = 0;
  engine.ball.vx = 0;
  engine.ball.vy = 0;
  engine.ball.vz = 0;
  engine.ball.ownerId = null;
  engine.ball.isAirborne = false;

  const boxCenterY = isAttackingUp ? PITCH_CONFIG.PITCH_TOP + 100 : PITCH_CONFIG.PITCH_BOTTOM - 100;
  const initialAim = Math.atan2(boxCenterY - cornerY, PITCH_CONFIG.CENTER_X - cornerX);
  const isLeft = cornerX < PITCH_CONFIG.CENTER_X;

  const taker = getAssignedSetPieceTaker(engine, attackingTeam, isLeft ? 'leftCorner' : 'rightCorner');

  taker.x = cornerX - Math.cos(initialAim) * 12;
  taker.y = cornerY - Math.sin(initialAim) * 12;
  taker.facingAngle = initialAim;
  taker.action = 'freekick_stance';
  taker.actionTimer = 0;

  if (attackingTeam === 'home') {
    engine.userControlledPlayerId = taker.id;
    engine.updateUserControlledFlag();
  }

  engine.setPiece = {
    type: 'corner_kick',
    takerId: taker.id,
    team: attackingTeam,
    spotX: cornerX,
    spotY: cornerY,
    aimAngle: initialAim,
    elevation: 0.35,
    curve: 0,
    wallPlayerIds: [],
    isPenalty: false,
  };

  engine.bannerMessage = '🚩 CORNER KICK • AIM: ←/→ • D: CROSS • S: PASS • A: SHOOT';
  engine.bannerTimer = 999999;
}

/**
 * Sets up a Goal Kick
 */
export function setupGoalKick(engine: MatchEngine, defendingTeam: TeamSide): void {
  engine.matchPhase = 'goal_kick';
  engine.phaseTimer = 0;

  const isBottomGoal = defendingTeam === 'home';
  const spotX = PITCH_CONFIG.CENTER_X - 35;
  const spotY = isBottomGoal ? PITCH_CONFIG.PITCH_BOTTOM - 45 : PITCH_CONFIG.PITCH_TOP + 45;

  engine.ball.x = spotX;
  engine.ball.y = spotY;
  engine.ball.z = 0;
  engine.ball.vx = 0;
  engine.ball.vy = 0;
  engine.ball.vz = 0;
  engine.ball.ownerId = null;

  const gk = engine.players.find(p => p.team === defendingTeam && p.role === 'GK')!;
  const initialAim = isBottomGoal ? -Math.PI / 2 : Math.PI / 2;

  gk.x = spotX;
  gk.y = isBottomGoal ? spotY + 12 : spotY - 12;
  gk.facingAngle = initialAim;

  if (defendingTeam === 'home') {
    engine.userControlledPlayerId = gk.id;
    engine.updateUserControlledFlag();
  }

  engine.setPiece = {
    type: 'goal_kick',
    takerId: gk.id,
    team: defendingTeam,
    spotX,
    spotY,
    aimAngle: initialAim,
    wallPlayerIds: [],
    isPenalty: false,
  };

  engine.bannerMessage = '🥅 GOAL KICK • AIM: ←/→ • S: SHORT PASS • W: LONG PUNT';
  engine.bannerTimer = 999999;
}

/**
 * Sets up a Throw-In from sideline
 */
export function setupThrowIn(engine: MatchEngine, team: TeamSide, touchX: number, touchY: number): void {
  engine.matchPhase = 'throw_in';
  engine.phaseTimer = 0;

  const isLeftSide = touchX < PITCH_CONFIG.CENTER_X;
  const initialAim = isLeftSide ? 0 : Math.PI;

  const taker =
    engine.players.find(p => p.team === team && (p.role === 'LB' || p.role === 'RB' || p.isUserControlled)) ||
    engine.players.find(p => p.team === team && p.role !== 'GK')!;

  taker.x = touchX - Math.cos(initialAim) * 8;
  taker.y = touchY;
  taker.facingAngle = initialAim;
  taker.action = 'throw_in';
  taker.actionTimer = 0;

  // Ball is held securely overhead in both hands ready for two-handed throw
  engine.ball.x = taker.x;
  engine.ball.y = taker.y;
  engine.ball.z = 24;
  engine.ball.vx = 0;
  engine.ball.vy = 0;
  engine.ball.vz = 0;
  engine.ball.ownerId = null;
  engine.ball.isAirborne = true;

  if (team === 'home') {
    engine.userControlledPlayerId = taker.id;
    engine.updateUserControlledFlag();
  }

  // Position 2 nearby attacking teammates to make active runs towards the thrower
  const mates = engine.players.filter(p => p.team === team && p.id !== taker.id && p.role !== 'GK');
  if (mates.length >= 2) {
    // Short passing target: ~48px onto pitch
    mates[0].x = touchX + (isLeftSide ? 46 : -46);
    mates[0].y = touchY + (touchY < PITCH_CONFIG.CENTER_Y ? 35 : -35);
    mates[0].facingAngle = Math.atan2(touchY - mates[0].y, touchX - mates[0].x);
    // Long passing target down the line: ~95px along touchline
    mates[1].x = touchX + (isLeftSide ? 22 : -22);
    mates[1].y = touchY + (team === 'home' ? -90 : 90);
    mates[1].facingAngle = Math.atan2(touchY - mates[1].y, touchX - mates[1].x);
  }

  // Push back defenders at least 45px (FIFA 2 meters throw-in rule)
  const oppTeam = team === 'home' ? 'away' : 'home';
  for (const p of engine.players) {
    if (p.team === oppTeam) {
      const d = Math.hypot(p.x - touchX, p.y - touchY);
      if (d < 45) {
        const awayAng = Math.atan2(p.y - touchY, p.x - touchX);
        p.x = touchX + Math.cos(awayAng) * 55;
        p.y = touchY + Math.sin(awayAng) * 55;
        p.vx = 0;
        p.vy = 0;
      }
    }
  }

  engine.setPiece = {
    type: 'throw_in',
    takerId: taker.id,
    team,
    spotX: touchX,
    spotY: touchY,
    aimAngle: initialAim,
    elevation: 0,
    curve: 0,
    wallPlayerIds: [],
    isPenalty: false,
  };

  engine.bannerMessage = '✋ TOUCHLINE THROW-IN • AIM: ARROWS • S: SECURE SHORT PASS • W: LONG THROW';
  engine.bannerTimer = 999999;
}

/**
 * Returns clean, non-obstructive set-piece instructions for the bottom-left event box
 */
export function getSetPiecePrompt(sp: SetPieceState): string {
  if (sp.type === 'penalty') {
    return '⚡ PENALTY KICK • AIM: ←/→ • HOLD A: SHOOT • E+A: PANENKA';
  } else if (sp.type === 'throw_in') {
    return '✋ TOUCHLINE THROW-IN • AIM: ARROWS • S: SECURE SHORT PASS • W: LONG THROW';
  } else if (sp.type === 'corner_kick') {
    return '🚩 CORNER KICK • AIM: ←/→ • D: CROSS • S: PASS • A: SHOOT';
  } else if (sp.type === 'goal_kick') {
    return '🥅 GOAL KICK • AIM: ←/→ • S: SHORT PASS • W: LONG PUNT';
  } else {
    return '⚽ DIRECT FREE KICK • AIM: ←/→ • A: SHOOT • D: CROSS • S: PASS';
  }
}

/**
 * Primary set-piece update loop handling both user-controlled and AI-controlled set pieces
 */
export function updateSetPiece(engine: MatchEngine, keys: KeyState): void {
  const sp = engine.setPiece;
  if (!sp) return;

  const taker = engine.players.find(p => p.id === sp.takerId);
  if (!taker) {
    engine.setPiece = null;
    engine.matchPhase = 'in_play';
    return;
  }

  // Keep ball steady and stationary during set piece aiming
  if (sp.type === 'throw_in') {
    engine.ball.x = taker.x;
    engine.ball.y = taker.y;
    engine.ball.z = 24;
    engine.ball.vx = 0;
    engine.ball.vy = 0;
    engine.ball.vz = 0;
  } else {
    engine.ball.x = sp.spotX;
    engine.ball.y = sp.spotY;
    engine.ball.z = 0;
    engine.ball.vx = 0;
    engine.ball.vy = 0;
    engine.ball.vz = 0;
  }

  if (sp.team === 'home') {
    // Keep set-piece instruction visible in the bottom-left text box (nutmegs, fouls box) without covering the pitch
    if (!engine.bannerMessage || engine.bannerTimer < 10) {
      engine.bannerMessage = getSetPiecePrompt(sp);
      engine.bannerTimer = 999999;
    }

    // Goalkeeper anticipation psychology during penalty: shifts weight across line
    if (sp.isPenalty) {
      engine.phaseTimer++;
      const gk = engine.players.find(p => p.team !== sp.team && p.role === 'GK');
      if (gk) {
        const shiftCycle = Math.floor(engine.phaseTimer / 40) % 3;
        sp.gkWeightShift = shiftCycle === 0 ? 'center' : shiftCycle === 1 ? 'left' : 'right';
        if (sp.gkWeightShift === 'left') {
          gk.x = PITCH_CONFIG.CENTER_X - 8;
        } else if (sp.gkWeightShift === 'right') {
          gk.x = PITCH_CONFIG.CENTER_X + 8;
        } else {
          gk.x = PITCH_CONFIG.CENTER_X;
        }
      }
    }
    handleSetPieceInput(engine, keys);
  } else {
    // Away team (AI) set-piece execution
    engine.phaseTimer++;

    // Keep taker facing spot
    taker.facingAngle = sp.aimAngle;
    if (sp.type === 'throw_in') {
      taker.action = 'throw_in';
    } else if (sp.isPenalty) {
      taker.action = 'penalty_stance';
    } else {
      taker.action = 'freekick_stance';
    }
    taker.x = sp.spotX - Math.cos(sp.aimAngle) * 14;
    taker.y = sp.spotY - Math.sin(sp.aimAngle) * 14;

    // Wait ~60 frames for realism (referee whistle, camera framing, positioning)
    if (engine.phaseTimer > 60) {
      if (sp.isPenalty) {
        // AI Penalty: target bottom goal left or right
        const cornerAim = Math.PI / 2 + (Math.random() < 0.5 ? -0.22 : 0.22);
        executePenaltyShot(engine, taker, cornerAim, 0.70 + Math.random() * 0.22);
      } else if (sp.type === 'corner_kick') {
        // AI Corner: whip cross into Home penalty box
        const targetX = PITCH_CONFIG.CENTER_X + (Math.random() - 0.5) * 60;
        const targetY = PITCH_CONFIG.PITCH_BOTTOM - 130;
        const aim = Math.atan2(targetY - sp.spotY, targetX - sp.spotX);
        executeSetPieceDelivery(engine, taker, aim, 'cross', 0.68);
      } else if (sp.type === 'goal_kick') {
        const aim = Math.PI / 2 + (Math.random() - 0.5) * 0.3;
        executeSetPieceDelivery(engine, taker, aim, Math.random() < 0.5 ? 'pass' : 'long_pass', 0.7);
      } else if (sp.type === 'throw_in') {
        const mates = engine.players.filter(p => p.team === 'away' && p.id !== taker.id);
        const nearMate = mates.sort((a, b) => Math.hypot(a.x - taker.x, a.y - taker.y) - Math.hypot(b.x - taker.x, b.y - taker.y))[0];
        const aim = nearMate ? Math.atan2(nearMate.y - taker.y, nearMate.x - taker.x) : sp.aimAngle;
        executeSetPieceDelivery(engine, taker, aim, 'pass', 0.55);
      } else {
        // AI Free Kick:
        const goalY = PITCH_CONFIG.PITCH_BOTTOM;
        const distToGoal = Math.hypot(PITCH_CONFIG.CENTER_X - sp.spotX, goalY - sp.spotY);
        const isNearWing = sp.spotX < PITCH_CONFIG.PITCH_LEFT + 280 || sp.spotX > PITCH_CONFIG.PITCH_RIGHT - 280;

        if (distToGoal < 380) {
          const aim = Math.atan2(goalY - sp.spotY, PITCH_CONFIG.CENTER_X + (Math.random() - 0.5) * 60 - sp.spotX);
          executeSetPieceDelivery(engine, taker, aim, 'shoot', 0.85);
        } else if (isNearWing) {
          const boxCenterY = PITCH_CONFIG.PITCH_BOTTOM - 160;
          const aim = Math.atan2(boxCenterY - sp.spotY, PITCH_CONFIG.CENTER_X + (Math.random() - 0.5) * 60 - sp.spotX);
          executeSetPieceDelivery(engine, taker, aim, 'cross', 0.80);
        } else {
          const mates = engine.players.filter(p => p.team === taker.team && p.id !== taker.id && p.role !== 'GK');
          const sortedMates = mates.map(m => {
            const dist = Math.hypot(m.x - taker.x, m.y - taker.y);
            let oppDist = Infinity;
            for (const opp of engine.players) {
              if (opp.team !== taker.team) {
                const od = Math.hypot(opp.x - m.x, opp.y - m.y);
                if (od < oppDist) oppDist = od;
              }
            }
            return { mate: m, dist, oppDist, score: oppDist * 1.5 - dist * 0.2 };
          }).sort((a, b) => b.score - a.score);

          const bestMate = sortedMates.length > 0 ? sortedMates[0].mate : null;
          const aim = bestMate ? Math.atan2(bestMate.y - taker.y, bestMate.x - taker.x) : sp.aimAngle;
          executeSetPieceDelivery(engine, taker, aim, 'pass', 0.70);
        }
      }
    }
  }
}

/**
 * Handles user controls during any set piece:
 * Arrow keys: Aim direction & elevation
 * Q / E keys: Add Magnus curl / bend
 * In penalty: ONLY Shoot (A) or Panenka (E + A)
 * In other set pieces: S (short pass / throw), W (long pass / lofted throw), A (shoot / direct strike), D (cross)
 */
export function handleSetPieceInput(engine: MatchEngine, keys: KeyState): void {
  const sp = engine.setPiece;
  if (!sp) return;

  const taker = engine.players.find(p => p.id === sp.takerId);
  if (!taker) return;

  if (sp.type === 'throw_in') {
    // 2D directional aiming on throw-ins: point arrows towards target teammate or space
    const isLeftSide = sp.spotX < PITCH_CONFIG.CENTER_X;
    let dx = 0;
    let dy = 0;
    if (keys.ArrowLeft) dx -= 1;
    if (keys.ArrowRight) dx += 1;
    if (keys.ArrowUp) dy -= 1;
    if (keys.ArrowDown) dy += 1;

    if (dx !== 0 || dy !== 0) {
      let desiredAngle = Math.atan2(dy, dx);
      // Ensure desiredAngle aims inward onto the pitch
      if (isLeftSide) {
        // Left touchline: pitch is to the right (+x)
        if (Math.cos(desiredAngle) < 0.1) {
          desiredAngle = dy < 0 ? -Math.PI * 0.42 : Math.PI * 0.42;
        }
      } else {
        // Right touchline: pitch is to the left (-x)
        if (Math.cos(desiredAngle) > -0.1) {
          desiredAngle = dy < 0 ? -Math.PI * 0.58 : Math.PI * 0.58;
        }
      }
      sp.aimAngle = desiredAngle;
    }
  } else {
    // Horizontal Aiming with ArrowLeft / ArrowRight
    if (keys.ArrowLeft) sp.aimAngle -= 0.038;
    if (keys.ArrowRight) sp.aimAngle += 0.038;

    // Elevation control with ArrowUp / ArrowDown
    if (keys.ArrowUp) {
      sp.elevation = Math.min(0.85, (sp.elevation || 0) + 0.025);
    }
    if (keys.ArrowDown) {
      sp.elevation = Math.max(-0.75, (sp.elevation || 0) - 0.025);
    }
  }

  // Curve / Swerve control with Q and E
  if (keys.KeyQ) {
    sp.curve = Math.max(-0.85, (sp.curve || 0) - 0.035);
  } else if (keys.KeyE) {
    sp.curve = Math.min(0.85, (sp.curve || 0) + 0.035);
  }

  // Update Sweet Spot Target Detection
  const elev = sp.elevation || 0;
  const isHigh = elev > 0.22;
  const isLow = elev < -0.20;
  const isLeft = sp.aimAngle < -1.60;
  const isRight = sp.aimAngle > -1.50;

  if (isHigh && isLeft) sp.sweetSpotZone = 'top_left';
  else if (isHigh && isRight) sp.sweetSpotZone = 'top_right';
  else if (isLow && isLeft) sp.sweetSpotZone = 'bottom_left';
  else if (isLow && isRight) sp.sweetSpotZone = 'bottom_right';
  else sp.sweetSpotZone = 'none';

  // Panenka detection on penalty
  if (sp.isPenalty && keys.KeyE) {
    sp.isPanenka = true;
  }

  taker.facingAngle = sp.aimAngle;
  if (sp.type === 'throw_in') {
    taker.x = sp.spotX - Math.cos(sp.aimAngle) * 8;
    taker.y = sp.spotY;
    taker.action = 'throw_in';
  } else {
    taker.x = sp.spotX - Math.cos(sp.aimAngle) * 14;
    taker.y = sp.spotY - Math.sin(sp.aimAngle) * 14;
    if (sp.isPenalty) {
      taker.action = 'penalty_stance';
    } else {
      taker.action = 'freekick_stance';
    }
  }

  // --- PENALTY EXECUTION ---
  // "penalty you can only shoot"
  if (sp.isPenalty) {
    if (keys.KeyS || keys.KeyW || keys.KeyD) {
      engine.bannerMessage = t('penaltyShootOnly');
      engine.bannerTimer = 60;
    }

    // Charging Shoot with A key (or E + A for Panenka chip)
    if (!engine.powerBar.isActive) {
      if (keys.KeyA) {
        const isChip = !!keys.KeyE || !!sp.isPanenka;
        if (isChip) sp.isPanenka = true;
        engine.startChargingPower('shoot', !!keys.KeyQ, isChip);
      }
    } else {
      engine.powerBar.power = Math.min(1.0, engine.powerBar.power + engine.powerBar.fillSpeed * 1.25);
      engine.updatePowerBarTiers();
      if (engine.powerBar.power >= 1.0) {
        executePenaltyShot(engine, taker, sp.aimAngle, 1.0);
        keys.KeyA = false;
      }
    }
    return;
  }

  // --- OTHER SET PIECES (Free kick, corner, goal kick, throw-in) ---
  // "where you can point and hit/pass"
  if (!engine.powerBar.isActive) {
    if (keys.KeyS) engine.startChargingPower('pass', !!keys.KeyQ, !!keys.KeyE);
    else if (keys.KeyW) engine.startChargingPower('long_pass', !!keys.KeyQ, !!keys.KeyE);
    else if (keys.KeyA) engine.startChargingPower('shoot', !!keys.KeyQ, !!keys.KeyE);
    else if (keys.KeyD) engine.startChargingPower('cross', !!keys.KeyQ, !!keys.KeyE);
  } else {
    engine.powerBar.power = Math.min(1.0, engine.powerBar.power + engine.powerBar.fillSpeed * 1.15);
    engine.updatePowerBarTiers();
    if (engine.powerBar.power >= 1.0) {
      const action = engine.powerBar.action;
      executeSetPieceDelivery(engine, taker, sp.aimAngle, action, 1.0);
      if (action === 'pass') keys.KeyS = false;
      else if (action === 'long_pass') keys.KeyW = false;
      else if (action === 'shoot') keys.KeyA = false;
      else if (action === 'cross') keys.KeyD = false;
    }
  }
}

/**
 * Fires the penalty shot and triggers goalkeeper dive with full Phase 3 psychology:
 * Panenka chip (E + A), Sweet-spot postage stamp precision, Overpower risk, and GK anticipation!
 */
export function executePenaltyShot(engine: MatchEngine, taker: Player, aimAngle: number, power: number): void {
  const sp = engine.setPiece;
  const isPanenka = sp?.isPanenka || engine.powerBar.isChipped || engine.powerBar.isKnuckle;
  const isSweetSpot = sp?.sweetSpotZone && sp.sweetSpotZone !== 'none';
  const isGreenNotch = power >= 0.58 && power <= 0.82;
  const isOverpower = power > 0.88;

  // Set camera follow and taker cooldown to prevent glitchy re-grabs
  engine.setPieceCameraFollowTimer = isPanenka ? 75 : 55;
  engine.setPieceCameraType = 'penalty';
  engine.setPieceLastAimAngle = aimAngle;
  engine.setPieceTakerCooldownPlayerId = taker.id;
  engine.setPieceTakerCooldownTimer = 45;

  engine.ball.ownerId = null;
  engine.ball.lastTouchPlayerId = taker.id;
  engine.ball.lastTouchTeam = taker.team;
  engine.ball.isAirborne = true;

  const defendingTeam = taker.team === 'home' ? 'away' : 'home';
  const gk = engine.players.find(p => p.team === defendingTeam && p.role === 'GK');

  if (isPanenka) {
    // ❄️ PANENKA CHIP: Delicate scoop lifting cleanly over diving goalkeeper with soft backspin
    taker.action = 'chip_shot';
    taker.actionTimer = 28;

    const chipSpeed = 8.8 + power * 2.2;
    engine.ball.vx = Math.cos(aimAngle) * chipSpeed;
    engine.ball.vy = Math.sin(aimAngle) * chipSpeed;
    engine.ball.vz = 3.9 + power * 1.1;
    engine.ball.spinY = -2.6; // Heavy backspin
    engine.ball.spin = 0;
    engine.ball.isChipped = true;
    audio.playKick(0.70);

    // Defending Goalkeeper psychology: 80% chance GK commits early dive left/right!
    if (gk) {
      const gkCommit = Math.random();
      gk.action = 'goalkeeper_dive';
      gk.actionTimer = 38;
      const isTakerAttackingUp = (taker.team === 'home') === ((engine as any).homeAttacksUp ?? true);
      const gkDiveY = isTakerAttackingUp ? 1.0 : -1.0;
      if (gkCommit < 0.45) {
        gk.diveX = -4.5; // Dive left
        gk.diveY = gkDiveY;
        engine.setBanner('❄️ PANENKA CHIP! GOALKEEPER SENT THE WRONG WAY!', 140);
      } else if (gkCommit < 0.82) {
        gk.diveX = 4.5; // Dive right
        gk.diveY = gkDiveY;
        engine.setBanner('❄️ COLD AS ICE PANENKA! GOALKEEPER COMPLETELY FOOLED!', 140);
      } else {
        gk.diveX = 0; // Stayed center!
        gk.diveY = gkDiveY;
        engine.setBanner('⚠️ GOALKEEPER READ THE PANENKA!', 120);
      }
    }
  } else {
    // STANDARD / SWEET-SPOT STRIKE
    taker.action = 'penalty_strike';
    taker.actionTimer = 26;

    let shotSpeed = 16.5 + power * 9.2;
    let vz = 2.2 + power * 2.8;

    if (isSweetSpot && isGreenNotch) {
      // 🎯 POSTAGE STAMP SWEET SPOT
      shotSpeed = 21.5 + power * 4.5;
      vz = sp.sweetSpotZone?.startsWith('top') ? 4.6 : 0.8;
      engine.setBanner('🎯 SWEET SPOT! POSTAGE STAMP PRECISION!', 140);
    } else if (isOverpower) {
      // ⚠️ OVERPOWER RISK
      shotSpeed = 25.0;
      vz = 5.6; // High trajectory risking crossbar
      engine.cameraManager.addShake(7);
      engine.setBanner('⚠️ OVERPOWERED STRIKE! RATTLING THE WOODWORK!', 120);
    } else {
      engine.setBanner(t('goalCheer'), 80);
    }

    engine.ball.vx = Math.cos(aimAngle) * shotSpeed;
    engine.ball.vy = Math.sin(aimAngle) * shotSpeed;
    engine.ball.vz = vz;
    engine.ball.spin = (sp?.curve || 0) * 3.5;
    audio.playKick(0.95);

    // Defending Goalkeeper anticipates and dives
    if (gk) {
      const diveChoice = Math.random();
      gk.action = 'goalkeeper_dive';
      gk.actionTimer = 34;

      // Goalkeeper weight shift cue
      const aimIsLeft = aimAngle < -Math.PI / 2;
      if (isSweetSpot && isGreenNotch) {
        // High speed makes it difficult for keeper even if guessing correct side
        gk.diveX = aimIsLeft ? -3.8 : 3.8;
      } else if (diveChoice < 0.42) {
        gk.diveX = -4.2;
      } else if (diveChoice < 0.84) {
        gk.diveX = 4.2;
      } else {
        gk.diveX = 0;
      }
      const isTakerAttackingUp = (taker.team === 'home') === ((engine as any).homeAttacksUp ?? true);
      gk.diveY = isTakerAttackingUp ? 1.0 : -1.0;
    }
  }

  engine.powerBar.isActive = false;
  engine.matchPhase = 'in_play';
  engine.setPiece = null;
  engine.deathSetPieceDecision = null;
  engine.bannerTimer = 100;
}

/**
 * Executes delivery for free kick, corner, goal kick, or throw in
 * Supports:
 * - Direct Free Kick: Dipping strikes over wall, driven low rockets under jumping wall, curved benders
 * - Corner Kick: Whipped cross, chipped cross, short corner, deep switch, Olimpico direct curling shot
 */
export function executeSetPieceDelivery(
  engine: MatchEngine,
  taker: Player,
  aimAngle: number,
  action: 'pass' | 'long_pass' | 'shoot' | 'cross' | null,
  power: number
): void {
  const sp = engine.setPiece;
  const isThrow = sp?.type === 'throw_in';
  const isFreeKick = sp?.type === 'free_kick';
  const isCorner = sp?.type === 'corner_kick';
  const elevation = sp?.elevation || 0;
  const curve = sp?.curve || 0;
  const isChippedAction = engine.powerBar.isChipped || engine.powerBar.isKnuckle;

  // Set camera follow and taker cooldown
  engine.setPieceCameraFollowTimer = isFreeKick ? 55 : isThrow ? 30 : 45;
  engine.setPieceCameraType = sp?.type || null;
  engine.setPieceLastAimAngle = aimAngle;
  engine.setPieceTakerCooldownPlayerId = taker.id;
  engine.setPieceTakerCooldownTimer = 40;
  engine.setPieceDeliveryGraceTimer = 18;

  if (isThrow) {
    taker.action = 'throw_in_throw';
    taker.actionTimer = 24;
  } else if (action === 'shoot' || action === 'cross') {
    taker.action = 'freekick_strike';
    taker.actionTimer = 24;
  } else {
    taker.action = action === 'long_pass' ? 'standing_long_pass' : 'standing_pass';
    taker.actionTimer = 20;
  }

  // Manage defensive wall jump reaction on Free Kicks
  const isDrivenLowRocket = isFreeKick && action === 'shoot' && elevation <= -0.15;
  const isDippingOverWall = isFreeKick && action === 'shoot' && elevation >= 0.15;

  if (isFreeKick && sp?.wallPlayerIds && sp.wallPlayerIds.length > 0) {
    sp.wallPlayerIds.forEach(wid => {
      const wallDef = engine.players.find(p => p.id === wid);
      if (wallDef) {
        if (action === 'shoot' || action === 'cross') {
          // Wall synchronizes jump-block action to deflect low or mid-height driven shots
          wallDef.action = 'wall_jump';
          wallDef.actionTimer = 34;
          wallDef.jumpHeight = 16;
        } else {
          wallDef.action = 'idle';
          wallDef.actionTimer = 0;
          wallDef.jumpHeight = 0;
        }
      }
    });
  }

  const mult = Math.max(0.3, power);
  engine.ball.ownerId = null;
  engine.ball.lastTouchPlayerId = taker.id;
  engine.ball.lastTouchTeam = taker.team;
  engine.ball.lastKickAction = action || (isThrow ? 'pass' : 'pass');
  engine.ball.lastKickPower = mult;

  if (isThrow) {
    const isLeftSide = (sp?.spotX || 0) < PITCH_CONFIG.CENTER_X;
    const releaseX = isLeftSide
      ? Math.max(PITCH_CONFIG.PITCH_LEFT + 8, (sp ? sp.spotX : taker.x) + 8)
      : Math.min(PITCH_CONFIG.PITCH_RIGHT - 8, (sp ? sp.spotX : taker.x) - 8);
    const releaseY = sp ? Math.max(PITCH_CONFIG.PITCH_TOP + 30, Math.min(PITCH_CONFIG.PITCH_BOTTOM - 30, sp.spotY + Math.sin(aimAngle) * 6)) : taker.y;

    const mates = engine.players.filter(p => p.team === taker.team && p.id !== taker.id && !p.isRedCarded);

    if (action === 'long_pass') {
      // Long Throw-In: Powerful driven throw down the line or deep into open space
      let longTarget: Player | null = null;
      let bestLongScore = -Infinity;
      for (const m of mates) {
        const dx = m.x - taker.x;
        const dy = m.y - taker.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 35) continue;
        const mAngle = Math.atan2(dy, dx);
        let angleDiff = Math.abs(mAngle - aimAngle);
        while (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
        if (angleDiff < 1.1) {
          const score = 500 - angleDiff * 200 + dist * 0.35;
          if (score > bestLongScore) {
            bestLongScore = score;
            longTarget = m;
          }
        }
      }

      let throwSpeed: number;
      let throwAngle: number;
      if (longTarget) {
        const toDx = longTarget.x - releaseX;
        const toDy = longTarget.y - releaseY;
        const dist = Math.hypot(toDx, toDy);
        throwAngle = Math.atan2(toDy, toDx);
        throwSpeed = Math.max(7.5, Math.min(13.5, dist / 16.0 + 2.0));
      } else {
        throwAngle = aimAngle;
        throwSpeed = 11.0 + mult * 3.5;
      }

      engine.ball.x = releaseX;
      engine.ball.y = releaseY;
      engine.ball.prevX = releaseX;
      engine.ball.prevY = releaseY;
      engine.ball.prevZ = 16;
      engine.ball.z = 16;
      engine.ball.vx = Math.cos(throwAngle) * throwSpeed;
      engine.ball.vy = Math.sin(throwAngle) * throwSpeed;
      engine.ball.vz = 2.0;
      engine.ball.isAirborne = true;
      audio.playKick(0.70);
      engine.setBanner('🚀 LONG THROW-IN DOWNFIELD!', 85);

      const receiver = longTarget || mates.find(m => Math.hypot(m.x - (releaseX + Math.cos(throwAngle) * 120), m.y - (releaseY + Math.sin(throwAngle) * 120)) < 70);
      if (receiver) {
        receiver.action = 'running';
        receiver.facingAngle = Math.atan2(releaseY - receiver.y, releaseX - receiver.x);
        if (taker.team === 'home') {
          engine.userControlledPlayerId = receiver.id;
          engine.updateUserControlledFlag();
        }
      }
      engine.setPieceDeliveryGraceTimer = 30;
    } else {
      // Short pass on throw in: SECURE PASS TO CLOSEST TEAMMATE IN AIM DIRECTION
      interface Candidate {
        player: Player;
        dist: number;
        angleDiff: number;
      }
      const candidates: Candidate[] = [];
      for (const m of mates) {
        const dx = m.x - taker.x;
        const dy = m.y - taker.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 8) continue;
        const mAngle = Math.atan2(dy, dx);
        let angleDiff = Math.abs(mAngle - aimAngle);
        while (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
        candidates.push({ player: m, dist, angleDiff });
      }

      // Filter to teammates within forward aiming cone (~85 degrees)
      let inCone = candidates.filter(c => c.angleDiff < 1.48);
      if (inCone.length === 0) {
        inCone = candidates.filter(c => c.angleDiff < 2.2);
      }
      if (inCone.length === 0) {
        inCone = candidates;
      }

      // Sort by distance ascending: "closest teammate on the direction you aim"
      inCone.sort((a, b) => a.dist - b.dist);
      const targetMate = inCone.length > 0 ? inCone[0].player : null;

      if (targetMate) {
        const toDx = targetMate.x - releaseX;
        const toDy = targetMate.y - releaseY;
        const targetDist = Math.hypot(toDx, toDy);
        const passAngle = Math.atan2(toDy, toDx);

        // Calibrate speed so the ball arrives gently right at their feet/chest without overshooting
        const secureSpeed = Math.max(3.8, Math.min(8.5, targetDist / 13.0 + 1.2));

        engine.ball.x = releaseX;
        engine.ball.y = releaseY;
        engine.ball.prevX = releaseX;
        engine.ball.prevY = releaseY;
        engine.ball.prevZ = 12;
        engine.ball.z = 12;
        engine.ball.vx = Math.cos(passAngle) * secureSpeed;
        engine.ball.vy = Math.sin(passAngle) * secureSpeed;
        // Soft downward trajectory so it touches turf at their feet cleanly
        engine.ball.vz = 0.22;
        engine.ball.isAirborne = true;
        audio.playKick(0.55);

        engine.setBanner(`🤝 SECURE THROW-IN TO #${targetMate.number} ${targetMate.name.toUpperCase()}`, 85);

        // Prepare receiver cleanly
        targetMate.action = 'running';
        targetMate.facingAngle = Math.atan2(releaseY - targetMate.y, releaseX - targetMate.x);
        targetMate.vx = 0;
        targetMate.vy = 0;

        if (taker.team === 'home') {
          engine.userControlledPlayerId = targetMate.id;
          engine.updateUserControlledFlag();
        }
      } else {
        const throwSpeed = 6.0;
        engine.ball.x = releaseX;
        engine.ball.y = releaseY;
        engine.ball.prevX = releaseX;
        engine.ball.prevY = releaseY;
        engine.ball.prevZ = 12;
        engine.ball.z = 12;
        engine.ball.vx = Math.cos(aimAngle) * throwSpeed;
        engine.ball.vy = Math.sin(aimAngle) * throwSpeed;
        engine.ball.vz = 0.25;
        engine.ball.isAirborne = true;
        audio.playKick(0.55);
      }

      engine.setPieceDeliveryGraceTimer = 30;
    }
  } else if (isCorner && action === 'shoot') {
    // 🌟 OLIMPICO CORNER ATTEMPT: Direct curving shot into the net!
    const olimpicoSpeed = 15.5 + mult * 7.5;
    const isLeftSide = sp.spotX < PITCH_CONFIG.CENTER_X;
    const autoCurve = isLeftSide ? 5.2 : -5.2;
    engine.ball.vx = Math.cos(aimAngle) * olimpicoSpeed;
    engine.ball.vy = Math.sin(aimAngle) * olimpicoSpeed;
    engine.ball.vz = 3.6 + mult * 2.0;
    engine.ball.isAirborne = true;
    engine.ball.spin = curve !== 0 ? curve * 5.8 : autoCurve;
    engine.ball.spinY = -1.8;
    audio.playKick(0.95);
    engine.setBanner('🌟 OLIMPICO CORNER! DIRECT STRIKE CURLING INTO GOAL!', 140);
  } else if (isFreeKick && isDrivenLowRocket) {
    // ⚡ DRIVEN LOW ROCKET UNDER THE JUMPING WALL!
    const lowSpeed = 20.0 + mult * 7.5;
    engine.ball.vx = Math.cos(aimAngle) * lowSpeed;
    engine.ball.vy = Math.sin(aimAngle) * lowSpeed;
    engine.ball.vz = 0.25; // Skims turf beneath jumping wall
    engine.ball.isAirborne = false;
    engine.ball.spin = curve * 2.5;
    audio.playKick(0.95);
    engine.setBanner('⚡ DRIVEN LOW ROCKET UNDER THE JUMPING WALL!', 140);
  } else if (isFreeKick && isDippingOverWall) {
    // ⚽ DIPPING CURVE OVER THE WALL!
    const dipSpeed = 17.0 + mult * 8.5;
    engine.ball.vx = Math.cos(aimAngle) * dipSpeed;
    engine.ball.vy = Math.sin(aimAngle) * dipSpeed;
    engine.ball.vz = 3.8 + elevation * 2.2;
    engine.ball.spinY = -2.6; // Heavy topspin causing ball to dip violently
    engine.ball.spin = curve * 4.8;
    engine.ball.isAirborne = true;
    audio.playKick(0.95);
    engine.setBanner('⚽ DIPPING CURVE OVER THE WALL!', 140);
  } else if (action === 'shoot') {
    // Dead-ball accuracy multiplier (+35% accuracy, sweet spot curl boost)
    const deadBallMult = isFreeKick ? 1.35 : 1.0;
    const speed = (16.5 + mult * 9.5) * (isFreeKick ? 1.06 : 1.0);
    engine.ball.vx = Math.cos(aimAngle) * speed;
    engine.ball.vy = Math.sin(aimAngle) * speed;
    engine.ball.vz = Math.max(0.4, 2.0 + mult * 2.5 + elevation * 1.8);
    engine.ball.isAirborne = true;
    engine.ball.spin = curve * 4.8 * deadBallMult;
    audio.playKick(0.95);
    if (Math.abs(curve) > 0.25) {
      engine.setBanner('💫 BENDING FREE KICK AROUND THE WALL! [DEAD-BALL SWEET SPOT]', 130);
    }
  } else if (action === 'cross') {
    const deadBallMult = (isFreeKick || isCorner) ? 1.35 : 1.0;
    if (isChippedAction) {
      // ☁️ CHIPPED FLOATING CROSS
      const speed = 12.5 + mult * 5.0;
      engine.ball.vx = Math.cos(aimAngle) * speed;
      engine.ball.vy = Math.sin(aimAngle) * speed;
      engine.ball.vz = 5.8 + mult * 2.2;
      engine.ball.spinY = -1.8;
      engine.ball.isAirborne = true;
      audio.playKick(0.85);
      engine.setBanner('☁️ HIGH FLOATING BACK-POST CROSS!', 120);
    } else {
      // WHIPPED CROSS
      const speed = (15.0 + mult * 7.5) * (isFreeKick ? 1.05 : 1.0);
      engine.ball.vx = Math.cos(aimAngle) * speed;
      engine.ball.vy = Math.sin(aimAngle) * speed;
      engine.ball.vz = Math.max(1.5, 3.8 + mult * 2.2 + elevation * 1.6);
      engine.ball.isAirborne = true;
      engine.ball.spin = curve * 4.2 * deadBallMult;
      audio.playKick(0.85);
      engine.setBanner(isCorner ? '🚩 WHIPPED CORNER INTO DANGER ZONE!' : '👟 WHIPPED CROSS INTO THE BOX!', 120);
    }
  } else if (action === 'long_pass') {
    const speed = 13.5 + mult * 6.0;
    engine.ball.vx = Math.cos(aimAngle) * speed;
    engine.ball.vy = Math.sin(aimAngle) * speed;
    engine.ball.vz = Math.max(1.0, 2.6 + mult * 1.8 + elevation * 1.4);
    engine.ball.isAirborne = true;
    engine.ball.spin = curve * 2.0;
    audio.playKick(0.75);
    if (isCorner) {
      engine.setBanner('🚀 DEEP CORNER SWITCH TO EDGE OF THE BOX!', 120);
    }
  } else {
    // Ground pass (e.g. Short corner or layoff free kick)
    const speed = 12.0 + mult * 5.0;
    engine.ball.vx = Math.cos(aimAngle) * speed;
    engine.ball.vy = Math.sin(aimAngle) * speed;
    engine.ball.vz = 0;
    engine.ball.isAirborne = false;
    audio.playKick(0.65);
    if (isCorner) {
      engine.setBanner('🤝 SHORT CORNER COMBINATION!', 120);
    }
  }

  // If passing to a teammate from set-piece (corner/free kick/goal kick), target them and switch control to recipient
  if (!isThrow && (action === 'pass' || action === 'long_pass')) {
    const mates = engine.players.filter(p => p.team === taker.team && p.id !== taker.id && p.role !== 'GK');
    let bestReceiver: Player | null = null;
    let bestScore = -Infinity;
    for (const m of mates) {
      const dx = m.x - taker.x;
      const dy = m.y - taker.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 35 && dist < 500) {
        const mAngle = Math.atan2(dy, dx);
        let angleDiff = Math.abs(mAngle - aimAngle);
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        angleDiff = Math.abs(angleDiff);
        if (angleDiff < 1.1) {
          const score = 100 - angleDiff * 60 - dist * 0.08;
          if (score > bestScore) {
            bestScore = score;
            bestReceiver = m;
          }
        }
      }
    }
    if (bestReceiver) {
      bestReceiver.action = 'running';
      const toThrowAngle = Math.atan2(engine.ball.vy, engine.ball.vx);
      bestReceiver.facingAngle = toThrowAngle;
      bestReceiver.vx = Math.cos(toThrowAngle) * 2.5;
      bestReceiver.vy = Math.sin(toThrowAngle) * 2.5;
      if (taker.team === 'home') {
        engine.userControlledPlayerId = bestReceiver.id;
        engine.updateUserControlledFlag();
      }
    }
  }

  // If delivering a cross into the penalty box, switch user control to key forward target
  if (action === 'cross') {
    const boxMates = engine.players.filter(p => p.team === taker.team && p.id !== taker.id && p.role !== 'GK');
    const isTakerAttackingUp = (taker.team === 'home') === ((engine as any).homeAttacksUp ?? true);
    const targetGoalY = isTakerAttackingUp ? PITCH_CONFIG.PITCH_TOP + 80 : PITCH_CONFIG.PITCH_BOTTOM - 80;
    const bestHeaderAttacker = boxMates.sort((a, b) => {
      const distA = Math.hypot(a.x - PITCH_CONFIG.CENTER_X, a.y - targetGoalY);
      const distB = Math.hypot(b.x - PITCH_CONFIG.CENTER_X, b.y - targetGoalY);
      return distA - distB;
    })[0];
    if (bestHeaderAttacker && taker.team === 'home') {
      bestHeaderAttacker.action = 'running';
      engine.userControlledPlayerId = bestHeaderAttacker.id;
      engine.updateUserControlledFlag();
    }
  }

  engine.powerBar.isActive = false;
  engine.matchPhase = 'in_play';
  engine.setPiece = null;
  engine.deathSetPieceDecision = null;
  engine.bannerTimer = 100;
}
