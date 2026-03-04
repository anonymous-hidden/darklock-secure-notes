/**
 * Darklock Server - Authentication Middleware
 * 
 * JWT-based authentication with JTI session tracking.
 * Tokens are short-lived; sessions can be individually revoked.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { Queries } from '../db/queries.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET environment variable is required in production');
  }
  console.warn('\x1b[33m[SECURITY WARNING]\x1b[0m JWT_SECRET not set — using insecure dev fallback. Do NOT use in production.');
}
const JWT_SECRET_VALUE = JWT_SECRET || 'darklock-dev-secret-DO-NOT-USE-IN-PRODUCTION';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

export interface AuthPayload {
  userId: string;
  email: string;
  jti: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

/**
 * Create JWT for a user session.
 */
export function createToken(payload: Omit<AuthPayload, 'jti'>, jti: string): string {
  return jwt.sign(
    { userId: payload.userId, email: payload.email, jti },
    JWT_SECRET_VALUE,
    { expiresIn: JWT_EXPIRY }
  );
}

/**
 * Verify JWT and decode payload.
 */
export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, JWT_SECRET_VALUE) as AuthPayload;
}

/**
 * Authentication middleware factory.
 * Validates JWT from cookie or Authorization header + checks session is active.
 */
export function requireAuth(queries: Queries) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Get token from cookie or Authorization header
    const bearerMatch = req.headers.authorization?.match(/^Bearer (.+)$/);
    const token = req.cookies?.darklock_notes_token
      || bearerMatch?.[1];

    if (!token) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    try {
      const decoded = verifyToken(token);

      // Check session is still valid (not revoked)
      const session = queries.getSessionByJti.get(decoded.jti) as { revoked_at: string | null } | undefined;
      if (!session) {
        res.status(401).json({ success: false, error: 'Session expired or revoked' });
        return;
      }

      req.user = decoded;
      next();
    } catch {
      res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }
  };
}
