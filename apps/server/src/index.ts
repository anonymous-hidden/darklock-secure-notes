/**
 * Darklock Secure Notes - Server Entry Point
 * 
 * Zero-knowledge sync server. Stores only encrypted data.
 * Never has access to plaintext notes, titles, tags, or attachments.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import { createDatabase } from './db/schema.js';
import { createQueries } from './db/queries.js';
import { createAuthRoutes } from './routes/auth.js';
import { createNotesRoutes } from './routes/notes.js';
import { createSyncRoutes } from './routes/sync.js';

const PORT = parseInt(process.env.PORT || '3003', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';

async function main() {
  console.log('[Darklock Notes Server] Starting...');
  console.log(`[Darklock Notes Server] Environment: ${NODE_ENV}`);

  // Initialize database
  const db = createDatabase();
  const queries = createQueries(db);

  // Clean expired sessions on startup
  queries.cleanExpiredSessions.run();

  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  app.use(cors({
    origin: NODE_ENV === 'production'
      ? ['https://notes.darklock.net', 'https://darklock.net', 'tauri://localhost', 'http://tauri.localhost']
      : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:1420', 'tauri://localhost', 'http://tauri.localhost'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  app.use(express.json({ limit: '5mb' }));
  app.use(cookieParser());

  // Rate limiting
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { success: false, error: 'Too many auth attempts, try again later' },
  });

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    message: { success: false, error: 'Rate limit exceeded' },
  });

  // Health check
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'darklock-notes-server',
      timestamp: new Date().toISOString(),
      zeroKnowledge: true,
    });
  });

  // Routes
  app.use('/api/auth', authLimiter, createAuthRoutes(queries));
  app.use('/api', apiLimiter, createNotesRoutes(queries));
  app.use('/api', apiLimiter, createSyncRoutes(queries));

  // Error handler
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[Server Error]', err.message);
    res.status(500).json({ success: false, error: 'Internal server error' });
  });

  // Periodic session cleanup (every hour)
  setInterval(() => {
    queries.cleanExpiredSessions.run();
  }, 60 * 60 * 1000);

  app.listen(PORT, () => {
    console.log(`[Darklock Notes Server] ✅ Listening on port ${PORT}`);
    console.log(`[Darklock Notes Server] Zero-knowledge design: server stores ONLY encrypted data`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('[Darklock Notes Server] Shutting down...');
    db.close();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('[Darklock Notes Server] Interrupted, shutting down...');
    db.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('[Darklock Notes Server] Fatal error:', err);
  process.exit(1);
});
