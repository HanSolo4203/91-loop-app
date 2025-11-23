/**
 * Utility functions for image optimization
 */

/**
 * Generates a blur placeholder data URL for images
 * This is a simple 1x1 pixel transparent PNG with blur effect
 * For better results, use actual image blur generation
 */
export const BLUR_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

/**
 * Common image sizes for different use cases
 */
export const IMAGE_SIZES = {
  logo: {
    width: 2364,
    height: 297,
    aspectRatio: 2364 / 297,
  },
  logoSmall: {
    width: 400,
    height: 120,
    aspectRatio: 400 / 120,
  },
  thumbnail: {
    width: 128,
    height: 128,
    aspectRatio: 1,
  },
} as const;

/**
 * Get responsive sizes string for Next.js Image component
 */
export function getImageSizes(breakpoints: {
  mobile?: string;
  tablet?: string;
  desktop?: string;
  default: string;
}): string {
  const parts: string[] = [];
  if (breakpoints.mobile) {
    parts.push(`(max-width: 640px) ${breakpoints.mobile}`);
  }
  if (breakpoints.tablet) {
    parts.push(`(max-width: 1024px) ${breakpoints.tablet}`);
  }
  parts.push(breakpoints.default);
  return parts.join(', ');
}

