import React, { useState } from 'react';
import {
  X,
  Search,
  MessageSquare,
  Plus,
  Trash2,
  Clock,
  Shield,
  ShieldCheck,
  Check,
  ChevronRight,
  Cpu,
  Lock,
} from 'lucide-react';
import { ChatHistoryService, ChatSession, SearchMatch } from '../utils/chat_history';

interface ChatHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  chatHistoryService: ChatHistoryService;
  activeSessionId: string;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onUpdate: () => void;
}

export const ChatHistoryDrawer: React.FC<ChatHistoryDrawerProps> = ({
  isOpen,
  onClose,
  chatHistoryService,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onUpdate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  if (!isOpen) return null;

  const sessions = chatHistoryService.getSessions();
  const searchResults: SearchMatch[] = searchQuery.trim()
    ? chatHistoryService.searchConversations(searchQuery)
    : [];

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    chatHistoryService.deleteSession(sessionId);
    onUpdate();
  };

  const handleClearAll = () => {
    chatHistoryService.clearAllSessions();
    setConfirmClearAll(false);
    onUpdate();
  };

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-neutral-900 border-r border-neutral-800 h-full flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-400/10 text-amber-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-100 font-mono">Chat History</h2>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400">
                <ShieldCheck className="w-3 h-3" />
                <span>Zero Telemetry · Pure Local Storage</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action: New Session Button */}
        <div className="p-4 border-b border-neutral-800/80 bg-neutral-950/30">
          <button
            onClick={() => {
              onNewSession();
              onClose();
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-mono font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-400/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Air-Gapped Conversation</span>
          </button>
        </div>

        {/* Search Bar across all conversations */}
        <div className="px-4 py-3 border-b border-neutral-800 bg-neutral-900/60">
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search all past chats locally..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-9 pr-3 py-2 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-400 font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 text-xs"
              >
                ✕
              </button>
            )}
          </div>
          {searchQuery.trim() && (
            <div className="mt-2 text-[11px] font-mono text-neutral-400 flex items-center justify-between px-1">
              <span>{searchResults.length} match(es) across messages</span>
              <span className="text-amber-400">Client-Side Scanned</span>
            </div>
          )}
        </div>

        {/* Content: Search results OR Session List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {searchQuery.trim() ? (
            /* Search Results View */
            searchResults.length === 0 ? (
              <div className="text-center py-12 text-neutral-500 font-mono text-xs">
                No conversations or messages contain "{searchQuery}".
              </div>
            ) : (
              searchResults.map(match => (
                <div
                  key={`${match.sessionId}-${match.messageId}`}
                  onClick={() => {
                    onSelectSession(match.sessionId);
                    onClose();
                  }}
                  className="p-3 rounded-xl border border-neutral-800 bg-neutral-950/60 hover:border-amber-400/50 transition-all cursor-pointer space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="font-bold text-amber-400 truncate max-w-[200px]">
                      {match.sessionTitle}
                    </span>
                    <span className="text-neutral-500">{formatTimestamp(match.timestamp)}</span>
                  </div>
                  <div className="text-xs text-neutral-300 font-sans leading-relaxed bg-neutral-900/80 p-2 rounded border border-neutral-800/80">
                    <span className="text-[10px] font-mono uppercase text-neutral-500 block mb-0.5">
                      {match.role}:
                    </span>
                    {match.matchedTextSnippet}
                  </div>
                </div>
              ))
            )
          ) : (
            /* Regular Conversations List */
            sessions.map(session => {
              const isSelected = session.id === activeSessionId;
              const lastMessage = session.messages[session.messages.length - 1];

              return (
                <div
                  key={session.id}
                  onClick={() => {
                    onSelectSession(session.id);
                    onClose();
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer group ${
                    isSelected
                      ? 'bg-amber-950/20 border-amber-400/60 shadow-md shadow-amber-400/5'
                      : 'bg-neutral-950/50 border-neutral-800/80 hover:border-neutral-700 hover:bg-neutral-950'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        {session.isEncryptedInVault && (
                          <span title="A2D Encrypted">
                            <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                          </span>
                        )}
                        <h3 className="text-xs font-bold text-neutral-200 truncate font-mono">
                          {session.title}
                        </h3>
                      </div>

                      {lastMessage ? (
                        <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">
                          {lastMessage.content}
                        </p>
                      ) : (
                        <p className="text-[11px] text-neutral-600 italic">Empty session</p>
                      )}

                      <div className="flex items-center gap-3 mt-2 text-[10px] font-mono text-neutral-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatTimestamp(session.updatedAt)}</span>
                        </span>
                        <span>·</span>
                        <span>{session.messages.length} msg(s)</span>
                      </div>
                    </div>

                    <button
                      onClick={e => handleDeleteSession(session.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded text-neutral-500 hover:text-red-400 hover:bg-red-950/30 transition-all cursor-pointer shrink-0"
                      title="Delete conversation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950/80 flex items-center justify-between text-xs font-mono">
          {confirmClearAll ? (
            <div className="flex items-center justify-between w-full">
              <span className="text-[11px] text-red-400">Clear all local chats?</span>
              <div className="flex gap-2">
                <button
                  onClick={handleClearAll}
                  className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-bold text-[11px] cursor-pointer"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmClearAll(false)}
                  className="px-2 py-1 rounded bg-neutral-800 text-neutral-300 text-[11px] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <span className="text-neutral-500 text-[11px]">
                {sessions.length} conversation(s) stored
              </span>
              <button
                onClick={() => setConfirmClearAll(true)}
                className="text-neutral-500 hover:text-red-400 transition-colors text-[11px] cursor-pointer"
              >
                Clear All
              </button>
            </>
          )}
        </div>
      </div>

      {/* Outside click detector */}
      <div className="flex-1" onClick={onClose} />
    </div>
  );
};
