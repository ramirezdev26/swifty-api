import { jest } from '@jest/globals';

const mockCloudinaryService = {
  uploadImage: jest.fn(),
};

const mockRabbitMQService = {
  publishImageUploadEvent: jest.fn(),
};

const mockSocketService = {
  emitImageProcessing: jest.fn(),
};

const mockDomainEventRepository = {
  store: jest.fn(),
};

jest.unstable_mockModule('../../../../src/infrastructure/services/cloudinary.service.js', () => ({
  default: mockCloudinaryService,
}));

jest.unstable_mockModule('../../../../src/infrastructure/services/rabbitmq.service.js', () => ({
  default: mockRabbitMQService,
}));

jest.unstable_mockModule('../../../../src/infrastructure/services/socket.service.js', () => ({
  emitImageProcessing: mockSocketService.emitImageProcessing,
}));

jest.unstable_mockModule(
  '../../../../src/infrastructure/persistence/repositories/domain-event.repository.js',
  () => ({
    DomainEventRepository: jest.fn(() => mockDomainEventRepository),
  })
);

const { ProcessImageUseCase } = await import(
  '../../../../src/application/use-cases/image/process-image.usecase.js'
);
const { NotFoundError } = await import('../../../../src/shared/errors/index.js');
const { Image } = await import('../../../../src/domain/entities/image.entity.js');
const { User } = await import('../../../../src/domain/entities/user.entity.js');

describe('ProcessImageUseCase - Event-Driven', () => {
  let useCase;
  let mockImageRepository;
  let mockUserRepository;

  const mockUser = new User({
    uid: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    full_name: 'Test User',
    firebase_uid: 'firebase123',
  });

  const mockImageBuffer = Buffer.from('fake-image-data');
  const mockFirebaseUid = 'firebase123';
  const mockStyle = 'cartoon';
  const mockFileSize = 1024000;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCloudinaryService.uploadImage.mockReset();
    mockRabbitMQService.publishImageUploadEvent.mockReset();
    mockSocketService.emitImageProcessing.mockReset();
    mockDomainEventRepository.store.mockReset();

    mockImageRepository = {
      create: jest.fn(),
      update: jest.fn(),
    };

    mockUserRepository = {
      findByFirebaseUid: jest.fn(),
    };

    useCase = new ProcessImageUseCase(mockImageRepository, mockUserRepository);
  });

  describe('execute - Event-Driven Flow', () => {
    it('should upload original image, create DB record, publish event, and return immediately', async () => {
      const mockSavedImage = new Image({
        id: 'image-id-123',
        user_id: mockUser.uid,
        size: mockFileSize,
        style: mockStyle,
        status: 'processing',
        original_url: 'https://res.cloudinary.com/test/original-image.jpg',
      });

      const mockCloudinaryResult = {
        public_id: 'swifty-original-images/image123',
        secure_url: 'https://res.cloudinary.com/test/original-image.jpg',
      };

      mockUserRepository.findByFirebaseUid.mockResolvedValue(mockUser);
      mockCloudinaryService.uploadImage.mockResolvedValue(mockCloudinaryResult);
      mockImageRepository.create.mockResolvedValue(mockSavedImage);
      mockDomainEventRepository.store.mockResolvedValue({});
      mockRabbitMQService.publishImageUploadEvent.mockResolvedValue();

      const result = await useCase.execute(
        mockFirebaseUid,
        mockImageBuffer,
        mockStyle,
        mockFileSize
      );

      // Verify user lookup
      expect(mockUserRepository.findByFirebaseUid).toHaveBeenCalledWith(mockFirebaseUid);

      // Verify original image uploaded to Cloudinary
      expect(mockCloudinaryService.uploadImage).toHaveBeenCalledWith(
        mockImageBuffer,
        expect.objectContaining({
          folder: 'swifty-original-images',
        })
      );

      // Verify database record created with 'processing' status
      expect(mockImageRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          _user_id: mockUser.uid,
          _size: mockFileSize,
          _style: mockStyle,
          _status: 'processing',
          _original_url: mockCloudinaryResult.secure_url,
        })
      );

      // Verify event published to RabbitMQ
      expect(mockRabbitMQService.publishImageUploadEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'ImageUploadEvent',
          payload: expect.objectContaining({
            imageId: mockSavedImage.id,
            userId: mockUser.uid,
            originalImageUrl: mockCloudinaryResult.secure_url,
            style: mockStyle,
          }),
        })
      );

      // Verify WebSocket notification sent
      expect(mockSocketService.emitImageProcessing).toHaveBeenCalledWith(
        mockUser.uid,
        expect.objectContaining({
          imageId: mockSavedImage.id,
          message: 'Image uploaded, queued for processing...',
        })
      );

      // Verify returns immediately with processing status
      expect(result).toEqual({
        imageId: mockSavedImage.id,
        status: 'processing',
        message: 'Image queued for processing',
        originalUrl: mockSavedImage.original_url,
        style: mockSavedImage.style,
      });
    });

    it('should throw NotFoundError when user is not found', async () => {
      mockUserRepository.findByFirebaseUid.mockResolvedValue(null);

      await expect(
        useCase.execute(mockFirebaseUid, mockImageBuffer, mockStyle, mockFileSize)
      ).rejects.toThrow(NotFoundError);

      expect(mockUserRepository.findByFirebaseUid).toHaveBeenCalledWith(mockFirebaseUid);
      expect(mockCloudinaryService.uploadImage).not.toHaveBeenCalled();
      expect(mockImageRepository.create).not.toHaveBeenCalled();
    });

    it('should handle Cloudinary upload failure', async () => {
      const uploadError = new Error('Cloudinary upload failed');

      mockUserRepository.findByFirebaseUid.mockResolvedValue(mockUser);
      mockCloudinaryService.uploadImage.mockRejectedValue(uploadError);

      await expect(
        useCase.execute(mockFirebaseUid, mockImageBuffer, mockStyle, mockFileSize)
      ).rejects.toThrow(uploadError);

      expect(mockCloudinaryService.uploadImage).toHaveBeenCalled();
      expect(mockImageRepository.create).not.toHaveBeenCalled();
      expect(mockRabbitMQService.publishImageUploadEvent).not.toHaveBeenCalled();
    });

    it('should handle database creation failure', async () => {
      const dbError = new Error('Database connection failed');

      const mockCloudinaryResult = {
        public_id: 'swifty-original-images/image123',
        secure_url: 'https://res.cloudinary.com/test/original-image.jpg',
      };

      mockUserRepository.findByFirebaseUid.mockResolvedValue(mockUser);
      mockCloudinaryService.uploadImage.mockResolvedValue(mockCloudinaryResult);
      mockImageRepository.create.mockRejectedValue(dbError);

      await expect(
        useCase.execute(mockFirebaseUid, mockImageBuffer, mockStyle, mockFileSize)
      ).rejects.toThrow(dbError);

      expect(mockImageRepository.create).toHaveBeenCalled();
      expect(mockRabbitMQService.publishImageUploadEvent).not.toHaveBeenCalled();
    });

    it('should continue if event store fails (non-blocking)', async () => {
      const mockSavedImage = new Image({
        id: 'image-id-123',
        user_id: mockUser.uid,
        size: mockFileSize,
        style: mockStyle,
        status: 'processing',
        original_url: 'https://res.cloudinary.com/test/original-image.jpg',
      });

      const mockCloudinaryResult = {
        public_id: 'swifty-original-images/image123',
        secure_url: 'https://res.cloudinary.com/test/original-image.jpg',
      };

      const eventStoreError = new Error('Event store failed');

      mockUserRepository.findByFirebaseUid.mockResolvedValue(mockUser);
      mockCloudinaryService.uploadImage.mockResolvedValue(mockCloudinaryResult);
      mockImageRepository.create.mockResolvedValue(mockSavedImage);
      mockDomainEventRepository.store.mockRejectedValue(eventStoreError);
      mockRabbitMQService.publishImageUploadEvent.mockResolvedValue();

      const result = await useCase.execute(
        mockFirebaseUid,
        mockImageBuffer,
        mockStyle,
        mockFileSize
      );

      // Should continue despite event store failure
      expect(mockRabbitMQService.publishImageUploadEvent).toHaveBeenCalled();
      expect(result.status).toBe('processing');
    });

    it('should propagate RabbitMQ publish failure', async () => {
      const mockSavedImage = new Image({
        id: 'image-id-123',
        user_id: mockUser.uid,
        size: mockFileSize,
        style: mockStyle,
        status: 'processing',
        original_url: 'https://res.cloudinary.com/test/original-image.jpg',
      });

      const mockCloudinaryResult = {
        public_id: 'swifty-original-images/image123',
        secure_url: 'https://res.cloudinary.com/test/original-image.jpg',
      };

      const rabbitError = new Error('RabbitMQ connection failed');

      mockUserRepository.findByFirebaseUid.mockResolvedValue(mockUser);
      mockCloudinaryService.uploadImage.mockResolvedValue(mockCloudinaryResult);
      mockImageRepository.create.mockResolvedValue(mockSavedImage);
      mockDomainEventRepository.store.mockResolvedValue({});
      mockRabbitMQService.publishImageUploadEvent.mockRejectedValue(rabbitError);

      await expect(
        useCase.execute(mockFirebaseUid, mockImageBuffer, mockStyle, mockFileSize)
      ).rejects.toThrow(rabbitError);
    });
  });
});
