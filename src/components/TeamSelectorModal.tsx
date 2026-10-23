/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  TeamDefinition,
  TeamCategory,
  Confederation,
  RatingTier,
} from '../types/team';
import {
  TEAM_DATABASE,
  getAllTeams,
  getTeamById,
  getCategories,
  getConfederations,
  getCountries,
  getLeagues,
  getTeamsByFilter,
  getRandomTeam,
  calculatePlayerOvr,
} from '../game/teams';
import {
  Dices,
  Shield,
  Trophy,
  Globe,
  Sparkles,
  Check,
  ChevronRight,
  X,
  Flame,
  Award,
  Users,
  Target,
  ArrowRight,
  Search,
} from 'lucide-react';
import { getAttributeStatBreakName, isStatBreak } from '../game/playerStats';

interface TeamSelectorModalProps {
  isOpen: boolean;
  side: 'home' | 'away';
  currentTeamId: string;
  onSelectTeam: (side: 'home' | 'away', team: TeamDefinition) => void;
  onClose: () => void;
  onSideChange?: (side: 'home' | 'away') => void;
}

export const TeamSelectorModal: React.FC<TeamSelectorModalProps> = ({
  isOpen,
  side,
  currentTeamId,
  onSelectTeam,
  onClose,
  onSideChange,
}) => {
  const [activeSide, setActiveSide] = useState<'home' | 'away'>(side);

  useEffect(() => {
    setActiveSide(side);
  }, [side]);

  const currentTeam = getTeamById(currentTeamId);

  // Drill-down step states:
  // - Clubs: 1 = Category, 2 = Continent, 3 = Country, 4 = League, 5 = Club
  // - National Teams: 1 = Category, 2 = Continent, 3 = Country, 4 = Squad
  // - Special Teams: 1 = Category, 2 = Special Teams (direct listing)
  const [selectedCategory, setSelectedCategory] = useState<TeamCategory>(currentTeam.category);
  const [selectedConfederation, setSelectedConfederation] = useState<Confederation>(currentTeam.confederation);
  const [selectedCountry, setSelectedCountry] = useState<string>(currentTeam.country);
  const [selectedLeague, setSelectedLeague] = useState<string>(currentTeam.league || '');
  const [selectedTeam, setSelectedTeam] = useState<TeamDefinition>(currentTeam);
  const [drillStep, setDrillStep] = useState<number>(() => {
    if (currentTeam.category === 'special') return 2;
    if (currentTeam.category === 'national') return 4;
    return 5; // club
  });
  const [viewMode, setViewMode] = useState<'drill' | 'all'>('drill');
  const [searchQuery, setSearchQuery] = useState('');
  const [showRoster, setShowRoster] = useState(false);

  // Randomizer roulette state
  const [isRandomizing, setIsRandomizing] = useState(false);
  const [rouletteTeam, setRouletteTeam] = useState<TeamDefinition | null>(null);

  useEffect(() => {
    const t = getTeamById(currentTeamId);
    setSelectedTeam(t);
    setSelectedCategory(t.category);
    setSelectedConfederation(t.confederation);
    setSelectedCountry(t.country);
    if (t.league) setSelectedLeague(t.league);
    if (t.category === 'special') setDrillStep(2);
    else if (t.category === 'national') setDrillStep(4);
    else setDrillStep(5);
  }, [currentTeamId, activeSide]);

  if (!isOpen) return null;

  // Immediate selection and authoritative engine synchronization (Phase 1.5.2)
  const handleSelectAndSync = (team: TeamDefinition) => {
    setSelectedTeam(team);
    onSelectTeam(activeSide, team);
  };

  // 🎲 One-Click Instant Random Team Selector
  const handleRandomRoll = () => {
    if (isRandomizing) return;
    setIsRandomizing(true);

    const all = getAllTeams();
    let rollCount = 0;
    const maxRolls = 10;
    const interval = setInterval(() => {
      rollCount++;
      const rand = all[Math.floor(Math.random() * all.length)];
      setRouletteTeam(rand);

      if (rollCount >= maxRolls) {
        clearInterval(interval);
        const finalTeam = getRandomTeam();
        handleSelectAndSync(finalTeam);
        setSelectedCategory(finalTeam.category);
        setSelectedConfederation(finalTeam.confederation);
        setSelectedCountry(finalTeam.country);
        if (finalTeam.league) setSelectedLeague(finalTeam.league);
        if (finalTeam.category === 'special') setDrillStep(2);
        else if (finalTeam.category === 'national') setDrillStep(4);
        else setDrillStep(5);
        setIsRandomizing(false);
        setRouletteTeam(null);
      }
    }, 60);
  };

  const handleConfirmTeam = (team: TeamDefinition) => {
    onSelectTeam(activeSide, team);
    onClose();
  };

  const categories = getCategories();
  const availableConfeds = getConfederations(selectedCategory);
  const availableCountries = getCountries(selectedCategory, selectedConfederation);
  const availableLeagues = getLeagues(selectedCategory, selectedConfederation, selectedCountry);
  const filteredTeams = getTeamsByFilter(
    selectedCategory,
    selectedCategory === 'special' ? undefined : selectedConfederation,
    selectedCategory === 'special' ? undefined : selectedCountry,
    selectedCategory === 'club' ? selectedLeague : undefined
  );

  const allTeamsFiltered = getAllTeams().filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.shortName.toLowerCase().includes(q) ||
      t.country.toLowerCase().includes(q) ||
      (t.league && t.league.toLowerCase().includes(q)) ||
      t.ratingTier.toLowerCase().includes(q)
    );
  });

  const getTierBadgeStyle = (tier: RatingTier) => {
    switch (tier) {
      case 'S':
        return 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-black border-amber-300 font-extrabold shadow-[0_0_12px_rgba(251,191,36,0.6)]';
      case 'A':
        return 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white border-emerald-400 font-bold shadow-[0_0_8px_rgba(16,185,129,0.4)]';
      case 'B':
        return 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-400 font-bold';
      case 'C':
        return 'bg-gradient-to-r from-stone-600 to-stone-500 text-white border-stone-400 font-semibold';
    }
  };

  const getTierStars = (tier: RatingTier) => {
    switch (tier) {
      case 'S':
        return '⭐⭐⭐⭐⭐';
      case 'A':
        return '⭐⭐⭐⭐';
      case 'B':
        return '⭐⭐⭐';
      case 'C':
        return '⭐⭐';
    }
  };

  const activeDisplayTeam = rouletteTeam || selectedTeam;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5 select-none">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border-2 border-slate-700/80 rounded-xl shadow-2xl overflow-hidden font-sans text-white">
        {/* TOP BAR / HEADER */}
        <div className={`flex items-center justify-between px-3 sm:px-4 py-2.5 border-b ${activeSide === 'home' ? 'bg-blue-950/80 border-blue-500/40' : 'bg-rose-950/80 border-rose-500/40'}`}>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => {
                  setActiveSide('home');
                  onSideChange?.('home');
                }}
                className={`px-2.5 py-1 text-[10px] sm:text-xs font-black uppercase rounded transition-all cursor-pointer ${
                  activeSide === 'home'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🔵 HOME
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveSide('away');
                  onSideChange?.('away');
                }}
                className={`px-2.5 py-1 text-[10px] sm:text-xs font-black uppercase rounded transition-all cursor-pointer ${
                  activeSide === 'away'
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🔴 AWAY
              </button>
            </div>
            <h2 className="text-xs sm:text-sm font-black tracking-wide text-white uppercase hidden sm:flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>TEAM SELECTION</span>
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* 🎲 INSTANT RANDOM TEAM BUTTON */}
            <button
              onClick={handleRandomRoll}
              disabled={isRandomizing}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 ${
                isRandomizing
                  ? 'bg-amber-500 text-black animate-pulse cursor-wait'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black hover:shadow-[0_0_15px_rgba(245,158,11,0.6)] cursor-pointer'
              }`}
              title="Pick a random team instantly!"
            >
              <Dices className={`w-4 h-4 ${isRandomizing ? 'animate-spin' : ''}`} />
              <span>{isRandomizing ? 'ROLLING...' : '🎲 RANDOM'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* NAVIGATION MODE BAR & CATEGORY-AWARE BREADCRUMBS */}
        <div className="bg-slate-950/90 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('drill')}
              className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'drill' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Hierarchical Drill-Down
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'all' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Teams ({getAllTeams().length})
            </button>
          </div>

          {/* Breadcrumbs for Drill-Down Mode */}
          {viewMode === 'drill' && (
            <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-semibold">
              <button
                onClick={() => setDrillStep(1)}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors whitespace-nowrap ${
                  drillStep === 1 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'text-slate-400 hover:text-white'
                }`}
              >
                1. Category ({selectedCategory === 'club' ? 'CLUBS' : selectedCategory === 'national' ? 'NATIONAL' : 'SPECIAL'})
              </button>

              {/* SPECIAL PATH: Direct 2-step (Category -> All Special Teams) */}
              {selectedCategory === 'special' && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <button
                    onClick={() => setDrillStep(2)}
                    className={`px-2 py-0.5 rounded cursor-pointer transition-colors whitespace-nowrap ${
                      drillStep === 2 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    2. Special Teams ({getAllTeams().filter(t => t.category === 'special').length})
                  </button>
                </>
              )}

              {/* NATIONAL PATH: 4-step (Category -> Continent -> Country -> National Squad) */}
              {selectedCategory === 'national' && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <button
                    onClick={() => setDrillStep(2)}
                    className={`px-2 py-0.5 rounded cursor-pointer transition-colors whitespace-nowrap ${
                      drillStep === 2 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    2. Continent ({selectedConfederation.toUpperCase()})
                  </button>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <button
                    onClick={() => setDrillStep(3)}
                    className={`px-2 py-0.5 rounded cursor-pointer transition-colors whitespace-nowrap ${
                      drillStep === 3 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    3. Country ({selectedCountry})
                  </button>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <button
                    onClick={() => setDrillStep(4)}
                    className={`px-2 py-0.5 rounded cursor-pointer transition-colors whitespace-nowrap ${
                      drillStep === 4 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    4. National Squad
                  </button>
                </>
              )}

              {/* CLUBS PATH: 5-step (Category -> Continent -> Country -> League -> Club) */}
              {selectedCategory === 'club' && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <button
                    onClick={() => setDrillStep(2)}
                    className={`px-2 py-0.5 rounded cursor-pointer transition-colors whitespace-nowrap ${
                      drillStep === 2 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    2. Continent ({selectedConfederation.toUpperCase()})
                  </button>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <button
                    onClick={() => setDrillStep(3)}
                    className={`px-2 py-0.5 rounded cursor-pointer transition-colors whitespace-nowrap ${
                      drillStep === 3 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    3. Country ({selectedCountry})
                  </button>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <button
                    onClick={() => setDrillStep(4)}
                    className={`px-2 py-0.5 rounded cursor-pointer transition-colors whitespace-nowrap ${
                      drillStep === 4 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    4. League ({selectedLeague ? (selectedLeague.length > 16 ? selectedLeague.slice(0, 14) + '...' : selectedLeague) : 'League'})
                  </button>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <button
                    onClick={() => setDrillStep(5)}
                    className={`px-2 py-0.5 rounded cursor-pointer transition-colors whitespace-nowrap ${
                      drillStep === 5 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    5. Club
                  </button>
                </>
              )}
            </div>
          )}

          {/* Search bar in All Teams mode */}
          {viewMode === 'all' && (
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search team, country, league, tier..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          )}
        </div>

        {/* MAIN BODY: SPLIT VIEW (SELECTION PANELS + ACTIVE TEAM CARD) */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* LEFT 7 COLS: STEP PICKER OR GRID */}
          <div className="md:col-span-7 flex flex-col gap-3">
            {viewMode === 'drill' ? (
              <>
                {/* STEP 1: CATEGORY SELECTION (Clubs, National Teams, Special) */}
                {drillStep === 1 && (
                  <div className="flex flex-col gap-2">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                      Step 1: Select Category
                    </h3>
                    <div className="grid grid-cols-1 gap-2.5">
                      {categories.map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => {
                            setSelectedCategory(cat.id);
                            if (cat.id === 'special') {
                              // Special: see all special teams listed directly without more than that
                              const specials = getTeamsByFilter('special');
                              if (specials.length > 0) setSelectedTeam(specials[0]);
                              setDrillStep(2);
                            } else if (cat.id === 'national') {
                              // National: pick continent, then country, and that's it
                              const confeds = getConfederations('national');
                              if (confeds.length > 0) {
                                setSelectedConfederation(confeds[0].id);
                                const countries = getCountries('national', confeds[0].id);
                                if (countries.length > 0) setSelectedCountry(countries[0]);
                              }
                              setDrillStep(2);
                            } else {
                              // Club: pick continent, then country, then league, then club
                              const confeds = getConfederations('club');
                              if (confeds.length > 0) {
                                setSelectedConfederation(confeds[0].id);
                                const countries = getCountries('club', confeds[0].id);
                                if (countries.length > 0) {
                                  setSelectedCountry(countries[0]);
                                  const leagues = getLeagues('club', confeds[0].id, countries[0]);
                                  if (leagues.length > 0) setSelectedLeague(leagues[0]);
                                }
                              }
                              setDrillStep(2);
                            }
                          }}
                          className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                            selectedCategory === cat.id
                              ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg'
                              : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600 text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{cat.icon}</span>
                            <div>
                              <div className="font-bold text-sm">{cat.label}</div>
                              <div className="text-xs text-slate-400">
                                {cat.id === 'special'
                                  ? `${cat.count} All-Time Continental Showcase squads (Direct View)`
                                  : cat.id === 'national'
                                  ? `${cat.count} International squads (Continent → Country)`
                                  : `${cat.count} Domestic clubs (Continent → Country → League)`}
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-500" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ========================================================================= */}
                {/* SPECIAL CATEGORY: DIRECT LISTING (Step 2)                                 */}
                {/* "if you pick special you see all special teams listed, without more"     */}
                {/* ========================================================================= */}
                {selectedCategory === 'special' && drillStep === 2 && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-amber-400" />
                          <span>Special Teams — All-Time Continental Showcase ({filteredTeams.length})</span>
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Complete suite of global dream teams and legendary continental lineups.
                        </p>
                      </div>
                      <button
                        onClick={() => setDrillStep(1)}
                        className="text-xs text-blue-400 hover:underline cursor-pointer"
                      >
                        ← Back to Categories
                      </button>
                    </div>

                    <div className="flex flex-col gap-2.5 mt-1">
                      {filteredTeams.map(t => {
                        const isSelected = selectedTeam.id === t.id;
                        return (
                          <div
                            key={t.id}
                            onClick={() => handleSelectAndSync(t)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                              isSelected
                                ? 'bg-gradient-to-r from-amber-950/60 via-slate-800/80 to-slate-900 border-amber-500 shadow-md ring-1 ring-amber-400'
                                : 'bg-slate-800/50 border-slate-700/70 hover:bg-slate-800 hover:border-slate-600'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="w-11 h-11 rounded-lg flex items-center justify-center font-black text-sm shadow border border-white/20"
                                style={{ backgroundColor: t.badge.bg, color: t.badge.primaryColor }}
                              >
                                {t.badge.icon}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-black text-sm text-white">{t.name}</span>
                                  <span className={`px-1.5 py-0.2 text-[10px] uppercase rounded border ${getTierBadgeStyle(t.ratingTier)}`}>
                                    TIER {t.ratingTier}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                                  <span>{t.preferredFormation}</span>
                                  <span>•</span>
                                  <span className="capitalize">{t.tacticalPlaystyle.replace('_', ' ')}</span>
                                  <span>•</span>
                                  <span className="text-amber-300 font-bold">{t.averageOvr} OVR</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="flex items-center -space-x-1">
                                <div
                                  className="w-4 h-4 rounded-full border border-slate-900 shadow-sm"
                                  style={{ backgroundColor: t.kit.primaryColor }}
                                  title="Home Kit"
                                />
                                <div
                                  className="w-4 h-4 rounded-full border border-slate-900 shadow-sm"
                                  style={{ backgroundColor: t.awayKit.primaryColor }}
                                  title="Away Kit"
                                />
                              </div>

                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  handleConfirmTeam(t);
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-transform active:scale-95 cursor-pointer ${
                                  isSelected
                                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                    : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                                }`}
                              >
                                {isSelected ? 'Confirm ✓' : 'Select'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ========================================================================= */}
                {/* NATIONAL TEAMS: CONTINENT -> COUNTRY -> SQUAD                             */}
                {/* "if you pick national team, pick continent, then country and that's it"    */}
                {/* ========================================================================= */}

                {/* NATIONAL STEP 2: CONTINENT / CONFEDERATION */}
                {selectedCategory === 'national' && drillStep === 2 && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                        Step 2: Select Continent / Confederation
                      </h3>
                      <button
                        onClick={() => setDrillStep(1)}
                        className="text-xs text-blue-400 hover:underline cursor-pointer"
                      >
                        ← Back to Categories
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-2.5">
                      {availableConfeds.map(c => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setSelectedConfederation(c.id);
                            const countries = getCountries('national', c.id);
                            if (countries.length > 0) setSelectedCountry(countries[0]);
                            setDrillStep(3);
                          }}
                          className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                            selectedConfederation === c.id
                              ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg'
                              : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600 text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Globe className="w-6 h-6 text-blue-400" />
                            <div>
                              <div className="font-bold text-sm">{c.label}</div>
                              <div className="text-xs text-slate-400">{c.region} ({c.count} squad{c.count > 1 ? 's' : ''})</div>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-500" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* NATIONAL STEP 3: COUNTRY */}
                {selectedCategory === 'national' && drillStep === 3 && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                        Step 3: Select Country ({selectedConfederation.toUpperCase()})
                      </h3>
                      <button
                        onClick={() => setDrillStep(2)}
                        className="text-xs text-blue-400 hover:underline cursor-pointer"
                      >
                        ← Back to Continent
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {availableCountries.map(country => (
                        <button
                          key={country}
                          onClick={() => {
                            setSelectedCountry(country);
                            const teams = getTeamsByFilter('national', selectedConfederation, country);
                            if (teams.length > 0) handleSelectAndSync(teams[0]);
                            setDrillStep(4);
                          }}
                          className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                            selectedCountry === country
                              ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg'
                              : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600 text-slate-200'
                          }`}
                        >
                          <div className="font-bold text-sm">{country}</div>
                          <ChevronRight className="w-4 h-4 text-slate-500" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* NATIONAL STEP 4: SQUAD ("and that's it") */}
                {selectedCategory === 'national' && drillStep === 4 && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                        Step 4: Select National Squad ({filteredTeams.length} in {selectedCountry})
                      </h3>
                      <button
                        onClick={() => setDrillStep(3)}
                        className="text-xs text-blue-400 hover:underline cursor-pointer"
                      >
                        ← Back to Country
                      </button>
                    </div>
                    <div className="flex flex-col gap-2.5">
                      {filteredTeams.map(t => {
                        const isSelected = selectedTeam.id === t.id;
                        return (
                          <div
                            key={t.id}
                            onClick={() => handleSelectAndSync(t)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                              isSelected
                                ? 'bg-gradient-to-r from-blue-900/60 to-slate-800/80 border-blue-500 shadow-md ring-1 ring-blue-400'
                                : 'bg-slate-800/50 border-slate-700/70 hover:bg-slate-800 hover:border-slate-600'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="w-11 h-11 rounded-lg flex items-center justify-center font-black text-sm shadow border border-white/20"
                                style={{ backgroundColor: t.badge.bg, color: t.badge.primaryColor }}
                              >
                                {t.badge.icon}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-black text-sm text-white">{t.name}</span>
                                  <span className={`px-1.5 py-0.2 text-[10px] uppercase rounded border ${getTierBadgeStyle(t.ratingTier)}`}>
                                    TIER {t.ratingTier}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                                  <span>{t.preferredFormation}</span>
                                  <span>•</span>
                                  <span className="capitalize">{t.tacticalPlaystyle.replace('_', ' ')}</span>
                                  <span>•</span>
                                  <span className="text-amber-300 font-bold">{t.averageOvr} OVR</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="flex items-center -space-x-1">
                                <div
                                  className="w-4 h-4 rounded-full border border-slate-900 shadow-sm"
                                  style={{ backgroundColor: t.kit.primaryColor }}
                                  title="Home Kit"
                                />
                                <div
                                  className="w-4 h-4 rounded-full border border-slate-900 shadow-sm"
                                  style={{ backgroundColor: t.awayKit.primaryColor }}
                                  title="Away Kit"
                                />
                              </div>

                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  handleConfirmTeam(t);
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-transform active:scale-95 cursor-pointer ${
                                  isSelected
                                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                    : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                                }`}
                              >
                                {isSelected ? 'Confirm ✓' : 'Select'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ========================================================================= */}
                {/* CLUBS: CONTINENT -> COUNTRY -> LEAGUE -> CLUB                             */}
                {/* "if you pick clubs you then can pick continent, then country, then league" */}
                {/* ========================================================================= */}

                {/* CLUB STEP 2: CONTINENT / CONFEDERATION */}
                {selectedCategory === 'club' && drillStep === 2 && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                        Step 2: Select Continent / Confederation
                      </h3>
                      <button
                        onClick={() => setDrillStep(1)}
                        className="text-xs text-blue-400 hover:underline cursor-pointer"
                      >
                        ← Back to Categories
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-2.5">
                      {availableConfeds.map(c => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setSelectedConfederation(c.id);
                            const countries = getCountries('club', c.id);
                            if (countries.length > 0) {
                              setSelectedCountry(countries[0]);
                              const leagues = getLeagues('club', c.id, countries[0]);
                              if (leagues.length > 0) setSelectedLeague(leagues[0]);
                            }
                            setDrillStep(3);
                          }}
                          className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                            selectedConfederation === c.id
                              ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg'
                              : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600 text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Globe className="w-6 h-6 text-blue-400" />
                            <div>
                              <div className="font-bold text-sm">{c.label}</div>
                              <div className="text-xs text-slate-400">{c.region} ({c.count} club{c.count > 1 ? 's' : ''})</div>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-500" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* CLUB STEP 3: COUNTRY */}
                {selectedCategory === 'club' && drillStep === 3 && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                        Step 3: Select Country ({selectedConfederation.toUpperCase()})
                      </h3>
                      <button
                        onClick={() => setDrillStep(2)}
                        className="text-xs text-blue-400 hover:underline cursor-pointer"
                      >
                        ← Back to Continent
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {availableCountries.map(country => (
                        <button
                          key={country}
                          onClick={() => {
                            setSelectedCountry(country);
                            const leagues = getLeagues('club', selectedConfederation, country);
                            if (leagues.length > 0) {
                              setSelectedLeague(leagues[0]);
                              const teams = getTeamsByFilter('club', selectedConfederation, country, leagues[0]);
                              if (teams.length > 0) setSelectedTeam(teams[0]);
                            }
                            setDrillStep(4);
                          }}
                          className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                            selectedCountry === country
                              ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg'
                              : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600 text-slate-200'
                          }`}
                        >
                          <div className="font-bold text-sm">{country}</div>
                          <ChevronRight className="w-4 h-4 text-slate-500" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* CLUB STEP 4: LEAGUE */}
                {selectedCategory === 'club' && drillStep === 4 && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                        Step 4: Select Domestic League ({selectedCountry})
                      </h3>
                      <button
                        onClick={() => setDrillStep(3)}
                        className="text-xs text-blue-400 hover:underline cursor-pointer"
                      >
                        ← Back to Country
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-2.5">
                      {availableLeagues.map(league => {
                        const clubCount = getTeamsByFilter('club', selectedConfederation, selectedCountry, league).length;
                        return (
                          <button
                            key={league}
                            onClick={() => {
                              setSelectedLeague(league);
                              const teams = getTeamsByFilter('club', selectedConfederation, selectedCountry, league);
                              if (teams.length > 0) handleSelectAndSync(teams[0]);
                              setDrillStep(5);
                            }}
                            className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                              selectedLeague === league
                                ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg'
                                : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600 text-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Trophy className="w-6 h-6 text-amber-400" />
                              <div>
                                <div className="font-bold text-sm text-white">{league}</div>
                                <div className="text-xs text-slate-400">{clubCount} club{clubCount > 1 ? 's' : ''} competing</div>
                              </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-500" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* CLUB STEP 5: CLUB SELECTION */}
                {selectedCategory === 'club' && drillStep === 5 && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                        Step 5: Select Club ({filteredTeams.length} in {selectedLeague})
                      </h3>
                      <button
                        onClick={() => setDrillStep(4)}
                        className="text-xs text-blue-400 hover:underline cursor-pointer"
                      >
                        ← Back to League
                      </button>
                    </div>
                    <div className="flex flex-col gap-2.5">
                      {filteredTeams.map(t => {
                        const isSelected = selectedTeam.id === t.id;
                        return (
                          <div
                            key={t.id}
                            onClick={() => handleSelectAndSync(t)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                              isSelected
                                ? 'bg-gradient-to-r from-blue-900/60 to-slate-800/80 border-blue-500 shadow-md ring-1 ring-blue-400'
                                : 'bg-slate-800/50 border-slate-700/70 hover:bg-slate-800 hover:border-slate-600'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="w-11 h-11 rounded-lg flex items-center justify-center font-black text-sm shadow border border-white/20"
                                style={{ backgroundColor: t.badge.bg, color: t.badge.primaryColor }}
                              >
                                {t.badge.icon}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-black text-sm text-white">{t.name}</span>
                                  <span className={`px-1.5 py-0.2 text-[10px] uppercase rounded border ${getTierBadgeStyle(t.ratingTier)}`}>
                                    TIER {t.ratingTier}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                                  <span>{t.preferredFormation}</span>
                                  <span>•</span>
                                  <span className="capitalize">{t.tacticalPlaystyle.replace('_', ' ')}</span>
                                  <span>•</span>
                                  <span className="text-amber-300 font-bold">{t.averageOvr} OVR</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="flex items-center -space-x-1">
                                <div
                                  className="w-4 h-4 rounded-full border border-slate-900 shadow-sm"
                                  style={{ backgroundColor: t.kit.primaryColor }}
                                  title="Home Kit"
                                />
                                <div
                                  className="w-4 h-4 rounded-full border border-slate-900 shadow-sm"
                                  style={{ backgroundColor: t.awayKit.primaryColor }}
                                  title="Away Kit"
                                />
                              </div>

                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  handleConfirmTeam(t);
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-transform active:scale-95 cursor-pointer ${
                                  isSelected
                                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                    : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                                }`}
                              >
                                {isSelected ? 'Confirm ✓' : 'Select'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* ALL TEAMS DIRECT GRID */
              <div className="flex flex-col gap-2">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                  Browse All Teams ({allTeamsFiltered.length})
                </h3>
                <div className="flex flex-col gap-2">
                  {allTeamsFiltered.map(t => {
                    const isSelected = selectedTeam.id === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => handleSelectAndSync(t)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-gradient-to-r from-blue-900/60 to-slate-800/80 border-blue-500 shadow-md ring-1 ring-blue-400'
                            : 'bg-slate-800/50 border-slate-700/70 hover:bg-slate-800 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm shadow border border-white/20"
                            style={{ backgroundColor: t.badge.bg, color: t.badge.primaryColor }}
                          >
                            {t.badge.icon}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs sm:text-sm text-white">{t.name}</span>
                              <span className={`px-1.5 py-0.2 text-[9px] uppercase rounded border ${getTierBadgeStyle(t.ratingTier)}`}>
                                TIER {t.ratingTier}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span>{t.country}</span>
                              {t.league && (
                                <>
                                  <span>•</span>
                                  <span className="text-slate-300">{t.league}</span>
                                </>
                              )}
                              <span>•</span>
                              <span>{t.preferredFormation}</span>
                              <span>•</span>
                              <span className="text-amber-300 font-bold">{t.averageOvr} OVR</span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleConfirmTeam(t);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-transform active:scale-95 cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                              : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                          }`}
                        >
                          {isSelected ? 'Confirm ✓' : 'Select'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT 5 COLS: SELECTED TEAM DETAIL CARD & ROSTER */}
          <div className="md:col-span-5 flex flex-col gap-3">
            <div className="bg-slate-950/80 border border-slate-700 rounded-xl p-4 flex flex-col gap-3 shadow-xl">
              {/* TEAM HEADER & BADGE */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center font-black text-2xl shadow-lg border-2 border-white/20"
                    style={{ backgroundColor: activeDisplayTeam.badge.bg, color: activeDisplayTeam.badge.primaryColor }}
                  >
                    {activeDisplayTeam.badge.icon}
                  </div>
                  <div>
                    <h3 className="font-black text-base text-white">{activeDisplayTeam.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`px-2 py-0.5 text-[10px] uppercase rounded border ${getTierBadgeStyle(activeDisplayTeam.ratingTier)}`}>
                        TIER {activeDisplayTeam.ratingTier}
                      </span>
                      <span className="text-xs text-amber-400">{getTierStars(activeDisplayTeam.ratingTier)}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-black text-amber-400 leading-none">{activeDisplayTeam.averageOvr}</div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">OVR Rating</div>
                </div>
              </div>

              {/* DESCRIPTION & LEAGUE */}
              <p className="text-xs text-slate-300 italic border-l-2 border-amber-400/80 pl-2 py-0.5">
                "{activeDisplayTeam.description}"
              </p>
              {activeDisplayTeam.league && (
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-semibold text-slate-300">{activeDisplayTeam.league}</span>
                  <span>({activeDisplayTeam.country})</span>
                </div>
              )}

              {/* TACTICAL IDENTITY */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Formation</span>
                  <span className="font-black text-white">{activeDisplayTeam.preferredFormation}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Philosophy</span>
                  <span className="font-bold text-amber-300 capitalize">{activeDisplayTeam.tacticalPlaystyle.replace('_', ' ')}</span>
                </div>
              </div>

              {/* KITS PREVIEW */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Official Uniforms</span>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-slate-400 font-bold">1st (Home)</span>
                    <div className="w-6 h-6 rounded-full border border-white/20 shadow" style={{ backgroundColor: activeDisplayTeam.kit.primaryColor }} />
                    <span className="text-[10px] truncate max-w-full text-slate-300">{activeDisplayTeam.kit.name}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-slate-400 font-bold">2nd (Away)</span>
                    <div className="w-6 h-6 rounded-full border border-white/20 shadow" style={{ backgroundColor: activeDisplayTeam.awayKit.primaryColor }} />
                    <span className="text-[10px] truncate max-w-full text-slate-300">{activeDisplayTeam.awayKit.name}</span>
                  </div>
                  {activeDisplayTeam.thirdKit ? (
                    <div className="p-2 rounded bg-slate-900 border border-slate-800 flex flex-col items-center gap-1">
                      <span className="text-[10px] text-slate-400 font-bold">3rd (Alt)</span>
                      <div className="w-6 h-6 rounded-full border border-white/20 shadow" style={{ backgroundColor: activeDisplayTeam.thirdKit.primaryColor }} />
                      <span className="text-[10px] truncate max-w-full text-slate-300">{activeDisplayTeam.thirdKit.name}</span>
                    </div>
                  ) : (
                    <div className="p-2 rounded bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-slate-500 text-[10px]">
                      Standard
                    </div>
                  )}
                </div>
              </div>

              {/* AUTHORITATIVE TACTICAL SET-PIECE ROLES (SECTION 13.4) */}
              <div className="flex flex-col gap-1.5 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-black flex items-center gap-1">
                  <Target className="w-3.5 h-3.5 text-amber-400" />
                  <span>Tactical Set-Piece Specialists (Section 13.4)</span>
                </span>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                  <div>
                    <span className="text-slate-400">Captain (C):</span>{' '}
                    <span className="font-bold text-amber-300">
                      {activeDisplayTeam.players.find(p => p.id === activeDisplayTeam.roles.captainId || p.isCaptain)?.name || 'Leader'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Penalty Taker:</span>{' '}
                    <span className="font-bold text-white">
                      {activeDisplayTeam.players.find(p => p.id === activeDisplayTeam.roles.penaltyTakerId)?.name || 'Striker'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">FK Near (&lt;28m):</span>{' '}
                    <span className="font-bold text-white">
                      {activeDisplayTeam.players.find(p => p.id === activeDisplayTeam.roles.freeKickNearId)?.name || 'Direct'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">FK Deep (&gt;28m):</span>{' '}
                    <span className="font-bold text-white">
                      {activeDisplayTeam.players.find(p => p.id === activeDisplayTeam.roles.freeKickLongId)?.name || 'Long'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Left Corner:</span>{' '}
                    <span className="font-bold text-white">
                      {activeDisplayTeam.players.find(p => p.id === activeDisplayTeam.roles.leftCornerTakerId)?.name || 'Left Winger'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Right Corner:</span>{' '}
                    <span className="font-bold text-white">
                      {activeDisplayTeam.players.find(p => p.id === activeDisplayTeam.roles.rightCornerTakerId)?.name || 'Right Winger'}
                    </span>
                  </div>
                </div>
              </div>

              {/* TOGGLE ROSTER ACCORDION */}
              <button
                onClick={() => setShowRoster(!showRoster)}
                className="w-full py-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 bg-slate-900 rounded border border-slate-800 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Users className="w-3.5 h-3.5" />
                <span>
                  {showRoster
                    ? 'Hide Lineup'
                    : `Inspect Full Squad (${activeDisplayTeam.players.length} Starting + ${activeDisplayTeam.substitutes?.length || 0} Bench)`}
                </span>
              </button>

              {/* EXPANDED ROSTER LIST */}
              {showRoster && (
                <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1 border-t border-slate-800 pt-2">
                  <div className="text-[10px] uppercase font-black text-amber-400 px-1">
                    Starting 11
                  </div>
                  <div className="flex flex-col gap-1">
                    {activeDisplayTeam.players.map(p => {
                      const ovr = calculatePlayerOvr(p.canonicalStats, p.role);
                      const hasStatBreak = Object.values(p.canonicalStats).some(val => typeof val === 'number' && isStatBreak(val));
                      return (
                        <div
                          key={p.id}
                          className="flex items-center justify-between text-xs py-1 px-2 rounded bg-slate-900/60 border border-slate-800/80"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 text-slate-400 font-mono text-[11px]">#{p.number}</span>
                            <span className="font-bold text-white">{p.name}</span>
                            {p.isCaptain && (
                              <span className="text-[10px] font-black text-amber-400 bg-amber-400/10 px-1 rounded">(C)</span>
                            )}
                            {hasStatBreak && (
                              <span className="text-[10px] text-amber-300 font-bold flex items-center gap-0.5" title="⚡ Stat Break Breakthrough">
                                ⚡
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="text-slate-400 uppercase font-mono">{p.subPosition}</span>
                            <span className="font-black text-amber-400">{ovr}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {activeDisplayTeam.substitutes && activeDisplayTeam.substitutes.length > 0 && (
                    <>
                      <div className="text-[10px] uppercase font-black text-blue-400 px-1 mt-1 border-t border-slate-800/60 pt-1.5 flex items-center justify-between">
                        <span>Bench & Substitutes</span>
                        <span className="text-slate-500 font-normal">({activeDisplayTeam.substitutes.length} players)</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        {activeDisplayTeam.substitutes.map(p => {
                          const ovr = calculatePlayerOvr(p.canonicalStats, p.role);
                          const hasStatBreak = Object.values(p.canonicalStats).some(val => typeof val === 'number' && isStatBreak(val));
                          return (
                            <div
                              key={p.id}
                              className="flex items-center justify-between text-xs py-1 px-2 rounded bg-slate-900/40 border border-slate-800/60"
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-5 text-slate-400 font-mono text-[11px]">#{p.number}</span>
                                <span className="font-bold text-slate-200">{p.name}</span>
                                {hasStatBreak && (
                                  <span className="text-[10px] text-amber-300 font-bold flex items-center gap-0.5" title="⚡ Stat Break Breakthrough">
                                    ⚡
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[11px]">
                                <span className="text-slate-400 uppercase font-mono">{p.subPosition}</span>
                                <span className="font-black text-slate-300">{ovr}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* CONFIRM BUTTON */}
              <button
                onClick={() => handleConfirmTeam(activeDisplayTeam)}
                className={`w-full py-2.5 rounded-lg font-black text-xs uppercase tracking-wider transition-all transform active:scale-98 cursor-pointer shadow-lg flex items-center justify-center gap-2 ${
                  activeSide === 'home'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/30'
                    : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-rose-500/30'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>Confirm {activeDisplayTeam.name.toUpperCase()} for {activeSide.toUpperCase()}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
