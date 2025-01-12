import { CodeReview, ReviewStatus } from '../entities/CodeReview.mjs';
import { Repository } from '../entities/Repository.mjs';
import { User } from '../entities/User.mjs';
import { AppDataSource } from '../config/data-source';
import { loggerWrapper as logger } from '../config/logger';
import { ValidationError } from '../utils/errors';

export class CodeReviewService {
  private static repository = AppDataSource.getRepository(CodeReview);

  static async createReview(
    data: {
      commitId: string;
      branch: string;
      repository: Repository;
      metadata?: Record<string, any>;
    },
    triggeredBy: User
  ): Promise<CodeReview> {
    try {
      // Validate required fields
      if (!data.commitId || !data.branch || !data.repository) {
        throw new ValidationError('Missing required fields', {
          commitId: !data.commitId ? ['Commit ID is required'] : [],
          branch: !data.branch ? ['Branch name is required'] : [],
          repository: !data.repository ? ['Repository is required'] : [],
        });
      }

      const review = this.repository.create({
        ...data,
        triggeredBy,
        status: ReviewStatus.PENDING,
        startedAt: new Date(),
      });

      await this.repository.save(review);
      logger.info(`Code review created for commit ${data.commitId}`);

      return review;
    } catch (error) {
      logger.error('Failed to create code review:', error);
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError('Failed to create code review', {
        general: ['An unexpected error occurred while creating the review'],
      });
    }
  }

  static async getReviews(repositoryId: string, userId: string): Promise<CodeReview[]> {
    try {
      if (!repositoryId || !userId) {
        throw new ValidationError('Missing required parameters', {
          repositoryId: !repositoryId ? ['Repository ID is required'] : [],
          userId: !userId ? ['User ID is required'] : [],
        });
      }

      return this.repository.find({
        where: {
          repository: { id: repositoryId },
          triggeredBy: { id: userId },
        },
        relations: ['repository', 'triggeredBy', 'findings'],
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      logger.error('Failed to fetch reviews:', error);
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError('Failed to fetch reviews', {
        general: ['An error occurred while fetching reviews'],
      });
    }
  }

  static async getReviewById(id: string, userId: string): Promise<CodeReview> {
    try {
      if (!id || !userId) {
        throw new ValidationError('Missing required parameters', {
          id: !id ? ['Review ID is required'] : [],
          userId: !userId ? ['User ID is required'] : [],
        });
      }

      const review = await this.repository.findOne({
        where: {
          id,
          triggeredBy: { id: userId },
        },
        relations: ['repository', 'triggeredBy', 'findings'],
      });

      if (!review) {
        throw new ValidationError('Code review not found', {
          review: ['The requested code review was not found or access is denied'],
        });
      }

      return review;
    } catch (error) {
      logger.error('Failed to fetch review:', error);
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError('Failed to fetch review', {
        general: ['An error occurred while fetching the review'],
      });
    }
  }

  static async updateReviewStatus(
    id: string,
    status: ReviewStatus,
    metadata?: Record<string, any>
  ): Promise<CodeReview> {
    try {
      if (!id || !status) {
        throw new ValidationError('Missing required parameters', {
          id: !id ? ['Review ID is required'] : [],
          status: !status ? ['Status is required'] : [],
        });
      }

      const review = await this.repository.findOne({ where: { id } });

      if (!review) {
        throw new ValidationError('Review not found', {
          review: ['The requested review could not be found'],
        });
      }

      review.status = status;
      if (metadata) {
        review.metadata = { ...review.metadata, ...metadata };
      }

      if (status === ReviewStatus.COMPLETED) {
        review.completedAt = new Date();
      }

      await this.repository.save(review);
      logger.info(`Code review ${id} status updated to ${status}`);

      return review;
    } catch (error) {
      logger.error('Failed to update review status:', error);
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError('Failed to update review status', {
        general: ['An error occurred while updating the review status'],
      });
    }
  }

  static async getReviewMetrics(repositoryId: string): Promise<{
    total: number;
    completed: number;
    failed: number;
    averageTime: number;
  }> {
    try {
      if (!repositoryId) {
        throw new ValidationError('Missing repository ID', {
          repositoryId: ['Repository ID is required'],
        });
      }

      const reviews = await this.repository.find({
        where: { repository: { id: repositoryId } },
      });

      const completed = reviews.filter((r) => r.status === ReviewStatus.COMPLETED);
      const failed = reviews.filter((r) => r.status === ReviewStatus.FAILED);

      const averageTime =
        completed.reduce((acc, review) => {
          if (review.completedAt && review.startedAt) {
            return acc + (review.completedAt.getTime() - review.startedAt.getTime());
          }
          return acc;
        }, 0) / (completed.length || 1);

      return {
        total: reviews.length,
        completed: completed.length,
        failed: failed.length,
        averageTime,
      };
    } catch (error) {
      logger.error('Failed to get review metrics:', error);
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError('Failed to get review metrics', {
        general: ['An error occurred while calculating review metrics'],
      });
    }
  }
}
