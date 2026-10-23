/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  TeamDefinition,
  TeamKit,
  ModularKitSelection,
  KitSlot,
  getTeamKitOptions,
  resolveModularKit,
  detectKitClash,
} from '../types';
import { Shirt, RefreshCw, AlertTriangle, Check, Layers } from 'lucide-react';
import { PixelKitIcon } from './TacticalPitchBoard';

interface ModularKitMixerProps {
  team: TeamDefinition;
  opponentTeam?: TeamDefinition;
  selection: ModularKitSelection;
  onChangeSelection: (newSelection: ModularKitSelection) => void;
  opponentKit?: TeamKit;
  side: 'home' | 'away';
}

export const ModularKitMixer: React.FC<ModularKitMixerProps> = ({
  team,
  opponentTeam,
  selection,
  onChangeSelection,
  opponentKit,
  side,
}) => {
  const kitOptions = getTeamKitOptions(team);
  const activeResolvedKit = resolveModularKit(team, selection);

  const clash = opponentKit ? detectKitClash(activeResolvedKit, opponentKit) : null;

  const handleSetPreset = (slot: KitSlot) => {
    const presetName = slot === 0 ? '1st' : slot === 1 ? '2nd' : '3rd';
    onChangeSelection({
      preset: presetName,
      shirtSlot: slot,
      shortsSlot: slot,
      socksSlot: slot,
    });
  };

  const handleUpdatePart = (part: 'shirtSlot' | 'shortsSlot' | 'socksSlot', slot: KitSlot) => {
    onChangeSelection({
      ...selection,
      preset: 'custom',
      [part]: slot,
    });
  };

  const handleAutoResolveClash = () => {
    if (!opponentKit) return;
    // Find combination with least clash
    let bestSelection: ModularKitSelection = { ...selection };
    let bestClashScore = Infinity;

    const slots: KitSlot[] = [0, 1, 2];
    for (const sh of slots) {
      for (const so of slots) {
        for (const sk of slots) {
          const testKit = resolveModularKit(team, {
            preset: 'custom',
            shirtSlot: sh,
            shortsSlot: so,
            socksSlot: sk,
          });
          const testAnalysis = detectKitClash(testKit, opponentKit);
          let score = 0;
          if (testAnalysis.hasShirtClash) score += 10;
          if (testAnalysis.hasShortsClash) score += 5;
          if (score < bestClashScore) {
            bestClashScore = score;
            bestSelection = {
              preset: 'custom',
              shirtSlot: sh,
              shortsSlot: so,
              socksSlot: sk,
            };
          }
        }
      }
    }

    onChangeSelection(bestSelection);
  };

  return (
    <div className="bg-slate-900/90 border-2 border-slate-700/80 rounded-xl p-4 flex flex-col gap-3 shadow-xl backdrop-blur-md">
      {/* Header & Preset Toggles */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <Shirt className="w-4 h-4 text-amber-400" />
          <span className="font-['Press_Start_2P'] text-[11px] text-white tracking-wider">
            MODULAR KIT MIXER
          </span>
          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
            {side.toUpperCase()}
          </span>
        </div>

        {/* 1st / 2nd / 3rd Preset Buttons */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          {(['1st', '2nd', '3rd'] as const).map((label, idx) => {
            const isPresetActive =
              selection.preset === label ||
              (selection.shirtSlot === idx &&
                selection.shortsSlot === idx &&
                selection.socksSlot === idx);
            return (
              <button
                key={label}
                type="button"
                onClick={() => handleSetPreset(idx as KitSlot)}
                className={`px-2.5 py-1 text-[10px] font-['Press_Start_2P'] rounded transition-all flex items-center gap-1.5 ${
                  isPresetActive
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span>{label}</span>
                <span
                  className="w-2 h-2 rounded-full border border-black/40"
                  style={{ backgroundColor: kitOptions[idx].primaryColor }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Granular Mix-and-Match Rows */}
      <div className="space-y-2">
        {/* SHIRT SELECTOR */}
        <div className="flex items-center justify-between bg-slate-950/60 px-3 py-2 rounded-lg border border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-300 w-16">SHIRT</span>
            <div
              className="w-4 h-4 rounded border border-white/20 shadow-inner"
              style={{ backgroundColor: kitOptions[selection.shirtSlot].primaryColor }}
              title={kitOptions[selection.shirtSlot].name}
            />
            <span className="text-[11px] text-slate-400 truncate max-w-[120px]">
              {kitOptions[selection.shirtSlot].name}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {kitOptions.map((k, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleUpdatePart('shirtSlot', idx as KitSlot)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all p-0.5 ${
                  selection.shirtSlot === idx
                    ? 'border-amber-400 bg-amber-950/40 ring-2 ring-amber-400/50 scale-105'
                    : 'border-slate-800 bg-slate-900/60 opacity-70 hover:opacity-100 hover:border-slate-600'
                }`}
                title={`${idx + 1}st Shirt (${k.name})`}
              >
                <PixelKitIcon
                  primaryColor={k.primaryColor}
                  secondaryColor={k.secondaryColor}
                  className="w-6 h-6"
                />
              </button>
            ))}
          </div>
        </div>

        {/* SHORTS SELECTOR */}
        <div className="flex items-center justify-between bg-slate-950/60 px-3 py-2 rounded-lg border border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-300 w-16">SHORTS</span>
            <div
              className="w-4 h-4 rounded border border-white/20 shadow-inner"
              style={{ backgroundColor: kitOptions[selection.shortsSlot].shortsColor }}
              title={kitOptions[selection.shortsSlot].name}
            />
            <span className="text-[11px] text-slate-400 truncate max-w-[120px]">
              {kitOptions[selection.shortsSlot].name}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {kitOptions.map((k, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleUpdatePart('shortsSlot', idx as KitSlot)}
                className={`w-7 h-7 rounded flex items-center justify-center border transition-all ${
                  selection.shortsSlot === idx
                    ? 'border-amber-400 ring-2 ring-amber-400/30 scale-105'
                    : 'border-slate-700 opacity-60 hover:opacity-100'
                }`}
                style={{ backgroundColor: k.shortsColor }}
                title={`${idx + 1}st Shorts (${k.name})`}
              >
                {selection.shortsSlot === idx && (
                  <Check className="w-3.5 h-3.5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* SOCKS SELECTOR */}
        <div className="flex items-center justify-between bg-slate-950/60 px-3 py-2 rounded-lg border border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-300 w-16">SOCKS</span>
            <div
              className="w-4 h-4 rounded border border-white/20 shadow-inner"
              style={{ backgroundColor: kitOptions[selection.socksSlot].socksColor }}
              title={kitOptions[selection.socksSlot].name}
            />
            <span className="text-[11px] text-slate-400 truncate max-w-[120px]">
              {kitOptions[selection.socksSlot].name}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {kitOptions.map((k, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleUpdatePart('socksSlot', idx as KitSlot)}
                className={`w-7 h-7 rounded flex items-center justify-center border transition-all ${
                  selection.socksSlot === idx
                    ? 'border-amber-400 ring-2 ring-amber-400/30 scale-105'
                    : 'border-slate-700 opacity-60 hover:opacity-100'
                }`}
                style={{ backgroundColor: k.socksColor }}
                title={`${idx + 1}st Socks (${k.name})`}
              >
                {selection.socksSlot === idx && (
                  <Check className="w-3.5 h-3.5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CLASH WARNING & AUTO-RESOLVE */}
      {clash && clash.isHighClashRisk && (
        <div className="mt-1 bg-amber-500/15 border border-amber-500/40 rounded-lg p-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
            <span className="text-[10px] text-amber-200 leading-tight">
              {clash.warningMessage || 'Kit clash detected with opponent.'}
            </span>
          </div>
          <button
            type="button"
            onClick={handleAutoResolveClash}
            className="px-2.5 py-1 text-[9px] font-['Press_Start_2P'] bg-amber-500 text-slate-950 rounded hover:bg-amber-400 transition-colors shrink-0 flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            RESOLVE
          </button>
        </div>
      )}

      {/* Combined Kit Summary Footer */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/80 pt-2">
        <span className="flex items-center gap-1 font-mono">
          <Layers className="w-3 h-3 text-slate-500" />
          {selection.preset === 'custom' ? 'CUSTOM HYBRID MATRIX' : `${selection.preset.toUpperCase()} OFFICIAL UNIFORM`}
        </span>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full border border-black/40" style={{ backgroundColor: activeResolvedKit.primaryColor }} />
          <span className="w-2.5 h-2.5 rounded-full border border-black/40" style={{ backgroundColor: activeResolvedKit.shortsColor }} />
          <span className="w-2.5 h-2.5 rounded-full border border-black/40" style={{ backgroundColor: activeResolvedKit.socksColor }} />
        </div>
      </div>
    </div>
  );
};
