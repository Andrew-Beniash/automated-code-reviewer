import { Request, Response } from 'express';
import { FindOneOptions, FindManyOptions, Like, ILike, Raw } from 'typeorm';
import { AppDataSource } from '../config/data-source';
import { Rule, RuleCategory, RuleSeverity } from '../entities/Rule.mjs';
import { User, UserRole } from '../entities/User.mjs';
import { asyncHandler } from '../middleware/asyncHandler';
import { ValidationError, NotFoundError } from '../utils/errors';
import { loggerWrapper as logger } from '../config/logger';

class RuleController {
  static create = asyncHandler(async (req: Request, res: Response) => {
    const { name, description, category, severity, pattern, configuration } = req.body;
    const userId = req.user?.id;

    // Validate required fields
    const validationErrors: Record<string, string[]> = {};
    if (!name) validationErrors.name = ['Name is required'];
    if (!description) validationErrors.description = ['Description is required'];
    if (!category) validationErrors.category = ['Category is required'];
    if (!severity) validationErrors.severity = ['Severity is required'];
    if (!pattern) validationErrors.pattern = ['Pattern is required'];

    if (Object.keys(validationErrors).length > 0) {
      throw new ValidationError('Missing required fields', validationErrors);
    }

    // Find user
    const userOptions: FindOneOptions<User> = {
      where: { id: userId },
    };
    const user = await AppDataSource.getRepository(User).findOne(userOptions);

    if (!user) {
      throw new ValidationError('User not found', { user: ['User not found'] });
    }

    // Check for existing rule with same name
    const existingRuleOptions: FindOneOptions<Rule> = {
      where: { name },
    };
    const existingRule = await AppDataSource.getRepository(Rule).findOne(existingRuleOptions);

    if (existingRule) {
      throw new ValidationError('Rule with this name already exists', {
        name: ['Name must be unique'],
      });
    }

    // Create rule
    const rule = AppDataSource.getRepository(Rule).create({
      name,
      description,
      category: category as RuleCategory,
      severity: severity as RuleSeverity,
      pattern,
      configuration: configuration || {},
      isCustom: true,
      createdBy: user,
      isEnabled: true,
    });

    const savedRule = await AppDataSource.getRepository(Rule).save(rule);
    logger.info(`New custom rule created: ${savedRule.name}`);

    res.status(201).json({
      status: 'success',
      data: { rule: savedRule },
    });
  });

  static getAll = asyncHandler(async (req: Request, res: Response) => {
    const { role } = req.user!;
    const { category, severity, isEnabled, isCustom, search } = req.query;
    const isAdmin = role === UserRole.ADMIN;

    const whereClause: any = {};

    if (!isAdmin) {
      whereClause.isCustom = true;
    }

    if (category) {
      whereClause.category = category;
    }

    if (severity) {
      whereClause.severity = severity;
    }

    if (isEnabled !== undefined) {
      whereClause.isEnabled = isEnabled === 'true';
    }

    if (isCustom !== undefined) {
      whereClause.isCustom = isCustom === 'true';
    }

    if (search && typeof search === 'string') {
      whereClause.name = ILike(`%${search}%`);
    }

    const findOptions: FindManyOptions<Rule> = {
      where: whereClause,
      relations: {
        createdBy: true,
      },
      order: {
        createdAt: 'DESC',
      },
    };

    const rules = await AppDataSource.getRepository(Rule).find(findOptions);

    res.json({
      status: 'success',
      data: { rules },
    });
  });

  static getOne = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { role } = req.user!;
    const isAdmin = role === UserRole.ADMIN;

    const findOptions: FindOneOptions<Rule> = {
      where: { id },
      relations: {
        createdBy: true,
      },
    };

    const rule = await AppDataSource.getRepository(Rule).findOne(findOptions);

    if (!rule) {
      throw new NotFoundError('Rule not found'); // Fixed: removed second argument
    }

    // Non-admin users can only view custom rules or enabled system rules
    if (!isAdmin && !rule.isCustom && !rule.isEnabled) {
      throw new ValidationError('Access denied', {
        access: ['You do not have permission to view this rule'],
      });
    }

    res.json({
      status: 'success',
      data: { rule },
    });
  });

  static update = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { role } = req.user!;
    const { name, description, category, severity, pattern, configuration, isEnabled } = req.body;
    const isAdmin = role === UserRole.ADMIN;

    const findOptions: FindOneOptions<Rule> = {
      where: { id },
      relations: {
        createdBy: true,
      },
    };

    const rule = await AppDataSource.getRepository(Rule).findOne(findOptions);

    if (!rule) {
      throw new NotFoundError('Rule not found');
    }

    // Only admin can modify system rules
    if (!rule.isCustom && !isAdmin) {
      throw new ValidationError('Cannot modify system rules', {
        permission: ['Only administrators can modify system rules'],
      });
    }

    // Check name uniqueness if name is being updated
    if (name && name !== rule.name) {
      const existingRuleOptions: FindOneOptions<Rule> = {
        where: { name },
      };
      const existingRule = await AppDataSource.getRepository(Rule).findOne(existingRuleOptions);

      if (existingRule) {
        throw new ValidationError('Rule with this name already exists', {
          name: ['Name must be unique'],
        });
      }
    }

    // Update fields
    AppDataSource.getRepository(Rule).merge(rule, {
      ...(name && { name }),
      ...(description && { description }),
      ...(category && { category }),
      ...(severity && { severity }),
      ...(pattern && { pattern }),
      ...(configuration && { configuration }),
      ...(isEnabled !== undefined && { isEnabled }),
    });

    const updatedRule = await AppDataSource.getRepository(Rule).save(rule);
    logger.info(`Rule updated: ${updatedRule.name}`);

    res.json({
      status: 'success',
      data: { rule: updatedRule },
    });
  });

  static delete = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { role } = req.user!;
    const isAdmin = role === UserRole.ADMIN;

    const findOptions: FindOneOptions<Rule> = {
      where: { id },
      relations: {
        createdBy: true,
      },
    };

    const rule = await AppDataSource.getRepository(Rule).findOne(findOptions);

    if (!rule) {
      throw new NotFoundError('Rule not found');
    }

    // Only admin can delete system rules
    if (!rule.isCustom && !isAdmin) {
      throw new ValidationError('Cannot delete system rules', {
        permission: ['Only administrators can delete system rules'],
      });
    }

    await AppDataSource.getRepository(Rule).remove(rule);
    logger.info(`Rule deleted: ${rule.name}`);

    res.status(204).send();
  });

  static bulkUpdate = asyncHandler(async (req: Request, res: Response) => {
    const { ruleIds, isEnabled } = req.body;
    const { role } = req.user!;
    const isAdmin = role === UserRole.ADMIN;

    if (!Array.isArray(ruleIds) || isEnabled === undefined) {
      throw new ValidationError('Invalid request body', {
        ruleIds: !Array.isArray(ruleIds) ? ['Rule IDs must be an array'] : [],
        isEnabled: isEnabled === undefined ? ['isEnabled is required'] : [],
      });
    }

    const findOptions: FindManyOptions<Rule> = {
      where: {
        id: Raw((alias) => `${alias} IN (:...ruleIds)`, { ruleIds }),
        ...(isAdmin ? {} : { isCustom: true }),
      },
      relations: {
        createdBy: true,
      },
    };

    const rules = await AppDataSource.getRepository(Rule).find(findOptions);

    if (rules.length === 0) {
      throw new NotFoundError('No valid rules found');
    }

    for (const rule of rules) {
      rule.isEnabled = isEnabled;
    }

    await AppDataSource.getRepository(Rule).save(rules);
    logger.info(`Bulk updated ${rules.length} rules`);

    res.json({
      status: 'success',
      message: `Successfully updated ${rules.length} rules`,
      data: { updatedCount: rules.length },
    });
  });
}

export { RuleController };
