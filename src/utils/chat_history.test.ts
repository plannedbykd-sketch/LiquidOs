import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ChatHistoryService, INITIAL_PRESET_SESSIONS } from './chat_history';

describe('ChatHistoryService Unit Tests', () => {
  it('loads preset sessions and returns sorted list', () => {
    const service = new ChatHistoryService();
    const sessions = service.getSessions();
    assert.equal(sessions.length, INITIAL_PRESET_SESSIONS.length);
    assert.ok(sessions[0].updatedAt >= sessions[sessions.length - 1].updatedAt);
  });

  it('creates new session and sets as active', () => {
    const service = new ChatHistoryService();
    const newSession = service.createNewSession('Custom Testing Task');
    assert.equal(newSession.title, 'Custom Testing Task');
    assert.equal(service.getActiveSession().id, newSession.id);
  });

  it('adds messages and auto-titles when first user message is appended', () => {
    const service = new ChatHistoryService();
    const session = service.createNewSession('New Air-Gapped Session');
    service.addMessage(session.id, {
      id: 'm1',
      role: 'user',
      content: 'Identify cryptographic primitives in decrypted ELF binary header',
      model: 'llama-3.2-3b-q4km',
      timestamp: Date.now(),
    });

    const updated = service.getSessionById(session.id);
    assert.ok(updated);
    assert.equal(updated.messages.length, 1);
    assert.ok(updated.title.includes('Identify cryptographic primitives'));
  });

  it('performs privacy-first local keyword search across all messages', () => {
    const service = new ChatHistoryService();
    // Search for UART from preset firmware session
    const results = service.searchConversations('UART');
    assert.ok(results.length >= 2, 'Should find UART query and response');
    assert.equal(results[0].sessionTitle, 'Firmware Bootloader Decompilation');
    assert.ok(results[0].matchedTextSnippet.includes('UART'));
  });

  it('deletes session cleanly', () => {
    const service = new ChatHistoryService();
    const idToDelete = INITIAL_PRESET_SESSIONS[0].id;
    const countBefore = service.getSessions().length;
    const deleted = service.deleteSession(idToDelete);
    assert.equal(deleted, true);
    assert.equal(service.getSessions().length, countBefore - 1);
    assert.equal(service.getSessionById(idToDelete), undefined);
  });
});
