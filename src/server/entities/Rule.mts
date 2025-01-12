import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { IsNotEmpty, IsEnum } from 'class-validator';
import { User } from './User.mjs';

export enum RuleCategory {
  CODE_STYLE = 'code_style',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  MAINTAINABILITY = 'maintainability',
  BUG_RISK = 'bug_risk',
}

export enum RuleSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

@Entity('rules')
export class Rule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 255 })
  @IsNotEmpty()
  name!: string;

  @Column('text')
  @IsNotEmpty()
  description!: string;

  @Column({
    type: 'enum',
    enum: RuleCategory,
  })
  @IsEnum(RuleCategory)
  category!: RuleCategory;

  @Column({
    type: 'enum',
    enum: RuleSeverity,
    default: RuleSeverity.WARNING,
  })
  @IsEnum(RuleSeverity)
  severity!: RuleSeverity;

  @Column({ type: 'jsonb', nullable: true })
  pattern?: Record<string, any>;

  @Column({ type: 'boolean', default: true })
  isEnabled!: boolean;

  @Column({ type: 'boolean', default: false })
  isCustom!: boolean;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy?: User;

  @Column({ type: 'jsonb', nullable: true })
  configuration?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  constructor(partial: Partial<Rule> = {}) {
    Object.assign(this, partial);
  }
}
