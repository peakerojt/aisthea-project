
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { RegisterInput, LoginInput } from '../utils/schemas/auth.schema';

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;

if (!JWT_SECRET || !REFRESH_SECRET) {
    throw new Error('Missing JWT_SECRET or REFRESH_SECRET environment variables');
}

export const registerUser = async (input: RegisterInput) => {
    const { email, password, fullName } = input;

    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        throw new Error('Email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Transaction to create user and assign default role
    const result = await prisma.$transaction(async (tx) => {
        // 1. Create User
        const user = await tx.user.create({
            data: {
                email,
                passwordHash,
                fullName,
                status: 'Active',
            },
        });

        // 2. Find or Create Default Role (Customer)
        let role = await tx.role.findUnique({
            where: { roleName: 'Customer' },
        });

        if (!role) {
            role = await tx.role.create({
                data: { roleName: 'Customer' },
            });
        }

        // 3. Assign Role
        await tx.userRole.create({
            data: {
                userId: user.userId,
                roleId: role.roleId,
            },
        });

        return user;
    });

    return {
        userId: result.userId,
        email: result.email,
        fullName: result.fullName,
    };
};

export const loginUser = async (input: LoginInput) => {
    const { email, password } = input;

    const user = await prisma.user.findUnique({
        where: { email },
        include: {
            userRoles: {
                include: {
                    role: true
                }
            }
        }
    });

    if (!user || !user.passwordHash) {
        throw new Error('Invalid email or password');
    }

    if (user.status !== 'Active') {
        throw new Error('User account is not active');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
        throw new Error('Invalid email or password');
    }

    const roles = user.userRoles.map(ur => ur.role.roleName);

    const accessToken = jwt.sign(
        { userId: user.userId, email: user.email, roles },
        JWT_SECRET,
        { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
        { userId: user.userId },
        REFRESH_SECRET,
        { expiresIn: '7d' }
    );

    return {
        user: {
            userId: user.userId,
            email: user.email,
            fullName: user.fullName,
            roles,
        },
        accessToken,
        refreshToken,
    };
};
