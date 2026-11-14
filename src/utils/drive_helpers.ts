/**
 * Pure helper utilities for Google Drive integration in LiquidOS.
 */

export type DriveFileCategory = 'gguf' | 'vault' | 'document' | 'folder' | 'binary' | 'other';

/**
 * Formats byte count into human-readable file size string.
 */
export function formatDriveFileSize(bytes?: string | number | null): string {
  if (bytes === undefined || bytes === null || bytes === '') return '—';
  const num = typeof bytes === 'string' ? Number(bytes) : bytes;
  if (!Number.isFinite(num) || num < 0) return '—';
  if (num === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const idx = Math.min(units.length - 1, Math.floor(Math.log(num) / Math.log(1024)));
  const val = num / Math.pow(1024, idx);
  return `${idx === 0 ? val : val.toFixed(val >= 100 ? 0 : 1)} ${units[idx]}`;
}

/**
 * Classifies a Google Drive file by filename and MIME type for badge rendering.
 */
export function classifyDriveFile(name: string, mimeType: string): DriveFileCategory {
  const lowerName = name.toLowerCase();
  if (mimeType === 'application/vnd.google-apps.folder') return 'folder';
  if (lowerName.endsWith('.gguf')) return 'gguf';
  if (lowerName.endsWith('.a2d') || lowerName.endsWith('.enc') || lowerName.includes('vault')) {
    return 'vault';
  }
  if (
    mimeType.startsWith('text/') ||
    mimeType === 'application/json' ||
    mimeType === 'application/vnd.google-apps.document' ||
    lowerName.endsWith('.md') ||
    lowerName.endsWith('.txt') ||
    lowerName.endsWith('.log') ||
    lowerName.endsWith('.dart')
  ) {
    return 'document';
  }
  if (
    lowerName.endsWith('.so') ||
    lowerName.endsWith('.elf') ||
    lowerName.endsWith('.bin') ||
    mimeType === 'application/octet-stream'
  ) {
    return 'binary';
  }
  return 'other';
}

/**
 * Builds a safe Google Drive API `q` search query filtering out trashed files.
 */
export function buildDriveSearchQuery(searchTerm?: string, categoryFilter?: DriveFileCategory | 'all'): string {
  const clauses: string[] = ['trashed = false'];

  if (searchTerm && searchTerm.trim().length > 0) {
    const escaped = searchTerm.trim().replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    clauses.push(`name contains '${escaped}'`);
  }

  if (categoryFilter === 'folder') {
    clauses.push(`mimeType = 'application/vnd.google-apps.folder'`);
  } else if (categoryFilter === 'gguf') {
    clauses.push(`name contains '.gguf'`);
  } else if (categoryFilter === 'document') {
    clauses.push(
      `(mimeType contains 'text/' or mimeType = 'application/json' or mimeType = 'application/vnd.google-apps.document')`
    );
  }

  return clauses.join(' and ');
}

/**
 * Validates and sanitizes an upload filename before posting to Drive.
 */
export function validateUploadInput(filename: string, content: string): { valid: boolean; error?: string; sanitizedName: string } {
  const trimmedName = filename.trim();
  if (!trimmedName) {
    return { valid: false, error: 'Filename is required.', sanitizedName: '' };
  }
  if (trimmedName.length > 180) {
    return { valid: false, error: 'Filename must be 180 characters or fewer.', sanitizedName: trimmedName };
  }
  if (!content.trim()) {
    return { valid: false, error: 'File content cannot be empty.', sanitizedName: trimmedName };
  }
  const sanitizedName = trimmedName.replace(/[/\\<>:"|?*]/g, '_');
  return { valid: true, sanitizedName };
}
