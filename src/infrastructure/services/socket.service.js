import { WebSocketServer, WebSocket } from 'ws';
import pino from 'pino';
import { auth } from '../config/firebase.config.js';
import { config } from '../config/env.js';
import { UserRepository } from '../persistence/repositories/user.repository.js';

const transport = pino.transport({
  target: 'pino-pretty',
  options: {
    colorize: true,
    translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l o',
    levelFirst: true,
  },
});
const logger = pino({ level: process.env.LOG_LEVEL || 'info' }, transport);
let wss = null;
const userRepository = new UserRepository();
const userSockets = new Map();

export function initSocketServer(httpServer) {
  const extraOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const allowedOrigins = [
    config.server.frontendUrl,
    'http://localhost:4200',
    'http://127.0.0.1:4200',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    ...extraOrigins,
  ].filter(Boolean);

  // Add HTTPS origins when using local certificates
  if (config.server.localCertificates) {
    allowedOrigins.push(
      'https://localhost:4200',
      'https://127.0.0.1:4200',
      'https://localhost:3000',
      'https://127.0.0.1:3000'
    );
  }

  wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', async (ws, req) => {
    try {
      const origin = req.headers.origin;
      logger.debug({ origin, url: req.url }, 'WS connection attempt');
      if (
        origin &&
        !(
          allowedOrigins.includes(origin) ||
          origin.startsWith('http://localhost:') ||
          origin.startsWith('http://127.0.0.1:') ||
          (config.server.localCertificates &&
            (origin.startsWith('https://localhost:') || origin.startsWith('https://127.0.0.1:'))) ||
          origin.startsWith('chrome-extension://')
        )
      ) {
        logger.warn({ origin }, 'WS close 1008 - Origin not allowed');
        ws.close(1008, 'Origin not allowed');
        return;
      }

      const url = new URL(req.url || '', 'http://localhost');
      const token = url.searchParams.get('token');
      if (!token || typeof token !== 'string') {
        logger.warn({ url: req.url }, 'WS close 1008 - Missing token');
        ws.close(1008, 'Missing token');
        return;
      }

      if (!auth) {
        logger.error('WS close 1013 - Authentication service not available');
        ws.close(1013, 'Authentication service not available');
        return;
      }

      const decoded = await auth.verifyIdToken(token);
      const firebase_uid = decoded.user_id;
      const user = await userRepository.findByFirebaseUid(firebase_uid);
      if (!user) {
        logger.warn({ firebase_uid }, 'WS close 1008 - User not found');
        ws.close(1008, 'User not found');
        return;
      }

      const userId = user.uid;
      ws.userId = userId;
      if (!userSockets.has(userId)) userSockets.set(userId, new Set());
      userSockets.get(userId).add(ws);
      logger.info({ userId }, 'WS connected');

      ws.on('close', () => {
        const set = userSockets.get(userId);
        if (set) {
          set.delete(ws);
          if (set.size === 0) userSockets.delete(userId);
        }
        logger.info({ userId }, 'WS disconnected');
      });

      ws.on('error', (err) => {
        logger.error({ userId, err: String(err) }, 'WS error');
      });
    } catch (err) {
      logger.warn({ err: String(err) }, 'WS close 1008 - Unauthorized');
      ws.close(1008, 'Unauthorized');
    }
  });

  logger.info({ path: '/ws' }, 'WebSocket server initialized');
  return wss;
}

export function emitImageProcessing(userId, payload) {
  if (!wss) return;
  const eventPayload = {
    event: 'image:processing',
    data: {
      imageId: payload.imageId,
      status: 'processing',
      message: payload.message ?? 'Applying AI transformation...',
      ...(payload.progress != null ? { progress: payload.progress } : {}),
    },
  };
  const set = userSockets.get(userId);
  if (!set) return;
  const recipients = set.size;
  logger.info(
    {
      userId,
      imageId: payload.imageId,
      recipients,
      message: eventPayload.data.message,
      progress: eventPayload.data.progress,
    },
    'WS = image:processing'
  );
  set.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(eventPayload));
  });
}

export function emitImageCompleted(userId, payload) {
  if (!wss) return;
  const eventPayload = {
    event: 'image:completed',
    data: {
      imageId: payload.imageId,
      status: 'completed',
      processedUrl: payload.processedUrl,
      style: payload.style,
      processedAt: payload.processedAt,
    },
  };
  const set = userSockets.get(userId);
  if (!set) return;
  const recipients = set.size;
  logger.info(
    { userId, imageId: payload.imageId, recipients, style: payload.style },
    'WS = image:completed'
  );
  set.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(eventPayload));
  });
}

export function emitImageFailed(userId, payload) {
  if (!wss) return;
  const eventPayload = {
    event: 'image:failed',
    data: {
      imageId: payload.imageId,
      status: 'failed',
      error: payload.error ?? 'PROCESSING_ERROR',
      message: payload.message ?? 'Image processing failed',
    },
  };
  const set = userSockets.get(userId);
  if (!set) return;
  const recipients = set.size;
  logger.warn(
    { userId, imageId: payload.imageId, recipients, error: eventPayload.data.error },
    'WS = image:failed'
  );
  set.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(eventPayload));
  });
}

export default {
  initSocketServer,
  emitImageProcessing,
  emitImageCompleted,
  emitImageFailed,
};
