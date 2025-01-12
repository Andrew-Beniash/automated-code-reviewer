import { Repository, VCSProvider } from '../entities/Repository.mjs';
import { User } from '../entities/User.mjs';
import { AppDataSource } from '../config/data-source';
import { loggerWrapper as logger } from '../config/logger';
import { ValidationError } from '../utils/errors';

export class RepositoryService {
  private static repository = AppDataSource.getRepository(Repository);

  static async createRepository(
    data: {
      name: string;
      url: string;
      vcsProvider: VCSProvider;
      description?: string;
      isPrivate?: boolean;
    },
    owner: User
  ): Promise<Repository> {
    try {
      const existingRepo = await this.repository.findOne({
        where: { url: data.url, owner: { id: owner.id } },
      });

      if (existingRepo) {
        throw new ValidationError('Repository already exists for this user', {
          url: ['Repository URL is already in use by this user'],
        });
      }

      const repository = this.repository.create({
        ...data,
        owner,
        defaultBranch: 'main',
        isActive: true,
      });

      await this.repository.save(repository);
      logger.info(`Repository created: ${repository.name} by user ${owner.id}`);

      return repository;
    } catch (error) {
      logger.error('Failed to create repository:', error);
      throw error;
    }
  }

  static async getRepositories(userId: string): Promise<Repository[]> {
    return this.repository.find({
      where: { owner: { id: userId }, isActive: true },
      relations: ['owner'],
    });
  }

  static async getRepositoryById(id: string, userId: string): Promise<Repository> {
    const repository = await this.repository.findOne({
      where: { id, owner: { id: userId }, isActive: true },
      relations: ['owner'],
    });

    if (!repository) {
      throw new ValidationError('Repository not found', {
        repository: ['Repository not found or access denied'],
      });
    }

    return repository;
  }

  static async updateRepository(
    id: string,
    userId: string,
    data: Partial<Repository>
  ): Promise<Repository> {
    const repository = await this.getRepositoryById(id, userId);

    Object.assign(repository, data);
    await this.repository.save(repository);

    logger.info(`Repository updated: ${repository.name}`);
    return repository;
  }

  static async deleteRepository(id: string, userId: string): Promise<void> {
    const repository = await this.getRepositoryById(id, userId);

    // Soft delete by marking as inactive
    repository.isActive = false;
    await this.repository.save(repository);

    logger.info(`Repository deleted: ${repository.name}`);
  }
}
