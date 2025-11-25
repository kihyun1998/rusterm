/**
 * Format utilities for file sizes and dates
 */

/**
 * Format file size in bytes to human-readable format
 *
 * - Minimum unit: KB
 * - Files smaller than 1KB are shown as "0 KB"
 * - KB values are rounded to nearest integer
 * - MB values show 1 decimal place
 * - GB values show 2 decimal places
 *
 * @param bytes - File size in bytes
 * @returns Formatted file size string
 *
 * @example
 * formatFileSize(512)       // "0 KB"
 * formatFileSize(1024)      // "1 KB"
 * formatFileSize(1536)      // "2 KB"  (rounded)
 * formatFileSize(1048576)   // "1.0 MB"
 * formatFileSize(1073741824) // "1.00 GB"
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return '0 KB';

  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;

  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;

  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

/**
 * Format timestamp to Korean date format
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date string in Korean format, or "-" if timestamp is 0
 *
 * @example
 * formatDate(0)             // "-"
 * formatDate(1705305600000) // "2025년 01월 15일"
 * formatDate(Date.now())    // "2025년 01월 25일"
 */
export function formatDate(timestamp: number): string {
  // Return "-" for special items like ".." parent directory
  if (timestamp === 0) return '-';

  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}년 ${month}월 ${day}일`;
}

/**
 * Format transfer speed in bytes/sec to human-readable format
 *
 * - Shows appropriate unit (KB/s, MB/s, GB/s)
 * - 1 decimal place for all units
 *
 * @param bytesPerSec - Transfer speed in bytes per second
 * @returns Formatted speed string
 *
 * @example
 * formatTransferSpeed(0)         // "0 KB/s"
 * formatTransferSpeed(512)       // "0.5 KB/s"
 * formatTransferSpeed(102400)    // "100.0 KB/s"
 * formatTransferSpeed(1572864)   // "1.5 MB/s"
 * formatTransferSpeed(1073741824) // "1.0 GB/s"
 */
export function formatTransferSpeed(bytesPerSec: number): string {
  if (bytesPerSec === 0) return '0 KB/s';

  const kb = bytesPerSec / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB/s`;

  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB/s`;

  const gb = mb / 1024;
  return `${gb.toFixed(1)} GB/s`;
}
