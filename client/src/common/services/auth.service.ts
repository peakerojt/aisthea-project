export interface RegisterInput {
    email: string;
    password: string;
    fullName: string;
}

export interface LoginInput {
    email: string;
    password: string;
}

import { authApi } from '@/common/api/auth.api';
import { AuthSession } from '@/types';

export const authService = {
    async register(data: RegisterInput) {
        return authApi.register(data);
    },

    async login(data: LoginInput) {
        return authApi.login(data);
    },

    async getSession(): Promise<AuthSession> {
        return authApi.getSession();
    },

    async logout() {
        return authApi.logout();
    },

    async verifyEmail(email: string, code: string) {
        return authApi.verifyEmail(email, code);
    },

    async resendVerification(email: string) {
        return authApi.resendVerification(email);
    }
};
