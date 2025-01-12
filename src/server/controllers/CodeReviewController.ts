import { Request, Response } from 'express';
import { FindOneOptions, FindOptionsWhere } from 'typeorm';
import { AppDataSource } from '../config/data-source';
import { CodeReview, ReviewStatus } from '../entities/CodeReview.mjs';
import { Repository } from '../entities/Repository.mjs';
import { asyncHandler } from '../middleware/asyncHandler';
import { ValidationError, NotFoundError } from '../utils/errors';
import { loggerWrapper as logger } from '../config/logger';

const codeReviewRepository = AppDataSource.getRepository(CodeReview);
const repositoryRepository = AppDataSource.getRepository(Repository);

class CodeReviewController {
  /**
   * Create a new code review
   * @route POST /api/repositories/:repositoryId/reviews
   */
  static create = asyncHandler(async (req: Request, res: Response) => {
    const { repositoryId } = req.params;
    const { commitId, branch } = req.body;
    const userId = req.user?.id;

    // Validate input
    if (!commitId || !branch) {
      throw new ValidationError('Commit ID and branch are required', {
        commitId: !commitId ? ['Commit ID is required'] : [],
        branch: !branch ? ['Branch is required'] : [],
      });
    }

    // Check if repository exists and user has access
    const repository = await repositoryRepository.findOne({
      where: {
        id: repositoryId,
        owner: { id: userId },
      },
      relations: ['owner'],
    });

    if (!repository) {
      throw new NotFoundError('Repository not found');
    }

    // Create new code review
    const codeReview = new CodeReview();
    codeReview.repository = repository;
    codeReview.commitId = commitId;
    codeReview.branch = branch;
    codeReview.triggeredBy = req.user!;
    codeReview.status = ReviewStatus.PENDING;

    const savedReview = await codeReviewRepository.save(codeReview);
    logger.info(`New code review created for repository: ${repository.name}`);

    // TODO: Trigger async code review process

    res.status(201).json({
      status: 'success',
      data: { review: savedReview },
    });
  });

  /**
   * Get all code reviews for a repository
   * @route GET /api/repositories/:repositoryId/reviews
   */
  static getAll = asyncHandler(async (req: Request, res: Response) => {
    const { repositoryId } = req.params;
    const userId = req.user?.id;

    // Verify repository access
    const repository = await repositoryRepository.findOne({
      where: {
        id: repositoryId,
        owner: { id: userId },
      },
      relations: ['owner'],
    });

    if (!repository) {
      throw new NotFoundError('Repository not found');
    }

    const reviews = await codeReviewRepository.find({
      where: { repository: { id: repositoryId } },
      order: { createdAt: 'DESC' },
      relations: ['repository', 'triggeredBy'],
    });

    res.json({
      status: 'success',
      data: { reviews },
    });
  });

  /**
   * Get a specific code review
   * @route GET /api/repositories/:repositoryId/reviews/:id
   */
  static getOne = asyncHandler(async (req: Request, res: Response) => {
    const { repositoryId, id } = req.params;
    const userId = req.user?.id;

    // Verify repository access
    const repository = await repositoryRepository.findOne({
      where: {
        id: repositoryId,
        owner: { id: userId },
      },
      relations: ['owner'],
    });

    if (!repository) {
      throw new NotFoundError('Repository not found');
    }

    const review = await codeReviewRepository.findOne({
      where: {
        id,
        repository: { id: repositoryId },
      },
      relations: ['findings', 'repository', 'triggeredBy'],
    });

    if (!review) {
      throw new NotFoundError('Code review not found');
    }

    res.json({
      status: 'success',
      data: { review },
    });
  });

  /**
   * Cancel a code review
   * @route POST /api/repositories/:repositoryId/reviews/:id/cancel
   */
  static cancel = asyncHandler(async (req: Request, res: Response) => {
    const { repositoryId, id } = req.params;
    const userId = req.user?.id;

    // Verify repository access
    const repository = await repositoryRepository.findOne({
      where: {
        id: repositoryId,
        owner: { id: userId },
      },
      relations: ['owner'],
    });

    if (!repository) {
      throw new NotFoundError('Repository not found');
    }

    const review = await codeReviewRepository.findOne({
      where: {
        id,
        repository: { id: repositoryId },
      },
    });

    if (!review) {
      throw new NotFoundError('Code review not found');
    }

    if (review.status === ReviewStatus.COMPLETED || review.status === ReviewStatus.FAILED) {
      throw new ValidationError('Cannot cancel a completed or failed review', {
        status: ['Review is already completed or failed'],
      });
    }

    review.status = ReviewStatus.FAILED;
    await codeReviewRepository.save(review);
    logger.info(`Code review cancelled: ${id}`);

    res.json({
      status: 'success',
      message: 'Code review cancelled successfully',
    });
  });

  /**
   * Get review statistics
   * @route GET /api/repositories/:repositoryId/reviews/stats
   */
  static getStats = asyncHandler(async (req: Request, res: Response) => {
    const { repositoryId } = req.params;
    const userId = req.user?.id;

    // Verify repository access
    const repository = await repositoryRepository.findOne({
      where: {
        id: repositoryId,
        owner: { id: userId },
      },
      relations: ['owner'],
    });

    if (!repository) {
      throw new NotFoundError('Repository not found');
    }

    // Calculate statistics
    const stats = await codeReviewRepository
      .createQueryBuilder('review')
      .where('review.repository_id = :repositoryId', { repositoryId })
      .select([
        'COUNT(*) as total',
        `COUNT(CASE WHEN status = '${ReviewStatus.COMPLETED}' THEN 1 END) as completed`,
        `COUNT(CASE WHEN status = '${ReviewStatus.FAILED}' THEN 1 END) as failed`,
        `COUNT(CASE WHEN status = '${ReviewStatus.PENDING}' THEN 1 END) as pending`,
      ])
      .getRawOne();

    res.json({
      status: 'success',
      data: { stats },
    });
  });
}

export { CodeReviewController };
