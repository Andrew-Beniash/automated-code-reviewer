import { Request, Response } from 'express';
import { FindOneOptions, FindManyOptions } from 'typeorm';
import { AppDataSource } from '../config/data-source';
import { Repository, VCSProvider } from '../entities/Repository.mjs';
import { User } from '../entities/User.mjs';
import { asyncHandler } from '../middleware/asyncHandler';
import { ValidationError, NotFoundError } from '../utils/errors';
import { loggerWrapper as logger } from '../config/logger';

class RepositoryController {
  static create = asyncHandler(async (req: Request, res: Response) => {
    const { name, url, description } = req.body;
    const userId = req.user?.id;

    // Validate input
    const validationErrors: Record<string, string[]> = {};
    if (!name) validationErrors.name = ['Name is required'];
    if (!url) validationErrors.url = ['URL is required'];

    if (Object.keys(validationErrors).length > 0) {
      throw new ValidationError('Validation failed', validationErrors);
    }

    // Find the user
    const userOptions: FindOneOptions<User> = {
      where: { id: userId },
    };
    const user = await AppDataSource.getRepository(User).findOne(userOptions);

    if (!user) {
      throw new ValidationError('User not found', { user: ['User not found'] });
    }

    // Create repository
    const repository = AppDataSource.getRepository(Repository).create({
      name,
      url,
      description,
      owner: user,
      vcsProvider: VCSProvider.GITHUB,
      isActive: true,
      isPrivate: false,
    });

    const savedRepository = await AppDataSource.getRepository(Repository).save(repository);
    logger.info(`New repository created: ${savedRepository.name}`);

    res.status(201).json({
      status: 'success',
      data: { repository: savedRepository },
    });
  });

  /**
   * Get all repositories for the current user
   * @route GET /api/repositories
   */
  static getAll = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    const findOptions: FindManyOptions<Repository> = {
      where: {
        owner: { id: userId },
      },
      relations: {
        owner: true,
      },
      order: {
        createdAt: 'DESC',
      },
    };

    const repositories = await AppDataSource.getRepository(Repository).find(findOptions);

    res.json({
      status: 'success',
      data: { repositories },
    });
  });

  /**
   * Get a specific repository
   * @route GET /api/repositories/:id
   */
  static getOne = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;

    const findOptions: FindOneOptions<Repository> = {
      where: {
        id: id,
        owner: { id: userId },
      },
      relations: {
        owner: true,
      },
    };

    const repository = await AppDataSource.getRepository(Repository).findOne(findOptions);

    if (!repository) {
      throw new NotFoundError('Repository not found');
    }

    res.json({
      status: 'success',
      data: { repository },
    });
  });

  /**
   * Update a repository
   * @route PUT /api/repositories/:id
   */
  static update = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const { name, url, description, isActive } = req.body;

    const findOptions: FindOneOptions<Repository> = {
      where: {
        id: id,
        owner: { id: userId },
      },
      relations: {
        owner: true,
      },
    };

    const repository = await AppDataSource.getRepository(Repository).findOne(findOptions);

    if (!repository) {
      throw new NotFoundError('Repository not found');
    }

    // Update fields
    AppDataSource.getRepository(Repository).merge(repository, {
      ...(name && { name }),
      ...(url && { url }),
      ...(description !== undefined && { description }),
      ...(isActive !== undefined && { isActive }),
    });

    const updatedRepository = await AppDataSource.getRepository(Repository).save(repository);

    logger.info(`Repository updated: ${updatedRepository.name}`);

    res.json({
      status: 'success',
      data: { repository: updatedRepository },
    });
  });

  /**
   * Delete a repository
   * @route DELETE /api/repositories/:id
   */
  static delete = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;

    const findOptions: FindOneOptions<Repository> = {
      where: {
        id: id,
        owner: { id: userId },
      },
      relations: {
        owner: true,
      },
    };

    const repository = await AppDataSource.getRepository(Repository).findOne(findOptions);

    if (!repository) {
      throw new NotFoundError('Repository not found');
    }

    await AppDataSource.getRepository(Repository).remove(repository);
    logger.info(`Repository deleted: ${repository.name}`);

    res.status(204).send();
  });

  /**
   * Sync repository with GitHub
   * @route POST /api/repositories/:id/sync
   */
  static syncWithGitHub = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;

    const findOptions: FindOneOptions<Repository> = {
      where: {
        id: id,
        owner: { id: userId },
      },
      relations: {
        owner: true,
      },
    };

    const repository = await AppDataSource.getRepository(Repository).findOne(findOptions);

    if (!repository) {
      throw new NotFoundError('Repository not found');
    }

    // TODO: Implement GitHub synchronization logic
    logger.info(`Repository sync initiated: ${repository.name}`);

    res.json({
      status: 'success',
      message: 'Repository synchronization started',
    });
  });
}

export { RepositoryController };
