import test from 'node:test';
import assert from 'node:assert/strict';
import { A2DCryptoVault } from './a2d_crypto';

test('A2DCryptoVault encrypts and decrypts string payloads cleanly', async () => {
  const secretData = 'Confidential local offline telemetry and model weights hash';
  const passphrase = 'MasterSecurityPassphrase_LiquidOS_2026!';

  const encrypted = await A2DCryptoVault.encrypt(secretData, passphrase);
  assert.equal(encrypted.algorithm, 'AES-256-GCM');
  assert.equal(encrypted.iterations, 32000);
  assert.ok(encrypted.saltHex.length > 0);
  assert.equal(encrypted.ivHex.length, 24); // 12 bytes = 24 hex chars
  assert.equal(encrypted.tagHex.length, 32); // 16 bytes = 32 hex chars
  assert.notEqual(encrypted.ciphertextHex, secretData);

  const decrypted = await A2DCryptoVault.decrypt(encrypted, passphrase);
  assert.equal(decrypted, secretData);
});

test('A2DCryptoVault encrypts and recovers structured JSON objects', async () => {
  const logRecord = {
    id: 'log-891',
    timestamp: 1773000000000,
    level: 'SEC_AUDIT',
    source: 'GhidraAutomationBridge',
    message: 'Extracted 14 clean ELF symbol boundaries without external leakage',
  };
  const passphrase = 'Liquid_Secure_Audit_Key_#99';

  const encrypted = await A2DCryptoVault.encrypt(logRecord, passphrase);
  const decryptedJson = JSON.parse(await A2DCryptoVault.decrypt(encrypted, passphrase));
  assert.deepEqual(decryptedJson, logRecord);
});

test('A2DCryptoVault throws error on incorrect passphrase', async () => {
  const secretData = 'Isolated offline inference tensor buffer';
  const passphrase = 'CorrectPassphrase123';
  const wrongPassphrase = 'IncorrectPassphrase999';

  const encrypted = await A2DCryptoVault.encrypt(secretData, passphrase);
  await assert.rejects(async () => {
    await A2DCryptoVault.decrypt(encrypted, wrongPassphrase);
  });
});

test('A2DCryptoVault detects payload tampering via integrity hash', async () => {
  const secretData = 'Tamper-evident log';
  const passphrase = 'SecuredNodeKey';
  const encrypted = await A2DCryptoVault.encrypt(secretData, passphrase);

  // Alter ciphertext
  const tampered = { ...encrypted, ciphertextHex: encrypted.ciphertextHex.slice(0, -2) + 'aa' };
  await assert.rejects(async () => {
    await A2DCryptoVault.decrypt(tampered, passphrase);
  }, /Integrity check failed/);
});

test('A2DCryptoVault simulates Diffie-Hellman enclave handshake', () => {
  const handshake = A2DCryptoVault.simulateDhEnclaveHandshake();
  assert.ok(handshake.deviceEphemeralPublic.startsWith('04'));
  assert.ok(handshake.enclavePublic.startsWith('04'));
  assert.equal(handshake.sharedSecretHash.length, 64);
});
