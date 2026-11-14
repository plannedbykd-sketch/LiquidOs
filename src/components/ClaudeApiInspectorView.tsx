import React, { useState } from 'react';
import { Terminal, Copy, Check, Play, RefreshCw, Zap, ShieldCheck, Code2 } from 'lucide-react';
import { Claude35Adapter, AnthropicMessageRequest } from '../utils/claude_adapter';

export const ClaudeApiInspectorView: React.FC = () => {
  const [selectedModel, setSelectedModel] = useState<string>('claude-3-5-sonnet-20241022');
  const [systemPrompt, setSystemPrompt] = useState<string>(
    'You are an air-gapped security engineer on LiquidOS specializing in binary disassembly and NNAPI tensor execution.'
  );
  const [userQuery, setUserQuery] = useState<string>(
    'Explain how LiquidOS dispatches INT4 quantized GGUF models directly to the Qualcomm Hexagon NPU via NNAPI FFI.'
  );
  const [maxTokens, setMaxTokens] = useState<number>(1024);
  const [temperature, setTemperature] = useState<number>(0.7);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [responsePayload, setResponsePayload] = useState<unknown | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [copiedCurl, setCopiedCurl] = useState<boolean>(false);

  const sampleRequest: AnthropicMessageRequest = {
    model: selectedModel,
    max_tokens: maxTokens,
    temperature,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userQuery,
      },
    ],
  };

  const handleExecuteRequest = async () => {
    setIsLoading(true);
    setResponsePayload(null);
    const start = performance.now();

    try {
      const res = await fetch('/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'x-api-key': 'liquid_local_dev_token',
        },
        body: JSON.stringify(sampleRequest),
      });

      const data = await res.json();
      const end = performance.now();
      setLatencyMs(Math.round(end - start));
      setResponsePayload(data);
    } catch (err: unknown) {
      console.error(err);
      const end = performance.now();
      setLatencyMs(Math.round(end - start));
      setResponsePayload({
        type: 'error',
        error: { message: (err as Error).message },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const curlCommand = `curl -X POST http://localhost:3000/v1/messages \\
  -H "Content-Type: application/json" \\
  -H "anthropic-version: 2023-06-01" \\
  -H "x-api-key: liquid_local_dev_token" \\
  -d '${JSON.stringify(sampleRequest, null, 2)}'`;

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(curlCommand);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* Header Banner */}
      <div className="p-6 rounded-xl bg-neutral-900 border border-neutral-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Terminal className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl font-bold text-neutral-100 font-sans">
                Anthropic Claude 3.5 Messages API Replication Layer
              </h2>
            </div>
            <p className="text-sm text-neutral-400 max-w-3xl leading-relaxed">
              Complete drop-in compatibility for <code className="text-amber-400 font-mono text-xs">POST /v1/messages</code>. External tools, scripts, and Flutter clients targeting Claude 3.5 Sonnet & Haiku seamlessly route through this endpoint to local GGUF models or Gemini accelerators.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="px-3 py-1 rounded text-xs font-mono bg-emerald-950/60 border border-emerald-800 text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Full Spec 2023-06-01</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Request Builder (Left) & Live Response (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Interactive Request Builder */}
        <div className="lg:col-span-6 space-y-5">
          <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <span className="text-xs font-bold text-neutral-300 font-mono uppercase tracking-wider">
                Request Parameters
              </span>
              <button
                onClick={handleCopyCurl}
                className="text-xs text-neutral-400 hover:text-amber-400 flex items-center gap-1 font-mono transition-colors"
              >
                {copiedCurl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCurl ? 'Copied cURL' : 'Copy cURL'}</span>
              </button>
            </div>

            {/* Model Target */}
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                model:
              </label>
              <select
                value={selectedModel}
                onChange={e => setSelectedModel(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-xs font-mono text-neutral-200 focus:border-amber-400 focus:outline-none"
              >
                <option value="claude-3-5-sonnet-20241022">claude-3-5-sonnet-20241022 (Default Sonnet 3.5)</option>
                <option value="claude-3-5-haiku-20241022">claude-3-5-haiku-20241022 (Fast Haiku 3.5)</option>
                <option value="local-gguf-nnapi">local-gguf-nnapi (Air-Gapped Llama 3.2 3B)</option>
              </select>
            </div>

            {/* System Instruction */}
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                system (System Prompt):
              </label>
              <textarea
                value={systemPrompt}
                onChange={e => setSystemPrompt(e.target.value)}
                rows={2}
                className="w-full bg-neutral-950 border border-neutral-800 rounded p-2.5 text-xs font-mono text-neutral-200 focus:border-amber-400 focus:outline-none resize-none"
              />
            </div>

            {/* User Message */}
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                messages[0].content:
              </label>
              <textarea
                value={userQuery}
                onChange={e => setUserQuery(e.target.value)}
                rows={3}
                className="w-full bg-neutral-950 border border-neutral-800 rounded p-2.5 text-xs font-mono text-neutral-200 focus:border-amber-400 focus:outline-none resize-none"
              />
            </div>

            {/* Max Tokens & Temperature */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  max_tokens: {maxTokens}
                </label>
                <input
                  type="range"
                  min="256"
                  max="4096"
                  step="256"
                  value={maxTokens}
                  onChange={e => setMaxTokens(Number(e.target.value))}
                  className="w-full accent-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  temperature: {temperature}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={temperature}
                  onChange={e => setTemperature(Number(e.target.value))}
                  className="w-full accent-amber-400"
                />
              </div>
            </div>

            {/* Run Button */}
            <button
              onClick={handleExecuteRequest}
              disabled={isLoading}
              className="w-full py-3 rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-amber-400/20"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Dispatching to Claude 3.5 Engine...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Execute POST /v1/messages</span>
                </>
              )}
            </button>
          </div>

          {/* Schema Specifications Reference */}
          <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 text-xs space-y-2 text-neutral-400 font-mono">
            <div className="text-neutral-200 font-semibold flex items-center gap-1.5">
              <Code2 className="w-4 h-4 text-amber-400" />
              <span>Specification Compliance Details</span>
            </div>
            <div>• Headers: <code className="text-neutral-300">anthropic-version: 2023-06-01</code></div>
            <div>• Response Structure: <code className="text-neutral-300">id, type: "message", role: "assistant", content, usage</code></div>
            <div>• Stop Reasons: <code className="text-neutral-300">end_turn | max_tokens | tool_use</code></div>
          </div>
        </div>

        {/* Right Column: Live Response & Telemetry */}
        <div className="lg:col-span-6 space-y-5">
          <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <span className="text-xs font-bold text-neutral-300 font-mono uppercase tracking-wider">
                Response Output
              </span>
              {latencyMs !== null && (
                <span className="text-xs font-mono text-emerald-400">
                  {latencyMs}ms latency
                </span>
              )}
            </div>

            {/* Display formatted content if available */}
            {responsePayload ? (
              <div className="space-y-4">
                {/* Usage pill strip */}
                {(responsePayload as { usage?: { input_tokens: number; output_tokens: number } })?.usage && (
                  <div className="flex items-center gap-4 text-xs font-mono p-2.5 rounded bg-neutral-950 border border-neutral-800 text-neutral-300">
                    <div>
                      Input Tokens: <span className="text-amber-400 font-semibold">{(responsePayload as { usage: { input_tokens: number } }).usage.input_tokens}</span>
                    </div>
                    <div>·</div>
                    <div>
                      Output Tokens: <span className="text-amber-400 font-semibold">{(responsePayload as { usage: { output_tokens: number } }).usage.output_tokens}</span>
                    </div>
                    <div>·</div>
                    <div>
                      Stop: <span className="text-emerald-400">{(responsePayload as { stop_reason?: string }).stop_reason || 'end_turn'}</span>
                    </div>
                  </div>
                )}

                {/* Raw JSON Code Block */}
                <div className="relative">
                  <pre className="p-4 rounded-lg bg-neutral-950 border border-neutral-800 text-xs font-mono text-neutral-200 overflow-x-auto max-h-[460px] leading-relaxed">
                    {JSON.stringify(responsePayload, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-neutral-500 font-mono text-xs border border-dashed border-neutral-800 rounded-lg">
                <Terminal className="w-8 h-8 text-neutral-600 mb-2" />
                <span>Click "Execute POST /v1/messages" to run a live test against the Claude 3.5 replication engine.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
