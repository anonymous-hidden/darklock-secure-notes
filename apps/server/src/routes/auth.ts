/**
 * Darklock Server - Auth Routes
 * 
 * ZERO-KNOWLEDGE AUTH: The server receives the server-auth half of the root key
 * (derived from password via Argon2id on the client). The encryption half NEVER
 * reaches the server. The server hashes the auth key again with Argon2id before
 * storing it (double-hashed design).
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createHmac } from 'crypto';
import { initCrypto, hashServerAuthKey, verifyServerAuthKey, fromBase64 } from '@darklock/crypto';
import type { Queries } from '../db/queries.js';
import { createToken, requireAuth } from '../middleware/auth.js';
import { signupSchema, signinSchema, updatePublicKeysSchema } from '../middleware/validation.js';

/**
 * Deterministic but unpredictable per-email dummy salt.
 * Prevents timing-based email enumeration: same email always returns same
 * salt (consistent response) but attackers can't distinguish fake from real
 * without the DUMMY_SALT_KEY secret.
 */
const DUMMY_SALT_KEY = process.env.DUMMY_SALT_KEY || 'dl-enum-protect-dev-change-in-prod';
if (!process.env.DUMMY_SALT_KEY && process.env.NODE_ENV === 'production') {
  throw new Error('FATAL: DUMMY_SALT_KEY environment variable is required in production');
}

function getDummySalt(email: string): string {
  const hmac = createHmac('sha256', DUMMY_SALT_KEY)
    .update(email.toLowerCase().trim())
    .digest();
  // Take first 16 bytes → 24-char base64 (matches real Argon2id salt length)
  return Buffer.from(hmac.subarray(0, 16)).toString('base64');
}

export function createAuthRoutes(queries: Queries): Router {
  const router = Router();

  /**
   * POST /auth/signup
   * Register a new account. Client sends:
   * - email
   * - authKey (base64): the server-auth half of the derived root key
   * - keyParams: KDF parameters needed to re-derive on other devices
   */
  router.post('/signup', async (req: Request, res: Response) => {
    try {
      const parsed = signupSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'Invalid input', details: parsed.error.issues });
        return;
      }
      const { email, authKey, keyParams, displayName } = parsed.data;

      // Check if email already exists
      const existing = queries.getUserByEmail.get(email);
      if (existing) {
        res.status(409).json({ success: false, error: 'Email already registered' });
        return;
      }

      await initCrypto();

      // Hash the server auth key (double-hashing: password → KDF → authKey → server hash)
      const authKeyBytes = await fromBase64(authKey);
      const verifier = await hashServerAuthKey(authKeyBytes);

      const userId = uuidv4();
      queries.insertUser.run(
        userId,
        email.toLowerCase().trim(),
        verifier,
        JSON.stringify(keyParams),
        displayName || null
      );

      // Create session
      const jti = uuidv4();
      const sessionId = uuidv4();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      queries.insertSession.run(sessionId, userId, jti, req.ip, req.get('user-agent'), expiresAt);

      const token = createToken({ userId, email }, jti);

      // Set secure cookie
      res.cookie('darklock_notes_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000,
        path: '/',
      });

      res.status(201).json({
        success: true,
        user: { id: userId, email, displayName },
      });
    } catch (err) {
      console.error('[Auth] Signup error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /**
   * POST /auth/signin
   * Authenticate. Client sends authKey (server-auth half).
   * Server verifies against stored verifier.
   * Returns keyParams so client can re-derive encryption keys.
   */
  router.post('/signin', async (req: Request, res: Response) => {
    try {
      const parsed = signinSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'Invalid input' });
        return;
      }
      const { email, authKey } = parsed.data;

      const user = queries.getUserByEmail.get(email.toLowerCase().trim()) as any;
      if (!user) {
        // Constant-time-ish: don't reveal whether email exists
        res.status(401).json({ success: false, error: 'Invalid credentials' });
        return;
      }

      await initCrypto();
      const authKeyBytes = await fromBase64(authKey);
      const valid = await verifyServerAuthKey(authKeyBytes, user.auth_verifier);

      if (!valid) {
        res.status(401).json({ success: false, error: 'Invalid credentials' });
        return;
      }

      // Create session
      const jti = uuidv4();
      const sessionId = uuidv4();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      queries.insertSession.run(sessionId, user.id, jti, req.ip, req.get('user-agent'), expiresAt);

      const token = createToken({ userId: user.id, email: user.email }, jti);

      res.cookie('darklock_notes_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000,
        path: '/',
      });

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
        },
        keyParams: JSON.parse(user.key_params),
      });
    } catch (err) {
      console.error('[Auth] Signin error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /**
   * POST /auth/signout
   * Revoke current session.
   */
  router.post('/signout', requireAuth(queries), (req: Request, res: Response) => {
    try {
      queries.revokeSession.run(req.user!.jti);
      res.clearCookie('darklock_notes_token');
      res.json({ success: true });
    } catch (err) {
      console.error('[Auth] Signout error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /**
   * POST /auth/signout-all
   * Revoke all sessions for the user.
   */
  router.post('/signout-all', requireAuth(queries), (req: Request, res: Response) => {
    try {
      queries.revokeAllUserSessions.run(req.user!.userId);
      res.clearCookie('darklock_notes_token');
      res.json({ success: true });
    } catch (err) {
      console.error('[Auth] Signout-all error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /**
   * GET /auth/me
   * Get current user info + key params.
   */
  router.get('/me', requireAuth(queries), (req: Request, res: Response) => {
    try {
      const user = queries.getUserById.get(req.user!.userId) as any;
      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
          keyParams: JSON.parse(user.key_params),
          hasPublicKeys: !!(user.encryption_public_key && user.signing_public_key),
          createdAt: user.created_at,
        },
      });
    } catch (err) {
      console.error('[Auth] Get user error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /**
   * GET /auth/sessions
   * List active sessions for current user.
   */
  router.get('/sessions', requireAuth(queries), (req: Request, res: Response) => {
    try {
      const sessions = queries.getUserSessions.all(req.user!.userId);
      res.json({ success: true, sessions });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /**
   * DELETE /auth/sessions/:jti
   * Revoke a specific session.
   */
  router.delete('/sessions/:jti', requireAuth(queries), (req: Request, res: Response) => {
    try {
      queries.revokeSession.run(req.params.jti);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /**
   * PUT /auth/public-keys
   * Upload public key bundle for receiving shared notes.
   */
  router.put('/public-keys', requireAuth(queries), (req: Request, res: Response) => {
    try {
      const parsed = updatePublicKeysSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: 'Invalid input' });
        return;
      }

      queries.updateUserPublicKeys.run(
        parsed.data.encryptionPublicKey,
        parsed.data.signingPublicKey,
        parsed.data.signature,
        req.user!.userId
      );

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /**
   * PUT /auth/password
   * Change password — client re-derives root key, sends new auth verifier + new key params.
   * Item keys are re-wrapped client-side and sent in the same request.
   */
  router.put('/password', requireAuth(queries), async (req: Request, res: Response) => {
    try {
      const { currentAuthKey, newAuthKey, newKeyParams, reWrappedItemKeys } = req.body;

      if (!currentAuthKey || !newAuthKey || !newKeyParams) {
        res.status(400).json({ success: false, error: 'Missing required fields' });
        return;
      }

      // Verify current auth key
      const user = queries.getUserById.get(req.user!.userId) as any;
      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      await initCrypto();
      const currentKeyBytes = await fromBase64(currentAuthKey);
      const valid = await verifyServerAuthKey(currentKeyBytes, user.auth_verifier);
      if (!valid) {
        res.status(401).json({ success: false, error: 'Current password verification failed' });
        return;
      }

      // Hash and store new auth verifier
      const newKeyBytes = await fromBase64(newAuthKey);
      const newVerifier = await hashServerAuthKey(newKeyBytes);

      queries.updateAuthVerifier.run(newVerifier, JSON.stringify(newKeyParams), req.user!.userId);

      // Update re-wrapped item keys if provided
      if (Array.isArray(reWrappedItemKeys)) {
        for (const key of reWrappedItemKeys) {
          queries.updateItemKey.run(key.ciphertext, key.nonce, key.id, req.user!.userId);
        }
      }

      // Revoke all other sessions (force re-login with new password)
      queries.revokeAllUserSessions.run(req.user!.userId);

      // Create new session for this device
      const jti = uuidv4();
      const sessionId = uuidv4();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      queries.insertSession.run(sessionId, req.user!.userId, jti, req.ip, req.get('user-agent'), expiresAt);

      const token = createToken({ userId: req.user!.userId, email: req.user!.email }, jti);

      res.cookie('darklock_notes_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000,
        path: '/',
      });

      res.json({ success: true, token });
    } catch (err) {
      console.error('[Auth] Password change error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  /**
   * GET /auth/key-params/:email
   * Public endpoint: get KDF params for an email.
   * Needed so clients can derive keys before sending auth key.
   */
  router.get('/key-params/:email', (req: Request, res: Response) => {
    try {
      const user = queries.getUserByEmail.get(req.params.email.toLowerCase().trim()) as any;
      if (!user) {
        // Don't reveal whether email exists — return dummy params.
        // Salt is HMAC-derived per-email so attackers can't distinguish
        // real vs fake users via salt value comparison.
        res.json({
          success: true,
          keyParams: {
            algorithm: 'argon2id',
            memoryBytes: 19922944,
            iterations: 2,
            parallelism: 1,
            salt: getDummySalt(req.params.email),
            keyLength: 64,
          },
        });
        return;
      }

      res.json({
        success: true,
        keyParams: JSON.parse(user.key_params),
      });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  return router;
}
