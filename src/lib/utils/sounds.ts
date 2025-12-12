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

    // Envelope for smooth sound with longer fade out
    const now = ctx.currentTime;
    gainNode.gain.setValueAtTime(0, now + startTime);
    gainNode.gain.linearRampToValueAtTime(volume, now + startTime + 0.05);
    // Longer, smoother fade out - starts fading halfway through
    gainNode.gain.linearRampToValueAtTime(volume, now + startTime + duration * 0.5);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + startTime + duration);

    oscillator.start(now + startTime);
    oscillator.stop(now + startTime + duration);
  } catch (error) {
    // Silently fail if audio context is not available
    console.debug('Audio playback not available:', error);
  }
}

/**
 * Play login chime - ascending pleasant tones (similar to Mac startup)
 */
export function playLoginChime(): void {
  try {
    const ctx = getAudioContext();
    
    // Resume audio context if suspended (required by some browsers)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // Play a pleasant ascending chord
    const now = ctx.currentTime;
    
    // Main ascending tone (C major chord progression) - longer duration, reduced volume
    playTone(523.25, 0.8, 0.0625, 'sine', 0); // C5
    playTone(659.25, 0.8, 0.05, 'sine', 0.05); // E5
    playTone(783.99, 0.8, 0.0375, 'sine', 0.1); // G5
    
    // Higher octave for sparkle
    playTone(1046.50, 0.6, 0.025, 'sine', 0.15); // C6
  } catch (error) {
    console.debug('Login chime playback failed:', error);
  }
}

/**
 * Play logout chime - descending softer tones
 */
export function playLogoutChime(): void {
  try {
    const ctx = getAudioContext();
    
    // Resume audio context if suspended
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // Play a gentle descending tone
    const now = ctx.currentTime;
    
    // Descending chord - longer duration, reduced volume
    playTone(783.99, 0.7, 0.05, 'sine', 0); // G5
    playTone(659.25, 0.7, 0.0375, 'sine', 0.05); // E5
    playTone(523.25, 0.7, 0.025, 'sine', 0.1); // C5
  } catch (error) {
    console.debug('Logout chime playback failed:', error);
  }
}

