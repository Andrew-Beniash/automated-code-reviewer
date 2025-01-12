import axios from 'axios';
import { DataSource, DeepPartial } from 'typeorm';
import { User } from '../entities/User.mjs';
import jwt from 'jsonwebtoken';
import { loggerWrapper as logger } from '../config/logger';
import bcrypt from 'bcrypt';

// Interface definitions
interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

interface GitHubUserData {
  id: number;
  email: string;
  name: string;
  avatar_url: string;
}

interface AuthResponse {
  user: Omit<User, 'passwordHash'>;
  token: string;
}

export class GitHubAuthService {
  private static readonly GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
  private static readonly GITHUB_USER_URL = 'https://api.github.com/user';
  private static dataSource: DataSource;

  static initialize(dataSource: DataSource) {
    this.dataSource = dataSource;
  }

  private static async getAccessToken(code: string): Promise<string> {
    try {
      const response = await axios.post<GitHubTokenResponse>(
        this.GITHUB_TOKEN_URL,
        {
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
        },
        {
          headers: {
            Accept: 'application/json',
          },
        }
      );

      if (!response.data.access_token) {
        throw new Error('Failed to get access token from GitHub');
      }

      return response.data.access_token;
    } catch (error) {
      logger.error('Failed to get GitHub access token', { error });
      throw new Error('Failed to authenticate with GitHub');
    }
  }

  private static async getGitHubUserData(accessToken: string): Promise<GitHubUserData> {
    try {
      const response = await axios.get<GitHubUserData>(this.GITHUB_USER_URL, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.data.id) {
        throw new Error('Failed to get user data from GitHub');
      }

      return response.data;
    } catch (error) {
      logger.error('Failed to get GitHub user data', { error });
      throw new Error('Failed to fetch user data from GitHub');
    }
  }

  private static async upsertUser(githubData: GitHubUserData): Promise<User> {
    const userRepository = this.dataSource.getRepository(User);

    try {
      // Try to find existing user by GitHub ID
      let user = await userRepository.findOne({
        where: { githubId: githubData.id.toString() },
      });

      if (!user && githubData.email) {
        // If no user found by GitHub ID, try to find by email
        user = await userRepository.findOne({
          where: { email: githubData.email.toLowerCase() },
        });
      }

      if (user) {
        // Update existing user
        user.githubId = githubData.id.toString();
        user.avatarUrl = githubData.avatar_url;
        if (githubData.name) user.name = githubData.name;

        return await userRepository.save(user);
      }

      // Generate a temporary password and hash it
      const tempPassword = await this.generateTempPassword();
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      // Create new user
      const userData: DeepPartial<User> = {
        email: githubData.email.toLowerCase(),
        name: githubData.name || 'GitHub User',
        githubId: githubData.id.toString(),
        avatarUrl: githubData.avatar_url,
        passwordHash: hashedPassword,
        isActive: true,
      };

      const newUser = userRepository.create(userData);
      return await userRepository.save(newUser);
    } catch (error) {
      logger.error('Failed to upsert user', { error });
      throw new Error('Failed to create or update user');
    }
  }

  private static async generateTempPassword(): Promise<string> {
    const length = 16;
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array)
      .map((x) => chars.charAt(x % chars.length))
      .join('');
  }

  private static generateToken(user: User): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    return jwt.sign({ userId: user.id, role: user.role }, secret, { expiresIn: '24h' });
  }

  static async handleOAuthCallback(code: string): Promise<AuthResponse> {
    try {
      const accessToken = await this.getAccessToken(code);
      const githubUserData = await this.getGitHubUserData(accessToken);
      const user = await this.upsertUser(githubUserData);
      const token = this.generateToken(user);

      // Omit passwordHash from the response
      const { passwordHash, ...userWithoutPassword } = user;

      return {
        user: userWithoutPassword,
        token,
      };
    } catch (error) {
      logger.error('GitHub OAuth error:', { error });
      throw new Error('Failed to authenticate with GitHub');
    }
  }
}
