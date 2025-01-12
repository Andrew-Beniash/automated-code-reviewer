import { RuleService } from '../../server/services/ruleService';
import { AppDataSource } from '../../server/config/data-source';
import { Rule, RuleCategory, RuleSeverity } from '../../server/entities/Rule.mjs';
import { User, UserRole } from '../../server/entities/User.mjs';
import { ValidationError } from '../../server/utils/errors';

jest.mock('../../server/config/data-source');
jest.mock('../../server/config/logger');

describe('RuleService', () => {
  const mockUser: User = {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    passwordHash: 'hash',
    role: UserRole.USER,
    isActive: true,
  } as User;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createRule', () => {
    const validRuleData = {
      name: 'Test Rule',
      description: 'Test Description',
      category: RuleCategory.SECURITY,
      severity: RuleSeverity.CRITICAL,
      pattern: { test: 'pattern' },
    };

    it('should create a rule successfully', async () => {
      const mockRepository = {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((data) => data),
        save: jest.fn().mockImplementation((data) => data),
      };

      jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRepository as any);

      const result = await RuleService.createRule(validRuleData, mockUser);

      expect(result).toMatchObject({
        ...validRuleData,
        isEnabled: true,
        isCustom: true,
        createdBy: mockUser,
      });
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { name: validRuleData.name },
      });
    });

    it('should throw ValidationError for duplicate rule name', async () => {
      const mockRepository = {
        findOne: jest.fn().mockResolvedValue({ id: '1', name: validRuleData.name }),
      };

      jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRepository as any);

      await expect(RuleService.createRule(validRuleData, mockUser)).rejects.toThrow(
        ValidationError
      );
    });

    it('should throw ValidationError for missing required fields', async () => {
      const invalidData = {
        name: '',
        description: '',
        category: RuleCategory.SECURITY,
        severity: RuleSeverity.CRITICAL,
      };

      await expect(RuleService.createRule(invalidData, mockUser)).rejects.toThrow(ValidationError);
    });
  });

  describe('getRules', () => {
    it('should fetch rules with filters', async () => {
      const mockRules = [
        { id: '1', name: 'Rule 1' },
        { id: '2', name: 'Rule 2' },
      ];

      const mockRepository = {
        find: jest.fn().mockResolvedValue(mockRules),
      };

      jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRepository as any);

      const filters = {
        category: RuleCategory.SECURITY,
        isEnabled: true,
      };

      const result = await RuleService.getRules(filters);

      expect(result).toEqual(mockRules);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: filters,
        relations: ['createdBy'],
        order: { category: 'ASC', severity: 'DESC' },
      });
    });
  });

  describe('getRuleById', () => {
    it('should fetch a rule by id', async () => {
      const mockRule = { id: '1', name: 'Test Rule' };
      const mockRepository = {
        findOne: jest.fn().mockResolvedValue(mockRule),
      };

      jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRepository as any);

      const result = await RuleService.getRuleById('1');

      expect(result).toEqual(mockRule);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
        relations: ['createdBy'],
      });
    });

    it('should throw ValidationError for non-existent rule', async () => {
      const mockRepository = {
        findOne: jest.fn().mockResolvedValue(null),
      };

      jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRepository as any);

      await expect(RuleService.getRuleById('1')).rejects.toThrow(ValidationError);
    });
  });

  describe('updateRule', () => {
    const mockRule = {
      id: '1',
      name: 'Test Rule',
      isCustom: true,
      createdBy: { id: '1' },
    };

    it('should update a rule successfully', async () => {
      const mockRepository = {
        findOne: jest.fn().mockResolvedValue(mockRule),
        save: jest.fn().mockImplementation((data) => data),
      };

      jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRepository as any);

      const updateData = { description: 'Updated Description' };
      const result = await RuleService.updateRule('1', updateData, '1');

      expect(result).toMatchObject({ ...mockRule, ...updateData });
    });

    it('should throw ValidationError when updating rule without permission', async () => {
      const mockRepository = {
        findOne: jest.fn().mockResolvedValue(mockRule),
      };

      jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRepository as any);

      await expect(RuleService.updateRule('1', { name: 'New Name' }, '2')).rejects.toThrow(
        ValidationError
      );
    });

    it('should validate name uniqueness during update', async () => {
      const mockRepository = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(mockRule) // First call for getting the rule
          .mockResolvedValueOnce({ id: '2', name: 'Existing Rule' }), // Second call for name check
      };

      jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRepository as any);

      await expect(RuleService.updateRule('1', { name: 'Existing Rule' }, '1')).rejects.toThrow(
        ValidationError
      );
    });
  });

  describe('toggleRule', () => {
    it('should toggle rule status successfully', async () => {
      const mockRule = { id: '1', name: 'Test Rule', isEnabled: false };
      const mockRepository = {
        findOne: jest.fn().mockResolvedValue(mockRule),
        save: jest.fn().mockImplementation((data) => data),
      };

      jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRepository as any);

      const result = await RuleService.toggleRule('1', true);

      expect(result.isEnabled).toBe(true);
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '1',
          isEnabled: true,
        })
      );
    });

    it('should throw ValidationError for invalid enabled status', async () => {
      await expect(RuleService.toggleRule('1', undefined as any)).rejects.toThrow(ValidationError);
    });
  });

  describe('deleteRule', () => {
    it('should delete a rule successfully', async () => {
      const mockRule = {
        id: '1',
        name: 'Test Rule',
        isCustom: true,
        createdBy: { id: '1' },
      };

      const mockRepository = {
        findOne: jest.fn().mockResolvedValue(mockRule),
        remove: jest.fn().mockResolvedValue(undefined),
      };

      jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRepository as any);

      await RuleService.deleteRule('1', '1');

      expect(mockRepository.remove).toHaveBeenCalledWith(mockRule);
    });

    it('should throw ValidationError when deleting rule without permission', async () => {
      const mockRule = {
        id: '1',
        name: 'Test Rule',
        isCustom: true,
        createdBy: { id: '1' },
      };

      const mockRepository = {
        findOne: jest.fn().mockResolvedValue(mockRule),
      };

      jest.spyOn(AppDataSource, 'getRepository').mockReturnValue(mockRepository as any);

      await expect(RuleService.deleteRule('1', '2')).rejects.toThrow(ValidationError);
    });
  });
});
