import { jest } from '@jest/globals';
import { UpdateImageVisibilityUseCase } from '../../../../src/application/use-cases/image/update-image-visibility.usecase.js';
import { NotFoundError } from '../../../../src/shared/errors/not-found.error.js';
import { AppError } from '../../../../src/shared/errors/app.error.js';

describe('UpdateImageVisibilityUseCase', () => {
  let useCase;
  let mockImageRepository;
  let mockUserRepository;

  const mockFirebaseUid = 'firebase-123';
  const mockUser = { uid: 'user-123' };
  const mockImageId = 'image-1';

  beforeEach(() => {
    mockImageRepository = {
      findById: jest.fn(),
      update: jest.fn(),
    };

    mockUserRepository = {
      findByFirebaseUid: jest.fn(),
    };

    useCase = new UpdateImageVisibilityUseCase(mockImageRepository, mockUserRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should update visibility successfully when user owns the image', async () => {
    const mockImage = { id: mockImageId, user_id: mockUser.uid, visibility: 'private' };
    const updated = { id: mockImageId, visibility: 'public' };

    mockUserRepository.findByFirebaseUid.mockResolvedValue(mockUser);
    mockImageRepository.findById.mockResolvedValue(mockImage);
    mockImageRepository.update.mockResolvedValue(updated);

    const result = await useCase.execute(mockFirebaseUid, mockImageId, 'public');

    expect(mockUserRepository.findByFirebaseUid).toHaveBeenCalledWith(mockFirebaseUid);
    expect(mockImageRepository.findById).toHaveBeenCalledWith(mockImageId);
    expect(mockImageRepository.update).toHaveBeenCalledWith(mockImageId, { visibility: 'public' });
    expect(result).toEqual({ id: mockImageId, visibility: 'public' });
  });

  it('should throw NotFoundError when user is not found', async () => {
    mockUserRepository.findByFirebaseUid.mockResolvedValue(null);

    await expect(useCase.execute(mockFirebaseUid, mockImageId, 'public')).rejects.toThrow(
      NotFoundError
    );

    expect(mockImageRepository.findById).not.toHaveBeenCalled();
    expect(mockImageRepository.update).not.toHaveBeenCalled();
  });

  it('should throw NotFoundError when image is not found', async () => {
    mockUserRepository.findByFirebaseUid.mockResolvedValue(mockUser);
    mockImageRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(mockFirebaseUid, mockImageId, 'private')).rejects.toThrow(
      NotFoundError
    );

    expect(mockImageRepository.update).not.toHaveBeenCalled();
  });

  it('should throw AppError(403) when user does not own the image', async () => {
    const mockImage = { id: mockImageId, user_id: 'other-user', visibility: 'public' };

    mockUserRepository.findByFirebaseUid.mockResolvedValue(mockUser);
    mockImageRepository.findById.mockResolvedValue(mockImage);

    try {
      await useCase.execute(mockFirebaseUid, mockImageId, 'private');
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Forbidden: You do not own this image');
      expect(mockImageRepository.update).not.toHaveBeenCalled();
    }
  });

  it('should wrap unknown errors from repository update', async () => {
    const mockImage = { id: mockImageId, user_id: mockUser.uid, visibility: 'public' };

    mockUserRepository.findByFirebaseUid.mockResolvedValue(mockUser);
    mockImageRepository.findById.mockResolvedValue(mockImage);
    mockImageRepository.update.mockRejectedValue(new Error('DB failure'));

    await expect(useCase.execute(mockFirebaseUid, mockImageId, 'private')).rejects.toThrow(
      'Failed to update image visibility: DB failure'
    );
  });
});
