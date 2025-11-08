import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { ProcessImageHandler } from '../../../src/application/command-handlers/process-image.handler.js';
import { ProcessImageCommand } from '../../../src/application/commands/process-image.command.js';
import { NotFoundError } from '../../../src/shared/errors/index.js';

describe('ProcessImageHandler', () => {
  let handler;
  let mockUserRepository;
  let mockImageRepository;
  let mockEventStoreRepository;
  let mockEventPublisher;
  let mockCloudinaryService;

  const mockUser = {
    uid: 'user-123',
    email: 'test@test.com',
    full_name: 'Test User',
    firebase_uid: 'firebase-123',
  };

  const mockCloudinaryResult = {
    public_id: 'img-123',
    secure_url: 'https://cloudinary.com/img.jpg',
  };

  const mockSavedImage = {
    id: 'image-456',
    user_id: 'user-123',
    cloudinary_id: 'img-123',
    original_url: 'https://cloudinary.com/img.jpg',
    size: 1024,
    style: 'cartoon',
    status: 'processing',
  };

  beforeEach(() => {
    mockUserRepository = {
      findByFirebaseUid: jest.fn(),
    };

    mockImageRepository = {
      create: jest.fn(),
    };

    mockEventStoreRepository = {
      append: jest.fn(),
    };

    mockEventPublisher = {
      publish: jest.fn(),
    };

    mockCloudinaryService = {
      uploadImage: jest.fn(),
    };

    handler = new ProcessImageHandler(
      mockUserRepository,
      mockImageRepository,
      mockEventStoreRepository,
      mockEventPublisher,
      mockCloudinaryService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should process image command and publish event successfully', async () => {
      // Arrange
      mockUserRepository.findByFirebaseUid.mockResolvedValue(mockUser);
      mockCloudinaryService.uploadImage.mockResolvedValue(mockCloudinaryResult);
      mockImageRepository.create.mockResolvedValue(mockSavedImage);
      mockEventStoreRepository.append.mockResolvedValue({});
      mockEventPublisher.publish.mockResolvedValue();

      const command = new ProcessImageCommand('firebase-123', Buffer.from('test'), 'cartoon', 1024);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(mockUserRepository.findByFirebaseUid).toHaveBeenCalledWith('firebase-123');
      expect(mockCloudinaryService.uploadImage).toHaveBeenCalledWith(
        Buffer.from('test'),
        expect.objectContaining({
          public_id: expect.stringContaining('original_'),
          folder: 'swifty-original-images',
        })
      );
      expect(mockImageRepository.create).toHaveBeenCalled();
      expect(mockEventStoreRepository.append).toHaveBeenCalled();
      expect(mockEventPublisher.publish).toHaveBeenCalled();

      expect(result).toEqual({
        imageId: 'image-456',
        status: 'processing',
        message: 'Image is being processed',
      });
    });

    it('should throw NotFoundError when user not found', async () => {
      // Arrange
      mockUserRepository.findByFirebaseUid.mockResolvedValue(null);

      const command = new ProcessImageCommand('invalid', Buffer.from('test'), 'cartoon', 1024);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(NotFoundError);
      expect(mockCloudinaryService.uploadImage).not.toHaveBeenCalled();
      expect(mockImageRepository.create).not.toHaveBeenCalled();
    });

    it('should propagate cloudinary upload errors', async () => {
      // Arrange
      mockUserRepository.findByFirebaseUid.mockResolvedValue(mockUser);
      mockCloudinaryService.uploadImage.mockRejectedValue(new Error('Upload failed'));

      const command = new ProcessImageCommand('firebase-123', Buffer.from('test'), 'cartoon', 1024);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Upload failed');
      expect(mockImageRepository.create).not.toHaveBeenCalled();
    });

    it('should propagate repository errors', async () => {
      // Arrange
      mockUserRepository.findByFirebaseUid.mockResolvedValue(mockUser);
      mockCloudinaryService.uploadImage.mockResolvedValue(mockCloudinaryResult);
      mockImageRepository.create.mockRejectedValue(new Error('Database error'));

      const command = new ProcessImageCommand('firebase-123', Buffer.from('test'), 'cartoon', 1024);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Database error');
      expect(mockEventStoreRepository.append).not.toHaveBeenCalled();
    });

    it('should create correct event with all required data', async () => {
      // Arrange
      mockUserRepository.findByFirebaseUid.mockResolvedValue(mockUser);
      mockCloudinaryService.uploadImage.mockResolvedValue(mockCloudinaryResult);
      mockImageRepository.create.mockResolvedValue(mockSavedImage);
      mockEventStoreRepository.append.mockResolvedValue({});
      mockEventPublisher.publish.mockResolvedValue();

      const command = new ProcessImageCommand('firebase-123', Buffer.from('test'), 'cartoon', 1024);

      // Act
      await handler.execute(command);

      // Assert
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ImageUploadedEvent',
          aggregateId: 'image-456',
          aggregateType: 'Image',
          data: expect.objectContaining({
            imageId: 'image-456',
            userId: 'user-123',
            originalUrl: 'https://cloudinary.com/img.jpg',
            style: 'cartoon',
            size: 1024,
            userEmail: 'test@test.com',
          }),
        })
      );
    });
  });
});
