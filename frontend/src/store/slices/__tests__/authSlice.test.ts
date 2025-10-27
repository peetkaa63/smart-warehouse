import { configureStore } from '@reduxjs/toolkit';
import authReducer, { login, logout, clearError } from '../slices/authSlice';
import { authService } from '../../services/authService';

// Мокаем authService
jest.mock('../../services/authService', () => ({
  authService: {
    login: jest.fn(),
    getCurrentUser: jest.fn(),
    getToken: jest.fn(),
    logout: jest.fn()
  }
}));

describe('Auth Slice', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    store = configureStore({
      reducer: {
        auth: authReducer
      }
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = store.getState().auth;
      
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should initialize with stored user data', () => {
      const mockUser = { id: 1, email: 'test@example.com' };
      const mockToken = 'jwt-token';
      
      authService.getCurrentUser.mockReturnValue(mockUser);
      authService.getToken.mockReturnValue(mockToken);
      
      const newStore = configureStore({
        reducer: {
          auth: authReducer
        }
      });
      
      const state = newStore.getState().auth;
      expect(state.user).toEqual(mockUser);
      expect(state.token).toEqual(mockToken);
    });
  });

  describe('Login Async Thunk', () => {
    it('should handle login pending state', () => {
      const loginData = { email: 'test@example.com', password: 'password123' };
      
      store.dispatch(login(loginData));
      
      const state = store.getState().auth;
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should handle successful login', async () => {
      const mockUser = { id: 1, email: 'test@example.com' };
      const mockToken = 'jwt-token';
      const loginData = { email: 'test@example.com', password: 'password123' };
      
      authService.login.mockResolvedValue({ user: mockUser, token: mockToken });
      
      await store.dispatch(login(loginData));
      
      const state = store.getState().auth;
      expect(state.loading).toBe(false);
      expect(state.user).toEqual(mockUser);
      expect(state.token).toEqual(mockToken);
      expect(state.error).toBeNull();
    });

    it('should handle login failure', async () => {
      const loginData = { email: 'test@example.com', password: 'wrongpassword' };
      const errorMessage = 'Invalid credentials';
      
      authService.login.mockRejectedValue(new Error(errorMessage));
      
      await store.dispatch(login(loginData));
      
      const state = store.getState().auth;
      expect(state.loading).toBe(false);
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.error).toBe(errorMessage);
    });

    it('should handle login failure with custom error message', async () => {
      const loginData = { email: 'test@example.com', password: 'wrongpassword' };
      const customError = { message: 'Custom error message' };
      
      authService.login.mockRejectedValue(customError);
      
      await store.dispatch(login(loginData));
      
      const state = store.getState().auth;
      expect(state.error).toBe('Custom error message');
    });

    it('should handle login failure without error message', async () => {
      const loginData = { email: 'test@example.com', password: 'wrongpassword' };
      
      authService.login.mockRejectedValue({});
      
      await store.dispatch(login(loginData));
      
      const state = store.getState().auth;
      expect(state.error).toBe('Login failed');
    });

    it('should call authService.login with correct parameters', async () => {
      const loginData = { 
        email: 'test@example.com', 
        password: 'password123',
        rememberMe: true 
      };
      
      authService.login.mockResolvedValue({ user: {}, token: 'token' });
      
      await store.dispatch(login(loginData));
      
      expect(authService.login).toHaveBeenCalledWith(loginData);
    });
  });

  describe('Logout Action', () => {
    it('should clear user data on logout', () => {
      // Сначала устанавливаем состояние с пользователем
      store.dispatch({
        type: 'auth/login/fulfilled',
        payload: { user: { id: 1, email: 'test@example.com' }, token: 'token' }
      });
      
      // Проверяем, что пользователь установлен
      let state = store.getState().auth;
      expect(state.user).not.toBeNull();
      
      // Выполняем logout
      store.dispatch(logout());
      
      // Проверяем, что данные очищены
      state = store.getState().auth;
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.error).toBeNull();
      expect(state.loading).toBe(false);
    });

    it('should call authService.logout', () => {
      store.dispatch(logout());
      
      expect(authService.logout).toHaveBeenCalled();
    });
  });

  describe('Clear Error Action', () => {
    it('should clear error state', () => {
      // Устанавливаем ошибку
      store.dispatch({
        type: 'auth/login/rejected',
        payload: 'Test error'
      });
      
      let state = store.getState().auth;
      expect(state.error).toBe('Test error');
      
      // Очищаем ошибку
      store.dispatch(clearError());
      
      state = store.getState().auth;
      expect(state.error).toBeNull();
    });

    it('should not affect other state when clearing error', () => {
      // Устанавливаем полное состояние
      store.dispatch({
        type: 'auth/login/fulfilled',
        payload: { user: { id: 1, email: 'test@example.com' }, token: 'token' }
      });
      
      store.dispatch({
        type: 'auth/login/rejected',
        payload: 'Test error'
      });
      
      // Очищаем ошибку
      store.dispatch(clearError());
      
      const state = store.getState().auth;
      expect(state.error).toBeNull();
      expect(state.user).toEqual({ id: 1, email: 'test@example.com' });
      expect(state.token).toBe('token');
      expect(state.loading).toBe(false);
    });
  });

  describe('State Transitions', () => {
    it('should handle complete login flow', async () => {
      const loginData = { email: 'test@example.com', password: 'password123' };
      const mockUser = { id: 1, email: 'test@example.com' };
      const mockToken = 'jwt-token';
      
      // Начальное состояние
      let state = store.getState().auth;
      expect(state.loading).toBe(false);
      expect(state.user).toBeNull();
      
      // Начинаем login
      authService.login.mockResolvedValue({ user: mockUser, token: mockToken });
      const loginPromise = store.dispatch(login(loginData));
      
      // Состояние во время загрузки
      state = store.getState().auth;
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
      
      // Завершаем login
      await loginPromise;
      
      // Финальное состояние
      state = store.getState().auth;
      expect(state.loading).toBe(false);
      expect(state.user).toEqual(mockUser);
      expect(state.token).toEqual(mockToken);
      expect(state.error).toBeNull();
    });

    it('should handle login error flow', async () => {
      const loginData = { email: 'test@example.com', password: 'wrongpassword' };
      const errorMessage = 'Invalid credentials';
      
      // Начальное состояние
      let state = store.getState().auth;
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      
      // Начинаем login с ошибкой
      authService.login.mockRejectedValue(new Error(errorMessage));
      const loginPromise = store.dispatch(login(loginData));
      
      // Состояние во время загрузки
      state = store.getState().auth;
      expect(state.loading).toBe(true);
      
      // Завершаем login с ошибкой
      await loginPromise;
      
      // Финальное состояние с ошибкой
      state = store.getState().auth;
      expect(state.loading).toBe(false);
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.error).toBe(errorMessage);
    });

    it('should handle multiple login attempts', async () => {
      const loginData = { email: 'test@example.com', password: 'password123' };
      const mockUser = { id: 1, email: 'test@example.com' };
      const mockToken = 'jwt-token';
      
      // Первая попытка - успешная
      authService.login.mockResolvedValueOnce({ user: mockUser, token: mockToken });
      await store.dispatch(login(loginData));
      
      let state = store.getState().auth;
      expect(state.user).toEqual(mockUser);
      
      // Вторая попытка - с ошибкой
      authService.login.mockRejectedValueOnce(new Error('Network error'));
      await store.dispatch(login(loginData));
      
      state = store.getState().auth;
      expect(state.error).toBe('Network error');
      // Пользователь должен остаться от предыдущей успешной попытки
      expect(state.user).toEqual(mockUser);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined error payload', async () => {
      const loginData = { email: 'test@example.com', password: 'password123' };
      
      authService.login.mockRejectedValue(undefined);
      
      await store.dispatch(login(loginData));
      
      const state = store.getState().auth;
      expect(state.error).toBe('Login failed');
    });

    it('should handle null error payload', async () => {
      const loginData = { email: 'test@example.com', password: 'password123' };
      
      authService.login.mockRejectedValue(null);
      
      await store.dispatch(login(loginData));
      
      const state = store.getState().auth;
      expect(state.error).toBe('Login failed');
    });

    it('should handle empty string error', async () => {
      const loginData = { email: 'test@example.com', password: 'password123' };
      
      authService.login.mockRejectedValue({ message: '' });
      
      await store.dispatch(login(loginData));
      
      const state = store.getState().auth;
      expect(state.error).toBe('Login failed');
    });
  });
});
