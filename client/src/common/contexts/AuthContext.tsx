import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '@/common/services/auth.service';
import { AuthSession } from '@/types';

interface User {
  id: string;
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
}

type SessionError = Error & {
  status?: number;
  code?: string;
};

const EXPECTED_SESSION_ERROR_CODES = new Set(['TOKEN_EXPIRED', 'INVALID_TOKEN']);

export type UserRole = 'guest' | 'customer' | 'admin';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  permissions: string[];
  isInitialized: boolean;
  login: (email: string, password: string) => Promise<User | null>;
  register: (data: Parameters<typeof authService.register>[0]) => Promise<User | null>;
  logout: () => Promise<void>;
  isLoading: boolean;
  initializeAuth: () => Promise<void>;
  refreshSession: () => Promise<void>;
  setUserFromSession: (session: AuthSession) => void;
}


const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>('guest');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);


  /**
   * Initialize authentication on app load by checking session
   */
  /**
   * Check session status from server
   */
  const checkSession = async () => {
    setIsLoading(true);
    try {
      const session = await authService.getSession();

      if (session.isAuthenticated && session.user) {
        const mappedUser: User = {
          id: session.user.userId.toString(),
          name: session.user.fullName,
          email: session.user.email,
          roles: session.user.roles,
          permissions: session.user.permissions || [],
        };

        setUser(mappedUser);
        setPermissions(session.user.permissions || []);
        setRole(session.user.roles.includes('Admin') || session.user.roles.includes('Super Admin') ? 'admin' : 'customer');
      } else {
        setUser(null);
        setRole('guest');
        setPermissions([]);
      }
    } catch (error: unknown) {
      // Expected for guests/expired sessions: backend returns 401 and optional auth code.
      const errObj = error as SessionError;
      const isExpectedError =
        errObj?.status === 401 ||
        (typeof errObj?.code === 'string' && EXPECTED_SESSION_ERROR_CODES.has(errObj.code));

      if (!isExpectedError) {
        console.error('Failed to check session:', error);
      }

      setUser(null);
      setRole('guest');
      setPermissions([]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Initialize authentication on app load
   */
  const initializeAuth = async () => {
    if (initialized) return;
    await checkSession();
    setInitialized(true);
  };

  /**
   * Initialize auth on component mount
   */
  useEffect(() => {
    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<User | null> => {
    setIsLoading(true);
    try {
      const response = await authService.login({ email, password });
      const { user: userData } = response as { user: { userId: string; fullName: string; email: string; roles: string[]; permissions?: string[] } };

      const mappedUser: User = {
        id: userData.userId,
        name: userData.fullName,
        email: userData.email,
        roles: userData.roles,
        permissions: userData.permissions || [],
      };

      setUser(mappedUser);
      setPermissions(userData.permissions || []);
      setRole(userData.roles.includes('Admin') || userData.roles.includes('Super Admin') ? 'admin' : 'customer');

      // Note: With cookie-based auth, we don't need to manually store tokens
      // The server sets HTTP-only cookies automatically

      return mappedUser;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: Parameters<typeof authService.register>[0]): Promise<User | null> => {
    setIsLoading(true);
    try {
      // Backend now returns login data (user + tokens) on register
      const response = await authService.register(data);
      // The response structure might be slightly different depending on how strictly authService is typed,
      // but commonly it returns AxiosResponse which has .data
      const responseData = (response as { data?: { user: { userId: string; fullName: string; email: string; roles?: string[]; permissions?: string[] } } }).data || response as { user: { userId: string; fullName: string; email: string; roles?: string[]; permissions?: string[] } };

      const { user: userData } = responseData;

      if (!userData) {
        throw new Error("Registration succeeded but no user data returned");
      }

      const mappedUser: User = {
        id: userData.userId,
        name: userData.fullName,
        email: userData.email,
        roles: userData.roles || ['Customer'], // Default if not detailed
        permissions: userData.permissions || [],
      };


      setUser(mappedUser);
      setRole('customer'); // Default for new registration

      return mappedUser;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      // Call logout endpoint to clear server-side cookies
      await authService.logout();

      setUser(null);
      setRole('guest');
      setPermissions([]);
    } catch (error) {
      console.error('Logout error:', error);
      // Even if server call fails, clear local state
      setUser(null);
      setRole('guest');
      setPermissions([]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Update auth state from an existing session
   * Used by OAuth callback to avoid duplicate API calls
   */
  const setUserFromSession = (session: AuthSession) => {
    if (session.isAuthenticated && session.user) {
      const mappedUser: User = {
        id: session.user.userId.toString(),
        name: session.user.fullName,
        email: session.user.email,
        roles: session.user.roles,
        permissions: session.user.permissions || [],
      };

      setUser(mappedUser);
      setPermissions(session.user.permissions || []);
      setRole(session.user.roles.includes('Admin') || session.user.roles.includes('Super Admin') ? 'admin' : 'customer');
    } else {
      setUser(null);
      setRole('guest');
      setPermissions([]);
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, permissions, isInitialized: initialized, login, register, logout, isLoading, initializeAuth, refreshSession: checkSession, setUserFromSession }}>
      {children}
    </AuthContext.Provider>
  );

};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
