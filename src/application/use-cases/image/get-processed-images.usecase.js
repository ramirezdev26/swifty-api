import { ImageMapper } from '../../mappers/image.mapper.js';
import { NotFoundError } from '../../../shared/errors/not-found.error.js';

export class GetProcessedImagesUseCase {
  constructor(imageRepository, userRepository) {
    this.imageRepository = imageRepository;
    this.userRepository = userRepository;
  }

  async execute(firebase_uid, page = 1, limit = 12) {
    if (!firebase_uid || firebase_uid.trim() === '') {
      throw new Error('Firebase UID is required');
    }

    const normalizedPage = Math.max(1, parseInt(page) || 1);
    const normalizedLimit = Math.max(1, Math.min(100, parseInt(limit) || 12));

    try {
      const user = await this.userRepository.findByFirebaseUid(firebase_uid);
      if (!user) {
        throw new NotFoundError('User');
      }

      const { images, totalCount } = await this.imageRepository.findByUserIdWithPagination(
        user.uid,
        normalizedPage,
        normalizedLimit,
        'processed'
      );

      const authorName = user.full_name;

      const processedImages = images.map((image) => {
        const dto = ImageMapper.toResponseDTO(image);
        return {
          id: dto.imageId,
          author: authorName,
          style: dto.style,
          processedUrl: dto.processedUrl,
          processedAt: dto.processedAt,
        };
      });

      const totalPages = Math.ceil(totalCount / normalizedLimit);
      const pagination = {
        currentPage: normalizedPage,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: normalizedLimit,
        hasNextPage: normalizedPage < totalPages,
        hasPreviousPage: normalizedPage > 1,
      };

      return {
        message: 'data successfully retrieved',
        data: processedImages,
        pagination,
      };
    } catch (error) {
      throw new Error(`Failed to retrieve processed images: ${error.message}`);
    }
  }
}
