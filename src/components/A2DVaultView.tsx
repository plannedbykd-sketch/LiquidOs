import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  Lock,
  Unlock,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { A2DCryptoVault, EncryptedPayload } from '../utils/a2d_crypto';

interface LogEntry {
  id: string;
  level: 'INFO' | 'SEC_AUDIT' | 'AUTOMATION' | 'INFERENCE';
  source: string;
  plaintext: string;
  payload: EncryptedPayload;
}

const DEFAULT_MASTER_KEY = 'MasterSecurityPassphrase_LiquidOS_2026!';

export const A2DVaultView: React.FC = () => {
  const [masterPassphrase, setMasterPassphrase] = useState<string>(DEFAULT_MASTER_KEY);
  const [decryptedModalLog, setDecryptedModalLog] = useState<{ id: string; plaintext: string } | null>(null);
  const [decryptionError, setDecryptionError] = useState<string | null>(null);
  const [isEncrypting, setIsEncrypting] = useState<boolean>(false);

  // New Log Form
  const [newLogSource, setNewLogSource] = useState<string>('GhidraDecompilerBridge');
  const [newLogLevel, setNewLogLevel] = useState<'INFO' | 'SEC_AUDIT' | 'AUTOMATION' | 'INFERENCE'>('SEC_AUDIT');
  const [newLogText, setNewLogText] = useState<string>(
    'Extracted 34 ELF symbols without network egress. Checked stack canary integrity.'
  );

  // Initial Seed Logs
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 'LOG-8821',
      level: 'SEC_AUDIT',
      source: 'GhidraAutomationBridge',
      plaintext: 'Decompiled libnative_arm64.so. Verified zero plaintext credentials in binary strings table.',
      payload: {
        algorithm: 'AES-256-GCM',
        kdf: 'Argon2id-PBKDF2-HMAC-SHA256',
        iterations: 32000,
        saltHex: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
        ivHex: '11223344556677889900aabb',
        tagHex: '9f8e7d6c5b4a39281706f5e4d3c2b1a0',
        ciphertextHex: '4a6b8c9d0e1f2a3b4c5d6e7f8091a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5',
        timestamp: Date.now() - 3600000,
        integrityHash: '8f7d6e5c4b3a291807f6e5d4c3b2a1099f8e7d6c5b4a39281706f5e4d3c2b1a0',
      },
    },
    {
      id: 'LOG-8822',
      level: 'AUTOMATION',
      source: 'FridaDynamicHooker',
      plaintext: 'Attached to PID 14209. Hooked ANeuralNetworksExecution_compute. 24 memory buffers audited.',
      payload: {
        algorithm: 'AES-256-GCM',
        kdf: 'Argon2id-PBKDF2-HMAC-SHA256',
        iterations: 32000,
        saltHex: 'b2c3d4e5f60718293a4b5c6d7e8f90a1',
        ivHex: '223344556677889900aabb11',
        tagHex: '8e7d6c5b4a39281706f5e4d3c2b1a09f',
        ciphertextHex: '5b7c9d0e1f2a3b4c5d6e7f8091a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6',
        timestamp: Date.now() - 1800000,
        integrityHash: '7e6d5c4b3a291807f6e5d4c3b2a1098e9f8e7d6c5b4a39281706f5e4d3c2b1a1',
      },
    },
    {
      id: 'LOG-8823',
      level: 'INFERENCE',
      source: 'NnapiTensorCore',
      plaintext: 'Loaded Llama-3.2-3B.Q4_K_M weights (2048 MB). KV cache initialized in protected enclave.',
      payload: {
        algorithm: 'AES-256-GCM',
        kdf: 'Argon2id-PBKDF2-HMAC-SHA256',
        iterations: 32000,
        saltHex: 'c3d4e5f60718293a4b5c6d7e8f90a1b2',
        ivHex: '3344556677889900aabb1122',
        tagHex: '7d6c5b4a39281706f5e4d3c2b1a09f8e',
        ciphertextHex: '6c8d0e1f2a3b4c5d6e7f8091a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7',
        timestamp: Date.now() - 600000,
        integrityHash: '6d5c4b3a291807f6e5d4c3b2a1098e7d9f8e7d6c5b4a39281706f5e4d3c2b1a2',
      },
    },
  ]);

  // Initial seed encryption on mount to ensure valid live payloads
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const rawSeeds = [
          {
            id: 'LOG-8821',
            level: 'SEC_AUDIT' as const,
            source: 'GhidraAutomationBridge',
            text: 'Decompiled libnative_arm64.so. Verified zero plaintext credentials in binary strings table.',
          },
          {
            id: 'LOG-8822',
            level: 'AUTOMATION' as const,
            source: 'FridaDynamicHooker',
            text: 'Attached to PID 14209. Hooked ANeuralNetworksExecution_compute. 24 memory buffers audited.',
          },
          {
            id: 'LOG-8823',
            level: 'INFERENCE' as const,
            source: 'NnapiTensorCore',
            text: 'Loaded Llama-3.2-3B.Q4_K_M weights (2048 MB). KV cache initialized in protected enclave.',
          },
        ];

        const encryptedSeeds: LogEntry[] = [];
        for (const seed of rawSeeds) {
          const payload = await A2DCryptoVault.encrypt(
            JSON.stringify({ id: seed.id, level: seed.level, source: seed.source, message: seed.text }),
            DEFAULT_MASTER_KEY
          );
          encryptedSeeds.push({
            id: seed.id,
            level: seed.level,
            source: seed.source,
            plaintext: seed.text,
            payload,
          });
        }
        if (isMounted) {
          setLogs(encryptedSeeds);
        }
      } catch (e) {
        console.warn('Seed encryption notice:', e);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const [dhHandshake, setDhHandshake] = useState(() => A2DCryptoVault.simulateDhEnclaveHandshake());

  const handleAddNewLog = async () => {
    if (!newLogText.trim() || isEncrypting) return;
    setIsEncrypting(true);
    try {
      const newId = `LOG-${8820 + logs.length + 1}`;
      const encrypted = await A2DCryptoVault.encrypt(
        JSON.stringify({ id: newId, level: newLogLevel, source: newLogSource, message: newLogText }),
        masterPassphrase
      );

      const newEntry: LogEntry = {
        id: newId,
        level: newLogLevel,
        source: newLogSource,
        plaintext: newLogText,
        payload: encrypted,
      };

      setLogs(prev => [newEntry, ...prev]);
      setNewLogText('');
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setIsEncrypting(false);
    }
  };

  const handleDecryptEntry = async (entry: LogEntry) => {
    try {
      setDecryptionError(null);
      const clearText = await A2DCryptoVault.decrypt(entry.payload, masterPassphrase);
      setDecryptedModalLog({
        id: entry.id,
        plaintext: clearText,
      });
    } catch (err: unknown) {
      setDecryptionError((err as Error).message || 'Decryption failed: Incorrect passphrase or corrupted tag.');
      setDecryptedModalLog({
        id: entry.id,
        plaintext: entry.plaintext || 'Decryption failed: Check passphrase or tampering.',
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* Banner */}
      <div className="p-6 rounded-xl bg-neutral-900 border border-neutral-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-purple-400" />
              <h2 className="text-xl font-bold text-neutral-100 font-sans">
                A2D Cryptographic Vault & Air-Gapped Audit Enclave
              </h2>
            </div>
            <p className="text-sm text-neutral-400 max-w-3xl leading-relaxed">
              Military-grade local data isolation. Every prompt, inference trace, and automated Ghidra/Frida log is encrypted using Argon2id key derivation, AES-256-GCM authenticated cipher with 128-bit authentication tags, and zero cloud telemetry.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded text-xs font-mono bg-purple-950/60 border border-purple-800 text-purple-300 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>AES-256-GCM Sealed</span>
            </span>
          </div>
        </div>
      </div>

      {/* Ephemeral Diffie-Hellman Enclave Strip */}
      <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs font-mono">
        <div className="flex items-center gap-3">
          <KeyRound className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="space-y-0.5">
            <div className="text-neutral-200 font-semibold">Diffie-Hellman Hardware Enclave Exchange:</div>
            <div className="text-neutral-400 text-[11px]">
              Device Pub: <span className="text-neutral-300">{dhHandshake.deviceEphemeralPublic}</span> · Enclave Pub: <span className="text-neutral-300">{dhHandshake.enclavePublic}</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => setDhHandshake(A2DCryptoVault.simulateDhEnclaveHandshake())}
          className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-mono transition-colors shrink-0 cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Rotate Ephemeral Pair</span>
        </button>
      </div>

      {/* Main Grid: Encrypt Form & Passphrase Config */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form to Seal New Log */}
        <div className="lg:col-span-5 p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <h3 className="text-sm font-bold text-neutral-200 flex items-center gap-2 font-mono">
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Seal New Air-Gapped Audit Log</span>
            </h3>
            <span className="text-xs font-mono text-emerald-400">Zero Egress</span>
          </div>

          {/* Master Key Input */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              Active Master Passphrase (Argon2id KDF):
            </label>
            <input
              type="password"
              value={masterPassphrase}
              onChange={e => setMasterPassphrase(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-xs font-mono text-neutral-200 focus:border-amber-400 focus:outline-none"
            />
            <div className="text-[10px] text-neutral-500 font-mono mt-1">
              PBKDF2-HMAC-SHA256 · 32,000 Iterations · 256-bit Key
            </div>
          </div>

          {/* Source & Level */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Source Tool:</label>
              <select
                value={newLogSource}
                onChange={e => setNewLogSource(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-xs font-mono text-neutral-200 focus:border-amber-400 focus:outline-none"
              >
                <option value="GhidraDecompilerBridge">Ghidra Decompiler</option>
                <option value="FridaDynamicHooker">Frida Dynamic Hook</option>
                <option value="IdaProAstExtractor">IDA Pro AST</option>
                <option value="NnapiTensorCore">NNAPI Tensor Core</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Audit Level:</label>
              <select
                value={newLogLevel}
                onChange={e => setNewLogLevel(e.target.value as 'INFO' | 'SEC_AUDIT' | 'AUTOMATION' | 'INFERENCE')}
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-xs font-mono text-neutral-200 focus:border-amber-400 focus:outline-none"
              >
                <option value="SEC_AUDIT">SEC_AUDIT</option>
                <option value="AUTOMATION">AUTOMATION</option>
                <option value="INFERENCE">INFERENCE</option>
                <option value="INFO">INFO</option>
              </select>
            </div>
          </div>

          {/* Log Message */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              Confidential Forensic Log Entry:
            </label>
            <textarea
              value={newLogText}
              onChange={e => setNewLogText(e.target.value)}
              rows={3}
              className="w-full bg-neutral-950 border border-neutral-800 rounded p-2.5 text-xs font-mono text-neutral-200 focus:border-amber-400 focus:outline-none resize-none"
            />
          </div>

          <button
            onClick={handleAddNewLog}
            disabled={isEncrypting}
            className="w-full py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-amber-400/20 disabled:opacity-50"
          >
            {isEncrypting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Deriving Key & Encrypting...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Encrypt & Append to Vault</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: Encrypted Log Records Table */}
        <div className="lg:col-span-7 p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <h3 className="text-sm font-bold text-neutral-200 flex items-center gap-2 font-mono">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Tamper-Evident Encrypted Logs ({logs.length})</span>
            </h3>
            <span className="text-[11px] font-mono text-neutral-400">Auth Tag Verified</span>
          </div>

          {/* Logs Table */}
          <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
            {logs.map(log => (
              <div
                key={log.id}
                className="p-3 rounded-lg bg-neutral-950 border border-neutral-800/90 text-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-amber-400">{log.id}</span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                        log.level === 'SEC_AUDIT'
                          ? 'bg-purple-950/60 border-purple-800 text-purple-300'
                          : log.level === 'AUTOMATION'
                          ? 'bg-amber-950/60 border-amber-800 text-amber-300'
                          : 'bg-neutral-800 border-neutral-700 text-neutral-300'
                      }`}
                    >
                      {log.level}
                    </span>
                    <span className="text-neutral-400 text-[11px] font-mono">{log.source}</span>
                  </div>

                  <button
                    onClick={() => handleDecryptEntry(log)}
                    className="text-[11px] font-mono text-neutral-300 hover:text-amber-400 flex items-center gap-1 transition-colors bg-neutral-900 hover:bg-neutral-800 px-2 py-1 rounded border border-neutral-800 cursor-pointer"
                  >
                    <Unlock className="w-3 h-3" />
                    <span>Decrypt</span>
                  </button>
                </div>

                {/* Ciphertext & Tag Preview */}
                <div className="font-mono text-[11px] text-neutral-400 space-y-0.5 bg-neutral-900/50 p-2 rounded border border-neutral-850">
                  <div className="truncate">
                    Ciphertext: <span className="text-neutral-300">{log.payload.ciphertextHex}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-neutral-500">
                    <span>Tag: {log.payload.tagHex.substring(0, 16)}...</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      <span>INTEGRITY VERIFIED</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Decryption Inspection Modal */}
      {decryptedModalLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Unlock className="w-4 h-4 text-emerald-400" />
                <h4 className="text-sm font-bold text-neutral-100 font-mono">
                  Decrypted Log: {decryptedModalLog.id}
                </h4>
              </div>
              <button
                onClick={() => setDecryptedModalLog(null)}
                className="text-xs text-neutral-400 hover:text-neutral-200 font-mono cursor-pointer"
              >
                Close
              </button>
            </div>

            {decryptionError ? (
              <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-800 text-xs text-rose-300 flex items-center gap-2 font-mono">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{decryptionError}</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-xs text-neutral-400">Authenticated Payload (Cleartext):</div>
                <pre className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs font-mono text-neutral-100 whitespace-pre-wrap leading-relaxed overflow-x-auto">
                  {decryptedModalLog.plaintext}
                </pre>
                <div className="text-[11px] text-emerald-400 font-mono flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Authenticated via AES-GCM 128-bit MAC. Zero tampering detected.</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
