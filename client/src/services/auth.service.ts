export interface RegisterInput {
    email: string;
    password: string;
    fullName: string;
}

export interface LoginInput {
    email: string;
    password: string;
}

import { api } from '../utils/api';
import { AuthSession } from '../types';

export const authService = {
    async register(data: RegisterInput) {
        return api.post('/api/auth/register', data);
    },

    async login(data: LoginInput) {
        return api.post('/api/auth/login', data);
    },

    async getSession(): Promise<AuthSession> {
        return api.get<AuthSession>('/api/auth/session');
    },

    async logout() {
        return api.post('/api/auth/logout');
    }
};
