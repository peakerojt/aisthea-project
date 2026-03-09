import { prisma } from '../../lib/prisma';

export const authRepository = {
    async findByEmail(email: string) {
        return prisma.user.findUnique({
            where: { email },
            include: {
                userRoles: {
                    include: {
                        role: {
                            include: {
                                rolePermissions: { include: { permission: { select: { code: true } } } },
                            },
                        },
                    },
                },
            },
        });
    },

    async findById(userId: number) {
        return prisma.user.findUnique({
            where: { userId },
            include: {
                userRoles: {
                    include: {
                        role: {
                            include: {
                                rolePermissions: { include: { permission: { select: { code: true } } } },
                            },
                        },
                    },
                },
            },
        });
    },

    async createUser(data: {
        email: string;
        fullName: string;
        passwordHash?: string;
        googleId?: string;
        avatarUrl?: string;
        status?: string;
    }) {
        return prisma.user.create({ data: data as any });
    },

    async updateUser(userId: number, data: Record<string, unknown>) {
        return prisma.user.update({ where: { userId }, data: data as any });
    },

    // Verification tokens
    async createVerificationToken(data: { token: string; userId: number; expiresAt: Date }) {
        return prisma.emailVerificationToken.create({ data });
    },

    async findVerificationToken(token: string) {
        return prisma.emailVerificationToken.findUnique({ where: { token } });
    },

    async deleteVerificationToken(token: string) {
        return prisma.emailVerificationToken.delete({ where: { token } });
    },

    // Password reset tokens
    async createPasswordResetToken(data: { token: string; userId: number; expiresAt: Date }) {
        return (prisma as any).passwordResetToken.create({ data });
    },

    async findPasswordResetToken(token: string) {
        return (prisma as any).passwordResetToken.findUnique({ where: { token } });
    },

    async deletePasswordResetToken(token: string) {
        return (prisma as any).passwordResetToken.delete({ where: { token } });
    },
};
