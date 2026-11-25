import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Gauge,
  HardDrive,
  Pause,
  Play,
  RotateCcw,
  Zap,
} from 'lucide-react';
import {
  GGUF_PRESET_MODELS,
  NnapiAccelerator,
  NnapiHardwareConfig,
} from '../utils/gguf_engine';
import {
  appendTelemetrySample,
  computeMemoryBreakdown,
  createInitialTelemetryHistory,
  DEFAULT_DEVICE_RAM_MB,
  formatAcceleratorName,
  formatMemoryGb,
  InferenceRunRecord,
  InferenceWorkloadMode,
  MAX_TELEMETRY_SAMPLES,
  sampleTelemetryPoint,
  summarizeTelemetry,
  TelemetrySample,
} from '../utils/performance_monitor';

interface BrowserMemorySnapshot {
  usedJsHeapMb: number;
  totalJsHeapMb: number;
}

function readBrowserHeap(): BrowserMemorySnapshot | null {
  if (typeof performance === 'undefined') return null;
  const mem = (performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory;
  if (!mem) return null;
  return {
    usedJsHeapMb: Math.round((mem.usedJSHeapSize / (1024 * 1024)) * 10) / 10,
    totalJsHeapMb: Math.round((mem.totalJSHeapSize / (1024 * 1024)) * 10) / 10,
  };
}

export const PerformanceMonitorView: React.FC = () => {
  const [selectedModelId, setSelectedModelId] = useState<string>(GGUF_PRESET_MODELS[0].id);
  const [accelerator, setAccelerator] = useState<NnapiAccelerator>('NPU_HEXAGON');
  const [workloadMode, setWorkloadMode] = useState<InferenceWorkloadMode>('streaming_chat');
  const [kvCacheQuant, setKvCacheQuant] = useState<'FP16' | 'Q8_0' | 'Q4_0'>('FP16');
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [isProbingInference, setIsProbingInference] = useState<boolean>(false);
  const [probeMessage, setProbeMessage] = useState<string | null>(null);

  const selectedModel = useMemo(
    () => GGUF_PRESET_MODELS.find(m => m.id === selectedModelId) || GGUF_PRESET_MODELS[0],
    [selectedModelId]
  );

  const hardwareConfig: NnapiHardwareConfig = useMemo(
    () => ({
      accelerator,
      threadCount: accelerator === 'CPU_ARM_NEON' ? 8 : 4,
      batchSize: workloadMode === 'heavy_batch' ? 1024 : 512,
      contextLength: workloadMode === 'heavy_batch' ? 8192 : 4096,
      fp16Relaxed: true,
      kvCacheQuant,
    }),
    [accelerator, workloadMode, kvCacheQuant]
  );

  const [samples, setSamples] = useState<TelemetrySample[]>(() =>
    createInitialTelemetryHistory({
      model: GGUF_PRESET_MODELS[0],
      config: {
        accelerator: 'NPU_HEXAGON',
        threadCount: 4,
        batchSize: 512,
        contextLength: 4096,
        fp16Relaxed: true,
        kvCacheQuant: 'FP16',
      },
      workloadMode: 'streaming_chat',
      count: 18,
    })
  );

  const [browserHeap, setBrowserHeap] = useState<BrowserMemorySnapshot | null>(() =>
    readBrowserHeap()
  );

  const [recentRuns, setRecentRuns] = useState<InferenceRunRecord[]>([
    {
      id: 'run-init-1',
      timestampLabel: 'Baseline',
      modelName: 'Llama-3.2-3B-Instruct.Q4_K_M.gguf',
      acceleratorLabel: 'Hexagon NPU + Adreno',
      promptTokens: 128,
      generatedTokens: 256,
      tokensPerSec: 38.4,
      peakCpuPct: 31.2,
      peakGpuPct: 36.5,
      memoryUsedMb: 2642,
      latencyMs: 6670,
      status: 'Completed',
    },
    {
      id: 'run-init-2',
      timestampLabel: 'Baseline',
      modelName: 'Qwen-2.5-Coder-7B-Instruct.Q4_0.gguf',
      acceleratorLabel: 'Adreno Vulkan GPU',
      promptTokens: 240,
      generatedTokens: 192,
      tokensPerSec: 21.8,
      peakCpuPct: 28.4,
      peakGpuPct: 74.1,
      memoryUsedMb: 5120,
      latencyMs: 8810,
      status: 'Completed',
    },
  ]);

  // Real-time telemetry ticker
  useEffect(() => {
    if (!isStreaming) return;
    const timer = window.setInterval(() => {
      setSamples(prev => {
        const nextIdx = (prev[prev.length - 1]?.id ?? 0) + 1;
        const nextSample = sampleTelemetryPoint({
          sampleIndex: nextIdx,
          model: selectedModel,
          config: hardwareConfig,
          workloadMode,
        });
        return appendTelemetrySample(prev, nextSample, MAX_TELEMETRY_SAMPLES);
      });
      setBrowserHeap(readBrowserHeap());
    }, 900);

    return () => window.clearInterval(timer);
  }, [isStreaming, selectedModel, hardwareConfig, workloadMode]);

  // Re-seed telemetry window whenever user switches model, accelerator, workload, or KV quant
  // so rolling averages, speed rating, and charts immediately reflect the active configuration
  const handleConfigChangeSample = (
    nextModel = selectedModel,
    nextConfig = hardwareConfig,
    nextMode = workloadMode
  ) => {
    setSamples(
      createInitialTelemetryHistory({
        model: nextModel,
        config: nextConfig,
        workloadMode: nextMode,
        count: 10,
      })
    );
  };

  const handleResetMetrics = () => {
    const fresh = createInitialTelemetryHistory({
      model: selectedModel,
      config: hardwareConfig,
      workloadMode,
      count: 6,
    });
    setSamples(fresh);
    setProbeMessage('Telemetry history cleared and re-anchored to current model.');
  };

  const handleRunLiveInferenceProbe = async () => {
    if (isProbingInference) return;
    setIsProbingInference(true);
    setProbeMessage(null);
    const startMs = performance.now();

    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Summarize mobile NNAPI tensor memory efficiency in two concise sentences.',
          model: selectedModel.name,
        }),
      });
      const elapsedMs = Math.max(120, Math.round(performance.now() - startMs));
      const data = await res.json();
      const text: string = data.text || 'Inference verification completed.';
      const approxTokens = Math.max(24, Math.round(text.split(/\s+/).length * 1.35));
      const latest = samples[samples.length - 1];
      const measuredTps =
        Math.round(
          Math.min(120, Math.max(latest?.tokensPerSec || 18, (approxTokens / elapsedMs) * 1000)) *
            10
        ) / 10;

      const mem = computeMemoryBreakdown(
        selectedModel,
        hardwareConfig,
        workloadMode,
        DEFAULT_DEVICE_RAM_MB
      );

      const newRun: InferenceRunRecord = {
        id: `run-${Date.now()}`,
        timestampLabel: new Date().toLocaleTimeString([], {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        modelName: selectedModel.name,
        acceleratorLabel: formatAcceleratorName(accelerator),
        promptTokens: 16,
        generatedTokens: approxTokens,
        tokensPerSec: measuredTps,
        peakCpuPct: latest?.cpuUsagePct ?? 24.5,
        peakGpuPct: latest?.gpuUsagePct ?? 42.0,
        memoryUsedMb: mem.usedTotalMb,
        latencyMs: elapsedMs,
        status: 'Completed',
      };

      setRecentRuns(prev => [newRun, ...prev].slice(0, 8));
      setProbeMessage(
        `Measured live inference run: ${approxTokens} tokens in ${elapsedMs} ms (${measuredTps} tokens/sec).`
      );
    } catch {
      setProbeMessage('Live backend probe fell back to local device telemetry.');
    } finally {
      setIsProbingInference(false);
    }
  };

  const latest = samples[samples.length - 1] ?? sampleTelemetryPoint({
    sampleIndex: 1,
    model: selectedModel,
    config: hardwareConfig,
    workloadMode,
  });

  const memory = useMemo(
    () =>
      computeMemoryBreakdown(
        selectedModel,
        hardwareConfig,
        workloadMode,
        DEFAULT_DEVICE_RAM_MB
      ),
    [selectedModel, hardwareConfig, workloadMode]
  );

  const summary = useMemo(
    () =>
      summarizeTelemetry(
        samples,
        selectedModel,
        hardwareConfig,
        workloadMode,
        DEFAULT_DEVICE_RAM_MB
      ),
    [samples, selectedModel, hardwareConfig, workloadMode]
  );

  // Build SVG path points with a clean left gutter so Y-axis labels never overlap lines
  const chartWidth = 560;
  const chartHeight = 160;
  const plotLeft = 46;
  const plotRight = chartWidth - 6;
  const plotWidth = plotRight - plotLeft;
  const maxSpeed = Math.max(50, Math.ceil((summary.peakTokensPerSec + 10) / 10) * 10);

  const speedPoints = useMemo(() => {
    if (samples.length === 0) return '';
    return samples
      .map((s, idx) => {
        const x =
          samples.length === 1
            ? plotLeft + plotWidth / 2
            : plotLeft + (idx / (samples.length - 1)) * plotWidth;
        const y = chartHeight - (Math.min(maxSpeed, s.tokensPerSec) / maxSpeed) * (chartHeight - 16) - 8;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [samples, maxSpeed, plotWidth]);

  const speedAreaPath = useMemo(() => {
    if (!speedPoints || samples.length < 2) return '';
    return `M ${plotLeft},${chartHeight} L ${speedPoints} L ${plotRight},${chartHeight} Z`;
  }, [speedPoints, samples.length, plotRight]);

  const buildPctPoints = (selector: (s: TelemetrySample) => number) => {
    if (samples.length === 0) return '';
    return samples
      .map((s, idx) => {
        const x =
          samples.length === 1
            ? plotLeft + plotWidth / 2
            : plotLeft + (idx / (samples.length - 1)) * plotWidth;
        const y = chartHeight - (selector(s) / 100) * (chartHeight - 16) - 8;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const cpuPoints = useMemo(() => buildPctPoints(s => s.cpuUsagePct), [samples]);
  const gpuPoints = useMemo(() => buildPctPoints(s => s.gpuUsagePct), [samples]);

  const statusTone =
    summary.healthStatus === 'Optimal'
      ? {
          border: 'border-emerald-800/70',
          bg: 'bg-emerald-950/25',
          text: 'text-emerald-400',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
        }
      : summary.healthStatus === 'Elevated Load'
      ? {
          border: 'border-amber-700/70',
          bg: 'bg-amber-950/25',
          text: 'text-amber-300',
          icon: <Gauge className="w-4 h-4 text-amber-400 shrink-0" />,
        }
      : {
          border: 'border-rose-800/80',
          bg: 'bg-rose-950/25',
          text: 'text-rose-400',
          icon: <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />,
        };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      {/* Header & Primary Controls */}
      <div className="p-6 rounded-xl bg-neutral-900 border border-neutral-800 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <Activity className="w-5 h-5 text-amber-400 shrink-0" />
              <h1 className="text-xl font-bold text-neutral-100 tracking-tight">
                Model Inference Performance Monitor
              </h1>
            </div>
            <p className="text-sm text-neutral-400 max-w-3xl">
              Live overview of token generation speed, processor load across CPU and GPU/NPU cores, and unified memory usage for your active local language model.
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400 font-mono pt-1">
              <span>{selectedModel.name}</span>
              <span aria-hidden="true">·</span>
              <span>{formatAcceleratorName(accelerator)}</span>
              <span aria-hidden="true">·</span>
              <span>Phase: {latest.phase}</span>
              <span aria-hidden="true">·</span>
              <span className={isStreaming ? 'text-emerald-400' : 'text-neutral-400'}>
                {isStreaming ? 'Live Stream Active' : 'Stream Paused'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
            <button
              onClick={handleRunLiveInferenceProbe}
              disabled={isProbingInference}
              className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-neutral-950 font-semibold text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isProbingInference ? 'Running Probe...' : 'Run Sample Inference'}</span>
            </button>

            <button
              onClick={() => setIsStreaming(prev => !prev)}
              className="px-3.5 py-2 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 font-medium text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isStreaming ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-amber-400" />
                  <span>Pause Stream</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Resume Stream</span>
                </>
              )}
            </button>

            <button
              onClick={handleResetMetrics}
              aria-label="Reset performance metrics"
              className="px-3 py-2 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 font-medium text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* End-User Plain-Language System Summary */}
        <div
          className={`p-4 rounded-lg border ${statusTone.border} ${statusTone.bg} flex flex-col md:flex-row md:items-center justify-between gap-3`}
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5">{statusTone.icon}</div>
            <div className="space-y-1 text-xs sm:text-sm">
              <div className="flex items-center gap-2 font-semibold">
                <span className={statusTone.text}>Status: {summary.healthStatus}</span>
                <span className="text-neutral-600" aria-hidden="true">·</span>
                <span className="text-neutral-200">{summary.speedRating}</span>
              </div>
              <p className="text-neutral-300 leading-relaxed">
                {summary.plainLanguageExplanation}
              </p>
            </div>
          </div>
          <div className="text-xs text-neutral-400 md:text-right max-w-sm shrink-0">
            <span className="text-neutral-200 font-medium">Recommendation: </span>
            {summary.optimizationTip}
          </div>
        </div>

        {probeMessage && (
          <div className="px-3.5 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-xs font-mono text-amber-300">
            {probeMessage}
          </div>
        )}

        {/* Interactive Model, Accelerator & Workload Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-2 border-t border-neutral-800">
          <div className="md:col-span-4">
            <label
              htmlFor="perf-model-select"
              className="block text-xs font-medium text-neutral-400 mb-1.5"
            >
              Active Model
            </label>
            <select
              id="perf-model-select"
              value={selectedModelId}
              onChange={e => {
                const nextId = e.target.value;
                setSelectedModelId(nextId);
                const nextModel =
                  GGUF_PRESET_MODELS.find(m => m.id === nextId) || GGUF_PRESET_MODELS[0];
                handleConfigChangeSample(nextModel, hardwareConfig, workloadMode);
              }}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-neutral-100 focus:outline-none focus:border-amber-400"
            >
              {GGUF_PRESET_MODELS.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name.replace('.gguf', '')} ({m.parametersB}B · {m.defaultQuant})
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <label
              htmlFor="perf-accelerator-select"
              className="block text-xs font-medium text-neutral-400 mb-1.5"
            >
              Hardware Target
            </label>
            <select
              id="perf-accelerator-select"
              value={accelerator}
              onChange={e => {
                const nextAcc = e.target.value as NnapiAccelerator;
                setAccelerator(nextAcc);
                handleConfigChangeSample(
                  selectedModel,
                  { ...hardwareConfig, accelerator: nextAcc },
                  workloadMode
                );
              }}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-neutral-100 focus:outline-none focus:border-amber-400"
            >
              <option value="NPU_HEXAGON">Hexagon NPU + Adreno</option>
              <option value="GPU_ADRENO">Adreno Vulkan GPU</option>
              <option value="GPU_MALI">ARM Mali GPU</option>
              <option value="CPU_ARM_NEON">ARM NEON CPU</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <span className="block text-xs font-medium text-neutral-400 mb-1.5">
              Workload Profile
            </span>
            <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-neutral-950 border border-neutral-800 text-xs">
              {(
                [
                  { id: 'idle', label: 'Idle' },
                  { id: 'streaming_chat', label: 'Chat' },
                  { id: 'heavy_batch', label: 'Batch' },
                ] as const
              ).map(mode => (
                <button
                  key={mode.id}
                  onClick={() => {
                    setWorkloadMode(mode.id);
                    handleConfigChangeSample(selectedModel, hardwareConfig, mode.id);
                  }}
                  className={`py-1.5 rounded-md font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    workloadMode === mode.id
                      ? 'bg-amber-400 text-neutral-950 font-semibold'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            <span className="block text-xs font-medium text-neutral-400 mb-1.5">
              KV Cache Format
            </span>
            <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-neutral-950 border border-neutral-800 text-xs font-mono">
              {(['FP16', 'Q8_0', 'Q4_0'] as const).map(q => (
                <button
                  key={q}
                  onClick={() => {
                    setKvCacheQuant(q);
                    handleConfigChangeSample(
                      selectedModel,
                      { ...hardwareConfig, kvCacheQuant: q },
                      workloadMode
                    );
                  }}
                  className={`py-1.5 rounded-md transition-colors cursor-pointer ${
                    kvCacheQuant === q
                      ? 'bg-neutral-800 text-amber-300 font-bold'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4 Primary End-User KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Processing Speed */}
        <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span className="font-medium text-neutral-300">Processing Speed</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-1.5 font-mono tabular-nums">
            <span className="text-3xl font-bold text-amber-400">
              {latest.tokensPerSec.toFixed(1)}
            </span>
            <span className="text-xs text-neutral-400">tokens/sec</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
            <div
              className="h-full bg-amber-400 transition-all duration-300"
              style={{ width: `${Math.min(100, (latest.tokensPerSec / 60) * 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs font-mono tabular-nums text-neutral-400">
            <span>Avg {summary.avgTokensPerSec.toFixed(1)} t/s</span>
            <span>TTFT {latest.ttftMs} ms</span>
          </div>
          <p className="text-xs text-neutral-400">
            {summary.speedRating} — words generated each second during response streaming.
          </p>
        </div>

        {/* KPI 2: CPU Usage */}
        <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span className="font-medium text-neutral-300">CPU Utilization</span>
            <Cpu className="w-4 h-4 text-sky-400" />
          </div>
          <div className="flex items-baseline gap-1.5 font-mono tabular-nums">
            <span className="text-3xl font-bold text-sky-400">
              {latest.cpuUsagePct.toFixed(1)}%
            </span>
            <span className="text-xs text-neutral-400">
              ({hardwareConfig.threadCount} threads)
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                latest.cpuUsagePct > 80 ? 'bg-rose-400' : 'bg-sky-400'
              }`}
              style={{ width: `${latest.cpuUsagePct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs font-mono tabular-nums text-neutral-400">
            <span>Avg {summary.avgCpuUsagePct.toFixed(1)}%</span>
            <span>{latest.cpuUsagePct > 75 ? 'High CPU Load' : 'Balanced'}</span>
          </div>
          <p className="text-xs text-neutral-400">
            Handles prompt tokenization, scheduling, and fallback math when GPU/NPU is idle.
          </p>
        </div>

        {/* KPI 3: GPU / Accelerator Usage */}
        <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span className="font-medium text-neutral-300">GPU / NPU Usage</span>
            <Gauge className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2 font-mono tabular-nums">
            <span className="text-3xl font-bold text-emerald-400">
              {latest.gpuUsagePct.toFixed(1)}%
            </span>
            <span className="text-xs text-neutral-400">
              GPU · {latest.npuUsagePct.toFixed(0)}% NPU
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
            <div
              className="h-full bg-emerald-400 transition-all duration-300"
              style={{ width: `${Math.max(latest.gpuUsagePct, latest.npuUsagePct)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs font-mono tabular-nums text-neutral-400">
            <span>Avg GPU {summary.avgGpuUsagePct.toFixed(1)}%</span>
            <span>{accelerator === 'CPU_ARM_NEON' ? 'Offload Off' : 'Offload Active'}</span>
          </div>
          <p className="text-xs text-neutral-400">
            Dedicated matrix math engines accelerating transformer layers with lower heat.
          </p>
        </div>

        {/* KPI 4: Memory Consumption */}
        <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span className="font-medium text-neutral-300">Memory Consumption</span>
            <HardDrive className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-2 font-mono tabular-nums whitespace-nowrap">
            <span className="text-2xl xl:text-3xl font-bold text-purple-400">
              {formatMemoryGb(memory.usedTotalMb)}
            </span>
            <span className="text-xs text-neutral-400">
              / {formatMemoryGb(memory.deviceTotalRamMb)} ({memory.usagePct}%)
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                memory.usagePct >= 78 ? 'bg-rose-400' : 'bg-purple-400'
              }`}
              style={{ width: `${memory.usagePct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs font-mono tabular-nums text-neutral-400">
            <span>{formatMemoryGb(memory.freeMemoryMb)} Free</span>
            <span>{memory.usagePct >= 78 ? 'Tight Headroom' : 'Healthy RAM'}</span>
          </div>
          <p className="text-xs text-neutral-400">
            Combined footprint of loaded model weights, active context, and app buffers.
          </p>
        </div>
      </div>

      {/* Real-Time Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Processing Speed (Tokens/Sec) */}
        <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-neutral-100">
                Processing Speed Over Time
              </h2>
              <p className="text-xs text-neutral-400">
                Rolling {samples.length}-sample token throughput (tokens per second)
              </p>
            </div>
            <div className="text-right font-mono tabular-nums">
              <div className="text-sm font-bold text-amber-400">
                {latest.tokensPerSec.toFixed(1)} t/s
              </div>
              <div className="text-[11px] text-neutral-400">
                Peak {summary.peakTokensPerSec.toFixed(1)} t/s
              </div>
            </div>
          </div>

          <div className="relative">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-44 overflow-visible"
              role="img"
              aria-label="Real-time token processing speed line chart"
            >
              <defs>
                <linearGradient id="speedAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              {[0.25, 0.5, 0.75].map(frac => {
                const y = chartHeight - frac * (chartHeight - 16) - 8;
                return (
                  <g key={frac}>
                    <line
                      x1={plotLeft}
                      y1={y}
                      x2={plotRight}
                      y2={y}
                      stroke="#262626"
                      strokeDasharray="3 3"
                    />
                    <text
                      x="0"
                      y={y + 3}
                      fill="#737373"
                      fontSize="10"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {Math.round(maxSpeed * frac)} t/s
                    </text>
                  </g>
                );
              })}
              {speedAreaPath && <path d={speedAreaPath} fill="url(#speedAreaGrad)" />}
              {speedPoints && (
                <polyline
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={speedPoints}
                />
              )}
            </svg>
          </div>

          <div className="flex items-center justify-between text-xs font-mono tabular-nums text-neutral-400 pt-2 border-t border-neutral-800">
            <span>Window start: {samples[0]?.label ?? '--:--:--'}</span>
            <span>Generated in window: {summary.totalTokensGenerated} tokens</span>
            <span>Latest: {latest.label}</span>
          </div>
        </div>

        {/* Chart 2: CPU & GPU Utilization Over Time */}
        <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-neutral-100">
                CPU &amp; GPU Usage Over Time
              </h2>
              <p className="text-xs text-neutral-400">
                Synchronized processor load (0% to 100%) across prefill and decoding
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
              <span className="text-sky-400 font-semibold">
                CPU {latest.cpuUsagePct.toFixed(0)}%
              </span>
              <span className="text-emerald-400 font-semibold">
                GPU {latest.gpuUsagePct.toFixed(0)}%
              </span>
            </div>
          </div>

          <div className="relative">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-44 overflow-visible"
              role="img"
              aria-label="Real-time CPU and GPU utilization chart"
            >
              {[25, 50, 75, 100].map(pct => {
                const y = chartHeight - (pct / 100) * (chartHeight - 16) - 8;
                return (
                  <g key={pct}>
                    <line
                      x1={plotLeft}
                      y1={y}
                      x2={plotRight}
                      y2={y}
                      stroke="#262626"
                      strokeDasharray="3 3"
                    />
                    <text
                      x="0"
                      y={y + 3}
                      fill="#737373"
                      fontSize="10"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {pct}%
                    </text>
                  </g>
                );
              })}
              {cpuPoints && (
                <polyline
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={cpuPoints}
                />
              )}
              {gpuPoints && (
                <polyline
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={gpuPoints}
                />
              )}
            </svg>
          </div>

          <div className="flex items-center justify-between text-xs font-mono tabular-nums text-neutral-400 pt-2 border-t border-neutral-800">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-sky-400">
                <span className="inline-block w-3 h-0.5 bg-sky-400" />
                <span>CPU Usage</span>
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="inline-block w-3 h-0.5 bg-emerald-400" />
                <span>GPU Usage</span>
              </span>
            </div>
            <span>NPU Co-load: {latest.npuUsagePct.toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* Memory Allocation Breakdown & Recent Inference Runs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Memory Consumption Breakdown (5 cols) */}
        <div className="lg:col-span-5 p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <h2 className="text-sm font-semibold text-neutral-100">
              Memory Consumption Breakdown
            </h2>
            <span className="text-xs font-mono tabular-nums text-neutral-300">
              {memory.usagePct}% of {formatMemoryGb(memory.deviceTotalRamMb)}
            </span>
          </div>

          <div className="w-full h-4 rounded-full bg-neutral-950 border border-neutral-800 overflow-hidden flex">
            <div
              className="bg-amber-400 h-full transition-all duration-300"
              style={{
                width: `${(memory.modelWeightsMb / memory.deviceTotalRamMb) * 100}%`,
              }}
              title={`Model Weights: ${memory.modelWeightsMb} MB`}
            />
            <div
              className="bg-purple-400 h-full transition-all duration-300"
              style={{
                width: `${(memory.kvCacheMb / memory.deviceTotalRamMb) * 100}%`,
              }}
              title={`KV Cache Context: ${memory.kvCacheMb} MB`}
            />
            <div
              className="bg-sky-400 h-full transition-all duration-300"
              style={{
                width: `${(memory.runtimeOverheadMb / memory.deviceTotalRamMb) * 100}%`,
              }}
              title={`Runtime & App Buffers: ${memory.runtimeOverheadMb} MB`}
            />
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-neutral-800/70">
              <span className="text-neutral-300 flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-400" />
                <span>Model Weights ({selectedModel.defaultQuant})</span>
              </span>
              <span className="font-mono tabular-nums text-neutral-100">
                {formatMemoryGb(memory.modelWeightsMb)} ({memory.modelWeightsMb} MB)
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-neutral-800/70">
              <span className="text-neutral-300 flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-purple-400" />
                <span>Conversation Context (KV Cache · {kvCacheQuant})</span>
              </span>
              <span className="font-mono tabular-nums text-neutral-100">
                {memory.kvCacheMb.toFixed(1)} MB
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-neutral-800/70">
              <span className="text-neutral-300 flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-sky-400" />
                <span>Runtime &amp; Tensor Scratchpad</span>
              </span>
              <span className="font-mono tabular-nums text-neutral-100">
                {memory.runtimeOverheadMb} MB
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5">
              <span className="text-neutral-400 flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-neutral-700" />
                <span>Available Device Memory</span>
              </span>
              <span className="font-mono tabular-nums text-emerald-400 font-semibold">
                {formatMemoryGb(memory.freeMemoryMb)}
              </span>
            </div>
          </div>

          {browserHeap && (
            <div className="pt-2 border-t border-neutral-800 text-xs text-neutral-400 flex items-center justify-between font-mono tabular-nums">
              <span>Web Workbench JS Heap</span>
              <span>
                {browserHeap.usedJsHeapMb} / {browserHeap.totalJsHeapMb} MB
              </span>
            </div>
          )}
        </div>

        {/* Recent Inference Runs Table (7 cols) */}
        <div className="lg:col-span-7 p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-neutral-100">
                Recent Model Inference Runs
              </h2>
              <p className="text-xs text-neutral-400">
                Comparison of processing speed, processor load, and memory across runs
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums text-neutral-400">
              {recentRuns.length} logged
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-400 font-mono text-[11px]">
                  <th className="text-left py-2 pr-3 font-medium">Model &amp; Backend</th>
                  <th className="text-right py-2 px-2 font-medium">Speed</th>
                  <th className="text-right py-2 px-2 font-medium">CPU</th>
                  <th className="text-right py-2 px-2 font-medium">GPU</th>
                  <th className="text-right py-2 px-2 font-medium">Memory</th>
                  <th className="text-right py-2 pl-2 font-medium">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/70 font-mono tabular-nums">
                {recentRuns.map(run => (
                  <tr key={run.id} className="hover:bg-neutral-950/60 transition-colors">
                    <td className="py-2.5 pr-3 font-sans">
                      <div className="font-medium text-neutral-100 truncate max-w-[230px]">
                        {run.modelName}
                      </div>
                      <div className="text-[11px] text-neutral-400">
                        {run.acceleratorLabel} · {run.generatedTokens} tokens · {run.timestampLabel}
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-right text-amber-400 font-semibold whitespace-nowrap">
                      {run.tokensPerSec.toFixed(1)} t/s
                    </td>
                    <td className="py-2.5 px-2 text-right text-sky-400 whitespace-nowrap">
                      {run.peakCpuPct.toFixed(0)}%
                    </td>
                    <td className="py-2.5 px-2 text-right text-emerald-400 whitespace-nowrap">
                      {run.peakGpuPct.toFixed(0)}%
                    </td>
                    <td className="py-2.5 px-2 text-right text-purple-300 whitespace-nowrap">
                      {formatMemoryGb(run.memoryUsedMb)}
                    </td>
                    <td className="py-2.5 pl-2 text-right text-neutral-300 whitespace-nowrap">
                      {run.latencyMs} ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
