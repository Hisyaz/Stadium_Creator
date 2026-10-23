import { CrowdLevel, StadiumTier } from '../types';

/**
 * Stadium Acoustic Profile Configuration
 */
export interface StadiumAcoustics {
  reverbDecay: number; // in seconds: monumental 1.4s, craven 0.35s, ascenso 0.65s
  reverbDelay: number; // in seconds
  highDamping: number; // Hz
  lowBoost: number; // dB
  isHollowEcho: boolean; // true for empty
  hasBomboDrums: boolean; // true for ascenso / south american
  chantStyle: 'hymn' | 'clap' | 'bombo';
}

/**
 * Real-time context for dynamic match atmosphere
 */
export interface MatchAtmosphereContext {
  crowdLevel: CrowdLevel;
  stadiumTier: StadiumTier;
  ballY: number;
  ballZ?: number;
  homeHasBall: boolean;
  dangerLevel: number; // 0.0 to 1.0 (closeness to either goal)
  scoreDelta: number; // homeScore - awayScore
  matchTimeSeconds: number;
  isPenalty?: boolean;
}

// Web Audio synthesizer for authentic 16-bit retro arcade soccer sound effects & living match atmosphere

class RetroAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private crowdNode: AudioNode | null = null;
  private crowdLevel: CrowdLevel = 'crowded';
  private stadiumTier: StadiumTier = 'monumental';

  // Continuous ambient atmosphere nodes
  private ambientNoiseNode: AudioBufferSourceNode | null = null;
  private ambientGainNode: GainNode | null = null;
  private ambientFilterNode: BiquadFilterNode | null = null;
  private isAmbientRunning: boolean = false;
  private lastChantTime: number = 0;
  private lastPlayerShoutTime: number = 0;
  private lastDrumBeatTime: number = 0;

  public setCrowdLevel(level: CrowdLevel) {
    this.crowdLevel = level;
    if (this.ambientGainNode && this.ctx) {
      const targetGain = this.getCrowdMultiplier() * 0.12;
      this.ambientGainNode.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.2);
    }
  }

  public getCrowdLevel(): CrowdLevel {
    return this.crowdLevel;
  }

  public setStadiumTier(tier: StadiumTier) {
    this.stadiumTier = tier;
  }

  public getStadiumTier(): StadiumTier {
    return this.stadiumTier;
  }

  public getCrowdMultiplier(): number {
    switch (this.crowdLevel) {
      case 'empty':
        return 0;
      case 'small':
        return 0.22;
      case 'few':
        return 0.45;
      case 'half':
        return 0.70;
      case 'crowded':
        return 1.0;
      case 'packet':
        return 1.35;
      default:
        return 1.0;
    }
  }

  /**
   * Resolves architectural acoustic properties based on stadium tier and attendance
   */
  public getStadiumAcousticParams(
    tier: StadiumTier = this.stadiumTier,
    level: CrowdLevel = this.crowdLevel
  ): StadiumAcoustics {
    const isHollow = level === 'empty';
    switch (tier) {
      case 'craven':
        return {
          reverbDecay: isHollow ? 0.75 : 0.35,
          reverbDelay: 0.035,
          highDamping: 2800,
          lowBoost: 1.0,
          isHollowEcho: isHollow,
          hasBomboDrums: false,
          chantStyle: 'clap',
        };
      case 'ascenso':
        return {
          reverbDecay: isHollow ? 0.95 : 0.65,
          reverbDelay: 0.055,
          highDamping: 2200,
          lowBoost: 4.5,
          isHollowEcho: isHollow,
          hasBomboDrums: true,
          chantStyle: 'bombo',
        };
      case 'monumental':
      default:
        return {
          reverbDecay: isHollow ? 1.6 : 1.35,
          reverbDelay: 0.08,
          highDamping: 1800,
          lowBoost: 3.0,
          isHollowEcho: isHollow,
          hasBomboDrums: false,
          chantStyle: 'hymn',
        };
    }
  }

  private initCtx() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.ambientGainNode && this.ctx) {
      const targetGain = this.isMuted ? 0 : this.getCrowdMultiplier() * 0.12;
      this.ambientGainNode.gain.setValueAtTime(targetGain, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Initializes the continuous procedural crowd murmur loop
   */
  private startAmbientCrowdLoop() {
    if (this.isAmbientRunning || !this.ctx || this.isMuted) return;

    try {
      const sampleRate = this.ctx.sampleRate;
      const bufferLength = sampleRate * 3; // 3-second seamless loop buffer
      const buffer = this.ctx.createBuffer(2, bufferLength, sampleRate);
      const chL = buffer.getChannelData(0);
      const chR = buffer.getChannelData(1);

      let b0L = 0, b1L = 0, b2L = 0;
      let b0R = 0, b1R = 0, b2R = 0;

      for (let i = 0; i < bufferLength; i++) {
        const whiteL = Math.random() * 2 - 1;
        const whiteR = Math.random() * 2 - 1;

        b0L = 0.99886 * b0L + whiteL * 0.0555179;
        b1L = 0.99332 * b1L + whiteL * 0.0750759;
        b2L = 0.96900 * b2L + whiteL * 0.1538520;
        chL[i] = (b0L + b1L + b2L + whiteL * 0.5362) * 0.18;

        b0R = 0.99886 * b0R + whiteR * 0.0555179;
        b1R = 0.99332 * b1R + whiteR * 0.0750759;
        b2R = 0.96900 * b2R + whiteR * 0.1538520;
        chR[i] = (b0R + b1R + b2R + whiteR * 0.5362) * 0.18;
      }

      this.ambientNoiseNode = this.ctx.createBufferSource();
      this.ambientNoiseNode.buffer = buffer;
      this.ambientNoiseNode.loop = true;

      this.ambientFilterNode = this.ctx.createBiquadFilter();
      this.ambientFilterNode.type = 'bandpass';
      this.ambientFilterNode.frequency.value = 650;
      this.ambientFilterNode.Q.value = 1.4;

      this.ambientGainNode = this.ctx.createGain();
      this.ambientGainNode.gain.value = this.getCrowdMultiplier() * 0.12;

      this.ambientNoiseNode.connect(this.ambientFilterNode);
      this.ambientFilterNode.connect(this.ambientGainNode);
      this.ambientGainNode.connect(this.ctx.destination);

      this.ambientNoiseNode.start(0);
      this.isAmbientRunning = true;
    } catch {
      this.isAmbientRunning = false;
    }
  }

  /**
   * Updates real-time ambient audio context (called from MatchEngine tick)
   */
  public updateAtmosphere(context: MatchAtmosphereContext) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    if (!this.isAmbientRunning) {
      this.startAmbientCrowdLoop();
    }

    const t = this.ctx.currentTime;
    const acoustics = this.getStadiumAcousticParams(context.stadiumTier, context.crowdLevel);
    const mult = this.getCrowdMultiplier();

    // 1. Modulate Ambient Crowd Murmur with Match Danger
    if (this.ambientGainNode && this.ambientFilterNode) {
      if (context.crowdLevel === 'empty') {
        this.ambientGainNode.gain.setTargetAtTime(0, t, 0.1);
      } else {
        const baseGain = mult * 0.10;
        const dangerBoost = context.dangerLevel * 0.09 * mult;
        const penaltyMultiplier = context.isPenalty ? 0.35 : 1.0;

        const targetGain = (baseGain + dangerBoost) * penaltyMultiplier;
        this.ambientGainNode.gain.setTargetAtTime(targetGain, t, 0.2);

        const targetFreq = 500 + context.dangerLevel * 600;
        this.ambientFilterNode.frequency.setTargetAtTime(targetFreq, t, 0.3);
      }
    }

    // 2. EMPTY STADIUM: Trigger periodic tactical shouts from players/coach
    if (context.crowdLevel === 'empty') {
      const now = Date.now();
      if (now - this.lastPlayerShoutTime > 4500 && Math.random() < 0.45) {
        this.lastPlayerShoutTime = now;
        const shoutTypes: Array<'man_on' | 'pass' | 'ref' | 'shoot'> = ['man_on', 'pass', 'ref', 'shoot'];
        const chosen = shoutTypes[Math.floor(Math.random() * shoutTypes.length)];
        this.playPlayerShout(chosen);
      }
    }

    // 3. SUSTAINED SUPPORTER CHANTS (Half, Crowded, Packet)
    if (context.crowdLevel === 'half' || context.crowdLevel === 'crowded' || context.crowdLevel === 'packet') {
      const now = Date.now();
      const chantInterval = context.crowdLevel === 'packet' ? 7000 : 12000;
      if (now - this.lastChantTime > chantInterval && Math.random() < 0.6) {
        this.lastChantTime = now;
        this.playProceduralChantSequence(acoustics.chantStyle, mult);
      }
    }

    // 4. ASCENSO TIER: Authentic Bombo Drum Rhythms
    if (acoustics.hasBomboDrums && (context.crowdLevel === 'crowded' || context.crowdLevel === 'packet')) {
      const now = Date.now();
      if (now - this.lastDrumBeatTime > 950) {
        this.lastDrumBeatTime = now;
        this.playBomboDrumBeat();
      }
    }
  }

  /**
   * Procedural vocal chant or supporter rhythm sequence
   */
  private playProceduralChantSequence(style: 'hymn' | 'clap' | 'bombo', mult: number) {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    if (style === 'clap') {
      const clapTimes = [0, 0.45, 0.90, 1.25, 1.55];
      clapTimes.forEach((delay) => {
        setTimeout(() => {
          this.playRhythmicClap(mult);
        }, delay * 1000);
      });
    } else {
      const notes = [220, 247, 262, 294, 262];
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const filter = this.ctx!.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + idx * 0.4);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(750, t + idx * 0.4);

        const vol = Math.min(0.18, 0.08 * mult);
        gain.gain.setValueAtTime(0.001, t + idx * 0.4);
        gain.gain.linearRampToValueAtTime(vol, t + idx * 0.4 + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.4 + 0.38);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(t + idx * 0.4);
        osc.stop(t + idx * 0.4 + 0.38);
      });
    }
  }

  /**
   * Rhythmic stadium supporter handclap
   */
  public playRhythmicClap(mult: number = 1.0) {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.08);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1400;
    filter.Q.value = 2.0;

    const gain = this.ctx.createGain();
    gain.gain.value = Math.min(0.22, 0.14 * mult);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
  }

  /**
   * Low South American Bombo drum hit with deep hollow resonance
   */
  public playBomboDrumBeat() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(95, t);
    osc.frequency.exponentialRampToValueAtTime(32, t + 0.24);

    const mult = this.getCrowdMultiplier();
    const vol = Math.min(0.35, 0.22 * mult);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.25);
  }

  /**
   * Audible pitch-level shouts from players and coaches in empty/low-attendance matches
   */
  public playPlayerShout(type: 'man_on' | 'pass' | 'ref' | 'shoot' = 'man_on') {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    filter.type = 'bandpass';
    filter.Q.value = 3.5;

    let baseFreq = 420;
    let endFreq = 260;
    let dur = 0.28;

    if (type === 'man_on') {
      baseFreq = 540;
      endFreq = 340;
      dur = 0.32;
    } else if (type === 'pass') {
      baseFreq = 480;
      endFreq = 380;
      dur = 0.22;
    } else if (type === 'ref') {
      baseFreq = 620;
      endFreq = 480;
      dur = 0.35;
    } else {
      baseFreq = 580;
      endFreq = 280;
      dur = 0.30;
    }

    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + dur);

    filter.frequency.setValueAtTime(baseFreq * 1.8, t);
    filter.frequency.exponentialRampToValueAtTime(endFreq * 1.4, t + dur);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.24, t + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + dur);

    if (this.crowdLevel === 'empty') {
      setTimeout(() => {
        if (!this.ctx || this.isMuted) return;
        const echoOsc = this.ctx.createOscillator();
        const echoGain = this.ctx.createGain();
        echoOsc.type = 'sawtooth';
        echoOsc.frequency.setValueAtTime(baseFreq * 0.9, this.ctx.currentTime);
        echoGain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        echoGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur * 0.8);
        echoOsc.connect(echoGain);
        echoGain.connect(this.ctx.destination);
        echoOsc.start(this.ctx.currentTime);
        echoOsc.stop(this.ctx.currentTime + dur * 0.8);
      }, 75);
    }
  }

  /**
   * Classic referee whistle tweet
   */
  public playWhistle(long: boolean = false) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(2600, t);
    osc.frequency.exponentialRampToValueAtTime(3200, t + 0.04);
    osc.frequency.setValueAtTime(2900, t + 0.08);

    const dur = long ? 0.38 : 0.14;
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
    gain.gain.setValueAtTime(0.18, t + dur - 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + dur);

    if (long) {
      // Second tweet for kickoff or goal
      setTimeout(() => {
        if (!this.ctx || this.isMuted) return;
        const t2 = this.ctx.currentTime;
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(3000, t2);
        gain2.gain.setValueAtTime(0.2, t2);
        gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.28);
        osc2.connect(gain2);
        gain2.connect(this.ctx.destination);
        osc2.start(t2);
        osc2.stop(t2 + 0.28);
      }, 180);
    }
  }

  /**
   * Punchy ball kick / pass sound with concrete echo slapback in empty stadium
   */
  public playKick(power: number = 0.5) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const startFreq = 180 + power * 120;
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.09);

    const vol = Math.min(0.35, 0.12 + power * 0.2);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.09);

    // Empty stadium slapback concrete terrace echo
    if (this.crowdLevel === 'empty' && power > 0.45) {
      setTimeout(() => {
        if (!this.ctx || this.isMuted) return;
        const echoOsc = this.ctx.createOscillator();
        const echoGain = this.ctx.createGain();
        echoOsc.type = 'sine';
        echoOsc.frequency.setValueAtTime(startFreq * 0.8, this.ctx.currentTime);
        echoOsc.frequency.exponentialRampToValueAtTime(35, this.ctx.currentTime + 0.08);
        echoGain.gain.setValueAtTime(vol * 0.35, this.ctx.currentTime);
        echoGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
        echoOsc.connect(echoGain);
        echoGain.connect(this.ctx.destination);
        echoOsc.start(this.ctx.currentTime);
        echoOsc.stop(this.ctx.currentTime + 0.08);
      }, 65);
    }
  }

  /**
   * Turf slide tackle rustle sound
   */
  public playSlide() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 900;
    filter.Q.value = 1.2;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.15;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start();
  }

  /**
   * Dynamic crowd cheer when goal is scored (scaled by crowdLevel)
   */
  public playGoalCheer(scoringTeam: 'home' | 'away' = 'home', isLateMinute: boolean = false) {
    this.playGoalCelebration(scoringTeam, isLateMinute, this.stadiumTier);
  }

  /**
   * Collective stadium gasp ("OHHHHH!") when a shot narrowly misses or hits the woodwork
   */
  public playNearMissGasp(tier: StadiumTier = this.stadiumTier) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const mult = this.getCrowdMultiplier();
    if (mult <= 0.01) return; // Silent in empty stadium

    const t = this.ctx.currentTime;
    const dur = 1.1;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(320, t);
    filter.frequency.linearRampToValueAtTime(680, t + 0.35);
    filter.frequency.exponentialRampToValueAtTime(280, t + dur);
    filter.Q.value = 2.4;

    const gain = this.ctx.createGain();
    const peakVol = Math.min(0.48, 0.32 * mult);
    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(peakVol, t + 0.22);
    gain.gain.setValueAtTime(peakVol * 0.85, t + 0.55);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
  }

  /**
   * Surging home crowd cheer on attacking transitions or winning corners
   */
  public playHomeCrowdCheer(intensity: number = 0.5, tier: StadiumTier = this.stadiumTier) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const mult = this.getCrowdMultiplier();
    if (mult <= 0.01) return;

    const t = this.ctx.currentTime;
    const dur = 1.4;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(550, t);
    filter.frequency.linearRampToValueAtTime(1100, t + 0.4);
    filter.frequency.exponentialRampToValueAtTime(600, t + dur);

    const gain = this.ctx.createGain();
    const vol = Math.min(0.42, (0.18 + intensity * 0.2) * mult);
    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.25);
    gain.gain.setValueAtTime(vol * 0.9, t + 0.7);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
  }

  /**
   * Hostile crowd booing and piercing whistles when away team commits a bad foul or scores
   */
  public playAwayBooing(intensity: number = 0.7) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const mult = this.getCrowdMultiplier();
    if (mult <= 0.01) return;

    const t = this.ctx.currentTime;
    const dur = 1.8;

    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(240, t);
    filter.frequency.exponentialRampToValueAtTime(180, t + dur);
    filter.Q.value = 3.5;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.32 * mult, t + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(t);

    const whistleFreqs = [2800, 3150, 3400];
    whistleFreqs.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const wGain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.12);

      wGain.gain.setValueAtTime(0.001, t + idx * 0.12);
      wGain.gain.linearRampToValueAtTime(0.12 * mult, t + idx * 0.12 + 0.05);
      wGain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.12 + 0.6);

      osc.connect(wGain);
      wGain.connect(this.ctx!.destination);
      osc.start(t + idx * 0.12);
      osc.stop(t + idx * 0.12 + 0.6);
    });
  }

  /**
   * Complete goal celebration with differentiation between Home and Away team scores
   */
  public playGoalCelebration(
    scoringTeam: 'home' | 'away' = 'home',
    isLateMinute: boolean = false,
    stadiumTier: StadiumTier = this.stadiumTier
  ) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const mult = this.getCrowdMultiplier();
    if (mult <= 0.01) {
      this.playPlayerShout('shoot');
      return;
    }

    if (scoringTeam === 'home') {
      if (this.crowdLevel === 'crowded' || this.crowdLevel === 'packet') {
        this.playHorn();
      }

      const dur = isLateMinute ? 3.2 : this.crowdLevel === 'packet' ? 2.6 : 2.0;
      const t = this.ctx.currentTime;
      const bufferSize = Math.floor(this.ctx.sampleRate * dur);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(650, t);
      filter.frequency.linearRampToValueAtTime(1550, t + 0.4);
      filter.frequency.linearRampToValueAtTime(750, t + dur);

      const gain = this.ctx.createGain();
      const peakVol = Math.min(0.52, (isLateMinute ? 0.38 : 0.30) * mult);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(peakVol, t + 0.2);
      gain.gain.setValueAtTime(peakVol * 0.9, t + dur * 0.7);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(t);

      if (this.crowdLevel === 'packet' || this.crowdLevel === 'crowded') {
        this.playFlareHiss();
      }
    } else {
      this.playNearMissGasp();
      setTimeout(() => {
        this.playAwayBooing(0.8);
      }, 350);
    }
  }

  /**
   * Sizzling hiss sound of Ultras smoke flare
   */
  public playFlareHiss() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const dur = 1.6;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.3;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(3200, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.12, t + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(t);
  }

  /**
   * Classic European stadium horn
   */
  public playHorn() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const freqs = [350, 440];
    freqs.forEach(freq => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(t);
      osc.stop(t + 0.6);
    });
  }

  /**
   * Foul impact / collision sound
   */
  public playFoul() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.12);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.12);
  }

  /**
   * Special Q-curve whoosh sound (resonant sweeping pitch)
   */
  public playSpecialCurveKick() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(420, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.22);

    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);

    // Add stereo shimmer
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.24);
  }

  /**
   * Heavy cannon explosion kick for overpowered shots/passes
   */
  public playOverpoweredKick() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Low sub punch
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(25, t + 0.35);

    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.35);
  }

  /**
   * Crowd gasp when ball is blasted into stands
   */
  public playCrowdGasp() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(500, t);
    filter.frequency.exponentialRampToValueAtTime(1200, t + 0.3);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
  }

  /**
   * Enthusiastic crowd roar / cheer when a player executes a nutmeg or brilliant trick
   */
  public playNutmegCheer() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const dur = 1.2;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(650, t);
    filter.frequency.exponentialRampToValueAtTime(1400, t + 0.35);
    filter.frequency.exponentialRampToValueAtTime(800, t + dur);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.35, t + 0.12);
    gain.gain.setValueAtTime(0.32, t + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
  }

  /**
   * Heavy dry pop / knuckle strike impact
   */
  public playKnuckleStrike(power: number = 0.7) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320 + power * 80, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.18);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.18);
  }

  /**
   * Delicate acoustic scoop / dink kick sound for Chip Shots, Chipped Crosses, and Chipped Passes
   */
  public playChipScoop(power: number = 0.5) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const baseFreq = 220 + power * 90;
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(420, t + 0.04);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.12);

    const vol = Math.min(0.28, 0.14 + power * 0.15);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.12);
  }

  /**
   * Subtle shoe swish / feint for step-over
   */
  public playStepOver() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(450, t);
    osc.frequency.exponentialRampToValueAtTime(160, t + 0.08);

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.08);
  }

  /**
   * Play rainbow flick whoosh & pop
   */
  public playRainbowFlick() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.22);

    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.25);
  }

  /**
   * Play Cruyff turn fake & chop sound
   */
  public playCruyffTurn() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(360, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.14);

    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.15);
  }

  /**
   * Play shoulder hit impact
   */
  public playShoulderHit() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.18);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.2);
  }

  /**
   * Play shirt pull tug / stretch sound
   */
  public playShirtPull() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.linearRampToValueAtTime(260, t + 0.12);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.14);
  }

  /**
   * Play autopass knock-on launch
   */
  public playAutopassLaunch() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(700, t + 0.12);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.14);
  }

  /**
   * Play Ginga ball lift scoop / juggle bounce
   */
  public playGingaLift() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(680, t + 0.15);

    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.18);
  }

  /**
   * Play thunderous mid-air volley connection strike
   */
  public playVolleyStrike(power: number = 0.8) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Sharp, punchy pop with crack resonance
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420 + power * 150, t);
    osc.frequency.exponentialRampToValueAtTime(65, t + 0.18);

    gain.gain.setValueAtTime(0.45 + power * 0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.22);
  }

  /**
   * Play spectacular acrobatic strike (Bicycle / Scissor / Scorpion kick)
   */
  public playAcrobaticStrike() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    
    // Swoosh layer
    const swooshOsc = this.ctx.createOscillator();
    const swooshGain = this.ctx.createGain();
    swooshOsc.type = 'sawtooth';
    swooshOsc.frequency.setValueAtTime(220, t);
    swooshOsc.frequency.exponentialRampToValueAtTime(880, t + 0.1);
    swooshOsc.frequency.exponentialRampToValueAtTime(140, t + 0.25);
    swooshGain.gain.setValueAtTime(0.25, t);
    swooshGain.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
    swooshOsc.connect(swooshGain);
    swooshGain.connect(this.ctx.destination);
    swooshOsc.start(t);
    swooshOsc.stop(t + 0.26);

    // Boom layer
    const boomOsc = this.ctx.createOscillator();
    const boomGain = this.ctx.createGain();
    boomOsc.type = 'triangle';
    boomOsc.frequency.setValueAtTime(240, t + 0.05);
    boomOsc.frequency.exponentialRampToValueAtTime(40, t + 0.3);
    boomGain.gain.setValueAtTime(0.5, t + 0.05);
    boomGain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
    boomOsc.connect(boomGain);
    boomGain.connect(this.ctx.destination);
    boomOsc.start(t + 0.05);
    boomOsc.stop(t + 0.32);
  }

  /**
   * Play rustic defender clearance boot
   */
  public playRusticClearance() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.2);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.22);
  }

  /**
   * Play mistimed volley whiff / scuff
   */
  public playVolleyMiss() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.linearRampToValueAtTime(80, t + 0.16);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.18);
  }

  /**
   * Play Sombrero cheer and whoosh over defender
   */
  public playSombreroCheer() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(340, t);
    osc.frequency.exponentialRampToValueAtTime(780, t + 0.18);
    osc.frequency.exponentialRampToValueAtTime(420, t + 0.35);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.36);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.36);
  }

  /**
   * Loud metallic clang/ping when ball strikes goal post or crossbar
   */
  public playPostHit() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Metallic chime oscillator
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1420, t);
    osc1.frequency.exponentialRampToValueAtTime(1180, t + 0.35);

    gain1.gain.setValueAtTime(0.45, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    osc1.start(t);
    osc1.stop(t + 0.38);

    // Deep hollow steel pipe resonance
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(320, t);
    osc2.frequency.exponentialRampToValueAtTime(180, t + 0.28);

    gain2.gain.setValueAtTime(0.5, t);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);
    osc2.start(t);
    osc2.stop(t + 0.3);
  }

  /**
   * Resonant tactile swish/rustle when ball hits and bulges the nylon goal net
   */
  public playNetSwish() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.38);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const envelope = Math.sin((i / bufferSize) * Math.PI) * Math.exp(-i / (bufferSize * 0.45));
      data[i] = (Math.random() * 2 - 1) * envelope;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1600, t);
    filter.frequency.exponentialRampToValueAtTime(800, t + 0.35);
    filter.Q.value = 1.8;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
  }

  /**
   * Phase 6: Distinct acoustic sonic crack shockwave for Thunderbolt Cannon (LSH > 99)
   */
  public playSonicCrack() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // High frequency sonic whip/pop
    const oscHigh = this.ctx.createOscillator();
    const gainHigh = this.ctx.createGain();
    oscHigh.type = 'sawtooth';
    oscHigh.frequency.setValueAtTime(3800, t);
    oscHigh.frequency.exponentialRampToValueAtTime(320, t + 0.08);

    gainHigh.gain.setValueAtTime(0.7, t);
    gainHigh.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    oscHigh.connect(gainHigh);
    gainHigh.connect(this.ctx.destination);
    oscHigh.start(t);
    oscHigh.stop(t + 0.12);

    // Deep sub-bass explosive detonation
    const oscSub = this.ctx.createOscillator();
    const gainSub = this.ctx.createGain();
    oscSub.type = 'sine';
    oscSub.frequency.setValueAtTime(140, t);
    oscSub.frequency.exponentialRampToValueAtTime(28, t + 0.35);

    gainSub.gain.setValueAtTime(0.8, t);
    gainSub.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    oscSub.connect(gainSub);
    gainSub.connect(this.ctx.destination);
    oscSub.start(t);
    oscSub.stop(t + 0.4);
  }

  /**
   * Phase 6: Crystalline celestial chime when a ⚡ Stat Break trait activates
   */
  public playStatBreakChime() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [1046.5, 1318.5, 1567.98, 2093.0]; // C6, E6, G6, C7 arpeggio
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.04);

      gain.gain.setValueAtTime(0.001, t + idx * 0.04);
      gain.gain.linearRampToValueAtTime(0.18, t + idx * 0.04 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.04 + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(t + idx * 0.04);
      osc.stop(t + idx * 0.04 + 0.3);
    });
  }
}

export const audio = new RetroAudioEngine();
