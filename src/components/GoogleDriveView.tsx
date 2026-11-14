import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  Search,
  Upload,
  Trash2,
  FileText,
  Cpu,
  Lock,
  Folder,
  FileCode,
  RefreshCw,
  LogOut,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  X,
  Plus,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  initGoogleDriveAuth,
  googleDriveSignIn,
  googleDriveSignOut,
  listDriveFiles,
  readDriveFileContent,
  uploadDriveFile,
  deleteDriveFile,
  DriveFileItem,
  DEMO_DRIVE_FILES,
} from '../services/google_drive_service';
import {
  formatDriveFileSize,
  classifyDriveFile,
  validateUploadInput,
  DriveFileCategory,
} from '../utils/drive_helpers';
import { TextSummarizerPlugin, SummarizeResult } from '../plugins/text_summarizer_plugin';
import { A2DCryptoVault } from '../utils/a2d_crypto';

interface GoogleDriveViewProps {
  initialExportPayload?: { filename: string; content: string } | null;
  onClearInitialExport?: () => void;
}

export const GoogleDriveView: React.FC<GoogleDriveViewProps> = ({
  initialExportPayload,
  onClearInitialExport,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [demoMode, setDemoMode] = useState(false);

  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<DriveFileCategory | 'all'>('all');
  const [selectedFile, setSelectedFile] = useState<DriveFileItem | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Local AI summarization & A2D vault state
  const [localSummary, setLocalSummary] = useState<SummarizeResult | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [sealedHash, setSealedHash] = useState<string | null>(null);

  // Upload composer modal
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFilename, setUploadFilename] = useState('liquid_os_report.md');
  const [uploadContent, setUploadContent] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Mandatory confirmation dialog for mutating operations (upload / delete)
  const [confirmDialog, setConfirmDialog] = useState<
    | { type: 'upload'; filename: string; content: string; mimeType: string }
    | { type: 'delete'; file: DriveFileItem }
    | null
  >(null);
  const [isMutating, setIsMutating] = useState(false);

  useEffect(() => {
    if (initialExportPayload) {
      setUploadFilename(initialExportPayload.filename);
      setUploadContent(initialExportPayload.content);
      setIsUploadModalOpen(true);
    }
  }, [initialExportPayload]);

  useEffect(() => {
    const unsubscribe = initGoogleDriveAuth(
      (authenticatedUser, accessToken) => {
        setUser(authenticatedUser);
        setToken(accessToken);
        setIsLoadingAuth(false);
        setDemoMode(false);
        fetchFiles(accessToken, searchTerm, categoryFilter);
      },
      () => {
        setUser(null);
        setToken(null);
        setIsLoadingAuth(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const fetchFiles = async (
    accessToken: string,
    query = searchTerm,
    category: DriveFileCategory | 'all' = categoryFilter
  ) => {
    setIsLoadingFiles(true);
    setApiError(null);
    try {
      const list = await listDriveFiles(accessToken, query, category);
      setFiles(list);
      if (list.length > 0 && !selectedFile) {
        handleSelectFile(list[0], accessToken, false);
      }
    } catch (err: any) {
      setApiError(err.message || 'Failed to list Google Drive files.');
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleSignIn = async () => {
    setIsLoadingAuth(true);
    setApiError(null);
    try {
      const res = await googleDriveSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        setDemoMode(false);
        await fetchFiles(res.accessToken);
      }
    } catch (err: any) {
      setApiError(err.message || 'Google Sign-In failed. You can use Demo Mode to explore locally.');
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleSignOut = async () => {
    await googleDriveSignOut();
    setUser(null);
    setToken(null);
    setFiles([]);
    setSelectedFile(null);
    setFileContent('');
  };

  const enableDemoFiles = () => {
    setDemoMode(true);
    setApiError(null);
    setFiles(DEMO_DRIVE_FILES);
    setSelectedFile(DEMO_DRIVE_FILES[0]);
    setFileContent(DEMO_DRIVE_FILES[0].contentPreview || '');
    setLocalSummary(null);
    setSealedHash(null);
  };

  const handleSelectFile = async (
    file: DriveFileItem,
    overrideToken?: string,
    isDemo = demoMode
  ) => {
    setSelectedFile(file);
    setLocalSummary(null);
    setSealedHash(null);
    setIsLoadingContent(true);
    try {
      const activeToken = overrideToken || token;
      if (isDemo || !activeToken) {
        setFileContent(file.contentPreview || `[Preview unavailable for ${file.name}]`);
      } else {
        const text = await readDriveFileContent(file, activeToken);
        setFileContent(text);
      }
    } catch (err: any) {
      setFileContent(`Error loading file content: ${err.message}`);
    } finally {
      setIsLoadingContent(false);
    }
  };

  const handleSummarizeFile = async () => {
    if (!fileContent.trim() || isSummarizing) return;
    setIsSummarizing(true);
    try {
      const plugin = new TextSummarizerPlugin();
      await plugin.initialize();
      const result = await plugin.summarize({
        text: fileContent,
        format: 'bullets',
        length: 'balanced',
        activeModelId: 'Llama-3.2-3B (NNAPI Q4_K_M)',
        sealInA2DVault: true,
      });
      setLocalSummary(result);
    } catch (err: any) {
      setApiError(err.message || 'Summarization failed');
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleSealInVault = async () => {
    if (!fileContent.trim()) return;
    const encrypted = await A2DCryptoVault.encrypt(
      fileContent,
      'argon2id-drive-enclave-seal'
    );
    setSealedHash(encrypted.integrityHash.slice(0, 24));
  };

  const handlePrepareUpload = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateUploadInput(uploadFilename, uploadContent);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid file input.');
      return;
    }
    setUploadError(null);
    const mimeType = validation.sanitizedName.endsWith('.json') || validation.sanitizedName.endsWith('.a2d')
      ? 'application/json'
      : validation.sanitizedName.endsWith('.md')
      ? 'text/markdown'
      : 'text/plain';

    setConfirmDialog({
      type: 'upload',
      filename: validation.sanitizedName,
      content: uploadContent,
      mimeType,
    });
  };

  const handleExecuteConfirmedMutation = async () => {
    if (!confirmDialog) return;
    setIsMutating(true);
    setApiError(null);

    try {
      if (confirmDialog.type === 'upload') {
        if (demoMode || !token) {
          const created: DriveFileItem = {
            id: `drv-local-${Date.now()}`,
            name: confirmDialog.filename,
            mimeType: confirmDialog.mimeType,
            size: String(confirmDialog.content.length),
            modifiedTime: new Date().toISOString(),
            ownerDisplayName: user?.displayName || 'Local Security Engineer',
            contentPreview: confirmDialog.content,
          };
          setFiles(prev => [created, ...prev]);
          setSelectedFile(created);
          setFileContent(confirmDialog.content);
          setLocalSummary(null);
          setSealedHash(null);
        } else {
          const created = await uploadDriveFile(
            confirmDialog.filename,
            confirmDialog.content,
            confirmDialog.mimeType,
            token
          );
          setFiles(prev => [created, ...prev]);
          setSelectedFile(created);
          setFileContent(confirmDialog.content);
          setLocalSummary(null);
          setSealedHash(null);
        }
        setIsUploadModalOpen(false);
        setUploadContent('');
        if (onClearInitialExport) onClearInitialExport();
      } else if (confirmDialog.type === 'delete') {
        const targetId = confirmDialog.file.id;
        if (!demoMode && token) {
          await deleteDriveFile(targetId, token);
        }
        setFiles(prev => {
          const remaining = prev.filter(f => f.id !== targetId);
          if (selectedFile?.id === targetId) {
            setSelectedFile(remaining[0] || null);
            setFileContent(remaining[0]?.contentPreview || '');
            setLocalSummary(null);
            setSealedHash(null);
          }
          return remaining;
        });
      }
    } catch (err: any) {
      setApiError(err.message || 'Operation failed.');
    } finally {
      setIsMutating(false);
      setConfirmDialog(null);
    }
  };

  // Filtered list when in demo mode (live mode uses Drive API `q`)
  const displayedFiles = demoMode || !token
    ? files.filter(f => {
        const cat = classifyDriveFile(f.name, f.mimeType);
        if (categoryFilter !== 'all' && cat !== categoryFilter) return false;
        if (searchTerm.trim()) {
          return f.name.toLowerCase().includes(searchTerm.trim().toLowerCase());
        }
        return true;
      })
    : files;

  const renderCategoryBadge = (file: DriveFileItem) => {
    const cat = classifyDriveFile(file.name, file.mimeType);
    switch (cat) {
      case 'gguf':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-400/15 text-amber-300 border border-amber-400/30 flex items-center gap-1">
            <Cpu className="w-2.5 h-2.5" />
            <span>GGUF</span>
          </span>
        );
      case 'vault':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1">
            <Lock className="w-2.5 h-2.5" />
            <span>A2D VAULT</span>
          </span>
        );
      case 'folder':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-neutral-800 text-neutral-300 flex items-center gap-1">
            <Folder className="w-2.5 h-2.5" />
            <span>FOLDER</span>
          </span>
        );
      case 'binary':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-950/60 text-purple-300 border border-purple-800/60 flex items-center gap-1">
            <FileCode className="w-2.5 h-2.5" />
            <span>BINARY</span>
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-neutral-800 text-neutral-300 flex items-center gap-1">
            <FileText className="w-2.5 h-2.5" />
            <span>DOC</span>
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6 animate-in fade-in duration-300">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-mono text-neutral-100 flex items-center gap-2">
              <span>Google Drive Workspace Vault</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/30 text-amber-300">
                drive.googleapis.com
              </span>
            </h1>
            <p className="text-xs text-neutral-400">
              Browse GGUF weights, inspect security audit logs, summarize locally via NNAPI, or export A2D-sealed backups to Google Drive.
            </p>
          </div>
        </div>

        {/* Auth & Mode Controls */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
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
                aria-label="Sign out of Google Drive"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              disabled={isLoadingAuth}
              className="flex items-center gap-2.5 px-3.5 py-2 bg-white hover:bg-neutral-100 active:bg-neutral-200 text-neutral-800 font-sans font-medium text-xs rounded-lg shadow transition-all cursor-pointer border border-neutral-300 whitespace-nowrap shrink-0"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>{isLoadingAuth ? 'Connecting...' : 'Sign in with Google'}</span>
            </button>
          )}

          <button
            onClick={() => {
              if (demoMode) {
                setDemoMode(false);
                if (!token) {
                  setFiles([]);
                  setSelectedFile(null);
                  setFileContent('');
                }
              } else {
                enableDemoFiles();
              }
            }}
            className={`px-3 py-2 rounded-lg text-xs font-mono transition-colors border cursor-pointer whitespace-nowrap shrink-0 ${
              demoMode
                ? 'bg-amber-400/15 text-amber-300 font-semibold border-amber-400/60'
                : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-amber-400/60'
            }`}
          >
            {demoMode ? 'Demo Mode Active' : 'Enable Demo Mode'}
          </button>

          {(user || demoMode) && (
            <button
              onClick={() => {
                setUploadFilename('liquid_os_audit_export.md');
                setUploadContent(
                  `# LiquidOS Offline Intelligence Export\nTimestamp: ${new Date().toISOString()}\nNNAPI Coprocessor: Qualcomm Hexagon NPU V73\nVault Cipher: AES-256-GCM / Argon2id\n\nAll tensor inference logs verified locally prior to Drive sync.`
                );
                setUploadError(null);
                setIsUploadModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 font-mono font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-400/20 cursor-pointer transition-all whitespace-nowrap shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload to Drive</span>
            </button>
          )}
        </div>
      </div>

      {/* Error / Status Notice */}
      {apiError && (
        <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-800/80 text-xs font-mono text-red-300 flex items-center justify-between gap-4">
          <span>{apiError}</span>
          {!demoMode && (
            <button
              onClick={enableDemoFiles}
              className="px-3 py-1 rounded bg-red-900/60 hover:bg-red-800 text-white text-[11px] shrink-0 cursor-pointer"
            >
              Switch to Demo Files
            </button>
          )}
        </div>
      )}

      {/* Search & Category Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-neutral-900/70 border border-neutral-800 rounded-xl p-3">
        <form
          onSubmit={e => {
            e.preventDefault();
            if (token && !demoMode) {
              fetchFiles(token, searchTerm, categoryFilter);
            }
          }}
          className="relative flex-1"
        >
          <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search Google Drive files (e.g. GGUF, ghidra, vault)..."
            aria-label="Search Google Drive files"
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-9 pr-3 py-2 text-xs font-mono text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-400"
          />
        </form>

        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-mono">
          {([
            { id: 'all', label: 'All Files' },
            { id: 'document', label: 'Documents' },
            { id: 'gguf', label: 'GGUF Weights' },
            { id: 'vault', label: 'A2D Vault' },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setCategoryFilter(tab.id);
                if (token && !demoMode) {
                  fetchFiles(token, searchTerm, tab.id);
                }
              }}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                categoryFilter === tab.id
                  ? 'bg-amber-400 text-neutral-950 font-bold'
                  : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-neutral-200'
              }`}
            >
              {tab.label}
            </button>
          ))}

          {token && !demoMode && (
            <button
              onClick={() => fetchFiles(token, searchTerm, categoryFilter)}
              className="p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-amber-400 cursor-pointer"
              aria-label="Refresh Drive files"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Main Split Browser & File Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[540px]">
        {/* Left: Files List */}
        <div className="lg:col-span-5 bg-neutral-950 border border-neutral-800 rounded-2xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-800 bg-neutral-900/50 flex items-center justify-between text-xs font-mono">
            <span className="font-bold text-neutral-200">Drive Files</span>
            <span className="text-neutral-400">{displayedFiles.length} item(s)</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[520px]">
            {!user && !demoMode ? (
              <div className="text-center py-14 px-4 space-y-3">
                <HardDrive className="w-8 h-8 text-neutral-600 mx-auto" />
                <p className="text-xs font-mono text-neutral-400">
                  Sign in with Google to browse your real Google Drive files, or activate Demo Mode to test offline workflows.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={enableDemoFiles}
                    className="px-3.5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 font-mono font-bold text-xs cursor-pointer"
                  >
                    Load Demo Drive Vault
                  </button>
                </div>
              </div>
            ) : isLoadingFiles ? (
              <div className="text-center py-12 text-xs font-mono text-neutral-400 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                <span>Querying drive.googleapis.com...</span>
              </div>
            ) : displayedFiles.length === 0 ? (
              <div className="text-center py-12 text-xs font-mono text-neutral-500">
                No files match your filter criteria.
              </div>
            ) : (
              displayedFiles.map(file => {
                const isSelected = selectedFile?.id === file.id;
                return (
                  <div
                    key={file.id}
                    className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-2 ${
                      isSelected
                        ? 'bg-amber-950/20 border-amber-400/60 shadow-md shadow-amber-400/5'
                        : 'bg-neutral-900/40 border-neutral-800/80 hover:border-neutral-700'
                    }`}
                  >
                    <button
                      onClick={() => handleSelectFile(file)}
                      className="flex-1 text-left min-w-0 cursor-pointer space-y-1.5"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        {renderCategoryBadge(file)}
                        <span className="text-xs font-mono font-bold text-neutral-100 truncate">
                          {file.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] font-mono text-neutral-500">
                        <span>{formatDriveFileSize(file.size)}</span>
                        <span>·</span>
                        <span>
                          {new Date(file.modifiedTime).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        {file.ownerDisplayName && (
                          <>
                            <span>·</span>
                            <span className="truncate">{file.ownerDisplayName}</span>
                          </>
                        )}
                      </div>
                    </button>

                    <button
                      onClick={() => setConfirmDialog({ type: 'delete', file })}
                      aria-label={`Delete ${file.name}`}
                      title={`Delete ${file.name}`}
                      className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: File Inspector & Local AI Processing */}
        <div className="lg:col-span-7 bg-neutral-950 border border-neutral-800 rounded-2xl flex flex-col overflow-hidden">
          {selectedFile ? (
            <>
              <div className="px-5 py-3.5 border-b border-neutral-800 bg-neutral-900/40 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {renderCategoryBadge(selectedFile)}
                    <h2 className="text-sm font-bold font-mono text-neutral-100 truncate">
                      {selectedFile.name}
                    </h2>
                  </div>
                  <p className="text-[11px] font-mono text-neutral-500 mt-0.5">
                    ID: {selectedFile.id} · Size: {formatDriveFileSize(selectedFile.size)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {selectedFile.webViewLink && (
                    <a
                      href={selectedFile.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 text-xs font-mono flex items-center gap-1"
                    >
                      <span>Open in Drive</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  <button
                    onClick={handleSummarizeFile}
                    disabled={isSummarizing || !fileContent.trim()}
                    className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-neutral-950 font-mono font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isSummarizing ? 'Summarizing...' : 'Summarize Locally'}</span>
                  </button>
                  <button
                    onClick={handleSealInVault}
                    disabled={!fileContent.trim()}
                    className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-emerald-400 font-mono text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>A2D Seal</span>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {isLoadingContent ? (
                  <div className="text-xs font-mono text-neutral-400 flex items-center gap-2 py-8">
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                    <span>Fetching file stream from Google Drive...</span>
                  </div>
                ) : (
                  <div>
                    <div className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider mb-1.5">
                      File Content Preview
                    </div>
                    <pre className="p-4 rounded-xl bg-neutral-900/70 border border-neutral-800 text-xs font-mono text-neutral-200 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                      {fileContent}
                    </pre>
                  </div>
                )}

                {sealedHash && (
                  <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/80 text-xs font-mono text-emerald-300 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Encrypted with A2D AES-256-GCM · Integrity Tag: {sealedHash}...</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-900/60">LOCAL ONLY</span>
                  </div>
                )}

                {localSummary && (
                  <div className="p-4 rounded-xl bg-neutral-900 border border-amber-400/30 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-amber-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Local NNAPI Summarization Output</span>
                      </span>
                      <span className="text-emerald-400">
                        {localSummary.compressionRatioPct}% Compression ({localSummary.inferenceTimeMs}ms)
                      </span>
                    </div>
                    <p className="text-xs text-neutral-200 leading-relaxed">{localSummary.summary}</p>
                    {localSummary.a2dVaultRecordId && (
                      <div className="text-[10px] font-mono text-neutral-400 pt-1 border-t border-neutral-800">
                        A2D Vault Seal ID: {localSummary.a2dVaultRecordId}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-center text-xs font-mono text-neutral-500">
              Select a file from Google Drive on the left to inspect its contents, summarize it locally with NNAPI, or encrypt it in the A2D Vault.
            </div>
          )}
        </div>
      </div>

      {/* Upload / Export Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Upload className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold font-mono text-neutral-100">
                  Upload File to Google Drive
                </h3>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                aria-label="Close upload modal"
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePrepareUpload} className="space-y-4">
              <div>
                <label htmlFor="drive-upload-filename" className="block text-xs font-mono text-neutral-400 mb-1">
                  Filename
                </label>
                <input
                  id="drive-upload-filename"
                  type="text"
                  value={uploadFilename}
                  onChange={e => setUploadFilename(e.target.value)}
                  placeholder="e.g. a2d_audit_report.md"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-neutral-200 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label htmlFor="drive-upload-content" className="block text-xs font-mono text-neutral-400 mb-1">
                  File Content
                </label>
                <textarea
                  id="drive-upload-content"
                  rows={6}
                  value={uploadContent}
                  onChange={e => setUploadContent(e.target.value)}
                  placeholder="Paste report, A2D log, or AI summary to upload..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-xs font-mono text-neutral-200 focus:outline-none focus:border-amber-400"
                />
              </div>

              {uploadError && (
                <div className="text-xs font-mono text-red-400">{uploadError}</div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold font-mono text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Review & Upload</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANDATORY USER CONFIRMATION DIALOG FOR MUTATING DRIVE OPERATIONS */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold font-mono text-neutral-100">
                  {confirmDialog.type === 'delete'
                    ? 'Delete File from Google Drive?'
                    : 'Upload File to Google Drive?'}
                </h3>
                <p className="text-xs text-neutral-400">
                  {confirmDialog.type === 'delete'
                    ? 'This action permanently deletes or trashes the selected file from your Google Drive.'
                    : 'Confirm creating this file in your Google Drive account.'}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-mono space-y-1.5">
              {confirmDialog.type === 'delete' ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Filename:</span>
                    <span className="text-red-400 font-bold truncate max-w-[220px]">
                      {confirmDialog.file.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">File ID:</span>
                    <span className="text-neutral-300 truncate max-w-[220px]">{confirmDialog.file.id}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Filename:</span>
                    <span className="text-amber-400 font-bold truncate max-w-[220px]">
                      {confirmDialog.filename}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Bytes:</span>
                    <span className="text-neutral-300">{confirmDialog.content.length} bytes</span>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmDialog(null)}
                disabled={isMutating}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteConfirmedMutation}
                disabled={isMutating}
                className={`px-5 py-2 rounded-xl font-bold font-mono text-xs flex items-center gap-1.5 cursor-pointer ${
                  confirmDialog.type === 'delete'
                    ? 'bg-red-600 hover:bg-red-500 text-white'
                    : 'bg-amber-400 hover:bg-amber-300 text-neutral-950'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isMutating
                    ? 'Processing...'
                    : confirmDialog.type === 'delete'
                    ? 'Confirm Delete'
                    : 'Confirm Upload'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
