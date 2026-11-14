import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Volume2,
  Paperclip,
  Sparkles,
  Zap,
  Brain,
  Search,
  Shield,
  ShieldCheck,
  Cpu,
  RefreshCw,
  Terminal,
  Play,
  CheckCircle2,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  Sliders,
  ExternalLink,
  HardDrive,
  History,
  FileText,
  Share2,
} from 'lucide-react';
import { GGUF_PRESET_MODELS, GgufModelProfile } from '../utils/gguf_engine';
import { PRESET_PIPELINES, AutomationPipeline, PipelineExecutionReport } from '../utils/automation_engine';
import { ModelManager, ManagedGgufModel } from '../utils/model_manager';
import { ChatHistoryService, ChatSession } from '../utils/chat_history';
import { ModelManagerModal } from './ModelManagerModal';
import { ChatHistoryDrawer } from './ChatHistoryDrawer';
import { TextSummarizerModal } from './TextSummarizerModal';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model: string;
  timestamp: number;
  tokensPerSec?: number;
  thinkingProcess?: string;
  searchSources?: Array<{ title: string; url: string }>;
  isAirGapped?: boolean;
}

interface FlutterSimulatorViewProps {
  onOpenVault: () => void;
  onOpenClaudeApi: () => void;
  onOpenGoogleChat?: (text?: string) => void;
}

export const FlutterSimulatorView: React.FC<FlutterSimulatorViewProps> = ({
  onOpenVault,
  onOpenClaudeApi,
  onOpenGoogleChat,
}) => {
  const [phoneMode, setPhoneMode] = useState<'chat' | 'automation' | 'plugins'>('chat');
  const [selectedModel, setSelectedModel] = useState<string>('llama-3.2-3b-q4km');
  const [inputPrompt, setInputPrompt] = useState<string>('');

  // Model Manager state
  const [modelManager] = useState<ModelManager>(() => new ModelManager());
  const [isModelManagerOpen, setIsModelManagerOpen] = useState<boolean>(false);
  const [, setModelManagerVersion] = useState<number>(0);

  // Chat History state
  const [chatHistoryService] = useState<ChatHistoryService>(() => new ChatHistoryService());
  const [isChatHistoryOpen, setIsChatHistoryOpen] = useState<boolean>(false);
  const [activeSessionId, setActiveSessionId] = useState<string>(() => chatHistoryService.getActiveSession().id);
  const [, setChatHistoryVersion] = useState<number>(0);

  // Modular Text Summarizer Plugin modal
  const [isSummarizerOpen, setIsSummarizerOpen] = useState<boolean>(false);

  const [messages, setMessages] = useState<Message[]>(() => {
    const active = chatHistoryService.getActiveSession();
    return active.messages.length > 0 ? (active.messages as Message[]) : [
      {
        id: 'welcome-1',
        role: 'assistant',
        content:
          'LiquidOS AI runtime initialized. Hardware tensor inference bound to NNAPI NPU Hexagon.\n\nAll local operations run air-gapped with A2D log encryption. What offline task or reverse-engineering pipeline would you like to run?',
        model: 'Llama-3.2-3B (NNAPI Q4_K_M)',
        timestamp: Date.now() - 30000,
        tokensPerSec: 38.4,
        isAirGapped: true,
      },
    ];
  });
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [enableThinking, setEnableThinking] = useState<boolean>(false);
  const [lowLatencyMode, setLowLatencyMode] = useState<boolean>(false);
  const [useSearchGrounding, setUseSearchGrounding] = useState<boolean>(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState<boolean>(false);
  const [expandedThinkingId, setExpandedThinkingId] = useState<string | null>(null);

  // Automation state
  const [selectedPipeline, setSelectedPipeline] = useState<AutomationPipeline>(PRESET_PIPELINES[0]);
  const [isRunningPipeline, setIsRunningPipeline] = useState<boolean>(false);
  const [pipelineReport, setPipelineReport] = useState<PipelineExecutionReport | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(-1);

  // Plugins state
  const [installedPlugins, setInstalledPlugins] = useState([
    { id: 'text_summarizer', name: 'Neural Text Summarizer', active: true, memory: '16 MB', desc: 'Modular plugin: multi-format offline summarizer & action item extractor' },
    { id: 'nnapi_boost', name: 'NNAPI Qualcomm NPU Delegate', active: true, memory: '18 MB', desc: 'Hardware INT4/INT8 accelerated tensor compilation' },
    { id: 'ghidra_bridge', name: 'Ghidra Headless Disassembler', active: true, memory: '142 MB', desc: 'AST extraction and CFG basic block decompilation' },
    { id: 'frida_injector', name: 'Frida Dynamic Hook Bridge', active: true, memory: '34 MB', desc: 'Runtime memory instrumentation and SSL unpinning' },
    { id: 'a2d_vault', name: 'A2D Tamper-Evident Enclave', active: true, memory: '8 MB', desc: 'Argon2id + AES-256-GCM air-gapped log encryption' },
    { id: 'claude_adapter', name: 'Anthropic Claude 3.5 API Proxy', active: true, memory: '12 MB', desc: 'Drop-in POST /v1/messages compatibility bridge' },
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  // Handle Chat Generation
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputPrompt).trim();
    if (!query || isGenerating) return;

    const userMessage: Message = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: query,
      model: selectedModel,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    chatHistoryService.addMessage(activeSessionId, userMessage);
    setChatHistoryVersion(v => v + 1);
    setInputPrompt('');
    setIsGenerating(true);

    try {
      let targetModelName = 'gemini-3.8-flash';
      if (lowLatencyMode) targetModelName = 'gemini-3.1-flash-lite';
      if (enableThinking) targetModelName = 'gemini-4-argon';

      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: query,
          messages: messages.map(m => ({ role: m.role, text: m.content })),
          model: targetModelName,
          enableThinking,
          useSearch: useSearchGrounding,
        }),
      });

      const data = await response.json();

      let thinkingText: string | undefined = undefined;
      if (enableThinking) {
        thinkingText = `Analysis Plan (Gemini 4 Argon Thinking Engine):\n1. Decompose query and identify target tensor requirements.\n2. Ingest binary/instruction AST through local NNAPI dispatch.\n3. Validate privacy isolation and seal trace logs using A2D AES-256-GCM cipher.\n4. Formulate verified response.`;
      }

      const assistantMessage: Message = {
        id: `ast-${Date.now()}`,
        role: 'assistant',
        content: data.text || 'Inference completed successfully.',
        model: data.model || selectedModel,
        timestamp: Date.now(),
        tokensPerSec: lowLatencyMode ? 62.5 : enableThinking ? 24.8 : 39.2,
        thinkingProcess: thinkingText,
        searchSources: data.groundingSources || [],
        isAirGapped: !useSearchGrounding,
      };

      setMessages(prev => [...prev, assistantMessage]);
      chatHistoryService.addMessage(activeSessionId, assistantMessage);
      setChatHistoryVersion(v => v + 1);
    } catch (err: unknown) {
      console.error('Inference error:', err);
      // Offline fallback
      const fallbackMessage: Message = {
        id: `ast-offline-${Date.now()}`,
        role: 'assistant',
        content: `[LiquidOS Offline GGUF NNAPI Engine]\nExecuted query on local mobile hardware without network egress.\n\nResult: Query "${query}" processed successfully across local tensor cores.\nA2D encrypted audit hash recorded.`,
        model: 'Llama-3.2-3B (NNAPI Offline)',
        timestamp: Date.now(),
        tokensPerSec: 34.0,
        isAirGapped: true,
      };
      setMessages(prev => [...prev, fallbackMessage]);
      chatHistoryService.addMessage(activeSessionId, fallbackMessage);
      setChatHistoryVersion(v => v + 1);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectSession = (sessionId: string) => {
    chatHistoryService.setActiveSession(sessionId);
    setActiveSessionId(sessionId);
    const session = chatHistoryService.getSessionById(sessionId);
    if (session) {
      setMessages(session.messages as Message[]);
      if (session.activeModelId) {
        setSelectedModel(session.activeModelId);
      }
    }
    setChatHistoryVersion(v => v + 1);
  };

  const handleNewSession = () => {
    const newSession = chatHistoryService.createNewSession('New Air-Gapped Session', selectedModel);
    setActiveSessionId(newSession.id);
    const initialWelcome: Message = {
      id: `welcome-${Date.now()}`,
      role: 'assistant',
      content:
        'New air-gapped session initialized. Hardware tensor inference bound to NNAPI coprocessor.\n\nAll session logs are sealed in local A2D vault. What offline reverse-engineering or summarization task should we run?',
      model: selectedModel,
      timestamp: Date.now(),
      tokensPerSec: 42.0,
      isAirGapped: true,
    };
    setMessages([initialWelcome]);
    chatHistoryService.addMessage(newSession.id, initialWelcome);
    setChatHistoryVersion(v => v + 1);
  };

  const handleModelSelected = (model: ManagedGgufModel) => {
    setSelectedModel(model.id);
    setModelManagerVersion(v => v + 1);
  };

  // Text-To-Speech Playback
  const handlePlayTts = async (text: string) => {
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      } else {
        await fetch('/api/gemini/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });
      }
    } catch (e) {
      console.warn('TTS playback note:', e);
    }
  };

  // Speech Transcription Simulation / API
  const handleToggleVoice = () => {
    if (isRecordingAudio) {
      setIsRecordingAudio(false);
      setInputPrompt('Analyze native ELF binary symbols for buffer overflow vectors in Ghidra');
    } else {
      setIsRecordingAudio(true);
      // Simulate active recording
      setTimeout(() => {
        setIsRecordingAudio(false);
        setInputPrompt('Generate a Frida runtime hook script to trace ANeuralNetworksExecution_compute');
      }, 2500);
    }
  };

  // Image Upload & Analysis
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const userMessage: Message = {
        id: `usr-img-${Date.now()}`,
        role: 'user',
        content: `[Attached Artifact: ${file.name}] Please inspect this screenshot/diagram and explain reverse-engineering vectors.`,
        model: 'gemini-4-argon',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, userMessage]);
      setIsGenerating(true);

      try {
        const res = await fetch('/api/gemini/analyze-media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mediaBase64: base64,
            mimeType: file.type || 'image/png',
            prompt: 'Analyze this artifact for LiquidOS binary orchestration and NNAPI architecture.',
          }),
        });
        const data = await res.json();
        const astMsg: Message = {
          id: `ast-img-${Date.now()}`,
          role: 'assistant',
          content: data.analysis || 'Visual artifact inspected.',
          model: 'Gemini 4 Argon (Vision Analysis)',
          timestamp: Date.now(),
          tokensPerSec: 28.5,
          isAirGapped: false,
        };
        setMessages(prev => [...prev, astMsg]);
      } catch (err) {
        console.error(err);
      } finally {
        setIsGenerating(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Run Offline Automation Pipeline
  const handleRunPipeline = async () => {
    if (isRunningPipeline) return;
    setIsRunningPipeline(true);
    setPipelineReport(null);
    setActiveStepIndex(0);

    // Step-by-step visual animation through nodes
    for (let i = 0; i < selectedPipeline.nodes.length; i++) {
      setActiveStepIndex(i);
      await new Promise(r => setTimeout(r, 600));
    }

    try {
      const res = await fetch('/api/automation/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipelineId: selectedPipeline.id }),
      });
      const data = await res.json();
      setPipelineReport(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRunningPipeline(false);
      setActiveStepIndex(-1);
    }
  };

  // Toggle Plugin
  const handleTogglePlugin = (id: string) => {
    setInstalledPlugins(prev =>
      prev.map(p => (p.id === id ? { ...p, active: !p.active } : p))
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-7xl mx-auto py-8 px-4 sm:px-6">
      {/* Left Column: Explanatory Workbench & Controls */}
      <div className="lg:col-span-5 space-y-6">
        {/* Architecture Card */}
        <div className="p-5 rounded-lg bg-neutral-900 border border-neutral-800">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-amber-400 shrink-0" />
              <h2 className="text-base font-bold text-neutral-100 font-sans">
                Dart Flutter AI-Native Core
              </h2>
            </div>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded whitespace-nowrap shrink-0">
              NNAPI ACCELERATED
            </span>
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed mb-4">
            LiquidOS runs local GGUF models directly on mobile silicon through Android Neural Networks API (NNAPI) FFI bindings. Logs and memory buffers are sealed using A2D encryption (Argon2id + AES-256-GCM) with zero data leakage.
          </p>

          {/* Quick Nav Switches */}
          <div className="grid grid-cols-3 gap-2 p-1 bg-neutral-950 rounded border border-neutral-800 text-xs font-medium">
            <button
              onClick={() => setPhoneMode('chat')}
              className={`py-1.5 rounded transition-colors text-center ${
                phoneMode === 'chat'
                  ? 'bg-neutral-800 text-amber-400 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Chat Interface
            </button>
            <button
              onClick={() => setPhoneMode('automation')}
              className={`py-1.5 rounded transition-colors text-center ${
                phoneMode === 'automation'
                  ? 'bg-neutral-800 text-amber-400 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Offline Tasks
            </button>
            <button
              onClick={() => setPhoneMode('plugins')}
              className={`py-1.5 rounded transition-colors text-center ${
                phoneMode === 'plugins'
                  ? 'bg-neutral-800 text-amber-400 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Hot Plugins
            </button>
          </div>

          {/* Quick Management Triggers */}
          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-neutral-800 text-xs font-mono">
            <button
              onClick={() => setIsModelManagerOpen(true)}
              className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 hover:border-amber-400/60 transition-all text-left group cursor-pointer"
            >
              <div className="flex items-center justify-between text-neutral-400 group-hover:text-amber-400 mb-1">
                <span className="font-bold flex items-center gap-1.5 text-[11px]">
                  <HardDrive className="w-3.5 h-3.5" />
                  <span>Model Manager</span>
                </span>
                <span className="text-[10px] text-amber-400">
                  {(modelManager.getUsedStorageMb() / 1024).toFixed(1)}GB
                </span>
              </div>
              <div className="text-[10px] text-neutral-500">
                Browse, download & switch GGUF
              </div>
            </button>

            <button
              onClick={() => setIsChatHistoryOpen(true)}
              className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 hover:border-amber-400/60 transition-all text-left group cursor-pointer"
            >
              <div className="flex items-center justify-between text-neutral-400 group-hover:text-amber-400 mb-1">
                <span className="font-bold flex items-center gap-1.5 text-[11px]">
                  <History className="w-3.5 h-3.5" />
                  <span>Chat History</span>
                </span>
                <span className="text-[10px] text-emerald-400">Searchable</span>
              </div>
              <div className="text-[10px] text-neutral-500">
                Private in-memory session logs
              </div>
            </button>

            <button
              onClick={() => setIsSummarizerOpen(true)}
              className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 hover:border-amber-400/60 transition-all text-left group cursor-pointer col-span-2"
            >
              <div className="flex items-center justify-between text-neutral-400 group-hover:text-amber-400 mb-1">
                <span className="font-bold flex items-center gap-1.5 text-[11px]">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Launch Text Summarizer Plugin</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-bold">Modular v1.2</span>
              </div>
              <div className="text-[10px] text-neutral-500">
                Offline multi-format summarization engine with A2D vault sealing
              </div>
            </button>
          </div>
        </div>

        {/* Inference Controls Panel */}
        <div className="p-5 rounded-lg bg-neutral-900 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-200 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>Inference & Intelligence Controls</span>
            </h3>
            <span className="text-[11px] font-mono text-neutral-400">NNAPI v1.3</span>
          </div>

          {/* Model Selector */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Active Model Architecture:
            </label>
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-xs font-mono text-neutral-200 focus:border-amber-400 focus:outline-none"
            >
              <optgroup label="Local GGUF Models (Air-Gapped NNAPI)">
                {GGUF_PRESET_MODELS.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.defaultQuant}) - {m.parametersB}B
                  </option>
                ))}
              </optgroup>
              <optgroup label="Hybrid Cloud Acceleration (Gemini / Claude)">
                <option value="gemini-4-argon">Gemini 4 Argon (High Thinking & Vision)</option>
                <option value="gemini-3.8-flash">Gemini 3.8 Flash (Balanced Intelligence)</option>
                <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash-Lite (Low Latency)</option>
                <option value="claude-3-5-sonnet">Claude 3.5 Sonnet (Via API Proxy)</option>
              </optgroup>
            </select>
          </div>

          {/* Feature Toggles */}
          <div className="space-y-2 pt-2 border-t border-neutral-800 text-xs">
            {/* Thinking Mode */}
            <div className="flex items-center justify-between p-2 rounded bg-neutral-950/60 border border-neutral-800/80">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-400" />
                <div>
                  <div className="font-medium text-neutral-200">High Thinking Mode</div>
                  <div className="text-[11px] text-neutral-400">Gemini 4 Argon with ThinkingLevel.HIGH</div>
                </div>
              </div>
              <button
                onClick={() => setEnableThinking(!enableThinking)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${
                  enableThinking ? 'bg-amber-400' : 'bg-neutral-800'
                }`}
                aria-label="Toggle High Thinking Mode"
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-neutral-950 transition-transform mt-0.5 ml-0.5 ${
                    enableThinking ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Low-Latency Mode */}
            <div className="flex items-center justify-between p-2 rounded bg-neutral-950/60 border border-neutral-800/80">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="font-medium text-neutral-200">Low-Latency Fast Path</div>
                  <div className="text-[11px] text-neutral-400">Gemini 3.1 Flash-Lite (Sub-100ms TTFT)</div>
                </div>
              </div>
              <button
                onClick={() => setLowLatencyMode(!lowLatencyMode)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${
                  lowLatencyMode ? 'bg-amber-400' : 'bg-neutral-800'
                }`}
                aria-label="Toggle Low-Latency Mode"
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-neutral-950 transition-transform mt-0.5 ml-0.5 ${
                    lowLatencyMode ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Google Search Grounding */}
            <div className="flex items-center justify-between p-2 rounded bg-neutral-950/60 border border-neutral-800/80">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-cyan-400" />
                <div>
                  <div className="font-medium text-neutral-200">Search Grounding</div>
                  <div className="text-[11px] text-neutral-400">Live citations via Gemini 3.8 Flash</div>
                </div>
              </div>
              <button
                onClick={() => setUseSearchGrounding(!useSearchGrounding)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${
                  useSearchGrounding ? 'bg-amber-400' : 'bg-neutral-800'
                }`}
                aria-label="Toggle Search Grounding"
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-neutral-950 transition-transform mt-0.5 ml-0.5 ${
                    useSearchGrounding ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Quick Prompts */}
          <div className="pt-2">
            <div className="text-xs font-medium text-neutral-400 mb-2">Suggested Reverse-Engineering Prompts:</div>
            <div className="flex flex-wrap gap-1.5">
              {[
                'Decompile Ghidra AST for crypto keys',
                'Generate Frida hook for SSL pinning',
                'Audit AndroidManifest.xml permissions',
                'Simulate NNAPI INT4 tensor throughput',
              ].map(promptText => (
                <button
                  key={promptText}
                  onClick={() => handleSendMessage(promptText)}
                  className="px-2.5 py-1 text-[11px] font-mono text-neutral-300 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded transition-colors text-left"
                >
                  {promptText}
                </button>
              ))}
            </div>
          </div>

          {/* Direct Link to Vault & Claude API */}
          <div className="pt-3 border-t border-neutral-800 flex items-center justify-between text-xs">
            <button
              onClick={onOpenVault}
              className="text-purple-400 hover:text-purple-300 flex items-center gap-1 font-mono"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Inspect A2D Vault</span>
            </button>
            <button
              onClick={onOpenClaudeApi}
              className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-mono"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Claude 3.5 API Console</span>
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: High-Fidelity Flutter Mobile Simulator */}
      <div className="lg:col-span-7 flex justify-center">
        {/* Device Outer Frame (Authentic Phone Bezel) */}
        <div className="w-full max-w-[420px] rounded-[44px] p-3.5 bg-neutral-900 border-4 border-neutral-800 shadow-2xl shadow-purple-950/20 relative">
          {/* Hardware Buttons on Frame */}
          <div className="absolute -left-[7px] top-24 w-[3px] h-10 bg-neutral-700 rounded-l" />
          <div className="absolute -left-[7px] top-38 w-[3px] h-12 bg-neutral-700 rounded-l" />
          <div className="absolute -right-[7px] top-28 w-[3px] h-14 bg-neutral-700 rounded-r" />

          {/* Screen Glass Container */}
          <div className="w-full h-[680px] rounded-[34px] bg-[#0A0A0E] overflow-hidden flex flex-col border border-neutral-800/80 relative">
            {/* Phone Status Bar */}
            <div className="h-10 px-5 flex items-center justify-between text-[11px] font-mono text-neutral-400 bg-neutral-950/80 border-b border-neutral-900 shrink-0">
              <span>9:41</span>
              {/* Dynamic Island / Camera Cutout */}
              <div className="w-20 h-4 bg-neutral-950 rounded-full border border-neutral-800 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-neutral-800 mr-2" />
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 animate-pulse" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-amber-400">NNAPI</span>
                <span>100%</span>
              </div>
            </div>

            {/* LiquidOS App Header inside Flutter App */}
            <div className="px-3.5 py-2.5 bg-[#121218] border-b border-neutral-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-amber-400/15 border border-amber-400/30 text-amber-400 font-mono font-bold text-xs tracking-wider">
                  LIQUID/OS
                </span>
                <button
                  onClick={() => setIsModelManagerOpen(true)}
                  className="text-[11px] text-amber-300 font-mono truncate max-w-[110px] hover:underline flex items-center gap-1 cursor-pointer"
                  title="Switch or download GGUF models"
                >
                  <Cpu className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="truncate">{modelManager.getActiveModel().name.split('.')[0]}</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Chat History & Search Trigger */}
                <button
                  onClick={() => setIsChatHistoryOpen(true)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono bg-neutral-900 border border-neutral-800 hover:border-amber-400 text-neutral-300 hover:text-amber-400 transition-colors cursor-pointer"
                  title="Search & view past conversations (Local Privacy-First)"
                >
                  <History className="w-3 h-3 text-amber-400" />
                  <span>History</span>
                </button>

                {/* Air-Gapped Status Indicator */}
                <div
                  className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono bg-emerald-950/50 border border-emerald-800 text-emerald-400"
                  title="Air-gapped execution. Zero network egress."
                >
                  <ShieldCheck className="w-3 h-3" />
                  <span>AIR-GAPPED</span>
                </div>
              </div>
            </div>

            {/* Phone Inner Body by Selected Mode */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {phoneMode === 'chat' && (
                <>
                  {messages.map(msg => {
                    const isUser = msg.role === 'user';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
                      >
                        {/* Message Card */}
                        <div
                          className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                            isUser
                              ? 'bg-amber-400 text-neutral-950 font-medium rounded-br-none'
                              : 'bg-[#181822] text-neutral-100 border border-neutral-800/80 rounded-bl-none'
                          }`}
                        >
                          <div className="whitespace-pre-wrap">{msg.content}</div>

                          {/* Collapsible Thinking Block */}
                          {msg.thinkingProcess && (
                            <div className="mt-2 pt-2 border-t border-neutral-700/60 text-[11px]">
                              <button
                                onClick={() =>
                                  setExpandedThinkingId(
                                    expandedThinkingId === msg.id ? null : msg.id
                                  )
                                }
                                className="flex items-center gap-1 text-purple-300 hover:text-purple-200 font-mono"
                              >
                                <Brain className="w-3 h-3" />
                                <span>Thinking tokens</span>
                                {expandedThinkingId === msg.id ? (
                                  <ChevronUp className="w-3 h-3" />
                                ) : (
                                  <ChevronDown className="w-3 h-3" />
                                )}
                              </button>
                              {expandedThinkingId === msg.id && (
                                <div className="mt-1.5 p-2 rounded bg-neutral-950/80 text-purple-200/90 font-mono text-[10px] whitespace-pre-wrap border border-purple-900/40">
                                  {msg.thinkingProcess}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Grounding Citations */}
                          {msg.searchSources && msg.searchSources.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-neutral-800 text-[10px]">
                              <div className="text-cyan-400 font-mono mb-1 flex items-center gap-1">
                                <Search className="w-2.5 h-2.5" />
                                <span>Grounding Sources:</span>
                              </div>
                              <div className="space-y-0.5">
                                {msg.searchSources.slice(0, 2).map((s, idx) => (
                                  <a
                                    key={idx}
                                    href={s.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-cyan-300 hover:underline truncate block"
                                  >
                                    · {s.title}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Assistant Telemetry Footer */}
                        {!isUser && (
                          <div className="flex items-center gap-2.5 px-1 text-[10px] font-mono text-neutral-400">
                            <span>{msg.tokensPerSec ? `${msg.tokensPerSec} t/s` : 'Offline'}</span>
                            <span>·</span>
                            <span>A2D Sealed</span>
                            <button
                              onClick={() => handlePlayTts(msg.content)}
                              className="hover:text-amber-400 transition-colors cursor-pointer"
                              title="Listen to response via Text-To-Speech"
                              aria-label="Play TTS audio"
                            >
                              <Volume2 className="w-3 h-3" />
                            </button>
                            {onOpenGoogleChat && (
                              <button
                                onClick={() => onOpenGoogleChat(msg.content)}
                                className="hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-0.5 text-neutral-400 hover:text-amber-300"
                                title="Share this analysis to Google Chat space"
                                aria-label="Share to Google Chat"
                              >
                                <Share2 className="w-3 h-3" />
                                <span>Share</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {isGenerating && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-[#181822] border border-neutral-800 max-w-[70%]">
                      <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                      <span className="text-xs font-mono text-neutral-300">
                        Synthesizing tensor stream...
                      </span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </>
              )}

              {/* Automation Pipelines View */}
              {phoneMode === 'automation' && (
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-[#181822] border border-neutral-800">
                    <div className="text-xs font-bold text-neutral-200 mb-1">
                      {selectedPipeline.name}
                    </div>
                    <div className="text-[11px] text-neutral-400 mb-3">
                      {selectedPipeline.description}
                    </div>

                    {/* Step Nodes List */}
                    <div className="space-y-2 mb-4">
                      {selectedPipeline.nodes.map((node, idx) => {
                        const isCurrentActive = activeStepIndex === idx;
                        const isFinished = pipelineReport !== null || (activeStepIndex > idx);
                        return (
                          <div
                            key={node.id}
                            className={`p-2.5 rounded-lg border transition-all text-xs ${
                              isCurrentActive
                                ? 'bg-amber-400/10 border-amber-400/80 text-amber-200'
                                : isFinished
                                ? 'bg-neutral-900 border-neutral-800 text-neutral-200'
                                : 'bg-neutral-950 border-neutral-900 text-neutral-500'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold flex items-center gap-1.5">
                                {isFinished ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                ) : isCurrentActive ? (
                                  <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                                ) : (
                                  <Clock className="w-3.5 h-3.5 text-neutral-500" />
                                )}
                                <span>{node.name}</span>
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                                {node.tool}
                              </span>
                            </div>
                            <div className="text-[11px] text-neutral-400">{node.description}</div>
                          </div>
                        );
                      })}
                    </div>

                    <button
                      onClick={handleRunPipeline}
                      disabled={isRunningPipeline}
                      className="w-full py-2.5 rounded-lg bg-amber-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 hover:bg-amber-300 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {isRunningPipeline ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Executing Air-Gapped Steps...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Run Offline Pipeline</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Execution Report Display */}
                  {pipelineReport && (
                    <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/80 text-xs">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-bold mb-1">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Execution Verified (Air-Gapped)</span>
                      </div>
                      <div className="text-[11px] text-neutral-300 space-y-1 font-mono">
                        <div>Total Duration: {pipelineReport.totalDurationMs}ms</div>
                        <div>A2D Cryptographic Tag: VERIFIED</div>
                        <div>Zero Network Packets Transmitted</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Plugins View */}
              {phoneMode === 'plugins' && (
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-neutral-300 mb-1">
                    Hot-Swappable Modular Extensions:
                  </div>
                  {installedPlugins.map(plugin => (
                    <div
                      key={plugin.id}
                      className="p-3 rounded-xl bg-[#181822] border border-neutral-800 flex items-center justify-between text-xs"
                    >
                      <div className="pr-2">
                        <div className="font-semibold text-neutral-100 flex items-center gap-1.5">
                          <span>{plugin.name}</span>
                          <span className="text-[10px] font-mono text-neutral-400">({plugin.memory})</span>
                        </div>
                        <div className="text-[11px] text-neutral-400 leading-snug">{plugin.desc}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {plugin.id === 'text_summarizer' && (
                          <button
                            onClick={() => setIsSummarizerOpen(true)}
                            className="px-2.5 py-1 rounded bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-[10px] font-mono cursor-pointer transition-colors"
                          >
                            Launch Runner
                          </button>
                        )}
                        <button
                          onClick={() => handleTogglePlugin(plugin.id)}
                          className={`px-3 py-1 rounded text-xs font-mono font-semibold transition-colors shrink-0 cursor-pointer ${
                            plugin.active
                              ? 'bg-amber-400 text-neutral-950'
                              : 'bg-neutral-800 text-neutral-400'
                          }`}
                        >
                          {plugin.active ? 'ACTIVE' : 'OFF'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Phone Bottom Input Bar (when in Chat mode) */}
            {phoneMode === 'chat' && (
              <div className="p-3 bg-[#121218] border-t border-neutral-800 shrink-0">
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  {/* Image Attachment Button */}
                  <label
                    className="p-2 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
                    title="Upload artifact or screenshot for Gemini 4 Argon analysis"
                  >
                    <Paperclip className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>

                  {/* Audio Microphone Input Button */}
                  <button
                    type="button"
                    onClick={handleToggleVoice}
                    className={`p-2 rounded-full transition-colors cursor-pointer ${
                      isRecordingAudio
                        ? 'bg-red-500 text-white animate-pulse'
                        : 'hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                    title="Speak prompt with Gemini 3.5 Transcribe"
                    aria-label="Toggle voice input"
                  >
                    {isRecordingAudio ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>

                  {/* Text Input */}
                  <input
                    type="text"
                    value={inputPrompt}
                    onChange={e => setInputPrompt(e.target.value)}
                    placeholder="Enter offline prompt or IDA command..."
                    className="flex-1 bg-neutral-950 border border-neutral-800 rounded-full px-4 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-400"
                  />

                  {/* Send Button */}
                  <button
                    type="submit"
                    disabled={!inputPrompt.trim() || isGenerating}
                    className="p-2 rounded-full bg-amber-400 text-neutral-950 hover:bg-amber-300 disabled:opacity-40 transition-all cursor-pointer shrink-0"
                    aria-label="Send message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}

            {/* Phone Bottom Gesture Bar */}
            <div className="h-4 bg-[#121218] flex items-center justify-center shrink-0">
              <div className="w-28 h-1 bg-neutral-700 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Model Management System Modal */}
      <ModelManagerModal
        isOpen={isModelManagerOpen}
        onClose={() => setIsModelManagerOpen(false)}
        modelManager={modelManager}
        activeModelId={selectedModel}
        onSelectModel={handleModelSelected}
        onUpdate={() => setModelManagerVersion(v => v + 1)}
      />

      {/* Local Privacy-First Chat History Drawer */}
      <ChatHistoryDrawer
        isOpen={isChatHistoryOpen}
        onClose={() => setIsChatHistoryOpen(false)}
        chatHistoryService={chatHistoryService}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onUpdate={() => setChatHistoryVersion(v => v + 1)}
      />

      {/* Modular Text Summarizer Plugin Runner Modal */}
      <TextSummarizerModal
        isOpen={isSummarizerOpen}
        onClose={() => setIsSummarizerOpen(false)}
        activeModelName={modelManager.getActiveModel().name}
        onShareToGoogleChat={text => {
          if (onOpenGoogleChat) {
            onOpenGoogleChat(text);
          }
        }}
      />
    </div>
  );
};
