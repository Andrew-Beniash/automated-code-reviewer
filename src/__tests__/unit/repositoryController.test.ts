import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../../server/config/data-source';
import { Repository, VCSProvider } from '../../server/entities/Repository.mjs';
import { User } from '../../server/entities/User.mjs';
import { RepositoryController } from '../../server/controllers/RepositoryController';
import { ValidationError, NotFoundError } from '../../server/utils/errors';

// Extend Request type to include user property
interface CustomRequest extends Request {
  user?: {
    id: string;
  };
}

jest.mock('../../server/config/data-source');
jest.mock('../../server/config/logger');

describe('RepositoryController', () => {
  let req: Partial<CustomRequest>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      user: { id: '1' },
      params: {},
      query: {},
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('create', () => {
    const validRepository = {
      name: 'Test Repo',
      url: 'https://github.com/test/repo',
      description: 'Test Description',
    };

    it('should create a new repository successfully', async () => {
      req.body = validRepository;

      const mockUser = { id: '1' };
      const mockRepoRepo = {
        create: jest.fn().mockImplementation((repo) => repo),
        save: jest.fn().mockImplementation((repo) => ({ id: '1', ...repo })),
      };

      jest
        .spyOn(AppDataSource, 'getRepository')
        .mockReturnValueOnce({ findOne: jest.fn().mockResolvedValue(mockUser) } as any)
        .mockReturnValueOnce(mockRepoRepo as any)
        .mockReturnValueOnce(mockRepoRepo as any);

      await RepositoryController.create(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          repository: expect.objectContaining({
            name: validRepository.name,
            url: validRepository.url,
            description: validRepository.description,
            vcsProvider: VCSProvider.GITHUB,
            isActive: true,
            isPrivate: false,
          }),
        },
      });
    });

    it('should throw validation error for missing required fields', async () => {
      req.body = {};

      await expect(
        RepositoryController.create(req as Request, res as Response, next)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw error if user not found', async () => {
      req.body = validRepository;

      jest
        .spyOn(AppDataSource, 'getRepository')
        .mockReturnValueOnce({ findOne: jest.fn().mockResolvedValue(null) } as any);

      await expect(
        RepositoryController.create(req as Request, res as Response, next)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getAll', () => {
    it('should return all repositories for current user', async () => {
      const mockRepositories = [
        { id: '1', name: 'Repo 1' },
        { id: '2', name: 'Repo 2' },
      ];

      const mockRepoRepo = {
        find: jest.fn().mockResolvedValue(mockRepositories),
      };

      jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRepoRepo as any);

      await RepositoryController.getAll(req as Request, res as Response, next);

      expect(mockRepoRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            owner: { id: req.user?.id },
          },
          relations: {
            owner: true,
          },
          order: {
            createdAt: 'DESC',
          },
        })
      );

      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { repositories: mockRepositories },
      });
    });
  });

  describe('getOne', () => {
    it('should return a specific repository', async () => {
      req.params = { id: '1' };
      const mockRepository = {
        id: '1',
        name: 'Test Repo',
        owner: { id: req.user?.id },
      };

      const mockRepoRepo = {
        findOne: jest.fn().mockResolvedValue(mockRepository),
      };

      jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRepoRepo as any);

      await RepositoryController.getOne(req as Request, res as Response, next);

      expect(mockRepoRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: '1',
            owner: { id: req.user?.id },
          },
          relations: {
            owner: true,
          },
        })
      );

      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { repository: mockRepository },
      });
    });

    it('should throw NotFoundError for non-existent repository', async () => {
      req.params = { id: '999' };

      jest
        .spyOn(AppDataSource, 'getRepository')
        .mockReturnValue({ findOne: jest.fn().mockResolvedValue(null) } as any);

      await expect(
        RepositoryController.getOne(req as Request, res as Response, next)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    it('should update repository successfully', async () => {
      req.params = { id: '1' };
      req.body = {
        name: 'Updated Name',
        description: 'Updated Description',
      };

      const existingRepo = {
        id: '1',
        name: 'Original Name',
        description: 'Original Description',
        owner: { id: req.user?.id },
      };

      const mockRepoRepo = {
        findOne: jest.fn().mockResolvedValue(existingRepo),
        merge: jest.fn().mockImplementation((repo, updates) => ({ ...repo, ...updates })),
        save: jest.fn().mockImplementation((repo) => repo),
      };

      jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRepoRepo as any);

      await RepositoryController.update(req as Request, res as Response, next);

      expect(mockRepoRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Name',
          description: 'Updated Description',
        })
      );

      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { repository: expect.any(Object) },
      });
    });

    it('should throw NotFoundError for non-existent repository', async () => {
      req.params = { id: '999' };
      req.body = { name: 'Updated Name' };

      jest
        .spyOn(AppDataSource, 'getRepository')
        .mockReturnValue({ findOne: jest.fn().mockResolvedValue(null) } as any);

      await expect(
        RepositoryController.update(req as Request, res as Response, next)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('should delete repository successfully', async () => {
      req.params = { id: '1' };
      const mockRepository = {
        id: '1',
        name: 'Test Repo',
        owner: { id: req.user?.id },
      };

      const mockRepoRepo = {
        findOne: jest.fn().mockResolvedValue(mockRepository),
        remove: jest.fn().mockResolvedValue(undefined),
      };

      jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRepoRepo as any);

      await RepositoryController.delete(req as Request, res as Response, next);

      expect(mockRepoRepo.remove).toHaveBeenCalledWith(mockRepository);
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it('should throw NotFoundError for non-existent repository', async () => {
      req.params = { id: '999' };

      jest
        .spyOn(AppDataSource, 'getRepository')
        .mockReturnValue({ findOne: jest.fn().mockResolvedValue(null) } as any);

      await expect(
        RepositoryController.delete(req as Request, res as Response, next)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('syncWithGitHub', () => {
    it('should initiate repository sync successfully', async () => {
      req.params = { id: '1' };
      const mockRepository = {
        id: '1',
        name: 'Test Repo',
        owner: { id: req.user?.id },
      };

      jest
        .spyOn(AppDataSource, 'getRepository')
        .mockReturnValue({ findOne: jest.fn().mockResolvedValue(mockRepository) } as any);

      await RepositoryController.syncWithGitHub(req as Request, res as Response, next);

      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Repository synchronization started',
      });
    });

    it('should throw NotFoundError for non-existent repository', async () => {
      req.params = { id: '999' };

      jest
        .spyOn(AppDataSource, 'getRepository')
        .mockReturnValue({ findOne: jest.fn().mockResolvedValue(null) } as any);

      await expect(
        RepositoryController.syncWithGitHub(req as Request, res as Response, next)
      ).rejects.toThrow(NotFoundError);
    });
  });
});
