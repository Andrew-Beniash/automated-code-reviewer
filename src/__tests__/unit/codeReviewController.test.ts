import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../../server/config/data-source';
import { CodeReview, ReviewStatus } from '../../server/entities/CodeReview.mjs';
import { Repository } from '../../server/entities/Repository.mjs';
import { User } from '../../server/entities/User.mjs';
import { CodeReviewController } from '../../server/controllers/CodeReviewController';
import { ValidationError, NotFoundError } from '../../server/utils/errors';

// Extend Request type to include user property
interface CustomRequest extends Omit<Request, 'params'> {
  user?: {
    id: string;
  };
  params: {
    repositoryId: string;
    id?: string;
  };
}

jest.mock('../../server/config/data-source');
jest.mock('../../server/config/logger');

describe('CodeReviewController', () => {
  let req: Partial<CustomRequest>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      user: { id: '1' },
      params: { repositoryId: '123', id: '1' },
      query: {},
      body: {},
    } as CustomRequest;
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('create', () => {
    const validReviewData = {
      commitId: 'abc123',
      branch: 'main',
    };

    it('should create a new code review successfully', async () => {
      req.body = validReviewData;
      const mockRepository = {
        id: '123',
        name: 'Test Repo',
        owner: { id: '1' },
      };

      const mockCodeReview = {
        id: '1',
        ...validReviewData,
        repository: mockRepository,
        status: ReviewStatus.PENDING,
      };

      const mockRepositoryRepo = {
        findOne: jest.fn().mockResolvedValue(mockRepository),
      };

      const mockCodeReviewRepo = {
        create: jest.fn().mockImplementation(() => mockCodeReview),
        save: jest.fn().mockResolvedValue(mockCodeReview),
      };

      jest
        .spyOn(AppDataSource, 'getRepository')
        .mockReturnValueOnce(mockRepositoryRepo as any)
        .mockReturnValueOnce(mockCodeReviewRepo as any);

      await CodeReviewController.create(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { review: mockCodeReview },
      });
    });

    it('should throw validation error for missing required fields', async () => {
      req.body = {};

      await expect(
        CodeReviewController.create(req as Request, res as Response, next)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError if repository not found', async () => {
      req.body = validReviewData;

      jest
        .spyOn(AppDataSource, 'getRepository')
        .mockReturnValueOnce({ findOne: jest.fn().mockResolvedValue(null) } as any);

      await expect(
        CodeReviewController.create(req as Request, res as Response, next)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getAll', () => {
    it('should return all code reviews for a repository', async () => {
      const mockRepository = {
        id: '123',
        owner: { id: '1' },
      };

      const mockReviews = [
        { id: '1', status: ReviewStatus.PENDING },
        { id: '2', status: ReviewStatus.COMPLETED },
      ];

      const mockRepositoryRepo = {
        findOne: jest.fn().mockResolvedValue(mockRepository),
      };

      const mockCodeReviewRepo = {
        find: jest.fn().mockResolvedValue(mockReviews),
      };

      jest
        .spyOn(AppDataSource, 'getRepository')
        .mockReturnValueOnce(mockRepositoryRepo as any)
        .mockReturnValueOnce(mockCodeReviewRepo as any);

      await CodeReviewController.getAll(req as Request, res as Response, next);

      const params = req.params as { repositoryId: string };
      expect(mockCodeReviewRepo.find).toHaveBeenCalledWith({
        where: { repository: { id: params.repositoryId } },
        order: { createdAt: 'DESC' },
        relations: ['repository', 'triggeredBy'],
      });

      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { reviews: mockReviews },
      });
    });

    it('should throw NotFoundError if repository not found', async () => {
      jest
        .spyOn(AppDataSource, 'getRepository')
        .mockReturnValueOnce({ findOne: jest.fn().mockResolvedValue(null) } as any);

      await expect(
        CodeReviewController.getAll(req as Request, res as Response, next)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getOne', () => {
    beforeEach(() => {
      req.params = { repositoryId: '123', id: '1' };
    });

    it('should return a specific code review', async () => {
      const mockRepository = {
        id: '123',
        owner: { id: '1' },
      };

      const mockReview = {
        id: '1',
        status: ReviewStatus.PENDING,
        repository: mockRepository,
      };

      const mockRepositoryRepo = {
        findOne: jest.fn().mockResolvedValue(mockRepository),
      };

      const mockCodeReviewRepo = {
        findOne: jest.fn().mockResolvedValue(mockReview),
      };

      jest
        .spyOn(AppDataSource, 'getRepository')
        .mockReturnValueOnce(mockRepositoryRepo as any)
        .mockReturnValueOnce(mockCodeReviewRepo as any);

      await CodeReviewController.getOne(req as Request, res as Response, next);

      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { review: mockReview },
      });
    });

    it('should throw NotFoundError if review not found', async () => {
      const mockRepository = {
        id: '123',
        owner: { id: '1' },
      };

      jest
        .spyOn(AppDataSource, 'getRepository')
        .mockReturnValueOnce({ findOne: jest.fn().mockResolvedValue(mockRepository) } as any)
        .mockReturnValueOnce({ findOne: jest.fn().mockResolvedValue(null) } as any);

      await expect(
        CodeReviewController.getOne(req as Request, res as Response, next)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('cancel', () => {
    beforeEach(() => {
      req.params = { repositoryId: '123', id: '1' };
    });

    it('should cancel a pending review successfully', async () => {
      const mockRepository = {
        id: '123',
        owner: { id: '1' },
      };

      const mockReview = {
        id: '1',
        status: ReviewStatus.PENDING,
        repository: mockRepository,
      };

      const mockRepositoryRepo = {
        findOne: jest.fn().mockResolvedValue(mockRepository),
      };

      const mockCodeReviewRepo = {
        findOne: jest.fn().mockResolvedValue(mockReview),
        save: jest.fn().mockImplementation((review) => review),
      };

      jest
        .spyOn(AppDataSource, 'getRepository')
        .mockReturnValueOnce(mockRepositoryRepo as any)
        .mockReturnValueOnce(mockCodeReviewRepo as any);

      await CodeReviewController.cancel(req as Request, res as Response, next);

      expect(mockCodeReviewRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ReviewStatus.FAILED,
        })
      );

      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Code review cancelled successfully',
      });
    });

    it('should throw ValidationError when trying to cancel completed review', async () => {
      const mockRepository = {
        id: '123',
        owner: { id: '1' },
      };

      const mockReview = {
        id: '1',
        status: ReviewStatus.COMPLETED,
        repository: mockRepository,
      };

      jest
        .spyOn(AppDataSource, 'getRepository')
        .mockReturnValueOnce({ findOne: jest.fn().mockResolvedValue(mockRepository) } as any)
        .mockReturnValueOnce({ findOne: jest.fn().mockResolvedValue(mockReview) } as any);

      await expect(
        CodeReviewController.cancel(req as Request, res as Response, next)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getStats', () => {
    it('should return review statistics', async () => {
      const mockRepository = {
        id: '123',
        owner: { id: '1' },
      };

      const mockStats = {
        total: '5',
        completed: '2',
        failed: '1',
        pending: '2',
      };

      const mockRepositoryRepo = {
        findOne: jest.fn().mockResolvedValue(mockRepository),
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(mockStats),
      };

      const mockCodeReviewRepo = {
        createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      };

      jest
        .spyOn(AppDataSource, 'getRepository')
        .mockReturnValueOnce(mockRepositoryRepo as any)
        .mockReturnValueOnce(mockCodeReviewRepo as any);

      await CodeReviewController.getStats(req as Request, res as Response, next);

      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { stats: mockStats },
      });
    });

    it('should throw NotFoundError if repository not found', async () => {
      jest
        .spyOn(AppDataSource, 'getRepository')
        .mockReturnValueOnce({ findOne: jest.fn().mockResolvedValue(null) } as any);

      await expect(
        CodeReviewController.getStats(req as Request, res as Response, next)
      ).rejects.toThrow(NotFoundError);
    });
  });
});
