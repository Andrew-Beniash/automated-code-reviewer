import { CodeReviewService } from '../../server/services/codeReviewService';
import { AppDataSource } from '../../server/config/data-source';
import { CodeReview, ReviewStatus } from '../../server/entities/CodeReview.mjs';
import { Repository, VCSProvider } from '../../server/entities/Repository.mjs';
import { User, UserRole } from '../../server/entities/User.mjs';
import { ValidationError } from '../../server/utils/errors';

jest.mock('../../server/config/data-source');
jest.mock('../../server/config/logger');

describe('CodeReviewService', () => {
  const mockUser: User = {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    passwordHash: 'hash',
    role: UserRole.USER,
    isActive: true,
  } as User;

  const mockRepository: Repository = {
    id: '1',
    name: 'Test Repo',
    url: 'https://github.com/test/repo',
    vcsProvider: VCSProvider.GITHUB,
    owner: mockUser,
    isActive: true,
  } as Repository;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createReview', () => {
    const validReviewData = {
      commitId: 'abc123',
      branch: 'main',
      repository: mockRepository,
      metadata: { someData: 'value' },
    };

    it('should create a code review successfully', async () => {
      const mockCodeReviewRepo = {
        create: jest.fn().mockImplementation((data) => data),
        save: jest.fn().mockImplementation((data) => data),
      };

      jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockCodeReviewRepo as any);

      const result = await CodeReviewService.createReview(validReviewData, mockUser);

      expect(result).toMatchObject({
        ...validReviewData,
        triggeredBy: mockUser,
        status: ReviewStatus.PENDING,
      });
      expect(result.startedAt).toBeInstanceOf(Date);
    });

    it('should throw ValidationError for missing required fields', async () => {
      const invalidData = {
        commitId: '',
        branch: '',
        repository: undefined,
      };

      await expect(CodeReviewService.createReview(invalidData as any, mockUser)).rejects.toThrow(
        ValidationError
      );
    });

    it('should handle review creation failure', async () => {
      const mockCodeReviewRepo = {
        create: jest.fn().mockImplementation((data) => data),
        save: jest.fn().mockRejectedValue(new Error('Database error')),
      };

      jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockCodeReviewRepo as any);

      await expect(CodeReviewService.createReview(validReviewData, mockUser)).rejects.toThrow(
        ValidationError
      );
    });
  });

  describe('getReviews', () => {
    it('should fetch reviews for a repository and user', async () => {
      const mockReviews = [
        { id: '1', commitId: 'abc123', status: ReviewStatus.COMPLETED },
        { id: '2', commitId: 'def456', status: ReviewStatus.PENDING },
      ];

      const mockCodeReviewRepo = {
        find: jest.fn().mockResolvedValue(mockReviews),
      };

      jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockCodeReviewRepo as any);

      const result = await CodeReviewService.getReviews(mockRepository.id, mockUser.id);

      expect(result).toEqual(mockReviews);
      expect(mockCodeReviewRepo.find).toHaveBeenCalledWith({
        where: {
          repository: { id: mockRepository.id },
          triggeredBy: { id: mockUser.id },
        },
        relations: ['repository', 'triggeredBy', 'findings'],
        order: { createdAt: 'DESC' },
      });
    });

    it('should throw ValidationError for missing required parameters', async () => {
      await expect(CodeReviewService.getReviews('', '')).rejects.toThrow(ValidationError);
    });
  });

  describe('getReviewById', () => {
    const mockReview = {
      id: '1',
      commitId: 'abc123',
      status: ReviewStatus.PENDING,
      triggeredBy: mockUser,
    };

    it('should fetch a review by id', async () => {
      const mockCodeReviewRepo = {
        findOne: jest.fn().mockResolvedValue(mockReview),
      };

      jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockCodeReviewRepo as any);

      const result = await CodeReviewService.getReviewById('1', mockUser.id);

      expect(result).toEqual(mockReview);
      expect(mockCodeReviewRepo.findOne).toHaveBeenCalledWith({
        where: { id: '1', triggeredBy: { id: mockUser.id } },
        relations: ['repository', 'triggeredBy', 'findings'],
      });
    });

    it('should throw ValidationError for non-existent review', async () => {
      const mockCodeReviewRepo = {
        findOne: jest.fn().mockResolvedValue(null),
      };

      jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockCodeReviewRepo as any);

      await expect(CodeReviewService.getReviewById('1', mockUser.id)).rejects.toThrow(
        ValidationError
      );
    });
  });

  describe('updateReviewStatus', () => {
    const mockReview = {
      id: '1',
      commitId: 'abc123',
      status: ReviewStatus.PENDING,
      metadata: { existingData: 'value' },
    };

    it('should update review status successfully', async () => {
      const mockCodeReviewRepo = {
        findOne: jest.fn().mockResolvedValue(mockReview),
        save: jest.fn().mockImplementation((data) => data),
      };

      jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockCodeReviewRepo as any);

      const result = await CodeReviewService.updateReviewStatus('1', ReviewStatus.COMPLETED, {
        newData: 'value',
      });

      expect(result.status).toBe(ReviewStatus.COMPLETED);
      expect(result.metadata).toEqual({
        existingData: 'value',
        newData: 'value',
      });
      expect(result.completedAt).toBeInstanceOf(Date);
    });

    it('should throw ValidationError for missing parameters', async () => {
      await expect(CodeReviewService.updateReviewStatus('', undefined as any)).rejects.toThrow(
        ValidationError
      );
    });
  });

  describe('getReviewMetrics', () => {
    const mockReviews = [
      {
        id: '1',
        status: ReviewStatus.COMPLETED,
        startedAt: new Date('2025-01-01T10:00:00'),
        completedAt: new Date('2025-01-01T11:00:00'),
      },
      {
        id: '2',
        status: ReviewStatus.FAILED,
        startedAt: new Date('2025-01-01T12:00:00'),
        completedAt: null,
      },
      {
        id: '3',
        status: ReviewStatus.PENDING,
        startedAt: new Date('2025-01-01T13:00:00'),
        completedAt: null,
      },
    ];

    it('should calculate review metrics correctly', async () => {
      const mockCodeReviewRepo = {
        find: jest.fn().mockResolvedValue(mockReviews),
      };

      jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockCodeReviewRepo as any);

      const result = await CodeReviewService.getReviewMetrics(mockRepository.id);

      expect(result).toEqual({
        total: 3,
        completed: 1,
        failed: 1,
        averageTime: 3600000, // 1 hour in milliseconds
      });
    });

    it('should throw ValidationError for missing repository ID', async () => {
      await expect(CodeReviewService.getReviewMetrics('')).rejects.toThrow(ValidationError);
    });

    it('should handle empty review list', async () => {
      const mockCodeReviewRepo = {
        find: jest.fn().mockResolvedValue([]),
      };

      jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockCodeReviewRepo as any);

      const result = await CodeReviewService.getReviewMetrics(mockRepository.id);

      expect(result).toEqual({
        total: 0,
        completed: 0,
        failed: 0,
        averageTime: 0,
      });
    });
  });
});
