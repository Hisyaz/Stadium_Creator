/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Building2,
  Video,
  Eye,
  Check,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Sparkles,
  Save,
  Play,
  X,
  Layers,
  Palette,
  Sun,
  Moon,
  Sunrise,
  Sunset,
  Shield,
  Trophy,
  Sliders,
  Maximize2,
  Compass,
  Zap,
  Info,
  CheckCircle2,
  AlertTriangle,
  Move,
  Plane,
  Anchor,
  Trees,
  Train,
  Car,
  Armchair,
  DoorOpen,
  Users,
} from 'lucide-react';
import {
  StadiumDefinition,
  StadiumShape,
  StandGrade,
  SurroundingsType,
  ApronMaterial,
  BenchType,
  BenchQualityTier,
  TunnelType,
  TunnelSiting,
  FifaQualification,
  StandPosition,
  StandConfig,
  TierSize,
  WallTierSize,
  SeatPattern,
  SeatStyle,
  NoStandBackdrop,
  WallSize,
  WallMaterial,
  PerimeterFinishType,
  calculateStadiumTotalCapacity,
  calculateFifaQualification,
  getBackdropsForSurroundings,
} from '../types/stadium';
import {
  StadiumCameraPerspective,
  StandInspectionPosition,
  getStadiumCameraTarget,
  lerpCamera,
  CameraTarget,
} from '../game/stadiumCamera';
import {
  drawPerimeterHorizon,
  drawStadiumArchitecture,
} from '../game/stadiumRenderer';
import { drawAerialSkyCam } from '../game/skyCamRenderer';
import {
  createDefaultStadium,
  saveCustomStadium,
  getStadiumById,
} from '../game/stadiumRegistry';
import { audio } from '../game/audio';
import { PITCH_CONFIG, HOME_KIT, AWAY_KIT } from '../game/constants';
import { LawnMowingPattern, TurfQuality, TimeOfDay } from '../types';

interface StadiumCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveStadium?: (stadium: StadiumDefinition) => void;
  onTestMatchday?: (stadium: StadiumDefinition) => void;
  initialStadium?: StadiumDefinition;
}

export const StadiumCreatorModal: React.FC<StadiumCreatorModalProps> = ({
  isOpen,
  onClose,
  onSaveStadium,
  onTestMatchday,
  initialStadium,
}) => {
  // Active wizard step: 1 to 6
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Stadium definition state being edited
  const [stadium, setStadium] = useState<StadiumDefinition>(() => {
    return initialStadium ? JSON.parse(JSON.stringify(initialStadium)) : createDefaultStadium();
  });

  // Stand-by-stand inspector sub-navigation
  const [activeStandPos, setActiveStandPos] = useState<StandInspectionPosition>('west');

  // Step 3 Sub-tab (Dugouts vs Tunnel)
  const [step3SubTab, setStep3SubTab] = useState<'dugouts' | 'tunnel'>('dugouts');

  // Step 4 Satisfaction Lock
  const [isArchitectureLocked, setIsArchitectureLocked] = useState(false);

  // Top-Right Camera Director State (Phase 14.1)
  const [cameraPerspective, setCameraPerspective] = useState<StadiumCameraPerspective>('relevant');
  const [isCameraPopoverOpen, setIsCameraPopoverOpen] = useState(false);

  // Interactive Canvas Camera tracking state
  const cameraStateRef = useRef<{ x: number; y: number; zoom: number; pitchTilt: number }>({
    x: PITCH_CONFIG.CENTER_X,
    y: PITCH_CONFIG.CENTER_Y,
    zoom: 0.38,
    pitchTilt: 0.5,
  });

  // User manual pan/drag offset
  const manualPanRef = useRef<{ x: number; y: number; isDragging: boolean; lastX: number; lastY: number }>({
    x: 0,
    y: 0,
    isDragging: false,
    lastX: 0,
    lastY: 0,
  });

  // Canvas element ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Re-sync stadium when opened with a new initialStadium
  useEffect(() => {
    if (isOpen) {
      if (initialStadium) {
        setStadium(JSON.parse(JSON.stringify(initialStadium)));
      } else {
        setStadium(createDefaultStadium());
      }
      setCurrentStep(1);
      setIsArchitectureLocked(false);
      setCameraPerspective('relevant');
    }
  }, [isOpen, initialStadium]);

  // Dynamically recompute capacity & FIFA category on any architectural change
  const totalCapacity = calculateStadiumTotalCapacity(stadium.stands, stadium.shape);
  const currentFifa = calculateFifaQualification(
    totalCapacity,
    stadium.stands[activeStandPos === 'corners' ? 'corner_nw' : activeStandPos]?.grade || 'grade1_municipal',
    stadium.lighting?.powerKw,
    stadium.turfQuality || 'normal'
  );

  // Real-time Canvas Rendering Loop (WYSIWYG Procedural Canvas 2D)
  useEffect(() => {
    if (!isOpen) return;

    let animId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2.0);
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }

      // 1. Resolve Target Camera View
      const target = getStadiumCameraTarget(cameraPerspective, {
        activeStep: currentStep,
        activeStand: activeStandPos,
        stadiumDef: stadium,
        focusSubTarget:
          currentStep === 3
            ? step3SubTab
            : currentStep === 1
            ? 'surroundings'
            : undefined,
      });

      // Smooth camera interpolation towards target
      const lerped = lerpCamera(cameraStateRef.current, target, 0.08);
      cameraStateRef.current = lerped;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.imageSmoothingEnabled = false;

      // Fill background sky/void
      ctx.fillStyle = '#050a18';
      ctx.fillRect(0, 0, width, height);

      // Apply Camera View Transform
      const effectiveZoom = Math.max(0.18, Math.min(2.5, lerped.zoom));
      const effectiveTilt = lerped.pitchTilt ?? 0.5;
      const scaleY = effectiveZoom * (0.94 + effectiveTilt * 0.10);

      const screenCenterX = width / 2;
      const screenCenterY = height / 2;

      ctx.translate(screenCenterX + manualPanRef.current.x, screenCenterY + manualPanRef.current.y);
      ctx.scale(effectiveZoom, scaleY);
      ctx.translate(-lerped.x, -lerped.y);

      const timeOfDay = stadium.lighting?.timeOfDay || 'night';

      if (cameraPerspective === 'aerial_sky') {
        // Phase 15.2: High-Altitude 32-Bit Aerial Sky-Cam Renderer
        drawAerialSkyCam(ctx, stadium as StadiumDefinition, {
          roofOpacity: 1.0,
          showBroadcastHUD: false,
          timeOfDay,
          cameraX: lerped.x,
          cameraY: lerped.y,
        });
      } else {
        // 2. Draw Procedural Skybox & Horizon
        drawPerimeterHorizon(
          ctx,
          lerped.x,
          lerped.y,
          stadium.capacity > 50000 ? 'monumental' : stadium.capacity > 20000 ? 'craven' : 'ascenso',
          timeOfDay,
          undefined,
          stadium.surroundings
        );

        // 3. Draw Procedural Stadium Architecture (360 Surroundings, Apron, Running Track, Stands, Benches, Tunnels, Floodlights)
        drawStadiumArchitecture(
          ctx,
          lerped.x,
          lerped.y,
          stadium.capacity > 50000 ? 'monumental' : stadium.capacity > 20000 ? 'craven' : 'ascenso',
          timeOfDay,
          HOME_KIT,
          AWAY_KIT,
          undefined,
          stadium
        );

        // 4. Draw Regulation Pitch Turf & Markings (Honoring Apron Material Boundary)
        const left = PITCH_CONFIG.PITCH_LEFT;
        const top = PITCH_CONFIG.PITCH_TOP;
        const fWidth = PITCH_CONFIG.FIELD_WIDTH;
        const fHeight = PITCH_CONFIG.FIELD_HEIGHT;
        const pitchMargin = (stadium.apronMaterial && stadium.apronMaterial !== 'grass') ? 16 : 70;

        // Base turf rectangle
        ctx.fillStyle = stadium.turfQuality === 'pristine' ? '#1eb842' : stadium.turfQuality === 'poor' ? '#5f6f25' : '#338317';
        ctx.fillRect(left - pitchMargin, top - pitchMargin, fWidth + pitchMargin * 2, fHeight + pitchMargin * 2);

        // Mowing stripes
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        const stripeH = 90;
        for (let y = top; y < top + fHeight; y += stripeH * 2) {
          ctx.fillRect(left, y, fWidth, stripeH);
        }

        // Pitch white regulation lines
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.strokeRect(left, top, fWidth, fHeight);

        // Halfway line & center circle
        ctx.beginPath();
        ctx.moveTo(left, PITCH_CONFIG.CENTER_Y);
        ctx.lineTo(left + fWidth, PITCH_CONFIG.CENTER_Y);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(PITCH_CONFIG.CENTER_X, PITCH_CONFIG.CENTER_Y, PITCH_CONFIG.CENTER_CIRCLE_RADIUS, 0, Math.PI * 2);
        ctx.stroke();

        // Penalty boxes
        ctx.strokeRect(
          PITCH_CONFIG.CENTER_X - PITCH_CONFIG.PENALTY_BOX_WIDTH / 2,
          top,
          PITCH_CONFIG.PENALTY_BOX_WIDTH,
          PITCH_CONFIG.PENALTY_BOX_HEIGHT
        );
        ctx.strokeRect(
          PITCH_CONFIG.CENTER_X - PITCH_CONFIG.PENALTY_BOX_WIDTH / 2,
          top + fHeight - PITCH_CONFIG.PENALTY_BOX_HEIGHT,
          PITCH_CONFIG.PENALTY_BOX_WIDTH,
          PITCH_CONFIG.PENALTY_BOX_HEIGHT
        );
      }

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, cameraPerspective, currentStep, activeStandPos, step3SubTab, stadium]);

  if (!isOpen) return null;

  // Stand-by-stand mutation helper
  const updateCurrentStand = (patch: Partial<StandConfig>) => {
    audio.playKick(0.18);
    const posList: StandPosition[] =
      activeStandPos === 'corners'
        ? ['corner_ne', 'corner_nw', 'corner_se', 'corner_sw']
        : [activeStandPos];

    setStadium((prev) => {
      const nextStands = { ...prev.stands };
      for (const p of posList) {
        nextStands[p] = {
          ...nextStands[p],
          ...patch,
          position: p,
        };
      }
      return {
        ...prev,
        stands: nextStands,
      };
    });
  };

  const activeStandConfig = stadium.stands[activeStandPos === 'corners' ? 'corner_nw' : activeStandPos];

  // Save handler
  const handleSave = () => {
    audio.playKick(0.35);
    const updatedStadium: StadiumDefinition = {
      ...stadium,
      capacity: totalCapacity,
      fifaCategory: currentFifa,
    };
    saveCustomStadium(updatedStadium);
    if (onSaveStadium) onSaveStadium(updatedStadium);
  };

  // Test matchday handler
  const handleTestMatchday = () => {
    audio.playKick(0.4);
    const updatedStadium: StadiumDefinition = {
      ...stadium,
      capacity: totalCapacity,
      fifaCategory: currentFifa,
    };
    saveCustomStadium(updatedStadium);
    if (onTestMatchday) {
      onTestMatchday(updatedStadium);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-1 sm:p-3 select-none animate-fadeIn">
      {/* 32-Bit Metallic Console Shell */}
      <div className="relative w-full max-w-6xl h-[98vh] max-h-[760px] flex flex-col rounded-2xl border-4 border-slate-700 bg-gradient-to-b from-slate-900 via-slate-950 to-black shadow-2xl overflow-hidden text-slate-100 font-sans">
        
        {/* ========================================================================= */}
        {/* TOP HEADER: Console Marquee & Multi-View Camera Switcher Suite (14.1)      */}
        {/* ========================================================================= */}
        <div className="relative flex-none px-3 py-2 sm:px-4 sm:py-2.5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b-2 border-slate-800 flex items-center justify-between z-20">
          
          {/* Left Title & Status */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/70 text-cyan-300 font-mono text-[10px] tracking-widest font-black uppercase shadow-inner">
              <Building2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>STADIUM CREATOR</span>
            </div>
            <span className="hidden sm:inline-block text-[11px] font-mono text-slate-300 tracking-wider font-bold">
              32-BIT ARCHITECT • {stadium.name.toUpperCase()}
            </span>
          </div>

          {/* Center 6-Step LED Indicator */}
          <div className="hidden md:flex items-center gap-1">
            {[1, 2, 3, 4, 5, 6].map((step) => {
              const labels = ['SHAPE', 'STANDS', 'BENCH/TUNNEL', 'LOCK', 'SEATS', 'LIGHTS'];
              const isActive = currentStep === step;
              const isPassed = currentStep > step;
              return (
                <button
                  key={step}
                  onClick={() => {
                    audio.playKick(0.2);
                    setCurrentStep(step);
                  }}
                  className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold transition-all flex items-center gap-1 border ${
                    isActive
                      ? 'bg-amber-500 border-amber-300 text-slate-950 shadow-md ring-1 ring-amber-400'
                      : isPassed
                      ? 'bg-emerald-950/80 border-emerald-600/70 text-emerald-400'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>{step}.</span>
                  <span>{labels[step - 1]}</span>
                </button>
              );
            })}
          </div>

          {/* Right: Quick-Switch Time of Day, Camera Director Icon [ 📹 CAM ] & Close */}
          <div className="flex items-center gap-2">
            {/* Phase 15.6: Time-of-Day Sky & Lighting Switcher (☀️ Noon -> 🌅 Sunset -> 🌙 Night) */}
            {(() => {
              const currentTod = stadium.lighting?.timeOfDay || 'night';
              return (
                <button
                  onClick={() => {
                    audio.playKick(0.2);
                    const next: TimeOfDay = currentTod === 'noon' ? 'sunset' : currentTod === 'sunset' ? 'night' : 'noon';
                    setStadium((prev) => ({
                      ...prev,
                      lighting: {
                        ...(prev.lighting || { type: 'corner_pylons', pylonCount: 4, powerKw: 2000, timeOfDay: next }),
                        timeOfDay: next,
                      },
                    }));
                  }}
                  className={`px-2.5 py-1 rounded border-2 text-[10px] font-mono font-black tracking-wider flex items-center gap-1.5 shadow-md active:scale-95 transition-all ${
                    currentTod === 'noon'
                      ? 'bg-amber-950/60 hover:bg-amber-900/70 border-amber-400 text-amber-300 shadow-amber-500/20'
                      : currentTod === 'sunset'
                      ? 'bg-orange-950/60 hover:bg-orange-900/70 border-orange-500 text-orange-300 shadow-orange-500/20'
                      : 'bg-indigo-950/60 hover:bg-indigo-900/70 border-indigo-500 text-cyan-300 shadow-indigo-500/20'
                  }`}
                  title={`Matchday Lighting: ${
                    currentTod === 'noon'
                      ? 'Morning / Noon (☀️ Sun: Bright Daylight) — Tap for Sunset'
                      : currentTod === 'sunset'
                      ? 'Afternoon / Sunset (🌅 Dying Sun: Orange/Red Glow) — Tap for Night'
                      : 'Night (🌙 Moon: Moonlight & Floodlights) — Tap for Noon'
                  }`}
                >
                  {currentTod === 'noon' && <Sun className="w-3.5 h-3.5 text-amber-400" />}
                  {currentTod === 'sunset' && <Sunset className="w-3.5 h-3.5 text-orange-400" />}
                  {currentTod === 'night' && <Moon className="w-3.5 h-3.5 text-cyan-300" />}
                  <span className="hidden xs:inline">SKY:</span>
                  <span className="text-white font-bold uppercase">{currentTod}</span>
                </button>
              );
            })()}

            {/* Camera Switcher Button */}
            <div className="relative">
              <button
                onClick={() => {
                  audio.playKick(0.25);
                  setIsCameraPopoverOpen(!isCameraPopoverOpen);
                }}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border-2 border-cyan-500/60 text-cyan-300 text-[10px] font-mono font-black tracking-wider flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                title="Top-Right Multi-View Camera Switcher Suite (7 Perspectives)"
              >
                <Video className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span className="hidden xs:inline">CAM:</span>
                <span className="text-white font-bold">{cameraPerspective.toUpperCase()}</span>
                <span className="text-cyan-400 text-[8px]">▼</span>
              </button>

              {/* Camera Popover (7 Specialized Perspectives) */}
              {isCameraPopoverOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-64 rounded-xl border-2 border-cyan-500/80 bg-slate-950 p-2 shadow-2xl z-50 text-[10px] font-mono space-y-1 animate-fadeIn">
                  <div className="px-2 py-1 text-cyan-400 font-bold border-b border-slate-800 flex items-center justify-between">
                    <span>📹 CAMERA DIRECTOR</span>
                    <span className="text-[9px] text-slate-500">7 VIEWS</span>
                  </div>

                  {/* 1. Relevant View */}
                  <button
                    onClick={() => {
                      audio.playKick(0.2);
                      setCameraPerspective('relevant');
                      setIsCameraPopoverOpen(false);
                    }}
                    className={`w-full px-2 py-1.5 rounded flex items-center justify-between text-left transition-colors ${
                      cameraPerspective === 'relevant' ? 'bg-cyan-500 text-slate-950 font-black' : 'hover:bg-slate-800 text-slate-200'
                    }`}
                  >
                    <span>🎯 Relevant View (Auto-Focus)</span>
                    {cameraPerspective === 'relevant' && <Check className="w-3 h-3" />}
                  </button>

                  {/* 2. Full Pitch View */}
                  <button
                    onClick={() => {
                      audio.playKick(0.2);
                      setCameraPerspective('full_pitch');
                      setIsCameraPopoverOpen(false);
                    }}
                    className={`w-full px-2 py-1.5 rounded flex items-center justify-between text-left transition-colors ${
                      cameraPerspective === 'full_pitch' ? 'bg-cyan-500 text-slate-950 font-black' : 'hover:bg-slate-800 text-slate-200'
                    }`}
                  >
                    <span>🏟️ Full Pitch Overview</span>
                    {cameraPerspective === 'full_pitch' && <Check className="w-3 h-3" />}
                  </button>

                  {/* 3. Stands View with stand selector */}
                  <div className={`p-1.5 rounded border ${cameraPerspective === 'stands' ? 'border-cyan-400 bg-cyan-950/40' : 'border-slate-800'}`}>
                    <button
                      onClick={() => {
                        audio.playKick(0.2);
                        setCameraPerspective('stands');
                      }}
                      className="w-full text-left font-bold text-slate-200 flex items-center justify-between"
                    >
                      <span>👥 Stands View (Spectator Rows)</span>
                      {cameraPerspective === 'stands' && <Check className="w-3 h-3 text-cyan-400" />}
                    </button>
                    <div className="grid grid-cols-5 gap-1 mt-1 text-[8px]">
                      {(['east', 'west', 'north', 'south', 'corners'] as StandInspectionPosition[]).map((s) => (
                        <button
                          key={s}
                          onClick={() => {
                            audio.playKick(0.18);
                            setCameraPerspective('stands');
                            setActiveStandPos(s);
                            setIsCameraPopoverOpen(false);
                          }}
                          className={`py-0.5 rounded text-center uppercase font-bold border ${
                            activeStandPos === s && cameraPerspective === 'stands'
                              ? 'bg-amber-400 text-slate-950 border-amber-300'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {s.slice(0, 3)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 4. Playing Field Focus */}
                  <button
                    onClick={() => {
                      audio.playKick(0.2);
                      setCameraPerspective('field_focus');
                      setIsCameraPopoverOpen(false);
                    }}
                    className={`w-full px-2 py-1.5 rounded flex items-center justify-between text-left transition-colors ${
                      cameraPerspective === 'field_focus' ? 'bg-cyan-500 text-slate-950 font-black' : 'hover:bg-slate-800 text-slate-200'
                    }`}
                  >
                    <span>⚽ Field Turf & Goals Focus</span>
                    {cameraPerspective === 'field_focus' && <Check className="w-3 h-3" />}
                  </button>

                  {/* 5. Aerial Sky-Cam */}
                  <button
                    onClick={() => {
                      audio.playKick(0.2);
                      setCameraPerspective('aerial_sky');
                      setIsCameraPopoverOpen(false);
                    }}
                    className={`w-full px-2 py-1.5 rounded flex items-center justify-between text-left transition-colors ${
                      cameraPerspective === 'aerial_sky' ? 'bg-cyan-500 text-slate-950 font-black' : 'hover:bg-slate-800 text-slate-200'
                    }`}
                  >
                    <span>🦅 Aerial Sky-Cam (Far View)</span>
                    {cameraPerspective === 'aerial_sky' && <Check className="w-3 h-3" />}
                  </button>

                  {/* 6. Tunnel Camera */}
                  <button
                    onClick={() => {
                      audio.playKick(0.2);
                      setCameraPerspective('tunnel');
                      setIsCameraPopoverOpen(false);
                    }}
                    className={`w-full px-2 py-1.5 rounded flex items-center justify-between text-left transition-colors ${
                      cameraPerspective === 'tunnel' ? 'bg-cyan-500 text-slate-950 font-black' : 'hover:bg-slate-800 text-slate-200'
                    }`}
                  >
                    <span>🚪 Tunnel Walkout Cam</span>
                    {cameraPerspective === 'tunnel' && <Check className="w-3 h-3" />}
                  </button>

                  {/* 7. Bench Camera */}
                  <button
                    onClick={() => {
                      audio.playKick(0.2);
                      setCameraPerspective('bench');
                      setIsCameraPopoverOpen(false);
                    }}
                    className={`w-full px-2 py-1.5 rounded flex items-center justify-between text-left transition-colors ${
                      cameraPerspective === 'bench' ? 'bg-cyan-500 text-slate-950 font-black' : 'hover:bg-slate-800 text-slate-200'
                    }`}
                  >
                    <span>💺 Dugout Benches Cam</span>
                    {cameraPerspective === 'bench' && <Check className="w-3 h-3" />}
                  </button>

                  <div className="pt-1 border-t border-slate-800 text-[8px] text-slate-500 text-center">
                    Dual-purpose: Used in Pre-Match Walkouts
                  </div>
                </div>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={() => {
                audio.playKick(0.2);
                onClose();
              }}
              className="p-1 rounded bg-slate-800 hover:bg-red-950/80 border border-slate-700 hover:border-red-600 text-slate-400 hover:text-red-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MAIN BODY: SPLIT VIEW (Inspector on Left, Real-Time Preview on Right)     */}
        {/* ========================================================================= */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden relative">
          
          {/* ----------------------------------------------------------------------- */}
          {/* LEFT COLUMN: 6-STEP WIZARD INSPECTOR (Cols 1-5, Single Screen Fit)      */}
          {/* ----------------------------------------------------------------------- */}
          <div className="md:col-span-5 h-full flex flex-col bg-slate-900/90 border-r-2 border-slate-800 overflow-hidden z-10">
            
            {/* Step Header Marquee */}
            <div className="flex-none px-4 py-2 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-mono text-amber-400 font-bold uppercase tracking-widest">
                  STEP {currentStep} OF 6
                </span>
                <h3 className="font-['Outfit'] font-black text-sm text-white uppercase tracking-wide">
                  {currentStep === 1 && '1. Structure, Shape & Surroundings'}
                  {currentStep === 2 && '2. Stand-by-Stand Architecture'}
                  {currentStep === 3 && '3. Dugouts & Entrance Tunnel'}
                  {currentStep === 4 && '4. Structural Review & Lock'}
                  {currentStep === 5 && '5. Stadium Bowl Seats & Colors'}
                  {currentStep === 6 && '6. Floodlights & Registry Save'}
                </h3>
              </div>

              {/* Step Navigation Arrows */}
              <div className="flex items-center gap-1">
                <button
                  disabled={currentStep <= 1}
                  onClick={() => {
                    audio.playKick(0.18);
                    setCurrentStep((p) => Math.max(1, p - 1));
                  }}
                  className="p-1 rounded bg-slate-800 disabled:opacity-30 border border-slate-700 hover:bg-slate-700 text-slate-200"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={currentStep >= 6}
                  onClick={() => {
                    audio.playKick(0.18);
                    setCurrentStep((p) => Math.min(6, p + 1));
                  }}
                  className="p-1 rounded bg-slate-800 disabled:opacity-30 border border-slate-700 hover:bg-slate-700 text-slate-200"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Step Content Container (Scrollable internally without page scroll) */}
            <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-3 font-mono text-[11px]">
              
              {/* ------------------------------------------------------------------- */}
              {/* STEP 1: STRUCTURE, SHAPE & SURROUNDINGS (14.4.1)                   */}
              {/* ------------------------------------------------------------------- */}
              {currentStep === 1 && (
                <div className="space-y-3 animate-fadeIn">
                  {/* Stadium Name & Short Name */}
                  <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      VENUE IDENTITY
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[9px] text-slate-500">FULL NAME:</span>
                        <input
                          type="text"
                          value={stadium.name}
                          onChange={(e) => setStadium({ ...stadium, name: e.target.value })}
                          className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-amber-300 font-bold focus:border-amber-400 outline-none text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500">CITY / REGION:</span>
                        <input
                          type="text"
                          value={stadium.city}
                          onChange={(e) => setStadium({ ...stadium, city: e.target.value })}
                          className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white focus:border-cyan-400 outline-none text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Architectural Shape Selection */}
                  <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      ARCHITECTURAL SHAPE (4 DISTINCTIVE FORMATS)
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(['round', 'oval', 'square', 'rectangular'] as StadiumShape[]).map((shp) => (
                        <button
                          key={shp}
                          onClick={() => {
                            audio.playKick(0.2);
                            setStadium({
                              ...stadium,
                              shape: shp,
                              // Running track strictly exclusive to round & oval
                              hasTrack: shp === 'round' || shp === 'oval' ? stadium.hasTrack : false,
                            });
                          }}
                          className={`p-2 rounded border text-left transition-all ${
                            stadium.shape === shp
                              ? 'border-amber-400 bg-amber-950/40 text-amber-300 ring-1 ring-amber-400'
                              : 'border-slate-800 bg-slate-900 hover:border-slate-600 text-slate-300'
                          }`}
                        >
                          <div className="font-bold uppercase text-[10px]">{shp}</div>
                          <div className="text-[8px] text-slate-500">
                            {shp === 'round' && 'Continuous Coliseum Circular Bowl'}
                            {shp === 'oval' && 'Olympic Curved Horseshoe Endzones'}
                            {shp === 'square' && 'Rectilinear with 45° Corner Pavilions'}
                            {shp === 'rectangular' && 'Classic English 4-Stand Box Ground'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* PHASE 15.5: Apron Perimeter Material (Between Pitch and Grandstands) */}
                  <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5">
                    <label className="text-[10px] text-amber-400 font-bold uppercase tracking-wider flex items-center justify-between">
                      <span>APRON PERIMETER MATERIAL (PITCH BORDER)</span>
                      <span className="text-[9px] text-slate-500">6 MATERIALS</span>
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          { id: 'grass', label: 'Natural Turf', icon: '🌱', desc: 'Lush green lawn & chalk line' },
                          { id: 'concrete', label: 'Concrete Slabs', icon: '🧱', desc: 'Pre-cast pavers & joint grid' },
                          { id: 'rubber_tartan', label: 'Tartan Rubber', icon: '🏃', desc: 'High-grip non-slip tartan' },
                          { id: 'artificial_turf', label: 'AstroTurf', icon: '🌿', desc: 'Lime synthetic turf & seam tape' },
                          { id: 'gravel_ballast', label: 'Crushed Gravel', icon: '🪨', desc: 'Ballast river gravel & stone' },
                          { id: 'asphalt_paved', label: 'Paved Asphalt', icon: '🛣️', desc: 'Charcoal tarmac & hazard curb' },
                        ] as { id: ApronMaterial; label: string; icon: string; desc: string }[]
                      ).map((mat) => (
                        <button
                          key={mat.id}
                          onClick={() => {
                            audio.playKick(0.2);
                            setStadium({ ...stadium, apronMaterial: mat.id });
                          }}
                          className={`p-1.5 rounded border text-left transition-all ${
                            (stadium.apronMaterial || 'grass') === mat.id
                              ? 'border-amber-400 bg-amber-950/50 text-amber-200 ring-1 ring-amber-400'
                              : 'border-slate-800 bg-slate-900/90 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-1 font-bold text-[9px]">
                            <span>{mat.icon}</span>
                            <span className="truncate">{mat.label}</span>
                          </div>
                          <div className="text-[7px] text-slate-500 truncate mt-0.5">{mat.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Athletics Running Track (Exclusive to Round & Oval) */}
                  {(stadium.shape === 'round' || stadium.shape === 'oval') && (
                    <div className="p-2.5 rounded-lg bg-cyan-950/20 border border-cyan-700/50 flex items-center justify-between animate-fadeIn">
                      <div>
                        <div className="font-bold text-cyan-300 text-[10px] uppercase">
                          🏃 ATHLETICS RUNNING TRACK (8-LANE CURVED)
                        </div>
                        <div className="text-[9px] text-slate-400">
                          {stadium.shape === 'round'
                            ? 'Continuous circular track encircling pitch and apron'
                            : 'Olympic straight touchlines & semicircular curved endzones'}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          audio.playKick(0.2);
                          setStadium({ ...stadium, hasTrack: !stadium.hasTrack });
                        }}
                        className={`px-3 py-1 rounded font-bold text-[10px] uppercase border transition-all ${
                          stadium.hasTrack
                            ? 'bg-cyan-500 border-cyan-300 text-slate-950'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        {stadium.hasTrack ? 'ENABLED' : 'DISABLED'}
                      </button>
                    </div>
                  )}

                  {/* Eleven Outside Surroundings (15.5 Overhaul) */}
                  <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center justify-between">
                      <span>OUTSIDE SURROUNDINGS (360° PANORAMIC)</span>
                      <span className="text-cyan-400 text-[9px]">3 TIME VARIANTS</span>
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                      {(
                        [
                          { id: 'mountains', label: 'Mountains', icon: '⛰️' },
                          { id: 'forest', label: 'Forest', icon: '🌲' },
                          { id: 'savannah', label: 'Savannah', icon: '🦒' },
                          { id: 'highway', label: 'Highway', icon: '🛣️' },
                          { id: 'small_city', label: 'Small City', icon: '🏘️' },
                          { id: 'big_city', label: 'Big City', icon: '🌆' },
                          { id: 'beach', label: 'Beach', icon: '🏖️' },
                          { id: 'airport', label: 'Airport', icon: '✈️' },
                          { id: 'railroad', label: 'Railroad', icon: '🚂' },
                          { id: 'parking_lot', label: 'Parking Lot', icon: '🚌' },
                          { id: 'marine_floating', label: 'Marine Floating', icon: '🌊' },
                        ] as { id: SurroundingsType; label: string; icon: string }[]
                      ).map((sur) => (
                        <button
                          key={sur.id}
                          onClick={() => {
                            audio.playKick(0.2);
                            setStadium({ ...stadium, surroundings: sur.id });
                          }}
                          className={`p-1.5 rounded border text-left flex items-center gap-1.5 transition-all ${
                            stadium.surroundings === sur.id
                              ? 'border-cyan-400 bg-cyan-950/50 text-cyan-200'
                              : 'border-slate-800 bg-slate-900/90 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <span className="text-base">{sur.icon}</span>
                          <span className="font-bold text-[10px]">{sur.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------------- */}
              {/* STEP 2: STAND-BY-STAND FOCUS CAMERA & CHISELED INSPECTOR (14.4.2)   */}
              {/* ------------------------------------------------------------------- */}
              {currentStep === 2 && (
                <div className="space-y-3 animate-fadeIn">
                  
                  {/* Stand Selector Tabs */}
                  <div className="p-1 bg-slate-950 rounded-lg border border-slate-800 grid grid-cols-5 gap-1">
                    {(['east', 'west', 'north', 'south', 'corners'] as StandInspectionPosition[]).map((pos) => (
                      <button
                        key={pos}
                        onClick={() => {
                          audio.playKick(0.2);
                          setActiveStandPos(pos);
                        }}
                        className={`py-1.5 rounded text-center uppercase font-bold text-[10px] transition-all border ${
                          activeStandPos === pos
                            ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md font-black'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>

                  {/* Stand Structural Type: Tiered vs Wall Tier vs No Stand */}
                  <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      STAND STRUCTURAL TYPE
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        onClick={() => updateCurrentStand({ type: 'tiered' })}
                        className={`p-2 rounded border text-left font-bold ${
                          activeStandConfig?.type === 'tiered'
                            ? 'border-amber-400 bg-amber-950/40 text-amber-300'
                            : 'border-slate-800 bg-slate-900 text-slate-400'
                        }`}
                      >
                        <div>TIERED</div>
                        <div className="text-[8px] text-slate-500">1 to 4 Decks</div>
                      </button>

                      <button
                        onClick={() => updateCurrentStand({ type: 'wall' })}
                        className={`p-2 rounded border text-left font-bold ${
                          activeStandConfig?.type === 'wall'
                            ? 'border-amber-400 bg-amber-950/40 text-amber-300'
                            : 'border-slate-800 bg-slate-900 text-slate-400'
                        }`}
                      >
                        <div>WALL TIER</div>
                        <div className="text-[8px] text-slate-500">Yellow Wall</div>
                      </button>

                      <button
                        onClick={() => updateCurrentStand({ type: 'none' })}
                        className={`p-2 rounded border text-left font-bold ${
                          activeStandConfig?.type === 'none' || activeStandConfig?.type === 'no_stand'
                            ? 'border-amber-400 bg-amber-950/40 text-amber-300'
                            : 'border-slate-800 bg-slate-900 text-slate-400'
                        }`}
                      >
                        <div>NO STAND</div>
                        <div className="text-[8px] text-slate-500">Open End</div>
                      </button>
                    </div>
                  </div>

                  {/* If Tiered: Tier Count (1 to 4) & Tier Size */}
                  {activeStandConfig?.type === 'tiered' && (
                    <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">TIER DECKS COUNT:</span>
                        <div className="flex items-center gap-1">
                          {([1, 2, 3, 4] as (1 | 2 | 3 | 4)[]).map((tc) => (
                            <button
                              key={tc}
                              onClick={() => {
                                const currentTiers = activeStandConfig.tiers || [];
                                const newTiers = Array.from({ length: tc }, (_, i) => currentTiers[i] || { size: 'medium' as TierSize });
                                updateCurrentStand({ tierCount: tc, tiers: newTiers });
                              }}
                              className={`w-7 h-6 rounded font-bold border text-xs ${
                                activeStandConfig.tierCount === tc
                                  ? 'bg-amber-400 text-slate-950 border-amber-300'
                                  : 'bg-slate-800 text-slate-300 border-slate-700'
                              }`}
                            >
                              {tc}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Tier size per deck */}
                      <div className="space-y-1">
                        {(activeStandConfig.tiers || [{ size: 'medium' }]).map((t, idx) => (
                          <div key={idx} className="flex items-center justify-between text-[10px] bg-slate-900 p-1.5 rounded">
                            <span className="text-slate-400 font-bold">DECK {idx + 1}:</span>
                            <div className="flex gap-1">
                              {(['small', 'medium', 'large'] as TierSize[]).map((sz) => (
                                <button
                                  key={sz}
                                  onClick={() => {
                                    const nextTiers = [...(activeStandConfig.tiers || [])];
                                    nextTiers[idx] = { size: sz };
                                    updateCurrentStand({ tiers: nextTiers });
                                  }}
                                  className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold border ${
                                    t.size === sz
                                      ? 'bg-cyan-500 border-cyan-300 text-slate-950'
                                      : 'bg-slate-800 border-slate-700 text-slate-400'
                                  }`}
                                >
                                  {sz}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* If Wall Tier: Wall size (small, medium, large) */}
                  {activeStandConfig?.type === 'wall' && (
                    <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        WALL TIER SCALE (DORTMUND-STYLE CONTINUOUS TERRACE)
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(['small', 'medium', 'large'] as WallTierSize[]).map((wsz) => (
                          <button
                            key={wsz}
                            onClick={() => updateCurrentStand({ wallSize: wsz })}
                            className={`p-2 rounded border text-center font-bold uppercase ${
                              activeStandConfig.wallSize === wsz
                                ? 'bg-amber-400 text-slate-950 border-amber-300'
                                : 'bg-slate-900 text-slate-400 border-slate-800'
                            }`}
                          >
                            {wsz}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* If No Stand: 15.7.1 Contextual Backdrop, Universal Wall, 15.7.2 Perimeter Finish & 15.7.3 Grassroots Fans */}
                  {(activeStandConfig?.type === 'none' || activeStandConfig?.type === 'no_stand') ? (
                    <div className="space-y-3">
                      {/* 15.7.1 Contextual Backdrop */}
                      <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2">
                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                          NO-STAND CONTEXTUAL BACKDROP (PHASE 15.7.1)
                        </label>
                        <div className="grid grid-cols-1 gap-1 max-h-44 overflow-y-auto">
                          {getBackdropsForSurroundings(stadium.surroundings).map((bd) => (
                            <button
                              key={bd.id}
                              onClick={() => {
                                audio.playKick(0.2);
                                updateCurrentStand({ backdrop: bd.id, noStandBackdrop: bd.id });
                              }}
                              className={`w-full p-1.5 rounded border text-left text-[10px] font-bold flex items-center justify-between transition-all ${
                                (activeStandConfig.backdrop === bd.id || activeStandConfig.noStandBackdrop === bd.id)
                                  ? 'bg-cyan-500 text-slate-950 border-cyan-300 font-black shadow-md'
                                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
                              }`}
                            >
                              <span>{bd.label}</span>
                              {(activeStandConfig.backdrop === bd.id || activeStandConfig.noStandBackdrop === bd.id) && (
                                <Check className="w-3.5 h-3.5 text-slate-950" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* If Backdrop is Wall: Wall Height & Material */}
                      {(activeStandConfig.backdrop === 'wall' || activeStandConfig.noStandBackdrop === 'wall') && (
                        <div className="p-2.5 rounded-lg bg-slate-950/70 border border-cyan-500/50 space-y-2">
                          <label className="text-[10px] text-cyan-300 font-bold uppercase tracking-wider block">
                            🧱 UNIVERSAL PERIMETER WALL OPTIONS
                          </label>
                          {/* Wall Size */}
                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-400 font-bold uppercase">WALL HEIGHT:</span>
                            <div className="grid grid-cols-3 gap-1">
                              {(['low', 'medium', 'tall'] as WallSize[]).map((sz) => (
                                <button
                                  key={sz}
                                  onClick={() => {
                                    audio.playKick(0.2);
                                    updateCurrentStand({
                                      wallPerimeter: {
                                        size: sz,
                                        material: activeStandConfig.wallPerimeter?.material || 'brick',
                                      },
                                    });
                                  }}
                                  className={`py-1 rounded text-center text-[9px] font-bold uppercase border ${
                                    (activeStandConfig.wallPerimeter?.size || 'medium') === sz
                                      ? 'bg-amber-400 text-slate-950 border-amber-300 font-black'
                                      : 'bg-slate-900 text-slate-400 border-slate-800'
                                  }`}
                                >
                                  {sz}
                                </button>
                              ))}
                            </div>
                          </div>
                          {/* Wall Material */}
                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-400 font-bold uppercase">WALL FINISH MATERIAL:</span>
                            <div className="grid grid-cols-3 gap-1">
                              {(
                                [
                                  { id: 'brick', label: 'Brick' },
                                  { id: 'concrete', label: 'Concrete' },
                                  { id: 'stone', label: 'Stone' },
                                  { id: 'timber', label: 'Timber' },
                                  { id: 'metal_cladding', label: 'Metal' },
                                ] as { id: WallMaterial; label: string }[]
                              ).map((mat) => (
                                <button
                                  key={mat.id}
                                  onClick={() => {
                                    audio.playKick(0.2);
                                    updateCurrentStand({
                                      wallPerimeter: {
                                        size: activeStandConfig.wallPerimeter?.size || 'medium',
                                        material: mat.id,
                                      },
                                    });
                                  }}
                                  className={`py-1 rounded text-center text-[9px] font-bold uppercase border ${
                                    (activeStandConfig.wallPerimeter?.material || 'brick') === mat.id
                                      ? 'bg-amber-400 text-slate-950 border-amber-300 font-black'
                                      : 'bg-slate-900 text-slate-400 border-slate-800'
                                  }`}
                                >
                                  {mat.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 15.7.2 Dedicated 5-Material Perimeter Enclosure Suite */}
                      <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2">
                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                          PERIMETER BARRIER ENCLOSURE (PHASE 15.7.2)
                        </label>
                        <div className="space-y-1">
                          {(
                            [
                              { id: 'chainlink_fence', label: '⛓️ Chainlink Steel Wire Fence (Barbed Wire Arms)' },
                              { id: 'brick_wall', label: '🧱 Weathered Flemish Red-Brick Wall (Moss & Coping)' },
                              { id: 'concrete_wall', label: '🏢 Pre-Cast Concrete Security Wall (Seams & Tags)' },
                              { id: 'rustic_timber', label: '🪵 Rustic Timber Palisade (Woodgrain & Iron Nails)' },
                              { id: 'corrugated_hoarding', label: '📻 Retro Corrugated Hoarding (Painted Sponsors)' },
                            ] as { id: PerimeterFinishType; label: string }[]
                          ).map((p) => (
                            <button
                              key={p.id}
                              onClick={() => {
                                audio.playKick(0.2);
                                updateCurrentStand({ perimeterFinish: p.id });
                              }}
                              className={`w-full p-1.5 rounded border text-left text-[10px] font-bold flex items-center justify-between transition-all ${
                                (activeStandConfig.perimeterFinish || 'chainlink_fence') === p.id
                                  ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-md'
                                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                              }`}
                            >
                              <span>{p.label}</span>
                              {(activeStandConfig.perimeterFinish || 'chainlink_fence') === p.id && (
                                <Check className="w-3.5 h-3.5 text-slate-950" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 15.7.3 Grassroots Fan Presence */}
                      <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-200 text-[10px] uppercase flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-amber-400" />
                            <span>GRASSROOTS SUPPORTERS (15.7.3)</span>
                          </div>
                          <div className="text-[9px] text-slate-500">
                            Casual fans leaning on barrier with caps, scarves & beers
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            audio.playKick(0.2);
                            updateCurrentStand({ hasGrassrootsFans: activeStandConfig.hasGrassrootsFans === false ? true : false });
                          }}
                          className={`px-3 py-1 rounded font-bold text-[10px] border transition-all ${
                            activeStandConfig.hasGrassrootsFans !== false
                              ? 'bg-emerald-500 border-emerald-300 text-slate-950'
                              : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}
                        >
                          {activeStandConfig.hasGrassrootsFans !== false ? 'ENABLED' : 'DISABLED'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Stand Architectural Grade (5 Grades) */}
                      <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5">
                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                          ARCHITECTURAL GRADE & FINISH
                        </label>
                        <div className="space-y-1">
                          {(
                            [
                              { id: 'grade1_municipal', label: 'Grade 1: Municipal (Weathered Cinder Block / Timber)' },
                              { id: 'grade2_classic', label: 'Grade 2: Classic (English Red-Brick Masonry)' },
                              { id: 'grade3_industrial', label: 'Grade 3: Industrial (Corrugated Heavy Steel)' },
                              { id: 'grade4_modern', label: 'Grade 4: Modern (Pre-Cast Concrete & Glass)' },
                              { id: 'grade5_futuristic', label: 'Grade 5: Futuristic (Aero-Aluminum & LED Ribbon)' },
                            ] as { id: StandGrade; label: string }[]
                          ).map((g) => (
                            <button
                              key={g.id}
                              onClick={() => updateCurrentStand({ grade: g.id })}
                              className={`w-full p-1.5 rounded border text-left text-[10px] font-bold transition-all ${
                                activeStandConfig?.grade === g.id
                                  ? 'border-amber-400 bg-amber-950/50 text-amber-200'
                                  : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {g.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Roof Inspector */}
                      <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-200 text-[10px] uppercase">
                            ROOF CANOPY
                          </div>
                          <div className="text-[9px] text-slate-500">
                            Coverage: {Math.round((activeStandConfig?.roofCoverage || 0.8) * 100)}%
                          </div>
                        </div>
                        <button
                          onClick={() => updateCurrentStand({ hasRoof: !activeStandConfig?.hasRoof })}
                          className={`px-3 py-1 rounded font-bold text-[10px] border ${
                            activeStandConfig?.hasRoof
                              ? 'bg-emerald-500 border-emerald-300 text-slate-950'
                              : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}
                        >
                          {activeStandConfig?.hasRoof ? 'ROOF COVERED' : 'OPEN SKY'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ------------------------------------------------------------------- */}
              {/* STEP 3: DUGOUTS & ENTRANCE TUNNEL INSPECTOR (14.4.3)                */}
              {/* ------------------------------------------------------------------- */}
              {currentStep === 3 && (
                <div className="space-y-3 animate-fadeIn">
                  
                  {/* Dugout vs Tunnel Sub-Tabs */}
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-lg border border-slate-800">
                    <button
                      onClick={() => {
                        audio.playKick(0.2);
                        setStep3SubTab('dugouts');
                      }}
                      className={`py-2 rounded text-center font-bold text-xs uppercase border transition-all flex items-center justify-center gap-1.5 ${
                        step3SubTab === 'dugouts'
                          ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-md'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      <Armchair className="w-4 h-4" />
                      <span>DUGOUT BENCHES</span>
                    </button>

                    <button
                      onClick={() => {
                        audio.playKick(0.2);
                        setStep3SubTab('tunnel');
                      }}
                      className={`py-2 rounded text-center font-bold text-xs uppercase border transition-all flex items-center justify-center gap-1.5 ${
                        step3SubTab === 'tunnel'
                          ? 'bg-cyan-500 text-slate-950 border-cyan-300 font-black shadow-md'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      <DoorOpen className="w-4 h-4" />
                      <span>ENTRANCE TUNNEL</span>
                    </button>
                  </div>

                  {/* DUGOUT BENCHES INSPECTOR */}
                  {step3SubTab === 'dugouts' && (
                    <div className="space-y-2.5 animate-fadeIn">
                      <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5">
                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                          BENCH TYPE (5 CANONICAL STYLES)
                        </label>
                        <div className="space-y-1">
                          {(
                            [
                              { id: 'recaro_racing', label: 'Recaro Racing Bucket Seats (Premier League / UCL Luxury)' },
                              { id: 'covered_sunken', label: 'Covered Sunken Dugout Trench (Acrylic Canopy Shield)' },
                              { id: 'classic_timber', label: 'Classic Timber Bench (Grassroots Slatted Wood)' },
                              { id: 'utilitarian_concrete', label: 'Utilitarian Concrete Bunker (Heavy Cast Cinder Block)' },
                              { id: 'folding_chairs', label: 'Pitch-Level Folding Chairs (Community Ground)' },
                            ] as { id: BenchType; label: string }[]
                          ).map((b) => (
                            <button
                              key={b.id}
                              onClick={() => {
                                audio.playKick(0.2);
                                setStadium({
                                  ...stadium,
                                  dugouts: {
                                    ...(stadium.dugouts || {
                                      type: b.id,
                                      quality: 'modern',
                                      frameColor: '#0f172a',
                                      cushionColor: '#dc2626',
                                      shelterTint: 'rgba(15,23,42,0.9)',
                                      setbackDistance: 12,
                                    }),
                                    type: b.id,
                                  },
                                });
                              }}
                              className={`w-full p-2 rounded border text-left text-[10px] font-bold ${
                                stadium.dugouts?.type === b.id
                                  ? 'border-amber-400 bg-amber-950/50 text-amber-200'
                                  : 'border-slate-800 bg-slate-900 text-slate-400'
                              }`}
                            >
                              {b.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Bench Quality Tier */}
                      <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5">
                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                          BENCH QUALITY TIER
                        </label>
                        <div className="grid grid-cols-4 gap-1">
                          {(['municipal', 'classic', 'modern', 'elite_vip'] as BenchQualityTier[]).map((q) => (
                            <button
                              key={q}
                              onClick={() => {
                                audio.playKick(0.2);
                                if (stadium.dugouts) {
                                  setStadium({
                                    ...stadium,
                                    dugouts: { ...stadium.dugouts, quality: q },
                                  });
                                }
                              }}
                              className={`py-1.5 rounded border text-center text-[9px] uppercase font-bold ${
                                stadium.dugouts?.quality === q
                                  ? 'bg-amber-400 text-slate-950 border-amber-300'
                                  : 'bg-slate-900 text-slate-400 border-slate-800'
                              }`}
                            >
                              {q.replace('_', ' ')}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PLAYER ENTRANCE TUNNEL INSPECTOR */}
                  {step3SubTab === 'tunnel' && (
                    <div className="space-y-2.5 animate-fadeIn">
                      <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5">
                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                          TUNNEL TYPE (5 CANONICAL PORTALS)
                        </label>
                        <div className="space-y-1">
                          {(
                            [
                              { id: 'inflatable_accordion', label: 'Inflatable Accordion Bellows (South American Style)' },
                              { id: 'modern_architectural', label: 'Modern Architectural Backlit LED Ribbon Tunnel' },
                              { id: 'subterranean_staircase', label: 'Subterranean Concrete Staircase (English Ground)' },
                              { id: 'direct_portal', label: 'Direct Pitch-Level Portal with Security Grille' },
                              { id: 'telescopic_canopy', label: 'Covered Telescopic Canopy on Sliding Tracks' },
                            ] as { id: TunnelType; label: string }[]
                          ).map((t) => (
                            <button
                              key={t.id}
                              onClick={() => {
                                audio.playKick(0.2);
                                setStadium({
                                  ...stadium,
                                  tunnel: {
                                    ...(stadium.tunnel || {
                                      type: t.id,
                                      siting: 'center_main',
                                      primaryColor: '#2563eb',
                                      secondaryColor: '#ffffff',
                                    }),
                                    type: t.id,
                                  },
                                });
                              }}
                              className={`w-full p-2 rounded border text-left text-[10px] font-bold ${
                                stadium.tunnel?.type === t.id
                                  ? 'border-cyan-400 bg-cyan-950/50 text-cyan-200'
                                  : 'border-slate-800 bg-slate-900 text-slate-400'
                              }`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Tunnel Siting */}
                      <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5">
                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                          TUNNEL SITING & LOCATION
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {(
                            [
                              { id: 'center_main', label: 'Center Main' },
                              { id: 'corner', label: 'Pitch Corner' },
                              { id: 'behind_goal', label: 'Behind Goal' },
                            ] as { id: TunnelSiting; label: string }[]
                          ).map((s) => (
                            <button
                              key={s.id}
                              onClick={() => {
                                audio.playKick(0.2);
                                if (stadium.tunnel) {
                                  setStadium({
                                    ...stadium,
                                    tunnel: { ...stadium.tunnel, siting: s.id },
                                  });
                                }
                              }}
                              className={`py-1.5 rounded border text-center text-[10px] uppercase font-bold ${
                                stadium.tunnel?.siting === s.id
                                  ? 'bg-cyan-500 text-slate-950 border-cyan-300'
                                  : 'bg-slate-900 text-slate-400 border-slate-800'
                              }`}
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ------------------------------------------------------------------- */}
              {/* STEP 4: STAND COMPLETION & SATISFACTION CONFIRMATION (14.4.4)      */}
              {/* ------------------------------------------------------------------- */}
              {currentStep === 4 && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase border-b border-slate-800 pb-2">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      <span>STRUCTURAL ARCHITECTURE SUMMARY</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                        <div className="text-slate-500">SHAPE & SURROUNDINGS:</div>
                        <div className="font-bold text-white uppercase mt-0.5">{stadium.shape} • {stadium.surroundings}</div>
                      </div>
                      <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                        <div className="text-slate-500">CALCULATED CAPACITY:</div>
                        <div className="font-bold text-amber-300 text-sm mt-0.5">{totalCapacity.toLocaleString()} SEATS</div>
                      </div>
                      <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                        <div className="text-slate-500">DUGOUTS & TUNNEL:</div>
                        <div className="font-bold text-cyan-300 uppercase mt-0.5">
                          {stadium.dugouts?.type.replace('_', ' ')} • {stadium.tunnel?.siting}
                        </div>
                      </div>
                      <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                        <div className="text-slate-500">FIFA QUALIFICATION:</div>
                        <div className="font-bold text-emerald-400 text-sm uppercase mt-0.5">{currentFifa.replace('_', ' ')}</div>
                      </div>
                    </div>

                    {/* Lock Button */}
                    <button
                      onClick={() => {
                        audio.playKick(0.35);
                        setIsArchitectureLocked(true);
                        setCurrentStep(5);
                      }}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>LOCK ARCHITECTURE & ADVANCE TO AESTHETICS ⏩</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------------- */}
              {/* STEP 5: FULL-STADIUM PAN - SEAT COLOR, PATTERN & STYLES (14.4.5)   */}
              {/* ------------------------------------------------------------------- */}
              {currentStep === 5 && (
                <div className="space-y-3 animate-fadeIn">
                  
                  {/* Seat Pattern Selection */}
                  <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      GRANDSTAND SEAT PATTERN
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(
                        [
                          { id: 'solid', label: 'Solid Color' },
                          { id: 'horizontalBands', label: 'Horizontal Bands' },
                          { id: 'verticalStripes', label: 'Vertical Stripes' },
                          { id: 'lowerUpper', label: 'Lower / Upper Decks' },
                          { id: 'perStand', label: 'Per Stand Division' },
                        ] as { id: SeatPattern; label: string }[]
                      ).map((pat) => (
                        <button
                          key={pat.id}
                          onClick={() => {
                            audio.playKick(0.2);
                            setStadium({
                              ...stadium,
                              seats: { ...stadium.seats, pattern: pat.id },
                            });
                          }}
                          className={`p-2 rounded border text-left font-bold text-[10px] ${
                            stadium.seats.pattern === pat.id
                              ? 'border-amber-400 bg-amber-950/40 text-amber-300'
                              : 'border-slate-800 bg-slate-900 text-slate-400'
                          }`}
                        >
                          {pat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Seat Style (Bucket, VIP, Bench, Tip-up) */}
                  <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      SEAT HARDWARE STYLE
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(
                        [
                          { id: 'classic_bucket', label: 'Classic Bucket' },
                          { id: 'tip_up_padded', label: 'Tip-Up Padded' },
                          { id: 'vip_leather', label: 'VIP Leather' },
                          { id: 'plastic_bench', label: 'Plastic Bench' },
                        ] as { id: SeatStyle; label: string }[]
                      ).map((st) => (
                        <button
                          key={st.id}
                          onClick={() => {
                            audio.playKick(0.2);
                            setStadium({
                              ...stadium,
                              seats: { ...stadium.seats, style: st.id },
                            });
                          }}
                          className={`p-1.5 rounded border text-left font-bold text-[10px] ${
                            stadium.seats.style === st.id
                              ? 'border-cyan-400 bg-cyan-950/40 text-cyan-200'
                              : 'border-slate-800 bg-slate-900 text-slate-400'
                          }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Primary & Accent Seat Colors */}
                  <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      CLUB SEAT PALETTE
                    </label>
                    <div className="flex items-center gap-2">
                      {['#dc2626', '#2563eb', '#16a34a', '#ca8a04', '#7c3aed', '#ffffff', '#0f172a'].map((c) => (
                        <button
                          key={c}
                          onClick={() => {
                            audio.playKick(0.2);
                            setStadium({
                              ...stadium,
                              seats: { ...stadium.seats, colors: [c, stadium.seats.colors[1] || '#ffffff'] },
                            });
                          }}
                          style={{ backgroundColor: c }}
                          className={`w-6 h-6 rounded-full border-2 transition-transform ${
                            stadium.seats.colors[0] === c ? 'scale-125 border-amber-400 ring-2 ring-amber-400' : 'border-slate-600'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------------- */}
              {/* STEP 6: FLOODLIGHTS & FINAL REGISTRY SAVE (14.4.6)                  */}
              {/* ------------------------------------------------------------------- */}
              {currentStep === 6 && (
                <div className="space-y-3 animate-fadeIn">
                  
                  {/* Time of Day Lighting */}
                  <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      LIGHTING & MATCHDAY TIME OF DAY
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(['night', 'sunset', 'noon', 'dawn'] as TimeOfDay[]).map((tod) => (
                        <button
                          key={tod}
                          onClick={() => {
                            audio.playKick(0.2);
                            setStadium({
                              ...stadium,
                              lighting: {
                                ...(stadium.lighting || { type: 'corner_pylons', pylonCount: 4, powerKw: 2000, timeOfDay: tod }),
                                timeOfDay: tod,
                              },
                            });
                          }}
                          className={`py-2 rounded border text-center font-bold text-[10px] uppercase ${
                            stadium.lighting?.timeOfDay === tod
                              ? 'bg-amber-400 text-slate-950 border-amber-300'
                              : 'bg-slate-900 text-slate-400 border-slate-800'
                          }`}
                        >
                          {tod}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Turf Quality & Mowing Pattern */}
                  <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      TURF QUALITY GRADE
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['pristine', 'normal', 'poor'] as TurfQuality[]).map((tq) => (
                        <button
                          key={tq}
                          onClick={() => {
                            audio.playKick(0.2);
                            setStadium({ ...stadium, turfQuality: tq });
                          }}
                          className={`py-1.5 rounded border text-center font-bold text-[10px] uppercase ${
                            stadium.turfQuality === tq
                              ? 'bg-emerald-500 text-slate-950 border-emerald-300'
                              : 'bg-slate-900 text-slate-400 border-slate-800'
                          }`}
                        >
                          {tq}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons: Save & Test Matchday */}
                  <div className="pt-2 space-y-2">
                    <button
                      onClick={handleSave}
                      className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs uppercase tracking-wider shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 border border-cyan-400"
                    >
                      <Save className="w-4 h-4" />
                      <span>SAVE STADIUM TO REGISTRY</span>
                    </button>

                    <button
                      onClick={handleTestMatchday}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>⚽ TEST LIVE MATCHDAY WITH THIS VENUE</span>
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Bottom Wizard Navigation Footer */}
            <div className="flex-none px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
              <button
                disabled={currentStep <= 1}
                onClick={() => {
                  audio.playKick(0.18);
                  setCurrentStep((p) => Math.max(1, p - 1));
                }}
                className="px-3 py-1.5 rounded bg-slate-800 disabled:opacity-30 border border-slate-700 text-slate-300 font-bold text-xs"
              >
                ◀ PREVIOUS
              </button>

              <div className="text-[10px] text-slate-500 font-bold">
                {currentStep} / 6
              </div>

              <button
                disabled={currentStep >= 6}
                onClick={() => {
                  audio.playKick(0.18);
                  setCurrentStep((p) => Math.min(6, p + 1));
                }}
                className="px-3 py-1.5 rounded bg-amber-400 disabled:opacity-30 text-slate-950 font-black text-xs shadow"
              >
                NEXT ▶
              </button>
            </div>

          </div>

          {/* ----------------------------------------------------------------------- */}
          {/* RIGHT COLUMN: WYSIWYG CANVAS 2D REAL-TIME MATCHDAY PREVIEW (Cols 6-12)  */}
          {/* ----------------------------------------------------------------------- */}
          <div className="md:col-span-7 h-full relative overflow-hidden bg-black select-none">
            
            {/* The Real-Time Procedural Matchday Canvas */}
            <canvas
              ref={canvasRef}
              className="w-full h-full block cursor-grab active:cursor-grabbing"
              onMouseDown={(e) => {
                manualPanRef.current.isDragging = true;
                manualPanRef.current.lastX = e.clientX;
                manualPanRef.current.lastY = e.clientY;
              }}
              onMouseMove={(e) => {
                if (manualPanRef.current.isDragging) {
                  const dx = e.clientX - manualPanRef.current.lastX;
                  const dy = e.clientY - manualPanRef.current.lastY;
                  manualPanRef.current.lastX = e.clientX;
                  manualPanRef.current.lastY = e.clientY;
                  manualPanRef.current.x += dx;
                  manualPanRef.current.y += dy;
                }
              }}
              onMouseUp={() => {
                manualPanRef.current.isDragging = false;
              }}
              onMouseLeave={() => {
                manualPanRef.current.isDragging = false;
              }}
              onTouchStart={(e) => {
                if (e.touches[0]) {
                  manualPanRef.current.isDragging = true;
                  manualPanRef.current.lastX = e.touches[0].clientX;
                  manualPanRef.current.lastY = e.touches[0].clientY;
                }
              }}
              onTouchMove={(e) => {
                if (manualPanRef.current.isDragging && e.touches[0]) {
                  const dx = e.touches[0].clientX - manualPanRef.current.lastX;
                  const dy = e.touches[0].clientY - manualPanRef.current.lastY;
                  manualPanRef.current.lastX = e.touches[0].clientX;
                  manualPanRef.current.lastY = e.touches[0].clientY;
                  manualPanRef.current.x += dx;
                  manualPanRef.current.y += dy;
                }
              }}
              onTouchEnd={() => {
                manualPanRef.current.isDragging = false;
              }}
              onWheel={(e) => {
                e.preventDefault();
                const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
                cameraStateRef.current.zoom = Math.max(0.2, Math.min(2.5, cameraStateRef.current.zoom * zoomFactor));
              }}
            />

            {/* Top-Left Floating WYSIWYG Badge */}
            <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none z-10">
              <div className="px-2 py-1 rounded bg-black/80 backdrop-blur border border-slate-700 text-[10px] font-mono font-bold text-slate-300 flex items-center gap-1.5 shadow-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>60 FPS WYSIWYG PREVIEW</span>
              </div>
            </div>

            {/* Top-Right Manual Pan Reset Button */}
            <button
              onClick={() => {
                audio.playKick(0.18);
                manualPanRef.current.x = 0;
                manualPanRef.current.y = 0;
              }}
              title="Reset View Centering"
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[9px] font-mono flex items-center gap-1 shadow-md z-10"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RESET PAN</span>
            </button>

            {/* ===================================================================== */}
            {/* PERSISTENT BOTTOM-LEFT 32-BIT HUD BOX (Section 14.3)                  */}
            {/* Qualification & Capacity HUD Box                                      */}
            {/* ===================================================================== */}
            <div className="absolute bottom-3 left-3 pointer-events-auto z-20">
              <div className="p-3 rounded-xl border-2 border-slate-700 bg-gradient-to-b from-slate-900/95 via-slate-950/95 to-black/95 backdrop-blur-md shadow-2xl text-[10px] font-mono min-w-[210px] space-y-2">
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                    <Trophy className="w-3 h-3 text-amber-400" />
                    FIFA HUD
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 text-[8px] font-black uppercase">
                    OFFICIAL
                  </span>
                </div>

                {/* FIFA Category */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">QUALIFICATION:</span>
                  <span className={`px-2 py-0.5 rounded font-black uppercase text-[10px] tracking-wider border shadow-sm ${
                    currentFifa === 'world'
                      ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-amber-400/30'
                      : currentFifa === 'continental'
                      ? 'bg-cyan-500 text-slate-950 border-cyan-300'
                      : currentFifa === 'first_division'
                      ? 'bg-indigo-600 text-white border-indigo-400'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}>
                    {currentFifa.replace('_', ' ')}
                  </span>
                </div>

                {/* Numerical Capacity Meter */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">TOTAL CAPACITY:</span>
                  <span className="text-amber-300 font-bold text-sm tracking-wider">
                    {totalCapacity.toLocaleString()}
                  </span>
                </div>

                {/* Mini Stand Contributions Breakdown */}
                <div className="pt-1 border-t border-slate-800/80 grid grid-cols-4 gap-1 text-[8px] text-center text-slate-400">
                  <div className="p-1 rounded bg-slate-900 border border-slate-800">
                    <div className="text-[7px] text-slate-500">EAST</div>
                    <div className="font-bold text-slate-200">
                      {(stadium.stands.east?.type === 'none' ? 0 : calculateStadiumTotalCapacity({ east: stadium.stands.east } as any, stadium.shape)).toLocaleString()}
                    </div>
                  </div>
                  <div className="p-1 rounded bg-slate-900 border border-slate-800">
                    <div className="text-[7px] text-slate-500">WEST</div>
                    <div className="font-bold text-slate-200">
                      {(stadium.stands.west?.type === 'none' ? 0 : calculateStadiumTotalCapacity({ west: stadium.stands.west } as any, stadium.shape)).toLocaleString()}
                    </div>
                  </div>
                  <div className="p-1 rounded bg-slate-900 border border-slate-800">
                    <div className="text-[7px] text-slate-500">NORTH</div>
                    <div className="font-bold text-slate-200">
                      {(stadium.stands.north?.type === 'none' ? 0 : calculateStadiumTotalCapacity({ north: stadium.stands.north } as any, stadium.shape)).toLocaleString()}
                    </div>
                  </div>
                  <div className="p-1 rounded bg-slate-900 border border-slate-800">
                    <div className="text-[7px] text-slate-500">SOUTH</div>
                    <div className="font-bold text-slate-200">
                      {(stadium.stands.south?.type === 'none' ? 0 : calculateStadiumTotalCapacity({ south: stadium.stands.south } as any, stadium.shape)).toLocaleString()}
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
