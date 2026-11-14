import React, { useState } from 'react';
import {
  X,
  FileText,
  Sparkles,
  Zap,
  Shield,
  Copy,
  Check,
  Share2,
  Cpu,
  Layers,
  ArrowRight,
  ListOrdered,
  AlignLeft,
} from 'lucide-react';
import {
  TextSummarizerPlugin,
  SummarizeResult,
  SummaryFormat,
  SummaryLength,
} from '../plugins/text_summarizer_plugin';

interface TextSummarizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeModelName: string;
  onShareToGoogleChat?: (summaryText: string) => void;
}

const PRESET_SAMPLE_TEXTS = [
  {
    label: 'Reverse-Engineering ARM64 Firmware Log',
    text: `Target binary libflutter-engine.so analysis complete across 14,820 basic blocks.
The reset vector at offset 0x00001000 configures the exception vector base address (VBAR_EL1) and invokes the main engine initialization routine loc_1048.
During heap initialization, the runtime registers a custom crypto callback in .data section pointing to an AES-256-GCM hardware enclave bridge.
Static disassembly via Ghidra revealed hardcoded test credentials in .rodata at 0x0004A200, which should be immediately scrubbed before production signing.
Dynamic Frida hooking intercepted the SSL verification callback, proving the binary is susceptible to MITM proxying unless certificate pinning is strictly enforced in Flutter engine core.
NNAPI tensor delegation achieved a 3.4x speedup during automated disassembly decompilation.`,
  },
  {
    label: 'Qualcomm Snapdragon 8 Gen 3 NPU Benchmark',
    text: `Inference benchmark conducted on Qualcomm Snapdragon 8 Gen 3 Hexagon NPU using quantized GGUF weights.
Model tested: Llama-3.2-3B-Instruct in Q4_K_M quantization with 4,096 context window length.
Time to first token (TTFT) was clocked at 38 milliseconds, representing a 62% reduction compared to CPU NEON execution.
Sustained generation throughput reached 52.8 tokens per second under 2.8W thermal power envelope.
KV Cache memory consumption was measured at 128 MB with FP16 KV precision, well within the 6 GB mobile RAM allocation target.
Zero thermal throttling occurred over a continuous 15-minute load test.`,
  },
  {
    label: 'Security Incident & Tamper Detection Report',
    text: `LiquidOS A2D Cryptographic Vault detected an unauthorized filesystem access attempt on /data/local/tmp/app_logs.
The cryptographic tamper-evident seal verified an HMAC mismatch on record ID 9f86d081.
Argon2id key derivation rejected the forged salt, preventing unauthorized decryption of the offline audit logs.
All pending inference sessions were immediately transitioned to air-gapped isolation mode.
Recommended actions: Review SELinux policy, rotate hardware keystore keys, and notify incident response channel.`,
  },
];

export const TextSummarizerModal: React.FC<TextSummarizerModalProps> = ({
  isOpen,
  onClose,
  activeModelName,
  onShareToGoogleChat,
}) => {
  const [inputText, setInputText] = useState(PRESET_SAMPLE_TEXTS[0].text);
  const [format, setFormat] = useState<SummaryFormat>('bullets');
  const [length, setLength] = useState<SummaryLength>('balanced');
  const [sealInVault, setSealInVault] = useState(true);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [result, setResult] = useState<SummarizeResult | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleRunSummarizer = async () => {
    if (!inputText.trim() || isSummarizing) return;
    setIsSummarizing(true);

    try {
      const plugin = new TextSummarizerPlugin();
      await plugin.initialize();

      const res = await plugin.summarize({
        text: inputText,
        format,
        length,
        activeModelId: activeModelName,
        sealInA2DVault: sealInVault,
      });

      setResult(res);
    } catch (err: any) {
      alert(`Summarizer error: ${err.message}`);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-400/10 border border-amber-400/20 text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-neutral-100 font-mono">
                  Modular Text Summarizer Plugin
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                  v1.2.0 Active
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Interfaces with local GGUF models via NNAPI to generate structured summaries offline.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Preset Buttons */}
          <div>
            <label className="text-xs font-mono text-neutral-400 block mb-1.5">
              Load Preset Input Document:
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_SAMPLE_TEXTS.map((sample, idx) => (
                <button
                  key={idx}
                  onClick={() => setInputText(sample.text)}
                  className="px-3 py-1.5 rounded-lg text-xs font-mono bg-neutral-950 border border-neutral-800 hover:border-amber-400/60 text-neutral-300 hover:text-neutral-100 transition-colors cursor-pointer"
                >
                  {sample.label}
                </button>
              ))}
            </div>
          </div>

          {/* Text Input Area */}
          <div>
            <label className="text-xs font-mono text-neutral-400 block mb-1.5">
              Source Text Content:
            </label>
            <textarea
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              rows={5}
              placeholder="Paste arbitrary logs, security reports, or decompiled code here..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 text-xs text-neutral-200 placeholder-neutral-500 font-mono focus:outline-none focus:border-amber-400 leading-relaxed"
            />
          </div>

          {/* Configuration Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Format */}
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-neutral-400">Summary Format</label>
              <select
                value={format}
                onChange={e => setFormat(e.target.value as SummaryFormat)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs font-mono text-neutral-200 focus:outline-none focus:border-amber-400"
              >
                <option value="bullets">Bullet Points & Highlights</option>
                <option value="executive">Executive Paragraph</option>
                <option value="technical_tldr">Technical TL;DR</option>
                <option value="action_items">Action Items Checklist</option>
              </select>
            </div>

            {/* Length */}
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-neutral-400">Target Depth</label>
              <select
                value={length}
                onChange={e => setLength(e.target.value as SummaryLength)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs font-mono text-neutral-200 focus:outline-none focus:border-amber-400"
              >
                <option value="concise">Concise (1-2 key points)</option>
                <option value="balanced">Balanced (3 key points)</option>
                <option value="comprehensive">Comprehensive (Full)</option>
              </select>
            </div>

            {/* Active Model */}
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-neutral-400">Inference Engine</label>
              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs font-mono text-amber-400 truncate">
                {activeModelName}
              </div>
            </div>
          </div>

          {/* Air-gapped vault seal option */}
          <div className="flex items-center gap-2 text-xs font-mono text-neutral-300">
            <input
              type="checkbox"
              id="sealInVaultCheck"
              checked={sealInVault}
              onChange={e => setSealInVault(e.target.checked)}
              className="rounded border-neutral-700 text-amber-400 focus:ring-amber-400"
            />
            <label htmlFor="sealInVaultCheck" className="cursor-pointer flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>Seal summary audit hash in A2D tamper-evident vault</span>
            </label>
          </div>

          {/* Run Action */}
          <button
            onClick={handleRunSummarizer}
            disabled={isSummarizing || !inputText.trim()}
            className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:bg-neutral-800 text-neutral-950 font-bold font-mono text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-400/20 cursor-pointer"
          >
            {isSummarizing ? (
              <span>Executing NNAPI Tensor Summarization...</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Execute Summarization Plugin</span>
              </>
            )}
          </button>

          {/* Results Display */}
          {result && (
            <div className="mt-4 p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-4 animate-in fade-in duration-200">
              {/* Metrics Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800/80 pb-3 text-xs font-mono">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                    {result.compressionRatioPct}% Reduction
                  </span>
                  <span className="text-neutral-400">
                    {result.originalWordCount} words → {result.summaryWordCount} words
                  </span>
                </div>
                <div className="flex items-center gap-2 text-neutral-400">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>{result.inferenceTimeMs}ms inference</span>
                </div>
              </div>

              {/* Main Summary */}
              <div className="space-y-2">
                <h4 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                  Generated Summary Output:
                </h4>
                <p className="text-xs text-neutral-200 leading-relaxed font-sans bg-neutral-900/60 p-3 rounded-lg border border-neutral-800/60">
                  {result.summary}
                </p>
              </div>

              {/* Key Bullet Points */}
              {result.bulletPoints.length > 0 && (
                <div className="space-y-1.5">
                  <h5 className="text-[11px] font-mono font-semibold text-neutral-400">
                    Key Highlights:
                  </h5>
                  <ul className="space-y-1">
                    {result.bulletPoints.map((pt, i) => (
                      <li key={i} className="text-xs text-neutral-300 flex items-start gap-2">
                        <span className="text-amber-400 font-mono mt-0.5">•</span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* A2D Vault Record */}
              {result.a2dVaultRecordId && (
                <div className="text-[11px] font-mono text-neutral-500 flex items-center justify-between bg-neutral-900/40 p-2 rounded">
                  <span className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-amber-400" />
                    <span>A2D Vault ID: {result.a2dVaultRecordId}</span>
                  </span>
                  <span className="text-emerald-400">Cryptographically Sealed</span>
                </div>
              )}

              {/* Actions: Copy and Share to Google Chat */}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy Output'}</span>
                </button>

                {onShareToGoogleChat && (
                  <button
                    onClick={() => {
                      onShareToGoogleChat(result.summary);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/30 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share to Google Chat</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-800 bg-neutral-950/80 flex items-center justify-between text-xs font-mono text-neutral-500">
          <span>Plugin: TextSummarizerPlugin · Extensible Dart Architecture</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
