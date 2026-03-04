# Darklock Secure Notes — Security Architecture

> **Classification:** Public  
> **Version:** 0.1.0  
> **Last updated:** 2025  

---

## 1. Design Principles

| Principle | Implementation |
|-----------|---------------|
| **Zero-knowledge** | The server never sees plaintext note titles, bodies, tags, or section names. All content is encrypted client-side before transmission. |
| **End-to-end encryption** | Only the user's master password (never transmitted) can derive the Root Key that unlocks the vault. |
| **Defense in depth** | Three-level key hierarchy, per-note content keys, AEAD with authenticated associated data binding. |
| **Forward secrecy** | Per-note content keys mean compromising one note's key does not expose other notes. |
| **Minimal trust** | The server stores only encrypted blobs and a hashed authentication key. Even a full server breach reveals nothing. |

---

## 2. Cryptographic Primitives

| Primitive | Algorithm | Library | Purpose |
|-----------|-----------|---------|---------|
| **KDF** | Argon2id (v1.3) | libsodium `crypto_pwhash` | Password → Root Key derivation |
| **AEAD** | XChaCha20-Poly1305 | libsodium `crypto_aead_xchacha20poly1305_ietf` | All encryption (notes, keys, exports) |
| **Key Exchange** | X25519 (Curve25519 ECDH) | libsodium `crypto_box_*` | Sharing encrypted notes between users |
| **Signing** | Ed25519 | libsodium `crypto_sign_*` | Content authenticity (future) |
| **Hashing** | BLAKE2b / SHA-256 | libsodium / Web Crypto | Server auth key hashing, content hashing |

### Why XChaCha20-Poly1305?

- 24-byte nonce = safe to generate randomly (negligible collision probability)
- Faster than AES-GCM in pure software (no hardware AES required)
- Constant-time implementation in libsodium (side-channel resistant)
- Built-in authentication (Poly1305 MAC)

### Why Argon2id?

- Winner of the Password Hashing Competition (2015)
- Hybrid mode: resistant to both GPU attacks (memory-hard) and side-channel attacks (data-independent)
- Default parameters: 19 MiB memory, 2 iterations, 1 parallelism → ~1 second on modern hardware

---

## 3. Key Hierarchy

```
Master Password (never stored)
       │
       ▼
┌──────────────────────┐
│    Argon2id KDF       │  salt (random 16 bytes, stored on server)
│    outputLength: 64   │
└──────────┬───────────┘
           │
     64-byte output
     ┌─────┴─────┐
     │           │
 [0..31]     [32..63]
     │           │
     ▼           ▼
 Encryption   Server Auth
    Key          Key
  (32 bytes)  (32 bytes)
     │           │
     │           └── BLAKE2b hash → stored on server for authentication
     │
     ▼
┌─────────────────────────────────────────┐
│  Item Keys  (per-vault, random 256-bit)  │
│  Wrapped with: XChaCha20-Poly1305        │
│  AD: "darklock:item-key:{vaultId}:{keyId}" │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│  Content Keys (per-note, random 256-bit) │
│  Wrapped with: XChaCha20-Poly1305        │
│  AD: "darklock:content-key:{noteId}:{keyId}" │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌───────────────────────────────────┐
│  Encrypted Note Content            │
│  XChaCha20-Poly1305                │
│  - Title (encrypted separately)    │
│  - Body  (encrypted separately)    │
│  - Tags  (encrypted as JSON array) │
└───────────────────────────────────┘
```

### Key Rotation

When the master password changes:
1. Derive new Root Key from new password
2. Decrypt all Item Keys with old encryption key
3. Re-encrypt all Item Keys with new encryption key
4. Hash new server auth key and update on server
5. Content Keys and note content are NOT re-encrypted (they're bound to Item Keys, not the Root Key directly)

---

## 4. Envelope Format

All encrypted data uses a versioned envelope:

```typescript
interface EncryptedEnvelope {
  version: 1;                    // Format version
  nonce: Uint8Array;             // 24 bytes (XChaCha20)
  ciphertext: Uint8Array;        // Encrypted data + Poly1305 tag
}
```

### Associated Data Binding

Every encryption operation binds context via the `additionalData` parameter:

| Context | AD String |
|---------|-----------|
| Item Key wrapping | `darklock:item-key:{vaultId}:{keyId}` |
| Content Key wrapping | `darklock:content-key:{noteId}:{keyId}` |
| Note title | (none — encrypted under Content Key) |
| Note body | (none — encrypted under Content Key) |
| Export package | `darklock:export:v1` |

This prevents ciphertext from being transplanted between contexts.

---

## 5. Authentication Flow

### Signup

1. User enters email + master password
2. Client generates random KDF salt (16 bytes)
3. Client runs Argon2id → 64-byte output → split into `encKey` + `authKey`
4. Client hashes `authKey` with BLAKE2b → `serverAuthKeyHash`
5. Client sends `{ email, serverAuthKeyHash, kdfParams }` to server
6. Server stores the hash (never the raw auth key)

### Signin

1. Client requests `GET /auth/key-params?email=...` → gets KDF params + salt
2. Client derives Root Key with the returned params
3. Client hashes `authKey` → sends `{ email, serverAuthKeyHash }` to server
4. Server verifies against stored hash
5. Server creates a session (JWT in HttpOnly cookie)

### Anti-Enumeration

`GET /auth/key-params/:email` returns dummy KDF parameters for unknown emails, preventing email enumeration.

The dummy salt is **not static** — it is computed as `HMAC-SHA256(DUMMY_SALT_KEY, email)` truncated to 16 bytes. This means:
- The same unknown email always gets the same dummy salt (no timing difference between repeated queries)
- The salt is unpredictable without access to `DUMMY_SALT_KEY` (server secret)
- Timing is identical for existing and non-existing accounts (Argon2id runs in both cases)

`DUMMY_SALT_KEY` must be set as an environment variable in production. The server throws on startup if it is missing.

---

## 6. Sharing Model

Sharing a note with another user:

1. Sender looks up recipient's X25519 public key from the server
2. Sender generates an **ephemeral X25519 keypair**
3. Sender computes shared secret: `ECDH(ephemeral_secret, recipient_public)`
4. Sender derives a symmetric key from the shared secret via BLAKE2b
5. Sender encrypts the note's Content Key with XChaCha20-Poly1305 using the derived key
6. Sender sends `{ ephemeralPublicKey, encryptedKey, nonce }` to the server
7. Recipient computes the same shared secret: `ECDH(recipient_secret, ephemeral_public)`
8. Recipient decrypts the Content Key

The server never sees the Content Key; it only relays the encrypted envelope.

---

## 7. Threat Model

### What we protect against:

| Threat | Mitigation |
|--------|-----------|
| **Server compromise** | All content is encrypted client-side. Server only stores ciphertext and auth key hashes. |
| **Database leak** | Encrypted blobs are useless without the user's master password. |
| **Network interception** | HTTPS required. Content is E2E encrypted regardless. |
| **Password brute-force** | Argon2id with high memory cost (19 MiB). Rate-limiting on auth endpoints. |
| **Key compromise (single note)** | Per-note Content Keys limit blast radius. |
| **Ciphertext swapping** | Associated data binding prevents transplanting ciphertexts between contexts. |
| **Email enumeration** | Dummy KDF params returned for unknown emails. |
| **Session hijacking** | HttpOnly + Secure cookies. Session table allows revocation. |

### What we do NOT protect against:

| Threat | Reason |
|--------|--------|
| **Compromised client device** | If the attacker has full access to RAM while the vault is unlocked, they can read the Root Key. |
| **Keylogger capturing the master password** | Out of scope for application-level encryption. |
| **Rubber-hose cryptanalysis** | Not a technical problem. |
| **Quantum computing** | XChaCha20-Poly1305 is symmetric and considered quantum-resistant. X25519 is not; post-quantum migration is planned. |

---

## 8. Data at Rest (Desktop)

The Tauri desktop app stores encrypted data in the OS-specific app data directory:

- **Linux:** `~/.local/share/darklock-notes/`
- **Windows:** `%APPDATA%/darklock-notes/`

All files written to disk are encrypted before write. The Tauri backend:
- Validates all paths to prevent directory traversal
- Performs best-effort secure deletion (overwrite with zeros before unlink)
- Uses Rust's `zeroize` crate for sensitive memory

---

## 9. Memory Safety

- **Root Key zeroization:** `zeroizeRootKey()` overwrites key bytes with zeros when the vault locks — memory is cleared before GC can move it
- **Auto-lock:** Configurable inactivity timeout (default: 5 minutes); lock() is async and awaits zeroization before returning
- **Clipboard auto-clear:** A 30-second timer fires after every document `copy` event and calls `navigator.clipboard.writeText('')`. Timer resets on each copy so back-to-back copies don't leave a stale clear.
- **No `sodium_mlock()`:** WASM builds do not expose `mlock`/`madvise`. The Root Key may theoretically page to swap under memory pressure. Mitigation: short auto-lock timeout ensures the window is small.
- **Desktop (Rust):** The `zeroize` crate provides `#[derive(Zeroize, ZeroizeOnDrop)]` for Rust-held secrets — memory is zeroed deterministically when the value is dropped.

---

## 10. Security Ratings

| Area | Rating | Justification |
|------|--------|---------------|
| Cryptographic design | **A+** | Argon2id → XChaCha20-Poly1305 → 3-level key hierarchy; formally audited library |
| Zero-knowledge architecture | **A+** | Server never sees plaintext; even full server breach reveals nothing |
| Key management | **A** | Per-note keys, Associated Data binding, zeroization on lock |
| Authentication | **A-** | JWT secret + HMAC dummy salt hardened; JTI revocation |
| Cookie / session security | **A** | HttpOnly, SameSite=strict, JTI per-session tracking |
| XSS / injection | **A** | CSP on both Tauri and web; no eval/innerHTML |
| Clipboard protection | **A-** | 30s auto-clear |
| Password field hardening | **A-** | `autocomplete`, `spellcheck=false`, `data-1p-ignore` |
| Input validation | **B+** | Zod on most endpoints; password-change endpoint lacks schema |
| Defense in depth | **B+** | Rate limiting, body limits, CORS, CSP all present |

**Overall: A-** — All critical and high-severity issues resolved. Remaining gaps are architectural (FIDO2, mlock, binary signing).

---

## 11. Audit Checklist

- [ ] All crypto uses libsodium (audited, constant-time)
- [ ] No custom cryptographic algorithms
- [ ] Nonces are always random (never reused)
- [ ] Associated data binds context to every encryption
- [ ] Server never receives plaintext content
- [ ] Server never receives the master password or encryption key
- [ ] KDF parameters are calibrated to ≥1 second
- [ ] Sessions are revocable
- [ ] Rate limiting on authentication endpoints
- [ ] CSP headers configured
- [ ] No eval() or innerHTML with user content
- [ ] Dependencies audited via `npm audit`

---

## 12. Cryptography Dependencies

| Package | Version | Purpose | Audited? |
|---------|---------|---------|----------|
| `libsodium-wrappers-sumo` | ^0.7.13 | All crypto operations | Yes (NaCl + libsodium are formally verified) |
| `jsonwebtoken` | ^9.0.2 | JWT session tokens (server-side only) | Community audited |
| `better-sqlite3` | ^11.0 | Local database (server) | Community audited |
| `zeroize` (Rust) | ^1.0 | Memory zeroization in Tauri backend | RustCrypto audited |

---

## 13. Incident Response

If a vulnerability is discovered:

1. Rotate all affected keys (password change triggers full Item Key rotation)
2. Invalidate all sessions (`POST /auth/signout-all`)
3. Review server access logs
4. Notify affected users
5. Publish a security advisory

---

*This document covers the cryptographic design of Darklock Secure Notes. For deployment security, see the main Darklock security documentation.*
