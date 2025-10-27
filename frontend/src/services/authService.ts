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
      let errorMessage = 'Login failed';
      
      // Обработка ошибок валидации (400) - стандартная AppError структура
      if (error?.response?.status === 400 && error?.response?.data?.error) {
        const errorData = error.response.data.error;
        
        if (errorData.details?.validationErrors && errorData.details.validationErrors.length > 0) {
          // Ошибки валидации - берем первую ошибку
          const firstError = errorData.details.validationErrors[0];
          errorMessage = firstError.message || errorData.messageRu || errorData.message || 'Ошибка валидации';
        } else if (errorData.messageRu) {
          errorMessage = errorData.messageRu;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      }
      // Обработка ошибок авторизации (401) - стандартная AppError структура
      else if (error?.response?.status === 401 && error?.response?.data?.error) {
        const errorData = error.response.data.error;
        errorMessage = errorData.messageRu || errorData.message || 'Неверные учетные данные';
      }
      // Обработка других ошибок
      else if (error?.response?.data?.error?.messageRu) {
        errorMessage = error.response.data.error.messageRu;
      } else if (error?.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error?.response?.data === 'string') {
        errorMessage = error.response.data;
      }
      
      console.error('❌ Login failed:', errorMessage);
      console.error('❌ Full error object:', error);
      
      // Бросаем Error с сообщением, которое будет обработано в thunk
      throw new Error(errorMessage);
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
