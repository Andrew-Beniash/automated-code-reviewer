// File path: src/server/services/githubAuth.ts

import axios from 'axios';
import { AppDataSource } from '../config/typeorm.config';
import { User } from '../entities/User';
import jwt from 'jsonwebtoken';

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

export class GitHubAuthService {
    private static readonly GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
    private static readonly GITHUB_USER_URL = 'https://api.github.com/user';
    private static readonly userRepository = AppDataSource.getRepository(User);

    /**
     * Exchange the authorization code for an access token
     */
    private static async getAccessToken(code: string): Promise<string> {
        const response = await axios.post<GitHubTokenResponse>(
            this.GITHUB_TOKEN_URL,
            {
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code
            },
            {
                headers: {
                    Accept: 'application/json'
                }
            }
        );

        if (!response.data.access_token) {
            throw new Error('Failed to get access token from GitHub');
        }

        return response.data.access_token;
    }

    /**
     * Fetch user data from GitHub using the access token
     */
    private static async getGitHubUserData(accessToken: string): Promise<GitHubUserData> {
        const response = await axios.get<GitHubUserData>(
            this.GITHUB_USER_URL,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            }
        );

        if (!response.data.id) {
            throw new Error('Failed to get user data from GitHub');
        }

        return response.data;
    }

    /**
     * Create or update user with GitHub data
     */
    private static async upsertUser(githubData: GitHubUserData): Promise<User> {
        // Try to find existing user by GitHub ID
        let user = await this.userRepository.findOne({
            where: { githubId: githubData.id }
        });

        if (!user && githubData.email) {
            // If no user found by GitHub ID, try to find by email
            user = await this.userRepository.findOne({
                where: { email: githubData.email.toLowerCase() }
            });
        }

        if (user) {
            // Update existing user
            user.githubId = githubData.id;
            user.avatarUrl = githubData.avatar_url;
            if (githubData.name) user.name = githubData.name;
            
            return await this.userRepository.save(user);
        }

        // Create new user
        const newUser = this.userRepository.create({
            email: githubData.email,
            name: githubData.name || 'GitHub User',
            githubId: githubData.id,
            avatarUrl: githubData.avatar_url,
            // Generate a random password for GitHub users
            password: Math.random().toString(36).slice(-8),
            isActive: true
        });

        return await this.userRepository.save(newUser);
    }

    /**
     * Generate JWT token for the user
     */
    private static generateToken(user: User): string {
        return jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET || 'your-fallback-secret',
            { expiresIn: '24h' }
        );
    }

    /**
     * Complete GitHub OAuth flow
     */
    static async handleOAuthCallback(code: string) {
        try {
            // 1. Exchange code for access token
            const accessToken = await this.getAccessToken(code);

            // 2. Fetch user data from GitHub
            const githubUserData = await this.getGitHubUserData(accessToken);

            // 3. Create or update user with GitHub data
            const user = await this.upsertUser(githubUserData);

            // 4. Generate JWT token
            const token = this.generateToken(user);

            return {
                user: user.toJSON(),
                token
            };
        } catch (error) {
            console.error('GitHub OAuth error:', error);
            throw new Error('Failed to authenticate with GitHub');
        }
    }
}