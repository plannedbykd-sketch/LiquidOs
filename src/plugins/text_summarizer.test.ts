import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TextSummarizerPlugin } from './text_summarizer_plugin';

describe('TextSummarizerPlugin Unit Tests', () => {
  it('implements LiquidPlugin lifecycle and initialization', async () => {
    const plugin = new TextSummarizerPlugin();
    assert.equal(plugin.isEnabled, false);
    assert.equal(plugin.id, 'plugin.liquid.text_summarizer');

    const initialized = await plugin.initialize();
    assert.equal(initialized, true);
    assert.equal(plugin.isEnabled, true);

    await plugin.shutdown();
    assert.equal(plugin.isEnabled, false);
  });

  it('summarizes technical input and computes compression ratio', async () => {
    const plugin = new TextSummarizerPlugin();
    await plugin.initialize();

    const sampleText = `
      The target Android binary libnative-engine.so exports several JNI initialization routines.
      Reverse engineering revealed a hidden cryptographic routine at address 0x0002F480 that decrypts local assets.
      This routine utilizes AES-256 in CBC mode with an initialization vector hardcoded into the data section.
      We must patch this function or hook it using Frida to capture decrypted payloads dynamically.
      Overall performance of the decompilation pipeline was measured at 48.2 tokens per second under NNAPI acceleration.
    `;

    const result = await plugin.summarize({
      text: sampleText,
      format: 'bullets',
      length: 'balanced',
      sealInA2DVault: true,
    });

    assert.ok(result.summary.length > 0);
    assert.ok(result.bulletPoints.length > 0);
    assert.ok(result.originalWordCount > result.summaryWordCount);
    assert.ok(result.compressionRatioPct > 0);
    assert.ok(result.a2dVaultRecordId, 'Should generate an A2D vault record ID');
  });

  it('dispatches actions dynamically through executeAction()', async () => {
    const plugin = new TextSummarizerPlugin();
    await plugin.initialize();

    const result = await plugin.executeAction<{ text: string }, any>('summarize', {
      text: 'First sentence explaining system architecture. Second sentence detailing NNAPI tensor acceleration. Third sentence detailing A2D log protection.',
    });

    assert.ok(result.summary);
    assert.ok(result.keyTakeaways.length >= 2);
  });

  it('extracts actionable checklist items', async () => {
    const plugin = new TextSummarizerPlugin();
    await plugin.initialize();

    const actionText = 'We must verify the firmware checksum. Developers should review buffer limits. The team needs to test offline model switching.';
    const items = await plugin.extractActionItems({ text: actionText });

    assert.ok(items.length >= 2);
  });
});
