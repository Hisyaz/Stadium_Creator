# Development Roadmap: Next-Gen Lightweight Football Simulation

## Vision & Architecture Principles
Build an authentic, tactical, and fluid football experience that runs at a solid 60 FPS even on low-end and older mobile devices.
- **Authentic Football Realism (Zero Magic, Zero Superpowers)**: Pure grounded, tactile physical football. No giant glowing sci-fi shields, neon magical forcefields, or arcade superpowers. Ball protection is achieved purely through realistic physical body leverage, arm placement, planted studs, and a low center of gravity.
- **Maximum Compatibility & Locked 60 FPS on Budget Phones**: Optimized to run silky-smooth on $50 budget Android devices, older iPhones, and low-spec hardware without garbage collection spikes or thermal throttling. Zero bulky 3D meshes; all visual features (cinematics, replays, player ratings, video ref) are built using lightweight procedural HTML5 Canvas 2D math and pre-allocated zero-allocation buffers.
- **32-Bit Arcade Console Design Constitution**: Pure late-90s / early-2000s 32-bit console visual identity (metallic console gradients, dithered shading, beveled arcade borders, tactile chiseled buttons).
- **Mobile-First UI Without Clutter**: Console-style layouts avoiding vertical/horizontal scrolling on mobile devices and desktop displays; single-screen accessibility with intuitive toggles.
- **Realistic Ball & Match Flow Physics**: Sub-millisecond deterministic game loop with authentic trajectory physics, official IFAB match regulation timing (45m halves, stoppage time calculation, intelligent half/full time whistle logic, extra time & penalty shootouts).
- **Daily Token Budget Calibration**: Strictly 1 Phase = 1 Day's worth of Google AI Studio tokens (~600k–900k tokens over focused engineering turns), guaranteeing a 100% compiled and playable build at the end of each session.

---

# Completed Roadmap Archive (Summary of Phases 1 – 18)

Below is the verified summary of all completed development milestones across the initial development lifecycle:

| Phase | Title | Core Technical Accomplishments |
| :---: | :--- | :--- |
| **Phase 0.5** | **Match Rules, Foul Attribution & Modern Pressing** | Symmetrical foul recognition; strict discrimination between attacking penalty box (penalties) vs. defending box (defensive free kicks); zero friendly-fire tackles; 2026 pressing triggers (backward-facing, sideline traps, loose-ball contest). |
| **Phase 0.6** | **Driven Through-Balls & Camera Suite** | Driven ground through-balls (`W`) with forward leading space vector; delicate chipped long pass over defensive lines (`E + W`); swerving pass (`Q + W`); 3-mode broadcast camera suite (Pitch auto-framing, Ball lock, Player lock). |
| **Phase 1** | **Ball Out-of-Bounds & Set-Piece Attribution** | Robust previous-vs-current segment raycasting distinguishing touchline exits (throw-ins) from endline exits; strict last-touch attribution (attacking touch $\rightarrow$ goal kick; defending deflection/keeper save $\rightarrow$ corner kick). |
| **Phase 2** | **Passing, Shooting & Skill-Chip Delivery** | 4-button canonical control scheme (Short pass `S`, Lead pass `W`, Box cross `D`, Shot `A`); `E` chip modifier suite for scoop chip shots, floating crosses, and lofted passes. |
| **Phase 3** | **Lowered Set-Piece Camera & Aiming Engine** | Immersive pitch-level lowered camera perspective for free kicks and penalties; target aiming reticle with elevation & bend dials; timing-based shot power meter; defensive wall jump duels. |
| **Phase 4** | **Dynamic Team AI, Pressing & Off-Ball Runs** | 2-man pressing traps (Hunter + Trap Closer + Cover Shadow); intelligent teammate support triangles and blindside runs; offside line tracking; zero-allocation mobile AI loops. |
| **Phase 5** | **Canonical Player Stats Architecture** | 18 outfield stats across 6 pillars (Pace, Stamina, Strength; Ball Control, Retention, Dribbling; Short Pass, Long Pass, Crossing; Shooting, Heading, Long Shots; Tackling, Sliding, Interceptions, Marking; Positioning, Composure, Reactions) + 7 Goalkeeper metrics (Saving, Reflexes, Handling, Positioning, Aerial Reach, 1v1, Distribution). |
| **Phase 6** | **Attribute Progression Tiers & Stat Breaks** | 4 canonical tiers (Amateur 40–69, Pro 70–84, Elite 85–94, Pinnacle 95–99) + Stat Break breakthrough traits (>99); duel resolution matrices for speed, dribbling vs. tackling, and aerial battles. |
| **Phase 7** | **Positional Hierarchy & Tactical Playstyles** | 3-tier hierarchy (Primary $\rightarrow$ Sub-Position $\rightarrow$ Playstyle); 16 distinct sub-positions; 28 specialized player playstyles (Poacher, Box-to-Box, Regista, Inverted Fullback, Libero, Sweeper GK, etc.). |
| **Phase 7.5** | **Controls & Ball State Machine Polish** | Progressive charge meter running alongside player cleats; dead-ball collision barriers; touch joystick calibration. |
| **Phase 8** | **Expressive Procedural Animations Suite** | Procedural animation state machine (dribbling cadence, body feints, driven laces strike, trivela, sliding toe poke, bullet header, diving volley, acrobatic GK saves). |
| **Phase 9** | **Scalable 3-Tier Graphics & Retro Filters** | Scalable pipeline (Performance, Balanced, High-End); Quad-Shadow floodlights; zero-lag hardware-accelerated CRT Arcade, VHS 1994, Neo-Geo 16-Bit, and Manga retro filters. |
| **Phase 9.5** | **AI Set-Piece Overhaul & Grounded Realism** | AI throw-in distribution; direct free kick tactical intelligence; subtle anti-magic ball shielding with zero forcefield graphics. |
| **Phase 10** | **Dynamic Stadiums & Match Atmosphere** | 3 stadium tiers (Monumental Grand Arena, Craven Heritage Ground, Ascenso Municipal); rendered city horizon; custom seat color modes; time-of-day lighting. |
| **Phase 11** | **Pitch Dimensions, Weather & Surface Physics** | IFAB pitch dimensions (Compact, Balanced, Expansive, Custom); turf puddles with ball hydroplaning; winter snow with red line markings and orange/yellow balls; Brazilian deep-box nets. |
| **Phase 12** | **Parametric Player Appearance Framework** | Zero-GC 120-byte player appearance contract (skin tones, hairstyles, facial hair, uniform fits, sleeve length, tattoos, physical body scaling 0.92–1.08). |
| **Phase 13** | **Multi-Tier Team Database & Selection Engine** | Drill-down team selection (Clubs, National, Special); randomizer roulette; 4 rating tiers (S, A, B, C); canonical set-piece role specialist assignments. |
| **Phase 13.5** | **Expanded Teams & All-Time Legends** | 2026 World Cup squads, historic South American clubs, Bogotá FC derby, and 7 All-Time Continental Dream Teams. |
| **Phase 14** | **Pre-Match Presentation & Modular Uniforms** | Split-screen presentation layout; 32-bit captain hero sprites; modular kit mixer (shirts, shorts, socks) with automatic anti-clash contrast engine. |
| **Phase 15** | **Dual-Pitch Tactical Game Plan Board** | Side-by-side tactical boards (desktop) and toggleable single pitch (mobile); OVR star ratings; live bench drag-and-drop substitutions; dedicated set-piece role picker. |
| **Phase 16** | **32-Bit Retro Aesthetic & Pitch Drag-and-Drop** | Compact jersey silhouette with squad numbers; interactive pitch drag-and-drop with live positional reclassification; 32-bit metallic console styling across all menus. |
| **Phase 16.5** | **Drop-Zone Grid & Overlap Disambiguation** | 3-tier mechanical pitch partition (ATT, MID, DEF, locked GK sanctuary); multi-role overlap popover (ST/SS, CM/CAM, CM/CDM, LM/LWB, CB/LIB); automatic reversion to 'Basic' playstyle on incompatible positions. |
| **Phase 17** | **Unified Pre-Match Hub & Atmosphere Suite** | 5-button bottom navigation bar (Uniform, Stadium, Tactics, Settings, Kick Off); 3 turf quality grades (Poor, Normal, Pristine); 7 lawn mowing designs; streamlined 3-button in-game pause hub. |
| **Phase 18** | **Mobile Optimization & GC Hardening** | Zero per-frame memory allocations; pre-allocated vector and particle pools; spatial collision partitioning; locked 60 FPS verified on budget smartphones. |

---

# New Development Roadmap: 32-Bit Tactical Simulation & AI Mastery

## Daily Token Budget Profile (1 Phase = 1 Day's Quota)
- **Bounded Engineering Scope**: Each sprint focuses on 1 to 3 designated modules.
- **Non-Breaking Invariant**: Every phase terminates in a fully compiling, zero-regression, playable build.
- **Console-Grade UI Invariant**: All screens follow pristine 32-bit retro styling with **ZERO vertical or horizontal scrolling** across mobile, tablets, and PC desktop viewports.
- **Budget Phone Performance Invariant**: All new systems (ratings, replays, cinematics, match flow state machines) run zero per-frame memory allocation, ensuring steady 60 FPS on $50 hardware.

---

## Phase 0: 32-Bit Console UI Transition, Zero-Scroll Game Plan, Broadcast HUD & Device Profiling [COMPLETED]
*Priority: Architecture Foundation, Zero-Scroll Viewport Constitution, Custom Formation Rules & Hardware Detection*  
*Daily Token Budget Profile: Scope: `src/components/TacticsModal.tsx`, `src/components/PitchCanvas.tsx`, `src/components/PreMatchPresentationModal.tsx`, `src/components/TeamSelectorModal.tsx`, `src/game/formations.ts`, `src/game/specialTeamsData.ts`, `src/App.tsx` | Target: ~750k tokens*

### 0.1 Zero-Scroll Game Plan & Pitch Scale Overhaul
- **Strict Single-Screen Viewport Fit (No Scrolling Anywhere)**:
  - Eliminate all vertical and horizontal page scrolling from the Game Plan / Tactics board on PC desktop, tablet, and mobile devices.
  - Scale down the pitch dimensions and jersey nodes dynamically using CSS `h-full`, `max-h-[calc(100vh-...)]`, and responsive aspect ratios so the tactical board, bench substitutes, team tactics panel, and navigation buttons fit comfortably on a single screen without requiring any mouse scroll or touch swipe.
  - Ensure all squad numbers, names, sub-positions, and attribute tags are crisp, high-contrast, and legible.
- **Authentic 32-Bit Aesthetic Refinement**:
  - Re-theme the Game Plan screen to match authentic 32-bit console UI (metallic steel/slate gradient panels, chiseled gold/cyan bevels, retro font styling, glowing LED status badges, tactile embossed action buttons).

### 0.2 Custom Formation Engine & Structural Validation Rules
- **Freeform Tactical Pitch Customization**:
  - Allow users to freely adjust and create custom formations by dragging and dropping outfield players across the pitch board.
- **Formation Integrity Rules & Enforcement**:
  - Every custom formation **MUST** satisfy the following canonical line minimums to be structurally valid:
    1. **Goalkeeper**: Exactly 1 GK (locked in sanctuary).
    2. **Defenders**: At least **2 Defenders** (`CB`, `LB`, `RB`, `LWB`, `RWB`, `LIB`).
    3. **Midfielders**: At least **2 Midfielders** (`CDM`, `CM`, `CAM`, `LM`, `RM`).
    4. **Attackers**: At least **1 Attacker** (`ST`, `SS`, `CF`, `LW`, `RW`).
  - **Dynamic Invalidation Banner**: If a player drags a lineup into an illegal structure (e.g. 1 defender or 0 attackers):
    - Display an amber/red retro warning: `"⚠️ INVALID FORMATION: Lineup requires at least 2 Defenders, 2 Midfielders, and 1 Attacker!"`
    - **Disable the `[ CONFIRM ]` / `[ PROCEED ]` button** with a locked indicator until the positional balance is restored.

### 0.3 Gameplay HUD & Mobile Controller Viewport Cleansing
- **Broadcast Clean Screen Mandate**:
  - Remove all redundant top navigation and debug buttons during live gameplay (`MATCHDAY`, `TACTICS`, and `GFC` buttons removed from top gameplay bar).
  - Clean top bar layout:
    - **Top-Left**: Broadcast Scoreboard (Home vs Away, score, match timer, team colors).
    - **Top-Right**: "DRAWSTAR TV" retro broadcast network logo.
    - All secondary match indicators (stoppage time, card alerts) must anchor cleanly below these two top elements.
- **Controller-Aware Viewport & Camera Center Offset**:
  - When the on-screen virtual touch controller is visible and solid, the active camera gameplay framing area is bounded strictly to the screen area **ABOVE** the controller overlay.
  - The center of camera focus must never be obscured or occluded beneath the bottom virtual pad or buttons.
- **Input Method Auto-Detection & Key Allocation Suggestions**:
  - On application startup (prior to team selection):
    - Detect current device profile, touch capability, keyboard availability, and connected Gamepads (`navigator.getGamepads()`).
    - **Keyboard / Controller Detected**: Display an automatic suggestion prompt showing recommended button allocations (e.g., Short Pass: `S` / `Cross`, Shoot: `A` / `Square`, Through Ball: `W` / `Triangle`, Long Pass: `D` / `Circle`).
    - Provide an instant toggle: **Hide On-Screen Controller Entirely** when hardware keyboard or joystick is active.
    - **Touchscreen / Mouse Detected**: Enable responsive on-screen virtual joystick and action buttons.
- **Hardware Performance Profiling & Graphic Quality Suggestion**:
  - Auto-benchmark device capacity (GPU renderer string, logical CPU cores, screen DPR, device memory) and suggest an optimal graphics preset:
    - **Performance**: Optimized for budget devices (flat turf, standard lighting, maximum FPS).
    - **Balanced**: Standard shadows and turf patterns.
    - **High**: Quad-shadow floodlights, retro CRT/scanline filtering, pitch detail.

### 0.4 Special Teams Canonical Formations, Starting XI, Substitutes & Playstyles
Align all 7 Special / Continental Dream Teams with their official historical rosters, tactical formations, managers, and philosophies:
1. **CLASSIC SOUTH AMERICA 🌎**: Mario Zagallo | 4-3-3 | Jogo Bonito | Mazurkiewicz GK; Carlos Alberto, Figueroa, Passarella, Nílton Santos; Falcão CDM, Gérson CM, Maradona CAM; Garrincha RW, Pelé SS (biased left), Romário ST. (Subs: Chilavert, Djalma Santos, Nasazzi, Domingos da Guia, Marzolini, Obdulio Varela, Cubillas, Valderrama, Zico, Jairzinho, Kempes).
2. **CLASSIC EUROPE 🇪🇺**: Bob Paisley | 4-4-2 | Counterattack | Yashin GK; Bergomi, Beckenbauer, Baresi, Krol; Rijkaard CDM, Luis Suárez CM, Matthews RM, Best LM; Cruyff SS, Van Basten ST. (Subs: Zoff, Vogts, Scirea, Moore, Brehme, Matthäus, Charlton, Gento, Kopa, Gullit, Eusébio).
3. **MODERN SOUTH AMERICA 🌎**: Luiz Felipe Scolari | 4-2-3-1 (Offensive) | Jogo Bonito | Alisson GK; Cafu, Thiago Silva, Romero, Roberto Carlos; Casemiro CDM, Redondo CM, Kaká CAM; Messi RW, Ronaldinho LW, Ronaldo Nazário ST. (Subs: E. Martínez, Dani Alves, Lúcio, Ayala, Marcelo, Mascherano, Vidal, Riquelme, Di María, Neymar, L. Suárez).
4. **MODERN EUROPE 🇪🇺**: Carlo Ancelotti | 4-3-3 | Counterattack | Neuer GK; Lahm, Ramos, Cannavaro, Maldini; Busquets CDM, Xavi CM, Zidane CAM; Robben RW, Lewandowski ST, C. Ronaldo LW. (Subs: Casillas, Thuram, Van Dijk, Nesta, Alba, Rodri, Modrić, Iniesta, Bale, Mbappé, Henry).
5. **CAF — AFRICA ALL-STARS 🌍**: Stephen Keshi | 4-2-3-1 (Offensive) | Counterattack | Bono GK; Hakimi, Kolo Touré, Kuffour, Asamoah; Essien CDM, Yaya Touré CM, Okocha CAM; Salah RW, Eto’o LW, Weah ST. (Subs: Mendy, Eboué, Koulibaly, Matip, Taiwo, Mikel, Keita, Abedi Pelé, Mahrez, Mané, Drogba).
6. **ASIA / OCEANIA ALL-STARS 🌏**: Choi Kang-hee | 4-4-2 | Long Ball | Schwarzer GK; Mahdavikia, Hong Myung-bo, Kim Min-jae, Nagatomo; Hasebe CDM, Nakata CM, Park Ji-sung RM, Son Heung-min LM; Cahill SS, Rufer ST. (Subs: Ryan, Moore, Yoshida, Emerton, Lee Young-pyo, Jedinak, Ono, Kagawa, Nakamura, Cha Bum-kun, Ali Daei).
7. **CONCACAF LEGENDS 🌎**: Javier Aguirre | 5-3-2 | Catenaccio | Navas GK; Claudio Suárez, Morgan, Duarte CBs; Alphonso Davies LWB, Landon Donovan RWB; Márquez CDM, Bryan Ruiz CM; Mágico González CAM (biased left), David Suazo SS (biased right), Hugo Sánchez ST (center). (Subs: Ochoa, Balboa, Peña, Brooks, Pulisic, Osorio, Edson Álvarez, Dempsey, Blanco, L. Hernández, Chicharito).

---

## Phase 1: Official Match Regulation Flow, Stoppage Time & Intelligent Whistle Engine [COMPLETED]
*Priority: Complete 2-Half Match Engine, Dynamic Stoppage Time, Non-Dangerous Whistle AI & End-Game Hub*  
*Daily Token Budget Profile: Scope: `src/game/engine.ts`, `src/game/matchRules.ts`, `src/components/PauseModal.tsx`, `src/components/EndGameModal.tsx`, `src/types.ts` | Target: ~800k tokens (1 Day's Quota)*

### 1.1 Complete Match Half State Machine & Stoppage Time Mechanics
- **Match Regulation Halves**:
  - Full match consists of two halves of 45:00 simulated match time.
  - **1st Half Kickoff**: Executed by the **Away team**.
  - **2nd Half Kickoff**: Executed by the **Home team** (automatic side swap).
- **Calculated Stoppage Time (Added Time) Engine**:
  - Added time is displayed directly on the broadcast scoreboard banner (`+1'`, `+2'`, etc.).
  - **1st Half Stoppage Time**:
    - Minimum added time: **1 minute**.
    - Additional time added: **+30 seconds** for every substitution or injury occurring in the first half.
    - Accumulated time rounds to whole minute batches (e.g., 2 subs/injuries = +2 minutes).
  - **2nd Half Stoppage Time**:
    - Minimum added time: **2 minutes**.
    - Additional time added: **+30 seconds** per substitution or injury occurring in the 2nd half.
    - Accrued strictly in 1-minute batches (e.g., 2 subs = +3 minutes total).

### 1.2 Context-Aware Intelligent Referee Whistle Engine
- **Non-Dangerous Ending Logic**:
  - The referee does **NOT** blow the half-time or full-time whistle while a team is in an active, dangerous attacking position.
  - If a team possesses the ball inside or directly threatening the opposing penalty box, the referee allows play to continue until:
    - The ball goes out of play (touchline, endline, or goal scored).
    - Defending team clears the ball out of danger.
  - **Penalty Kicks**: If awarded before whistle, the kick must always be taken; whistle cannot blow until the penalty sequence resolves.
  - **Set-Pieces at the Death**:
    - **Corner Kicks**: 70% probability the referee permits the corner to be delivered; 30% whistle is blown before corner is taken.
    - **Free Kicks**: Same 70% / 30% context-aware decision rule based on distance from target goal.

### 1.3 Halftime Transition & Full-Time End-Game Hub
- **Halftime Transition Screen**:
  - Automatically transitions to a specialized 32-bit Pause / Halftime Menu.
  - Prominent primary action: `[ ⏩ START 2ND HALF ]` (teams switch ends, Home team kicks off).
- **Full-Time End-Game Hub**:
  - **Win / Loss Outcome**: Displayed in 32-bit retro victory/defeat banners.
  - **Available Navigation Actions**:
    1. `[ 🔁 REMATCH ]`: Instantly restarts match with the exact same teams, settings, stadium, and tactics/lineups.
    2. `[ 👥 TEAM SELECTION ]`: Returns user directly to the Team Selector modal.
    3. `[ 📊 STATS ]`: Opens match statistics (placeholder scaffold for upcoming phase).
    4. `[ ⭐ RATINGS ]`: Opens player match ratings (placeholder scaffold for upcoming phase).
    5. `[ ⚙️ SETTINGS ]`: Opens match settings.
    6. `[ 🏠 MAIN MENU ]`: Rendered in disabled state for now.
  - **Draw Resolution Options (After 90 Minutes in Draw)**:
    - `[ ⏱️ EXTRA TIME ]`: Initiates two 15-minute extra time periods (ET1 and ET2), followed by penalty shootout if still tied.
    - `[ 🥅 PENALTIES ]`: Skips extra time and transitions immediately to penalty shootout.

---



## Phase 1.5: Immediate Critical Hotfixes, Multi-Player Controller Engine & Side Selection Hub [COMPLETED]
*Priority: Critical Bug Fixes, Input Auto-Binding, Multi-Player Controller Assignment & Full Spectator Mode*  
*Daily Token Budget Profile: Scope: `src/App.tsx`, `src/components/SideSelectModal.tsx`, `src/components/TacticalGamePlanModal.tsx`, `src/components/TacticalPitchBoard.tsx`, `src/components/TeamSelectorModal.tsx`, `src/components/PauseModal.tsx`, `src/game/engine.ts`, `src/types.ts` | Target: ~700–800k tokens*

### 1.5.1 Critical Fix – Tactical Game Plan Blank Screen & Error Boundary Protection
- **Blank Screen Root-Cause & Resolution**:
  - Eliminate unhandled `TypeError` exceptions (`.toUpperCase()` / `.replace()` on undefined player names, tactics, roles, or playstyle strings).
  - Enforce defensive null/undefined fallbacks across all player attribute records, tactical parameters, and specialist roles:
    - `captainId`, `freeKickNearId`, `freeKickLongId`, `penaltyTakerId`, `leftCornerTakerId`, `rightCornerTakerId`.
  - Comprehensive fallback generator: if `initialHomeTeam` or `initialAwayTeam` is partially initialized or corrupted, sanitize starting XI (exactly 11 outfield/GK players) and substitutes array automatically.
  - Safe render guarantee: add a resilient React `ErrorBoundary` wrapper around `TacticalGamePlanModal` that prevents blank screen unmounts and offers an instant "Reset to Defaults" recovery button.

### 1.5.2 Team Selector Immediate Persistence & Roster Synchronization
- **Instant Registration & Elimination of Multiple-Click Lag**:
  - Selecting or swapping a team in `TeamSelectorModal` must immediately trigger authoritative engine updates via `engine.setTeam(side, team)`.
  - Instantly re-generate pitch player instances, kit colors, formations, and playstyles in real-time without requiring multiple clicks or swaps to take effect.
  - Bidirectional sync: active selections in `PreMatchPresentationModal`, `TeamSelectorModal`, and `MatchEngine` remain strictly in lockstep across both home and away sides.

### 1.5.3 Hardware Profiler Input Auto-Binding
- **Immediate Binding of Profiler Recommendation to Settings**:
  - When the user confirms an input recommendation in `DeviceProfilerModal` (`keyboard`, `gamepad`, or `touch`), that choice is directly bound as Player 1's active input mode and saved to persistent settings.
  - Fixes the bug where selecting "Keyboard" on the initial recommendation screen still left the team playing autonomously under CPU control until manually adjusted in settings.
  - Automatic UI deck adaptation: choosing `keyboard` or `gamepad` automatically hides the virtual on-screen touch controller; choosing `touch` ensures the virtual arcade console is active and visible.

### 1.5.4 32-Bit Side Choice Screen (Select Side / Controller Assignment)
- **Position in Startup Flow**: `Device Profiler` ➔ **`Side Select`** ➔ `Team Selector` ➔ `Captain Presentation` ➔ `Match`.
- **3-Zone Interactive Arcade Slot Board**:
  - **LEFT**: [ HOME TEAM ]
  - **MIDDLE**: [ SPECTATOR (CPU vs CPU) ]
  - **RIGHT**: [ AWAY TEAM ]
- **1st Player (1P) Controller Card**:
  - Rendered in vibrant 32-bit Blue (`#38bdf8`) with pixel gamepad icon and "1P" badge.
  - Movable freely between Home, Spectator, and Away via tactile left/right buttons, keyboard navigation, or direct slot clicking.
- **Multi-Player Support (Up to 4 Players: 1P, 2P, 3P, 4P)**:
  - `[ + ADD NEW PLAYER ]` button dynamically adds:
    - **2P** (Amber `#f59e0b`)
    - **3P** (Emerald `#10b981`)
    - **4P** (Purple `#a855f7`)
  - Any player card can be removed (`[ × ]`) or repositioned across the 3 slots (e.g. 1P + 2P co-op on Home, or 1P Home vs 2P Away, or all in Spectator).
- **Logical Non-Overlapping Keyboard Assignments**:
  - **1P (Blue)**:
    - Movement: `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`
    - Actions: `S` (Pass), `A` (Shoot), `W` (Through Ball), `D` (Cross / Long Pass), `Q` (Ball Shield / Switch), `E` (Special / Sprint / Chip)
  - **2P (Amber)**:
    - Movement: `I` (Up), `K` (Down), `J` (Left), `L` (Right)
    - Actions: `U` (Pass), `O` (Shoot), `Y` (Through Ball), `P` (Cross / Long Pass), `H` (Shield / Switch), `N` (Special / Sprint)
  - **3P (Emerald)**:
    - Movement: Numpad `8` (Up), Numpad `5` (Down), Numpad `4` (Left), Numpad `6` (Right)
    - Actions: Numpad `1` (Pass), Numpad `2` (Shoot), Numpad `3` (Through Ball), Numpad `0` (Cross), Numpad `7` (Shield), Numpad `9` (Special)
  - **4P (Purple)**:
    - Movement: `T` (Up), `G` (Down), `F` (Left), `H` (Right)
    - Actions: `Z` (Pass), `X` (Shoot), `C` (Through Ball), `V` (Cross), `B` (Shield), `R` (Special / Sprint)
- **Gamepad / Joystick Hardware Assignment**:
  - If gamepads are connected (`navigator.getGamepads()`), each player card allows toggling between Keyboard and Gamepad (Pad 1, Pad 2, Pad 3, Pad 4).
- **Touchpad / Mobile Touch Restriction**:
  - Touchpad / virtual touch controls are **strictly restricted to 1 player maximum** to prevent multi-touch gesture conflicts.
- **Autonomous Spectator Mode**:
  - Any team with 0 human assigned players is 100% controlled by autonomous match AI.
  - When all active players are placed in the Middle (Spectator) slot, the match runs in full broadcast CPU vs CPU mode with automatic kickoff and active broadcast camera tracking.
- **Mid-Match Side Switching via Pause Menu**:
  - Added dedicated `[ 🎮 SIDE ]` button in `PauseModal.tsx`.
  - Allows players to dynamically reassign sides, join, leave, or enter Spectator mode mid-match without resetting play or losing match state.

---

## Phase 2: Startup Flow Overhaul, Captain Menu & Difficulty Tiers [COMPLETED]
*Priority: Correct Entry Point, 32-Bit Captain Hub, Difficulty Scaling Foundation*  
*Daily Token Budget Profile: Scope: `src/App.tsx`, `src/components/TeamSelectorModal.tsx`, `src/components/PreMatchPresentationModal.tsx`, `src/game/ai.ts`, difficulty settings in UnifiedSettingsModal | Target: ~700–800k tokens (1 Day's Quota)*

### 2.1 Correct Application Entry Sequence
- Application **must** start at **Team Selector** (never jump straight into a live match).
- After both teams are confirmed → transition into the **Captain Presentation Menu**.
- Remove every remaining "PES" / "Pro Evolution" string or stylistic reference from UI copy, comments, and asset labels.

### 2.2 32-Bit Captain Presentation Menu (Mobile-First, Zero-Scroll)
- Layout rules (strict single-screen, no scrolling):
  - Local team captain + kit on the **left**.
  - Away team captain + kit on the **right**.
  - On vertical mobile: show **only the local team**; add a top-right button `[ VIEW OTHER TEAM ]` that swaps the entire panel to the away side (uniform, tactics summary, stadium name).
  - On horizontal / desktop: both sides visible simultaneously.
- Bottom button row (single horizontal line, equally spaced, tactile 32-bit bevels):
  - `[ UNIFORM ]` | `[ TACTICS ]` | **`[ START ]`** (larger, centred) | `[ STADIUM ]` | `[ SETTINGS ]`
- Each button opens a dedicated, self-contained console-style sub-panel (no nested scrolling).
- START launches the match with currently selected teams, formations, playstyles, stadium and difficulty.

### 2.3 Five Difficulty Tiers (AI Effectiveness Scaling)
Add to Settings (and persist):
1. **Standing** – AI almost stationary, very slow reactions, high error rate (tutorial / casual).
2. **Easy** – Current baseline behaviour with relaxed decision timers.
3. **Normal** – Solid modern decisions, reasonable compactness, occasional mistakes.
4. **Elite** – Tight shape, aggressive but clean pressing, rare mistakes; only high-rated players consistently outplay them.
5. **Legend** – Near-perfect positioning, anticipation and decision-making; player must play almost perfectly to win.

Difficulty multiplies:
- AI reaction delay
- Cover-shadow tightness
- Pass error probability (still gated by player stats)
- Press intensity and recovery run commitment
- GK decision quality

---

## Phase 3: Goalkeeper Mechanical Mastery & Dual Control / AI Symmetry [COMPLETED]
*Priority: Full GK Control Scheme + Identical AI Logic*  
*Daily Token Budget Profile: Scope: `src/game/ai.ts`, `src/game/engine.ts`, `src/game/sprites.ts`, controller mapping | Target: ~750k tokens*

### 3.1 Human Goalkeeper Control Mapping (Ball State Aware)
- **Without ball**:
  - Short Pass → sprint full speed toward the ball.
  - Long Pass → spread / star shape to occupy maximum 1v1 blocking space.
  - Cross → high dive / jump in stick direction, aiming top corners, opposite-hand reach.
  - Shoot → low dive aiming bottom corner.
  - No input after opponent shot → automatic dive (medium height/power).
  - Ball Shield (Q) → high jump to catch (corners / crosses).
  - Special (E) → punch clear instead of catch.
- **With ball**: behaves exactly like an outfield player (same pass / clear / throw options).

### 3.2 AI Goalkeeper Uses Identical Decision Tree
- AI GK evaluates the same action set under the same conditions.
- Catch vs Punch decision driven by ball power, curve, and Handling / Reflexes attributes.
- 1v1 star-spread, high/low dives and recovery positioning scale with difficulty tier.

### 3.3 Procedural GK Sprite & Animation Hooks
- Lightweight procedural frames for dive, star-spread, catch, punch, distribution.
- No heavy sprite sheets; keep memory footprint mobile-safe.

---

## Phase 4: Modern Compact Positioning Foundation (AI Core – Part 1) [COMPLETED]
*Priority: 2026 Compactness, Block Height, Shape Maintenance*  
*Daily Token Budget Profile: Scope: `src/game/ai.ts`, `src/game/tactics.ts`, `src/game/formations.ts`, `src/game/pitchGrid.ts` | Target: ~800k tokens*

**Research grounding (2026 tactics)**: Teams keep vertical distance between the highest attacker and deepest defender typically 25–35 m. Mid-block is the default recovery shape. High press is selective and short; low block is used deliberately. Entire unit shifts together.

### 4.1 Vertical Compactness Engine
- Target vertical span (first attacker → last defender) clamped to 25–35 m depending on tactical playstyle and current phase of play.
- High-press phase: back line pushes higher; attackers stay connected.
- Mid-block phase: default recovery shape, compact central corridor.
- Low-block phase: attackers drop deeper to protect the box; no idle high strikers.

### 4.2 Synchronised Block Movement
- Entire team treated as a single elastic unit relative to ball X/Y.
- When the block shifts left/right or up/down, every line (defence, midfield, attack) moves together while preserving relative spacing.
- Difficulty scales how tightly and how quickly the block re-forms after a transition.

### 4.3 Rest-Defence & Transition Safety
- Always leave a minimum number of players behind the ball (rest defence) based on formation and playstyle.
- After losing possession, counter-press trigger window (first 3–5 seconds) is intensity-scaled by difficulty and tactical instructions.

### 4.4 Direct Implementation Notes (Token-Efficient)
- Extend existing role / sub-position system; do not rewrite formation data.
- Use pre-allocated target-position buffers; zero new allocations per frame.
- Expose a single `updateTeamBlockShape(team, ball, phase, difficulty)` entry point.

---

## Phase 4.5: Hotfix – Controller Auto-Binding, Side Selection Control Profile & Advanced Cursor Switching [COMPLETED & VERIFIED]
*Priority: Zero-Friction Match Startup, Authoritative Side Select Device Binding, Single/Team Scope, 3m Proximity Double-Tap Switching*  
*Daily Token Budget Profile: Scope: `src/components/SideSelectModal.tsx`, `src/components/PauseModal.tsx`, `src/components/ControllerSettingsModal.tsx`, `src/game/engine.ts`, `src/types.ts` | Target: ~600k tokens*

### 4.5.1 Instant Controller Auto-Binding & Settings Cleanup
- **Side Selection Authoritative Binding**:
  - The side selection step authoritatively registers and binds the user's active control device (Keyboard WASD, Keyboard Arrows, Gamepad index, or Touch) directly into `GameEngine` upon confirming sides.
  - Fix the match-start movement freeze bug: eliminate the requirement to pause, enter System Settings, and re-select the controller. Matches start immediately with active player responsiveness.
  - **Remove from System Settings**: Strip redundant controller selection menus from the in-game Settings/Pause modal to avoid state conflicts; controller assignment belongs strictly to Side Select.

### 4.5.2 Control Scope: Team vs. Single Player Lock
- Add control scope selection directly inside the Side Selection modal:
  1. **All Team** (Default): User controls the ball carrier when in possession and shifts between outfield players.
  2. **Single Player** (Fixed Lock): User selects and locks onto a specific outfield player or goalkeeper for the entire match (cursor switching disabled).
- When "Single Player" is selected, cursor switching settings are completely hidden and disabled.

### 4.5.3 Cursor Change Logic: Manual vs. Automatic
- Expose **Cursor Change** option in Side Selection (only visible when "All Team" mode is active):
  1. **Manual Mode** (Tactical Default):
     - In possession: Cursor automatically follows the ball carrier.
     - On pass / cross / shot: Cursor transfers to the targeted teammate receiver receiving the ball trajectory.
     - On interception / loose ball: Cursor switches to the teammate closest to the ball.
     - Without the ball: Cursor **never** auto-switches; player only changes when pressing the "Player Switch" button (Q / L1 / LB), which targets the teammate closest to the ball.
  2. **Automatic Mode**:
     - On-ball behavior is identical to Manual (controls carrier, pass transfer, loose ball capture).
     - Without the ball: Game engine automatically switches cursor to the defender closest to the ball at all times.

### 4.5.4 3-Meter Proximity Protection & Double-Tap Override
- **3-Meter Proximity Guard (< 3m / ~71 px)**:
  - Applies to **both** Manual and Automatic switching modes.
  - Prevents erratic or disorienting micro-switches between adjacent cluster defenders: the engine will **not** switch cursor to any candidate teammate situated less than 3 meters away from the currently controlled player.
  - In Automatic mode, if the closest defender is under 3 meters away, the switch is suppressed and the current player remains under user control.
- **Double-Tap Player Switch Override**:
  - If the user explicitly double-taps the "Player Switch" button within a 300 ms window, the 3-meter proximity guard is bypassed, executing an immediate micro-switch to that adjacent teammate.

---

## Phase 5: Advanced AI Positioning, Line Intermingling & Role Fluidity (AI Core – Part 2) [COMPLETED & VERIFIED]
*Priority: Realistic Occupation of Space, Modern Interlocking Lines*  
*Daily Token Budget Profile: Scope: `src/game/ai.ts`, `src/game/tactics.ts`, `src/game/formations.ts` | Target: ~800k tokens*

### 5.1 Line Intermingling Rules
- Forwards actively occupy and shadow opposition centre-backs / defensive midfielders (not stuck on their own half).
- Midfield line interlocks with both the defensive and attacking thirds according to playstyle (e.g. box-to-box vs holding).
- Full-backs / wing-backs tuck inside or push high based on tactical instructions and ball location.

### 5.2 Positional Roles Drive Off-Ball Behaviour
- Every AI player continuously evaluates its assigned Primary Role + Sub-Position + Playstyle to decide:
  - Support run type (underlap, overlap, blind-side, drop into pocket)
  - Cover shadow target
  - When to step out vs hold the line
- Higher Positioning / Reactions attributes = earlier, more accurate arrival at the optimal spot.

### 5.3 Difficulty-Scaled Anticipation
- Standing / Easy: delayed reaction, larger positioning errors.
- Normal: solid modern shape.
- Elite / Legend: near-perfect reading of ball trajectory and opponent intention; only the very best human play consistently beats them.

### 5.4 Implementation Guardrails
- Re-use existing `evaluatePlayerRoleFit` and pitch-grid helpers.
- Keep all calculation inside the already zero-allocation AI tick.
- Unit-test compactness and intermingling distances on a few canonical formations (4-3-3, 4-2-3-1, 3-5-2, 5-3-2).

---

## Phase 6: AI Decision Quality, Passing Logic, Clean Defending & Anti-Spam [COMPLETED & VERIFIED]
*Priority: Intelligent Choices, Stat-Grounded Errors, Modern Pressing Intensity*  
*Daily Token Budget Profile: Scope: `src/game/ai.ts`, `src/game/ballPhysics.ts`, `src/game/engine.ts` | Target: ~750–800k tokens*

### 6.1 Decision-Making Hierarchy
- AI chooses the highest-value available action under pressure:
  1. Safe progressive pass into free pocket
  2. Cross-field switch when wing is overloaded
  3. Controlled clearance only when no progressive option exists
- Eliminate the current “20 back-passes between two CBs” loop. Under pressure the AI must play forward or switch.

### 6.2 Pass / Cross / Shot Accuracy Strictly Stat-Driven
- Miss probability is a function of Short Pass / Long Pass / Crossing / Shooting attributes + pressure + fatigue + difficulty multiplier.
- A 90-rated passer under light pressure almost never misses a simple pass; a 45-rated player under high press frequently does.
- Long-range power shots and switches travel the full required distance (see Phase 7); distance only reduces aiming precision, not velocity.

### 6.3 Clean Tackling & Foul Calibration
- Good defenders (high Tackling + Positioning) preferentially use standing tackles and toe-pokes.
- Sliding tackles reserved for last-ditch or specific aggressive philosophies.
- Fouls become rare on Elite/Legend; more common only on low-defending-stat players or when the tactical instruction is ultra-aggressive.

### 6.4 Modern Pressing Intensity
- Every opponent in possession should feel 1–2 markers within realistic distance (modern “always under pressure” principle).
- Press triggers and recovery runs scale with difficulty and the team’s chosen playstyle (High Press vs Mid Block vs Low Block).

---

## Phase 7: True Long-Range Ball Flight, Cambio de Frente & Physics Polish [COMPLETED & VERIFIED]
*Priority: Authentic Trajectory Distance & Cross-Field Switches*  
*Daily Token Budget Profile: Scope: `src/game/ballPhysics.ts`, `src/game/engine.ts`, `src/game/physics.ts`, `src/game/playerActions.ts` | Target: ~650–750k tokens*

### 7.1 Extended Flight Curve
- 80–95 % power shots / long passes from three-quarter pitch must reach the penalty area / goal with remaining pace (> 18–35 px/f).
- Aerodynamic drag is realistic; high-velocity soccer balls enter the drag crisis where narrow turbulent wakes preserve velocity; distance makes aiming harder, it does not kill velocity.
- Backspin generates positive aerodynamic Magnus lift ($+z$), keeping driven balls and switches in prolonged flight before dipping cleanly into target pockets.

### 7.2 Automatic “Cambio de Frente” (Switch of Play)
- High-power cross aimed from one wing toward the opposite flank is automatically interpreted as a flat switch.
- Ball receives appropriate leading space vector ahead of the opposite winger / fullback so they can take it in stride.
- User control automatically transfers to the receiving winger sprinting onto the ball.

### 7.3 Consistency with Existing Chip / Driven / Swerve Modifiers
- Preserves the current E / Q modifier suite across all actions:
  - E: Delicate chip / floating loft with soft backspin landing.
  - Q: High Magnus lateral curvature bending around defensive lines.
  - Full synergy with Phase 6 Stat Breaks (Thunderbolt Cannon, Radar Telemetry, Guided Whip, Deadly Assassin, Laser Ping).

---

## Phase 8: Procedural Dribbling Animation Tiers, On-Ball Acceleration & Ginga [COMPLETED & VERIFIED]
*Priority: Fluid On-Ball Locomotion, Skill Differentiation*  
*Daily Token Budget Profile: Scope: `src/game/animationEngine.ts`, `src/game/sprites.ts`, `src/game/ginga.ts` | Target: ~750–850k tokens*

### 8.1 Six Dribbling Animation Tiers
| Attribute Band | Tier Name          | Animation Character                     |
|----------------|--------------------|-----------------------------------------|
| 40–59          | Amateur            | Heavy, upright, slow turns              |
| 60–69          | Semi-Pro           | Basic close control                     |
| 70–79          | Pro                | Sharper cuts, better body feints        |
| 80–89          | Elite              | Quick step-overs, rapid direction change|
| 90–99          | World Class        | Fluid, low centre of gravity, explosive |
| 100+ (Stat Break) | Unique           | Signature / exaggerated elite moves     |

### 8.2 On-Ball Physics Separation
- Top speed still governed by Pace.
- Acceleration while on the ball and turn radius governed by Dribbling + Ball Control.
- Higher tiers unlock faster, cleaner animations for step-overs and skill moves.

### 8.3 Ginga Thresholds
- Effective only with Ball Control ≥ 70 **and** Dribbling ≥ 70.
- At 90+ on both attributes it becomes highly reliable.
- Below threshold: high failure / loss-of-possession chance.

### 8.4 Supporting Animations
- Lightweight procedural improvements for standing tackle, sliding tackle, shooting follow-through (no heavy new sprite sheets).

---

## Phase 9: Aerial Anticipation, Headers, Volleys & Rebound Reflexes [COMPLETED & VERIFIED]
*Priority: Reading Flight Paths & Winning the Second Ball*  
*Daily Token Budget Profile: Scope: `src/game/ai.ts`, `src/game/ballPhysics.ts`, `src/game/animationEngine.ts` | Target: ~700–800k tokens*

### 9.1 Drop-Zone Prediction
- AI calculates expected landing zone of aerial balls.
- Positioning attribute determines how early the player starts moving to the optimal spot.
- Interceptions attribute helps defenders arrive first to clear.

### 9.2 Header / Volley / Clearance Animations
- Procedural header (directed / glancing / power), volley, and defensive clearance frames.
- Timing window scales with Reactions and Heading / Volleying attributes.

### 9.3 Rebound & Second-Ball Reflexes
- Reflexes attribute shortens reaction time to deflections and loose balls in the box.
- Higher difficulty AI wins a larger share of second balls.

---

## Phase 10: Live Player Rating Engine (SofaScore Model) & Match MVP [COMPLETED & VERIFIED]
*Priority: Zero-Allocation Live Analytics*  
*Daily Token Budget Profile: Scope: `src/game/playerRatings.ts` (new), `src/game/engine.ts`, HUD components, EndGameModal | Target: ~700k tokens*

### 10.1 Live Rating Core
- Every player starts at 6.0.
- Pre-allocated rating array; zero GC pressure.
- Positive / negative event matrix (pass, dribble, shot, tackle, foul, card, goal, own-goal, clean-sheet contribution, etc.).
- Human player’s live rating shown as a small floating badge (bottom-right, above controller).

### 10.2 End-Game Board & MVP
- Full team ratings list.
- Highest-rated player receives Match MVP gold star treatment.
- Subbed players’ ratings freeze at the moment of substitution.

---

## Phase 11: Dynamic Stadiums & Match Atmosphere [COMPLETED & VERIFIED]
*Priority: Living Stadium Audio, Dynamic Crowd Chants & Contextual Intensity*  
*Daily Token Budget Profile: Scope: `src/game/crowdRenderer.ts`, `src/game/audio.ts`, `src/game/stadiumRenderer.ts` | Target: ~700–800k tokens*

### 11.1 Dynamic Crowd Acoustics & Reactivity
- Crowd reaction scales with match context (near misses, last-minute goals, high-tackle derby intensity).
- Contextual home-crowd cheering, away booing, and dynamic goal celebrations.
- Authentic soundscapes depending on stadium capacity and architecture (intimate vs massive stadium resonance).

### 11.2 Visual Crowd & Banner Immersion
- Dynamic crowd density matching team reputation and match stakes.
- Procedural ultra-low-cost animated crowd sprites waving club-colored scarves and banners.
- Flashbulb pops in stands during night matches and penalty shootouts.

### 11.3 Kickoff Stadium Selector & 6 Crowd Attendance Levels
- **Pre-Match Kickoff Integration (`[ STADIUM ]` option)**:
  - Accessible directly in the Pre-Match Captain Presentation Screen under `[ STADIUM ]`.
  - Added interactive **Crowd Level** selection with 6 distinct attendance tiers:
    1. **Empty**: 0% attendance. Behind-closed-doors ghost match; hollow echo acoustics, ball strikes reverberate across bare concrete terraces, zero crowd singing, audible player and coach shouting.
    2. **Small**: ~15–20% attendance. Sparse supporter pockets; polite isolated applause, distant shouts, minimal acoustic pressure.
    3. **Few**: ~35–45% attendance. Modest localized turnout; sporadic cheers, scattered fan murmurs, moderate reaction to chances.
    4. **Half**: ~50–65% attendance. Solid half-capacity hum; collective gasps on close attempts, energetic goal roar.
    5. **Crowded**: ~80–95% attendance. Near capacity; loud sustained wall-of-sound chanting, intense home advantage roar, deafening whistles on fouls.
    6. **Packet**: 100%+ attendance (to the brim / over-capacity final). Over-top capacity like a continental or World Cup final; packed standing room, maximum acoustic pressure, thunderous reverberation, constant seismic chants, flares/confetti, and deafening stadium roar.
- **Dynamic Audio & Visual Coupling**:
  - Modulates procedural grandstand crowd density and ultras flag/banner density in real-time.
  - Dynamically scales audio volume, reverb, cheer intensity, and reactive chants.

---

## Phase 12: Data-Driven Stadium Architecture, Dugout Benches, Entrance Tunnels & Team Venues [COMPLETED & VERIFIED]
*Priority: Comprehensive Stadium Data Models, 5 Stand Grades, Wall vs Multi-Tier Logic, Dugout Benches & Entrance Tunnels Architecture, Dynamic FIFA Qualification & Team Home Venue Registry*  
*Daily Token Budget Profile: Scope: `src/types/stadium.ts`, `src/types/team.ts`, `src/game/teamDatabase.ts`, dugout & tunnel specifications, FIFA rating math | Target: ~700–800k tokens (1 Day's Quota)*

### 12.1 Pitch Dimension Presets, Turf Physics & Weather Baseline [COMPLETED & VERIFIED]
- Standard, Wide (wing play advantage), Narrow (midfield congestion), Long, and Short pitch presets (`src/game/pitchDimensions.ts`).
- Dynamic weather conditions: Dry, Rain, Heavy Rain, Snow, and Fog with mud and wet ground-skid physics (`src/game/weatherEngine.ts`, `src/game/turfPhysics.ts`).
- Surface status and tactical pitch boundary scaling integrated into match simulation.

### 12.2 Data-Driven Stadium Architecture & 5 Architectural Stand Grades
Stadiums are lightweight, serializable JSON configuration objects with procedural Canvas 2D math (zero bulky 3D meshes, zero GC pressure on budget devices):

1. **Four Architectural Shapes**:
   - `Round` (Maracanã / Estadio Olímpico bowl).
   - `Oval` (Elongated athletics bowl).
   - `Square` (8 stands: 4 straight main stands + 4 independent corner stands).
   - `Rectangular` (Classic English box ground: elongated East/West touchline stands + 4 corner stands).
2. **Five Stand Architectural Grades (Quality / Luxury / Finish Level)**:
   - **Grade 1 – Municipal**: Exposed rough cinder blocks, weathered timber benches, basic utilitarian perimeter, rustic grassroots aesthetic.
   - **Grade 2 – Classic**: Traditional English red-brick masonry, painted structural steel trusses, standard stadium plastic fold-down seats.
   - **Grade 3 – Industrial**: Heavy corrugated steel cladding, exposed industrial I-beams, raw galvanized metal finish.
   - **Grade 4 – Modern**: Smooth pre-cast architectural concrete, cantilevered sweeping roofs, high-grade ergonomic bucket seats, clean glass balustrades.
   - **Grade 5 – Futuristic**: Anodized aero-aluminum cladding, translucent tensile ETFE composite roofs, illuminated VIP seating, continuous panoramic LED ribbon fascia boards.
3. **Multi-Tier Stacking vs Wall Tier Architecture**:
   - **Standard Stacked Tiers (1 to 4 Decks)**:
     - Independent stacked spectator tiers separated by fascia balconies and vomitories.
     - Each tier has customizable size: `"small"`, `"medium"`, `"large"`.
     - Each tier visually stacks directly on top of the lower tier, scaling stand height, depth, and capacity in real-time.
   - **Wall Tier (Single Gigantic Dortmund-Style Kop / "Die Gelbe Wand")**:
     - A massive, steep, continuous single terrace without intermediate deck dividers spanning the entire stand height.
     - 3 Wall Tier Sizes:
       - `"large"`: Occupies the full height, depth, and volume equivalent to a 4-tier stand of large tiers.
       - `"medium"`: Scaled ~20% smaller than Large.
       - `"small"`: Scaled ~40% smaller than Large.
4. **"No Stand" Option & Fused Surroundings-Driven Backdrops**:
   - Any stand can be configured as `"none"` (`No Stand`), allowing authentic asymmetric or modest 2-sided/3-sided grounds (e.g., Gibraltar's Victoria Stadium beside the rock/runway, Braga's granite quarry, Oxford United's 3-sided stadium).
   - Stand capacity contribution = 0.
   - **Fused Surroundings Binding**: The available side background variants for "No Stand" are directly determined by the stadium's global **Surroundings** (selected in Step 1 Structure):
     - **Small City**: `Mall`, `Parking Lot`, `Apartment Buildings`, `Small Houses` (plus `Wall`).
     - **Beach**: `Beach Seaside`, `Apartment Buildings`, `Small Houses` (plus `Wall`).
     - **Big City**: `Skyscrapers / Downtown Avenue`, `Apartment Buildings`, `Mall`, `Metro Rail Overpass` (plus `Wall`).
     - **Nature**: `Mountain / Forest`, `Open Alpine Hills`, `Lake / Valley` (plus `Wall`).
     - **Airport** (Gibraltar style): `Runway Tarmac with Aircraft`, `Hangars & Control Tower`, `Freight Depot` (plus `Wall`).
     - **Railroad**: `Multi-Track Train Depot`, `Freight Railyard`, `Industrial Gantries` (plus `Wall`).
     - **Parking Lot**: `Paved Parking Bays & Team Buses`, `Perimeter Tree Boulevard` (plus `Wall`).
     - **Marine Floating**: `Open Ocean Water`, `Floating Pontoons & Pier`, `Harbor Marina` (plus `Wall`).
   - **Universal Wall Rule**: `"Wall"` is **always available** across all surrounding types.
     - When `"Wall"` is chosen as the background: the separate perimeter finish sub-option is disabled and replaced directly with:
       - Wall Size: `"low"`, `"medium"`, `"tall"`.
       - Wall Material: `"brick"`, `"concrete"`, `"stone"`, `"timber"`, `"metal cladding"`.
     - When any other contextual backdrop variant is chosen: the user selects a **Perimeter Finish** in front of the background (`"none"`, `"small fence"`, `"big fence"`, `"chainlink steel fence (big)"`, `"brick wall"`, `"concrete wall"`).
5. **Decoupled Fence & Perimeter Barrier Specification**:
   - Barrier Size: `"none"` | `"small"` | `"medium"` | `"big"` | `"huge"`.
   - Barrier Material: `"brick"` | `"cement"` | `"wood"` | `"chain link steel"` | `"aluminum picket"`.
6. **Seat Styles & Patterns**:
   - 4 distinct seat styles: `"plastic_bench"`, `"classic_bucket"`, `"tip_up_padded"`, `"vip_leather"`.
   - 5 seat patterns: `"solid"`, `"perStand"`, `"horizontalBands"`, `"verticalStripes"`, `"lowerUpper"` with 1 to 4 colors.
7. **Athletics Running Track**:
   - `hasTrack`: boolean (strictly exclusive to `Round` and `Oval` stadiums; omitted on `Square` and `Rectangular`).
8. **Lighting Model**:
   - Floodlight towers / pylons / roof banks with daytime sunlight pools and night lighting.
9. **Eight Outside Environment Surroundings (Structure Step)**:
   - Configured in the initial stadium structure setup alongside Shape.
   - `Nature`, `Parking Lot` (Camp Nou style), `Small City`, `Big City`, `Airport`, `Railroad`, `Beach`, `Marine Floating`.
10. **Dynamic FIFA Qualification & Capacity Mathematical Models**:
    - Capacity calculated additively per stand based on shape, tier count/sizes, or wall tier dimensions (0 for No Stand).
    - Qualification Category computed dynamically:
      - `National`: Capacity < 15,000, basic municipal/classic finishes (2nd division/grassroots standard).
      - `First Division`: Capacity 15,000–35,000, industrial/modern finishes, standard floodlights (top-flight league standard).
      - `Continental`: Capacity 35,000–60,000, modern finishes, high-power floodlights (UCL, UEL, Copa Libertadores standard).
      - `World`: Capacity 60,000+, modern/futuristic finishes, premium lighting, pristine turf (World Cup Finals standard).

### 12.3 Manager & Player Dugout Benches Architecture
- **Dedicated Bench / Dugout Specification**:
  - Full configuration options for manager, technical coaching staff, and substitute players along the touchline.
  - **Five Bench Types**:
    1. **`Recaro Racing Bucket Seats`**: Elite modern European luxury dugouts with contoured ergonomic leather racing seats, heated cushions, and team badge styling (Premier League / Champions League standard).
    2. **`Covered Sunken Dugout Shelter`**: Traditional sub-surface dugout trench sunken into the touchline turf, fitted with an arched transparent polycarbonate / acrylic weather shield.
    3. **`Classic Timber Bench`**: Nostalgic grassroots / municipal wooden bench with slatted timber seat and backrest.
    4. **`Utilitarian Concrete Dugout`**: Heavy cast cinder-block dugout bunker with solid concrete benching (classic South American or lower-league atmospheric style).
    5. **`Pitch-Level Folding Chairs`**: Portable metal or plastic fold-out touchline seating for open community grounds.
  - **Four Bench Quality Tiers**:
    - `Municipal` (Basic unpadded seating, rustic grassroots feel).
    - `Classic` (Standard molded plastic dugout seats with simple painted shelter).
    - `Modern` (Ergonomic sports seats with sleek tinted shelter canopy).
    - `Elite VIP` (Plush leather heated bucket seats with illuminated technical canopy).
  - **Customizable Attributes**:
    - Frame color, seat cushion color, shelter canopy tint, and touchline placement / setback.
  - **Matchday & Cinematic Integration**:
    - Provides data hooks and focal anchors for bench reactions (manager celebrations, protests, player substitutions, and touchline cinematics).

### 12.4 Player Entrance Tunnels Architecture
- **Dedicated Entrance Tunnel Specification**:
  - Distinct entrance portals for pre-match walkouts, anthem lineups, half-time departures, and matchday cinematics.
  - **Five Entrance Tunnel Types**:
    1. **`Inflatable Accordion Tunnel`**: Iconic South American style flexible bellows / inflatable tube that extends from the grandstand portal all the way to the touchline (often decorated with club colors/mascot motifs) to protect players from crowd flares, confetti, and projectiles.
    2. **`Modern Architectural Tunnel`**: Ultra-high-tech backlit tunnel featuring recessed ambient LED ribbon lights, dark matte / brushed steel wall panels, and sleek glass balustrades (inspired by modern venues like Crystal Palace, Tottenham Hotspur, Allianz Arena).
    3. **`Subterranean Staircase Tunnel`**: Classic English and European sunken tunnel where players climb concrete steps from subterranean dressing rooms directly onto the pitch surface.
    4. **`Direct Pitch-Level Portal`**: Flush arched brickwork or concrete portal opening directly into the grandstand concourse with a motorized metal security grille.
    5. **`Covered Telescopic Canopy Tunnel`**: Motorized sliding transparent canopy on rolling tracks extending over the touchline boundary.
  - **Tunnel Siting & Alignment**:
    - `Center Main Stand`: Traditional midfield touchline walkout.
    - `Pitch Corner`: Diagonal stadium corner walkout (classic continental style).
    - `Behind Goal`: Dramatic tunnel opening centered directly behind the North or South goal line.
  - **Matchday & Cinematic Integration**:
    - Coordinates pre-match team entrance walkouts, captain handshakes, and tunnel camera inspection angles.

### 12.5 Team Home Stadium Binding & Kickoff Venue Registry
- **Team-Specific Home Venue Registry**:
  - In `src/game/teamDatabase.ts`: bind any registered stadium to a team as its official Home Stadium.
  - Configure team venue overrides: `pitchPattern`, `netStyle`, `pitchSizePreset`, `turfQuality`, `fanColors`, `bannerMessages`, `sponsors`, `dugoutStyle`, `tunnelStyle`.
- **Kickoff Automatic Selection & Locking**:
  - In `KICK OFF`: when a team is chosen as Home, its official Home Stadium is selected automatically by default.
  - In the pre-match stadium selector, a prominent gold `[ HOME ]` badge appears when the home team has a designated venue.
  - When `[ HOME ]` is selected, pitch pattern, net style, turf quality, pitch dimensions, dugouts, and tunnel are locked to the team's official venue settings.
  - When a neutral stadium is chosen, all aesthetic and tactical parameters remain user-configurable.

---

## Phase 13: 32-Bit Arcade Main Menu System & Live Matchday Procedural Stadium Renderer [COMPLETED & VERIFIED]
*Priority: 32-Bit Main Menu Launch Hub, Real-Time 60 FPS Procedural Canvas 2D Stadium Renderer & Matchday Visuals*  
*Daily Token Budget Profile: Scope: `src/components/MainMenuModal.tsx`, `src/game/stadiumRenderer.ts`, `src/game/pitchRenderer.ts`, `src/App.tsx` | Target: ~750–850k tokens (1 Day's Quota)*

### 13.1 32-Bit Arcade Main Menu (Launch Screen)
- **Top-Level Application Entry Point**:
  - Main Menu loads first on launch before entering Kick Off or Editor.
  - Authentic 32-bit console visual design (chiseled metallic steel panels, cyan/gold LED backlit badges, embossed action buttons, zero-scroll single-screen).
  - 3 Primary Options:
    1. **`[ ⚽ KICK OFF ]`**: Initiates match flow $\rightarrow$ Side Select $\rightarrow$ Team Selector $\rightarrow$ Captain Menu $\rightarrow$ Matchday.
    2. **`[ ⚙️ SETTINGS ]`**: Opens the Unified Game Settings modal (Graphics, Controls, Audio, Match Rules).
    3. **`[ 🛠️ EDITOR ]`**: Opens a dedicated 2-option editing portal:
       - **`[ 👥 TEAMS ]`**: Edit team tactical game plans, formations, playstyles, and assign official **Home Stadium** with custom venue settings.
       - **`[ 🏟️ STADIUMS ]`**: Launches the Stadium Creator & Inspector suite (Phase 14).

### 13.2 Live Matchday Procedural Stadium Renderer
- **Unified Procedural Canvas 2D Pipeline**:
  - Draws any configured stadium directly onto the pitch canvas at a locked 60 FPS on budget devices.
  - Matches the exact visual fidelity of the Stadium Creator preview ("What You See Is What You Get").
  - Procedural rendering of all 5 stand grades (Municipal cinder blocks, Classic red-brick masonry, Industrial corrugated steel, Modern concrete cantilevers, Futuristic aero-aluminum & ETFE).
  - Procedural rendering of **Manager & Player Dugout Benches** along the touchline (bucket seats, sunken shelters, wooden benches) with seated subs, coaches, and manager sprites.
  - Procedural rendering of **Player Entrance Tunnels** (South American inflatable accordion tunnel, modern architectural tunnel, staircases, portals) positioned accurately along touchlines.
  - Architectural shadow volumes: circular soft pool for Round/Oval, angular envelope for Square/Rectangular.
  - Pitch-level rendering of open ends ("No Stand" fences, background houses, skyscrapers, mountains, runways, or perimeter walls tied to surroundings).
  - Athletics running track rendering for Round and Oval stadiums.
  - Zero per-frame memory allocations; geometry and path data pre-computed at match start.

---

## Phase 14: Interactive 32-Bit Stadium Creator & Stand Camera Director Suite [COMPLETED & VERIFIED]
*Priority: Real-Time WYSIWYG Editor, Top-Right Multi-View Camera Switcher Icon (7 Views), Stand-by-Stand Inspector, Dugout & Tunnel Customizers & Live FIFA Qualification HUD*  
*Daily Token Budget Profile: Scope: `src/components/StadiumCreatorModal.tsx`, stand camera inspector hooks, bench & tunnel editor panels, top-right camera director icon | Target: ~750–850k tokens (1 Day's Quota)*

### 14.1 Top-Right Multi-View Camera Switcher Suite (Camera Icon)
- **Top-Right Quick-Switch Camera Director**:
  - Positioned prominently on the **top-right** of the Stadium Editor header as a 32-bit camera aperture / camcorder icon `[ 📹 CAM ]`.
  - Pressing the icon opens an arcade camera selection popover or cycles across **7 Specialized Camera Perspectives**:
    1. **Relevant View (Default)**: Dynamically frames whatever component is currently being edited in the inspector (e.g., zooms to East stand when editing East stand, tilts to Roof when editing roof structures, pans down to Dugouts when editing benches, tracks to Tunnel portal when editing entrance tunnel).
    2. **Full Pitch View**: Classic broadcast overview framing the entire pitch surface, touchlines, technical areas, and surrounding perimeter.
    3. **Stands View**: Dedicated spectator grandstand inspection camera with rapid stand-by-stand cycling (`East` $\leftrightarrow$ `South` $\leftrightarrow$ `West` $\leftrightarrow$ `North` $\leftrightarrow$ `Corners`).
    4. **Playing Field Focus View**: Tight pitch-level focus centered on the playing surface, turf stripe pattern, penalty boxes, goal netting, and center circle.
    5. **Aerial Sky-Cam (Far View)**: High-altitude bird's-eye perspective framing the entire stadium footprint, outer architecture, and surrounding landscape (Nature, City, Beach, Airport, etc.).
    6. **Tunnel Camera**: Dramatic low-angle cinematic perspective focused directly on the player entrance tunnel (inflatable accordion, modern glass/steel, stairs, portal), previewing walkouts and cinematic framing.
    7. **Bench Camera**: Touchline dugout perspective focused on the manager and substitutes' bench (Recaro racing bucket seats, sunken shelters, wooden benches), previewing technical area celebrations and manager reactions.
- **Dual-Purpose Matchday Cinematics**:
  - The exact camera positions and lens angles tuned in the editor are reused directly during matchday cinematics (pre-match walkouts, anthem lineups, substitution cuts, and celebration close-ups).

### 14.2 Visual WYSIWYG Real-Time Matchday Preview
- Renders the stadium in real-time using the exact same procedural Canvas 2D renderer used in live matches.
- Base stadium initializes with lowest tier (Tier 1) in Small size across all stands, with stacked tiers visible immediately.

### 14.3 Persistent Bottom-Left 32-Bit HUD Box (Qualification & Capacity)
- Displayed on the bottom-left at all times in a chiseled 32-bit metallic console box:
  1. **"Qualification"**: Real-time FIFA stadium category indicator:
     - `National` $\rightarrow$ `First Division` $\rightarrow$ `Continental` $\rightarrow$ `World`.
     - Accrued dynamically based on current capacity, stand architectural grades, floodlights, and turf quality.
  2. **"Capacity"**: Real-time numerical capacity meter summing each stand's selected tier, wall, or "no stand" contribution.

### 14.4 Step-by-Step Creation Wizard & Inspector
1. **Step 1: Structure, Shape & Surroundings**:
   - **Shape Selection** (`Round`, `Oval`, `Square`, `Rectangular`): Camera in full-stadium framing.
   - **Surroundings Selection** (`Small City`, `Beach`, `Big City`, `Nature`, `Airport`, `Railroad`, `Parking Lot`, `Marine Floating`):
     - Dynamic Camera Shift to Aerial Sky-Cam when focusing on Surroundings.
   - **Athletics Running Track**: Exclusive to `Round` or `Oval`; omitted for Square/Rectangular.
2. **Step 2: Stand-by-Stand Focus Camera & Chiseled Inspector**:
   - Navigation (`East` $\leftrightarrow$ `South` $\leftrightarrow$ `West` $\leftrightarrow$ `North`, plus corners).
   - Stand Type & Tiers (1–4 stacked tiers, Wall Tier [small/medium/large], or No Stand + surroundings backdrop / perimeter wall / fence).
   - Stand Architectural Grade (5 grades: Municipal, Classic, Industrial, Modern, Futuristic).
   - Stand Structure Colors (primary & secondary).
   - Roof Inspector & Fence / Barrier Inspector.
3. **Step 3: Dugouts & Player Entrance Tunnel Inspector**:
   - **Manager & Substitutes' Bench**: Select Bench Type (`Recaro Bucket Seats`, `Covered Sunken Shelter`, `Classic Timber`, `Utilitarian Concrete`, `Folding Chairs`), Quality Tier, frame/cushion colors, and shelter tint.
     - *Camera automatically switches to **Bench Camera** when editing dugouts!*
   - **Player Entrance Tunnel**: Select Tunnel Type (`Inflatable Accordion Tunnel`, `Modern Architectural Tunnel`, `Subterranean Staircase`, `Direct Pitch-Level Portal`, `Telescopic Canopy`), portal siting, and colors.
     - *Camera automatically switches to **Tunnel Camera** when editing entrance tunnels!*
4. **Step 4: Stand Completion & Satisfaction Confirmation**:
   - Confirmation modal to lock stand architecture and advance to aesthetics.
5. **Step 5: Full-Stadium Pan – Seat Color, Pattern & Styles**:
   - Camera pans out to frame the entire stadium bowl.
   - Select Seat Pattern (`solid`, `perStand`, `horizontalBands`, `verticalStripes`, `lowerUpper`) and 1–4 colors.
   - Select Seat Style (`plastic_bench`, `classic_bucket`, `tip_up_padded`, `vip_leather`).
6. **Step 6: Floodlights & Final Registry Save**:
   - Configure lighting setup (number of banks, power, placement, day/night).
   - Name stadium and save into the persistent global stadium registry.

---

## Phase 15: Aerial Sky-Cam Broadcast Presentation & Dual-Layer Outside Environment Engine [COMPLETED & VERIFIED]
*Priority: 32-Bit Bird's-Eye Stadium Sky-Cam, Seamless Pitch Cam Swoop Transition & Dual-Perspective Outside Environments*  
*Daily Token Budget Profile: Scope: `src/game/skyCamRenderer.ts`, `src/game/environmentRenderer.ts`, pre-match camera transition director | Target: ~750–850k tokens (1 Day's Quota)*

### 15.1 Dual-Perspective Outside Surroundings Engine
Every outside environment provides both pitch-level horizon graphics and aerial bird's-eye canvas graphics:
1. **Nature**: Alpine green hills, forest canopies, open sky.
2. **Parking Lot (Camp Nou Style)**: Asphalt parking bays, parked cars, team buses, pedestrian boulevards, perimeter trees.
3. **Small City**: Suburban townhomes, neighborhood streets, red-brick commercial buildings.
4. **Big City**: Dense metropolitan skyscrapers, arterial highways, elevated rail lines.
5. **Airport (Gibraltar Style)**: Adjacent tarmac runway, hangars, taxiways, control tower, taxiing aircraft.
6. **Railroad**: Multi-track train depot, freight railyard, industrial gantries, moving train sprites.
7. **Beach**: Sandy coastline, turquoise ocean surf, palm trees, seaside promenade.
8. **Marine Floating**: Ocean water envelope, floating pontoons, harbor boats, perimeter buoys.

### 15.2 32-Bit High-Altitude Aerial Sky-Cam Renderer
- Procedural bird's-eye canvas renderer capturing the full stadium footprint, outer facade cladding, roof geometry, parking/surroundings, and central pitch (inspired by Camp Nou aerial reference).
- Accessible in Stadium Creator as an Aerial Inspector mode and in pre-match presentation.

### 15.3 Seamless Pre-Match Sky-Cam to Pitch-Cam Zoom Swoop
- Matchday presentation begins with the Aerial Sky-Cam framing the stadium and its surrounding environment.
- As teams line up, the camera initiates a smooth, cinema-grade zoom-in swoop, transitioning seamlessly through the roofline down to the standard broadcast pitch view before the referee blows the kickoff whistle.

---

## Phase 15.5: Stadium Geometry, Apron Perimeters & Time-of-Day Preview Director [COMPLETED & VERIFIED]
*Priority: Aerial Pitch Enclosure Calibration, Running Track Geometry, 6-Material Apron Perimeters & Top-Right Time-of-Day Quick Director*  
*Daily Token Budget Profile: Scope: `src/types/stadium.ts`, `src/game/stadiumRegistry.ts`, `src/game/stadiumRenderer.ts`, `src/game/skyCamRenderer.ts`, `src/components/StadiumCreatorModal.tsx` | Target: ~700–800k tokens (1 Day's Quota)*

### 15.5.1 Aerial View Aperture Calibration & Zero Pitch Protrusion
- Recalibrated stadium outer footprint dimensions (2650–2900px) and inner aperture opening (`apertureRadiusX = 930–960px`, `apertureRadiusY = 660–740px`) to securely enclose the regulation pitch (`1350x900px`, radii `675x450px`), apron (`1620x1140px`), and 8-lane running track.
- Completely eliminated pitch bleeding and protrusion outside the stadium shell in both Bird's-Eye Aerial Sky-Cam and Full Pitch Views.
- Guaranteed structural containment margins (minimum 200px lateral margin, 150px vertical margin).

### 15.5.2 Running Track Geometry Calibration for Round & Oval Stadiums
- Running track geometry repositioned cleanly between pitch apron and grandstand bowl.
- In `round` stadiums: Continuous concentric circular 8-lane running track enclosing the pitch.
- In `oval` stadiums: Olympic track with straight touchlines and semicircular horseshoe end arcs behind North and South goals.
- Multi-lane regulation markings, start/finish line staggers, hurdle tick marks, and touchline sand jump pits.

### 15.5.3 Architectural Shape Distinctiveness in Full Pitch View
- Distinct geometric models across all 4 canonical shapes:
  - **Round**: Smooth coliseum circular amphitheater; touchline grandstands bow outward with sweeping curved fascias; corner quadrants render concentric radial seating sweeps.
  - **Oval**: Straight touchline stands with sweeping semicircular horseshoe endzone grandstands behind North and South goals.
  - **Square**: Symmetric 4-stand rectilinear arena; four 45° angled corner pavilion towers with diamond seating and diagonal glass balustrades linking the stands.
  - **Rectangular**: Traditional English 4-stand box ground; standalone stands with sharp 90° corner gaps, corner turnstiles, and exposed gable roof trusses.

### 15.5.4 Apron Perimeter Material Selector (6 Variants)
- Added new `apronMaterial` property to `StadiumDefinition` with 6 procedural materials:
  1. `grass`: Lush natural turf apron with lawn mower striping and white technical area line.
  2. `concrete`: Brushed architectural concrete slabs with expansion joint pavers and drainage grates.
  3. `rubber_tartan`: High-grip non-slip tartan athletic rubber in terracotta red or Olympic blue.
  4. `artificial_turf`: Lime synthetic astroturf with carpet roll seam tape.
  5. `gravel_ballast`: Crushed river stone / ballast gravel with textured rock flecks.
  6. `asphalt_paved`: Deep charcoal tarmac asphalt with yellow hazard safety curb borders.
- Supported in Step 1 of the Stadium Creator and rendered in both Aerial Sky-Cam and Live Matchday Full Pitch View.

### 15.5.5 Interactive Top-Right Time-of-Day Quick Director (Sun / Sunset / Moon Cycle)
- Positioned prominently in the top-right header of `StadiumCreatorModal.tsx`, immediately to the left of the `[ 📹 CAM ]` director button.
- Single-tap 3-stage cycling mechanism:
  1. **☀️ Sun (Morning / Noon)**: Crisp bright daylight, vibrant turf greens, sharp perpendicular shadows.
  2. **🌅 Dying Sun (Afternoon / Sunset)**: Golden hour radiance, rich amber, fiery orange, deep red, and purple ambient sky wash, long dramatic diagonal drop shadows across the pitch.
  3. **🌙 Moon (Night)**: Deep nocturnal indigo sky, cool moonlight, high-intensity stadium floodlight cones with ground pools, lit VIP executive suites, and glowing green emergency exit signs.
- Instant live feedback: tapping directly updates `stadium.lighting.timeOfDay` and triggers a real-time WYSIWYG re-render on the canvas.

---

## Phase 15.6: 32-Bit Pixel Art Grandstand Substance & Material Texturing [COMPLETED & VERIFIED]
*Priority: Eliminating Floating Signs, Grounded Architectural Physics, Tier Cantilevers, Vomitories & 5 Authentic Material Textures*  
*Daily Token Budget Profile: Scope: `src/game/stadiumRenderer.ts`, `src/game/__tests__/phase15_6Stadium32BitArt.test.ts`, `src/types/stadium.ts` | Target: ~750–850k tokens (1 Day's Quota)*

### 15.6.1 Anti-Floating Grandstand Architecture & Physical Grounding
- **Root Problem Solved**: Eliminates the sensation of grandstands looking like "floating signs" hovering arbitrarily above the grass.
- **Heavy Foundation Plinths & Apron Drop-Shadows**:
  - Deep cast-concrete plinths (`#0f172a` / `#1e293b`) anchor touchline and endline stands firmly into the pitch apron.
  - Directional contact drop-shadows (`rgba(0, 0, 0, 0.45)`) cast from stand base onto the apron surface.
- **Structural Underside Framework & Cantilever Girders**:
  - Heavy structural I-beams, load-bearing concrete columns, and diagonal steel truss cross-bracing visible beneath upper tier cantilevers.
  - Realistic overhang shadow volumes cast downward from upper tiers onto lower tier spectator rows.
- **Vomitory Portals & Illuminated Emergency Signage**:
  - Deep recessed dark concourse entrance tunnels (vomitories) cut into the seating bowl every 8–12 seat rows.
  - High-contrast illuminated emerald-green exit signage (`#22c55e`) above vomitory archways, providing authentic matchday depth and nocturnal realism.
- **Stepped Gangways & Stair Aisles**:
  - Concrete pedestrian stair gangways bisecting seat blocks with safety-yellow nosing stripes (`#facc15`).

### 15.6.2 Five Distinctive 32-Bit Material Textures Across All Architectural Grades
Procedurally generated with authentic pixel-art dithering and structural detail:
1. **Grade 1 – Municipal / Historic Timber**:
   - Exposed weathered concrete masonry units (CMU) with dark mortar joints.
   - Heavy horizontal timber bench planks secured by forged black iron bolts.
   - Weathered corrugated tin roof backings with rust patina streaks and exposed wooden purlin rafters.
2. **Grade 2 – Classic / Archibald Leitch Heritage**:
   - Flemish-bond English red-brick masonry (`#7f1d1d` / `#991b1b`) with decorative cream sandstone stringcourses.
   - Iconic Archibald Leitch criss-cross diagonal steel lattice balustrades painted in historic British racing green (`#15803d`).
   - Gabled grandstand roof fascias with ornate white timber valances.
3. **Grade 3 – Industrial / Steel Works**:
   - Heavy galvanized corrugated steel cladding with vertical shadow flutes.
   - Riveted structural steel columns with visible rivet patterns.
   - High-visibility diagonal yellow-and-black hazard warning stripes along fascia edges and gangway portals.
4. **Grade 4 – Modern / Pre-Cast Cantilever**:
   - Smooth pre-cast architectural concrete panels with beveled reveal joints.
   - Flush smoked-glass VIP executive skybox suites (`rgba(56, 189, 248, 0.35)`) with warm interior illumination and glinting highlights.
   - Polished stainless steel balustrades and ergonomic contoured bucket seats.
5. **Grade 5 – Futuristic / Aero-Titanium & ETFE**:
   - Anodized aero-titanium facade cladding with diamond tessellation patterns.
   - Active animated digital LED matrix ribbon fascia boards streaming cyan and gold graphics (`#38bdf8`, `#06b6d4`, `#facc15`).
   - Pneumatic translucent ETFE roof cushions with multi-spectral internal chromatic ambient glow.

---

## Phase 15.7: Flavor-Rich "No Stand" Atmospheric Backdrops & Multi-Material Perimeter Enclosure Suite [COMPLETED & VERIFIED]
*Priority: Living World Backdrops for Asymmetric / Modest Grounds, Grassroots Flavor, Multi-Material Fences/Walls & Standing Supporter Terraces*  
*Daily Token Budget Profile: Scope: `src/game/environmentRenderer.ts`, `src/game/stadiumRenderer.ts`, `src/types/stadium.ts`, `src/components/StadiumCreatorModal.tsx` | Target: ~700–800k tokens (1 Day's Quota)*

### 15.7.1 Atmospheric "No Stand" Backdrops Tied Directly to Surroundings
When any stand (East, West, North, or South) is configured as `none` (`No Stand`), the empty space is filled with rich, culturally grounded, pixel-art worldbuilding backdrops determined by the stadium's global surroundings:
- **Mountains**:
  - Jagged alpine peaks with perpetual snow dust and rocky ridges.
  - Pine forest foothills, wooden ski chalets with smoking stone chimneys, and aerial cable car pylons.
- **Forest**:
  - Dense multi-layered woodland canopy with deep evergreen and golden birch foliage.
  - Forest access fire roads, ranger lookout towers, and rustic log fencing.
- **Savannah**:
  - Sun-drenched golden grassy plains, flat-topped red sandstone plateaus (kopjes), and umbrella acacia trees.
  - Dirt safari tracks, distant wildlife silhouettes, and rustic thornbush kraal perimeters.
- **Highway**:
  - Elevated concrete multi-lane freeway wrapping directly behind the touchline.
  - Overhead highway sign gantries, guardrails, and animated streaming vehicle traffic with headlights and taillights.
- **Small City**:
  - Charming rows of 2-story Victorian/red-brick townhouses with pitched slate roofs and smoking chimneys.
  - Municipal clock tower, neighborhood corner bakery, streetlamps with warm light cones.
- **Big City**:
  - Towering glass-and-steel skyscrapers, illuminated corporate logos, rooftop communication masts, and red aviation warning strobes.
  - Elevated metro rail overpass with illuminated passenger transit train sprites.
- **Airport (Gibraltar Victoria Stadium Style)**:
  - Active tarmac runway directly adjacent to the goal line with threshold piano key markings and runway approach lights.
  - Airport hangars, radar dome tower, fuel trucks, and taxiing commercial airliners.
- **Railroad**:
  - Multi-track freight depot with parallel ballast tracks and switching signals.
  - Parked steel boxcars, container flatbeds, overhead catenary wire gantries, and industrial shunter engines.
- **Beach**:
  - Golden sand dunes with swaying coconut palms and tropical sea oats.
  - Turquoise ocean breakers with white foamy surf, wooden boardwalk promenade, and coastal beach cabanas.
- **Marine Floating**:
  - Open seawater bay with gentle pixel wave animations and maritime reflections.
  - Wooden marina piers, mooring bollards, anchored fishing trawlers, yachts, and navigation buoys.

### 15.7.2 High-Fidelity Perimeter Wall & Security Barrier Engine
Dedicated physical perimeter enclosure options separating the pitch apron from the outside backdrop:
1. **Chainlink Steel Fence**:
   - Galvanized diamond wire mesh with semi-transparent weave.
   - Tubular steel top rail, vertical tension posts, and angled top brackets with barbed-wire strands.
2. **Weathered Brick Wall**:
   - Flemish-bond aged red brickwork with weathered mortar lines, moss patches, and beveled stone coping caps.
3. **Pre-Cast Concrete Security Wall**:
   - Heavy industrial concrete slab sections with visible expansion seams, rebar weep holes, and safety stencils.
4. **Rustic Timber Palisade**:
   - Vertical wooden fence palings with authentic woodgrain texture, iron nail studs, and horizontal cross-timbers.
5. **Corrugated Hoarding Barrier**:
   - Galvanized corrugated metal hoarding boards plastered with retro hand-painted sponsor advertisements and tournament signage.

### 15.7.3 Grassroots Fan Presence & Touchline Atmosphere
- For "No Stand" sides, render casual standing supporter sprites leaning against the perimeter barrier.
- Fans dressed in club colors, flat caps, waving scarves, holding coffee/beers, and cheering through the chainlink fence.
- Adds authentic lower-league, non-league, and regional cup-tie charm to modest and asymmetric grounds.

---

## Phase 15.8: Dual-Perspective Component Architecture & Macroscopic Aerial Sky-Cam Horizon Suite [COMPLETED & VERIFIED]
*Priority: Strict 2-Version Architectural Generation Contract (Pitch View vs Aerial View), Macroscopic Sky-Cam Landscape Expansion & Dynamic Aerial Lighting*  
*Daily Token Budget Profile: Scope: `src/game/skyCamRenderer.ts`, `src/game/environmentRenderer.ts`, `src/game/stadiumRenderer.ts`, `src/types/stadium.ts` | Target: ~750–850k tokens (1 Day's Quota)*

### 15.8.1 The Dual-Perspective Architectural Contract
Every stadium element (stands, tiers, roofs, seats, dugouts, tunnels, aprons, running tracks, and floodlights) possesses **two synchronized rendering models** generated strictly from the same canonical `StadiumDefinition`:
1. **Version A: Standard Pitch View (Interactive Gameplay & Live Matchday - 60 FPS)**:
   - Pitch-level perspective optimized for immediate gameplay readability, ball tracking, fluid player animations, net physics, corner flags, grass mowing patterns, and broadcast camera tracking.
   - Micro-detail emphasis: animated manager and substitutes in touchline dugouts, player walkout tunnels with red carpet runners, ad boards, and 32-bit grandstand textures.
2. **Version B: Aerial Sky-Cam View (Matchday Cinematics, Pre-Match Intro & Still Far View)**:
   - High-altitude fixed-angle architectural representation.
   - Clean, macroscopic geometric roofs reflecting the stadium's shape, tier count, and structural grade (ETFE translucent cushions, corrugated gables, aero-titanium domes).
   - **Exposed Seating Bowl for Uncovered Stands**: For any stand with `hasRoof: false` (open-air terraces), renders the exposed tiered seating bowl from above, faithfully displaying the stadium's customized seat color patterns (solid, bands, stripes).
   - Macro-scale dugout shelters and entrance tunnel walkout footprints visible on the touchline concourse.
   - Corner floodlight pylon towers projecting volumetric light cones into the bowl.

### 15.8.2 Macroscopic Aerial Surroundings Suite (Surroundings Take Center Stage)
- **The Aerial Focus Principle**: In the high-altitude aerial view, the stadium occupies only the center 25–30% of the screen; the surrounding landscape occupies over 70% of the viewport. Therefore, the aerial surroundings must be dramatically more expansive, macroscopic, and elaborate than in the pitch view!
- **Eight Macroscopic Aerial Environments**:
  1. **Aerial Metropolis (Big City)**: Vast city blocks, illuminated grid streets, arterial avenues with streaming pixel car headlights, clusters of glass/steel skyscrapers of varying heights, rooftop helipads, and elevated transit lines.
  2. **Aerial Suburban Town (Small City)**: Winding residential cul-de-sacs, organized neighborhoods of pitched-roof houses, green municipal parks, local high street, and town hall square.
  3. **Aerial International Airport**: Full runway layout with white centerline dashes, threshold piano keys, taxiway guidance lights, terminal aprons with parked commercial aircraft, cargo depots, and rotating radar beacons.
  4. **Aerial Freight Terminal & Railyard**: Sprawling multi-track rail yard with parallel train tracks, parked freight trains, switching yards, turntable, and container crane gantries.
  5. **Aerial Coastal Bay & Ocean Beach**: Sweeping coastline with golden sandy beaches, offshore coral reef water gradients, marina slips with moored boats, ocean waves breaking along the shore, and coastal highway.
  6. **Aerial Mountain Range**: Dramatic alpine topography with contour-shaded mountain ridges, snow-capped peaks, deep pine valleys, serpentine mountain switchback roads, and glacial lakes.
  7. **Aerial Dense Forest**: Endless textured evergreen forest canopy, winding dirt logging tracks, scenic river cutting through the woods, and fire lookout towers.
  8. **Aerial Savannah Plains**: Vast golden savannah steppe with dry riverbeds (wadis), rocky outcrops (kopjes), scattered acacia clusters, and dirt safari roads.

### 15.8.3 Dynamic Aerial Time-of-Day Lighting Ambiance
- **Noon**: Bright, crisp zenith sunlight, vibrant terrain colors, short sharp architectural drop shadows.
- **Sunset**: Dramatic low-angle golden-hour glow, fiery red/orange atmospheric horizon wash, long cast shadows stretching across the terrain, warm reflection off glass roofs and skyscrapers.
- **Night**: Atmospheric nocturnal contrast; city streetlights forming illuminated gridlines, flowing streams of white headlights and red taillights, illuminated building windows, and the stadium glowing as an illuminated coliseum beacon in the night.

---

## Phase S1: Canonical Pitch Invariance, Stadium Scale Hierarchy & 4-Shape Apron Infill Engine
*Priority: Zero Pitch Bleed, Strict Pitch Containment, 4 Geometric Shapes (Round, Oval, Square, Rectangular) & Running Track Clearance*  
*Daily Token Budget Profile: Scope: `src/game/stadiumRenderer.ts`, `src/game/skyCamRenderer.ts`, `src/game/pitchDimensions.ts`, `src/types/stadium.ts` | Target: ~700–800k tokens (1 Day's Quota)*

### S1.1 Canonical Pitch Invariance & Containment Contract
- **Fixed Pitch Area**: The maximum allowable pitch dimensions serve as the fixed spatial boundary for all stadiums. If a stadium configuration specifies a smaller pitch, the playing field lines (touchlines, goal lines, penalty boxes) are shifted inward within that fixed pitch area—the stadium shell itself never shrinks beneath the pitch.
- **Strict Stadium Superiority Invariant**: Every stadium footprint is strictly larger than the pitch across all configurations. The pitch is always 100% enclosed within the interior perimeter of the stadium bowl with zero clipping, overflow, or occlusion.
- **Step 1 Stadium Creator Alignment**: Add and expose a dedicated Apron Infilling & Setback configuration parameter directly below the Shape selector in Step 1 of the Stadium Creator.

### S1.2 4 Geometric Shapes & Setback Profiles (Referencing Master Visual Specifications)
- **1. Round Stadium (Circular Outer Perimeter & Annular Bowl)**:
  - Deepest setback distance from the pitch. Outer perimeter, grandstands, and roof form a continuous circular/annular bowl.
  - Expansive buffer apron between the pitch lines and circular stands that completely accommodates full Olympic-grade running tracks (red synthetic tartan, white sprint/curve lane lines, and D-zone field event sectors) without any part of the track rendering beneath the pitch grass.
- **2. Oval Stadium (Elliptical / Racetrack Geometry)**:
  - Elongated curved geometry with semicircular North/South curves and parallel East/West straight stands.
  - Balanced buffer apron accommodating athletic tracks, warm-up zones, and groundskeeper vehicle aprons with smooth curved corners.
- **3. Square Stadium (1:1 Symmetric Footprint)**:
  - Outer perimeter and grandstands form a true 1:1 square.
  - Because the football pitch is rectangular (longer North-South than East-West), the square geometry naturally generates significant setback buffer depth behind the North and South goals between the goal line and the stands, while maintaining standard touchline clearance on the East and West.
- **4. Rectangular Stadium (Compact Traditional Football Ground)**:
  - Tightest and most intimate stadium footprint.
  - Grandstands hug the touchlines and goal lines closely with a compact apron, delivering the classic steep English/European football ground aesthetic.

### S1.3 Full Apron Infill Substrate Engine
- The entire area between the pitch perimeter and the inner tier/wall boundary is fully rendered with a solid apron infill material (synthetic turf, red athletic tartan, brushed asphalt, paving slabs, or gravel).
- Eliminates any transparent gaps or background showing through between the pitch touchlines and grandstands.

---

## Phase S2: Grandstand Density & Substance Overhaul: Stepped Tier Chairs, Tier Fences & Structural Delimitation
*Priority: Authentic Seating Density (2/3/4 Rows per Tier), Structural Solid Infill, Safety Fences & High-Contrast Outer Delimitation Walls*  
*Daily Token Budget Profile: Scope: `src/game/stadiumRenderer.ts`, `src/game/skyCamRenderer.ts`, `src/components/StadiumCreatorModal.tsx` | Target: ~700–800k tokens (1 Day's Quota)*

### S2.1 Stepped Chair Densities Per Tier Size
- **Small Tier**: Exactly **2 sets of chairs** per tier riser band.
- **Medium Tier**: Exactly **3 sets of chairs** per tier riser band.
- **Big Tier**: Exactly **4 sets of chairs** per tier riser band.
- Dynamic tier height, riser rise-over-run, and gangway stair scaling matching the exact chair set density rather than sparse 1-chair row lines.

### S2.2 Stand Structural Infill & Substrate Materials
- **Solid Under-Seat Decking**: Concrete, timber, or steel deck infill rendered beneath all seat rows, preventing the ground or background from showing through seating rows.
- **Tier Safety Fences & Balustrades**: Distinct metal railing, tension wire, or glass balustrades rendered at the front of each elevated tier.
- **Outer Rear Delimitation Walls**: Heavy structural back wall (weathered brick, precast concrete slab, corrugated steel, timber) with beveled stone coping and drop shadows, clearly separating the grandstand structure from the outside environment.
- **Roof Canopy & Fascia Overhang**: Solid overhead canopy with visible cantilever truss members, fascia boards, and soffit shadow depths.

---

## Phase S3: Dynamic Time-of-Day Illumination Suite, Pitch/Player Shading & Shape-Consistent Architectural Roof Shadows
*Priority: Global Color Grading Filters, Cohesive Pitch/Player Shading & Shape-Accurate Internal Roof Shadows*  
*Daily Token Budget Profile: Scope: `src/game/pitchRenderer.ts`, `src/game/skyCamRenderer.ts`, `src/game/stadiumRenderer.ts`, `src/game/sprites.ts` | Target: ~700–800k tokens (1 Day's Quota)*

### S3.1 Global Time-of-Day Atmospheric Filters
- **Morning / Noon**: Crisp, vibrant, high-contrast zenith sunlight; clean neutral daylight filter applied across the pitch, stands, apron, and surroundings.
- **Afternoon / Golden Hour**: Warm amber/golden-orange color wash cast across pitch turf, grandstands, concourses, and player sprites.
- **Night**: Dramatic nocturnal atmospheric contrast; rich dark blue-violet ambient grading with brilliant multi-angle stadium floodlight glare cones (no directional sun shadows; floodlight-focused illumination).

### S3.2 Pitch Turf & Player Sprite Time-of-Day Shading
- Turf grass shades, painted white boundary lines, goal nets, corner flags, and on-pitch player sprites dynamically respond to the active time-of-day filter.

### S3.3 Shape-Consistent Architectural Roof Shadows
- Directional cast shadows projected onto the pitch surface matching the exact roof opening and stadium shape:
  - **Round Stadium**: Circular roof canopy projects an annular shadow leaving a distinct curved circular sunlit aperture on the pitch.
  - **Square Stadium**: Crisp 90-degree rectilinear roof overhang shadows cast along North/South and East/West edges.
  - **Oval Stadium**: Smooth elliptical shadow contours curving across the corners.
  - **Rectangular Stadium**: Straight linear shadow bands along the grandstand roof eaves.
- **Sun Movement Dynamic**: Shadows shift position and length based on time-of-day (short, near-centered shadow at Noon; long, slanted east/southeast cast shadow in the Afternoon).

---

## Phase S4: 32-Bit Fisheye Horizon Skyline Boundary & Spherical Panoramic Surroundings
*Priority: Flattened 2D Surroundings with 360° Circular Fisheye Curved Skyline Diorama (Matching Reference Image 2)*  
*Daily Token Budget Profile: Scope: `src/game/environmentRenderer.ts`, `src/game/skyCamRenderer.ts` | Target: ~750–850k tokens (1 Day's Quota)*

### S4.1 Fisheye Planetoid Diorama World Model
- Replaces the flat top-only sky banner with a continuous 360° flattened 2D panoramic world rim radiating outward from the stadium in all four cardinal directions.
- Surroundings terminate at a distinct, stylized circular/fisheye perimeter boundary.
- Outer perimeter renders a 32-bit pixel-art fisheye skyline curvature: skyscrapers, townhouses, mountain ridges, pine canopies, coastal shorelines, or industrial rail gantries curving organically along the rim like a retro globe/planetoid diorama.

### S4.2 Multi-Directional Panoramic Sky Envelope
- Atmospheric sky wraps around the entire curved diorama rim, shifting dynamically with the time-of-day:
  - *Noon*: Vivid blue sky with wispy high-altitude cirrus clouds.
  - *Sunset*: Radiant amber, magenta, and deep violet horizon gradients.
  - *Night*: Deep starry celestial dome with twinkling stars and subtle city light pollution dome.
- Full fidelity across all 8 surroundings (Big City, Small City, Airport, Railroad, Beach, Mountains, Forest, Savannah).

---

## Phase S5: Stadium Creator WYSIWYG & Full Synchronization Validation Suite
*Priority: Real-Time Stadium Creator Step 1–6 WYSIWYG Controls, Interactive Camera Views & Automated Regression Tests*  
*Daily Token Budget Profile: Scope: `src/components/StadiumCreatorModal.tsx`, `src/game/__tests__/phaseS_StadiumHotfixes.test.ts` | Target: ~650–750k tokens (1 Day's Quota)*

### S5.1 Interactive Creator Controls & Live WYSIWYG
- Step 1 integration: Shape selector (Round, Oval, Square, Rectangular) with dedicated Apron Infilling & Setback slider.
- Step 2 integration: Tier density previewing 2, 3, and 4 chair sets per tier with visible tier fences and rear wall delimitation.
- Step 6 / Preview Director: Real-time Time-of-Day toggles (Noon, Afternoon, Night) displaying dynamic illumination filters and architectural roof pitch shadows.
- Sky-Cam view integration of the 32-bit fisheye curved skyline diorama.

### S5.2 Automated Validation Suite
- Comprehensive vitest test suite verifying:
  - Fixed pitch area invariance and complete containment inside all stadium configurations.
  - Zero running track overlap beneath the pitch.
  - Stepped chair row counts (2 for small, 3 for medium, 4 for big).
  - Time-of-day shadow geometry calculations for Round, Oval, Square, and Rectangular shapes.
  - 60 FPS performance and zero per-frame garbage collection.

---

## Phase 16: IFAB Linesman Offside Engine & VideoRef (VIR)
*Priority: Law 11 Correctness + Lightweight Review Presentation*  
*Daily Token Budget Profile: Scope: `src/game/engine.ts`, offside helpers, simple referee cut-scene | Target: ~650–750k tokens*

### 16.1 Autonomous Assistant Referee
- Two-player offside ray-cast (IFAB Law 11).
- Correct exceptions (own half, ball played backward, throw-in, etc.).
- Animated sideline linesman with flag.

### 16.2 Toggleable VideoRef
- Optional short referee-monitor style review for tight offside / penalty decisions.
- Fully skippable; can be disabled in Graphics settings for performance.

---

## Phase 17: Lightweight Cinematics Suite & Slow-Mo Replay Buffer
*Priority: Presentation Polish Without Performance Cost*  
*Daily Token Budget Profile: Scope: circular frame buffer, simple cut-scene triggers | Target: ~700k tokens*

### 17.1 Zero-Allocation Replay Ring Buffer
- 300-frame circular buffer of essential state (player positions, ball, camera).
- Automatic slow-mo on goals, penalties, red cards, tight offsides.
- Instant any-key skip.

### 17.2 Future Entrance Cinematic Hook (data only this phase)
- Prepare data structures and timing hooks for a later “players walking onto the pitch” entrance using the larger captain models.
- Integrates the dugout bench camera and entrance tunnel camera hooks established in Phase 12 & Phase 14.

---

## Master Development Execution Order (Updated)

| Phase | Title | Focus | Status / Notes |
| :---: | :--- | :--- | :--- |
| **0** | 32-Bit UI, Zero-Scroll Game Plan, Broadcast HUD & Device Profiling | Architecture & UI | **COMPLETED** |
| **1** | Match Regulation Halves, Stoppage Time, Whistle AI & End-Game Hub | Match Flow | **COMPLETED** |
| **1.5** | Immediate Critical Hotfixes, Multi-Player Engine & Side Selection Hub | Hotfixes & Multiplayer | **COMPLETED** |
| **2** | Startup Flow, Captain Menu, Difficulty Tiers (5) | Entry Point & Settings | **COMPLETED** |
| **3** | Goalkeeper Mechanical Mastery & Dual Control/AI | Goalkeeping | **COMPLETED** |
| **4** | Modern Compact Positioning Foundation (AI Part 1) | AI Positioning | **COMPLETED** |
| **4.5** | Controller Auto-Binding, Side Selection Profile & Advanced Switching | Controls & Switching | **COMPLETED & VERIFIED** |
| **5** | Advanced Positioning, Line Intermingling & Role Fluidity (AI Part 2) | AI Positioning | **COMPLETED & VERIFIED** |
| **6** | AI Decision Quality, Passing Logic, Clean Defending | AI Decisions | **COMPLETED & VERIFIED** |
| **7** | Long-Range Ball Flight & Cambio de Frente | Physics | **COMPLETED & VERIFIED** |
| **8** | Dribbling Animation Tiers, On-Ball Accel, Ginga | Locomotion | **COMPLETED & VERIFIED** |
| **9** | Aerial Anticipation, Headers, Volleys | Aerial | **COMPLETED & VERIFIED** |
| **10** | Live Player Rating Engine & Match MVP | Analytics | **COMPLETED & VERIFIED** |
| **11** | Dynamic Stadiums & Match Atmosphere | Atmosphere | **COMPLETED & VERIFIED** (6 Crowd Levels) |
| **12** | Data-Driven Stadium Architecture, Dugouts, Entrance Tunnels & Team Venues | Stadium Architecture & Venues | **COMPLETED & VERIFIED** (8 Canonical Venues, 5 Benches, 5 Tunnels) |
| **13** | 32-Bit Main Menu System & Live Matchday Procedural Stadium Renderer | Main Menu & Live Renderer | **COMPLETED & VERIFIED** (Main Menu Hub, 5 Stand Grades, 60 FPS Procedural Canvas) |
| **14** | Interactive 32-Bit Stadium Creator, Top-Right Camera Suite (7 Views) & Inspector | Stadium Editor & Camera Suite | **COMPLETED & VERIFIED** (WYSIWYG 2D Canvas, 7 Camera Views, 6 Steps, FIFA HUD) |
| **15** | Aerial Sky-Cam Broadcast Presentation & Dual Outside Environment Engine | Sky-Cam & Surroundings | **COMPLETED & VERIFIED** (Bird's-Eye Sky-Cam, 8 Aerial Surroundings, Zoom Swoop) |
| **15.5** | Stadium Geometry, Apron Perimeters & Time-of-Day Preview Director | Geometry, Apron & Lighting Director | **COMPLETED & VERIFIED** (Zero Pitch Bleed, 6 Apron Materials, Sun/Sunset/Moon Cycle) |
| **15.6** | 32-Bit Pixel Art Grandstand Substance & Material Texturing | Anti-Floating Physics & 5 Materials | **COMPLETED & VERIFIED** (Plinths, Cantilevers, Vomitories, 5 Elaborate 32-Bit Grades) |
| **15.7** | Flavor-Rich "No Stand" Backdrops & Perimeter Enclosure Suite | Backdrops, Walls & Terraces | **COMPLETED & VERIFIED** (Living Backdrops, 5 Barrier Types, Standing Fans) |
| **15.8** | Dual-Perspective Component Architecture & Macroscopic Aerial Horizon Suite | 2-Version Generation & Aerial Focus | **COMPLETED & VERIFIED** (Dual-Perspective Contract, 8 Macroscopic Aerial Environments, Time-of-Day Lighting) |
| **S1** | Canonical Pitch Invariance, Stadium Scale Hierarchy & 4-Shape Apron Infill | Pitch Invariance & 4 Shapes | **NEXT** (Strict Pitch Containment, Round/Oval/Square/Rectangular, Track Clearance) |
| **S2** | Grandstand Density & Substance Overhaul: Stepped Tier Chairs & Delimitation | Stand Substance & Density | Planned (Stepped 2/3/4 Chair Rows, Tier Fences, Structural Outer Walls) |
| **S3** | Dynamic Time-of-Day Illumination Suite, Pitch/Player Shading & Roof Shadows | Lighting & Architectural Shadows | Planned (Noon/Afternoon/Night Filters, Shape-Accurate Pitch Roof Shadows) |
| **S4** | 32-Bit Fisheye Horizon Skyline Boundary & Spherical Surroundings | Flattened 2D Fisheye Horizon | Planned (360° Circular Skyline Diorama, 8 Surroundings, Time-of-Day Sky Rim) |
| **S5** | Stadium Creator WYSIWYG & Full Synchronization Validation Suite | Creator UI & Validation | Planned (Real-time WYSIWYG, Step 1–6 Controls, Automated Test Suite) |
| **16** | IFAB Linesman Offside & VideoRef (VIR) | Rules | Planned |
| **17** | Lightweight Cinematics & Replay Buffer | Presentation | Planned |

---

**Token Discipline Reminder**  
1 Phase = strictly 1 Day's worth of Google AI Studio tokens (~700k–850k tokens). Every phase terminates in a fully compiled, zero-regression build. Zero-scroll console UI invariant across all viewports. Zero per-frame memory allocation for sustained 60 FPS on budget devices.
Every phase is deliberately scoped to one focused Google AI Studio free-tier day. Each phase ends with a compilable, playable build. Prefer extending existing zero-allocation systems over introducing new heavy abstractions. Mobile 60 FPS and single-screen 32-bit UI remain non-negotiable constraints for every change.


