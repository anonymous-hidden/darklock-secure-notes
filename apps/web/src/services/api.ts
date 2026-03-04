/**
 * Darklock Web - API Client
 * 
 * All API calls to the Darklock Notes server.
 * Handles authentication, request formatting, and error handling.
 */

const BASE_URL = '/api';

interface ApiResponse<T = unknown> {
  success: boolean;
  error?: string;
  [key: string]: unknown;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }

  return data as T;
}

// ================================================================
// AUTH
// ================================================================

export const api = {
  auth: {
    getKeyParams: (email: string) =>
      request<{ success: boolean; keyParams: any }>(`/auth/key-params/${encodeURIComponent(email)}`),

    signup: (data: { email: string; authKey: string; keyParams: any; displayName?: string }) =>
      request<{ success: boolean; user: any; token: string }>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    signin: (data: { email: string; authKey: string }) =>
      request<{ success: boolean; user: any; keyParams: any; token: string }>('/auth/signin', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    signout: () =>
      request<{ success: boolean }>('/auth/signout', { method: 'POST' }),

    signoutAll: () =>
      request<{ success: boolean }>('/auth/signout-all', { method: 'POST' }),

    me: () =>
      request<{ success: boolean; user: any }>('/auth/me'),

    sessions: () =>
      request<{ success: boolean; sessions: any[] }>('/auth/sessions'),

    revokeSession: (jti: string) =>
      request<{ success: boolean }>(`/auth/sessions/${jti}`, { method: 'DELETE' }),

    updatePublicKeys: (data: { encryptionPublicKey: string; signingPublicKey: string; signature: string }) =>
      request<{ success: boolean }>('/auth/public-keys', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    changePassword: (data: { currentAuthKey: string; newAuthKey: string; newKeyParams: any; reWrappedItemKeys: any[] }) =>
      request<{ success: boolean; token: string }>('/auth/password', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  // ================================================================
  // VAULTS
  // ================================================================
  vaults: {
    list: () =>
      request<{ success: boolean; vaults: any[] }>('/vaults'),

    create: (data: { id: string; encryptedName: string; mode: 'local' | 'cloud' }) =>
      request<{ success: boolean; id: string }>('/vaults', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: { encryptedName: string }) =>
      request<{ success: boolean }>(`/vaults/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      request<{ success: boolean }>(`/vaults/${id}`, { method: 'DELETE' }),
  },

  // ================================================================
  // SECTIONS
  // ================================================================
  sections: {
    list: (vaultId: string) =>
      request<{ success: boolean; sections: any[] }>(`/vaults/${vaultId}/sections`),

    create: (data: { id: string; vaultId: string; encryptedName: string; encryptedMetadata?: string; sortOrder?: number }) =>
      request<{ success: boolean; id: string }>('/sections', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: { encryptedName: string; encryptedMetadata?: string; sortOrder?: number }) =>
      request<{ success: boolean }>(`/sections/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      request<{ success: boolean }>(`/sections/${id}`, { method: 'DELETE' }),
  },

  // ================================================================
  // NOTES
  // ================================================================
  notes: {
    list: () =>
      request<{ success: boolean; notes: any[] }>('/notes'),

    listBySection: (sectionId: string) =>
      request<{ success: boolean; notes: any[] }>(`/sections/${sectionId}/notes`),

    get: (id: string) =>
      request<{ success: boolean; note: any }>(`/notes/${id}`),

    create: (data: any) =>
      request<{ success: boolean; id: string }>('/notes', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: any) =>
      request<{ success: boolean }>(`/notes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    move: (id: string, sectionId: string) =>
      request<{ success: boolean }>(`/notes/${id}/move`, {
        method: 'PUT',
        body: JSON.stringify({ sectionId }),
      }),

    trash: (id: string) =>
      request<{ success: boolean }>(`/notes/${id}`, { method: 'DELETE' }),

    restore: (id: string) =>
      request<{ success: boolean }>(`/notes/${id}/restore`, { method: 'POST' }),

    deletePermanently: (id: string) =>
      request<{ success: boolean }>(`/notes/${id}/permanent`, { method: 'DELETE' }),

    listTrash: () =>
      request<{ success: boolean; notes: any[] }>('/trash'),
  },

  // ================================================================
  // KEYS
  // ================================================================
  keys: {
    storeItemKey: (data: any) =>
      request<{ success: boolean }>('/keys/item', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getItemKeys: (vaultId: string) =>
      request<{ success: boolean; keys: any[] }>(`/keys/item/${vaultId}`),

    storeContentKey: (data: any) =>
      request<{ success: boolean }>('/keys/content', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getContentKeys: (noteId: string) =>
      request<{ success: boolean; keys: any[] }>(`/keys/content/${noteId}`),
  },

  // ================================================================
  // TAGS
  // ================================================================
  tags: {
    list: () =>
      request<{ success: boolean; tags: any[] }>('/tags'),

    create: (data: { id: string; encryptedName: string; color?: string }) =>
      request<{ success: boolean; id: string }>('/tags', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: { encryptedName: string; color?: string }) =>
      request<{ success: boolean }>(`/tags/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      request<{ success: boolean }>(`/tags/${id}`, { method: 'DELETE' }),
  },

  // ================================================================
  // SHARES
  // ================================================================
  shares: {
    create: (data: any) =>
      request<{ success: boolean; id: string }>('/shares', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    received: () =>
      request<{ success: boolean; shares: any[] }>('/shares/received'),

    sent: (targetId: string) =>
      request<{ success: boolean; shares: any[] }>(`/shares/sent/${targetId}`),

    accept: (id: string) =>
      request<{ success: boolean }>(`/shares/${id}/accept`, { method: 'POST' }),

    revoke: (id: string) =>
      request<{ success: boolean }>(`/shares/${id}`, { method: 'DELETE' }),

    getPublicKey: (email: string) =>
      request<{ success: boolean; publicKey: any }>(`/shares/user/${encodeURIComponent(email)}/public-key`),
  },

  // ================================================================
  // REVISIONS
  // ================================================================
  revisions: {
    create: (data: any) =>
      request<{ success: boolean }>('/revisions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    list: (noteId: string) =>
      request<{ success: boolean; revisions: any[] }>(`/notes/${noteId}/revisions`),

    get: (id: string) =>
      request<{ success: boolean; revision: any }>(`/revisions/${id}`),
  },

  // ================================================================
  // SYNC
  // ================================================================
  sync: {
    pull: (data: { deviceId: string; lastSyncAt?: string }) =>
      request<{ success: boolean; notes: any[]; cursor: string; hasMore: boolean }>('/sync/pull', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    push: (data: { deviceId: string; notes: any[] }) =>
      request<{ success: boolean; created: number; updated: number; cursor: string }>('/sync/push', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
};
