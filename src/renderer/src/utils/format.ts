/**
 * Format bytes into human readable string (GB, MB, KB)
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Format speed in bytes per second
 */
export function formatSpeed(bytesPerSec: number): string {
  return `${formatBytes(bytesPerSec, 1)}/s`;
}

/**
 * Format seconds into mm:ss or hh:mm:ss
 */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}h ${mins.toString().padStart(2, '0')}m`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format compression ratio e.g. 1.45x or 45% saved
 */
export function formatSavingsPercent(uncompressed: number, compressed: number): string {
  if (!uncompressed || uncompressed <= 0 || compressed >= uncompressed) return '0%';
  const percent = ((uncompressed - compressed) / uncompressed) * 100;
  return `${percent.toFixed(1)}%`;
}
