import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Edit3,
  FileCode2,
  RotateCcw,
  Save,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react';
import {
  AGENT6_BOUNDARY_NOTE,
  AGENT6_STATUS_YAML,
  computeGovernanceStats,
  createInitialGapRegister,
  exportGapRegisterYaml,
  filterGapRegisters,
  GapRegisterItem,
  GapResolutionStatus,
  setGapStatus,
  toggleGapResolution,
  updateGapDescription,
} from '../utils/validator_governance';

const STORAGE_KEY = 'liquidos_validator_governance_v1';

function loadInitialGaps(): GapRegisterItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === 14) {
        return parsed;
      }
    }
  } catch {
    // Ignore storage read errors
  }
  return createInitialGapRegister();
}

export const ValidatorGovernanceView: React.FC = () => {
  const [gaps, setGaps] = useState<GapRegisterItem[]>(loadInitialGaps);
  const [statusFilter, setStatusFilter] = useState<GapResolutionStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showYamlDrawer, setShowYamlDrawer] = useState<boolean>(false);
  const [editingGapId, setEditingGapId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [copiedYaml, setCopiedYaml] = useState<boolean>(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(gaps));
    } catch {
      // Ignore storage write errors
    }
  }, [gaps]);

  const stats = useMemo(() => computeGovernanceStats(gaps), [gaps]);

  const filteredGaps = useMemo(
    () => filterGapRegisters(gaps, statusFilter, searchTerm),
    [gaps, statusFilter, searchTerm]
  );

  const yamlOutput = useMemo(() => exportGapRegisterYaml(gaps), [gaps]);

  const handleToggleGap = (gapId: string) => {
    const stamp = new Date().toLocaleTimeString([], {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setGaps(prev => toggleGapResolution(prev, gapId, stamp));
  };

  const handleSetStatus = (gapId: string, status: GapResolutionStatus) => {
    const stamp = new Date().toLocaleTimeString([], {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setGaps(prev => setGapStatus(prev, gapId, status, stamp));
  };

  const handleSaveSpec = (gapId: string) => {
    const stamp = new Date().toLocaleTimeString([], {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setGaps(prev => updateGapDescription(prev, gapId, editingText, stamp));
    setEditingGapId(null);
    setEditingText('');
  };

  const handleResetAll = () => {
    const fresh = createInitialGapRegister();
    setGaps(fresh);
    setEditingGapId(null);
    setStatusFilter('all');
    setSearchTerm('');
  };

  const handleCopyYaml = async () => {
    try {
      await navigator.clipboard.writeText(yamlOutput);
      setCopiedYaml(true);
      window.setTimeout(() => setCopiedYaml(false), 1800);
    } catch {
      setShowYamlDrawer(true);
    }
  };

  const renderStatusLabel = (status: GapResolutionStatus) => {
    switch (status) {
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Resolved</span>
          </span>
        );
      case 'in_review':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-amber-300">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>In Review</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-rose-400">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Unresolved</span>
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      {/* Header & Agent 6 Boundary Note */}
      <div className="p-6 rounded-xl bg-neutral-900 border border-neutral-800 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
              <h1 className="text-xl font-bold text-neutral-100 tracking-tight">
                Validator Governance · Gap Register (G-01 to G-14)
              </h1>
            </div>
            <p className="text-sm text-neutral-400 max-w-3xl">
              Track and toggle resolution states for the 14 gap registers surfaced by the Agent 6 strict compiler audit, including Governance Parameters (G-01 to G-04), Seed Parse Path (G-11), and load-bearing anchors (G-12 to G-14).
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => setShowYamlDrawer(prev => !prev)}
              className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 font-semibold text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>{showYamlDrawer ? 'Hide YAML Schema' : 'View YAML Schema'}</span>
            </button>

            <button
              onClick={handleResetAll}
              className="px-3.5 py-2 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 font-medium text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Audit State</span>
            </button>
          </div>
        </div>

        {/* Agent 6 YAML Status & Boundary Disclosure */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-3 border-t border-neutral-800">
          <div className="lg:col-span-6 p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 space-y-1.5">
            <div className="text-xs font-medium text-amber-400">
              Agent 6 Compiler Status Anchor
            </div>
            <pre className="text-xs font-mono text-neutral-200 whitespace-pre-wrap leading-relaxed">
              {AGENT6_STATUS_YAML}
            </pre>
          </div>

          <div className="lg:col-span-6 p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 space-y-1.5">
            <div className="text-xs font-medium text-neutral-200">
              M-01.1 Honest Boundary Policy
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              {AGENT6_BOUNDARY_NOTE}
            </p>
            <div className="text-xs font-mono tabular-nums text-neutral-300 pt-1">
              Accessible Specs: {stats.accessibleSpecCount} / {stats.totalCount} · Omitted Specs (G-05 to G-10): {stats.totalCount - stats.accessibleSpecCount}
            </div>
          </div>
        </div>
      </div>

      {/* 4 Governance KPI Summary Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2">
          <div className="text-xs font-medium text-neutral-400">Total Gap Registers</div>
          <div className="text-3xl font-bold font-mono tabular-nums text-neutral-100">
            {stats.totalCount}
          </div>
          <div className="text-xs text-neutral-400">G-01 through G-14 tracked</div>
        </div>

        <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2">
          <div className="text-xs font-medium text-neutral-400">Resolved</div>
          <div className="text-3xl font-bold font-mono tabular-nums text-emerald-400">
            {stats.resolvedCount} <span className="text-sm font-normal text-neutral-400">/ {stats.totalCount}</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
            <div
              className="h-full bg-emerald-400 transition-all duration-300"
              style={{ width: `${stats.completionPct}%` }}
            />
          </div>
          <div className="text-xs font-mono tabular-nums text-neutral-400">
            {stats.completionPct}% resolution complete
          </div>
        </div>

        <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2">
          <div className="text-xs font-medium text-neutral-400">Unresolved / Open</div>
          <div className="text-3xl font-bold font-mono tabular-nums text-rose-400">
            {stats.unresolvedCount}
          </div>
          <div className="text-xs font-mono tabular-nums text-amber-300">
            {stats.inReviewCount} currently in review
          </div>
        </div>

        <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2">
          <div className="text-xs font-medium text-neutral-400">Load-Bearing Anchors</div>
          <div className="text-3xl font-bold font-mono tabular-nums text-amber-400">
            {stats.loadBearingRemaining} <span className="text-sm font-normal text-neutral-400">open</span>
          </div>
          <div className="text-xs text-neutral-400">
            Tracks G-11 and record anchors G-12 to G-14
          </div>
        </div>
      </div>

      {/* Collapsible Live YAML Schema Output */}
      {showYamlDrawer && (
        <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-neutral-100">
                Machine-Readable Gap Register Schema (YAML)
              </h2>
              <p className="text-xs text-neutral-400">
                Updates dynamically whenever you toggle gap resolution states below.
              </p>
            </div>
            <button
              onClick={handleCopyYaml}
              className="px-3.5 py-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 text-xs font-mono text-amber-300 cursor-pointer whitespace-nowrap shrink-0"
            >
              {copiedYaml ? 'Copied YAML' : 'Copy YAML'}
            </button>
          </div>
          <pre className="p-4 rounded-lg bg-neutral-950 border border-neutral-800 text-xs font-mono text-neutral-200 max-h-64 overflow-y-auto whitespace-pre">
            {yamlOutput}
          </pre>
        </div>
      )}

      {/* Search & Status Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 rounded-xl bg-neutral-900 border border-neutral-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Filter by Gap ID (e.g. G-11), category, or specification..."
            aria-label="Search gap registers"
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-9 pr-3 py-2 text-xs font-mono text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-400"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {(
            [
              { id: 'all', label: `All (${stats.totalCount})` },
              { id: 'unresolved', label: `Unresolved (${stats.unresolvedCount})` },
              { id: 'in_review', label: `In Review (${stats.inReviewCount})` },
              { id: 'resolved', label: `Resolved (${stats.resolvedCount})` },
            ] as const
          ).map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-mono whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-amber-400 text-neutral-950 font-bold'
                  : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-neutral-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Gap Register Rows (G-01 through G-14) */}
      <div className="rounded-xl bg-neutral-900 border border-neutral-800 overflow-hidden">
        <div className="px-5 py-3 border-b border-neutral-800 flex items-center justify-between text-xs font-mono text-neutral-400">
          <span>Showing {filteredGaps.length} of {stats.totalCount} Gap Registers</span>
          <span>Click Toggle Status to mark a gap Resolved or Unresolved</span>
        </div>

        {filteredGaps.length === 0 ? (
          <div className="py-12 px-4 text-center text-xs font-mono text-neutral-500">
            No gap registers match your current filter.
          </div>
        ) : (
          <div className="divide-y divide-neutral-800">
            {filteredGaps.map(item => {
              const isEditing = editingGapId === item.id;
              return (
                <div
                  key={item.id}
                  className="p-4 sm:px-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-neutral-950/50 transition-colors"
                >
                  {/* Left: Gap Identity, Metadata, and Specification */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono font-bold text-amber-400">
                        {item.id}
                      </span>
                      <span className="text-neutral-600" aria-hidden="true">·</span>
                      <span className="font-semibold text-neutral-100">
                        {item.title}
                      </span>
                      <span className="text-neutral-600" aria-hidden="true">·</span>
                      <span className="text-neutral-400 font-mono">
                        {item.category}
                      </span>
                      {item.loadBearing && (
                        <>
                          <span className="text-neutral-600" aria-hidden="true">·</span>
                          <span className="font-mono text-amber-300">
                            Load-Bearing
                          </span>
                        </>
                      )}
                      {!item.specAccessible && (
                        <>
                          <span className="text-neutral-600" aria-hidden="true">·</span>
                          <span className="font-mono text-neutral-500">
                            Spec Not Provided
                          </span>
                        </>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                        <input
                          type="text"
                          value={editingText}
                          onChange={e => setEditingText(e.target.value)}
                          aria-label={`Specification text for ${item.id}`}
                          className="flex-1 bg-neutral-950 border border-amber-400/60 rounded-lg px-3 py-1.5 text-xs font-mono text-neutral-100 focus:outline-none"
                        />
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleSaveSpec(item.id)}
                            className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 font-semibold text-xs flex items-center gap-1 cursor-pointer"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Save</span>
                          </button>
                          <button
                            onClick={() => setEditingGapId(null)}
                            aria-label={`Cancel editing ${item.id}`}
                            className="p-1.5 rounded-lg bg-neutral-800 text-neutral-300 hover:text-white cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-400 leading-relaxed">
                        {item.description}
                      </p>
                    )}

                    <div className="text-[11px] font-mono text-neutral-500">
                      Last state change: {item.updatedAt}
                    </div>
                  </div>

                  {/* Right: Explicit Status Display + Toggle Controls */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
                    <div className="min-w-[100px]">{renderStatusLabel(item.status)}</div>

                    <div className="flex items-center gap-1 p-1 rounded-lg bg-neutral-950 border border-neutral-800 text-[11px] font-mono">
                      {(
                        [
                          { id: 'unresolved', label: 'Open' },
                          { id: 'in_review', label: 'Review' },
                          { id: 'resolved', label: 'Done' },
                        ] as const
                      ).map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => handleSetStatus(item.id, opt.id)}
                          aria-label={`Set ${item.id} to ${opt.label}`}
                          className={`px-2.5 py-1 rounded transition-colors cursor-pointer whitespace-nowrap ${
                            item.status === opt.id
                              ? opt.id === 'resolved'
                                ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                                : opt.id === 'in_review'
                                ? 'bg-amber-400/20 text-amber-300 font-bold'
                                : 'bg-rose-500/20 text-rose-300 font-bold'
                              : 'text-neutral-400 hover:text-neutral-200'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => handleToggleGap(item.id)}
                      aria-label={`Toggle ${item.id} resolution status`}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${
                        item.status === 'resolved'
                          ? 'bg-neutral-950 border-neutral-700 text-neutral-200 hover:border-rose-500/60 hover:text-rose-300'
                          : 'bg-amber-400 border-amber-400 text-neutral-950 hover:bg-amber-300'
                      }`}
                    >
                      {item.status === 'resolved' ? 'Reopen Gap' : 'Mark Resolved'}
                    </button>

                    <button
                      onClick={() => {
                        setEditingGapId(item.id);
                        setEditingText(item.description);
                      }}
                      aria-label={`Edit specification for ${item.id}`}
                      title={`Edit specification for ${item.id}`}
                      className="p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-amber-300 hover:border-neutral-700 transition-colors cursor-pointer shrink-0"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
