/**
 * Sound effects utility for login/logout chimes
 * Generates Apple Mac-like sound effects using Web Audio API
 */

// Audio context singleton
let audioContext: AudioContext | null = null;

/**
 * Get or create the audio context
 */
function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

/**
 * Play a tone with specified frequency, duration, and volume
 */
function playTone(
  frequency: number,
  duration: number,
  volume: number = 0.3,
  type: OscillatorType = 'sine',
  startTime: number = 0
): void {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = type;
    oscillator.frequency.value = frequency;

    // Envelope for smooth sound — attack scales with duration so short notes still speak
    const now = ctx.currentTime;
    const attack = Math.min(0.05, duration * 0.25);
    const holdEnd = Math.max(attack + 0.01, duration * 0.55);
    gainNode.gain.setValueAtTime(0, now + startTime);
    gainNode.gain.linearRampToValueAtTime(volume, now + startTime + attack);
    gainNode.gain.linearRampToValueAtTime(volume, now + startTime + holdEnd);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + startTime + duration);

    oscillator.start(now + startTime);
    oscillator.stop(now + startTime + duration);
  } catch (error) {
    // Silently fail if audio context is not available
    console.debug('Audio playback not available:', error);
  }
}

/**
 * Short white-noise burst for a crowd / party pop feel
 */
function playNoiseBurst(duration: number, volume: number, startTime: number): void {
  try {
    const ctx = getAudioContext();
    const sampleCount = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / sampleCount);
    }

    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gainNode = ctx.createGain();

    source.buffer = buffer;
    filter.type = 'bandpass';
    filter.frequency.value = 1800;
    filter.Q.value = 0.8;

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    const now = ctx.currentTime;
    gainNode.gain.setValueAtTime(0, now + startTime);
    gainNode.gain.linearRampToValueAtTime(volume, now + startTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + startTime + duration);

    source.start(now + startTime);
    source.stop(now + startTime + duration);
  } catch (error) {
    console.debug('Noise burst playback not available:', error);
  }
}

function resumeAndPlay(play: () => void): void {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    void ctx.resume().then(play).catch(() => play());
  } else {
    play();
  }
}

/**
 * Play login chime - ascending pleasant tones (similar to Mac startup)
 */
export function playLoginChime(): void {
  try {
    resumeAndPlay(() => {
      // Main ascending tone (C major chord progression) - longer duration, reduced volume
      playTone(523.25, 0.8, 0.0625, 'sine', 0); // C5
      playTone(659.25, 0.8, 0.05, 'sine', 0.05); // E5
      playTone(783.99, 0.8, 0.0375, 'sine', 0.1); // G5

      // Higher octave for sparkle
      playTone(1046.50, 0.6, 0.025, 'sine', 0.15); // C6
    });
  } catch (error) {
    console.debug('Login chime playback failed:', error);
  }
}

/**
 * Play logout chime - descending softer tones
 */
export function playLogoutChime(): void {
  try {
    resumeAndPlay(() => {
      // Descending chord - longer duration, reduced volume
      playTone(783.99, 0.7, 0.05, 'sine', 0); // G5
      playTone(659.25, 0.7, 0.0375, 'sine', 0.05); // E5
      playTone(523.25, 0.7, 0.025, 'sine', 0.1); // C5
    });
  } catch (error) {
    console.debug('Logout chime playback failed:', error);
  }
}

/**
 * Play clock-in cheer — loud ascending "yaaay" fanfare (distinct from login chime)
 */
export function playClockInCheer(): void {
  try {
    resumeAndPlay(() => {
      // Crowd / party pop noise under the fanfare
      playNoiseBurst(0.28, 0.12, 0.0);
      playNoiseBurst(0.22, 0.08, 0.35);

      // Punchy staccato climb — triangle/square so it doesn't sound like the soft login sine
      playTone(392.0, 0.1, 0.18, 'triangle', 0.0); // G4
      playTone(523.25, 0.1, 0.2, 'triangle', 0.09); // C5
      playTone(659.25, 0.11, 0.22, 'triangle', 0.18); // E5
      playTone(783.99, 0.12, 0.24, 'square', 0.28); // G5
      playTone(1046.5, 0.35, 0.2, 'triangle', 0.4); // C6 held
      playTone(1318.51, 0.4, 0.14, 'triangle', 0.48); // E6 sparkle
      playTone(1567.98, 0.45, 0.1, 'sine', 0.55); // G6 top cheer

      // Harmony chord under the held high notes
      playTone(523.25, 0.55, 0.08, 'sine', 0.4); // C5
      playTone(659.25, 0.55, 0.07, 'sine', 0.4); // E5
      playTone(783.99, 0.55, 0.06, 'sine', 0.4); // G5
    });
  } catch (error) {
    console.debug('Clock-in cheer playback failed:', error);
  }
}

