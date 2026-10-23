/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RetroFilterType } from '../types';

interface RetroFilterOverlayProps {
  filter: RetroFilterType;
}

export const RetroFilterOverlay: React.FC<RetroFilterOverlayProps> = ({ filter }) => {
  if (filter === 'none') return null;

  return (
    <div className="retro-filter-container pointer-events-none select-none">
      {filter === 'crt_arcade' && (
        <>
          <div className="filter-crt-overlay" />
          <div className="absolute top-2 left-3 font-['Press_Start_2P'] text-[8px] text-emerald-400/60 tracking-wider pointer-events-none">
            [CH-03 • 60Hz RGB]
          </div>
        </>
      )}

      {filter === 'vhs_1994' && (
        <>
          <div className="filter-vhs-overlay" />
          <div className="filter-vhs-tracking-bar" />
          <div className="absolute top-3 left-4 font-['Press_Start_2P'] text-[9px] text-white/80 drop-shadow-[0_2px_4px_rgba(0,0,0,1)] tracking-widest pointer-events-none">
            PLAY ▶ <span className="text-amber-300 ml-2">SP 0:14:26</span>
          </div>
          <div className="absolute top-3 right-4 font-['Press_Start_2P'] text-[8px] text-red-500/80 tracking-widest pointer-events-none animate-pulse">
            ● REC
          </div>
        </>
      )}

      {filter === 'neo_geo_16bit' && (
        <>
          <div className="filter-neogeo-overlay" />
          <div className="absolute bottom-2 left-3 font-['Press_Start_2P'] text-[7px] text-amber-300/60 tracking-wider pointer-events-none">
            PRO-GEAR SPEC • 330 MEGA
          </div>
        </>
      )}

      {filter === 'vintage_1954' && (
        <>
          <div className="filter-vintage-overlay" />
          <div className="absolute top-2 right-3 font-['Press_Start_2P'] text-[7px] text-amber-200/50 tracking-widest pointer-events-none">
            BERN 1954 • ARCHIVE
          </div>
        </>
      )}

      {filter === 'manga_tsubasa' && (
        <>
          <div className="filter-manga-overlay" />
          <div className="absolute top-2 left-3 font-['Press_Start_2P'] text-[8px] text-rose-400/80 tracking-widest pointer-events-none">
            ⚡ DRIVE SHOOT!
          </div>
        </>
      )}

      {filter === 'cyberpunk_neon' && (
        <>
          <div className="filter-cyberpunk-overlay" />
          <div className="absolute top-2 left-3 font-['Press_Start_2P'] text-[7px] text-cyan-400/70 tracking-widest pointer-events-none">
            // CYBER-PITCH 2099 //
          </div>
        </>
      )}

      {filter === 'cinematic_35mm' && (
        <div className="filter-cinematic-overlay">
          <div className="cinematic-letterbox-bar-top" />
          <div className="cinematic-letterbox-bar-bottom" />
        </div>
      )}
    </div>
  );
};
