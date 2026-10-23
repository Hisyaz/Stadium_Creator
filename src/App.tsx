/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MatchEngine } from './game/engine';
import {
  KeyState,
  DifficultyLevel,
  PlayerIndicatorType,
  PlayerIndicatorStyle,
  PreMatchConfig,
  ControlMode,
  ControllerCustomization,
  CustomKeyBindings,
  GamepadBindings,
  GraphicsSettings,
  HalfDurationMinutes,
  PlayerSlotConfig,
  ControlScope,
  CursorSwitchMode,
  DEFAULT_PLAYER_SLOTS,
  DEFAULT_KEY_BINDINGS_1P,
  DEFAULT_KEY_BINDINGS_WASD,
  DEFAULT_KEY_BINDINGS_2P,
  DEFAULT_KEY_BINDINGS_3P,
  DEFAULT_KEY_BINDINGS_4P,
} from './types';
import { PitchCanvas } from './components/PitchCanvas';
import { SetPieceOverlay } from './components/SetPieceOverlay';
import { MatchHUD, HudDisplayMode } from './components/MatchHUD';
import { PauseModal } from './components/PauseModal';
import { EndGameModal } from './components/EndGameModal';
import { PreMatchModal } from './components/PreMatchModal';
import { PreMatchPresentationModal } from './components/PreMatchPresentationModal';
import { TeamSelectorModal } from './components/TeamSelectorModal';
import { DeviceProfilerModal } from './components/DeviceProfilerModal';
import { SideSelectModal } from './components/SideSelectModal';
import { MainMenuModal, MainMenuAction } from './components/MainMenuModal';
import { TeamDefinition } from './types/team';
import { StadiumDefinition } from './types/stadium';

function createEmptyKeyState(): KeyState {
  return {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    Shift: false,
    KeyW: false,
    KeyA: false,
    KeyS: false,
    KeyD: false,
    KeyQ: false,
    KeyE: false,
    Space: false,
  };
}

function updateSlotKeyboardInput(
  slot: PlayerSlotConfig,
  code: string,
  isDown: boolean,
  slotKeys: Record<number, KeyState>
) {
  const sk = slotKeys[slot.id];
  if (!sk) return;
  const b =
    slot.keyBindings ||
    (slot.id === 2
      ? DEFAULT_KEY_BINDINGS_2P
      : slot.id === 3
      ? DEFAULT_KEY_BINDINGS_3P
      : DEFAULT_KEY_BINDINGS_4P);

  if (code === b.moveUp) sk.ArrowUp = isDown;
  else if (code === b.moveDown) sk.ArrowDown = isDown;
  else if (code === b.moveLeft) sk.ArrowLeft = isDown;
  else if (code === b.moveRight) sk.ArrowRight = isDown;
  else if (code === b.sprint) sk.Shift = isDown;
  else if (code === b.gingaSwitch) sk.Space = isDown;
  else if (code === b.skillQ) sk.KeyQ = isDown;
  else if (code === b.skillE) sk.KeyE = isDown;
  else if (code === b.shortPass) sk.KeyS = isDown;
  else if (code === b.shoot) sk.KeyA = isDown;
  else if (code === b.longPass) sk.KeyW = isDown;
  else if (code === b.cross) sk.KeyD = isDown;
}
import { TacticalGamePlanModal, GamePlanPayload } from './components/TacticalGamePlanModal';
import { StadiumSelectorModal, StadiumConfig } from './components/StadiumSelectorModal';
import { StadiumCreatorModal } from './components/StadiumCreatorModal';
import { getStadiumById } from './game/stadiumRegistry';
import { UnifiedSettingsModal } from './components/UnifiedSettingsModal';
import { ControllerSettingsModal } from './components/ControllerSettingsModal';
import { GraphicsSettingsModal } from './components/GraphicsSettingsModal';
import { RetroFilterOverlay } from './components/RetroFilterOverlay';
import { ArcadeConsole, ActionModifier, ControllerBgMode, ControllerTheme } from './components/ArcadeConsole';
import { RadarMinimap, MinimapMode, RadarZoom } from './components/RadarMinimap';
import { getLanguage, setLanguage, Language } from './game/i18n';
import { loadGraphicsSettings, saveGraphicsSettings } from './game/graphicsConfig';
import {
  loadControllerCustomization,
  saveControllerCustomization,
  loadKeyBindings,
  saveKeyBindings,
  loadGamepadBindings,
  saveGamepadBindings,
  loadControlMode,
  saveControlMode,
} from './game/controllerConfig';

export default function App() {
  const engineRef = useRef<MatchEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new MatchEngine();
    engineRef.current.isPaused = true; // Game starts in team selector & captain menu
  }
  const engine = engineRef.current;

  // Key state tracker
  const keysRef = useRef<KeyState>({
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    Shift: false,
    KeyW: false,
    KeyA: false,
    KeyS: false,
    KeyD: false,
    KeyQ: false,
    KeyE: false,
    Space: false,
  });

  // Secondary human slots key state tracker (2P, 3P, 4P)
  const slotKeysRef = useRef<Record<number, KeyState>>({
    1: keysRef.current,
    2: createEmptyKeyState(),
    3: createEmptyKeyState(),
    4: createEmptyKeyState(),
  });

  // Multi-Player & Controller Assignment State (Phase 1.5)
  const [playerSlots, setPlayerSlots] = useState<PlayerSlotConfig[]>(() => engine.playerSlots);
  const [isSideSelectOpen, setIsSideSelectOpen] = useState(false);

  // Phase 13.1: 32-Bit Arcade Main Menu Launch Hub State
  const [isMainMenuOpen, setIsMainMenuOpen] = useState(true);
  const [appFlow, setAppFlow] = useState<
    | 'main_menu'
    | 'profiler'
    | 'side_select'
    | 'team_selector'
    | 'presentation'
    | 'in_match'
    | 'editor_teams'
    | 'editor_stadiums'
    | 'settings_menu'
  >('main_menu');
  const [isDeviceProfilerOpen, setIsDeviceProfilerOpen] = useState(false);
  const [isStartupTeamSelectOpen, setIsStartupTeamSelectOpen] = useState(false);
  const [startupTeamSide, setStartupTeamSide] = useState<'home' | 'away'>('home');

  // State synced to React UI
  const [isPaused, setIsPaused] = useState(false);
  const [isPreMatchOpen, setIsPreMatchOpen] = useState(false);
  const [isPresentationOpen, setIsPresentationOpen] = useState(false);
  const [isGamePlanOpen, setIsGamePlanOpen] = useState(false);
  const [isStadiumOpen, setIsStadiumOpen] = useState(false);
  const [isStadiumCreatorOpen, setIsStadiumCreatorOpen] = useState(false);
  const [stadiumCreatorInitial, setStadiumCreatorInitial] = useState<StadiumDefinition | undefined>(undefined);
  const [isUnifiedSettingsOpen, setIsUnifiedSettingsOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'graphics' | 'controls' | 'match_hud'>('graphics');

  const [stadiumConfig, setStadiumConfig] = useState<StadiumConfig>(() => ({
    stadiumTier: engine.stadiumTier,
    pitchPreset: engine.pitchPreset,
    pitchLengthMeters: engine.pitchLengthMeters,
    pitchWidthMeters: engine.pitchWidthMeters,
    turfQuality: engine.turfQuality,
    mowingPattern: engine.mowingPattern,
    grassLength: engine.grassLength,
    surfaceStatus: engine.surfaceStatus,
    weather: engine.weather,
    season: engine.season,
    timeOfDay: engine.timeOfDay,
    seatColor: engine.seatColor,
    crowdLevel: engine.crowdLevel || 'crowded',
    netTension: engine.netTension,
    goalFrame: engine.goalFrame,
    stadiumId: engine.activeStadium?.id,
    isHomeVenueLocked: engine.isHomeVenueSelected,
    shape: engine.activeStadium?.shape,
    surroundings: engine.activeStadium?.surroundings,
    benchType: engine.activeStadium?.dugouts?.type,
    benchQuality: engine.activeStadium?.dugouts?.quality,
    tunnelType: engine.activeStadium?.tunnel?.type,
    tunnelSiting: engine.activeStadium?.tunnel?.siting,
    hasTrack: engine.activeStadium?.hasTrack,
    apronMaterial: engine.activeStadium?.apronMaterial || 'grass',
    capacity: engine.activeStadium?.capacity,
    fifaCategory: engine.activeStadium?.fifaCategory,
  }));

  const syncStadiumConfigFromEngine = useCallback(() => {
    setStadiumConfig({
      stadiumTier: engine.stadiumTier,
      pitchPreset: engine.pitchPreset,
      pitchLengthMeters: engine.pitchLengthMeters,
      pitchWidthMeters: engine.pitchWidthMeters,
      turfQuality: engine.turfQuality,
      mowingPattern: engine.mowingPattern,
      grassLength: engine.grassLength,
      surfaceStatus: engine.surfaceStatus,
      weather: engine.weather,
      season: engine.season,
      timeOfDay: engine.timeOfDay,
      seatColor: engine.seatColor,
      crowdLevel: engine.crowdLevel || 'crowded',
      netTension: engine.netTension,
      goalFrame: engine.goalFrame,
      stadiumId: engine.activeStadium?.id,
      isHomeVenueLocked: engine.isHomeVenueSelected,
      shape: engine.activeStadium?.shape,
      surroundings: engine.activeStadium?.surroundings,
      benchType: engine.activeStadium?.dugouts?.type,
      benchQuality: engine.activeStadium?.dugouts?.quality,
      tunnelType: engine.activeStadium?.tunnel?.type,
      tunnelSiting: engine.activeStadium?.tunnel?.siting,
      hasTrack: engine.activeStadium?.hasTrack,
      apronMaterial: engine.activeStadium?.apronMaterial || 'grass',
      capacity: engine.activeStadium?.capacity,
      fifaCategory: engine.activeStadium?.fifaCategory,
    });
  }, [engine]);

  const handleUpdateStadiumConfig = (newConfig: StadiumConfig) => {
    setStadiumConfig(newConfig);
    engine.stadiumTier = newConfig.stadiumTier;
    engine.pitchPreset = newConfig.pitchPreset;
    engine.pitchLengthMeters = newConfig.pitchLengthMeters;
    engine.pitchWidthMeters = newConfig.pitchWidthMeters;
    engine.setTurfQuality(newConfig.turfQuality);
    engine.setMowingPattern(newConfig.mowingPattern);
    engine.setGrassLength(newConfig.grassLength);
    engine.setSurfaceStatus(newConfig.surfaceStatus);
    engine.setWeather(newConfig.weather);
    engine.setSeason(newConfig.season);
    engine.setTimeOfDay(newConfig.timeOfDay);
    engine.setSeatColor(newConfig.seatColor);
    engine.setCrowdLevel(newConfig.crowdLevel);
    engine.setNetTension(newConfig.netTension);
    engine.setGoalFrame(newConfig.goalFrame);
    if (newConfig.apronMaterial) {
      engine.setApronMaterial(newConfig.apronMaterial);
    }

    if (newConfig.stadiumId) {
      const std = getStadiumById(newConfig.stadiumId);
      if (std) {
        engine.applyStadium(std, !!newConfig.isHomeVenueLocked);
      }
    } else {
      if (newConfig.shape && engine.activeStadium) engine.activeStadium.shape = newConfig.shape;
      if (newConfig.surroundings && engine.activeStadium) engine.activeStadium.surroundings = newConfig.surroundings;
      if (newConfig.hasTrack !== undefined && engine.activeStadium) engine.activeStadium.hasTrack = newConfig.hasTrack;
      if (newConfig.apronMaterial && engine.activeStadium) engine.activeStadium.apronMaterial = newConfig.apronMaterial;
      if (newConfig.benchType && engine.activeStadium?.dugouts) engine.activeStadium.dugouts.type = newConfig.benchType;
      if (newConfig.tunnelType && engine.activeStadium?.tunnel) engine.activeStadium.tunnel.type = newConfig.tunnelType;
    }
  };
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(engine.difficulty);
  const [gameSpeed, setGameSpeed] = useState<number>(engine.gameSpeed);
  const [score, setScore] = useState({ home: 0, away: 0 });
  const [matchTime, setMatchTime] = useState(0);
  const [matchPhase, setMatchPhase] = useState(engine.matchPhase);
  const [bannerMessage, setBannerMessage] = useState<string | null>(engine.bannerMessage);
  const [currentLang, setCurrentLang] = useState<Language>(getLanguage());
  const [hasBall, setHasBall] = useState(false);
  const [controlledPlayer, setControlledPlayer] = useState(engine.getControlledPlayer());

  // Camera & Radar focus target ('pitch', 'ball', or 'player')
  const [cameraFocus, setCameraFocus] = useState<'pitch' | 'ball' | 'player'>('pitch');

  const handleToggleCameraFocus = () => {
    const next = engine.toggleCameraFocus();
    setCameraFocus(next);
    engine.setBanner(`CAMERA: ${next.toUpperCase()}`, 60);
    setBannerMessage(`CAMERA: ${next.toUpperCase()}`);
  };

  // Radar / Minimap settings state
  const [minimapMode, setMinimapMode] = useState<MinimapMode>(() => {
    try {
      const saved = localStorage.getItem('swos_minimap_mode');
      if (saved === 'solid' || saved === 'transparent' || saved === 'off') return saved;
    } catch {}
    return 'transparent';
  });

  const [minimapSonar, setMinimapSonar] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('swos_minimap_sonar');
      if (saved !== null) return saved === 'true';
    } catch {}
    return true; // Default to requested neon lights!
  });

  const [radarZoom, setRadarZoom] = useState<RadarZoom>(() => {
    try {
      const saved = localStorage.getItem('swos_radar_zoom');
      if (saved === 'full' || saved === 'zoom1' || saved === 'zoom2') return saved;
    } catch {}
    return 'full';
  });

  // HUD & Scoreboard settings state
  const [scoreboardMode, setScoreboardMode] = useState<HudDisplayMode>(() => {
    try {
      const saved = localStorage.getItem('swos_scoreboard_mode');
      if (saved === 'solid' || saved === 'transparent' || saved === 'off') return saved;
    } catch {}
    return 'solid';
  });

  const [specialActionTextMode, setSpecialActionTextMode] = useState<HudDisplayMode>(() => {
    try {
      const saved = localStorage.getItem('swos_action_text_mode');
      if (saved === 'solid' || saved === 'transparent' || saved === 'off') return saved;
    } catch {}
    return 'solid';
  });

  const [playerInfoMode, setPlayerInfoMode] = useState<HudDisplayMode>(() => {
    try {
      const saved = localStorage.getItem('swos_player_info_mode');
      if (saved === 'solid' || saved === 'transparent' || saved === 'off') return saved;
    } catch {}
    return 'solid';
  });

  // Controller deck customization state
  const [controllerBgMode, setControllerBgMode] = useState<ControllerBgMode>(() => {
    try {
      const saved = localStorage.getItem('swos_controller_bg_mode');
      if (saved === 'solid' || saved === 'transparent' || saved === 'floating') return saved;
    } catch {}
    return 'solid';
  });

  const [controllerTheme, setControllerTheme] = useState<ControllerTheme>(() => {
    try {
      const saved = localStorage.getItem('swos_controller_theme');
      if (saved === 'dark_blue' || saved === 'black' || saved === 'white' || saved === 'camo') return saved;
    } catch {}
    return 'dark_blue';
  });

  // Controlled Player Indicator settings state
  const [playerIndicatorType, setPlayerIndicatorType] = useState<PlayerIndicatorType>(() => {
    try {
      const saved = localStorage.getItem('swos_player_indicator_type');
      if (saved === 'small_arrow' || saved === 'big_arrow' || saved === 'circle') return saved;
    } catch {}
    return 'small_arrow';
  });

  const [playerIndicatorStyle, setPlayerIndicatorStyle] = useState<PlayerIndicatorStyle>(() => {
    try {
      const saved = localStorage.getItem('swos_player_indicator_style');
      if (saved === 'solid' || saved === 'transparent' || saved === 'off') return saved;
    } catch {}
    return 'solid';
  });

  const handlePlayerIndicatorTypeChange = (type: PlayerIndicatorType) => {
    setPlayerIndicatorType(type);
    try {
      localStorage.setItem('swos_player_indicator_type', type);
    } catch {}
  };

  const handlePlayerIndicatorStyleChange = (style: PlayerIndicatorStyle) => {
    setPlayerIndicatorStyle(style);
    try {
      localStorage.setItem('swos_player_indicator_style', style);
    } catch {}
  };

  // Control Mode state (Full Team vs 1-Player Be-A-Pro Lock)
  const [controlMode, setControlModeState] = useState<ControlMode>(() => {
    const loaded = loadControlMode();
    engine.setControlMode(loaded);
    return loaded;
  });

  const handleControlModeChange = (mode: ControlMode) => {
    setControlModeState(mode);
    engine.setControlMode(mode);
    saveControlMode(mode);
    if (mode === 'one_player') {
      const cp = engine.getControlledPlayer();
      engine.setBanner(`1-PLAYER MODE: LOCKED TO #${cp?.number || 10} ${cp?.name.toUpperCase() || 'PLAYER'}`, 90);
    } else {
      engine.setBanner('FULL TEAM MODE: STANDARD ARCADE SWITCHING', 90);
    }
  };

  // Arcade controller customization state (stick pos, buttons pos, deck size)
  const [controllerCustomization, setControllerCustomization] = useState<ControllerCustomization>(loadControllerCustomization);
  const handleControllerCustomizationChange = (custom: ControllerCustomization) => {
    setControllerCustomization(custom);
    saveControllerCustomization(custom);
  };

  // Custom Key Bindings state
  const [keyBindings, setKeyBindings] = useState<CustomKeyBindings>(loadKeyBindings);
  const handleKeyBindingsChange = (bindings: CustomKeyBindings) => {
    setKeyBindings(bindings);
    saveKeyBindings(bindings);
  };

  // Custom Gamepad Bindings state
  const [gamepadBindings, setGamepadBindings] = useState<GamepadBindings>(loadGamepadBindings);
  const handleGamepadBindingsChange = (bindings: GamepadBindings) => {
    setGamepadBindings(bindings);
    saveGamepadBindings(bindings);
  };

  // Gamepad / Joystick connection state
  const [isGamepadConnected, setIsGamepadConnected] = useState(false);
  const [gamepadName, setGamepadName] = useState('');
  const [isControllerSettingsOpen, setIsControllerSettingsOpen] = useState(false);

  // Graphics Pipeline & Retro Filters state (Phase 9)
  const [graphicsSettings, setGraphicsSettings] = useState<GraphicsSettings>(loadGraphicsSettings);
  const [isGraphicsSettingsOpen, setIsGraphicsSettingsOpen] = useState(false);

  const handleGraphicsSettingsChange = (updated: GraphicsSettings) => {
    setGraphicsSettings(updated);
    saveGraphicsSettings(updated);
  };

  const handleMinimapModeChange = (mode: MinimapMode) => {
    setMinimapMode(mode);
    try {
      localStorage.setItem('swos_minimap_mode', mode);
    } catch {}
  };

  const handleCycleMinimapMode = () => {
    const next: MinimapMode = minimapMode === 'transparent' ? 'solid' : minimapMode === 'solid' ? 'off' : 'transparent';
    handleMinimapModeChange(next);
  };

  const handleMinimapSonarChange = (sonar: boolean) => {
    setMinimapSonar(sonar);
    try {
      localStorage.setItem('swos_minimap_sonar', String(sonar));
    } catch {}
  };

  const handleToggleMinimapSonar = () => {
    handleMinimapSonarChange(!minimapSonar);
  };

  const handleRadarZoomChange = (zoom: RadarZoom) => {
    setRadarZoom(zoom);
    try {
      localStorage.setItem('swos_radar_zoom', zoom);
    } catch {}
  };

  const handleCycleRadarZoom = () => {
    const next: RadarZoom = radarZoom === 'full' ? 'zoom1' : radarZoom === 'zoom1' ? 'zoom2' : 'full';
    handleRadarZoomChange(next);
  };

  const handleScoreboardModeChange = (mode: HudDisplayMode) => {
    setScoreboardMode(mode);
    try {
      localStorage.setItem('swos_scoreboard_mode', mode);
    } catch {}
  };

  const handleSpecialActionTextModeChange = (mode: HudDisplayMode) => {
    setSpecialActionTextMode(mode);
    try {
      localStorage.setItem('swos_action_text_mode', mode);
    } catch {}
  };

  const handlePlayerInfoModeChange = (mode: HudDisplayMode) => {
    setPlayerInfoMode(mode);
    try {
      localStorage.setItem('swos_player_info_mode', mode);
    } catch {}
  };

  const handleControllerBgModeChange = (mode: ControllerBgMode) => {
    setControllerBgMode(mode);
    try {
      localStorage.setItem('swos_controller_bg_mode', mode);
    } catch {}
  };

  const handleControllerThemeChange = (theme: ControllerTheme) => {
    setControllerTheme(theme);
    try {
      localStorage.setItem('swos_controller_theme', theme);
    } catch {}
  };

  const handleToggleLanguage = () => {
    const nextLang: Language = currentLang === 'en' ? 'es' : 'en';
    setLanguage(nextLang);
    setCurrentLang(nextLang);
  };

  const handleGameSpeedChange = (speed: number) => {
    const clamped = Math.max(1, Math.min(200, Math.round(speed)));
    engine.gameSpeed = clamped;
    setGameSpeed(clamped);
  };

  const handleChangeHalfDuration = (dur: HalfDurationMinutes) => {
    engine.halfDurationMinutes = dur;
  };

  // Sync tick data to React state (throttled to 10 FPS for UI performance)
  const lastUiUpdateRef = useRef(0);
  const handleTick = useCallback(() => {
    const cp = engine.getControlledPlayer();
    const distToBall = Math.hypot(engine.ball.x - (cp?.x || 0), engine.ball.y - (cp?.y || 0));
    const isAiSetPiece = !!engine.setPiece && engine.setPiece.team !== 'home';
    const ownsBall = !isAiSetPiece && !!cp && (engine.ball.ownerId === cp.id || (!engine.ball.ownerId && distToBall < 26 && engine.ball.z < 8));
    setHasBall(ownsBall);
    setControlledPlayer(cp);

    const now = Date.now();
    if (now - lastUiUpdateRef.current > 90) {
      lastUiUpdateRef.current = now;
      setScore({ ...engine.score });
      setMatchTime(engine.matchTimeSeconds);
      setMatchPhase(engine.matchPhase);
      setBannerMessage(engine.bannerMessage);
      setIsPaused(engine.isPaused);
    }
  }, [engine]);

  // Direct action press/release callbacks with Q/E modifier support
  const handleActionPress = useCallback((action: 'pass' | 'shoot' | 'cross' | 'long_pass', modifier?: ActionModifier) => {
    engine.triggerActionPress(action, keysRef.current, modifier);
  }, [engine]);

  const handleActionRelease = useCallback((action: 'pass' | 'shoot' | 'cross' | 'long_pass', modifier?: ActionModifier) => {
    engine.triggerActionRelease(action, keysRef.current, modifier);
  }, [engine]);

  const handleModifierChange = useCallback((modifier: ActionModifier) => {
    engine.setActionModifier(modifier);
  }, [engine]);

  const handleDeflectionChange = useCallback((ratio: number) => {
    engine.analogSpeedRatio = ratio;
  }, [engine]);

  // Gamepad / Joystick API Polling Loop
  const gamepadPrevButtonsRef = useRef<{ [key: number]: boolean }>({});
  useEffect(() => {
    let animId: number;

    const onGamepadConnected = (e: GamepadEvent) => {
      setIsGamepadConnected(true);
      setGamepadName(e.gamepad.id);
      engine.setBanner(`🎮 JOYSTICK CONNECTED: ${e.gamepad.id.substring(0, 24)}`, 90);
    };

    const onGamepadDisconnected = () => {
      setIsGamepadConnected(false);
      setGamepadName('');
      engine.setBanner('🎮 JOYSTICK DISCONNECTED', 60);
    };

    window.addEventListener('gamepadconnected', onGamepadConnected);
    window.addEventListener('gamepaddisconnected', onGamepadDisconnected);

    const pollGamepads = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = gamepads[0] || gamepads[1];

      if (gp && !isPaused && !isPreMatchOpen && !isControllerSettingsOpen) {
        if (!isGamepadConnected) {
          setIsGamepadConnected(true);
          setGamepadName(gp.id);
        }

        const k = keysRef.current;
        const prev = gamepadPrevButtonsRef.current;

        // Directional Analog Stick & D-Pad
        const axisX = gp.axes[0] ?? 0;
        const axisY = gp.axes[1] ?? 0;
        const deadzone = 0.22;

        const dpadUp = gp.buttons[12]?.pressed;
        const dpadDown = gp.buttons[13]?.pressed;
        const dpadLeft = gp.buttons[14]?.pressed;
        const dpadRight = gp.buttons[15]?.pressed;

        k.ArrowLeft = axisX < -deadzone || !!dpadLeft;
        k.ArrowRight = axisX > deadzone || !!dpadRight;
        k.ArrowUp = axisY < -deadzone || !!dpadUp;
        k.ArrowDown = axisY > deadzone || !!dpadDown;

        // Actions mapping from gamepadBindings
        const checkAction = (btnIndex: number, actionName: 'pass' | 'shoot' | 'cross' | 'long_pass', keyKey: keyof KeyState) => {
          const isPressed = !!gp.buttons[btnIndex]?.pressed;
          const wasPressed = !!prev[btnIndex];

          if (isPressed && !wasPressed) {
            k[keyKey] = true;
            engine.triggerActionPress(actionName, k);
          } else if (!isPressed && wasPressed) {
            k[keyKey] = false;
            engine.triggerActionRelease(actionName, k);
          }
          prev[btnIndex] = isPressed;
        };

        checkAction(gamepadBindings.shortPass, 'pass', 'KeyS');
        checkAction(gamepadBindings.shoot, 'shoot', 'KeyA');
        checkAction(gamepadBindings.cross, 'cross', 'KeyD');
        checkAction(gamepadBindings.longPass, 'long_pass', 'KeyW');

        // Sprint
        const sprintPressed = !!gp.buttons[gamepadBindings.sprint]?.pressed;
        k.Shift = sprintPressed;
        prev[gamepadBindings.sprint] = sprintPressed;

        // Ginga / Def Switch / Auto-Pos
        const gingaPressed = !!gp.buttons[gamepadBindings.gingaSwitch]?.pressed;
        const wasGingaPressed = !!prev[gamepadBindings.gingaSwitch];
        k.Space = gingaPressed;
        if (gingaPressed && !wasGingaPressed) {
          const cp = engine.getControlledPlayer();
          const distToBall = cp ? Math.hypot(engine.ball.x - cp.x, engine.ball.y - cp.y) : 999;
          const cpHasBall = cp && (engine.ball.ownerId === cp.id || (!engine.ball.ownerId && distToBall < 26 && engine.ball.z < 8));
          if (!cpHasBall) {
            engine.switchControlToClosestDefender();
          }
        }
        prev[gamepadBindings.gingaSwitch] = gingaPressed;

        // Skill Q
        const skillQPressed = !!gp.buttons[gamepadBindings.skillQ]?.pressed;
        k.KeyQ = skillQPressed;
        prev[gamepadBindings.skillQ] = skillQPressed;

        // Skill E
        const skillEPressed = !!gp.buttons[gamepadBindings.skillE]?.pressed;
        k.KeyE = skillEPressed;
        prev[gamepadBindings.skillE] = skillEPressed;

        // Pause
        const pausePressed = !!gp.buttons[gamepadBindings.pause]?.pressed;
        const wasPausePressed = !!prev[gamepadBindings.pause];
        if (pausePressed && !wasPausePressed) {
          const paused = engine.togglePause();
          setIsPaused(paused);
        }
        prev[gamepadBindings.pause] = pausePressed;

        // Camera Focus
        const camPressed = !!gp.buttons[gamepadBindings.cameraFocus]?.pressed;
        const wasCamPressed = !!prev[gamepadBindings.cameraFocus];
        if (camPressed && !wasCamPressed) {
          handleToggleCameraFocus();
        }
        prev[gamepadBindings.cameraFocus] = camPressed;
      }

      // Phase 1.5: Multi-player Gamepad Polling (2P, 3P, 4P)
      if (!isPaused && !isPreMatchOpen && !isControllerSettingsOpen) {
        for (const slot of playerSlots) {
          if (slot.id === 1 || slot.side === 'spectator' || slot.device !== 'gamepad') continue;
          const padIdx = slot.gamepadIndex ?? (slot.id - 1);
          const pad = gamepads[padIdx];
          const sk = slotKeysRef.current[slot.id];
          if (!pad || !sk) continue;

          const padAxisX = pad.axes[0] ?? 0;
          const padAxisY = pad.axes[1] ?? 0;
          const padDeadzone = 0.22;
          const padDpadUp = pad.buttons[12]?.pressed;
          const padDpadDown = pad.buttons[13]?.pressed;
          const padDpadLeft = pad.buttons[14]?.pressed;
          const padDpadRight = pad.buttons[15]?.pressed;

          sk.ArrowLeft = padAxisX < -padDeadzone || !!padDpadLeft;
          sk.ArrowRight = padAxisX > padDeadzone || !!padDpadRight;
          sk.ArrowUp = padAxisY < -padDeadzone || !!padDpadUp;
          sk.ArrowDown = padAxisY > padDeadzone || !!padDpadDown;

          sk.KeyS = !!pad.buttons[gamepadBindings.shortPass]?.pressed;
          sk.KeyA = !!pad.buttons[gamepadBindings.shoot]?.pressed;
          sk.KeyD = !!pad.buttons[gamepadBindings.cross]?.pressed;
          sk.KeyW = !!pad.buttons[gamepadBindings.longPass]?.pressed;
          sk.Shift = !!pad.buttons[gamepadBindings.sprint]?.pressed;
          sk.Space = !!pad.buttons[gamepadBindings.gingaSwitch]?.pressed;
          sk.KeyQ = !!pad.buttons[gamepadBindings.skillQ]?.pressed;
          sk.KeyE = !!pad.buttons[gamepadBindings.skillE]?.pressed;
        }
      }

      animId = requestAnimationFrame(pollGamepads);
    };

    animId = requestAnimationFrame(pollGamepads);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('gamepadconnected', onGamepadConnected);
      window.removeEventListener('gamepaddisconnected', onGamepadDisconnected);
    };
  }, [engine, isPaused, isPreMatchOpen, isControllerSettingsOpen, gamepadBindings, isGamepadConnected, playerSlots]);

  // Keyboard Event Listeners with Custom Key Bindings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle Pause with Escape key
      if (e.code === 'Escape') {
        const paused = engine.togglePause();
        setIsPaused(paused);
        e.preventDefault();
        return;
      }

      // Disable default browser UI navigation during active gameplay
      // Menu navigation should rely strictly on touchpad or mouse pointer interaction
      if (document.activeElement instanceof HTMLElement && document.activeElement !== document.body) {
        document.activeElement.blur();
      }

      const code = e.code;
      const keyLower = e.key ? e.key.toLowerCase() : '';

      // Prevent default browser scrolling and button focus during gameplay
      const gameControlCodes = [
        'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab', 'Enter',
        'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'KeyP', 'KeyC', 'KeyL',
        'ShiftLeft', 'ShiftRight', keyBindings.longPass, keyBindings.shoot, keyBindings.shortPass,
        keyBindings.cross, keyBindings.cameraFocus, keyBindings.sprint, keyBindings.gingaSwitch, keyBindings.skillQ, keyBindings.skillE,
        keyBindings.moveUp, keyBindings.moveDown, keyBindings.moveLeft, keyBindings.moveRight
      ];
      if (gameControlCodes.includes(code) || e.key === ' ' || e.key === 'Shift' || e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
      }

      // Phase 15.3: Skip Pre-Match Sky-Cam Swoop Intro on Space, Enter, or any action key
      if (engine.isPreMatchSwoopActive()) {
        if (code === 'Space' || code === 'Enter' || code === 'KeyS' || code === 'KeyA' || e.key === ' ') {
          engine.skipPreMatchSwoop();
          e.preventDefault();
          return;
        }
      }

      const k = keysRef.current;

      const matches = (boundCode: string, defaultCode: string, altCodes: string[] = []) => {
        return code === boundCode || code === defaultCode || altCodes.includes(code);
      };

      // Camera Focus Switch (C Key Default, cycles Pitch -> Ball -> Player)
      if (matches(keyBindings.cameraFocus, 'KeyC', []) || keyLower === 'c') {
        handleToggleCameraFocus();
      }

      // Directional Movement
      else if (matches(keyBindings.moveUp, 'ArrowUp')) k.ArrowUp = true;
      else if (matches(keyBindings.moveDown, 'ArrowDown')) k.ArrowDown = true;
      else if (matches(keyBindings.moveLeft, 'ArrowLeft')) k.ArrowLeft = true;
      else if (matches(keyBindings.moveRight, 'ArrowRight')) k.ArrowRight = true;

      // Sprint
      else if (matches(keyBindings.sprint, 'ShiftLeft', ['ShiftRight', 'Shift']) || e.key === 'Shift') k.Shift = true;

      // Direct Goalkeeper Switch (Phase 3.1: G key)
      else if (code === 'KeyG' || keyLower === 'g') {
        const cp = engine.getControlledPlayer();
        const distToBall = cp ? Math.hypot(engine.ball.x - cp.x, engine.ball.y - cp.y) : 999;
        const cpHasBall = cp && (engine.ball.ownerId === cp.id || (!engine.ball.ownerId && distToBall < 26 && engine.ball.z < 8));
        if (!cpHasBall) {
          engine.switchControlToGoalkeeper(1);
        }
      }

      // Ginga / Defense Switch / Tactical Guide Toggle
      else if (matches(keyBindings.gingaSwitch, 'Space', []) || e.key === ' ' || e.key === 'Spacebar') {
        k.Space = true;
        // On defense: switch control or toggle tactical guide
        const cp = engine.getControlledPlayer();
        const distToBall = cp ? Math.hypot(engine.ball.x - cp.x, engine.ball.y - cp.y) : 999;
        const cpHasBall = cp && (engine.ball.ownerId === cp.id || (!engine.ball.ownerId && distToBall < 26 && engine.ball.z < 8));
        if (!cpHasBall) {
          engine.switchControlToClosestDefender();
        }
      }

      // Skills & Player Switch on Defense (Q / L1 / LB)
      else if (matches(keyBindings.skillQ, 'KeyQ', ['q']) || keyLower === 'q') {
        k.KeyQ = true;
        const cp = engine.getControlledPlayer();
        const distToBall = cp ? Math.hypot(engine.ball.x - cp.x, engine.ball.y - cp.y) : 999;
        const cpHasBall = cp && (engine.ball.ownerId === cp.id || (!engine.ball.ownerId && distToBall < 26 && engine.ball.z < 8));
        if (!cpHasBall) {
          engine.switchControlToClosestDefender(1);
        }
      }
      else if (matches(keyBindings.skillE, 'KeyE', ['e']) || keyLower === 'e') k.KeyE = true;

      // Pass (S or P):
      else if (matches(keyBindings.shortPass, 'KeyS', ['KeyP']) || keyLower === 's' || keyLower === 'p') {
        k.KeyS = true;
        engine.triggerActionPress('pass', k);
      }
      // Shoot (A):
      else if (matches(keyBindings.shoot, 'KeyA', []) || keyLower === 'a') {
        k.KeyA = true;
        engine.triggerActionPress('shoot', k);
      }
      // Cross (D):
      else if (matches(keyBindings.cross, 'KeyD', []) || keyLower === 'd') {
        k.KeyD = true;
        engine.triggerActionPress('cross', k);
      }
      // Long Pass (W or L):
      else if (matches(keyBindings.longPass, 'KeyW', ['KeyL']) || keyLower === 'w' || keyLower === 'l') {
        k.KeyW = true;
        engine.triggerActionPress('long_pass', k);
      }

      // Phase 1.5: Multi-Player 2P, 3P, 4P Keyboard Dispatch
      for (const slot of playerSlots) {
        if (slot.id > 1 && slot.device === 'keyboard' && slot.side !== 'spectator') {
          updateSlotKeyboardInput(slot, code, true, slotKeysRef.current);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      const keyLower = e.key ? e.key.toLowerCase() : '';

      const gameControlCodes = [
        'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab',
        'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'KeyP', 'KeyC', 'KeyL',
        'ShiftLeft', 'ShiftRight', keyBindings.longPass, keyBindings.shoot, keyBindings.shortPass,
        keyBindings.cross, keyBindings.cameraFocus, keyBindings.sprint, keyBindings.gingaSwitch, keyBindings.skillQ, keyBindings.skillE,
        keyBindings.moveUp, keyBindings.moveDown, keyBindings.moveLeft, keyBindings.moveRight
      ];
      if (gameControlCodes.includes(code) || e.key === ' ' || e.key === 'Shift') {
        e.preventDefault();
      }

      const k = keysRef.current;

      const matches = (boundCode: string, defaultCode: string, altCodes: string[] = []) => {
        return code === boundCode || code === defaultCode || altCodes.includes(code);
      };

      if (matches(keyBindings.moveUp, 'ArrowUp')) k.ArrowUp = false;
      else if (matches(keyBindings.moveDown, 'ArrowDown')) k.ArrowDown = false;
      else if (matches(keyBindings.moveLeft, 'ArrowLeft')) k.ArrowLeft = false;
      else if (matches(keyBindings.moveRight, 'ArrowRight')) k.ArrowRight = false;
      else if (matches(keyBindings.sprint, 'ShiftLeft', ['ShiftRight', 'Shift']) || e.key === 'Shift') k.Shift = false;
      else if (matches(keyBindings.gingaSwitch, 'Space', []) || e.key === ' ' || e.key === 'Spacebar') k.Space = false;
      else if (matches(keyBindings.skillQ, 'KeyQ', ['q']) || keyLower === 'q') k.KeyQ = false;
      else if (matches(keyBindings.skillE, 'KeyE', ['e']) || keyLower === 'e') k.KeyE = false;
      // Pass (S or P) - Latency-Free Execution on exact key release frame:
      else if (matches(keyBindings.shortPass, 'KeyS', ['KeyP']) || keyLower === 's' || keyLower === 'p') {
        k.KeyS = false;
        engine.triggerActionRelease('pass', k);
      }
      // Shoot (A) - Latency-Free Execution on exact key release frame:
      else if (matches(keyBindings.shoot, 'KeyA', []) || keyLower === 'a') {
        k.KeyA = false;
        engine.triggerActionRelease('shoot', k);
      }
      // Cross (D) - Latency-Free Execution on exact key release frame:
      else if (matches(keyBindings.cross, 'KeyD', []) || keyLower === 'd') {
        k.KeyD = false;
        engine.triggerActionRelease('cross', k);
      }
      // Long Pass (W or L) - Latency-Free Execution on exact key release frame:
      else if (matches(keyBindings.longPass, 'KeyW', ['KeyL']) || keyLower === 'w' || keyLower === 'l') {
        k.KeyW = false;
        engine.triggerActionRelease('long_pass', k);
      }

      // Phase 1.5: Multi-Player 2P, 3P, 4P Keyboard Dispatch
      for (const slot of playerSlots) {
        if (slot.id > 1 && slot.device === 'keyboard') {
          updateSlotKeyboardInput(slot, code, false, slotKeysRef.current);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [engine, keyBindings, playerSlots]);

  const handleTogglePause = () => {
    const nextPaused = engine.togglePause();
    setIsPaused(nextPaused);
  };

  const handleResetKickoff = () => {
    engine.resetToKickoff('home', false, true);
    setScore({ home: 0, away: 0 });
    setMatchTime(0);
    setMatchPhase('kickoff_ready');
    setIsPaused(false);
    setBannerMessage('MATCH RESET - 0-0 KICKOFF');
  };

  const handleChangeDifficulty = (newDiff: DifficultyLevel) => {
    engine.difficulty = newDiff;
    setDifficulty(newDiff);
  };

  const handleConfirmDeviceProfile = (config: {
    inputMethod: 'touch' | 'keyboard' | 'gamepad';
    controllerBgMode: ControllerBgMode;
    graphicsSettings: GraphicsSettings;
  }) => {
    // 1.5.3 Hardware Profiler Input Auto-Binding:
    // Bind recommendation directly to Player 1 slot and save to persistent settings
    const initialSlots: PlayerSlotConfig[] = [
      {
        id: 1,
        name: '1P',
        side: 'home',
        device: config.inputMethod,
        gamepadIndex: 0,
        color: '#38bdf8',
        keyBindings: DEFAULT_KEY_BINDINGS_1P,
      },
    ];
    engine.setPlayerSlots(initialSlots);
    setPlayerSlots(initialSlots);

    // Auto-adapt virtual deck visibility:
    // Choosing keyboard or gamepad automatically hides the virtual on-screen touch controller;
    // Choosing touch ensures the virtual arcade console is active and visible.
    const targetBgMode: ControllerBgMode =
      config.inputMethod === 'touch'
        ? (config.controllerBgMode === 'hidden' ? 'solid' : config.controllerBgMode)
        : 'hidden';

    handleControllerBgModeChange(targetBgMode);
    handleGraphicsSettingsChange(config.graphicsSettings);
    setIsDeviceProfilerOpen(false);

    if (appFlow === 'main_menu') {
      setIsMainMenuOpen(true);
    } else {
      setIsSideSelectOpen(true);
      setAppFlow('side_select');
    }
    engine.setBanner(`HARDWARE PROFILED: ${config.inputMethod.toUpperCase()} | ${config.graphicsSettings.tier.toUpperCase()} GRAPHICS`, 90);
  };

  const handleMainMenuAction = (action: MainMenuAction) => {
    switch (action) {
      case 'kick_off':
        setIsMainMenuOpen(false);
        setIsSideSelectOpen(true);
        setAppFlow('side_select');
        engine.setBanner('KICK OFF: SELECT SIDES & CONTROLLER PROFILE', 75);
        break;
      case 'settings':
        setIsMainMenuOpen(false);
        setSettingsInitialTab('graphics');
        setIsUnifiedSettingsOpen(true);
        setAppFlow('settings_menu');
        break;
      case 'editor_teams':
        setIsMainMenuOpen(false);
        setStartupTeamSide('home');
        setIsStartupTeamSelectOpen(true);
        setAppFlow('editor_teams');
        break;
      case 'editor_stadiums':
        setIsMainMenuOpen(false);
        setStadiumCreatorInitial(engine.activeStadium);
        setIsStadiumCreatorOpen(true);
        setAppFlow('editor_stadiums');
        engine.setBanner('32-BIT STADIUM CREATOR: ARCHITECT MODE', 75);
        break;
      case 'profiler':
        setIsMainMenuOpen(false);
        setIsDeviceProfilerOpen(true);
        setAppFlow('profiler');
        break;
    }
  };

  const handleSaveStadiumFromCreator = (savedStadium: StadiumDefinition) => {
    engine.applyStadium(savedStadium, false);
    syncStadiumConfigFromEngine();
    engine.setBanner(`STADIUM SAVED: ${savedStadium.name.toUpperCase()}`, 90);
  };

  const handleTestMatchdayFromCreator = (testStadium: StadiumDefinition) => {
    engine.applyStadium(testStadium, false);
    syncStadiumConfigFromEngine();
    setIsStadiumCreatorOpen(false);
    handleStartMatch({
      difficulty,
      halfDurationMinutes: engine.halfDurationMinutes,
      controlScope: controlMode === 'one_player' ? 'single_player' : 'all_team',
      lockedPlayerId: engine.lockedPlayerId || undefined,
      homeFormation: engine.homeFormation,
      awayFormation: engine.awayFormation,
      homePlaystyle: engine.homePlaystyle,
      awayPlaystyle: engine.awayPlaystyle,
      stadiumTier: engine.stadiumTier,
      timeOfDay: engine.timeOfDay,
      seatColor: engine.seatColor,
      pitchPreset: engine.pitchPreset,
      pitchLengthMeters: engine.pitchLengthMeters,
      pitchWidthMeters: engine.pitchWidthMeters,
      turfQuality: engine.turfQuality,
      grassLength: engine.grassLength,
      weather: engine.weather,
      season: engine.season,
      netTension: engine.netTension,
      goalFrame: engine.goalFrame,
      homeTeamId: engine.homeTeam.id,
      awayTeamId: engine.awayTeam.id,
    });
  };

  const handleReturnToMainMenu = () => {
    engine.isPaused = true;
    setIsPaused(true);
    setIsPreMatchOpen(false);
    setIsPresentationOpen(false);
    setIsGamePlanOpen(false);
    setIsStadiumOpen(false);
    setIsStadiumCreatorOpen(false);
    setIsUnifiedSettingsOpen(false);
    setIsControllerSettingsOpen(false);
    setIsGraphicsSettingsOpen(false);
    setIsSideSelectOpen(false);
    setIsStartupTeamSelectOpen(false);
    setIsDeviceProfilerOpen(false);
    setIsMainMenuOpen(true);
    setAppFlow('main_menu');
    engine.setBanner('MAIN MENU', 60);
  };

  const handleConfirmSideSelect = (
    newSlots: PlayerSlotConfig[],
    scope: ControlScope = 'all_team',
    lockedId?: string,
    cursorMode: CursorSwitchMode = 'manual'
  ) => {
    engine.setPlayerSlots(newSlots);
    setPlayerSlots(newSlots);

    // Phase 4.5.1: Instant Authoritative Controller Binding into GameEngine and React State
    const slot1 = newSlots.find((s) => s.id === 1);
    if (slot1) {
      if (slot1.device === 'keyboard') {
        const targetBindings =
          slot1.keyboardPreset === 'wasd'
            ? DEFAULT_KEY_BINDINGS_WASD
            : (slot1.keyBindings || DEFAULT_KEY_BINDINGS_1P);
        handleKeyBindingsChange(targetBindings);
      }

      // Phase 4.5.2: Control Scope (All Team vs Single Player Lock)
      if (scope === 'single_player' && lockedId) {
        engine.setControlMode('one_player');
        engine.setLockedPlayer(lockedId);
        setControlModeState('one_player');
      } else {
        engine.setControlMode('full_team');
        setControlModeState('full_team');
      }

      // Phase 4.5.3: Cursor Switch Mode (Manual vs Automatic)
      engine.cursorSwitchMode = cursorMode;
    }

    setIsSideSelectOpen(false);

    // Auto-adapt touch controller deck if any slot uses touch
    const hasTouchPlayer = newSlots.some((s) => s.device === 'touch');
    if (hasTouchPlayer) {
      if (controllerBgMode === 'hidden') {
        handleControllerBgModeChange('solid');
      }
    }

    if (appFlow === 'side_select' || appFlow === 'profiler') {
      setIsStartupTeamSelectOpen(true);
      setAppFlow('team_selector');
    } else {
      setIsPaused(false);
      engine.isPaused = false;
      engine.setBanner('CONTROLLER SIDES & PROFILE BOUND', 75);
    }
  };

  const handleSelectTeamFromStartup = (side: 'home' | 'away', team: TeamDefinition) => {
    // 1.5.2 Team Selector Immediate Persistence & Roster Synchronization
    engine.setTeam(side, team);
    setControlledPlayer(engine.getControlledPlayer());
    if (side === 'home') {
      syncStadiumConfigFromEngine();
    }
  };

  const handleStartMatch = (config: PreMatchConfig) => {
    engine.applyPreMatchConfig(config);
    if (config.controlScope === 'single_player' && config.lockedPlayerId) {
      engine.setControlMode('one_player');
      engine.setLockedPlayer(config.lockedPlayerId);
      setControlModeState('one_player');
    } else {
      engine.setControlMode('full_team');
      setControlModeState('full_team');
    }
    setDifficulty(config.difficulty);
    setScore({ home: 0, away: 0 });
    setMatchTime(0);
    setMatchPhase(engine.matchPhase);
    setBannerMessage(`MATCH COMMENCED: ${engine.homeTeam.name.toUpperCase()} VS ${engine.awayTeam.name.toUpperCase()}`);
    setIsPreMatchOpen(false);
    setIsPresentationOpen(false);
    setIsStartupTeamSelectOpen(false);
    setIsPaused(false);
    engine.isPaused = false;
    setAppFlow('in_match');
  };

  const handleApplyGamePlan = (plan: GamePlanPayload) => {
    engine.applyTacticalGamePlan(plan);
    setControlledPlayer(engine.getControlledPlayer());
    setBannerMessage(`GAME PLAN APPLIED: ${plan.homeFormation} (${plan.homePlaystyle.toUpperCase()})`);
  };

  const handleTouchKeyChange = (key: keyof KeyState, pressed: boolean) => {
    keysRef.current[key] = pressed;
  };

  // Phase 1: Regulation Halves, Stoppage & End-Game Hub Handlers
  const handleStartSecondHalf = () => {
    engine.startSecondHalf();
    setIsPaused(false);
    setMatchPhase(engine.matchPhase);
    setMatchTime(engine.matchTimeSeconds);
  };

  const handleStartETSecondHalf = () => {
    engine.startExtraTimeSecondHalf();
    setIsPaused(false);
    setMatchPhase(engine.matchPhase);
    setMatchTime(engine.matchTimeSeconds);
  };

  const handleRematch = () => {
    engine.applyPreMatchConfig({
      halfDurationMinutes: engine.halfDurationMinutes,
      homeFormation: engine.homeFormation,
      awayFormation: engine.awayFormation,
      homePlaystyle: engine.homePlaystyle,
      awayPlaystyle: engine.awayPlaystyle,
      homeTactics: engine.homeTactics,
      awayTactics: engine.awayTactics,
      difficulty: difficulty,
      stadiumTier: engine.stadiumTier,
      timeOfDay: engine.timeOfDay,
      seatColor: engine.seatColor,
      pitchPreset: engine.pitchPreset,
      pitchLengthMeters: engine.pitchLengthMeters,
      pitchWidthMeters: engine.pitchWidthMeters,
      turfQuality: engine.turfQuality,
      grassLength: engine.grassLength,
      mowingPattern: engine.mowingPattern,
      surfaceStatus: engine.surfaceStatus,
      weather: engine.weather,
      season: engine.season,
      netTension: engine.netTension,
      goalFrame: engine.goalFrame,
      homeTeamId: engine.homeTeam.id,
      awayTeamId: engine.awayTeam.id,
      customHomeKit: engine.homeKit,
      customAwayKit: engine.awayKit,
      lockedPlayerId: engine.lockedPlayerId || undefined,
    });
    engine.isPaused = false;
    setIsPaused(false);
    setScore({ home: 0, away: 0 });
    setMatchTime(0);
    setMatchPhase('kickoff_ready');
  };

  const handleTeamSelectionFromEndGame = () => {
    engine.isPaused = true;
    setIsPaused(true);
    setStartupTeamSide('home');
    setIsStartupTeamSelectOpen(true);
    setAppFlow('team_selector');
  };

  const handleOpenSettingsFromEndGame = () => {
    setSettingsInitialTab('match_hud');
    setIsUnifiedSettingsOpen(true);
  };

  const handleStartExtraTime = () => {
    engine.startExtraTime();
    setIsPaused(false);
    setMatchPhase(engine.matchPhase);
    setMatchTime(engine.matchTimeSeconds);
  };

  const handleStartPenalties = () => {
    engine.startPenaltyShootout();
    setIsPaused(false);
    setMatchPhase(engine.matchPhase);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#07131e] select-none">
      {/* FULL-VIEWPORT 2D CANVAS FOOTBALL FIELD (100% SCREEN COVERAGE) */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <PitchCanvas
          engine={engine}
          keysRef={keysRef}
          slotKeysRef={slotKeysRef}
          onTick={handleTick}
          playerIndicatorType={playerIndicatorType}
          playerIndicatorStyle={playerIndicatorStyle}
          graphicsSettings={graphicsSettings}
          controllerBgMode={controllerBgMode}
        />
        {/* PHASE 9: ZERO-LAG HARDWARE COMPOSITED RETRO FILTER OVERLAY */}
        <RetroFilterOverlay filter={graphicsSettings.activeFilter} />
      </div>

      {/* PHASE 3: MODERN LOWERED SET-PIECE AIMING RETICLE, BEND DIAL & TIMING POWER METER OVERLAY */}
      <SetPieceOverlay engine={engine} keysRef={keysRef} />

      {/* 32-BIT RETRO SCOREBOARD, DRAWSTAR TV & BOTTOM-LEFT PLAYER INFO / SPECIAL ACTION TEXT */}
      <MatchHUD
        score={score}
        matchTimeSeconds={matchTime}
        matchPhase={matchPhase}
        bannerMessage={bannerMessage}
        controlledPlayer={controlledPlayer}
        controlledPlayerRating={engine.getControlledPlayerRating()}
        scoreboardMode={scoreboardMode}
        specialActionTextMode={specialActionTextMode}
        playerInfoMode={playerInfoMode}
        onOpenPreMatch={() => setIsPreMatchOpen(true)}
        onOpenPresentation={() => setIsPresentationOpen(true)}
        onOpenGraphicsSettings={() => setIsGraphicsSettingsOpen(true)}
        homeTeam={engine.homeTeam}
        awayTeam={engine.awayTeam}
        stoppageTimeDisplay={engine.stoppageTimeDisplay}
        currentHalf={engine.currentHalf}
        currentPeriod={engine.currentPeriod}
      />

      {/* 32-BIT RETRO RADAR MINIMAP AT BOTTOM RIGHT ABOVE CONTROLLER */}
      <RadarMinimap
        engine={engine}
        mode={minimapMode}
        sonar={minimapSonar}
        zoom={radarZoom}
        focusTarget={cameraFocus}
        onCycleMode={handleCycleMinimapMode}
        onToggleSonar={handleToggleMinimapSonar}
        onCycleZoom={handleCycleRadarZoom}
      />

      {/* 32-BIT ARCADE CONSOLE CONTROLLER DOCKED AT THE BOTTOM OVERLAYING PITCH */}
      <div className="absolute bottom-0 left-0 right-0 z-30 pointer-events-auto">
        <ArcadeConsole
          keys={keysRef.current}
          hasBall={hasBall}
          onKeyChange={handleTouchKeyChange}
          onActionPress={handleActionPress}
          onActionRelease={handleActionRelease}
          onModifierChange={handleModifierChange}
          onDeflectionChange={handleDeflectionChange}
          onTogglePause={handleTogglePause}
          isPaused={isPaused}
          controllerBgMode={controllerBgMode}
          controllerTheme={controllerTheme}
          cameraFocus={cameraFocus}
          onToggleCameraFocus={handleToggleCameraFocus}
          controllerCustomization={controllerCustomization}
          controlMode={controlMode}
          isGamepadConnected={isGamepadConnected}
          gamepadName={gamepadName}
          onOpenControllerSettings={() => setIsControllerSettingsOpen(true)}
        />
      </div>

      {/* PAUSE & HALFTIME MODAL (All match options, 32-bit style) */}
      <PauseModal
        isOpen={isPaused && matchPhase !== 'full_time'}
        onResume={handleTogglePause}
        onResetKickoff={handleResetKickoff}
        isHalfTime={matchPhase === 'half_time'}
        isExtraTimeHalf={matchPhase === 'extra_time_half'}
        onStartSecondHalf={handleStartSecondHalf}
        onStartETSecondHalf={handleStartETSecondHalf}
        stoppageTimeMinutes={engine.currentHalf === 1 ? engine.firstHalfStoppageMinutes : engine.secondHalfStoppageMinutes}
        currentHalf={engine.currentHalf}
        currentPeriod={engine.currentPeriod}
        matchTimeSeconds={matchTime}
        onOpenPreMatch={() => {
          setIsPaused(false);
          setIsPreMatchOpen(true);
        }}
        onOpenPresentation={() => {
          setIsPaused(false);
          setIsPresentationOpen(true);
        }}
        onOpenGamePlan={() => {
          setIsPaused(false);
          setIsGamePlanOpen(true);
        }}
        onOpenSideSelect={() => {
          setIsPaused(false);
          setIsSideSelectOpen(true);
        }}
        onOpenSettings={() => {
          setIsPaused(false);
          setSettingsInitialTab('match_hud');
          setIsUnifiedSettingsOpen(true);
        }}
        homeScore={score.home}
        awayScore={score.away}
        homeTeamName={engine.homeTeam.name}
        awayTeamName={engine.awayTeam.name}
        homeTeamBadge={engine.homeTeam.badge?.icon || engine.homeTeam.badge?.text}
        awayTeamBadge={engine.awayTeam.badge?.icon || engine.awayTeam.badge?.text}
        currentLang={currentLang}
        onToggleLanguage={handleToggleLanguage}
        difficulty={difficulty}
        onChangeDifficulty={handleChangeDifficulty}
        gameSpeed={gameSpeed}
        onChangeGameSpeed={handleGameSpeedChange}
        minimapMode={minimapMode}
        onChangeMinimapMode={handleMinimapModeChange}
        minimapSonar={minimapSonar}
        onChangeMinimapSonar={handleMinimapSonarChange}
        radarZoom={radarZoom}
        onChangeRadarZoom={handleRadarZoomChange}
        scoreboardMode={scoreboardMode}
        onChangeScoreboardMode={handleScoreboardModeChange}
        specialActionTextMode={specialActionTextMode}
        onChangeSpecialActionTextMode={handleSpecialActionTextModeChange}
        playerInfoMode={playerInfoMode}
        onChangePlayerInfoMode={handlePlayerInfoModeChange}
        controllerBgMode={controllerBgMode}
        onChangeControllerBgMode={handleControllerBgModeChange}
        controllerTheme={controllerTheme}
        onChangeControllerTheme={handleControllerThemeChange}
        playerIndicatorType={playerIndicatorType}
        onChangePlayerIndicatorType={handlePlayerIndicatorTypeChange}
        playerIndicatorStyle={playerIndicatorStyle}
        onChangePlayerIndicatorStyle={handlePlayerIndicatorStyleChange}
        controlMode={controlMode}
        onChangeControlMode={handleControlModeChange}
        onOpenControllerSettings={() => {
          setIsPaused(false);
          setIsControllerSettingsOpen(true);
        }}
        onOpenGraphicsSettings={() => {
          setIsPaused(false);
          setIsGraphicsSettingsOpen(true);
        }}
        graphicsSettings={graphicsSettings}
        isGamepadConnected={isGamepadConnected}
        gamepadName={gamepadName}
        homePlayers={engine.players.filter(p => p.team === 'home')}
        lockedPlayerId={engine.lockedPlayerId}
        onSelectLockedPlayer={(id) => {
          engine.setLockedPlayer(id);
          setControlledPlayer(engine.getControlledPlayer());
        }}
        stadiumTier={engine.stadiumTier}
        onChangeStadiumTier={(tier) => {
          engine.setStadiumTier(tier);
        }}
        timeOfDay={engine.timeOfDay}
        onChangeTimeOfDay={(time) => {
          engine.setTimeOfDay(time);
        }}
        seatColor={engine.seatColor}
        onChangeSeatColor={(color) => {
          engine.setSeatColor(color);
        }}
        turfQuality={engine.turfQuality}
        onChangeTurfQuality={(quality) => {
          engine.setTurfQuality(quality);
        }}
        grassLength={engine.grassLength}
        onChangeGrassLength={(length) => {
          engine.setGrassLength(length);
        }}
        weather={engine.weather}
        onChangeWeather={(weather) => {
          engine.setWeather(weather);
        }}
        season={engine.season}
        onChangeSeason={(season) => {
          engine.setSeason(season);
        }}
        netTension={engine.netTension}
        onChangeNetTension={(tension) => {
          engine.setNetTension(tension);
        }}
        goalFrame={engine.goalFrame}
        onChangeGoalFrame={(frame) => {
          engine.setGoalFrame(frame);
        }}
        onOpenMainMenu={handleReturnToMainMenu}
      />

      {/* 32-BIT RETRO FULL-TIME END-GAME HUB (PHASE 1) */}
      <EndGameModal
        isOpen={matchPhase === 'full_time'}
        homeScore={score.home}
        awayScore={score.away}
        homeTeamName={engine.homeTeam.name}
        awayTeamName={engine.awayTeam.name}
        homeTeamBadge={engine.homeTeam.badge?.icon || engine.homeTeam.badge?.text}
        awayTeamBadge={engine.awayTeam.badge?.icon || engine.awayTeam.badge?.text}
        homeKitColor={engine.homeKit.primaryColor}
        awayKitColor={engine.awayKit.primaryColor}
        stats={engine.matchStats}
        playerRatings={engine.playerRatings.getAllRatings()}
        matchMvp={engine.playerRatings.getMatchMvp()}
        isDraw={score.home === score.away}
        isExtraTimeAvailable={engine.currentPeriod === '2nd_half'}
        matchPeriod={engine.currentPeriod === 'extra_time_2' ? '120:00' : '90:00'}
        onRematch={handleRematch}
        onTeamSelection={handleTeamSelectionFromEndGame}
        onOpenSettings={handleOpenSettingsFromEndGame}
        onMainMenu={handleReturnToMainMenu}
        onStartExtraTime={handleStartExtraTime}
        onStartPenalties={handleStartPenalties}
      />

      {/* CONTROLLER & BUTTON ASSIGNMENT MODAL */}
      <ControllerSettingsModal
        isOpen={isControllerSettingsOpen}
        onClose={() => setIsControllerSettingsOpen(false)}
        controlMode={controlMode}
        onChangeControlMode={handleControlModeChange}
        controllerCustomization={controllerCustomization}
        onChangeControllerCustomization={handleControllerCustomizationChange}
        keyBindings={keyBindings}
        onChangeKeyBindings={handleKeyBindingsChange}
        gamepadBindings={gamepadBindings}
        onChangeGamepadBindings={handleGamepadBindingsChange}
        isGamepadConnected={isGamepadConnected}
        gamepadName={gamepadName}
      />

      {/* GRAPHICS & RETRO FILTERS MODAL (PHASE 9) */}
      <GraphicsSettingsModal
        isOpen={isGraphicsSettingsOpen}
        onClose={() => setIsGraphicsSettingsOpen(false)}
        settings={graphicsSettings}
        onChangeSettings={handleGraphicsSettingsChange}
      />

      {/* PRE-MATCH SETUP & TACTICS MODAL */}
      <PreMatchModal
        isOpen={isPreMatchOpen}
        isMidMatch={matchTime > 0 || score.home > 0 || score.away > 0}
        onStartMatch={handleStartMatch}
        onApplyTacticsMidMatch={(cfg) => {
          engine.applyTacticsMidMatch(cfg);
          if (cfg.difficulty) setDifficulty(cfg.difficulty);
          setIsPreMatchOpen(false);
          setIsPaused(false);
        }}
        onUpdatePlayerPlaystyle={(playerId, playstyle) => {
          engine.setPlayerPlaystyle(playerId, playstyle);
        }}
        onClose={() => setIsPreMatchOpen(false)}
        onOpenPresentation={() => {
          setIsPreMatchOpen(false);
          setIsPresentationOpen(true);
        }}
        onOpenGamePlan={() => {
          setIsPreMatchOpen(false);
          setIsGamePlanOpen(true);
        }}
        initialConfig={{
          halfDurationMinutes: engine.halfDurationMinutes,
          homeFormation: engine.homeFormation,
          awayFormation: engine.awayFormation,
          homePlaystyle: engine.homePlaystyle,
          awayPlaystyle: engine.awayPlaystyle,
          homeTactics: engine.homeTactics,
          awayTactics: engine.awayTactics,
          difficulty: difficulty,
          stadiumTier: engine.stadiumTier,
          timeOfDay: engine.timeOfDay,
          seatColor: engine.seatColor,
          pitchPreset: engine.pitchPreset,
          pitchLengthMeters: engine.pitchLengthMeters,
          pitchWidthMeters: engine.pitchWidthMeters,
          turfQuality: engine.turfQuality,
          grassLength: engine.grassLength,
          weather: engine.weather,
          season: engine.season,
          netTension: engine.netTension,
          goalFrame: engine.goalFrame,
          homeTeamId: engine.homeTeam.id,
          awayTeamId: engine.awayTeam.id,
        }}
      />

      {/* 32-BIT STARTUP HARDWARE PROFILER & KEY ALLOCATION MODAL (PHASE 0.3) */}
      <DeviceProfilerModal
        isOpen={isDeviceProfilerOpen}
        onConfirm={handleConfirmDeviceProfile}
        currentGraphicsSettings={graphicsSettings}
      />

      {/* 32-BIT SIDE CHOICE & MULTI-PLAYER CONTROLLER ASSIGNMENT HUB (PHASE 1.5 & PHASE 4.5) */}
      <SideSelectModal
        isOpen={isSideSelectOpen}
        onConfirm={handleConfirmSideSelect}
        onClose={() => {
          setIsSideSelectOpen(false);
          if (appFlow === 'side_select' || (matchTime === 0 && score.home === 0 && score.away === 0)) {
            setIsMainMenuOpen(true);
            setAppFlow('main_menu');
          } else if (matchTime > 0 || score.home > 0 || score.away > 0) {
            setIsPaused(true);
          }
        }}
        initialPlayers={playerSlots}
        isMidMatch={matchTime > 0 || score.home > 0 || score.away > 0}
        homeTeamName={engine.homeTeam.name}
        awayTeamName={engine.awayTeam.name}
        homeTeamBadge={engine.homeTeam.badge?.icon || engine.homeTeam.badge?.text}
        awayTeamBadge={engine.awayTeam.badge?.icon || engine.awayTeam.badge?.text}
        homePlayers={engine.players.filter((p) => p.team === 'home')}
        awayPlayers={engine.players.filter((p) => p.team === 'away')}
        initialControlScope={controlMode === 'one_player' ? 'single_player' : 'all_team'}
        initialLockedPlayerId={engine.lockedPlayerId || undefined}
        initialCursorSwitchMode={engine.cursorSwitchMode}
      />

      {/* 32-BIT STARTUP TEAM SELECTION MODAL (BOOT SCREEN) */}
      <TeamSelectorModal
        isOpen={isStartupTeamSelectOpen}
        side={startupTeamSide}
        currentTeamId={startupTeamSide === 'home' ? engine.homeTeam.id : engine.awayTeam.id}
        onSelectTeam={handleSelectTeamFromStartup}
        onSideChange={(s) => setStartupTeamSide(s)}
        onClose={() => {
          setIsStartupTeamSelectOpen(false);
          if (appFlow === 'editor_teams') {
            setIsMainMenuOpen(true);
            setAppFlow('main_menu');
          } else {
            setIsPresentationOpen(true);
            setAppFlow('presentation');
          }
        }}
      />

      {/* 32-BIT PRE-MATCH PRESENTATION & CAPTAINS MENU (PHASE 0 & 14) */}
      <PreMatchPresentationModal
        isOpen={isPresentationOpen}
        onClose={() => setIsPresentationOpen(false)}
        onOpenMainMenu={handleReturnToMainMenu}
        onBackToTeamSelector={() => {
          setIsPresentationOpen(false);
          setStartupTeamSide('home');
          setIsStartupTeamSelectOpen(true);
          setAppFlow('team_selector');
        }}
        onStartMatch={(config) => {
          handleStartMatch(config);
          setIsPresentationOpen(false);
        }}
        onOpenDetailedSettings={() => {
          setIsPresentationOpen(false);
          setIsPreMatchOpen(true);
        }}
        onOpenStadium={() => {
          setIsPresentationOpen(false);
          setIsStadiumOpen(true);
        }}
        onOpenGamePlan={() => {
          setIsPresentationOpen(false);
          setIsGamePlanOpen(true);
        }}
        onOpenSettings={() => {
          setIsPresentationOpen(false);
          setSettingsInitialTab('graphics');
          setIsUnifiedSettingsOpen(true);
        }}
        onSelectTeam={(side, selected) => {
          engine.setTeam(side, selected);
          setControlledPlayer(engine.getControlledPlayer());
          if (side === 'home') {
            syncStadiumConfigFromEngine();
          }
        }}
        initialHomeTeamId={engine.homeTeam.id}
        initialAwayTeamId={engine.awayTeam.id}
        initialDifficulty={difficulty}
        initialHalfDuration={engine.halfDurationMinutes}
        stadiumConfig={stadiumConfig}
        controlScope={controlMode === 'one_player' ? 'single_player' : 'all_team'}
        initialLockedPlayerId={engine.lockedPlayerId || undefined}
        cursorSwitchMode={engine.cursorSwitchMode}
      />

      {/* PHASE 15: DUAL-PITCH 32-BIT TACTICAL GAME PLAN MODAL */}
      <TacticalGamePlanModal
        isOpen={isGamePlanOpen}
        onClose={() => {
          setIsGamePlanOpen(false);
          if (matchTime === 0 && score.home === 0 && score.away === 0) {
            setIsPresentationOpen(true);
          }
        }}
        initialHomeTeam={engine.homeTeam}
        initialAwayTeam={engine.awayTeam}
        initialHomeFormation={engine.homeFormation}
        initialAwayFormation={engine.awayFormation}
        initialHomePlaystyle={engine.homePlaystyle}
        initialAwayPlaystyle={engine.awayPlaystyle}
        initialHomeTactics={engine.homeTactics}
        initialAwayTactics={engine.awayTactics}
        initialHomeRoles={engine.homeTeam.roles}
        initialAwayRoles={engine.awayTeam.roles}
        onApplyGamePlan={handleApplyGamePlan}
        isMidMatch={matchTime > 0 || score.home > 0 || score.away > 0}
      />

      {/* PHASE 17.1 & 17.2: DEDICATED STADIUM ATMOSPHERE & PITCH CUSTOMIZATION SUITE */}
      <StadiumSelectorModal
        isOpen={isStadiumOpen}
        onClose={() => {
          setIsStadiumOpen(false);
          if (appFlow === 'editor_stadiums') {
            setIsMainMenuOpen(true);
            setAppFlow('main_menu');
          } else if (matchTime === 0 && score.home === 0 && score.away === 0) {
            setIsPresentationOpen(true);
          }
        }}
        config={stadiumConfig}
        onChangeConfig={handleUpdateStadiumConfig}
        homeTeam={engine.homeTeam}
        awayTeam={engine.awayTeam}
        onApplyAndClose={(cfg) => {
          handleUpdateStadiumConfig(cfg);
          setIsStadiumOpen(false);
          if (appFlow === 'editor_stadiums') {
            setIsMainMenuOpen(true);
            setAppFlow('main_menu');
          } else if (matchTime === 0 && score.home === 0 && score.away === 0) {
            setIsPresentationOpen(true);
          }
        }}
        onOpenStadiumCreator={(std) => {
          setIsStadiumOpen(false);
          setStadiumCreatorInitial(std || engine.activeStadium);
          setIsStadiumCreatorOpen(true);
        }}
      />

      {/* PHASE 14: INTERACTIVE 32-BIT STADIUM CREATOR & STAND CAMERA DIRECTOR SUITE */}
      <StadiumCreatorModal
        isOpen={isStadiumCreatorOpen}
        onClose={() => {
          setIsStadiumCreatorOpen(false);
          if (appFlow === 'editor_stadiums') {
            setIsMainMenuOpen(true);
            setAppFlow('main_menu');
          } else if (matchTime === 0 && score.home === 0 && score.away === 0) {
            setIsPresentationOpen(true);
          }
        }}
        onSaveStadium={handleSaveStadiumFromCreator}
        onTestMatchday={handleTestMatchdayFromCreator}
        initialStadium={stadiumCreatorInitial || engine.activeStadium}
      />

      {/* PHASE 17.1 & 17.3: UNIFIED 32-BIT SETTINGS MODAL (GRAPHICS, CONTROLS, MATCH/HUD) */}
      <UnifiedSettingsModal
        isOpen={isUnifiedSettingsOpen}
        onClose={() => {
          setIsUnifiedSettingsOpen(false);
          if (appFlow === 'settings_menu') {
            setIsMainMenuOpen(true);
            setAppFlow('main_menu');
          } else if (matchTime === 0 && score.home === 0 && score.away === 0 && !isPaused) {
            setIsPresentationOpen(true);
          }
        }}
        graphicsSettings={graphicsSettings}
        onChangeGraphicsSettings={handleGraphicsSettingsChange}
        controlMode={controlMode}
        onChangeControlMode={handleControlModeChange}
        controllerCustomization={controllerCustomization}
        onChangeControllerCustomization={handleControllerCustomizationChange}
        keyBindings={keyBindings}
        onChangeKeyBindings={handleKeyBindingsChange}
        gamepadBindings={gamepadBindings}
        onChangeGamepadBindings={handleGamepadBindingsChange}
        isGamepadConnected={isGamepadConnected}
        gamepadName={gamepadName}
        controllerBgMode={controllerBgMode}
        onChangeControllerBgMode={handleControllerBgModeChange}
        controllerTheme={controllerTheme}
        onChangeControllerTheme={handleControllerThemeChange}
        halfDuration={engine.halfDurationMinutes}
        onChangeHalfDuration={handleChangeHalfDuration}
        gameSpeed={gameSpeed}
        onChangeGameSpeed={handleGameSpeedChange}
        difficulty={difficulty}
        onChangeDifficulty={handleChangeDifficulty}
        scoreboardMode={scoreboardMode}
        onChangeScoreboardMode={handleScoreboardModeChange}
        specialActionTextMode={specialActionTextMode}
        onChangeSpecialActionTextMode={handleSpecialActionTextModeChange}
        playerInfoMode={playerInfoMode}
        onChangePlayerInfoMode={handlePlayerInfoModeChange}
        playerIndicatorType={playerIndicatorType}
        onChangePlayerIndicatorType={handlePlayerIndicatorTypeChange}
        playerIndicatorStyle={playerIndicatorStyle}
        onChangePlayerIndicatorStyle={handlePlayerIndicatorStyleChange}
        minimapMode={minimapMode}
        onChangeMinimapMode={handleMinimapModeChange}
        minimapSonar={minimapSonar}
        onChangeMinimapSonar={handleMinimapSonarChange}
        radarZoom={radarZoom}
        onChangeRadarZoom={handleRadarZoomChange}
        initialTab={settingsInitialTab}
      />

      {/* PHASE 13.1: 32-BIT ARCADE MAIN MENU SYSTEM (LAUNCH HUB) */}
      <MainMenuModal
        isOpen={isMainMenuOpen}
        onAction={handleMainMenuAction}
        homeTeam={engine.homeTeam}
        awayTeam={engine.awayTeam}
        activeStadium={engine.activeStadium}
        playerSlots={playerSlots}
        graphicsSettings={graphicsSettings}
        difficulty={difficulty}
        halfDurationMinutes={engine.halfDurationMinutes}
      />
    </div>
  );
}
