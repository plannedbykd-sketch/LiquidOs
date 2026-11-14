import test from 'node:test';
import assert from 'node:assert/strict';
import { GgufEngine, GGUF_PRESET_MODELS, NnapiHardwareConfig } from './gguf_engine';

test('GgufEngine computes correct bits per weight for quantization profiles', () => {
  assert.equal(GgufEngine.getBitsPerWeight('Q4_0'), 4.5);
  assert.equal(GgufEngine.getBitsPerWeight('Q4_K_M'), 4.8);
  assert.equal(GgufEngine.getBitsPerWeight('Q8_0'), 8.5);
  assert.equal(GgufEngine.getBitsPerWeight('FP16'), 16.0);
});

test('GgufEngine calculates KV cache RAM based on context window and quantization', () => {
  // Llama 3.2 3B: 28 layers, 24 heads, 128 headDim, 4096 context
  const kvFp16 = GgufEngine.calculateKvCacheRamMb(28, 24, 128, 4096, 'FP16');
  const kvQ8 = GgufEngine.calculateKvCacheRamMb(28, 24, 128, 4096, 'Q8_0');
  const kvQ4 = GgufEngine.calculateKvCacheRamMb(28, 24, 128, 4096, 'Q4_0');

  assert.ok(kvFp16 > 0);
  assert.equal(Math.round(kvFp16 / kvQ8), 2);
  assert.equal(Math.round(kvFp16 / kvQ4), 4);
});

test('GgufEngine computes NNAPI performance metrics with speedup for NPU on Q4 models', () => {
  const llamaModel = GGUF_PRESET_MODELS[0];
  const npuConfig: NnapiHardwareConfig = {
    accelerator: 'NPU_HEXAGON',
    threadCount: 4,
    batchSize: 512,
    contextLength: 2048,
    fp16Relaxed: true,
    kvCacheQuant: 'FP16',
  };

  const cpuConfig: NnapiHardwareConfig = {
    accelerator: 'CPU_ARM_NEON',
    threadCount: 4,
    batchSize: 512,
    contextLength: 2048,
    fp16Relaxed: false,
    kvCacheQuant: 'FP16',
  };

  const npuMetrics = GgufEngine.computeMetrics(llamaModel, npuConfig);
  const cpuMetrics = GgufEngine.computeMetrics(llamaModel, cpuConfig);

  // NPU should be faster and more power-efficient on quantized models than CPU
  assert.ok(npuMetrics.generationTokensPerSec > cpuMetrics.generationTokensPerSec);
  assert.ok(npuMetrics.timeToFirstTokenMs < cpuMetrics.timeToFirstTokenMs);
  assert.ok(npuMetrics.powerDrawWatts < cpuMetrics.powerDrawWatts);
  assert.ok(npuMetrics.totalRamMb > npuMetrics.modelRamMb);
});
