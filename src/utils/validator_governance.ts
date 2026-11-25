/**
 * Validator Governance & Gap Register (G-01 through G-14)
 * Grounded strictly in the accessible prompt context (Agent 6 audit schema).
 * Entries whose detailed specifications were not supplied in the prompt are
 * explicitly marked with specAccessible: false rather than synthesized.
 */

export type GapResolutionStatus = 'unresolved' | 'in_review' | 'resolved';

export type GapCategory =
  | 'Governance Parameter'
  | 'Seed Parse Path'
  | 'Load-Bearing Record'
  | 'Specification Omitted';

export interface GapRegisterItem {
  id: string;
  number: number;
  title: string;
  category: GapCategory;
  loadBearing: boolean;
  specAccessible: boolean;
  description: string;
  status: GapResolutionStatus;
  updatedAt: string;
}

export interface GovernanceStats {
  totalCount: number;
  resolvedCount: number;
  inReviewCount: number;
  unresolvedCount: number;
  completionPct: number;
  loadBearingRemaining: number;
  accessibleSpecCount: number;
}

export const AGENT6_STATUS_YAML = `status: >-
  NOT A VALIDATOR PROOF — Toolchain Demo Only. After Agent 5 audit:
  planted-defect regression test, not a differential harness. n=1.`;

export const AGENT6_BOUNDARY_NOTE =
  'Recovery is judged against honest accessible state, not completeness of rendering. Entries without accessible source specs remain explicitly marked as unprovided until supplied by the orchestrator.';

export function createInitialGapRegister(): GapRegisterItem[] {
  const entries: Array<Omit<GapRegisterItem, 'status' | 'updatedAt'>> = [
    {
      id: 'G-01',
      number: 1,
      title: 'Governance Parameter G-01',
      category: 'Governance Parameter',
      loadBearing: false,
      specAccessible: true,
      description:
        'Referenced as part of Governance Parameters (G-01 through G-04) for local validator compilation; exact numeric thresholds not supplied in current prompt.',
    },
    {
      id: 'G-02',
      number: 2,
      title: 'Governance Parameter G-02',
      category: 'Governance Parameter',
      loadBearing: false,
      specAccessible: true,
      description:
        'Referenced as part of Governance Parameters (G-01 through G-04) for local validator compilation; exact parameter schema not supplied in current prompt.',
    },
    {
      id: 'G-03',
      number: 3,
      title: 'Governance Parameter G-03',
      category: 'Governance Parameter',
      loadBearing: false,
      specAccessible: true,
      description:
        'Referenced as part of Governance Parameters (G-01 through G-04) for local validator compilation; exact parameter bounds not supplied in current prompt.',
    },
    {
      id: 'G-04',
      number: 4,
      title: 'Governance Parameter G-04',
      category: 'Governance Parameter',
      loadBearing: false,
      specAccessible: true,
      description:
        'Referenced as part of Governance Parameters (G-01 through G-04) for local validator compilation; exact governance rule text not supplied in current prompt.',
    },
    {
      id: 'G-05',
      number: 5,
      title: 'Gap Register G-05 (Spec Omitted)',
      category: 'Specification Omitted',
      loadBearing: false,
      specAccessible: false,
      description:
        'Detailed specification for G-05 was not included in the accessible prompt or workspace files.',
    },
    {
      id: 'G-06',
      number: 6,
      title: 'Gap Register G-06 (Spec Omitted)',
      category: 'Specification Omitted',
      loadBearing: false,
      specAccessible: false,
      description:
        'Detailed specification for G-06 was not included in the accessible prompt or workspace files.',
    },
    {
      id: 'G-07',
      number: 7,
      title: 'Gap Register G-07 (Spec Omitted)',
      category: 'Specification Omitted',
      loadBearing: false,
      specAccessible: false,
      description:
        'Detailed specification for G-07 was not included in the accessible prompt or workspace files.',
    },
    {
      id: 'G-08',
      number: 8,
      title: 'Gap Register G-08 (Spec Omitted)',
      category: 'Specification Omitted',
      loadBearing: false,
      specAccessible: false,
      description:
        'Detailed specification for G-08 was not included in the accessible prompt or workspace files.',
    },
    {
      id: 'G-09',
      number: 9,
      title: 'Gap Register G-09 (Spec Omitted)',
      category: 'Specification Omitted',
      loadBearing: false,
      specAccessible: false,
      description:
        'Detailed specification for G-09 was not included in the accessible prompt or workspace files.',
    },
    {
      id: 'G-10',
      number: 10,
      title: 'Gap Register G-10 (Spec Omitted)',
      category: 'Specification Omitted',
      loadBearing: false,
      specAccessible: false,
      description:
        'Detailed specification for G-10 was not included in the accessible prompt or workspace files.',
    },
    {
      id: 'G-11',
      number: 11,
      title: 'Seed Parse Path Resolution',
      category: 'Seed Parse Path',
      loadBearing: true,
      specAccessible: true,
      description:
        'Identifies the seed parse path issue flagged for Cargo/Rust validator compilation; Cargo manifest and Rust source files are not present in this web workspace.',
    },
    {
      id: 'G-12',
      number: 12,
      title: 'Load-Bearing Record Anchor G-12',
      category: 'Load-Bearing Record',
      loadBearing: true,
      specAccessible: true,
      description:
        'Designated by Agent 6 as a load-bearing record item (not decorative); detailed internal schema is outside the current prompt.',
    },
    {
      id: 'G-13',
      number: 13,
      title: 'Load-Bearing Record Anchor G-13',
      category: 'Load-Bearing Record',
      loadBearing: true,
      specAccessible: true,
      description:
        'Designated by Agent 6 as a load-bearing record item (not decorative); detailed internal schema is outside the current prompt.',
    },
    {
      id: 'G-14',
      number: 14,
      title: 'Load-Bearing Record Anchor G-14',
      category: 'Load-Bearing Record',
      loadBearing: true,
      specAccessible: true,
      description:
        'Designated by Agent 6 as a load-bearing record item (not decorative); detailed internal schema is outside the current prompt.',
    },
  ];

  return entries.map(entry => ({
    ...entry,
    status: 'unresolved' as GapResolutionStatus,
    updatedAt: 'Initial Agent 6 Audit',
  }));
}

/**
 * Toggles a gap register entry between unresolved and resolved (if in_review, marks resolved).
 */
export function toggleGapResolution(
  items: GapRegisterItem[],
  gapId: string,
  timestampLabel = 'Updated now'
): GapRegisterItem[] {
  return items.map(item => {
    if (item.id !== gapId) return item;
    const nextStatus: GapResolutionStatus =
      item.status === 'resolved' ? 'unresolved' : 'resolved';
    return {
      ...item,
      status: nextStatus,
      updatedAt: timestampLabel,
    };
  });
}

/**
 * Explicitly assigns a resolution status ('unresolved' | 'in_review' | 'resolved').
 */
export function setGapStatus(
  items: GapRegisterItem[],
  gapId: string,
  status: GapResolutionStatus,
  timestampLabel = 'Updated now'
): GapRegisterItem[] {
  return items.map(item =>
    item.id === gapId ? { ...item, status, updatedAt: timestampLabel } : item
  );
}

/**
 * Allows the orchestrator to supply or refine the specification text for a gap entry.
 */
export function updateGapDescription(
  items: GapRegisterItem[],
  gapId: string,
  description: string,
  timestampLabel = 'Spec updated'
): GapRegisterItem[] {
  const trimmed = description.trim();
  if (!trimmed) return items;
  return items.map(item =>
    item.id === gapId
      ? {
          ...item,
          description: trimmed,
          specAccessible: true,
          updatedAt: timestampLabel,
        }
      : item
  );
}

export function filterGapRegisters(
  items: GapRegisterItem[],
  statusFilter: GapResolutionStatus | 'all',
  searchTerm: string
): GapRegisterItem[] {
  const q = searchTerm.trim().toLowerCase();
  return items.filter(item => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (!q) return true;
    return (
      item.id.toLowerCase().includes(q) ||
      item.title.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q)
    );
  });
}

export function computeGovernanceStats(items: GapRegisterItem[]): GovernanceStats {
  const totalCount = items.length;
  const resolvedCount = items.filter(i => i.status === 'resolved').length;
  const inReviewCount = items.filter(i => i.status === 'in_review').length;
  const unresolvedCount = items.filter(i => i.status === 'unresolved').length;
  const completionPct =
    totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 0;
  const loadBearingRemaining = items.filter(
    i => i.loadBearing && i.status !== 'resolved'
  ).length;
  const accessibleSpecCount = items.filter(i => i.specAccessible).length;

  return {
    totalCount,
    resolvedCount,
    inReviewCount,
    unresolvedCount,
    completionPct,
    loadBearingRemaining,
    accessibleSpecCount,
  };
}

export function exportGapRegisterYaml(items: GapRegisterItem[]): string {
  const stats = computeGovernanceStats(items);
  const lines = [
    AGENT6_STATUS_YAML,
    `governance_summary:`,
    `  total_gaps: ${stats.totalCount}`,
    `  resolved: ${stats.resolvedCount}`,
    `  in_review: ${stats.inReviewCount}`,
    `  unresolved: ${stats.unresolvedCount}`,
    `  load_bearing_remaining: ${stats.loadBearingRemaining}`,
    `gap_register:`,
  ];

  for (const item of items) {
    lines.push(`  - id: ${item.id}`);
    lines.push(`    title: "${item.title.replace(/"/g, '\\"')}"`);
    lines.push(`    category: "${item.category}"`);
    lines.push(`    load_bearing: ${item.loadBearing}`);
    lines.push(`    spec_accessible: ${item.specAccessible}`);
    lines.push(`    status: ${item.status}`);
  }

  return lines.join('\n');
}
