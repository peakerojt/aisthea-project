import { api } from '@/common/utils/api';
import { RegisterInput, LoginInput } from '@/common/services/auth.service';
import { AuthSession } from '@/types';

export const authApi = {
    register: (data: RegisterInput) => api.post('/api/auth/register', data),
    login: (data: LoginInput) => api.post('/api/auth/login', data),
    getSession: () => api.get<AuthSession>('/api/auth/session'),
    logout: () => api.post('/api/auth/logout'),
    verifyEmail: (email: string, code: string) => api.post('/api/auth/verify-email', { email, code }),
    resendVerification: (email: string) => api.post('/api/auth/resend-verification', { email }),
};
