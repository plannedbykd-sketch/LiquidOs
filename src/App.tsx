/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Header, ActiveTab } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { FlutterSimulatorView } from './components/FlutterSimulatorView';
import { ClaudeApiInspectorView } from './components/ClaudeApiInspectorView';
import { GgufNnapiView } from './components/GgufNnapiView';
import { A2DVaultView } from './components/A2DVaultView';
import { DartCodebaseView } from './components/DartCodebaseView';
import { GoogleChatView } from './components/GoogleChatView';
import { GoogleDriveView } from './components/GoogleDriveView';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('simulator');
  const [showHero, setShowHero] = useState<boolean>(true);
  const [pendingShareChatText, setPendingShareChatText] = useState<string>('');
  const [pendingDriveExport, setPendingDriveExport] = useState<{ filename: string; content: string } | null>(null);

  const handleIgnitePlane = () => {
    setActiveTab('simulator');
    setShowHero(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExploreArchitecture = () => {
    setActiveTab('gguf_nnapi');
    setShowHero(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenGoogleChat = (textToShare?: string) => {
    if (textToShare) {
      setPendingShareChatText(textToShare);
    }
    setActiveTab('google_chat');
    setShowHero(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-950 text-neutral-100 font-sans selection:bg-amber-400 selection:text-neutral-950">
      {/* Top Bar Navigation */}
      <Header
        activeTab={activeTab}
        onSelectTab={tab => {
          setActiveTab(tab);
          setShowHero(false);
        }}
        onIgnitePlane={handleIgnitePlane}
        isAirGapped={true}
      />

      {/* Mobile Quick-Navigation Strip */}
      <div className="lg:hidden flex items-center overflow-x-auto gap-2 px-4 py-2.5 bg-neutral-900 border-b border-neutral-800 text-xs font-mono">
        {[
          { id: 'simulator', label: 'Flutter Simulator' },
          { id: 'claude_api', label: 'Claude 3.5 API' },
          { id: 'gguf_nnapi', label: 'GGUF & NNAPI' },
          { id: 'a2d_vault', label: 'A2D Vault' },
          { id: 'google_chat', label: 'Google Chat' },
          { id: 'google_drive', label: 'Google Drive' },
          { id: 'codebase', label: 'Dart Codebase' },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => {
              setActiveTab(item.id as ActiveTab);
              setShowHero(false);
            }}
            className={`px-3 py-1.5 rounded whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              activeTab === item.id
                ? 'bg-amber-400 text-neutral-950 font-bold'
                : 'bg-neutral-950 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Hero Section (collapsible / toggleable) */}
      {showHero && (
        <HeroSection
          onIgnitePlane={handleIgnitePlane}
          onExploreArchitecture={handleExploreArchitecture}
        />
      )}

      {/* Navigation Sub-Strip when Hero is hidden */}
      {!showHero && (
        <div className="bg-neutral-900/60 border-b border-neutral-800 px-6 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-mono">
            <span className="text-neutral-500">LIQUID/OS</span>
            <span className="text-neutral-600">/</span>
            <span className="text-amber-400 font-bold uppercase">{activeTab.replace('_', ' ')}</span>
          </div>

          <button
            onClick={() => setShowHero(true)}
            className="text-neutral-400 hover:text-amber-400 transition-colors font-mono text-[11px] cursor-pointer"
          >
            Show Hero Plane ↑
          </button>
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1">
        {activeTab === 'simulator' && (
          <FlutterSimulatorView
            onOpenVault={() => {
              setActiveTab('a2d_vault');
              setShowHero(false);
            }}
            onOpenClaudeApi={() => {
              setActiveTab('claude_api');
              setShowHero(false);
            }}
            onOpenGoogleChat={handleOpenGoogleChat}
          />
        )}

        {activeTab === 'claude_api' && <ClaudeApiInspectorView />}

        {activeTab === 'gguf_nnapi' && <GgufNnapiView />}

        {activeTab === 'a2d_vault' && <A2DVaultView />}

        {activeTab === 'google_chat' && (
          <GoogleChatView
            initialShareText={pendingShareChatText}
            onClearInitialShareText={() => setPendingShareChatText('')}
          />
        )}

        {activeTab === 'google_drive' && (
          <GoogleDriveView
            initialExportPayload={pendingDriveExport}
            onClearInitialExport={() => setPendingDriveExport(null)}
          />
        )}

        {activeTab === 'codebase' && <DartCodebaseView />}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-neutral-900 bg-neutral-950 px-6 py-6 text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-amber-400">LIQUID/OS</span>
            <span>·</span>
            <span>AI-Native Dart Flutter & Offline LLM Runtime</span>
          </div>

          <div className="flex items-center gap-4 font-mono text-[11px] text-neutral-400">
            <span>NNAPI NPU Hexagon</span>
            <span>·</span>
            <span>A2D AES-256-GCM Vault</span>
            <span>·</span>
            <span>Claude 3.5 Messages API</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
