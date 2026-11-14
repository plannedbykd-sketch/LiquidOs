import test from 'node:test';
import assert from 'node:assert/strict';
import { Claude35Adapter, AnthropicMessageRequest } from './claude_adapter';

test('Claude35Adapter validates conformant request payload', () => {
  const validPayload: AnthropicMessageRequest = {
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [
      { role: 'user', content: 'Extract IDA Pro function symbols from binary.' }
    ],
    system: 'You are an offline binary analysis agent on LiquidOS.',
  };

  const validation = Claude35Adapter.validateRequest(validPayload);
  assert.equal(validation.isValid, true);
  assert.ok(validation.request);
  assert.equal(validation.request.model, 'claude-3-5-sonnet-20241022');
});

test('Claude35Adapter catches invalid payloads', () => {
  assert.equal(Claude35Adapter.validateRequest(null).isValid, false);
  assert.equal(Claude35Adapter.validateRequest({}).isValid, false);
  assert.equal(Claude35Adapter.validateRequest({ model: 'claude-3-5' }).isValid, false);
  assert.equal(Claude35Adapter.validateRequest({ model: 'claude-3-5', messages: [] }).isValid, false);
  assert.equal(
    Claude35Adapter.validateRequest({ model: 'claude-3-5', messages: [{ role: 'bad', content: 'hi' }] }).isValid,
    false
  );
});

test('Claude35Adapter creates compliant Anthropic response structure', () => {
  const formatted = Claude35Adapter.formatResponse({
    model: 'claude-3-5-sonnet-20241022',
    generatedText: 'Decompiled 18 symbols successfully using Ghidra bridge.',
    inputTokens: 38,
    outputTokens: 14,
  });

  assert.ok(formatted.id.startsWith('msg_01'));
  assert.equal(formatted.type, 'message');
  assert.equal(formatted.role, 'assistant');
  assert.equal(formatted.model, 'claude-3-5-sonnet-20241022');
  assert.equal(formatted.stop_reason, 'end_turn');
  assert.equal(formatted.content.length, 1);
  assert.equal(formatted.content[0].type, 'text');
  if (formatted.content[0].type === 'text') {
    assert.equal(formatted.content[0].text, 'Decompiled 18 symbols successfully using Ghidra bridge.');
  }
  assert.equal(formatted.usage.input_tokens, 38);
  assert.equal(formatted.usage.output_tokens, 14);
});

test('Claude35Adapter estimates token counts with reasonable fidelity', () => {
  const text = 'LiquidOS offline tensor inference benchmark';
  const tokens = Claude35Adapter.estimateTokens(text);
  assert.ok(tokens >= 5 && tokens <= 15);
});
