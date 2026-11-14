/**
 * Google Drive Workspace Service
 * Executes client-side REST API calls against https://www.googleapis.com/drive/v3
 * using the in-memory OAuth access token from google_workspace_auth.ts.
 */

import { buildDriveSearchQuery, DriveFileCategory } from '../utils/drive_helpers';

export {
  DRIVE_SCOPES,
  initWorkspaceAuth as initGoogleDriveAuth,
  workspaceGoogleSignIn as googleDriveSignIn,
  getWorkspaceAccessToken as getGoogleDriveToken,
  workspaceGoogleSignOut as googleDriveSignOut,
} from './google_workspace_auth';

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime: string;
  webViewLink?: string;
  ownerDisplayName?: string;
  contentPreview?: string;
}

export const DEMO_DRIVE_FILES: DriveFileItem[] = [
  {
    id: 'drv-ghidra-ast-report',
    name: 'libflutter_arm64_ghidra_audit.md',
    mimeType: 'text/markdown',
    size: '18420',
    modifiedTime: new Date(Date.now() - 3600000 * 2).toISOString(),
    ownerDisplayName: 'LiquidOS Security Vault',
    contentPreview: `# ARM64 Static Disassembly Audit (libflutter.so)
- Target Entry Vector: 0x00001000 (EL1 reset handler)
- AES-256-GCM hardware enclave hook detected at sub_2F480
- Static strings scan: 0 plaintext keys exposed in .rodata
- Recommendation: Enforce SSL_CTX_set_custom_verify pinning in production release builds.`,
  },
  {
    id: 'drv-a2d-vault-snapshot',
    name: 'a2d_enclave_audit_log.a2d',
    mimeType: 'application/json',
    size: '6420',
    modifiedTime: new Date(Date.now() - 3600000 * 8).toISOString(),
    ownerDisplayName: 'A2D Enclave Daemon',
    contentPreview: JSON.stringify(
      {
        algorithm: 'AES-256-GCM',
        kdf: 'Argon2id-PBKDF2-HMAC-SHA256',
        iterations: 32000,
        integrityHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        sealedRecords: 14,
        airGappedMode: true,
      },
      null,
      2
    ),
  },
  {
    id: 'drv-llama32-gguf',
    name: 'Llama-3.2-3B-Instruct.Q4_K_M.gguf',
    mimeType: 'application/octet-stream',
    size: '2147483648',
    modifiedTime: new Date(Date.now() - 3600000 * 24).toISOString(),
    ownerDisplayName: 'GGUF Weights Mirror',
    contentPreview:
      'Binary GGUF v3 tensor archive (3.2B parameters, Q4_K_M quantization, 28 layers, 24 attention heads, Qualcomm Hexagon NPU NNAPI compatible).',
  },
  {
    id: 'drv-nnapi-benchmark',
    name: 'snapdragon_8gen3_nnapi_benchmark.txt',
    mimeType: 'text/plain',
    size: '4120',
    modifiedTime: new Date(Date.now() - 3600000 * 36).toISOString(),
    ownerDisplayName: 'Hardware Bench Runner',
    contentPreview: `Qualcomm Hexagon HTP v75 NNAPI Tensor Benchmark
Model: Llama-3.2-3B-Instruct.Q4_K_M.gguf
Time To First Token (TTFT): 38 ms
Sustained Token Generation: 52.8 tok/s
Power Envelope: 2.8 W (Zero Thermal Throttling)
KV Cache Allocation: 128 MB (FP16)`,
  },
  {
    id: 'drv-frida-hooks',
    name: 'flutter_ssl_unpinning_hooks.dart',
    mimeType: 'text/plain',
    size: '2950',
    modifiedTime: new Date(Date.now() - 3600000 * 72).toISOString(),
    ownerDisplayName: 'Frida Automation Plugin',
    contentPreview: `/// LiquidOS Frida SSL Verification Audit Hook
/// Targets libflutter.so SSL_CTX_set_custom_verify offset for authorized pentesting.
const String fridaHookScript = '''
Interceptor.attach(Module.findExportByName("libflutter.so", "SSL_CTX_set_custom_verify"), {
  onEnter: function(args) { args[1] = ptr(0); }
});
''';`,
  },
];

/**
 * List files in the user's Google Drive using Drive API v3.
 */
export async function listDriveFiles(
  token: string,
  searchTerm?: string,
  categoryFilter: DriveFileCategory | 'all' = 'all'
): Promise<DriveFileItem[]> {
  const q = buildDriveSearchQuery(searchTerm, categoryFilter);
  const params = new URLSearchParams({
    pageSize: '25',
    orderBy: 'modifiedTime desc',
    q,
    fields: 'files(id,name,mimeType,size,modifiedTime,webViewLink,owners(displayName))',
  });

  const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.error?.message || `Google Drive API returned HTTP ${res.status}`);
  }

  const data = await res.json();
  return (data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType || 'application/octet-stream',
    size: f.size,
    modifiedTime: f.modifiedTime || new Date().toISOString(),
    webViewLink: f.webViewLink,
    ownerDisplayName: f.owners?.[0]?.displayName || 'Drive Owner',
  }));
}

/**
 * Download or export text content of a Google Drive file.
 */
export async function readDriveFileContent(
  file: DriveFileItem,
  token: string
): Promise<string> {
  if (file.mimeType === 'application/vnd.google-apps.folder') {
    return '[Google Drive Folder — select a file inside to inspect content]';
  }

  const isGoogleDoc = file.mimeType.startsWith('application/vnd.google-apps.');
  const endpoint = isGoogleDoc
    ? `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}/export?mimeType=text/plain`
    : `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media`;

  const res = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.error?.message || `Unable to read file (${res.status})`);
  }

  // Guard against giant binary GGUF downloads in browser preview
  const numericSize = file.size ? Number(file.size) : 0;
  if (numericSize > 2 * 1024 * 1024 || file.name.toLowerCase().endsWith('.gguf')) {
    return `[Binary Asset: ${file.name} (${numericSize} bytes)]\nLarge binary weights are verified via metadata/checksum without loading raw gigabytes into the DOM.`;
  }

  return await res.text();
}

/**
 * Upload a new file to Google Drive via multipart upload.
 */
export async function uploadDriveFile(
  filename: string,
  content: string,
  mimeType: string,
  token: string
): Promise<DriveFileItem> {
  const boundary = `liquid_os_boundary_${Date.now()}`;
  const metadata = {
    name: filename,
    mimeType,
  };

  const multipartBody =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${mimeType}\r\n\r\n` +
    `${content}\r\n` +
    `--${boundary}--`;

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    }
  );

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.error?.message || `Upload failed with HTTP ${res.status}`);
  }

  const created = await res.json();
  return {
    id: created.id,
    name: created.name,
    mimeType: created.mimeType || mimeType,
    size: created.size || String(content.length),
    modifiedTime: created.modifiedTime || new Date().toISOString(),
    webViewLink: created.webViewLink,
    ownerDisplayName: 'You',
    contentPreview: content,
  };
}

/**
 * Delete a file from Google Drive. Must only be invoked after explicit user confirmation!
 */
export async function deleteDriveFile(fileId: string, token: string): Promise<void> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.error?.message || `Delete failed with HTTP ${res.status}`);
  }
}
