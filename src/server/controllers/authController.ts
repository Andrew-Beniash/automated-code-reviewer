import { Request, Response } from 'express';
import { AppDataSource } from '../config/typeorm.config';
import { User, UserRole } from '../entities/User';
import { validate } from 'class-validator';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { asyncHandler } from '../middleware/asyncHandler';
import { GitHubAuthService } from '../services/githubAuth';

export class AuthController {
    private static userRepository = AppDataSource.getRepository(User);

    static register = asyncHandler(async (req: Request, res: Response) => {
        const { name, email, password } = req.body;

        // Create user instance for validation
        const user = new User();
        Object.assign(user, {
            name,
            email,
            password,
            role: UserRole.USER
        });

        // Validate user data
        const errors = await validate(user);
        if (errors.length > 0) {
            return res.status(400).json({
                message: 'Validation failed',
                errors: errors.map(error => ({
                    property: error.property,
                    constraints: error.constraints
                }))
            });
        }

        // Check if user already exists
        const existingUser = await this.userRepository.findOne({ where: { email: email.toLowerCase() } });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = hashedPassword;

        // Save user
        await this.userRepository.save(user);

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET || 'your-fallback-secret',
            { expiresIn: '24h' }
        );

        return res.status(201).json({
            message: 'User registered successfully',
            user: user.toJSON(), // Uses the safe toJSON method
            token
        });
    });

    static login = asyncHandler(async (req: Request, res: Response) => {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // Find user
        const user = await this.userRepository.findOne({ 
            where: { 
                email: email.toLowerCase(),
                isActive: true
            } 
        });

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Update last login
        user.lastLoginAt = new Date();
        await this.userRepository.save(user);

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET || 'your-fallback-secret',
            { expiresIn: '24h' }
        );

        return res.json({
            message: 'Login successful',
            user: user.toJSON(), // Uses the safe toJSON method
            token
        });
    });

    static refreshToken = asyncHandler(async (req: Request, res: Response) => {
        const { token } = req.body;
        
        try {
            const decoded = jwt.verify(
                token, 
                process.env.JWT_SECRET || 'your-fallback-secret'
            ) as { userId: string; role: UserRole };

            const user = await this.userRepository.findOne({ 
                where: { 
                    id: decoded.userId,
                    isActive: true
                } 
            });

            if (!user) {
                return res.status(401).json({ message: 'User not found or inactive' });
            }
            
            const newToken = jwt.sign(
                { userId: user.id, role: user.role },
                process.env.JWT_SECRET || 'your-fallback-secret',
                { expiresIn: '24h' }
            );

            return res.json({
                token: newToken,
                user: user.toJSON() // Uses the safe toJSON method
            });
        } catch (error) {
            return res.status(401).json({ message: 'Invalid token' });
        }
    });

    static getProfile = asyncHandler(async (req: Request, res: Response) => {
        // @ts-ignore - req.user is set by auth middleware
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const user = await this.userRepository.findOne({ 
            where: { 
                id: userId,
                isActive: true
            } 
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found or inactive' });
        }

        return res.json(user.toJSON()); // Uses the safe toJSON method
    });

    static githubCallback = asyncHandler(async (req: Request, res: Response) => {
        const { code } = req.query;
    
        if (!code || typeof code !== 'string') {
            return res.status(400).json({ message: 'GitHub authorization code is required' });
        }
    
        try {
            const authResult = await GitHubAuthService.handleOAuthCallback(code);
            
            return res.json({
                message: 'GitHub authentication successful',
                ...authResult
            });
        } catch (error) {
            return res.status(401).json({ 
                message: 'GitHub authentication failed',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
}