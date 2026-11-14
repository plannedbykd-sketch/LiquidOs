import React from 'react';
import { Cpu, ShieldCheck, Zap } from 'lucide-react';

export type ActiveTab = 'simulator' | 'claude_api' | 'gguf_nnapi' | 'a2d_vault' | 'codebase' | 'google_chat' | 'google_drive';

interface HeaderProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onIgnitePlane: () => void;
  isAirGapped: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onIgnitePlane,
  isAirGapped,
}) => {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between gap-4 px-4 xl:px-6 py-3.5 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => onSelectTab('simulator')}
          className="flex items-center gap-2 text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded"
          aria-label="LiquidOS Home"
        >
          <span className="text-xl font-extrabold tracking-wider text-amber-400 font-mono transition-transform group-hover:scale-105">
            LIQUID/OS
          </span>
          <span className="hidden xl:inline-block text-xs font-mono px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400">
            v2.4-NNAPI
          </span>
        </button>
      </div>

      {/* Zone 2: Clean single-line text navigation links */}
      <nav className="hidden lg:flex items-center gap-3.5 xl:gap-5 text-xs xl:text-sm font-medium text-neutral-400">
        <button
          onClick={() => onSelectTab('simulator')}
          className={`transition-colors whitespace-nowrap shrink-0 hover:text-neutral-100 cursor-pointer ${
            activeTab === 'simulator' ? 'text-amber-400 font-semibold' : ''
          }`}
        >
          Flutter Simulator
        </button>
        <button
          onClick={() => onSelectTab('claude_api')}
          className={`transition-colors whitespace-nowrap shrink-0 hover:text-neutral-100 cursor-pointer ${
            activeTab === 'claude_api' ? 'text-amber-400 font-semibold' : ''
          }`}
        >
          Claude 3.5 API
        </button>
        <button
          onClick={() => onSelectTab('gguf_nnapi')}
          className={`transition-colors whitespace-nowrap shrink-0 hover:text-neutral-100 cursor-pointer ${
            activeTab === 'gguf_nnapi' ? 'text-amber-400 font-semibold' : ''
          }`}
        >
          GGUF & NNAPI
        </button>
        <button
          onClick={() => onSelectTab('a2d_vault')}
          className={`transition-colors whitespace-nowrap shrink-0 hover:text-neutral-100 cursor-pointer ${
            activeTab === 'a2d_vault' ? 'text-amber-400 font-semibold' : ''
          }`}
        >
          A2D Vault
        </button>
        <button
          onClick={() => onSelectTab('google_chat')}
          className={`transition-colors whitespace-nowrap shrink-0 hover:text-neutral-100 cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'google_chat' ? 'text-amber-400 font-semibold' : ''
          }`}
        >
          <span>Google Chat</span>
        </button>
        <button
          onClick={() => onSelectTab('google_drive')}
          className={`transition-colors whitespace-nowrap shrink-0 hover:text-neutral-100 cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'google_drive' ? 'text-amber-400 font-semibold' : ''
          }`}
        >
          <span>Google Drive</span>
        </button>
        <button
          onClick={() => onSelectTab('codebase')}
          className={`transition-colors whitespace-nowrap shrink-0 hover:text-neutral-100 cursor-pointer ${
            activeTab === 'codebase' ? 'text-amber-400 font-semibold' : ''
          }`}
        >
          Dart Codebase
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <div
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded border ${
            isAirGapped
              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-400'
              : 'bg-amber-950/40 border-amber-800 text-amber-300'
          }`}
          title={isAirGapped ? 'Zero network data egress (Air-Gapped)' : 'Hybrid cloud acceleration connected'}
        >
          {isAirGapped ? <ShieldCheck className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
          <span>{isAirGapped ? 'AIR-GAPPED' : 'HYBRID'}</span>
        </div>

        <button
          onClick={onIgnitePlane}
          className="px-4 py-2 text-xs font-bold tracking-wide uppercase text-neutral-950 bg-amber-400 hover:bg-amber-300 active:scale-95 transition-all rounded shadow-md shadow-amber-400/20 whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Ignite Your Plane</span>
        </button>
      </div>
    </header>
  );
};
