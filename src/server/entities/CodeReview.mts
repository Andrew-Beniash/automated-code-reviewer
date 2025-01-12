import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { IsNotEmpty, IsEnum } from 'class-validator';
import { Repository } from './Repository.mjs';
import { ReviewFinding } from './ReviewFinding.mjs';
import { User } from './User.mjs';

export enum ReviewStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('code_reviews')
export class CodeReview {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 255 })
  @IsNotEmpty()
  commitId!: string;

  @Column({ length: 255 })
  @IsNotEmpty()
  branch!: string;

  @Column({
    type: 'enum',
    enum: ReviewStatus,
    default: ReviewStatus.PENDING,
  })
  @IsEnum(ReviewStatus)
  status!: ReviewStatus;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @ManyToOne(() => Repository, (repository) => repository.reviews)
  @JoinColumn({ name: 'repository_id' })
  repository!: Repository;

  @ManyToOne(() => User, (user) => user.triggeredReviews)
  @JoinColumn({ name: 'triggered_by' })
  triggeredBy!: User;

  @OneToMany(() => ReviewFinding, (finding) => finding.review)
  findings!: ReviewFinding[];

  @Column({ name: 'started_at', nullable: true })
  startedAt?: Date;

  @Column({ name: 'completed_at', nullable: true })
  completedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  constructor(partial: Partial<CodeReview> = {}) {
    Object.assign(this, partial);
  }
}
