# Darklock Secure Notes

End-to-end encrypted, zero-knowledge note-taking app for Linux, Windows, and Web.
Built with React 18, Tauri v2, and XChaCha20-Poly1305 encryption via libsodium.

> **Version:** 0.1.0 &nbsp;|&nbsp; **Status:** Active Development &nbsp;|&nbsp; **License:** MIT

**Darklock Secure Notes is open source.** The hosted service is run and maintained by Darklock Security at **[darklock.net](https://darklock.net)** — you don't need to run anything yourself to use it.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Security Design](#security-design)
- [Screens & Pages](#screens--pages)
- [Tech Stack](#tech-stack)
- [Use Darklock](#use-darklock)
- [For Contributors](#for-contributors)
- [Package Overview](#package-overview)
- [Design System](#design-system)
- [Security Audit](#security-audit)
- [API Reference](#api-reference)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Contributing](#contributing)

---

## Features

### Core
- **End-to-end encryption** — All notes encrypted client-side with XChaCha20-Poly1305 before leaving the device
- **Zero-knowledge sync** — Server never sees plaintext; stores only encrypted blobs
- **Offline-first** — Full local vault mode with no server dependency
- **Cross-platform** — Desktop (Linux, Windows via Tauri v2) and Web

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
- **Pure SVG rendering** — No external charting library needed
- **Simple data entry** — Comma-separated labels and values
- **Live preview** — See the chart update as you type
- **Create, edit, delete** — Full CRUD with inline editing

### Trash
- Soft-delete with 30-day auto-purge
- Restore individual notes or permanently delete
- Empty all trash with confirmation
- Search through deleted notes

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
| **Advanced** | Theme picker (dark/light/system), sidebar & note list width sliders, developer tools, telemetry, about info |

### Security
- Auto-lock after configurable inactivity (1/5/15/30/60 min or never)
- Command palette (Ctrl+K) for quick actions
- Session revocation (lock now, sign out all devices)
- Encrypted export packages (.dlpkg)

---

## Architecture

```
darklock-notes/
├── apps/
│   ├── desktop/           # Tauri v2 desktop app (Linux & Windows)
│   │   ├── src/           # Rust backend (file I/O, secure deletion)
│   │   └── src-tauri/     # Tauri config, capabilities, icons
│   ├── server/            # Zero-knowledge sync server
│   │   ├── src/
│   │   │   ├── db/        # SQLite schema + prepared statements
│   │   │   ├── middleware/ # JWT auth, rate limiting
│   │   │   └── routes/    # REST API routes
│   │   └── data/          # Database files
│   └── web/               # React SPA
│       ├── src/
│       │   ├── components/ # TopBar, NoteEditor
│       │   ├── pages/      # Library, Workspace, Settings, Collaborators, Trash, Charts
│       │   ├── services/   # API client, crypto service
│       │   ├── stores/     # Zustand state management
│       │   └── styles/     # app.css
│       └── public/
├── packages/
│   ├── crypto/            # @darklock/crypto — libsodium wrappers
│   │   └── src/           # Key derivation, AEAD, key hierarchy, sharing
│   └── ui/                # @darklock/ui — Shared React components
│       ├── src/
│       │   ├── components/ # Button, Input, Modal, Badge, Spinner, etc.
│       │   └── styles/     # Design tokens (--dl-* CSS custom properties)
│       └── dist/
├── SECURITY.md            # Cryptographic design & threat model
└── package.json           # npm workspaces root
```

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
| **Settings** | 8-tab comprehensive settings (see Features section) |
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
| UI components | @darklock/ui (custom) | Internal |
| CSS | Custom properties design system | — |

---

## Use Darklock

The easiest way to use Darklock Secure Notes is through the hosted service at **[darklock.net](https://darklock.net)**. No setup required.

| Platform | Link |
|----------|------|
| **Web** | [darklock.net](https://darklock.net) |
| **Desktop (Linux / Windows)** | Download from [darklock.net/download](https://darklock.net/download) |

Your vault is end-to-end encrypted — Darklock never sees your notes, titles, or master password.

---

## For Contributors

This repo is the full source of the app. PRs and issues are welcome.

### Prerequisites

- Node.js 20+
- npm 10+
- Rust toolchain (for desktop app only)

### Install

```bash
git clone https://github.com/anonymous-hidden/darklock-secure-notes.git
cd darklock-notes
npm install
```

### Development

```bash
# Start the sync server (port 3003)
npm run dev --workspace=@darklock/server

# Start the web app (port 5173)
npm run dev --workspace=@darklock/web

# Start the desktop app (Tauri dev mode)
npm run tauri dev --workspace=@darklock/desktop
```

### Build

```bash
# Build all packages
npm run build --workspaces

# Build desktop for Linux
cd apps/desktop && npm run tauri build

# Build desktop for Windows
cd apps/desktop && npm run tauri build -- --target x86_64-pc-windows-msvc
```

### Tests

```bash
npm run test --workspace=@darklock/crypto    # Crypto unit tests
npm run test --workspace=@darklock/server    # Server integration tests
```

---

## Package Overview

### `@darklock/crypto`

| Export | Description |
|--------|-------------|
| `deriveRootKey(password, params)` | Argon2id KDF → enc key + auth key |
| `encrypt(plaintext, key, ad)` / `decrypt(envelope, key, ad)` | XChaCha20-Poly1305 AEAD |
| `createItemKey()` / `createContentKey()` | Key hierarchy key generation |
| `wrapKey(key, wrappingKey, ad)` / `unwrapKey(...)` | Key wrapping with AD |
| `createShareEnvelope()` / `openShareEnvelope()` | X25519 ECDH sharing |
| `createExportPackage()` / `openExportPackage()` | Encrypted backup packages |
| `zeroize()` / `zeroizeRootKey()` | Secure memory cleanup |

### `@darklock/server`

REST API with zero-knowledge design:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/signup` | POST | Create account (email + authKey + keyParams) |
| `/api/auth/signin` | POST | Authenticate (returns JWT cookie + keyParams) |
| `/api/auth/signout` | POST | Revoke current session |
| `/api/auth/signout-all` | POST | Revoke all sessions |
| `/api/auth/key-params` | GET | Get KDF params for email (anti-enumeration) |
| `/api/auth/password` | PUT | Change password (re-wrap all keys) |
| `/api/vaults/*` | CRUD | Vault management |
| `/api/sections/*` | CRUD | Section management |
| `/api/notes/*` | CRUD | Encrypted note storage |
| `/api/tags/*` | CRUD | Encrypted tag management |
| `/api/shares/*` | CRUD | Note/section sharing |
| `/api/revisions/*` | GET | Note revision history |
| `/api/keys/*` | CRUD | Encrypted key management |
| `/api/sync/pull` / `push` | POST | Delta sync with version vectors |

### `@darklock/ui`

| Component | Props | Description |
|-----------|-------|-------------|
| `Button` | variant, size, onClick, disabled, tooltip | Primary, ghost, danger button styles |
| `Input` | label, type, value, onChange, placeholder | Styled input with optional label |
| `Modal` | isOpen, title, onClose, size | Overlay modal (sm/md/lg) |
| `Badge` | variant, size | Status badges (default/success/warning/danger/info/encrypted) |
| `Spinner` | size (number) | Loading indicator |
| `EncryptionBadge` | — | Green lock encryption status |
| `CommandPalette` | commands, onClose, placeholder | Ctrl+K command launcher |

### `@darklock/web`

React SPA with 8 page components:

| Page | Lines | Description |
|------|-------|-------------|
| `SetupWizard.tsx` | ~350 | First-run wizard (cloud/local, signup, password) |
| `UnlockScreen.tsx` | ~200 | Master password entry |
| `Library.tsx` | ~290 | Section card grid with search and vaults |
| `Workspace.tsx` | ~385 | 3-pane editor layout |
| `Settings.tsx` | ~450 | 8-tab settings (Profile/Editor/Security/Shortcuts/Notifications/Data/Accessibility/Advanced) |
| `Collaborators.tsx` | ~310 | Team management + sharing |
| `Charts.tsx` | ~320 | Chart builder with SVG rendering |
| `Trash.tsx` | ~170 | Deleted notes management |

---

## Design System

Dark theme with Darklock brand tokens (`--dl-*` CSS custom properties):

| Token | Value | Usage |
|-------|-------|-------|
| `--dl-bg-primary` | `#0a0a0f` | Main background |
| `--dl-bg-secondary` | `#12121a` | Elevated surfaces |
| `--dl-bg-surface` | `#1a1a28` | Cards, panels |
| `--dl-accent` | `#6c5ce7` | Primary actions, active states |
| `--dl-text` | `#e8e8f0` | Body text |
| `--dl-text-secondary` | `#a0a0b8` | Muted body text |
| `--dl-text-muted` | `#6b6b80` | Hints, placeholders |
| `--dl-success` | `#00d2d3` | Encryption badges, sync |
| `--dl-danger` | `#ff6b6b` | Destructive actions |
| `--dl-warning` | `#feca57` | Caution states |
| `--dl-info` | `#54a0ff` | Informational badges |
| `--dl-border` | `rgba(255,255,255,0.06)` | Borders, dividers |
| `--dl-radius-sm` | `6px` | Small border radius |
| `--dl-radius-md` | `10px` | Medium border radius |
| `--dl-radius-lg` | `14px` | Large border radius |

Layout tokens: `--dl-topbar-height: 48px`, `--dl-sidebar-width: 240px`, `--dl-notelist-width: 300px`

---

## Security Audit

Full vulnerability assessment conducted on the codebase. Findings and applied fixes:

### Critical Findings (Fixed)

| # | Severity | Issue | Fix Applied |
|---|----------|-------|-------------|
| 1 | **Critical** | Hardcoded JWT secret fallback | Server refuses to start in production without `JWT_SECRET` |
| 2 | **High** | JWT token returned in JSON response body | Removed `token` from all JSON responses; cookie-only auth |
| 3 | **High** | `VITE_DEV_BYPASS` could be set in production builds | Guarded with `import.meta.env.DEV &&` |
| 4 | **High** | `decryptTitle()` fails open — returns raw ciphertext on failure | Returns `'[Encrypted — decryption failed]'` sentinel |
| 5 | **Medium** | CSP disabled on API server | Restrictive CSP: `default-src 'none'`, `frame-ancestors 'none'` |
| 6 | **Medium** | No CSP in web app HTML | `Content-Security-Policy` meta tag added to `index.html` with `frame-ancestors 'none'`, `base-uri 'none'`, `form-action 'self'` |
| 7 | **Medium** | Anti-enumeration dummy salt is static (timing oracle) | HMAC(email, `DUMMY_SALT_KEY`) — per-email deterministic, server-secret-protected |
| 8 | **Medium** | 50MB JSON body limit | Reduced to 5MB |
| 9 | **Medium** | Cookie `secure` flag only in production | `secure: NODE_ENV !== 'development'` |
| 10 | **Low** | Clipboard holds decrypted content indefinitely | Clipboard auto-cleared 30 seconds after any copy |
| 11 | **Low** | Password inputs allow autocomplete/spellcheck | All password fields: `autocomplete`, `spellcheck=false`, `autocorrect=off`, `data-1p-ignore` |
| 12 | **Low** | Bearer token extraction naive (`replace`) | Fixed with proper regex: `/^Bearer (.+)$/` |
| 13 | **Low** | `cryptoService.lock()` didn't await zeroization | Async, now awaits `zeroizeRootKey()` |

### Remaining Advisories

| # | Severity | Issue | Status |
|---|----------|-------|--------|
| 1 | Medium | `cryptoService` convenience methods skip Associated Data binding | Documented — per-field AD context strings needed |
| 2 | Medium | Password change endpoint lacks Zod validation | Documented — schema needed |
| 3 | Medium | No `sodium_mlock()` — root key may page to disk on memory pressure | WASM/JS builds don’t expose mlock; mitigated by zeroization + auto-lock |
| 4 | Low | `decryptTags` silently returns `[]` on parse failure | Low risk — defensive pattern |
| 5 | Info | No CSRF tokens (relies on `SameSite: strict`) | Adequate for modern browsers |
| 6 | Info | No TOTP/FIDO2 second factor | Architectural addition — mitigates keylogger risk |
| 7 | Info | No binary integrity verification on desktop | Ed25519 release signing recommended |

### Dependency Audit

```
4 moderate vulnerabilities (npm audit)
- esbuild <=0.24.2: Dev server request origin bypass (GHSA-67mh-4wv8-2f99)
  → Affects: vite, vite-node, vitest (dev-only, not shipped in production)
  → Fix: npm audit fix --force (upgrades to Vite 7, breaking change)
```

### Positive Security Patterns

- **A+ cryptographic design** — Argon2id → XChaCha20-Poly1305 → three-level key hierarchy
- **Zero-knowledge architecture** — Server genuinely never sees plaintext
- **Double-hashed auth** — Server Argon2id-hashes the client's auth key before storage
- **Per-note content keys** — Compromise isolation between notes
- **Zod validation** on most endpoints with proper schemas
- **Rate limiting** — Auth: 20/15min, API: 500/15min
- **JTI session tracking** with individual and bulk revocation
- **Query-level authorization** — All queries include `user_id` scoping (no IDOR)
- **Memory zeroization** — `sodium.memzero()` + Rust `zeroize` crate
- **No `eval()`, `innerHTML`, or `dangerouslySetInnerHTML`** anywhere in codebase
- **HttpOnly, SameSite=strict** cookies
- **Secure file deletion** in desktop (zero-overwrite before unlink)

**Overall Rating: Strong (B+ → A-)** — All critical and high issues are now fixed.

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

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes with appropriate tests
4. Run `npm run test --workspaces` to verify
5. Submit a pull request

### Code Style

- TypeScript strict mode
- React functional components with hooks
- Zustand for state management
- CSS custom properties for theming (no CSS-in-JS)
- SVG icons inline (no icon library dependency)

---

**&copy; 2026 Darklock Security** — Released under the [MIT License](LICENSE). Hosted at [darklock.net](https://darklock.net).
