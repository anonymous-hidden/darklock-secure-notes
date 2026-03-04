/**
 * Darklock Server — Integration Tests
 *
 * Tests the HTTP API endpoints for auth, notes, and sync.
 * Run with: npx vitest run
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const BASE = 'http://localhost:3003/api';

// Test state
let cookie = '';
let userId = '';
let vaultId = '';
let sectionId = '';
let noteId = '';
const testEmail = `test-${Date.now()}@darklock.test`;
const testAuthHash = 'test-server-auth-hash-' + Date.now();
const testKdfParams = {
  algorithm: 'argon2id',
  memoryKiB: 19456,
  iterations: 2,
  parallelism: 1,
  outputLength: 64,
  salt: 'dGVzdC1zYWx0LWZvci10ZXN0cw==',
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */
async function req(method: string, path: string, body?: unknown) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (cookie) headers['Cookie'] = cookie;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Capture set-cookie
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];

  const text = await res.text();
  try {
    return { status: res.status, data: JSON.parse(text) };
  } catch {
    return { status: res.status, data: text };
  }
}

/* ================================================================== */
/*  Auth Tests                                                        */
/* ================================================================== */
describe('Auth API', () => {
  it('POST /auth/signup — create account', async () => {
    const { status, data } = await req('POST', '/auth/signup', {
      email: testEmail,
      serverAuthKeyHash: testAuthHash,
      kdfParams: testKdfParams,
    });
    expect(status).toBe(201);
    expect(data.userId).toBeTruthy();
    userId = data.userId;
  });

  it('POST /auth/signin — sign in', async () => {
    const { status, data } = await req('POST', '/auth/signin', {
      email: testEmail,
      serverAuthKeyHash: testAuthHash,
    });
    expect(status).toBe(200);
    expect(data.userId).toBe(userId);
  });

  it('GET /auth/me — authenticated user info', async () => {
    const { status, data } = await req('GET', '/auth/me');
    expect(status).toBe(200);
    expect(data.email).toBe(testEmail);
  });

  it('GET /auth/key-params — returns KDF params', async () => {
    const { status, data } = await req('GET', `/auth/key-params?email=${encodeURIComponent(testEmail)}`);
    expect(status).toBe(200);
    expect(data.kdfParams).toBeTruthy();
    expect(data.kdfParams.algorithm).toBe('argon2id');
  });

  it('GET /auth/key-params — unknown email returns dummy params', async () => {
    const { status, data } = await req('GET', '/auth/key-params?email=nobody@nowhere.test');
    expect(status).toBe(200);
    expect(data.kdfParams).toBeTruthy(); // should return dummy params, not 404
  });
});

/* ================================================================== */
/*  Notes API Tests                                                   */
/* ================================================================== */
describe('Notes API', () => {
  it('POST /notes/vaults — create vault', async () => {
    const { status, data } = await req('POST', '/notes/vaults', {
      id: crypto.randomUUID(),
      encryptedName: 'dGVzdC12YXVsdA==', // base64 of "test-vault"
    });
    expect(status).toBe(201);
    vaultId = data.id;
    expect(vaultId).toBeTruthy();
  });

  it('GET /notes/vaults — list vaults', async () => {
    const { status, data } = await req('GET', '/notes/vaults');
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(1);
  });

  it('POST /notes/vaults/:id/sections — create section', async () => {
    const { status, data } = await req('POST', `/notes/vaults/${vaultId}/sections`, {
      id: crypto.randomUUID(),
      encryptedName: 'dGVzdC1zZWN0aW9u',
      sortOrder: 0,
    });
    expect(status).toBe(201);
    sectionId = data.id;
  });

  it('GET /notes/vaults/:id/sections — list sections', async () => {
    const { status, data } = await req('GET', `/notes/vaults/${vaultId}/sections`);
    expect(status).toBe(200);
    expect(data.length).toBeGreaterThanOrEqual(1);
  });

  it('POST /notes/sections/:id/notes — create note', async () => {
    const { status, data } = await req('POST', `/notes/sections/${sectionId}/notes`, {
      id: crypto.randomUUID(),
      encryptedTitle: 'dGVzdC10aXRsZQ==',
      encryptedBody: 'dGVzdC1ib2R5',
      contentKeyId: 'ck-test-1',
    });
    expect(status).toBe(201);
    noteId = data.id;
  });

  it('GET /notes/sections/:id/notes — list notes', async () => {
    const { status, data } = await req('GET', `/notes/sections/${sectionId}/notes`);
    expect(status).toBe(200);
    expect(data.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /notes/notes/:id — get single note', async () => {
    const { status, data } = await req('GET', `/notes/notes/${noteId}`);
    expect(status).toBe(200);
    expect(data.encrypted_title).toBe('dGVzdC10aXRsZQ==');
  });

  it('PUT /notes/notes/:id — update note', async () => {
    const { status } = await req('PUT', `/notes/notes/${noteId}`, {
      encryptedTitle: 'dXBkYXRlZA==',
      encryptedBody: 'dXBkYXRlZC1ib2R5',
    });
    expect(status).toBe(200);
  });

  it('POST /notes/notes/:id/trash — trash note', async () => {
    const { status } = await req('POST', `/notes/notes/${noteId}/trash`);
    expect(status).toBe(200);
  });

  it('POST /notes/notes/:id/restore — restore note', async () => {
    const { status } = await req('POST', `/notes/notes/${noteId}/restore`);
    expect(status).toBe(200);
  });
});

/* ================================================================== */
/*  Sync API Tests                                                    */
/* ================================================================== */
describe('Sync API', () => {
  it('POST /sync/pull — get changes since cursor', async () => {
    const { status, data } = await req('POST', '/sync/pull', {
      cursor: null,
    });
    expect(status).toBe(200);
    expect(data.cursor).toBeTruthy();
    expect(Array.isArray(data.changes)).toBe(true);
  });

  it('POST /sync/push — push changes', async () => {
    const { status } = await req('POST', '/sync/push', {
      changes: [],
    });
    expect(status).toBe(200);
  });
});

/* ================================================================== */
/*  Cleanup                                                           */
/* ================================================================== */
describe('Cleanup', () => {
  it('DELETE /notes/notes/:id — permanent delete', async () => {
    // First trash it
    await req('POST', `/notes/notes/${noteId}/trash`);
    const { status } = await req('DELETE', `/notes/notes/${noteId}`);
    expect(status).toBe(200);
  });

  it('POST /auth/signout — sign out', async () => {
    const { status } = await req('POST', '/auth/signout');
    expect(status).toBe(200);
  });
});
