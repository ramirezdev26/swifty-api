import { UserImageResponseDTO, UserImagesResponseDTO } from '../../dtos/user-images.dto.js';
import { NotFoundError } from '../../../shared/errors/not-found.error.js';

export class GetUserImagesUseCase {
  constructor(imageRepository, userRepository) {
    this.imageRepository = imageRepository;
    this.userRepository = userRepository;
  }

  async execute(
    firebase_uid,
    page = 1,
    limit = 12,
    sortBy = 'created_at',
    projectId = null,
    style = null
  ) {
    try {
      if (!firebase_uid || firebase_uid.trim() === '') {
        throw new Error('Firebase UID is required');
      }

      const normalizedPage = Math.max(1, parseInt(page) || 1);
      const normalizedLimit = Math.min(100, Math.max(1, parseInt(limit) || 12));
      const sortByStr = typeof sortBy === 'string' ? sortBy.toLowerCase() : 'created_at';
      let normalizedSortBy;
      let normalizedOrder;

      if (['newest', 'oldest'].includes(sortByStr)) {
        normalizedSortBy = 'processed_at';
        normalizedOrder = sortByStr === 'newest' ? 'desc' : 'asc';
      } else {
        normalizedSortBy = ['created_at', 'processed_at', 'style'].includes(sortBy)
          ? sortBy
          : 'created_at';
        normalizedOrder = 'desc';
      }

      const user = await this.userRepository.findByFirebaseUid(firebase_uid);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      const { images, totalCount } = await this.imageRepository.findUserImagesWithPagination(
        user.uid,
        normalizedPage,
        normalizedLimit,
        normalizedSortBy,
        normalizedOrder,
        projectId,
        style
      );

      const imageDTOs = images.map(
        (image) =>
          new UserImageResponseDTO({
            id: image.id,
            processed_url: image.processed_url,
            style: image.style,
            project_name: null, // project_name - will be null until we implement projects
            processed_at: image.processed_at,
          })
      );

      const totalPages = Math.ceil(totalCount / normalizedLimit);
      const hasNextPage = normalizedPage < totalPages;
      const hasPreviousPage = normalizedPage > 1;

      return new UserImagesResponseDTO({
        images: imageDTOs,
        pagination: {
          currentPage: normalizedPage,
          totalPages,
          totalItems: totalCount,
          itemsPerPage: normalizedLimit,
          hasNextPage,
          hasPreviousPage,
        },
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new Error(`Failed to retrieve user images: ${error.message}`);
    }
  }
}
