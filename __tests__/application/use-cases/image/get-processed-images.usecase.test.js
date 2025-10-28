import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GetProcessedImagesUseCase } from '../../../../src/application/use-cases/image/get-processed-images.usecase.js';

describe('GetProcessedImagesUseCase', () => {
  let getProcessedImagesUseCase;
  let mockImageRepository;
  let mockUserRepository;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Create mock repositories
    mockImageRepository = {
      findByUserIdWithPagination: jest.fn(),
    };

    mockUserRepository = {
      findById: jest.fn(),
    };

    // Create use case instance with mocked dependencies
    getProcessedImagesUseCase = new GetProcessedImagesUseCase(
      mockImageRepository,
      mockUserRepository
    );
  });

  describe('execute', () => {
    it('should return processed images successfully with default pagination', async () => {
      // Arrange
      const mockImages = [
        {
          id: 'image-1',
          user_id: 'user-1',
          size: 1024,
          style: 'oil-painting',
          status: 'processed',
          processed_url: 'https://cloudinary.com/processed1.jpg',
          processed_at: new Date('2024-01-01T10:00:00Z'),
        },
        {
          id: 'image-2',
          user_id: 'user-2',
          size: 2048,
          style: 'cartoon',
          status: 'processed',
          processed_url: 'https://cloudinary.com/processed2.jpg',
          processed_at: new Date('2024-01-02T11:00:00Z'),
        },
      ];

      const mockUsers = [
        { uid: 'user-1', full_name: 'John Doe' },
        { uid: 'user-2', full_name: 'Jane Smith' },
      ];

      const mockResponse = {
        images: mockImages,
        totalCount: 2,
      };

      // Mock repository responses
      mockImageRepository.findByUserIdWithPagination.mockResolvedValue(mockResponse);
      mockUserRepository.findById
        .mockResolvedValueOnce(mockUsers[0])
        .mockResolvedValueOnce(mockUsers[1]);

      // Act
      const result = await getProcessedImagesUseCase.execute();

      // Assert
      expect(mockImageRepository.findByUserIdWithPagination).toHaveBeenCalledWith(
        1, // default page
        12, // default limit
        'processed'
      );
      expect(mockUserRepository.findById).toHaveBeenCalledTimes(2);
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user-1');
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user-2');

      expect(result.message).toBe('data successfully retrieved');
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({
        id: 'image-1',
        author: 'John Doe',
        style: 'oil-painting',
        processedUrl: 'https://cloudinary.com/processed1.jpg',
        processedAt: new Date('2024-01-01T10:00:00Z'),
      });
      expect(result.data[1]).toEqual({
        id: 'image-2',
        author: 'Jane Smith',
        style: 'cartoon',
        processedUrl: 'https://cloudinary.com/processed2.jpg',
        processedAt: new Date('2024-01-02T11:00:00Z'),
      });
      expect(result.pagination).toEqual({
        currentPage: 1,
        totalPages: 1,
        totalItems: 2,
        itemsPerPage: 12,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it('should return processed images with custom pagination parameters', async () => {
      // Arrange
      const mockImages = [
        {
          id: 'image-1',
          user_id: 'user-1',
          size: 1024,
          style: 'pixel-art',
          status: 'processed',
          processed_url: 'https://cloudinary.com/processed1.jpg',
          processed_at: new Date('2024-01-01T10:00:00Z'),
        },
      ];

      const mockResponse = {
        images: mockImages,
        totalCount: 25, // Total items to test pagination
      };

      const mockUser = { uid: 'user-1', full_name: 'John Doe' };

      // Mock repository responses
      mockImageRepository.findByUserIdWithPagination.mockResolvedValue(mockResponse);
      mockUserRepository.findById.mockResolvedValue(mockUser);

      // Act
      const result = await getProcessedImagesUseCase.execute(2, 5);

      // Assert
      expect(mockImageRepository.findByUserIdWithPagination).toHaveBeenCalledWith(
        2, // page 2
        5, // limit 5
        'processed'
      );

      expect(result.pagination).toEqual({
        currentPage: 2,
        totalPages: 5, // 25 items / 5 per page = 5 pages
        totalItems: 25,
        itemsPerPage: 5,
        hasNextPage: true,
        hasPreviousPage: true,
      });
    });

    it('should normalize invalid pagination parameters', async () => {
      // Arrange
      const mockResponse = {
        images: [],
        totalCount: 0,
      };

      mockImageRepository.findByUserIdWithPagination.mockResolvedValue(mockResponse);

      // Act
      await getProcessedImagesUseCase.execute(-5, 150); // Invalid values

      // Assert
      expect(mockImageRepository.findByUserIdWithPagination).toHaveBeenCalledWith(
        1, // normalized to 1 (minimum)
        100, // normalized to 100 (maximum)
        'processed'
      );
    });

    it('should handle string pagination parameters', async () => {
      // Arrange
      const mockResponse = {
        images: [],
        totalCount: 0,
      };

      mockImageRepository.findByUserIdWithPagination.mockResolvedValue(mockResponse);

      // Act
      await getProcessedImagesUseCase.execute('3', '8');

      // Assert
      expect(mockImageRepository.findByUserIdWithPagination).toHaveBeenCalledWith(
        3, // parsed from string
        8, // parsed from string
        'processed'
      );
    });

    it('should return empty result when no images found', async () => {
      // Arrange
      const mockResponse = {
        images: [],
        totalCount: 0,
      };

      mockImageRepository.findByUserIdWithPagination.mockResolvedValue(mockResponse);

      // Act
      const result = await getProcessedImagesUseCase.execute();

      // Assert
      expect(result).toEqual({
        message: 'data successfully retrieved',
        data: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: 12,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });
    });

    it('should throw error when image repository fails', async () => {
      // Arrange
      const errorMessage = 'Database connection failed';
      mockImageRepository.findByUserIdWithPagination.mockRejectedValue(new Error(errorMessage));

      // Act & Assert
      await expect(getProcessedImagesUseCase.execute()).rejects.toThrow(
        `Failed to retrieve processed images: ${errorMessage}`
      );
    });

    it('should throw error when user repository fails', async () => {
      // Arrange
      const mockImages = [
        {
          id: 'image-1',
          user_id: 'user-1',
          size: 1024,
          style: 'oil-painting',
          status: 'processed',
          processed_url: 'https://cloudinary.com/processed1.jpg',
          processed_at: new Date('2024-01-01T10:00:00Z'),
        },
      ];

      const mockResponse = {
        images: mockImages,
        totalCount: 1,
      };

      mockImageRepository.findByUserIdWithPagination.mockResolvedValue(mockResponse);
      mockUserRepository.findById.mockRejectedValue(new Error('User not found'));

      // Act & Assert
      await expect(getProcessedImagesUseCase.execute()).rejects.toThrow(
        'Failed to retrieve processed images: User not found'
      );
    });

    it('should handle null/undefined pagination parameters', async () => {
      // Arrange
      const mockResponse = {
        images: [],
        totalCount: 0,
      };

      mockImageRepository.findByUserIdWithPagination.mockResolvedValue(mockResponse);

      // Act
      await getProcessedImagesUseCase.execute(null, undefined);

      // Assert
      expect(mockImageRepository.findByUserIdWithPagination).toHaveBeenCalledWith(
        1, // default page
        12, // default limit
        'processed'
      );
    });

    it('should calculate pagination correctly for multiple pages', async () => {
      // Arrange
      const mockResponse = {
        images: [],
        totalCount: 47, // 47 items with 12 per page = 4 pages (last page has 11 items)
      };

      mockImageRepository.findByUserIdWithPagination.mockResolvedValue(mockResponse);

      // Act
      const result = await getProcessedImagesUseCase.execute(3, 12);

      // Assert
      expect(result.pagination).toEqual({
        currentPage: 3,
        totalPages: 4, // Math.ceil(47/12) = 4
        totalItems: 47,
        itemsPerPage: 12,
        hasNextPage: true, // page 3 of 4 has next page
        hasPreviousPage: true, // page 3 has previous pages
      });
    });
  });
});
