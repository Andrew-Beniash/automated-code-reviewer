import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { AppDataSource } from '../config/data-source';
import { User } from '../entities/User.mjs';
import { asyncHandler } from '../middleware/asyncHandler';
import { ValidationError, AuthenticationError } from '../utils/errors';
import { loggerWrapper as logger } from '../config/logger';
import { GitHubAuthService } from '../services/githubAuth';
import { UserRole } from '../entities/User.mjs';

const userRepository = AppDataSource.getRepository(User);

class AuthController {
  /**
   * Register a new user
   * @route POST /api/auth/register
   */
  static register = asyncHandler(async (req: Request, res: Response) => {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      throw new ValidationError('Name, email, and password are required', {
        name: !name ? ['Name is required'] : [],
        email: !email ? ['Email is required'] : [],
        password: !password ? ['Password is required'] : [],
      });
    }

    // Check if user already exists
    const existingUser = await userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new ValidationError('User with this email already exists', {
        email: ['Email already in use'],
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = new User();
    newUser.name = name;
    newUser.email = email;
    newUser.passwordHash = hashedPassword;
    newUser.role = UserRole.USER;
    newUser.isActive = true;

    const user = await userRepository.save(newUser);

    // Generate JWT token
    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET!, {
      expiresIn: '24h',
    });

    logger.info(`New user registered: ${user.email}`);

    res.status(201).json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      },
    });
  });

  /**
   * Login user
   * @route POST /api/auth/login
   */
  static login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      throw new ValidationError('Email and password are required', {
        email: !email ? ['Email is required'] : [],
        password: !password ? ['Password is required'] : [],
      });
    }

    // Find user
    const user = await userRepository.findOne({ where: { email } });
    if (!user) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET!, {
      expiresIn: '24h',
    });

    logger.info(`User logged in: ${user.email}`);

    res.json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      },
    });
  });

  /**
   * Get current user profile
   * @route GET /api/auth/profile
   */
  static getProfile = asyncHandler(async (req: Request, res: Response) => {
    const user = await userRepository.findOne({
      where: { id: req.user?.id },
      select: ['id', 'name', 'email', 'role', 'createdAt', 'avatarUrl'],
    });

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    res.json({
      status: 'success',
      data: { user },
    });
  });

  /**
   * GitHub OAuth callback
   * @route GET /api/auth/github/callback
   */
  static githubCallback = asyncHandler(async (req: Request, res: Response) => {
    const { code } = req.query;

    if (!code || typeof code !== 'string') {
      throw new ValidationError('GitHub authorization code is required', {
        code: ['Valid authorization code is required'],
      });
    }

    try {
      const { user, token } = await GitHubAuthService.handleOAuthCallback(code);

      // For security, redirect to the frontend with the token
      const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendURL}/auth/github/callback?token=${token}`);
    } catch (error) {
      logger.error('GitHub authentication failed:', error);
      throw new AuthenticationError('GitHub authentication failed');
    }
  });

  /**
   * Initiate GitHub OAuth flow
   * @route GET /api/auth/github
   */
  static initiateGitHubAuth = asyncHandler(async (req: Request, res: Response) => {
    const authUrl =
      `https://github.com/login/oauth/authorize?` +
      `client_id=${process.env.GITHUB_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(process.env.API_URL + '/api/auth/github/callback')}` +
      `&scope=user:email`;

    res.redirect(authUrl);
  });
}

export { AuthController };
