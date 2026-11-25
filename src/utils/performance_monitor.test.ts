import test from 'node:test';
import assert from 'node:assert/strict';
import { GGUF_PRESET_MODELS, NnapiHardwareConfig } from './gguf_engine';
import {
  appendTelemetrySample,
  computeMemoryBreakdown,
  createInitialTelemetryHistory,
  formatMemoryGb,
  sampleTelemetryPoint,
  summarizeTelemetry,
} from './performance_monitor';

const defaultConfig: NnapiHardwareConfig = {
  accelerator: 'NPU_HEXAGON',
  threadCount: 4,
  batchSize: 512,
  contextLength: 4096,
  fp16Relaxed: true,
  kvCacheQuant: 'FP16',
};

test('computeMemoryBreakdown sums model weights, KV cache, and runtime overhead accurately', () => {
  const llama = GGUF_PRESET_MODELS[0];
  const breakdown = computeMemoryBreakdown(llama, defaultConfig, 'streaming_chat', 12288);

  assert.equal(
    Math.round((breakdown.modelWeightsMb + breakdown.kvCacheMb + breakdown.runtimeOverheadMb) * 10) / 10,
    breakdown.usedTotalMb
  );
  assert.ok(breakdown.usedTotalMb > 0);
  assert.ok(breakdown.freeMemoryMb > 0);
  assert.ok(breakdown.usagePct > 0 && breakdown.usagePct < 100);
});

test('sampleTelemetryPoint produces valid CPU/GPU usage, tokens/sec, and memory metrics across modes', () => {
  const llama = GGUF_PRESET_MODELS[0];

  const streamingSample = sampleTelemetryPoint({
    sampleIndex: 3,
    model: llama,
    config: defaultConfig,
    workloadMode: 'streaming_chat',
  });
  assert.ok(streamingSample.tokensPerSec > 10);
  assert.ok(streamingSample.cpuUsagePct >= 0 && streamingSample.cpuUsagePct <= 100);
  assert.ok(streamingSample.gpuUsagePct >= 0 && streamingSample.gpuUsagePct <= 100);
  assert.equal(streamingSample.phase, 'Token Decoding');

  const idleSample = sampleTelemetryPoint({
    sampleIndex: 4,
    model: llama,
    config: defaultConfig,
    workloadMode: 'idle',
  });
  assert.equal(idleSample.tokensPerSec, 0);
  assert.equal(idleSample.phase, 'Idle');
});

test('appendTelemetrySample enforces bounded rolling ring buffer', () => {
  const llama = GGUF_PRESET_MODELS[0];
  let history = createInitialTelemetryHistory({
    model: llama,
    config: defaultConfig,
    count: 10,
  });
  assert.equal(history.length, 10);

  for (let i = 11; i <= 15; i++) {
    const next = sampleTelemetryPoint({
      sampleIndex: i,
      model: llama,
      config: defaultConfig,
      workloadMode: 'streaming_chat',
    });
    history = appendTelemetrySample(history, next, 12);
  }

  assert.equal(history.length, 12);
  assert.equal(history[history.length - 1].id, 15);
});

test('summarizeTelemetry classifies memory pressure and CPU bottlenecks with clear guidance', () => {
  const deepseekQ8 = GGUF_PRESET_MODELS.find(m => m.id === 'deepseek-r1-distill-7b-q8')!;
  const cpuConfig: NnapiHardwareConfig = {
    ...defaultConfig,
    accelerator: 'CPU_ARM_NEON',
  };

  const deepseekHistory = createInitialTelemetryHistory({
    model: deepseekQ8,
    config: cpuConfig,
    workloadMode: 'heavy_batch',
    count: 10,
  });

  const summary = summarizeTelemetry(
    deepseekHistory,
    deepseekQ8,
    cpuConfig,
    'heavy_batch',
    12288
  );

  assert.equal(summary.healthStatus, 'Memory Constrained');
  assert.ok(summary.optimizationTip.includes('Hexagon NPU'));
  assert.equal(formatMemoryGb(2048), '2.00 GB');
  assert.equal(formatMemoryGb(512), '512 MB');
});
