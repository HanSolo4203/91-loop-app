import type confetti from 'canvas-confetti';

let confettiModule: { default: typeof confetti } | null = null;

async function getConfetti(): Promise<typeof confetti> {
  if (!confettiModule) {
    confettiModule = await import('canvas-confetti');
  }
  return confettiModule.default;
}

export async function fireClockInConfetti(): Promise<void> {
  try {
    const confetti = await getConfetti();

    // First burst — center explosion
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { x: 0.5, y: 0.55 },
      colors: ['#10b981', '#34d399', '#6ee7b7', '#fbbf24', '#f59e0b', '#ffffff', '#a78bfa'],
      startVelocity: 45,
      gravity: 0.9,
      scalar: 1.1,
      ticks: 200,
    });

    // Slight delay then left and right cannons
    await new Promise(resolve => setTimeout(resolve, 150));

    confetti({
      particleCount: 60,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors: ['#10b981', '#fbbf24', '#ffffff', '#a78bfa'],
      startVelocity: 50,
      gravity: 0.85,
      scalar: 1.0,
      ticks: 180,
    });

    confetti({
      particleCount: 60,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors: ['#10b981', '#fbbf24', '#ffffff', '#a78bfa'],
      startVelocity: 50,
      gravity: 0.85,
      scalar: 1.0,
      ticks: 180,
    });
  } catch (error) {
    console.debug('Confetti failed:', error);
  }
}
