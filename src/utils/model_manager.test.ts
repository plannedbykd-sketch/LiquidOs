import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ModelManager, GGUF_CATALOG } from './model_manager';

describe('ModelManager Unit Tests', () => {
  it('initializes with default catalog and calculates installed storage correctly', () => {
    const manager = new ModelManager();
    const installed = manager.getInstalledModels();
    assert.ok(installed.length >= 2, 'Default should have at least 2 installed models');

    const usedMb = manager.getUsedStorageMb();
    const calculatedMb = installed.reduce((sum, m) => sum + m.sizeBytesMb, 0);
    assert.equal(usedMb, calculatedMb);
    assert.ok(manager.getAvailableStorageMb() > 0);
  });

  it('allows switching between installed models', () => {
    const manager = new ModelManager();
    const active = manager.getActiveModel();
    assert.equal(active.id, 'llama-3.2-3b-q4km');

    const success = manager.setActiveModel('llama-3.2-1b-q40');
    assert.equal(success, true);
    assert.equal(manager.getActiveModel().id, 'llama-3.2-1b-q40');
  });

  it('rejects activating a non-installed model', () => {
    const manager = new ModelManager();
    assert.throws(() => {
      manager.setActiveModel('deepseek-r1-distill-7b-q8');
    }, /not installed locally/);
  });

  it('installs a model when storage allows, then activates it', () => {
    const manager = new ModelManager();
    const installedBefore = manager.getInstalledModels().length;
    const model = manager.installModel('qwen2.5-coder-7b-q40');

    assert.equal(model.installed, true);
    assert.equal(manager.getInstalledModels().length, installedBefore + 1);

    const activated = manager.setActiveModel('qwen2.5-coder-7b-q40');
    assert.equal(activated, true);
    assert.equal(manager.getActiveModel().id, 'qwen2.5-coder-7b-q40');
  });

  it('deletes an installed model and switches active model if currently active', () => {
    const manager = new ModelManager();
    manager.setActiveModel('llama-3.2-1b-q40');
    manager.deleteModel('llama-3.2-1b-q40');

    assert.notEqual(manager.getActiveModel().id, 'llama-3.2-1b-q40');
    assert.ok(manager.getActiveModel().installed);
  });
});
