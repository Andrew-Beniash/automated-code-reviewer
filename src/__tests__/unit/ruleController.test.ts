import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../../server/config/data-source';
import { Rule, RuleCategory, RuleSeverity } from '../../server/entities/Rule.mjs';
import { User, UserRole } from '../../server/entities/User.mjs';
import { RuleController } from '../../server/controllers/RuleController';
import { ValidationError, NotFoundError } from '../../server/utils/errors';

// Extend Request type to include user property
interface CustomRequest extends Request {
  user?: {
    id: string;
    role: UserRole;
  };
}

jest.mock('../../server/config/data-source');
jest.mock('../../server/config/logger');

describe('RuleController Logic', () => {
  let req: Partial<CustomRequest>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      user: { id: '1', role: UserRole.ADMIN },
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

  describe('Rule Creation Logic', () => {
    it('should enforce unique rule names', async () => {
      const existingRule = {
        name: 'Existing Rule',
        description: 'Test Description',
        category: RuleCategory.SECURITY,
        severity: RuleSeverity.CRITICAL, // Using actual enum value
        pattern: '^test$',
      };

      req.body = existingRule;

      const mockRuleRepo = {
        findOne: jest.fn().mockResolvedValue(existingRule),
        create: jest.fn(),
        save: jest.fn(),
      };

      jest
        .spyOn(AppDataSource, 'getRepository')
        .mockReturnValueOnce({ findOne: jest.fn().mockResolvedValue({ id: '1' }) } as any)
        .mockReturnValue(mockRuleRepo as any);

      await expect(RuleController.create(req as Request, res as Response, next)).rejects.toThrow(
        ValidationError
      );
    });

    it('should set isCustom flag for user-created rules', async () => {
      const newRule = {
        name: 'Custom Rule',
        description: 'Test Description',
        category: RuleCategory.SECURITY,
        severity: RuleSeverity.CRITICAL, // Using actual enum value
        pattern: '^test$',
      };

      req.body = newRule;

      const mockUser = { id: '1', role: UserRole.USER };
      const mockRuleRepo = {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((rule) => rule),
        save: jest.fn().mockImplementation((rule) => rule),
      };

      jest
        .spyOn(AppDataSource, 'getRepository')
        .mockReturnValueOnce({ findOne: jest.fn().mockResolvedValue(mockUser) } as any)
        .mockReturnValue(mockRuleRepo as any);

      await RuleController.create(req as Request, res as Response, next);

      expect(mockRuleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          isCustom: true,
          isEnabled: true,
        })
      );
    });
  });

  describe('Rule Access Control Logic', () => {
    it('should restrict non-admin users to only custom rules', async () => {
      req.user = { id: '1', role: UserRole.USER };

      const mockRuleRepo = {
        find: jest.fn().mockResolvedValue([]),
      };

      jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRuleRepo as any);

      await RuleController.getAll(req as Request, res as Response, next);

      expect(mockRuleRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isCustom: true,
          }),
        })
      );
    });

    it('should allow admins to view all rules', async () => {
      req.user = { id: '1', role: UserRole.ADMIN };

      const mockRuleRepo = {
        find: jest.fn().mockResolvedValue([]),
      };

      jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRuleRepo as any);

      await RuleController.getAll(req as Request, res as Response, next);

      expect(mockRuleRepo.find).toHaveBeenCalledWith(
        expect.not.objectContaining({
          where: expect.objectContaining({
            isCustom: true,
          }),
        })
      );
    });
  });

  describe('Rule Update Logic', () => {
    it('should preserve unmodified fields during partial updates', async () => {
      const existingRule = {
        id: '1',
        name: 'Original Name',
        description: 'Original Description',
        category: RuleCategory.SECURITY,
        severity: RuleSeverity.CRITICAL, // Using actual enum value
        pattern: '^test$',
        isCustom: true,
        isEnabled: true,
      };

      req.params = { id: '1' };
      req.body = { description: 'Updated Description' };

      const mockRuleRepo = {
        findOne: jest.fn().mockResolvedValue(existingRule),
        merge: jest.fn().mockImplementation((rule, updates) => ({ ...rule, ...updates })),
        save: jest.fn().mockImplementation((rule) => rule),
      };

      jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRuleRepo as any);

      await RuleController.update(req as Request, res as Response, next);

      expect(mockRuleRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Original Name',
          description: 'Updated Description',
          category: RuleCategory.SECURITY,
          severity: RuleSeverity.CRITICAL,
          pattern: '^test$',
        })
      );
    });
  });

  describe('Rule System Rules Protection', () => {
    it('should prevent non-admin users from modifying system rules', async () => {
      req.user = { id: '1', role: UserRole.USER };
      req.params = { id: '1' };
      req.body = { name: 'Updated Name' };

      const systemRule = {
        id: '1',
        isCustom: false,
        name: 'System Rule',
      };

      const mockRuleRepo = {
        findOne: jest.fn().mockResolvedValue(systemRule),
        merge: jest.fn(),
        save: jest.fn(),
      };

      jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRuleRepo as any);

      await expect(RuleController.update(req as Request, res as Response, next)).rejects.toThrow(
        ValidationError
      );
    });
  });

  describe('Bulk Update Logic', () => {
    it('should respect user permissions during bulk updates', async () => {
      req.user = { id: '1', role: UserRole.USER };
      req.body = {
        ruleIds: ['1', '2'],
        isEnabled: false,
      };

      const mockRuleRepo = {
        find: jest.fn().mockImplementation(() => []),
        save: jest.fn(),
      };

      jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRuleRepo as any);

      await RuleController.bulkUpdate(req as Request, res as Response, next);

      expect(mockRuleRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isCustom: true,
          }),
        })
      );
    });

    it('should update all matched rules atomically', async () => {
      const rules = [
        { id: '1', name: 'Rule 1', isEnabled: true },
        { id: '2', name: 'Rule 2', isEnabled: true },
      ];

      req.body = {
        ruleIds: ['1', '2'],
        isEnabled: false,
      };

      const mockRuleRepo = {
        find: jest.fn().mockResolvedValue(rules),
        save: jest.fn().mockImplementation((rules) => rules),
      };

      jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRuleRepo as any);

      await RuleController.bulkUpdate(req as Request, res as Response, next);

      expect(mockRuleRepo.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: '1', isEnabled: false }),
          expect.objectContaining({ id: '2', isEnabled: false }),
        ])
      );
    });
  });
});
