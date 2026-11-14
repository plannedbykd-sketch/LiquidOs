/**
 * GGUF Model Management Engine for LiquidOS
 * Handles browsing, downloading, storage accounting, and switching between local GGUF models.
 */

import { GgufQuantization, NnapiAccelerator } from './gguf_engine';

export interface ManagedGgufModel {
  id: string;
  name: string;
  filename: string;
  parametersB: number;
  quantization: GgufQuantization;
  contextLength: number;
  sizeBytesMb: number;
  recommendedNnapi: NnapiAccelerator;
  minRamRequiredMb: number;
  installed: boolean;
  downloadProgress?: number; // 0 to 100
  downloadSpeedMbS?: number;
  checksumSha256: string;
  license: string;
  description: string;
  tags: string[];
}

export const GGUF_CATALOG: ManagedGgufModel[] = [
  {
    id: 'llama-3.2-3b-q4km',
    name: 'Llama 3.2 3B Instruct',
    filename: 'Llama-3.2-3B-Instruct.Q4_K_M.gguf',
    parametersB: 3.2,
    quantization: 'Q4_K_M',
    contextLength: 4096,
    sizeBytesMb: 2048,
    recommendedNnapi: 'NPU_HEXAGON',
    minRamRequiredMb: 2450,
    installed: true,
    checksumSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    license: 'Llama 3.2 Community',
    description: 'Ultra-fast edge instruction model optimized for Qualcomm Hexagon NPU tensor cores.',
    tags: ['NPU Optimized', 'Recommended', 'Low Latency'],
  },
  {
    id: 'llama-3.2-1b-q40',
    name: 'Llama 3.2 1B Instruct',
    filename: 'Llama-3.2-1B-Instruct.Q4_0.gguf',
    parametersB: 1.2,
    quantization: 'Q4_0',
    contextLength: 8192,
    sizeBytesMb: 780,
    recommendedNnapi: 'NPU_HEXAGON',
    minRamRequiredMb: 1100,
    installed: true,
    checksumSha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    license: 'Llama 3.2 Community',
    description: 'Featherweight 780MB model for instant low-power background task automation.',
    tags: ['Ultra Lightweight', 'Fast TTFT'],
  },
  {
    id: 'qwen2.5-coder-7b-q40',
    name: 'Qwen 2.5 Coder 7B Instruct',
    filename: 'Qwen-2.5-Coder-7B-Instruct.Q4_0.gguf',
    parametersB: 7.2,
    quantization: 'Q4_0',
    contextLength: 8192,
    sizeBytesMb: 4180,
    recommendedNnapi: 'GPU_ADRENO',
    minRamRequiredMb: 4900,
    installed: false,
    checksumSha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    license: 'Apache 2.0',
    description: 'Elite programming and disassembly model with Ghidra AST decompiler comprehension.',
    tags: ['Decompilation', 'Reverse Engineering', 'Code'],
  },
  {
    id: 'deepseek-r1-distill-7b-q8',
    name: 'DeepSeek R1 Distill Qwen 7B',
    filename: 'DeepSeek-R1-Distill-Qwen-7B.Q8_0.gguf',
    parametersB: 7.6,
    quantization: 'Q8_0',
    contextLength: 4096,
    sizeBytesMb: 7600,
    recommendedNnapi: 'NPU_HEXAGON',
    minRamRequiredMb: 8400,
    installed: false,
    checksumSha256: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
    license: 'MIT',
    description: 'High-precision chain-of-thought mathematical and cryptographic deduction model.',
    tags: ['Chain of Thought', 'Complex Reasoning'],
  },
  {
    id: 'mistral-7b-instruct-q4km',
    name: 'Mistral 7B Instruct v0.3',
    filename: 'Mistral-7B-Instruct-v0.3.Q4_K_M.gguf',
    parametersB: 7.3,
    quantization: 'Q4_K_M',
    contextLength: 16384,
    sizeBytesMb: 4370,
    recommendedNnapi: 'GPU_ADRENO',
    minRamRequiredMb: 5200,
    installed: false,
    checksumSha256: 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
    license: 'Apache 2.0',
    description: 'Versatile general-purpose instruction model with 16k native sliding-window attention.',
    tags: ['Long Context', 'General Instruction'],
  },
  {
    id: 'gemma-2-2b-fp16',
    name: 'Gemma 2 2B IT',
    filename: 'Gemma-2-2B-IT.FP16.gguf',
    parametersB: 2.2,
    quantization: 'FP16',
    contextLength: 4096,
    sizeBytesMb: 4400,
    recommendedNnapi: 'GPU_MALI',
    minRamRequiredMb: 4800,
    installed: false,
    checksumSha256: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
    license: 'Gemma Terms',
    description: 'Uncompressed FP16 baseline model providing maximum precision output tensor alignment.',
    tags: ['FP16 High Fidelity', 'Google'],
  },
  {
    id: 'phi-3.5-mini-q4km',
    name: 'Phi 3.5 Mini Instruct',
    filename: 'Phi-3.5-mini-instruct.Q4_K_M.gguf',
    parametersB: 3.8,
    quantization: 'Q4_K_M',
    contextLength: 128000,
    sizeBytesMb: 2390,
    recommendedNnapi: 'CPU_ARM_NEON',
    minRamRequiredMb: 2900,
    installed: false,
    checksumSha256: 'fcde2b2edba56bf408601fb721fe9b5c338d10ee429ea04fae5511b68fbf8fb9',
    license: 'MIT',
    description: 'Massive 128k context window support in a compact 3.8B parameter footprint.',
    tags: ['128k Window', 'Compact'],
  },
];

export class ModelManager {
  private models: ManagedGgufModel[];
  private activeModelId: string;
  private totalStorageBudgetMb: number;

  constructor(initialModels = GGUF_CATALOG, activeId = 'llama-3.2-3b-q4km', totalStorageMb = 16384) {
    this.models = JSON.parse(JSON.stringify(initialModels));
    this.activeModelId = activeId;
    this.totalStorageBudgetMb = totalStorageMb;
  }

  public getCatalog(): ManagedGgufModel[] {
    return this.models;
  }

  public getInstalledModels(): ManagedGgufModel[] {
    return this.models.filter(m => m.installed);
  }

  public getActiveModel(): ManagedGgufModel {
    const active = this.models.find(m => m.id === this.activeModelId);
    if (!active) {
      return this.models[0];
    }
    return active;
  }

  public setActiveModel(modelId: string): boolean {
    const target = this.models.find(m => m.id === modelId);
    if (!target) return false;
    if (!target.installed) {
      throw new Error(`Cannot activate model ${target.name}: model is not installed locally.`);
    }
    this.activeModelId = modelId;
    return true;
  }

  public getUsedStorageMb(): number {
    return this.models
      .filter(m => m.installed)
      .reduce((sum, m) => sum + m.sizeBytesMb, 0);
  }

  public getAvailableStorageMb(): number {
    return Math.max(0, this.totalStorageBudgetMb - this.getUsedStorageMb());
  }

  public getTotalStorageMb(): number {
    return this.totalStorageBudgetMb;
  }

  public installModel(modelId: string): ManagedGgufModel {
    const model = this.models.find(m => m.id === modelId);
    if (!model) throw new Error(`Model ${modelId} not found in catalog.`);
    if (model.installed) return model;

    if (this.getAvailableStorageMb() < model.sizeBytesMb) {
      throw new Error(
        `Insufficient storage: requires ${model.sizeBytesMb} MB, but only ${this.getAvailableStorageMb()} MB available.`
      );
    }

    model.installed = true;
    model.downloadProgress = 100;
    return model;
  }

  public deleteModel(modelId: string): boolean {
    const model = this.models.find(m => m.id === modelId);
    if (!model || !model.installed) return false;

    // Do not allow deleting active model if it is the only installed model
    const installed = this.getInstalledModels();
    if (installed.length <= 1) {
      throw new Error('Cannot delete the last remaining installed model.');
    }

    model.installed = false;
    model.downloadProgress = 0;

    // If active model was deleted, switch to another installed model
    if (this.activeModelId === modelId) {
      const remaining = this.models.find(m => m.installed && m.id !== modelId);
      if (remaining) {
        this.activeModelId = remaining.id;
      }
    }
    return true;
  }
}
