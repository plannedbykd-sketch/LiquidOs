import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeGovernanceStats,
  createInitialGapRegister,
  exportGapRegisterYaml,
  filterGapRegisters,
  setGapStatus,
  toggleGapResolution,
  updateGapDescription,
} from './validator_governance';

test('createInitialGapRegister creates G-01 through G-14 with honest spec accessibility', () => {
  const items = createInitialGapRegister();
  assert.equal(items.length, 14);
  assert.equal(items[0].id, 'G-01');
  assert.equal(items[10].id, 'G-11');
  assert.equal(items[13].id, 'G-14');

  // G-05 through G-10 are honestly flagged as omitted from prompt
  const omitted = items.filter(i => i.number >= 5 && i.number <= 10);
  assert.equal(omitted.length, 6);
  assert.ok(omitted.every(i => i.specAccessible === false));

  // G-11 through G-14 are marked load-bearing
  const loadBearing = items.filter(i => i.loadBearing);
  assert.deepEqual(
    loadBearing.map(i => i.id),
    ['G-11', 'G-12', 'G-13', 'G-14']
  );
});

test('toggleGapResolution and setGapStatus update resolution state and summary counts', () => {
  let items = createInitialGapRegister();
  items = toggleGapResolution(items, 'G-01');
  items = setGapStatus(items, 'G-11', 'in_review');
  items = toggleGapResolution(items, 'G-12');

  const stats = computeGovernanceStats(items);
  assert.equal(stats.totalCount, 14);
  assert.equal(stats.resolvedCount, 2);
  assert.equal(stats.inReviewCount, 1);
  assert.equal(stats.unresolvedCount, 11);
  assert.equal(stats.loadBearingRemaining, 3); // G-11 (in_review), G-13, G-14
  assert.equal(stats.completionPct, 14);

  // Toggling G-01 back returns it to unresolved
  items = toggleGapResolution(items, 'G-01');
  assert.equal(items.find(i => i.id === 'G-01')?.status, 'unresolved');
});

test('filterGapRegisters filters cleanly by status and search term', () => {
  let items = createInitialGapRegister();
  items = toggleGapResolution(items, 'G-11');

  const resolvedOnly = filterGapRegisters(items, 'resolved', '');
  assert.equal(resolvedOnly.length, 1);
  assert.equal(resolvedOnly[0].id, 'G-11');

  const searchSeed = filterGapRegisters(items, 'all', 'Seed Parse');
  assert.equal(searchSeed.length, 1);
  assert.equal(searchSeed[0].id, 'G-11');
});

test('updateGapDescription supplies missing spec and reflects in YAML export', () => {
  let items = createInitialGapRegister();
  items = updateGapDescription(items, 'G-05', 'Verified negative control fixture check.');
  items = toggleGapResolution(items, 'G-05');

  const g05 = items.find(i => i.id === 'G-05');
  assert.equal(g05?.specAccessible, true);
  assert.equal(g05?.status, 'resolved');

  const yaml = exportGapRegisterYaml(items);
  assert.ok(yaml.includes('NOT A VALIDATOR PROOF'));
  assert.ok(yaml.includes('id: G-05'));
  assert.ok(yaml.includes('status: resolved'));
});
