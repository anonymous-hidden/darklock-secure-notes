# Darklock Secure Notes

End-to-end encrypted, zero-knowledge note-taking app for Linux, Windows, and Web.
Built with React 18, Tauri v2, and XChaCha20-Poly1305 encryption via libsodium.

> **Version:** 0.1.0 &nbsp;|&nbsp; **Status:** Active Development &nbsp;|&nbsp; **License:** MIT

**Darklock Secure Notes is open source.** The app is hosted and maintained by Darklock Security — you don't build or run anything yourself. Just use it at **[darklock.net](https://darklock.net)**.

---

## Get Started

| Platform | Link |
|----------|------|
| **Web** | [darklock.net](https://darklock.net) |
| **Desktop — Linux** | [darklock.net/download](https://darklock.net/download) |
| **Desktop — Windows** | [darklock.net/download](https://darklock.net/download) |

> Your vault is end-to-end encrypted. Darklock never sees your notes, titles, tags, or master password.

---

## Table of Contents

- [Features](#features)
- [Security Design](#security-design)
- [Screens & Pages](#screens--pages)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Security Audit](#security-audit)
- [Keyboard Shortcuts](#keyboard-shortcuts)

---

## Features

### Core
- **End-to-end encryption** — All notes encrypted client-side with XChaCha20-Poly1305 before leaving the device
- **Zero-knowledge sync** — Server never sees plaintext; stores only encrypted blobs
- **Offline-first** — Full local vault mode with no server dependency
- **Cross-platform** — Desktop (Linux, Windows) and Web

### Editor
- Rich Markdown editor with live preview toggle
- Configurable font size (12–24px), font family (sans/mono/serif), and line height
- Spell check, line numbers, word count toggles
- Auto-save with configurable interval (1–30 seconds)
- Vim mode keybindings
- Focus mode (dim non-active paragraphs) and Zen mode (full-screen writing)

### Organization
- **Vaults** — Top-level containers (local or cloud)
- **Sections** — Folders within vaults for grouping notes
- **Tags** — Encrypted per-note tags for cross-section categorization
- **Pinning & Favorites** — Quick access to important notes
- **Search** — Full-text search across decrypted note titles and bodies
- **Sorting** — By last modified, title (A–Z), or creation date

### Collaboration
- **Team Members** — Invite collaborators by email with role-based access (Owner / Editor / Viewer)
- **Shared Notes** — Share individual notes or sections with granular permissions
- **Pending Invites** — Track and manage invitation status
- **Encrypted Sharing** — X25519 ECDH key exchange for end-to-end encrypted collaboration
- Cloud sync required for collaboration features

### Charts
- **6 chart types** — Bar, Line, Pie, Doughnut, Area, Scatter
- **Pure SVG rendering** — No external charting library
- **Live preview** — Chart updates as you type

### Trash
- Soft-delete with 30-day auto-purge
- Restore individual notes or permanently delete
- Empty all trash with confirmation

### Settings (8 tabs)

| Tab | Features |
|-----|----------|
| **Profile** | Account info, display name, storage mode |
| **Editor** | Font size/family/line height, spell check, auto-save, line numbers, word count, markdown preview, default sort |
| **Security** | Encryption info, auto-lock timer, password change with strength meter, session management, export (encrypted/markdown/JSON) |
| **Shortcuts** | Full keyboard shortcut reference, vim mode toggle |
| **Notifications** | Master toggle + per-type (sync errors, collab changes, share invites) |
| **Data** | Import/export, deletion preferences, storage usage, danger zone (clear all data) |
| **Accessibility** | Compact mode, high contrast, reduced motion, focus mode, zen mode |
| **Advanced** | Theme picker (dark/light/system), sidebar & note list width sliders, telemetry, about info |

### Security
- Auto-lock after configurable inactivity (1/5/15/30/60 min or never)
- Command palette (Ctrl+K) for quick actions
- Session revocation (lock now, sign out all devices)
- Encrypted export packages (.dlpkg)

---

## Security Design

### Encryption Primitives

| Primitive | Algorithm | Library |
|-----------|-----------|---------|
| Symmetric encryption | XChaCha20-Poly1305 (AEAD) | libsodium |
| Key derivation | Argon2id (19 MiB, 2 iterations) | libsodium |
| Key exchange (sharing) | X25519 ECDH + ephemeral keypairs | libsodium |
| Hashing | BLAKE2b | libsodium |
| Random bytes | `randombytes_buf()` | libsodium |

### Key Hierarchy

```
Master Password
    │
    ▼ (Argon2id KDF — 19 MiB, 2 iterations)
Root Key (split)
    ├── Encryption Key (32 bytes) ─── wraps Item Keys
    └── Auth Key (32 bytes) ────────── hashed again for server auth
            │
            ▼
    Item Keys (per-vault, wrapped with AD)
            │
            ▼
    Content Keys (per-note, wrapped with AD)
            │
            ▼
    Encrypted Note Data (title, body, tags)
```

### Zero-Knowledge Guarantees

1. **Password never leaves client** — Only `authKey` (derived sub-key) sent to server
2. **Server double-hashes auth key** — Argon2id applied server-side before storage
3. **All data encrypted client-side** — Notes, titles, tags, and keys are ciphertext on server
4. **Per-note content keys** — Compromise of one note does not expose others
5. **Associated Data binding** — Key wrapping includes context AD to prevent transplantation
6. **Memory zeroization** — `sodium.memzero()` and Rust `zeroize` crate clear sensitive buffers

See [SECURITY.md](./SECURITY.md) for the full threat model and crypto specification.

---

## Screens & Pages

| Screen | Description |
|--------|-------------|
| **Setup Wizard** | First-run flow: choose cloud/local mode, create account or set master password |
| **Unlock** | Master password entry with shake animation on failure |
| **Library** | Section card grid with vault selection, search, and quick actions |
| **Workspace** | 3-pane layout: sections sidebar, note list, and rich editor |
| **Settings** | 8-tab comprehensive settings |
| **Collaborators** | Team management, shared notes, pending invites |
| **Charts** | Chart builder with 6 chart types and live SVG preview |
| **Trash** | Deleted notes with restore, permanent delete, and empty all |

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React + TypeScript | 18.3.1 |
| Build tool | Vite | 5.4.21 |
| State management | Zustand | 4.5.5 |
| Desktop runtime | Tauri | v2 (CLI 2.10.1) |
| Desktop backend | Rust | 1.93.0 |
| Server | Express + better-sqlite3 | 4.21.x |
| Crypto | libsodium-wrappers-sumo | 0.7.15 |

---

## Architecture

```
darklock-notes/
├── apps/
│   ├── desktop/           # Tauri v2 desktop app (Linux & Windows)
│   ├── server/            # Zero-knowledge sync server (Express + SQLite)
│   └── web/               # React SPA
├── packages/
│   ├── crypto/            # libsodium wrappers — key derivation, AEAD, sharing
│   └── ui/                # Shared React component library
└── SECURITY.md            # Cryptographic design & threat model
```

---

## Security Audit

Full vulnerability assessment conducted on the codebase. Findings and applied fixes:

### Fixed

| # | Severity | Issue | Fix Applied |
|---|----------|-------|-------------|
| 1 | **Critical** | Hardcoded JWT secret fallback | Server refuses to start in production without `JWT_SECRET` |
| 2 | **High** | JWT token returned in JSON response body | Removed `token` from all JSON responses; cookie-only auth |
| 3 | **High** | `VITE_DEV_BYPASS` could be set in production builds | Guarded with `import.meta.env.DEV &&` |
| 4 | **High** | `decryptTitle()` fails open — returns raw ciphertext on failure | Returns `'[Encrypted — decryption failed]'` sentinel |
| 5 | **Medium** | CSP disabled on API server | Restrictive CSP: `default-src 'none'`, `frame-ancestors 'none'` |
| 6 | **Medium** | No CSP in web app HTML | CSP meta tag: `frame-ancestors 'none'`, `base-uri 'none'`, `form-action 'self'`, `require-trusted-types-for 'script'` |
| 7 | **Medium** | Anti-enumeration dummy salt is static (timing oracle) | HMAC(email, `DUMMY_SALT_KEY`) — per-email deterministic, server-secret-protected |
| 8 | **Medium** | 50MB JSON body limit | Reduced to 5MB |
| 9 | **Medium** | Cookie `secure` flag only in production | `secure: NODE_ENV !== 'development'` |
| 10 | **Low** | Clipboard holds decrypted content indefinitely | Snapshot-compare auto-clear after 30 seconds |
| 11 | **Low** | Password inputs allow autocomplete/spellcheck | All password fields: `autocomplete`, `spellcheck=false`, `inputMode=text`, `enterKeyHint`, `data-1p-ignore` |
| 12 | **Low** | Bearer token extraction naive (`replace`) | Fixed with proper regex: `/^Bearer (.+)$/` |
| 13 | **Low** | `cryptoService.lock()` didn't await zeroization | Async, now awaits `zeroizeRootKey()` |

### Remaining Advisories

| # | Severity | Issue | Status |
|---|----------|-------|--------|
| 1 | Medium | `cryptoService` convenience methods skip Associated Data binding | Documented — per-field AD context strings needed |
| 2 | Medium | Password change endpoint lacks Zod validation | Documented — schema needed |
| 3 | Medium | No `sodium_mlock()` — root key may page to disk on memory pressure | WASM/JS builds don't expose mlock; mitigated by zeroization + auto-lock |
| 4 | Low | `decryptTags` silently returns `[]` on parse failure | Low risk — defensive pattern |
| 5 | Info | No CSRF tokens (relies on `SameSite: strict`) | Adequate for modern browsers |
| 6 | Info | No TOTP/FIDO2 second factor | Roadmap — mitigates keylogger risk |
| 7 | Info | No binary integrity verification on desktop | Roadmap — Ed25519 release signing |

### Positive Security Patterns

- **A+ cryptographic design** — Argon2id → XChaCha20-Poly1305 → three-level key hierarchy
- **Zero-knowledge architecture** — Server genuinely never sees plaintext
- **Double-hashed auth** — Server Argon2id-hashes the client's auth key before storage
- **Per-note content keys** — Compromise isolation between notes
- **Rate limiting** — Auth: 20/15min, API: 500/15min
- **JTI session tracking** with individual and bulk revocation
- **Query-level authorization** — All queries include `user_id` scoping (no IDOR)
- **Memory zeroization** — `sodium.memzero()` + Rust `zeroize` crate
- **No `eval()`, `innerHTML`, or `dangerouslySetInnerHTML`** anywhere in codebase
- **HttpOnly, SameSite=strict** cookies
- **Secure file deletion** in desktop (zero-overwrite before unlink)

**Overall Rating: A-** — All critical and high issues resolved.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + N` | New note |
| `Ctrl + K` | Command palette |
| `Ctrl + L` | Go to library |
| `Ctrl + B` | Bold text |
| `Ctrl + I` | Italic text |
| `Ctrl + S` | Force save |
| `Ctrl + \` | Toggle sidebar |
| `Ctrl + Shift + T` | Toggle tools panel |
| `Ctrl + Shift + L` | Lock vault |
| `Ctrl + F` | Search notes |
| `Ctrl + ,` | Open settings |
| `Ctrl + /` | Toggle Markdown preview |
| `Ctrl + Shift + D` | Duplicate note |
| `Ctrl + Shift + Delete` | Move to trash |
| `Esc` | Close modal / deselect |

---

**&copy; 2026 Darklock Security** — Released under the [MIT License](LICENSE). Hosted at [darklock.net](https://darklock.net).
