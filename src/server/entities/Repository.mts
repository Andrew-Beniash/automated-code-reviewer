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
import { IsNotEmpty, IsUrl, IsEnum } from 'class-validator';
import type { User } from './User.mjs';
import type { CodeReview } from './CodeReview.mjs';

export enum VCSProvider {
  GITHUB = 'github',
  GITLAB = 'gitlab',
  BITBUCKET = 'bitbucket',
}

@Entity('repositories')
export class Repository {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 255 })
  @IsNotEmpty()
  name!: string;

  @Column({ length: 255 })
  @IsUrl()
  url!: string;

  @Column({
    type: 'enum',
    enum: VCSProvider,
    default: VCSProvider.GITHUB,
  })
  @IsEnum(VCSProvider)
  vcsProvider!: VCSProvider;

  @Column({ length: 255, nullable: true })
  description?: string;

  @Column({ name: 'default_branch', length: 100, default: 'main' })
  defaultBranch!: string;

  @Column({ name: 'is_private', default: false })
  isPrivate!: boolean;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @ManyToOne('User', 'repositories')
  @JoinColumn({ name: 'owner_id' })
  owner!: User;

  @OneToMany('CodeReview', 'repository')
  reviews!: CodeReview[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  constructor(partial: Partial<Repository> = {}) {
    Object.assign(this, partial);
  }
}
