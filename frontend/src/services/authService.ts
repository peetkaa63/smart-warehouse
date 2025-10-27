import api, { authAPI } from './api';

export interface LoginData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

class AuthService {
  async login(loginData: LoginData): Promise<AuthResponse> {
    try {
      console.log('🔐 Attempting login for:', loginData.email);
      const response = await authAPI.login(loginData.email, loginData.password);

      if (response?.data?.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        console.log('✅ Login successful, token saved:', response.data.token);
      }

      return response.data;
    } catch (error: any) {
      // Пытаемся вернуть более читаемое сообщение
      const msg = error?.response?.data?.error ?? error?.message ?? 'Login failed';
      console.error('❌ Login failed:', msg, error?.response?.data ?? error);
      // Бросаем Error с сообщением, которое будет обработано в thunk
      throw new Error(msg);
    }
  }

  logout(): void {
    console.log('🚪 Logging out...');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    const isAuth = !!token;
    console.log('🔐 Auth check:', isAuth ? 'Authenticated' : 'Not authenticated');
    return isAuth;
  }

  getAuthHeader(): { Authorization: string } {
    const token = this.getToken();
    return { Authorization: `Bearer ${token}` };
  }
}

export const authService = new AuthService();
