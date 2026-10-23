import { PITCH_CONFIG } from './constants';
import { Player, Ball, SetPieceState, CameraMode } from '../types';

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
  pitchTilt: number; // 0.0 (lowered pitch-level behind-kicker) to 1.0 (tactical top-down)
}

export class CameraManager {
  public state: CameraState = {
    x: PITCH_CONFIG.CENTER_X,
    y: PITCH_CONFIG.CENTER_Y,
    zoom: 1.05,
    pitchTilt: 0.5,
  };

  private shakeAmount: number = 0;
  private shakeDecay: number = 0.90;

  /**
   * Adds an energetic screen impulse (crossbar thumps, thunderous strikes, saves)
   */
  public addShake(amount: number) {
    this.shakeAmount = Math.min(18, this.shakeAmount + amount);
  }

  /**
   * Resets the camera to center of pitch
   */
  public resetToCenter(zoom: number = 1.05) {
    this.state.x = PITCH_CONFIG.CENTER_X;
    this.state.y = PITCH_CONFIG.CENTER_Y;
    this.state.zoom = zoom;
    this.state.pitchTilt = 0.5;
    this.shakeAmount = 0;
  }

  /**
   * Main camera update routine called every frame.
   * Handles:
   * 1. Cinematic low-angle set-piece camera (Penalties, Free Kicks, Corners, Throw-ins)
   * 2. Live ball-flight tracking following delivery towards the net
   * 3. Seamless transition back to live broadcast/pitch gameplay with zero frame stutter
   * 4. Multi-mode gameplay cameras ('pitch', 'ball', 'player')
   */
  public update(
    ball: Ball,
    players: Player[],
    userControlledPlayerId: string | null,
    matchPhase: string,
    setPiece: SetPieceState | null,
    setPieceFollowTimer: number,
    setPieceCameraType: string | null,
    setPieceLastAimAngle: number,
    cameraFocus: CameraMode = 'pitch',
    timeScale: number = 1
  ): CameraState {
    const isSetPieceActive =
      !!setPiece &&
      (matchPhase === 'free_kick' ||
        matchPhase === 'penalty' ||
        matchPhase === 'corner_kick' ||
        matchPhase === 'goal_kick' ||
        matchPhase === 'throw_in');

    const isFollowingFlight = setPieceFollowTimer > 0;

    let targetX = ball.x;
    let targetY = ball.y;
    let targetZoom = 1.05;
    let targetTilt = 0.5;
    let lerpSpeedPos = 0.08 * timeScale;
    let lerpSpeedTilt = 0.08 * timeScale;
    let lerpSpeedZoom = 0.06 * timeScale;

    // -------------------------------------------------------------
    // 1. SET-PIECE LOWERED CINEMATIC CAMERA & FLIGHT TRACKING
    // -------------------------------------------------------------
    if (isSetPieceActive || isFollowingFlight) {
      const type = setPiece ? setPiece.type : setPieceCameraType;
      const aim = setPiece ? setPiece.aimAngle : setPieceLastAimAngle;
      const isPen = type === 'penalty';
      const isCorner = type === 'corner_kick';
      const isThrow = type === 'throw_in';
      const isGoalKick = type === 'goal_kick';

      // Forward offset positions camera ahead of the taker along the aim line,
      // framing the taker in the lower foreground while opening the goal mouth / box ahead
      const forwardOffset = isPen ? 65 : isCorner ? 115 : isThrow ? 75 : isGoalKick ? 100 : 105;

      const baseX = setPiece ? setPiece.spotX : ball.x;
      const baseY = setPiece ? setPiece.spotY : ball.y;

      let plannedX = baseX + Math.cos(aim) * forwardOffset;
      let plannedY = baseY + Math.sin(aim) * forwardOffset;

      if (isPen) {
        // Penalty: Centered exactly between penalty spot and goal center
        plannedX = PITCH_CONFIG.CENTER_X * 0.85 + baseX * 0.15;
        plannedY = (baseY + PITCH_CONFIG.PITCH_TOP) * 0.52;
        targetTilt = 0.04; // Extreme pitch-level high projection
        targetZoom = 1.54; // Dramatic 1v1 duel perspective
      } else if (isCorner) {
        // Corner kick: Angled perspective looking from corner flag into penalty area
        const boxCenterY = baseY < PITCH_CONFIG.CENTER_Y ? PITCH_CONFIG.PITCH_TOP + 120 : PITCH_CONFIG.PITCH_BOTTOM - 120;
        plannedX = baseX * 0.35 + PITCH_CONFIG.CENTER_X * 0.65;
        plannedY = baseY * 0.35 + boxCenterY * 0.65;
        targetTilt = 0.12;
        targetZoom = 1.28;
      } else if (isThrow) {
        // Throw-in: Sideline view
        plannedX = baseX + Math.cos(aim) * 60;
        plannedY = baseY + Math.sin(aim) * 30;
        targetTilt = 0.18;
        targetZoom = 1.26;
      } else if (isGoalKick) {
        plannedX = PITCH_CONFIG.CENTER_X;
        plannedY = baseY + Math.sin(aim) * 90;
        targetTilt = 0.16;
        targetZoom = 1.22;
      } else {
        // Direct Free Kick: Lowered pitch-level looking over/around wall to goal
        const goalY = baseY > PITCH_CONFIG.CENTER_Y ? PITCH_CONFIG.PITCH_BOTTOM : PITCH_CONFIG.PITCH_TOP;
        const distToGoal = Math.hypot(PITCH_CONFIG.CENTER_X - baseX, goalY - baseY);
        if (distToGoal < 420) {
          // Dangerous shooting free kick: center on goal mouth & wall
          plannedX = baseX * 0.45 + PITCH_CONFIG.CENTER_X * 0.55;
          plannedY = baseY * 0.45 + goalY * 0.55;
          targetTilt = 0.06; // Pitch-level high view through defensive wall
          targetZoom = 1.42;
        } else {
          plannedX = baseX + Math.cos(aim) * 90;
          plannedY = baseY + Math.sin(aim) * 90;
          targetTilt = 0.12;
          targetZoom = 1.30;
        }
      }

      if (isFollowingFlight) {
        // During flight, camera smoothly tracks the soaring/curling ball
        targetX = ball.x * 0.68 + plannedX * 0.32;
        targetY = ball.y * 0.68 + plannedY * 0.32;
        // As the ball gets closer to the goal line, camera raises slightly to capture the net bulging
        targetTilt = Math.min(0.35, targetTilt + (1 - setPieceFollowTimer / 55) * 0.20);
        targetZoom = Math.max(1.15, targetZoom - (1 - setPieceFollowTimer / 55) * 0.22);
        lerpSpeedPos = 0.14 * timeScale;
      } else {
        targetX = plannedX;
        targetY = plannedY;
        lerpSpeedPos = 0.10 * timeScale;
        lerpSpeedTilt = 0.09 * timeScale;
        lerpSpeedZoom = 0.08 * timeScale;
      }
    } else {
      // -------------------------------------------------------------
      // 2. NORMAL IN-PLAY MATCH CAMERAS ('pitch', 'ball', 'player')
      // -------------------------------------------------------------
      const controlledPlayer = players.find(p => p.id === userControlledPlayerId && !p.isRedCarded);
      // Normalized vertical pitch coordinate (0.0 at top rival goal, 1.0 at own bottom goal)
      const normY = Math.max(0, Math.min(1, (this.state.y - PITCH_CONFIG.PITCH_TOP) / PITCH_CONFIG.FIELD_HEIGHT));

      if (cameraFocus === 'player' && controlledPlayer) {
        // Player-locked camera
        targetX = controlledPlayer.x;
        targetY = controlledPlayer.y;
        targetZoom = 1.15;
        targetTilt = normY;
      } else if (cameraFocus === 'pitch' && controlledPlayer) {
        // Pitch auto-framing (Default):
        // Centroid targeting between ball and controlled player so both remain in full view
        targetX = ball.x * 0.55 + controlledPlayer.x * 0.45;
        targetY = ball.y * 0.55 + controlledPlayer.y * 0.45;

        const dist = Math.hypot(ball.x - controlledPlayer.x, ball.y - controlledPlayer.y);
        // Dynamic zoom: 1.08x close down to 0.42x if opposite ends of pitch
        const pitchDynamicZoom = Math.min(1.08, Math.max(0.42, 720 / (dist + 440)));
        targetZoom = pitchDynamicZoom - normY * 0.08;
        targetTilt = normY;
      } else {
        // Ball-focused broadcast camera
        targetX = ball.x;
        targetY = ball.y;
        targetZoom = 1.18 - normY * 0.26;
        targetTilt = normY;
      }
    }

    // Smooth Exponential Damping (lerp)
    this.state.x += (targetX - this.state.x) * lerpSpeedPos;
    this.state.y += (targetY - this.state.y) * lerpSpeedPos;
    this.state.pitchTilt += (targetTilt - this.state.pitchTilt) * lerpSpeedTilt;
    this.state.zoom += (targetZoom - this.state.zoom) * lerpSpeedZoom;

    // Apply Screen Shake if active
    if (this.shakeAmount > 0.05) {
      const offsetX = (Math.random() - 0.5) * this.shakeAmount;
      const offsetY = (Math.random() - 0.5) * this.shakeAmount;
      this.state.x += offsetX;
      this.state.y += offsetY;
      this.shakeAmount *= Math.pow(this.shakeDecay, timeScale);
      if (this.shakeAmount <= 0.05) this.shakeAmount = 0;
    }

    return this.state;
  }
}
