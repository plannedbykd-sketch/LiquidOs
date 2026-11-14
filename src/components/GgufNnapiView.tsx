import React, { useState, useMemo } from 'react';
import {
  Cpu,
  Zap,
  Activity,
  Layers,
  HardDrive,
  Flame,
  BatteryCharging,
  Sliders,
  CheckCircle2,
  Play,
  RefreshCw,
} from 'lucide-react';
import {
  GgufEngine,
  GGUF_PRESET_MODELS,
  GgufModelProfile,
  NnapiAccelerator,
  NnapiHardwareConfig,
  TensorInferenceMetrics,
} from '../utils/gguf_engine';

export const GgufNnapiView: React.FC = () => {
  const [selectedModelId, setSelectedModelId] = useState<string>(GGUF_PRESET_MODELS[0].id);
  const [accelerator, setAccelerator] = useState<NnapiAccelerator>('NPU_HEXAGON');
  const [threadCount, setThreadCount] = useState<number>(4);
  const [batchSize, setBatchSize] = useState<number>(512);
  const [contextLength, setContextLength] = useState<number>(4096);
  const [fp16Relaxed, setFp16Relaxed] = useState<boolean>(true);
  const [kvCacheQuant, setKvCacheQuant] = useState<'FP16' | 'Q8_0' | 'Q4_0'>('FP16');

  const [isBenchmarking, setIsBenchmarking] = useState<boolean>(false);
  const [benchmarkProgress, setBenchmarkProgress] = useState<number>(0);

  const selectedModel = useMemo(
    () => GGUF_PRESET_MODELS.find(m => m.id === selectedModelId) || GGUF_PRESET_MODELS[0],
    [selectedModelId]
  );

  const hardwareConfig: NnapiHardwareConfig = useMemo(
    () => ({
      accelerator,
      threadCount,
      batchSize,
      contextLength,
      fp16Relaxed,
      kvCacheQuant,
    }),
    [accelerator, threadCount, batchSize, contextLength, fp16Relaxed, kvCacheQuant]
  );

  const metrics: TensorInferenceMetrics = useMemo(() => {
    return GgufEngine.computeMetrics(selectedModel, hardwareConfig);
  }, [selectedModel, hardwareConfig]);

  const handleRunBenchmark = async () => {
    if (isBenchmarking) return;
    setIsBenchmarking(true);
    setBenchmarkProgress(0);

    for (let i = 1; i <= 10; i++) {
      await new Promise(r => setTimeout(r, 120));
      setBenchmarkProgress(i * 10);
    }

    setIsBenchmarking(false);
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* Banner */}
      <div className="p-6 rounded-xl bg-neutral-900 border border-neutral-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl font-bold text-neutral-100 font-sans">
                GGUF Model Hub & NNAPI Tensor Accelerator Profiler
              </h2>
            </div>
            <p className="text-sm text-neutral-400 max-w-3xl leading-relaxed">
              Analyze memory consumption, KV cache footprint, and tokens/sec throughput for quantized GGUF models dispatched directly to Android Neural Networks API coprocessors (Qualcomm Hexagon NPU, Adreno GPU, and ARM NEON).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded text-xs font-mono bg-amber-400/10 border border-amber-400/40 text-amber-300">
              NNAPI Driver Active
            </span>
          </div>
        </div>
      </div>

      {/* Model Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {GGUF_PRESET_MODELS.map(model => {
          const isSelected = model.id === selectedModelId;
          return (
            <button
              key={model.id}
              onClick={() => setSelectedModelId(model.id)}
              className={`p-4 rounded-xl text-left transition-all border cursor-pointer ${
                isSelected
                  ? 'bg-neutral-900 border-amber-400 shadow-lg shadow-amber-400/10'
                  : 'bg-neutral-950/80 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-400/15 text-amber-300 font-bold">
                  {model.defaultQuant}
                </span>
                <span className="text-[11px] font-mono text-neutral-400">
                  {model.parametersB}B Params
                </span>
              </div>
              <div className="text-sm font-bold text-neutral-100 font-mono mb-1 truncate">
                {model.name}
              </div>
              <div className="text-xs text-neutral-400 leading-snug line-clamp-2 mb-3">
                {model.description}
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500 pt-2 border-t border-neutral-800">
                <span>{model.fileSizeBytesMb} MB</span>
                <span className="text-neutral-400">{model.layers} Layers</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Two-Column View: Controls (Left) & Metrics (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Controls Column */}
        <div className="lg:col-span-5 p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <h3 className="text-sm font-bold text-neutral-200 flex items-center gap-2 font-mono">
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>NNAPI Coprocessor Configuration</span>
            </h3>
            <span className="text-xs font-mono text-neutral-400">libneuralnetworks.so</span>
          </div>

          {/* Hardware Accelerator Target */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Accelerator Target Device:
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              {[
                { id: 'NPU_HEXAGON', label: 'Hexagon NPU', desc: 'INT4/INT8 Coprocessor' },
                { id: 'GPU_ADRENO', label: 'Adreno GPU', desc: 'Vulkan FP16 Tensor' },
                { id: 'GPU_MALI', label: 'ARM Mali GPU', desc: 'OpenCL Compute' },
                { id: 'CPU_ARM_NEON', label: 'ARM CPU NEON', desc: 'Multithreaded SIMD' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setAccelerator(opt.id as NnapiAccelerator)}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    accelerator === opt.id
                      ? 'bg-amber-400/10 border-amber-400 text-amber-300 font-bold'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <div className="text-xs">{opt.label}</div>
                  <div className="text-[10px] text-neutral-500">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Thread Count */}
          <div>
            <div className="flex items-center justify-between text-xs font-medium text-neutral-300 mb-1">
              <span>CPU / Worker Threads:</span>
              <span className="font-mono text-amber-400">{threadCount} Threads</span>
            </div>
            <input
              type="range"
              min="1"
              max="8"
              value={threadCount}
              onChange={e => setThreadCount(Number(e.target.value))}
              className="w-full accent-amber-400"
            />
          </div>

          {/* Context Length */}
          <div>
            <div className="flex items-center justify-between text-xs font-medium text-neutral-300 mb-1">
              <span>Context Window (Tokens):</span>
              <span className="font-mono text-amber-400">{contextLength} ctx</span>
            </div>
            <input
              type="range"
              min="1024"
              max="8192"
              step="1024"
              value={contextLength}
              onChange={e => setContextLength(Number(e.target.value))}
              className="w-full accent-amber-400"
            />
          </div>

          {/* KV Cache Quantization */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              KV Cache Quantization:
            </label>
            <div className="grid grid-cols-3 gap-2 text-xs font-mono">
              {['FP16', 'Q8_0', 'Q4_0'].map(q => (
                <button
                  key={q}
                  onClick={() => setKvCacheQuant(q as 'FP16' | 'Q8_0' | 'Q4_0')}
                  className={`py-1.5 rounded border text-center transition-colors ${
                    kvCacheQuant === q
                      ? 'bg-amber-400 text-neutral-950 font-bold border-amber-400'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* FP16 Relaxed Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-950 border border-neutral-800">
            <div>
              <div className="text-xs font-medium text-neutral-200">Relaxed FP16 Precision</div>
              <div className="text-[11px] text-neutral-400">Enables ANeuralNetworksCompilation_setPreference</div>
            </div>
            <button
              onClick={() => setFp16Relaxed(!fp16Relaxed)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${
                fp16Relaxed ? 'bg-amber-400' : 'bg-neutral-800'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-neutral-950 transition-transform mt-0.5 ml-0.5 ${
                  fp16Relaxed ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Run Benchmark Button */}
          <button
            onClick={handleRunBenchmark}
            disabled={isBenchmarking}
            className="w-full py-3 rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-amber-400/20"
          >
            {isBenchmarking ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Benchmarking Tensor Pipeline ({benchmarkProgress}%)...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Run Hardware Benchmark</span>
              </>
            )}
          </button>
        </div>

        {/* Live Metrics Column */}
        <div className="lg:col-span-7 space-y-5">
          <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="text-sm font-bold text-neutral-200 flex items-center gap-2 font-mono">
                <Activity className="w-4 h-4 text-amber-400" />
                <span>Inference Telemetry & Memory Profile</span>
              </h3>
              <span className="text-xs font-mono text-emerald-400">
                {metrics.generationTokensPerSec} tokens/sec
              </span>
            </div>

            {/* Key KPI Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800">
                <div className="text-[11px] font-mono text-neutral-400 mb-1 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>Throughput</span>
                </div>
                <div className="text-xl font-bold font-mono text-amber-400 tabular-nums">
                  {metrics.generationTokensPerSec} <span className="text-xs font-normal text-neutral-400">t/s</span>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800">
                <div className="text-[11px] font-mono text-neutral-400 mb-1 flex items-center gap-1">
                  <Activity className="w-3 h-3 text-cyan-400" />
                  <span>Time to First Token</span>
                </div>
                <div className="text-xl font-bold font-mono text-cyan-400 tabular-nums">
                  {metrics.timeToFirstTokenMs} <span className="text-xs font-normal text-neutral-400">ms</span>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800">
                <div className="text-[11px] font-mono text-neutral-400 mb-1 flex items-center gap-1">
                  <HardDrive className="w-3 h-3 text-purple-400" />
                  <span>Total System RAM</span>
                </div>
                <div className="text-xl font-bold font-mono text-purple-400 tabular-nums">
                  {metrics.totalRamMb} <span className="text-xs font-normal text-neutral-400">MB</span>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800">
                <div className="text-[11px] font-mono text-neutral-400 mb-1 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-neutral-400" />
                  <span>KV Cache RAM</span>
                </div>
                <div className="text-xl font-bold font-mono text-neutral-200 tabular-nums">
                  {metrics.kvCacheRamMb} <span className="text-xs font-normal text-neutral-400">MB</span>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800">
                <div className="text-[11px] font-mono text-neutral-400 mb-1 flex items-center gap-1">
                  <BatteryCharging className="w-3 h-3 text-emerald-400" />
                  <span>Power Draw</span>
                </div>
                <div className="text-xl font-bold font-mono text-emerald-400 tabular-nums">
                  {metrics.powerDrawWatts} <span className="text-xs font-normal text-neutral-400">W</span>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800">
                <div className="text-[11px] font-mono text-neutral-400 mb-1 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-rose-400" />
                  <span>Thermal Index</span>
                </div>
                <div className="text-xl font-bold font-mono text-rose-400 tabular-nums">
                  {metrics.thermalIndexPct}%
                </div>
              </div>
            </div>

            {/* Memory Allocation Breakdown Bar */}
            <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-neutral-300">
                <span>Unified RAM Distribution:</span>
                <span className="text-neutral-400">{metrics.totalRamMb} MB Total</span>
              </div>
              <div className="w-full h-3 rounded-full bg-neutral-800 overflow-hidden flex">
                <div
                  className="bg-amber-400 h-full"
                  style={{ width: `${(metrics.modelRamMb / metrics.totalRamMb) * 100}%` }}
                  title={`Model Weights: ${metrics.modelRamMb} MB`}
                />
                <div
                  className="bg-purple-500 h-full"
                  style={{ width: `${(metrics.kvCacheRamMb / metrics.totalRamMb) * 100}%` }}
                  title={`KV Cache: ${metrics.kvCacheRamMb} MB`}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span>Model Weights ({metrics.modelRamMb} MB)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  <span>KV Cache Context ({metrics.kvCacheRamMb} MB)</span>
                </div>
              </div>
            </div>

            {/* NNAPI Architecture Note */}
            <div className="p-3.5 rounded-lg bg-neutral-950/70 border border-neutral-800 text-xs text-neutral-400 leading-relaxed font-mono">
              <div className="text-neutral-200 font-semibold mb-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zero-Copy Tensor Memory Pipeline</span>
              </div>
              <div>
                Model weights are memory-mapped (<code className="text-amber-400">mmap</code>) with zero Android JVM heap allocation. The NNAPI compilation assigns operations directly to the hardware DSP/NPU pipeline, allowing offline mobile task execution without thermal throttling.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
