import { Rule, RuleCategory, RuleSeverity } from '../entities/Rule.mjs';
import { User } from '../entities/User.mjs';
import { AppDataSource } from '../config/data-source';
import { loggerWrapper as logger } from '../config/logger';
import { ValidationError } from '../utils/errors';

export class RuleService {
  private static repository = AppDataSource.getRepository(Rule);

  static async createRule(
    data: {
      name: string;
      description: string;
      category: RuleCategory;
      severity: RuleSeverity;
      pattern?: Record<string, any>;
      configuration?: Record<string, any>;
    },
    createdBy?: User
  ): Promise<Rule> {
    try {
      // Validate required fields
      if (!data.name || !data.description || !data.category || !data.severity) {
        throw new ValidationError('Missing required fields', {
          name: !data.name ? ['Rule name is required'] : [],
          description: !data.description ? ['Rule description is required'] : [],
          category: !data.category ? ['Rule category is required'] : [],
          severity: !data.severity ? ['Rule severity is required'] : [],
        });
      }

      const existingRule = await this.repository.findOne({
        where: { name: data.name },
      });

      if (existingRule) {
        throw new ValidationError('Rule with this name already exists', {
          name: ['A rule with this name already exists. Please choose a different name'],
        });
      }

      const rule = this.repository.create({
        ...data,
        createdBy,
        isEnabled: true,
        isCustom: !!createdBy,
      });

      await this.repository.save(rule);
      logger.info(`Rule created: ${rule.name}`);

      return rule;
    } catch (error) {
      logger.error('Failed to create rule:', error);
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError('Failed to create rule', {
        general: ['An unexpected error occurred while creating the rule'],
      });
    }
  }

  static async getRules(options: {
    category?: RuleCategory;
    severity?: RuleSeverity;
    isEnabled?: boolean;
    isCustom?: boolean;
    createdBy?: string;
  }): Promise<Rule[]> {
    try {
      const where: any = {};

      if (options.category) where.category = options.category;
      if (options.severity) where.severity = options.severity;
      if (typeof options.isEnabled === 'boolean') where.isEnabled = options.isEnabled;
      if (typeof options.isCustom === 'boolean') where.isCustom = options.isCustom;
      if (options.createdBy) where.createdBy = { id: options.createdBy };

      return await this.repository.find({
        where,
        relations: ['createdBy'],
        order: { category: 'ASC', severity: 'DESC' },
      });
    } catch (error) {
      logger.error('Failed to fetch rules:', error);
      throw new ValidationError('Failed to fetch rules', {
        general: ['An error occurred while fetching the rules'],
      });
    }
  }

  static async getRuleById(id: string): Promise<Rule> {
    try {
      if (!id) {
        throw new ValidationError('Missing rule ID', {
          id: ['Rule ID is required'],
        });
      }

      const rule = await this.repository.findOne({
        where: { id },
        relations: ['createdBy'],
      });

      if (!rule) {
        throw new ValidationError('Rule not found', {
          rule: ['The requested rule could not be found'],
        });
      }

      return rule;
    } catch (error) {
      logger.error('Failed to fetch rule:', error);
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError('Failed to fetch rule', {
        general: ['An error occurred while fetching the rule'],
      });
    }
  }

  static async updateRule(id: string, data: Partial<Rule>, userId?: string): Promise<Rule> {
    try {
      if (!id) {
        throw new ValidationError('Missing rule ID', {
          id: ['Rule ID is required'],
        });
      }

      const rule = await this.getRuleById(id);

      // Only allow updates to custom rules by their creator
      if (rule.isCustom && rule.createdBy?.id !== userId) {
        throw new ValidationError('Not authorized to update this rule', {
          authorization: ['You do not have permission to update this rule'],
        });
      }

      // Validate name uniqueness if name is being updated
      if (data.name && data.name !== rule.name) {
        const existingRule = await this.repository.findOne({
          where: { name: data.name },
        });
        if (existingRule) {
          throw new ValidationError('Rule name already exists', {
            name: ['A rule with this name already exists. Please choose a different name'],
          });
        }
      }

      Object.assign(rule, data);
      await this.repository.save(rule);

      logger.info(`Rule updated: ${rule.name}`);
      return rule;
    } catch (error) {
      logger.error('Failed to update rule:', error);
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError('Failed to update rule', {
        general: ['An error occurred while updating the rule'],
      });
    }
  }

  static async toggleRule(id: string, enabled: boolean): Promise<Rule> {
    try {
      if (!id) {
        throw new ValidationError('Missing rule ID', {
          id: ['Rule ID is required'],
        });
      }

      if (typeof enabled !== 'boolean') {
        throw new ValidationError('Invalid enabled status', {
          enabled: ['Enabled status must be a boolean value'],
        });
      }

      const rule = await this.getRuleById(id);
      rule.isEnabled = enabled;
      await this.repository.save(rule);

      logger.info(`Rule ${rule.name} ${enabled ? 'enabled' : 'disabled'}`);
      return rule;
    } catch (error) {
      logger.error('Failed to toggle rule:', error);
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError('Failed to toggle rule', {
        general: ['An error occurred while toggling the rule status'],
      });
    }
  }

  static async deleteRule(id: string, userId?: string): Promise<void> {
    try {
      if (!id) {
        throw new ValidationError('Missing rule ID', {
          id: ['Rule ID is required'],
        });
      }

      const rule = await this.getRuleById(id);

      // Only allow deletion of custom rules by their creator
      if (rule.isCustom && rule.createdBy?.id !== userId) {
        throw new ValidationError('Not authorized to delete this rule', {
          authorization: ['You do not have permission to delete this rule'],
        });
      }

      await this.repository.remove(rule);
      logger.info(`Rule deleted: ${rule.name}`);
    } catch (error) {
      logger.error('Failed to delete rule:', error);
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError('Failed to delete rule', {
        general: ['An error occurred while deleting the rule'],
      });
    }
  }
}
