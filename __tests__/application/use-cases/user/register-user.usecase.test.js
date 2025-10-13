import { jest } from '@jest/globals';
import { RegisterUserUseCase } from '../../../../src/application/use-cases/user/register-user.usecase.js';
import { ConflictError } from '../../../../src/shared/errors/conflict.error.js';
import { UserMapper } from '../../../../src/application/mappers/user.mapper.js';
import { User } from '../../../../src/domain/entities/user.entity.js';

jest.mock('../../../../src/application/mappers/user.mapper.js', () => {
  return {
    UserMapper: {
      toEntity: jest.fn(),
      toDTO: jest.fn(),
    },
  };
});

const mockToEntity = jest.fn();
const mockToDTO = jest.fn();

UserMapper.toEntity = mockToEntity;
UserMapper.toDTO = mockToDTO;

describe('RegisterUserUseCase', () => {
  let useCase;
  let mockUserRepository;

  const mockCreateUserDto = {
    email: 'test@example.com',
    full_name: 'Test User',
    firebase_uid: 'firebase123',
  };

  const mockUserEntity = new User({
    email: 'test@example.com',
    full_name: 'Test User',
    firebase_uid: 'firebase123',
  });

  const mockUserDto = {
    id: 1,
    email: 'test@example.com',
    full_name: 'Test User',
    firebase_uid: 'firebase123',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUserRepository = {
      findByEmail: jest.fn(),
      create: jest.fn(),
    };

    mockToEntity.mockReturnValue(mockUserEntity);
    mockToDTO.mockReturnValue(mockUserDto);

    useCase = new RegisterUserUseCase(mockUserRepository);
  });

  describe('execute', () => {
    it('should register a new user successfully', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(mockUserEntity);

      const result = await useCase.execute(mockCreateUserDto);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(mockCreateUserDto.email);
      expect(mockToEntity).toHaveBeenCalledWith(mockCreateUserDto);
      expect(mockUserRepository.create).toHaveBeenCalledWith(mockUserEntity);
      expect(mockToDTO).toHaveBeenCalledWith(mockUserEntity);
      expect(result).toEqual(mockUserDto);
    });

    it('should throw ConflictError when email already exists', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUserEntity);

      await expect(useCase.execute(mockCreateUserDto)).rejects.toThrow(ConflictError);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(mockCreateUserDto.email);
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should propagate repository errors', async () => {
      const error = new Error('Database error');
      mockUserRepository.findByEmail.mockRejectedValue(error);

      await expect(useCase.execute(mockCreateUserDto)).rejects.toThrow(error);
    });
  });
});
