import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { IsNotEmpty, IsEnum, Min } from 'class-validator';
import { CodeReview } from './CodeReview.mjs';
import { Rule } from './Rule.mjs';

export enum FindingSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

@Entity('review_findings')
export class ReviewFinding {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => CodeReview, (review) => review.findings)
  @JoinColumn({ name: 'review_id' })
  review!: CodeReview;

  @ManyToOne(() => Rule)
  @JoinColumn({ name: 'rule_id' })
  rule!: Rule;

  @Column({ length: 255 })
  @IsNotEmpty()
  filePath!: string;

  @Column({ name: 'line_number' })
  @Min(1)
  lineNumber!: number;

  @Column({ name: 'column_start', nullable: true })
  columnStart?: number;

  @Column({ name: 'column_end', nullable: true })
  columnEnd?: number;

  @Column({
    type: 'enum',
    enum: FindingSeverity,
    default: FindingSeverity.INFO,
  })
  @IsEnum(FindingSeverity)
  severity!: FindingSeverity;

  @Column('text')
  @IsNotEmpty()
  message!: string;

  @Column('text', { nullable: true })
  snippet?: string;

  @Column('text', { nullable: true })
  suggestedFix?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  constructor(partial: Partial<ReviewFinding> = {}) {
    Object.assign(this, partial);
  }
}
