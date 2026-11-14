/**
 * GGUF Model Runtime & Android NNAPI Tensor Acceleration Engine
 * Simulates mobile hardware tensor scheduling, memory allocation, and quantization throughput.
 */

export type GgufQuantization = 'Q4_0' | 'Q4_K_M' | 'Q5_K_M' | 'Q8_0' | 'FP16';
export type NnapiAccelerator = 'NPU_HEXAGON' | 'GPU_ADRENO' | 'GPU_MALI' | 'CPU_ARM_NEON';

export interface GgufModelProfile {
  id: string;
  name: string;
  parametersB: number; // e.g. 3.2 for 3.2B
  defaultQuant: GgufQuantization;
  contextWindow: number;
  layers: number;
  heads: number;
  headDim: number;
  fileSizeBytesMb: number;
  recommendedNnapi: NnapiAccelerator;
  description: string;
}

export interface NnapiHardwareConfig {
  accelerator: NnapiAccelerator;
  threadCount: number;
  batchSize: number;
  contextLength: number;
  fp16Relaxed: boolean;
  kvCacheQuant: 'FP16' | 'Q8_0' | 'Q4_0';
}

export interface TensorInferenceMetrics {
  modelRamMb: number;
  kvCacheRamMb: number;
  totalRamMb: number;
  timeToFirstTokenMs: number;
  generationTokensPerSec: number;
  memoryBandwidthGbPerSec: number;
  thermalIndexPct: number; // 0-100
  powerDrawWatts: number;
}

export const GGUF_PRESET_MODELS: GgufModelProfile[] = [
  {
    id: 'llama-3.2-3b-q4km',
    name: 'Llama-3.2-3B-Instruct.Q4_K_M.gguf',
    parametersB: 3.2,
    defaultQuant: 'Q4_K_M',
    contextWindow: 4096,
    layers: 28,
    heads: 24,
    headDim: 128,
    fileSizeBytesMb: 2048,
    recommendedNnapi: 'NPU_HEXAGON',
    description: 'High-speed reasoning model tailored for mobile NPU coprocessors.',
  },
  {
    id: 'qwen2.5-coder-7b-q40',
    name: 'Qwen-2.5-Coder-7B-Instruct.Q4_0.gguf',
    parametersB: 7.2,
    defaultQuant: 'Q4_0',
    contextWindow: 8192,
    layers: 32,
    heads: 32,
    headDim: 128,
    fileSizeBytesMb: 4180,
    recommendedNnapi: 'GPU_ADRENO',
    description: 'Specialized code generation & binary disassembly decompilation model.',
  },
  {
    id: 'deepseek-r1-distill-7b-q8',
    name: 'DeepSeek-R1-Distill-Qwen-7B.Q8_0.gguf',
    parametersB: 7.6,
    defaultQuant: 'Q8_0',
    contextWindow: 4096,
    layers: 32,
    heads: 32,
    headDim: 128,
    fileSizeBytesMb: 7600,
    recommendedNnapi: 'NPU_HEXAGON',
    description: 'High-precision mathematical reasoning with detailed chain-of-thought.',
  },
  {
    id: 'gemma-2-2b-fp16',
    name: 'Gemma-2-2B-IT.FP16.gguf',
    parametersB: 2.2,
    defaultQuant: 'FP16',
    contextWindow: 4096,
    layers: 26,
    heads: 16,
    headDim: 256,
    fileSizeBytesMb: 4400,
    recommendedNnapi: 'GPU_MALI',
    description: 'Uncompressed FP16 mobile baseline for tensor fidelity testing.',
  },
];

export class GgufEngine {
  /**
   * Calculates bits per weight based on quantization type
   */
  public static getBitsPerWeight(quant: GgufQuantization): number {
    switch (quant) {
      case 'Q4_0':
        return 4.5;
      case 'Q4_K_M':
        return 4.8;
      case 'Q5_K_M':
        return 5.5;
      case 'Q8_0':
        return 8.5;
      case 'FP16':
        return 16.0;
    }
  }

  /**
   * Calculates KV Cache memory footprint in Megabytes
   * Formula: 2 * layers * heads * headDim * contextLength * bytesPerElement
   */
  public static calculateKvCacheRamMb(
    layers: number,
    heads: number,
    headDim: number,
    contextLength: number,
    kvQuant: 'FP16' | 'Q8_0' | 'Q4_0' = 'FP16'
  ): number {
    const bytesPerElement = kvQuant === 'FP16' ? 2 : kvQuant === 'Q8_0' ? 1 : 0.5;
    const totalBytes = 2 * layers * heads * headDim * contextLength * bytesPerElement;
    return Math.round((totalBytes / (1024 * 1024)) * 10) / 10;
  }

  /**
   * Calculates Model RAM footprint in Megabytes
   */
  public static calculateModelRamMb(paramsB: number, quant: GgufQuantization): number {
    const bitsPerWeight = this.getBitsPerWeight(quant);
    const weightBytes = (paramsB * 1e9 * bitsPerWeight) / 8;
    // Add 15% runtime overhead for memory buffers, scratchpad, and embedding table
    return Math.round((weightBytes / (1024 * 1024)) * 1.15);
  }

  /**
   * Computes comprehensive hardware tensor inference metrics under NNAPI
   */
  public static computeMetrics(model: GgufModelProfile, config: NnapiHardwareConfig): TensorInferenceMetrics {
    const modelRamMb = this.calculateModelRamMb(model.parametersB, model.defaultQuant);
    const kvCacheRamMb = this.calculateKvCacheRamMb(
      model.layers,
      model.heads,
      model.headDim,
      config.contextLength,
      config.kvCacheQuant
    );
    const totalRamMb = modelRamMb + kvCacheRamMb;

    // Accelerator multipliers
    let speedMultiplier = 1.0;
    let powerWatts = 3.5;
    let ttftBaseMs = 120;

    switch (config.accelerator) {
      case 'NPU_HEXAGON':
        // NPU excels at quantized INT4/INT8 operations with high TOPS/Watt
        speedMultiplier = model.defaultQuant.startsWith('Q4') ? 2.8 : model.defaultQuant === 'Q8_0' ? 2.3 : 1.2;
        powerWatts = 2.4;
        ttftBaseMs = 45;
        break;
      case 'GPU_ADRENO':
        // GPU excels at FP16 and larger batch processing
        speedMultiplier = model.defaultQuant === 'FP16' ? 2.6 : 2.1;
        powerWatts = 4.8;
        ttftBaseMs = 70;
        break;
      case 'GPU_MALI':
        speedMultiplier = model.defaultQuant === 'FP16' ? 2.2 : 1.8;
        powerWatts = 4.2;
        ttftBaseMs = 85;
        break;
      case 'CPU_ARM_NEON':
        // CPU scaling depends on thread count
        speedMultiplier = 0.8 + (config.threadCount / 8) * 0.7;
        powerWatts = 5.6;
        ttftBaseMs = 190;
        break;
    }

    // FP16 relaxed optimization boost
    if (config.fp16Relaxed) {
      speedMultiplier *= 1.12;
      ttftBaseMs *= 0.92;
    }

    // Size penalty: smaller parameter models execute faster
    const baseTokensPerSec = 45 / Math.sqrt(model.parametersB);
    const generationTokensPerSec = Math.round(baseTokensPerSec * speedMultiplier * 10) / 10;
    const timeToFirstTokenMs = Math.round(ttftBaseMs * Math.sqrt(model.parametersB));
    const memoryBandwidthGbPerSec = Math.round(
      ((modelRamMb * generationTokensPerSec) / 1024) * 0.85 * 10
    ) / 10;

    // Thermal throttling index
    const thermalIndexPct = Math.min(
      95,
      Math.round(25 + powerWatts * 8 + (generationTokensPerSec > 25 ? 18 : 5))
    );

    return {
      modelRamMb,
      kvCacheRamMb,
      totalRamMb,
      timeToFirstTokenMs,
      generationTokensPerSec,
      memoryBandwidthGbPerSec,
      thermalIndexPct,
      powerDrawWatts: Math.round(powerWatts * 10) / 10,
    };
  }
}
