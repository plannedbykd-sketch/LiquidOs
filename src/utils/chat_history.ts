/**
 * Privacy-First Local Chat History Engine
 * All session data is stored and indexed purely on the client with zero telemetry.
 */

export interface ChatHistoryMessage {
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

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  activeModelId: string;
  messages: ChatHistoryMessage[];
  tags: string[];
  isEncryptedInVault?: boolean;
}

export interface SearchMatch {
  sessionId: string;
  sessionTitle: string;
  messageId: string;
  role: 'user' | 'assistant';
  timestamp: number;
  matchedTextSnippet: string;
}

export const INITIAL_PRESET_SESSIONS: ChatSession[] = [
  {
    id: 'sess-firmware-decompile',
    title: 'Firmware Bootloader Decompilation',
    createdAt: Date.now() - 3600000 * 24 * 2,
    updatedAt: Date.now() - 3600000 * 24 * 2 + 120000,
    activeModelId: 'qwen2.5-coder-7b-q40',
    tags: ['Reverse Engineering', 'ARM64', 'Ghidra'],
    isEncryptedInVault: true,
    messages: [
      {
        id: 'msg-fw-1',
        role: 'user',
        content: 'Analyze ARM64 reset vector at 0x00001000 and locate UART baud initialization.',
        model: 'qwen2.5-coder-7b-q40',
        timestamp: Date.now() - 3600000 * 24 * 2,
      },
      {
        id: 'msg-fw-2',
        role: 'assistant',
        content:
          'Reset vector at 0x00001000 sets up SP_EL1 and branches to `loc_1048`. In `loc_1048`, register X0 loads MMIO base 0x09000000 (PL011 UART). Baud divisor 0x27 is written to `UARTIBRD`, corresponding to 115200 baud at a 48MHz reference clock.',
        model: 'qwen2.5-coder-7b-q40',
        timestamp: Date.now() - 3600000 * 24 * 2 + 15000,
        tokensPerSec: 41.2,
        isAirGapped: true,
      },
    ],
  },
  {
    id: 'sess-nnapi-tensor-opt',
    title: 'Qualcomm NPU Tensor Benchmark',
    createdAt: Date.now() - 3600000 * 5,
    updatedAt: Date.now() - 3600000 * 5 + 60000,
    activeModelId: 'llama-3.2-3b-q4km',
    tags: ['NNAPI', 'Hexagon', 'Optimization'],
    isEncryptedInVault: true,
    messages: [
      {
        id: 'msg-opt-1',
        role: 'user',
        content: 'Compare INT4 tensor throughput vs FP16 on Qualcomm Snapdragon 8 Gen 3 NPU.',
        model: 'llama-3.2-3b-q4km',
        timestamp: Date.now() - 3600000 * 5,
      },
      {
        id: 'msg-opt-2',
        role: 'assistant',
        content:
          'On Hexagon HTP v75, INT4 tensor weights achieve 3.2x higher memory bandwidth efficiency (54.6 GB/s effective) compared to FP16. TTFT drops from 110ms to 38ms, while thermal power consumption remains under 2.8W.',
        model: 'llama-3.2-3b-q4km',
        timestamp: Date.now() - 3600000 * 5 + 10000,
        tokensPerSec: 52.8,
        isAirGapped: true,
      },
    ],
  },
  {
    id: 'sess-ssl-pinning-hook',
    title: 'Frida SSL Pinning Bypass Hooks',
    createdAt: Date.now() - 3600000 * 1,
    updatedAt: Date.now() - 3600000 * 1 + 45000,
    activeModelId: 'llama-3.2-3b-q4km',
    tags: ['Frida', 'Security', 'Hooking'],
    isEncryptedInVault: true,
    messages: [
      {
        id: 'msg-ssl-1',
        role: 'user',
        content: 'Draft a Frida script hooking OpenSSL SSL_CTX_set_custom_verify for Flutter engine binaries.',
        model: 'llama-3.2-3b-q4km',
        timestamp: Date.now() - 3600000 * 1,
      },
      {
        id: 'msg-ssl-2',
        role: 'assistant',
        content:
          'Interceptor.attach(Module.findExportByName("libflutter.so", "SSL_CTX_set_custom_verify"), { onEnter: function(args) { args[1] = ptr(0); } }); // Forces callback verify bypass for local testing.',
        model: 'llama-3.2-3b-q4km',
        timestamp: Date.now() - 3600000 * 1 + 8000,
        tokensPerSec: 39.5,
        isAirGapped: true,
      },
    ],
  },
];

export class ChatHistoryService {
  private sessions: ChatSession[];
  private activeSessionId: string;

  constructor(initialSessions = INITIAL_PRESET_SESSIONS) {
    this.sessions = JSON.parse(JSON.stringify(initialSessions));
    this.activeSessionId = this.sessions[0]?.id || 'sess-default';
  }

  public getSessions(): ChatSession[] {
    return [...this.sessions].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  public getSessionById(id: string): ChatSession | undefined {
    return this.sessions.find(s => s.id === id);
  }

  public getActiveSession(): ChatSession {
    let current = this.sessions.find(s => s.id === this.activeSessionId);
    if (!current) {
      if (this.sessions.length > 0) {
        current = this.sessions[0];
        this.activeSessionId = current.id;
      } else {
        current = this.createNewSession('New Air-Gapped Session', 'llama-3.2-3b-q4km');
      }
    }
    return current;
  }

  public setActiveSession(id: string): boolean {
    const session = this.sessions.find(s => s.id === id);
    if (!session) return false;
    this.activeSessionId = id;
    return true;
  }

  public createNewSession(title = 'New Air-Gapped Session', modelId = 'llama-3.2-3b-q4km'): ChatSession {
    const newSession: ChatSession = {
      id: `sess-${Date.now()}`,
      title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      activeModelId: modelId,
      messages: [],
      tags: ['Local Session'],
      isEncryptedInVault: true,
    };
    this.sessions.unshift(newSession);
    this.activeSessionId = newSession.id;
    return newSession;
  }

  public addMessage(sessionId: string, message: ChatHistoryMessage): void {
    const session = this.sessions.find(s => s.id === sessionId);
    if (!session) return;
    session.messages.push(message);
    session.updatedAt = Date.now();
    // Auto-update title if it's default and this is the first user query
    if (session.messages.length === 1 && message.role === 'user') {
      session.title = message.content.slice(0, 40) + (message.content.length > 40 ? '...' : '');
    }
  }

  public renameSession(sessionId: string, newTitle: string): boolean {
    const session = this.sessions.find(s => s.id === sessionId);
    if (!session) return false;
    session.title = newTitle.trim();
    session.updatedAt = Date.now();
    return true;
  }

  public deleteSession(sessionId: string): boolean {
    const index = this.sessions.findIndex(s => s.id === sessionId);
    if (index === -1) return false;
    this.sessions.splice(index, 1);
    if (this.activeSessionId === sessionId) {
      this.activeSessionId = this.sessions[0]?.id || '';
    }
    return true;
  }

  public clearAllSessions(): void {
    this.sessions = [];
    const fresh = this.createNewSession();
    this.activeSessionId = fresh.id;
  }

  /**
   * Privacy-First Local Search
   * Executes entirely in-memory on client device with zero external queries.
   */
  public searchConversations(query: string): SearchMatch[] {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return [];

    const matches: SearchMatch[] = [];

    for (const session of this.sessions) {
      for (const msg of session.messages) {
        const contentLower = msg.content.toLowerCase();
        const index = contentLower.indexOf(cleanQuery);
        if (index !== -1) {
          // Extract snippet window around match
          const start = Math.max(0, index - 30);
          const end = Math.min(msg.content.length, index + cleanQuery.length + 50);
          const prefix = start > 0 ? '...' : '';
          const suffix = end < msg.content.length ? '...' : '';
          const snippet = `${prefix}${msg.content.substring(start, end)}${suffix}`;

          matches.push({
            sessionId: session.id,
            sessionTitle: session.title,
            messageId: msg.id,
            role: msg.role,
            timestamp: msg.timestamp,
            matchedTextSnippet: snippet,
          });
        }
      }
    }

    return matches;
  }
}
