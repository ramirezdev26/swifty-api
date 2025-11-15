/* eslint-env jest */
import { jest } from '@jest/globals';

// Shared holders to inspect the mocked Socket.IO server
let capturedOptions;
let serverStub;

// Default mocks that we can tweak per test
let mockAuth;
let mockUserRepositoryInstance;

// Helper: set up module mocks and import the service fresh
async function importServiceWithMocks({
  frontendUrl = 'https://allowed.com',
  authAvailable = true,
} = {}) {
  capturedOptions = undefined;
  serverStub = undefined;
  mockUserRepositoryInstance = { findByFirebaseUid: jest.fn() };

  // Mock socket.io Server using ESM-friendly mockModule API
  await jest.unstable_mockModule('socket.io', async () => {
    const Server = jest.fn().mockImplementation((httpServer, options) => {
      capturedOptions = options;
      const toEmits = [];
      serverStub = {
        use: jest.fn(),
        on: jest.fn(),
        to: jest.fn((room) => {
          const emit = jest.fn((event, payload) => {
            toEmits.push({ room, event, payload });
          });
          return { emit };
        }),
        __toEmits: toEmits,
      };
      return serverStub;
    });
    return { Server };
  });

  // Mock logger (pino)
  await jest.unstable_mockModule('pino', async () => ({
    default: jest.fn(() => ({ info: jest.fn(), warn: jest.fn() })),
  }));

  // Mock env config
  await jest.unstable_mockModule('../../../src/infrastructure/config/env.js', async () => ({
    config: {
      server: { frontendUrl },
      firebase: {},
      database: {},
      cloudinary: {},
      gemini: {},
    },
  }));

  // Mock Firebase auth
  mockAuth = authAvailable ? { verifyIdToken: jest.fn() } : null;

  await jest.unstable_mockModule(
    '../../../src/infrastructure/config/firebase.config.js',
    async () => ({ auth: mockAuth })
  );

  // Mock UserRepository class so the module-level instance uses this
  await jest.unstable_mockModule(
    '../../../src/infrastructure/persistence/repositories/user.repository.js',
    async () => ({
      UserRepository: jest.fn().mockImplementation(() => mockUserRepositoryInstance),
    })
  );

  // Import service under test with fresh module registry
  const service = await import('../../../src/infrastructure/services/socket.service.js');
  return service;
}

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
});

describe('socket.service - init and CORS', () => {
  it('configures path /ws and enforces CORS with allowed origins and localhost wildcard', async () => {
    const service = await importServiceWithMocks({ frontendUrl: 'https://app.example.com' });

    // Initialize server
    const io = service.initSocketServer({});
    expect(io).toBeDefined();

    // Path configuration
    expect(capturedOptions).toBeDefined();
    expect(capturedOptions.path).toBe('/ws');

    // CORS origin function
    const originFn = capturedOptions.cors.origin;

    // No origin (non-browser clients)
    const cb1 = jest.fn();
    originFn(undefined, cb1);
    expect(cb1).toHaveBeenCalledWith(null, true);

    // Exact allowed origin
    const cb2 = jest.fn();
    originFn('https://app.example.com', cb2);
    expect(cb2).toHaveBeenCalledWith(null, true);

    // Localhost wildcard on arbitrary port
    const cb3 = jest.fn();
    originFn('http://localhost:5173', cb3);
    expect(cb3).toHaveBeenCalledWith(null, true);

    const cb4 = jest.fn();
    originFn('http://127.0.0.1:8080', cb4);
    expect(cb4).toHaveBeenCalledWith(null, true);

    // Disallowed origin
    const cb5 = jest.fn();
    originFn('https://evil.com', cb5);
    expect(cb5.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(cb5.mock.calls[0][0].message).toMatch(/WS CORS violation/);
  });
});

describe('socket.service - auth middleware', () => {
  it('authorizes valid token and attaches user data', async () => {
    const service = await importServiceWithMocks({ frontendUrl: 'https://app.example.com' });
    service.initSocketServer({});

    // Retrieve the auth middleware function registered via io.use
    const authMiddleware = serverStub.use.mock.calls[0][0];

    mockAuth.verifyIdToken.mockResolvedValue({ user_id: 'firebase-123', email: 'user@test.com' });
    mockUserRepositoryInstance.findByFirebaseUid.mockResolvedValue({ uid: 'user-123' });

    const socket = {
      handshake: { auth: { token: 'abc123' }, query: {} },
      data: {},
      join: jest.fn(),
      id: 'socket-1',
    };
    const next = jest.fn();

    await authMiddleware(socket, next);

    expect(mockAuth.verifyIdToken).toHaveBeenCalledWith('abc123');
    expect(mockUserRepositoryInstance.findByFirebaseUid).toHaveBeenCalledWith('firebase-123');
    expect(socket.data.userId).toBe('user-123');
    expect(socket.data.firebaseUid).toBe('firebase-123');
    expect(socket.join).toHaveBeenCalledWith('user:user-123');
    expect(next).toHaveBeenCalledWith();
  });

  it('fails when token is missing', async () => {
    const service = await importServiceWithMocks();
    service.initSocketServer({});
    const authMiddleware = serverStub.use.mock.calls[0][0];

    const socket = {
      handshake: { auth: {}, query: {} },
      data: {},
      join: jest.fn(),
      id: 'socket-2',
    };
    const next = jest.fn();

    await authMiddleware(socket, next);
    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(next.mock.calls[0][0].message).toBe('Missing token');
  });

  it('fails when auth service is unavailable', async () => {
    const service = await importServiceWithMocks({ authAvailable: false });
    service.initSocketServer({});
    const authMiddleware = serverStub.use.mock.calls[0][0];

    const socket = {
      handshake: { auth: { token: 'abc123' }, query: {} },
      data: {},
      join: jest.fn(),
      id: 'socket-3',
    };
    const next = jest.fn();

    await authMiddleware(socket, next);
    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(next.mock.calls[0][0].message).toBe('Authentication service not available');
  });

  it('fails when user is not found', async () => {
    const service = await importServiceWithMocks();
    service.initSocketServer({});
    const authMiddleware = serverStub.use.mock.calls[0][0];

    mockAuth.verifyIdToken.mockResolvedValue({ user_id: 'firebase-999' });
    mockUserRepositoryInstance.findByFirebaseUid.mockResolvedValue(null);

    const socket = {
      handshake: { auth: { token: 'abc123' }, query: {} },
      data: {},
      join: jest.fn(),
      id: 'socket-4',
    };
    const next = jest.fn();

    await authMiddleware(socket, next);
    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(next.mock.calls[0][0].message).toBe('User not found');
  });

  it('fails with Unauthorized when verifyIdToken throws', async () => {
    const service = await importServiceWithMocks();
    service.initSocketServer({});
    const authMiddleware = serverStub.use.mock.calls[0][0];

    mockAuth.verifyIdToken.mockRejectedValue(new Error('Token invalid'));

    const socket = {
      handshake: { auth: { token: 'bad' }, query: {} },
      data: {},
      join: jest.fn(),
      id: 'socket-5',
    };
    const next = jest.fn();

    await authMiddleware(socket, next);
    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(next.mock.calls[0][0].message).toBe('Unauthorized');
  });
});

describe('socket.service - image event emissions', () => {
  it('emits image:processing with default message and progress when provided', async () => {
    const service = await importServiceWithMocks();
    service.initSocketServer({});

    service.emitImageProcessing('user-1', { imageId: 'img-1', progress: 42 });

    const emit = serverStub.__toEmits[0];
    expect(emit.room).toBe('user:user-1');
    expect(emit.event).toBe('image:processing');
    expect(emit.payload.event).toBe('image:processing');
    expect(emit.payload.data.imageId).toBe('img-1');
    expect(emit.payload.data.status).toBe('processing');
    expect(emit.payload.data.message).toBe('Applying AI transformation...');
    expect(emit.payload.data.progress).toBe(42);
  });

  it('emits image:completed with processed details', async () => {
    const service = await importServiceWithMocks();
    service.initSocketServer({});

    const payload = {
      imageId: 'img-2',
      processedUrl: 'https://cdn/processed.jpg',
      style: 'cartoon',
      processedAt: new Date('2025-01-01T00:00:00Z'),
    };
    service.emitImageCompleted('user-2', payload);

    const emit = serverStub.__toEmits[0];
    expect(emit.room).toBe('user:user-2');
    expect(emit.event).toBe('image:completed');
    expect(emit.payload.event).toBe('image:completed');
    expect(emit.payload.data).toMatchObject(payload);
    expect(emit.payload.data.status).toBe('completed');
  });

  it('emits image:failed with defaults when not provided', async () => {
    const service = await importServiceWithMocks();
    service.initSocketServer({});

    service.emitImageFailed('user-3', { imageId: 'img-3' });

    const emit = serverStub.__toEmits[0];
    expect(emit.room).toBe('user:user-3');
    expect(emit.event).toBe('image:failed');
    expect(emit.payload.event).toBe('image:failed');
    expect(emit.payload.data.imageId).toBe('img-3');
    expect(emit.payload.data.status).toBe('failed');
    expect(emit.payload.data.error).toBe('PROCESSING_ERROR');
    expect(emit.payload.data.message).toBe('Image processing failed');
  });
});
