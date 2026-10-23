/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  PitchDimensionPreset,
  TurfQuality,
  GrassLength,
  LawnMowingPattern,
  SurfaceStatus,
  WeatherCondition,
  Season,
  TimeOfDay,
  NetTension,
  GoalFrameType,
  SeatColorMode,
} from '../types';

/**
 * ============================================================================
 * PHASE 12: DATA-DRIVEN STADIUM ARCHITECTURE, DUGOUTS, TUNNELS & TEAM VENUES
 * ============================================================================
 */

/**
 * 12.2.1 Four Architectural Shapes (with circular/octagonal aliases)
 */
export type StadiumShape =
  | 'round'
  | 'oval'
  | 'square'
  | 'rectangular'
  | 'circular'
  | 'octagonal';

/**
 * 12.2.2 Five Stand Architectural Grades (Quality / Luxury / Finish Level)
 * - Grade 1: Municipal (rough cinder blocks, weathered timber benches, grassroots)
 * - Grade 2: Classic (traditional English red-brick masonry, painted steel trusses)
 * - Grade 3: Industrial (heavy corrugated steel cladding, exposed I-beams)
 * - Grade 4: Modern (smooth pre-cast architectural concrete, sweeping cantilever roofs)
 * - Grade 5: Futuristic (anodized aero-aluminum cladding, translucent ETFE, continuous LED fascia)
 */
export type StandGrade =
  | 'grade1_municipal'
  | 'grade1_historic_timber'
  | 'grade2_classic'
  | 'grade3_industrial'
  | 'grade3_steel_cantilever'
  | 'grade4_modern'
  | 'grade5_futuristic';

/**
 * Stand Tier Sizes & Wall Tier Sizes
 */
export type TierSize = 'small' | 'medium' | 'large';
export type WallTierSize = 'small' | 'medium' | 'large';

/**
 * Stand Structural Types
 * - tiered: 1 to 4 stacked spectator decks
 * - wall: single massive steep terrace (e.g. Dortmund Yellow Wall / Die Gelbe Wand)
 * - none / no_stand: open end with contextual surroundings backdrop or perimeter wall
 */
export type StandType = 'tiered' | 'wall' | 'none' | 'no_stand';

/**
 * 12.2.9 Outside Environment Surroundings (Structure Step)
 * Phase 15.5 Extended Catalog: Mountains, Forest, Savannah, Highway, Small City, Big City, Beach, Airport, Railroad, Parking Lot, Marine Floating
 */
export type SurroundingsType =
  | 'small_city'
  | 'big_city'
  | 'mountains'
  | 'forest'
  | 'savannah'
  | 'highway'
  | 'beach'
  | 'airport'
  | 'railroad'
  | 'parking_lot'
  | 'marine_floating'
  | 'nature'; // backward-compatible alias for mountains

/**
 * Phase 15.5: Apron Perimeter Material Selection (between pitch line and grandstands)
 */
export type ApronMaterial =
  | 'grass'
  | 'concrete'
  | 'rubber_tartan'
  | 'artificial_turf'
  | 'gravel_ballast'
  | 'asphalt_paved';

/**
 * Contextual Backdrops for "No Stand" sides (fused to Surroundings)
 */
export type SmallCityBackdrop = 'mall' | 'parking_lot' | 'apartment_buildings' | 'small_houses' | 'clock_tower' | 'high_street' | 'victorian_townhouses' | 'wall';
export type BeachBackdrop = 'beach_seaside' | 'ocean_surf' | 'boardwalk_promenade' | 'beach_cabanas' | 'apartment_buildings' | 'small_houses' | 'wall';
export type BigCityBackdrop = 'skyscrapers' | 'apartment_buildings' | 'mall' | 'metro_rail' | 'aviation_towers' | 'wall';
export type MountainsBackdrop = 'alpine_peaks' | 'pine_valley' | 'green_slopes' | 'ski_chalets' | 'cable_car_pylons' | 'pine_foothills' | 'wall';
export type ForestBackdrop = 'dense_pine_woodland' | 'dense_woodland' | 'autumn_canopy' | 'clearing_trail' | 'ranger_lookout' | 'log_fencing' | 'wall';
export type SavannahBackdrop = 'acacia_plains' | 'golden_grasslands' | 'rocky_outcrop' | 'safari_tracks' | 'kraal_perimeter' | 'wall';
export type HighwayBackdrop = 'cloverleaf_interchange' | 'elevated_viaduct' | 'toll_plaza_boulevard' | 'highway_gantries' | 'interstate_boulevard' | 'wall';
export type NatureBackdrop = 'mountain_forest' | 'open_alpine_hills' | 'lake_valley' | 'wall';
export type AirportBackdrop = 'runway' | 'hangars_control_tower' | 'freight_depot' | 'wall';
export type RailroadBackdrop = 'train_depot' | 'freight_railyard' | 'industrial_gantries' | 'boxcar_depot' | 'wall';
export type ParkingLotBackdrop = 'paved_parking' | 'tree_boulevard' | 'team_buses' | 'wall';
export type MarineFloatingBackdrop = 'open_ocean' | 'floating_pontoons' | 'harbor_marina' | 'fishing_trawlers' | 'wall';

export type NoStandBackdrop =
  | SmallCityBackdrop
  | BeachBackdrop
  | BigCityBackdrop
  | MountainsBackdrop
  | ForestBackdrop
  | SavannahBackdrop
  | HighwayBackdrop
  | NatureBackdrop
  | AirportBackdrop
  | RailroadBackdrop
  | ParkingLotBackdrop
  | MarineFloatingBackdrop
  | string;

/**
 * Universal Wall Rule: wall is always available across all surrounding types
 */
export type WallSize = 'low' | 'medium' | 'tall';
export type WallMaterial = 'brick' | 'concrete' | 'stone' | 'timber' | 'metal_cladding';

export interface WallPerimeterConfig {
  size: WallSize;
  material: WallMaterial;
}

/**
 * Phase 15.7.2: Dedicated 5-Material Perimeter Enclosure Options
 * 1. chainlink_fence: Galvanized Diamond Wire Mesh with Barbed Wire Arms
 * 2. brick_wall: Flemish-Bond Aged Red Brick with Stone Coping
 * 3. concrete_wall: Pre-Cast Concrete Security Wall with Seams & Stencils
 * 4. rustic_timber / small_fence: Vertical Wooden Palisade with Nails & Cross-Timbers
 * 5. corrugated_hoarding: Galvanized Metal Hoarding Boards with Retro Sponsors
 */
export type PerimeterFinishType =
  | 'none'
  | 'small_fence'
  | 'big_fence'
  | 'chainlink_fence'
  | 'brick_wall'
  | 'concrete_wall'
  | 'rustic_timber'
  | 'corrugated_hoarding';

/**
 * Decoupled Fence & Perimeter Barrier Specification
 */
export type BarrierSize = 'none' | 'small' | 'medium' | 'big' | 'huge';
export type BarrierMaterial = 'brick' | 'cement' | 'wood' | 'chain_link' | 'aluminum_picket' | 'corrugated_sheet';

export interface StandBarrierConfig {
  size: BarrierSize;
  material: BarrierMaterial;
}

/**
 * 12.2.6 Seat Styles & Patterns
 */
export type SeatStyle = 'plastic_bench' | 'classic_bucket' | 'tip_up_padded' | 'vip_leather';
export type SeatPattern = 'solid' | 'perStand' | 'horizontalBands' | 'verticalStripes' | 'lowerUpper';

export interface StadiumSeatConfig {
  style: SeatStyle;
  pattern: SeatPattern;
  colors: string[]; // 1 to 4 colors hex
}

/**
 * 12.2.10 Dynamic FIFA Qualification Category
 * - national: Capacity < 15,000, basic municipal/classic finishes
 * - first_division: Capacity 15,000–35,000, industrial/modern finishes
 * - continental: Capacity 35,000–60,000, modern finishes, high-power floodlights
 * - world: Capacity 60,000+, modern/futuristic finishes, premium lighting, pristine turf
 */
export type FifaQualification = 'national' | 'first_division' | 'continental' | 'world';

/**
 * 12.3 Manager & Player Dugout Benches Architecture
 * - recaro_racing: Recaro Racing Bucket Seats (Premier League / UCL luxury)
 * - covered_sunken: Covered Sunken Dugout Shelter (sub-surface trench with transparent shield)
 * - classic_timber: Classic Timber Bench (slatted grassroots wood)
 * - utilitarian_concrete: Utilitarian Concrete Dugout (heavy cast cinder-block bunker)
 * - folding_chairs: Pitch-Level Folding Chairs (community ground portable chairs)
 */
export type BenchType =
  | 'recaro_racing'
  | 'racing_bucket'
  | 'covered_sunken'
  | 'classic_timber'
  | 'utilitarian_concrete'
  | 'concrete_dugout'
  | 'folding_chairs';

export type BenchQualityTier = 'municipal' | 'classic' | 'modern' | 'elite_vip' | 'luxury';

export interface DugoutConfig {
  type: BenchType;
  quality: BenchQualityTier;
  frameColor: string;
  cushionColor: string;
  shelterTint: string; // e.g. 'rgba(15, 23, 42, 0.9)'
  setbackDistance: number; // pixels / meters from touchline
  capacityPerBench?: number; // default 14-18 seats
}

/**
 * 12.4 Player Entrance Tunnels Architecture
 * - inflatable_accordion: Iconic South American flexible bellows / tube
 * - modern_architectural: High-tech backlit LED ribbon tunnel with dark matte panels
 * - subterranean_staircase: Sunken concrete steps from dressing rooms
 * - direct_portal: Arched masonry portal with metal security grille
 * - telescopic_canopy: Motorized sliding transparent canopy on rolling tracks
 */
export type TunnelType =
  | 'inflatable_accordion'
  | 'modern_architectural'
  | 'subterranean_staircase'
  | 'direct_portal'
  | 'telescopic_canopy';

export type TunnelSiting = 'center_main' | 'corner' | 'behind_goal';

export interface EntranceTunnelConfig {
  type: TunnelType;
  siting: TunnelSiting;
  primaryColor: string;
  secondaryColor: string;
  hasBellows?: boolean;
  backlitLeds?: boolean;
  canopyTint?: string;
}

/**
 * Stand Position Coordinates
 * - east: Right touchline stand
 * - west: Left touchline main stand (hosts dugouts & entrance tunnel)
 * - north: Top end stand (behind north goal)
 * - south: Bottom end stand (behind south goal)
 * - corner_ne, corner_nw, corner_se, corner_sw: 4 corner quadrant stands
 */
export type StandPosition =
  | 'east'
  | 'west'
  | 'north'
  | 'south'
  | 'corner_ne'
  | 'corner_nw'
  | 'corner_se'
  | 'corner_sw';

export interface StandDeckConfig {
  size: TierSize;
}

export interface StandConfig {
  position: StandPosition;
  type: StandType;
  grade: StandGrade;
  tierCount?: 1 | 2 | 3 | 4;
  tiers?: StandDeckConfig[];
  wallSize?: WallTierSize;
  wallTier?: any;
  primaryColor?: string;
  secondaryColor?: string;
  hasRoof?: boolean;
  roofCoverage?: number; // 0 to 1
  backdrop?: NoStandBackdrop;
  noStandBackdrop?: string;
  wallPerimeter?: WallPerimeterConfig;
  perimeterFinish?: PerimeterFinishType;
  barrier?: StandBarrierConfig;
  hasGrassrootsFans?: boolean; // Phase 15.7.3: Standing supporter presence leaning on barrier
}

/**
 * Lighting Model
 */
export interface LightingModel {
  type: 'corner_pylons' | 'roof_banks' | 'light_poles';
  pylonCount: number;
  powerKw: number;
  timeOfDay: TimeOfDay;
}

/**
 * 12.2 Full Data-Driven Stadium Definition
 */
export interface StadiumDefinition {
  id: string;
  name: string;
  shortName: string;
  city: string;
  country: string;
  shape: StadiumShape;
  surroundings: SurroundingsType;
  hasTrack: boolean; // Strictly exclusive to round and oval
  apronMaterial?: ApronMaterial; // Phase 15.5: Perimeter apron material between pitch and stands
  stands: Record<StandPosition, StandConfig>;
  seats: StadiumSeatConfig;
  lighting: LightingModel;
  dugouts: DugoutConfig;
  tunnel: EntranceTunnelConfig;
  capacity: number; // Dynamically calculated or nominal
  fifaCategory: FifaQualification;

  // Optional matchday pitch defaults
  pitchPreset?: PitchDimensionPreset;
  pitchLengthMeters?: number;
  pitchWidthMeters?: number;
  turfQuality?: TurfQuality;
  mowingPattern?: LawnMowingPattern;
  grassLength?: GrassLength;
  surfaceStatus?: SurfaceStatus;
  goalFrame?: GoalFrameType;
  netTension?: NetTension;
  weather?: WeatherCondition;
  season?: Season;
  timeOfDay?: TimeOfDay;
  seatColor?: SeatColorMode;
}

/**
 * 12.5 Team Home Venue Overrides
 */
export interface TeamVenueOverrides {
  pitchPattern?: LawnMowingPattern;
  netStyle?: GoalFrameType;
  netTension?: NetTension;
  pitchSizePreset?: PitchDimensionPreset;
  pitchLengthMeters?: number;
  pitchWidthMeters?: number;
  turfQuality?: TurfQuality;
  grassLength?: GrassLength;
  surfaceStatus?: SurfaceStatus;
  fanColors?: { primary: string; secondary: string };
  bannerMessages?: string[];
  sponsors?: string[];
  dugoutStyle?: BenchType;
  tunnelStyle?: TunnelType;
}

/**
 * Helper: Map Surroundings to available No-Stand contextual backdrops (Phase 15.7.1)
 */
export function getBackdropsForSurroundings(surroundings: SurroundingsType): { id: NoStandBackdrop; label: string }[] {
  const commonWall = { id: 'wall' as const, label: 'Perimeter Wall (Custom Height & Finish)' };
  switch (surroundings) {
    case 'small_city':
      return [
        { id: 'small_houses', label: 'Victorian Red-Brick Townhouses & Chimneys' },
        { id: 'clock_tower', label: 'Municipal Clock Tower & Civic Square' },
        { id: 'high_street', label: 'Neighborhood Corner Bakery & Streetlamps' },
        { id: 'apartment_buildings', label: 'Low-Rise Apartment Blocks' },
        { id: 'mall', label: 'Commercial Plaza & Superstore' },
        commonWall,
      ];
    case 'beach':
      return [
        { id: 'beach_seaside', label: 'Golden Sand Dunes & Coconut Palms' },
        { id: 'ocean_surf', label: 'Turquoise Ocean Breakers & Foamy Surf' },
        { id: 'boardwalk_promenade', label: 'Wooden Boardwalk Promenade & Cabanas' },
        { id: 'small_houses', label: 'Beachside Bungalows & Sea Oats' },
        { id: 'apartment_buildings', label: 'Seaside Condominiums' },
        commonWall,
      ];
    case 'big_city':
      return [
        { id: 'skyscrapers', label: 'Towering Glass & Steel Skyscrapers' },
        { id: 'metro_rail', label: 'Elevated Metro Rail Overpass & Transit Trains' },
        { id: 'aviation_towers', label: 'Rooftop Communication Masts & Aviation Strobes' },
        { id: 'apartment_buildings', label: 'High-Density Residential Towers' },
        { id: 'mall', label: 'Multi-Story Metro Mall' },
        commonWall,
      ];
    case 'mountains':
    case 'nature':
      return [
        { id: 'alpine_peaks', label: 'Alpine Peaks & Perpetual Snow Dust' },
        { id: 'mountain_forest', label: 'Mountain Forest & Alpine Glade' },
        { id: 'ski_chalets', label: 'Wooden Ski Chalets & Smoking Stone Chimneys' },
        { id: 'cable_car_pylons', label: 'Aerial Cable Car Pylons & Gondolas' },
        { id: 'pine_valley', label: 'Pine Forest Foothills & Rocky Ridges' },
        commonWall,
      ];
    case 'forest':
      return [
        { id: 'dense_pine_woodland', label: 'Dense Multi-Layered Evergreen Canopy' },
        { id: 'autumn_canopy', label: 'Golden Birch & Amber Foliage Canopy' },
        { id: 'ranger_lookout', label: 'Fire Access Road & Ranger Lookout Tower' },
        { id: 'clearing_trail', label: 'Timber Clearing & Rustic Log Fencing' },
        commonWall,
      ];
    case 'savannah':
      return [
        { id: 'acacia_plains', label: 'Golden Grasslands & Umbrella Acacias' },
        { id: 'rocky_outcrop', label: 'Sun-Drenched Kopje Plateaus & Baobabs' },
        { id: 'safari_tracks', label: 'Dirt Safari Tracks & Wildlife Silhouettes' },
        { id: 'kraal_perimeter', label: 'Rustic Thornbush Kraal & Bushveldt' },
        commonWall,
      ];
    case 'highway':
      return [
        { id: 'elevated_viaduct', label: 'Elevated Concrete Multi-Lane Freeway' },
        { id: 'highway_gantries', label: 'Overhead Highway Sign Gantries & Guardrails' },
        { id: 'cloverleaf_interchange', label: 'Interchange Flyover Loops & Traffic' },
        { id: 'toll_plaza_boulevard', label: 'Interstate Boulevard & Streetlights' },
        commonWall,
      ];
    case 'airport':
      return [
        { id: 'runway', label: 'Active Runway Tarmac & Threshold Piano Keys' },
        { id: 'hangars_control_tower', label: 'Flight Hangars & Radar Dome Tower' },
        { id: 'freight_depot', label: 'Cargo Terminal, Fuel Trucks & Airliners' },
        commonWall,
      ];
    case 'railroad':
      return [
        { id: 'train_depot', label: 'Multi-Track Locomotive Depot & Shunter Engines' },
        { id: 'freight_railyard', label: 'Parallel Ballast Tracks & Switching Signals' },
        { id: 'industrial_gantries', label: 'Heavy Steel Catenary Gantries & Boxcars' },
        commonWall,
      ];
    case 'parking_lot':
      return [
        { id: 'paved_parking', label: 'Camp Nou Style Asphalt Bays & Parked Cars' },
        { id: 'team_buses', label: 'Official Team Luxury Coach Buses' },
        { id: 'tree_boulevard', label: 'Perimeter Tree Boulevard & Queuing Crowds' },
        commonWall,
      ];
    case 'marine_floating':
      return [
        { id: 'open_ocean', label: 'Open Seawater Bay & Pixel Waves' },
        { id: 'harbor_marina', label: 'Wooden Marina Piers & Mooring Bollards' },
        { id: 'floating_pontoons', label: 'Anchored Fishing Trawlers & Yachts' },
        commonWall,
      ];
    default:
      return [commonWall];
  }
}

/**
 * 12.2.10 Capacity Mathematical Models
 * Calculates additive capacity for a given stand
 */
export function calculateStandCapacity(stand: StandConfig, shape: StadiumShape, pos?: StandPosition): number {
  if (stand.type === 'none' || stand.type === 'no_stand') {
    return 0;
  }

  const effectivePos = pos || stand.position || 'east';
  const isCorner = effectivePos.startsWith('corner_');
  const isTouchline = effectivePos === 'east' || effectivePos === 'west';

  // Base multiplier per stand position & stadium shape
  let posMultiplier = isCorner ? 0.35 : isTouchline ? 1.0 : 0.85;
  if (shape === 'round' || shape === 'oval') {
    posMultiplier = isCorner ? 0.6 : 0.95; // Bowls distribute capacity more uniformly
  } else if (shape === 'circular') {
    posMultiplier = isCorner ? 0.65 : 1.05; // Full 360 colosseum radial bowl
  }

  // Wall Tier (Dortmund-style massive single terrace)
  if (stand.type === 'wall') {
    const wallBase = stand.wallSize === 'large' ? 24000 : stand.wallSize === 'medium' ? 19200 : 14400;
    return Math.round(wallBase * posMultiplier);
  }

  // Standard Stacked Tiers (1 to 4 decks)
  const tiers = stand.tiers || [{ size: 'medium' }];
  let totalTierCapacity = 0;
  tiers.forEach((t, index) => {
    // Upper tiers have larger circumference in stadium bowls
    const upperExpansion = 1 + index * 0.18;
    const tierBase = t.size === 'large' ? 6800 : t.size === 'medium' ? 4800 : 3200;
    totalTierCapacity += tierBase * upperExpansion;
  });

  return Math.round(totalTierCapacity * posMultiplier);
}

/**
 * Calculates total stadium capacity across all stands
 */
export function calculateStadiumTotalCapacity(stands: Record<StandPosition, StandConfig>, shape: StadiumShape): number {
  let total = 0;
  const positions: StandPosition[] = [
    'east',
    'west',
    'north',
    'south',
    'corner_ne',
    'corner_nw',
    'corner_se',
    'corner_sw',
  ];
  for (const pos of positions) {
    const stand = stands[pos];
    if (stand) {
      total += calculateStandCapacity(stand, shape, pos);
    }
  }
  return total;
}

/**
 * Dynamic FIFA Qualification Category Computation (Section 12.2.10 & 14.3)
 * Accrued dynamically based on current capacity, stand architectural grades, floodlights, and turf quality.
 */
export function calculateFifaQualification(
  capacity: number,
  grade?: StandGrade,
  floodlightsKw?: number,
  turfQuality?: TurfQuality
): FifaQualification {
  // Base point calculation
  let points = 0;

  // Capacity threshold points
  if (capacity >= 60000) points += 60;
  else if (capacity >= 45000) points += 48;
  else if (capacity >= 35000) points += 36;
  else if (capacity >= 22000) points += 24;
  else if (capacity >= 15000) points += 16;
  else if (capacity >= 8000) points += 8;
  else points += 2;

  // Stand Grade points
  if (grade === 'grade5_futuristic') points += 18;
  else if (grade === 'grade4_modern') points += 12;
  else if (grade === 'grade3_industrial' || grade === 'grade3_steel_cantilever') points += 6;
  else if (grade === 'grade2_classic') points += 4;
  else if (grade === 'grade1_municipal' || grade === 'grade1_historic_timber') points += 1;

  // Floodlight points
  if (floodlightsKw !== undefined) {
    if (floodlightsKw >= 2200) points += 12;
    else if (floodlightsKw >= 1400) points += 8;
    else if (floodlightsKw >= 800) points += 4;
  } else {
    points += 6; // neutral fallback
  }

  // Turf Quality points
  if (turfQuality === 'pristine') points += 10;
  else if (turfQuality === 'normal') points += 5;
  else if (turfQuality === 'poor') points -= 6;
  else points += 5;

  // Qualification categorization
  // World: massive venues (typically 60k+, modern/futuristic finish, top lighting & turf)
  if (capacity >= 50000 && points >= 80) return 'world';
  if (capacity >= 60000) return 'world'; // Pure capacity override

  // Continental: top-flight continental tournaments (35k-60k)
  if (capacity >= 28000 && points >= 52) return 'continental';
  if (capacity >= 35000) return 'continental';

  // First Division: top-tier domestic league venues (15k-35k)
  if (capacity >= 12000 && points >= 30) return 'first_division';
  if (capacity >= 15000) return 'first_division';

  return 'national';
}
