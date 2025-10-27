import { jest } from '@jest/globals';
import { GetProcessedImagesUseCase } from '../../../../src/application/use-cases/image/get-processed-images.usecase.js';
import { Image } from '../../../../src/domain/entities/image.entity.js';

describe('GetProcessedImagesUseCase', () => {
  let useCase;
  let mockImageRepository;
  let mockUserRepository;

  const mockUserId = 'user-123';
  const mockFirebaseUid = 'firebase-123';
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
      findByUserIdWithPagination: jest.fn(),
    };

    mockUserRepository = {
      findByFirebaseUid: jest.fn(),
    };

    useCase = new GetProcessedImagesUseCase(mockImageRepository, mockUserRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should return paginated processed images successfully with default parameters', async () => {
      const mockRepositoryResponse = {
        images: mockImages,
        totalCount: 34,
      };

      mockImageRepository.findByUserIdWithPagination.mockResolvedValue(mockRepositoryResponse);
      mockUserRepository.findByFirebaseUid.mockResolvedValue({
        uid: mockUserId,
        full_name: 'Juancho',
      });

      const result = await useCase.execute(mockFirebaseUid);

      expect(mockImageRepository.findByUserIdWithPagination).toHaveBeenCalledWith(
        mockUserId,
        1,
        12,
        'processed'
      );

      expect(result.message).toBe('data successfully retrieved');
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({
        id: 'image-1',
        author: 'Juancho',
        style: 'oil-painting',
        processedUrl: 'https://cloudinary.com/processed-1.jpg',
        processedAt: new Date('2025-01-13T15:30:00Z'),
      });
      expect(result.pagination).toEqual({
        currentPage: 1,
        totalPages: 3,
        totalItems: 34,
        itemsPerPage: 12,
        hasNextPage: true,
        hasPreviousPage: false,
      });
    });

    it('should return paginated processed images with custom page and limit', async () => {
      const mockRepositoryResponse = {
        images: [mockImages[0]],
        totalCount: 34,
      };

      mockImageRepository.findByUserIdWithPagination.mockResolvedValue(mockRepositoryResponse);
      mockUserRepository.findByFirebaseUid.mockResolvedValue({
        uid: mockUserId,
        full_name: 'Juancho',
      });

      const result = await useCase.execute(mockFirebaseUid, 2, 5);

      expect(mockImageRepository.findByUserIdWithPagination).toHaveBeenCalledWith(
        mockUserId,
        2,
        5,
        'processed'
      );

      expect(result.pagination).toEqual({
        currentPage: 2,
        totalPages: 7,
        totalItems: 34,
        itemsPerPage: 5,
        hasNextPage: true,
        hasPreviousPage: true,
      });
    });

    it('should return empty list when no processed images found', async () => {
      const mockRepositoryResponse = {
        images: [],
        totalCount: 0,
      };

      mockImageRepository.findByUserIdWithPagination.mockResolvedValue(mockRepositoryResponse);
      mockUserRepository.findByFirebaseUid.mockResolvedValue({
        uid: mockUserId,
        full_name: 'Juancho',
      });

      const result = await useCase.execute(mockFirebaseUid);

      expect(mockImageRepository.findByUserIdWithPagination).toHaveBeenCalledWith(
        mockUserId,
        1,
        12,
        'processed'
      );

      expect(result.data).toHaveLength(0);
      expect(result.pagination).toEqual({
        currentPage: 1,
        totalPages: 0,
        totalItems: 0,
        itemsPerPage: 12,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it('should handle last page correctly', async () => {
      const mockRepositoryResponse = {
        images: [mockImages[0]],
        totalCount: 25,
      };

      mockImageRepository.findByUserIdWithPagination.mockResolvedValue(mockRepositoryResponse);
      mockUserRepository.findByFirebaseUid.mockResolvedValue({
        uid: mockUserId,
        full_name: 'Juancho',
      });

      const result = await useCase.execute(mockFirebaseUid, 3, 12);

      expect(result.pagination).toEqual({
        currentPage: 3,
        totalPages: 3,
        totalItems: 25,
        itemsPerPage: 12,
        hasNextPage: false,
        hasPreviousPage: true,
      });
    });

    it('should validate and normalize page parameter', async () => {
      const mockRepositoryResponse = {
        images: mockImages,
        totalCount: 34,
      };

      mockImageRepository.findByUserIdWithPagination.mockResolvedValue(mockRepositoryResponse);
      mockUserRepository.findByFirebaseUid.mockResolvedValue({
        uid: mockUserId,
        full_name: 'Juancho',
      });

      await useCase.execute(mockFirebaseUid, '2', 12);
      expect(mockImageRepository.findByUserIdWithPagination).toHaveBeenCalledWith(
        mockUserId,
        2,
        12,
        'processed'
      );

      await useCase.execute(mockFirebaseUid, -1, 12);
      expect(mockImageRepository.findByUserIdWithPagination).toHaveBeenCalledWith(
        mockUserId,
        1,
        12,
        'processed'
      );

      await useCase.execute(mockFirebaseUid, 0, 12);
      expect(mockImageRepository.findByUserIdWithPagination).toHaveBeenCalledWith(
        mockUserId,
        1,
        12,
        'processed'
      );
    });

    it('should validate and normalize limit parameter', async () => {
      const mockRepositoryResponse = {
        images: mockImages,
        totalCount: 34,
      };

      mockImageRepository.findByUserIdWithPagination.mockResolvedValue(mockRepositoryResponse);
      mockUserRepository.findByFirebaseUid.mockResolvedValue({
        uid: mockUserId,
        full_name: 'Juancho',
      });

      await useCase.execute(mockFirebaseUid, 1, '5');
      expect(mockImageRepository.findByUserIdWithPagination).toHaveBeenCalledWith(
        mockUserId,
        1,
        5,
        'processed'
      );

      await useCase.execute(mockFirebaseUid, 1, 150);
      expect(mockImageRepository.findByUserIdWithPagination).toHaveBeenCalledWith(
        mockUserId,
        1,
        100,
        'processed'
      );

      await useCase.execute(mockFirebaseUid, 1, -5);
      expect(mockImageRepository.findByUserIdWithPagination).toHaveBeenCalledWith(
        mockUserId,
        1,
        1,
        'processed'
      );
    });

    it('should throw error when firebase_uid is not provided', async () => {
      await expect(useCase.execute(null)).rejects.toThrow('Firebase UID is required');
      await expect(useCase.execute(undefined)).rejects.toThrow('Firebase UID is required');
      await expect(useCase.execute('')).rejects.toThrow('Firebase UID is required');

      expect(mockUserRepository.findByFirebaseUid).not.toHaveBeenCalled();
      expect(mockImageRepository.findByUserIdWithPagination).not.toHaveBeenCalled();
    });

    it('should handle repository errors gracefully', async () => {
      const repositoryError = new Error('Database connection failed');
      mockImageRepository.findByUserIdWithPagination.mockRejectedValue(repositoryError);
      mockUserRepository.findByFirebaseUid.mockResolvedValue({
        uid: mockUserId,
        full_name: 'Juancho',
      });

      await expect(useCase.execute(mockFirebaseUid)).rejects.toThrow(
        'Failed to retrieve processed images: Database connection failed'
      );

      expect(mockImageRepository.findByUserIdWithPagination).toHaveBeenCalledWith(
        mockUserId,
        1,
        12,
        'processed'
      );
    });

    it('should include author full_name in response items', async () => {
      const mockRepositoryResponse = {
        images: mockImages,
        totalCount: 2,
      };

      mockImageRepository.findByUserIdWithPagination.mockResolvedValue(mockRepositoryResponse);
      mockUserRepository.findByFirebaseUid.mockResolvedValue({
        uid: mockUserId,
        full_name: 'Juancho',
      });

      const result = await useCase.execute(mockFirebaseUid);

      expect(result.data[0].author).toBe('Juancho');
      expect(result.data[1].author).toBe('Juancho');
    });
  });
});
