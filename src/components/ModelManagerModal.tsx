import React, { useState } from 'react';
import {
  X,
  Cpu,
  Download,
  Trash2,
  CheckCircle,
  HardDrive,
  Sliders,
  Search,
  Sparkles,
  Zap,
  Shield,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { ManagedGgufModel, ModelManager } from '../utils/model_manager';

interface ModelManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  modelManager: ModelManager;
  activeModelId: string;
  onSelectModel: (model: ManagedGgufModel) => void;
  onUpdate: () => void;
}

export const ModelManagerModal: React.FC<ModelManagerModalProps> = ({
  isOpen,
  onClose,
  modelManager,
  activeModelId,
  onSelectModel,
  onUpdate,
}) => {
  const [filter, setFilter] = useState<'all' | 'installed' | 'available'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [downloadSpeed, setDownloadSpeed] = useState<number>(0);

  if (!isOpen) return null;

  const catalog = modelManager.getCatalog();
  const totalStorage = modelManager.getTotalStorageMb();
  const usedStorage = modelManager.getUsedStorageMb();
  const availableStorage = modelManager.getAvailableStorageMb();
  const usedPercentage = Math.round((usedStorage / totalStorage) * 100);

  const filteredModels = catalog.filter(m => {
    if (filter === 'installed' && !m.installed) return false;
    if (filter === 'available' && m.installed) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = m.name.toLowerCase().includes(q);
      const matchDesc = m.description.toLowerCase().includes(q);
      const matchTags = m.tags.some(t => t.toLowerCase().includes(q));
      if (!matchName && !matchDesc && !matchTags) return false;
    }
    return true;
  });

  const handleStartDownload = (model: ManagedGgufModel) => {
    if (downloadingId) return;
    setDownloadingId(model.id);
    setDownloadProgress(5);
    setDownloadSpeed(84.5);

    // Simulate real chunked GGUF download with realistic NNAPI weight parsing
    let current = 5;
    const interval = setInterval(() => {
      current += Math.floor(Math.random() * 18) + 12;
      if (current >= 100) {
        clearInterval(interval);
        setDownloadProgress(100);
        setTimeout(() => {
          modelManager.installModel(model.id);
          setDownloadingId(null);
          setDownloadProgress(0);
          onUpdate();
        }, 500);
      } else {
        setDownloadProgress(current);
        setDownloadSpeed(Number((78 + Math.random() * 15).toFixed(1)));
      }
    }, 250);
  };

  const handleDelete = (modelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      modelManager.deleteModel(modelId);
      onUpdate();
    } catch (err: any) {
      alert(err.message || 'Unable to delete model');
    }
  };

  const handleActivate = (model: ManagedGgufModel) => {
    try {
      modelManager.setActiveModel(model.id);
      onSelectModel(model);
      onUpdate();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-400/10 border border-amber-400/20 text-amber-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-neutral-100 font-mono">
                  GGUF Model Management System
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  NNAPI Ready
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Browse, download, verify checksums, and switch local GGUF models offline.
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

        {/* Device Storage Status Bar */}
        <div className="px-6 py-3 bg-neutral-950/40 border-b border-neutral-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <HardDrive className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="flex-1 sm:w-64">
              <div className="flex justify-between mb-1">
                <span className="text-neutral-400">Local Storage Allocation</span>
                <span className="text-amber-400 font-bold">
                  {(usedStorage / 1024).toFixed(2)} GB / {(totalStorage / 1024).toFixed(0)} GB
                </span>
              </div>
              <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-amber-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${usedPercentage}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-neutral-400 shrink-0">
            <span>
              Available: <strong className="text-emerald-400">{(availableStorage / 1024).toFixed(2)} GB</strong>
            </span>
            <span>·</span>
            <span>
              Installed Models: <strong className="text-neutral-200">{modelManager.getInstalledModels().length}</strong>
            </span>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="px-6 py-3 border-b border-neutral-800 flex flex-col sm:flex-row gap-3 items-center justify-between bg-neutral-900/50">
          <div className="flex items-center gap-1.5 p-1 bg-neutral-950 rounded-lg border border-neutral-800 text-xs font-mono w-full sm:w-auto">
            {(['all', 'installed', 'available'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1 rounded text-xs capitalize transition-colors cursor-pointer ${
                  filter === tab
                    ? 'bg-amber-400 text-neutral-950 font-bold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {tab === 'all' ? `All (${catalog.length})` : tab === 'installed' ? `Installed (${modelManager.getInstalledModels().length})` : 'Available to Download'}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search models, tags, formats..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-400 font-mono"
            />
          </div>
        </div>

        {/* Model List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {filteredModels.length === 0 ? (
            <div className="text-center py-12 text-neutral-500 font-mono text-xs">
              No models matching the selected filter or query.
            </div>
          ) : (
            filteredModels.map(model => {
              const isActive = model.id === activeModelId;
              const isDownloading = downloadingId === model.id;

              return (
                <div
                  key={model.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isActive
                      ? 'bg-amber-950/20 border-amber-400/60 shadow-lg shadow-amber-400/5'
                      : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Model Info */}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-neutral-100 font-mono">
                          {model.name}
                        </span>
                        {isActive && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-400 text-neutral-950">
                            ACTIVE MODEL
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-800 text-amber-300 border border-neutral-700">
                          {model.quantization}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-800 text-neutral-300 border border-neutral-700">
                          {model.parametersB}B Params
                        </span>
                      </div>

                      <p className="text-xs text-neutral-400 leading-relaxed">
                        {model.description}
                      </p>

                      {/* Specs Row */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono text-neutral-500 pt-1">
                        <span className="flex items-center gap-1">
                          <HardDrive className="w-3 h-3 text-neutral-400" />
                          <span>Size: <strong className="text-neutral-300">{(model.sizeBytesMb / 1024).toFixed(2)} GB</strong></span>
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Cpu className="w-3 h-3 text-neutral-400" />
                          <span>NNAPI Affinity: <strong className="text-amber-400">{model.recommendedNnapi.replace('_', ' ')}</strong></span>
                        </span>
                        <span>·</span>
                        <span>
                          Context: <strong className="text-neutral-300">{model.contextLength.toLocaleString()} tokens</strong>
                        </span>
                        <span>·</span>
                        <span>
                          Min RAM: <strong className="text-neutral-300">{model.minRamRequiredMb} MB</strong>
                        </span>
                        <span>·</span>
                        <span className="text-neutral-600 truncate max-w-xs" title={`SHA-256: ${model.checksumSha256}`}>
                          SHA-256: {model.checksumSha256.slice(0, 12)}...
                        </span>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {model.tags.map(tag => (
                          <span
                            key={tag}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 font-mono"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-row lg:flex-col items-end justify-between lg:justify-center gap-2 shrink-0">
                      {model.installed ? (
                        <div className="flex items-center gap-2 w-full lg:w-auto">
                          {isActive ? (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/80 text-emerald-400 text-xs font-mono font-semibold">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Loaded in VRAM</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleActivate(model)}
                              className="px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold font-mono text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-400/20"
                            >
                              <span>Activate Model</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={e => handleDelete(model.id, e)}
                            className="p-2 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-950/20 border border-transparent hover:border-red-900/50 transition-colors cursor-pointer"
                            title="Delete model from device storage"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-full lg:w-48">
                          {isDownloading ? (
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-[11px] font-mono">
                                <span className="text-amber-400">Downloading... {downloadProgress}%</span>
                                <span className="text-neutral-400">{downloadSpeed} MB/s</span>
                              </div>
                              <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-amber-400 h-1.5 rounded-full transition-all"
                                  style={{ width: `${downloadProgress}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleStartDownload(model)}
                              disabled={downloadingId !== null || availableStorage < model.sizeBytesMb}
                              className={`w-full px-3.5 py-2 rounded-lg font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                availableStorage < model.sizeBytesMb
                                  ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                                  : 'bg-neutral-800 hover:bg-amber-400 hover:text-neutral-950 text-neutral-200 border border-neutral-700'
                              }`}
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>
                                {availableStorage < model.sizeBytesMb
                                  ? 'Insufficient Storage'
                                  : `Download GGUF (${(model.sizeBytesMb / 1024).toFixed(1)} GB)`}
                              </span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-800 bg-neutral-950/80 flex items-center justify-between text-xs font-mono text-neutral-500">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>Air-Gapped: Model files stored in local private application directory.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
