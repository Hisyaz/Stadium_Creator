/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ControllerCustomization, CustomKeyBindings, GamepadBindings, ControlMode, DEFAULT_KEY_BINDINGS_WASD } from '../types';
export { DEFAULT_KEY_BINDINGS_WASD };

export const DEFAULT_CONTROLLER_CUSTOMIZATION: ControllerCustomization = {
  stickSide: 'left',
  stickScale: 1.0,
  stickOffsetX: 0,
  stickOffsetY: 0,
  buttonsLayout: 'diamond',
  buttonsSpacing: 1.0,
  buttonsOffsetX: 0,
  buttonsOffsetY: 0,
  deckHeight: 145,
  deckScale: 1.0,
  deckOpacity: 1.0,
};

export const DEFAULT_KEY_BINDINGS: CustomKeyBindings = {
  longPass: 'KeyW',
  shoot: 'KeyA',
  shortPass: 'KeyS',
  cross: 'KeyD',
  sprint: 'ShiftLeft',
  gingaSwitch: 'Space',
  skillQ: 'KeyQ',
  skillE: 'KeyE',
  moveUp: 'ArrowUp',
  moveDown: 'ArrowDown',
  moveLeft: 'ArrowLeft',
  moveRight: 'ArrowRight',
  cameraFocus: 'KeyC',
};

export const DEFAULT_GAMEPAD_BINDINGS: GamepadBindings = {
  shortPass: 0,   // A / Cross
  cross: 1,       // B / Circle
  shoot: 2,       // X / Square
  longPass: 3,    // Y / Triangle
  gingaSwitch: 4, // L1 / LB
  sprint: 5,      // R1 / RB
  skillQ: 6,      // L2 / LT
  skillE: 7,      // R2 / RT
  cameraFocus: 8, // Select / Share / Back
  pause: 9,       // Start / Options
};

export function loadControllerCustomization(): ControllerCustomization {
  try {
    const raw = localStorage.getItem('swos_controller_customization');
    if (raw) {
      return { ...DEFAULT_CONTROLLER_CUSTOMIZATION, ...JSON.parse(raw) };
    }
  } catch {}
  return DEFAULT_CONTROLLER_CUSTOMIZATION;
}

export function saveControllerCustomization(config: ControllerCustomization) {
  try {
    localStorage.setItem('swos_controller_customization', JSON.stringify(config));
  } catch {}
}

export function loadKeyBindings(): CustomKeyBindings {
  try {
    const raw = localStorage.getItem('swos_custom_key_bindings');
    if (raw) {
      return { ...DEFAULT_KEY_BINDINGS, ...JSON.parse(raw) };
    }
  } catch {}
  return DEFAULT_KEY_BINDINGS;
}

export function saveKeyBindings(bindings: CustomKeyBindings) {
  try {
    localStorage.setItem('swos_custom_key_bindings', JSON.stringify(bindings));
  } catch {}
}

export function loadGamepadBindings(): GamepadBindings {
  try {
    const raw = localStorage.getItem('swos_gamepad_bindings');
    if (raw) {
      return { ...DEFAULT_GAMEPAD_BINDINGS, ...JSON.parse(raw) };
    }
  } catch {}
  return DEFAULT_GAMEPAD_BINDINGS;
}

export function saveGamepadBindings(bindings: GamepadBindings) {
  try {
    localStorage.setItem('swos_gamepad_bindings', JSON.stringify(bindings));
  } catch {}
}

export function loadControlMode(): ControlMode {
  try {
    const raw = localStorage.getItem('swos_control_mode') as ControlMode;
    if (raw === 'full_team' || raw === 'one_player') {
      return raw;
    }
  } catch {}
  return 'full_team';
}

export function saveControlMode(mode: ControlMode) {
  try {
    localStorage.setItem('swos_control_mode', mode);
  } catch {}
}

export function loadCursorSwitchMode(): 'manual' | 'automatic' {
  try {
    const raw = localStorage.getItem('swos_cursor_switch_mode');
    if (raw === 'manual' || raw === 'automatic') {
      return raw;
    }
  } catch {}
  return 'manual';
}

export function saveCursorSwitchMode(mode: 'manual' | 'automatic') {
  try {
    localStorage.setItem('swos_cursor_switch_mode', mode);
  } catch {}
}

export function loadControlScope(): 'all_team' | 'single_player' {
  try {
    const raw = localStorage.getItem('swos_control_scope');
    if (raw === 'all_team' || raw === 'single_player') {
      return raw;
    }
  } catch {}
  return 'all_team';
}

export function saveControlScope(scope: 'all_team' | 'single_player') {
  try {
    localStorage.setItem('swos_control_scope', scope);
  } catch {}
}

export function formatKeyDisplay(code: string): string {
  if (!code) return 'None';
  if (code.startsWith('Key')) return code.substring(3);
  if (code.startsWith('Digit')) return code.substring(5);
  if (code === 'ShiftLeft' || code === 'ShiftRight' || code === 'Shift') return 'Shift';
  if (code === 'Space') return 'Spacebar';
  if (code === 'ArrowUp') return '↑ Up';
  if (code === 'ArrowDown') return '↓ Down';
  if (code === 'ArrowLeft') return '← Left';
  if (code === 'ArrowRight') return '→ Right';
  if (code === 'ControlLeft' || code === 'ControlRight') return 'Ctrl';
  if (code === 'AltLeft' || code === 'AltRight') return 'Alt';
  return code;
}

export function formatGamepadButtonDisplay(btnIndex: number): string {
  switch (btnIndex) {
    case 0: return 'Button 0 (A / ✕)';
    case 1: return 'Button 1 (B / ○)';
    case 2: return 'Button 2 (X / □)';
    case 3: return 'Button 3 (Y / △)';
    case 4: return 'Button 4 (LB / L1)';
    case 5: return 'Button 5 (RB / R1)';
    case 6: return 'Button 6 (LT / L2)';
    case 7: return 'Button 7 (RT / R2)';
    case 8: return 'Button 8 (Back / Select)';
    case 9: return 'Button 9 (Start / Options)';
    case 10: return 'Button 10 (L-Stick Click)';
    case 11: return 'Button 11 (R-Stick Click)';
    case 12: return 'D-Pad Up';
    case 13: return 'D-Pad Down';
    case 14: return 'D-Pad Left';
    case 15: return 'D-Pad Right';
    default: return `Button ${btnIndex}`;
  }
}
