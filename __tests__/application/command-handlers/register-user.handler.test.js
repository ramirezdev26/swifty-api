import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { RegisterUserHandler } from '../../../src/application/command-handlers/register-user.handler.js';
import { RegisterUserCommand } from '../../../src/application/commands/register-user.command.js';
import { ConflictError } from '../../../src/shared/errors/index.js';

describe('RegisterUserHandler', () => {
  let handler;
  let mockUserRepository;
  let mockEventStoreRepository;
  let mockEventPublisher;

  const mockUser = {
    uid: 'user-123',
    email: 'test@test.com',
    full_name: 'Test User',
    firebase_uid: 'firebase-123',
  };

  beforeEach(() => {
    mockUserRepository = {
      findByEmail: jest.fn(),
      create: jest.fn(),
    };

    mockEventStoreRepository = {
      append: jest.fn(),
    };

    mockEventPublisher = {
      publish: jest.fn(),
    };

    handler = new RegisterUserHandler(
      mockUserRepository,
      mockEventStoreRepository,
      mockEventPublisher
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should register user and publish event successfully', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(mockUser);
      mockEventStoreRepository.append.mockResolvedValue({});
      mockEventPublisher.publish.mockResolvedValue();

      const command = new RegisterUserCommand('test@test.com', 'Test User', 'firebase-123');

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@test.com');
      expect(mockUserRepository.create).toHaveBeenCalled();
      expect(mockEventStoreRepository.append).toHaveBeenCalled();
      expect(mockEventPublisher.publish).toHaveBeenCalled();

      expect(result).toEqual({
        uid: 'user-123',
        email: 'test@test.com',
        full_name: 'Test User',
        firebase_uid: 'firebase-123',
      });
    });

    it('should throw ConflictError when user already exists', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      const command = new RegisterUserCommand('test@test.com', 'Test User', 'firebase-123');

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(ConflictError);
      expect(mockUserRepository.create).not.toHaveBeenCalled();
      expect(mockEventStoreRepository.append).not.toHaveBeenCalled();
      expect(mockEventPublisher.publish).not.toHaveBeenCalled();
    });

    it('should propagate repository errors during create', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockRejectedValue(new Error('Database error'));

      const command = new RegisterUserCommand('test@test.com', 'Test User', 'firebase-123');

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Database error');
      expect(mockEventStoreRepository.append).not.toHaveBeenCalled();
    });

    it('should propagate event store errors', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(mockUser);
      mockEventStoreRepository.append.mockRejectedValue(new Error('Event store error'));

      const command = new RegisterUserCommand('test@test.com', 'Test User', 'firebase-123');

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Event store error');
    });

    it('should create correct event with all required data', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(mockUser);
      mockEventStoreRepository.append.mockResolvedValue({});
      mockEventPublisher.publish.mockResolvedValue();

      const command = new RegisterUserCommand('test@test.com', 'Test User', 'firebase-123');

      // Act
      await handler.execute(command);

      // Assert
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'UserRegisteredEvent',
          aggregateId: 'user-123',
          aggregateType: 'User',
          data: expect.objectContaining({
            userId: 'user-123',
            email: 'test@test.com',
            fullName: 'Test User',
            firebaseUid: 'firebase-123',
          }),
        })
      );
    });
  });
});
