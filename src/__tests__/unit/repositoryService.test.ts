import { RepositoryService } from '../../server/services/repositoryService';
import { AppDataSource } from '../../server/config/data-source';
import { Repository, VCSProvider } from '../../server/entities/Repository.mjs';
import { User, UserRole } from '../../server/entities/User.mjs';
import { ValidationError } from '../../server/utils/errors';

jest.mock('../../server/config/data-source');
jest.mock('../../server/config/logger');

describe('RepositoryService', () => {
  const mockUser: User = {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    passwordHash: 'hash',
    role: UserRole.USER,
    isActive: true,
  } as User;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createRepository', () => {
    const validRepoData = {
      name: 'Test Repo',
      url: 'https://github.com/test/repo',
      vcsProvider: VCSProvider.GITHUB,
      description: 'Test Description',
      isPrivate: false,
    };

    it('should create a repository successfully', async () => {
      const mockRepository = {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((data) => data),
        save: jest.fn().mockImplementation((data) => data),
      };

      jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRepository as any);

      const result = await RepositoryService.createRepository(validRepoData, mockUser);

      expect(result).toMatchObject({
        ...validRepoData,
        owner: mockUser,
        defaultBranch: 'main',
        isActive: true,
      });
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { url: validRepoData.url, owner: { id: mockUser.id } },
      });
    });

    it('should throw ValidationError for duplicate repository URL', async () => {
      const mockRepository = {
        findOne: jest.fn().mockResolvedValue({ id: '1', url: validRepoData.url }),
      };

      jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRepository as any);

      await expect(RepositoryService.createRepository(validRepoData, mockUser)).rejects.toThrow(
        ValidationError
      );
    });

    it('should handle repository creation failure', async () => {
      const mockRepository = {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((data) => data),
        save: jest.fn().mockRejectedValue(new Error('Database error')),
      };

      jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRepository as any);

      await expect(RepositoryService.createRepository(validRepoData, mockUser)).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('getRepositories', () => {
    it('should fetch repositories for a user', async () => {
      const mockRepos = [
        { id: '1', name: 'Repo 1', owner: mockUser },
        { id: '2', name: 'Repo 2', owner: mockUser },
      ];

      const mockRepository = {
        find: jest.fn().mockResolvedValue(mockRepos),
      };

      jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRepository as any);

      const result = await RepositoryService.getRepositories(mockUser.id);

      expect(result).toEqual(mockRepos);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { owner: { id: mockUser.id }, isActive: true },
        relations: ['owner'],
      });
    });
  });

  describe('getRepositoryById', () => {
    const mockRepo = {
      id: '1',
      name: 'Test Repo',
      owner: mockUser,
      isActive: true,
    };

    it('should fetch a repository by id', async () => {
      const mockRepository = {
        findOne: jest.fn().mockResolvedValue(mockRepo),
      };

      jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRepository as any);

      const result = await RepositoryService.getRepositoryById('1', mockUser.id);

      expect(result).toEqual(mockRepo);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1', owner: { id: mockUser.id }, isActive: true },
        relations: ['owner'],
      });
    });

    it('should throw ValidationError for non-existent repository', async () => {
      const mockRepository = {
        findOne: jest.fn().mockResolvedValue(null),
      };

      jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRepository as any);

      await expect(RepositoryService.getRepositoryById('1', mockUser.id)).rejects.toThrow(
        ValidationError
      );
    });
  });

  describe('updateRepository', () => {
    const mockRepo = {
      id: '1',
      name: 'Test Repo',
      owner: mockUser,
      isActive: true,
    };

    it('should update a repository successfully', async () => {
      const mockRepository = {
        findOne: jest.fn().mockResolvedValue(mockRepo),
        save: jest.fn().mockImplementation((data) => data),
      };

      jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRepository as any);

      const updateData = { description: 'Updated Description' };
      const result = await RepositoryService.updateRepository('1', mockUser.id, updateData);

      expect(result).toMatchObject({ ...mockRepo, ...updateData });
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw ValidationError when updating non-existent repository', async () => {
      const mockRepository = {
        findOne: jest.fn().mockResolvedValue(null),
      };

      jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRepository as any);

      await expect(
        RepositoryService.updateRepository('1', mockUser.id, { name: 'New Name' })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('deleteRepository', () => {
    const mockRepo = {
      id: '1',
      name: 'Test Repo',
      owner: mockUser,
      isActive: true,
    };

    it('should soft delete a repository successfully', async () => {
      const mockRepository = {
        findOne: jest.fn().mockResolvedValue(mockRepo),
        save: jest.fn().mockImplementation((data) => data),
      };

      jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRepository as any);

      await RepositoryService.deleteRepository('1', mockUser.id);

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '1',
          isActive: false,
        })
      );
    });

    it('should throw ValidationError when deleting non-existent repository', async () => {
      const mockRepository = {
        findOne: jest.fn().mockResolvedValue(null),
      };

      jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRepository as any);

      await expect(RepositoryService.deleteRepository('1', mockUser.id)).rejects.toThrow(
        ValidationError
      );
    });

    it('should throw ValidationError when deleting repository without permission', async () => {
      const mockRepository = {
        findOne: jest.fn().mockResolvedValue({ ...mockRepo, owner: { id: '2' } }),
      };

      jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRepository as any);

      await expect(RepositoryService.deleteRepository('1', mockUser.id)).rejects.toThrow(
        ValidationError
      );
    });
  });
});
