import React, { useState } from 'react';
import {
  Code2,
  FileCode,
  FolderTree,
  Copy,
  Check,
  Download,
  BookOpen,
  Layers,
  Cpu,
  Shield,
  Terminal,
} from 'lucide-react';
import { DART_FLUTTER_PROJECT_FILES, DartSourceFile } from '../data/dart_flutter_codebase';

export const DartCodebaseView: React.FC = () => {
  const [selectedFilePath, setSelectedFilePath] = useState<string>(DART_FLUTTER_PROJECT_FILES[1].path);
  const [copied, setCopied] = useState<boolean>(false);

  const activeFile =
    DART_FLUTTER_PROJECT_FILES.find(f => f.path === selectedFilePath) ||
    DART_FLUTTER_PROJECT_FILES[0];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadAll = () => {
    const combinedContent = DART_FLUTTER_PROJECT_FILES.map(
      f => `// ==========================================\n// FILE: ${f.path}\n// MODULE: ${f.module}\n// ==========================================\n\n${f.code}\n\n`
    ).join('\n');

    const blob = new Blob([combinedContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'liquid_os_dart_flutter_codebase.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* Banner */}
      <div className="p-6 rounded-xl bg-neutral-900 border border-neutral-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Code2 className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl font-bold text-neutral-100 font-sans">
                Modular Dart & Flutter Source Codebase
              </h2>
            </div>
            <p className="text-sm text-neutral-400 max-w-3xl leading-relaxed">
              Fully documented, production-ready Dart packages and Flutter screens implementing local GGUF models, Android NNAPI FFI coprocessor delegates, A2D air-gapped cryptographic vaults, and Anthropic Claude 3.5 API clients.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleDownloadAll}
              className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium text-xs flex items-center gap-2 border border-neutral-700 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>Export Code Bundle</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Two-Column View: File Explorer (Left) & Code Viewer (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: File Tree Explorer */}
        <div className="lg:col-span-4 p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <h3 className="text-xs font-bold text-neutral-300 font-mono uppercase tracking-wider flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-amber-400" />
              <span>Flutter Project Tree</span>
            </h3>
            <span className="text-[11px] font-mono text-neutral-400">
              {DART_FLUTTER_PROJECT_FILES.length} Files
            </span>
          </div>

          {/* Files List */}
          <div className="space-y-1 font-mono text-xs">
            {DART_FLUTTER_PROJECT_FILES.map(file => {
              const isSelected = file.path === selectedFilePath;
              return (
                <button
                  key={file.path}
                  onClick={() => setSelectedFilePath(file.path)}
                  className={`w-full text-left p-2.5 rounded-lg transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-amber-400/10 border border-amber-400/80 text-amber-300 font-semibold'
                      : 'hover:bg-neutral-800/60 text-neutral-400 hover:text-neutral-200 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileCode className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-amber-400' : 'text-neutral-500'}`} />
                    <span className="truncate">{file.path}</span>
                  </div>
                  <span className="text-[10px] text-neutral-500 font-sans px-1.5 py-0.5 rounded bg-neutral-950 shrink-0">
                    {file.module}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Architecture Guidelines & Documentation */}
          <div className="pt-4 border-t border-neutral-800 space-y-3 text-xs">
            <div className="font-semibold text-neutral-300 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span>Modular Architecture Guide</span>
            </div>
            <div className="space-y-2 text-neutral-400 text-[11px] leading-relaxed">
              <div>
                <strong className="text-neutral-200">1. Tensor Boundary:</strong> All model weights reside in <code className="text-amber-300">assets/models/</code> and are loaded through FFI without copying into Dart heap.
              </div>
              <div>
                <strong className="text-neutral-200">2. A2D Security:</strong> Memory traces and user conversations are encrypted before committing to disk.
              </div>
              <div>
                <strong className="text-neutral-200">3. Plugin Hot-Swapping:</strong> Implement <code className="text-amber-300">LiquidPlugin</code> to add custom reverse-engineering tools.
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Code Viewer with Documentation */}
        <div className="lg:col-span-8 p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4">
          {/* File Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-neutral-100">
                  {activeFile.path}
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-amber-400">
                  {activeFile.module}
                </span>
              </div>
              <div className="text-xs text-neutral-400 mt-1">{activeFile.description}</div>
            </div>

            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-xs font-mono text-neutral-300 hover:text-amber-400 flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy File'}</span>
            </button>
          </div>

          {/* Syntax Code Container */}
          <div className="relative rounded-lg bg-neutral-950 border border-neutral-800 overflow-hidden">
            <pre className="p-4 text-xs font-mono text-neutral-200 overflow-x-auto max-h-[560px] leading-relaxed select-text">
              <code>{activeFile.code}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
