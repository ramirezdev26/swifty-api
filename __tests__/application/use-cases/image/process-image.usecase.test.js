import { jest } from '@jest/globals';

const mockCloudinaryService = {
  uploadImage: jest.fn(),
};

const mockRabbitMQService = {
  publishImageUploaded: jest.fn(),
};

jest.unstable_mockModule('../../../../src/infrastructure/services/cloudinary.service.js', () => ({
  default: mockCloudinaryService,
}));

jest.unstable_mockModule('../../../../src/infrastructure/services/rabbitmq.service.js', () => ({
  default: mockRabbitMQService,
}));

const { ProcessImageUseCase } = await import(
  '../../../../src/application/use-cases/image/process-image.usecase.js'
);
const { NotFoundError } = await import('../../../../src/shared/errors/index.js');
const { Image } = await import('../../../../src/domain/entities/image.entity.js');
const { User } = await import('../../../../src/domain/entities/user.entity.js');

describe('ProcessImageUseCase', () => {
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
    mockRabbitMQService.publishImageUploaded.mockReset();

    mockImageRepository = {
      create: jest.fn(),
      update: jest.fn(),
    };

    mockUserRepository = {
      findByFirebaseUid: jest.fn(),
    };

    useCase = new ProcessImageUseCase(mockImageRepository, mockUserRepository);
  });

  describe('execute', () => {
    it('should process image successfully and return result', async () => {
      const mockSavedImage = new Image({
        id: 'image-id-123',
        user_id: mockUser.uid,
        size: mockFileSize,
        style: mockStyle,
        status: 'processing',
        original_url: 'https://res.cloudinary.com/test/original-image.jpg',
        cloudinary_id: 'original_123456789',
      });

      const mockCloudinaryResult = {
        public_id: 'original_123456789',
        secure_url: 'https://res.cloudinary.com/test/original-image.jpg',
        url: 'http://res.cloudinary.com/test/original-image.jpg',
        bytes: 500000,
        format: 'jpg',
        width: 1024,
        height: 768,
      };

      mockUserRepository.findByFirebaseUid.mockResolvedValue(mockUser);
      mockCloudinaryService.uploadImage.mockResolvedValue(mockCloudinaryResult);
      mockImageRepository.create.mockResolvedValue(mockSavedImage);
      mockRabbitMQService.publishImageUploaded.mockResolvedValue();

      const result = await useCase.execute(
        mockFirebaseUid,
        mockImageBuffer,
        mockStyle,
        mockFileSize
      );

      expect(mockUserRepository.findByFirebaseUid).toHaveBeenCalledWith(mockFirebaseUid);
      expect(mockCloudinaryService.uploadImage).toHaveBeenCalledWith(
        mockImageBuffer,
        expect.objectContaining({
          public_id: expect.stringContaining('original_'),
          folder: 'swifty-original-images',
        })
      );
      expect(mockImageRepository.create).toHaveBeenCalledWith(expect.any(Image));
      expect(mockRabbitMQService.publishImageUploaded).toHaveBeenCalledWith({
        imageId: mockSavedImage.id,
        userId: mockUser.uid,
        originalImageUrl: mockCloudinaryResult.secure_url,
        style: mockStyle,
      });

      expect(result).toEqual({
        imageId: mockSavedImage.id,
        status: 'processing',
        message: 'Image is being processed',
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

    it('should throw error when cloudinary upload fails', async () => {
      const uploadError = new Error('Cloudinary upload failed');

      mockUserRepository.findByFirebaseUid.mockResolvedValue(mockUser);
      mockCloudinaryService.uploadImage.mockRejectedValue(uploadError);

      await expect(
        useCase.execute(mockFirebaseUid, mockImageBuffer, mockStyle, mockFileSize)
      ).rejects.toThrow(uploadError);

      expect(mockImageRepository.create).not.toHaveBeenCalled();
      expect(mockRabbitMQService.publishImageUploaded).not.toHaveBeenCalled();
    });

    it('should propagate repository errors during image creation', async () => {
      const repositoryError = new Error('Database connection failed');

      const mockCloudinaryResult = {
        public_id: 'original_123456789',
        secure_url: 'https://res.cloudinary.com/test/original-image.jpg',
      };

      mockUserRepository.findByFirebaseUid.mockResolvedValue(mockUser);
      mockCloudinaryService.uploadImage.mockResolvedValue(mockCloudinaryResult);
      mockImageRepository.create.mockRejectedValue(repositoryError);

      await expect(
        useCase.execute(mockFirebaseUid, mockImageBuffer, mockStyle, mockFileSize)
      ).rejects.toThrow(repositoryError);

      expect(mockRabbitMQService.publishImageUploaded).not.toHaveBeenCalled();
    });

    it('should propagate user repository errors', async () => {
      const userRepositoryError = new Error('User database error');

      mockUserRepository.findByFirebaseUid.mockRejectedValue(userRepositoryError);

      await expect(
        useCase.execute(mockFirebaseUid, mockImageBuffer, mockStyle, mockFileSize)
      ).rejects.toThrow(userRepositoryError);

      expect(mockCloudinaryService.uploadImage).not.toHaveBeenCalled();
      expect(mockImageRepository.create).not.toHaveBeenCalled();
    });
  });
});
