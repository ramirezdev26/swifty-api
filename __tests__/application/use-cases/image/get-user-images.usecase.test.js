import { jest } from '@jest/globals';
import { GetUserImagesUseCase } from '../../../../src/application/use-cases/image/get-user-images.usecase.js';
import { Image } from '../../../../src/domain/entities/image.entity.js';
import { NotFoundError } from '../../../../src/shared/errors/not-found.error.js';

describe('GetUserImagesUseCase', () => {
  let useCase;
  let mockImageRepository;
  let mockUserRepository;

  const mockUserId = 'user-123';
  const mockFirebaseUid = 'firebase-123';
  const mockUser = {
    uid: mockUserId,
    firebase_uid: mockFirebaseUid,
    full_name: 'Test User',
    email: 'test@example.com',
  };

  const mockImages = [
    new Image({
      id: 'image-1',
      user_id: mockUserId,
      cloudinary_id: 'cloudinary-1',
      size: 1024000,
      style: 'oil-painting',
      status: 'processed',
      processed_url: 'https://cloudinary.com/processed-1.jpg',
      processing_time: 1500,
      processed_at: new Date('2025-01-13T15:30:00Z'),
      created_at: new Date('2025-01-13T15:28:00Z'),
      updated_at: new Date('2025-01-13T15:30:00Z'),
    }),
    new Image({
      id: 'image-2',
      user_id: mockUserId,
      cloudinary_id: 'cloudinary-2',
      size: 2048000,
      style: 'cartoon',
      status: 'processed',
      processed_url: 'https://cloudinary.com/processed-2.jpg',
      processing_time: 2000,
      processed_at: new Date('2025-01-13T14:20:00Z'),
      created_at: new Date('2025-01-13T14:18:00Z'),
      updated_at: new Date('2025-01-13T14:20:00Z'),
    }),
  ];

  beforeEach(() => {
    mockImageRepository = {
      findUserImagesWithPagination: jest.fn(),
    };

    mockUserRepository = {
      findByFirebaseUid: jest.fn(),
    };

    useCase = new GetUserImagesUseCase(mockImageRepository, mockUserRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should return user images successfully with default parameters', async () => {
      const mockRepositoryResponse = {
        images: mockImages,
        totalCount: 2,
      };

      mockUserRepository.findByFirebaseUid.mockResolvedValue(mockUser);
      mockImageRepository.findUserImagesWithPagination.mockResolvedValue(mockRepositoryResponse);

      const result = await useCase.execute(mockFirebaseUid);

      expect(mockUserRepository.findByFirebaseUid).toHaveBeenCalledWith(mockFirebaseUid);
      expect(mockImageRepository.findUserImagesWithPagination).toHaveBeenCalledWith(
        mockUserId,
        1,
        12,
        'created_at',
        'desc',
        null,
        null
      );

      const response = result.toJSON();
      expect(response.images).toHaveLength(2);
      expect(response.images[0]).toEqual({
        id: 'image-1',
        processed_url: 'https://cloudinary.com/processed-1.jpg',
        style: 'oil-painting',
        project_name: null,
        processed_at: new Date('2025-01-13T15:30:00Z'),
      });
      expect(response.pagination).toEqual({
        currentPage: 1,
        totalPages: 1,
        totalItems: 2,
        itemsPerPage: 12,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it('should return user images with custom pagination and sorting', async () => {
      const mockRepositoryResponse = {
        images: [mockImages[0]],
        totalCount: 25,
      };

      mockUserRepository.findByFirebaseUid.mockResolvedValue(mockUser);
      mockImageRepository.findUserImagesWithPagination.mockResolvedValue(mockRepositoryResponse);

      const result = await useCase.execute(mockFirebaseUid, 2, 5, 'processed_at');

      expect(mockImageRepository.findUserImagesWithPagination).toHaveBeenCalledWith(
        mockUserId,
        2,
        5,
        'processed_at',
        'desc',
        null,
        null
      );

      const response = result.toJSON();
      expect(response.pagination).toEqual({
        currentPage: 2,
        totalPages: 5,
        totalItems: 25,
        itemsPerPage: 5,
        hasNextPage: true,
        hasPreviousPage: true,
      });
    });

    it('should handle sortBy newest (maps to processed_at DESC)', async () => {
      const mockRepositoryResponse = {
        images: [mockImages[0]],
        totalCount: 2,
      };

      mockUserRepository.findByFirebaseUid.mockResolvedValue(mockUser);
      mockImageRepository.findUserImagesWithPagination.mockResolvedValue(mockRepositoryResponse);

      await useCase.execute(mockFirebaseUid, 1, 12, 'newest');

      expect(mockImageRepository.findUserImagesWithPagination).toHaveBeenCalledWith(
        mockUserId,
        1,
        12,
        'processed_at',
        'desc',
        null,
        null
      );
    });

    it('should handle sortBy oldest (maps to processed_at ASC)', async () => {
      const mockRepositoryResponse = {
        images: [mockImages[0]],
        totalCount: 2,
      };

      mockUserRepository.findByFirebaseUid.mockResolvedValue(mockUser);
      mockImageRepository.findUserImagesWithPagination.mockResolvedValue(mockRepositoryResponse);

      await useCase.execute(mockFirebaseUid, 1, 12, 'oldest');

      expect(mockImageRepository.findUserImagesWithPagination).toHaveBeenCalledWith(
        mockUserId,
        1,
        12,
        'processed_at',
        'asc',
        null,
        null
      );
    });

    it('should return user images with style filter', async () => {
      const mockRepositoryResponse = {
        images: [mockImages[0]],
        totalCount: 1,
      };

      mockUserRepository.findByFirebaseUid.mockResolvedValue(mockUser);
      mockImageRepository.findUserImagesWithPagination.mockResolvedValue(mockRepositoryResponse);

      const result = await useCase.execute(mockFirebaseUid, 1, 12, 'newest', null, 'oil-painting');

      expect(mockImageRepository.findUserImagesWithPagination).toHaveBeenCalledWith(
        mockUserId,
        1,
        12,
        'processed_at',
        'desc',
        null,
        'oil-painting'
      );

      const response = result.toJSON();
      expect(response.images).toHaveLength(1);
      expect(response.images[0].style).toBe('oil-painting');
    });

    it('should return user images with project filter', async () => {
      const mockRepositoryResponse = {
        images: mockImages,
        totalCount: 2,
      };

      mockUserRepository.findByFirebaseUid.mockResolvedValue(mockUser);
      mockImageRepository.findUserImagesWithPagination.mockResolvedValue(mockRepositoryResponse);

      const projectId = 'project-123';
      await useCase.execute(mockFirebaseUid, 1, 12, 'newest', projectId, null);

      expect(mockImageRepository.findUserImagesWithPagination).toHaveBeenCalledWith(
        mockUserId,
        1,
        12,
        'processed_at',
        'desc',
        projectId,
        null
      );
    });

    it('should handle combined filters (project and style)', async () => {
      const mockRepositoryResponse = {
        images: mockImages,
        totalCount: 2,
      };

      mockUserRepository.findByFirebaseUid.mockResolvedValue(mockUser);
      mockImageRepository.findUserImagesWithPagination.mockResolvedValue(mockRepositoryResponse);

      const projectId = 'project-123';
      const style = 'cartoon';
      await useCase.execute(mockFirebaseUid, 1, 12, 'newest', projectId, style);

      expect(mockImageRepository.findUserImagesWithPagination).toHaveBeenCalledWith(
        mockUserId,
        1,
        12,
        'processed_at',
        'desc',
        projectId,
        style
      );
    });

    it('should return empty list when no images found', async () => {
      const mockRepositoryResponse = {
        images: [],
        totalCount: 0,
      };

      mockUserRepository.findByFirebaseUid.mockResolvedValue(mockUser);
      mockImageRepository.findUserImagesWithPagination.mockResolvedValue(mockRepositoryResponse);

      const result = await useCase.execute(mockFirebaseUid);

      const response = result.toJSON();
      expect(response.images).toHaveLength(0);
      expect(response.pagination).toEqual({
        currentPage: 1,
        totalPages: 0,
        totalItems: 0,
        itemsPerPage: 12,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it('should validate and normalize parameters', async () => {
      const mockRepositoryResponse = {
        images: mockImages,
        totalCount: 2,
      };

      mockUserRepository.findByFirebaseUid.mockResolvedValue(mockUser);
      mockImageRepository.findUserImagesWithPagination.mockResolvedValue(mockRepositoryResponse);

      await useCase.execute(mockFirebaseUid, '2', '5');
      expect(mockImageRepository.findUserImagesWithPagination).toHaveBeenCalledWith(
        mockUserId,
        2,
        5,
        'created_at',
        'desc',
        null,
        null
      );

      await useCase.execute(mockFirebaseUid, -1, 12);
      expect(mockImageRepository.findUserImagesWithPagination).toHaveBeenCalledWith(
        mockUserId,
        1,
        12,
        'created_at',
        'desc',
        null,
        null
      );

      await useCase.execute(mockFirebaseUid, 1, 150);
      expect(mockImageRepository.findUserImagesWithPagination).toHaveBeenCalledWith(
        mockUserId,
        1,
        100,
        'created_at',
        'desc',
        null,
        null
      );
    });

    it('should throw error when firebase_uid is not provided', async () => {
      await expect(useCase.execute(null)).rejects.toThrow('Firebase UID is required');
      await expect(useCase.execute(undefined)).rejects.toThrow('Firebase UID is required');
      await expect(useCase.execute('')).rejects.toThrow('Firebase UID is required');

      expect(mockUserRepository.findByFirebaseUid).not.toHaveBeenCalled();
      expect(mockImageRepository.findUserImagesWithPagination).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when user does not exist', async () => {
      mockUserRepository.findByFirebaseUid.mockResolvedValue(null);

      await expect(useCase.execute(mockFirebaseUid)).rejects.toThrow(NotFoundError);

      expect(mockUserRepository.findByFirebaseUid).toHaveBeenCalledWith(mockFirebaseUid);
      expect(mockImageRepository.findUserImagesWithPagination).not.toHaveBeenCalled();
    });

    it('should handle repository errors gracefully', async () => {
      const repositoryError = new Error('Database connection failed');
      mockUserRepository.findByFirebaseUid.mockResolvedValue(mockUser);
      mockImageRepository.findUserImagesWithPagination.mockRejectedValue(repositoryError);

      await expect(useCase.execute(mockFirebaseUid)).rejects.toThrow(
        'Failed to retrieve user images: Database connection failed'
      );

      expect(mockImageRepository.findUserImagesWithPagination).toHaveBeenCalledWith(
        mockUserId,
        1,
        12,
        'created_at',
        'desc',
        null,
        null
      );
    });

    it('should handle user repository errors gracefully', async () => {
      const userError = new Error('User service unavailable');
      mockUserRepository.findByFirebaseUid.mockRejectedValue(userError);

      await expect(useCase.execute(mockFirebaseUid)).rejects.toThrow(
        'Failed to retrieve user images: User service unavailable'
      );

      expect(mockImageRepository.findUserImagesWithPagination).not.toHaveBeenCalled();
    });
  });
});
