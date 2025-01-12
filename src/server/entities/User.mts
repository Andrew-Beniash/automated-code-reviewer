import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { IsEmail, IsNotEmpty, IsEnum } from 'class-validator';
import type { Repository } from './Repository.mjs';
import type { CodeReview } from './CodeReview.mjs';

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 100 })
  @IsNotEmpty()
  name!: string;

  @Column({ unique: true })
  @IsEmail()
  email!: string;

  @Column()
  @IsNotEmpty()
  passwordHash!: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  @IsEnum(UserRole)
  role!: UserRole;

  @Column({ nullable: true })
  githubId?: string;

  @Column({ nullable: true })
  avatarUrl?: string;

  @OneToMany('Repository', 'owner')
  repositories!: Repository[];

  @Column({ default: true })
  isActive!: boolean;

  @OneToMany('CodeReview', 'triggeredBy')
  triggeredReviews!: CodeReview[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  constructor(partial: Partial<User> = {}) {
    Object.assign(this, partial);
  }
}
