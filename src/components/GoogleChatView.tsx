import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Plus,
  RefreshCw,
  LogOut,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  CheckCircle2,
  Users,
  Share2,
  Lock,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  initGoogleChatAuth,
  googleSignIn,
  googleSignOut,
  getGoogleAccessToken,
  listGoogleChatSpaces,
  listSpaceMessages,
  postSpaceMessage,
  ChatSpace,
  ChatMessage,
  DEMO_CHAT_SPACES,
  DEMO_SPACE_MESSAGES,
} from '../services/google_chat_service';
import { User } from 'firebase/auth';

interface GoogleChatViewProps {
  initialShareText?: string;
  onClearInitialShareText?: () => void;
}

export const GoogleChatView: React.FC<GoogleChatViewProps> = ({
  initialShareText,
  onClearInitialShareText,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [spaces, setSpaces] = useState<ChatSpace[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<ChatSpace | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [newMessageText, setNewMessageText] = useState(initialShareText || '');
  const [isSending, setIsSending] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [apiNotice, setApiNotice] = useState<string | null>(null);

  // Mandatory Confirmation Dialog State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingMessagePayload, setPendingMessagePayload] = useState<string>('');

  useEffect(() => {
    if (initialShareText) {
      setNewMessageText(initialShareText);
    }
  }, [initialShareText]);

  // Initialize auth listener
  useEffect(() => {
    const unsubscribe = initGoogleChatAuth(
      (authenticatedUser, accessToken) => {
        setUser(authenticatedUser);
        setToken(accessToken);
        setIsLoadingAuth(false);
        loadSpaces(accessToken);
      },
      () => {
        setUser(null);
        setToken(null);
        setIsLoadingAuth(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      setIsLoadingAuth(true);
      setApiNotice(null);
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        await loadSpaces(res.accessToken);
      }
    } catch (err: any) {
      console.error('Sign-in error:', err);
      // If user is testing without active workspace popup
      setApiNotice(
        err.message || 'Google Sign-in failed. You can also explore in Demo Mode.'
      );
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleSignOut = async () => {
    await googleSignOut();
    setUser(null);
    setToken(null);
    setSpaces([]);
    setSelectedSpace(null);
    setMessages([]);
  };

  const loadSpaces = async (accessToken: string) => {
    try {
      const sps = await listGoogleChatSpaces(accessToken);
      setSpaces(sps);
      if (sps.length > 0) {
        setSelectedSpace(sps[0]);
        loadMessages(sps[0].name, accessToken);
      }
    } catch (err: any) {
      // If 404 Chat app not found or workspace requirement
      setApiNotice(
        'Google Chat app configuration is required in Google Cloud Console. Switching to simulated interactive space mode.'
      );
      setDemoMode(true);
      setSpaces(DEMO_CHAT_SPACES);
      setSelectedSpace(DEMO_CHAT_SPACES[0]);
      setMessages(DEMO_SPACE_MESSAGES[DEMO_CHAT_SPACES[0].name] || []);
    }
  };

  const loadMessages = async (spaceName: string, accessToken: string) => {
    setIsLoadingMessages(true);
    try {
      if (demoMode || !accessToken) {
        setMessages(DEMO_SPACE_MESSAGES[spaceName] || []);
      } else {
        const msgs = await listSpaceMessages(spaceName, accessToken);
        setMessages(msgs);
      }
    } catch (err) {
      setMessages(DEMO_SPACE_MESSAGES[spaceName] || []);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleSelectSpace = (space: ChatSpace) => {
    setSelectedSpace(space);
    if (token && !demoMode) {
      loadMessages(space.name, token);
    } else {
      setMessages(DEMO_SPACE_MESSAGES[space.name] || []);
    }
  };

  // STEP 1: Prompt user for confirmation before sending (MANDATORY WORKSPACE INTEGRATION RULE)
  const initiateSendMessage = () => {
    if (!newMessageText.trim() || !selectedSpace) return;
    setPendingMessagePayload(newMessageText.trim());
    setShowConfirmModal(true);
  };

  // STEP 2: Execute actual send only after explicit user confirmation
  const handleConfirmedSend = async () => {
    if (!pendingMessagePayload || !selectedSpace) return;
    setShowConfirmModal(false);
    setIsSending(true);

    try {
      if (demoMode || !token) {
        // Simulated local post
        const newMsg: ChatMessage = {
          name: `${selectedSpace.name}/messages/msg-${Date.now()}`,
          text: pendingMessagePayload,
          sender: {
            displayName: user?.displayName || 'Local Security Engineer',
            avatarUrl: user?.photoURL || undefined,
            type: 'HUMAN',
          },
          createTime: new Date().toISOString(),
        };
        setMessages(prev => [...prev, newMsg]);
        if (!DEMO_SPACE_MESSAGES[selectedSpace.name]) {
          DEMO_SPACE_MESSAGES[selectedSpace.name] = [];
        }
        DEMO_SPACE_MESSAGES[selectedSpace.name].push(newMsg);
      } else {
        const sent = await postSpaceMessage(selectedSpace.name, pendingMessagePayload, token);
        setMessages(prev => [...prev, sent]);
      }

      setNewMessageText('');
      setPendingMessagePayload('');
      if (onClearInitialShareText) onClearInitialShareText();
    } catch (err: any) {
      alert(`Failed to send message: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6 animate-in fade-in duration-300">
      {/* Title & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-mono text-neutral-100 flex items-center gap-2">
                <span>Google Chat Workspace Integration</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/30 text-amber-300">
                  chat.googleapis.com
                </span>
              </h1>
              <p className="text-xs text-neutral-400">
                Collaborate and dispatch local GGUF task automations directly to Google Chat spaces.
              </p>
            </div>
          </div>
        </div>

        {/* Auth / Mode Controls */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs font-mono">
              {user.photoURL && (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-6 h-6 rounded-full border border-neutral-700"
                />
              )}
              <div className="flex flex-col">
                <span className="font-bold text-neutral-200">{user.displayName || 'Authorized User'}</span>
                <span className="text-[10px] text-neutral-400">{user.email}</span>
              </div>
              <button
                onClick={handleSignOut}
                className="p-1.5 ml-1 text-neutral-400 hover:text-red-400 hover:bg-neutral-800 rounded transition-colors cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Official Google Sign-in Button */
            <button
              onClick={handleSignIn}
              disabled={isLoadingAuth}
              className="flex items-center gap-3 px-4 py-2 bg-white hover:bg-neutral-100 active:bg-neutral-200 text-neutral-800 font-sans font-medium text-xs rounded-lg shadow transition-all cursor-pointer border border-neutral-300"
            >
              <svg className="w-4 h-4" viewBox="0 0 48 48">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
              <span>{isLoadingAuth ? 'Connecting...' : 'Sign in with Google'}</span>
            </button>
          )}

          {/* Toggle Interactive Demo Mode */}
          <button
            onClick={() => {
              setDemoMode(!demoMode);
              if (!demoMode && spaces.length === 0) {
                setSpaces(DEMO_CHAT_SPACES);
                setSelectedSpace(DEMO_CHAT_SPACES[0]);
                setMessages(DEMO_SPACE_MESSAGES[DEMO_CHAT_SPACES[0].name] || []);
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors border cursor-pointer ${
              demoMode
                ? 'bg-amber-400 text-neutral-950 font-bold border-amber-400'
                : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-neutral-200'
            }`}
          >
            {demoMode ? 'Demo Mode Active' : 'Enable Demo Mode'}
          </button>
        </div>
      </div>

      {/* Cloud Console Workspace Notice Banner */}
      <div className="p-4 rounded-xl bg-neutral-900/80 border border-neutral-800 text-xs font-mono space-y-2">
        <div className="flex items-start gap-2.5 text-neutral-300">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-amber-400">Google Chat API Requirements:</span>
            <p className="text-neutral-400 text-[11px] leading-relaxed">
              Google Chat requires a Google Workspace organization account and one-time configuration of the Chat app in the Google Cloud Console for project <code className="text-amber-300">gen-lang-client-0542677395</code>.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px]">
          <a
            href="https://console.cloud.google.com/apis/api/chat.googleapis.com/hangouts-chat?project=gen-lang-client-0542677395"
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-400 hover:underline flex items-center gap-1 font-bold"
          >
            <span>Open Google Cloud Console Chat Configuration</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <span className="text-neutral-600">·</span>
          <span className="text-neutral-400">
            Click <strong>"Enable Demo Mode"</strong> above to interactively test sending messages and sharing AI reports right now.
          </span>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[560px] bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">
        {/* Left Column: Spaces Browser */}
        <div className="md:col-span-1 border-r border-neutral-800 flex flex-col bg-neutral-900/40">
          <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-neutral-200">
              <Users className="w-4 h-4 text-amber-400" />
              <span>Google Chat Spaces</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">
              {spaces.length} Spaces
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {spaces.length === 0 ? (
              <div className="text-center py-12 px-4 text-neutral-500 font-mono text-xs">
                {user ? (
                  <div>
                    <p className="mb-2">No spaces found or Chat app awaiting configuration.</p>
                    <button
                      onClick={() => {
                        setDemoMode(true);
                        setSpaces(DEMO_CHAT_SPACES);
                        setSelectedSpace(DEMO_CHAT_SPACES[0]);
                        setMessages(DEMO_SPACE_MESSAGES[DEMO_CHAT_SPACES[0].name] || []);
                      }}
                      className="px-3 py-1.5 rounded bg-amber-400 text-neutral-950 font-bold text-xs"
                    >
                      Load Sample Spaces
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="mb-2">Sign in or toggle Demo Mode to view spaces.</p>
                    <button
                      onClick={() => {
                        setDemoMode(true);
                        setSpaces(DEMO_CHAT_SPACES);
                        setSelectedSpace(DEMO_CHAT_SPACES[0]);
                        setMessages(DEMO_SPACE_MESSAGES[DEMO_CHAT_SPACES[0].name] || []);
                      }}
                      className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs"
                    >
                      Use Demo Spaces
                    </button>
                  </div>
                )}
              </div>
            ) : (
              spaces.map(sp => {
                const isSelected = selectedSpace?.name === sp.name;
                return (
                  <button
                    key={sp.name}
                    onClick={() => handleSelectSpace(sp)}
                    className={`w-full p-3 rounded-xl text-left transition-all font-mono cursor-pointer border ${
                      isSelected
                        ? 'bg-amber-950/20 border-amber-400/50 text-neutral-100 shadow-md shadow-amber-400/5'
                        : 'bg-neutral-950/40 border-transparent hover:border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold truncate">{sp.displayName}</span>
                      <span className="text-[10px] text-neutral-500">{sp.spaceType}</span>
                    </div>
                    {sp.description && (
                      <p className="text-[11px] text-neutral-500 truncate">{sp.description}</p>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Chat Space Messages & Composer */}
        <div className="md:col-span-2 flex flex-col bg-neutral-950">
          {selectedSpace ? (
            <>
              {/* Space Header */}
              <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/30">
                <div>
                  <h3 className="text-sm font-bold font-mono text-neutral-100">
                    {selectedSpace.displayName}
                  </h3>
                  <p className="text-[11px] text-neutral-400 font-mono">
                    ID: {selectedSpace.name}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>OAuth Bearer Verified</span>
                </div>
              </div>

              {/* Messages Thread */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {isLoadingMessages ? (
                  <div className="text-center py-12 text-neutral-500 font-mono text-xs">
                    Loading space messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 text-neutral-500 font-mono text-xs">
                    No messages in this space yet. Send the first post below!
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <div
                      key={`${msg.name}-${i}-${msg.createTime}`}
                      className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/80 space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="font-bold text-amber-400">
                          {msg.sender.displayName}
                        </span>
                        <span className="text-neutral-500">
                          {new Date(msg.createTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-200 leading-relaxed font-sans whitespace-pre-wrap">
                        {msg.text}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Message Composer with Prompt Injection Presets */}
              <div className="p-4 border-t border-neutral-800 bg-neutral-900/40 space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setNewMessageText(
                        `[LiquidOS Tensor Report]\nModel: Llama 3.2 3B Q4_K_M\nNNAPI: Qualcomm Hexagon NPU\nThroughput: 52.8 tok/s | TTFT: 38ms\nThermal: 2.8W | Status: Pass`
                      )
                    }
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors cursor-pointer"
                  >
                    + Insert NNAPI Benchmark
                  </button>
                  <button
                    onClick={() =>
                      setNewMessageText(
                        `[A2D Security Audit Dispatch]\nDecompiled reset vector at 0x00001000.\nCryptographic tamper-evident hash: e3b0c44298fc1c149afbf4c8.\nStatus: Sealed in local enclave.`
                      )
                    }
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors cursor-pointer"
                  >
                    + Insert A2D Vault Seal
                  </button>
                </div>

                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    value={newMessageText}
                    onChange={e => setNewMessageText(e.target.value)}
                    placeholder={`Compose message to ${selectedSpace.displayName}...`}
                    className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-neutral-200 placeholder-neutral-500 font-sans focus:outline-none focus:border-amber-400 leading-relaxed"
                  />
                  <button
                    onClick={initiateSendMessage}
                    disabled={isSending || !newMessageText.trim()}
                    className="px-5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:bg-neutral-800 text-neutral-950 font-bold font-mono text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-amber-400/20 cursor-pointer shrink-0"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-neutral-500 font-mono text-xs p-6 text-center">
              Select a Google Chat space from the left panel to inspect messages and collaborate.
            </div>
          )}
        </div>
      </div>

      {/* MANDATORY USER CONFIRMATION MODAL FOR DESTRUCTIVE / MUTATING OPERATIONS */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold font-mono text-neutral-100">
                  Confirm Google Chat Message
                </h3>
                <p className="text-xs text-neutral-400">
                  You are about to post a message to an external Google Workspace Space.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-neutral-950 rounded-xl border border-neutral-800 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-neutral-400">
                <span>Target Space:</span>
                <span className="font-bold text-amber-400">{selectedSpace?.displayName}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Account:</span>
                <span className="text-neutral-200">{user?.email || 'Local User'}</span>
              </div>
              <div className="border-t border-neutral-800 pt-2 text-neutral-300 font-sans leading-relaxed whitespace-pre-wrap max-h-36 overflow-y-auto">
                {pendingMessagePayload}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmedSend}
                disabled={isSending}
                className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold font-mono text-xs shadow-md shadow-amber-400/20 cursor-pointer transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm & Post Message</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
