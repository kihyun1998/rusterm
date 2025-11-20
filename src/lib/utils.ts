import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { StoredConnectionProfile } from '@/types/connection';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Escape special characters for use in RegExp
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Generate a unique profile name by appending a number if needed
 *
 * @param baseName - The base name to make unique
 * @param existingProfiles - Array of existing profiles to check against
 * @returns Unique profile name (e.g., "Server", "Server (1)", "Server (2)")
 *
 * @example
 * getUniqueProfileName("Server", []) // "Server"
 * getUniqueProfileName("Server", [{name: "Server"}]) // "Server (1)"
 * getUniqueProfileName("Server", [{name: "Server"}, {name: "Server (1)"}]) // "Server (2)"
 * getUniqueProfileName("Server", [{name: "Server"}, {name: "Server (3)"}]) // "Server (4)"
 */
export function getUniqueProfileName(
  baseName: string,
  existingProfiles: StoredConnectionProfile[]
): string {
  // Build regex pattern: "baseName" or "baseName (number)"
  const escapedBase = escapeRegex(baseName);
  const regex = new RegExp(`^${escapedBase}(?: \\((\\d+)\\))?$`);

  // Find the maximum number among matching profiles
  let maxNumber = -1; // -1 = no matches, 0 = base name exists, 1+ = numbered versions exist

  existingProfiles.forEach((profile) => {
    const match = profile.name.match(regex);
    if (match) {
      // match[1] is the captured number, or undefined if it's just the base name
      const num = match[1] ? parseInt(match[1], 10) : 0;
      maxNumber = Math.max(maxNumber, num);
    }
  });

  // Return result based on maxNumber
  if (maxNumber === -1) {
    // No duplicates found
    return baseName;
  } else {
    // Duplicates found - return next number
    return `${baseName} (${maxNumber + 1})`;
  }
}
