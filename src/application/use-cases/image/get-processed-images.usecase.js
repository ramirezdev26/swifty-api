import { ImageMapper } from '../../mappers/image.mapper.js';

export class GetProcessedImagesUseCase {
  constructor(imageRepository, userRepository) {
    this.imageRepository = imageRepository;
    this.userRepository = userRepository;
  }

  async execute(page = 1, limit = 12) {
    const normalizedPage = Math.max(1, parseInt(page) || 1);
    const normalizedLimit = Math.max(1, Math.min(100, parseInt(limit) || 12));

    try {
      const { images, totalCount } = await this.imageRepository.findByUserIdWithPagination(
        normalizedPage,
        normalizedLimit,
        'processed'
      );
      const processedImages = await Promise.all(
        images.map(async (image) => {
          const dto = ImageMapper.toResponseDTO(image);
          const user = await this.userRepository.findById(image.user_id);
          return {
            id: dto.imageId,
            author: user.full_name,
            style: dto.style,
            processedUrl: dto.processedUrl,
            processedAt: dto.processedAt,
          };
        })
      );

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
