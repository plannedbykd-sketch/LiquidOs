import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDriveFileSize,
  classifyDriveFile,
  buildDriveSearchQuery,
  validateUploadInput,
} from './drive_helpers';

describe('Google Drive Helpers Unit Tests', () => {
  it('formats byte sizes cleanly across units', () => {
    assert.equal(formatDriveFileSize(undefined), '—');
    assert.equal(formatDriveFileSize(0), '0 B');
    assert.equal(formatDriveFileSize(512), '512 B');
    assert.equal(formatDriveFileSize('2048'), '2.0 KB');
    assert.equal(formatDriveFileSize(2147483648), '2.0 GB');
  });

  it('classifies Drive files into LiquidOS categories accurately', () => {
    assert.equal(classifyDriveFile('Llama-3.2-3B.Q4_K_M.gguf', 'application/octet-stream'), 'gguf');
    assert.equal(classifyDriveFile('enclave_audit.a2d', 'application/json'), 'vault');
    assert.equal(classifyDriveFile('ghidra_report.md', 'text/markdown'), 'document');
    assert.equal(classifyDriveFile('libflutter.so', 'application/octet-stream'), 'binary');
    assert.equal(classifyDriveFile('Models', 'application/vnd.google-apps.folder'), 'folder');
  });

  it('builds escaped Google Drive search queries', () => {
    assert.equal(buildDriveSearchQuery(), 'trashed = false');
    assert.equal(
      buildDriveSearchQuery("test'file", 'gguf'),
      "trashed = false and name contains 'test\\'file' and name contains '.gguf'"
    );
  });

  it('validates and sanitizes upload inputs', () => {
    assert.equal(validateUploadInput('', 'hello').valid, false);
    assert.equal(validateUploadInput('report.txt', '   ').valid, false);
    const ok = validateUploadInput('dir/unsafe:name?.md', 'A2D sealed content');
    assert.equal(ok.valid, true);
    assert.equal(ok.sanitizedName, 'dir_unsafe_name_.md');
  });
});
