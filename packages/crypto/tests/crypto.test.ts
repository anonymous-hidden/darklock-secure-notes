/**
 * Darklock Crypto — Unit Tests
 *
 * Tests for KDF, AEAD, key hierarchy, sharing envelopes, and serialization.
 * Run with: npx vitest run
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  initSodium,
  deriveRootKey,
  createKdfParams,
  hashServerAuthKey,
  verifyServerAuthKey,
  encrypt,
  decrypt,
  encryptString,
  decryptString,
  generateKey,
  createItemKey,
  unwrapItemKey,
  createContentKey,
  unwrapContentKey,
  rotateItemKeys,
  generateShareKeypair,
  generateSigningKeypair,
  createShareEnvelope,
  openShareEnvelope,
  toBase64,
  fromBase64,
  toHex,
  fromHex,
  sha256,
  createExportPackage,
  openExportPackage,
  zeroize,
  zeroizeRootKey,
  DEFAULT_KDF_PARAMS,
} from '@darklock/crypto';

/* ------------------------------------------------------------------ */
/*  Setup: initialize libsodium once                                  */
/* ------------------------------------------------------------------ */
beforeAll(async () => {
  await initSodium();
});

/* ================================================================== */
/*  KDF Tests                                                         */
/* ================================================================== */
describe('KDF — Argon2id', () => {
  it('deriveRootKey produces a 64-byte key split into enc + auth halves', async () => {
    const params = createKdfParams();
    const rootKey = await deriveRootKey('test-password-strong!', params);

    expect(rootKey.encryptionKey).toBeInstanceOf(Uint8Array);
    expect(rootKey.serverAuthKey).toBeInstanceOf(Uint8Array);
    expect(rootKey.encryptionKey.length).toBe(32);
    expect(rootKey.serverAuthKey.length).toBe(32);
    expect(rootKey.kdfParams.salt).toBe(params.salt);
  });

  it('same password + same params → same key', async () => {
    const params = createKdfParams();
    const a = await deriveRootKey('my-password-12345!', params);
    const b = await deriveRootKey('my-password-12345!', params);
    expect(toBase64(a.encryptionKey)).toBe(toBase64(b.encryptionKey));
    expect(toBase64(a.serverAuthKey)).toBe(toBase64(b.serverAuthKey));
  });

  it('different password → different key', async () => {
    const params = createKdfParams();
    const a = await deriveRootKey('password-alpha-1!', params);
    const b = await deriveRootKey('password-beta-22!', params);
    expect(toBase64(a.encryptionKey)).not.toBe(toBase64(b.encryptionKey));
  });

  it('hashServerAuthKey + verifyServerAuthKey round-trip', async () => {
    const params = createKdfParams();
    const rootKey = await deriveRootKey('verify-test-pass!', params);
    const hash = await hashServerAuthKey(rootKey.serverAuthKey);
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);

    const valid = await verifyServerAuthKey(rootKey.serverAuthKey, hash);
    expect(valid).toBe(true);

    // Wrong key should fail
    const wrongKey = new Uint8Array(32);
    wrongKey.fill(0xff);
    const invalid = await verifyServerAuthKey(wrongKey, hash);
    expect(invalid).toBe(false);
  });
});

/* ================================================================== */
/*  AEAD Tests                                                        */
/* ================================================================== */
describe('AEAD — XChaCha20-Poly1305', () => {
  it('encrypt + decrypt round-trip (binary)', () => {
    const key = generateKey();
    const plaintext = new TextEncoder().encode('Hello, Darklock!');
    const ad = new TextEncoder().encode('context:test');

    const envelope = encrypt(plaintext, key, ad);
    expect(envelope.version).toBe(1);
    expect(envelope.nonce).toBeInstanceOf(Uint8Array);
    expect(envelope.ciphertext).toBeInstanceOf(Uint8Array);

    const decrypted = decrypt(envelope, key, ad);
    expect(new TextDecoder().decode(decrypted)).toBe('Hello, Darklock!');
  });

  it('encryptString + decryptString round-trip', () => {
    const key = generateKey();
    const msg = '🔐 Encrypted unicode! 日本語テスト';

    const envelope = encryptString(msg, key);
    const result = decryptString(envelope, key);
    expect(result).toBe(msg);
  });

  it('wrong key fails decryption', () => {
    const key1 = generateKey();
    const key2 = generateKey();
    const envelope = encryptString('secret', key1);

    expect(() => decryptString(envelope, key2)).toThrow();
  });

  it('tampered ciphertext fails', () => {
    const key = generateKey();
    const envelope = encryptString('secret data', key);

    // Tamper with ciphertext
    envelope.ciphertext[0] ^= 0xff;

    expect(() => decryptString(envelope, key)).toThrow();
  });

  it('wrong associated data fails', () => {
    const key = generateKey();
    const ad1 = new TextEncoder().encode('context:a');
    const ad2 = new TextEncoder().encode('context:b');
    const plaintext = new TextEncoder().encode('test');

    const envelope = encrypt(plaintext, key, ad1);
    expect(() => decrypt(envelope, key, ad2)).toThrow();
  });
});

/* ================================================================== */
/*  Key Hierarchy Tests                                               */
/* ================================================================== */
describe('Key Hierarchy — Item + Content Keys', () => {
  it('createItemKey + unwrapItemKey round-trip', async () => {
    const params = createKdfParams();
    const rootKey = await deriveRootKey('key-hierarchy-test!', params);
    const vaultId = 'vault-123';
    const keyId = 'key-456';

    const wrapped = createItemKey(rootKey.encryptionKey, vaultId, keyId);
    expect(wrapped.keyId).toBe(keyId);
    expect(wrapped.vaultId).toBe(vaultId);
    expect(wrapped.wrappedKey).toBeInstanceOf(Object);

    const unwrapped = unwrapItemKey(wrapped, rootKey.encryptionKey);
    expect(unwrapped).toBeInstanceOf(Uint8Array);
    expect(unwrapped.length).toBe(32);
  });

  it('createContentKey + unwrapContentKey round-trip', () => {
    const itemKey = generateKey();
    const noteId = 'note-789';
    const ckId = 'ck-abc';

    const wrapped = createContentKey(itemKey, noteId, ckId);
    expect(wrapped.keyId).toBe(ckId);
    expect(wrapped.noteId).toBe(noteId);

    const unwrapped = unwrapContentKey(wrapped, itemKey);
    expect(unwrapped).toBeInstanceOf(Uint8Array);
    expect(unwrapped.length).toBe(32);
  });

  it('rotateItemKeys re-wraps all keys under a new root key', async () => {
    const params = createKdfParams();
    const oldRoot = await deriveRootKey('old-password-rotate!', params);
    const newRoot = await deriveRootKey('new-password-rotate!', params);

    // Create a few item keys
    const wrapped1 = createItemKey(oldRoot.encryptionKey, 'v1', 'k1');
    const wrapped2 = createItemKey(oldRoot.encryptionKey, 'v1', 'k2');

    // Rotate
    const rotated = rotateItemKeys(
      [wrapped1, wrapped2],
      oldRoot.encryptionKey,
      newRoot.encryptionKey,
    );

    expect(rotated).toHaveLength(2);

    // Verify new root can unwrap
    const unwrapped1 = unwrapItemKey(rotated[0], newRoot.encryptionKey);
    const unwrapped2 = unwrapItemKey(rotated[1], newRoot.encryptionKey);
    expect(unwrapped1.length).toBe(32);
    expect(unwrapped2.length).toBe(32);

    // Old root should fail on rotated keys
    expect(() => unwrapItemKey(rotated[0], oldRoot.encryptionKey)).toThrow();
  });
});

/* ================================================================== */
/*  Sharing Envelope Tests                                            */
/* ================================================================== */
describe('Sharing — X25519 Envelopes', () => {
  it('createShareEnvelope + openShareEnvelope round-trip', () => {
    const sender = generateShareKeypair();
    const recipient = generateShareKeypair();
    const secret = generateKey();

    const envelope = createShareEnvelope(secret, recipient.publicKey);
    expect(envelope.ephemeralPublicKey).toBeInstanceOf(Uint8Array);

    const opened = openShareEnvelope(envelope, recipient.secretKey);
    expect(toBase64(opened)).toBe(toBase64(secret));
  });

  it('wrong recipient key cannot open envelope', () => {
    const recipient = generateShareKeypair();
    const attacker = generateShareKeypair();
    const secret = generateKey();

    const envelope = createShareEnvelope(secret, recipient.publicKey);
    expect(() => openShareEnvelope(envelope, attacker.secretKey)).toThrow();
  });
});

/* ================================================================== */
/*  Serialization Tests                                               */
/* ================================================================== */
describe('Serialization', () => {
  it('base64 round-trip', () => {
    const data = new Uint8Array([1, 2, 3, 4, 5, 255, 0, 128]);
    const b64 = toBase64(data);
    const back = fromBase64(b64);
    expect(Array.from(back)).toEqual(Array.from(data));
  });

  it('hex round-trip', () => {
    const data = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
    const hex = toHex(data);
    expect(hex).toBe('deadbeef');
    const back = fromHex(hex);
    expect(Array.from(back)).toEqual(Array.from(data));
  });

  it('sha256 produces consistent hash', async () => {
    const data = new TextEncoder().encode('darklock');
    const hash = await sha256(data);
    expect(hash).toBeInstanceOf(Uint8Array);
    expect(hash.length).toBe(32);

    const hash2 = await sha256(data);
    expect(toHex(hash)).toBe(toHex(hash2));
  });

  it('createExportPackage + openExportPackage round-trip', () => {
    const password = 'export-password-test!';
    const notes = [
      { id: '1', title: 'Test Note', body: 'Hello' },
      { id: '2', title: 'Another', body: 'World' },
    ];

    const pkg = createExportPackage(notes, password);
    expect(pkg).toBeInstanceOf(Uint8Array);
    expect(pkg.length).toBeGreaterThan(0);

    const opened = openExportPackage(pkg, password);
    expect(opened).toEqual(notes);
  });

  it('openExportPackage with wrong password fails', () => {
    const notes = [{ id: '1', title: 'Secret', body: 'Data' }];
    const pkg = createExportPackage(notes, 'correct-password!');
    expect(() => openExportPackage(pkg, 'wrong-password!')).toThrow();
  });
});

/* ================================================================== */
/*  Memory Zeroization Tests                                          */
/* ================================================================== */
describe('Zeroization', () => {
  it('zeroize clears a buffer', () => {
    const buf = new Uint8Array([1, 2, 3, 4, 5]);
    zeroize(buf);
    expect(Array.from(buf)).toEqual([0, 0, 0, 0, 0]);
  });

  it('zeroizeRootKey clears both halves', async () => {
    const params = createKdfParams();
    const rootKey = await deriveRootKey('zeroize-test-pass!', params);

    // Sanity: keys are non-zero
    expect(rootKey.encryptionKey.some((b) => b !== 0)).toBe(true);

    zeroizeRootKey(rootKey);

    expect(rootKey.encryptionKey.every((b) => b === 0)).toBe(true);
    expect(rootKey.serverAuthKey.every((b) => b === 0)).toBe(true);
  });
});

/* ================================================================== */
/*  Keypair Generation Tests                                          */
/* ================================================================== */
describe('Keypair Generation', () => {
  it('generateShareKeypair produces valid X25519 keypair', () => {
    const kp = generateShareKeypair();
    expect(kp.publicKey).toBeInstanceOf(Uint8Array);
    expect(kp.secretKey).toBeInstanceOf(Uint8Array);
    expect(kp.publicKey.length).toBe(32);
    expect(kp.secretKey.length).toBe(32);
  });

  it('generateSigningKeypair produces valid Ed25519 keypair', () => {
    const kp = generateSigningKeypair();
    expect(kp.publicKey).toBeInstanceOf(Uint8Array);
    expect(kp.secretKey).toBeInstanceOf(Uint8Array);
    expect(kp.publicKey.length).toBe(32);
    expect(kp.secretKey.length).toBe(64);
  });

  it('two keypairs are distinct', () => {
    const a = generateShareKeypair();
    const b = generateShareKeypair();
    expect(toBase64(a.publicKey)).not.toBe(toBase64(b.publicKey));
  });
});
