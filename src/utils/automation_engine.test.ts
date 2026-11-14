import test from 'node:test';
import assert from 'node:assert/strict';
import { AutomationEngine, PRESET_PIPELINES, AutomationNode } from './automation_engine';

test('AutomationEngine validates linear DAG correctly', () => {
  const ghidraPipeline = PRESET_PIPELINES[0];
  const validation = AutomationEngine.validateDag(ghidraPipeline.nodes);
  assert.equal(validation.isValid, true);
  assert.equal(validation.executionOrder?.length, ghidraPipeline.nodes.length);
  // First node must be node-bin-load
  assert.equal(validation.executionOrder?.[0], 'node-bin-load');
  // Last node must be node-a2d-seal
  assert.equal(validation.executionOrder?.[ghidraPipeline.nodes.length - 1], 'node-a2d-seal');
});

test('AutomationEngine detects missing dependency error', () => {
  const brokenNodes: AutomationNode[] = [
    {
      id: 'step-1',
      name: 'Step 1',
      tool: 'FILE_SYSTEM',
      description: 'First',
      dependencies: ['non-existent-step'],
      actionType: 'READ',
      config: {},
    },
  ];

  const validation = AutomationEngine.validateDag(brokenNodes);
  assert.equal(validation.isValid, false);
  assert.ok(validation.error?.includes('non-existent node'));
});

test('AutomationEngine detects cyclic graph', () => {
  const cyclicNodes: AutomationNode[] = [
    {
      id: 'A',
      name: 'Node A',
      tool: 'FILE_SYSTEM',
      description: 'A',
      dependencies: ['B'],
      actionType: 'READ',
      config: {},
    },
    {
      id: 'B',
      name: 'Node B',
      tool: 'GHIDRA',
      description: 'B',
      dependencies: ['A'],
      actionType: 'DECOMPILE',
      config: {},
    },
  ];

  const validation = AutomationEngine.validateDag(cyclicNodes);
  assert.equal(validation.isValid, false);
  assert.ok(validation.error?.includes('Cyclic dependency'));
});

test('AutomationEngine executes pipeline and verifies air-gapped isolation report', () => {
  const fridaPipeline = PRESET_PIPELINES[1];
  const report = AutomationEngine.executePipeline(fridaPipeline);

  assert.equal(report.status, 'SUCCESS');
  assert.equal(report.isAirGappedVerified, true);
  assert.equal(report.nodeResults.length, fridaPipeline.nodes.length);
  assert.ok(report.totalDurationMs > 0);
  for (const res of report.nodeResults) {
    assert.equal(res.status, 'SUCCESS');
    assert.ok(res.outputSummary.length > 0);
  }
});
