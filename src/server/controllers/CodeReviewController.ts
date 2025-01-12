import { Request, Response } from 'express';
import { Repository as TypeORMRepository, FindOneOptions, FindManyOptions } from 'typeorm';
import { AppDataSource } from '../config/data-source';
import { Repository } from '../entities/Repository.mjs';
import { User } from '../entities/User.mjs';
import { asyncHandler } from '../middleware/asyncHandler';
import { ValidationError, NotFoundError } from '../utils/errors';

class RepositoryController {
  // Get repository with proper TypeORM find options
  static getOne = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;

    const findOptions: FindOneOptions<Repository> = {
      where: {
        id: id, // First argument: the id we're looking for
        owner: {
          // Second argument: additional conditions
          id: userId,
        },
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

  // Get all repositories with proper find options
  static getAll = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    const findOptions: FindManyOptions<Repository> = {
      where: {
        owner: {
          id: userId,
        },
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

  // Example of delete with proper arguments
  static delete = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;

    const findOptions: FindOneOptions<Repository> = {
      where: {
        id: id,
        owner: {
          id: userId,
        },
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

    res.status(204).send();
  });
}

export { RepositoryController };
